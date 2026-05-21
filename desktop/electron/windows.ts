import type { BrowserWindow as BrowserWindowType } from "electron";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { app, BrowserWindow, screen } = require("electron") as typeof import("electron");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const preload = path.join(__dirname, "preload.js");
const rootDir = path.join(__dirname, "..");
const runtimeDir = path.join(rootDir, "runtime");
const userDataDir = path.join(runtimeDir, "electron-user-data");
const cacheDir = path.join(runtimeDir, "electron-cache");

fs.mkdirSync(userDataDir, { recursive: true });
fs.mkdirSync(cacheDir, { recursive: true });
app.setPath("userData", userDataDir);
app.commandLine.appendSwitch("disk-cache-dir", cacheDir);
app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");

function rendererUrl(hash = ""): string {
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    return `${devUrl}${hash}`;
  }
  return `file://${path.join(__dirname, "../dist/index.html")}${hash}`;
}

export function createPetWindow(): BrowserWindowType {
  const cursorPoint = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursorPoint);
  const workArea = display.workArea;
  const width = 330;
  const height = 260;
  const win = new BrowserWindow({
    width,
    height,
    x: workArea.x + Math.max(20, Math.round((workArea.width - width) / 2)),
    y: workArea.y + Math.max(20, Math.round((workArea.height - height) / 2)),
    transparent: true,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
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
  win.once("ready-to-show", () => {
    win.center();
    win.show();
    win.focus();
    win.moveTop();
  });
  win.loadURL(rendererUrl("#/pet"));
  return win;
}

export function createResultWindow(): BrowserWindowType {
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

export function createHistoryWindow(): BrowserWindowType {
  const win = new BrowserWindow({
    width: 880,
    height: 680,
    minWidth: 640,
    minHeight: 460,
    title: "PaperCat History",
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadURL(rendererUrl("#/history"));
  return win;
}

export function createSettingsWindow(): BrowserWindowType {
  const win = new BrowserWindow({
    width: 560,
    height: 420,
    title: "PaperCat Settings",
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadURL(rendererUrl("#/settings"));
  return win;
}
