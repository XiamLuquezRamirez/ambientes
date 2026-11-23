/**
 * PedniaHeladeria — «La heladería retro» (Conectando el helado — Gusto, 5-6 años).
 *
 * Una heladería de los años 50: paredes turquesa con azulejos, nevera de cristal con los botes de helado,
 * mostrador con borde cromado y, al otro lado, una barra con banquetas donde se sientan cinco CLIENTES
 * muy especiales: son los órganos de los sentidos (oído, ojo, nariz, lengua y mano).
 *   1. El helado      (reto del documento): se sirve una bola con el cucharón (se saca del bote y se lleva al
 *                     cono) y se entrega el cono al cliente que lo percibe: la lengua lo prueba.
 *   2. Los pedidos    el montaplatos trae tambor, flor, helado, sol y osito: cada plato se lleva al cliente que
 *                     lo disfruta con su sentido (si no es, el cliente niega con la cabeza).
 *   3. La cata        la lengua prueba tres cucharitas con los ojos tapados: se le da la que sabe a lo que
 *                     pide la tarjeta (dulce, ácido o chocolate).
 *   4. El cono alto   un cono de tres bolas en el orden de colores de la comanda: se sacan las bolas una a una
 *                     (si no es la que toca, se derrite) y se sirve a la lengua.
 *   Cierre: el letrero de neón enciende a la campana, la flor, el helado y el sol con sus clientes y título
 *   de Ingeniero.
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
    var SABORES = [
        { id: 'fresa', col: 0xff7ba8, osc: 0xd9457a, nombre: 'fresa', cata: 'dulce' },
        { id: 'limon', col: 0xffe45e, osc: 0xd9b400, nombre: 'limón', cata: 'ácido' },
        { id: 'choco', col: 0x8a5a36, osc: 0x4e2f18, nombre: 'chocolate', cata: 'choco' },
        { id: 'menta', col: 0x8de3c4, osc: 0x3fb08a, nombre: 'menta', cata: 'fresco' }
    ];

    function rg(i) { var x = Math.sin(i * 127.1 + 11.7) * 43758.5453; return x - Math.floor(x); }

    var escena = {
        create: function () {
            var scene = this;
            this.modo = '';
            this.contFondo = 0;
            this.polvo = [];
            this.cono = null;
            this.destello = null;
            for (var i = 0; i < 24; i++) this.polvo.push({ x: rg(i), y: rg(i + 9), r: 1 + rg(i + 3) * 1.6, v: 0.01 + rg(i + 5) * 0.02, f: rg(i + 7) * 6 });
            this.dibujarFondo();
            this.crearClientes();
            this.neonG = this.add.graphics().setDepth(3);
            this.bandejaG = this.add.graphics().setDepth(10);
            this.fxG = this.add.graphics().setDepth(36);
            this.polvoG = this.add.graphics().setDepth(4);
            this.scale.on('resize', function () { scene.dibujarFondo(); scene.ubicar(); });
        },

        m: function () {
            var w = this.scale.width, h = this.scale.height;
            return {
                w: w, h: h, barra: h * 0.66, clienteY: h * 0.865, rc: Math.min(h * 0.07, w * 0.055),
                nevera: { x0: w * 0.03, x1: w * 0.3, y0: h * 0.34, y1: h * 0.62 },
                cono: { x: w * 0.5, y: h * 0.6 },
                bandeja: { x: w * 0.5, y: h * 0.4, w: Math.min(w * 0.2, 260) },
                letrero: { x: w * 0.78, y: h * 0.2 }
            };
        },
        clienteX: function (i) { var m = this.m(); return m.w * 0.31 + i * (m.w * 0.46 / 4); },

        /* ── Escenario: heladería de los años 50 ───────────────── */

        dibujarFondo: function () {
            var m = this.m(), w = m.w, h = m.h;
            var clave = 'hel_fondo_' + (this.contFondo++);
            var t = this.textures.createCanvas(clave, Math.max(2, Math.ceil(w)), Math.max(2, Math.ceil(h)));
            var c = t.getContext();
            var rr = function (x, y, ww, hh, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, ww, hh, r); else c.rect(x, y, ww, hh); };
            var cromo = function (y0, y1) { var g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#f4f7fa'); g.addColorStop(0.45, '#aab6c3'); g.addColorStop(1, '#6b7886'); return g; };
            // Pared turquesa con azulejos y franja rosa.
            var barraY = m.barra;
            var g = c.createLinearGradient(0, 0, 0, barraY); g.addColorStop(0, '#6fd6c9'); g.addColorStop(1, '#4fb7ac'); c.fillStyle = g; c.fillRect(0, 0, w, barraY);
            var az = Math.max(40, w * 0.03);
            c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2;
            for (var x = 0; x < w; x += az) { c.beginPath(); c.moveTo(x, h * 0.3); c.lineTo(x, barraY); c.stroke(); }
            for (var y = h * 0.3; y < barraY; y += az * 0.55) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
            c.fillStyle = 'rgba(255,255,255,0.1)'; for (var x2 = 0; x2 < w; x2 += az * 2) c.fillRect(x2 + 3, h * 0.3 + 3, az - 6, barraY - h * 0.3);
            c.fillStyle = '#ff9fb8'; c.fillRect(0, h * 0.3 - 10, w, 10); c.fillStyle = cromo(h * 0.3, h * 0.3 + 8); c.fillRect(0, h * 0.3, w, 7);
            // Carta de sabores (pictogramas) y reloj.
            var cx0 = w * 0.34, cy0 = h * 0.06, cw = w * 0.26, ch = h * 0.19;
            c.save(); c.shadowColor = 'rgba(0,0,0,0.4)'; c.shadowBlur = 12; c.shadowOffsetY = 6; c.fillStyle = '#23313f'; rr(cx0, cy0, cw, ch, 10); c.fill(); c.restore();
            c.strokeStyle = cromo(cy0, cy0 + ch); c.lineWidth = 7; rr(cx0, cy0, cw, ch, 10); c.stroke();
            SABORES.forEach(function (s, i) { var bx = cx0 + cw * (0.14 + i * 0.24), by = cy0 + ch * 0.45; var gr = c.createRadialGradient(bx - 6, by - 6, 2, bx, by, ch * 0.2); gr.addColorStop(0, '#fff'); gr.addColorStop(0.3, '#' + ('000000' + s.col.toString(16)).slice(-6)); gr.addColorStop(1, '#' + ('000000' + s.osc.toString(16)).slice(-6)); c.fillStyle = gr; c.beginPath(); c.arc(bx, by, ch * 0.17, 0, 6.2832); c.fill(); c.fillStyle = '#e8c99a'; c.beginPath(); c.moveTo(bx - ch * 0.12, by + ch * 0.1); c.lineTo(bx + ch * 0.12, by + ch * 0.1); c.lineTo(bx, by + ch * 0.38); c.fill(); });
            c.fillStyle = '#f4ead2'; c.beginPath(); c.arc(w * 0.66, h * 0.15, Math.min(36, h * 0.05), 0, 6.2832); c.fill(); c.strokeStyle = cromo(0, 60); c.lineWidth = 6; c.beginPath(); c.arc(w * 0.66, h * 0.15, Math.min(36, h * 0.05), 0, 6.2832); c.stroke();
            c.strokeStyle = '#23313f'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(w * 0.66, h * 0.15); c.lineTo(w * 0.66, h * 0.15 - 20); c.moveTo(w * 0.66, h * 0.15); c.lineTo(w * 0.66 + 14, h * 0.15 + 4); c.stroke();
            // Ventana a la calle (derecha) con toldo a rayas.
            var vx = w * 0.84, vy = h * 0.05, vw = Math.min(w * 0.13, 170), vh = h * 0.22;
            var cg = c.createLinearGradient(0, vy, 0, vy + vh); cg.addColorStop(0, '#ffd9a8'); cg.addColorStop(1, '#9ed8ff'); c.fillStyle = cg; c.fillRect(vx, vy, vw, vh);
            for (var b = 0; b < 5; b++) { c.fillStyle = ['#d96a6a', '#6a8fd9', '#d9b46a'][b % 3]; c.fillRect(vx + b * vw / 5, vy + vh * (0.5 + rg(b) * 0.2), vw / 5 - 2, vh); }
            c.strokeStyle = cromo(vy, vy + vh); c.lineWidth = 8; c.strokeRect(vx, vy, vw, vh);
            // Nevera de cristal con los botes.
            var N = m.nevera;
            c.save(); c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 16; c.shadowOffsetY = 8; c.fillStyle = '#eef3f6'; rr(N.x0, N.y0, N.x1 - N.x0, N.y1 - N.y0, 14); c.fill(); c.restore();
            var gn = c.createLinearGradient(0, N.y0, 0, N.y1); gn.addColorStop(0, '#cfeef7'); gn.addColorStop(1, '#8ac4d6'); c.fillStyle = gn; rr(N.x0 + 10, N.y0 + 14, N.x1 - N.x0 - 20, N.y1 - N.y0 - 34, 10); c.fill();
            SABORES.forEach(function (s, i) {
                var bx = N.x0 + (N.x1 - N.x0) * (0.14 + i * 0.24), by = N.y0 + (N.y1 - N.y0) * 0.5, br = (N.x1 - N.x0) * 0.1;
                c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(bx + 3, by + br * 1.5, br * 1.1, br * 0.3, 0, 0, 6.2832); c.fill();
                var gt = c.createLinearGradient(bx - br, 0, bx + br, 0); gt.addColorStop(0, '#cfd8e0'); gt.addColorStop(0.5, '#f7fafc'); gt.addColorStop(1, '#8997a6'); c.fillStyle = gt; c.fillRect(bx - br, by, br * 2, br * 1.5);
                c.fillStyle = '#' + ('000000' + s.osc.toString(16)).slice(-6); c.beginPath(); c.ellipse(bx, by, br, br * 0.34, 0, 0, 6.2832); c.fill();
            });
            c.strokeStyle = cromo(N.y0, N.y1); c.lineWidth = 8; rr(N.x0, N.y0, N.x1 - N.x0, N.y1 - N.y0, 14); c.stroke();
            c.fillStyle = 'rgba(255,255,255,0.22)'; c.beginPath(); c.moveTo(N.x0 + 20, N.y0 + 16); c.lineTo(N.x0 + 70, N.y0 + 16); c.lineTo(N.x0 + 20, N.y1 - 34); c.fill();
            // Máquina de batidos y vitrola.
            var bm = w * 0.67, by2 = h * 0.35;
            c.save(); c.shadowColor = 'rgba(0,0,0,0.4)'; c.shadowBlur = 10; c.shadowOffsetY = 6; c.fillStyle = cromo(by2, by2 + h * 0.2); rr(bm, by2, w * 0.06, h * 0.2, 12); c.fill(); c.restore();
            c.fillStyle = '#d63b5a'; rr(bm + 6, by2 + h * 0.03, w * 0.06 - 12, h * 0.05, 6); c.fill(); c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(bm + 10, by2 + h * 0.04, 4, h * 0.03);
            c.fillStyle = cromo(by2, by2 + h * 0.2); c.fillRect(bm + w * 0.022, by2 + h * 0.1, w * 0.016, h * 0.09);
            var jx = w * 0.76, jy = h * 0.34;
            c.save(); c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 12; c.shadowOffsetY = 6; var gj = c.createLinearGradient(jx, 0, jx + w * 0.09, 0); gj.addColorStop(0, '#b02a4a'); gj.addColorStop(0.5, '#e24a6a'); gj.addColorStop(1, '#8c1f3b'); c.fillStyle = gj; c.beginPath(); c.moveTo(jx, jy + h * 0.28); c.lineTo(jx, jy + h * 0.08); c.quadraticCurveTo(jx + w * 0.045, jy - h * 0.04, jx + w * 0.09, jy + h * 0.08); c.lineTo(jx + w * 0.09, jy + h * 0.28); c.fill(); c.restore();
            c.fillStyle = '#ffe6a8'; c.beginPath(); c.arc(jx + w * 0.045, jy + h * 0.1, w * 0.025, 0, 6.2832); c.fill(); c.strokeStyle = cromo(0, 40); c.lineWidth = 5; c.stroke();
            for (var q = 0; q < 6; q++) { c.fillStyle = ['#ffd43b', '#4dabf7', '#69db7c'][q % 3]; c.fillRect(jx + w * 0.012 + q * w * 0.012, jy + h * 0.19, w * 0.008, h * 0.05); }
            // Barra (mostrador): superficie de formica, frente rojo acolchado y borde cromado.
            var topY = barraY;
            var gm = c.createLinearGradient(0, topY, 0, topY + h * 0.05); gm.addColorStop(0, '#fff5e6'); gm.addColorStop(1, '#e8d9bd'); c.fillStyle = gm; c.fillRect(0, topY, w, h * 0.05);
            c.fillStyle = cromo(topY + h * 0.05, topY + h * 0.065); c.fillRect(0, topY + h * 0.05, w, h * 0.014);
            var gf = c.createLinearGradient(0, topY + h * 0.064, 0, h * 0.8); gf.addColorStop(0, '#d63b4a'); gf.addColorStop(1, '#8c1f2e'); c.fillStyle = gf; c.fillRect(0, topY + h * 0.064, w, h * 0.8 - topY - h * 0.064);
            c.fillStyle = 'rgba(255,255,255,0.12)'; for (var cs = 0; cs < w; cs += 70) { c.beginPath(); c.arc(cs + 35, topY + h * 0.095, 6, 0, 6.2832); c.fill(); }
            c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(0, h * 0.8 - 14, w, 14);
            // Suelo de baldosas blanco y negro.
            var suelo = h * 0.8, tl = Math.max(54, w * 0.04);
            for (var r = 0; suelo + r * tl * 0.5 < h; r++) for (var cc = -1; cc < w / tl + 1; cc++) { c.fillStyle = (r + cc) % 2 ? '#f1ece0' : '#2a2f38'; c.fillRect(cc * tl + (r % 2) * 0, suelo + r * tl * 0.5, tl, tl * 0.5 + 1); }
            var gs = c.createLinearGradient(0, suelo, 0, h); gs.addColorStop(0, 'rgba(0,0,0,0.35)'); gs.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gs; c.fillRect(0, suelo, w, h - suelo);
            // Banquetas de los clientes (asiento rojo, poste cromado, base).
            var self = this;
            for (var i2 = 0; i2 < 5; i2++) {
                var sx = this.clienteX(i2), sy = m.clienteY + m.rc * 0.9;
                c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(sx, h * 0.97, m.rc * 1.0, m.rc * 0.18, 0, 0, 6.2832); c.fill();
                var gp = c.createLinearGradient(sx - 8, 0, sx + 8, 0); gp.addColorStop(0, '#6b7886'); gp.addColorStop(0.5, '#f4f7fa'); gp.addColorStop(1, '#6b7886'); c.fillStyle = gp; c.fillRect(sx - 7, sy + m.rc * 0.3, 14, h * 0.97 - sy - m.rc * 0.3);
                c.fillStyle = cromo(h * 0.95, h); c.beginPath(); c.ellipse(sx, h * 0.965, m.rc * 0.9, m.rc * 0.2, 0, 0, 6.2832); c.fill();
                var gc = c.createLinearGradient(0, sy - m.rc * 0.25, 0, sy + m.rc * 0.35); gc.addColorStop(0, '#ff5c6c'); gc.addColorStop(1, '#a8202f'); c.fillStyle = gc; c.beginPath(); c.ellipse(sx, sy, m.rc * 1.1, m.rc * 0.34, 0, 0, 6.2832); c.fill(); c.fillRect(sx - m.rc * 1.1, sy, m.rc * 2.2, m.rc * 0.22); c.beginPath(); c.ellipse(sx, sy + m.rc * 0.22, m.rc * 1.1, m.rc * 0.34, 0, 0, 3.1416); c.fill();
                c.strokeStyle = cromo(sy, sy + 30); c.lineWidth = 5; c.beginPath(); c.ellipse(sx, sy, m.rc * 1.1, m.rc * 0.34, 0, 0, 6.2832); c.stroke();
                c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(sx - m.rc * 0.35, sy - m.rc * 0.1, m.rc * 0.4, m.rc * 0.1, 0, 0, 6.2832); c.fill();
            }
            var v = c.createRadialGradient(w / 2, h * 0.5, h * 0.4, w / 2, h * 0.5, w * 0.72); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,30,40,0.4)'); c.fillStyle = v; c.fillRect(0, 0, w, h);
            for (var gn2 = 0; gn2 < 700; gn2++) { c.fillStyle = 'rgba(255,255,255,' + (0.02 + rg(gn2) * 0.03) + ')'; c.fillRect(rg(gn2 + 1) * w, rg(gn2 + 2) * h, 2, 2); }
            t.refresh();
            var vieja = this.fondoImg, claveVieja = this.fondoClave;
            this.fondoImg = this.add.image(0, 0, clave).setOrigin(0, 0).setDepth(1);
            this.fondoClave = clave;
            if (vieja) { vieja.destroy(); if (claveVieja && this.textures.exists(claveVieja)) this.textures.remove(claveVieja); }
            void self;
        },

        /** Los cinco clientes de la barra: los órganos de los sentidos sentados en sus banquetas. */
        crearClientes: function () {
            var scene = this, m = this.m();
            this.cli = {};
            this.ordenClientes = U.mezclar(ORDEN.slice());
            this.ordenClientes.forEach(function (id, i) {
                var o = O().crear(scene, id === 'oido' ? 'oreja' : id, scene.clienteX(i), m.clienteY, m.rc, { id: id, burbuja: false, flotar: false });
                o.cont.setDepth(20);
                scene.cli[id] = o;
            });
        },

        /** Los clientes cambian de banqueta (para que no se memorice el sitio). */
        barajarClientes: async function () {
            var scene = this, m = this.m();
            this.ordenClientes = U.mezclar(ORDEN.slice());
            await Promise.all(this.ordenClientes.map(function (id, i) { var o = scene.cli[id]; o.base.x = scene.clienteX(i); o.base.y = m.clienteY; return U.tween(scene, { targets: o.cont, x: scene.clienteX(i), y: m.clienteY - 30, duration: 260, ease: 'Sine.easeInOut' }).then(function () { return U.tween(scene, { targets: o.cont, y: m.clienteY, duration: 200, ease: 'Bounce.easeOut' }); }); }));
        },

        ubicar: function () {
            var m = this.m(), scene = this;
            this.ordenClientes.forEach(function (id, i) { var o = scene.cli[id]; o.base.x = scene.clienteX(i); o.base.y = m.clienteY; o.cont.setPosition(scene.clienteX(i), m.clienteY); });
            if (this.cono && this.cono.active) this.cono.setPosition(m.cono.x, m.cono.y);
        },

        clienteBajo: function (x, y) {
            var hit = null, kmin = 1.5, scene = this;
            ORDEN.forEach(function (id) { var o = scene.cli[id]; var k = Phaser.Math.Distance.Between(x, y, o.cont.x, o.cont.y) / o.radio; if (k < kmin) { kmin = k; hit = id; } });
            return hit;
        },

        /* ── Bolas, cono y platos ──────────────────────────────── */

        crearBola: function (sab, r) {
            var c = this.add.container(0, 0).setDepth(32);
            var g = this.add.graphics();
            g.fillStyle(0x000000, 0.25); g.fillEllipse(3, r * 0.95, r * 1.5, r * 0.4);
            g.fillStyle(sab.osc, 1); g.fillCircle(0, 0, r);
            g.fillStyle(sab.col, 1); g.fillCircle(-r * 0.1, -r * 0.1, r * 0.9);
            g.fillStyle(0xffffff, 0.5); g.fillEllipse(-r * 0.35, -r * 0.4, r * 0.5, r * 0.28);
            g.fillStyle(sab.col, 1); for (var i = -2; i <= 2; i++) g.fillEllipse(i * r * 0.36, r * 0.85, r * 0.34, r * 0.3 + (i % 2) * r * 0.1);
            if (sab.id === 'choco') { g.fillStyle(0x3a2010, 0.8); [[-0.4, -0.2], [0.3, 0.2], [0, -0.5]].forEach(function (q) { g.fillCircle(q[0] * r, q[1] * r, r * 0.07); }); }
            c.add(g); c.sab = sab; c.r = r;
            return c;
        },

        crearCono: function () {
            var m = this.m(), r = Math.min(m.h * 0.062, m.w * 0.045);
            if (this.cono && this.cono.active) this.cono.destroy();
            var c = this.add.container(m.cono.x, m.cono.y).setDepth(22);
            var g = this.add.graphics();
            g.fillStyle(0x000000, 0.25); g.fillEllipse(3, r * 1.9, r * 1.5, r * 0.3);
            var gc = r * 1.0;
            g.fillStyle(0xe0a85c, 1); g.fillTriangle(-gc, 0, gc, 0, 0, r * 2.4);
            g.fillStyle(0xf0c27a, 1); g.fillTriangle(-gc, 0, -gc * 0.1, 0, 0, r * 2.4);
            g.lineStyle(2, 0xa8742c, 0.8); for (var i = -3; i <= 3; i++) { g.lineBetween(i * gc * 0.3, 0, i * gc * 0.02, r * 2.35); }
            for (var j = 1; j < 5; j++) { var yy = j * r * 0.5, ww = gc * (1 - j * 0.2); g.lineBetween(-ww, yy, ww, yy); }
            g.fillStyle(0xd9a050, 1); g.fillRoundedRect(-gc * 1.08, -r * 0.14, gc * 2.16, r * 0.3, 6);
            c.add(g);
            c.r = r; c.capas = []; c.sabores = [];
            c.setScale(1);
            this.cono = c;
            return c;
        },

        ponerBola: function (cono, sab) {
            var r = cono.r, bola = this.crearBola(sab, r * 0.98);
            bola.setDepth(23);
            bola.x = cono.x; bola.y = cono.y - r * 0.2 - cono.capas.length * r * 1.35;
            cono.capas.push(bola); cono.sabores.push(sab.id);
            this.add.existing(bola);
            return bola;
        },

        /** Arrastra una cosa (cono, plato, cucharita) hasta un cliente. Resuelve con el id del cliente al soltarla sobre uno. */
        llevarACliente: function (obj, casa, correcto, radio) {
            var scene = this;
            return new Promise(function (resolver) {
                var arr = false, dx = 0, dy = 0;
                var pista = U.crearPista(scene, 9000, function (cancelado) {
                    var o = scene.cli[correcto];
                    return scene.ctx.mano({ punto: { x: obj.x, y: obj.y }, holdMs: 300, cancelado: cancelado, arrastre: { dx: o.cont.x - obj.x, dy: (o.cont.y - o.radio * 0.8) - obj.y, durMs: 1200 } });
                });
                pista.reiniciar();
                function abajo(p) {
                    if (Phaser.Math.Distance.Between(p.x, p.y, obj.x, obj.y) > (radio || 70)) return;
                    arr = true; dx = obj.x - p.x; dy = obj.y - p.y;
                    scene.tweens.killTweensOf(obj);
                    obj.setDepth(40); pista.reiniciar(); scene.ctx.quitarMano(); U.sfx('pop');
                }
                function mover(p) {
                    if (!arr) return;
                    obj.setPosition(p.x + dx, p.y + dy);
                    var sobre = scene.clienteBajo(obj.x, obj.y);
                    ORDEN.forEach(function (k) { scene.cli[k].cont.setScale(k === sobre ? 1.12 : 1); });
                }
                function arriba() {
                    if (!arr) return;
                    arr = false;
                    ORDEN.forEach(function (k) { scene.cli[k].cont.setScale(1); });
                    var id = scene.clienteBajo(obj.x, obj.y);
                    obj.setDepth(30);
                    if (!id) { scene.tweens.add({ targets: obj, x: casa.x, y: casa.y, duration: 450, ease: 'Back.easeOut' }); return; }
                    scene.input.off('pointerdown', abajo); scene.input.off('pointermove', mover); scene.input.off('pointerup', arriba);
                    pista.parar(); resolver(id);
                }
                scene.input.on('pointerdown', abajo); scene.input.on('pointermove', mover); scene.input.on('pointerup', arriba);
            });
        },

        /** Saca una bola del bote (arrastrando desde la nevera) y la suelta sobre el cono. Resuelve {sab} si cayó en el cono. */
        sacarBola: function (cono, esperado) {
            var scene = this, m = this.m(), N = m.nevera;
            return new Promise(function (resolver) {
                var bola = null, dx = 0, dy = 0;
                var botes = SABORES.map(function (s, i) { return { sab: s, x: N.x0 + (N.x1 - N.x0) * (0.14 + i * 0.24), y: N.y0 + (N.y1 - N.y0) * 0.5 }; });
                var pista = U.crearPista(scene, 9000, function (cancelado) {
                    var b = botes.find(function (q) { return q.sab.id === esperado; }) || botes[0];
                    return scene.ctx.mano({ punto: { x: b.x, y: b.y }, holdMs: 300, cancelado: cancelado, arrastre: { dx: cono.x - b.x, dy: (cono.y - cono.r * (0.3 + cono.capas.length * 1.35)) - b.y, durMs: 1200 } });
                });
                pista.reiniciar();
                function abajo(p) {
                    var b = botes.find(function (q) { return Phaser.Math.Distance.Between(p.x, p.y, q.x, q.y) < (N.x1 - N.x0) * 0.13; });
                    if (!b || bola) return;
                    bola = scene.crearBola(b.sab, cono.r * 0.98);
                    bola.setPosition(p.x, p.y); dx = 0; dy = 0;
                    pista.reiniciar(); scene.ctx.quitarMano(); U.sfx('pop');
                    scene.tweens.add({ targets: bola, scale: { from: 0.4, to: 1 }, duration: 160 });
                }
                function mover(p) { if (bola) bola.setPosition(p.x + dx, p.y + dy); }
                function arriba() {
                    if (!bola) return;
                    var b = bola; bola = null;
                    var capa = cono.y - cono.r * (0.2 + cono.capas.length * 1.35);
                    if (Phaser.Math.Distance.Between(b.x, b.y, cono.x, capa) < cono.r * 1.6) {
                        scene.input.off('pointerdown', abajo); scene.input.off('pointermove', mover); scene.input.off('pointerup', arriba);
                        pista.parar();
                        var sab = b.sab;
                        scene.tweens.add({ targets: b, x: cono.x, y: capa, duration: 160, ease: 'Quad.easeIn', onComplete: function () { b.destroy(); resolver(sab); } });
                    } else {
                        scene.tweens.add({ targets: b, y: b.y + 80, alpha: 0, scale: 0.6, duration: 320, onComplete: function () { b.destroy(); } });
                    }
                }
                scene.input.on('pointerdown', abajo); scene.input.on('pointermove', mover); scene.input.on('pointerup', arriba);
            });
        },

        /** Plato con un estímulo que sale por el montaplatos. */
        crearPlato: function (id) {
            var m = this.m(), B2 = m.bandeja, t = B2.w * 0.5;
            var c = this.add.container(B2.x, B2.y - 50).setDepth(30);
            var g = this.add.graphics();
            g.fillStyle(0x000000, 0.28); g.fillEllipse(4, t * 0.62, t * 1.7, t * 0.34);
            g.fillStyle(0xaab6c3, 1); g.fillEllipse(0, t * 0.5, t * 1.7, t * 0.4);
            g.fillStyle(0xf4f7fa, 1); g.fillEllipse(0, t * 0.46, t * 1.55, t * 0.34);
            g.fillStyle(0xdfe6ec, 1); g.fillEllipse(0, t * 0.46, t * 1.2, t * 0.24);
            c.add(g);
            if (id === 'tambor') { var d = B.tambor(this, 0, -t * 0.15, t * 1.0); c.add(d.cont); c.tambor = d; }
            else {
                if (id === 'sol') { var rayos = this.add.image(0, -t * 0.1, A().textura(this, 'sol_rayos', 160)).setDisplaySize(t * 1.15, t * 1.15); c.add(rayos); c.rayos = rayos; }
                c.add(this.add.image(0, -t * 0.1, A().textura(this, id, 160)).setDisplaySize(t * 0.9, t * 0.9));
            }
            c.id = id; c.t = t;
            var scene = this;
            c.senal = function () {
                if (id === 'tambor') c.tambor.sonar();
                else if (id === 'flor') U.aroma(scene, c.x, c.y - t * 0.2, { n: 3, alto: 50, depth: 31 });
                else if (id === 'helado') { var gt = scene.add.image(c.x + t * 0.12, c.y, A().textura(scene, 'gota', 64)).setDisplaySize(10, 14).setDepth(31); scene.tweens.add({ targets: gt, y: c.y + t * 0.3, alpha: 0, duration: 800, onComplete: function () { gt.destroy(); } }); }
                else if (id === 'sol') scene.tweens.add({ targets: c.rayos, angle: '+=40', duration: 1200 });
                else if (id === 'osito') scene.tweens.add({ targets: c, scaleX: 1.08, scaleY: 0.94, duration: 300, yoyo: true });
            };
            return c;
        },

        desvanecer: function (obj) { this.tweens.add({ targets: obj, alpha: 0, duration: 300, onComplete: function () { if (obj.active) obj.destroy(); } }); },

        /* ── Ronda 1: servir el helado ─────────────────────────── */

        rondaHelado: async function () {
            var scene = this, m = this.m(), r = this.reto;
            this.modo = 'helado';
            await this.ctx.decir(r.presentacion || { voz: 'zoe', texto: '¡Bienvenido a la heladería! Un cliente quiere un helado. Saca una bola de un bote, ponla en el cono y llévaselo al cliente que lo disfruta.' });
            var sab = SABORES[Math.floor(Math.random() * 3)];
            var cono = this.crearCono();
            cono.setAlpha(0); cono.y += 40;
            await U.tween(this, { targets: cono, alpha: 1, y: m.cono.y, duration: 450, ease: 'Back.easeOut' });
            var s1 = await this.sacarBola(cono, sab.id);
            var bola = this.ponerBola(cono, s1);
            U.sfx('recompensa');
            this.tweens.add({ targets: bola, scaleY: { from: 0.8, to: 1 }, duration: 260, ease: 'Back.easeOut' });
            await this.ctx.decir({ voz: 'zeus', texto: '¡Qué rico helado de ' + s1.nombre + '! Llévaselo al cliente que lo disfruta con su sentido.' });
            await this.entregarCono(cono, 'lengua', 'helado');
            await this.ctx.decir(r.acierto || { voz: 'zoe', texto: '¡Muy bien! Helado se relaciona con la lengua.' }, { estado: 'acierto' });
            this.desvanecer(cono); this.cono = null;
            cono.capas.forEach(function (b) { scene.desvanecer(b); });
            await U.esperar(this, 400);
        },

        /** Entrega el cono: si es el cliente correcto, lo prueba; si no, niega y el cono vuelve. */
        entregarCono: async function (cono, correcto, clave) {
            var m = this.m(), casa = { x: m.cono.x, y: m.cono.y }, scene = this;
            while (true) {
                var id = await this.llevarACliente(cono, casa, correcto, cono.r * 2.2);
                var o = this.cli[id];
                // El cono (y sus bolas) viaja con el cliente.
                if (id === correcto) {
                    await U.tween(this, { targets: cono, x: o.cont.x, y: o.cont.y - o.radio * 0.9, duration: 350, ease: 'Sine.easeOut' });
                    U.sfx('miamMiam');
                    await o.reaccion('acierto');
                    U.estallido(this, o.cont.x, o.cont.y - o.radio, { n: 12, dist: 100, tex: 'corazon', depth: 60 });
                    this.destello = { x: o.cont.x, y: o.cont.y, t: this.time.now };
                    return id;
                }
                U.sfx('boing');
                await o.reaccion('error');
                await this.ctx.decir({ voz: 'zeus', texto: '¡Ups! ' + POR_QUE[clave] });
                await U.tween(this, { targets: cono, x: casa.x, y: casa.y, duration: 450, ease: 'Back.easeOut' });
            }
        },

        /* ── Ronda 2: los pedidos del montaplatos ──────────────── */

        rondaPedidos: async function () {
            var scene = this, m = this.m();
            this.modo = 'pedidos';
            await this.barajarClientes();
            await this.ctx.decir({ voz: 'zeus', texto: '¡Llegan más pedidos por el montaplatos! Lleva cada plato al cliente que lo disfruta con su sentido.' });
            var orden = U.mezclar(['tambor', 'flor', 'helado', 'sol', 'osito']);
            var frases = ['¡Servido!', '¡Muy bien!', '¡Otro pedido!', '¡Excelente!', '¡Todos están servidos!'];
            var casa = { x: m.bandeja.x, y: m.bandeja.y };
            for (var i = 0; i < orden.length; i++) {
                var id = orden[i];
                var plato = this.crearPlato(id);
                plato.alpha = 0;
                await U.tween(this, { targets: plato, alpha: 1, y: casa.y, duration: 450, ease: 'Back.easeOut' });
                var senal = this.time.addEvent({ delay: 2200, loop: true, callback: (function (p) { return function () { if (p.active) p.senal(); }; })(plato) });
                plato.senal();
                var ok = false;
                while (!ok) {
                    var cli = await this.llevarACliente(plato, casa, SENTIDO[id], plato.t * 1.1);
                    var o = this.cli[cli];
                    if (cli === SENTIDO[id]) { ok = true; break; }
                    U.sfx('boing');
                    await Promise.all([o.reaccion('error'), this.ctx.decir({ voz: 'zeus', texto: '¡Ups! ' + POR_QUE[id] })]);
                    await U.tween(this, { targets: plato, x: casa.x, y: casa.y, duration: 450, ease: 'Back.easeOut' });
                }
                senal.remove();
                var oc = this.cli[SENTIDO[id]];
                await U.tween(this, { targets: plato, x: oc.cont.x, y: oc.cont.y - oc.radio * 0.9, scale: 0.55, duration: 450, ease: 'Sine.easeInOut' });
                U.sfx('recompensa');
                await oc.reaccion('acierto');
                this.ctx.decir({ voz: 'zoe', texto: frases[i] + ' ' + POR_QUE[id] }, { estado: 'acierto' });
                this.desvanecer(plato);
                await U.esperar(this, 800);
            }
            void scene;
        },

        /* ── Ronda 3: la cata con los ojos tapados ─────────────── */

        crearCucharita: function (sab, x, y) {
            var m = this.m(), s = m.h * 0.075;
            var c = this.add.container(x, y).setDepth(30);
            var g = this.add.graphics();
            g.fillStyle(0x000000, 0.25); g.fillEllipse(4, s * 0.55, s * 1.8, s * 0.28);
            g.fillStyle(0xaab6c3, 1); g.fillRoundedRect(-s * 0.1, -s * 0.1, s * 1.1, s * 0.2, s * 0.1);
            g.fillStyle(0xf4f7fa, 1); g.fillEllipse(-s * 0.35, 0, s * 0.9, s * 0.65);
            g.fillStyle(sab.osc, 1); g.fillEllipse(-s * 0.35, -s * 0.05, s * 0.74, s * 0.46);
            g.fillStyle(sab.col, 1); g.fillEllipse(-s * 0.35, -s * 0.12, s * 0.66, s * 0.38);
            g.fillStyle(0xffffff, 0.5); g.fillEllipse(-s * 0.5, -s * 0.2, s * 0.2, s * 0.1);
            c.add(g);
            c.sab = sab; c.s = s;
            return c;
        },

        rondaCata: async function () {
            var scene = this, m = this.m(), casa0 = m.bandeja;
            this.modo = 'cata';
            await this.barajarClientes();
            var L0 = this.cli.lengua;
            await this.ctx.decir({ voz: 'zoe', texto: 'Ahora es la hora de la cata. La lengua se tapa los ojos y prueba la cucharita que le des. Mira la tarjeta: ¿qué sabor pide?' });
            var pedidos = U.mezclar(['fresa', 'limon', 'choco']);
            var CATA = { fresa: { icono: 'corazon', txt: 'dulce' }, limon: { icono: 'chispa', txt: 'ácido' }, choco: { icono: 'helado', txt: 'chocolate' } };
            for (var r = 0; r < 3; r++) {
                var pide = SABORES.find(function (s) { return s.id === pedidos[r]; });
                // Tarjeta con la cara del sabor (dulce, ácido o chocolate).
                var tj = this.add.container(casa0.x, casa0.y - m.h * 0.04).setDepth(12);
                var tw = Math.min(m.w * 0.17, 210);
                var g = this.add.graphics();
                g.fillStyle(0x000000, 0.3); g.fillRoundedRect(-tw / 2 + 4, -tw * 0.45 + 8, tw, tw * 0.9, 14);
                g.fillStyle(0xfdf6e3, 1); g.fillRoundedRect(-tw / 2, -tw * 0.45, tw, tw * 0.9, 14);
                g.lineStyle(4, 0xd9457a, 1); g.strokeRoundedRect(-tw / 2 + 8, -tw * 0.45 + 8, tw - 16, tw * 0.9 - 16, 10);
                g.fillStyle(pide.col, 1); g.fillCircle(0, -tw * 0.04, tw * 0.28); g.fillStyle(pide.osc, 0.3); g.fillCircle(0, tw * 0.0, tw * 0.2);
                g.fillStyle(0x2b2b3b, 1);
                if (pide.id === 'limon') { g.fillCircle(-tw * 0.09, -tw * 0.1, 4); g.fillCircle(tw * 0.09, -tw * 0.1, 4); g.lineStyle(5, 0x2b2b3b, 1); g.beginPath(); g.arc(0, tw * 0.06, tw * 0.09, 3.4, 6.0); g.strokePath(); g.fillStyle(0x4dabf7, 1); g.fillEllipse(tw * 0.2, -tw * 0.1, 8, 14); }
                else { g.fillCircle(-tw * 0.09, -tw * 0.1, 4); g.fillCircle(tw * 0.09, -tw * 0.1, 4); g.lineStyle(5, 0x2b2b3b, 1); g.beginPath(); g.arc(0, -tw * 0.02, tw * 0.11, 0.3, 2.84); g.strokePath(); if (pide.id === 'fresa') { g.fillStyle(0xff4d6d, 0.6); g.fillCircle(-tw * 0.17, 0, 7); g.fillCircle(tw * 0.17, 0, 7); } }
                tj.add(g); tj.add(this.add.image(0, tw * 0.3, A().textura(this, CATA[pide.id].icono, 96)).setDisplaySize(tw * 0.22, tw * 0.22));
                tj.setAlpha(0); tj.y -= 30;
                await U.tween(this, { targets: tj, alpha: 1, y: casa0.y - m.h * 0.04, duration: 420, ease: 'Back.easeOut' });
                // Tres cucharitas sobre el mostrador.
                var cuch = U.mezclar([pide].concat(U.mezclar(SABORES.filter(function (s) { return s.id !== pide.id; })).slice(0, 2))).map(function (s, i) { var c = scene.crearCucharita(s, m.w * (0.42 + i * 0.1), m.barra - m.h * 0.015); c.casa = { x: c.x, y: c.y }; c.setAlpha(0); scene.tweens.add({ targets: c, alpha: 1, duration: 300, delay: i * 120 }); return c; });
                // La lengua se pone un antifaz.
                var anti = this.add.graphics().setDepth(22); anti.fillStyle(0x23313f, 1); anti.fillRoundedRect(L0.cont.x - L0.radio * 0.9, L0.cont.y - L0.radio * 1.55, L0.radio * 1.8, L0.radio * 0.55, 10); anti.lineStyle(3, 0x111c27, 1); anti.strokeRoundedRect(L0.cont.x - L0.radio * 0.9, L0.cont.y - L0.radio * 1.55, L0.radio * 1.8, L0.radio * 0.55, 10);
                if (r === 0) await this.ctx.decir({ voz: 'zeus', texto: 'La tarjeta enseña cómo sabe lo que pide. Dale a la lengua la cucharita que sepa así.' });
                var ok = false;
                while (!ok) {
                    var elegida = await this.cucharaALengua(cuch, pide.id);
                    await U.tween(this, { targets: elegida, x: L0.cont.x, y: L0.cont.y - L0.radio * 0.2, duration: 300 });
                    await L0.lamer(1);
                    if (elegida.sab.id === pide.id) { ok = true; U.sfx('miamMiam'); await L0.reaccion('acierto'); break; }
                    var dice = { fresa: 'dulce', limon: 'ácido', choco: 'a chocolate' }[elegida.sab.id];
                    U.sfx('boing');
                    await this.ctx.decir({ voz: 'zeus', texto: 'Esa cucharita sabe ' + dice + '. ¡Prueba con otra!' });
                    await U.tween(this, { targets: elegida, x: elegida.casa.x, y: elegida.casa.y, duration: 420, ease: 'Back.easeOut' });
                }
                await this.ctx.decir({ voz: 'zoe', texto: ['¡Qué dulce! La lengua saborea el helado.', '¡Qué ácido! Saboreamos con la lengua.', '¡Qué rico chocolate!'][r] }, { estado: 'acierto' });
                this.desvanecer(tj); cuch.forEach(function (c) { scene.desvanecer(c); }); this.desvanecer(anti);
                await U.esperar(this, 500);
            }
        },

        cucharaALengua: function (cuch, correcto) {
            var scene = this;
            return new Promise(function (resolver) {
                var cur = null, dx = 0, dy = 0;
                var pista = U.crearPista(scene, 9000, function (cancelado) {
                    var c = cuch.find(function (q) { return q.sab.id === correcto; }), o = scene.cli.lengua;
                    return scene.ctx.mano({ punto: { x: c.x, y: c.y }, holdMs: 300, cancelado: cancelado, arrastre: { dx: o.cont.x - c.x, dy: (o.cont.y - o.radio * 0.5) - c.y, durMs: 1200 } });
                });
                pista.reiniciar();
                function abajo(p) { var hit = cuch.find(function (c) { return c.active && Phaser.Math.Distance.Between(p.x, p.y, c.x, c.y) < c.s * 0.9; }); if (!hit) return; cur = hit; dx = hit.x - p.x; dy = hit.y - p.y; scene.tweens.killTweensOf(hit); hit.setDepth(40); pista.reiniciar(); scene.ctx.quitarMano(); U.sfx('pop'); }
                function mover(p) { if (cur) cur.setPosition(p.x + dx, p.y + dy); }
                function arriba() {
                    if (!cur) return;
                    var c = cur; cur = null; c.setDepth(30);
                    var o = scene.cli.lengua;
                    if (Phaser.Math.Distance.Between(c.x, c.y, o.cont.x, o.cont.y) > o.radio * 1.6) { scene.tweens.add({ targets: c, x: c.casa.x, y: c.casa.y, duration: 420, ease: 'Back.easeOut' }); return; }
                    scene.input.off('pointerdown', abajo); scene.input.off('pointermove', mover); scene.input.off('pointerup', arriba);
                    pista.parar(); resolver(c);
                }
                scene.input.on('pointerdown', abajo); scene.input.on('pointermove', mover); scene.input.on('pointerup', arriba);
            });
        },

        /* ── Ronda 4: el cono de tres bolas ────────────────────── */

        rondaCono: async function () {
            var scene = this, m = this.m();
            this.modo = 'cono';
            await this.barajarClientes();
            var secuencia = U.mezclar(SABORES.slice()).slice(0, 3);
            this.secuenciaIds = secuencia.map(function (q) { return q.id; });
            await this.ctx.decir({ voz: 'zoe', texto: '¡Una comanda especial! Mira los colores de arriba abajo y sirve las bolas en el mismo orden. Luego se la llevas a la lengua.' });
            // Comanda: tres bolitas de colores en una tarjeta.
            var cm = this.add.container(m.bandeja.x, m.bandeja.y - m.h * 0.02).setDepth(12);
            var g = this.add.graphics(); var tw = Math.min(m.w * 0.08, 110);
            g.fillStyle(0x000000, 0.3); g.fillRoundedRect(-tw * 0.55 + 4, -tw * 1.9 + 8, tw * 1.1, tw * 3.8, 14);
            g.fillStyle(0xfdf6e3, 1); g.fillRoundedRect(-tw * 0.55, -tw * 1.9, tw * 1.1, tw * 3.8, 14);
            g.lineStyle(4, 0xd9457a, 1); g.strokeRoundedRect(-tw * 0.48, -tw * 1.82, tw * 0.96, tw * 3.64, 10);
            cm.add(g);
            var marcas = [];
            secuencia.forEach(function (s, i) { var yy = -tw * 1.05 + i * tw * 1.05; var b = scene.crearBola(s, tw * 0.36); b.setPosition(0, yy).setDepth(13); cm.add(b); marcas.push(b); });
            var chk = this.add.graphics(); cm.add(chk);
            cm.setAlpha(0); cm.y -= 30;
            await U.tween(this, { targets: cm, alpha: 1, y: m.bandeja.y - m.h * 0.02, duration: 420, ease: 'Back.easeOut' });
            var cono = this.crearCono();
            cono.setAlpha(0);
            await U.tween(this, { targets: cono, alpha: 1, duration: 350 });
            for (var i = 0; i < 3; i++) {
                var objetivo = secuencia[i], ok = false;
                while (!ok) {
                    var sab = await this.sacarBola(cono, objetivo.id);
                    if (sab.id === objetivo.id) { ok = true; var bola = this.ponerBola(cono, sab); U.sfx('recompensa'); this.tweens.add({ targets: bola, scaleY: { from: 0.8, to: 1 }, duration: 260, ease: 'Back.easeOut' }); this.tweens.add({ targets: marcas[i], scale: 1.25, duration: 200, yoyo: true }); chk.lineStyle(5, 0x2b8a3e, 1); chk.beginPath(); var yy2 = -tw * 1.05 + i * tw * 1.05; chk.moveTo(tw * 0.3, yy2 - 4); chk.lineTo(tw * 0.38, yy2 + 6); chk.lineTo(tw * 0.5, yy2 - 12); chk.strokePath(); }
                    else {
                        U.sfx('boing');
                        var salpicadura = this.add.image(cono.x, cono.y - cono.r * (0.2 + cono.capas.length * 1.35), A().textura(this, 'chispa', 64)).setDisplaySize(60, 60).setTint(sab.col).setDepth(31);
                        this.tweens.add({ targets: salpicadura, y: salpicadura.y + 90, alpha: 0, duration: 500, onComplete: function () { salpicadura.destroy(); } });
                        this.ctx.decir({ voz: 'zeus', texto: 'Esa no es la bola que toca. ¡Mira el color de la comanda!' });
                    }
                }
            }
            await this.ctx.decir({ voz: 'zeus', texto: '¡Un cono altísimo! Llévaselo al cliente que lo saborea.' });
            await this.entregarCono(cono, 'lengua', 'helado');
            await this.ctx.decir({ voz: 'zoe', texto: '¡Qué rico! La lengua nos permite saborear.' }, { estado: 'acierto' });
            this.desvanecer(cono); this.cono = null; cono.capas.forEach(function (b) { scene.desvanecer(b); });
            this.desvanecer(cm);
            await U.esperar(this, 500);
            this.modo = '';
        },

        /* ── API ───────────────────────────────────────────────── */

        demo: async function () {
            var scene = this, m = this.m(), ctx = this.ctx;
            var t = ctx.textos || {};
            this.modo = 'demo';
            var plato = this.crearPlato('tambor');
            var casa = { x: m.bandeja.x, y: m.bandeja.y };
            plato.alpha = 0;
            await U.tween(this, { targets: plato, alpha: 1, y: casa.y, duration: 450, ease: 'Back.easeOut' });
            var limpiar = function () { scene.desvanecer(plato); ctx.quitarMano(); scene.modo = ''; };
            await ctx.decir({ voz: 'zoe', texto: t.demostracion || '¡Mira cómo se juega!' }, { minMs: 2200 });
            if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
            await ctx.mano({ punto: { x: plato.x, y: plato.y }, holdMs: 600, onPresionar: function () { plato.tambor.sonar(); } });
            await U.esperar(this, 300);
            if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
            var o = this.cli.oido;
            await ctx.mano({
                punto: { x: plato.x, y: plato.y }, holdMs: 300,
                arrastre: { dx: o.cont.x - plato.x, dy: (o.cont.y - o.radio * 0.9) - plato.y, durMs: 1100, soltarEnDestino: true },
                onDuranteArrastre: function () { scene.tweens.add({ targets: plato, x: o.cont.x, y: o.cont.y - o.radio * 0.9, scale: 0.55, duration: 1100, ease: 'Sine.easeInOut' }); }
            });
            if (!ctx.vivo()) return limpiar();
            U.sfx('recompensa'); plato.tambor.sonar();
            await o.reaccion('acierto');
            await ctx.decir({ voz: 'zoe', texto: t.demostracionAcierto || '¡Así se hace!' }, { estado: 'acierto', minMs: 1600 });
            await ctx.decir({ voz: 'zoe', texto: t.demostracionFin || '¡Ahora te toca a ti!' }, { minMs: 1200 });
            limpiar();
            await U.esperar(this, 400);
        },

        jugar: async function () {
            await this.rondaHelado();
            if (!this.ctx.vivo()) return;
            if (this.ganarNivel) await this.ganarNivel(0);
            await this.rondaPedidos();
            if (!this.ctx.vivo()) return;
            if (this.ganarNivel) await this.ganarNivel(1);
            await this.rondaCata();
            if (!this.ctx.vivo()) return;
            if (this.ganarNivel) await this.ganarNivel(2);
            await this.rondaCono();
            if (!this.ctx.vivo()) return;
            if (this.ganarNivel) await this.ganarNivel(3);
        },

        /** Cierre: el letrero de neón enciende a los cuatro estímulos y sus clientes; baile, confeti y título. */
        fiestaFinal: async function () {
            var scene = this, m = this.m();
            this.modo = 'final';
            this.ctx.decir({ voz: 'zoe', texto: '¡Excelente! Encontraste todas las parejas sensoriales.' });
            var L1 = m.letrero;
            var pares = [{ id: 'campana', o: 'oido' }, { id: 'flor', o: 'nariz' }, { id: 'helado', o: 'lengua' }, { id: 'sol', o: 'ojo' }];
            this.neon = [];
            var x0 = m.w * 0.2, paso = (m.w * 0.68 - x0) / 3;
            for (var i = 0; i < pares.length; i++) {
                var p = pares[i], o = this.cli[p.o];
                var ico = this.add.container(x0 + i * paso, m.h * 0.2).setDepth(32);
                ico.add([this.add.circle(0, 0, 38, 0x1b2a4a).setStrokeStyle(4, COLOR[p.o]), this.add.image(0, 0, A().textura(this, p.id, 128)).setDisplaySize(58, 58)]);
                ico.setScale(0.1);
                await U.tween(this, { targets: ico, scale: 1, duration: 350, ease: 'Back.easeOut' });
                this.neon.push({ x0: ico.x, y0: ico.y + 40, o: o, col: COLOR[p.o], t0: this.time.now });
                U.sfx('chispas');
                o.reaccion('acierto');
                await U.esperar(this, 550);
            }
            this.pulsar = true;
            U.confeti(this, 110);
            ORDEN.forEach(function (id) { scene.tweens.add({ targets: scene.cli[id].cont, y: scene.cli[id].cont.y - 22, duration: 280, yoyo: true, repeat: 7, ease: 'Sine.easeInOut' }); });
            var tt = L().titulo(this, '¡Ingeniero de Conexiones Sensoriales!', { y: m.h - 46, x: (m.w - 140) / 2, ancho: m.w - 190 });
            U.sfx('celebracion');
            await U.esperar(this, 3400);
            void tt; void L1;
        },

        update: function (time, delta) {
            var scene = this, dt = Math.min(delta || 16, 50) / 1000, m = this.m(), s = time / 1000;
            if (!this.neonG || !this.neonG.active) return;
            ORDEN.forEach(function (id) { if (scene.cli[id]) scene.cli[id].actualizar(time); });
            // Clientes: miran hacia lo que se está sirviendo.
            var foco = this.cono && this.cono.active ? this.cono : null;
            ORDEN.forEach(function (id) { var o = scene.cli[id]; if (foco) o.mirar(foco.x, foco.y); });
            // Letrero de neón (cono) y luz de la nevera: respiran suavemente.
            var ng = this.neonG; ng.clear();
            var L1 = m.letrero, br = 0.55 + 0.45 * Math.sin(s * 3);
            ng.lineStyle(14, 0xff6fa6, 0.18 * br); ng.strokeCircle(L1.x, L1.y, m.h * 0.075);
            ng.lineStyle(5, 0xff9fc6, 0.9 * br + 0.1); ng.strokeCircle(L1.x, L1.y, m.h * 0.075);
            ng.lineStyle(5, 0x7fe3ff, 0.9); ng.beginPath(); ng.moveTo(L1.x - m.h * 0.045, L1.y + m.h * 0.02); ng.lineTo(L1.x, L1.y + m.h * 0.075 * 0.95); ng.lineTo(L1.x + m.h * 0.045, L1.y + m.h * 0.02); ng.strokePath();
            ng.fillStyle(0xff9fc6, 0.8 * br + 0.1); ng.fillCircle(L1.x, L1.y - m.h * 0.012, m.h * 0.03);
            // Rayos de neón del final: del estímulo al cliente que lo percibe.
            var fx = this.fxG; fx.clear();
            if (this.neon) this.neon.forEach(function (n) {
                var tx = n.o.cont.x, ty = n.o.cont.y - n.o.radio;
                fx.lineStyle(10, n.col, 0.18); fx.lineBetween(n.x0, n.y0, tx, ty);
                fx.lineStyle(4, n.col, 0.9); fx.lineBetween(n.x0, n.y0, tx, ty);
                var k = ((s * 0.8) % 1); fx.fillStyle(0xffffff, 0.9); fx.fillCircle(n.x0 + (tx - n.x0) * k, n.y0 + (ty - n.y0) * k, 7);
            });
            if (this.destello && time - this.destello.t < 500) { var kk = (time - this.destello.t) / 500; fx.lineStyle(5 * (1 - kk) + 1, 0xffe066, 1 - kk); fx.strokeCircle(this.destello.x, this.destello.y, 20 + kk * 70); }
            // Hielo seco / vaho frío saliendo de la nevera y polvo en la luz.
            var pg = this.polvoG; pg.clear();
            for (var z = 0; z < 5; z++) { var zz = ((s * 0.25 + z / 5) % 1); pg.fillStyle(0xffffff, 0.12 * (1 - zz)); pg.fillCircle(m.nevera.x0 + (m.nevera.x1 - m.nevera.x0) * (0.2 + z * 0.15) + Math.sin(s + z) * 10, m.nevera.y1 - zz * 40, 14 + zz * 18); }
            this.polvo.forEach(function (d) { d.y += d.v * dt; if (d.y > 1) d.y = 0; pg.fillStyle(0xfff6d0, 0.12 + 0.2 * Math.abs(Math.sin(s * 1.2 + d.f))); pg.fillCircle(m.w * 0.3 + d.x * m.w * 0.5, d.y * m.barra, d.r); });
            // Bolas del cono: se balancean un poquito mientras se apilan.
            if (this.cono && this.cono.active) {
                var cn = this.cono;
                cn.capas.forEach(function (b, i) { if (b.active) { b.x = cn.x + Math.sin(s * 3 + i) * (1 + i * 1.5); b.y = cn.y - cn.r * (0.2 + i * 1.35); b.depth = 23 + i; } });
                if (!this.tweens.isTweening(cn)) cn.angle = Math.sin(s * 2) * (cn.capas.length * 0.8);
            }
        },

        estado: function () {
            return { modo: this.modo, cono: this.cono && this.cono.active ? this.cono.sabores.slice() : null };
        }
    };

    global.PedniaHeladeria = B.crearMotor({ id: 'heladeria', fondo: '#4fb7ac', extras: true, escena: escena });
})(typeof window !== 'undefined' ? window : this);
