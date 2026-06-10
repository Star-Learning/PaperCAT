const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("paperCat", {
  getPathForFile: (file) => webUtils.getPathForFile(file),
  setCurrentSummary: (summary) => ipcRenderer.invoke("summary:set-current", summary),
  publishSummary: (summary) => ipcRenderer.invoke("summary:publish", summary),
  getCurrentSummary: () => ipcRenderer.invoke("summary:get-current"),
  onSummaryUpdated: (callback) => {
    const listener = (_event, summary) => callback(summary);
    ipcRenderer.on("summary:updated", listener);
    return () => ipcRenderer.removeListener("summary:updated", listener);
  },
  onSummaryCreated: (callback) => {
    const listener = (_event, summary) => callback(summary);
    ipcRenderer.on("summary:created", listener);
    return () => ipcRenderer.removeListener("summary:created", listener);
  },
  openSummary: () => ipcRenderer.invoke("window:open-summary"),
  openPaperChat: (paperId) => ipcRenderer.invoke("window:open-paper-chat", paperId),
  openHistory: (paperId) => ipcRenderer.invoke("window:open-history", paperId),
  getPendingHistorySelection: () => ipcRenderer.invoke("history:get-pending-selection"),
  onHistorySelect: (callback) => {
    const listener = (_event, paperId) => callback(paperId);
    ipcRenderer.on("history:select", listener);
    return () => ipcRenderer.removeListener("history:select", listener);
  },
  openSettings: (mode) => ipcRenderer.invoke("window:open-settings", mode),
  quit: () => ipcRenderer.invoke("window:quit"),
  getPetPosition: () => ipcRenderer.invoke("window:get-pet-position"),
  setPetPosition: (x, y) => ipcRenderer.invoke("window:set-pet-position", x, y),
  setPetMood: (state, message) => ipcRenderer.invoke("pet:set-mood", state, message),
  onPetMood: (callback) => {
    const listener = (_event, state, message) => callback(state, message);
    ipcRenderer.on("pet:mood", listener);
    return () => ipcRenderer.removeListener("pet:mood", listener);
  },
  showContextMenu: () => ipcRenderer.invoke("window:show-context-menu"),
  selectDirectory: () => ipcRenderer.invoke("dialog:select-directory"),
});
