/**
 * consultorio.js — Consultorio médico animado de "Reconocimiento del cuerpo".
 * Solo visual: script.js lo avisa (listo, acierto, error, final).
 *   - Fondo SVG: vitrina con frascos que burbujean, monitor de latidos, negatoscopio
 *     (rayos X) que muestra el hueso de la parte acertada, escritorio con lámpara.
 *   - Acierto: escáner de luz sobre las zonas correctas, curita en la parte tocada,
 *     latido feliz y la figura entera da un saltito (es una sola imagen: no se corta).
 *   - Error: bip rojo en el monitor y la figura tiembla un poco.
 *   - Final: diploma de "Doctor/a del cuerpo" con todas las curitas.
 */
(function (global) {
    'use strict';

    var doc = global.document;
    var fondo = null;
    var capa = null;
    var svg = null;
    var tapete = null;
    var curitas = [];
    var temporizador = null;
    var COLORES = ['#ff8787', '#ffd43b', '#74c0fc', '#8ce99a', '#e599f7', '#ffa94d'];

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

    function lienzo() {
        return doc.getElementById('lienzo');
    }

    function zona(id) {
        return doc.querySelector('.zona-toque[data-id="' + id + '"]');
    }

    /* ── Radiografías dibujadas (área de 200×240 dentro del negatoscopio) ──
       Cada hueso tiene diáfisis más angosta al centro, extremos redondeados y canal
       medular; alrededor va el tejido blando difuso, como en una placa real. */

    function n(v) {
        return Math.round(v * 10) / 10;
    }

    /** Hueso largo de (x1,y1) a (x2,y2): w = grosor, c = tamaño relativo de los extremos. */
    function hueso(x1, y1, x2, y2, w, c) {
        c = c || 1;
        var dx = x2 - x1;
        var dy = y2 - y1;
        var largo = Math.sqrt(dx * dx + dy * dy);
        var ang = Math.atan2(dy, dx) * 180 / Math.PI;
        var a = w / 2;
        var m = w * 0.34;
        return '<g transform="translate(' + n(x1) + ' ' + n(y1) + ') rotate(' + n(ang) + ')">' +
            '<path class="rx-h" d="M0 ' + n(-a) + ' Q' + n(largo / 2) + ' ' + n(-m) + ' ' + n(largo) + ' ' + n(-a) +
            ' L' + n(largo) + ' ' + n(a) + ' Q' + n(largo / 2) + ' ' + n(m) + ' 0 ' + n(a) + ' Z"/>' +
            '<ellipse class="rx-h" cx="0" cy="0" rx="' + n(w * 0.6 * c) + '" ry="' + n(w * 0.72 * c) + '"/>' +
            '<ellipse class="rx-h" cx="' + n(largo) + '" cy="0" rx="' + n(w * 0.6 * c) + '" ry="' + n(w * 0.72 * c) + '"/>' +
            '<path class="rx-medula" d="M' + n(w * 0.7) + ' 0 H' + n(largo - w * 0.7) + '" stroke-width="' + n(w * 0.26) + '"/>' +
            '</g>';
    }

    /** Tejido blando: trazos gruesos y difusos que siguen a los huesos. */
    function blando(puntos, grosor) {
        return '<path class="rx-blando" d="M' + puntos.map(function (p) { return n(p[0]) + ' ' + n(p[1]); }).join(' L') +
            '" stroke-width="' + grosor + '"/>';
    }

    function vertebra(cx, cy, w, h) {
        return '<rect class="rx-h" x="' + n(cx - w / 2) + '" y="' + n(cy - h / 2) + '" width="' + w + '" height="' + h + '" rx="' + n(h * 0.35) + '"/>' +
            '<rect class="rx-h" x="' + n(cx - w * 0.95) + '" y="' + n(cy - h * 0.15) + '" width="' + n(w * 1.9) + '" height="' + n(h * 0.3) + '" rx="' + n(h * 0.15) + '"/>';
    }

    function costilla(d, w) {
        return '<path class="rx-costilla" d="' + d + '" stroke-width="' + (w || 6) + '"/>';
    }

    function espejo(svgInterno) {
        return '<g transform="translate(200 0) scale(-1 1)">' + svgInterno + '</g>';
    }

    function falanges(puntos, grosores) {
        var out = '';
        for (var i = 0; i < puntos.length - 1; i++) {
            out += hueso(puntos[i][0], puntos[i][1], puntos[i + 1][0], puntos[i + 1][1], grosores[i], 0.95);
        }
        return out;
    }

    var RAYOS = {
        pecho: (function () {
            var ladoIzq = '';
            for (var i = 0; i < 7; i++) {
                var y = 52 + i * 24;
                ladoIzq += costilla('M94 ' + y + ' C60 ' + (y - 14) + ' 28 ' + (y - 2) + ' 30 ' + (y + 30), 7 - i * 0.4);
            }
            ladoIzq += costilla('M96 36 C76 24 52 24 32 34', 9);
            var col = '';
            for (var k = 0; k < 11; k++) col += vertebra(100, 16 + k * 21, 20, 15);
            return blando([[20, 40], [100, 18], [180, 40], [186, 236], [14, 236], [20, 40]], 40) +
                ladoIzq + espejo(ladoIzq) + col +
                '<rect class="rx-h" x="93" y="44" width="14" height="96" rx="7"/>';
        })(),

        craneo: blando([[100, 20], [30, 110], [100, 226], [170, 110], [100, 20]], 60) +
            '<path class="rx-h" d="M100 14 C42 14 22 62 26 106 C28 130 38 146 46 156 L154 156 C162 146 172 130 174 106 C178 62 158 14 100 14 Z"/>' +
            '<path class="rx-sutura" d="M100 16 V64 M58 40 Q100 58 142 40"/>' +
            '<ellipse class="rx-hueco" cx="72" cy="106" rx="21" ry="18"/><ellipse class="rx-hueco" cx="128" cy="106" rx="21" ry="18"/>' +
            '<path class="rx-hueco" d="M100 116 L88 146 Q100 154 112 146 Z"/>' +
            '<ellipse class="rx-h" cx="48" cy="138" rx="14" ry="10"/><ellipse class="rx-h" cx="152" cy="138" rx="14" ry="10"/>' +
            '<path class="rx-h" d="M60 150 Q100 166 140 150 L138 172 Q100 184 62 172 Z"/>' +
            '<path class="rx-h" d="M44 158 Q42 202 70 216 Q100 230 130 216 Q158 202 156 158 L144 160 Q142 196 124 206 Q100 214 76 206 Q58 196 56 160 Z"/>' +
            (function () {
                var d = '';
                for (var i = 0; i < 8; i++) {
                    d += '<rect class="rx-diente" x="' + (65 + i * 9) + '" y="164" width="7" height="12" rx="2.5"/>';
                    d += '<rect class="rx-diente" x="' + (67 + i * 8.2) + '" y="182" width="6.5" height="11" rx="2.5"/>';
                }
                return d;
            })(),

        mano: blando([[86, 236], [100, 160], [79, 46]], 34) + blando([[100, 160], [100, 34]], 34) +
            blando([[100, 160], [124, 46]], 32) + blando([[104, 166], [150, 70]], 28) + blando([[90, 176], [36, 96]], 30) +
            blando([[100, 236], [100, 170]], 70) +
            hueso(82, 240, 92, 196, 16) + hueso(118, 240, 111, 198, 13) +
            [[84, 188], [98, 184], [112, 187], [124, 182], [80, 174], [94, 171], [108, 171], [121, 167]].map(function (p) {
                return '<ellipse class="rx-h" cx="' + p[0] + '" cy="' + p[1] + '" rx="8" ry="7"/>';
            }).join('') +
            hueso(78, 172, 54, 140, 11) + falanges([[50, 136], [40, 112], [34, 94]], [9, 7.5]) +
            hueso(88, 162, 82, 112, 10) + falanges([[82, 108], [79, 80], [77, 60], [76, 46]], [8.5, 7.5, 6.5]) +
            hueso(100, 160, 100, 108, 10.5) + falanges([[100, 104], [100, 72], [100, 50], [100, 36]], [9, 8, 7]) +
            hueso(112, 162, 118, 112, 10) + falanges([[118, 108], [121, 80], [123, 60], [124, 47]], [8.5, 7.5, 6.5]) +
            hueso(122, 166, 136, 122, 9) + falanges([[137, 118], [144, 96], [148, 80], [151, 69]], [7.5, 6.5, 5.5]),

        pie: blando([[100, 220], [100, 150], [66, 50]], 60) + blando([[100, 150], [146, 86]], 40) +
            blando([[100, 160], [108, 56]], 46) +
            '<ellipse class="rx-h" cx="100" cy="212" rx="26" ry="24"/>' +
            '<ellipse class="rx-h" cx="98" cy="182" rx="22" ry="16"/>' +
            [[84, 162], [100, 160], [116, 164], [128, 172], [76, 150], [92, 148], [106, 150]].map(function (p) {
                return '<ellipse class="rx-h" cx="' + p[0] + '" cy="' + p[1] + '" rx="9" ry="8"/>';
            }).join('') +
            hueso(78, 146, 66, 94, 13) + falanges([[65, 90], [61, 62], [58, 44]], [11, 10]) +
            hueso(92, 144, 90, 88, 10) + falanges([[90, 84], [89, 62], [88, 48]], [7.5, 6.5]) +
            hueso(106, 146, 108, 90, 9.5) + falanges([[108, 86], [110, 66], [111, 54]], [7, 6]) +
            hueso(117, 150, 124, 96, 9) + falanges([[125, 92], [129, 74], [131, 64]], [6.5, 5.5]) +
            hueso(127, 158, 140, 106, 9) + falanges([[141, 102], [147, 88], [150, 80]], [6, 5]),

        brazo: blando([[40, 20], [96, 128], [146, 226]], 54) +
            '<path class="rx-h" d="M14 22 Q40 14 66 20 Q52 50 30 92 Q18 60 14 22 Z" opacity=".4"/>' +
            costilla('M2 22 C22 12 44 16 62 24', 8) +
            hueso(48, 34, 94, 126, 20, 1.3) +
            hueso(104, 136, 150, 216, 13) + hueso(92, 138, 138, 222, 12) +
            [[150, 228], [162, 222], [140, 234], [156, 236]].map(function (p) {
                return '<ellipse class="rx-h" cx="' + p[0] + '" cy="' + p[1] + '" rx="7" ry="6"/>';
            }).join(''),

        pierna: blando([[70, 20], [98, 130], [106, 236]], 58) +
            '<path class="rx-h" d="M4 2 Q34 -6 66 6 Q56 16 50 30 Q34 46 14 44 Q2 26 4 2 Z" opacity=".42"/>' +
            '<circle class="rx-hueco" cx="60" cy="24" r="17" opacity=".7"/>' +
            '<circle class="rx-h" cx="62" cy="24" r="15"/>' +
            hueso(64, 24, 86, 42, 12) + hueso(86, 40, 100, 126, 18, 1.25) +
            '<ellipse class="rx-h" cx="104" cy="136" rx="10" ry="13"/>' +
            hueso(100, 148, 104, 228, 17, 1.15) + hueso(120, 152, 121, 226, 7.5),

        hombro: blando([[30, 60], [120, 50], [170, 80], [172, 236]], 70) +
            (function () {
                var col = '';
                for (var k = 0; k < 10; k++) col += vertebra(30, 22 + k * 22, 18, 14);
                var cost = '';
                for (var i = 0; i < 6; i++) {
                    var y = 70 + i * 26;
                    cost += costilla('M36 ' + y + ' C80 ' + (y - 16) + ' 128 ' + (y - 4) + ' 142 ' + (y + 30), 6.5 - i * 0.4);
                }
                return col + cost;
            })() +
            '<path class="rx-h" d="M124 52 L174 66 L140 170 Q120 120 124 52 Z" opacity=".45"/>' +
            costilla('M38 46 C70 30 100 58 152 44', 10) +
            '<circle class="rx-h" cx="164" cy="74" r="22"/>' +
            hueso(164, 84, 174, 232, 22),

        rodilla: blando([[100, 6], [100, 236]], 96) +
            hueso(100, 6, 100, 92, 24) +
            '<ellipse class="rx-h" cx="86" cy="104" rx="18" ry="14"/><ellipse class="rx-h" cx="114" cy="104" rx="18" ry="14"/>' +
            '<path class="rx-h" d="M68 128 Q100 120 132 128 L126 144 H74 Z"/>' +
            hueso(100, 144, 100, 234, 24) +
            '<ellipse class="rx-h" cx="136" cy="148" rx="8" ry="10"/>' + hueso(136, 152, 134, 234, 8) +
            '<ellipse class="rx-rotula" cx="100" cy="92" rx="15" ry="18"/>',

        codo: blando([[26, 16], [104, 114], [196, 146]], 56) +
            hueso(30, 20, 100, 104, 20, 1.15) +
            '<ellipse class="rx-h" cx="106" cy="112" rx="20" ry="15"/>' +
            hueso(104, 124, 192, 152, 12) + hueso(114, 108, 194, 128, 11.5) +
            '<ellipse class="rx-h" cx="96" cy="126" rx="12" ry="9"/>',

        tobillo: blando([[100, 6], [100, 150], [190, 200]], 76) + blando([[60, 180], [110, 190]], 50) +
            hueso(92, 6, 96, 128, 22) + hueso(124, 12, 126, 134, 9) +
            '<path class="rx-h" d="M76 150 Q100 132 130 146 Q132 162 106 166 Q82 166 76 150 Z"/>' +
            '<ellipse class="rx-h" cx="72" cy="180" rx="34" ry="20"/>' +
            '<ellipse class="rx-h" cx="136" cy="162" rx="12" ry="10"/>' +
            '<ellipse class="rx-h" cx="152" cy="170" rx="9" ry="9"/>' +
            hueso(160, 172, 198, 194, 9) + hueso(150, 182, 196, 206, 8),

        barriga: blando([[30, 20], [170, 20], [180, 236], [20, 236], [30, 20]], 40) +
            '<path class="rx-tripa" d="M60 60 Q100 40 140 60 Q160 90 130 104 Q100 92 76 104 Q44 92 60 60 Z M58 120 Q100 108 142 120 Q150 140 120 144 Q100 134 80 144 Q50 140 58 120 Z"/>' +
            (function () {
                var v = '';
                for (var k = 0; k < 5; k++) v += vertebra(100, 22 + k * 26, 30, 20);
                return v;
            })() +
            '<path class="rx-h" d="M94 152 C60 140 28 152 24 178 C22 198 48 208 72 202 C86 198 92 188 96 176 Z"/>' +
            '<path class="rx-h" d="M106 152 C140 140 172 152 176 178 C178 198 152 208 128 202 C114 198 108 188 104 176 Z"/>' +
            '<path class="rx-h" d="M86 150 L114 150 L100 198 Z"/>' +
            '<path class="rx-costilla" d="M64 206 Q100 236 136 206" stroke-width="8"/>' +
            '<circle class="rx-hueco" cx="66" cy="214" r="9"/><circle class="rx-hueco" cx="134" cy="214" r="9"/>'
    };

    function tipoRayos(id) {
        var base = String(id || '').split('_')[0];
        var mapa = {
            cabeza: 'craneo', mano: 'mano', pie: 'pie', brazo: 'brazo', pierna: 'pierna',
            hombro: 'hombro', rodilla: 'rodilla', codo: 'codo', tobillo: 'tobillo', barriga: 'barriga'
        };
        return mapa[base] || 'pecho';
    }

    /* ── Fondo SVG ──────────────────────────────────────────── */

    function frasco(x, color) {
        var burbujas = '';
        for (var i = 0; i < 3; i++) {
            burbujas += '<circle class="con-burbuja" style="--i:' + (i + x / 10) + '" cx="' + (x + 14 + i * 10) + '" cy="96" r="4" fill="#fff" opacity=".8"/>';
        }
        return '<rect x="' + x + '" y="40" width="48" height="64" rx="10" fill="' + color + '" opacity=".85"/>' +
            '<rect x="' + (x + 8) + '" y="30" width="32" height="12" rx="3" fill="#495057"/>' + burbujas;
    }

    function construirFondo() {
        fondo.innerHTML =
            '<svg class="con-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' +
            '<defs>' +
            '<linearGradient id="con-pared" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#d7f0fb"/><stop offset="1" stop-color="#bfe4f5"/></linearGradient>' +
            '<pattern id="con-baldosa" width="70" height="70" patternUnits="userSpaceOnUse">' +
            '<rect width="70" height="70" fill="#e3f4fc"/><path d="M0 0 H70 M0 0 V70" stroke="#c9e6f3" stroke-width="3"/></pattern>' +
            '<radialGradient id="con-hueso" cx="50%" cy="45%" r="65%">' +
            '<stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#e3f0fb"/><stop offset="1" stop-color="#a9c8e4"/></radialGradient>' +
            '<filter id="con-rx" x="-10%" y="-10%" width="120%" height="120%">' +
            '<feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="b"/>' +
            '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
            '<filter id="con-blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>' +
            '<radialGradient id="con-placa" cx="50%" cy="45%" r="70%">' +
            '<stop offset="0" stop-color="#2a5583"/><stop offset="1" stop-color="#0f2742"/></radialGradient>' +
            '</defs>' +
            '<rect width="1600" height="900" fill="url(#con-pared)"/>' +
            '<rect y="520" width="1600" height="220" fill="url(#con-baldosa)"/>' +
            '<rect y="512" width="1600" height="10" fill="#a5d8ff"/>' +
            // Vitrina con frascos.
            '<g transform="translate(60 150)">' +
            '<rect x="0" y="0" width="300" height="560" rx="10" fill="#8fd3f4"/>' +
            '<rect x="16" y="16" width="268" height="250" rx="6" fill="#e7f7ff"/>' +
            '<rect x="16" y="282" width="268" height="262" rx="6" fill="#74c0fc"/>' +
            '<g transform="translate(14 20)">' + frasco(10, '#ff8787') + frasco(80, '#69db7c') + frasco(150, '#ffd43b') + frasco(220, '#b197fc') + '</g>' +
            '<rect x="16" y="140" width="268" height="10" fill="#8fd3f4"/>' +
            '<rect x="40" y="168" width="70" height="80" rx="6" fill="#fff"/><path d="M75 182 V234 M49 208 H101" stroke="#fa5252" stroke-width="14"/>' +
            '<rect x="150" y="190" width="110" height="18" rx="4" fill="#ff922b"/><rect x="150" y="212" width="110" height="18" rx="4" fill="#4dabf7"/>' +
            '<path d="M150 282 V544" stroke="#5aa9db" stroke-width="4"/>' +
            '</g>' +
            // Monitor de latidos.
            '<g transform="translate(440 120)">' +
            '<rect x="0" y="0" width="300" height="190" rx="16" fill="#343a40"/>' +
            '<rect x="14" y="14" width="272" height="150" rx="8" fill="#0b1d2a"/>' +
            '<clipPath id="con-ecg-clip"><rect x="14" y="14" width="272" height="150"/></clipPath>' +
            '<g clip-path="url(#con-ecg-clip)"><g class="con-ecg">' +
            '<path class="con-ecg-linea" d="M0 100 H60 L72 70 L84 130 L96 40 L110 120 L122 100 H200 L212 70 L224 130 L236 40 L250 120 L262 100 H340 L352 70 L364 130 L376 40 L390 120 L402 100 H480 L492 70 L504 130 L516 40 L530 120 L542 100 H620" ' +
            'fill="none" stroke="#51cf66" stroke-width="5" stroke-linejoin="round"/></g></g>' +
            '<text class="con-ecg-num" x="270" y="44" text-anchor="end" font-family="Fredoka, sans-serif" font-size="26" font-weight="700" fill="#51cf66">♥ 80</text>' +
            '<rect x="130" y="190" width="40" height="30" fill="#343a40"/>' +
            '</g>' +
            // Negatoscopio con la radiografía.
            '<g transform="translate(1180 110)">' +
            '<rect x="0" y="0" width="260" height="310" rx="12" fill="#e9ecef" stroke="#adb5bd" stroke-width="6"/>' +
            '<rect class="con-rayos-pantalla" x="20" y="20" width="220" height="260" rx="6" fill="url(#con-placa)"/>' +
            '<clipPath id="con-rayos-clip"><rect x="20" y="20" width="220" height="260" rx="6"/></clipPath>' +
            '<g clip-path="url(#con-rayos-clip)"><g class="con-rayos" transform="translate(30 30)" filter="url(#con-rx)">' + RAYOS.pecho + '</g></g>' +
            '<circle class="con-rayos-led" cx="130" cy="296" r="6" fill="#51cf66"/>' +
            '</g>' +
            // Escritorio con lámpara.
            '<g transform="translate(1100 470)">' +
            '<rect x="0" y="40" width="380" height="24" rx="6" fill="#e64980"/>' +
            '<rect x="20" y="64" width="40" height="190" fill="#c2255c"/><rect x="230" y="64" width="150" height="190" rx="6" fill="#d6336c"/>' +
            '<rect x="250" y="90" width="110" height="40" rx="6" fill="#e64980"/><rect x="250" y="146" width="110" height="40" rx="6" fill="#e64980"/>' +
            '<path d="M300 40 L270 -40 L320 -110" stroke="#495057" stroke-width="8" fill="none" stroke-linecap="round"/>' +
            '<path d="M296 -126 L360 -88 L330 -70 Z" fill="#495057"/>' +
            '<circle class="con-foco" cx="338" cy="-82" r="12" fill="#fff3bf"/>' +
            '<rect x="90" y="-4" width="12" height="44" rx="3" fill="#74c0fc"/><rect x="110" y="8" width="12" height="32" rx="3" fill="#ff8787"/>' +
            '</g>' +
            // Piso.
            '<rect y="740" width="1600" height="160" fill="#a9d6ec"/>' +
            '<path d="M0 740 H1600" stroke="#8cc4e0" stroke-width="6"/>' +
            '<rect class="con-destello" width="1600" height="900" fill="#69db7c"/>' +
            '</svg>' +
            '<div class="con-tapete" hidden></div>';
        svg = fondo.querySelector('svg');
        tapete = fondo.querySelector('.con-tapete');
    }

    /** Tapete bajo los pies de la figura (la imagen ocupa todo el lienzo). */
    function ubicarTapete() {
        var img = doc.getElementById('img-completo');
        if (!tapete || !img) return;
        var r = img.getBoundingClientRect();
        if (!r.width) return;
        var ancho = r.width * 0.95;
        var alto = ancho * 0.16;
        tapete.style.width = Math.round(ancho) + 'px';
        tapete.style.height = Math.round(alto) + 'px';
        tapete.style.left = Math.round(r.left + (r.width - ancho) / 2) + 'px';
        tapete.style.top = Math.round(r.bottom - alto * 0.7) + 'px';
        tapete.hidden = false;
    }

    function mostrarRayos(id) {
        var g = svg && svg.querySelector('.con-rayos');
        if (!g) return;
        g.innerHTML = RAYOS[tipoRayos(id)] || RAYOS.pecho;
        g.classList.remove('nuevo');
        void g.getBoundingClientRect();
        g.classList.add('nuevo');
    }

    function monitor(clase, texto, ms) {
        if (!svg) return;
        svg.classList.remove('ok', 'error');
        void svg.getBoundingClientRect();
        svg.classList.add(clase);
        var num = svg.querySelector('.con-ecg-num');
        if (num) num.textContent = texto;
        svg.querySelector('.con-destello').setAttribute('fill', clase === 'ok' ? '#69db7c' : '#ff6b6b');
        clearTimeout(temporizador);
        temporizador = setTimeout(function () {
            svg.classList.remove(clase);
            if (num) num.textContent = '♥ 80';
        }, ms);
    }

    /** Escáner de luz sobre una zona de la figura. */
    function escanear(el) {
        if (!el) return;
        var r = el.getBoundingClientRect();
        if (!r.width) return;
        var s = doc.createElement('div');
        s.className = 'con-escaner';
        s.style.left = Math.round(r.left - 4) + 'px';
        s.style.top = Math.round(r.top - 4) + 'px';
        s.style.width = Math.round(r.width + 8) + 'px';
        s.style.height = Math.round(r.height + 8) + 'px';
        s.innerHTML = '<span></span>';
        capa.appendChild(s);
        setTimeout(function () { s.remove(); }, reducido() ? 400 : 1300);
    }

    /** Curita en la zona tocada; vive dentro del lienzo y sigue a la figura al redimensionar. */
    function pegarCurita(el) {
        var lz = lienzo();
        if (!el || !lz) return;
        var c = doc.createElement('span');
        c.className = 'con-curita';
        var cx = parseFloat(el.style.left) + parseFloat(el.style.width) / 2;
        var cy = parseFloat(el.style.top) + parseFloat(el.style.height) / 2;
        c.style.left = cx + '%';
        c.style.top = cy + '%';
        c.style.setProperty('--giro', (curitas.length % 2 ? 18 : -18) + 'deg');
        c.style.setProperty('--color', COLORES[curitas.length % COLORES.length]);
        lz.appendChild(c);
        curitas.push(c);
    }

    function saltar(clase, ms) {
        var lz = lienzo();
        if (!lz) return;
        lz.classList.remove('con-salta', 'con-tiembla');
        void lz.offsetWidth;
        lz.classList.add(clase);
        setTimeout(function () { lz.classList.remove(clase); }, ms);
    }

    function confeti(cantidad) {
        if (reducido()) return;
        for (var i = 0; i < cantidad; i++) {
            var c = doc.createElement('span');
            c.className = 'con-confeti';
            c.style.left = (Math.random() * 100) + 'vw';
            c.style.background = COLORES[i % COLORES.length];
            c.style.setProperty('--dx', Math.round(Math.random() * 160 - 80) + 'px');
            c.style.setProperty('--giro', Math.round(Math.random() * 720 - 360) + 'deg');
            c.style.animationDuration = (2.2 + Math.random() * 1.6).toFixed(2) + 's';
            c.style.animationDelay = (Math.random() * 0.8).toFixed(2) + 's';
            capa.appendChild(c);
            setTimeout(function (el) { return function () { el.remove(); }; }(c), 4800);
        }
    }

    var Consultorio = {
        partes: [],

        iniciar: function () {
            fondo = doc.getElementById('con-fondo');
            capa = doc.getElementById('con-capa');
            if (!fondo || !capa) return;
            construirFondo();
            global.addEventListener('resize', ubicarTapete);
        },

        /** Al mostrar la figura: el tapete va bajo sus pies y se limpian las curitas. */
        listo: function () {
            curitas.forEach(function (c) { c.remove(); });
            curitas = [];
            this.partes = [];
            setTimeout(ubicarTapete, 60);
            setTimeout(ubicarTapete, 700);
        },

        reacomodar: ubicarTapete,

        /** id tocado, ids correctos de la pregunta y nombre de la parte para el diploma. */
        acierto: function (id, objetivos, nombre) {
            monitor('ok', '♥ 120', 1600);
            mostrarRayos(id);
            (objetivos && objetivos.length ? objetivos : [id]).forEach(function (t) { escanear(zona(t)); });
            pegarCurita(zona(id));
            if (nombre) this.partes.push(nombre);
            saltar('con-salta', 700);
            sonar('tic');
        },

        error: function () {
            monitor('error', 'BIP', 1000);
            saltar('con-tiembla', 500);
        },

        /** Diploma de "Doctor/a del cuerpo" con todas las curitas. */
        final: function (opts) {
            opts = opts || {};
            doc.body.classList.add('con-final');
            if (svg) svg.classList.add('fiesta');
            var num = svg && svg.querySelector('.con-ecg-num');
            if (num) num.textContent = '♥ ¡100!';

            var diploma = doc.createElement('div');
            diploma.className = 'con-diploma';
            var titulo = opts.titulo || 'Diploma de Doctor del cuerpo';
            diploma.innerHTML =
                '<div class="con-diploma-cinta">★</div>' +
                '<h2></h2><p class="con-diploma-sub"></p>' +
                '<ul class="con-diploma-partes"></ul>' +
                '<div class="con-diploma-sello">✓</div>';
            diploma.querySelector('h2').textContent = titulo;
            diploma.querySelector('.con-diploma-sub').textContent = opts.subtitulo || '¡Ya conoces las partes de tu cuerpo!';
            // Una línea por parte reconocida: su curita y su nombre.
            var ul = diploma.querySelector('.con-diploma-partes');
            this.partes.forEach(function (n, i) {
                var li = doc.createElement('li');
                li.style.setProperty('--i', i);
                li.style.setProperty('--color', COLORES[i % COLORES.length]);
                li.innerHTML = '<span class="con-diploma-curita"></span><span class="con-diploma-nombre"></span>';
                li.querySelector('.con-diploma-nombre').textContent = n;
                ul.appendChild(li);
            });
            capa.appendChild(diploma);
            setTimeout(function () { diploma.classList.add('visible'); }, 30);
            sonar('aparece');

            var lz = lienzo();
            if (lz) lz.classList.add('con-festeja');
            var voz = opts.hablar ? opts.hablar(titulo + '. ' + (opts.subtitulo || '')) : null;
            return esperar(900)
                .then(function () {
                    confeti(80);
                    sonar('correcto');
                    return Promise.race([Promise.resolve(voz), esperar(4500)]);
                })
                .then(function () { return esperar(1200); })
                .then(function () {
                    if (lz) lz.classList.remove('con-festeja');
                });
        }
    };

    global.Consultorio = Consultorio;
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { Consultorio.iniciar(); });
    else Consultorio.iniciar();
})(window);
