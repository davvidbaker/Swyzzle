vertexShader = `
  precision mediump float;

  uniform vec2 uResolution;
  uniform bool uFlipY;

  attribute vec2 aPosition;
  attribute vec2 aTexCoord;

  varying vec2 vUV;

  void main() {
    // pixels to clip-space
    // convert position from pixels to 0 -> 1
    vec2 zeroToOne = aPosition / uResolution;

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
fragmentShader = `
  precision highp float;
  const float seed = ${Math.random()};

  uniform float uTime;
  uniform float uAspect;
  uniform vec2 uCursor; // 0 -> 1
  uniform vec2 uCursorVelocity;
  uniform vec3 uColor; // color under cursor in range [0,1]
  uniform sampler2D uImage; 

  varying vec2 vUV;
  varying vec2 vTexCoord;

  // 2D pseudorandom
  float random(vec2 v) {
    return fract(sin(dot(v,vec2(12.9898,78.233)))*seed);
  }

  float noiseOverTime(vec2 v) {
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

    float noiseWithoutTime(vec2 v) {
    vec2 iUv = floor(v*10.1);//*(1.0+sin(uTime/1.0));
    vec2 fUv = fract(v*10.1);//*(1.0+sin(uTime/1.0));

    // Four corners in 2D of a tile
    float a = random(iUv);
    float b = random(iUv + vec2(1.0, 0.0));
    float c = random(iUv + vec2(0.0, 1.0));
    float d = random(iUv + vec2(1.0, 1.0));

    vec2 u = smoothstep(0.0,1.0,fUv);

    return mix(a,b, u.x) + (c-a)* u.y * (1.0-u.x) + (d - b) *u.x*u.y;
  }

  void main() {
    vec2 uv = vec2(vUV.x*uAspect, vUV.y);
    vec2 uCursor2 = vec2(uCursor.x*uAspect, uCursor.y);

    float dist = distance(uv, uCursor2);
    
    vec2 transformedUV = vUV + 0.0001*uCursorVelocity/pow(dist,2.0);
    transformedUV.y -= uTime/100000.*(seed*tan(vUV.x+0.5 + noiseWithoutTime(sin(vUV.x)*vUV.xy*1.)))*0.0001*noiseWithoutTime(vUV*1.);
    // transformedUV.y -= uTime / 10000000.;
    transformedUV.x -= uTime/100000.*(tan(vUV.x+0.5 + noiseWithoutTime(seed*tan(vUV.x)*vUV.xy*1.)))*0.0001*noiseWithoutTime(vUV*1.);

    vec2 transformedUV2 = vUV + 0.0001*uCursorVelocity/pow(dist,2.0);
    transformedUV2.y = transformedUV.y - (vUV.x*1.0 + noiseOverTime(vUV.xy*1.))*0.01*noiseOverTime(vUV*1.);

    // transformedUV.x = transformedUV.x - clamp(sin(vUV.y*10.),0.0, 1.0)*0.002*noise(vUV*1.);
    // transformedUV *= (1.0 + sign(random(floor(vUV*1.0))-0.5)*distance(vUV,vec2(0.5))*0.01*sin(uTime/90000.9123)*5.0*noise(vUV));
    vec4 tex = texture2D(uImage, transformedUV);
    vec4 texOff = texture2D(uImage, transformedUV+.0001);
    vec4 texOff2 = texture2D(uImage, transformedUV2);
    // tex.a = 0.1;
    gl_FragColor = mix(tex, texOff2, 0.01);
  }
  `

  module.exports = {
    vertexShaderSource: vertexShader,
    fragmentShaderSource: fragmentShader
  }