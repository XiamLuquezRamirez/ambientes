/**
 * ambientes-tema.js — Temas del AULA 3D por ambiente para la intro.
 *
 * El aula base (ventana con paisaje, estantería de cubos, banderines, cenefa,
 * pizarra con dibujo, plantas, carteles y alfombra) la arma three-scene.js.
 * Este archivo define, por ambiente: color de la cenefa/acento, los 5 carteles
 * temáticos de la pared, el color de la alfombra y qué props de suelo montar.
 *
 * El ambiente se detecta desde la CARPETA de la URL. Override con
 * window.INTRO_CONFIG.ambiente = '<slug>'.
 */
(function () {
    'use strict';

    const ALIAS = { musica: 'expresion-artistica', logico: 'multisaberes' };

    function normaliza(txt) {
        return String(txt || '')
            .toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[_\s]+/g, '-');
    }

    const CLAVES = [
        ['multisensorial', 'multisensorial'],
        ['polimotor', 'polimotor'],
        ['multisaberes', 'multisaberes'],
        ['logico', 'multisaberes'],
        ['tecnologia', 'tecnologia'],
        ['expresion', 'expresion-artistica'],
        ['artistica', 'expresion-artistica'],
        ['musica', 'expresion-artistica'],
    ];

    function detectarSlug() {
        const cfg = (window.INTRO_CONFIG && window.INTRO_CONFIG.ambiente) || '';
        if (cfg) {
            const s = normaliza(cfg);
            return ALIAS[s] || s;
        }
        const ruta = normaliza(decodeURIComponent(location.pathname));
        for (const [clave, slug] of CLAVES) {
            if (ruta.indexOf(clave) >= 0) return slug;
        }
        return 'expresion-artistica';
    }

    // Paleta base compartida (paredes/piso iguales en todas las aulas, como en
    // las ilustraciones): pared beige, zócalo verde salvia, piso de madera.
    const BASE = {
        pared: 0xf3e6c8,
        zocalo: 0xa9c4a2,
        piso: 0xdca86a,
        pisoLinea: 0xc7924f,
    };

    // carteles: 5 etiquetas (texto + emoji) que van en la pared central.
    // alfombra: color de la alfombra redonda.
    // props: lista de props de suelo específicos del ambiente.
    const TEMAS = {
        'expresion-artistica': {
            nombre: 'Expresión Artística',
            acento: '#8b5cf6',       // cenefa morada
            acentoRGB: 0x8b5cf6,
            carteles: [
                { t: 'Música', e: '🎵', c: '#e0574f' },
                { t: 'Pintura', e: '🎨', c: '#3aa0ff' },
                { t: 'Baile', e: '💃', c: '#ff8c42' },
                { t: 'Ritmo', e: '🥁', c: '#ffd166' },
                { t: 'Teatro', e: '🎭', c: '#8b5cf6' },
            ],
            alfombra: 0xf3a6c8,
            props: ['caballete', 'tambor', 'xilofono', 'botesPintura', 'paleta'],
        },
        multisaberes: {
            nombre: 'Multisaberes',
            acento: '#f5b301',       // cenefa amarilla
            acentoRGB: 0xf5b301,
            carteles: [
                { t: 'A a', e: '✈️', c: '#e0574f' },
                { t: 'E e', e: '🐘', c: '#8a8f98' },
                { t: 'I i', e: '🏝️', c: '#3aa0ff' },
                { t: 'O o', e: '🧸', c: '#a9713d' },
                { t: 'U u', e: '🍇', c: '#8b5cf6' },
            ],
            alfombra: 0x24409e,       // alfombra azul con números
            props: ['numerosAlfombra', 'bloques', 'torreAnillos', 'mesaRedonda'],
        },
        multisensorial: {
            nombre: 'Multisensorial',
            acento: '#2f9be0',       // cenefa azul
            acentoRGB: 0x2f9be0,
            carteles: [
                { t: 'Olfato', e: '👃', c: '#e0574f' },
                { t: 'Oído', e: '👂', c: '#ff8c42' },
                { t: 'Gusto', e: '👅', c: '#f06fae' },
                { t: 'Tacto', e: '✋', c: '#e0574f' },
                { t: 'Vista', e: '👁️', c: '#8b5cf6' },
            ],
            alfombra: 0xf3a6c8,
            props: ['bandejasSensoriales', 'tuboBurbujas'],
        },
        polimotor: {
            nombre: 'Polimotor',
            acento: '#4caf22',       // cenefa verde
            acentoRGB: 0x4caf22,
            carteles: [
                { t: 'Pelotas', e: '⚽', c: '#3aa0ff' },
                { t: 'Pasos', e: '👣', c: '#2f9be0' },
                { t: 'Saltar', e: '🤸', c: '#f06fae' },
            ],
            alfombra: 0xffd166,
            props: ['setGateo', 'tunel', 'arosSuelo', 'conos'],
        },
        tecnologia: {
            nombre: 'Tecnología y Robótica',
            acento: '#ff6a00',       // cenefa naranja
            acentoRGB: 0xff6a00,
            carteles: [
                { t: 'Juego', e: '🎮', c: '#3a5bd0' },
                { t: 'Buscar', e: '🔍', c: '#4caf22' },
                { t: 'Robot', e: '🤖', c: '#8b5cf6' },
                { t: 'Piezas', e: '🧩', c: '#e0574f' },
            ],
            alfombra: 0x24409e,
            props: ['robotPanda', 'robotHumanoide', 'carritoRobot', 'cajaHerramientas', 'mesaRedonda'],
        },
    };

    const slug = detectarSlug();
    const tema = TEMAS[slug] || TEMAS['expresion-artistica'];

    window.INTRO_TEMA = Object.assign({ slug: slug }, BASE, tema);
})();
