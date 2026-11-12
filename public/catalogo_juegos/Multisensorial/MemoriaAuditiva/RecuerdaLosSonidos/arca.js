/**
 * «El arca de los sonidos» — motor propio de Recuerda los sonidos (5-6 años).
 *
 * Mientras suenan, sombras suben por la rampa (no se ve quién). Después los animales
 * PASEAN por el muelle y el niño los TOCA: corren solos por la rampa hasta la puerta.
 * Si no sonaron, la puerta los rechaza y vuelven. Cuando están todos, el arca zarpa.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var rnd = Ut.rnd;

    var escena = {
        iniciar: function () {
            this.cosas = [];
            this.abordo = [];
            this.reunidos = [];
            this.subiendo = false;
            this.apuntado = null;
        },

        filtrarPool: function (pool) {
            return pool.filter(function (id) { return K.ANIMALES.indexOf(id) >= 0; });
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            L.pres = null;
            L.der = W - 24;
            L.izq = 24;
            L.mar = Math.round(H * 0.36);
            L.muelle = Math.round(H * 0.62);
            var aw = Math.min(L.der * 0.58, 480, H * 0.48);
            L.arca = { x: L.der * 0.62, y: L.muelle - 20, w: aw, h: aw * 0.4 };
            L.puerta = { x: L.arca.x - aw * 0.18, y: L.arca.y - L.arca.h * 0.62 };
            L.rampa = {
                x0: L.puerta.x - aw * 0.34,
                y0: L.muelle + 4,
                x1: L.puerta.x,
                y1: L.puerta.y + L.arca.h * 0.18
            };
            L.tam = Math.max(70, Math.min(120, (L.der - 40) / 5.5, H * 0.14));
            L.bocina = { x: 52, y: L.muelle - 48, r: 26 };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            var V = this.montarVida(keep);
            if (V) {
                V.parque({ horizonte: L.mar, arboles: [], solX: 0.12, nubes: 4 });
                V.pajaros(3, 36, L.mar * 0.55);
            }
            keep(K.nino(this, 70, L.muelle + 4, 8, { ropa: 0x1971c2, esc: 1.85 }));
            this.sembrarMotes(keep, 18, {
                x: 0, y: L.mar, w: L.W, h: L.muelle - L.mar, depth: 6
            }, 0xd0ebff);
            K.textura(this, 'arca_mar', L.W, L.muelle - L.mar + 24, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#74c0fc');
                g.addColorStop(0.55, '#4dabf7');
                g.addColorStop(1, '#1971c2');
                x.fillStyle = g;
                x.fillRect(0, 0, w, h);
                x.strokeStyle = 'rgba(255,255,255,0.45)';
                x.lineWidth = 3;
                for (var yy = 14; yy < h; yy += 22) {
                    x.beginPath();
                    for (var xx = 0; xx <= w; xx += 20) {
                        x.lineTo(xx, yy + Math.sin(xx / 22 + yy) * 4);
                    }
                    x.stroke();
                }
            });
            keep(this.add.image(0, L.mar, 'arca_mar').setOrigin(0, 0).setDepth(2));
            K.textura(this, 'arca_muelle', L.W, L.H - L.muelle, function (x, w, h) {
                K.madera(x, 0, 0, w, h, { r: 0, claro: '#d39a55', medio: '#b97c3a', oscuro: '#87521f' });
                x.strokeStyle = 'rgba(70,35,10,0.4)';
                x.lineWidth = 2;
                for (var xx = 0; xx < w; xx += 48) {
                    x.beginPath();
                    x.moveTo(xx, 0);
                    x.lineTo(xx, h);
                    x.stroke();
                }
            });
            keep(this.add.image(0, L.muelle, 'arca_muelle').setOrigin(0, 0).setDepth(4));
            this.montarArca(keep);
            this.miraG = keep(this.add.graphics().setDepth(40));
            this.montarHud(keep);
            if (reubicar) this.ubicarCosas();
        },

        montarArca: function (keep) {
            var A = this.L.arca, w = A.w, h = A.h;
            var c = keep(this.add.container(A.x, A.y).setDepth(10));
            var g = this.add.graphics();
            g.fillStyle(0x8c5a2b, 1);
            g.beginPath();
            g.moveTo(-w / 2, -h * 0.55);
            g.lineTo(w / 2, -h * 0.55);
            g.lineTo(w * 0.38, 0);
            g.lineTo(-w * 0.38, 0);
            g.closePath();
            g.fillPath();
            g.lineStyle(3, 0x5c3613, 1);
            for (var k = 1; k < 4; k++) {
                g.lineBetween(
                    -w * (0.5 - k * 0.03), -h * 0.55 + h * 0.14 * k,
                    w * (0.5 - k * 0.03), -h * 0.55 + h * 0.14 * k
                );
            }
            g.fillStyle(0xd08c47, 1);
            g.fillRect(-w * 0.32, -h * 1.15, w * 0.64, h * 0.6);
            g.fillStyle(0xc92a2a, 1);
            g.beginPath();
            g.moveTo(-w * 0.38, -h * 1.15);
            g.lineTo(0, -h * 1.5);
            g.lineTo(w * 0.38, -h * 1.15);
            g.closePath();
            g.fillPath();
            g.fillStyle(0x343a40, 1);
            g.fillRect(-2, -h * 1.95, 4, h * 0.48);
            g.fillStyle(0xffd43b, 1);
            g.fillTriangle(2, -h * 1.92, 2, -h * 1.7, 34, -h * 1.81);
            g.fillStyle(0x5c3613, 1);
            g.fillRoundedRect(-w * 0.18 - w * 0.07, -h * 0.98, w * 0.14, h * 0.43, {
                tl: 10, tr: 10, bl: 0, br: 0
            });
            // Halo de puerta (feedback).
            this.puertaHalo = this.add.ellipse(-w * 0.18, -h * 0.78, w * 0.22, h * 0.5, 0xffe066, 0);
            c.add([g, this.puertaHalo]);
            this.ventanas = [];
            for (var i = 0; i < 4; i++) {
                var vx = -w * 0.04 + i * w * 0.085;
                var v = this.add.rectangle(vx, -h * 0.85, w * 0.065, h * 0.2, 0x343a40)
                    .setStrokeStyle(2, 0xffe066);
                c.add(v);
                this.ventanas.push({ x: A.x + vx, y: A.y - h * 0.85, r: v });
            }
            this.arca = c;
            var r = keep(this.add.graphics().setDepth(11));
            var R = this.L.rampa;
            r.lineStyle(16, 0xa47148, 1);
            r.lineBetween(R.x0, R.y0, R.x1, R.y1);
            r.lineStyle(3, 0x5c3613, 1);
            for (var t = 0.1; t < 1; t += 0.14) {
                var rx = R.x0 + (R.x1 - R.x0) * t;
                var ry = R.y0 + (R.y1 - R.y0) * t;
                r.lineBetween(rx - 8, ry - 5, rx + 8, ry + 5);
            }
        },

        alSonar: function () {
            var L = this.L, P = L.puerta, A = L.arca, R = L.rampa;
            var t = L.tam * 0.5;
            var sombra = this.add.ellipse(R.x0, R.y0 - t * 0.2, t, t * 0.8, 0x343a40, 0.85).setDepth(12);
            this.tweens.add({
                targets: sombra,
                x: P.x, y: P.y + A.h * 0.1,
                scale: 0.35, alpha: 0,
                duration: 700, ease: 'Sine.easeIn',
                onComplete: function () { sombra.destroy(); }
            });
            this.tweens.add({ targets: this.arca, angle: 1.4, duration: 150, yoyo: true, repeat: 1 });
            if (this.puertaHalo) {
                this.tweens.add({
                    targets: this.puertaHalo, fillAlpha: 0.55, duration: 180, yoyo: true
                });
            }
            K.ruido({ f: 120, q: 0.5, dur: 0.2, vol: 0.05 });
        },

        lugares: function (n) {
            var L = this.L, out = [];
            for (var i = 0; i < n; i++) {
                var t = n === 1 ? 0.5 : i / (n - 1);
                out.push({
                    x: L.izq + L.tam * 0.6 + (L.der * 0.48 - L.tam) * t,
                    y: L.muelle + (L.H - L.muelle) * (0.35 + (i % 2) * 0.22)
                });
            }
            return out;
        },

        ubicarCosas: function () {
            var lug = this.lugares(this.cosas.length);
            this.cosas.forEach(function (a, i) {
                if (!lug[i] || a.usada) return;
                a.casa = lug[i];
                a.cont.setPosition(lug[i].x, lug[i].y);
            });
        },

        prepararNivel: async function () {
            this.subiendo = false;
            this.apuntado = null;
            await this.retirar(this.cosas.filter(function (a) { return !a.usada; }).concat(this.abordo));
            this.cosas = [];
            this.abordo = [];
            this.ventanas.forEach(function (v) { v.r.setFillStyle(0x343a40); });
            if (this.puertaHalo) this.puertaHalo.setFillStyle(0xffe066, 0);
        },

        mostrarOpciones: async function (nv) {
            var self = this;
            var lug = this.lugares(nv.opciones.length);
            var tam = Math.min(this.L.tam, (this.L.der * 0.5) / Math.max(2, nv.opciones.length) * 0.9);
            this.cosas = nv.opciones.map(function (id, i) {
                var a = self.crearCosa(id, lug[i].x, lug[i].y - 30, tam, { depth: 30 });
                a.casa = { x: lug[i].x, y: lug[i].y };
                a.fase = Math.random() * 6;
                a.vx = (Math.random() < 0.5 ? -1 : 1) * rnd(40, 75);
                a.usada = false;
                a.ocupada = false;
                a.cont.setAlpha(0).setScale(0.4);
                return a;
            });
            K.tono({ f: 440, f2: 700, dur: 0.28, vol: 0.04 });
            await Promise.all(this.cosas.map(function (a, i) {
                return esperar(self, i * 90).then(function () {
                    return tw(self, {
                        targets: a.cont, alpha: 1, scale: 1, y: a.casa.y,
                        duration: 340, ease: 'Back.easeOut'
                    });
                });
            }));
        },

        cosaEnPunto: function (x, y) {
            var hit = null, best = 1e9;
            this.cosas.forEach(function (a) {
                if (a.usada || a.ocupada || !a.cont.active) return;
                var d = Math.hypot(a.cont.x - x, a.cont.y - y);
                if (d < a.tam * 0.7 && d < best) { best = d; hit = a; }
            });
            return hit;
        },

        alTocar: function (p) {
            if (this.fase !== 'jugar' || this.subiendo) return;
            var a = this.cosaEnPunto(p.x, p.y);
            if (!a) return;
            this.pista.reiniciar();
            this.enviarAlArca(a);
        },

        alMover: function (p) {
            if (this.fase !== 'jugar' || this.subiendo) {
                this.apuntado = null;
                return;
            }
            this.apuntado = this.cosaEnPunto(p.x, p.y);
        },

        alSoltar: function () {},

        /** Corre solo: muelle → rampa → puerta → marcar. */
        enviarAlArca: async function (a) {
            if (!a || a.usada || a.ocupada || this.subiendo) return;
            this.subiendo = true;
            a.ocupada = true;
            this.tocado = a;
            var L = this.L, R = L.rampa, P = L.puerta;
            a.cont.setDepth(35);
            K.tono({ f: 520, f2: 640, dur: 0.06, vol: 0.04 });
            if (this.puertaHalo) this.puertaHalo.setFillStyle(0xffe066, 0.4);
            await this.saltarA(a.cont, R.x0, R.y0 - a.tam * 0.25, { ms: 280, alto: 36 });
            await tw(this, {
                targets: a.cont,
                x: R.x1, y: R.y1 - a.tam * 0.1,
                duration: 420, ease: 'Sine.easeIn'
            });
            var r = await this.marcar(a.id, { x: P.x, y: P.y });
            if (r === 'mal' || r === 'repetido') {
                await this.rechazar(a);
                a.ocupada = false;
                this.subiendo = false;
                if (this.puertaHalo) this.puertaHalo.setFillStyle(0xffe066, 0);
                return;
            }
            await this.subir(a);
            this.subiendo = false;
            if (this.puertaHalo) this.puertaHalo.setFillStyle(0x69db7c, 0.35);
        },

        rechazar: async function (a) {
            var L = this.L;
            if (this.puertaHalo) this.puertaHalo.setFillStyle(0xff6b6b, 0.55);
            this.cameras.main.shake(100, 0.005);
            K.ruido({ f: 180, q: 1, dur: 0.18, vol: 0.1 });
            var casa = a.casa || { x: L.izq + 80, y: L.muelle + 40 };
            await tw(this, {
                targets: a.cont,
                x: casa.x + rnd(-30, 30),
                y: casa.y,
                scale: 1,
                alpha: 1,
                duration: 480,
                ease: 'Back.easeOut'
            });
            a.casa = { x: a.cont.x, y: a.cont.y };
            a.vx = (a.cont.x < L.der * 0.3 ? 1 : -1) * rnd(45, 80);
            a.cont.setDepth(30);
            await a.sacudir();
        },

        subir: async function (a) {
            var L = this.L, P = L.puerta, A = L.arca;
            if (a.usada) return;
            a.usada = true;
            this.abordo.push(a);
            this.cosas = this.cosas.filter(function (q) { return q !== a; });
            await tw(this, {
                targets: a.cont,
                x: P.x, y: P.y + A.h * 0.1,
                scale: 0.35, alpha: 0.25,
                duration: 380, ease: 'Sine.easeIn'
            });
            var v = this.ventanas[(this.abordo.length - 1) % this.ventanas.length];
            v.r.setFillStyle(0xfff3bf);
            a.cont.setPosition(v.x, v.y)
                .setScale(A.h * 0.24 / a.tam * 1.6)
                .setAlpha(1)
                .setDepth(11);
            if (a.sombra) a.sombra.setVisible(false);
            K.ruido({ f: 300, q: 1, dur: 0.12, vol: 0.08 });
            Ut.estallido(this, v.x, v.y, {
                n: 6, tex: 'estrella', tam: 12, dist: 40, sinTinte: true, depth: 40
            });
        },

        alAcertar: async function () {
            if (this.tocado && !this.tocado.usada) await this.subir(this.tocado);
            var A = this.L.arca;
            var luz = this.add.ellipse(A.x, A.y - A.h * 0.8, A.w * 1.1, A.h * 1.4, 0xfff3bf, 0).setDepth(9);
            this.tweens.add({
                targets: luz, fillAlpha: 0.55, duration: 300, yoyo: true, hold: 1200,
                onComplete: function () { luz.destroy(); }
            });
            for (var i = 0; i < this.abordo.length; i++) {
                var a = this.abordo[i];
                this.reunidos.push(a.id);
                a.saltito(0.25, 1);
                await this.sonar(a.id, { breve: true, bocina: false });
            }
        },

        alFallar: async function () {
            // El rebote lo hace rechazar().
        },

        alTerminarNivel: async function () {
            this.apuntado = null;
            await this.retirar(this.cosas.filter(function (a) { return !a.usada; }).concat(this.abordo));
            this.cosas = [];
            this.abordo = [];
            this.ventanas.forEach(function (v) { v.r.setFillStyle(0x343a40); });
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando || this.subiendo) return Promise.resolve();
            var ok = this.cosas.filter(function (c) {
                return !c.usada && self.respuestas().indexOf(c.id) >= 0;
            })[0];
            if (!ok) return Promise.resolve();
            return this.ctx.mano({
                punto: { x: ok.cont.x, y: ok.cont.y },
                holdMs: 450,
                cancelado: function () { return cancelada() || self.fase !== 'jugar'; }
            });
        },

        escenaFinal: async function () {
            var self = this;
            var L = this.L, A = L.arca;
            var vistos = {};
            var ids = this.reunidos.filter(function (id) {
                if (vistos[id]) return false;
                vistos[id] = 1;
                return true;
            });
            var asomados = ids.map(function (id, i) {
                var a = self.crearCosa(
                    id,
                    A.x - A.w * 0.4 + A.w * 0.8 * (i + 0.5) / Math.max(1, ids.length),
                    A.y - A.h * 0.62,
                    Math.min(L.tam * 0.7, A.w / Math.max(1, ids.length) * 0.9),
                    { sinSombra: true, depth: 9 }
                );
                a.cont.setScale(0.2);
                self.tweens.add({
                    targets: a.cont, scale: 1, duration: 300, delay: i * 80, ease: 'Back.easeOut'
                });
                return a;
            });
            await esperar(this, 500 + ids.length * 80);
            var todos = [this.arca].concat(asomados.map(function (a) { return a.cont; }));
            this.tweens.add({
                targets: todos, y: '-=6', duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            });
            K.tono({ f: 300, f2: 220, dur: 0.8, vol: 0.06, tipo: 'triangle' });
            for (var i = 0; i < ids.length; i++) {
                this.sonar(ids[i], { breve: true, bocina: false });
                asomados[i].saltito(0.2, 1);
                await esperar(this, 400);
                if (!this.sigue()) return;
            }
            await tw(this, {
                targets: todos, x: '+=' + (L.W * 0.9), duration: 2600, ease: 'Sine.easeIn'
            });
        },

        demoPaso: function () {
            var self = this;
            var ok = this.correctaDe(this.cosas);
            if (!ok) return null;
            return {
                desde: { x: ok.cont.x, y: ok.cont.y - 20 },
                mantener: 350,
                hacer: function () { return self.enviarAlArca(ok); }
            };
        },

        dibujarMira: function () {
            var g = this.miraG;
            if (!g) return;
            g.clear();
            if (this.fase !== 'jugar' || this.subiendo) return;
            var a = this.apuntado;
            if (!a || a.usada) return;
            g.lineStyle(3, 0xffe066, 0.9);
            g.strokeCircle(a.cont.x, a.cont.y, a.tam * 0.55);
            if (this.puertaHalo) this.puertaHalo.setFillStyle(0xffe066, 0.25);
        },

        paso: function (time, delta) {
            var L = this.L;
            var dt = (delta || 16) / 1000;
            this.dibujarMira();
            if (this.arca && !this.tweens.isTweening(this.arca)) {
                this.arca.angle = Math.sin(time / 900) * 1.5;
            }
            if (this.fase !== 'jugar' || this.subiendo) return;
            var limIzq = L.izq + L.tam * 0.4;
            var limDer = L.der * 0.5;
            var yMin = L.muelle + 20;
            var yMax = L.H - L.tam * 0.45;
            this.cosas.forEach(function (a) {
                if (a.usada || a.ocupada || !a.cont.active) return;
                if (this.tweens.isTweening(a.cont)) return;
                a.fase = (a.fase || 0) + dt * 2.4;
                a.cont.x += a.vx * dt;
                a.cont.y += Math.sin(a.fase) * 28 * dt;
                if (a.cont.x < limIzq) { a.cont.x = limIzq; a.vx = Math.abs(a.vx); }
                if (a.cont.x > limDer) { a.cont.x = limDer; a.vx = -Math.abs(a.vx); }
                if (a.cont.y < yMin) a.cont.y = yMin;
                if (a.cont.y > yMax) a.cont.y = yMax;
                a.cont.angle = Math.sin(a.fase) * 8;
                a.casa = { x: a.cont.x, y: a.cont.y };
            }, this);
        },

        estadoExtra: function () {
            var P = this.L.puerta;
            return {
                puerta: { x: Math.round(P.x), y: Math.round(P.y) },
                cosas: this.cosas.filter(function (a) { return !a.usada && a.cont.active; }).map(function (a) {
                    return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y) };
                })
            };
        }
    };

    K.crear({ id: 'arca', fondo: '#a5d8ff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
