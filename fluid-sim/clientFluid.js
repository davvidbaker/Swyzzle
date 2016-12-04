const ShaderProgram = require('./ShaderProgram.js');

const canvasGL = document.createElement("canvas");
const screenHeight = screen.availHeight;
const screenWidth = screen.availWidth;
const gl = canvasGL.getContext("webgl", {
  antialias: false,
  alpha: true,
  // premultipliedAlpha: false
});
module.exports = gl;
canvasGL.width = screenWidth;
canvasGL.height = screenHeight;
canvasGL.style.position = 'fixed';
canvasGL.style.left = 0,
  canvasGL.style.top = 0,
  canvasGL.style.zIndex = 10000;
// canvasGL.style.pointerEvents = 'none'

document.body.appendChild(canvasGL);

const startTime = Date.now();
let timer = 0;
let oldMouse = newMouse = [0.5, 0.5];
let mouseVelocity = [0, 0];

const ipc = require('electron').ipcRenderer;
const remote = require('electron').remote;
const robot = require('robotjs');
const path = require('path');

const swyzzleWindow = remote.getCurrentWindow();
const settings = swyzzleWindow.settings;
const swyzzleType = swyzzleWindow.swyzzleType;
/* =========================================================
    CHOOSE WHICH SHADERS TO USE BASED ON GLOBAL SETTINGS
 ========================================================= */
const shadersPath = `../shaders/${swyzzleType}/${settings[`${swyzzleType}Mode`]}.js`;
const shadersPath2 = `../shaders/${swyzzleType}/gameOfStrife.js`;

const basicVertexShader = require('./shaders/basicVertexShader');
const ogFragmentShader = require('./shaders/ogFragmentShader');

// const shadersPath2 = `../shaders/${swyzzleType}/gameOfStrife}.js`;
let source2 = require(path.join(__dirname, shadersPath2));
let vertexShaderSource2 = source2.vertexShaderSource;
let fragmentShaderSource2 = source2.fragmentShaderSource;

let {vertexShaderSource, fragmentShaderSource} = require(path.join(__dirname, shadersPath));


/* =========================================================
 COMMUNICATION w/ MAIN PROCESS —— receiving screen capture
 ========================================================= */
let screenImage;
ipc.on('screen', function (event, screenCapture) {
  let imgData = screenCapture.image;
  // for some reason, it seems that the rgb data being sent through robot js is actually ordered bgra...so we need to swizzle
  for (let i = 0; i < imgData.length; i += 4) {
    const tmp = imgData[i * 1];
    imgData[i * 1] = imgData[i * 1 + 2];
    imgData[i * 1 + 2] = tmp;
  }

  // For higher density screens (Macs) the resulting screen capture could be larger than the area requested. 
  // You can work around this by dividing the image size by the requested size
  const scaledImageData = [];
  const multi = screenCapture.width / screenWidth;
  let ind = 0;
  if (screenWidth * screenHeight * 4 < imgData.length) {
    for (let row = 0; row < screenCapture.height; row += multi) {
      for (let col = 0; col < screenCapture.width; col += multi) {
        scaledImageData[ind] = imgData[row * 4 * screenCapture.width + col * 4];
        scaledImageData[ind + 1] = imgData[row * 4 * screenCapture.width + col * 4 + 1];
        scaledImageData[ind + 2] = imgData[row * 4 * screenCapture.width + col * 4 + 2];
        scaledImageData[ind + 3] = imgData[row * 4 * screenCapture.width + col * 4 + 3];
        ind += 4;
      }
    }
    imgData = scaledImageData;
  }

  screenImage = new ImageData(screenWidth, screenHeight);
  screenImage.data.set(imgData);
  init();
});

let uniforms;
let currentProgram;
let ogShaderProgram;
let lifeShaderProgram;
function init() {

  addEventListeners();

  /* =========================================================
                        INITIALIZATION
  ========================================================= */
  ogShaderProgram = new ShaderProgram(gl, vertexShaderSource, fragmentShaderSource, ['aPosition'], ['uResolution', 'uTime', 'uCursor', 'uCursorVelocity', 'uAspect', 'uFlipY', 'uColor'], 2, screenImage, screenWidth, screenHeight);

  lifeShaderProgram = new ShaderProgram(gl, vertexShaderSource2, fragmentShaderSource2, ['aPosition'], ['uResolution', 'uTime', 'uCursor', 'uCursorVelocity', 'uAspect', 'uFlipY', 'uColor'], 2, screenImage, screenWidth, screenHeight);

  currentProgram = lifeShaderProgram;
  gl.useProgram(currentProgram.program);
  currentProgram.setUniform('uAspect', screenWidth / screenHeight);
  currentProgram.setUniform('uResolution', screenWidth, screenHeight);

  /* =========================================================
                          RENDERING
  ========================================================= */
  // clear the canvas
  gl.clearColor(0, 0, 0, 0.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  currentProgram.supplyAttribute('aPosition');

  /* NB: Our vertex shader used to be expecting aPos to be a vec4 (but then we changed it vec2). We set size = 2, so this attribute will get its first 2 values from our buffer. Attributes default to 0,0,0,1, so the last two components will be 0, 1.*/

  /* =============================
    Execute our GLSL program 
  ============================= */
  const primitiveType = gl.TRIANGLES; // draws a triangle for a group of three vertices
  const first = 0; // starting index in array of vector points
  const count = 6; // number of indices to be rendered (6 == 2 triangles)

  let ind = 0;

  gl.bindTexture(gl.TEXTURE_2D, currentProgram.textures[0]);
  render();

  function render() {
    gl.useProgram(currentProgram.program);

    // we don't need to flip y in the framebuffers (also note that bools can be set as either floating point or integers)
    currentProgram.setUniform('uFlipY', false);
    // ping pong through the effects
    ind++;
    setFramebuffer(currentProgram.framebuffers[ind % 2], screenWidth, screenHeight);

    gl.drawArrays(primitiveType, first, count);

    // for the next draw, use the texture we just rendered to
    gl.bindTexture(gl.TEXTURE_2D, currentProgram.textures[ind % 2]);

    // finally draw the result to the canvas by setting the framebuffer to null
    setFramebuffer(null, canvasGL.width, canvasGL.height);
    currentProgram.setUniform('uFlipY', true);
    gl.drawArrays(primitiveType, first, count);

    function setFramebuffer(fbo, width, height) {
      // make this the frame buffer we are rendering to 
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      // tell the shader the resolution of the framebuffer
      currentProgram.setUniform('uResolution', width, height);
      // tell webgl the viewport setting needed for framebuffer
      gl.viewport(0, 0, width, height);
    }

    // clear the canvas
    gl.clearColor(0, 0, 0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(primitiveType, first, count);

    window.requestAnimationFrame(render);
  }

  /* function for creating vertex and fragment shaders */
  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const successfulCompile = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (successfulCompile) {
      return shader;
    } else {
      console.error(gl.getShaderInfoLog(shader));
      // send shader error to main process
      ipc.send('shader error', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
    }
  }

  /* function for linking together shaders into program */
  function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    const successfulLink = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (successfulLink) {
      return program;
    } else {
      console.error(gl.getProgramInfoLog(program));
      ipc.send('program error', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
    }
  }
}

function addEventListeners() {
  if (settings.clickToCloseIdle && swyzzleType === 'idle') {
    document.addEventListener('click', () => {
      swyzzleWindow.close();
    });
  }
  if (settings.pressAnyKeyToCloseIdle && swyzzleType === 'idle') {
    document.addEventListener('keydown', () => {
      swyzzleWindow.close();
    });
  }
  /* =========================================================
  COMMUNICATION w/ MAIN PROCESS -- receiving mouse posiiton
  ========================================================= */
  ipc.on('cursor', function (event, cursor) {
    newMouse = [cursor.pos.x / screenWidth, cursor.pos.y / screenHeight];

    // neeed to make sure these values are being updated even if the main window isn't open which prevents window.request animation frame from being called
    timer = Date.now() - startTime;

    currentProgram.setUniform('uTime', timer);
    currentProgram.setUniform('uCursor', newMouse[0], newMouse[1]);
    currentProgram.setUniform('uColor', cursor.color.r, cursor.color.g, cursor.color.b);


    // update mouse speed and...
    mouseVelocity = [newMouse[0] - oldMouse[0], newMouse[1] - oldMouse[1]];
    currentProgram.setUniform('uCursorVelocity', -mouseVelocity[0], -mouseVelocity[1])
    // ...update old mouse position
    oldMouse = newMouse;
  });
}