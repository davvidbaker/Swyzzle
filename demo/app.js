import Swyzzle from '../src/index.js';

const effect = document.querySelector('#effect');
const melt = document.querySelector('#melt');
const reset = document.querySelector('#reset');
const clear = document.querySelector('#clear');
const message = document.querySelector('#message');

const swyzzle = new Swyzzle({ effect: effect.value });

melt.addEventListener('click', async () => {
  melt.disabled = true;
  message.textContent = 'Capturing…';
  try {
    await swyzzle.capture(document.documentElement);
    message.textContent = 'Move your pointer across the page.';
  } catch (error) {
    message.textContent = error.message;
  } finally {
    melt.disabled = false;
  }
});

effect.addEventListener('change', () => swyzzle.setEffect(effect.value));
reset.addEventListener('click', () => swyzzle.reset());
clear.addEventListener('click', () => {
  swyzzle.hide();
  message.textContent = '';
});
window.addEventListener('beforeunload', () => swyzzle.destroy(), { once: true });
