/**
 * «El concierto de las luciérnagas» — motor propio de Secuencia de 3 Sonidos Diferentes (5-6 años).
 *
 * Aquí lo que importa no es solo QUÉ suena sino CUÁNDO: un ritmo con golpes rápidos, golpes lentos y
 * silencios. El niño lo oye una vez y lo repite en tiempo real golpeando el tambor (grave) y, desde
 * el nivel 3, también la campana (aguda). No hay que copiar el tempo exacto: se compara la «forma»
 * del ritmo (las distancias entre golpes). Si no sale, la partitura muestra los golpes del ritmo y los
 * suyos uno sobre otro para ver dónde se torció, y el ritmo vuelve a sonar.
 * En los niveles 1-2 los instrumentos se encienden al sonar; en 3-4 solo se oye (¡a escuchar bien!).
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var ahora = function () { return global.performance ? global.performance.now() : Date.now(); };

    var PADS = ['tambor', 'campana'];
    var COL_PAD = [0xff922b, 0x4dabf7];
    // Ritmos por nivel: t en pulsos, p = instrumento (0 tambor, 1 campana).
    var RITMOS = [
        [[[0, 0], [1, 0], [2, 0]], [[0, 0], [1, 0], [2, 0], [3, 0]]],
        [[[0, 0], [1, 0], [1.5, 0], [3, 0]], [[0, 0], [0.5, 0], [1, 0], [2.5, 0]], [[0, 0], [1, 0], [2, 0], [2.5, 0], [3, 0]]],
        [[[0, 0], [1, 1], [2, 0], [3, 1]], [[0, 0], [1, 0], [2, 1], [3, 1]], [[0, 0], [0.5, 0], [1.5, 1], [3, 0]]],
        [[[0, 0], [1, 1], [1.5, 1], [3, 0], [4, 1]], [[0, 1], [0.5, 1], [1.5, 0], [3, 1], [3.5, 0]], [[0, 0], [1, 0], [1.5, 1], [2.5, 1], [4, 0]]]
    ];
    var PULSO = [580, 540, 500, 480];

    function sinMismo(arr, ultimo) {
        if (arr.length < 2) return arr[0];
        var q;
        do { q = arr[(Math.random() * arr.length) | 0]; } while (q === ultimo);
        return q;
    }

    var escena = {
        iniciar: function () {
            this.pads = [];
            this.toques = [];
            this.reunidos = [];
            this.luzOn = true;
            this.evaluando = false;
            this.ultimo = 0;
            this.cuenta = 0;
            this.golpeLuz = [0, 0];
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.suelo = Math.round(H * 0.8);
            L.cx = Math.round((L.der + 90) / 2);
            L.tam = Math.max(130, Math.min(215, H * 0.32));
            L.bocina = { x: 48, y: Math.round(H * 0.2), r: Math.max(24, Math.min(32, H * 0.045)) };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            var g = keep(this.add.graphics().setDepth(1));
            // Cielo de noche.
            var bandas = 16;
            for (var b = 0; b < bandas; b++) {
                var t = b / (bandas - 1);
                var c = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(0x120a33), Phaser.Display.Color.ValueToColor(0x4b2c82), 100, t * 100);
                g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
                g.fillRect(0, (L.H / bandas) * b, L.W, L.H / bandas + 1);
            }
            // Luna.
            g.fillStyle(0xfff3bf, 0.12); g.fillCircle(L.W * 0.82, L.H * 0.2, 90);
            g.fillStyle(0xfff3bf, 0.9); g.fillCircle(L.W * 0.82, L.H * 0.2, 46);
            g.fillStyle(0x4b2c82, 0.35); g.fillCircle(L.W * 0.82 - 14, L.H * 0.2 - 8, 11); g.fillCircle(L.W * 0.82 + 12, L.H * 0.2 + 14, 8);
            // Colinas y árboles de la selva.
            g.fillStyle(0x1d1245, 1);
            g.fillEllipse(L.W * 0.2, L.suelo + 10, L.W * 0.7, L.H * 0.34);
            g.fillEllipse(L.W * 0.78, L.suelo + 20, L.W * 0.8, L.H * 0.4);
            g.fillStyle(0x140b33, 1);
            [0.05, 0.12, 0.88, 0.95, 0.35, 0.62].forEach(function (f, i) {
                var x = L.W * f, h = L.H * (0.18 + (i % 3) * 0.05);
                g.fillRect(x - 6, L.suelo - h, 12, h + 10);
                g.fillEllipse(x, L.suelo - h, 70 + (i % 2) * 30, 80);
            });
            // Escenario de madera.
            g.fillStyle(0x000000, 0.3); g.fillRoundedRect(L.cx - L.tam * 1.7, L.suelo - 6, L.tam * 3.4, 40, 14);
            g.fillStyle(0x8d5a2b, 1); g.fillRoundedRect(L.cx - L.tam * 1.7, L.suelo - 14, L.tam * 3.4, 34, 14);
            g.fillStyle(0xa9713a, 1); g.fillRoundedRect(L.cx - L.tam * 1.7, L.suelo - 14, L.tam * 3.4, 12, 8);
            this.estrellasG = keep(this.add.graphics().setDepth(2));
            this.haloG = keep(this.add.graphics().setDepth(5));
            this.slotsG = keep(this.add.graphics().setDepth(14));
            this.lineaG = keep(this.add.graphics().setDepth(15));
            this.montarHud(keep);
            this.sembrarMotes(keep, 34, { x: 0, y: 60, w: L.W, h: L.suelo - 60, depth: 9 }, 0xe9fb7a);
            if (reubicar) { this.colocarPads(false); this.dibujarSlots(); }
        },

        /* ── Instrumentos ── */

        colocarPads: function (animar) {
            var self = this, L = this.L;
            this.pads.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            var n = this.nv && this.nv.pads ? this.nv.pads : 1;
            var xs = n === 1 ? [L.cx] : [L.cx - L.tam * 0.85, L.cx + L.tam * 0.85];
            this.pads = [];
            for (var i = 0; i < n; i++) {
                var a = this.crearCosa(PADS[i], xs[i], L.suelo - L.tam * 0.5, L.tam, { depth: 20 });
                a.pad = i;
                a.cont.setAlpha(animar ? 0 : 1);
                if (animar) this.tweens.add({ targets: a.cont, alpha: 1, y: { from: a.cont.y + 40, to: a.cont.y }, duration: 420, delay: i * 140, ease: 'Back.easeOut' });
                this.pads.push(a);
            }
        },

        /** Un golpe: suena, el instrumento late y (si toca) se enciende. */
        golpear: function (pad, luz) {
            var a = this.pads[pad];
            if (pad === 0) {
                K.tono({ f: 190, f2: 62, dur: 0.24, vol: 0.34 });
                K.ruido({ f: 260, q: 0.9, dur: 0.07, vol: 0.12 });
            } else {
                K.tono({ f: 880, dur: 0.7, vol: 0.13, tipo: 'triangle' });
                K.tono({ f: 1320, dur: 0.45, vol: 0.05, tipo: 'sine' });
            }
            if (!a || !a.cont.active) return;
            this.tweens.killTweensOf(a.img);
            a.img.setScale(a.img.scale);
            this.tweens.add({ targets: a.cont, scale: { from: 1.14, to: 1 }, duration: 220, ease: 'Quad.easeOut' });
            if (luz) this.golpeLuz[pad] = this.time.now;
            var x = a.cont.x, y = a.cont.y;
            Ut.estallido(this, x, y - this.L.tam * 0.25, { n: 4, tex: 'estrella', tam: 16, dist: 70, depth: 40, sinTinte: true });
        },

        /* ── Casillas que cuentan los golpes ── */

        dibujarSlots: function () {
            var g = this.slotsG, L = this.L;
            if (!g || !g.active) return;
            g.clear();
            var nv = this.nv;
            if (!nv || !nv.patron) return;
            var n = nv.patron.length, sep = Math.min(58, (L.der - 200) / n);
            var x0 = L.cx - (sep * (n - 1)) / 2, y = Math.round(L.H * 0.3);
            for (var i = 0; i < n; i++) {
                var hecho = this.toques[i], escuchado = this.cuenta > i && this.fase === 'escuchando';
                var col = hecho ? COL_PAD[hecho.p] : escuchado ? (this.luzOn ? COL_PAD[nv.patron[i][1]] : 0xffffff) : 0x3b2a6b;
                g.fillStyle(0x000000, 0.25); g.fillCircle(x0 + i * sep + 2, y + 4, 20);
                g.fillStyle(col, hecho || escuchado ? 1 : 0.8); g.fillCircle(x0 + i * sep, y, 20);
                g.lineStyle(3, 0xffffff, hecho || escuchado ? 0.9 : 0.3); g.strokeCircle(x0 + i * sep, y, 20);
            }
        },

        /* ── Niveles ── */

        generarNivel: function (i) {
            var pool = RITMOS[Math.min(i, RITMOS.length - 1)];
            var r = sinMismo(pool, this.ultimoRitmo);
            this.ultimoRitmo = r;
            var patron = r.map(function (e) { return [e[0], e[1]]; });
            var pads = patron.some(function (e) { return e[1] === 1; }) ? 2 : 1;
            var ids = patron.map(function (e) { return PADS[e[1]]; });
            return {
                tipo: 'secuencia', reproducciones: [ids], opciones: PADS.slice(0, pads), correctas: ids.slice(), meta: 1, preguntas: [],
                patron: patron, pads: pads, pulso: PULSO[Math.min(i, PULSO.length - 1)], luz: i < 2, indice: i
            };
        },

        planNiveles: function () {
            var self = this;
            return [0, 1, 2, 3].map(function (i) { return self.generarNivel(i); });
        },

        nivelDemo: function () {
            var nv = this.generarNivel(0);
            nv.patron = [[0, 0], [1, 0], [2, 0]];
            nv.reproducciones = [['tambor', 'tambor', 'tambor']];
            nv.correctas = nv.reproducciones[0].slice();
            nv.demo = true;
            return nv;
        },

        preguntar: function () {
            if (this.nv.demo || this.nivelActual > 0) return Promise.resolve();
            return this.ctx.decir({ voz: 'zeus', texto: '¡Ahora tócalo igual, al mismo ritmo!' }, { minMs: 800 });
        },

        prepararNivel: async function (i, nv) {
            this.nv = nv;
            this.toques = [];
            this.cuenta = 0;
            this.luzOn = nv.luz !== false;
            this.colocarPads(true);
            this.dibujarSlots();
            this.lineaG.clear();
            await esperar(this, 700);
        },

        /** El ritmo suena con sus silencios reales (no es una lista de sonidos a intervalos iguales). */
        presentar: async function () {
            var nv = this.nv;
            this.fase = 'escuchando';
            this.pista.parar();
            this.toques = [];
            this.cuenta = 0;
            this.dibujarSlots();
            await esperar(this, 500);
            var t0 = ahora();
            for (var k = 0; k < nv.patron.length; k++) {
                if (!this.sigue()) return;
                var espera = t0 + nv.patron[k][0] * nv.pulso - ahora();
                if (espera > 0) await esperar(this, espera);
                if (!this.sigue()) return;
                this.golpear(nv.patron[k][1], this.luzOn || this.guia);
                this.cuenta = k + 1;
                this.dibujarSlots();
            }
            await esperar(this, 650);
        },

        mostrarOpciones: async function () {
            this.toques = [];
            this.cuenta = 0;
            this.dibujarSlots();
        },

        alReescuchar: function (empieza) {
            if (!empieza) { this.toques = []; this.cuenta = 0; this.guia = false; this.dibujarSlots(); }
        },

        alTerminarNivel: async function () {
            this.lineaG.clear();
            this.cuenta = 0; this.toques = [];
            this.dibujarSlots();
            await Promise.all(this.pads.map(function (a) { return a.cont.active ? tw(a.cont.scene, { targets: a.cont, alpha: 0, y: a.cont.y + 30, duration: 260 }) : null; }));
        },

        /* ── Jugar: repetir el ritmo en tiempo real ── */

        alTocar: async function (p) {
            if (this.fase !== 'jugar' || this.evaluando) return;
            var a = this.cosaEn(this.pads, p.x, p.y, this.L.tam * 0.62);
            if (!a) return;
            this.pista.reiniciar();
            this.registrar(a.pad);
        },

        registrar: function (pad) {
            var nv = this.nv;
            if (!nv || this.toques.length >= nv.patron.length) return;
            this.golpear(pad, true);
            this.toques.push({ t: ahora(), p: pad });
            this.ultimo = ahora();
            this.dibujarSlots();
            if (this.toques.length === nv.patron.length) this.evaluar();
        },

        /** Compara la forma del ritmo: mismos instrumentos y distancias proporcionales entre golpes. */
        compara: function () {
            var nv = this.nv, tq = this.toques, pt = nv.patron;
            var r = { ok: false, fallos: [] };
            if (tq.length !== pt.length) return r;
            var ci = [], pi = [];
            for (var i = 1; i < pt.length; i++) { ci.push(tq[i].t - tq[i - 1].t); pi.push((pt[i][0] - pt[i - 1][0]) * nv.pulso); }
            var sc = ci.reduce(function (a, b) { return a + b; }, 0) / pi.reduce(function (a, b) { return a + b; }, 0);
            r.escala = sc;
            r.ok = true;
            for (var k = 0; k < pt.length; k++) {
                if (tq[k].p !== pt[k][1]) { r.ok = false; r.fallos.push(k); }
            }
            for (var j = 0; j < ci.length; j++) {
                var esperado = pi[j] * sc;
                if (Math.abs(ci[j] - esperado) > Math.max(esperado * 0.38, 150)) { r.ok = false; if (r.fallos.indexOf(j + 1) < 0) r.fallos.push(j + 1); }
            }
            return r;
        },

        evaluar: async function () {
            if (this.evaluando) return;
            this.evaluando = true;
            var nv = this.nv, L = this.L;
            this.pista.parar();
            await esperar(this, 450);
            if (!this.sigue()) return;
            var r = nv.demo ? { ok: true, escala: 1, fallos: [] } : this.compara();
            this.partitura(r);
            if (r.ok) {
                this.fase = 'premio';
                await esperar(this, 600);
                await this.acertar([nv.correctas[0]], { x: L.cx, y: L.suelo - L.tam });
                this.evaluando = false;
                return;
            }
            this.errores += 1; this.erroresNivel += 1;
            this.reaccion('Decir_no', 1500);
            K.tono({ f: 300, f2: 180, dur: 0.22, vol: 0.05 });
            this.cameras.main.shake(160, 0.003);
            if (this.erroresNivel >= 3) this.ayuda = true;
            if (this.time.now - (this.ultimoReclamo || -99999) > 7000) {
                this.ultimoReclamo = this.time.now;
                this.ctx.decir({ voz: 'zeus', texto: '¡Casi! Escucha el ritmo otra vez.' }, { minMs: 900 });
            }
            await esperar(this, 2300);
            if (!this.sigue()) return;
            this.lineaG.clear();
            this.toques = [];
            this.evaluando = false;
            this.fase = 'jugar';
            this.dibujarSlots();
            await this.repetir();
        },

        /** Partitura: arriba el ritmo, abajo el del niño ajustado al mismo tempo. */
        partitura: function (r) {
            var g = this.lineaG, L = this.L, nv = this.nv;
            g.clear();
            var w = Math.min(560, L.der - 220), x0 = L.cx - w / 2, y0 = Math.round(L.H * 0.4);
            g.fillStyle(0x0b0620, 0.72); g.fillRoundedRect(x0 - 24, y0 - 34, w + 48, 106, 18);
            var T = nv.patron[nv.patron.length - 1][0] * nv.pulso;
            var tq = this.toques, t0 = tq.length ? tq[0].t : 0, sc = r.escala || 1;
            g.lineStyle(2, 0xffffff, 0.2); g.lineBetween(x0, y0, x0 + w, y0); g.lineBetween(x0, y0 + 44, x0 + w, y0 + 44);
            nv.patron.forEach(function (e) {
                g.fillStyle(COL_PAD[e[1]], 1); g.fillCircle(x0 + (e[0] * nv.pulso / T) * w, y0, 12);
                g.lineStyle(3, 0xffffff, 0.9); g.strokeCircle(x0 + (e[0] * nv.pulso / T) * w, y0, 12);
            });
            tq.forEach(function (e, i) {
                var x = x0 + (((e.t - t0) / sc) / T) * w;
                var mal = r.fallos.indexOf(i) >= 0;
                g.fillStyle(mal ? 0xff6b6b : 0x69db7c, 1); g.fillCircle(Math.max(x0 - 8, Math.min(x0 + w + 8, x)), y0 + 44, 12);
                g.lineStyle(3, 0xffffff, 0.9); g.strokeCircle(Math.max(x0 - 8, Math.min(x0 + w + 8, x)), y0 + 44, 12);
            });
        },

        alAcertar: async function () {
            var self = this;
            this.reunidos.push('tambor');
            this.pads.forEach(function (a) { if (a.cont.active) a.latir(); });
            Ut.confeti(this, 50);
            await esperar(this, 900);
        },

        mostrarPista: function (cancelada) {
            if (this.fase !== 'jugar') return Promise.resolve();
            if (!this.ayuda) return this.pistaBocina();
            // Con ayuda: el ritmo vuelve a sonar con los instrumentos encendidos.
            this.guia = true;
            return this.repetir();
        },

        demoPaso: function () {
            var self = this;
            return [0, 1, 2].map(function () {
                return function () {
                    var a = self.pads[0];
                    return { desde: { x: a.cont.x, y: a.cont.y }, mantener: 450, hacer: function () { self.registrar(0); return esperar(self, 250); } };
                };
            });
        },

        /* ── Final: fiesta de luciérnagas ── */

        escenaFinal: async function () {
            var L = this.L;
            this.lineaG.clear();
            this.toques = []; this.cuenta = 0; this.dibujarSlots();
            this.nv = { patron: [[0, 0]], pads: 2 };
            this.colocarPads(true);
            await esperar(this, 700);
            this.luzOn = true;
            var fiesta = [[0, 0], [1, 1], [1.5, 1], [2, 0], [3, 1], [3.5, 0], [4, 1], [4.5, 1], [5, 0]];
            var t0 = ahora();
            for (var k = 0; k < fiesta.length; k++) {
                if (!this.sigue()) return;
                var espera = t0 + fiesta[k][0] * 420 - ahora();
                if (espera > 0) await esperar(this, espera);
                this.golpear(fiesta[k][1], true);
                var a = this.pads[fiesta[k][1]];
                Ut.estallido(this, a.cont.x, a.cont.y - L.tam * 0.3, { n: 10, tex: 'estrella', tam: 24, dist: 150, depth: 70, sinTinte: true });
            }
            Ut.confeti(this, 100);
            await esperar(this, 1300);
        },

        estadoExtra: function () {
            var nv = this.nv || {};
            return { patron: nv.patron, pulso: nv.pulso, toques: this.toques.length, pads: this.pads.map(function (a) { return { x: Math.round(a.cont.x), y: Math.round(a.cont.y) }; }), luz: this.luzOn };
        },

        paso: function (time) {
            var L = this.L;
            // Estrellas del cielo parpadeando.
            var g = this.estrellasG;
            if (g && g.active) {
                g.clear();
                for (var i = 0; i < 40; i++) {
                    var x = (i * 977) % L.W, y = (i * 613) % Math.round(L.suelo * 0.7);
                    g.fillStyle(0xffffff, 0.35 + 0.5 * Math.abs(Math.sin(time / 700 + i)));
                    g.fillCircle(x, y, 1.4 + (i % 3) * 0.5);
                }
            }
            // Halo bajo el instrumento que acaba de sonar.
            var h = this.haloG;
            if (h && h.active) {
                h.clear();
                this.pads.forEach(function (a, p) {
                    var f = (time - this.golpeLuz[p]) / 520;
                    if (f >= 0 && f < 1) {
                        h.fillStyle(COL_PAD[p], 0.5 * (1 - f)); h.fillCircle(a.cont.x, a.cont.y, L.tam * (0.55 + f * 0.5));
                    }
                }, this);
            }
            // Si el niño se queda a medias, se evalúa lo que tocó.
            if (this.fase === 'jugar' && !this.evaluando && this.toques.length > 0 && ahora() - this.ultimo > 3000) this.evaluar();
        }
    };

    K.crear({ id: 'ritmo', fondo: '#120a33', escena: escena });
})(typeof window !== 'undefined' ? window : this);
