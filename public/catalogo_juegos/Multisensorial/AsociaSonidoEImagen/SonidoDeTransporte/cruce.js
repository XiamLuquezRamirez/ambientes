/**
 * «El cruce» — motor propio de Sonido de transporte (5-6 años).
 *
 * A la salida de la ciudad cada vehículo espera en SU carril, frente a SU señal en rojo: el avión
 * en la pista (barra de luces), el tren en la vía (semáforo ferroviario) y los de calle en tres
 * carriles con semáforo. Suena uno (la sirena…). El niño BAJA EL INTERRUPTOR de la señal de ese
 * carril (o la toca) y la pone en verde: el vehículo arranca con su sonido y su acción (la
 * ambulancia enciende las luces, el tren echa humo, el avión despega). Si da paso a otro, ese
 * arranca, suena, frena en seco y su señal vuelve a rojo.
 *
 * Niveles: 1 el reto · 2 otro sonido · 3 el sonido llega antes que los vehículos (se oye de lejos
 * y después llegan a los carriles) · 4 después de cada salida llega otro y el sonido cambia.
 */
(function (global) {
    'use strict';

    var K = global.AsociaKit;
    var Ut = global.PedniaParejaBase.util;
    var Act = global.AsociaActores;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var rnd = Ut.rnd;
    var CALLE = ['ambulancia', 'camion', 'motocicleta', 'bicicleta'];
    var CARRIL = { avion: 0, tren: 1 };

    var escena = {
        iniciar: function () { this.carriles = []; },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.bocina = { x: W / 2, y: Math.max(60, Math.min(96, 54 + hueco * 0.2)), r: Math.max(28, Math.min(38, hueco * 0.3)) };
            L.pres = W >= 760 ? { x: W - 66, piso: H - 104, alto: Math.min(150, H * 0.26), modelo: 'nino' } : null;
            var top = L.bocina.y + L.bocina.r + 16;
            var alto = H - top - 10;
            L.tam = Math.max(64, Math.min(130, alto * 0.2, W / 7.5));
            // Cinco carriles de atrás (lejos, más chicos) hacia adelante.
            L.lanes = [0.13, 0.33, 0.53, 0.71, 0.9].map(function (k, i) {
                return { y: top + alto * k, esc: 0.62 + i * 0.1, tipo: i === 0 ? 'pista' : (i === 1 ? 'via' : 'calle') };
            });
            L.xEspera = W * 0.36;
            L.xSenal = L.xEspera + L.tam * 0.95;
            return L;
        },

        armar: function () {
            var self = this;
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            K.textura(this, 'cruce_fondo', L.W, L.H, function (x, w, h) { self.pintarCruce(x, w, h); });
            keep(this.add.image(0, 0, 'cruce_fondo').setOrigin(0, 0).setDepth(0));
            var V = this.montarVida(keep);
            var techo = L.lanes[0].y - L.tam * 0.6;
            if (V) {
                V.sol(L.W * 0.08, Math.max(40, techo * 0.4), Math.min(34, techo * 0.3));
                for (var nn = 0; nn < 3; nn++) V.nube(Math.random() * L.W, 20 + Math.random() * Math.max(10, techo - 70), 0.7);
                V.pajaros(2, 20, Math.max(30, techo - 40));
            }
            this.senales = L.lanes.map(function (ln, i) { return self.crearSenal(keep, i); });
            this.montarHud(keep);
            this.carriles.forEach(function (c, i) {
                if (!c || !c.actor || c.estado !== 'espera') return;
                var ln = L.lanes[i];
                c.actor.cont.setPosition(L.xEspera, ln.y - L.tam * ln.esc * 0.22).setScale(ln.esc * L.tam / c.actor.tam);
            });
        },

        pintarCruce: function (x, w, h) {
            var L = this.L;
            var ln = L.lanes;
            var g = x.createLinearGradient(0, 0, 0, ln[0].y);
            g.addColorStop(0, '#74c0fc'); g.addColorStop(1, '#d0ebff');
            x.fillStyle = g; x.fillRect(0, 0, w, h);
            // Ciudad lejana.
            for (var i = 0; i < 14; i++) {
                var bw = w / 14, bh = 30 + ((i * 37) % 60);
                x.fillStyle = ['#a5b4fc', '#91a7ff', '#bac8ff'][i % 3];
                x.fillRect(i * bw, ln[0].y - L.tam * 0.55 - bh, bw - 4, bh);
                x.fillStyle = 'rgba(255,255,255,0.5)';
                for (var v = 0; v < 3; v++) x.fillRect(i * bw + 6 + v * 10, ln[0].y - L.tam * 0.55 - bh + 8, 5, 6);
            }
            // Pasto entre carriles.
            x.fillStyle = '#8ce99a'; x.fillRect(0, ln[0].y - L.tam * 0.55, w, h);
            K.grano(x, 0, ln[0].y - L.tam * 0.55, w, h, Math.round(w * h / 500), ['#69db7c', '#b2f2bb'], 1.3, 0.35);
            var self = this;
            ln.forEach(function (l, i) {
                var a = L.tam * l.esc * 0.5;
                if (l.tipo === 'pista') {
                    x.fillStyle = '#495057'; x.fillRect(0, l.y - a * 0.2, w, a * 0.9);
                    x.fillStyle = '#ffffff'; for (var px = 0; px < w; px += 50) x.fillRect(px, l.y + a * 0.22, 28, 4);
                } else if (l.tipo === 'via') {
                    x.fillStyle = '#a1887f'; x.fillRect(0, l.y - a * 0.05, w, a * 0.6);
                    x.fillStyle = '#6d4c41'; for (var dx = 0; dx < w; dx += 15) x.fillRect(dx, l.y - a * 0.05, 8, a * 0.6);
                    x.fillStyle = '#ced4da'; x.fillRect(0, l.y + a * 0.05, w, 3); x.fillRect(0, l.y + a * 0.4, w, 3);
                } else {
                    x.fillStyle = '#5c5f66'; x.fillRect(0, l.y - a * 0.25, w, a * 0.95);
                    x.fillStyle = '#ffd43b'; for (var cx = 0; cx < w; cx += 44) x.fillRect(cx, l.y + a * 0.68, 24, 3);
                }
                // Línea de detención frente a la señal.
                x.fillStyle = '#ffffff'; x.fillRect(L.xSenal - 4, l.y - a * 0.25, 6, a * 0.95);
            });
        },

        /** Señal con dos luces (roja/verde) e interruptor que se baja. */
        crearSenal: function (keep, i) {
            var L = this.L, ln = L.lanes[i];
            var k = ln.esc;
            var c = keep(this.add.container(L.xSenal + 14 * k, ln.y - L.tam * k * 0.95).setDepth(30 + i));
            var poste = this.add.rectangle(0, L.tam * k * 0.45, 6 * k, L.tam * k * 0.9, 0x495057);
            var caja = this.add.rectangle(0, 0, 26 * k, 50 * k, 0x212529).setStrokeStyle(2, 0x000000);
            var roja = this.add.circle(0, -12 * k, 9 * k, 0xff3b3b);
            var verde = this.add.circle(0, 12 * k, 9 * k, 0x1b4d2b);
            var palanca = this.add.rectangle(24 * k, -8 * k, 10 * k, 22 * k, 0xfcc419).setStrokeStyle(2, 0xe67700);
            c.add([poste, caja, roja, verde, palanca]);
            c.roja = roja; c.verde = verde; c.palanca = palanca; c.k = k; c.i = i;
            return c;
        },

        ponerSenal: function (i, verde) {
            var s = this.senales[i];
            s.roja.setFillStyle(verde ? 0x5c1a1a : 0xff3b3b);
            s.verde.setFillStyle(verde ? 0x51ff7a : 0x1b4d2b);
            this.tweens.add({ targets: s.palanca, y: (verde ? 10 : -8) * s.k, duration: 140 });
            K.tono({ f: verde ? 900 : 500, dur: 0.08, vol: 0.06, tipo: 'square' });
        },

        /* ── Vehículos ── */

        tipoCarril: function (id) { return CARRIL[id] != null ? CARRIL[id] : -1; },

        /** Reparte: avión en la pista, tren en la vía, los demás en los tres carriles de calle. */
        repartir: function (objetivo) {
            var calle = Ut.mezclar(['ambulancia', 'camion', 'motocicleta']);
            if (objetivo && this.tipoCarril(objetivo) < 0 && calle.indexOf(objetivo) < 0) calle[0] = objetivo;
            return ['avion', 'tren'].concat(calle);
        },

        llegar: function (i, id, ms) {
            var self = this;
            var L = this.L, ln = L.lanes[i];
            var a = Act.crear(this, id, -L.tam, ln.y - L.tam * ln.esc * 0.22, L.tam);
            if (a.animarIdle) a.animarIdle(false);
            a.sonido = this.sonidoDe(id);
            a.cont.setScale(ln.esc).setDepth(20 + i);
            if (id === 'avion') a.cont.y -= L.tam * ln.esc * 0.08;
            var c = { id: id, actor: a, i: i, estado: 'llega' };
            this.carriles[i] = c;
            this.vivos.push(a);
            return tw(this, { targets: a.cont, x: L.xEspera, duration: ms || 900, ease: 'Cubic.easeOut' }).then(function () {
                c.estado = 'espera';
                K.ruido({ f: 200, q: 1, dur: 0.15, vol: 0.06 });
            });
        },

        disponibles: function () { return this.carriles.filter(function (c) { return c && c.estado === 'espera'; }).map(function (c) { return c.id; }); },

        /* ── Entrada ── */

        senalEn: function (x, y) {
            var L = this.L;
            for (var i = 0; i < this.senales.length; i++) {
                var s = this.senales[i];
                var k = s.k;
                if (Math.abs(x - s.x - 10 * k) < 34 * k && Math.abs(y - s.y) < 40 * k) return i;
            }
            // También vale tocar el carril cerca de la señal.
            for (var j = 0; j < L.lanes.length; j++) {
                var ln = L.lanes[j];
                if (Math.abs(y - ln.y) < L.tam * ln.esc * 0.35 && Math.abs(x - L.xSenal) < L.tam * 0.4) return j;
            }
            return -1;
        },

        alTocar: function (p) {
            if (this.fase !== 'jugar') return;
            var i = this.senalEn(p.x, p.y);
            if (i >= 0) { this.tirando = { i: i, y: p.y, t: this.time.now }; this.pista.reiniciar(); return; }
            // Tocar un vehículo: suena (para comparar).
            var self = this;
            var c = this.carriles.filter(function (q) { return q && q.estado === 'espera' && Math.hypot(p.x - q.actor.cont.x, p.y - q.actor.cont.y) < self.L.tam * 0.5; })[0];
            if (c && !this.sonando) { this.escuchar(c.actor.sonido, { breve: true, vol: 0.75, bocina: false }); c.actor.saltito(0.06, 1); }
        },

        alMover: function (p) {
            var t = this.tirando;
            if (!t) return;
            if (p.y - t.y > 18) { this.tirando = null; this.darPaso(t.i); }
        },

        alSoltar: function () {
            var t = this.tirando;
            this.tirando = null;
            if (t && this.time.now - t.t < 500) this.darPaso(t.i);
        },

        darPaso: async function (i) {
            var c = this.carriles[i];
            if (!c || c.estado !== 'espera' || this.fase !== 'jugar') return;
            var self = this;
            var L = this.L;
            var a = c.actor;
            this.ponerSenal(i, true);
            if (c.id === this.objetivo) {
                c.estado = 'sale';
                this.fase = 'premio';
                // Arranca mientras hace su acción.
                var destinoX = L.W + L.tam;
                if (c.id === 'avion') {
                    this.tweens.add({ targets: a.cont, x: L.W * 0.7, duration: 900, ease: 'Quad.easeIn', onComplete: function () { self.tweens.add({ targets: a.cont, x: destinoX, y: a.cont.y - L.tam * 1.2, angle: -14, duration: 900, ease: 'Quad.easeIn' }); } });
                } else {
                    this.tweens.add({ targets: a.cont, x: L.W * 0.6, duration: 1400, ease: 'Quad.easeIn' });
                }
                await this.celebrar(a);
                await tw(this, { targets: a.cont, x: destinoX, duration: 600, ease: 'Quad.easeIn' });
                a.cont.setVisible(false);
                this.coleccion.push(a);
                this.ponerSenal(i, false);
                c.estado = 'fuera';
                // Nivel 4: llega otro al carril vacío.
                if (this.nv.cambia) {
                    var nuevo = i === 0 ? 'avion' : (i === 1 ? 'tren' : CALLE[(Math.random() * CALLE.length) | 0]);
                    await this.llegar(i, nuevo, 700);
                }
                await this.seguir();
            } else {
                c.estado = 'error';
                // Arranca, suena y frena en seco.
                await tw(this, { targets: a.cont, x: L.xEspera + L.tam * 0.5, duration: 350, ease: 'Quad.easeIn' });
                K.tono({ f: 1100, f2: 500, dur: 0.3, vol: 0.05, tipo: 'sawtooth' });
                this.tweens.add({ targets: a.cont, angle: 4, duration: 80, yoyo: true });
                await this.fallar(a);
                this.ponerSenal(i, false);
                await tw(this, { targets: a.cont, x: L.xEspera, duration: 500, ease: 'Sine.easeInOut' });
                c.estado = 'espera';
            }
        },

        /* ── Niveles ── */

        planNiveles: function () {
            var r = this.reto;
            var correcto = r.correcto || 'ambulancia';
            var otros = (r.opciones || []).filter(function (o) { return o !== correcto; });
            var t2 = otros[(Math.random() * otros.length) | 0] || 'tren';
            var t3 = otros.filter(function (o) { return o !== t2; })[0] || 'avion';
            return [
                { objetivo: correcto, meta: 1 },
                { objetivo: t2, meta: 1 },
                { objetivo: t3, meta: 1, lejos: true },
                { objetivo: null, meta: 3, cambia: true }
            ];
        },

        prepararNivel: async function (i, nv) {
            var self = this;
            this.carriles.forEach(function (c) { if (c && c.actor) c.actor.destruir(); });
            this.carriles = [];
            this.vivos = this.coleccion.slice();
            this.senales.forEach(function (s, k) { self.ponerSenal(k, false); });
            this.idsNivel = this.repartir(nv.objetivo);
            // Nivel 3: los vehículos llegan después de oír el sonido (en anunciar).
            if (nv.lejos) return;
            await Promise.all(this.idsNivel.map(function (id, k) { return esperar(self, k * 120).then(function () { return self.llegar(k, id); }); }));
        },

        anunciar: async function () {
            var self = this;
            if (this.nv && this.nv.lejos && !this.carriles.length) {
                // Se oye primero de lejos, con la pista vacía; después llegan todos.
                await this.escuchar(this.sonidoDe(this.objetivo), { vol: 0.55, pan: -0.7 });
                await Promise.all(this.idsNivel.map(function (id, k) { return esperar(self, k * 120).then(function () { return self.llegar(k, id, 700); }); }));
                return;
            }
            return this.escuchar(this.sonidoDe(this.objetivo));
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            var c = this.carriles.filter(function (q) { return q && q.id === self.objetivo && q.estado === 'espera'; })[0];
            if (!c) return Promise.resolve();
            var s = this.senales[c.i];
            if (this.ayuda) this.brillo(c.actor.cont.x, c.actor.cont.y, 6);
            return this.ctx.mano({ punto: { x: s.x + 24 * s.k, y: s.y - 8 * s.k }, holdMs: 200, arrastre: { dx: 0, dy: 26 * s.k, durMs: 300 }, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
        },

        estadoExtra: function () {
            return this.carriles.map(function (c) { return c ? c.id + ':' + c.estado : '-'; });
        },

        zonaFiesta: function () { var L = this.L; return { x: L.W * 0.05, y: L.lanes[3].y - L.tam * 0.4, w: L.W * 0.75 }; },

        antesDeFiesta: async function () {
            this.carriles.forEach(function (c) { if (c && c.actor && c.estado === 'espera') c.actor.cont.setAlpha(0.3); });
            this.coleccion.forEach(function (a) { a.cont.setVisible(true).setAlpha(1).setAngle(0).setPosition(-100, a.cont.y); });
        },

        demo: async function () {
            var self = this;
            var ctx = this.ctx;
            var t = ctx.textos || {};
            var L = this.L;
            this.fase = 'demo';
            var limpiar = function () {
                ctx.quitarMano();
                self.carriles.forEach(function (c) { if (c && c.actor) c.actor.destruir(); });
                self.carriles = [];
                self.vivos = [];
                self.senales.forEach(function (s, k) { self.ponerSenal(k, false); });
            };
            await ctx.decir({ voz: 'zeus', texto: t.demostracion || '¡Mira cómo se juega!' }, { minMs: 1600 });
            if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
            // El tren en la vía y la moto en la calle.
            await Promise.all([this.llegar(1, 'tren'), this.llegar(3, 'motocicleta')]);
            var b = L.bocina;
            var sonando = Promise.resolve();
            await ctx.mano({ punto: { x: b.x, y: b.y }, holdMs: 500, onPresionar: function () { sonando = self.escuchar('tren'); } });
            await sonando;
            if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
            var s = this.senales[1];
            var c = this.carriles[1];
            await ctx.mano({ punto: { x: s.x + 24 * s.k, y: s.y - 8 * s.k }, holdMs: 200, arrastre: { dx: 0, dy: 26 * s.k, durMs: 300, soltarEnDestino: true }, onDuranteArrastre: function () { self.ponerSenal(1, true); } });
            if (!ctx.vivo()) return limpiar();
            this.tweens.add({ targets: c.actor.cont, x: L.W * 0.62, duration: 1500, ease: 'Quad.easeIn' });
            K.efecto(this, 'recompensa');
            await Promise.all([this.escuchar('tren', { breve: true, bocina: false }), c.actor.acierto(1500)]);
            Ut.estallido(this, c.actor.cont.x, c.actor.cont.y - L.tam * 0.3, { n: 14, tex: 'estrella', tam: 28, dist: 150, sinTinte: true, depth: 85 });
            await ctx.decir({ voz: 'zoe', texto: t.demostracionAcierto || '¡Así se hace!' }, { estado: 'acierto', minMs: 1300 });
            await ctx.decir({ voz: 'zeus', texto: t.demostracionFin || '¡Ahora te toca a ti!' }, { minMs: 1000 });
            limpiar();
        }
    };

    K.crear({ id: 'cruce', fondo: '#d0ebff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
