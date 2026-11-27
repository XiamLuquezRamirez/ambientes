/**
 * «Corta la cuerda» — motor propio de Sonidos de Animales (3-4 años, ¿Qué sonido escuchas?).
 *
 * En el granero cuelgan cajas con animales de las vigas, mecidas por el viento. Suena un animal y,
 * cuando aparecen las cajas, el niño DESLIZA el dedo por la cuerda de la caja del animal que
 * escuchó: la cuerda se corta, la caja cae y se abre. Si era ese, el animal sale saltando; si no,
 * suena su propio sonido y la caja vuelve a subir por una cuerda nueva (sin castigo).
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    function cruza(p1, p2, a, b) {
        // ¿El segmento p1-p2 corta al segmento a-b?
        function o(p, q, r) { return (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x); }
        var d1 = o(a, b, p1), d2 = o(a, b, p2), d3 = o(p1, p2, a), d4 = o(p1, p2, b);
        return d1 * d2 < 0 && d3 * d4 < 0;
    }

    // Arte del diseñador: fondo del granero (1280x720; viga principal y 102-138, paja desde y≈568) y marco colgante
    // (lienzo de 350.83x500: cuerda arriba, cuerpo 318 de ancho con centro en 175.4, 331.5 y panel blanco útil).
    var ARTE = { w: 1280, h: 720, viga: 132, suelo: 640 };
    var CUADRO = { w: 350.83, h: 500, cx: 175.4, cy: 331.5, cuerpo: 318, arriba: 319.5, img: [6, -1] };

    var escena = {
        precargar: function () {
            if (!this.textures.exists('cd_fondo')) this.load.svg('cd_fondo', 'img/diseno/fondo.svg', { width: 1280, height: 720 });
            if (!this.textures.exists('cd_cuadro')) this.load.svg('cd_cuadro', 'img/diseno/cuadro.svg', { width: 526, height: 750 });
        },

        iniciar: function () {
            this.cortes = [];
            this.cosas = [];
            this.reunidos = [];
            this.trazo = null;
            this.ocupado = false;
        },

        filtrarPool: function (pool) {
            var f = pool.filter(function (id) { return K.ANIMALES.indexOf(id) >= 0; });
            return f.length >= 4 ? f : pool;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.viga = Math.round(H * 0.17);
            L.suelo = Math.round(H * 0.86);
            if (this.arteOk) { L.viga = Math.round(ARTE.viga * H / ARTE.h); L.suelo = Math.round(ARTE.suelo * H / ARTE.h); }
            L.tam = Math.max(86, Math.min(140, (L.der - 60) / 4.4, H * 0.2));
            L.largo = Math.round(H * (this.arteOk ? 0.1 : 0.2));
            L.bocina = { x: 48, y: Math.round(H * 0.3), r: Math.max(24, Math.min(32, hueco * 0.28)) };
            return L;
        },

        armar: function (reubicar) {
            this.arteOk = this.textures.exists('cd_fondo') && this.textures.exists('cd_cuadro') && this.scale.width >= 900;
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            if (this.arteOk) {
                keep(this.add.image(0, 0, 'cd_fondo').setOrigin(0, 0).setDisplaySize(L.W, L.H).setDepth(1));
                this.rayosG = keep(this.add.graphics().setDepth(2));
                this.sogasG = keep(this.add.graphics().setDepth(12));
                this.trazoG = keep(this.add.graphics().setDepth(80));
                this.montarHud(keep);
                this.sembrarMotes(keep, 26, { x: 0, y: L.viga, w: L.W, h: L.suelo - L.viga, depth: 7 }, 0xffe9a8);
                if (reubicar) this.ubicarCosas();
                return;
            }
            K.textura(this, 'cuerda_fondo', L.W, L.H, function (x, w, h) {
                K.madera(x, 0, 0, w, h, { claro: '#c58b4f', medio: '#a96d34', oscuro: '#8a5524', r: 0 });
                // tablones verticales con juntas
                x.strokeStyle = 'rgba(40,20,5,0.35)'; x.lineWidth = 3;
                for (var i = 0; i < w; i += 96) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); }
                // ventana de luz
                x.fillStyle = '#ffe9a8'; x.fillRect(w * 0.08, h * 0.28, w * 0.16, h * 0.3);
                x.strokeStyle = '#5c3a14'; x.lineWidth = 8; x.strokeRect(w * 0.08, h * 0.28, w * 0.16, h * 0.3);
                x.beginPath(); x.moveTo(w * 0.16, h * 0.28); x.lineTo(w * 0.16, h * 0.58); x.moveTo(w * 0.08, h * 0.43); x.lineTo(w * 0.24, h * 0.43); x.stroke();
                // piso de paja
                x.fillStyle = '#e9c46a'; x.fillRect(0, L.suelo, w, h - L.suelo);
                x.strokeStyle = '#c9a227'; x.lineWidth = 2;
                for (var j = 0; j < 140; j++) { var px = (j * 53) % w, py = L.suelo + ((j * 29) % (h - L.suelo)); x.beginPath(); x.moveTo(px, py); x.lineTo(px + 12, py - 5); x.stroke(); }
            });
            keep(this.add.image(0, 0, 'cuerda_fondo').setOrigin(0, 0).setDepth(1));
            var haz = keep(this.add.graphics().setDepth(2));
            haz.fillStyle(0xfff3bf, 0.14);
            haz.fillTriangle(L.W * 0.1, L.H * 0.3, L.W * 0.22, L.H * 0.3, L.W * 0.5, L.suelo);
            haz.fillTriangle(L.W * 0.1, L.H * 0.3, L.W * 0.5, L.suelo, L.W * 0.36, L.suelo);
            var viga = keep(this.add.graphics().setDepth(5));
            viga.fillStyle(0x5c3a14, 1); viga.fillRoundedRect(-10, L.viga - 18, L.W + 20, 34, 8);
            viga.fillStyle(0x7a4e1e, 1); viga.fillRect(-10, L.viga - 18, L.W + 20, 10);
            this.sogasG = keep(this.add.graphics().setDepth(12));
            this.trazoG = keep(this.add.graphics().setDepth(80));
            this.montarHud(keep);
            this.sembrarMotes(keep, 16, { x: 0, y: 0, w: L.W, h: L.suelo, depth: 7 }, 0xfff3bf);
            if (reubicar) this.ubicarCosas();
        },

        lugares: function (n) {
            var L = this.L;
            var x0 = 90, disp = L.der - x0 - 40;
            var out = [];
            for (var i = 0; i < n; i++) out.push({ x: x0 + disp * (i + 0.5) / n, y: L.viga + L.largo + (i % 2 ? L.tam * 0.25 : 0) + (this.arteOk ? L.tam * 1.0 : L.tam * 0.5) });
            return out;
        },

        ubicarCosas: function () {
            var lug = this.lugares(this.cosas.length);
            this.cosas.forEach(function (a, i) { a.x0 = lug[i].x; a.casa = { x: lug[i].x, y: lug[i].y }; if (!a.cortada) a.cont.setPosition(lug[i].x, lug[i].y); });
        },

        crearCaja: function (id, i, lug, tam) {
            if (this.arteOk) {
                // Marco colgante del diseño: la cuerda corta de arriba viaja con la caja; el animal va en el panel blanco.
                var k = tam / CUADRO.cuerpo, b = this.crearCosa(id, lug.x, lug.y - 120, tam * 0.7, { depth: 30, sinSombra: true });
                var fr = this.add.image(0, 0, 'cd_cuadro').setOrigin(CUADRO.cx / CUADRO.w, CUADRO.cy / CUADRO.h).setDisplaySize(CUADRO.w * k, CUADRO.h * k);
                b.cont.addAt(fr, 0);
                b.img.setPosition(CUADRO.img[0] * k, CUADRO.img[1] * k);
                b.arriba = CUADRO.arriba * k;
                b.tam = tam; b.x0 = lug.x; b.casa = { x: lug.x, y: lug.y }; b.prof = 30; b.fase2 = Math.random() * 6;
                b.cortada = false;
                b.cont.setAlpha(0);
                return b;
            }
            var a = this.crearCosa(id, lug.x, lug.y - 120, tam * 0.62, { depth: 30, sinSombra: true });
            var g = this.add.graphics();
            var t = tam;
            g.fillStyle(0x000000, 0.2); g.fillRoundedRect(-t * 0.5 + 4, -t * 0.5 + 8, t, t, 10);
            g.fillStyle(0xc58b4f, 1); g.fillRoundedRect(-t * 0.5, -t * 0.5, t, t, 10);
            g.lineStyle(5, 0x7a4e1e, 1); g.strokeRoundedRect(-t * 0.5, -t * 0.5, t, t, 10);
            g.fillStyle(0xfff3d9, 1); g.fillRoundedRect(-t * 0.36, -t * 0.36, t * 0.72, t * 0.72, 8);
            g.lineStyle(4, 0x7a4e1e, 1);
            g.lineBetween(-t * 0.5, -t * 0.12, t * 0.5, -t * 0.12); g.lineBetween(-t * 0.5, t * 0.28, t * 0.5, t * 0.28);
            // la imagen va por encima de las tablas
            a.cont.addAt(g, 0);
            a.cont.bringToTop(a.img);
            a.tam = t; a.x0 = lug.x; a.casa = { x: lug.x, y: lug.y }; a.prof = 30; a.fase2 = Math.random() * 6;
            a.cortada = false;
            a.cont.setAlpha(0);
            return a;
        },

        mostrarOpciones: async function (nv) {
            var self = this;
            var lug = this.lugares(nv.opciones.length);
            var tam = Math.min(this.L.tam, (this.L.der - 120) / nv.opciones.length * 0.8);
            this.cosas = nv.opciones.map(function (id, i) { return self.crearCaja(id, i, lug[i], tam); });
            K.ruido({ f: 900, q: 1, dur: 0.1, vol: 0.05 });
            await Promise.all(this.cosas.map(function (a, i) {
                return esperar(self, i * 120).then(function () { return tw(self, { targets: a.cont, alpha: 1, y: a.casa.y, duration: 380, ease: 'Bounce.easeOut' }); });
            }));
        },

        prepararNivel: async function () {
            await this.retirar(this.cosas);
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.cosas = [];
            this.ocupado = false;
        },

        alSonar: function () {
            Ut.estallido(this, this.L.W * 0.3, this.L.viga + 20, { n: 3, tex: 'nota', tam: 24, dist: 90, depth: 70 });
        },

        /* ── Cortar con el dedo ── */

        extremos: function (a) {
            var L = this.L;
            return { a: { x: a.x0, y: L.viga + 8 }, b: { x: a.cont.x, y: a.cont.y - a.tam * 0.45 } };
        },

        alTocar: function (p) { if (this.fase === 'jugar') this.trazo = { x: p.x, y: p.y }; },

        alMover: function (p) {
            if (!this.trazo || this.fase !== 'jugar' || this.ocupado) return;
            var ant = this.trazo, g = this.trazoG;
            if (g && g.active) { g.lineStyle(6, 0xffffff, 0.9); g.lineBetween(ant.x, ant.y, p.x, p.y); this.time.delayedCall(140, function () { if (g.active) g.clear(); }); }
            for (var i = 0; i < this.cosas.length; i++) {
                var a = this.cosas[i];
                if (a.cortada) continue;
                var e = this.extremos(a);
                if (cruza(ant, p, e.a, e.b)) { this.trazo = null; this.cortar(a); return; }
            }
            this.trazo = { x: p.x, y: p.y };
        },

        alSoltar: function () { this.trazo = null; },

        cortar: async function (a) {
            if (this.ocupado || this.fase !== 'jugar') return;
            this.ocupado = true;
            this.pista.reiniciar();
            a.cortada = true;
            K.tono({ f: 1400, f2: 500, dur: 0.12, vol: 0.06, tipo: 'sawtooth' });
            Ut.estallido(this, a.cont.x, a.cont.y - a.tam * 0.7, { n: 6, tex: 'chispa', tam: 16, dist: 50, depth: 60, sinTinte: true });
            // El cabo que queda en la viga se balancea y se desvanece.
            this.cortes.push({ x: a.x0, t0: this.time.now, tope: a.arriba ? a.cont.y - a.arriba : null });
            a.cont.setDepth(40);
            await tw(this, { targets: a.cont, y: this.L.suelo - a.tam * 0.5, angle: a.cont.x < this.L.der / 2 ? -8 : 8, duration: 520, ease: 'Bounce.easeOut' });
            this.cameras.main.shake(100, 0.003);
            Ut.estallido(this, a.cont.x, this.L.suelo, this.arteOk ? { n: 12, tex: 'humo', tam: 24, dist: 70, depth: 50, colores: [0xe9c46a, 0xf3d98a, 0xd9a93a] } : { n: 8, tex: 'humo', tam: 26, dist: 60, depth: 50 });
            this.cajaActual = a;
            var ok = await this.elegir(a.id, { x: a.cont.x, y: a.cont.y });
            if (ok === false) await this.colgarDeNuevo(a);
            this.ocupado = false;
        },

        colgarDeNuevo: async function (a) {
            await tw(this, { targets: a.cont, y: a.casa.y, angle: 0, duration: 650, ease: 'Sine.easeInOut' });
            a.cont.setDepth(30);
            a.cortada = false;
            K.ruido({ f: 700, q: 1, dur: 0.08, vol: 0.05 });
        },

        alAcertar: async function () {
            var a = this.cajaActual;
            if (!a) return;
            this.reunidos.push(a.id);
            a.cont.setAngle(0);
            Ut.estallido(this, a.cont.x, a.cont.y - a.tam * 0.3, { n: 14, tex: 'estrella', tam: 28, dist: 140, depth: 70, sinTinte: true });
            a.saltito(0.5, 3);
            await this.sonar(a.id, { breve: true, bocina: false });
            await esperar(this, 250);
        },

        alFallar: async function () {
            var a = this.cajaActual;
            if (!a) return;
            a.sacudir();
            await esperar(this, 500);
        },

        alTerminarNivel: async function () {
            await this.retirar(this.cosas);
            this.cosas = [];
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            var a = this.correctaDe(this.cosas.filter(function (c) { return !c.cortada; }));
            if (!a || !this.ayuda) {
                if (this.bocina) this.tweens.add({ targets: this.bocina, scale: 1.18, duration: 220, yoyo: true, repeat: 2 });
                return esperar(this, 900);
            }
            var e = this.extremos(a);
            var mx = (e.a.x + e.b.x) / 2, my = (e.a.y + e.b.y) / 2;
            return this.ctx.mano({ punto: { x: mx - 50, y: my }, holdMs: 100, arrastre: { dx: 100, dy: 0, durMs: 700 }, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
        },

        demoPaso: function () {
            var self = this;
            var a = this.correctaDe(this.cosas);
            if (!a) return null;
            var e = this.extremos(a);
            var mx = (e.a.x + e.b.x) / 2, my = (e.a.y + e.b.y) / 2;
            return { desde: { x: mx - 50, y: my }, hasta: { x: mx + 50, y: my }, hacer: function () { return self.cortar(a); } };
        },

        escenaFinal: async function () {
            var self = this, L = this.L;
            await this.retirar(this.cosas);
            this.cosas = [];
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; }).slice(0, 5);
            if (!ids.length) ids = ['perro', 'gato', 'pajaro'];
            var tam = Math.min(L.tam, (L.der - 100) / ids.length * 0.9);
            for (var i = 0; i < ids.length; i++) {
                if (!this.sigue()) return;
                var x = 80 + (L.der - 120) * (i + 0.5) / ids.length;
                var a = this.crearCosa(ids[i], x, -60, tam * 0.9, { depth: 30 });
                await this.saltarA(a.cont, x, L.suelo - tam * 0.45, { ms: 520, alto: 160 });
                a.saltito(0.3, 2);
                Ut.estallido(this, x, L.suelo - tam, { n: 10, tex: 'estrella', tam: 26, dist: 130, depth: 70, sinTinte: true });
                await this.sonar(ids[i], { breve: true, bocina: false });
            }
            Ut.confeti(this, 90);
            await esperar(this, 1100);
        },

        estadoExtra: function () {
            var self = this;
            return {
                cosas: this.cosas.filter(function (a) { return a.cont.active; }).map(function (a) { var e = self.extremos(a); return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y), cortada: a.cortada, cuerda: { a: e.a, b: e.b } }; })
            };
        },

        paso: function (time) {
            var L = this.L, self = this;
            var g = this.sogasG;
            var rg = this.rayosG;
            if (rg && rg.active) {
                // Haces de luz que se cuelan entre las tablas del techo.
                rg.clear();
                var s = time / 1000;
                [[0.27, 0.0], [0.56, 1.7], [0.80, 3.1]].forEach(function (q, i) {
                    var x0 = L.W * q[0], al = 0.05 + 0.035 * Math.sin(s * 0.8 + q[1]), w = 26 + 8 * Math.sin(s * 0.5 + i), dx = L.W * 0.12;
                    rg.fillStyle(0xfff3bf, al); rg.fillTriangle(x0, L.viga, x0 + w, L.viga, x0 + dx + w, L.suelo);
                    rg.fillTriangle(x0, L.viga, x0 + dx + w, L.suelo, x0 + dx - w * 0.4, L.suelo);
                });
            }
            this.cosas.forEach(function (a, i) {
                if (!a.cont.active || a.cortada || self.tweens.isTweening(a.cont)) return;
                a.cont.x = a.x0 + Math.sin(time / 900 + a.fase2) * 10;
                a.cont.angle = Math.sin(time / 900 + a.fase2) * 3;
            });
            if (!g || !g.active) return;
            g.clear();
            this.cosas.forEach(function (a) {
                if (!a.cont.active || a.cortada) return;
                if (a.arriba) {
                    // Cuerda del mismo color que el cabo del marco; termina donde empieza el cabo (sigue el balanceo).
                    var ang = a.cont.rotation, tx = a.cont.x + Math.sin(ang) * a.arriba, ty = a.cont.y - Math.cos(ang) * a.arriba;
                    g.lineStyle(Math.max(5, a.tam * 0.075), 0xb86135, 1); g.lineBetween(a.x0, L.viga + 4, tx, ty);
                    g.lineStyle(2, 0x8b3020, 0.8); g.lineBetween(a.x0 + 2, L.viga + 4, tx + 2, ty);
                    return;
                }
                g.lineStyle(6, 0xf1e0b0, 1); g.lineBetween(a.x0, L.viga + 8, a.cont.x, a.cont.y - a.tam * 0.5);
                g.lineStyle(2, 0x9c7a3c, 0.7); g.lineBetween(a.x0 + 2, L.viga + 8, a.cont.x + 2, a.cont.y - a.tam * 0.5);
            });
            this.cortes = (this.cortes || []).filter(function (c) { return time - c.t0 < 900; });
            this.cortes.forEach(function (c) {
                var t = (time - c.t0) / 1000, ang = Math.sin(t * 14) * 0.55 * Math.exp(-t * 3), len = 54;
                g.lineStyle(6, 0xb86135, 1 - t / 0.9); g.lineBetween(c.x, L.viga + 4, c.x + Math.sin(ang) * len, L.viga + 4 + Math.cos(ang) * len);
            });
        }
    };

    K.crear({ id: 'cuerda', fondo: '#a96d34', escena: escena });
})(typeof window !== 'undefined' ? window : this);
