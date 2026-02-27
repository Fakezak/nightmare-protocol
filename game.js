// ============================================
// THE VOID - NIGHTMARE HORROR EDITION
// ============================================

console.log("👁️ Initializing NIGHTMARE...");

// ============================================
// HORROR CONFIGURATION
// ============================================
const CONFIG = {
    WALK_SPEED: 0.06,
    SPRINT_SPEED: 0.12,
    MOUSE_SENSITIVITY: 0.002,
    FLASHLIGHT_INTENSITY: 2,
    GRAVITY: 0.01,
    INSANITY_RATE: 0.1,
    JUMPSCARE_CHANCE: 0.001,
    WHISPER_CHANCE: 0.01
};

// ============================================
// GLOBAL VARIABLES
// ============================================
let scene, camera, renderer;
let gameState = 'LOADING';
let player = {
    canMove: false,
    hasKey: false,
    parts: 0,
    crafted: false,
    flashlightOn: true,
    sprinting: false,
    insanity: 0,
    jumpscareTimer: 0
};

const keys = {};
let bodyParts = [];
let furniture = [];
let ghosts = [];
let portal, clockHand, keyObj, table, vent, handObj, flashlight, flashlightTarget;

// ============================================
// TERRIFYING AUDIO SYSTEM
// ============================================
const HorrorAudio = {
    context: null,
    
    init() {
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            console.log("👂 Audio system ready");
        } catch(e) {
            console.log("Audio not supported");
        }
    },
    
    playSound(type) {
        if (!this.context) return;
        
        try {
            const ctx = this.context;
            const now = ctx.currentTime;
            
            switch(type) {
                case 'heartbeat':
                    const heart = ctx.createOscillator();
                    const heartGain = ctx.createGain();
                    heart.type = 'sine';
                    heart.frequency.value = 1;
                    heartGain.gain.value = 0.1;
                    heart.connect(heartGain);
                    heartGain.connect(ctx.destination);
                    heart.start();
                    heart.stop(now + 0.1);
                    break;
                    
                case 'whisper':
                    const whisper = ctx.createOscillator();
                    const whisperGain = ctx.createGain();
                    whisper.type = 'sawtooth';
                    whisper.frequency.value = 200 + Math.random() * 100;
                    whisperGain.gain.value = 0.05;
                    whisper.connect(whisperGain);
                    whisperGain.connect(ctx.destination);
                    whisper.start();
                    whisper.stop(now + 0.3);
                    
                    // Random words (simulated)
                    setTimeout(() => {
                        if (Math.random() > 0.5) {
                            document.getElementById('prompt').innerHTML = 'RUN...';
                            setTimeout(() => document.getElementById('prompt').innerHTML = 'PRESS E', 1000);
                        }
                    }, 200);
                    break;
                    
                case 'scream':
                    const scream = ctx.createOscillator();
                    const screamGain = ctx.createGain();
                    scream.type = 'sawtooth';
                    scream.frequency.setValueAtTime(800, now);
                    scream.frequency.exponentialRampToValueAtTime(200, now + 0.5);
                    screamGain.gain.value = 0.3;
                    scream.connect(screamGain);
                    screamGain.connect(ctx.destination);
                    scream.start();
                    scream.stop(now + 0.5);
                    
                    // Blood flash
                    document.getElementById('blood').style.opacity = '0.8';
                    setTimeout(() => document.getElementById('blood').style.opacity = '0', 300);
                    break;
                    
                case 'static':
                    const staticNode = ctx.createBufferSource();
                    const staticGain = ctx.createGain();
                    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let i = 0; i < buffer.length; i++) {
                        data[i] = Math.random() * 2 - 1;
                    }
                    staticNode.buffer = buffer;
                    staticGain.gain.value = 0.1;
                    staticNode.connect(staticGain);
                    staticGain.connect(ctx.destination);
                    staticNode.start();
                    
                    document.getElementById('static').style.opacity = '0.5';
                    setTimeout(() => document.getElementById('static').style.opacity = '0', 200);
                    break;
            }
        } catch(e) {}
    },
    
    playFootstep() {
        if (!this.context) return;
        try {
            const step = this.context.createOscillator();
            const stepGain = this.context.createGain();
            step.type = 'triangle';
            step.frequency.value = 100 + Math.random() * 50;
            stepGain.gain.value = 0.05;
            step.connect(stepGain);
            stepGain.connect(this.context.destination);
            step.start();
            step.stop(this.context.currentTime + 0.1);
        } catch(e) {}
    }
};

// ============================================
// GEMMI HORROR TEXTURES
// ============================================
const GemMI = {
    // Creepy flesh texture
    flesh: () => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#8b4a4a';
        ctx.fillRect(0, 0, 512, 512);
        
        for (let i = 0; i < 1000; i++) {
            ctx.fillStyle = `rgba(139,0,0,${Math.random() * 0.3})`;
            ctx.beginPath();
            ctx.arc(
                Math.random() * 512,
                Math.random() * 512,
                5 + Math.random() * 15,
                0, Math.PI * 2
            );
            ctx.fill();
        }
        
        return new THREE.CanvasTexture(canvas);
    },
    
    // Bloody wall texture
    bloodyWall: () => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#4a2a2a';
        ctx.fillRect(0, 0, 512, 512);
        
        for (let i = 0; i < 50; i++) {
            ctx.strokeStyle = '#8b0000';
            ctx.lineWidth = 2 + Math.random() * 5;
            ctx.beginPath();
            ctx.moveTo(Math.random() * 512, Math.random() * 512);
            ctx.lineTo(Math.random() * 512, Math.random() * 512);
            ctx.stroke();
        }
        
        for (let i = 0; i < 20; i++) {
            ctx.fillStyle = '#5a2a2a';
            ctx.beginPath();
            ctx.ellipse(
                Math.random() * 512,
                Math.random() * 512,
                10 + Math.random() * 30,
                5 + Math.random() * 15,
                0, 0, Math.PI * 2
            );
            ctx.fill();
        }
        
        return new THREE.CanvasTexture(canvas);
    },
    
    // Rotting wood
    rottenWood: () => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#3a2a1a';
        ctx.fillRect(0, 0, 512, 512);
        
        for (let i = 0; i < 200; i++) {
            ctx.fillStyle = `#${Math.floor(20 + Math.random() * 30).toString(16)}${Math.floor(10 + Math.random() * 20).toString(16)}0a`;
            ctx.fillRect(
                Math.random() * 512,
                Math.random() * 512,
                20 + Math.random() * 40,
                5 + Math.random() * 10
            );
        }
        
        return new THREE.CanvasTexture(canvas);
    },
    
    // Scratch marks
    scratches: () => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, 512, 512);
        
        ctx.strokeStyle = '#8b0000';
        ctx.lineWidth = 1;
        for (let i = 0; i < 100; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * 512, Math.random() * 512);
            ctx.lineTo(
                Math.random() * 512,
                Math.random() * 512
            );
            ctx.stroke();
        }
        
        return new THREE.CanvasTexture(canvas);
    }
};

// ============================================
// LOADING SEQUENCE
// ============================================
window.addEventListener('load', () => {
    console.log("👁️ Loading nightmare...");
    
    HorrorAudio.init();
    
    let progress = 0;
    const loadingBar = document.getElementById('loading-progress');
    const loadingTip = document.getElementById('loading-tip');
    
    const tips = [
        "It's watching you...",
        "Don't look behind you...",
        "Something is coming...",
        "Wake up... wake up...",
        "I see you...",
        "The void calls...",
        "You shouldn't be here...",
        "Run...",
        "Hide..."
    ];
    
    const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress > 100) progress = 100;
        
        loadingBar.style.width = progress + '%';
        loadingTip.textContent = tips[Math.floor(Math.random() * tips.length)];
        
        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                document.getElementById('loading').style.opacity = '0';
                setTimeout(() => {
                    document.getElementById('loading').style.display = 'none';
                    initGame();
                }, 500);
            }, 500);
        }
    }, 200);
    
    setTimeout(() => {
        if (document.getElementById('loading').style.display !== 'none') {
            document.getElementById('loading').style.display = 'none';
            initGame();
        }
    }, 5000);
});

// ============================================
// GAME INIT
// ============================================
function initGame() {
    console.log("🎨 Building nightmare...");
    
    try {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x050505);
        scene.fog = new THREE.FogExp2(0x050505, 0.003);
        
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.rotation.order = 'YXZ';
        
        const canvas = document.getElementById('gameCanvas');
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.setPixelRatio(window.devicePixelRatio);
        
        setupLighting();
        createSkyscraper();
        createPortal();
        createHouse();
        createObjects();
        createGhosts();
        setupControls();
        
        playIntro();
        
        console.log("✅ Nightmare initialized");
    } catch (error) {
        console.error("❌ Error:", error);
    }
}

// ============================================
// HORROR LIGHTING
// ============================================
function setupLighting() {
    // Dim ambient (barely visible)
    const ambient = new THREE.AmbientLight(0x111122);
    scene.add(ambient);
    
    // Flickering directional light
    const dirLight = new THREE.DirectionalLight(0x442222, 0.3);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);
    
    // Flashlight (player's only real light)
    flashlight = new THREE.SpotLight(0xffeedd, CONFIG.FLASHLIGHT_INTENSITY, 30, Math.PI/6, 0.5, 2);
    flashlight.castShadow = true;
    flashlight.shadow.mapSize.width = 1024;
    flashlight.shadow.mapSize.height = 1024;
    scene.add(flashlight);
    
    flashlightTarget = new THREE.Object3D();
    scene.add(flashlightTarget);
    flashlight.target = flashlightTarget;
    
    // Flickering effect
    setInterval(() => {
        if (gameState === 'HOUSE' && player.flashlightOn && Math.random() > 0.7) {
            flashlight.intensity = CONFIG.FLASHLIGHT_INTENSITY * (0.5 + Math.random() * 0.5);
            setTimeout(() => {
                flashlight.intensity = CONFIG.FLASHLIGHT_INTENSITY;
            }, 100);
        }
    }, 500);
}

// ============================================
// SKYSCRAPER (Intro)
// ============================================
function createSkyscraper() {
    const group = new THREE.Group();
    
    // Main building (dark and ominous)
    const buildingMat = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a2a,
        emissive: 0x0a0a1a
    });
    
    const building = new THREE.Mesh(new THREE.BoxGeometry(30, 200, 30), buildingMat);
    building.position.y = 100;
    building.castShadow = true;
    building.receiveShadow = true;
    group.add(building);
    
    // Flickering windows
    const windowMat = new THREE.MeshStandardMaterial({ 
        color: 0x442222,
        emissive: 0x220000
    });
    
    for (let y = 10; y < 200; y += 15) {
        for (let x = -10; x < 10; x += 5) {
            if (Math.random() > 0.3) {
                const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 0.5), windowMat);
                windowMesh.position.set(x, y, 15.1);
                windowMesh.castShadow = true;
                group.add(windowMesh);
            }
        }
    }
    
    scene.add(group);
    
    // Roof platform
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
    const platform = new THREE.Mesh(new THREE.BoxGeometry(20, 1, 20), platformMat);
    platform.position.set(0, 200, 0);
    platform.castShadow = true;
    platform.receiveShadow = true;
    scene.add(platform);
}

// ============================================
// PORTAL (Disturbing)
// ============================================
function createPortal() {
    const group = new THREE.Group();
    
    // Main ring (blood red)
    const ringMat = new THREE.MeshStandardMaterial({ 
        color: 0x8b0000,
        emissive: 0x330000,
        transparent: true,
        opacity: 0.6
    });
    
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4, 0.3, 16, 32), ringMat);
    ring.rotation.x = Math.PI/2;
    group.add(ring);
    
    // Inner ring (flesh)
    const innerMat = new THREE.MeshStandardMaterial({ 
        color: 0x8b4a4a,
        emissive: 0x331111
    });
    
    const inner = new THREE.Mesh(new THREE.TorusGeometry(3, 0.2, 16, 32), innerMat);
    inner.rotation.x = Math.PI/2;
    inner.rotation.z = Math.PI/4;
    group.add(inner);
    
    // Floating particles (eyes)
    const particleCount = 30;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        positions[i*3] = Math.cos(angle) * 3.5;
        positions[i*3+1] = Math.sin(angle) * 3.5;
        positions[i*3+2] = 0;
    }
    
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particleMat = new THREE.PointsMaterial({ 
        color: 0xff0000,
        size: 0.2
    });
    
    const particles = new THREE.Points(particleGeo, particleMat);
    group.add(particles);
    
    group.position.set(0, 50, -10);
    portal = group;
    scene.add(group);
}

// ============================================
// HAUNTED HOUSE (Disturbing)
// ============================================
function createHouse() {
    const group = new THREE.Group();
    group.position.set(500, 0, 500);
    
    // Floor with scratch marks
    const floorMat = new THREE.MeshStandardMaterial({ 
        map: GemMI.scratches(),
        roughness: 0.9
    });
    
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), floorMat);
    floor.rotation.x = -Math.PI/2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    group.add(floor);
    
    // Walls with blood
    const wallMat = new THREE.MeshStandardMaterial({ 
        map: GemMI.bloodyWall(),
        roughness: 0.8
    });
    
    const addWall = (w, h, x, z, rotY = 0) => {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.5), wallMat);
        wall.position.set(x, h/2, z);
        wall.rotation.y = rotY;
        wall.castShadow = true;
        wall.receiveShadow = true;
        group.add(wall);
    };
    
    // Perimeter
    addWall(70, 8, 0, -35);
    addWall(70, 8, 0, 35);
    addWall(70, 8, -35, 0, Math.PI/2);
    addWall(70, 8, 35, 0, Math.PI/2);
    
    // Ceiling with stains
    const ceilingMat = new THREE.MeshStandardMaterial({ map: GemMI.flesh() });
    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(70, 0.2, 70), ceilingMat);
    ceiling.position.y = 8;
    ceiling.castShadow = true;
    ceiling.receiveShadow = true;
    group.add(ceiling);
    
    // ===== BEDROOM =====
    // Bed (broken)
    const bedMat = new THREE.MeshStandardMaterial({ map: GemMI.rottenWood() });
    const bed = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 2), bedMat);
    bed.position.set(480, 0.25, 480);
    bed.castShadow = true;
    group.add(bed);
    
    // Blood stain on bed
    const bloodMat = new THREE.MeshStandardMaterial({ color: 0x8b0000, emissive: 0x220000 });
    const blood = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 0.8), bloodMat);
    blood.position.set(480, 0.5, 480);
    blood.castShadow = true;
    group.add(blood);
    
    // Drawer
    const drawer = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 0.8), bedMat);
    drawer.position.set(482, 0.5, 483);
    drawer.castShadow = true;
    group.add(drawer);
    
    // ===== KITCHEN =====
    const kitchenMat = new THREE.MeshStandardMaterial({ color: 0x442222 });
    const counter = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 2), kitchenMat);
    counter.position.set(515, 0.5, 485);
    counter.castShadow = true;
    group.add(counter);
    
    // ===== LIVING ROOM =====
    const couchMat = new THREE.MeshStandardMaterial({ color: 0x2a1a1a });
    const couch = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 1.5), couchMat);
    couch.position.set(525, 0.5, 520);
    couch.castShadow = true;
    group.add(couch);
    
    // Chair (blocks vent)
    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.8), couchMat);
    chair.position.set(470, 0.25, 475);
    chair.castShadow = true;
    group.add(chair);
    furniture.push(chair);
    
    // Desk (blocks vent)
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1), bedMat);
    desk.position.set(471, 0.5, 474);
    desk.castShadow = true;
    group.add(desk);
    furniture.push(desk);
    
    scene.add(group);
}

// ============================================
// GHOSTS (Terrifying)
// ============================================
function createGhosts() {
    for (let i = 0; i < 3; i++) {
        const ghostGroup = new THREE.Group();
        
        // Transparent body
        const bodyMat = new THREE.MeshStandardMaterial({ 
            color: 0x88aaff,
            emissive: 0x224488,
            transparent: true,
            opacity: 0.3
        });
        
        const body = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.5, 8), bodyMat);
        body.position.y = 0.75;
        body.castShadow = true;
        ghostGroup.add(body);
        
        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.3), bodyMat);
        head.position.y = 1.6;
        head.castShadow = true;
        ghostGroup.add(head);
        
        // Glowing eyes
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x440000 });
        const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.1), eyeMat);
        eye1.position.set(0.1, 1.65, 0.2);
        ghostGroup.add(eye1);
        
        const eye2 = eye1.clone();
        eye2.position.set(-0.1, 1.65, 0.2);
        ghostGroup.add(eye2);
        
        // Position around house
        const positions = [
            { x: 485, z: 485 },
            { x: 510, z: 490 },
            { x: 520, z: 515 }
        ];
        
        ghostGroup.position.set(positions[i].x, 0, positions[i].z);
        
        ghosts.push({
            mesh: ghostGroup,
            originalY: 0,
            time: Math.random() * 100
        });
        
        scene.add(ghostGroup);
    }
}

// ============================================
// OBJECTS
// ============================================
function createObjects() {
    // Grandfather Clock (stopped)
    const clockGroup = new THREE.Group();
    clockGroup.position.set(525, 0, 525);
    
    const clockBody = new THREE.Mesh(
        new THREE.BoxGeometry(2, 8, 2),
        new THREE.MeshStandardMaterial({ color: 0x1a0a0a })
    );
    clockBody.position.y = 4;
    clockBody.castShadow = true;
    clockGroup.add(clockBody);
    
    const clockFace = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.8, 0.1, 16),
        new THREE.MeshStandardMaterial({ color: 0x442222 })
    );
    clockFace.position.set(0, 4, 1.1);
    clockFace.rotation.x = Math.PI/2;
    clockGroup.add(clockFace);
    
    scene.add(clockGroup);
    
    // Junk Parts (glowing red)
    const partPositions = [
        { x: 482, y: 0.5, z: 482 },
        { x: 515, y: 1.2, z: 485 },
        { x: 525, y: 0.8, z: 520 }
    ];
    
    partPositions.forEach((pos, i) => {
        const group = new THREE.Group();
        
        const main = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.3),
            new THREE.MeshStandardMaterial({ color: 0x8b0000, emissive: 0x330000 })
        );
        main.castShadow = true;
        group.add(main);
        
        const glow = new THREE.Mesh(
            new THREE.SphereGeometry(0.4),
            new THREE.MeshStandardMaterial({ 
                color: 0x8b0000,
                emissive: 0x330000,
                transparent: true,
                opacity: 0.2
            })
        );
        group.add(glow);
        
        group.position.set(pos.x, pos.y, pos.z);
        
        scene.add(group);
        bodyParts.push({ mesh: group, collected: false });
    });
    
    // Key (glowing)
    const keyGroup = new THREE.Group();
    
    const keyMat = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0x442200 });
    const head = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.04, 8, 16), keyMat);
    head.rotation.x = Math.PI/2;
    keyGroup.add(head);
    
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.08), keyMat);
    shaft.position.set(0, 0.2, 0);
    keyGroup.add(shaft);
    
    keyGroup.position.set(482, 1.1, 483);
    keyGroup.rotation.y = Math.PI/4;
    
    keyObj = keyGroup;
    scene.add(keyGroup);
    
    // Table
    const tableGroup = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a });
    
    const top = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 2), woodMat);
    top.position.y = 1;
    top.castShadow = true;
    tableGroup.add(top);
    
    tableGroup.position.set(500, 0, 515);
    table = tableGroup;
    scene.add(tableGroup);
    
    // Vent
    const ventGroup = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x442222 });
    
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 0.2), metalMat);
    frame.position.set(470.2, 1, 475);
    frame.castShadow = true;
    ventGroup.add(frame);
    
    vent = ventGroup;
    scene.add(ventGroup);
}

// ============================================
// CONTROLS
// ============================================
function setupControls() {
    document.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        
        if (e.code === 'KeyF' && gameState === 'HOUSE' && player.canMove) {
            toggleFlashlight();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });
    
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

// ============================================
// FLASHLIGHT
// ============================================
function toggleFlashlight() {
    player.flashlightOn = !player.flashlightOn;
    flashlight.intensity = player.flashlightOn ? CONFIG.FLASHLIGHT_INTENSITY : 0;
    document.getElementById('flashlight-status').innerHTML = player.flashlightOn ? '🔦 ON' : '🔦 OFF';
}

// ============================================
// INTRO SEQUENCE (Horror)
// ============================================
async function playIntro() {
    console.log("🎬 Playing nightmare intro...");
    
    gameState = 'INTRO';
    player.canMove = false;
    
    camera.position.set(0, 202, 5);
    camera.rotation.set(0, 0, 0);
    
    showCinematic('THE EDGE');
    HorrorAudio.playSound('heartbeat');
    await sleep(2000);
    
    // Walk to edge with heartbeat
    for (let i = 0; i < 30; i++) {
        camera.position.z -= 0.1;
        camera.position.y = 202 + Math.sin(i) * 0.05;
        if (i % 10 === 0) HorrorAudio.playSound('heartbeat');
        await sleep(50);
    }
    
    showCinematic('JUMP');
    HorrorAudio.playSound('scream');
    await sleep(1500);
    
    // Fall with horror effects
    gameState = 'FALLING';
    let fallVel = 0;
    
    for (let i = 0; i < 60; i++) {
        fallVel += CONFIG.GRAVITY;
        camera.position.y -= fallVel;
        camera.rotation.x += 0.02;
        camera.rotation.z += 0.01;
        
        if (i % 20 === 0) HorrorAudio.playSound('whisper');
        
        if (portal) {
            portal.position.y = camera.position.y - 20;
            portal.rotation.y += 0.03;
        }
        
        await sleep(50);
    }
    
    // Flash
    document.body.style.backgroundColor = '#ffffff';
    HorrorAudio.playSound('scream');
    setTimeout(() => document.body.style.backgroundColor = '', 200);
    
    // Through portal
    for (let i = 0; i < 30; i++) {
        camera.position.y -= 1;
        camera.rotation.y += 0.2;
        camera.rotation.x += 0.1;
        HorrorAudio.playSound('whisper');
        await sleep(50);
    }
    
    // Void sequence
    gameState = 'VOID';
    if (portal) portal.visible = false;
    
    for (let i = 0; i < 3; i++) {
        showCinematic('WAKE UP' + '.'.repeat(i+1));
        HorrorAudio.playSound('whisper');
        await sleep(1500);
    }
    
    // Jump scare on wake up
    showFace();
    HorrorAudio.playSound('scream');
    await sleep(500);
    hideFace();
    
    // House
    camera.position.set(480, 1.7, 480);
    camera.rotation.set(0, 0, 0);
    
    document.getElementById('hud').classList.add('visible');
    document.getElementById('obj').innerText = 'Find the key';
    
    gameState = 'HOUSE';
    player.canMove = true;
    
    console.log("🏠 Gameplay started");
}

function showFace() {
    document.getElementById('face').style.opacity = '1';
    document.getElementById('blood').style.opacity = '0.5';
    setTimeout(() => {
        document.getElementById('face').style.opacity = '0';
        document.getElementById('blood').style.opacity = '0';
    }, 300);
}

function hideFace() {
    document.getElementById('face').style.opacity = '0';
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function showCinematic(text) {
    const el = document.getElementById('cinematic');
    el.innerText = text;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 1500);
}

function showPrompt(text) {
    const el = document.getElementById('prompt');
    el.innerText = text;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 1500);
}

// ============================================
// INTERACTION
// ============================================
function checkInteraction() {
    if (!player.canMove || gameState !== 'HOUSE') return;
    
    // Junk parts
    bodyParts.forEach((part, i) => {
        if (!part.collected) {
            const dist = camera.position.distanceTo(part.mesh.position);
            if (dist < 3) {
                scene.remove(part.mesh);
                part.collected = true;
                player.parts++;
                document.getElementById('parts').innerHTML = `${player.parts}/3`;
                showPrompt('Part collected');
                HorrorAudio.playSound('whisper');
                
                if (player.parts >= 3) {
                    document.getElementById('obj').innerText = 'Go to the table';
                    HorrorAudio.playSound('whisper');
                }
            }
        }
    });
    
    // Key
    if (keyObj && !player.hasKey) {
        const dist = camera.position.distanceTo(keyObj.position);
        if (dist < 3) {
            scene.remove(keyObj);
            player.hasKey = true;
            document.getElementById('key').innerHTML = 'YES';
            showPrompt('Key found');
            HorrorAudio.playSound('whisper');
            document.getElementById('obj').innerText = 'Find 3 parts';
        }
    }
    
    // Table (spell)
    if (table && player.parts >= 3 && !player.crafted) {
        const dist = camera.position.distanceTo(table.position);
        if (dist < 4) {
            player.crafted = true;
            document.getElementById('hand').innerHTML = 'YES';
            document.getElementById('obj').innerText = 'Find the vent';
            showCinematic('I SEE YOU...');
            HorrorAudio.playSound('scream');
            
            // Face flash
            showFace();
        }
    }
    
    // Vent
    if (vent && player.hasKey && player.crafted) {
        const dist = camera.position.distanceTo(vent.position);
        if (dist < 3) {
            showCinematic('ESCAPED?');
            HorrorAudio.playSound('scream');
            player.canMove = false;
            setTimeout(() => {
                showCinematic('THE NIGHTMARE CONTINUES...');
                document.getElementById('face').style.opacity = '1';
            }, 2000);
        }
    }
}

// ============================================
// HORROR UPDATES
// ============================================
function updateHorror() {
    if (!player.canMove || gameState !== 'HOUSE') return;
    
    // Increase insanity in darkness
    if (!player.flashlightOn) {
        player.insanity += CONFIG.INSANITY_RATE;
    } else {
        player.insanity = Math.max(0, player.insanity - 0.05);
    }
    
    player.insanity = Math.min(100, player.insanity);
    document.getElementById('insanity').innerHTML = Math.floor(player.insanity) + '%';
    
    // Random whispers
    if (Math.random() < CONFIG.WHISPER_CHANCE) {
        HorrorAudio.playSound('whisper');
    }
    
    // Jump scares at high insanity
    if (player.insanity > 50 && Math.random() < CONFIG.JUMPSCARE_CHANCE) {
        showFace();
        HorrorAudio.playSound('scream');
        player.insanity += 10;
    }
    
    // Ghost movement
    ghosts.forEach(ghost => {
        ghost.time += 0.01;
        ghost.mesh.position.y = 0 + Math.sin(ghost.time) * 0.2;
        ghost.mesh.rotation.y += 0.01;
        
        // Ghost follows player when insane
        if (player.insanity > 70) {
            const dir = new THREE.Vector3().subVectors(
                camera.position,
                ghost.mesh.position
            ).normalize();
            ghost.mesh.position.addScaledVector(dir, 0.01);
        }
        
        // Ghost disappears in light
        if (player.flashlightOn) {
            const dist = camera.position.distanceTo(ghost.mesh.position);
            if (dist < 10) {
                ghost.mesh.material.opacity = 0.1;
            } else {
                ghost.mesh.material.opacity = 0.3;
            }
        }
    });
}

// ============================================
// UPDATE FUNCTIONS
// ============================================
function updatePlayer() {
    if (!player.canMove || gameState !== 'HOUSE') return;
    
    const speed = keys['Space'] ? CONFIG.SPRINT_SPEED : CONFIG.WALK_SPEED;
    
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();
    
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();
    
    if (keys['KeyW']) camera.position.addScaledVector(forward, speed);
    if (keys['KeyS']) camera.position.addScaledVector(forward, -speed);
    if (keys['KeyA']) camera.position.addScaledVector(right, -speed);
    if (keys['KeyD']) camera.position.addScaledVector(right, speed);
    
    // Footsteps
    if ((keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD']) && 
        Math.random() < 0.02) {
        HorrorAudio.playFootstep();
    }
    
    // Bounds
    camera.position.x = Math.max(465, Math.min(535, camera.position.x));
    camera.position.z = Math.max(465, Math.min(535, camera.position.z));
    camera.position.y = 1.7;
}

function updateFlashlight() {
    if (!flashlight) return;
    
    flashlight.position.copy(camera.position);
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    flashlightTarget.position.copy(camera.position).add(dir);
}

function updatePortal() {
    if (portal && portal.visible) {
        portal.rotation.y += 0.02;
        portal.rotation.x += 0.01;
    }
}

// ============================================
// ANIMATION LOOP
// ============================================
function animate() {
    requestAnimationFrame(animate);
    
    if (gameState === 'HOUSE') {
        updatePlayer();
        updateFlashlight();
        updateHorror();
    }
    
    updatePortal();
    
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}
animate();

// ============================================
// RESIZE
// ============================================
window.addEventListener('resize', () => {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});

console.log("👻 NIGHTMARE MODE ACTIVATED");
