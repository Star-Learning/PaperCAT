const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("paperCat", {
  getPathForFile: (file) => webUtils.getPathForFile(file),
  setCurrentSummary: (summary) => ipcRenderer.invoke("summary:set-current", summary),
  getCurrentSummary: () => ipcRenderer.invoke("summary:get-current"),
  onSummaryUpdated: (callback) => {
    const listener = (_event, summary) => callback(summary);
    ipcRenderer.on("summary:updated", listener);
    return () => ipcRenderer.removeListener("summary:updated", listener);
  },
  openSummary: () => ipcRenderer.invoke("window:open-summary"),
  openHistory: () => ipcRenderer.invoke("window:open-history"),
  openSettings: () => ipcRenderer.invoke("window:open-settings"),
  quit: () => ipcRenderer.invoke("window:quit"),
  getPetPosition: () => ipcRenderer.invoke("window:get-pet-position"),
  setPetPosition: (x, y) => ipcRenderer.invoke("window:set-pet-position", x, y),
  showContextMenu: () => ipcRenderer.invoke("window:show-context-menu"),
  selectDirectory: () => ipcRenderer.invoke("dialog:select-directory"),
});
