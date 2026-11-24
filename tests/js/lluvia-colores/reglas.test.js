'use strict';

/**
 * Reglas de "La lluvia de colores y las flores del jardín": generador de jardines (4 niveles al azar, validados y
 * jugables) y trazado vertical (empieza en la nube, baja hasta la flor, tolera desvíos pequeños, no valida trazos
 * horizontales, incompletos ni saltos).
 */

var fs = require('fs');
var path = require('path');

var RAIZ = path.resolve(__dirname, '..', '..', '..');
var BASE = 'public/catalogo_juegos/Polimotor/LluviaColoresFlores/';

function modulo() {
    var R = cargarIIFE(BASE + 'reglas.js', 'ReglasLluvia');
    if (!R) throw new Error('no se exportó ReglasLluvia');
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

/** Baja el "dedo" por el carril c desde la nube hasta yFin, con un desvío lateral (x = c.x + desvio(y)). */
function bajar(R, c, est, j, yFin, desvio, paso) {
    var evs = [];
    R.tomar(c, est, c.x, c.nubeY);
    for (var y = c.y0; y <= yFin; y += paso || 10) {
        evs.push(R.seguir(c, est, R.xEn(c, y) + (desvio ? desvio(y) : 0), y, j));
    }
    return evs;
}

function jardinDe(R, cfg, nivel, semilla) {
    return R.generarJardin(cfg.jardines[nivel], cfg.juego, R.azar(semilla || 7));
}

module.exports = {
    nombre: 'La lluvia de colores y las flores del jardín — reglas',
    casos: [
        {
            descripcion: 'hay exactamente 4 niveles con 2, 3, 4 y 5 flores',
            fn: function () {
                var R = modulo(), cfg = config();
                igual(cfg.jardines.length, 4, 'niveles');
                var p = R.generarPartida(cfg.jardines, cfg.juego, R.azar(3));
                igual(p.length, 4, 'jardines generados');
                [2, 3, 4, 5].forEach(function (n, i) { igual(p[i].carriles.length, n, 'flores del nivel ' + (i + 1)); });
            }
        },
        {
            descripcion: '600 partidas al azar: todas válidas, sin respaldo, sin superposiciones y dentro de la zona',
            fn: function () {
                var R = modulo(), cfg = config();
                var rnd = R.azar(12345);
                for (var k = 0; k < 600; k++) {
                    var p = R.generarPartida(cfg.jardines, cfg.juego, rnd);
                    p.forEach(function (j, i) {
                        var m = R.validarJardin(j, cfg.jardines[i]);
                        if (m.length) throw new Error('partida ' + k + ' nivel ' + (i + 1) + ': ' + m.join(', '));
                        cierto(!j.respaldo, 'sin respaldo (partida ' + k + ')');
                    });
                }
            }
        },
        {
            descripcion: 'cada nube tiene su flor justo debajo: carril vertical que baja, con gotitas guía de extremo a extremo',
            fn: function () {
                var R = modulo(), cfg = config();
                var p = R.generarPartida(cfg.jardines, cfg.juego, R.azar(99));
                p.forEach(function (j) {
                    j.carriles.forEach(function (c) {
                        cierto(c.y1 > c.y0 && c.nubeY < c.y0, 'baja de la nube a la flor');
                        igual(c.y1, R.FIN, 'termina en la flor');
                        igual(c.puntos[0], c.y0, 'primera gotita');
                        igual(c.puntos[c.puntos.length - 1], c.y1, 'última gotita');
                        cierto(c.nubeY >= R.NUBE_MIN_Y, 'nube visible');
                    });
                });
            }
        },
        {
            descripcion: 'la generación varía entre partidas (posiciones, colores y tipos de flor)',
            fn: function () {
                var R = modulo(), cfg = config();
                var firmas = {};
                for (var s = 1; s <= 20; s++) {
                    var j = jardinDe(R, cfg, 3, s);
                    firmas[j.carriles.map(function (c) { return c.x + c.color + c.tipoFlor + c.largo; }).join('|')] = true;
                }
                cierto(Object.keys(firmas).length >= 18, 'al menos 18 jardines distintos de 20');
            }
        },
        {
            descripcion: 'la misma semilla da el mismo jardín (no cambia mientras se juega)',
            fn: function () {
                var R = modulo(), cfg = config();
                var a = JSON.stringify(jardinDe(R, cfg, 2, 42)), b = JSON.stringify(jardinDe(R, cfg, 2, 42));
                igual(a, b, 'jardín reproducible');
            }
        },
        {
            descripcion: 'los niveles 3 y 4 tienen recorridos de distinto largo',
            fn: function () {
                var R = modulo(), cfg = config();
                var rnd = R.azar(5);
                for (var k = 0; k < 100; k++) {
                    [2, 3].forEach(function (n) {
                        var j = R.generarJardin(cfg.jardines[n], cfg.juego, rnd);
                        var l = j.carriles.map(function (c) { return c.largo; });
                        cierto(Math.max.apply(null, l) - Math.min.apply(null, l) >= cfg.jardines[n].difLargo, 'variedad de largos nivel ' + (n + 1));
                    });
                }
            }
        },
        {
            descripcion: 'niveles 1 y 2 rectos; 3 y 4 con curvas de su lista, la nube y la flor una encima de la otra',
            fn: function () {
                var R = modulo(), cfg = config();
                var rnd = R.azar(77);
                for (var k = 0; k < 200; k++) {
                    var p = R.generarPartida(cfg.jardines, cfg.juego, rnd);
                    p[0].carriles.concat(p[1].carriles).forEach(function (c) { cierto(!c.curva, 'recto'); });
                    [2, 3].forEach(function (n) {
                        var cv = cfg.jardines[n].curva;
                        p[n].carriles.forEach(function (c) {
                            cierto(c.curva && cv.tipos.indexOf(c.curva.tipo) >= 0, 'tipo de curva nivel ' + (n + 1));
                            cierto(Math.abs(c.curva.amp) >= cv.ampMin - 0.5, 'curva marcada');
                            igual(Math.round(R.xEn(c, c.y0)), c.x, 'sale de la nube');
                            igual(Math.round(R.xEn(c, c.y1)), c.x, 'llega a la flor');
                            for (var y = c.y0; y <= c.y1; y += 8) {
                                var x = R.xEn(c, y);
                                cierto(x >= R.VISIBLE.x0 - 0.5 && x <= R.VISIBLE.x1 + 0.5, 'dentro de la pantalla');
                            }
                        });
                    });
                }
            }
        },
        {
            descripcion: 'las curvas no son siempre las mismas: varían la forma y el sentido, entre partidas y dentro del nivel',
            fn: function () {
                var R = modulo(), cfg = config();
                var rnd = R.azar(2024);
                [2, 3].forEach(function (n) {
                    var vistas = {}, mezclados = 0;
                    for (var k = 0; k < 200; k++) {
                        var c = R.generarJardin(cfg.jardines[n], cfg.juego, rnd).carriles;
                        var firmas = c.map(function (x) { return x.curva.tipo + (x.curva.amp < 0 ? '-' : '+'); });
                        firmas.forEach(function (f) { vistas[f] = true; });
                        if (firmas.some(function (f) { return f !== firmas[0]; })) mezclados++;
                    }
                    cfg.jardines[n].curva.tipos.forEach(function (t) {
                        cierto(vistas[t + '+'] && vistas[t + '-'], 'aparece ' + t + ' en los dos sentidos (nivel ' + (n + 1) + ')');
                    });
                    cierto(mezclados > 150, 'casi siempre hay caminos distintos en el mismo jardín (nivel ' + (n + 1) + ')');
                });
            }
        },
        {
            descripcion: 'los caminos curvos vecinos nunca se juntan',
            fn: function () {
                var R = modulo(), cfg = config();
                var rnd = R.azar(31);
                for (var k = 0; k < 300; k++) {
                    [2, 3].forEach(function (n) {
                        var c = R.generarJardin(cfg.jardines[n], cfg.juego, rnd).carriles;
                        for (var i = 1; i < c.length; i++) cierto(R.separacionMinima(c[i - 1], c[i]) >= cfg.jardines[n].curva.sep - 0.5, 'separación nivel ' + (n + 1));
                    });
                }
            }
        },
        {
            descripcion: 'en las curvas hay que seguir el camino: bajar en línea recta no llega a la flor',
            fn: function () {
                var R = modulo(), cfg = config();
                [2, 3].forEach(function (n) {
                    for (var s = 1; s <= 10; s++) {
                        var c = jardinDe(R, cfg, n, s).carriles[0];
                        var est = R.nuevoEstado(c);
                        R.tomar(c, est, c.x, c.nubeY);
                        for (var y = c.y0; y <= c.y1 + 10; y += 10) R.seguir(c, est, c.x, y, cfg.juego);
                        cierto(R.soltar(c, est, cfg.juego).resultado !== 'exito', 'recta no vale (nivel ' + (n + 1) + ')');
                        var est2 = R.nuevoEstado(c);
                        bajar(R, c, est2, cfg.juego, c.y1 + 10, function (y) { return Math.cos(y / 25) * 40; });
                        igual(R.soltar(c, est2, cfg.juego).resultado, 'exito', 'siguiendo la curva (nivel ' + (n + 1) + ')');
                    }
                });
            }
        },
        {
            descripcion: 'trazo completo de la nube a la flor: éxito y la flor queda regada',
            fn: function () {
                var R = modulo(), cfg = config();
                var c = jardinDe(R, cfg, 0).carriles[0];
                var est = R.nuevoEstado(c);
                var evs = bajar(R, c, est, cfg.juego, c.y1 + 10);
                cierto(evs.some(function (e) { return e.tipo === 'meta'; }), 'llega a la flor');
                igual(R.soltar(c, est, cfg.juego).resultado, 'exito', 'resultado');
                cierto(est.hecho, 'flor regada');
            }
        },
        {
            descripcion: 'desvíos pequeños (zigzag de ±50 px) se toleran',
            fn: function () {
                var R = modulo(), cfg = config();
                for (var n = 0; n < 4; n++) {
                    var c = jardinDe(R, cfg, n, 11).carriles[0];
                    var est = R.nuevoEstado(c);
                    bajar(R, c, est, cfg.juego, c.y1 + 10, function (y) { return Math.sin(y / 30) * 45; });
                    igual(R.soltar(c, est, cfg.juego).resultado, 'exito', 'nivel ' + (n + 1));
                }
            }
        },
        {
            descripcion: 'un trazo horizontal desde la nube no avanza ni se valida',
            fn: function () {
                var R = modulo(), cfg = config();
                var c = jardinDe(R, cfg, 0).carriles[0];
                var est = R.nuevoEstado(c);
                R.tomar(c, est, c.x, c.nubeY);
                var fuera = false;
                for (var x = c.x; x <= c.x + 400; x += 10) {
                    var e = R.seguir(c, est, x, c.y0 + 4, cfg.juego);
                    if (e.tipo === 'fuera') fuera = true;
                }
                cierto(fuera, 'se salió del carril');
                cierto(est.s < 10, 'no avanzó');
                cierto(R.soltar(c, est, cfg.juego).resultado !== 'exito', 'no es éxito');
                cierto(!est.hecho, 'flor sin regar');
            }
        },
        {
            descripcion: 'un trazo incompleto no se valida: reintento y el progreso vuelve a 0',
            fn: function () {
                var R = modulo(), cfg = config();
                var c = jardinDe(R, cfg, 1).carriles[0];
                var est = R.nuevoEstado(c);
                bajar(R, c, est, cfg.juego, c.y0 + c.largo * 0.6);
                var r = R.soltar(c, est, cfg.juego);
                igual(r.resultado, 'reintento', 'resultado');
                igual(est.s, 0, 'progreso');
                cierto(!est.hecho, 'flor sin regar');
            }
        },
        {
            descripcion: 'tocar la nube y soltar sin bajar es solo un toque',
            fn: function () {
                var R = modulo(), cfg = config();
                var c = jardinDe(R, cfg, 0).carriles[0];
                var est = R.nuevoEstado(c);
                R.tomar(c, est, c.x, c.nubeY);
                igual(R.soltar(c, est, cfg.juego).resultado, 'toque', 'resultado');
            }
        },
        {
            descripcion: 'no se puede saltar de la nube a la flor (diagonal o salto grande)',
            fn: function () {
                var R = modulo(), cfg = config();
                var c = jardinDe(R, cfg, 2).carriles[0];
                var est = R.nuevoEstado(c);
                R.tomar(c, est, c.x, c.nubeY);
                // salto directo a la flor
                R.seguir(c, est, c.x, c.y1, cfg.juego);
                igual(R.soltar(c, est, cfg.juego).resultado === 'exito', false, 'salto directo');
                // diagonal por fuera del carril y luego a la flor
                R.tomar(c, est, c.x, c.nubeY);
                R.seguir(c, est, c.x + 300, c.y0 + 100, cfg.juego);
                R.seguir(c, est, c.x + 300, c.y1, cfg.juego);
                R.seguir(c, est, c.x, c.y1, cfg.juego);
                igual(R.soltar(c, est, cfg.juego).resultado === 'exito', false, 'rodeo por fuera');
            }
        },
        {
            descripcion: 'salirse del carril no pierde lo hecho y se puede volver a seguir',
            fn: function () {
                var R = modulo(), cfg = config();
                var c = jardinDe(R, cfg, 3).carriles[0];
                var est = R.nuevoEstado(c);
                bajar(R, c, est, cfg.juego, c.y0 + 150);
                var s = est.s;
                var xe = R.xEn(c, c.y0 + 150);
                igual(R.seguir(c, est, xe + c.tol * 2 + 60, c.y0 + 150, cfg.juego).tipo, 'fuera', 'sale');
                igual(est.s, s, 'progreso guardado');
                igual(R.seguir(c, est, xe, c.y0 + 150, cfg.juego).tipo, 'vuelve', 'vuelve');
                for (var y = c.y0 + 160; y <= c.y1 + 10; y += 10) R.seguir(c, est, R.xEn(c, y), y, cfg.juego);
                igual(R.soltar(c, est, cfg.juego).resultado, 'exito', 'termina');
            }
        },
        {
            descripcion: 'subir el dedo no resta progreso',
            fn: function () {
                var R = modulo(), cfg = config();
                var c = jardinDe(R, cfg, 0).carriles[0];
                var est = R.nuevoEstado(c);
                bajar(R, c, est, cfg.juego, c.y0 + 200);
                var s = est.s;
                R.seguir(c, est, c.x, c.y0 + 40, cfg.juego);
                igual(est.s, s, 'progreso');
            }
        },
        {
            descripcion: 'empezar en el carril (no en la nube) no inicia el trazo, y una flor regada no se riega dos veces',
            fn: function () {
                var R = modulo(), cfg = config();
                var j = jardinDe(R, cfg, 1);
                var estados = j.carriles.map(function (c) { return R.nuevoEstado(c); });
                var c = j.carriles[1];
                var ym = (c.y0 + c.y1) / 2;
                igual(R.nubeEn(j, estados, R.xEn(c, ym), ym, cfg.juego), -1, 'mitad del carril no es nube');
                igual(R.carrilEn(j, estados, R.xEn(c, ym), ym), 1, 'sí es el carril');
                igual(R.nubeEn(j, estados, c.x, c.nubeY, cfg.juego), 1, 'la nube sí');
                bajar(R, c, estados[1], cfg.juego, c.y1 + 10);
                R.soltar(c, estados[1], cfg.juego);
                cierto(estados[1].hecho, 'regada');
                igual(R.nubeEn(j, estados, c.x, c.nubeY, cfg.juego), -1, 'su nube ya no se puede tomar');
                var ev = R.seguir(c, estados[1], c.x, c.y1, cfg.juego);
                igual(ev.tipo, 'nada', 'no se sigue un carril ya regado');
                cierto(!R.completo(estados), 'el nivel no está completo');
            }
        }
    ]
};
