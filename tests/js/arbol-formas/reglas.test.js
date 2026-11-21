'use strict';

var fs = require('fs');
var path = require('path');

var RAIZ = path.resolve(__dirname, '..', '..', '..');
var BASE = 'public/catalogo_juegos/Polimotor/ArbolFormasMagicas/';

function modulo() {
    var R = cargarIIFE(BASE + 'reglas.js', 'ReglasArbol');
    if (!R) throw new Error('no se exportó ReglasArbol');
    return R;
}

/** La escena se carga sin Phaser: solo interesan sus posiciones de diseño. */
function escena() {
    var E = cargarIIFE(BASE + 'escena-arbol.js', 'EscenarioArbol');
    if (!E) throw new Error('no se exportó EscenarioArbol');
    return E;
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

function soltar(forma, distancias, ocupados) {
    var oc = ocupados || {};
    return {
        forma: forma,
        radio: 89,
        moldes: Object.keys(distancias).map(function (k) { return { forma: k, distancia: distancias[k], ocupado: !!oc[k] }; })
    };
}

function semilla(s) {
    return function () {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

function distancia(a, b) {
    var dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

module.exports = {
    nombre: 'El Árbol de las Formas Mágicas — reglas',
    casos: [
        {
            descripcion: 'carga ReglasArbol y la escena sin Phaser',
            fn: function () { modulo(); escena(); }
        },

        // ------------------------------------------------------------ config
        {
            descripcion: 'el config.json es válido para la partida',
            fn: function () {
                var errores = modulo().validar(config());
                igual(errores.length, 0, 'errores: ' + errores.join(' | '));
            }
        },
        {
            descripcion: 'los frutos llevan su nombre visible y su forma',
            fn: function () {
                var porNombre = {};
                config().frutos.forEach(function (x) { porNombre[x.nombre] = x.forma; });
                igual(porNombre['Manzana Circular'], 'circulo', 'manzana');
                igual(porNombre['Ciruela Cuadrada'], 'cuadrado', 'ciruela');
                igual(porNombre['Pera Triangular'], 'triangulo', 'pera');
                igual(porNombre['Fresa Corazón'], 'corazon', 'fresa');
                igual(porNombre['Carambola Estrella'], 'estrella', 'carambola');
            }
        },
        {
            descripcion: 'tres niveles: 3, 4 y 5 frutos, y el primero son los tres básicos',
            fn: function () {
                var R = modulo(), c = config();
                igual(R.niveles(c).length, 3, 'niveles');
                igual(R.frutosNivel(c, 0).length, 3, 'nivel 1');
                igual(R.frutosNivel(c, 1).length, 4, 'nivel 2');
                igual(R.frutosNivel(c, 2).length, 5, 'nivel 3');
                igual(R.frutosNivel(c, 0).map(function (f) { return f.forma; }).sort().join(), 'circulo,cuadrado,triangulo', 'formas del nivel 1');
                cierto(R.frutosNivel(c, 1).some(function (f) { return f.forma === 'corazon'; }), 'el nivel 2 trae el corazón');
                cierto(R.frutosNivel(c, 2).some(function (f) { return f.forma === 'estrella'; }), 'el nivel 3 trae la estrella');
            }
        },
        {
            descripcion: 'cada nivel completa solo con todos sus frutos',
            fn: function () {
                var R = modulo(), c = config();
                var n2 = R.frutosNivel(c, 1);
                igual(R.completo({ manzana: true, pera: true, ciruela: true }, c, n2), false, 'faltando la fresa');
                igual(R.completo({ manzana: true, pera: true, ciruela: true, fresa: true }, c, n2), true, 'con los cuatro');
            }
        },
        {
            descripcion: 'validar detecta formas repetidas y moldes que faltan',
            fn: function () {
                var c = config();
                c.frutos[1].forma = 'circulo';
                cierto(modulo().validar(c).length > 0, 'forma repetida');
                var c2 = config();
                c2.moldes = ['circulo', 'cuadrado', 'corazon', 'estrella'];
                cierto(modulo().validar(c2).some(function (e) { return /triangulo/.test(e); }), 'molde faltante');
                var c3 = config();
                c3.nivelesJuego[1].frutos.push('nada');
                cierto(modulo().validar(c3).some(function (e) { return /desconocido/.test(e); }), 'fruto desconocido en un nivel');
            }
        },
        {
            descripcion: 'la edad del catálogo es 3-4 años',
            fn: function () { igual(config().niveles[0].edad, '3-4 años', 'edad'); }
        },
        {
            descripcion: 'los textos de instrucción, guía y cierre están completos',
            fn: function () {
                var t = config().textos;
                igual(t.introZoe, '¡El árbol mágico necesita sus frutos! Toma cada fruto, arrástralo hasta el molde que tiene su misma forma en el tronco y suéltalo para encajarlo.', 'instrucción');
                igual(t.ayudaZoe, '¡Fíjate en la forma! Lleva el círculo con el círculo y el triángulo con el triángulo.', 'guía');
                igual(t.otraForma, '¡Busca el molde que tenga la misma forma!', 'pista');
                igual(t.finalVoz + ' ' + t.finalVozZeus, '¡ESPECTACULAR! Dominaste el arrastre y el encaje de formas. ¡Eres un maestro de la precisión!', 'cierre');
                cierto(t.aciertos.length >= 4, 'frases de acierto');
                t.aciertos.concat([t.otraForma, t.fuera]).forEach(function (s) {
                    cierto(!/fallaste|mal\b|incorrecto/i.test(s), 'sin mensajes negativos: ' + s);
                });
            }
        },

        // ------------------------------------------------------------ evaluar
        {
            descripcion: 'soltar en su molde es un encaje',
            fn: function () {
                var r = modulo().evaluar(soltar('circulo', { circulo: 20, triangulo: 240, cuadrado: 200 }));
                igual(r.acierto, true, 'acierto');
                igual(r.motivo, 'correcto', 'motivo');
                igual(r.molde, 'circulo', 'molde');
            }
        },
        {
            descripcion: 'soltar en otro molde no cuenta y nombra ese molde',
            fn: function () {
                var r = modulo().evaluar(soltar('triangulo', { circulo: 30, triangulo: 240, cuadrado: 200 }));
                igual(r.acierto, false, 'acierto');
                igual(r.motivo, 'otraForma', 'motivo');
                igual(r.molde, 'circulo', 'molde');
            }
        },
        {
            descripcion: 'soltar lejos de todos los moldes es "fuera"',
            fn: function () {
                var r = modulo().evaluar(soltar('cuadrado', { circulo: 300, triangulo: 260, cuadrado: 120 }));
                igual(r.acierto, false, 'acierto');
                igual(r.motivo, 'fuera', 'motivo');
            }
        },
        {
            descripcion: 'si su molde está dentro del radio gana aunque otro quede un poco más cerca',
            fn: function () {
                var r = modulo().evaluar(soltar('cuadrado', { circulo: 70, triangulo: 260, cuadrado: 85 }));
                igual(r.acierto, true, 'acierto');
            }
        },
        {
            descripcion: 'un molde ocupado no acepta otro fruto',
            fn: function () {
                var r = modulo().evaluar(soltar('circulo', { circulo: 10, triangulo: 240, cuadrado: 200 }, { circulo: true }));
                igual(r.acierto, false, 'acierto');
                igual(r.motivo, 'ocupado', 'motivo');
            }
        },
        {
            descripcion: 'el borde del radio cuenta como dentro',
            fn: function () {
                igual(modulo().evaluar(soltar('circulo', { circulo: 89, triangulo: 300, cuadrado: 300 })).acierto, true, 'en el borde');
                igual(modulo().evaluar(soltar('circulo', { circulo: 89.5, triangulo: 300, cuadrado: 300 })).motivo, 'fuera', 'pasado el borde');
            }
        },

        // ------------------------------------------------------------ cercanía (brillo del molde)
        {
            descripcion: 'solo brilla el molde de la misma forma, con más fuerza cuanto más cerca',
            fn: function () {
                var R = modulo();
                var moldes = [{ forma: 'circulo', distancia: 40 }, { forma: 'triangulo', distancia: 20 }];
                var c = R.cercano('circulo', moldes, 200);
                igual(c.forma, 'circulo', 'forma');
                cierto(c.fuerza > 0.75 && c.fuerza <= 1, 'fuerza cerca');
                igual(R.cercano('cuadrado', moldes, 200), null, 'sin su molde cerca');
                igual(R.cercano('circulo', [{ forma: 'circulo', distancia: 250 }], 200), null, 'lejos');
                igual(R.cercano('circulo', [{ forma: 'circulo', distancia: 10, ocupado: true }], 200), null, 'ocupado');
            }
        },

        // ------------------------------------------------------------ geometría real de la escena
        {
            descripcion: 'cada nivel tiene disposición con un molde por cada forma de sus frutos',
            fn: function () {
                var E = escena(), R = modulo(), c = config();
                R.niveles(c).forEach(function (n, i) {
                    var lista = R.frutosNivel(c, i);
                    var d = E.DISPOSICIONES[lista.length];
                    cierto(d, 'disposición para ' + lista.length);
                    lista.forEach(function (f) { cierto(d.moldes[f.forma], 'nivel ' + (i + 1) + ' sin molde ' + f.forma); });
                    cierto(d.lugares >= lista.length && d.lugares <= E.LUGARES.length, 'lugares del nivel ' + (i + 1));
                });
            }
        },
        {
            descripcion: 'en cada disposición el radio de acierto no alcanza a dos moldes',
            fn: function () {
                var E = escena();
                Object.keys(E.DISPOSICIONES).forEach(function (n) {
                    var m = E.DISPOSICIONES[n].moldes;
                    var r = modulo().radios(Object.keys(m).map(function (k) { return m[k]; }), config().juego);
                    cierto(r.acierto * 2 < r.separacion, n + ' moldes: acierto ' + r.acierto + ' vs separación ' + r.separacion);
                    cierto(r.cerca > r.acierto, 'la cercanía avisa antes del acierto');
                    cierto(r.acierto >= 60, n + ' moldes: radio generoso ' + r.acierto);
                });
            }
        },
        {
            descripcion: 'ningún lugar de reposo cae en la zona de acierto de un molde',
            fn: function () {
                var E = escena();
                Object.keys(E.DISPOSICIONES).forEach(function (n) {
                    var d = E.DISPOSICIONES[n];
                    var r = modulo().radios(Object.keys(d.moldes).map(function (k) { return d.moldes[k]; }), config().juego);
                    E.LUGARES.slice(0, d.lugares).forEach(function (l, i) {
                        Object.keys(d.moldes).forEach(function (k) {
                            cierto(distancia(l, d.moldes[k]) > r.acierto * 1.6, n + ' moldes: lugar ' + i + ' cerca del molde ' + k);
                        });
                    });
                });
            }
        },
        {
            descripcion: 'lugares y moldes quedan dentro del área visible en 4:3 (x 200..1400)',
            fn: function () {
                var E = escena();
                E.LUGARES.forEach(function (l, i) { cierto(l.x - 75 > 200 && l.x + 75 < 1400, 'lugar ' + i); });
                Object.keys(E.DISPOSICIONES).forEach(function (n) {
                    var m = E.DISPOSICIONES[n].moldes;
                    Object.keys(m).forEach(function (k) { cierto(m[k].x - 90 > 200 && m[k].x + 90 < 1400, 'molde ' + k); });
                });
            }
        },

        // ------------------------------------------------------------ reparto, frases y progreso
        {
            descripcion: 'repartir pone cada fruto en un lugar distinto',
            fn: function () {
                var R = modulo();
                for (var s = 1; s < 30; s++) {
                    var rep = R.repartir(['manzana', 'ciruela', 'pera'], 4, semilla(s));
                    var usados = {};
                    Object.keys(rep).forEach(function (k) {
                        cierto(rep[k] >= 0 && rep[k] < 4, 'lugar válido');
                        cierto(!usados[rep[k]], 'lugar repetido con semilla ' + s);
                        usados[rep[k]] = true;
                    });
                }
            }
        },
        {
            descripcion: 'el reparto cambia entre partidas',
            fn: function () {
                var R = modulo();
                var vistos = {};
                for (var s = 1; s < 40; s++) vistos[JSON.stringify(R.repartir(['manzana', 'ciruela', 'pera'], 4, semilla(s)))] = true;
                cierto(Object.keys(vistos).length > 5, 'repartos distintos: ' + Object.keys(vistos).length);
            }
        },
        {
            descripcion: 'las frases de acierto rotan sin repetirse seguidas',
            fn: function () {
                var R = modulo();
                var lista = config().textos.aciertos;
                for (var i = 0; i < 8; i++) cierto(R.frase(lista, i) !== R.frase(lista, i + 1), 'turno ' + i);
                igual(R.frase([], 0), '¡Muy bien!', 'sin lista');
            }
        },
        {
            descripcion: 'el nivel 1 termina solo con sus tres frutos colocados',
            fn: function () {
                var R = modulo(), c = config(), n1 = R.frutosNivel(c, 0);
                igual(R.completo({}, c, n1), false, '0');
                igual(R.completo({ manzana: true, pera: true }, c, n1), false, '2');
                igual(R.completo({ manzana: true, pera: true, ciruela: true }, c, n1), true, '3');
            }
        }
    ]
};
