/**
 * «El doctor de los juguetes» — motor propio de Sonidos Similares (5-6 años, ¿Qué sonido escuchas?).
 *
 * En la clínica de juguetes hay un paciente con un sonido misterioso (suena al empezar y en el
 * monitor; se puede repetir tocando el monitor o la bocina). Los juguetes duermen en sus camitas
 * (campana, triángulo, tambor… suenan parecido). El niño DESLIZA EL ESTETOSCOPIO por encima de cada
 * juguete: al apoyarlo, el juguete suena y se compara con el misterioso. Cuando cree saber cuál es,
 * toca la curita que aparece sobre ese juguete. Si no era, el juguete niega con la cabeza y se sigue
 * escuchando (sin castigo). Si era, el juguete se cura y se sienta con corazones. Cada nivel es
 * otro consultorio. Final: los juguetes curados desfilan con globos y suenan en orden.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var C = Phaser.Display.Color;

    var OBJETOS = ['campana', 'triangulo', 'tambor', 'pelota', 'carro', 'trompeta', 'gaita', 'botella', 'reloj'];
    var COLS = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xcc5de8];
    var SALAS = [0xcdf5ea, 0xfff1b8, 0xffd6e5, 0xe2d4ff];

    function rg(i) { var x = Math.sin(i * 127.1 + 11.7) * 43758.5453; return x - Math.floor(x); }
    function mezTinte(a, b, t) { var c = C.Interpolate.ColorWithColor(C.ValueToColor(a), C.ValueToColor(b), 100, Math.max(0, Math.min(1, t)) * 100); return C.GetColor(c.r, c.g, c.b); }

    var escena = {
        iniciar: function () {
            this.cosas = [];
            this.reunidos = [];
            this.pieza = null;
            this.arr = null;
            this.sobre = null;
            this.ondaT = 0;
            this.mon = 0;
            this.alerta = 0;
            this.tinte = 0xcdf5ea;
            this.globos = [];
            this.desfile = false;
            this.tocado = null;
        },

        filtrarPool: function (pool) {
            var f = pool.filter(function (id) { return OBJETOS.indexOf(id) >= 0; });
            return f.length >= 5 ? f : pool;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.pared = Math.round(H * 0.6);
            L.tam = Math.max(78, Math.min(116, (L.der - 140) / 5.2, H * 0.16));
            L.camaY = Math.round(H * 0.8);
            L.gancho = { x: Math.round(L.der * 0.41), y: Math.round(H * 0.17) };
            L.monitor = { x: Math.round(L.der * 0.27), y: Math.round(H * 0.2), w: Math.min(220, L.der * 0.2), h: Math.min(130, H * 0.17) };
            L.bocina = { x: 48, y: Math.round(H * 0.3), r: Math.max(24, Math.min(32, hueco * 0.28)) };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            var clave = 'doc_fondo_' + L.W + 'x' + L.H;
            K.textura(this, clave, L.W, L.H, function (x, w, h) { pintarClinica(x, w, h, L); });
            this.fondoImg = keep(this.add.image(0, 0, clave).setOrigin(0, 0).setDepth(1).setTint(this.tinte));
            this.monG = keep(this.add.graphics().setDepth(3));
            this.camasG = keep(this.add.graphics().setDepth(27));
            this.ondasG = keep(this.add.graphics().setDepth(37));
            this.tuboG = keep(this.add.graphics().setDepth(38));
            this.globosG = keep(this.add.graphics().setDepth(45));
            // Pieza del estetoscopio (campana plateada).
            var r = L.tam * 0.3;
            var pz = keep(this.add.container(this.pieza ? this.pieza.x : L.der * 0.5, this.pieza ? this.pieza.y : L.H * 0.42).setDepth(40));
            var g = this.add.graphics();
            g.fillStyle(0x000000, 0.25); g.fillCircle(3, 6, r);
            g.fillStyle(0x6c757d, 1); g.fillCircle(0, 0, r);
            g.fillStyle(0xced4da, 1); g.fillCircle(0, 0, r * 0.86);
            g.fillStyle(0x495057, 1); g.fillCircle(0, 0, r * 0.58);
            g.fillStyle(0x868e96, 1); g.fillCircle(0, 0, r * 0.42);
            g.fillStyle(0xffffff, 0.5); g.fillEllipse(-r * 0.3, -r * 0.36, r * 0.4, r * 0.2);
            pz.add(g);
            pz.setScale(this.cosas.length ? 1 : 0.001);
            this.pieza = pz;
            this.montarHud(keep);
            this.sembrarMotes(keep, 8, { x: 0, y: 0, w: L.W, h: L.pared, depth: 6 }, 0xffffff);
            this.pintarCamas();
            if (reubicar) this.ubicarCosas();
        },

        /* ── Camitas y juguetes ── */

        lugares: function (n) {
            var L = this.L, ini = 120, ancho = L.der - ini - 40, out = [];
            for (var i = 0; i < n; i++) out.push({ x: ini + (i + 0.5) * ancho / n, y: L.camaY });
            return out;
        },

        pintarCamas: function () {
            var g = this.camasG, L = this.L;
            if (!g || !g.active) return;
            g.clear();
            var t = L.tam;
            this.cosas.forEach(function (a) {
                if (!a.cont.active) return;
                var x = a.casa.x, y = a.casa.y, w = t * 1.5, h = t * 0.5, vis = a.vis == null ? 1 : a.vis;
                g.fillStyle(0x000000, 0.18 * vis); g.fillEllipse(x, y + h * 0.55, w * 1.05, h * 0.3);
                g.fillStyle(0x8d6e63, vis); g.fillRoundedRect(x - w / 2, y - h * 0.15, w, h * 0.75, 10);
                g.fillStyle(0x6d4c41, vis); g.fillRect(x - w / 2 + 6, y + h * 0.5, 10, h * 0.3); g.fillRect(x + w / 2 - 16, y + h * 0.5, 10, h * 0.3);
                g.fillStyle(0xffffff, vis); g.fillRoundedRect(x - w / 2 + 6, y - h * 0.35, w - 12, h * 0.5, 14);
                g.fillStyle(a.colcama, 0.85 * vis); g.fillRoundedRect(x - w / 2 + 6, y - h * 0.08, w - 12, h * 0.42, 12);
                g.fillStyle(0xffffff, 0.35 * vis); for (var k = 0; k < 4; k++) g.fillRect(x - w / 2 + 16 + k * (w - 36) / 4, y - h * 0.06, 8, h * 0.36);
                g.fillStyle(0xffffff, vis); g.fillRoundedRect(x - w / 2 + 2, y - h * 0.5, w * 0.26, h * 0.4, 10);
            });
        },

        crearJuguete: function (id, i, lug) {
            var t = this.L.tam;
            var a = this.crearCosa(id, lug.x, lug.y - t * 0.52 + 70, t * 0.82, { depth: 30, sinSombra: true });
            a.casa = { x: lug.x, y: lug.y }; a.vis = 0; a.colcama = COLS[i % COLS.length]; a.tam = t; a.fase2 = Math.random() * 6;
            a.cont.setAlpha(0);
            // zzz del que duerme
            a.zz = this.add.text(lug.x + t * 0.5, lug.y - t * 1.15, 'z z', { fontFamily: 'Arial', fontSize: Math.round(t * 0.28) + 'px', color: '#74c0fc', fontStyle: 'bold' }).setDepth(31).setAlpha(0);
            return a;
        },

        ubicarCosas: function () {
            var lug = this.lugares(this.cosas.length), t = this.L.tam;
            this.cosas.forEach(function (a, i) {
                if (!a.cont.active) return;
                a.casa = { x: lug[i].x, y: lug[i].y };
                a.cont.setPosition(lug[i].x, lug[i].y - t * 0.52);
                if (a.zz && a.zz.active) a.zz.setPosition(lug[i].x + t * 0.5, lug[i].y - t * 1.15);
            });
            this.pintarCamas();
        },

        mostrarOpciones: async function (nv) {
            var self = this, L = this.L, lug = this.lugares(nv.opciones.length);
            this.cosas = nv.opciones.map(function (id, i) { return self.crearJuguete(id, i, lug[i]); });
            K.ruido({ f: 900, q: 1, dur: 0.1, vol: 0.05 });
            await Promise.all(this.cosas.map(function (a, i) {
                return esperar(self, i * 120).then(function () {
                    self.tweens.add({ targets: a, vis: 1, duration: 300, onUpdate: function () { self.pintarCamas(); } });
                    self.tweens.add({ targets: a.zz, alpha: 0.9, duration: 400 });
                    return tw(self, { targets: a.cont, alpha: 1, y: a.casa.y - L.tam * 0.52, duration: 380, ease: 'Back.easeOut' });
                });
            }));
            // Aparece el estetoscopio en su colgador.
            this.pieza.setPosition(L.gancho.x, L.gancho.y + L.H * 0.24);
            await tw(this, { targets: this.pieza, scale: 1, duration: 300, ease: 'Back.easeOut' });
        },

        prepararNivel: async function (i, nv) {
            var self = this;
            await this.retirar(this.cosas);
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); if (a.zz && a.zz.active) a.zz.destroy(); if (a.band && a.band.active) a.band.destroy(); });
            this.cosas = [];
            this.sobre = null;
            this.pintarCamas();
            this.pieza.setScale(0.001);
            var nuevo = SALAS[(i < 0 ? 0 : i) % 4], desde = this.tinte, o = { t: 0 };
            this.salaN = (i < 0 ? 0 : i) % 4;
            this.tweens.add({ targets: o, t: 1, duration: 900, onUpdate: function () { self.tinte = mezTinte(desde, nuevo, o.t); if (self.fondoImg && self.fondoImg.active) self.fondoImg.setTint(self.tinte); } });
        },

        alSonar: function () {
            this.mon = 1;
            Ut.estallido(this, this.L.monitor.x, this.L.monitor.y + this.L.monitor.h * 0.7, { n: 3, tex: 'nota', tam: 22, dist: 80, depth: 70 });
        },

        /* ── Estetoscopio ── */

        alTocar: function (p) {
            var L = this.L;
            if (this.fase !== 'jugar') return;
            // Curita sobre un juguete (elegirlo).
            var b = this.cosas.filter(function (a) { return a.band && a.band.visible && !a.curado && Math.hypot(p.x - a.band.x, p.y - a.band.y) < 46; })[0];
            if (b) { this.elegirJuguete(b); return; }
            // El monitor repite el sonido misterioso.
            var M = L.monitor;
            if (Math.abs(p.x - M.x) < M.w / 2 + 10 && Math.abs(p.y - M.y) < M.h / 2 + 10) { if (!this.sonando) this.repetir(); return; }
            this.pista.reiniciar();
            this.arr = { dx: 0, dy: 0 };
            this.meta = { x: p.x, y: p.y };
        },
        alMover: function (p) { if (this.arr && p.isDown) this.meta = { x: p.x, y: p.y }; },
        alSoltar: function () { this.arr = null; },

        /** El juguete que está debajo de la pieza del estetoscopio. */
        juguetesBajo: function () {
            var pz = this.pieza, t = this.L.tam;
            if (!pz || pz.scaleX < 0.5) return null;
            var mejor = null, dmin = t * 0.62;
            this.cosas.forEach(function (a) {
                if (!a.cont.active || a.vis < 0.9) return;
                var d = Math.hypot(pz.x - a.cont.x, pz.y - (a.cont.y));
                if (d < dmin) { dmin = d; mejor = a; }
            });
            return mejor;
        },

        escuchar: async function (a) {
            if (!a || this.fase !== 'jugar') return;
            a.oido = true;
            this.ondaT = this.time.now;
            this.mon = 1;
            if (a.zz && a.zz.active && a.zz.alpha > 0) this.tweens.add({ targets: a.zz, alpha: 0, duration: 250 });
            this.tweens.add({ targets: a.cont, scale: { from: 1.12, to: 1 }, duration: 260 });
            // Aparece la curita para elegirlo.
            if (!a.band) {
                var t = this.L.tam, g = this.add.graphics(), ba = this.add.container(a.casa.x, a.casa.y - t * 1.45).setDepth(33);
                g.fillStyle(0x000000, 0.2); g.fillRoundedRect(-t * 0.3 + 2, -t * 0.12 + 4, t * 0.6, t * 0.24, 8);
                g.fillStyle(0xf5c99b, 1); g.fillRoundedRect(-t * 0.3, -t * 0.12, t * 0.6, t * 0.24, 8);
                g.fillStyle(0xe5a76c, 1); g.fillRoundedRect(-t * 0.12, -t * 0.12, t * 0.24, t * 0.24, 4);
                g.fillStyle(0xc9814a, 1); [[-0.05, -0.04], [0.05, -0.04], [-0.05, 0.05], [0.05, 0.05]].forEach(function (q) { g.fillCircle(q[0] * t, q[1] * t, t * 0.012); });
                g.lineStyle(2, 0xffffff, 0.6); g.strokeRoundedRect(-t * 0.3, -t * 0.12, t * 0.6, t * 0.24, 8);
                ba.add(g); ba.setAngle(-22).setScale(0.1);
                a.band = ba; a.bandBase = ba.y;
                this.tweens.add({ targets: ba, scale: 1.25, duration: 260, ease: 'Back.easeOut' });
            }
            await this.sonar(a.id, { breve: true, bocina: false });
        },

        elegirJuguete: async function (a) {
            if (this.fase !== 'jugar' || a.curado) return;
            this.tocado = a;
            this.tweens.add({ targets: a.band, scale: 0.9, duration: 90, yoyo: true });
            K.tono({ f: 700, dur: 0.05, vol: 0.04 });
            var ok = await this.elegir(a.id, { x: a.cont.x, y: a.cont.y });
            if (ok === false) await esperar(this, 120);
        },

        alAcertar: async function () {
            var a = this.tocado;
            this.mon = 1;
            if (!a) return;
            a.curado = true;
            this.reunidos.push(a.id);
            var L = this.L;
            if (a.band) this.tweens.add({ targets: a.band, y: a.cont.y - L.tam * 0.2, scale: 0.9, angle: 0, duration: 300 });
            Ut.estallido(this, a.cont.x, a.cont.y - 20, { n: 14, tex: 'corazon', tam: 26, dist: 130, depth: 70 });
            Ut.estallido(this, a.cont.x, a.cont.y - 20, { n: 10, tex: 'estrella', tam: 24, dist: 110, depth: 70, sinTinte: true });
            K.tono({ f: 660, f2: 1320, dur: 0.3, vol: 0.06, tipo: 'triangle' });
            await tw(this, { targets: a.cont, y: a.cont.y - 28, scale: 1.15, duration: 300, ease: 'Back.easeOut' });
            a.saltito(0.25, 2);
            await this.sonar(a.id, { breve: true, bocina: false });
            await esperar(this, 350);
        },

        alFallar: async function () {
            var a = this.tocado;
            this.alerta = 1;
            K.tono({ f: 330, f2: 220, dur: 0.22, vol: 0.05 });
            if (a) {
                if (a.band) this.tweens.add({ targets: a.band, angle: { from: -22, to: 30 }, y: a.band.y - 14, duration: 180, yoyo: true });
                await tw(this, { targets: a.cont, angle: { from: -10, to: 10 }, duration: 70, yoyo: true, repeat: 3, onComplete: function () { a.cont.angle = 0; } });
            }
            this.tweens.add({ targets: this, alerta: 0, duration: 700 });
        },

        alTerminarNivel: async function () {
            this.sobre = null;
            await this.retirar(this.cosas.filter(function (a) { return !a.curado; }));
            await esperar(this, 200);
            var self = this;
            await Promise.all(this.cosas.filter(function (a) { return a.curado && a.cont.active; }).map(function (a) { return tw(self, { targets: a.cont, y: a.cont.y - 60, alpha: 0, duration: 400 }); }));
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); if (a.zz && a.zz.active) a.zz.destroy(); if (a.band && a.band.active) a.band.destroy(); });
            this.cosas = [];
            this.pintarCamas();
            await tw(this, { targets: this.pieza, scale: 0.001, duration: 200 });
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            var r = this.respuestas()[0];
            var a = this.cosas.filter(function (q) { return q.id === r && q.cont.active; })[0];
            if (!a || !this.ayuda) {
                if (this.bocina) this.tweens.add({ targets: this.bocina, scale: 1.18, duration: 220, yoyo: true, repeat: 2 });
                return esperar(this, 900);
            }
            var pz = this.pieza;
            return this.ctx.mano({ punto: { x: pz.x, y: pz.y }, holdMs: 200, arrastre: { dx: a.cont.x - pz.x, dy: a.cont.y - pz.y, durMs: 900 }, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
        },

        demoPaso: function () {
            var self = this;
            var r = this.nv.correctas[0];
            return [
                function () {
                    var a = self.cosas.filter(function (q) { return q.id === r; })[0];
                    if (!a) return null;
                    var pz = self.pieza;
                    return {
                        desde: { x: pz.x, y: pz.y }, hasta: { x: a.cont.x, y: a.cont.y },
                        hacer: async function () {
                            self.meta = { x: a.cont.x, y: a.cont.y };
                            var t0 = self.time.now;
                            while (!a.band && self.time.now - t0 < 4000) await esperar(self, 100);
                            await esperar(self, 900);
                        }
                    };
                },
                function () {
                    var a = self.cosas.filter(function (q) { return q.id === r; })[0];
                    if (!a || !a.band) return null;
                    return { desde: { x: a.band.x, y: a.band.y }, hacer: function () { return self.elegirJuguete(a); } };
                }
            ];
        },

        /* ── Final: desfile de los juguetes curados ── */

        escenaFinal: async function () {
            var self = this, L = this.L;
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); if (a.zz && a.zz.active) a.zz.destroy(); if (a.band && a.band.active) a.band.destroy(); });
            this.cosas = []; this.pintarCamas();
            this.pieza.setScale(0.001);
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; }).slice(0, 5);
            if (!ids.length) ids = ['campana', 'triangulo', 'tambor'];
            this.desfile = true;
            this.mon = 1;
            for (var g = 0; g < 16; g++) this.globos.push({ x: 90 + Math.random() * (L.der - 120), y: L.H + 30 + Math.random() * 200, vy: 40 + Math.random() * 50, col: [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xcc5de8, 0xff922b][g % 6], r: 18 + Math.random() * 10, ph: Math.random() * 6 });
            var juguetes = [];
            for (var i = 0; i < ids.length; i++) {
                var a = this.crearCosa(ids[i], -80 - i * 20, L.camaY - 20, L.tam * 0.85, { depth: 30 });
                juguetes.push(a);
            }
            for (var k = 0; k < ids.length; k++) {
                if (!this.sigue()) return;
                var x = 150 + (L.der - 300) * (k + 0.5) / ids.length;
                var a2 = juguetes[k];
                a2.cont.setPosition(-60, L.camaY - 20);
                await tw(this, { targets: a2.cont, x: x, duration: 700, ease: 'Sine.easeOut' });
                a2.saltito(0.3, 2);
                Ut.estallido(this, x, L.camaY - 60, { n: 8, tex: 'corazon', tam: 24, dist: 110, depth: 70 });
                await this.sonar(ids[k], { breve: true, bocina: false });
            }
            Ut.confeti(this, 100);
            for (var r = 0; r < 2; r++) for (var j = 0; j < juguetes.length; j++) { if (!this.sigue()) return; juguetes[j].saltito(0.35, 1); await this.sonar(ids[j], { breve: true, bocina: false }); }
            await esperar(this, 1000);
        },

        estadoExtra: function () {
            var pz = this.pieza;
            return {
                pieza: pz ? { x: Math.round(pz.x), y: Math.round(pz.y) } : null,
                juguetes: this.cosas.filter(function (a) { return a.cont.active; }).map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y), oido: !!a.oido, band: !!a.band, curado: !!a.curado }; })
            };
        },

        /* ── Cada cuadro ── */

        paso: function (time, delta) {
            var L = this.L, dt = Math.min(0.05, (delta || 16) / 1000), s = time / 1000, self = this;
            var pz = this.pieza;
            if (!L || !pz || !pz.active || !this.tuboG || !this.tuboG.active) return;
            // La pieza sigue al dedo (en reposo cuelga del gancho).
            if (this.meta && (this.arr || this.fase === 'demo' || this.fase === 'jugar')) {
                pz.x += (this.meta.x - pz.x) * Math.min(1, dt * 14);
                pz.y += (this.meta.y - pz.y) * Math.min(1, dt * 14);
                var maxy = L.camaY + 10;
                pz.y = Math.min(maxy, Math.max(L.H * 0.14, pz.y));
                pz.x = Math.min(L.der - 20, Math.max(40, pz.x));
            }
            // Juguete que se está auscultando: suena al apoyar la pieza (una vez por apoyo).
            var bajo = this.fase === 'jugar' || this.fase === 'demo' ? this.juguetesBajo() : null;
            if (bajo !== this.sobre) { this.sobre = bajo; this.sono = false; }
            if (this.sobre && !this.sono && !this.sonando) { this.sono = true; this.escuchar(this.sobre); }
            // Juguetes: respiran al dormir; curitas flotan.
            this.cosas.forEach(function (a, i) {
                if (!a.cont.active || a.vis < 0.9 || self.tweens.isTweening(a.cont)) return;
                if (!a.curado) a.cont.y = a.casa.y - L.tam * 0.52 + Math.sin(s * 1.6 + a.fase2) * (a.oido ? 1 : 3);
                if (a.band && a.band.active && !self.tweens.isTweening(a.band)) { a.band.y = a.bandBase + Math.sin(s * 2.4 + i) * 5; a.band.x = a.casa.x; }
                if (a.zz && a.zz.active && a.zz.alpha > 0 && !self.tweens.isTweening(a.zz)) { a.zz.y = a.casa.y - L.tam * 1.15 - Math.abs(Math.sin(s * 1.2 + i)) * 10; }
            });
            // Tubo del estetoscopio colgando del gancho.
            var tg = this.tuboG; tg.clear();
            var hx = L.gancho.x, hy = L.gancho.y;
            tg.fillStyle(0x6c757d, 1); tg.fillCircle(hx, hy, 8); tg.fillStyle(0xadb5bd, 1); tg.fillCircle(hx - 2, hy - 2, 3);
            tg.lineStyle(7, 0x343a40, 1); tg.lineBetween(hx - 16, hy - 14, hx, hy); tg.lineBetween(hx + 16, hy - 14, hx, hy);
            tg.fillStyle(0xced4da, 1); tg.fillCircle(hx - 17, hy - 15, 6); tg.fillCircle(hx + 17, hy - 15, 6);
            if (pz.scaleX > 0.05) {
                var px = pz.x, py = pz.y - L.tam * 0.18;
                var sag = 40 + Math.max(0, (py - hy)) * 0.18;
                var cxm = (hx + px) / 2, cym = Math.max(hy, py) + sag;
                [[7, 0x343a40, 1], [2.5, 0x868e96, 0.9]].forEach(function (e) {
                    tg.lineStyle(e[0], e[1], e[2]); tg.beginPath();
                    for (var t = 0; t <= 24; t++) { var u = t / 24, x = (1 - u) * (1 - u) * hx + 2 * (1 - u) * u * cxm + u * u * px, y = (1 - u) * (1 - u) * hy + 2 * (1 - u) * u * cym + u * u * py; if (!t) tg.moveTo(x, y); else tg.lineTo(x, y); }
                    tg.strokePath();
                });
            }
            // Ondas de escucha alrededor de la pieza.
            var og = this.ondasG; og.clear();
            var tOnda = time - this.ondaT;
            if (this.ondaT && tOnda < 900) {
                for (var k = 0; k < 3; k++) { var f = ((tOnda / 900) + k / 3) % 1; og.lineStyle(4, 0x4dabf7, 0.7 * (1 - f)); og.strokeCircle(pz.x, pz.y, L.tam * 0.3 + f * L.tam * 0.7); }
            }
            if (this.sobre && !this.sobre.curado) { og.lineStyle(4, 0xffe066, 0.8); og.strokeCircle(this.sobre.cont.x, this.sobre.cont.y, L.tam * 0.52 + Math.sin(s * 6) * 3); }
            // Monitor del paciente misterioso: línea de latidos.
            var M = L.monitor, mg = this.monG; mg.clear();
            this.mon = Math.max(0, this.mon - dt * 0.9);
            var al = this.alerta > 0.02;
            mg.fillStyle(0x000000, 0.25); mg.fillRoundedRect(M.x - M.w / 2 + 4, M.y - M.h / 2 + 7, M.w, M.h, 14);
            mg.fillStyle(0xdee2e6, 1); mg.fillRoundedRect(M.x - M.w / 2 - 6, M.y - M.h / 2 - 6, M.w + 12, M.h + 12, 16);
            mg.fillStyle(al ? 0x3b0d0d : 0x0b2a22, 1); mg.fillRoundedRect(M.x - M.w / 2, M.y - M.h / 2, M.w, M.h, 10);
            mg.lineStyle(1, 0x2f9e44, 0.3); for (var gx = 1; gx < 6; gx++) mg.lineBetween(M.x - M.w / 2 + gx * M.w / 6, M.y - M.h / 2 + 4, M.x - M.w / 2 + gx * M.w / 6, M.y + M.h / 2 - 4);
            for (var gy = 1; gy < 4; gy++) mg.lineBetween(M.x - M.w / 2 + 4, M.y - M.h / 2 + gy * M.h / 4, M.x + M.w / 2 - 4, M.y - M.h / 2 + gy * M.h / 4);
            mg.lineStyle(3, al ? 0xff6b6b : 0x69db7c, 1); mg.beginPath();
            var amp = 6 + this.mon * M.h * 0.32;
            for (var x = 0; x <= 40; x++) {
                var u2 = x / 40, ph = ((u2 * 3 - s * 0.8) % 1 + 1) % 1, y = M.y + M.h * 0.1;
                if (ph > 0.42 && ph < 0.5) y -= amp * (1 - Math.abs(ph - 0.46) / 0.04) * 1.3; else if (ph > 0.5 && ph < 0.54) y += amp * 0.5;
                if (!x) mg.moveTo(M.x - M.w / 2 + 6, y); else mg.lineTo(M.x - M.w / 2 + 6 + u2 * (M.w - 12), y);
            }
            mg.strokePath();
            // Cruz del consultorio (parpadea en rojo al fallar, en verde al curar).
            var cx = Math.round(L.der * 0.86), cy = Math.round(L.H * 0.17), cr = Math.min(34, L.H * 0.05);
            var cc = al ? 0xff5252 : (this.desfile ? 0x69db7c : 0xffffff);
            mg.fillStyle(0x000000, 0.2); mg.fillCircle(cx + 3, cy + 5, cr * 1.5);
            mg.fillStyle(cc, 1); mg.fillCircle(cx, cy, cr * 1.5);
            mg.fillStyle(al ? 0xffffff : 0xe03131, 1); mg.fillRoundedRect(cx - cr * 0.28, cy - cr, cr * 0.56, cr * 2, 4); mg.fillRoundedRect(cx - cr, cy - cr * 0.28, cr * 2, cr * 0.56, 4);
            // Globos del desfile.
            var bg = this.globosG; bg.clear();
            this.globos.forEach(function (b) {
                b.y -= b.vy * dt; if (b.y < -60) b.y = L.H + 40;
                var x = b.x + Math.sin(s + b.ph) * 14;
                bg.lineStyle(2, 0xffffff, 0.8); bg.lineBetween(x, b.y + b.r, x + Math.sin(s * 2 + b.ph) * 5, b.y + b.r + 40);
                bg.fillStyle(b.col, 1); bg.fillEllipse(x, b.y, b.r * 1.7, b.r * 2.1);
                bg.fillStyle(0xffffff, 0.4); bg.fillEllipse(x - b.r * 0.3, b.y - b.r * 0.4, b.r * 0.4, b.r * 0.6);
            });
        }
    };

    /** El consultorio: pared con zócalo, ventana, estante de peluches, cartel de letras, suelo de baldosas. */
    function pintarClinica(x, w, h, L) {
        var g = x.createLinearGradient(0, 0, 0, L.pared); g.addColorStop(0, '#fbfdfd'); g.addColorStop(1, '#eaf2f2');
        x.fillStyle = g; x.fillRect(0, 0, w, L.pared);
        // Zócalo acolchado.
        x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(0, L.pared * 0.78, w, L.pared * 0.22);
        x.fillStyle = 'rgba(255,255,255,0.5)'; x.fillRect(0, L.pared * 0.78, w, 5);
        x.strokeStyle = 'rgba(0,0,0,0.1)'; x.lineWidth = 2;
        for (var k = 0; k < w; k += 90) { x.beginPath(); x.moveTo(k, L.pared * 0.78); x.lineTo(k, L.pared); x.stroke(); }
        // Ventana.
        var vx = L.der * 0.64, vy = h * 0.12, vw = Math.min(210, L.der * 0.17), vh = h * 0.3;
        x.fillStyle = '#8ed1fc'; x.fillRect(vx, vy, vw, vh);
        x.fillStyle = '#c9ecff'; x.fillRect(vx, vy, vw, vh * 0.4);
        x.fillStyle = '#69db7c'; x.beginPath(); x.moveTo(vx, vy + vh); x.lineTo(vx, vy + vh * 0.7); x.quadraticCurveTo(vx + vw * 0.5, vy + vh * 0.5, vx + vw, vy + vh * 0.72); x.lineTo(vx + vw, vy + vh); x.fill();
        x.fillStyle = '#fff'; x.beginPath(); x.arc(vx + vw * 0.3, vy + vh * 0.25, 14, 0, 6.2832); x.arc(vx + vw * 0.42, vy + vh * 0.22, 18, 0, 6.2832); x.arc(vx + vw * 0.55, vy + vh * 0.26, 13, 0, 6.2832); x.fill();
        x.strokeStyle = '#f1f3f5'; x.lineWidth = 10; x.strokeRect(vx, vy, vw, vh); x.lineWidth = 6; x.beginPath(); x.moveTo(vx + vw / 2, vy); x.lineTo(vx + vw / 2, vy + vh); x.moveTo(vx, vy + vh / 2); x.lineTo(vx + vw, vy + vh / 2); x.stroke();
        // Cortinas.
        x.fillStyle = 'rgba(255,107,107,0.85)'; x.beginPath(); x.moveTo(vx - 24, vy - 12); x.lineTo(vx + 20, vy - 12); x.quadraticCurveTo(vx + 40, vy + vh * 0.5, vx + 6, vy + vh + 12); x.lineTo(vx - 24, vy + vh + 12); x.fill();
        x.beginPath(); x.moveTo(vx + vw + 24, vy - 12); x.lineTo(vx + vw - 20, vy - 12); x.quadraticCurveTo(vx + vw - 40, vy + vh * 0.5, vx + vw - 6, vy + vh + 12); x.lineTo(vx + vw + 24, vy + vh + 12); x.fill();
        x.fillStyle = '#8d6e63'; x.fillRect(vx - 34, vy - 20, vw + 68, 8);
        // Estante con peluches (izquierda).
        var ex = L.der * 0.06, ey = h * 0.4, ew = Math.min(230, L.der * 0.2);
        x.fillStyle = '#a1887f'; x.fillRect(ex, ey, ew, 10); x.fillStyle = '#6d4c41'; x.fillRect(ex + 14, ey + 10, 10, 22); x.fillRect(ex + ew - 24, ey + 10, 10, 22);
        [['#ffb4a2', 0.2], ['#a0c4ff', 0.5], ['#ffd6a5', 0.8]].forEach(function (q, i) {
            var bx = ex + ew * q[1], by = ey - 2;
            x.fillStyle = q[0]; x.beginPath(); x.arc(bx, by - 22, 22, 0, 6.2832); x.arc(bx - 17, by - 40, 10, 0, 6.2832); x.arc(bx + 17, by - 40, 10, 0, 6.2832); x.fill();
            x.beginPath(); x.ellipse(bx, by - 6, 20, 16, 0, 0, 6.2832); x.fill();
            x.fillStyle = '#4a3b2a'; x.beginPath(); x.arc(bx - 8, by - 24, 3, 0, 6.2832); x.arc(bx + 8, by - 24, 3, 0, 6.2832); x.fill();
            x.fillStyle = '#6d4c41'; x.beginPath(); x.ellipse(bx, by - 17, 7, 5, 0, 0, 6.2832); x.fill();
        });
        // Cartel de figuras (como el de letras del oculista).
        var cx = L.der * 0.46, cy = h * 0.36, cw = 84, ch = 120;
        x.fillStyle = '#fff'; x.strokeStyle = '#ced4da'; x.lineWidth = 4; x.fillRect(cx, cy, cw, ch); x.strokeRect(cx, cy, cw, ch);
        [[0.2, 0.22, 20, '#ff6b6b'], [0.5, 0.5, 14, '#4dabf7'], [0.78, 0.76, 9, '#69db7c']].forEach(function (q) { x.fillStyle = q[3]; x.beginPath(); x.arc(cx + cw * 0.5, cy + ch * q[0] + 8, q[2], 0, 6.2832); x.fill(); });
        // Suelo de baldosas.
        x.fillStyle = '#d8e8e8'; x.fillRect(0, L.pared, w, h - L.pared);
        for (var r = 0; r < 6; r++) {
            var y0 = L.pared + r * (h - L.pared) / 6, hh = (h - L.pared) / 6;
            for (var c = -1; c < w / 110 + 1; c++) { x.fillStyle = (r + c) % 2 ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.05)'; x.fillRect(c * 110 + (r % 2) * 55, y0, 110, hh); }
        }
        x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(0, L.pared, w, 6);
        var v = x.createRadialGradient(w / 2, h * 0.5, h * 0.45, w / 2, h * 0.5, w * 0.7); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,30,40,0.22)'); x.fillStyle = v; x.fillRect(0, 0, w, h);
    }

    K.crear({ id: 'doctor', fondo: '#cdf5ea', escena: escena });
})(typeof window !== 'undefined' ? window : this);
