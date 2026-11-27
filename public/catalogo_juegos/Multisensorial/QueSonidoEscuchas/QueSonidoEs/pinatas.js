/**
 * «Las piñatas» — motor propio de ¿Qué sonido es? (5-6 años, ¿Qué sonido escuchas?).
 *
 * Fiesta en el patio: de una viga cuelgan piñatas que se balancean, cada una con un animal. Suena
 * un animal y el niño GOLPEA la piñata de ese animal, varias veces (se agrieta con cada golpe)
 * hasta romperla. La que rompe es su respuesta: si era esa, caen dulces y el animal sale a bailar;
 * si no, el animal sale, suena su propio sonido y la piñata se vuelve a colgar (sin castigo).
 * En los niveles altos hacen falta más golpes.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    var COLORES = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xcc5de8, 0xff922b];

    // Arte del diseñador: fiesta nocturna en el pueblo (1280x720; el tablado empieza en y≈565), piñata de estrella con
    // centro blanco, palo y 3 globos. Marcos en px de cada textura (cargadas a 1.5x del lienzo original).
    var ARTE = { w: 1280, h: 720, suelo: 650 };
    var PIEZAS = {
        qe_pinata: { f: 'pinata', w: 533, h: 750, rec: [28, 258, 478, 480] },
        qe_palo: { f: 'palo', w: 533, h: 750, rec: [29, 28, 475, 695] },
        qe_globo1: { f: 'globo1', w: 272, h: 659, rec: [31, 20, 209, 620] },
        qe_globo2: { f: 'globo2', w: 272, h: 529, rec: [33, 25, 206, 480] },
        qe_globo3: { f: 'globo3', w: 272, h: 529, rec: [16, 25, 206, 480] }
    };
    // Piñata: el centro de la estrella está en (0.511, 0.456) del marco y el centro blanco mide ≈ 0.21 del ancho del marco.
    var PIN = { ox: 0.511, oy: 0.456, w: 318, h: 320, arriba: 146 };
    var PAPELES = [0xff306a, 0x9a17ef, 0x4a78f2, 0x07c2bd, 0xffb300, 0xf9d315];

    var escena = {
        precargar: function () {
            var self = this;
            if (!this.textures.exists('qe_fondo')) this.load.svg('qe_fondo', 'img/diseno/fondo.svg', { width: 1280, height: 720 });
            Object.keys(PIEZAS).forEach(function (k) {
                if (!self.textures.exists(k)) self.load.svg(k, 'img/diseno/' + PIEZAS[k].f + '.svg', { width: PIEZAS[k].w, height: PIEZAS[k].h });
            });
        },

        prepararArte: function () {
            var self = this;
            this.arteOk = this.scale.width >= 900 && this.textures.exists('qe_fondo') && Object.keys(PIEZAS).every(function (k) { return self.textures.exists(k); });
            if (!this.arteOk) return;
            Object.keys(PIEZAS).forEach(function (k) {
                var t = self.textures.get(k), r = PIEZAS[k].rec;
                if (!t.has('rec')) t.add('rec', 0, r[0], r[1], r[2], r[3]);
            });
        },

        iniciar: function () {
            this.cosas = [];
            this.reunidos = [];
            this.ocupado = false;
            this.papeles = [];
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
            L.viga = Math.round(H * 0.15);
            L.suelo = Math.round(H * 0.86);
            L.largo = Math.round(H * 0.24);
            if (this.arteOk) { L.viga = Math.round(H * 0.02); L.suelo = Math.round(ARTE.suelo * H / ARTE.h); L.largo = Math.round(H * 0.37); }
            L.tam = Math.max(100, Math.min(160, (L.der - 80) / 4.2, H * 0.22));
            L.bocina = { x: 48, y: Math.round(H * 0.3), r: Math.max(24, Math.min(32, hueco * 0.28)) };
            return L;
        },

        armar: function (reubicar) {
            this.prepararArte();
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            if (this.arteOk) {
                keep(this.add.image(0, 0, 'qe_fondo').setOrigin(0, 0).setDisplaySize(L.W, L.H).setDepth(1));
                this.brillosG = keep(this.add.graphics().setDepth(1.5));
                this.estrellas = [];
                for (var e = 0; e < 26; e++) this.estrellas.push({ x: Math.random() * L.W, y: Math.random() * L.H * 0.5, ph: Math.random() * 6, r: 1.5 + Math.random() * 2.2 });
                // Globos del diseño que suben despacito por el cielo de la fiesta.
                var kk = L.H / ARTE.h, nom = ['qe_globo1', 'qe_globo2', 'qe_globo3'];
                this.globos = [];
                for (var gb = 0; gb < 7; gb++) {
                    var k = nom[gb % 3], r = PIEZAS[k].rec, alto = (gb % 3 === 0 ? 170 : 140) * kk * (0.8 + Math.random() * 0.3);
                    var im = keep(this.add.image(0, 0, k, 'rec').setDepth(3 + (gb % 2) * 0.1).setOrigin(0.5, 0.35));
                    im.setDisplaySize(alto * r[2] / r[3], alto);
                    this.globos.push({ im: im, x: L.W * (0.06 + 0.14 * gb) + Math.random() * 40, y: L.H * (0.25 + Math.random() * 0.6), v: 9 + Math.random() * 10, ph: Math.random() * 6, alto: alto });
                }
                this.papelG = keep(this.add.graphics().setDepth(70));
                this.bate = keep(this.add.container(-200, -200).setDepth(85));
                var palo = this.add.image(0, 0, 'qe_palo', 'rec').setAngle(34.6);
                palo.setDisplaySize(PIEZAS.qe_palo.rec[2] / 1.5 * 0.37, PIEZAS.qe_palo.rec[3] / 1.5 * 0.37);
                this.bate.add(palo); this.bate.setAlpha(0);
                this.montarHud(keep);
                if (reubicar) this.ubicarCosas();
                return;
            }
            var V = this.montarVida(keep);
            if (V) {
                V.parque({ horizonte: L.suelo - 90, arboles: [0.04, 0.96], solX: 0.12 });
                V.globos && V.globos({ x: 0, y: L.H * 0.35, w: L.W, h: L.H * 0.4 });
            }
            var g = keep(this.add.graphics().setDepth(1.6));
            g.fillStyle(0xf4a261, 1); g.fillRect(0, L.suelo - 40, L.W, L.H - L.suelo + 40);
            g.fillStyle(0xe76f51, 1); g.fillRect(0, L.suelo - 40, L.W, 8);
            // viga y banderines
            var v = keep(this.add.graphics().setDepth(5));
            v.fillStyle(0x7a4e1e, 1); v.fillRoundedRect(-10, L.viga - 14, L.W + 20, 28, 8);
            v.lineStyle(3, 0x6d4c41, 1); v.lineBetween(0, L.viga + 22, L.W, L.viga + 22);
            for (var b = 0; b < L.W; b += 46) { v.fillStyle(COLORES[(b / 46) % COLORES.length | 0], 1); v.fillTriangle(b, L.viga + 22, b + 34, L.viga + 22, b + 17, L.viga + 52); }
            this.papelG = keep(this.add.graphics().setDepth(70));
            this.bate = keep(this.add.container(-200, -200).setDepth(85));
            var bg = this.add.graphics();
            bg.fillStyle(0x7a4e1e, 1); bg.fillRoundedRect(-8, -70, 16, 140, 8);
            bg.fillStyle(0xffd43b, 1); bg.fillRoundedRect(-9, -70, 18, 26, 8);
            bg.fillStyle(0xff6b6b, 1); bg.fillRect(-9, -44, 18, 10);
            this.bate.add(bg); this.bate.setAlpha(0);
            this.montarHud(keep);
            if (reubicar) this.ubicarCosas();
        },

        lugares: function (n) {
            var L = this.L;
            var x0 = 90, disp = L.der - x0 - 30;
            var out = [];
            for (var i = 0; i < n; i++) out.push({ x: x0 + disp * (i + 0.5) / n });
            return out;
        },

        ubicarCosas: function () {
            var lug = this.lugares(this.cosas.length);
            this.cosas.forEach(function (a, i) { a.x0 = lug[i].x; a.pivote.setPosition(lug[i].x, this.L.viga + 8); }, this);
        },

        crearPinata: function (id, i, lug, tam) {
            var L = this.L;
            if (this.arteOk) {
                // Piñata de estrella del diseño: el animal va en su centro blanco; la cuerda se dibuja aparte.
                var pv = this.add.container(lug.x, L.viga + 8).setDepth(30);
                var sw = tam * 1.25, k = sw / PIN.w;
                var cord = this.add.graphics();
                cord.lineStyle(3, 0xffffff, 0.95); cord.lineBetween(0, 0, 0, L.largo - PIN.arriba * k + 6);
                var cp = this.add.container(0, L.largo);
                var estrella = this.add.image(0, 0, 'qe_pinata', 'rec').setOrigin(PIN.ox, PIN.oy).setDisplaySize(PIN.w * k, PIN.h * k);
                var gr = this.add.graphics();
                cp.add([estrella, gr]);
                pv.add([cord, cp]);
                var im2 = this.add.image(0, 0, 'el_' + id);
                im2.setScale((tam * 0.4) / Math.max(im2.width, im2.height));
                cp.add(im2);
                var o = { id: id, pivote: pv, cuerpo: cp, grietas: gr, img: im2, tam: tam, x0: lug.x, golpes: 0, rot: 0, imp: 0, fase2: Math.random() * 6, rota: false, cx: lug.x, cy: L.viga + L.largo, estrella: estrella };
                o.pivote.setAlpha(0);
                return o;
            }
            var piv = this.add.container(lug.x, L.viga + 8).setDepth(30);
            var cuerda = this.add.graphics();
            cuerda.lineStyle(5, 0xf1e0b0, 1); cuerda.lineBetween(0, 0, 0, L.largo - tam * 0.45);
            var cuerpo = this.add.container(0, L.largo);
            var col = COLORES[i % COLORES.length], col2 = COLORES[(i + 3) % COLORES.length];
            var g = this.add.graphics();
            g.fillStyle(0x000000, 0.15); g.fillEllipse(6, tam * 0.5 + 6, tam * 0.8, tam * 0.12);
            // flecos de papel
            for (var f = 0; f < 5; f++) {
                g.fillStyle(f % 2 ? col : col2, 1);
                g.fillRoundedRect(-tam * 0.46, -tam * 0.4 + f * tam * 0.17, tam * 0.92, tam * 0.2, 10);
            }
            g.fillStyle(0xffffff, 0.2); g.fillEllipse(-tam * 0.2, -tam * 0.2, tam * 0.3, tam * 0.2);
            g.fillStyle(0xfff9db, 1); g.fillCircle(0, 0, tam * 0.31);
            g.lineStyle(4, 0xffffff, 1); g.strokeCircle(0, 0, tam * 0.31);
            var grietas = this.add.graphics();
            cuerpo.add([g, grietas]);
            piv.add([cuerda, cuerpo]);
            var img = this.add.image(0, 0, 'el_' + id);
            img.setScale((tam * 0.52) / Math.max(img.width, img.height));
            cuerpo.add(img);
            var a = { id: id, pivote: piv, cuerpo: cuerpo, grietas: grietas, img: img, tam: tam, x0: lug.x, golpes: 0, rot: 0, imp: 0, fase2: Math.random() * 6, rota: false, cx: lug.x, cy: L.viga + L.largo };
            a.pivote.setAlpha(0);
            return a;
        },

        necesarios: function () { return (this.nivelActual || 0) >= 2 ? 4 : 3; },

        mostrarOpciones: async function (nv) {
            var self = this;
            var lug = this.lugares(nv.opciones.length);
            var tam = Math.min(this.L.tam, (this.L.der - 120) / nv.opciones.length * 0.8);
            this.cosas = nv.opciones.map(function (id, i) { return self.crearPinata(id, i, lug[i], tam); });
            K.ruido({ f: 1000, q: 1, dur: 0.1, vol: 0.05 });
            this.cosas.forEach(function (a, i) {
                a.pivote.y -= 160;
                self.tweens.add({ targets: a.pivote, alpha: 1, y: self.L.viga + 8, duration: 420, delay: i * 120, ease: 'Bounce.easeOut' });
            });
            await esperar(this, 600 + nv.opciones.length * 120);
        },

        prepararNivel: async function () {
            var self = this;
            this.cosas.forEach(function (a) { if (a.pivote.active) a.pivote.destroy(); });
            this.cosas = [];
            this.ocupado = false;
        },

        alSonar: function () {
            Ut.estallido(this, this.L.W * 0.5, this.L.viga + 70, { n: 3, tex: 'nota', tam: 24, dist: 100, depth: 70 });
        },

        /* ── Golpear ── */

        alTocar: function (p) {
            if (this.fase !== 'jugar' || this.ocupado) return;
            var mejor = null, dm = Infinity;
            this.cosas.forEach(function (a) {
                if (a.rota) return;
                var d = Math.hypot(p.x - a.cx, p.y - a.cy);
                if (d < a.tam * 0.62 && d < dm) { dm = d; mejor = a; }
            });
            if (mejor) { this.pista.reiniciar(); this.golpear(mejor, p.x < mejor.cx ? -1 : 1); }
        },

        golpear: async function (a, lado) {
            if (a.rota || this.ocupado) return;
            a.golpes++;
            a.imp = lado * 0.55;                         // el golpe la hace balancearse
            // El palo se ve: se levanta (190 ms), golpea (150 ms), se queda un instante sobre la piñata y se desvanece.
            var b = this.bate;
            this.tweens.killTweensOf(b);
            b.setPosition(a.cx - lado * a.tam * 0.95, a.cy + a.tam * 0.1).setAlpha(0).setAngle(lado * -105);
            await tw(this, { targets: b, alpha: 1, angle: lado * -72, x: a.cx - lado * a.tam * 0.8, y: a.cy, duration: 190, ease: 'Sine.easeOut' });
            await tw(this, { targets: b, angle: lado * 18, x: a.cx - lado * a.tam * 0.6, duration: 150, ease: 'Quad.easeIn' });
            this.tweens.add({ targets: b, alpha: 0, delay: 320, duration: 260 });
            K.ruido({ f: 220, q: 0.8, dur: 0.1, vol: 0.14 });
            K.tono({ f: 180 + a.golpes * 40, dur: 0.06, vol: 0.04, tipo: 'square' });
            this.cameras.main.shake(70, 0.003);
            // papelitos y grietas
            var pal = this.arteOk ? PAPELES : COLORES;
            for (var i = 0; i < 6; i++) this.papeles.push({ x: a.cx, y: a.cy, vx: (Math.random() - 0.5) * 6 + lado * 2, vy: -2 - Math.random() * 3, col: pal[i % pal.length], t: 1 });
            this.dibujarGrietas(a);
            if (a.estrella) { this.tweens.killTweensOf(a.cuerpo); a.cuerpo.setScale(1); this.tweens.add({ targets: a.cuerpo, scaleX: 1.12, scaleY: 0.88, angle: lado * 6, duration: 90, yoyo: true, ease: 'Quad.easeOut', onComplete: function () { a.cuerpo.setAngle(0); } }); }
            if (a.golpes >= this.necesarios()) await this.romper(a);
        },

        dibujarGrietas: function (a) {
            var g = a.grietas, t = a.tam;
            g.clear();
            g.lineStyle(4, 0x3b2a14, 0.85);
            for (var k = 0; k < a.golpes; k++) {
                var ang = k * 1.9 + 0.5, x = Math.cos(ang) * t * 0.1, y = Math.sin(ang) * t * 0.1;
                g.beginPath(); g.moveTo(x, y);
                g.lineTo(x + Math.cos(ang) * t * 0.2, y + Math.sin(ang) * t * 0.2 + 6);
                g.lineTo(x + Math.cos(ang + 0.4) * t * 0.36, y + Math.sin(ang + 0.4) * t * 0.36);
                g.strokePath();
            }
        },

        romper: async function (a) {
            this.ocupado = true;
            a.rota = true;
            this.actual = a;
            K.tono({ f: 900, f2: 300, dur: 0.3, vol: 0.06 });
            // lluvia de dulces
            var pal2 = this.arteOk ? PAPELES : COLORES;
            for (var i = 0; i < 28; i++) this.papeles.push({ x: a.cx, y: a.cy, vx: (Math.random() - 0.5) * 9, vy: -3 - Math.random() * 6, col: pal2[i % pal2.length], t: 1.4, dulce: true });
            // el animal sale de la piñata
            var animal = this.crearCosa(a.id, a.cx, a.cy, a.tam * 0.7, { depth: 40 });
            a.animal = animal;
            a.pivote.setAlpha(0);
            animal.saltito(0.4, 1);
            var ok = await this.elegir(a.id, { x: a.cx, y: a.cy });
            if (ok === false) {
                await esperar(this, 300);
                animal.destruir();
                a.animal = null;
                a.golpes = 0; a.rota = false;
                this.dibujarGrietas(a);
                a.pivote.setAlpha(0).setY(this.L.viga - 100);
                this.tweens.add({ targets: a.pivote, alpha: 1, y: this.L.viga + 8, duration: 500, ease: 'Bounce.easeOut' });
            }
            this.ocupado = false;
        },

        alAcertar: async function () {
            var a = this.actual;
            if (!a) return;
            this.reunidos.push(a.id);
            var an = a.animal;
            Ut.estallido(this, a.cx, a.cy, { n: 16, tex: 'estrella', tam: 28, dist: 160, depth: 70, sinTinte: true });
            if (an) { await this.saltarA(an.cont, a.cx, this.L.suelo - a.tam * 0.45, { ms: 500, alto: 80 }); an.saltito(0.4, 3); }
            await this.sonar(a.id, { breve: true, bocina: false });
            await esperar(this, 250);
        },

        alFallar: async function () {
            var a = this.actual;
            if (a && a.animal) a.animal.sacudir();
            await esperar(this, 500);
        },

        alTerminarNivel: async function () {
            var self = this;
            this.cosas.forEach(function (a) { if (a.animal) a.animal.destruir(); self.tweens.add({ targets: a.pivote, alpha: 0, duration: 250 }); });
            await esperar(this, 300);
            this.cosas.forEach(function (a) { if (a.pivote.active) a.pivote.destroy(); });
            this.cosas = [];
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            var r = this.respuestas()[0];
            var a = this.cosas.filter(function (q) { return q.id === r && !q.rota; })[0];
            if (!a || !this.ayuda) {
                if (this.bocina) this.tweens.add({ targets: this.bocina, scale: 1.18, duration: 220, yoyo: true, repeat: 2 });
                return esperar(this, 900);
            }
            return this.ctx.mano({ punto: { x: a.cx, y: a.cy }, holdMs: 400, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
        },

        demoPaso: function () {
            var self = this;
            var r = this.respuestas()[0];
            var pasos = [];
            for (var k = 0; k < this.necesarios(); k++) pasos.push(function () {
                var a = self.cosas.filter(function (q) { return q.id === r; })[0];
                if (!a || a.rota) return { desde: { x: self.L.W / 2, y: self.L.H / 2 }, hacer: function () {} };
                return { desde: { x: a.cx, y: a.cy }, mantener: 200, hacer: function () { return self.golpear(a, 1); } };
            });
            return pasos;
        },

        escenaFinal: async function () {
            var self = this, L = this.L;
            this.cosas.forEach(function (a) { if (a.pivote.active) a.pivote.destroy(); });
            this.cosas = [];
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; }).slice(0, 5);
            if (!ids.length) ids = ['perro', 'gato', 'pajaro'];
            var lug = this.lugares(ids.length);
            var tam = Math.min(L.tam, (L.der - 120) / ids.length * 0.8);
            this.cosas = ids.map(function (id, i) { return self.crearPinata(id, i, lug[i], tam); });
            this.cosas.forEach(function (a, i) { self.tweens.add({ targets: a.pivote, alpha: 1, duration: 300, delay: i * 90 }); });
            await esperar(this, 700);
            for (var i = 0; i < this.cosas.length; i++) {
                if (!this.sigue()) return;
                var a = this.cosas[i];
                a.golpes = 99; this.dibujarGrietas(a);
                for (var k = 0; k < 24; k++) this.papeles.push({ x: a.cx, y: a.cy, vx: (Math.random() - 0.5) * 9, vy: -3 - Math.random() * 6, col: COLORES[k % COLORES.length], t: 1.4, dulce: true });
                a.rota = true; a.pivote.setAlpha(0);
                var an = this.crearCosa(a.id, a.cx, a.cy, a.tam * 0.7, { depth: 40 });
                await this.saltarA(an.cont, a.cx, L.suelo - a.tam * 0.4, { ms: 480, alto: 80 });
                an.saltito(0.3, 2);
                await this.sonar(a.id, { breve: true, bocina: false });
            }
            Ut.confeti(this, 100);
            await esperar(this, 1100);
        },

        estadoExtra: function () {
            return {
                necesarios: this.necesarios(),
                cosas: this.cosas.filter(function (a) { return a.pivote.active; }).map(function (a) { return { id: a.id, x: Math.round(a.cx), y: Math.round(a.cy), golpes: a.golpes, rota: a.rota }; })
            };
        },

        paso: function (time, delta) {
            var L = this.L, dt = Math.min(0.05, (delta || 16) / 1000), self = this;
            this.cosas.forEach(function (a) {
                if (!a.pivote.active) return;
                // péndulo: balanceo suave + golpe que se amortigua
                a.imp *= Math.pow(0.5, dt * 1.4);
                var th = Math.sin(time / 900 + a.fase2) * 0.07 + a.imp * Math.sin(time / 120);
                a.pivote.setRotation(th);
                a.cx = a.pivote.x + Math.sin(-th) * L.largo * 1 * -1;
                a.cx = a.pivote.x - Math.sin(th) * L.largo;
                a.cy = a.pivote.y + Math.cos(th) * L.largo;
            });
            if (this.globos) this.globos.forEach(function (b) {
                if (!b.im.active) return;
                b.y -= b.v * dt;
                if (b.y < -b.alto) { b.y = L.suelo + b.alto * 0.5; b.x = Math.random() * L.der; }
                b.im.setPosition(b.x + Math.sin(time / 1100 + b.ph) * 14, b.y + Math.sin(time / 700 + b.ph) * 5).setAngle(Math.sin(time / 900 + b.ph) * 4);
            });
            var bg2 = this.brillosG;
            if (bg2 && bg2.active) {
                bg2.clear();
                this.estrellas.forEach(function (e) {
                    var al = 0.25 + 0.6 * Math.max(0, Math.sin(time / 600 + e.ph));
                    bg2.fillStyle(0xffffff, al * 0.55); bg2.fillCircle(e.x, e.y, e.r * 2);
                    bg2.fillStyle(0xffffff, al); bg2.fillCircle(e.x, e.y, e.r * 0.7);
                });
            }
            var g = this.papelG;
            if (!g || !g.active) return;
            g.clear();
            this.papeles = this.papeles.filter(function (p) {
                p.x += p.vx * dt * 60; p.y += p.vy * dt * 60; p.vy += 0.35 * dt * 60; p.t -= dt * 0.8;
                if (p.y > L.suelo) { p.y = L.suelo; p.vy *= -0.4; p.vx *= 0.7; }
                g.fillStyle(p.col, Math.min(1, p.t));
                if (p.dulce) g.fillCircle(p.x, p.y, 7); else g.fillRect(p.x, p.y, 9, 5);
                return p.t > 0;
            });
        }
    };

    K.crear({ id: 'pinatas', fondo: '#a5d8ff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
