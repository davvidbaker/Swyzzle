const fragmentShader = `
  precision highp float;
  const float seed = ${Math.random()};
  const float PI = 3.14159;

  // uniform float uTime;
  // uniform float uAspect;
  uniform float uCursorSpeed;
  // uniform vec3 uColor; // color under cursor in range [0,1]


  uniform float uDeltaTime; 
  uniform sampler2D uInputTexture; 
  uniform sampler2D uVelocity;
  uniform vec2 uCursor; // 0 -> 1
  uniform bool uFirstFrame;

  varying vec2 vUV;
  varying vec2 vTexCoord;

  void main() {
    // the velocity field
    vec2 velocityField = texture2D(uVelocity, vTexCoord).xy;
    // velocityField -= 0.5;
    // if (uFirstFrame)
      velocityField = vec2(sin(4.0*PI*vTexCoord.y), sin(4.0*PI*vTexCoord.x));

    float impulseRadius = 0.01;
    vec2 impulse = normalize(vTexCoord - uCursor) * 0.016 * exp(-(pow(vTexCoord.x - uCursor.x, 2.0) + pow(vTexCoord.y - uCursor.y, 2.0)) / impulseRadius);
    impulse *= uCursorSpeed * 100.0;
    velocityField.xy += impulse * 100.0;

    vec2 previousPosition = vTexCoord -  0.5 * uDeltaTime * velocityField;

    gl_FragColor = mix(texture2D(uInputTexture, vTexCoord), texture2D(uInputTexture, previousPosition), 0.99);
    // gl_FragColor = texture2D(uInputTexture, previousPosition);
    // gl_FragColor += impulse;

    // if (distance(uCursor, vTexCoord) < 0.05) {
    //   gl_FragColor.b = length(impulse * 100.0);
    // }
    gl_FragColor.a = 1.0;
  }
  `;

  module.exports = fragmentShader;