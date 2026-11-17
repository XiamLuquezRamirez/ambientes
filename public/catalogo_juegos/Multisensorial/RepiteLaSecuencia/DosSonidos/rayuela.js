/**
 * «La rayuela del jardín» — motor propio de Dos Sonidos (3-4 años, Repite la secuencia).
 *
 * En el patio hay una rayuela dibujada con tiza y una mariquita en la casilla de SALIDA. Mientras
 * suenan los sonidos, la mariquita escucha moviendo las antenas (no delata cuáles son). Después
 * aparecen las casillas con los animales y el niño las TOCA en el mismo orden en que sonaron: la
 * mariquita salta de casilla en casilla. Si se equivoca, la mariquita resbala, vuelve a la salida y
 * la secuencia suena otra vez («¡Escuchemos otra vez!»). Al acertar, salta de nuevo por todo el
 * camino y el jardín florece.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    var COLORES = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xcc5de8, 0xff922b];
    var PETALOS = [0xff8787, 0xffd43b, 0xf783ac, 0xb197fc, 0x74c0fc];

    function pintarMariquita(g, r) {
        g.fillStyle(0x212529, 1);
        g.fillCircle(0, -r * 0.55, r * 0.42);                       // cabeza
        g.fillStyle(0xffffff, 1);
        g.fillCircle(-r * 0.17, -r * 0.62, r * 0.12);
        g.fillCircle(r * 0.17, -r * 0.62, r * 0.12);
        g.fillStyle(0x212529, 1);
        g.fillCircle(-r * 0.15, -r * 0.6, r * 0.05);
        g.fillCircle(r * 0.19, -r * 0.6, r * 0.05);
        g.lineStyle(Math.max(2, r * 0.07), 0x212529, 1);            // antenas
        g.lineBetween(-r * 0.12, -r * 0.88, -r * 0.34, -r * 1.22);
        g.lineBetween(r * 0.12, -r * 0.88, r * 0.34, -r * 1.22);
        g.fillCircle(-r * 0.36, -r * 1.25, r * 0.07);
        g.fillCircle(r * 0.36, -r * 1.25, r * 0.07);
        g.fillStyle(0xe03131, 1);
        g.fillEllipse(0, r * 0.05, r * 1.7, r * 1.75);              // caparazón
        g.fillStyle(0xff8787, 0.55);
        g.fillEllipse(-r * 0.35, -r * 0.35, r * 0.5, r * 0.34);
        g.lineStyle(Math.max(2, r * 0.08), 0x212529, 1);
        g.lineBetween(0, -r * 0.8, 0, r * 0.9);
        g.fillStyle(0x212529, 1);
        [[-0.4, -0.2], [0.4, -0.2], [-0.45, 0.35], [0.45, 0.35], [-0.2, 0.7], [0.2, 0.7]].forEach(function (p) {
            g.fillCircle(p[0] * r, p[1] * r, r * 0.14);
        });
    }

    var escena = {
        iniciar: function () {
            this.cosas = [];
            this.bicho = null;
            this.reunidos = [];
            this.brotes = [];
        },

        filtrarPool: function (pool) {
            var ok = K.ANIMALES;
            var f = pool.filter(function (id) { return ok.indexOf(id) >= 0; });
            return f.length >= 6 ? f : pool;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.pres = W >= 900 ? { x: W - 88, piso: H - 96, alto: Math.min(165, H * 0.28), modelo: 'nina', giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.horizonte = Math.round(H * 0.36);
            L.tam = Math.max(78, Math.min(132, (L.der - 150) / 5.2, H * 0.19));
            L.fila = Math.round(H * 0.7);
            L.salida = { x: Math.max(66, L.tam * 0.7), y: L.fila };
            L.bocina = { x: L.salida.x, y: L.fila - L.tam * 1.35, r: Math.max(24, Math.min(32, hueco * 0.28)) };
            return L;
        },

        armar: function (reubicar) {
            var self = this;
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            var V = this.montarVida(keep);
            if (V) {
                V.parque({ horizonte: L.horizonte, arboles: [0.05, 0.2, 0.8, 0.95], solX: 0.84 });
                V.mariposas(3, { x: 0, y: L.horizonte - 40, w: L.W, h: L.H * 0.45, depth: 8 });
            }
            // Pasto, cerca blanca y camino de baldosas.
            var pasto = keep(this.add.graphics().setDepth(1.5));
            pasto.fillStyle(0x8ce99a, 1); pasto.fillRect(0, L.horizonte, L.W, L.H - L.horizonte);
            pasto.fillStyle(0x69db7c, 1); pasto.fillRect(0, L.horizonte, L.W, 8);
            pasto.fillStyle(0x51cf66, 0.5);
            for (var i = 0; i < 70; i++) {
                var gx = (i * 97) % L.W, gy = L.horizonte + 14 + ((i * 53) % Math.max(10, L.H - L.horizonte - 20));
                pasto.fillTriangle(gx, gy, gx + 4, gy - 11, gx + 8, gy);
            }
            var cerca = keep(this.add.graphics().setDepth(1.8));
            cerca.fillStyle(0xf8f9fa, 1);
            for (var c = 0; c < L.W; c += 34) {
                cerca.fillRoundedRect(c, L.horizonte - 30, 20, 40, 4);
                cerca.fillTriangle(c, L.horizonte - 30, c + 20, L.horizonte - 30, c + 10, L.horizonte - 42);
            }
            cerca.fillStyle(0xdee2e6, 1);
            cerca.fillRect(0, L.horizonte - 16, L.W, 6);
            cerca.fillRect(0, L.horizonte - 2, L.W, 6);
            var camino = keep(this.add.graphics().setDepth(2));
            var cy0 = L.fila - L.tam * 0.78, ch = L.tam * 1.56;
            camino.fillStyle(0xe9d8a6, 1); camino.fillRoundedRect(-10, cy0, L.W + 20, ch, 24);
            camino.fillStyle(0xd9c48a, 1); camino.fillRect(-10, cy0 + ch - 10, L.W + 20, 10);
            camino.fillStyle(0xc8b077, 0.55);
            for (var k = 0; k < 90; k++) camino.fillCircle((k * 71) % L.W, cy0 + 8 + ((k * 37) % (ch - 18)), 2 + (k % 3));
            // Flores del borde.
            var flores = keep(this.add.graphics().setDepth(2.5));
            for (var f = 0; f < 22; f++) {
                var fx = (f * 131 + 40) % L.W, fy = L.horizonte + 22 + ((f * 61) % Math.max(10, cy0 - L.horizonte - 40));
                if (fy > cy0 - 6) fy = cy0 - 10 - (f % 4) * 8;
                flores.lineStyle(2, 0x2b8a3e, 1); flores.lineBetween(fx, fy, fx, fy + 14);
                flores.fillStyle(PETALOS[f % PETALOS.length], 1);
                for (var q = 0; q < 5; q++) flores.fillCircle(fx + Math.cos(q * 1.2566) * 6, fy + Math.sin(q * 1.2566) * 6, 4.2);
                flores.fillStyle(0xfff3bf, 1); flores.fillCircle(fx, fy, 3.2);
            }
            this.sembrarMotes(keep, 12, { x: 0, y: L.horizonte, w: L.W, h: L.H - L.horizonte, depth: 8 }, 0xfff3bf);
            this.montarSalida(keep);
            this.montarHud(keep);
            this.montarBicho(!!reubicar);
            if (reubicar) this.ubicarCosas();
        },

        /** Casilla de salida con el poste de la bocina. */
        montarSalida: function (keep) {
            var L = this.L, S = L.salida;
            var g = keep(this.add.graphics().setDepth(3));
            g.fillStyle(0x6d4c41, 1);
            g.fillRect(S.x - 5, L.bocina.y + L.bocina.r - 4, 10, S.y - (L.bocina.y + L.bocina.r) - L.tam * 0.28);
            var t = L.tam * 0.8;
            g.fillStyle(0x000000, 0.14); g.fillRoundedRect(S.x - t / 2 + 4, S.y - t / 2 + 8, t, t, 14);
            g.fillStyle(0xfff3bf, 1); g.fillRoundedRect(S.x - t / 2, S.y - t / 2, t, t, 14);
            g.lineStyle(5, 0xfab005, 1); g.strokeRoundedRect(S.x - t / 2, S.y - t / 2, t, t, 14);
            g.fillStyle(0xfab005, 1);
            g.fillTriangle(S.x - t * 0.18, S.y - t * 0.2, S.x - t * 0.18, S.y + t * 0.2, S.x + t * 0.22, S.y);
        },

        montarBicho: function (reubicar) {
            var L = this.L;
            if (this.bicho && this.bicho.cont.active) {
                if (reubicar && !this.bicho.cont.getData('enCasilla')) this.bicho.cont.setPosition(L.salida.x, L.salida.y);
                return;
            }
            var r = L.tam * 0.2;
            var c = this.add.container(L.salida.x, L.salida.y).setDepth(60);
            var sombra = this.add.ellipse(0, r * 0.95, r * 1.7, r * 0.5, 0x000000, 0.2);
            var cuerpo = this.add.container(0, 0);
            var g = this.add.graphics();
            pintarMariquita(g, r);
            cuerpo.add(g);
            c.add([sombra, cuerpo]);
            this.bicho = { id: 'bicho', cont: c, cuerpo: cuerpo, sombra: sombra, r: r, tam: L.tam * 0.9, casa: { x: L.salida.x, y: L.salida.y }, prof: 60 };
        },

        /* ── Casillas ── */

        lugares: function (n) {
            var L = this.L;
            var x0 = L.salida.x + L.tam * 1.35;
            var disp = L.der - x0 - L.tam * 0.55;
            var paso = Math.min(L.tam * 1.35, n > 1 ? disp / (n - 1) : 0);
            var total = paso * (n - 1);
            var ini = x0 + Math.max(0, (disp - total) / 2);
            var out = [];
            for (var i = 0; i < n; i++) out.push({ x: ini + i * paso, y: L.fila + (i % 2 ? -1 : 1) * L.tam * 0.07 });
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

        crearCasilla: function (id, i, lug, tam) {
            var self = this;
            var a = this.crearCosa(id, lug.x, lug.y + 50, tam * 0.86, { depth: 30, sinSombra: true });
            var col = COLORES[i % COLORES.length];
            var g = this.add.graphics();
            var t = tam * 1.02;
            g.fillStyle(0x000000, 0.16); g.fillRoundedRect(-t / 2 + 3, -t / 2 + 8, t, t, 16);
            g.fillStyle(0xffffff, 1); g.fillRoundedRect(-t / 2, -t / 2, t, t, 16);
            g.lineStyle(6, col, 1); g.strokeRoundedRect(-t / 2, -t / 2, t, t, 16);
            g.fillStyle(col, 0.16); g.fillRoundedRect(-t / 2 + 8, -t / 2 + 8, t - 16, t - 16, 12);
            var aura = this.add.graphics();
            aura.lineStyle(8, 0x51cf66, 1); aura.strokeRoundedRect(-t / 2 - 4, -t / 2 - 4, t + 8, t + 8, 20);
            aura.setAlpha(0);
            a.cont.addAt(g, 0);
            a.cont.addAt(aura, 1);
            a.aura = aura;
            a.casilla = g;
            a.tam = tam;
            a.casa = { x: lug.x, y: lug.y };
            a.prof = 30;
            a.cont.setAlpha(0);
            return a;
        },

        mostrarOpciones: async function (nv) {
            var self = this;
            var n = nv.opciones.length;
            var lug = this.lugares(n);
            var tam = Math.min(this.L.tam, (this.L.der - this.L.salida.x - this.L.tam * 1.4) / n * 0.95);
            this.cosas = nv.opciones.map(function (id, i) { return self.crearCasilla(id, i, lug[i], tam); });
            K.ruido({ f: 1500, q: 1, dur: 0.07, vol: 0.05 });
            await Promise.all(this.cosas.map(function (a, i) {
                return esperar(self, i * 110).then(function () {
                    return tw(self, { targets: a.cont, alpha: 1, y: a.casa.y, duration: 340, ease: 'Back.easeOut' });
                });
            }));
        },

        prepararNivel: async function () {
            await this.retirar(this.cosas);
            this.cosas = [];
            this.limpiarAuras();
            await this.bichoA(this.L.salida.x, this.L.salida.y, 0);
        },

        /** Lleva a la mariquita en arco hasta (x, y); ms = 0 la coloca sin animar. */
        bichoA: async function (x, y, ms) {
            var b = this.bicho;
            if (!b) return;
            if (!ms) { b.cont.setPosition(x, y); return; }
            K.tono({ f: 520, f2: 760, dur: 0.1, vol: 0.04 });
            await Promise.all([
                this.saltarA(b.cont, x, y, { ms: ms, alto: this.L.tam * 0.7 }),
                tw(this, { targets: b.cuerpo, angle: 360, duration: ms, onComplete: function () { b.cuerpo.angle = 0; } })
            ]);
            tw(this, { targets: b.cuerpo, scaleY: 0.82, scaleX: 1.12, duration: 80, yoyo: true });
        },

        enCasilla: function (a) {
            return { x: a.cont.x + a.tam * 0.22, y: a.cont.y + a.tam * 0.3 };
        },

        limpiarAuras: function () {
            var self = this;
            this.cosas.forEach(function (a) {
                if (a.aura && a.aura.active) self.tweens.add({ targets: a.aura, alpha: 0, duration: 180 });
            });
        },

        /* ── Mientras suena la secuencia: la mariquita escucha ── */

        alSonar: function (id, k) {
            var b = this.bicho;
            if (!b) return;
            this.tweens.killTweensOf(b.cuerpo);
            b.cuerpo.setAngle(0).setScale(1);
            this.tweens.add({ targets: b.cuerpo, angle: { from: -14, to: 14 }, duration: 110, yoyo: true, repeat: 3, onComplete: function () { b.cuerpo.angle = 0; } });
            this.tweens.add({ targets: b.cuerpo, scaleY: 1.12, duration: 160, yoyo: true, repeat: 1 });
            Ut.estallido(this, b.cont.x, b.cont.y - this.L.tam * 0.45, { n: 3, tex: 'nota', tam: 24, dist: 70, depth: 70, sinTinte: false });
        },

        /* ── El niño toca las casillas en orden ── */

        alTocar: async function (p) {
            if (this.fase !== 'jugar') return;
            // La mariquita se puede AGARRAR y llevar de casilla en casilla (o tocar la casilla directamente).
            var b = this.bicho;
            if (b && Math.hypot(p.x - b.cont.x, p.y - b.cont.y) < this.L.tam * 0.42) {
                this.tomar(p, [b]);
                if (this.arrastrando) { b.cont.setDepth(70); return; }
            }
            var a = this.cosaEn(this.cosas, p.x, p.y, this.cosas.length ? this.cosas[0].tam * 0.62 : 60);
            if (!a || a.hecha) return;
            this.pista.reiniciar();
            await this.tocarOrden(a, { x: a.cont.x, y: a.cont.y });
        },

        casillaCerca: function () {
            var b = this.bicho;
            return this.cosaEn(this.cosas.filter(function (c) { return !c.hecha; }), b.cont.x, b.cont.y, this.L.tam * 0.7);
        },

        alMover: function (p) {
            var a = this.llevar(p);
            if (!a) return;
            var cerca = this.casillaCerca();
            this.cosas.forEach(function (c) { if (!c.hecha && c.aura) c.aura.setAlpha(c === cerca ? 0.8 : 0); });
            a.cuerpo.angle = Math.sin(this.time.now / 60) * 12;
            if (this.time.now - (this.ultPolvo || 0) > 90) { this.ultPolvo = this.time.now; Ut.estallido(this, a.cont.x, a.cont.y + 10, { n: 1, tex: 'chispa', tam: 14, dist: 30, depth: 55, sinTinte: true }); }
        },

        alSoltar: async function () {
            var b = this.soltar();
            if (!b) return;
            b.cuerpo.angle = 0;
            var casa = this.fase === 'jugar' ? this.casillaCerca() : null;
            this.cosas.forEach(function (c) { if (!c.hecha && c.aura) c.aura.setAlpha(0); });
            if (!casa) { this.aCasa(b, true); return; }
            b.cont.setDepth(60);
            await this.tocarOrden(casa, { x: casa.cont.x, y: casa.cont.y });
        },

        alMarcar: async function (id, k) {
            var a = this.tocado;
            if (!a) return;
            a.hecha = true;
            a.cont.setDepth(35);
            a.aura.setAlpha(0);
            this.tweens.add({ targets: a.aura, alpha: 1, duration: 200 });
            var d = this.enCasilla(a);
            await this.bichoA(d.x, d.y, 460);
            this.bicho.casa = { x: this.L.salida.x, y: this.L.salida.y };
            a.saltito(0.12, 1);
            this.florecer(1);
            Ut.estallido(this, a.cont.x, a.cont.y - a.tam * 0.2, { n: 6, tex: 'estrella', tam: 20, dist: 90, depth: 70, sinTinte: true });
        },

        alFallar: async function (id) {
            var a = this.tocado;
            if (!a) return;
            var b = this.bicho;
            var d = this.enCasilla(a);
            // Intenta saltar, resbala y cae sentada.
            await this.saltarA(b.cont, d.x, d.y, { ms: 380, alto: this.L.tam * 0.5 });
            K.tono({ f: 330, f2: 180, dur: 0.22, vol: 0.05 });
            await Promise.all([
                a.sacudir(),
                tw(this, { targets: b.cuerpo, angle: 200, duration: 300, ease: 'Sine.easeOut' })
            ]);
        },

        alReiniciar: async function () {
            this.limpiarAuras();
            this.cosas.forEach(function (a) { a.hecha = false; });
            var b = this.bicho;
            if (b) {
                this.tweens.killTweensOf(b.cuerpo);
                await Promise.all([this.saltarA(b.cont, this.L.salida.x, this.L.salida.y, { ms: 520, alto: this.L.tam * 0.8 }), tw(this, { targets: b.cuerpo, angle: 360, duration: 520, onComplete: function () { b.cuerpo.angle = 0; } })]);
            }
        },

        alReescuchar: function (empieza) {
            if (!empieza) return;
            this.limpiarAuras();
        },

        /** Acierto: la mariquita repite todo el camino y cada animal suena en su casilla. */
        alAcertar: async function () {
            var self = this;
            var nv = this.nv;
            var b = this.bicho;
            await this.bichoA(this.L.salida.x, this.L.salida.y, 420);
            for (var i = 0; i < nv.correctas.length; i++) {
                if (!this.sigue()) return;
                var a = this.cosas.filter(function (q) { return q.id === nv.correctas[i]; })[0];
                if (!a) continue;
                var d = this.enCasilla(a);
                await this.bichoA(d.x, d.y, 360);
                this.tweens.add({ targets: a.aura, alpha: 1, duration: 120 });
                this.reunidos.push(a.id);
                a.latir();
                Ut.estallido(this, a.cont.x, a.cont.y - a.tam * 0.3, { n: 8, tex: 'estrella', tam: 24, dist: 110, depth: 70, sinTinte: true });
                await this.sonar(a.id, { breve: true, bocina: false });
                await esperar(this, 120);
            }
            this.florecer(8);
            await tw(this, { targets: b.cuerpo, angle: { from: -25, to: 25 }, duration: 130, yoyo: true, repeat: 3 });
            b.cuerpo.angle = 0;
        },

        /** Brotan flores en el camino: el jardín crece con cada acierto. */
        florecer: function (n) {
            var self = this;
            var L = this.L;
            for (var i = 0; i < n; i++) {
                var x = Math.random() * L.W;
                var y = L.fila + L.tam * (0.85 + Math.random() * 0.1) + (Math.random() < 0.5 ? 0 : 0);
                if (y > L.H - 12) y = L.H - 14;
                var f = this.add.container(x, y).setDepth(4).setScale(0);
                var g = this.add.graphics();
                g.lineStyle(3, 0x2b8a3e, 1); g.lineBetween(0, 0, 0, -22);
                g.fillStyle(PETALOS[(Math.random() * PETALOS.length) | 0], 1);
                for (var q = 0; q < 5; q++) g.fillCircle(Math.cos(q * 1.2566) * 8, -22 + Math.sin(q * 1.2566) * 8, 6);
                g.fillStyle(0xfff3bf, 1); g.fillCircle(0, -22, 4.5);
                f.add(g);
                this.brotes.push(f);
                this.tweens.add({ targets: f, scale: 1, duration: 450, delay: i * 70, ease: 'Back.easeOut' });
            }
            K.tono({ f: 880, f2: 1320, dur: 0.25, vol: 0.04 });
        },

        alTerminarNivel: async function (i, nv) {
            await this.retirar(this.cosas);
            this.cosas = [];
            if (this.bicho) await this.bichoA(this.L.salida.x, this.L.salida.y, 420);
        },

        mostrarPista: function (cancelada) {
            return this.pistaToque(cancelada, this.cosas);
        },

        demoPaso: function () { return this.demoOrden(this.cosas); },

        /** Fiesta: una rayuela larga con los animales de la partida y el jardín en flor. */
        escenaFinal: async function () {
            var self = this;
            var L = this.L;
            await this.retirar(this.cosas);
            this.cosas = [];
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; }).slice(0, 6);
            if (!ids.length) ids = ['perro', 'gato'];
            var lug = this.lugares(ids.length);
            var tam = Math.min(L.tam, (L.der - L.salida.x - L.tam * 1.4) / ids.length * 0.95);
            var tiles = ids.map(function (id, i) { return self.crearCasilla(id, i, lug[i], tam); });
            await Promise.all(tiles.map(function (a, i) {
                return esperar(self, i * 90).then(function () { return tw(self, { targets: a.cont, alpha: 1, y: a.casa.y, duration: 300, ease: 'Back.easeOut' }); });
            }));
            await this.bichoA(L.salida.x, L.salida.y, 300);
            for (var i = 0; i < tiles.length; i++) {
                if (!this.sigue()) return;
                var a = tiles[i];
                var d = this.enCasilla(a);
                await this.bichoA(d.x, d.y, 330);
                a.aura.setAlpha(1);
                a.saltito(0.18, 2);
                Ut.estallido(this, a.cont.x, a.cont.y - a.tam * 0.3, { n: 10, tex: 'estrella', tam: 26, dist: 130, depth: 70, sinTinte: true });
                await this.sonar(a.id, { breve: true, bocina: false });
            }
            this.florecer(26);
            Ut.confeti(this, 70);
            await esperar(this, 900);
            this.retirar(tiles);
        },

        estadoExtra: function () {
            return {
                casillas: this.cosas.filter(function (a) { return a.cont.active; }).map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y), hecha: !!a.hecha }; }),
                bicho: this.bicho ? { x: Math.round(this.bicho.cont.x), y: Math.round(this.bicho.cont.y) } : null
            };
        },

        paso: function (time) {
            var b = this.bicho;
            if (b && b.sombra && b.sombra.active) b.sombra.setScale(1 + Math.sin(time / 300) * 0.05);
            var amp = this.nivelActual >= 2 ? this.L.tam * (this.nivelActual >= 3 ? 0.26 : 0.16) : 0;
            var self = this;
            this.cosas.forEach(function (a, i) {
                if (!a.cont.active || !a.casa || self.tweens.isTweening(a.cont) || (self.arrastrando && self.arrastrando.a === a)) return;
                a.cont.angle = a.hecha ? 0 : Math.sin(time / 700 + i * 1.7) * 2.5;
                if (amp && !a.hecha) a.cont.x = a.casa.x + Math.sin(time / 1100 + i * 2.1) * amp;
            });
            this.brotes.forEach(function (f, i) { if (f.active) f.angle = Math.sin(time / 600 + i) * 4; });
        }
    };

    K.crear({ id: 'rayuela', fondo: '#a5d8ff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
