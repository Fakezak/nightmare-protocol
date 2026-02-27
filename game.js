// ==================== CONFIGURATION ====================
const CONFIG = {
    WALKING_SPEED: 2.5, // Slower, more realistic
    SPRINT_SPEED: 4.5,
    MOUSE_SENSITIVITY: 0.002,
    FOV: 75,
    AMBIENT_VOLUME: 0.3,
    MASTER_VOLUME: 0.8
};

// ==================== GAME STATE ====================
let scene, camera, renderer;
let gameState = 'loading'; // loading, menu, intro, playing, gameover
let clock = new THREE.Clock();
let mixer = null; // For future animations

// Player
let player = {
    position: new THREE.Vector3(0, 1.7, 5),
    rotation: { x: 0, y: 0 },
    health: 100,
    hasKey: false,
    canMove: false,
    inCutscene: true
};

// Controls
let keys = { w: false, a: false, s: false, d: false, shift: false, e: false };
let mouseX = 0, mouseY = 0;

// World objects
let flashlight, enemy, keyObject, vent;
let particles = [];

// Audio system
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
            // Create fallback oscillator sounds
            this.createFallbackSound(name);
        }
    },
    
    createFallbackSound(name) {
        // Create synthetic sounds if files don't exist
        const duration = 2;
        const sampleRate = 44100;
        const buffer = this.context.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);
        
        switch(name) {
            case 'ambient':
                for(let i = 0; i < buffer.length; i++) {
                    data[i] = Math.random() * 0.1 * Math.sin(i * 0.01);
                }
                break;
            case 'explosion':
                for(let i = 0; i < buffer.length; i++) {
                    data[i] = Math.random() * Math.exp(-i / 10000) * 0.5;
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
    },
    
    playExplosion() {
        this.playSound('explosion', false, 0.8);
        
        // Add screen shake
        if (camera) {
            let shakeIntensity = 0.5;
            const startPos = camera.position.clone();
            
            const shakeInterval = setInterval(() => {
                if (!camera || gameState !== 'intro') {
                    clearInterval(shakeInterval);
                    return;
                }
                
                camera.position.x = startPos.x + (Math.random() - 0.5) * shakeIntensity;
                camera.position.y = startPos.y + (Math.random() - 0.5) * shakeIntensity * 0.5;
                
                shakeIntensity *= 0.9;
                if (shakeIntensity < 0.05) {
                    clearInterval(shakeInterval);
                    camera.position.copy(startPos);
                }
            }, 50);
        }
    }
};

// ==================== LOADING SEQUENCE ====================
window.addEventListener('load', async () => {
    console.log('Starting game...');
    
    // Initialize audio
    audioSystem.init();
    
    // Load sounds (will use fallbacks if files missing)
    await audioSystem.loadSound('ambient', 'assets/sounds/ambient-horror.mp3');
    await audioSystem.loadSound('explosion', 'assets/sounds/explosion.mp3');
    await audioSystem.loadSound('heartbeat', 'assets/sounds/heartbeat.mp3');
    await audioSystem.loadSound('whisper', 'assets/sounds/whisper.mp3');
    await audioSystem.loadSound('wakeup', 'assets/sounds/wake-up.mp3');
    await audioSystem.loadSound('footsteps', 'assets/sounds/footsteps.mp3');
    await audioSystem.loadSound('vent', 'assets/sounds/vent-open.mp3');
    
    // Loading animation
    const loadingBar = document.getElementById('loadingBar');
    const loadingTip = document.getElementById('loadingTip');
    
    const tips = [
        'Your soul is fragile...',
        'Something watches from the dark',
        'The vents lead to salvation',
        'Don\'t trust the silence',
        'Wake up... wake up...',
        'The explosion was just the beginning'
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
    console.log('Initializing 3D scene...');
    
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.FogExp2(0x050505, 0.03);
    
    // Camera
    camera = new THREE.PerspectiveCamera(CONFIG.FOV, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.copy(player.position);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.2;
    
    // Lighting
    setupLighting();
    
    // Create world
    createStreet(); // For intro scene
    createHouse();  // For gameplay
    
    // Create key
    createKey();
    
    // Create vent
    createVent();
    
    // Create soul effect
    createSoulEffect();
    
    // Setup controls
    setupControls();
    
    // Start game loop
    animate();
    
    console.log('Game initialized!');
}

// ==================== LIGHTING ====================
function setupLighting() {
    // Ambient
    const ambient = new THREE.AmbientLight(0x222233);
    scene.add(ambient);
    
    // Main flashlight
    flashlight = new THREE.SpotLight(0xffeedd, 2, 20, Math.PI/6, 0.5, 2);
    flashlight.castShadow = true;
    flashlight.shadow.mapSize.width = 1024;
    flashlight.shadow.mapSize.height = 1024;
    camera.add(flashlight);
    
    // Fill light
    const fillLight = new THREE.PointLight(0x442222, 0.3, 30);
    fillLight.position.set(5, 3, 5);
    scene.add(fillLight);
    
    scene.add(camera);
}

// ==================== STREET SCENE (INTRO) ====================
function createStreet() {
    const streetGroup = new THREE.Group();
    
    // Road
    const roadGeo = new THREE.PlaneGeometry(20, 100);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI/2;
    road.position.y = 0;
    road.receiveShadow = true;
    streetGroup.add(road);
    
    // Street lines
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xffff00 });
    for(let i = -40; i < 40; i+=5) {
        const lineGeo = new THREE.PlaneGeometry(0.3, 2);
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.rotation.x = -Math.PI/2;
        line.position.set(0, 0.01, i);
        line.receiveShadow = true;
        streetGroup.add(line);
    }
    
    // Sidewalks
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const sidewalk1 = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 100), sidewalkMat);
    sidewalk1.position.set(-10, 0.1, 0);
    sidewalk1.receiveShadow = true;
    sidewalk1.castShadow = true;
    streetGroup.add(sidewalk1);
    
    const sidewalk2 = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 100), sidewalkMat);
    sidewalk2.position.set(10, 0.1, 0);
    sidewalk2.receiveShadow = true;
    sidewalk2.castShadow = true;
    streetGroup.add(sidewalk2);
    
    // Lamp posts
    for(let i = -40; i < 40; i+=15) {
        createLampPost(streetGroup, -8, i);
        createLampPost(streetGroup, 8, i);
    }
    
    streetGroup.position.set(0, 0, -30); // Place in front of player
    scene.add(streetGroup);
}

function createLampPost(group, x, z) {
    const poleGeo = new THREE.CylinderGeometry(0.1, 0.15, 5);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(x, 2.5, z);
    pole.castShadow = true;
    pole.receiveShadow = true;
    group.add(pole);
    
    const lampGeo = new THREE.SphereGeometry(0.3);
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0x442200 });
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(x, 5, z);
    lamp.castShadow = true;
    group.add(lamp);
}

// ==================== HOUSE INTERIOR ====================
function createHouse() {
    const houseGroup = new THREE.Group();
    houseGroup.position.set(0, 0, 0);
    
    // Floor
    const floorGeo = new THREE.BoxGeometry(15, 0.2, 15);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x332211 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.1;
    floor.receiveShadow = true;
    floor.castShadow = true;
    houseGroup.add(floor);
    
    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a });
    
    // Back wall
    const backWall = new THREE.BoxGeometry(15, 4, 0.3);
    const back = new THREE.Mesh(backWall, wallMat);
    back.position.set(0, 2, -7.5);
    back.castShadow = true;
    back.receiveShadow = true;
    houseGroup.add(back);
    
    // Front wall (with door)
    const frontLeft = new THREE.BoxGeometry(6, 4, 0.3);
    const frontL = new THREE.Mesh(frontLeft, wallMat);
    frontL.position.set(-4.5, 2, 7.5);
    frontL.castShadow = true;
    frontL.receiveShadow = true;
    houseGroup.add(frontL);
    
    const frontRight = new THREE.BoxGeometry(6, 4, 0.3);
    const frontR = new THREE.Mesh(frontRight, wallMat);
    frontR.position.set(4.5, 2, 7.5);
    frontR.castShadow = true;
    frontR.receiveShadow = true;
    houseGroup.add(frontR);
    
    // Left wall
    const leftWall = new THREE.BoxGeometry(0.3, 4, 15);
    const left = new THREE.Mesh(leftWall, wallMat);
    left.position.set(-7.5, 2, 0);
    left.castShadow = true;
    left.receiveShadow = true;
    houseGroup.add(left);
    
    // Right wall
    const rightWall = new THREE.BoxGeometry(0.3, 4, 15);
    const right = new THREE.Mesh(rightWall, wallMat);
    right.position.set(7.5, 2, 0);
    right.castShadow = true;
    right.receiveShadow = true;
    houseGroup.add(right);
    
    // Ceiling
    const ceilingGeo = new THREE.BoxGeometry(15, 0.2, 15);
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x221100 });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.position.y = 4;
    ceiling.castShadow = true;
    ceiling.receiveShadow = true;
    houseGroup.add(ceiling);
    
    // Furniture
    createFurniture(houseGroup);
    
    scene.add(houseGroup);
}

function createFurniture(group) {
    // Bed
    const bedMat = new THREE.MeshStandardMaterial({ color: 0x553322 });
    const bedBase = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 2), bedMat);
    bedBase.position.set(-4, 0.25, -3);
    bedBase.castShadow = true;
    bedBase.receiveShadow = true;
    group.add(bedBase);
    
    // Pillow
    const pillowMat = new THREE.MeshStandardMaterial({ color: 0x886644 });
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.5), pillowMat);
    pillow.position.set(-4.5, 0.6, -3);
    pillow.castShadow = true;
    pillow.receiveShadow = true;
    group.add(pillow);
    
    // Desk
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x442211 });
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 1), deskMat);
    deskTop.position.set(4, 1.1, -2);
    deskTop.castShadow = true;
    deskTop.receiveShadow = true;
    group.add(deskTop);
    
    const deskLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1, 0.2), deskMat);
    deskLeg.position.set(3.5, 0.5, -2);
    deskLeg.castShadow = true;
    group.add(deskLeg);
    
    // Chair
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x664422 });
    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.8), chairMat);
    chairSeat.position.set(4, 0.6, 0);
    chairSeat.castShadow = true;
    chairSeat.receiveShadow = true;
    group.add(chairSeat);
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
    const shaftGeo = new THREE.BoxGeometry(0.04, 0.25, 0.08);
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.set(0, 0.2, 0);
    keyGroup.add(shaft);
    
    // Key teeth
    const teethGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const teethMat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
    const teeth = new THREE.Mesh(teethGeo, teethMat);
    teeth.position.set(0, 0.35, 0);
    keyGroup.add(teeth);
    
    // Position on desk
    keyGroup.position.set(4, 1.3, -2);
    keyGroup.rotation.y = Math.PI/4;
    
    keyObject = keyGroup;
    scene.add(keyObject);
}

// ==================== VENT ====================
function createVent() {
    const ventGroup = new THREE.Group();
    
    // Vent frame
    const frameGeo = new THREE.BoxGeometry(1.2, 1.2, 0.2);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(5, 1.5, 6.5);
    frame.castShadow = true;
    ventGroup.add(frame);
    
    // Vent slats
    const slatMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
    for(let i = 0; i < 5; i++) {
        const slatGeo = new THREE.BoxGeometry(1, 0.1, 0.1);
        const slat = new THREE.Mesh(slatGeo, slatMat);
        slat.position.set(5, 1.2 + i * 0.2, 6.6);
        slat.castShadow = true;
        ventGroup.add(slat);
    }
    
    vent = ventGroup;
    scene.add(vent);
}

// ==================== SOUL EFFECT ====================
function createSoulEffect() {
    const soulGroup = new THREE.Group();
    
    // Glowing orb
    const orbGeo = new THREE.SphereGeometry(0.3, 16);
    const orbMat = new THREE.MeshStandardMaterial({ 
        color: 0x4466ff, 
        emissive: 0x1122aa,
        transparent: true,
        opacity: 0.8
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.castShadow = true;
    soulGroup.add(orb);
    
    // Particle ring
    const ringParticles = [];
    for(let i = 0; i < 16; i++) {
        const particleGeo = new THREE.SphereGeometry(0.05, 4);
        const particleMat = new THREE.MeshStandardMaterial({ color: 0x88aaff, emissive: 0x2244aa });
        const particle = new THREE.Mesh(particleGeo, particleMat);
        
        const angle = (i / 16) * Math.PI * 2;
        particle.position.set(Math.cos(angle) * 0.5, Math.sin(angle) * 0.5, 0);
        particle.castShadow = true;
        soulGroup.add(particle);
        ringParticles.push(particle);
    }
    
    soulGroup.position.set(0, 1.7, 10); // Start in front of player
    soulGroup.visible = false;
    
    particles.push({ group: soulGroup, ringParticles });
    scene.add(soulGroup);
}

// ==================== CONTROLS ====================
function setupControls() {
    // Mouse look
    document.addEventListener('mousemove', (e) => {
        if (gameState === 'playing' && document.pointerLockElement && player.canMove) {
            mouseX -= e.movementX * CONFIG.MOUSE_SENSITIVITY;
            mouseY -= e.movementY * CONFIG.MOUSE_SENSITIVITY;
            mouseY = Math.max(-Math.PI/2, Math.min(Math.PI/2, mouseY));
            
            camera.rotation.order = 'YXZ';
            camera.rotation.y = mouseX;
            camera.rotation.x = mouseY;
        }
    });
    
    // Keyboard down
    document.addEventListener('keydown', (e) => {
        if (gameState !== 'playing' || !player.canMove) return;
        
        switch(e.code) {
            case 'KeyW': keys.w = true; e.preventDefault(); break;
            case 'KeyA': keys.a = true; e.preventDefault(); break;
            case 'KeyS': keys.s = true; e.preventDefault(); break;
            case 'KeyD': keys.d = true; e.preventDefault(); break;
            case 'ShiftLeft': keys.shift = true; e.preventDefault(); break;
            case 'KeyE': 
                keys.e = true;
                checkInteraction();
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
            case 'ShiftLeft': keys.shift = false; e.preventDefault(); break;
            case 'KeyE': keys.e = false; e.preventDefault(); break;
        }
    });
    
    // Pointer lock
    renderer.domElement.addEventListener('click', () => {
        if (gameState === 'playing' && player.canMove) {
            renderer.domElement.requestPointerLock();
        }
    });
}

// ==================== INTRO CUTSCENE ====================
async function playIntro() {
    gameState = 'intro';
    player.inCutscene = true;
    player.canMove = false;
    
    console.log('Playing intro cutscene...');
    
    // Start ambient sound
    audioSystem.playSound('ambient', true, 0.3);
    
    // Position player on street
    camera.position.set(0, 1.7, 0);
    camera.rotation.set(0, 0, 0);
    
    // Walk forward animation
    await walkForward(5, 2); // Walk for 2 seconds
    
    // EXPLOSION!
    console.log('EXPLOSION!');
    
    // Flash white
    document.body.style.backgroundColor = '#ffffff';
    setTimeout(() => document.body.style.backgroundColor = '', 100);
    
    // Play explosion sound
    audioSystem.playExplosion();
    
    // Screen shake
    let shakeTime = 0;
    const shakeIntensity = 0.5;
    const originalPos = camera.position.clone();
    
    for(let i = 0; i < 30; i++) {
        camera.position.x = originalPos.x + (Math.random() - 0.5) * shakeIntensity * (1 - i/30);
        camera.position.y = originalPos.y + (Math.random() - 0.5) * shakeIntensity * 0.5 * (1 - i/30);
        await sleep(50);
    }
    camera.position.copy(originalPos);
    
    // Soul extraction effect
    const soul = particles[0].group;
    soul.visible = true;
    soul.position.copy(camera.position.clone().add(new THREE.Vector3(0, 0, 2)));
    
    // Move soul out of body
    for(let i = 0; i < 30; i++) {
        soul.position.y += 0.1;
        soul.position.z -= 0.1;
        soul.scale.set(1 + i * 0.1, 1 + i * 0.1, 1 + i * 0.1);
        
        // Rotate ring particles
        particles[0].ringParticles.forEach((p, idx) => {
            p.position.x = Math.cos(idx + Date.now() * 0.01) * 0.5;
            p.position.y = Math.sin(idx + Date.now() * 0.01) * 0.5;
        });
        
        await sleep(50);
    }
    
    // Camera spiral (soul leaving body effect)
    for(let i = 0; i < 20; i++) {
        camera.rotation.y += 0.1;
        camera.rotation.x += 0.05;
        camera.position.x += Math.sin(i) * 0.1;
        await sleep(50);
    }
    
    // Fade to black
    document.getElementById('bloodOverlay').style.opacity = '1';
    await sleep(1000);
    
    // "WAKE UP" text
    showCinematicText('WAKE UP...');
    await sleep(2000);
    
    // Fade to black again
    document.getElementById('bloodOverlay').style.opacity = '0';
    await sleep(500);
    
    showCinematicText('WAKE UP!');
    await sleep(1500);
    
    // Fade in to house
    camera.position.set(2, 1.7, 2); // In house
    camera.rotation.set(0, Math.PI/2, 0);
    soul.visible = false;
    
    // Show HUD
    document.getElementById('hud').classList.add('hud-visible');
    document.getElementById('crosshair').classList.add('crosshair-visible');
    
    // Start gameplay
    gameState = 'playing';
    player.inCutscene = false;
    player.canMove = true;
    
    // Play heartbeat
    audioSystem.playSound('heartbeat', true, 0.2);
    
    // Whisper
    setTimeout(() => {
        audioSystem.playSound('whisper', false, 0.4);
    }, 3000);
    
    console.log('Intro complete, gameplay started');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
            
            camera.position.z += stepDistance;
            
            // Footstep bobbing
            camera.position.y = 1.7 + Math.sin(step * 2) * 0.05;
            
            step++;
        }, stepTime);
    });
}

function showCinematicText(text) {
    const textDiv = document.createElement('div');
    textDiv.className = 'cinematic-text';
    textDiv.textContent = text;
    document.body.appendChild(textDiv);
    
    setTimeout(() => {
        textDiv.remove();
    }, 2000);
}

// ==================== GAMEPLAY ====================
function updatePlayer(delta) {
    if (!player.canMove || gameState !== 'playing') return;
    
    const speed = keys.shift ? CONFIG.SPRINT_SPEED : CONFIG.WALKING_SPEED;
    const moveSpeed = speed * delta * 10;
    
    // Get forward/right directions
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();
    
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();
    
    // Move
    if (keys.w) camera.position.addScaledVector(forward, moveSpeed);
    if (keys.s) camera.position.addScaledVector(forward, -moveSpeed);
    if (keys.a) camera.position.addScaledVector(right, -moveSpeed);
    if (keys.d) camera.position.addScaledVector(right, moveSpeed);
    
    // Head bobbing when moving
    if (keys.w || keys.s || keys.a || keys.d) {
        camera.position.y = 1.7 + Math.sin(Date.now() * 0.01) * 0.02;
        
        // Footstep sounds
        if (Math.random() < 0.01) {
            audioSystem.playSound('footsteps', false, 0.1);
        }
    }
    
    // Boundary (stay in house)
    camera.position.x = Math.max(-6, Math.min(6, camera.position.x));
    camera.position.z = Math.max(-6, Math.min(6, camera.position.z));
}

function checkInteraction() {
    if (!player.canMove || gameState !== 'playing') return;
    
    // Check key
    if (keyObject && !player.hasKey) {
        const dist = camera.position.distanceTo(keyObject.position);
        if (dist < 2) {
            collectKey();
        }
    }
    
    // Check vent
    if (vent && player.hasKey) {
        const ventPos = vent.position.clone();
        const dist = camera.position.distanceTo(ventPos);
        if (dist < 2.5) {
            openVent();
        }
    }
    
    // Show/hide prompt
    updateInteractPrompt();
}

function collectKey() {
    console.log('Key collected!');
    player.hasKey = true;
    document.getElementById('keyCount').textContent = '1';
    
    // Remove key from scene
    scene.remove(keyObject);
    
    // Play sound
    audioSystem.playSound('whisper', false, 0.3);
    
    // Show message
    showInteractMessage('Key acquired! Find the vent');
}

function openVent() {
    console.log('Vent opened!');
    
    // Play vent sound
    audioSystem.playSound('vent', false, 0.5);
    
    // Victory!
    setTimeout(() => {
        alert('YOU ESCAPED THROUGH THE VENT!');
        resetToMenu();
    }, 1000);
}

function updateInteractPrompt() {
    const prompt = document.getElementById('interactPrompt');
    let showPrompt = false;
    
    if (keyObject && !player.hasKey) {
        if (camera.position.distanceTo(keyObject.position) < 2.5) {
            showPrompt = true;
        }
    }
    
    if (vent && player.hasKey) {
        if (camera.position.distanceTo(vent.position) < 2.5) {
            showPrompt = true;
        }
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
        if (!document.getElementById('interactPrompt').classList.contains('hidden')) {
            // Only hide if no other interaction
        }
    }, 2000);
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
    alert('NIGHTMARE PROTOCOL\nA Cinematic Horror Experience\n\nCreated with Three.js\nAll sounds are synthetic');
});

function resetToMenu() {
    gameState = 'menu';
    document.getElementById('menuScreen').classList.remove('hidden');
    document.getElementById('hud').classList.remove('hud-visible');
    document.getElementById('crosshair').classList.remove('crosshair-visible');
    document.getElementById('interactPrompt').classList.add('hidden');
    
    // Reset player
    player.hasKey = false;
    player.canMove = false;
    document.getElementById('keyCount').textContent = '0';
    
    // Reset key if collected
    if (keyObject && !keyObject.parent) {
        scene.add(keyObject);
    }
}

// ==================== ANIMATION LOOP ====================
function animate() {
    requestAnimationFrame(animate);
    
    const delta = Math.min(clock.getDelta(), 0.1);
    
    if (gameState === 'playing') {
        updatePlayer(delta);
        updateInteractPrompt();
        
        // Animate soul particles if visible
        if (particles[0].group.visible) {
            particles[0].ringParticles.forEach((p, idx) => {
                p.position.x = Math.cos(idx + Date.now() * 0.005) * 0.5;
                p.position.y = Math.sin(idx + Date.now() * 0.005) * 0.5;
            });
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

console.log('Game loaded - Click BEGIN NIGHTMARE for cinematic intro');
