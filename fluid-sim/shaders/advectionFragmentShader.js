const fragmentShader = `
  precision highp float;
  const float seed = ${Math.random()};
  const float PI = 3.14159;

  // uniform float uTime;
  // uniform float uAspect;
  uniform float uCursorSpeed;
  uniform vec2 uResolution;
  // uniform vec3 uColor; // color under cursor in range [0,1]


  uniform float uDeltaTime; 
  uniform sampler2D uInputTexture; 
  uniform sampler2D uVelocity;
  uniform vec2 uCursor; // 0 -> 1
  uniform bool uFirstFrame;
  uniform bool uWritingToVelocity;

  varying vec2 vUV;
  varying vec2 vTexCoord;



  vec4 bilerp(sampler2D q, vec2 p, vec2 rdx) {
    vec2 p11 = floor(p);
    vec2 p22 = ceil(p);
    vec2 p12 = vec2(p11.x, p22.y);
    vec2 p21 = vec2(p22.x, p11.y);
        
    vec4 q11 = texture2D(q, p11*rdx);
    vec4 q12 = texture2D(q, p12*rdx);
    vec4 q21 = texture2D(q, p21*rdx);
    vec4 q22 = texture2D(q, p22*rdx);
    
    // to make my life easier
    float x = p.x;
    float y = p.y;
    float x1 = p11.x;
    float y1 = p11.y;
    float x2 = p22.x;
    float y2 = p22.y;
    
  return q11*(x2-x)*(y2-y) +
            q21*(x-x1)*(y2-y) +
            q12*(x2-x)*(y-y1) +
            q22*(x-x1)*(y-y1);
  }

  void main() {
    // the velocity field
    vec2 velocityField = texture2D(uVelocity, vTexCoord).xy;
    velocityField -= vec2(0.5);
    if (uFirstFrame && uWritingToVelocity) {
      velocityField = vec2(sin(4.0*PI*vTexCoord.y), sin(4.0*PI*vTexCoord.x));
      gl_FragColor = vec4(0.5);
    } else {


      float impulseRadius = 0.001 * uCursorSpeed * 100.0;
      vec2 impulse = normalize(vTexCoord - uCursor) * 0.016 * exp(-(pow(vTexCoord.x - uCursor.x, 2.0) + pow(vTexCoord.y - uCursor.y, 2.0)) / impulseRadius);
      impulse *= 100.0;//uCursorSpeed * 100.0;
      velocityField.xy += impulse * 10.0;

      vec2 previousPosition = vTexCoord -  0.5 * uDeltaTime * velocityField;

      // gl_FragColor = bilerp(uInputTexture, previousPosition * uResolution, 1.0/uResolution);
      gl_FragColor = mix(texture2D(uInputTexture, vTexCoord), texture2D(uInputTexture, previousPosition), 1.0);
      // gl_FragColor = texture2D(uInputTexture, previousPosition);

      if (uWritingToVelocity) {
        // gl_FragColor.rgb -= 0.5;
        gl_FragColor.rg += impulse;
      }

      // if (distance(uCursor, vTexCoord) < 0.05) {
      //   gl_FragColor.b = length(impulse * 100.0);
      // }
      gl_FragColor.a = 0.2;
    }
  }
  `;

  module.exports = fragmentShader;