/**
 * fondo-vivo.js — Sala de teatro animada (SVG) detrás de Memoria Corporal.
 * Solo visual: la lógica del juego la avisa con FondoVivo.fase / acierto / error,
 * y los reflectores siguen a la opción que el niño señala.
 */
(function (global) {
    'use strict';

    var doc = global.document;
    var NS = 'http://www.w3.org/2000/svg';
    var raiz = null;
    var svg = null;
    var haces = [];
    var confeti = null;
    var temporizador = null;
    var apuntado = null;

    var ORIGENES = [{ x: 170, y: -20 }, { x: 1430, y: -20 }];
    var COLORES = ['#ffd43b', '#ff8787', '#74c0fc', '#8ce99a', '#ffa94d', '#e599f7'];

    function reducido() {
        return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function bombillas() {
        var out = '';
        var n = 24;
        for (var i = 0; i < n; i++) {
            var t = i / (n - 1);
            var x = 40 + t * 1520;
            var y = 70 + Math.sin(t * Math.PI * 3) * 26 + 34;
            out += '<circle class="fv-bombilla" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="9" ' +
                'fill="' + COLORES[i % COLORES.length] + '" style="--i:' + i + '"/>';
        }
        return out;
    }

    function espectadores(fila) {
        var out = '';
        var n = fila === 0 ? 14 : 12;
        var paso = 1600 / n;
        var base = fila === 0 ? 900 : 840;
        var tam = fila === 0 ? 1 : 0.82;
        var color = fila === 0 ? '#070d24' : '#111a3d';
        for (var i = 0; i < n; i++) {
            var x = paso * i + (fila === 0 ? paso / 2 : paso);
            out += '<g class="fv-persona" style="--i:' + (i + fila * 3) + '" transform="translate(' + x.toFixed(1) + ' ' + base + ') scale(' + tam + ')">' +
                '<g class="fv-cuerpo">' +
                '<path class="fv-brazos" d="M-58 -58 L-82 -150 M58 -58 L82 -150" stroke="' + color + '" stroke-width="20" stroke-linecap="round" fill="none"/>' +
                '<path d="M-70 0 Q-70 -78 0 -82 Q70 -78 70 0 Z" fill="' + color + '"/>' +
                '<circle cx="0" cy="-118" r="38" fill="' + color + '"/>' +
                '</g></g>';
        }
        return out;
    }

    function destellos() {
        var out = '';
        for (var i = 0; i < 12; i++) {
            var x = 90 + ((i * 137) % 1420);
            var y = 380 + ((i * 89) % 300);
            out += '<path class="fv-destello" style="--i:' + i + '" transform="translate(' + x + ' ' + y + ')" ' +
                'd="M0 -12 L3 -3 L12 0 L3 3 L0 12 L-3 3 L-12 0 L-3 -3 Z" fill="' + COLORES[i % COLORES.length] + '"/>';
        }
        return out;
    }

    function haz(i) {
        var o = ORIGENES[i];
        return '<g transform="translate(' + o.x + ' ' + o.y + ')">' +
            '<g class="fv-barrido ' + (i ? 'der' : 'izq') + '">' +
            '<g class="fv-haz" data-haz="' + i + '">' +
            '<polygon class="fv-cono" points="-16,0 16,0 150,1150 -150,1150"/>' +
            '</g></g>' +
            '<circle r="26" fill="#2b3a67" stroke="#ffd43b" stroke-width="5"/>' +
            '</g>';
    }

    function construir() {
        raiz = doc.getElementById('fondo-vivo');
        if (!raiz) return false;
        raiz.innerHTML =
            '<svg class="fv" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
            '<defs>' +
            '<linearGradient id="fv-pared" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#0f1b3d"/><stop offset="0.65" stop-color="#1f3a78"/><stop offset="1" stop-color="#172c5c"/>' +
            '</linearGradient>' +
            '<linearGradient id="fv-luz" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#fff6cf" stop-opacity="0.75"/><stop offset="1" stop-color="#fff6cf" stop-opacity="0"/>' +
            '</linearGradient>' +
            '<linearGradient id="fv-oro" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#ffd43b" stop-opacity="0.95"/><stop offset="1" stop-color="#ffd43b" stop-opacity="0"/>' +
            '</linearGradient>' +
            '<linearGradient id="fv-rojo" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#ff6b6b" stop-opacity="0.85"/><stop offset="1" stop-color="#ff6b6b" stop-opacity="0"/>' +
            '</linearGradient>' +
            '<radialGradient id="fv-halo"><stop offset="0" stop-color="#fff" stop-opacity="0.9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
            '</defs>' +
            '<rect width="1600" height="900" fill="url(#fv-pared)"/>' +
            /* Arcos dorados del fondo de la sala. */
            '<g fill="none" stroke="#c9a227" stroke-opacity="0.35" stroke-width="6">' +
            '<path d="M120 900 V420 A220 220 0 0 1 560 420 V900"/>' +
            '<path d="M1040 900 V420 A220 220 0 0 1 1480 420 V900"/>' +
            '<path d="M600 900 V360 A200 200 0 0 1 1000 360 V900" stroke-opacity="0.22"/>' +
            '</g>' +
            /* Palcos laterales. */
            '<g class="fv-palco">' +
            '<rect x="-20" y="330" width="230" height="90" rx="10" fill="#8f0f26"/>' +
            '<path d="M-20 330 q28 34 57 0 q28 34 57 0 q28 34 57 0 q28 34 57 0 q28 34 57 0" fill="#d01f3c"/>' +
            '<rect x="-20" y="410" width="230" height="14" fill="#c9a227"/>' +
            '<rect x="1390" y="330" width="230" height="90" rx="10" fill="#8f0f26"/>' +
            '<path d="M1390 330 q28 34 57 0 q28 34 57 0 q28 34 57 0 q28 34 57 0 q28 34 57 0" fill="#d01f3c"/>' +
            '<rect x="1390" y="410" width="230" height="14" fill="#c9a227"/>' +
            '</g>' +
            '<g class="fv-destellos">' + destellos() + '</g>' +
            '<g class="fv-haces">' + haz(0) + haz(1) + '</g>' +
            '<path d="M0 104 Q400 150 800 104 T1600 104" fill="none" stroke="#c9a227" stroke-width="4"/>' +
            '<g class="fv-guirnalda">' + bombillas() + '</g>' +
            '<g class="fv-publico">' + espectadores(1) + espectadores(0) + '</g>' +
            '<rect class="fv-oscuro" width="1600" height="900" fill="#020617"/>' +
            '<g class="fv-confeti"></g>' +
            '</svg>';
        svg = raiz.querySelector('svg');
        haces = Array.prototype.slice.call(raiz.querySelectorAll('.fv-haz'));
        confeti = raiz.querySelector('.fv-confeti');
        return true;
    }

    /** Punto de la pantalla → coordenadas del SVG (que está recortado con "slice"). */
    function aSvg(x, y) {
        var m = svg.getScreenCTM();
        if (!m) return null;
        var p = svg.createSVGPoint();
        p.x = x;
        p.y = y;
        return p.matrixTransform(m.inverse());
    }

    /** La opción bajo el reflector se ilumina; las demás no. */
    function iluminar(el) {
        doc.querySelectorAll('.opcion-seq.fv-iluminada').forEach(function (b) {
            if (b !== el) b.classList.remove('fv-iluminada');
        });
        if (el && el.classList.contains('opcion-seq')) el.classList.add('fv-iluminada');
    }

    function apuntarA(el) {
        if (!svg) return;
        iluminar(el);
        if (!el) {
            apuntado = null;
            svg.classList.remove('apuntando');
            haces.forEach(function (h) { h.style.transform = ''; });
            return;
        }
        var r = el.getBoundingClientRect();
        if (!r.width) return;
        var p = aSvg(r.left + r.width / 2, r.top + r.height / 2);
        if (!p) return;
        apuntado = el;
        svg.classList.add('apuntando');
        haces.forEach(function (h, i) {
            var o = ORIGENES[i];
            var grados = Math.atan2(p.x - o.x, p.y - o.y) * 180 / Math.PI;
            h.style.transform = 'rotate(' + (-grados).toFixed(1) + 'deg)';
        });
    }

    function estado(clase, ms) {
        if (!svg) return;
        svg.classList.remove('acierto', 'error');
        void svg.getBoundingClientRect();
        svg.classList.add(clase);
        doc.body.classList.toggle('fv-luz-error', clase === 'error');
        clearTimeout(temporizador);
        temporizador = setTimeout(function () {
            svg.classList.remove(clase);
            doc.body.classList.remove('fv-luz-error');
        }, ms);
    }

    function lanzarConfeti(cantidad) {
        if (!confeti || reducido()) return;
        for (var i = 0; i < cantidad; i++) {
            var r = doc.createElementNS(NS, 'rect');
            var x = Math.random() * 1600;
            r.setAttribute('x', x.toFixed(0));
            r.setAttribute('y', '-30');
            r.setAttribute('width', String(10 + Math.round(Math.random() * 8)));
            r.setAttribute('height', String(16 + Math.round(Math.random() * 10)));
            r.setAttribute('rx', '3');
            r.setAttribute('fill', COLORES[i % COLORES.length]);
            r.setAttribute('class', 'fv-papel');
            r.style.setProperty('--dx', Math.round(Math.random() * 240 - 120) + 'px');
            r.style.setProperty('--giro', Math.round(Math.random() * 720 - 360) + 'deg');
            r.style.animationDuration = (1.6 + Math.random() * 1.4).toFixed(2) + 's';
            r.style.animationDelay = (Math.random() * 0.4).toFixed(2) + 's';
            confeti.appendChild(r);
        }
        setTimeout(function () {
            while (confeti.firstChild) confeti.removeChild(confeti.firstChild);
        }, 3600);
    }

    var FondoVivo = {
        /** "memoria": sala a oscuras y focos al escenario; "opciones": luces arriba. */
        fase: function (nombre) {
            if (!svg) return;
            svg.classList.toggle('fase-memoria', nombre === 'memoria');
            if (nombre === 'memoria') apuntarA(doc.getElementById('teatro'));
            else apuntarA(null);
        },
        apuntar: apuntarA,
        acierto: function (el) {
            if (el) apuntarA(el);
            estado('acierto', 2200);
            lanzarConfeti(46);
        },
        error: function (el) {
            if (el) apuntarA(el);
            estado('error', 1000);
            setTimeout(function () { if (apuntado === el) apuntarA(null); }, 1000);
        },
        celebrar: function () {
            estado('acierto', 4000);
            lanzarConfeti(90);
        }
    };

    function enlazarOpciones() {
        var caja = doc.getElementById('opciones');
        if (!caja) return;
        var sobre = function (ev) {
            var btn = ev.target.closest && ev.target.closest('.opcion-seq');
            if (btn && !btn.disabled && svg && !svg.classList.contains('fase-memoria')) apuntarA(btn);
        };
        caja.addEventListener('pointerover', sobre);
        caja.addEventListener('focusin', sobre);
        caja.addEventListener('pointerleave', function () {
            if (svg && !svg.classList.contains('acierto') && !svg.classList.contains('fase-memoria')) apuntarA(null);
        });
    }

    function iniciar() {
        if (!construir()) return;
        enlazarOpciones();
        global.addEventListener('resize', function () {
            if (apuntado && apuntado.isConnected) apuntarA(apuntado);
        });
    }

    global.FondoVivo = FondoVivo;
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();
})(window);
