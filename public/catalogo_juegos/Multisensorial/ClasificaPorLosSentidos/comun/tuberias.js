/**
 * «Tuberías de luz» — Múltiple discriminación Tacto vs. Olfato vs. Oído (5-6 años).
 *
 * A la izquierda esperan objetos sobre sus plataformas; a la derecha, tres tubos (tacto, olfato, oído).
 * El niño DIBUJA con el dedo la tubería: parte del objeto y termina dentro del tubo de su sentido. Si acierta,
 * la luz recorre el camino dibujado y el objeto viaja por él hasta el tubo; si no, la tubería se apaga, el objeto
 * hace lo suyo (raspa, suena, huele) y se puede intentar otra vez.
 */
(function (global) {
    'use strict';

    var K = global.SentidosKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    var escena = {
        iniciar: function () {
            this.puestos = [];
            this.reunidos = [];
            this.llenado = {};
            this.trazo = null;
            this.trazos = [];
            this.hover = -1;
            this.ultimoSpawn = 0;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.tam = Math.max(70, Math.min(100, H * 0.135));
            var th = Math.round(Math.max(80, Math.min(120, H * 0.15)));
            var tww = Math.round(Math.min(420, L.der * 0.32));
            var tx = Math.round(L.der - tww / 2 - 14);
            L.tubos = [0.2, 0.5, 0.8].map(function (f) { return { x: tx, y: Math.round(H * f), w: tww, h: th }; });
            L.puestos = [0.24, 0.5, 0.76].map(function (f) { return { x: Math.round(Math.max(90, W * 0.11)), y: Math.round(H * f) }; });
            L.bocina = { x: -99, y: -99, r: 1 };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            this.montarVida(keep);
            var fondo = this.fondoLab(keep, Math.round(L.H * 0.9), 0xd0bfff);
            var g = keep(this.add.graphics().setDepth(2));
            g.fillStyle(0x7048e8, 0.12); g.fillRoundedRect(L.W * 0.03, L.H * 0.1, L.W * 0.17, L.H * 0.8, 24);
            var self = this;
            L.puestos.slice(0, 3).forEach(function (p) {
                g.fillStyle(0xffffff, 0.5); g.fillEllipse(p.x, p.y + L.tam * 0.52, L.tam * 1.5, L.tam * 0.3);
                g.lineStyle(5, 0x9775fa, 1); g.strokeEllipse(p.x, p.y + L.tam * 0.52, L.tam * 1.5, L.tam * 0.3);
            });
            this.trazoG = keep(this.add.graphics().setDepth(22));
            this.tuboG = keep(this.add.graphics().setDepth(12));
            var tubos = this.tubos();
            this.orgTubo = {};
            tubos.forEach(function (s, i) {
                var t = L.tubos[i];
                self.orgTubo[s] = self.organoNuevo(keep, s, t.x - t.w / 2 + t.h * 0.5, t.y, t.h * 0.46, 13);
            });
            this.pintarTubos();
            this.montarHud(keep);
            this.puestos.forEach(function (pu, i) { if (pu.a && pu.a.cont.active && !pu.a.ocupada) pu.a.cont.setPosition(L.puestos[i].x, L.puestos[i].y); });
            this.sembrarMotes(keep, 6, { x: 0, y: 0, w: L.W, h: L.H, depth: 8 }, 0xffffff);
        },

        pintarTubos: function () {
            var g = this.tuboG, L = this.L, self = this;
            if (!g || !g.active) return;
            g.clear();
            var meta = this.nv ? Math.max(1, this.nv.meta / 3) : 2;
            this.tubos().forEach(function (s, i) { self.pintarTubo(g, s, L.tubos[i], (self.llenado[s] || 0) / meta, self.hover === i); });
        },

        /* ── Objetos en sus plataformas ── */

        visibles: function () { return this.puestos.filter(function (p) { return p.a && p.a.cont.active; }).map(function (p) { return p.a.id; }); },

        poner: function (i, id) {
            var L = this.L;
            var a = this.crearCosa(id, L.puestos[i].x, L.puestos[i].y, L.tam, { depth: 30 });
            a.fase2 = Math.random() * 6; a.puesto = i;
            this.puestos[i].a = a;
            a.cont.setScale(0);
            tw(this, { targets: a.cont, scale: 1, duration: 380, ease: 'Back.easeOut' });
            K.ruido({ f: 1100, q: 1, dur: 0.08, vol: 0.05 });
            return a;
        },

        arrancar: async function (nv) {
            this.puestos = [{ a: null, libre: 0 }, { a: null, libre: 0 }, { a: null, libre: 0 }];
            this.ultimoSpawn = this.time.now;
            var orden = nv.vis === 1 ? [1] : (nv.vis === 2 ? [0, 2] : [0, 1, 2]);
            for (var k = 0; k < orden.length; k++) {
                var id = this.sacar(this.visibles());
                if (id) this.poner(orden[k], id);
                await esperar(this, 250);
            }
            this.puestosActivos = orden;
        },

        prepararNivel: async function () {
            var viejos = this.puestos.map(function (p) { return p.a; }).filter(function (a) { return a && a.cont.active; });
            await this.retirar(viejos);
            this.puestos = [{ a: null, libre: 0 }, { a: null, libre: 0 }, { a: null, libre: 0 }];
            this.trazos = []; this.trazo = null;
            var self = this;
            this.llenado = {};
            this.tubos().forEach(function (s) { self.llenado[s] = 0; });
            this.pintarTubos();
        },

        alTerminarNivel: async function () {
            var viejos = this.puestos.map(function (p) { return p.a; }).filter(function (a) { return a && a.cont.active; });
            await this.retirar(viejos);
            this.puestos = [{ a: null, libre: 0 }, { a: null, libre: 0 }, { a: null, libre: 0 }];
            this.trazos = []; this.trazo = null;
        },

        /* ── Dibujar la tubería ── */

        tuboEn: function (x, y) {
            var L = this.L;
            for (var i = 0; i < L.tubos.length; i++) {
                var t = L.tubos[i];
                if (Math.abs(x - t.x) < t.w / 2 + 14 && Math.abs(y - t.y) < t.h / 2 + 14) return i;
            }
            return -1;
        },

        alTocar: function (p) {
            if (this.fase !== 'jugar' || this.trazo) return;
            var self = this;
            var a = this.cosaEn(this.puestos.map(function (q) { return q.a; }).filter(function (q) { return q && !q.ocupada; }), p.x, p.y, this.L.tam * 0.75);
            if (!a) return;
            this.trazo = { a: a, pts: [{ x: a.cont.x, y: a.cont.y }, { x: p.x, y: p.y }], t0: this.time.now };
            this.tweens.add({ targets: a.cont, scale: 1.12, duration: 100 });
            K.tono({ f: 760, dur: 0.05, vol: 0.04 });
            this.pista.reiniciar();
        },

        alMover: function (p) {
            var t = this.trazo;
            if (!t) return;
            var u = t.pts[t.pts.length - 1];
            if (Math.hypot(p.x - u.x, p.y - u.y) > 9) t.pts.push({ x: p.x, y: p.y });
            var h = this.tuboEn(p.x, p.y);
            if (h !== this.hover) { this.hover = h; this.pintarTubos(); }
        },

        alSoltar: async function (p) {
            var t = this.trazo;
            if (!t) return;
            this.trazo = null;
            var ult = t.pts[t.pts.length - 1];
            var i = this.tuboEn(ult.x, ult.y);
            this.hover = -1;
            this.pintarTubos();
            this.tweens.add({ targets: t.a.cont, scale: 1, duration: 100 });
            if (i < 0) {                    // se soltó sin llegar a un tubo: la tubería se apaga
                this.trazos.push({ pts: t.pts, color: 0xced4da, vida: 500, t0: this.time.now });
                return;
            }
            await this.conectar(t.a, t.pts, i);
        },

        conectar: async function (a, pts, i) {
            if (!a.cont.active || a.ocupada) return;
            var L = this.L, s = this.tubos()[i], tubo = L.tubos[i];
            a.ocupada = true;
            var bien = this.sentidoDe(a.id) === s;
            var tr = { pts: pts, color: bien ? this.colorDe(s) : 0xff8787, vida: 99999, t0: this.time.now };
            this.trazos.push(tr);
            // el objeto viaja por la tubería dibujada
            var largo = 0, tramos = [];
            for (var k = 1; k < pts.length; k++) { var d = Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y); largo += d; tramos.push(largo); }
            a.cont.setDepth(60);
            K.efecto(this, bien ? 'whoosh' : 'suave');
            var prog = { k: 0 };
            var lim = bien ? 1 : 0.55;
            await tw(this, {
                targets: prog, k: lim, duration: Math.max(500, Math.min(1400, largo * 2.2)), ease: 'Sine.easeInOut',
                onUpdate: function () {
                    var m = prog.k * largo, j = 0;
                    while (j < tramos.length - 1 && tramos[j] < m) j++;
                    var a0 = j === 0 ? 0 : tramos[j - 1], f = (m - a0) / ((tramos[j] - a0) || 1);
                    var p0 = pts[j], p1 = pts[j + 1] || pts[j];
                    a.cont.setPosition(p0.x + (p1.x - p0.x) * f, p0.y + (p1.y - p0.y) * f);
                    tr.luz = { x: a.cont.x, y: a.cont.y };
                }
            });
            tr.luz = null;
            if (bien) {
                this.llenado[s] = (this.llenado[s] || 0) + 1;
                this.pintarTubos();
                if (this.orgTubo[s]) this.orgTubo[s].reaccion('acierto');
                this.puestos[a.puesto].a = null;
                this.puestos[a.puesto].libre = this.time.now;
                await tw(this, { targets: a.cont, alpha: 0, scale: 0.15, duration: 180 });
                if (a.cont.active) a.cont.destroy();
                tr.vida = 700; tr.t0 = this.time.now;
                await this.clasificar(a.id, s, { x: tubo.x, y: tubo.y + (i === 2 ? -tubo.h * 0.7 : tubo.h * 0.7) });
                return;
            }
            // no es de ese tubo: la tubería se apaga y el objeto vuelve a su plataforma
            if (this.orgTubo[s]) this.orgTubo[s].reaccion('error');
            await this.clasificar(a.id, s, { x: a.cont.x, y: a.cont.y - 50 });
            tr.vida = 450; tr.t0 = this.time.now;
            if (!a.cont.active) return;
            var casa = L.puestos[a.puesto];
            await this.saltarA(a.cont, casa.x, casa.y, { ms: 520, alto: 60 });
            a.cont.setDepth(30);
            a.ocupada = false;
        },

        alAcertar: async function () { this.cameras.main.shake(80, 0.002); },

        /* ── Ayudas ── */

        mostrarPista: function (cancelada) {
            if (this.fase !== 'jugar') return Promise.resolve();
            var tubos = this.tubos(), L = this.L, self = this;
            var a = this.puestos.map(function (p) { return p.a; }).filter(function (q) { return q && q.cont.active && !q.ocupada; })[0];
            if (!a) return esperar(this, 900);
            var i = tubos.indexOf(this.sentidoDe(a.id));
            this.tweens.add({ targets: a.cont, scale: 1.18, duration: 220, yoyo: true, repeat: 2 });
            if (!this.ayuda || i < 0) return esperar(this, 900);
            return this.manoDe(cancelada, { x: a.cont.x, y: a.cont.y }, { x: L.tubos[i].x - L.tubos[i].w * 0.2, y: L.tubos[i].y }, { holdMs: 300 });
        },

        demoPaso: function () {
            var self = this, L = this.L, tubos = this.tubos();
            return this.puestos.map(function (pu) {
                return function () {
                    var a = pu.a;
                    if (!a || !a.cont.active) return null;
                    var i = tubos.indexOf(self.sentidoDe(a.id));
                    if (i < 0) return null;
                    var t = L.tubos[i], d = { x: t.x - t.w * 0.2, y: t.y };
                    return {
                        desde: { x: a.cont.x, y: a.cont.y }, hasta: d, durMs: 1000,
                        hacer: async function () {
                            var pts = [];
                            for (var k = 0; k <= 14; k++) { var f = k / 14; pts.push({ x: a.cont.x + (d.x - a.cont.x) * f, y: a.cont.y + (d.y - a.cont.y) * f + Math.sin(f * Math.PI) * -40 }); }
                            await self.conectar(a, pts, i);
                        }
                    };
                };
            });
        },

        /* ── Final: todas las tuberías se encienden ── */

        escenaFinal: async function () {
            var self = this, L = this.L;
            var viejos = this.puestos.map(function (p) { return p.a; }).filter(function (a) { return a && a.cont.active; });
            await this.retirar(viejos);
            this.puestos = [{ a: null }, { a: null }, { a: null }];
            this.trazos = [];
            var tubos = this.tubos();
            var rs = this.reunidosUnicos(3);
            if (rs.length < 3) rs = tubos.map(function (s, i) { return rs[i] || { id: { tacto: 'almohada', olfato: 'flor', oido: 'sirena' }[s] }; });
            for (var k = 0; k < rs.length; k++) {
                var id = rs[k].id, i = tubos.indexOf(this.sentidoDe(id));
                if (i < 0) i = k;
                var s = tubos[i];
                var a = this.crearCosa(id, L.puestos[k].x, L.puestos[k].y, L.tam, { depth: 30 });
                a.cont.setScale(0);
                await tw(this, { targets: a.cont, scale: 1, duration: 260, ease: 'Back.easeOut' });
                var d = { x: L.tubos[i].x - L.tubos[i].w * 0.2, y: L.tubos[i].y };
                var pts = [];
                for (var q = 0; q <= 14; q++) { var f = q / 14; pts.push({ x: a.cont.x + (d.x - a.cont.x) * f, y: a.cont.y + (d.y - a.cont.y) * f }); }
                this.trazos.push({ pts: pts, color: this.colorDe(s), vida: 99999, t0: this.time.now });
                this.propiedad(id, { x: a.cont.x, y: a.cont.y }, { etiqueta: false });
                await esperar(this, 500);
                this.llenado[s] = 99;
                this.pintarTubos();
                if (this.orgTubo[s]) this.orgTubo[s].reaccion('acierto');
                Ut.estallido(this, L.tubos[i].x, L.tubos[i].y, { n: 14, tex: 'estrella', tam: 28, dist: 150, depth: 85, sinTinte: true });
                a.saltito(0.25, 2);
            }
            K.efecto(this, 'celebracion');
            Ut.confeti(this, 90);
            await esperar(this, 1500);
        },

        estadoExtra: function () {
            var L = this.L;
            return {
                tubos: L.tubos.map(function (t) { return { x: Math.round(t.x - t.w * 0.2), y: Math.round(t.y) }; }),
                puestos: this.puestos.map(function (p) { return p.a && p.a.cont.active ? { id: p.a.id, x: Math.round(p.a.cont.x), y: Math.round(p.a.cont.y), ocupada: !!p.a.ocupada } : null; })
            };
        },

        paso: function (time) {
            var L = this.L, self = this;
            var g = this.trazoG;
            if (g && g.active) {
                g.clear();
                var dibujar = function (pts, color, alfa, luz) {
                    if (pts.length < 2) return;
                    g.lineStyle(18, 0x495057, alfa * 0.9);
                    g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
                    for (var i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
                    g.strokePath();
                    g.lineStyle(9, color, alfa);
                    g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
                    for (var j = 1; j < pts.length; j++) g.lineTo(pts[j].x, pts[j].y);
                    g.strokePath();
                    if (luz) { g.fillStyle(0xffffff, 0.9); g.fillCircle(luz.x, luz.y, 16); g.fillStyle(color, 0.5); g.fillCircle(luz.x, luz.y, 28); }
                };
                this.trazos = this.trazos.filter(function (t) { return time - t.t0 < t.vida; });
                this.trazos.forEach(function (t) {
                    var alfa = t.vida < 99999 ? Math.max(0, 1 - (time - t.t0) / t.vida) : 1;
                    dibujar(t.pts, t.color, alfa, t.luz);
                });
                if (this.trazo) dibujar(this.trazo.pts, this.hover >= 0 ? 0xffd43b : 0xffffff, 1, null);
            }
            this.puestos.forEach(function (pu, i) {
                var a = pu.a;
                if (!a || !a.cont.active || a.ocupada || self.trazo && self.trazo.a === a) return;
                a.cont.y = L.puestos[i].y + Math.sin(time / 600 + a.fase2) * 5;
            });
            var nv = this.nv;
            if (nv && !nv.demo && this.fase === 'jugar' && this.puestosActivos) {
                var libre = null, self2 = this;
                this.puestosActivos.forEach(function (i) { if (!libre && !self2.puestos[i].a && time - (self2.puestos[i].libre || 0) > 900 / nv.vel) libre = i; });
                if (libre != null) {
                    var id = this.sacar(this.visibles());
                    if (id) this.poner(libre, id);
                }
            }
        }
    };

    K.crear({ id: 'tuberias', fondo: '#d0bfff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
