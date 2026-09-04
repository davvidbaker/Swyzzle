# Swyzzle

Swyzzle captures pixels and melts them with interactive WebGL feedback shaders.
It includes a macOS menu-bar Electron app and a framework-neutral web package
built from the same rendering engine.

## Desktop app

```bash
npm install
npm start
```

Swyzzle lives in the menu bar. Use the icon to **Capture**, **Pause**, **Reset**,
**Clear**, or open **Preferences**. Escape clears the overlay.

On macOS, allow the app that launches Electron to record the screen in
**System Settings → Privacy & Security → Screen Recording**. Swyzzle reports a
recoverable error when permission is denied or no display source is available.

## Use it in a web app

Install and import the package:

```bash
npm install swyzzle
```

```js
import Swyzzle from 'swyzzle';

const effect = new Swyzzle({ effect: 'swyzzle' });
await effect.capture(document.documentElement);
```

DOM capture is a convenience. For predictable results, pass a browser pixel
source directly:

```js
const image = document.querySelector('img');
await effect.capture(image);

effect.setEffect('fluid');
effect.reset();
effect.hide();
effect.destroy();
```

The browser bundle is also available as a script-tag global:

```html
<script src="swyzzle.global.js"></script>
<script>
  const effect = new SwyzzlePackage.Swyzzle();
  effect.capture(document.documentElement);
</script>
```

### API

- `new Swyzzle(options)` creates an overlay canvas, or uses `options.canvas`.
- `capture(elementOrPixelSource, options)` captures a DOM element or consumes an
  image, canvas, video, `ImageBitmap`, or `OffscreenCanvas`.
- `setEffect('basic' | 'fluid' | 'swyzzle' | 'og' | 'blendmelt' | 'rgb' | 'subtle' | 'gameOfStrife')` changes the active shader.
- `start()` / `stop()` control animation.
- `reset()` restores the original captured pixels.
- `show()` / `hide()` control the overlay.
- `destroy()` cancels animation, releases WebGL resources, and removes an
  automatically-created overlay.

### Browser capture limitations

Browser security rules prevent guaranteed screenshots of arbitrary pages.
Cross-origin images without CORS, iframes, video, browser UI, and some WebGL
canvases may be omitted or rejected by DOM capture. Pass an image or canvas
source when those pixels are important.

## Development

```bash
npm run dev:web       # browser demo
npm run build         # ESM and script-tag bundles
npm test              # unit tests
npm run test:browser  # browser integration tests
npm run check         # full validation
```

The browser demo is at `http://localhost:8000/demo/index.html` while `dev:web`
runs.
Architecture decisions are recorded in
[`docs/adr`](docs/adr/001-shared-effect-core-and-capture-adapters.md).

## License

MIT