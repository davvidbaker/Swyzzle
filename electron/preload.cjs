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
  getState: () => ipcRenderer.invoke('swyzzle:get-state'),
  getEffects: () => ipcRenderer.invoke('swyzzle:get-effects'),
  setEffect: (effect) => {
    ipcRenderer.send('swyzzle:set-effect', effect);
  },
  sendState: (state) => {
    ipcRenderer.send('swyzzle:state', state);
  },
  onCommand: (listener) => {
    const wrapped = (_event, command) => listener(command);
    ipcRenderer.on('swyzzle:command', wrapped);
    return () => ipcRenderer.removeListener('swyzzle:command', wrapped);
  },
  quit: () => {
    ipcRenderer.send('swyzzle:quit');
  },
});
