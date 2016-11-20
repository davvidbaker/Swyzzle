const ipcRenderer = require('electron').ipcRenderer;
const startTimeEl = document.getElementById('start');
const rangeEl = document.getElementById('range');
const saveEl =  document.getElementById('save');

let timeoutVal = 5;

rangeEl.oninput = changeStartTime;
function changeStartTime(evt) {
  const t = evt.target.value;
  let str;
  if (t < 10) {
    timeoutVal = t * 6;
    str = `${timeoutVal} seconds`
  } else if (t < 60) {
    timeoutVal = t * 60;
    str = `${t} minutes`
  } else {
    timeoutVal = t * 60 * 60;
    str = `${t} hours`
  }
  start.innerHTML = str;
}

saveEl.onclick = () => {
  // send over the timeout in milliseconds
  ipcRenderer.send('settings', timeoutVal * 1000);
}