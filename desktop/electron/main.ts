import type { BrowserWindow as BrowserWindowType } from "electron";
import { createRequire } from "node:module";
import {
  createHistoryWindow,
  createPetWindow,
  createResultWindow,
  createSettingsWindow,
} from "./windows.js";

const require = createRequire(import.meta.url);
const { app, BrowserWindow, ipcMain, Menu } = require("electron") as typeof import("electron");

let petWindow: BrowserWindowType | null = null;
let resultWindow: BrowserWindowType | null = null;
let historyWindow: BrowserWindowType | null = null;
let settingsWindow: BrowserWindowType | null = null;
let currentSummary: unknown = null;

function openResultWindow() {
  if (resultWindow && !resultWindow.isDestroyed()) {
    resultWindow.focus();
    resultWindow.webContents.send("summary:updated", currentSummary);
    return;
  }
  resultWindow = createResultWindow();
}

function openHistoryWindow() {
  if (historyWindow && !historyWindow.isDestroyed()) {
    historyWindow.focus();
    return;
  }
  historyWindow = createHistoryWindow();
}

function openSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = createSettingsWindow();
}

app.whenReady().then(() => {
  petWindow = createPetWindow();

  ipcMain.handle("summary:set-current", (_event, summary) => {
    currentSummary = summary;
    return true;
  });
  ipcMain.handle("summary:get-current", () => currentSummary);
  ipcMain.handle("window:open-summary", () => openResultWindow());
  ipcMain.handle("window:open-history", () => openHistoryWindow());
  ipcMain.handle("window:open-settings", () => openSettingsWindow());
  ipcMain.handle("window:quit", () => app.quit());
  ipcMain.handle("window:get-pet-position", () => petWindow?.getPosition() ?? [0, 0]);
  ipcMain.handle("window:set-pet-position", (_event, x: number, y: number) => {
    petWindow?.setPosition(Math.round(x), Math.round(y), false);
    return true;
  });
  ipcMain.handle("window:show-context-menu", () => {
    const menu = Menu.buildFromTemplate([
      { label: "Open History", click: openHistoryWindow },
      { label: "Open Settings", click: openSettingsWindow },
      { type: "separator" },
      { label: "Quit", click: () => app.quit() },
    ]);
    menu.popup({ window: petWindow ?? undefined });
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
