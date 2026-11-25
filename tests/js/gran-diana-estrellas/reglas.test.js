'use strict';

/**
 * Reglas de "La Gran Diana de Estrellas": cuatro niveles (3, 4, 5 y 6 estrellas), estrella siempre en el centro de la diana y
 * del mismo tamaño dentro de cada nivel, diana más pequeña y con vaivén al subir de nivel, zona de toque cómoda pero dentro del centro dorado, toque simple frente a
 * deslizamiento o dedo apoyado, tiempos por nivel y marcador sin castigo.
 */

var fs = require('fs');
var path = require('path');

var RAIZ = path.resolve(__dirname, '..', '..', '..');
var BASE = 'public/catalogo_juegos/Polimotor/GranDianaEstrellas/';

function modulo() {
    var R = require(path.join(RAIZ, BASE, 'reglas.js'));
    if (!R || !R.prepararNivel) throw new Error('no se exportó ReglasDiana');
    return R;
}

function config() {
    return JSON.parse(fs.readFileSync(path.join(RAIZ, BASE, 'config.json'), 'utf8'));
}

function igual(real, esperado, que) {
    if (real !== esperado) throw new Error(que + ': se esperaba ' + esperado + ' y llegó ' + real);
}

function cierto(valor, que) {
    if (!valor) throw new Error(que + ': se esperaba un valor verdadero');
}

function toque(R, nv, cfg, x, y, x1, y1, ms) {
    return R.evaluarToque({ x0: x, y0: y, t0: 0, x1: x1 == null ? x : x1, y1: y1 == null ? y : y1, t1: ms == null ? 120 : ms }, nv, cfg.juego);
}

module.exports = {
    nombre: 'La Gran Diana de Estrellas — reglas',
    casos: [
        {
            descripcion: 'hay 4 niveles con 3, 4, 5 y 6 estrellas, edad 3-4 años y tema de audio polimotor',
            fn: function () {
                var R = modulo(), cfg = config();
                igual(cfg.rondas.length, 4, 'niveles');
                [3, 4, 5, 6].forEach(function (n, i) {
                    igual(R.prepararNivel(cfg.rondas[i], cfg.juego, R.azar(i + 1)).total, n, 'estrellas del nivel ' + (i + 1));
                });
                igual(cfg.niveles[0].edad, '3-4 años', 'edad');
                igual(cfg.audios.tema, 'polimotor', 'tema de audio');
            }
        },
        {
            descripcion: '1000 partidas al azar: estrella en el centro, mismo tamaño, diana entera y niveles válidos',
            fn: function () {
                var R = modulo(), cfg = config();
                var rnd = R.azar(2026);
                for (var k = 0; k < 1000; k++) {
                    cfg.rondas.forEach(function (r, i) {
                        var nv = R.prepararNivel(r, cfg.juego, rnd);
                        var m = R.validarNivel(nv);
                        if (m.length) throw new Error('partida ' + k + ' nivel ' + (i + 1) + ': ' + m.join(', '));
                        igual(nv.estrella.x, nv.diana.x, 'x de la estrella');
                        igual(nv.estrella.y, nv.diana.y, 'y de la estrella');
                        igual(nv.estrella.r, r.radioEstrella, 'tamaño de la estrella');
                    });
                }
            }
        },
        {
            descripcion: 'cada nivel: diana y estrella más pequeñas, más vaivén y la estrella dura menos (desde el nivel 2)',
            fn: function () {
                var R = modulo(), cfg = config();
                var antes = null;
                cfg.rondas.forEach(function (r, i) {
                    var nv = R.prepararNivel(r, cfg.juego, R.azar(9));
                    cierto(nv.estrella.r >= 70, 'estrella todavía grande en el nivel ' + (i + 1));
                    cierto(nv.tiempos.visibleMs >= 3500, 'tiempo suficiente en el nivel ' + (i + 1));
                    if (i === 0) igual(nv.movimiento.amplitud, 0, 'el nivel 1 está quieto');
                    if (antes) {
                        cierto(nv.diana.r < antes.diana.r, 'diana más pequeña en el nivel ' + (i + 1));
                        cierto(nv.estrella.r < antes.estrella.r, 'estrella más pequeña en el nivel ' + (i + 1));
                        cierto(nv.movimiento.amplitud > antes.movimiento.amplitud, 'más vaivén en el nivel ' + (i + 1));
                        cierto(nv.tiempos.visibleMs < antes.tiempos.visibleMs, 'la estrella dura menos en el nivel ' + (i + 1));
                    }
                    antes = nv;
                });
            }
        },
        {
            descripcion: 'el vaivén queda cerca del centro, dentro de la pantalla, y la zona de toque va con la estrella',
            fn: function () {
                var R = modulo(), cfg = config();
                cfg.rondas.forEach(function (r, i) {
                    var nv = R.prepararNivel(r, cfg.juego, R.azar(i + 40));
                    for (var t = 0; t < 30000; t += 137) {
                        var p = R.moverA(nv, t);
                        cierto(Math.abs(p.x - nv.diana.x) <= nv.movimiento.amplitud + 0.01 && Math.abs(p.y - nv.diana.y) <= nv.movimiento.amplitud * 0.6 + 0.01, 'cerca del centro');
                        cierto(p.x - nv.diana.r >= R.VISIBLE.x0 && p.x + nv.diana.r <= R.VISIBLE.x1, 'dentro de la pantalla');
                        igual(nv.zona.x, nv.estrella.x, 'zona con la estrella');
                        igual(R.evaluarToque({ x0: p.x + 5, y0: p.y - 5, t0: 0, x1: p.x + 5, y1: p.y - 5, t1: 100 }, nv, cfg.juego).tipo, 'acierto', 'toque sobre la estrella que se mueve');
                    }
                });
            }
        },
        {
            descripcion: 'toque sobre la estrella o cerca (zona amplia) es acierto; en el anillo de fuera no',
            fn: function () {
                var R = modulo(), cfg = config();
                var nv = R.prepararNivel(cfg.rondas[0], cfg.juego, R.azar(1));
                var x = nv.estrella.x, y = nv.estrella.y;
                igual(toque(R, nv, cfg, x, y).tipo, 'acierto', 'centro');
                cierto(toque(R, nv, cfg, x, y).centro, 'centro exacto');
                igual(toque(R, nv, cfg, x + nv.estrella.r + 15, y).tipo, 'acierto', 'un poco fuera de la punta (tolerancia)');
                igual(toque(R, nv, cfg, x, y - 240).tipo, 'fuera', 'anillo turquesa');
                igual(toque(R, nv, cfg, x + nv.diana.rCentro, y).tipo, 'fuera', 'borde del centro dorado');
                igual(toque(R, nv, cfg, 100, 100).tipo, 'fuera', 'lejos de la diana');
            }
        },
        {
            descripcion: 'deslizar o dejar el dedo apoyado no cuenta como toque',
            fn: function () {
                var R = modulo(), cfg = config();
                var nv = R.prepararNivel(cfg.rondas[1], cfg.juego, R.azar(2));
                var x = nv.estrella.x, y = nv.estrella.y;
                igual(toque(R, nv, cfg, x, y, x + 120, y, 200).tipo, 'deslizo', 'arrastre');
                igual(toque(R, nv, cfg, x, y, x + 10, y + 8, 200).tipo, 'acierto', 'temblor pequeño del dedo');
                igual(toque(R, nv, cfg, x, y, x, y, 4000).tipo, 'mantuvo', 'dedo apoyado');
            }
        },
        {
            descripcion: 'la ayuda llega antes de apagarse y suma tiempo extra',
            fn: function () {
                var R = modulo(), cfg = config();
                cfg.rondas.forEach(function (r, i) {
                    var nv = R.prepararNivel(r, cfg.juego, R.azar(5));
                    cierto(nv.tiempos.ayudaMs < nv.tiempos.visibleMs, 'ayuda a tiempo en el nivel ' + (i + 1));
                    igual(R.duracionOportunidad(nv, true), nv.tiempos.visibleMs + nv.tiempos.extraMs, 'tiempo extra');
                });
            }
        },
        {
            descripcion: 'el marcador solo sube con aciertos, los toques fuera y las estrellas apagadas no restan',
            fn: function () {
                var R = modulo(), cfg = config();
                var nv = R.prepararNivel(cfg.rondas[0], cfg.juego, R.azar(3));
                var mk = R.crearMarcador(nv);
                R.registrar(mk, 'fuera');
                R.registrar(mk, 'apagada');
                R.registrar(mk, 'deslizo');
                igual(mk.hechas, 0, 'sin aciertos');
                igual(mk.fuerasSeguidos, 2, 'fuera seguidos');
                R.registrar(mk, 'acierto');
                igual(mk.fuerasSeguidos, 0, 'se reinician con el acierto');
                R.registrar(mk, 'acierto');
                R.registrar(mk, 'acierto');
                cierto(mk.completo, 'nivel completo con 3');
                R.registrar(mk, 'acierto');
                igual(mk.hechas, 3, 'no pasa del total');
            }
        }
    ]
};
