/**
 * «Las casitas del bosque» — motor propio de Tres Sonidos (3-4 años, Repite la secuencia).
 *
 * Un pajarito cartero espera en su árbol con una carta. Mientras suenan los sonidos, inclina la
 * cabeza escuchando (no delata cuáles son). Después aparecen las casitas del camino, cada una con su
 * ventana (el animal o el objeto), y el niño ARRASTRA al pajarito hasta la casita que sigue, en el
 * mismo orden en que sonó: se abre la puerta, suena, se enciende la ventana y sale humo de la
 * chimenea. Si lo lleva a otra casita, nadie abre («¡Escuchemos otra vez!») y la secuencia vuelve a
 * sonar. Al acertar, todas las casitas se encienden en orden y el bosque celebra.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    var PAREDES = [0xffa8a8, 0xffe066, 0x8ce99a, 0x91a7ff, 0xffc078, 0xe599f7];
    var TECHOS = [0xc92a2a, 0xe67700, 0x2b8a3e, 0x3b5bdb, 0xd9480f, 0x9c36b5];

    function pintarPajarito(g, r) {
        g.fillStyle(0x1c7ed6, 1);
        g.fillTriangle(-r * 0.7, r * 0.05, -r * 1.35, -r * 0.35, -r * 1.3, r * 0.45);     // cola
        g.fillStyle(0x339af0, 1);
        g.fillCircle(0, 0, r);                                                             // cuerpo
        g.fillStyle(0xd0ebff, 1);
        g.fillEllipse(r * 0.18, r * 0.35, r * 1.2, r * 0.8);                               // panza
        g.fillStyle(0x1c7ed6, 1);
        g.fillEllipse(-r * 0.2, r * 0.1, r * 0.95, r * 0.6);                               // ala
        g.fillStyle(0xffffff, 1); g.fillCircle(r * 0.45, -r * 0.3, r * 0.26);
        g.fillStyle(0x212529, 1); g.fillCircle(r * 0.52, -r * 0.3, r * 0.12);
        g.fillStyle(0xff922b, 1);
        g.fillTriangle(r * 0.85, -r * 0.2, r * 1.5, -r * 0.05, r * 0.85, r * 0.15);        // pico
        g.fillStyle(0x1c7ed6, 1);
        g.fillTriangle(-r * 0.05, -r * 0.95, r * 0.15, -r * 1.4, r * 0.3, -r * 0.9);        // cresta
        g.lineStyle(3, 0xff922b, 1);
        g.lineBetween(-r * 0.15, r * 0.95, -r * 0.15, r * 1.3);
        g.lineBetween(r * 0.25, r * 0.95, r * 0.25, r * 1.3);
    }

    function pintarCarta(g, w) {
        g.fillStyle(0x000000, 0.15); g.fillRoundedRect(-w / 2 + 2, -w * 0.3 + 3, w, w * 0.64, 4);
        g.fillStyle(0xffffff, 1); g.fillRoundedRect(-w / 2, -w * 0.32, w, w * 0.64, 4);
        g.lineStyle(2, 0xadb5bd, 1); g.strokeRoundedRect(-w / 2, -w * 0.32, w, w * 0.64, 4);
        g.lineStyle(2, 0xadb5bd, 1);
        g.lineBetween(-w / 2, -w * 0.32, 0, w * 0.04); g.lineBetween(w / 2, -w * 0.32, 0, w * 0.04);
        g.fillStyle(0xe03131, 1); g.fillCircle(0, w * 0.04, w * 0.09);
    }

    var escena = {
        iniciar: function () {
            this.cosas = [];
            this.pajaro = null;
            this.reunidos = [];
            this.humos = [];
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), modelo: 'nina', giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.horizonte = Math.round(H * 0.4);
            L.suelo = Math.round(H * 0.82);              // donde apoyan las casitas
            L.tam = Math.max(86, Math.min(150, (L.der - 190) / 4.4, H * 0.24));
            L.arbol = { x: Math.max(70, L.tam * 0.7), y: L.suelo };
            L.nido = { x: L.arbol.x, y: L.suelo - L.tam * 0.75 };     // donde espera el pajarito
            L.bocina = { x: L.arbol.x, y: Math.round(H * 0.2), r: Math.max(24, Math.min(32, hueco * 0.28)) };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            var V = this.montarVida(keep);
            if (V) {
                V.parque({ horizonte: L.horizonte, arboles: [0.3, 0.5, 0.7, 0.96], solX: 0.88 });
                V.mariposas(2, { x: 0, y: L.horizonte - 20, w: L.W, h: L.H * 0.4, depth: 8 });
            }
            var suelo = keep(this.add.graphics().setDepth(1.5));
            suelo.fillStyle(0x8ce99a, 1); suelo.fillRect(0, L.horizonte, L.W, L.H - L.horizonte);
            suelo.fillStyle(0x69db7c, 1); suelo.fillRect(0, L.horizonte, L.W, 8);
            // Sendero de tierra que une las casitas.
            suelo.fillStyle(0xe6c98f, 1); suelo.fillRoundedRect(-10, L.suelo - 10, L.W + 20, (L.H - L.suelo) * 0.75 + 12, 16);
            suelo.fillStyle(0xcfae6c, 0.6);
            for (var k = 0; k < 50; k++) suelo.fillCircle((k * 83) % L.W, L.suelo + 4 + ((k * 29) % Math.max(8, L.H - L.suelo - 14)), 2 + (k % 3));
            this.montarArbolNido(keep);
            this.sembrarMotes(keep, 12, { x: 0, y: L.horizonte, w: L.W, h: L.H - L.horizonte, depth: 8 }, 0xfff3bf);
            this.humoG = keep(this.add.graphics().setDepth(22));
            this.velo = keep(this.add.rectangle(0, 0, L.W, L.H, 0x2b1b5e, 0).setOrigin(0, 0).setDepth(25));
            this.montarHud(keep);
            this.montarPajaro(!!reubicar);
            if (reubicar) this.ubicarCosas();
        },

        montarArbolNido: function (keep) {
            var L = this.L, A = L.arbol;
            var g = keep(this.add.graphics().setDepth(3));
            var alto = L.tam * 1.7;
            g.fillStyle(0x7a4a1c, 1); g.fillRoundedRect(A.x - 14, A.y - alto * 0.62, 28, alto * 0.62, 6);
            g.fillStyle(0x2f9e44, 1); g.fillCircle(A.x, A.y - alto * 0.85, alto * 0.42);
            g.fillStyle(0x40c057, 1); g.fillCircle(A.x - alto * 0.22, A.y - alto * 0.68, alto * 0.28); g.fillCircle(A.x + alto * 0.24, A.y - alto * 0.7, alto * 0.26);
            // Buzón con la bocina como poste (el pajarito descansa a su lado).
            g.fillStyle(0x6d4c41, 1); g.fillRect(L.bocina.x - 5, L.bocina.y + L.bocina.r - 4, 10, L.nido.y - L.bocina.y - L.bocina.r - L.tam * 0.45);
            // Rama del nido.
            g.fillStyle(0x7a4a1c, 1); g.fillRoundedRect(A.x - 10, L.nido.y + L.tam * 0.28, L.tam * 0.95, 12, 6);
        },

        montarPajaro: function (reubicar) {
            var L = this.L;
            if (this.pajaro && this.pajaro.cont.active) {
                if (reubicar) { this.pajaro.casa = { x: L.nido.x, y: L.nido.y }; if (!this.arrastrando) this.pajaro.cont.setPosition(L.nido.x, L.nido.y); }
                return;
            }
            var r = L.tam * 0.22;
            var c = this.add.container(L.nido.x, L.nido.y).setDepth(60);
            var cuerpo = this.add.container(0, 0);
            var g = this.add.graphics(); pintarPajarito(g, r);
            var carta = this.add.graphics(); pintarCarta(carta, r * 1.3); carta.setPosition(r * 0.3, r * 1.0);
            cuerpo.add([g, carta]);
            c.add(cuerpo);
            this.pajaro = { id: 'pajarito', cont: c, cuerpo: cuerpo, carta: carta, tam: L.tam * 0.95, casa: { x: L.nido.x, y: L.nido.y }, prof: 60, r: r };
            this.tweens.add({ targets: cuerpo, y: -4, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        },

        /* ── Casitas ── */

        lugares: function (n) {
            var L = this.L;
            var x0 = L.nido.x + L.tam * 1.2;
            var disp = L.der - x0 - L.tam * 0.5;
            var paso = Math.min(L.tam * 1.3, n > 1 ? disp / (n - 1) : 0);
            var ini = x0 + Math.max(0, (disp - paso * (n - 1)) / 2);
            var out = [];
            for (var i = 0; i < n; i++) out.push({ x: ini + i * paso, y: L.suelo - L.tam * 0.5 + (i % 2 ? -1 : 1) * L.tam * 0.03 });
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

        crearCasita: function (id, i, lug, tam) {
            var a = this.crearCosa(id, lug.x, lug.y + 60, tam * 0.5, { depth: 30, sinSombra: true });
            var t = tam;
            var g = this.add.graphics();
            var pared = PAREDES[i % PAREDES.length], techo = TECHOS[i % TECHOS.length];
            g.fillStyle(0x000000, 0.15); g.fillEllipse(0, t * 0.52, t * 1.1, t * 0.16);
            g.fillStyle(pared, 1); g.fillRoundedRect(-t * 0.46, -t * 0.3, t * 0.92, t * 0.82, 8);       // pared
            g.fillStyle(0xffffff, 0.22); g.fillRect(-t * 0.42, -t * 0.26, t * 0.84, t * 0.07);
            g.fillStyle(0x7a4a1c, 1); g.fillRect(t * 0.22, -t * 0.62, t * 0.14, t * 0.26);              // chimenea
            g.fillStyle(techo, 1); g.fillTriangle(-t * 0.58, -t * 0.26, t * 0.58, -t * 0.26, 0, -t * 0.8);   // techo
            g.fillStyle(0xffffff, 0.2); g.fillTriangle(-t * 0.58, -t * 0.26, 0, -t * 0.8, -t * 0.15, -t * 0.26);
            // Ventana redonda donde se ve el animal.
            g.fillStyle(0xfff9db, 1); g.fillCircle(0, -t * 0.02, t * 0.28);
            g.lineStyle(5, 0x7a4a1c, 1); g.strokeCircle(0, -t * 0.02, t * 0.28);
            // Puerta.
            var puerta = this.add.graphics();
            puerta.fillStyle(0x7a4a1c, 1); puerta.fillRoundedRect(-t * 0.13, t * 0.22, t * 0.26, t * 0.3, { tl: 8, tr: 8, bl: 0, br: 0 });
            var abierta = this.add.graphics();
            abierta.fillStyle(0xffd43b, 1); abierta.fillRoundedRect(-t * 0.13, t * 0.22, t * 0.26, t * 0.3, { tl: 8, tr: 8, bl: 0, br: 0 });
            abierta.setAlpha(0);
            var aura = this.add.graphics();
            aura.lineStyle(7, 0x51cf66, 1); aura.strokeRoundedRect(-t * 0.5, -t * 0.84, t * 1.0, t * 1.4, 18);
            aura.setAlpha(0);
            a.cont.addAt(g, 0); a.cont.addAt(puerta, 1); a.cont.addAt(abierta, 2); a.cont.addAt(aura, 3);
            a.img.setPosition(0, -t * 0.02);
            a.img.setScale(a.img.scale * 0.92 * (t * 0.5) / (t * 0.5));
            a.abierta = abierta; a.aura = aura; a.casa = { x: lug.x, y: lug.y }; a.prof = 30; a.tam = t; a.cuerpoY = t;
            a.chim = { dx: t * 0.29, dy: -t * 0.62 };
            a.cont.setAlpha(0);
            return a;
        },

        mostrarOpciones: async function (nv) {
            var self = this;
            var n = nv.opciones.length;
            var lug = this.lugares(n);
            var tam = Math.min(this.L.tam, (this.L.der - this.L.nido.x - this.L.tam * 1.4) / n * 0.92);
            this.cosas = nv.opciones.map(function (id, i) { return self.crearCasita(id, i, lug[i], tam); });
            K.ruido({ f: 1400, q: 1, dur: 0.07, vol: 0.05 });
            await Promise.all(this.cosas.map(function (a, i) {
                return esperar(self, i * 120).then(function () { return tw(self, { targets: a.cont, alpha: 1, y: a.casa.y, duration: 360, ease: 'Back.easeOut' }); });
            }));
            this.pajaro.casa = { x: this.L.nido.x, y: this.L.nido.y };
        },

        prepararNivel: async function () {
            await this.retirar(this.cosas);
            this.cosas = [];
            this.humos = [];
            var p = this.pajaro;
            if (p) { p.cont.setPosition(this.L.nido.x, this.L.nido.y); p.carta.setAlpha(1).setScale(1); }
        },

        /* ── Escucha ── */

        alSonar: function () {
            var p = this.pajaro;
            if (!p) return;
            this.tweens.add({ targets: p.cuerpo, angle: { from: -12, to: 12 }, duration: 130, yoyo: true, repeat: 3, onComplete: function () { p.cuerpo.angle = 0; } });
            Ut.estallido(this, p.cont.x, p.cont.y - this.L.tam * 0.4, { n: 3, tex: 'nota', tam: 22, dist: 70, depth: 70 });
        },

        /* ── Arrastrar al pajarito ── */

        alTocar: function (p) {
            if (this.fase !== 'jugar') return;
            if (this.tomar(p, [this.pajaro])) return;
            var c = this.cosaEn(this.cosas, p.x, p.y);
            if (c && !this.sonando) this.sonar(c.id, { breve: true, bocina: false });
        },

        alMover: function (p) {
            var a = this.llevar(p);
            var cerca = a ? this.casaCerca(a) : null;
            this.cosas.forEach(function (c) { if (c.aura && !c.hecha) c.aura.setAlpha(c === cerca ? 0.8 : 0); });
            if (a) {
                // Vuela de verdad: bate las alas y deja una estela de plumas.
                a.cuerpo.angle = Math.sin(this.time.now / 45) * 10;
                if (this.time.now - (this.ultEstela || 0) > 70) { this.ultEstela = this.time.now; Ut.estallido(this, a.cont.x - 14, a.cont.y + 6, { n: 1, tex: 'chispa', tam: 16, dist: 26, depth: 55, sinTinte: true }); }
                if (cerca && cerca !== this.ultCerca) { this.ultCerca = cerca; cerca.saltito(0.12, 1); K.tono({ f: 900, dur: 0.05, vol: 0.03 }); }
                if (!cerca) this.ultCerca = null;
            }
        },

        casaCerca: function (a) {
            return this.cosaEn(this.cosas.filter(function (c) { return !c.hecha; }), a.cont.x, a.cont.y, this.L.tam * 0.75);
        },

        alSoltar: async function () {
            var b = this.soltar();
            if (!b) return;
            b.cuerpo.angle = 0;
            var casa = this.fase === 'jugar' ? this.casaCerca(b) : null;
            this.cosas.forEach(function (c) { if (!c.hecha && c.aura) c.aura.setAlpha(0); });
            if (!casa) { this.aCasa(b, true); return; }
            await this.tocarOrden(casa, { x: casa.cont.x, y: casa.cont.y });
        },

        alMarcar: async function (id, k) {
            var a = this.tocado, p = this.pajaro;
            if (!a) return;
            a.hecha = true;
            await this.saltarA(p.cont, a.cont.x - a.tam * 0.05, a.cont.y + a.tam * 0.22, { ms: 300, alto: 30 });
            // Entrega la carta, se abre la puerta y la ventana se enciende.
            await tw(this, { targets: p.carta, scale: 0, alpha: 0, duration: 220 });
            a.abierta.setAlpha(1);
            a.aura.setAlpha(1);
            a.saltito(0.18, 2);
            this.encenderHumo(a);
            Ut.estallido(this, a.cont.x, a.cont.y - a.tam * 0.2, { n: 8, tex: 'estrella', tam: 22, dist: 100, depth: 70, sinTinte: true });
            await this.volverAlNido(false);
        },

        volverAlNido: async function (rebote) {
            var p = this.pajaro;
            await this.saltarA(p.cont, this.L.nido.x, this.L.nido.y, { ms: 520, alto: this.L.tam * 0.6 });
            p.cont.setDepth(60);
            p.carta.setScale(0).setAlpha(0);
            await tw(this, { targets: p.carta, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
        },

        alFallar: async function () {
            var a = this.tocado, p = this.pajaro;
            if (!a) return;
            await this.saltarA(p.cont, a.cont.x - a.tam * 0.05, a.cont.y + a.tam * 0.25, { ms: 280, alto: 26 });
            K.tono({ f: 320, f2: 200, dur: 0.2, vol: 0.05 });
            await Promise.all([a.sacudir(), tw(this, { targets: p.cuerpo, angle: -25, duration: 160, yoyo: true, repeat: 1 })]);
            p.cuerpo.angle = 0;
            await this.volverAlNido(true);
        },

        alReiniciar: async function () {
            this.cosas.forEach(function (a) {
                a.hecha = false;
                if (a.aura) a.aura.setAlpha(0);
                if (a.abierta) a.abierta.setAlpha(0);
            });
            this.humos = [];
        },

        /** Humo de la chimenea: lo dibuja el paso de cada cuadro. */
        encenderHumo: function (a) {
            this.humos.push({ a: a, t0: this.time.now });
            K.ruido({ f: 500, q: 0.8, dur: 0.18, vol: 0.04 });
        },

        alAcertar: async function () {
            var nv = this.nv;
            this.cosas.forEach(function (a) { a.hecha = false; if (a.aura) a.aura.setAlpha(0); if (a.abierta) a.abierta.setAlpha(0); });
            await esperar(this, 250);
            for (var i = 0; i < nv.correctas.length; i++) {
                if (!this.sigue()) return;
                var a = this.cosas.filter(function (q) { return q.id === nv.correctas[i]; })[0];
                if (!a) continue;
                this.reunidos.push(a.id);
                a.abierta.setAlpha(1); a.aura.setAlpha(1); a.hecha = true;
                a.latir();
                this.encenderHumo(a);
                Ut.estallido(this, a.cont.x, a.cont.y - a.tam * 0.3, { n: 10, tex: 'estrella', tam: 24, dist: 120, depth: 70, sinTinte: true });
                await this.sonar(a.id, { breve: true, bocina: false });
                await esperar(this, 120);
            }
            Ut.estallido(this, this.L.W / 2, this.L.suelo - this.L.tam, { n: 16, tex: 'corazon', tam: 26, dist: 240, depth: 70 });
            await esperar(this, 500);
        },

        alTerminarNivel: async function () {
            await this.retirar(this.cosas);
            this.cosas = [];
            this.humos = [];
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            var sig = this.siguienteDe(this.cosas);
            if (!sig || !this.ayuda) {
                if (this.bocina) this.tweens.add({ targets: this.bocina, scale: 1.18, duration: 220, yoyo: true, repeat: 2 });
                return esperar(this, 900);
            }
            var p = this.pajaro;
            return this.ctx.mano({ punto: { x: p.cont.x, y: p.cont.y }, holdMs: 200, arrastre: { dx: sig.cont.x - p.cont.x, dy: sig.cont.y - p.cont.y, durMs: 900 }, cancelado: function () { return cancelada() || self.fase !== 'jugar' || !!self.arrastrando; } });
        },

        demoPaso: function () {
            var self = this;
            return this.nv.correctas.map(function (id) {
                return function () {
                    var c = self.cosas.filter(function (q) { return q.id === id; })[0];
                    var p = self.pajaro;
                    if (!c) return null;
                    return {
                        desde: { x: p.cont.x, y: p.cont.y }, hasta: { x: c.cont.x, y: c.cont.y },
                        hacer: async function () {
                            self.arrastrando = { a: p, dx: 0, dy: 0 };
                            p.cont.setDepth(70);
                            await tw(self, { targets: p.cont, x: c.cont.x, y: c.cont.y, duration: 350 });
                            await self.alSoltar();
                        }
                    };
                };
            });
        },

        /** Final: todas las casitas de la partida se encienden y el pajarito reparte cartas a todas. */
        escenaFinal: async function () {
            var self = this;
            var L = this.L;
            await this.retirar(this.cosas);
            this.cosas = [];
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; }).slice(0, 5);
            if (!ids.length) ids = ['perro', 'gato', 'pajaro'];
            var lug = this.lugares(ids.length);
            var tam = Math.min(L.tam, (L.der - L.nido.x - L.tam * 1.4) / ids.length * 0.92);
            var casas = ids.map(function (id, i) { return self.crearCasita(id, i, lug[i], tam); });
            await Promise.all(casas.map(function (a, i) {
                return esperar(self, i * 100).then(function () { return tw(self, { targets: a.cont, alpha: 1, y: a.casa.y, duration: 340, ease: 'Back.easeOut' }); });
            }));
            this.cosas = casas;
            for (var i = 0; i < casas.length; i++) {
                if (!this.sigue()) return;
                var a = casas[i], p = this.pajaro;
                await this.saltarA(p.cont, a.cont.x, a.cont.y + a.tam * 0.22, { ms: 340, alto: 40 });
                a.abierta.setAlpha(1); a.aura.setAlpha(1); a.hecha = true;
                this.encenderHumo(a);
                a.saltito(0.2, 2);
                Ut.estallido(this, a.cont.x, a.cont.y - a.tam * 0.3, { n: 10, tex: 'estrella', tam: 26, dist: 130, depth: 70, sinTinte: true });
                await this.sonar(a.id, { breve: true, bocina: false });
            }
            await this.saltarA(this.pajaro.cont, L.W / 2, L.suelo - L.tam * 1.4, { ms: 600, alto: 60 });
            Ut.confeti(this, 70);
            await esperar(this, 1000);
        },

        estadoExtra: function () {
            var p = this.pajaro;
            return {
                pajaro: p ? { x: Math.round(p.cont.x), y: Math.round(p.cont.y) } : null,
                cosas: this.cosas.filter(function (a) { return a.cont.active; }).map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y), hecha: !!a.hecha }; })
            };
        },

        paso: function (time) {
            if (this.velo && this.velo.active) {
                var meta = [0, 0.1, 0.2, 0.3][Math.min(3, this.nivelActual || 0)];
                this.velo.fillAlpha += (meta - this.velo.fillAlpha) * 0.02;
            }
            var self = this;
            this.cosas.forEach(function (a, i) {
                if (!a.cont.active || !a.img || self.tweens.isTweening(a.img)) return;
                a.img.angle = Math.sin(time / 800 + i * 2) * 4;
            });
            var g = this.humoG;
            if (!g || !g.active) return;
            g.clear();
            var self = this;
            this.humos.forEach(function (h) {
                if (!h.a.cont.active) return;
                for (var i = 0; i < 4; i++) {
                    var f = (((time - h.t0) / 1400) + i / 4) % 1;
                    var x = h.a.cont.x + h.a.chim.dx + Math.sin(f * 6 + i) * 8 * f;
                    var y = h.a.cont.y + h.a.chim.dy - f * self.L.tam * 0.6;
                    g.fillStyle(0xffffff, 0.8 * (1 - f));
                    g.fillCircle(x, y, 5 + f * 10);
                }
            });
        }
    };

    K.crear({ id: 'casitas', fondo: '#a5d8ff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
