// ==================== CONFIGURATION ====================
const CONFIG = {
    WALKING_SPEED: 1.8, // Slow human walk
    SPRINT_SPEED: 4.0,  // Sprinting
    MOUSE_SENSITIVITY: 0.002,
    FOV: 75,
    MASTER_VOLUME: 0.8
};

// ==================== GAME STATE ====================
let scene, camera, renderer;
let gameState = 'loading'; // loading, menu, intro_skyscraper, falling, playing, gameover
let clock = new THREE.Clock();
let mixer = null;

// Player
let player = {
    position: new THREE.Vector3(0, 1.7, 0),
    rotation: { x: 0, y: 0 },
    hasKey: false,
    handParts: 0,
    hasCraftedHand: false,
    handActive: false,
    canMove: false,
    inCutscene: true,
    yVelocity: 0
};

// Controls
let keys = { w: false, a: false, s: false, d: false, space: false, e: false };
let mouseX = 0, mouseY = 0;

// World objects
let flashlight, keyObject, vent, craftingTable, obstacle;
let bodyParts = [];
let magicalHandModel;
let portalRing;
let dripTimer = 0;

// Audio system
const audioSystem = {
    context: null,
    sounds: {},
    init() { this.context = new (window.AudioContext || window.webkitAudioContext)(); },
    async loadSound(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            this.sounds[name] = await this.context.decodeAudioData(arrayBuffer);
        } catch(e) { this.createFallbackSound(name); }
    },
    createFallbackSound(name) {
        const duration = name === 'iseeyou' ? 3 : 2;
        const sampleRate = 44100;
        const buffer = this.context.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);
        for(let i = 0; i < buffer.length; i++) data[i] = (Math.random() - 0.5) * 0.1;
        this.sounds[name] = buffer;
    },
    playSound(name, loop = false, volume = 1.0) {
        if (!this.context || this.context.state === 'suspended') this.context.resume();
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

// ==================== INITIALIZATION ====================
window.addEventListener('load', async () => {
    audioSystem.init();
    await audioSystem.loadSound('ambient', 'assets/sounds/ambient-horror.mp3');
    await audioSystem.loadSound('explosion', 'assets/sounds/explosion.mp3');
    await audioSystem.loadSound('iseeyou', 'assets/sounds/i-see-you.mp3');
    await audioSystem.loadSound('drip', 'assets/sounds/water-drip.mp3');
    await audioSystem.loadSound('magic', 'assets/sounds/spell.mp3');
    
    let progress = 0;
    const loadInterval = setInterval(() => {
        progress += 5;
        document.getElementById('loadingBar').style.width = progress + '%';
        if (progress >= 100) {
            clearInterval(loadInterval);
            document.getElementById('loadingScreen').classList.add('hidden');
            document.getElementById('menuScreen').classList.remove('hidden');
            gameState = 'menu';
            init3D();
        }
    }, 50);
});

function init3D() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020202);
    scene.fog = new THREE.FogExp2(0x020202, 0.04);
    
    camera = new THREE.PerspectiveCamera(CONFIG.FOV, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    // Flashlight
    flashlight = new THREE.SpotLight(0xffeedd, 1.5, 25, Math.PI/5, 0.3, 2);
    flashlight.castShadow = true;
    camera.add(flashlight);
    scene.add(camera);

    const ambient = new THREE.AmbientLight(0x111122);
    scene.add(ambient);

    createSkyscraper();
    createHouse();
    createPlayerHand();

    setupControls();
    animate();
}

// ==================== WORLD GENERATION ====================
function createSkyscraper() {
    // A platform high up in the sky
    const roofGeo = new THREE.BoxGeometry(20, 2, 20);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 98, 0); // High up
    roof.name = "skyscraper_roof";
    scene.add(roof);

    // City lights far below
    const cityMat = new THREE.PointsMaterial({ color: 0xffaa00, size: 0.5 });
    const cityGeo = new THREE.BufferGeometry();
    const cityPts = [];
    for(let i=0; i<1000; i++) {
        cityPts.push((Math.random()-0.5)*200, -10, (Math.random()-0.5)*200);
    }
    cityGeo.setAttribute('position', new THREE.Float32BufferAttribute(cityPts, 3));
    const city = new THREE.Points(cityGeo, cityMat);
    scene.add(city);

    // Magical Portal (Hidden initially)
    const portalGeo = new THREE.TorusGeometry(3, 0.5, 16, 100);
    const portalMat = new THREE.MeshStandardMaterial({ color: 0xaa00ff, emissive: 0x5500aa });
    portalRing = new THREE.Mesh(portalGeo, portalMat);
    portalRing.position.set(0, 15, -10); // Below roof
    portalRing.rotation.x = Math.PI/2;
    portalRing.visible = false;
    scene.add(portalRing);
}

function createHouse() {
    // Create the 3-room layout (Offset on X axis to keep it away from skyscraper drop)
    const houseGroup = new THREE.Group();
    houseGroup.position.set(100, 0, 100); 

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });

    // Floor (20x20)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), floorMat);
    floor.rotation.x = -Math.PI/2;
    houseGroup.add(floor);

    // Outer Walls
    const w1 = new THREE.Mesh(new THREE.BoxGeometry(20, 4, 0.5), wallMat); w1.position.set(0, 2, -10);
    const w2 = new THREE.Mesh(new THREE.BoxGeometry(20, 4, 0.5), wallMat); w2.position.set(0, 2, 10);
    const w3 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 20), wallMat); w3.position.set(-10, 2, 0);
    const w4 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 20), wallMat); w4.position.set(10, 2, 0);
    houseGroup.add(w1, w2, w3, w4);

    // Internal Walls (Divides into Bedroom, Kitchen, Living Room)
    // Horizontal dividing wall
    const intW1 = new THREE.Mesh(new THREE.BoxGeometry(20, 4, 0.5), wallMat);
    intW1.position.set(0, 2, 0);
    houseGroup.add(intW1);
    // Vertical dividing wall (Top half)
    const intW2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 10), wallMat);
    intW2.position.set(0, 2, -5);
    houseGroup.add(intW2);

    // --- 1. BEDROOM (Top Left) ---
    const bed = new THREE.Mesh(new THREE.BoxGeometry(3, 0.8, 4), new THREE.MeshStandardMaterial({ color: 0x331111 }));
    bed.position.set(-7, 0.4, -7);
    houseGroup.add(bed);

    // --- 2. KITCHEN (Top Right) ---
    const counter = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 2), new THREE.MeshStandardMaterial({ color: 0x444444 }));
    counter.position.set(7, 0.6, -8);
    houseGroup.add(counter);

    // --- 3. LIVING ROOM (Bottom Half) ---
    craftingTable = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 2), new THREE.MeshStandardMaterial({ color: 0x3a2a1a }));
    craftingTable.position.set(0, 0.5, 5);
    houseGroup.add(craftingTable);

    // Obstacle blocking vent (Left Corner)
    obstacle = new THREE.Group();
    const chair = new THREE.Mesh(new THREE.BoxGeometry(1, 1.5, 1), new THREE.MeshStandardMaterial({ color: 0x553322 }));
    chair.position.set(-8, 0.75, 8);
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2, 1.2, 1), new THREE.MeshStandardMaterial({ color: 0x443322 }));
    desk.position.set(-8, 0.6, 6.5);
    obstacle.add(chair, desk);
    houseGroup.add(obstacle);

    // Vent (Left Corner wall)
    const ventGeo = new THREE.BoxGeometry(1.5, 1.5, 0.2);
    vent = new THREE.Mesh(ventGeo, new THREE.MeshStandardMaterial({ color: 0x111111 }));
    vent.position.set(-9.8, 1, 8);
    houseGroup.add(vent);

    // --- ITEMS ---
    const partMat = new THREE.MeshStandardMaterial({ color: 0xaa2222, emissive: 0x330000 });
    
    const part1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2), partMat); // Bedroom
    part1.position.set(-3, 0.2, -3);
    
    const part2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2), partMat); // Kitchen
    part2.position.set(6, 1.3, -8); // On counter
    
    const part3 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2), partMat); // Living Room
    part3.position.set(8, 0.2, 8); 

    bodyParts.push(part1, part2, part3);
    houseGroup.add(part1, part2, part3);

    // Normal Small Key
    keyObject = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.1), new THREE.MeshStandardMaterial({ color: 0xaaaa00 }));
    keyObject.position.set(2, 0.1, -2); // Kitchen floor
    houseGroup.add(keyObject);

    scene.add(houseGroup);
}

function createPlayerHand() {
    // The magical severed hand attached to the camera
    magicalHandModel = new THREE.Group();
    
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.1), new THREE.MeshStandardMaterial({ color: 0x776677, emissive: 0x220033 }));
    const fingers = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.1), new THREE.MeshStandardMaterial({ color: 0x554455 }));
    fingers.position.y = 0.35;
    
    magicalHandModel.add(palm, fingers);
    magicalHandModel.position.set(0.5, -0.5, -1); // Bottom right of screen
    magicalHandModel.rotation.x = -Math.PI/4;
    magicalHandModel.visible = false;
    
    camera.add(magicalHandModel);
}

// ==================== CONTROLS & LOGIC ====================
function setupControls() {
    document.addEventListener('mousemove', (e) => {
        if (gameState !== 'playing' && gameState !== 'intro_skyscraper') return;
        if (document.pointerLockElement) {
            mouseX -= e.movementX * CONFIG.MOUSE_SENSITIVITY;
            mouseY -= e.movementY * CONFIG.MOUSE_SENSITIVITY;
            mouseY = Math.max(-Math.PI/2, Math.min(Math.PI/2, mouseY));
            camera.rotation.order = 'YXZ';
            camera.rotation.y = mouseX;
            camera.rotation.x = mouseY;
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.code === 'KeyW') keys.w = true;
        if (e.code === 'KeyS') keys.s = true;
        if (e.code === 'KeyA') keys.a = true;
        if (e.code === 'KeyD') keys.d = true;
        if (e.code === 'Space') keys.space = true;
        if (e.code === 'KeyE' && gameState === 'playing') checkInteraction();
        if (e.code === 'KeyF' && gameState === 'playing') {
            flashlight.visible = !flashlight.visible;
            audioSystem.playSound('ambient', false, 0.2); // Click sound sub
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.code === 'KeyW') keys.w = false;
        if (e.code === 'KeyS') keys.s = false;
        if (e.code === 'KeyA') keys.a = false;
        if (e.code === 'KeyD') keys.d = false;
        if (e.code === 'Space') keys.space = false;
    });

    // Right Click Logic for Magical Hand
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (gameState === 'playing' && player.hasCraftedHand) {
            player.handActive = !player.handActive;
            
            // Animate Hand
            const targetZ = player.handActive ? -2 : -1;
            magicalHandModel.visible = true;
            magicalHandModel.position.z = targetZ;

            // Move Obstacle if active and close
            const worldTablePos = new THREE.Vector3();
            obstacle.getWorldPosition(worldTablePos);
            if (player.handActive && camera.position.distanceTo(worldTablePos) < 4) {
                obstacle.position.z -= 3; // Push it away
                audioSystem.playSound('magic', false, 0.6);
                showCinematicText('PATH CLEARED', 2000);
            }
        }
    });
}

// ==================== CINEMATICS ====================
async function playIntroSequence() {
    const canvas = document.getElementById('gameCanvas');
    canvas.requestPointerLock();
    
    gameState = 'intro_skyscraper';
    audioSystem.playSound('ambient', true, 0.3);

    // 1. SKYSCRAPER DROP
    camera.position.set(0, 100, -8); // Edge of building
    mouseX = 0; mouseY = -0.5; // Look down slightly
    
    await sleep(2000);
    audioSystem.playSound('explosion', false, 1.0);
    
    // Jump/Fall
    player.yVelocity = -0.1;
    gameState = 'falling';
    
    let isFalling = true;
    while(isFalling) {
        player.yVelocity -= 0.02; // Gravity
        camera.position.y += player.yVelocity;
        
        // Show Portal
        if (camera.position.y < 30 && !portalRing.visible) {
            portalRing.visible = true;
        }

        // Enter Portal
        if (camera.position.y < 15) {
            isFalling = false;
        }
        await sleep(20);
    }

    // 2. THE VOID
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x000000, 0.1);
    camera.position.set(0, 500, 0); // Teleport to void
    portalRing.visible = false;
    
    const words = ["wake up....", "wake up......", "wake up........"];
    for (let word of words) {
        showCinematicText(word, 2000);
        await sleep(3000);
    }

    // 3. WAKE UP IN BEDROOM
    gameState = 'playing';
    player.canMove = true;
    scene.background = new THREE.Color(0x020202);
    
    // Teleport to bed location (100-7, 1.7, 100-7)
    camera.position.set(93, 1.7, 93);
    camera.rotation.set(0, 0, 0);
    mouseX = 0; mouseY = 0;
    
    document.getElementById('hud').classList.add('hud-visible');
    document.getElementById('crosshair').classList.add('crosshair-visible');
    document.getElementById('objectiveText').textContent = 'Find parts & key';

    // Start "I See You" loop every 2 minutes (120000 ms)
    setInterval(() => {
        if (gameState === 'playing') audioSystem.playSound('iseeyou', false, 1.0);
    }, 120000);
}

function showCinematicText(text, duration = 3000) {
    const overlay = document.getElementById('cinematicOverlay');
    overlay.innerHTML = `<div class="cinematic-text">${text}</div>`;
    overlay.style.display = 'block';
    setTimeout(() => overlay.style.display = 'none', duration);
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// ==================== INTERACTION & UPDATE ====================
function checkInteraction() {
    const worldPos = new THREE.Vector3();

    // Collect Key
    if (!player.hasKey && keyObject) {
        keyObject.getWorldPosition(worldPos);
        if (camera.position.distanceTo(worldPos) < 2.5) {
            player.hasKey = true;
            keyObject.parent.remove(keyObject);
            document.getElementById('keyCount').textContent = '1';
        }
    }

    // Collect Body Parts
    for (let i = bodyParts.length - 1; i >= 0; i--) {
        const part = bodyParts[i];
        part.getWorldPosition(worldPos);
        if (camera.position.distanceTo(worldPos) < 2.5) {
            player.handParts++;
            part.parent.remove(part);
            bodyParts.splice(i, 1);
            document.getElementById('partCount').textContent = player.handParts;
        }
    }

    // Crafting Spell
    craftingTable.getWorldPosition(worldPos);
    if (camera.position.distanceTo(worldPos) < 3 && player.handParts === 3 && !player.hasCraftedHand) {
        if (!flashlight.visible) {
            showCinematicText('NEED LIGHT TO CAST SPELL', 2000);
            return;
        }
        
        // Cast Spell
        audioSystem.playSound('magic', false, 1.0);
        player.hasCraftedHand = true;
        document.getElementById('objectiveText').textContent = 'Use hand (R-Click) & Escape';
        
        // Spawn particles
        showCinematicText('HAND CRAFTED', 2000);
    }

    // Vent Escape
    vent.getWorldPosition(worldPos);
    if (camera.position.distanceTo(worldPos) < 3) {
        if (!player.hasKey) {
            showCinematicText('VENT LOCKED. NEED KEY.', 2000);
        } else {
            // Escape Sequence
            gameState = 'gameover';
            document.getElementById('bloodOverlay').style.opacity = '1';
            document.getElementById('bloodOverlay').style.background = 'black';
            showCinematicText('YOU ESCAPED...', 5000);
            setTimeout(() => location.reload(), 5000);
        }
    }
}

function updatePlayer(delta) {
    if (gameState !== 'playing' || !player.canMove) return;

    // Slow walk / Space sprint
    const speed = keys.space ? CONFIG.SPRINT_SPEED : CONFIG.WALKING_SPEED;
    const moveDist = speed * delta;

    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0; dir.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();

    const oldPos = camera.position.clone();

    if (keys.w) camera.position.addScaledVector(dir, moveDist);
    if (keys.s) camera.position.addScaledVector(dir, -moveDist);
    if (keys.a) camera.position.addScaledVector(right, -moveDist);
    if (keys.d) camera.position.addScaledVector(right, moveDist);

    // Simple bounds (House offset is X:100, Z:100. Size is 20x20 so +/- 10)
    if (camera.position.x < 91 || camera.position.x > 109 || camera.position.z < 91 || camera.position.z > 109) {
        camera.position.copy(oldPos); 
    }
}

// ==================== MAIN LOOP ====================
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (gameState === 'intro_skyscraper') {
        // Rotate portal ring
        portalRing.rotation.z += delta;
    }

    if (gameState === 'playing') {
        updatePlayer(delta);

        // Water drip ambient logic
        dripTimer -= delta;
        if (dripTimer <= 0) {
            audioSystem.playSound('drip', false, 0.3);
            dripTimer = Math.random() * 3 + 2; // Every 2-5 secs
        }
    }

    renderer.render(scene, camera);
}

document.getElementById('playBtn').addEventListener('click', () => {
    document.getElementById('menuScreen').classList.add('hidden');
    playIntroSequence();
});
