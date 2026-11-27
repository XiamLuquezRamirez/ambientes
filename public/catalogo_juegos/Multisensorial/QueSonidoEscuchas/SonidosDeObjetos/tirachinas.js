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

    // Arte del diseñador (img/diseno): fondo de campo, diana con soporte y ballesta (cuerpo + flecha por separado).
    // Medidas del dibujo de la ballesta (lienzo 500): pivote = punto de la cuerda en la flecha, puntas del arco, largo de flecha.
    var BAL = { px: 250, py: 245, tipX: 185, tipY: -73, tip: 137, anchoArco: 424 };

    var escena = {
        precargar: function () {
            if (!this.textures.exists('dx_fondo')) this.load.svg('dx_fondo', 'img/diseno/fondo.svg', { width: 1280, height: 720 });
            if (!this.textures.exists('dx_diana')) this.load.svg('dx_diana', 'img/diseno/diana.svg', { width: 400, height: 400 });
            if (!this.textures.exists('dx_ballesta')) this.load.svg('dx_ballesta', 'img/diseno/ballesta_cuerpo.svg', { width: 400, height: 400 });
            if (!this.textures.exists('dx_flecha')) this.load.svg('dx_flecha', 'img/diseno/ballesta_flecha.svg', { width: 56, height: 472 });
        },

        iniciar: function () {
            this.cosas = [];
            this.reunidos = [];
            this.apuntando = false;
            this.ocupado = false;
            this.bola = null;
            this.objetivoGuia = null;
            this.theta = -Math.PI / 2;
            this.volando = false;
            this.retro = 0;
        },

        filtrarPool: function (pool) {
            var f = pool.filter(function (id) { return OBJETOS.indexOf(id) >= 0; });
            return f.length >= 4 ? f : pool;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            var arteTam = this.textures.exists('dx_ballesta') && W >= 900;
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.horizonte = Math.round(H * 0.42);
            L.suelo = Math.round(H * 0.84);
            L.tam = Math.max(86, Math.min(arteTam ? 150 : 124, (L.der - 300) / 3.2, H * (arteTam ? 0.22 : 0.17)));
            var arte = this.textures.exists('dx_ballesta') && W >= 900;
            // Vista frontal con arte: la ballesta abajo, al centro, apuntando hacia arriba; las dianas de frente en una fila.
            L.reposo = arte ? { x: Math.round(L.der / 2), y: Math.round(H * 0.74) } : { x: Math.round(Math.max(130, L.der * 0.14)), y: Math.round(H * 0.6) };
            L.maxTiro = Math.max(110, Math.min(arte ? 130 : 170, L.der * 0.12));
            L.bocina = { x: 48, y: Math.round(H * 0.26), r: Math.max(24, Math.min(32, hueco * 0.28)) };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            this.arteOk = ['dx_fondo', 'dx_diana', 'dx_ballesta', 'dx_flecha'].every(function (k) { return this.textures.exists(k); }, this) && L.W >= 900;
            this.cieloG = null;
            if (this.arteOk) {
                this.vidaAmb = null;
                keep(this.add.image(0, 0, 'dx_fondo').setOrigin(0, 0).setDisplaySize(L.W, L.H).setDepth(1));
                this.cieloG = keep(this.add.graphics().setDepth(2));   // nubes
            } else {
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
            }
            this.gomaG = keep(this.add.graphics().setDepth(55));
            this.guiaG = keep(this.add.graphics().setDepth(54));
            // Tirachinas: horquilla de madera.
            var t = keep(this.add.graphics().setDepth(50));
            var R0 = L.reposo;
            var f = Math.max(1.2, L.tam / 70);          // el tirachinas es grande y fácil de agarrar
            this.fTira = f;
            if (this.arteOk) {
                // Ballesta del diseño: el cuerpo gira para apuntar; la flecha y las cuerdas se dibujan aparte.
                var kb = Math.max(130, Math.min(190, L.der * 0.15, L.H * 0.3)) / BAL.anchoArco;   // ballesta compacta
                this.kb = kb;
                this.reposoBola = { x: R0.x, y: R0.y };
                this.puntas = [];
                this.cuerpoB = keep(this.add.image(R0.x, R0.y, 'dx_ballesta').setOrigin(BAL.px / 500, BAL.py / 500).setDisplaySize(500 * kb, 500 * kb).setDepth(50));
                this.escBola = kb / 2;
            } else {
            this.escBola = f;
            t.lineStyle(14 * f, 0x7a4e1e, 1);
            t.lineBetween(R0.x, R0.y + 90 * f, R0.x, R0.y + 14 * f);
            t.lineBetween(R0.x, R0.y + 14 * f, R0.x - 26 * f, R0.y - 28 * f);
            t.lineBetween(R0.x, R0.y + 14 * f, R0.x + 26 * f, R0.y - 28 * f);
            t.fillStyle(0xdc2626, 1); t.fillCircle(R0.x - 26 * f, R0.y - 30 * f, 9 * f); t.fillCircle(R0.x + 26 * f, R0.y - 30 * f, 9 * f);
            this.puntas = [{ x: R0.x - 26 * f, y: R0.y - 30 * f }, { x: R0.x + 26 * f, y: R0.y - 30 * f }];
            this.reposoBola = { x: R0.x, y: R0.y - 30 * f };
            }
            this.montarHud(keep);
            this.sembrarMotes(keep, 10, { x: 0, y: L.horizonte, w: L.W, h: L.H - L.horizonte, depth: 8 }, 0xfff3bf);
            this.montarBola();
            if (reubicar) this.ubicarCosas();
        },

        montarBola: function () {
            if (this.bola && this.bola.active) { this.bola.setPosition(this.reposoBola.x, this.reposoBola.y); return; }
            if (this.arteOk) {
                this.bola = this.add.image(this.reposoBola.x, this.reposoBola.y, 'dx_flecha').setOrigin(0.5, (BAL.py - 104) / 236).setScale(this.escBola).setDepth(56).setRotation(this.theta + Math.PI / 2);
                return;
            }
            var b = this.add.container(this.reposoBola.x, this.reposoBola.y).setDepth(56);
            var g = this.add.graphics();
            g.fillStyle(0xff6b6b, 1); g.fillCircle(0, 0, 17);
            g.fillStyle(0xffffff, 0.35); g.fillCircle(-6, -6, 6);
            g.lineStyle(3, 0xc92a2a, 1); g.strokeCircle(0, 0, 17);
            b.add(g);
            b.setScale(this.fTira || 1);
            this.bola = b;
        },

        /* ── Dianas ── */

        lugares: function (n) {
            var L = this.L;
            var out = [], i;
            if (this.arteOk || (this.textures.exists('dx_ballesta') && L.W >= 900)) {
                // Fila frontal, repartida a lo ancho; las del medio un poco más arriba (suave arco).
                var x0 = L.tam * 0.9 + 70, x1 = L.der - L.tam * 0.9;
                for (i = 0; i < n; i++) {
                    var sp = Math.min(1, 0.34 * (n - 1)), u = n === 1 ? 0.5 : 0.5 - sp / 2 + sp * i / (n - 1);
                    out.push({ x: x0 + (x1 - x0) * u, y: L.H * 0.4 - Math.sin(u * Math.PI) * L.H * 0.05 });
                }
                return out;
            }
            var xa = L.reposo.x + 300, disp = L.der - xa - L.tam * 0.6;
            var y0 = L.H * 0.3, y1 = L.suelo - L.tam * 0.7;
            for (i = 0; i < n; i++) out.push({ x: xa + disp * (i % 2 ? 0.88 : 0.35) + (n === 3 && i === 1 ? disp * 0.05 : 0), y: y0 + (y1 - y0) * (i + 0.5) / n });
            return out;
        },

        ubicarCosas: function () {
            var lug = this.lugares(this.cosas.length);
            this.cosas.forEach(function (a, i) { a.casa = { x: lug[i].x, y: lug[i].y }; a.cont.setPosition(lug[i].x, lug[i].y); });
        },

        crearDiana: function (id, i, lug, tam) {
            var a = this.crearCosa(id, lug.x, lug.y - 70, tam * 0.64, { depth: 30, sinSombra: true });
            if (this.arteOk) {
                // Diana con soporte del diseño: el centro del disco (249.5, 183.5 de 500) queda en el centro del contenedor.
                var ks = tam * 1.12 / 247, di = this.add.image(0, 0, 'dx_diana').setOrigin(0.499, 0.367).setDisplaySize(500 * ks, 500 * ks);
                var aro2 = this.add.graphics(); aro2.lineStyle(8, 0xffd43b, 1); aro2.strokeCircle(0, 0, tam * 0.6); aro2.setAlpha(0);
                a.cont.addAt(di, 0); a.cont.addAt(aro2, 1);
                a.aro = aro2; a.tam = tam; a.casa = { x: lug.x, y: lug.y }; a.fase2 = Math.random() * 6;
                a.cont.setAlpha(0);
                return a;
            }
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
            var tam = Math.min(this.L.tam, this.arteOk ? 150 : 120);
            this.cosas = nv.opciones.map(function (id, i) { return self.crearDiana(id, i, lug[i], tam); });
            this.thetaReposo = this.apuntarMedio();
            K.ruido({ f: 1100, q: 1, dur: 0.1, vol: 0.05 });
            await Promise.all(this.cosas.map(function (a, i) {
                return esperar(self, i * 130).then(function () { return tw(self, { targets: a.cont, alpha: 1, y: a.casa.y, duration: 360, ease: 'Back.easeOut' }); });
            }));
        },

        /** Ángulo de reposo de la ballesta: hacia el centro del grupo de dianas. */
        apuntarMedio: function () {
            var R = this.reposoBola, n = this.cosas.length;
            if (!n) return this.arteOk ? -Math.PI / 2 : -0.1;
            var mx = 0, my = 0;
            this.cosas.forEach(function (a) { mx += a.casa.x; my += a.casa.y; });
            return Math.atan2(my / n - R.y, mx / n - R.x);
        },

        prepararNivel: async function () {
            await this.retirar(this.cosas);
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.cosas = [];
            this.ocupado = false;
            this.montarBola();
        },

        alSonar: function () {
            Ut.estallido(this, this.L.reposo.x + (this.arteOk ? 90 : 40), this.L.reposo.y - (this.arteOk ? 40 : 80), { n: 3, tex: 'nota', tam: 24, dist: 90, depth: 70 });
        },

        /* ── Estirar y soltar ── */

        objetivoPara: function (pos) {
            // Dirección del tiro = del punto estirado hacia el reposo; gana la diana más cercana en ángulo.
            var R = this.reposoBola;
            var vx = R.x - pos.x, vy = R.y - pos.y;
            if (Math.hypot(vx, vy) < 28 || (this.arteOk ? vy >= 0 : vx <= 0)) return null;
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
            if (Math.hypot(p.x - R.x, p.y - R.y) < 80 * (this.fTira || 1)) { this.apuntando = true; this.pista.reiniciar(); }
        },

        alMover: function (p) {
            if (!this.apuntando) return;
            var R = this.reposoBola, L = this.L;
            var dx = p.x - R.x, dy = p.y - R.y, d = Math.hypot(dx, dy);
            if (d > L.maxTiro) { dx *= L.maxTiro / d; dy *= L.maxTiro / d; }
            this.bola.setPosition(R.x + dx, R.y + dy);
            if (this.arteOk && Math.hypot(dx, dy) >= 28 && dy > 0) this.theta = Math.atan2(-dy, -dx);
            var obj = this.objetivoPara(this.bola);
            if (this.arteOk && obj) {
                // La ballesta gira hacia la diana elegida y la flecha se echa atrás SOBRE ese eje: el tiro va recto al centro.
                var ta = Math.atan2(obj.cont.y - R.y, obj.cont.x - R.x), dd = Math.hypot(dx, dy);
                this.theta = ta;
                this.bola.setPosition(R.x - Math.cos(ta) * dd, R.y - Math.sin(ta) * dd);
            }
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

        /** Vuelo del proyectil hasta la diana. Con arte: la flecha apunta a donde va y queda clavada un momento. */
        volarA: async function (b, obj, ms, alto) {
            if (!this.arteOk) { await this.saltarA(b, obj.cont.x, obj.cont.y, { ms: ms, alto: alto }); return; }
            var ang = Math.atan2(obj.cont.y - b.y, obj.cont.x - b.x), punta = b.originY * b.height * b.scaleX;   // distancia real del pivote a la punta
            var tx = obj.cont.x - Math.cos(ang) * punta, ty = obj.cont.y - Math.sin(ang) * punta;           // la punta se clava en el CENTRO de la diana
            this.volando = true; this.ultimo = { x: b.x, y: b.y };
            this.theta = ang;
            this.retro = 16 * (this.kb / 0.6);
            b.setRotation(ang + Math.PI / 2);
            Ut.estallido(this, this.reposoBola.x, this.reposoBola.y - 20, { n: 6, tex: 'chispa', tam: 14, dist: 60, depth: 49, sinTinte: true });
            // Vuelo en línea recta, acelerando (sin arco: el arco hacía que la flecha pasara de largo y volviera).
            await tw(this, { targets: b, x: tx, y: ty, duration: Math.min(ms || 520, 520), ease: 'Cubic.easeIn' });
            this.volando = false;
            var cl = this.add.image(b.x, b.y, 'dx_flecha').setOrigin(b.originX, b.originY).setScale(b.scaleX).setRotation(ang + Math.PI / 2).setDepth(40);   // clavada mirando al centro de la diana
            this.tweens.add({ targets: cl, x: cl.x + Math.cos(ang) * 6, y: cl.y + Math.sin(ang) * 6, duration: 90 });
            this.tweens.add({ targets: cl, alpha: 0, delay: 1300, duration: 400, onComplete: function () { cl.destroy(); } });
        },

        lanzarA: async function (obj) {
            if (this.ocupado || this.fase !== 'jugar') return;
            this.ocupado = true;
            var R = this.reposoBola, b = this.bola;
            K.tono({ f: 300, f2: 900, dur: 0.18, vol: 0.05, tipo: 'triangle' });
            if (this.arteOk) this.theta = Math.atan2(obj.cont.y - R.y, obj.cont.x - R.x);
            await this.volarA(b, obj, 620, 80);
            b.setAlpha(0);
            b.setPosition(R.x, R.y);
            K.ruido({ f: 600, q: 1, dur: 0.1, vol: 0.1 });
            this.cameras.main.shake(100, 0.003);
            var onda = this.add.circle(obj.cont.x, obj.cont.y, 20, 0xffffff, 0).setStrokeStyle(6, 0xffffff, 0.9).setDepth(69);
            this.tweens.add({ targets: onda, scale: 4, alpha: 0, duration: 450, onComplete: function () { onda.destroy(); } });
            Ut.estallido(this, obj.cont.x, obj.cont.y, { n: 8, tex: 'chispa', tam: 22, dist: 90, depth: 70, sinTinte: true });
            this.dianaActual = obj;
            var ok = await this.elegir(obj.id, { x: obj.cont.x, y: obj.cont.y });
            b.setAlpha(0).setScale(0.2);
            this.tweens.add({ targets: b, alpha: 1, scale: this.escBola || this.fTira || 1, duration: 300, ease: 'Back.easeOut' });
            this.ocupado = false;
        },

        alAcertar: async function () {
            var a = this.dianaActual;
            if (!a) return;
            this.reunidos.push(a.id);
            Ut.estallido(this, a.cont.x, a.cont.y, { n: 16, tex: 'estrella', tam: 28, dist: 150, depth: 70, sinTinte: true });
            if (this.arteOk) tw(this, { targets: a.img, angle: 360, duration: 500 }).then(function () { a.img.angle = 0; });
            else tw(this, { targets: a.cont, angle: 360, duration: 500 }).then(function () { a.cont.angle = 0; });
            await this.sonar(a.id, { breve: true, bocina: false });
            await esperar(this, 250);
        },

        alFallar: async function () {
            var a = this.dianaActual;
            if (!a) return;
            var am = this.arteOk ? 7 : 18;
            await tw(this, { targets: a.cont, angle: { from: -am, to: am }, duration: 90, yoyo: true, repeat: 3 });
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
            var lug = ids.map(function (id, i) { return self.arteOk ? { x: L.tam + 70 + (L.der - L.tam * 2 - 70) * (i + 0.5) / ids.length, y: L.H * 0.43 } : { x: L.reposo.x + 260 + (L.der - L.reposo.x - 320) * (i + 0.5) / ids.length, y: L.suelo - L.tam * 0.8 }; });
            var dianas = ids.map(function (id, i) { return self.crearDiana(id, i, lug[i], L.tam); });
            await Promise.all(dianas.map(function (a, i) { return esperar(self, i * 100).then(function () { return tw(self, { targets: a.cont, alpha: 1, y: a.casa.y, duration: 320, ease: 'Back.easeOut' }); }); }));
            this.cosas = dianas;
            for (var i = 0; i < dianas.length; i++) {
                if (!this.sigue()) return;
                var Rf = this.reposoBola;
                this.bola.setAlpha(0).setPosition(Rf.x, Rf.y);
                this.thetaReposo = Math.atan2(dianas[i].cont.y - Rf.y, dianas[i].cont.x - Rf.x);   // la ballesta gira hacia la diana
                await esperar(this, this.arteOk ? 520 : 150);
                if (!this.sigue()) return;
                this.bola.setAlpha(1).setRotation(this.theta + Math.PI / 2);
                await this.volarA(this.bola, dianas[i], 480, 70);
                this.bola.setAlpha(0).setPosition(Rf.x, Rf.y);   // la flecha queda clavada; la cuerda vuelve a la ballesta
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
            if (this.arteOk) this.pasoBallesta(time, g);
            else if (g && g.active) {
                g.clear();
                var b = this.bola;
                if (b && b.alpha > 0.1) {
                    g.lineStyle(8 * (this.fTira || 1), 0x3b2a14, 1);
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
                        var x = this.bola.x + (o.cont.x - this.bola.x) * t, y = this.bola.y + (o.cont.y - this.bola.y) * t - (this.arteOk ? 0 : Math.sin(t * Math.PI) * 70);
                        gg.fillStyle(0xffffff, 0.85); gg.fillCircle(x, y, 6 - k * 0.3);
                    }
                }
            }
            var self = this;
            this.cosas.forEach(function (a, i) {
                if (!a.cont.active) return;
                if (self.arteOk) { if (a.img && a.img.active && !self.tweens.isTweening(a.img)) a.img.y = Math.sin(time / 700 + a.fase2) * 4; return; }
                if (!self.tweens.isTweening(a.cont) && !self.ocupado) a.cont.y = a.casa.y + Math.sin(time / 700 + a.fase2) * 4;
            });
            if (this.cieloG && this.cieloG.active) this.nubes(time);
        },

        /** Nubes que cruzan el cielo despacio. */
        nubes: function (time) {
            var c = this.cieloG, L = this.L, s = time / 1000;
            c.clear();
            c.lineStyle(3, 0x34495e, 0.8);
            for (var q = 0; q < 3; q++) {
                var bx = ((s * (38 + q * 9) + q * 520) % (L.W + 200)) - 100, by = L.H * (0.16 + q * 0.07) + Math.sin(s * 1.3 + q) * 8, ala = Math.sin(s * 9 + q * 2) * 5;
                c.beginPath(); c.moveTo(bx - 10, by - ala); c.lineTo(bx, by); c.lineTo(bx + 10, by - ala); c.strokePath();
            }
            for (var n = 0; n < 4; n++) {
                var x = ((s * (7 + n * 3) + n * 380) % (L.W + 300)) - 150, y = L.H * (0.07 + n * 0.055), w = 70 + n * 14;
                c.fillStyle(0xffffff, 0.8);
                c.fillEllipse(x, y, w * 1.6, w * 0.36); c.fillCircle(x - w * 0.3, y - w * 0.12, w * 0.28); c.fillCircle(x + w * 0.1, y - w * 0.2, w * 0.36); c.fillCircle(x + w * 0.45, y - w * 0.06, w * 0.24);
            }
        },

        /** Ballesta con arte: gira hacia donde se apunta, retrocede al disparar y la cuerda sigue a la flecha. */
        pasoBallesta: function (time, g) {
            var B = this.cuerpoB, b = this.bola, R = this.reposoBola;
            if (!B || !B.active || !g || !g.active) return;
            if (!this.apuntando && !this.volando && !this.ocupado) {
                var tr = this.thetaReposo != null ? this.thetaReposo : -Math.PI / 2;
                this.theta += (tr + Math.sin(time / 900) * 0.025 - this.theta) * 0.12;
            }
            var th = this.theta, rho = th + Math.PI / 2, ux = Math.cos(th), uy = Math.sin(th);
            this.retro *= 0.86;
            var ox = R.x - ux * this.retro, oy = R.y - uy * this.retro, k = this.kb;
            B.setPosition(ox, oy).setRotation(rho);
            var c = Math.cos(rho), sn = Math.sin(rho);
            var punta = function (sx) { var lx = sx * BAL.tipX * k, ly = BAL.tipY * k; return { x: ox + lx * c - ly * sn, y: oy + lx * sn + ly * c }; };
            var nx = ox, ny = oy;
            if (b && b.active && b.alpha > 0.1 && !this.volando) { nx = b.x; ny = b.y; b.setRotation(rho); }
            else if (b && b.active && !this.volando) b.setPosition(R.x, R.y).setRotation(rho);
            if (this.volando && b) {
                var u = this.ultimo;
                if (Math.hypot(b.x - u.x, b.y - u.y) > 0.5) b.setRotation(Math.atan2(b.y - u.y, b.x - u.x) + Math.PI / 2);
                this.ultimo = { x: b.x, y: b.y };
            }
            g.clear();
            g.lineStyle(Math.max(3, 5 * k), 0x403934, 1);
            [punta(-1), punta(1)].forEach(function (p) { g.lineBetween(p.x, p.y, nx, ny); });
        }
    };

    K.crear({ id: 'tirachinas', fondo: '#a5d8ff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
