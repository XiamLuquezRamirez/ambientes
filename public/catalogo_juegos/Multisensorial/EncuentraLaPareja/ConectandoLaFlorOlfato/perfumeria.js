/**
 * PedniaPerfumeria — «La perfumería» (Conectando la flor — Olfato, 5-6 años).
 *
 * Una perfumería antigua: estantes de frascos, alambique de cobre, balanza y un mostrador de madera.
 * Cada PEDIDO llega en una hojita; para entregarlo se SELLA con el sello del sentido que lo percibe
 * (cinco sellos de madera con el dibujo de cada órgano).
 *   1. La flor        (reto del documento): se gira la manivela del alambique para DESTILAR los pétalos; el
 *                     frasco se llena y se destapa: salen moléculas de aroma y se atrapan con el cono de
 *                     oler (las notas y los destellos no son aroma). Luego se sella el pedido con la nariz.
 *   2. Los pedidos    tambor, flor, helado, sol y osito: se sella cada hojita con el sello del sentido.
 *   3. Aroma escondido  cuatro frascos cerrados: se acerca el cono para oler su vapor y se lleva al cliente el
 *                     frasco que huele a lo que pide.
 *   4. La receta      se vierten tres ingredientes en la probeta hasta la raya marcada (mantener pulsado).
 *   Cierre: el certificado de Ingeniero con los cuatro sellos.
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
    var TINTA = { oido: 0xb8860b, ojo: 0x1c7ed6, nariz: 0xc2255c, lengua: 0xc92a2a, mano: 0x2b8a3e };
    var TEX_ORGANO = { oido: 'oreja', ojo: 'ojo', nariz: 'nariz', lengua: 'boca', mano: 'mano' };
    var ORDEN = ['oido', 'ojo', 'nariz', 'lengua', 'mano'];

    function rg(i) { var x = Math.sin(i * 127.1 + 11.7) * 43758.5453; return x - Math.floor(x); }

    var escena = {
        create: function () {
            var scene = this;
            this.modo = '';
            this.contFondo = 0;
            this.sellos = {};
            this.destila = 0;
            this.parts = [];
            this.polvo = [];
            for (var i = 0; i < 30; i++) this.polvo.push({ x: rg(i), y: rg(i + 9), r: 1 + rg(i + 3) * 1.8, v: 0.008 + rg(i + 5) * 0.02, f: rg(i + 7) * 6 });
            this.dibujarFondo();
            this.crearSellos();
            this.alambiqueG = this.add.graphics().setDepth(6);
            this.frascoG = this.add.graphics().setDepth(8);
            this.hojaG = this.add.graphics().setDepth(11);
            this.fxG = this.add.graphics().setDepth(36);
            this.polvoG = this.add.graphics().setDepth(5);
            this.luzG = this.add.graphics().setDepth(4);
            this.slip = null;
            this.scale.on('resize', function () { scene.dibujarFondo(); scene.ubicar(); });
        },

        m: function () {
            var w = this.scale.width, h = this.scale.height;
            var mesaY = h * 0.78, card = Math.min(h * 0.12, w * 0.085);
            var sw = Math.min(w * 0.2, 250);
            return {
                w: w, h: h, mesaY: mesaY, card: card,
                hoja: { x: w * 0.52, y: h * 0.4, w: sw, h: sw * 1.1 },
                rackY: h * 0.9,
                alambique: { x: w * 0.21, y: h * 0.5, u: h * 0.17 },
                manivela: { x: w * 0.21 + h * 0.17 * 1.5, y: h * 0.62, r: h * 0.075 },
                frasco: { x: w * 0.36, y: mesaY - h * 0.06, w: h * 0.09, h: h * 0.13 },
                probeta: { x: w * 0.5, y: mesaY - h * 0.15, w: h * 0.1, h: h * 0.3 }
            };
        },
        rackX: function (i) { var m = this.m(); return m.w * 0.3 + i * (m.w * 0.48 / 4); },

        /* ── Escenario: la perfumería ──────────────────────────── */

        dibujarFondo: function () {
            var m = this.m(), w = m.w, h = m.h, mesaY = m.mesaY;
            var clave = 'perf_fondo_' + (this.contFondo++);
            var t = this.textures.createCanvas(clave, Math.max(2, Math.ceil(w)), Math.max(2, Math.ceil(h)));
            var c = t.getContext();
            var rr = function (x, y, ww, hh, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, ww, hh, r); else c.rect(x, y, ww, hh); };
            // Pared: papel pintado con óvalos y zócalo de madera.
            var g = c.createLinearGradient(0, 0, 0, mesaY); g.addColorStop(0, '#e9dcc0'); g.addColorStop(1, '#d3c19a'); c.fillStyle = g; c.fillRect(0, 0, w, h);
            c.fillStyle = 'rgba(120,150,120,0.16)';
            for (var yy = 20; yy < mesaY; yy += 56) for (var xx = 20 + ((yy / 56) % 2) * 28; xx < w; xx += 56) { c.beginPath(); c.ellipse(xx, yy, 9, 15, 0, 0, 6.2832); c.fill(); c.beginPath(); c.ellipse(xx, yy, 3, 5, 0, 0, 6.2832); c.fillStyle = 'rgba(160,110,60,0.22)'; c.fill(); c.fillStyle = 'rgba(120,150,120,0.16)'; }
            c.fillStyle = '#5a3a22'; c.fillRect(0, mesaY - h * 0.1, w, h * 0.1);
            c.fillStyle = 'rgba(255,230,190,0.18)'; c.fillRect(0, mesaY - h * 0.1, w, 4);
            c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 2; for (var p = 0; p < 12; p++) { c.beginPath(); c.moveTo(p * w / 12, mesaY - h * 0.1); c.lineTo(p * w / 12, mesaY); c.stroke(); }
            // Frascos de cristal sobre un estante.
            var botella = function (bx, by, bw, bh, col, tipo, seed) {
                c.save(); c.shadowColor = 'rgba(40,20,5,0.45)'; c.shadowBlur = 8; c.shadowOffsetX = 3; c.shadowOffsetY = 4;
                var gv = c.createLinearGradient(bx, 0, bx + bw, 0); gv.addColorStop(0, 'rgba(255,255,255,0.55)'); gv.addColorStop(0.3, 'rgba(210,235,240,0.4)'); gv.addColorStop(1, 'rgba(120,150,160,0.5)');
                c.fillStyle = gv;
                if (tipo === 0) { c.beginPath(); c.arc(bx + bw / 2, by + bh * 0.62, bw * 0.5, 0, 6.2832); c.fill(); c.fillRect(bx + bw * 0.38, by, bw * 0.24, bh * 0.3); }
                else if (tipo === 1) { rr(bx, by + bh * 0.2, bw, bh * 0.8, 6); c.fill(); c.fillRect(bx + bw * 0.34, by, bw * 0.32, bh * 0.22); }
                else { c.beginPath(); c.moveTo(bx + bw * 0.4, by); c.lineTo(bx + bw * 0.6, by); c.lineTo(bx + bw * 0.66, by + bh * 0.35); c.quadraticCurveTo(bx + bw, by + bh * 0.5, bx + bw, by + bh); c.lineTo(bx, by + bh); c.quadraticCurveTo(bx, by + bh * 0.5, bx + bw * 0.34, by + bh * 0.35); c.closePath(); c.fill(); }
                c.restore();
                c.fillStyle = col; c.globalAlpha = 0.85; var nv = 0.25 + rg(seed) * 0.4; rr(bx + bw * 0.12, by + bh * (1 - nv) - 3, bw * 0.76, bh * nv, 5); c.fill(); c.globalAlpha = 1;
                c.fillStyle = 'rgba(255,255,255,0.7)'; rr(bx + bw * 0.16, by + bh * 0.3, bw * 0.1, bh * 0.45, 4); c.fill();
                c.fillStyle = '#b5772f'; rr(bx + bw * 0.36, by - bh * 0.1, bw * 0.28, bh * 0.14, 3); c.fill();
                c.fillStyle = '#f4ead2'; rr(bx + bw * 0.18, by + bh * 0.52, bw * 0.64, bh * 0.2, 3); c.fill();
            };
            var estante = function (ex, ey, ew, n, off) {
                c.save(); c.shadowColor = 'rgba(40,20,5,0.55)'; c.shadowBlur = 10; c.shadowOffsetY = 7; c.fillStyle = '#7a4f2a'; c.fillRect(ex, ey, ew, 13); c.restore();
                c.fillStyle = '#a06c3c'; c.fillRect(ex, ey, ew, 4);
                var cols = ['#f783ac', '#ffd43b', '#74c0fc', '#b2f2bb', '#d0a0ff', '#ff922b', '#ff6b6b', '#63e6be'];
                for (var i = 0; i < n; i++) { var bw = 30 + rg(i + off) * 18, bh = 50 + rg(i + off + 5) * 34; botella(ex + 14 + i * (ew - 40) / n, ey - bh, bw, bh, cols[(i + off) % 8], (i + off) % 3, i + off); }
            };
            estante(w * 0.02, h * 0.22, w * 0.3, 6, 0); estante(w * 0.02, h * 0.4, w * 0.3, 6, 6); estante(w * 0.02, h * 0.58, w * 0.3, 6, 12);
            estante(w * 0.66, h * 0.52, w * 0.28, 5, 3);
            // Ventana arqueada con luz de la mañana.
            var vx = w * 0.7, vy = h * 0.06, vw = Math.min(w * 0.17, 230), vh = h * 0.36;
            c.save(); c.shadowColor = 'rgba(0,0,0,0.4)'; c.shadowBlur = 14; c.shadowOffsetY = 6; c.fillStyle = '#7a4f2a'; c.beginPath(); c.moveTo(vx - 10, vy + vh); c.lineTo(vx - 10, vy + vw / 2); c.arc(vx + vw / 2, vy + vw / 2, vw / 2 + 10, Math.PI, 0); c.lineTo(vx + vw + 10, vy + vh); c.fill(); c.restore();
            var cg = c.createLinearGradient(0, vy, 0, vy + vh); cg.addColorStop(0, '#ffe9a8'); cg.addColorStop(0.5, '#bfe6ff'); cg.addColorStop(1, '#8ccf7a');
            c.fillStyle = cg; c.beginPath(); c.moveTo(vx, vy + vh); c.lineTo(vx, vy + vw / 2); c.arc(vx + vw / 2, vy + vw / 2, vw / 2, Math.PI, 0); c.lineTo(vx + vw, vy + vh); c.fill();
            c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.arc(vx + vw * 0.3, vy + vh * 0.35, 14, 0, 6.2832); c.arc(vx + vw * 0.43, vy + vh * 0.32, 18, 0, 6.2832); c.arc(vx + vw * 0.56, vy + vh * 0.36, 13, 0, 6.2832); c.fill();
            c.strokeStyle = '#5c3a1e'; c.lineWidth = 6; c.beginPath(); c.moveTo(vx + vw / 2, vy); c.lineTo(vx + vw / 2, vy + vh); c.moveTo(vx, vy + vh * 0.55); c.lineTo(vx + vw, vy + vh * 0.55); c.stroke();
            c.fillStyle = '#6b4526'; c.fillRect(vx - 14, vy + vh, vw + 28, 10);
            // Hierbas y flores secas colgadas.
            for (var k = 0; k < 7; k++) { var hx = w * (0.36 + k * 0.045), hh = 40 + rg(k + 30) * 50; c.strokeStyle = '#6b4526'; c.lineWidth = 2; c.beginPath(); c.moveTo(hx, 0); c.lineTo(hx, h * 0.07); c.stroke(); c.fillStyle = ['#c2255c', '#e8590c', '#74b816', '#7048e8'][k % 4]; c.beginPath(); c.ellipse(hx, h * 0.07 + hh * 0.5, 8, hh * 0.5, 0, 0, 6.2832); c.fill(); }
            // Mostrador de madera con tablero, remate de latón y cajones.
            var mg = c.createLinearGradient(0, mesaY, 0, h); mg.addColorStop(0, '#b27a44'); mg.addColorStop(0.15, '#8f5e32'); mg.addColorStop(1, '#5a3a1e');
            c.fillStyle = mg; c.fillRect(0, mesaY, w, h - mesaY);
            for (var q = 0; q < 70; q++) { c.strokeStyle = 'rgba(' + (rg(q) > 0.5 ? '0,0,0' : '255,230,190') + ',' + (0.05 + rg(q + 3) * 0.08) + ')'; c.lineWidth = 1 + rg(q + 5) * 1.5; c.beginPath(); var y2 = mesaY + 6 + rg(q) * h * 0.04; var x1 = rg(q + 1) * w; c.moveTo(x1, y2); c.bezierCurveTo(x1 + 60, y2 - 1, x1 + 120, y2 + 2, x1 + 100 + rg(q + 2) * 200, y2); c.stroke(); }
            var latonG = c.createLinearGradient(0, mesaY, 0, mesaY + 10); latonG.addColorStop(0, '#f6d77a'); latonG.addColorStop(1, '#a97e23'); c.fillStyle = latonG; c.fillRect(0, mesaY + h * 0.045, w, 7);
            c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(0, mesaY + h * 0.052, w, 6);
            for (var d = 0; d < 6; d++) { var dx = w * (0.04 + d * 0.16); c.fillStyle = 'rgba(0,0,0,0.18)'; rr(dx, mesaY + h * 0.075, w * 0.13, h * 0.12, 6); c.fill(); c.strokeStyle = 'rgba(255,220,160,0.25)'; c.lineWidth = 2; c.stroke(); c.fillStyle = latonG; c.beginPath(); c.arc(dx + w * 0.065, mesaY + h * 0.135, 7, 0, 6.2832); c.fill(); }
            // Balanza de latón y mortero sobre el mostrador.
            c.save(); c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 8; c.shadowOffsetY = 5;
            c.fillStyle = latonG; c.fillRect(w * 0.052, mesaY - h * 0.1, 8, h * 0.1); c.fillRect(w * 0.025, mesaY - 8, w * 0.065, 8); c.fillRect(w * 0.02, mesaY - h * 0.1, w * 0.075, 5);
            c.strokeStyle = '#a97e23'; c.lineWidth = 2; c.beginPath(); c.moveTo(w * 0.025, mesaY - h * 0.095); c.lineTo(w * 0.015, mesaY - h * 0.03); c.moveTo(w * 0.09, mesaY - h * 0.095); c.lineTo(w * 0.1, mesaY - h * 0.03); c.stroke(); c.beginPath(); c.ellipse(w * 0.015, mesaY - h * 0.03, 18, 5, 0, 0, 6.2832); c.ellipse(w * 0.1, mesaY - h * 0.03, 18, 5, 0, 0, 6.2832); c.stroke();
            c.fillStyle = '#d8d2c4'; c.beginPath(); c.moveTo(w * 0.86, mesaY - 36); c.lineTo(w * 0.93, mesaY - 36); c.lineTo(w * 0.915, mesaY); c.lineTo(w * 0.875, mesaY); c.fill(); c.fillStyle = '#6b4526'; c.save(); c.translate(w * 0.905, mesaY - 34); c.rotate(0.5); c.fillRect(-5, -52, 10, 56); c.restore();
            c.restore();
            // Gancho del pedido y viñeta.
            var hx2 = w * 0.52; c.fillStyle = latonG; c.beginPath(); c.arc(hx2, m.hoja.y - m.hoja.h / 2 - 14, 8, 0, 6.2832); c.fill();
            var v = c.createRadialGradient(w / 2, h * 0.5, h * 0.4, w / 2, h * 0.5, w * 0.72); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(50,25,5,0.45)'); c.fillStyle = v; c.fillRect(0, 0, w, h);
            for (var gn = 0; gn < 700; gn++) { c.fillStyle = 'rgba(255,255,255,' + (0.02 + rg(gn) * 0.03) + ')'; c.fillRect(rg(gn + 1) * w, rg(gn + 2) * h, 2, 2); }
            t.refresh();
            var vieja = this.fondoImg, claveVieja = this.fondoClave;
            this.fondoImg = this.add.image(0, 0, clave).setOrigin(0, 0).setDepth(1);
            this.fondoClave = clave;
            if (vieja) { vieja.destroy(); if (claveVieja && this.textures.exists(claveVieja)) this.textures.remove(claveVieja); }
        },

        /* ── Sellos de madera con el dibujo de cada órgano ─────── */

        crearSellos: function () {
            var scene = this, m = this.m(), tam = m.card;
            ORDEN.forEach(function (id, i) {
                var clave = 'perf_sello_' + id + '_' + Math.round(tam);
                if (!scene.textures.exists(clave)) {
                    var t = scene.textures.createCanvas(clave, Math.ceil(tam * 1.4), Math.ceil(tam * 1.7));
                    var c = t.getContext(), o = tam * 0.2, cx = o + tam * 0.5;
                    c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = tam * 0.1; c.shadowOffsetY = tam * 0.06;
                    var gb = c.createLinearGradient(cx - tam * 0.5, 0, cx + tam * 0.5, 0); gb.addColorStop(0, '#c0864a'); gb.addColorStop(0.5, '#e0a766'); gb.addColorStop(1, '#8a5a2b');
                    c.fillStyle = gb; c.beginPath(); c.roundRect ? c.roundRect(o, o + tam * 0.75, tam, tam * 0.28, tam * 0.08) : c.rect(o, o + tam * 0.75, tam, tam * 0.28); c.fill();
                    c.fillStyle = '#6b4526'; c.fillRect(cx - tam * 0.12, o + tam * 0.3, tam * 0.24, tam * 0.5);
                    var gk = c.createRadialGradient(cx - tam * 0.1, o + tam * 0.1, 2, cx, o + tam * 0.25, tam * 0.4); gk.addColorStop(0, '#f6d77a'); gk.addColorStop(1, '#a97e23');
                    c.fillStyle = gk; c.beginPath(); c.arc(cx, o + tam * 0.25, tam * 0.36, 0, 6.2832); c.fill(); c.restore();
                    c.strokeStyle = 'rgba(70,40,10,0.6)'; c.lineWidth = 3; c.beginPath(); c.arc(cx, o + tam * 0.25, tam * 0.36, 0, 6.2832); c.stroke();
                    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(cx - tam * 0.12, o + tam * 0.1, tam * 0.12, tam * 0.06, -0.5, 0, 6.2832); c.fill();
                    t.refresh();
                }
                var c2 = scene.add.container(scene.rackX(i), m.rackY).setDepth(30);
                var cuerpo = scene.add.image(0, 0, clave);
                var org = scene.add.image(0, -tam * 0.38, A().textura(scene, TEX_ORGANO[id], 128)).setDisplaySize(tam * 0.5, tam * 0.5);
                var luz = scene.add.circle(0, -tam * 0.38, tam * 0.5, COLOR[id], 0).setBlendMode(Phaser.BlendModes.ADD);
                c2.add([luz, cuerpo, org]);
                if (id === 'ojo') c2.add(scene.add.image(0, -tam * 0.38, A().textura(scene, 'iris', 128)).setDisplaySize(tam * 0.2, tam * 0.2));
                c2.id = id; c2.tam = tam; c2.luz = luz; c2.casa = { x: c2.x, y: c2.y }; c2.imagen = org;
                scene.sellos[id] = c2;
            });
        },

        ubicar: function () {
            var m = this.m(), scene = this;
            ORDEN.forEach(function (id, i) { var c = scene.sellos[id]; c.casa = { x: scene.rackX(i), y: m.rackY }; if (!c.enUso) c.setPosition(c.casa.x, c.casa.y); });
            if (this.slip && this.slip.active) this.slip.setPosition(m.hoja.x, m.hoja.y);
        },

        mezclarSellos: function () {
            var scene = this, m = this.m(), orden = U.mezclar(ORDEN.slice());
            orden.forEach(function (id, i) { var c = scene.sellos[id]; c.casa = { x: scene.rackX(i), y: m.rackY }; if (!c.enUso) c.setPosition(c.casa.x, c.casa.y); });
        },

        /* ── Pedido (hojita) y sellado ─────────────────────────── */

        crearHoja: function (id, titulo) {
            var m = this.m(), H = m.hoja;
            if (this.slip && this.slip.active) this.slip.destroy();
            var c = this.add.container(H.x, H.y - 60).setDepth(12);
            var g = this.add.graphics();
            g.fillStyle(0x000000, 0.3); g.fillRoundedRect(-H.w / 2 + 5, -H.h / 2 + 9, H.w, H.h, 8);
            g.fillStyle(0xfdf6e3, 1); g.fillRoundedRect(-H.w / 2, -H.h / 2, H.w, H.h, 8);
            g.fillStyle(0xd9c9a0, 0.5); for (var i = 0; i < 5; i++) g.fillRect(-H.w * 0.4, H.h * (0.08 + i * 0.03) - H.h / 2 + 4, H.w * 0.8, 2);
            g.lineStyle(3, 0xb28a4a, 1); g.strokeRoundedRect(-H.w / 2 + 8, -H.h / 2 + 8, H.w - 16, H.h - 16, 6);
            g.fillStyle(0xc2255c, 0.12); g.fillCircle(0, -H.h * 0.08, H.w * 0.34);
            var im;
            if (id === 'sol') c.add(this.add.image(0, -H.h * 0.08, A().textura(this, 'sol_rayos', 160)).setDisplaySize(H.w * 0.66, H.w * 0.66));
            c.add(g);
            if (id === 'tambor') { var d = B.tambor(this, 0, -H.h * 0.08, H.w * 0.6); c.add(d.cont); c.tambor = d; }
            else { im = this.add.image(0, -H.h * 0.08, A().textura(this, id, 160)).setDisplaySize(H.w * 0.58, H.w * 0.58); c.add(im); c.img = im; }
            // Casilla donde se pone el sello.
            var cas = this.add.graphics();
            cas.lineStyle(3, 0x8a6a2a, 0.8); cas.strokeRoundedRect(-H.w * 0.34, H.h * 0.2, H.w * 0.68, H.h * 0.24, 8);
            cas.lineStyle(1, 0x8a6a2a, 0.5); cas.lineBetween(-H.w * 0.28, H.h * 0.38, H.w * 0.28, H.h * 0.38);
            c.add(cas);
            c.id = id;
            c.senal = function () { /* efecto del pedido */ };
            this.slip = c;
            return c;
        },

        /** Arrastra un sello hasta la hoja. Resuelve con el id del sello al soltarlo sobre la hoja. */
        arrastrarSello: function (correcto) {
            var scene = this;
            return new Promise(function (resolver) {
                var cur = null, dx = 0, dy = 0;
                var pista = U.crearPista(scene, 9000, function (cancelado) {
                    var c = scene.sellos[correcto], H = scene.m().hoja;
                    return scene.ctx.mano({ punto: { x: c.x, y: c.y }, holdMs: 300, cancelado: cancelado, arrastre: { dx: H.x - c.x, dy: (H.y + H.h * 0.3) - c.y, durMs: 1100 } });
                });
                pista.reiniciar();
                function abajo(p) {
                    var hit = null;
                    ORDEN.forEach(function (id) { var c = scene.sellos[id]; if (!hit && !c.enUso && Math.abs(p.x - c.x) < c.tam * 0.6 && Math.abs(p.y - c.y) < c.tam * 0.8) hit = c; });
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
                    var H = scene.m().hoja;
                    c.setDepth(30);
                    if (!(scene.slip && Math.abs(c.x - H.x) < H.w * 0.6 && Math.abs(c.y - H.y) < H.h * 0.65)) { scene.tweens.add({ targets: c, x: c.casa.x, y: c.casa.y, scale: 1, duration: 420, ease: 'Back.easeOut' }); return; }
                    scene.input.off('pointerdown', abajo); scene.input.off('pointermove', mover); scene.input.off('pointerup', arriba);
                    pista.parar();
                    resolver(c.id);
                }
                scene.input.on('pointerdown', abajo); scene.input.on('pointermove', mover); scene.input.on('pointerup', arriba);
            });
        },

        /** Estampa el sello en la casilla: baja, deja la marca y sube. ok=false deja un borrón rojo que se borra. */
        estampar: async function (id, ok) {
            var m = this.m(), H = m.hoja, c = this.sellos[id];
            c.enUso = true;
            var ex = H.x, ey = H.y + H.h * 0.32;
            await U.tween(this, { targets: c, x: ex, y: ey - c.tam * 0.55, scale: 1.15, duration: 260, ease: 'Sine.easeOut' });
            await U.tween(this, { targets: c, y: ey - c.tam * 0.38, scale: 1.0, duration: 90, ease: 'Quad.easeIn' });
            this.cameras.main.shake(70, 0.002);
            K_ruido();
            var tinta = this.add.image(ex, ey, A().textura(this, TEX_ORGANO[id], 128)).setDisplaySize(H.w * 0.3, H.w * 0.3).setDepth(13).setTint(ok ? TINTA[id] : 0xb02020).setAlpha(0);
            this.tweens.add({ targets: tinta, alpha: ok ? 0.85 : 0.7, scale: { from: tinta.scale * 1.3, to: tinta.scale }, duration: 160 });
            if (id === 'ojo') { var iris = this.add.image(ex, ey, A().textura(this, 'iris', 128)).setDisplaySize(H.w * 0.12, H.w * 0.12).setDepth(13).setTint(ok ? 0x0b3d7a : 0x701010).setAlpha(0); this.tweens.add({ targets: iris, alpha: 0.9, duration: 160 }); if (!ok) this.tweens.add({ targets: iris, alpha: 0, delay: 500, duration: 400, onComplete: function () { iris.destroy(); } }); else tinta.iris = iris; }
            this.destello = { x: ex, y: ey, t: this.time.now };
            await U.esperar(this, 320);
            await U.tween(this, { targets: c, y: ey - c.tam * 1.1, alpha: 1, duration: 200 });
            if (ok) { c.casa = c.casa; this.huellas = this.huellas || []; this.huellas.push({ id: id, img: tinta }); }
            else { this.tweens.add({ targets: tinta, alpha: 0, duration: 500, onComplete: function () { tinta.destroy(); } }); }
            await U.tween(this, { targets: c, x: c.casa.x, y: c.casa.y, scale: 1, duration: 480, ease: 'Sine.easeInOut' });
            c.enUso = false; c.setDepth(30);
            return tinta;
        },

        /** El pedido completo: se pide el sello correcto, con rechazo amable si es otro. */
        sellarPedido: async function (id) {
            var correcto = SENTIDO[id];
            while (true) {
                var s = await this.arrastrarSello(correcto);
                if (s === correcto) break;
                U.sfx('boing');
                var t = await this.estampar(s, false);
                this.tweens.add({ targets: this.slip, x: this.slip.x + 8, duration: 60, yoyo: true, repeat: 3 });
                await this.ctx.decir({ voz: 'zeus', texto: '¡Ups! ' + POR_QUE[id] });
                void t;
            }
            var tinta = await this.estampar(correcto, true);
            U.sfx('recompensa');
            Sfx() && Sfx().acompanar && Sfx().acompanar('campana', { breve: true, vol: 0.5 });
            U.estallido(this, tinta.x, tinta.y, { n: 12, dist: 90, depth: 60 });
            await U.esperar(this, 500);
            return tinta;
        },

        retirarHoja: async function () {
            var c = this.slip;
            if (!c || !c.active) return;
            var scene = this;
            (this.huellas || []).forEach(function (h) { [h.img, h.img && h.img.iris].forEach(function (o) { if (o && o.active) scene.tweens.add({ targets: o, alpha: 0, y: o.y - 40, duration: 380, onComplete: function () { o.destroy(); } }); }); });
            this.huellas = [];
            await U.tween(this, { targets: c, y: c.y - 40, alpha: 0, duration: 380 });
            c.destroy();
            this.slip = null;
        },

        /* ── Ronda 1: la flor ──────────────────────────────────── */

        rondaFlor: async function () {
            var scene = this, m = this.m(), r = this.reto;
            this.modo = 'flor';
            this.mezclarSellos();
            this.destila = 0; this.embotellado = false;
            this.flor = this.add.image(m.alambique.x, m.alambique.y - m.alambique.u * 0.1, A().textura(this, 'flor', 160)).setDisplaySize(m.alambique.u * 0.9, m.alambique.u * 0.9).setDepth(7).setAlpha(0);
            this.tweens.add({ targets: this.flor, alpha: 1, duration: 500 });
            await this.ctx.decir(r.presentacion || { voz: 'zeus', texto: '¡Bienvenido a la perfumería! La flor desprende partículas perfumadas. Gira la manivela del alambique para destilarlas.' });
            await this.destilar();
            await this.ctx.decir({ voz: 'zoe', texto: 'El frasco está listo. ¡Atrapa las gotitas de aroma con el cono de oler!' });
            await this.atraparAroma();
            await this.ctx.decir({ voz: 'zeus', texto: 'Ahora sella el pedido con el sello del sentido que percibe la flor.' });
            this.crearHoja('flor');
            await U.tween(this, { targets: this.slip, y: this.m().hoja.y, duration: 450, ease: 'Back.easeOut' });
            await this.sellarPedido('flor');
            await this.ctx.decir(r.acierto || { voz: 'zeus', texto: '¡Muy bien! Flor se relaciona con la nariz.' }, { estado: 'acierto' });
            await this.retirarHoja();
            this.tweens.add({ targets: this.flor, alpha: 0, duration: 400, onComplete: function () { scene.flor.destroy(); } });
            this.embotellado = false; this.destila = 0;
            this.modo = '';
        },

        /** Girar la manivela: destila la flor y llena el frasco. */
        destilar: function () {
            var scene = this, m = this.m(), M = m.manivela;
            this.manivelaAng = 0;
            return new Promise(function (resolver) {
                var arr = false, ult = 0;
                var pista = U.crearPista(scene, 8000, function (cancelado) {
                    return scene.ctx.mano({ punto: { x: M.x + M.r * 0.8, y: M.y }, holdMs: 250, cancelado: cancelado, arrastre: { dx: -M.r * 0.7, dy: M.r * 1.4, durMs: 1300 } });
                });
                pista.reiniciar();
                function abajo(p) { if (Phaser.Math.Distance.Between(p.x, p.y, M.x, M.y) < M.r * 1.6) { arr = true; ult = Math.atan2(p.y - M.y, p.x - M.x); pista.reiniciar(); scene.ctx.quitarMano(); U.sfx('pop'); } }
                function mover(p) {
                    if (!arr || !p.isDown) return;
                    var a = Math.atan2(p.y - M.y, p.x - M.x), da = a - ult;
                    while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
                    ult = a;
                    scene.manivelaAng += da; scene.vaporV = Math.min(1, Math.abs(da) * 6);
                    scene.destila = Math.min(1, scene.destila + Math.abs(da) / (Math.PI * 2 * 2.2));
                    if (Math.floor(scene.manivelaAng * 2) % 2 === 0) K_ruido();
                    if (scene.destila >= 1) { scene.input.off('pointerdown', abajo); scene.input.off('pointermove', mover); scene.input.off('pointerup', arriba); pista.parar(); scene.embotellar().then(resolver); }
                }
                function arriba() { arr = false; scene.vaporV = 0; }
                scene.input.on('pointerdown', abajo); scene.input.on('pointermove', mover); scene.input.on('pointerup', arriba);
            });
        },

        embotellar: async function () {
            var F = this.m().frasco;
            U.sfx('dingDingYay');
            this.embotellado = true;
            U.estallido(this, F.x, F.y - F.h * 0.4, { n: 14, dist: 100, depth: 60 });
            await U.esperar(this, 900);
            // Se destapa el frasco (el corcho salta).
            this.corcho = this.add.rectangle(F.x, F.y - F.h * 0.62, F.w * 0.3, F.h * 0.14, 0xb5772f).setDepth(9);
            this.tweens.add({ targets: this.corcho, y: F.y - F.h * 1.8, angle: 220, alpha: 0, duration: 700, ease: 'Quad.easeOut', onComplete: function () { this.targets[0].destroy(); } });
            U.sfx('pop');
            await U.esperar(this, 500);
        },

        /** Moléculas de aroma (rosadas) salen del frasco: se atrapan con el cono; las notas y destellos no son aroma. */
        atraparAroma: async function () {
            var scene = this, m = this.m(), F = m.frasco;
            this.modo = 'moleculas';
            this.cono = this.crearCono();
            this.cono.setPosition(m.w * 0.5, m.h * 0.35).setAlpha(0);
            this.tweens.add({ targets: this.cono, alpha: 1, duration: 300 });
            this.atrapadas = 0; this.metaAroma = 8; this.proxPart = 0; this.parts = [];
            this.dijoNota = 0;
            var cv = function (p) { scene.conoMeta = { x: Phaser.Math.Clamp(p.x, 40, m.w - 190), y: Phaser.Math.Clamp(p.y, 110, m.mesaY) }; };
            var abajo = function (p) { scene.pista.reiniciar(); scene.ctx.quitarMano(); cv(p); };
            var mover = function (p) { if (p.isDown) { scene.pista.reiniciar(); cv(p); } };
            this.input.on('pointerdown', abajo); this.input.on('pointermove', mover);
            this.pista = U.crearPista(this, 9000, function (cancelado) {
                var q = scene.parts.find(function (pp) { return pp.tipo === 'aroma'; });
                if (!q) return Promise.resolve();
                return scene.ctx.mano({ punto: { x: scene.cono.x, y: scene.cono.y }, holdMs: 250, cancelado: cancelado, arrastre: { dx: q.c.x - scene.cono.x, dy: q.c.y - scene.cono.y, durMs: 1100 } });
            });
            this.pista.reiniciar();
            await new Promise(function (r) { scene.finAroma = r; });
            this.input.off('pointerdown', abajo); this.input.off('pointermove', mover);
            this.pista.parar(); this.ctx.quitarMano();
            this.parts.forEach(function (p) { scene.tweens.add({ targets: p.c, alpha: 0, duration: 300, onComplete: function () { p.c.destroy(); } }); });
            this.parts = [];
            this.tweens.add({ targets: this.cono, alpha: 0, duration: 400, onComplete: function () { scene.cono.destroy(); } });
            U.sfx('magia');
            this.modo = 'flor';
            void F;
        },

        crearCono: function () {
            var c = this.add.container(0, 0).setDepth(30);
            var g = this.add.graphics();
            g.fillStyle(0x000000, 0.3); g.fillTriangle(-26, -30, 30, -26, 8, 52);
            var gr = 0xd9953d; g.fillStyle(gr, 1); g.fillTriangle(-30, -34, 26, -30, 4, 48);
            g.fillStyle(0xf6d77a, 0.7); g.fillTriangle(-30, -34, -8, -32, 2, 40);
            g.fillStyle(0xb5772f, 1); g.fillEllipse(-2, -32, 58, 22);
            g.fillStyle(0x4b2e12, 1); g.fillEllipse(-2, -32, 40, 12);
            g.lineStyle(3, 0x7a4a1a, 1); g.strokeEllipse(-2, -32, 58, 22);
            c.add(g);
            return c;
        },

        nacerParticula: function () {
            var m = this.m(), F = m.frasco;
            var r = Math.random(), tipo = r < 0.62 ? 'aroma' : (r < 0.81 ? 'nota' : 'chispa');
            var c = this.add.container(F.x + U.rnd(-10, 10), F.y - F.h * 0.7).setDepth(17);
            if (tipo === 'aroma') {
                var g = this.add.graphics(); g.lineStyle(4, 0xc2255c, 1); g.lineBetween(-12, 6, 0, -8); g.lineBetween(0, -8, 12, 6); c.add(g);
                [[-12, 6, 0xf06595], [0, -8, 0xf783ac], [12, 6, 0xe64980]].forEach(function (a) {
                    c.add(this.add.image(a[0], a[1], A().textura(this, 'humo', 64)).setTint(a[2]).setDisplaySize(26, 26));
                    c.add(this.add.circle(a[0], a[1], 7, a[2])); c.add(this.add.circle(a[0] - 2, a[1] - 2, 2.5, 0xffffff, 0.8));
                }, this);
            } else if (tipo === 'nota') c.add(this.add.image(0, 0, A().textura(this, 'nota', 64)).setDisplaySize(32, 32).setTint(0x1c7ed6));
            else c.add(this.add.image(0, 0, A().textura(this, 'chispa', 64)).setDisplaySize(36, 36).setTint(0xffd43b));
            var p = { tipo: tipo, c: c, vx: (Math.random() < 0.5 ? -1 : 1) * U.rnd(40, 90), vy: U.rnd(-70, -30), f: Math.random() * 6, t0: this.time.now };
            c.alpha = 0; this.tweens.add({ targets: c, alpha: 1, duration: 250 });
            this.parts.push(p);
        },

        moverParticulas: function (time, dt) {
            var scene = this, m = this.m();
            if (time > this.proxPart && this.parts.length < 6) { this.proxPart = time + 900; this.nacerParticula(); }
            this.parts = this.parts.filter(function (p) {
                var c = p.c;
                if (!c.active) return false;
                c.x += p.vx * dt; c.y += p.vy * dt + Math.sin(time / 400 + p.f) * 12 * dt;
                if (c.x < 40 || c.x > m.w - 200) p.vx *= -1;
                if (c.y < 110) p.vy = Math.abs(p.vy) * 0.6;
                if (time - p.t0 > 9000 || c.y > m.mesaY) { scene.tweens.add({ targets: c, alpha: 0, duration: 200, onComplete: function () { c.destroy(); } }); return false; }
                var cn = scene.cono;
                if (cn && cn.active && Phaser.Math.Distance.Between(c.x, c.y - 0, cn.x - 2, cn.y - 30) < 46) {
                    if (p.tipo === 'aroma') {
                        scene.atrapadas++;
                        U.sfx('pop');
                        U.estallido(scene, c.x, c.y, { n: 6, dist: 50, tam: 14, colores: [0xf783ac, 0xffffff] });
                        scene.tweens.add({ targets: c, x: cn.x, y: cn.y + 10, scale: 0.2, alpha: 0, duration: 250, onComplete: function () { c.destroy(); } });
                        if (scene.atrapadas >= scene.metaAroma && scene.finAroma) { var f = scene.finAroma; scene.finAroma = null; scene.ctx.decir({ voz: 'zoe', texto: '¡Qué rico aroma! Percibimos los aromas con la nariz.' }, { estado: 'acierto' }); U.esperar(scene, 900).then(f); }
                    } else {
                        if (time - scene.dijoNota > 6000) { scene.dijoNota = time; scene.ctx.decir({ voz: 'zoe', texto: p.tipo === 'nota' ? 'Esa es una nota: se escucha con el oído. ¡Busca el aroma!' : 'Ese destello es luz: lo ven los ojos. ¡Busca el aroma!' }); }
                        scene.tweens.add({ targets: cn, angle: { from: -12, to: 12 }, duration: 80, yoyo: true, repeat: 2 });
                        scene.tweens.add({ targets: c, alpha: 0, scale: 1.8, duration: 280, onComplete: function () { c.destroy(); } });
                    }
                    return false;
                }
                return true;
            });
        },

        /* ── Ronda 2: los pedidos ──────────────────────────────── */

        rondaPedidos: async function () {
            var scene = this;
            this.modo = 'pedidos';
            this.mezclarSellos();
            await this.ctx.decir({ voz: 'zeus', texto: '¡Llegan más pedidos a la perfumería! Sella cada hojita con el sello del sentido que lo percibe.' });
            var orden = U.mezclar(['tambor', 'flor', 'helado', 'sol', 'osito']);
            var frases = ['¡Entregado!', '¡Muy bien!', '¡Otro pedido!', '¡Excelente!', '¡Todos los pedidos están sellados!'];
            for (var i = 0; i < orden.length; i++) {
                var id = orden[i];
                this.crearHoja(id);
                await U.tween(this, { targets: this.slip, y: this.m().hoja.y, duration: 420, ease: 'Back.easeOut' });
                if (this.slip.tambor) this.slip.tambor.sonar();
                await this.sellarPedido(id);
                this.ctx.decir({ voz: 'zoe', texto: frases[i] + ' ' + POR_QUE[id] }, { estado: 'acierto' });
                await U.esperar(this, 900);
                await this.retirarHoja();
            }
            void scene;
        },

        /* ── Ronda 3: aroma escondido ──────────────────────────── */

        crearFrasco: function (aroma, x, y, col) {
            var m = this.m(), s = m.h * 0.14;
            var c = this.add.container(x, y).setDepth(20);
            var g = this.add.graphics();
            g.fillStyle(0x000000, 0.25); g.fillEllipse(0, s * 0.52, s * 0.7, s * 0.14);
            g.fillStyle(0xe8f4f8, 0.55); g.fillCircle(0, s * 0.16, s * 0.4); g.fillRect(-s * 0.1, -s * 0.38, s * 0.2, s * 0.3);
            g.fillStyle(col, 0.85); g.fillCircle(0, s * 0.2, s * 0.33);
            g.fillStyle(0xffffff, 0.6); g.fillEllipse(-s * 0.15, s * 0.02, s * 0.1, s * 0.22);
            g.fillStyle(0xb5772f, 1); g.fillRoundedRect(-s * 0.12, -s * 0.5, s * 0.24, s * 0.14, 3);
            g.lineStyle(2, 0xffffff, 0.5); g.strokeCircle(0, s * 0.16, s * 0.4);
            c.add(g);
            c.aroma = aroma; c.s = s; c.nariz = 0; c.revelado = 0;
            return c;
        },

        rondaAroma: async function () {
            var scene = this, m = this.m();
            this.modo = 'aroma';
            var aromas = ['flor', 'limon', 'fresa', 'helado'];
            var colores = [0xf783ac, 0xffe066, 0xff6b6b, 0xffc9de];
            await this.ctx.decir({ voz: 'zoe', texto: 'Cuatro frascos cerrados. Acerca el cono de oler para sentir su aroma y lleva al cliente el que huele a lo que pide.' });
            var orden = U.mezclar(aromas.slice());
            var pedidos = U.mezclar(['flor', 'limon', 'fresa']);
            this.cono = this.crearCono(); this.cono.setPosition(m.w * 0.5, m.h * 0.5).setAlpha(0);
            this.tweens.add({ targets: this.cono, alpha: 1, duration: 300 });
            this.conoMeta = { x: m.w * 0.5, y: m.h * 0.5 };
            this.frascos = orden.map(function (a, i) { var c = scene.crearFrasco(a, m.w * (0.3 + i * 0.12), m.mesaY - m.h * 0.07, colores[aromas.indexOf(a)]); c.casa = { x: c.x, y: c.y }; c.setAlpha(0); scene.tweens.add({ targets: c, alpha: 1, duration: 300, delay: i * 100 }); return c; });
            for (var r = 0; r < 3; r++) {
                var pide = pedidos[r];
                // Tarjeta del cliente con el aroma que pide.
                var H = m.hoja;
                var cliente = this.add.container(H.x, H.y).setDepth(12);
                var g = this.add.graphics();
                g.fillStyle(0x000000, 0.3); g.fillRoundedRect(-H.w * 0.42 + 4, -H.w * 0.42 + 8, H.w * 0.84, H.w * 0.84, 16);
                g.fillStyle(0xfdf6e3, 1); g.fillRoundedRect(-H.w * 0.42, -H.w * 0.42, H.w * 0.84, H.w * 0.84, 16);
                g.lineStyle(4, 0xb28a4a, 1); g.strokeRoundedRect(-H.w * 0.38, -H.w * 0.38, H.w * 0.76, H.w * 0.76, 12);
                g.fillStyle(0xf783ac, 0.18); g.fillCircle(0, 0, H.w * 0.3);
                cliente.add([g, this.add.image(0, 0, A().textura(this, pide, 160)).setDisplaySize(H.w * 0.5, H.w * 0.5)]);
                cliente.setAlpha(0); cliente.y -= 40;
                await U.tween(this, { targets: cliente, alpha: 1, y: H.y, duration: 450, ease: 'Back.easeOut' });
                this.clienteBox = { x: H.x, y: H.y, r: H.w * 0.5 };
                if (r === 0) await this.ctx.decir({ voz: 'zeus', texto: 'El cliente pide un aroma. Huele los frascos y llévale el correcto.' });
                var ok = false;
                while (!ok) {
                    var f = await this.arrastrarFrasco(pide);
                    if (f.aroma === pide) { ok = true; this.frascoOk = f; break; }
                    U.sfx('boing');
                    this.tweens.add({ targets: cliente, x: cliente.x + 8, duration: 60, yoyo: true, repeat: 3 });
                    await this.ctx.decir({ voz: 'zeus', texto: 'Ese frasco huele a otra cosa. ¡Acerca la nariz y prueba con otro!' });
                    await U.tween(this, { targets: f, x: f.casa.x, y: f.casa.y, duration: 420, ease: 'Back.easeOut' });
                }
                var f2 = this.frascoOk;
                await U.tween(this, { targets: f2, x: cliente.x, y: cliente.y + H.w * 0.1, scale: 0.7, duration: 420 });
                U.sfx('recompensa');
                U.estallido(this, cliente.x, cliente.y, { n: 12, dist: 100, tex: 'corazon', depth: 60 });
                await this.ctx.decir({ voz: 'zoe', texto: ['¡Qué bien huele! La nariz reconoció el aroma.', '¡Muy bien! Olemos con la nariz.', '¡Qué buen olfato!'][r] }, { estado: 'acierto' });
                this.tweens.add({ targets: cliente, alpha: 0, duration: 300, onComplete: function () { cliente.destroy(); } });
                await U.tween(this, { targets: f2, x: f2.casa.x, y: f2.casa.y, scale: 1, duration: 450 });
                f2.revelado = 0;
            }
            this.frascos.forEach(function (c) { scene.tweens.add({ targets: c, alpha: 0, duration: 300, onComplete: function () { c.destroy(); } }); });
            this.frascos = [];
            this.tweens.add({ targets: this.cono, alpha: 0, duration: 400, onComplete: function () { scene.cono.destroy(); } });
            this.modo = '';
        },

        /** El cono sigue al dedo (oler); arrastrar un frasco lo lleva al cliente. */
        arrastrarFrasco: function (correcto) {
            var scene = this, m = this.m();
            return new Promise(function (resolver) {
                var cur = null, dx = 0, dy = 0;
                var pista = U.crearPista(scene, 10000, function (cancelado) {
                    var b = scene.frascos.find(function (f) { return f.aroma === correcto; });
                    return scene.ctx.mano({ punto: { x: b.x, y: b.y }, holdMs: 300, cancelado: cancelado, arrastre: { dx: scene.clienteBox.x - b.x, dy: scene.clienteBox.y - b.y, durMs: 1200 } });
                });
                pista.reiniciar();
                function abajo(p) {
                    var hit = scene.frascos.find(function (f) { return Math.abs(p.x - f.x) < f.s * 0.5 && Math.abs(p.y - f.y) < f.s * 0.6; });
                    pista.reiniciar(); scene.ctx.quitarMano();
                    if (hit) { cur = hit; dx = hit.x - p.x; dy = hit.y - p.y; scene.tweens.killTweensOf(hit); hit.setDepth(40); U.sfx('pop'); }
                    else scene.conoMeta = { x: Phaser.Math.Clamp(p.x, 40, m.w - 190), y: Phaser.Math.Clamp(p.y, 110, m.mesaY) };
                }
                function mover(p) { if (!p.isDown) return; if (cur) cur.setPosition(p.x + dx, p.y + dy); else scene.conoMeta = { x: Phaser.Math.Clamp(p.x, 40, m.w - 190), y: Phaser.Math.Clamp(p.y, 110, m.mesaY) }; }
                function arriba() {
                    if (!cur) return;
                    var f = cur; cur = null; f.setDepth(20);
                    var C = scene.clienteBox;
                    if (Phaser.Math.Distance.Between(f.x, f.y, C.x, C.y) > C.r) { scene.tweens.add({ targets: f, x: f.casa.x, y: f.casa.y, duration: 420, ease: 'Back.easeOut' }); return; }
                    scene.input.off('pointerdown', abajo); scene.input.off('pointermove', mover); scene.input.off('pointerup', arriba);
                    pista.parar(); resolver(f);
                }
                scene.input.on('pointerdown', abajo); scene.input.on('pointermove', mover); scene.input.on('pointerup', arriba);
            });
        },

        /** Mientras el cono está cerca de un frasco, sale su vapor con el dibujo del aroma. */
        oler: function (time, dt) {
            var scene = this, cn = this.cono;
            if (!cn || !cn.active || !this.frascos) return;
            this.frascos.forEach(function (f) {
                if (!f.active) return;
                var d = Phaser.Math.Distance.Between(cn.x - 2, cn.y - 30, f.x, f.y - f.s * 0.5);
                var cerca = d < f.s * 0.8;
                f.nariz = Math.max(0, Math.min(1, f.nariz + (cerca ? dt / 0.7 : -dt * 0.8)));
                if (f.nariz >= 1 && !f.nube) {
                    f.nube = scene.add.container(f.x, f.y - f.s * 0.9).setDepth(31);
                    f.nube.add([scene.add.circle(0, 0, f.s * 0.5, 0xffffff, 0.85).setStrokeStyle(3, 0xf783ac), scene.add.image(0, 0, A().textura(scene, f.aroma, 128)).setDisplaySize(f.s * 0.7, f.s * 0.7)]);
                    f.nube.setScale(0.2);
                    scene.tweens.add({ targets: f.nube, scale: 1, duration: 300, ease: 'Back.easeOut' });
                    U.sfx('pop'); U.aroma(scene, f.x, f.y - f.s * 0.5, { n: 3, alto: 40, depth: 32 });
                    scene.ctx.quitarMano();
                }
                if (f.nube) { f.nube.x = f.x; f.nube.y = f.y - f.s * 0.9 + Math.sin(time / 300) * 4; if (f.nariz <= 0) { var nb = f.nube; f.nube = null; scene.tweens.add({ targets: nb, alpha: 0, scale: 0.3, duration: 250, onComplete: function () { nb.destroy(); } }); } }
            });
        },

        /* ── Ronda 4: la receta ────────────────────────────────── */

        rondaReceta: async function () {
            var scene = this, m = this.m(), P = m.probeta;
            this.modo = 'receta';
            this.nivel = 0; this.nivelObj = 0;
            await this.ctx.decir({ voz: 'zoe', texto: 'Vamos a preparar un perfume. Mantén pulsado un frasco para verter su aroma hasta la raya de la probeta.' });
            var ingr = [{ id: 'flor', col: 0xf783ac, hasta: 0.3 }, { id: 'limon', col: 0xffe066, hasta: 0.6 }, { id: 'fresa', col: 0xff6b6b, hasta: 0.88 }];
            this.capas = [];
            this.rayaActual = null;
            this.recetaFrascos = ingr.map(function (g, i) {
                var c = scene.crearFrasco(g.id, m.w * (0.26 + i * 0.1) + (i > 0 ? m.w * 0.36 : 0), m.mesaY - m.h * 0.07, g.col);
                c.casa = { x: c.x, y: c.y }; c.ing = g; c.setAlpha(0); scene.tweens.add({ targets: c, alpha: 1, duration: 300, delay: i * 100 });
                return c;
            });
            for (var i = 0; i < ingr.length; i++) {
                var g = ingr[i], base = i ? ingr[i - 1].hasta : 0;
                this.rayaActual = g.hasta;
                this.capas.push({ col: g.col, desde: base, hasta: base });
                this.capaActual = this.capas[this.capas.length - 1];
                await this.verter(this.recetaFrascos[i], g);
                this.ctx.decir({ voz: 'zoe', texto: ['¡Muy bien! El aroma de la flor.', '¡Perfecto! Ahora el de limón.', '¡Qué buena mezcla!'][i] }, { estado: 'acierto' });
                await U.esperar(this, 700);
            }
            this.rayaActual = null;
            U.sfx('celebracion');
            U.estallido(this, P.x, P.y - P.h * 0.5, { n: 18, dist: 130, depth: 60 });
            this.mezclaFin = true;
            await U.esperar(this, 1400);
            this.recetaFrascos.forEach(function (c) { scene.tweens.add({ targets: c, alpha: 0, duration: 300, onComplete: function () { c.destroy(); } }); });
            this.capas = []; this.capaActual = null; this.mezclaFin = false;
            this.modo = '';
        },

        /** Mantener pulsado el frasco para verter hasta la raya (con margen); si se pasa, se vuelve a empezar ese ingrediente. */
        verter: function (f, g) {
            var scene = this, m = this.m();
            return new Promise(function (resolver) {
                var vertiendo = false;
                var pista = U.crearPista(scene, 9000, function (cancelado) {
                    return scene.ctx.mano({ punto: { x: f.x, y: f.y }, holdMs: 1400, cancelado: cancelado });
                });
                pista.reiniciar();
                function abajo(p) { if (Math.abs(p.x - f.x) < f.s * 0.6 && Math.abs(p.y - f.y) < f.s * 0.7) { vertiendo = true; scene.vertiendo = f; pista.reiniciar(); scene.ctx.quitarMano(); } }
                function arriba() {
                    if (!vertiendo) return;
                    vertiendo = false; scene.vertiendo = null;
                    var cap = scene.capaActual, lvl = cap.hasta;
                    if (Math.abs(lvl - g.hasta) <= 0.05) {
                        scene.input.off('pointerdown', abajo); scene.input.off('pointerup', arriba); scene.input.off('pointerupoutside', arriba);
                        pista.parar(); cap.hasta = g.hasta; U.sfx('recompensa'); resolver();
                    } else if (lvl > g.hasta + 0.05) {
                        U.sfx('boing');
                        scene.ctx.decir({ voz: 'zeus', texto: '¡Se pasó de la raya! Vamos a intentarlo otra vez con este ingrediente.' });
                        var from = { v: cap.hasta };
                        scene.tweens.add({ targets: from, v: cap.desde, duration: 600, onUpdate: function () { cap.hasta = from.v; } });
                    }
                }
                scene.input.on('pointerdown', abajo); scene.input.on('pointerup', arriba); scene.input.on('pointerupoutside', arriba);
            });
        },

        /* ── API ───────────────────────────────────────────────── */

        demo: async function () {
            var scene = this, m = this.m(), ctx = this.ctx;
            var t = ctx.textos || {};
            this.modo = 'demo';
            this.mezclarSellos();
            this.crearHoja('tambor');
            await U.tween(this, { targets: this.slip, y: m.hoja.y, duration: 450, ease: 'Back.easeOut' });
            await ctx.decir({ voz: 'zoe', texto: t.demostracion || '¡Mira cómo se juega!' }, { minMs: 2200 });
            if (!ctx.vivo() || !ctx.enDemo()) { await this.retirarHoja(); return; }
            await ctx.mano({ punto: { x: m.hoja.x, y: m.hoja.y - m.hoja.h * 0.08 }, holdMs: 600, onPresionar: function () { if (scene.slip && scene.slip.tambor) scene.slip.tambor.sonar(); } });
            await U.esperar(this, 300);
            var c = this.sellos.oido;
            await ctx.mano({
                punto: { x: c.x, y: c.y }, holdMs: 300,
                arrastre: { dx: m.hoja.x - c.x, dy: (m.hoja.y + m.hoja.h * 0.3) - c.y, durMs: 1100, soltarEnDestino: true },
                onDuranteArrastre: function () { scene.tweens.add({ targets: c, x: m.hoja.x, y: m.hoja.y + m.hoja.h * 0.3, duration: 1100, ease: 'Sine.easeInOut' }); }
            });
            if (!ctx.vivo()) { await this.retirarHoja(); return; }
            c.setPosition(c.x, c.y);
            var tinta = await this.estampar('oido', true);
            U.sfx('recompensa');
            await ctx.decir({ voz: 'zoe', texto: t.demostracionAcierto || '¡Así se hace!' }, { estado: 'acierto', minMs: 1600 });
            await ctx.decir({ voz: 'zoe', texto: t.demostracionFin || '¡Ahora te toca a ti!' }, { minMs: 1200 });
            tinta.destroy(); this.huellas = [];
            await this.retirarHoja();
            this.modo = '';
            await U.esperar(this, 300);
        },

        jugar: async function () {
            this.huellas = [];
            await this.rondaFlor();
            if (!this.ctx.vivo()) return;
            if (this.ganarNivel) await this.ganarNivel(0);
            await this.rondaPedidos();
            if (!this.ctx.vivo()) return;
            if (this.ganarNivel) await this.ganarNivel(1);
            await this.rondaAroma();
            if (!this.ctx.vivo()) return;
            if (this.ganarNivel) await this.ganarNivel(2);
            await this.rondaReceta();
            if (!this.ctx.vivo()) return;
            if (this.ganarNivel) await this.ganarNivel(3);
        },

        /** Cierre: el certificado de Ingeniero con los cuatro sellos y la vitrina con el perfume terminado. */
        fiestaFinal: async function () {
            var scene = this, m = this.m();
            this.modo = 'final';
            this.ctx.decir({ voz: 'zoe', texto: '¡Excelente! Encontraste todas las parejas sensoriales.' });
            var W = Math.min(m.w * 0.5, 560), Hh = Math.min(m.h * 0.62, 400);
            var cert = this.add.container(m.w * 0.5 - 40, m.h * 0.45).setDepth(60);
            var g = this.add.graphics();
            g.fillStyle(0x000000, 0.35); g.fillRoundedRect(-W / 2 + 6, -Hh / 2 + 10, W, Hh, 14);
            g.fillStyle(0xfdf2cf, 1); g.fillRoundedRect(-W / 2, -Hh / 2, W, Hh, 14);
            g.lineStyle(6, 0xb28a4a, 1); g.strokeRoundedRect(-W / 2 + 12, -Hh / 2 + 12, W - 24, Hh - 24, 10);
            g.lineStyle(2, 0xb28a4a, 0.7); g.strokeRoundedRect(-W / 2 + 22, -Hh / 2 + 22, W - 44, Hh - 44, 8);
            cert.add(g);
            var pares = [{ id: 'campana', o: 'oido' }, { id: 'flor', o: 'nariz' }, { id: 'helado', o: 'lengua' }, { id: 'sol', o: 'ojo' }];
            var celdas = pares.map(function (p, i) {
                var cx = (i - 1.5) * W * 0.22, cy = -Hh * 0.05;
                var marco = scene.add.circle(cx, cy - Hh * 0.12, W * 0.085, 0xffffff).setStrokeStyle(3, COLOR[p.o]);
                var ico = scene.add.image(cx, cy - Hh * 0.12, A().textura(scene, p.id, 128)).setDisplaySize(W * 0.12, W * 0.12);
                var sello = scene.add.image(cx, cy + Hh * 0.14, A().textura(scene, TEX_ORGANO[p.o], 128)).setDisplaySize(W * 0.14, W * 0.14).setTint(TINTA[p.o]).setAlpha(0);
                cert.add([marco, ico, sello]);
                return sello;
            });
            cert.setScale(0.2); cert.setAlpha(0);
            await U.tween(this, { targets: cert, scale: 1, alpha: 1, duration: 600, ease: 'Back.easeOut' });
            for (var i = 0; i < celdas.length; i++) {
                U.sfx('pop');
                this.cameras.main.shake(70, 0.002);
                await U.tween(this, { targets: celdas[i], alpha: 0.85, scale: { from: celdas[i].scale * 1.4, to: celdas[i].scale }, duration: 220 });
                await U.esperar(this, 280);
            }
            this.pulverizar = true;
            U.confeti(this, 100);
            var tt = L().titulo(this, '¡Ingeniero de Conexiones Sensoriales!', { y: m.h - 46, x: (m.w - 140) / 2, ancho: m.w - 190 });
            U.sfx('celebracion');
            await U.esperar(this, 3200);
            void tt;
        },

        update: function (time, delta) {
            var scene = this, dt = Math.min(delta || 16, 50) / 1000, m = this.m(), s = time / 1000;
            if (!this.alambiqueG || !this.alambiqueG.active) return;
            if (this.modo === 'moleculas' && this.cono && this.cono.active) this.moverParticulas(time, dt);
            if (this.modo === 'aroma') this.oler(time, dt);
            // El cono sigue al dedo.
            if (this.cono && this.cono.active && this.conoMeta) { this.cono.x += (this.conoMeta.x - this.cono.x) * Math.min(1, dt * 12); this.cono.y += (this.conoMeta.y - this.cono.y) * Math.min(1, dt * 12); this.cono.angle = Math.sin(s * 3) * 3; }
            if (this.cono && this.cono.active && this.modo === 'moleculas' && !this.conoMeta) this.conoMeta = { x: this.cono.x, y: this.cono.y };
            // Sellos: brillan al acercarse el dedo.
            ORDEN.forEach(function (id) { var c = scene.sellos[id]; var p = scene.input.activePointer; var cerca = !c.enUso && Math.abs(p.x - c.x) < c.tam * 0.6 && Math.abs(p.y - c.y) < c.tam * 0.8; c.luz.fillAlpha += ((cerca ? 0.3 : 0) - c.luz.fillAlpha) * Math.min(1, dt * 8); });
            // Alambique de cobre.
            var A0 = m.alambique, u = A0.u, g = this.alambiqueG; g.clear();
            var cobre = function (x0, x1, c1, c2) { return { x0: x0, x1: x1, c1: c1, c2: c2 }; };
            void cobre;
            g.fillStyle(0x000000, 0.3); g.fillEllipse(A0.x + u * 0.5, m.mesaY + 6, u * 3.2, u * 0.22);
            g.fillStyle(0x3b2a1a, 1); g.fillRoundedRect(A0.x - u * 0.75, A0.y + u * 0.75, u * 1.5, m.mesaY - A0.y - u * 0.75, 8);
            g.fillStyle(0x7a4f2a, 1); g.fillRoundedRect(A0.x - u * 0.8, A0.y + u * 0.7, u * 1.6, u * 0.12, 4);
            // Caldera (olla).
            g.fillStyle(0xb8642d, 1); g.fillCircle(A0.x, A0.y, u * 0.72);
            g.fillStyle(0xe08a4c, 1); g.fillCircle(A0.x - u * 0.12, A0.y - u * 0.1, u * 0.58);
            g.fillStyle(0xf6b98a, 0.6); g.fillEllipse(A0.x - u * 0.3, A0.y - u * 0.35, u * 0.4, u * 0.22);
            g.lineStyle(4, 0x8a4520, 1); g.strokeCircle(A0.x, A0.y, u * 0.72);
            g.fillStyle(0xb8642d, 1); g.fillRoundedRect(A0.x - u * 0.3, A0.y - u * 1.1, u * 0.6, u * 0.45, 8);
            g.fillStyle(0xe08a4c, 1); g.fillRoundedRect(A0.x - u * 0.24, A0.y - u * 1.1, u * 0.12, u * 0.45, 4);
            // Cuello de cisne hasta el condensador y el frasco.
            var tuboPts = [[A0.x, A0.y - u * 1.1], [A0.x, A0.y - u * 1.55], [A0.x + u * 0.5, A0.y - u * 1.7], [A0.x + u * 1.3, A0.y - u * 1.3], [A0.x + u * 1.5, A0.y - u * 0.4], [m.frasco.x, m.frasco.y - m.frasco.h * 0.8]];
            g.lineStyle(u * 0.22, 0x8a4520, 1); g.beginPath(); tuboPts.forEach(function (p, i) { if (!i) g.moveTo(p[0], p[1]); else g.lineTo(p[0], p[1]); }); g.strokePath();
            g.lineStyle(u * 0.14, 0xe08a4c, 1); g.beginPath(); tuboPts.forEach(function (p, i) { if (!i) g.moveTo(p[0], p[1]); else g.lineTo(p[0], p[1]); }); g.strokePath();
            g.lineStyle(u * 0.04, 0xfff0d0, 0.6); g.beginPath(); tuboPts.forEach(function (p, i) { if (!i) g.moveTo(p[0] - u * 0.03, p[1]); else g.lineTo(p[0] - u * 0.03, p[1]); }); g.strokePath();
            // Condensador con serpentín.
            g.fillStyle(0x9ad1e8, 0.35); g.fillRoundedRect(A0.x + u * 1.15, A0.y - u * 1.1, u * 0.7, u * 0.9, 10);
            g.lineStyle(3, 0xb8642d, 1); for (var k = 0; k < 4; k++) g.lineBetween(A0.x + u * 1.2, A0.y - u * 1.0 + k * u * 0.2, A0.x + u * 1.8, A0.y - u * 0.92 + k * u * 0.2);
            // Vapor que viaja por el tubo mientras se gira.
            var flujo = this.destila > 0 && this.destila < 1 ? (this.vaporV || 0) : 0;
            if (this.modo === 'flor' && flujo > 0.05 || (this.destila >= 1 && !this.embotellado)) {
                for (var q = 0; q < 12; q++) { var tt = ((s * (0.6 + flujo) + q / 12) % 1) * (tuboPts.length - 1); var i0 = Math.floor(tt), fr = tt - i0, a = tuboPts[i0], b = tuboPts[Math.min(i0 + 1, tuboPts.length - 1)]; g.fillStyle(0xffe9f2, 0.8); g.fillCircle(a[0] + (b[0] - a[0]) * fr, a[1] + (b[1] - a[1]) * fr, 5); }
            }
            if (this.modo === 'flor' || this.modo === 'moleculas') {
                var vp = this.modo === 'moleculas' ? 0.5 : 0.25 + flujo;
                for (var z = 0; z < 4; z++) { var zz = ((s * 0.5 + z / 4) % 1); g.fillStyle(0xffffff, 0.22 * (1 - zz)); g.fillCircle(A0.x + Math.sin(s * 2 + z) * 10, A0.y - u * 1.2 - zz * u * 0.8, 10 + zz * 16 * vp); }
            }
            // Manivela (rueda con asa) y marcador de avance.
            var M = m.manivela;
            if (this.modo === 'flor' && !this.embotellado) {
                g.fillStyle(0x000000, 0.3); g.fillCircle(M.x + 3, M.y + 5, M.r);
                g.fillStyle(0x8a4520, 1); g.fillCircle(M.x, M.y, M.r); g.fillStyle(0xe08a4c, 1); g.fillCircle(M.x, M.y, M.r * 0.85); g.fillStyle(0x5c2c10, 1); g.fillCircle(M.x, M.y, M.r * 0.25);
                var ang = this.manivelaAng || 0;
                g.lineStyle(M.r * 0.14, 0x5c2c10, 1); g.lineBetween(M.x, M.y, M.x + Math.cos(ang) * M.r * 0.8, M.y + Math.sin(ang) * M.r * 0.8);
                g.fillStyle(0xf6d77a, 1); g.fillCircle(M.x + Math.cos(ang) * M.r * 0.8, M.y + Math.sin(ang) * M.r * 0.8, M.r * 0.2);
                if (!this.destila) { var aa = s * 3; g.lineStyle(5, 0xffffff, 0.8); g.beginPath(); g.arc(M.x, M.y, M.r * 1.3, aa, aa + 1.6); g.strokePath(); }
            }
            // Frasco de destilado.
            var Fq = m.frasco, fg = this.frascoG; fg.clear();
            if (this.modo === 'flor' || this.modo === 'moleculas') {
                fg.fillStyle(0x000000, 0.25); fg.fillEllipse(Fq.x, Fq.y + Fq.h * 0.55, Fq.w * 1.1, Fq.h * 0.14);
                fg.fillStyle(0xe8f4f8, 0.5); fg.fillRoundedRect(Fq.x - Fq.w / 2, Fq.y - Fq.h * 0.5, Fq.w, Fq.h, 12); fg.fillRect(Fq.x - Fq.w * 0.2, Fq.y - Fq.h * 0.8, Fq.w * 0.4, Fq.h * 0.35);
                var nivel = this.embotellado ? 0.8 : this.destila * 0.8;
                fg.fillStyle(0xf783ac, 0.85); fg.fillRoundedRect(Fq.x - Fq.w * 0.4, Fq.y + Fq.h * 0.45 - Fq.h * 0.9 * nivel, Fq.w * 0.8, Fq.h * 0.9 * nivel, 8);
                fg.fillStyle(0xffffff, 0.55); fg.fillRoundedRect(Fq.x - Fq.w * 0.4, Fq.y - Fq.h * 0.4, Fq.w * 0.1, Fq.h * 0.7, 4);
                if (!this.embotellado || this.modo === 'flor') { fg.fillStyle(0xb5772f, 1); if (!(this.corcho && this.corcho.active) && !this.embotellado) fg.fillRoundedRect(Fq.x - Fq.w * 0.18, Fq.y - Fq.h * 0.92, Fq.w * 0.36, Fq.h * 0.16, 3); }
                else if (this.modo === 'flor') { fg.fillStyle(0xb5772f, 1); fg.fillRoundedRect(Fq.x - Fq.w * 0.18, Fq.y - Fq.h * 0.92, Fq.w * 0.36, Fq.h * 0.16, 3); }
            }
            // Probeta de la receta.
            if (this.modo === 'receta') {
                var P = m.probeta;
                fg.fillStyle(0x000000, 0.25); fg.fillEllipse(P.x, P.y + P.h * 0.52, P.w * 1.3, P.h * 0.07);
                fg.fillStyle(0xe8f4f8, 0.45); fg.fillRoundedRect(P.x - P.w / 2, P.y - P.h / 2, P.w, P.h, { tl: 6, tr: 6, bl: 14, br: 14 });
                (this.capas || []).forEach(function (cp) { var y1 = P.y + P.h * 0.48 - P.h * 0.92 * cp.hasta, y0 = P.y + P.h * 0.48 - P.h * 0.92 * cp.desde; if (y0 - y1 > 0.5) { fg.fillStyle(cp.col, 0.85); fg.fillRect(P.x - P.w * 0.45, y1, P.w * 0.9, y0 - y1); } });
                fg.fillStyle(0xffffff, 0.5); fg.fillRoundedRect(P.x - P.w * 0.4, P.y - P.h * 0.4, P.w * 0.08, P.h * 0.78, 4);
                if (this.rayaActual != null) { var ry = P.y + P.h * 0.48 - P.h * 0.92 * this.rayaActual; fg.lineStyle(4, 0xc2255c, 1); fg.lineBetween(P.x - P.w * 0.6, ry, P.x + P.w * 0.6, ry); fg.fillStyle(0xc2255c, 1); fg.fillTriangle(P.x - P.w * 0.75, ry - 8, P.x - P.w * 0.75, ry + 8, P.x - P.w * 0.55, ry); }
                if (this.mezclaFin) { var pulso = 0.5 + 0.5 * Math.sin(s * 5); fg.lineStyle(4, 0xffe066, pulso); fg.strokeRoundedRect(P.x - P.w * 0.55, P.y - P.h * 0.55, P.w * 1.1, P.h * 1.1, 14); }
                // Chorro del frasco que se vierte.
                var vf = this.vertiendo;
                if (vf && this.capaActual) {
                    this.capaActual.hasta = Math.min(1, this.capaActual.hasta + dt * 0.28);
                    vf.angle = -42;
                    var boca = { x: vf.x - vf.s * 0.45, y: vf.y - vf.s * 0.2 };
                    var tope = P.y + P.h * 0.48 - P.h * 0.92 * this.capaActual.hasta;
                    fg.lineStyle(7, this.capaActual.col, 0.9); fg.lineBetween(boca.x, boca.y, P.x, P.y - P.h * 0.5); fg.lineBetween(P.x, P.y - P.h * 0.5, P.x, tope);
                } else if (this.recetaFrascos) this.recetaFrascos.forEach(function (f) { if (f.active) f.angle += (0 - f.angle) * Math.min(1, dt * 10); });
            }
            // Luz de la lámpara, polvo y destello del sello.
            var lg = this.luzG; lg.clear();
            lg.fillStyle(0xfff0b8, 0.07); lg.fillTriangle(m.w * 0.5 - 24, 0, m.w * 0.5 + 24, 0, m.w * 0.5 + 260, m.mesaY); lg.fillTriangle(m.w * 0.5 - 24, 0, m.w * 0.5 + 260, m.mesaY, m.w * 0.5 - 260, m.mesaY);
            var pg = this.polvoG; pg.clear();
            this.polvo.forEach(function (d) { d.y += d.v * dt; if (d.y > 1) d.y = 0; pg.fillStyle(0xfff6d0, 0.15 + 0.25 * Math.abs(Math.sin(s * 1.2 + d.f))); pg.fillCircle(m.w * 0.3 + d.x * m.w * 0.4 + Math.sin(s + d.f) * 8, d.y * m.mesaY, d.r); });
            var fx = this.fxG; fx.clear();
            if (this.destello && time - this.destello.t < 400) { var k = (time - this.destello.t) / 400; fx.lineStyle(5 * (1 - k) + 1, 0xffe066, 1 - k); fx.strokeCircle(this.destello.x, this.destello.y, 20 + k * 60); }
            if (this.pulverizar) { for (var sp = 0; sp < 6; sp++) { var sx = m.w * (0.1 + sp * 0.16), sk = (s * 0.7 + sp * 0.17) % 1; fx.fillStyle(0xf783ac, 0.25 * (1 - sk)); fx.fillCircle(sx + Math.sin(s * 2 + sp) * 20, m.h * 0.4 - sk * m.h * 0.3, 14 + sk * 24); } }
        },

        estado: function () {
            return { modo: this.modo, destila: +(this.destila || 0).toFixed(2), atrapadas: this.atrapadas, nivel: this.capaActual ? +this.capaActual.hasta.toFixed(2) : null };
        }
    };

    function K_ruido() { var ac = global.MemoriaKit; if (ac && ac.ruido) ac.ruido({ f: 500, q: 0.8, dur: 0.07, vol: 0.06 }); else U.sfx('pop'); }

    global.PedniaPerfumeria = B.crearMotor({ id: 'perfumeria', fondo: '#5a3a22', extras: true, escena: escena });
})(typeof window !== 'undefined' ? window : this);
