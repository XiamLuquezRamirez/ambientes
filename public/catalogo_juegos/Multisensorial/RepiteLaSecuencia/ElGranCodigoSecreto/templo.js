/**
 * «El templo sumergido» — motor propio de El Gran Código Secreto (5-6 años).
 *
 * En el fondo del mar hay un templo antiguo con una gran puerta de piedra. En el friso del templo
 * hay un engaste por cada sonido del código. Mientras suena el código los engastes se iluminan de
 * izquierda a derecha (cuentan cuántos son, sin decir cuáles). Después las gemas-burbuja, cada una
 * con un sonido, flotan sobre la arena y el niño las ARRASTRA al templo en el mismo orden en que
 * sonaron: cada gema encaja con un destello. Si pone una equivocada, las gemas salen disparadas de
 * sus engastes como burbujas y el código suena otra vez, sin daño. Al completar el código la puerta
 * se abre con un retumbo y la luz dorada del tesoro llena el agua. Cada nivel baja más hondo:
 * arrecife, bosque de algas, aguas profundas y abismo luminoso. Final: el templo entero se ilumina,
 * suena la melodía y pasa un desfile de criaturas marinas.
 */
(function (global) {
    'use strict';

    // Todos los personajes 3D de este juego (presentador, tutorial, diálogos y final) llevan careta de buceo.
    global.PedniaAccesorioPj = 'careta';
    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var C = Phaser.Display.Color;

    var COLORES = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xcc5de8, 0xff922b, 0x20c997];

    var PAL = [
        { a: 0x3fd0f0, b: 0x0a6fb0, luz: 0xbff6ff, arena: 0xead7a0, arena2: 0xd9c283, piedra: 0xd8cfb0, lejos: 0x2f95c4, rayos: 0.17, musgo: 0x4caf50 },
        { a: 0x35c9a5, b: 0x0a5c66, luz: 0xc8ffe8, arena: 0xcdb97a, arena2: 0xb9a566, piedra: 0xbfc9a8, lejos: 0x278076, rayos: 0.15, musgo: 0x2e9e3a, tortuga: 1 },
        { a: 0x2a6fd0, b: 0x091a58, luz: 0x9fc4ff, arena: 0x8c93a5, arena2: 0x767d90, piedra: 0xa8b6d2, lejos: 0x1a3f8a, rayos: 0.12, musgo: 0x2f8f6a, medusas: 1 },
        { a: 0x5b3bb0, b: 0x0f0731, luz: 0xcdb4ff, arena: 0x5e5784, arena2: 0x4d466f, piedra: 0x8f88bd, lejos: 0x2a1a66, rayos: 0.10, musgo: 0x3a9b8e, medusas: 1, ballena: 1 }
    ];

    function cs(n, a) { var c = C.ValueToColor(n); return a == null ? 'rgb(' + c.red + ',' + c.green + ',' + c.blue + ')' : 'rgba(' + c.red + ',' + c.green + ',' + c.blue + ',' + a + ')'; }
    function mez(a, b, t) { var c = C.Interpolate.ColorWithColor(C.ValueToColor(a), C.ValueToColor(b), 100, Math.max(0, Math.min(1, t)) * 100); return C.GetColor(c.r, c.g, c.b); }
    function rg(i) { var x = Math.sin(i * 127.1 + 11.7) * 43758.5453; return x - Math.floor(x); }

    /* ── Pintores Canvas ── */

    function coral(c, x, y, s, col, prof) {
        c.strokeStyle = col; c.lineCap = 'round';
        (function rama(px, py, ang, largo, grosor, d) {
            if (d > (prof || 4) || largo < 4) return;
            var nx = px + Math.cos(ang) * largo, ny = py + Math.sin(ang) * largo;
            c.lineWidth = grosor; c.beginPath(); c.moveTo(px, py); c.lineTo(nx, ny); c.stroke();
            rama(nx, ny, ang - 0.5 - rg(d + x) * 0.3, largo * 0.72, grosor * 0.7, d + 1);
            rama(nx, ny, ang + 0.5 + rg(d + y) * 0.3, largo * 0.72, grosor * 0.7, d + 1);
        })(x, y, -Math.PI / 2, 34 * s, 9 * s, 0);
    }
    function abanico(c, x, y, s, col) {
        c.save(); c.translate(x, y); c.fillStyle = col; c.globalAlpha = 0.9; c.beginPath(); c.moveTo(0, 0);
        for (var i = 0; i <= 12; i++) { var a = -Math.PI + (i / 12) * Math.PI; c.lineTo(Math.cos(a) * 46 * s, Math.sin(a) * 52 * s - 6 * s); }
        c.closePath(); c.fill(); c.globalAlpha = 0.35; c.strokeStyle = '#fff'; c.lineWidth = 1.5;
        for (var k = 1; k < 8; k++) { var a2 = -Math.PI + (k / 8) * Math.PI; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a2) * 44 * s, Math.sin(a2) * 50 * s - 6 * s); c.stroke(); }
        c.restore();
    }
    function cerebro(c, x, y, r, col) { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, Math.PI, 0); c.fill(); c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 2; for (var i = 1; i < 4; i++) { c.beginPath(); c.arc(x, y, r * i / 4, Math.PI, 0); c.stroke(); } }
    function estrellaMar(c, x, y, r, col) { c.fillStyle = col; c.beginPath(); for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.closePath(); c.fill(); }
    function concha(c, x, y, r, col) { c.fillStyle = col; c.beginPath(); c.moveTo(x, y); for (var i = 0; i <= 8; i++) { var a = -Math.PI + i * Math.PI / 8; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.9); } c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,.2)'; c.lineWidth = 1.2; for (var k = 1; k < 8; k++) { var a2 = -Math.PI + k * Math.PI / 8; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a2) * r, y + Math.sin(a2) * r * 0.9); c.stroke(); } }

    /** Escalón, columnas, friso con engastes, frontón y arco de la puerta. */
    function pintarTemplo(c, G, P, n) {
        var piedra = cs(P.piedra), osc = cs(mez(P.piedra, 0x000000, 0.35)), clar = cs(mez(P.piedra, 0xffffff, 0.3));
        var tx = G.tx, Wt = G.Wt, base = G.base;
        // Escalinata.
        for (var s = 0; s < 3; s++) { var w = Wt + 60 - s * 28, y = base - (s + 1) * 14; c.fillStyle = s % 2 ? osc : piedra; c.fillRect(tx - w / 2, y, w, 14); c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(tx - w / 2, y, w, 3); }
        var yCol = G.friso1, yTop = base - 42;
        // Columnas.
        var xs = [-Wt / 2 + 34, -Wt / 2 + 34 + (Wt - 68) / 3, Wt / 2 - 34 - (Wt - 68) / 3, Wt / 2 - 34];
        xs.forEach(function (dx, i) {
            var x = tx + dx, w = 44;
            var g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, osc); g.addColorStop(0.4, clar); g.addColorStop(1, osc);
            c.fillStyle = g; c.fillRect(x - w / 2, yCol, w, yTop - yCol);
            c.strokeStyle = 'rgba(0,0,0,.22)'; c.lineWidth = 2; for (var f = -1; f <= 1; f++) { c.beginPath(); c.moveTo(x + f * 11, yCol); c.lineTo(x + f * 11, yTop); c.stroke(); }
            c.fillStyle = piedra; c.fillRect(x - w / 2 - 6, yCol, w + 12, 12); c.fillRect(x - w / 2 - 6, yTop - 12, w + 12, 12);
        });
        // Puerta (hueco oscuro con arco).
        var D = G.puerta;
        c.fillStyle = osc; c.beginPath(); c.moveTo(D.x0 - 12, D.yBot); c.lineTo(D.x0 - 12, D.yTop + 46); c.quadraticCurveTo(D.x0 - 12, D.yTop - 14, tx, D.yTop - 14); c.quadraticCurveTo(D.x1 + 12, D.yTop - 14, D.x1 + 12, D.yTop + 46); c.lineTo(D.x1 + 12, D.yBot); c.closePath(); c.fill();
        c.fillStyle = '#0c1a2a'; c.beginPath(); c.moveTo(D.x0, D.yBot); c.lineTo(D.x0, D.yTop + 46); c.quadraticCurveTo(D.x0, D.yTop, tx, D.yTop); c.quadraticCurveTo(D.x1, D.yTop, D.x1, D.yTop + 46); c.lineTo(D.x1, D.yBot); c.closePath(); c.fill();
        // Friso (banda de piedra) con los engastes.
        var fy0 = G.friso0, fy1 = G.friso1;
        var gf = c.createLinearGradient(0, fy0, 0, fy1); gf.addColorStop(0, clar); gf.addColorStop(1, piedra);
        c.fillStyle = gf; c.fillRect(tx - Wt / 2 - 6, fy0, Wt + 12, fy1 - fy0);
        c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(tx - Wt / 2 - 6, fy1 - 4, Wt + 12, 4);
        c.fillStyle = osc; var rec = G.rec; c.beginPath(); c.roundRect ? c.roundRect(rec.x0, rec.y0, rec.x1 - rec.x0, rec.y1 - rec.y0, 14) : c.rect(rec.x0, rec.y0, rec.x1 - rec.x0, rec.y1 - rec.y0); c.fill();
        c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 2; c.stroke();
        for (var k = 0; k < n; k++) {
            var p = G.pos(k);
            c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.arc(p.x + 2, p.y + 3, G.r + 6, 0, 6.2832); c.fill();
            c.fillStyle = cs(mez(P.piedra, 0x000000, 0.15)); c.beginPath(); for (var h = 0; h < 6; h++) { var a = Math.PI / 6 + h * Math.PI / 3; c.lineTo(p.x + Math.cos(a) * (G.r + 6), p.y + Math.sin(a) * (G.r + 6)); } c.closePath(); c.fill();
            c.fillStyle = '#10243a'; c.beginPath(); c.arc(p.x, p.y, G.r - 2, 0, 6.2832); c.fill();
            c.strokeStyle = 'rgba(120,230,255,.45)'; c.lineWidth = 2.5; c.beginPath(); c.arc(p.x, p.y, G.r - 8, 0, 6.2832); c.stroke();
        }
        // Frontón con relieve de olas y sol.
        var pe = G.pico, gx0 = tx - Wt / 2 - 14, gx1 = tx + Wt / 2 + 14;
        c.fillStyle = piedra; c.beginPath(); c.moveTo(gx0, fy0); c.lineTo(tx, pe); c.lineTo(gx1, fy0); c.closePath(); c.fill();
        c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.moveTo(gx0, fy0); c.lineTo(tx, pe); c.lineTo(tx, fy0); c.closePath(); c.fill();
        c.fillStyle = osc; c.beginPath(); c.moveTo(gx0 + 44, fy0 - 8); c.lineTo(tx, pe + 34); c.lineTo(gx1 - 44, fy0 - 8); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(255,224,130,.8)'; c.lineWidth = 4; c.beginPath(); c.arc(tx, fy0 - 28, 24, 0, 6.2832); c.stroke();
        for (var r = 0; r < 12; r++) { var ar = r * Math.PI / 6; c.beginPath(); c.moveTo(tx + Math.cos(ar) * 32, fy0 - 28 + Math.sin(ar) * 32); c.lineTo(tx + Math.cos(ar) * 44, fy0 - 28 + Math.sin(ar) * 44); c.stroke(); }
        c.strokeStyle = 'rgba(120,230,255,.6)'; c.lineWidth = 3;
        [-1, 1].forEach(function (sg) { c.beginPath(); for (var q = 0; q <= 40; q++) { var xx = tx + sg * (70 + q * 4), yy = fy0 - 14 - Math.sin(q / 3) * 6; if (!q) c.moveTo(xx, yy); else c.lineTo(xx, yy); } c.stroke(); });
        // Musgo, cracks y percebes.
        c.fillStyle = cs(P.musgo, 0.55);
        for (var m = 0; m < 70; m++) { var mx = tx - Wt / 2 + rg(m) * Wt, my = rg(m + 40) > 0.5 ? base - 14 - rg(m + 5) * 30 : fy0 + rg(m + 9) * (yTop - fy0); c.beginPath(); c.arc(mx, my, 3 + rg(m + 2) * 7, 0, 6.2832); c.fill(); }
        c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1.6;
        for (var g2 = 0; g2 < 6; g2++) { var cx2 = tx - Wt / 2 + 30 + rg(g2 + 70) * (Wt - 60), cy2 = fy1 + 20 + rg(g2 + 80) * (yTop - fy1 - 40); c.beginPath(); c.moveTo(cx2, cy2); c.lineTo(cx2 + 12, cy2 + 14); c.lineTo(cx2 + 6, cy2 + 30); c.stroke(); }
    }

    function pintarFondo(c, w, h, G, P, n, nivel) {
        var g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, cs(P.a)); g.addColorStop(1, cs(P.b)); c.fillStyle = g; c.fillRect(0, 0, w, h);
        // Superficie lejana con brillo.
        c.fillStyle = cs(P.luz, 0.28); c.beginPath(); c.moveTo(0, 0); for (var x = 0; x <= w; x += 14) c.lineTo(x, 16 + Math.sin(x / 40) * 5); c.lineTo(w, 0); c.fill();
        // Ruinas lejanas en bruma.
        c.fillStyle = cs(P.lejos, 0.55);
        for (var i = 0; i < 9; i++) { var rx = (i + 0.3) * w / 9, rh = 70 + rg(i) * 120; c.fillRect(rx, G.base - rh - 30, 20 + rg(i + 3) * 16, rh + 30); if (i % 3 === 0) { c.beginPath(); c.arc(rx + 60, G.base - 30, 40, Math.PI, 0); c.fill(); } }
        c.fillStyle = cs(P.lejos, 0.85); c.beginPath(); c.moveTo(0, G.base - 20); for (var x2 = 0; x2 <= w; x2 += 16) c.lineTo(x2, G.base - 40 - Math.sin(x2 / 120 + 1) * 30 - Math.sin(x2 / 47) * 8); c.lineTo(w, h); c.lineTo(0, h); c.fill();
        // Arena.
        var ga = c.createLinearGradient(0, G.base - 30, 0, h); ga.addColorStop(0, cs(P.arena)); ga.addColorStop(1, cs(P.arena2)); c.fillStyle = ga;
        c.beginPath(); c.moveTo(0, h); c.lineTo(0, G.base - 6); for (var x3 = 0; x3 <= w; x3 += 12) c.lineTo(x3, G.base - 6 + Math.sin(x3 / 90) * 8 + Math.sin(x3 / 33) * 2); c.lineTo(w, h); c.closePath(); c.fill();
        c.fillStyle = 'rgba(255,255,255,.12)'; for (var s = 0; s < 120; s++) c.fillRect(rg(s) * w, G.base + 14 + rg(s + 9) * (h - G.base - 20), 3, 2);
        c.fillStyle = 'rgba(0,0,0,.08)'; for (var r2 = 0; r2 < 6; r2++) { c.beginPath(); c.ellipse(rg(r2 + 20) * w, G.base + 40 + r2 * 18, 160, 5, 0, 0, 6.2832); c.fill(); }
        // Templo.
        pintarTemplo(c, G, P, n);
        // Arrecifes a los lados.
        var cols = nivel === 3 ? ['#b388ff', '#7c4dff', '#4dd0e1', '#69f0ae'] : nivel === 2 ? ['#5c9bff', '#7e57c2', '#26c6da', '#a1887f'] : ['#ff6b6b', '#ff922b', '#f783ac', '#ffd43b'];
        [[0.03, 1.5], [0.09, 1.1], [0.16, 0.8], [0.84, 0.8], [0.91, 1.15], [0.97, 1.55]].forEach(function (q, i) {
            var cx = q[0] * w, cy = G.base + 20 + (i % 2) * 12;
            if (Math.abs(cx - G.tx) < G.Wt / 2 + 30) return;
            if (i % 3 === 0) coral(c, cx, cy, q[1], cols[i % 4]); else if (i % 3 === 1) abanico(c, cx, cy, q[1], cols[(i + 1) % 4]); else cerebro(c, cx, cy, 24 * q[1], cols[(i + 2) % 4]);
        });
        for (var e = 0; e < 8; e++) { var ex = rg(e + 60) * w; if (Math.abs(ex - G.tx) < G.Wt / 2 + 30) continue; if (e % 2) estrellaMar(c, ex, G.base + 26 + rg(e) * 70, 12, e % 4 ? '#ff8f5a' : '#ffd43b'); else concha(c, ex, G.base + 30 + rg(e) * 70, 13, '#f8d7e0'); }
        var v = c.createRadialGradient(w / 2, h * 0.5, h * 0.4, w / 2, h * 0.5, w * 0.7); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,10,40,.35)'); c.fillStyle = v; c.fillRect(0, 0, w, h);
    }

    function pintarPez(c, w, h, cuerpo, aleta, raya) {
        c.save(); c.translate(w * 0.42, h / 2);
        c.fillStyle = aleta; c.beginPath(); c.moveTo(w * 0.28, 0); c.lineTo(w * 0.52, -h * 0.34); c.lineTo(w * 0.52, h * 0.34); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(-w * 0.05, -h * 0.28); c.quadraticCurveTo(w * 0.05, -h * 0.55, w * 0.16, -h * 0.26); c.closePath(); c.fill();
        var g = c.createLinearGradient(0, -h * 0.35, 0, h * 0.35); g.addColorStop(0, cuerpo); g.addColorStop(1, 'rgba(255,255,255,.9)'); c.fillStyle = cuerpo; c.beginPath(); c.ellipse(0, 0, w * 0.36, h * 0.32, 0, 0, 6.2832); c.fill();
        c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.ellipse(-w * 0.02, -h * 0.1, w * 0.28, h * 0.12, 0, 0, 6.2832); c.fill();
        c.fillStyle = raya; c.fillRect(-w * 0.06, -h * 0.3, w * 0.07, h * 0.6); c.fillRect(w * 0.12, -h * 0.25, w * 0.05, h * 0.5);
        c.fillStyle = '#fff'; c.beginPath(); c.arc(-w * 0.22, -h * 0.06, h * 0.1, 0, 6.2832); c.fill(); c.fillStyle = '#10243a'; c.beginPath(); c.arc(-w * 0.23, -h * 0.06, h * 0.05, 0, 6.2832); c.fill();
        c.restore();
    }
    function pintarTortuga(c, w, h) {
        c.save(); c.translate(w / 2, h / 2);
        c.fillStyle = '#7cb342'; c.beginPath(); c.ellipse(-w * 0.3, h * 0.2, w * 0.14, h * 0.1, -0.5, 0, 6.2832); c.fill(); c.beginPath(); c.ellipse(w * 0.05, h * 0.3, w * 0.2, h * 0.09, 0.3, 0, 6.2832); c.fill(); c.beginPath(); c.ellipse(w * 0.05, -h * 0.28, w * 0.2, h * 0.09, -0.3, 0, 6.2832); c.fill();
        c.beginPath(); c.ellipse(w * 0.4, 0, w * 0.1, h * 0.1, 0, 0, 6.2832); c.fill(); c.fillStyle = '#10243a'; c.beginPath(); c.arc(w * 0.44, -h * 0.03, 3, 0, 6.2832); c.fill();
        c.fillStyle = '#5d8a2e'; c.beginPath(); c.ellipse(-w * 0.05, 0, w * 0.34, h * 0.3, 0, 0, 6.2832); c.fill();
        c.fillStyle = '#8bc34a'; c.beginPath(); c.ellipse(-w * 0.05, -h * 0.02, w * 0.3, h * 0.25, 0, 0, 6.2832); c.fill();
        c.strokeStyle = 'rgba(40,70,20,.55)'; c.lineWidth = 2.5; for (var i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(-w * 0.05 + i * w * 0.1, -h * 0.22); c.lineTo(-w * 0.05 + i * w * 0.1, h * 0.2); c.stroke(); }
        c.beginPath(); c.moveTo(-w * 0.3, -h * 0.02); c.lineTo(w * 0.2, -h * 0.02); c.stroke();
        c.restore();
    }
    function pintarBallena(c, w, h) {
        c.save(); c.translate(w * 0.45, h * 0.52);
        var g = c.createLinearGradient(0, -h * 0.3, 0, h * 0.3); g.addColorStop(0, '#3d5a9e'); g.addColorStop(0.6, '#5a7fc4'); g.addColorStop(1, '#cfe0ff');
        c.fillStyle = g; c.beginPath(); c.moveTo(-w * 0.42, 0); c.quadraticCurveTo(-w * 0.3, -h * 0.4, w * 0.1, -h * 0.3); c.quadraticCurveTo(w * 0.34, -h * 0.2, w * 0.42, h * 0.02); c.quadraticCurveTo(w * 0.1, h * 0.4, -w * 0.3, h * 0.12); c.closePath(); c.fill();
        c.fillStyle = '#3d5a9e'; c.beginPath(); c.moveTo(w * 0.36, 0); c.lineTo(w * 0.52, -h * 0.34); c.lineTo(w * 0.48, -h * 0.02); c.lineTo(w * 0.52, h * 0.3); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(-w * 0.12, h * 0.16); c.lineTo(-w * 0.2, h * 0.42); c.lineTo(w * 0.02, h * 0.2); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; for (var i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-w * 0.28 + i * w * 0.05, h * 0.16); c.lineTo(-w * 0.2 + i * w * 0.055, h * 0.07); c.stroke(); }
        c.fillStyle = '#fff'; c.beginPath(); c.arc(-w * 0.3, -h * 0.03, 6, 0, 6.2832); c.fill(); c.fillStyle = '#10243a'; c.beginPath(); c.arc(-w * 0.305, -h * 0.03, 3, 0, 6.2832); c.fill();
        c.restore();
    }

    /* ── La escena ── */

    var escena = {
        iniciar: function () {
            this.cosas = [];
            this.reunidos = [];
            this.pisos = [];
            this.lampOn = -1;
            this.lampT = 0;
            this.nPisos = 0;
            this.nTemplo = 5;
            this.nivelV = 0;
            this.abierta = 0;
            this.brillo = 0;
            this.peces = [];
            this.burbujas = [];
            this.algas = [];
            this.medusas = [];
            this.destello = [];
            this.contFondo = 0;
            this.parada = 0;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35, accesorio: 'careta' } : null;
            L.der = L.pres ? W - 168 : W - 16;
            var t = L.tam = Math.max(60, Math.min(100, H * 0.125));
            var n = this.nTemplo || 5;
            L.tx = Math.round(L.der * 0.5);
            L.base = Math.round(H * 0.8);
            L.paso = Math.min(t * 1.3, (L.der * 0.7) / n);
            L.sockY = Math.round(H * 0.37);
            L.bocina = { x: 48, y: Math.round(H * 0.2), r: Math.max(24, Math.min(32, hueco * 0.28)) };
            var Wt = n * L.paso + 150;
            var friso0 = L.sockY - t * 0.78, friso1 = L.sockY + t * 0.78;
            var colTop = friso1;
            var puerta = { x0: L.tx - 98, x1: L.tx + 98, yTop: friso1 + 40, yBot: L.base - 42 };
            L.G = {
                tx: L.tx, base: L.base, Wt: Wt, friso0: friso0, friso1: friso1, puerta: puerta, r: t * 0.48,
                pico: friso0 - Math.min(110, Wt * 0.13),
                rec: { x0: L.tx - (n * L.paso) / 2 - 22, x1: L.tx + (n * L.paso) / 2 + 22, y0: L.sockY - t * 0.64, y1: L.sockY + t * 0.64 },
                pos: function (k) { return { x: L.tx + (k - (n - 1) / 2) * L.paso, y: L.sockY }; }
            };
            L.puerta = puerta;
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            this.fondoKey = null; this.fondoImg = null;
            this.ponerFondo(false, keep);
            this.rayosG = keep(this.add.graphics().setDepth(2));
            this.puertaG = keep(this.add.graphics().setDepth(4));
            this.planoG = keep(this.add.graphics().setDepth(5));
            this.algasG = keep(this.add.graphics().setDepth(40));
            this.burbG = keep(this.add.graphics().setDepth(41));
            this.medG = keep(this.add.graphics().setDepth(42));
            this.brilloG = keep(this.add.graphics().setDepth(43));
            this.montarHud(keep);
            this.sembrarMotes(keep, 24, { x: 0, y: 0, w: L.W, h: L.H, depth: 8 }, 0xe0fbff);
            this.crearVida(keep);
            if (reubicar) this.ubicarCosas();
        },

        /** Pinta (o repinta con fundido) el fondo del nivel actual. */
        ponerFondo: function (fundir, keep) {
            var self = this, L = this.L, P = PAL[this.nivelV % 4], G = L.G, n = this.nTemplo || 5, nivel = this.nivelV % 4;
            var clave = 'tem_fondo_' + (this.contFondo++);
            K.textura(this, clave, L.W, L.H, function (c, w, h) { pintarFondo(c, w, h, G, P, n, nivel); });
            var viejo = this.fondoImg, claveVieja = this.fondoKey;
            var img = this.add.image(0, 0, clave).setOrigin(0, 0).setDepth(fundir ? 1.2 : 1);
            if (keep) keep(img); else this.estaticos.push(img);
            this.fondoImg = img; this.fondoKey = clave;
            if (fundir && viejo) {
                img.setAlpha(0);
                return tw(this, { targets: img, alpha: 1, duration: 900 }).then(function () { img.setDepth(1); if (viejo.active) viejo.destroy(); if (claveVieja && self.textures.exists(claveVieja)) self.textures.remove(claveVieja); });
            }
            return Promise.resolve();
        },

        /** Peces, algas, burbujas y criaturas del nivel. */
        crearVida: function (keep) {
            var self = this, L = this.L, P = PAL[this.nivelV % 4];
            (this.peces || []).forEach(function (p) { if (p.im && p.im.active) p.im.destroy(); });
            this.peces = [];
            [['#ff9f43', '#ffffff', '#ffffff'], ['#4dabf7', '#ffd43b', '#1c7ed6'], ['#ffd43b', '#ff922b', '#f08c00'], ['#f783ac', '#ffffff', '#c2255c'], ['#69db7c', '#ffe066', '#2b8a3e']].forEach(function (q, i) {
                var clave = 'tem_pez_' + i;
                if (!self.textures.exists(clave)) K.textura(self, clave, 96, 56, function (c, w, h) { pintarPez(c, w, h, q[0], q[1], q[2]); });
            });
            for (var i = 0; i < 14; i++) {
                var esc = 0.5 + rg(i + 3) * 0.6;
                var im = this.add.image(rg(i) * L.W, L.H * (0.1 + rg(i + 20) * 0.55), 'tem_pez_' + (i % 5)).setDepth(3).setScale(esc);
                if (keep) keep(im); else this.estaticos.push(im);
                this.peces.push({ im: im, vx: (14 + rg(i + 5) * 30) * (rg(i + 7) > 0.5 ? 1 : -1), y0: im.y, ph: rg(i) * 6, esc: esc });
            }
            if (!this.textures.exists('tem_tortuga')) K.textura(this, 'tem_tortuga', 180, 120, pintarTortuga);
            if (!this.textures.exists('tem_ballena')) K.textura(this, 'tem_ballena', 460, 190, pintarBallena);
            if (this.tortuga && this.tortuga.im && this.tortuga.im.active) this.tortuga.im.destroy();
            if (this.ballena && this.ballena.im && this.ballena.im.active) this.ballena.im.destroy();
            this.tortuga = null; this.ballena = null;
            if (this.nivelV >= 1) {
                var tim = this.add.image(-200, L.H * 0.2, 'tem_tortuga').setDepth(6).setScale(0.8);
                if (keep) keep(tim); else this.estaticos.push(tim);
                this.tortuga = { im: tim, vx: 26 };
            }
            if (this.nivelV >= 3 || this.finalEncendido) {
                var bim = this.add.image(-400, L.H * 0.14, 'tem_ballena').setDepth(2.5).setScale(1.1).setAlpha(0.8);
                if (keep) keep(bim); else this.estaticos.push(bim);
                this.ballena = { im: bim, vx: 18 };
            }
            this.algas = [];
            for (var a = 0; a < 16; a++) {
                var ax = a < 8 ? 10 + a * 12 + rg(a) * 20 : L.der - 20 - (a - 8) * 12 - rg(a) * 20;
                this.algas.push({ x: ax, h: 90 + rg(a + 4) * 130, ph: rg(a + 8) * 6, col: mez(P.musgo, 0x0b6b3a, rg(a + 2) * 0.5), grosor: 6 + rg(a + 6) * 4 });
            }
            for (var b2 = 0; b2 < 10; b2++) {
                var bx = 130 + rg(b2 + 40) * (L.der - 260);
                if (Math.abs(bx - L.tx) < L.G.Wt / 2 + 40) continue;
                this.algas.push({ x: bx, h: 50 + rg(b2 + 50) * 70, ph: rg(b2 + 60) * 6, col: mez(P.musgo, 0x0b6b3a, rg(b2) * 0.5), grosor: 5, medio: true });
            }
            this.medusas = [];
            if (P.medusas || this.nivelV >= 2) for (var m = 0; m < 3; m++) this.medusas.push({ x: L.W * (0.2 + m * 0.3) + rg(m) * 60, y: L.H * (0.3 + rg(m + 4) * 0.25), ph: rg(m + 2) * 6, s: 0.8 + rg(m + 1) * 0.5, col: [0xff8fd8, 0x8fd8ff, 0xc9a0ff][m] });
            this.burbujas = [];
            for (var q = 0; q < 28; q++) this.burbujas.push({ x: rg(q) * L.der, y: rg(q + 9) * L.H, r: 2 + rg(q + 3) * 5, vy: 18 + rg(q + 5) * 34, ph: rg(q) * 6 });
        },

        pos: function (k) { return this.L.G.pos(k); },

        /* ── Gemas ── */

        lugares: function (n) {
            var L = this.L, paso = Math.min(L.tam * 1.5, (L.der - 150) / Math.max(n, 1));
            var ini = L.der / 2 - paso * (n - 1) / 2, out = [];
            for (var i = 0; i < n; i++) out.push({ x: ini + i * paso, y: Math.round(L.H * 0.885) });
            return out;
        },

        ubicarCosas: function () {
            var self = this, lug = this.lugares(this.cosas.length);
            this.cosas.forEach(function (a, i) {
                if (!a.cont.active) return;
                a.casa = { x: lug[i].x, y: lug[i].y };
                if (!a.usada && !(self.arrastrando && self.arrastrando.a === a)) a.cont.setPosition(lug[i].x, lug[i].y);
            });
        },

        crearGema: function (id, i, lug) {
            var t = this.L.tam;
            var a = this.crearCosa(id, lug.x, lug.y + 80, t * 0.6, { depth: 30, sinSombra: true });
            var col = COLORES[i % COLORES.length];
            var g = this.add.graphics();
            g.fillStyle(0x000000, 0.2); g.fillCircle(3, 6, t * 0.5);
            g.fillStyle(col, 0.35); g.fillCircle(0, 0, t * 0.58);
            g.fillStyle(col, 1); g.fillCircle(0, 0, t * 0.48);
            g.fillStyle(0xffffff, 0.94); g.fillCircle(0, 0, t * 0.4);
            g.fillStyle(col, 0.16); g.fillCircle(0, 0, t * 0.4);
            g.lineStyle(2.5, 0xffffff, 0.7); g.strokeCircle(0, 0, t * 0.48);
            var brillo = this.add.graphics();
            brillo.fillStyle(0xffffff, 0.85); brillo.fillEllipse(-t * 0.2, -t * 0.24, t * 0.2, t * 0.11);
            var luz = this.add.graphics(); luz.fillStyle(0xffe066, 1); luz.fillCircle(0, 0, t * 0.5); luz.setAlpha(0);
            a.cont.addAt(g, 0); a.cont.addAt(luz, 1); a.cont.add(brillo);
            a.luz = luz; a.col = col; a.tam = t; a.casa = { x: lug.x, y: lug.y }; a.prof = 30; a.fase2 = Math.random() * 6;
            a.cont.setAlpha(0);
            return a;
        },

        mostrarOpciones: async function (nv) {
            var self = this, lug = this.lugares(nv.opciones.length);
            this.cosas = nv.opciones.map(function (id, i) { return self.crearGema(id, i, lug[i]); });
            K.ruido({ f: 700, q: 1, dur: 0.12, vol: 0.05 });
            await Promise.all(this.cosas.map(function (a, i) {
                return esperar(self, i * 100).then(function () { return tw(self, { targets: a.cont, alpha: 1, y: a.casa.y, duration: 420, ease: 'Back.easeOut' }); });
            }));
        },

        prepararNivel: async function (i, nv) {
            await this.retirar(this.cosas);
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.cosas = [];
            this.pisos = [];
            this.abierta = 0;
            var n = nv.reproducciones[0].length, nivel = i < 0 ? 0 : i;
            var cambia = nivel !== this.nivelV || n !== this.nTemplo;
            this.nPisos = n;
            this.nTemplo = n;
            this.nivelV = nivel;
            if (cambia) {
                this.L = this.calcular();
                await this.ponerFondo(true);
                this.crearVida();
            }
        },

        alSonar: function (id, k) {
            this.lampOn = k;
            this.lampT = this.time.now;
            K.tono({ f: 480 + k * 90, dur: 0.07, vol: 0.04 });
            var p = this.pos(k);
            this.soltarBurbujas(p.x, p.y, 4);
        },

        soltarBurbujas: function (x, y, n) {
            for (var i = 0; i < n; i++) this.burbujas.push({ x: x + (Math.random() - 0.5) * 40, y: y + (Math.random() - 0.5) * 20, r: 3 + Math.random() * 5, vy: 40 + Math.random() * 50, ph: Math.random() * 6, vida: 2.4 });
        },

        /* ── Arrastrar gemas al templo ── */

        alTocar: function (p) {
            if (this.fase !== 'jugar') return;
            if (!this.tomar(p, this.cosas.filter(function (a) { return !a.usada; }))) {
                var b = this.cosaEn(this.cosas, p.x, p.y);
                if (b && !this.sonando) this.sonar(b.id, { breve: true, bocina: false });
            }
        },
        alMover: function (p) { this.llevar(p); },

        sobreTemplo: function (a) {
            var L = this.L;
            return Math.abs(a.cont.x - L.tx) < L.G.Wt / 2 + 30 && a.cont.y < L.base - 30;
        },

        alSoltar: async function () {
            var a = this.soltar();
            if (!a) return;
            if (this.fase !== 'jugar' || !this.sobreTemplo(a)) { this.aCasa(a, true); return; }
            this.tocado = a;
            var r = await this.tocarOrden(a, { x: a.cont.x, y: a.cont.y });
            if (r === 'mal') this.aCasa(a, true);
        },

        alMarcar: async function (id, k) {
            var a = this.tocado, d = this.pos(k);
            a.usada = true;
            a.cont.setDepth(35);
            this.pisos[k] = a;
            await this.saltarA(a.cont, d.x, d.y, { ms: 300, alto: 30 });
            K.tono({ f: 520, f2: 940, dur: 0.14, vol: 0.06, tipo: 'sine' });
            K.ruido({ f: 260, q: 0.8, dur: 0.08, vol: 0.09 });
            this.destello.push({ x: d.x, y: d.y, t0: this.time.now, col: a.col });
            this.soltarBurbujas(d.x, d.y, 6);
            this.cameras.main.shake(80, 0.0016);
        },

        alFallar: async function () {
            var a = this.tocado;
            K.tono({ f: 300, f2: 160, dur: 0.25, vol: 0.05 });
            this.cameras.main.shake(160, 0.004);
            if (a) await a.sacudir();
        },

        /** Las gemas salen de sus engastes como burbujas y flotan de vuelta a la arena. */
        alReiniciar: async function () {
            var caen = [];
            this.destello.push({ x: this.L.tx, y: this.L.sockY, t0: this.time.now, col: 0xff6b6b, grande: true });
            for (var k = this.pisos.length - 1; k >= 0; k--) {
                var a = this.pisos[k];
                if (!a) continue;
                a.usada = false;
                a.cont.setDepth(30);
                this.soltarBurbujas(a.cont.x, a.cont.y, 5);
                K.tono({ f: 700, f2: 380, dur: 0.12, vol: 0.05 });
                caen.push(tw(this, { targets: a.cont, x: a.casa.x, y: a.casa.y, angle: 360, duration: 700, ease: 'Cubic.easeInOut', onComplete: (function (q) { return function () { q.cont.angle = 0; }; })(a) }));
                await esperar(this, 80);
            }
            this.pisos = [];
            await Promise.all(caen);
        },

        /** Código completo: suena, la puerta se abre con un retumbo y la luz del tesoro llena el agua. */
        alAcertar: async function () {
            var nv = this.nv;
            for (var k = 0; k < nv.correctas.length; k++) {
                if (!this.sigue()) return;
                this.reunidos.push(nv.correctas[k]);
                var a = this.pisos[k];
                if (a) { a.luz.setAlpha(0.9); this.tweens.add({ targets: a.luz, alpha: 0.15, duration: 450 }); a.latir(); }
                this.lampOn = k; this.lampT = this.time.now;
                await this.sonar(nv.correctas[k], { breve: true, bocina: false });
                await esperar(this, 90);
            }
            K.ruido({ f: 110, q: 0.5, dur: 1.4, vol: 0.12 });
            this.cameras.main.shake(900, 0.003);
            await tw(this, { targets: this, abierta: 1, duration: 1500, ease: 'Sine.easeInOut' });
            [660, 830, 990, 1320].forEach(function (f, i) { setTimeout(function () { K.tono({ f: f, dur: 0.4, vol: 0.05, tipo: 'triangle' }); }, i * 120); });
            var L = this.L;
            Ut.estallido(this, L.tx, (L.puerta.yTop + L.puerta.yBot) / 2, { n: 22, tex: 'estrella', tam: 28, dist: 220, depth: 70, sinTinte: true });
            this.soltarBurbujas(L.tx, L.puerta.yBot - 20, 20);
            Ut.confeti(this, 40);
            await esperar(this, 900);
        },

        alTerminarNivel: async function () {
            await tw(this, { targets: this, abierta: 0, duration: 500 });
            await this.retirar(this.cosas.filter(function (a) { return !a.usada; }));
            await this.retirar(this.pisos.filter(Boolean));
            this.cosas = [];
            this.pisos = [];
            this.nPisos = 0;
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            var sig = this.siguienteDe(this.cosas.filter(function (a) { return !a.usada; }));
            if (!sig || !this.ayuda) {
                if (this.bocina) this.tweens.add({ targets: this.bocina, scale: 1.18, duration: 220, yoyo: true, repeat: 2 });
                return esperar(this, 900);
            }
            var d = this.pos(this.marcadas.length);
            return this.ctx.mano({ punto: { x: sig.cont.x, y: sig.cont.y }, holdMs: 200, arrastre: { dx: d.x - sig.cont.x, dy: d.y - sig.cont.y, durMs: 900 }, cancelado: function () { return cancelada() || self.fase !== 'jugar' || !!self.arrastrando; } });
        },

        demoPaso: function () {
            var self = this;
            return this.nv.correctas.map(function (id) {
                return function () {
                    var a = self.cosas.filter(function (q) { return q.id === id && !q.usada; })[0];
                    if (!a) return null;
                    var d = self.pos(self.marcadas.length);
                    return {
                        desde: { x: a.cont.x, y: a.cont.y }, hasta: d,
                        hacer: async function () {
                            self.arrastrando = { a: a, dx: 0, dy: 0 };
                            a.cont.setDepth(70);
                            await tw(self, { targets: a.cont, x: d.x, y: d.y, duration: 350 });
                            await self.alSoltar();
                        }
                    };
                };
            });
        },

        /* ── Final: el templo se ilumina y pasa el desfile ── */

        escenaFinal: async function () {
            var self = this, L = this.L;
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.pisos.forEach(function (a) { if (a && a.cont.active) a.cont.destroy(); });
            this.cosas = []; this.pisos = [];
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; }).slice(0, this.nTemplo);
            while (ids.length < this.nTemplo) ids.push(['tambor', 'pajaro', 'campana', 'perro', 'pelota'][ids.length % 5]);
            this.nPisos = ids.length;
            this.finalEncendido = true;
            this.ballena = this.ballena || (function () { var b = self.add.image(-420, L.H * 0.16, 'tem_ballena').setDepth(2.5).setScale(1.15).setAlpha(0.85); self.estaticos.push(b); return { im: b, vx: 70 }; })();
            this.ballena.vx = 70;
            for (var k = 0; k < ids.length; k++) {
                if (!this.sigue()) return;
                var d = this.pos(k);
                var a = this.crearGema(ids[k], k, { x: d.x, y: d.y });
                a.cont.setAlpha(1).setPosition(L.der * 0.5 + (k - 2) * 40, L.H * 0.95);
                this.pisos[k] = a;
                await this.saltarA(a.cont, d.x, d.y, { ms: 520, alto: 80 });
                a.cont.setDepth(35);
                this.destello.push({ x: d.x, y: d.y, t0: this.time.now, col: a.col });
                a.latir();
                this.lampOn = k; this.lampT = this.time.now;
                await this.sonar(ids[k], { breve: true, bocina: false });
            }
            this.nv = { correctas: ids };
            K.ruido({ f: 110, q: 0.5, dur: 1.6, vol: 0.12 });
            this.cameras.main.shake(1000, 0.003);
            tw(this, { targets: this, brillo: 1, duration: 1800 });
            await tw(this, { targets: this, abierta: 1, duration: 1600, ease: 'Sine.easeInOut' });
            [523, 659, 784, 1047, 1319].forEach(function (f, i) { setTimeout(function () { K.tono({ f: f, dur: 0.5, vol: 0.05, tipo: 'triangle' }); }, i * 140); });
            Ut.confeti(this, 120);
            for (var r = 0; r < 6; r++) {
                if (!this.sigue()) return;
                Ut.estallido(this, L.tx + (Math.random() - 0.5) * L.G.Wt * 0.8, L.H * (0.12 + Math.random() * 0.25), { n: 18, tex: 'chispa', tam: 24, dist: 150, depth: 60, colores: [0xffe066, 0x74c0fc, 0xf783ac, 0xffffff], ms: 1100 });
                K.tono({ f: 700 + r * 90, dur: 0.2, vol: 0.04, tipo: 'triangle' });
                this.soltarBurbujas(L.tx + (Math.random() - 0.5) * 300, L.base - 20, 8);
                await esperar(this, 500);
            }
            for (var j = 0; j < ids.length; j++) { if (!this.sigue()) return; this.lampOn = j; this.lampT = this.time.now; await this.sonar(ids[j], { breve: true, bocina: false }); }
            await esperar(this, 1600);
        },

        estadoExtra: function () {
            return {
                cosas: this.cosas.filter(function (a) { return a.cont.active && !a.usada; }).map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y) }; }),
                socket: this.nPisos ? this.pos(this.marcadas ? this.marcadas.length : 0) : null, pisos: this.pisos.filter(Boolean).length, abierta: +this.abierta.toFixed(2), nivelV: this.nivelV
            };
        },

        /* ── Cada cuadro ── */

        paso: function (time, delta) {
            var L = this.L, self = this, s = time / 1000, dt = Math.min(0.05, (delta || 16) / 1000);
            if (!L || !this.rayosG || !this.rayosG.active) return;
            var P = PAL[this.nivelV % 4];
            // Rayos de luz desde la superficie.
            var rg2 = this.rayosG; rg2.clear();
            for (var i = 0; i < 6; i++) {
                var x0 = L.W * (0.06 + i * 0.18) + Math.sin(s / 4 + i) * 50, ang = Math.sin(s / 5 + i * 1.3) * 0.12;
                var al = (P.rayos * 0.7 * (0.6 + 0.4 * Math.sin(s / 1.6 + i)) + this.brillo * 0.06);
                rg2.fillStyle(this.brillo > 0.3 ? mez(P.luz, 0xffe9a0, this.brillo) : P.luz, al);
                rg2.fillTriangle(x0 - 6, 0, x0 + 20, 0, x0 + 170 + ang * L.H, L.H * 1.1);
                rg2.fillTriangle(x0 - 6, 0, x0 + 170 + ang * L.H, L.H * 1.1, x0 - 40 + ang * L.H, L.H * 1.1);
            }
            // Peces, tortuga y ballena.
            this.peces.forEach(function (p) {
                if (!p.im.active) return;
                p.im.x += p.vx * dt;
                if (p.vx > 0 && p.im.x > L.W + 60) p.im.x = -60; else if (p.vx < 0 && p.im.x < -60) p.im.x = L.W + 60;
                p.im.y = p.y0 + Math.sin(s * 1.4 + p.ph) * 14;
                p.im.setFlipX(p.vx < 0);
                p.im.angle = Math.sin(s * 3 + p.ph) * 3;
                var dentro = Math.abs(p.im.x - L.tx) < L.G.Wt / 2 + 20 && p.im.y > L.G.pico - 10 && p.im.y < L.base;
                p.im.setAlpha(p.im.alpha + ((dentro ? 0.18 : 1) - p.im.alpha) * Math.min(1, dt * 5));
            });
            var T = this.tortuga;
            if (T && T.im.active) { T.im.x += T.vx * dt; if (T.im.x > L.W + 160) T.im.x = -160; T.im.y = L.H * 0.5 + Math.sin(s * 0.6) * 40; T.im.angle = Math.sin(s * 1.2) * 4; }
            var BL = this.ballena;
            if (BL && BL.im.active) { BL.im.x += BL.vx * dt; if (BL.im.x > L.W + 300) BL.im.x = -400; BL.im.y = L.H * 0.16 + Math.sin(s * 0.4) * 20; BL.im.angle = Math.sin(s * 0.5) * 2; }
            // Algas.
            var ag = this.algasG; ag.clear();
            this.algas.forEach(function (a) {
                var base = L.base + (a.medio ? 30 : 56), seg = 9, px = a.x, py = base;
                for (var q = 1; q <= seg; q++) {
                    var u = q / seg, nx = a.x + Math.sin(s * 1.3 + a.ph + u * 2.2) * (10 + u * 22), ny = base - a.h * u;
                    ag.lineStyle(a.grosor * (1 - u * 0.6), a.col, 1); ag.lineBetween(px, py, nx, ny);
                    px = nx; py = ny;
                }
            });
            // Burbujas.
            var bg = this.burbG; bg.clear();
            this.burbujas.forEach(function (b, i) {
                b.y -= b.vy * dt; b.x += Math.sin(s * 2 + b.ph) * 8 * dt;
                if (b.vida != null) { b.vida -= dt; if (b.vida <= 0) { b.y = -99; } }
                if (b.y < -10) { if (b.vida != null) return; b.y = L.H + 10; b.x = Math.random() * L.der; }
                bg.lineStyle(1.5, 0xffffff, 0.55); bg.strokeCircle(b.x, b.y, b.r); bg.fillStyle(0xffffff, 0.12); bg.fillCircle(b.x, b.y, b.r); bg.fillStyle(0xffffff, 0.7); bg.fillCircle(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.22);
            });
            this.burbujas = this.burbujas.filter(function (b) { return b.vida == null || b.vida > 0; });
            // Medusas luminosas.
            var mg = this.medG; mg.clear();
            this.medusas.forEach(function (m) {
                var x = m.x + Math.sin(s * 0.5 + m.ph) * 40, y = m.y + Math.sin(s * 0.9 + m.ph) * 26, pul = 1 + Math.sin(s * 2 + m.ph) * 0.1, r = 28 * m.s;
                mg.fillStyle(m.col, 0.12); mg.fillCircle(x, y, r * 2.2);
                mg.fillStyle(m.col, 0.45); mg.fillEllipse(x, y, r * 2 * pul, r * 1.3 / pul);
                mg.fillStyle(0xffffff, 0.35); mg.fillEllipse(x - r * 0.3, y - r * 0.2, r * 0.6, r * 0.3);
                for (var t = -2; t <= 2; t++) { mg.lineStyle(3, m.col, 0.5); var tx0 = x + t * r * 0.4; mg.beginPath(); mg.moveTo(tx0, y + r * 0.4); for (var z = 1; z <= 6; z++) mg.lineTo(tx0 + Math.sin(s * 2 + z * 0.8 + t) * 6, y + r * 0.4 + z * r * 0.35); mg.strokePath(); }
            });
            // Puerta del templo: dos hojas de piedra que se deslizan y la luz del tesoro.
            var pg = this.puertaG; pg.clear();
            var D = L.puerta, ab = this.abierta, dw = D.x1 - D.x0, hoja = dw / 2 * (1 - ab);
            if (ab > 0.02) {
                var cx = L.tx, cy = (D.yTop + D.yBot) / 2;
                pg.fillStyle(0xffe27a, 0.3 * ab); pg.fillCircle(cx, cy, 150 * ab + 40);
                pg.fillStyle(0xffd43b, 0.55 * ab); pg.fillRoundedRect(D.x0, D.yTop, dw, D.yBot - D.yTop, { tl: 70, tr: 70, bl: 0, br: 0 });
                pg.fillStyle(0xfff3bf, 0.8 * ab); pg.fillCircle(cx, cy + 20, 60 * ab);
                // Cofre y perla.
                var cb = D.yBot - 4;
                pg.fillStyle(0x8d5524, ab); pg.fillRoundedRect(cx - 46, cb - 40, 92, 40, 6);
                pg.fillStyle(0xb5772f, ab); pg.fillRoundedRect(cx - 46, cb - 62, 92, 28, { tl: 40, tr: 40, bl: 0, br: 0 });
                pg.fillStyle(0xffd43b, ab); pg.fillRect(cx - 5, cb - 48, 10, 18);
                for (var mm = 0; mm < 7; mm++) { pg.fillStyle(0xffe066, ab); pg.fillCircle(cx - 30 + mm * 10, cb - 64 - Math.abs(Math.sin(s * 2 + mm)) * 4, 5); }
                pg.fillStyle(0xffffff, ab); pg.fillCircle(cx, cb - 88 - Math.sin(s * 2) * 4, 13); pg.fillStyle(0xe7f5ff, ab); pg.fillCircle(cx - 4, cb - 92 - Math.sin(s * 2) * 4, 5);
            }
            if (hoja > 1) {
                var piedra = mez(P.piedra, 0x000000, 0.1);
                var cuerpo = function (x, sgn) {
                    pg.fillStyle(piedra, 1); pg.fillRoundedRect(x, D.yTop - 4, hoja, D.yBot - D.yTop + 4, sgn < 0 ? { tl: 70, bl: 0, tr: 0, br: 0 } : { tr: 70, bl: 0, tl: 0, br: 0 });
                    pg.lineStyle(3, 0x000000, 0.25); pg.strokeRoundedRect(x, D.yTop - 4, hoja, D.yBot - D.yTop + 4, 8);
                    pg.fillStyle(0xd4a24c, 1); [0.3, 0.55, 0.8].forEach(function (f) { pg.fillCircle(x + (sgn < 0 ? hoja - 14 : 14), D.yTop + (D.yBot - D.yTop) * f, 5); });
                    pg.lineStyle(4, 0x78e6ff, 0.55); pg.strokeCircle(x + hoja / 2, (D.yTop + D.yBot) / 2, Math.min(hoja / 2 - 6, 26));
                };
                cuerpo(D.x0, -1); cuerpo(D.x1 - hoja, 1);
            }
            // Engastes: runas que respiran, se iluminan al sonar y destellan al encajar.
            var pl = this.planoG; pl.clear();
            for (var k = 0; k < this.nPisos; k++) {
                var d = this.pos(k), lleno = this.pisos[k];
                var on = this.lampOn === k && time - (this.lampT || 0) < 450;
                var r = L.G.r;
                if (!lleno) {
                    pl.lineStyle(3, on ? 0xffd43b : 0x78e6ff, on ? 1 : 0.35 + 0.15 * Math.sin(s * 2 + k));
                    pl.strokeCircle(d.x, d.y, r - 8);
                    if (on) { pl.fillStyle(0xffd43b, 0.5); pl.fillCircle(d.x, d.y, r + 4); pl.fillStyle(0xfff3bf, 0.8); pl.fillCircle(d.x, d.y, r * 0.5); }
                    pl.lineStyle(2, 0x78e6ff, 0.35); for (var q = 0; q < 6; q++) { var a = q * Math.PI / 3 + s * 0.3; pl.lineBetween(d.x + Math.cos(a) * (r - 14), d.y + Math.sin(a) * (r - 14), d.x + Math.cos(a) * (r - 6), d.y + Math.sin(a) * (r - 6)); }
                } else {
                    pl.fillStyle(lleno.col, 0.22 + 0.08 * Math.sin(s * 3 + k)); pl.fillCircle(d.x, d.y, r + 14);
                }
            }
            // Destellos de encaje.
            var bl = this.brilloG; bl.clear();
            this.destello = this.destello.filter(function (e) { return time - e.t0 < 800; });
            this.destello.forEach(function (e) { var f = (time - e.t0) / 800; bl.lineStyle(5 * (1 - f) + 1, e.col, 0.9 * (1 - f)); bl.strokeCircle(e.x, e.y, (e.grande ? 60 : 30) + f * (e.grande ? 140 : 70)); });
            if (this.brillo > 0.01) { bl.fillStyle(0xffe9a0, 0.1 * this.brillo + 0.04 * this.brillo * Math.sin(s * 3)); bl.fillRect(0, 0, L.W, L.H); }
            // Mecer las gemas y los pisos.
            this.cosas.forEach(function (a) {
                if (!a.cont.active || a.usada || !a.casa || (self.arrastrando && self.arrastrando.a === a) || self.tweens.isTweening(a.cont)) return;
                a.cont.y = a.casa.y + Math.sin(s * 1.6 + a.fase2) * 6;
                a.cont.x = a.casa.x + Math.sin(s * 0.9 + a.fase2) * 3;
            });
            this.pisos.forEach(function (a, k) {
                if (!a || !a.cont.active || self.tweens.isTweening(a.cont)) return;
                var d = self.pos(k); a.cont.x = d.x; a.cont.y = d.y + Math.sin(s * 2 + k) * 1.5;
            });
        }
    };

    K.crear({ id: 'templo', fondo: '#0a6fb0', escena: escena });
})(typeof window !== 'undefined' ? window : this);
