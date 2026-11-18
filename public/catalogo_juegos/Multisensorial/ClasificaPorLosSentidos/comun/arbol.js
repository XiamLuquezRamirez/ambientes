/**
 * «El árbol de las maravillas» — Canasta de la Vista (3-4 años).
 *
 * De las ramas de un árbol cuelgan objetos que van brotando sin parar. El niño SACUDE (frota el dedo
 * de lado a lado sobre un objeto, o lo toca varias veces) y el objeto cae. Lo que SOLO se ve (arcoíris,
 * sol, estrella…) cae en la canasta del ojo; lo demás cae al pasto, hace lo suyo (suena, huele…) y rueda
 * fuera para dar lugar a otro (sin castigo).
 */
(function (global) {
    'use strict';

    var K = global.SentidosKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var UMBRAL = 250;

    var escena = {
        iniciar: function () {
            this.frutas = [];
            this.slots = [];
            this.reunidos = [];
            this.sacudiendo = null;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.horizonte = Math.round(H * 0.46);
            L.suelo = Math.round(H * 0.88);
            
            L.arbol = { x: Math.round(L.der * 0.36), y: Math.round(H * 0.42), R: Math.round(Math.min(H * 0.3, L.der * 0.27)) };
            L.tam = Math.max(70, Math.min(126, H * 0.17, L.arbol.R * 0.78));
            L.canasta = { x: Math.round(Math.min(L.der - 90, L.W * 0.76)), y: Math.round(H * 0.78), w: Math.round(Math.max(130, Math.min(190, L.W * 0.14))) };
            L.bocina = { x: -99, y: -99, r: 1 };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            var V = this.montarVida(keep);
            // Atardecer mágico: cielo que va de violeta a naranja, estrellas que asoman, sol que se pone y colinas oscuras.
            var clave = 'cielo_ocaso_' + L.W + '_' + L.H;
            if (!this.textures.exists(clave)) {
                var tx = this.textures.createCanvas(clave, L.W, L.horizonte + 40);
                var c = tx.getContext();
                var gr = c.createLinearGradient(0, 0, 0, L.horizonte + 40);
                gr.addColorStop(0, '#2b1b5e'); gr.addColorStop(0.45, '#8e3b9e'); gr.addColorStop(0.75, '#ff7b6b'); gr.addColorStop(1, '#ffc16b');
                c.fillStyle = gr; c.fillRect(0, 0, L.W, L.horizonte + 40);
                tx.refresh();
            }
            keep(this.add.image(0, 0, clave).setOrigin(0, 0).setDepth(0));
            if (V && V.estrellas) V.estrellas({ x: 0, y: 0, w: L.W, h: L.horizonte * 0.6 }, 26);
            var solx = L.W * 0.78, soly = L.horizonte - 6;
            var halo = keep(this.add.graphics().setDepth(0.4));
            [[2.6, 0.12], [1.9, 0.2], [1.4, 0.3]].forEach(function (h) { halo.fillStyle(0xfff3bf, h[1]); halo.fillCircle(solx, soly, L.H * 0.11 * h[0]); });
            keep(this.add.circle(solx, soly, L.H * 0.11, 0xffe066).setDepth(0.5));
            this.solOcaso = { x: solx, y: soly };
            var col = keep(this.add.graphics().setDepth(0.8));
            col.fillStyle(0x6b3a8a, 1);
            col.beginPath(); col.moveTo(0, L.horizonte + 10);
            for (var i = 0; i <= 12; i++) col.lineTo(L.W * i / 12, L.horizonte - 30 - Math.abs(Math.sin(i * 1.7)) * L.H * 0.08);
            col.lineTo(L.W, L.horizonte + 10); col.closePath(); col.fillPath();
            col.fillStyle(0x3b2a6e, 1);
            col.beginPath(); col.moveTo(0, L.horizonte + 14);
            for (var j = 0; j <= 16; j++) col.lineTo(L.W * j / 16, L.horizonte - 6 - Math.abs(Math.sin(j * 2.3 + 1)) * L.H * 0.05);
            col.lineTo(L.W, L.horizonte + 14); col.closePath(); col.fillPath();
            var pasto = keep(this.add.graphics().setDepth(1.5));
            pasto.fillStyle(0x2f6b4f, 1); pasto.fillRect(0, L.horizonte, L.W, L.H - L.horizonte);
            pasto.fillStyle(0x3f8f63, 1); pasto.fillRect(0, L.horizonte, L.W, 8);
            pasto.fillStyle(0x56b37a, 0.45);
            for (var k = 0; k < 70; k++) { var gx = (k * 97) % L.W, gy = L.horizonte + 14 + ((k * 53) % Math.max(10, L.H - L.horizonte - 20)); pasto.fillTriangle(gx, gy, gx + 4, gy - 11, gx + 8, gy); }
            // flores que brillan en el pasto
            for (var f = 0; f < 14; f++) { var fx = (f * 131 + 40) % L.W, fy = L.horizonte + 30 + ((f * 71) % Math.max(10, L.H - L.horizonte - 50)); pasto.fillStyle([0xffd43b, 0xff8787, 0xda77f2, 0x74c0fc][f % 4], 0.9); pasto.fillCircle(fx, fy, 5); pasto.fillStyle(0xfff3bf, 1); pasto.fillCircle(fx, fy, 2); }
            // Árbol grande: tronco fijo y copa con ramas que se mece al sacudir.
            var A = L.arbol;
            var t = keep(this.add.graphics().setDepth(2));
            t.fillStyle(0x000000, 0.14); t.fillEllipse(A.x, L.suelo - 6, A.R * 1.4, A.R * 0.22);
            t.fillStyle(0x8d5a2b, 1);
            t.fillRoundedRect(A.x - A.R * 0.16, A.y + A.R * 0.5, A.R * 0.32, L.suelo - A.y - A.R * 0.5, 10);
            t.fillStyle(0x6d4220, 0.5); t.fillRect(A.x + A.R * 0.04, A.y + A.R * 0.7, A.R * 0.06, L.suelo - A.y - A.R * 0.8);
            var rel = [[-0.74, 0.02], [0.7, -0.2], [-0.2, 0.5], [0.62, 0.46]];
            var baseY = A.y + A.R * 0.55;
            var arb = keep(this.add.container(A.x, baseY).setDepth(3));
            var copa = this.add.graphics();
            [[0, -0.55, 1.0, 0x37b24d], [-0.55, -0.37, 0.7, 0x2f9e44], [0.55, -0.35, 0.72, 0x2f9e44], [-0.25, -0.9, 0.65, 0x51cf66], [0.3, -0.85, 0.62, 0x51cf66], [0, -0.25, 0.7, 0x40c057]].forEach(function (c) {
                copa.fillStyle(c[3], 1); copa.fillCircle(c[0] * A.R, c[1] * A.R, c[2] * A.R);
            });
            copa.fillStyle(0xffffff, 0.1); copa.fillCircle(-A.R * 0.3, -A.R * 0.95, A.R * 0.45);
            // ramas: del tronco hasta donde cuelga cada objeto
            var ramas = this.add.graphics();
            ramas.lineStyle(Math.max(10, A.R * 0.07), 0x8d5a2b, 1);
            rel.forEach(function (r) {
                var ex = r[0] * A.R, ey = (A.y + r[1] * A.R - L.tam * 0.95) - baseY;
                ramas.lineBetween(0, -A.R * 0.05, ex * 0.5, (ey - A.R * 0.05) * 0.5 - 12);
                ramas.lineBetween(ex * 0.5, (ey - A.R * 0.05) * 0.5 - 12, ex, ey);
                ramas.fillStyle(0x6d4220, 1); ramas.fillCircle(ex, ey, Math.max(6, A.R * 0.04));
            });
            arb.add([copa, ramas]);
            this.arbC = arb;
            // pájaro posado en la copa: se espanta al sacudir y vuelve después
            var pj = keep(this.add.container(A.x + A.R * 0.78, A.y - A.R * 0.62).setDepth(4));
            var pg = this.add.graphics();
            pg.fillStyle(0xff6b6b, 1); pg.fillEllipse(0, 0, 38, 28); pg.fillCircle(16, -12, 11);
            pg.fillStyle(0xfcc419, 1); pg.fillTriangle(25, -14, 25, -8, 34, -11);
            pg.fillStyle(0xc92a2a, 1); pg.fillTriangle(-16, 0, -36, -10, -34, 6);
            pg.fillStyle(0x212529, 1); pg.fillCircle(19, -14, 2.4);
            pj.add(pg);
            this.pajaro = { c: pj, fuera: false, x: pj.x, y: pj.y, regreso: 0 };
            // arcoíris que se va completando con los aciertos
            this.arcoG = keep(this.add.graphics().setDepth(1.2));
            this.pintarArco();
            this.tallosG = keep(this.add.graphics().setDepth(19));
            this.cana = this.canasta(keep, 'vista', L.canasta.x, L.canasta.y, L.canasta.w);
            this.montarHud(keep);
            this.sembrarMotes(keep, 26, { x: 0, y: L.horizonte * 0.6, w: L.W, h: L.H - L.horizonte * 0.6, depth: 8 }, 0xfff59d);
            // Lugares de las frutas dentro de la copa.
            var self = this;
            var viejos = this.slots;
            this.slots = rel.map(function (r, i) {
                var s = viejos[i] || { fruta: null, libreDesde: 0 };
                s.x = A.x + r[0] * A.R; s.y = A.y + r[1] * A.R;
                return s;
            });
            this.slots.forEach(function (s) { if (s.fruta && s.fruta.cont.active && !s.fruta.ocupada) s.fruta.cont.setPosition(s.x, s.y); });
        },

        pintarArco: function () {
            var g = this.arcoG, L = this.L;
            if (!g || !g.active) return;
            g.clear();
            var n = Math.min(7, Math.ceil((this.reunidos || []).length / 2));
            var cols = [0xff6b6b, 0xff922b, 0xfcc419, 0x51cf66, 0x339af0, 0x5c7cfa, 0xcc5de8];
            var cx = L.der * 0.64, cy = L.horizonte + 14, r0 = L.H * 0.24, w = Math.max(9, L.H * 0.017);
            g.lineStyle(w * 0.5, 0xffffff, 0.35);
            g.beginPath(); g.arc(cx, cy, r0 + w * 0.2, Math.PI, Math.PI * 2); g.strokePath();
            for (var i = 0; i < n; i++) {
                g.lineStyle(w, cols[i], 0.95);
                g.beginPath(); g.arc(cx, cy, r0 - i * w, Math.PI, Math.PI * 2); g.strokePath();
            }
        },

        destelloCanasta: function () {
            var b = this.cana.boca, g = this.add.graphics().setDepth(44);
            var k = { t: 0 };
            tw(this, { targets: k, t: 1, duration: 700, onUpdate: function () {
                g.clear();
                for (var i = 0; i < 12; i++) {
                    var a = i * Math.PI / 6, r0 = 30 + k.t * 40, r1 = 60 + k.t * 150;
                    g.lineStyle(6, 0xfff3bf, 1 - k.t);
                    g.lineBetween(b.x + Math.cos(a) * r0, b.y - 20 + Math.sin(a) * r0, b.x + Math.cos(a) * r1, b.y - 20 + Math.sin(a) * r1);
                }
            } }).then(function () { g.destroy(); });
        },

        brisa: function () {
            var L = this.L;
            var h = this.add.rectangle(-20, L.H * (0.2 + Math.random() * 0.35), 12, 7, [0x51cf66, 0x8ce99a, 0xfab005][(Math.random() * 3) | 0]).setDepth(9);
            this.tweens.add({ targets: h, x: L.W + 30, y: h.y + (Math.random() - 0.5) * 140, angle: 540, duration: 6500 + Math.random() * 2500, onComplete: function () { h.destroy(); } });
        },

        espantarPajaro: function () {
            var p = this.pajaro;
            if (!p || p.fuera || !p.c.active) return;
            p.fuera = true; p.regreso = this.time.now + 9000;
            K.efecto(this, 'chispas');
            this.tweens.add({ targets: p.c, x: p.x + this.L.W * 0.5, y: p.y - this.L.H * 0.3, angle: -25, duration: 1300, ease: 'Sine.easeIn', onComplete: function () { p.c.setAlpha(0); } });
        },

        /* ── Frutas ── */

        crearFruta: function (slot, id, rapido) {
            var self = this;
            var a = this.crearCosa(id, slot.x, slot.y, this.L.tam, { depth: 20 });
            a.slot = slot; a.fase2 = Math.random() * 6; a.sacudida = 0; a.vibra = 0;
            var hl = this.add.circle(0, 0, this.L.tam * 0.5, 0xfff3bf, 0.2);
            a.cont.addAt(hl, 0);
            this.tweens.add({ targets: hl, alpha: 0.08, scale: 1.18, duration: 900 + Math.random() * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            slot.fruta = a;
            this.frutas.push(a);
            a.cont.setScale(0);
            tw(this, { targets: a.cont, scale: 1, duration: rapido ? 200 : 420, ease: 'Back.easeOut' });
            return a;
        },

        visibles: function () { return this.frutas.filter(function (a) { return a.cont.active; }).map(function (a) { return a.id; }); },

        arrancar: async function (nv) {
            var self = this;
            this.frutas = [];
            this.slots.forEach(function (s) { s.fruta = null; s.libreDesde = self.time.now; });
            var n = Math.min(nv.vis, this.slots.length);
            // se acomodan primero las de la derecha (la más lejos del niño al final)
            var orden = [0, 1, 2, 3];
            for (var i = 0; i < n; i++) {
                var id = this.sacar(this.visibles());
                if (!id) break;
                this.crearFruta(this.slots[orden[i]], id);
                K.ruido({ f: 1100, q: 1, dur: 0.08, vol: 0.05 });
                await esperar(this, 220);
            }
        },

        prepararNivel: async function () {
            await this.retirar(this.frutas);
            this.frutas = [];
            this.slots.forEach(function (s) { s.fruta = null; });
            this.sacudiendo = null;
        },

        alTerminarNivel: async function () {
            await this.retirar(this.frutas);
            this.frutas = [];
            this.slots.forEach(function (s) { s.fruta = null; });
        },

        /* ── Sacudir ── */

        alTocar: function (p) {
            if (this.fase !== 'jugar') return;
            var a = this.cosaEn(this.frutas.filter(function (f) { return !f.ocupada; }), p.x, p.y, this.L.tam * 0.62);
            if (!a) return;
            this.sacudiendo = { a: a, x: p.x, y: p.y, acum: 0 };
            a.vibra = 1;
            this.pista.reiniciar();
        },

        alMover: function (p) {
            var s = this.sacudiendo;
            if (!s || s.a.ocupada) return;
            s.acum += Math.abs(p.x - s.x) + Math.abs(p.y - s.y) * 0.6;
            s.x = p.x; s.y = p.y;
            s.a.vibra = 1;
            s.a.sacudida = s.acum;
            this.vibArbol = 1;
            if (Math.random() < 0.12) this.hojasCaen(s.a.cont.x + (Math.random() - 0.5) * 120, s.a.cont.y - 70, 2);
            if (s.acum > UMBRAL * 0.5) this.espantarPajaro();
            if (s.acum >= UMBRAL) { this.sacudiendo = null; this.soltarFruta(s.a); }
        },

        alSoltar: function () {
            var s = this.sacudiendo;
            this.sacudiendo = null;
            if (!s || s.a.ocupada) return;
            if (s.acum < 30) {                      // un toque: un buen golpe (tres toques la tiran)
                s.a.golpes = (s.a.golpes || 0) + 1;
                s.a.vibra = 1; this.vibArbol = 1;
                this.hojasCaen(s.a.cont.x, s.a.cont.y - 30, 3);
                K.ruido({ f: 700, q: 1, dur: 0.07, vol: 0.06 });
                if (s.a.golpes >= 3) this.soltarFruta(s.a);
            }
        },

        soltarFruta: async function (a) {
            if (!a || a.ocupada || !a.cont.active) return;
            a.ocupada = true;
            var L = this.L, slot = a.slot;
            this.hojasCaen(a.cont.x, a.cont.y - 40, 12);
            this.vibArbol = 1.6; this.espantarPajaro();
            K.ruido({ f: 900, q: 1, dur: 0.12, vol: 0.07 });
            a.cont.setDepth(60);
            if (this.sentidoDe(a.id) === 'vista') {
                slot.fruta = null; slot.libreDesde = this.time.now;
                var self = this;
                this.time.addEvent({ delay: 45, repeat: 14, callback: function () { if (a.cont.active) Ut.estallido(self, a.cont.x, a.cont.y, { n: 2, tex: 'chispa', tam: 22, dist: 36, depth: 59, colores: [0xfff3bf, 0xffd43b, 0xffffff] }); } });
                await this.entrarCanasta(a, this.cana);
                this.destelloCanasta();
                this.frutas = this.frutas.filter(function (f) { return f !== a; });
                await this.clasificar(a.id, 'vista', { x: this.cana.boca.x, y: this.cana.boca.y - 50 });
                return;
            }
            // no es de la vista: cae al pasto, hace lo suyo y rueda fuera
            slot.fruta = null; slot.libreDesde = this.time.now + 600;
            var x = a.cont.x + (Math.random() - 0.5) * 60;
            await tw(this, { targets: a.cont, x: x, y: L.suelo - L.tam * 0.3, duration: 520, ease: 'Bounce.easeOut' });
            await this.clasificar(a.id, 'vista', { x: a.cont.x, y: a.cont.y - 20 });
            var dir = x < L.arbol.x ? -1 : 1;
            await tw(this, { targets: a.cont, x: a.cont.x + dir * 160, angle: dir * 300, alpha: 0, duration: 700 });
            this.frutas = this.frutas.filter(function (f) { return f !== a; });
            if (a.cont.active) a.cont.destroy();
        },

        alAcertar: async function () {
            var o = this.cana && this.cana.organo;
            if (o && o.reaccion) o.reaccion('acierto');
            this.cameras.main.shake(90, 0.002);
            this.pintarArco();
        },

        alFallar: async function () {
            var o = this.cana && this.cana.organo;
            if (o && o.reaccion) o.reaccion('error');
        },

        /* ── Ayudas ── */

        mostrarPista: function (cancelada) {
            if (this.fase !== 'jugar') return Promise.resolve();
            var buenas = this.frutas.filter(function (f) { return f.cont.active && !f.ocupada; });
            var self = this;
            var a = buenas.filter(function (f) { return self.sentidoDe(f.id) === 'vista'; })[0];
            if (!a) return esperar(this, 900);
            var r = this.ayuda ? 70 : 40;
            this.tweens.add({ targets: a.cont, scale: 1.15, duration: 220, yoyo: true, repeat: 2 });
            return this.manoDe(cancelada, { x: a.cont.x - r, y: a.cont.y }, { x: a.cont.x + r, y: a.cont.y });
        },

        demoPaso: function () {
            var self = this;
            var a = this.frutas.filter(function (f) { return self.sentidoDe(f.id) === 'vista'; })[0];
            if (!a) return null;
            return {
                desde: { x: a.cont.x - 60, y: a.cont.y }, hasta: { x: a.cont.x + 60, y: a.cont.y }, durMs: 700,
                hacer: async function () { a.vibra = 1; self.hojasCaen(a.cont.x, a.cont.y - 30, 5); await esperar(self, 300); await self.soltarFruta(a); }
            };
        },

        /* ── Final: el árbol da todo lo reunido ── */

        escenaFinal: async function () {
            var self = this;
            await this.retirar(this.frutas);
            this.frutas = [];
            var ids = this.reunidosUnicos(4).map(function (r) { return r.id; });
            if (!ids.length) ids = ['arcoiris', 'sol', 'estrella'];
            var lug = ids.map(function (id, i) { var s = self.slots[i % self.slots.length]; return { x: s.x, y: s.y }; });
            this.hojasCaen(this.L.arbol.x, this.L.arbol.y, 14);
            await this.celebrarObjetos(ids, lug, this.L.tam);
            var o = this.cana.organo;
            if (o) { o.reaccion('acierto'); if (o.gafas) o.gafas(true); }
            K.efecto(this, 'celebracion');
            Ut.confeti(this, 90);
            await esperar(this, 1300);
        },

        estadoExtra: function () {
            return {
                canasta: { x: Math.round(this.cana.boca.x), y: Math.round(this.cana.boca.y) },
                frutas: this.frutas.filter(function (a) { return a.cont.active; }).map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y), ocupada: !!a.ocupada }; })
            };
        },

        paso: function (time) {
            var self = this, g = this.tallosG;
            if (g && g.active) {
                g.clear();
                g.lineStyle(5, 0x5c7c2e, 1);
                this.frutas.forEach(function (a) {
                    if (!a.cont.active || a.ocupada) return;
                    g.lineBetween(a.slot.x, a.slot.y - self.L.tam * 0.95, a.cont.x, a.cont.y - self.L.tam * 0.45);
                });
            }
            this.frutas.forEach(function (a) {
                if (!a.cont.active || a.ocupada || self.tweens.isTweening(a.cont)) return;
                a.vibra *= 0.93;
                a.cont.x = a.slot.x + Math.sin(time / 90) * a.vibra * 7;
                a.cont.y = a.slot.y + Math.sin(time / 700 + a.fase2) * 5;
                a.cont.angle = Math.sin(time / 800 + a.fase2) * 3 + Math.sin(time / 70) * a.vibra * 10;
            });
            this.vibArbol = (this.vibArbol || 0) * 0.94;
            if (this.arbC && this.arbC.active) this.arbC.angle = Math.sin(time / 55) * this.vibArbol * 1.8 + Math.sin(time / 1600) * 0.35;
            if (time - (this.ultBrisa || 0) > 2600) { this.ultBrisa = time; this.brisa(); }
            var pj = this.pajaro;
            if (pj && pj.fuera && time > pj.regreso && pj.c.active) {
                pj.fuera = false;
                pj.c.setPosition(pj.x - this.L.W * 0.4, pj.y - this.L.H * 0.2).setAlpha(1).setAngle(0);
                this.tweens.add({ targets: pj.c, x: pj.x, y: pj.y, duration: 1400, ease: 'Sine.easeOut' });
            }
            // las ramas vuelven a dar fruta (el ritmo crece con el nivel)
            var nv = this.nv;
            if (nv && !nv.demo && this.fase === 'jugar') {
                for (var i = 0; i < Math.min(nv.vis, this.slots.length); i++) {
                    var s = this.slots[i];
                    if (!s.fruta && time - s.libreDesde > 1100 / nv.vel) {
                        var id = this.sacar(this.visibles());
                        if (id) this.crearFruta(s, id);
                    }
                }
            }
        }
    };

    K.crear({ id: 'arbol', fondo: '#a5d8ff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
