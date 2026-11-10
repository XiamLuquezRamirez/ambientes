/**
 * habitacion.js — Cuarto animado detrás del "Rompecabezas del cuerpo humano".
 * Solo visual: script.js lo avisa (arrastre, acierto, error, final).
 *   - Fondo SVG: lámparas que se balancean, repisa con cubos, cuadros decorativos
 *     (no muestran partes: se confundían con las fichas) y un tapete con luces.
 *   - Cada parte colocada hace un gesto EN SU LUGAR (la cabeza asiente, brazos y manos
 *     laten, las piernas dan un pasito, el tronco respira) y Zoe dice su nombre. Nada
 *     se levanta: al girar una parte se ve el corte con su vecina.
 *   - Final: fiesta (luces de colores, bola de espejos), galería, baile y despedida.
 */
(function (global) {
    'use strict';

    var doc = global.document;
    var fondo = null;
    var capa = null;
    var svg = null;
    var tapete = null;
    var colocadasOrden = [];
    var temporizador = null;
    var FORMAS = 'path, circle, ellipse, rect, polygon, polyline, line, image';

    function reducido() {
        return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function esperar(ms) {
        return new Promise(function (r) { setTimeout(r, reducido() ? Math.min(ms, 150) : ms); });
    }

    function sonar(nombre, opts) {
        if (typeof global.sonarEvento === 'function') {
            try { global.sonarEvento(nombre, opts); } catch (e) { /* noop */ }
        }
    }

    function figura() {
        return doc.getElementById('figura-svg');
    }

    function parte(id) {
        return doc.querySelector('#figura-svg .svg-parte[data-id="' + id + '"]');
    }

    function unirRects(els) {
        var l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
        Array.prototype.forEach.call(els, function (el) {
            var x = el.getBoundingClientRect();
            if (x.width < 1 || x.height < 1) return;
            l = Math.min(l, x.left); t = Math.min(t, x.top);
            r = Math.max(r, x.right); b = Math.max(b, x.bottom);
        });
        if (l === Infinity) return null;
        return { left: l, top: t, right: r, bottom: b, width: r - l, height: b - t };
    }

    /** Lo pintado de una parte (la caja de su <svg> interno es mayor que el dibujo). */
    function rectDe(el) {
        if (!el) return null;
        return unirRects(el.querySelectorAll(FORMAS)) || el.getBoundingClientRect();
    }

    function rectFigura() {
        return unirRects(doc.querySelectorAll('#figura-svg .svg-parte :is(' + FORMAS + ')'));
    }

    /* ── Fondo SVG ──────────────────────────────────────────── */

    function lampara(x, clase) {
        return '<g transform="translate(' + x + ' 0)"><g class="hab-lampara ' + clase + '">' +
            '<polygon class="hab-luz" points="-26,132 26,132 260,900 -260,900" fill="url(#hab-luz)"/>' +
            '<line x1="0" y1="0" x2="0" y2="70" stroke="#2f2a45" stroke-width="5"/>' +
            '<path d="M-12 70 h24 v14 l26 48 h-76 l26 -48 Z" fill="#3b3557"/>' +
            '<ellipse class="hab-bombillo" cx="0" cy="134" rx="16" ry="7" fill="#fff3bf"/>' +
            '</g></g>';
    }

    /** Cuadro decorativo de la pared (dibujos, no partes del cuerpo). */
    function cuadro(x, y, giro, dibujo) {
        return '<g transform="translate(' + x + ' ' + y + ') rotate(' + giro + ')">' +
            '<rect x="-70" y="-86" width="140" height="172" rx="6" fill="#ffe9e3" stroke="#d9b8c4" stroke-width="5"/>' +
            dibujo + '</g>';
    }

    var FLOR = '<g fill="#c9b6e4"><circle cx="0" cy="-34" r="14"/><circle cx="18" cy="-18" r="14"/>' +
        '<circle cx="0" cy="-2" r="14"/><circle cx="-18" cy="-18" r="14"/></g>' +
        '<circle cx="0" cy="-18" r="9" fill="#ffd8a8"/>' +
        '<path d="M0 -4 V60 M0 30 q18 -6 24 -22 M0 42 q-18 -6 -24 -20" stroke="#a9d18e" stroke-width="5" fill="none"/>';

    function construirFondo() {
        fondo.innerHTML =
            '<svg class="hab-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' +
            '<defs>' +
            '<linearGradient id="hab-pared" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#8f79b8"/><stop offset="1" stop-color="#7f68a8"/></linearGradient>' +
            '<linearGradient id="hab-luz" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#fff6d6" stop-opacity="0.42"/><stop offset="1" stop-color="#fff6d6" stop-opacity="0"/></linearGradient>' +
            '<pattern id="hab-tapiz" width="90" height="90" patternUnits="userSpaceOnUse">' +
            '<circle cx="20" cy="20" r="4" fill="#ffffff" opacity=".12"/><circle cx="65" cy="62" r="3" fill="#ffffff" opacity=".1"/></pattern>' +
            '</defs>' +
            '<rect width="1600" height="900" fill="url(#hab-pared)"/>' +
            '<rect class="hab-pared-color" width="1600" height="900" fill="url(#hab-tapiz)"/>' +
            // Cuadro decorativo de la pared (a la derecha quedaba entre las fichas).
            cuadro(120, 150, -4, FLOR) +
            // Repisa con cubos que se mecen.
            '<g transform="translate(20 520)">' +
            '<rect x="0" y="0" width="230" height="200" rx="6" fill="#e9b07a"/>' +
            '<rect x="14" y="16" width="92" height="76" rx="6" fill="#cf8a52"/><rect x="124" y="16" width="92" height="76" rx="6" fill="#cf8a52"/>' +
            '<rect x="14" y="108" width="92" height="76" rx="6" fill="#cf8a52"/><rect x="124" y="108" width="92" height="76" rx="6" fill="#cf8a52"/>' +
            '<rect x="134" y="132" width="72" height="50" rx="6" fill="#3ba7e0"/>' +
            '<rect x="30" y="56" width="66" height="10" fill="#8f79b8"/><rect x="26" y="68" width="74" height="10" fill="#94c11f"/>' +
            '<g class="hab-cubo c1"><rect x="20" y="-56" width="54" height="54" rx="4" fill="#e64980"/></g>' +
            '<g class="hab-cubo c2"><rect x="80" y="-56" width="54" height="54" rx="4" fill="#ffd43b"/></g>' +
            '<g class="hab-cubo c3"><rect x="50" y="-110" width="54" height="54" rx="4" fill="#1cb5e0"/></g>' +
            '<g class="hab-pelota"><circle cx="186" cy="-26" r="24" fill="#ff922b"/><path d="M162 -26 a24 24 0 0 0 48 0" fill="#ffd43b"/></g>' +
            '</g>' +
            // Zócalo y piso.
            '<rect x="0" y="716" width="1600" height="20" fill="#f6ebe0"/>' +
            '<rect x="0" y="736" width="1600" height="164" fill="#f1ab7f"/>' +
            '<path d="M0 820 Q800 770 1600 820 V900 H0 Z" fill="#f6bb8f"/>' +
            lampara(420, 'l1') + lampara(1060, 'l2') +
            '<rect class="hab-sombra" width="1600" height="900" fill="#1a1033"/>' +
            '<rect class="hab-destello" width="1600" height="900" fill="#69db7c"/>' +
            '</svg>' +
            '<div class="hab-tapete" aria-hidden="true"><div class="hab-tapete-luces"></div></div>';
        svg = fondo.querySelector('svg');
        tapete = fondo.querySelector('.hab-tapete');
        var luces = tapete.querySelector('.hab-tapete-luces');
        for (var i = 0; i < 16; i++) {
            var l = doc.createElement('span');
            var ang = (i / 16) * Math.PI * 2;
            l.style.setProperty('--i', i);
            l.style.left = (50 + 44 * Math.cos(ang)).toFixed(1) + '%';
            l.style.top = (50 + 38 * Math.sin(ang)).toFixed(1) + '%';
            luces.appendChild(l);
        }
    }

    /** El tapete queda bajo los pies de la figura (va en la capa del fondo, detrás). */
    function ubicarTapete() {
        var r = rectFigura();
        if (!tapete || !r) return;
        var ancho = Math.max(180, r.width * 1.45);
        var alto = ancho * 0.2;
        tapete.style.width = Math.round(ancho) + 'px';
        tapete.style.height = Math.round(alto) + 'px';
        tapete.style.left = Math.round(r.left + r.width / 2 - ancho / 2) + 'px';
        tapete.style.top = Math.round(r.bottom - alto * 0.55) + 'px';
        tapete.hidden = false;
    }

    function estado(clase, ms) {
        if (!svg) return;
        [svg, tapete].forEach(function (el) {
            if (!el) return;
            el.classList.remove('ok', 'error');
            void el.offsetWidth;
            el.classList.add(clase);
        });
        svg.querySelector('.hab-destello').setAttribute('fill', clase === 'ok' ? '#69db7c' : '#ff6b6b');
        clearTimeout(temporizador);
        temporizador = setTimeout(function () {
            svg.classList.remove(clase);
            if (tapete) tapete.classList.remove(clase);
        }, ms);
    }

    /** "pie_der" → "Pie derecho": sin guiones y con mayúscula inicial. */
    function nombreBonito(id, nombre) {
        var n = String(nombre || id || '');
        if (/_/.test(n) || n === id) {
            var partes = n.split('_');
            var femenino = /^(pierna|mano)/.test(partes[0]);
            n = partes.map(function (w) {
                if (w === 'der') return femenino ? 'derecha' : 'derecho';
                if (w === 'izq') return femenino ? 'izquierda' : 'izquierdo';
                return w;
            }).join(' ');
        }
        n = n.trim().toLowerCase();
        return n.charAt(0).toUpperCase() + n.slice(1);
    }

    function urlParte(id) {
        if (typeof global.archivoSvgPieza !== 'function' || typeof global.rutaPieza !== 'function') return '';
        var archivo = global.archivoSvgPieza(id);
        return archivo ? global.rutaPieza(archivo, 'color') : '';
    }

    /* ── Gestos de las partes ───────────────────────────────── */

    /**
     * Anima una o varias partes alrededor de un mismo pivote (en pantalla). Cada
     * .svg-parte tiene su translate(x%, y%) en línea: el pivote se pasa a las
     * coordenadas de cada una y la animación repite ese translate.
     */
    function animarPartes(partes, pivote, clase, vars, ms) {
        var fig = figura();
        if (!fig || !partes.length) return Promise.resolve();
        var ctm = fig.getScreenCTM();
        var vb = fig.viewBox && fig.viewBox.baseVal;
        if (!ctm || !vb) return Promise.resolve();
        var pt = fig.createSVGPoint();
        pt.x = pivote.x;
        pt.y = pivote.y;
        var p = pt.matrixTransform(ctm.inverse());
        // Escala pantalla → unidades del SVG (para saltos en px de pantalla).
        var esc = 1 / (ctm.a || 1);
        partes.forEach(function (g) {
            var m = /translate\(\s*([-\d.]+)%\s*,\s*([-\d.]+)%\s*\)/.exec(g.style.transform || '');
            var px = m ? parseFloat(m[1]) : 0;
            var py = m ? parseFloat(m[2]) : 0;
            g.style.setProperty('--tx', px + '%');
            g.style.setProperty('--ty', py + '%');
            Object.keys(vars || {}).forEach(function (k) {
                var v = vars[k];
                g.style.setProperty(k, typeof v === 'number' ? (v * esc).toFixed(1) + 'px' : v);
            });
            g.style.transformOrigin = (p.x - (px / 100) * vb.width).toFixed(1) + 'px ' +
                (p.y - (py / 100) * vb.height).toFixed(1) + 'px';
            g.classList.remove(clase);
            void g.getBoundingClientRect();
            g.classList.add(clase);
        });
        return esperar(ms).then(function () {
            partes.forEach(function (g) { g.classList.remove(clase); });
        });
    }

    function gesto(id) {
        var g = parte(id);
        if (!g || reducido()) return Promise.resolve();
        var r = rectDe(g);
        if (!r) return Promise.resolve();

        if (id === 'cabeza') {
            return animarPartes([g], { x: r.left + r.width / 2, y: r.bottom }, 'hab-asiente', null, 1100);
        }
        if (/^brazo|^mano/.test(id)) {
            // Late en su lugar: girarlo dejaría ver el corte con el tronco o la mano.
            return animarPartes([g], { x: r.left + r.width / 2, y: r.top + r.height / 2 }, 'hab-latido', null, 900);
        }
        if (/^pierna|^pie/.test(id)) {
            var conPie = [g];
            var pie = parte(id.replace('pierna', 'pie'));
            if (id.indexOf('pierna') === 0 && pie && pie !== g && pie.classList.contains('colocada')) conPie.push(pie);
            return animarPartes(conPie, { x: r.left + r.width / 2, y: r.bottom }, 'hab-paso',
                { '--salto': -Math.max(10, r.height * 0.12) }, 800);
        }
        // Tronco: respira.
        return animarPartes([g], { x: r.left + r.width / 2, y: r.bottom }, 'hab-respira', null, 1600);
    }

    /* ── Final ──────────────────────────────────────────────── */

    function confeti(cantidad) {
        if (reducido()) return;
        var colores = ['#ffd43b', '#ff6b6b', '#4dabf7', '#69db7c', '#e599f7', '#ffa94d'];
        for (var i = 0; i < cantidad; i++) {
            var c = doc.createElement('span');
            c.className = 'hab-confeti';
            c.style.left = (Math.random() * 100) + 'vw';
            c.style.background = colores[i % colores.length];
            c.style.setProperty('--dx', Math.round(Math.random() * 160 - 80) + 'px');
            c.style.setProperty('--giro', Math.round(Math.random() * 720 - 360) + 'deg');
            c.style.animationDuration = (2.2 + Math.random() * 1.6).toFixed(2) + 's';
            c.style.animationDelay = (Math.random() * 0.8).toFixed(2) + 's';
            capa.appendChild(c);
            setTimeout(function (el) { return function () { el.remove(); }; }(c), 4800);
        }
    }

    var Habitacion = {
        iniciar: function () {
            fondo = doc.getElementById('hab-fondo');
            capa = doc.getElementById('hab-capa');
            if (!fondo || !capa) return;
            construirFondo();
            tapete.hidden = true;
            global.addEventListener('resize', ubicarTapete);
        },

        /** Al armar el tablero: el tapete se ubica bajo la figura. */
        listo: function () {
            colocadasOrden = [];
            setTimeout(ubicarTapete, 60);
            setTimeout(ubicarTapete, 700);
        },

        /** Mientras se arrastra, el cuarto se atenúa y la silueta brilla. */
        arrastre: function (activo) {
            if (svg) svg.classList.toggle('arrastrando', !!activo);
            var fig = figura();
            if (fig) fig.classList.toggle('hab-brilla', !!activo);
        },

        acierto: function (id, nombre, hablar) {
            estado('ok', 1100);
            nombre = nombreBonito(id, nombre);
            if (!colocadasOrden.some(function (p) { return p.id === id; })) {
                colocadasOrden.push({ id: id, nombre: nombre });
            }
            ubicarTapete();
            if (hablar && nombre) hablar(nombre);
            return gesto(id);
        },

        error: function () {
            estado('error', 900);
        },

        /** Fiesta: luces de colores, bola de espejos, baile, repaso de partes y despedida. */
        final: function (opts) {
            opts = opts || {};
            doc.body.classList.add('hab-final');
            if (svg) svg.classList.add('fiesta');
            if (tapete) tapete.classList.add('fiesta');

            var bola = doc.createElement('div');
            bola.className = 'hab-bola';
            bola.innerHTML = '<span class="hab-bola-cuerda"></span><span class="hab-bola-esfera"></span>';
            capa.appendChild(bola);
            setTimeout(function () { bola.classList.add('baja'); }, 30);
            sonar('aparece');

            // Galería donde estaba la bandeja: aparecen todas las partes, una por una.
            var todas = colocadasOrden.slice();
            var bandeja = doc.getElementById('bandeja');
            var rb = bandeja ? bandeja.getBoundingClientRect() : null;
            var galeria = doc.createElement('div');
            galeria.className = 'hab-galeria';
            if (rb && rb.width) {
                galeria.style.left = Math.round(rb.left) + 'px';
                galeria.style.top = Math.round(rb.top) + 'px';
                galeria.style.width = Math.round(rb.width) + 'px';
                galeria.style.height = Math.round(rb.height) + 'px';
            }
            todas.forEach(function (p, i) {
                var c = doc.createElement('figure');
                c.className = 'hab-galeria-carta';
                c.style.animationDelay = (0.4 + i * 0.35) + 's';
                var url = urlParte(p.id);
                c.innerHTML = (url ? '<img src="' + url + '" alt="">' : '') + '<figcaption></figcaption>';
                c.querySelector('figcaption').textContent = p.nombre || '';
                galeria.appendChild(c);
            });
            capa.appendChild(galeria);

            var lz = doc.getElementById('lienzo');
            if (lz) lz.classList.add('hab-baila');
            var nombres = [];
            todas.forEach(function (p) {
                var n = String(p.nombre || '').toLowerCase();
                if (n && nombres.indexOf(n) < 0) nombres.push(n);
            });
            var frase = nombres.length ? '¡' + nombres.join(', ') + '!' : '';
            var voz = opts.hablar && frase ? opts.hablar(frase) : null;

            // Baila el cuerpo entero (rebote y balanceo): los brazos no se levantan.
            return esperar(3200)
                .then(function () { return Promise.race([Promise.resolve(voz), esperar(2500)]); })
                .then(function () {
                    confeti(90);
                    sonar('correcto');
                    var adios = opts.hablar && opts.despedida ? opts.hablar(opts.despedida) : null;
                    return Promise.race([Promise.resolve(adios), esperar(2600)]);
                })
                .then(function () {
                    if (lz) lz.classList.remove('hab-baila');
                    return esperar(400);
                });
        }
    };

    global.Habitacion = Habitacion;
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { Habitacion.iniciar(); });
    else Habitacion.iniciar();
})(window);
