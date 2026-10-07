/**
 * Saludo post-PIN (/listo): arma el fondo como rompecabezas (encima del PIN cuando se llega desde él,
 * ver KioscoNav superponer) y lee el saludo en voz alta. Al terminar la voz monta debajo la página
 * siguiente (recorrido o juegos, precargada mientras hablaba), espera a que esté pintada y se
 * desarma encima de ella. Sin voz, avanza al cumplirse el tiempo mínimo de lectura.
 */
(function () {
    'use strict';

    /* ~8 palabras para un lector inicial (≈1 palabra/s); solo rige si no hubo voz. */
    var LECTURA_MIN_MS = 7000;
    /* Con voz, la vista se ve al menos esto aunque la frase sea corta. */
    var VISTA_MIN_MS = 3000;
    var INICIO_VOZ_MS = 600;
    var PAUSA_TRAS_VOZ_MS = 700;
    /* Chrome a veces no dispara onend: tope para no dejar al niño atascado. */
    var ESPERA_MAX_MS = 14000;
    /* La galería avisa con 'kiosco:vista-lista'; otras páginas no, y se espera solo un momento. */
    var ESPERA_VISTA_MS = 3000;
    var ESPERA_VISTA_SIN_AVISO_MS = 600;
    var ESPERA_IMAGENES_MS = 1500;

    var COLUMNAS = 5;
    var FILAS = 3;
    /* Espacio alrededor de la celda para las pestañas, en fracción de celda. */
    var MARGEN = 0.24;
    var VUELO_MS = 800;
    var ESCALON_MS = 70;
    var ENCAJE_MS = 650;
    /* Igual a la transición de filter de .bpz-pieza. */
    var SOMBRA_MS = 250;
    /* Si el CSS o la imagen no llegan en este tiempo, se muestra la vista sin animación. */
    var ESPERA_RECURSOS_MS = 2500;

    /* Media pestaña de un borde de celda en (u a lo largo, v hacia afuera); la otra mitad es simétrica. */
    var PESTANA = [
        [0.40, 0, 0.42, 0.05, 0.38, 0.10],
        [0.33, 0.17, 0.40, 0.22, 0.50, 0.22],
        [0.60, 0.22, 0.67, 0.17, 0.62, 0.10],
        [0.58, 0.05, 0.60, 0, 0.66, 0],
    ];

    var timers = [];
    var navegado = false;
    var precarga = null;
    var fraseActual = null;
    var lotePiezas = 0;
    /* Cancelar dispara onerror en la frase vieja: la generación descarta esos avisos tardíos. */
    var generacion = 0;

    /* init() corre en cada página del kiosco: solo se cancela la voz propia del saludo. */
    function limpiar() {
        generacion++;
        timers.forEach(clearTimeout);
        timers = [];
        if (fraseActual && window.speechSynthesis) window.speechSynthesis.cancel();
        fraseActual = null;
    }

    function despues(ms, fn) {
        var miGeneracion = generacion;
        timers.push(setTimeout(function () {
            if (miGeneracion === generacion) fn();
        }, ms));
    }

    /* La bienvenida que se está desarmando encima de la página siguiente ya no es la "actual". */
    function wrapActual() {
        return document.querySelector('.bienambiente-wrap[data-redirect-inicio]:not([data-kiosco-saliente])');
    }

    /* Conserva la query (?abrir=juegos) para navegar sin recargar. */
    function destinoDe(wrap) {
        var url = wrap.getAttribute('data-redirect-inicio');
        if (!url) return null;
        var pathConQuery = url;
        if (url.startsWith('http')) {
            var parsed = new URL(url);
            pathConQuery = parsed.pathname + parsed.search;
        }
        var porKiosco = !!(window.KioscoNav && window.KioscoNav.esRutaKiosco(pathConQuery.split('?')[0]));
        return { url: url, path: pathConQuery, porKiosco: porKiosco };
    }

    function precargarDestino(wrap) {
        var destino = destinoDe(wrap);
        if (destino && destino.porKiosco && typeof window.KioscoNav.precargar === 'function') {
            precarga = window.KioscoNav.precargar(destino.path);
        }
    }

    function irAlRecorrido() {
        var wrap = wrapActual();
        if (!wrap || navegado) return;

        var destino = destinoDe(wrap);
        if (!destino) return;

        navegado = true;
        limpiar();

        if (!destino.porKiosco) {
            window.location.href = destino.url;
            return;
        }

        if (!puedeAnimar(wrap)) {
            window.KioscoNav.ir(destino.path, false, { precarga: precarga });
            return;
        }

        /* Se escucha antes de montar: la galería puede avisar en cuanto se monta. */
        var avisoVista = esperarAviso('kiosco:vista-lista', ESPERA_VISTA_MS);
        window.KioscoNav.ir(destino.path, false, { debajo: true, precarga: precarga }).then(function () {
            if (!wrap.isConnected) return;
            return esperarVistaSiguiente(avisoVista).then(function () {
                return desarmar(wrap);
            });
        }).catch(function () {
            window.KioscoNav.terminarSuperposicion();
        });
    }

    /* Sin gesto previo del usuario (recarga completa) Chrome rechaza speak() con 'not-allowed'. */
    function hablar(texto, alTerminar) {
        var terminado = false;
        var frase = null;
        var miGeneracion = generacion;
        function fin(seEscucho) {
            if (terminado || miGeneracion !== generacion) return;
            terminado = true;
            if (fraseActual === frase) fraseActual = null;
            alTerminar(seEscucho);
        }
        try {
            frase = new SpeechSynthesisUtterance(texto);
            frase.lang = 'es-CO';
            frase.rate = 0.9;
            frase.onend = function () { fin(true); };
            frase.onerror = function () { fin(false); };
            window.speechSynthesis.cancel();
            fraseActual = frase;
            window.speechSynthesis.speak(frase);
        } catch (e) {
            fin(false);
        }
    }

    function iniciarSaludo(wrap) {
        var texto = (wrap.getAttribute('data-voz') || '').trim();
        var conVoz = !!(texto && window.speechSynthesis && window.SpeechSynthesisUtterance);
        var inicio = Date.now();

        precargarDestino(wrap);
        despues(ESPERA_MAX_MS, irAlRecorrido);

        if (!conVoz) {
            despues(LECTURA_MIN_MS, irAlRecorrido);
            return;
        }

        despues(INICIO_VOZ_MS, function () {
            hablar(texto, function (seEscucho) {
                /* Si la voz falló, el niño tiene que leerlo: se respeta el mínimo de lectura. */
                var minimo = seEscucho ? VISTA_MIN_MS : LECTURA_MIN_MS;
                var restante = Math.max(minimo - (Date.now() - inicio), seEscucho ? PAUSA_TRAS_VOZ_MS : 0);
                despues(restante, irAlRecorrido);
            });
        });
    }

    function esperarAviso(nombre, maxMs) {
        return new Promise(function (resolve) {
            var timer = setTimeout(listo, maxMs);
            function listo() {
                clearTimeout(timer);
                document.removeEventListener(nombre, listo);
                resolve();
            }
            document.addEventListener(nombre, listo);
        });
    }

    function esperar(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    function cargarImagen(src) {
        return new Promise(function (resolve) {
            var img = new Image();
            img.onload = function () {
                if (img.decode) img.decode().then(resolve, resolve);
                else resolve();
            };
            img.onerror = resolve;
            img.src = src;
        });
    }

    /* Imágenes y fondos CSS de la página nueva, para que no aparezcan a medias al desarmar. */
    function esperarImagenes(raices) {
        var fuentes = [];
        raices.forEach(function (raiz) {
            raiz.querySelectorAll('img').forEach(function (img) {
                if (img.currentSrc || img.src) fuentes.push(img.currentSrc || img.src);
            });
            [raiz].concat(Array.from(raiz.querySelectorAll('.bj-galeria, .rn-kiosco-shell'))).forEach(function (el) {
                var fondo = getComputedStyle(el).backgroundImage || '';
                var m = fondo.match(/url\(["']?([^"')]+)["']?\)/);
                if (m) fuentes.push(m[1]);
            });
        });
        return Promise.race([Promise.all(fuentes.map(cargarImagen)), esperar(ESPERA_IMAGENES_MS)]);
    }

    function esperarVistaSiguiente(avisoVista) {
        var pane = document.getElementById('kioscoPane');
        var raices = pane ? Array.from(pane.children).filter(function (el) {
            return !el.hasAttribute('data-kiosco-saliente');
        }) : [];
        var esGaleria = raices.some(function (el) { return !!el.querySelector('[data-ui="banco-juegos"]'); });
        var pintada = esGaleria ? avisoVista : esperar(ESPERA_VISTA_SIN_AVISO_MS);

        return pintada.then(function () {
            return esperarImagenes(raices);
        }).then(function () {
            /* Dos cuadros: que el navegador pinte la página antes de empezar a destaparla. */
            return new Promise(function (resolve) {
                requestAnimationFrame(function () { requestAnimationFrame(resolve); });
            });
        });
    }

    /* ── Rompecabezas ─────────────────────────────────────────── */

    function num(n) {
        return Math.round(n * 10000) / 10000;
    }

    /* Recorre un borde de la celda unitaria; d: 1 pestaña hacia afuera, -1 hueco, 0 borde recto. */
    function borde(mapa, d) {
        function p(u, v) {
            var xy = mapa(u, v * d);
            return num(xy[0]) + ' ' + num(xy[1]);
        }
        if (!d) return ' L' + p(1, 0);

        var trazo = ' L' + p(0.34, 0);
        PESTANA.forEach(function (c) {
            trazo += ' C' + p(c[0], c[1]) + ' ' + p(c[2], c[3]) + ' ' + p(c[4], c[5]);
        });
        return trazo + ' L' + p(1, 0);
    }

    function trazoPieza(arriba, derecha, abajo, izquierda) {
        return 'M0 0'
            + borde(function (u, v) { return [u, -v]; }, arriba)
            + borde(function (u, v) { return [1 + v, u]; }, derecha)
            + borde(function (u, v) { return [1 - u, 1 + v]; }, abajo)
            + borde(function (u, v) { return [-v, 1 - u]; }, izquierda)
            + ' Z';
    }

    function azar() {
        return Math.random() < 0.5 ? 1 : -1;
    }

    function barajar(lista) {
        for (var i = lista.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = lista[i];
            lista[i] = lista[j];
            lista[j] = t;
        }
        return lista;
    }

    /* contenido: elementos de la escena que viajan dentro de cada pieza (copias recortadas con ella). */
    function crearPiezas(escena, fondo, contenido) {
        var NS = 'http://www.w3.org/2000/svg';
        var contenedor = document.createElement('div');
        contenedor.className = 'bpz';
        contenedor.setAttribute('aria-hidden', 'true');

        var svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('class', 'bpz-defs');
        var defs = document.createElementNS(NS, 'defs');
        svg.appendChild(defs);
        contenedor.appendChild(svg);

        /* Cada borde interno se sortea una vez: lo que es pestaña en una pieza es hueco en la vecina. */
        var horizontales = [];
        var verticales = [];
        for (var f = 0; f < FILAS; f++) {
            horizontales.push([]);
            verticales.push([]);
            for (var c = 0; c < COLUMNAS; c++) {
                horizontales[f].push(azar());
                verticales[f].push(azar());
            }
        }

        var lado = 1 + 2 * MARGEN;
        var escala = 1 / lado;
        var desplazamiento = MARGEN / lado;
        var anchoEscena = escena.clientWidth;
        var altoEscena = escena.clientHeight;
        var anchoCelda = anchoEscena / COLUMNAS;
        var altoCelda = altoEscena / FILAS;
        var piezas = [];
        var lote = ++lotePiezas;

        for (var fila = 0; fila < FILAS; fila++) {
            for (var col = 0; col < COLUMNAS; col++) {
                var id = 'bpz-' + lote + '-' + fila + '-' + col;
                var arriba = fila === 0 ? 0 : -horizontales[fila][col];
                var abajo = fila === FILAS - 1 ? 0 : horizontales[fila + 1][col];
                var izquierda = col === 0 ? 0 : -verticales[fila][col];
                var derecha = col === COLUMNAS - 1 ? 0 : verticales[fila][col + 1];

                var clip = document.createElementNS(NS, 'clipPath');
                clip.setAttribute('id', id);
                clip.setAttribute('clipPathUnits', 'objectBoundingBox');
                var path = document.createElementNS(NS, 'path');
                path.setAttribute('d', trazoPieza(arriba, derecha, abajo, izquierda));
                path.setAttribute('transform', 'translate(' + num(desplazamiento) + ' ' + num(desplazamiento) + ') scale(' + num(escala) + ')');
                clip.appendChild(path);
                defs.appendChild(clip);

                var pieza = document.createElement('div');
                pieza.className = 'bpz-pieza';
                pieza.style.left = ((col - MARGEN) / COLUMNAS * 100) + '%';
                pieza.style.top = ((fila - MARGEN) / FILAS * 100) + '%';
                pieza.style.width = (lado / COLUMNAS * 100) + '%';
                pieza.style.height = (lado / FILAS * 100) + '%';

                var imagen = document.createElement('div');
                imagen.className = 'bpz-pieza__img';
                imagen.style.clipPath = 'url(#' + id + ')';
                imagen.style.backgroundImage = 'url("' + fondo + '")';
                imagen.style.backgroundSize = anchoEscena + 'px ' + altoEscena + 'px';
                imagen.style.backgroundPosition = (-(col - MARGEN) * anchoCelda) + 'px ' + (-(fila - MARGEN) * altoCelda) + 'px';
                if (contenido && contenido.length) {
                    var lienzo = document.createElement('div');
                    lienzo.className = 'bpz-lienzo';
                    lienzo.style.width = anchoEscena + 'px';
                    lienzo.style.height = altoEscena + 'px';
                    lienzo.style.left = (-(col - MARGEN) * anchoCelda) + 'px';
                    lienzo.style.top = (-(fila - MARGEN) * altoCelda) + 'px';
                    contenido.forEach(function (el) { lienzo.appendChild(el.cloneNode(true)); });
                    imagen.appendChild(lienzo);
                }
                pieza.appendChild(imagen);
                contenedor.appendChild(pieza);

                piezas.push({
                    el: pieza,
                    cx: ((col + 0.5) / COLUMNAS - 0.5) * anchoEscena,
                    cy: ((fila + 0.5) / FILAS - 0.5) * altoEscena,
                });
            }
        }

        var brillo = document.createElement('div');
        brillo.className = 'bpz-brillo';
        contenedor.appendChild(brillo);

        escena.insertBefore(contenedor, escena.firstChild);
        return { contenedor: contenedor, piezas: piezas, anchoEscena: anchoEscena };
    }

    /*
     * Las piezas llegan desde afuera en orden aleatorio; la del centro cae al final, como la que cierra el armado.
     * salida: la misma animación en reversa (direction 'reverse' también invierte la curva), en orden inverso
     * —la del centro se va primero— y después del encaje deshecho.
     */
    function animarVuelo(armado, salida) {
        var centro = Math.floor(FILAS / 2) * COLUMNAS + Math.floor(COLUMNAS / 2);
        var ultima = armado.piezas[centro];
        var orden = barajar(armado.piezas.filter(function (p) { return p !== ultima; }));
        orden.push(ultima);
        if (salida) orden.reverse();

        var distanciaBase = armado.anchoEscena * 0.6;

        return orden.map(function (p, i) {
            var inicio;
            if (p === ultima) {
                inicio = 'translate(0px, ' + (-armado.anchoEscena * 0.04) + 'px) rotate(10deg) scale(1.9)';
            } else {
                var angulo = Math.atan2(p.cy, p.cx) + (Math.random() - 0.5) * 0.9;
                var distancia = distanciaBase * (0.85 + Math.random() * 0.4);
                var giro = azar() * (25 + Math.random() * 50);
                inicio = 'translate(' + Math.round(Math.cos(angulo) * distancia) + 'px, '
                    + Math.round(Math.sin(angulo) * distancia) + 'px) rotate(' + Math.round(giro) + 'deg) scale(.6)';
            }

            return p.el.animate([
                { transform: inicio, opacity: 0 },
                { opacity: 1, offset: 0.3 },
                { transform: 'none', opacity: 1 },
            ], {
                duration: VUELO_MS,
                delay: (salida ? ENCAJE_MS : 0) + i * ESCALON_MS,
                easing: 'cubic-bezier(.2, 1.15, .35, 1)',
                fill: 'both',
                direction: salida ? 'reverse' : 'normal',
            });
        });
    }

    function puedeAnimar(wrap) {
        var escena = wrap.querySelector('.bienambiente-escena');
        var reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        return !!(escena && !reducido && typeof escena.animate === 'function'
            && typeof window.KioscoNav.terminarSuperposicion === 'function');
    }

    /* La página siguiente ya está montada debajo; al terminar se retira la bienvenida. */
    function desarmar(wrap) {
        var escena = wrap.querySelector('.bienambiente-escena');
        var fondo = wrap.getAttribute('data-fondo');
        var contenido = Array.from(wrap.querySelectorAll('.bienambiente-nino, .bienambiente-mensaje'));

        function retirar() {
            window.KioscoNav.terminarSuperposicion();
        }

        if (!fondo) {
            return wrap.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' })
                .finished.then(retirar, retirar);
        }

        /*
         * Lo inverso del armado, con el niño y el mensaje dentro de las piezas: se deshace el encaje
         * (brillo y pulso), vuelven las sombras y la vista entera se rompe y se va.
         * Las piezas son idénticas a la escena y reemplazan al original en el mismo cuadro: no se nota el cambio.
         */
        var armado = crearPiezas(escena, fondo, contenido);
        armado.contenedor.classList.add('is-encajado', 'is-desencajando');
        wrap.classList.add('is-desarmando');
        pulsoEncaje(escena);

        var vuelos = animarVuelo(armado, true);
        setTimeout(function () {
            armado.contenedor.classList.remove('is-encajado');
        }, ENCAJE_MS - SOMBRA_MS);

        return Promise.all(vuelos.map(function (a) { return a.finished; })).then(retirar, retirar);
    }

    function pulsoEncaje(escena) {
        escena.animate([
            { transform: 'scale(1)' },
            { transform: 'scale(1.015)', offset: 0.4 },
            { transform: 'scale(1)' },
        ], { duration: 450, easing: 'ease-out' });
    }

    function cssListo(escena) {
        return getComputedStyle(escena).position === 'absolute';
    }

    /* KioscoNav agrega el CSS de la página sin esperar a que cargue; también hace falta la imagen decodificada. */
    function esperarRecursos(escena, fondo, listo, sinAnimacion) {
        var miGeneracion = generacion;
        var imagenLista = false;
        var terminado = false;
        var limite = Date.now() + ESPERA_RECURSOS_MS;

        var img = new Image();
        function marcarImagen() {
            imagenLista = true;
        }
        img.onload = function () {
            if (img.decode) img.decode().then(marcarImagen, marcarImagen);
            else marcarImagen();
        };
        img.onerror = function () {
            limite = 0;
        };
        img.src = fondo;

        (function revisar() {
            if (terminado || miGeneracion !== generacion) return;
            if (imagenLista && cssListo(escena)) {
                terminado = true;
                listo();
                return;
            }
            if (Date.now() >= limite) {
                terminado = true;
                sinAnimacion();
                return;
            }
            requestAnimationFrame(revisar);
        })();
    }

    function armarRompecabezas(wrap, alTerminar) {
        var escena = wrap.querySelector('.bienambiente-escena');
        var fondo = wrap.getAttribute('data-fondo');
        var reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var miGeneracion = generacion;

        function revelar() {
            if (miGeneracion !== generacion) return;
            wrap.classList.remove('is-armando');
            /* Tras el PIN, la vista se armó encima de él: ya cubre la pantalla y el PIN puede retirarse. */
            if (window.KioscoNav && typeof window.KioscoNav.terminarSuperposicion === 'function') {
                window.KioscoNav.terminarSuperposicion();
            }
            alTerminar();
        }

        if (!escena || !fondo || reducido || typeof escena.animate !== 'function') {
            revelar();
            return;
        }

        esperarRecursos(escena, fondo, function () {
            var armado = crearPiezas(escena, fondo);
            var vuelos = animarVuelo(armado);

            Promise.all(vuelos.map(function (a) { return a.finished; })).then(function () {
                if (miGeneracion !== generacion) return;

                armado.contenedor.classList.add('is-encajado');
                pulsoEncaje(escena);

                despues(ENCAJE_MS, function () {
                    /* El fondo real queda debajo de las piezas, que son idénticas: al quitarlas no se nota el corte. */
                    revelar();
                    armado.contenedor.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' })
                        .finished.then(function () { armado.contenedor.remove(); }, function () { armado.contenedor.remove(); });
                });
            }, function () {
                armado.contenedor.remove();
                revelar();
            });
        }, revelar);
    }

    function init() {
        limpiar();
        navegado = false;
        precarga = null;

        var wrap = wrapActual();
        if (!wrap) return;

        armarRompecabezas(wrap, function () {
            iniciarSaludo(wrap);
        });
    }

    window.KioscoBienvenida = { init: init };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
