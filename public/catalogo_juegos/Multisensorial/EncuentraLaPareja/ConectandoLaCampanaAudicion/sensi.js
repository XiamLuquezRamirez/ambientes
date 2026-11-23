/**
 * PedniaSensi — «El taller de Sensi» (Conectando la campana — Audición, 5-6 años).
 *
 * En el taller de un inventor vive Sensi, un robot amigo que todavía no tiene sentidos. Sobre la mesa
 * del taller hay un tablero con cinco piezas (los órganos de siempre, en cartuchos). Cada estímulo
 * llega a la plataforma y Sensi no lo percibe: el niño le instala la pieza del sentido que lo capta.
 *   1. La campana     (reto del documento): se instala el OÍDO en Sensi y se AFINA con la perilla del pecho:
 *                     girándola con el dedo hasta que su tono suene igual que el de la campana.
 *   2. Los estímulos  tambor, flor, helado, sol y osito llegan uno a uno: se arrastra a Sensi la pieza que los
 *                     percibe (si no es, la pieza se rechaza con chispas y Zeus explica).
 *   3. Sin mirar      una caja con cortina esconde un instrumento: suena y se toca la tarjeta que suena igual.
 *   4. ¿Dónde suena?  cuatro campanas escondidas en el taller: se mueve la antena de Sensi y se escucha.
 *   Final: Sensi se enciende con los cinco sentidos, baila y su señal llega al cerebro.
 */
(function (global) {
    'use strict';

    var B = global.PedniaParejaBase;
    var U = B.util;
    var L = function () { return global.PedniaLab; };
    var A = function () { return global.PedniaArte; };
    var Sfx = function () { return global.EncuentraSonidoSfx; };
    var O = function () { return global.PedniaOrganos; };

    var SENTIDO = { tambor: 'oido', flor: 'nariz', helado: 'lengua', sol: 'ojo', osito: 'mano' };
    var POR_QUE = {
        tambor: 'El tambor produce SONIDO: lo escuchamos con el oído.',
        flor: 'La flor suelta aroma: lo percibimos con la nariz.',
        helado: 'El helado tiene sabor: lo saboreamos con la lengua.',
        sol: 'El sol da luz: la captamos con los ojos.',
        osito: 'El osito es suave: lo sentimos al tocarlo con la mano.'
    };
    var COLOR = { oido: 0xffd43b, ojo: 0x4dabf7, nariz: 0xf783ac, lengua: 0xff6b6b, mano: 0x69db7c };
    var ORDEN = ['oido', 'ojo', 'nariz', 'lengua', 'mano'];

    var ctxAudio = null;
    function audio() {
        var C = global.AudioContext || global.webkitAudioContext;
        if (!C) return null;
        if (!ctxAudio) ctxAudio = new C();
        if (ctxAudio.state === 'suspended') ctxAudio.resume();
        return ctxAudio;
    }
    /** Tono de campanita (parciales de campana). */
    function campanita(f, vol) {
        var ac = audio();
        if (!ac) return;
        var t = ac.currentTime + 0.02;
        [[1, 0.28], [2.01, 0.12], [2.76, 0.07], [4.07, 0.03]].forEach(function (p) {
            var o = ac.createOscillator();
            var g = ac.createGain();
            o.frequency.value = f * p[0];
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(p[1] * (vol || 1), t + 0.005);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
            o.connect(g).connect(ac.destination);
            o.start(t);
            o.stop(t + 1.5);
        });
    }

    function rg(i) { var x = Math.sin(i * 127.1 + 11.7) * 43758.5453; return x - Math.floor(x); }

    var escena = {
        create: function () {
            var scene = this;
            this.modo = '';
            this.anillos = [];
            this.contFondo = 0;
            this.cart = {};
            this.luzAmb = 0;
            this.estAct = null;
            this.dibujarFondo();
            this.crearSensi();
            this.crearCartuchos();
            this.ondas = this.add.graphics().setDepth(14);
            this.efectosG = this.add.graphics().setDepth(36);
            this.scale.on('resize', function () { scene.dibujarFondo(); scene.ubicar(); });
        },

        /** Medidas del taller: Sensi al centro, plataforma de estímulos a la izquierda, tablero de piezas abajo. */
        m: function () {
            var w = this.scale.width, h = this.scale.height;
            var SH = h * 0.66, base = h * 0.79, cx = w * 0.5;
            var P = {
                oido: { x: cx - SH * 0.19, y: base - SH * 0.53, r: SH * 0.05 },
                ojo: { x: cx, y: base - SH * 0.575, r: SH * 0.058 },
                nariz: { x: cx, y: base - SH * 0.5, r: SH * 0.03 },
                lengua: { x: cx, y: base - SH * 0.455, r: SH * 0.04 },
                mano: { x: cx + SH * 0.26, y: base - SH * 0.205, r: SH * 0.05 }
            };
            return {
                w: w, h: h, SH: SH, base: base, cx: cx, P: P,
                plat: { x: w * 0.19, y: h * 0.5, tam: Math.min(w * 0.13, h * 0.2) },
                rackY: h * 0.9, card: Math.min(h * 0.12, w * 0.085),
                perilla: { x: cx, y: base - SH * 0.27, r: SH * 0.05 }
            };
        },

        rackX: function (i) {
            var m = this.m();
            return m.w * 0.3 + i * (m.w * 0.48 / 4);
        },

        /* ── Escenario: el taller del inventor ─────────────────── */

        dibujarFondo: function () {
            var m = this.m(), w = m.w, h = m.h;
            var clave = 'sensi_fondo_' + (this.contFondo++);
            var t = this.textures.createCanvas(clave, Math.max(2, Math.ceil(w)), Math.max(2, Math.ceil(h)));
            var c = t.getContext();
            var mesaY = h * 0.8;
            var rr = function (x, y, ww, hh, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, ww, hh, r); else c.rect(x, y, ww, hh); };
            var metal = function (x0, y0, x1, y1, claro, oscuro) { var g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, claro); g.addColorStop(0.5, oscuro); g.addColorStop(1, claro); return g; };
            // Pared de tablones verticales con veta y clavos.
            var tw = Math.max(64, w * 0.065), np = Math.ceil(w / tw);
            for (var i = 0; i < np; i++) {
                var x0 = i * tw, tone = rg(i) * 18;
                var gp = c.createLinearGradient(0, 0, 0, mesaY); gp.addColorStop(0, 'rgb(' + (62 + tone) + ',' + (84 + tone) + ',' + (90 + tone) + ')'); gp.addColorStop(1, 'rgb(' + (38 + tone) + ',' + (56 + tone) + ',' + (62 + tone) + ')');
                c.fillStyle = gp; c.fillRect(x0, 0, tw, mesaY);
                c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0, mesaY); c.stroke();
                c.strokeStyle = 'rgba(255,255,255,0.06)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x0 + 3, 0); c.lineTo(x0 + 3, mesaY); c.stroke();
                for (var k = 0; k < 7; k++) { c.strokeStyle = 'rgba(0,0,0,' + (0.05 + rg(i * 9 + k) * 0.07) + ')'; c.lineWidth = 1.5; c.beginPath(); var gx = x0 + 6 + rg(i * 7 + k) * (tw - 12); c.moveTo(gx, 0); c.bezierCurveTo(gx + 6, mesaY * 0.3, gx - 6, mesaY * 0.6, gx + 3, mesaY); c.stroke(); }
                c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.arc(x0 + tw / 2, mesaY * 0.06, 2.5, 0, 6.2832); c.arc(x0 + tw / 2, mesaY * 0.55, 2.5, 0, 6.2832); c.fill();
            }
            // Tablero perforado con herramientas de verdad (metal con brillo y sombra).
            var px = w * 0.03, py = h * 0.07, pw = w * 0.3, ph = h * 0.34;
            c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 18; c.shadowOffsetY = 8; c.fillStyle = '#c9a66b'; rr(px, py, pw, ph, 10); c.fill(); c.restore();
            var gt = c.createLinearGradient(px, py, px + pw, py + ph); gt.addColorStop(0, '#d8b97d'); gt.addColorStop(1, '#a98650'); c.fillStyle = gt; rr(px, py, pw, ph, 10); c.fill();
            c.fillStyle = 'rgba(70,45,20,0.55)'; for (var yy = py + 16; yy < py + ph - 8; yy += 22) for (var xx = px + 16 + (((yy - py) / 22) % 2) * 11; xx < px + pw - 8; xx += 22) { c.beginPath(); c.arc(xx, yy, 2.4, 0, 6.2832); c.fill(); }
            var herr = function (hx, hy, tipo) {
                c.save(); c.translate(hx, hy); c.shadowColor = 'rgba(40,25,10,0.55)'; c.shadowBlur = 6; c.shadowOffsetX = 4; c.shadowOffsetY = 5;
                var asa = c.createLinearGradient(-8, 0, 8, 0); asa.addColorStop(0, '#b0302c'); asa.addColorStop(0.5, '#e0504a'); asa.addColorStop(1, '#8c2320');
                if (tipo === 0) { // llave inglesa
                    c.fillStyle = metal(-9, 0, 9, 0, '#dfe5ec', '#8996a3'); rr(-7, -4, 14, 80, 6); c.fill();
                    c.beginPath(); c.arc(0, -8, 17, 0, 6.2832); c.fill(); c.fillStyle = '#3d4650'; c.beginPath(); c.moveTo(-6, -22); c.lineTo(6, -22); c.lineTo(6, -10); c.lineTo(-6, -10); c.fill();
                } else if (tipo === 1) { // martillo
                    c.fillStyle = '#9a6a38'; rr(-5, 10, 10, 70, 4); c.fill(); c.fillStyle = metal(-22, 0, 22, 0, '#e3e8ee', '#7d8a98'); rr(-22, -6, 44, 22, 5); c.fill();
                } else if (tipo === 2) { // destornillador
                    c.fillStyle = asa; rr(-8, 30, 16, 48, 7); c.fill(); c.fillStyle = metal(-3, 0, 3, 0, '#e7ecf1', '#8996a3'); c.fillRect(-3, -6, 6, 38);
                } else if (tipo === 3) { // alicates
                    c.fillStyle = asa; rr(-13, 34, 9, 44, 4); c.fill(); rr(4, 34, 9, 44, 4); c.fill(); c.fillStyle = metal(-14, 0, 14, 0, '#e3e8ee', '#7d8a98'); c.beginPath(); c.moveTo(-13, 36); c.lineTo(-4, -8); c.lineTo(4, -8); c.lineTo(13, 36); c.fill();
                } else { // cinta métrica
                    c.fillStyle = '#f2c230'; c.beginPath(); c.arc(0, 18, 22, 0, 6.2832); c.fill(); c.fillStyle = '#26303a'; c.beginPath(); c.arc(0, 18, 8, 0, 6.2832); c.fill();
                    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(-8, 8, 8, 4, -0.6, 0, 6.2832); c.fill();
                }
                c.restore();
            };
            for (var q = 0; q < 5; q++) herr(px + pw * (0.12 + q * 0.19), py + ph * (q % 2 ? 0.3 : 0.18), q);
            // Plano de Sensi clavado en la pared.
            var bx = w * 0.37, by = h * 0.09, bw = Math.min(w * 0.1, 140), bh = bw * 1.25;
            c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 12; c.shadowOffsetY = 6; c.fillStyle = '#1b4b8a'; c.fillRect(bx, by, bw, bh); c.restore();
            c.strokeStyle = 'rgba(160,210,255,0.35)'; c.lineWidth = 1; for (var gx2 = 0; gx2 <= bw; gx2 += 14) { c.beginPath(); c.moveTo(bx + gx2, by); c.lineTo(bx + gx2, by + bh); c.stroke(); } for (var gy2 = 0; gy2 <= bh; gy2 += 14) { c.beginPath(); c.moveTo(bx, by + gy2); c.lineTo(bx + bw, by + gy2); c.stroke(); }
            c.strokeStyle = 'rgba(230,245,255,0.9)'; c.lineWidth = 2; rr(bx + bw * 0.3, by + bh * 0.15, bw * 0.4, bw * 0.3, 6); c.stroke(); rr(bx + bw * 0.25, by + bh * 0.5, bw * 0.5, bw * 0.4, 6); c.stroke(); c.beginPath(); c.arc(bx + bw * 0.42, by + bh * 0.3, 4, 0, 6.2832); c.arc(bx + bw * 0.58, by + bh * 0.3, 4, 0, 6.2832); c.stroke();
            c.fillStyle = '#e03131'; c.beginPath(); c.arc(bx + 6, by + 6, 3.5, 0, 6.2832); c.arc(bx + bw - 6, by + 6, 3.5, 0, 6.2832); c.fill();
            // Ventana con noche, ciudad, marco y cortina.
            var vx = w * 0.7, vy = h * 0.09, vw = Math.min(w * 0.17, 230), vh = h * 0.27;
            var cielo = c.createLinearGradient(0, vy, 0, vy + vh); cielo.addColorStop(0, '#0a1230'); cielo.addColorStop(1, '#2d3f7a'); c.fillStyle = cielo; c.fillRect(vx, vy, vw, vh);
            for (var s = 0; s < 40; s++) { c.fillStyle = 'rgba(255,255,255,' + (0.4 + rg(s) * 0.6) + ')'; c.fillRect(vx + rg(s) * vw, vy + rg(s + 1) * vh * 0.6, 2, 2); }
            c.fillStyle = '#fff4c9'; c.beginPath(); c.arc(vx + vw * 0.8, vy + vh * 0.2, 14, 0, 6.2832); c.fill();
            var lunaG = c.createRadialGradient(vx + vw * 0.8, vy + vh * 0.2, 6, vx + vw * 0.8, vy + vh * 0.2, 60); lunaG.addColorStop(0, 'rgba(255,244,200,0.45)'); lunaG.addColorStop(1, 'rgba(255,244,200,0)'); c.fillStyle = lunaG; c.fillRect(vx, vy, vw, vh);
            for (var b = 0; b < 8; b++) { var bh2 = vh * (0.25 + rg(b + 3) * 0.3); c.fillStyle = b % 2 ? '#141f4d' : '#1b2a63'; c.fillRect(vx + b * vw / 8, vy + vh - bh2, vw / 8 - 2, bh2); for (var wv = 0; wv < 5; wv++) { c.fillStyle = rg(b * 5 + wv) > 0.4 ? '#ffd86b' : 'rgba(255,255,255,0.05)'; c.fillRect(vx + b * vw / 8 + 4 + (wv % 2) * 9, vy + vh - bh2 + 6 + Math.floor(wv / 2) * 14, 5, 7); } }
            var cr = c.createLinearGradient(vx, vy, vx + vw, vy + vh); cr.addColorStop(0, 'rgba(255,255,255,0.12)'); cr.addColorStop(0.4, 'rgba(255,255,255,0)'); c.fillStyle = cr; c.fillRect(vx, vy, vw, vh);
            c.strokeStyle = '#8a623a'; c.lineWidth = 12; c.strokeRect(vx - 2, vy - 2, vw + 4, vh + 4); c.lineWidth = 6; c.beginPath(); c.moveTo(vx + vw / 2, vy); c.lineTo(vx + vw / 2, vy + vh); c.moveTo(vx, vy + vh * 0.55); c.lineTo(vx + vw, vy + vh * 0.55); c.stroke();
            c.fillStyle = '#7a5530'; c.fillRect(vx - 14, vy + vh + 2, vw + 28, 10);
            c.fillStyle = 'rgba(176,48,44,0.92)'; c.beginPath(); c.moveTo(vx - 20, vy - 14); c.lineTo(vx + 26, vy - 14); c.quadraticCurveTo(vx + 52, vy + vh * 0.5, vx + 8, vy + vh + 10); c.lineTo(vx - 20, vy + vh + 10); c.fill();
            c.beginPath(); c.moveTo(vx + vw + 20, vy - 14); c.lineTo(vx + vw - 26, vy - 14); c.quadraticCurveTo(vx + vw - 52, vy + vh * 0.5, vx + vw - 8, vy + vh + 10); c.lineTo(vx + vw + 20, vy + vh + 10); c.fill();
            c.fillStyle = '#5c3d1e'; c.fillRect(vx - 30, vy - 22, vw + 60, 9);
            // Reloj de pared.
            var rx = w * 0.57, ry = h * 0.15, rr0 = Math.min(34, h * 0.05);
            c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 10; c.shadowOffsetY = 4; c.fillStyle = '#e9e2d2'; c.beginPath(); c.arc(rx, ry, rr0, 0, 6.2832); c.fill(); c.restore();
            c.strokeStyle = '#5c3d1e'; c.lineWidth = 5; c.beginPath(); c.arc(rx, ry, rr0, 0, 6.2832); c.stroke();
            c.strokeStyle = '#2b2b3b'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx, ry - rr0 * 0.7); c.moveTo(rx, ry); c.lineTo(rx + rr0 * 0.45, ry + rr0 * 0.1); c.stroke();
            // Estante con frascos, cajas y engranes (izquierda).
            var ex = w * 0.04, ey = h * 0.55, ew = Math.min(w * 0.18, 250);
            c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 10; c.shadowOffsetY = 6; c.fillStyle = '#8a623a'; c.fillRect(ex, ey, ew, 12); c.restore();
            c.fillStyle = '#6b4a2b'; c.fillRect(ex + 14, ey + 12, 10, 22); c.fillRect(ex + ew - 24, ey + 12, 10, 22);
            [['#ff8fab', 0.08], ['#74c0fc', 0.3], ['#b2f2bb', 0.52]].forEach(function (q2) {
                var jx = ex + ew * q2[1], jw = 34, jh = 46;
                c.fillStyle = 'rgba(210,235,245,0.28)'; rr(jx, ey - jh, jw, jh, 6); c.fill(); c.fillStyle = q2[0]; rr(jx + 3, ey - jh * 0.62, jw - 6, jh * 0.6, 4); c.fill();
                c.fillStyle = '#7a8794'; c.fillRect(jx + 4, ey - jh - 6, jw - 8, 7); c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(jx + 6, ey - jh + 4, 4, jh * 0.6);
            });
            c.fillStyle = '#b5772f'; rr(ex + ew * 0.74, ey - 38, 46, 38, 4); c.fill(); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(ex + ew * 0.74, ey - 24, 46, 3);
            // Engranes grandes en la pared (derecha).
            var engr = function (x0, y0, r, col) { c.fillStyle = col; c.beginPath(); for (var i2 = 0; i2 < 24; i2++) { var a = i2 * Math.PI / 12, r2 = i2 % 2 ? r : r * 1.16; c.lineTo(x0 + Math.cos(a) * r2, y0 + Math.sin(a) * r2); } c.closePath(); c.fill(); c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.arc(x0, y0, r * 0.4, 0, 6.2832); c.fill(); };
            engr(w * 0.89, h * 0.5, 48, 'rgba(180,195,210,0.16)'); engr(w * 0.945, h * 0.6, 30, 'rgba(180,195,210,0.12)');
            // Zócalo y mesa de trabajo en perspectiva.
            c.fillStyle = '#20303a'; c.fillRect(0, mesaY - 14, w, 14);
            var topY = mesaY, frente = h * 0.03;
            var mg = c.createLinearGradient(0, topY, 0, h); mg.addColorStop(0, '#b07a45'); mg.addColorStop(0.35, '#8f5e32'); mg.addColorStop(1, '#5e3b1e');
            c.fillStyle = mg; c.fillRect(0, topY, w, h - topY);
            for (var p = 0; p < 90; p++) { c.strokeStyle = 'rgba(' + (rg(p) > 0.5 ? '0,0,0' : '255,230,190') + ',' + (0.05 + rg(p + 3) * 0.08) + ')'; c.lineWidth = 1 + rg(p + 5) * 1.5; c.beginPath(); var yy2 = topY + 12 + rg(p) * (h - topY - 16); var x1 = rg(p + 1) * w; c.moveTo(x1, yy2); c.bezierCurveTo(x1 + 60, yy2 - 2, x1 + 120, yy2 + 3, x1 + 80 + rg(p + 2) * 200, yy2); c.stroke(); }
            c.fillStyle = 'rgba(255,235,200,0.32)'; c.fillRect(0, topY, w, 5);
            c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0, topY + frente, w, 3);
            // Cosas sobre la mesa: tornillos, tuercas, un tornillo de banco y un cautín.
            for (var n = 0; n < 16; n++) { var sx = w * (0.03 + rg(n + 40) * 0.2), sy = topY + h * (0.03 + rg(n + 50) * 0.13); if (n % 2) { c.fillStyle = metal(sx - 5, sy, sx + 5, sy, '#e3e8ee', '#8996a3'); c.beginPath(); c.arc(sx, sy, 5, 0, 6.2832); c.fill(); c.fillStyle = '#3d4650'; c.fillRect(sx - 3, sy - 1, 6, 2); } else { c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(sx + 3, sy + 3, 11, 3, 0, 0, 6.2832); c.fill(); c.fillStyle = metal(sx - 10, sy - 2, sx + 10, sy - 2, '#d5dbe3', '#7d8a98'); rr(sx - 10, sy - 3, 20, 5, 2); c.fill(); } }
            c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 8; c.shadowOffsetY = 5; c.fillStyle = metal(0, 0, 60, 0, '#6d7b8a', '#37424d'); rr(w * 0.015, topY - h * 0.045, w * 0.06, h * 0.075, 6); c.fill(); c.fillStyle = '#c4453d'; c.fillRect(w * 0.075, topY - h * 0.02, w * 0.03, 8); c.restore();
            c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 8; c.shadowOffsetY = 5; c.fillStyle = '#2b2f36'; rr(w * 0.78, topY + h * 0.06, w * 0.1, 10, 5); c.fill(); c.fillStyle = '#e0a030'; c.fillRect(w * 0.78, topY + h * 0.06 - 2, w * 0.035, 14); c.restore();
            // Luz de la lámpara: charco sobre la mesa y velo cálido.
            var lg = c.createRadialGradient(m.cx, h * 0.5, 20, m.cx, h * 0.5, h * 0.7); lg.addColorStop(0, 'rgba(255,236,170,0.28)'); lg.addColorStop(0.5, 'rgba(255,236,170,0.08)'); lg.addColorStop(1, 'rgba(255,236,170,0)'); c.fillStyle = lg; c.fillRect(0, 0, w, h);
            var pozo = c.createRadialGradient(m.cx, topY + h * 0.08, 10, m.cx, topY + h * 0.08, w * 0.3); pozo.addColorStop(0, 'rgba(255,230,160,0.35)'); pozo.addColorStop(1, 'rgba(255,230,160,0)'); c.fillStyle = pozo; c.fillRect(0, topY, w, h - topY);
            // Tarima de pruebas de Sensi (disco metálico con anillos).
            var tx = m.cx, ty = m.base + h * 0.012, trx = m.SH * 0.36, tryy = m.SH * 0.075;
            c.fillStyle = 'rgba(0,0,0,0.4)'; c.beginPath(); c.ellipse(tx, ty + 14, trx * 1.08, tryy * 1.15, 0, 0, 6.2832); c.fill();
            c.fillStyle = '#2a323c'; c.beginPath(); c.ellipse(tx, ty + 8, trx, tryy, 0, 0, 6.2832); c.fill(); c.fillRect(tx - trx, ty, trx * 2, 8);
            var gd = c.createLinearGradient(0, ty - tryy, 0, ty + tryy); gd.addColorStop(0, '#aab6c3'); gd.addColorStop(1, '#5b6773'); c.fillStyle = gd; c.beginPath(); c.ellipse(tx, ty, trx, tryy, 0, 0, 6.2832); c.fill();
            c.strokeStyle = 'rgba(30,40,55,0.6)'; c.lineWidth = 3; c.beginPath(); c.ellipse(tx, ty, trx * 0.7, tryy * 0.7, 0, 0, 6.2832); c.stroke(); c.beginPath(); c.ellipse(tx, ty, trx * 0.35, tryy * 0.35, 0, 0, 6.2832); c.stroke();
            // Proyector de estímulos (base cilíndrica).
            var P2 = m.plat;
            c.fillStyle = 'rgba(0,0,0,0.4)'; c.beginPath(); c.ellipse(P2.x, P2.y + P2.tam * 0.9, P2.tam * 0.8, P2.tam * 0.18, 0, 0, 6.2832); c.fill();
            var cil = c.createLinearGradient(P2.x - P2.tam * 0.55, 0, P2.x + P2.tam * 0.55, 0); cil.addColorStop(0, '#3a4452'); cil.addColorStop(0.35, '#8794a4'); cil.addColorStop(1, '#2c3440'); c.fillStyle = cil; c.fillRect(P2.x - P2.tam * 0.55, P2.y + P2.tam * 0.62, P2.tam * 1.1, mesaY - P2.y - P2.tam * 0.62);
            c.fillStyle = '#4a5666'; c.beginPath(); c.ellipse(P2.x, P2.y + P2.tam * 0.62, P2.tam * 0.7, P2.tam * 0.17, 0, 0, 6.2832); c.fill(); c.fillStyle = '#0e1822'; c.beginPath(); c.ellipse(P2.x, P2.y + P2.tam * 0.6, P2.tam * 0.58, P2.tam * 0.12, 0, 0, 6.2832); c.fill();
            // Viñeta y grano de película.
            var v = c.createRadialGradient(w / 2, h * 0.5, h * 0.4, w / 2, h * 0.5, w * 0.72); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,8,16,0.5)'); c.fillStyle = v; c.fillRect(0, 0, w, h);
            for (var gn = 0; gn < 900; gn++) { c.fillStyle = 'rgba(255,255,255,' + (0.02 + rg(gn) * 0.03) + ')'; c.fillRect(rg(gn + 1) * w, rg(gn + 2) * h, 2, 2); }
            t.refresh();
            var vieja = this.fondoImg, claveVieja = this.fondoClave;
            this.fondoImg = this.add.image(0, 0, clave).setOrigin(0, 0).setDepth(1);
            this.fondoClave = clave;
            if (vieja) { vieja.destroy(); if (claveVieja && this.textures.exists(claveVieja)) this.textures.remove(claveVieja); }
            if (!this.lampG) this.lampG = this.add.graphics().setDepth(2);
            if (!this.luzG) this.luzG = this.add.graphics().setDepth(3);
            if (!this.polvoG) this.polvoG = this.add.graphics().setDepth(35);
            if (!this.polvo) { this.polvo = []; for (var pv = 0; pv < 36; pv++) this.polvo.push({ x: rg(pv) * 0.3 - 0.15, y: rg(pv + 9), r: 1 + rg(pv + 3) * 2, v: 0.01 + rg(pv + 5) * 0.03, f: rg(pv + 7) * 6 }); }
        },

        /** Texturas de Sensi pintadas con volumen: degradados metálicos, brillos, remaches y sombras. */
        texturasSensi: function () {
            var m = this.m(), u = Math.round(m.SH), self = this;
            var hacer = function (clave, w, h, fn) { if (self.textures.exists(clave)) self.textures.remove(clave); var t = self.textures.createCanvas(clave, Math.max(2, Math.ceil(w)), Math.max(2, Math.ceil(h))); fn(t.getContext(), w, h); t.refresh(); };
            var rr = function (c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); };
            var brillo = function (c, x, y, w, h, r) { var g = c.createLinearGradient(x, y, x, y + h); g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; rr(c, x, y, w, h, r); c.fill(); };
            var remache = function (c, x, y, r) { var g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r); g.addColorStop(0, '#f1f4f8'); g.addColorStop(1, '#5a6573'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill(); };
            // Cabeza (con antena y orejeras).
            hacer('sensi_cabeza', 0.5 * u, 0.4 * u, function (c, W, H) {
                var x = 0.06 * u, y = 0.12 * u, w = 0.38 * u, h = 0.26 * u;
                c.save(); c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 0.02 * u; c.shadowOffsetY = 0.012 * u;
                var gc = c.createLinearGradient(0, y, 0, y + h); gc.addColorStop(0, '#a9ccff'); gc.addColorStop(0.45, '#5f93ec'); gc.addColorStop(1, '#2f57a8'); c.fillStyle = gc; rr(c, x, y, w, h, 0.07 * u); c.fill(); c.restore();
                var gl = c.createLinearGradient(x, 0, x + w, 0); gl.addColorStop(0, 'rgba(255,255,255,0.35)'); gl.addColorStop(0.2, 'rgba(255,255,255,0)'); gl.addColorStop(0.85, 'rgba(0,0,40,0)'); gl.addColorStop(1, 'rgba(0,0,40,0.35)'); c.fillStyle = gl; rr(c, x, y, w, h, 0.07 * u); c.fill();
                brillo(c, x + 0.02 * u, y + 0.012 * u, w - 0.04 * u, h * 0.28, 0.05 * u);
                c.strokeStyle = '#1f3566'; c.lineWidth = 0.008 * u; rr(c, x, y, w, h, 0.07 * u); c.stroke();
                // Orejeras.
                [x, x + w].forEach(function (ex) { var g = c.createLinearGradient(ex - 0.03 * u, 0, ex + 0.03 * u, 0); g.addColorStop(0, '#d5dbe3'); g.addColorStop(0.5, '#7d8a98'); g.addColorStop(1, '#4a5563'); c.fillStyle = g; c.beginPath(); c.arc(ex, y + h * 0.5, 0.065 * u, 0, 6.2832); c.fill(); c.strokeStyle = '#2b3440'; c.lineWidth = 0.006 * u; c.stroke(); });
                // Placa de la cara: vidrio oscuro con reflejo.
                var fx = x + 0.035 * u, fy = y + 0.035 * u, fw = w - 0.07 * u, fh = h - 0.07 * u;
                var gf = c.createLinearGradient(fx, fy, fx + fw, fy + fh); gf.addColorStop(0, '#16222f'); gf.addColorStop(1, '#0a1119'); c.fillStyle = gf; rr(c, fx, fy, fw, fh, 0.05 * u); c.fill();
                c.strokeStyle = 'rgba(160,200,255,0.35)'; c.lineWidth = 0.006 * u; rr(c, fx, fy, fw, fh, 0.05 * u); c.stroke();
                c.save(); rr(c, fx, fy, fw, fh, 0.05 * u); c.clip(); var rf = c.createLinearGradient(fx, fy, fx + fw * 0.6, fy + fh); rf.addColorStop(0, 'rgba(255,255,255,0.18)'); rf.addColorStop(0.5, 'rgba(255,255,255,0.02)'); rf.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = rf; c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx + fw * 0.7, fy); c.lineTo(fx + fw * 0.25, fy + fh); c.lineTo(fx, fy + fh); c.fill(); c.restore();
                remache(c, x + 0.03 * u, y + 0.03 * u, 0.01 * u); remache(c, x + w - 0.03 * u, y + 0.03 * u, 0.01 * u);
                // Antena.
                c.strokeStyle = '#7d8a98'; c.lineWidth = 0.014 * u; c.lineCap = 'round'; c.beginPath(); c.moveTo(0.25 * u, y); c.lineTo(0.25 * u, 0.04 * u); c.stroke();
                c.strokeStyle = '#c8d1dc'; c.lineWidth = 0.005 * u; c.beginPath(); c.moveTo(0.248 * u, y); c.lineTo(0.248 * u, 0.04 * u); c.stroke();
                var gb = c.createRadialGradient(0.245 * u, 0.025 * u, 1, 0.25 * u, 0.03 * u, 0.028 * u); gb.addColorStop(0, '#ff9a9a'); gb.addColorStop(1, '#c92a2a'); c.fillStyle = gb; c.beginPath(); c.arc(0.25 * u, 0.03 * u, 0.026 * u, 0, 6.2832); c.fill();
            });
            // Torso con cuello, piernas y pies (todo en una pieza).
            hacer('sensi_torso', 0.6 * u, 0.5 * u, function (c, W, H) {
                var cx = W / 2, base = H;
                c.fillStyle = 'rgba(0,0,0,0.0)';
                // Piernas y pies.
                [-1, 1].forEach(function (s) {
                    var lx = cx + s * 0.075 * u;
                    var g = c.createLinearGradient(lx - 0.025 * u, 0, lx + 0.025 * u, 0); g.addColorStop(0, '#c6cfda'); g.addColorStop(0.5, '#8794a4'); g.addColorStop(1, '#505c6a'); c.fillStyle = g; rr(c, lx - 0.025 * u, base - 0.15 * u, 0.05 * u, 0.1 * u, 0.012 * u); c.fill();
                    var gp = c.createLinearGradient(0, base - 0.06 * u, 0, base); gp.addColorStop(0, '#59687c'); gp.addColorStop(1, '#232c38'); c.fillStyle = gp; rr(c, lx - 0.06 * u, base - 0.06 * u, 0.12 * u, 0.06 * u, 0.02 * u); c.fill();
                    c.fillStyle = 'rgba(255,255,255,0.25)'; rr(c, lx - 0.05 * u, base - 0.055 * u, 0.1 * u, 0.012 * u, 0.006 * u); c.fill();
                });
                // Cuello.
                var gn = c.createLinearGradient(cx - 0.03 * u, 0, cx + 0.03 * u, 0); gn.addColorStop(0, '#aab5c2'); gn.addColorStop(0.5, '#6a7684'); gn.addColorStop(1, '#3a4452'); c.fillStyle = gn; c.fillRect(cx - 0.03 * u, base - 0.43 * u, 0.06 * u, 0.08 * u);
                c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 2; for (var k = 0; k < 3; k++) { c.beginPath(); c.moveTo(cx - 0.03 * u, base - 0.425 * u + k * 0.02 * u); c.lineTo(cx + 0.03 * u, base - 0.425 * u + k * 0.02 * u); c.stroke(); }
                // Torso.
                var tx = cx - 0.15 * u, ty = base - 0.38 * u, tw = 0.3 * u, th = 0.24 * u;
                c.save(); c.shadowColor = 'rgba(0,0,0,0.4)'; c.shadowBlur = 0.02 * u; c.shadowOffsetY = 0.01 * u;
                var gt = c.createLinearGradient(0, ty, 0, ty + th); gt.addColorStop(0, '#7aa6ee'); gt.addColorStop(0.5, '#4c7fd6'); gt.addColorStop(1, '#2a4f9a'); c.fillStyle = gt; rr(c, tx, ty, tw, th, 0.06 * u); c.fill(); c.restore();
                var gs = c.createLinearGradient(tx, 0, tx + tw, 0); gs.addColorStop(0, 'rgba(255,255,255,0.3)'); gs.addColorStop(0.25, 'rgba(255,255,255,0)'); gs.addColorStop(0.8, 'rgba(0,0,40,0)'); gs.addColorStop(1, 'rgba(0,0,40,0.35)'); c.fillStyle = gs; rr(c, tx, ty, tw, th, 0.06 * u); c.fill();
                brillo(c, tx + 0.015 * u, ty + 0.01 * u, tw - 0.03 * u, th * 0.25, 0.04 * u);
                c.strokeStyle = '#1f3566'; c.lineWidth = 0.008 * u; rr(c, tx, ty, tw, th, 0.06 * u); c.stroke();
                // Panel del pecho (hundido) y franja de precaución.
                var px = cx - 0.09 * u, py = ty + 0.035 * u, pw = 0.18 * u, ph = 0.14 * u;
                c.fillStyle = '#0c141d'; rr(c, px, py, pw, ph, 0.02 * u); c.fill();
                c.strokeStyle = '#b5c0cc'; c.lineWidth = 0.007 * u; rr(c, px, py, pw, ph, 0.02 * u); c.stroke();
                c.fillStyle = '#f2c230'; for (var z = 0; z < 6; z++) { c.beginPath(); c.moveTo(tx + 0.02 * u + z * 0.045 * u, ty + th - 0.035 * u); c.lineTo(tx + 0.045 * u + z * 0.045 * u, ty + th - 0.035 * u); c.lineTo(tx + 0.035 * u + z * 0.045 * u, ty + th - 0.012 * u); c.lineTo(tx + 0.01 * u + z * 0.045 * u, ty + th - 0.012 * u); c.fill(); }
                remache(c, tx + 0.02 * u, ty + 0.02 * u, 0.008 * u); remache(c, tx + tw - 0.02 * u, ty + 0.02 * u, 0.008 * u);
            });
            // Brazos (hombro en el origen de la textura).
            var brazo = function (clave, ancho, alto, x1, y1, x2, y2) {
                hacer(clave, ancho, alto, function (c, W, H) {
                    var ang = Math.atan2(y2 - y1, x2 - x1), len = Math.hypot(x2 - x1, y2 - y1), gr = 0.026 * u;
                    c.save(); c.translate(x1, y1); c.rotate(ang);
                    var g = c.createLinearGradient(0, -gr, 0, gr); g.addColorStop(0, '#d2dae4'); g.addColorStop(0.5, '#8794a4'); g.addColorStop(1, '#4a5563');
                    c.shadowColor = 'rgba(0,0,0,0.4)'; c.shadowBlur = 0.012 * u; c.shadowOffsetY = 0.008 * u;
                    c.fillStyle = g; rr(c, -gr, -gr, len + gr * 2, gr * 2, gr); c.fill(); c.shadowColor = 'transparent';
                    c.fillStyle = 'rgba(255,255,255,0.35)'; rr(c, -gr * 0.6, -gr * 0.85, len + gr * 1.2, gr * 0.5, gr * 0.3); c.fill();
                    c.restore();
                    var gh = c.createRadialGradient(x1 - 0.008 * u, y1 - 0.008 * u, 1, x1, y1, 0.04 * u); gh.addColorStop(0, '#9eb8ee'); gh.addColorStop(1, '#2f57a8'); c.fillStyle = gh; c.beginPath(); c.arc(x1, y1, 0.038 * u, 0, 6.2832); c.fill(); c.strokeStyle = '#1f3566'; c.lineWidth = 0.006 * u; c.stroke();
                    remache(c, x1, y1, 0.008 * u);
                });
            };
            brazo('sensi_brazoI', 0.12 * u, 0.28 * u, 0.06 * u, 0.05 * u, 0.04 * u, 0.22 * u);
            brazo('sensi_brazoD', 0.22 * u, 0.3 * u, 0.06 * u, 0.05 * u, 0.15 * u, 0.2 * u);
        },

        /** Sensi: cabeza que mira, torso que respira, brazos que se mecen y tomas de los sentidos. */
        crearSensi: function () {
            var m = this.m(), SH = m.SH, u = Math.round(SH), self = this;
            if (this.sensi && this.sensi.active) this.sensi.destroy();
            this.texturasSensi();
            var c = this.add.container(m.cx, m.base).setDepth(10);
            var sombra = this.add.ellipse(0, SH * 0.004, SH * 0.36, SH * 0.045, 0x000000, 0.45);
            var torso = this.add.image(0, 0, 'sensi_torso').setOrigin(0.5, 1);
            var brazoI = this.add.image(-0.17 * SH, -0.36 * SH, 'sensi_brazoI').setOrigin(0.06 * u / (0.12 * u), 0.05 * u / (0.28 * u));
            var brazoD = this.add.image(0.17 * SH, -0.36 * SH, 'sensi_brazoD').setOrigin(0.06 * u / (0.22 * u), 0.05 * u / (0.3 * u));
            var cabeza = this.add.container(0, -0.4 * SH);
            var imgC = this.add.image(0, 0, 'sensi_cabeza').setOrigin(0.25 / 0.5, 0.38 / 0.4);
            var tomas = this.add.graphics();
            cabeza.add([imgC, tomas]);
            var tomasM = this.add.graphics();
            c.add([sombra, torso, brazoI, brazoD, tomasM, cabeza]);
            c.tomas = tomas; c.tomasM = tomasM; c.cabeza = cabeza; c.torso = torso; c.brazoI = brazoI; c.brazoD = brazoD;
            // Luces del pecho (una por sentido).
            c.luces = {};
            ORDEN.forEach(function (id, i) {
                var l = self.add.circle((-0.065 + i * 0.0325) * SH, -0.285 * SH, 0.0125 * SH, 0x3b4553).setStrokeStyle(2, 0x9aa6b4);
                c.add(l); c.luces[id] = l;
            });
            this.sensi = c;
            this.encendidos = this.encendidos || {};
            this.preg = this.preg && this.preg.active ? this.preg : this.add.text(m.cx + SH * 0.24, m.base - SH * 0.78, '?', { fontFamily: 'Fredoka, Arial', fontStyle: 'bold', fontSize: Math.round(SH * 0.14) + 'px', color: '#ffe066', stroke: '#16222f', strokeThickness: 6 }).setOrigin(0.5).setDepth(11).setAlpha(0);
        },

        /** Cartuchos con los cinco órganos: carcasa metálica con tira de color luminosa, remaches y brillo. */
        crearCartuchos: function () {
            var scene = this, m = this.m(), tam = m.card;
            this.cart = {};
            ORDEN.forEach(function (id, i) {
                var clave = 'sensi_cart_' + id + '_' + Math.round(tam);
                if (!scene.textures.exists(clave)) {
                    var t = scene.textures.createCanvas(clave, Math.ceil(tam * 1.3), Math.ceil(tam * 1.3));
                    var c = t.getContext(), o = tam * 0.15, w = tam, h = tam;
                    var col = '#' + ('000000' + COLOR[id].toString(16)).slice(-6);
                    c.save(); c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = tam * 0.1; c.shadowOffsetY = tam * 0.06;
                    var g = c.createLinearGradient(0, o, 0, o + h); g.addColorStop(0, '#5a6678'); g.addColorStop(0.5, '#323b48'); g.addColorStop(1, '#1f2630');
                    c.fillStyle = g; c.beginPath(); c.roundRect ? c.roundRect(o, o, w, h, tam * 0.12) : c.rect(o, o, w, h); c.fill(); c.restore();
                    c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 2; c.beginPath(); c.roundRect ? c.roundRect(o + 1, o + 1, w - 2, h - 2, tam * 0.12) : c.rect(o, o, w, h); c.stroke();
                    // Tira luminosa de color.
                    var gc = c.createLinearGradient(o, 0, o + w, 0); gc.addColorStop(0, col); gc.addColorStop(1, col);
                    c.fillStyle = gc; c.beginPath(); c.roundRect ? c.roundRect(o + tam * 0.08, o + tam * 0.07, w - tam * 0.16, tam * 0.11, tam * 0.05) : c.rect(o, o, w, tam * 0.1); c.fill();
                    c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(o + tam * 0.12, o + tam * 0.085, w - tam * 0.24, tam * 0.03);
                    // Ventana blanca para la pieza.
                    var gw = c.createLinearGradient(0, o + tam * 0.22, 0, o + tam * 0.92); gw.addColorStop(0, '#ffffff'); gw.addColorStop(1, '#dde3ea');
                    c.fillStyle = gw; c.beginPath(); c.roundRect ? c.roundRect(o + tam * 0.08, o + tam * 0.22, w - tam * 0.16, h * 0.7, tam * 0.08) : c.rect(o, o, w, h); c.fill();
                    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 2; c.stroke();
                    // Remaches y conector.
                    [[0.05, 0.05], [0.95, 0.05], [0.05, 0.95], [0.95, 0.95]].forEach(function (q) { var rg2 = c.createRadialGradient(o + w * q[0] - 2, o + h * q[1] - 2, 1, o + w * q[0], o + h * q[1], tam * 0.035); rg2.addColorStop(0, '#f1f4f8'); rg2.addColorStop(1, '#5a6573'); c.fillStyle = rg2; c.beginPath(); c.arc(o + w * q[0], o + h * q[1], tam * 0.03, 0, 6.2832); c.fill(); });
                    c.fillStyle = '#c8d1dc'; c.fillRect(o + tam * 0.3, o + h - 2, tam * 0.4, tam * 0.07);
                    c.fillStyle = '#e0b84a'; for (var p = 0; p < 4; p++) c.fillRect(o + tam * 0.34 + p * tam * 0.09, o + h + tam * 0.01, tam * 0.05, tam * 0.045);
                    t.refresh();
                }
                var c2 = scene.add.container(scene.rackX(i), m.rackY).setDepth(30);
                var fondo = scene.add.image(0, tam * 0.02, clave);
                var o2 = O().crear(scene, id === 'oido' ? 'oreja' : id, 0, tam * 0.12, tam * 0.27, { id: id, burbuja: false, flotar: false });
                var luz = scene.add.circle(0, 0, tam * 0.62, COLOR[id], 0).setBlendMode(Phaser.BlendModes.ADD);
                c2.add([luz, fondo, o2.cont]);
                c2.fondo = fondo; c2.org = o2; c2.id = id; c2.tam = tam; c2.luz = luz; c2.casa = { x: c2.x, y: c2.y }; c2.puesta = false;
                scene.cart[id] = c2;
            });
        },

        ubicar: function () {
            var m = this.m(), scene = this;
            this.crearSensi();
            ORDEN.forEach(function (id, i) { var c = scene.cart[id]; c.casa = { x: scene.rackX(i), y: m.rackY }; if (!c.puesta) c.setPosition(c.casa.x, c.casa.y); });
        },

        /* ── Utilidades ────────────────────────────────────────── */

        ondaDesde: function (x, y, color) {
            for (var i = 0; i < 3; i++) this.anillos.push({ x: x, y: y, color: color, t0: this.time.now + i * 220 });
        },

        sobreSensi: function (x, y) {
            var m = this.m();
            return Math.abs(x - m.cx) < m.SH * 0.3 && y < m.base && y > m.base - m.SH * 0.78;
        },

        /** Muestra u oculta el signo de pregunta de Sensi. */
        pregunta: function (si) { this.tweens.add({ targets: this.preg, alpha: si ? 1 : 0, scale: si ? { from: 0.4, to: 1 } : 1, duration: 300 }); },

        /** Arrastra un cartucho hasta Sensi. Resuelve con el id del cartucho al soltarlo sobre Sensi; si no, vuelve al tablero. */
        arrastrarPieza: function (correcto) {
            var scene = this;
            return new Promise(function (resolver) {
                var cur = null, dx = 0, dy = 0;
                var pista = U.crearPista(scene, 9000, function (cancelado) {
                    var c = scene.cart[correcto], m = scene.m();
                    return scene.ctx.mano({ punto: { x: c.x, y: c.y }, holdMs: 300, cancelado: cancelado, arrastre: { dx: m.cx - c.x, dy: (m.base - m.SH * 0.35) - c.y, durMs: 1100 } });
                });
                pista.reiniciar();
                function abajo(p) {
                    var hit = null;
                    ORDEN.forEach(function (id) { var c = scene.cart[id]; if (!hit && !c.puesta && Math.abs(p.x - c.x) < c.tam * 0.55 && Math.abs(p.y - c.y) < c.tam * 0.55) hit = c; });
                    if (!hit) return;
                    cur = hit; dx = hit.x - p.x; dy = hit.y - p.y;
                    scene.tweens.killTweensOf(hit);
                    hit.setDepth(40); hit.setScale(1.1);
                    pista.reiniciar(); scene.ctx.quitarMano(); U.sfx('pop');
                }
                function mover(p) { if (cur) cur.setPosition(p.x + dx, p.y + dy); }
                function arriba() {
                    if (!cur) return;
                    var c = cur; cur = null;
                    c.setDepth(30);
                    if (!scene.sobreSensi(c.x, c.y)) { scene.tweens.add({ targets: c, x: c.casa.x, y: c.casa.y, scale: 1, duration: 420, ease: 'Back.easeOut' }); return; }
                    scene.input.off('pointerdown', abajo); scene.input.off('pointermove', mover); scene.input.off('pointerup', arriba);
                    pista.parar();
                    resolver(c.id);
                }
                scene.input.on('pointerdown', abajo); scene.input.on('pointermove', mover); scene.input.on('pointerup', arriba);
            });
        },

        /** La pieza encaja en su toma de Sensi y el sentido se enciende. */
        instalar: async function (id) {
            var m = this.m(), c = this.cart[id], p = m.P[id];
            c.puesta = true;
            this.tweens.killTweensOf(c);
            c.setDepth(33);
            this.tweens.add({ targets: c.fondo, alpha: 0, duration: 250 });
            await U.tween(this, { targets: c, x: p.x, y: p.y, scale: (p.r * 2.1) / c.tam * 1.6, duration: 450, ease: 'Back.easeOut' });
            U.sfx('recompensa');
            this.destelloT = this.time.now;
            this.ondaDesde(p.x, p.y, COLOR[id]);
            U.estallido(this, p.x, p.y, { n: 10, dist: 70, tam: 14, colores: [COLOR[id], 0xffffff], depth: 60 });
            this.cameras.main.shake(90, 0.0018);
            this.encendidos[id] = true;
            this.sensi.luces[id].fillColor = COLOR[id];
            this.sensi.luces[id].setStrokeStyle(2, 0xffffff);
            this.tweens.add({ targets: this.sensi, angle: { from: -3, to: 3 }, duration: 90, yoyo: true, repeat: 2, onComplete: function () {} });
        },

        /** La pieza vuelve al tablero. */
        devolver: async function (id) {
            var c = this.cart[id];
            this.tweens.add({ targets: c.fondo, alpha: 1, duration: 250 });
            await U.tween(this, { targets: c, x: c.casa.x, y: c.casa.y, scale: 1, duration: 500, ease: 'Sine.easeInOut' });
            c.puesta = false; c.setDepth(30);
            this.encendidos[id] = false;
            this.sensi.luces[id].fillColor = 0x4a5568;
            this.sensi.luces[id].setStrokeStyle(2, 0x8896a8);
        },

        /** Pieza equivocada: chispas, Sensi niega y la pieza vuelve. */
        rechazar: async function (id) {
            var m = this.m(), c = this.cart[id];
            U.sfx('boing');
            L().chispazo(this, c.x, c.y);
            await Promise.all([
                c.org.reaccion('error'),
                U.tween(this, { targets: this.sensi, angle: { from: -6, to: 6 }, duration: 80, yoyo: true, repeat: 3, onComplete: function () {} })
            ]);
            this.sensi.angle = 0;
            await U.tween(this, { targets: c, x: c.casa.x, y: c.casa.y, scale: 1, duration: 450, ease: 'Back.easeOut' });
            void m;
        },

        /** Estímulo sobre la plataforma (con su efecto repetido). */
        crearEstimulo: function (id, tam) {
            var scene = this, m = this.m(), P = m.plat;
            var c = this.add.container(P.x, P.y).setDepth(12);
            var t = tam || P.tam;
            var halo = this.add.circle(0, 0, t * 0.7, 0xffffff, 0.12);
            c.add(halo);
            if (id === 'tambor') { var d = B.tambor(this, 0, 0, t * 0.95); c.add(d.cont); c.tambor = d; }
            else if (id === 'campana') {
                var cuerpo = this.add.container(0, -t * 0.3);
                var badajo = this.add.image(0, t * 0.05, A().textura(this, 'badajo', 128)).setOrigin(0.5, 0).setDisplaySize(t * 0.3, t * 0.3);
                var img = this.add.image(0, 0, A().textura(this, 'campana', 256)).setDisplaySize(t * 1.05, t * 1.05).setTint(0xf0c890);
                cuerpo.add([badajo, img]); c.add(cuerpo); c.cuerpo = cuerpo; c.badajo = badajo;
                var soporte = this.add.graphics(); soporte.lineStyle(6, 0x56606b, 1); soporte.lineBetween(-t * 0.55, -t * 0.82, t * 0.55, -t * 0.82); soporte.lineBetween(-t * 0.55, -t * 0.82, -t * 0.55, t * 0.4); soporte.lineBetween(t * 0.55, -t * 0.82, t * 0.55, t * 0.4); c.addAt(soporte, 1);
            } else {
                if (id === 'sol') { var rayos = this.add.image(0, 0, A().textura(this, 'sol_rayos', 160)).setDisplaySize(t * 1.1, t * 1.1); c.add(rayos); c.rayos = rayos; }
                c.add(this.add.image(0, 0, A().textura(this, id, 160)).setDisplaySize(t * 0.9, t * 0.9));
            }
            c.id = id; c.tam = t;
            this.estAct = c;
            c.senal = function () {
                var gx = c.x, gy = c.y;
                if (id === 'tambor') c.tambor.sonar();
                else if (id === 'campana') { scene.tanerCampana(c); }
                else if (id === 'flor') U.aroma(scene, gx, gy - t * 0.1, { n: 3, alto: 50, depth: 13 });
                else if (id === 'helado') { var g = scene.add.image(gx + t * 0.12, gy, A().textura(scene, 'gota', 64)).setDisplaySize(10, 14).setDepth(13); scene.tweens.add({ targets: g, y: gy + t * 0.3, alpha: 0, duration: 800, onComplete: function () { g.destroy(); } }); }
                else if (id === 'sol') scene.tweens.add({ targets: c.rayos, angle: '+=40', duration: 1200 });
                else if (id === 'osito') scene.tweens.add({ targets: c, scaleX: 1.08, scaleY: 0.94, duration: 300, yoyo: true });
            };
            return c;
        },

        desvanecer: function (obj) {
            if (this.estAct === obj) this.estAct = null;
            this.tweens.add({ targets: obj, alpha: 0, duration: 300, onComplete: function () { if (obj.active) obj.destroy(); } });
        },

        tanerCampana: function (c) {
            if (Sfx()) Sfx().acompanar('campana', { breve: false, vol: 0.8 });
            c.golpe = this.time.now;
            this.ondaDesde(c.x, c.y - c.tam * 0.3, 0xffd43b);
        },

        /* ── Ronda 1: la campana del documento ─────────────────── */

        rondaCampana: async function () {
            var scene = this, m = this.m(), r = this.reto;
            this.modo = 'campana';
            this.mezclarCartuchos();
            var camp = this.crearEstimulo('campana', m.plat.tam * 0.95);
            camp.alpha = 0;
            await U.tween(this, { targets: camp, alpha: 1, duration: 500 });
            this.pregunta(true);
            this.repique = this.time.addEvent({ delay: 2600, loop: true, callback: function () { camp.senal(); } });
            camp.senal();
            await this.ctx.decir(r.presentacion || { voz: 'zoe', texto: '¡Bienvenido al taller de Sensi! La campana emite ondas de sonido, pero Sensi todavía no tiene sentidos. Instálale la pieza que le permite escucharla.' });
            var ok = false;
            while (!ok) {
                var id = await this.arrastrarPieza('oido');
                if (id === 'oido') { ok = true; break; }
                await Promise.all([this.rechazar(id), this.ctx.decir(r.errorOtro || { voz: 'zeus', texto: 'Su función principal es producir SONIDO. ¿Con qué escuchamos el sonido? ¡Inténtalo otra vez!' })]);
            }
            await this.instalar('oido');
            this.pregunta(false);
            camp.senal();
            for (var i = 0; i < 3; i++) this.time.delayedCall(i * 160, function () { scene.ondaDesde(m.P.oido.x, m.P.oido.y, 0xffd43b); });
            await this.cart.oido.org.reaccion('acierto');
            this.repique.remove();
            await this.afinar(camp);
            await this.ctx.decir(r.acierto || { voz: 'zoe', texto: '¡Muy bien! La campana se relaciona con el oído.' }, { estado: 'acierto' });
            await this.devolver('oido');
            this.tweens.add({ targets: camp, alpha: 0, duration: 400, onComplete: function () { camp.destroy(); } });
            await U.esperar(this, 400);
        },

        /** Verificación del documento: afinar a Sensi girando la perilla hasta que su tono suene igual que la campana. */
        afinar: async function (camp) {
            var scene = this, m = this.m(), PR = m.perilla;
            var ref = [262, 330, 392, 523, 659, 784][Math.floor(Math.random() * 6)];
            var fmin = 200, fmax = 1000, rango = 300;
            this.afina = { ref: ref, fmin: fmin, fmax: fmax, rango: rango };
            var panel = this.add.container(m.w * 0.77, m.h * 0.5).setDepth(35);
            var R = Math.min(m.h * 0.12, m.w * 0.08);
            var fondo = this.add.graphics();
            fondo.fillStyle(0x0b1a2a, 0.95); fondo.fillRoundedRect(-R * 1.7, -R * 1.9, R * 3.4, R * 3.8, 18);
            fondo.lineStyle(3, 0x66d9e8, 1); fondo.strokeRoundedRect(-R * 1.7, -R * 1.9, R * 3.4, R * 3.8, 18);
            panel.add(fondo);
            var tit = this.add.text(0, -R * 1.62, 'Afina a Sensi', { fontFamily: 'Fredoka, Arial', fontStyle: 'bold', fontSize: Math.round(R * 0.28) + 'px', color: '#66d9e8' }).setOrigin(0.5);
            panel.add(tit);
            var dial = this.add.graphics(); var perilla = this.add.graphics(); var leds = this.add.graphics();
            panel.add([dial, perilla, leds]);
            panel.setScale(0.3); panel.alpha = 0;
            await U.tween(this, { targets: panel, scale: 1, alpha: 1, duration: 450, ease: 'Back.easeOut' });
            var est = { ang: 0, arr: false, ultAng: 0, dentro: 0, ok: false };
            var ac = audio(), osc = null, gain = null;
            if (ac) { osc = ac.createOscillator(); gain = ac.createGain(); osc.type = 'sine'; gain.gain.value = 0.0001; osc.connect(gain).connect(ac.destination); osc.start(); }
            var freq = function () { return fmin * Math.pow(fmax / fmin, est.ang / rango); };
            var pintar = function () {
                dial.clear(); perilla.clear(); leds.clear();
                for (var k = 0; k <= 12; k++) { var a = (-210 + k * rango / 12) * Math.PI / 180; dial.lineStyle(3, 0x66d9e8, 0.7); dial.lineBetween(Math.cos(a) * R * 1.05, Math.sin(a) * R * 1.05, Math.cos(a) * R * 1.25, Math.sin(a) * R * 1.25); }
                perilla.fillStyle(0x000000, 0.35); perilla.fillCircle(3, 5, R); perilla.fillStyle(0xadb5bd, 1); perilla.fillCircle(0, 0, R); perilla.fillStyle(0x6c757d, 1); perilla.fillCircle(0, 0, R * 0.8);
                var aa = (-210 + est.ang) * Math.PI / 180;
                perilla.lineStyle(R * 0.14, 0xffd43b, 1); perilla.lineBetween(Math.cos(aa) * R * 0.2, Math.sin(aa) * R * 0.2, Math.cos(aa) * R * 0.78, Math.sin(aa) * R * 0.78);
                var cerca = Math.max(0, 1 - Math.abs(Math.log(freq() / ref)) / 0.5);
                for (var i = 0; i < 5; i++) { leds.fillStyle(cerca > (i + 0.5) / 5 ? [0xff6b6b, 0xff922b, 0xffd43b, 0x94d82d, 0x51cf66][i] : 0x343a40, 1); leds.fillCircle((i - 2) * R * 0.42, R * 1.55, R * 0.13); }
            };
            pintar();
            await this.ctx.decir({ voz: 'zoe', texto: 'Escucha la nota de la campana y gira la perilla hasta que Sensi suene igual.' });
            var referencia = function () { campanita(ref); scene.tanerCampana(camp); };
            referencia();
            var rep = this.time.addEvent({ delay: 4000, loop: true, callback: referencia });
            await new Promise(function (resolver) {
                var pista = U.crearPista(scene, 11000, function (cancelado) {
                    return scene.ctx.mano({ punto: { x: panel.x + R * 0.7, y: panel.y }, holdMs: 300, cancelado: cancelado, arrastre: { dx: -R * 0.5, dy: -R * 0.9, durMs: 1200 } });
                });
                pista.reiniciar();
                var abajo = function (p) {
                    if (Phaser.Math.Distance.Between(p.x, p.y, panel.x, panel.y) > R * 1.5) return;
                    est.arr = true; est.ultAng = Math.atan2(p.y - panel.y, p.x - panel.x);
                    pista.reiniciar(); scene.ctx.quitarMano(); U.sfx('pop');
                    if (gain) gain.gain.setTargetAtTime(0.07, ac.currentTime, 0.02);
                };
                var mover = function (p) {
                    if (!est.arr || !p.isDown) return;
                    var a = Math.atan2(p.y - panel.y, p.x - panel.x), da = a - est.ultAng;
                    while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
                    est.ultAng = a;
                    est.ang = Phaser.Math.Clamp(est.ang + da * 180 / Math.PI, 0, rango);
                    if (osc) osc.frequency.setTargetAtTime(freq(), ac.currentTime, 0.015);
                    pintar();
                };
                var arriba = function () { est.arr = false; if (gain) gain.gain.setTargetAtTime(0.0001, ac.currentTime, 0.05); };
                scene.input.on('pointerdown', abajo); scene.input.on('pointermove', mover); scene.input.on('pointerup', arriba);
                var ev = scene.time.addEvent({
                    delay: 100, loop: true, callback: function () {
                        var cerca = Math.abs(Math.log(freq() / ref)) < 0.045;
                        est.dentro = cerca && !est.arr ? est.dentro + 100 : 0;
                        if (est.dentro >= 600) { ev.remove(); scene.input.off('pointerdown', abajo); scene.input.off('pointermove', mover); scene.input.off('pointerup', arriba); pista.parar(); resolver(); }
                    }
                });
            });
            rep.remove();
            if (gain) gain.gain.setTargetAtTime(0.0001, ac.currentTime, 0.05);
            if (osc) osc.stop(ac.currentTime + 0.3);
            U.sfx('dingDingYay');
            campanita(ref, 1);
            U.estallido(this, panel.x, panel.y, { n: 16, dist: 120, tex: 'nota' });
            await U.esperar(this, 1400);
            await U.tween(this, { targets: panel, scale: 0.3, alpha: 0, duration: 300 });
            panel.destroy();
            void PR;
        },

        mezclarCartuchos: function () {
            var scene = this, orden = U.mezclar(ORDEN.slice());
            orden.forEach(function (id, i) { var c = scene.cart[id]; c.casa = { x: scene.rackX(i), y: scene.m().rackY }; if (!c.puesta) c.setPosition(c.casa.x, c.casa.y); });
        },

        /* ── Ronda 2: los estímulos llegan a Sensi ─────────────── */

        rondaEstimulos: async function () {
            var scene = this, m = this.m();
            this.modo = 'estimulos';
            this.mezclarCartuchos();
            await this.ctx.decir({ voz: 'zeus', texto: '¡Llegan más estímulos al taller! Instala en Sensi la pieza que percibe cada uno.' });
            var orden = U.mezclar(['tambor', 'flor', 'helado', 'sol', 'osito']);
            var frases = ['¡Instalado!', '¡Muy bien!', '¡Otro sentido!', '¡Excelente!', '¡Sensi ya siente todo!'];
            for (var i = 0; i < orden.length; i++) {
                var id = orden[i];
                var est = this.crearEstimulo(id);
                est.alpha = 0; est.y -= 50;
                await U.tween(this, { targets: est, alpha: 1, y: m.plat.y, duration: 450, ease: 'Back.easeOut' });
                this.pregunta(true);
                var senal = this.time.addEvent({ delay: 2200, loop: true, callback: (function (e) { return function () { if (e.active) e.senal(); }; })(est) });
                est.senal();
                var ok = false;
                while (!ok) {
                    var pieza = await this.arrastrarPieza(SENTIDO[id]);
                    if (pieza === SENTIDO[id]) { ok = true; break; }
                    await Promise.all([this.rechazar(pieza), this.ctx.decir({ voz: 'zeus', texto: '¡Ups! ' + POR_QUE[id] })]);
                }
                senal.remove();
                this.pregunta(false);
                await this.instalar(SENTIDO[id]);
                await this.cart[SENTIDO[id]].org.reaccion('acierto');
                est.senal();
                this.ctx.decir({ voz: 'zoe', texto: frases[i] + ' ' + POR_QUE[id] }, { estado: 'acierto' });
                await U.esperar(this, 1000);
                await this.devolver(SENTIDO[id]);
                this.desvanecer(est);
                await U.esperar(this, 350);
            }
            void scene;
        },

        /* ── Ronda 3: escucha sin mirar ────────────────────────── */

        rondaEscucha: async function () {
            var scene = this, m = this.m(), P = m.plat;
            this.modo = 'escucha';
            await this.instalar('oido');
            // Caja misteriosa con cortina sobre la plataforma.
            var caja = { x: P.x, y: P.y, w: P.tam * 1.5, h: P.tam * 1.3 };
            var cortina = this.add.graphics().setDepth(16);
            var abrir = { k: 0 };
            var pintar = function () {
                cortina.clear();
                cortina.fillStyle(0x23303c, 1); cortina.fillRoundedRect(caja.x - caja.w / 2 - 8, caja.y - caja.h / 2 - 8, caja.w + 16, caja.h + 16, 10);
                var mitad = (caja.w / 2) * (1 - abrir.k);
                for (var lado = -1; lado <= 1; lado += 2) for (var i = 0; i < 6; i++) {
                    var ancho = mitad / 6;
                    var x0 = lado < 0 ? caja.x - caja.w / 2 + i * ancho : caja.x + caja.w / 2 - (i + 1) * ancho;
                    cortina.fillStyle(i % 2 ? 0x9c1f1f : 0xc92a2a, 1); cortina.fillRect(x0, caja.y - caja.h / 2, ancho + 1, caja.h);
                }
            };
            pintar();
            var opciones = ['campana', 'tambor', 'maracas', 'pandereta'];
            var sonido = { campana: 'campana', tambor: 'tambor', maracas: 'maracas', pandereta: 'pandereta' };
            var tex = { campana: 'campana', tambor: 'tambor', maracas: 'maraca', pandereta: 'pandereta' };
            var orden = U.mezclar(opciones).slice(0, 3);
            await this.ctx.decir({ voz: 'zoe', texto: 'Ahora Sensi escucha sin mirar. ¿Qué instrumento suena detrás de la cortina?' });
            for (var r = 0; r < 3; r++) {
                var objetivo = orden[r];
                var cartas = U.mezclar([objetivo].concat(U.mezclar(opciones.filter(function (o) { return o !== objetivo; })).slice(0, 2)));
                var tam = Math.max(64, Math.min(m.w * 0.11, 108));
                var cont = cartas.map(function (id, i) {
                    var x = m.w * 0.5 + (i - 1) * tam * 1.45 + m.w * 0.17, y = m.h * 0.22;
                    var k = scene.add.container(x, y).setDepth(18);
                    var g = scene.add.graphics();
                    g.fillStyle(0xf8f9fa, 1); g.fillRoundedRect(-tam / 2, -tam / 2, tam, tam, 14);
                    g.lineStyle(4, 0x66d9e8, 1); g.strokeRoundedRect(-tam / 2, -tam / 2, tam, tam, 14);
                    k.add([g, scene.add.image(0, 0, A().textura(scene, tex[id], 160)).setDisplaySize(tam * 0.78, tam * 0.78)]);
                    k.id = id; k.tam = tam; k.alpha = 0;
                    scene.tweens.add({ targets: k, alpha: 1, duration: 300, delay: i * 100 });
                    return k;
                });
                var oculto = this.add.image(caja.x, caja.y, A().textura(this, tex[objetivo], 200)).setDisplaySize(caja.h * 0.7, caja.h * 0.7).setDepth(15);
                var tocar = function () {
                    if (Sfx()) Sfx().reproducir(sonido[objetivo], { breve: false, vol: 0.9 });
                    scene.ondaDesde(caja.x, caja.y, 0x66d9e8);
                    scene.cart.oido.org.reaccion('toca');
                    scene.tweens.add({ targets: cortina, x: { from: -3, to: 3 }, duration: 70, yoyo: true, repeat: 3, onComplete: function () { cortina.x = 0; } });
                };
                await U.esperar(this, 500);
                tocar();
                var rep = this.time.addEvent({ delay: 4200, loop: true, callback: tocar });
                await new Promise(function (resolver) {
                    var ocupado = false;
                    var pista = U.crearPista(scene, 9000, function (cancelado) {
                        var k = cont.find(function (kk) { return kk.id === objetivo; });
                        return scene.ctx.mano({ punto: { x: k.x, y: k.y }, holdMs: 400, cancelado: cancelado });
                    });
                    pista.reiniciar();
                    var toque = function (p) {
                        if (ocupado) return;
                        var k = cont.find(function (kk) { return Math.abs(p.x - kk.x) < kk.tam / 2 && Math.abs(p.y - kk.y) < kk.tam / 2; });
                        if (!k) return;
                        pista.reiniciar(); scene.ctx.quitarMano();
                        if (k.id === objetivo) { scene.input.off('pointerdown', toque); pista.parar(); resolver(); return; }
                        ocupado = true;
                        scene.tweens.add({ targets: k, angle: { from: -8, to: 8 }, duration: 80, yoyo: true, repeat: 2, onComplete: function () { k.angle = 0; } });
                        if (Sfx()) Sfx().reproducir(sonido[k.id], { breve: true, vol: 0.8 });
                        scene.ctx.decir({ voz: 'zeus', texto: { campana: 'Así suena la campana', tambor: 'Así suena el tambor', maracas: 'Así suenan las maracas', pandereta: 'Así suena la pandereta' }[k.id] + '. Escucha otra vez lo que hay detrás de la cortina.' });
                        scene.time.delayedCall(1800, function () { tocar(); ocupado = false; });
                    };
                    scene.input.on('pointerdown', toque);
                });
                rep.remove();
                U.sfx('magia');
                await U.tween(this, { targets: abrir, k: 1, duration: 700, ease: 'Sine.easeOut', onUpdate: pintar });
                if (Sfx()) Sfx().reproducir(sonido[objetivo], { breve: true });
                U.estallido(this, caja.x, caja.y, { n: 14, dist: 120 });
                await this.cart.oido.org.reaccion('acierto');
                var frases = ['¡Sí! El oído lo reconoció sin mirar.', '¡Muy bien! Escuchamos con el oído.', '¡Qué oído tan fino!'];
                await this.ctx.decir({ voz: 'zoe', texto: frases[r] }, { estado: 'acierto' });
                cont.forEach(function (k) { k.destroy(); });
                oculto.destroy();
                abrir.k = 0; pintar();
            }
            this.tweens.add({ targets: cortina, alpha: 0, duration: 400, onComplete: function () { cortina.destroy(); } });
            await this.devolver('oido');
        },

        /* ── Ronda 4: ¿dónde suena? ────────────────────────────── */

        rondaBuscar: async function () {
            var scene = this, m = this.m();
            this.modo = 'buscar';
            await this.instalar('oido');
            var Rb = Math.max(52, Math.min(m.w, m.h) * 0.09);
            var xMin = m.w * 0.3, xMax = m.w - 190, yMin = 130, yMax = m.h * 0.72;
            var pts = [];
            for (var i = 0; i < 300 && pts.length < 4; i++) {
                var q = { x: U.rnd(xMin, xMax), y: U.rnd(yMin, yMax) };
                if (pts.every(function (o) { return Phaser.Math.Distance.Between(o.x, o.y, q.x, q.y) > m.w * 0.16; })) pts.push(q);
            }
            this.campanasB = pts.map(function (q) {
                var c = scene.add.container(q.x, q.y).setDepth(8);
                var img = scene.add.image(0, 0, A().textura(scene, 'campana', 200)).setDisplaySize(m.h * 0.12, m.h * 0.12).setAlpha(0);
                c.add(img);
                c.img = img; c.hecha = false; c.oye = 0; c.R = Rb;
                return c;
            });
            // Antena parabólica de Sensi (el cursor).
            this.mic = this.add.container(m.w * 0.62, (yMin + yMax) / 2).setDepth(19);
            var mg = this.add.graphics();
            mg.lineStyle(6, 0x8896a8, 1); mg.lineBetween(0, 10, 0, 64);
            mg.fillStyle(0x000000, 0.3); mg.fillEllipse(4, 6, 70, 32);
            mg.fillStyle(0xdee2e6, 1); mg.fillEllipse(0, 0, 70, 32);
            mg.lineStyle(4, 0x6c757d, 1); mg.strokeEllipse(0, 0, 70, 32);
            mg.fillStyle(0x6c757d, 1); mg.fillEllipse(0, 2, 46, 18);
            mg.fillStyle(0xff6b6b, 1); mg.fillCircle(0, -4, 6);
            this.mic.add(mg);
            this.mic.R = Rb;
            this.mic.setAlpha(0);
            this.tweens.add({ targets: this.mic, alpha: 1, duration: 400 });
            this.medidor = this.add.graphics().setDepth(19);
            this.hallazgos = 0;
            this.proxTic = 0;
            this.buscando = false;
            await this.ctx.decir({ voz: 'zoe', texto: '¡Hay cuatro campanas escondidas en el taller! Mueve la antena de Sensi y escucha: suena más fuerte cuando estás cerca.' });
            var cv = function (p) { scene.mic.setPosition(Phaser.Math.Clamp(p.x, 40, m.w - 40), Phaser.Math.Clamp(p.y, 120, m.h * 0.78)); };
            var abajo = function (p) { scene.pista.reiniciar(); scene.ctx.quitarMano(); cv(p); };
            var mover = function (p) { if (p.isDown) { scene.pista.reiniciar(); cv(p); } };
            this.input.on('pointerdown', abajo);
            this.input.on('pointermove', mover);
            this.pista = U.crearPista(this, 9000, function (cancelado) {
                var b = scene.campanasB.find(function (k) { return !k.hecha; });
                if (!b) return Promise.resolve();
                return scene.ctx.mano({ punto: { x: scene.mic.x, y: scene.mic.y }, holdMs: 250, cancelado: cancelado, arrastre: { dx: b.x - scene.mic.x, dy: b.y - scene.mic.y, durMs: 1300 } });
            });
            this.pista.reiniciar();
            this.buscando = true;
            await new Promise(function (r) { scene.finBuscar = r; });
            this.buscando = false;
            this.input.off('pointerdown', abajo);
            this.input.off('pointermove', mover);
            this.pista.parar();
            this.ctx.quitarMano();
            this.medidor.destroy();
            this.tweens.add({ targets: this.mic, alpha: 0, duration: 400, onComplete: function () { scene.mic.destroy(); } });
            this.campanasB.forEach(function (k) { scene.desvanecer(k); });
            await this.devolver('oido');
            this.modo = '';
        },

        oirBuscar: function (time, dt) {
            var scene = this, m = this.m();
            var restantes = this.campanasB.filter(function (k) { return !k.hecha; });
            if (!restantes.length) return;
            var cerca = null, dmin = 1e9;
            restantes.forEach(function (k) {
                var d = Phaser.Math.Distance.Between(k.x, k.y, scene.mic.x, scene.mic.y);
                if (d < dmin) { dmin = d; cerca = k; }
                var dentro = d < scene.mic.R * 0.9;
                k.oye = Math.max(0, Math.min(1, k.oye + (dentro ? dt / 1.0 : -dt * 1.2)));
                k.img.setAlpha(k.oye * 0.9);
                if (k.oye >= 1) scene.hallar(k);
            });
            var alcance = m.w * 0.55;
            var fuerza = Math.max(0, 1 - dmin / alcance);
            if (time > this.proxTic && cerca) {
                this.proxTic = time + 1500 - fuerza * 1000;
                var S = Sfx();
                if (S) S.reproducir('campana', { breve: true, vol: 0.12 + fuerza * 0.88, pan: Phaser.Math.Clamp((cerca.x - this.mic.x) / (m.w * 0.5), -1, 1) });
                this.ondaDesde(this.mic.x, this.mic.y, 0xffd43b);
            }
            var g = this.medidor;
            g.clear();
            var bx = 200, by = 150;
            for (var i = 0; i < 5; i++) {
                var on = fuerza * 5 > i + 0.2;
                g.fillStyle(on ? [0x51cf66, 0x94d82d, 0xfcc419, 0xff922b, 0xff6b6b][i] : 0x343a40, 1);
                g.fillRoundedRect(bx + i * 22, by - (i + 1) * 9, 16, (i + 1) * 9, 3);
            }
        },

        hallar: async function (k) {
            if (k.hecha) return;
            k.hecha = true;
            this.hallazgos += 1;
            var S = Sfx();
            if (S) S.reproducir('campana', { breve: true });
            U.sfx('recompensa');
            this.tweens.add({ targets: k.img, alpha: 1, scale: 1.25, duration: 250, yoyo: true });
            this.tweens.add({ targets: k, angle: { from: -16, to: 16 }, duration: 110, yoyo: true, repeat: 4 });
            var p = this.m().P.oido;
            U.notas(this, k.x, k.y - 20, 4, { x: p.x, y: p.y });
            this.cart.oido.org.reaccion('acierto');
            if (this.hallazgos === 2) this.ctx.decir({ voz: 'zoe', texto: '¡Muy bien! Los oídos escuchan dónde suena la campana.' }, { estado: 'acierto' });
            if (this.hallazgos >= 4 && this.finBuscar) {
                var fin = this.finBuscar;
                this.finBuscar = null;
                await this.ctx.decir({ voz: 'zeus', texto: '¡Las encontraste todas! Los oídos nos ayudan a saber de dónde viene el sonido.' }, { estado: 'acierto' });
                fin();
            }
        },

        /* ── API ───────────────────────────────────────────────── */

        demo: async function () {
            var scene = this, m = this.m(), ctx = this.ctx;
            var t = ctx.textos || {};
            this.modo = 'demo';
            var d = B.tambor(this, m.plat.x, m.plat.y, m.plat.tam * 0.9);
            d.cont.alpha = 0;
            this.tweens.add({ targets: d.cont, alpha: 1, duration: 500 });
            this.pregunta(true);
            var limpiar = function () { scene.pregunta(false); scene.tweens.add({ targets: d.cont, alpha: 0, duration: 350, onComplete: function () { d.cont.destroy(); } }); ctx.quitarMano(); scene.modo = ''; };
            await ctx.decir({ voz: 'zoe', texto: t.demostracion || '¡Mira cómo se juega!' }, { minMs: 2200 });
            if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
            await ctx.mano({ punto: { x: d.cont.x, y: d.cont.y }, holdMs: 600, onPresionar: function () { d.sonar(); } });
            await U.esperar(this, 300);
            if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
            var c = this.cart.oido;
            await ctx.mano({
                punto: { x: c.x, y: c.y }, holdMs: 300,
                arrastre: { dx: m.cx - c.x, dy: (m.base - m.SH * 0.35) - c.y, durMs: 1100, soltarEnDestino: true },
                onDuranteArrastre: function () { scene.tweens.add({ targets: c, x: m.cx, y: m.base - m.SH * 0.35, duration: 1100, ease: 'Sine.easeInOut' }); }
            });
            if (!ctx.vivo()) return limpiar();
            await this.instalar('oido');
            this.pregunta(false);
            d.sonar();
            await c.org.reaccion('acierto');
            await ctx.decir({ voz: 'zoe', texto: t.demostracionAcierto || '¡Así se hace!' }, { estado: 'acierto', minMs: 1600 });
            await ctx.decir({ voz: 'zoe', texto: t.demostracionFin || '¡Ahora te toca a ti!' }, { minMs: 1200 });
            await this.devolver('oido');
            limpiar();
            await U.esperar(this, 400);
        },

        jugar: async function () {
            await this.rondaCampana();
            if (!this.ctx.vivo()) return;
            if (this.ganarNivel) await this.ganarNivel(0);
            await this.rondaEstimulos();
            if (!this.ctx.vivo()) return;
            if (this.ganarNivel) await this.ganarNivel(1);
            await this.rondaEscucha();
            if (!this.ctx.vivo()) return;
            if (this.ganarNivel) await this.ganarNivel(2);
            await this.rondaBuscar();
            if (!this.ctx.vivo()) return;
            if (this.ganarNivel) await this.ganarNivel(3);
        },

        /** Final: Sensi recibe los cinco sentidos, se enciende, baila y su señal llega al cerebro. */
        fiestaFinal: async function () {
            var scene = this, m = this.m();
            this.modo = 'final';
            this.ctx.decir({ voz: 'zoe', texto: '¡Sensi despierta! Mira cómo las señales viajan desde cada sentido hasta su cerebro.' });
            for (var i = 0; i < ORDEN.length; i++) {
                if (!this.cart[ORDEN[i]].puesta) { await this.instalar(ORDEN[i]); }
                this.cart[ORDEN[i]].org.reaccion('acierto');
                await U.esperar(this, 250);
            }
            await U.esperar(this, 500);
            var cer = this.add.ellipse(m.cx, m.base - m.SH * 0.8, m.SH * 0.22, m.SH * 0.11, 0xf783ac, 0.4).setStrokeStyle(3, 0xfaa2c1).setDepth(11);
            var lista = [{ id: 'campana', organo: 'oido' }, { id: 'flor', organo: 'nariz' }, { id: 'helado', organo: 'lengua' }, { id: 'sol', organo: 'ojo' }];
            var x0 = m.w * 0.12, paso = (m.w * 0.78 - x0) / 3;
            for (var j = 0; j < lista.length; j++) {
                var it = lista[j], p = m.P[it.organo];
                var ico = this.add.container(x0 + j * paso, m.h * 0.16).setDepth(32);
                ico.add([this.add.circle(0, 0, 34, 0x1b2a4a).setStrokeStyle(3, COLOR[it.organo]), this.add.image(0, 0, A().textura(this, it.id, 128)).setDisplaySize(54, 54)]);
                ico.setScale(0.1);
                await U.tween(this, { targets: ico, scale: 1, duration: 350, ease: 'Back.easeOut' });
                var chispa = this.add.circle(ico.x, ico.y, 10, COLOR[it.organo]).setDepth(33).setBlendMode(Phaser.BlendModes.ADD);
                await U.tween(this, { targets: chispa, x: p.x, y: p.y, duration: 650, ease: 'Sine.easeIn' });
                U.sfx('chispas');
                await U.tween(this, { targets: chispa, x: cer.x, y: cer.y, duration: 650, ease: 'Sine.easeOut' });
                chispa.destroy();
                this.tweens.add({ targets: cer, scale: { from: 1.3, to: 1 }, alpha: { from: 1, to: 0.7 }, duration: 400 });
            }
            cer.setFillStyle(0xf783ac, 0.95);
            U.estallido(this, cer.x, cer.y, { n: 20, dist: 140, depth: 88 });
            U.confeti(this, 100);
            // Sensi baila.
            this.tweens.add({ targets: this.sensi, y: this.sensi.y - 26, angle: { from: -4, to: 4 }, duration: 300, yoyo: true, repeat: 7, ease: 'Sine.easeInOut' });
            var tt = L().titulo(this, '¡Ingeniero de Conexiones Sensoriales!', { y: m.h - 46, x: (m.w - 140) / 2, ancho: m.w - 190 });
            U.sfx('celebracion');
            await U.esperar(this, 3200);
            void tt; void scene;
        },

        update: function (time, delta) {
            var scene = this, dt = Math.min(delta || 16, 50) / 1000, m = this.m(), s = time / 1000;
            if (this.modo === 'buscar' && this.buscando && this.mic && this.mic.active && this.campanasB) this.oirBuscar(time, dt);
            ORDEN.forEach(function (id) {
                var c = scene.cart[id];
                if (!c || !c.org) return;
                c.org.actualizar(time);
                // Brillo del cartucho al acercarse el dedo o mientras se arrastra.
                var p = scene.input.activePointer, cerca = !c.puesta && Math.abs(p.x - c.x) < c.tam * 0.6 && Math.abs(p.y - c.y) < c.tam * 0.6;
                c.luz.fillAlpha += ((cerca ? 0.28 : (c.puesta ? 0.18 : 0)) - c.luz.fillAlpha) * Math.min(1, dt * 8);
            });
            var S = this.sensi;
            if (S && S.active) {
                var SH = m.SH;
                // Mirada: la cabeza sigue al dedo, al estímulo o se mueve sola; el torso respira y los brazos se mecen.
                var ptr = this.input.activePointer, objetivo = 0;
                if (ptr.isDown) objetivo = Phaser.Math.Clamp((ptr.x - m.cx) / m.w * 14, -6, 6);
                else if (this.estAct && this.estAct.active) objetivo = Phaser.Math.Clamp((this.estAct.x - m.cx) / m.w * 14, -6, 6);
                else objetivo = Math.sin(s * 0.5) * 2.5;
                S.cabeza.angle += (objetivo - S.cabeza.angle) * Math.min(1, dt * 5);
                S.cabeza.y = -0.4 * SH + Math.sin(s * 1.9) * 1.2;
                S.torso.scaleY = 1 + Math.sin(s * 1.9) * 0.008;
                S.brazoI.angle = Math.sin(s * 1.3) * 2.5;
                S.brazoD.angle = Math.sin(s * 1.3 + 1.2) * 2.5;
                var tg = S.tomas, tm = S.tomasM;
                tg.clear(); tm.clear();
                ORDEN.forEach(function (id) {
                    var p = m.P[id], lx = p.x - m.cx, ly = p.y - m.base;
                    var libre = !scene.encendidos[id];
                    var pulso = libre ? 0.45 + 0.35 * Math.sin(s * 3 + p.r) : 1;
                    var G = id === 'mano' ? tm : tg, yy = id === 'mano' ? ly : ly + 0.4 * SH;
                    if (!libre) { G.fillStyle(COLOR[id], 0.16 + 0.08 * Math.sin(s * 3)); G.fillCircle(lx, yy, p.r * 1.9); }
                    G.fillStyle(0x05090e, 1);
                    if (id === 'lengua') G.fillRoundedRect(lx - p.r * 1.3, yy - p.r * 0.5, p.r * 2.6, p.r, 6); else G.fillCircle(lx, yy, p.r * 1.12);
                    G.lineStyle(3, COLOR[id], pulso);
                    if (id === 'lengua') G.strokeRoundedRect(lx - p.r * 1.3, yy - p.r * 0.5, p.r * 2.6, p.r, 6); else G.strokeCircle(lx, yy, p.r * 1.12);
                    if (libre) { G.lineStyle(1.5, 0xffffff, 0.18); if (id !== 'lengua') G.strokeCircle(lx, yy, p.r * 0.6); }
                });
                // Perilla del pecho (con brillo metálico).
                var pr = m.perilla, px = pr.x - m.cx, py = pr.y - m.base;
                tm.fillStyle(0x000000, 0.35); tm.fillCircle(px + 2, py + 3, pr.r * 0.95);
                tm.fillStyle(0xaeb9c6, 1); tm.fillCircle(px, py, pr.r * 0.9); tm.fillStyle(0x6d7b8a, 1); tm.fillCircle(px, py, pr.r * 0.7);
                tm.fillStyle(0xffffff, 0.35); tm.fillEllipse(px - pr.r * 0.25, py - pr.r * 0.3, pr.r * 0.5, pr.r * 0.25);
                tm.fillStyle(0xffd43b, 1); tm.fillRoundedRect(px - pr.r * 0.08, py - pr.r * 0.62, pr.r * 0.16, pr.r * 0.5, 3);
                // Luces del pecho: barrido de arranque.
                ORDEN.forEach(function (id, i) { if (scene.encendidos[id]) S.luces[id].setAlpha(0.8 + 0.2 * Math.sin(s * 4 + i)); });
            }
            if (this.preg && this.preg.alpha > 0.05) this.preg.y = m.base - m.SH * 0.78 + Math.sin(time / 350) * 6;
            // Lámpara colgante con cono de luz volumétrico y polvo flotando.
            var lg = this.lampG; lg.clear();
            var sw = Math.sin(s / 1.5) * 5, lx0 = m.cx + sw, ly0 = m.h * 0.12;
            lg.lineStyle(4, 0x3a4350, 1); lg.lineBetween(m.cx, 0, lx0, ly0 - m.h * 0.035);
            lg.fillStyle(0x56606b, 1); lg.fillTriangle(lx0 - 44, ly0 + 6, lx0 + 44, ly0 + 6, lx0, ly0 - m.h * 0.05);
            lg.fillStyle(0x8794a4, 1); lg.fillTriangle(lx0 - 44, ly0 + 6, lx0 - 10, ly0 + 6, lx0 - 6, ly0 - m.h * 0.05);
            lg.fillStyle(0xfff0b8, 1); lg.fillEllipse(lx0, ly0 + 8, 54, 14);
            var luzG = this.luzG; luzG.clear();
            var bright = 0.07 + this.luzAmb * 0.06 + (this.destelloT && time - this.destelloT < 300 ? 0.08 : 0);
            luzG.fillStyle(0xfff0b8, bright); luzG.fillTriangle(lx0 - 26, ly0 + 10, lx0 + 26, ly0 + 10, lx0 + 210, m.base + 20); luzG.fillTriangle(lx0 - 26, ly0 + 10, lx0 + 210, m.base + 20, lx0 - 210, m.base + 20);
            luzG.fillStyle(0xfff0b8, bright * 0.7); luzG.fillTriangle(lx0 - 14, ly0 + 10, lx0 + 14, ly0 + 10, lx0 + 110, m.base + 20); luzG.fillTriangle(lx0 - 14, ly0 + 10, lx0 + 110, m.base + 20, lx0 - 110, m.base + 20);
            // Luz de ambiente cuando el sol está en la plataforma.
            this.luzAmb += (((this.estAct && this.estAct.active && this.estAct.id === 'sol') ? 1 : 0) - this.luzAmb) * Math.min(1, dt * 2);
            if (this.luzAmb > 0.02) { luzG.fillStyle(0xffe08a, 0.1 * this.luzAmb); luzG.fillRect(0, 0, m.w, m.h); var P = m.plat; luzG.fillStyle(0xffe9a8, 0.12 * this.luzAmb); luzG.fillCircle(P.x, P.y, m.h * 0.45); }
            // Anillo del proyector holográfico y haz de luz bajo el estímulo.
            if (this.estAct && this.estAct.active && this.estAct.alpha > 0.05) {
                var E = this.estAct, ey = m.plat.y + m.plat.tam * 0.6, al = E.alpha * (0.55 + 0.2 * Math.sin(s * 4));
                luzG.lineStyle(4, 0x66d9e8, al); luzG.strokeEllipse(E.x, ey, m.plat.tam * 1.15, m.plat.tam * 0.26); luzG.lineStyle(2, 0x66d9e8, al * 0.6); luzG.strokeEllipse(E.x, ey, m.plat.tam * 0.8, m.plat.tam * 0.18);
                luzG.fillStyle(0x66d9e8, 0.1 * E.alpha); luzG.fillTriangle(E.x - m.plat.tam * 0.55, ey, E.x + m.plat.tam * 0.55, ey, E.x, ey - m.plat.tam * 1.2);
            }
            // Polvo en suspensión dentro del cono de luz.
            var pg = this.polvoG; pg.clear();
            this.polvo.forEach(function (d) {
                d.y += d.v * dt; if (d.y > 1) d.y = 0;
                var yy = ly0 + (m.base - ly0) * d.y, ancho = (yy - ly0) / (m.base - ly0) * 190;
                var xx = lx0 + d.x * 2 * ancho + Math.sin(s + d.f) * 8;
                pg.fillStyle(0xfff6d0, 0.18 + 0.25 * Math.abs(Math.sin(s * 1.2 + d.f)));
                pg.fillCircle(xx, yy, d.r);
            });
            // Campana de la plataforma: péndulo amortiguado tras cada golpe.
            this.children.list.forEach(function (o) {
                if (o.type === 'Container' && o.id === 'campana' && o.cuerpo && !U.reducido()) {
                    var tg2 = o.golpe ? (time - o.golpe) / 1000 : 9;
                    var amp = Math.exp(-tg2 * 1.6) * 0.3 + 0.02;
                    o.cuerpo.rotation = Math.sin(time / 260) * amp;
                    o.badajo.rotation = -Math.sin(time / 260 - 0.6) * amp * 1.4;
                }
            });
            // Ondas de sonido.
            this.ondas.clear();
            this.anillos = this.anillos.filter(function (a) {
                var k = (time - a.t0) / 900;
                if (k < 0) return true;
                if (k >= 1) return false;
                scene.ondas.lineStyle(4 * (1 - k), a.color, 1 - k);
                scene.ondas.strokeCircle(a.x, a.y, 30 + k * 90);
                return true;
            });
        },

        estado: function () {
            return { modo: this.modo, hallazgos: this.hallazgos, puestas: ORDEN.filter(function (id) { return this.cart[id] && this.cart[id].puesta; }, this) };
        }
    };

    global.PedniaSensi = B.crearMotor({ id: 'sensi', fondo: '#203a43', extras: true, escena: escena });
})(typeof window !== 'undefined' ? window : this);
