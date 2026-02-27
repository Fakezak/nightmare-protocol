// --- CONFIGURATION ---
const SCENE_STATE = { INTRO: 0, FALLING: 1, VOID: 2, HOUSE: 3 };
let currentState = SCENE_STATE.INTRO;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// --- LIGHTING ---
const flashlight = new THREE.SpotLight(0xffffff, 2, 30, Math.PI / 6, 0.5, 1);
flashlight.castShadow = true;
flashlight.visible = false;
scene.add(flashlight);
const flashlightTarget = new THREE.Object3D();
scene.add(flashlightTarget);
flashlight.target = flashlightTarget;

// --- ASSET GENERATION ---
const loader = new THREE.TextureLoader();
// Placeholder textures (Gritty dark patterns)
const wallTex = loader.load('https://threejs.org/examples/textures/brick_diffuse.jpg');

// 1. Skyscraper Roof
const roof = new THREE.Mesh(
    new THREE.BoxGeometry(20, 2, 20),
    new THREE.MeshStandardMaterial({ color: 0x111111 })
);
roof.position.set(0, 100, 0);
scene.add(roof);

// 2. The Magic Portal
const portal = new THREE.Mesh(
    new THREE.TorusGeometry(5, 0.5, 16, 100),
    new THREE.MeshBasicMaterial({ color: 0x6600ff, wireframe: true })
);
portal.position.set(0, 10, -5);
portal.rotation.x = Math.PI / 2;
scene.add(portal);

// 3. The House (Massive and Divided)
const house = new THREE.Group();
house.position.set(500, 0, 500); // Distance it from the sky scene
scene.add(house);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({color: 0x050505}));
floor.rotation.x = -Math.PI / 2;
house.add(floor);

// Reusable Wall Function
function createWall(w, x, z, ry = 0) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 12, 0.5), new THREE.MeshStandardMaterial({map: wallTex, color: 0x222222}));
    wall.position.set(x, 6, z);
    wall.rotation.y = ry;
    house.add(wall);
}

// Perimeter & Rooms (Kitchen, Bed, Living)
createWall(80, 0, -40); createWall(80, 0, 40); 
createWall(80, -40, 0, Math.PI/2); createWall(80, 40, 0, Math.PI/2);
createWall(40, 0, 20, Math.PI/2); // Room Divider

// Grandfather Clock
const clockCase = new THREE.Mesh(new THREE.BoxGeometry(2, 9, 2), new THREE.MeshStandardMaterial({color: 0x1a0500}));
clockCase.position.set(10, 4.5, 38);
house.add(clockCase);
const clockHand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.1), new THREE.MeshBasicMaterial({color: 0xffffff}));
clockHand.position.set(10, 7, 36.9);
house.add(clockHand);

// Items
const key = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.5), new THREE.MeshStandardMaterial({color: 0x999900}));
key.position.set(25, 0.2, -25);
house.add(key);

const junkParts = [];
function spawnJunk(x, z) {
    const junk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4), new THREE.MeshStandardMaterial({color: 0x333333}));
    junk.position.set(x, 0.4, z);
    house.add(junk);
    junkParts.push(junk);
}
spawnJunk(-20, -20); spawnJunk(15, 10); spawnJunk(0, -35);

// --- GAME LOGIC ---
let velocity = 0;
let moveSpeed = 0.08;
const keys = {};
document.addEventListener('keydown', (e) => { 
    keys[e.code] = true; 
    if(e.code === 'KeyF' && currentState === SCENE_STATE.HOUSE) flashlight.visible = !flashlight.visible;
});
document.addEventListener('keyup', (e) => keys[e.code] = false);

// Camera Rotation
document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement) {
        camera.rotation.y -= e.movementX * 0.002;
        camera.rotation.x -= e.movementY * 0.002;
        camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.rotation.x));
    }
});
document.body.onclick = () => document.body.requestPointerLock();

function showCinematicText(txt) {
    const el = document.getElementById('text-display');
    el.innerText = txt;
    el.style.opacity = 1;
    setTimeout(() => { el.style.opacity = 0; }, 2000);
}

// --- MAIN LOOP ---
function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.001;

    // 1. Intro Animation (Walking to edge)
    if (currentState === SCENE_STATE.INTRO) {
        camera.position.set(0, 101.7, 8);
        camera.lookAt(0, 101.7, -20);
        setTimeout(() => { currentState = SCENE_STATE.FALLING; }, 2000);
    }

    // 2. Falling Sequence
    if (currentState === SCENE_STATE.FALLING) {
        velocity += 0.01;
        camera.position.y -= velocity;
        portal.rotation.z += 0.1;
        
        if (camera.position.y < 12) {
            currentState = SCENE_STATE.VOID;
            document.body.style.background = "black";
            setTimeout(() => showCinematicText("wake up...."), 1000);
            setTimeout(() => showCinematicText("wake up......"), 4000);
            setTimeout(() => {
                currentState = SCENE_STATE.HOUSE;
                camera.position.set(505, 1.7, 505); // Bedroom
                document.getElementById('gui').style.visibility = 'visible';
            }, 8000);
        }
    }

    // 3. House Gameplay
    if (currentState === SCENE_STATE.HOUSE) {
        // Flashlight Logic: Follow Pitch and Yaw
        flashlight.position.copy(camera.position);
        const vector = new THREE.Vector3(0, 0, -1);
        vector.applyQuaternion(camera.quaternion);
        flashlightTarget.position.copy(camera.position).add(vector);

        // Clock Ticking
        clockHand.rotation.z = -time * 2;

        // Movement
        const speed = (keys['Space'] || keys['ShiftLeft']) ? 0.2 : 0.07;
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        dir.y = 0; dir.normalize();

        if (keys['KeyW']) camera.position.addScaledVector(dir, speed);
        if (keys['KeyS']) camera.position.addScaledVector(dir, -speed);
        
        // Footstep Audio Simulation (Print to console for now)
        if ((keys['KeyW'] || keys['KeyS']) && Math.sin(time * 10) > 0.9) {
            console.log("Step..."); // Trigger footstep.mp3 here
        }
    }

    renderer.render(scene, camera);
}

camera.rotation.order = 'YXZ';
animate();
