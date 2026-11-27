/**
 * «Excava y descubre» — motor propio de Otros Sonidos de Animales (3-4 años).
 *
 * En la pradera hay montículos de tierra y debajo de cada uno se esconde un animal. Suena un
 * animal; cuando aparecen los montículos el niño RASCA la tierra con el dedo (la tierra salta en
 * terrones) hasta destapar al animal que escuchó. Si era ese, sale saltando; si no, suena su
 * propio sonido, se vuelve a esconder y la tierra lo tapa otra vez (sin castigo).
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    var TIERRAS = [0x8a5a2b, 0x9c6a35, 0x7a4e20, 0xa87a44];

    // Arte del diseñador (img/diseno): playa de fondo, castillo de arena que hay que excavar y pala.
    var GRANOS = [0xe7bf6f, 0xf7d798, 0xe8b459, 0xe8a838];
    var BRUSH = 48;   // diámetro de la goma con la que se borra el castillo

    var escena = {
        precargar: function () {
            if (!this.textures.exists('dx_fondo')) this.load.svg('dx_fondo', 'img/diseno/fondo.svg', { width: 1280, height: 720 });
            if (!this.textures.exists('dx_castillo')) this.load.svg('dx_castillo', 'img/diseno/castillo.svg', { width: 400, height: 400 });
            if (!this.textures.exists('dx_pala')) this.load.svg('dx_pala', 'img/diseno/pala.svg', { width: 164, height: 400 });
        },

        iniciar: function () {
            this.cosas = [];
            this.reunidos = [];
            this.cavando = false;
            this.ocupado = false;
            this.pala = null;
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
            L.horizonte = Math.round(H * 0.4);
            L.suelo = Math.round(H * 0.72);
            L.tam = Math.max(100, Math.min(160, (L.der - 60) / 4.2, H * 0.24));
            L.bocina = { x: 48, y: Math.round(H * 0.3), r: Math.max(24, Math.min(32, hueco * 0.28)) };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            this.arteOk = this.textures.exists('dx_fondo') && this.textures.exists('dx_castillo') && L.W >= 900;
            this.cieloG = null;
            if (this.arteOk) {
                this.vidaAmb = null;
                keep(this.add.image(0, 0, 'dx_fondo').setOrigin(0, 0).setDisplaySize(L.W, L.H).setDepth(1));
                this.cieloG = keep(this.add.graphics().setDepth(2));   // gaviotas
            } else {
            var V = this.montarVida(keep);
            if (V) {
                V.parque({ horizonte: L.horizonte, arboles: [0.05, 0.3, 0.7, 0.95], solX: 0.12 });
                V.mariposas(3, { x: 0, y: L.horizonte, w: L.W, h: L.H * 0.4, depth: 8 });
            }
            var pasto = keep(this.add.graphics().setDepth(1.5));
            pasto.fillStyle(0x8ce99a, 1); pasto.fillRect(0, L.horizonte, L.W, L.H - L.horizonte);
            pasto.fillStyle(0x69db7c, 1); pasto.fillRect(0, L.horizonte, L.W, 8);
            pasto.fillStyle(0x51cf66, 0.5);
            for (var i = 0; i < 80; i++) { var gx = (i * 97) % L.W, gy = L.horizonte + 14 + ((i * 53) % Math.max(10, L.H - L.horizonte - 20)); pasto.fillTriangle(gx, gy, gx + 4, gy - 11, gx + 8, gy); }
            }
            this.tierraG = keep(this.add.graphics().setDepth(32));
            var pala = keep(this.add.container(-100, -100).setDepth(90));
            if (this.arteOk && this.textures.exists('dx_pala')) {
                pala.add(this.add.image(0, 0, 'dx_pala').setOrigin(0.5, 0.86).setDisplaySize(52, 127));
            } else {
            var pg = this.add.graphics();
            pg.fillStyle(0x7a4e1e, 1); pg.fillRoundedRect(-4, -58, 8, 48, 4);
            pg.fillStyle(0xadb5bd, 1); pg.fillRoundedRect(-14, -14, 28, 30, 8);
            pg.fillStyle(0xdee2e6, 1); pg.fillRoundedRect(-10, -10, 8, 18, 3);
            pala.add(pg);
            }
            pala.setAlpha(0);
            this.pala = pala;
            if (!this.textures.exists('dx_borra')) {
                var cv = this.textures.createCanvas('dx_borra', BRUSH, BRUSH), cx2 = cv.getContext();
                var gr = cx2.createRadialGradient(BRUSH / 2, BRUSH / 2, BRUSH * 0.28, BRUSH / 2, BRUSH / 2, BRUSH / 2);
                gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
                cx2.fillStyle = gr; cx2.fillRect(0, 0, BRUSH, BRUSH); cv.refresh();
            }
            this.montarHud(keep);
            this.sembrarMotes(keep, 10, { x: 0, y: L.horizonte, w: L.W, h: L.H - L.horizonte, depth: 8 }, 0xfff3bf);
            if (reubicar) this.ubicarCosas();
        },

        lugares: function (n) {
            var L = this.L;
            var x0 = 110, disp = L.der - x0 - 40;
            var out = [];
            for (var i = 0; i < n; i++) out.push({ x: x0 + disp * (i + 0.5) / n, y: L.suelo + (i % 2 ? L.tam * 0.15 : -L.tam * 0.05) });
            return out;
        },

        ubicarCosas: function () {
            var lug = this.lugares(this.cosas.length);
            this.cosas.forEach(function (a, i) {
                a.casa = { x: lug[i].x, y: lug[i].y };
                a.pared = { x: lug[i].x, y: lug[i].y - a.tam * 0.1 };
                a.cont.setPosition(lug[i].x, lug[i].y - a.tam * 0.1);
                if (a.rt) this.colocarCastillo(a);
                a.terrones.forEach(function (t) { t.x = a.casa.x + t.dx; t.y = a.casa.y + t.dy; });
            });
        },

        /** Castillo de arena del diseño: se pinta en una RenderTexture y se va borrando al excavar. */
        colocarCastillo: function (a) {
            a.cx = a.casa.x; a.cy = a.casa.y - a.tam * 0.1 - 0.26 * a.S;
            a.rt.setPosition(a.cx, a.cy);
            a.base = a.cy + 0.46 * a.S;
            a.terrones.forEach(function (t) { t.x = a.cx + t.dx; t.y = a.cy + t.dy; });
        },

        /** Dibuja el castillo entero en su lienzo (al crearlo y al volver a taparlo). */
        pintarCastillo: function (a) {
            var cx = a.ctx;
            cx.globalCompositeOperation = 'source-over';
            cx.clearRect(0, 0, a.sz, a.sz);
            cx.drawImage(this.textures.get('dx_castillo').getSourceImage(), 0, 0, a.sz, a.sz);
            a.cv.refresh();
        },

        crearCastillo: function (a, lug, tam, S) {
            var terrones = [];
            a.S = S;
            var sz = Math.ceil(S), key = 'dx_c' + (this.nCast = (this.nCast || 0) + 1);
            a.key = key; a.sz = sz;
            a.cv = this.textures.createCanvas(key, sz, sz);
            a.ctx = a.cv.getContext();
            this.pintarCastillo(a);
            a.rt = this.add.image(lug.x, lug.y, key).setDepth(31);
            var N = 10;
            for (var fi = 0; fi < N; fi++) for (var co = 0; co < N; co++) {
                var u = 0.06 + 0.88 * co / (N - 1), v = 0.03 + 0.94 * fi / (N - 1);
                if (this.textures.getPixelAlpha(Math.floor(u * 400), Math.floor(v * 400), 'dx_castillo') < 12) continue;
                terrones.push({ dx: (u - 0.5) * S, dy: (v - 0.5) * S, r: S * 0.05, vivo: true, col: GRANOS[(fi + co) % GRANOS.length], alfa: 1 });
            }
            a.terrones = terrones;
            a.rx = S * 0.42; a.ry = S * 0.2;
            a.tam = tam; a.casa = { x: lug.x, y: lug.y }; a.pared = { x: lug.x, y: lug.y - tam * 0.1 }; a.revelado = false;
            var self = this;
            a.destruir = function () { a.cont.destroy(); if (a.rt) a.rt.destroy(); if (self.textures.exists(key)) self.textures.remove(key); };
            a.rt.setAlpha(0);
            a.cont.setAlpha(0);
            this.colocarCastillo(a);
            return a;
        },

        crearMonticulo: function (id, i, lug, tam, S) {
            var a = this.crearCosa(id, lug.x, lug.y - tam * 0.1, tam * 0.7, { depth: 30, sinSombra: true });
            if (this.arteOk && S) return this.crearCastillo(a, lug, tam, S);
            var terrones = [];
            var rx = tam * 0.78, ry = tam * 0.52;
            for (var fila = 0; fila < 6; fila++) {
                for (var col = 0; col < 11; col++) {
                    var u = (col / 10) * 2 - 1 + (Math.random() - 0.5) * 0.1, v = (fila / 5) * 2 - 1 + (Math.random() - 0.5) * 0.15;
                    if (u * u + v * v > 1.02) continue;
                    terrones.push({ dx: u * rx, dy: v * ry + ry * 0.1, r: 15 + Math.random() * 5, vivo: true, col: TIERRAS[(fila + col) % TIERRAS.length], alfa: 1 });
                }
            }
            terrones.forEach(function (t) { t.x = lug.x + t.dx; t.y = lug.y + t.dy; });
            a.terrones = terrones;
            a.rx = rx; a.ry = ry;
            a.tam = tam; a.casa = { x: lug.x, y: lug.y }; a.pared = { x: lug.x, y: lug.y - tam * 0.1 }; a.revelado = false; a.fase2 = Math.random() * 6;
            a.cont.setAlpha(0);
            return a;
        },

        fraccion: function (a) {
            var v = a.terrones.filter(function (t) { return !t.vivo; }).length;
            return v / a.terrones.length;
        },

        mostrarOpciones: async function (nv) {
            var self = this;
            var lug = this.lugares(nv.opciones.length);
            var tam = Math.min(this.L.tam, (this.L.der - 120) / nv.opciones.length * 0.82);
            var S = Math.min(tam * 1.8, (this.L.der - 150) / nv.opciones.length * 0.96);
            this.cosas = nv.opciones.map(function (id, i) { return self.crearMonticulo(id, i, lug[i], tam, S); });
            K.ruido({ f: 300, q: 0.8, dur: 0.25, vol: 0.06 });
            this.cosas.forEach(function (a, i) {
                if (a.rt) { self.tweens.add({ targets: a.rt, alpha: 1, duration: 450, delay: i * 120 }); return; }
                a.terrones.forEach(function (t) { t.alfa = 0; });
                self.tweens.add({ targets: a.terrones, alfa: 1, duration: 450, delay: i * 120 });
            });
            await esperar(this, 500 + this.cosas.length * 120);
            if (this.arteOk && this.cosas[0] && this.cosas[0].rt) await this.asomar();
        },

        /**
         * Para que no sea cuestión de suerte: antes de excavar, cada animal asoma por detrás de su castillo,
         * dice quién es con su propio sonido y se vuelve a esconder. Luego hay que recordar dónde estaba el que sonó.
         */
        asomar: async function () {
            var self = this;
            this.fase = 'mirando';
            for (var i = 0; i < this.cosas.length; i++) {
                var a = this.cosas[i];
                if (!this.sigue() || !a.cont.active) return;
                var reposo = a.casa.y - a.tam * 0.1;
                var alto = a.cy - a.S * 0.4;
                a.cont.setPosition(a.casa.x, a.cy).setAlpha(1);
                var anillo = this.add.circle(a.casa.x, alto, a.tam * 0.45, 0xffffff, 0).setStrokeStyle(5, 0xffe066, 0.9).setDepth(29);
                this.tweens.add({ targets: anillo, scale: 1.5, alpha: 0, duration: 700, onComplete: function () { anillo.destroy(); } });
                await tw(this, { targets: a.cont, y: alto, duration: 300, ease: 'Back.easeOut' });
                a.saltito(0.25, 2);
                await this.sonar(a.id, { breve: true, bocina: false });
                if (!this.sigue() || !a.cont.active) return;
                await tw(this, { targets: a.cont, y: a.cy, alpha: 0, duration: 240 });
                a.cont.setY(reposo);
                await esperar(this, 120);
            }
            await esperar(this, 250);
        },

        prepararNivel: async function () {
            await this.retirar(this.cosas);
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.cosas = [];
            this.ocupado = false;
        },

        alSonar: function () {
            var L = this.L;
            Ut.estallido(this, L.W * 0.35, L.suelo, { n: 4, tex: 'nota', tam: 24, dist: 110, depth: 70 });
        },

        /* ── Rascar ── */

        alTocar: function (p) {
            if (this.fase !== 'jugar') return;
            this.cavando = true;
            this.cavar(p);
        },

        alMover: function (p) {
            var pl = this.pala;
            if (pl) { pl.setPosition(p.x + (this.arteOk ? 6 : 18), p.y + (this.arteOk ? 4 : -6)); pl.setAlpha(this.cavando && this.fase === 'jugar' ? 1 : 0); pl.setAngle(Math.sin(this.time.now / 70) * 14); }
            if (this.cavando && this.fase === 'jugar') this.cavar(p);
        },

        alSoltar: function () { this.cavando = false; if (this.pala) this.pala.setAlpha(0); },

        cavar: function (p) {
            if (this.ocupado) return;
            var self = this, R0 = 36;
            this.cosas.forEach(function (a) {
                if (a.revelado) return;
                var quito = 0, R = a.S ? Math.max(R0, a.S * 0.09) : R0;
                a.terrones.forEach(function (t) {
                    if (t.vivo && Math.hypot(t.x - p.x, t.y - p.y) < R) {
                        if (a.rt) { a.ctx.globalCompositeOperation = 'destination-out'; a.ctx.drawImage(self.textures.get('dx_borra').getSourceImage(), t.x - (a.cx - a.sz / 2) - BRUSH / 2, t.y - (a.cy - a.sz / 2) - BRUSH / 2); }
                        t.vivo = false; quito++; t.vx = (t.x - p.x) * 0.06 + (Math.random() - 0.5) * 2; t.vy = -3 - Math.random() * 3; t.vol = 1; t.px = t.x; t.py = t.y; }
                });
                if (quito) {
                    if (a.cv) a.cv.refresh();
                    self.pista.reiniciar();
                    K.ruido({ f: 500 + Math.random() * 300, q: 0.8, dur: 0.05, vol: 0.04 });
                    if (self.fraccion(a) >= (a.rt ? 0.5 : 0.55)) self.revelar(a);
                }
            });
        },

        revelar: async function (a) {
            if (this.ocupado) return;
            this.ocupado = true;
            this.cavando = false;
            a.revelado = true;
            if (this.pala) this.pala.setAlpha(0);
            // el resto de la tierra se desmorona
            a.terrones.forEach(function (t) { if (t.vivo) { t.vivo = false; t.vx = (Math.random() - 0.5) * 3; t.vy = -1 - Math.random() * 2; t.vol = 1; t.px = t.x; t.py = t.y; } });
            if (a.rt) this.tweens.add({ targets: a.rt, alpha: 0, scaleY: 0.86, y: a.rt.y + a.S * 0.05, duration: 380 });
            a.cont.setAlpha(1);
            this.tweens.add({ targets: a.cont, y: a.casa.y - a.tam * 0.45, duration: 280, ease: 'Back.easeOut' });
            this.actual = a;
            var ok = await this.elegir(a.id, { x: a.cont.x, y: a.cont.y });
            if (ok === false) await this.taparDeNuevo(a);
            this.ocupado = false;
        },

        taparDeNuevo: async function (a) {
            await tw(this, { targets: a.cont, y: a.casa.y - a.tam * 0.1, duration: 300 });
            if (a.rt) {
                this.pintarCastillo(a); a.rt.setScale(1).setAlpha(0);
                a.terrones.forEach(function (t) { t.vivo = true; t.vol = 0; });
                this.colocarCastillo(a);
                this.tweens.add({ targets: a.rt, alpha: 1, duration: 500 });
            } else {
            a.terrones.forEach(function (t) { t.vivo = true; t.vol = 0; t.x = a.casa.x + t.dx; t.y = a.casa.y + t.dy; t.alfa = 0; });
            this.tweens.add({ targets: a.terrones, alfa: 1, duration: 500 });
            }
            a.revelado = false;
            K.ruido({ f: 300, q: 0.8, dur: 0.2, vol: 0.05 });
        },

        alAcertar: async function () {
            var a = this.actual;
            if (!a) return;
            this.reunidos.push(a.id);
            Ut.estallido(this, a.cont.x, a.cont.y - a.tam * 0.3, { n: 14, tex: 'estrella', tam: 28, dist: 150, depth: 70, sinTinte: true });
            a.saltito(0.6, 3);
            await this.sonar(a.id, { breve: true, bocina: false });
            await esperar(this, 250);
        },

        alFallar: async function () {
            var a = this.actual;
            if (a) a.sacudir();
            await esperar(this, 700);
        },

        alTerminarNivel: async function () {
            await this.retirar(this.cosas);
            this.cosas = [];
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            var a = this.correctaDe(this.cosas.filter(function (c) { return !c.revelado; }));
            if (!a || !this.ayuda) {
                if (this.bocina) this.tweens.add({ targets: this.bocina, scale: 1.18, duration: 220, yoyo: true, repeat: 2 });
                return esperar(this, 900);
            }
            return this.ctx.mano({ punto: { x: a.pared.x - a.rx * 0.5, y: a.pared.y }, holdMs: 100, arrastre: { dx: a.rx, dy: 0, durMs: 900 }, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
        },

        demoPaso: function () {
            var self = this;
            var a = this.correctaDe(this.cosas);
            if (!a) return null;
            return {
                desde: { x: a.pared.x - a.rx * 0.5, y: a.pared.y }, hasta: { x: a.pared.x + a.rx * 0.5, y: a.pared.y },
                hacer: async function () {
                    for (var k = 0; k < 14; k++) { self.cavar({ x: a.pared.x + (k % 7 - 3) * a.rx * 0.28, y: a.pared.y + (k < 7 ? -a.ry * 0.5 : a.ry * 0.5) }); await esperar(self, 60); }
                    if (!a.revelado) await self.revelar(a);
                }
            };
        },

        escenaFinal: async function () {
            var self = this, L = this.L;
            await this.retirar(this.cosas);
            this.cosas = [];
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; }).slice(0, 5);
            if (!ids.length) ids = ['perro', 'gato', 'vaca'];
            var tam = Math.min(L.tam, (L.der - 100) / ids.length * 0.9);
            for (var i = 0; i < ids.length; i++) {
                if (!this.sigue()) return;
                var x = 90 + (L.der - 130) * (i + 0.5) / ids.length;
                var a = this.crearCosa(ids[i], x, L.suelo - 200, tam * 0.8, { depth: 30 });
                a.cont.setScale(0.3);
                await this.saltarA(a.cont, x, L.suelo, { ms: 500, alto: 140, esc: 1 });
                a.saltito(0.3, 2);
                Ut.estallido(this, x, L.suelo - tam * 0.6, { n: 10, tex: 'estrella', tam: 26, dist: 130, depth: 70, sinTinte: true });
                await this.sonar(ids[i], { breve: true, bocina: false });
            }
            Ut.confeti(this, 90);
            await esperar(this, 1100);
        },

        estadoExtra: function () {
            var self = this;
            return {
                cosas: this.cosas.filter(function (a) { return a.cont.active; }).map(function (a) { return { id: a.id, x: Math.round(a.casa.x), y: Math.round(a.casa.y), rx: Math.round(a.rx), ry: Math.round(a.ry), frac: +self.fraccion(a).toFixed(2), revelado: a.revelado }; })
            };
        },

        paso: function (time, delta) {
            var g = this.tierraG;
            if (!g || !g.active) return;
            g.clear();
            var cg = this.cieloG;
            if (cg && cg.active) {
                // Gaviotas que cruzan el cielo batiendo las alas.
                cg.clear();
                var Wc = this.L.W, Hc = this.L.H, sc = time / 1000;
                for (var gv = 0; gv < 3; gv++) {
                    var gx2 = ((sc * (26 + gv * 9) + gv * 470) % (Wc + 160)) - 80, gy2 = Hc * (0.1 + gv * 0.07) + Math.sin(sc * 0.8 + gv * 2) * 10;
                    var ala = Math.sin(sc * 5 + gv * 1.7) * 7 + 3, ks = 1 + gv * 0.15;
                    cg.lineStyle(3 * ks, 0xffffff, 0.95);
                    cg.beginPath(); cg.moveTo(gx2 - 15 * ks, gy2 - ala); cg.lineTo(gx2 - 6 * ks, gy2 - ala * 0.5 - 2); cg.lineTo(gx2, gy2); cg.lineTo(gx2 + 6 * ks, gy2 - ala * 0.5 - 2); cg.lineTo(gx2 + 15 * ks, gy2 - ala); cg.strokePath();
                }
            }
            var dt = (delta || 16) / 16;
            this.cosas.forEach(function (a) {
                if (!a.cont.active) return;
                if (a.rt) { if (!a.revelado) { g.fillStyle(0x8a5a2b, 0.16 * a.rt.alpha); g.fillEllipse(a.cx, a.base, a.S * 0.92, a.S * 0.1); } }
                else { g.fillStyle(0x000000, 0.18); g.fillEllipse(a.casa.x, a.casa.y + a.ry * 0.85, a.rx * 2.1, a.ry * 0.5); }
                a.terrones.forEach(function (t) {
                    if (t.vivo) {
                        if (a.rt) return;
                        g.fillStyle(t.col, t.alfa); g.fillCircle(t.x, t.y, t.r);
                        g.fillStyle(0xffffff, 0.08 * t.alfa); g.fillCircle(t.x - 4, t.y - 4, t.r * 0.45);
                    } else if (t.vol > 0) {
                        // terrón que sale volando y cae
                        t.px += t.vx * dt; t.py += t.vy * dt; t.vy += 0.5 * dt; t.vol -= 0.012 * dt;
                        g.fillStyle(t.col, Math.max(0, t.vol)); g.fillCircle(t.px, t.py, t.r * 0.8);
                    }
                });
            });
        }
    };

    K.crear({ id: 'excavar', fondo: '#a5d8ff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
