// --- INITIAL SETUP ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();
let gameState = 'INTRO'; // INTRO, FALLING, VOID, HOUSE
let player = { speed: 0.05, sprint: 0.12, hasKey: false, parts: 0, crafted: false };
const keys = {};
const bodyParts = [];
let flashlight, flashlightTarget, grandfatherClockHand, vent, table, keyObj;

// --- AUDIO MOCKS (Replace with your .mp3 files) ---
const playSound = (file) => { console.log("Playing: " + file); }; 

// --- 1. CREATE THE SKYSCRAPER ---
const roofGeo = new THREE.BoxGeometry(20, 1, 20);
const roofMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
const roof = new THREE.Mesh(roofGeo, roofMat);
roof.position.set(0, 100, 0);
scene.add(roof);

const portalGeo = new THREE.TorusGeometry(4, 0.5, 16, 100);
const portalMat = new THREE.MeshBasicMaterial({ color: 0xaa00ff, wireframe: true });
const portal = new THREE.Mesh(portalGeo, portalMat);
portal.position.set(0, 15, -5);
portal.rotation.x = Math.PI/2;
scene.add(portal);

// --- 2. CREATE THE HAUNTED HOUSE (Massive & Textured) ---
const houseGroup = new THREE.Group();
houseGroup.position.set(500, 0, 500); // Far away from skyscraper
scene.add(houseGroup);

const loader = new THREE.TextureLoader();
const wallTex = loader.load('https://threejs.org/examples/textures/brick_diffuse.jpg');
const floorTex = loader.load('https://threejs.org/examples/textures/floors/FloorsCheckerboard_S_Diffuse.jpg');

const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, color: 0x333333 });
const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, color: 0x111111 });

// Massive Floor
const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floorMat);
floor.rotation.x = -Math.PI/2;
houseGroup.add(floor);

// Walls & Rooms
const createRoomWall = (w, h, x, z, ry = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.5), wallMat);
    m.position.set(x, h/2, z);
    m.rotation.y = ry;
    houseGroup.add(m);
};

// Perimeter
createRoomWall(60, 10, 0, -30); // North
createRoomWall(60, 10, 0, 30);  // South
createRoomWall(60, 10, -30, 0, Math.PI/2); // West
createRoomWall(60, 10, 30, 0, Math.PI/2);  // East

// Interior Dividers (Kitchen/Bed/Living)
createRoomWall(30, 10, 0, -15, Math.PI/2); 
createRoomWall(60, 10, 0, 0);

// Grandfather Clock
const clockBase = new THREE.Mesh(new THREE.BoxGeometry(2, 8, 2), new THREE.MeshStandardMaterial({color: 0x1a0a00}));
clockBase.position.set(25, 4, 25);
grandfatherClockHand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.1), new THREE.MeshBasicMaterial({color: 0xffffff}));
grandfatherClockHand.position.set(25, 6, 23.9);
houseGroup.add(clockBase, grandfatherClockHand);

// Junk Parts (Bedroom, Kitchen, Living)
const junkGeo = new THREE.DodecahedronGeometry(0.3);
const junkMat = new THREE.MeshStandardMaterial({color: 0x444444, roughness: 1});
const spawnJunk = (x, z) => {
    const j = new THREE.Mesh(junkGeo, junkMat);
    j.position.set(x, 0.5, z);
    houseGroup.add(j);
    bodyParts.push(j);
};
spawnJunk(-20, -20); // Bedroom
spawnJunk(20, -20);  // Kitchen
spawnJunk(10, 20);   // Living

// Table for casting
table = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 2), new THREE.MeshStandardMaterial({color: 0x222222}));
table.position.set(0, 1, 15);
houseGroup.add(table);

// The Key
keyObj = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.4), new THREE.MeshStandardMaterial({color: 0xffff00}));
keyObj.position.set(20, 0.2, -10);
houseGroup.add(keyObj);

// The Vent (In Bedroom)
vent = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 0.1), new THREE.MeshStandardMaterial({color: 0x000000}));
vent.position.set(-29.8, 1.5, -25);
vent.rotation.y = Math.PI/2;
houseGroup.add(vent);

// --- 3. PLAYER SYSTEMS ---
flashlight = new THREE.SpotLight(0xffffff, 2, 20, Math.PI/6, 0.5);
flashlight.castShadow = true;
scene.add(flashlight);
flashlightTarget = new THREE.Object3D();
scene.add(flashlightTarget);
flashlight.target = flashlightTarget;

camera.position.set(0, 101.7, 5); // Start on roof

// --- 4. CONTROLS ---
document.addEventListener('keydown', (e) => { keys[e.code] = true; });
document.addEventListener('keyup', (e) => { keys[e.code] = false; });
document.addEventListener('mousedown', (e) => {
    if (e.button === 0 && gameState === 'HOUSE') checkInteraction();
    if (document.pointerLockElement !== document.body) document.body.requestPointerLock();
});

document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement) {
        camera.rotation.y -= e.movementX * 0.002;
        camera.rotation.x -= e.movementY * 0.002;
        camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.rotation.x));
    }
});

// --- 5. LOGIC & ANIMATION ---
function checkInteraction() {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0,0), camera);
    
    // Pick up Junk
    bodyParts.forEach((p, i) => {
        if(camera.position.distanceTo(p.getWorldPosition(new THREE.Vector3())) < 4) {
            houseGroup.remove(p);
            bodyParts.splice(i, 1);
            player.parts++;
            document.getElementById('parts').innerText = player.parts;
        }
    });

    // Pick up Key
    if(camera.position.distanceTo(keyObj.getWorldPosition(new THREE.Vector3())) < 3) {
        houseGroup.remove(keyObj);
        player.hasKey = true;
        document.getElementById('key').innerText = "YES";
    }

    // Cast Spell at Table
    if(player.parts >= 3 && camera.position.distanceTo(table.getWorldPosition(new THREE.Vector3())) < 4) {
        player.crafted = true;
        showText("I SEE YOUUUUU........", 3000);
        playSound("i-see-you.mp3");
    }

    // Enter Vent
    if(player.hasKey && camera.position.distanceTo(vent.getWorldPosition(new THREE.Vector3())) < 3) {
        showText("YOU ESCAPED THE NIGHTMARE", 5000);
        gameState = "END";
    }
}

function showText(txt, time) {
    const el = document.getElementById('cinematic-text');
    el.innerText = txt;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, time);
}

let fallVel = 0;
let footstepTimer = 0;

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // Flashlight follows camera perfectly
    flashlight.position.copy(camera.position);
    const viewDir = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
    flashlightTarget.position.copy(camera.position).add(viewDir);

    // Clock Hand Rotation
    grandfatherClockHand.rotation.z -= delta * 1.5;

    if (gameState === 'INTRO') {
        if (camera.position.z > -8) camera.position.z -= 0.05;
        else {
            gameState = 'FALLING';
            playSound("explosion.mp3");
        }
    } 
    else if (gameState === 'FALLING') {
        fallVel += 0.005;
        camera.position.y -= fallVel;
        if (camera.position.y < 15) {
            gameState = 'VOID';
            showText("wake up....", 1500);
            setTimeout(() => showText("wake up......", 1500), 2000);
            setTimeout(() => {
                gameState = 'HOUSE';
                camera.position.set(485, 1.7, 485); // Spawn in Bedroom
                document.getElementById('hud').classList.add('visible');
                document.getElementById('obj').innerText = "Search for Key and Junk";
            }, 5000);
        }
    }
    else if (gameState === 'HOUSE') {
        const currSpeed = keys['Space'] ? player.sprint : player.speed;
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        dir.y = 0; dir.normalize();

        if (keys['KeyW']) camera.position.addScaledVector(dir, currSpeed);
        if (keys['KeyS']) camera.position.addScaledVector(dir, -currSpeed);
        
        // Footsteps
        if (keys['KeyW'] || keys['KeyS']) {
            footstepTimer -= delta;
            if (footstepTimer <= 0) {
                playSound("footstep.mp3");
                footstepTimer = keys['Space'] ? 0.3 : 0.6;
            }
        }
    }

    renderer.render(scene, camera);
}

camera.rotation.order = 'YXZ';
animate();
