// ============================================
// THE VOID - GEMMI AI TEXTURE EDITION
// ============================================

console.log("🎮 Initializing THE VOID...");

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    WALK_SPEED: 0.08,
    SPRINT_SPEED: 0.15,
    MOUSE_SENSITIVITY: 0.002,
    FLASHLIGHT_INTENSITY: 2,
    GRAVITY: 0.01,
    FOV: 75,
    NEAR: 0.1,
    FAR: 1000
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
    sprinting: false
};

const keys = {};
let bodyParts = [];
let furniture = [];
let portal, clockHand, keyObj, table, vent, handObj, flashlight, flashlightTarget;

// ============================================
// GEMMI AI TEXTURE GENERATOR
// ============================================
const GemMI = {
    // Generate wood texture
    wood: (color1 = '#8B4513', color2 = '#5D3A1A') => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Base color
        ctx.fillStyle = color1;
        ctx.fillRect(0, 0, 512, 512);
        
        // Wood grain
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const width = 10 + Math.random() * 20;
            const height = 2 + Math.random() * 4;
            
            ctx.fillStyle = color2;
            ctx.fillRect(x, y, width, height);
            
            // Knots
            if (Math.random() > 0.7) {
                ctx.beginPath();
                ctx.arc(x + width/2, y + height/2, 8, 0, Math.PI*2);
                ctx.fillStyle = '#4A2C1A';
                ctx.fill();
            }
        }
        
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 2);
        return tex;
    },
    
    // Generate stone texture
    stone: () => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#666666';
        ctx.fillRect(0, 0, 512, 512);
        
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const size = 10 + Math.random() * 30;
            
            ctx.fillStyle = `#${Math.floor(40 + Math.random() * 40).toString(16)}${Math.floor(40 + Math.random() * 40).toString(16)}${Math.floor(40 + Math.random() * 40).toString(16)}`;
            ctx.beginPath();
            ctx.rect(x, y, size, size);
            ctx.fill();
            
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        return new THREE.CanvasTexture(canvas);
    },
    
    // Generate metal texture
    metal: () => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#888888';
        ctx.fillRect(0, 0, 512, 512);
        
        for (let i = 0; i < 100; i++) {
            ctx.strokeStyle = `#${Math.floor(100 + Math.random() * 100).toString(16)}${Math.floor(100 + Math.random() * 100).toString(16)}${Math.floor(100 + Math.random() * 100).toString(16)}`;
            ctx.lineWidth = 1 + Math.random() * 3;
            ctx.beginPath();
            ctx.moveTo(Math.random() * 512, 0);
            ctx.lineTo(Math.random() * 512, 512);
            ctx.stroke();
        }
        
        return new THREE.CanvasTexture(canvas);
    },
    
    // Generate fabric texture
    fabric: () => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#4A2C2C';
        ctx.fillRect(0, 0, 512, 512);
        
        for (let i = 0; i < 1000; i++) {
            ctx.fillStyle = `rgba(100,50,50,${Math.random() * 0.3})`;
            ctx.beginPath();
            ctx.arc(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 4, 0, Math.PI*2);
            ctx.fill();
        }
        
        return new THREE.CanvasTexture(canvas);
    },
    
    // Generate blood texture
    blood: () => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#8B0000';
        ctx.fillRect(0, 0, 512, 512);
        
        for (let i = 0; i < 50; i++) {
            ctx.fillStyle = `#${Math.floor(70 + Math.random() * 30).toString(16)}0000`;
            ctx.beginPath();
            ctx.ellipse(
                256 + (Math.random() - 0.5) * 200,
                256 + (Math.random() - 0.5) * 200,
                30 + Math.random() * 50,
                20 + Math.random() * 30,
                0, 0, Math.PI*2
            );
            ctx.fill();
        }
        
        return new THREE.CanvasTexture(canvas);
    },
    
    // Generate glowing particle texture
    glow: (color = '#ffaa00') => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.5, `${color}88`);
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
        
        return new THREE.CanvasTexture(canvas);
    }
};

// ============================================
// LOADING SEQUENCE
// ============================================
window.addEventListener('load', () => {
    console.log("📦 Window loaded, starting loading sequence...");
    
    let progress = 0;
    const loadingBar = document.getElementById('loading-progress');
    const loadingTip = document.getElementById('loading-tip');
    
    const tips = [
        "GemMI AI generating wood textures...",
        "Creating stone patterns...",
        "Weaving fabric textures...",
        "Forging metal surfaces...",
        "Adding blood effects...",
        "Building the void...",
        "Wake up..."
    ];
    
    // Simulate loading with texture generation
    const interval = setInterval(() => {
        progress += Math.random() * 15;
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
    
    // Fallback: force start after 5 seconds
    setTimeout(() => {
        if (document.getElementById('loading').style.display !== 'none') {
            document.getElementById('loading').style.display = 'none';
            initGame();
        }
    }, 5000);
});

// ============================================
// GAME INITIALIZATION
// ============================================
function initGame() {
    console.log("🎨 Initializing 3D scene with GemMI textures...");
    
    try {
        // Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0a1a);
        scene.fog = new THREE.FogExp2(0x0a0a1a, 0.001);
        
        // Camera
        camera = new THREE.PerspectiveCamera(CONFIG.FOV, window.innerWidth / window.innerHeight, CONFIG.NEAR, CONFIG.FAR);
        camera.rotation.order = 'YXZ';
        
        // Renderer
        const canvas = document.getElementById('gameCanvas');
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.shadowMap.bias = 0.0001;
        renderer.setPixelRatio(window.devicePixelRatio);
        
        // Lighting
        setupLighting();
        
        // World
        createSkyscraper();
        createPortal();
        createHouse();
        createObjects();
        
        // Controls
        setupControls();
        
        // Start intro
        playIntro();
        
        console.log("✅ Game initialized successfully");
    } catch (error) {
        console.error("❌ Initialization error:", error);
    }
}

// ============================================
// LIGHTING
// ============================================
function setupLighting() {
    // Ambient light (dim)
    const ambient = new THREE.AmbientLight(0x404060);
    scene.add(ambient);
    
    // Directional light (moonlight)
    const dirLight = new THREE.DirectionalLight(0x8899aa, 0.5);
    dirLight.position.set(10, 30, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);
    
    // Flashlight
    flashlight = new THREE.SpotLight(0xffeedd, CONFIG.FLASHLIGHT_INTENSITY, 30, Math.PI/6, 0.5, 1);
    flashlight.castShadow = true;
    flashlight.shadow.mapSize.width = 1024;
    flashlight.shadow.mapSize.height = 1024;
    scene.add(flashlight);
    
    flashlightTarget = new THREE.Object3D();
    scene.add(flashlightTarget);
    flashlight.target = flashlightTarget;
}

// ============================================
// SKYSCRAPER (Intro Scene)
// ============================================
function createSkyscraper() {
    const group = new THREE.Group();
    
    // Main building
    const buildingMat = new THREE.MeshStandardMaterial({ 
        color: 0x334455,
        roughness: 0.6,
        metalness: 0.1
    });
    
    const building = new THREE.Mesh(new THREE.BoxGeometry(30, 200, 30), buildingMat);
    building.position.y = 100;
    building.castShadow = true;
    building.receiveShadow = true;
    group.add(building);
    
    // Windows (glowing)
    const windowMat = new THREE.MeshStandardMaterial({ 
        color: 0xffaa33,
        emissive: 0x442200
    });
    
    for (let y = 10; y < 200; y += 20) {
        for (let x = -10; x < 10; x += 6) {
            const windowGeo = new THREE.BoxGeometry(2, 4, 0.5);
            const windowMesh = new THREE.Mesh(windowGeo, windowMat);
            windowMesh.position.set(x, y, 15.1);
            windowMesh.castShadow = true;
            group.add(windowMesh);
        }
    }
    
    // Roof
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(18, 8, 8), roofMat);
    roof.position.y = 204;
    roof.castShadow = true;
    group.add(roof);
    
    scene.add(group);
    
    // Roof platform (where player stands)
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const platform = new THREE.Mesh(new THREE.BoxGeometry(20, 1, 20), platformMat);
    platform.position.set(0, 200, 0);
    platform.castShadow = true;
    platform.receiveShadow = true;
    scene.add(platform);
    
    // Red marker
    const markerMat = new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0x330000 });
    const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 3), markerMat);
    marker.position.set(0, 201.5, 5);
    marker.castShadow = true;
    scene.add(marker);
}

// ============================================
// PORTAL
// ============================================
function createPortal() {
    const group = new THREE.Group();
    
    // Outer ring
    const ringMat = new THREE.MeshStandardMaterial({ 
        color: 0xaa44ff,
        emissive: 0x331166,
        transparent: true,
        opacity: 0.8
    });
    
    const outer = new THREE.Mesh(new THREE.TorusGeometry(4, 0.3, 16, 32), ringMat);
    outer.rotation.x = Math.PI/2;
    group.add(outer);
    
    // Inner ring
    const inner = new THREE.Mesh(new THREE.TorusGeometry(3, 0.2, 16, 32), ringMat);
    inner.rotation.x = Math.PI/2;
    inner.rotation.z = Math.PI/4;
    group.add(inner);
    
    // Particles
    const particleCount = 100;
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
        color: 0xff88ff,
        size: 0.1,
        map: GemMI.glow('#ff88ff')
    });
    
    const particles = new THREE.Points(particleGeo, particleMat);
    group.add(particles);
    
    group.position.set(0, 50, -10);
    portal = group;
    scene.add(group);
}

// ============================================
// HAUNTED HOUSE
// ============================================
function createHouse() {
    const group = new THREE.Group();
    group.position.set(500, 0, 500);
    
    // Floor with GemMI wood texture
    const floorMat = new THREE.MeshStandardMaterial({ 
        map: GemMI.wood('#553322', '#332211'),
        roughness: 0.8
    });
    
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), floorMat);
    floor.rotation.x = -Math.PI/2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    group.add(floor);
    
    // Walls with GemMI stone texture
    const wallMat = new THREE.MeshStandardMaterial({ 
        map: GemMI.stone(),
        roughness: 0.7
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
    
    // Ceiling
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x332211 });
    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(70, 0.2, 70), ceilingMat);
    ceiling.position.y = 8;
    ceiling.castShadow = true;
    ceiling.receiveShadow = true;
    group.add(ceiling);
    
    // ===== BEDROOM =====
    // Bed
    const bedMat = new THREE.MeshStandardMaterial({ map: GemMI.wood('#553322', '#332211') });
    const bed = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 2), bedMat);
    bed.position.set(480, 0.25, 480);
    bed.castShadow = true;
    bed.receiveShadow = true;
    group.add(bed);
    
    // Pillow
    const pillowMat = new THREE.MeshStandardMaterial({ map: GemMI.fabric() });
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.5), pillowMat);
    pillow.position.set(479.5, 0.6, 480);
    pillow.castShadow = true;
    group.add(pillow);
    
    // Drawer
    const drawer = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 0.8), bedMat);
    drawer.position.set(482, 0.5, 483);
    drawer.castShadow = true;
    group.add(drawer);
    
    // ===== KITCHEN =====
    const kitchenMat = new THREE.MeshStandardMaterial({ map: GemMI.metal() });
    const counter = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 2), kitchenMat);
    counter.position.set(515, 0.5, 485);
    counter.castShadow = true;
    group.add(counter);
    
    // Sink
    const sink = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 1.5), kitchenMat);
    sink.position.set(515, 1.1, 485);
    sink.castShadow = true;
    group.add(sink);
    
    // ===== LIVING ROOM =====
    const couchMat = new THREE.MeshStandardMaterial({ map: GemMI.fabric() });
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
// INTERACTIVE OBJECTS
// ============================================
function createObjects() {
    // Grandfather Clock
    const clockGroup = new THREE.Group();
    clockGroup.position.set(525, 0, 525);
    
    const clockBody = new THREE.Mesh(
        new THREE.BoxGeometry(2, 8, 2),
        new THREE.MeshStandardMaterial({ map: GemMI.wood('#4A2C1A', '#2A1A0A') })
    );
    clockBody.position.y = 4;
    clockBody.castShadow = true;
    clockGroup.add(clockBody);
    
    const clockFace = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.8, 0.1, 16),
        new THREE.MeshStandardMaterial({ color: 0xffffaa })
    );
    clockFace.position.set(0, 4, 1.1);
    clockFace.rotation.x = Math.PI/2;
    clockGroup.add(clockFace);
    
    const hand = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.8, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x000000 })
    );
    hand.position.set(0, 4, 1.2);
    clockGroup.add(hand);
    clockHand = hand;
    
    scene.add(clockGroup);
    
    // Junk Parts (glowing)
    const partPositions = [
        { x: 482, y: 0.5, z: 482, color: 0xff5555 },
        { x: 515, y: 1.2, z: 485, color: 0x55ff55 },
        { x: 525, y: 0.8, z: 520, color: 0x5555ff }
    ];
    
    partPositions.forEach((pos, i) => {
        const group = new THREE.Group();
        
        const main = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.3),
            new THREE.MeshStandardMaterial({ color: pos.color, emissive: 0x331100 })
        );
        main.castShadow = true;
        group.add(main);
        
        const glow = new THREE.Mesh(
            new THREE.SphereGeometry(0.4),
            new THREE.MeshStandardMaterial({ 
                color: pos.color,
                emissive: pos.color,
                transparent: true,
                opacity: 0.2
            })
        );
        group.add(glow);
        
        group.position.set(pos.x, pos.y, pos.z);
        
        scene.add(group);
        bodyParts.push({ mesh: group, collected: false });
    });
    
    // Key
    const keyGroup = new THREE.Group();
    
    const head = new THREE.Mesh(
        new THREE.TorusGeometry(0.15, 0.04, 8, 16, Math.PI/2),
        new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0x442200 })
    );
    head.rotation.x = Math.PI/2;
    head.rotation.z = Math.PI/2;
    keyGroup.add(head);
    
    const shaft = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.3, 0.08),
        new THREE.MeshStandardMaterial({ color: 0xffaa00 })
    );
    shaft.position.set(0, 0.2, 0);
    keyGroup.add(shaft);
    
    keyGroup.position.set(482, 1.1, 483);
    keyGroup.rotation.y = Math.PI/4;
    
    keyObj = keyGroup;
    scene.add(keyGroup);
    
    // Table
    const tableGroup = new THREE.Group();
    
    const top = new THREE.Mesh(
        new THREE.BoxGeometry(4, 0.2, 2),
        new THREE.MeshStandardMaterial({ map: GemMI.wood('#8B4513', '#5D3A1A') })
    );
    top.position.y = 1;
    top.castShadow = true;
    top.receiveShadow = true;
    tableGroup.add(top);
    
    const legPositions = [[-1.8, 0.5, -0.8], [1.8, 0.5, -0.8], [-1.8, 0.5, 0.8], [1.8, 0.5, 0.8]];
    legPositions.forEach(pos => {
        const leg = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 1, 0.2),
            new THREE.MeshStandardMaterial({ map: GemMI.wood('#5D3A1A', '#3D2A1A') })
        );
        leg.position.set(pos[0], pos[1], pos[2]);
        leg.castShadow = true;
        tableGroup.add(leg);
    });
    
    tableGroup.position.set(500, 0, 515);
    table = tableGroup;
    scene.add(tableGroup);
    
    // Vent
    const ventGroup = new THREE.Group();
    
    const frame = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2, 0.2),
        new THREE.MeshStandardMaterial({ map: GemMI.metal() })
    );
    frame.position.set(470.2, 1, 475);
    frame.castShadow = true;
    ventGroup.add(frame);
    
    for (let i = 0; i < 5; i++) {
        const slat = new THREE.Mesh(
            new THREE.BoxGeometry(1.8, 0.1, 0.1),
            new THREE.MeshStandardMaterial({ map: GemMI.metal() })
        );
        slat.position.set(470.4, 0.8 + i * 0.25, 475);
        slat.castShadow = true;
        ventGroup.add(slat);
    }
    
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
// INTRO SEQUENCE
// ============================================
async function playIntro() {
    console.log("🎬 Playing intro sequence...");
    
    gameState = 'INTRO';
    player.canMove = false;
    
    camera.position.set(0, 202, 5);
    camera.rotation.set(0, 0, 0);
    
    showCinematic('THE EDGE');
    await sleep(2000);
    
    // Walk to edge
    for (let i = 0; i < 30; i++) {
        camera.position.z -= 0.1;
        camera.position.y = 202 + Math.sin(i) * 0.05;
        await sleep(50);
    }
    
    showCinematic('JUMP');
    await sleep(1500);
    
    // Fall
    gameState = 'FALLING';
    let fallVel = 0;
    
    for (let i = 0; i < 60; i++) {
        fallVel += CONFIG.GRAVITY;
        camera.position.y -= fallVel;
        camera.rotation.x += 0.01;
        camera.rotation.z += 0.005;
        
        if (portal) {
            portal.position.y = camera.position.y - 20;
            portal.rotation.y += 0.02;
        }
        
        await sleep(50);
    }
    
    // Flash
    document.body.style.backgroundColor = '#ffffff';
    setTimeout(() => document.body.style.backgroundColor = '', 200);
    
    // Through portal
    for (let i = 0; i < 30; i++) {
        camera.position.y -= 1;
        camera.rotation.y += 0.1;
        await sleep(50);
    }
    
    // Void
    gameState = 'VOID';
    if (portal) portal.visible = false;
    
    for (let i = 0; i < 3; i++) {
        showCinematic('WAKE UP' + '.'.repeat(i+1));
        await sleep(1500);
    }
    
    // House
    camera.position.set(480, 1.7, 480);
    camera.rotation.set(0, 0, 0);
    
    document.getElementById('hud').classList.add('visible');
    document.getElementById('obj').innerText = 'Find the key';
    
    gameState = 'HOUSE';
    player.canMove = true;
    
    console.log("🏠 Gameplay started");
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
                
                if (player.parts >= 3) {
                    document.getElementById('obj').innerText = 'Go to the table';
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
            document.getElementById('obj').innerText = 'Find 3 junk parts';
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
            
            // Create hand
            const hand = new THREE.Mesh(
                new THREE.SphereGeometry(0.3),
                new THREE.MeshStandardMaterial({ color: 0xffaa88, emissive: 0x442200 })
            );
            hand.position.set(500, 1.2, 515);
            scene.add(hand);
            handObj = hand;
            
            // Blood flash
            document.body.style.backgroundColor = '#8B0000';
            setTimeout(() => document.body.style.backgroundColor = '', 500);
        }
    }
    
    // Vent
    if (vent && player.hasKey && player.crafted) {
        const dist = camera.position.distanceTo(vent.position);
        if (dist < 3) {
            showCinematic('ESCAPED');
            player.canMove = false;
            setTimeout(() => {
                gameState = 'END';
                showCinematic('THE END');
            }, 2000);
        }
    }
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
    
    // House bounds
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

function updateClock() {
    if (clockHand) {
        clockHand.rotation.z -= 0.01;
    }
}

function updatePortal() {
    if (portal && portal.visible) {
        portal.rotation.y += 0.01;
        portal.rotation.x += 0.005;
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
        updateClock();
    }
    
    updatePortal();
    
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}
animate();

// ============================================
// RESIZE HANDLER
// ============================================
window.addEventListener('resize', () => {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});

console.log("✨ THE VOID - GemMI AI Edition ready!");
