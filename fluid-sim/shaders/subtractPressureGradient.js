const fragmentShader = `
  precision highp float;

  uniform float uDeltaT;             // time between steps
  uniform float uRho;                // density
  uniform float uEpsilon;            // distance between grid units
  uniform sampler2D uVelocity;       // advected velocity field
  uniform sampler2D uPressure;       // solved pressure field

  varying vec2 vUV;
  varying vec2 vTexCoord;

  float p(vec2 coord) {
    return texture2D(uPressure, fract(coord)).x;
  }

  void main() {
    vec2 u_a = texture2D(uVelocity, vTexCoord).xy;

    float diff_p_x = (p(vTexCoord + vec2(uEpsilon, 0.0)) -
                      p(vTexCoord - vec2(uEpsilon, 0.0)));
    float u_x = u_a.x - uDeltaT/(2.0 * uRho * uEpsilon) * diff_p_x;

    float diff_p_y = (p(vTexCoord + vec2(0.0, uEpsilon)) -
                      p(vTexCoord - vec2(0.0, uEpsilon)));
    float u_y = u_a.y - uDeltaT/(2.0 * uRho * uEpsilon) * diff_p_y;

    gl_FragColor = vec4(u_x, u_y, 0.0, 0.0);
    // gl_FragColor = vec4(1.0);

  }
  `;

  module.exports = fragmentShader;