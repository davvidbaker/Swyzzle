import assert from 'node:assert/strict';
import test from 'node:test';
import { captureElement, isPixelSource } from '../src/capture/dom.js';
import { SwyzzleRenderer } from '../src/core/SwyzzleRenderer.js';

test('recognizes browser pixel sources without accepting arbitrary values', () => {
  const PreviousCanvas = globalThis.HTMLCanvasElement;
  class MockCanvas {}
  globalThis.HTMLCanvasElement = MockCanvas;
  try {
    assert.equal(isPixelSource(new MockCanvas()), true);
    assert.equal(isPixelSource({ width: 100, height: 100 }), false);
    assert.equal(isPixelSource(null), false);
  } finally {
    globalThis.HTMLCanvasElement = PreviousCanvas;
  }
});

test('DOM capture rejects non-elements with a useful error', async () => {
  await assert.rejects(captureElement({}), {
    name: 'TypeError',
    message: 'DOM capture requires an Element.',
  });
});

test('publishes the preserved desktop effects', () => {
  assert.deepEqual(SwyzzleRenderer.effects, ['basic', 'swyzzle', 'fluid']);
});
