import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/controls/PointerLockControls.js';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.18.0/dist/cannon-es.js';

// Create a scene
const scene = new THREE.Scene();

// Setting the light
const light1 = new THREE.SpotLight(0xffffff, 1);
light1.position.set(2.5, 5, 5);
light1.angle = Math.PI / 4;
light1.penumbra = 0.5;
light1.castShadow = true;
light1.shadow.mapSize.width = 1024;
light1.shadow.mapSize.height = 1024;
light1.shadow.camera.near = 0.5;
light1.shadow.camera.far = 20;
scene.add(light1);

// Setting the camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(12, 1, 5); // Positioned in front of the stairs

// Setting a renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Pointer lock controls
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

document.addEventListener('click', () => {
    controls.lock();
});

// Creating a physics world
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);

// Setting up a ground
const textureLoader = new THREE.TextureLoader();
const floorTexture = textureLoader.load('floor.png');

const groundGeo = new THREE.PlaneGeometry(40, 80);
const groundMat = new THREE.MeshBasicMaterial({
    map: floorTexture,
    side: THREE.DoubleSide
});

const groundMesh = new THREE.Mesh(groundGeo, groundMat);
groundMesh.receiveShadow = true;
groundMesh.rotation.x = -Math.PI / 2; // Rotate the plane to be horizontal
scene.add(groundMesh);

const groundPhysMat = new CANNON.Material();

const groundBody = new CANNON.Body({
    shape: new CANNON.Box(new CANNON.Vec3(20, 40, 0.1)),
    type: CANNON.Body.STATIC,
    material: groundPhysMat
});
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);

// Creating stairs
const stairTextureLoader = new THREE.TextureLoader();
const stairTexture = stairTextureLoader.load('stair.png');

const stairGeo = new THREE.PlaneGeometry(10, 2);
const stairMat = new THREE.MeshBasicMaterial({
    map: stairTexture,
    side: THREE.DoubleSide
});

const stairs = [];
const stairBoundingBoxes = [];

const initialZOffset = -15; // Adjust this value to shift the starting position

for (let i = 0; i < 15; i++) {
    const stairMesh = new THREE.Mesh(stairGeo, stairMat);
    stairMesh.receiveShadow = true;
    stairMesh.rotation.x = -Math.PI / 2; // Rotate the plane to be horizontal
    stairMesh.position.set(12, ((1 * i) + 0.5) / 2, initialZOffset - i);
    stairs.push(stairMesh);
    scene.add(stairMesh);

    // Create bounding box for each stair
    const box = new THREE.Box3().setFromObject(stairMesh);
    stairBoundingBoxes.push(box);
}

// Creating walls

const wallTextureLoader = new THREE.TextureLoader();
const wallTexture = textureLoader.load('wall.png');
const wallGeo1 = new THREE.PlaneGeometry(80, 20);
const wallGeo2 = new THREE.PlaneGeometry(40, 20);
const wallMat = new THREE.MeshBasicMaterial({ 
    map: wallTexture,
   side: THREE.DoubleSide });

const wall1 = new THREE.Mesh(wallGeo2, wallMat);
wall1.position.set(0, 5, -40);
wall1.rotation.y = Math.PI;
scene.add(wall1);

const wall2 = new THREE.Mesh(wallGeo1, wallMat);
wall2.position.set(20, 5, 0);
wall2.rotation.y = Math.PI / 2;
scene.add(wall2);

const wall3 = new THREE.Mesh(wallGeo1, wallMat);
wall3.position.set(-20, 5, 0);
wall3.rotation.y = -Math.PI / 2;
scene.add(wall3);

const wall4 = new THREE.Mesh(wallGeo2, wallMat);
wall4.position.set(0, 5, 40);
scene.add(wall4);

// Keyboard controls
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

document.addEventListener('keydown', (event) => {
    keys[event.key] = true;
});

document.addEventListener('keyup', (event) => {
    keys[event.key] = false;
});

function animate() {
    requestAnimationFrame(animate);

    // Handle keyboard controls
    const speed = 0.1;
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    let movement = false;

    if (keys.ArrowUp) {
        controls.moveForward(speed);
        movement = true;
    }
    if (keys.ArrowDown) {
        controls.moveForward(-speed);
        movement = true;
    }
    if (keys.ArrowLeft) {
        controls.moveRight(-speed);
        movement = true;
    }
    if (keys.ArrowRight) {
        controls.moveRight(speed);
        movement = true;
    }

    if (movement) {
        // Check for collisions with stairs only when there's movement
        const cameraBox = new THREE.Box3().setFromCenterAndSize(
            camera.position,
            new THREE.Vector3(0.5, 1, 0.5) // Adjust the size of the camera box for better detection
        );

        let onStair = false;

        for (const box of stairBoundingBoxes) {
            if (cameraBox.intersectsBox(box)) {
                onStair = true;

                // Calculate step height for climbing
                const stepHeight = box.max.y - box.min.y;

                // Adjust camera position to climb up the stair
                camera.position.y = Math.max(camera.position.y, box.max.y + 0.1);

                // Prevent passing through the stair
                const penetrationDepth = cameraBox.max.y - box.min.y;
                if (penetrationDepth > 0) {
                    camera.position.y += penetrationDepth;
                }

                break;
            }
        }

        if (!onStair) {
            camera.position.y = Math.max(camera.position.y - 0.1, 0.5); // Apply gravity-like effect when not on stairs
        }
    }

    // Update positions and rotations from Cannon.js to Three.js
    groundMesh.position.copy(groundBody.position);
    groundMesh.quaternion.copy(groundBody.quaternion);

    renderer.render(scene, camera);
}

animate();


window.addEventListener('resize', onWindowResize);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
