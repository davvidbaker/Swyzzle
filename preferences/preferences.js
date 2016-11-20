const ipcRenderer = require('electron').ipcRenderer;
const remote = require('electron').remote;
const globalSettings = remote.getGlobal('settings');

const startSpan = document.getElementById('start');
const timeInput = document.getElementById('time');
const unitSelect = document.getElementById('unit');
const saveBtn =  document.getElementById('save');
const onTopCheckBox  = document.getElementById('on-top');

let localSettings;

// populate the preferences with the user's prefs
(function initializeSettings() {
  // copy the globalSettings by value
  localSettings = Object.assign({}, globalSettings);

  timeInput.value = localSettings.startTimeout;
  unitSelect.value = localSettings.timeoutUnits; // kinda surprised that this works
})()

timeInput.oninput = changeStartTime;
function changeStartTime(evt) {
  const t = evt.target.value;
  localSettings.startTimeout = t;
}

unitSelect.oninput = changeUnit;
function changeUnit(evt) {
  console.log(evt.target.value)
  localSettings.timeoutUnit = evt.target.value;
}

// get start timeout in milliseconds
function getStartMS(t) {
  console.log(unitSelect.value)
  switch(unitSelect.value) {
    case 's': return t*1000;
    case 'm': return t*1000*60;
    case 'h': return t*1000*60*60;
    default: return t*1000;
  }
}
  

saveBtn.onclick = () => {
  // we are still use ipcRenderer instead of just setting globalSettings here because we are writing to the file system which should be done in main process 
  localSettings.startTimeoutMS = getStartMS(localSettings.startTimeout);
  ipcRenderer.send('settings', localSettings);
}