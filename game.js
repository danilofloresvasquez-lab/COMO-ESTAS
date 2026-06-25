// ============================================================
//  VARIABLES GLOBALES
// ============================================================

let selectedPlayer  = "Mr. Danilo";
let moveLeft        = false;
let moveRight       = false;
let jumpPressed     = false;
let mobileJumpHeld  = false;   // para detectar borde de subida (multitouch)

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

// Bloques decorativos de ladrillo sobre el suelo (solo visual)
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

// Muros en el suelo — el jugador los salta, los enemigos quedan atrapados entre ellos
// Se construyen sentados sobre la superficie del suelo (groundSurface = GY - 20)
function makeGroundWalls(scene, walls, color) {
    const GS = 548; // superficie del suelo (GY=568, h=40, top=568-20=548)
    return walls.map(w => {
        const wallY = GS - w.h / 2;
        const rect  = scene.add.rectangle(w.x, wallY, w.w || 44, w.h, color);
        // Líneas de ladrillo decorativas
        const dk = Phaser.Display.Color.ValueToColor(color);
        const dkHex = Phaser.Display.Color.GetColor(
            Math.max(0, dk.r - 30), Math.max(0, dk.g - 30), Math.max(0, dk.b - 30)
        );
        scene.add.rectangle(w.x, wallY, (w.w || 44) - 2, w.h - 2, color).setStrokeStyle(1, dkHex);
        scene.physics.add.existing(rect, true);
        return rect;
    });
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
        fontSize: "12px", color: "#333300", wordWrap: { width: 260 }
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

// Enemigos patrulla — quedan atrapados entre los muros del suelo
// Para usar PNG: pon el nombre en GAME_CONFIG.sprites.enemy
function makeEnemies(scene, data, platforms) {
    const group = scene.physics.add.group();
    data.forEach(cfg => {
        let en;
        if (GAME_CONFIG.sprites.enemy && scene.textures.exists("enemy_img")) {
            en = scene.add.image(cfg.x, cfg.y, "enemy_img").setDisplaySize(34, 34);
            scene.physics.add.existing(en);
        } else {
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

function makePlayer(scene, x, y, color) {
    let p;
    if (GAME_CONFIG.sprites.player && scene.textures.exists("player_img")) {
        p = scene.add.image(x, y, "player_img").setDisplaySize(34, 54);
        scene.physics.add.existing(p);
    } else {
        p = scene.add.rectangle(x, y, 34, 54, color);
        scene.physics.add.existing(p);
    }
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

function handleRespawn(player, rx, ry, limitY) {
    if (player.y > limitY) {
        player.body.reset(rx, ry);
    }
}

// ── Multitouch en móvil ────────────────────────────────────────
// Escanea todos los punteros activos cada frame — soporta
// presionar correr y saltar al mismo tiempo sin problema.
function scanMobileInput(scene) {
    const H  = scene.scale.height;
    const W  = scene.scale.width;
    const pH = H * 0.72;    // zona inferior de la pantalla
    let l = false, r = false, j = false;

    scene.input.manager.pointers.forEach(p => {
        if (!p.isDown) return;
        const x = p.x, y = p.y;
        if (y > pH) {
            if (x > 18  && x < 108) l = true;
            if (x > 108 && x < 200) r = true;
            if (x > W - 130)        j = true;
        }
    });

    moveLeft  = l;
    moveRight = r;

    // Disparar jumpPressed solo al BAJAR el dedo (borde subida)
    if (j && !mobileJumpHeld) jumpPressed = true;
    mobileJumpHeld = j;
}

// Botones visuales — solo decorativos, el input real lo maneja scanMobileInput
function makeMobileButtons(scene) {
    const w = scene.scale.width;
    const h = scene.scale.height;
    const style = {
        fontSize: "36px", color: "#ffffff",
        backgroundColor: "#00000077", padding: { x: 12, y: 6 }
    };
    scene.add.text(55,     h - 68, "◀", style).setScrollFactor(0).setDepth(20);
    scene.add.text(135,    h - 68, "▶", style).setScrollFactor(0).setDepth(20);
    scene.add.text(w - 75, h - 68, "▲", style).setScrollFactor(0).setDepth(20);
    // Habilitar soporte de 5 punteros simultáneos
    scene.input.addPointer(4);
}

// ── HUD con botones pausa y menú ──────────────────────────────
function makeHUD(scene, levelNum) {
    scene.add.text(14, 12, "Mundo " + levelNum + "   |   " + selectedPlayer, {
        fontSize: "15px", color: "#ffffff", stroke: "#000000", strokeThickness: 3
    }).setScrollFactor(0).setDepth(20);

    const W = scene.scale.width;

    const menuBtn = scene.add.text(W - 56, 10, " 🏠 ", {
        fontSize: "19px", color: "#fff", backgroundColor: "#00000099", padding: { x: 6, y: 4 }
    }).setScrollFactor(0).setDepth(20).setInteractive({ useHandCursor: true });

    const pauseBtn = scene.add.text(W - 112, 10, " ⏸ ", {
        fontSize: "19px", color: "#fff", backgroundColor: "#00000099", padding: { x: 6, y: 4 }
    }).setScrollFactor(0).setDepth(20).setInteractive({ useHandCursor: true });

    menuBtn.on("pointerdown",  () => { moveLeft = false; moveRight = false; mobileJumpHeld = false; scene.scene.start("menu"); });
    menuBtn.on("pointerover",  () => menuBtn.setStyle({ backgroundColor: "#c0392b99" }));
    menuBtn.on("pointerout",   () => menuBtn.setStyle({ backgroundColor: "#00000099" }));

    pauseBtn.on("pointerdown", () => { if (scene.togglePause) scene.togglePause(); });
    pauseBtn.on("pointerover",  () => pauseBtn.setStyle({ backgroundColor: "#2980b999" }));
    pauseBtn.on("pointerout",   () => pauseBtn.setStyle({ backgroundColor: "#00000099" }));
}

// ── Overlay de pausa ──────────────────────────────────────────
function buildPauseOverlay(scene) {
    const W = scene.scale.width, H = scene.scale.height;

    const overlay = scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7)
        .setScrollFactor(0).setDepth(30).setVisible(false);
    const title = scene.add.text(W / 2, H / 2 - 70, "⏸  PAUSA", {
        fontSize: "38px", color: "#f1c40f", fontStyle: "bold", stroke: "#000", strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(31).setVisible(false);
    const contBtn = scene.add.text(W / 2, H / 2 + 5, "  ▶  Continuar  ", {
        fontSize: "26px", color: "#000", backgroundColor: "#2ecc71", padding: { x: 22, y: 11 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(31).setInteractive({ useHandCursor: true }).setVisible(false);
    const menBtn = scene.add.text(W / 2, H / 2 + 72, "  🏠  Salir al Menú  ", {
        fontSize: "22px", color: "#fff", backgroundColor: "#e74c3c", padding: { x: 22, y: 10 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(31).setInteractive({ useHandCursor: true }).setVisible(false);

    contBtn.on("pointerover", () => contBtn.setStyle({ backgroundColor: "#27ae60" }));
    contBtn.on("pointerout",  () => contBtn.setStyle({ backgroundColor: "#2ecc71" }));
    contBtn.on("pointerdown", () => { if (scene.togglePause) scene.togglePause(); });

    menBtn.on("pointerover",  () => menBtn.setStyle({ backgroundColor: "#c0392b" }));
    menBtn.on("pointerout",   () => menBtn.setStyle({ backgroundColor: "#e74c3c" }));
    menBtn.on("pointerdown",  () => { moveLeft = false; moveRight = false; mobileJumpHeld = false; scene.scene.start("menu"); });

    return { overlay, title, contBtn, menBtn };
}

function setupPause(scene) {
    scene.isPaused  = false;
    scene.levelDone = false;
    scene._pauseUI  = buildPauseOverlay(scene);

    scene.togglePause = function () {
        if (scene.levelDone) return;
        scene.isPaused = !scene.isPaused;
        const show = scene.isPaused;
        scene._pauseUI.overlay.setVisible(show);
        scene._pauseUI.title.setVisible(show);
        scene._pauseUI.contBtn.setVisible(show);
        scene._pauseUI.menBtn.setVisible(show);
        if (show) { scene.physics.pause(); moveLeft = false; moveRight = false; }
        else       { scene.physics.resume(); }
    };

    scene.input.keyboard.on("keydown-ESC", () => { if (scene.togglePause) scene.togglePause(); });
}

function preloadSprites(scene) {
    if (GAME_CONFIG.sprites.player) scene.load.image("player_img", GAME_CONFIG.sprites.player);
    if (GAME_CONFIG.sprites.enemy)  scene.load.image("enemy_img",  GAME_CONFIG.sprites.enemy);
    if (GAME_CONFIG.sprites.cat)    scene.load.image("cat_img",    GAME_CONFIG.sprites.cat);
}

// ── Casita para la escena del gato ────────────────────────────
function drawHouse(scene, x, groundY) {
    scene.add.rectangle(x, groundY - 30, 82, 62, 0xBCAAA4).setStrokeStyle(2, 0x8D6E63);
    const g = scene.add.graphics();
    g.fillStyle(0xB71C1C);
    g.fillTriangle(x - 52, groundY - 61, x + 52, groundY - 61, x, groundY - 105);
    scene.add.rectangle(x, groundY - 10, 20, 40, 0x6D4C41).setStrokeStyle(1, 0x4E342E);
    scene.add.rectangle(x - 22, groundY - 42, 16, 16, 0x90CAF9).setStrokeStyle(1, 0x5C6BC0);
}

// ============================================================
//  ESCENA: MENÚ PRINCIPAL
// ============================================================

class MainMenu extends Phaser.Scene {
    constructor() { super("menu"); }

    create() {
        moveLeft = false; moveRight = false; jumpPressed = false; mobileJumpHeld = false;

        const W = this.scale.width, H = this.scale.height;
        this.cameras.main.setBackgroundColor("#1a1a2e");

        for (let i = 0; i < 80; i++) {
            this.add.circle(
                Phaser.Math.Between(0, W), Phaser.Math.Between(0, H * 0.75),
                Phaser.Math.FloatBetween(1, 3), 0xffffff, Phaser.Math.FloatBetween(0.3, 1)
            );
        }

        this.add.text(W / 2, 85, GAME_CONFIG.title, {
            fontSize: "52px", color: "#ffffff", fontStyle: "bold", stroke: "#ff66b3", strokeThickness: 6
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

        this.add.text(W / 2, 515, "← → mover   ↑ saltar   ESC pausar   (móvil: botones pantalla)", {
            fontSize: "13px", color: "#777799"
        }).setOrigin(0.5);

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
        const W = this.scale.width, H = this.scale.height;
        this.cameras.main.setBackgroundColor("#0d0d1a");

        for (let i = 0; i < 60; i++) {
            this.add.circle(
                Phaser.Math.Between(0, W), Phaser.Math.Between(0, H),
                Phaser.Math.FloatBetween(1, 3), 0xffffff, Phaser.Math.FloatBetween(0.3, 1)
            );
        }

        this.add.text(W / 2, H / 2 - 80, "🌟  ¡MUNDO " + this.levelNum + " COMPLETADO!  🌟", {
            fontSize: "32px", color: "#f1c40f", fontStyle: "bold"
        }).setOrigin(0.5);

        const msgs = ["¡Lo lograste! Eres increíble.", "Un mundo más cerca del final...", "¡Sigues siendo la mejor!"];
        this.add.text(W / 2, H / 2, msgs[this.levelNum - 1] || "¡Bien hecho!", {
            fontSize: "21px", color: "#ffffff"
        }).setOrigin(0.5);

        this.add.text(W / 2, H / 2 + 65, "Toca la pantalla o pulsa cualquier tecla para continuar", {
            fontSize: "15px", color: "#9999bb"
        }).setOrigin(0.5);

        this.input.once("pointerdown", () => this.scene.start(this.nextScene));
        this.input.keyboard.once("keydown", () => this.scene.start(this.nextScene));
    }
}

// ============================================================
//  ESCENA: GATO FINAL — animación + mensaje
// ============================================================

class CatScene extends Phaser.Scene {
    constructor() { super("cat"); }

    preload() {
        if (GAME_CONFIG.sprites.cat)    this.load.image("cat_img",    GAME_CONFIG.sprites.cat);
        if (GAME_CONFIG.sprites.player) this.load.image("player_img", GAME_CONFIG.sprites.player);
    }

    create() {
        const W = this.scale.width, H = this.scale.height;
        this.cameras.main.setBackgroundColor("#0d0d1a");

        // Estrellas y corazones de fondo
        for (let i = 0; i < 70; i++) {
            this.add.circle(
                Phaser.Math.Between(0, W), Phaser.Math.Between(0, H),
                Phaser.Math.FloatBetween(1, 3), 0xffffff, Phaser.Math.FloatBetween(0.3, 0.9)
            );
        }
        ["❤️","💕","✨","🌸","💖"].forEach(h => {
            this.add.text(
                Phaser.Math.Between(30, W - 30),
                Phaser.Math.Between(20, H * 0.3),
                h, { fontSize: Phaser.Math.Between(18, 30) + "px" }
            );
        });

        const groundY = H - 70;

        // Suelo de la escena
        this.add.rectangle(W / 2, groundY + 18, W, 36, 0x5D4E37);

        // Casita a la derecha (destino de la animación)
        const houseX = W - 110;
        drawHouse(this, houseX, groundY);

        // Colores y nombres
        const playerColor = GAME_CONFIG.playerColors[selectedPlayer] || 0x4da6ff;
        const otherName   = selectedPlayer === GAME_CONFIG.players[0] ? GAME_CONFIG.players[1] : GAME_CONFIG.players[0];
        const otherColor  = GAME_CONFIG.playerColors[otherName] || 0xff66b3;
        const catColor    = GAME_CONFIG.catColor || 0xFF8C00;

        // ── FASE 1: El gato cae desde arriba ──────────────────
        let cat;
        if (GAME_CONFIG.sprites.cat && this.textures.exists("cat_img")) {
            cat = this.add.image(W / 2, -60, "cat_img").setDisplaySize(44, 44);
        } else {
            cat = this.add.rectangle(W / 2, -60, 44, 44, catColor);
        }
        const catLabel = this.add.text(W / 2, -110, GAME_CONFIG.catName, {
            fontSize: "13px", color: "#ffffff", stroke: "#000", strokeThickness: 2
        }).setOrigin(0.5);

        this.tweens.add({
            targets: cat,
            y: groundY - 22,
            duration: 700, ease: "Bounce.Out",
            onComplete: () => {
                catLabel.setPosition(cat.x, cat.y - 62);

                // Burbuja de habla del gato
                const bw = 200;
                const bubble = this.add.rectangle(W / 2, cat.y - 80, bw, 46, 0xffffff)
                    .setStrokeStyle(2, 0x555555);
                const speechTxt = this.add.text(W / 2, cat.y - 80, GAME_CONFIG.catSpeech, {
                    fontSize: "11px", color: "#333333", align: "center", wordWrap: { width: bw - 16 }
                }).setOrigin(0.5);
                // Triángulo de burbuja
                const bTri = this.add.triangle(W / 2, cat.y - 57, -8, 0, 8, 0, 0, 12, 0xffffff);

                // ── FASE 2: Aparece el otro personaje ─────────────
                this.time.delayedCall(2000, () => {
                    let other;
                    if (GAME_CONFIG.sprites.player && this.textures.exists("player_img")) {
                        other = this.add.image(-40, groundY - 27, "player_img").setDisplaySize(34, 54);
                    } else {
                        other = this.add.rectangle(-40, groundY - 27, 34, 54, otherColor);
                    }
                    const otherLabel = this.add.text(-40, groundY - 70, otherName, {
                        fontSize: "11px", color: "#ffffff", stroke: "#000", strokeThickness: 2
                    }).setOrigin(0.5);

                    this.tweens.add({
                        targets: other,
                        x: W / 2 - 80, duration: 700, ease: "Power2.Out",
                        onUpdate: () => otherLabel.setX(other.x),
                        onComplete: () => {
                            otherLabel.setX(other.x);

                            // ── FASE 3: Los dos caminan a la casita ───────────
                            this.time.delayedCall(1400, () => {
                                bubble.destroy();
                                speechTxt.destroy();
                                bTri.destroy();

                                // Caminar hacia casa
                                this.tweens.add({ targets: cat,      x: houseX,      duration: 1300, ease: "Linear", onUpdate: () => catLabel.setX(cat.x) });
                                this.tweens.add({ targets: catLabel, x: houseX,      duration: 1300, ease: "Linear" });
                                this.tweens.add({ targets: other,    x: houseX - 46, duration: 1300, ease: "Linear", onUpdate: () => otherLabel.setX(other.x) });
                                this.tweens.add({
                                    targets: otherLabel, x: houseX - 46, duration: 1300, ease: "Linear",
                                    onComplete: () => {
                                        // Entrar a la casita (achicarse)
                                        this.tweens.add({
                                            targets: [cat, catLabel, other, otherLabel],
                                            scaleX: 0, scaleY: 0, duration: 350,
                                            onComplete: () => {
                                                this.time.delayedCall(300, () => this._showFinalMessage());
                                            }
                                        });
                                    }
                                });
                            });
                        }
                    });
                });
            }
        });
    }

    _showFinalMessage() {
        const W = this.scale.width, H = this.scale.height;

        const panel = this.add.rectangle(W / 2, H / 2, W - 60, H - 40, 0x0d0d1a, 0)
            .setStrokeStyle(2, 0xff66b3);
        this.tweens.add({ targets: panel, alpha: 1, duration: 500 });

        // Overlay oscuro sobre fondo
        this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.82);

        const playerColor = GAME_CONFIG.playerColors[selectedPlayer] || 0x4da6ff;
        const otherName   = selectedPlayer === GAME_CONFIG.players[0] ? GAME_CONFIG.players[1] : GAME_CONFIG.players[0];
        const otherColor  = GAME_CONFIG.playerColors[otherName] || 0xff66b3;
        const catColor    = GAME_CONFIG.catColor || 0xFF8C00;

        // Tres personajes centrados
        const charY = H / 2 - 95;

        // Jugador actual (izquierda)
        this.add.rectangle(W / 2 - 110, charY, 44, 54, playerColor).setStrokeStyle(2, 0xffffff);
        this.add.text(W / 2 - 110, charY + 43, selectedPlayer, {
            fontSize: "10px", color: "#ffffff", stroke: "#000", strokeThickness: 2
        }).setOrigin(0.5);

        // Gato (centro)
        if (GAME_CONFIG.sprites.cat && this.textures.exists("cat_img")) {
            this.add.image(W / 2, charY + 5, "cat_img").setDisplaySize(44, 44);
        } else {
            this.add.rectangle(W / 2, charY + 5, 44, 44, catColor).setStrokeStyle(2, 0xffffff);
        }
        this.add.text(W / 2, charY + 43, GAME_CONFIG.catName, {
            fontSize: "10px", color: "#ffffff", stroke: "#000", strokeThickness: 2
        }).setOrigin(0.5);

        // Otro jugador (derecha)
        this.add.rectangle(W / 2 + 110, charY, 44, 54, otherColor).setStrokeStyle(2, 0xffffff);
        this.add.text(W / 2 + 110, charY + 43, otherName, {
            fontSize: "10px", color: "#ffffff", stroke: "#000", strokeThickness: 2
        }).setOrigin(0.5);

        // Mensaje principal
        this.add.text(W / 2, H / 2 + 5, GAME_CONFIG.finalMessage, {
            fontSize: "46px", color: "#ff66b3", fontStyle: "bold",
            stroke: "#ffffff", strokeThickness: 4
        }).setOrigin(0.5);

        // Submensaje
        this.add.text(W / 2, H / 2 + 68, GAME_CONFIG.finalSubMessage, {
            fontSize: "15px", color: "#ffffff", align: "center",
            lineSpacing: 6, wordWrap: { width: W - 120 }
        }).setOrigin(0.5);

        // Botón volver al menú
        const btn = this.add.text(W / 2, H / 2 + 140, "  ↩ Volver al Menú  ", {
            fontSize: "22px", color: "#000", backgroundColor: "#f1c40f", padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btn.on("pointerdown", () => this.scene.start("menu"));
        btn.on("pointerover",  () => btn.setStyle({ backgroundColor: "#f39c12" }));
        btn.on("pointerout",   () => btn.setStyle({ backgroundColor: "#f1c40f" }));
    }
}

// ============================================================
//  NIVEL 1 — Mundo del Bosque  (6 000 px)
//  Diseño: dificultad en el suelo con muros y enemigos
//          huecos para saltar, pocas plataformas aéreas (solo puentes)
// ============================================================

class Level1 extends Phaser.Scene {
    constructor() { super("level1"); }
    preload() { preloadSprites(this); }

    create() {
        const WW = 6000, WH = 600, GY = 568;
        const GS = GY - 20;   // superficie del suelo

        this.physics.world.setBounds(0, 0, WW, 2000);
        this.cameras.main.setBackgroundColor("#87CEEB");

        // ── Decoración de fondo ──
        makeClouds(this, WW, 16, 0xffffff);

        // Árboles: SOLO sobre secciones con suelo (no en huecos)
        // Suelo 1: x=0-1400, Suelo 2: x=1700-2400, Suelo 3: x=2700-3500
        // Suelo 4: x=3850-4700, Suelo 5: x=5050-5900, Meta: x=6000-6200
        [150, 400, 800, 1100, 1300,
         1800, 2100, 2300,
         2800, 3100, 3400,
         3950, 4300, 4600,
         5100, 5500, 5800
        ].forEach(tx => {
            this.add.rectangle(tx, 522, 20, 80, 0x5D4E37);
            this.add.ellipse(tx, 462, 70, 70, 0x27AE60);
            this.add.ellipse(tx - 20, 477, 50, 50, 0x2ECC71);
        });

        const PC  = GAME_CONFIG.platformColors[1];
        const WC  = GAME_CONFIG.wallColors[1];
        const GBC = GAME_CONFIG.groundBlockColors[1];

        // ── SUELO (secciones con huecos reales) ──
        const sueloData = [
            { x: 700,  y: GY, w: 1400, h: 40 },   // 0 – 1400
            { x: 2050, y: GY, w: 700,  h: 40 },   // 1700 – 2400
            { x: 3100, y: GY, w: 800,  h: 40 },   // 2700 – 3500
            { x: 4275, y: GY, w: 850,  h: 40 },   // 3850 – 4700
            { x: 5475, y: GY, w: 850,  h: 40 },   // 5050 – 5900
            { x: 6100, y: GY, w: 400,  h: 40 },   // 5900 – 6300 (meta)
        ];

        // ── MUROS en el suelo (el jugador los salta; los enemigos quedan entre ellos) ──
        const wallData = [
            // Suelo 1 — 3 pares de muros + 1 muro suelto
            { x: 400,  h: 72 }, { x: 620,  h: 72 },   // par 1 (enemigo en x≈510)
            { x: 880,  h: 56 },                         // muro suelto
            { x: 1100, h: 72 }, { x: 1300, h: 72 },   // par 2 (enemigo en x≈1200)

            // Suelo 2
            { x: 1800, h: 72 }, { x: 2000, h: 72 },   // par 3 (enemigo en x≈1900)
            { x: 2250, h: 56 },                         // muro suelto

            // Suelo 3
            { x: 2820, h: 72 }, { x: 3050, h: 72 },   // par 4 (enemigo en x≈2935)
            { x: 3300, h: 56 },                         // muro suelto

            // Suelo 4
            { x: 3980, h: 72 }, { x: 4200, h: 72 },   // par 5 (enemigo en x≈4090)
            { x: 4500, h: 56 },                         // muro suelto

            // Suelo 5
            { x: 5150, h: 72 }, { x: 5380, h: 72 },   // par 6 (enemigo en x≈5265)
            { x: 5650, h: 56 },                         // muro suelto
        ];

        // ── PUENTES sobre huecos (plataformas aéreas mínimas) ──
        const bridgeData = [
            { x: 1550, y: GS - 80,  w: 120, h: 22 },   // hueco 1400-1700
            { x: 2560, y: GS - 80,  w: 110, h: 22 },   // hueco 2400-2700
            { x: 3680, y: GS - 100, w: 110, h: 22 },   // hueco 3500-3850 (1er puente)
            { x: 3780, y: GS - 60,  w: 110, h: 22 },   // hueco 3500-3850 (2do puente)
            { x: 4870, y: GS - 80,  w: 110, h: 22 },   // hueco 4700-5050
            { x: 5960, y: GS - 80,  w: 100, h: 22 },   // hueco 5900-6100 (pre-meta)
        ];

        // Compilar física
        const sueloPlatforms = makePlatforms(this, sueloData, PC);
        const wallPlatforms  = makeGroundWalls(this, wallData, WC);
        const bridgePlatforms = makePlatforms(this, bridgeData, PC);
        const allPlats = [...sueloPlatforms, ...wallPlatforms, ...bridgePlatforms];

        makeGroundBlocks(this, sueloData, GBC);

        // Letreros
        GAME_CONFIG.level1Signs.forEach((txt, i) => {
            const xs = [300, 1100, 2800, 5100];
            if (xs[i]) makeSign(this, xs[i], 490, txt);
        });

        // ── JUGADOR ──
        const color = GAME_CONFIG.playerColors[selectedPlayer] || 0x4da6ff;
        this.player = makePlayer(this, 80, 480, color);
        this.player.body.setCollideWorldBounds(true);
        this.player.body.setMaxVelocityY(900);
        this.physics.add.collider(this.player, allPlats);

        // ── ENEMIGOS — atrapados entre pares de muros ──
        const enemyData = [
            { x: 510,  y: 490, left: 422, right: 598  },   // entre muros 400-620
            { x: 1200, y: 490, left: 1122, right: 1278 },   // entre muros 1100-1300
            { x: 1900, y: 490, left: 1822, right: 1978 },   // entre muros 1800-2000
            { x: 2935, y: 490, left: 2842, right: 3028 },   // entre muros 2820-3050
            { x: 4090, y: 490, left: 4002, right: 4178 },   // entre muros 3980-4200
            { x: 5265, y: 490, left: 5172, right: 5358 },   // entre muros 5150-5380
        ];
        this.enemies = makeEnemies(this, enemyData, allPlats);
        this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
            if (!enemy.alive) return;
            if (player.body.velocity.y > 60 && player.y < enemy.y - 10) {
                enemy.alive = false; enemy.destroy();
                player.body.setVelocityY(-330);
            } else {
                player.body.reset(80, 480);
            }
        });

        // ── META ──
        const goal = makeGoal(this, 6150, 490);
        this.physics.add.overlap(this.player, goal, () => {
            if (this.levelDone) return;
            this.levelDone = true;
            this.physics.pause();
            this.time.delayedCall(350, () => {
                this.scene.start("levelClear", { nextScene: "level2", levelNum: 1 });
            });
        });

        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, WW, WH);
        this.cursors = this.input.keyboard.createCursorKeys();
        makeMobileButtons(this);
        makeHUD(this, 1);
        setupPause(this);

        this.GY = GY; this.spawnX = 80; this.spawnY = 480;
    }

    update() {
        if (this.isPaused || this.levelDone) return;
        scanMobileInput(this);
        handleMovement(this.player, this.cursors, GAME_CONFIG.playerSpeed, GAME_CONFIG.jumpForce);
        handleRespawn(this.player, this.spawnX, this.spawnY, this.GY + 80);
        updateEnemies(this.enemies);
    }
}

// ============================================================
//  NIVEL 2 — Mundo de la Noche  (4 500 px)
//  Más difícil: huecos más anchos, enemigos más frecuentes
// ============================================================

class Level2 extends Phaser.Scene {
    constructor() { super("level2"); }
    preload() { preloadSprites(this); }

    create() {
        const WW = 4800, WH = 600, GY = 568;
        const GS = GY - 20;

        this.physics.world.setBounds(0, 0, WW, 2000);
        this.cameras.main.setBackgroundColor("#1a1a2e");

        // Fondo noche
        for (let i = 0; i < 120; i++) {
            this.add.circle(
                Phaser.Math.Between(0, WW), Phaser.Math.Between(0, 260),
                Phaser.Math.FloatBetween(1, 3), 0xffffff, Phaser.Math.FloatBetween(0.3, 1)
            );
        }
        this.add.circle(WW - 280, 80, 50, 0xFFF9C4, 0.9);
        this.add.circle(WW - 252, 68, 50, 0x1a1a2e);

        // Antorchas solo sobre secciones con suelo
        // Suelo 1: x=0-1300, Suelo 2: x=1600-2500, Suelo 3: x=2850-3700, Meta: x=4050-4600
        [250, 700, 1100, 1700, 2100, 2400, 2950, 3400, 4100, 4400].forEach(tx => {
            this.add.rectangle(tx, 532, 10, 30, 0xFF6600);
            this.add.ellipse(tx, 514, 18, 22, 0xFFAA00, 0.85);
        });

        const PC  = GAME_CONFIG.platformColors[2];
        const WC  = GAME_CONFIG.wallColors[2];
        const GBC = GAME_CONFIG.groundBlockColors[2];

        const sueloData = [
            { x: 650,  y: GY, w: 1300, h: 40 },   // 0 – 1300
            { x: 2050, y: GY, w: 900,  h: 40 },   // 1600 – 2500
            { x: 3275, y: GY, w: 850,  h: 40 },   // 2850 – 3700
            { x: 4325, y: GY, w: 550,  h: 40 },   // 4050 – 4600 (meta)
        ];

        const wallData = [
            // Suelo 1
            { x: 350,  h: 72 }, { x: 560,  h: 72 },
            { x: 800,  h: 56 },
            { x: 1000, h: 72 }, { x: 1200, h: 72 },

            // Suelo 2
            { x: 1700, h: 72 }, { x: 1900, h: 72 },
            { x: 2200, h: 72 }, { x: 2400, h: 72 },

            // Suelo 3
            { x: 2960, h: 72 }, { x: 3170, h: 72 },
            { x: 3430, h: 72 }, { x: 3600, h: 56 },
        ];

        const bridgeData = [
            { x: 1440, y: GS - 100, w: 110, h: 22 },   // hueco 1300-1600
            { x: 2680, y: GS - 110, w: 100, h: 22 },   // hueco 2500-2850 (alto)
            { x: 2790, y: GS - 70,  w: 100, h: 22 },
            { x: 3880, y: GS - 90,  w: 110, h: 22 },   // hueco 3700-4050
        ];

        const sueloPlatforms  = makePlatforms(this, sueloData, PC);
        const wallPlatforms   = makeGroundWalls(this, wallData, WC);
        const bridgePlatforms = makePlatforms(this, bridgeData, PC);
        const allPlats = [...sueloPlatforms, ...wallPlatforms, ...bridgePlatforms];

        makeGroundBlocks(this, sueloData, GBC);

        GAME_CONFIG.level2Signs.forEach((txt, i) => {
            const xs = [260, 1600, 2900, 4100];
            if (xs[i]) makeSign(this, xs[i], 490, txt);
        });

        const color = GAME_CONFIG.playerColors[selectedPlayer] || 0x4da6ff;
        this.player = makePlayer(this, 80, 480, color);
        this.player.body.setCollideWorldBounds(true);
        this.player.body.setMaxVelocityY(900);
        this.physics.add.collider(this.player, allPlats);

        const enemyData = [
            { x: 455,  y: 490, left: 372, right: 538  },
            { x: 1100, y: 490, left: 1022, right: 1178 },
            { x: 1800, y: 490, left: 1722, right: 1878 },
            { x: 2300, y: 490, left: 2222, right: 2378 },
            { x: 3065, y: 490, left: 2982, right: 3148 },
            { x: 3515, y: 490, left: 3452, right: 3578 },
        ];
        this.enemies = makeEnemies(this, enemyData, allPlats);
        this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
            if (!enemy.alive) return;
            if (player.body.velocity.y > 60 && player.y < enemy.y - 10) {
                enemy.alive = false; enemy.destroy();
                player.body.setVelocityY(-330);
            } else {
                player.body.reset(80, 480);
            }
        });

        const goal = makeGoal(this, 4530, 490);
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
        makeMobileButtons(this);
        makeHUD(this, 2);
        setupPause(this);

        this.GY = GY; this.spawnX = 80; this.spawnY = 480;
    }

    update() {
        if (this.isPaused || this.levelDone) return;
        scanMobileInput(this);
        handleMovement(this.player, this.cursors, GAME_CONFIG.playerSpeed, GAME_CONFIG.jumpForce);
        handleRespawn(this.player, this.spawnX, this.spawnY, this.GY + 80);
        updateEnemies(this.enemies);
    }
}

// ============================================================
//  NIVEL 3 — Mundo del Atardecer  (4 500 px)
//  El más difícil. Termina en el castillo donde aparece el gato.
// ============================================================

class Level3 extends Phaser.Scene {
    constructor() { super("level3"); }
    preload() { preloadSprites(this); }

    create() {
        const WW = 4600, WH = 600, GY = 568;
        const GS = GY - 20;

        this.physics.world.setBounds(0, 0, WW, 2000);
        this.cameras.main.setBackgroundColor("#FF8C42");

        this.add.rectangle(WW / 2, 120, WW, 240, 0xFF6B6B, 0.35);
        this.add.rectangle(WW / 2, 280, WW, 240, 0xFFD93D, 0.2);
        makeClouds(this, WW, 14, 0xFFB3BA);
        this.add.circle(200, 95, 60, 0xFFD700, 0.95);
        this.add.circle(200, 95, 72, 0xFFE066, 0.3);

        // Corazones solo sobre suelo
        [300, 900, 1900, 2900, 3900].forEach(hx => {
            this.add.text(hx, Phaser.Math.Between(130, 220), "❤️",
                { fontSize: Phaser.Math.Between(22, 36) + "px" }
            );
        });

        const PC  = GAME_CONFIG.platformColors[3];
        const WC  = GAME_CONFIG.wallColors[3];
        const GBC = GAME_CONFIG.groundBlockColors[3];

        // Suelo 1: x=0-1200, Suelo 2: x=1550-2600, Suelo 3: x=2950-4000, Castillo: x=4150-4600
        const sueloData = [
            { x: 600,  y: GY, w: 1200, h: 40 },
            { x: 2075, y: GY, w: 1050, h: 40 },
            { x: 3475, y: GY, w: 1050, h: 40 },
            { x: 4400, y: GY, w: 400,  h: 40 },   // base del castillo / meta
        ];

        const wallData = [
            // Suelo 1
            { x: 320,  h: 72 }, { x: 540,  h: 72 },
            { x: 800,  h: 72 }, { x: 1020, h: 72 },

            // Suelo 2
            { x: 1650, h: 72 }, { x: 1880, h: 72 },
            { x: 2200, h: 72 }, { x: 2450, h: 72 },

            // Suelo 3
            { x: 3060, h: 72 }, { x: 3290, h: 72 },
            { x: 3580, h: 72 }, { x: 3810, h: 72 },
        ];

        const bridgeData = [
            { x: 1360, y: GS - 100, w: 110, h: 22 },   // hueco 1200-1550
            { x: 2780, y: GS - 120, w: 100, h: 22 },   // hueco 2600-2950 (alto, difícil)
            { x: 2900, y: GS - 80,  w: 100, h: 22 },
            { x: 4100, y: GS - 90,  w: 110, h: 22 },   // hueco hacia castillo
        ];

        const sueloPlatforms  = makePlatforms(this, sueloData, PC);
        const wallPlatforms   = makeGroundWalls(this, wallData, WC);
        const bridgePlatforms = makePlatforms(this, bridgeData, PC);
        const allPlats = [...sueloPlatforms, ...wallPlatforms, ...bridgePlatforms];

        makeGroundBlocks(this, sueloData, GBC);

        // Castillo decorativo (sin física)
        this.add.rectangle(4480, 420, 240, 310, 0xA04000);
        this.add.rectangle(4380, 300, 80, 22, 0xC0392B);
        this.add.rectangle(4560, 300, 80, 22, 0xC0392B);
        this.add.rectangle(4440, 490, 26, 72, 0x6D2D00);
        this.add.rectangle(4500, 415, 20, 26, 0x1a1a2e, 0.8);
        this.add.rectangle(4460, 415, 20, 26, 0x1a1a2e, 0.8);

        GAME_CONFIG.level3Signs.forEach((txt, i) => {
            const xs = [230, 1550, 2960, 4200];
            if (xs[i]) makeSign(this, xs[i], 490, txt);
        });

        const color = GAME_CONFIG.playerColors[selectedPlayer] || 0x4da6ff;
        this.player = makePlayer(this, 80, 480, color);
        this.player.body.setCollideWorldBounds(true);
        this.player.body.setMaxVelocityY(900);
        this.physics.add.collider(this.player, allPlats);

        const enemyData = [
            { x: 430,  y: 490, left: 342, right: 518  },
            { x: 910,  y: 490, left: 822, right: 998  },
            { x: 1765, y: 490, left: 1672, right: 1858 },
            { x: 2325, y: 490, left: 2222, right: 2428 },
            { x: 3175, y: 490, left: 3082, right: 3268 },
            { x: 3695, y: 490, left: 3602, right: 3788 },
        ];
        this.enemies = makeEnemies(this, enemyData, allPlats);
        this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
            if (!enemy.alive) return;
            if (player.body.velocity.y > 60 && player.y < enemy.y - 10) {
                enemy.alive = false; enemy.destroy();
                player.body.setVelocityY(-330);
            } else {
                player.body.reset(80, 480);
            }
        });

        // META — frente a la puerta del castillo
        const goal = makeGoal(this, 4380, 490);
        this.physics.add.overlap(this.player, goal, () => {
            if (this.levelDone) return;
            this.levelDone = true;
            this.physics.pause();
            this.time.delayedCall(400, () => {
                this.scene.start("cat");   // → escena del gato
            });
        });

        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, WW, WH);
        this.cursors = this.input.keyboard.createCursorKeys();
        makeMobileButtons(this);
        makeHUD(this, 3);
        setupPause(this);

        this.GY = GY; this.spawnX = 80; this.spawnY = 480;
    }

    update() {
        if (this.isPaused || this.levelDone) return;
        scanMobileInput(this);
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
    width:  960,
    height: 540,
    backgroundColor: "#1a1a2e",
    physics: {
        default: "arcade",
        arcade: { gravity: { y: GAME_CONFIG.gravity }, debug: false }
    },
    scale: {
        mode:       Phaser.Scale.FIT,   // mantiene proporción en cualquier pantalla
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width:  960,
        height: 540,
    },
    scene: [ MainMenu, Level1, Level2, Level3, LevelClear, CatScene ]
});
