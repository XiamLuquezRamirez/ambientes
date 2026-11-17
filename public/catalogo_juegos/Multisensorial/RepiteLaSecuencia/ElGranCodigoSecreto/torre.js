/**
 * «La torre del código secreto» — motor propio de El Gran Código Secreto (5-6 años).
 *
 * En una obra hay un plano de torre con un hueco por cada sonido del código. Mientras suena el
 * código, los huecos se iluminan de abajo hacia arriba (cuentan cuántos son, sin decir cuáles).
 * Después los bloques, cada uno con un sonido, esperan en el suelo y el niño los ARRASTRA a la
 * torre en el mismo orden en que sonaron: la torre crece piso a piso y se tambalea. Si pone uno
 * equivocado, la torre se desarma sin daño y el código suena otra vez. Al completar el último piso
 * sube la bandera y todos los bloques suenan en orden.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    var COLORES = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xcc5de8, 0xff922b];

    var escena = {
        iniciar: function () {
            this.cosas = [];
            this.reunidos = [];
            this.pisos = [];
            this.temblor = 0;
            this.lampOn = -1;
            this.bandera = 0;
            this.nPisos = 0;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.suelo = Math.round(H * 0.88);
            L.tam = Math.max(70, Math.min(104, H * 0.12));
            L.tx = Math.round(L.der * 0.27);
            L.bocina = { x: 48, y: Math.round(H * 0.2), r: Math.max(24, Math.min(32, hueco * 0.28)) };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            var V = this.montarVida(keep);
            if (V) {
                V.parque({ horizonte: L.suelo - 60, arboles: [0.52, 0.66, 0.8, 0.96], solX: 0.12 });
            }
            var g = keep(this.add.graphics().setDepth(1.6));
            g.fillStyle(0xd9b36c, 1); g.fillRect(0, L.suelo - 30, L.W, L.H - L.suelo + 30);
            g.fillStyle(0xbf9650, 1); g.fillRect(0, L.suelo - 30, L.W, 8);
            g.fillStyle(0xa9824a, 0.6);
            for (var i = 0; i < 40; i++) g.fillCircle((i * 97) % L.W, L.suelo + ((i * 31) % (L.H - L.suelo)), 2 + i % 3);
            // Base de la torre y grúa decorativa.
            var b = keep(this.add.graphics().setDepth(3));
            b.fillStyle(0x6c757d, 1); b.fillRoundedRect(L.tx - L.tam * 0.8, L.suelo - 24, L.tam * 1.6, 24, 6);
            b.fillStyle(0xfcc419, 1);
            for (var s = 0; s < 8; s++) b.fillRect(L.tx - L.tam * 0.78 + s * (L.tam * 0.2), L.suelo - 20, L.tam * 0.1, 16);
            this.planoG = keep(this.add.graphics().setDepth(4));
            this.graG = keep(this.add.graphics().setDepth(5));
            this.banderaG = keep(this.add.graphics().setDepth(45));
            this.montarHud(keep);
            this.sembrarMotes(keep, 12, { x: 0, y: 0, w: L.W, h: L.suelo, depth: 8 }, 0xfff3bf);
            if (reubicar) this.ubicarCosas();
        },

        /** Centro del piso k de la torre (0 = el de abajo). */
        pos: function (k) {
            var L = this.L;
            return { x: L.tx, y: L.suelo - 24 - L.tam * (k + 0.5) };
        },

        /* ── Bloques ── */

        lugares: function (n) {
            var L = this.L;
            var x0 = L.tx + L.tam * 2.2;
            var disp = L.der - x0 - L.tam * 0.6;
            var filas = n > 4 ? 2 : 1;
            var porFila = Math.ceil(n / filas);
            var out = [];
            for (var i = 0; i < n; i++) {
                var f = Math.floor(i / porFila), c = i % porFila;
                var enFila = f === filas - 1 ? n - porFila * (filas - 1) : porFila;
                var paso = Math.min(L.tam * 1.35, disp / Math.max(porFila, 1));
                var ini = x0 + (disp - paso * (enFila - 1)) / 2;
                out.push({ x: ini + c * paso, y: L.suelo - L.tam * (0.6 + f * 1.4) });
            }
            return out;
        },

        ubicarCosas: function () {
            var self = this;
            var lug = this.lugares(this.cosas.length);
            this.cosas.forEach(function (a, i) {
                if (!a.cont.active) return;
                a.casa = { x: lug[i].x, y: lug[i].y };
                if (!a.usada && !(self.arrastrando && self.arrastrando.a === a)) a.cont.setPosition(lug[i].x, lug[i].y);
            });
        },

        crearBloque: function (id, i, lug) {
            var t = this.L.tam;
            var a = this.crearCosa(id, lug.x, lug.y - 80, t * 0.66, { depth: 30, sinSombra: true });
            var col = COLORES[i % COLORES.length];
            var g = this.add.graphics();
            g.fillStyle(0x000000, 0.22); g.fillRoundedRect(-t * 0.48 + 3, -t * 0.48 + 6, t * 0.96, t * 0.96, 8);
            g.fillStyle(col, 1); g.fillRoundedRect(-t * 0.48, -t * 0.48, t * 0.96, t * 0.96, 8);
            g.fillStyle(0xffffff, 0.92); g.fillRoundedRect(-t * 0.38, -t * 0.38, t * 0.76, t * 0.76, 6);
            g.lineStyle(3, 0x000000, 0.15); g.strokeRoundedRect(-t * 0.48, -t * 0.48, t * 0.96, t * 0.96, 8);
            var luz = this.add.graphics(); luz.fillStyle(0xffd43b, 1); luz.fillRoundedRect(-t * 0.48, -t * 0.48, t * 0.96, t * 0.96, 8); luz.setAlpha(0);
            a.cont.addAt(g, 0); a.cont.addAt(luz, 1);
            a.luz = luz; a.col = col; a.tam = t; a.casa = { x: lug.x, y: lug.y }; a.prof = 30; a.fase2 = Math.random() * 6;
            a.cont.setAlpha(0);
            return a;
        },

        mostrarOpciones: async function (nv) {
            var self = this;
            var lug = this.lugares(nv.opciones.length);
            this.cosas = nv.opciones.map(function (id, i) { return self.crearBloque(id, i, lug[i]); });
            K.ruido({ f: 900, q: 1, dur: 0.1, vol: 0.05 });
            await Promise.all(this.cosas.map(function (a, i) {
                return esperar(self, i * 100).then(function () { return tw(self, { targets: a.cont, alpha: 1, y: a.casa.y, duration: 340, ease: 'Bounce.easeOut' }); });
            }));
        },

        prepararNivel: async function (i, nv) {
            await this.retirar(this.cosas);
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.cosas = [];
            this.pisos = [];
            this.bandera = 0;
            this.nPisos = nv.reproducciones[0].length;
        },

        alSonar: function (id, k) {
            this.lampOn = k;
            this.lampT = this.time.now;
            K.tono({ f: 500 + k * 90, dur: 0.06, vol: 0.04 });
        },

        /* ── Arrastrar bloques a la torre ── */

        alTocar: function (p) {
            if (this.fase !== 'jugar') return;
            if (!this.tomar(p, this.cosas.filter(function (a) { return !a.usada; }))) {
                var b = this.cosaEn(this.cosas, p.x, p.y);
                if (b && !this.sonando) this.sonar(b.id, { breve: true, bocina: false });
            }
        },

        alMover: function (p) {
            this.llevar(p);
        },

        sobreTorre: function (a) {
            var L = this.L;
            return Math.abs(a.cont.x - L.tx) < L.tam * 1.2 && a.cont.y < L.suelo && a.cont.y > L.suelo - L.tam * (this.nPisos + 1.2);
        },

        alSoltar: async function () {
            var a = this.soltar();
            if (!a) return;
            if (this.fase !== 'jugar' || !this.sobreTorre(a)) { this.aCasa(a, true); return; }
            this.tocado = a;
            var r = await this.tocarOrden(a, { x: a.cont.x, y: a.cont.y });
            if (r === 'mal') this.aCasa(a, true);
        },

        alMarcar: async function (id, k) {
            var a = this.tocado, d = this.pos(k);
            a.usada = true;
            a.cont.setDepth(35);
            this.pisos[k] = a;
            await this.saltarA(a.cont, d.x, d.y, { ms: 340, alto: 40 });
            this.temblor = 6 + k * 2;
            K.ruido({ f: 180, q: 0.8, dur: 0.12, vol: 0.12 });
            this.cameras.main.shake(90, 0.002);
            Ut.estallido(this, d.x, d.y + this.L.tam * 0.4, { n: 7, tex: 'humo', tam: 24, dist: 70, depth: 50 });
        },

        alFallar: async function () {
            var a = this.tocado;
            this.temblor = 10;
            K.tono({ f: 300, f2: 160, dur: 0.25, vol: 0.05 });
            if (a) await a.sacudir();
        },

        /** La torre se desarma sin daño: cada bloque cae rodando hasta su sitio. */
        alReiniciar: async function () {
            var self = this;
            var caen = [];
            for (var k = this.pisos.length - 1; k >= 0; k--) {
                var a = this.pisos[k];
                if (!a) continue;
                a.usada = false;
                a.cont.setDepth(30);
                K.ruido({ f: 300, q: 0.8, dur: 0.1, vol: 0.07 });
                caen.push(tw(this, { targets: a.cont, x: a.casa.x, y: a.casa.y, angle: 360, duration: 520, ease: 'Bounce.easeOut', onComplete: (function (q) { return function () { q.cont.angle = 0; }; })(a) }));
                await esperar(this, 90);
            }
            this.pisos = [];
            this.temblor = 0;
            await Promise.all(caen);
        },

        alAcertar: async function () {
            var nv = this.nv;
            for (var k = 0; k < nv.correctas.length; k++) {
                if (!this.sigue()) return;
                this.reunidos.push(nv.correctas[k]);
                var a = this.pisos[k];
                if (a) { a.luz.setAlpha(0.9); this.tweens.add({ targets: a.luz, alpha: 0.2, duration: 450 }); a.latir(); }
                await this.sonar(nv.correctas[k], { breve: true, bocina: false });
                await esperar(this, 90);
            }
            // Sube la bandera.
            K.tono({ f: 600, f2: 1200, dur: 0.4, vol: 0.05, tipo: 'triangle' });
            await tw(this, { targets: this, bandera: 1, duration: 700, ease: 'Back.easeOut' });
            var top = this.pos(nv.correctas.length - 1);
            Ut.estallido(this, top.x, top.y - this.L.tam, { n: 18, tex: 'estrella', tam: 28, dist: 200, depth: 70, sinTinte: true });
            Ut.confeti(this, 50);
            await esperar(this, 700);
        },

        alTerminarNivel: async function () {
            var self = this;
            await tw(this, { targets: this, bandera: 0, duration: 250 });
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

        escenaFinal: async function () {
            var self = this, L = this.L;
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.pisos.forEach(function (a) { if (a && a.cont.active) a.cont.destroy(); });
            this.cosas = []; this.pisos = [];
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; }).slice(0, 5);
            if (!ids.length) ids = ['tambor', 'pajaro', 'campana', 'perro', 'pelota'];
            this.nPisos = ids.length;
            for (var k = 0; k < ids.length; k++) {
                if (!this.sigue()) return;
                var d = this.pos(k);
                var a = this.crearBloque(ids[k], k, { x: d.x + L.tam * 2, y: d.y });
                a.cont.setAlpha(1).setPosition(L.der * 0.75, -60);
                this.pisos[k] = a;
                await this.saltarA(a.cont, d.x, d.y, { ms: 520, alto: 60 });
                this.temblor = 6 + k * 2;
                a.latir();
                await this.sonar(ids[k], { breve: true, bocina: false });
            }
            this.nv = { correctas: ids };
            K.tono({ f: 600, f2: 1200, dur: 0.4, vol: 0.05, tipo: 'triangle' });
            await tw(this, { targets: this, bandera: 1, duration: 700, ease: 'Back.easeOut' });
            Ut.estallido(this, L.tx, this.pos(ids.length - 1).y - L.tam, { n: 24, tex: 'estrella', tam: 30, dist: 240, depth: 70, sinTinte: true });
            Ut.confeti(this, 100);
            await esperar(this, 1400);
        },

        estadoExtra: function () {
            var self = this;
            return {
                cosas: this.cosas.filter(function (a) { return a.cont.active && !a.usada; }).map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y) }; }),
                torre: this.nPisos ? this.pos(this.marcadas ? this.marcadas.length : 0) : null, pisos: this.pisos.filter(Boolean).length
            };
        },

        paso: function (time, delta) {
            var L = this.L;
            this.temblor = Math.max(0, this.temblor - (delta || 16) / 120);
            var self = this;
            this.pisos.forEach(function (a, k) {
                if (!a || !a.cont.active || self.tweens.isTweening(a.cont)) return;
                var d = self.pos(k);
                a.cont.x = d.x + Math.sin(time / 55) * self.temblor * (k + 1) * 0.25;
                a.cont.y = d.y;
                a.cont.angle = Math.sin(time / 55) * self.temblor * 0.25;
            });
            // Bloques del suelo: se mecen suavemente.
            this.cosas.forEach(function (a) {
                if (!a.cont.active || a.usada || !a.casa || (self.arrastrando && self.arrastrando.a === a) || self.tweens.isTweening(a.cont)) return;
                a.cont.y = a.casa.y + Math.sin(time / 650 + a.fase2) * 3;
            });
            var g = this.planoG;
            if (g && g.active) {
                g.clear();
                // Plano de la torre: un hueco por piso (la lámpara se enciende al sonar).
                for (var k = 0; k < this.nPisos; k++) {
                    var d = this.pos(k);
                    var lleno = this.pisos[k];
                    var on = this.lampOn === k && time - (this.lampT || 0) < 450;
                    if (!lleno) {
                        g.lineStyle(4, on ? 0xffd43b : 0xffffff, on ? 1 : 0.55);
                        g.strokeRoundedRect(d.x - L.tam * 0.48, d.y - L.tam * 0.48, L.tam * 0.96, L.tam * 0.96, 8);
                        if (on) { g.fillStyle(0xffd43b, 0.4); g.fillRoundedRect(d.x - L.tam * 0.48, d.y - L.tam * 0.48, L.tam * 0.96, L.tam * 0.96, 8); }
                    }
                }
            }
            var gr = this.graG;
            if (gr && gr.active) {
                gr.clear();
                // Grúa de la obra, con su gancho que se balancea.
                var gx = L.der * 0.46, top = L.suelo - L.tam * 5.6;
                gr.lineStyle(10, 0xe67700, 1); gr.lineBetween(gx, L.suelo - 24, gx, top);
                gr.lineStyle(8, 0xe67700, 1); gr.lineBetween(gx - L.tam * 1.6, top, gx + L.tam * 0.6, top);
                gr.lineStyle(3, 0x343a40, 1);
                var hx = gx - L.tam * 1.2 + Math.sin(time / 1200) * 14;
                gr.lineBetween(hx, top, hx, top + L.tam * 0.9);
                gr.fillStyle(0x343a40, 1); gr.fillCircle(hx, top + L.tam * 0.95, 8);
            }
            var bg = this.banderaG;
            if (bg && bg.active) {
                bg.clear();
                if (this.bandera > 0.02 && this.nPisos) {
                    var tp = this.pos(this.nPisos - 1);
                    var by = tp.y - L.tam * 0.5, alto = L.tam * 1.2 * this.bandera;
                    bg.lineStyle(5, 0x6d4c41, 1); bg.lineBetween(tp.x, by, tp.x, by - alto);
                    bg.fillStyle(0xe03131, 1);
                    var onda = Math.sin(time / 160) * 6;
                    bg.fillTriangle(tp.x, by - alto, tp.x + L.tam * 0.7, by - alto + L.tam * 0.18 + onda, tp.x, by - alto + L.tam * 0.38);
                }
            }
        }
    };

    K.crear({ id: 'torre', fondo: '#a5d8ff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
