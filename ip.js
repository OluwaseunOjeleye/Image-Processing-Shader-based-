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

function Gaussian_Kernel(kernel_size, sigma){
	var size = (kernel_size%2 == 0)? kernel_size/2: (kernel_size-1)/2;
	var kernel = [];
	var s = 2.0*sigma*sigma, sum = 0;
	for(var i = -size; i<=size; i++){
		for(var j = -size; j<=size; j++){
			var r = -(i*i + j*j) / s;
			var Coeff = Math.exp(r) / (Math.PI * s);
			kernel.push(Coeff);
			sum	+= Coeff;
		}
	}
	for(var i = 0; i<kernel.length; i++){
		kernel[i] /= sum;
	}
	return kernel;
}

// Image and Frame Processing Function
export function process_Image(image_Texture, image_Texture2, width, height){
	var gaussian_kernel = [];

	var laplacian_kernel = new THREE.Matrix3();
	laplacian_kernel.set(-1.0, -1.0, -1.0,
						-1.0, 8.0, -1.0,
						-1.0, -1.0, -1.0);

	var xyz_Matrix = new THREE.Matrix3();
	xyz_Matrix.set(0.4124564, 0.3575761, 0.1804375,
						0.2126729, 0.7151522, 0.0721750,
						0.0193339, 0.1191920, 0.9503041);
	
	var rgb_Matrix = new THREE.Matrix3();
	rgb_Matrix.set(3.2404542, -1.5371385, -0.4985314,
		-0.9692660, 1.8760108, 0.0415560,
		0.0556434, -0.2040259, 1.0572252);

	const imageProcessingMaterial = new THREE.RawShaderMaterial({
    	uniforms: {
			// Scaling Uniforms
			scale: {type: 'b', value: true},
			scale_factor: {type: 'i', value: 1},
			
			// Arithmetic Uniforms
			arith_type: {type: 'i', value: 0},
			arith_scale_factor: {type: 'i', value: 1},
			offset: {type: 'i', value: 0},
			image_2: {type: 't', value: image_Texture2},

			// Convolution Uniforms
			conv_type: {type: 'i', value: 0},
			kernel_size: {type: 'i', value: 3},
			sigma: {type: 'f', value: 1},

			gaussian_kernel: {type: 'fv', value: gaussian_kernel},
			laplacian_kernel: {value: laplacian_kernel},

			// Denoising Filter
			denoise_type: {type: 'i', value: 0},
			denoise_kernel_size: {type:'i', value: 3},
			percentage: {type:'i', value: 0},

			// Color Transformation
			color_type: {type: 'i', value: 0},
			xyz_Matrix: {value: xyz_Matrix},
			rgb_Matrix: {value: rgb_Matrix},
			hue:{type:'f', value: 0},

			// Input Image Uniforms
        	image: {type: 't', value: image_Texture}
    	},

		defines: {
			MAX_SIZE_GAUSSIAN: 225,
			MAX_SIZE_DENOISE: 225,
		},

    	vertexShader: document.getElementById('vertShader').text,
    	fragmentShader: document.getElementById('fragShader').text,
        glslVersion: THREE.GLSL3
	});
	
	var imageProcessing = new IVimageProcessing (imageProcessingMaterial, width*imageProcessingMaterial.uniforms.scale_factor.value, height*imageProcessingMaterial.uniforms.scale_factor.value);

	console.log (imageProcessing.width);
    console.log (imageProcessing.height);

    const images = new THREE.Object3D();

	var geometry = new THREE.PlaneGeometry(1, height/width );
	var material = new THREE.MeshBasicMaterial( { map: imageProcessing.rtt.texture, side : THREE.DoubleSide } );
	const processed_image = new THREE.Mesh( geometry, material );
	//processed_image.scale.set(imageProcessingMaterial.uniforms.scale.value, imageProcessingMaterial.uniforms.scale.value, 1);
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


	function no_scaling(){
		imageProcessingMaterial.uniforms.scale.value = false;
		imageProcessingMaterial.uniforms.scale_factor.value = 1;
		processed_image.scale.set(1, 1, 1);
		processed_image.position.z = 0;
	}
	
	// Scaling
	const scaling = gui.addFolder('Scaling');
	scaling.add(imageProcessingMaterial.uniforms.scale , 'value').name('Scale').onChange( value => {
		if(value == false){
			no_scaling();
		}
		else{
			imageProcessingMaterial.uniforms.arith_type.value 	= 0;
			imageProcessingMaterial.uniforms.conv_type.value 	= 0;
			imageProcessingMaterial.uniforms.denoise_type.value = 0;
			imageProcessingMaterial.uniforms.color_type.value	= 0;
		}
	}).listen();
	scaling.add(imageProcessingMaterial.uniforms.scale_factor, 'value', 1, 5, 1).name('Scale Factor').onChange( value => {
		if(imageProcessingMaterial.uniforms.scale.value==true){
			processed_image.scale.set(value, value, 1);
			processed_image.position.z = -0.1;
			//imageProcessing = new IVimageProcessing (imageProcessingMaterial, width*imageProcessingMaterial.uniforms.scale_factor.value, height*imageProcessingMaterial.uniforms.scale_factor.value);
		}
	}).listen();

	// Arithmetic operator
	const arith = gui.addFolder('Arithmetic');
	arith.add(imageProcessingMaterial.uniforms.arith_type , 'value', {None: 0, Addition: 1, Subtraction: 2, Multiplication: 3, Division: 4}).name('Arithmetic Type').onChange( value => {
		imageProcessingMaterial.uniforms.arith_type.value = value;

		if(value != 0){
			no_scaling();
			imageProcessingMaterial.uniforms.conv_type.value 	= 0;
			imageProcessingMaterial.uniforms.denoise_type.value = 0;
			imageProcessingMaterial.uniforms.color_type.value	= 0;
		}
	}).listen();
	arith.add(imageProcessingMaterial.uniforms.arith_scale_factor, 'value', 1, 5, 1).name('Scale Factor')
	arith.add(imageProcessingMaterial.uniforms.offset , 'value', 0, 1, 0.01).name('Offset');

	// Convolution	
	// Select convolution operator
	const conv = gui.addFolder('Convolution');
	conv.add(imageProcessingMaterial.uniforms.conv_type, 'value', {None: 0, Gaussian: 1, Laplacian: 2}).name('Convolution Type').onChange( value => {
		imageProcessingMaterial.uniforms.conv_type.value = value;

		if(value != 0){
			no_scaling();
			imageProcessingMaterial.uniforms.arith_type.value 	= 0;
			imageProcessingMaterial.uniforms.denoise_type.value = 0;
			imageProcessingMaterial.uniforms.color_type.value	= 0;

			if(value == 1){
				imageProcessingMaterial.uniforms.gaussian_kernel.value = Gaussian_Kernel(imageProcessingMaterial.uniforms.kernel_size.value, imageProcessingMaterial.uniforms.sigma.value);
			}
		}
	}).listen();

	const gaussian = conv.addFolder('Gaussian and Laplacian');
	gaussian.add(imageProcessingMaterial.uniforms.kernel_size, 'value', 1, 15, 1).name('Kernel Size').onChange(value=>{
		imageProcessingMaterial.uniforms.gaussian_kernel.value = Gaussian_Kernel(value, imageProcessingMaterial.uniforms.sigma.value);
		imageProcessingMaterial.uniforms.kernel_size.value = value;
	});
	gaussian.add(imageProcessingMaterial.uniforms.sigma, 'value', 0.01, 5, 0.1).name('Sigma').onChange(value=>{
		imageProcessingMaterial.uniforms.gaussian_kernel.value = Gaussian_Kernel(imageProcessingMaterial.uniforms.kernel_size.value, value);
	});

	// Denoising
	const denoise = gui.addFolder('Denoise');
	denoise.add(imageProcessingMaterial.uniforms.denoise_type, 'value', {None: 0, Median: 1}).name('Filter Type').onChange( value => {
		imageProcessingMaterial.uniforms.denoise_type.value = value;

		if(value != 0){
			no_scaling();
			imageProcessingMaterial.uniforms.arith_type.value = 0;
			imageProcessingMaterial.uniforms.conv_type.value  = 0;
			imageProcessingMaterial.uniforms.color_type.value = 0;
		}
	}).listen();

	const denoise_filter = denoise.addFolder('Median');
	denoise_filter.add(imageProcessingMaterial.uniforms.denoise_kernel_size, 'value', 3, 15, 1).name('Kernel Size').onChange( value => {
		var s = (value % 2 == 0)? value+1: value;
		imageProcessingMaterial.uniforms.denoise_kernel_size.value = s;	// Odd value for kernel
	});
	denoise_filter.add(imageProcessingMaterial.uniforms.percentage, 'value', 0, 100, 1).name('% of Neighbor');
	
	// Color Transformation
	const color_trans = gui.addFolder('Color Transformation');
	color_trans.add(imageProcessingMaterial.uniforms.color_type, 'value', {None: 0, XYZ: 1, Lab: 2, Hue_Shift: 3}).name('Color Type').onChange( value => {
		imageProcessingMaterial.uniforms.color_type.value = value;

		if(value != 0){
			no_scaling();
			imageProcessingMaterial.uniforms.arith_type.value 	= 0;
			imageProcessingMaterial.uniforms.conv_type.value  	= 0;
			imageProcessingMaterial.uniforms.denoise_type.value	= 0;
		}
	}).listen();

	color_trans.add(imageProcessingMaterial.uniforms.hue, 'value', 0, 360, 1).name('Hue');

    return {images, imageProcessing};
}
