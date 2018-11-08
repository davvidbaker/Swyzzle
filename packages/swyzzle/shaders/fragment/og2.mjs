import { random, noiseOverTime, noiseWithoutTime, noise } from './helpers.mjs';
  
export default `
precision mediump float;
const float seed = ${Math.random()};

uniform sampler2D texture;
uniform float t;

varying vec2 v_uv;

${random}
${noiseOverTime}
${noiseWithoutTime}
${noise}

void main () {
  vec2 uv = v_uv;
  
  vec2 transformedUV = uv;
  transformedUV.y -= 0.1*(sin(t/1000.0))*(uv.x*1.0/2.0 + noiseOverTime(uv.xy*0.5))*0.01*noiseOverTime(uv*0.5);
  transformedUV.x -= t/1.0 *(tan(uv.x+0.5 + noiseOverTime(seed*tan(uv.x)*uv.xy*1.)))*0.0001*noiseWithoutTime(uv*1.);

  vec2 transformedUV2 = uv;
  transformedUV2.y = transformedUV.y - (uv.x*1.0 + noiseOverTime(uv.xy*1.))*0.01*noiseOverTime(uv*1.);

  vec4 tex = texture2D(texture, transformedUV);
  vec4 texOff2 = texture2D(texture, transformedUV2);

  vec4 texelr = texture2D(texture, (noise(uv*100.0001)-0.5)*0.001 + uv);
  vec4 texelg = texture2D(texture, (noise(uv*100.0001)-0.5)*0.0011 + uv);
  vec4 texelb = texture2D(texture, (noise(uv*100.0001)-0.5)*0.0012 + uv);
  vec4 texel2 = vec4(texelr.r, texelg.g, texelb.b, 1.0);
  
  // gl_FragColor = mix(texOff2, texture2D(texture, transformedUV), 0.1);
  // gl_FragColor = texture2D(texture, transformedUV);
  // gl_FragColor = vec4(texelr.r, texelg.g, texelb.b, 1.0);
  gl_FragColor = mix(texture2D(texture, transformedUV), texel2, 0.99);

}`;
