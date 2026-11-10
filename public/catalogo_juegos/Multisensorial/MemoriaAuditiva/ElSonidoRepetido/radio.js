/**
 * «La radio del archivo» — motor propio de El sonido repetido (5-6 años).
 * En el archivo secreto, una radio antigua transmite una secuencia (el parlante late, no se ve qué
 * suena). Después aparecen las estaciones en el dial y el niño GIRA EL DIAL (arrastra la aguja o la
 * perilla) hasta la estación del sonido que se repitió y suelta: la radio lo toca dos veces. Si no es,
 * se oye estática y esa estación suena con su propio sonido.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    var escena = {
        iniciar: function () { this.estaciones = []; this.reunidos = []; this.aguja = 0.5; this.vivo = 0; },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.bocina = { x: W / 2, y: Math.max(60, Math.min(100, 56 + hueco * 0.2)), r: Math.max(28, Math.min(40, hueco * 0.3)) };
            L.pres = W >= 760 ? { x: W - 72, piso: H - 104, alto: Math.min(160, H * 0.28), modelo: 'nino' } : null;
            L.der = L.pres ? W - 150 : W - 16;
            L.mesa = Math.round(H * 0.8);
            var rw = Math.min(L.der - 24, 580), rh = Math.min(rw * 0.66, L.mesa - (L.bocina.y + L.bocina.r + 30));
            L.radio = { x: L.der / 2 + 8, y: L.mesa - rh / 2, w: rw, h: rh };
            var R = L.radio;
            L.dial = { x0: R.x - R.w * 0.42, x1: R.x + R.w * 0.42, y: R.y - R.h * 0.24, h: R.h * 0.3 };
            L.perilla = { x: R.x + R.w * 0.3, y: R.y + R.h * 0.22, r: Math.min(R.w, R.h) * 0.13 };
            L.parlante = { x: R.x - R.w * 0.2, y: R.y + R.h * 0.2, r: Math.min(R.w * 0.2, R.h * 0.26) };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            // Archivo secreto: pared verde oscura con estantes de carpetas y una lámpara.
            K.textura(this, 'radio_archivo', L.W, L.H, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#0b7285'); g.addColorStop(1, '#0c4a52');
                x.fillStyle = g; x.fillRect(0, 0, w, h);
                var cols = ['#ffd43b', '#ff8787', '#74c0fc', '#8ce99a', '#e599f7', '#ffa94d'];
                for (var f = 0; f < 3; f++) {
                    var ey = h * 0.2 + f * h * 0.17;
                    if (ey > L.radio.y - L.radio.h * 0.5 - 20) break;
                    K.madera(x, 0, ey, w, 12, { r: 2 });
                    for (var cx = 8; cx < w - 20; cx += 26 + (cx % 3) * 4) {
                        var ch = 36 + ((cx * 7 + f * 13) % 22);
                        x.fillStyle = cols[(cx + f) % cols.length];
                        x.fillRect(cx, ey - ch, 20, ch);
                        x.fillStyle = 'rgba(255,255,255,0.6)'; x.fillRect(cx + 5, ey - ch + 8, 10, 6);
                    }
                }
                K.madera(x, 0, L.mesa, w, h - L.mesa, { r: 0, claro: '#9c6b30', medio: '#7a4f22', oscuro: '#5c3613' });
            });
            keep(this.add.image(0, 0, 'radio_archivo').setOrigin(0, 0).setDepth(0));
            this.montarRadio(keep);
            this.montarHud(keep);
            if (reubicar && this.nv) this.ponerEstaciones(this.nv.opciones, true);
        },

        montarRadio: function (keep) {
            var L = this.L, R = L.radio, D = L.dial, Pp = L.parlante, Pk = L.perilla;
            K.textura(this, 'radio_caja', R.w + 20, R.h + 20, function (x, w, h) {
                K.madera(x, 10, 10, R.w, R.h, { r: 28, claro: '#c47a3a', medio: '#9c5a22', oscuro: '#6b3b14' });
                // Ventana del dial.
                x.fillStyle = '#fff3bf'; K.rr(x, 10 + R.w * 0.06, 10 + R.h * 0.11, R.w * 0.88, R.h * 0.3, 14); x.fill();
                x.strokeStyle = '#5c3613'; x.lineWidth = 5; x.stroke();
                // Parlante con tela.
                x.fillStyle = '#e9d8a6'; x.beginPath(); x.arc(10 + R.w / 2 - R.w * 0.2, 10 + R.h / 2 + R.h * 0.2, Pp.r, 0, Math.PI * 2); x.fill();
                x.strokeStyle = 'rgba(92,54,19,0.5)'; x.lineWidth = 2;
                for (var k = -6; k <= 6; k++) { var yy = 10 + R.h / 2 + R.h * 0.2 + k * Pp.r / 7; x.beginPath(); x.moveTo(10 + R.w / 2 - R.w * 0.2 - Pp.r * 0.95, yy); x.lineTo(10 + R.w / 2 - R.w * 0.2 + Pp.r * 0.95, yy); x.stroke(); }
            });
            keep(this.add.image(R.x, R.y, 'radio_caja').setDepth(10));
            // Antena.
            var ant = keep(this.add.graphics().setDepth(9));
            ant.lineStyle(4, 0x868e96, 1); ant.lineBetween(R.x + R.w * 0.35, R.y - R.h / 2, R.x + R.w * 0.46, R.y - R.h / 2 - R.h * 0.35);
            ant.fillStyle(0xe03131, 1); ant.fillCircle(R.x + R.w * 0.46, R.y - R.h / 2 - R.h * 0.35, 6);
            this.antena = { x: R.x + R.w * 0.46, y: R.y - R.h / 2 - R.h * 0.35 };
            // Marcas del dial, aguja, perilla, ondas del parlante y ecualizador.
            this.dialG = keep(this.add.graphics().setDepth(12));
            this.perilla = keep(this.add.container(Pk.x, Pk.y).setDepth(12));
            var pg = this.add.graphics();
            pg.fillStyle(0x343a40, 1); pg.fillCircle(0, 0, Pk.r);
            pg.fillStyle(0x495057, 1); pg.fillCircle(0, 0, Pk.r * 0.72);
            pg.fillStyle(0xffd43b, 1); pg.fillRect(-3, -Pk.r * 0.85, 6, Pk.r * 0.5);
            this.perilla.add(pg);
            this.ondasP = keep(this.add.graphics().setDepth(13));
            this.ecuG = keep(this.add.graphics().setDepth(13));
            this.dibujarDial();
        },

        xDe: function (k) { var D = this.L.dial; return D.x0 + (D.x1 - D.x0) * k; },

        dibujarDial: function () {
            var D = this.L.dial;
            var g = this.dialG;
            g.clear();
            g.lineStyle(2, 0x5c3613, 0.6);
            for (var i = 0; i <= 20; i++) { var x = this.xDe(i / 20); g.lineBetween(x, D.y + D.h * 0.32, x, D.y + D.h * (i % 5 ? 0.42 : 0.5)); }
            var ax = this.xDe(this.aguja);
            g.lineStyle(4, 0xe03131, 1); g.lineBetween(ax, D.y - D.h * 0.48, ax, D.y + D.h * 0.48);
            this.perilla.angle = (this.aguja - 0.5) * 300;
        },

        /* ── Estaciones ── */

        ponerEstaciones: function (ids, ya) {
            var self = this;
            var D = this.L.dial;
            this.estaciones.forEach(function (e) { e.cont.destroy(); });
            var n = ids.length;
            var tam = Math.min(D.h * 0.62, (D.x1 - D.x0) / n * 0.8);
            this.estaciones = ids.map(function (id, i) {
                var k = (i + 0.5) / n;
                var c = self.add.container(self.xDe(k), D.y - D.h * 0.08).setDepth(11).setScale(ya ? 1 : 0);
                var halo = self.add.circle(0, 0, tam * 0.62, 0xffe066, 0);
                var img = self.add.image(0, 0, 'el_' + id);
                img.setScale(tam / Math.max(img.width, img.height));
                c.add([halo, img]);
                return { id: id, k: k, cont: c, halo: halo, img: img };
            });
        },

        prepararNivel: async function (i, nv) {
            var self = this;
            await Promise.all(this.estaciones.map(function (e) { return tw(self, { targets: e.cont, scale: 0, duration: 200 }); }));
            this.ponerEstaciones([], false);
            this.aguja = 0.5;
            this.dibujarDial();
        },

        alSonar: function () { this.vivo = this.time.now; },

        mostrarOpciones: async function (nv) {
            this.ponerEstaciones(nv.opciones, false);
            for (var i = 0; i < this.estaciones.length; i++) {
                K.ruido({ f: 2400, q: 2, dur: 0.05, vol: 0.05 });
                this.tweens.add({ targets: this.estaciones[i].cont, scale: 1, duration: 300, ease: 'Back.easeOut' });
                await esperar(this, 120);
            }
        },

        /* ── Gesto: girar el dial ── */

        enDial: function (p) {
            var L = this.L, D = L.dial, Pk = L.perilla;
            var enVentana = p.x > D.x0 - 20 && p.x < D.x1 + 20 && Math.abs(p.y - D.y) < D.h * 0.7;
            var enPerilla = Math.hypot(p.x - Pk.x, p.y - Pk.y) < Pk.r * 1.4;
            return enVentana ? 'ventana' : (enPerilla ? 'perilla' : null);
        },

        alTocar: function (p) {
            if (this.fase !== 'jugar') return;
            var donde = this.enDial(p);
            if (!donde) return;
            this.arrastrando = { donde: donde, x0: p.x, a0: this.aguja };
            if (donde === 'ventana') this.moverAguja(p.x);
            this.pista.reiniciar();
        },

        alMover: function (p) {
            var r = this.arrastrando;
            if (!r) return;
            if (r.donde === 'ventana') this.moverAguja(p.x);
            else {
                var D = this.L.dial;
                this.aguja = Math.max(0, Math.min(1, r.a0 + (p.x - r.x0) / (D.x1 - D.x0) * 1.4));
                this.dibujarDial();
                this.tic();
            }
        },

        moverAguja: function (x) {
            var D = this.L.dial;
            this.aguja = Math.max(0, Math.min(1, (x - D.x0) / (D.x1 - D.x0)));
            this.dibujarDial();
            this.tic();
        },

        tic: function () {
            var e = this.estacionCerca(0.06);
            if (e !== this.sintonizada) {
                this.sintonizada = e;
                this.estaciones.forEach(function (q) { q.halo.setFillStyle(0xffe066, q === e ? 0.6 : 0); });
                K.ruido({ f: e ? 1800 : 5000, q: e ? 3 : 0.6, dur: 0.05, vol: 0.03 });
            }
        },

        estacionCerca: function (tol) {
            var a = this.aguja, mejor = null, dmin = tol;
            this.estaciones.forEach(function (e) { var d = Math.abs(e.k - a); if (d < dmin) { dmin = d; mejor = e; } });
            return mejor;
        },

        alSoltar: async function () {
            var r = this.arrastrando;
            this.arrastrando = null;
            if (!r || this.fase !== 'jugar') return;
            var e = this.estacionCerca(0.5 / Math.max(2, this.estaciones.length));
            if (!e) return;
            // La aguja se asienta en la estación.
            this.aguja = e.k;
            this.dibujarDial();
            this.tocado = e;
            var ok = await this.elegir(e.id, { x: e.cont.x, y: e.cont.y });
            if (ok === false) {
                K.ruido({ f: 5000, q: 0.4, dur: 0.6, vol: 0.06 });   // estática
                this.tweens.add({ targets: e.cont, angle: 10, duration: 60, yoyo: true, repeat: 3, onComplete: function () { e.cont.angle = 0; } });
            }
        },

        alAcertar: async function () {
            var e = this.tocado;
            this.reunidos.push(e.id);
            e.halo.setFillStyle(0x69db7c, 0.75);
            // La radio lo toca dos veces: es el que se repitió.
            for (var k = 0; k < 2; k++) {
                this.vivo = this.time.now;
                this.tweens.add({ targets: e.cont, scale: 1.3, duration: 160, yoyo: true });
                await this.sonar(e.id, { breve: true, bocina: false });
                await esperar(this, 160);
            }
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            if (!this.ayuda) return this.pistaBocina();
            var e = this.estaciones.filter(function (q) { return self.respuestas().indexOf(q.id) >= 0; })[0];
            if (!e) return Promise.resolve();
            var D = this.L.dial;
            return this.ctx.mano({ punto: { x: this.xDe(this.aguja), y: D.y }, holdMs: 200, arrastre: { dx: e.cont.x - this.xDe(this.aguja), dy: 0, durMs: 900 }, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
        },

        /* ── Escena final: concierto de la radio ── */

        escenaFinal: async function () {
            var self = this;
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; });
            this.ponerEstaciones(ids, true);
            for (var i = 0; i < this.estaciones.length; i++) {
                var e = this.estaciones[i];
                await tw(this, { targets: this, aguja: e.k, duration: 380, ease: 'Sine.easeInOut', onUpdate: function () { self.dibujarDial(); } });
                e.halo.setFillStyle(0xffe066, 0.7);
                this.vivo = this.time.now;
                Ut.estallido(this, this.antena.x, this.antena.y, { n: 6, tex: 'nota', tam: 22, dist: 90, angulo: -Math.PI / 2, abanico: 1.4, depth: 60 });
                await this.sonar(e.id, { breve: true, bocina: false });
                if (!this.sigue()) return;
            }
            this.estaciones.forEach(function (e, k) { self.tweens.add({ targets: e.cont, y: e.cont.y - 10, duration: 200, yoyo: true, repeat: 3, delay: k * 80 }); });
            await esperar(this, 900);
        },

        /** Demo: la mano corre la aguja hasta la estación del que se repitió. */
        demoPaso: function () {
            var self = this;
            var r = this.respuestas();
            var e = this.estaciones.filter(function (q) { return r.indexOf(q.id) >= 0; })[0];
            if (!e) return null;
            var D = this.L.dial;
            return {
                desde: { x: this.xDe(this.aguja), y: D.y }, hasta: { x: this.xDe(e.k), y: D.y },
                hacer: async function () {
                    await tw(self, { targets: self, aguja: e.k, duration: 400, onUpdate: function () { self.dibujarDial(); self.tic(); } });
                    self.arrastrando = { donde: 'ventana', x0: 0, a0: e.k };
                    await self.alSoltar();
                }
            };
        },

        estadoExtra: function () {
            var D = this.L.dial;
            var self = this;
            return {
                aguja: +this.aguja.toFixed(2),
                dial: { x0: Math.round(D.x0), x1: Math.round(D.x1), y: Math.round(D.y) },
                estaciones: this.estaciones.map(function (e) { return { id: e.id, k: +e.k.toFixed(2), x: Math.round(self.xDe(e.k)) }; })
            };
        },

        paso: function (time) {
            var L = this.L, Pp = L.parlante, R = L.radio;
            var g = this.ondasP, q = this.ecuG;
            g.clear(); q.clear();
            var activo = this.sonando || (time - this.vivo < 400);
            if (activo) {
                for (var k = 0; k < 3; k++) {
                    var f = ((time / 600) + k / 3) % 1;
                    g.lineStyle(3, 0xffe066, 0.7 * (1 - f));
                    g.strokeCircle(Pp.x, Pp.y, Pp.r * (0.4 + f * 0.8));
                }
            }
            // Ecualizador junto a la perilla.
            var x0 = R.x + R.w * 0.05, base = R.y + R.h * 0.4;
            for (var b = 0; b < 5; b++) {
                var alto = activo ? (0.3 + Math.abs(Math.sin(time / (90 + b * 23) + b))) * R.h * 0.12 : R.h * 0.02;
                q.fillStyle([0x69db7c, 0xffd43b, 0xff922b, 0xff6b6b, 0x74c0fc][b], 1);
                q.fillRect(x0 + b * R.w * 0.03, base - alto, R.w * 0.022, alto);
            }
        }
    };

    K.crear({ id: 'radio', fondo: '#0b7285', escena: escena });
})(typeof window !== 'undefined' ? window : this);
