'use strict';

var fs = require('fs');
var path = require('path');

var RAIZ = path.resolve(__dirname, '..', '..', '..');
var BASE = 'public/catalogo_juegos/Polimotor/EnsamblajeNave/';

function modulo() {
    var R = cargarIIFE(BASE + 'reglas.js', 'ReglasNave');
    if (!R) throw new Error('no se exportó ReglasNave');
    return R;
}

/** La escena se carga sin Phaser: solo interesan sus huecos y el centro de la nave. */
function escena() {
    var E = cargarIIFE(BASE + 'escena-nave.js', 'EscenarioNave');
    if (!E) throw new Error('no se exportó EscenarioNave');
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

function soltar(id, distancias, ocupados) {
    var oc = ocupados || {};
    return {
        id: id,
        radio: 58,
        radioCasi: 150,
        destinos: Object.keys(distancias).map(function (k) { return { id: k, distancia: distancias[k], ocupado: !!oc[k] }; })
    };
}

function semilla(s) {
    return function () {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

module.exports = {
    nombre: 'El Ensamblaje de la Nave — reglas',
    casos: [
        {
            descripcion: 'carga ReglasNave y la escena sin Phaser',
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
            descripcion: 'la edad del catálogo es 5-6 años',
            fn: function () {
                igual(config().niveles.length, 1, 'un solo nivel de edad');
                igual(config().niveles[0].edad, '5-6 años', 'edad');
            }
        },
        {
            descripcion: 'tres naves distintas con 4, 5 y 6 piezas',
            fn: function () {
                var R = modulo(), c = config();
                var ns = R.niveles(c);
                igual(ns.length, 3, 'niveles');
                igual(R.piezasNivel(c, 0).length, 4, 'nivel 1');
                igual(R.piezasNivel(c, 1).length, 5, 'nivel 2');
                igual(R.piezasNivel(c, 2).length, 6, 'nivel 3');
                var naves = ns.map(function (n) { return n.nave; });
                igual(new Set(naves).size, 3, 'naves distintas');
            }
        },
        {
            descripcion: 'piezasNivel aplica la escala de la nave a los destinos',
            fn: function () {
                var R = modulo(), c = config();
                var n3 = R.nivel(c, 2);
                var antena = R.piezasNivel(c, 2).filter(function (p) { return p.id === 'antena'; })[0];
                var crudo = n3.piezas.filter(function (p) { return p.id === 'antena'; })[0];
                igual(Math.round(antena.y), Math.round(crudo.y * n3.escala), 'y escalada');
                igual(antena.nombre, 'Antena Radar', 'nombre visible');
            }
        },
        {
            descripcion: 'validar avisa si un nivel no tiene más piezas que el anterior',
            fn: function () {
                var c = config();
                c.nivelesJuego[1].piezas = c.nivelesJuego[1].piezas.slice(0, 4);
                var errores = modulo().validar(c);
                cierto(errores.some(function (e) { return /más piezas/.test(e); }), 'error de progresión');
            }
        },
        {
            descripcion: 'validar avisa de piezas repetidas en un nivel',
            fn: function () {
                var c = config();
                c.nivelesJuego[0].piezas[1] = { id: 'cabina', x: 0, y: 0 };
                var errores = modulo().validar(c);
                cierto(errores.some(function (e) { return /repetida/.test(e); }), 'error de repetida');
            }
        },

        // ------------------------------------------------------------ radios
        {
            descripcion: 'el radio de acierto nunca pasa del 45 % de la separación entre contornos',
            fn: function () {
                var R = modulo(), c = config();
                [0, 1, 2].forEach(function (i) {
                    var r = R.radios(R.piezasNivel(c, i), c.juego);
                    cierto(r.acierto <= r.separacion * 0.45 + 1e-9, 'nivel ' + (i + 1));
                    cierto(r.casi > r.acierto && r.cerca >= r.casi, 'orden de radios, nivel ' + (i + 1));
                    cierto(r.iman >= r.acierto && r.iman <= r.casi, 'imán, nivel ' + (i + 1));
                });
            }
        },
        {
            descripcion: 'la tolerancia es accesible: al menos 50 px de diseño en todos los niveles',
            fn: function () {
                var R = modulo(), c = config();
                [0, 1, 2].forEach(function (i) {
                    cierto(R.radios(R.piezasNivel(c, i), c.juego).acierto >= 50, 'nivel ' + (i + 1));
                });
            }
        },

        // ------------------------------------------------------------ evaluar
        {
            descripcion: 'su contorno dentro del radio es un encaje',
            fn: function () {
                var r = modulo().evaluar(soltar('cabina', { cabina: 20, panel: 300 }));
                igual(r.acierto, true, 'acierto');
                igual(r.motivo, 'correcto', 'motivo');
            }
        },
        {
            descripcion: 'su contorno gana aunque otro quede un poco más cerca',
            fn: function () {
                var r = modulo().evaluar(soltar('cabina', { cabina: 50, cono: 40 }));
                igual(r.motivo, 'correcto', 'motivo');
            }
        },
        {
            descripcion: 'cerca de su contorno pero fuera del radio es "casi"',
            fn: function () {
                var r = modulo().evaluar(soltar('propulsor', { propulsor: 110, cabina: 300 }));
                igual(r.acierto, false, 'acierto');
                igual(r.motivo, 'casi', 'motivo');
                igual(r.destino, 'propulsor', 'destino');
            }
        },
        {
            descripcion: 'soltar sobre el contorno de otra pieza es "otraPieza"',
            fn: function () {
                var r = modulo().evaluar(soltar('antena', { panel: 15, antena: 420 }));
                igual(r.motivo, 'otraPieza', 'motivo');
                igual(r.destino, 'panel', 'destino');
            }
        },
        {
            descripcion: 'otra pieza encima de otro contorno manda aunque su contorno esté en el "casi"',
            fn: function () {
                var r = modulo().evaluar(soltar('cabina', { cono: 20, cabina: 120 }));
                igual(r.motivo, 'otraPieza', 'motivo');
            }
        },
        {
            descripcion: 'lejos de todo es "fuera"',
            fn: function () {
                var r = modulo().evaluar(soltar('aleta', { aleta: 500, cabina: 400 }));
                igual(r.motivo, 'fuera', 'motivo');
                igual(r.destino, null, 'destino');
            }
        },
        {
            descripcion: 'un contorno ya ocupado no acepta otra vez',
            fn: function () {
                var r = modulo().evaluar(soltar('cabina', { cabina: 10 }, { cabina: true }));
                igual(r.acierto, false, 'acierto');
                igual(r.motivo, 'ocupado', 'motivo');
            }
        },

        // ------------------------------------------------------------ cercano e imán
        {
            descripcion: 'solo su contorno brilla al acercarse, con fuerza creciente',
            fn: function () {
                var R = modulo();
                igual(R.cercano('cabina', [{ id: 'cabina', distancia: 300 }], 200), null, 'lejos');
                var a = R.cercano('cabina', [{ id: 'cabina', distancia: 150 }], 200);
                var b = R.cercano('cabina', [{ id: 'cabina', distancia: 20 }], 200);
                cierto(a && b && b.fuerza > a.fuerza, 'más cerca, más fuerza');
                igual(R.cercano('cabina', [{ id: 'panel', distancia: 10 }], 200), null, 'otro contorno no brilla');
                igual(R.cercano('cabina', [{ id: 'cabina', distancia: 10, ocupado: true }], 200), null, 'ocupado no brilla');
            }
        },
        {
            descripcion: 'el imán es sutil: cero fuera del radio y nunca arrastra del todo',
            fn: function () {
                var R = modulo();
                igual(R.iman(120, 95, 0.3), 0, 'fuera del radio');
                cierto(R.iman(40, 95, 0.3) > R.iman(80, 95, 0.3), 'crece al acercarse');
                cierto(R.iman(0, 95, 0.3) <= 0.3, 'tope');
                cierto(R.iman(0, 95, 5) <= 0.6, 'tope absoluto');
            }
        },

        // ------------------------------------------------------------ bandeja y textos
        {
            descripcion: 'repartir da un hueco distinto a cada pieza',
            fn: function () {
                var R = modulo();
                var ids = ['cabina', 'panel', 'antena', 'propulsor', 'turbina', 'aleta'];
                var rep = R.repartir(ids, 6, semilla(7));
                var usados = ids.map(function (id) { return rep[id]; });
                igual(new Set(usados).size, 6, 'huecos únicos');
            }
        },
        {
            descripcion: 'la bandeja tiene un hueco por pieza en cada nivel',
            fn: function () {
                var E = escena();
                igual(E.numHuecos(4), 4, '4 piezas');
                igual(E.numHuecos(5), 5, '5 piezas');
                igual(E.numHuecos(6), 6, '6 piezas');
            }
        },
        {
            descripcion: 'completo solo con todas las piezas del nivel',
            fn: function () {
                var R = modulo();
                var lista = [{ id: 'a' }, { id: 'b' }];
                igual(R.completo({ a: true }, lista), false, 'falta una');
                igual(R.completo({ a: true, b: true }, lista), true, 'todas');
            }
        },
        {
            descripcion: 'los mensajes de error nunca son negativos',
            fn: function () {
                var t = config().textos;
                [t.casi, t.otraPieza, t.fuera].forEach(function (m) {
                    cierto(!/fallaste|mal|incorrect/i.test(m), 'mensaje: ' + m);
                });
                igual(t.casi, '¡Muy cerca! Intenta colocarla justo en el contorno.', 'texto de casi');
                igual(t.otraPieza, 'Busca el lugar que tiene la misma forma.', 'texto de otra pieza');
            }
        },
        {
            descripcion: 'la demo usa una pieza del nivel 1',
            fn: function () {
                var R = modulo(), c = config();
                cierto(R.piezasNivel(c, 0).some(function (p) { return p.id === c.demo.pieza; }), 'pieza de la demo');
            }
        }
    ]
};
