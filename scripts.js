const { createApp } = Vue;

createApp({
    data() {
        return {
            // --- GLOBAL STATE ---
            playerName: '',
            playerNameInput: '',
            currentStage: 0,
            selectedPath: '',
            score: 0,
            lastScore: null,
            completedPaths: [],
            stageComplete: false,
            isGameOver: false, // <-- Ditambahkan untuk mengontrol UI tombol refresh

            // --- AUDIO ---
            isMusicPlaying: false,
            bgMusic: null,
            sfx: {},

            // --- STAGE 1: PHOTOSYNTHESIS ---
            sunPower: 0,
            sunRevealed: false,
            seedPlanted: false,
            pollutionInterval: null,
            clouds: [
                { top: '10%', left: '20%', cleared: false, isAcid: false },
                { top: '15%', left: '40%', cleared: false, isAcid: true },
                { top: '5%', left: '60%', cleared: false, isAcid: false },
                { top: '25%', left: '10%', cleared: false, isAcid: false },
                { top: '30%', left: '70%', cleared: false, isAcid: true },
                { top: '30%', left: '50%', cleared: false, isAcid: false },
            ],

            // --- STAGE 2: CLEANING ---
            trashClearedCount: 0,
            trash: [
                { icon: '🥫', top: 40, left: 20, cleared: false, isGlowing: false },
                { icon: '🥤', top: 40, left: 60, cleared: false, isGlowing: false },
                { icon: '🥡', top: 80, left: 40, cleared: false, isGlowing: false },
                { icon: '☢️', top: 50, left: 30, cleared: false, isGlowing: false },
                { icon: '🔋', top: 85, left: 15, cleared: false, isGlowing: false }
            ],

            // --- STAGE 3: POLLINATION (BEE) & SUBMARINE ---
            beeX: 0, beeY: 0,
            gameWidth: 800, gameHeight: 600,
            beeHealth: 3,
            isConfused: false,
            enemyTimer: null,
            birds: [
                { x: -10, y: 20, speed: 2 },
                { x: 110, y: 50, speed: -1.5 }
            ],
            pesticideClouds: [
                { x: 25, y: 35 },
                { x: 75, y: 65 }
            ],
            flowers: [
                { pollinated: false, x: 20, y: 70 },
                { pollinated: false, x: 50, y: 40 },
                { pollinated: false, x: 80, y: 75 }
            ],

            // --- STAGE 4: HARVESTING ---
            harvestInterval: null,
            isStormy: false,
            harvestedCount: 0,
            fruits: [
                { x: 35, y: 30, harvested: false },
                { x: 50, y: 25, harvested: false },
                { x: 65, y: 35, harvested: false }
            ],
            pests: [
                { x: 10, y: 30, alive: true, targetFruit: 0 },
                { x: 85, y: 25, alive: true, targetFruit: 2 }
            ],
            draggedFruitIndex: null,

            // --- GREENHOUSE DATA ---
            greenhouseGases: Array.from({ length: 8 }, () => ({
                top: Math.random() * 60 + 10,
                left: Math.random() * 80 + 10
            })),
            plantingSpots: Array.from({ length: 10 }, () => ({ planted: false })),
            turbinesFixed: [],
            recyclableItems: [
                { icon: '📄', type: 'paper', top: 20, left: 30, sorted: false },
                { icon: '🍾', type: 'glass', top: 25, left: 50, sorted: false },
                { icon: '🥤', type: 'plastic', top: 30, left: 70, sorted: false },
                { icon: '📦', type: 'paper', top: 15, left: 10, sorted: false },
                { icon: '🥫', type: 'metal', top: 25, left: 20, rounded: false, sorted: false },
                { icon: '🥤', type: 'plastic', top: 75, left: 60, sorted: false }
            ],
            draggedItemIndex: null,

            // --- AQUAMARINE DATA ---
            corals: Array.from({ length: 8 }, () => ({ restored: false })),
            oilSpills: [],
            trashInSea: [], 
            jellyfish: [],  
            cleanedTrashCount: 0, 
            hullIntegrity: 100,
            oxygenLevel: 100,
            whaleFree: false,
            netCuts: 0,
            gameTimer: 30,
            timerInterval: null
        }
    },

    mounted() {
        this.bgMusic = new Audio('https://incompetech.com/music/royalty-free/mp3-royaltyfree/Fluffing%20a%20Duck.mp3');
        this.bgMusic.loop = true;
        this.bgMusic.volume = 0.3;

        this.sfx = {
            pop: new Audio('https://assets.mixkit.co/active_storage/sfx/3005/3005-preview.mp3'),
            win: new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'),
            error: new Audio('https://assets.mixkit.co/active_storage/sfx/2997/2997-preview.mp3'),
            collect: new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3')
        };

        Object.values(this.sfx).forEach(audio => audio.volume = 0.6);
    },

    computed: {
        currentInstruction() {
            if (this.isGameOver) return "💥 GAME OVER! Sila cuba lagi.";
            
            const instructions = {
                photosynthesis: [
                    "",
                    "DANGER AND FASTER! Click clear cloud for 60% Sun Power. Avoid Acid Rain (🌧️)!",
                    "Toxic Waste! Tap all the trash to clean and help the plant grow! 🧹",
                    "Avoid Birds & Pesticides! Pollinate all the flowers! 🐝",
                    "Pest Alert! Drag fruits to the basket and stop the worms! 🍎"
                ],
                greenhouse: [
                    "",
                    "Tap the CO2 bubbles to clear the atmosphere! 🫧",
                    "Plant trees by clicking hole to lower CO2 levels to 0%! 🌳",
                    "Fix wind turbines to generate clean energy! 🛠️",
                    "Sort waste into the correct recycling bins! ♻️"
                ],
                aquamarine: [
                    "",
                    "RESTORE THE BLEACHED CORALS! Click each coral to bring back its color! 🪸",
                    "Oil Spill! Clean it before it covers the ocean! 🌊",
                    "Ocean Pollution! Vacuum 10 plastics, avoid Jellyfish! 🪼",
                    "Critical Pressure! Free the whale before the hull breaks! 🐋"
                ]
            };
            return instructions[this.selectedPath] ? instructions[this.selectedPath][this.currentStage] : "";
        },
        allTrashCleared() {
            return this.trash.every(t => t.cleared);
        },
        co2Level() {
            const plantedCount = this.plantingSpots.filter(s => s.planted).length;
            return Math.max(0, 100 - (plantedCount * 10));
        }
    },

    methods: {
        toggleMusic() {
            if (!this.bgMusic) return;
            if (this.isMusicPlaying) {
                this.bgMusic.pause();
                this.isMusicPlaying = false;
            } else {
                this.bgMusic.play().catch(e => console.log("Audio play failed:", e));
                this.isMusicPlaying = true;
            }
        },
        playSound(type) {
            if (this.sfx && this.sfx[type]) {
                this.sfx[type].currentTime = 0;
                this.sfx[type].play().catch(() => { });
            }
        },
        startGame() {
            if (this.playerNameInput.trim()) {
                this.playerName = this.playerNameInput;
                this.currentStage = 0.5;
                this.playSound('pop');
                if (!this.isMusicPlaying) this.toggleMusic();
            }
        },
        selectPath(path) {
            this.selectedPath = path;
            this.currentStage = 1;
            this.isGameOver = false;
            this.initStageLogic();
        },

        initStageLogic() {
            this.stopAllIntervals();

            if (this.selectedPath === 'aquamarine') {
                this.startGlobalTimer();
                if (this.currentStage === 1) this.startExtremeCoral();
                if (this.currentStage === 2) this.startOilSpill();
                if (this.currentStage === 3) this.startOceanCleanup();
                if (this.currentStage === 4) this.startPressureChallenge();
            }

            if (this.selectedPath === 'photosynthesis') {
                if (this.currentStage === 1) this.startStage1Photo();
                if (this.currentStage === 2) this.startStage2Photo();
                if (this.currentStage === 3) this.startStage3Photo();
                if (this.currentStage === 4) this.startStage4Photo();
            }
        },

        stopAllIntervals() {
            clearInterval(this.pollutionInterval);
            clearInterval(this.enemyTimer);
            clearInterval(this.harvestInterval);
            clearInterval(this.timerInterval);
        },

        startGlobalTimer() {
            this.gameTimer = 35;
            this.timerInterval = setInterval(() => {
                if (!this.isGameOver) {
                    this.gameTimer--;
                    if (this.gameTimer <= 0) this.gameOver("Time Over!");
                }
            }, 1000);
        },

        gameOver(reason) {
            this.stopAllIntervals();
            this.playSound('error');
            this.isGameOver = true; 
            console.log("Game Over Reason:", reason);
            // Ganti cara lama (alert & location.reload) supaya elemen HTML tombol refresh bisa berfungsi aktif
        },

        restartGame() {
            this.isGameOver = false;
            this.stageComplete = false;
            this.score = 0;
            this.resetGameData(this.selectedPath);
            this.initStageLogic();
        },

        resetGameData(path) {
            if (path === 'photosynthesis') {
                this.sunPower = 0;
                this.sunRevealed = false;
                this.seedPlanted = false;
                this.clouds.forEach(c => c.cleared = false);
                this.trashClearedCount = 0;
                this.trash.forEach(t => t.cleared = false);
                this.beeHealth = 3;
                this.beeX = 0; this.beeY = 0;
                this.flowers.forEach(f => f.pollinated = false);
                this.harvestedCount = 0;
                this.fruits.forEach(f => f.harvested = false);
                this.pests.forEach(p => { p.alive = true; p.x = Math.random() * 20; p.y = 30; });
            } else if (path === 'greenhouse') {
                this.greenhouseGases = Array.from({ length: 8 }, () => ({
                    top: Math.random() * 60 + 10,
                    left: Math.random() * 80 + 10
                }));
                this.plantingSpots.forEach(s => s.planted = false);
                this.turbinesFixed = [];
                this.recyclableItems.forEach(i => i.sorted = false);
            } else if (path === 'aquamarine') {
                this.corals.forEach(c => c.restored = false);
                this.oilSpills = [];
                this.trashInSea = [];
                this.cleanedTrashCount = 0;
                this.hullIntegrity = 100;
                this.whaleFree = false;
                this.netCuts = 0;
                this.gameTimer = 35;
            }
        },

        // --- PHOTOSYNTHESIS METHODS ---
        startStage1Photo() {
            this.pollutionInterval = setInterval(() => {
                if (this.sunPower > 0 && !this.stageComplete && !this.isGameOver) this.sunPower -= 1;
            }, 1000);
        },
        clearCloud(index) {
            if (this.isGameOver) return;
            const cloud = this.clouds[index];
            if (cloud.isAcid) {
                this.score = Math.max(0, this.score - 20);
                this.sunPower = Math.max(0, this.sunPower - 15);
                this.playSound('error');
            } else {
                cloud.cleared = true;
                this.sunPower = Math.min(100, this.sunPower + 25);
                this.score += 10;
                this.playSound('pop');
            }
            if (this.sunPower >= 60) this.sunRevealed = true;
        },
        plantSeed() {
            if (this.isGameOver) return;
            if (this.sunPower >= 60) {
                this.seedPlanted = true;
                this.playSound('collect');
                this.triggerWin();
            }
        },
        cleanTrash(index) {
            if (this.isGameOver || this.trash[index].cleared) return;
            this.trash[index].cleared = true;
            this.trashClearedCount = this.trash.filter(t => t.cleared).length;
            this.score += 20;
            this.playSound('pop');
            if (this.trashClearedCount === this.trash.length) this.triggerWin();
        },
        startStage2Photo() {
            this.trashClearedCount = this.trash.filter(t => t.cleared).length;
        },
        startStage3Photo() {
            this.enemyTimer = setInterval(() => {
                if (!this.isGameOver) {
                    this.birds.forEach(bird => {
                        bird.x += bird.speed;
                        if (bird.x > 110 || bird.x < -10) bird.speed *= -1;
                    });
                    this.checkBeeHit();
                }
            }, 50);
        },
        updatePointerPos(e) {
            if (this.isGameOver) return;
            const rect = e.currentTarget.getBoundingClientRect();
            this.beeX = e.clientX - rect.left;
            this.beeY = e.clientY - rect.top;
            this.gameWidth = rect.width || 800;
            this.gameHeight = rect.height || 600;
        },
        checkBeeHit() {
            const beePercentX = (this.beeX / this.gameWidth * 100);
            const beePercentY = (this.beeY / this.gameHeight * 100);

            this.birds.forEach(b => {
                const dx = beePercentX - b.x;
                const dy = beePercentY - b.y;
                if (Math.hypot(dx, dy) < 6) {
                    this.beeHealth--;
                    this.beeX = 0; this.beeY = 0;
                    if (this.beeHealth <= 0) this.gameOver("The movement of the bee is too slow!");
                }
            });

            this.flowers.forEach((f, index) => {
                const dx = beePercentX - f.x;
                const dy = beePercentY - f.y;
                if (Math.hypot(dx, dy) < 8) {
                    this.pollinateFlower(index);
                }
            });
        },
        pollinateFlower(index) {
            if (!this.flowers[index].pollinated) {
                this.flowers[index].pollinated = true;
                this.score += 20;
                this.playSound('collect');
                if (this.flowers.every(f => f.pollinated)) this.triggerWin();
            }
        },
        startStage4Photo() {
            this.pests.forEach((p, idx) => { p.targetFruit = idx % this.fruits.length; });
            this.harvestInterval = setInterval(() => {
                if (!this.isGameOver) {
                    this.pests.forEach(p => {
                        if (p.alive) {
                            const f = this.fruits[p.targetFruit];
                            if (!f.harvested) {
                                p.x += (f.x - p.x) * 0.01;
                                p.y += (f.y - p.y) * 0.01;
                                if (Math.hypot(f.x - p.x, f.y - p.y) < 2) {
                                    this.gameOver("Pests ate the fruit!");
                                }
                            }
                        }
                    });
                }
            }, 100);
        },
        killPest(i) {
            if (this.isGameOver) return;
            this.pests[i].alive = false;
            this.score += 30;
            this.playSound('pop');
        },
        startDragFruit(e, i) {
            if (this.isGameOver) return;
            if (e && e.dataTransfer) {
                e.dataTransfer.setData('text/plain', i);
                e.dataTransfer.effectAllowed = 'move';
            }
            this.draggedFruitIndex = i;
        },
        onDropFruit() {
            if (this.draggedFruitIndex !== null && !this.isGameOver) {
                this.fruits[this.draggedFruitIndex].harvested = true;
                this.harvestedCount++;
                this.score += 50;
                this.draggedFruitIndex = null;
                this.playSound('collect');
                if (this.harvestedCount === this.fruits.length) this.triggerWin();
            }
        },

        // --- GREENHOUSE METHODS ---
        clearGas(index) {
            if (this.isGameOver) return;
            this.greenhouseGases.splice(index, 1);
            this.playSound('pop');
            if (this.greenhouseGases.length === 0) this.triggerWin();
        },
        plantGreenhouseTree(index) {
            if (this.isGameOver || this.plantingSpots[index].planted) return;
            this.plantingSpots[index].planted = true;
            this.score += 10;
            this.playSound('collect');
            if (this.co2Level === 0) this.triggerWin();
        },
        fixTurbine(n) {
            if (this.isGameOver) return;
            if (!this.turbinesFixed.includes(n)) {
                this.turbinesFixed.push(n);
                this.playSound('pop');
                if (this.turbinesFixed.length === 3) this.triggerWin();
            }
        },
        startDrag(e, index) {
            if (this.isGameOver) return;
            if (e && e.dataTransfer) {
                e.dataTransfer.setData('text/plain', index);
                e.dataTransfer.effectAllowed = 'move';
            }
            this.draggedItemIndex = index;
        },
        onDrop(e, binType) {
            if (this.isGameOver) return;
            const item = this.recyclableItems[this.draggedItemIndex];
            if (item && (item.type === binType || (binType === 'glass' && item.type === 'metal'))) {
                item.sorted = true;
                this.playSound('collect');
                if (this.recyclableItems.every(i => i.sorted)) this.triggerWin();
            } else if (item) {
                this.playSound('error');
            }
        },

        // --- AQUAMARINE METHODS ---
        startExtremeCoral() {
            this.pollutionInterval = setInterval(() => {
                if (!this.isGameOver) {
                    const restored = this.corals.filter(c => c.restored);
                    if (restored.length > 0 && Math.random() > 0.7) {
                        const idx = Math.floor(Math.random() * this.corals.length);
                        this.corals[idx].restored = false;
                    }
                }
            }, 2500);
        },
        restoreCoral(i) {
            if (this.isGameOver) return;
            this.corals[i].restored = true;
            this.score += 15;
            this.playSound('pop');
            if (this.corals.every(c => c.restored)) this.triggerWin();
        },
        startOilSpill() {
            this.oilSpills = Array.from({ length: 5 }, () => ({ x: Math.random() * 80 + 10, y: Math.random() * 60 + 10, size: 40 }));
            this.pollutionInterval = setInterval(() => {
                if (!this.isGameOver) {
                    this.oilSpills.forEach(s => {
                        s.size += 8;
                        if (s.size > 220) this.gameOver("Oil spread uncontrollably!");
                    });
                }
            }, 800);
        },
        cleanOil(index) {
            if (this.isGameOver) return;
            this.oilSpills[index].size -= 60;
            if (this.oilSpills[index].size <= 0) {
                this.oilSpills.splice(index, 1);
                this.playSound('collect');
                if (this.oilSpills.length === 0) this.triggerWin();
            }
        },

        startOceanCleanup() {
    // Menjana 10 jenis sampah secara rawak di lautan
    this.trashInSea = Array.from({ length: 10 }, () => ({
        x: Math.random() * 80 + 10,
        y: Math.random() * 70 + 15,
        rot: Math.random() * 360,
        icon: ['🧴', '🛍️', '🥤', '👞'][Math.floor(Math.random() * 4)],
        collected: false
    }));

    // Menjana obor-obor dengan arah (dx, dy) dan kelajuan (speed) animasi rawak
    this.jellyfish = Array.from({ length: 2 }, () => ({
        x: Math.random() * 90,
        y: Math.random() * 80,
        dx: (Math.random() - 0.5) * 2,
        dy: (Math.random() - 0.5) * 2,
        speed: Math.random() * 2 + 1 // Ditambah untuk membaiki 'jelly.speed' di HTML
    }));

    this.cleanedTrashCount = 0;

    // Timer pergerakan musuh (Obor-obor)
    this.enemyTimer = setInterval(() => {
        if (!this.isGameOver) {
            this.jellyfish.forEach(j => {
                j.x += j.dx;
                j.y += j.dy;
                
                // Pelantunan apabila terkena dinding sempadan skrin
                if (j.x < 0 || j.x > 95) j.dx *= -1;
                if (j.y < 0 || j.y > 90) j.dy *= -1;
            });
            this.checkJellyfishCollision();
        }
    }, 50);
},

vacuumTrash(index) {
    // Sekatan keselamatan: Elakkan fungsi berjalan jika game over ATAU sampah sudah disedut
    if (this.isGameOver || this.trashInSea[index].collected) return;
    
    this.trashInSea[index].collected = true;
    this.cleanedTrashCount++;
    this.score += 15;
    this.playSound('pop');
    
    // Diselaraskan kepada 10 supaya sama dengan paparan UI pemain
    if (this.cleanedTrashCount >= 10) {
        this.triggerWin();
    }
},

checkJellyfishCollision() {
    // Menukar kedudukan kapal selam dari pixel (X, Y) kepada bentuk peratusan (%)
    const subX = (this.beeX / this.gameWidth) * 100;
    const subY = (this.beeY / this.gameHeight) * 100;

    this.jellyfish.forEach(j => {
        const dist = Math.hypot(subX - j.x, subY - j.y);
        // Jika jarak antara kapal selam dan obor-obor terlalu dekat (kurang dari 5%)
        if (dist < 5) {
            this.gameOver("Submarine stung by jellyfish!");
        }
    });
},

startPressureChallenge() {
    this.pollutionInterval = setInterval(() => {
        if (!this.isGameOver) {
            this.hullIntegrity -= 3;
            if (this.hullIntegrity <= 0) {
                this.gameOver("The submarine is destroyed!");
            }
        }
    }, 600);
},
        repairHull() {
            if (this.isGameOver) return;
            this.hullIntegrity = Math.min(100, this.hullIntegrity + 15);
            this.playSound('collect');
        },
        cutNet() {
            if (this.isGameOver) return;
            this.netCuts++;
            this.score += 30;
            this.playSound('pop');
            if (this.netCuts >= 10) {
                this.whaleFree = true;
                setTimeout(() => this.triggerWin(), 1000);
            }
        },

        // --- CORE HELPERS ---
        triggerWin() {
            this.stopAllIntervals();
            this.stageComplete = true;
            this.score += 100;
            this.playSound('win');
            if (typeof confetti !== 'undefined') {
                confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
            }
        },
        nextStage() {
            if (this.currentStage < 4) {
                this.currentStage++;
                this.stageComplete = false;
                this.initStageLogic();
            } else {
                this.finishGame();
            }
        },
        finishGame() {
            if (!this.completedPaths.includes(this.selectedPath)) {
                this.completedPaths.push(this.selectedPath);
            }
            this.lastScore = this.score;
            this.currentStage = 0.5;
            this.stageComplete = false;

            const sp = this.selectedPath;
            this.score = 0;
            this.selectedPath = '';
            this.resetGameData(sp);
        }
    }
}).mount('#app');