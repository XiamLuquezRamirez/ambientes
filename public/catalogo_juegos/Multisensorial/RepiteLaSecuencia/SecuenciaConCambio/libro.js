/**
 * «El cuento desplegable» — motor propio de Secuencia con Cambio (5-6 años).
 *
 * Un libro pop-up gigante abierto sobre una mesa. Suena una secuencia (las marcas de la cinta se
 * encienden, sin decir cuáles) y el niño la repite TIRANDO DE LAS LENGÜETAS de papel: cada ventanita
 * tiene una lengüeta con argolla; al jalarla se abren los postigos y el personaje-instrumento sale
 * en una figura de cartulina plegable. Si suelta antes de tiempo, la lengüeta regresa. Cuando acierta,
 * ¡se PASA LA PÁGINA!: el libro voltea la hoja (una escena nueva), las ventanitas cambian de lugar,
 * suena otra secuencia con distinto orden y hay que repetir la nueva, sin copiar la anterior.
 * Un error cierra todas las ventanitas y la secuencia vuelve a sonar. Final: página de fiesta con
 * todas las figuras desplegadas y confeti de papel.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var mezclar = Ut.mezclar;

    var COLORES = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xcc5de8, 0xff922b];
    var TEMAS = [['pradera', 'mar'], ['selva', 'desierto'], ['nieve', 'ciudad'], ['espacio', 'fiesta']];
    var UMBRAL = 0.8;

    /* ── Arte del diseñador (img/diseno/fondo1-8.svg): mesa + libro abierto, 1280×720 cada uno ──
       Las 8 escenas comparten mesa y libro; solo cambia lo que hay en las hojas. */
    var DIR_ARTE = 'img/diseno/';
    var FONDO_W = 1280, FONDO_H = 720;
    var TEX_W = 1600, TEX_H = 900;                 // tamaño al que se rasteriza cada SVG
    var TS = TEX_W / FONDO_W;
    var PAG = { x0: 190, x1: 1090, y0: 124, y1: 652, xm: 640, yc: 390 };   // hojas útiles, en unidades del dibujo
    var MAPA_FONDO = { pradera: 1, mar: 2, selva: 6, desierto: 4, nieve: 5, ciudad: 8, espacio: 3, fiesta: 7 };
    var MARIPOSAS_RUTA = '../../AsociaSonidoEImagen/comun/img/mariposa';
    // Sol (1, 3, 5, 7), sol del mar (2) y lunas (4 y 8), en unidades del dibujo.
    var SOL = { x: 568, y: 177, r: 34 };
    var SOL_MAR = { x: 436, y: 180, r: 34 };
    var LUNA4 = { x: 636, y: 260, r: 68 };
    var LUNA8 = { x: 304, y: 242, r: 76 };
    // Estrellas de la noche de la ciudad (medidas por color) y ventanas [cx, cy, ancho, alto].
    var ESTRELLAS8 = [[808, 129], [350, 144], [528, 145], [556, 148], [439, 159], [811, 161], [725, 167], [889, 167], [633, 175], [866, 180], [1058, 184], [853, 185], [511, 204], [957, 207], [394, 208], [556, 209], [798, 214], [955, 214], [708, 219], [577, 221], [918, 225]];
    var VENTANAS8 = [[595, 519, 19, 17], [617, 519, 18, 17], [508, 519, 16, 15], [551, 519, 15, 15], [762, 521, 12, 16], [793, 521, 12, 16], [877, 521, 13, 16], [309, 530, 10, 16], [443, 530, 10, 16], [932, 557, 23, 23], [508, 565, 16, 16], [551, 565, 16, 16], [263, 545, 19, 8]];

    function claveFondo(tema) { return 'cc_fondo' + (MAPA_FONDO[tema] || 1); }

    /* ── Pintores de las páginas (Canvas 2D, estilo papel recortado) ── */

    function rg(i) { var x = Math.sin(i * 127.1 + 11.7) * 43758.5453; return x - Math.floor(x); }
    function circ(c, x, y, r, col) { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill(); }
    function sombra(c, fn) { c.save(); c.shadowColor = 'rgba(30,15,50,.33)'; c.shadowBlur = 9; c.shadowOffsetY = 3; fn(); c.restore(); }
    function capa(c, w, h, y0, amp, f, per, col) {
        c.save(); c.shadowColor = 'rgba(30,15,50,.38)'; c.shadowBlur = 16; c.shadowOffsetY = -4; c.fillStyle = col;
        c.beginPath(); c.moveTo(0, h);
        for (var i = 0; i <= w; i += 10) c.lineTo(i, y0 + Math.sin(i / per + f) * amp + Math.sin(i / (per * 0.4) + f * 2) * amp * 0.3);
        c.lineTo(w, h); c.closePath(); c.fill(); c.restore();
    }
    function nube(c, x, y, s, col) { sombra(c, function () { c.fillStyle = col || '#fff'; [[0, 0, 26], [28, -10, 22], [56, 0, 24], [28, 8, 22]].forEach(function (q) { c.beginPath(); c.arc(x + q[0] * s, y + q[1] * s, q[2] * s, 0, 6.2832); c.fill(); }); }); }
    function sol(c, x, y, r) {
        c.save(); c.translate(x, y); c.fillStyle = 'rgba(255,224,102,.55)';
        for (var i = 0; i < 12; i++) { c.rotate(Math.PI / 6); c.beginPath(); c.moveTo(r * 1.2, -r * 0.14); c.lineTo(r * 1.85, 0); c.lineTo(r * 1.2, r * 0.14); c.fill(); }
        sombra(c, function () { circ(c, 0, 0, r, '#ffd43b'); }); circ(c, -r * 0.25, -r * 0.25, r * 0.4, 'rgba(255,255,255,.35)'); c.restore();
    }
    function pino(c, x, y, s, col, nieve) {
        sombra(c, function () {
            c.fillStyle = '#6b4423'; c.fillRect(x - 4 * s, y - 14 * s, 8 * s, 16 * s);
            for (var i = 0; i < 3; i++) { c.fillStyle = col; c.beginPath(); c.moveTo(x - (30 - i * 7) * s, y - (10 + i * 22) * s); c.lineTo(x + (30 - i * 7) * s, y - (10 + i * 22) * s); c.lineTo(x, y - (46 + i * 22) * s); c.closePath(); c.fill(); }
        });
        if (nieve) { c.fillStyle = '#fff'; for (var j = 0; j < 3; j++) { c.beginPath(); c.moveTo(x - (12 - j * 3) * s, y - (36 + j * 22) * s); c.lineTo(x + (12 - j * 3) * s, y - (36 + j * 22) * s); c.lineTo(x, y - (46 + j * 22) * s); c.closePath(); c.fill(); } }
    }
    function arbol(c, x, y, s, col) { sombra(c, function () { c.fillStyle = '#7a4a24'; c.fillRect(x - 5 * s, y - 34 * s, 10 * s, 38 * s); circ(c, x, y - 52 * s, 26 * s, col); circ(c, x - 20 * s, y - 40 * s, 18 * s, col); circ(c, x + 20 * s, y - 40 * s, 18 * s, col); }); circ(c, x - 8 * s, y - 60 * s, 8 * s, 'rgba(255,255,255,.18)'); }
    function palmera(c, x, y, s) {
        sombra(c, function () {
            c.strokeStyle = '#8a5a2b'; c.lineWidth = 9 * s; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 18 * s, y - 50 * s, x + 6 * s, y - 100 * s); c.stroke();
            for (var i = 0; i < 7; i++) { var a = -Math.PI / 2 + (i - 3) * 0.55; c.save(); c.translate(x + 6 * s, y - 100 * s); c.rotate(a); c.fillStyle = i % 2 ? '#2f9e44' : '#51cf66'; c.beginPath(); c.ellipse(34 * s, 0, 38 * s, 9 * s, 0, 0, 6.2832); c.fill(); c.restore(); }
        });
        circ(c, x + 2 * s, y - 96 * s, 5 * s, '#a0522d'); circ(c, x + 11 * s, y - 94 * s, 5 * s, '#a0522d');
    }
    function cactus(c, x, y, s) { sombra(c, function () { c.fillStyle = '#4f9d4a'; c.beginPath(); c.roundRect ? c.roundRect(x - 9 * s, y - 64 * s, 18 * s, 66 * s, 9 * s) : c.rect(x - 9 * s, y - 64 * s, 18 * s, 66 * s); c.fill(); c.beginPath(); c.roundRect ? c.roundRect(x - 28 * s, y - 46 * s, 12 * s, 28 * s, 6 * s) : c.rect(x - 28 * s, y - 46 * s, 12 * s, 28 * s); c.fill(); c.beginPath(); c.roundRect ? c.roundRect(x + 16 * s, y - 52 * s, 12 * s, 30 * s, 6 * s) : c.rect(x + 16 * s, y - 52 * s, 12 * s, 30 * s); c.fill(); c.fillRect(x - 28 * s, y - 24 * s, 22 * s, 8 * s); c.fillRect(x + 6 * s, y - 28 * s, 22 * s, 8 * s); }); circ(c, x, y - 70 * s, 5 * s, '#ff8fab'); }
    function piramide(c, x, y, s) { sombra(c, function () { c.fillStyle = '#e8b45e'; c.beginPath(); c.moveTo(x - 60 * s, y); c.lineTo(x, y - 70 * s); c.lineTo(x + 60 * s, y); c.closePath(); c.fill(); }); c.fillStyle = '#c98f3a'; c.beginPath(); c.moveTo(x, y - 70 * s); c.lineTo(x + 60 * s, y); c.lineTo(x + 8 * s, y); c.closePath(); c.fill(); }
    function estrella(c, x, y, r, col) { c.fillStyle = col; c.beginPath(); for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.closePath(); c.fill(); }
    function planeta(c, x, y, r, col, anillo) { sombra(c, function () { circ(c, x, y, r, col); }); circ(c, x - r * 0.3, y - r * 0.3, r * 0.35, 'rgba(255,255,255,.22)'); if (anillo) { c.strokeStyle = 'rgba(255,230,170,.85)'; c.lineWidth = r * 0.14; c.beginPath(); c.ellipse(x, y, r * 1.7, r * 0.45, -0.3, 0, 6.2832); c.stroke(); } }
    function edificio(c, x, y, w, h, col, luces) { sombra(c, function () { c.fillStyle = col; c.fillRect(x, y - h, w, h); }); for (var i = 0; i < luces; i++) { c.fillStyle = rg(x + i) > 0.35 ? '#ffe066' : 'rgba(255,255,255,.12)'; c.fillRect(x + 8 + (i % 3) * (w / 3.4), y - h + 10 + Math.floor(i / 3) * 22, 10, 13); } }
    function velero(c, x, y, s) { sombra(c, function () { c.fillStyle = '#8a5a2b'; c.beginPath(); c.moveTo(x - 40 * s, y); c.lineTo(x + 40 * s, y); c.lineTo(x + 26 * s, y + 18 * s); c.lineTo(x - 26 * s, y + 18 * s); c.closePath(); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x, y - 6 * s); c.lineTo(x, y - 70 * s); c.lineTo(x + 34 * s, y - 6 * s); c.closePath(); c.fill(); c.fillStyle = '#ff6b6b'; c.beginPath(); c.moveTo(x - 4 * s, y - 6 * s); c.lineTo(x - 4 * s, y - 52 * s); c.lineTo(x - 30 * s, y - 6 * s); c.closePath(); c.fill(); }); }
    function faro(c, x, y, s) { sombra(c, function () { c.fillStyle = '#6c757d'; c.beginPath(); c.moveTo(x - 40 * s, y); c.quadraticCurveTo(x, y - 34 * s, x + 40 * s, y); c.fill(); c.fillStyle = '#f8f9fa'; c.beginPath(); c.moveTo(x - 14 * s, y - 8 * s); c.lineTo(x + 14 * s, y - 8 * s); c.lineTo(x + 9 * s, y - 80 * s); c.lineTo(x - 9 * s, y - 80 * s); c.closePath(); c.fill(); c.fillStyle = '#e03131'; c.fillRect(x - 12 * s, y - 40 * s, 24 * s, 10 * s); c.fillRect(x - 9 * s, y - 80 * s, 18 * s, 10 * s); c.fillStyle = '#ffd43b'; c.fillRect(x - 8 * s, y - 94 * s, 16 * s, 14 * s); }); }
    function ola(c, w, y0, amp, per, col) { c.save(); c.shadowColor = 'rgba(0,30,70,.35)'; c.shadowBlur = 12; c.shadowOffsetY = -3; c.fillStyle = col; c.beginPath(); c.moveTo(0, 2000); for (var i = 0; i <= w; i += 8) c.lineTo(i, y0 + Math.sin(i / per) * amp); c.lineTo(w, 2000); c.closePath(); c.fill(); c.restore(); }
    function hoja(c, x, y, a, l, col) { c.save(); c.translate(x, y); c.rotate(a); sombra(c, function () { c.fillStyle = col; c.beginPath(); c.ellipse(l / 2, 0, l / 2, l * 0.2, 0, 0, 6.2832); c.fill(); }); c.strokeStyle = 'rgba(0,0,0,.2)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(l, 0); c.stroke(); c.restore(); }

    var ARTE = {
        pradera: { cielo: ['#8fd3ff', '#eaf8ff'], pintar: function (c, w, h, s) {
            sol(c, w * 0.84, h * 0.17, h * 0.07); nube(c, w * 0.16, h * 0.15, s * 1.1); nube(c, w * 0.5, h * 0.09, s * 0.9); nube(c, w * 0.68, h * 0.24, s * 0.7);
            capa(c, w, h, h * 0.6, 20 * s, 0.4, 130, '#a5dd7a'); arbol(c, w * 0.1, h * 0.66, s * 1.3, '#4caf50'); arbol(c, w * 0.9, h * 0.66, s * 1.2, '#43a047');
            capa(c, w, h, h * 0.72, 24 * s, 2.1, 110, '#79c957'); capa(c, w, h, h * 0.86, 16 * s, 4.4, 90, '#55a83f');
            for (var i = 0; i < 40; i++) { var fx = rg(i) * w, fy = h * (0.78 + rg(i + 50) * 0.2); circ(c, fx, fy, 3.5 * s, ['#ff6b6b', '#ffd43b', '#fff', '#cc5de8'][i % 4]); circ(c, fx, fy, 1.4 * s, '#ffe066'); } } },
        mar: { cielo: ['#7fd0ff', '#dff4ff'], pintar: function (c, w, h, s) {
            sol(c, w * 0.14, h * 0.17, h * 0.07); nube(c, w * 0.5, h * 0.12, s); nube(c, w * 0.82, h * 0.2, s * 0.8); faro(c, w * 0.88, h * 0.62, s * 1.5); velero(c, w * 0.4, h * 0.56, s * 1.6);
            ola(c, w, h * 0.6, 7 * s, 50 * s, '#4fb3f6'); ola(c, w, h * 0.7, 9 * s, 62 * s, '#2f8fe0'); ola(c, w, h * 0.8, 10 * s, 55 * s, '#1f6fc4'); ola(c, w, h * 0.9, 8 * s, 70 * s, '#17539a');
            for (var i = 0; i < 6; i++) { var gx = w * (0.1 + i * 0.15), gy = h * (0.1 + rg(i + 3) * 0.2); c.strokeStyle = '#fff'; c.lineWidth = 3 * s; c.beginPath(); c.moveTo(gx - 10 * s, gy); c.quadraticCurveTo(gx, gy - 8 * s, gx + 10 * s, gy); c.quadraticCurveTo(gx + 20 * s, gy - 8 * s, gx + 30 * s, gy); c.stroke(); } } },
        selva: { cielo: ['#c7ee9c', '#f8ffd9'], pintar: function (c, w, h, s) {
            sol(c, w * 0.78, h * 0.18, h * 0.06);
            capa(c, w, h, h * 0.58, 22 * s, 1, 120, '#4f9d4a'); palmera(c, w * 0.12, h * 0.68, s * 1.5); palmera(c, w * 0.88, h * 0.7, s * 1.4); capa(c, w, h, h * 0.72, 22 * s, 3, 100, '#2f8f3e'); capa(c, w, h, h * 0.86, 16 * s, 5, 90, '#1f6f33');
            for (var i = 0; i < 9; i++) { hoja(c, w * (i / 8), 0, 1.5 + (rg(i) - 0.5) * 0.9, h * (0.22 + rg(i + 9) * 0.14), ['#2f9e44', '#51cf66', '#37b24d'][i % 3]); }
            for (var k = 0; k < 14; k++) circ(c, rg(k + 70) * w, h * (0.8 + rg(k + 80) * 0.15), 5 * s, ['#ff6b6b', '#ffd43b', '#ff8fab'][k % 3]); } },
        desierto: { cielo: ['#ffcf8a', '#fff1d1'], pintar: function (c, w, h, s) {
            sol(c, w * 0.64, h * 0.26, h * 0.11); piramide(c, w * 0.22, h * 0.64, s * 1.6); piramide(c, w * 0.34, h * 0.66, s * 1.1); piramide(c, w * 0.8, h * 0.62, s * 1.3);
            capa(c, w, h, h * 0.64, 24 * s, 0.5, 160, '#f2bd6c'); cactus(c, w * 0.08, h * 0.76, s * 1.4); cactus(c, w * 0.93, h * 0.78, s * 1.2); capa(c, w, h, h * 0.78, 20 * s, 2.5, 130, '#e29f4a'); capa(c, w, h, h * 0.9, 12 * s, 4.5, 100, '#c9823a'); } },
        nieve: { cielo: ['#8fb0ff', '#eef5ff'], pintar: function (c, w, h, s) {
            circ(c, w * 0.8, h * 0.17, h * 0.06, '#fffbe0'); circ(c, w * 0.8 + h * 0.02, h * 0.15, h * 0.05, 'rgba(143,176,255,.9)');
            for (var a = 0; a < 3; a++) { c.fillStyle = ['rgba(105,219,124,.18)', 'rgba(77,171,247,.16)', 'rgba(204,93,232,.13)'][a]; c.beginPath(); c.moveTo(0, h * (0.1 + a * 0.06)); for (var x = 0; x <= w; x += 20) c.lineTo(x, h * (0.12 + a * 0.06) + Math.sin(x / 90 + a) * 24 * s); c.lineTo(w, h * (0.3 + a * 0.06)); c.lineTo(0, h * (0.3 + a * 0.06)); c.fill(); }
            capa(c, w, h, h * 0.6, 20 * s, 0.3, 140, '#f5f9ff'); pino(c, w * 0.1, h * 0.7, s * 1.5, '#2b7a4b', true); pino(c, w * 0.18, h * 0.68, s * 1.1, '#2f8a55', true); pino(c, w * 0.9, h * 0.7, s * 1.4, '#2b7a4b', true);
            capa(c, w, h, h * 0.74, 22 * s, 2, 120, '#dce9f8'); capa(c, w, h, h * 0.88, 14 * s, 4, 100, '#c4d8ee');
            for (var i = 0; i < 70; i++) circ(c, rg(i + 3) * w, rg(i + 90) * h * 0.7, (1.5 + rg(i) * 2.5) * s, 'rgba(255,255,255,.9)'); } },
        ciudad: { cielo: ['#2b2b72', '#d98aa3'], pintar: function (c, w, h, s) {
            circ(c, w * 0.78, h * 0.2, h * 0.06, '#fff4cc'); for (var i = 0; i < 30; i++) circ(c, rg(i) * w, rg(i + 40) * h * 0.4, 1.6 * s, 'rgba(255,255,255,.7)');
            var x = 0, k = 0; while (x < w) { var bw = (50 + rg(k) * 50) * s, bh = (110 + rg(k + 7) * 150) * s; edificio(c, x, h * 0.74, bw, bh, ['#4a3c7a', '#3b2f66', '#5a4a8c'][k % 3], 9); x += bw + 6 * s; k++; }
            capa(c, w, h, h * 0.78, 6 * s, 1, 200, '#2a2150'); capa(c, w, h, h * 0.9, 5 * s, 3, 160, '#1d1640');
            for (var g = 0; g < 4; g++) { var bx = w * (0.18 + g * 0.22), by = h * (0.3 + rg(g) * 0.1); sombra(c, function () { circ(c, bx, by, 22 * s, ['#ff6b6b', '#ffd43b', '#4dabf7', '#69db7c'][g]); }); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; c.beginPath(); c.moveTo(bx, by + 22 * s); c.lineTo(bx, by + 60 * s); c.stroke(); } } },
        espacio: { cielo: ['#0b0b33', '#2c1b66'], pintar: function (c, w, h, s) {
            for (var i = 0; i < 90; i++) estrella(c, rg(i) * w, rg(i + 30) * h * 0.75, (1 + rg(i + 60) * 3) * s, 'rgba(255,255,255,' + (0.4 + rg(i + 5) * 0.6) + ')');
            planeta(c, w * 0.18, h * 0.24, h * 0.09, '#ff8a5c', true); planeta(c, w * 0.8, h * 0.2, h * 0.07, '#5cc8ff', false); planeta(c, w * 0.55, h * 0.4, h * 0.04, '#d0a2ff', false);
            capa(c, w, h, h * 0.72, 16 * s, 0.7, 150, '#8d8aa8'); capa(c, w, h, h * 0.84, 12 * s, 2, 120, '#6d6a8a'); for (var k = 0; k < 7; k++) { c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(rg(k + 5) * w, h * (0.78 + rg(k + 9) * 0.16), 30 * s, 9 * s, 0, 0, 6.2832); c.fill(); }
            sombra(c, function () { c.fillStyle = '#f1f3f5'; c.beginPath(); c.moveTo(w * 0.92, h * 0.73); c.lineTo(w * 0.92, h * 0.52); c.lineTo(w * 0.945, h * 0.43); c.lineTo(w * 0.97, h * 0.52); c.lineTo(w * 0.97, h * 0.73); c.fill(); }); circ(c, w * 0.945, h * 0.55, 6 * s, '#4dabf7'); } },
        fiesta: { cielo: ['#3b1a6b', '#c2407c'], pintar: function (c, w, h, s) {
            for (var b = 0; b < 4; b++) { var bx = w * (0.15 + b * 0.23); c.fillStyle = 'rgba(255,224,102,.12)'; c.beginPath(); c.moveTo(bx - 8 * s, 0); c.lineTo(bx + 8 * s, 0); c.lineTo(bx + 120 * s, h * 0.8); c.lineTo(bx - 120 * s, h * 0.8); c.fill(); }
            c.strokeStyle = '#ffe3a8'; c.lineWidth = 3 * s; c.beginPath(); c.moveTo(0, h * 0.06); c.quadraticCurveTo(w * 0.25, h * 0.2, w * 0.5, h * 0.06); c.quadraticCurveTo(w * 0.75, h * 0.2, w, h * 0.06); c.stroke();
            for (var f = 0; f < 22; f++) { var t = f / 21, fx = t * w, fy = h * 0.06 + (t < 0.5 ? Math.sin(t * 2 * Math.PI) * 0.0 : 0) + Math.sin((t * 2 % 1) * Math.PI) * h * 0.075; c.fillStyle = ['#ff6b6b', '#ffd43b', '#4dabf7', '#69db7c'][f % 4]; c.beginPath(); c.moveTo(fx - 10 * s, fy); c.lineTo(fx + 10 * s, fy); c.lineTo(fx, fy + 24 * s); c.fill(); }
            capa(c, w, h, h * 0.78, 6 * s, 1, 180, '#6a2c91'); capa(c, w, h, h * 0.9, 5 * s, 3, 140, '#4a1d70');
            for (var i = 0; i < 50; i++) { c.fillStyle = ['#ff6b6b', '#ffd43b', '#4dabf7', '#69db7c', '#fff'][i % 5]; c.fillRect(rg(i + 3) * w, rg(i + 60) * h * 0.8, 6 * s, 3 * s); } } }
    };

    function pintarPagina(c, w, h, tema) {
        var A = ARTE[tema], s = h / 500;
        var g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, A.cielo[0]); g.addColorStop(1, A.cielo[1]); c.fillStyle = g; c.fillRect(0, 0, w, h);
        A.pintar(c, w, h, s);
        for (var i = 0; i < 700; i++) { c.fillStyle = 'rgba(255,255,255,' + (0.025 + rg(i + 3) * 0.045) + ')'; c.fillRect(rg(i + 1) * w, rg(i + 2) * h, 2, 2); }
        var v = c.createRadialGradient(w / 2, h / 2, h * 0.5, w / 2, h / 2, w * 0.7); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(40,20,60,.28)'); c.fillStyle = v; c.fillRect(0, 0, w, h);
    }

    /* ── La escena ── */

    var escena = {
        iniciar: function () {
            this.slots = [];
            this.reunidos = [];
            this.ranuras = [];
            this.miniaturas = [];
            this.lampOn = -1;
            this.rondaDos = false;
            this.temaActual = null;
            this.arr = null;
            this.ocupado = false;
            this.fiesta = 0;
            this.pulsoHint = 0;
            this.amb = { objs: [], upd: [], f: 0 };
            this.fondoImg = null;
        },

        precargar: function () {
            var self = this;
            for (var i = 1; i <= 8; i++) {
                if (!this.textures.exists('cc_fondo' + i)) this.load.svg('cc_fondo' + i, DIR_ARTE + 'fondo' + i + '.svg', { width: TEX_W, height: TEX_H });
            }
            // Mariposas del diseño (las de ¿Qué suena?): son SVG de Illustrator, van con tamaño.
            for (var m = 1; m <= 5; m++) {
                if (!this.textures.exists('cc_mariposa' + m)) this.load.svg('cc_mariposa' + m, MARIPOSAS_RUTA + m + '.svg?v=20261113', { width: 160, height: 160 });
            }
        },

        /** Hay arte si llegaron las 8 escenas (si no, se pinta el libro de siempre). */
        arteOk: function () {
            for (var i = 1; i <= 8; i++) if (!this.textures.exists('cc_fondo' + i)) return false;
            return true;
        },

        /** Encaje del dibujo 1280×720: cubre la pantalla, sin sacar el libro ni tapar al presentador. */
        marcoFondo: function (W, H, pres) {
            var k = Math.min(Math.max(W / FONDO_W, H / FONDO_H), H / 690);
            k = Math.min(k, pres ? (W / 2 - 150) / 450 : (W / 2 - 10) / 455);
            k = Math.max(0.3, k);
            var ox = (W - FONDO_W * k) / 2, oy = (H - FONDO_H * k) / 2;
            return { k: k, ox: ox, oy: oy, sx: function (x) { return ox + x * k; }, sy: function (y) { return oy + y * k; } };
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            if (this.arteOk()) {
                var F = L.F = this.marcoFondo(W, H, !!L.pres);
                var x0a = F.sx(PAG.x0), x1a = F.sx(PAG.x1), y0a = F.sy(PAG.y0), y1a = F.sy(PAG.y1);
                L.libro = { x0: x0a, x1: x1a, y0: y0a, y1: y1a, w: x1a - x0a, h: y1a - y0a, xm: F.sx(PAG.xm) };
                L.ventY = y0a + (y1a - y0a) * 0.5;
                L.rib = { x: L.libro.xm, y: Math.max(70, F.sy(108) - 20) };
                L.bocina = { x: Math.max(48, F.sx(98)), y: F.sy(190), r: Math.max(24, Math.min(32, hueco * 0.28)) };
                return L;
            }
            var x0 = W >= 900 ? 112 : 18, x1 = L.der - 8;
            var y0 = Math.round(H * 0.2), y1 = Math.round(H * 0.92);
            L.libro = { x0: x0, x1: x1, y0: y0, y1: y1, w: x1 - x0, h: y1 - y0, xm: (x0 + x1) / 2 };
            L.ventY = y0 + (y1 - y0) * 0.5;
            L.rib = { x: (x0 + x1) / 2, y: Math.round(H * 0.122) };
            L.bocina = { x: 48, y: Math.round(H * 0.2), r: Math.max(24, Math.min(32, hueco * 0.28)) };
            return L;
        },

        clavePagina: function (tema) { var B = this.L.libro; return 'pag_' + tema + '_' + Math.round(B.w) + 'x' + Math.round(B.h); },

        asegurarPagina: function (tema) {
            var B = this.L.libro, clave = this.clavePagina(tema);
            if (!this.textures.exists(clave)) K.textura(this, clave, B.w, B.h, function (c, w, h) { pintarPagina(c, w, h, tema); });
            return clave;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular(), B = L.libro;
            var keep = this.limpiarEscenario();
            if (L.F) this.armarFondoArte(L, keep); else this.armarFondoClasico(L, keep);
            this.fondoSlotG = keep(this.add.graphics().setDepth(18));
            this.frenteG = keep(this.add.graphics().setDepth(21));
            this.cintaG = keep(this.add.graphics().setDepth(15));
            this.montarHud(keep);
            this.sembrarMotes(keep, 10, { x: B.x0, y: B.y0, w: B.w, h: B.h, depth: 7 }, 0xfff3bf);
            if (L.F) this.montarAmbiente(this.temaActual || TEMAS[0][0]);
            if (reubicar) { this.ubicarSlots(); this.redibujarMiniaturas(); }
        },

        /** Mesa y libro del diseñador: una sola imagen; si sobra pantalla, la madera se estira. */
        armarFondoArte: function (L, keep) {
            var F = L.F, self = this;
            if (!this.temaActual) this.temaActual = TEMAS[0][0];
            var base = 'cc_fondo1', esc = F.k / TS;
            // Franjas sobrantes: se repite la madera de los bordes del propio dibujo.
            var banda = function (cx, cy, cw, ch, dx, dy, dw, dh) {
                if (dw < 1 || dh < 1) return;
                var im = self.add.image(dx - cx * (dw / (cw * TS)) * TS, dy - cy * (dh / (ch * TS)) * TS, base).setOrigin(0, 0).setDepth(0);
                im.setScale(dw / (cw * TS), dh / (ch * TS)).setCrop(cx * TS, cy * TS, cw * TS, ch * TS);
                keep(im);
            };
            var fondoBase = keep(this.add.rectangle(0, 0, L.W, L.H, 0xe6b077).setOrigin(0, 0).setDepth(0));
            if (F.oy > 0.5) { banda(0, 0, FONDO_W, 50, 0, 0, L.W, F.oy + 1); banda(0, 700, FONDO_W, 20, 0, F.oy + FONDO_H * F.k - 1, L.W, L.H - (F.oy + FONDO_H * F.k) + 2); }
            if (F.ox > 0.5) { banda(0, 0, 40, FONDO_H, 0, F.oy, F.ox + 1, FONDO_H * F.k); banda(FONDO_W - 40, 0, 40, FONDO_H, F.ox + FONDO_W * F.k - 1, F.oy, L.W - (F.ox + FONDO_W * F.k) + 2, FONDO_H * F.k); }
            this.fondoImg = keep(this.add.image(F.ox, F.oy, claveFondo(this.temaActual)).setOrigin(0, 0).setScale(esc).setDepth(1));
        },

        armarFondoClasico: function (L, keep) {
            var B = L.libro;
            // Mesa de madera con la luz de una lámpara.
            K.textura(this, 'libro_mesa_' + L.W + 'x' + L.H, L.W, L.H, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#7a4a2a'); g.addColorStop(1, '#5a3319'); x.fillStyle = g; x.fillRect(0, 0, w, h);
                for (var i = 0; i < 9; i++) { x.fillStyle = i % 2 ? 'rgba(0,0,0,.1)' : 'rgba(255,255,255,.04)'; x.fillRect(0, i * h / 9, w, h / 9); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, i * h / 9, w, 2); }
                for (var k = 0; k < 160; k++) { x.strokeStyle = 'rgba(0,0,0,' + (0.04 + rg(k) * 0.06) + ')'; x.beginPath(); var yy = rg(k + 1) * h, x0 = rg(k + 2) * w; x.moveTo(x0, yy); x.lineTo(x0 + 80 + rg(k + 3) * 160, yy + (rg(k + 4) - 0.5) * 4); x.stroke(); }
                var r = x.createRadialGradient(w * 0.42, h * 0.45, h * 0.2, w * 0.42, h * 0.45, w * 0.7); r.addColorStop(0, 'rgba(255,220,150,.25)'); r.addColorStop(1, 'rgba(0,0,0,.35)'); x.fillStyle = r; x.fillRect(0, 0, w, h);
            });
            keep(this.add.image(0, 0, 'libro_mesa_' + L.W + 'x' + L.H).setOrigin(0, 0).setDepth(1));
            // Tapa de cuero y canto de las hojas.
            var tapa = keep(this.add.graphics().setDepth(2));
            tapa.fillStyle(0x000000, 0.35); tapa.fillRoundedRect(B.x0 - 8, B.y0 - 6, B.w + 28, B.h + 34, 18);
            tapa.fillStyle(0x7b2d26, 1); tapa.fillRoundedRect(B.x0 - 18, B.y0 - 16, B.w + 36, B.h + 32, 16);
            tapa.lineStyle(4, 0xd4a24c, 0.9); tapa.strokeRoundedRect(B.x0 - 12, B.y0 - 10, B.w + 24, B.h + 20, 12);
            tapa.fillStyle(0xf3ead2, 1); tapa.fillRoundedRect(B.x0 - 6, B.y0 - 4, B.w + 12, B.h + 14, 8);
            for (var i = 0; i < 5; i++) { tapa.lineStyle(1.5, 0xc9b88e, 0.9); tapa.lineBetween(B.x0 - 4, B.y1 + 2 + i * 2.4, B.x1 + 4, B.y1 + 2 + i * 2.4); }
            if (!this.temaActual) this.temaActual = TEMAS[0][0];
            this.paginaImg = keep(this.add.image(B.x0, B.y0, this.asegurarPagina(this.temaActual)).setOrigin(0, 0).setDepth(3));
            // Sombra del canal central.
            K.textura(this, 'libro_canal_' + Math.round(B.h), 90, B.h, function (x, w, h) { var g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(30,15,10,0)'); g.addColorStop(0.5, 'rgba(30,15,10,.3)'); g.addColorStop(1, 'rgba(30,15,10,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
            keep(this.add.image(B.xm, B.y0, 'libro_canal_' + Math.round(B.h)).setOrigin(0.5, 0).setDepth(5));
        },

        ponerTema: function (tema) {
            this.temaActual = tema;
            if (this.L && this.L.F) {
                if (this.fondoImg && this.fondoImg.active) this.fondoImg.setTexture(claveFondo(tema));
                this.montarAmbiente(tema);
                return;
            }
            if (this.paginaImg && this.paginaImg.active) { this.paginaImg.setTexture(this.asegurarPagina(tema)); this.paginaImg.setVisible(true); }
        },

        /** Pasar la página: la hoja derecha se voltea y descubre la escena nueva. */
        voltear: async function (tema) {
            if (this.L.F) return this.voltearArte(tema);
            var self = this, B = this.L.libro, hw = B.w / 2;
            var kA = this.clavePagina(this.temaActual), kB = this.asegurarPagina(tema);
            this.paginaImg.setVisible(false);
            var mk = function (clave, ox, d) { return self.add.image(ox, B.y0, clave).setOrigin(ox === B.xm ? 0.5 : 0, 0).setDepth(d); };
            var baseL = mk(kA, B.x0, 3).setCrop(0, 0, hw, B.h);
            var baseR = mk(kB, B.x0, 3).setCrop(hw, 0, hw, B.h);
            var hoja1 = mk(kA, B.xm, 4).setCrop(hw, 0, hw, B.h);
            var hoja2 = mk(kB, B.xm, 4).setCrop(0, 0, hw, B.h).setVisible(false);
            var sombra = this.add.rectangle(B.xm, B.y0 + B.h / 2, 10, B.h, 0x000000, 0).setDepth(4);
            K.ruido({ f: 900, q: 0.5, dur: 0.5, vol: 0.07 });
            await new Promise(function (res) {
                var o = { t: 0 };
                self.tweens.add({
                    targets: o, t: 1, duration: 1100, ease: 'Sine.easeInOut',
                    onUpdate: function () {
                        var ang = o.t * Math.PI, s = Math.cos(ang), lev = Math.sin(ang);
                        if (o.t < 0.5) { hoja1.setScale(Math.max(0.001, s), 1 + 0.03 * lev); hoja1.y = B.y0 - 6 * lev; var g = Math.round(255 - 80 * lev); hoja1.setTint(g << 16 | g << 8 | g); }
                        else { hoja1.setVisible(false); hoja2.setVisible(true); hoja2.setScale(Math.max(0.001, -s), 1 + 0.03 * lev); hoja2.y = B.y0 - 6 * lev; var g2 = Math.round(255 - 80 * lev); hoja2.setTint(g2 << 16 | g2 << 8 | g2); }
                        sombra.setAlpha(0.25 * lev); sombra.x = o.t < 0.5 ? B.xm + hw * s * 0.5 : B.xm + hw * s * 0.5; sombra.width = Math.max(4, hw * Math.abs(s));
                    },
                    onComplete: res
                });
            });
            [baseL, baseR, hoja1, hoja2, sombra].forEach(function (o) { o.destroy(); });
            this.ponerTema(tema);
        },

        /** Pasar la página con el dibujo del diseñador: solo gira la hoja derecha (la mesa y el libro no se mueven). */
        voltearArte: async function (tema) {
            var self = this, F = this.L.F, B = this.L.libro, hw = B.w / 2;
            var kA = claveFondo(this.temaActual), kB = claveFondo(tema), esc = F.k / TS;
            this.limpiarAmb();
            var px = F.sx(PAG.xm), py = F.sy(PAG.yc);
            var mk = function (clave, d) { return self.add.image(px, py, clave).setOrigin(0.5, PAG.yc / FONDO_H).setScale(esc).setDepth(d); };
            var anchoMed = (PAG.x1 - PAG.xm) * TS, largo = (PAG.y1 - PAG.y0) * TS;
            // Debajo de la hoja que gira ya está la escena nueva (con el borde del libro, lo mismo en las 8).
            var baseR = self.add.image(F.ox, F.oy, kB).setOrigin(0, 0).setScale(esc).setDepth(3).setCrop(PAG.xm * TS, 105 * TS, 460 * TS, 597 * TS);
            var hoja1 = mk(kA, 4).setCrop(PAG.xm * TS, PAG.y0 * TS, anchoMed, largo);
            var hoja2 = mk(kB, 4).setCrop(PAG.x0 * TS, PAG.y0 * TS, anchoMed, largo).setVisible(false);
            var sombra = this.add.rectangle(B.xm, B.y0 + B.h / 2, 10, B.h, 0x000000, 0).setDepth(4);
            K.ruido({ f: 900, q: 0.5, dur: 0.5, vol: 0.07 });
            await new Promise(function (res) {
                var o = { t: 0 };
                self.tweens.add({
                    targets: o, t: 1, duration: 1100, ease: 'Sine.easeInOut',
                    onUpdate: function () {
                        var ang = o.t * Math.PI, s = Math.cos(ang), lev = Math.sin(ang), g = Math.round(255 - 80 * lev);
                        if (o.t < 0.5) { hoja1.setScale(esc * Math.max(0.001, s), esc * (1 + 0.03 * lev)); hoja1.y = py - 6 * lev; hoja1.setTint(g << 16 | g << 8 | g); }
                        else { hoja1.setVisible(false); hoja2.setVisible(true); hoja2.setScale(esc * Math.max(0.001, -s), esc * (1 + 0.03 * lev)); hoja2.y = py - 6 * lev; hoja2.setTint(g << 16 | g << 8 | g); }
                        sombra.setAlpha(0.25 * lev); sombra.x = B.xm + hw * s * 0.5; sombra.width = Math.max(4, hw * Math.abs(s));
                    },
                    onComplete: res
                });
            });
            [baseR, hoja1, hoja2, sombra].forEach(function (o) { o.destroy(); });
            this.ponerTema(tema);
        },

        /* ── Vida en las hojas: lo que se mueve encima del dibujo, sin cambiar la escena ── */

        limpiarAmb: function () {
            var a = this.amb;
            if (a) a.objs.forEach(function (o) { if (o && o.destroy) o.destroy(); });
            this.amb = { objs: [], upd: [], f: 0 };
        },

        montarAmbiente: function (tema) {
            this.limpiarAmb();
            var self = this, F = this.L && this.L.F;
            if (!F) return;
            var k = F.k, amb = this.amb, ADD = Phaser.BlendModes.ADD, D = 6;
            var u = function (x) { return F.sx(x); }, v = function (y) { return F.sy(y); };
            var A = function (o) { amb.objs.push(o); if (self.estaticos) self.estaticos.push(o); return o; };
            var azar = function (a, b) { return a + Math.random() * (b - a); };
            var ph = function (i) { return rg(i * 3.7 + 1) * 6.28; };

            // Halo suave (degradado radial) para soles y lunas.
            if (!this.textures.exists('cc_halo')) {
                var cv = this.textures.createCanvas('cc_halo', 256, 256), cx = cv.getContext();
                var gr = cx.createRadialGradient(128, 128, 0, 128, 128, 128);
                gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
                cx.fillStyle = gr; cx.fillRect(0, 0, 256, 256); cv.refresh();
            }
            function halo(x, y, r, col) {
                var h = A(self.add.image(u(x), v(y), 'cc_halo').setDisplaySize(r * 2 * k, r * 2 * k).setTint(col).setDepth(D).setBlendMode(ADD).setAlpha(0));
                h.base = h.scaleX;
                return h;
            }
            // Sol con rayos que giran muy despacio y un halo que late.
            function sol(c, col) {
                var h = halo(c.x, c.y, c.r * 2.4, col);
                var rayos = A(self.add.graphics().setDepth(D).setBlendMode(ADD));
                rayos.setPosition(u(c.x), v(c.y));
                rayos.fillStyle(col, 0.5);
                for (var i = 0; i < 12; i++) {
                    var a = i * Math.PI / 6, r0 = c.r * 1.25 * k, r1 = c.r * 2.3 * k, w = 0.1;
                    rayos.fillTriangle(Math.cos(a - w) * r0, Math.sin(a - w) * r0, Math.cos(a + w) * r0, Math.sin(a + w) * r0, Math.cos(a) * r1, Math.sin(a) * r1);
                }
                amb.upd.push(function (t) {
                    h.setAlpha((0.3 + 0.18 * Math.sin(t / 900)) * amb.f); h.setScale(h.base * (1 + 0.07 * Math.sin(t / 1300)));
                    rayos.rotation = t / 9000; rayos.setAlpha((0.1 + 0.06 * Math.sin(t / 1100 + 1)) * amb.f);
                });
            }
            // Luna: halo que respira.
            function luna(c, col) {
                var h1 = halo(c.x, c.y, c.r * 2.1, col), h2 = halo(c.x, c.y, c.r * 1.5, col);
                amb.upd.push(function (t) {
                    h1.setAlpha((0.35 + 0.2 * Math.sin(t / 1400)) * amb.f); h1.setScale(h1.base * (1 + 0.05 * Math.sin(t / 1700)));
                    h2.setAlpha((0.2 + 0.12 * Math.sin(t / 1000 + 2)) * amb.f);
                });
            }
            // Estrella de cuatro puntas que titila.
            function brillo(x, y, r, col, i, vel) {
                var s = A(self.add.star(u(x), v(y), 4, r * 0.3 * k, r * k, col, 1).setDepth(D).setBlendMode(ADD).setAlpha(0));
                var f0 = ph(i), vl = vel || 700 + (i * 137) % 600;
                amb.upd.push(function (t) { var q = Math.max(0, Math.sin(t / vl + f0)); q = q * q * q; s.setAlpha(q * amb.f); s.setScale(0.4 + 0.8 * q); s.rotation = t / 3000; });
            }
            // Cosas que caen y se mecen (hojas, pétalos, nieve). zona en unidades del dibujo.
            function caer(n, z, forma, vy, bal, giro) {
                for (var i = 0; i < n; i++) (function (i) {
                    var o = A(forma(i).setDepth(D)), e = { x: azar(z.x0, z.x1), y: azar(z.y0, z.y1), vy: azar(vy[0], vy[1]), f: ph(i), b: azar(bal * 0.6, bal) };
                    amb.upd.push(function (t, dt) {
                        e.y += e.vy * dt / 1000;
                        if (e.y > z.y1) { e.y = z.ys != null ? z.ys + azar(0, 40) : z.y0; e.x = azar(z.x0, z.x1); }
                        var x = e.x + Math.sin(t / 900 + e.f) * e.b;
                        o.setPosition(u(x), v(e.y));
                        if (giro) o.rotation = Math.sin(t / 700 + e.f) * giro + e.f;
                        var borde = Math.min(1, (e.y - PAG.y0) / 30, (z.y1 - e.y) / 30, (x - PAG.x0) / 20, (PAG.x1 - x) / 20);
                        o.setAlpha(Math.max(0, borde) * amb.f * (o.alphaMax || 1));
                    });
                })(i);
            }
            var hoja = function (cols, ancho) {
                return function (i) { return self.add.ellipse(0, 0, ancho * k, ancho * 0.55 * k, cols[i % cols.length]); };
            };
            var copo = function (i) { var o = self.add.circle(0, 0, (1.4 + rg(i + 9) * 2.2) * k, 0xffffff); o.alphaMax = 0.9; return o; };
            // Mariposas del diseño que pasean por una zona.
            function mariposas(n, z) {
                for (var i = 0; i < n; i++) (function (i) {
                    var clave = 'cc_mariposa' + ((i + Math.floor(Math.random() * 5)) % 5 + 1);
                    if (!self.textures.exists(clave)) return;
                    var m = A(self.add.image(0, 0, clave).setDepth(D + 0.5));
                    var base = (34 + rg(i + 4) * 14) * k / (m.width || 160);
                    m.setScale(base);
                    var cx = azar(z.x0, z.x1), cy = azar(z.y0, z.y1), f = ph(i + 5), ax = azar(60, 150), ay = azar(25, 60), vx = azar(0.35, 0.7), vy = azar(0.6, 1.1), prev = 0;
                    amb.upd.push(function (t) {
                        var x = cx + Math.sin(t / 1000 * vx + f) * ax, y = cy + Math.sin(t / 1000 * vy + f * 2) * ay;
                        m.setPosition(u(x), v(y));
                        m.scaleX = (x >= prev ? 1 : -1) * base * (0.35 + 0.65 * Math.abs(Math.sin(t / 75 + f)));
                        prev = x;
                        m.setAlpha(amb.f);
                    });
                })(i);
            }
            // Estrella fugaz de vez en cuando.
            function fugaz(x0, x1, y0, y1) {
                var g = A(self.add.graphics().setDepth(D + 0.4).setBlendMode(ADD));
                var e = { on: false, sig: 3000 + Math.random() * 5000, t0: 0, x: 0, y: 0 };
                amb.upd.push(function (t, dt) {
                    g.clear();
                    if (!e.on) { e.sig -= dt; if (e.sig <= 0) { e.on = true; e.t0 = 0; e.x = azar(x0, x1); e.y = azar(y0, y1); } return; }
                    e.t0 += dt;
                    var q = e.t0 / 900;
                    if (q >= 1) { e.on = false; e.sig = 7000 + Math.random() * 6000; return; }
                    var hx = e.x + q * 330, hy = e.y + q * 150;
                    for (var i = 0; i < 9; i++) {
                        var a = (1 - i / 9) * (1 - q) * amb.f;
                        g.fillStyle(0xffffff, a);
                        g.fillCircle(u(hx - i * 11), v(hy - i * 5), (3.2 - i * 0.25) * k);
                    }
                });
            }

            if (tema === 'pradera') {
                sol(SOL, 0xfff1b0);
                caer(10, { x0: 760, x1: 1040, y0: 170, y1: 600, ys: 160 }, hoja([0xffffff, 0xffc9d9, 0xfff0f5], 9), [18, 34], 26, 0.8);
                mariposas(2, { x0: 300, x1: 620, y0: 440, y1: 560 });
            } else if (tema === 'fiesta') {
                sol(SOL, 0xfff1b0);
                mariposas(3, { x0: 700, x1: 1000, y0: 470, y1: 580 });
                for (var b = 0; b < 8; b++) brillo(240 + rg(b + 40) * 800, 150 + rg(b + 50) * 70, 7, 0xfff3b0, b, 900);
            } else if (tema === 'mar') {
                sol(SOL_MAR, 0xffd36b);
                for (var w = 0; w < 18; w++) brillo(230 + rg(w + 7) * 830, 470 + rg(w + 21) * 160, 5 + rg(w) * 5, 0xffffff, w, 620 + (w * 90) % 500);
            } else if (tema === 'espacio') {
                sol(SOL, 0xffe9b0);
                caer(16, { x0: 720, x1: 1060, y0: 170, y1: 610, ys: 150 }, hoja([0xe8590c, 0xf08c00, 0xc92a2a, 0xd9a441, 0x9c5a1c], 11), [26, 52], 42, 1.2);
                caer(8, { x0: 220, x1: 560, y0: 330, y1: 610, ys: 300 }, hoja([0xe8590c, 0xf08c00, 0xd9a441], 10), [20, 40], 30, 1.2);
            } else if (tema === 'desierto') {
                luna(LUNA4, 0xcfe0ff);
                for (var s4 = 0; s4 < 18; s4++) {
                    var sx4 = 215 + rg(s4 + 3) * 740, sy4 = 130 + rg(s4 + 30) * 90;
                    if (Math.abs(sx4 - LUNA4.x) < 110 && Math.abs(sy4 - LUNA4.y) < 150) { sx4 += 260; }
                    brillo(Math.min(sx4, 960), sy4, 5 + rg(s4) * 3, 0xffffff, s4);
                }
                fugaz(260, 480, 140, 200);
            } else if (tema === 'nieve') {
                sol(SOL, 0xffffff);
                caer(48, { x0: 195, x1: 1085, y0: 125, y1: 640, ys: 110 }, copo, [28, 62], 22, 0);
            } else if (tema === 'selva') {
                // Rayos de sol entre las palmeras.
                [[300, 70], [560, 90], [820, 70]].forEach(function (r, i) {
                    var g = A(self.add.graphics().setDepth(D).setBlendMode(ADD));
                    g.fillStyle(0xfffbd0, 1);
                    g.fillTriangle(u(r[0]), v(126), u(r[0] + r[1]), v(126), u(r[0] - 110 + r[1] * 0.7), v(470));
                    g.fillTriangle(u(r[0] + r[1]), v(126), u(r[0] - 110 + r[1] * 0.7), v(470), u(r[0] - 110 - r[1] * 0.4), v(470));
                    amb.upd.push(function (t) { g.setAlpha((0.1 + 0.07 * Math.sin(t / 1800 + i * 2)) * amb.f); g.x = Math.sin(t / 4000 + i) * 8 * k; });
                });
                mariposas(3, { x0: 280, x1: 900, y0: 400, y1: 540 });
                caer(6, { x0: 260, x1: 1000, y0: 170, y1: 560, ys: 150 }, hoja([0x51cf66, 0x2f9e44, 0x94d82d], 12), [20, 36], 30, 1.1);
            } else if (tema === 'ciudad') {
                luna(LUNA8, 0xfff0a0);
                ESTRELLAS8.forEach(function (e, i) { brillo(e[0], e[1], 5 + rg(i) * 3, 0xffffff, i); });
                fugaz(520, 760, 135, 190);
                VENTANAS8.forEach(function (w, i) {
                    var oscuro = A(self.add.rectangle(u(w[0]), v(w[1]), (w[2] + 2) * k, (w[3] + 2) * k, 0x0a0b16, 1).setDepth(D).setAlpha(0));
                    var luz = A(self.add.rectangle(u(w[0]), v(w[1]), (w[2] + 6) * k, (w[3] + 6) * k, 0xffd36b, 1).setDepth(D).setBlendMode(ADD).setAlpha(0));
                    var e = { off: false, sig: azar(1500, 9000), a: 0 };
                    amb.upd.push(function (t, dt) {
                        e.sig -= dt;
                        if (e.sig <= 0) { e.off = !e.off; e.sig = e.off ? azar(1400, 3000) : azar(6000, 13000); }
                        e.a += ((e.off ? 1 : 0) - e.a) * Math.min(1, dt / 160);
                        oscuro.setAlpha(e.a * amb.f);
                        luz.setAlpha((1 - e.a) * (0.05 + 0.05 * Math.sin(t / 800 + i)) * amb.f);
                    });
                });
            }
        },

        /* ── Cinta de progreso: una marca por sonido ── */

        posRib: function (i, n) {
            var L = this.L, ancho = n * 70;
            return { x: L.rib.x - ancho / 2 + 35 + i * 70, y: L.rib.y };
        },

        dibujarCinta: function () {
            var g = this.cintaG, n = this.ranuras.length;
            if (!g || !g.active) return;
            g.clear();
            if (!n) return;
            var p0 = this.posRib(0, n), pN = this.posRib(n - 1, n);
            g.fillStyle(0x000000, 0.3); g.fillRoundedRect(p0.x - 44 + 3, p0.y - 34 + 6, pN.x - p0.x + 88, 68, 16);
            g.fillStyle(0x7b2d26, 1); g.fillRoundedRect(p0.x - 44, p0.y - 34, pN.x - p0.x + 88, 68, 16);
            g.lineStyle(3, this.rondaDos ? 0xffd43b : 0xd4a24c, 1); g.strokeRoundedRect(p0.x - 44, p0.y - 34, pN.x - p0.x + 88, 68, 16);
            for (var i = 0; i < n; i++) {
                var p = this.posRib(i, n), on = this.lampOn === i, lleno = !!this.ranuras[i];
                g.fillStyle(on ? 0xfff3bf : lleno ? 0xe6f9d4 : 0xf3ead2, 1); g.fillRoundedRect(p.x - 27, p.y - 27, 54, 54, 10);
                g.lineStyle(3, on ? 0xffd43b : lleno ? 0x69db7c : 0xc9b88e, 1); g.strokeRoundedRect(p.x - 27, p.y - 27, 54, 54, 10);
                if (on) { g.fillStyle(0xffd43b, 0.35); g.fillCircle(p.x, p.y, 36); g.fillStyle(0xffd43b, 1); g.fillCircle(p.x, p.y, 9); }
            }
        },

        redibujarMiniaturas: function () {
            var n = this.ranuras.length;
            this.miniaturas.forEach(function (m, i) { if (m && m.active) { var p = this.posRib(i, n); m.setPosition(p.x, p.y); } }, this);
        },
        limpiarMiniaturas: function () { this.miniaturas.forEach(function (m) { if (m && m.active) m.destroy(); }); this.miniaturas = []; },

        /* ── Ventanitas con lengüeta ── */

        geom: function (n) {
            var L = this.L, B = L.libro, ancho = B.w - 80, sp = ancho / n;
            var w = Math.min(190, sp * 0.82, B.h * 0.34);
            return { sp: sp, w: w, h: w * 0.95, recorrido: Math.max(70, w * 0.62) };
        },

        crearFigura: function (id, w, col) {
            var self = this, t = w * 0.84;
            var c = this.add.container(0, 0).setDepth(19).setVisible(false);
            var stand = this.add.graphics();
            var carta = this.add.graphics();
            carta.fillStyle(0x000000, 0.28); carta.fillRoundedRect(-t / 2 + 4, -t / 2 + 7, t, t, 16);
            carta.fillStyle(col, 1); carta.fillRoundedRect(-t / 2, -t / 2, t, t, 16);
            carta.fillStyle(0xffffff, 1); carta.fillRoundedRect(-t / 2 + 6, -t / 2 + 6, t - 12, t - 12, 12);
            carta.fillStyle(col, 0.14); carta.fillRoundedRect(-t / 2 + 6, -t / 2 + 6, t - 12, t - 12, 12);
            carta.lineStyle(1.5, 0x000000, 0.12); carta.lineBetween(-t / 2 + 6, 0, t / 2 - 6, 0);
            var img = this.add.image(0, 0, 'el_' + id);
            img.setScale(t * 0.7 / Math.max(img.width, img.height));
            c.add([stand, carta, img]);
            c.stand = stand; c.img = img; c.t = t;
            return c;
        },

        crearSlots: function (ids, animar) {
            var self = this, L = this.L, B = L.libro, n = ids.length, g = this.geom(n);
            var todas = (this.nv && this.nv.opciones) || ids;
            this.slots.forEach(function (s) { s.destruir(); });
            this.slots = ids.map(function (id, i) {
                var cx = B.x0 + 40 + g.sp * (i + 0.5), cy = L.ventY;
                var col = COLORES[Math.max(0, todas.indexOf(id)) % 6];
                var anillo = self.add.container(cx, cy + g.h / 2 + 40).setDepth(22);
                var s = { id: id, i: i, cx: cx, cy: cy, w: g.w, h: g.h, rec: g.recorrido, col: col, p: 0, reb: 0, vis: animar ? 0 : 1, hecha: false, fig: self.crearFigura(id, g.w, col), cont: anillo, tam: g.w * 0.9, bob: i * 1.3 };
                s.destruir = function () { if (s.fig && s.fig.active) s.fig.destroy(); if (anillo.active) anillo.destroy(); };
                return s;
            });
            if (animar) this.slots.forEach(function (s, i) { self.tweens.add({ targets: s, vis: 1, duration: 380, delay: i * 90, ease: 'Back.easeOut' }); });
            K.ruido({ f: 1100, q: 1, dur: 0.1, vol: 0.05 });
        },

        ubicarSlots: function () {
            var L = this.L, B = L.libro, n = this.slots.length;
            if (!n) return;
            var g = this.geom(n);
            this.slots.forEach(function (s, i) { s.cx = B.x0 + 40 + g.sp * (i + 0.5); s.cy = L.ventY; s.w = g.w; s.h = g.h; s.rec = g.recorrido; });
        },

        anilloY: function (s) { return s.cy + s.h / 2 + 40 + s.p * s.rec; },

        mostrarOpciones: async function (nv) {
            this.crearSlots(nv.opciones.slice(), true);
            await esperar(this, 700);
        },

        prepararNivel: async function (i, nv) {
            var self = this;
            await this.cerrarYQuitar();
            this.limpiarMiniaturas();
            this.rondaDos = false;
            this.ranuras = nv.reproducciones[0].map(function () { return null; });
            this.dibujarCinta();
            var tema = TEMAS[(i < 0 ? 0 : i) % 4][0];
            if (this.temaActual !== tema) { if (i > 0) await this.voltear(tema); else this.ponerTema(tema); }
        },

        /** Cierra las ventanitas abiertas y las hunde (para empezar otra ronda o nivel). */
        cerrarYQuitar: async function () {
            var self = this;
            if (!this.slots.length) return;
            await Promise.all(this.slots.map(function (s, i) { return esperar(self, i * 50).then(function () { return tw(self, { targets: s, p: 0, duration: 220 }); }); }));
            await Promise.all(this.slots.map(function (s, i) { return esperar(self, i * 40).then(function () { return tw(self, { targets: s, vis: 0, duration: 260, ease: 'Quad.easeIn' }); }); }));
            this.slots.forEach(function (s) { s.destruir(); });
            this.slots = [];
        },

        alSonar: function (id, k) {
            var B = this.L.libro, self = this;
            this.lampOn = k;
            this.dibujarCinta();
            K.tono({ f: 640 + k * 80, dur: 0.05, vol: 0.03 });
            Ut.estallido(this, B.xm + (Math.random() - 0.5) * B.w * 0.5, B.y0 + B.h * 0.45, { n: 3, tex: 'nota', tam: 24, dist: 90, depth: 40, sinTinte: false });
            this.time.delayedCall(430, function () { self.lampOn = -1; self.dibujarCinta(); });
        },

        /* ── Tirar de las lengüetas ── */

        alTocar: function (p) {
            if (this.fase !== 'jugar' || this.ocupado || this.arr) return;
            var self = this;
            var s = this.slots.filter(function (q) {
                if (q.hecha || q.p > 0.02 || q.vis < 0.9) return false;
                var ry = self.anilloY(q);
                return Math.abs(p.x - q.cx) < 48 && p.y > q.cy + q.h / 2 - 8 && p.y < ry + 50;
            }).sort(function (a, b) { return Math.abs(a.cx - p.x) - Math.abs(b.cx - p.x); })[0];
            if (!s) return;
            this.pista.reiniciar();
            this.arr = { s: s, off: p.y - this.anilloY(s), tick: 0 };
            K.tono({ f: 520, dur: 0.04, vol: 0.04 });
        },

        alMover: function (p) {
            if (!this.arr || !p.isDown) return;
            var a = this.arr, s = a.s;
            var nuevo = Math.max(0, Math.min(1, (p.y - a.off - (s.cy + s.h / 2 + 40)) / s.rec));
            s.p = nuevo;
            if (Math.floor(nuevo * 6) !== a.tick) { a.tick = Math.floor(nuevo * 6); K.tono({ f: 300 + nuevo * 520, dur: 0.03, vol: 0.03 }); }
        },

        alSoltar: async function () {
            if (!this.arr) return;
            var s = this.arr.s;
            this.arr = null;
            if (s.p >= UMBRAL) await this.completar(s);
            else await tw(this, { targets: s, p: 0, duration: 240, ease: 'Back.easeOut' });
        },

        /** La lengüeta llegó al final: se abre del todo, sale la figura y se valida. */
        completar: async function (s) {
            if (this.ocupado) return;
            this.ocupado = true;
            await tw(this, { targets: s, p: 1, duration: 130 });
            K.ruido({ f: 1500, q: 0.8, dur: 0.16, vol: 0.07 });
            K.tono({ f: 520, f2: 900, dur: 0.12, vol: 0.05, tipo: 'triangle' });
            s.reb = -0.14;
            this.tweens.add({ targets: s, reb: 0, duration: 520, ease: 'Elastic.easeOut' });
            this.tocado = s;
            try { await this.marcar(s.id, { x: s.cx, y: s.cy - s.h * 0.7 }); }
            finally { this.ocupado = false; }
        },

        alMarcar: async function (id, k) {
            var s = this.tocado, n = this.ranuras.length;
            s.hecha = true;
            this.ranuras[k] = id;
            this.dibujarCinta();
            var p = this.posRib(k, n);
            var m = this.add.image(s.cx, s.cy - s.h * 0.75, 'el_' + id).setDepth(16);
            var esc = 44 / Math.max(m.width, m.height);
            m.setScale(esc * 1.7);
            this.miniaturas[k] = m;
            Ut.estallido(this, s.cx, s.cy - s.h * 0.75, { n: 7, tex: 'chispa', tam: 20, dist: 90, depth: 70, colores: [s.col, 0xffffff] });
            await tw(this, { targets: m, x: p.x, y: p.y, scale: esc, duration: 420, ease: 'Cubic.easeOut' });
        },

        alFallar: async function () {
            var s = this.tocado;
            this.cameras.main.shake(180, 0.004);
            K.tono({ f: 300, f2: 160, dur: 0.25, vol: 0.05 });
            if (s && s.fig && s.fig.active) await tw(this, { targets: s.fig, angle: { from: -9, to: 9 }, duration: 70, yoyo: true, repeat: 3, onComplete: function () { s.fig.angle = 0; } });
        },

        alReiniciar: async function () {
            var self = this;
            this.limpiarMiniaturas();
            this.ranuras = this.ranuras.map(function () { return null; });
            this.dibujarCinta();
            K.ruido({ f: 700, q: 0.6, dur: 0.25, vol: 0.06 });
            await Promise.all(this.slots.map(function (s, i) { s.hecha = false; return esperar(self, i * 45).then(function () { return tw(self, { targets: s, p: 0, duration: 260, ease: 'Quad.easeIn' }); }); }));
        },

        alAcertar: async function () {
            var nv = this.nv, cambia = !!nv.segunda, self = this;
            for (var k = 0; k < nv.correctas.length; k++) {
                if (!this.sigue()) return;
                this.reunidos.push(nv.correctas[k]);
                var s = this.slots.filter(function (q) { return q.id === nv.correctas[k]; })[0];
                if (s && s.fig.active) this.tweens.add({ targets: s.fig, scale: { from: 1.18, to: 1 }, duration: 320 });
                await this.sonar(nv.correctas[k], { breve: true, bocina: false });
                await esperar(this, 80);
            }
            if (!cambia) { Ut.confeti(this, 50); await esperar(this, 500); }
        },

        /** ¡Se pasa la página!: se cierran las ventanitas, se voltea la hoja y vuelven en otro orden. */
        alCambioSecuencia: async function () {
            var nv = this.nv, self = this;
            this.rondaDos = true;
            this.limpiarMiniaturas();
            this.ranuras = this.ranuras.map(function () { return null; });
            this.dibujarCinta();
            K.tono({ f: 500, f2: 1000, dur: 0.35, vol: 0.06, tipo: 'triangle' });
            await this.cerrarYQuitar();
            var nivel = this.nivelActual < 0 ? 0 : this.nivelActual;
            await this.voltear(TEMAS[nivel % 4][1]);
            var orden = mezclar((nv.opciones || []).slice());
            this.crearSlots(orden, true);
            await esperar(this, 650);
        },

        alTerminarNivel: async function () {
            await this.cerrarYQuitar();
            this.limpiarMiniaturas();
            this.ranuras = [];
            this.dibujarCinta();
        },

        /* ── Ayuda y demostración ── */

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            var resp = this.respuestas();
            var s = this.slots.filter(function (q) { return !q.hecha && q.p < 0.05 && resp.indexOf(q.id) >= 0; })[0];
            this.pulsoHint = this.time.now;
            if (!s || !this.ayuda) {
                if (this.bocina) this.tweens.add({ targets: this.bocina, scale: 1.18, duration: 220, yoyo: true, repeat: 2 });
                return esperar(this, 900);
            }
            return this.ctx.mano({ punto: { x: s.cx, y: this.anilloY(s) }, holdMs: 300, arrastre: { dx: 0, dy: s.rec, durMs: 900 }, cancelado: function () { return cancelada() || self.fase !== 'jugar' || !!self.arr; } });
        },

        demoPaso: function () {
            var self = this;
            return this.nv.correctas.map(function (id) {
                return function () {
                    var s = self.slots.filter(function (q) { return q.id === id; })[0];
                    if (!s) return null;
                    return {
                        desde: { x: s.cx, y: self.anilloY(s) }, hasta: { x: s.cx, y: self.anilloY(s) + s.rec }, mantener: 300,
                        hacer: function () { return self.completar(s); }
                    };
                };
            });
        },

        /* ── Final: la última página, de fiesta ── */

        escenaFinal: async function () {
            var self = this, L = this.L, B = L.libro;
            await this.cerrarYQuitar();
            this.limpiarMiniaturas(); this.ranuras = []; this.dibujarCinta();
            if (this.temaActual !== 'fiesta') await this.voltear('fiesta');
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; }).slice(0, 6);
            if (!ids.length) ids = ['perro', 'campana', 'pajaro'];
            this.nv = { opciones: ids.slice() };
            this.crearSlots(ids, true);
            await esperar(this, 500);
            this.fiesta = 1;
            for (var i = 0; i < this.slots.length; i++) {
                var s = this.slots[i];
                s.hecha = true;
                K.ruido({ f: 1500, q: 0.8, dur: 0.14, vol: 0.06 });
                s.reb = -0.16;
                this.tweens.add({ targets: s, p: 1, duration: 260 });
                this.tweens.add({ targets: s, reb: 0, duration: 520, ease: 'Elastic.easeOut', delay: 200 });
                await esperar(this, 160);
            }
            await esperar(this, 400);
            for (var r = 0; r < 2; r++) for (var j = 0; j < this.slots.length; j++) {
                if (!this.sigue()) return;
                var q = this.slots[j];
                this.tweens.add({ targets: q.fig, scale: { from: 1.25, to: 1 }, duration: 300 });
                Ut.estallido(this, q.cx, q.cy - q.h * 0.75, { n: 8, tex: 'estrella', tam: 24, dist: 110, depth: 70, sinTinte: true });
                await this.sonar(ids[j], { breve: true, bocina: false });
            }
            Ut.confeti(this, 120);
            await esperar(this, 1400);
        },

        estadoExtra: function () {
            return {
                tema: this.temaActual, rondaDos: this.rondaDos, ranuras: this.ranuras.slice(),
                slots: this.slots.map(function (s) { return { id: s.id, x: Math.round(s.cx), y: Math.round(s.cy), p: +s.p.toFixed(2), hecha: !!s.hecha }; })
            };
        },

        /* ── Cada cuadro ── */

        paso: function (time, delta) {
            var L = this.L, self = this;
            if (this.amb && this.amb.upd.length && !document.body.classList.contains('sin-animaciones')) {
                var dt = Math.min(50, delta || 16), am = this.amb;
                am.f = Math.min(1, am.f + dt / 700);
                for (var ai = 0; ai < am.upd.length; ai++) am.upd[ai](time, dt);
            }
            if (!L || !this.frenteG || !this.frenteG.active) return;
            var f = this.fondoSlotG, g = this.frenteG;
            f.clear(); g.clear();
            this.slots.forEach(function (s) {
                if (!s.fig || !s.fig.active) return;
                var a = Math.max(0, Math.min(1, s.vis)), yo = (1 - s.vis) * 70;
                var cx = s.cx, cy = s.cy + yo, w = s.w, h = s.h, col = s.col;
                s.cont.setPosition(cx, self.anilloY(s) + yo);
                // Ventanita: fondo (bolsillo) y sombra.
                f.fillStyle(0x000000, 0.28 * a); f.fillRoundedRect(cx - w / 2 + 4, cy - h / 2 + 8, w, h, 16);
                f.fillStyle(0x2a1f3d, a); f.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, { tl: 18, tr: 18, bl: 10, br: 10 });
                // Figura: sale por detrás del labio.
                var q = Math.max(0, Math.min(1, s.p)), yf = cy + h * (0.12 - 1.02 * q + s.reb) + Math.sin(time / 500 + s.bob) * (q > 0.95 ? 3 : 0);
                s.fig.setVisible(a > 0.05 && q > 0.02);
                s.fig.setPosition(cx, yf);
                var largo = Math.max(0, cy + h * 0.45 - (yf + s.fig.t / 2));
                s.fig.stand.clear();
                for (var z = 0; z < 7; z++) { var y0 = s.fig.t / 2 + z * largo / 7; s.fig.stand.fillStyle(z % 2 ? 0xe3cfa8 : 0xf3e4c3, 1); s.fig.stand.fillRect(-s.fig.t * 0.22, y0, s.fig.t * 0.44, largo / 7 + 1); }
                // Frente: labio inferior, postigos y marco.
                g.fillStyle(col, a); g.fillRoundedRect(cx - w / 2, cy + h * 0.04, w, h * 0.46, { tl: 0, tr: 0, bl: 10, br: 10 });
                g.fillStyle(0xffffff, 0.22 * a); g.fillRect(cx - w / 2 + 4, cy + h * 0.06, w - 8, 5);
                var sw = (w / 2) * (1 - Math.min(1, q * 1.3));
                if (sw > 0.5) {
                    var cl = Phaser.Display.Color.ValueToColor(col).lighten(18).color;
                    g.fillStyle(cl, a); g.fillRoundedRect(cx - w / 2, cy - h / 2, sw, h * 0.56, { tl: 18, tr: 0, bl: 0, br: 0 }); g.fillRoundedRect(cx + w / 2 - sw, cy - h / 2, sw, h * 0.56, { tl: 0, tr: 18, bl: 0, br: 0 });
                    g.lineStyle(2, 0x000000, 0.18 * a); for (var r = 1; r < 4; r++) { var yy = cy - h / 2 + r * h * 0.14; g.lineBetween(cx - w / 2 + 6, yy, cx - w / 2 + sw - 4, yy); g.lineBetween(cx + w / 2 - sw + 4, yy, cx + w / 2 - 6, yy); }
                    g.fillStyle(0xfff3bf, a); g.fillCircle(cx - 8 + (sw < w / 2 - 2 ? 0 : 0), cy + h * 0.1 - h * 0.05, 0);
                }
                g.lineStyle(5, 0xfff7e0, a); g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 14);
                // Lengüeta y argolla.
                var ry = self.anilloY(s) + yo;
                g.fillStyle(0xffd43b, a); g.fillRect(cx - 10, cy + h / 2 - 2, 20, ry - (cy + h / 2) + 2);
                g.lineStyle(2, 0xb8860b, a); g.lineBetween(cx - 10, cy + h / 2, cx - 10, ry); g.lineBetween(cx + 10, cy + h / 2, cx + 10, ry);
                if (!s.hecha || s.p < 0.95) {
                    var libre = !s.hecha && self.fase === 'jugar' && s.p < 0.05;
                    var puls = libre ? 1 + 0.08 * Math.sin(time / 260 + s.bob) : 1;
                    g.lineStyle(12 * puls, 0xb8860b, a); g.strokeCircle(cx, ry + 6, 19 * puls);
                    g.lineStyle(7 * puls, 0xffe066, a); g.strokeCircle(cx, ry + 6, 19 * puls);
                    if (libre) { var bob = Math.sin(time / 300 + s.bob) * 3; g.fillStyle(0x7b2d26, a); g.fillTriangle(cx - 8, ry + 2 + bob, cx + 8, ry + 2 + bob, cx, ry + 14 + bob); }
                    if (self.pulsoHint && time - self.pulsoHint < 900 && libre && self.ayuda && self.respuestas().indexOf(s.id) >= 0) { g.lineStyle(5, 0xffffff, 0.8 * (1 - (time - self.pulsoHint) / 900)); g.strokeCircle(cx, ry + 6, 30 + (time - self.pulsoHint) / 30); }
                }
            });
        }
    };

    K.crear({ id: 'libro', fondo: '#5a3319', escena: escena });
})(typeof window !== 'undefined' ? window : this);
