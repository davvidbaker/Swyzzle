const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('swyzzleDesktop', {
  captureScreen: async () => {
    const result = await ipcRenderer.invoke('swyzzle:capture-screen');
    if (result?.error) {
      const error = new Error(result.error.message);
      error.code = result.error.code;
      throw error;
    }
    return result;
  },
});
