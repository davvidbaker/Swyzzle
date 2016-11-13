
const canvas2 = document.createElement("canvas"),
      gl = canvas2.getContext("webgl", {
        antialias: false,
        alpha: true,
        // premultipliedAlpha: false
      });
document.body.appendChild(canvas2);

const vertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertexShader, `
precision mediump float;

attribute vec2 aPos;
attribute vec2 aUV;
varying vec2 vUV;

void main() {
  vUV = aUV;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`);

// uniform mat4 mvp;

// attribute vec3 position;

// void main(void) {

//   vec4 finalPosition = mvp * vec4(position, 1.0);

//   gl_Position = finalPosition;

//   if (gl_Position.w > 0.0) {
//     gl_PointSize = 4.0 / gl_Position.w;
//   } else {
//     gl_PointSize = 0.0;
//   }

// }`);
gl.compileShader(vertexShader);
if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
  console.error(gl.getShaderInfoLog(vertexShader));
}

const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragmentShader, `
precision highp float;

uniform vec2 uScreenResolution;
varying vec2 vUV;

void main() {
  gl_FragColor = vec4(vUV, 1.0, 1.0);
}
`);
// precision highp float;

// const vec4 begin = vec4(0.1, 0.75, 1.0, 1.0);
// const vec4 end = vec4(1.0, 1.0, 1.0, 1.0);

// vec4 interpolate4f(vec4 a,vec4 b, float p) {
//   return a + (b - a) * p;
// }

// void main(void) {

//   vec2 pc = (gl_PointCoord - 0.5) * 2.0;

//   float dist = (1.0 - sqrt(pc.x * pc.x + pc.y * pc.y));
//   vec4 color = interpolate4f(begin, end, dist);

//   // gl_FragColor = vec4(dist, 1.0, 1.0, 0.1);
//   vec2 uv = gl_PointCoord.xy;
// 	gl_FragColor = vec4(1.0,0.0,0.0,1.0);

//}`);

gl.compileShader(fragmentShader);
if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
  console.error(gl.getShaderInfoLog(fragmentShader));
}

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

const positions = [ [-1,1], [1,1], [-1,-1], [1,-1] ]
const uv = [ [0.0, 0.0], [1.0, 0.0], [0.0, 1.0], [1.0, 1.0] ]

const attributes = {
  position: gl.getAttribLocation(program, "position")
}, uniforms = {
  mvp: gl.getUniformLocation(program, "mvp")
};

const NUM_POINTS = 100000;
let points = [];
for (let index = 0; index < NUM_POINTS; index++) {
  points.push((Math.random() - 0.5) * 8);
  points.push((Math.random() - 0.5) * 8);
  points.push((Math.random() - 0.5) * 8);
}
points = [
    1.0,  1.0,  0.0,
    -1.0, 1.0,  0.0,
    1.0,  -1.0, 0.0,
    -1.0, -1.0, 0.0
  ];
  

const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);

gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

const pMatrix = mat4.create(),
      vMatrix = mat4.create(),
      ivMatrix = mat4.create(),
      mMatrix = mat4.create(),
      mvMatrix = mat4.create(),
      mvpMatrix = mat4.create(),
      position = vec3.create();

mat4.perspective(pMatrix, Math.PI * 0.35, canvas2.width / canvas2.height, 0.01, 100000.0);

vec3.set(position,0.0,0.0,0.0);

let angle = 0.0;

function render(now) {
  
  angle += 0.0005;
  
  gl.clearColor(0.0,0.0,0.0,0.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  // gl.clear();
  
  gl.viewport(0,0,canvas2.width,canvas2.height);

  // P * V * M
  //mat4.translate(mvpMatrix, mvpMatrix, position);
  mat4.identity(mMatrix);
  
  position[2] = Math.sin(now / 50000);
  
  mat4.identity(vMatrix);
  mat4.translate(vMatrix, vMatrix, position);
  mat4.rotateX(vMatrix, vMatrix, angle);
  mat4.rotateY(vMatrix, vMatrix, angle);
  mat4.rotateZ(vMatrix, vMatrix, angle);
  
  mat4.invert(ivMatrix, vMatrix);
  
  mat4.multiply(mvMatrix, ivMatrix, mMatrix);
  mat4.multiply(mvpMatrix, pMatrix, mvMatrix);
  
  gl.useProgram(program);
  gl.enableVertexAttribArray(attributes.position);
  gl.uniformMatrix4fv(uniforms.mvp, false, mvpMatrix);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, gl.FALSE, 3*4, 0);
  gl.drawArrays(gl.POINTS, 0, 4);
  
  //console.count("render");
  
  window.requestAnimationFrame(render);
  
}

render();

function resize() {
  
  canvas2.width = window.innerWidth;
  canvas2.height = window.innerHeight;
  
  mat4.perspective(pMatrix, Math.PI * 0.35, canvas2.width / canvas2.height, 0.01, 1000.0);
  
}

resize();

window.addEventListener("resize", resize);






