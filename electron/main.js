import {
  app,
  BrowserWindow,
  Menu,
  Tray,
  desktopCapturer,
  dialog,
  ipcMain,
  nativeImage,
  screen,
  systemPreferences,
} from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));

export const EFFECTS = [
  ['basic', 'Basic'],
  ['og', 'OG Melt'],
  ['swyzzle', 'Swyzzle'],
  ['blendmelt', 'Blend Melt'],
  ['rgb', 'RGB Spread'],
  ['subtle', 'Subtle'],
  ['gameOfStrife', 'Game of Strife'],
  ['fluid', 'Fluid'],
];

let overlayWindow;
let preferencesWindow;
let tray;
const state = {
  captured: false,
  paused: false,
  effect: 'swyzzle',
};

function appIcon() {
  const file = process.platform === 'win32' ? 'icon.ico' : 'trayIconSpread512.png';
  return nativeImage.createFromPath(path.join(directory, 'images', file));
}

function applyAppIcon() {
  const icon = appIcon();
  if (process.platform === 'darwin') app.dock.setIcon(icon);
}

function preloadPath() {
  return path.join(directory, 'preload.cjs');
}

function createOverlayWindow() {
  const display = screen.getPrimaryDisplay();
  overlayWindow = new BrowserWindow({
    ...display.workArea,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    show: false,
    skipTaskbar: true,
    icon: appIcon(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: preloadPath(),
    },
  });

  overlayWindow.setMenuBarVisibility(false);
  overlayWindow.setAlwaysOnTop(true, 'floating');
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.loadFile(path.join(directory, 'index.html'));
  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
}

function openPreferences() {
  if (preferencesWindow && !preferencesWindow.isDestroyed()) {
    preferencesWindow.show();
    preferencesWindow.focus();
    return;
  }

  preferencesWindow = new BrowserWindow({
    width: 360,
    height: 280,
    show: false,
    resizable: false,
    fullscreenable: false,
    minimizable: false,
    title: 'Swyzzle Preferences',
    icon: appIcon(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: preloadPath(),
    },
  });
  preferencesWindow.setAlwaysOnTop(true, 'floating');
  preferencesWindow.once('ready-to-show', () => preferencesWindow?.show());
  preferencesWindow.loadFile(path.join(directory, 'preferences.html'));
  preferencesWindow.on('closed', () => {
    preferencesWindow = null;
  });
}

function sendOverlay(command) {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  overlayWindow.webContents.send('swyzzle:command', command);
}

function captureError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function capturePrimaryDisplay() {
  if (
    process.platform === 'darwin'
    && ['denied', 'restricted'].includes(systemPreferences.getMediaAccessStatus('screen'))
  ) {
    throw captureError(
      'SCREEN_PERMISSION_DENIED',
      'Screen Recording permission is required. Enable Swyzzle in System Settings → Privacy & Security → Screen Recording.',
    );
  }

  const display = screen.getPrimaryDisplay();
  const scale = display.scaleFactor || 1;
  const thumbnailSize = {
    width: Math.max(1, Math.round(display.bounds.width * scale)),
    height: Math.max(1, Math.round(display.bounds.height * scale)),
  };
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize });
  const source = sources.find(({ display_id: id }) => id === String(display.id)) || sources[0];
  if (!source || source.thumbnail.isEmpty()) {
    throw captureError(
      'SCREEN_SOURCE_UNAVAILABLE',
      'No screen image was available. Check screen-recording permission and try again.',
    );
  }

  const imageSize = source.thumbnail.getSize();
  const scaleX = imageSize.width / display.bounds.width;
  const scaleY = imageSize.height / display.bounds.height;
  const crop = {
    x: Math.max(0, Math.round((display.workArea.x - display.bounds.x) * scaleX)),
    y: Math.max(0, Math.round((display.workArea.y - display.bounds.y) * scaleY)),
    width: Math.min(imageSize.width, Math.round(display.workArea.width * scaleX)),
    height: Math.min(imageSize.height, Math.round(display.workArea.height * scaleY)),
  };
  const thumbnail = source.thumbnail.crop(crop);
  return {
    dataUrl: thumbnail.toDataURL(),
    width: crop.width,
    height: crop.height,
  };
}

async function captureScreen() {
  const overlay = overlayWindow;
  const prefs = preferencesWindow && !preferencesWindow.isDestroyed() ? preferencesWindow : null;
  try {
    overlay?.hide();
    prefs?.hide();
    await new Promise((resolve) => setTimeout(resolve, 120));
    return await capturePrimaryDisplay();
  } finally {
    if (overlay && !overlay.isDestroyed()) {
      overlay.setIgnoreMouseEvents(true, { forward: true });
    }
    if (prefs && !prefs.isDestroyed()) prefs.show();
  }
}

async function runCapture() {
  try {
    const capture = await captureScreen();
    if (!overlayWindow || overlayWindow.isDestroyed()) return;
    overlayWindow.show();
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    sendOverlay({ type: 'capture', dataUrl: capture.dataUrl, effect: state.effect });
    if (preferencesWindow && !preferencesWindow.isDestroyed()) {
      preferencesWindow.show();
    }
  } catch (error) {
    dialog.showErrorBox('Swyzzle', error.message || 'Screen capture failed.');
  }
}

function updateTrayMenu() {
  if (!tray) return;
  const pauseLabel = state.paused ? 'Resume' : 'Pause';
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Capture', click: () => runCapture() },
    { label: pauseLabel, enabled: state.captured, click: () => sendOverlay({ type: state.paused ? 'resume' : 'pause' }) },
    { label: 'Reset', enabled: state.captured, click: () => sendOverlay({ type: 'reset' }) },
    { label: 'Clear', enabled: state.captured, click: () => sendOverlay({ type: 'clear' }) },
    { type: 'separator' },
    { label: 'Preferences…', accelerator: 'CmdOrCtrl+,', click: () => openPreferences() },
    { type: 'separator' },
    { label: 'Quit Swyzzle', role: 'quit' },
  ]));
}

function createTray() {
  tray = new Tray(path.join(directory, 'images/trayIconSpread.png'));
  tray.setToolTip('Swyzzle');
  updateTrayMenu();
}

function createApplicationMenu() {
  const isMac = process.platform === 'darwin';
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: app.getName(),
      submenu: [
        { label: 'Preferences…', accelerator: 'CmdOrCtrl+,', click: () => openPreferences() },
        { type: 'separator' },
        ...(isMac ? [{ role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }] : []),
        { role: 'quit' },
      ],
    },
  ]));
}

ipcMain.handle('swyzzle:capture-screen', async () => {
  try {
    return await captureScreen();
  } catch (error) {
    return {
      error: {
        code: error.code || 'CAPTURE_FAILED',
        message: error.message || 'Screen capture failed.',
      },
    };
  }
});

ipcMain.handle('swyzzle:get-state', () => ({ ...state }));
ipcMain.handle('swyzzle:get-effects', () => EFFECTS.map(([value, label]) => ({ value, label })));

ipcMain.on('swyzzle:set-effect', (_event, effect) => {
  if (!EFFECTS.some(([value]) => value === effect)) return;
  state.effect = effect;
  sendOverlay({ type: 'setEffect', effect });
});

ipcMain.on('swyzzle:state', (_event, next) => {
  Object.assign(state, next);
  updateTrayMenu();
  if (!state.captured && overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible()) {
    overlayWindow.hide();
  }
});

ipcMain.on('swyzzle:quit', () => {
  app.quit();
});

app.whenReady().then(() => {
  applyAppIcon();
  if (process.platform === 'darwin') app.dock.hide();
  createOverlayWindow();
  createTray();
  createApplicationMenu();
  globalThis.__SWYZZLE__ = { hasTray: true };
  app.on('activate', () => openPreferences());
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
