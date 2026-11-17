/**
 * «El ascensor de aromas y sabores» — Clasificación doble Olfato vs. Gusto (5-6 años).
 *
 * Los objetos llegan en fila por una cinta hasta la puerta de un ascensor. El niño SUBE la cabina (arrastrándola
 * hacia arriba) para lo que se huele —piso de la nariz— o la BAJA para lo que se saborea —piso de la boca—.
 * Si el objeto era del otro sentido, la puerta no abre: se queda en la cabina haciendo lo suyo y el ascensor vuelve al medio.
 */
(function (global) {
    'use strict';

    var K = global.SentidosKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    var escena = {
        iniciar: function () {
            this.fila = [];
            this.ocupante = null;
            this.reunidos = [];
            this.llenado = {};
            this.ultimoSpawn = 0;
            this.cab = { y: 0, arr: null };
            this.moviendo = false;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.tam = Math.max(70, Math.min(100, H * 0.135));
            L.cab = { x: Math.round(L.der * 0.4), w: Math.round(L.tam * 1.55), h: Math.round(L.tam * 1.55) };
            L.pisos = { arriba: Math.round(H * 0.22), medio: Math.round(H * 0.52), abajo: Math.round(H * 0.82) };
            var th = Math.round(Math.max(84, Math.min(124, H * 0.16)));
            var tx = Math.round(L.cab.x + L.cab.w * 0.5 + 40 + Math.min(220, L.der * 0.2));
            var tww = Math.round(Math.min(380, L.der - tx - 20) * 1);
            L.tubos = [{ x: tx + tww / 2 - 10, y: L.pisos.arriba, w: tww, h: th }, { x: tx + tww / 2 - 10, y: L.pisos.abajo, w: tww, h: th }];
            L.bocina = { x: -99, y: -99, r: 1 };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            this.montarVida(keep);
            this.fondoLab(keep, Math.round(L.H * 0.9), 0xe3fafc);
            var g = keep(this.add.graphics().setDepth(2));
            // Pozo del ascensor y banda del piso medio.
            g.fillStyle(0x495057, 1); g.fillRect(L.cab.x - L.cab.w * 0.62, L.pisos.arriba - L.cab.h * 0.7, L.cab.w * 1.24, L.pisos.abajo - L.pisos.arriba + L.cab.h * 1.4);
            g.fillStyle(0x343a40, 1); g.fillRect(L.cab.x - L.cab.w * 0.55, L.pisos.arriba - L.cab.h * 0.65, L.cab.w * 1.1, L.pisos.abajo - L.pisos.arriba + L.cab.h * 1.3);
            g.fillStyle(0x495057, 1); g.fillRoundedRect(0, L.pisos.medio + L.cab.h * 0.5 - 10, L.cab.x - L.cab.w * 0.55, 22, 10);
            g.lineStyle(4, 0x868e96, 1);
            for (var x = 6; x < L.cab.x - L.cab.w * 0.6; x += 30) g.lineBetween(x, L.pisos.medio + L.cab.h * 0.5 - 8, x + 12, L.pisos.medio + L.cab.h * 0.5 + 10);
            // Pasillos hacia cada piso.
            var self = this;
            [L.pisos.arriba, L.pisos.abajo].forEach(function (y) {
                g.fillStyle(0xadb5bd, 1); g.fillRect(L.cab.x + L.cab.w * 0.55, y + L.cab.h * 0.5 - 8, L.der - L.cab.x, 12);
            });
            this.cableG = keep(this.add.graphics().setDepth(3));
            this.cabG = keep(this.add.graphics().setDepth(6));
            this.tuboG = keep(this.add.graphics().setDepth(12));
            var tubos = this.tubos();
            this.orgTubo = {};
            tubos.forEach(function (s, i) {
                var t = L.tubos[i];
                self.orgTubo[s] = self.organoNuevo(keep, s, t.x - t.w / 2 + t.h * 0.5, t.y, t.h * 0.46, 13);
            });
            this.pintarTubos();
            this.montarHud(keep);
            if (!this.cab.y) this.cab.y = L.pisos.medio;
            else this.cab.y = Math.max(L.pisos.arriba, Math.min(L.pisos.abajo, this.cab.y));
            this.sembrarMotes(keep, 6, { x: 0, y: 0, w: L.W, h: L.H, depth: 8 }, 0xffffff);
        },

        pintarTubos: function () {
            var g = this.tuboG, L = this.L, self = this;
            if (!g || !g.active) return;
            g.clear();
            var meta = this.nv ? Math.max(1, this.nv.meta / 2) : 3;
            this.tubos().forEach(function (s, i) {
                var sel = self.cab.destino === i;
                self.pintarTubo(g, s, L.tubos[i], (self.llenado[s] || 0) / meta, sel);
            });
        },

        /* ── Fila de objetos ── */

        visibles: function () {
            var ids = this.fila.filter(function (a) { return a.cont.active; }).map(function (a) { return a.id; });
            if (this.ocupante && this.ocupante.cont.active) ids.push(this.ocupante.id);
            return ids;
        },

        cuenta: function () { return this.fila.filter(function (a) { return a.cont.active; }).length + (this.ocupante ? 1 : 0); },

        xFila: function (k) { var L = this.L; return L.cab.x - L.cab.w * 0.62 - L.tam * 0.7 - k * L.tam * 1.08; },

        poner: function (id) {
            var L = this.L;
            var a = this.crearCosa(id, -L.tam, L.pisos.medio + L.cab.h * 0.5 - L.tam * 0.5, L.tam, { depth: 30 });
            a.fase2 = Math.random() * 6;
            this.fila.push(a);
            return a;
        },

        arrancar: async function (nv) {
            this.fila = [];
            this.ocupante = null;
            this.cab.y = this.L.pisos.medio;
            this.ultimoSpawn = this.time.now;
            for (var i = 0; i < nv.vis; i++) {
                var id = this.sacar(this.visibles());
                if (id) this.poner(id);
                await esperar(this, 350);
            }
        },

        prepararNivel: async function () {
            await this.retirar(this.fila);
            if (this.ocupante && this.ocupante.cont.active) this.ocupante.cont.destroy();
            this.fila = []; this.ocupante = null;
            this.cab.y = this.L.pisos.medio; this.cab.destino = null;
            var self = this;
            this.llenado = {};
            this.tubos().forEach(function (s) { self.llenado[s] = 0; });
            this.pintarTubos();
        },

        alTerminarNivel: async function () {
            await this.retirar(this.fila.concat(this.ocupante ? [this.ocupante] : []));
            this.fila = []; this.ocupante = null;
            await tw(this, { targets: this.cab, y: this.L.pisos.medio, duration: 300 });
        },

        /* ── Manejar la cabina ── */

        enCabina: function (p) {
            var L = this.L;
            return Math.abs(p.x - L.cab.x) < L.cab.w * 0.7 && Math.abs(p.y - this.cab.y) < L.cab.h * 0.75;
        },

        alTocar: function (p) {
            if (this.fase !== 'jugar' || this.moviendo) return;
            // un toque en un piso también manda el ascensor (para los más pequeños)
            var L = this.L, self = this;
            for (var i = 0; i < 2; i++) {
                var t = L.tubos[i];
                if (Math.abs(p.x - t.x) < t.w / 2 && Math.abs(p.y - t.y) < t.h / 2 && this.ocupante) { this.irA(i); return; }
            }
            if (this.enCabina(p)) { this.cab.arr = { dy: this.cab.y - p.y }; this.pista.reiniciar(); }
        },

        alMover: function (p) {
            if (!this.cab.arr || this.moviendo) return;
            var L = this.L;
            this.cab.y = Math.max(L.pisos.arriba, Math.min(L.pisos.abajo, p.y + this.cab.arr.dy));
            var rango = (L.pisos.abajo - L.pisos.arriba) / 2;
            var d = (this.cab.y - L.pisos.medio) / rango;
            var nuevo = d < -0.3 ? 0 : (d > 0.3 ? 1 : null);
            if (nuevo !== this.cab.destino) { this.cab.destino = nuevo; this.pintarTubos(); }
        },

        alSoltar: function () {
            if (!this.cab.arr) return;
            this.cab.arr = null;
            var d = this.cab.destino;
            this.cab.destino = null;
            this.pintarTubos();
            if (d != null && this.ocupante) this.irA(d);
            else this.volverAlMedio();
        },

        volverAlMedio: function () {
            return tw(this, { targets: this.cab, y: this.L.pisos.medio, duration: 420, ease: 'Sine.easeInOut' });
        },

        irA: async function (i) {
            if (this.moviendo || !this.ocupante || this.fase !== 'jugar') return;
            this.moviendo = true;
            var L = this.L, a = this.ocupante, s = this.tubos()[i], t = L.tubos[i];
            K.efecto(this, 'motor');
            await tw(this, { targets: this.cab, y: i === 0 ? L.pisos.arriba : L.pisos.abajo, duration: 650, ease: 'Sine.easeInOut' });
            K.efecto(this, 'ding');
            if (this.sentidoDe(a.id) === s) {
                this.ocupante = null;
                a.cont.setDepth(60);
                await this.saltarA(a.cont, t.x - t.w * 0.2, t.y, { ms: 420, alto: 40, esc: 0.5 });
                this.llenado[s] = (this.llenado[s] || 0) + 1;
                this.pintarTubos();
                if (this.orgTubo[s]) this.orgTubo[s].reaccion('acierto');
                await tw(this, { targets: a.cont, alpha: 0, scale: 0.15, duration: 180 });
                if (a.cont.active) a.cont.destroy();
                await this.clasificar(a.id, s, { x: t.x, y: t.y + (i ? -t.h * 0.7 : t.h * 0.7) });
            } else {
                // la puerta no abre: se queda haciendo lo suyo y el ascensor vuelve al medio
                if (this.orgTubo[s]) this.orgTubo[s].reaccion('error');
                tw(this, { targets: a.cont, angle: { from: -12, to: 12 }, duration: 80, yoyo: true, repeat: 3, onComplete: function () { a.cont.angle = 0; } });
                await this.clasificar(a.id, s, { x: L.cab.x + L.cab.w * 0.7, y: this.cab.y });
                await this.volverAlMedio();
            }
            this.moviendo = false;
        },

        alAcertar: async function () { this.cameras.main.shake(80, 0.002); await this.volverAlMedio(); },

        /* ── Ayudas ── */

        mostrarPista: function (cancelada) {
            if (this.fase !== 'jugar') return Promise.resolve();
            var a = this.ocupante;
            if (!a) return esperar(this, 700);
            var L = this.L, i = this.tubos().indexOf(this.sentidoDe(a.id));
            this.tweens.add({ targets: a.cont, scale: 1.15, duration: 220, yoyo: true, repeat: 2 });
            if (!this.ayuda || i < 0) return esperar(this, 900);
            return this.manoDe(cancelada, { x: L.cab.x, y: this.cab.y }, { x: L.cab.x, y: i === 0 ? L.pisos.arriba : L.pisos.abajo });
        },

        demoPaso: function () {
            var self = this, L = this.L;
            return [0, 1].map(function (k) {
                return function () {
                    var a = self.ocupante;
                    if (!a) return null;
                    var i = self.tubos().indexOf(self.sentidoDe(a.id));
                    if (i < 0) return null;
                    return { desde: { x: L.cab.x, y: L.pisos.medio }, hasta: { x: L.cab.x, y: i === 0 ? L.pisos.arriba : L.pisos.abajo }, hacer: async function () { await self.irA(i); await esperar(self, 500); } };
                };
            });
        },

        /* ── Final: el ascensor reparte todo lo reunido ── */

        escenaFinal: async function () {
            var self = this, L = this.L;
            await this.retirar(this.fila.concat(this.ocupante ? [this.ocupante] : []));
            this.fila = []; this.ocupante = null;
            var tubos = this.tubos();
            var rs = this.reunidosUnicos(4);
            if (!rs.length) rs = [{ id: 'rosa' }, { id: 'fresa' }];
            for (var k = 0; k < rs.length; k++) {
                if (!this.sigue()) return;
                var id = rs[k].id, s = this.sentidoDe(id), i = tubos.indexOf(s);
                if (i < 0) continue;
                var a = this.crearCosa(id, L.cab.x, this.cab.y, L.tam, { depth: 30 });
                a.cont.setScale(0);
                await tw(this, { targets: a.cont, scale: 1, duration: 220, ease: 'Back.easeOut' });
                var meta = i === 0 ? L.pisos.arriba : L.pisos.abajo;
                await Promise.all([tw(this, { targets: this.cab, y: meta, duration: 520, ease: 'Sine.easeInOut' }), tw(this, { targets: a.cont, y: meta, duration: 520, ease: 'Sine.easeInOut' })]);
                this.propiedad(id, { x: L.cab.x + L.cab.w * 0.6, y: meta }, { etiqueta: false });
                if (this.orgTubo[s]) this.orgTubo[s].reaccion('acierto');
                this.llenado[s] = (this.llenado[s] || 0) + 1;
                this.pintarTubos();
                await tw(this, { targets: a.cont, x: L.tubos[i].x - L.tubos[i].w * 0.2, alpha: 0, scale: 0.3, duration: 360 });
                a.cont.destroy();
            }
            tubos.forEach(function (s, i) { self.llenado[s] = 99; });
            this.pintarTubos();
            tubos.forEach(function (s, i) { Ut.estallido(self, L.tubos[i].x, L.tubos[i].y, { n: 16, tex: 'estrella', tam: 30, dist: 160, depth: 85, sinTinte: true }); });
            await this.volverAlMedio();
            K.efecto(this, 'celebracion');
            Ut.confeti(this, 90);
            await esperar(this, 1400);
        },

        estadoExtra: function () {
            var L = this.L;
            return {
                cabina: { x: Math.round(L.cab.x), y: Math.round(this.cab.y) },
                pisos: { arriba: L.pisos.arriba, medio: L.pisos.medio, abajo: L.pisos.abajo },
                tubos: L.tubos.map(function (t) { return { x: Math.round(t.x), y: Math.round(t.y) }; }),
                ocupante: this.ocupante && this.ocupante.cont.active ? this.ocupante.id : null,
                fila: this.fila.filter(function (a) { return a.cont.active; }).map(function (a) { return a.id; })
            };
        },

        paso: function (time, dt) {
            var L = this.L, self = this;
            var sec = Math.min(0.05, (dt || 16) / 1000);
            var cab = this.cab;
            // cables y cabina
            var c = this.cableG;
            if (c && c.active) {
                c.clear();
                c.lineStyle(4, 0xced4da, 1);
                c.lineBetween(L.cab.x - 14, L.pisos.arriba - L.cab.h * 0.65, L.cab.x - 14, cab.y - L.cab.h / 2);
                c.lineBetween(L.cab.x + 14, L.pisos.arriba - L.cab.h * 0.65, L.cab.x + 14, cab.y - L.cab.h / 2);
            }
            var g = this.cabG;
            if (g && g.active) {
                g.clear();
                var x = L.cab.x - L.cab.w / 2, y = cab.y - L.cab.h / 2;
                g.fillStyle(0xe7f5ff, 0.95); g.fillRoundedRect(x, y, L.cab.w, L.cab.h, 12);
                g.fillStyle(0xa5d8ff, 0.55); g.fillRect(x + 8, y + 8, L.cab.w - 16, L.cab.h - 16);
                g.lineStyle(7, this.cab.arr ? 0xffd43b : 0x868e96, 1); g.strokeRoundedRect(x, y, L.cab.w, L.cab.h, 12);
                g.fillStyle(0xffffff, 0.35); g.fillRect(x + 14, y + 12, 10, L.cab.h - 30);
                g.fillStyle(0xffd43b, 1);
                var fl = 14;
                g.fillTriangle(L.cab.x - fl, y - 10, L.cab.x + fl, y - 10, L.cab.x, y - 10 - fl * 1.4);
                g.fillTriangle(L.cab.x - fl, y + L.cab.h + 10, L.cab.x + fl, y + L.cab.h + 10, L.cab.x, y + L.cab.h + 10 + fl * 1.4);
            }
            // el ocupante viaja con la cabina; los demás avanzan en fila
            var oc = this.ocupante;
            if (oc && oc.cont.active && !this.entrando && !oc.saliendo && oc.cont.depth < 50) oc.cont.setPosition(L.cab.x, cab.y + L.cab.h * 0.1);
            this.fila.forEach(function (a, k) {
                if (!a.cont.active) return;
                var tx = self.xFila(k);
                a.cont.x += (tx - a.cont.x) * Math.min(1, sec * 4.5);
                a.cont.y = L.pisos.medio + L.cab.h * 0.5 - L.tam * 0.5 + Math.sin(time / 400 + a.fase2) * 2;
            });
            if (!oc && this.fila.length && this.fase !== 'premio' && (this.fase === 'jugar')) {
                var a = this.fila[0];
                if (Math.abs(a.cont.x - this.xFila(0)) < 8 || a.cont.x > this.xFila(0) - 10) this.entraCabina();
            }
            var nv = this.nv;
            if (nv && !nv.demo && this.fase === 'jugar') {
                if (this.cuenta() < nv.vis && time - this.ultimoSpawn > 1000 / nv.vel) {
                    var id = this.sacar(this.visibles());
                    if (id) { this.ultimoSpawn = time; this.poner(id); }
                }
            }
        },

        entraCabina: async function () {
            if (this.ocupante || this.entrando || !this.fila.length || this.moviendo) return;
            this.entrando = true;
            var a = this.fila.shift();
            this.ocupante = a;
            a.cont.setDepth(7);
            var L = this.L;
            await tw(this, { targets: a.cont, x: L.cab.x, y: this.cab.y + L.cab.h * 0.1, duration: 380, ease: 'Sine.easeOut' });
            K.efecto(this, 'pop');
            this.entrando = false;
        }
    };

    K.crear({ id: 'ascensor', fondo: '#e3fafc', escena: escena });
})(typeof window !== 'undefined' ? window : this);
