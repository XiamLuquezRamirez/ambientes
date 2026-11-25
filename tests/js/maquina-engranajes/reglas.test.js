'use strict';

var fs = require('fs');
var path = require('path');

var RAIZ = path.resolve(__dirname, '..', '..', '..');
var BASE = 'public/catalogo_juegos/Polimotor/MaquinaEngranajesPoleas/';

function R() {
    var r = cargarIIFE(BASE + 'reglas.js', 'ReglasMaquina');
    if (!r) throw new Error('no se exportó ReglasMaquina');
    return r;
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

function cerca(a, b, tol, que) {
    if (Math.abs(a - b) > (tol || 1e-6)) throw new Error(que + ': ' + a + ' no es ' + b);
}

function catalogo() { return R().expandirCatalogo(config().nivelesJuego); }

/** Máquina base de cada grado: 1a, 2a, 3a, 4a. */
function geo(i) {
    var c = config();
    var n = catalogo().filter(function (x) { return x.id === (i + 1) + 'a'; })[0];
    return R().geometria(c, n);
}

/** Las 20 máquinas con su geometría resuelta. */
function todas() {
    var c = config();
    return catalogo().map(function (n) { return { n: n, g: R().geometria(c, n) }; });
}

function contar(lista, f) { return lista.filter(f).length; }

module.exports = {
    nombre: 'La Máquina de Engranajes y Poleas — reglas',
    casos: [
        {
            descripcion: 'config.json válido: 20 máquinas sin solapes, correas libres, máquinas sin ruedas encima y todo con movimiento',
            fn: function () {
                var c = config();
                igual(c.nivelesJuego.length, 20, 'máquinas del catálogo');
                [1, 2, 3, 4].forEach(function (g) {
                    igual(c.nivelesJuego.filter(function (n) { return n.grado === g; }).length, 5, 'grado ' + g);
                });
                var errores = R().validar(c);
                igual(errores.length, 0, 'errores: ' + errores.join(' | '));
                igual(c.niveles[0].edad, '5-6 años', 'edad');
                igual(c.audios.tema, 'polimotor', 'tema de audio');
            }
        },
        {
            descripcion: 'las piezas de cada nivel son las pedidas en las 20 máquinas (3; 4; 5+2 poleas+1 correa; 6+3 poleas+2 correas)',
            fn: function () {
                var esperado = [
                    { grande: 1, mediano: 1, pequeno: 1, polea: 0, correa: 0 },
                    { grande: 1, mediano: 2, pequeno: 1, polea: 0, correa: 0 },
                    { grande: 2, mediano: 2, pequeno: 1, polea: 2, correa: 1 },
                    { grande: 2, mediano: 2, pequeno: 2, polea: 3, correa: 2 }
                ];
                todas().forEach(function (t) {
                    var e = esperado[t.n.grado - 1];
                    var p = R().piezas(t.g);
                    ['grande', 'mediano', 'pequeno'].forEach(function (tl) {
                        igual(contar(p, function (x) { return x.tipo === 'engranaje' && x.talla === tl; }), e[tl], t.n.id + ' ' + tl);
                    });
                    igual(contar(p, function (x) { return x.tipo === 'polea'; }), e.polea, t.n.id + ' poleas');
                    igual(contar(p, function (x) { return x.tipo === 'correa'; }), e.correa, t.n.id + ' correas');
                });
            }
        },
        {
            descripcion: 'máquina 1a: grande abajo al centro, mediano arriba a la derecha, pequeño arriba a la izquierda',
            fn: function () {
                var g = geo(0);
                var a = g.ejes.inferior, m = g.ejes.derecho, p = g.ejes.izquierdo;
                igual(a.talla, 'grande', 'inferior');
                igual(m.talla, 'mediano', 'derecho');
                igual(p.talla, 'pequeno', 'izquierdo');
                cierto(m.y < a.y && p.y < a.y, 'los de arriba están arriba');
                cierto(m.x > a.x && p.x < a.x, 'derecha e izquierda');
                cierto(a.r > m.r && m.r > p.r, 'tamaños');
            }
        },
        {
            descripcion: 'radio proporcional a los dientes y distancia entre centros = m·(z1+z2)/2 (las 20)',
            fn: function () {
                todas().forEach(function (t) {
                    var g = t.g;
                    g.lista.forEach(function (e) {
                        if (e.tipo !== 'engranaje') return;
                        cerca(e.r, g.modulo * e.z / 2, 1e-9, t.n.id + ' ' + e.id + ' radio');
                        if (!e.padre) return;
                        var p = g.ejes[e.padre];
                        var d = Math.sqrt(Math.pow(e.x - p.x, 2) + Math.pow(e.y - p.y, 2));
                        cerca(d, p.r + e.r, 1e-6, t.n.id + ' ' + e.id + ' distancia');
                        cierto(d < p.ra + e.ra, e.id + ' los dientes se meten en el otro');
                        cierto(d > p.ra + e.rf, e.id + ' sin chocar con la raíz');
                    });
                });
            }
        },
        {
            descripcion: 'fase: el diente del padre cae en el hueco del hijo para cualquier giro (las 20)',
            fn: function () {
                todas().forEach(function (t) {
                    var g = t.g;
                    var a = R().relaciones(g);
                    g.lista.forEach(function (e) {
                        if (e.tipo !== 'engranaje' || !e.padre) return;
                        var p = g.ejes[e.padre];
                        var th = Math.atan2(e.y - p.y, e.x - p.x);
                        [0, 0.37, 1.9, -2.4, 10.1].forEach(function (phi) {
                            var hijo = R().fase(p, e, phi);
                            var fp = R().faseDiente(p, phi, th);
                            var fh = R().faseDiente(e, hijo, th + Math.PI);
                            var suma = ((fp + fh) % 1 + 1) % 1;
                            cerca(suma, 0.5, 1e-6, t.n.id + ' ' + e.id + ' fase con φ=' + phi);
                        });
                        cerca(a[e.id], -a[e.padre] * p.z / e.z, 1e-9, e.id + ' relación');
                        var d1 = R().fase(p, e, 0.5) - R().fase(p, e, 0);
                        cerca(d1 / 0.5, -p.z / e.z, 1e-9, e.id + ' derivada de la fase');
                    });
                });
            }
        },
        {
            descripcion: 'transmisión de la máquina 1a: mediano y pequeño giran al revés que el grande; el pequeño, el doble de rápido',
            fn: function () {
                var g = geo(0);
                var a = R().relaciones(g);
                igual(a.inferior, 1, 'principal');
                cierto(a.derecho < 0 && a.izquierdo < 0, 'sentido contrario');
                cerca(a.izquierdo, -2, 1e-9, 'pequeño');
                cerca(a.derecho, -20 / 14, 1e-9, 'mediano');
                igual(R().sentido(a.derecho), 'antihorario', 'sentido visible');
                cierto(a['f-ventilador'] > 0, 'la correa conserva el sentido');
                cerca(a['f-ventilador'], g.ejes['f-eje'].r / g.ejes['f-ventilador'].r, 1e-9, 'relación de la correa');
            }
        },
        {
            descripcion: 'máquina 2a: la pequeña engrana con la mediana y gira como la grande',
            fn: function () {
                var a = R().relaciones(geo(1));
                cierto(a.arriba > 0, 'mismo sentido que la principal');
                cerca(a.arriba, 2, 1e-9, 'relación total 20/10');
            }
        },
        {
            descripcion: 'orden: la rueda hija espera a su padre, la polea del eje a su rueda y la correa a sus dos poleas',
            fn: function () {
                var g = geo(3);
                var d = function (id) { return R().destino(g, id); };
                var puestos = {};
                cierto(R().habilitado(d('g1'), g, puestos), 'la principal siempre');
                cierto(!R().habilitado(d('g2'), g, puestos), 'g2 espera');
                cierto(!R().habilitado(d('p1'), g, puestos), 'p1 espera a g2');
                cierto(R().habilitado(d('p2'), g, puestos), 'la polea de la estación no espera');
                cierto(!R().habilitado(d('c1'), g, puestos), 'la correa espera');
                puestos.g1 = true; puestos.g2 = true;
                cierto(R().habilitado(d('p1'), g, puestos), 'p1 lista');
                puestos.p1 = true;
                cierto(!R().habilitado(d('c1'), g, puestos), 'falta p2');
                puestos.p2 = true;
                cierto(R().habilitado(d('c1'), g, puestos), 'correa lista');
                cierto(!R().habilitado(d('c2'), g, puestos), 'c2 espera a p3');
            }
        },
        {
            descripcion: 'siguiente: primero la principal; con una pieza elegida, el eje que le sirve',
            fn: function () {
                var g = geo(2);
                igual(R().siguiente(g, {}).id, 'g1', 'arranque');
                igual(R().siguiente(g, { g1: true }).id, 'g2', 'después');
                igual(R().siguiente(g, { g1: true }, 'engranaje', 'mediano').id, 'm1', 'mediana elegida');
                igual(R().siguiente(g, { g1: true }, 'polea', 'grande').id, 'p2', 'polea grande elegida');
                var todos = {};
                R().destinos(g).forEach(function (x) { todos[x.id] = true; });
                igual(R().siguiente(g, todos), null, 'nada más');
                cierto(R().completo(g, todos), 'completo');
                igual(R().faltan(g, { g1: true }), 7, 'faltan');
            }
        },
        {
            descripcion: 'evaluar: correcto, otra talla, otra pieza, orden, ocupado, casi y fuera',
            fn: function () {
                var base = function (cambios) {
                    var l = [
                        { id: 'a', tipo: 'engranaje', talla: 'grande', distancia: 500, ocupado: false, habilitado: true },
                        { id: 'b', tipo: 'engranaje', talla: 'mediano', distancia: 500, ocupado: false, habilitado: false },
                        { id: 'p', tipo: 'polea', talla: 'grande', distancia: 500, ocupado: false, habilitado: true }
                    ];
                    l.forEach(function (d) { if (cambios[d.id]) Object.keys(cambios[d.id]).forEach(function (k) { d[k] = cambios[d.id][k]; }); });
                    return l;
                };
                var ev = function (tipo, talla, cambios) {
                    return R().evaluar({ tipo: tipo, talla: talla, radio: 80, radioCasi: 170, destinos: base(cambios) });
                };
                var r = ev('engranaje', 'grande', { a: { distancia: 30 } });
                cierto(r.acierto, 'correcto');
                igual(r.destino, 'a', 'destino');
                igual(ev('engranaje', 'mediano', { a: { distancia: 30 } }).motivo, 'otraTalla', 'otra talla');
                igual(ev('engranaje', 'mediano', { b: { distancia: 30 } }).motivo, 'orden', 'orden');
                igual(ev('engranaje', 'grande', { a: { distancia: 30, ocupado: true } }).motivo, 'ocupado', 'ocupado');
                igual(ev('engranaje', 'grande', { p: { distancia: 20 } }).motivo, 'otraPieza', 'sobre una polea');
                igual(ev('engranaje', 'grande', { a: { distancia: 140 } }).motivo, 'casi', 'casi');
                igual(ev('engranaje', 'grande', {}).motivo, 'fuera', 'fuera');
                cierto(!ev('engranaje', 'grande', { a: { distancia: 140 } }).acierto, 'casi no encaja');
            }
        },
        {
            descripcion: 'piezas iguales son equivalentes: cualquier mediana sirve en cualquier eje mediano',
            fn: function () {
                var g = geo(1);
                var l = R().destinos(g).map(function (d) {
                    return { id: d.id, tipo: d.tipo, talla: d.talla, distancia: d.id === 'derecha' ? 10 : 400, ocupado: false, habilitado: R().habilitado(d, g, { centro: true }) };
                });
                var r = R().evaluar({ tipo: 'engranaje', talla: 'mediano', radio: 80, destinos: l });
                cierto(r.acierto && r.destino === 'derecha', 'la mediana entra en la derecha');
            }
        },
        {
            descripcion: 'imán y cercanía: nunca encaja solo, solo atrae al eje que le sirve',
            fn: function () {
                cierto(R().iman(0, 120, 0.35) <= 0.35, 'tope');
                igual(R().iman(130, 120, 0.35), 0, 'lejos');
                var c = R().cercano({ tipo: 'engranaje', talla: 'grande', destinos: [
                    { id: 'x', tipo: 'engranaje', talla: 'mediano', distancia: 10, ocupado: false, habilitado: true },
                    { id: 'y', tipo: 'engranaje', talla: 'grande', distancia: 60, ocupado: false, habilitado: true }
                ] }, 200);
                igual(c.id, 'y', 'atrae al grande');
            }
        },
        {
            descripcion: 'correa: tangentes que tocan las poleas, largo coherente y recorrido cerrado',
            fn: function () {
                var p = { x: 0, y: 0, r: 30 }, q = { x: 300, y: 80, r: 50 };
                var c = R().correa(p, q);
                var tangente = function (A, B, C) {
                    var vx = B.x - A.x, vy = B.y - A.y;
                    return Math.abs((A.x - C.x) * vx + (A.y - C.y) * vy) / Math.sqrt(vx * vx + vy * vy);
                };
                cerca(tangente(c.rectas[0][0], c.rectas[0][1], p), 0, 1e-6, 'recta 1 tangente a p');
                cerca(tangente(c.rectas[0][1], c.rectas[0][0], q), 0, 1e-6, 'recta 1 tangente a q');
                cerca(tangente(c.rectas[1][0], c.rectas[1][1], q), 0, 1e-6, 'recta 2 tangente a q');
                var ini = R().puntoCorrea(c, 0), fin = R().puntoCorrea(c, c.largo - 1e-6);
                cerca(ini.x, fin.x, 1e-3, 'cerrada x');
                cerca(ini.y, fin.y, 1e-3, 'cerrada y');
                var prev = R().puntoCorrea(c, 0);
                for (var s = 2; s < c.largo; s += 2) {
                    var pt = R().puntoCorrea(c, s);
                    var paso = Math.sqrt(Math.pow(pt.x - prev.x, 2) + Math.pow(pt.y - prev.y, 2));
                    cierto(paso < 2.2, 'sin saltos en s=' + s);
                    prev = pt;
                }
            }
        },
        {
            descripcion: 'las poleas del eje caben dentro de su rueda y las de la estación están en la estación (niveles 3 y 4)',
            fn: function () {
                todas().filter(function (t) { return t.n.grado >= 3; }).forEach(function (t) {
                    var g = t.g;
                    var e = t.n.estacion;
                    g.lista.filter(function (x) { return x.tipo === 'polea'; }).forEach(function (p) {
                        if (p.sobre) { cierto(p.ra < g.ejes[p.sobre].rf, t.n.id + ' ' + p.id + ' cabe'); return; }
                        cierto(p.x > e.x0 && p.x < e.x1 && p.y > e.y0 && p.y < e.y1, t.n.id + ' ' + p.id + ' en la estación');
                    });
                });
            }
        },
        {
            descripcion: 'sorteo: una máquina por grado, en orden, sin repetir la partida anterior; con el tiempo salen las 20',
            fn: function () {
                var cat = catalogo();
                var n = 7;
                var rnd = function () { n = (n * 9301 + 49297) % 233280; return n / 233280; };
                var vistas = {};
                var prev = [];
                for (var k = 0; k < 40; k++) {
                    var el = R().elegirNiveles(cat, rnd, prev);
                    igual(el.length, 4, 'cuatro niveles');
                    el.forEach(function (m, i) { igual(m.grado, i + 1, 'orden de grados'); vistas[m.id] = 1; });
                    el.forEach(function (m) { cierto(prev.indexOf(m.id) < 0, 'no repite ' + m.id); });
                    prev = el.map(function (m) { return m.id; });
                }
                igual(Object.keys(vistas).length, 20, 'salen las 20');
            }
        },
        {
            descripcion: 'cada máquina hereda los textos de su grado y Zoe sabe decir dónde va cada pieza sin repetir descripciones',
            fn: function () {
                var c = config();
                todas().forEach(function (t) {
                    cierto(t.n.nombre && t.n.zeus && t.n.cartel && t.n.listo && t.n.marcha, t.n.id + ' textos');
                    cierto(t.n.modulo && t.n.tablero, t.n.id + ' geometría heredada');
                    var ds = R().destinos(t.g);
                    ds.forEach(function (d) { cierto(R().pista(c, d).length > 10, t.n.id + ' pista de ' + d.id); });
                    ds.forEach(function (a, i) {
                        ds.slice(i + 1).forEach(function (b) {
                            if (a.tipo === b.tipo && a.talla === b.talla && a.tipo !== 'correa') cierto(a.lugar !== b.lugar, t.n.id + ': ' + a.id + ' y ' + b.id + ' se describen igual');
                        });
                    });
                });
            }
        },
        {
            descripcion: 'las máquinas no son copias: cada una cambia posiciones o máquina secundaria, y todas tienen máquina',
            fn: function () {
                var firmas = {};
                todas().forEach(function (t) {
                    var f = t.n.maquina + '|' + t.g.lista.map(function (e) { return e.talla + Math.round(e.x) + ',' + Math.round(e.y); }).join(';');
                    cierto(!firmas[f], t.n.id + ' repite a ' + firmas[f]);
                    firmas[f] = t.n.id;
                    cierto(R().huellaMaquina(t.n, t.g).length > 0, t.n.id + ' tiene máquina secundaria');
                });
            }
        },
        {
            descripcion: 'la validación detecta una rueda encima de la máquina secundaria',
            fn: function () {
                var c = config();
                var n = JSON.parse(JSON.stringify(catalogo().filter(function (x) { return x.id === '1a'; })[0]));
                n.fijos.poleas[1].x = 1000;
                n.fijos.poleas[1].y = 500;
                cierto(R().validarNivel(c, n).some(function (e) { return /máquina|pisa/.test(e); }), 'detecta el choque');
            }
        },
        {
            descripcion: 'variante al azar: colores y decoración cambian, la solución no',
            fn: function () {
                var c = config();
                var n = 0;
                var rnd = function () { n = (n * 9301 + 49297) % 233280; return n / 233280; };
                var v1 = R().sortearVariante(c, rnd), v2 = R().sortearVariante(c, rnd);
                cierto(v1.color.grande && v1.color.mediano && v1.color.pequeno, 'colores');
                cierto(c.variantes.colores.grande.indexOf(v2.color.grande) >= 0, 'del catálogo');
                igual(R().validar(c).length, 0, 'la geometría no depende de la variante');
                igual(R().pista(c, R().destino(geo(0), 'izquierdo')), '¡Busca la rueda pequeña! Va en el eje de arriba a la izquierda.', 'pista');
            }
        }
    ]
};
