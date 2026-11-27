'use strict';

/**
 * Reglas de "El Mini Golf Mágico de Pendiente y Obstáculos": cuatro recorridos válidos y alcanzables, el arrastre
 * decide dirección y fuerza, la pendiente cambia la velocidad, las aspas del molino y las paredes chocan de verdad,
 * el hoyo solo captura una pelota lenta y la trayectoria predictiva es el mismo recorrido que hace la pelota.
 */

var fs = require('fs');
var path = require('path');

var RAIZ = path.resolve(__dirname, '..', '..', '..');
var BASE = 'public/catalogo_juegos/Polimotor/MiniGolfMagico/';

function modulo() {
    var R = require(path.join(RAIZ, BASE, 'reglas.js'));
    if (!R || !R.prepararNivel) throw new Error('no se exportó ReglasGolf');
    return R;
}

function config() {
    return JSON.parse(fs.readFileSync(path.join(RAIZ, BASE, 'config.json'), 'utf8'));
}

function cierto(valor, que) {
    if (!valor) throw new Error(que + ': se esperaba un valor verdadero');
}

function cerca(a, b, tol, que) {
    if (Math.abs(a - b) > tol) throw new Error(que + ': ' + a + ' y ' + b + ' difieren más de ' + tol);
}

/** Campo plano y recto, sin hondonada (para medir la física sola). */
function campoPlano(R, j, extra) {
    var ronda = {
        id: 9,
        pista: { inicio: [-6, 0], rumbo: 0, ancho: 3, tramos: [{ recto: 14 }] },
        salida: { s: 1, lado: 0 },
        hoyo: { s: 13, lado: 1.2, r: 0.3 },
        pendientes: (extra && extra.pendientes) || []
    };
    var jj = Object.assign({}, j, { hondoHoyo: 0 });
    return { nv: R.prepararNivel(ronda, jj, R.azar(1)), j: jj };
}

/** Recorre un golpe con el paso real, como lo hace la escena. */
function rodar(R, nv, j, x, z, t0, ang, T) {
    var b = R.pelota(x, z);
    R.golpear(j, b, ang, T);
    var t = t0, ev = [];
    for (var i = 0; i < 6000 && !b.quieta && !b.enHoyo; i++) {
        R.paso(nv, j, b, t, ev);
        t += R.DT;
    }
    return { b: b, ev: ev };
}

module.exports = {
    nombre: 'El Mini Golf Mágico — reglas',
    casos: [
        {
            descripcion: 'cada nivel tiene al menos 3 mundos distintos y todos son válidos en 30 partidas al azar',
            fn: function () {
                var R = modulo(), cfg = config();
                cierto(cfg.rondas.length === 4, 'cuatro niveles');
                cfg.rondas.forEach(function (r, i) {
                    cierto(r.mundos && r.mundos.length >= 3, 'nivel ' + (i + 1) + ' con al menos 3 mundos');
                    var formas = {};
                    r.mundos.forEach(function (m, k) {
                        formas[JSON.stringify(m.pista)] = true;
                        cierto(m.nombre && cfg.temas[m.tema], 'mundo ' + (k + 1) + ' del nivel ' + (i + 1) + ' con nombre y colores');
                        if (i === 0) cierto(!m.molino || m.molino.decorativo, 'nivel 1 sin molino en el camino');
                        if (i === 1) cierto(m.molino && !m.molino.decorativo, 'nivel 2 con molino');
                        var molinos = (m.molinos || (m.molino ? [m.molino] : [])).filter(function (x) { return !x.decorativo; });
                        var obstaculos = molinos.length + (m.asteroides || []).length + (m.postes || []).length;
                        if (i === 2) cierto((m.asteroides || []).length >= 2 && m.pista.tramos.filter(function (t) { return t.curva; }).length >= 2 && obstaculos >= 4, 'nivel 3 largo con curvas, asteroides y pilares');
                        if (i === 3) cierto(molinos.length >= 2 && m.pista.tramos.filter(function (t) { return t.curva; }).length >= 2 && obstaculos >= 5, 'nivel 4 largo con dos molinos y más obstáculos');
                        for (var s = 1; s <= 30; s++) {
                            var nv = R.prepararNivel(r, cfg.juego, R.azar(s * 13 + k), { mundo: k });
                            cierto(nv.mundo === k, 'usa el mundo pedido');
                            var av = R.validarNivel(nv, cfg.juego);
                            if (av.length) throw new Error('semilla ' + s + ' nivel ' + (i + 1) + ' mundo ' + (k + 1) + ': ' + av.join(', '));
                        }
                    });
                    cierto(Object.keys(formas).length === r.mundos.length, 'nivel ' + (i + 1) + ': las pistas de los mundos son distintas');
                });
            }
        },
        {
            descripcion: 'todos los mundos son alcanzables (niveles 1-2 en uno o dos golpes; los largos 3-4 en varios)',
            fn: function () {
                var R = modulo(), cfg = config();
                cfg.rondas.forEach(function (r, i) {
                    r.mundos.forEach(function (m, k) {
                        var largo = i >= 2;
                        for (var s = 1; s <= (largo ? 1 : 2); s++) {
                            var nv = R.prepararNivel(r, cfg.juego, R.azar(700 + s * 31 + i * 7 + k), { mundo: k });
                            var res = R.resoluble(nv, cfg.juego, largo ? 6 : 2, { angulos: largo ? 36 : 48, tensiones: largo ? 10 : 12 });
                            cierto(res, 'nivel ' + (i + 1) + ' mundo ' + (k + 1) + ' alcanzable');
                            if (largo) cierto(res.golpes >= 2, 'el recorrido largo necesita más de un golpe');
                        }
                    });
                });
            }
        },
        {
            descripcion: 'los niveles 3 y 4 son largos (más de 20 m de pista) y la cámara los sigue',
            fn: function () {
                var R = modulo(), cfg = config();
                [2, 3].forEach(function (i) {
                    cierto(cfg.rondas[i].camara === 'seguir', 'nivel ' + (i + 1) + ' con cámara que sigue');
                    cfg.rondas[i].mundos.forEach(function (m, k) {
                        var nv = R.prepararNivel(cfg.rondas[i], cfg.juego, R.azar(k + 1), { mundo: k });
                        cierto(nv.pista.largo > 20, 'nivel ' + (i + 1) + ' mundo ' + (k + 1) + ' largo (' + nv.pista.largo.toFixed(1) + ')');
                        // la pista no se cruza ni se pega consigo misma
                        var c = nv.pista.centro, min = Infinity;
                        for (var a = 0; a < c.length; a++) for (var b = a + 1; b < c.length; b++) if (c[b].s - c[a].s > 7) min = Math.min(min, Math.hypot(c[a].x - c[b].x, c[a].z - c[b].z));
                        cierto(min > nv.pista.ancho + 0.8, 'carriles separados (' + min.toFixed(2) + ')');
                    });
                });
            }
        },
        {
            descripcion: 'el hoyo cambia de lugar en cada partida y el mundo no se repite con la partida anterior',
            fn: function () {
                var R = modulo(), cfg = config();
                cfg.rondas.forEach(function (r, i) {
                    r.mundos.forEach(function (m, k) {
                        var xs = [], zs = [], distintos = {};
                        for (var s = 1; s <= 20; s++) {
                            var h = R.prepararNivel(r, cfg.juego, R.azar(s * 97 + k), { mundo: k }).hoyo;
                            xs.push(h.x);
                            zs.push(h.z);
                            distintos[h.x.toFixed(2) + ',' + h.z.toFixed(2)] = true;
                        }
                        cierto(Object.keys(distintos).length >= 18, 'hoyos distintos en el nivel ' + (i + 1) + ' mundo ' + (k + 1));
                        var dx = Math.max.apply(null, xs) - Math.min.apply(null, xs), dz = Math.max.apply(null, zs) - Math.min.apply(null, zs);
                        cierto(Math.hypot(dx, dz) > 1.2, 'el hoyo recorre una zona amplia (' + Math.hypot(dx, dz).toFixed(2) + ')');
                    });
                    for (var s2 = 1; s2 <= 30; s2++) {
                        var antes = s2 % r.mundos.length;
                        cierto(R.elegirMundo(r, R.azar(s2), { evitar: antes }).idx !== antes, 'no repite el mundo anterior');
                    }
                });
            }
        },
        {
            descripcion: 'la pelota sale en la dirección contraria al arrastre y más fuerza la lleva más lejos (hasta un tope)',
            fn: function () {
                var R = modulo(), j = config().juego;
                var c = campoPlano(R, j);
                var s0 = c.nv.salida;
                // arrastrar hacia la izquierda y hacia abajo de la pantalla = golpe hacia la derecha y hacia arriba
                var arrastre = { x: -1, z: 0.4 };
                var ang = Math.atan2(-arrastre.z, -arrastre.x);
                var b = R.golpear(j, R.pelota(s0.x, s0.z), ang, 0.5);
                cierto(b.vx > 0 && b.vz < 0, 'sale hacia el lado opuesto al arrastre');
                var antes = -1;
                [0.1, 0.3, 0.5, 0.7].forEach(function (T) {
                    var r = rodar(R, c.nv, c.j, s0.x, s0.z, 0, 0, T);
                    cierto(r.b.x - s0.x > antes, 'más tensión, más distancia (T ' + T + ')');
                    antes = r.b.x - s0.x;
                });
                cerca(R.velocidadGolpe(j, 1.7), R.velocidadGolpe(j, 1), 1e-9, 'la fuerza no pasa del máximo');
                cierto(R.zona(0.2) === 'suave' && R.zona(0.6) === 'media' && R.zona(0.9) === 'potente', 'tres zonas de fuerza');
            }
        },
        {
            descripcion: 'la fricción la detiene poco a poco y la bajada la lleva más lejos que la subida',
            fn: function () {
                var R = modulo(), j = config().juego;
                var plano = campoPlano(R, j);
                var s0 = plano.nv.salida;
                var b = R.golpear(j, R.pelota(s0.x, s0.z), 0, 0.4), v0 = Math.hypot(b.vx, b.vz), prev = v0;
                for (var i = 0; i < 60; i++) {
                    R.paso(plano.nv, plano.j, b, i * R.DT, null);
                    var v = Math.hypot(b.vx, b.vz);
                    cierto(v <= prev + 1e-9, 'la velocidad no crece en plano');
                    prev = v;
                }
                var llano = rodar(R, plano.nv, plano.j, s0.x, s0.z, 0, 0, 0.35).b.x;
                var baja = campoPlano(R, j, { pendientes: [{ rampa: [1.5, 6], alto: -0.25 }] });
                var sube = campoPlano(R, j, { pendientes: [{ rampa: [1.5, 6], alto: 0.25 }] });
                var xb = rodar(R, baja.nv, baja.j, s0.x, s0.z, 0, 0, 0.35).b.x;
                var xs = rodar(R, sube.nv, sube.j, s0.x, s0.z, 0, 0, 0.35).b.x;
                cierto(xb > llano + 0.3 && llano > xs + 0.3, 'bajada ' + xb.toFixed(2) + ' > plano ' + llano.toFixed(2) + ' > subida ' + xs.toFixed(2));
                // en una bajada empinada la pelota acelera; en el llano vuelve a frenar
                var empinada = campoPlano(R, j, { pendientes: [{ rampa: [1.5, 3.5], alto: -0.3 }] });
                var bb = R.golpear(j, R.pelota(-3.6, 0), 0, 0.1);
                var v1 = Math.hypot(bb.vx, bb.vz);
                for (var k = 0; k < 40; k++) R.paso(empinada.nv, empinada.j, bb, k * R.DT, null);
                cierto(Math.hypot(bb.vx, bb.vz) > v1, 'acelera al bajar la pendiente');
                var vmax = 0;
                for (var q = 0; q < 3000 && !bb.quieta; q++) { R.paso(empinada.nv, empinada.j, bb, q * R.DT, null); vmax = Math.max(vmax, Math.hypot(bb.vx, bb.vz)); }
                cierto(bb.quieta && vmax <= j.velMaxima, 'termina deteniéndose y sin pasar la velocidad máxima');
            }
        },
        {
            descripcion: 'las paredes la devuelven sin dejarla pasar, ni siquiera a la velocidad máxima',
            fn: function () {
                var R = modulo(), j = config().juego;
                var c = campoPlano(R, j);
                var s0 = c.nv.salida;
                [Math.PI / 2, -Math.PI / 2, Math.PI, 0.4, -2.7].forEach(function (ang) {
                    var b = R.golpear(j, R.pelota(s0.x, s0.z), ang, 1);
                    for (var i = 0; i < 1500 && !b.quieta; i++) {
                        R.paso(c.nv, c.j, b, i * R.DT, null);
                        cierto(R.dentroPoligono(c.nv.borde, b.x, b.z), 'sigue dentro del campo');
                    }
                });
            }
        },
        {
            descripcion: 'la pared curva refleja según su normal (el ángulo de salida se parece al de entrada)',
            fn: function () {
                var R = modulo(), cfg = config(), j = cfg.juego;
                var nv = R.prepararNivel(cfg.rondas[2], j, R.azar(5));
                var curvas = nv.paredes.filter(function (w) { return w.tipo === 'curva'; });
                cierto(curvas.length > 5, 'hay pared curva');
                var w = curvas[Math.floor(curvas.length / 2)];
                var mx = (w.ax + w.bx) / 2, mz = (w.az + w.bz) / 2;
                var tx = w.bx - w.ax, tz = w.bz - w.az, tl = Math.hypot(tx, tz);
                var nx = tz / tl, nz = -tx / tl;
                if (!R.dentroPoligono(nv.borde, mx + nx * 0.5, mz + nz * 0.5)) { nx = -nx; nz = -nz; }
                // llega en diagonal hacia la pared desde adentro
                var vin = { x: -nx * 0.8 + tx / tl * 0.6, z: -nz * 0.8 + tz / tl * 0.6 };
                var b = R.pelota(mx + nx * 0.6 - vin.x * 0.1, mz + nz * 0.6 - vin.z * 0.1);
                b.quieta = false;
                b.vx = vin.x * 2.5;
                b.vz = vin.z * 2.5;
                var ev = [];
                for (var i = 0; i < 120 && !ev.some(function (e) { return e.tipo === 'rebote'; }); i++) R.paso(nv, j, b, 0, ev);
                var e = ev.filter(function (x) { return x.tipo === 'rebote'; })[0];
                cierto(e && e.clase === 'curva', 'rebota en la pared curva');
                var vn = b.vx * e.nx + b.vz * e.nz, vt = b.vx * tx / tl + b.vz * tz / tl;
                cierto(vn > 0, 'se aleja de la pared');
                cierto(vt > 0, 'conserva el sentido a lo largo de la pared');
            }
        },
        {
            descripcion: 'las aspas del molino chocan en el ángulo de ese instante y el espacio libre deja pasar',
            fn: function () {
                var R = modulo(), cfg = config(), j = cfg.juego;
                var nv = R.prepararNivel(cfg.rondas[1], j, R.azar(9));
                var m = nv.molino;
                var r = j.radio;
                var ug = R.bocaMolino(m);
                // la pelota sale por el centro hacia la boca en 40 instantes distintos del giro
                var pasan = 0, chocan = 0;
                for (var k = 0; k < 40; k++) {
                    var p = m.marco.aMundo(ug - 1.2, 0);
                    var b = R.pelota(p[0], p[1]);
                    b.quieta = false;
                    b.vx = m.marco.dx * 2.4;
                    b.vz = m.marco.dz * 2.4;
                    var ev = [], t = m.periodo * k / 40, choco = false;
                    for (var i = 0; i < 360 && !b.quieta; i++) {
                        R.paso(nv, j, b, t, ev);
                        while (ev.length) {
                            var e = ev.shift();
                            if (e.tipo === 'aspa') {
                                choco = true;
                                cierto(R.aspaEn(m, m.marco.aLocal(e.x, e.z).v, t, r) >= 0, 'el aspa estaba ahí en ese instante');
                                cierto(m.marco.aLocal(b.x, b.z).u < ug, 'el choque la deja delante del aspa');
                            }
                        }
                        t += R.DT;
                    }
                    var u = m.marco.aLocal(b.x, b.z).u;
                    if (choco) chocan++;
                    else if (u > m.D / 2) pasan++;
                }
                cierto(chocan > 0, 'a veces choca con un aspa (' + chocan + ')');
                cierto(pasan > chocan, 'el espacio libre deja pasar la mayoría de las veces (' + pasan + ' de 40)');
            }
        },
        {
            descripcion: 'el hoyo captura solo si llega despacio: pasar rápido por encima no cuenta',
            fn: function () {
                var R = modulo(), j = config().juego;
                var c = campoPlano(R, j);
                var h = c.nv.hoyo;
                var lento = R.pelota(h.x - 0.6, h.z);
                R.golpear(j, lento, 0, 0.02);
                lento.vx = 1.2;
                lento.vz = 0;
                var ev = [];
                for (var i = 0; i < 300 && !lento.enHoyo && !lento.quieta; i++) R.paso(c.nv, c.j, lento, 0, ev);
                cierto(lento.enHoyo, 'la pelota lenta entra');
                var rapida = R.pelota(h.x - 0.6, h.z);
                rapida.quieta = false;
                rapida.vx = 5;
                var ev2 = [];
                for (var k = 0; k < 40; k++) R.paso(c.nv, c.j, rapida, 0, ev2);
                cierto(!rapida.enHoyo, 'la rápida no entra');
                cierto(ev2.some(function (e) { return e.tipo === 'sobreHoyo'; }), 'se avisa que pasó por encima');
                var lejos = R.pelota(h.x - 0.6, h.z + 0.6);
                lejos.quieta = false;
                lejos.vx = 1.2;
                for (var q = 0; q < 200 && !lejos.quieta; q++) R.paso(c.nv, c.j, lejos, 0, null);
                cierto(!lejos.enHoyo, 'pasar cerca no completa el nivel');
            }
        },
        {
            descripcion: 'la trayectoria predictiva es el recorrido real (mismo modelo, con molino y rebotes)',
            fn: function () {
                var R = modulo(), cfg = config(), j = cfg.juego;
                [1, 2, 3].forEach(function (i) {
                    var nv = R.prepararNivel(cfg.rondas[i], j, R.azar(40 + i));
                    var s0 = nv.salida;
                    [[-0.6, 0.5], [-0.75, 0.8], [0.2, 0.65]].forEach(function (g) {
                        var t0 = 1.7;
                        var pred = R.simular(nv, j, s0, t0, g[0], g[1], {});
                        var real = rodar(R, nv, j, s0.x, s0.z, t0, g[0], g[1]).b;
                        cerca(pred.fin.x, real.x, 1e-9, 'fin x nivel ' + (i + 1));
                        cerca(pred.fin.z, real.z, 1e-9, 'fin z nivel ' + (i + 1));
                        cierto(pred.hoyo === real.enHoyo, 'misma llegada al hoyo');
                    });
                });
            }
        },
        {
            descripcion: 'la demostración pasa el molino, rebota en la pared curva y entra, con fuerza media',
            fn: function () {
                var R = modulo(), cfg = config(), j = cfg.juego;
                var nv = R.prepararNivel(cfg.demo, j, R.azar(7));
                var g = cfg.demo.golpe;
                nv.molino.fase = g.fase;
                var s = R.simular(nv, j, nv.salida, 0, g.angulo, g.tension, {});
                cierto(s.hoyo, 'entra');
                cierto(s.molino, 'pasa el molino');
                cierto(s.rebotes.some(function (r) { return r.clase === 'curva'; }), 'rebota en la pared curva');
                cierto(R.zona(g.tension) === 'media', 'fuerza media');
            }
        },
        {
            descripcion: 'fallar no castiga: siempre hay estrellas (1 a 3) según los golpes',
            fn: function () {
                var R = modulo();
                cierto(R.estrellas(1, 2) === 3 && R.estrellas(4, 2) === 2 && R.estrellas(30, 2) === 1, 'estrellas');
            }
        }
    ]
};
