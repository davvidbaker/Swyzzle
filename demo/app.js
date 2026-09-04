import Swyzzle from '../src/index.js';

const effect = document.querySelector('#effect');
const melt = document.querySelector('#melt');
const reset = document.querySelector('#reset');
const clear = document.querySelector('#clear');
const message = document.querySelector('#message');

const swyzzle = new Swyzzle({ effect: effect.value });
const IDLE_MS = 1000;

let idleTimer = null;
let autoStarted = false;

async function runMelt() {
  if (swyzzle.visible) return;

  melt.disabled = true;
  message.textContent = 'Capturing…';
  try {
    await swyzzle.capture(document.documentElement);
    message.textContent = `${effect.options[effect.selectedIndex].text} is running. Move the pointer to seed pixels.`;
  } catch (error) {
    message.textContent = error.message;
  } finally {
    melt.disabled = false;
  }
}

function scheduleAutoStart() {
  clearTimeout(idleTimer);
  if (autoStarted || swyzzle.visible) return;

  message.textContent = 'Hold still…';
  idleTimer = setTimeout(async () => {
    autoStarted = true;
    await runMelt();
  }, IDLE_MS);
}

function handlePointerActivity() {
  if (autoStarted || swyzzle.visible) return;
  scheduleAutoStart();
}

melt.addEventListener('click', async () => {
  autoStarted = true;
  clearTimeout(idleTimer);
  await runMelt();
});

effect.addEventListener('change', () => swyzzle.setEffect(effect.value));
reset.addEventListener('click', () => swyzzle.reset());
clear.addEventListener('click', () => {
  swyzzle.hide();
  autoStarted = false;
  message.textContent = '';
  scheduleAutoStart();
});

document.addEventListener('pointermove', handlePointerActivity, { passive: true });
window.addEventListener('beforeunload', () => swyzzle.destroy(), { once: true });

scheduleAutoStart();
