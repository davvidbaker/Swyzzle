export const random = `
// 2D pseudorandom
float random(vec2 v) {
  return fract(sin(dot(v,vec2(12.9898,78.233)))*seed);
}
`;

export const noiseOverTime = `
float noiseOverTime(vec2 v) {
  vec2 iUv = floor(v*12.1)*(1.0+sin(t/1.0));
  vec2 fUv = fract(v*12.1)*(1.0+sin(t/1.0));

  // Four corners in 2D of a tile
  float a = random(iUv);
  float b = random(iUv + vec2(1.0, 0.0));
  float c = random(iUv + vec2(0.0, 1.0));
  float d = random(iUv + vec2(1.0, 1.0));

  vec2 u = smoothstep(0.0,1.0,fUv);

  return mix(a,b, u.x) + (c-a)* u.y * (1.0-u.x) + (d - b) *u.x*u.y;
}
`;

export const noiseWithoutTime = `float noiseWithoutTime(vec2 v) {
  vec2 iUv = floor(v*10.1);//*(1.0+sin(t/1.0));
  vec2 fUv = fract(v*10.1);//*(1.0+sin(t/1.0));

  // Four corners in 2D of a tile
  float a = random(iUv);
  float b = random(iUv + vec2(1.0, 0.0));
  float c = random(iUv + vec2(0.0, 1.0));
  float d = random(iUv + vec2(1.0, 1.0));

  vec2 u = smoothstep(0.0,1.0,fUv);

  return mix(a,b, u.x) + (c-a)* u.y * (1.0-u.x) + (d - b) *u.x*u.y;
}
`;

export const noise = `
float noise(vec2 v) {
  vec2 iUv = floor(v*12.1)*(1.0+sin(t/1.0));
  vec2 fUv = fract(v*12.1)*(1.0+sin(t/1.0));

  // Four corners in 2D of a tile
  float a = random(iUv);
  float b = random(iUv + vec2(1.0, 0.0));
  float c = random(iUv + vec2(0.0, 1.0));
  float d = random(iUv + vec2(1.0, 1.0));

  vec2 u = smoothstep(0.0,1.0,fUv);

  return mix(a,b, u.x) + (c-a)* u.y * (1.0-u.x) + (d - b) *u.x*u.y;
}`