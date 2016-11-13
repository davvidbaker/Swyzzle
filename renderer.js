let startTime = Date.now();

// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

// inter-process communication
const ipc = require('electron').ipcRenderer


// function handleStream (stream) {
//   document.querySelector('video').src = URL.createObjectURL(stream)
// }

// function handleError (e) {
//   console.log(e)
// }

// const robot = require('robotjs');


const screenHeight = screen.availHeight;
const screenWidth = screen.availWidth;


let lastMouse = [0, 0];
let i = 0;
ipc.on('asynchronous-reply', function (event, arg) {
  const newMouse = [arg.x/screenWidth, arg.y/screenHeight];
    if (Math.sqrt(Math.pow(newMouse[0]-lastMouse[0], 2) + Math.pow(newMouse[1]-lastMouse[1], 2)) > .01) {
      // uniforms.uMouse.value = new THREE.Vector2(arg.x/screenWidth, arg.y/screenHeight);//.x = evt.clientX/width;  

      // neeed to make sure these values are being updated even if the main window isn't open which prevents window.request animation frame from being called
      timer = Date.now() - startTime;
      // uniforms.uTime.value = timer * 0.001;


      // uniforms.uOrigins.value[i%100] = new THREE.Vector3(arg.x/screenWidth, -arg.y/screenHeight + 1, uniforms.uTime.value);

      lastMouse = [arg.x/screenWidth, arg.y/screenHeight];
      i++;
  // console.log(arg)

  
    }
    ctx.fillStyle = 'rgba(165,126,210,0.1)';
    ctx.fillRect(arg.x, arg.y, 10, 10)
})




const can = document.createElement('canvas');
  document.body.appendChild(can);
  can.width = screenWidth;
  can.height = screenHeight
  can.style.position = 'fixed'
  can.style.left = 0,
  can.style.top = 0,
  can.style.zIndex = 10000;
  can.style.pointerEvents = 'none'

  const ctx = can.getContext('2d');

  ctx.globalCompositeOperation = 'xor';



function draw() {
  // ctx.fillStyle = "rgba(0,0,0,.02)";
  // ctx.fillRect(0,0,can.width, can.height);
  window.requestAnimationFrame(draw);
}
window.requestAnimationFrame(draw);





// // const canvas = document.querySelector('canvas');
// // const ctx = canvas.getContext('webgl');

// ///////////////////////////////////////////////////////////////////////////////////

// const vertShader = `


// varying vec3 vNormal;
// varying vec2 vUv;
// varying float vDisplacement;

// void main() {
//   // set the vNormal value with the attribute value passed in by Three.js
//   vNormal = normal;

//   // set the vUv value 
//   vUv = uv;

//   gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
// }`;
// ////////////////////////////////////////////////////////////////////////////////////////////
// const fragShader = `
// uniform vec2 uMouse;
// uniform float uTime;
// uniform float uDecay;
// uniform float uWavelength;
// uniform float uFrequency;
// uniform vec3 uOrigins[100];

// const float PI = 3.14159265358979;

// varying vec2 vUv;

// void main() {

//   float wavenumber = 2.0*PI/uWavelength;
//   vec2 origins[2];
//   origins[0] = vec2(0.5, 0.5);
//   origins[1] = vec2(uMouse.x,-uMouse.y + 1.0);

//   float color = 0.0;
//   for (int i = 0; i < 100; i++) {
//     vec3 v = vec3(uOrigins[i][0], uOrigins[i][1], uOrigins[i][2]);
//     float kx = wavenumber * distance(v.xy, vUv);
//     float wt = uFrequency * (uTime-v.z);
//     // non dispersive ripples
//     color += clamp(-uDecay * exp(kx-wt) * -0.1*(kx-wt), 0.0, 1.0);
// }

//   gl_FragColor = mix(vec4(color), vec4(0.5,uMouse.x,uMouse.y,1.0), 0.5);

// }


// `;


// //////////////////////////////////////////////////////////////////////////////////////////////////
// //////////////////////////////////////////////////////////////////////////////////////////////////
// ///////////
// const uniforms = {
//   resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
//   uTime: { value: 0.0 },
//   uMouse: { value: new THREE.Vector2(.1, .3)},
//   uWavelength: { value: 0.1 },
//   uFrequency: { value: 20 },
//   uOrigins: { value: [] },
//   uDecay: { value: -5.0}
// };

// for (let i = 0; i< 100; i++) {
//   uniforms.uOrigins.value.push(new THREE.Vector3(0.5,0.5, 0))
// }
// let displacement, noise;
// let timer = 0;

// let scene, camera, renderer;
// let geometry, material, cube;
// let controls;
// let width = window.innerWidth, height = window.innerHeight;
// let VIEW_ANGLE = 45, ASPECT = width / height, NEAR = 0.1, FAR = 20000;

// const startTime = Date.now();

// function init() {
//   scene = new THREE.Scene();
// 	camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR);
// 	scene.add(camera);
// 	camera.position.set(0,1,75);
//   renderer = new THREE.WebGLRenderer( {antialias:true} );
// 	renderer.setSize(width, height);
//   // document.body.appendChild(renderer.domElement);
// 	// controls = new THREE.OrbitControls( camera, renderer.domElement );
  
//   geometry = new THREE.PlaneBufferGeometry( 64, 64, 1, 1 );
//   displacement = new Float32Array( geometry.attributes.position.count );
// 	noise = new Float32Array( geometry.attributes.position.count );

//   geometry.addAttribute( 'displacement', new THREE.BufferAttribute( displacement, 1 ) );
//   material = new THREE.ShaderMaterial({
//     // transparent: true,
//     side: THREE.DoubleSide,
//     uniforms: uniforms,
//     vertexShader: vertShader,
//     fragmentShader: fragShader
//   }); 
//   cube = new THREE.Mesh(geometry, material);
//   scene.add(cube);
//   cube.position.z = 0;
//   cube.position.y = 0;
//   camera.lookAt(cube.position);



  
// };
// init();
// render();

// function render() 
// {
//   timer = Date.now() - startTime;
//   uniforms.uTime.value = timer * 0.001;
//   // uniformsuAmplitude.value = 0.1*Math.cos(0.1*time) + 0.15
  
//   for ( var i = 0; i < displacement.length; i ++ ) {
// 				displacement[ i ] = 1*Math.sin( 0.00001 * i + timer );
// 			}
  
//   // uniforms.uAmplitude.value = Math.cos(0.000001*time);
//   cube.geometry.attributes.displacement.needsUpdate = true;
  
//   // cube.rotation.y += 0.1;
//   // controls.update();
// 	renderer.render( scene, camera );
//   requestAnimationFrame( render );
// }

// // window.addEventListener('resize', () => {
// //   width = window.innerWidth;
// //   height = window.innerHeight;
// //   camera.aspect = width/height;
// //   camera.updateProjectionMatrix();
// //   uniforms.resolution.value.x = width;
// //   uniforms.resolution.value.y = height;

// //   renderer.setSize(width, height);
// // })

// // let i = 0;
// // let lastMouse = [0, 0];
// // window.addEventListener('mousemove', (evt) => {
// //   window.requestAnimationFrame(() => {
// //     let newMouse = [evt.clientX/width, evt.clientY/height];
// //     if (Math.sqrt(Math.pow(newMouse[0]-lastMouse[0], 2) + Math.pow(newMouse[1]-lastMouse[1], 2)) > .01) {
// //       uniforms.uMouse.value.x = evt.clientX/width;  
// //       uniforms.uMouse.value.y = evt.clientY/height;
// //       console.log(uniforms.uMouse.value.y);

// //       // uniforms.uOrigins.value.pop();
// //       uniforms.uOrigins.value[i%100] = new THREE.Vector3(evt.clientX/width, -evt.clientY/height + 1, uniforms.uTime.value);

// //       lastMouse = [evt.clientX/width,evt.clientY/height];
// //       i++;
// //     }
    
// //   })
// // })