/**
 * PedniaArte — ilustraciones de Encuentra la Pareja dibujadas con Canvas 2D (degradados,
 * brillos y sombras) y registradas como texturas de Phaser. Sustituyen a los SVG planos.
 *
 *   PedniaArte.textura(scene, nombre, tam)  → clave de textura ('pa:nombre@tam')
 *   PedniaArte.existe(nombre)
 *
 * Cada dibujo ocupa un lienzo cuadrado de lado S (en unidades u = S/100). Las piezas que se
 * animan por separado van en texturas propias (badajo, baqueta, iris, lengua, sol_rayos…).
 */
(function (global) {
    'use strict';

    function lg(c, x0, y0, x1, y1, stops) {
        var g = c.createLinearGradient(x0, y0, x1, y1);
        stops.forEach(function (s) { g.addColorStop(s[0], s[1]); });
        return g;
    }

    function rg(c, x0, y0, r0, x1, y1, r1, stops) {
        var g = c.createRadialGradient(x0, y0, r0, x1, y1, r1);
        stops.forEach(function (s) { g.addColorStop(s[0], s[1]); });
        return g;
    }

    function elipse(c, x, y, rx, ry, rot) {
        c.beginPath();
        c.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2);
    }

    function redondo(c, x, y, w, h, r) {
        c.beginPath();
        c.moveTo(x + r, y);
        c.arcTo(x + w, y, x + w, y + h, r);
        c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r);
        c.arcTo(x, y, x + w, y, r);
        c.closePath();
    }

    var PIEL = { base: '#f6c9a4', luz: '#ffe4cf', sombra: '#dc9a72', honda: '#b5694a' };

    /* ── Instrumentos ─────────────────────────────────────────── */

    function campana(c, u) {
        // Mango de madera.
        c.fillStyle = lg(c, 43 * u, 0, 57 * u, 0, [[0, '#5a3214'], [0.35, '#c98a4b'], [0.55, '#e3b07a'], [1, '#6b3e1f']]);
        redondo(c, 43 * u, 6 * u, 14 * u, 26 * u, 6 * u);
        c.fill();
        c.fillStyle = rg(c, 47 * u, 4 * u, 1 * u, 50 * u, 7 * u, 9 * u, [[0, '#f0c48f'], [1, '#6b3e1f']]);
        elipse(c, 50 * u, 7 * u, 9 * u, 6 * u);
        c.fill();
        // Cuerpo dorado.
        c.beginPath();
        c.moveTo(39 * u, 34 * u);
        c.bezierCurveTo(35 * u, 48 * u, 30 * u, 62 * u, 25 * u, 73 * u);
        c.quadraticCurveTo(21 * u, 81 * u, 12 * u, 85 * u);
        c.lineTo(88 * u, 85 * u);
        c.quadraticCurveTo(79 * u, 81 * u, 75 * u, 73 * u);
        c.bezierCurveTo(70 * u, 62 * u, 65 * u, 48 * u, 61 * u, 34 * u);
        c.closePath();
        c.fillStyle = lg(c, 12 * u, 0, 88 * u, 0, [[0, '#7a4d00'], [0.16, '#d4960a'], [0.32, '#ffe28a'], [0.42, '#fff7d6'],
            [0.55, '#f6c23a'], [0.78, '#b07806'], [1, '#5e3b00']]);
        c.fill();
        // Sombra vertical (redondez).
        c.save();
        c.clip();
        c.fillStyle = lg(c, 0, 30 * u, 0, 86 * u, [[0, 'rgba(255,255,255,0.18)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(70,40,0,0.35)']]);
        c.fillRect(0, 0, 100 * u, 100 * u);
        // Destello.
        c.strokeStyle = 'rgba(255,255,255,0.75)';
        c.lineWidth = 3 * u;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(42 * u, 40 * u);
        c.bezierCurveTo(39 * u, 52 * u, 35 * u, 64 * u, 31 * u, 74 * u);
        c.stroke();
        c.restore();
        // Bandas grabadas.
        c.strokeStyle = 'rgba(110,70,0,0.55)';
        c.lineWidth = 1.6 * u;
        c.beginPath();
        c.ellipse(50 * u, 64 * u, 19 * u, 3 * u, 0, 0, Math.PI);
        c.stroke();
        c.beginPath();
        c.ellipse(50 * u, 69 * u, 22 * u, 3.4 * u, 0, 0, Math.PI);
        c.stroke();
        // Collar.
        c.fillStyle = lg(c, 37 * u, 0, 63 * u, 0, [[0, '#8a5a00'], [0.4, '#ffe9a8'], [1, '#8a5a00']]);
        redondo(c, 37 * u, 30 * u, 26 * u, 6 * u, 3 * u);
        c.fill();
        // Labio y boca.
        c.fillStyle = lg(c, 12 * u, 0, 88 * u, 0, [[0, '#6b4300'], [0.35, '#ffe08a'], [0.6, '#d9a01c'], [1, '#5e3b00']]);
        elipse(c, 50 * u, 85 * u, 38.5 * u, 7 * u);
        c.fill();
        c.fillStyle = rg(c, 50 * u, 83 * u, 2 * u, 50 * u, 86 * u, 34 * u, [[0, '#2a1a00'], [1, '#6b4a10']]);
        elipse(c, 50 * u, 85.5 * u, 33 * u, 4.6 * u);
        c.fill();
    }

    function badajo(c, u) {
        c.fillStyle = lg(c, 47 * u, 0, 53 * u, 0, [[0, '#495057'], [0.5, '#ced4da'], [1, '#343a40']]);
        c.fillRect(48 * u, 0, 4 * u, 70 * u);
        c.fillStyle = rg(c, 46 * u, 74 * u, 1 * u, 50 * u, 78 * u, 13 * u, [[0, '#dee2e6'], [0.45, '#868e96'], [1, '#212529']]);
        elipse(c, 50 * u, 80 * u, 12 * u, 12 * u);
        c.fill();
    }

    function tambor(c, u) {
        // Lateral.
        c.beginPath();
        c.moveTo(12 * u, 40 * u);
        c.lineTo(12 * u, 80 * u);
        c.ellipse(50 * u, 80 * u, 38 * u, 11 * u, 0, Math.PI, 0, true);
        c.lineTo(88 * u, 40 * u);
        c.closePath();
        c.fillStyle = lg(c, 12 * u, 0, 88 * u, 0, [[0, '#5c0a0a'], [0.18, '#c92a2a'], [0.36, '#ff8787'], [0.5, '#f03e3e'], [0.8, '#a51d1d'], [1, '#4a0808']]);
        c.fill();
        // Cuerdas en zigzag.
        c.save();
        c.clip();
        c.strokeStyle = '#fff3bf';
        c.lineWidth = 1.8 * u;
        c.beginPath();
        for (var i = 0; i <= 8; i++) {
            var x = 12 * u + i * 9.5 * u;
            var yA = 47 * u + Math.sin((x / u - 50) / 38 * Math.PI / 2 + Math.PI / 2) * 6 * u;
            var yB = 78 * u + Math.sin((x / u - 50) / 38 * Math.PI / 2 + Math.PI / 2) * 9 * u;
            if (i === 0) c.moveTo(x, i % 2 ? yB : yA);
            else c.lineTo(x, i % 2 ? yB : yA);
        }
        c.stroke();
        c.fillStyle = lg(c, 0, 40 * u, 0, 92 * u, [[0, 'rgba(0,0,0,0.25)'], [0.3, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.3)']]);
        c.fillRect(0, 0, 100 * u, 100 * u);
        c.restore();
        // Aro inferior.
        c.strokeStyle = lg(c, 12 * u, 0, 88 * u, 0, [[0, '#7a4d00'], [0.4, '#ffd43b'], [1, '#7a4d00']]);
        c.lineWidth = 4 * u;
        c.beginPath();
        c.ellipse(50 * u, 80 * u, 38 * u, 11 * u, 0, 0, Math.PI);
        c.stroke();
        // Parche.
        c.fillStyle = rg(c, 44 * u, 36 * u, 2 * u, 50 * u, 40 * u, 38 * u, [[0, '#fffdf5'], [0.7, '#f1e6c8'], [1, '#d8c59a']]);
        elipse(c, 50 * u, 40 * u, 37 * u, 11 * u);
        c.fill();
        c.strokeStyle = lg(c, 12 * u, 0, 88 * u, 0, [[0, '#7a4d00'], [0.4, '#ffe066'], [0.6, '#fab005'], [1, '#7a4d00']]);
        c.lineWidth = 4 * u;
        elipse(c, 50 * u, 40 * u, 38 * u, 11.5 * u);
        c.stroke();
    }

    function baqueta(c, u) {
        c.fillStyle = lg(c, 46 * u, 0, 54 * u, 0, [[0, '#8a5a2b'], [0.5, '#f1c27d'], [1, '#7a4a20']]);
        c.beginPath();
        c.moveTo(47.5 * u, 14 * u);
        c.lineTo(52.5 * u, 14 * u);
        c.lineTo(53.5 * u, 98 * u);
        c.lineTo(46.5 * u, 98 * u);
        c.closePath();
        c.fill();
        c.fillStyle = rg(c, 47 * u, 8 * u, 1 * u, 50 * u, 10 * u, 9 * u, [[0, '#fff'], [0.4, '#ffe8cc'], [1, '#e8a85c']]);
        elipse(c, 50 * u, 10 * u, 8 * u, 8 * u);
        c.fill();
    }

    function maraca(c, u) {
        c.fillStyle = lg(c, 45 * u, 0, 55 * u, 0, [[0, '#6b3e1f'], [0.45, '#d9a066'], [1, '#5a3214']]);
        c.beginPath();
        c.moveTo(46 * u, 54 * u);
        c.lineTo(54 * u, 54 * u);
        c.lineTo(53 * u, 96 * u);
        c.quadraticCurveTo(50 * u, 99 * u, 47 * u, 96 * u);
        c.closePath();
        c.fill();
        elipse(c, 50 * u, 32 * u, 24 * u, 27 * u);
        c.fillStyle = rg(c, 42 * u, 22 * u, 2 * u, 50 * u, 32 * u, 30 * u, [[0, '#fff3bf'], [0.35, '#ffd43b'], [0.8, '#f59f00'], [1, '#c76b00']]);
        c.fill();
        c.save();
        elipse(c, 50 * u, 32 * u, 24 * u, 27 * u);
        c.clip();
        // Bandas de colores en zigzag.
        [['#e03131', 24], ['#2f9e44', 36], ['#1971c2', 46]].forEach(function (b) {
            c.strokeStyle = b[0];
            c.lineWidth = 4 * u;
            c.beginPath();
            for (var i = 0; i <= 10; i++) {
                var x = 24 * u + i * 5.2 * u;
                var y = b[1] * u + (i % 2 ? -3 : 3) * u;
                if (i === 0) c.moveTo(x, y);
                else c.lineTo(x, y);
            }
            c.stroke();
        });
        c.fillStyle = rg(c, 40 * u, 20 * u, 1 * u, 50 * u, 34 * u, 30 * u, [[0, 'rgba(255,255,255,0.55)'], [0.4, 'rgba(255,255,255,0)'], [1, 'rgba(90,40,0,0.35)']]);
        c.fillRect(0, 0, 100 * u, 100 * u);
        c.restore();
    }

    function pandereta(c, u) {
        // Parche.
        c.fillStyle = rg(c, 44 * u, 42 * u, 2 * u, 50 * u, 50 * u, 36 * u, [[0, '#fffdf5'], [1, '#e6d5ad']]);
        elipse(c, 50 * u, 50 * u, 35 * u, 35 * u);
        c.fill();
        // Aro de madera.
        c.lineWidth = 9 * u;
        c.strokeStyle = lg(c, 10 * u, 10 * u, 90 * u, 90 * u, [[0, '#f0b46a'], [0.5, '#a0612b'], [1, '#5a3214']]);
        elipse(c, 50 * u, 50 * u, 39 * u, 39 * u);
        c.stroke();
        // Sonajas.
        for (var i = 0; i < 6; i++) {
            var a = i / 6 * Math.PI * 2 + 0.3;
            var x = 50 * u + Math.cos(a) * 39 * u;
            var y = 50 * u + Math.sin(a) * 39 * u;
            c.fillStyle = '#3b2412';
            redondo(c, x - 6 * u, y - 4 * u, 12 * u, 8 * u, 2 * u);
            c.fill();
            c.fillStyle = rg(c, x - 2 * u, y - 2 * u, 0.5 * u, x, y, 6 * u, [[0, '#ffffff'], [0.5, '#adb5bd'], [1, '#495057']]);
            elipse(c, x, y, 5.5 * u, 5.5 * u);
            c.fill();
        }
        // Cintas.
        c.fillStyle = '#e64980';
        c.beginPath();
        c.moveTo(50 * u, 88 * u);
        c.quadraticCurveTo(44 * u, 95 * u, 40 * u, 99 * u);
        c.lineTo(46 * u, 99 * u);
        c.quadraticCurveTo(50 * u, 94 * u, 52 * u, 88 * u);
        c.fill();
        c.fillStyle = '#4dabf7';
        c.beginPath();
        c.moveTo(51 * u, 88 * u);
        c.quadraticCurveTo(58 * u, 94 * u, 62 * u, 99 * u);
        c.lineTo(56 * u, 99 * u);
        c.quadraticCurveTo(52 * u, 94 * u, 49 * u, 88 * u);
        c.fill();
    }

    /* ── Naturaleza y comida ──────────────────────────────────── */

    var PETALOS = {
        rosa: ['#c2255c', '#f06595', '#fcc2d7', '#fff0f6'],
        amarilla: ['#e67700', '#fcc419', '#ffec99', '#fff9db'],
        azul: ['#1864ab', '#4dabf7', '#a5d8ff', '#e7f5ff'],
        morada: ['#862e9c', '#cc5de8', '#eebefa', '#f8f0fc'],
        blanca: ['#adb5bd', '#f1f3f5', '#ffffff', '#ffffff'],
        roja: ['#a51111', '#f03e3e', '#ffa8a8', '#fff5f5']
    };

    function flor(c, u, color) {
        var pc = PETALOS[color] || PETALOS.rosa;
        // Tallo y hojas.
        c.strokeStyle = lg(c, 46 * u, 0, 54 * u, 0, [[0, '#2b8a3e'], [0.5, '#69db7c'], [1, '#2b8a3e']]);
        c.lineWidth = 5 * u;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(50 * u, 98 * u);
        c.bezierCurveTo(47 * u, 82 * u, 54 * u, 66 * u, 50 * u, 46 * u);
        c.stroke();
        [[1, 76, -0.5], [-1, 66, 0.5]].forEach(function (h) {
            c.save();
            c.translate(50 * u, h[1] * u);
            c.rotate(h[2]);
            c.scale(h[0], 1);
            c.beginPath();
            c.moveTo(0, 0);
            c.bezierCurveTo(8 * u, -12 * u, 24 * u, -10 * u, 28 * u, -2 * u);
            c.bezierCurveTo(20 * u, 6 * u, 8 * u, 6 * u, 0, 0);
            c.fillStyle = lg(c, 0, -8 * u, 0, 6 * u, [[0, '#8ce99a'], [1, '#2b8a3e']]);
            c.fill();
            c.strokeStyle = 'rgba(20,90,40,0.6)';
            c.lineWidth = 1 * u;
            c.beginPath();
            c.moveTo(2 * u, 0);
            c.quadraticCurveTo(14 * u, -4 * u, 26 * u, -2 * u);
            c.stroke();
            c.restore();
        });
        // Pétalos.
        var cx = 50 * u;
        var cy = 32 * u;
        for (var i = 0; i < 7; i++) {
            c.save();
            c.translate(cx, cy);
            c.rotate(i / 7 * Math.PI * 2);
            c.beginPath();
            c.moveTo(0, 0);
            c.bezierCurveTo(-11 * u, -6 * u, -12 * u, -24 * u, 0, -29 * u);
            c.bezierCurveTo(12 * u, -24 * u, 11 * u, -6 * u, 0, 0);
            c.fillStyle = lg(c, 0, 0, 0, -29 * u, [[0, pc[0]], [0.35, pc[1]], [0.8, pc[2]], [1, pc[3]]]);
            c.fill();
            c.strokeStyle = 'rgba(166,30,77,0.35)';
            c.lineWidth = 0.8 * u;
            c.beginPath();
            c.moveTo(0, -4 * u);
            c.lineTo(0, -24 * u);
            c.stroke();
            c.restore();
        }
        // Centro con semillas.
        c.fillStyle = rg(c, cx - 3 * u, cy - 3 * u, 1 * u, cx, cy, 10 * u, [[0, '#fff3bf'], [0.5, '#fcc419'], [1, '#d9480f']]);
        elipse(c, cx, cy, 10 * u, 10 * u);
        c.fill();
        c.fillStyle = 'rgba(120,50,0,0.6)';
        for (var k = 0; k < 14; k++) {
            var a = k * 2.4;
            var r = Math.sqrt(k / 14) * 7 * u;
            elipse(c, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.9 * u, 0.9 * u);
            c.fill();
        }
    }

    function helado(c, u) {
        // Cono de galleta.
        c.beginPath();
        c.moveTo(28 * u, 52 * u);
        c.lineTo(72 * u, 52 * u);
        c.lineTo(51 * u, 98 * u);
        c.quadraticCurveTo(50 * u, 99.5 * u, 49 * u, 98 * u);
        c.closePath();
        c.fillStyle = lg(c, 28 * u, 0, 72 * u, 0, [[0, '#b86b1e'], [0.4, '#f0b25a'], [0.6, '#e09a3e'], [1, '#9c5a17']]);
        c.fill();
        c.save();
        c.clip();
        c.strokeStyle = 'rgba(120,60,10,0.55)';
        c.lineWidth = 1.4 * u;
        for (var i = -6; i < 8; i++) {
            c.beginPath();
            c.moveTo((20 + i * 8) * u, 50 * u);
            c.lineTo((50 + i * 8) * u, 100 * u);
            c.stroke();
            c.beginPath();
            c.moveTo((80 - i * 8) * u, 50 * u);
            c.lineTo((50 - i * 8) * u, 100 * u);
            c.stroke();
        }
        c.restore();
        // Bola de fresa con borde que chorrea.
        c.beginPath();
        c.arc(50 * u, 44 * u, 23 * u, Math.PI * 0.95, Math.PI * 0.05);
        var bordes = [[73, 52], [68, 58], [64, 54], [58, 62], [53, 55], [46, 59], [40, 54], [34, 60], [29, 53], [27, 50]];
        bordes.forEach(function (p) { c.lineTo(p[0] * u, p[1] * u); });
        c.closePath();
        c.fillStyle = rg(c, 42 * u, 34 * u, 2 * u, 50 * u, 44 * u, 26 * u, [[0, '#fff0f6'], [0.35, '#faa2c1'], [0.85, '#e64980'], [1, '#a61e4d']]);
        c.fill();
        // Bola de vainilla.
        c.fillStyle = rg(c, 44 * u, 16 * u, 2 * u, 50 * u, 24 * u, 20 * u, [[0, '#ffffff'], [0.4, '#fff4d6'], [0.9, '#f2d38f'], [1, '#c99a45']]);
        elipse(c, 50 * u, 25 * u, 18 * u, 16 * u);
        c.fill();
        // Chispas de colores.
        var chispas = [['#e03131', 42, 18, 0.6], ['#1c7ed6', 55, 16, -0.4], ['#37b24d', 48, 28, 1.2], ['#f59f00', 58, 27, 0.2],
            ['#ae3ec9', 40, 30, -1], ['#1c7ed6', 38, 42, 0.8], ['#fcc419', 56, 40, -0.6], ['#37b24d', 64, 45, 0.3], ['#e03131', 47, 47, 1.4]];
        chispas.forEach(function (s) {
            c.save();
            c.translate(s[1] * u, s[2] * u);
            c.rotate(s[3]);
            c.fillStyle = s[0];
            redondo(c, -2.5 * u, -0.8 * u, 5 * u, 1.6 * u, 0.8 * u);
            c.fill();
            c.restore();
        });
        // Cereza.
        c.strokeStyle = '#2b8a3e';
        c.lineWidth = 1.2 * u;
        c.beginPath();
        c.moveTo(51 * u, 8 * u);
        c.quadraticCurveTo(55 * u, 2 * u, 60 * u, 1.5 * u);
        c.stroke();
        c.fillStyle = rg(c, 48 * u, 7 * u, 0.5 * u, 50 * u, 10 * u, 6 * u, [[0, '#ffc9c9'], [0.4, '#f03e3e'], [1, '#8b0000']]);
        elipse(c, 50 * u, 10.5 * u, 5.5 * u, 5.2 * u);
        c.fill();
    }

    function gota(c, u) {
        c.beginPath();
        c.moveTo(50 * u, 10 * u);
        c.bezierCurveTo(56 * u, 40 * u, 80 * u, 60 * u, 50 * u, 90 * u);
        c.bezierCurveTo(20 * u, 60 * u, 44 * u, 40 * u, 50 * u, 10 * u);
        c.fillStyle = rg(c, 44 * u, 60 * u, 2 * u, 50 * u, 66 * u, 24 * u, [[0, '#fff0f6'], [1, '#e64980']]);
        c.fill();
    }

    function solRayos(c, u) {
        for (var i = 0; i < 16; i++) {
            var a = i / 16 * Math.PI * 2;
            var largo = i % 2 ? 40 : 48;
            c.save();
            c.translate(50 * u, 50 * u);
            c.rotate(a);
            c.beginPath();
            c.moveTo(-5.5 * u, -26 * u);
            c.quadraticCurveTo(0, -(largo + 4) * u, 5.5 * u, -26 * u);
            c.closePath();
            c.fillStyle = lg(c, 0, -26 * u, 0, -largo * u, [[0, '#fd7e14'], [1, '#ffd43b']]);
            c.fill();
            c.restore();
        }
    }

    function sol(c, u) {
        c.fillStyle = rg(c, 50 * u, 50 * u, 20 * u, 50 * u, 50 * u, 34 * u, [[0, 'rgba(255,236,153,0.9)'], [1, 'rgba(255,236,153,0)']]);
        elipse(c, 50 * u, 50 * u, 34 * u, 34 * u);
        c.fill();
        c.fillStyle = rg(c, 42 * u, 40 * u, 2 * u, 50 * u, 50 * u, 28 * u, [[0, '#fffbe6'], [0.35, '#ffe066'], [0.85, '#fcc419'], [1, '#f08c00']]);
        elipse(c, 50 * u, 50 * u, 27 * u, 27 * u);
        c.fill();
        // Mejillas.
        c.fillStyle = 'rgba(255,120,120,0.45)';
        elipse(c, 35 * u, 57 * u, 5 * u, 3.5 * u);
        c.fill();
        elipse(c, 65 * u, 57 * u, 5 * u, 3.5 * u);
        c.fill();
        // Ojo abierto y ojo guiñado.
        c.fillStyle = '#5c3a00';
        elipse(c, 40 * u, 46 * u, 3 * u, 4 * u);
        c.fill();
        c.fillStyle = '#fff';
        elipse(c, 39 * u, 44.5 * u, 1.1 * u, 1.1 * u);
        c.fill();
        c.strokeStyle = '#5c3a00';
        c.lineWidth = 2.2 * u;
        c.lineCap = 'round';
        c.beginPath();
        c.arc(60 * u, 48 * u, 4 * u, Math.PI * 1.1, Math.PI * 1.9);
        c.stroke();
        // Sonrisa.
        c.beginPath();
        c.arc(50 * u, 54 * u, 9 * u, 0.15 * Math.PI, 0.85 * Math.PI);
        c.stroke();
    }

    /* ── Órganos de los sentidos ──────────────────────────────── */

    function oreja(c, u) {
        // Silueta exterior (oreja derecha vista de lado).
        c.beginPath();
        c.moveTo(40 * u, 22 * u);
        c.bezierCurveTo(44 * u, 4 * u, 74 * u, 2 * u, 82 * u, 22 * u);
        c.bezierCurveTo(90 * u, 40 * u, 82 * u, 56 * u, 72 * u, 66 * u);
        c.bezierCurveTo(64 * u, 74 * u, 64 * u, 84 * u, 58 * u, 92 * u);
        c.bezierCurveTo(52 * u, 99 * u, 40 * u, 97 * u, 38 * u, 86 * u);
        c.bezierCurveTo(36 * u, 74 * u, 34 * u, 40 * u, 40 * u, 22 * u);
        c.closePath();
        c.fillStyle = rg(c, 62 * u, 38 * u, 4 * u, 58 * u, 50 * u, 52 * u, [[0, PIEL.luz], [0.45, PIEL.base], [0.85, PIEL.sombra], [1, PIEL.honda]]);
        c.fill();
        c.save();
        c.clip();
        // Pliegue del hélix (borde enrollado).
        c.strokeStyle = 'rgba(181,105,74,0.55)';
        c.lineWidth = 3.2 * u;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(46 * u, 26 * u);
        c.bezierCurveTo(50 * u, 14 * u, 70 * u, 12 * u, 75 * u, 26 * u);
        c.bezierCurveTo(80 * u, 40 * u, 74 * u, 52 * u, 66 * u, 60 * u);
        c.stroke();
        c.strokeStyle = 'rgba(255,236,220,0.8)';
        c.lineWidth = 1.6 * u;
        c.beginPath();
        c.moveTo(44 * u, 20 * u);
        c.bezierCurveTo(50 * u, 8 * u, 72 * u, 7 * u, 79 * u, 22 * u);
        c.stroke();
        // Concha (hueco).
        c.fillStyle = rg(c, 52 * u, 56 * u, 2 * u, 54 * u, 52 * u, 20 * u, [[0, '#8f4a32'], [0.5, '#c97d58'], [1, 'rgba(220,154,114,0)']]);
        c.beginPath();
        c.moveTo(48 * u, 36 * u);
        c.bezierCurveTo(62 * u, 30 * u, 70 * u, 44 * u, 64 * u, 56 * u);
        c.bezierCurveTo(60 * u, 66 * u, 50 * u, 72 * u, 46 * u, 66 * u);
        c.bezierCurveTo(42 * u, 58 * u, 42 * u, 42 * u, 48 * u, 36 * u);
        c.fill();
        // Antihélix.
        c.strokeStyle = 'rgba(255,226,204,0.85)';
        c.lineWidth = 2.6 * u;
        c.beginPath();
        c.moveTo(54 * u, 28 * u);
        c.bezierCurveTo(66 * u, 34 * u, 68 * u, 48 * u, 62 * u, 62 * u);
        c.stroke();
        // Conducto.
        c.fillStyle = rg(c, 47 * u, 58 * u, 0.5 * u, 47 * u, 58 * u, 6 * u, [[0, '#4a1f12'], [1, 'rgba(120,50,30,0)']]);
        elipse(c, 47 * u, 58 * u, 6 * u, 7 * u);
        c.fill();
        // Trago.
        c.fillStyle = rg(c, 41 * u, 60 * u, 0.5 * u, 42 * u, 61 * u, 5 * u, [[0, PIEL.luz], [1, 'rgba(246,201,164,0)']]);
        elipse(c, 41.5 * u, 61 * u, 4 * u, 5 * u);
        c.fill();
        // Lóbulo con rubor.
        c.fillStyle = 'rgba(255,140,140,0.25)';
        elipse(c, 50 * u, 86 * u, 9 * u, 7 * u);
        c.fill();
        c.restore();
    }

    function nariz(c, u) {
        // Puente.
        c.fillStyle = lg(c, 34 * u, 0, 66 * u, 0, [[0, PIEL.sombra], [0.35, PIEL.base], [0.5, PIEL.luz], [0.65, PIEL.base], [1, PIEL.sombra]]);
        c.beginPath();
        c.moveTo(42 * u, 6 * u);
        c.bezierCurveTo(40 * u, 30 * u, 34 * u, 50 * u, 30 * u, 64 * u);
        c.lineTo(70 * u, 64 * u);
        c.bezierCurveTo(66 * u, 50 * u, 60 * u, 30 * u, 58 * u, 6 * u);
        c.closePath();
        c.fill();
        // Aletas.
        [[-1, 27], [1, 73]].forEach(function (a) {
            c.fillStyle = rg(c, (a[1] - a[0] * 3) * u, 70 * u, 1 * u, a[1] * u, 74 * u, 14 * u, [[0, PIEL.luz], [0.6, PIEL.base], [1, PIEL.sombra]]);
            elipse(c, a[1] * u, 74 * u, 13 * u, 12 * u);
            c.fill();
        });
        // Punta.
        c.fillStyle = rg(c, 46 * u, 62 * u, 2 * u, 50 * u, 70 * u, 18 * u, [[0, '#fff1e6'], [0.4, PIEL.luz], [0.85, PIEL.base], [1, PIEL.sombra]]);
        elipse(c, 50 * u, 70 * u, 17 * u, 15 * u);
        c.fill();
        // Columela y fosas.
        c.fillStyle = 'rgba(181,105,74,0.45)';
        elipse(c, 50 * u, 84 * u, 9 * u, 4 * u);
        c.fill();
        [[39, -0.35], [61, 0.35]].forEach(function (f) {
            c.fillStyle = rg(c, f[0] * u, 84 * u, 0.5 * u, f[0] * u, 84 * u, 6 * u, [[0, '#3d1a0e'], [0.7, '#7a3a24'], [1, 'rgba(122,58,36,0)']]);
            elipse(c, f[0] * u, 84 * u, 6.5 * u, 3.6 * u, f[1]);
            c.fill();
        });
        // Rubor de la punta.
        c.fillStyle = 'rgba(255,130,130,0.22)';
        elipse(c, 50 * u, 70 * u, 12 * u, 9 * u);
        c.fill();
    }

    function boca(c, u) {
        // Interior.
        c.beginPath();
        c.moveTo(12 * u, 40 * u);
        c.bezierCurveTo(30 * u, 46 * u, 70 * u, 46 * u, 88 * u, 40 * u);
        c.bezierCurveTo(80 * u, 76 * u, 20 * u, 76 * u, 12 * u, 40 * u);
        c.fillStyle = rg(c, 50 * u, 60 * u, 2 * u, 50 * u, 56 * u, 30 * u, [[0, '#3b0a0a'], [1, '#7a1b1b']]);
        c.fill();
        // Dientes de arriba.
        c.save();
        c.clip();
        c.fillStyle = lg(c, 0, 42 * u, 0, 52 * u, [[0, '#ffffff'], [1, '#e9ecef']]);
        c.beginPath();
        c.moveTo(16 * u, 40 * u);
        c.bezierCurveTo(30 * u, 46 * u, 70 * u, 46 * u, 84 * u, 40 * u);
        c.lineTo(80 * u, 51 * u);
        c.bezierCurveTo(64 * u, 54 * u, 36 * u, 54 * u, 20 * u, 51 * u);
        c.closePath();
        c.fill();
        c.strokeStyle = 'rgba(173,181,189,0.7)';
        c.lineWidth = 0.8 * u;
        [38, 50, 62].forEach(function (x) {
            c.beginPath();
            c.moveTo(x * u, 45 * u);
            c.lineTo(x * u, 53 * u);
            c.stroke();
        });
        c.restore();
        // Labio superior (arco de Cupido).
        c.beginPath();
        c.moveTo(8 * u, 40 * u);
        c.bezierCurveTo(20 * u, 30 * u, 36 * u, 24 * u, 44 * u, 28 * u);
        c.quadraticCurveTo(50 * u, 31 * u, 56 * u, 28 * u);
        c.bezierCurveTo(64 * u, 24 * u, 80 * u, 30 * u, 92 * u, 40 * u);
        c.bezierCurveTo(70 * u, 47 * u, 30 * u, 47 * u, 8 * u, 40 * u);
        c.fillStyle = lg(c, 0, 24 * u, 0, 46 * u, [[0, '#e8596d'], [0.6, '#c2304a'], [1, '#9c1f36']]);
        c.fill();
        // Labio inferior.
        c.beginPath();
        c.moveTo(8 * u, 40 * u);
        c.bezierCurveTo(22 * u, 78 * u, 78 * u, 78 * u, 92 * u, 40 * u);
        c.bezierCurveTo(80 * u, 70 * u, 20 * u, 70 * u, 8 * u, 40 * u);
        c.fillStyle = lg(c, 0, 62 * u, 0, 80 * u, [[0, '#d6405a'], [0.5, '#f0687d'], [1, '#b3263f']]);
        c.fill();
        c.fillStyle = 'rgba(255,255,255,0.45)';
        elipse(c, 42 * u, 72 * u, 9 * u, 1.8 * u, -0.05);
        c.fill();
    }

    function lengua(c, u) {
        c.beginPath();
        c.moveTo(24 * u, 6 * u);
        c.lineTo(76 * u, 6 * u);
        c.bezierCurveTo(80 * u, 40 * u, 74 * u, 82 * u, 50 * u, 92 * u);
        c.bezierCurveTo(26 * u, 82 * u, 20 * u, 40 * u, 24 * u, 6 * u);
        c.fillStyle = rg(c, 44 * u, 50 * u, 2 * u, 50 * u, 46 * u, 48 * u, [[0, '#ffc9d6'], [0.5, '#f783ac'], [0.9, '#d6336c'], [1, '#a61e4d']]);
        c.fill();
        c.strokeStyle = 'rgba(166,30,77,0.5)';
        c.lineWidth = 2 * u;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(50 * u, 12 * u);
        c.quadraticCurveTo(51 * u, 46 * u, 50 * u, 72 * u);
        c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.4)';
        elipse(c, 38 * u, 40 * u, 4 * u, 12 * u, 0.15);
        c.fill();
    }

    function ojoBlanco(c, u) {
        // Piel alrededor (párpado) y esclerótica en forma de almendra.
        c.fillStyle = rg(c, 50 * u, 50 * u, 20 * u, 50 * u, 50 * u, 50 * u, [[0, PIEL.base], [0.8, PIEL.base], [1, 'rgba(246,201,164,0)']]);
        elipse(c, 50 * u, 50 * u, 49 * u, 40 * u);
        c.fill();
        c.fillStyle = 'rgba(181,105,74,0.35)';
        c.beginPath();
        c.moveTo(6 * u, 50 * u);
        c.bezierCurveTo(26 * u, 12 * u, 74 * u, 12 * u, 94 * u, 50 * u);
        c.bezierCurveTo(74 * u, 16 * u, 26 * u, 16 * u, 6 * u, 50 * u);
        c.fill();
        c.beginPath();
        c.moveTo(8 * u, 50 * u);
        c.bezierCurveTo(28 * u, 20 * u, 72 * u, 20 * u, 92 * u, 50 * u);
        c.bezierCurveTo(72 * u, 78 * u, 28 * u, 78 * u, 8 * u, 50 * u);
        c.fillStyle = rg(c, 50 * u, 46 * u, 4 * u, 50 * u, 50 * u, 44 * u, [[0, '#ffffff'], [0.7, '#f1f3f5'], [1, '#e7c6c0']]);
        c.fill();
        c.fillStyle = 'rgba(232,89,109,0.35)';
        elipse(c, 12 * u, 50 * u, 4 * u, 3 * u);
        c.fill();
    }

    function iris(c, u) {
        c.fillStyle = rg(c, 50 * u, 50 * u, 6 * u, 50 * u, 50 * u, 48 * u, [[0, '#a5d8ff'], [0.35, '#4dabf7'], [0.75, '#1971c2'], [0.95, '#0b2e66'], [1, '#081d40']]);
        elipse(c, 50 * u, 50 * u, 48 * u, 48 * u);
        c.fill();
        c.strokeStyle = 'rgba(8,40,90,0.35)';
        c.lineWidth = 1.2 * u;
        for (var i = 0; i < 36; i++) {
            var a = i / 36 * Math.PI * 2;
            c.beginPath();
            c.moveTo(50 * u + Math.cos(a) * 20 * u, 50 * u + Math.sin(a) * 20 * u);
            c.lineTo(50 * u + Math.cos(a + 0.05) * 44 * u, 50 * u + Math.sin(a + 0.05) * 44 * u);
            c.stroke();
        }
        c.fillStyle = rg(c, 50 * u, 50 * u, 10 * u, 50 * u, 50 * u, 24 * u, [[0, '#2f1300'], [1, 'rgba(160,110,40,0)']]);
        elipse(c, 50 * u, 50 * u, 24 * u, 24 * u);
        c.fill();
        c.fillStyle = '#05070a';
        elipse(c, 50 * u, 50 * u, 18 * u, 18 * u);
        c.fill();
        c.fillStyle = 'rgba(255,255,255,0.95)';
        elipse(c, 38 * u, 36 * u, 9 * u, 8 * u);
        c.fill();
        c.fillStyle = 'rgba(255,255,255,0.6)';
        elipse(c, 62 * u, 64 * u, 4 * u, 4 * u);
        c.fill();
    }

    function mano(c, u) {
        var piel = rg(c, 46 * u, 62 * u, 4 * u, 50 * u, 60 * u, 50 * u, [[0, PIEL.luz], [0.55, PIEL.base], [1, PIEL.sombra]]);
        // Dedos (meñique → índice).
        [[25, 36, 28, -0.16], [36, 24, 34, -0.05], [47, 20, 36, 0.05], [58, 27, 32, 0.15]].forEach(function (d) {
            c.save();
            c.translate(d[0] * u + 5 * u, 58 * u);
            c.rotate(d[3]);
            c.fillStyle = piel;
            redondo(c, -6 * u, -(58 - d[1]) * u, 12 * u, (58 - d[1]) * u + 14 * u, 6 * u);
            c.fill();
            c.strokeStyle = 'rgba(181,105,74,0.45)';
            c.lineWidth = 0.9 * u;
            [0.35, 0.62].forEach(function (k) {
                var y = -(58 - d[1]) * u * (1 - k);
                c.beginPath();
                c.moveTo(-3.5 * u, y);
                c.lineTo(3.5 * u, y);
                c.stroke();
            });
            c.fillStyle = 'rgba(255,236,226,0.85)';
            redondo(c, -3.5 * u, -(58 - d[1]) * u + 1.5 * u, 7 * u, 7 * u, 3.5 * u);
            c.fill();
            c.restore();
        });
        // Pulgar.
        c.save();
        c.translate(74 * u, 66 * u);
        c.rotate(0.85);
        c.fillStyle = piel;
        redondo(c, -6 * u, -26 * u, 12 * u, 30 * u, 6 * u);
        c.fill();
        c.fillStyle = 'rgba(255,236,226,0.85)';
        redondo(c, -4 * u, -24 * u, 8 * u, 8 * u, 4 * u);
        c.fill();
        c.restore();
        // Palma y muñeca.
        c.fillStyle = piel;
        redondo(c, 25 * u, 50 * u, 50 * u, 38 * u, 16 * u);
        c.fill();
        c.fillRect(34 * u, 80 * u, 32 * u, 20 * u);
        c.strokeStyle = 'rgba(181,105,74,0.4)';
        c.lineWidth = 1.2 * u;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(30 * u, 62 * u);
        c.quadraticCurveTo(48 * u, 58 * u, 66 * u, 64 * u);
        c.moveTo(36 * u, 70 * u);
        c.quadraticCurveTo(50 * u, 66 * u, 60 * u, 72 * u);
        c.moveTo(62 * u, 60 * u);
        c.quadraticCurveTo(56 * u, 74 * u, 58 * u, 86 * u);
        c.stroke();
    }

    /* ── Utilidades del escenario ─────────────────────────────── */

    function burbuja(c, u) {
        c.fillStyle = rg(c, 50 * u, 50 * u, 30 * u, 50 * u, 50 * u, 49 * u, [[0, 'rgba(255,255,255,0.10)'], [0.8, 'rgba(208,235,255,0.35)'], [0.96, 'rgba(165,216,255,0.85)'], [1, 'rgba(165,216,255,0)']]);
        elipse(c, 50 * u, 50 * u, 49 * u, 49 * u);
        c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.85)';
        c.lineWidth = 3 * u;
        c.lineCap = 'round';
        c.beginPath();
        c.arc(50 * u, 50 * u, 40 * u, Math.PI * 1.1, Math.PI * 1.45);
        c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.9)';
        elipse(c, 30 * u, 26 * u, 4 * u, 3 * u, -0.6);
        c.fill();
        c.strokeStyle = 'rgba(204,93,232,0.35)';
        c.lineWidth = 1.5 * u;
        c.beginPath();
        c.arc(50 * u, 50 * u, 46 * u, Math.PI * 0.1, Math.PI * 0.5);
        c.stroke();
    }

    function nota(c, u) {
        c.fillStyle = '#212529';
        elipse(c, 34 * u, 76 * u, 15 * u, 11 * u, -0.4);
        c.fill();
        c.fillRect(45 * u, 14 * u, 5 * u, 62 * u);
        c.beginPath();
        c.moveTo(50 * u, 14 * u);
        c.bezierCurveTo(66 * u, 22 * u, 76 * u, 32 * u, 70 * u, 50 * u);
        c.bezierCurveTo(70 * u, 36 * u, 62 * u, 30 * u, 50 * u, 28 * u);
        c.fill();
    }

    function chispa(c, u) {
        c.fillStyle = rg(c, 50 * u, 50 * u, 1 * u, 50 * u, 50 * u, 48 * u, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,244,180,0.9)'], [1, 'rgba(255,212,59,0)']]);
        elipse(c, 50 * u, 50 * u, 48 * u, 48 * u);
        c.fill();
        c.fillStyle = '#fff';
        c.beginPath();
        c.moveTo(50 * u, 6 * u);
        c.quadraticCurveTo(54 * u, 46 * u, 94 * u, 50 * u);
        c.quadraticCurveTo(54 * u, 54 * u, 50 * u, 94 * u);
        c.quadraticCurveTo(46 * u, 54 * u, 6 * u, 50 * u);
        c.quadraticCurveTo(46 * u, 46 * u, 50 * u, 6 * u);
        c.fill();
    }

    function corazon(c, u) {
        c.beginPath();
        c.moveTo(50 * u, 88 * u);
        c.bezierCurveTo(10 * u, 60 * u, 6 * u, 30 * u, 28 * u, 18 * u);
        c.bezierCurveTo(40 * u, 12 * u, 48 * u, 20 * u, 50 * u, 30 * u);
        c.bezierCurveTo(52 * u, 20 * u, 60 * u, 12 * u, 72 * u, 18 * u);
        c.bezierCurveTo(94 * u, 30 * u, 90 * u, 60 * u, 50 * u, 88 * u);
        c.fillStyle = rg(c, 36 * u, 34 * u, 2 * u, 50 * u, 50 * u, 46 * u, [[0, '#ffe3e3'], [0.4, '#ff8787'], [1, '#e03131']]);
        c.fill();
    }

    function humo(c, u) {
        c.fillStyle = rg(c, 50 * u, 50 * u, 2 * u, 50 * u, 50 * u, 48 * u, [[0, 'rgba(255,255,255,0.9)'], [0.6, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]);
        elipse(c, 50 * u, 50 * u, 48 * u, 48 * u);
        c.fill();
    }

    function maceta(c, u) {
        c.fillStyle = lg(c, 18 * u, 0, 82 * u, 0, [[0, '#8a3b12'], [0.35, '#e8773a'], [0.55, '#f59f68'], [1, '#7a3210']]);
        c.beginPath();
        c.moveTo(20 * u, 30 * u);
        c.lineTo(80 * u, 30 * u);
        c.lineTo(72 * u, 96 * u);
        c.quadraticCurveTo(50 * u, 99 * u, 28 * u, 96 * u);
        c.closePath();
        c.fill();
        c.fillStyle = 'rgba(0,0,0,0.18)';
        c.fillRect(22 * u, 30 * u, 56 * u, 7 * u);
        c.fillStyle = lg(c, 14 * u, 0, 86 * u, 0, [[0, '#9c4317'], [0.4, '#ff8c4a'], [0.6, '#f59f68'], [1, '#8a3b12']]);
        redondo(c, 14 * u, 18 * u, 72 * u, 16 * u, 4 * u);
        c.fill();
        c.fillStyle = '#5c3a1e';
        elipse(c, 50 * u, 19 * u, 33 * u, 4 * u);
        c.fill();
    }

    function frasco(c, u) {
        // Frasco de perfume (vacío: el líquido se pinta en la escena).
        c.fillStyle = lg(c, 30 * u, 0, 70 * u, 0, [[0, '#ced4da'], [0.4, '#ffffff'], [1, '#adb5bd']]);
        redondo(c, 41 * u, 8 * u, 18 * u, 16 * u, 4 * u);
        c.fill();
        c.fillStyle = lg(c, 0, 0, 0, 30 * u, [[0, '#f8f0fc'], [1, '#e599f7']]);
        elipse(c, 50 * u, 8 * u, 13 * u, 7 * u);
        c.fill();
        c.fillStyle = 'rgba(231,245,255,0.35)';
        c.strokeStyle = 'rgba(134,142,150,0.9)';
        c.lineWidth = 2 * u;
        redondo(c, 18 * u, 24 * u, 64 * u, 72 * u, 18 * u);
        c.fill();
        c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.7)';
        redondo(c, 25 * u, 32 * u, 8 * u, 50 * u, 4 * u);
        c.fill();
    }

    function arbusto(c, u) {
        var hojas = [[50, 52, 34], [28, 64, 24], [72, 64, 24], [38, 40, 22], [62, 40, 22], [50, 30, 20], [20, 76, 18], [80, 76, 18], [50, 74, 26]];
        hojas.forEach(function (h, i) {
            c.fillStyle = rg(c, (h[0] - h[2] * 0.3) * u, (h[1] - h[2] * 0.4) * u, 1 * u, h[0] * u, h[1] * u, h[2] * u,
                [[0, '#8ce99a'], [0.5, i % 2 ? '#40c057' : '#37b24d'], [1, '#1b6b30']]);
            elipse(c, h[0] * u, h[1] * u, h[2] * u, h[2] * 0.9 * u);
            c.fill();
        });
        c.strokeStyle = 'rgba(20,80,35,0.35)';
        c.lineWidth = 1 * u;
        for (var k = 0; k < 14; k++) {
            var x = (16 + (k * 37) % 68) * u;
            var y = (26 + (k * 23) % 60) * u;
            c.beginPath();
            c.moveTo(x, y);
            c.quadraticCurveTo(x + 3 * u, y - 4 * u, x + 6 * u, y - 2 * u);
            c.stroke();
        }
    }

    function ala(c, u) {
        // Un par de alas de un lado (la escena la refleja para hacer el otro).
        var relleno = rg(c, 8 * u, 50 * u, 2 * u, 30 * u, 50 * u, 70 * u, [[0, '#fff3bf'], [0.35, '#ffa94d'], [0.8, '#e8590c'], [1, '#5c2b00']]);
        c.fillStyle = relleno;
        c.strokeStyle = 'rgba(60,30,0,0.7)';
        c.lineWidth = 2.2 * u;
        // Ala de arriba.
        c.beginPath();
        c.moveTo(6 * u, 48 * u);
        c.bezierCurveTo(12 * u, 14 * u, 52 * u, 0, 88 * u, 8 * u);
        c.bezierCurveTo(98 * u, 22 * u, 82 * u, 44 * u, 6 * u, 50 * u);
        c.fill();
        c.stroke();
        // Ala de abajo.
        c.beginPath();
        c.moveTo(6 * u, 52 * u);
        c.bezierCurveTo(56 * u, 54 * u, 76 * u, 70 * u, 64 * u, 90 * u);
        c.bezierCurveTo(48 * u, 100 * u, 18 * u, 84 * u, 6 * u, 52 * u);
        c.fill();
        c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.9)';
        [[76, 14, 5], [64, 12, 3.5], [50, 82, 4.5]].forEach(function (p) {
            elipse(c, p[0] * u, p[1] * u, p[2] * u, p[2] * u);
            c.fill();
        });
        c.fillStyle = 'rgba(92,43,0,0.75)';
        elipse(c, 40 * u, 28 * u, 7 * u, 5 * u, -0.3);
        c.fill();
    }

    function cono(c, u) {
        c.beginPath();
        c.moveTo(22 * u, 18 * u);
        c.lineTo(78 * u, 18 * u);
        c.lineTo(51 * u, 97 * u);
        c.quadraticCurveTo(50 * u, 99.5 * u, 49 * u, 97 * u);
        c.closePath();
        c.fillStyle = lg(c, 22 * u, 0, 78 * u, 0, [[0, '#b86b1e'], [0.4, '#f0b25a'], [0.6, '#e09a3e'], [1, '#9c5a17']]);
        c.fill();
        c.save();
        c.clip();
        c.strokeStyle = 'rgba(120,60,10,0.55)';
        c.lineWidth = 1.6 * u;
        for (var i = -8; i < 10; i++) {
            c.beginPath();
            c.moveTo((10 + i * 9) * u, 14 * u);
            c.lineTo((50 + i * 9) * u, 100 * u);
            c.stroke();
            c.beginPath();
            c.moveTo((90 - i * 9) * u, 14 * u);
            c.lineTo((50 - i * 9) * u, 100 * u);
            c.stroke();
        }
        c.restore();
        c.fillStyle = lg(c, 0, 14 * u, 0, 24 * u, [[0, '#f5c27a'], [1, '#c47a2c']]);
        redondo(c, 19 * u, 14 * u, 62 * u, 9 * u, 4 * u);
        c.fill();
    }

    var SABORES = {
        fresa: ['#fff0f6', '#faa2c1', '#e64980', '#a61e4d'],
        choco: ['#e6c3a5', '#a0663d', '#6b3e1f', '#3b2010'],
        limon: ['#fffbe6', '#fff08a', '#fcc419', '#c99700'],
        vainilla: ['#ffffff', '#fff4d6', '#f2d38f', '#c99a45'],
        menta: ['#ebfbee', '#b2f2bb', '#51cf66', '#2b8a3e']
    };

    function bola(c, u, sabor) {
        var s = SABORES[sabor] || SABORES.fresa;
        c.beginPath();
        c.arc(50 * u, 46 * u, 36 * u, Math.PI * 0.96, Math.PI * 0.04);
        // Borde ondulado y suave (helado cremoso que empieza a gotear).
        var borde = [[86, 56], [80, 64], [72, 62], [66, 72], [58, 64], [50, 68], [42, 63], [34, 72], [27, 62], [19, 64], [14, 56]];
        for (var i = 0; i < borde.length - 1; i++) {
            var a = borde[i];
            var b = borde[i + 1];
            c.quadraticCurveTo(a[0] * u, a[1] * u, (a[0] + b[0]) / 2 * u, (a[1] + b[1]) / 2 * u);
        }
        c.lineTo(14 * u, 56 * u);
        c.closePath();
        c.fillStyle = rg(c, 38 * u, 30 * u, 2 * u, 50 * u, 46 * u, 42 * u, [[0, s[0]], [0.35, s[1]], [0.85, s[2]], [1, s[3]]]);
        c.fill();
        if (sabor === 'choco') {
            c.fillStyle = 'rgba(255,255,255,0.12)';
            elipse(c, 40 * u, 30 * u, 10 * u, 6 * u, -0.4);
            c.fill();
        }
        if (sabor === 'menta' || sabor === 'vainilla') {
            c.fillStyle = '#3b2010';
            [[40, 36], [58, 30], [62, 48], [44, 52], [30, 46]].forEach(function (p) { elipse(c, p[0] * u, p[1] * u, 2.2 * u, 1.6 * u); c.fill(); });
        }
    }

    function manzana(c, u) {
        c.beginPath();
        c.moveTo(50 * u, 28 * u);
        c.bezierCurveTo(30 * u, 14 * u, 8 * u, 26 * u, 10 * u, 52 * u);
        c.bezierCurveTo(12 * u, 80 * u, 34 * u, 96 * u, 50 * u, 88 * u);
        c.bezierCurveTo(66 * u, 96 * u, 88 * u, 80 * u, 90 * u, 52 * u);
        c.bezierCurveTo(92 * u, 26 * u, 70 * u, 14 * u, 50 * u, 28 * u);
        c.fillStyle = rg(c, 34 * u, 38 * u, 2 * u, 50 * u, 56 * u, 46 * u, [[0, '#ffc9c9'], [0.3, '#fa5252'], [0.85, '#c92a2a'], [1, '#7d1010']]);
        c.fill();
        c.fillStyle = 'rgba(255,255,255,0.55)';
        elipse(c, 30 * u, 44 * u, 5 * u, 9 * u, 0.3);
        c.fill();
        c.strokeStyle = '#5c3a1e';
        c.lineWidth = 3 * u;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(50 * u, 30 * u);
        c.quadraticCurveTo(52 * u, 18 * u, 56 * u, 10 * u);
        c.stroke();
        c.fillStyle = lg(c, 54 * u, 10 * u, 78 * u, 20 * u, [[0, '#2f9e44'], [1, '#8ce99a']]);
        c.beginPath();
        c.moveTo(55 * u, 18 * u);
        c.quadraticCurveTo(66 * u, 4 * u, 80 * u, 12 * u);
        c.quadraticCurveTo(68 * u, 24 * u, 55 * u, 18 * u);
        c.fill();
    }

    function galleta(c, u) {
        c.fillStyle = rg(c, 40 * u, 40 * u, 2 * u, 50 * u, 50 * u, 42 * u, [[0, '#f8d39a'], [0.75, '#e0a458'], [1, '#a0612b']]);
        elipse(c, 50 * u, 50 * u, 40 * u, 38 * u);
        c.fill();
        c.fillStyle = '#4a2a14';
        [[36, 38, 5], [58, 32, 4], [64, 54, 5.5], [42, 60, 4.5], [52, 72, 4], [28, 54, 3.5], [70, 70, 3]].forEach(function (p) {
            elipse(c, p[0] * u, p[1] * u, p[2] * u, p[2] * 0.85 * u, 0.4);
            c.fill();
        });
        c.fillStyle = 'rgba(255,255,255,0.25)';
        elipse(c, 38 * u, 30 * u, 12 * u, 5 * u, -0.4);
        c.fill();
    }

    function nube(c, u) {
        var bolas = [[30, 62, 20], [50, 50, 26], [70, 60, 20], [42, 66, 18], [60, 68, 18], [20, 70, 13], [82, 70, 13]];
        c.fillStyle = 'rgba(120,140,170,0.35)';
        bolas.forEach(function (b) { elipse(c, b[0] * u, (b[1] + 5) * u, b[2] * u, b[2] * u); c.fill(); });
        bolas.forEach(function (b) {
            c.fillStyle = rg(c, (b[0] - b[2] * 0.3) * u, (b[1] - b[2] * 0.5) * u, 1 * u, b[0] * u, b[1] * u, b[2] * u, [[0, '#ffffff'], [0.7, '#f1f5fb'], [1, '#d5dfec']]);
            elipse(c, b[0] * u, b[1] * u, b[2] * u, b[2] * u);
            c.fill();
        });
    }

    function farol(c, u) {
        c.fillStyle = '#343a40';
        redondo(c, 38 * u, 8 * u, 24 * u, 8 * u, 3 * u);
        c.fill();
        c.strokeStyle = '#495057';
        c.lineWidth = 3 * u;
        c.beginPath();
        c.arc(50 * u, 8 * u, 8 * u, Math.PI, 0);
        c.stroke();
        c.fillStyle = rg(c, 50 * u, 50 * u, 2 * u, 50 * u, 50 * u, 26 * u, [[0, '#fff9db'], [0.5, '#ffe066'], [1, '#f59f00']]);
        redondo(c, 32 * u, 16 * u, 36 * u, 66 * u, 8 * u);
        c.fill();
        c.strokeStyle = '#343a40';
        c.lineWidth = 3.5 * u;
        redondo(c, 32 * u, 16 * u, 36 * u, 66 * u, 8 * u);
        c.stroke();
        c.beginPath();
        c.moveTo(50 * u, 16 * u);
        c.lineTo(50 * u, 82 * u);
        c.moveTo(32 * u, 49 * u);
        c.lineTo(68 * u, 49 * u);
        c.stroke();
        c.fillStyle = '#343a40';
        redondo(c, 28 * u, 82 * u, 44 * u, 10 * u, 3 * u);
        c.fill();
    }

    function estrella(c, u) {
        c.beginPath();
        for (var i = 0; i < 10; i++) {
            var a = -Math.PI / 2 + i * Math.PI / 5;
            var r = (i % 2 ? 19 : 44) * u;
            var x = 50 * u + Math.cos(a) * r;
            var y = 54 * u + Math.sin(a) * r;
            if (i === 0) c.moveTo(x, y);
            else c.lineTo(x, y);
        }
        c.closePath();
        c.fillStyle = rg(c, 44 * u, 44 * u, 2 * u, 50 * u, 54 * u, 44 * u, [[0, '#fffbe6'], [0.45, '#ffe066'], [1, '#f59f00']]);
        c.fill();
        c.lineJoin = 'round';
        c.strokeStyle = '#e67700';
        c.lineWidth = 2 * u;
        c.stroke();
        c.fillStyle = '#5c3a00';
        elipse(c, 42 * u, 54 * u, 2.6 * u, 3.4 * u);
        c.fill();
        elipse(c, 58 * u, 54 * u, 2.6 * u, 3.4 * u);
        c.fill();
        c.strokeStyle = '#5c3a00';
        c.lineWidth = 2 * u;
        c.beginPath();
        c.arc(50 * u, 60 * u, 6 * u, 0.2 * Math.PI, 0.8 * Math.PI);
        c.stroke();
    }

    function luciernagas(c, u) {
        // Frasco de vidrio con tapa de tela.
        c.fillStyle = 'rgba(208,235,255,0.35)';
        c.strokeStyle = 'rgba(134,142,150,0.9)';
        c.lineWidth = 2.5 * u;
        redondo(c, 22 * u, 24 * u, 56 * u, 70 * u, 14 * u);
        c.fill();
        c.stroke();
        c.fillStyle = '#e8590c';
        redondo(c, 26 * u, 12 * u, 48 * u, 14 * u, 4 * u);
        c.fill();
        c.strokeStyle = '#c92a2a';
        c.lineWidth = 2 * u;
        c.beginPath();
        c.moveTo(26 * u, 20 * u);
        c.lineTo(74 * u, 20 * u);
        c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.6)';
        redondo(c, 28 * u, 32 * u, 6 * u, 40 * u, 3 * u);
        c.fill();
    }

    function osito(c, u) {
        // Osito de peluche suave (tacto).
        var pelo = function (x, y, r) {
            return rg(c, x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r, [[0, '#e8b98a'], [0.6, '#c68a52'], [1, '#8a5a2b']]);
        };
        [[24, 24, 11], [76, 24, 11]].forEach(function (o) {
            c.fillStyle = pelo(o[0] * u, o[1] * u, o[2] * u);
            elipse(c, o[0] * u, o[1] * u, o[2] * u, o[2] * u);
            c.fill();
            c.fillStyle = '#f3d2b3';
            elipse(c, o[0] * u, o[1] * u, o[2] * 0.55 * u, o[2] * 0.55 * u);
            c.fill();
        });
        c.fillStyle = pelo(50 * u, 74 * u, 30 * u);
        elipse(c, 50 * u, 74 * u, 28 * u, 25 * u);
        c.fill();
        c.fillStyle = '#f3d2b3';
        elipse(c, 50 * u, 78 * u, 15 * u, 13 * u);
        c.fill();
        [[24, 72], [76, 72], [32, 94], [68, 94]].forEach(function (p) {
            c.fillStyle = pelo(p[0] * u, p[1] * u, 10 * u);
            elipse(c, p[0] * u, p[1] * u, 10 * u, 9 * u);
            c.fill();
        });
        c.fillStyle = pelo(50 * u, 38 * u, 26 * u);
        elipse(c, 50 * u, 38 * u, 25 * u, 23 * u);
        c.fill();
        c.fillStyle = '#f3d2b3';
        elipse(c, 50 * u, 46 * u, 11 * u, 8 * u);
        c.fill();
        c.fillStyle = '#3b2412';
        elipse(c, 50 * u, 42 * u, 4 * u, 3 * u);
        c.fill();
        elipse(c, 41 * u, 33 * u, 2.6 * u, 3 * u);
        c.fill();
        elipse(c, 59 * u, 33 * u, 2.6 * u, 3 * u);
        c.fill();
        c.strokeStyle = '#3b2412';
        c.lineWidth = 1.6 * u;
        c.beginPath();
        c.arc(50 * u, 46 * u, 4 * u, 0.15 * Math.PI, 0.85 * Math.PI);
        c.stroke();
        c.fillStyle = '#e64980';
        c.beginPath();
        c.moveTo(50 * u, 58 * u);
        c.lineTo(40 * u, 53 * u);
        c.lineTo(40 * u, 63 * u);
        c.closePath();
        c.moveTo(50 * u, 58 * u);
        c.lineTo(60 * u, 53 * u);
        c.lineTo(60 * u, 63 * u);
        c.closePath();
        c.fill();
    }

    function fresa(c, u) {
        c.beginPath();
        c.moveTo(50 * u, 94 * u);
        c.bezierCurveTo(22 * u, 74 * u, 10 * u, 44 * u, 22 * u, 30 * u);
        c.bezierCurveTo(34 * u, 18 * u, 66 * u, 18 * u, 78 * u, 30 * u);
        c.bezierCurveTo(90 * u, 44 * u, 78 * u, 74 * u, 50 * u, 94 * u);
        c.fillStyle = rg(c, 38 * u, 40 * u, 2 * u, 50 * u, 54 * u, 46 * u, [[0, '#ffa8a8'], [0.4, '#fa5252'], [1, '#a51111']]);
        c.fill();
        c.fillStyle = '#ffec99';
        for (var i = 0; i < 16; i++) {
            var x = 26 + (i * 37) % 48;
            var y = 36 + ((i * 23) % 46);
            if (Math.abs(x - 50) > 30 - (y - 36) * 0.4) continue;
            elipse(c, x * u, y * u, 1.6 * u, 2.4 * u);
            c.fill();
        }
        c.fillStyle = '#2f9e44';
        for (var k = 0; k < 5; k++) {
            c.save();
            c.translate(50 * u, 26 * u);
            c.rotate(-Math.PI / 2 + (k - 2) * 0.55);
            elipse(c, 12 * u, 0, 12 * u, 4.5 * u);
            c.fill();
            c.restore();
        }
        c.fillStyle = '#5c940d';
        redondo(c, 48 * u, 6 * u, 4 * u, 16 * u, 2 * u);
        c.fill();
    }

    function limon(c, u) {
        c.beginPath();
        c.ellipse(50 * u, 54 * u, 38 * u, 28 * u, -0.25, 0, Math.PI * 2);
        c.fillStyle = rg(c, 38 * u, 42 * u, 2 * u, 50 * u, 54 * u, 40 * u, [[0, '#fff9db'], [0.45, '#ffe066'], [1, '#e8b100']]);
        c.fill();
        c.fillStyle = '#e8b100';
        elipse(c, 86 * u, 44 * u, 6 * u, 5 * u, -0.25);
        c.fill();
        elipse(c, 14 * u, 64 * u, 5 * u, 4 * u, -0.25);
        c.fill();
        c.fillStyle = lg(c, 50 * u, 10 * u, 70 * u, 30 * u, [[0, '#2f9e44'], [1, '#8ce99a']]);
        c.beginPath();
        c.moveTo(58 * u, 28 * u);
        c.quadraticCurveTo(66 * u, 8 * u, 84 * u, 12 * u);
        c.quadraticCurveTo(74 * u, 30 * u, 58 * u, 28 * u);
        c.fill();
        c.fillStyle = 'rgba(255,255,255,0.5)';
        elipse(c, 36 * u, 42 * u, 9 * u, 4 * u, -0.4);
        c.fill();
    }

    var DIBUJOS = {
        campana: campana, badajo: badajo, tambor: tambor, baqueta: baqueta, maraca: maraca, pandereta: pandereta,
        flor: flor,
        flor_amarilla: function (c, u) { flor(c, u, 'amarilla'); },
        flor_azul: function (c, u) { flor(c, u, 'azul'); },
        flor_morada: function (c, u) { flor(c, u, 'morada'); },
        flor_blanca: function (c, u) { flor(c, u, 'blanca'); },
        flor_roja: function (c, u) { flor(c, u, 'roja'); },
        maceta: maceta, frasco: frasco, arbusto: arbusto, ala: ala,
        cono: cono, manzana: manzana, galleta: galleta,
        nube: nube, farol: farol, estrella: estrella, luciernagas: luciernagas, osito: osito, fresa: fresa, limon: limon,
        bola_fresa: function (c, u) { bola(c, u, 'fresa'); },
        bola_choco: function (c, u) { bola(c, u, 'choco'); },
        bola_limon: function (c, u) { bola(c, u, 'limon'); },
        bola_vainilla: function (c, u) { bola(c, u, 'vainilla'); },
        bola_menta: function (c, u) { bola(c, u, 'menta'); },
        helado: helado, gota: gota, sol: sol, sol_rayos: solRayos,
        oreja: oreja, nariz: nariz, boca: boca, lengua: lengua, ojo: ojoBlanco, iris: iris, mano: mano,
        burbuja: burbuja, nota: nota, chispa: chispa, corazon: corazon, humo: humo,
        // Composiciones para la portada (en el juego estas piezas se animan por separado).
        sol_completo: function (c, u) { solRayos(c, u); sol(c, u); },
        ojo_completo: function (c, u) {
            ojoBlanco(c, u);
            c.save();
            c.translate(50 * u, 50 * u);
            c.scale(0.36, 0.36);
            c.translate(-50 * u, -50 * u);
            iris(c, u);
            c.restore();
        }
    };

    function textura(scene, nombre, tam) {
        tam = Math.round(tam || 256);
        var clave = 'pa:' + nombre + '@' + tam;
        if (scene.textures.exists(clave)) return clave;
        var fn = DIBUJOS[nombre];
        if (!fn) return '__WHITE';
        var t = scene.textures.createCanvas(clave, tam, tam);
        var c = t.getContext();
        c.clearRect(0, 0, tam, tam);
        fn(c, tam / 100);
        t.refresh();
        return clave;
    }

    /** Globo de color (cuerpo con brillo); el hilo se dibuja en la escena. */
    function globo(scene, color, tam) {
        tam = Math.round(tam || 200);
        var clave = 'pa:globo:' + color + '@' + tam;
        if (scene.textures.exists(clave)) return clave;
        var t = scene.textures.createCanvas(clave, tam, tam);
        var c = t.getContext();
        var u = tam / 100;
        c.beginPath();
        c.moveTo(50 * u, 90 * u);
        c.bezierCurveTo(20 * u, 74 * u, 12 * u, 46 * u, 16 * u, 32 * u);
        c.bezierCurveTo(22 * u, 6 * u, 78 * u, 6 * u, 84 * u, 32 * u);
        c.bezierCurveTo(88 * u, 46 * u, 80 * u, 74 * u, 50 * u, 90 * u);
        c.fillStyle = rg(c, 36 * u, 28 * u, 2 * u, 50 * u, 46 * u, 50 * u, [[0, 'rgba(255,255,255,0.95)'], [0.18, color], [0.85, color], [1, 'rgba(0,0,0,0.55)']]);
        c.fill();
        c.globalCompositeOperation = 'source-atop';
        c.fillStyle = rg(c, 36 * u, 28 * u, 1 * u, 44 * u, 40 * u, 46 * u, [[0, 'rgba(255,255,255,0.9)'], [0.25, 'rgba(255,255,255,0.15)'], [1, 'rgba(0,0,0,0)']]);
        c.fillRect(0, 0, tam, tam);
        c.globalCompositeOperation = 'source-over';
        c.fillStyle = color;
        c.beginPath();
        c.moveTo(46 * u, 94 * u);
        c.lineTo(54 * u, 94 * u);
        c.lineTo(50 * u, 89 * u);
        c.fill();
        t.refresh();
        return clave;
    }

    /** Dibujo como imagen PNG (data URL) para usarlo fuera de Phaser (portada). */
    function dataURL(nombre, tam) {
        var fn = DIBUJOS[nombre];
        if (!fn || !global.document) return '';
        tam = Math.round(tam || 256);
        var cv = global.document.createElement('canvas');
        cv.width = cv.height = tam;
        fn(cv.getContext('2d'), tam / 100);
        return cv.toDataURL('image/png');
    }

    global.PedniaArte = {
        textura: textura,
        dataURL: dataURL,
        globo: globo,
        existe: function (n) { return !!DIBUJOS[n]; },
        nombres: Object.keys(DIBUJOS),
        /** Otras temáticas suman sus dibujos (mismo lienzo de 100 u) y reusan los pinceles. */
        registrar: function (mapa) { Object.keys(mapa).forEach(function (k) { DIBUJOS[k] = mapa[k]; }); },
        pinceles: { lg: lg, rg: rg, elipse: elipse, redondo: redondo, PIEL: PIEL }
    };
})(typeof window !== 'undefined' ? window : this);
