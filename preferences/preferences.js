const ipcRenderer = require('electron').ipcRenderer;
const remote = require('electron').remote;
const globalSettings = remote.getGlobal('settings');

const startSpan = document.getElementById('start');
const timeInput = document.getElementById('time');
const unitSelect = document.getElementById('unit');
const saveBtn =  document.getElementById('save');
const testBtn =  document.getElementById('test');
const onTopCheckbox  = document.getElementById('on-top');
const invisibleCheckbox  = document.getElementById('invisible');
const modeSelect = document.getElementById('mode');
const openLoginCheckbox  = document.getElementById('open-login');

let localSettings;

// populate the preferences with the user's prefs
(function initializeSettings() {
  // copy the globalSettings by value
  localSettings = Object.assign({}, globalSettings);

  timeInput.value = localSettings.startTimeout;
  unitSelect.value = localSettings.timeoutUnit;
  onTopCheckbox.checked = localSettings.alwaysOnTop;
  invisibleCheckbox.checked = localSettings.clickThrough;
  openLoginCheckbox.checked = localSettings.clickThrough;
  modeSelect.value = localSettings.mode;
})()

timeInput.oninput = (evt) => { localSettings.startTimeout = evt.target.value; }

unitSelect.oninput = (evt) => { localSettings.timeoutUnit = evt.target.value; }

modeSelect.oninput = (evt) => { localSettings.mode = evt.target.value; }

onTopCheckbox.onchange = (evt) => { localSettings.alwaysOnTop = evt.target.checked }

invisibleCheckbox.onchange = (evt) => { localSettings.clickThrough = evt.target.checked }

openLoginCheckbox.onchange = (evt) => { localSettings.openAtLogin = evt.target.checked }


// get start timeout in milliseconds
function getStartMS(t) {
  switch(unitSelect.value) {
    case 's': return t*1000;
    case 'm': return t*1000*60;
    case 'h': return t*1000*60*60;
    default: return t*1000;
  }
}

testBtn.onclick = () => {
  ipcRenderer.send('test');
}

saveBtn.onclick = () => {
  // we are still use ipcRenderer instead of just setting globalSettings here because we are writing to the file system which should be done in main process 
  localSettings.startTimeoutMS = getStartMS(localSettings.startTimeout);
  ipcRenderer.send('settings', localSettings);
}