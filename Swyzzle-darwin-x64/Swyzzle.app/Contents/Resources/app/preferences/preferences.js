const ipcRenderer = require('electron').ipcRenderer;
const remote = require('electron').remote;
const fs = require('fs');
const path = require('path');
const globalSettings = remote.getGlobal('settings');
const globalActiveModes = remote.getGlobal('activeModes');
const globalIdleModes = remote.getGlobal('idleModes');

const startSpan = document.getElementById('start');
const timeInput = document.getElementById('time');
const unitSelect = document.getElementById('unit');
const saveBtn =  document.getElementById('save');
const previewIdleBtn =  document.getElementById('preview-idle');
const previewActiveBtn =  document.getElementById('preview-active');
const onTopCheckbox  = document.getElementById('on-top');
const invisibleCheckbox  = document.getElementById('invisible');
const clickCloseCheckbox = document.getElementById('click-to-close');
const keyCloseCheckbox = document.getElementById('key-to-close');
const idleModeSelect = document.getElementById('idle-mode');
const activeModeSelect = document.getElementById('active-mode');
const openLoginCheckbox  = document.getElementById('open-login');
const showDockCheckbox  = document.getElementById('show-dock');

let localSettings;

initializeSettings()
// populate the preferences with the user's prefs
function initializeSettings() {
  // populate the swyzzle active and idle mode options
  globalIdleModes.forEach(file => {
    const option = document.createElement('option');
    option.text = file.match(/(.*)\.js$/)[1];
    option.value = file.match(/(.*)\.js$/)[1];
    idleModeSelect.add(option);
  });
  globalActiveModes.forEach(file => {
    const option = document.createElement('option');
    option.text = file.match(/(.*)\.js$/)[1];
    option.value = file.match(/(.*)\.js$/)[1];
    activeModeSelect.add(option);
  });

  // copy the globalSettings by value
  localSettings = Object.assign({}, globalSettings);

  timeInput.value = localSettings.startTimeout;
  unitSelect.value = localSettings.timeoutUnit;

  onTopCheckbox.checked = localSettings.alwaysOnTop;
  invisibleCheckbox.checked = localSettings.clickThrough;
  openLoginCheckbox.checked = localSettings.openAtLogin;
  clickCloseCheckbox.checked = localSettings.clickToCloseIdle;
  keyCloseCheckbox.checked = localSettings.pressAnyKeyToCloseIdle;
  showDockCheckbox.checked = localSettings.showDockIcon;

  idleModeSelect.value = localSettings.idleMode;
  activeModeSelect.value = localSettings.activeMode;

  if (localSettings.clickThrough) {
    clickCloseCheckbox.disabled = false;
  }
};

timeInput.oninput = (evt) => { localSettings.startTimeout = evt.target.value; }
unitSelect.oninput = (evt) => { localSettings.timeoutUnit = evt.target.value; }

idleModeSelect.oninput = (evt) => { localSettings.idleMode = evt.target.value; }
activeModeSelect.oninput = (evt) => { localSettings.activeMode = evt.target.value; }

onTopCheckbox.onchange = (evt) => { localSettings.alwaysOnTop = evt.target.checked }
invisibleCheckbox.onchange = (evt) => { 
  localSettings.clickThrough = evt.target.checked;
  if (localSettings.clickThrough) {

    clickCloseCheckbox.checked = false;
    localSettings.clickToCloseIdle = false;
    clickCloseCheckbox.disabled = true;
  } else {
    clickCloseCheckbox.disabled = false;
  }
}
keyCloseCheckbox.onchange = (evt) => { localSettings.pressAnyKeyToCloseIdle = evt.target.checked }
clickCloseCheckbox.onchange = (evt) => { localSettings.clickToCloseIdle = evt.target.checked }
openLoginCheckbox.onchange = (evt) => { localSettings.openAtLogin = evt.target.checked }
showDockCheckbox.onchange = (evt) => { localSettings.showDockIcon = evt.target.checked }


// get start timeout in milliseconds
function getStartMS(t) {
  switch(unitSelect.value) {
    case 's': return t*1000;
    case 'm': return t*1000*60;
    case 'h': return t*1000*60*60;
    default: return t*1000;
  }
}

previewIdleBtn.onclick = () => {
  ipcRenderer.send('preview idle', localSettings);
}
previewActiveBtn.onclick = () => {
  ipcRenderer.send('preview active', localSettings);
}

saveBtn.onclick = () => {
  // we are still use ipcRenderer instead of just setting globalSettings here because we are writing to the file system which should be done in main process 
  localSettings.startTimeoutMS = getStartMS(localSettings.startTimeout);
  ipcRenderer.send('save settings', localSettings);
}