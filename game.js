// ==================== CONFIGURATION ====================
const CONFIG = {
    WALKING_SPEED: 1.8, // Realistic human speed
    SPRINT_SPEED: 3.5,
    MOUSE_SENSITIVITY: 0.002,
    FOV: 75,
    AMBIENT_VOLUME: 0.3,
    MASTER_VOLUME: 0.8,
    GRAVITY: 9.8,
    FALL_SPEED: 0.1
};

// ==================== GAME STATE ====================
let scene, camera, renderer;
let gameState = 'loading'; // loading, menu, intro, falling, portal, gameplay, gameover
let clock = new THREE.Clock();
let mixer = null;

// Player
let player = {
    position: new THREE.Vector3(0, 1.7, 0),
    rotation: { x: 0, y: 0 },
    velocity: new THREE.Vector3(0, 0, 0),
    health: 100,
    hasKey: false,
    canMove: false,
    inCutscene: true,
    flashlightOn: true,
    inventory: [false, false, false, false], // 4 hand parts
    hasHand: false,
    holdingHand: false,
    sprinting: false
};

// Controls
let keys = { w: false, a: false, s: false, d: false, shift: false, e: false, f: false, space: false };
let mouseX = 0, mouseY = 0;
let mouseButtons = { left: false, right: false };

// World objects
let flashlight, directionalLight;
let keyObject, vent, table, handObject;
let handParts = [];
let furniture = [];
let particles = [];
let portalEffect;

// Timers
let whisperTimer = 0;
let dripTimer = 0;
let iSeeYouTimer = 0;

// ==================== AUDIO SYSTEM ====================
const audioSystem = {
    context: null,
    sounds: {},
    
    init() {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
    },
    
    async loadSound(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
            this.sounds[name] = audioBuffer;
            console.log(`Loaded sound: ${name}`);
        } catch(e) {
            console.log(`Failed to load sound ${name}:`, e);
            this.createFallbackSound(name);
        }
    },
    
    createFallbackSound(name) {
        const duration = 3;
        const sampleRate = 44100;
        const buffer = this.context.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);
        
        switch(name) {
            case 'ambient':
                for(let i = 0; i < buffer.length; i++) {
                    data[i] = Math.random() * 0.1 * Math.sin(i * 0.01) * Math.sin(i * 0.001);
                }
                break;
            case 'i-see-you':
                for(let i = 0; i < buffer.length; i++) {
                    data[i] = Math.random() * 0.3 * Math.sin(i * 0.02) * (i < 10000 ? 1 : Math.exp(-(i-10000)/10000));
                }
                break;
            case 'water-drip':
                for(let i = 0; i < buffer.length; i+=1000) {
                    if(Math.random() < 0.1) {
                        for(let j = 0; j < 100; j++) {
                            if(i+j < buffer.length) data[i+j] = Math.random() * 0.2;
                        }
                    }
                }
                break;
            default:
                for(let i = 0; i < buffer.length; i++) {
                    data[i] = Math.random() * 0.1;
                }
        }
        
        this.sounds[name] = buffer;
    },
    
    playSound(name, loop = false, volume = 1.0) {
        if (!this.context || this.context.state === 'suspended') {
            this.context.resume();
        }
        
        const buffer = this.sounds[name];
        if (!buffer) return null;
        
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        
        const gainNode = this.context.createGain();
        gainNode.gain.value = volume * CONFIG.MASTER_VOLUME;
        
        source.connect(gainNode);
        gainNode.connect(this.context.destination);
        
        source.loop = loop;
        source.start();
        
        return source;
    }
};

// ==================== LOADING SEQUENCE ====================
window.addEventListener('load', async () => {
    console.log('Starting nightmare...');
    
    audioSystem.init();
    
    // Load all sounds
    await audioSystem.loadSound('ambient', 'assets/sounds/ambient.mp3');
    await audioSystem.loadSound('explosion', 'assets/sounds/explosion.mp3');
    await audioSystem.loadSound('heartbeat', 'assets/sounds/heartbeat.mp3');
    await audioSystem.loadSound('i-see-you', 'assets/sounds/i-see-you.mp3');
    await audioSystem.loadSound('whisper', 'assets/sounds/whisper.mp3');
    await audioSystem.loadSound('wake-up', 'assets/sounds/wake-up.mp3');
    await audioSystem.loadSound('footsteps', 'assets/sounds/footsteps.mp3');
    await audioSystem.loadSound('water-drip', 'assets/sounds/water-drip.mp3');
    await audioSystem.loadSound('spell-cast', 'assets/sounds/spell-cast.mp3');
    await audioSystem.loadSound('hand-move', 'assets/sounds/hand-move.mp3');
    await audioSystem.loadSound('portal', 'assets/sounds/portal.mp3');
    await audioSystem.loadSound('wind', 'assets/sounds/wind.mp3');
    
    // Loading animation
    const loadingBar = document.getElementById('loadingBar');
    const loadingTip = document.getElementById('loadingTip');
    
    const tips = [
        'The building awaits...',
        'Something watches from below',
        'The portal calls to you',
        'Wake up... wake up...',
        'Find the hand parts',
        'Cast the spell',
        'The hand will guide you',
        'I see you...'
    ];
    
    let progress = 0;
    const loadInterval = setInterval(() => {
        progress += Math.random() * 5;
        if (progress > 100) progress = 100;
        
        loadingBar.style.width = progress + '%';
        loadingTip.textContent = tips[Math.floor(Math.random() * tips.length)];
        
        if (progress >= 100) {
            clearInterval(loadInterval);
            setTimeout(() => {
                document.getElementById('loadingScreen').classList.add('hidden');
                document.getElementById('menuScreen').classList.remove('hidden');
                gameState = 'menu';
                initGame();
            }, 500);
        }
    }, 100);
});

// ==================== GAME INIT ====================
function initGame() {
    console.log('Building nightmare world...');
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.FogExp2(0x050505, 0.02);
    
    camera = new THREE.PerspectiveCamera(CONFIG.FOV, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.copy(player.position);
    
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.2;
    
    setupLighting();
    
    // Create all environments
    createSkyscraper();     // Intro scene
    createPortalEffect();   // Portal for falling
    createHouse();          // Main gameplay area
    
    // Create interactive objects
    createKey();
    createVent();
    createTable();
    createHandParts();
    
    setupControls();
    
    animate();
    
    console.log('Nightmare initialized!');
}

// ==================== LIGHTING ====================
function setupLighting() {
    const ambient = new THREE.AmbientLight(0x222233);
    scene.add(ambient);
    
    // Flashlight (player controlled)
    flashlight = new THREE.SpotLight(0xffeedd, 2, 20, Math.PI/6, 0.5, 2);
    flashlight.castShadow = true;
    flashlight.shadow.mapSize.width = 1024;
    flashlight.shadow.mapSize.height = 1024;
    camera.add(flashlight);
    
    // Directional light for skyscraper
    directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    scene.add(camera);
}

// ==================== SKYSCRAPER (INTRO) ====================
function createSkyscraper() {
    const buildingGroup = new THREE.Group();
    
    // Main building
    const buildingGeo = new THREE.BoxGeometry(20, 100, 20);
    const buildingMat = new THREE.MeshStandardMaterial({ color: 0x334455, emissive: 0x112233 });
    const building = new THREE.Mesh(buildingGeo, buildingMat);
    building.position.y = 50;
    building.castShadow = true;
    building.receiveShadow = true;
    buildingGroup.add(building);
    
    // Windows
    const windowMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0x442200 });
    for(let y = 5; y < 100; y += 10) {
        for(let x = -8; x < 8; x += 4) {
            const windowGeo = new THREE.BoxGeometry(1, 2, 0.5);
            const windowMesh = new THREE.Mesh(windowGeo, windowMat);
            windowMesh.position.set(x, y, 10.1);
            windowMesh.castShadow = true;
            buildingGroup.add(windowMesh);
            
            const window2 = windowMesh.clone();
            window2.position.set(x, y, -10.1);
            buildingGroup.add(window2);
        }
    }
    
    // Roof
    const roofGeo = new THREE.ConeGeometry(12, 5, 8);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 102.5;
    roof.castShadow = true;
    buildingGroup.add(roof);
    
    // Antenna
    const antennaGeo = new THREE.CylinderGeometry(0.2, 0.2, 10);
    const antennaMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const antenna = new THREE.Mesh(antennaGeo, antennaMat);
    antenna.position.y = 110;
    antenna.castShadow = true;
    buildingGroup.add(antenna);
    
    buildingGroup.position.set(0, 0, -50);
    scene.add(buildingGroup);
}

// ==================== PORTAL EFFECT ====================
function createPortalEffect() {
    const portalGroup = new THREE.Group();
    
    // Outer ring
    const ringGeo = new THREE.TorusGeometry(3, 0.2, 16, 32);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x4466ff, emissive: 0x1122aa });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    portalGroup.add(ring);
    
    // Inner ring
    const innerRingGeo = new THREE.TorusGeometry(2, 0.1, 16, 32);
    const innerRingMat = new THREE.MeshStandardMaterial({ color: 0x88aaff, emissive: 0x2244aa });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.rotation.x = Math.PI / 2;
    innerRing.rotation.z = Math.PI / 4;
    portalGroup.add(innerRing);
    
    // Particles
    const particleCount = 50;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    
    for(let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        particlePositions[i*3] = Math.cos(angle) * 2.5;
        particlePositions[i*3+1] = Math.sin(angle) * 2.5;
        particlePositions[i*3+2] = 0;
    }
    
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({ color: 0x88aaff, size: 0.1 });
    const particles = new THREE.Points(particleGeo, particleMat);
    portalGroup.add(particles);
    
    portalGroup.position.set(0, -100, -20); // Start below
    portalEffect = portalGroup;
    scene.add(portalGroup);
}

// ==================== HOUSE (MAIN AREA) ====================
function createHouse() {
    const houseGroup = new THREE.Group();
    houseGroup.position.set(0, 0, 0);
    
    // Floor
    const floorGeo = new THREE.BoxGeometry(20, 0.2, 20);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x332211 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.1;
    floor.receiveShadow = true;
    floor.castShadow = true;
    houseGroup.add(floor);
    
    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a });
    
    // Back wall
    const backWall = new THREE.BoxGeometry(20, 4, 0.3);
    const back = new THREE.Mesh(backWall, wallMat);
    back.position.set(0, 2, -10);
    back.castShadow = true;
    back.receiveShadow = true;
    houseGroup.add(back);
    
    // Front wall (with door)
    const frontLeft = new THREE.BoxGeometry(8, 4, 0.3);
    const frontL = new THREE.Mesh(frontLeft, wallMat);
    frontL.position.set(-6, 2, 10);
    frontL.castShadow = true;
    frontL.receiveShadow = true;
    houseGroup.add(frontL);
    
    const frontRight = new THREE.BoxGeometry(8, 4, 0.3);
    const frontR = new THREE.Mesh(frontRight, wallMat);
    frontR.position.set(6, 2, 10);
    frontR.castShadow = true;
    frontR.receiveShadow = true;
    houseGroup.add(frontR);
    
    // Left wall
    const leftWall = new THREE.BoxGeometry(0.3, 4, 20);
    const left = new THREE.Mesh(leftWall, wallMat);
    left.position.set(-10, 2, 0);
    left.castShadow = true;
    left.receiveShadow = true;
    houseGroup.add(left);
    
    // Right wall
    const rightWall = new THREE.BoxGeometry(0.3, 4, 20);
    const right = new THREE.Mesh(rightWall, wallMat);
    right.position.set(10, 2, 0);
    right.castShadow = true;
    right.receiveShadow = true;
    houseGroup.add(right);
    
    // Ceiling
    const ceilingGeo = new THREE.BoxGeometry(20, 0.2, 20);
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x221100 });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.position.y = 4;
    ceiling.castShadow = true;
    ceiling.receiveShadow = true;
    houseGroup.add(ceiling);
    
    // Room dividers
    createRooms(houseGroup);
    
    scene.add(houseGroup);
}

function createRooms(group) {
    // Bedroom (back left)
    const bedroomWall = new THREE.BoxGeometry(0.3, 4, 10);
    const bedroomWallMesh = new THREE.Mesh(bedroomWall, new THREE.MeshStandardMaterial({ color: 0x4a3a2a }));
    bedroomWallMesh.position.set(-5, 2, -5);
    bedroomWallMesh.castShadow = true;
    bedroomWallMesh.receiveShadow = true;
    group.add(bedroomWallMesh);
    
    // Bedroom furniture
    // Bed
    const bedMat = new THREE.MeshStandardMaterial({ color: 0x553322 });
    const bedBase = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 2), bedMat);
    bedBase.position.set(-7, 0.25, -7);
    bedBase.castShadow = true;
    bedBase.receiveShadow = true;
    group.add(bedBase);
    
    // Pillow
    const pillowMat = new THREE.MeshStandardMaterial({ color: 0x886644 });
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.5), pillowMat);
    pillow.position.set(-7.5, 0.6, -7);
    pillow.castShadow = true;
    pillow.receiveShadow = true;
    group.add(pillow);
    
    // Kitchen (front left)
    const kitchenCounter = new THREE.BoxGeometry(3, 1, 2);
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const counter = new THREE.Mesh(kitchenCounter, counterMat);
    counter.position.set(-7, 0.5, 5);
    counter.castShadow = true;
    counter.receiveShadow = true;
    group.add(counter);
    
    // Sink
    const sinkGeo = new THREE.BoxGeometry(1, 0.3, 1);
    const sinkMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const sink = new THREE.Mesh(sinkGeo, sinkMat);
    sink.position.set(-7, 1.1, 5);
    sink.castShadow = true;
    group.add(sink);
    
    // Water drip effect
    const dripParticles = [];
    for(let i = 0; i < 5; i++) {
        const dripGeo = new THREE.SphereGeometry(0.05, 4);
        const dripMat = new THREE.MeshStandardMaterial({ color: 0x88aaff });
        const drip = new THREE.Mesh(dripGeo, dripMat);
        drip.position.set(-7 + Math.random()*0.5, 1.5 + Math.random(), 5);
        drip.visible = false;
        group.add(drip);
        dripParticles.push(drip);
    }
    
    // Living room (right side)
    // Couch
    const couchMat = new THREE.MeshStandardMaterial({ color: 0x442211 });
    const couchBase = new THREE.Mesh(new THREE.BoxGeometry(3, 0.8, 1.5), couchMat);
    couchBase.position.set(6, 0.4, -5);
    couchBase.castShadow = true;
    couchBase.receiveShadow = true;
    group.add(couchBase);
    
    // Chair (blocks vent)
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x664422 });
    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.8), chairMat);
    chairSeat.position.set(8, 0.25, 7);
    chairSeat.castShadow = true;
    chairSeat.receiveShadow = true;
    group.add(chairSeat);
    furniture.push(chairSeat);
    
    const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1, 0.2), chairMat);
    chairBack.position.set(8, 0.8, 7.4);
    chairBack.castShadow = true;
    group.add(chairBack);
    furniture.push(chairBack);
    
    // Desk (blocks vent)
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x553322 });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1), deskMat);
    desk.position.set(7, 0.5, 8);
    desk.castShadow = true;
    desk.receiveShadow = true;
    group.add(desk);
    furniture.push(desk);
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
    keyGroup.position.set(-7, 0.8, -6);
    keyGroup.rotation.y = Math.PI/4;
    
    keyObject = keyGroup;
    scene.add(keyObject);
}

// ==================== VENT ====================
function createVent() {
    const ventGroup = new THREE.Group();
    
    // Vent frame
    const frameGeo = new THREE.BoxGeometry(1.5, 1.5, 0.2);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(8, 0.5, 9.5);
    frame.castShadow = true;
    ventGroup.add(frame);
    
    // Vent slats
    const slatMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
    for(let i = 0; i < 5; i++) {
        const slatGeo = new THREE.BoxGeometry(1.3, 0.1, 0.1);
        const slat = new THREE.Mesh(slatGeo, slatMat);
        slat.position.set(8, 0.4 + i * 0.25, 9.6);
        slat.castShadow = true;
        ventGroup.add(slat);
    }
    
    vent = ventGroup;
    scene.add(vent);
}

// ==================== TABLE FOR SPELL ====================
function createTable() {
    const tableGroup = new THREE.Group();
    
    // Table top
    const topGeo = new THREE.BoxGeometry(2.5, 0.1, 1.5);
    const topMat = new THREE.MeshStandardMaterial({ color: 0x553322 });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.set(0, 1, 3);
    top.castShadow = true;
    top.receiveShadow = true;
    tableGroup.add(top);
    
    // Table legs
    const legGeo = new THREE.BoxGeometry(0.1, 1, 0.1);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x442211 });
    
    const positions = [[-1, 0.5, 2.5], [1, 0.5, 2.5], [-1, 0.5, 3.5], [1, 0.5, 3.5]];
    positions.forEach(pos => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(pos[0], pos[1], pos[2]);
        leg.castShadow = true;
        tableGroup.add(leg);
    });
    
    table = tableGroup;
    scene.add(table);
}

// ==================== HAND PARTS ====================
function createHandParts() {
    const partPositions = [
        { x: -7, y: 1.2, z: -6, color: 0xff5555 }, // Bedroom
        { x: -7, y: 1.5, z: 5, color: 0x55ff55 },  // Kitchen
        { x: 6, y: 1, z: -5, color: 0x5555ff },    // Living room
        { x: -5, y: 0.8, z: 0, color: 0xffff55 }   // Hallway
    ];
    
    partPositions.forEach((pos, index) => {
        const partGroup = new THREE.Group();
        
        // Main part (bone shape)
        const boneGeo = new THREE.CylinderGeometry(0.1, 0.15, 0.4);
        const boneMat = new THREE.MeshStandardMaterial({ color: pos.color, emissive: 0x331100 });
        const bone = new THREE.Mesh(boneGeo, boneMat);
        bone.rotation.z = Math.PI/4;
        bone.rotation.x = Math.PI/4;
        bone.castShadow = true;
        partGroup.add(bone);
        
        // Joint
        const jointGeo = new THREE.SphereGeometry(0.12);
        const jointMat = new THREE.MeshStandardMaterial({ color: pos.color });
        const joint = new THREE.Mesh(jointGeo, jointMat);
        joint.position.set(0.1, 0.1, 0.1);
        joint.castShadow = true;
        partGroup.add(joint);
        
        // Glow
        const glowGeo = new THREE.SphereGeometry(0.2);
        const glowMat = new THREE.MeshStandardMaterial({ 
            color: pos.color, 
            emissive: pos.color,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        partGroup.add(glow);
        
        partGroup.position.set(pos.x, pos.y, pos.z);
        
        handParts.push({
            mesh: partGroup,
            collected: false,
            index: index
        });
        
        scene.add(partGroup);
    });
}

// ==================== COMPLETED HAND ====================
function createCompletedHand() {
    const handGroup = new THREE.Group();
    
    // Palm
    const palmGeo = new THREE.SphereGeometry(0.2, 8);
    const palmMat = new THREE.MeshStandardMaterial({ color: 0xffaa88, emissive: 0x442200 });
    const palm = new THREE.Mesh(palmGeo, palmMat);
    palm.position.set(0, 0, 0);
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
    
    handGroup.position.set(0, 1.1, 3); // On table
    handGroup.visible = false;
    
    handObject = handGroup;
    scene.add(handGroup);
}

// ==================== CONTROLS ====================
function setupControls() {
    // Mouse look
    document.addEventListener('mousemove', (e) => {
        if (gameState === 'gameplay' && document.pointerLockElement && player.canMove) {
            mouseX -= e.movementX * CONFIG.MOUSE_SENSITIVITY;
            mouseY -= e.movementY * CONFIG.MOUSE_SENSITIVITY;
            mouseY = Math.max(-Math.PI/2, Math.min(Math.PI/2, mouseY));
            
            camera.rotation.order = 'YXZ';
            camera.rotation.y = mouseX;
            camera.rotation.x = mouseY;
        }
    });
    
    // Mouse buttons
    document.addEventListener('mousedown', (e) => {
        if (e.button === 0) mouseButtons.left = true;
        if (e.button === 2) mouseButtons.right = true;
        
        if (gameState === 'gameplay' && player.hasHand && mouseButtons.right) {
            toggleHoldingHand();
        }
    });
    
    document.addEventListener('mouseup', (e) => {
        if (e.button === 0) mouseButtons.left = false;
        if (e.button === 2) mouseButtons.right = false;
    });
    
    // Keyboard down
    document.addEventListener('keydown', (e) => {
        if (gameState !== 'gameplay') return;
        
        switch(e.code) {
            case 'KeyW': keys.w = true; e.preventDefault(); break;
            case 'KeyA': keys.a = true; e.preventDefault(); break;
            case 'KeyS': keys.s = true; e.preventDefault(); break;
            case 'KeyD': keys.d = true; e.preventDefault(); break;
            case 'ShiftLeft': 
                keys.shift = true;
                player.sprinting = true;
                e.preventDefault();
                break;
            case 'Space':
                keys.space = true;
                e.preventDefault();
                break;
            case 'KeyE': 
                keys.e = true;
                checkInteraction();
                e.preventDefault();
                break;
            case 'KeyF':
                keys.f = true;
                toggleFlashlight();
                e.preventDefault();
                break;
        }
    });
    
    // Keyboard up
    document.addEventListener('keyup', (e) => {
        switch(e.code) {
            case 'KeyW': keys.w = false; e.preventDefault(); break;
            case 'KeyA': keys.a = false; e.preventDefault(); break;
            case 'KeyS': keys.s = false; e.preventDefault(); break;
            case 'KeyD': keys.d = false; e.preventDefault(); break;
            case 'ShiftLeft': 
                keys.shift = false;
                player.sprinting = false;
                e.preventDefault();
                break;
            case 'Space': keys.space = false; e.preventDefault(); break;
            case 'KeyE': keys.e = false; e.preventDefault(); break;
            case 'KeyF': keys.f = false; e.preventDefault(); break;
        }
    });
    
    // Right click prevent context menu
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Pointer lock
    renderer.domElement.addEventListener('click', () => {
        if (gameState === 'gameplay' && player.canMove) {
            renderer.domElement.requestPointerLock();
        }
    });
}

// ==================== FLASHLIGHT TOGGLE ====================
function toggleFlashlight() {
    player.flashlightOn = !player.flashlightOn;
    flashlight.intensity = player.flashlightOn ? 2 : 0;
    document.getElementById('flashlightIndicator').textContent = player.flashlightOn ? '🔦 ON' : '🔦 OFF';
    document.getElementById('flashlightIndicator').style.color = player.flashlightOn ? '#ffff00' : '#666666';
}

// ==================== HOLDING HAND TOGGLE ====================
function toggleHoldingHand() {
    if (!player.hasHand) return;
    
    player.holdingHand = !player.holdingHand;
    audioSystem.playSound('hand-move', false, 0.3);
    
    if (player.holdingHand) {
        // Attach hand to camera
        scene.remove(handObject);
        camera.add(handObject);
        handObject.position.set(0.3, -0.2, -0.5);
        handObject.rotation.set(0, 0, 0);
        handObject.scale.set(0.5, 0.5, 0.5);
    } else {
        // Place hand back on table
        camera.remove(handObject);
        scene.add(handObject);
        handObject.position.set(0, 1.1, 3);
        handObject.rotation.set(0, 0, 0);
        handObject.scale.set(1, 1, 1);
    }
}

// ==================== INTRO CUTSCENE ====================
async function playIntro() {
    gameState = 'intro';
    player.inCutscene = true;
    player.canMove = false;
    
    console.log('Starting intro...');
    
    audioSystem.playSound('ambient', true, 0.3);
    audioSystem.playSound('wind', true, 0.2);
    
    // Position on skyscraper roof
    camera.position.set(0, 105, 0);
    camera.rotation.set(0.1, 0, 0);
    
    showCinematicText('THE EDGE');
    await sleep(2000);
    
    // Walk to edge
    await walkForward(5, 3);
    
    showCinematicText('JUMP');
    await sleep(1500);
    
    // JUMP!
    for(let i = 0; i < 30; i++) {
        camera.position.y -= 2;
        camera.rotation.x += 0.05;
        camera.rotation.z += 0.02;
        await sleep(50);
    }
    
    // Explosion mid-air
    audioSystem.playSound('explosion', false, 0.8);
    document.body.style.backgroundColor = '#ffffff';
    setTimeout(() => document.body.style.backgroundColor = '', 200);
    
    // Portal appears
    portalEffect.position.y = camera.position.y - 10;
    portalEffect.visible = true;
    audioSystem.playSound('portal', false, 0.6);
    
    // Fall into portal
    for(let i = 0; i < 50; i++) {
        camera.position.y -= 1;
        camera.rotation.y += 0.1;
        camera.rotation.x += 0.05;
        
        portalEffect.position.y = camera.position.y - 5;
        portalEffect.rotation.y += 0.1;
        
        await sleep(50);
    }
    
    // FALLING SEQUENCE with "WAKE UP" text
    for(let i = 0; i < 10; i++) {
        showCinematicText('WAKE UP' + '.'.repeat(i+1));
        
        // Spiral fall
        for(let j = 0; j < 10; j++) {
            camera.position.y -= 0.5;
            camera.rotation.y += 0.2;
            camera.rotation.x += 0.1;
            
            portalEffect.rotation.y += 0.2;
            portalEffect.rotation.x += 0.1;
            
            await sleep(50);
        }
    }
    
    // Fade to black
    document.getElementById('bloodOverlay').style.opacity = '1';
    await sleep(1000);
    
    // Wake up in bed
    camera.position.set(-7, 1.2, -7); // On bed
    camera.rotation.set(0, Math.PI/2, 0);
    
    portalEffect.visible = false;
    document.getElementById('bloodOverlay').style.opacity = '0';
    
    showCinematicText('WAKE UP...');
    await sleep(2000);
    
    // Start gameplay
    document.getElementById('hud').classList.add('hud-visible');
    document.getElementById('crosshair').classList.add('crosshair-visible');
    
    gameState = 'gameplay';
    player.inCutscene = false;
    player.canMove = true;
    
    audioSystem.playSound('heartbeat', true, 0.2);
    audioSystem.playSound('water-drip', true, 0.1);
    
    // Start the "I see you" timer
    iSeeYouTimer = 120; // 2 minutes in seconds
}

// ==================== HELPER FUNCTIONS ====================
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function showCinematicText(text) {
    const textDiv = document.createElement('div');
    textDiv.className = 'cinematic-text';
    textDiv.textContent = text;
    document.body.appendChild(textDiv);
    
    setTimeout(() => {
        textDiv.remove();
    }, 1500);
}

function walkForward(distance, duration) {
    return new Promise(resolve => {
        const steps = 20;
        const stepDistance = distance / steps;
        const stepTime = duration * 1000 / steps;
        
        let step = 0;
        const walkInterval = setInterval(() => {
            if (step >= steps) {
                clearInterval(walkInterval);
                resolve();
                return;
            }
            
            camera.position.z -= stepDistance;
            
            // Head bobbing
            camera.position.y = 105 + Math.sin(step * 2) * 0.05;
            
            step++;
        }, stepTime);
    });
}

// ==================== GAMEPLAY UPDATE ====================
function updatePlayer(delta) {
    if (!player.canMove || gameState !== 'gameplay') return;
    
    const speed = player.sprinting ? CONFIG.SPRINT_SPEED : CONFIG.WALKING_SPEED;
    const moveSpeed = speed * delta * 10;
    
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();
    
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();
    
    if (keys.w) camera.position.addScaledVector(forward, moveSpeed);
    if (keys.s) camera.position.addScaledVector(forward, -moveSpeed);
    if (keys.a) camera.position.addScaledVector(right, -moveSpeed);
    if (keys.d) camera.position.addScaledVector(right, moveSpeed);
    
    // Head bobbing
    if ((keys.w || keys.s || keys.a || keys.d) && player.canMove) {
        camera.position.y = 1.7 + Math.sin(Date.now() * 0.015) * 0.02;
        
        if (Math.random() < 0.02) {
            audioSystem.playSound('footsteps', false, 0.1);
        }
    }
    
    // Keep in house bounds
    camera.position.x = Math.max(-9, Math.min(9, camera.position.x));
    camera.position.z = Math.max(-9, Math.min(9, camera.position.z));
    camera.position.y = 1.7;
}

// ==================== INTERACTION ====================
function checkInteraction() {
    if (!player.canMove || gameState !== 'gameplay') return;
    
    // Check key
    if (keyObject && !player.hasKey) {
        const dist = camera.position.distanceTo(keyObject.position);
        if (dist < 2) {
            collectKey();
        }
    }
    
    // Check hand parts
    handParts.forEach(part => {
        if (!part.collected) {
            const dist = camera.position.distanceTo(part.mesh.position);
            if (dist < 2) {
                collectHandPart(part);
            }
        }
    });
    
    // Check spell casting (on table with all parts)
    if (table && player.inventory.every(v => v === true) && !player.hasHand) {
        const tablePos = table.position.clone();
        tablePos.y += 1;
        const dist = camera.position.distanceTo(tablePos);
        if (dist < 2.5) {
            castSpell();
        }
    }
    
    // Check vent (with key and hand)
    if (vent && player.hasKey && player.hasHand) {
        const ventPos = vent.position.clone();
        const dist = camera.position.distanceTo(ventPos);
        if (dist < 2.5) {
            openVent();
        }
    }
    
    // Check furniture moving (if holding hand)
    if (player.holdingHand) {
        furniture.forEach(item => {
            const dist = camera.position.distanceTo(item.position);
            if (dist < 3) {
                moveFurniture(item);
            }
        });
    }
    
    updateInteractPrompt();
}

function collectKey() {
    player.hasKey = true;
    scene.remove(keyObject);
    audioSystem.playSound('whisper', false, 0.3);
    showInteractMessage('Key acquired! Now find the hand parts');
    document.getElementById('objectiveText').textContent = 'Find all 4 hand parts to craft the left hand';
}

function collectHandPart(part) {
    part.collected = true;
    player.inventory[part.index] = true;
    scene.remove(part.mesh);
    
    // Update inventory UI
    document.getElementById(`part${part.index+1}`).classList.add('collected');
    document.getElementById(`part${part.index+1}`).textContent = '✅';
    
    audioSystem.playSound('whisper', false, 0.2);
    showInteractMessage(`Hand part ${part.index+1} collected!`);
    
    // Check if all collected
    if (player.inventory.every(v => v === true)) {
        document.getElementById('objectiveText').textContent = 'All parts collected! Go to the table to cast the spell';
        showInteractMessage('All parts collected! Return to the table');
    }
}

async function castSpell() {
    showInteractMessage('Casting spell...');
    player.canMove = false;
    
    audioSystem.playSound('spell-cast', false, 0.8);
    
    // Spell effect
    for(let i = 0; i < 30; i++) {
        // Create particle ring
        const particleGeo = new THREE.SphereGeometry(0.1);
        const particleMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0x442200 });
        const particle = new THREE.Mesh(particleGeo, particleMat);
        
        const angle = (i / 30) * Math.PI * 2;
        particle.position.set(
            table.position.x + Math.cos(angle) * 2,
            table.position.y + 1 + Math.sin(i) * 0.5,
            table.position.z + Math.sin(angle) * 2
        );
        
        scene.add(particle);
        setTimeout(() => scene.remove(particle), 2000);
        
        await sleep(50);
    }
    
    // Create hand
    createCompletedHand();
    handObject.visible = true;
    player.hasHand = true;
    
    document.getElementById('objectiveText').textContent = 'Use the hand to move furniture blocking the vent';
    document.getElementById('hand').classList.add('collected');
    document.getElementById('hand').textContent = '🖐️';
    
    showInteractMessage('The hand has been crafted! Right-click to hold it');
    player.canMove = true;
}

function moveFurniture(item) {
    // Move furniture out of the way
    item.position.x += 2;
    item.position.z += 2;
    
    audioSystem.playSound('hand-move', false, 0.4);
    showInteractMessage('Furniture moved!');
}

function openVent() {
    showInteractMessage('Escaping through vent...');
    player.canMove = false;
    
    audioSystem.playSound('vent', false, 0.6);
    
    // Crawl into vent animation
    setTimeout(() => {
        alert('YOU ESCAPED! The nightmare continues...');
        resetToMenu();
    }, 2000);
}

function updateInteractPrompt() {
    const prompt = document.getElementById('interactPrompt');
    let showPrompt = false;
    
    // Check all interactables
    if (keyObject && !player.hasKey) {
        if (camera.position.distanceTo(keyObject.position) < 2.5) showPrompt = true;
    }
    
    handParts.forEach(part => {
        if (!part.collected) {
            if (camera.position.distanceTo(part.mesh.position) < 2.5) showPrompt = true;
        }
    });
    
    if (table && player.inventory.every(v => v === true) && !player.hasHand) {
        const tablePos = table.position.clone();
        tablePos.y += 1;
        if (camera.position.distanceTo(tablePos) < 2.5) showPrompt = true;
    }
    
    if (vent && player.hasKey && player.hasHand) {
        if (camera.position.distanceTo(vent.position) < 2.5) showPrompt = true;
    }
    
    if (player.holdingHand) {
        furniture.forEach(item => {
            if (camera.position.distanceTo(item.position) < 3) showPrompt = true;
        });
    }
    
    if (showPrompt) {
        prompt.classList.remove('hidden');
    } else {
        prompt.classList.add('hidden');
    }
}

function showInteractMessage(text) {
    const prompt = document.getElementById('interactPrompt');
    prompt.textContent = text;
    prompt.classList.remove('hidden');
    
    setTimeout(() => {
        prompt.textContent = 'PRESS [E] TO INTERACT';
    }, 2000);
}

// ==================== TIMERS ====================
function updateTimers(delta) {
    if (gameState !== 'gameplay') return;
    
    // "I see you" every 2 minutes
    iSeeYouTimer -= delta;
    if (iSeeYouTimer <= 0) {
        audioSystem.playSound('i-see-you', false, 0.5);
        iSeeYouTimer = 120; // Reset to 2 minutes
        
        // Visual feedback
        document.getElementById('bloodOverlay').style.opacity = '0.5';
        setTimeout(() => {
            document.getElementById('bloodOverlay').style.opacity = '0';
        }, 1000);
    }
    
    // Random water drips
    dripTimer -= delta;
    if (dripTimer <= 0) {
        audioSystem.playSound('water-drip', false, 0.2);
        dripTimer = Math.random() * 5 + 2;
    }
}

// ==================== MENU BUTTONS ====================
document.getElementById('playBtn').addEventListener('click', () => {
    document.getElementById('menuScreen').classList.add('hidden');
    playIntro();
});

document.getElementById('settingsBtn').addEventListener('click', () => {
    CONFIG.MASTER_VOLUME = CONFIG.MASTER_VOLUME === 0.8 ? 0 : 0.8;
    alert(`Sound: ${CONFIG.MASTER_VOLUME > 0 ? 'ON' : 'OFF'}`);
});

document.getElementById('creditsBtn').addEventListener('click', () => {
    alert('NIGHTMARE PROTOCOL\nUltimate Horror Edition\n\nCreated with Three.js\nAll sounds are synthetic\n\n"I see you..."');
});

function resetToMenu() {
    gameState = 'menu';
    document.getElementById('menuScreen').classList.remove('hidden');
    document.getElementById('hud').classList.remove('hud-visible');
    document.getElementById('crosshair').classList.remove('crosshair-visible');
    document.getElementById('interactPrompt').classList.add('hidden');
    
    // Reset player
    player = {
        position: new THREE.Vector3(0, 1.7, 0),
        rotation: { x: 0, y: 0 },
        velocity: new THREE.Vector3(0, 0, 0),
        health: 100,
        hasKey: false,
        canMove: false,
        inCutscene: true,
        flashlightOn: true,
        inventory: [false, false, false, false],
        hasHand: false,
        holdingHand: false,
        sprinting: false
    };
    
    // Reset UI
    for(let i = 1; i <= 4; i++) {
        document.getElementById(`part${i}`).classList.remove('collected');
        document.getElementById(`part${i}`).textContent = '⚪';
    }
    document.getElementById('hand').classList.remove('collected');
    document.getElementById('hand').textContent = '🖐️';
    document.getElementById('keyCount').textContent = '0';
}

// ==================== ANIMATION LOOP ====================
function animate() {
    requestAnimationFrame(animate);
    
    const delta = Math.min(clock.getDelta(), 0.1);
    
    if (gameState === 'gameplay') {
        updatePlayer(delta);
        updateInteractPrompt();
        updateTimers(delta);
        
        // Animate portal if visible
        if (portalEffect.visible) {
            portalEffect.rotation.y += 0.01;
            portalEffect.rotation.x += 0.005;
        }
        
        // Animate hand if holding
        if (player.holdingHand && handObject) {
            handObject.rotation.y += 0.02;
        }
    }
    
    renderer.render(scene, camera);
}

// ==================== WINDOW RESIZE ====================
window.addEventListener('resize', () => {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});

console.log('Ultimate horror loaded - Click BEGIN DESCENT');
