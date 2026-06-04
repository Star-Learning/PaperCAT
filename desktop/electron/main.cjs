const { app, BrowserWindow, dialog, ipcMain, Menu } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const preload = path.join(__dirname, "preload.cjs");
const rootDir = path.join(__dirname, "..");

function canWriteDirectory(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const probePath = path.join(dir, ".write-test");
    fs.writeFileSync(probePath, "ok", "utf8");
    fs.rmSync(probePath, { force: true });
    return true;
  } catch {
    return false;
  }
}

function chooseRuntimeDir() {
  if (!app.isPackaged) return path.join(rootDir, "runtime");

  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
  const candidates = [
    process.env.PAPERCAT_RUNTIME_DIR,
    portableDir ? path.join(portableDir, "PaperCatData") : null,
    process.execPath ? path.join(path.dirname(process.execPath), "PaperCatData") : null,
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "PaperCat") : null,
    process.env.APPDATA ? path.join(process.env.APPDATA, "PaperCat") : null,
    path.join(os.tmpdir(), "PaperCat"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (canWriteDirectory(candidate)) return candidate;
  }

  return path.join(os.tmpdir(), "PaperCat");
}

const runtimeDir = chooseRuntimeDir();
const userDataDir = path.join(runtimeDir, "electron-user-data");
const cacheDir = path.join(runtimeDir, "electron-cache");
const mainLogDir = path.join(runtimeDir, "logs");
const mainLogPath = path.join(mainLogDir, "main.log");

fs.mkdirSync(mainLogDir, { recursive: true });
fs.mkdirSync(userDataDir, { recursive: true });
fs.mkdirSync(cacheDir, { recursive: true });
app.setPath("userData", userDataDir);
app.commandLine.appendSwitch("disk-cache-dir", cacheDir);
app.disableHardwareAcceleration();
app.commandLine.appendSwitch("no-sandbox");
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-gpu-compositing");
app.commandLine.appendSwitch("disable-software-rasterizer");
app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");

function logMain(message) {
  fs.appendFileSync(mainLogPath, `[${new Date().toISOString()}] ${message}\n`, "utf8");
}

process.on("uncaughtException", (error) => {
  logMain(`uncaughtException: ${error?.stack || error}`);
});

process.on("unhandledRejection", (error) => {
  logMain(`unhandledRejection: ${error?.stack || error}`);
});

let petWindow = null;
let resultWindow = null;
let historyWindow = null;
let settingsWindow = null;
const chatWindows = new Map();
let currentSummary = null;
let backendProcess = null;
let isQuittingForSecondInstance = false;

function broadcastSummaryCreated(summary) {
  const windows = [resultWindow, historyWindow, ...chatWindows.values()];
  for (const win of windows) {
    if (win && !win.isDestroyed()) {
      win.webContents.send("summary:created", summary);
      win.webContents.send("summary:updated", summary);
    }
  }
}

function broadcastSummaryUpdated(summary) {
  const windows = [resultWindow, historyWindow, ...chatWindows.values()];
  for (const win of windows) {
    if (win && !win.isDestroyed()) {
      win.webContents.send("summary:updated", summary);
    }
  }
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  isQuittingForSecondInstance = true;
  app.quit();
}

function rendererUrl(hash = "") {
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    return `${devUrl}${hash}`;
  }
  return `file://${path.join(__dirname, "../dist/index.html")}${hash}`;
}

function packagedBackendPath() {
  if (!app.isPackaged) return null;
  return path.join(process.resourcesPath, "backend", "papercat-backend.exe");
}

async function waitForBackend(port) {
  const url = `http://127.0.0.1:${port}/api/health`;
  for (let i = 0; i < 30; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  return false;
}

async function ensureBackend() {
  const port = process.env.PAPER_CAT_BACKEND_PORT || "8766";
  logMain(`ensureBackend: checking http://127.0.0.1:${port}`);
  if (await waitForBackend(port)) return;

  const exePath = packagedBackendPath();
  if (!exePath || !fs.existsSync(exePath)) {
    logMain(`ensureBackend: backend executable missing: ${exePath || "dev-mode"}`);
    return;
  }

  const backendDataDir = path.join(runtimeDir, "backend-data");
  const logDir = path.join(runtimeDir, "logs");
  fs.mkdirSync(backendDataDir, { recursive: true });
  fs.mkdirSync(logDir, { recursive: true });

  const out = fs.openSync(path.join(logDir, "backend.out.log"), "a");
  const err = fs.openSync(path.join(logDir, "backend.err.log"), "a");
  backendProcess = spawn(exePath, [], {
    cwd: path.dirname(exePath),
    env: {
      ...process.env,
      PAPER_CAT_BACKEND_PORT: port,
      PAPERCAT_DATA_DIR: backendDataDir,
    },
    detached: false,
    stdio: ["ignore", out, err],
    windowsHide: true,
  });
  logMain(`ensureBackend: spawned backend pid=${backendProcess.pid}`);

  await waitForBackend(port);
}

function createPetWindow() {
  logMain("createPetWindow: creating pet window");
  const { screen } = require("electron");
  const cursorPoint = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursorPoint);
  const workArea = display.workArea;
  const width = 360;
  const height = 300;
  const win = new BrowserWindow({
    width,
    height,
    x: workArea.x + Math.max(20, Math.round((workArea.width - width) / 2)),
    y: workArea.y + Math.max(20, Math.round((workArea.height - height) / 2)),
    show: false,
    transparent: true,
    backgroundColor: "#00000000",
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    hasShadow: false,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setFullScreenable(false);
  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    logMain(`petWindow did-fail-load: ${errorCode} ${errorDescription} ${validatedURL}`);
  });
  win.webContents.on("render-process-gone", (_event, details) => {
    logMain(`petWindow render-process-gone: ${JSON.stringify(details)}`);
  });
  win.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    logMain(`renderer console ${level}: ${message} (${sourceId}:${line})`);
  });
  const showPet = () => {
    if (win.isDestroyed()) return;
    win.center();
    win.show();
    win.focus();
    win.moveTop();
    logMain(`createPetWindow: shown bounds=${JSON.stringify(win.getBounds())}`);
  };
  win.once("ready-to-show", () => {
    showPet();
  });
  setTimeout(showPet, 1500);
  win.loadURL(rendererUrl("#/pet")).catch((error) => {
    logMain(`petWindow loadURL failed: ${error?.stack || error}`);
  });
  return win;
}

function createResultWindow() {
  const win = new BrowserWindow({
    width: 860,
    height: 720,
    minWidth: 620,
    minHeight: 480,
    title: "PaperCat Summary",
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadURL(rendererUrl("#/summary"));
  return win;
}

function createHistoryWindow(paperId) {
  const win = new BrowserWindow({
    width: 1280,
    height: 760,
    minWidth: 860,
    minHeight: 460,
    title: "PaperCat History",
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      plugins: true,
    },
  });
  win.loadURL(rendererUrl(paperId ? `#/history?paperId=${encodeURIComponent(paperId)}` : "#/history"));
  return win;
}

function createPaperChatWindow(paperId) {
  const win = new BrowserWindow({
    width: 680,
    height: 760,
    minWidth: 520,
    minHeight: 560,
    title: "PaperCat Chat",
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadURL(rendererUrl(`#/chat?paperId=${encodeURIComponent(paperId)}`));
  return win;
}

function createSettingsWindow(mode) {
  const win = new BrowserWindow({
    width: 680,
    height: 640,
    minWidth: 560,
    minHeight: 520,
    title: "PaperCat Settings",
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadURL(rendererUrl(mode === "setup" ? "#/settings?mode=setup" : "#/settings"));
  return win;
}

function openResultWindow() {
  if (resultWindow && !resultWindow.isDestroyed()) {
    resultWindow.focus();
    resultWindow.webContents.send("summary:updated", currentSummary);
    return;
  }
  resultWindow = createResultWindow();
}

function openHistoryWindow(paperId) {
  if (historyWindow && !historyWindow.isDestroyed()) {
    historyWindow.focus();
    if (paperId) {
      historyWindow.webContents.send("history:select", paperId);
    }
    return;
  }
  historyWindow = createHistoryWindow(paperId);
}

function openPaperChatWindow(paperId) {
  const existing = chatWindows.get(paperId);
  if (existing && !existing.isDestroyed()) {
    existing.focus();
    return;
  }
  const win = createPaperChatWindow(paperId);
  chatWindows.set(paperId, win);
  win.on("closed", () => chatWindows.delete(paperId));
}

function openSettingsWindow(mode) {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = createSettingsWindow(mode);
}

app.whenReady().then(() => {
  if (isQuittingForSecondInstance) return;
  logMain(`app ready: runtimeDir=${runtimeDir}, resourcesPath=${process.resourcesPath}, execPath=${process.execPath}`);
  petWindow = createPetWindow();
  ensureBackend().catch((error) => {
    logMain(`ensureBackend failed: ${error?.stack || error}`);
  });

  ipcMain.handle("summary:set-current", (_event, summary) => {
    currentSummary = summary;
    broadcastSummaryUpdated(summary);
    return true;
  });
  ipcMain.handle("summary:publish", (_event, summary) => {
    currentSummary = summary;
    broadcastSummaryCreated(summary);
    return true;
  });
  ipcMain.handle("summary:get-current", () => currentSummary);
  ipcMain.handle("window:open-summary", () => openResultWindow());
  ipcMain.handle("window:open-paper-chat", (_event, paperId) => openPaperChatWindow(paperId));
  ipcMain.handle("window:open-history", (_event, paperId) => openHistoryWindow(paperId));
  ipcMain.handle("window:open-settings", (_event, mode) => openSettingsWindow(mode));
  ipcMain.handle("window:quit", () => app.quit());
  ipcMain.handle("window:get-pet-position", () => petWindow?.getPosition() ?? [0, 0]);
  ipcMain.handle("window:set-pet-position", (_event, x, y) => {
    petWindow?.setPosition(Math.round(x), Math.round(y), false);
    return true;
  });
  ipcMain.handle("pet:set-mood", (_event, state, message) => {
    petWindow?.webContents.send("pet:mood", state, message);
    return true;
  });
  ipcMain.handle("window:show-context-menu", () => {
    const menu = Menu.buildFromTemplate([
      { label: "Open History", click: () => openHistoryWindow() },
      { label: "Open Settings", click: () => openSettingsWindow() },
      { type: "separator" },
      { label: "Quit", click: () => app.quit() },
    ]);
    menu.popup({ window: petWindow ?? undefined });
  });
  ipcMain.handle("dialog:select-directory", async () => {
    const owner =
      (settingsWindow && !settingsWindow.isDestroyed() && settingsWindow) ||
      (petWindow && !petWindow.isDestroyed() && petWindow) ||
      undefined;
    const options = {
      title: "选择 PaperCat 保存路径",
      properties: ["openDirectory", "createDirectory"],
    };
    const result = owner
      ? await dialog.showOpenDialog(owner, options)
      : await dialog.showOpenDialog(options);
    if (result.canceled) return null;
    return result.filePaths[0] ?? null;
  });
});

app.on("second-instance", () => {
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.show();
    petWindow.center();
    petWindow.focus();
    petWindow.moveTop();
  }
});

app.on("before-quit", () => {
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    petWindow = createPetWindow();
  }
});
