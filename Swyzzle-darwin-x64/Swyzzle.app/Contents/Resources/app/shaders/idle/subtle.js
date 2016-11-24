const vertexShader = `
  precision highp float;

  uniform vec2 uResolution;
  uniform bool uFlipY;

  attribute vec2 aPosPixels;
  attribute vec2 aTexCoord;

  varying vec2 vUV;

  void main() {
    // pixels to clip-space
    // convert position from pixels to 0 -> 1
    vec2 zeroToOne = aPosPixels / uResolution;

    // convert form 0 -> 1 to 0 -> 2
    vec2 zeroToTwo = zeroToOne * 2.0;

    // convert from 0 -> 2 to -1 -> 1
    vec2 clipSpace = zeroToTwo - 1.0; 

    // map the top left corner to pixel coordinate (0, 0)
    if (uFlipY) clipSpace.y *= -1.0;

    vUV = vec2(zeroToOne.x,  zeroToOne.y);

    gl_Position = vec4(clipSpace, 0.0, 1.0);
  }
  `;
  const fragmentShader = `
  precision highp float;
  const float seed = ${Math.random()};

  uniform float uTime;
  uniform float uAspect;
  uniform vec2 uCursor; // 0 -> 1
  uniform vec2 uCursorVelocity;
  uniform vec3 uColor; // color under cursor in range [0,1]
  uniform sampler2D uImage; 
  uniform vec2 uResolution;

  varying vec2 vUV;
  varying vec2 vTexCoord;

  // 2D pseudorandom
  float random(vec2 v) {
    return fract(sin(dot(v,vec2(12.9898,78.233)))*seed);
  }

  float noise(vec2 v) {
    vec2 iUv = floor(v*12.1)*(1.0+sin(uTime/1.0));
    vec2 fUv = fract(v*12.1)*(1.0+sin(uTime/1.0));

    // Four corners in 2D of a tile
    float a = random(iUv);
    float b = random(iUv + vec2(1.0, 0.0));
    float c = random(iUv + vec2(0.0, 1.0));
    float d = random(iUv + vec2(1.0, 1.0));

    vec2 u = smoothstep(0.0,1.0,fUv);

    return mix(a,b, u.x) + (c-a)* u.y * (1.0-u.x) + (d - b) *u.x*u.y;
  }

  void main() {
    vec2 pixel = vec2(1.0) / uResolution;

    vec2 uvForMouse = vec2(vUV.x*uAspect, vUV.y); // used for determining how close cursor is to pixels
    vec2 uCursor2 = vec2(uCursor.x*uAspect, uCursor.y);
    
    float dist = distance(uvForMouse, uCursor2);
    vec2 speedUV = vUV + 0.0001*uCursorVelocity/pow(dist,2.0);

    vec4 texel = texture2D(uImage, speedUV);
    vec4 texel2  = texture2D(uImage, fract(vUV*0.999 + 0.001*noise(vUV)));

    vec2 transformedUV = vUV;
    // transformedUV.x += length(texel.rgb)*noiseOverTime(vUV)*sin(uTime)*pixel.x;
    // transformedUV.y += length(texel.rgb)*noiseOverTime(vUV)*sin(uTime/3.1414)*pixel.y;
    // texel = mix(texture2D(uImage,speedTexel) , texture2D(uImage, transformedUV), 0.5);

    gl_FragColor = mix(texel,texel2,0.3);
    }
  `

  module.exports = {
    vertexShaderSource: vertexShader,
    fragmentShaderSource: fragmentShader
  }