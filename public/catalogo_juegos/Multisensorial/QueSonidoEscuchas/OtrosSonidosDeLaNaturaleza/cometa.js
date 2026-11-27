/**
 * «Vuela la cometa» — motor propio de Otros Sonidos de la Naturaleza (3-4 años).
 *
 * Una cometa vuela en un cielo con viento. Suena un sonido de la naturaleza y, cuando aparecen las
 * nubes con las imágenes (lluvia, mar, viento), el niño PILOTA la cometa con el dedo (ella lo
 * sigue, con su cola ondeando) y la lleva hasta la nube del sonido: al quedarse un momento sobre
 * ella, la elige. Las nubes derivan por el cielo y, en los niveles altos, ráfagas empujan la
 * cometa. Si era otra, la nube se sacude y suena su propio sonido (sin castigo).
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    // Arte del diseñador: jardín con cerca (1280x720; el pasto empieza en y≈549), nube (lienzo 500x291, útil 461x268)
    // y hoja de la cometa (cuerpo con cintas + 4 lazos de la cola + cintas finales) con marcos en px de la textura.
    var ARTE = { w: 1280, h: 720, horizonte: 549 };
    var MARCOS = {
        ot_nube: { rec: [29, 17, 692, 402] },
        ot_cometa: { cuerpo: [20, 20, 376, 286], lazo1: [420, 20, 68, 62], lazo2: [520, 20, 84, 72], lazo3: [640, 20, 64, 60], lazo4: [740, 20, 44, 50], cintas: [820, 20, 108, 88] }
    };
    // Cuerpo: centro del rombo en (61.7, 65.9) del marco (188x143 unidades); el eje mide 155 y está inclinado 25°.
    var CUERPO = { cx: 61.7 / 188, cy: 65.9 / 143, w: 188, h: 143, eje: 155, giro: 25 };

    var escena = {
        precargar: function () {
            if (!this.textures.exists('ot_fondo')) this.load.svg('ot_fondo', 'img/diseno/fondo.svg', { width: 1280, height: 720 });
            if (!this.textures.exists('ot_nube')) this.load.svg('ot_nube', 'img/diseno/nube.svg', { width: 750, height: 437 });
            if (!this.textures.exists('ot_cometa')) this.load.svg('ot_cometa', 'img/diseno/cometa_hoja.svg', { width: 1040, height: 340 });
        },

        prepararArte: function () {
            var self = this;
            this.arteOk = this.scale.width >= 900 && ['ot_fondo', 'ot_nube', 'ot_cometa'].every(function (k) { return self.textures.exists(k); });
            if (!this.arteOk) return;
            Object.keys(MARCOS).forEach(function (k) {
                var t = self.textures.get(k);
                Object.keys(MARCOS[k]).forEach(function (n) { if (!t.has(n)) { var m = MARCOS[k][n]; t.add(n, 0, m[0], m[1], m[2], m[3]); } });
            });
        },

        iniciar: function () {
            this.cosas = [];
            this.reunidos = [];
            this.kite = { x: 0, y: 0, vx: 0, vy: 0, ang: 0 };
            this.meta = null;
            this.pulsado = false;
            this.autoObj = null;
            this.ocupado = false;
            this.cola = [];
            this.rafaga = 0;
            this.v = 12;
        },

        filtrarPool: function (pool) {
            var f = pool.filter(function (id) { return ['lluvia', 'mar', 'viento'].indexOf(id) >= 0; });
            return f.length >= 3 ? f : pool;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.horizonte = Math.round(H * (this.arteOk ? ARTE.horizonte / ARTE.h : 0.72));
            L.tam = Math.max(100, Math.min(150, (L.der - 120) / 3.6, H * 0.21));
            L.ancla = { x: Math.round(L.der * 0.12), y: L.horizonte + (this.arteOk ? 16 : 10) };
            L.cielo = { y0: Math.round(H * 0.2), y1: Math.round(H * 0.58) };
            L.bocina = { x: 48, y: Math.round(H * 0.33), r: Math.max(24, Math.min(32, hueco * 0.28)) };
            return L;
        },

        armar: function (reubicar) {
            this.prepararArte();
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            if (this.arteOk) {
                keep(this.add.image(0, 0, 'ot_fondo').setOrigin(0, 0).setDisplaySize(L.W, L.H).setDepth(1));
                this.hojasG = keep(this.add.graphics().setDepth(3));
                this.hojas = [];
                for (var h = 0; h < 14; h++) this.hojas.push({ x: Math.random() * L.der, y: L.H * (0.2 + Math.random() * 0.45), vx: 18 + Math.random() * 26, ph: Math.random() * 6, r: 4 + Math.random() * 3, c: [0x7bcf3a, 0x56ae2c, 0xffffff, 0xffc9d9][h % 4], a: Math.random() * 6 });
            } else {
            var V = this.montarVida(keep);
            if (V) {
                V.parque({ horizonte: L.horizonte, arboles: [0.9], solX: 0.14 });
                V.pajaros && V.pajaros(3, L.H * 0.12, L.H * 0.3);
            }
            var g = keep(this.add.graphics().setDepth(1.5));
            g.fillStyle(0x8ce99a, 1); g.fillRect(0, L.horizonte, L.W, L.H - L.horizonte);
            g.fillStyle(0x69db7c, 1); g.fillRect(0, L.horizonte, L.W, 8);
            }
            this.pastoG = keep(this.add.graphics().setDepth(2));
            this.hiloG = keep(this.add.graphics().setDepth(25));
            this.anilloG = keep(this.add.graphics().setDepth(60));
            this.kiteC = keep(this.add.container(this.kite.x, this.kite.y).setDepth(58));
            var kg = this.add.graphics();
            var s = Math.max(34, L.tam * 0.34);
            this.lazos = null;
            if (this.arteOk) {
                // Cometa del diseño: el rombo se endereza (eje inclinado 25°) y la cola son los lazos del dibujo.
                var kc = (2.3 * s) / CUERPO.eje;
                var cuerpo = this.add.image(0, 0, 'ot_cometa', 'cuerpo').setOrigin(CUERPO.cx, CUERPO.cy).setDisplaySize(CUERPO.w * kc, CUERPO.h * kc).setAngle(CUERPO.giro);
                this.kiteC.add(cuerpo);
                this.kiteC.add(kg); kg.setVisible(false);
                this.kiteCuerpo = cuerpo;
                this.lazos = [];
                for (var q = 0; q < 7; q++) {
                    var nom = 'lazo' + (1 + q % 4), m = MARCOS.ot_cometa[nom];
                    var lz = keep(this.add.image(0, 0, 'ot_cometa', nom).setDepth(26));
                    lz.setDisplaySize(m[2] / 2 * 0.62, m[3] / 2 * 0.62);
                    this.lazos.push(lz);
                }
                this.cintas = keep(this.add.image(0, 0, 'ot_cometa', 'cintas').setDepth(26).setOrigin(0.15, 0.2));
                this.cintas.setDisplaySize(54 * 0.62, 44 * 0.62);
            }
            kg.fillStyle(0xff6b6b, 1); kg.fillTriangle(0, -s * 1.1, -s * 0.7, 0, 0, s * 1.2);
            kg.fillStyle(0xffd43b, 1); kg.fillTriangle(0, -s * 1.1, s * 0.7, 0, 0, s * 1.2);
            kg.fillStyle(0x4dabf7, 1); kg.fillTriangle(0, 0, -s * 0.7, 0, 0, s * 1.2);
            kg.fillStyle(0x69db7c, 1); kg.fillTriangle(0, 0, s * 0.7, 0, 0, s * 1.2);
            if (!this.arteOk) {
            kg.lineStyle(3, 0x7a4e1e, 1); kg.lineBetween(0, -s * 1.1, 0, s * 1.2); kg.lineBetween(-s * 0.7, 0, s * 0.7, 0);
            kg.lineStyle(3, 0xffffff, 0.8); kg.strokeTriangle(0, -s * 1.1, -s * 0.7, 0, 0, s * 1.2); kg.strokeTriangle(0, -s * 1.1, s * 0.7, 0, 0, s * 1.2);
            this.kiteC.add(kg);
            }
            this.kiteS = s;
            if (!this.kite.x) { this.kite.x = L.der * 0.28; this.kite.y = L.H * 0.4; }
            if (!this.cola.length) for (var i = 0; i < 7; i++) this.cola.push({ x: this.kite.x, y: this.kite.y + i * 12 });
            this.montarHud(keep);
            if (reubicar) this.ubicarCosas();
        },

        /* ── Nubes ── */

        crearNube: function (id, i, tam) {
            var a = this.crearCosa(id, -300, 0, tam * 0.58, { depth: 30, sinSombra: true });
            if (this.arteOk) {
                // Nube del diseño: más ancha que alta; el dibujo del sonido va en su centro.
                var w = tam * 1.62, nb = this.add.image(0, 0, 'ot_nube', 'rec').setDisplaySize(w, w * 402 / 692);
                a.cont.addAt(nb, 0);
                a.img.setPosition(0, tam * 0.02);
                a.nube = nb; a.nubeW = w;
                a.tam = tam; a.dwell = 0; a.fase2 = Math.random() * 6;
                a.cont.setAlpha(0);
                return a;
            }
            var g = this.add.graphics();
            var w = tam * 1.5;
            g.fillStyle(0x74c0fc, 0.25); g.fillEllipse(0, tam * 0.28, w * 0.95, tam * 0.3);
            g.fillStyle(0xffffff, 1);
            g.fillCircle(-w * 0.28, 0, tam * 0.4); g.fillCircle(w * 0.28, 0, tam * 0.38); g.fillCircle(-w * 0.04, -tam * 0.2, tam * 0.5);
            g.fillRoundedRect(-w * 0.45, -tam * 0.02, w * 0.9, tam * 0.36, tam * 0.18);
            g.fillStyle(0xe7f5ff, 1); g.fillEllipse(0, tam * 0.2, w * 0.82, tam * 0.2);
            a.cont.addAt(g, 0);
            a.tam = tam; a.dwell = 0; a.fase2 = Math.random() * 6;
            a.cont.setAlpha(0);
            return a;
        },

        sembrar: function () {
            var L = this.L, n = this.cosas.length;
            this.span = L.der + L.tam * 1.5;
            var self = this;
            this.cosas.forEach(function (a, i) {
                a.off = self.span * (i + 0.6) / n;
                a.yBase = L.cielo.y0 + (L.cielo.y1 - L.cielo.y0) * (n === 1 ? 0.5 : (i + 0.5) / n);
            });
        },

        ubicarCosas: function () { this.sembrar(); },

        mostrarOpciones: async function (nv) {
            var self = this;
            var n = nv.opciones.length;
            var tam = Math.min(this.L.tam, 130);
            this.cosas = nv.opciones.map(function (id, i) { return self.crearNube(id, i, tam); });
            this.sembrar();
            this.t0 = this.time.now;
            this.v = 12 + (this.nivelActual || 0) * 9;
            this.recorrido = 0;
            K.ruido({ f: 1200, q: 1, dur: 0.1, vol: 0.05 });
            this.cosas.forEach(function (a, i) { self.tweens.add({ targets: a.cont, alpha: 1, duration: 450, delay: i * 120 }); });
            await esperar(this, 600);
        },

        prepararNivel: async function () {
            await this.retirar(this.cosas);
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.cosas = [];
            this.ocupado = false;
            this.autoObj = null;
        },

        alSonar: function () {
            this.rafaga = 1;
            Ut.estallido(this, this.L.W * 0.5, this.L.H * 0.14, { n: 3, tex: 'nota', tam: 24, dist: 90, depth: 70 });
        },

        /* ── Pilotar ── */

        alTocar: function (p) { if (this.fase === 'jugar') { this.pulsado = true; this.meta = { x: p.x, y: p.y }; this.pista.reiniciar(); } },
        alMover: function (p) { if (this.pulsado && this.fase === 'jugar') this.meta = { x: p.x, y: p.y }; },
        alSoltar: function () { this.pulsado = false; },

        seleccionar: async function (a) {
            if (this.ocupado) return;
            this.ocupado = true;
            this.nubeActual = a;
            Ut.estallido(this, a.cont.x, a.cont.y, { n: 8, tex: 'chispa', tam: 22, dist: 90, depth: 70, sinTinte: true });
            var ok = await this.elegir(a.id, { x: a.cont.x, y: a.cont.y });
            if (ok === false) { a.dwell = -2.5; this.kite.vx = -6; this.kite.vy = 6; this.meta = null; }
            this.ocupado = false;
        },

        alAcertar: async function () {
            var a = this.nubeActual;
            if (!a) return;
            this.reunidos.push(a.id);
            Ut.estallido(this, a.cont.x, a.cont.y, { n: 16, tex: 'estrella', tam: 28, dist: 160, depth: 70, sinTinte: true });
            a.saltito(0.3, 3);
            await this.sonar(a.id, { breve: true, bocina: false });
            await esperar(this, 250);
        },

        alFallar: async function () {
            var a = this.nubeActual;
            if (a) a.sacudir();
            await esperar(this, 600);
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
            var k = this.kite;
            return this.ctx.mano({ punto: { x: k.x, y: k.y }, holdMs: 200, arrastre: { dx: a.cont.x - k.x, dy: a.cont.y - k.y, durMs: 1100 }, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
        },

        demoPaso: function () {
            var self = this;
            var a = this.correctaDe(this.cosas);
            if (!a) return null;
            var k = this.kite;
            return {
                desde: { x: k.x, y: k.y }, hasta: { x: a.cont.x, y: a.cont.y },
                hacer: async function () {
                    self.autoObj = a;
                    var t0 = self.time.now;
                    while (!self.ocupado && self.time.now - t0 < 4000) await esperar(self, 100);
                    while (self.ocupado && self.time.now - t0 < 6000) await esperar(self, 100);
                    self.autoObj = null;
                }
            };
        },

        escenaFinal: async function () {
            var self = this, L = this.L;
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.cosas = [];
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; }).slice(0, 3);
            if (!ids.length) ids = ['lluvia', 'mar', 'viento'];
            this.cosas = ids.map(function (id, i) { return self.crearNube(id, i, Math.min(L.tam, 130)); });
            this.sembrar();
            this.t0 = this.time.now; this.recorrido = 0; this.v = 20;
            this.cosas.forEach(function (a, i) { self.tweens.add({ targets: a.cont, alpha: 1, duration: 400, delay: i * 100 }); });
            for (var i = 0; i < ids.length; i++) {
                if (!this.sigue()) return;
                this.autoObj = this.cosas[i];
                await esperar(this, 1300);
                var a = this.cosas[i];
                Ut.estallido(this, a.cont.x, a.cont.y, { n: 12, tex: 'estrella', tam: 26, dist: 140, depth: 70, sinTinte: true });
                a.saltito(0.3, 2);
                await this.sonar(ids[i], { breve: true, bocina: false });
            }
            this.autoObj = null;
            Ut.confeti(this, 90);
            await esperar(this, 1000);
        },

        estadoExtra: function () {
            return {
                kite: { x: Math.round(this.kite.x), y: Math.round(this.kite.y) },
                cosas: this.cosas.filter(function (a) { return a.cont.active; }).map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y), dwell: +a.dwell.toFixed(2) }; })
            };
        },

        paso: function (time, delta) {
            var L = this.L, dt = Math.min(0.05, (delta || 16) / 1000), self = this;
            if (!this.kiteC || !this.kiteC.active) return;
            this.recorrido = (this.recorrido || 0) + this.v * dt;
            // Nubes que derivan.
            this.cosas.forEach(function (a) {
                if (!a.cont.active || self.tweens.isTweening(a.cont)) return;
                var x = ((a.off + self.recorrido) % self.span) - L.tam * 0.7;
                a.cont.x = x;
                a.cont.y = a.yBase + Math.sin(time / 1000 + a.fase2) * 12;
                a.cont.setAlpha(Math.min(1, Math.max(0, Math.min(x + L.tam * 0.7, L.der - x) / (L.tam * 0.8))));
                if (a.nube) {
                    // La nube respira y se esponja cuando la cometa se queda sobre ella.
                    if (!a.nS) a.nS = { x: a.nube.scaleX, y: a.nube.scaleY };
                    var br = 1 + 0.025 * Math.sin(time / 700 + a.fase2) + (a.dwell > 0 ? 0.05 * Math.min(1, a.dwell / 0.7) : 0);
                    a.nube.setScale(a.nS.x * br, a.nS.y / (1 + (br - 1) * 0.6));
                }
            });
            // Cometa: sigue al dedo (o a la nube en la demo), con viento.
            var k = this.kite;
            var meta = this.autoObj ? { x: this.autoObj.cont.x, y: this.autoObj.cont.y } : this.meta;
            if (meta) { k.vx += (meta.x - k.x) * 6 * dt; k.vy += (meta.y - k.y) * 6 * dt; }
            else { k.vx += Math.sin(time / 900) * 20 * dt; k.vy += Math.cos(time / 1100) * 14 * dt; }
            if ((this.nivelActual || 0) >= 2 && this.fase === 'jugar') k.vx += Math.sin(time / 1700) * 90 * dt * (this.nivelActual - 1);   // ráfagas
            k.vx *= 0.9; k.vy *= 0.9;
            k.x += k.vx * dt * 6; k.y += k.vy * dt * 6;
            k.x = Math.max(40, Math.min(L.der - 20, k.x)); k.y = Math.max(40, Math.min(L.horizonte - 60, k.y));
            k.ang += ((k.vx * 0.6) - k.ang) * 0.1;
            this.kiteC.setPosition(k.x, k.y).setAngle(Math.max(-35, Math.min(35, k.ang)));
            if (this.kiteCuerpo && this.kiteCuerpo.active) this.kiteCuerpo.setAngle(CUERPO.giro + Math.sin(time / 260) * 2.5 + Math.min(6, Math.abs(k.vx) * 0.4) * Math.sin(time / 90));
            // Cola con retardo.
            var prev = { x: k.x - Math.sin(k.ang * 0.017) * 0, y: k.y + this.kiteS * 1.2 };
            this.cola.forEach(function (c, i) {
                c.x += (prev.x - c.x) * 0.35 + Math.sin(time / 180 + i) * 0.8;
                c.y += (prev.y + 10 - c.y) * 0.35;
                prev = c;
            });
            var g = this.hiloG;
            g.clear();
            g.lineStyle(2, 0xf8f9fa, 0.95);
            g.beginPath(); g.moveTo(L.ancla.x, L.ancla.y);
            g.lineTo(k.x, k.y + this.kiteS * 1.2);
            g.strokePath();
            var arteCola = this.lazos && this.lazos.length;
            g.lineStyle(arteCola ? 2 : 3, arteCola ? 0xe8501b : 0xff6b6b, arteCola ? 0.85 : 1); g.beginPath(); g.moveTo(k.x, k.y + this.kiteS * 1.2);
            this.cola.forEach(function (c) { g.lineTo(c.x, c.y); });
            g.strokePath();
            var colores = [0xffd43b, 0x4dabf7, 0xff6b6b, 0x69db7c, 0xcc5de8, 0xffd43b, 0x4dabf7];
            if (arteCola) {
                // Lazos del diseño: cada uno mira hacia donde cuelga el tramo de cola y aletea con el viento.
                var ant = { x: k.x, y: k.y + this.kiteS * 1.2 };
                this.cola.forEach(function (c, i) {
                    var lz = self.lazos[i];
                    if (lz && lz.active) lz.setPosition(c.x, c.y).setAngle(Math.atan2(c.y - ant.y, c.x - ant.x) * 57.3 - 45 + Math.sin(time / 170 + i * 1.3) * 12);
                    ant = c;
                });
                var ult = this.cola[this.cola.length - 1];
                if (ult && this.cintas && this.cintas.active) this.cintas.setPosition(ult.x, ult.y + 6).setAngle(Math.sin(time / 140) * 14);
            } else this.cola.forEach(function (c, i) { g.fillStyle(colores[i % colores.length], 1); g.fillTriangle(c.x - 7, c.y - 5, c.x + 7, c.y - 5, c.x, c.y + 7); });
            // Pasto que se mece con el viento.
            var p = this.pastoG; p.clear(); p.fillStyle(0x51cf66, 0.8);
            if (this.hojasG && this.hojasG.active) {
                // Hojas y pétalos que el viento arrastra desde los árboles; las ráfagas los empujan más.
                var hg = this.hojasG; hg.clear();
                var empuje = 1 + (this.nivelActual || 0) * 0.5 + Math.max(0, Math.sin(time / 1700)) * (this.nivelActual >= 2 ? 1.2 : 0);
                this.hojas.forEach(function (h) {
                    h.x -= h.vx * empuje * dt; h.a += dt * 2.2;
                    var y = h.y + Math.sin(time / 800 + h.ph) * 16;
                    if (h.x < -20) { h.x = L.der + 20; h.y = L.H * (0.2 + Math.random() * 0.45); }
                    var c = Math.cos(h.a), sn = Math.sin(h.a), r = h.r;
                    hg.fillStyle(h.c, 0.9);
                    hg.fillTriangle(h.x - c * r * 1.6, y - sn * r * 1.6, h.x + sn * r * 0.8, y - c * r * 0.8, h.x - sn * r * 0.8, y + c * r * 0.8);
                    hg.fillTriangle(h.x + c * r * 1.6, y + sn * r * 1.6, h.x + sn * r * 0.8, y - c * r * 0.8, h.x - sn * r * 0.8, y + c * r * 0.8);
                });
            }
            if (!this.arteOk) for (var i = 0; i < 90; i++) { var gx = (i * 61) % L.W, gy = L.horizonte + 10 + ((i * 37) % (L.H - L.horizonte - 12)); var sw = Math.sin(time / 500 + i) * 6 * (1 + (this.nivelActual || 0) * 0.3); p.fillTriangle(gx, gy, gx + 5, gy, gx + 2 + sw, gy - 16); }
            // Elegir quedándose sobre una nube.
            var ar = this.anilloG; ar.clear();
            if (this.fase === 'jugar' && !this.ocupado) {
                this.cosas.forEach(function (a) {
                    if (!a.cont.active) return;
                    var d = Math.hypot(k.x - a.cont.x, k.y - a.cont.y);
                    if (d < a.tam * 0.55) a.dwell += dt; else a.dwell = a.dwell < 0 ? Math.min(0, a.dwell + dt * 0.6) : Math.max(0, a.dwell - dt * 1.5);
                    if (a.dwell > 0.02) { ar.lineStyle(8, 0x51cf66, 0.9); ar.beginPath(); ar.arc(a.cont.x, a.cont.y, a.tam * 0.62, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, a.dwell / 0.7), false); ar.strokePath(); }
                    if (a.dwell >= 0.7) self.seleccionar(a);
                });
            }
        }
    };

    K.crear({ id: 'cometa', fondo: '#a5d8ff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
