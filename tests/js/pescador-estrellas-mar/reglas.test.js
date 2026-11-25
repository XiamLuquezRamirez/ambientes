'use strict';

/**
 * Reglas de "El Pescador de Estrellas de Mar": cuatro niveles (3, 4, 5 y 6 estrellas) alcanzables y separadas,
 * gancho que nunca sale de su recorrido, captura por distancia horizontal con tolerancia generosa, una estrella
 * pescada no se vuelve a pescar y fallar no resta nada.
 */

var fs = require('fs');
var path = require('path');

var RAIZ = path.resolve(__dirname, '..', '..', '..');
var BASE = 'public/catalogo_juegos/Polimotor/PescadorEstrellasMar/';

function modulo() {
    var R = require(path.join(RAIZ, BASE, 'reglas.js'));
    if (!R || !R.prepararNivel) throw new Error('no se exportó ReglasPescador');
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

function niveles(R, cfg, semilla) {
    var rnd = R.azar(semilla);
    return cfg.rondas.map(function (r) { return R.prepararNivel(r, cfg.juego, rnd); });
}

module.exports = {
    nombre: 'El Pescador de Estrellas de Mar — reglas',
    casos: [
        {
            descripcion: 'cuatro niveles con 3, 4, 5 y 6 estrellas válidos en 300 partidas al azar',
            fn: function () {
                var R = modulo(), cfg = config();
                igual(cfg.rondas.length, 4, 'niveles');
                for (var s = 1; s <= 300; s++) {
                    niveles(R, cfg, s).forEach(function (nv, i) {
                        igual(nv.estrellas.length, 3 + i, 'estrellas del nivel ' + (i + 1));
                        var avisos = R.validarNivel(nv);
                        if (avisos.length) throw new Error('semilla ' + s + ' nivel ' + (i + 1) + ': ' + avisos.join(', '));
                    });
                }
            }
        },
        {
            descripcion: 'el gancho nunca sale de su recorrido ni de la vista y cambia de dirección suavemente',
            fn: function () {
                var R = modulo(), cfg = config();
                niveles(R, cfg, 7).forEach(function (nv) {
                    var fase = nv.faseInicial, prev = R.posicionGancho(nv, fase);
                    for (var t = 0; t < 30000; t += 16) {
                        fase = R.avanzarFase(nv, fase, 16);
                        var x = R.posicionGancho(nv, fase);
                        cierto(x >= nv.minX - 0.01 && x <= nv.maxX + 0.01, 'x dentro del recorrido');
                        cierto(x >= R.VISIBLE.x0 && x <= R.VISIBLE.x1, 'x visible');
                        cierto(Math.abs(x - prev) < 6, 'sin saltos (' + Math.abs(x - prev) + ')');
                        prev = x;
                    }
                });
            }
        },
        {
            descripcion: 'la velocidad del gancho sube poco a poco y siempre es moderada',
            fn: function () {
                var R = modulo(), cfg = config();
                var vel = niveles(R, cfg, 3).map(function (nv) { return R.velocidadGancho(nv, 0); });
                for (var i = 1; i < vel.length; i++) cierto(vel[i] > vel[i - 1], 'nivel ' + (i + 1) + ' algo más rápido');
                cierto(vel[0] < 170, 'nivel 1 lento (' + vel[0] + ')');
                cierto(vel[3] < 270, 'nivel 4 moderado (' + vel[3] + ')');
            }
        },
        {
            descripcion: 'toque sobre la estrella o cerca la atrapa; lejos no atrapa ninguna',
            fn: function () {
                var R = modulo(), cfg = config();
                niveles(R, cfg, 11).forEach(function (nv) {
                    nv.estrellas.forEach(function (e) {
                        igual(R.evaluarCaptura(e.x, nv, {}).estrella, e, 'centro');
                        igual(R.evaluarCaptura(e.x + nv.tolerancia - 1, nv, {}).estrella, e, 'borde derecho');
                        igual(R.evaluarCaptura(e.x - nv.tolerancia + 1, nv, {}).estrella, e, 'borde izquierdo');
                        cierto(nv.tolerancia >= 44, 'tolerancia generosa (' + nv.tolerancia + ')');
                    });
                    // a mitad de camino entre dos estrellas no se pesca nada
                    for (var i = 0; i + 1 < nv.estrellas.length; i++) {
                        var mitad = (nv.estrellas[i].x + nv.estrellas[i + 1].x) / 2;
                        igual(R.evaluarCaptura(mitad, nv, {}).tipo, 'fallo', 'entre estrellas');
                    }
                    igual(R.evaluarCaptura(nv.estrellas[0].x - nv.tolerancia - 30, nv, {}).tipo, 'fallo', 'lejos');
                });
            }
        },
        {
            descripcion: 'una estrella pescada no se vuelve a pescar y el marcador no castiga',
            fn: function () {
                var R = modulo(), cfg = config();
                var nv = niveles(R, cfg, 5)[0];
                var mk = R.crearMarcador(nv);
                var e = nv.estrellas[1];
                R.registrar(mk, 'fallo');
                R.registrar(mk, 'fallo');
                igual(mk.hechas, 0, 'fallar no resta');
                igual(mk.fallosSeguidos, 2, 'fallos seguidos');
                var res = R.evaluarCaptura(e.x, nv, mk.capturadas);
                R.registrar(mk, res.tipo, res.estrella);
                igual(mk.hechas, 1, 'una pescada');
                igual(mk.fallosSeguidos, 0, 'se reinicia la ayuda');
                igual(R.evaluarCaptura(e.x, nv, mk.capturadas).tipo, 'fallo', 'no se repite');
                nv.estrellas.forEach(function (o) {
                    var r = R.evaluarCaptura(o.x, nv, mk.capturadas);
                    if (r.estrella) R.registrar(mk, r.tipo, r.estrella);
                });
                cierto(mk.completo, 'nivel completo');
                igual(mk.hechas, nv.estrellas.length, 'todas');
            }
        },
        {
            descripcion: 'la guía aparece antes que la zona de captura y la corrección es sutil',
            fn: function () {
                var R = modulo(), cfg = config();
                niveles(R, cfg, 9).forEach(function (nv) {
                    cierto(nv.radioGuia > nv.tolerancia, 'guía más amplia que la captura');
                    var e = nv.estrellas[0];
                    igual(R.cercana(e.x - nv.radioGuia + 1, nv, {}), e, "guía cerca");
                    igual(R.cercana(e.x - nv.radioGuia - 2, nv, {}), null, "guía lejos");
                    var c = R.correccion(nv.tolerancia, nv);
                    cierto(Math.abs(c) < nv.tolerancia, 'corrección menor que la tolerancia');
                });
            }
        },
        {
            descripcion: 'colores variados: nunca dos estrellas vecinas del mismo color',
            fn: function () {
                var R = modulo(), cfg = config();
                for (var s = 1; s <= 100; s++) {
                    niveles(R, cfg, s).forEach(function (nv) {
                        for (var i = 1; i < nv.estrellas.length; i++) {
                            cierto(nv.estrellas[i].color !== nv.estrellas[i - 1].color, 'vecinas distintas');
                        }
                        cierto(R.COLORES.indexOf(nv.estrellas[0].color) >= 0, 'color conocido');
                    });
                }
            }
        }
    ]
};
