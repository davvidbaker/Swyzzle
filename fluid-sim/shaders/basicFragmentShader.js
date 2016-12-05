const fragmentShader = `
  precision highp float;
  const float seed = ${Math.random()};
  const float PI = 3.14159;

  // uniform float uTime;
  // uniform float uAspect;
  // uniform vec2 uCursor; // 0 -> 1
  // uniform vec2 uCursorVelocity;
  // uniform vec3 uColor; // color under cursor in range [0,1]

  uniform sampler2D uInputTexture; 

  varying vec2 vUV;
  varying vec2 vTexCoord;

  void main() {
    gl_FragColor = texture2D(uInputTexture, vTexCoord);
    gl_FragColor.a = 1.0;
  }
  `;

  module.exports = fragmentShader;