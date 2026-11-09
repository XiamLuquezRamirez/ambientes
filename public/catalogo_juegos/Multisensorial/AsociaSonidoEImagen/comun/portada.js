/**
 * Asocia sonido e imagen — portada propia de cada juego.
 *
 * Las tarjetas de la pantalla de inicio eran los mismos SVG planos en los 11 juegos. Aquí cada
 * juego muestra los objetos de su propio reto, dibujados completos con PedniaArte (objetos.js).
 * Se carga después de script.js.
 */
(function () {
    'use strict';

    var ITEMS = {
        QueSuena: ['bicicleta', 'telefono', 'reloj'],
        QueObjetoSuena: ['telefono', 'avion', 'aspiradora'],
        EscuchaYAsocia: ['reloj', 'bicicleta', 'tren'],
        UnSonidoDeViaje: ['avion', 'tren', 'ambulancia'],
        QueEscuchaste: ['tren', 'telefono', 'reloj'],
        SonidoYObjeto: ['puerta', 'ventana', 'cajon', 'telefono'],
        SonidoDeUnaMaquina: ['aspiradora', 'secador', 'licuadora', 'ventilador'],
        SonidoDeTransporte: ['ambulancia', 'camion', 'tren', 'motocicleta'],
        SonidoDeUnaAccion: ['aplaudiendo', 'corriendo', 'saltando', 'durmiendo'],
        SonidoDelAgua: ['pluma', 'ducha', 'fuente', 'regadera'],
        LaGranAsociacion: ['movil', 'reloj', 'bicicleta', 'puerta']
    };

    function dibujo(id) {
        var A = window.PedniaArte;
        if (A.existe('portada_' + id)) return 'portada_' + id;
        if (id === 'fuente') return 'fuente_piedra';
        return id;
    }

    function aplicar() {
        if (!window.PedniaArte) return;
        var partes = window.location.pathname.split('/');
        var lista = ITEMS[partes[partes.length - 2] || ''];
        if (!lista) return;
        var spans = document.querySelectorAll('.inicio-elementos .inicio-el');
        Array.prototype.forEach.call(spans, function (s, i) {
            var img = s.querySelector('img');
            if (!img) return;
            img.removeAttribute('data-laboratorio');
            var id = lista[i];
            if (!id) {
                s.style.display = 'none';
                return;
            }
            // Las acciones las pone fotos3d() con los personajes 3D (si la página los carga).
            if (POSES[id] && document.querySelector('script[src*="personajes3d"]')) return;
            var url = window.PedniaArte.dataURL(dibujo(id), 220);
            if (url) img.src = url;
        });
    }

    /* Las acciones las hacen Zeus y Zoe en 3D (los modelos del proyecto), no niños dibujados. */
    var POSES = {
        aplaudiendo: { modelos: [{ modelo: 'nino', clip: 'Aplaudir', t: 0.5, x: -0.45, alto: 1.5 }, { modelo: 'nina', clip: 'Aplaudir', t: 0.8, x: 0.45, alto: 1.5 }] },
        corriendo: { modelos: [{ modelo: 'nino', clip: 'Correr', t: 0.3, mira: 'derecha' }] },
        saltando: { modelos: [{ modelo: 'nina', clip: 'Saltar', t: 0.45 }] },
        durmiendo: { cama: true, modelos: [{ modelo: 'nino', clip: 'Quieto', tumbado: true, alto: 1.1, x: 0, y: 0.12 }] }
    };

    function fotos3d() {
        var partes = window.location.pathname.split('/');
        var lista = ITEMS[partes[partes.length - 2] || ''];
        if (!lista || !window.AsociaPj3D || !window.AsociaPj3D.foto) return;
        var spans = document.querySelectorAll('.inicio-elementos .inicio-el');
        Array.prototype.forEach.call(spans, function (s, i) {
            var pose = POSES[lista[i]];
            var img = s.querySelector('img');
            if (!pose || !img) return;
            var spec = { tam: 220, modelos: pose.modelos };
            if (pose.cama && window.PedniaArte) spec.fondo = window.PedniaArte.dataURL('cama', 220);
            window.AsociaPj3D.foto(spec).then(function (url) { img.src = url; }).catch(function () { /* queda el dibujo */ });
        });
    }

    if (window.AsociaPj3D) fotos3d();
    else window.addEventListener('asocia-pj3d-listo', fotos3d, { once: true });

    if (window.jQuery) window.jQuery(aplicar);
    else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aplicar);
    else aplicar();
})();
