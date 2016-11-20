const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

console.log('electron version', process.versions.electron)
console.log('electron architecture', process.arch)
console.log(app.getPath('userData'))
const {ipcMain} = require('electron');

const path = require('path')
const url = require('url')
const robot = require('robotjs');
const menu = require('./menu.js');

const windows = new Map();

// default settings
const settings = {
  startTimeout: 500,
}
ipcMain.on('settings', (event, arg) => {
  settings.startTimeout = arg; 
  if (windows.has('mainWindow')) {
    windows.get('mainWindow').webContents.send('settings', { arg });
    windows.get('mainWindow').close();
  }
  init();
  console.log(settings);
});

let cursorInterval;
function createWindow() {
  app.focus();
  const displays = electron.screen.getAllDisplays();
  console.log(displays);
  // as of 11/2016, robotjs only supports the main display
  const activeDisplay = displays[0];

  const width = activeDisplay.workArea.width;
  const height = activeDisplay.workArea.height;
  // Create the browser window.
  windows.set('mainWindow', new BrowserWindow({
    show: false, // show the window gracefully
    width: width,
    height: height,
    transparent: true,
    frame: false,
    x: activeDisplay.bounds.x,
    y: activeDisplay.bounds.y,
  }));


  // and load the index.html of the app.
  windows.get('mainWindow').loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))
  windows.get('mainWindow').setIgnoreMouseEvents(true);
  windows.get('mainWindow').setAlwaysOnTop(true);

  // capture the screen and send it after a timeout
  // on Macs, the window can't go all the way to the top because the menu panel bar up there
  const workArea = electron.screen.getPrimaryDisplay().workArea;
  let screenCapture = robot.screen.capture(workArea.x, workArea.y, workArea.width, workArea.height);
  setTimeout(() => {
    windows.get('mainWindow').webContents.send('screen', screenCapture);
    windows.get('mainWindow').webContents.send('test', 'testing');
  }, 500);

  let cursorPos, cursorColor, cursorRGB;

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
      if (windows.has('mainWindow')) windows.get('mainWindow').webContents.send('cursor', { pos: cursorPos, color: cursorRGB });
    }
  }, 16);

  // gracefully show the main window
  windows.get('mainWindow').once('ready-to-show', () => {
    windows.get('mainWindow').show();
  });

  // Emitted when the window is closed.
  windows.get('mainWindow').on('closed', function () {
    // Dereference the window object
    windows.delete('mainWindow'); 
    console.log('closed the main window')
    if (cursorInterval) clearInterval(cursorInterval);
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  electron.Menu.setApplicationMenu(menu);
  init();
})

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
  if (!windows.has('mainWindow')) {
    init();
  }
})

let initTimeout;
function init() {
  console.log(`timing out in ${settings.startTimeout} ms`);;
  if (initTimeout) clearTimeout(initTimeout);
  initTimeout = setTimeout(createWindow, settings.startTimeout);
}


// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
