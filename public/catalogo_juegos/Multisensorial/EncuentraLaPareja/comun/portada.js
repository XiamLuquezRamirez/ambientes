/**
 * Encuentra la Pareja — portada propia de cada juego.
 *
 * Las tarjetas de la pantalla de inicio eran iguales en los 8 juegos (campana, flor y helado planos).
 * Aquí cada juego muestra sus propios protagonistas con las ilustraciones de PedniaArte: el objeto
 * del reto, el sentido que lo percibe y algo de su escenario. Se carga después de script.js.
 */
(function () {
    'use strict';

    var ITEMS = {
        ConQueSentidoSentimosLaCampana: ['campana', 'oreja', 'tambor', 'maraca'],
        ConQueSentidoSentimosLaFlor: ['flor', 'nariz', 'flor_amarilla', 'maceta'],
        ConQueSentidoSentimosElHelado: ['helado', 'boca', 'galleta', 'manzana'],
        ConQueSentidoSentimosElSol: ['sol_completo', 'ojo_completo', 'nube', 'estrella'],
        ConectandoLaCampanaAudicion: ['campana', 'oreja', 'pandereta', 'tambor'],
        ConectandoLaFlorOlfato: ['flor_morada', 'nariz', 'maceta', 'flor'],
        ConectandoElHeladoGusto: ['helado', 'boca', 'fresa', 'bola_choco'],
        ConectandoElSolVista: ['sol_completo', 'ojo_completo', 'estrella', 'farol']
    };

    function aplicar() {
        if (!window.PedniaArte) return;
        var partes = window.location.pathname.split('/');
        var carpeta = partes[partes.length - 2] || '';
        var lista = ITEMS[carpeta];
        if (!lista) return;
        var spans = document.querySelectorAll('.inicio-elementos .inicio-el');
        Array.prototype.forEach.call(spans, function (s, i) {
            var img = s.querySelector('img');
            var nombre = lista[i];
            if (!img || !nombre) return;
            var url = window.PedniaArte.dataURL(nombre, 220);
            if (!url) return;
            img.removeAttribute('data-laboratorio');
            img.src = url;
        });
    }

    if (window.jQuery) window.jQuery(aplicar);
    else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aplicar);
    else aplicar();
})();
