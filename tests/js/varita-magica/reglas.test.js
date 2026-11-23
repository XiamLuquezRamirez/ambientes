'use strict';

/**
 * Reglas de "La Varita Mágica y las Estrellas en el Cielo": generador de caminos (4 niveles, validación, respaldo,
 * variación entre partidas) y trazado (no se puede saltar la curva, desviaciones sin pérdida, estrellas por
 * progreso real).
 */

var fs = require('fs');
var path = require('path');

var RAIZ = path.resolve(__dirname, '..', '..', '..');
var BASE = 'public/catalogo_juegos/Polimotor/VaritaMagicaEstrellas/';

function modulo() {
    var R = cargarIIFE(BASE + 'reglas.js', 'ReglasVarita');
    if (!R) throw new Error('no se exportó ReglasVarita');
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

/** Recorre el camino con el "dedo" de s0 a s1, con un desvío lateral constante. */
function trazar(R, c, est, j, s0, s1, desvio, paso) {
    var evs = [];
    for (var s = s0; s <= s1 + 0.01; s += paso || 10) {
        var p = R.puntoEn(c, Math.min(s, c.largo));
        var off = desvio || 0;
        evs.push(R.seguir(c, est, p.x - Math.sin(p.ang) * off, p.y + Math.cos(p.ang) * off, j));
    }
    return evs;
}

function empezar(R, c) {
    var est = R.nuevoEstado(c);
    R.tomar(est, c.inicio.x, c.inicio.y);
    return est;
}

var SEMILLAS = [1, 7, 42, 99, 2026, 31337, 5, 12345];

module.exports = {
    nombre: 'Varita mágica — generador y trazado',
    casos: [
        {
            descripcion: 'config: exactamente 4 cielos con 5, 6, 7 y 8 estrellas y carriles que no se estrechan bruscamente',
            fn: function () {
                var c = config();
                igual(c.cielos.length, 4, 'cielos');
                [5, 6, 7, 8].forEach(function (n, i) { igual(c.cielos[i].estrellas, n, 'estrellas del cielo ' + (i + 1)); });
                for (var i = 1; i < 4; i++) {
                    cierto(c.cielos[i].ancho <= c.cielos[i - 1].ancho, 'el carril no se ensancha');
                    cierto(c.cielos[i].ancho >= 140, 'carril amplio en el cielo ' + (i + 1));
                }
                igual(c.niveles[0].edad, '3-4 años', 'edad');
                igual(c.audios.tema, 'polimotor', 'tema de audio');
                igual(c.mostrarFeedBack, true, 'voces');
            }
        },
        {
            descripcion: 'todas las plantillas de cada cielo existen',
            fn: function () {
                var R = modulo(), c = config();
                c.cielos.forEach(function (d) {
                    d.plantillas.forEach(function (p) { cierto(R.PLANTILLAS[p], 'plantilla ' + p); });
                    cierto(d.plantillas.length >= 4, 'variedad de plantillas');
                });
            }
        },
        {
            descripcion: 'los caminos de respaldo de los 4 cielos son válidos',
            fn: function () {
                var R = modulo(), c = config();
                c.cielos.forEach(function (d, i) {
                    var r = d.respaldo;
                    var cam = R.construir({ plantilla: r.plantilla, ancho: d.ancho, paso: c.juego.paso, estrellas: d.estrellas, caja: r.caja, centro: r.centro, volteoX: false, volteoY: false, variacion: 0, sepEstrellas: c.juego.sepEstrellas, lateral: c.juego.lateralEstrellas }, R.azar(i + 3));
                    igual(R.validar(cam, d, c.juego), null, 'respaldo del cielo ' + (i + 1));
                });
            }
        },
        {
            descripcion: 'cada partida genera 4 caminos válidos, casi nunca de respaldo, sin bucles (8 semillas)',
            fn: function () {
                var R = modulo(), c = config();
                var respaldos = 0;
                SEMILLAS.forEach(function (sem) {
                    var p = R.generarPartida(c.cielos, c.juego, R.azar(sem));
                    igual(p.length, 4, 'caminos');
                    p.forEach(function (cam, i) {
                        if (cam.respaldo) respaldos++;
                        igual(R.validar(cam, c.cielos[i], c.juego), null, 'camino del cielo ' + (i + 1) + ' semilla ' + sem);
                        igual(cam.estrellas.length, c.cielos[i].estrellas, 'estrellas');
                        cierto(cam.intentos <= c.juego.intentos, 'intentos acotados');
                    });
                });
                cierto(respaldos <= 1, 'respaldos: ' + respaldos);
            }
        },
        {
            descripcion: 'la dificultad crece: cada cielo es más largo en promedio que el anterior',
            fn: function () {
                var R = modulo(), c = config();
                var prom = [0, 0, 0, 0];
                SEMILLAS.forEach(function (sem) {
                    R.generarPartida(c.cielos, c.juego, R.azar(sem)).forEach(function (cam, i) { prom[i] += cam.largo / SEMILLAS.length; });
                });
                for (var i = 1; i < 4; i++) cierto(prom[i] > prom[i - 1] * 1.1, 'cielo ' + (i + 1) + ' más largo (' + Math.round(prom[i]) + ' vs ' + Math.round(prom[i - 1]) + ')');
            }
        },
        {
            descripcion: 'los caminos cambian entre partidas y se evita la plantilla de la partida anterior',
            fn: function () {
                var R = modulo(), c = config();
                var a = R.generarPartida(c.cielos, c.juego, R.azar(3));
                var b = R.generarPartida(c.cielos, c.juego, R.azar(4), a.map(function (x) { return x.plantilla; }));
                b.forEach(function (cam, i) {
                    if (!cam.respaldo) cierto(cam.plantilla !== a[i].plantilla, 'plantilla repetida en el cielo ' + (i + 1));
                });
                var distintos = a.some(function (cam, i) { return Math.abs(cam.inicio.x - b[i].inicio.x) > 1 || Math.abs(cam.inicio.y - b[i].inicio.y) > 1; });
                cierto(distintos, 'posiciones distintas');
            }
        },
        {
            descripcion: 'las estrellas salen en lugares al azar: no a distancias iguales y distintas en cada sorteo del mismo camino',
            fn: function () {
                var R = modulo(), c = config();
                c.cielos.forEach(function (d, n) {
                    var firmas = {};
                    var desiguales = 0;
                    for (var sem = 1; sem <= 12; sem++) {
                        // el mismo camino (caja, centro y volteos fijos); solo cambia el sorteo de las estrellas
                        var cam = R.construir({ plantilla: d.respaldo.plantilla, ancho: d.ancho, paso: c.juego.paso, estrellas: d.estrellas, caja: d.respaldo.caja, centro: d.respaldo.centro, volteoX: false, volteoY: false, variacion: 0, sepEstrellas: c.juego.sepEstrellas, lateral: c.juego.lateralEstrellas }, R.azar(sem * 97 + n));
                        igual(cam.estrellas.length, d.estrellas, 'estrellas');
                        igual(Math.round(cam.estrellas[cam.estrellas.length - 1].s), Math.round(cam.largo), 'la última marca el final');
                        firmas[cam.estrellas.map(function (e) { return Math.round(e.x / 10) + ':' + Math.round(e.y / 10); }).join('|')] = true;
                        var tramos = [];
                        var prev = 0;
                        cam.estrellas.forEach(function (e) { tramos.push(e.s - prev); prev = e.s; });
                        var max = Math.max.apply(null, tramos), min = Math.min.apply(null, tramos);
                        if (max - min > cam.largo / d.estrellas * 0.25) desiguales++;
                        cierto(min >= Math.min(c.juego.sepEstrellas, cam.largo / (d.estrellas + 0.4)) - 1, 'separación mínima en el cielo ' + (n + 1));
                    }
                    cierto(Object.keys(firmas).length >= 10, 'posiciones distintas en el cielo ' + (n + 1) + ': ' + Object.keys(firmas).length + ' de 12');
                    cierto(desiguales >= 8, 'reparto no uniforme en el cielo ' + (n + 1) + ': ' + desiguales + ' de 12');
                });
            }
        },
        {
            descripcion: 'el camino queda dentro de la zona jugable y no pisa la luna',
            fn: function () {
                var R = modulo(), c = config();
                var z = R.ZONA, ob = R.OBSTACULOS[0];
                SEMILLAS.forEach(function (sem) {
                    R.generarPartida(c.cielos, c.juego, R.azar(sem)).forEach(function (cam) {
                        cam.muestras.forEach(function (m) {
                            cierto(m.x >= z.x0 && m.x <= z.x1 && m.y >= z.y0 && m.y <= z.y1, 'dentro de la zona');
                            cierto(Math.hypot(m.x - ob.x, m.y - ob.y) > ob.r + cam.ancho / 2, 'lejos de la luna');
                        });
                    });
                });
            }
        },
        {
            descripcion: 'recorrer la curva (con un desvío amplio) enciende todas las estrellas en orden y llega a la meta',
            fn: function () {
                var R = modulo(), c = config();
                SEMILLAS.slice(0, 4).forEach(function (sem) {
                    R.generarPartida(c.cielos, c.juego, R.azar(sem)).forEach(function (cam) {
                        var est = empezar(R, cam);
                        var orden = [];
                        trazar(R, cam, est, c.juego, 0, cam.largo, cam.ancho / 2 + 20).forEach(function (e) { orden = orden.concat(e.nuevas); });
                        igual(est.enMeta, true, 'meta en ' + cam.plantilla);
                        igual(orden.join(','), cam.estrellas.map(function (e) { return e.i; }).join(','), 'orden de las estrellas');
                    });
                });
            }
        },
        {
            descripcion: 'no se puede saltar: tocar el inicio y luego el final no avanza ni enciende estrellas',
            fn: function () {
                var R = modulo(), c = config();
                R.generarPartida(c.cielos, c.juego, R.azar(8)).forEach(function (cam) {
                    var est = empezar(R, cam);
                    var e = R.seguir(cam, est, cam.fin.x, cam.fin.y, c.juego);
                    igual(est.enMeta, false, 'meta por salto en ' + cam.plantilla);
                    igual(e.nuevas.length, 0, 'estrellas por salto');
                    cierto(est.s < 1, 'progreso tras el salto');
                    igual(est.fuera, true, 'el salto queda fuera');
                });
            }
        },
        {
            descripcion: 'tocar las estrellas sueltas, de una en una, no las enciende',
            fn: function () {
                var R = modulo(), c = config();
                R.generarPartida(c.cielos, c.juego, R.azar(11)).forEach(function (cam) {
                    var est = empezar(R, cam);
                    var nuevas = 0;
                    cam.estrellas.slice(1).forEach(function (st) { nuevas += R.seguir(cam, est, st.x, st.y, c.juego).nuevas.length; });
                    igual(nuevas, 0, 'estrellas encendidas sin recorrer en ' + cam.plantilla);
                    igual(est.enMeta, false, 'meta');
                });
            }
        },
        {
            descripcion: 'la varita solo se toma en el inicio (o donde quedó el progreso), con zona grande',
            fn: function () {
                var R = modulo(), c = config();
                var cam = R.generarPartida(c.cielos, c.juego, R.azar(21))[1];
                var est = R.nuevoEstado(cam);
                cierto(R.tocaVarita(cam, est, cam.inicio.x + 70, cam.inicio.y - 70, c.juego), 'toque cerca del inicio, sin exigir el centro');
                cierto(!R.tocaVarita(cam, est, cam.fin.x, cam.fin.y, c.juego), 'toque en el final');
                R.tomar(est, cam.inicio.x, cam.inicio.y);
                trazar(R, cam, est, c.juego, 0, cam.largo * 0.5);
                R.soltar(est);
                var p = R.puntoEn(cam, est.s);
                cierto(R.tocaVarita(cam, est, p.x, p.y, c.juego), 'retomar donde quedó');
                cierto(!R.tocaVarita(cam, est, cam.inicio.x, cam.inicio.y, c.juego), 'el inicio ya no sirve: se sigue desde la varita');
            }
        },
        {
            descripcion: 'salirse del carril no resta progreso y al volver se continúa',
            fn: function () {
                var R = modulo(), c = config();
                var cam = R.generarPartida(c.cielos, c.juego, R.azar(5))[2];
                var est = empezar(R, cam);
                trazar(R, cam, est, c.juego, 0, cam.largo * 0.4);
                var s = est.s;
                var p = R.puntoEn(cam, s);
                var salida = [];
                for (var k = 20; k <= 300; k += 20) salida.push(R.seguir(cam, est, p.x - Math.sin(p.ang) * k, p.y + Math.cos(p.ang) * k, c.juego));
                cierto(est.fuera, 'queda fuera');
                cierto(salida.some(function (e) { return e.salio; }), 'avisa la salida');
                cierto(est.s >= s, 'no pierde progreso');
                var vuelta = [];
                for (var k2 = 300; k2 >= 0; k2 -= 20) vuelta.push(R.seguir(cam, est, p.x - Math.sin(p.ang) * k2, p.y + Math.cos(p.ang) * k2, c.juego));
                cierto(!est.fuera && vuelta.some(function (e) { return e.volvio; }), 'avisa la vuelta');
                trazar(R, cam, est, c.juego, est.s, cam.largo);
                igual(est.enMeta, true, 'completa tras volver');
            }
        },
        {
            descripcion: 'la tolerancia es amplia (más de medio carril) pero no infinita',
            fn: function () {
                var R = modulo(), c = config();
                var cam = R.generarPartida(c.cielos, c.juego, R.azar(13))[0];
                var tol = R.tolerancia(cam, c.juego);
                cierto(tol >= cam.ancho / 2 + 40, 'tolerancia amplia');
                var est = empezar(R, cam);
                trazar(R, cam, est, c.juego, 0, cam.largo, tol + 60);
                igual(est.enMeta, false, 'muy lejos no cuenta');
            }
        }
    ]
};
