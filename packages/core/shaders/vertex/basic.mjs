export default `
precision mediump float;

uniform vec2 uResolution;
uniform bool uFlipY;

attribute vec2 aPosition;
attribute vec2 aTexCoord;

varying vec2 vTexCoord;
varying vec2 vUV;

void main() {
  vTexCoord = aTexCoord;

  // 0->1 to clip-space
  //  0 -> 1
  vec2 zeroToOne = aPosition;// / uResolution;

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
