import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { contextBridge, ipcRenderer, webUtils } = require("electron") as typeof import("electron");

contextBridge.exposeInMainWorld("paperCat", {
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  setCurrentSummary: (summary: unknown) => ipcRenderer.invoke("summary:set-current", summary),
  publishSummary: (summary: unknown) => ipcRenderer.invoke("summary:publish", summary),
  getCurrentSummary: () => ipcRenderer.invoke("summary:get-current"),
  onSummaryUpdated: (callback: (summary: unknown) => void) => {
    const listener = (_event: unknown, summary: unknown) => callback(summary);
    ipcRenderer.on("summary:updated", listener);
    return () => ipcRenderer.removeListener("summary:updated", listener);
  },
  onSummaryCreated: (callback: (summary: unknown) => void) => {
    const listener = (_event: unknown, summary: unknown) => callback(summary);
    ipcRenderer.on("summary:created", listener);
    return () => ipcRenderer.removeListener("summary:created", listener);
  },
  openSummary: () => ipcRenderer.invoke("window:open-summary"),
  openPaperChat: (paperId: string) => ipcRenderer.invoke("window:open-paper-chat", paperId),
  openHistory: (paperId?: string) => ipcRenderer.invoke("window:open-history", paperId),
  getPendingHistorySelection: () => ipcRenderer.invoke("history:get-pending-selection"),
  onHistorySelect: (callback: (paperId: string) => void) => {
    const listener = (_event: unknown, paperId: string) => callback(paperId);
    ipcRenderer.on("history:select", listener);
    return () => ipcRenderer.removeListener("history:select", listener);
  },
  openSettings: (mode?: "setup") => ipcRenderer.invoke("window:open-settings", mode),
  quit: () => ipcRenderer.invoke("window:quit"),
  getPetPosition: () => ipcRenderer.invoke("window:get-pet-position"),
  setPetPosition: (x: number, y: number) => ipcRenderer.invoke("window:set-pet-position", x, y),
  setPetMood: (state: string, message?: string) => ipcRenderer.invoke("pet:set-mood", state, message),
  onPetMood: (callback: (state: string, message?: string) => void) => {
    const listener = (_event: unknown, state: string, message?: string) => callback(state, message);
    ipcRenderer.on("pet:mood", listener);
    return () => ipcRenderer.removeListener("pet:mood", listener);
  },
  showContextMenu: () => ipcRenderer.invoke("window:show-context-menu"),
  selectDirectory: () => ipcRenderer.invoke("dialog:select-directory"),
});
