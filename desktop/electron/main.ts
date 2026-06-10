import type { BrowserWindow as BrowserWindowType, OpenDialogOptions } from "electron";
import { createRequire } from "node:module";
import {
  createHistoryWindow,
  createPaperChatWindow,
  createPetWindow,
  createResultWindow,
  createSettingsWindow,
  rendererUrl,
} from "./windows.js";

const require = createRequire(import.meta.url);
const { app, BrowserWindow, dialog, ipcMain, Menu } = require("electron") as typeof import("electron");

let petWindow: BrowserWindowType | null = null;
let resultWindow: BrowserWindowType | null = null;
let historyWindow: BrowserWindowType | null = null;
let settingsWindow: BrowserWindowType | null = null;
const chatWindows = new Map<string, BrowserWindowType>();
let currentSummary: unknown = null;

function broadcastSummaryCreated(summary: unknown) {
  const windows = [resultWindow, historyWindow, ...chatWindows.values()];
  for (const win of windows) {
    if (win && !win.isDestroyed()) {
      win.webContents.send("summary:created", summary);
      win.webContents.send("summary:updated", summary);
    }
  }
}

function broadcastSummaryUpdated(summary: unknown) {
  const windows = [resultWindow, historyWindow, ...chatWindows.values()];
  for (const win of windows) {
    if (win && !win.isDestroyed()) {
      win.webContents.send("summary:updated", summary);
    }
  }
}

function openResultWindow() {
  if (resultWindow && !resultWindow.isDestroyed()) {
    resultWindow.focus();
    resultWindow.webContents.send("summary:updated", currentSummary);
    return;
  }
  resultWindow = createResultWindow();
}

function openHistoryWindow(paperId?: string) {
  if (historyWindow && !historyWindow.isDestroyed()) {
    const win = historyWindow;
    win.focus();
    if (paperId) {
      void win
        .loadURL(rendererUrl(`#/history?paperId=${encodeURIComponent(paperId)}`))
        .then(() => {
          if (!win.isDestroyed()) {
            win.webContents.send("history:select", paperId);
          }
        })
        .catch(() => {
          if (!win.isDestroyed()) {
            win.webContents.send("history:select", paperId);
          }
        });
    }
    return;
  }
  historyWindow = createHistoryWindow(paperId);
}

function openPaperChatWindow(paperId: string) {
  const existing = chatWindows.get(paperId);
  if (existing && !existing.isDestroyed()) {
    existing.focus();
    return;
  }
  const win = createPaperChatWindow(paperId);
  chatWindows.set(paperId, win);
  win.on("closed", () => chatWindows.delete(paperId));
}

function openSettingsWindow(mode?: "setup") {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = createSettingsWindow(mode);
}

app.whenReady().then(() => {
  petWindow = createPetWindow();

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
  ipcMain.handle("window:open-paper-chat", (_event, paperId: string) => openPaperChatWindow(paperId));
  ipcMain.handle("window:open-history", (_event, paperId?: string) => openHistoryWindow(paperId));
  ipcMain.handle("window:open-settings", (_event, mode?: "setup") => openSettingsWindow(mode));
  ipcMain.handle("window:quit", () => app.quit());
  ipcMain.handle("window:get-pet-position", () => petWindow?.getPosition() ?? [0, 0]);
  ipcMain.handle("window:set-pet-position", (_event, x: number, y: number) => {
    petWindow?.setPosition(Math.round(x), Math.round(y), false);
    return true;
  });
  ipcMain.handle("pet:set-mood", (_event, state: string, message?: string) => {
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
    const parent =
      settingsWindow && !settingsWindow.isDestroyed()
        ? settingsWindow
        : petWindow && !petWindow.isDestroyed()
          ? petWindow
          : undefined;
    const options: OpenDialogOptions = {
      title: "选择 PaperCat 保存目录",
      properties: ["openDirectory", "createDirectory"],
    };
    const result = parent
      ? await dialog.showOpenDialog(parent, options)
      : await dialog.showOpenDialog(options);
    return result.canceled ? null : result.filePaths[0];
  });
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
