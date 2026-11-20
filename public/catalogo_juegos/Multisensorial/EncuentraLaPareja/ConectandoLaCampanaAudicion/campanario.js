/**
 * PedniaCampanario — «El campanario del gigante» (Conectando la campana — Audición, 5-6 años).
 *
 * Noche en un pueblo con campanario. Detrás de la colina duerme un gigante amable cuya cara asoma:
 * sus cinco sentidos (oído, ojo, nariz, lengua y mano) son los órganos de siempre, ahora enormes.
 *   1. La campana     (reto del documento): se TIRA DE LA SOGA y la campana se balancea y suena; de ella sale
 *                     una nota brillante que se lleva hasta el sentido que la percibe. Verificación del
 *                     documento: «Afina la nota» con tres campanillas de distinto tono colgadas de una viga.
 *   2. Los regalos    cinco regalos del pueblo (tambor, flor, helado, sol, osito): cada uno se lleva al sentido
 *                     que lo percibe. Si se equivoca, el órgano prueba, niega y Zeus explica.
 *   3. Sin mirar      las contraventanas del campanario se cierran: suena un instrumento escondido y se toca la
 *                     tarjeta que suena igual; las contraventanas se abren y lo muestran.
 *   4. ¿Dónde suena?  cuatro campanas perdidas en la noche: se mueve la trompetilla y se escucha; suena más
 *                     fuerte y más rápido cuanto más cerca está y del lado donde está.
 *   Final: el gigante despierta; sus sentidos se encienden uno a uno y la señal llega al cerebro.
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

    var ctxAudio = null;
    /** Tono de campanita (parciales de campana). */
    function campanita(f, vol) {
        var C = global.AudioContext || global.webkitAudioContext;
        if (!C) return;
        if (!ctxAudio) ctxAudio = new C();
        if (ctxAudio.state === 'suspended') ctxAudio.resume();
        var t = ctxAudio.currentTime + 0.02;
        [[1, 0.28], [2.01, 0.12], [2.76, 0.07], [4.07, 0.03]].forEach(function (p) {
            var o = ctxAudio.createOscillator();
            var g = ctxAudio.createGain();
            o.frequency.value = f * p[0];
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(p[1] * (vol || 1), t + 0.005);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
            o.connect(g).connect(ctxAudio.destination);
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
            this.bal = null;
            this.contFondo = 0;
            this.dibujarFondo();
            this.crearGigante();
            this.crearTorre();
            this.ondas = this.add.graphics().setDepth(14);
            this.cuerdaG = this.add.graphics().setDepth(13);
            this.scale.on('resize', function () { scene.dibujarFondo(); scene.ubicar(); });
        },

        /** Medidas: la torre a la izquierda, la cara del gigante abajo al centro. */
        m: function () {
            var w = this.scale.width, h = this.scale.height;
            var R = Math.min(h * 0.3, w * 0.2);
            var fx = w * 0.56, cy = h * 0.78;
            var tw = Math.min(w * 0.17, 230);
            var tx0 = Math.max(10, w * 0.035);
            var torre = { x0: tx0, x1: tx0 + tw, w: tw, top: h * 0.1, base: h * 0.84, cx: tx0 + tw / 2 };
            torre.arcoY0 = torre.top + h * 0.1; torre.arcoY1 = torre.top + h * 0.33;
            torre.arcoW = tw * 0.5;
            return {
                w: w, h: h, R: R, fx: fx, cy: cy, torre: torre,
                pos: {
                    ojo: { x: fx, y: cy - R * 0.3, r: R * 0.36 },
                    nariz: { x: fx, y: cy + R * 0.12, r: R * 0.28 },
                    lengua: { x: fx, y: cy + R * 0.52, r: R * 0.3 },
                    oido: { x: fx - R * 1.0, y: cy - R * 0.02, r: R * 0.34 },
                    mano: { x: fx + R * 1.02, y: cy + R * 0.3, r: R * 0.34 }
                },
                grip: { x: torre.cx, y0: h * 0.64, y1: h * 0.76 }
            };
        },

        /* ── Escenario: pueblo de noche, torre y gigante ───────── */

        dibujarFondo: function () {
            var m = this.m(), w = m.w, h = m.h, self = this;
            var clave = 'camp_fondo_' + (this.contFondo++);
            var t = this.textures.createCanvas(clave, Math.max(2, Math.ceil(w)), Math.max(2, Math.ceil(h)));
            var c = t.getContext();
            var g = c.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, '#0a1030'); g.addColorStop(0.55, '#26356e'); g.addColorStop(1, '#4b5fa8');
            c.fillStyle = g; c.fillRect(0, 0, w, h);
            for (var s = 0; s < 120; s++) { c.fillStyle = 'rgba(255,255,255,' + (0.3 + rg(s) * 0.7) + ')'; c.beginPath(); c.arc(rg(s + 1) * w, rg(s + 2) * h * 0.55, 0.8 + rg(s + 3) * 1.6, 0, 6.2832); c.fill(); }
            // Luna.
            var lx = w * 0.8, ly = h * 0.15;
            var lg = c.createRadialGradient(lx, ly, 10, lx, ly, 110); lg.addColorStop(0, 'rgba(255,244,200,0.55)'); lg.addColorStop(1, 'rgba(255,244,200,0)');
            c.fillStyle = lg; c.fillRect(lx - 120, ly - 120, 240, 240);
            c.fillStyle = '#fff4c9'; c.beginPath(); c.arc(lx, ly, 38, 0, 6.2832); c.fill();
            c.fillStyle = 'rgba(200,180,120,.4)'; c.beginPath(); c.arc(lx - 10, ly - 8, 8, 0, 6.2832); c.arc(lx + 12, ly + 10, 6, 0, 6.2832); c.fill();
            // Montañas lejanas y casitas con ventanas encendidas.
            c.fillStyle = '#1e2a5e'; c.beginPath(); c.moveTo(0, h * 0.5);
            for (var x = 0; x <= w; x += 20) c.lineTo(x, h * 0.42 - Math.sin(x / 150) * 24 - Math.sin(x / 61) * 8);
            c.lineTo(w, h * 0.6); c.lineTo(0, h * 0.6); c.fill();
            for (var k = 0; k < 14; k++) {
                var hx = w * (0.3 + k * 0.05), hy = h * 0.44 + (k % 3) * 6, hw = 24 + rg(k) * 14;
                if (hx > w - 170) continue;
                c.fillStyle = '#16204a'; c.fillRect(hx, hy - hw * 0.6, hw, hw * 0.6);
                c.beginPath(); c.moveTo(hx - 3, hy - hw * 0.6); c.lineTo(hx + hw / 2, hy - hw * 1.0); c.lineTo(hx + hw + 3, hy - hw * 0.6); c.fill();
                c.fillStyle = rg(k + 9) > 0.3 ? '#ffd86b' : '#3a4a86'; c.fillRect(hx + hw * 0.3, hy - hw * 0.45, hw * 0.25, hw * 0.25);
            }
            // Colina.
            var cg = c.createLinearGradient(0, h * 0.5, 0, h); cg.addColorStop(0, '#2f6f6a'); cg.addColorStop(1, '#173f45');
            c.fillStyle = cg; c.beginPath(); c.moveTo(0, h * 0.62);
            for (var x2 = 0; x2 <= w; x2 += 20) c.lineTo(x2, h * 0.64 - Math.sin(x2 / 220 + 1) * 16 - Math.sin(x2 / 70) * 4);
            c.lineTo(w, h); c.lineTo(0, h); c.fill();
            // Torre del campanario.
            var T = m.torre;
            var tg2 = c.createLinearGradient(T.x0, 0, T.x1, 0); tg2.addColorStop(0, '#6e6a7c'); tg2.addColorStop(0.5, '#9a96ab'); tg2.addColorStop(1, '#5d596d');
            c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(T.x0 + 8, T.top + 10, T.w, T.base - T.top);
            c.fillStyle = tg2; c.fillRect(T.x0, T.top, T.w, T.base - T.top);
            c.strokeStyle = 'rgba(0,0,0,0.2)'; c.lineWidth = 2;
            for (var r = 0; r < 18; r++) { var yy = T.top + 14 + r * (T.base - T.top) / 18; c.beginPath(); c.moveTo(T.x0, yy); c.lineTo(T.x1, yy); c.stroke(); for (var b = 0; b < 4; b++) { var bx = T.x0 + ((b + (r % 2) * 0.5) * T.w / 3.4); c.beginPath(); c.moveTo(bx, yy); c.lineTo(bx, yy + (T.base - T.top) / 18); c.stroke(); } }
            // Tejado.
            c.fillStyle = '#a8322d'; c.beginPath(); c.moveTo(T.x0 - 14, T.top + 4); c.lineTo(T.cx, T.top - h * 0.1); c.lineTo(T.x1 + 14, T.top + 4); c.fill();
            c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.moveTo(T.cx, T.top - h * 0.1); c.lineTo(T.x1 + 14, T.top + 4); c.lineTo(T.cx, T.top + 4); c.fill();
            c.fillStyle = '#e0b84a'; c.beginPath(); c.arc(T.cx, T.top - h * 0.1, 7, 0, 6.2832); c.fill();
            // Arco del campanario (hueco oscuro) y pilares.
            var ax = T.cx - T.arcoW / 2, ay0 = T.arcoY0, ay1 = T.arcoY1;
            c.fillStyle = '#0d1230'; c.beginPath(); c.moveTo(ax, ay1); c.lineTo(ax, ay0 + T.arcoW * 0.4); c.quadraticCurveTo(ax, ay0, T.cx, ay0); c.quadraticCurveTo(ax + T.arcoW, ay0, ax + T.arcoW, ay0 + T.arcoW * 0.4); c.lineTo(ax + T.arcoW, ay1); c.fill();
            c.strokeStyle = '#4e4a5f'; c.lineWidth = 8; c.stroke();
            c.fillStyle = '#6b4a2b'; c.fillRect(ax - 4, ay0 + T.arcoW * 0.34, T.arcoW + 8, 12);
            // Reloj y puerta.
            c.fillStyle = '#f4ead2'; c.beginPath(); c.arc(T.cx, ay1 + h * 0.08, T.w * 0.12, 0, 6.2832); c.fill();
            c.strokeStyle = '#2b2b3b'; c.lineWidth = 3; c.beginPath(); c.moveTo(T.cx, ay1 + h * 0.08); c.lineTo(T.cx, ay1 + h * 0.08 - T.w * 0.08); c.moveTo(T.cx, ay1 + h * 0.08); c.lineTo(T.cx + T.w * 0.06, ay1 + h * 0.08); c.stroke();
            c.fillStyle = '#4a3322'; c.beginPath(); c.moveTo(T.cx - T.w * 0.14, T.base); c.lineTo(T.cx - T.w * 0.14, T.base - h * 0.08); c.quadraticCurveTo(T.cx, T.base - h * 0.14, T.cx + T.w * 0.14, T.base - h * 0.08); c.lineTo(T.cx + T.w * 0.14, T.base); c.fill();
            // Cara del gigante: cabeza, pelo, mejillas.
            var R2 = m.R, fx = m.fx, cy = m.cy;
            var sk = c.createRadialGradient(fx - R2 * 0.3, cy - R2 * 0.5, R2 * 0.2, fx, cy, R2 * 1.25);
            sk.addColorStop(0, '#f6cfa6'); sk.addColorStop(1, '#d99a6a');
            c.fillStyle = 'rgba(0,0,0,0.28)'; c.beginPath(); c.arc(fx + 8, cy + 10, R2 * 1.16, 0, 6.2832); c.fill();
            c.fillStyle = sk; c.beginPath(); c.arc(fx, cy, R2 * 1.15, 0, 6.2832); c.fill();
            c.fillStyle = '#4b2e83';
            for (var p = 0; p < 12; p++) { var an = Math.PI * (1.08 + p * 0.07); c.beginPath(); c.arc(fx + Math.cos(an) * R2 * 1.12, cy + Math.sin(an) * R2 * 1.12, R2 * (0.2 + rg(p) * 0.08), 0, 6.2832); c.fill(); }
            c.fillStyle = '#5d3b9c'; c.beginPath(); c.arc(fx - R2 * 0.3, cy - R2 * 1.1, R2 * 0.12, 0, 6.2832); c.fill();
            c.fillStyle = 'rgba(255,120,120,0.35)'; c.beginPath(); c.arc(fx - R2 * 0.62, cy + R2 * 0.3, R2 * 0.16, 0, 6.2832); c.arc(fx + R2 * 0.62, cy + R2 * 0.3, R2 * 0.16, 0, 6.2832); c.fill();
            c.strokeStyle = '#6b3f2b'; c.lineWidth = 6; c.lineCap = 'round';
            c.beginPath(); c.arc(fx, cy - R2 * 0.62, R2 * 0.3, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
            var v = c.createRadialGradient(w / 2, h * 0.5, h * 0.4, w / 2, h * 0.5, w * 0.7); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,5,25,0.35)'); c.fillStyle = v; c.fillRect(0, 0, w, h);
            t.refresh();
            var vieja = this.fondoImg, claveVieja = this.fondoClave;
            this.fondoImg = this.add.image(0, 0, clave).setOrigin(0, 0).setDepth(1);
            this.fondoClave = clave;
            if (vieja) { vieja.destroy(); if (claveVieja && this.textures.exists(claveVieja)) this.textures.remove(claveVieja); }
            void self;
        },

        /** El gigante: los cinco órganos sobre su cara (el ojo duerme). */
        crearGigante: function () {
            var scene = this, m = this.m();
            this.org = {};
            ['oido', 'ojo', 'nariz', 'lengua', 'mano'].forEach(function (id) {
                var p = m.pos[id];
                var o = O().crear(scene, id === 'oido' ? 'oreja' : id, p.x, p.y, p.r, { id: id, burbuja: false, flotar: false });
                o.cont.setDepth(12);
                scene.org[id] = o;
            });
            this.org.ojo.sueno = 1;
            this.zz = this.add.text(m.fx + m.R * 0.4, m.cy - m.R * 0.85, 'z z', { fontFamily: 'Fredoka, Arial', fontStyle: 'bold', fontSize: Math.round(m.R * 0.2) + 'px', color: '#bcd0ff' }).setDepth(13);
        },

        crearTorre: function () {
            var m = this.m(), T = m.torre;
            var piv = this.add.container(T.cx, T.arcoY0 + T.arcoW * 0.22).setDepth(12);
            var tam = Math.min(T.arcoW * 0.85, (T.arcoY1 - T.arcoY0) * 0.8);
            var cuerpo = this.add.container(0, tam * 0.5);
            var badajo = this.add.image(0, tam * 0.05, A().textura(this, 'badajo', 128)).setOrigin(0.5, 0).setDisplaySize(tam * 0.32, tam * 0.32);
            var img = this.add.image(0, 0, A().textura(this, 'campana', 256)).setDisplaySize(tam, tam).setTint(0xf0c890);
            cuerpo.add([badajo, img]);
            piv.add(cuerpo);
            piv.badajo = badajo; piv.cuerpo = cuerpo; piv.tam = tam;
            this.campana = piv;
            this.grip = { y: m.grip.y0, arr: false, vis: 0 };
        },

        ubicar: function () {
            var m = this.m(), scene = this;
            Object.keys(this.org).forEach(function (id) { var p = m.pos[id]; var o = scene.org[id]; o.base.x = p.x; o.base.y = p.y; o.cont.setPosition(p.x, p.y); });
            if (this.zz) this.zz.setPosition(m.fx + m.R * 0.4, m.cy - m.R * 0.85);
            if (this.campana) this.campana.setPosition(m.torre.cx, m.torre.arcoY0 + m.torre.arcoW * 0.22);
        },

        /* ── Utilidades ────────────────────────────────────────── */

        ondaDesde: function (x, y, color) {
            for (var i = 0; i < 3; i++) this.anillos.push({ x: x, y: y, color: color, t0: this.time.now + i * 220 });
        },

        organoBajo: function (x, y) {
            var mejor = null, kmin = 1.2, scene = this;
            Object.keys(this.org).forEach(function (id) {
                var o = scene.org[id];
                if (!o.cont.visible) return;
                var k = Phaser.Math.Distance.Between(x, y, o.cont.x, o.cont.y) / o.radio;
                if (k < kmin) { kmin = k; mejor = id; }
            });
            return mejor;
        },

        /** Arrastra `obj` (contenedor) hasta un órgano. Resuelve {id, obj} al soltarlo sobre uno; si no, vuelve a casa. */
        soltarEnOrgano: function (obj, casa, opts) {
            var scene = this;
            opts = opts || {};
            return new Promise(function (resolver) {
                var arr = false, dx = 0, dy = 0;
                var pista = U.crearPista(scene, 9000, function (cancelado) {
                    var id = opts.correcto, h = scene.org[id];
                    return scene.ctx.mano({ punto: { x: obj.x, y: obj.y }, holdMs: 300, cancelado: cancelado, arrastre: { dx: h.cont.x - obj.x, dy: h.cont.y - obj.y, durMs: 1100 } });
                });
                pista.reiniciar();
                function abajo(p) {
                    if (Phaser.Math.Distance.Between(p.x, p.y, obj.x, obj.y) > (opts.radio || 60)) return;
                    arr = true; dx = obj.x - p.x; dy = obj.y - p.y;
                    scene.tweens.killTweensOf(obj);
                    obj.setDepth(40);
                    pista.reiniciar(); scene.ctx.quitarMano(); U.sfx('pop');
                }
                function mover(p) {
                    if (!arr) return;
                    obj.setPosition(p.x + dx, p.y + dy);
                    var sobre = scene.organoBajo(obj.x, obj.y);
                    Object.keys(scene.org).forEach(function (k) { scene.org[k].cont.setScale(k === sobre ? 1.1 : 1); });
                }
                function arriba() {
                    if (!arr) return;
                    arr = false;
                    Object.keys(scene.org).forEach(function (k) { scene.org[k].cont.setScale(1); });
                    var id = scene.organoBajo(obj.x, obj.y);
                    obj.setDepth(30);
                    if (!id) { scene.tweens.add({ targets: obj, x: casa.x, y: casa.y, duration: 450, ease: 'Back.easeOut' }); return; }
                    scene.input.off('pointerdown', abajo); scene.input.off('pointermove', mover); scene.input.off('pointerup', arriba);
                    pista.parar();
                    resolver(id);
                }
                scene.input.on('pointerdown', abajo);
                scene.input.on('pointermove', mover);
                scene.input.on('pointerup', arriba);
                scene._soltarOff = function () { scene.input.off('pointerdown', abajo); scene.input.off('pointermove', mover); scene.input.off('pointerup', arriba); pista.parar(); };
            });
        },

        /** El gigante se mueve un poco al acertar. */
        gigante: function (fuerte) {
            var m = this.m();
            this.tweens.add({ targets: this.zz, alpha: { from: 1, to: 0.3 }, duration: 300, yoyo: true });
            if (fuerte) { this.zz.setText(''); this.org.ojo.sueno = 0; }
            void m;
        },

        /* ── Ronda 1: la campana del documento ─────────────────── */

        /** Tirar de la soga: el agarre baja con el dedo y al soltarlo la campana se balancea y suena. */
        esperarSoga: function () {
            var scene = this, m = this.m(), G = m.grip;
            this.grip.vis = 1;
            this.grip.y = G.y0;
            return new Promise(function (resolver) {
                var pista = U.crearPista(scene, 7000, function (cancelado) {
                    return scene.ctx.mano({ punto: { x: G.x, y: G.y0 }, holdMs: 250, cancelado: cancelado, arrastre: { dx: 0, dy: G.y1 - G.y0, durMs: 900 } });
                });
                pista.reiniciar();
                function abajo(p) {
                    if (Math.abs(p.x - G.x) < 60 && Math.abs(p.y - scene.grip.y) < 60) { scene.grip.arr = true; pista.reiniciar(); scene.ctx.quitarMano(); U.sfx('pop'); }
                }
                function mover(p) { if (scene.grip.arr) { scene.grip.y = Phaser.Math.Clamp(p.y, G.y0, G.y1 + 20); } }
                function arriba() {
                    if (!scene.grip.arr) return;
                    scene.grip.arr = false;
                    var fuerza = (scene.grip.y - G.y0) / (G.y1 - G.y0);
                    scene.tweens.add({ targets: scene.grip, y: G.y0, duration: 380, ease: 'Elastic.easeOut' });
                    if (fuerza < 0.35) return;
                    scene.input.off('pointerdown', abajo); scene.input.off('pointermove', mover); scene.input.off('pointerup', arriba);
                    pista.parar();
                    scene.balancear(Math.min(1, fuerza));
                    resolver();
                }
                scene.input.on('pointerdown', abajo); scene.input.on('pointermove', mover); scene.input.on('pointerup', arriba);
            });
        },

        balancear: function (fuerza) {
            this.bal = { t0: this.time.now, amp: 0.2 + 0.32 * fuerza, ult: 0 };
        },

        tanerCampana: function (vol) {
            var c = this.campana;
            if (!c) return;
            c.golpe = this.time.now;
            if (Sfx()) Sfx().acompanar('campana', { breve: vol < 0.7, vol: vol });
            this.ondaDesde(c.x, c.y + c.tam * 0.5, 0xffd43b);
        },

        rondaCampana: async function () {
            var scene = this, m = this.m();
            this.modo = 'campana';
            var r = this.reto;
            await this.ctx.decir(r.presentacion || { voz: 'zoe', texto: 'La campana del pueblo suena por la noche. Tira de la soga y lleva su sonido hasta el sentido que nos permite escucharla.' });
            await this.esperarSoga();
            this.grip.vis = 0.0;
            // Se balancea y suena (los golpes los marca update); sale una nota brillante.
            await U.esperar(this, 500);
            var nota = this.add.container(this.campana.x + 30, this.campana.y + this.campana.tam * 0.9).setDepth(30);
            var halo = this.add.circle(0, 0, 38, 0xffd43b, 0.35); var disco = this.add.circle(0, 0, 28, 0xfff3bf).setStrokeStyle(4, 0xffd43b);
            var im = this.add.image(0, 0, A().textura(this, 'nota', 96)).setDisplaySize(36, 36);
            nota.add([halo, disco, im]);
            nota.setScale(0.1);
            await U.tween(this, { targets: nota, scale: 1, duration: 400, ease: 'Back.easeOut' });
            this.tweens.add({ targets: nota, y: nota.y - 10, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            var casa = { x: nota.x, y: nota.y };
            await this.ctx.decir({ voz: 'zeus', texto: 'Esa nota brillante es el sonido de la campana. Llévala al sentido que lo escucha.' });
            var ok = false;
            while (!ok) {
                var id = await this.soltarEnOrgano(nota, casa, { correcto: 'oido', radio: 56 });
                var o = this.org[id];
                if (id === 'oido') { ok = true; break; }
                U.sfx('boing');
                await Promise.all([o.reaccion('error'), this.ctx.decir(r.errorOtro || { voz: 'zeus', texto: 'Su función principal es producir SONIDO. ¿Con qué escuchamos el sonido? ¡Inténtalo otra vez!' })]);
                await U.tween(this, { targets: nota, x: casa.x, y: casa.y, duration: 450, ease: 'Back.easeOut' });
            }
            this.tweens.killTweensOf(nota);
            var oi = this.org.oido;
            await U.tween(this, { targets: nota, x: oi.cont.x, y: oi.cont.y, scale: 0.3, duration: 600, ease: 'Sine.easeIn' });
            nota.destroy();
            U.sfx('dingDingYay');
            for (var i = 0; i < 3; i++) this.time.delayedCall(i * 160, function () { scene.ondaDesde(oi.cont.x, oi.cont.y, 0xffd43b); });
            await oi.reaccion('acierto');
            this.gigante(false);
            await this.afinar();
            await this.ctx.decir(r.acierto || { voz: 'zoe', texto: '¡Muy bien! La campana se relaciona con el oído.' }, { estado: 'acierto' });
            void m;
        },

        /** Verificación del documento: tres campanillas de distinto tono; hay que tocar la que suena igual. */
        afinar: async function () {
            var scene = this, m = this.m(), T = m.torre;
            var notas = [{ n: 'grave', f: 262, s: 1.0 }, { n: 'media', f: 523, s: 0.78 }, { n: 'aguda', f: 1046, s: 0.58 }];
            var correcta = Math.floor(Math.random() * 3);
            var by = m.h * 0.27, bx0 = T.x1 + 40, bx1 = Math.min(m.w * 0.72, bx0 + 300);
            var viga = this.add.graphics().setDepth(11);
            viga.fillStyle(0x6b4a2b, 1); viga.fillRoundedRect(T.x1 - 10, by - 14, bx1 - T.x1 + 40, 14, 4);
            viga.lineStyle(3, 0x4a3322, 1); viga.lineBetween(T.x1 - 10, by + 2, T.x1 + 40, by - 40);
            viga.setAlpha(0);
            var camp = notas.map(function (nt, i) {
                var x = bx0 + (i + 0.5) * (bx1 - bx0) / 3;
                var tam = Math.min(110, m.h * 0.16) * nt.s;
                var piv = scene.add.container(x, by).setDepth(12);
                var cuerpo = scene.add.container(0, tam * 0.5);
                cuerpo.add(scene.add.image(0, 0, A().textura(scene, 'campana', 200)).setDisplaySize(tam, tam).setTint([0xe8b06a, 0xf0c890, 0xffe0a8][i]));
                piv.add(cuerpo);
                piv.nota = nt; piv.i = i; piv.tam = tam; piv.cuerpo = cuerpo;
                piv.setAlpha(0);
                return piv;
            });
            this.tweens.add({ targets: [viga].concat(camp), alpha: 1, duration: 450 });
            await U.esperar(this, 500);
            await this.ctx.decir({ voz: 'zoe', texto: 'Escucha la nota de la campana y toca la campanilla que suena igual.' });
            var referencia = function () { campanita(notas[correcta].f); scene.tanerCampana(0.5); scene.tweens.add({ targets: scene.campana.cuerpo, angle: { from: -8, to: 8 }, duration: 130, yoyo: true, repeat: 2 }); };
            referencia();
            var rep = this.time.addEvent({ delay: 4500, loop: true, callback: referencia });
            await new Promise(function (resolver) {
                var ocupado = false;
                var pista = U.crearPista(scene, 9000, function (cancelado) {
                    var b = camp[correcta];
                    return scene.ctx.mano({ punto: { x: b.x, y: b.y + b.tam * 0.5 }, holdMs: 400, cancelado: cancelado });
                });
                pista.reiniciar();
                var toque = function (p) {
                    if (ocupado) return;
                    var b = camp.find(function (k) { return Math.abs(p.x - k.x) < k.tam * 0.6 && p.y > by - 10 && p.y < by + k.tam * 1.1; });
                    if (!b) return;
                    pista.reiniciar(); scene.ctx.quitarMano();
                    campanita(b.nota.f);
                    scene.tweens.add({ targets: b.cuerpo, angle: { from: -14, to: 14 }, duration: 120, yoyo: true, repeat: 3, onComplete: function () { b.cuerpo.angle = 0; } });
                    scene.ondaDesde(b.x, by + b.tam * 0.5, 0x66d9e8);
                    if (b.i === correcta) {
                        scene.input.off('pointerdown', toque); pista.parar(); rep.remove();
                        U.sfx('dingDingYay');
                        resolver();
                        return;
                    }
                    ocupado = true;
                    scene.ctx.decir({ voz: 'zeus', texto: 'Esa campanilla es ' + b.nota.n + '. Escucha otra vez la campana grande.' });
                    scene.time.delayedCall(1500, function () { referencia(); ocupado = false; });
                };
                scene.input.on('pointerdown', toque);
            });
            camp.forEach(function (k, i) { scene.time.delayedCall(i * 90, function () { campanita(notas[i].f, 0.8); scene.tweens.add({ targets: k.cuerpo, angle: { from: -12, to: 12 }, duration: 110, yoyo: true, repeat: 3 }); }); });
            U.estallido(this, (bx0 + bx1) / 2, by + 40, { n: 14, dist: 130, tex: 'nota' });
            await U.esperar(this, 1500);
            await U.tween(this, { targets: [viga].concat(camp), alpha: 0, duration: 350 });
            viga.destroy(); camp.forEach(function (k) { k.destroy(); });
        },

        /* ── Ronda 2: los regalos del pueblo ───────────────────── */

        crearRegalo: function (id, x, y, ancho) {
            var scene = this;
            var c = this.add.container(x, y).setDepth(30);
            var fondo = this.add.circle(0, 0, ancho * 0.62, 0xffffff, 0.2).setStrokeStyle(3, 0xffffff, 0.6);
            c.add(fondo);
            var tam = ancho;
            if (id === 'tambor') { var d = B.tambor(this, 0, 0, tam * 0.9); c.add(d.cont); c.tambor = d; }
            else {
                if (id === 'sol') { var rayos = this.add.image(0, 0, A().textura(this, 'sol_rayos', 160)).setDisplaySize(tam * 1.0, tam * 1.0); c.add(rayos); c.rayos = rayos; }
                c.add(this.add.image(0, 0, A().textura(this, id, 160)).setDisplaySize(tam * 0.85, tam * 0.85));
            }
            c.id = id; c.ancho = ancho;
            c.senal = function () {
                var gx = c.x, gy = c.y;
                if (id === 'tambor') c.tambor.sonar();
                else if (id === 'flor') U.aroma(scene, gx, gy - ancho * 0.1, { n: 3, alto: 50, depth: 31 });
                else if (id === 'helado') { var g = scene.add.image(gx + ancho * 0.12, gy, A().textura(scene, 'gota', 64)).setDisplaySize(10, 14).setDepth(31); scene.tweens.add({ targets: g, y: gy + ancho * 0.3, alpha: 0, duration: 800, onComplete: function () { g.destroy(); } }); }
                else if (id === 'sol') scene.tweens.add({ targets: c.rayos, angle: '+=40', duration: 1200 });
                else if (id === 'osito') scene.tweens.add({ targets: c, scaleX: 1.08, scaleY: 0.94, duration: 300, yoyo: true });
            };
            return c;
        },

        rondaRegalos: async function () {
            var scene = this, m = this.m();
            this.modo = 'regalos';
            var ancho = Math.min(m.w * 0.12, 120);
            var casa = { x: m.w * 0.47, y: m.h * 0.27 };
            await this.ctx.decir({ voz: 'zeus', texto: '¡Los vecinos traen regalos para el gigante! Lleva cada regalo al sentido que lo percibe.' });
            var orden = U.mezclar(['tambor', 'flor', 'helado', 'sol', 'osito']);
            var frases = ['¡Entregado!', '¡Muy bien!', '¡Otro regalo!', '¡Excelente!', '¡El gigante recibió todo!'];
            for (var i = 0; i < orden.length; i++) {
                var id = orden[i];
                var reg = this.crearRegalo(id, casa.x, casa.y - 60, ancho);
                reg.alpha = 0;
                await U.tween(this, { targets: reg, alpha: 1, y: casa.y, duration: 450, ease: 'Back.easeOut' });
                var senal = this.time.addEvent({ delay: 2200, loop: true, callback: function () { reg.senal(); } });
                reg.senal();
                var ok = false;
                while (!ok) {
                    var sentido = await this.soltarEnOrgano(reg, casa, { correcto: SENTIDO[id], radio: ancho * 0.7 });
                    var o = this.org[sentido];
                    if (sentido === SENTIDO[id]) { ok = true; break; }
                    U.sfx('boing');
                    await Promise.all([o.reaccion('error'), this.ctx.decir({ voz: 'zeus', texto: '¡Ups! ' + POR_QUE[id] })]);
                    await U.tween(this, { targets: reg, x: casa.x, y: casa.y, duration: 450, ease: 'Back.easeOut' });
                }
                senal.remove();
                var oc = this.org[SENTIDO[id]];
                await U.tween(this, { targets: reg, x: oc.cont.x, y: oc.cont.y, scale: 0.3, duration: 500, ease: 'Sine.easeIn' });
                reg.destroy();
                U.sfx('recompensa');
                oc.reaccion('acierto');
                this.ctx.decir({ voz: 'zoe', texto: frases[i] + ' ' + POR_QUE[id] }, { estado: 'acierto' });
                await U.esperar(this, 1100);
            }
            await U.esperar(this, 800);
            void scene;
        },

        /* ── Ronda 3: escucha sin mirar ────────────────────────── */

        rondaEscucha: async function () {
            var scene = this, m = this.m(), T = m.torre;
            this.modo = 'escucha';
            this.tweens.add({ targets: this.campana, alpha: 0, duration: 400 });
            // Contraventanas del campanario (cerradas) y el instrumento escondido detrás.
            var cv = this.add.graphics().setDepth(16);
            var abrir = { k: 0 };
            var ax = T.cx - T.arcoW / 2, ay0 = T.arcoY0, ay1 = T.arcoY1;
            var pintar = function () {
                cv.clear();
                var mitad = (T.arcoW / 2) * (1 - abrir.k);
                for (var lado = -1; lado <= 1; lado += 2) {
                    var x0 = lado < 0 ? ax : ax + T.arcoW - mitad;
                    cv.fillStyle(0x7a4f2a, 1); cv.fillRect(x0, ay0 + 6, mitad, ay1 - ay0 - 6);
                    cv.lineStyle(3, 0x4a3322, 1); cv.strokeRect(x0, ay0 + 6, mitad, ay1 - ay0 - 6);
                    for (var k = 1; k < 5; k++) cv.lineBetween(x0, ay0 + 6 + k * (ay1 - ay0 - 6) / 5, x0 + mitad, ay0 + 6 + k * (ay1 - ay0 - 6) / 5);
                }
            };
            pintar();
            var opciones = ['campana', 'tambor', 'maracas', 'pandereta'];
            var sonido = { campana: 'campana', tambor: 'tambor', maracas: 'maracas', pandereta: 'pandereta' };
            var tex = { campana: 'campana', tambor: 'tambor', maracas: 'maraca', pandereta: 'pandereta' };
            var orden = U.mezclar(opciones).slice(0, 3);
            await this.ctx.decir({ voz: 'zoe', texto: 'Ahora escucha sin mirar. ¿Qué instrumento suena detrás de las contraventanas?' });
            for (var r = 0; r < 3; r++) {
                var objetivo = orden[r];
                var cartas = U.mezclar([objetivo].concat(U.mezclar(opciones.filter(function (o) { return o !== objetivo; })).slice(0, 2)));
                var tam = Math.max(64, Math.min(m.w * 0.12, 112));
                var y = m.h * 0.26;
                var cont = cartas.map(function (id, i) {
                    var x = m.w * 0.55 + (i - 1) * tam * 1.4;
                    var k = scene.add.container(x, y).setDepth(18);
                    var g = scene.add.graphics();
                    g.fillStyle(0xf8f9fa, 1); g.fillRoundedRect(-tam / 2, -tam / 2, tam, tam, 14);
                    g.lineStyle(4, 0x66d9e8, 1); g.strokeRoundedRect(-tam / 2, -tam / 2, tam, tam, 14);
                    k.add([g, scene.add.image(0, 0, A().textura(scene, tex[id], 160)).setDisplaySize(tam * 0.78, tam * 0.78)]);
                    k.id = id; k.tam = tam; k.alpha = 0;
                    scene.tweens.add({ targets: k, alpha: 1, duration: 300, delay: i * 100 });
                    return k;
                });
                var oculto = this.add.image(T.cx, (ay0 + ay1) / 2 + 20, A().textura(this, tex[objetivo], 200)).setDisplaySize(T.arcoW * 0.7, T.arcoW * 0.7).setDepth(15);
                var tocar = function () {
                    if (Sfx()) Sfx().reproducir(sonido[objetivo], { breve: false, vol: 0.9 });
                    scene.ondaDesde(T.cx, (ay0 + ay1) / 2, 0x66d9e8);
                    scene.org.oido.reaccion('toca');
                    scene.tweens.add({ targets: cv, x: { from: -3, to: 3 }, duration: 70, yoyo: true, repeat: 3, onComplete: function () { cv.x = 0; } });
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
                        scene.ctx.decir({ voz: 'zeus', texto: { campana: 'Así suena la campana', tambor: 'Así suena el tambor', maracas: 'Así suenan las maracas', pandereta: 'Así suena la pandereta' }[k.id] + '. Escucha otra vez lo que hay detrás de las contraventanas.' });
                        scene.time.delayedCall(1800, function () { tocar(); ocupado = false; });
                    };
                    scene.input.on('pointerdown', toque);
                });
                rep.remove();
                U.sfx('magia');
                await U.tween(this, { targets: abrir, k: 1, duration: 700, ease: 'Sine.easeOut', onUpdate: pintar });
                if (Sfx()) Sfx().reproducir(sonido[objetivo], { breve: true });
                U.estallido(this, T.cx, (ay0 + ay1) / 2, { n: 14, dist: 120 });
                await this.org.oido.reaccion('acierto');
                this.gigante(false);
                var frases = ['¡Sí! El oído lo reconoció sin mirar.', '¡Muy bien! Escuchamos con el oído.', '¡Qué oído tan fino!'];
                await this.ctx.decir({ voz: 'zoe', texto: frases[r] }, { estado: 'acierto' });
                cont.forEach(function (k) { k.destroy(); });
                oculto.destroy();
                abrir.k = 0; pintar();
            }
            this.tweens.add({ targets: cv, alpha: 0, duration: 400, onComplete: function () { cv.destroy(); } });
        },

        /* ── Ronda 4: ¿dónde suena? ────────────────────────────── */

        rondaBuscar: async function () {
            var scene = this, m = this.m();
            this.modo = 'buscar';
            var Rb = Math.max(52, Math.min(m.w, m.h) * 0.09);
            var xMin = m.w * 0.3, xMax = m.w - 190, yMin = 130, yMax = m.h * 0.62;
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
            // Trompetilla para escuchar (el cursor).
            this.mic = this.add.container(m.w * 0.55, (yMin + yMax) / 2).setDepth(19);
            var mg = this.add.graphics();
            mg.fillStyle(0xb5772f, 1); mg.fillTriangle(-14, 6, 14, 6, 0, 62);
            mg.fillStyle(0xd9953d, 1); mg.fillEllipse(0, 0, 62, 30);
            mg.lineStyle(4, 0x7a4a1a, 1); mg.strokeEllipse(0, 0, 62, 30);
            mg.fillStyle(0x4b2e12, 1); mg.fillEllipse(0, 0, 40, 18);
            this.mic.add(mg);
            this.mic.R = Rb;
            this.mic.setAlpha(0);
            this.tweens.add({ targets: this.mic, alpha: 1, duration: 400 });
            this.medidor = this.add.graphics().setDepth(19);
            this.hallazgos = 0;
            this.proxTic = 0;
            this.buscando = false;
            await this.ctx.decir({ voz: 'zoe', texto: '¡Hay cuatro campanas perdidas en la noche! Mueve la trompetilla y escucha: suena más fuerte cuando estás cerca.' });
            var cv = function (p) { scene.mic.setPosition(Phaser.Math.Clamp(p.x, 40, m.w - 40), Phaser.Math.Clamp(p.y, 120, m.h * 0.7)); };
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
            var h = this.org.oido.cont;
            U.notas(this, k.x, k.y - 20, 4, { x: h.x, y: h.y });
            this.org.oido.reaccion('acierto');
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
            var tam = Math.min(m.w * 0.12, 120);
            var casa = { x: m.w * 0.47, y: m.h * 0.27 };
            var d = B.tambor(this, casa.x, casa.y, tam);
            d.cont.alpha = 0;
            this.tweens.add({ targets: d.cont, alpha: 1, duration: 500 });
            var limpiar = function () { scene.tweens.add({ targets: d.cont, alpha: 0, duration: 350, onComplete: function () { d.cont.destroy(); } }); ctx.quitarMano(); scene.modo = ''; };
            await ctx.decir({ voz: 'zoe', texto: t.demostracion || '¡Mira cómo se juega!' }, { minMs: 2200 });
            if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
            await ctx.mano({ punto: { x: d.cont.x, y: d.cont.y }, holdMs: 600, onPresionar: function () { d.sonar(); } });
            await U.esperar(this, 300);
            if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
            var oi = this.org.oido.cont;
            await ctx.mano({
                punto: { x: d.cont.x, y: d.cont.y }, holdMs: 300,
                arrastre: { dx: oi.x - d.cont.x, dy: oi.y - d.cont.y, durMs: 1100, soltarEnDestino: true },
                onDuranteArrastre: function () { scene.tweens.add({ targets: d.cont, x: oi.x, y: oi.y, scale: 0.5, duration: 1100, ease: 'Sine.easeInOut' }); }
            });
            if (!ctx.vivo()) return limpiar();
            U.sfx('recompensa');
            d.sonar();
            await this.org.oido.reaccion('acierto');
            await ctx.decir({ voz: 'zoe', texto: t.demostracionAcierto || '¡Así se hace!' }, { estado: 'acierto', minMs: 1600 });
            await ctx.decir({ voz: 'zoe', texto: t.demostracionFin || '¡Ahora te toca a ti!' }, { minMs: 1200 });
            limpiar();
            await U.esperar(this, 400);
        },

        jugar: async function () {
            await this.rondaCampana();
            if (!this.ctx.vivo()) return;
            if (this.ganarNivel) await this.ganarNivel(0);
            await this.rondaRegalos();
            if (!this.ctx.vivo()) return;
            if (this.ganarNivel) await this.ganarNivel(1);
            await this.rondaEscucha();
            if (!this.ctx.vivo()) return;
            if (this.ganarNivel) await this.ganarNivel(2);
            await this.rondaBuscar();
            if (!this.ctx.vivo()) return;
            if (this.ganarNivel) await this.ganarNivel(3);
        },

        /** Final: el gigante despierta, sus sentidos se encienden y la señal llega al cerebro. */
        fiestaFinal: async function () {
            var scene = this, m = this.m();
            this.modo = 'final';
            this.tweens.add({ targets: this.campana, alpha: 1, duration: 400 });
            var lista = [{ id: 'campana', organo: 'oido' }, { id: 'flor', organo: 'nariz' }, { id: 'helado', organo: 'lengua' }, { id: 'sol', organo: 'ojo' }];
            this.ctx.decir({ voz: 'zoe', texto: '¡El gigante despierta! Mira cómo las señales viajan desde cada sentido hasta su cerebro.' });
            this.zz.setText('');
            await U.esperar(this, 700);
            // Cerebro sobre la cabeza.
            var cer = this.add.ellipse(m.fx, m.cy - m.R * 1.45, m.R * 0.55, m.R * 0.3, 0xf783ac, 0.4).setStrokeStyle(3, 0xfaa2c1).setDepth(13);
            this.org.ojo.sueno = 0;
            var x0 = m.w * 0.32, paso = (m.w * 0.6 - x0) / 3;
            for (var i = 0; i < lista.length; i++) {
                var it = lista[i], o = this.org[it.organo];
                var ico = this.add.container(x0 + i * paso, m.h * 0.2).setDepth(32);
                ico.add([this.add.circle(0, 0, 34, 0x1b2a4a).setStrokeStyle(3, COLOR[it.organo]), this.add.image(0, 0, A().textura(this, it.id, 128)).setDisplaySize(54, 54)]);
                ico.setScale(0.1);
                await U.tween(this, { targets: ico, scale: 1, duration: 350, ease: 'Back.easeOut' });
                // La señal viaja por un arco hasta el órgano y de ahí al cerebro.
                var chispa = this.add.circle(ico.x, ico.y, 10, COLOR[it.organo]).setDepth(33).setBlendMode(Phaser.BlendModes.ADD);
                await U.tween(this, { targets: chispa, x: o.cont.x, y: o.cont.y, duration: 700, ease: 'Sine.easeIn' });
                U.sfx('chispas');
                o.reaccion('acierto');
                await U.tween(this, { targets: chispa, x: cer.x, y: cer.y, duration: 700, ease: 'Sine.easeOut' });
                chispa.destroy();
                cer.fillColor = 0xf783ac;
                this.tweens.add({ targets: cer, scale: { from: 1.3, to: 1 }, alpha: { from: 1, to: 0.7 }, duration: 400 });
                if (it.id === 'campana') { this.tanerCampana(0.9); this.balancear(1); }
            }
            cer.setFillStyle(0xf783ac, 0.95);
            U.estallido(this, cer.x, cer.y, { n: 20, dist: 140, depth: 88 });
            U.confeti(this, 100);
            var tt = L().titulo(this, '¡Ingeniero de Conexiones Sensoriales!', { y: m.h - 46, x: (m.w - 140) / 2, ancho: m.w - 190 });
            U.sfx('celebracion');
            await U.esperar(this, 3000);
            void tt;
        },

        update: function (time, delta) {
            var scene = this, dt = Math.min(delta || 16, 50) / 1000, m = this.m();
            if (this.modo === 'buscar' && this.buscando && this.mic && this.mic.active && this.campanasB) this.oirBuscar(time, dt);
            Object.keys(this.org || {}).forEach(function (k) { scene.org[k].actualizar(time); });
            if (this.zz && this.zz.active && this.zz.text) { this.zz.y = m.cy - m.R * 0.85 - Math.abs(Math.sin(time / 600)) * 10; }
            // Balanceo de la campana con golpes del badajo.
            var c = this.campana;
            if (c && c.active) {
                var ang = 0, t = 0;
                if (this.bal) {
                    t = (time - this.bal.t0) / 1000;
                    ang = this.bal.amp * Math.exp(-t * 0.9) * Math.sin(t * 5.2);
                    var fase = Math.floor((t * 5.2) / Math.PI);
                    if (fase !== this.bal.ult && t > 0.05) { this.bal.ult = fase; this.tanerCampana(Math.max(0.35, 0.95 * Math.exp(-t * 0.5))); }
                    if (t > 6) this.bal = null;
                } else if (!U.reducido()) {
                    var tg = c.golpe ? (time - c.golpe) / 1000 : 9;
                    ang = Math.exp(-tg * 1.6) * 0.12 * Math.sin(time / 260);
                }
                c.rotation = ang;
                c.badajo.rotation = -ang * 1.5 + Math.sin(time / 200) * 0.02;
            }
            // Soga con su agarre.
            var sg = this.cuerdaG;
            sg.clear();
            var G = m.grip, vis = this.grip ? this.grip.vis : 0;
            if (c && c.alpha > 0.3 && vis > 0.01) {
                var gy = this.grip.y;
                sg.lineStyle(7, 0x8a5a2b, vis); sg.lineBetween(G.x, c.y + c.tam * 0.95, G.x + Math.sin(time / 700) * 2, gy);
                sg.lineStyle(2, 0xd9b36c, vis * 0.7); sg.lineBetween(G.x - 1, c.y + c.tam * 0.95, G.x - 1, gy);
                sg.fillStyle(0xe0b84a, vis); sg.fillRoundedRect(G.x - 16, gy, 32, 30, 8);
                sg.lineStyle(3, 0x7a5a1a, vis); sg.strokeRoundedRect(G.x - 16, gy, 32, 30, 8);
                if (!this.grip.arr && this.modo === 'campana') { var sb = Math.sin(time / 300) * 4; sg.fillStyle(0xffffff, 0.8 * vis); sg.fillTriangle(G.x - 8, gy + 40 + sb, G.x + 8, gy + 40 + sb, G.x, gy + 54 + sb); }
            }
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
            return { modo: this.modo, grip: this.grip ? Math.round(this.grip.y) : null, hallazgos: this.hallazgos, bal: !!this.bal };
        }
    };

    global.PedniaCampanario = B.crearMotor({ id: 'campanario', fondo: '#0a1030', extras: true, escena: escena });
})(typeof window !== 'undefined' ? window : this);
