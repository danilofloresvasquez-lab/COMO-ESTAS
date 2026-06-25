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

    // ── SPRITES PNG OPCIONALES ────────────────────────────────
    // Coloca el archivo .png en la misma carpeta que index.html
    // y escribe el nombre aquí. Si está vacío ("") se usa color.
    sprites: {
        player:  "",   // PNG del jugador (34×54 px recomendado)
        enemy:   "",   // PNG del enemigo (34×34 px recomendado)
        cat:     "",   // PNG del gato   (44×44 px recomendado)
    },

    // ── GATO (escena final) ───────────────────────────────────
    catName:   "Gatito",
    catColor:  0xFF8C00,   // naranja — cámbialo cuando tengas el PNG
    catSpeech: "¡Me encontraste!\n¿Cómo estás? 🐱",

    // ── LETREROS EN NIVELES ───────────────────────────────────
    level1Signs: [
        "¡Bienvenida a nuestra aventura!",
        "Cada paso que damos juntos...",
        "...es un recuerdo que guardo.",
        "¡Sigue adelante, casi llegas!"
    ],

    level2Signs: [
        "¡Mundo 2! Más difícil...",
        "Como nosotros: cada día algo nuevo.",
        "¡No te rindas, tú puedes!",
        "Ya casi terminas el Mundo 2..."
    ],

    level3Signs: [
        "¡Último mundo! El más especial.",
        "Gracias por estar en mi vida.",
        "Tengo algo que preguntarte...",
        "¡Casi llegamos!"
    ],

    // ── MENSAJE FINAL (pantalla después del gato) ─────────────
    // Edita estos textos a tu gusto:
    finalMessage:    "¿Cómo estás?",
    finalSubMessage: "Espero que estés muy bien,\nporque yo estoy mejor desde que te conozco ❤️",

    // ── COLORES DE PLATAFORMAS POR NIVEL ──────────────────────
    platformColors: {
        1: 0x5D4E37,   // marrón tierra
        2: 0x6C3483,   // morado oscuro
        3: 0xC0392B    // rojo atardecer
    },

    // Color de los bloques ladrillo del suelo
    groundBlockColors: {
        1: 0x795548,
        2: 0x7B1FA2,
        3: 0xD84315
    },

    // Color de los obstáculos en el suelo (muros)
    wallColors: {
        1: 0x4E342E,
        2: 0x4A148C,
        3: 0xBF360C
    },

    // Color de los enemigos
    enemyColor: 0xE74C3C,

    // ── FÍSICA ────────────────────────────────────────────────
    playerSpeed: 250,
    jumpForce:   550,
    gravity:     1000,
    enemySpeed:  75,
};
