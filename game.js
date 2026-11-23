/**
 * Enjin Permainan Larian Sifir 3D (Temple Runner Math Edition)
 * Menggunakan Three.js untuk rendering 3D, fizik lorong, dan interaksi.
 */

class SifirRunnerGame {
    constructor() {
        this.container = document.getElementById('game-container');
        this.mathEngine = new MathEngine();
        this.sound = new SoundEffects();

        // Tetapan Permainan
        this.state = 'START'; // 'START', 'PLAYING', 'PAUSED', 'GAMEOVER'
        this.lanes = [-2.3, 2.3]; // 0: Kiri (-2.3), 1: Kanan (+2.3)
        this.currentLane = 0; // Mula di lorong kiri secara rawak
        this.targetLaneX = this.lanes[0];
        this.playerX = this.lanes[0];
        this.playerY = 0;
        this.laneTransitionSpeed = 16.0;

        // Kelajuan & Kesukaran
        this.baseSpeed = 22.0; // kelajuan larian unit sesaat
        this.currentSpeed = this.baseSpeed;
        this.speedMultiplier = 1.0;

        // Statistik Pemain
        this.score = 0;
        this.coins = 0;
        this.lives = 3;
        this.maxLives = 3;
        this.combo = 1;
        this.maxCombo = 1;
        this.totalQuestions = 0;
        this.correctCount = 0;
        this.wrongMistakes = []; // Simpan rekod soalan salah untuk ulangkaji

        // Entiti 3D
        this.roadSegments = [];
        this.sceneryObjects = [];
        this.gates = [];
        this.coins3D = [];
        this.particles = [];
        this.activeGate = null;

        // Masa & Animasi
        this.clock = new THREE.Clock();
        this.runCycle = 0;
        this.shakeTime = 0;
        this.shakeIntensity = 0;

        this.initThree();
        this.buildEnvironment();
        this.buildPlayer();
        this.setupEventListeners();
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    // --- INISIALISASI THREE.JS ---
    initThree() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a2634); // Warna langit senja kembara rimba
        this.scene.fog = new THREE.FogExp2(0x1a2634, 0.015);

        // Camera
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 300);
        this.cameraBasePos = new THREE.Vector3(0, 3.8, 6.5);
        this.camera.position.copy(this.cameraBasePos);
        this.camera.lookAt(0, 1.8, -12);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Pencahayaan (Lighting)
        const ambientLight = new THREE.AmbientLight(0xfff5e6, 0.65);
        this.scene.add(ambientLight);

        this.dirLight = new THREE.DirectionalLight(0xffdf99, 1.1);
        this.dirLight.position.set(20, 40, 20);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.width = 1024;
        this.dirLight.shadow.mapSize.height = 1024;
        this.dirLight.shadow.camera.near = 0.5;
        this.dirLight.shadow.camera.far = 150;
        const d = 25;
        this.dirLight.shadow.camera.left = -d;
        this.dirLight.shadow.camera.right = d;
        this.dirLight.shadow.camera.top = d;
        this.dirLight.shadow.camera.bottom = -d;
        this.scene.add(this.dirLight);

        // Lampu lembut hadapan
        const frontHemi = new THREE.HemisphereLight(0x73a9c2, 0x3d2817, 0.4);
        this.scene.add(frontHemi);

        // Handle resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    // --- TEKSTUR PROCEDURAL KANVAS ---
    createStoneTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Latar batu purba
        ctx.fillStyle = '#4a5043';
        ctx.fillRect(0, 0, 512, 512);

        // Corak batu bata/turap kuil
        ctx.strokeStyle = '#2d3327';
        ctx.lineWidth = 6;
        const rows = 8;
        const cols = 4;
        const rh = 512 / rows;
        const cw = 512 / cols;

        for (let r = 0; r < rows; r++) {
            const offset = (r % 2) * (cw / 2);
            for (let c = -1; c <= cols; c++) {
                const x = c * cw + offset;
                const y = r * rh;
                ctx.strokeRect(x, y, cw, rh);

                // Tekstur bintik batu & lumut
                ctx.fillStyle = Math.random() > 0.5 ? 'rgba(70,90,55,0.25)' : 'rgba(25,25,25,0.2)';
                ctx.fillRect(x + 4, y + 4, cw - 8, rh - 8);
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }

    // --- ALAM SEKITAR (TEMPLE ENVIRONMENT) ---
    buildEnvironment() {
        const stoneTex = this.createStoneTexture();
        stoneTex.repeat.set(2, 8);

        this.roadMat = new THREE.MeshStandardMaterial({
            map: stoneTex,
            roughness: 0.85,
            metalness: 0.1
        });

        this.wallMat = new THREE.MeshStandardMaterial({
            color: 0x3b4136,
            roughness: 0.9
        });

        this.pillarMat = new THREE.MeshStandardMaterial({
            color: 0x6e6858,
            roughness: 0.8
        });

        this.goldMat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            metalness: 0.85,
            roughness: 0.25,
            emissive: 0x553300
        });

        // Hasilkan 5 segmen jalan raya gelung (panjang 50 unit setiap satu = 250 unit panjang)
        this.segmentLength = 50;
        this.numSegments = 5;

        for (let i = 0; i < this.numSegments; i++) {
            const segmentGroup = new THREE.Group();
            const zPos = -i * this.segmentLength;

            // Lantai Jalan (Lebar 8 unit, muat 2 lorong selesa)
            const floorGeo = new THREE.PlaneGeometry(8, this.segmentLength);
            const floor = new THREE.Mesh(floorGeo, this.roadMat);
            floor.rotation.x = -Math.PI / 2;
            floor.receiveShadow = true;
            segmentGroup.add(floor);

            // Garisan Pembahagi Lorong Emas Purba di tengah
            const lineGeo = new THREE.PlaneGeometry(0.2, this.segmentLength);
            const lineMat = new THREE.MeshBasicMaterial({ color: 0xe6b800 });
            const line = new THREE.Mesh(lineGeo, lineMat);
            line.rotation.x = -Math.PI / 2;
            line.position.y = 0.02;
            segmentGroup.add(line);

            // Tembok Tepi Batu (Side Rails)
            const wallGeo = new THREE.BoxGeometry(0.8, 1.2, this.segmentLength);
            const leftWall = new THREE.Mesh(wallGeo, this.wallMat);
            leftWall.position.set(-4.4, 0.6, 0);
            leftWall.receiveShadow = true;
            leftWall.castShadow = true;
            segmentGroup.add(leftWall);

            const rightWall = new THREE.Mesh(wallGeo, this.wallMat);
            rightWall.position.set(4.4, 0.6, 0);
            rightWall.receiveShadow = true;
            rightWall.castShadow = true;
            segmentGroup.add(rightWall);

            // Tiang Kuil Purba & Obor Menyala di kiri dan kanan
            const pillarInterval = 12.5;
            for (let pz = -this.segmentLength / 2; pz < this.segmentLength / 2; pz += pillarInterval) {
                // Tiang Kiri & Kanan
                const pillarGeo = new THREE.CylinderGeometry(0.35, 0.45, 4.2, 8);
                const pLeft = new THREE.Mesh(pillarGeo, this.pillarMat);
                pLeft.position.set(-4.6, 2.1, pz);
                pLeft.castShadow = true;
                segmentGroup.add(pLeft);

                const pRight = new THREE.Mesh(pillarGeo, this.pillarMat);
                pRight.position.set(4.6, 2.1, pz);
                pRight.castShadow = true;
                segmentGroup.add(pRight);

                // Kepala obor api
                const torchGeo = new THREE.DodecahedronGeometry(0.25);
                const torchMat = new THREE.MeshBasicMaterial({ color: 0xff7700 });
                const tLeft = new THREE.Mesh(torchGeo, torchMat);
                tLeft.position.set(-4.6, 4.2, pz);
                segmentGroup.add(tLeft);

                const tRight = new THREE.Mesh(torchGeo, torchMat);
                tRight.position.set(4.6, 4.2, pz);
                segmentGroup.add(tRight);

                // Pokok Rimba Purba di luar tembok
                this.addJungleFoliage(segmentGroup, -7.5, pz + (Math.random() * 4 - 2));
                this.addJungleFoliage(segmentGroup, 7.5, pz + (Math.random() * 4 - 2));
            }

            segmentGroup.position.z = zPos;
            this.scene.add(segmentGroup);
            this.roadSegments.push(segmentGroup);
        }
    }

    addJungleFoliage(parentGroup, x, z) {
        const treeGroup = new THREE.Group();
        treeGroup.position.set(x, 0, z);

        // Batang pokok
        const trunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 4.5, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3219, roughness: 0.9 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 2.25;
        treeGroup.add(trunk);

        // Daun rimbun (3 kon berlapis)
        const leafMat = new THREE.MeshStandardMaterial({
            color: Math.random() > 0.5 ? 0x245524 : 0x1d471d,
            roughness: 0.8
        });

        for (let l = 0; l < 3; l++) {
            const coneGeo = new THREE.ConeGeometry(1.8 - l * 0.35, 2.0, 7);
            const cone = new THREE.Mesh(coneGeo, leafMat);
            cone.position.y = 3.6 + l * 1.1;
            treeGroup.add(cone);
        }

        parentGroup.add(treeGroup);
    }

    // --- KARAKTER PELARI 3D (EXPLORER RUNNER) ---
    buildPlayer() {
        this.player = new THREE.Group();

        // 1. Badan / Torso (Baju peneroka kembara)
        const torsoGeo = new THREE.BoxGeometry(0.9, 1.1, 0.6);
        const torsoMat = new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.7 }); // Khaki safari
        this.playerTorso = new THREE.Mesh(torsoGeo, torsoMat);
        this.playerTorso.position.y = 1.35;
        this.playerTorso.castShadow = true;
        this.player.add(this.playerTorso);

        // Beg galas kembara (Backpack)
        const packGeo = new THREE.BoxGeometry(0.7, 0.8, 0.4);
        const packMat = new THREE.MeshStandardMaterial({ color: 0x654321 });
        const pack = new THREE.Mesh(packGeo, packMat);
        pack.position.set(0, 0.05, 0.42);
        this.playerTorso.add(pack);

        // 2. Kepala (Head)
        const headGeo = new THREE.SphereGeometry(0.38, 12, 12);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xf5cda4, roughness: 0.6 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(0, 0.88, 0);
        head.castShadow = true;
        this.playerTorso.add(head);

        // Topi Kembara Safari (Explorer Hat)
        const hatBrimGeo = new THREE.CylinderGeometry(0.68, 0.68, 0.08, 16);
        const hatMat = new THREE.MeshStandardMaterial({ color: 0x556b2f }); // Olive green
        const hatBrim = new THREE.Mesh(hatBrimGeo, hatMat);
        hatBrim.position.set(0, 0.28, 0);
        head.add(hatBrim);

        const hatCrownGeo = new THREE.CylinderGeometry(0.38, 0.44, 0.35, 12);
        const hatCrown = new THREE.Mesh(hatCrownGeo, hatMat);
        hatCrown.position.set(0, 0.45, 0);
        head.add(hatCrown);

        // 3. Kaki Kiri & Kanan (Pivoted Legs)
        const legGeo = new THREE.BoxGeometry(0.3, 0.85, 0.35);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x3d312a }); // Seluar kembara gelap
        const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1f1610 });

        // Kaki Kiri
        this.leftLegPivot = new THREE.Group();
        this.leftLegPivot.position.set(-0.26, 0.85, 0);
        const leftLegMesh = new THREE.Mesh(legGeo, legMat);
        leftLegMesh.position.y = -0.42;
        leftLegMesh.castShadow = true;
        this.leftLegPivot.add(leftLegMesh);

        const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.48), shoeMat);
        leftShoe.position.set(0, -0.8, -0.06);
        this.leftLegPivot.add(leftShoe);
        this.player.add(this.leftLegPivot);

        // Kaki Kanan
        this.rightLegPivot = new THREE.Group();
        this.rightLegPivot.position.set(0.26, 0.85, 0);
        const rightLegMesh = new THREE.Mesh(legGeo, legMat);
        rightLegMesh.position.y = -0.42;
        rightLegMesh.castShadow = true;
        this.rightLegPivot.add(rightLegMesh);

        const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.48), shoeMat);
        rightShoe.position.set(0, -0.8, -0.06);
        this.rightLegPivot.add(rightShoe);
        this.player.add(this.rightLegPivot);

        // 4. Lengan Kiri & Kanan (Pivoted Arms)
        const armGeo = new THREE.BoxGeometry(0.24, 0.75, 0.24);
        const armMat = new THREE.MeshStandardMaterial({ color: 0xd2b48c });

        this.leftArmPivot = new THREE.Group();
        this.leftArmPivot.position.set(-0.58, 0.45, 0);
        const leftArmMesh = new THREE.Mesh(armGeo, armMat);
        leftArmMesh.position.y = -0.35;
        this.leftArmPivot.add(leftArmMesh);
        this.playerTorso.add(this.leftArmPivot);

        this.rightArmPivot = new THREE.Group();
        this.rightArmPivot.position.set(0.58, 0.45, 0);
        const rightArmMesh = new THREE.Mesh(armGeo, armMat);
        rightArmMesh.position.y = -0.35;
        this.rightArmPivot.add(rightArmMesh);
        this.playerTorso.add(this.rightArmPivot);

        this.player.position.set(this.playerX, 0, 0);
        this.scene.add(this.player);
    }

    // --- TEKSTUR TEKS DINAMIK UNTUK GERBANG & JAWAPAN (LUTSINAR & TAJAM) ---
    createTextTexture(text, bgColor = 'rgba(20, 45, 80, 0.85)', textColor = '#ffffff', subText = '') {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 320;
        const ctx = canvas.getContext('2d');

        // Latar separa lutsinar (semi-transparent glass) supaya tidak menghalang pandangan
        ctx.clearRect(0, 0, 512, 320);
        const grad = ctx.createLinearGradient(0, 0, 0, 320);
        grad.addColorStop(0, bgColor);
        grad.addColorStop(1, 'rgba(10, 22, 40, 0.88)');
        ctx.fillStyle = grad;

        // Bentuk panel melengkung moden
        const radius = 28;
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(12, 12, 488, 296, radius);
            ctx.fill();
        } else {
            ctx.fillRect(12, 12, 488, 296);
        }

        // Garisan bingkai emas bersinar
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 10;
        ctx.stroke();

        // Inner glowing border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Nombor Jawapan Utama (Besar, Tebal & Sangat Jelas)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = textColor;
        ctx.font = '900 115px "Segoe UI", Arial, sans-serif';
        ctx.shadowColor = 'rgba(0,0,0,0.95)';
        ctx.shadowBlur = 14;
        ctx.fillText(text, 256, subText ? 138 : 160);

        // Subteks Lorong (cth: "◄ KIRI" atau "KANAN ►")
        if (subText) {
            ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
            ctx.fillStyle = '#ffd700';
            ctx.shadowBlur = 8;
            ctx.fillText(subText, 256, 235);
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;
        return tex;
    }

    // --- PEMBINAAN GERBANG MATEMATIK (OPEN ARCHWAY - TIDAK MENGHALANG PANDANGAN) ---
    spawnMathGate(zDistance) {
        const question = this.mathEngine.generateQuestion();
        const gateGroup = new THREE.Group();
        gateGroup.position.z = zDistance;

        // Senarai material untuk kesan pudar halus (smooth fade-out)
        const gateMaterials = [];

        // 1. Tiang Kuil Terbuka (Open Archway - Mengekalkan garis pandangan terbuka)
        const archMat = new THREE.MeshStandardMaterial({
            color: 0x586054,
            roughness: 0.75,
            transparent: true,
            opacity: 1.0
        });
        gateMaterials.push(archMat);

        // Tiang Luar Kiri & Kanan (Terletak di luar tepi lorong larian)
        const pL = new THREE.Mesh(new THREE.BoxGeometry(1.0, 7.8, 1.2), archMat);
        pL.position.set(-4.5, 3.9, 0);
        pL.castShadow = true;
        gateGroup.add(pL);

        const pR = new THREE.Mesh(new THREE.BoxGeometry(1.0, 7.8, 1.2), archMat);
        pR.position.set(4.5, 3.9, 0);
        pR.castShadow = true;
        gateGroup.add(pR);

        // Palang Atas Tinggi (Lintel) pada ketinggian 7.2 supaya pandangan hadapan luas
        const beam = new THREE.Mesh(new THREE.BoxGeometry(10.2, 1.4, 1.4), archMat);
        beam.position.set(0, 7.1, 0);
        beam.castShadow = true;
        gateGroup.add(beam);

        // 2. Banner Soalan Utama Di Atas Gerbang (Bertenaga & Jelas)
        const questionTex = this.createTextTexture(`${question.questionText} = ?`, 'rgba(30, 60, 115, 0.95)', '#ffffff');
        const qPlaneGeo = new THREE.PlaneGeometry(6.4, 2.2);
        const qMat = new THREE.MeshBasicMaterial({ map: questionTex, transparent: true, opacity: 1.0 });
        gateMaterials.push(qMat);
        const qBanner = new THREE.Mesh(qPlaneGeo, qMat);
        qBanner.position.set(0, 8.2, 0.8);
        gateGroup.add(qBanner);

        // 3. Papan Jawapan Terapung Lorong KIRI (Diangkat sedikit ke atas untuk pandangan luas)
        const leftTex = this.createTextTexture(`${question.leftAnswer}`, 'rgba(20, 50, 85, 0.88)', '#ffffff', '◄ KIRI');
        const ansPlaneGeo = new THREE.PlaneGeometry(3.0, 2.5);
        const leftMat = new THREE.MeshBasicMaterial({ map: leftTex, transparent: true, opacity: 0.92 });
        gateMaterials.push(leftMat);
        const leftBanner = new THREE.Mesh(ansPlaneGeo, leftMat);
        leftBanner.position.set(-2.3, 3.8, 0.2);
        gateGroup.add(leftBanner);

        // 4. Papan Jawapan Terapung Lorong KANAN
        const rightTex = this.createTextTexture(`${question.rightAnswer}`, 'rgba(20, 50, 85, 0.88)', '#ffffff', 'KANAN ►');
        const rightMat = new THREE.MeshBasicMaterial({ map: rightTex, transparent: true, opacity: 0.92 });
        gateMaterials.push(rightMat);
        const rightBanner = new THREE.Mesh(ansPlaneGeo, rightMat);
        rightBanner.position.set(2.3, 3.8, 0.2);
        gateGroup.add(rightBanner);

        // 5. Penunjuk Lantai Berkilau (Ground Decals - Bantuan visual di atas jalan)
        const groundRingGeo = new THREE.PlaneGeometry(2.4, 1.8);
        const leftGroundTex = this.createGroundDecalTexture(`${question.leftAnswer}`);
        const rightGroundTex = this.createGroundDecalTexture(`${question.rightAnswer}`);

        const leftGroundMat = new THREE.MeshBasicMaterial({ map: leftGroundTex, transparent: true, opacity: 0.7 });
        const rightGroundMat = new THREE.MeshBasicMaterial({ map: rightGroundTex, transparent: true, opacity: 0.7 });
        gateMaterials.push(leftGroundMat, rightGroundMat);

        const leftGround = new THREE.Mesh(groundRingGeo, leftGroundMat);
        leftGround.rotation.x = -Math.PI / 2;
        leftGround.position.set(-2.3, 0.03, 0);
        gateGroup.add(leftGround);

        const rightGround = new THREE.Mesh(groundRingGeo, rightGroundMat);
        rightGround.rotation.x = -Math.PI / 2;
        rightGround.position.set(2.3, 0.03, 0);
        gateGroup.add(rightGround);

        // Simpan rujukan untuk pengesanan dan kesan animasi pudar
        const gateData = {
            group: gateGroup,
            question: question,
            leftBanner: leftBanner,
            rightBanner: rightBanner,
            leftMat: leftMat,
            rightMat: rightMat,
            materials: gateMaterials,
            passed: false,
            fadeAlpha: 1.0,
            isFading: false,
            z: zDistance
        };

        this.scene.add(gateGroup);
        this.gates.push(gateData);

        // Tabur syiling emas di lorong
        this.spawnCoinsBetween(zDistance + 15, zDistance - 15);

        return gateData;
    }

    createGroundDecalTexture(numberText) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Bulatan neon di atas tanah
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.arc(128, 128, 105, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
        ctx.fill();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '900 90px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 10;
        ctx.fillText(numberText, 128, 128);

        return new THREE.CanvasTexture(canvas);
    }

    spawnCoinsBetween(startZ, endZ) {
        const step = 8;
        const geo = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16);
        geo.rotateX(Math.PI / 2);

        for (let z = startZ; z > endZ; z -= step) {
            // Pilih lorong secara rawak
            const laneIndex = Math.random() < 0.5 ? 0 : 1;
            const coin = new THREE.Mesh(geo, this.goldMat);
            coin.position.set(this.lanes[laneIndex], 0.8, z);
            coin.castShadow = true;
            this.scene.add(coin);
            this.coins3D.push(coin);
        }
    }

    // --- ZARAH KEMENANGAN (PARTICLE BURST) ---
    createCelebrationParticles(pos, isCorrect) {
        const count = isCorrect ? 35 : 18;
        const color = isCorrect ? 0xffd700 : 0xff3333;
        const pGeo = new THREE.SphereGeometry(0.12, 6, 6);
        const pMat = new THREE.MeshBasicMaterial({ color: color });

        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(pGeo, pMat);
            mesh.position.copy(pos);
            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 12,
                Math.random() * 8 + 3,
                (Math.random() - 0.5) * 12
            );
            this.scene.add(mesh);
            this.particles.push({
                mesh: mesh,
                velocity: vel,
                life: 1.0,
                decay: Math.random() * 0.8 + 0.8
            });
        }
    }

    // --- INTERAKSI KAWALAN PEMAIN (CONTROLS) ---
    setupEventListeners() {
        // Papan Kekunci
        window.addEventListener('keydown', (e) => {
            if (this.state !== 'PLAYING') return;

            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                this.switchLane(0); // Kiri
            } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                this.switchLane(1); // Kanan
            }
        });

        // Kawalan Sentuh / Swipe
        let touchStartX = 0;
        let touchStartY = 0;

        window.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].clientX;
            touchStartY = e.changedTouches[0].clientY;
        }, { passive: true });

        window.addEventListener('touchend', (e) => {
            if (this.state !== 'PLAYING') return;
            const touchEndX = e.changedTouches[0].clientX;
            const diffX = touchEndX - touchStartX;
            if (Math.abs(diffX) > 40) {
                if (diffX < 0) {
                    this.switchLane(0); // Swipe Kiri
                } else {
                    this.switchLane(1); // Swipe Kanan
                }
            }
        }, { passive: true });

        // Butang Sentuh Atas Skrin (On-Screen Touch Buttons)
        const btnLeft = document.getElementById('touch-left');
        const btnRight = document.getElementById('touch-right');

        if (btnLeft) {
            btnLeft.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.state === 'PLAYING') this.switchLane(0);
            });
        }
        if (btnRight) {
            btnRight.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.state === 'PLAYING') this.switchLane(1);
            });
        }
    }

    switchLane(laneIndex) {
        if (this.currentLane === laneIndex) return;
        this.currentLane = laneIndex;
        this.targetLaneX = this.lanes[laneIndex];
        this.sound.playWhoosh();
    }

    // --- LOGIK MEMULAKAN & MENGURUSKAN PERMAINAN ---
    startGame(selectedTables, speedMode = 'medium') {
        this.mathEngine.setTables(selectedTables);

        // Tetapkan kelajuan mengikut mod
        if (speedMode === 'easy') {
            this.baseSpeed = 16.0;
        } else if (speedMode === 'hard') {
            this.baseSpeed = 28.0;
        } else {
            this.baseSpeed = 21.0;
        }
        this.currentSpeed = this.baseSpeed;

        // Reset statistik
        this.score = 0;
        this.coins = 0;
        this.lives = this.maxLives;
        this.combo = 1;
        this.maxCombo = 1;
        this.totalQuestions = 0;
        this.correctCount = 0;
        this.wrongMistakes = [];
        this.state = 'PLAYING';

        // Bersihkan gerbang & syiling sedia ada
        this.gates.forEach(g => this.scene.remove(g.group));
        this.gates = [];
        this.coins3D.forEach(c => this.scene.remove(c));
        this.coins3D = [];

        // Hasilkan gerbang pertama pada jarak yang selesa
        this.spawnMathGate(-50);
        this.spawnMathGate(-125);
        this.spawnMathGate(-200);

        this.sound.init();
        this.sound.startBGM();
        this.updateHUD();

        // Kemaskini label soalan aktif pada HUD atas skrin
        this.updateTopQuestionBanner();
    }

    updateTopQuestionBanner() {
        const topBanner = document.getElementById('current-question-text');
        const capsule = document.getElementById('question-capsule');
        if (topBanner && this.gates.length > 0) {
            // Dapatkan soalan terdekat di hadapan pemain yang belum dilintasi
            const nextGate = this.gates.find(g => !g.passed);
            if (nextGate) {
                const newText = `${nextGate.question.questionText} = ?`;
                if (topBanner.textContent !== newText) {
                    topBanner.textContent = newText;
                    if (capsule) {
                        capsule.classList.remove('pop-anim');
                        void capsule.offsetWidth; // paksa reflow browser untuk reset animasi
                        capsule.classList.add('pop-anim');
                    }
                }
            }
        }
    }

    // --- KEMASKINI HUD (HEADS-UP DISPLAY) ---
    updateHUD() {
        // Nyawa (Hati)
        const heartsContainer = document.getElementById('hearts-container');
        if (heartsContainer) {
            let heartsHtml = '';
            for (let i = 0; i < this.maxLives; i++) {
                if (i < this.lives) {
                    heartsHtml += '<span class="heart full">❤️</span>';
                } else {
                    heartsHtml += '<span class="heart empty">🖤</span>';
                }
            }
            heartsContainer.innerHTML = heartsHtml;
        }

        // Skor & Combo
        const scoreElem = document.getElementById('hud-score');
        if (scoreElem) scoreElem.textContent = this.score;

        const comboElem = document.getElementById('hud-combo');
        if (comboElem) {
            comboElem.textContent = `${this.combo}x`;
            comboElem.className = this.combo > 1 ? 'combo-active' : '';
        }

        const coinsElem = document.getElementById('hud-coins');
        if (coinsElem) coinsElem.textContent = this.coins;
    }

    // Peringatan / Maklum Balas Apabila Menjawab
    showFeedbackToast(text, isPositive = true, subInfo = '') {
        const toast = document.getElementById('feedback-toast');
        if (!toast) return;

        toast.innerHTML = `<div class="toast-title">${text}</div>${subInfo ? `<div class="toast-sub">${subInfo}</div>` : ''}`;
        toast.className = `feedback-toast show ${isPositive ? 'positive' : 'negative'}`;

        clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            toast.className = 'feedback-toast';
        }, 1800);
    }

    triggerScreenShake(intensity = 0.4, duration = 0.35) {
        this.shakeIntensity = intensity;
        this.shakeTime = duration;
    }

    // --- GAME OVER ---
    handleGameOver() {
        this.state = 'GAMEOVER';
        this.sound.stopBGM();
        this.sound.playGameOver();

        const gameOverModal = document.getElementById('game-over-modal');
        if (gameOverModal) {
            // Kemaskini statistik akhir
            document.getElementById('final-score').textContent = this.score;
            document.getElementById('final-questions').textContent = this.totalQuestions;
            document.getElementById('final-correct').textContent = this.correctCount;
            
            const accuracy = this.totalQuestions > 0 
                ? Math.round((this.correctCount / this.totalQuestions) * 100) 
                : 0;
            document.getElementById('final-accuracy').textContent = `${accuracy}%`;
            document.getElementById('final-max-combo').textContent = `${this.maxCombo}x`;

            // Paparkan senarai soalan yang salah untuk tujuan ulangkaji murid
            const reviewContainer = document.getElementById('review-list');
            if (reviewContainer) {
                if (this.wrongMistakes.length === 0) {
                    reviewContainer.innerHTML = '<p class="text-success">Cemerlang! Tiada kesilapan jawapan!</p>';
                } else {
                    let listHtml = '<ul>';
                    this.wrongMistakes.forEach(m => {
                        listHtml += `<li><strong>${m.q}</strong> = <span class="badge-correct">${m.correct}</span> <span class="badge-wrong">(Kamu pilih: ${m.chosen})</span></li>`;
                    });
                    listHtml += '</ul>';
                    reviewContainer.innerHTML = listHtml;
                }
            }

            gameOverModal.classList.remove('hidden');
        }
    }

    // --- GELUNG UTAMA PERMAINAN (MAIN ANIMATION LOOP) ---
    animate() {
        requestAnimationFrame(this.animate);

        const delta = Math.min(this.clock.getDelta(), 0.1);

        if (this.state === 'PLAYING') {
            // 1. Pergerakan Lorong Pemain (Lerp Horizontal)
            this.playerX += (this.targetLaneX - this.playerX) * this.laneTransitionSpeed * delta;
            
            // Animasi Larian (Gait cycle)
            this.runCycle += delta * (this.currentSpeed * 0.85);
            const legAngle = Math.sin(this.runCycle) * 0.75;
            this.leftLegPivot.rotation.x = legAngle;
            this.rightLegPivot.rotation.x = -legAngle;
            this.leftArmPivot.rotation.x = -legAngle * 0.8;
            this.rightArmPivot.rotation.x = legAngle * 0.8;

            // Lompatan / henjutan badan semasa lari
            const bob = Math.abs(Math.sin(this.runCycle * 2)) * 0.14;
            this.playerTorso.position.y = 1.35 + bob;
            this.player.position.x = this.playerX;

            // Kecondongan badan sedikit bila tukar lorong
            const tilt = (this.targetLaneX - this.playerX) * -0.15;
            this.player.rotation.z = tilt;

            // 2. Pergerakan Jalan Raya Bergerak ke hadapan (Gelung Segmen)
            const moveDistance = this.currentSpeed * delta;
            this.roadSegments.forEach(segment => {
                segment.position.z += moveDistance;
                if (segment.position.z > this.segmentLength) {
                    segment.position.z -= this.numSegments * this.segmentLength;
                }
            });

            // 3. Pergerakan & Pengesanan Gerbang Matematik (Tidak Menghalang Pandangan)
            for (let i = this.gates.length - 1; i >= 0; i--) {
                const gate = this.gates[i];
                gate.group.position.z += moveDistance;

                // Animasi terapung lembut papan nombor jika belum dilintasi
                if (!gate.passed) {
                    const hoverOffset = Math.sin(this.runCycle * 1.5) * 0.08;
                    gate.leftBanner.position.y = 3.8 + hoverOffset;
                    gate.rightBanner.position.y = 3.8 + hoverOffset;
                }

                // Semak apabila pemain melintasi gerbang (z menghampiri 0)
                if (!gate.passed && gate.group.position.z >= -0.5) {
                    gate.passed = true;
                    gate.isFading = true; // Aktifkan kesan pudar serta-merta
                    this.totalQuestions++;

                    // Semak lorong pemain berbanding jawapan betul (0 = Kiri, 1 = Kanan)
                    const isPlayerCorrect = (this.currentLane === gate.question.correctLane);

                    if (isPlayerCorrect) {
                        // BETUL!
                        this.correctCount++;
                        this.combo++;
                        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

                        const addedPoints = 100 * this.combo;
                        this.score += addedPoints;

                        this.sound.playCorrect();
                        this.createCelebrationParticles(new THREE.Vector3(this.playerX, 2.8, 0), true);

                        const compliments = ["HEBAT!", "TEPAT SEKALI!", "PANTAS!", "MANTAP!", "BIJAK!"];
                        const praise = compliments[Math.floor(Math.random() * compliments.length)];
                        this.showFeedbackToast(`🎉 ${praise} +${addedPoints}`, true, `${gate.question.questionText} = ${gate.question.correctAnswer}`);

                        // Tambah kelajuan secara beransur-ansur
                        this.currentSpeed = Math.min(this.currentSpeed + 0.4, 38.0);
                    } else {
                        // SALAH!
                        const chosenAnswer = (this.currentLane === 0) ? gate.question.leftAnswer : gate.question.rightAnswer;
                        this.wrongMistakes.push({
                            q: gate.question.questionText,
                            correct: gate.question.correctAnswer,
                            chosen: chosenAnswer
                        });

                        this.combo = 1;
                        this.lives--;
                        this.sound.playWrong();
                        this.triggerScreenShake(0.5, 0.4);
                        this.createCelebrationParticles(new THREE.Vector3(this.playerX, 2.5, 0), false);

                        this.showFeedbackToast(`❌ SALAH!`, false, `Jawapan Sebenar: ${gate.question.questionText} = ${gate.question.correctAnswer}`);

                        if (this.lives <= 0) {
                            this.updateHUD();
                            this.handleGameOver();
                            return;
                        }
                    }

                    this.updateHUD();
                    this.updateTopQuestionBanner();
                }

                // Kesan Pudar & Buka Gerbang (Smooth Dissolve & Open) supaya pemandangan jalan di hadapan kekal 100% jelas
                if (gate.isFading) {
                    gate.fadeAlpha -= delta * 3.2; // Pudar pantas dalam ~0.3 saat
                    const currentAlpha = Math.max(0, gate.fadeAlpha);
                    if (gate.materials) {
                        gate.materials.forEach(mat => {
                            mat.opacity = currentAlpha;
                        });
                    }
                    // Buka papan nombor ke tepi seperti pintu terbuka
                    gate.leftBanner.position.x -= delta * 5.0;
                    gate.rightBanner.position.x += delta * 5.0;
                }

                // Buang gerbang sebaik sahaja pudar sepenuhnya atau melepasi belakang pemain (z > 3), bukan z > 25
                if (gate.fadeAlpha <= 0.05 || gate.group.position.z > 3.5) {
                    this.scene.remove(gate.group);
                    this.gates.splice(i, 1);

                    // Cari gerbang paling jauh untuk letakkan gerbang seterusnya
                    let furthestZ = -50;
                    this.gates.forEach(g => {
                        if (g.group.position.z < furthestZ) furthestZ = g.group.position.z;
                    });
                    this.spawnMathGate(furthestZ - 75);
                }
            }

            // 4. Pergerakan & Kutipan Syiling Emas (Coins)
            for (let i = this.coins3D.length - 1; i >= 0; i--) {
                const coin = this.coins3D[i];
                coin.position.z += moveDistance;
                coin.rotation.z += delta * 4.0; // Putaran syiling

                // Semakan kutipan oleh pemain
                const distZ = Math.abs(coin.position.z - this.player.position.z);
                const distX = Math.abs(coin.position.x - this.playerX);

                if (distZ < 1.4 && distX < 1.2) {
                    // Kutip syiling!
                    this.coins++;
                    this.score += 20;
                    this.sound.playCoin();
                    this.updateHUD();
                    this.scene.remove(coin);
                    this.coins3D.splice(i, 1);
                    continue;
                }

                if (coin.position.z > 20) {
                    this.scene.remove(coin);
                    this.coins3D.splice(i, 1);
                }
            }

            // 5. Kemaskini zarah (Particles)
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.mesh.position.addScaledVector(p.velocity, delta);
                p.velocity.y -= 18.0 * delta; // Graviti
                p.life -= delta * p.decay;
                p.mesh.scale.setScalar(Math.max(0.01, p.life));

                if (p.life <= 0) {
                    this.scene.remove(p.mesh);
                    this.particles.splice(i, 1);
                }
            }

            // 6. Gegaran Kamera (Screen Shake)
            if (this.shakeTime > 0) {
                this.shakeTime -= delta;
                const ox = (Math.random() - 0.5) * this.shakeIntensity;
                const oy = (Math.random() - 0.5) * this.shakeIntensity;
                this.camera.position.set(
                    this.cameraBasePos.x + ox,
                    this.cameraBasePos.y + oy,
                    this.cameraBasePos.z
                );
            } else {
                // Kamera mengekori pemain dengan sedikit kecondongan lembut
                this.camera.position.x = this.playerX * 0.25;
            }
        }

        this.renderer.render(this.scene, this.camera);
    }
}

if (typeof window !== 'undefined') {
    window.SifirRunnerGame = SifirRunnerGame;
}
