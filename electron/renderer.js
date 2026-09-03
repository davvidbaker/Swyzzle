import { SwyzzleRenderer } from '../src/core/SwyzzleRenderer.js';

const canvas = document.querySelector('#glCanvas');
const captureButton = document.querySelector('#captureBtn');
const resetButton = document.querySelector('#resetBtn');
const shaderSelect = document.querySelector('#shaderSelect');
const status = document.querySelector('#status');

let renderer;
try {
  renderer = new SwyzzleRenderer(canvas, { effect: shaderSelect.value });
} catch (error) {
  status.textContent = error.message;
  status.dataset.kind = 'error';
  captureButton.disabled = true;
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The captured screen image could not be decoded.'));
    image.src = dataUrl;
  });
}

captureButton.addEventListener('click', async () => {
  if (!renderer) return;
  captureButton.disabled = true;
  status.textContent = 'Capturing…';
  status.dataset.kind = '';
  try {
    const capture = await window.swyzzleDesktop.captureScreen();
    renderer.capture(await loadImage(capture.dataUrl));
    canvas.classList.add('visible');
    status.textContent = 'Move the pointer to melt the screen. Press Escape to quit.';
  } catch (error) {
    status.textContent = error.message;
    status.dataset.kind = 'error';
  } finally {
    captureButton.disabled = false;
  }
});

resetButton.addEventListener('click', () => renderer?.reset());
shaderSelect.addEventListener('change', (event) => renderer?.setEffect(event.target.value));

let cursorTimer;
function showCursor() {
  document.body.classList.remove('cursor-hidden');
  clearTimeout(cursorTimer);
  cursorTimer = setTimeout(() => document.body.classList.add('cursor-hidden'), 2000);
}
document.addEventListener('pointermove', showCursor, { passive: true });
showCursor();

window.addEventListener('beforeunload', () => renderer?.destroy(), { once: true });
