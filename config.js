// ============================================================
//  CONFIGURACIÓN DEL JUEGO — edita aquí para personalizar
// ============================================================

const GAME_CONFIG = {

    // Título principal que aparece en el menú
    title: "¿Cómo estás?",

    // Subtítulo del menú
    subtitle: "Una aventura especial para ti 💕",

    // Nombres de los personajes
    players: [
        "Mr. Danilo",
        "Srta. Wale"
    ],

    // Colores de cada personaje (hex Phaser)
    playerColors: {
        "Mr. Danilo": 0x4da6ff,
        "Srta. Wale": 0xff66b3
    },

    // ── SPRITES (PNG opcionales) ──────────────────────────────
    // Para usar una imagen PNG en lugar de un rectángulo de color,
    // coloca el archivo en la misma carpeta y escribe el nombre aquí.
    // Ejemplo: playerSprite: "personaje.png"
    // Si está vacío ("") se usa el rectángulo de color por defecto.
    sprites: {
        player:   "",        // PNG del jugador   (34×54 px recomendado)
        enemy:    "",        // PNG del enemigo   (34×34 px recomendado)
        ground:   "",        // PNG del suelo     (40×40 px recomendado, se repite en mosaico)
        platform: "",        // PNG de plataformas (se repite en mosaico)
        tree:     "",        // PNG de árbol decorativo
    },

    // ── LETREROS ─────────────────────────────────────────────

    // Mensajes que aparecen en los letreros del nivel 1
    level1Signs: [
        "¡Bienvenida a nuestra aventura!",
        "Cada paso que damos juntos...",
        "...es un recuerdo que guardo.",
        "¡Sigue adelante, casi llegas!",
        "Ya casi terminas el Mundo 1..."
    ],

    // Mensajes del nivel 2
    level2Signs: [
        "¡Mundo 2! Más difícil...",
        "Como nosotros: cada día algo nuevo.",
        "¡No te rindas, tú puedes!",
        "Ya casi terminas el Mundo 2..."
    ],

    // Mensajes del nivel 3
    level3Signs: [
        "¡Último mundo! El más especial.",
        "Gracias por estar en mi vida.",
        "Tengo algo que preguntarte...",
        "¡Casi llegamos!"
    ],

    // ── MENSAJE FINAL ─────────────────────────────────────────
    finalMessage: "¿Cómo estás?",
    finalSubMessage: "Espero que estés muy bien,\nporque yo estoy mejor desde que te conozco ❤️",

    // ── COLORES ───────────────────────────────────────────────

    // Colores de las plataformas por nivel
    platformColors: {
        1: 0x5D4E37,   // tierra marrón
        2: 0x6C3483,   // morado oscuro
        3: 0xC0392B    // rojo atardecer
    },

    // Colores de los bloques del suelo (patrón ladrillo) por nivel
    groundBlockColors: {
        1: 0x795548,   // ladrillo marrón
        2: 0x7B1FA2,   // morado ladrillo
        3: 0xD84315    // naranja rojizo
    },

    // Color base de los bloques flotantes (? bloques)
    questionBlockColor: 0xF9A825,

    // Color de los enemigos
    enemyColor: 0xE74C3C,

    // ── FÍSICA ────────────────────────────────────────────────
    playerSpeed: 250,
    jumpForce:   550,
    gravity:     1000,
    enemySpeed:  80,

    // ── ENEMIGOS POR NIVEL ────────────────────────────────────
    // Cada entrada: { x, y, left, right }
    //   x, y      → posición inicial (pon al enemigo sobre el suelo o plataforma)
    //   left/right → límites de patrullaje en X
    //
    // Para cambiar el aspecto: modifica sprites.enemy arriba con el nombre de tu PNG.

    level1Enemies: [
        { x: 850,  y: 540, left: 720,  right: 970  },
        { x: 1600, y: 540, left: 1500, right: 1750 },
        { x: 2300, y: 540, left: 2150, right: 2450 },
        { x: 3000, y: 440, left: 2900, right: 3120 },   // sobre plataforma
        { x: 4300, y: 540, left: 4130, right: 4700 },
    ],

    level2Enemies: [
        { x: 700,  y: 540, left: 550,  right: 850  },
        { x: 1300, y: 540, left: 1150, right: 1450 },
        { x: 2300, y: 540, left: 2150, right: 2500 },
        { x: 3200, y: 350, left: 3130, right: 3330 },   // sobre plataforma
        { x: 4100, y: 540, left: 3950, right: 4250 },
    ],

    level3Enemies: [
        { x: 600,  y: 540, left: 450,  right: 750  },
        { x: 1400, y: 540, left: 1320, right: 1600 },
        { x: 2200, y: 540, left: 2050, right: 2400 },
        { x: 2950, y: 270, left: 2860, right: 3070 },   // sobre plataforma
        { x: 3500, y: 540, left: 3230, right: 3650 },
    ],
};
