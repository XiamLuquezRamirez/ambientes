'use strict';

var fs = require('fs');
var path = require('path');

var RAIZ = path.resolve(__dirname, '..', '..', '..');
var BASE = 'public/catalogo_juegos/Polimotor/EstacionClasificacion/';

function R() {
    var r = cargarIIFE(BASE + 'reglas.js', 'ReglasEstacion');
    if (!r) throw new Error('no se exportó ReglasEstacion');
    return r;
}

function config() {
    return JSON.parse(fs.readFileSync(path.join(RAIZ, BASE, 'config.json'), 'utf8'));
}

function igual(real, esperado, que) {
    if (real !== esperado) throw new Error(que + ': se esperaba ' + JSON.stringify(esperado) + ' y llegó ' + JSON.stringify(real));
}

function nivel(i) { return R().nivel(config(), i); }
function cont(niv, id) { return niv.contenedores.filter(function (c) { return c.id === id; })[0]; }
function obj(forma, color, tamano) { return { id: forma + '-' + color + '-' + tamano, forma: forma, color: color, tamano: tamano }; }
function ronda(i, s) { return R().generarObjetos(nivel(i), R().semilla(s)); }

module.exports = {
    nombre: 'Estación de Clasificación — reglas',
    casos: [
        {
            descripcion: 'config.json es válido: 4 niveles y en cada ronda sorteada cada objeto cabe en un solo contenedor',
            fn: function () {
                var errores = R().validar(config());
                igual(errores.length, 0, 'errores: ' + errores.join(' | '));
            }
        },
        {
            descripcion: 'los criterios son color, tamaño, forma y color + tamaño',
            fn: function () {
                igual(R().criterios(nivel(0)).join('+'), 'color', 'nivel 1');
                igual(R().criterios(nivel(1)).join('+'), 'tamano', 'nivel 2');
                igual(R().criterios(nivel(2)).join('+'), 'forma', 'nivel 3');
                igual(R().criterios(nivel(3)).join('+'), 'color+tamano', 'nivel 4');
            }
        },
        {
            descripcion: 'más objetos por nivel: 8, 8, 12 y 12, repartidos por igual entre los contenedores',
            fn: function () {
                [8, 8, 12, 12].forEach(function (total, i) {
                    for (var s = 1; s < 25; s++) {
                        var objs = ronda(i, s * 13 + i);
                        igual(objs.length, total, 'nivel ' + (i + 1) + ' semilla ' + s);
                        var n = nivel(i), por = {};
                        objs.forEach(function (o) {
                            var d = R().destino(o, n.contenedores, R().criterios(n));
                            if (!d) throw new Error('nivel ' + (i + 1) + ': ' + o.id + ' sin contenedor');
                            por[d.id] = (por[d.id] || 0) + 1;
                        });
                        n.contenedores.forEach(function (c) { igual(por[c.id], n.generador.porContenedor, 'nivel ' + (i + 1) + ' ' + c.id); });
                        var ids = objs.map(function (o) { return o.id; });
                        igual(new Set(ids).size, ids.length, 'ids únicos');
                    }
                });
            }
        },
        {
            descripcion: 'ronda a ronda los objetos cambian al azar',
            fn: function () {
                [0, 1, 2, 3].forEach(function (i) {
                    var vistas = {};
                    for (var s = 1; s <= 12; s++) {
                        vistas[ronda(i, s * 31).map(function (o) { return o.id; }).sort().join()] = true;
                    }
                    if (Object.keys(vistas).length < 4) throw new Error('nivel ' + (i + 1) + ': solo ' + Object.keys(vistas).length + ' rondas distintas de 12');
                });
            }
        },
        {
            descripcion: 'variedad: en un contenedor no se repite la forma (o el color en el nivel 3) y hay grandes y pequeños',
            fn: function () {
                for (var s = 1; s < 30; s++) {
                    [0, 1, 3].forEach(function (i) {
                        var n = nivel(i), objs = ronda(i, s * 7 + i);
                        n.contenedores.forEach(function (c) {
                            var formas = objs.filter(function (o) { return R().evaluar(o, c, R().criterios(n)).acierto; }).map(function (o) { return o.forma; });
                            igual(new Set(formas).size, formas.length, 'nivel ' + (i + 1) + ' ' + c.id + ' formas');
                        });
                    });
                    var n3 = nivel(2), objs3 = ronda(2, s * 7 + 2);
                    n3.contenedores.forEach(function (c) {
                        var cols = objs3.filter(function (o) { return o.forma === c.forma; }).map(function (o) { return o.color; });
                        igual(new Set(cols).size, cols.length, 'nivel 3 ' + c.id + ' colores');
                    });
                    [0, 2].forEach(function (i) {
                        var tams = new Set(ronda(i, s * 11 + i).map(function (o) { return o.tamano; }));
                        igual(tams.size, 2, 'nivel ' + (i + 1) + ' mezcla grandes y pequeños');
                    });
                }
            }
        },
        {
            descripcion: 'nivel 1: solo cuenta el color',
            fn: function () {
                var n = nivel(0), c = R().criterios(n);
                igual(R().evaluar(obj('circulo', 'azul', 'pequeno'), cont(n, 'azul'), c).acierto, true, 'pelota azul → azul');
                igual(R().evaluar(obj('circulo', 'azul', 'pequeno'), cont(n, 'amarillo'), c).acierto, false, 'pelota azul → amarillo');
                igual(R().evaluar(obj('estrella', 'amarillo', 'grande'), cont(n, 'amarillo'), c).acierto, true, 'estrella amarilla → amarillo');
            }
        },
        {
            descripcion: 'nivel 2: todo gris (contenedores y objetos); solo cuenta el tamaño',
            fn: function () {
                var n = nivel(1), c = R().criterios(n);
                igual(R().evaluar(obj('circulo', 'gris', 'grande'), cont(n, 'grande'), c).acierto, true, 'pelota grande');
                igual(R().evaluar(obj('estrella', 'gris', 'pequeno'), cont(n, 'grande'), c).acierto, false, 'estrella pequeña en grande');
                igual(R().evaluar(obj('estrella', 'gris', 'pequeno'), cont(n, 'pequeno'), c).acierto, true, 'estrella pequeña en pequeño');
                for (var s = 1; s < 20; s++) ronda(1, s).forEach(function (o) { igual(o.color, 'gris', o.id); });
                igual(cont(n, 'grande').cuerpo, '#8f9bab', 'contenedor grande gris');
                igual(cont(n, 'pequeno').cuerpo, '#8f9bab', 'contenedor pequeño gris');
            }
        },
        {
            descripcion: 'los contenedores de objetos pequeños son más pequeños (niveles 2 y 4)',
            fn: function () {
                R().niveles(config()).forEach(function (n, i) {
                    n.contenedores.forEach(function (c) {
                        var k = Number(c.escala) || 1;
                        if (c.tamano === 'pequeno') {
                            if (!(k < 1)) throw new Error('nivel ' + (i + 1) + ' ' + c.id + ': escala ' + k);
                        } else {
                            igual(k, 1, 'nivel ' + (i + 1) + ' ' + c.id);
                        }
                    });
                });
                igual(cont(nivel(1), 'pequeno').escala < cont(nivel(3), 'azul-pequeno').escala, true, 'en el nivel 2 se ve más pequeño');
            }
        },
        {
            descripcion: 'nivel 3: solo cuenta la forma',
            fn: function () {
                var n = nivel(2), c = R().criterios(n);
                igual(R().evaluar(obj('triangulo', 'azul', 'pequeno'), cont(n, 'triangulo'), c).acierto, true, 'triángulo');
                igual(R().evaluar(obj('rectangulo', 'amarillo', 'pequeno'), cont(n, 'rectangulo'), c).acierto, true, 'rectángulo');
                igual(R().evaluar(obj('cuadrado', 'rojo', 'pequeno'), cont(n, 'rectangulo'), c).acierto, false, 'cuadrado no es rectángulo');
            }
        },
        {
            descripcion: 'nivel 4: valida color y tamaño a la vez; un solo atributo no basta',
            fn: function () {
                var n = nivel(3), c = R().criterios(n);
                var cajaG = obj('cuadrado', 'azul', 'grande');
                igual(R().evaluar(cajaG, cont(n, 'azul-grande'), c).acierto, true, 'azul + grande');
                var r1 = R().evaluar(cajaG, cont(n, 'azul-pequeno'), c);
                igual(r1.acierto, false, 'solo coincide el color');
                igual(r1.fallos.join(','), 'tamano', 'falla el tamaño');
                igual(r1.bien.join(','), 'color', 'el color sí coincide');
                var r2 = R().evaluar(cajaG, cont(n, 'amarillo-grande'), c);
                igual(r2.acierto, false, 'solo coincide el tamaño');
                igual(r2.fallos.join(','), 'color', 'falla el color');
                igual(R().evaluar(cajaG, cont(n, 'amarillo-pequeno'), c).fallos.length, 2, 'fallan los dos');
            }
        },
        {
            descripcion: 'nivel 4: la forma no decide',
            fn: function () {
                var n = nivel(3), c = R().criterios(n);
                igual(R().destino(obj('estrella', 'azul', 'grande'), n.contenedores, c).id, 'azul-grande', 'estrella azul grande');
                igual(R().destino(obj('cuadrado', 'amarillo', 'grande'), n.contenedores, c).id, 'amarillo-grande', 'caja amarilla grande');
                igual(R().destino(obj('circulo', 'azul', 'pequeno'), n.contenedores, c).id, 'azul-pequeno', 'pelota azul pequeña');
            }
        },
        {
            descripcion: 'la validación usa atributos, no el nombre ni el id del objeto',
            fn: function () {
                var n = nivel(3), c = R().criterios(n);
                var engaño = { id: 'cuadrado-azul-grande', nombre: 'la caja azul grande', color: 'amarillo', tamano: 'pequeno', forma: 'cuadrado' };
                igual(R().evaluar(engaño, cont(n, 'azul-grande'), c).acierto, false, 'id engañoso');
                igual(R().evaluar(engaño, cont(n, 'amarillo-pequeno'), c).acierto, true, 'atributos reales');
            }
        },
        {
            descripcion: 'nombres con concordancia para las voces',
            fn: function () {
                igual(R().nombreObjeto(obj('circulo', 'amarillo', 'pequeno')), 'la pelota amarilla pequeña', 'pelota');
                igual(R().nombreObjeto(obj('triangulo', 'amarillo', 'pequeno')), 'el bloque triangular amarillo pequeño', 'bloque');
                igual(R().nombreObjeto(obj('cuadrado', 'azul', 'grande')), 'la caja azul grande', 'caja');
            }
        },
        {
            descripcion: 'progreso: contar y completo',
            fn: function () {
                var objs = ronda(0, 5);
                var hechos = {};
                igual(R().contar(hechos, objs), 0, 'sin nada');
                objs.slice(0, 3).forEach(function (o) { hechos[o.id] = true; });
                igual(R().contar(hechos, objs), 3, 'tres');
                igual(R().completo(hechos, objs), false, 'no completo');
                objs.forEach(function (o) { hechos[o.id] = true; });
                igual(R().completo(hechos, objs), true, 'completo');
            }
        },
        {
            descripcion: 'orden de la cinta: sin perder objetos y los 6 visibles cubren los 4 contenedores',
            fn: function () {
                for (var s = 1; s < 30; s++) {
                    [2, 3].forEach(function (i) {
                        var n = nivel(i);
                        var objs = ronda(i, s * 3 + i);
                        var orden = R().ordenCinta({ objetos: objs, contenedores: n.contenedores, criterios: n.criterios }, 6, R().semilla(s * 7 + i));
                        igual(orden.length, objs.length, 'cantidad');
                        var vistos = {};
                        orden.slice(0, 6).forEach(function (o) { vistos[R().destino(o, n.contenedores, R().criterios(n)).id] = true; });
                        igual(Object.keys(vistos).length, 4, 'contenedores con objeto visible');
                    });
                }
            }
        },
        {
            descripcion: 'pistas: el nivel 4 dice qué atributo revisar; la insistencia da la pista concreta',
            fn: function () {
                var n = nivel(3), o = obj('cuadrado', 'azul', 'grande');
                igual(R().pista(n, o, ['tamano'], false), '¡El color está bien! Pero mira el tamaño.', 'falla tamaño');
                igual(R().pista(n, o, ['color'], false), '¡El tamaño está bien! Pero mira el color.', 'falla color');
                igual(R().pista(n, o, ['color', 'tamano'], false), 'Mira las dos etiquetas: el color y el tamaño.', 'fallan los dos');
                igual(R().pista(n, o, ['tamano'], true), '¡Es azul y es grande! Busca el contenedor azul y grande.', 'concreta');
                igual(R().pista(nivel(2), obj('circulo', 'verde', 'pequeno'), ['forma'], true), '¡Es un círculo! Busca el contenedor del círculo.', 'forma concreta');
            }
        },
        {
            descripcion: 'cada nivel tiene su propio mensaje de celebración',
            fn: function () {
                var titulos = R().niveles(config()).map(function (n) { return n.cartel.titulo; });
                igual(titulos.join(' | '), '¡AZUL Y AMARILLO! | ¡GRAN OBSERVADOR! | ¡MAESTRO DE LAS FORMAS! | ¡SÚPER CLASIFICADOR!', 'títulos');
                var tipos = R().niveles(config()).map(function (n) { return n.celebracion; });
                igual(tipos.join(','), 'colores,tamanos,formas,doble', 'celebraciones distintas');
            }
        }
    ]
};
