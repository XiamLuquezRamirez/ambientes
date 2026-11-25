'use strict';

/**
 * Reglas de "El Cañón Láser y los Meteoritos en Movimiento": cuatro niveles (3, 4, 5 y 6 meteoritos) alcanzables,
 * cañón con límites, la línea de mira es el recorrido real del proyectil, colisión barrida sobre posiciones
 * actualizadas (un meteorito en movimiento puede escaparse) y fallar no resta nada.
 */

var fs = require('fs');
var path = require('path');

var RAIZ = path.resolve(__dirname, '..', '..', '..');
var BASE = 'public/catalogo_juegos/Polimotor/CanonLaserMeteoritos/';

function modulo() {
    var R = require(path.join(RAIZ, BASE, 'reglas.js'));
    if (!R || !R.prepararNivel) throw new Error('no se exportó ReglasCanon');
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

/** Simula un disparo contra un meteorito en una pasada: devuelve el impacto o null. */
function simular(R, nv, m, tDisparo, angulo) {
    var p = R.disparar(nv.canon, angulo, nv.velProyectil);
    var t = tDisparo;
    for (var k = 0; k < 200 && p.vivo; k++) {
        R.moverProyectil(p, 16);
        t += 16;
        var pos = R.posicionPasada(m, t);
        var hit = R.impacto(p, [{ id: m.id, x: pos.x, y: pos.y, radio: m.radio, activo: true }], nv.tolerancia, 13);
        if (hit) return hit;
    }
    return null;
}

module.exports = {
    nombre: 'El Cañón Láser y los Meteoritos — reglas',
    casos: [
        {
            descripcion: 'cuatro niveles con 5, 7, 9 y 11 meteoritos, tamaños al azar y coraza, válidos en 200 partidas al azar',
            fn: function () {
                var R = modulo(), cfg = config();
                igual(cfg.rondas.length, 4, 'niveles');
                for (var s = 1; s <= 200; s++) {
                    niveles(R, cfg, s).forEach(function (nv, i) {
                        igual(nv.meteoritos.length, [5, 7, 9, 11][i], 'meteoritos del nivel ' + (i + 1));
                        var rg = R.rangoTamano(cfg.rondas[i]);
                        cierto(nv.meteoritos.every(function (m) { return m.radio >= rg[0] && m.radio <= rg[1]; }), 'tamaños dentro del rango');
                        igual(nv.meteoritos.filter(function (m) { return m.golpes === 2; }).length, cfg.rondas[i].resistentes, 'con coraza en el nivel ' + (i + 1));
                        igual(nv.meteoritos[0].golpes, 1, 'el primero nunca tiene coraza');
                        var avisos = R.validarNivel(nv);
                        if (avisos.length) throw new Error('semilla ' + s + ' nivel ' + (i + 1) + ': ' + avisos.join(', '));
                    });
                    // el nivel 1 es todo dorado y de uno en uno
                    var n1 = niveles(R, cfg, s)[0];
                    cierto(n1.meteoritos.every(function (m) { return m.tipo === 'dorado'; }), 'nivel 1 dorado');
                    igual(n1.simultaneos, 1, 'nivel 1 de uno en uno');
                }
            }
        },
        {
            descripcion: 'la dificultad sube: más velocidad, menos tolerancia y mira más tenue, sin achicar demasiado',
            fn: function () {
                var r = config().rondas;
                for (var i = 1; i < r.length; i++) {
                    cierto(r[i].velMax > r[i - 1].velMax, 'velocidad sube en ' + (i + 1));
                    cierto(r[i].tolerancia < r[i - 1].tolerancia, 'tolerancia baja en ' + (i + 1));
                    cierto(r[i].miraAlfa < r[i - 1].miraAlfa, 'mira más tenue en ' + (i + 1));
                    cierto(Math.min.apply(null, r[i].tamanos) >= 44, 'nunca blancos diminutos');
                }
            }
        },
        {
            descripcion: 'el cañón respeta sus límites y nunca apunta hacia abajo',
            fn: function () {
                var R = modulo(), c = R.canon(config().juego);
                [-3, -1.5, -1, 0, 0.7, 1.4, 3].forEach(function (a) {
                    var l = R.limitarAngulo(a, c);
                    cierto(Math.abs(l) <= c.limite + 1e-9, 'dentro del límite');
                    cierto(R.boca(c, l).y < c.y, 'la boca queda por encima del pivote');
                });
                igual(R.limitarAngulo(NaN, c), 0, 'ángulo inválido = recto');
            }
        },
        {
            descripcion: 'la línea de mira es el recorrido real: el proyectil sale de la boca y pasa por ella',
            fn: function () {
                var R = modulo(), c = R.canon(config().juego);
                [-1.1, -0.4, 0, 0.3, 1.2].forEach(function (a) {
                    var l = R.lineaMira(c, a), b = R.boca(c, a);
                    cierto(Math.abs(l.x0 - b.x) < 1e-9 && Math.abs(l.y0 - b.y) < 1e-9, 'la mira empieza en la boca');
                    var p = R.disparar(c, a, 1200);
                    igual(p.x, b.x, 'sale de la boca (x)');
                    for (var k = 0; k < 40 && p.vivo; k++) {
                        R.moverProyectil(p, 16);
                        var q = R.distSegmento(l.x0, l.y0, l.x1, l.y1, p.x, p.y);
                        if (p.vivo) cierto(q.d < 0.5, 'el proyectil va sobre la mira');
                    }
                });
            }
        },
        {
            descripcion: 'apuntar con anticipación acierta; apuntar a donde está ahora puede fallar en el nivel 4',
            fn: function () {
                var R = modulo(), cfg = config();
                var nv = niveles(R, cfg, 11)[3];
                var m = { id: 'x', radio: 44, carril: 360 };
                R.nuevaPasada(m, 1, { velMin: 140, velMax: 140, diagonal: 0, vaiven: 0 }, R.azar(3));
                var t = 3200;                                    // en la zona visible, a la izquierda
                var pos = R.posicionPasada(m, t), vel = R.velocidadPasada(m, t);
                var aLead = R.anguloIntercepcion(nv.canon, nv.velProyectil, pos, vel);
                cierto(simular(R, nv, m, t, aLead), 'la anticipación acierta');
                // tolerancia estricta para ver la diferencia: sin anticipar, el meteorito se escapa
                var estricto = { canon: nv.canon, velProyectil: nv.velProyectil, tolerancia: 0.4 };
                var aAhora = R.anguloHacia(nv.canon, pos.x, pos.y);
                cierto(!simular(R, estricto, m, t, aAhora), 'sin anticipar se escapa');
                cierto(simular(R, estricto, m, t, aLead), 'anticipando sí');
            }
        },
        {
            descripcion: 'fallar no resta puntos; acertar suma (dorado más, bonus por precisión) y el nivel se completa',
            fn: function () {
                var R = modulo(), cfg = config();
                var mk = R.crearMarcador({ meteoritos: [1, 2, 3, 4] });
                R.registrar(mk, null, cfg.juego);
                R.registrar(mk, null, cfg.juego);
                igual(mk.puntos, 0, 'sin puntos negativos');
                igual(mk.fallosSeguidos, 2, 'fallos seguidos');
                var dor = { puntos: 100 }, otro = { puntos: 50 }, dor2 = { puntos: 100 };
                igual(R.registrar(mk, { meteorito: dor, preciso: true }, cfg.juego), 120, 'dorado preciso');
                igual(mk.fallosSeguidos, 0, 'se reinicia');
                R.registrar(mk, { meteorito: otro, preciso: false }, cfg.juego);
                R.registrar(mk, { meteorito: { puntos: 50 } }, cfg.juego);
                igual(mk.completo, false, 'aún falta');
                R.registrar(mk, { meteorito: dor2 }, cfg.juego);
                igual(mk.completo, true, 'completo');
                igual(mk.puntos, 320, 'puntos');
            }
        },
        {
            descripcion: 'un meteorito con coraza necesita dos aciertos: el primero rompe la coraza y no completa',
            fn: function () {
                var R = modulo(), cfg = config();
                var nv = niveles(R, cfg, 9)[0];
                var mk = R.crearMarcador(nv);
                var duro = { puntos: 150, golpes: 2 };
                var r1 = { meteorito: duro };
                igual(R.registrar(mk, r1, cfg.juego), 10, 'puntitos por romper la coraza');
                igual(r1.parcial, true, 'primer golpe parcial');
                igual(mk.hechos, 0, 'no cuenta como destruido');
                var r2 = { meteorito: duro, preciso: false };
                igual(R.registrar(mk, r2, cfg.juego), 150, 'segundo golpe lo destruye');
                igual(r2.parcial, false, 'destruido');
                igual(mk.hechos, 1, 'ahora sí cuenta');
                // los tamaños varían de verdad
                var radios = {};
                niveles(R, cfg, 3)[3].meteoritos.forEach(function (m) { radios[m.radio] = 1; });
                cierto(Object.keys(radios).length >= 4, 'tamaños distintos');
            }
        },
        {
            descripcion: 'cada meteorito vuela con velocidad variable: acelera y frena suave, nunca se detiene, y difieren entre sí',
            fn: function () {
                var R = modulo(), cfg = config();
                cfg.rondas.forEach(function (r, i) {
                    var rnd = R.azar(40 + i), bases = {};
                    for (var k = 0; k < 6; k++) {
                        var m = { carril: r.carriles[0] };
                        R.nuevaPasada(m, k % 2 ? 1 : -1, r, rnd);
                        bases[Math.round(m.vel)] = 1;
                        var vmin = Infinity, vmax = 0, prev = null;
                        for (var t = 0; t < 9000; t += 100) {
                            var v = Math.abs(R.velocidadPasada(m, t).x);
                            vmin = Math.min(vmin, v);
                            vmax = Math.max(vmax, v);
                            if (prev != null) cierto(Math.abs(v - prev) < m.vel * 0.25, 'sin tirones');
                            prev = v;
                        }
                        cierto(vmin > 0.4 * m.vel, 'nunca se detiene');
                        cierto(vmax / vmin > 1.25, 'la velocidad cambia de verdad en el nivel ' + (i + 1));
                        cierto(vmax <= r.velMax * (1 + r.variacionVel[1]) + 1, 'sin pasar el tope');
                    }
                    cierto(Object.keys(bases).length >= 4, 'cada meteorito con su propia velocidad');
                });
            }
        },
        {
            descripcion: 'consejos amables según el fallo y asistencia con tope',
            fn: function () {
                var R = modulo();
                igual(R.consejo({ relacion: 'detras', anguloDisparo: 0.2, anguloMeteorito: 0.3 }), 'anticipa', 'detrás');
                igual(R.consejo({ relacion: 'delante', anguloDisparo: 0.4, anguloMeteorito: 0.3 }), 'espera', 'delante');
                igual(R.consejo({ relacion: '', anguloDisparo: 0.8, anguloMeteorito: 0.4 }), 'arriba', 'más arriba');
                igual(R.consejo({ relacion: '', anguloDisparo: -0.1, anguloMeteorito: -0.6 }), 'izquierda', 'izquierda');
                igual(R.consejo({ relacion: '', anguloDisparo: 0.1, anguloMeteorito: 0.7 }), 'derecha', 'derecha');
                igual(R.consejo(null), 'general', 'sin datos');
                igual(R.toleranciaConAyuda(1, 0, 3), 1, 'sin ayuda');
                cierto(R.toleranciaConAyuda(1, 3, 3) > 1, 'crece tras 3 fallos');
                igual(R.toleranciaConAyuda(1, 20, 3), 1.3, 'tope +30 %');
            }
        }
    ]
};
