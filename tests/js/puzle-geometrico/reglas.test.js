'use strict';

var fs = require('fs');
var path = require('path');

var RAIZ = path.resolve(__dirname, '..', '..', '..');
var BASE = 'public/catalogo_juegos/Polimotor/PuzleGeometrico3D/';

function R() {
    var r = cargarIIFE(BASE + 'reglas.js', 'ReglasPuzle');
    if (!r) throw new Error('no se exportó ReglasPuzle');
    return r;
}

function S() {
    var s = cargarIIFE(BASE + 'solidos.js', 'SolidosPuzle');
    if (!s) throw new Error('no se exportó SolidosPuzle');
    return s;
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

/** mulberry32: sorteo reproducible. */
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

/** Destinos como los arma la escena: distancia d a `cerca` y lejos al resto. */
function destinos(lista, colocadas, cerca, d) {
    var r = R();
    return lista.map(function (p) {
        return { id: p.id, forma: p.forma, orient: p.orient, distancia: p.id === cerca ? d : 900, ocupado: !!colocadas[p.id], habilitada: r.habilitada(p, lista, colocadas) };
    });
}

module.exports = {
    nombre: 'El Puzle Geométrico 3D — reglas',
    casos: [
        {
            descripcion: 'config.json es válido: 16 construcciones, 4 de cada grado (5, 6, 9 y 11 piezas)',
            fn: function () {
                var cfg = config();
                var errores = R().validar(cfg);
                igual(errores.length, 0, 'errores: ' + errores.join(' | '));
                var ns = R().niveles(cfg);
                igual(ns.length, 16, 'construcciones');
                [1, 2, 3, 4].forEach(function (g) {
                    igual(ns.filter(function (n) { return n.grado === g; }).length, 4, 'construcciones de grado ' + g);
                });
                igual(new Set(ns.map(function (n) { return n.clave; })).size, 16, 'claves distintas');
                igual(ns.slice(0, 4).map(function (n) { return n.piezas.length; }).join(','), '5,6,9,11', 'piezas de las 4 originales');
            }
        },
        {
            descripcion: 'cada partida elige 4 al azar, una de cada grado y subiendo de dificultad',
            fn: function () {
                var cfg = config();
                var vistas = {};
                for (var s = 1; s <= 200; s++) {
                    var el = R().elegirNiveles(cfg, rnd(s));
                    igual(el.map(function (n) { return n.grado; }).join(','), '1,2,3,4', 'grados en orden');
                    el.forEach(function (n) { vistas[n.clave] = true; });
                }
                igual(Object.keys(vistas).length, 16, 'con el tiempo salen las 16');
                var a = R().elegirNiveles(cfg, rnd(5));
                var claves = a.map(function (n) { return n.clave; });
                for (var t = 1; t <= 30; t++) {
                    var b = R().elegirNiveles(cfg, rnd(t), claves);
                    b.forEach(function (n) { cierto(claves.indexOf(n.clave) < 0, 'no repite ' + n.clave + ' de la partida anterior'); });
                }
            }
        },
        {
            descripcion: 'las 16 construcciones se generan válidas (300 sorteos cada una)',
            fn: function () {
                var cfg = config();
                R().niveles(cfg).forEach(function (n) {
                    for (var s = 1; s <= 300; s++) {
                        var o = R().generarNivel(n, rnd(s));
                        cierto(o, n.clave + ' semilla ' + s);
                        igual(o.piezas.length, R().PIEZAS_GRADO[n.grado - 1], 'piezas de ' + n.clave);
                    }
                });
            }
        },
        {
            descripcion: 'los cuatro niveles son construcciones distintas y la dificultad crece',
            fn: function () {
                var cfg = config();
                var ns = R().niveles(cfg).slice(0, 4);
                var claves = ns.map(function (n) { return n.clave; });
                igual(claves.join(','), 'piramide,torre,castillo,templo', 'las 4 originales encabezan el catálogo');
                cierto(R().niveles(cfg).every(function (n) { return n.grado === 1 ? !n.giro : n.giro && n.rotadas >= n.grado - 1; }), 'el grado 1 no pide giros y los demás sí');
                igual(ns[0].giro, false, 'el nivel 1 no pide giros');
                cierto(ns[1].giro && ns[2].giro && ns[3].giro, 'los niveles 2-4 tienen giro');
                var tipos = ns.map(function (n) {
                    var t = {};
                    n.piezas.forEach(function (p) { t[cfg.formas[p.forma].tipo] = true; });
                    return Object.keys(t).length;
                });
                cierto(tipos[3] >= tipos[0], 'el templo usa al menos tantos sólidos como la pirámide');
                cierto(ns[2].piezas.some(function (p) { return cfg.formas[p.forma].tipo === 'cilindro'; }), 'el castillo tiene cilindros');
                cierto(ns[2].piezas.some(function (p) { return cfg.formas[p.forma].tipo === 'prisma'; }), 'el castillo tiene prismas triangulares');
            }
        },
        {
            descripcion: 'cada construcción se completa colocando de abajo hacia arriba con cualquier alternativa',
            fn: function () {
                var cfg = config();
                for (var semilla = 1; semilla <= 30; semilla++) {
                    var v = R().sortearVariante(cfg, rnd(semilla));
                    for (var i = 0; i < 4; i++) {
                        var lista = R().piezasNivel(cfg, i, v);
                        var col = {};
                        var pasos = 0;
                        while (!R().completo(col, lista) && pasos++ < 20) {
                            var hab = R().habilitadas(lista, col);
                            cierto(hab.length > 0, 'nivel ' + (i + 1) + ' sin posiciones habilitadas');
                            hab.forEach(function (p) { cierto(!lista.some(function (q) { return q.capa < p.capa && !col[q.id]; }), 'capa inferior incompleta'); });
                            col[hab[0].id] = true;
                        }
                        cierto(R().completo(col, lista), 'nivel ' + (i + 1) + ' completo');
                    }
                }
            }
        },
        {
            descripcion: 'orden de capas: la cúspide no se puede poner antes de los cimientos',
            fn: function () {
                var cfg = config();
                var lista = R().piezasNivel(cfg, 0, null);
                var cusp = lista.filter(function (p) { return p.id === 'cuspide'; })[0];
                var res = R().evaluar({ forma: cusp.forma, def: cusp.def, rot: 0, destinos: destinos(lista, {}, 'cuspide', 10), radio: 70, radioCasi: 160 });
                igual(res.motivo, 'orden', 'motivo');
                igual(res.acierto, false, 'acierto');
                var base = lista[0];
                var ok = R().evaluar({ forma: base.forma, def: base.def, rot: 0, destinos: destinos(lista, {}, 'base', 10), radio: 70, radioCasi: 160 });
                igual(ok.motivo, 'correcto', 'la base sí');
            }
        },
        {
            descripcion: 'forma incompatible, ocupado, casi y fuera',
            fn: function () {
                var cfg = config();
                var lista = R().piezasNivel(cfg, 0, null);
                var cubo = lista.filter(function (p) { return p.id === 'superior'; })[0];
                igual(R().evaluar({ forma: cubo.forma, def: cubo.def, rot: 0, destinos: destinos(lista, {}, 'base', 20), radio: 70, radioCasi: 160 }).motivo, 'otraForma', 'cubo en la base');
                var col = { base: true };
                var base = lista[0];
                igual(R().evaluar({ forma: base.forma, def: base.def, rot: 0, destinos: destinos(lista, col, 'base', 20), radio: 70, radioCasi: 160 }).motivo, 'ocupado', 'base ocupada');
                var inf = lista[1];
                igual(R().evaluar({ forma: inf.forma, def: inf.def, rot: 0, destinos: destinos(lista, col, 'inferior', 120), radio: 70, radioCasi: 160 }).motivo, 'casi', 'casi');
                igual(R().evaluar({ forma: inf.forma, def: inf.def, rot: 0, destinos: destinos(lista, col, 'inferior', 400), radio: 70, radioCasi: 160 }).motivo, 'fuera', 'fuera');
            }
        },
        {
            descripcion: 'pieza correcta a medio encajar: gana su lugar aunque una vecina de otra forma quede más cerca',
            fn: function () {
                var cfg = config();
                var lista = R().piezasNivel(cfg, 0, null);
                var col = { base: true };
                var inf = lista[1];
                var otra = lista[0]; // la base, ya puesta
                function dest(dSuya, dOtra) {
                    return lista.map(function (p) {
                        var d = p.id === inf.id ? dSuya : (p.id === otra.id ? dOtra : 900);
                        return { id: p.id, forma: p.forma, orient: p.orient, distancia: d, ocupado: !!col[p.id], habilitada: R().habilitada(p, lista, col) };
                    });
                }
                var base = { forma: inf.forma, def: inf.def, rot: 0, radio: 70, radioCasi: 165, radioTolerancia: 115 };
                function ev(dSuya, dOtra) { return R().evaluar(Object.assign({ destinos: dest(dSuya, dOtra) }, base)); }
                var a = ev(100, 40);
                igual(a.motivo, 'correcto', 'a medio camino con otra pieza más cerca');
                igual(a.destino, inf.id, 'destino');
                igual(ev(140, 40).motivo, 'casi', 'más lejos: casi, nunca otraForma');
                igual(ev(140, 900).motivo, 'casi', 'casi sin vecinas');
                igual(ev(300, 40).motivo, 'ocupado', 'lejos de su lugar y sobre una ocupada');
            }
        },
        {
            descripcion: 'orientación: los prismas de la torre se cruzan y el giro tiene función real',
            fn: function () {
                var cfg = config();
                var lista = R().piezasNivel(cfg, 1, null);
                var col = {};
                lista.forEach(function (p) { if (p.capa < 3) col[p.id] = true; });
                var b = lista.filter(function (p) { return p.id === 'prisma-b'; })[0];
                igual(b.orient, 1, 'el segundo prisma va girado');
                var mal = R().evaluar({ forma: b.forma, def: b.def, rot: 0, destinos: destinos(lista, col, 'prisma-b', 10), radio: 70, radioCasi: 160 });
                igual(mal.motivo, 'orientacion', 'sin girar');
                var rot = R().girar(0, 1, 90);
                igual(R().evaluar({ forma: b.forma, def: b.def, rot: rot, destinos: destinos(lista, col, 'prisma-b', 10), radio: 70, radioCasi: 160 }).motivo, 'correcto', 'girado a la derecha');
                igual(R().evaluar({ forma: b.forma, def: b.def, rot: R().girar(0, -1, 90), destinos: destinos(lista, col, 'prisma-b', 10), radio: 70, radioCasi: 160 }).motivo, 'correcto', 'girado a la izquierda (270°) también');
                // un cubo o un cilindro no necesitan giro
                cierto(!R().girable(cfg.formas['cubo-1']), 'cubo');
                cierto(!R().girable(cfg.formas['torre-redonda']), 'cilindro');
                cierto(R().girable(cfg.formas['cubierta']), 'prisma triangular');
            }
        },
        {
            descripcion: 'piezas equivalentes: cualquiera de las dos torres sirve en cualquier lado del castillo',
            fn: function () {
                var cfg = config();
                var lista = R().piezasNivel(cfg, 2, null);
                var col = {};
                lista.forEach(function (p) { if (p.capa === 0) col[p.id] = true; });
                var izq = lista.filter(function (p) { return p.id === 'torre-izq'; })[0];
                var res = R().evaluar({ forma: izq.forma, def: izq.def, rot: 0, destinos: destinos(lista, col, 'torre-der', 15), radio: 70, radioCasi: 160 });
                igual(res.motivo, 'correcto', 'la torre izquierda en el lado derecho');
                igual(res.destino, 'torre-der', 'destino');
            }
        },
        {
            descripcion: 'la guía apunta a la posición del bloque elegido y respeta la capa',
            fn: function () {
                var cfg = config();
                var lista = R().piezasNivel(cfg, 2, null);
                igual(R().siguiente(lista, {}, null).id, 'centro', 'primera guía');
                igual(R().siguiente(lista, {}, 'bloque-lado').id, 'lado-izq', 'con un bloque largo elegido');
                igual(R().siguiente(lista, {}, 'torre-redonda').id, 'centro', 'la torre todavía no va: guía normal');
                var col = { centro: true, 'lado-izq': true, 'lado-der': true };
                igual(R().capaActual(lista, col), 1, 'capa 1');
                igual(R().capaCompletada('lado-der', lista, col), 0, 'capa 0 completa');
            }
        },
        {
            descripcion: 'aleatoriedad: cada partida arma figuras distintas, con las mismas piezas por nivel',
            fn: function () {
                var cfg = config();
                var a = R().sortearVariante(cfg, rnd(3)), b = R().sortearVariante(cfg, rnd(99));
                var la = R().piezasNivel(cfg, 3, a), lb = R().piezasNivel(cfg, 3, b);
                igual(la.length, 11, 'el templo sigue con 11 piezas');
                var distintas = 0;
                for (var s = 1; s <= 20; s++) {
                    var v1 = R().sortearVariante(cfg, rnd(s)), v2 = R().sortearVariante(cfg, rnd(s + 100));
                    for (var i = 0; i < 4; i++) {
                        var c1 = R().piezasNivel(cfg, i, v1).map(function (p) { return p.forma.replace(/^g-\w+-/, '') + JSON.stringify(p.caja); }).join();
                        var c2 = R().piezasNivel(cfg, i, v2).map(function (p) { return p.forma.replace(/^g-\w+-/, '') + JSON.stringify(p.caja); }).join();
                        if (c1 !== c2) distintas += 1;
                    }
                }
                cierto(distintas >= 70, 'las figuras cambian entre partidas (' + distintas + '/80)');
                var ids = la.map(function (p) { return p.id; });
                var r1 = R().repartir(ids, 12, rnd(1)), r2 = R().repartir(ids, 12, rnd(2));
                igual(Object.keys(r1).map(function (k) { return r1[k]; }).sort().join(), Array.from(new Set(Object.keys(r1).map(function (k) { return r1[k]; }))).sort().join(), 'un compartimento por bloque');
                cierto(JSON.stringify(r1) !== JSON.stringify(r2), 'el reparto cambia');
                var n = R().nivel(cfg, 3);
                var rots = R().orientacionesIniciales(la, n, rnd(5));
                var torcidas = la.filter(function (p) { return R().girable(p.def) && !R().orientacionOk(p.def, rots[p.id], p.orient); });
                igual(torcidas.length, n.rotadas, 'piezas que llegan atravesadas');
                cierto(torcidas.some(function (p) { return p.id === 'base-izq'; }), 'rotarPrimero');
            }
        },
        {
            descripcion: 'figuras generadas: válidas, con su familia, piezas, giros y pistas con nombre',
            fn: function () {
                var cfg = config();
                var cuentas = [5, 6, 9, 11];
                var catalogo = cfg.nivelesJuego;
                for (var s = 1; s <= 200; s++) {
                    cfg.nivelesJuego = R().elegirNiveles({ nivelesJuego: catalogo }, rnd(s + 7));
                    var v = R().sortearVariante(cfg, rnd(s));
                    for (var i = 0; i < 4; i++) {
                        var n = R().nivel(cfg, i);
                        cierto(v.construcciones[n.clave], 'nivel ' + (i + 1) + ' generado (semilla ' + s + ')');
                        var lista = R().piezasNivel(cfg, i, v);
                        igual(lista.length, cuentas[i], 'piezas del nivel ' + (i + 1));
                        var errores = R().validarLista(lista);
                        igual(errores.length, 0, 'semilla ' + s + ' nivel ' + (i + 1) + ': ' + errores.join(' | '));
                        lista.forEach(function (p) {
                            cierto(p.pista && p.pista.indexOf('{') < 0 && p.pista.indexOf('de el ') < 0, 'pista de ' + p.id + ': ' + p.pista);
                            cierto(p.voz && p.nombre, 'nombre de ' + p.id);
                            cierto(v.color[p.forma], 'color de ' + p.forma);
                        });
                        if (!n.giro) cierto(lista.every(function (p) { return !R().girable(p.def); }), 'el nivel 1 no necesita giros');
                        else cierto(lista.filter(function (p) { return R().girable(p.def); }).length >= n.rotadas, 'hay piezas para girar en el nivel ' + (i + 1));
                        (n.rotarPrimero || []).forEach(function (id) { cierto(lista.some(function (p) { return p.id === id; }), 'existe ' + id); });
                        // dentro de un nivel, formas distintas tienen colores distintos
                        var vistas = {};
                        lista.forEach(function (p) { vistas[p.forma] = v.color[p.forma]; });
                        var cols = Object.keys(vistas).map(function (k) { return vistas[k]; });
                        igual(new Set(cols).size, cols.length, 'colores distintos en el nivel ' + (i + 1));
                    }
                    if (cfg.nivelesJuego[2].clave === 'castillo') cierto(R().piezasNivel(cfg, 2, v).filter(function (p) { return /^torre-/.test(p.id) && p.def.tipo === 'cilindro'; }).length === 2, 'el castillo tiene sus dos torres cilíndricas');
                    if (cfg.nivelesJuego[3].clave === 'templo') cierto(R().piezasNivel(cfg, 3, v).filter(function (p) { return /^columna-/.test(p.id); }).length === 2, 'el templo tiene dos columnas');
                }
            }
        },
        {
            descripcion: 'orden de pintado isométrico: lo de abajo y lo de atrás primero',
            fn: function () {
                var cfg = config();
                var lista = R().piezasNivel(cfg, 3, null);
                var orden = R().ordenPintado(lista.map(function (p) { return { id: p.id, caja: p.caja, orden: p.orden }; }));
                var pos = function (id) { return orden.indexOf(id); };
                cierto(pos('base-centro') < pos('soporte-centro'), 'base antes que soporte');
                cierto(pos('columna-der') < pos('dintel'), 'columna antes que el dintel');
                cierto(pos('dintel') < pos('fronton') && pos('fronton') < pos('cuspide'), 'techo y cúspide al final');
                igual(orden.length, 11, 'todas');
            }
        },
        {
            descripcion: 'sólidos: cada cuerpo muestra cara superior, frontal y lateral con tonos distintos',
            fn: function () {
                var s = S();
                var g = s.caras({ tipo: 'caja', w: 2, d: 1, h: 1 }, 0);
                var vis = g.caras.filter(function (c) { return c.visible; });
                igual(vis.length, 3, 'tres caras visibles');
                var luces = vis.map(function (c) { return c.luz.toFixed(2); });
                igual(new Set(luces).size, 3, 'tres tonos');
                var g1 = s.caras({ tipo: 'caja', w: 2, d: 1, h: 1 }, 1);
                igual(g1.w + 'x' + g1.d, '1x2', 'el giro cambia la huella');
                ['prisma', 'piramide', 'cilindro', 'cono'].forEach(function (t) {
                    var gg = s.caras({ tipo: t, w: 1, d: 1, h: 1 }, 0);
                    cierto(gg.caras.some(function (c) { return c.visible; }), t + ' visible');
                    cierto(!gg.caras.some(function (c) { return c.abajo && c.visible; }), t + ' sin la base a la vista');
                });
            }
        }
    ]
};
