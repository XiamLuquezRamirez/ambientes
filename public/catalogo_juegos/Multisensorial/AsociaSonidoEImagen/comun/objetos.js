/**
 * Dibujos de Asocia sonido e imagen (Canvas 2D con degradados), registrados en PedniaArte.
 * Lienzo de 100 u. Las piezas que se mueven por separado (ruedas, manecillas, aspas, hojas de
 * puertas, brazos…) van en texturas propias y las arma actores.js.
 */
(function (global) {
    'use strict';
    var A = global.PedniaArte;
    if (!A || !A.registrar) return;
    var P = A.pinceles;
    var lg = P.lg, rg = P.rg, elipse = P.elipse, redondo = P.redondo;

    /* ── Pinceles cortos ──────────────────────────────────────── */

    function caja(c, u, x, y, w, h, r, fill, borde) {
        redondo(c, x * u, y * u, w * u, h * u, Math.min(r, w / 2, h / 2) * u);
        c.fillStyle = fill;
        c.fill();
        if (borde) { c.strokeStyle = borde; c.lineWidth = 1.2 * u; c.stroke(); }
    }
    function circ(c, u, x, y, r, fill, borde, ancho) {
        c.beginPath();
        c.arc(x * u, y * u, r * u, 0, Math.PI * 2);
        if (fill) { c.fillStyle = fill; c.fill(); }
        if (borde) { c.strokeStyle = borde; c.lineWidth = (ancho || 1.2) * u; c.stroke(); }
    }
    function poli(c, u, pts, fill, borde, ancho) {
        c.beginPath();
        pts.forEach(function (p, i) { if (i) c.lineTo(p[0] * u, p[1] * u); else c.moveTo(p[0] * u, p[1] * u); });
        c.closePath();
        if (fill) { c.fillStyle = fill; c.fill(); }
        if (borde) { c.strokeStyle = borde; c.lineWidth = (ancho || 1.2) * u; c.lineJoin = 'round'; c.stroke(); }
    }
    function linea(c, u, pts, color, ancho, cap) {
        c.beginPath();
        pts.forEach(function (p, i) { if (i) c.lineTo(p[0] * u, p[1] * u); else c.moveTo(p[0] * u, p[1] * u); });
        c.strokeStyle = color;
        c.lineWidth = ancho * u;
        c.lineCap = cap || 'round';
        c.lineJoin = 'round';
        c.stroke();
    }
    function brillo(c, u, x, y, rx, ry, rot, a) {
        c.fillStyle = 'rgba(255,255,255,' + (a || 0.55) + ')';
        elipse(c, x * u, y * u, rx * u, ry * u, rot || 0);
        c.fill();
    }
    /** Degradado vertical metálico/plástico rápido. */
    function vert(c, u, y0, y1, cols) {
        return lg(c, 0, y0 * u, 0, y1 * u, cols.map(function (col, i) { return [i / (cols.length - 1), col]; }));
    }
    function horiz(c, u, x0, x1, cols) {
        return lg(c, x0 * u, 0, x1 * u, 0, cols.map(function (col, i) { return [i / (cols.length - 1), col]; }));
    }
    function cromo(c, u, x0, x1) { return horiz(c, u, x0, x1, ['#6c757d', '#f8f9fa', '#adb5bd', '#e9ecef', '#495057']); }

    /* ── Ruedas ───────────────────────────────────────────────── */

    function rueda(c, u, rayos) {
        circ(c, u, 50, 50, 47, rg(c, 50 * u, 50 * u, 38 * u, 50 * u, 50 * u, 48 * u, [[0, '#495057'], [0.5, '#212529'], [1, '#0b0d0f']]));
        circ(c, u, 50, 50, 39, null, '#343a40', 3);
        circ(c, u, 50, 50, 37, rayos ? 'rgba(0,0,0,0)' : rg(c, 42 * u, 42 * u, 4 * u, 50 * u, 50 * u, 37 * u, [[0, '#f1f3f5'], [0.6, '#adb5bd'], [1, '#495057']]));
        if (rayos) {
            circ(c, u, 50, 50, 37, null, cromo(c, u, 13, 87), 3.4);
            for (var i = 0; i < 16; i++) {
                var a = i / 16 * Math.PI * 2;
                linea(c, u, [[50, 50], [50 + Math.cos(a) * 36, 50 + Math.sin(a) * 36]], 'rgba(222,226,230,0.9)', 1);
            }
            circ(c, u, 50, 50, 7, rg(c, 48 * u, 48 * u, 1, 50 * u, 50 * u, 7 * u, [[0, '#fff'], [1, '#868e96']]));
        } else {
            for (var j = 0; j < 5; j++) {
                var b = j / 5 * Math.PI * 2;
                circ(c, u, 50 + Math.cos(b) * 20, 50 + Math.sin(b) * 20, 5, '#868e96');
            }
            circ(c, u, 50, 50, 10, rg(c, 47 * u, 47 * u, 1, 50 * u, 50 * u, 10 * u, [[0, '#fff'], [1, '#6c757d']]));
        }
        c.strokeStyle = 'rgba(255,255,255,0.18)';
        c.lineWidth = 3 * u;
        c.beginPath();
        c.arc(50 * u, 50 * u, 44 * u, Math.PI * 1.1, Math.PI * 1.5);
        c.stroke();
    }

    function ruedaTren(c, u) {
        circ(c, u, 50, 50, 47, rg(c, 40 * u, 40 * u, 5 * u, 50 * u, 50 * u, 47 * u, [[0, '#ff6b6b'], [0.7, '#c92a2a'], [1, '#5c0f0f']]));
        circ(c, u, 50, 50, 41, null, '#7c1d1d', 3);
        for (var i = 0; i < 8; i++) {
            var a = i / 8 * Math.PI * 2;
            linea(c, u, [[50, 50], [50 + Math.cos(a) * 40, 50 + Math.sin(a) * 40]], '#ffd8a8', 5);
        }
        circ(c, u, 50, 50, 12, rg(c, 46 * u, 46 * u, 1, 50 * u, 50 * u, 12 * u, [[0, '#fff3bf'], [1, '#e67700']]));
        circ(c, u, 66, 50, 5, '#495057');
    }

    /* ── Bicicleta ────────────────────────────────────────────── */

    function bicicleta(c, u) {
        // Rueda trasera (24,66) y delantera (76,66) las pone el actor; aquí el cuadro.
        var tubo = horiz(c, u, 20, 80, ['#c92a2a', '#ff6b6b', '#e03131', '#a61e1e']);
        linea(c, u, [[24, 66], [42, 66], [62, 40], [36, 40], [24, 66]], '#7c1d1d', 6.2);
        linea(c, u, [[24, 66], [42, 66], [62, 40], [36, 40], [24, 66]], tubo, 4.6);
        linea(c, u, [[42, 66], [33, 30]], '#7c1d1d', 6);
        linea(c, u, [[42, 66], [33, 30]], tubo, 4.4);
        linea(c, u, [[76, 66], [60, 26]], '#7c1d1d', 5.6);
        linea(c, u, [[76, 66], [60, 26]], cromo(c, u, 58, 78), 4);
        // Sillín.
        poli(c, u, [[25, 27], [40, 25], [42, 29], [30, 31]], vert(c, u, 24, 31, ['#495057', '#212529']), '#111', 0.8);
        brillo(c, u, 32, 26.5, 5, 1, 0, 0.35);
        // Manubrio y timbre.
        linea(c, u, [[56, 24], [62, 24], [70, 20]], cromo(c, u, 55, 71), 3.4);
        linea(c, u, [[68, 21], [73, 19]], '#212529', 4.4);
        circ(c, u, 58, 21, 4, rg(c, 56.5 * u, 19.5 * u, 0.5 * u, 58 * u, 21 * u, 4 * u, [[0, '#fff'], [0.4, '#ffe066'], [1, '#e67700']]), '#a35d00', 0.7);
        // Plato y pedal.
        circ(c, u, 42, 66, 6, cromo(c, u, 36, 48), '#495057', 0.8);
        linea(c, u, [[42, 66], [47, 74]], '#343a40', 2.4);
        caja(c, u, 44, 73.5, 7, 3, 1, '#212529');
        // Cadena.
        linea(c, u, [[24, 63], [42, 61]], 'rgba(52,58,64,0.8)', 1.2);
        linea(c, u, [[24, 69], [42, 71]], 'rgba(52,58,64,0.8)', 1.2);
        // Canasta delantera con flores.
        poli(c, u, [[64, 30], [80, 30], [78, 40], [66, 40]], vert(c, u, 30, 40, ['#e8b47a', '#a9713b']), '#7a4a1f', 0.8);
        for (var i = 0; i < 4; i++) linea(c, u, [[66 + i * 4, 31], [67 + i * 3.5, 40]], 'rgba(122,74,31,0.6)', 0.6);
        circ(c, u, 69, 28, 3, '#ff8787');
        circ(c, u, 74, 27, 3, '#ffd43b');
        circ(c, u, 77.5, 29, 2.6, '#74c0fc');
    }

    /* ── Teléfono de casa y celular ───────────────────────────── */

    function telefonoBase(c, u) {
        poli(c, u, [[14, 86], [86, 86], [78, 44], [22, 44]], vert(c, u, 44, 86, ['#ff8787', '#e03131', '#9b1c1c']), '#7c1d1d', 1);
        c.save();
        poli(c, u, [[14, 86], [86, 86], [78, 44], [22, 44]]);
        c.clip();
        c.fillStyle = lg(c, 14 * u, 0, 86 * u, 0, [[0, 'rgba(0,0,0,0.18)'], [0.35, 'rgba(255,255,255,0.22)'], [1, 'rgba(0,0,0,0.25)']]);
        c.fillRect(0, 0, 100 * u, 100 * u);
        c.restore();
        // Disco de marcar.
        circ(c, u, 50, 66, 15, rg(c, 46 * u, 62 * u, 1, 50 * u, 66 * u, 15 * u, [[0, '#fff'], [0.7, '#dee2e6'], [1, '#868e96']]), '#495057', 0.8);
        for (var i = 0; i < 10; i++) {
            var a = -Math.PI * 0.35 + i / 10 * Math.PI * 1.6;
            circ(c, u, 50 + Math.cos(a) * 10.5, 66 + Math.sin(a) * 10.5, 2.3, '#343a40');
        }
        circ(c, u, 50, 66, 5, '#e03131');
        // Horquilla donde descansa el auricular.
        caja(c, u, 20, 40, 12, 8, 3, '#c92a2a', '#7c1d1d');
        caja(c, u, 68, 40, 12, 8, 3, '#c92a2a', '#7c1d1d');
        // Luz de llamada.
        circ(c, u, 76, 78, 3, '#ffe066', '#a35d00', 0.6);
    }

    function telefonoAuricular(c, u) {
        // Lienzo propio: el auricular salta sobre la base.
        c.beginPath();
        c.moveTo(10 * u, 58 * u);
        c.quadraticCurveTo(8 * u, 40 * u, 22 * u, 38 * u);
        c.lineTo(78 * u, 38 * u);
        c.quadraticCurveTo(92 * u, 40 * u, 90 * u, 58 * u);
        c.lineTo(76 * u, 62 * u);
        c.quadraticCurveTo(72 * u, 50 * u, 62 * u, 50 * u);
        c.lineTo(38 * u, 50 * u);
        c.quadraticCurveTo(28 * u, 50 * u, 24 * u, 62 * u);
        c.closePath();
        c.fillStyle = vert(c, u, 38, 62, ['#ff8787', '#e03131', '#a61e1e']);
        c.fill();
        c.strokeStyle = '#7c1d1d';
        c.lineWidth = 1 * u;
        c.stroke();
        brillo(c, u, 40, 41.5, 16, 1.6, 0, 0.5);
        caja(c, u, 8, 54, 20, 10, 4, '#c92a2a', '#7c1d1d');
        caja(c, u, 72, 54, 20, 10, 4, '#c92a2a', '#7c1d1d');
    }

    function movil(c, u) {
        caja(c, u, 28, 8, 44, 84, 8, vert(c, u, 8, 92, ['#495057', '#212529', '#000']), '#000');
        caja(c, u, 31.5, 15, 37, 66, 3, lg(c, 30 * u, 15 * u, 70 * u, 80 * u, [[0, '#4dabf7'], [0.5, '#7950f2'], [1, '#f783ac']]));
        // Pantalla de llamada: círculo del contacto y botones.
        circ(c, u, 50, 34, 8, 'rgba(255,255,255,0.85)');
        circ(c, u, 50, 31.5, 3.2, '#748ffc');
        elipse(c, 50 * u, 38.5 * u, 5 * u, 3 * u, 0); c.fillStyle = '#748ffc'; c.fill();
        circ(c, u, 40, 68, 5, '#40c057');
        circ(c, u, 60, 68, 5, '#fa5252');
        linea(c, u, [[37.5, 68], [42.5, 68]], '#fff', 1.6);
        linea(c, u, [[57.5, 68], [62.5, 68]], '#fff', 1.6);
        caja(c, u, 44, 10.5, 12, 2.2, 1.1, '#111');
        caja(c, u, 44, 85, 12, 2.6, 1.3, '#868e96');
        c.save();
        redondo(c, 28 * u, 8 * u, 44 * u, 84 * u, 8 * u);
        c.clip();
        poli(c, u, [[28, 8], [50, 8], [28, 50]], 'rgba(255,255,255,0.12)');
        c.restore();
    }

    /* ── Reloj despertador ────────────────────────────────────── */

    function relojCuerpo(c, u) {
        // Patas.
        linea(c, u, [[33, 80], [25, 92]], '#495057', 4);
        linea(c, u, [[67, 80], [75, 92]], '#495057', 4);
        // Campanas (el martillo lo pone el actor entre ellas).
        [[28, 22, -0.5], [72, 22, 0.5]].forEach(function (b) {
            c.save();
            c.translate(b[0] * u, b[1] * u);
            c.rotate(b[2]);
            c.beginPath();
            c.arc(0, 4 * u, 13 * u, Math.PI, 0);
            c.closePath();
            c.fillStyle = lg(c, -13 * u, 0, 13 * u, 0, [[0, '#a35d00'], [0.35, '#ffe066'], [0.55, '#fff3bf'], [1, '#c77700']]);
            c.fill();
            c.strokeStyle = '#7a4500';
            c.lineWidth = 0.8 * u;
            c.stroke();
            c.restore();
        });
        linea(c, u, [[36, 24], [50, 18], [64, 24]], '#868e96', 2.4);
        // Caja.
        circ(c, u, 50, 54, 32, rg(c, 40 * u, 42 * u, 4 * u, 50 * u, 54 * u, 32 * u, [[0, '#74c0fc'], [0.7, '#1c7ed6'], [1, '#0b4f8a']]), '#0b3d6b', 1.2);
        circ(c, u, 50, 54, 25, rg(c, 45 * u, 49 * u, 2 * u, 50 * u, 54 * u, 25 * u, [[0, '#ffffff'], [0.85, '#f1f3f5'], [1, '#ced4da']]), '#868e96', 1);
        for (var i = 0; i < 12; i++) {
            var a = i / 12 * Math.PI * 2;
            var r0 = i % 3 ? 21 : 18.5;
            linea(c, u, [[50 + Math.cos(a) * r0, 54 + Math.sin(a) * r0], [50 + Math.cos(a) * 23, 54 + Math.sin(a) * 23]], '#343a40', i % 3 ? 1 : 2);
        }
        brillo(c, u, 40, 40, 9, 4, -0.6, 0.4);
    }
    function manecilla(c, u, largo, ancho, color) {
        // Gira desde el centro del lienzo.
        poli(c, u, [[50 - ancho, 52], [50, 50 - largo], [50 + ancho, 52], [50, 55]], color);
    }
    function martillo(c, u) {
        linea(c, u, [[50, 70], [50, 22]], '#495057', 3);
        circ(c, u, 50, 18, 6, rg(c, 48 * u, 16 * u, 1, 50 * u, 18 * u, 6 * u, [[0, '#fff'], [1, '#868e96']]));
    }

    /* ── Avión ────────────────────────────────────────────────── */

    function avion(c, u) {
        // Ala trasera (detrás del fuselaje).
        poli(c, u, [[44, 52], [58, 52], [40, 30], [33, 30]], vert(c, u, 30, 52, ['#a5d8ff', '#4dabf7']), '#1864ab', 0.8);
        // Cola.
        poli(c, u, [[8, 50], [22, 50], [14, 22], [6, 22]], vert(c, u, 22, 50, ['#ff8787', '#e03131']), '#9b1c1c', 0.8);
        // Fuselaje.
        c.beginPath();
        c.moveTo(8 * u, 50 * u);
        c.lineTo(78 * u, 47 * u);
        c.quadraticCurveTo(96 * u, 50 * u, 92 * u, 58 * u);
        c.quadraticCurveTo(88 * u, 64 * u, 74 * u, 64 * u);
        c.lineTo(20 * u, 63 * u);
        c.quadraticCurveTo(10 * u, 60 * u, 8 * u, 50 * u);
        c.closePath();
        c.fillStyle = vert(c, u, 46, 64, ['#ffffff', '#f1f3f5', '#ced4da', '#868e96']);
        c.fill();
        c.strokeStyle = '#495057';
        c.lineWidth = 0.9 * u;
        c.stroke();
        // Franja y ventanillas.
        poli(c, u, [[14, 57], [86, 57], [84, 59.5], [16, 59.5]], '#1c7ed6');
        for (var i = 0; i < 9; i++) circ(c, u, 28 + i * 6, 52.5, 1.6, '#1864ab');
        // Cabina.
        poli(c, u, [[82, 49], [89, 50.5], [91, 54], [83, 53.5]], '#1864ab');
        brillo(c, u, 86, 50.8, 2.2, 0.8, 0.3, 0.7);
        // Ala delantera y motor.
        poli(c, u, [[42, 58], [60, 58], [44, 80], [34, 80]], vert(c, u, 58, 80, ['#dee2e6', '#868e96']), '#495057', 0.8);
        caja(c, u, 46, 64, 16, 7, 3.5, horiz(c, u, 46, 62, ['#495057', '#dee2e6', '#868e96']), '#343a40');
        circ(c, u, 61.5, 67.5, 3, '#212529');
        brillo(c, u, 48, 50, 18, 1.2, -0.03, 0.8);
        // Ruedas (tren de aterrizaje).
        linea(c, u, [[30, 63], [30, 68]], '#495057', 1.4);
        linea(c, u, [[78, 63], [78, 68]], '#495057', 1.4);
        circ(c, u, 30, 69, 2.6, '#212529');
        circ(c, u, 78, 69, 2.6, '#212529');
    }

    /* ── Tren ─────────────────────────────────────────────────── */

    function locomotora(c, u) {
        // Chimenea.
        poli(c, u, [[60, 20], [74, 20], [71, 36], [63, 36]], vert(c, u, 20, 36, ['#495057', '#212529']), '#000', 0.8);
        caja(c, u, 58, 17, 18, 4, 1.5, '#343a40');
        // Caldera.
        caja(c, u, 40, 34, 46, 26, 12, vert(c, u, 34, 60, ['#69db7c', '#2f9e44', '#1b5e20']), '#14532d', 1);
        brillo(c, u, 60, 38, 18, 2, 0, 0.45);
        [52, 68].forEach(function (x) { linea(c, u, [[x, 35], [x, 59]], '#ffd43b', 1.6); });
        circ(c, u, 86, 47, 6, rg(c, 85 * u, 45 * u, 1, 86 * u, 47 * u, 6 * u, [[0, '#fff9db'], [0.4, '#ffe066'], [1, '#f08c00']]), '#7a4500', 0.8);
        // Cabina.
        caja(c, u, 10, 22, 34, 40, 3, vert(c, u, 22, 62, ['#ff8787', '#e03131', '#9b1c1c']), '#7c1d1d', 1);
        caja(c, u, 6, 17, 42, 7, 2.5, vert(c, u, 17, 24, ['#495057', '#212529']));
        caja(c, u, 16, 28, 22, 15, 2, vert(c, u, 28, 43, ['#d0ebff', '#74c0fc']), '#1864ab', 0.8);
        brillo(c, u, 22, 31, 4, 1.4, -0.5, 0.7);
        // Chasis y defensa.
        caja(c, u, 8, 60, 82, 9, 2, vert(c, u, 60, 69, ['#495057', '#212529']));
        poli(c, u, [[86, 60], [96, 74], [86, 74]], '#c92a2a', '#7c1d1d', 0.8);
        caja(c, u, 80, 62, 10, 5, 1, '#ffd43b');
    }

    function vagon(c, u) {
        caja(c, u, 8, 30, 84, 32, 4, vert(c, u, 30, 62, ['#ffd43b', '#f59f00', '#c77700']), '#7a4500', 1);
        caja(c, u, 4, 26, 92, 6, 3, vert(c, u, 26, 32, ['#495057', '#212529']));
        for (var i = 0; i < 3; i++) {
            caja(c, u, 15 + i * 25, 36, 18, 13, 2, vert(c, u, 36, 49, ['#d0ebff', '#74c0fc']), '#1864ab', 0.8);
            circ(c, u, 22 + i * 25, 41, 2.2, '#ffc9a3');
        }
        caja(c, u, 6, 60, 88, 8, 2, vert(c, u, 60, 68, ['#495057', '#212529']));
    }

    /* ── Ambulancia, camión y moto ────────────────────────────── */

    function ambulancia(c, u) {
        caja(c, u, 6, 26, 62, 44, 5, vert(c, u, 26, 70, ['#ffffff', '#f1f3f5', '#ced4da']), '#495057', 1);
        // Cabina con parabrisas.
        c.beginPath();
        c.moveTo(68 * u, 36 * u);
        c.lineTo(84 * u, 36 * u);
        c.quadraticCurveTo(92 * u, 46 * u, 94 * u, 54 * u);
        c.lineTo(94 * u, 70 * u);
        c.lineTo(68 * u, 70 * u);
        c.closePath();
        c.fillStyle = vert(c, u, 36, 70, ['#ffffff', '#e9ecef', '#ced4da']);
        c.fill();
        c.strokeStyle = '#495057';
        c.lineWidth = 1 * u;
        c.stroke();
        poli(c, u, [[72, 40], [83, 40], [89, 52], [72, 52]], vert(c, u, 40, 52, ['#d0ebff', '#4dabf7']), '#1864ab', 0.8);
        brillo(c, u, 77, 43, 3, 1.2, -0.6, 0.7);
        // Franja y cruz.
        poli(c, u, [[6, 56], [94, 56], [94, 61], [6, 61]], '#e03131');
        caja(c, u, 30, 32, 6, 18, 1, '#e03131');
        caja(c, u, 24, 38, 18, 6, 1, '#e03131');
        caja(c, u, 50, 34, 12, 14, 1.5, vert(c, u, 34, 48, ['#d0ebff', '#74c0fc']), '#1864ab', 0.7);
        // Faro y parachoques.
        caja(c, u, 90, 58, 5, 5, 1.5, '#ffe066');
        caja(c, u, 4, 68, 92, 5, 2, '#495057');
        // Base de la baliza (las luces las anima el actor).
        caja(c, u, 26, 21, 26, 6, 2, '#495057');
    }

    function baliza(c, u, color) {
        var cols = color === 'azul' ? ['#d0ebff', '#339af0', '#1864ab'] : ['#ffe3e3', '#ff4d4d', '#a61e1e'];
        circ(c, u, 50, 50, 46, rg(c, 40 * u, 38 * u, 3 * u, 50 * u, 50 * u, 46 * u, [[0, cols[0]], [0.5, cols[1]], [1, cols[2]]]));
        brillo(c, u, 38, 34, 14, 8, -0.6, 0.6);
    }

    function camion(c, u) {
        // Caja de carga.
        caja(c, u, 4, 20, 60, 48, 3, vert(c, u, 20, 68, ['#ffa94d', '#f76707', '#c2410c']), '#7c2d12', 1);
        for (var i = 1; i < 6; i++) linea(c, u, [[4 + i * 10, 22], [4 + i * 10, 66]], 'rgba(124,45,18,0.35)', 1);
        brillo(c, u, 30, 24, 22, 1.5, 0, 0.35);
        // Cabina.
        c.beginPath();
        c.moveTo(66 * u, 30 * u);
        c.lineTo(84 * u, 30 * u);
        c.quadraticCurveTo(94 * u, 40 * u, 95 * u, 52 * u);
        c.lineTo(95 * u, 70 * u);
        c.lineTo(66 * u, 70 * u);
        c.closePath();
        c.fillStyle = vert(c, u, 30, 70, ['#4dabf7', '#1c7ed6', '#0b4f8a']);
        c.fill();
        c.strokeStyle = '#0b3d6b';
        c.lineWidth = 1 * u;
        c.stroke();
        poli(c, u, [[70, 34], [83, 34], [90, 47], [70, 47]], vert(c, u, 34, 47, ['#e7f5ff', '#a5d8ff']), '#1864ab', 0.8);
        brillo(c, u, 75, 37, 3, 1.2, -0.6, 0.7);
        caja(c, u, 90, 56, 5, 5, 1.5, '#ffe066');
        caja(c, u, 2, 66, 95, 6, 2, '#343a40');
        linea(c, u, [[70, 30], [70, 18]], '#868e96', 2);
        caja(c, u, 68, 14, 4, 5, 1, '#495057');
    }

    function motocicleta(c, u) {
        // Ruedas en (22,68) y (78,68) las pone el actor.
        linea(c, u, [[22, 68], [44, 52], [64, 52], [78, 68]], '#212529', 4);
        linea(c, u, [[70, 30], [78, 68]], cromo(c, u, 68, 80), 3.4);
        // Tanque y asiento.
        c.beginPath();
        c.moveTo(40 * u, 50 * u);
        c.quadraticCurveTo(44 * u, 36 * u, 58 * u, 36 * u);
        c.quadraticCurveTo(70 * u, 37 * u, 70 * u, 46 * u);
        c.lineTo(64 * u, 54 * u);
        c.lineTo(42 * u, 56 * u);
        c.closePath();
        c.fillStyle = vert(c, u, 36, 56, ['#ff8787', '#e03131', '#9b1c1c']);
        c.fill();
        c.strokeStyle = '#7c1d1d';
        c.lineWidth = 0.9 * u;
        c.stroke();
        brillo(c, u, 56, 39.5, 8, 1.6, 0, 0.6);
        poli(c, u, [[22, 46], [44, 44], [42, 50], [24, 51]], vert(c, u, 44, 51, ['#495057', '#111']));
        // Motor y escape.
        caja(c, u, 42, 54, 18, 12, 3, horiz(c, u, 42, 60, ['#495057', '#ced4da', '#495057']), '#212529', 0.8);
        linea(c, u, [[46, 64], [24, 62], [12, 58]], cromo(c, u, 10, 46), 3.4);
        // Manubrio y faro.
        linea(c, u, [[64, 30], [72, 26], [78, 28]], '#212529', 3);
        circ(c, u, 78, 38, 5, rg(c, 77 * u, 37 * u, 1, 78 * u, 38 * u, 5 * u, [[0, '#fff9db'], [0.5, '#ffe066'], [1, '#e67700']]), '#495057', 0.8);
        // Guardabarros.
        c.beginPath();
        c.arc(78 * u, 68 * u, 22 * u, Math.PI * 1.1, Math.PI * 1.6);
        c.strokeStyle = '#e03131';
        c.lineWidth = 3 * u;
        c.stroke();
    }

    /* ── Máquinas de casa ─────────────────────────────────────── */

    function aspiradora(c, u) {
        // Mango y bolsa (vertical); el cepillo abajo.
        linea(c, u, [[58, 10], [52, 62]], cromo(c, u, 50, 60), 3.6);
        linea(c, u, [[50, 9], [64, 11]], '#212529', 4.4);
        c.beginPath();
        c.moveTo(42 * u, 26 * u);
        c.quadraticCurveTo(38 * u, 46 * u, 44 * u, 66 * u);
        c.lineTo(64 * u, 66 * u);
        c.quadraticCurveTo(70 * u, 46 * u, 64 * u, 26 * u);
        c.closePath();
        c.fillStyle = horiz(c, u, 38, 70, ['#5f3dc4', '#b197fc', '#7950f2', '#3b1f8c']);
        c.fill();
        c.strokeStyle = '#2b1170';
        c.lineWidth = 1 * u;
        c.stroke();
        brillo(c, u, 47, 40, 2, 9, 0.05, 0.5);
        circ(c, u, 54, 48, 5, rg(c, 53 * u, 47 * u, 1, 54 * u, 48 * u, 5 * u, [[0, '#fff'], [0.5, '#63e6be'], [1, '#087f5b']]), '#2b1170', 0.6);
        // Cepillo.
        caja(c, u, 24, 66, 56, 14, 5, vert(c, u, 66, 80, ['#868e96', '#495057', '#212529']), '#111', 0.9);
        caja(c, u, 26, 79, 52, 3, 1, '#ffd43b');
        circ(c, u, 32, 83, 4, '#212529');
        circ(c, u, 72, 83, 4, '#212529');
        brillo(c, u, 50, 69, 20, 1.2, 0, 0.35);
    }

    function secador(c, u) {
        // Cuerpo con boquilla a la derecha y mango abajo.
        caja(c, u, 34, 56, 16, 34, 6, horiz(c, u, 34, 50, ['#a61e4d', '#f783ac', '#c2255c']), '#87163f', 1);
        circ(c, u, 36, 46, 22, rg(c, 30 * u, 38 * u, 3 * u, 36 * u, 46 * u, 22 * u, [[0, '#ffdeeb'], [0.5, '#f06595'], [1, '#a61e4d']]), '#87163f', 1);
        caja(c, u, 50, 37, 34, 18, 4, vert(c, u, 37, 55, ['#ffdeeb', '#f06595', '#a61e4d']), '#87163f', 1);
        caja(c, u, 82, 35, 8, 22, 3, vert(c, u, 35, 57, ['#495057', '#212529']));
        circ(c, u, 36, 46, 12, '#3b0a1f');
        for (var i = 0; i < 4; i++) linea(c, u, [[28, 40 + i * 4], [44, 40 + i * 4]], '#87163f', 1.4);
        brillo(c, u, 28, 34, 7, 3, -0.6, 0.5);
        caja(c, u, 46, 66, 5, 9, 2, '#ffd43b', '#a35d00');
        linea(c, u, [[42, 90], [40, 96], [24, 96]], '#495057', 2);
    }

    function licuadoraBase(c, u) {
        poli(c, u, [[26, 92], [74, 92], [70, 66], [30, 66]], vert(c, u, 66, 92, ['#868e96', '#495057', '#212529']), '#111', 1);
        brillo(c, u, 40, 70, 8, 1.4, 0, 0.35);
        [40, 50, 60].forEach(function (x, i) { circ(c, u, x, 80, 3, ['#40c057', '#ffd43b', '#fa5252'][i], '#111', 0.5); });
    }
    function licuadoraVaso(c, u) {
        // Vaso de vidrio con licuado (el remolino lo anima el actor).
        poli(c, u, [[26, 10], [74, 10], [68, 68], [32, 68]], 'rgba(208,235,255,0.35)', '#4dabf7', 1);
        poli(c, u, [[29.5, 34], [70.5, 34], [68, 66], [32, 66]], vert(c, u, 34, 66, ['#ff8787', '#f06595', '#c2255c']));
        caja(c, u, 24, 6, 52, 7, 2, vert(c, u, 6, 13, ['#495057', '#212529']));
        linea(c, u, [[74, 18], [86, 22], [84, 50], [71, 52]], 'rgba(77,171,247,0.8)', 3);
        poli(c, u, [[30, 14], [36, 14], [34, 62], [32, 62]], 'rgba(255,255,255,0.45)');
        circ(c, u, 44, 50, 4, '#ff6b6b');
        circ(c, u, 56, 46, 3.4, '#ffd43b');
        circ(c, u, 52, 58, 3, '#fff');
    }

    function ventiladorBase(c, u) {
        linea(c, u, [[50, 52], [50, 86]], cromo(c, u, 47, 53), 4);
        elipse(c, 50 * u, 90 * u, 22 * u, 6 * u, 0);
        c.fillStyle = vert(c, u, 84, 96, ['#e9ecef', '#868e96']);
        c.fill();
        // Rejilla.
        circ(c, u, 50, 42, 38, 'rgba(233,236,239,0.25)', '#adb5bd', 1.6);
        for (var i = 0; i < 4; i++) circ(c, u, 50, 42, 10 + i * 7, null, 'rgba(173,181,189,0.6)', 0.7);
    }
    function ventiladorRejillaFrente(c, u) {
        circ(c, u, 50, 50, 46, null, '#ced4da', 2);
        for (var i = 0; i < 12; i++) {
            var a = i / 12 * Math.PI * 2;
            linea(c, u, [[50 + Math.cos(a) * 12, 50 + Math.sin(a) * 12], [50 + Math.cos(a) * 46, 50 + Math.sin(a) * 46]], 'rgba(206,212,218,0.7)', 0.8);
        }
        circ(c, u, 50, 50, 11, rg(c, 47 * u, 47 * u, 1, 50 * u, 50 * u, 11 * u, [[0, '#fff'], [1, '#228be6']]), '#1864ab', 0.8);
    }
    function aspas(c, u) {
        for (var i = 0; i < 3; i++) {
            c.save();
            c.translate(50 * u, 50 * u);
            c.rotate(i / 3 * Math.PI * 2);
            c.beginPath();
            c.moveTo(0, 0);
            c.bezierCurveTo(10 * u, -12 * u, 34 * u, -18 * u, 42 * u, -6 * u);
            c.bezierCurveTo(40 * u, 6 * u, 18 * u, 8 * u, 0, 0);
            c.fillStyle = lg(c, 0, -14 * u, 0, 8 * u, [[0, '#a5d8ff'], [1, '#1c7ed6']]);
            c.fill();
            c.strokeStyle = '#1864ab';
            c.lineWidth = 0.8 * u;
            c.stroke();
            c.restore();
        }
    }

    /* ── Puerta, ventana y cajón ──────────────────────────────── */

    function puertaMarco(c, u) {
        // Hueco iluminado (lo que se ve al abrir) y marco de madera.
        caja(c, u, 22, 6, 56, 90, 2, vert(c, u, 6, 96, ['#fff9db', '#ffe8a3', '#fcc419']));
        // Silueta de la sala al otro lado: ventana y planta.
        caja(c, u, 50, 22, 18, 18, 1, 'rgba(116,192,252,0.7)');
        circ(c, u, 34, 70, 7, 'rgba(64,192,87,0.75)');
        caja(c, u, 31, 74, 6, 12, 1, 'rgba(173,99,55,0.75)');
        c.lineWidth = 5 * u;
        c.strokeStyle = horiz(c, u, 16, 84, ['#5c3317', '#a0522d', '#7a4520']);
        c.strokeRect(19.5 * u, 3.5 * u, 61 * u, 95 * u);
        caja(c, u, 12, 94, 76, 5, 1, vert(c, u, 94, 99, ['#868e96', '#495057']));
    }
    function puertaHoja(c, u) {
        // La hoja gira desde su borde izquierdo (bisagra): origen (0.22, ·).
        caja(c, u, 22, 6, 56, 88, 2, horiz(c, u, 22, 78, ['#a0522d', '#cd853f', '#b8692e', '#8b4513']), '#5c3317', 1);
        [[28, 12, 44, 30], [28, 50, 44, 38]].forEach(function (r) {
            caja(c, u, r[0], r[1], r[2], r[3], 2, 'rgba(0,0,0,0.12)', 'rgba(92,51,23,0.6)');
            linea(c, u, [[r[0] + 1, r[1] + 1], [r[0] + r[2] - 1, r[1] + 1]], 'rgba(255,255,255,0.25)', 1);
        });
        circ(c, u, 70, 52, 3.4, rg(c, 69 * u, 51 * u, 0.4 * u, 70 * u, 52 * u, 3.4 * u, [[0, '#fff9db'], [0.5, '#ffd43b'], [1, '#a35d00']]));
        caja(c, u, 22, 18, 2.4, 8, 1, '#868e96');
        caja(c, u, 22, 72, 2.4, 8, 1, '#868e96');
    }

    function ventanaMarco(c, u) {
        // Paisaje detrás del vidrio, cortina recogida y alféizar.
        caja(c, u, 14, 14, 72, 64, 2, vert(c, u, 14, 78, ['#74c0fc', '#d0ebff', '#b2f2bb']));
        circ(c, u, 70, 28, 6, '#ffe066');
        elipse(c, 36 * u, 72 * u, 30 * u, 10 * u, 0); c.fillStyle = '#51cf66'; c.fill();
        elipse(c, 72 * u, 76 * u, 22 * u, 8 * u, 0); c.fillStyle = '#40c057'; c.fill();
        circ(c, u, 32, 28, 4, 'rgba(255,255,255,0.9)');
        circ(c, u, 37, 27, 5, 'rgba(255,255,255,0.9)');
        c.lineWidth = 5 * u;
        c.strokeStyle = vert(c, u, 10, 82, ['#f8f9fa', '#ced4da']);
        c.strokeRect(11.5 * u, 11.5 * u, 77 * u, 69 * u);
        caja(c, u, 6, 80, 88, 7, 2, vert(c, u, 80, 87, ['#f8f9fa', '#adb5bd']), '#868e96', 0.6);
        // Cortinas a los lados.
        [[4, 18], [80, 96]].forEach(function (x) {
            poli(c, u, [[x[0], 6], [x[1], 6], [x[1] - 2, 76], [x[0] + 2, 76]], horiz(c, u, x[0], x[1], ['#e64980', '#faa2c1', '#d6336c']));
        });
        caja(c, u, 2, 3, 96, 4, 2, '#a0522d');
    }
    function ventanaHoja(c, u) {
        // Media hoja de vidrio con marco (se desliza).
        c.lineWidth = 3.4 * u;
        c.strokeStyle = '#f1f3f5';
        c.fillStyle = 'rgba(231,245,255,0.28)';
        redondo(c, 4 * u, 4 * u, 92 * u, 92 * u, 2 * u);
        c.fill();
        c.stroke();
        poli(c, u, [[14, 10], [28, 10], [10, 50], [8, 40]], 'rgba(255,255,255,0.5)');
        caja(c, u, 84, 44, 4, 12, 2, '#868e96');
    }

    function comoda(c, u) {
        caja(c, u, 10, 20, 80, 70, 3, horiz(c, u, 10, 90, ['#8b4513', '#cd853f', '#a0522d', '#6b3410']), '#4a2410', 1);
        caja(c, u, 6, 15, 88, 8, 2, vert(c, u, 15, 23, ['#d2a06d', '#8b4513']), '#4a2410', 0.8);
        // Hueco del cajón de arriba (el cajón lo pone el actor) y cajón de abajo.
        caja(c, u, 16, 28, 68, 24, 2, '#2b1608');
        caja(c, u, 16, 58, 68, 24, 2, horiz(c, u, 16, 84, ['#a0522d', '#deb887', '#b8692e']), '#4a2410', 0.8);
        caja(c, u, 43, 68, 14, 4, 2, '#ffd43b', '#a35d00', 0.5);
        caja(c, u, 14, 90, 8, 6, 1, '#4a2410');
        caja(c, u, 78, 90, 8, 6, 1, '#4a2410');
        // Lámpara encima.
        caja(c, u, 66, 4, 16, 12, 3, vert(c, u, 4, 16, ['#fff3bf', '#ffd43b']), '#a35d00', 0.6);
        linea(c, u, [[74, 16], [74, 20]], '#495057', 1.6);
    }
    function cajon(c, u) {
        // Frente del cajón (lienzo 100×100, ocupa la franja central) con calcetines asomando.
        caja(c, u, 4, 22, 92, 56, 3, horiz(c, u, 4, 96, ['#a0522d', '#deb887', '#b8692e']), '#4a2410', 1.2);
        caja(c, u, 38, 44, 24, 9, 4, '#ffd43b', '#a35d00', 0.8);
        brillo(c, u, 50, 27, 38, 2, 0, 0.3);
    }
    function cajonInterior(c, u) {
        // Lo que se ve dentro al abrir: calcetines y un osito.
        caja(c, u, 6, 30, 88, 40, 3, '#5c3317');
        caja(c, u, 14, 26, 18, 14, 4, '#ff8787');
        caja(c, u, 34, 28, 18, 12, 4, '#74c0fc');
        circ(c, u, 70, 30, 9, '#d9a066');
        circ(c, u, 63, 23, 3.6, '#d9a066');
        circ(c, u, 77, 23, 3.6, '#d9a066');
        circ(c, u, 67, 29, 1.2, '#222');
        circ(c, u, 73, 29, 1.2, '#222');
    }

    /* ── Agua ─────────────────────────────────────────────────── */

    function lavamanos(c, u) {
        // Azulejos, lavamanos y vaso. La llave (pluma) la pone el actor arriba.
        for (var y = 0; y < 3; y++) for (var x = 0; x < 4; x++) {
            caja(c, u, 6 + x * 22, 4 + y * 18, 21, 17, 1.5, (x + y) % 2 ? '#e3fafc' : '#c5f6fa', 'rgba(21,170,191,0.25)', 0.5);
        }
        c.beginPath();
        c.moveTo(8 * u, 58 * u);
        c.lineTo(92 * u, 58 * u);
        c.quadraticCurveTo(90 * u, 86 * u, 50 * u, 88 * u);
        c.quadraticCurveTo(10 * u, 86 * u, 8 * u, 58 * u);
        c.closePath();
        c.fillStyle = vert(c, u, 58, 88, ['#ffffff', '#e9ecef', '#adb5bd']);
        c.fill();
        c.strokeStyle = '#868e96';
        c.lineWidth = 1 * u;
        c.stroke();
        elipse(c, 50 * u, 62 * u, 34 * u, 4 * u, 0);
        c.fillStyle = '#ced4da';
        c.fill();
        circ(c, u, 50, 63, 1.8, '#495057');
        caja(c, u, 44, 86, 12, 12, 2, vert(c, u, 86, 98, ['#e9ecef', '#adb5bd']));
        // Tubo de la llave.
        caja(c, u, 46, 44, 8, 16, 2, cromo(c, u, 46, 54), '#495057', 0.6);
        caja(c, u, 46, 38, 30, 8, 3, cromo(c, u, 46, 76), '#495057', 0.6);
        caja(c, u, 70, 44, 6, 6, 1, cromo(c, u, 70, 76));
    }
    function manija(c, u) {
        // Manija en cruz de la llave: gira desde el centro.
        caja(c, u, 18, 44, 64, 12, 6, cromo(c, u, 18, 82), '#495057', 0.8);
        caja(c, u, 44, 18, 12, 64, 6, cromo(c, u, 44, 56), '#495057', 0.8);
        circ(c, u, 50, 50, 10, rg(c, 48 * u, 48 * u, 1, 50 * u, 50 * u, 10 * u, [[0, '#fff'], [0.5, '#4dabf7'], [1, '#1864ab']]));
    }

    function ducha(c, u) {
        for (var y = 0; y < 5; y++) for (var x = 0; x < 4; x++) {
            caja(c, u, 4 + x * 23, 4 + y * 19, 22, 18, 1.5, (x + y) % 2 ? '#e7f5ff' : '#d0ebff', 'rgba(28,126,214,0.2)', 0.5);
        }
        linea(c, u, [[80, 96], [80, 14], [64, 14], [56, 22]], cromo(c, u, 50, 84), 3.4);
        // Regadera de la ducha (de donde sale la lluvia).
        c.save();
        c.translate(52 * u, 25 * u);
        c.rotate(-0.5);
        caja(c, u, -12, -3, 24, 8, 4, cromo(c, u, -12, 12), '#495057', 0.8);
        c.restore();
        caja(c, u, 72, 52, 16, 8, 3, cromo(c, u, 72, 88), '#495057', 0.6);
        // Plato y pato.
        caja(c, u, 4, 88, 92, 8, 2, vert(c, u, 88, 96, ['#ffffff', '#adb5bd']));
        circ(c, u, 22, 84, 5, '#ffd43b');
        circ(c, u, 26, 79, 3.4, '#ffd43b');
        poli(c, u, [[29, 79], [33, 80], [29, 81]], '#f76707');
        circ(c, u, 26.5, 78.3, 0.8, '#222');
    }

    function fuente(c, u) {
        // Pileta de piedra en dos niveles (los chorros los anima el actor).
        elipse(c, 50 * u, 84 * u, 46 * u, 12 * u, 0);
        c.fillStyle = vert(c, u, 72, 96, ['#ced4da', '#868e96']);
        c.fill();
        elipse(c, 50 * u, 78 * u, 42 * u, 9 * u, 0);
        c.fillStyle = vert(c, u, 70, 87, ['#4dabf7', '#1c7ed6']);
        c.fill();
        brillo(c, u, 38, 76, 12, 2, 0, 0.45);
        caja(c, u, 44, 46, 12, 32, 3, horiz(c, u, 44, 56, ['#868e96', '#e9ecef', '#868e96']));
        elipse(c, 50 * u, 46 * u, 22 * u, 6 * u, 0);
        c.fillStyle = vert(c, u, 40, 52, ['#e9ecef', '#868e96']);
        c.fill();
        elipse(c, 50 * u, 44 * u, 18 * u, 4 * u, 0);
        c.fillStyle = '#74c0fc';
        c.fill();
        caja(c, u, 47, 28, 6, 16, 2, horiz(c, u, 47, 53, ['#868e96', '#e9ecef', '#868e96']));
        circ(c, u, 50, 27, 4, '#adb5bd');
    }

    function lavadora(c, u) {
        caja(c, u, 14, 8, 72, 86, 5, vert(c, u, 8, 94, ['#ffffff', '#f1f3f5', '#ced4da']), '#868e96', 1);
        caja(c, u, 14, 8, 72, 16, 5, vert(c, u, 8, 24, ['#e9ecef', '#ced4da']));
        circ(c, u, 72, 16, 4.6, cromo(c, u, 67, 77), '#495057', 0.6);
        caja(c, u, 22, 13, 18, 6, 1.5, '#212529');
        circ(c, u, 24.5, 16, 1, '#40c057');
        // Ojo de buey (la ropa que gira la pone el actor).
        circ(c, u, 50, 58, 27, cromo(c, u, 23, 77), '#495057', 1);
        circ(c, u, 50, 58, 21, '#1864ab');
        brillo(c, u, 41, 49, 7, 3.4, -0.7, 0.35);
    }
    function ropaGirando(c, u) {
        // Círculo de agua con ropa (se ve a través del vidrio y gira).
        circ(c, u, 50, 50, 48, rg(c, 50 * u, 50 * u, 10 * u, 50 * u, 50 * u, 48 * u, [[0, '#a5d8ff'], [1, '#1c7ed6']]));
        c.save();
        circ(c, u, 50, 50, 48);
        c.clip();
        caja(c, u, 18, 52, 34, 26, 8, '#ff8787');
        caja(c, u, 50, 20, 28, 30, 8, '#ffd43b');
        caja(c, u, 26, 22, 22, 18, 6, '#69db7c');
        for (var i = 0; i < 6; i++) circ(c, u, 25 + i * 10, 80 - (i % 2) * 10, 3, 'rgba(255,255,255,0.75)');
        c.restore();
    }

    function regadera(c, u) {
        // Regadera de jardín (se inclina hacia la derecha).
        c.beginPath();
        c.moveTo(20 * u, 40 * u);
        c.lineTo(62 * u, 40 * u);
        c.lineTo(66 * u, 84 * u);
        c.lineTo(16 * u, 84 * u);
        c.closePath();
        c.fillStyle = horiz(c, u, 16, 66, ['#2b8a3e', '#69db7c', '#40c057', '#1b5e20']);
        c.fill();
        c.strokeStyle = '#14532d';
        c.lineWidth = 1 * u;
        c.stroke();
        brillo(c, u, 26, 60, 2, 14, 0, 0.45);
        linea(c, u, [[60, 72], [86, 44]], horiz(c, u, 60, 86, ['#2b8a3e', '#69db7c']), 4.4);
        poli(c, u, [[83, 40], [94, 36], [96, 46], [88, 49]], '#2f9e44', '#14532d', 0.8);
        c.beginPath();
        c.arc(40 * u, 38 * u, 16 * u, Math.PI, 0);
        c.strokeStyle = '#2b8a3e';
        c.lineWidth = 3.4 * u;
        c.stroke();
        elipse(c, 41 * u, 40 * u, 21 * u, 3 * u, 0);
        c.fillStyle = '#14532d';
        c.fill();
    }

    /* ── Personas (piezas para animar) ────────────────────────── */

    var PIEL = P.PIEL;

    function cabeza(c, u, pelo, nina) {
        // Pelo detrás.
        if (nina) {
            circ(c, u, 50, 52, 38, pelo);
            circ(c, u, 18, 66, 12, pelo);
            circ(c, u, 82, 66, 12, pelo);
        }
        circ(c, u, 50, 54, 32, rg(c, 40 * u, 44 * u, 4 * u, 50 * u, 54 * u, 32 * u, [[0, PIEL.luz], [0.6, PIEL.base], [1, PIEL.sombra]]));
        circ(c, u, 18, 56, 6, PIEL.base);
        circ(c, u, 82, 56, 6, PIEL.base);
        // Flequillo.
        c.beginPath();
        c.moveTo(18 * u, 48 * u);
        c.quadraticCurveTo(20 * u, 16 * u, 50 * u, 16 * u);
        c.quadraticCurveTo(80 * u, 16 * u, 82 * u, 48 * u);
        c.quadraticCurveTo(66 * u, 36 * u, 56 * u, 40 * u);
        c.quadraticCurveTo(44 * u, 30 * u, 18 * u, 48 * u);
        c.fillStyle = pelo;
        c.fill();
        brillo(c, u, 40, 22, 10, 3, -0.2, 0.25);
        // Mejillas y boca (los ojos los pone el actor para parpadear).
        circ(c, u, 30, 66, 5, 'rgba(255,135,135,0.45)');
        circ(c, u, 70, 66, 5, 'rgba(255,135,135,0.45)');
        c.beginPath();
        c.arc(50 * u, 66 * u, 9 * u, 0.15 * Math.PI, 0.85 * Math.PI);
        c.strokeStyle = '#9c3d2c';
        c.lineWidth = 2.4 * u;
        c.lineCap = 'round';
        c.stroke();
    }
    function ojos(c, u) {
        circ(c, u, 38, 50, 5, '#2b2b2b');
        circ(c, u, 62, 50, 5, '#2b2b2b');
        circ(c, u, 39.5, 48.5, 1.8, '#fff');
        circ(c, u, 63.5, 48.5, 1.8, '#fff');
    }
    /** Tela con volumen: color base y luz/sombra encima. */
    function tela(c, u, x0, x1, col) {
        c.fillStyle = col;
        c.fill();
        c.fillStyle = horiz(c, u, x0, x1, ['rgba(0,0,0,0.22)', 'rgba(255,255,255,0.28)', 'rgba(255,255,255,0.05)', 'rgba(0,0,0,0.25)']);
        c.fill();
    }
    function torso(c, u, col) {
        caja(c, u, 20, 60, 60, 30, 4, vert(c, u, 60, 90, ['#4263eb', '#364fc7', '#25349a']));
        c.beginPath();
        c.moveTo(24 * u, 12 * u);
        c.quadraticCurveTo(50 * u, 4 * u, 76 * u, 12 * u);
        c.lineTo(80 * u, 64 * u);
        c.lineTo(20 * u, 64 * u);
        c.closePath();
        tela(c, u, 20, 80, col);
        circ(c, u, 50, 14, 8, PIEL.base);
        circ(c, u, 50, 36, 7, 'rgba(255,255,255,0.35)');
    }
    function brazo(c, u, col) {
        // Cuelga desde arriba (origen 0.5, 0.06).
        caja(c, u, 41, 26, 18, 56, 9, horiz(c, u, 41, 59, [PIEL.sombra, PIEL.base, PIEL.luz, PIEL.sombra]));
        circ(c, u, 50, 84, 11, rg(c, 47 * u, 81 * u, 1, 50 * u, 81 * u, 11 * u, [[0, PIEL.luz], [1, PIEL.sombra]]));
        redondo(c, 37 * u, 3 * u, 26 * u, 32 * u, 12 * u);
        tela(c, u, 37, 63, col);
    }
    function pierna(c, u) {
        caja(c, u, 36, 2, 28, 66, 12, horiz(c, u, 36, 64, ['#25349a', '#4263eb', '#364fc7']));
        caja(c, u, 30, 70, 40, 24, 10, vert(c, u, 70, 94, ['#ff6b6b', '#c92a2a']));
        caja(c, u, 28, 88, 44, 8, 3, '#f8f9fa');
    }
    function cama(c, u) {
        caja(c, u, 4, 34, 10, 56, 3, horiz(c, u, 4, 14, ['#8b4513', '#cd853f']));
        caja(c, u, 86, 50, 10, 40, 3, horiz(c, u, 86, 96, ['#8b4513', '#cd853f']));
        caja(c, u, 8, 62, 84, 18, 3, vert(c, u, 62, 80, ['#cd853f', '#8b4513']));
        caja(c, u, 12, 54, 76, 12, 4, '#f8f9fa');
        caja(c, u, 14, 46, 24, 12, 6, vert(c, u, 46, 58, ['#ffffff', '#dee2e6']), '#ced4da', 0.6);
    }
    function cobija(c, u) {
        c.beginPath();
        c.moveTo(30 * u, 58 * u);
        c.quadraticCurveTo(50 * u, 40 * u, 88 * u, 52 * u);
        c.lineTo(90 * u, 68 * u);
        c.lineTo(28 * u, 68 * u);
        c.closePath();
        c.fillStyle = horiz(c, u, 28, 90, ['#9775fa', '#b197fc', '#7950f2']);
        c.fill();
        for (var i = 0; i < 5; i++) circ(c, u, 40 + i * 10, 60 - (i === 2 ? 4 : 0), 1.8, 'rgba(255,255,255,0.6)');
    }

    /* ── Animales de la demostración ──────────────────────────── */

    function vaca(c, u) {
        caja(c, u, 14, 38, 64, 36, 16, vert(c, u, 38, 74, ['#ffffff', '#f1f3f5', '#ced4da']), '#495057', 1);
        circ(c, u, 34, 50, 8, '#343a40');
        circ(c, u, 58, 62, 7, '#343a40');
        circ(c, u, 48, 44, 4, '#343a40');
        [20, 32, 58, 70].forEach(function (x) { caja(c, u, x, 70, 7, 18, 3, '#e9ecef', '#495057', 0.8); caja(c, u, x, 84, 7, 5, 2, '#495057'); });
        linea(c, u, [[14, 46], [6, 60]], '#495057', 1.6);
        // Cabeza.
        caja(c, u, 66, 22, 26, 30, 12, vert(c, u, 22, 52, ['#ffffff', '#dee2e6']), '#495057', 1);
        caja(c, u, 68, 40, 24, 14, 7, '#ffc9c9', '#c92a2a', 0.6);
        circ(c, u, 74, 47, 1.6, '#862e2e');
        circ(c, u, 86, 47, 1.6, '#862e2e');
        circ(c, u, 74, 32, 2.4, '#222');
        circ(c, u, 85, 32, 2.4, '#222');
        poli(c, u, [[68, 22], [64, 12], [72, 20]], '#fff3bf', '#a35d00', 0.6);
        poli(c, u, [[90, 22], [94, 12], [86, 20]], '#fff3bf', '#a35d00', 0.6);
        caja(c, u, 66, 52, 8, 8, 3, '#ffc9c9');
    }
    function gallo(c, u) {
        // Cola de colores.
        [['#2f9e44', -0.6], ['#1c7ed6', -0.3], ['#e03131', 0]].forEach(function (p) {
            c.save();
            c.translate(32 * u, 50 * u);
            c.rotate(p[1]);
            elipse(c, -12 * u, -10 * u, 10 * u, 22 * u, -0.4);
            c.fillStyle = p[0];
            c.fill();
            c.restore();
        });
        elipse(c, 50 * u, 58 * u, 22 * u, 18 * u, 0);
        c.fillStyle = rg(c, 44 * u, 50 * u, 2 * u, 50 * u, 58 * u, 22 * u, [[0, '#ffd8a8'], [0.6, '#f76707'], [1, '#a03c00']]);
        c.fill();
        elipse(c, 46 * u, 60 * u, 12 * u, 8 * u, -0.3);
        c.fillStyle = '#c2410c';
        c.fill();
        circ(c, u, 66, 34, 11, rg(c, 63 * u, 31 * u, 1, 66 * u, 34 * u, 11 * u, [[0, '#ffe8cc'], [1, '#f08c00']]));
        poli(c, u, [[60, 24], [62, 16], [66, 22], [69, 14], [71, 22], [75, 18], [74, 27]], '#e03131');
        poli(c, u, [[76, 33], [86, 36], [76, 39]], '#fcc419', '#a35d00', 0.6);
        elipse(c, 74 * u, 44 * u, 3 * u, 5 * u, 0);
        c.fillStyle = '#e03131';
        c.fill();
        circ(c, u, 69, 31, 2, '#222');
        linea(c, u, [[44, 74], [42, 90], [36, 92]], '#f59f00', 2.4);
        linea(c, u, [[56, 74], [58, 90], [64, 92]], '#f59f00', 2.4);
    }

    /* ── Utilería de escena ───────────────────────────────────── */

    function bocina(c, u) {
        // Altavoz del botón de escuchar.
        poli(c, u, [[18, 38], [36, 38], [60, 16], [60, 84], [36, 62], [18, 62]], vert(c, u, 16, 84, ['#ffe066', '#fab005', '#e67700']), '#a35d00', 1.4);
        brillo(c, u, 40, 32, 6, 2, -0.7, 0.6);
        [[70, 12], [80, 22], [90, 32]].forEach(function (a) {
            c.beginPath();
            c.arc(54 * u, 50 * u, (a[0] - 50) * u, -0.7, 0.7);
            c.strokeStyle = '#ffffff';
            c.lineWidth = 5 * u;
            c.lineCap = 'round';
            c.stroke();
        });
    }
    function polaroid(c, u) {
        caja(c, u, 6, 4, 88, 92, 3, '#fffdf7', 'rgba(0,0,0,0.12)', 0.6);
        caja(c, u, 13, 11, 74, 64, 2, vert(c, u, 11, 75, ['#e7f5ff', '#d0ebff']));
        caja(c, u, 40, 0, 20, 8, 1, 'rgba(255,224,102,0.85)');
    }
    function arbol(c, u) {
        caja(c, u, 44, 54, 12, 44, 4, horiz(c, u, 44, 56, ['#5c3317', '#a0522d', '#6b3e1f']));
        [[50, 34, 30, '#2f9e44'], [30, 46, 20, '#37b24d'], [70, 46, 20, '#37b24d'], [50, 22, 22, '#51cf66']].forEach(function (b) {
            circ(c, u, b[0], b[1], b[2], rg(c, (b[0] - 6) * u, (b[1] - 8) * u, 2 * u, b[0] * u, b[1] * u, b[2] * u, [[0, '#8ce99a'], [0.6, b[3]], [1, '#1b5e20']]));
        });
    }
    function banca(c, u) {
        caja(c, u, 6, 30, 88, 8, 2, horiz(c, u, 6, 94, ['#a0522d', '#cd853f', '#8b4513']));
        caja(c, u, 6, 42, 88, 8, 2, horiz(c, u, 6, 94, ['#a0522d', '#cd853f', '#8b4513']));
        caja(c, u, 4, 58, 92, 9, 2, horiz(c, u, 4, 96, ['#b8692e', '#deb887', '#a0522d']));
        [12, 82].forEach(function (x) { caja(c, u, x, 30, 6, 64, 2, '#343a40'); });
    }
    function mesa(c, u) {
        caja(c, u, 2, 30, 96, 10, 3, vert(c, u, 30, 40, ['#deb887', '#a0522d']), '#6b3410', 0.8);
        caja(c, u, 10, 40, 8, 58, 2, horiz(c, u, 10, 18, ['#8b4513', '#cd853f']));
        caja(c, u, 82, 40, 8, 58, 2, horiz(c, u, 82, 90, ['#8b4513', '#cd853f']));
    }
    function lampara(c, u) {
        linea(c, u, [[50, 30], [50, 92]], '#495057', 3);
        elipse(c, 50 * u, 94 * u, 18 * u, 4 * u, 0);
        c.fillStyle = '#495057';
        c.fill();
        poli(c, u, [[30, 34], [70, 34], [62, 6], [38, 6]], vert(c, u, 6, 34, ['#fff3bf', '#ffd43b', '#f59f00']), '#a35d00', 0.8);
    }
    function sofa(c, u) {
        caja(c, u, 4, 30, 92, 40, 10, vert(c, u, 30, 70, ['#74c0fc', '#1c7ed6']), '#0b4f8a', 1);
        caja(c, u, 0, 46, 18, 40, 8, vert(c, u, 46, 86, ['#4dabf7', '#1864ab']), '#0b4f8a', 1);
        caja(c, u, 82, 46, 18, 40, 8, vert(c, u, 46, 86, ['#4dabf7', '#1864ab']), '#0b4f8a', 1);
        caja(c, u, 16, 56, 34, 24, 6, vert(c, u, 56, 80, ['#a5d8ff', '#339af0']), '#0b4f8a', 0.8);
        caja(c, u, 50, 56, 34, 24, 6, vert(c, u, 56, 80, ['#a5d8ff', '#339af0']), '#0b4f8a', 0.8);
        caja(c, u, 26, 36, 18, 18, 6, '#ffd43b');
    }
    function cuadro(c, u) {
        caja(c, u, 4, 10, 92, 80, 2, horiz(c, u, 4, 96, ['#a35d00', '#ffd43b', '#c77700']));
        caja(c, u, 12, 18, 76, 64, 1, vert(c, u, 18, 82, ['#a5d8ff', '#d3f9d8']));
        poli(c, u, [[12, 82], [40, 40], [60, 66], [72, 50], [88, 82]], '#51cf66');
        circ(c, u, 72, 32, 7, '#ffe066');
    }
    function nube(c, u) {
        [[30, 60, 18], [50, 50, 24], [72, 60, 18], [50, 66, 20]].forEach(function (b) { circ(c, u, b[0], b[1], b[2], 'rgba(255,255,255,0.95)'); });
    }
    function torre(c, u) {
        // Torre de control del aeropuerto.
        caja(c, u, 40, 40, 20, 58, 2, horiz(c, u, 40, 60, ['#adb5bd', '#f1f3f5', '#868e96']));
        poli(c, u, [[24, 40], [76, 40], [70, 18], [30, 18]], vert(c, u, 18, 40, ['#4dabf7', '#1864ab']), '#0b3d6b', 1);
        caja(c, u, 22, 12, 56, 7, 2, '#495057');
        linea(c, u, [[50, 12], [50, 2]], '#495057', 1.6);
        circ(c, u, 50, 2, 2, '#fa5252');
    }
    function estacion(c, u) {
        caja(c, u, 8, 36, 84, 60, 2, horiz(c, u, 8, 92, ['#e8b47a', '#ffd8a8', '#d9a066']), '#7a4a1f', 1);
        poli(c, u, [[2, 38], [98, 38], [84, 14], [16, 14]], vert(c, u, 14, 38, ['#e03131', '#9b1c1c']), '#5c0f0f', 1);
        circ(c, u, 50, 26, 7, '#fff', '#495057', 0.8);
        linea(c, u, [[50, 26], [50, 21.5]], '#222', 1);
        linea(c, u, [[50, 26], [53, 26]], '#222', 1);
        caja(c, u, 18, 50, 18, 26, 2, vert(c, u, 50, 76, ['#d0ebff', '#74c0fc']), '#1864ab', 0.8);
        caja(c, u, 64, 50, 18, 26, 2, vert(c, u, 64, 76, ['#d0ebff', '#74c0fc']), '#1864ab', 0.8);
        caja(c, u, 42, 56, 16, 40, 2, horiz(c, u, 42, 58, ['#8b4513', '#cd853f']), '#5c3317', 0.8);
    }
    function ventanaCasa(c, u) {
        caja(c, u, 8, 8, 84, 84, 3, vert(c, u, 8, 92, ['#ffd8a8', '#74c0fc', '#a5d8ff']), '#f8f9fa');
        c.lineWidth = 4 * u;
        c.strokeStyle = '#f8f9fa';
        c.strokeRect(8 * u, 8 * u, 84 * u, 84 * u);
        linea(c, u, [[50, 8], [50, 92]], '#f8f9fa', 3);
        linea(c, u, [[8, 50], [92, 50]], '#f8f9fa', 3);
    }
    function maquina(c, u) {
        // Máquina del laboratorio: marco metálico con remaches (la pantalla la dibuja la escena).
        caja(c, u, 2, 6, 96, 88, 8, vert(c, u, 6, 94, ['#e9ecef', '#adb5bd', '#868e96']), '#495057', 1.4);
        caja(c, u, 8, 12, 84, 62, 5, '#0b1d2b', '#343a40', 1);
        [[6, 10], [94, 10], [6, 90], [94, 90]].forEach(function (p) { circ(c, u, p[0], p[1], 1.6, '#495057'); });
        [[20, 84, '#fa5252'], [32, 84, '#fcc419'], [44, 84, '#51cf66']].forEach(function (b) { circ(c, u, b[0], b[1], 3.6, b[2], '#343a40', 0.6); });
        caja(c, u, 58, 80, 32, 8, 3, '#343a40');
        for (var i = 0; i < 6; i++) caja(c, u, 61 + i * 4.6, 82, 2.6, 4, 1, '#20c997');
    }
    function pedestal(c, u) {
        elipse(c, 50 * u, 76 * u, 44 * u, 12 * u, 0);
        c.fillStyle = vert(c, u, 64, 88, ['#dee2e6', '#868e96']);
        c.fill();
        elipse(c, 50 * u, 70 * u, 44 * u, 12 * u, 0);
        c.fillStyle = rg(c, 44 * u, 66 * u, 2 * u, 50 * u, 70 * u, 44 * u, [[0, '#f8f9fa'], [0.7, '#ced4da'], [1, '#adb5bd']]);
        c.fill();
        elipse(c, 50 * u, 70 * u, 36 * u, 8 * u, 0);
        c.strokeStyle = 'rgba(32,201,151,0.7)';
        c.lineWidth = 1.6 * u;
        c.stroke();
    }
    function frascoLab(c, u, color) {
        c.beginPath();
        c.moveTo(42 * u, 8 * u);
        c.lineTo(58 * u, 8 * u);
        c.lineTo(58 * u, 38 * u);
        c.lineTo(84 * u, 88 * u);
        c.quadraticCurveTo(86 * u, 94 * u, 78 * u, 94 * u);
        c.lineTo(22 * u, 94 * u);
        c.quadraticCurveTo(14 * u, 94 * u, 16 * u, 88 * u);
        c.lineTo(42 * u, 38 * u);
        c.closePath();
        c.fillStyle = 'rgba(231,245,255,0.45)';
        c.fill();
        c.strokeStyle = 'rgba(73,80,87,0.7)';
        c.lineWidth = 1.4 * u;
        c.stroke();
        c.save();
        c.clip();
        c.fillStyle = vert(c, u, 58, 94, [color, 'rgba(0,0,0,0.25)']);
        c.fillRect(0, 60 * u, 100 * u, 40 * u);
        c.restore();
        brillo(c, u, 30, 78, 2, 8, 0.45, 0.6);
    }

    /* ── Escondites de donde asoman los objetos (3-4) ─────────── */

    function cajaJuguetes(c, u) {
        // Baúl de juguetes de madera visto de frente, con la tapa abierta hacia atrás.
        poli(c, u, [[10, 30], [90, 30], [84, 8], [16, 8]], vert(c, u, 8, 30, ['#e8590c', '#ff922b']), '#a63e00', 1);
        caja(c, u, 6, 30, 88, 64, 6, horiz(c, u, 6, 94, ['#d9480f', '#ff8c3a', '#f76707', '#c2410c']), '#8a2c00', 1.2);
        caja(c, u, 6, 30, 88, 9, 4, vert(c, u, 30, 39, ['#ffd8a8', '#ffa94d']), '#8a2c00', 0.8);
        [[24, 62, '#4dabf7'], [50, 62, '#ffd43b'], [76, 62, '#69db7c']].forEach(function (s) {
            circ(c, u, s[0], s[1], 9, s[2], 'rgba(0,0,0,0.25)', 0.8);
            brillo(c, u, s[0] - 3, s[1] - 3, 3, 2, -0.6, 0.6);
        });
        brillo(c, u, 30, 46, 18, 1.6, 0, 0.3);
    }
    function maleta(c, u) {
        c.strokeStyle = '#343a40';
        c.lineWidth = 4 * u;
        redondo(c, 38 * u, 14 * u, 24 * u, 16 * u, 5 * u);
        c.stroke();
        caja(c, u, 6, 26, 88, 66, 8, horiz(c, u, 6, 94, ['#1864ab', '#4dabf7', '#339af0', '#1864ab']), '#0b3d6b', 1.2);
        [26, 50, 74].forEach(function (x) { caja(c, u, x - 2, 26, 4, 66, 1, 'rgba(255,255,255,0.35)'); });
        caja(c, u, 14, 44, 18, 12, 2, '#fff3bf', '#e67700', 0.6);
        circ(c, u, 76, 50, 6, '#fa5252');
        brillo(c, u, 30, 34, 20, 2, 0, 0.35);
    }
    function cajaCarton(c, u) {
        poli(c, u, [[6, 30], [24, 14], [50, 26], [32, 40]], '#c9965a', '#8b5a2b', 0.8);
        poli(c, u, [[94, 30], [76, 14], [50, 26], [68, 40]], '#c9965a', '#8b5a2b', 0.8);
        caja(c, u, 6, 30, 88, 64, 3, horiz(c, u, 6, 94, ['#b07a3e', '#deb887', '#c9965a', '#9c6a32']), '#7a4a1f', 1.2);
        caja(c, u, 6, 30, 88, 8, 2, 'rgba(0,0,0,0.12)');
        caja(c, u, 36, 52, 28, 16, 2, 'rgba(255,255,255,0.6)');
        linea(c, u, [[42, 60], [58, 60]], '#e03131', 2);
        linea(c, u, [[50, 55], [50, 65]], '#e03131', 2);
    }

    function engranaje(c, u) {
        // Rueda dentada metálica con agujero al centro.
        c.save();
        c.translate(50 * u, 50 * u);
        c.fillStyle = '#868e96';
        for (var i = 0; i < 12; i++) {
            c.rotate(Math.PI / 6);
            redondo(c, -6 * u, -48 * u, 12 * u, 14 * u, 2 * u);
            c.fill();
        }
        c.restore();
        circ(c, u, 50, 50, 38, rg(c, 40 * u, 40 * u, 4 * u, 50 * u, 50 * u, 38 * u, [[0, '#dee2e6'], [0.6, '#adb5bd'], [1, '#6c757d']]), '#495057', 1.4);
        for (var k = 0; k < 6; k++) {
            var ang = k / 6 * Math.PI * 2;
            circ(c, u, 50 + Math.cos(ang) * 22, 50 + Math.sin(ang) * 22, 6, '#6c757d');
        }
        circ(c, u, 50, 50, 10, '#343a40');
    }

    var PIEZAS = {
        engranaje: engranaje,
        caja_juguetes: cajaJuguetes, maleta: maleta, caja_carton: cajaCarton,
        rueda: function (c, u) { rueda(c, u, false); },
        rueda_rayos: function (c, u) { rueda(c, u, true); },
        rueda_tren: ruedaTren,
        bicicleta: bicicleta,
        telefono_base: telefonoBase, telefono_auricular: telefonoAuricular, movil: movil,
        reloj_cuerpo: relojCuerpo,
        manecilla_h: function (c, u) { manecilla(c, u, 13, 2.4, '#212529'); },
        manecilla_m: function (c, u) { manecilla(c, u, 20, 1.6, '#e03131'); },
        martillo: martillo,
        avion: avion, locomotora: locomotora, vagon: vagon,
        ambulancia: ambulancia,
        baliza_roja: function (c, u) { baliza(c, u, 'roja'); },
        baliza_azul: function (c, u) { baliza(c, u, 'azul'); },
        camion: camion, motocicleta: motocicleta,
        aspiradora: aspiradora, secador: secador,
        licuadora_base: licuadoraBase, licuadora_vaso: licuadoraVaso,
        ventilador_base: ventiladorBase, ventilador_rejilla: ventiladorRejillaFrente, aspas: aspas,
        puerta_marco: puertaMarco, puerta_hoja: puertaHoja,
        ventana_marco: ventanaMarco, ventana_hoja: ventanaHoja,
        comoda: comoda, cajon: cajon, cajon_interior: cajonInterior,
        lavamanos: lavamanos, manija: manija, ducha: ducha, fuente_piedra: fuente,
        lavadora: lavadora, ropa_girando: ropaGirando, regadera: regadera,
        cabeza_nino: function (c, u) { cabeza(c, u, '#5c3317', false); },
        cabeza_nina: function (c, u) { cabeza(c, u, '#8b4513', true); },
        cabeza_nino2: function (c, u) { cabeza(c, u, '#212529', false); },
        cabeza_nina2: function (c, u) { cabeza(c, u, '#f08c00', true); },
        ojos: ojos, pierna: pierna,
        torso_rojo: function (c, u) { torso(c, u, '#fa5252'); }, brazo_rojo: function (c, u) { brazo(c, u, '#fa5252'); },
        torso_verde: function (c, u) { torso(c, u, '#40c057'); }, brazo_verde: function (c, u) { brazo(c, u, '#40c057'); },
        torso_amarillo: function (c, u) { torso(c, u, '#fcc419'); }, brazo_amarillo: function (c, u) { brazo(c, u, '#fcc419'); },
        torso_morado: function (c, u) { torso(c, u, '#9775fa'); }, brazo_morado: function (c, u) { brazo(c, u, '#9775fa'); }, cama: cama, cobija: cobija,
        vaca: vaca, gallo: gallo,
        bocina: bocina, polaroid: polaroid, arbol: arbol, banca: banca, mesa: mesa, lampara: lampara,
        sofa: sofa, cuadro: cuadro, nube_algodon: nube, torre: torre, estacion: estacion, ventana_casa: ventanaCasa,
        maquina: maquina, pedestal: pedestal,
        frasco_verde: function (c, u) { frascoLab(c, u, '#20c997'); },
        frasco_rosa: function (c, u) { frascoLab(c, u, '#f06595'); },
        frasco_azul: function (c, u) { frascoLab(c, u, '#4dabf7'); }
    };

    /* ── Objetos completos (piezas juntas) para la portada ────── */

    /** Dibuja piezas [nombre, cx, cy, ancho, alto?, grados?] en el lienzo de 100 u. */
    function componer(lista) {
        return function (c, u) {
            lista.forEach(function (p) {
                var fn = PIEZAS[p[0]];
                if (!fn) return;
                var w = p[3], h = p[4] || p[3];
                c.save();
                c.translate(p[1] * u, p[2] * u);
                if (p[5]) c.rotate(p[5] * Math.PI / 180);
                c.scale(w / 100, h / 100);
                c.translate(-50 * u, -50 * u);
                fn(c, u);
                c.restore();
            });
        };
    }

    /** Niño armado: brazos colgando, arriba (salta) o hacia el pecho (aplaude). */
    function ninoPiezas(cx, cy, e, ropa, cab, pose) {
        var L = [];
        var x = function (v) { return cx + v * e; };
        var y = function (v) { return cy + v * e; };
        var pi = pose === 'corre' ? -22 : 0;
        L.push(['pierna', x(-7 + pi * 0.25), y(29.8), 30 * e, 30 * e, -pi]);
        L.push(['pierna', x(7 - pi * 0.25), y(29.8), 30 * e, 30 * e, pi]);
        var brazo = function (lado) {
            var ang = pose === 'salta' ? 150 * -lado : pose === 'aplaude' ? 42 * lado : pose === 'corre' ? 30 * lado : 0;
            // Gira desde el hombro (arriba de la pieza): se corre el centro según el ángulo.
            var r = 13.2, a = ang * Math.PI / 180;
            L.push(['brazo_' + ropa, x(15 * lado - Math.sin(a) * r), y(-12 + Math.cos(a) * r), 30 * e, 30 * e, ang]);
        };
        brazo(-1);
        L.push(['torso_' + ropa, x(0), y(0), 36 * e]);
        brazo(1);
        L.push([cab, x(0), y(-26), 40 * e]);
        L.push(['ojos', x(0), y(-26), 40 * e]);
        return L;
    }

    var COMPUESTOS = {
        portada_bicicleta: componer([['rueda_rayos', 24, 66, 40], ['rueda_rayos', 76, 66, 40], ['bicicleta', 50, 50, 100]]),
        portada_telefono: componer([['telefono_base', 50, 52, 100], ['telefono_auricular', 50, 30, 74]]),
        portada_reloj: componer([['reloj_cuerpo', 50, 50, 100], ['manecilla_h', 50, 54, 100, 100, 300], ['manecilla_m', 50, 54, 100, 100, 60]]),
        portada_tren: componer([['rueda_tren', 22, 74, 24], ['rueda_tren', 50, 76, 19], ['rueda_tren', 72, 76, 19], ['locomotora', 50, 50, 100]]),
        portada_ambulancia: componer([['rueda', 24, 72, 22], ['rueda', 80, 72, 22], ['ambulancia', 50, 50, 100], ['baliza_roja', 33, 19, 11], ['baliza_azul', 45, 19, 11]]),
        portada_camion: componer([['rueda', 20, 72, 22], ['rueda', 56, 72, 22], ['rueda', 84, 72, 22], ['camion', 50, 50, 100]]),
        portada_motocicleta: componer([['rueda_rayos', 22, 68, 38], ['rueda_rayos', 78, 68, 38], ['motocicleta', 50, 50, 100]]),
        portada_aspiradora: componer([['rueda', 32, 83, 9], ['rueda', 72, 83, 9], ['aspiradora', 50, 50, 100]]),
        portada_puerta: componer([['puerta_marco', 50, 50, 100], ['puerta_hoja', 50, 50, 100]]),
        portada_ventana: componer([['ventana_marco', 50, 50, 100], ['ventana_hoja', 31, 46, 38, 66], ['ventana_hoja', 69, 46, 38, 66]]),
        portada_cajon: componer([['comoda', 50, 50, 100], ['cajon', 50, 40, 70, 44]]),
        portada_licuadora: componer([['licuadora_vaso', 50, 54, 64], ['licuadora_base', 50, 50, 100]]),
        portada_ventilador: componer([['ventilador_base', 50, 50, 100], ['aspas', 50, 42, 70, 70, 20], ['ventilador_rejilla', 50, 42, 76]]),
        portada_lavadora: componer([['lavadora', 50, 50, 100], ['ropa_girando', 50, 58, 42]]),
        portada_pluma: componer([['lavamanos', 50, 50, 100], ['manija', 50, 32, 22]]),
        portada_durmiendo: componer([['cama', 50, 56, 100], ['cabeza_nino', 26, 46, 30, 30, -70], ['cobija', 56, 41, 84]]),
        portada_aplaudiendo: componer(ninoPiezas(32, 52, 1.08, 'rojo', 'cabeza_nina', 'aplaude').concat(ninoPiezas(68, 52, 1.08, 'verde', 'cabeza_nino', 'aplaude'))),
        portada_corriendo: componer(ninoPiezas(52, 50, 1.4, 'amarillo', 'cabeza_nino2', 'corre')),
        portada_saltando: componer(ninoPiezas(50, 46, 1.4, 'morado', 'cabeza_nina2', 'salta'))
    };
    Object.keys(COMPUESTOS).forEach(function (k) { PIEZAS[k] = COMPUESTOS[k]; });
    A.registrar(PIEZAS);
})(typeof window !== 'undefined' ? window : this);
