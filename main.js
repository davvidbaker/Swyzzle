const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow  


console.log('electron version', process.versions.electron)
console.log('electron architecture', process.arch)
const {ipcMain} = require('electron');
const fs = require('fs'); // fs used for user settings  
const path = require('path');
const url = require('url');
const robot = require('robotjs');
const menu = require('./menu.js');
 
const defaultSettings = {
  startTimeout: 1,
  timeoutUnit: 's', // can be s or m or h
  startTimeoutMS: 1000,
  alwaysOnTop: false,
  clickThrough: false,
  openAtLogin: false,
  idleMode: 'og',
  activeMode: 'none',
}

const windows = new Map();
const readSettings = function() {
  const file = `${app.getPath('userData')}/userSettings.json`;
  return new Promise((resolve, reject) => {
    fs.readFile(file, 'utf8', (err, data) => {
      if (err) {
        if (err.code == 'ENOENT') {
          fs.writeFile(file, JSON.stringify(defaultSettings), err => {
            if (err) reject(err);
          });
          resolve(defaultSettings);
        }
        else {
          reject(err);
        }
      } else {
        resolve(JSON.parse(data));
      }
    });
  });
}

ipcMain.on('preview idle', (event, previewSettings) => {
   if (windows.has('swyzzleWindow')) {
    windows.get('swyzzleWindow').close();
  }
  createSwyzzleWindow('idle', previewSettings);
});
ipcMain.on('preview active', (event, previewSettings) => {
   if (windows.has('swyzzleWindow')) {
    windows.get('swyzzleWindow').close();
  }
  createSwyzzleWindow('active', previewSettings);
});

ipcMain.on('shader error', (event, arg) => {
  console.log('shader error', arg)
});
ipcMain.on('program error', (event, arg) => {
  console.log('program error', arg)
});

ipcMain.on('save settings', (event, arg) => {
  global.settings = arg;
   // set the app to open/not open on login (only supported on macOS)
  // app.setLoginItemSettings({
  //   openAtLogin: global.settings.openAtLogin
  // });

  // save the settings to disk
  fs.writeFile(`${app.getPath('userData')}/userSettings.json`, JSON.stringify(global.settings), err => {
    if (err) throw err;
  });

  if (windows.has('swyzzleWindow')) {
    windows.get('swyzzleWindow').close();
  }

  if (global.settings.activeMode !== 'none') initActive();
  resetIdleTimeout();
  console.log('new global settings', global.settings);
});

let cursorInterval;
/**
 * Creates and opens the idle window, which is the size of the primary display.
 * We never have both idle and active windows open at the same time, to avoid too much GPU activity.
 * 
 * @param {string} swyzzleType can be either 'active' or 'idle'
 * @param {object} settings [settings=global.settings]
 */
function createSwyzzleWindow(swyzzleType, settings = global.settings) {
  if (windows.has('swyzzleWindow')) {
    windows.get('swyzzleWindow').close();
  }
  console.log('created new window with settings', settings);
  if (settings[`${swyzzleType}Mode`] === 'none') return;

  app.focus();
  const displays = electron.screen.getAllDisplays();
  // as of 11/2016, robotjs only supports the main display
  const activeDisplay = displays[0];

  const width = activeDisplay.workArea.width;
  const height = activeDisplay.workArea.height;
  // Create the browser window.
  windows.set('swyzzleWindow', new BrowserWindow({
    show: false, // show the window gracefully
    width: width,
    height: height,
    transparent: true,
    frame: false,
    x: activeDisplay.bounds.x,
    y: activeDisplay.bounds.y,
  }));
  windows.get('swyzzleWindow').settings = settings;
  windows.get('swyzzleWindow').swyzzleType = swyzzleType;

  // active swyzzle window can always be clicked through, and mouse events are always ignored
  if (swyzzleType === 'active') {
    windows.get('swyzzleWindow').setIgnoreMouseEvents(true);
    windows.get('swyzzleWindow').setAlwaysOnTop(true);
  } else {
    windows.get('swyzzleWindow').setIgnoreMouseEvents(settings.clickThrough);
    windows.get('swyzzleWindow').setAlwaysOnTop(settings.alwaysOnTop);
  }


  // and load the index.html of the app.
  windows.get('swyzzleWindow').loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  // capture the screen and send it after a timeout
  // on Macs, the window can't go all the way to the top because the menu panel bar up there
  const workArea = electron.screen.getPrimaryDisplay().workArea;
  let screenCapture = robot.screen.capture(workArea.x, workArea.y, workArea.width, workArea.height);
  const screenCaptureTimeout = setTimeout(() => {
    console.log('sent screen capture');
    // check that it exists, in case swyzzle window was closed during that half second
    if (windows.has('swyzzleWindow'))
      windows.get('swyzzleWindow').webContents.send('screen', screenCapture);
  }, 500);

  let cursorPos, cursorColor, cursorRGB;

  if (cursorInterval) clearInterval(cursorInterval);
  cursorInterval = setInterval(() => {   
    var mouse = electron.screen.getCursorScreenPoint();
    cursorPos = mouse;
    if ((cursorPos.x >= activeDisplay.workArea.x && cursorPos.y >= activeDisplay.workArea.y) &&
      (cursorPos.x <= activeDisplay.workArea.x + width && cursorPos.y <= activeDisplay.workArea.y + height)
    ) {
      cursorColor = robot.getPixelColor(cursorPos.x, cursorPos.y);
      // split up color values and convert to 0 -> 1
      cursorRGB = {
        r: parseInt(cursorColor[0].concat(cursorColor[1]), 16) / 255,
        g: parseInt(cursorColor[2].concat(cursorColor[3]), 16) / 255,
        b: parseInt(cursorColor[4].concat(cursorColor[5]), 16) / 255
      };
      if (windows.has('swyzzleWindow')) windows.get('swyzzleWindow').webContents.send('cursor', { pos: cursorPos, color: cursorRGB });
    }
  }, 16);

  // gracefully show the main window
  windows.get('swyzzleWindow').once('ready-to-show', () => {
    windows.get('swyzzleWindow').show();
  });

  // Emitted when the window is closed.
  windows.get('swyzzleWindow').on('closed', function () {
    // Dereference the window object
    windows.delete('swyzzleWindow'); 

    if (screenCaptureTimeout) clearTimeout(screenCaptureTimeout);
    console.log('closed the main window of type', swyzzleType)

    // if the window that just closed was the idle window, initiate active, if it exists
    if (global.settings.activeMode !== 'none' && swyzzleType === 'idle') initActive();
    
    // startWaitingForIdle();
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
const appReady = function() {
  return new Promise((resolve, reject) => {
    app.on('ready', () => {
      resolve();
    })
  })
}

Promise.all([appReady(), readSettings()]).then(values => {
  global.settings = values[1];

  electron.Menu.setApplicationMenu(menu);
  if (global.settings.activeMode !== 'none') initActive();
  startWaitingForIdle();
});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  // if (process.platform !== 'darwin') {
  //   app.quit()
  // }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (!windows.has('swyzzleWindow')) {
    if (global.settings.activeMode !== 'none') initActive();
    // startWaitingForIdle();
  }
})

// get the cursor position every 100ms and check if it has moved.
// this is a hacky way to go about getting system idle timeout
// TODO better method of getting idle time
function startWaitingForIdle() {
  let lastMouse = {x: 0, y: 0};

   setInterval(() => {   
    var mouse = electron.screen.getCursorScreenPoint();
    // if you moved the mouse reset the countdown
    if (lastMouse.x !== mouse.x || lastMouse.y !== mouse.y) {
      resetIdleTimeout();
    }
    lastMouse = mouse;
  }, 100);
}

function initActive() {
  if (windows.has('swyzzleWindow')) {
    windows.get('swyzzleWindow').close();
  }
  createSwyzzleWindow('active');
}

let initTimeout;
function resetIdleTimeout() {
  if (initTimeout) clearTimeout(initTimeout);
  initTimeout = setTimeout(() => {
    if (windows.has('swyzzleWindow')) {
      windows.get('swyzzleWindow').close();
    }
    createSwyzzleWindow('idle');
  }, global.settings.startTimeoutMS);
}


// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
