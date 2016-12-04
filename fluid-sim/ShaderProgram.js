/**
 * @class ShaderProgram
 */
class ShaderProgram {
  /**
   * Creates an instance of ShaderProgram which is a WebGLProgram consisting of a vertex and fragment shader.
   * 
   * @param {any} gl The WebGL rendering context.
   * @param {any} vertexShaderSrc The GLSL code for vertex shader.
   * @param {any} fragmentShaderSrc The GLSL code for fragment shader.
   * @param {any} attributes Array of attribute strings.
   * @param {any} uniforms Array of uniform strings.
   * @param {any} numTextures Number of textures to create.
   * @param {any} screenImage ImageData
   * 
   * @memberOf ShaderProgram
   */
  constructor(gl, vertexShaderSrc, fragmentShaderSrc, attributes, uniforms, numTextures, screenImage, screenWidth, screenHeight) {
    // if (arguments.length !== 9) {
    //   throw new Error('ShaderProgram takes 9 arguments');
    // }
    // create a WebGL program from the shader sources
    this.gl = gl;
    this.vertexShader = this._createShader(gl, gl.VERTEX_SHADER, vertexShaderSrc);
    this.fragmentShader = this._createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);
    this.program = this._createProgram(gl, this.vertexShader, this.fragmentShader);

    this.attributes = this._getAttributeLocations(gl, this.program, attributes);
    this.uniforms = this._getUniformLocations(gl, this.program, uniforms);

    this.attributeBuffers = this._createAttributeBuffers(gl, attributes, screenWidth, screenHeight);
    console.log('this.attributeBuffers', this.attributeBuffers)
    this.textures = [];
    this.framebuffers = [];
    for (let i = 0; i < numTextures; i++) {
      const texture = this._createAndSetupTexture(gl);
      this.textures.push(texture);

      // specify 2 dimensional texture image
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, screenImage);

      // create a framebuffer...
      const fbo = gl.createFramebuffer();
      this.framebuffers.push(fbo);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      // ... and attach a texture to it
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    }
  }

  _createShader(gl, type, glslCode) {
    // creates WebGLShader
    const shader = gl.createShader(type);

    // sets source code for shader
    gl.shaderSource(shader, glslCode);

    // combines shader into binary data that can be used by a WebGLProgram
    gl.compileShader(shader);

    return shader;
  }

  _createProgram(gl, vShader, fShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      throw `Could not compile WebGL program ${info}`;
    }
    return program;
  }

  _getAttributeLocations(gl, program, attributes) {
    const locations = {};
    attributes.forEach(attrib => {
      locations[attrib] = gl.getAttribLocation(program, attrib);
    });
    return locations;
  }

  _getUniformLocations(gl, program, uniforms) {
    const locations = {};
    uniforms.forEach(uni => {
      locations[uni] = gl.getUniformLocation(program, uni);
    });
    console.log('uniforms', locations)
    return locations;
  }

  _createAttributeBuffers(gl, attributes, screenWidth, screenHeight) {
    const buffers = {};
    attributes.forEach(attribute => {
      // attributes get their data from buffers, so we need to create a buffer...
      buffers[attribute] = gl.createBuffer();
      // ...and bind it to the ARRAY_BUFFER binding point, which is for vertex attributes...
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers[attribute]);
      // ...and then add data by referencing it through the bind point
      // const positions = [
      //   0, 0,
      //   screenWidth, 0,
      //   screenWidth, screenHeight,
      //   screenWidth, screenHeight,
      //   0, screenHeight,
      //   0, 0
      // ];
      // TODO set this better
      const positions = [
        0, 0,
        screenWidth, 0,
        screenWidth, screenHeight,
        screenWidth, screenHeight,
        0, screenHeight,
        0, 0
      ];
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    })
    return buffers;
  }

  /* function for creating and setting up a texture */
  _createAndSetupTexture(gl) {
    // texture is object to which images can be bound to
    const texture = gl.createTexture();

    // bind given WebGL Texture to a binding point (target)
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // set up texture so we can render any size image and so we are working in pixels
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    return texture;
  }

  /**
   * Sets float uniforms (and booleans, which can be set as floats)
   * 
   * @param {any} uniform A string with the uniform name.
   * @param {any} values Using es6 rest parameter for the uniform values
   * 
   * @memberOf ShaderProgram
   */
  setUniform(uniform, ...values) {
    if (uniform == 'uColor') console.log(uniform, values, this.uniforms)
    if (this.uniforms[uniform] == null) {
      throw new Error(`uniform ${uniform} is not defined for this program`);
    }

    switch (typeof values[0]) {
      case 'number': 
        this.gl[`uniform${values.length}f`](this.uniforms[uniform], ...values);
        // if (Number.isInteger(values[0])) {
        //   this.gl[`uniform${values.length}i`](this.uniforms[uniform], ...values);
        // } else {
        //   this.gl[`uniform${values.length}f`](this.uniforms[uniform], ...values);
        // }
        break;
        
      // bools can be set as either floating point or integers 
      case 'boolean':
        this.gl[`uniform1f`](this.uniforms[uniform], ...values);
        break;

      default: break;
    }
  }

  /* take data from the buffer we set up above and supply it to the attribute in the shader */
  supplyAttribute(attr) {
    this.gl.enableVertexAttribArray(this.attributes[attr]);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.attributeBuffers[attr]);
    // tell the attribute how to get data out of the buffer
    const size = 2;         // 2 components per iteration
    const type = this.gl.FLOAT;  // the data is 32 bit floats
    const normalize = false;// don't normalize data
    const stride = 0;       // specify the size in bytes of the offset between the beginng of consecurtive vertex attributes
    const offset = 0;       // offset in bytes of the first component in the vertex attribute ARRAY_BUFFER

    // bind attribute to aPosBuffer, so that we're now free to bind something else to the ARRAY_BUFFER bind point. This attribute will continue to use positionBuffer.
    this.gl.vertexAttribPointer(this.attributes[attr], size, type, normalize, stride, offset);
  }
}

module.exports = ShaderProgram;