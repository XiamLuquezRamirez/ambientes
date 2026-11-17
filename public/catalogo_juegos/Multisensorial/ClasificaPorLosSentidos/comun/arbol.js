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
            L.tam = Math.max(78, Math.min(112, H * 0.15));
            L.arbol = { x: Math.round(L.der * 0.36), y: Math.round(H * 0.42), R: Math.round(Math.min(H * 0.26, L.der * 0.2)) };
            L.canasta = { x: Math.round(Math.min(L.der - 90, L.W * 0.76)), y: Math.round(H * 0.78), w: Math.round(Math.max(130, Math.min(190, L.W * 0.14))) };
            L.bocina = { x: -99, y: -99, r: 1 };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            var V = this.montarVida(keep);
            if (V) {
                V.parque({ horizonte: L.horizonte, arboles: [0.03, 0.97], solX: 0.1 });
                V.mariposas(2, { x: 0, y: L.horizonte, w: L.W, h: L.H * 0.4, depth: 8 });
            }
            var pasto = keep(this.add.graphics().setDepth(1.5));
            pasto.fillStyle(0x8ce99a, 1); pasto.fillRect(0, L.horizonte, L.W, L.H - L.horizonte);
            pasto.fillStyle(0x69db7c, 1); pasto.fillRect(0, L.horizonte, L.W, 8);
            pasto.fillStyle(0x51cf66, 0.5);
            for (var i = 0; i < 70; i++) { var gx = (i * 97) % L.W, gy = L.horizonte + 14 + ((i * 53) % Math.max(10, L.H - L.horizonte - 20)); pasto.fillTriangle(gx, gy, gx + 4, gy - 11, gx + 8, gy); }
            // Árbol grande: tronco y copa.
            var A = L.arbol;
            var t = keep(this.add.graphics().setDepth(2));
            t.fillStyle(0x000000, 0.14); t.fillEllipse(A.x, L.suelo - 6, A.R * 1.4, A.R * 0.22);
            t.fillStyle(0x8d5a2b, 1);
            t.fillRoundedRect(A.x - A.R * 0.16, A.y + A.R * 0.5, A.R * 0.32, L.suelo - A.y - A.R * 0.5, 10);
            t.fillStyle(0x6d4220, 0.5); t.fillRect(A.x + A.R * 0.04, A.y + A.R * 0.7, A.R * 0.06, L.suelo - A.y - A.R * 0.8);
            var copa = keep(this.add.graphics().setDepth(3));
            [[0, 0, 1.0, 0x37b24d], [-0.55, 0.18, 0.7, 0x2f9e44], [0.55, 0.2, 0.72, 0x2f9e44], [-0.25, -0.35, 0.65, 0x51cf66], [0.3, -0.3, 0.62, 0x51cf66], [0, 0.3, 0.7, 0x40c057]].forEach(function (c) {
                copa.fillStyle(c[3], 1); copa.fillCircle(A.x + c[0] * A.R, A.y + c[1] * A.R, c[2] * A.R);
            });
            copa.fillStyle(0xffffff, 0.1); copa.fillCircle(A.x - A.R * 0.3, A.y - A.R * 0.4, A.R * 0.45);
            this.tallosG = keep(this.add.graphics().setDepth(19));
            this.cana = this.canasta(keep, 'vista', L.canasta.x, L.canasta.y, L.canasta.w);
            this.montarHud(keep);
            this.sembrarMotes(keep, 10, { x: 0, y: L.horizonte, w: L.W, h: L.H - L.horizonte, depth: 8 }, 0xfff3bf);
            // Lugares de las frutas dentro de la copa.
            var rel = [[-0.55, 0.0], [0.5, -0.2], [-0.2, 0.42], [0.55, 0.36]];
            var self = this;
            var viejos = this.slots;
            this.slots = rel.map(function (r, i) {
                var s = viejos[i] || { fruta: null, libreDesde: 0 };
                s.x = A.x + r[0] * A.R; s.y = A.y + r[1] * A.R;
                return s;
            });
            this.slots.forEach(function (s) { if (s.fruta && s.fruta.cont.active && !s.fruta.ocupada) s.fruta.cont.setPosition(s.x, s.y); });
        },

        /* ── Frutas ── */

        crearFruta: function (slot, id, rapido) {
            var self = this;
            var a = this.crearCosa(id, slot.x, slot.y, this.L.tam, { depth: 20 });
            a.slot = slot; a.fase2 = Math.random() * 6; a.sacudida = 0; a.vibra = 0;
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
            if (Math.random() < 0.08) this.hojasCaen(s.a.cont.x, s.a.cont.y - 30, 2);
            if (s.acum >= UMBRAL) { this.sacudiendo = null; this.soltarFruta(s.a); }
        },

        alSoltar: function () {
            var s = this.sacudiendo;
            this.sacudiendo = null;
            if (!s || s.a.ocupada) return;
            if (s.acum < 30) {                      // un toque: un buen golpe (tres toques la tiran)
                s.a.golpes = (s.a.golpes || 0) + 1;
                s.a.vibra = 1;
                this.hojasCaen(s.a.cont.x, s.a.cont.y - 30, 3);
                K.ruido({ f: 700, q: 1, dur: 0.07, vol: 0.06 });
                if (s.a.golpes >= 3) this.soltarFruta(s.a);
            }
        },

        soltarFruta: async function (a) {
            if (!a || a.ocupada || !a.cont.active) return;
            a.ocupada = true;
            var L = this.L, slot = a.slot;
            this.hojasCaen(a.cont.x, a.cont.y - 40, 6);
            K.ruido({ f: 900, q: 1, dur: 0.12, vol: 0.07 });
            a.cont.setDepth(60);
            if (this.sentidoDe(a.id) === 'vista') {
                slot.fruta = null; slot.libreDesde = this.time.now;
                await this.entrarCanasta(a, this.cana);
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
