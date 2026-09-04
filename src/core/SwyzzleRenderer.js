import {
  displayFragmentShader,
  effectShaders,
  nearestNeighborEffects,
  vertexShader,
} from './shaders.js';

const EFFECTS = new Set(['basic', ...Object.keys(effectShaders)]);

function sourceSize(source) {
  const width = source.videoWidth || source.naturalWidth || source.width;
  const height = source.videoHeight || source.naturalHeight || source.height;
  if (!width || !height) {
    throw new TypeError('The capture source has no readable dimensions.');
  }
  return { width, height };
}

export class SwyzzleRenderer {
  constructor(canvas, options = {}) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new TypeError('SwyzzleRenderer requires an HTMLCanvasElement.');
    }

    this.canvas = canvas;
    this.gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });
    if (!this.gl) throw new Error('WebGL is not available.');

    this.effect = options.effect || 'swyzzle';
    if (!EFFECTS.has(this.effect)) throw new RangeError(`Unknown effect: ${this.effect}`);

    this.pointer = [0.5, 0.5];
    this.velocity = [0, 0];
    this.startedAt = performance.now();
    this.running = false;
    this.destroyed = false;
    this.source = null;
    this.sourceWidth = 0;
    this.sourceHeight = 0;
    this.frameHandle = null;
    this.lastPointer = null;

    this.programs = new Map();
    this.positionBuffer = this.createQuadBuffer();
    this.sourceTexture = this.createTexture();
    this.feedbackTextures = [this.createTexture(), this.createTexture()];
    this.framebuffers = [this.gl.createFramebuffer(), this.gl.createFramebuffer()];
    this.readIndex = 0;

    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handleResize = this.resize.bind(this);
    this.tick = this.tick.bind(this);
    window.addEventListener('pointermove', this.handlePointerMove, { passive: true });
    window.addEventListener('resize', this.handleResize, { passive: true });
    this.resize();

    if (options.autoStart !== false) this.start();
  }

  static get effects() {
    return [...EFFECTS];
  }

  createQuadBuffer() {
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([
        0, 0, 0, 0,
        1, 0, 1, 0,
        0, 1, 0, 1,
        1, 1, 1, 1,
      ]),
      this.gl.STATIC_DRAW,
    );
    return buffer;
  }

  createTexture() {
    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    return texture;
  }

  compileProgram(fragmentSource) {
    const gl = this.gl;
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(`Shader compilation failed: ${message}`);
      }
      return shader;
    };

    const vertex = compile(gl.VERTEX_SHADER, vertexShader);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Shader linking failed: ${message}`);
    }
    return program;
  }

  getProgram(name) {
    if (!this.programs.has(name)) {
      const fragment = name === 'display' ? displayFragmentShader : effectShaders[name];
      this.programs.set(name, this.compileProgram(fragment));
    }
    return this.programs.get(name);
  }

  setSource(source) {
    this.assertAlive();
    const { width, height } = sourceSize(source);
    this.source = source;
    this.sourceWidth = width;
    this.sourceHeight = height;
    this.upload(this.sourceTexture, source);
    this.seedFeedback();
    this.startedAt = performance.now();
    this.render();
    return this;
  }

  capture(source) {
    return this.setSource(source);
  }

  upload(texture, source) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  }

  seedFeedback() {
    for (const texture of this.feedbackTextures) this.upload(texture, this.source);
    this.feedbackTextures.forEach((texture, index) => {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffers[index]);
      this.gl.framebufferTexture2D(
        this.gl.FRAMEBUFFER,
        this.gl.COLOR_ATTACHMENT0,
        this.gl.TEXTURE_2D,
        texture,
        0,
      );
      if (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) !== this.gl.FRAMEBUFFER_COMPLETE) {
        throw new Error('Unable to create the WebGL feedback buffer.');
      }
    });
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.readIndex = 0;
  }

  setEffect(effect) {
    this.assertAlive();
    if (!EFFECTS.has(effect)) throw new RangeError(`Unknown effect: ${effect}`);
    this.effect = effect;
    if (this.source) this.reset();
    return this;
  }

  reset() {
    this.assertAlive();
    if (this.source) {
      this.seedFeedback();
      this.startedAt = performance.now();
      this.velocity = [0, 0];
      this.render();
    }
    return this;
  }

  start() {
    this.assertAlive();
    if (!this.running) {
      this.running = true;
      this.frameHandle = requestAnimationFrame(this.tick);
    }
    return this;
  }

  stop() {
    this.running = false;
    if (this.frameHandle !== null) cancelAnimationFrame(this.frameHandle);
    this.frameHandle = null;
    return this;
  }

  tick() {
    if (!this.running || this.destroyed) return;
    this.render();
    this.frameHandle = requestAnimationFrame(this.tick);
  }

  resize() {
    if (this.destroyed) return;
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  handlePointerMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const next = [
      Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    ];
    if (this.lastPointer) {
      this.velocity = [next[0] - this.lastPointer[0], next[1] - this.lastPointer[1]];
    }
    this.lastPointer = next;
    this.pointer = next;
  }

  bindQuad(program) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    const position = gl.getAttribLocation(program, 'aPosition');
    const texCoord = gl.getAttribLocation(program, 'aTexCoord');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(texCoord);
    gl.vertexAttribPointer(texCoord, 2, gl.FLOAT, false, 16, 8);
  }

  bindTexture(program, uniform, unit, texture, filter = this.gl.LINEAR) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.uniform1i(gl.getUniformLocation(program, uniform), unit);
  }

  draw(program, flipY) {
    const gl = this.gl;
    this.bindQuad(program);
    gl.uniform1f(gl.getUniformLocation(program, 'uFlipY'), flipY ? 1 : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  render() {
    if (!this.source || this.destroyed) return;
    const gl = this.gl;
    this.resize();

    let displayTexture = this.sourceTexture;
    if (this.effect !== 'basic') {
      const writeIndex = 1 - this.readIndex;
      const program = this.getProgram(this.effect);
      const feedbackFilter = nearestNeighborEffects.has(this.effect) ? gl.NEAREST : gl.LINEAR;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[writeIndex]);
      gl.viewport(0, 0, this.sourceWidth, this.sourceHeight);
      gl.useProgram(program);
      this.bindTexture(program, 'uImage', 0, this.sourceTexture, gl.LINEAR);
      this.bindTexture(program, 'uFeedback', 1, this.feedbackTextures[this.readIndex], feedbackFilter);
      gl.uniform1f(gl.getUniformLocation(program, 'uTime'), (performance.now() - this.startedAt) / 1000);
      gl.uniform2fv(gl.getUniformLocation(program, 'uPointer'), this.pointer);
      gl.uniform2fv(gl.getUniformLocation(program, 'uVelocity'), this.velocity);
      gl.uniform2f(gl.getUniformLocation(program, 'uResolution'), this.sourceWidth, this.sourceHeight);
      this.draw(program, false);
      this.readIndex = writeIndex;
      displayTexture = this.feedbackTextures[this.readIndex];
    }

    const display = this.getProgram('display');
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(display);
    this.bindTexture(display, 'uTexture', 0, displayTexture);
    this.draw(display, true);
    this.velocity[0] *= 0.86;
    this.velocity[1] *= 0.86;
  }

  destroy() {
    if (this.destroyed) return;
    this.stop();
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('resize', this.handleResize);
    for (const program of this.programs.values()) this.gl.deleteProgram(program);
    this.gl.deleteBuffer(this.positionBuffer);
    this.gl.deleteTexture(this.sourceTexture);
    for (const texture of this.feedbackTextures) this.gl.deleteTexture(texture);
    for (const framebuffer of this.framebuffers) this.gl.deleteFramebuffer(framebuffer);
    this.destroyed = true;
    this.source = null;
  }

  assertAlive() {
    if (this.destroyed) throw new Error('This Swyzzle renderer has been destroyed.');
  }
}
