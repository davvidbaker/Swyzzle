export function isPixelSource(value) {
  if (!value) return false;
  const constructors = [
    globalThis.HTMLImageElement,
    globalThis.HTMLCanvasElement,
    globalThis.HTMLVideoElement,
    globalThis.ImageBitmap,
    globalThis.OffscreenCanvas,
    globalThis.VideoFrame,
  ].filter(Boolean);
  return constructors.some((Constructor) => value instanceof Constructor);
}

export async function captureElement(element, options = {}) {
  if (!globalThis.Element || !(element instanceof globalThis.Element)) {
    throw new TypeError('DOM capture requires an Element.');
  }

  const { default: html2canvas } = await import('html2canvas');
  try {
    return await html2canvas(element, {
      backgroundColor: null,
      logging: false,
      scale: Math.min(globalThis.devicePixelRatio || 1, 2),
      useCORS: true,
      ...options,
    });
  } catch (error) {
    throw new Error(
      'The page could not be captured. Try passing an image or canvas source instead.',
      { cause: error },
    );
  }
}
