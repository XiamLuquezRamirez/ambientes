/**
 * «Apagón» — motor propio de Sonido y objeto (5-6 años).
 *
 * Se fue la luz en la casa. Suena algo (una puerta que rechina…). El niño mueve la LINTERNA con el
 * dedo por la sala a oscuras: lo que queda bajo la luz un momento se descubre (brilla) y entonces
 * puede tocarlo. Si es lo que sonó, el objeto hace su acción (la puerta se abre) y se enciende una
 * lámpara a su lado: la casa se va iluminando con cada acierto. Si no, el objeto deja oír su
 * propio sonido y la linterna parpadea.
 *
 * Niveles: 1 el reto · 2 otro sonido con más objetos · 3 relámpagos y la pila de la linterna se
 * gasta (la luz se achica; tocar la bocina la recarga) · 4 cada acierto trae un sonido nuevo.
 */
(function (global) {
    'use strict';

    var K = global.AsociaKit;
    var Ut = global.PedniaParejaBase.util;
    var Act = global.AsociaActores;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var rnd = Ut.rnd;
    var EXTRA = ['reloj', 'ventilador', 'aspiradora', 'licuadora'];
    var ALTOS = { ventana: 1, reloj: 1 };

    var escena = {
        iniciar: function () { this.objs = []; this.luz = null; this.pila = 1; },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            L.y0 = Math.round(H * 0.66);
            var hueco = Math.max(60, H * 0.16);
            L.bocina = { x: W / 2, y: Math.max(60, Math.min(100, 56 + hueco * 0.2)), r: Math.max(28, Math.min(40, hueco * 0.3)) };
            L.pres = W >= 760 ? { x: W - 72, piso: H - 104, alto: Math.min(160, H * 0.28), modelo: 'nino' } : null;
            var der = L.pres ? W - 150 : W - 20;
            L.tam = Math.max(80, Math.min(150, H * 0.22, (der - 20) / 5.2));
            L.radio = Math.max(90, Math.min(160, L.tam * 1.05));
            // Sitios: tres en la pared (altos) y tres en el piso, alternados.
            var n = 6, x0 = 20 + L.tam * 0.55, x1 = der - L.tam * 0.55;
            L.sitios = [];
            for (var i = 0; i < n; i++) {
                var x = x0 + (x1 - x0) * i / (n - 1);
                var alto = i % 2 === 1;
                L.sitios.push({ x: x, y: alto ? L.y0 - L.tam * 1.05 : L.y0 + (H - L.y0) * 0.42, alto: alto });
            }
            return L;
        },

        armar: function (reubicar) {
            var self = this;
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            K.textura(this, 'casa_fondo', L.W, L.H, function (x, w, h) {
                K.pared(x, w, L.y0, { arriba: '#b6c4e0', abajo: '#94a6cc', raya: 'rgba(255,255,255,0.12)' });
                K.piso(x, w, h, L.y0, { lejos: '#8a6a4a', cerca: '#ad855c' });
                // Zócalo, enchufe, alfombra larga.
                x.fillStyle = '#6d4c2f'; K.rr(x, w * 0.12, h * 0.86, w * 0.6, h * 0.08, 20); x.fill();
                x.strokeStyle = '#e8c99a'; x.lineWidth = 3; x.setLineDash([10, 8]);
                K.rr(x, w * 0.13, h * 0.87, w * 0.58, h * 0.06, 16); x.stroke(); x.setLineDash([]);
            });
            keep(this.add.image(0, 0, 'casa_fondo').setOrigin(0, 0).setDepth(0));
            // Capa oscura con el agujero de la linterna: una textura grande que se mueve con la luz.
            var ow = L.W * 2 + 40, oh = L.H * 2 + 40;
            K.textura(this, 'casa_oscuro', ow, oh, function (x, w, h) {
                x.fillStyle = 'rgba(5,8,20,0.93)';
                x.fillRect(0, 0, w, h);
                x.globalCompositeOperation = 'destination-out';
                var g = x.createRadialGradient(w / 2, h / 2, L.radio * 0.35, w / 2, h / 2, L.radio);
                g.addColorStop(0, 'rgba(0,0,0,1)');
                g.addColorStop(0.75, 'rgba(0,0,0,0.85)');
                g.addColorStop(1, 'rgba(0,0,0,0)');
                x.fillStyle = g;
                x.beginPath(); x.arc(w / 2, h / 2, L.radio, 0, Math.PI * 2); x.fill();
                // Tinte cálido de la linterna.
                x.globalCompositeOperation = 'source-over';
                var t = x.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, L.radio);
                t.addColorStop(0, 'rgba(255,240,180,0.18)');
                t.addColorStop(1, 'rgba(255,240,180,0)');
                x.fillStyle = t;
                x.beginPath(); x.arc(w / 2, h / 2, L.radio, 0, Math.PI * 2); x.fill();
            });
            this.oscuro = keep(this.add.image(L.W / 2, L.H * 0.55, 'casa_oscuro').setDepth(50));
            if (!this.luz) this.luz = { x: L.W / 2, y: L.H * 0.55 };
            this.relampago = keep(this.add.rectangle(0, 0, L.W, L.H, 0xe7f5ff, 0).setOrigin(0, 0).setDepth(52));
            this.lamparasG = keep(this.add.graphics().setDepth(49));
            var V = this.montarVida(keep);
            if (V) V.gato(L.W * 0.5, L.y0 - L.tam * 0.25, { t: 10, depth: 56 });
            this.montarHud(keep);
            if (reubicar) {
                this.objs.forEach(function (o) {
                    var s = L.sitios[o.sitio];
                    o.actor.cont.setPosition(s.x, s.y).setScale(L.tam / o.actor.tam);
                });
            }
        },

        /* ── Objetos en la casa ── */

        poner: function (ids) {
            var self = this;
            var L = this.L;
            this.objs.forEach(function (o) { o.actor.destruir(); });
            this.objs = [];
            this.vivos = [];
            var altos = Ut.mezclar(L.sitios.map(function (s, i) { return s.alto ? i : -1; }).filter(function (i) { return i >= 0; }));
            var bajos = Ut.mezclar(L.sitios.map(function (s, i) { return !s.alto ? i : -1; }).filter(function (i) { return i >= 0; }));
            ids.forEach(function (id) {
                var lista = ALTOS[id] ? altos : bajos;
                var si = lista.length ? lista.shift() : (altos.length ? altos.shift() : bajos.shift());
                var s = L.sitios[si];
                var a = Act.crear(self, id, s.x, s.y, L.tam);
                if (a.animarIdle) a.animarIdle(false);
                a.sonido = self.sonidoDe(id);
                a.cont.setDepth(20);
                self.objs.push({ id: id, actor: a, sitio: si, visto: 0, revelado: false, encendido: false });
                self.vivos.push(a);
            });
        },

        disponibles: function () { return this.objs.filter(function (o) { return !o.encendido; }).map(function (o) { return o.id; }); },

        objEn: function (x, y) {
            var L = this.L;
            var mejor = null, dmin = L.tam * 0.55;
            this.objs.forEach(function (o) {
                if (o.encendido) return;
                var d = Math.hypot(x - o.actor.cont.x, y - o.actor.cont.y);
                if (d < dmin) { dmin = d; mejor = o; }
            });
            return mejor;
        },

        /* ── Entrada: el dedo lleva la linterna; tocar algo ya alumbrado lo elige ── */

        // Un toque corto sobre algo ya alumbrado lo elige; arrastrar solo mueve la linterna.
        alTocar: function (p) {
            if (this.vidaAmb) this.vidaAmb.tocar(p);
            if (this.fase !== 'jugar') return;
            var o = this.objEn(p.x, p.y);
            this.toque = { x: p.x, y: p.y, t: this.time.now, obj: o && o.revelado ? o : null };
            this.moviendo = true;
            if (!this.toque.obj) this.moverLuz(p.x, p.y);
            this.pista.reiniciar();
        },

        alMover: function (p) {
            if (!this.moviendo || this.fase !== 'jugar') return;
            if (this.toque && Math.hypot(p.x - this.toque.x, p.y - this.toque.y) > 14) this.toque.obj = null;
            this.moverLuz(p.x, p.y);
        },

        alSoltar: function () {
            this.moviendo = false;
            var t = this.toque;
            this.toque = null;
            if (t && t.obj && this.time.now - t.t < 600 && this.fase === 'jugar') this.elegir(t.obj);
        },

        moverLuz: function (x, y) {
            this.luz = { x: x, y: y };
            if (this.time.now - (this.ultClic || 0) > 260) { this.ultClic = this.time.now; K.ruido({ f: 4000, q: 0.5, dur: 0.03, vol: 0.012 }); }
        },

        elegir: async function (o) {
            var a = o.actor;
            if (o.id === this.objetivo) {
                o.encendido = true;
                this.fase = 'premio';
                a.cont.setDepth(55);
                await this.celebrar(a);
                this.encenderLampara(o);
                this.coleccion.push(a);
                await this.seguir();
            } else {
                a.cont.setDepth(55);
                // La linterna parpadea.
                this.tweens.add({ targets: this.oscuro, alpha: 0.6, duration: 60, yoyo: true, repeat: 3 });
                await this.fallar(a);
                a.cont.setDepth(20);
                o.revelado = false;
                o.visto = 0;
            }
        },

        /** Lámpara de pie que se enciende junto al objeto encontrado: queda iluminado. */
        encenderLampara: function (o) {
            var L = this.L;
            var a = o.actor;
            o.lampara = { x: a.cont.x, y: a.cont.y };
            a.cont.setDepth(55);
            K.tono({ f: 1200, dur: 0.06, vol: 0.06, tipo: 'square' });
            this.brillo(a.cont.x, a.cont.y - L.tam * 0.3, 10);
        },

        dibujarLamparas: function (t) {
            var g = this.lamparasG;
            g.clear();
            var L = this.L;
            this.objs.forEach(function (o) {
                if (!o.encendido) return;
                var a = o.actor.cont;
                // Halo cálido detrás del objeto (por encima de la oscuridad gracias a su profundidad).
                for (var k = 4; k >= 1; k--) {
                    g.fillStyle(0xffe8a3, 0.07 * k);
                    g.fillCircle(a.x, a.y, L.tam * (0.35 + k * 0.12) * (1 + Math.sin(t / 500 + a.x) * 0.02));
                }
            });
            this.lamparasG.setDepth(51);
        },

        /* ── Niveles ── */

        planNiveles: function () {
            var plan = this.planBase({ extra: EXTRA, n: [4, 5, 5, 6] });
            plan[2].tormenta = true;
            plan[3].tormenta = true;
            return plan;
        },

        prepararNivel: async function (i, nv) {
            // Al cambiar de nivel se vuelve a cortar la luz.
            this.oscuro.setAlpha(0);
            this.poner(nv.ids);
            this.pila = 1;
            K.ruido({ f: 120, q: 0.5, dur: 0.4, vol: 0.1 });
            await tw(this, { targets: this.oscuro, alpha: 1, duration: 600 });
        },

        alEmpezarNivel: function (i, nv) {
            var self = this;
            if (this.eventoRayo) this.eventoRayo.remove();
            if (nv.tormenta) {
                this.eventoRayo = this.time.addEvent({ delay: 6500, loop: true, callback: function () { if (self.fase === 'jugar') self.rayo(); } });
            }
        },

        alTerminarNivel: function () {
            if (this.eventoRayo) { this.eventoRayo.remove(); this.eventoRayo = null; }
        },

        rayo: async function () {
            this.relampago.setFillStyle(0xe7f5ff, 0.85);
            this.oscuro.setAlpha(0.15);
            await esperar(this, 90);
            this.relampago.setFillStyle(0xe7f5ff, 0);
            this.oscuro.setAlpha(1);
            await esperar(this, 120);
            this.relampago.setFillStyle(0xe7f5ff, 0.6);
            this.oscuro.setAlpha(0.35);
            await esperar(this, 70);
            this.relampago.setFillStyle(0xe7f5ff, 0);
            this.oscuro.setAlpha(1);
            this.time.delayedCall(500, function () { K.ruido({ f: 90, q: 0.4, dur: 1.4, vol: 0.2, tipo: 'lowpass' }); });
        },

        repetir: function () {
            // Tocar la bocina también recarga la pila de la linterna.
            this.pila = 1;
            if (this.fase !== 'jugar' || this.sonando) return;
            K.efecto(this, 'clic');
            this.pista.reiniciar();
            this.anunciar();
        },

        paso: function (time, delta) {
            var L = this.L;
            if (!this.oscuro || !this.luz) return;
            // La luz sigue al dedo con un poco de inercia (se siente la linterna en la mano).
            var o = this.oscuro;
            o.x += (this.luz.x - o.x) * Math.min(1, delta / 90);
            o.y += (this.luz.y - o.y) * Math.min(1, delta / 90);
            if (this.nv && this.nv.tormenta && this.fase === 'jugar') {
                this.pila = Math.max(0.55, this.pila - delta / 40000);
                o.setScale(this.pila + Math.sin(time / 90) * 0.01);
            } else o.setScale(1 + Math.sin(time / 300) * 0.01);
            var r = L.radio * o.scale * 0.55;
            var self = this;
            this.objs.forEach(function (q) {
                if (q.encendido) return;
                var c = q.actor.cont;
                var dentro = Math.hypot(c.x - o.x, c.y - o.y) < r;
                if (dentro) q.visto += delta; else q.visto = Math.max(0, q.visto - delta * 0.5);
                if (!q.revelado && q.visto > 450) {
                    q.revelado = true;
                    self.brillo(c.x, c.y - L.tam * 0.2, 5);
                    K.tono({ f: 1800, dur: 0.05, vol: 0.03 });
                }
                if (q.revelado && q.visto <= 0) q.revelado = false;
            });
            this.dibujarLamparas(time);
            if (this.ayuda && this.fase === 'jugar' && time - (this.ultBrillo || 0) > 2600) {
                this.ultBrillo = time;
                var obj = this.objs.filter(function (q) { return q.id === self.objetivo && !q.encendido; })[0];
                if (obj) this.brillo(obj.actor.cont.x, obj.actor.cont.y, 4);
            }
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            var o = this.objs.filter(function (q) { return q.id === self.objetivo && !q.encendido; })[0];
            if (!o) return Promise.resolve();
            var c = o.actor.cont;
            if (o.revelado) return this.ctx.mano({ punto: { x: c.x, y: c.y }, holdMs: 500, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
            return this.ctx.mano({
                punto: { x: this.oscuro.x, y: this.oscuro.y }, holdMs: 200,
                arrastre: { dx: c.x - this.oscuro.x, dy: c.y - this.oscuro.y, durMs: 1200 },
                cancelado: function () { return cancelada() || self.fase !== 'jugar'; }
            });
        },

        estadoExtra: function () {
            var o = this.oscuro;
            return { luz: o ? { x: Math.round(o.x), y: Math.round(o.y), pila: +this.pila.toFixed(2) } : null, objs: this.objs.map(function (q) { return { id: q.id, x: Math.round(q.actor.cont.x), y: Math.round(q.actor.cont.y), revelado: q.revelado, encendido: q.encendido }; }) };
        },

        antesDeFiesta: async function () {
            // ¡Volvió la luz!
            K.tono({ f: 600, f2: 1200, dur: 0.3, vol: 0.06 });
            await tw(this, { targets: this.oscuro, alpha: 0, duration: 700 });
            this.objs.forEach(function (q) { if (!q.encendido) q.actor.cont.setAlpha(0.35); });
        },

        demo: async function () {
            var self = this;
            var ctx = this.ctx;
            var t = ctx.textos || {};
            var d = this.config.demo || { sonido: 'mugido', correcto: 'vaca', opciones: ['gallo', 'vaca'] };
            var L = this.L;
            this.fase = 'demo';
            var limpiar = function () {
                ctx.quitarMano();
                self.objs.forEach(function (o) { o.actor.destruir(); });
                self.objs = [];
                self.vivos = [];
            };
            await ctx.decir({ voz: 'zeus', texto: t.demostracion || '¡Mira cómo se juega!' }, { minMs: 1600 });
            if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
            // Gallo y vaca en los dos primeros sitios del piso (a la izquierda).
            var sitios = [0, 2];
            d.opciones.forEach(function (id, k) {
                var s = L.sitios[sitios[k]];
                var a = Act.crear(self, id, s.x, s.y, L.tam);
                a.cont.setDepth(20);
                a.sonido = id === d.correcto ? d.sonido : Act.sonidoDe(id);
                self.objs.push({ id: id, actor: a, sitio: sitios[k], visto: 0, revelado: false, encendido: false });
                self.vivos.push(a);
            });
            var b = L.bocina;
            var sonando = Promise.resolve();
            await ctx.mano({ punto: { x: b.x, y: b.y }, holdMs: 500, onPresionar: function () { sonando = self.escuchar(d.sonido); } });
            await sonando;
            var vaca = this.objs.filter(function (o) { return o.id === d.correcto; })[0];
            var gallo = this.objs.filter(function (o) { return o.id !== d.correcto; })[0];
            var ruta = [gallo, vaca];
            for (var k = 0; k < ruta.length; k++) {
                if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
                var c = ruta[k].actor.cont;
                var x0 = this.luz.x, y0 = this.luz.y;
                await ctx.mano({
                    punto: { x: x0, y: y0 }, holdMs: 150, arrastre: { dx: c.x - x0, dy: c.y - y0, durMs: 1000, soltarEnDestino: true },
                    onDuranteArrastre: (function (cx, cy) { return function () { var o = { x: x0, y: y0 }; self.tweens.add({ targets: o, x: cx, y: cy, duration: 1000, ease: 'Sine.easeInOut', onUpdate: function () { self.luz = { x: o.x, y: o.y }; } }); }; })(c.x, c.y)
                });
                await esperar(this, 900);
            }
            if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
            await ctx.mano({ punto: { x: vaca.actor.cont.x, y: vaca.actor.cont.y }, holdMs: 450 });
            vaca.encendido = true;
            vaca.actor.cont.setDepth(55);
            K.efecto(this, 'recompensa');
            Ut.estallido(this, vaca.actor.cont.x, vaca.actor.cont.y - L.tam * 0.2, { n: 14, tex: 'estrella', tam: 28, dist: 150, sinTinte: true, depth: 85 });
            await Promise.all([this.escuchar(d.sonido, { breve: true, bocina: false }), vaca.actor.acierto(1500)]);
            await ctx.decir({ voz: 'zoe', texto: t.demostracionAcierto || '¡Así se hace!' }, { estado: 'acierto', minMs: 1300 });
            await ctx.decir({ voz: 'zeus', texto: t.demostracionFin || '¡Ahora te toca a ti!' }, { minMs: 1000 });
            limpiar();
        }
    };

    K.crear({ id: 'linterna', fondo: '#1b2440', escena: escena });
})(typeof window !== 'undefined' ? window : this);
