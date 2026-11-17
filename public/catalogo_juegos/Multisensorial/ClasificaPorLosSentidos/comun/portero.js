/**
 * «El portero del laboratorio» — Clasificación doble Vista vs. Oído (5-6 años).
 *
 * Una cinta transportadora lleva objetos sin parar. Arriba hay el tubo de la VISTA y abajo el del OÍDO.
 * El niño es el portero: toma cada objeto y lo suelta hacia arriba o hacia abajo, antes de que la cinta
 * lo deje caer. Los tubos se llenan con lo que acierta. Un error rebota a la cinta haciendo lo suyo.
 */
(function (global) {
    'use strict';

    var K = global.SentidosKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    var escena = {
        iniciar: function () {
            this.cinta = [];
            this.reunidos = [];
            this.llenado = {};
            this.ultimoSpawn = 0;
            this.sel = null;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.tam = Math.max(74, Math.min(104, H * 0.14));
            L.banda = { y: Math.round(H * 0.5), h: Math.round(L.tam * 0.55), x1: Math.round(L.der - 10) };
            var tw_ = Math.round(Math.min(560, L.der * 0.62)), th = Math.round(Math.max(84, Math.min(130, H * 0.17)));
            var cx = Math.round(L.der * 0.52);
            L.tubos = [{ x: cx, y: Math.round(H * 0.2), w: tw_, h: th }, { x: cx, y: Math.round(H * 0.82), w: tw_, h: th }];
            L.bocina = { x: -99, y: -99, r: 1 };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            this.montarVida(keep);
            this.fondoLab(keep, Math.round(L.H * 0.36));
            this.bandaG = keep(this.add.graphics().setDepth(10));
            this.tuboG = keep(this.add.graphics().setDepth(12));
            var self = this;
            var tubos = this.tubos();
            this.orgTubo = {};
            tubos.forEach(function (s, i) {
                var t = L.tubos[i];
                self.orgTubo[s] = self.organoNuevo(keep, s, t.x - t.w / 2 + t.h * 0.5, t.y, t.h * 0.46, 13);
            });
            this.pintarTubos();
            this.montarHud(keep);
            this.sembrarMotes(keep, 6, { x: 0, y: 0, w: L.W, h: L.H, depth: 8 }, 0xffffff);
        },

        pintarTubos: function () {
            var g = this.tuboG, L = this.L, self = this;
            if (!g || !g.active) return;
            g.clear();
            var meta = this.nv ? Math.max(1, this.nv.meta / 2) : 3;
            this.tubos().forEach(function (s, i) {
                self.pintarTubo(g, s, L.tubos[i], (self.llenado[s] || 0) / meta, self.sel === i);
            });
        },

        /* ── Cinta ── */

        velocidad: function () { return this.nv && !this.nv.demo ? 92 * this.nv.vel : 0; },
        visibles: function () { return this.cinta.filter(function (a) { return a.cont.active; }).map(function (a) { return a.id; }); },

        poner: function (id, x) {
            var L = this.L;
            var a = this.crearCosa(id, x, L.banda.y - L.tam * 0.3, L.tam, { depth: 30 });
            a.fase2 = Math.random() * 6;
            this.cinta.push(a);
            return a;
        },

        arrancar: async function (nv) {
            var L = this.L;
            this.cinta = [];
            this.ultimoSpawn = this.time.now;
            if (nv.demo) {
                for (var i = 0; i < nv.vis; i++) {
                    var id = this.sacar(this.visibles());
                    if (id) { var a = this.poner(id, L.der * (0.3 + 0.28 * i)); a.cont.setAlpha(0); tw(this, { targets: a.cont, alpha: 1, duration: 300 }); }
                }
                return;
            }
            var primero = this.sacar([]);
            if (primero) this.poner(primero, -L.tam * 0.5);
        },

        prepararNivel: async function () {
            await this.retirar(this.cinta);
            this.cinta = [];
            var self = this;
            this.llenado = {};
            this.tubos().forEach(function (s) { self.llenado[s] = 0; });
            this.pintarTubos();
        },

        alTerminarNivel: async function () {
            await this.retirar(this.cinta);
            this.cinta = [];
        },

        /* ── Portero: tomar y soltar arriba o abajo ── */

        alTocar: function (p) {
            if (this.fase !== 'jugar') return;
            var a = this.tomar(p, this.cinta.filter(function (f) { return !f.ocupada; }));
            if (a) a.agarrada = true;
        },

        tuboPara: function (y) {
            var b = this.L.banda;
            if (y < b.y - b.h * 0.9) return 0;
            if (y > b.y + b.h * 0.9) return 1;
            return -1;
        },

        alMover: function (p) {
            if (!this.arrastrando) return;
            this.llevar(p);
            var i = this.tuboPara(p.y);
            if (i !== this.sel) { this.sel = i; this.pintarTubos(); }
        },

        alSoltar: async function () {
            if (!this.arrastrando) return;
            var a = this.soltar();
            var i = this.sel != null ? this.sel : -1;
            this.sel = null;
            this.pintarTubos();
            if (!a) return;
            if (i < 0) { a.agarrada = false; var L = this.L; a.cont.y = L.banda.y - L.tam * 0.3; a.cont.setDepth(30); return; }
            await this.alTubo(a, i);
        },

        alTubo: async function (a, i) {
            var L = this.L, t = L.tubos[i], s = this.tubos()[i];
            a.ocupada = true; a.agarrada = true;
            var self = this;
            a.cont.setDepth(60);
            await this.saltarA(a.cont, t.x, t.y, { ms: 380, alto: 40, esc: 0.5 });
            if (this.sentidoDe(a.id) === s) {
                this.cinta = this.cinta.filter(function (f) { return f !== a; });
                this.llenado[s] = (this.llenado[s] || 0) + 1;
                this.pintarTubos();
                if (this.orgTubo[s]) this.orgTubo[s].reaccion('acierto');
                await tw(this, { targets: a.cont, alpha: 0, scale: 0.15, duration: 180 });
                if (a.cont.active) a.cont.destroy();
                await this.clasificar(a.id, s, { x: t.x, y: t.y + (i ? -t.h * 0.7 : t.h * 0.7) });
                return;
            }
            // no es de ese sentido: el tubo lo escupe de vuelta a la cinta
            if (this.orgTubo[s]) this.orgTubo[s].reaccion('error');
            await this.clasificar(a.id, s, { x: t.x, y: t.y + (i ? -t.h * 0.7 : t.h * 0.7) });
            if (!a.cont.active) return;
            a.cont.setScale(0.5);
            await this.saltarA(a.cont, Math.max(a.cont.x - 120, L.tam), L.banda.y - L.tam * 0.3, { ms: 520, alto: 60, esc: 1 });
            a.cont.setDepth(30);
            a.ocupada = false; a.agarrada = false;
        },

        alAcertar: async function () { this.cameras.main.shake(80, 0.002); },

        /* ── Ayudas ── */

        mostrarPista: function (cancelada) {
            if (this.fase !== 'jugar') return Promise.resolve();
            var tubos = this.tubos(), L = this.L, self = this;
            var a = this.cinta.filter(function (f) { return f.cont.active && !f.ocupada; }).sort(function (p, q) { return q.cont.x - p.cont.x; })[0];
            if (!a) return esperar(this, 900);
            var i = tubos.indexOf(this.sentidoDe(a.id));
            if (i < 0) return esperar(this, 900);
            this.tweens.add({ targets: a.cont, scale: 1.18, duration: 220, yoyo: true, repeat: 2 });
            if (!this.ayuda) return esperar(this, 900);
            return this.manoDe(cancelada, { x: a.cont.x, y: a.cont.y }, { x: a.cont.x, y: L.tubos[i].y });
        },

        demoPaso: function () {
            var self = this, tubos = this.tubos(), L = this.L;
            return this.cinta.slice(0, 2).map(function (a) {
                return function () {
                    var i = tubos.indexOf(self.sentidoDe(a.id));
                    if (i < 0 || !a.cont.active) return null;
                    return { desde: { x: a.cont.x, y: a.cont.y }, hasta: { x: a.cont.x, y: L.tubos[i].y }, hacer: function () { return self.alTubo(a, i); } };
                };
            });
        },

        /* ── Final: los dos tubos se llenan y los objetos desfilan ── */

        escenaFinal: async function () {
            var self = this, L = this.L;
            await this.retirar(this.cinta);
            this.cinta = [];
            var tubos = this.tubos();
            tubos.forEach(function (s) { self.llenado[s] = 99; });
            this.pintarTubos();
            var ids = this.reunidosUnicos(6).map(function (r) { return r.id; });
            if (!ids.length) ids = ['sol', 'campana', 'arcoiris', 'tambor'];
            var lug = ids.map(function (id, i) { return { x: L.der * (0.12 + 0.76 * (i + 0.5) / ids.length), y: L.banda.y - L.tam * 0.3 }; });
            await this.celebrarObjetos(ids, lug, L.tam);
            tubos.forEach(function (s, i) { Ut.estallido(self, L.tubos[i].x, L.tubos[i].y, { n: 18, tex: 'estrella', tam: 30, dist: 170, depth: 85, sinTinte: true }); });
            K.efecto(this, 'celebracion');
            Ut.confeti(this, 90);
            await esperar(this, 1400);
        },

        estadoExtra: function () {
            var L = this.L;
            return {
                tubos: L.tubos.map(function (t) { return { x: Math.round(t.x), y: Math.round(t.y) }; }),
                banda: { y: Math.round(L.banda.y) },
                cinta: this.cinta.filter(function (a) { return a.cont.active; }).map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y), ocupada: !!a.ocupada }; })
            };
        },

        paso: function (time, dt) {
            var L = this.L, self = this, b = L.banda;
            var sec = Math.min(0.05, (dt || 16) / 1000);
            var v = this.velocidad();
            var g = this.bandaG;
            if (g && g.active) {
                g.clear();
                g.fillStyle(0x000000, 0.18); g.fillRoundedRect(0, b.y + b.h * 0.5, b.x1 + 10, 14, 7);
                g.fillStyle(0x495057, 1); g.fillRoundedRect(0, b.y - b.h * 0.5, b.x1 + 10, b.h, b.h * 0.4);
                g.lineStyle(4, 0x868e96, 1);
                var off = (time * (v || 40) / 1000) % 36;
                for (var x = -36 + off; x < b.x1; x += 36) g.lineBetween(x, b.y - b.h * 0.42, x + 14, b.y + b.h * 0.42);
                g.fillStyle(0xffd43b, 1); g.fillRect(0, b.y - b.h * 0.5, b.x1 + 10, 5);
                g.fillStyle(0xadb5bd, 1); g.fillCircle(b.x1 + 6, b.y, b.h * 0.55); g.fillCircle(2, b.y, b.h * 0.55);
            }
            this.cinta.forEach(function (a) {
                if (!a.cont.active || a.agarrada || a.ocupada) return;
                a.cont.x += v * sec;
                a.cont.y = b.y - L.tam * 0.3 + Math.sin(time / 300 + a.fase2) * 2;
                if (a.cont.x > b.x1 - L.tam * 0.25) self.caeDeLaCinta(a);
            });
            var nv = this.nv;
            if (nv && !nv.demo && this.fase === 'jugar') {
                var n = this.cinta.filter(function (a) { return a.cont.active; }).length;
                var ult = Math.min.apply(null, [9999].concat(this.cinta.filter(function (a) { return a.cont.active; }).map(function (a) { return a.cont.x; })));
                if (n < nv.vis && ult > L.tam * 1.7 && time - this.ultimoSpawn > 650 / nv.vel) {
                    var id = this.sacar(this.visibles());
                    if (id) { this.ultimoSpawn = time; this.poner(id, -L.tam * 0.5); }
                }
            }
        },

        caeDeLaCinta: function (a) {
            if (a.cae) return;
            a.cae = true; a.ocupada = true;
            this.cinta = this.cinta.filter(function (f) { return f !== a; });
            K.efecto(this, 'suave');
            tw(this, { targets: a.cont, y: a.cont.y + 120, x: a.cont.x + 40, angle: 70, alpha: 0, duration: 600, ease: 'Quad.easeIn' }).then(function () { if (a.cont.active) a.cont.destroy(); });
        }
    };

    K.crear({ id: 'portero', fondo: '#d0ebff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
