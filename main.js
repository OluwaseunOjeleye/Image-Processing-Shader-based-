import * as THREE from 'https://cdn.skypack.dev/three@0.136.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/controls/OrbitControls.js';
import { WEBGL } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/WebGL.js';
import {gui, process_Image} from './ip.js';

// Declaring objects within the scene
var camera, controls, scene, renderer;

// Image and Video Textures
var image_Texture, imageProcessing, video;

init();
animate();

// Loaded Image or Frames Processing Function
function image_Processing(width, height){
	image_Texture.minFilter = THREE.NearestFilter;
	image_Texture.magFilter = THREE.NearestFilter;
	image_Texture.generateMipmaps = false; 
	image_Texture.format = THREE.RGBFormat;

	var images;
    const result = process_Image(image_Texture, width, height);
    scene.add(result.images);
    imageProcessing = result.imageProcessing;
}

// Video and Webcam Processing Function
function video_Processing(){
    image_Texture = new THREE.VideoTexture(video);      // Loading textures/frames in video or webcam
    image_Processing(video.videoWidth, video.videoHeight);  // processing frames

    var pausePlayObj = {
    	pausePlay: function (){
			if (!video.paused){
				console.log ( "pause" );
				video.pause();
			}
			else{
				console.log ( "play" );
				video.play();
			}
		},
		add10sec: function (){
			video.currentTime = video.currentTime + 10;
			console.log (video.currentTime);
		}
	};

    gui.add(pausePlayObj,'pausePlay').name ('Pause/play video');
    gui.add(pausePlayObj,'add10sec').name ('Add 10 seconds');

	video.play();
}

// Loading and Processing Image
function load_Image(){
    image_Texture = new THREE.TextureLoader().load('im0.png', function (tex) {
        image_Processing(tex.image.width, tex.image.height);
    });
}

// Loading and Processing Video Frames
function load_Video(){
    video = document.createElement('video');
    video.src = 'video.mp4';
    video.load();
    video.muted = true;
    video.loop = true;
    video.onloadeddata = video_Processing;
}

// Loading and Processing Webcam Frames
function open_Webcam(){
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia ) {
        const constraints = { video: { width: 1920, height: 1080, facingMode: 'user' } };
        navigator.mediaDevices.getUserMedia( constraints ).then( function ( stream ){
            video = document.createElement('video');
            video.srcObject = stream;
            video.onloadeddata = video_Processing;
        });
    }
}

// Initialization Function
function init () {
    if ( WEBGL.isWebGL2Available() === false ) {
		document.body.appendChild( WEBGL.getWebGL2ErrorMessage() );
	}
    const container = document.createElement( 'div' );
	document.body.appendChild( container );
	
    const canvas = document.createElement( 'canvas' );
	const context = canvas.getContext( 'webgl2' );
	document.body.appendChild( canvas );

	scene = new THREE.Scene(); 

	renderer = new THREE.WebGLRenderer( {  canvas: canvas, context: context});
    renderer.autoClear = false;
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.shadowMap.enabled = false;

	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.001, 10 );
	camera.position.z = 0.7;
	controls = new OrbitControls( camera, renderer.domElement );
	controls.minDistance = 0.005;
	controls.maxDistance = 1.0;
	controls.enableRotate = true;
	controls.addEventListener( 'change', render );
	controls.update();


    var url = new URL(window.location);
    var sourcetype = url.searchParams.get("sourceimage");
    
    if(sourcetype == "image")   load_Image();
    else if(sourcetype == "video")  load_Video();
    else if(sourcetype == "webcam") open_Webcam();
    else{
        const source = {type: 0}; load_Image();
        gui.add(source, 'type', { Image: 0, Video: 1, Webcam: 2 }).name('Source Type').onChange(type => {
            if(type == 1) window.location.href += "?sourceimage=video";
            else          window.location.href += "?sourceimage=webcam";
        });
    }
	window.addEventListener( 'resize', onWindowResize, false );
}

// Rendering Function
function render () {
	renderer.clear();
	
	if (typeof imageProcessing !== 'undefined'){
        renderer.setRenderTarget( imageProcessing.rtt );
	    renderer.render ( imageProcessing.scene, imageProcessing.orthoCamera ); 	
	    renderer.setRenderTarget( null );
    }
	renderer.render( scene, camera );
}

function animate() {	
	requestAnimationFrame(animate);
	controls.update();
	render();
}

function onWindowResize () {
	camera.aspect = ( window.innerWidth / window.innerHeight);
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
	render();
}
