// ==================== CONFIGURATION ====================
const CONFIG = {
    WALK_SPEED: 0.08,
    SPRINT_SPEED: 0.15,
    MOUSE_SENSITIVITY: 0.002,
    FLASHLIGHT_INTENSITY: 2,
    GRAVITY: 0.01,
    FALL_SPEED: 0.1,
    MASTER_VOLUME: 0.8
};

// ==================== INITIALIZATION ====================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
scene.fog = new THREE.FogExp2(0x050505, 0.002);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.rotation.order = 'YXZ';

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 1.2;

document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

// ==================== GAME STATE ====================
let gameState = 'LOADING'; // LOADING, INTRO, FALLING, VOID, HOUSE, END
let player = { 
    speed: CONFIG.WALK_SPEED, 
    hasKey: false, 
    parts: 0, 
    crafted: false,
    flashlightOn: true,
    holdingHand: false,
    canMove: false
};

const keys = {};
const interactables = [];
let bodyParts = [];
let furniture = [];

// ==================== LOADING SEQUENCE ====================
window.addEventListener('load', () => {
    console.log('Loading THE VOID...');
    
    let progress = 0;
    const loadingBar = document.getElementById('loading-bar');
    const loadingTip = document.getElementById('loading-tip');
    
    const tips = [
        'The void calls to you...',
        'Something watches from below',
        'Wake up... wake up...',
        'Find the junk parts',
        'Craft the hand',
        'I see you...',
        'The clock never stops',
        'Your flashlight is dying'
    ];
    
    const loadInterval = setInterval(() => {
        progress += Math.random() * 5;
        if (progress > 100) progress = 100;
        
        loadingBar.style.width = progress + '%';
        loadingTip.textContent = tips[Math.floor(Math.random() * tips.length)];
        
        if (progress >= 100) {
            clearInterval(loadInterval);
            setTimeout(() => {
                document.getElementById('loading-screen').style.opacity = '0';
                setTimeout(() => {
                    document.getElementById('loading-screen').style.display = 'none';
                    gameState = 'INTRO';
                    initGame();
                }, 1000);
            }, 500);
        }
    }, 100);
});

// ==================== GAME INIT ====================
function initGame() {
    console.log('Building nightmare...');
    
    // Setup lighting
    setupLighting();
    
    // Create environments
    createSkyscraper();
    createPortal();
    createHouse();
    
    // Create interactive objects
    createJunkParts();
    createKey();
    createTable();
    createVent();
    createGrandfatherClock();
    
    // Setup controls
    setupControls();
    
    // Start animation
    animate();
}

// ==================== LIGHTING ====================
function setupLighting() {
    // Ambient light
    const ambient = new THREE.AmbientLight(0x111122);
    scene.add(ambient);
    
    // Player flashlight
    window.flashlight = new THREE.SpotLight(0xffeedd, CONFIG.FLASHLIGHT_INTENSITY, 30, Math.PI/6, 0.5, 2);
    flashlight.castShadow = true;
    flashlight.shadow.mapSize.width = 1024;
    flashlight.shadow.mapSize.height = 1024;
    scene.add(flashlight);
    
    window.flashlightTarget = new THREE.Object3D();
    scene.add(flashlightTarget);
    flashlight.target = flashlightTarget;
    
    // Additional lights for atmosphere
    const pointLight1 = new THREE.PointLight(0x442222, 0.3, 50);
    pointLight1.position.set(500, 5, 500);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0x224422, 0.2, 50);
    pointLight2.position.set(450, 5, 450);
    scene.add(pointLight2);
}

// ==================== SKYSCRAPER ====================
function createSkyscraper() {
    const buildingGroup = new THREE.Group();
    
    // Main building
    const buildingGeo = new THREE.BoxGeometry(30, 200, 30);
    const buildingMat = new THREE.MeshStandardMaterial({ color: 0x223344, emissive: 0x112233 });
    const building = new THREE.Mesh(buildingGeo, buildingMat);
    building.position.y = 100;
    building.castShadow = true;
    building.receiveShadow = true;
    buildingGroup.add(building);
    
    // Windows
    const windowMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0x442200 });
    for(let y = 10; y < 200; y += 15) {
        for(let x = -10; x < 10; x += 5) {
            const windowGeo = new THREE.BoxGeometry(2, 4, 0.5);
            const windowMesh = new THREE.Mesh(windowGeo, windowMat);
            windowMesh.position.set(x, y, 15.1);
            windowMesh.castShadow = true;
            buildingGroup.add(windowMesh);
            
            const window2 = windowMesh.clone();
            window2.position.set(x, y, -15.1);
            buildingGroup.add(window2);
        }
    }
    
    // Roof
    const roofGeo = new THREE.ConeGeometry(18, 8, 8);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 204;
    roof.castShadow = true;
    buildingGroup.add(roof);
    
    // Antenna
    const antennaGeo = new THREE.CylinderGeometry(0.3, 0.3, 15);
    const antennaMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const antenna = new THREE.Mesh(antennaGeo, antennaMat);
    antenna.position.y = 215;
    antenna.castShadow = true;
    buildingGroup.add(antenna);
    
    scene.add(buildingGroup);
    
    // Roof platform (where player stands)
    const roofPlatformGeo = new THREE.BoxGeometry(20, 1, 20);
    const roofPlatformMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const roofPlatform = new THREE.Mesh(roofPlatformGeo, roofPlatformMat);
    roofPlatform.position.set(0, 200, 0);
    roofPlatform.castShadow = true;
    roofPlatform.receiveShadow = true;
    scene.add(roofPlatform);
}

// ==================== PORTAL ====================
function createPortal() {
    const portalGroup = new THREE.Group();
    
    // Outer ring
    const outerRing = new THREE.TorusGeometry(4, 0.3, 16, 32);
    const outerMat = new THREE.MeshStandardMaterial({ color: 0xaa00ff, emissive: 0x330066 });
    const outer = new THREE.Mesh(outerRing, outerMat);
    outer.rotation.x = Math.PI/2;
    portalGroup.add(outer);
    
    // Inner ring
    const innerRing = new THREE.TorusGeometry(3, 0.2, 16, 32);
    const innerMat = new THREE.MeshStandardMaterial({ color: 0xff66ff, emissive: 0x660066 });
    const inner = new THREE.Mesh(innerRing, innerMat);
    inner.rotation.x = Math.PI/2;
    inner.rotation.z = Math.PI/4;
    portalGroup.add(inner);
    
    // Particles
    const particleCount = 50;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    
    for(let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        particlePositions[i*3] = Math.cos(angle) * 3.5;
        particlePositions[i*3+1] = Math.sin(angle) * 3.5;
        particlePositions[i*3+2] = 0;
    }
    
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({ color: 0xff88ff, size: 0.1 });
    const particles = new THREE.Points(particleGeo, particleMat);
    portalGroup.add(particles);
    
    portalGroup.position.set(0, 50, -10);
    window.portal = portalGroup;
    scene.add(portalGroup);
}

// ==================== HAUNTED HOUSE ====================
function createHouse() {
    window.houseGroup = new THREE.Group();
    houseGroup.position.set(500, 0, 500);
    
    // Load textures with fallbacks
    const loader = new THREE.TextureLoader();
    const wallTex = loader.load('https://threejs.org/examples/textures/brick_diffuse.jpg');
    const floorTex = loader.load('https://threejs.org/examples/textures/floors/FloorsCheckerboard_S_Diffuse.jpg');
    
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, color: 0x888888, roughness: 0.7 });
    const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, color: 0x444444, roughness: 0.9 });
    
    // Massive Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), floorMat);
    floor.rotation.x = -Math.PI/2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    houseGroup.add(floor);
    
    // Function to create walls
    const createWall = (w, h, x, y, z, ry = 0) => {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.5), wallMat);
        wall.position.set(x, y, z);
        wall.rotation.y = ry;
        wall.castShadow = true;
        wall.receiveShadow = true;
        houseGroup.add(wall);
    };
    
    // Perimeter walls
    createWall(70, 10, 0, 5, -35); // North
    createWall(70, 10, 0, 5, 35);  // South
    createWall(70, 10, -35, 5, 0, Math.PI/2); // West
    createWall(70, 10, 35, 5, 0, Math.PI/2);  // East
    
    // Interior dividers
    createWall(30, 10, -17.5, 5, -17.5, Math.PI/2); // Bedroom divider
    createWall(30, 10, 17.5, 5, -17.5, Math.PI/2);  // Kitchen divider
    createWall(70, 10, 0, 5, 0);                     // Main hallway
    
    // Ceiling
    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(70, 0.2, 70), new THREE.MeshStandardMaterial({ color: 0x221100 }));
    ceiling.position.y = 10;
    ceiling.castShadow = true;
    ceiling.receiveShadow = true;
    houseGroup.add(ceiling);
    
    // Bedroom furniture
    createBedroom();
    
    // Kitchen furniture
    createKitchen();
    
    // Living room furniture
    createLivingRoom();
    
    scene.add(houseGroup);
}

function createBedroom() {
    // Bed
    const bedMat = new THREE.MeshStandardMaterial({ color: 0x553322 });
    const bedBase = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 2), bedMat);
    bedBase.position.set(480, 0.25, 480);
    bedBase.castShadow = true;
    bedBase.receiveShadow = true;
    houseGroup.add(bedBase);
    
    // Pillow
    const pillowMat = new THREE.MeshStandardMaterial({ color: 0x886644 });
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.5), pillowMat);
    pillow.position.set(479.5, 0.6, 480);
    pillow.castShadow = true;
    pillow.receiveShadow = true;
    houseGroup.add(pillow);
    
    // Drawer
    const drawerMat = new THREE.MeshStandardMaterial({ color: 0x442211 });
    const drawer = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 0.8), drawerMat);
    drawer.position.set(482, 0.5, 483);
    drawer.castShadow = true;
    drawer.receiveShadow = true;
    houseGroup.add(drawer);
}

function createKitchen() {
    // Counter
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const counter = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 2), counterMat);
    counter.position.set(515, 0.5, 485);
    counter.castShadow = true;
    counter.receiveShadow = true;
    houseGroup.add(counter);
    
    // Sink
    const sinkMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const sink = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 1.5), sinkMat);
    sink.position.set(515, 1.1, 485);
    sink.castShadow = true;
    houseGroup.add(sink);
    
    // Water drip particles
    for(let i = 0; i < 3; i++) {
        const dripGeo = new THREE.SphereGeometry(0.05);
        const dripMat = new THREE.MeshStandardMaterial({ color: 0x88aaff });
        const drip = new THREE.Mesh(dripGeo, dripMat);
        drip.position.set(515 + Math.random()*0.5, 1.5 + Math.random(), 485);
        houseGroup.add(drip);
    }
}

function createLivingRoom() {
    // Couch
    const couchMat = new THREE.MeshStandardMaterial({ color: 0x442211 });
    const couch = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 1.5), couchMat);
    couch.position.set(525, 0.5, 520);
    couch.castShadow = true;
    couch.receiveShadow = true;
    houseGroup.add(couch);
    
    // Chair (blocks vent)
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x664422 });
    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.8), chairMat);
    chairSeat.position.set(470, 0.25, 475);
    chairSeat.castShadow = true;
    chairSeat.receiveShadow = true;
    houseGroup.add(chairSeat);
    furniture.push(chairSeat);
    
    const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1, 0.2), chairMat);
    chairBack.position.set(470, 0.8, 475.4);
    chairBack.castShadow = true;
    houseGroup.add(chairBack);
    furniture.push(chairBack);
    
    // Desk (blocks vent)
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x553322 });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1), deskMat);
    desk.position.set(471, 0.5, 474);
    desk.castShadow = true;
    desk.receiveShadow = true;
    houseGroup.add(desk);
    furniture.push(desk);
}

// ==================== GRANDFATHER CLOCK ====================
function createGrandfatherClock() {
    const clockGroup = new THREE.Group();
    
    // Clock body
    const bodyGeo = new THREE.BoxGeometry(2, 8, 2);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a0a00 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 4;
    body.castShadow = true;
    body.receiveShadow = true;
    clockGroup.add(body);
    
    // Clock face
    const faceGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 16);
    const faceMat = new THREE.MeshStandardMaterial({ color: 0xffffaa });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.set(0, 4, 1.1);
    face.rotation.x = Math.PI/2;
    clockGroup.add(face);
    
    // Clock hand
    const handGeo = new THREE.BoxGeometry(0.1, 0.8, 0.1);
    const handMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const hand = new THREE.Mesh(handGeo, handMat);
    hand.position.set(0, 4, 1.2);
    clockGroup.add(hand);
    
    window.grandfatherClockHand = hand;
    
    clockGroup.position.set(525, 0, 525);
    scene.add(clockGroup);
}

// ==================== JUNK PARTS ====================
function createJunkParts() {
    const partPositions = [
        { x: 482, y: 0.5, z: 482, color: 0xff5555 }, // Bedroom
        { x: 515, y: 1.2, z: 485, color: 0x55ff55 }, // Kitchen
        { x: 525, y: 0.8, z: 520, color: 0x5555ff }  // Living room
    ];
    
    partPositions.forEach((pos, index) => {
        const partGroup = new THREE.Group();
        
        // Main junk piece
        const junkGeo = new THREE.DodecahedronGeometry(0.3);
        const junkMat = new THREE.MeshStandardMaterial({ color: pos.color, emissive: 0x331100 });
        const junk = new THREE.Mesh(junkGeo, junkMat);
        junk.castShadow = true;
        junk.receiveShadow = true;
        partGroup.add(junk);
        
        // Glow effect
        const glowGeo = new THREE.SphereGeometry(0.4);
        const glowMat = new THREE.MeshStandardMaterial({ 
            color: pos.color, 
            emissive: pos.color,
            transparent: true,
            opacity: 0.2
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        partGroup.add(glow);
        
        partGroup.position.set(pos.x, pos.y, pos.z);
        
        bodyParts.push({
            mesh: partGroup,
            collected: false,
            index: index
        });
        
        scene.add(partGroup);
    });
}

// ==================== KEY ====================
function createKey() {
    const keyGroup = new THREE.Group();
    
    // Key head
    const headGeo = new THREE.TorusGeometry(0.15, 0.04, 8, 16, Math.PI/2);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0x442200 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.rotation.x = Math.PI/2;
    head.rotation.z = Math.PI/2;
    keyGroup.add(head);
    
    // Key shaft
    const shaftGeo = new THREE.BoxGeometry(0.04, 0.3, 0.08);
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.set(0, 0.2, 0);
    keyGroup.add(shaft);
    
    // Key teeth
    const teethGeo = new THREE.BoxGeometry(0.08, 0.1, 0.08);
    const teethMat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
    const teeth1 = new THREE.Mesh(teethGeo, teethMat);
    teeth1.position.set(0, 0.35, 0.05);
    keyGroup.add(teeth1);
    
    const teeth2 = teeth1.clone();
    teeth2.position.set(0, 0.4, -0.05);
    keyGroup.add(teeth2);
    
    // Position in bedroom drawer
    keyGroup.position.set(482, 1.1, 483);
    keyGroup.rotation.y = Math.PI/4;
    
    window.keyObj = keyGroup;
    scene.add(keyGroup);
}

// ==================== TABLE ====================
function createTable() {
    const tableGroup = new THREE.Group();
    
    // Table top
    const topGeo = new THREE.BoxGeometry(4, 0.2, 2);
    const topMat = new THREE.MeshStandardMaterial({ color: 0x553322 });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = 1;
    top.castShadow = true;
    top.receiveShadow = true;
    tableGroup.add(top);
    
    // Table legs
    const legGeo = new THREE.BoxGeometry(0.2, 1, 0.2);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x442211 });
    
    const positions = [[-1.8, 0.5, -0.8], [1.8, 0.5, -0.8], [-1.8, 0.5, 0.8], [1.8, 0.5, 0.8]];
    positions.forEach(pos => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(pos[0], pos[1], pos[2]);
        leg.castShadow = true;
        tableGroup.add(leg);
    });
    
    tableGroup.position.set(500, 0, 515);
    window.table = tableGroup;
    scene.add(tableGroup);
}

// ==================== VENT ====================
function createVent() {
    const ventGroup = new THREE.Group();
    
    // Vent frame
    const frameGeo = new THREE.BoxGeometry(2, 2, 0.2);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(470.2, 1, 475);
    frame.castShadow = true;
    ventGroup.add(frame);
    
    // Vent slats
    const slatMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
    for(let i = 0; i < 5; i++) {
        const slatGeo = new THREE.BoxGeometry(1.8, 0.1, 0.1);
        const slat = new THREE.Mesh(slatGeo, slatMat);
        slat.position.set(470.4, 0.8 + i * 0.25, 475);
        slat.castShadow = true;
        ventGroup.add(slat);
    }
    
    window.vent = ventGroup;
    scene.add(ventGroup);
}

// ==================== COMPLETED HAND ====================
function createCompletedHand() {
    const handGroup = new THREE.Group();
    
    // Palm
    const palmGeo = new THREE.SphereGeometry(0.2, 8);
    const palmMat = new THREE.MeshStandardMaterial({ color: 0xffaa88, emissive: 0x442200 });
    const palm = new THREE.Mesh(palmGeo, palmMat);
    palm.castShadow = true;
    handGroup.add(palm);
    
    // Fingers
    const fingerGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.3);
    const fingerMat = new THREE.MeshStandardMaterial({ color: 0xffaa88 });
    
    for(let i = 0; i < 5; i++) {
        const angle = (i - 2) * 0.3;
        const finger = new THREE.Mesh(fingerGeo, fingerMat);
        finger.position.set(Math.sin(angle) * 0.2, 0.15, Math.cos(angle) * 0.2);
        finger.rotation.x = Math.PI/4;
        finger.rotation.z = angle;
        finger.castShadow = true;
        handGroup.add(finger);
        
        // Finger tip
        const tipGeo = new THREE.SphereGeometry(0.05);
        const tipMat = new THREE.MeshStandardMaterial({ color: 0xffaa88 });
        const tip = new THREE.Mesh(tipGeo, tipMat);
        tip.position.set(Math.sin(angle) * 0.35, 0.3, Math.cos(angle) * 0.35);
        tip.castShadow = true;
        handGroup.add(tip);
    }
    
    // Glow effect
    const glowGeo = new THREE.SphereGeometry(0.4);
    const glowMat = new THREE.MeshStandardMaterial({ 
        color: 0xffaa88, 
        emissive: 0x442200,
        transparent: true,
        opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    handGroup.add(glow);
    
    handGroup.position.set(500, 1.2, 515); // On table
    handGroup.visible = false;
    
    window.handObject = handGroup;
    scene.add(handGroup);
}

// ==================== AUDIO SYSTEM ====================
const audioSystem = {
    context: null,
    
    init() {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
    },
    
    playSound(type) {
        if (!this.context) this.init();
        
        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();
        
        switch(type) {
            case 'footstep':
                oscillator.frequency.value = 100 + Math.random() * 50;
                gainNode.gain.value = 0.1;
                oscillator.type = 'triangle';
                break;
            case 'explosion':
                oscillator.frequency.value = 50;
                gainNode.gain.value = 0.5;
                oscillator.type = 'sawtooth';
                break;
            case 'whisper':
                oscillator.frequency.value = 200 + Math.random() * 100;
                gainNode.gain.value = 0.1;
                oscillator.type = 'sine';
                break;
            case 'i-see-you':
                oscillator.frequency.value = 150;
                gainNode.gain.value = 0.3;
                oscillator.type = 'sawtooth';
                break;
            default:
                return;
        }
        
        oscillator.connect(gainNode);
        gainNode.connect(this.context.destination);
        
        oscillator.start();
        oscillator.stop(this.context.currentTime + 0.2);
        
        console.log(`Playing: ${type}`);
    }
};

// ==================== CONTROLS ====================
function setupControls() {
    document.addEventListener('keydown', (e) => { 
        keys[e.code] = true; 
        
        // Flashlight toggle
        if (e.code === 'KeyF' && gameState === 'HOUSE') {
            toggleFlashlight();
        }
        
        // Drop hand
        if (e.code === 'KeyR' && gameState === 'HOUSE' && player.holdingHand) {
            toggleHoldHand();
        }
    });
    
    document.addEventListener('keyup', (e) => { 
        keys[e.code] = false; 
    });
    
    document.addEventListener('mousedown', (e) => {
        if (e.button === 0 && gameState === 'HOUSE') {
            checkInteraction();
        }
        
        if (document.pointerLockElement !== document.body) {
            document.body.requestPointerLock();
        }
    });
    
    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement && player.canMove) {
            camera.rotation.y -= e.movementX * CONFIG.MOUSE_SENSITIVITY;
            camera.rotation.x -= e.movementY * CONFIG.MOUSE_SENSITIVITY;
            camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.rotation.x));
        }
    });
    
    document.addEventListener('contextmenu', (e) => e.preventDefault());
}

// ==================== FLASHLIGHT TOGGLE ====================
function toggleFlashlight() {
    player.flashlightOn = !player.flashlightOn;
    flashlight.intensity = player.flashlightOn ? CONFIG.FLASHLIGHT_INTENSITY : 0;
    document.getElementById('flashlight-status').innerHTML = player.flashlightOn ? '🔦 ON' : '🔦 OFF';
    document.getElementById('flashlight-status').style.color = player.flashlightOn ? '#ffff00' : '#666666';
}

// ==================== HAND TOGGLE ====================
function toggleHoldHand() {
    player.holdingHand = !player.holdingHand;
    audioSystem.playSound('whisper');
    
    if (player.holdingHand) {
        // Attach hand to camera
        scene.remove(handObject);
        camera.add(handObject);
        handObject.position.set(0.3, -0.2, -0.5);
        handObject.rotation.set(0, 0, 0);
        handObject.scale.set(0.5, 0.5, 0.5);
        showPrompt('Right click to move furniture');
    } else {
        // Place hand back
        camera.remove(handObject);
        scene.add(handObject);
        handObject.position.set(500, 1.2, 515);
        handObject.rotation.set(0, 0, 0);
        handObject.scale.set(1, 1, 1);
    }
}

// ==================== INTERACTION ====================
function checkInteraction() {
    if (!player.canMove) return;
    
    // Check junk parts
    bodyParts.forEach((part, index) => {
        if (!part.collected) {
            const worldPos = part.mesh.getWorldPosition(new THREE.Vector3());
            if (camera.position.distanceTo(worldPos) < 3) {
                collectJunk(part, index);
            }
        }
    });
    
    // Check key
    if (keyObj && !player.hasKey) {
        const worldPos = keyObj.getWorldPosition(new THREE.Vector3());
        if (camera.position.distanceTo(worldPos) < 3) {
            collectKey();
        }
    }
    
    // Check table for spell casting
    if (table && player.parts >= 3 && !player.crafted) {
        const worldPos = table.getWorldPosition(new THREE.Vector3());
        if (camera.position.distanceTo(worldPos) < 4) {
            castSpell();
        }
    }
    
    // Check vent
    if (vent && player.hasKey && player.crafted) {
        const worldPos = vent.getWorldPosition(new THREE.Vector3());
        if (camera.position.distanceTo(worldPos) < 3) {
            escapeVent();
        }
    }
    
    // Check furniture (if holding hand)
    if (player.holdingHand) {
        furniture.forEach(item => {
            if (camera.position.distanceTo(item.position) < 3) {
                moveFurniture(item);
            }
        });
    }
}

function collectJunk(part, index) {
    part.collected = true;
    player.parts++;
    scene.remove(part.mesh);
    
    document.getElementById('parts').innerHTML = `${player.parts}/3`;
    audioSystem.playSound('whisper');
    showPrompt(`Junk part ${index + 1} collected`);
    
    if (player.parts >= 3) {
        document.getElementById('obj').innerText = 'Go to the table';
        showPrompt('All parts collected! Return to the table');
    }
}

function collectKey() {
    player.hasKey = true;
    scene.remove(keyObj);
    
    document.getElementById('key').innerHTML = 'YES';
    audioSystem.playSound('whisper');
    showPrompt('Key acquired! Find the junk parts');
    document.getElementById('obj').innerText = 'Find 3 junk parts';
}

function castSpell() {
    player.crafted = true;
    document.getElementById('hand').innerHTML = 'YES';
    document.getElementById('obj').innerText = 'Use hand to move furniture';
    
    // Create hand
    createCompletedHand();
    handObject.visible = true;
    
    // Spell effect
    for(let i = 0; i < 20; i++) {
        setTimeout(() => {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.1),
                new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0x442200 })
            );
            particle.position.set(
                table.position.x + (Math.random() - 0.5) * 4,
                table.position.y + 1 + Math.random() * 2,
                table.position.z + (Math.random() - 0.5) * 2
            );
            scene.add(particle);
            setTimeout(() => scene.remove(particle), 1000);
        }, i * 100);
    }
    
    audioSystem.playSound('i-see-you');
    showCinematicText('I SEE YOUUUU........');
    
    // Blood flash
    document.getElementById('blood-overlay').style.opacity = '0.5';
    setTimeout(() => {
        document.getElementById('blood-overlay').style.opacity = '0';
    }, 1000);
}

function moveFurniture(item) {
    // Move furniture out of the way
    item.position.x += 2;
    item.position.z += 2;
    
    audioSystem.playSound('footstep');
    showPrompt('Furniture moved!');
}

function escapeVent() {
    player.canMove = false;
    showCinematicText('YOU ESCAPED THE NIGHTMARE');
    audioSystem.playSound('explosion');
    
    setTimeout(() => {
        gameState = 'END';
        document.getElementById('hud').classList.remove('visible');
        showCinematicText('THE END... OR IS IT?');
    }, 3000);
}

// ==================== UI HELPERS ====================
function showPrompt(text) {
    const prompt = document.getElementById('prompt');
    prompt.style.display = 'block';
    prompt.innerHTML = text;
    
    setTimeout(() => {
        prompt.style.display = 'none';
        prompt.innerHTML = 'PRESS [E] TO INTERACT';
    }, 2000);
}

function showCinematicText(text) {
    const el = document.getElementById('cinematic-text');
    el.innerHTML = text;
    el.style.display = 'block';
    
    setTimeout(() => {
        el.style.display = 'none';
    }, 3000);
}

// ==================== INTRO SEQUENCE ====================
async function playIntro() {
    gameState = 'INTRO';
    player.canMove = false;
    
    // Position on skyscraper
    camera.position.set(0, 201.7, 5);
    camera.rotation.set(0, 0, 0);
    
    showCinematicText('THE EDGE');
    await sleep(2000);
    
    // Walk to edge
    for(let i = 0; i < 50; i++) {
        camera.position.z -= 0.1;
        camera.position.y = 201.7 + Math.sin(i) * 0.05;
        await sleep(50);
    }
    
    showCinematicText('JUMP');
    await sleep(1500);
    
    // JUMP!
    gameState = 'FALLING';
    let fallVel = 0;
    
    for(let i = 0; i < 100; i++) {
        fallVel += CONFIG.GRAVITY;
        camera.position.y -= fallVel;
        camera.rotation.x += 0.01;
        camera.rotation.z += 0.005;
        
        // Portal follows
        if (portal) {
            portal.position.y = camera.position.y - 20;
            portal.rotation.y += 0.02;
            portal.rotation.x += 0.01;
        }
        
        await sleep(50);
    }
    
    // Explosion
    audioSystem.playSound('explosion');
    document.body.style.backgroundColor = 'white';
    setTimeout(() => document.body.style.backgroundColor = '', 200);
    
    // Fall through portal
    for(let i = 0; i < 30; i++) {
        camera.position.y -= 2;
        camera.rotation.y += 0.1;
        camera.rotation.x += 0.05;
        
        if (portal) {
            portal.position.y = camera.position.y - 5;
            portal.scale.set(1 + i * 0.1, 1 + i * 0.1, 1 + i * 0.1);
        }
        
        await sleep(50);
    }
    
    // VOID sequence
    gameState = 'VOID';
    portal.visible = false;
    
    for(let i = 0; i < 3; i++) {
        showCinematicText('WAKE UP' + '.'.repeat(i+1));
        await sleep(2000);
    }
    
    // Transition to house
    camera.position.set(485, 1.7, 485);
    camera.rotation.set(0, Math.PI/2, 0);
    
    document.getElementById('hud').classList.add('visible');
    document.getElementById('obj').innerText = 'Find the key';
    
    gameState = 'HOUSE';
    player.canMove = true;
    
    // Start ambient sounds
    setInterval(() => {
        if (gameState === 'HOUSE' && Math.random() < 0.1) {
            audioSystem.playSound('whisper');
        }
    }, 5000);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== UPDATE FUNCTIONS ====================
function updatePlayer() {
    if (!player.canMove || gameState !== 'HOUSE') return;
    
    const currentSpeed = keys['Space'] ? CONFIG.SPRINT_SPEED : CONFIG.WALK_SPEED;
    
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();
    
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();
    
    if (keys['KeyW']) camera.position.addScaledVector(forward, currentSpeed);
    if (keys['KeyS']) camera.position.addScaledVector(forward, -currentSpeed);
    if (keys['KeyA']) camera.position.addScaledVector(right, -currentSpeed);
    if (keys['KeyD']) camera.position.addScaledVector(right, currentSpeed);
    
    // Head bobbing
    if ((keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD'])) {
        camera.position.y = 1.7 + Math.sin(Date.now() * 0.015) * 0.02;
        
        if (Math.random() < 0.01) {
            audioSystem.playSound('footstep');
        }
    }
    
    // Keep in house bounds
    camera.position.x = Math.max(465, Math.min(535, camera.position.x));
    camera.position.z = Math.max(465, Math.min(535, camera.position.z));
}

function updateFlashlight() {
    if (!flashlight || !flashlightTarget) return;
    
    flashlight.position.copy(camera.position);
    const viewDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    flashlightTarget.position.copy(camera.position).add(viewDir);
}

function updateClock() {
    if (grandfatherClockHand) {
        grandfatherClockHand.rotation.z -= 0.01;
    }
}

function updatePortal() {
    if (portal && portal.visible) {
        portal.rotation.y += 0.01;
        portal.rotation.x += 0.005;
    }
}

function updateInteractPrompt() {
    if (!player.canMove || gameState !== 'HOUSE') return;
    
    let showPrompt = false;
    
    // Check all interactables
    bodyParts.forEach(part => {
        if (!part.collected) {
            const worldPos = part.mesh.getWorldPosition(new THREE.Vector3());
            if (camera.position.distanceTo(worldPos) < 3) showPrompt = true;
        }
    });
    
    if (keyObj && !player.hasKey) {
        const worldPos = keyObj.getWorldPosition(new THREE.Vector3());
        if (camera.position.distanceTo(worldPos) < 3) showPrompt = true;
    }
    
    if (table && player.parts >= 3 && !player.crafted) {
        const worldPos = table.getWorldPosition(new THREE.Vector3());
        if (camera.position.distanceTo(worldPos) < 4) showPrompt = true;
    }
    
    if (vent && player.hasKey && player.crafted) {
        const worldPos = vent.getWorldPosition(new THREE.Vector3());
        if (camera.position.distanceTo(worldPos) < 3) showPrompt = true;
    }
    
    if (player.holdingHand) {
        furniture.forEach(item => {
            if (camera.position.distanceTo(item.position) < 3) showPrompt = true;
        });
    }
    
    document.getElementById('prompt').style.display = showPrompt ? 'block' : 'none';
}

// ==================== MENU BUTTONS ====================
document.getElementById('playBtn')?.addEventListener('click', () => {
    document.getElementById('menuScreen').classList.add('hidden');
    playIntro();
});

// ==================== ANIMATION LOOP ====================
function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    
    if (gameState === 'HOUSE') {
        updatePlayer();
        updateInteractPrompt();
        updateFlashlight();
        updateClock();
    }
    
    updatePortal();
    
    renderer.render(scene, camera);
}

// ==================== WINDOW RESIZE ====================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ==================== START GAME ====================
// Start directly (remove menu for simplicity)
setTimeout(() => {
    if (gameState === 'LOADING') {
        gameState = 'INTRO';
        initGame();
        playIntro();
    }
}, 1000);

console.log('THE VOID - Ultimate Horror Experience Loaded');
