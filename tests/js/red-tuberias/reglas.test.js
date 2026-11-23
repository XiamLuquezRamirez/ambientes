'use strict';

var fs = require('fs');
var path = require('path');

var RAIZ = path.resolve(__dirname, '..', '..', '..');
var BASE = 'public/catalogo_juegos/Polimotor/RedTuberiasLuz/';

function modulo() {
    var R = cargarIIFE(BASE + 'reglas.js', 'ReglasTuberia');
    if (!R) throw new Error('no se exportó ReglasTuberia');
    return R;
}

function config() {
    return JSON.parse(fs.readFileSync(path.join(RAIZ, BASE, 'config.json'), 'utf8'));
}

function redes() {
    var R = modulo(), c = config();
    return c.redes.map(function (d) { return R.construir(d, c.juego); });
}

function igual(real, esperado, que) {
    if (real !== esperado) throw new Error(que + ': se esperaba ' + esperado + ' y llegó ' + real);
}

function cierto(valor, que) {
    if (!valor) throw new Error(que + ': se esperaba un valor verdadero');
}

/** Lleva el dedo por el eje desde s0 hasta s1 a vel unidades por segundo, cuadro a cuadro. */
function llevar(R, red, est, s0, s1, cfg, lat, vel) {
    var dt = 16, eventos = [], cps = [];
    var paso = (vel || 300) * dt / 1000;
    for (var s = s0; s <= s1 + paso; s += paso) {
        var p = R.puntoEn(red, Math.min(s, s1));
        var n = R.normal(p.ang);
        var r = R.conducir(red, est, p.x + n.x * (lat || 0), p.y + n.y * (lat || 0), dt, cfg);
        cps = cps.concat(r.checkpoints);
        if (r.evento) eventos.push(r.evento);
        if (r.evento === 'meta' || r.evento === 'perdida') break;
    }
    return { eventos: eventos, checkpoints: cps };
}

module.exports = {
    nombre: '¡La Red de Tuberías! (reglas)',
    casos: [
        {
            descripcion: 'config: 4 niveles, edad 5-6 años, tema polimotor y textos del pedido',
            fn: function () {
                var c = config();
                igual(c.redes.length, 4, 'niveles');
                igual(c.niveles[0].edad, '5-6 años', 'edad');
                igual(c.audios.tema, 'polimotor', 'tema');
                igual(c.mostrarFeedBack, true, 'voces');
                igual(c.textos.introZeus, '¡Alerta de conducción eléctrica! Necesitamos llevar la gema hasta el reactor. Presiona la gema con tu dedo y arrástrala por dentro de la tubería sin soltarla hasta llegar al final.', 'voz de Zeus');
                igual(c.textos.guiaZoe, '¡No despegues tu dedo de la pantalla mientras recorres la tubería!', 'consejo de Zoe');
                igual(c.textos.finalVoz, '¡DOMINIO TÁCTIL TOTAL! Mantuviste el arrastre perfecto a través de todo el circuito de tuberías.', 'cierre');
                c.redes.forEach(function (r, i) {
                    cierto(r.cartel && r.cartel.etiqueta && r.cartel.titulo, 'cartel del nivel ' + (i + 1));
                });
            }
        },
        {
            descripcion: 'las 4 redes son válidas, caben en 4:3 y crecen en largo y checkpoints',
            fn: function () {
                var R = modulo();
                var prev = 0, prevCp = 0;
                redes().forEach(function (red, i) {
                    var err = R.validar(red, { zona: { x0: 340, x1: 1225, y0: 140, y1: 790 } });
                    igual(err.length, 0, 'red ' + (i + 1) + ' ' + err.join(', '));
                    cierto(red.largo > prev, 'red ' + (i + 1) + ' más larga');
                    cierto(red.checkpoints.length >= prevCp, 'red ' + (i + 1) + ' con checkpoints');
                    cierto(red.ancho >= 80, 'carril cómodo para 5-6 años en la red ' + (i + 1));
                    prev = red.largo;
                    prevCp = red.checkpoints.length;
                });
            }
        },
        {
            descripcion: 'un dedo que sigue el eje llega al reactor pasando todos los checkpoints en orden',
            fn: function () {
                var R = modulo(), cfg = config().juego;
                redes().forEach(function (red, i) {
                    var est = R.nuevoEstado(red);
                    R.tomar(est);
                    var r = llevar(R, red, est, 0, red.largo, cfg);
                    cierto(r.eventos.indexOf('meta') >= 0, 'llega en la red ' + (i + 1));
                    igual(r.checkpoints.join(','), red.checkpoints.map(function (c) { return c.i; }).join(','), 'checkpoints en orden red ' + (i + 1));
                    igual(r.eventos.indexOf('fuera'), -1, 'nunca sale en la red ' + (i + 1));
                });
            }
        },
        {
            descripcion: 'tolerancia: desviarse a los lados dentro del margen no detiene y la gema queda dentro del carril',
            fn: function () {
                var R = modulo(), cfg = config().juego;
                redes().forEach(function (red, i) {
                    var s = R.simular(red, cfg, 'desviado');
                    cierto(s.llego, 'llega desviado en la red ' + (i + 1));
                    cierto(s.maxLat <= red.holgura + 0.01, 'la gema no sale del carril en la red ' + (i + 1));
                    cierto(red.tolerancia > red.ancho / 2, 'el margen es mayor que medio carril');
                });
            }
        },
        {
            descripcion: 'sin teletransporte: saltar al reactor o cortar en línea recta no completa',
            fn: function () {
                var R = modulo(), cfg = config().juego;
                redes().forEach(function (red, i) {
                    var a = R.simular(red, cfg, 'salto');
                    igual(a.llego, false, 'salto en la red ' + (i + 1));
                    igual(a.maxS, 0, 'el salto no avanza en la red ' + (i + 1));
                    var b = R.simular(red, cfg, 'atajo');
                    igual(b.llego, false, 'atajo en la red ' + (i + 1));
                });
            }
        },
        {
            descripcion: 'la gema avanza como mucho velocidadMax por segundo',
            fn: function () {
                var R = modulo(), cfg = config().juego;
                var red = redes()[0];
                var est = R.nuevoEstado(red);
                R.tomar(est);
                var p = R.puntoEn(red, 150);
                R.conducir(red, est, p.x, p.y, 16, cfg);
                cierto(est.s <= cfg.velocidadMax * 16 / 1000 + 0.01, 'avance por cuadro ' + est.s);
            }
        },
        {
            descripcion: 'en un zigzag el dedo sobre el tramo vecino no hace saltar la gema a través de la pared',
            fn: function () {
                var R = modulo(), cfg = config().juego;
                var red = redes()[3];
                var est = R.nuevoEstado(red);
                R.tomar(est);
                llevar(R, red, est, 0, 480, cfg);
                var s0 = est.s;
                // un punto del tramo siguiente que esté cerca en la pantalla pero lejos en el recorrido
                var mejor = null;
                red.muestras.forEach(function (m) {
                    if (m.s < s0 + red.ancho * 4) return;
                    var d = Math.hypot(m.x - est.x, m.y - est.y);
                    if (!mejor || d < mejor.d) mejor = { d: d, m: m };
                });
                var r = R.conducir(red, est, mejor.m.x, mejor.m.y, 16, cfg);
                igual(r.evento, 'fuera', 'el dedo en el tramo vecino es "fuera"');
                cierto(Math.abs(est.s - s0) < 1, 'la gema no avanzó');
            }
        },
        {
            descripcion: 'levantar el dedo detiene la gema y la devuelve al último checkpoint, sin perder los anteriores',
            fn: function () {
                var R = modulo(), cfg = config().juego;
                var red = redes()[1];
                var est = R.nuevoEstado(red);
                R.tomar(est);
                var hasta = red.checkpoints[1].s + 60;
                llevar(R, red, est, 0, hasta, cfg);
                igual(est.cp, 1, 'pasó dos checkpoints');
                var r = R.soltar(red, est);
                igual(est.conectado, false, 'desconectada');
                igual(Math.round(r.hasta), Math.round(red.checkpoints[1].s), 'vuelve al checkpoint 2');
                igual(est.cp, 1, 'conserva los checkpoints');
                igual(est.enMeta, false, 'no completa');
                cierto(R.tocaGema(red, est, red.checkpoints[1].x + 20, red.checkpoints[1].y, cfg), 'se retoma en el checkpoint');
                cierto(!R.tocaGema(red, est, red.inicio.x, red.inicio.y, cfg), 'no en el generador');
                R.tomar(est);
                var fin = llevar(R, red, est, est.s, red.largo, cfg);
                cierto(fin.eventos.indexOf('meta') >= 0, 'reanuda y llega');
            }
        },
        {
            descripcion: 'soltar antes del primer checkpoint vuelve al generador; soltar en el reactor no cambia nada',
            fn: function () {
                var R = modulo(), cfg = config().juego;
                var red = redes()[0];
                var est = R.nuevoEstado(red);
                R.tomar(est);
                llevar(R, red, est, 0, red.checkpoints[0].s - 40, cfg);
                igual(R.soltar(red, est).hasta, 0, 'vuelve al generador');
                R.tomar(est);
                llevar(R, red, est, 0, red.largo, cfg);
                igual(est.enMeta, true, 'llegó');
                igual(R.soltar(red, est).meta, true, 'soltar en la meta es válido');
            }
        },
        {
            descripcion: 'fuera del carril: espera, vuelve, y si tarda demasiado regresa al checkpoint',
            fn: function () {
                var R = modulo(), cfg = config().juego;
                var red = redes()[0];
                var est = R.nuevoEstado(red);
                R.tomar(est);
                llevar(R, red, est, 0, red.checkpoints[0].s + 80, cfg);
                var s0 = est.s;
                var p = R.puntoEn(red, s0), n = R.normal(p.ang);
                var lejos = { x: p.x + n.x * (red.tolerancia + 60), y: p.y + n.y * (red.tolerancia + 60) };
                igual(R.conducir(red, est, lejos.x, lejos.y, 16, cfg).evento, 'fuera', 'sale');
                igual(est.s, s0, 'no avanza fuera');
                igual(R.conducir(red, est, p.x, p.y, 16, cfg).evento, 'vuelve', 'vuelve');
                var ev = null;
                for (var t = 0; t < cfg.fueraMaxMs + 200 && ev !== 'perdida'; t += 16) ev = R.conducir(red, est, lejos.x, lejos.y, 16, cfg).evento;
                igual(ev, 'perdida', 'se pierde tras fueraMaxMs');
                igual(Math.round(est.s), Math.round(red.checkpoints[0].s), 'en el checkpoint');
                igual(est.conectado, false, 'hay que tomarla otra vez');
            }
        },
        {
            descripcion: 'tocar el reactor no toma la gema ni completa el nivel',
            fn: function () {
                var R = modulo(), cfg = config().juego;
                redes().forEach(function (red, i) {
                    var est = R.nuevoEstado(red);
                    igual(R.tocaGema(red, est, red.meta.x, red.meta.y, cfg), false, 'el reactor no es la gema en la red ' + (i + 1));
                    var r = R.conducir(red, est, red.meta.x, red.meta.y, 16, cfg);
                    igual(r.evento, null, 'sin tomar la gema no pasa nada en la red ' + (i + 1));
                    igual(est.enMeta, false, 'no completa la red ' + (i + 1));
                });
            }
        },
        {
            descripcion: 'los mensajes nunca son negativos',
            fn: function () {
                var t = config().textos;
                [t.fuera, t.perdida, t.soltar, t.tocaGema, t.pistaArrastra].forEach(function (m) {
                    cierto(m && !/(^|[^a-záéíóúñ])(fallaste|mal|incorrect[a-z]*|perdiste)([^a-záéíóúñ]|$)/i.test(m), 'mensaje: ' + m);
                });
            }
        },
        {
            descripcion: 'redes al azar: cada nivel genera tuberías distintas, válidas y recorribles',
            fn: function () {
                var R = modulo(), c = config();
                c.redes.forEach(function (d, i) {
                    cierto(d.aleatoria, 'el nivel ' + (i + 1) + ' tiene rangos al azar');
                    var firmas = {};
                    for (var k = 0; k < 25; k++) {
                        var g = R.generar(d, c.juego);
                        cierto(g.generada, 'nivel ' + (i + 1) + ' generó una red nueva');
                        firmas[JSON.stringify(g.puntos)] = true;
                        var red = R.construir(g, c.juego);
                        var err = R.validar(red, { zona: R.ZONA });
                        igual(err.length, 0, 'nivel ' + (i + 1) + ' red válida ' + err.join(', '));
                        igual(red.checkpoints.length, d.aleatoria.checkpoints, 'checkpoints del nivel ' + (i + 1));
                        cierto(R.simular(red, c.juego, 'centro').llego, 'se puede recorrer');
                        igual(R.simular(red, c.juego, 'salto').llego, false, 'sin teletransporte');
                        cierto(red.inicio.y >= 300 && red.inicio.y <= 600, 'el generador cabe');
                        cierto(red.meta.y >= 320 && red.meta.y <= 600, 'el reactor cabe');
                    }
                    cierto(Object.keys(firmas).length >= 24, 'casi nunca se repite en el nivel ' + (i + 1));
                });
            }
        },
        {
            descripcion: 'redes al azar: la dificultad sube con el nivel (más largas, carril más angosto)',
            fn: function () {
                var R = modulo(), c = config();
                var prevLargo = 0, prevAncho = 999;
                c.redes.forEach(function (d, i) {
                    var suma = 0;
                    for (var k = 0; k < 20; k++) suma += R.construir(R.generar(d, c.juego), c.juego).largo;
                    var medio = suma / 20;
                    cierto(medio > prevLargo, 'nivel ' + (i + 1) + ' más largo en promedio (' + Math.round(medio) + ')');
                    cierto(d.ancho <= prevAncho, 'nivel ' + (i + 1) + ' carril igual o más angosto');
                    prevLargo = medio;
                    prevAncho = d.ancho;
                });
            }
        },
        {
            descripcion: 'redes al azar: con la misma semilla sale la misma red; sin rangos queda la fija',
            fn: function () {
                var R = modulo(), c = config();
                var semilla = function (s) { return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };
                var a = R.generar(c.redes[2], c.juego, semilla(7)), b = R.generar(c.redes[2], c.juego, semilla(7));
                igual(JSON.stringify(a.puntos), JSON.stringify(b.puntos), 'misma semilla');
                var fija = {};
                Object.keys(c.redes[0]).forEach(function (k) { if (k !== 'aleatoria') fija[k] = c.redes[0][k]; });
                igual(R.generar(fija, c.juego), fija, 'sin aleatoria devuelve la misma definición');
            }
        }
    ]
};
