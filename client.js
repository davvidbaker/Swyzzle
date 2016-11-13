const canvasGL = document.createElement("canvas");
const screenHeight = screen.availHeight;
const screenWidth = screen.availWidth;
const startTime = Date.now();
let timer = 0;

/* =========================================================
                COMMUNICATION w/ MAIN PROCESS
 ========================================================= */
const ipc = require('electron').ipcRenderer;

ipc.on('asynchronous-reply', function (event, arg) {
  const newMouse = [arg.x/screenWidth, arg.y/screenHeight];
    {
      // uniforms.uMouse.value = new THREE.Vector2(arg.x/screenWidth, arg.y/screenHeight);//.x = evt.clientX/width;  

      // neeed to make sure these values are being updated even if the main window isn't open which prevents window.request animation frame from being called
      timer = Date.now() - startTime;
      gl.uniform1f(uniforms.uTime, timer);
      gl.uniform2f(uniforms.uCursor, newMouse[0], newMouse[1]);
      // uniforms.uTime.value = timer * 0.001;


      // uniforms.uOrigins.value[i%100] = new THREE.Vector3(arg.x/screenWidth, -arg.y/screenHeight + 1, uniforms.uTime.value);

      // lastMouse = [arg.x/screenWidth, arg.y/screenHeight];
      // i++;
  // console.log(arg)

  
    }
    // ctx.fillStyle = 'rgba(165,126,210,0.1)';
    // ctx.fillRect(arg.x, arg.y, 10, 10)
})


/* =========================================================
                       INITIALIZATION
 ========================================================= */
gl = canvasGL.getContext("webgl", {
  antialias: false,
  alpha: true,
  // premultipliedAlpha: false
});
canvasGL.width = screenWidth;
canvasGL.height = screenHeight
canvasGL.style.position = 'fixed'
canvasGL.style.left = 0,
canvasGL.style.top = 0,
canvasGL.style.zIndex = 10000;
// canvasGL.style.pointerEvents = 'none'

document.body.appendChild(canvasGL);

const vertexShaderSource = `
precision mediump float;

uniform vec2 uResolution;

attribute vec2 aPosPixels;

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
  clipSpace.y *= -1.0;

  vUV = vec2(zeroToOne.x,  zeroToOne.y);

  gl_Position = vec4(clipSpace, 0.0, 1.0);
}
`
const fragmentShaderSource = `
precision highp float;

uniform float uTime;
uniform float uAspect;
uniform vec2 uCursor; // 0 -> 1

varying vec2 vUV;

void main() {
  vec2 uv = vec2(vUV.x*uAspect, vUV.y);
  vec2 uCursor2 = vec2(uCursor.x*uAspect, uCursor.y);
  if (distance(uv, uCursor2) < 0.1) {
    gl_FragColor = vec4(vUV, 0.5 + sin(uTime/1000.0)/2.0, uCursor.y);
  } else {
    gl_FragColor = vec4(0.0,0.0,0.0,0.0);
  }
}
`
// create shaders
const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

// create program
const program = createProgram(gl, vertexShader, fragmentShader);

// look up the location (within the webgl program) of the attributes and uniforms
const attributes = {
  aPosPixelsLocation: gl.getAttribLocation(program, 'aPosPixels'),
  aUVLocation:  gl.getAttribLocation(program, 'aUV')
};
const uniforms = {
  uResolution: gl.getUniformLocation(program, 'uResolution'),
  uTime: gl.getUniformLocation(program, 'uTime'),
  uCursor: gl.getUniformLocation(program, 'uCursor'),
  uAspect: gl.getUniformLocation(program, 'uAspect'),
};

// attributes get their date from buffers, so we need to create a buffer...
const aPosPixelsBuffer = gl.createBuffer();
// ...and bind it to the ARRAY_BUFFER binding point, which is for vertex attributes...
gl.bindBuffer(gl.ARRAY_BUFFER, aPosPixelsBuffer);
// ...and then add data by referencing it through the bind point
const positions = [
  0, 0,
  screenWidth, 0,
  screenWidth, screenHeight,
  screenWidth, screenHeight,
  0, screenHeight,
  0, 0
]
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);


// map the -1 to 1 clip space to 0 -> canvas width, 0 -> canvas height
gl.viewport(0,0, gl.canvas.width, gl.canvas.height);

// tell webgl to use our shader program (we only have 1, so we don't need to do this in the render loop)
gl.useProgram(program);

// set the value of resolution uniform
gl.uniform2f(uniforms.uResolution, screenWidth, screenHeight);
gl.uniform1f(uniforms.uAspect, screenWidth/screenHeight);
/* =========================================================
                         RENDERING
 ========================================================= */

// clear the canvas
gl.clearColor(0,0,0,0);
gl.clear(gl.COLOR_BUFFER_BIT);

/* take data from the buffer we set up above and supply it to the attribute in the shader */
// turn the attribute on at a given index position
gl.enableVertexAttribArray(attributes.aPosPixelsLocation);

// bind position buffer
gl.bindBuffer(gl.ARRAY_BUFFER, aPosPixelsBuffer);

// tell the attribute how to get data out of the buffer
const size = 2;         // 2 components per iteration
const type = gl.FLOAT;  // the data is 32 bit floats
const normalize = false;// don't normalize data
const stride = 0;       // specify the size in bytes of the offset between the beginng of consecurtive vertex attributes
const offset = 0;       // offset in bytes of the first component in the vertex attribute ARRAY_BUFFER

// bind attribute to aPosBuffer, so that we're now free to bind something else to the ARRAY_BUFFER bind point. This attribute will continue to use positionBuffer.
gl.vertexAttribPointer(attributes.aPosPixelsLocation, size, type, normalize, stride, offset);

/* NB: Our vertex shader used to be expecting aPos to be a vec4 (but then we changed it vec2). We set size = 2, so this attribute will get its first 2 values from our buffer. Attributes default to 0,0,0,1, so the last two components will be 0, 1.*/


/* Execute our GLSL program */
const primitiveType = gl.TRIANGLES; // draws a triangle for a group of three vertices
const first = 0; // starting index in array of vector points
const count = positions.length/2; // number of indices to be rendered (4 === 1 in each corner)

render();

function render() {
  window.requestAnimationFrame(render);
  gl.drawArrays(primitiveType, first, count);
}












/* function for creating vertex and fragment shaders */
function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const successfulCompile = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
  if (successfulCompile) {
    return shader;
  } else {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
  }
}

/* function for linking together shaders into program */
function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program,vertexShader);
  gl.attachShader(program,fragmentShader);
  gl.linkProgram(program);
  const successfulLink = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (successfulLink) {
    return program;
  } else {
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
  }  
}