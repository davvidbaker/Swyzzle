export const vertexShader = `
  attribute vec2 aPosition;
  attribute vec2 aTexCoord;
  varying vec2 vUV;
  uniform float uFlipY;

  void main() {
    gl_Position = vec4(aPosition * 2.0 - 1.0, 0.0, 1.0);
    vUV = vec2(aTexCoord.x, mix(aTexCoord.y, 1.0 - aTexCoord.y, uFlipY));
  }
`;

export const displayFragmentShader = `
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D uTexture;

  void main() {
    gl_FragColor = texture2D(uTexture, vUV);
  }
`;

export const swyzzleFragmentShader = `
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D uImage;
  uniform sampler2D uFeedback;
  uniform float uTime;
  uniform vec2 uPointer;
  uniform vec2 uVelocity;
  uniform vec2 uResolution;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
               f.y);
  }

  void main() {
    vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
    float distanceFromPointer = length((vUV - uPointer) * aspect);
    float influence = exp(-distanceFromPointer * 13.0);
    vec2 drag = uVelocity * influence * 0.022;

    float bands = noise(vec2(vUV.x * 8.0, vUV.y * 2.0 + uTime * 0.08));
    float melt = smoothstep(0.35, 0.9, bands) * (0.002 + uTime * 0.000035);
    vec2 warped = clamp(vUV - drag + vec2((bands - 0.5) * 0.002, melt), 0.0, 1.0);

    vec4 fresh = texture2D(uImage, warped);
    vec4 previous = texture2D(uFeedback, clamp(warped + vec2(0.0, melt * 0.4), 0.0, 1.0));
    gl_FragColor = mix(fresh, previous, 0.91);
  }
`;

export const fluidFragmentShader = `
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D uImage;
  uniform sampler2D uFeedback;
  uniform float uTime;
  uniform vec2 uPointer;
  uniform vec2 uVelocity;
  uniform vec2 uResolution;

  void main() {
    vec2 pixel = 1.0 / max(uResolution, vec2(1.0));
    vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
    float distanceFromPointer = length((vUV - uPointer) * aspect);
    float influence = exp(-distanceFromPointer * 18.0);
    vec2 flow = uVelocity * influence * 0.035;
    flow += vec2(sin(vUV.y * 30.0 + uTime) * pixel.x,
                 cos(vUV.x * 24.0 + uTime * 0.8) * pixel.y) * 2.0;

    vec2 sampleUV = clamp(vUV - flow, 0.0, 1.0);
    vec4 previous = texture2D(uFeedback, sampleUV);
    vec4 fresh = texture2D(uImage, sampleUV);
    gl_FragColor = mix(fresh, previous, 0.965);
  }
`;

export const effectShaders = {
  swyzzle: swyzzleFragmentShader,
  fluid: fluidFragmentShader,
};
