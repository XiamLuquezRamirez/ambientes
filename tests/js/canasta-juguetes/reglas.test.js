'use strict';

var fs = require('fs');
var path = require('path');

var RAIZ = path.resolve(__dirname, '..', '..', '..');
var BASE = 'public/catalogo_juegos/Polimotor/CanastaJuguetesZoeZeus/';
var RUTA = BASE + 'reglas.js';

function modulo() {
    var R = cargarIIFE(RUTA, 'ReglasCanasta');
    if (!R) throw new Error('no se exportó ReglasCanasta');
    return R;
}

function config() {
    return JSON.parse(fs.readFileSync(path.join(RAIZ, BASE, 'config.json'), 'utf8'));
}

function juguetes() {
    var J = cargarIIFE(BASE + 'juguetes.js', 'JuguetesCanasta');
    if (!J) throw new Error('no se exportó JuguetesCanasta');
    return J;
}

function igual(real, esperado, que) {
    if (real !== esperado) {
        throw new Error(que + ': se esperaba ' + esperado + ' y llegó ' + real);
    }
}

function cierto(valor, que) {
    if (!valor) throw new Error(que + ': se esperaba un valor verdadero');
}

/** Monta el objeto que espera evaluar() a partir de distancias por zona. */
function caso(zonaObjetivo, distancias, extra) {
    var o = {
        guardado: false,
        zonaObjetivo: zonaObjetivo,
        zonas: Object.keys(distancias).map(function (id) {
            return { id: id, distancia: distancias[id] };
        }),
        radio: 80,
        atraer: 110,
        punteroEnObjetivo: false
    };
    Object.keys(extra || {}).forEach(function (k) { o[k] = extra[k]; });
    return o;
}

module.exports = {
    nombre: 'La canasta de juguetes — reglas',
    casos: [
        {
            descripcion: 'carga el módulo ReglasCanasta',
            fn: function () { modulo(); }
        },

        // ------------------------------------------------------------ evaluar
        {
            descripcion: 'acierta cuando el juguete cae dentro del radio de su caja',
            fn: function () {
                var R = modulo();
                var r = R.evaluar(caso('roja', { roja: 40, azul: 300 }));
                igual(r.acierto, true, 'acierto');
                igual(r.motivo, 'ok', 'motivo');
                igual(r.atraido, false, 'no hizo falta atraer');
            }
        },
        {
            descripcion: 'atrae el juguete si cae un poco antes de la caja correcta',
            fn: function () {
                var R = modulo();
                var r = R.evaluar(caso('roja', { roja: 100, azul: 300 }));
                igual(r.acierto, true, 'acierto por atracción');
                igual(r.atraido, true, 'marcado como atraído');
            }
        },
        {
            descripcion: 'no acierta si el juguete queda dentro de otra caja',
            fn: function () {
                var R = modulo();
                var r = R.evaluar(caso('roja', { roja: 300, azul: 30 }));
                igual(r.acierto, false, 'no acierta');
                igual(r.motivo, 'incorrecta', 'motivo');
            }
        },
        {
            descripcion: 'la caja ajena gana aunque la propia esté en rango de atracción',
            fn: function () {
                var R = modulo();
                var r = R.evaluar(caso('roja', { roja: 105, azul: 40 }));
                igual(r.acierto, false, 'la caja ajena manda');
                igual(r.motivo, 'incorrecta', 'motivo');
            }
        },
        {
            descripcion: 'soltar en medio de la nada devuelve "lejos", no un error',
            fn: function () {
                var R = modulo();
                var r = R.evaluar(caso('roja', { roja: 400, azul: 420 }));
                igual(r.acierto, false, 'no acierta');
                igual(r.motivo, 'lejos', 'motivo');
            }
        },
        {
            descripcion: 'el puntero dentro de la caja propia vale aunque el juguete quede lejos',
            fn: function () {
                var R = modulo();
                var r = R.evaluar(caso('roja', { roja: 400, azul: 420 }, { punteroEnObjetivo: true }));
                igual(r.acierto, true, 'acierto por puntero');
            }
        },
        {
            descripcion: 'un juguete ya guardado no se vuelve a contar',
            fn: function () {
                var R = modulo();
                var r = R.evaluar(caso('roja', { roja: 10 }, { guardado: true }));
                igual(r.acierto, false, 'no acierta');
                igual(r.motivo, 'ya', 'motivo');
            }
        },
        {
            descripcion: 'sin zonas no revienta: responde "lejos"',
            fn: function () {
                var R = modulo();
                igual(R.evaluar(caso('roja', {})).motivo, 'lejos', 'motivo');
            }
        },

        // ------------------------------------------------------------- radiosDe
        {
            descripcion: 'radiosDe nunca deja el radio por encima del de atracción',
            fn: function () {
                var R = modulo();
                var r = R.radiosDe([{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 400, y: 0 }], {});
                cierto(r.radio < r.atraer, 'radio < atraer');
                igual(r.separacion, 200, 'separación mínima');
            }
        },
        {
            descripcion: 'con cajas muy juntas la atracción no invade la caja vecina',
            fn: function () {
                var R = modulo();
                var r = R.radiosDe([{ x: 0, y: 0 }, { x: 60, y: 0 }], { radioMin: 74 });
                cierto(r.atraer <= 30, 'la atracción no pasa de media separación');
                cierto(r.radio < r.atraer, 'queda margen de atracción');
                cierto(r.radio > 0, 'el radio sigue siendo positivo');
            }
        },
        {
            descripcion: 'radiosDe con una sola caja usa la separación por defecto',
            fn: function () {
                var R = modulo();
                var r = R.radiosDe([{ x: 10, y: 10 }], {});
                igual(r.separacion, 240, 'separación por defecto');
                cierto(r.radio > 0, 'radio positivo');
            }
        },

        // -------------------------------------------------------------- config
        {
            descripcion: 'el config del juego pasa su propia revisión',
            fn: function () {
                var R = modulo();
                var problemas = R.revisarJuego(config());
                if (problemas.length) throw new Error(problemas.join(' | '));
            }
        },
        {
            descripcion: 'revisarJuego detecta un objeto que no cae en la zona que declara',
            fn: function () {
                var R = modulo();
                var c = config();
                c.nivelesJuego[0].objetos[0].zona = 'caja-pelota';
                cierto(R.revisarJuego(c).length > 0, 'debería quejarse');
            }
        },
        {
            descripcion: 'los tres niveles suben de 3 a 5 y a 8 juguetes',
            fn: function () {
                var R = modulo();
                var lista = R.niveles(config());
                igual(lista.length, 3, 'número de niveles');
                igual(lista[0].objetos.length, 3, 'nivel 1');
                igual(lista[1].objetos.length, 5, 'nivel 2');
                igual(lista[2].objetos.length, 8, 'nivel 3');
            }
        },
        {
            descripcion: 'cada zona acepta exactamente los juguetes que la declaran',
            fn: function () {
                var R = modulo();
                R.niveles(config()).forEach(function (n, i) {
                    var aceptados = [];
                    n.zonas.forEach(function (z) { aceptados = aceptados.concat(z.acepta || []); });
                    igual(aceptados.length, n.objetos.length, 'nivel ' + (i + 1) + ': total aceptado');
                    n.objetos.forEach(function (o) {
                        cierto(aceptados.indexOf(o.id) >= 0, 'nivel ' + (i + 1) + ': ' + o.id + ' aceptado');
                    });
                });
            }
        },

        // ------------------------------------------------------- nivel 2: color
        {
            descripcion: 'en el nivel 2 cada pieza lleva el color de la caja que la acepta',
            fn: function () {
                var R = modulo();
                var n2 = R.nivel(config(), 1);
                // El nombre de la caja («caja roja») dice su color; la pieza debe traer ese mismo.
                n2.objetos.forEach(function (o) {
                    var color = String(o.tipo).split(':')[1];
                    cierto(color, o.id + ' declara color en el tipo');
                    var zona = n2.zonas.filter(function (z) { return z.id === o.zona; })[0];
                    cierto(zona, o.id + ' apunta a una zona que existe');
                    // «rojo» y «roja» comparten raíz: comparamos sin la vocal de género.
                    var raiz = color.replace(/[oa]$/, '');
                    cierto(
                        String(zona.nombre).indexOf(raiz) >= 0,
                        o.id + ' (' + color + ') no casa con «' + zona.nombre + '»'
                    );
                });
            }
        },
        {
            descripcion: 'los cinco colores del nivel 2 son distintos entre sí',
            fn: function () {
                var R = modulo();
                var n2 = R.nivel(config(), 1);
                var vistos = {};
                n2.objetos.forEach(function (o) {
                    var color = String(o.tipo).split(':')[1];
                    cierto(!vistos[color], 'color repetido: ' + color);
                    vistos[color] = true;
                });
                igual(Object.keys(vistos).length, 5, 'cinco colores');
            }
        },

        // ------------------------------------------------------------- dibujos
        {
            descripcion: 'todos los tipos del config tienen dibujo',
            fn: function () {
                var R = modulo();
                var J = juguetes();
                R.niveles(config()).forEach(function (n, i) {
                    n.objetos.forEach(function (o) {
                        var html = J.dibujar(o.tipo);
                        cierto(html && html.length > 80, 'nivel ' + (i + 1) + ': falta dibujo de ' + o.tipo);
                    });
                    n.zonas.forEach(function (z) {
                        if (!z.marca) return;
                        cierto(J.dibujar(z.marca).length > 80, 'falta la marca ' + z.marca);
                    });
                });
            }
        },
        {
            descripcion: 'una forma coloreada cambia de color con el sufijo',
            fn: function () {
                var J = juguetes();
                var rojo = J.dibujar('estrella:rojo');
                var azul = J.dibujar('estrella:azul');
                cierto(rojo !== azul, 'el color cambia el SVG');
                cierto(rojo.indexOf('#ff6b6b') >= 0, 'la estrella roja usa el rojo de la paleta');
                cierto(azul.indexOf('#4dabf7') >= 0, 'la estrella azul usa el azul de la paleta');
            }
        },
        {
            descripcion: 'un tipo desconocido devuelve cadena vacía, no un error',
            fn: function () {
                var J = juguetes();
                igual(J.dibujar('no-existe'), '', 'tipo inventado');
                igual(J.dibujar(''), '', 'tipo vacío');
            }
        },

        // -------------------------------------------------------------- textos
        {
            descripcion: 'plantilla sustituye las claves entre llaves',
            fn: function () {
                var R = modulo();
                igual(R.plantilla('Van {n} de {total}', { n: 2, total: 5 }), 'Van 2 de 5', 'sustitución');
                igual(R.plantilla('sin claves', {}), 'sin claves', 'texto suelto');
                igual(R.plantilla(null, {}), '', 'texto nulo');
            }
        },
        {
            descripcion: 'cada nivel trae las frases que la partida necesita',
            fn: function () {
                var R = modulo();
                R.niveles(config()).forEach(function (n, i) {
                    ['zoe', 'zeus', 'demoVoz', 'pista', 'listo'].forEach(function (k) {
                        cierto(n[k] && n[k].length > 4, 'nivel ' + (i + 1) + ': falta ' + k);
                    });
                });
            }
        }
    ]
};
