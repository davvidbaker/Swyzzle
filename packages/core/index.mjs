import vertexShaderSource from './shaders/vertex/basic.mjs';
import fragmentShaderSource from './shaders/fragment/og2.mjs';

// must have regl script in html which adds createREGL to global scope
// <script language="javascript" src="https://npmcdn.com/regl/dist/regl.js"></script>

function init(domElement, containerId) {
  const regl = createREGL(containerId);

  const pixels = regl.texture({ data: domElement, flipY: true });

  function draw() {
    regl({
      frag: fragmentShaderSource,
      vert: vertexShaderSource,
      attributes: {
        position: [-2, 0, 0, -2, 2, 2],
      },
      uniforms: {
        t: ({ tick }) => 0.01 * tick,
        texture: pixels,
      },
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

  return regl.destroy
}

export default init;
