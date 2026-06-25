// ============================================================
//  VARIABLES GLOBALES
// ============================================================

let selectedPlayer = "Mr. Danilo";
let moveLeft   = false;
let moveRight  = false;
let jumpPressed = false;

// ============================================================
//  HELPERS
// ============================================================

function makePlatform(scene, x, y, w, h, color) {
    const rect = scene.add.rectangle(x, y, w, h, color);
    scene.physics.add.existing(rect, true);
    return rect;
}

function makePlatforms(scene, data, color) {
    return data.map(p => makePlatform(scene, p.x, p.y, p.w, p.h, color));
}

function makeClouds(scene, worldW, count, cloudColor) {
    for (let i = 0; i < count; i++) {
        const x = Phaser.Math.Between(100, worldW - 100);
        const y = Phaser.Math.Between(40, 180);
        const w = Phaser.Math.Between(80, 160);
        scene.add.ellipse(x,      y,      w,       40, cloudColor, 0.75);
        scene.add.ellipse(x - 28, y + 12, w * 0.6, 34, cloudColor, 0.75);
        scene.add.ellipse(x + 28, y + 12, w * 0.6, 34, cloudColor, 0.75);
    }
}

function makeSign(scene, x, y, text) {
    scene.add.rectangle(x, y + 22, 8, 48, 0x7B3F00);
    scene.add.rectangle(x, y - 8, Math.min(text.length * 8 + 30, 280), 34, 0xFFFDE7)
         .setStrokeStyle(2, 0xC8A200);
    scene.add.text(x, y - 8, text, {
        fontSize: "12px",
        color: "#333300",
        wordWrap: { width: 260 }
    }).setOrigin(0.5);
}

function makeGoal(scene, x, y) {
    scene.add.rectangle(x, y, 6, 120, 0x7B3F00);
    scene.add.triangle(x + 3, y - 52, 0, 0, 36, 14, 0, 28, 0xff66b3);
    scene.add.rectangle(x, y + 66, 50, 18, 0xFFD700).setStrokeStyle(2, 0xC8A200);

    const zone = scene.add.rectangle(x, y, 44, 120, 0xFFFF00, 0);
    scene.physics.add.existing(zone, true);
    return zone;
}

// ── Bloques de suelo estilo ladrillo (decorativos) ───────────
function makeGroundBlocks(scene, suelos, blockColor) {
    const c  = Phaser.Display.Color.ValueToColor(blockColor);
    const dk = Phaser.Display.Color.GetColor(
        Math.max(0, c.r - 35), Math.max(0, c.g - 35), Math.max(0, c.b - 35)
    );
    suelos.forEach(s => {
        const startX = s.x - s.w / 2;
        const topY   = s.y - s.h / 2;
        const cols   = Math.floor(s.w / 40);
        const rows   = Math.floor(s.h / 20);
        for (let r = 0; r < rows; r++) {
            for (let c2 = 0; c2 < cols; c2++) {
                const shift = (r % 2 === 0) ? 0 : 20;
                const bx = startX + c2 * 40 + shift + 20;
                const by = topY + r * 20 + 10;
                scene.add.rectangle(bx, by, 38, 18, blockColor).setStrokeStyle(1, dk);
            }
        }
    });
}

// ── Bloques flotantes "?" ─────────────────────────────────────
// Solo visual; la física la aporta el array de plats principal
function makeQBlocks(scene, blocks) {
    blocks.forEach(b => {
        scene.add.rectangle(b.x, b.y, 38, 18, GAME_CONFIG.questionBlockColor)
             .setStrokeStyle(2, 0xF57F17);
        scene.add.text(b.x, b.y + 1, "?", {
            fontSize: "12px", color: "#7B3F00", fontStyle: "bold"
        }).setOrigin(0.5);
    });
}

// ── Enemigos patrulla tipo Goomba ─────────────────────────────
// Para usar PNG: pon el nombre del archivo en GAME_CONFIG.sprites.enemy
// y coloca el .png en la misma carpeta que index.html.
function makeEnemies(scene, data, platforms) {
    const group = scene.physics.add.group();

    data.forEach(cfg => {
        let en;
        if (GAME_CONFIG.sprites.enemy && scene.textures.exists("enemy_img")) {
            en = scene.add.image(cfg.x, cfg.y, "enemy_img");
            en.setDisplaySize(34, 34);
            scene.physics.add.existing(en);
        } else {
            // Rectángulo rojo + cara simple
            en = scene.add.rectangle(cfg.x, cfg.y, 34, 34, GAME_CONFIG.enemyColor);
            scene.physics.add.existing(en);
        }

        en.body.setCollideWorldBounds(false);
        en.leftBound  = cfg.left;
        en.rightBound = cfg.right;
        en.body.setVelocityX(GAME_CONFIG.enemySpeed);
        en.alive = true;

        scene.physics.add.collider(en, platforms);
        group.add(en);
    });

    return group;
}

function updateEnemies(enemies) {
    enemies.getChildren().forEach(en => {
        if (!en.alive || !en.body) return;
        if (en.x <= en.leftBound)  en.body.setVelocityX( GAME_CONFIG.enemySpeed);
        if (en.x >= en.rightBound) en.body.setVelocityX(-GAME_CONFIG.enemySpeed);
    });
}

// ── Jugador ───────────────────────────────────────────────────
function makePlayer(scene, x, y, color) {
    let p;
    if (GAME_CONFIG.sprites.player && scene.textures.exists("player_img")) {
        p = scene.add.image(x, y, "player_img");
        p.setDisplaySize(34, 54);
        scene.physics.add.existing(p);
    } else {
        p = scene.add.rectangle(x, y, 34, 54, color);
        scene.physics.add.existing(p);
    }
    // No setCollideWorldBounds aquí; cada nivel controla sus límites
    return p;
}

function handleMovement(player, cursors, speed, jumpForce) {
    if (!player.body) return;
    const body = player.body;
    body.setVelocityX(0);
    if (cursors.left.isDown  || moveLeft)  body.setVelocityX(-speed);
    if (cursors.right.isDown || moveRight) body.setVelocityX(speed);
    if ((cursors.up.isDown || jumpPressed) && body.blocked.down) {
        body.setVelocityY(-jumpForce);
        jumpPressed = false;
    }
}

// ARREGLO CAÍDA AL VACÍO:
// El mundo tiene height extendido a 2000 en cada nivel,
// así el jugador cae libremente hasta que handleRespawn lo atrapa
// antes de llegar al límite inferior del mundo.
function handleRespawn(player, rx, ry, limitY) {
    if (player.y > limitY) {
        player.body.reset(rx, ry);
    }
}

// ── HUD: nivel + botones pausa y menú ─────────────────────────
function makeHUD(scene, levelNum) {
    scene.add.text(14, 12, "Mundo " + levelNum + "   |   " + selectedPlayer, {
        fontSize: "15px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3
    }).setScrollFactor(0).setDepth(20);

    const W = scene.scale.width;

    const menuBtn = scene.add.text(W - 56, 10, " 🏠 ", {
        fontSize: "19px",
        color: "#ffffff",
        backgroundColor: "#00000099",
        padding: { x: 6, y: 4 }
    }).setScrollFactor(0).setDepth(20).setInteractive({ useHandCursor: true });

    const pauseBtn = scene.add.text(W - 112, 10, " ⏸ ", {
        fontSize: "19px",
        color: "#ffffff",
        backgroundColor: "#00000099",
        padding: { x: 6, y: 4 }
    }).setScrollFactor(0).setDepth(20).setInteractive({ useHandCursor: true });

    menuBtn.on("pointerdown", () => {
        moveLeft = false; moveRight = false; jumpPressed = false;
        scene.scene.start("menu");
    });
    menuBtn.on("pointerover",  () => menuBtn.setStyle({ backgroundColor: "#c0392b99" }));
    menuBtn.on("pointerout",   () => menuBtn.setStyle({ backgroundColor: "#00000099" }));

    pauseBtn.on("pointerdown", () => { if (scene.togglePause) scene.togglePause(); });
    pauseBtn.on("pointerover",  () => pauseBtn.setStyle({ backgroundColor: "#2980b999" }));
    pauseBtn.on("pointerout",   () => pauseBtn.setStyle({ backgroundColor: "#00000099" }));
}

// ── Overlay de pausa ──────────────────────────────────────────
function buildPauseOverlay(scene) {
    const W = scene.scale.width;
    const H = scene.scale.height;

    const overlay = scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.68)
        .setScrollFactor(0).setDepth(30).setVisible(false);

    const title = scene.add.text(W / 2, H / 2 - 70, "⏸  PAUSA", {
        fontSize: "38px", color: "#f1c40f", fontStyle: "bold",
        stroke: "#000", strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(31).setVisible(false);

    const contBtn = scene.add.text(W / 2, H / 2 + 5, "  ▶  Continuar  ", {
        fontSize: "26px", color: "#000000",
        backgroundColor: "#2ecc71", padding: { x: 22, y: 11 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(31)
      .setInteractive({ useHandCursor: true }).setVisible(false);

    const menBtn = scene.add.text(W / 2, H / 2 + 72, "  🏠  Salir al Menú  ", {
        fontSize: "22px", color: "#ffffff",
        backgroundColor: "#e74c3c", padding: { x: 22, y: 10 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(31)
      .setInteractive({ useHandCursor: true }).setVisible(false);

    contBtn.on("pointerover",  () => contBtn.setStyle({ backgroundColor: "#27ae60" }));
    contBtn.on("pointerout",   () => contBtn.setStyle({ backgroundColor: "#2ecc71" }));
    contBtn.on("pointerdown",  () => { if (scene.togglePause) scene.togglePause(); });

    menBtn.on("pointerover",   () => menBtn.setStyle({ backgroundColor: "#c0392b" }));
    menBtn.on("pointerout",    () => menBtn.setStyle({ backgroundColor: "#e74c3c" }));
    menBtn.on("pointerdown",   () => {
        moveLeft = false; moveRight = false; jumpPressed = false;
        scene.scene.start("menu");
    });

    return { overlay, title, contBtn, menBtn };
}

// ── Controles móviles ─────────────────────────────────────────
function makeMobileControls(scene) {
    const w = scene.scale.width;
    const h = scene.scale.height;
    const style = {
        fontSize: "36px", color: "#ffffff",
        backgroundColor: "#00000077", padding: { x: 12, y: 6 }
    };

    const L = scene.add.text(55,     h - 68, "◀", style).setScrollFactor(0).setDepth(20).setInteractive();
    const R = scene.add.text(135,    h - 68, "▶", style).setScrollFactor(0).setDepth(20).setInteractive();
    const J = scene.add.text(w - 75, h - 68, "▲", style).setScrollFactor(0).setDepth(20).setInteractive();

    L.on("pointerdown", () => moveLeft   = true);
    L.on("pointerup",   () => moveLeft   = false);
    L.on("pointerout",  () => moveLeft   = false);

    R.on("pointerdown", () => moveRight  = true);
    R.on("pointerup",   () => moveRight  = false);
    R.on("pointerout",  () => moveRight  = false);

    J.on("pointerdown", () => jumpPressed = true);
    J.on("pointerup",   () => jumpPressed = false);
    J.on("pointerout",  () => jumpPressed = false);
}

// ── Mixin de pausa — se llama en create() de cada nivel ───────
function setupPause(scene) {
    scene.isPaused   = false;
    scene.levelDone  = false;
    scene._pauseUI   = buildPauseOverlay(scene);

    scene.togglePause = function() {
        if (scene.levelDone) return;
        scene.isPaused = !scene.isPaused;
        const show = scene.isPaused;

        scene._pauseUI.overlay.setVisible(show);
        scene._pauseUI.title.setVisible(show);
        scene._pauseUI.contBtn.setVisible(show);
        scene._pauseUI.menBtn.setVisible(show);

        if (show) {
            scene.physics.pause();
            moveLeft = false; moveRight = false;
        } else {
            scene.physics.resume();
        }
    };

    // ESC para pausar
    scene.input.keyboard.on("keydown-ESC", () => {
        if (scene.togglePause) scene.togglePause();
    });
}

// ── Preload de sprites PNG opcionales ─────────────────────────
function preloadSprites(scene) {
    if (GAME_CONFIG.sprites.player)  scene.load.image("player_img",  GAME_CONFIG.sprites.player);
    if (GAME_CONFIG.sprites.enemy)   scene.load.image("enemy_img",   GAME_CONFIG.sprites.enemy);
    if (GAME_CONFIG.sprites.ground)  scene.load.image("ground_img",  GAME_CONFIG.sprites.ground);
    if (GAME_CONFIG.sprites.platform) scene.load.image("plat_img",   GAME_CONFIG.sprites.platform);
}

// ============================================================
//  ESCENA: MENÚ PRINCIPAL
// ============================================================

class MainMenu extends Phaser.Scene {
    constructor() { super("menu"); }

    create() {
        moveLeft = false; moveRight = false; jumpPressed = false;

        const W = this.scale.width;
        const H = this.scale.height;

        this.cameras.main.setBackgroundColor("#1a1a2e");

        for (let i = 0; i < 80; i++) {
            this.add.circle(
                Phaser.Math.Between(0, W),
                Phaser.Math.Between(0, H * 0.75),
                Phaser.Math.FloatBetween(1, 3),
                0xffffff, Phaser.Math.FloatBetween(0.3, 1)
            );
        }

        this.add.text(W / 2, 85, GAME_CONFIG.title, {
            fontSize: "52px", color: "#ffffff", fontStyle: "bold",
            stroke: "#ff66b3", strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(W / 2, 150, GAME_CONFIG.subtitle, {
            fontSize: "21px", color: "#ffcce0"
        }).setOrigin(0.5);

        this.add.text(W / 2, 210, "— Selecciona tu personaje —", {
            fontSize: "17px", color: "#9999bb"
        }).setOrigin(0.5);

        const btnD = this.add.text(W / 2 - 130, 290, "  " + GAME_CONFIG.players[0] + "  ", {
            fontSize: "27px", color: "#fff", backgroundColor: "#2980b9", padding: { x: 20, y: 11 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const btnW = this.add.text(W / 2 + 130, 290, "  " + GAME_CONFIG.players[1] + "  ", {
            fontSize: "27px", color: "#fff", backgroundColor: "#c0392b", padding: { x: 20, y: 11 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const selTxt = this.add.text(W / 2, 365, "✔ " + selectedPlayer, {
            fontSize: "19px", color: "#ffe66d"
        }).setOrigin(0.5);

        const btnPlay = this.add.text(W / 2, 445, "  ▶  JUGAR  ▶  ", {
            fontSize: "31px", color: "#000", backgroundColor: "#f1c40f", padding: { x: 28, y: 13 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.add.text(W / 2, 515,
            "← → mover   ↑ saltar   ESC pausar   (móvil: botones pantalla)",
            { fontSize: "13px", color: "#777799" }
        ).setOrigin(0.5);

        btnD.on("pointerdown", () => { selectedPlayer = GAME_CONFIG.players[0]; selTxt.setText("✔ " + selectedPlayer); });
        btnD.on("pointerover",  () => btnD.setStyle({ backgroundColor: "#3498db" }));
        btnD.on("pointerout",   () => btnD.setStyle({ backgroundColor: "#2980b9" }));

        btnW.on("pointerdown", () => { selectedPlayer = GAME_CONFIG.players[1]; selTxt.setText("✔ " + selectedPlayer); });
        btnW.on("pointerover",  () => btnW.setStyle({ backgroundColor: "#e74c3c" }));
        btnW.on("pointerout",   () => btnW.setStyle({ backgroundColor: "#c0392b" }));

        btnPlay.on("pointerdown", () => this.scene.start("level1"));
        btnPlay.on("pointerover",  () => btnPlay.setStyle({ backgroundColor: "#f39c12" }));
        btnPlay.on("pointerout",   () => btnPlay.setStyle({ backgroundColor: "#f1c40f" }));
    }
}

// ============================================================
//  ESCENA: ENTRE NIVELES
// ============================================================

class LevelClear extends Phaser.Scene {
    constructor() { super("levelClear"); }

    init(data) {
        this.nextScene = data.nextScene || "menu";
        this.levelNum  = data.levelNum  || 1;
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        this.cameras.main.setBackgroundColor("#0d0d1a");

        for (let i = 0; i < 60; i++) {
            this.add.circle(
                Phaser.Math.Between(0, W), Phaser.Math.Between(0, H),
                Phaser.Math.FloatBetween(1, 3), 0xffffff, Phaser.Math.FloatBetween(0.3, 1)
            );
        }

        this.add.text(W / 2, H / 2 - 80,
            "🌟  ¡MUNDO " + this.levelNum + " COMPLETADO!  🌟",
            { fontSize: "32px", color: "#f1c40f", fontStyle: "bold" }
        ).setOrigin(0.5);

        const msgs = [
            "¡Lo lograste! Eres increíble.",
            "Un mundo más cerca del final...",
            "¡Sigues siendo la mejor!"
        ];
        this.add.text(W / 2, H / 2, msgs[this.levelNum - 1] || "¡Bien hecho!", {
            fontSize: "21px", color: "#ffffff"
        }).setOrigin(0.5);

        this.add.text(W / 2, H / 2 + 65,
            "Toca la pantalla o pulsa cualquier tecla para continuar",
            { fontSize: "15px", color: "#9999bb" }
        ).setOrigin(0.5);

        this.input.once("pointerdown", () => this.scene.start(this.nextScene));
        this.input.keyboard.once("keydown", () => this.scene.start(this.nextScene));
    }
}

// ============================================================
//  ESCENA: FINAL (WIN)
// ============================================================

class WinScene extends Phaser.Scene {
    constructor() { super("win"); }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        this.cameras.main.setBackgroundColor("#0d0d1a");

        for (let i = 0; i < 100; i++) {
            this.add.circle(
                Phaser.Math.Between(0, W), Phaser.Math.Between(0, H),
                Phaser.Math.FloatBetween(1, 4), 0xffffff, Phaser.Math.FloatBetween(0.2, 1)
            );
        }

        const hearts = ["❤️","💕","💖","✨","🌸"];
        for (let i = 0; i < 8; i++) {
            this.add.text(
                Phaser.Math.Between(20, W - 20),
                Phaser.Math.Between(20, H - 20),
                hearts[Phaser.Math.Between(0, hearts.length - 1)],
                { fontSize: Phaser.Math.Between(20, 38) + "px" }
            );
        }

        this.add.text(W / 2, 90, "🌟 ¡FELICITACIONES! 🌟", {
            fontSize: "36px", color: "#f1c40f", fontStyle: "bold"
        }).setOrigin(0.5);

        this.add.text(W / 2, 155, selectedPlayer + " completó la aventura", {
            fontSize: "19px", color: "#9999bb"
        }).setOrigin(0.5);

        this.add.text(W / 2, 265, GAME_CONFIG.finalMessage, {
            fontSize: "62px", color: "#ff66b3", fontStyle: "bold",
            stroke: "#ffffff", strokeThickness: 4
        }).setOrigin(0.5);

        this.add.text(W / 2, 365, GAME_CONFIG.finalSubMessage, {
            fontSize: "17px", color: "#ffffff", align: "center", lineSpacing: 10
        }).setOrigin(0.5);

        const btn = this.add.text(W / 2, 460, "  ↩ Volver al Menú  ", {
            fontSize: "23px", color: "#000", backgroundColor: "#f1c40f", padding: { x: 22, y: 11 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btn.on("pointerdown", () => this.scene.start("menu"));
        btn.on("pointerover",  () => btn.setStyle({ backgroundColor: "#f39c12" }));
        btn.on("pointerout",   () => btn.setStyle({ backgroundColor: "#f1c40f" }));
    }
}

// ============================================================
//  NIVEL 1 — Mundo del Bosque
//  Mundo de 6000 px — Huecos activos, enemigos, plataformas rebalanceadas
// ============================================================

class Level1 extends Phaser.Scene {
    constructor() { super("level1"); }

    preload() { preloadSprites(this); }

    create() {
        const WW = 6000;
        const WH = 600;
        const GY = 568;

        // ARREGLO CAÍDA: mundo extendido en Y para que el jugador
        // caiga libremente más allá de GY+100 (límite de respawn)
        // sin ser bloqueado por el límite inferior del mundo.
        this.physics.world.setBounds(0, 0, WW, 2000);
        this.cameras.main.setBackgroundColor("#87CEEB");

        // Fondo
        makeClouds(this, WW, 18, 0xffffff);
        [200,500,900,1400,2000,2600,3200,3800,4400,5100].forEach(tx => {
            this.add.rectangle(tx, 522, 20, 80, 0x5D4E37);
            this.add.ellipse(tx, 462, 70, 70, 0x27AE60);
            this.add.ellipse(tx - 20, 477, 50, 50, 0x2ECC71);
        });

        const PC = GAME_CONFIG.platformColors[1];

        // ── Definición de suelos ──
        const sueloData = [
            { x: 600,  y: GY, w: 1200, h: 40 },   // inicio
            { x: 2200, y: GY, w: 1400, h: 40 },   // mitad
            { x: 4100, y: GY, w: 1100, h: 40 },   // tramo 3
            { x: 5700, y: GY, w: 600,  h: 40 },   // meta
        ];

        // ── Plataformas elevadas (reducidas y más difíciles) ──
        const platData = [
            // sección 1 — zigzag escalonado
            { x: 520,  y: 470, w: 130, h: 22 },
            { x: 720,  y: 390, w: 110, h: 22 },
            { x: 950,  y: 320, w: 110, h: 22 },
            { x: 1180, y: 250, w: 130, h: 22 },   // pico
            { x: 1420, y: 310, w: 110, h: 22 },   // puente hueco 1
            { x: 1650, y: 390, w: 110, h: 22 },
            { x: 1900, y: 460, w: 110, h: 22 },

            // sección 2 — zigzag fuerte
            { x: 2320, y: 430, w: 130, h: 22 },
            { x: 2540, y: 340, w: 110, h: 22 },
            { x: 2760, y: 260, w: 110, h: 22 },   // pico
            { x: 3000, y: 330, w: 130, h: 22 },
            { x: 3240, y: 410, w: 110, h: 22 },
            { x: 3480, y: 330, w: 110, h: 22 },
            { x: 3720, y: 400, w: 110, h: 22 },   // puente hueco 2

            // sección 3 — subida al final
            { x: 4180, y: 460, w: 130, h: 22 },
            { x: 4400, y: 370, w: 110, h: 22 },
            { x: 4640, y: 290, w: 140, h: 22 },
            { x: 4890, y: 380, w: 110, h: 22 },
            { x: 5130, y: 460, w: 110, h: 22 },
            { x: 5400, y: 390, w: 140, h: 22 },
        ];

        // ── Bloques flotantes ? ──
        const qData = [
            { x: 720,  y: 340 }, { x: 1200, y: 200 }, { x: 1650, y: 340 },
            { x: 2760, y: 210 }, { x: 3000, y: 280 }, { x: 4400, y: 320 },
            { x: 4890, y: 330 }, { x: 5400, y: 340 },
        ];

        // ── Tuberías (obstáculos) ──
        const pipeData = [
            { x: 400,  y: 536, w: 60, h: 60 },
            { x: 1100, y: 496, w: 60, h: 100 },
            { x: 2450, y: 516, w: 60, h: 80 },
            { x: 3850, y: 524, w: 60, h: 70 },
            { x: 5020, y: 534, w: 60, h: 60 },
        ];

        // Armar física
        const allPlatData = [...sueloData, ...platData, ...qData.map(q => ({ ...q, w: 40, h: 20 })), ...pipeData];
        const plats = makePlatforms(this, allPlatData, PC);

        // Visuales decorativos sobre los datos
        makeGroundBlocks(this, sueloData, GAME_CONFIG.groundBlockColors[1]);
        makeQBlocks(this, qData);
        pipeData.forEach(p => this.add.rectangle(p.x, p.y, p.w, p.h, 0x2ECC40));

        // Letreros
        GAME_CONFIG.level1Signs.forEach((txt, i) => {
            const xs = [350, 1200, 2700, 4200, 5400];
            if (xs[i] !== undefined) makeSign(this, xs[i], 490, txt);
        });

        // Jugador
        const color = GAME_CONFIG.playerColors[selectedPlayer] || 0x4da6ff;
        this.player = makePlayer(this, 100, 440, color);
        this.player.body.setCollideWorldBounds(true);
        this.player.body.setMaxVelocityY(900);
        this.physics.add.collider(this.player, plats);

        // Enemigos
        this.enemies = makeEnemies(this, GAME_CONFIG.level1Enemies, plats);
        this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
            if (!enemy.alive) return;
            // Saltar encima mata al enemigo
            if (player.body.velocity.y > 50 && player.y < enemy.y - 12) {
                enemy.alive = false;
                enemy.destroy();
                player.body.setVelocityY(-320);
            } else {
                // Contacto lateral o inferior → respawn
                player.body.reset(100, 440);
            }
        });

        // Meta
        const goal = makeGoal(this, 5870, 480);
        this.physics.add.overlap(this.player, goal, () => {
            if (this.levelDone) return;
            this.levelDone = true;
            this.physics.pause();
            this.time.delayedCall(350, () => {
                this.scene.start("levelClear", { nextScene: "level2", levelNum: 1 });
            });
        });

        // Cámara
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, WW, WH);

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        makeMobileControls(this);
        makeHUD(this, 1);
        setupPause(this);

        this.GY = GY;
        this.spawnX = 100;
        this.spawnY = 440;
    }

    update() {
        if (this.isPaused || this.levelDone) return;
        handleMovement(this.player, this.cursors, GAME_CONFIG.playerSpeed, GAME_CONFIG.jumpForce);
        handleRespawn(this.player, this.spawnX, this.spawnY, this.GY + 80);
        updateEnemies(this.enemies);
    }
}

// ============================================================
//  NIVEL 2 — Mundo de la Noche
//  Mundo de 4500 px — Más oscuro, más difícil
// ============================================================

class Level2 extends Phaser.Scene {
    constructor() { super("level2"); }

    preload() { preloadSprites(this); }

    create() {
        const WW = 4500;
        const WH = 600;
        const GY = 568;

        this.physics.world.setBounds(0, 0, WW, 2000);
        this.cameras.main.setBackgroundColor("#1a1a2e");

        // Fondo noche
        for (let i = 0; i < 120; i++) {
            this.add.circle(
                Phaser.Math.Between(0, WW), Phaser.Math.Between(0, 250),
                Phaser.Math.FloatBetween(1, 3), 0xffffff, Phaser.Math.FloatBetween(0.3, 1)
            );
        }
        this.add.circle(WW - 300, 80, 50, 0xFFF9C4, 0.9);
        this.add.circle(WW - 272, 68, 50, 0x1a1a2e);
        [300, 800, 1500, 2200, 2900, 3600, 4200].forEach(tx => {
            this.add.rectangle(tx, 532, 10, 30, 0xFF6600);
            this.add.ellipse(tx, 514, 18, 22, 0xFFAA00, 0.85);
        });

        const PC = GAME_CONFIG.platformColors[2];

        const sueloData = [
            { x: 550,  y: GY, w: 1000, h: 40 },
            { x: 2050, y: GY, w: 1100, h: 40 },
            { x: 3850, y: GY, w: 1000, h: 40 },
        ];

        const platData = [
            // 1ª mitad — zigzag pronunciado
            { x: 300,  y: 450, w: 120, h: 22 },
            { x: 480,  y: 360, w: 100, h: 22 },
            { x: 660,  y: 270, w: 110, h: 22 },
            { x: 860,  y: 190, w: 120, h: 22 },   // pico
            { x: 1060, y: 270, w: 100, h: 22 },
            { x: 1250, y: 360, w: 100, h: 22 },
            { x: 1450, y: 270, w: 110, h: 22 },
            { x: 1660, y: 190, w: 130, h: 22 },   // puente hueco 1
            { x: 1860, y: 280, w: 100, h: 22 },

            // 2ª mitad
            { x: 2180, y: 420, w: 120, h: 22 },
            { x: 2380, y: 330, w: 100, h: 22 },
            { x: 2580, y: 240, w: 120, h: 22 },
            { x: 2800, y: 170, w: 110, h: 22 },   // pico
            { x: 3010, y: 250, w: 100, h: 22 },
            { x: 3210, y: 340, w: 120, h: 22 },
            { x: 3430, y: 260, w: 100, h: 22 },
            { x: 3640, y: 350, w: 120, h: 22 },   // puente hueco 2
        ];

        const qData = [
            { x: 660,  y: 220 }, { x: 860,  y: 140 }, { x: 1660, y: 140 },
            { x: 2580, y: 190 }, { x: 2800, y: 120 }, { x: 3210, y: 290 },
        ];

        const allPlatData = [...sueloData, ...platData, ...qData.map(q => ({ ...q, w: 36, h: 20 }))];
        const plats = makePlatforms(this, allPlatData, PC);

        makeGroundBlocks(this, sueloData, GAME_CONFIG.groundBlockColors[2]);
        makeQBlocks(this, qData);

        // Letreros
        GAME_CONFIG.level2Signs.forEach((txt, i) => {
            const xs = [260, 1400, 2750, 4100];
            if (xs[i] !== undefined) makeSign(this, xs[i], 490, txt);
        });

        // Jugador
        const color = GAME_CONFIG.playerColors[selectedPlayer] || 0x4da6ff;
        this.player = makePlayer(this, 100, 440, color);
        this.player.body.setCollideWorldBounds(true);
        this.player.body.setMaxVelocityY(900);
        this.physics.add.collider(this.player, plats);

        // Enemigos
        this.enemies = makeEnemies(this, GAME_CONFIG.level2Enemies, plats);
        this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
            if (!enemy.alive) return;
            if (player.body.velocity.y > 50 && player.y < enemy.y - 12) {
                enemy.alive = false;
                enemy.destroy();
                player.body.setVelocityY(-320);
            } else {
                player.body.reset(100, 440);
            }
        });

        // Meta
        const goal = makeGoal(this, 4370, 480);
        this.physics.add.overlap(this.player, goal, () => {
            if (this.levelDone) return;
            this.levelDone = true;
            this.physics.pause();
            this.time.delayedCall(350, () => {
                this.scene.start("levelClear", { nextScene: "level3", levelNum: 2 });
            });
        });

        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, WW, WH);

        this.cursors = this.input.keyboard.createCursorKeys();
        makeMobileControls(this);
        makeHUD(this, 2);
        setupPause(this);

        this.GY = GY;
        this.spawnX = 100;
        this.spawnY = 440;
    }

    update() {
        if (this.isPaused || this.levelDone) return;
        handleMovement(this.player, this.cursors, GAME_CONFIG.playerSpeed, GAME_CONFIG.jumpForce);
        handleRespawn(this.player, this.spawnX, this.spawnY, this.GY + 80);
        updateEnemies(this.enemies);
    }
}

// ============================================================
//  NIVEL 3 — Mundo del Atardecer (el más especial)
//  ARREGLOS:
//  1. Castillo ahora es solo decorativo (sin bloque físico que bloquee)
//  2. Meta movida a posición alcanzable frente al castillo
//  3. Plataformas de acceso al castillo añadidas
// ============================================================

class Level3 extends Phaser.Scene {
    constructor() { super("level3"); }

    preload() { preloadSprites(this); }

    create() {
        const WW = 4200;
        const WH = 600;
        const GY = 568;

        this.physics.world.setBounds(0, 0, WW, 2000);
        this.cameras.main.setBackgroundColor("#FF8C42");

        // Fondo atardecer
        this.add.rectangle(WW / 2, 120, WW, 240, 0xFF6B6B, 0.35);
        this.add.rectangle(WW / 2, 280, WW, 240, 0xFFD93D, 0.2);
        makeClouds(this, WW, 14, 0xFFB3BA);
        this.add.circle(200, 95, 60, 0xFFD700, 0.95);
        this.add.circle(200, 95, 72, 0xFFE066, 0.3);

        [600, 1200, 1900, 2700, 3600].forEach(hx => {
            this.add.text(hx, Phaser.Math.Between(120, 220), "❤️",
                { fontSize: Phaser.Math.Between(22, 36) + "px" }
            );
        });

        const PC = GAME_CONFIG.platformColors[3];

        const sueloData = [
            { x: 500,  y: GY, w: 900,  h: 40 },   // inicio
            { x: 1850, y: GY, w: 1100, h: 40 },   // mitad
            { x: 3600, y: GY, w: 1200, h: 40 },   // final (llega al castillo)
        ];

        const platData = [
            // Escalera ascendente — sección 1
            { x: 300,  y: 470, w: 130, h: 22 },
            { x: 490,  y: 390, w: 110, h: 22 },
            { x: 680,  y: 310, w: 110, h: 22 },
            { x: 880,  y: 230, w: 140, h: 22 },   // pico 1
            { x: 1090, y: 300, w: 110, h: 22 },
            { x: 1290, y: 370, w: 110, h: 22 },   // puente hueco 1
            { x: 1490, y: 300, w: 110, h: 22 },
            { x: 1700, y: 390, w: 110, h: 22 },

            // 2ª parte
            { x: 1960, y: 440, w: 120, h: 22 },
            { x: 2160, y: 350, w: 110, h: 22 },
            { x: 2360, y: 260, w: 130, h: 22 },
            { x: 2570, y: 180, w: 140, h: 22 },   // pico 2
            { x: 2790, y: 250, w: 110, h: 22 },
            { x: 2990, y: 330, w: 110, h: 22 },
            { x: 3190, y: 410, w: 110, h: 22 },   // puente hueco 2
            { x: 3370, y: 470, w: 110, h: 22 },

            // Escalera para subir al castillo
            { x: 3590, y: 440, w: 120, h: 22 },
            { x: 3730, y: 370, w: 110, h: 22 },
            { x: 3870, y: 300, w: 110, h: 22 },   // nivel battlement
        ];

        const qData = [
            { x: 680,  y: 260 }, { x: 880,  y: 180 }, { x: 1290, y: 320 },
            { x: 2360, y: 210 }, { x: 2570, y: 130 }, { x: 2990, y: 280 },
            { x: 3730, y: 320 },
        ];

        const allPlatData = [...sueloData, ...platData, ...qData.map(q => ({ ...q, w: 38, h: 20 }))];
        const plats = makePlatforms(this, allPlatData, PC);

        makeGroundBlocks(this, sueloData, GAME_CONFIG.groundBlockColors[3]);
        makeQBlocks(this, qData);

        // ── Castillo DECORATIVO (sin física para no bloquear al jugador) ──
        // Torres y almenas — solo visuales
        this.add.rectangle(4050, 430, 260, 280, 0xA04000);   // cuerpo castillo
        this.add.rectangle(3940, 305, 90, 22, 0xC0392B);     // almena izquierda
        this.add.rectangle(4140, 305, 90, 22, 0xC0392B);     // almena derecha
        this.add.rectangle(3950, 490, 30, 80, 0x6D2D00);     // puerta
        // Ventanas
        this.add.rectangle(4010, 420, 22, 28, 0x1a1a2e, 0.8);
        this.add.rectangle(4090, 420, 22, 28, 0x1a1a2e, 0.8);

        // Letreros
        GAME_CONFIG.level3Signs.forEach((txt, i) => {
            const xs = [240, 1050, 2540, 3750];
            if (xs[i] !== undefined) makeSign(this, xs[i], 490, txt);
        });

        // Jugador
        const color = GAME_CONFIG.playerColors[selectedPlayer] || 0x4da6ff;
        this.player = makePlayer(this, 100, 440, color);
        this.player.body.setCollideWorldBounds(true);
        this.player.body.setMaxVelocityY(900);
        this.physics.add.collider(this.player, plats);

        // Enemigos
        this.enemies = makeEnemies(this, GAME_CONFIG.level3Enemies, plats);
        this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
            if (!enemy.alive) return;
            if (player.body.velocity.y > 50 && player.y < enemy.y - 12) {
                enemy.alive = false;
                enemy.destroy();
                player.body.setVelocityY(-320);
            } else {
                player.body.reset(100, 440);
            }
        });

        // ARREGLO META:
        // Meta colocada frente al castillo, sobre el suelo accesible.
        // El jugador sube las plataformas y llega caminando.
        const goal = makeGoal(this, 3950, 490);
        this.physics.add.overlap(this.player, goal, () => {
            if (this.levelDone) return;
            this.levelDone = true;
            this.physics.pause();
            this.time.delayedCall(350, () => {
                this.scene.start("win");
            });
        });

        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, WW, WH);

        this.cursors = this.input.keyboard.createCursorKeys();
        makeMobileControls(this);
        makeHUD(this, 3);
        setupPause(this);

        this.GY = GY;
        this.spawnX = 100;
        this.spawnY = 440;
    }

    update() {
        if (this.isPaused || this.levelDone) return;
        handleMovement(this.player, this.cursors, GAME_CONFIG.playerSpeed, GAME_CONFIG.jumpForce);
        handleRespawn(this.player, this.spawnX, this.spawnY, this.GY + 80);
        updateEnemies(this.enemies);
    }
}

// ============================================================
//  ARRANQUE DE PHASER
// ============================================================

new Phaser.Game({
    type: Phaser.AUTO,
    width: 960,
    height: 540,
    backgroundColor: "#1a1a2e",
    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: GAME_CONFIG.gravity },
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [ MainMenu, Level1, Level2, Level3, LevelClear, WinScene ]
});
