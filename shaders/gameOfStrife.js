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
  uniform bool uJustReceivedCapture;
  uniform vec2 uResolution;

  varying vec2 vUV;
  varying vec2 vTexCoord;

  vec4 maxNeighbor(vec4 texture, vec4 nbrs[8]) {
    vec4 r = texture;

    //for whatever reason, doing this in a loop was super expensive on performance,
    // but this way it is fast...no idea why.
    r = (length(nbrs[0]) > length(r)) ? nbrs[0] : r;
    r = (length(nbrs[1]) > length(r)) ? nbrs[1] : r;
    r = (length(nbrs[2]) > length(r)) ? nbrs[2] : r;
    r = (length(nbrs[3]) > length(r)) ? nbrs[3] : r;
    r = (length(nbrs[4]) > length(r)) ? nbrs[4] : r;
    r = (length(nbrs[5]) > length(r)) ? nbrs[5] : r;
    r = (length(nbrs[6]) > length(r)) ? nbrs[6] : r;
    r = (length(nbrs[7]) > length(r)) ? nbrs[6] : r;
  
    return r;       
  }

  void main() {

    vec2 uv = vec2(vUV.x*uAspect, vUV.y);
    vec2 uCursor2 = vec2(uCursor.x*uAspect, uCursor.y);    
    vec2 pixel = vec2(1.0) / uResolution;
    
    vec4 neighbors[8];
    neighbors[0] = texture2D(uImage,vUV + pixel*vec2(-1,1));
    neighbors[1] = texture2D(uImage,vUV + pixel*vec2(-1,0));
    neighbors[2] = texture2D(uImage,vUV + pixel*vec2(-1,-1));
    neighbors[3] = texture2D(uImage,vUV + pixel*vec2(0,1));
    neighbors[4] = texture2D(uImage,vUV + pixel*vec2(0,-1));
    neighbors[5] = texture2D(uImage,vUV + pixel*vec2(1,1));
    neighbors[6] = texture2D(uImage,vUV + pixel*vec2(1,0));
    neighbors[7] = texture2D(uImage,vUV + pixel*vec2(1,-1));


    vec4 neighborSum = vec4(0.0);
    vec4 tex = texture2D(uImage, vUV);
    vec4 outColor = vec4(0.0,0.0,0.0,1.0);

    // add up the neighboring pixels
    for (int i = 0; i < 8; i++) {
      neighborSum += neighbors[i];
    }

    float n = length(neighborSum.rgb);

    // check if our pixel is alive
    bool alive = length(tex.rgb) > 0.2;

    if (alive) {
      // die by under-population
       if (n < 2.0) {
         outColor = tex/1.05;//vec3(0.0,0.0,1.0);
       } 
       // live on
       else if (n < 4.0) {
         outColor = mix(tex, maxNeighbor(tex,neighbors), 0.5);
       }
       // die by over-population
       else {
         outColor = tex/1.05;
       }
    }
    // resurrection/reproduction
    else if (n > 2.0  && n < 4.0) {
      outColor = mix(tex, maxNeighbor(tex,neighbors), 0.5);
    } 
    else outColor = tex/1.05;


    if (distance(uCursor2, uv) < 0.01) {
      outColor = vec4(1.0);
    }

    gl_FragColor =  outColor;
  }
  `

  module.exports = {
    vertexShaderSource: vertexShader,
    fragmentShaderSource: fragmentShader
  }