'use strict';

var fs = require('fs');
var path = require('path');

var RAIZ = path.resolve(__dirname, '..', '..', '..');
var BASE = 'public/catalogo_juegos/Polimotor/RobotMecanicoConexiones/';

function modulo() {
    var R = cargarIIFE(BASE + 'reglas.js', 'ReglasRobot');
    if (!R) throw new Error('no se exportó ReglasRobot');
    return R;
}

function config() {
    return JSON.parse(fs.readFileSync(path.join(RAIZ, BASE, 'config.json'), 'utf8'));
}

/** Geometría del robot sin navegador (dibujos.js solo necesita `global`). */
function dibujos() {
    var D = cargarIIFE(BASE + 'dibujos.js', 'DibujosRobot');
    if (!D) throw new Error('no se exportó DibujosRobot');
    return D;
}

function igual(real, esperado, que) {
    if (real !== esperado) throw new Error(que + ': se esperaba ' + esperado + ' y llegó ' + real);
}

function cierto(valor, que) {
    if (!valor) throw new Error(que + ': se esperaba un valor verdadero');
}

/** mulberry32: sorteo reproducible y bien repartido desde la primera tirada. */
function rnd(seed) {
    var a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        var t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function soltar(id, rot, distancias, extra) {
    var e = extra || {};
    return {
        id: id,
        rot: rot,
        radio: 60,
        radioCasi: 150,
        requiere: e.requiere || null,
        destinos: Object.keys(distancias).map(function (k) {
            return { id: k, distancia: distancias[k], ocupado: !!(e.ocupados || {})[k], disponible: !(e.noDisponibles || {})[k] };
        })
    };
}

module.exports = {
    nombre: 'El Robot Mecánico y sus Conexiones — reglas',
    casos: [
        {
            descripcion: 'el config.json es válido y tiene exactamente cuatro niveles',
            fn: function () {
                var R = modulo();
                var errores = R.validar(config());
                igual(errores.length, 0, 'errores: ' + errores.join(' | '));
                igual(R.niveles(config()).length, 4, 'niveles');
            }
        },
        {
            descripcion: 'inventario de cada nivel: 4, 5, 9 y 11 piezas, sin repetidas',
            fn: function () {
                var R = modulo(), cfg = config();
                [4, 5, 9, 11].forEach(function (n, i) {
                    var ids = R.piezasNivel(cfg, i).map(function (p) { return p.id; });
                    igual(ids.length, n, 'nivel ' + (i + 1));
                    igual(Object.keys(ids.reduce(function (o, id) { o[id] = 1; return o; }, {})).length, n, 'sin repetidas en nivel ' + (i + 1));
                });
                var n1 = R.piezasNivel(cfg, 0).map(function (p) { return p.id; }).sort().join();
                igual(n1, 'brazo-der,brazo-izq,pierna-der,pierna-izq', 'nivel 1 solo extremidades');
                var n4 = R.piezasNivel(cfg, 3).map(function (p) { return p.id; });
                cierto(n4.indexOf('antena') >= 0 && n4.indexOf('modulo') >= 0, 'nivel 4 con antena y módulo');
            }
        },
        {
            descripcion: 'cada pieza tiene dibujo y ranura en el robot (ninguna pieza sin ranura)',
            fn: function () {
                var R = modulo(), D = dibujos();
                R.TIPOS.forEach(function (id) {
                    cierto(D.GEOM[id], 'geometría de ' + id);
                    var c = D.centro(id);
                    cierto(isFinite(c.x) && isFinite(c.y), 'centro de ' + id);
                });
                // pares izquierda/derecha reflejados
                var bi = D.centro('brazo-izq'), bd = D.centro('brazo-der');
                igual(bi.x, -bd.x, 'brazos reflejados');
                igual(bi.y, bd.y, 'brazos a la misma altura');
                // la mano cuelga del final de su brazo y el pie de su pierna
                cierto(D.centro('mano-izq').y > D.centro('brazo-izq').y + 60, 'mano debajo del brazo');
                cierto(D.centro('pie-der').y > D.centro('pierna-der').y + 60, 'pie debajo de la pierna');
                cierto(D.centro('antena').y < D.centro('cabeza').y - 60, 'antena encima de la cabeza');
            }
        },
        {
            descripcion: 'dependencias: mano→brazo, pie→pierna, antena y módulo→cabeza; solo si la madre está en el nivel',
            fn: function () {
                var R = modulo(), cfg = config();
                var n3 = R.piezasNivel(cfg, 2);
                var dep = {};
                n3.forEach(function (p) { dep[p.id] = p.depende; });
                igual(dep['mano-izq'], 'brazo-izq', 'mano izquierda');
                igual(dep['pie-der'], 'pierna-der', 'pie derecho');
                igual(dep['cabeza'], null, 'la cabeza no depende');
                var n4 = R.piezasNivel(cfg, 3);
                n4.forEach(function (p) { dep[p.id] = p.depende; });
                igual(dep['antena'], 'cabeza', 'antena');
                igual(dep['modulo'], 'cabeza', 'módulo');
                igual(R.bloqueadas(n3, {}).sort().join(), 'mano-der,mano-izq,pie-der,pie-izq', 'bloqueadas al empezar el nivel 3');
                igual(R.bloqueadas(n3, { 'brazo-izq': true }).indexOf('mano-izq'), -1, 'la mano se libera con su brazo');
                igual(R.bloqueadas(R.piezasNivel(cfg, 0), {}).length, 0, 'en el nivel 1 nada está bloqueado');
            }
        },
        {
            descripcion: 'evaluar: pieza correcta, derecha y cerca de su ranura → correcto',
            fn: function () {
                var R = modulo();
                var r = R.evaluar(soltar('brazo-izq', 0, { 'brazo-izq': 30, 'brazo-der': 236 }));
                cierto(r.acierto, 'acierto');
                igual(r.destino, 'brazo-izq', 'destino');
            }
        },
        {
            descripcion: 'evaluar: pieza correcta pero girada → orientacion (no encaja)',
            fn: function () {
                var R = modulo();
                [90, 180, 270, -90].forEach(function (g) {
                    var r = R.evaluar(soltar('cabeza', g, { cabeza: 10 }));
                    igual(r.acierto, false, 'giro ' + g);
                    igual(r.motivo, 'orientacion', 'motivo con ' + g);
                });
                cierto(R.evaluar(soltar('cabeza', 360, { cabeza: 10 })).acierto, '360 equivale a derecha');
            }
        },
        {
            descripcion: 'evaluar: otra ranura, ocupada, casi, fuera y dependencia',
            fn: function () {
                var R = modulo();
                igual(R.evaluar(soltar('pierna-der', 0, { 'pierna-izq': 20, 'pierna-der': 104 })).motivo, 'otraPieza', 'otra ranura');
                igual(R.evaluar(soltar('pierna-der', 0, { 'pierna-der': 20 }, { ocupados: { 'pierna-der': 1 } })).motivo, 'ocupado', 'ocupada');
                igual(R.evaluar(soltar('pierna-der', 0, { 'pierna-der': 110 })).motivo, 'casi', 'casi');
                igual(R.evaluar(soltar('pierna-der', 0, { 'pierna-der': 400 })).motivo, 'fuera', 'fuera');
                var d = R.evaluar(soltar('mano-izq', 0, { 'mano-izq': 15 }, { noDisponibles: { 'mano-izq': 1 }, requiere: 'brazo-izq' }));
                igual(d.motivo, 'dependencia', 'dependencia');
                igual(d.requiere, 'brazo-izq', 'pieza que falta');
            }
        },
        {
            descripcion: 'la ranura propia tiene prioridad aunque otra quede un poco más cerca',
            fn: function () {
                var R = modulo();
                var r = R.evaluar(soltar('pierna-izq', 0, { 'pierna-izq': 55, 'pierna-der': 50 }));
                cierto(r.acierto, 'premia apuntar bien');
            }
        },
        {
            descripcion: 'el imán solo atrae a la pieza derecha y disponible, y nunca la encaja sola',
            fn: function () {
                var R = modulo();
                igual(R.iman(10, 100, 0.32, false, true), 0, 'girada: sin imán');
                igual(R.iman(10, 100, 0.32, true, false), 0, 'bloqueada: sin imán');
                igual(R.iman(150, 100, 0.32, true, true), 0, 'lejos: sin imán');
                var f = R.iman(1, 100, 0.9, true, true);
                cierto(f > 0 && f <= 0.6, 'tope 0.6: ' + f);
            }
        },
        {
            descripcion: 'girar de 90 en 90 y enderezar por el camino corto',
            fn: function () {
                var R = modulo();
                igual(R.girar(0, 1, 90), 90, 'derecha');
                igual(R.girar(0, -1, 90), 270, 'izquierda');
                igual(R.girar(270, 1, 90), 0, 'vuelta completa');
                igual(R.pasosParaEnderezar(90, 90), -1, '90 → un paso a la izquierda');
                igual(R.pasosParaEnderezar(270, 90), 1, '270 → un paso a la derecha');
                igual(Math.abs(R.pasosParaEnderezar(180, 90)), 2, '180 → dos pasos');
            }
        },
        {
            descripcion: 'orientaciones iniciales: nivel 1 sin giros; los demás giran la cantidad pedida, con prioridad',
            fn: function () {
                var R = modulo(), cfg = config();
                [0, 1, 2, 3].forEach(function (i) {
                    var n = R.nivel(cfg, i);
                    for (var s = 1; s <= 30; s++) {
                        var o = R.orientaciones(R.piezasNivel(cfg, i), n, cfg.juego.giros, rnd(s * 7 + i));
                        var giradas = Object.keys(o).filter(function (k) { return o[k] !== 0; });
                        igual(giradas.length, n.rotadas | 0, 'nivel ' + (i + 1) + ' semilla ' + s);
                        giradas.forEach(function (k) { cierto([90, 180, 270].indexOf(o[k]) >= 0, 'giro válido'); });
                        (n.rotarPrimero || []).forEach(function (k) { cierto(o[k] !== 0, k + ' siempre llega girada en el nivel ' + (i + 1)); });
                    }
                });
            }
        },
        {
            descripcion: 'reparto de la bandeja: un compartimento por pieza, sin choques, y cambia entre partidas',
            fn: function () {
                var R = modulo(), cfg = config();
                var ids = R.piezasNivel(cfg, 3).map(function (p) { return p.id; });
                var vistos = {};
                for (var s = 1; s <= 20; s++) {
                    var rep = R.repartir(ids, 12, rnd(s));
                    var usados = ids.map(function (id) { return rep[id]; });
                    igual(Object.keys(usados.reduce(function (o, h) { o[h] = 1; return o; }, {})).length, ids.length, 'sin compartimentos repetidos');
                    usados.forEach(function (h) { cierto(h >= 0 && h < 12, 'compartimento existe'); });
                    vistos[usados.join(',')] = 1;
                }
                cierto(Object.keys(vistos).length > 10, 'el reparto varía');
            }
        },
        {
            descripcion: 'variante sorteada: tipo de robot (clásico o explorador) y apariencia, siempre de las listas y renovada entre partidas',
            fn: function () {
                var R = modulo(), cfg = config(), v = cfg.variantes;
                var colores = {}, tipos = {};
                for (var s = 1; s <= 40; s++) {
                    var x = R.sortearVariante(cfg, rnd(s * 13));
                    cierto(v.tipos.some(function (t) { return t.id === x.tipo; }), 'tipo de robot definido');
                    cierto(x.tipoSaludo.length > 0, 'Zoe puede presentar el tipo');
                    tipos[x.tipo] = 1;
                    cierto(v.colores.some(function (c) { return c.id === x.color.id; }), 'color definido');
                    cierto(v.cabezas.indexOf(x.cabeza) >= 0, 'cabeza definida');
                    cierto(v.viseras.indexOf(x.visera) >= 0, 'visera definida');
                    cierto(v.manos.indexOf(x.mano) >= 0 && v.pies.indexOf(x.pie) >= 0, 'manos y pies definidos');
                    cierto(v.antenas.indexOf(x.antena) >= 0 && v.modulos.indexOf(x.modulo) >= 0, 'antena y módulo definidos');
                    cierto(v.paisajes.indexOf(x.paisaje) >= 0, 'paisaje definido');
                    colores[x.color.id] = 1;
                }
                cierto(Object.keys(colores).length >= 3, 'los colores cambian');
                igual(Object.keys(tipos).sort().join(), 'clasico,explorador', 'salen los dos tipos de robot');
            }
        },
        {
            descripcion: 'grupos: brazo + mano y cabeza + antena se completan juntos',
            fn: function () {
                var R = modulo(), cfg = config();
                var l3 = R.piezasNivel(cfg, 2);
                igual(R.grupoCompletado('brazo-izq', { 'brazo-izq': true }, l3), null, 'falta la mano');
                igual(R.grupoCompletado('mano-izq', { 'brazo-izq': true, 'mano-izq': true }, l3), 'brazo-izq', 'brazo completo');
                var l2 = R.piezasNivel(cfg, 1);
                igual(R.grupoCompletado('brazo-izq', { 'brazo-izq': true }, l2), 'brazo-izq', 'sin manos el brazo solo completa');
                var l4 = R.piezasNivel(cfg, 3);
                igual(R.grupoCompletado('cabeza', { cabeza: true }, l4), null, 'en el nivel 4 falta la antena');
                igual(R.grupoCompletado('antena', { cabeza: true, antena: true }, l4), 'cabeza', 'cabeza completa');
                cierto(R.completo({ a: 1, b: 1 }, ['a', 'b']) && !R.completo({ a: 1 }, ['a', 'b']), 'completo');
            }
        },
        {
            descripcion: 'cada nivel se puede resolver: siempre hay una pieza libre hasta terminar',
            fn: function () {
                var R = modulo(), cfg = config();
                [0, 1, 2, 3].forEach(function (i) {
                    var lista = R.piezasNivel(cfg, i);
                    var colocadas = {};
                    var vueltas = 0;
                    while (!R.completo(colocadas, lista) && vueltas++ < 20) {
                        var libres = lista.filter(function (p) { return !colocadas[p.id] && R.disponible(p, colocadas); });
                        cierto(libres.length > 0, 'nivel ' + (i + 1) + ' sin piezas libres');
                        colocadas[libres[libres.length - 1].id] = true;
                    }
                    cierto(R.completo(colocadas, lista), 'nivel ' + (i + 1) + ' completo');
                });
            }
        }
    ]
};
