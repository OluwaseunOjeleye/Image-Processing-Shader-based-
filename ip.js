import * as THREE from 'https://cdn.skypack.dev/three@0.136.0/build/three.module.js';
import {GUI} from 'https://cdn.skypack.dev/lil-gui';

export let gui = new GUI();

function IVimageProcessing (imageProcessingMaterial, width, height){
    //3 rtt setup
    const scene = new THREE.Scene();
    const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1/Math.pow( 2, 53 ), 1);

    //4 create a target texture
    var options = {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type:THREE.FloatType, //type:THREE.UnsignedByteType,
    };
    const rtt = new THREE.WebGLRenderTarget( width, height, options);

    var geom = new THREE.BufferGeometry();
    geom.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array([-1,-1,0, 1,-1,0, 1,1,0, -1,-1, 0, 1, 1, 0, -1,1,0 ]), 3 ) );
    scene.add(new THREE.Mesh(geom, imageProcessingMaterial));

    return {height, width, scene, orthoCamera, rtt}
}

// Image and Frame Processing Function
export function process_Image(image_Texture, width, height){
    var kernel_x = new THREE.Matrix3();
	kernel_x.set(1.0, 2.0, 1.0,
				0.0, 0.0, 0.0,
				-1.0, -2.0, -1.0);
	
	var kernel_y = new THREE.Matrix3();
	kernel_y.set(-1.0, 0.0, 1.0,
				-2.0, 0.0, 2.0,
				-1.0, 0.0, 1.0);

	const imageProcessingMaterial = new THREE.RawShaderMaterial({
    	uniforms: {
    	    type: {type: 'i', value: 0},
        	image: {type: 't', value: image_Texture},
			kernel_x: {value: kernel_x},
			kernel_y: {value: kernel_y}
    	},
    	vertexShader: document.getElementById('vertShader').text,
    	fragmentShader: document.getElementById('fragShader').text,
        glslVersion: THREE.GLSL3
	});
	
	var imageProcessing = new IVimageProcessing (imageProcessingMaterial, width, height);
	
	console.log ( imageProcessing.width );
    console.log ( imageProcessing.height );

    const images = new THREE.Object3D();

	var geometry = new THREE.PlaneGeometry( 1, height/width );
	var material = new THREE.MeshBasicMaterial( { map: imageProcessing.rtt.texture, side : THREE.DoubleSide } );
	const processed_image = new THREE.Mesh( geometry, material );
    processed_image.position.x = 0.6;
	processed_image.receiveShadow = false;
	processed_image.castShadow = false;
    images.add(processed_image);

	var geometry2 = new THREE.PlaneGeometry(1, height/width );
	var material2 = new THREE.MeshBasicMaterial( { map: image_Texture, side : THREE.DoubleSide } );
	const original_image = new THREE.Mesh( geometry2, material2 );
	original_image.position.x = -0.6;
	original_image.receiveShadow = false;
	original_image.castShadow = false;
    images.add(original_image);

    gui.add(imageProcessingMaterial.uniforms.type , 'value', 0, 1, 1).name('Type');

    return {images, imageProcessing};
}
