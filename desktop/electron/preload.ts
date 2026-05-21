import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { contextBridge, ipcRenderer, webUtils } = require("electron") as typeof import("electron");

contextBridge.exposeInMainWorld("paperCat", {
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  setCurrentSummary: (summary: unknown) => ipcRenderer.invoke("summary:set-current", summary),
  getCurrentSummary: () => ipcRenderer.invoke("summary:get-current"),
  onSummaryUpdated: (callback: (summary: unknown) => void) => {
    const listener = (_event: unknown, summary: unknown) => callback(summary);
    ipcRenderer.on("summary:updated", listener);
    return () => ipcRenderer.removeListener("summary:updated", listener);
  },
  openSummary: () => ipcRenderer.invoke("window:open-summary"),
  openHistory: () => ipcRenderer.invoke("window:open-history"),
  openSettings: () => ipcRenderer.invoke("window:open-settings"),
  quit: () => ipcRenderer.invoke("window:quit"),
  getPetPosition: () => ipcRenderer.invoke("window:get-pet-position"),
  setPetPosition: (x: number, y: number) => ipcRenderer.invoke("window:set-pet-position", x, y),
  showContextMenu: () => ipcRenderer.invoke("window:show-context-menu"),
});
