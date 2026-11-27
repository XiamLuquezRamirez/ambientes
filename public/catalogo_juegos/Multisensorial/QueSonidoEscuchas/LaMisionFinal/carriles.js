/**
 * «El corredor de carriles» — motor propio de La Misión Final (5-6 años).
 *
 * Misión: conducir por una ruta de varios carriles. Suena un sonido y, cuando empieza el camino,
 * llegan puertas con las imágenes (una por carril). El niño ARRASTRA el coche de un carril a otro y
 * cruza la puerta del sonido que escuchó. Si cruza otra, suena su propio sonido y llega otra
 * tanda de puertas (sin castigo); con la bocina vuelve a escuchar el sonido. En los niveles altos
 * el camino va más rápido y hay más carriles.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    var COLORES = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xcc5de8];

    /* ── Arte del diseñador (img/diseno): fondo de carretera 1280×720, 4 cartas y el carro (vista desde arriba) ── */
    var DIR = 'img/diseno/';
    var FONDO_W = 1280, FONDO_H = 720;
    var CARRILES_U = [316, 534, 746, 957];                // centros de los 4 carriles del dibujo
    var ANCHO_CARRIL_U = 211;
    var RUTA_U = { x0: 165, x1: 1092, vi0: 196, vi1: 1062 };   // bordillo izquierdo/derecho y calzada
    var DIVISORES_U = [429, 640, 852];                    // rayas blancas entre carriles
    var CARRO = { w: 424.9, h: 720, cx: 205, cy: 359, largo: 650 };
    var C_ASFALTO = 0x9fa0a4, C_ROJO = 0xe44944, C_BLANCO = 0xf8f8f6, C_PASTO = 0x52a101;

    var escena = {
        iniciar: function () {
            this.cosas = [];
            this.puertas = null;
            this.reunidos = [];
            this.carro = null;
            this.meta = null;
            this.pulsado = false;
            this.corre = false;
            this.scroll = 0;
            this.v = 170;
            this.opcionesNv = [];
            this.siguiente = 0;
            this.auto = null;
        },

        precargar: function () {
            if (!this.textures.exists('lm_fondo')) this.load.svg('lm_fondo', DIR + 'fondo.svg', { width: 1280, height: 720 });
            for (var i = 1; i <= 4; i++) if (!this.textures.exists('lm_carta' + i)) this.load.svg('lm_carta' + i, DIR + 'carta' + i + '.svg', { width: 256, height: 256 });
            if (!this.textures.exists('lm_carro')) this.load.svg('lm_carro', DIR + 'carro.svg', { width: 213, height: 360 });
        },

        arteOk: function () {
            if (!this.textures.exists('lm_fondo') || !this.textures.exists('lm_carro')) return false;
            for (var i = 1; i <= 4; i++) if (!this.textures.exists('lm_carta' + i)) return false;
            return true;
        },

        /** Encaje del fondo: cubre la pantalla, centrado (la carretera queda en el medio, el pasto a los lados). */
        marcoFondo: function (W, H) {
            var k = Math.max(W / FONDO_W, H / FONDO_H);
            var ox = (W - FONDO_W * k) / 2;
            return { k: k, ox: ox, sx: function (x) { return ox + x * k; } };
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.cx = Math.round(L.der / 2);
            L.tam = Math.max(78, Math.min(116, (L.der - 160) / 4.6, H * 0.15));
            L.carroY = Math.round(H * 0.8);
            L.bocina = { x: 48, y: Math.round(H * 0.3), r: Math.max(24, Math.min(32, hueco * 0.28)) };
            if (this.arteOk()) {
                var F = L.F = this.marcoFondo(W, H);
                L.cx = Math.round(F.sx(640));
                L.carroLen = Math.round(L.tam * 1.7);
            }
            return L;
        },

        carriles: function (n) {
            var L = this.L;
            if (L.F) {
                // Los carriles del dibujo: 3 usan los de la izquierda, 4 todos, 2 los del medio.
                var ini = n >= 3 ? 0 : 1, out2 = [];
                for (var j = 0; j < n; j++) out2.push({ x: L.F.sx(CARRILES_U[Math.min(3, ini + j)]), w: ANCHO_CARRIL_U * L.F.k });
                this.anchoCarril = out2[0].w;
                return out2;
            }
            var w = Math.min(L.tam * 1.35, (L.der - 200) / n);
            var out = [];
            for (var i = 0; i < n; i++) out.push({ x: L.cx + (i - (n - 1) / 2) * w, w: w });
            this.anchoCarril = w;
            return out;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            if (L.F) { this.armarArte(L, keep); this.montarHud(keep); return; }
            var V = this.montarVida(keep);
            if (V) V.parque({ horizonte: Math.round(L.H * 0.18), arboles: [0.04, 0.96], solX: 0.1 });
            this.rutaG = keep(this.add.graphics().setDepth(3));
            this.orillaG = keep(this.add.graphics().setDepth(4));
            var c = keep(this.add.container(L.cx, L.carroY).setDepth(40));
            var g = this.add.graphics();
            g.fillStyle(0x000000, 0.22); g.fillEllipse(0, 30, 74, 26);
            g.fillStyle(0xe03131, 1); g.fillRoundedRect(-30, -50, 60, 100, 16);
            g.fillStyle(0xff8787, 1); g.fillRoundedRect(-24, -44, 48, 36, 10);
            g.fillStyle(0x364fc7, 1); g.fillRoundedRect(-22, -22, 44, 26, 8);
            g.fillStyle(0xa5d8ff, 0.85); g.fillRoundedRect(-18, -18, 36, 18, 6);
            g.fillStyle(0xffd43b, 1); g.fillCircle(-18, -48, 6); g.fillCircle(18, -48, 6);
            g.fillStyle(0x212529, 1); g.fillRoundedRect(-36, -34, 8, 22, 4); g.fillRoundedRect(28, -34, 8, 22, 4); g.fillRoundedRect(-36, 18, 8, 22, 4); g.fillRoundedRect(28, 18, 8, 22, 4);
            g.fillStyle(0xffffff, 0.9); g.fillRect(-4, -50, 8, 100);
            c.add(g);
            this.carro = c;
            this.montarHud(keep);
        },

        /** Carretera del diseño: el fondo se desplaza (dos copias apiladas), la calzada y sus rayas se repintan encima para que no se note el empalme. */
        armarArte: function (L, keep) {
            var F = L.F, k = F.k, self = this;
            this.vidaAmb = null;
            keep(this.add.rectangle(0, 0, L.W, L.H, C_PASTO).setOrigin(0, 0).setDepth(0));
            this.fondoA = keep(this.add.image(F.ox, 0, 'lm_fondo').setOrigin(0, 0).setDisplaySize(FONDO_W * k, FONDO_H * k).setDepth(2));
            this.fondoB = keep(this.add.image(F.ox, 0, 'lm_fondo').setOrigin(0, 0).setDisplaySize(FONDO_W * k, FONDO_H * k).setDepth(2));
            this.rutaG = keep(this.add.graphics().setDepth(3));
            this.orillaG = keep(this.add.graphics().setDepth(3.6));      // sombras de nubes y polvo
            this.orillaG.setBlendMode(Phaser.BlendModes.NORMAL);
            this.sombras = [0, 1].map(function (i) { return { x: Math.random() * L.W, y: Math.random() * L.H, vx: 14 + i * 9, r: (170 + i * 70) * k }; });
            this.polvo = [];
            // Halo suave para los faros.
            if (!this.textures.exists('lm_halo')) {
                var cv = this.textures.createCanvas('lm_halo', 128, 128), cx = cv.getContext();
                var gr = cx.createRadialGradient(64, 64, 0, 64, 64, 64);
                gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
                cx.fillStyle = gr; cx.fillRect(0, 0, 128, 128); cv.refresh();
            }
            var c = keep(this.add.container(L.cx, L.carroY).setDepth(40));
            var esc = L.carroLen / CARRO.largo, w = CARRO.w * esc, h = CARRO.h * esc;
            // El dibujo no está centrado en su lienzo: se alinea el centro del cuerpo con el origen.
            var img = this.add.image(0, 0, 'lm_carro').setDisplaySize(w, h).setOrigin(CARRO.cx / CARRO.w, CARRO.cy / CARRO.h);
            var sombra = this.add.ellipse(6, 8, CARRO.largo * 0.36 * esc, L.carroLen * 1.02, 0x000000, 0.2);
            var fy = -L.carroLen * 0.52;
            var f1 = this.add.image(-L.carroLen * 0.17, fy, 'lm_halo').setDisplaySize(L.carroLen * 0.55, L.carroLen * 0.55).setTint(0xfff2a8).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35);
            var f2 = this.add.image(L.carroLen * 0.17, fy, 'lm_halo').setDisplaySize(L.carroLen * 0.55, L.carroLen * 0.55).setTint(0xfff2a8).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35);
            c.add([sombra, img, f1, f2]);
            this.carro = c; this.carroImg = img; this.faros = [f1, f2]; this.carroLen = L.carroLen;
            this.scrollY = 0;
        },

        /** Cada cuadro con el arte: desplaza el fondo, repinta calzada, bordillos y rayas, nubes y polvo. */
        pasoArte: function (time, dt) {
            var L = this.L, F = L.F, k = F.k, self = this;
            var hk = FONDO_H * k, v = this.corre ? this.v : 60;
            this.scrollY = (this.scrollY + v * dt) % hk;
            this.fondoA.y = this.scrollY - hk;
            this.fondoB.y = this.scrollY;
            var g = this.rutaG; g.clear();
            var x0 = F.sx(RUTA_U.x0), x1 = F.sx(RUTA_U.x1), vi0 = F.sx(RUTA_U.vi0), vi1 = F.sx(RUTA_U.vi1);
            g.fillStyle(C_ASFALTO, 1); g.fillRect(vi0, 0, vi1 - vi0, L.H);
            // Bordillos rojo y blanco que corren.
            var pb = 27.7 * k, off = this.scrollY % (pb * 2);
            for (var y = -pb * 2 + off; y < L.H; y += pb * 2) {
                g.fillStyle(C_ROJO, 1); g.fillRect(x0, y, vi0 - x0, pb); g.fillRect(vi1, y, x1 - vi1, pb);
                g.fillStyle(C_BLANCO, 1); g.fillRect(x0, y + pb, vi0 - x0, pb); g.fillRect(vi1, y + pb, x1 - vi1, pb);
            }
            // Rayas entre carriles.
            var pd = 84.7 * k, lg = 36.5 * k, od = this.scrollY % pd;
            g.fillStyle(0xffffff, 1);
            DIVISORES_U.forEach(function (d) { for (var y2 = -pd + od; y2 < L.H; y2 += pd) g.fillRect(F.sx(d) - 4.5 * k, y2, 9 * k, lg); });
            // Sombras de nubes que cruzan.
            var og = this.orillaG; og.clear();
            this.sombras.forEach(function (n) {
                n.x += n.vx * dt; n.y += v * dt * 0.3;
                if (n.x - n.r > L.W) n.x = -n.r; if (n.y - n.r > L.H) n.y = -n.r;
                og.fillStyle(0x1a3d0a, 0.04); og.fillEllipse(n.x, n.y, n.r * 2, n.r * 1.1); og.fillEllipse(n.x + n.r * 0.6, n.y + n.r * 0.15, n.r * 1.2, n.r * 0.7);
            });
            // Polvo que deja el coche al correr.
            var c = this.carro;
            if (this.corre && (!this.ultPolvo || time - this.ultPolvo > 110)) {
                this.ultPolvo = time;
                this.polvo.push({ x: c.x + (Math.random() - 0.5) * this.carroLen * 0.3, y: c.y + this.carroLen * 0.5, a: 0.5, r: (3 + Math.random() * 3) * k });
            }
            this.polvo = this.polvo.filter(function (p) { p.y += v * dt * 0.9; p.a -= dt * 0.9; p.r += dt * 9; return p.a > 0; });
            this.polvo.forEach(function (p) { og.fillStyle(0xffffff, p.a * 0.6); og.fillCircle(p.x, p.y, p.r); });
            // El coche vibra al rodar, se inclina al cambiar de carril y los faros respiran.
            var dx = this.carroObj != null ? (this.carroObj - c.x) : 0;
            var inc = Math.max(-12, Math.min(12, dx * 0.09));
            this.carroImg.angle += (inc - this.carroImg.angle) * Math.min(1, dt * 10);
            this.carroImg.y = this.corre ? Math.sin(time / 38) * 0.9 * k : 0;
            this.faros.forEach(function (f, i) { f.setAlpha(0.3 + 0.12 * Math.sin(time / 420 + i)); });
        },

        /* ── Puertas que llegan por el camino ── */

        crearPuertas: function () {
            var self = this, L = this.L;
            var lanes = this.carriles(this.opcionesNv.length);
            var ids = this.opcionesNv.slice();
            var tam = Math.min(L.tam, this.anchoCarril * 0.78);
            var items = ids.map(function (id, i) {
                var arte = !!L.F;
                var a = self.crearCosa(id, lanes[i].x, -tam, tam * (arte ? 0.7 : 0.62), { depth: 30, sinTinte: true, sinSombra: true });
                var g = self.add.graphics();
                var col = COLORES[i % COLORES.length];
                if (arte) {
                    // Carta del diseño (marco crema con el fondo de color): el dibujo mide 406 de los 500 del lienzo.
                    g.fillStyle(0x000000, 0.2); g.fillRoundedRect(-tam * 0.575 + 3, -tam * 0.575 + 6, tam * 1.15, tam * 1.15, 12);
                    var carta = self.add.image(0, 0, 'lm_carta' + (i % 4 + 1)).setDisplaySize(tam * 1.15 * 500 / 406, tam * 1.15 * 500 / 406);
                    a.cont.addAt(carta, 0);
                } else {
                g.fillStyle(0x000000, 0.2); g.fillRoundedRect(-tam * 0.55 + 3, -tam * 0.55 + 6, tam * 1.1, tam * 1.1, 14);
                g.fillStyle(col, 1); g.fillRoundedRect(-tam * 0.55, -tam * 0.55, tam * 1.1, tam * 1.1, 14);
                g.fillStyle(0xffffff, 1); g.fillRoundedRect(-tam * 0.45, -tam * 0.45, tam * 0.9, tam * 0.9, 10);
                g.fillStyle(0x495057, 1); g.fillRect(-tam * 0.55, tam * 0.5, 8, tam * 0.5); g.fillRect(tam * 0.55 - 8, tam * 0.5, 8, tam * 0.5);
                }
                var lz = arte ? 0.5 : 0.55; var luz = self.add.graphics(); luz.fillStyle(0x69db7c, 1); luz.fillRoundedRect(-tam * lz, -tam * lz, tam * lz * 2, tam * lz * 2, 12); luz.setAlpha(0);
                a.cont.addAt(g, 0); a.cont.addAt(luz, arte ? 2 : 1);
                a.luz = luz; a.tam = tam; a.lane = i; a.lx = lanes[i].x;
                return a;
            });
            this.puertas = { items: items, y: -tam, vivo: true, atendida: false };
            this.cosas = items;
        },

        retirarPuertas: function () {
            if (!this.puertas) return;
            this.puertas.items.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.puertas = null;
            this.cosas = [];
        },

        mostrarOpciones: async function (nv) {
            this.opcionesNv = nv.opciones.slice();
            this.retirarPuertas();
            this.corre = true;
            this.v = 170 + (this.nivelActual || 0) * 55;
            this.carro.x = this.L.cx;
            this.meta = null;
            this.crearPuertas();
            await esperar(this, 300);
        },

        prepararNivel: async function () {
            this.retirarPuertas();
            this.corre = false;
        },

        alSonar: function () {
            Ut.estallido(this, this.L.cx, this.L.H * 0.3, { n: 3, tex: 'nota', tam: 24, dist: 100, depth: 70 });
        },

        /* ── Conducir ── */

        alTocar: function (p) { if (this.fase === 'jugar') { this.pulsado = true; this.meta = p.x; this.pista.reiniciar(); } },
        alMover: function (p) { if (this.pulsado) this.meta = p.x; },
        alSoltar: function () { this.pulsado = false; },

        carrilCercano: function (x) {
            var lanes = this.carriles(this.opcionesNv.length), mejor = 0, dm = 1e9;
            lanes.forEach(function (l, i) { var d = Math.abs(l.x - x); if (d < dm) { dm = d; mejor = i; } });
            return mejor;
        },

        cruzar: async function (a) {
            this.puertas.atendida = true;
            this.actual = a;
            a.luz.setAlpha(0.9);
            K.ruido({ f: 900, q: 1, dur: 0.12, vol: 0.1 });
            var ok = await this.elegir(a.id, { x: a.cont.x, y: a.cont.y });
            if (ok === false) {
                // el coche se tambalea y llega otra tanda de puertas
                await esperar(this, 500);
                if (this.fase === 'jugar' && this.corre) { this.retirarPuertas(); this.crearPuertas(); }
            }
        },

        alAcertar: async function () {
            var a = this.actual;
            if (!a) return;
            this.corre = false;
            this.reunidos.push(a.id);
            Ut.estallido(this, this.carro.x, this.carro.y - 40, { n: 16, tex: 'estrella', tam: 28, dist: 160, depth: 70, sinTinte: true });
            this.tweens.add({ targets: this.carro, angle: 360, duration: 600 });
            a.saltito(0.3, 2);
            await this.sonar(a.id, { breve: true, bocina: false });
            this.carro.angle = 0;
            await esperar(this, 250);
        },

        alFallar: async function () {
            var c = this.carro;
            this.cameras.main.shake(150, 0.004);
            await tw(this, { targets: c, angle: { from: -12, to: 12 }, duration: 80, yoyo: true, repeat: 3 });
            c.angle = 0;
        },

        alTerminarNivel: async function () {
            this.retirarPuertas();
            this.corre = false;
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            var a = this.puertas && this.correctaDe(this.puertas.items);
            if (!a || !this.ayuda) {
                if (this.bocina) this.tweens.add({ targets: this.bocina, scale: 1.18, duration: 220, yoyo: true, repeat: 2 });
                return esperar(this, 900);
            }
            return this.ctx.mano({ punto: { x: this.carro.x, y: this.carro.y }, holdMs: 200, arrastre: { dx: a.lx - this.carro.x, dy: 0, durMs: 800 }, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
        },

        demoPaso: function () {
            var self = this;
            var a = this.puertas && this.correctaDe(this.puertas.items);
            if (!a) return null;
            return {
                desde: { x: this.carro.x, y: this.carro.y }, hasta: { x: a.lx, y: this.carro.y },
                hacer: async function () {
                    self.auto = a.lx;
                    var t0 = self.time.now;
                    while (self.fase === 'jugar' && self.time.now - t0 < 9000) await esperar(self, 120);
                    self.auto = null;
                }
            };
        },

        escenaFinal: async function () {
            var self = this, L = this.L;
            this.retirarPuertas();
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; }).slice(0, 4);
            while (ids.length < 3) ids.push(['lluvia', 'mar', 'viento'][ids.length]);
            this.opcionesNv = ids;
            this.corre = true;
            this.v = 260;
            this.crearPuertas();
            this.puertas.final = true;
            for (var i = 0; i < ids.length; i++) {
                if (!this.sigue()) return;
                this.auto = this.puertas.items[i].lx;
                await esperar(this, 650);
                var a = this.puertas.items[i];
                a.luz.setAlpha(0.9);
                Ut.estallido(this, a.cont.x, a.cont.y, { n: 10, tex: 'estrella', tam: 26, dist: 140, depth: 70, sinTinte: true });
                await this.sonar(ids[i], { breve: true, bocina: false });
            }
            this.auto = null;
            Ut.confeti(this, 100);
            this.corre = false;
            await esperar(this, 1000);
        },

        estadoExtra: function () {
            var p = this.puertas;
            return {
                carro: this.carro ? { x: Math.round(this.carro.x), y: Math.round(this.carro.y) } : null,
                lanes: this.opcionesNv.length ? this.carriles(this.opcionesNv.length).map(function (l) { return Math.round(l.x); }) : [],
                cosas: p ? p.items.filter(function (a) { return a.cont.active; }).map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y), lane: a.lane }; }) : []
            };
        },

        paso: function (time, delta) {
            var L = this.L, dt = Math.min(0.05, (delta || 16) / 1000), self = this;
            if (!this.carro || !this.carro.active) return;
            var v = this.corre ? this.v : 60;
            this.scroll = (this.scroll + v * dt) % 80;
            // Ruta y orillas con desplazamiento.
            var n = this.opcionesNv.length || 3;
            var lanes = this.carriles(n);
            var ancho = lanes[0].w * n + 40;
            if (L.F) this.pasoArte(time, dt);
            var rg = this.rutaG; if (!L.F) rg.clear();
            if (!L.F) {
            rg.fillStyle(0x8ce99a, 1); rg.fillRect(0, 0, L.W, L.H);
            rg.fillStyle(0x495057, 1); rg.fillRect(L.cx - ancho / 2, 0, ancho, L.H);
            rg.fillStyle(0xfcc419, 1); rg.fillRect(L.cx - ancho / 2 - 8, 0, 8, L.H); rg.fillRect(L.cx + ancho / 2, 0, 8, L.H);
            rg.fillStyle(0xffffff, 0.85);
            for (var k = 1; k < n; k++) { var lx = L.cx - ancho / 2 + 20 + lanes[0].w * k; for (var y = -80; y < L.H + 80; y += 80) rg.fillRect(lx - 3, y + this.scroll, 6, 40); }
            var og = this.orillaG; og.clear();
            for (var t = -1; t < 8; t++) {
                var ty = t * 120 + (this.scroll * 1.5) % 120;
                [L.cx - ancho / 2 - 90, L.cx + ancho / 2 + 90].forEach(function (tx, s) {
                    if (tx < 20 || tx > L.der + 20) return;
                    og.fillStyle(0x7a4e1e, 1); og.fillRect(tx - 6, ty + 18, 12, 26);
                    og.fillStyle(s ? 0x2f9e44 : 0x40c057, 1); og.fillCircle(tx, ty, 30);
                });
            }
            }
            // El coche sigue al dedo; al soltar se acomoda en el carril más cercano.
            var obj = this.carro.x;
            if (this.auto != null) obj = this.auto;
            else if (this.meta != null) obj = this.meta;
            if (this.opcionesNv.length && (!this.pulsado || this.auto != null)) obj = lanes[this.carrilCercano(obj)].x;
            obj = Math.max(lanes[0].x, Math.min(lanes[lanes.length - 1].x, obj));
            this.carroObj = obj;
            this.carro.x += (obj - this.carro.x) * Math.min(1, dt * 10);
            // Puertas: bajan por el camino.
            var P = this.puertas;
            if (P && this.corre) {
                if (P.final) P.y = L.H * 0.45; else P.y += this.v * dt;
                P.items.forEach(function (a) { if (a.cont.active) { a.cont.x = a.lx; a.cont.y = P.y; } });
                if (!P.atendida && !P.final && this.fase === 'jugar' && P.y > (this.carroLen && L.F ? this.carro.y - this.carroLen * 0.38 : this.carro.y - 30)) {
                    var cerca = this.carrilCercano(this.carro.x);
                    this.cruzar(P.items[cerca]);
                } else if (!P.final && P.y > L.H + 100) {
                    this.retirarPuertas();
                    if (this.fase === 'jugar' && this.corre) this.crearPuertas();
                }
            }
        }
    };

    K.crear({ id: 'carriles', fondo: '#8ce99a', escena: escena });
})(typeof window !== 'undefined' ? window : this);
