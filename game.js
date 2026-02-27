// ==================== CONFIG ====================
const CONFIG = {
    WALK_SPEED: 0.08,
    SPRINT_SPEED: 0.15,
    MOUSE_SENSITIVITY: 0.002,
    FLASHLIGHT_INTENSITY: 2
};

// ==================== GLOBAL ====================
console.log("Starting game...");

let scene, camera, renderer;
let gameState = 'LOADING';
let player = { 
    speed: CONFIG.WALK_SPEED, 
    hasKey: false, 
    parts: 0, 
    crafted: false,
    flashlightOn: true,
    canMove: false
};

const keys = {};
let bodyParts = [];
let furniture = [];
let portal, grandfatherClockHand, keyObj, table, vent, handObject, flashlight, flashlightTarget, houseGroup;

// ==================== AUDIO (safe) ====================
const audioSystem = {
    playSound(type) {
        console.log("Sound:", type);
        // No actual audio to avoid errors
    }
};

// ==================== INIT ====================
try {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111122); // Lighter than black
    scene.fog = new THREE.FogExp2(0x111122, 0.001);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.rotation.order = 'YXZ';

    const canvas = document.getElementById('gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    console.log("Three.js initialized");
} catch(e) {
    console.error("Init error:", e);
}

// ==================== LOADING ====================
window.addEventListener('load', () => {
    console.log('Window loaded');
    let progress = 0;
    const loadingBar = document.getElementById('loading-bar');
    const loadingTip = document.getElementById('loading-tip');
    
    const tips = ['Wake up...', 'Find the key', 'Collect parts', 'I see you'];
    
    const loadInterval = setInterval(() => {
        progress += 10;
        if (progress > 100) progress = 100;
        loadingBar.style.width = progress + '%';
        loadingTip.textContent = tips[Math.floor(Math.random() * tips.length)];
        
        if (progress >= 100) {
            clearInterval(loadInterval);
            setTimeout(() => {
                document.getElementById('loading-screen').style.opacity = '0';
                setTimeout(() => {
                    document.getElementById('loading-screen').style.display = 'none';
                    initGame();
                }, 500);
            }, 300);
        }
    }, 200);
    
    // Fallback: force hide loading after 5 seconds
    setTimeout(() => {
        if (document.getElementById('loading-screen').style.display !== 'none') {
            document.getElementById('loading-screen').style.display = 'none';
            initGame();
        }
    }, 5000);
});

// ==================== GAME INIT ====================
function initGame() {
    console.log("initGame() called");
    try {
        setupLighting();
        createSkyscraper();
        createPortal();
        createHouse();
        createJunkParts();
        createKey();
        createTable();
        createVent();
        createGrandfatherClock();
        setupControls();
        playIntro();
    } catch(e) {
        console.error("Init error:", e);
    }
}

// ==================== LIGHTING (ENHANCED) ====================
function setupLighting() {
    // Ambient light (brighter to see something)
    const ambient = new THREE.AmbientLight(0x404060); // Brighter
    scene.add(ambient);
    
    // Directional light to illuminate the scene
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);
    
    // Flashlight
    flashlight = new THREE.SpotLight(0xffeedd, CONFIG.FLASHLIGHT_INTENSITY, 30, Math.PI/6, 0.5);
    flashlight.castShadow = true;
    scene.add(flashlight);
    
    flashlightTarget = new THREE.Object3D();
    scene.add(flashlightTarget);
    flashlight.target = flashlightTarget;
}

// ==================== SKYSCRAPER (SIMPLIFIED) ====================
function createSkyscraper() {
    // Roof platform (visible)
    const platformGeo = new THREE.BoxGeometry(20, 1, 20);
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.set(0, 200, 0);
    platform.castShadow = true;
    platform.receiveShadow = true;
    scene.add(platform);
    
    // Add a simple railing or marker
    const markerGeo = new THREE.CylinderGeometry(0.5, 0.5, 2);
    const markerMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.set(0, 201, 5);
    scene.add(marker);
}

// ==================== PORTAL ====================
function createPortal() {
    const ring = new THREE.TorusGeometry(3, 0.2, 16, 32);
    const mat = new THREE.MeshStandardMaterial({ color: 0xaa00ff, emissive: 0x330066 });
    portal = new THREE.Mesh(ring, mat);
    portal.rotation.x = Math.PI/2;
    portal.position.set(0, 50, -10);
    scene.add(portal);
}

// ==================== HOUSE (simplified for visibility) ====================
function createHouse() {
    houseGroup = new THREE.Group();
    houseGroup.position.set(500, 0, 500);
    
    // Floor (bright color to see)
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x335533 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), floorMat);
    floor.rotation.x = -Math.PI/2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    houseGroup.add(floor);
    
    // Walls (bright)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x886644 });
    
    // Simple perimeter
    const addWall = (w, h, x, z) => {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 4, 0.5), wallMat);
        wall.position.set(x, 2, z);
        wall.castShadow = true;
        houseGroup.add(wall);
    };
    
    addWall(70, 4, 0, -35);
    addWall(70, 4, 0, 35);
    addWall(70, 4, -35, 0);
    addWall(70, 4, 35, 0);
    
    // Bedroom marker (red block)
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1), new THREE.MeshStandardMaterial({ color: 0xff5555 }));
    bed.position.set(480, 0.5, 480);
    houseGroup.add(bed);
    
    scene.add(houseGroup);
}

// ==================== JUNK PARTS ====================
function createJunkParts() {
    const positions = [
        { x: 482, y: 0.5, z: 482, color: 0xff5555 },
        { x: 515, y: 1.2, z: 485, color: 0x55ff55 },
        { x: 525, y: 0.8, z: 520, color: 0x5555ff }
    ];
    
    positions.forEach((pos, i) => {
        const geo = new THREE.DodecahedronGeometry(0.3);
        const mat = new THREE.MeshStandardMaterial({ color: pos.color, emissive: 0x331100 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(pos.x, pos.y, pos.z);
        mesh.castShadow = true;
        scene.add(mesh);
        bodyParts.push({ mesh, collected: false });
    });
}

// ==================== KEY ====================
function createKey() {
    const geo = new THREE.BoxGeometry(0.2, 0.1, 0.4);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
    keyObj = new THREE.Mesh(geo, mat);
    keyObj.position.set(482, 1.1, 483);
    scene.add(keyObj);
}

// ==================== TABLE ====================
function createTable() {
    const geo = new THREE.BoxGeometry(4, 0.2, 2);
    const mat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    table = new THREE.Mesh(geo, mat);
    table.position.set(500, 1, 515);
    scene.add(table);
}

// ==================== VENT ====================
function createVent() {
    const geo = new THREE.BoxGeometry(2, 2, 0.2);
    const mat = new THREE.MeshStandardMaterial({ color: 0x666666 });
    vent = new THREE.Mesh(geo, mat);
    vent.position.set(470.2, 1, 475);
    scene.add(vent);
}

// ==================== CLOCK ====================
function createGrandfatherClock() {
    const geo = new THREE.BoxGeometry(2, 8, 2);
    const mat = new THREE.MeshStandardMaterial({ color: 0x1a0a00 });
    const clock = new THREE.Mesh(geo, mat);
    clock.position.set(525, 4, 525);
    scene.add(clock);
    
    // simple hand
    const handGeo = new THREE.BoxGeometry(0.1, 0.8, 0.1);
    const handMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    grandfatherClockHand = new THREE.Mesh(handGeo, handMat);
    grandfatherClockHand.position.set(525, 4, 526);
    scene.add(grandfatherClockHand);
}

// ==================== CONTROLS ====================
function setupControls() {
    document.addEventListener('keydown', (e) => { keys[e.code] = true; });
    document.addEventListener('keyup', (e) => { keys[e.code] = false; });
    
    document.addEventListener('mousedown', (e) => {
        if (e.button === 0 && gameState === 'HOUSE' && player.canMove) {
            checkInteraction();
        }
        if (document.pointerLockElement !== document.body && player.canMove) {
            document.body.requestPointerLock();
        }
    });
    
    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement && player.canMove && gameState === 'HOUSE') {
            camera.rotation.y -= e.movementX * CONFIG.MOUSE_SENSITIVITY;
            camera.rotation.x -= e.movementY * CONFIG.MOUSE_SENSITIVITY;
            camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.rotation.x));
        }
    });
    
    document.addEventListener('contextmenu', (e) => e.preventDefault());
}

// ==================== INTRO ====================
async function playIntro() {
    console.log("Playing intro...");
    gameState = 'INTRO';
    player.canMove = false;
    
    camera.position.set(0, 202, 5); // On roof
    camera.rotation.set(0, 0, 0);
    
    showCinematicText('THE EDGE');
    await sleep(2000);
    
    // Walk
    for (let i = 0; i < 30; i++) {
        camera.position.z -= 0.1;
        await sleep(50);
    }
    
    showCinematicText('JUMP');
    await sleep(1500);
    
    // Fall
    gameState = 'FALLING';
    let vel = 0;
    for (let i = 0; i < 60; i++) {
        vel += 0.01;
        camera.position.y -= vel;
        camera.rotation.x += 0.01;
        await sleep(50);
    }
    
    // Portal
    if (portal) portal.position.y = camera.position.y - 5;
    
    for (let i = 0; i < 30; i++) {
        camera.position.y -= 1;
        camera.rotation.y += 0.1;
        await sleep(50);
    }
    
    // Void
    gameState = 'VOID';
    for (let i = 0; i < 3; i++) {
        showCinematicText('WAKE UP' + '.'.repeat(i+1));
        await sleep(1500);
    }
    
    // House
    camera.position.set(480, 1.7, 480);
    camera.rotation.set(0, 0, 0);
    
    document.getElementById('hud').classList.add('visible');
    document.getElementById('obj').innerText = 'Find the key';
    
    gameState = 'HOUSE';
    player.canMove = true;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function showCinematicText(text) {
    const el = document.getElementById('cinematic-text');
    el.innerText = text;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 1500);
}

function showPrompt(text) {
    const p = document.getElementById('prompt');
    p.innerText = text;
    p.style.display = 'block';
    setTimeout(() => { p.style.display = 'none'; }, 1500);
}

// ==================== INTERACTION ====================
function checkInteraction() {
    if (!player.canMove) return;
    
    // Junk
    bodyParts.forEach((part, i) => {
        if (!part.collected && camera.position.distanceTo(part.mesh.position) < 3) {
            scene.remove(part.mesh);
            part.collected = true;
            player.parts++;
            document.getElementById('parts').innerHTML = `${player.parts}/3`;
            showPrompt('Part collected');
        }
    });
    
    // Key
    if (keyObj && !player.hasKey && camera.position.distanceTo(keyObj.position) < 3) {
        scene.remove(keyObj);
        player.hasKey = true;
        document.getElementById('key').innerHTML = 'YES';
        showPrompt('Key found');
    }
    
    // Table (spell)
    if (table && player.parts >= 3 && !player.crafted && camera.position.distanceTo(table.position) < 4) {
        player.crafted = true;
        document.getElementById('hand').innerHTML = 'YES';
        showCinematicText('I SEE YOU...');
        // Simple hand creation
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.2), new THREE.MeshStandardMaterial({ color: 0xffaa88 }));
        hand.position.set(500, 1.2, 515);
        scene.add(hand);
        handObject = hand;
    }
    
    // Vent
    if (vent && player.hasKey && player.crafted && camera.position.distanceTo(vent.position) < 3) {
        showCinematicText('ESCAPED');
        player.canMove = false;
    }
}

// ==================== UPDATE ====================
function updatePlayer() {
    if (!player.canMove || gameState !== 'HOUSE') return;
    
    const speed = keys['Space'] ? CONFIG.SPRINT_SPEED : CONFIG.WALK_SPEED;
    const forward = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
    forward.y = 0; forward.normalize();
    const right = new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
    right.y = 0; right.normalize();
    
    if (keys['KeyW']) camera.position.addScaledVector(forward, speed);
    if (keys['KeyS']) camera.position.addScaledVector(forward, -speed);
    if (keys['KeyA']) camera.position.addScaledVector(right, -speed);
    if (keys['KeyD']) camera.position.addScaledVector(right, speed);
    
    // Keep in bounds
    camera.position.x = Math.max(465, Math.min(535, camera.position.x));
    camera.position.z = Math.max(465, Math.min(535, camera.position.z));
}

function updateFlashlight() {
    if (!flashlight) return;
    flashlight.position.copy(camera.position);
    const dir = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
    flashlightTarget.position.copy(camera.position).add(dir);
}

function updateClock() {
    if (grandfatherClockHand) grandfatherClockHand.rotation.z -= 0.01;
}

// ==================== ANIMATION LOOP ====================
function animate() {
    requestAnimationFrame(animate);
    
    if (gameState === 'HOUSE') {
        updatePlayer();
        updateFlashlight();
        updateClock();
    }
    
    renderer.render(scene, camera);
}
animate();

// ==================== RESIZE ====================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

console.log("Game script loaded");
