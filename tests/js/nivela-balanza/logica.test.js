'use strict';

var RUTA = 'public/catalogo_juegos/Multisaberes/CuentaLosObjetos/NivelaLaBalanza/logica.js';

function modulo() {
    var L = cargarIIFE(RUTA, 'NivelaBalanzaLogica');
    if (!L) throw new Error('no se exportó NivelaBalanzaLogica');
    return L;
}

function igual(real, esperado, que) {
    if (real !== esperado) {
        throw new Error(que + ': se esperaba ' + esperado + ' y llegó ' + real);
    }
}

module.exports = {
    nombre: 'Nivela la Balanza — lógica',
    casos: [
        {
            descripcion: 'carga el módulo NivelaBalanzaLogica',
            fn: function () { modulo(); }
        },
        {
            descripcion: 'cantidadObjetivo acepta enteros y rechaza basura',
            fn: function () {
                var L = modulo();
                igual(L.cantidadObjetivo({ cantidadObjetivo: 6 }), 6, 'entero');
                igual(L.cantidadObjetivo({ cantidadObjetivo: '6' }), 6, 'cadena numérica');
                igual(L.cantidadObjetivo({}), null, 'sin campo');
                igual(L.cantidadObjetivo({ cantidadObjetivo: 0 }), null, 'cero');
                igual(L.cantidadObjetivo({ cantidadObjetivo: 'abc' }), null, 'no numérico');
            }
        },
        {
            descripcion: 'el depósito siempre deja margen sobre el objetivo',
            fn: function () {
                var L = modulo();
                igual(L.cristalesEnDeposito({ cantidadObjetivo: 4, cristalesEnDeposito: 8 }), 8, 'respeta el pedido');
                igual(L.cristalesEnDeposito({ cantidadObjetivo: 4, cristalesEnDeposito: 4 }), 6, 'fuerza margen');
                igual(L.cristalesEnDeposito({ cantidadObjetivo: 10 }), 12, 'sin pedido');
                igual(L.cristalesEnDeposito({}), 0, 'reto inválido');
            }
        },
        {
            descripcion: 'estadoBalanza clasifica verde, amarillo y rojo',
            fn: function () {
                var L = modulo();
                igual(L.estadoBalanza(4, 4).estado, 'verde', 'iguales');
                igual(L.estadoBalanza(4, 4).inclinacionGrados, 0, 'sin inclinación');
                igual(L.estadoBalanza(4, 3).estado, 'amarillo', 'falta uno');
                igual(L.estadoBalanza(3, 4).estado, 'amarillo', 'sobra uno');
                igual(L.estadoBalanza(4, 2).estado, 'rojo', 'faltan dos');
                if (!(L.estadoBalanza(4, 3).inclinacionGrados > 0)) throw new Error('la izquierda debe pesar');
                if (!(L.estadoBalanza(3, 4).inclinacionGrados < 0)) throw new Error('la derecha debe pesar');
            }
        },
        {
            descripcion: 'la inclinación satura en el tope sin invertirse',
            fn: function () {
                var L = modulo();
                igual(L.estadoBalanza(10, 0).inclinacionGrados, L.GRADOS_MAX, 'tope positivo');
                igual(L.estadoBalanza(0, 10).inclinacionGrados, -L.GRADOS_MAX, 'tope negativo');
            }
        },
        {
            descripcion: 'esVictoria exige igualdad exacta con cristales puestos',
            fn: function () {
                var L = modulo();
                igual(L.esVictoria(4, 4), true, 'iguales');
                igual(L.esVictoria(0, 0), false, 'vacío no gana');
                igual(L.esVictoria(4, 5), false, 'de más');
                igual(L.esVictoria(4, 3), false, 'de menos');
            }
        },
        {
            descripcion: 'retosValidos descarta retos malformados',
            fn: function () {
                var L = modulo();
                var lista = L.retosValidos({ retos: [{ cantidadObjetivo: 4 }, {}, { cantidadObjetivo: 6 }] });
                igual(lista.length, 2, 'descarta el vacío');
                igual(L.retosValidos(null).length, 0, 'nivel nulo');
            }
        },
        {
            descripcion: 'retosValidos acepta retos con rango aleatorio',
            fn: function () {
                var L = modulo();
                var lista = L.retosValidos({
                    retos: [{ cantidadMin: 3, cantidadMax: 5 }, {}, { cantidadMin: 7, cantidadMax: 10 }]
                });
                igual(lista.length, 2, 'acepta los dos con rango');
            }
        },
        {
            descripcion: 'sortearObjetivo respeta el rango del reto',
            fn: function () {
                var L = modulo();
                igual(L.sortearObjetivo({ cantidadMin: 4, cantidadMax: 7 }, function () { return 0; }), 4, 'extremo bajo');
                igual(L.sortearObjetivo({ cantidadMin: 4, cantidadMax: 7 }, function () { return 0.999; }), 7, 'extremo alto');
                igual(L.sortearObjetivo({ cantidadMin: 6, cantidadMax: 6 }, function () { return 0.5; }), 6, 'rango de uno');
            }
        },
        {
            descripcion: 'sortearObjetivo acota a los topes 3 y 10 del juego',
            fn: function () {
                var L = modulo();
                igual(L.OBJETIVO_MIN, 3, 'mínimo del juego');
                igual(L.OBJETIVO_MAX, 10, 'máximo del juego');
                igual(L.sortearObjetivo({ cantidadMin: 1, cantidadMax: 2 }, function () { return 0; }), 3, 'sube al mínimo');
                igual(L.sortearObjetivo({ cantidadMin: 12, cantidadMax: 20 }, function () { return 0; }), 12, 'min por encima del tope manda');
                igual(L.sortearObjetivo({ cantidadMin: 8, cantidadMax: 40 }, function () { return 0.999; }), 10, 'recorta al máximo');
            }
        },
        {
            descripcion: 'sortearObjetivo sin rango cae en el objetivo fijo',
            fn: function () {
                var L = modulo();
                igual(L.sortearObjetivo({ cantidadObjetivo: 6 }, function () { return 0.5; }), 6, 'usa el fijo');
                igual(L.sortearObjetivo({}, function () { return 0.5; }), null, 'sin nada');
            }
        },
        {
            descripcion: 'toda ronda sorteada cae dentro de 3 y 10',
            fn: function () {
                var L = modulo();
                var retos = [
                    { cantidadMin: 3, cantidadMax: 5 }, { cantidadMin: 4, cantidadMax: 7 },
                    { cantidadMin: 6, cantidadMax: 9 }, { cantidadMin: 7, cantidadMax: 10 }
                ];
                var i, j;
                for (i = 0; i < retos.length; i++) {
                    for (j = 0; j <= 20; j++) {
                        var e = L.crearEstado(retos[i], function () { return j / 21; });
                        if (e.objetivo < 3 || e.objetivo > 10) {
                            throw new Error('objetivo fuera de rango: ' + e.objetivo);
                        }
                        if (e.deposito.length < e.objetivo + 2) {
                            throw new Error('depósito sin margen: ' + e.deposito.length + ' para ' + e.objetivo);
                        }
                    }
                }
            }
        },
        {
            descripcion: 'plantilla sustituye solo las marcas conocidas',
            fn: function () {
                var L = modulo();
                igual(L.plantilla('Hay {cantidad} cristales', { cantidad: 6 }), 'Hay 6 cristales', 'cantidad');
                igual(L.plantilla('Faltan {faltan}', { faltan: 2 }), 'Faltan 2', 'faltan');
                igual(L.plantilla('sin marcas', {}), 'sin marcas', 'sin marcas');
            }
        },
        {
            descripcion: 'crearEstado reparte los ids al depósito',
            fn: function () {
                var L = modulo();
                var e = L.crearEstado({ cantidadObjetivo: 4, cristalesEnDeposito: 6 });
                igual(e.objetivo, 4, 'objetivo');
                igual(e.deposito.length, 6, 'depósito');
                igual(e.colocados.length, 0, 'colocados');
            }
        },
        {
            descripcion: 'colocar y retirar no duplican ni restan de más',
            fn: function () {
                var L = modulo();
                var e = L.crearEstado({ cantidadObjetivo: 4, cristalesEnDeposito: 6 });

                igual(L.colocar(e, 'c0'), true, 'coloca');
                igual(e.colocados.length, 1, 'uno colocado');
                igual(L.colocar(e, 'c0'), false, 'no recoloca');
                igual(e.colocados.length, 1, 'sigue en uno');
                igual(L.colocar(e, 'cZZ'), false, 'id inexistente');
                igual(e.colocados.length, 1, 'sin cambios');

                igual(L.retirar(e, 'c0'), true, 'retira');
                igual(e.colocados.length, 0, 'ninguno colocado');
                igual(e.deposito.length, 6, 'vuelve al depósito');
                igual(L.retirar(e, 'c0'), false, 'no re-retira');
                igual(e.colocados.length, 0, 'sin negativos');
            }
        },
        {
            descripcion: 'conteo refleja objetivo y colocados',
            fn: function () {
                var L = modulo();
                var e = L.crearEstado({ cantidadObjetivo: 4, cristalesEnDeposito: 6 });
                L.colocar(e, 'c1');
                L.colocar(e, 'c2');
                igual(L.conteo(e).izquierda, 4, 'izquierda');
                igual(L.conteo(e).derecha, 2, 'derecha');
            }
        }
    ]
};
