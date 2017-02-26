const fragmentShader = `
  precision highp float;

  uniform float uEpsilon;
  // uniform sampler2D uDivergence;
  uniform sampler2D uPressure;

  varying vec2 vUV;
  varying vec2 vTexCoord;

  float p(vec2 coord) {
    return texture2D(uPressure, coord).x;
  }
  void main() {
    gl_FragColor = vec4(1.0);
    gl_FragColor = vec4(0.25 * (
      0.0 +
      p(vTexCoord + vec2(2.0 * uEpsilon, 0.0)) +
      p(vTexCoord - vec2(2.0 * uEpsilon, 0.0)) +
      p(vTexCoord + vec2(0.0, 2.0 * uEpsilon)) + 
      p(vTexCoord - vec2(0.0, 2.0 * uEpsilon))
    ), 0.0, 0.0, 1.0);
  }
  `;


  module.exports = fragmentShader;