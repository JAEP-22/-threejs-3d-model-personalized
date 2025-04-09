import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

const manager = new THREE.LoadingManager();
let camera, scene, renderer, stats, object, loader, mixer;
const clock = new THREE.Clock();
const animationsMap = {};
const params = { asset: 'Falling Back Death' };
const assets = [
    'Falling Back Death', 
    'Jump Push Up', 
    'Praying', 
    'Taunt', 
    'Defeated'
];

init();

function init() {
    const container = document.createElement('div');
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(100, 200, 300);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0);
    scene.fog = new THREE.Fog(0xa0a0a0, 200, 1000);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 5);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 5);
    dirLight.position.set(0, 200, 100);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2000, 2000), 
        new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false })
    );
    mesh.rotation.x = - Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const grid = new THREE.GridHelper(2000, 20, 0x000000, 0x000000);
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    scene.add(grid);

    loader = new FBXLoader(manager);
    loadAsset(params.asset);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 100, 0);
    controls.update();

    window.addEventListener('resize', onWindowResize);
    document.addEventListener('keydown', onKeyDown);

    stats = new Stats();
    container.appendChild(stats.dom);

    const gui = new GUI();
    gui.add(params, 'asset', assets).onChange(value => loadAsset(value));
}

function loadAsset(asset) {
    loader.load(`models/fbx/${asset}.fbx`, group => { // Uso de literales de cadena corregido
        console.log(`Cargando modelo: ${asset}`);

        if (object) {
            object.traverse(child => {
                if (child.material) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach(material => {
                        if (material.map) material.map.dispose();
                        material.dispose();
                    });
                }
                if (child.geometry) child.geometry.dispose();
            });
            scene.remove(object);
        }

        object = group;
        mixer = new THREE.AnimationMixer(object);
        Object.keys(animationsMap).forEach(key => delete animationsMap[key]);

        if (object.animations.length > 0) {
            console.log("⚡ Animaciones disponibles en el FBX:", object.animations.map(anim => anim.name));

            object.animations.forEach(animation => {
                animationsMap[animation.name.toLowerCase()] = mixer.clipAction(animation); // Consistencia en los nombres
            });

            const firstAnimation = Object.keys(animationsMap)[0];
            playAnimation(firstAnimation);
        } else {
            console.warn("⚠ No se encontraron animaciones en el modelo.");
        }

        scene.add(object);
    });
}

function onKeyDown(event) {
    console.log(`Tecla presionada: ${event.key}`);

    const keyMap = {
        '1': 'falling back death',
        '2': 'jump push up',
        '3': 'praying',
        '4': 'taunt',
        '5': 'defeated'
    };

    const animationName = keyMap[event.key];
    if (animationName) {
        playAnimation(animationName);
    }
}

function playAnimation(name) {
    if (!animationsMap[name]) {
        console.warn(`⚠ Animación no encontrada: ${name}`);
        return;
    }

    console.log(`🎬 Activando animación: ${name}`);

    Object.values(animationsMap).forEach(action => {
        action.stop();
        action.setEffectiveWeight(0);
    });

    const currentAction = animationsMap[name];
    currentAction.reset();
    currentAction.play();
    currentAction.setEffectiveWeight(1);
    currentAction.fadeIn(0.5);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    const delta = clock.getDelta();
    if (mixer) {
        mixer.update(delta);
    }
    renderer.render(scene, camera);
    stats.update();
}