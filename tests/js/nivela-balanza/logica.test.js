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
