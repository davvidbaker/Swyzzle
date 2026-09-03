import {
  app,
  BrowserWindow,
  desktopCapturer,
  ipcMain,
  screen,
  systemPreferences,
} from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
let mainWindow;

function createWindow() {
  const display = screen.getPrimaryDisplay();
  mainWindow = new BrowserWindow({
    ...display.workArea,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(directory, 'preload.cjs'),
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(directory, 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'Escape') app.quit();
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
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

ipcMain.handle('swyzzle:capture-screen', async () => {
  const window = mainWindow;
  try {
    window?.hide();
    await new Promise((resolve) => setTimeout(resolve, 120));
    return await capturePrimaryDisplay();
  } catch (error) {
    return {
      error: {
        code: error.code || 'CAPTURE_FAILED',
        message: error.message || 'Screen capture failed.',
      },
    };
  } finally {
    if (window && !window.isDestroyed()) {
      window.show();
      window.focus();
    }
  }
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
