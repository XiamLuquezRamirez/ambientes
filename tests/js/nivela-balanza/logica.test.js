'use strict';

module.exports = {
    nombre: 'Nivela la Balanza — lógica',
    casos: [
        {
            descripcion: 'carga el módulo NivelaBalanzaLogica',
            fn: function () {
                var L = cargarIIFE('public/catalogo_juegos/Multisaberes/CuentaLosObjetos/NivelaLaBalanza/logica.js', 'NivelaBalanzaLogica');
                if (!L) throw new Error('no se exportó NivelaBalanzaLogica');
            }
        }
    ]
};
