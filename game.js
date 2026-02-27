// ==================== INITIALIZATION ====================
let scene, camera, renderer, controls;
let gameState = 'loading'; // loading, menu, difficulty, playing, gameover
let selectedDifficulty = 'normal';
let clock = new THREE.Clock();

// Player variables
let player = {
    health: 100,
    battery: 100,
    keys: 0,
    speed: 5,
    sprinting: false
};

// Key states
let keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false
};

// Mouse movement
let mouseX = 0, mouseY = 0;
let mouseSensitivity = 0.002;

// Game objects
let flashlight, enemy, door, exitDoor;
let keys_collectibles = [];
let enemyTargetPosition = new THREE.Vector3();
let gameTime = 0;

// Colors (customizable)
const COLORS = {
    EASY: 0x00ff00,
    NORMAL: 0xffff00,
    HARD: 0xff6600,
    NIGHTMARE: 0xff0000,
    BLOOD: 0x8b0000,
    FLASHLIGHT: 0xffeedd,
    SHADOW: 0x050505
};

// ==================== LOADING SEQUENCE ====================
window.addEventListener('load', () => {
    console.log('Game starting...');
    
    let progress = 0;
    const loadingBar = document.getElementById('loadingProgress');
    const loadingTip = document.getElementById('loadingTip');
    
    const tips = [
        'Stay in the light...',
        'Your flashlight battery is limited',
        'Find all 3 keys to escape',
        'Something is watching you...',
        'Running attracts attention',
        'Doors can save your life',
        'The nightmare is real',
        'Don\'t look back',
        'Hide if you can',
        'The monster gets faster at night'
    ];
    
    // Simulate loading
    const loadInterval = setInterval(() => {
        progress += Math.random() * 10;
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
    }, 200);
});

// ==================== GAME INITIALIZATION ====================
function initGame() {
    console.log('Initializing 3D scene...');
    
    // Setup scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.FogExp2(0x050505, 0.02);
    
    // Setup camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.7, 5);
    
    // Setup renderer
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // Setup basic lighting
    setupLighting();
    
    // Create environment
    createEnvironment();
    
    // Create enemy
    createEnemy();
    
    // Create house with door
    createHouse();
    
    // Create keys
    createKeys();
    
    // Create exit door
    createExit();
    
    // Setup controls
    setupControls();
    
    // Start animation loop
    animate();
    
    console.log('Game initialized!');
}

// ==================== LIGHTING ====================
function setupLighting() {
    // Ambient light (very dim)
    const ambient = new THREE.AmbientLight(0x111122);
    scene.add(ambient);
    
    // Player flashlight
    flashlight = new THREE.SpotLight(0xffeedd, 2, 30, Math.PI / 6, 0.5, 2);
    flashlight.castShadow = true;
    flashlight.shadow.mapSize.width = 1024;
    flashlight.shadow.mapSize.height = 1024;
    flashlight.position.set(0, 1.5, 0);
    camera.add(flashlight);
    
    // Add some atmospheric lights
    const pointLight1 = new THREE.PointLight(0x220000, 0.5, 30);
    pointLight1.position.set(10, 2, 10);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0x002200, 0.3, 30);
    pointLight2.position.set(-10, 2, -10);
    scene.add(pointLight2);
    
    scene.add(camera);
}

// ==================== ENVIRONMENT ====================
function createEnvironment() {
    // Ground
    const groundGeometry = new THREE.CircleGeometry(100, 64);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a1a,
        roughness: 0.8,
        metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Trees (simple cylinders)
    for (let i = 0; i < 20; i++) {
        const treeGroup = new THREE.Group();
        
        const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 3);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x442200 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 1.5;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        treeGroup.add(trunk);
        
        const leavesGeo = new THREE.ConeGeometry(0.8, 1.5, 8);
        const leavesMat = new THREE.MeshStandardMaterial({ color: 0x112200 });
        const leaves = new THREE.Mesh(leavesGeo, leavesMat);
        leaves.position.y = 3;
        leaves.castShadow = true;
        leaves.receiveShadow = true;
        treeGroup.add(leaves);
        
        const angle = (i / 20) * Math.PI * 2;
        const radius = 20 + Math.random() * 20;
        treeGroup.position.set(
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius
        );
        
        scene.add(treeGroup);
    }
    
    // Random rocks
    for (let i = 0; i < 30; i++) {
        const rockGeo = new THREE.DodecahedronGeometry(Math.random() * 0.5 + 0.2);
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const rock = new THREE.Mesh(rockGeo, rockMat);
        
        const angle = Math.random() * Math.PI * 2;
        const radius = 10 + Math.random() * 25;
        rock.position.set(
            Math.cos(angle) * radius,
            0.2,
            Math.sin(angle) * radius
        );
        rock.castShadow = true;
        rock.receiveShadow = true;
        scene.add(rock);
    }
}

// ==================== ENEMY ====================
function createEnemy() {
    const enemyGroup = new THREE.Group();
    
    // Body
    const bodyGeo = new THREE.CylinderGeometry(0.7, 0.8, 2.2, 6);
    const bodyMat = new THREE.MeshStandardMaterial({ 
        color: 0x080808,
        emissive: 0x220000
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.1;
    body.castShadow = true;
    body.receiveShadow = true;
    enemyGroup.add(body);
    
    // Head
    const headGeo = new THREE.ConeGeometry(0.6, 0.9, 6);
    const headMat = new THREE.MeshStandardMaterial({ 
        color: 0x000000,
        emissive: 0x330000
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.5;
    head.castShadow = true;
    head.receiveShadow = true;
    enemyGroup.add(head);
    
    // Eyes (glowing based on difficulty)
    const eyeGeo = new THREE.SphereGeometry(0.15, 6);
    const eyeMat = new THREE.MeshStandardMaterial({ 
        color: 0xff0000,
        emissive: 0x550000
    });
    
    const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
    eye1.position.set(0.2, 2.6, 0.4);
    enemyGroup.add(eye1);
    
    const eye2 = new THREE.Mesh(eyeGeo, eyeMat);
    eye2.position.set(-0.2, 2.6, 0.4);
    enemyGroup.add(eye2);
    
    // Arms
    const armGeo = new THREE.CylinderGeometry(0.15, 0.15, 1.5);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    
    const arm1 = new THREE.Mesh(armGeo, armMat);
    arm1.position.set(0.9, 1.8, 0);
    arm1.rotation.z = 0.3;
    arm1.castShadow = true;
    enemyGroup.add(arm1);
    
    const arm2 = new THREE.Mesh(armGeo, armMat);
    arm2.position.set(-0.9, 1.8, 0);
    arm2.rotation.z = -0.3;
    arm2.castShadow = true;
    enemyGroup.add(arm2);
    
    enemy = enemyGroup;
    enemy.position.set(25, 0, 20);
    scene.add(enemy);
}

// ==================== HOUSE ====================
function createHouse() {
    const houseGroup = new THREE.Group();
    houseGroup.position.set(15, 0, 0);
    
    // Floor
    const floorGeo = new THREE.BoxGeometry(8, 0.2, 8);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x332211 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.1;
    floor.receiveShadow = true;
    floor.castShadow = true;
    houseGroup.add(floor);
    
    // Walls (wood)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x4a2c1a });
    
    // Back wall
    const backWall = new THREE.BoxGeometry(8, 3, 0.3);
    const backMesh = new THREE.Mesh(backWall, wallMat);
    backMesh.position.set(0, 1.5, 3.85);
    backMesh.castShadow = true;
    backMesh.receiveShadow = true;
    houseGroup.add(backMesh);
    
    // Left wall
    const leftWall = new THREE.BoxGeometry(0.3, 3, 8);
    const leftMesh = new THREE.Mesh(leftWall, wallMat);
    leftMesh.position.set(-3.85, 1.5, 0);
    leftMesh.castShadow = true;
    leftMesh.receiveShadow = true;
    houseGroup.add(leftMesh);
    
    // Right wall
    const rightWall = new THREE.BoxGeometry(0.3, 3, 8);
    const rightMesh = new THREE.Mesh(rightWall, wallMat);
    rightMesh.position.set(3.85, 1.5, 0);
    rightMesh.castShadow = true;
    rightMesh.receiveShadow = true;
    houseGroup.add(rightMesh);
    
    // Front walls (with door space)
    const frontLeft = new THREE.BoxGeometry(3, 3, 0.3);
    const frontLeftMesh = new THREE.Mesh(frontLeft, wallMat);
    frontLeftMesh.position.set(-2.5, 1.5, -3.85);
    frontLeftMesh.castShadow = true;
    frontLeftMesh.receiveShadow = true;
    houseGroup.add(frontLeftMesh);
    
    const frontRight = new THREE.BoxGeometry(3, 3, 0.3);
    const frontRightMesh = new THREE.Mesh(frontRight, wallMat);
    frontRightMesh.position.set(2.5, 1.5, -3.85);
    frontRightMesh.castShadow = true;
    frontRightMesh.receiveShadow = true;
    houseGroup.add(frontRightMesh);
    
    // Roof
    const roofGeo = new THREE.ConeGeometry(5, 1.5, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 3.5, 0);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    roof.receiveShadow = true;
    houseGroup.add(roof);
    
    // Door
    const doorGeo = new THREE.BoxGeometry(1.5, 2.2, 0.2);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x5d3a1a });
    door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 1.1, -3.7);
    door.castShadow = true;
    door.receiveShadow = true;
    houseGroup.add(door);
    
    // Door handle
    const handleGeo = new THREE.SphereGeometry(0.1, 8);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, emissive: 0x111111 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0.5, 1.1, -3.5);
    handle.castShadow = true;
    houseGroup.add(handle);
    
    scene.add(houseGroup);
}

// ==================== KEYS ====================
function createKeys() {
    for (let i = 0; i < 3; i++) {
        const keyGroup = new THREE.Group();
        
        // Key head
        const headGeo = new THREE.TorusGeometry(0.2, 0.05, 8, 16, Math.PI / 2);
        const headMat = new THREE.MeshStandardMaterial({ 
            color: 0xffaa00,
            emissive: 0x442200
        });
        const head = new THREE.Mesh(headGeo, headMat);
        head.rotation.x = Math.PI / 2;
        head.rotation.z = Math.PI / 2;
        keyGroup.add(head);
        
        // Key shaft
        const shaftGeo = new THREE.BoxGeometry(0.05, 0.3, 0.1);
        const shaftMat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
        const shaft = new THREE.Mesh(shaftGeo, shaftMat);
        shaft.position.set(0, 0.25, 0);
        keyGroup.add(shaft);
        
        // Key teeth
        const toothGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const toothMat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
        const tooth = new THREE.Mesh(toothGeo, toothMat);
        tooth.position.set(0, 0.45, 0);
        keyGroup.add(tooth);
        
        // Position keys in different locations
        const positions = [
            { x: 5, y: 1, z: 5 },      // Near start
            { x: -5, y: 1, z: -5 },     // Far left
            { x: 10, y: 1, z: -10 }     // Behind house
        ];
        
        keyGroup.position.set(positions[i].x, positions[i].y, positions[i].z);
        keyGroup.castShadow = true;
        
        keys_collectibles.push(keyGroup);
        scene.add(keyGroup);
    }
}

// ==================== EXIT ====================
function createExit() {
    const exitGroup = new THREE.Group();
    exitGroup.position.set(-20, 0, 0);
    
    // Portal effect
    const portalGeo = new THREE.TorusGeometry(1, 0.2, 16, 32);
    const portalMat = new THREE.MeshStandardMaterial({ 
        color: 0x00ff00,
        emissive: 0x004400
    });
    exitDoor = new THREE.Mesh(portalGeo, portalMat);
    exitDoor.rotation.x = Math.PI / 2;
    exitGroup.add(exitDoor);
    
    // Inner glow
    const glowGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 16);
    const glowMat = new THREE.MeshStandardMaterial({ 
        color: 0x00ff00,
        emissive: 0x00aa00,
        transparent: true,
        opacity: 0.5
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.y = 0.1;
    exitGroup.add(glow);
    
    scene.add(exitGroup);
}

// ==================== CONTROLS ====================
function setupControls() {
    // Mouse movement for looking
    document.addEventListener('mousemove', (e) => {
        if (gameState === 'playing' && document.pointerLockElement) {
            mouseX += e.movementX * mouseSensitivity;
            mouseY += e.movementY * mouseSensitivity;
            mouseY = Math.max(-Math.PI/2, Math.min(Math.PI/2, mouseY));
            
            camera.rotation.order = 'YXZ';
            camera.rotation.y = -mouseX;
            camera.rotation.x = -mouseY;
        }
    });
    
    // Keyboard down
    document.addEventListener('keydown', (e) => {
        if (gameState !== 'playing') return;
        
        switch(e.code) {
            case 'KeyW': keys.w = true; e.preventDefault(); break;
            case 'KeyA': keys.a = true; e.preventDefault(); break;
            case 'KeyS': keys.s = true; e.preventDefault(); break;
            case 'KeyD': keys.d = true; e.preventDefault(); break;
            case 'ShiftLeft': 
                keys.shift = true;
                player.speed = selectedDifficulty === 'nightmare' ? 7 : 8;
                e.preventDefault();
                break;
            case 'KeyE':
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
            case 'ShiftLeft':
                keys.shift = false;
                player.speed = selectedDifficulty === 'nightmare' ? 3.5 : 5;
                e.preventDefault();
                break;
        }
    });
    
    // Pointer lock on canvas click
    renderer.domElement.addEventListener('click', () => {
        if (gameState === 'playing') {
            renderer.domElement.requestPointerLock();
        }
    });
}

// ==================== MENU BUTTONS ====================
document.getElementById('playBtn').addEventListener('click', () => {
    document.getElementById('menuScreen').classList.add('hidden');
    document.getElementById('difficultyScreen').classList.remove('hidden');
    gameState = 'difficulty';
});

document.getElementById('settingsBtn').addEventListener('click', () => {
    alert('Settings - Mouse Sensitivity: ' + mouseSensitivity.toFixed(3));
});

document.getElementById('creditsBtn').addEventListener('click', () => {
    alert('NIGHTMARE PROTOCOL\nCreated with Three.js\nA horror experience');
});

// Difficulty selection
document.getElementById('easyBtn').addEventListener('click', () => {
    selectedDifficulty = 'easy';
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.style.transform = 'scale(1)';
    });
    document.getElementById('easyBtn').style.transform = 'scale(1.1)';
    player.speed = 6;
    updateColors(COLORS.EASY);
});

document.getElementById('normalBtn').addEventListener('click', () => {
    selectedDifficulty = 'normal';
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.style.transform = 'scale(1)';
    });
    document.getElementById('normalBtn').style.transform = 'scale(1.1)';
    player.speed = 5;
    updateColors(COLORS.NORMAL);
});

document.getElementById('hardBtn').addEventListener('click', () => {
    selectedDifficulty = 'hard';
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.style.transform = 'scale(1)';
    });
    document.getElementById('hardBtn').style.transform = 'scale(1.1)';
    player.speed = 4;
    updateColors(COLORS.HARD);
});

document.getElementById('nightmareBtn').addEventListener('click', () => {
    selectedDifficulty = 'nightmare';
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.style.transform = 'scale(1)';
    });
    document.getElementById('nightmareBtn').style.transform = 'scale(1.1)';
    player.speed = 3.5;
    updateColors(COLORS.NIGHTMARE);
});

document.getElementById('startGameBtn').addEventListener('click', () => {
    document.getElementById('difficultyScreen').classList.add('hidden');
    gameState = 'playing';
    renderer.domElement.requestPointerLock();
    resetGame();
});

// Game over buttons
document.getElementById('retryBtn').addEventListener('click', () => {
    document.getElementById('gameOverScreen').classList.add('hidden');
    gameState = 'playing';
    renderer.domElement.requestPointerLock();
    resetGame();
});

document.getElementById('mainMenuBtn').addEventListener('click', () => {
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('menuScreen').classList.remove('hidden');
    gameState = 'menu';
});

// ==================== GAME FUNCTIONS ====================
function updateColors(color) {
    // Change flashlight color based on difficulty
    if (flashlight) {
        flashlight.color.setHex(color);
    }
    
    // Change crosshair color
    const crosshair = document.querySelector('.crosshair');
    if (crosshair) {
        crosshair.style.borderColor = '#' + color.toString(16).padStart(6, '0');
    }
}

function checkInteraction() {
    // Check door interaction
    if (door) {
        const doorPos = door.getWorldPosition(new THREE.Vector3());
        const distance = camera.position.distanceTo(doorPos);
        
        if (distance < 3) {
            // Teleport into house
            camera.position.set(15, 1.7, 2);
            showMessage('Entered house');
        }
    }
    
    // Check key collection
    for (let i = keys_collectibles.length - 1; i >= 0; i--) {
        const key = keys_collectibles[i];
        const distance = camera.position.distanceTo(key.position);
        
        if (distance < 2) {
            scene.remove(key);
            keys_collectibles.splice(i, 1);
            player.keys++;
            document.getElementById('keysCount').textContent = player.keys;
            showMessage('Key collected! ' + player.keys + '/3');
            
            // Play collection effect
            createCollectionEffect(key.position);
        }
    }
    
    // Check exit if all keys collected
    if (exitDoor && player.keys === 3) {
        const exitPos = exitDoor.getWorldPosition(new THREE.Vector3());
        const distance = camera.position.distanceTo(exitPos);
        
        if (distance < 3) {
            win();
        }
    }
}

function createCollectionEffect(position) {
    const particleGeo = new THREE.BufferGeometry();
    const particleCount = 20;
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 2;
        positions[i+1] = (Math.random() - 0.5) * 2;
        positions[i+2] = (Math.random() - 0.5) * 2;
    }
    
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particleMat = new THREE.PointsMaterial({ color: 0xffaa00, size: 0.1 });
    const particles = new THREE.Points(particleGeo, particleMat);
    particles.position.copy(position);
    
    scene.add(particles);
    
    setTimeout(() => {
        scene.remove(particles);
    }, 1000);
}

function showMessage(text) {
    const prompt = document.getElementById('interactPrompt');
    prompt.textContent = text;
    prompt.classList.remove('hidden');
    
    setTimeout(() => {
        prompt.classList.add('hidden');
    }, 2000);
}

function updatePlayer(delta) {
    if (!camera || gameState !== 'playing') return;
    
    const moveSpeed = player.speed * delta * 10;
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
    
    // Keep player on ground
    camera.position.y = 1.7;
}

function updateEnemy(delta) {
    if (!enemy || !camera || gameState !== 'playing') return;
    
    const distance = enemy.position.distanceTo(camera.position);
    
    // Enemy speed based on difficulty
    let chaseSpeed = 1.5 * delta;
    switch(selectedDifficulty) {
        case 'easy': chaseSpeed *= 0.3; break;
        case 'normal': chaseSpeed *= 0.5; break;
        case 'hard': chaseSpeed *= 0.8; break;
        case 'nightmare': chaseSpeed *= 1.2; break;
    }
    
    if (distance < 30) {
        // Move towards player
        const direction = new THREE.Vector3().subVectors(camera.position, enemy.position).normalize();
        enemy.position.addScaledVector(direction, chaseSpeed);
        
        // Look at player
        enemy.lookAt(camera.position);
        
        // Update enemy color based on distance
        const eyeMaterial = enemy.children[1]?.children[0]?.material;
        if (eyeMaterial) {
            const intensity = 1 - (distance / 30);
            eyeMaterial.emissive.setHSL(0, 1, intensity * 0.5);
        }
        
        // Game over condition
        if (distance < 2.5) {
            gameOver();
        }
    }
    
    // Random enemy sounds (visual feedback)
    if (Math.random() < 0.001) {
        enemy.children.forEach(child => {
            if (child.material) {
                child.material.emissive.setHex(0x550000);
                setTimeout(() => {
                    child.material.emissive.setHex(0x220000);
                }, 100);
            }
        });
    }
}

function updateBattery(delta) {
    player.battery -= delta * 0.5;
    if (player.battery < 0) player.battery = 0;
    
    const batteryLevel = document.getElementById('batteryLevel');
    batteryLevel.style.width = player.battery + '%';
    
    // Battery color based on level
    if (player.battery > 50) {
        batteryLevel.style.background = '#00ff00';
    } else if (player.battery > 20) {
        batteryLevel.style.background = '#ffff00';
        batteryLevel.classList.add('warning');
    } else {
        batteryLevel.style.background = '#ff0000';
        batteryLevel.classList.add('danger');
        
        // Flicker flashlight
        if (flashlight) {
            flashlight.intensity = 1 + Math.sin(Date.now() * 0.1) * 0.5;
        }
    }
    
    if (player.battery <= 0) {
        flashlight.intensity = 0;
    }
}

function gameOver() {
    gameState = 'gameover';
    document.exitPointerLock();
    document.getElementById('gameOverScreen').classList.remove('hidden');
    
    // Flash effect
    document.body.style.backgroundColor = '#ff0000';
    setTimeout(() => {
        document.body.style.backgroundColor = '';
    }, 200);
}

function win() {
    alert('YOU ESCAPED! Congratulations!');
    gameState = 'menu';
    document.getElementById('menuScreen').classList.remove('hidden');
    resetGame();
}

function resetGame() {
    player = {
        health: 100,
        battery: 100,
        keys: 0,
        speed: 5,
        sprinting: false
    };
    
    document.getElementById('keysCount').textContent = '0';
    document.getElementById('batteryLevel').style.width = '100%';
    
    camera.position.set(0, 1.7, 5);
    enemy.position.set(25, 0, 20);
    
    // Recreate keys
    keys_collectibles.forEach(key => scene.remove(key));
    keys_collectibles = [];
    createKeys();
}

// ==================== ANIMATION LOOP ====================
function animate() {
    requestAnimationFrame(animate);
    
    const delta = Math.min(clock.getDelta(), 0.1);
    gameTime += delta;
    
    if (gameState === 'playing') {
        updatePlayer(delta);
        updateEnemy(delta);
        updateBattery(delta);
        
        // Rotate keys
        keys_collectibles.forEach(key => {
            key.rotation.y += delta * 2;
        });
        
        // Animate exit door
        if (exitDoor) {
            exitDoor.rotation.y += delta * 2;
        }
        
        // Show interact prompt near objects
        let nearObject = false;
        
        // Check near door
        if (door) {
            const doorPos = door.getWorldPosition(new THREE.Vector3());
            if (camera.position.distanceTo(doorPos) < 3) {
                nearObject = true;
            }
        }
        
        // Check near keys
        keys_collectibles.forEach(key => {
            if (camera.position.distanceTo(key.position) < 2) {
                nearObject = true;
            }
        });
        
        // Check near exit
        if (exitDoor && player.keys === 3) {
            const exitPos = exitDoor.getWorldPosition(new THREE.Vector3());
            if (camera.position.distanceTo(exitPos) < 3) {
                nearObject = true;
            }
        }
        
        const prompt = document.getElementById('interactPrompt');
        if (nearObject) {
            prompt.classList.remove('hidden');
        } else {
            prompt.classList.add('hidden');
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

console.log('Game loaded - Use mouse to look, WASD to move, E to interact');
