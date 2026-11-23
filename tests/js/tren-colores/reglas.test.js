'use strict';

var fs = require('fs');
var path = require('path');

var RAIZ = path.resolve(__dirname, '..', '..', '..');
var BASE = 'public/catalogo_juegos/Polimotor/TrenColoresViasMagicas/';

function modulo() {
    var R = cargarIIFE(BASE + 'reglas.js', 'ReglasTren');
    if (!R) throw new Error('no se exportó ReglasTren');
    return R;
}

function config() {
    return JSON.parse(fs.readFileSync(path.join(RAIZ, BASE, 'config.json'), 'utf8'));
}

/** Rutas de los 4 niveles con varias semillas (las estaciones salen al azar en cada partida). */
function rutas(semillas) {
    var R = modulo(), c = config();
    var out = [];
    (semillas || [1, 7, 42, 2026, 99991]).forEach(function (sem) {
        c.vias.forEach(function (v, i) {
            out.push({ nivel: i + 1, semilla: sem, def: v, ruta: R.generarRuta(v, c.ruta, R.azarConSemilla(sem * 10 + i)) });
        });
    });
    return out;
}

/** Todos los tramos (huecos) de esas rutas ya armados como trazo. */
function tramos(semillas) {
    var R = modulo(), c = config();
    var out = [];
    rutas(semillas).forEach(function (r) {
        r.ruta.tramos.forEach(function (d, j) {
            out.push({ nombre: 'nivel ' + r.nivel + ' (semilla ' + r.semilla + ') hueco ' + (j + 1), t: R.construir(d, c.juego), nivel: r.nivel });
        });
    });
    return out;
}

function igual(real, esperado, que) {
    if (real !== esperado) throw new Error(que + ': se esperaba ' + esperado + ' y llegó ' + real);
}

function cierto(valor, que) {
    if (!valor) throw new Error(que + ': se esperaba un valor verdadero');
}

module.exports = {
    nombre: 'El Tren de Colores y las Vías Mágicas (reglas)',
    casos: [
        {
            descripcion: 'config: 4 niveles con 2, 3, 4 y 4 estaciones (el último con curvas), edad 3-4 años y textos pedidos',
            fn: function () {
                var c = config();
                igual(c.vias.length, 4, 'niveles');
                igual(c.niveles[0].edad, '3-4 años', 'edad');
                igual(c.audios.tema, 'polimotor', 'tema de audio');
                igual(c.textos.introZoe, '¡El trenecito quiere viajar! Pon tu dedo sobre los puntos y deslízalo suavemente para construir las vías de color azul hasta la estación final.', 'audio de Zoe');
                igual(c.textos.guiaZeus, '¡Sigue los puntos de luz con tu dedo sin soltar el camino!', 'audio de Zeus');
                igual(c.textos.finalVoz, '¡EXCELENTE MAQUINISTA! Trazaste las vías rectas y el tren llegó a su destino.', 'cierre');
                igual(c.vias.map(function (v) { return v.estaciones; }).join(','), '2,3,4,4', 'estaciones por nivel');
                igual(c.vias.map(function (v) { return !!v.curvas; }).join(','), 'false,false,false,true', 'curvas solo en el nivel 4');
                c.vias.forEach(function (v, i) {
                    cierto(v.ancho >= 1.7, 'carril ancho para 3-4 años en el nivel ' + (i + 1));
                    cierto(v.cartel && v.cartel.titulo, 'cartel del nivel ' + (i + 1));
                });
                cierto(Array.isArray(c.textos.tramoLlego) && c.textos.tramoLlego.length > 0, 'voz al llegar a una estación intermedia');
            }
        },
        {
            descripcion: 'ruta: estaciones de izquierda a derecha, cada hueco largo (de hueco[0] a hueco[1]), la ruta sigue fuera de la pantalla',
            fn: function () {
                var c = config();
                rutas().forEach(function (r) {
                    var e = r.ruta.estaciones;
                    var que = 'nivel ' + r.nivel + ' semilla ' + r.semilla;
                    igual(e.length, r.def.estaciones, 'estaciones en ' + que);
                    igual(r.ruta.tramos.length, r.def.estaciones - 1, 'huecos en ' + que);
                    igual(e[0].x, c.ruta.x0, 'primera estación en ' + que);
                    for (var i = 1; i < e.length; i++) {
                        var dx = e[i].x - e[i - 1].x;
                        cierto(dx >= r.def.hueco[0] - 1e-6 && dx <= r.def.hueco[1] + 1e-6, 'hueco ' + i + ' entre ' + r.def.hueco.join(' y ') + ' en ' + que);
                        cierto(dx >= 18, 'hueco ' + i + ' largo (antes la vía más larga medía 13,9) en ' + que);
                        cierto(e[i].z >= c.ruta.zMin - 1e-6 && e[i].z <= c.ruta.zMax + 1e-6, 'estación ' + i + ' dentro de la franja en ' + que);
                    }
                    r.ruta.sEstaciones.forEach(function (s, k) { cierto(s > 0, 'estación ' + k + ' sobre el camino en ' + que); });
                });
            }
        },
        {
            descripcion: 'al azar: con otra semilla los huecos cambian de largo (niveles 2, 3 y 4)',
            fn: function () {
                var R = modulo(), c = config();
                [1, 2, 3].forEach(function (i) {
                    var vistos = {};
                    for (var sem = 1; sem <= 12; sem++) {
                        var r = R.generarRuta(c.vias[i], c.ruta, R.azarConSemilla(sem * 131));
                        vistos[r.estaciones.map(function (e) { return e.x.toFixed(1); }).join('|')] = true;
                    }
                    cierto(Object.keys(vistos).length >= 6, 'distancias distintas en el nivel ' + (i + 1));
                });
            }
        },
        {
            descripcion: 'niveles 1 y 2 en línea recta; nivel 3 con desnivel recto; nivel 4 con curvas que salen y llegan derechas',
            fn: function () {
                rutas().forEach(function (r) {
                    var que = 'nivel ' + r.nivel + ' semilla ' + r.semilla;
                    r.ruta.tramos.forEach(function (tr) {
                        if (r.nivel < 4) igual(tr.puntos.length, 2, 'tramo recto en ' + que);
                        else cierto(tr.puntos.length > 8, 'tramo curvo en ' + que);
                    });
                    if (r.nivel <= 2) cierto(r.ruta.estaciones.every(function (e) { return e.z === r.ruta.estaciones[0].z; }), 'todas a la misma altura en ' + que);
                    if (r.nivel === 4) {
                        r.ruta.tramos.forEach(function (tr) {
                            var p = tr.puntos;
                            var A = p[0], B = p[p.length - 1];
                            var flecha = 0;
                            p.forEach(function (q) {
                                var u = (q[0] - A[0]) / (B[0] - A[0]);
                                flecha = Math.max(flecha, Math.abs(q[1] - (A[1] + (B[1] - A[1]) * u)));
                            });
                            cierto(flecha >= 0.55, 'la curva se nota en ' + que);
                            // cerca de las estaciones (1,2 de cada lado) casi no se aparta: no pisa los andenes
                            p.forEach(function (q) {
                                var u = (q[0] - A[0]) / (B[0] - A[0]);
                                var d = Math.min(q[0] - A[0], B[0] - q[0]);
                                if (d < 1.2) cierto(Math.abs(q[1] - (A[1] + (B[1] - A[1]) * u)) < 0.35, 'sale derecha de la estación en ' + que);
                            });
                        });
                    }
                });
            }
        },
        {
            descripcion: 'un dedo que sigue los puntos construye cada hueco (recto o curvo) y llega con sus hitos',
            fn: function () {
                var R = modulo();
                tramos().forEach(function (x) {
                    var r = R.simular(x.t, 'centro', 4);
                    cierto(r.llego, 'llega en ' + x.nombre);
                    igual(r.estado.hitos, x.t.hitos.length, 'hitos en ' + x.nombre);
                    igual(r.eventos.indexOf('fuera'), -1, 'nunca sale en ' + x.nombre);
                    cierto(r.estado.recorrido >= x.t.largo - x.t.finTolerancia - 0.001, 'recorrido real en ' + x.nombre);
                });
            }
        },
        {
            descripcion: 'tolerancia infantil: un zigzag dentro del margen no detiene el trazo, también en las curvas',
            fn: function () {
                var R = modulo();
                tramos().forEach(function (x) {
                    var r = R.simular(x.t, 'desviado', 3.5);
                    cierto(r.llego, 'llega desviado en ' + x.nombre);
                    igual(r.eventos.indexOf('fuera'), -1, 'sin salirse en ' + x.nombre);
                    cierto(x.t.tolerancia > x.t.ancho / 2, 'el margen es mayor que medio carril');
                });
            }
        },
        {
            descripcion: 'no se puede saltar: tocar el inicio y llevar el dedo directo a la estación siguiente no construye nada',
            fn: function () {
                var R = modulo();
                tramos().forEach(function (x) {
                    var r = R.simular(x.t, 'salto');
                    cierto(!r.llego, 'no llega saltando en ' + x.nombre);
                    igual(r.maxS, 0, 'no avanza saltando en ' + x.nombre);
                    cierto(r.eventos.indexOf('fuera') >= 0, 'avisa en ' + x.nombre);
                });
            }
        },
        {
            descripcion: 'solo empieza en el punto de inicio: tocar fuera o la estación siguiente no engancha',
            fn: function () {
                var R = modulo();
                tramos().forEach(function (x) {
                    var t = x.t;
                    var est = R.nuevoEstado(t);
                    var fin = R.tocar(t, est, R.punto(t, t.largo));
                    cierto(!fin.ok, 'el destino no engancha en ' + x.nombre);
                    igual(fin.motivo, 'destino', 'motivo destino en ' + x.nombre);
                    var d = R.direccion(t, 0);
                    var lejos = R.tocar(t, est, { x: t.A.x + d.nx * 4, z: t.A.z + d.nz * 4 });
                    cierto(!lejos.ok, 'fuera no engancha en ' + x.nombre);
                    igual(est.estado, 'lista', 'sigue esperando en ' + x.nombre);
                    var ok = R.tocar(t, est, { x: t.A.x + 0.4, z: t.A.z + 0.3 });
                    cierto(ok.ok, 'el inicio engancha con margen en ' + x.nombre);
                    igual(ok.evento, 'inicio', 'evento inicio en ' + x.nombre);
                });
            }
        },
        {
            descripcion: 'sin teletransporte: la punta avanza como mucho velocidadMax por segundo',
            fn: function () {
                var R = modulo();
                var t = tramos()[0].t;
                var est = R.nuevoEstado(t);
                R.tocar(t, est, R.punto(t, 0));
                R.mover(t, est, R.punto(t, 2), 0.05);
                cierto(est.s <= t.velocidadMax * 0.05 + 1e-9, 'tope por cuadro');
                cierto(est.s > 0, 'avanza');
                // dt enorme (pestaña oculta): se recorta a 0,1 s
                var antes = est.s;
                R.mover(t, est, R.punto(t, antes + 2), 5);
                cierto(est.s - antes <= t.velocidadMax * 0.1 + 1e-9, 'dt recortado');
            }
        },
        {
            descripcion: 'desviarse detiene sin perder lo construido y al volver sigue (rectas y curvas)',
            fn: function () {
                var R = modulo();
                tramos().forEach(function (x) {
                    var r = R.simular(x.t, 'fuera', 4);
                    cierto(r.eventos.indexOf('fuera') >= 0, 'detecta la salida en ' + x.nombre);
                    cierto(r.eventos.indexOf('vuelve') >= 0, 'detecta la vuelta en ' + x.nombre);
                    cierto(r.llego, 'termina tras volver en ' + x.nombre);
                });
                var t = tramos()[0].t;
                var est = R.nuevoEstado(t);
                R.tocar(t, est, R.punto(t, 0));
                for (var k = 0; k < 60; k++) R.mover(t, est, R.punto(t, Math.min(t.largo / 2, k * 0.1)), 1 / 60);
                var s = est.s;
                var d = R.direccion(t, s);
                var ev = R.mover(t, est, { x: R.punto(t, s).x + d.nx * 5, z: R.punto(t, s).z + d.nz * 5 }, 1 / 60);
                igual(ev[0], 'fuera', 'evento fuera');
                igual(est.s, s, 'conserva el avance');
                R.mover(t, est, R.punto(t, s + 3), 1 / 60);
                igual(est.s, s, 'sin avanzar fuera');
            }
        },
        {
            descripcion: 'levantar el dedo conserva la vía y se retoma tocando la punta (no el inicio ni el final)',
            fn: function () {
                var R = modulo();
                tramos([3, 11]).forEach(function (x) {
                    var r = R.simular(x.t, 'soltar', 4);
                    cierto(r.eventos.indexOf('soltar') >= 0, 'suelta en ' + x.nombre);
                    cierto(r.eventos.indexOf('retoma') >= 0, 'retoma en ' + x.nombre);
                    cierto(r.llego, 'termina en ' + x.nombre);
                });
                var t = tramos()[0].t;
                var est = R.nuevoEstado(t);
                R.tocar(t, est, R.punto(t, 0));
                for (var k = 0; k < 120; k++) R.mover(t, est, R.punto(t, k * 0.06), 1 / 60);
                var s = est.s;
                cierto(R.soltar(est), 'soltar');
                igual(est.estado, 'pausa', 'en pausa');
                igual(est.s, s, 'la vía se queda');
                cierto(!R.tocar(t, est, R.punto(t, 0)).ok, 'el inicio ya no engancha lejos de la punta');
                cierto(!R.tocar(t, est, R.punto(t, t.largo)).ok, 'el final no engancha');
                var re = R.tocar(t, est, R.punto(t, s));
                cierto(re.ok, 'la punta engancha');
                igual(re.evento, 'retoma', 'evento retoma');
            }
        },
        {
            descripcion: 'la meta solo llega por el eje: tras la meta no se puede seguir tocando',
            fn: function () {
                var R = modulo();
                var lista = tramos([5]);
                var t = lista[lista.length - 1].t;
                var r = R.simular(t, 'centro', 5);
                cierto(r.llego, 'llega');
                igual(r.estado.s, t.largo, 's en el largo');
                cierto(!R.tocar(t, r.estado, R.punto(t, t.largo)).ok, 'después de la meta no engancha');
                igual(R.mover(t, r.estado, R.punto(t, 1), 0.1).length, 0, 'sin eventos tras la meta');
            }
        }
    ]
};
