/**
 * Al cargar config.json de un juego, superpone la condición guardada en localStorage
 * al iniciar la sesión del niño. No reescribe el archivo del paquete.
 *
 * Solo entra un perfil de inclusión o uno personalizado. El personalizado ya viene
 * resuelto por el servidor si la asignación está activa.
 */
(function () {
    'use strict';

    var CLAVE = 'pednia.perfilJuego';

    function leer() {
        try {
            var datos = JSON.parse(localStorage.getItem(CLAVE) || '');
            return datos && typeof datos === 'object' ? datos : null;
        } catch (e) {
            return null;
        }
    }

    function mezclar(base, sobre) {
        if (!sobre || typeof sobre !== 'object' || Array.isArray(sobre)) {
            return sobre;
        }
        var salida = base && typeof base === 'object' && !Array.isArray(base) ? Object.assign({}, base) : {};
        Object.keys(sobre).forEach(function (k) {
            salida[k] = mezclar(salida[k], sobre[k]);
        });
        return salida;
    }

    function valorParaJuego(clave, valor) {
        if (clave === 'umbralEnceste' && typeof valor === 'number' && valor > 1) {
            return valor / 100;
        }
        return valor;
    }

    function aplicar(config) {
        if (!config || typeof config !== 'object') return config;
        var datos = leer();
        if (!datos || !datos.estudiante_id) return config;
        if (datos.tipo !== 'inclusion' && datos.tipo !== 'personalizado') return config;

        var valores = datos.valores || {};
        var claves = Array.isArray(datos.claves_juego) ? datos.claves_juego : [];
        if (!config.accesibilidad || typeof config.accesibilidad !== 'object') {
            config.accesibilidad = {};
        }

        claves.forEach(function (clave) {
            if (!Object.prototype.hasOwnProperty.call(valores, clave)) return;
            var valor = valorParaJuego(clave, valores[clave]);
            if (valor && typeof valor === 'object') {
                config.accesibilidad[clave] = mezclar(config.accesibilidad[clave], valor);
                if (Object.prototype.hasOwnProperty.call(config, clave)) {
                    config[clave] = mezclar(config[clave], valor);
                }
            } else {
                config.accesibilidad[clave] = valor;
                if (Object.prototype.hasOwnProperty.call(config, clave)) {
                    config[clave] = valor;
                }
            }
        });

        return config;
    }

    window.PedniaPerfilJuego = { aplicar: aplicar, clave: CLAVE };

    var abrir = XMLHttpRequest.prototype.open;
    var enviar = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (metodo, url) {
        this.__pedniaUrl = String(url || '');
        return abrir.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function () {
        var xhr = this;
        var url = (xhr.__pedniaUrl || '').split('?')[0];
        var esConfig = /(?:^|\/)config\.json$/.test(url);
        var resultado = enviar.apply(this, arguments);

        if (!esConfig || xhr.status !== 200 || !xhr.responseText) return resultado;

        try {
            var data = JSON.parse(xhr.responseText);
            aplicar(data);
            var texto = JSON.stringify(data);
            Object.defineProperty(xhr, 'responseText', {
                configurable: true,
                get: function () { return texto; },
            });
            Object.defineProperty(xhr, 'response', {
                configurable: true,
                get: function () { return texto; },
            });
        } catch (e) {
            /* si el config no es JSON, el juego sigue con el archivo original */
        }

        return resultado;
    };
})();
