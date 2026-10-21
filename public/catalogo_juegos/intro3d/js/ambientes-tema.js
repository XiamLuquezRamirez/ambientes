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

    const MODELOS = {
        'expresion-artistica': {
            nombre: 'Expresión Artística',
            modeloAula: 'models/aulas/expresion_artistica.glb',
        },
        multisaberes: {
            nombre: 'Multisaberes',
            modeloAula: 'models/aulas/multisaberes.glb',
        },
        multisensorial: {
            nombre: 'Multisensorial',
            modeloAula: 'models/aulas/multisensorial.glb',
        },
        polimotor: {
            nombre: 'Polimotor',
            modeloAula: 'models/aulas/polimotor.glb',
        },
        tecnologia: {
            nombre: 'Tecnología y Robótica',
            modeloAula: 'models/aulas/tecnologia.glb',
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
