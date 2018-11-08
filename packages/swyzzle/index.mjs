import initRegl from 'regl';

import vertexShaderSource from './shaders/vertex/basic.mjs';
import fragmentShaderSource from './shaders/fragment/og2.mjs';

function init(
  domElementContainingImageData,
  containerId,
  {
    frag = fragmentShaderSource,
    vert = vertexShaderSource,
    extraAttributes = {},
    extraUniforms = {},
  } = {},
) {
  const regl = initRegl(containerId);

  const pixels = regl.texture({
    data: domElementContainingImageData,
    flipY: true,
  });

  function draw() {
    regl({
      frag,
      vert,
      attributes: Object.assign(
        {
          position: [-2, 0, 0, -2, 2, 2],
        },
        extraAttributes,
      ),
      uniforms: Object.assign(
        {
          t: ({ tick }) => 0.01 * tick,
          texture: pixels,
        },
        extraUniforms,
      ),
      count: 3,
    })();
  }

  regl.frame(() => {
    regl.clear({
      color: [0, 0, 0, 1],
    });
    draw();
    pixels({ copy: true });
  });

  return () => {
    if (document.querySelector(`#${containerId}`)) regl.destroy();
  };
}

export default init;
