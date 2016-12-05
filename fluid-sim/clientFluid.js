const ShaderProgram = require('./ShaderProgram.js');
const screenHeight = screen.availHeight;
const screenWidth = screen.availWidth;
const canvasGL = document.querySelector('canvas');

const gl = canvasGL.getContext("webgl", {
    antialias: false,
    alpha: true,
    // premultipliedAlpha: false
});
// this extension exposes floating-point pixel types for textures
gl.getExtension('OES_texture_float');

canvasGL.width = screenWidth;
canvasGL.height = screenHeight;

document.body.appendChild(canvasGL);

const startTime = Date.now();
let timer = 0;
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

const basicVertexShaderSrc = require('./shaders/basicVertexShader.js');
const basicFragmentShaderSrc = require('./shaders/basicFragmentShader.js');
const ogFragmentShaderSrc = require('./shaders/ogFragmentShader.js');
const advectionShaderSrc = require('./shaders/advectionFragmentShader.js');
const jacobiIterationShaderSrc = require('./shaders/jacobiIteration.js');
const subtractPressureGradientShaderSrc = require('./shaders/subtractPressureGradient.js');

// const shadersPath2 = `../shaders/${swyzzleType}/gameOfStrife}.js`;
let source2 = require(path.join(__dirname, shadersPath2));
let vertexShaderSource2 = source2.vertexShaderSource;
let fragmentShaderSource2 = source2.fragmentShaderSource;

let {vertexShaderSource, fragmentShaderSource} = require(path.join(__dirname, shadersPath));

let {receiveScreenCapture, receiveCursorPosition} = require('./communicationWithMain.js');


/* =========================================================
 COMMUNICATION w/ MAIN PROCESS —— receiving screen capture
 ========================================================= */
let screenImagePromise = new Promise((resolve, reject) => {
    ipc.on('screen', (event, screenCapture) => {
        const img = receiveScreenCapture(event, screenCapture, screenWidth, screenHeight);
        resolve(img);
    });
});
let testImage;
screenImagePromise.then(img => {
    testImage = new Image();
    testImage.src = './images/purple.png';
    testImage.onload = () => {
        init(img)
    };
});


/* =========================================================
                      INITIALIZATION
========================================================= */
let currentProgram, textures, framebuffers; //advectionProgram, basicProgram;
const shaderPrograms = {};
function init(screenImage) {

    shaderPrograms['advectionProgram'] = new ShaderProgram(gl, basicVertexShaderSrc, advectionShaderSrc, ['aPosition'], 
    ['uFlipY', 'uResolution', 'uCursor', 'uCursorSpeed', 'uFirstFrame', 'uDeltaTime', 'uInputTexture', 'uVelocity'], screenWidth, screenHeight);

    shaderPrograms['basicProgram'] = new ShaderProgram(gl, basicVertexShaderSrc, basicFragmentShaderSrc, ['aPosition'], 
    ['uFlipY', 'uResolution', 'uInputTexture'], screenWidth, screenHeight);

    shaderPrograms['jacobiIterationProgram'] = new ShaderProgram(gl, basicVertexShaderSrc, jacobiIterationShaderSrc, ['aPosition'], 
    ['uResolution', 'uEpsilon', 'uPressure', 'uFlipY'], screenWidth, screenHeight);

    shaderPrograms['subtractPressureGradientProgram'] = new ShaderProgram(gl, basicVertexShaderSrc, subtractPressureGradientShaderSrc, ['aPosition'],
    [
      'uResolution', 'uDeltaT', 'uRho', 'uEpsilon', 'uVelocity', 'uPressure', 'uFlipY'
    ], screenWidth, screenHeight);

    currentProgram = shaderPrograms['advectionProgram'];

    for (shaderProgram in shaderPrograms) {
      gl.useProgram(shaderProgram.program);
      if ('uAspect' in shaderPrograms[shaderProgram].uniforms)
          shaderPrograms[shaderProgram].setUniform('uAspect', screenWidth / screenHeight);
      if ('uResolution' in shaderPrograms[shaderProgram].uniforms)
          shaderPrograms[shaderProgram].setUniform('uResolution', screenWidth, screenHeight);
    }
    gl.useProgram(currentProgram.program)
    currentProgram.setUniform('uFirstFrame', true);

    addEventListeners();

    gl.clearColor(0, 0, 0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // textures are how we share data between different shader programs, so they have to exist in this scope
    [textures, framebuffers] = makeTexturesAndFramebuffers([
        'color0', 'color1',
        'velocity0', 'velocity1',
        'pressure0', 'pressure1'
    ]);
    console.log(textures, framebuffers)

    function makeTexturesAndFramebuffers(names) {
        const textures = {};
        const framebuffers = {};

        names.forEach(str => {
            textures[str] = gl.createTexture();

            // bind given WebGL Texture to a binding point (target)
            gl.bindTexture(gl.TEXTURE_2D, textures[str]);

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);


            if (str === 'pressure0' || str === 'pressure1')
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.FLOAT, new ImageData(screenWidth, screenHeight));
            else if (str === 'color0' || str === 'color1') 
              gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.FLOAT, screenImage);
            else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.FLOAT, new ImageData(screenWidth, screenHeight));

            // create a framebuffer and attach a texture to it
            framebuffers[str] = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[str]);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textures[str], 0);
        });

        textures.swap = function(a, b) {
            const temp = textures[a];
            textures[a] = textures[b];
            textures[b] = temp;
            const temp2 = framebuffers[a];
            framebuffers[a] = framebuffers[b];
            framebuffers[b] = temp2;
        };
        return [textures, framebuffers];
    }

    /* =========================================================
                            RENDERING
    ========================================================= */
    currentProgram.supplyAttribute('aPosition');

    /* =============================
      Execute our GLSL program 
    ============================= */
    const primitiveType = gl.TRIANGLES; // draws a triangle for a group of three vertices
    const first = 0; // starting index in array of vector points
    const count = 6; // number of indices to be rendered (6 == 2 triangles)


    // gl.bindTexture(gl.TEXTURE_2D, textures['color0']);
    let lastTimestamp = 0;
    render(0);
    function render(timestamp) {
        // advect('velocity0', 'velocity1');
        // advect('color0', 'velocity1');

//////////
// advect the velocity texture thorugh itself, leaving the result in textures.velocity0
        currentProgram = shaderPrograms['advectionProgram'];
        gl.useProgram(currentProgram.program);
        // time in seconds so divide by 1000
        currentProgram.setUniform('uDeltaTime', (timestamp - lastTimestamp) / 10000);
        lastTimestamp = timestamp;
        gl.uniform1i(currentProgram.uniforms.uInputTexture, 0); // texture unit 0
        gl.uniform1i(currentProgram.uniforms.uVelocity, 1); // texture unit 1
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textures[`velocity0`]);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, textures['velocity0']);

        setFramebuffer(framebuffers[`velocity1`], screenWidth, screenHeight);   
        // we don't need to flip y in the framebuffers (also note that bools can be set as either floating point or integers)
        currentProgram.setUniform('uFlipY', false);

        gl.drawArrays(primitiveType, first, count);

        textures.swap(`velocity0`, `velocity1`);
/////////////
// calculate the  the pressure, leaving result in textures.pressure0
        // const JACOBI_ITERATIONS = 10;
        // for (let i = 0; i < 10; i++) {
        //   currentProgram = shaderPrograms.jacobiIterationProgram;
        //   gl.useProgram(currentProgram.program);

        //   gl.uniform1i(currentProgram.uniforms.uPressure, 0);
        //   gl.activeTexture(gl.TEXTURE0);
        //   gl.bindTexture(gl.TEXTURE_2D, textures[`pressure0`]);

        //   setFramebuffer(framebuffers[`pressure1`], screenWidth, screenHeight);   
        //   currentProgram.setUniform('uEpsilon', 1/screenWidth);
        //   currentProgram.setUniform('uFlipY', false);

        //   gl.drawArrays(primitiveType, first, count);

        //   textures.swap('pressure0', 'pressure1'); 
        // }
///////////
// subtract pressure gradient from advected velocity texture, leaving result in textures.velocity0
        currentProgram = shaderPrograms.subtractPressureGradientProgram;
        gl.useProgram(currentProgram.program);

        gl.uniform1i(currentProgram.uniforms.uVelocity, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textures[`velocity0`]);

        gl.uniform1i(currentProgram.uniforms.uPressure, 1);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, textures[`pressure0`]);

        setFramebuffer(framebuffers[`velocity1`], screenWidth, screenHeight);   
        currentProgram.setUniform('uEpsilon', 1/screenWidth);
        currentProgram.setUniform('uFlipY', false);
        currentProgram.setUniform('uDeltaT', (timestamp - lastTimestamp) / 10000);
        currentProgram.setUniform('uRho', 1.0);
        
        gl.drawArrays(primitiveType, first, count);

        textures.swap('velocity0', 'velocity1'); 


////////////////////
// advect color through advected velocity
        currentProgram = shaderPrograms['advectionProgram'];
        gl.useProgram(currentProgram.program);
        // These uniforms are defined in the fragment shader source.
        // This is how you use multiple textures in a single shader program.
        gl.uniform1i(currentProgram.uniforms.uInputTexture, 0); // texture unit 0
        gl.uniform1i(currentProgram.uniforms.uVelocity, 1); // texture unit 1
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textures[`color0`]);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, textures['velocity0']);

        setFramebuffer(framebuffers[`color1`], screenWidth, screenHeight);   
        // we don't need to flip y in the framebuffers (also note that bools can be set as either floating point or integers)
        currentProgram.setUniform('uFlipY', false);
        gl.drawArrays(primitiveType, first, count);
        textures.swap(`color0`, `color1`);
///////////////////


        // finally draw the result to the canvas by setting the framebuffer to null
        drawToCanvas('color0');

        // advect substance a by the velocity field b
        function advect(a, b) {
          currentProgram = shaderPrograms['advectionProgram'];
          gl.useProgram(currentProgram.program);
          // time in seconds so divide by 1000
          if ('uDeltaTime' in currentProgram.uniforms)
            currentProgram.setUniform('uDeltaTime', (timestamp - lastTimestamp) / 10000);
          lastTimestamp = timestamp;

          // These uniforms are defined in the fragment shader source.
          // This is how you use multiple textures in a single shader program.
          gl.uniform1i(currentProgram.uniforms.uInputTexture, 0); // texture unit 0
          gl.uniform1i(currentProgram.uniforms.uVelocity, 1); // texture unit 1
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, textures[a]);
          gl.activeTexture(gl.TEXTURE1);
          if (a !== 'color') 
            gl.bindTexture(gl.TEXTURE_2D, textures[a]);
          else
            gl.bindTexture(gl.TEXTURE_2D, textures[b]);
          

          setFramebuffer(framebuffers[`${a.substr(0,a.length-1)}1`], screenWidth, screenHeight);   
          // we don't need to flip y in the framebuffers (also note that bools can be set as either floating point or integers)
          currentProgram.setUniform('uFlipY', false);
          gl.drawArrays(primitiveType, first, count);
          textures.swap(a, `${a.substr(0,a.length-1)}1`);
        }

        function drawToCanvas(tex) {
          currentProgram.setUniform('uFirstFrame', false);
          currentProgram = shaderPrograms['basicProgram'];
          gl.useProgram(currentProgram.program);
          setFramebuffer(null, canvasGL.width, canvasGL.height);

          currentProgram.setUniform('uFlipY', true);
          gl.activeTexture(gl.TEXTURE0);
          gl.uniform1i(currentProgram.uniforms.uInputTexture, 0); // texture unit 0
          gl.bindTexture(gl.TEXTURE_2D, textures[tex]);

          // clear the canvas and draw
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.drawArrays(primitiveType, first, count);
          // textures.swap('color0', 'color1');
        }

        function setFramebuffer(fbo, width, height) {
            // make this the frame buffer we are rendering to 
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            // tell the shader the resolution of the framebuffer
            currentProgram.setUniform('uResolution', width, height);
            // tell webgl the viewport setting needed for framebuffer
            gl.viewport(0, 0, width, height);
        }
        window.requestAnimationFrame(render);
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
    let oldMousePosition = [0.5, 0.5];
    ipc.on('cursor', (event, cursor) => {
        [oldMousePosition, timer] = receiveCursorPosition(event, cursor, oldMousePosition, screenWidth, screenHeight, timer, startTime, shaderPrograms, currentProgram, gl);
    });
}