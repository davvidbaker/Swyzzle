const fragmentShader = `
  precision highp float;
  const float seed = ${Math.random()};
  const float PI = 3.14159;

  // uniform float uTime;
  // uniform float uAspect;
  // uniform vec2 uCursor; // 0 -> 1
  // uniform vec2 uCursorVelocity;
  // uniform vec3 uColor; // color under cursor in range [0,1]


  uniform float uDeltaTime; 
  uniform sampler2D uInputTexture; 
  uniform sampler2D uVelocity;

  varying vec2 vUV;
  varying vec2 vTexCoord;

  void main() {
    // the velocity field
    vec2 velocityField = texture2D(uVelocity, vTexCoord).xy;
    velocityField = vec2(sin(2.0*PI*vTexCoord.y), sin(2.0*PI*vTexCoord.x));

    vec2 previousPosition = vTexCoord - uDeltaTime * velocityField;

    gl_FragColor = texture2D(uInputTexture, previousPosition);
    gl_FragColor.a = 1.0;
  }
  `;

  module.exports = fragmentShader;