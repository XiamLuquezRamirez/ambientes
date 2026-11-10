/**
 * «La granja de noche» — motor propio de Recuerda el sonido (3-4 años).
 * Es de noche y se oye un sonido desde el establo (no se ve quién). Amanece: sobre cada puerta
 * aparece el cartel de quién vive ahí y el niño ABRE LA PUERTA (la toca o la arrastra hacia un lado)
 * del que sonó. Sale a saludar con su sonido; si no es, el otro asoma, suena y vuelve a cerrar.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    var escena = {
        iniciar: function () { this.puertas = []; this.reunidos = []; this.noche = 1; },

        /** En la granja solo viven animales. */
        filtrarPool: function (pool) { return pool.filter(function (id) { return K.ANIMALES.indexOf(id) >= 0; }); },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.bocina = { x: W / 2, y: Math.max(60, Math.min(100, 56 + hueco * 0.2)), r: Math.max(28, Math.min(40, hueco * 0.3)) };
            L.pres = W >= 760 ? { x: W - 78, piso: H - 104, alto: Math.min(170, H * 0.3), modelo: 'nina' } : null;
            L.der = L.pres ? W - 160 : W - 16;
            L.y0 = Math.round(H * 0.74);
            L.establo = { x: 16, w: L.der - 32, y: Math.max(L.bocina.y + L.bocina.r + 70, H * 0.3), h: 0 };
            L.establo.h = L.y0 - L.establo.y;
            L.tam = Math.max(60, Math.min(130, L.establo.w / 4.6, L.establo.h * 0.5));
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            var V = this.montarVida(keep);
            if (V) {
                V.parque({ horizonte: L.y0 - 4, arboles: [0.03, 0.97], solX: 0.88, nubes: 2 });
                V.estrellas({ x: 0, y: 0, w: L.W, h: L.establo.y - 20, depth: 1.5 }, 14);
            }
            K.textura(this, 'granja_suelo', L.W, L.H - L.y0, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#c49a6c'); g.addColorStop(1, '#a47148');
                x.fillStyle = g; x.fillRect(0, 0, w, h);
                K.grano(x, 0, 0, w, h, Math.round(w * h / 200), ['#8d6e63', '#d7b899', '#ffe066'], 1.8, 0.45);
            });
            keep(this.add.image(0, L.y0, 'granja_suelo').setOrigin(0, 0).setDepth(4));
            // Fachada del establo: techo rojo a dos aguas y tablas.
            var E = L.establo;
            K.textura(this, 'granja_establo', E.w, E.h + E.h * 0.45, function (x, w, h) {
                var t = h - E.h;
                x.fillStyle = '#c92a2a';
                x.beginPath(); x.moveTo(-6, t + 6); x.lineTo(w / 2, 0); x.lineTo(w + 6, t + 6); x.closePath(); x.fill();
                x.fillStyle = '#e03131'; x.fillRect(0, t, w, E.h);
                x.strokeStyle = 'rgba(0,0,0,0.12)'; x.lineWidth = 2;
                for (var xx = 10; xx < w; xx += 18) { x.beginPath(); x.moveTo(xx, t); x.lineTo(xx, h); x.stroke(); }
                x.fillStyle = '#fff'; x.fillRect(0, t, w, 7);
                // Ventanita redonda del pajar.
                x.fillStyle = '#ffe066'; x.beginPath(); x.arc(w / 2, t * 0.6, Math.min(26, t * 0.28), 0, Math.PI * 2); x.fill();
                x.strokeStyle = '#fff'; x.lineWidth = 4; x.stroke();
            });
            keep(this.add.image(E.x, E.y + E.h, 'granja_establo').setOrigin(0, 1).setDepth(5));
            // Velo de la noche (se aclara al amanecer).
            this.velo = keep(this.add.rectangle(0, 0, L.W, L.H, 0x0b1a3a, 0.62 * this.noche).setOrigin(0, 0).setDepth(45));
            this.luna = keep(this.add.circle(L.W * 0.14, L.establo.y * 0.45, Math.min(30, L.establo.y * 0.22), 0xfff9db, this.noche).setDepth(46));
            this.montarHud(keep);
            if (reubicar && this.nv) this.armarPuertas(this.nv.opciones, true);
        },

        /** Noche (1) o día (0). */
        ponerNoche: function (n, ms) {
            this.noche = n;
            // De noche el sol se esconde (se queda solo la luna).
            var soles = this.vidaAmb && this.vidaAmb.buscar ? this.vidaAmb.buscar('sol') : [];
            var self = this;
            soles.forEach(function (s) { self.tweens.add({ targets: s.c, alpha: 1 - n, duration: ms || 900 }); });
            return Promise.all([
                tw(this, { targets: this.velo, fillAlpha: 0.62 * n, duration: ms || 900 }),
                tw(this, { targets: this.luna, alpha: n, y: n ? this.L.establo.y * 0.45 : this.L.establo.y, duration: ms || 900 })
            ]);
        },

        /* ── Puertas del establo ── */

        armarPuertas: function (ids, conCartel) {
            var self = this;
            var L = this.L, E = L.establo;
            this.puertas.forEach(function (p) { p.cont.destroy(); p.hojaCont.destroy(); if (p.animal) p.animal.destruir(); });
            var n = ids.length;
            var pw = Math.min(E.w / n * 0.78, L.tam * 1.3), ph = E.h * 0.62;
            this.puertas = ids.map(function (id, i) {
                var cx = E.x + E.w * (i + 0.5) / n, base = E.y + E.h;
                var c = self.add.container(cx, base).setDepth(20);
                var hueco = self.add.rectangle(0, -ph / 2, pw, ph, 0x2b1a0e);
                var animal = self.crearCosa(id, cx, base - ph * 0.42, Math.min(pw * 0.85, ph * 0.8), { depth: 21 });
                animal.cont.setVisible(false);
                // Hoja de la puerta, con bisagra a la izquierda (se abre girando).
                var hoja = self.add.container(-pw / 2, -ph);
                var g = self.add.graphics();
                g.fillStyle(0x8c3b1a, 1); g.fillRect(0, 0, pw, ph);
                g.lineStyle(5, 0xf8f9fa, 1); g.strokeRect(3, 3, pw - 6, ph - 6);
                g.lineBetween(4, 4, pw - 4, ph - 4); g.lineBetween(pw - 4, 4, 4, ph - 4);
                hoja.add(g);
                var cartel = self.add.container(0, -ph - pw * 0.32);
                var tabla = self.add.rectangle(0, 0, pw * 0.72, pw * 0.56, 0xf1c27d).setStrokeStyle(4, 0x8c5a2b);
                var img = self.add.image(0, 0, 'el_' + id);
                img.setScale(pw * 0.48 / Math.max(img.width, img.height));
                cartel.add([tabla, img]);
                cartel.setScale(conCartel ? 1 : 0);
                c.add([hueco, cartel]);
                var hc = self.add.container(cx, base).setDepth(22);
                hc.add(hoja);
                return { id: id, cont: c, hojaCont: hc, hoja: hoja, cartel: cartel, animal: animal, x: cx, y: base - ph / 2, w: pw, h: ph, abierta: false };
            });
        },

        abrir: function (p, si, ms) {
            p.abierta = si;
            K.ruido({ f: si ? 420 : 260, q: 0.8, dur: 0.3, vol: 0.08 });
            return tw(this, { targets: p.hoja, scaleX: si ? 0.12 : 1, duration: ms || 320, ease: si ? 'Back.easeOut' : 'Quad.easeIn' });
        },

        prepararNivel: async function (i, nv) {
            var self = this;
            await Promise.all(this.puertas.map(function (p) { return p.abierta ? self.abrir(p, false) : null; }));
            await this.ponerNoche(1, 900);
            this.armarPuertas(nv.opciones, false);
        },

        /** De noche: el establo entero tiembla un poquito con cada sonido (no dice quién). */
        alSonar: function () {
            var self = this;
            this.puertas.forEach(function (p) { self.tweens.add({ targets: p.hoja, angle: 1.5, duration: 80, yoyo: true, repeat: 2 }); });
        },

        mostrarOpciones: async function () {
            var self = this;
            K.tono({ f: 520, f2: 880, dur: 0.5, vol: 0.04 });
            await this.ponerNoche(0, 1200);
            for (var i = 0; i < this.puertas.length; i++) {
                K.ruido({ f: 1600, q: 1, dur: 0.06, vol: 0.05 });
                this.tweens.add({ targets: this.puertas[i].cartel, scale: 1, duration: 320, ease: 'Back.easeOut' });
                await esperar(this, 140);
            }
        },

        puertaEn: function (x, y) {
            return this.puertas.filter(function (p) { return Math.abs(x - p.x) < p.w * 0.6 && y > p.y - p.h * 0.9 && y < p.y + p.h * 0.6; })[0];
        },

        /* ── Gesto: abrir la puerta (tocarla o arrastrarla hacia un lado) ── */

        alTocar: function (p) {
            if (this.fase !== 'jugar') return;
            var q = this.puertaEn(p.x, p.y);
            if (!q || q.abierta) return;
            this.arrastrando = { q: q, x0: p.x, t: this.time.now };
            this.pista.reiniciar();
        },
        alMover: function (p) {
            var r = this.arrastrando;
            if (!r) return;
            var k = Math.max(0.12, Math.min(1, 1 - Math.abs(p.x - r.x0) / (r.q.w * 0.9)));
            r.q.hoja.scaleX = k;
        },
        alSoltar: async function () {
            var r = this.arrastrando;
            this.arrastrando = null;
            if (!r || this.fase !== 'jugar') return;
            var q = r.q;
            if (q.hoja.scaleX > 0.6 && this.time.now - r.t > 450) { this.abrir(q, false, 150); return; }
            await this.abrir(q, true);
            this.tocado = q;
            var ok = await this.elegir(q.id, { x: q.x, y: q.y });
            if (ok === false) {
                await esperar(this, 300);
                q.animal.cont.setVisible(false);
                await this.abrir(q, false);
            }
        },

        alAcertar: async function () {
            var q = this.tocado;
            var a = q.animal;
            // Sale a saludar al patio.
            a.cont.setVisible(true).setDepth(30);
            await this.saltarA(a.cont, q.x, this.L.y0 + (this.L.H - this.L.y0) * 0.35, { ms: 420, alto: 50 });
            this.reunidos.push(q.id);
            await Promise.all([this.sonar(q.id, { bocina: false }), a.saltito(0.2, 3)]);
        },

        alFallar: async function () {
            var q = this.tocado;
            // El otro asoma la cabeza, suena (lo hace el kit) y vuelve a entrar.
            q.animal.cont.setVisible(true);
            await q.animal.sacudir();
        },

        alTerminarNivel: async function () {
            var q = this.tocado;
            if (q && q.animal) {
                await this.saltarA(q.animal.cont, q.x, q.y + q.h * 0.08, { ms: 380, alto: 40 });
                q.animal.cont.setVisible(false);
                await this.abrir(q, false);
            }
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            if (!this.ayuda) return this.pistaBocina();
            var q = this.puertas.filter(function (p) { return self.respuestas().indexOf(p.id) >= 0; })[0];
            return q ? this.ctx.mano({ punto: { x: q.x, y: q.y }, holdMs: 500, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } }) : Promise.resolve();
        },

        /* ── Escena final: buen día en la granja ── */

        escenaFinal: async function () {
            var self = this;
            var L = this.L;
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; });
            this.armarPuertas(ids, true);
            await this.ponerNoche(0, 300);
            // Se abren todas las puertas a la vez y salen todos al patio.
            await Promise.all(this.puertas.map(function (q, i) { return esperar(self, i * 150).then(function () { return self.abrir(q, true); }); }));
            for (var i = 0; i < this.puertas.length; i++) {
                var q = this.puertas[i];
                q.animal.cont.setVisible(true).setDepth(30);
                await this.saltarA(q.animal.cont, q.x, L.y0 + (L.H - L.y0) * 0.35, { ms: 380, alto: 50 });
                this.sonar(q.id, { breve: true, bocina: false });
                q.animal.saltito(0.2, 2);
                await esperar(this, 420);
                if (!this.sigue()) return;
            }
            Ut.estallido(this, L.der / 2, L.establo.y, { n: 16, tex: 'corazon', tam: 26, dist: 170, depth: 60 });
            await esperar(this, 1000);
        },

        /** Demo: la mano abre la puerta del que sonó. */
        demoPaso: function () {
            var self = this;
            var r = this.respuestas();
            var q = this.puertas.filter(function (p) { return r.indexOf(p.id) >= 0; })[0];
            if (!q) return null;
            return {
                desde: { x: q.x, y: q.y }, mantener: 400,
                hacer: function () { self.arrastrando = { q: q, x0: q.x, t: self.time.now }; return self.alSoltar(); }
            };
        },

        estadoExtra: function () {
            return { puertas: this.puertas.map(function (p) { return { id: p.id, x: Math.round(p.x), y: Math.round(p.y), abierta: p.abierta }; }) };
        }
    };

    K.crear({ id: 'granja', fondo: '#a5d8ff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
