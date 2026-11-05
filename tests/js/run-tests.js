'use strict';

var fs = require('fs');
var path = require('path');

var RAIZ = path.resolve(__dirname, '..', '..');

global.cargarIIFE = function (rutaRelativa, nombreGlobal) {
    var codigo = fs.readFileSync(path.join(RAIZ, rutaRelativa), 'utf8');
    var objeto = {};
    new Function('global', codigo).call(objeto, objeto);
    return objeto[nombreGlobal];
};

function buscarTests(dir) {
    var encontrados = [];
    fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entrada) {
        var ruta = path.join(dir, entrada.name);
        if (entrada.isDirectory()) {
            encontrados = encontrados.concat(buscarTests(ruta));
        } else if (/\.test\.js$/.test(entrada.name)) {
            encontrados.push(ruta);
        }
    });
    return encontrados;
}

var total = 0;
var fallos = 0;

buscarTests(__dirname).sort().forEach(function (archivo) {
    var suite = require(archivo);
    console.log('\n' + suite.nombre);
    suite.casos.forEach(function (caso) {
        total++;
        try {
            caso.fn();
            console.log('  ✓ ' + caso.descripcion);
        } catch (e) {
            fallos++;
            console.log('  ✗ ' + caso.descripcion);
            console.log('      ' + (e && e.message ? e.message : e));
        }
    });
});

console.log('\n' + (total - fallos) + ' de ' + total + ' pruebas correctas');
process.exit(fallos > 0 ? 1 : 0);
