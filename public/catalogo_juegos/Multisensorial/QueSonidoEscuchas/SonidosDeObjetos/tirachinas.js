/**
 * «El tirachinas» — motor propio de Sonidos de Objetos (3-4 años, ¿Qué sonido escuchas?).
 *
 * En el patio hay un tirachinas y, al fondo, objetos sobre dianas. Suena un objeto y, cuando las
 * dianas aparecen, el niño ESTIRA la liga hacia atrás y SUELTA: la pelota sale volando (una guía de
 * puntos muestra a cuál diana va). Si pega en el objeto que sonó, ¡hace fiesta!; si no, el objeto
 * suena con su propio sonido, se tambalea y vuelve a su lugar (sin castigo).
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    var OBJETOS = ['campana', 'pelota', 'carro', 'tambor', 'triangulo', 'reloj', 'trompeta', 'gaita', 'botella', 'maracas'];

    var escena = {
        iniciar: function () {
            this.cosas = [];
            this.reunidos = [];
            this.apuntando = false;
            this.ocupado = false;
            this.bola = null;
            this.objetivoGuia = null;
        },

        filtrarPool: function (pool) {
            var f = pool.filter(function (id) { return OBJETOS.indexOf(id) >= 0; });
            return f.length >= 4 ? f : pool;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.horizonte = Math.round(H * 0.42);
            L.suelo = Math.round(H * 0.84);
            L.tam = Math.max(86, Math.min(124, (L.der - 300) / 3.2, H * 0.17));
            L.reposo = { x: Math.round(Math.max(130, L.der * 0.14)), y: Math.round(H * 0.6) };
            L.maxTiro = Math.max(110, Math.min(170, L.der * 0.12));
            L.bocina = { x: 48, y: Math.round(H * 0.26), r: Math.max(24, Math.min(32, hueco * 0.28)) };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            var V = this.montarVida(keep);
            if (V) {
                V.parque({ horizonte: L.horizonte, arboles: [0.4, 0.62, 0.8, 0.96], solX: 0.16 });
                V.mariposas(2, { x: 0, y: L.horizonte, w: L.W, h: L.H * 0.4, depth: 8 });
            }
            var pasto = keep(this.add.graphics().setDepth(1.5));
            pasto.fillStyle(0x8ce99a, 1); pasto.fillRect(0, L.horizonte, L.W, L.H - L.horizonte);
            pasto.fillStyle(0x69db7c, 1); pasto.fillRect(0, L.horizonte, L.W, 8);
            pasto.fillStyle(0x51cf66, 0.5);
            for (var i = 0; i < 70; i++) { var gx = (i * 97) % L.W, gy = L.horizonte + 14 + ((i * 53) % Math.max(10, L.H - L.horizonte - 20)); pasto.fillTriangle(gx, gy, gx + 4, gy - 11, gx + 8, gy); }
            var cerca = keep(this.add.graphics().setDepth(1.8));
            cerca.fillStyle(0xf8f9fa, 1);
            for (var c = 0; c < L.W; c += 34) { cerca.fillRoundedRect(c, L.horizonte - 28, 20, 38, 4); cerca.fillTriangle(c, L.horizonte - 28, c + 20, L.horizonte - 28, c + 10, L.horizonte - 40); }
            this.gomaG = keep(this.add.graphics().setDepth(55));
            this.guiaG = keep(this.add.graphics().setDepth(54));
            // Tirachinas: horquilla de madera.
            var t = keep(this.add.graphics().setDepth(50));
            var R0 = L.reposo;
            t.lineStyle(14, 0x7a4e1e, 1);
            t.lineBetween(R0.x, R0.y + 90, R0.x, R0.y + 14);
            t.lineBetween(R0.x, R0.y + 14, R0.x - 26, R0.y - 26);
            t.lineBetween(R0.x, R0.y + 14, R0.x + 26, R0.y - 26);
            t.fillStyle(0xdc2626, 1); t.fillCircle(R0.x - 26, R0.y - 28, 9); t.fillCircle(R0.x + 26, R0.y - 28, 9);
            this.puntas = [{ x: R0.x - 26, y: R0.y - 28 }, { x: R0.x + 26, y: R0.y - 28 }];
            this.reposoBola = { x: R0.x, y: R0.y - 28 };
            this.montarHud(keep);
            this.sembrarMotes(keep, 10, { x: 0, y: L.horizonte, w: L.W, h: L.H - L.horizonte, depth: 8 }, 0xfff3bf);
            this.montarBola();
            if (reubicar) this.ubicarCosas();
        },

        montarBola: function () {
            if (this.bola && this.bola.active) { this.bola.setPosition(this.reposoBola.x, this.reposoBola.y); return; }
            var b = this.add.container(this.reposoBola.x, this.reposoBola.y).setDepth(56);
            var g = this.add.graphics();
            g.fillStyle(0xff6b6b, 1); g.fillCircle(0, 0, 17);
            g.fillStyle(0xffffff, 0.35); g.fillCircle(-6, -6, 6);
            g.lineStyle(3, 0xc92a2a, 1); g.strokeCircle(0, 0, 17);
            b.add(g);
            this.bola = b;
        },

        /* ── Dianas ── */

        lugares: function (n) {
            var L = this.L;
            var x0 = L.reposo.x + 300, disp = L.der - x0 - L.tam * 0.6;
            var y0 = L.H * 0.3, y1 = L.suelo - L.tam * 0.7;
            var out = [];
            for (var i = 0; i < n; i++) out.push({ x: x0 + disp * (i % 2 ? 0.88 : 0.35) + (n === 3 && i === 1 ? disp * 0.05 : 0), y: y0 + (y1 - y0) * (i + 0.5) / n });
            return out;
        },

        ubicarCosas: function () {
            var lug = this.lugares(this.cosas.length);
            this.cosas.forEach(function (a, i) { a.casa = { x: lug[i].x, y: lug[i].y }; a.cont.setPosition(lug[i].x, lug[i].y); });
        },

        crearDiana: function (id, i, lug, tam) {
            var a = this.crearCosa(id, lug.x, lug.y - 70, tam * 0.64, { depth: 30, sinSombra: true });
            var g = this.add.graphics();
            var t = tam;
            g.fillStyle(0x7a4e1e, 1); g.fillRect(-5, t * 0.4, 10, t * 0.7);                      // poste
            g.fillStyle(0x000000, 0.18); g.fillEllipse(0, t * 1.08, t * 0.8, t * 0.18);
            [[0.5, 0xffffff], [0.42, 0xe03131], [0.3, 0xffffff], [0.2, 0xe03131]].forEach(function (r) { g.fillStyle(r[1], 1); g.fillCircle(0, 0, t * r[0]); });
            g.fillStyle(0xfff9db, 1); g.fillCircle(0, 0, t * 0.36);
            g.lineStyle(5, 0x7a4e1e, 1); g.strokeCircle(0, 0, t * 0.5);
            var aro = this.add.graphics(); aro.lineStyle(8, 0xffd43b, 1); aro.strokeCircle(0, 0, t * 0.56); aro.setAlpha(0);
            a.cont.addAt(g, 0); a.cont.addAt(aro, 1);
            a.aro = aro; a.tam = t; a.casa = { x: lug.x, y: lug.y }; a.fase2 = Math.random() * 6;
            a.cont.setAlpha(0);
            return a;
        },

        mostrarOpciones: async function (nv) {
            var self = this;
            var lug = this.lugares(nv.opciones.length);
            var tam = Math.min(this.L.tam, 120);
            this.cosas = nv.opciones.map(function (id, i) { return self.crearDiana(id, i, lug[i], tam); });
            K.ruido({ f: 1100, q: 1, dur: 0.1, vol: 0.05 });
            await Promise.all(this.cosas.map(function (a, i) {
                return esperar(self, i * 130).then(function () { return tw(self, { targets: a.cont, alpha: 1, y: a.casa.y, duration: 360, ease: 'Back.easeOut' }); });
            }));
        },

        prepararNivel: async function () {
            await this.retirar(this.cosas);
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.cosas = [];
            this.ocupado = false;
            this.montarBola();
        },

        alSonar: function () {
            Ut.estallido(this, this.L.reposo.x + 40, this.L.reposo.y - 80, { n: 3, tex: 'nota', tam: 24, dist: 90, depth: 70 });
        },

        /* ── Estirar y soltar ── */

        objetivoPara: function (pos) {
            // Dirección del tiro = del punto estirado hacia el reposo; gana la diana más cercana en ángulo.
            var R = this.reposoBola;
            var vx = R.x - pos.x, vy = R.y - pos.y;
            if (Math.hypot(vx, vy) < 28 || vx <= 0) return null;
            var ang = Math.atan2(vy, vx), mejor = null, dm = 0.7;
            this.cosas.forEach(function (a) {
                var d = Math.abs(Math.atan2(a.cont.y - R.y, a.cont.x - R.x) - ang);
                if (d < dm) { dm = d; mejor = a; }
            });
            return mejor;
        },

        alTocar: function (p) {
            if (this.fase !== 'jugar' || this.ocupado) return;
            var R = this.reposoBola;
            if (Math.hypot(p.x - R.x, p.y - R.y) < 80) { this.apuntando = true; this.pista.reiniciar(); }
        },

        alMover: function (p) {
            if (!this.apuntando) return;
            var R = this.reposoBola, L = this.L;
            var dx = p.x - R.x, dy = p.y - R.y, d = Math.hypot(dx, dy);
            if (d > L.maxTiro) { dx *= L.maxTiro / d; dy *= L.maxTiro / d; }
            this.bola.setPosition(R.x + dx, R.y + dy);
            var obj = this.objetivoPara(this.bola);
            this.cosas.forEach(function (a) { a.aro.setAlpha(a === obj ? 1 : 0); });
            this.objetivoGuia = obj;
        },

        alSoltar: async function () {
            if (!this.apuntando) return;
            this.apuntando = false;
            var obj = this.objetivoGuia;
            this.objetivoGuia = null;
            this.cosas.forEach(function (a) { a.aro.setAlpha(0); });
            var R = this.reposoBola;
            if (!obj) { this.tweens.add({ targets: this.bola, x: R.x, y: R.y, duration: 250, ease: 'Back.easeOut' }); return; }
            await this.lanzarA(obj);
        },

        lanzarA: async function (obj) {
            if (this.ocupado || this.fase !== 'jugar') return;
            this.ocupado = true;
            var R = this.reposoBola, b = this.bola;
            K.tono({ f: 300, f2: 900, dur: 0.18, vol: 0.05, tipo: 'triangle' });
            await this.saltarA(b, obj.cont.x, obj.cont.y, { ms: 620, alto: 80 });
            b.setAlpha(0);
            b.setPosition(R.x, R.y);
            K.ruido({ f: 600, q: 1, dur: 0.1, vol: 0.1 });
            this.cameras.main.shake(100, 0.003);
            Ut.estallido(this, obj.cont.x, obj.cont.y, { n: 8, tex: 'chispa', tam: 22, dist: 90, depth: 70, sinTinte: true });
            this.dianaActual = obj;
            var ok = await this.elegir(obj.id, { x: obj.cont.x, y: obj.cont.y });
            b.setAlpha(0).setScale(0.2);
            this.tweens.add({ targets: b, alpha: 1, scale: 1, duration: 300, ease: 'Back.easeOut' });
            this.ocupado = false;
        },

        alAcertar: async function () {
            var a = this.dianaActual;
            if (!a) return;
            this.reunidos.push(a.id);
            Ut.estallido(this, a.cont.x, a.cont.y, { n: 16, tex: 'estrella', tam: 28, dist: 150, depth: 70, sinTinte: true });
            tw(this, { targets: a.cont, angle: 360, duration: 500 }).then(function () { a.cont.angle = 0; });
            await this.sonar(a.id, { breve: true, bocina: false });
            await esperar(this, 250);
        },

        alFallar: async function () {
            var a = this.dianaActual;
            if (!a) return;
            await tw(this, { targets: a.cont, angle: { from: -18, to: 18 }, duration: 90, yoyo: true, repeat: 3 });
            a.cont.angle = 0;
        },

        alTerminarNivel: async function () {
            await this.retirar(this.cosas);
            this.cosas = [];
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            var a = this.correctaDe(this.cosas);
            if (!a || !this.ayuda) {
                if (this.bocina) this.tweens.add({ targets: this.bocina, scale: 1.18, duration: 220, yoyo: true, repeat: 2 });
                return esperar(this, 900);
            }
            var R = this.reposoBola;
            var ang = Math.atan2(a.cont.y - R.y, a.cont.x - R.x);
            return this.ctx.mano({ punto: { x: R.x, y: R.y }, holdMs: 200, arrastre: { dx: -Math.cos(ang) * 100, dy: -Math.sin(ang) * 100, durMs: 900 }, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
        },

        demoPaso: function () {
            var self = this;
            var a = this.correctaDe(this.cosas);
            if (!a) return null;
            var R = this.reposoBola;
            var ang = Math.atan2(a.cont.y - R.y, a.cont.x - R.x);
            return {
                desde: { x: R.x, y: R.y }, hasta: { x: R.x - Math.cos(ang) * 100, y: R.y - Math.sin(ang) * 100 },
                hacer: async function () {
                    await tw(self, { targets: self.bola, x: R.x - Math.cos(ang) * 100, y: R.y - Math.sin(ang) * 100, duration: 350 });
                    await self.lanzarA(a);
                }
            };
        },

        escenaFinal: async function () {
            var self = this, L = this.L;
            await this.retirar(this.cosas);
            this.cosas = [];
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; }).slice(0, 5);
            if (!ids.length) ids = ['campana', 'pelota', 'carro'];
            var lug = ids.map(function (id, i) { return { x: L.reposo.x + 260 + (L.der - L.reposo.x - 320) * (i + 0.5) / ids.length, y: L.suelo - L.tam * 0.8 }; });
            var dianas = ids.map(function (id, i) { return self.crearDiana(id, i, lug[i], L.tam); });
            await Promise.all(dianas.map(function (a, i) { return esperar(self, i * 100).then(function () { return tw(self, { targets: a.cont, alpha: 1, y: a.casa.y, duration: 320, ease: 'Back.easeOut' }); }); }));
            this.cosas = dianas;
            for (var i = 0; i < dianas.length; i++) {
                if (!this.sigue()) return;
                this.bola.setAlpha(1);
                this.bola.setPosition(this.reposoBola.x, this.reposoBola.y);
                await this.saltarA(this.bola, dianas[i].cont.x, dianas[i].cont.y, { ms: 480, alto: 70 });
                Ut.estallido(this, dianas[i].cont.x, dianas[i].cont.y, { n: 12, tex: 'estrella', tam: 26, dist: 130, depth: 70, sinTinte: true });
                dianas[i].saltito(0.2, 2);
                await this.sonar(ids[i], { breve: true, bocina: false });
            }
            this.bola.setAlpha(0);
            Ut.confeti(this, 90);
            await esperar(this, 1100);
        },

        estadoExtra: function () {
            var R = this.reposoBola;
            return {
                reposo: R ? { x: Math.round(R.x), y: Math.round(R.y) } : null,
                cosas: this.cosas.filter(function (a) { return a.cont.active; }).map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y) }; })
            };
        },

        paso: function (time) {
            var g = this.gomaG, gg = this.guiaG;
            if (g && g.active) {
                g.clear();
                var b = this.bola;
                if (b && b.alpha > 0.1) {
                    g.lineStyle(7, 0x3b2a14, 1);
                    this.puntas.forEach(function (p) { g.lineBetween(p.x, p.y, b.x, b.y); });
                }
            }
            if (gg && gg.active) {
                gg.clear();
                var o = this.objetivoGuia;
                if (this.apuntando && o) {
                    // puntos de la trayectoria prevista, con su arco
                    var R = this.reposoBola;
                    for (var k = 1; k <= 8; k++) {
                        var t = k / 9;
                        var x = this.bola.x + (o.cont.x - this.bola.x) * t, y = this.bola.y + (o.cont.y - this.bola.y) * t - Math.sin(t * Math.PI) * 70;
                        gg.fillStyle(0xffffff, 0.85); gg.fillCircle(x, y, 6 - k * 0.3);
                    }
                }
            }
            var self = this;
            this.cosas.forEach(function (a, i) { if (a.cont.active && !self.tweens.isTweening(a.cont) && !self.ocupado) a.cont.y = a.casa.y + Math.sin(time / 700 + a.fase2) * 4; });
        }
    };

    K.crear({ id: 'tirachinas', fondo: '#a5d8ff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
