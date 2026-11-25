'use strict';

/**
 * Reglas de "Alimenta al Monstruito Tragabolas": niveles jugables (3, 4, 5 y 6 bolas), gesto de lanzamiento hacia
 * arriba (toques y gestos cortos no lanzan), ayuda para lanzamientos cercanos, fallos que pasan al lado de la boca
 * y bolas que no se comen dos veces.
 */

var fs = require('fs');
var path = require('path');

var RAIZ = path.resolve(__dirname, '..', '..', '..');
var BASE = 'public/catalogo_juegos/Polimotor/MonstruitoTragabolas/';

function modulo() {
    var R = cargarIIFE(BASE + 'reglas.js', 'ReglasMonstruo');
    if (!R) throw new Error('no se exportó ReglasMonstruo');
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

/** Gesto lineal desde el centro de la bola: dx, dy en el mundo, ms de duración. */
function gesto(R, nivel, bola, dx, dy, ms, cfg) {
    var s = [];
    for (var i = 0; i <= 8; i++) s.push({ x: bola.x + dx * i / 8, y: bola.y + dy * i / 8, t: (ms || 200) * i / 8 });
    return R.analizarGesto(s, bola, nivel.boca, nivel, cfg.juego);
}

module.exports = {
    nombre: 'Alimenta al Monstruito Tragabolas — reglas',
    casos: [
        {
            descripcion: 'hay 4 niveles con 3, 4, 5 y 6 bolas y la edad es 3-4 años',
            fn: function () {
                var R = modulo(), cfg = config();
                igual(cfg.rondas.length, 4, 'niveles');
                [3, 4, 5, 6].forEach(function (n, i) {
                    igual(R.prepararNivel(cfg.rondas[i], cfg.juego, R.azar(i + 1)).bolas.length, n, 'bolas del nivel ' + (i + 1));
                });
                igual(cfg.niveles[0].edad, '3-4 años', 'edad');
                igual(cfg.audios.tema, 'polimotor', 'tema de audio');
            }
        },
        {
            descripcion: '2000 partidas al azar: todos los niveles son jugables (monstruito visible, bolas grandes, sin choques, ángulos posibles)',
            fn: function () {
                var R = modulo(), cfg = config();
                var rnd = R.azar(2026);
                for (var k = 0; k < 2000; k++) {
                    cfg.rondas.forEach(function (r, i) {
                        var m = R.validarNivel(R.prepararNivel(r, cfg.juego, rnd));
                        if (m.length) throw new Error('partida ' + k + ' nivel ' + (i + 1) + ': ' + m.join(', '));
                    });
                }
            }
        },
        {
            descripcion: 'cada nivel pone al monstruito más lejos de la bandeja y en un lugar al azar',
            fn: function () {
                var R = modulo(), cfg = config();
                var rnd = R.azar(77);
                var dist = [0, 0, 0, 0], xs = [[], [], [], []];
                for (var k = 0; k < 300; k++) {
                    var antes = null;
                    cfg.rondas.forEach(function (r, i) {
                        var n = R.prepararNivel(r, cfg.juego, rnd, antes);
                        dist[i] += n.bolas[0].y - n.boca.y;
                        xs[i].push(n.monstruo.x);
                        antes = n.monstruo.x;
                    });
                }
                for (var i = 1; i < 4; i++) cierto(dist[i] > dist[i - 1], 'el nivel ' + (i + 1) + ' queda más lejos que el ' + i);
                xs.forEach(function (l, i) {
                    var min = Math.min.apply(null, l), max = Math.max.apply(null, l);
                    cierto(max - min >= 150, 'el nivel ' + (i + 1) + ' cambia de posición (' + min + '…' + max + ')');
                });
            }
        },
        {
            descripcion: 'los colores de un nivel no se repiten mientras alcancen y los ids son únicos en la partida',
            fn: function () {
                var R = modulo(), cfg = config();
                var ids = {};
                cfg.rondas.forEach(function (r) {
                    var n = R.prepararNivel(r, cfg.juego, R.azar(9));
                    var cols = {};
                    n.bolas.forEach(function (b) {
                        cierto(!cols[b.color], 'color repetido ' + b.color + ' en el nivel ' + r.id);
                        cols[b.color] = 1;
                        cierto(!ids[b.id], 'id repetido ' + b.id);
                        ids[b.id] = 1;
                    });
                });
            }
        },
        {
            descripcion: 'un toque sin deslizar, un gesto corto o hacia abajo no lanzan',
            fn: function () {
                var R = modulo(), cfg = config();
                var n = R.prepararNivel(cfg.rondas[0], cfg.juego, R.azar(1));
                var b = n.bolas[1];
                var t = gesto(R, n, b, 3, -4, 200, cfg);
                igual(t.lanza, false, 'toque');
                igual(t.motivo, 'toque', 'motivo del toque');
                igual(gesto(R, n, b, 4, -26, 200, cfg).lanza, false, 'gesto corto');
                igual(gesto(R, n, b, 0, 90, 200, cfg).motivo, 'abajo', 'hacia abajo');
                igual(gesto(R, n, b, 160, -10, 200, cfg).lanza, false, 'casi horizontal');
            }
        },
        {
            descripcion: 'deslizar hacia la boca entra, también recto hacia arriba desde las bolas de los lados (corrección suave)',
            fn: function () {
                var R = modulo(), cfg = config();
                cfg.rondas.forEach(function (r) {
                    var n = R.prepararNivel(r, cfg.juego, R.azar(r.id * 7));
                    n.bolas.forEach(function (b) {
                        var ideal = (n.boca.x - b.x) / (b.y - n.boca.y) * 120;
                        var a = gesto(R, n, b, ideal, -120, 220, cfg);
                        cierto(a.lanza && a.acierto, 'apuntando a la boca, nivel ' + r.id);
                        cierto(R.enBoca(a.destino.x, a.destino.y, n.boca), 'el destino está en la boca');
                        // un desvío de 15° también entra
                        var ang = Math.atan2(n.boca.x - b.x, b.y - n.boca.y) + 15 * Math.PI / 180;
                        var d = gesto(R, n, b, Math.tan(ang) * 120, -120, 220, cfg);
                        cierto(d.acierto, 'desvío de 15°, nivel ' + r.id);
                    });
                });
                var n1 = R.prepararNivel(cfg.rondas[0], cfg.juego, R.azar(3));
                n1.bolas.forEach(function (b) { cierto(gesto(R, n1, b, 0, -130, 200, cfg).acierto, 'recto hacia arriba en el nivel 1'); });
            }
        },
        {
            descripcion: 'un lanzamiento muy desviado pasa al lado de la cabeza, sin tocar la zona de la boca',
            fn: function () {
                var R = modulo(), cfg = config();
                var n = R.prepararNivel(cfg.rondas[3], cfg.juego, R.azar(4));
                var b = n.bolas[0];
                var ang = Math.atan2(n.boca.x - b.x, b.y - n.boca.y) - 45 * Math.PI / 180;
                var f = gesto(R, n, b, Math.tan(ang) * 120, -120, 200, cfg);
                igual(f.lanza, true, 'se lanza');
                igual(f.acierto, false, 'no entra');
                cierto(!R.enBoca(f.destino.x, f.destino.y, n.boca, 20), 'el destino queda fuera de la boca');
                cierto(f.destino.x >= 90 && f.destino.x <= 1510, 'el destino queda en pantalla');
            }
        },
        {
            descripcion: 'la dirección sale del tramo final del gesto y la duración del vuelo queda en su rango',
            fn: function () {
                var R = modulo(), cfg = config();
                var n = R.prepararNivel(cfg.rondas[0], cfg.juego, R.azar(5));
                var b = n.bolas[1];
                // primero se arrastra hacia el lado despacio, luego un golpe rápido hacia arriba
                var s = [{ x: b.x, y: b.y, t: 0 }, { x: b.x + 60, y: b.y - 5, t: 400 }, { x: b.x + 60, y: b.y - 40, t: 480 }, { x: b.x + 60, y: b.y - 120, t: 540 }];
                var r = R.analizarGesto(s, b, n.boca, n, cfg.juego);
                cierto(r.lanza && Math.abs(r.angulo) < 10, 'dirección del tramo final (' + r.angulo + '°)');
                cierto(r.vueloMs >= cfg.juego.vueloMinMs && r.vueloMs <= cfg.juego.vueloMaxMs, 'duración del vuelo');
            }
        },
        {
            descripcion: 'una bola comida no cuenta dos veces y el nivel termina con todas',
            fn: function () {
                var R = modulo(), cfg = config();
                var n = R.prepararNivel(cfg.rondas[1], cfg.juego, R.azar(6));
                var m = R.nuevoMarcador(n);
                igual(R.registrarAcierto(m, n, n.bolas[0].id), true, 'primera vez');
                igual(R.registrarAcierto(m, n, n.bolas[0].id), false, 'segunda vez');
                igual(R.registrarAcierto(m, n, 'otra'), false, 'bola de otro nivel');
                R.registrarFallo(m);
                igual(m.fallos, 1, 'un fallo no resta');
                igual(m.n, 1, 'se conserva el progreso');
                igual(R.completo(m), false, 'aún no termina');
                n.bolas.slice(1).forEach(function (b) { R.registrarAcierto(m, n, b.id); });
                igual(R.completo(m), true, 'nivel completo');
            }
        },
        {
            descripcion: 'los textos de voz pedidos están en config.json',
            fn: function () {
                var t = config().textos;
                igual(t.introZoe, '¡El monstruito tiene hambre! Toma una bolita de color, desliza tu dedo hacia arriba apuntando a su boca y ¡zas!, lánzala para alimentarlo.', 'Zoe');
                igual(t.introZeus, '¡Apunta derechito a su boca abierta y desliza tu dedo!', 'Zeus');
                igual(t.cierre, '¡QUÉ GRAN PUNTERÍA! ¡Alimentaste al monstruito con todas las bolas de colores!', 'cierre');
                igual(t.finalTitulo, '¡LO LOGRASTE!', 'final');
                igual(t.finalSub, '¡ERES UN EXPERTO EN PUNTERÍA!', 'final sub');
                ['¡Vamos a darle una bolita!', '¡Desliza hacia arriba!', '¡El monstruito tiene hambre!'].forEach(function (f) { cierto(t.zoeJuego.indexOf(f) >= 0, f); });
                ['¡Muy bien! ¡Otra bolita!', '¡Casi lo lograste!', '¡Mira su boca!'].forEach(function (f) { cierto(t.zeusJuego.indexOf(f) >= 0, f); });
                ['¡Inténtalo otra vez!', '¡Lanza hacia arriba!', '¡Mira su boquita!', '¡Vamos, tú puedes!', '¡Qué divertido!'].forEach(function (f) { cierto(t.apoyo.indexOf(f) >= 0, f); });
            }
        }
    ]
};
