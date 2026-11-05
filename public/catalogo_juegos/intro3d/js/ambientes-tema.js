/**
 * ambientes-tema.js — Detecta el ambiente y la ruta del aula GLB para la intro.
 *
 * El aula se carga desde models/aulas/<archivo>.glb (uno por ambiente).
 * Override: window.INTRO_CONFIG.ambiente = '<slug>'.
 */
(function () {
    'use strict';

    function normaliza(txt) {
        return String(txt || '')
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[_\s]+/g, '-');
    }

    const CLAVES = [
        ['multisensorial', 'multisensorial'],
        ['polimotor', 'polimotor'],
        ['multisaberes', 'multisaberes'],
        ['tecnologia', 'tecnologia'],
        ['expresion', 'expresion-artistica'],
        ['artistica', 'expresion-artistica'],
    ];

    // cajaAula: caja del modelo sin optimizar. colocarAula() la usa para escalar, centrar y
    // apuntar la cámara, así el escenario no se mueve al optimizar o reorganizar el GLB.
    const CAJA_BASE = { min: [-3.814217, -0.010283, -1.789044], max: [4.263455, 2.112918, 3.507199] };

    const MODELOS = {
        'expresion-artistica': {
            nombre: 'Expresión Artística',
            modeloAula: 'models/aulas/expresion_artistica.glb',
            cajaAula: CAJA_BASE,
        },
        multisaberes: {
            nombre: 'Multisaberes',
            modeloAula: 'models/aulas/multisaberes.glb',
            cajaAula: CAJA_BASE,
        },
        multisensorial: {
            nombre: 'Multisensorial',
            modeloAula: 'models/aulas/multisensorial.glb',
            cajaAula: { min: [-3.814217, -0.091539, 1.050247], max: [4.263455, 1.557115, 6.346491] },
        },
        polimotor: {
            nombre: 'Polimotor',
            modeloAula: 'models/aulas/polimotor.glb',
            cajaAula: CAJA_BASE,
        },
        tecnologia: {
            nombre: 'Tecnología y Robótica',
            modeloAula: 'models/aulas/tecnologia.glb',
            cajaAula: CAJA_BASE,
        },
    };

    function detectarSlug() {
        const cfg = (window.INTRO_CONFIG && window.INTRO_CONFIG.ambiente) || '';
        if (cfg) {
            return normaliza(cfg);
        }
        const ruta = normaliza(decodeURIComponent(location.pathname));
        for (const [clave, slug] of CLAVES) {
            if (ruta.indexOf(clave) >= 0) return slug;
        }
        return 'expresion-artistica';
    }

    const slug = detectarSlug();
    const tema = MODELOS[slug] || MODELOS['expresion-artistica'];

    window.INTRO_TEMA = Object.assign({ slug: slug }, tema);
})();
