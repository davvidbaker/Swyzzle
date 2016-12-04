const ShaderProgram = require('./ShaderProgram.js');
const screenHeight = screen.availHeight;
const screenWidth = screen.availWidth;
const canvasGL = document.querySelector('canvas');

const gl = canvasGL.getContext("webgl", {
    antialias: false,
    alpha: true,
    // premultipliedAlpha: false
});

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
const ogFragmentShaderSrc = require('./shaders/ogFragmentShader.js');
const advectionShaderSrc = require('./shaders/advectionFragmentShader.js');

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
    testImage.src = './images/trayIconSpread512.png';
    testImage.onload = () => {
        init(img)
    };
});


/* =========================================================
                      INITIALIZATION
========================================================= */
let currentProgram, textures, framebuffers;
function init(screenImage) {
    const ogShaderProgram = new ShaderProgram(gl, vertexShaderSource, fragmentShaderSource, ['aPosition'], ['uResolution', 'uTime', 'uCursor', 'uCursorVelocity', 'uAspect', 'uFlipY', 'uColor'], screenWidth, screenHeight);

    const lifeShaderProgram = new ShaderProgram(gl, basicVertexShaderSrc, ogFragmentShaderSrc, ['aPosition'], ['uResolution', 'uTime', 'uCursor', 'uCursorVelocity', 'uAspect', 'uFlipY', 'uColor'], 2, screenImage, screenWidth, screenHeight);

    const advectionProgram = new ShaderProgram(gl, basicVertexShaderSrc, advectionShaderSrc, ['aPosition'], ['uFlipY', 'uResolution', 'uDeltaTime', 'uInputTexture', 'uVelocity'], screenWidth, screenHeight);

    currentProgram = advectionProgram;
    gl.useProgram(currentProgram.program);
    if ('uAspect' in currentProgram.uniforms)
        currentProgram.setUniform('uAspect', screenWidth / screenHeight);
    if ('uResolution' in currentProgram.uniforms)
        currentProgram.setUniform('uResolution', screenWidth, screenHeight);

    addEventListeners();

    gl.clearColor(0, 0, 0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // textures are how we share data between different shader programs, so they have to exist in this scope
    [textures, framebuffers] = makeTexturesAndFramebuffers([
        'color0', 'color1',
        'velocity0', 'velocity1',
        'pressure'
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


            if (str === 'velocity0')
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, testImage);
            else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, screenImage);

            // create a framebuffer and attach a texture to it
            framebuffers[str] = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[str]);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textures[str], 0);
        });

        textures.swap = function(a, b) {
            const temp = textures[a];
            textures[a] = textures[b];
            textures[b] = temp;
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


    gl.bindTexture(gl.TEXTURE_2D, textures['color0']);
    let lastTimestamp = 0;
    render(0);
    function render(timestamp) {
        console.log(timestamp, startTime);
        // time in seconds so divide by 1000
        currentProgram.setUniform('uDeltaTime', (timestamp - lastTimestamp) / 1000);
        lastTimestamp = timestamp;
        gl.uniform1i(currentProgram.uniforms.uInputTexture, 0); // texture unit 0
        gl.uniform1i(currentProgram.uniforms.uVelocity, 1); // texture unit 0

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textures['color0']);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, textures['velocity0']);

        // textures.swap('color0', 'color1');
        gl.useProgram(currentProgram.program);

        // we don't need to flip y in the framebuffers (also note that bools can be set as either floating point or integers)
        // gl.bindTexture(gl.TEXTURE_2D, textures['color0']);
        currentProgram.setUniform('uFlipY', false);
        // ping pong through the effects
        setFramebuffer(framebuffers['color1'], screenWidth, screenHeight);
        gl.drawArrays(primitiveType, first, count);

        // for the next draw, use the texture we just rendered to
        gl.bindTexture(gl.TEXTURE_2D, textures['color1']);


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
        [oldMousePosition, timer] = receiveCursorPosition(event, cursor, oldMousePosition, screenWidth, screenHeight, timer, startTime, currentProgram);
    });
}