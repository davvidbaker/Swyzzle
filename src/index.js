import { captureElement, isPixelSource } from './capture/dom.js';
import { SwyzzleRenderer } from './core/SwyzzleRenderer.js';

function createOverlay(className) {
  const canvas = document.createElement('canvas');
  canvas.className = className;
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    zIndex: '2147483000',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 180ms ease',
  });
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  return canvas;
}

export class Swyzzle {
  constructor(options = {}) {
    this.ownsCanvas = !options.canvas;
    this.canvas = options.canvas || createOverlay(options.className || 'swyzzle-overlay');
    this.renderer = new SwyzzleRenderer(this.canvas, {
      effect: options.effect || 'swyzzle',
      autoStart: options.autoStart,
    });
    this.visible = false;
  }

  async capture(source = document.documentElement, captureOptions = {}) {
    const wasVisible = this.visible;
    this.hide();

    let pixels = source;
    if (!isPixelSource(source)) {
      try {
        pixels = await captureElement(source, captureOptions);
      } catch (error) {
        if (wasVisible) this.show();
        throw error;
      }
    }

    this.renderer.capture(pixels);
    this.show();
    return this;
  }

  setEffect(effect) {
    this.renderer.setEffect(effect);
    return this;
  }

  start() {
    this.renderer.start();
    return this;
  }

  stop() {
    this.renderer.stop();
    return this;
  }

  reset() {
    this.renderer.reset();
    return this;
  }

  show() {
    this.visible = true;
    this.canvas.style.opacity = '1';
    return this;
  }

  hide() {
    this.visible = false;
    this.canvas.style.opacity = '0';
    return this;
  }

  destroy() {
    this.renderer.destroy();
    if (this.ownsCanvas) this.canvas.remove();
    this.visible = false;
  }
}

export { captureElement, isPixelSource, SwyzzleRenderer };
export default Swyzzle;
