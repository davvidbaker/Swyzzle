import { SwyzzleRenderer } from '../src/core/SwyzzleRenderer.js';

const canvas = document.querySelector('#glCanvas');

let renderer;
let captured = false;
let paused = false;
let effect = 'swyzzle';

try {
  renderer = new SwyzzleRenderer(canvas, { effect, autoStart: false });
} catch (error) {
  console.error(error);
}

function publishState() {
  window.swyzzleDesktop.sendState({ captured, paused, effect });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The captured screen image could not be decoded.'));
    image.src = dataUrl;
  });
}

function setCaptured(next) {
  captured = next;
  canvas.classList.toggle('visible', next);
  if (!next) paused = false;
}

async function captureFromDataUrl(dataUrl, nextEffect) {
  if (!renderer) return;
  if (nextEffect && nextEffect !== effect) {
    effect = nextEffect;
    renderer.setEffect(effect);
  }
  renderer.capture(await loadImage(dataUrl));
  setCaptured(true);
  paused = false;
  renderer.start();
  publishState();
}

function pause() {
  if (!renderer || !captured || paused) return;
  renderer.stop();
  paused = true;
  publishState();
}

function resume() {
  if (!renderer || !captured || !paused) return;
  renderer.start();
  paused = false;
  publishState();
}

function clearOverlay() {
  if (!renderer || !captured) return;
  renderer.stop();
  setCaptured(false);
  publishState();
}

function setEffect(nextEffect) {
  if (!renderer || !nextEffect || nextEffect === effect) return;
  effect = nextEffect;
  renderer.setEffect(effect);
  publishState();
}

window.swyzzleDesktop.onCommand(async (command) => {
  switch (command?.type) {
    case 'capture':
      await captureFromDataUrl(command.dataUrl, command.effect);
      break;
    case 'pause':
      pause();
      break;
    case 'resume':
      resume();
      break;
    case 'reset':
      renderer?.reset();
      break;
    case 'clear':
      clearOverlay();
      break;
    case 'setEffect':
      setEffect(command.effect);
      break;
    default:
      break;
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && captured) {
    event.preventDefault();
    clearOverlay();
  }
});

window.addEventListener('beforeunload', () => renderer?.destroy(), { once: true });
publishState();
