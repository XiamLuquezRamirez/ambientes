/**
 * «El escenario de la banda» — motor propio de Dos Instrumentos (3-4 años, Repite la secuencia).
 *
 * Un teatro con telón rojo, focos y público. Mientras suenan los instrumentos, un foco recorre el
 * escenario vacío (no delata cuáles son). Después los instrumentos aparecen en el escenario y el
 * niño los GOLPEA (los toca) en el mismo orden: el foco lo ilumina, el instrumento suena y una nota
 * dorada se enciende en el pentagrama de arriba. Si se equivoca, las notas se apagan, el telón se
 * sacude y la secuencia vuelve a sonar. Al acertar, la banda toca todo de nuevo y el público aplaude.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    var INSTRUMENTOS = ['tambor', 'campana', 'maracas', 'trompeta', 'gaita'];

    var escena = {
        iniciar: function () {
            this.cosas = [];
            this.focos = [];
            this.notas = [];
            this.reunidos = [];
            this.publico = [];
            this.haz = { x: 0, y: 0, a: 0 };
            this.fiesta = 0;
            this.baqueta = null;
        },

        filtrarPool: function (pool) {
            var f = pool.filter(function (id) { return INSTRUMENTOS.indexOf(id) >= 0; });
            return f.length >= 4 ? f : pool;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), modelo: 'nina', giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.izq = 40;
            L.escenario = Math.round(H * 0.7);          // borde del tablado
            L.fila = Math.round(H * 0.6);
            L.tam = Math.max(78, Math.min(140, (L.der - L.izq) / 5.2, H * 0.2));
            L.pentagrama = { x: (L.izq + L.der) / 2, y: Math.round(H * 0.17), w: Math.min(360, (L.der - L.izq) * 0.6) };
            L.bocina = { x: L.izq + 24, y: Math.round(H * 0.17), r: Math.max(24, Math.min(32, hueco * 0.28)) };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            var self = this;
            // Pared de fondo y telones.
            K.textura(this, 'banda_fondo', L.W, L.H, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#3b1f5e'); g.addColorStop(0.6, '#7048a8'); g.addColorStop(1, '#b197fc');
                x.fillStyle = g; x.fillRect(0, 0, w, h);
                x.fillStyle = 'rgba(255,255,255,0.07)';
                for (var i = 0; i < 14; i++) x.fillRect(i * (w / 14), 0, w / 28, h);
                // Tablado de madera.
                K.madera(x, 0, L.escenario, w, h - L.escenario, { claro: '#e0a25a', medio: '#c88a45', oscuro: '#8a5524', r: 0 });
                x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, L.escenario, w, 8);
            });
            keep(this.add.image(0, 0, 'banda_fondo').setOrigin(0, 0).setDepth(1));
            // Telón (cortinas laterales con pliegues) y cenefa.
            var tel = keep(this.add.graphics().setDepth(4));
            var anchoT = Math.max(70, L.W * 0.075);
            [0, L.W - anchoT].forEach(function (cx, lado) {
                tel.fillStyle(0xc92a2a, 1); tel.fillRect(cx, 0, anchoT, L.escenario + 6);
                tel.fillStyle(0x9c1c1c, 1);
                for (var f = 0; f < 4; f++) tel.fillRect(cx + f * (anchoT / 4) + anchoT / 8, 0, anchoT / 12, L.escenario + 6);
                tel.fillStyle(0xe03131, 0.6);
                for (var f2 = 0; f2 < 4; f2++) tel.fillRect(cx + f2 * (anchoT / 4), 0, anchoT / 20, L.escenario + 6);
            });
            tel.fillStyle(0xa61e4d, 1); tel.fillRect(0, 0, L.W, Math.max(26, L.H * 0.045));
            tel.fillStyle(0xfcc419, 1);
            for (var c = 0; c < L.W; c += 30) tel.fillTriangle(c, Math.max(26, L.H * 0.045), c + 30, Math.max(26, L.H * 0.045), c + 15, Math.max(26, L.H * 0.045) + 16);
            // Focos del techo.
            this.focosG = keep(this.add.graphics().setDepth(3));
            this.cuerdaG = keep(this.add.graphics().setDepth(2));
            var Fs = [0.2, 0.5, 0.8].map(function (f) { return { x: L.izq + (L.der - L.izq) * f, y: Math.max(26, L.H * 0.045) + 8 }; });
            this.focos = Fs;
            Fs.forEach(function (f) {
                var lamp = keep(self.add.graphics().setDepth(5));
                lamp.fillStyle(0x343a40, 1); lamp.fillRoundedRect(f.x - 16, f.y - 8, 32, 22, 6);
                lamp.fillStyle(0xfff3bf, 1); lamp.fillCircle(f.x, f.y + 14, 9);
            });
            this.sembrarMotes(keep, 14, { x: 0, y: 0, w: L.W, h: L.escenario, depth: 7 }, 0xfff3bf);
            this.montarPentagrama(keep);
            this.montarHud(keep);
            this.publicoG = keep(this.add.graphics().setDepth(31));
            var bq = keep(this.add.container(-100, -100).setDepth(75));
            var bg = this.add.graphics();
            bg.lineStyle(7, 0xe9c28a, 1); bg.lineBetween(0, 0, 46, -46);
            bg.fillStyle(0xc92a2a, 1); bg.fillCircle(0, 0, 11);
            bq.add(bg); bq.setAlpha(0);
            this.baqueta = bq;
            if (reubicar) this.ubicarCosas();
        },

        montarPentagrama: function (keep) {
            var P = this.L.pentagrama;
            var g = keep(this.add.graphics().setDepth(40));
            g.fillStyle(0x12263f, 0.5); g.fillRoundedRect(P.x - P.w / 2 - 20, P.y - 34, P.w + 40, 68, 18);
            g.lineStyle(2, 0xffffff, 0.7);
            for (var i = 0; i < 5; i++) g.lineBetween(P.x - P.w / 2, P.y - 22 + i * 11, P.x + P.w / 2, P.y - 22 + i * 11);
            this.notasG = keep(this.add.graphics().setDepth(41));
            this.ranuras = [];
        },

        ranuraX: function (i, n) {
            var P = this.L.pentagrama;
            var paso = P.w / Math.max(n, 1);
            return P.x - P.w / 2 + paso * (i + 0.5);
        },

        /* ── Instrumentos ── */

        lugares: function (n) {
            var L = this.L;
            var out = [];
            var disp = L.der - L.izq - L.tam * 1.2;
            for (var i = 0; i < n; i++) out.push({ x: L.izq + L.tam * 0.6 + disp * (i + 0.5) / n + (L.W * 0.04), y: L.fila + (i % 2 ? -1 : 1) * L.tam * 0.05 });
            return out;
        },

        ubicarCosas: function () {
            var lug = this.lugares(this.cosas.length);
            this.cosas.forEach(function (a, i) {
                if (!a.cont.active) return;
                a.casa = { x: lug[i].x, y: lug[i].y };
                a.cont.setPosition(lug[i].x, lug[i].y);
            });
        },

        mostrarOpciones: async function (nv) {
            var self = this;
            var L = this.L;
            var n = nv.opciones.length;
            var lug = this.lugares(n);
            var tam = Math.min(L.tam, (L.der - L.izq) / n * 0.82);
            this.cosas = nv.opciones.map(function (id, i) {
                var a = self.crearCosa(id, lug[i].x, lug[i].y - 80, tam, { depth: 30 });
                var ped = self.add.graphics();
                ped.fillStyle(0x5c3d1e, 1); ped.fillRoundedRect(-tam * 0.42, tam * 0.4, tam * 0.84, tam * 0.2, 6);
                ped.fillStyle(0x8a5a2b, 1); ped.fillRoundedRect(-tam * 0.38, tam * 0.4, tam * 0.76, tam * 0.07, 4);
                a.cont.addAt(ped, 0);
                a.casa = { x: lug[i].x, y: lug[i].y };
                a.prof = 30;
                a.cont.setAlpha(0);
                return a;
            });
            K.ruido({ f: 1300, q: 1, dur: 0.06, vol: 0.05 });
            await Promise.all(this.cosas.map(function (a, i) {
                return esperar(self, i * 120).then(function () { return tw(self, { targets: a.cont, alpha: 1, y: a.casa.y, duration: 360, ease: 'Bounce.easeOut' }); });
            }));
        },

        prepararNivel: async function (i, nv) {
            await this.retirar(this.cosas);
            this.cosas = [];
            this.apagarNotas();
            this.ranuras = nv.reproducciones[0].map(function () { return null; });
            this.dibujarNotas();
            this.haz.a = 0;
        },

        /* ── Foco: ilumina a un punto del escenario ── */

        iluminar: function (x, y, ms, color) {
            var self = this;
            this.haz.x = x; this.haz.y = y; this.haz.color = color || 0xfff3bf;
            this.tweens.killTweensOf(this.haz);
            this.haz.a = 0;
            this.tweens.add({ targets: this.haz, a: 1, duration: 140, yoyo: true, hold: ms || 380 });
        },

        alSonar: function (id, k) {
            var L = this.L;
            var n = this.nv.reproducciones[0].length;
            // El foco barre el escenario vacío sin delatar qué instrumento suena.
            var x = L.izq + (L.der - L.izq) * (0.2 + 0.6 * (k % 3) / 2 + (k % 2 ? 0.04 : -0.04));
            this.iluminar(x, L.fila, 420);
            Ut.estallido(this, x, L.fila - L.tam * 0.3, { n: 3, tex: 'nota', tam: 24, dist: 80, depth: 70 });
        },

        /* ── Pentagrama ── */

        apagarNotas: function () { this.ranuras = []; },

        dibujarNotas: function () {
            var g = this.notasG;
            if (!g || !g.active) return;
            g.clear();
            var n = this.ranuras.length;
            for (var i = 0; i < n; i++) {
                var x = this.ranuraX(i, n), y = this.L.pentagrama.y + 12 - (i % 2) * 11;
                var on = this.ranuras[i];
                g.fillStyle(on ? 0xffd43b : 0xffffff, on ? 1 : 0.22);
                g.fillEllipse(x, y, 20, 15);
                g.lineStyle(3, on ? 0xffd43b : 0xffffff, on ? 1 : 0.22);
                g.lineBetween(x + 9, y, x + 9, y - 30);
            }
        },

        /* ── El niño golpea los instrumentos ── */

        alTocar: async function (p) {
            if (this.fase !== 'jugar') return;
            var a = this.cosaEn(this.cosas, p.x, p.y, this.cosas.length ? this.cosas[0].tam * 0.62 : 60);
            this.golpeBaqueta(p);
            if (!a || a.hecha) return;
            this.pista.reiniciar();
            await this.tocarOrden(a, { x: a.cont.x, y: a.cont.y });
        },

        alMover: function (p) {
            var b = this.baqueta;
            if (!b) return;
            if (this.fase !== 'jugar') { b.setAlpha(0); return; }
            b.setPosition(p.x, p.y).setAlpha(1);
        },

        /** La baqueta baja con un golpe donde toca el niño. */
        golpeBaqueta: function (p) {
            var b = this.baqueta;
            if (!b) return;
            b.setPosition(p.x, p.y).setAlpha(1).setAngle(-35);
            this.tweens.killTweensOf(b);
            this.tweens.add({ targets: b, angle: 15, duration: 90, yoyo: true, hold: 40, onComplete: function () { b.setAngle(-35); } });
            this.tweens.add({ targets: b, alpha: 0, delay: 900, duration: 300 });
        },

        golpe: function (a) {
            var self = this;
            this.iluminar(a.cont.x, a.cont.y, 500);
            this.tweens.killTweensOf(a.img);
            a.img.setScale(a.img.scale);
            a.saltito(0.12, 2);
            Ut.estallido(this, a.cont.x, a.cont.y - a.tam * 0.4, { n: 5, tex: 'nota', tam: 24, dist: 90, depth: 70 });
        },

        alMarcar: async function (id, k) {
            var a = this.tocado;
            if (!a) return;
            a.hecha = true;
            this.ranuras[k] = id;
            this.dibujarNotas();
            this.fiesta = Math.min(1, this.fiesta + 0.3);
            this.golpe(a);
            var x = this.ranuraX(k, this.ranuras.length), y = this.L.pentagrama.y;
            Ut.estallido(this, x, y, { n: 6, tex: 'estrella', tam: 18, dist: 60, depth: 90, sinTinte: true });
            await esperar(this, 220);
        },

        alFallar: async function () {
            var a = this.tocado;
            if (a) await a.sacudir();
            // El telón de arriba se sacude: error amable.
            this.cameras.main.shake(180, 0.004);
            this.fiesta = 0;
            K.tono({ f: 300, f2: 190, dur: 0.2, vol: 0.05 });
        },

        alReiniciar: async function () {
            var self = this;
            this.cosas.forEach(function (a) { a.hecha = false; });
            for (var i = this.ranuras.length - 1; i >= 0; i--) {
                if (this.ranuras[i]) { this.ranuras[i] = null; this.dibujarNotas(); K.tono({ f: 500 - i * 60, dur: 0.06, vol: 0.04 }); await esperar(this, 120); }
            }
        },

        /** Acierto: la banda toca todo en orden bajo los focos y el público aplaude. */
        alAcertar: async function () {
            var nv = this.nv;
            await esperar(this, 200);
            for (var i = 0; i < nv.correctas.length; i++) {
                if (!this.sigue()) return;
                var a = this.cosas.filter(function (q) { return q.id === nv.correctas[i]; })[0];
                if (!a) continue;
                this.reunidos.push(a.id);
                this.golpe(a);
                Ut.estallido(this, a.cont.x, a.cont.y - a.tam * 0.2, { n: 8, tex: 'estrella', tam: 24, dist: 120, depth: 70, sinTinte: true });
                await this.sonar(a.id, { breve: true, bocina: false });
                await esperar(this, 120);
            }
            this.aplauso();
            await esperar(this, 600);
        },

        aplauso: function () {
            this.fiesta = 1.4;
            for (var i = 0; i < 10; i++) K.ruido({ f: 2600, q: 0.8, dur: 0.05, vol: 0.05 });
            var L = this.L;
            Ut.estallido(this, L.W / 2, L.escenario, { n: 18, tex: 'corazon', tam: 26, dist: 220, depth: 70 });
        },

        alTerminarNivel: async function () {
            await this.retirar(this.cosas);
            this.cosas = [];
            this.ranuras = [];
            this.dibujarNotas();
        },

        mostrarPista: function (cancelada) { return this.pistaToque(cancelada, this.cosas); },
        demoPaso: function () { return this.demoOrden(this.cosas); },

        /** Final: concierto con todos los instrumentos de la partida y lluvia de notas. */
        escenaFinal: async function () {
            var self = this;
            var L = this.L;
            await this.retirar(this.cosas);
            this.cosas = [];
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; }).slice(0, 5);
            if (!ids.length) ids = ['tambor', 'campana'];
            var lug = this.lugares(ids.length);
            var tam = Math.min(L.tam, (L.der - L.izq) / ids.length * 0.82);
            var bandas = ids.map(function (id, i) {
                var a = self.crearCosa(id, lug[i].x, lug[i].y - 80, tam, { depth: 30 });
                a.cont.setAlpha(0);
                a.casa = lug[i];
                return a;
            });
            await Promise.all(bandas.map(function (a, i) {
                return esperar(self, i * 100).then(function () { return tw(self, { targets: a.cont, alpha: 1, y: a.casa.y, duration: 340, ease: 'Bounce.easeOut' }); });
            }));
            for (var r = 0; r < 2; r++) {
                for (var i = 0; i < bandas.length; i++) {
                    if (!this.sigue()) return;
                    this.golpe(bandas[i]);
                    await this.sonar(bandas[i].id, { breve: true, bocina: false });
                }
            }
            this.aplauso();
            Ut.confeti(this, 80);
            await esperar(this, 900);
            this.retirar(bandas);
        },

        estadoExtra: function () {
            return {
                cosas: this.cosas.filter(function (a) { return a.cont.active; }).map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y), hecha: !!a.hecha }; })
            };
        },

        paso: function (time, delta) {
            var L = this.L;
            this.fiesta = Math.max(0, this.fiesta - (delta || 16) / 9000);
            var pg = this.publicoG;
            if (pg && pg.active) {
                pg.clear();
                var f = Math.min(1, this.fiesta);
                var ritmo = 600 - f * 250;
                for (var q = 0; q < 16; q++) {
                    var px = (q + 0.5) * (L.W / 16) + (q % 2 ? 10 : -10);
                    var py = L.H - 20 - (q % 3) * 6 - Math.abs(Math.sin(time / ritmo + q)) * (2 + f * 16);
                    pg.fillStyle(f > 0.05 ? 0x2d1850 : 0x1c1033, 1);
                    pg.fillCircle(px, py - 26, 22);
                    pg.beginPath(); pg.arc(px, py + 16, 36, Math.PI, 0, false); pg.fillPath();
                    if (f > 0.25) { pg.lineStyle(7, 0x2d1850, 1); var br = Math.sin(time / 180 + q) * 8; pg.lineBetween(px - 24, py - 6, px - 36, py - 40 + br); pg.lineBetween(px + 24, py - 6, px + 36, py - 40 - br); }
                }
            }
            // Los instrumentos se mecen al compás de la banda.
            var self = this;
            this.cosas.forEach(function (a, i) { if (a.img && a.img.active && !a.hecha && !self.tweens.isTweening(a.img)) a.img.angle = Math.sin(time / 420 + i * 1.3) * 3; });
            var g = this.focosG;
            if (!g || !g.active) return;
            g.clear();
            // Los tres focos apuntan al instrumento iluminado (o a ninguna parte, suavemente).
            var h = this.haz;
            var luz = 0.08 + 0.5 * h.a;
            var tx = h.a > 0.01 ? h.x : (L.izq + L.der) / 2 + Math.sin(time / 1700) * (L.der - L.izq) * 0.25;
            var ty = h.a > 0.01 ? h.y : L.fila;
            var col = h.color || 0xfff3bf;
            this.focos.forEach(function (f, i) {
                var ancho = L.tam * (h.a > 0.01 ? 0.55 : 0.4);
                g.fillStyle(col, luz * (h.a > 0.01 ? 0.65 : 0.5));
                g.fillTriangle(f.x - 10, f.y + 14, f.x + 10, f.y + 14, tx + ancho, ty + L.tam * 0.55);
                g.fillTriangle(f.x - 10, f.y + 14, tx + ancho, ty + L.tam * 0.55, tx - ancho, ty + L.tam * 0.55);
            });
            if (h.a > 0.01) { g.fillStyle(col, 0.25 * h.a); g.fillEllipse(tx, ty + L.tam * 0.5, L.tam * 1.6, L.tam * 0.4); }
        }
    };

    K.crear({ id: 'banda', fondo: '#3b1f5e', escena: escena });
})(typeof window !== 'undefined' ? window : this);
