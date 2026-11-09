/**
 * «Enchufa la máquina» — motor propio de Sonido de una máquina (5-6 años).
 *
 * En el cuarto de lavado, las máquinas están sobre el mesón y sus cables cuelgan y se enredan
 * hasta los enchufes que quedan en el piso (en otro orden). Suena una máquina. El niño SIGUE CON
 * LA VISTA el cable de la que cree que es y ARRASTRA ese enchufe hasta la regleta: al enchufar,
 * la máquina arranca con su sonido real. Si es la correcta, trabaja completa (la aspiradora limpia
 * la basura, el ventilador mueve la cortina…) y queda con su luz verde. Si no, arranca un momento,
 * Zeus invita a escuchar otra vez y el enchufe salta de vuelta.
 *
 * Niveles: 1 el reto, cables sin cruzarse · 2 otro sonido, cables cruzados · 3 todos los cables
 * del mismo color (hay que seguirlos) · 4 cada acierto trae un sonido nuevo.
 */
(function (global) {
    'use strict';

    var K = global.AsociaKit;
    var Ut = global.PedniaParejaBase.util;
    var Act = global.AsociaActores;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var rnd = Ut.rnd;
    var EXTRA = ['lavadora'];
    var COLORES = [0xe03131, 0x1c7ed6, 0xf59f00, 0x2f9e44, 0x9c36b5];

    function bezier(p0, p1, p2, p3, t) {
        var u = 1 - t;
        return {
            x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
            y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
        };
    }

    var escena = {
        iniciar: function () { this.maqs = []; },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.bocina = { x: W / 2, y: Math.max(60, Math.min(100, 56 + hueco * 0.2)), r: Math.max(28, Math.min(40, hueco * 0.3)) };
            L.pres = W >= 760 ? { x: W - 70, piso: H - 104, alto: Math.min(160, H * 0.28), modelo: 'nino' } : null;
            var der = L.pres ? W - 145 : W - 16;
            L.meson = { y: Math.max(L.bocina.y + L.bocina.r + H * 0.22, H * 0.46), x0: 16, x1: der - 10 };
            L.tam = Math.max(70, Math.min(135, H * 0.2, (L.meson.x1 - L.meson.x0) / 5.6));
            L.y0 = L.meson.y + H * 0.12;                        // piso
            L.enchufesY = H - Math.max(70, H * 0.12);
            L.regleta = { x: Math.min(der - 60, W * 0.74), y: L.enchufesY, w: Math.max(120, W * 0.13), h: 34 };
            L.zonaEnch = { x0: W * 0.06, x1: L.regleta.x - L.regleta.w * 0.7 - 20 };
            return L;
        },

        armar: function (reubicar) {
            var self = this;
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            K.textura(this, 'lavado_fondo', L.W, L.H, function (x, w, h) { self.pintarCuarto(x, w, h); });
            keep(this.add.image(0, 0, 'lavado_fondo').setOrigin(0, 0).setDepth(0));
            this.cablesG = keep(this.add.graphics().setDepth(15));
            var V = this.montarVida(keep);
            if (V) V.burbujas({ x: L.W * 0.05, y: L.bocina.y + L.bocina.r, w: L.meson.x1 - L.W * 0.05, h: L.meson.y - L.tam - L.bocina.y - L.bocina.r, n: 7, depth: 9 });
            this.montarRegleta(keep);
            this.montarHud(keep);
            if (reubicar && this.maqs.length) this.ubicar(false);
        },

        pintarCuarto: function (x, w, h) {
            var L = this.L, m = L.meson;
            // Pared con azulejos blancos arriba del mesón y pintura abajo.
            K.pared(x, w, L.y0, { arriba: '#e7f5ff', abajo: '#d0ebff', raya: 'rgba(255,255,255,0.3)' });
            var az = 28;
            for (var yy = m.y - h * 0.2; yy < m.y; yy += az) for (var xx = 0; xx < w; xx += az) {
                x.fillStyle = '#f8f9fa'; x.fillRect(xx + 1, yy + 1, az - 2, az - 2);
            }
            K.piso(x, w, h, L.y0, { lejos: '#868e96', cerca: '#adb5bd', zocalo: false });
            // Baldosas del piso.
            x.strokeStyle = 'rgba(0,0,0,0.08)'; x.lineWidth = 2;
            for (var i = 0; i < w; i += 60) { x.beginPath(); x.moveTo(i, L.y0); x.lineTo(i + (i - w / 2) * 0.4, h); x.stroke(); }
            // Repisa con detergentes.
            var ry = m.y - h * 0.26;
            if (ry > L.bocina.y + L.bocina.r + 50) {
                K.madera(x, w * 0.06, ry, w * 0.3, 12, { r: 3 });
                [['#4dabf7', 0.08], ['#ff8787', 0.14], ['#ffd43b', 0.2], ['#69db7c', 0.26]].forEach(function (q) {
                    x.fillStyle = q[0]; K.rr(x, w * q[1], ry - 44, 26, 44, 6); x.fill();
                    x.fillStyle = 'rgba(255,255,255,0.5)'; x.fillRect(w * q[1] + 5, ry - 34, 16, 10);
                });
            }
            // Mesón: tablero y frente con puertas.
            K.sombra(x, (m.x0 + m.x1) / 2, L.y0 + 4, (m.x1 - m.x0) * 0.55, 10, 0.25);
            x.fillStyle = '#ced4da'; x.fillRect(m.x0, m.y, m.x1 - m.x0, L.y0 - m.y);
            var puertas = Math.max(2, Math.round((m.x1 - m.x0) / 180));
            for (var p = 0; p < puertas; p++) {
                var px = m.x0 + (m.x1 - m.x0) * p / puertas;
                x.fillStyle = '#e9ecef'; K.rr(x, px + 6, m.y + 16, (m.x1 - m.x0) / puertas - 12, L.y0 - m.y - 22, 6); x.fill();
                x.fillStyle = '#868e96'; x.fillRect(px + (m.x1 - m.x0) / puertas / 2 - 14, m.y + 26, 28, 5);
            }
            K.madera(x, m.x0 - 8, m.y - 12, m.x1 - m.x0 + 16, 16, { claro: '#f1f3f5', medio: '#dee2e6', oscuro: '#adb5bd', r: 4 });
            // Enchufe de pared detrás de la regleta.
            var r = L.regleta;
            x.fillStyle = '#ffffff'; K.rr(x, r.x + r.w * 0.38, r.y - 90, 34, 46, 6); x.fill();
            x.fillStyle = '#495057'; x.fillRect(r.x + r.w * 0.38 + 11, r.y - 78, 4, 10); x.fillRect(r.x + r.w * 0.38 + 19, r.y - 78, 4, 10);
            x.strokeStyle = '#343a40'; x.lineWidth = 6;
            x.beginPath(); x.moveTo(r.x + r.w * 0.38 + 17, r.y - 44); x.quadraticCurveTo(r.x + r.w * 0.6, r.y - 20, r.x + r.w * 0.45, r.y - 6); x.stroke();
        },

        montarRegleta: function (keep) {
            var r = this.L.regleta;
            var c = keep(this.add.container(r.x, r.y).setDepth(14));
            c.add(this.add.rectangle(0, 0, r.w, r.h, 0xf8f9fa).setStrokeStyle(3, 0xadb5bd));
            c.add(this.add.rectangle(-r.w * 0.38, 0, 14, 14, 0xe03131).setStrokeStyle(2, 0xc92a2a));
            // Toma libre.
            var toma = this.add.container(r.w * 0.12, 0);
            toma.add([this.add.circle(0, 0, r.h * 0.38, 0xdee2e6).setStrokeStyle(2, 0xadb5bd), this.add.rectangle(-5, 0, 3, 9, 0x343a40), this.add.rectangle(5, 0, 3, 9, 0x343a40)]);
            c.add(toma);
            this.regleta = c;
            this.toma = { x: r.x + r.w * 0.12, y: r.y };
            this.luzRegleta = c.list[1];
        },

        /* ── Máquinas, cables y enchufes ── */

        poner: function (ids, nv) {
            var self = this;
            var L = this.L;
            this.maqs.forEach(function (m) { m.actor.destruir(); if (m.enchufe) m.enchufe.destroy(); });
            this.maqs = [];
            this.vivos = [];
            var orden = ids.map(function (id, i) { return i; });
            if (nv.cruzados) orden = Ut.mezclar(orden);
            ids.forEach(function (id, i) {
                var a = Act.crear(self, id, 0, 0, L.tam);
                if (a.animarIdle) a.animarIdle(false);
                a.sonido = self.sonidoDe(id);
                a.cont.setDepth(20);
                var color = nv.gris ? 0x495057 : COLORES[i % COLORES.length];
                var e = self.crearEnchufe(color);
                var m = { id: id, actor: a, i: i, slot: orden[i], color: color, enchufe: e, estado: 'suelto' };
                self.maqs.push(m);
                self.vivos.push(a);
            });
            this.ubicar(true);
        },

        crearEnchufe: function (color) {
            var c = this.add.container(0, 0).setDepth(25);
            var cuerpo = this.add.rectangle(0, 0, 44, 32, color).setStrokeStyle(3, 0x212529);
            var p1 = this.add.rectangle(-9, -23, 6, 16, 0xadb5bd).setStrokeStyle(1, 0x868e96);
            var p2 = this.add.rectangle(9, -23, 6, 16, 0xadb5bd).setStrokeStyle(1, 0x868e96);
            var brillo = this.add.rectangle(-11, -6, 12, 5, 0xffffff, 0.4);
            c.add([p1, p2, cuerpo, brillo]);
            return c;
        },

        ubicar: function (animar) {
            var self = this;
            var L = this.L, m = L.meson;
            var n = this.maqs.length;
            this.maqs.forEach(function (q) {
                var x = m.x0 + (m.x1 - m.x0) * (q.i + 0.5) / n;
                q.actor.cont.setPosition(x, m.y - L.tam * 0.45).setScale(L.tam / q.actor.tam);
                q.casa = { x: L.zonaEnch.x0 + (L.zonaEnch.x1 - L.zonaEnch.x0) * (q.slot + 0.5) / n, y: L.enchufesY };
                if (q.estado === 'enchufado') { q.enchufe.setPosition(self.toma.x, self.toma.y - 4); return; }
                if (animar) {
                    q.enchufe.setPosition(q.casa.x, L.H + 40);
                    self.tweens.add({ targets: q.enchufe, y: q.casa.y, duration: 500, delay: q.i * 90, ease: 'Back.easeOut' });
                } else q.enchufe.setPosition(q.casa.x, q.casa.y);
            });
        },

        /** Cable: sale de atrás de la máquina, cae por el borde del mesón y serpentea hasta el enchufe. */
        dibujarCables: function (t) {
            var g = this.cablesG;
            g.clear();
            var L = this.L;
            var self = this;
            this.maqs.forEach(function (q) {
                var a = q.actor.cont, e = q.enchufe;
                var p0 = { x: a.x + L.tam * 0.18, y: L.meson.y - 4 };
                var p3 = { x: e.x, y: e.y + 10 };
                var caida = L.y0 + (L.H - L.y0) * 0.25;
                var p1 = { x: p0.x + L.tam * 0.15, y: caida + 40 };
                var p2 = { x: p3.x + (p0.x - p3.x) * 0.25, y: p3.y + 60 };
                var prev = p0;
                // Sombra, borde y color.
                [[10, 0x000000, 0.18, 4], [9, 0x212529, 1, 0], [6, q.color, 1, 0]].forEach(function (capa) {
                    g.lineStyle(capa[0], capa[1], capa[2]);
                    g.beginPath();
                    g.moveTo(p0.x, p0.y + capa[3]);
                    for (var k = 1; k <= 24; k++) {
                        var p = bezier(p0, p1, p2, p3, k / 24);
                        g.lineTo(p.x, p.y + capa[3]);
                    }
                    g.strokePath();
                });
                // Brillo del cable.
                g.lineStyle(2, 0xffffff, q.estado === 'arrastrando' ? 0.6 : 0.25);
                g.beginPath(); g.moveTo(p0.x, p0.y - 1);
                for (var j = 1; j <= 24; j++) { var pp = bezier(p0, p1, p2, p3, j / 24); g.lineTo(pp.x - 1, pp.y - 2); }
                g.strokePath();
            });
        },

        disponibles: function () { return this.maqs.filter(function (m) { return m.estado !== 'listo'; }).map(function (m) { return m.id; }); },

        /* ── Entrada: arrastrar el enchufe a la regleta ── */

        alTocar: function (p) {
            if (this.fase !== 'jugar') return;
            var self = this;
            var q = this.maqs.filter(function (m) { return m.estado === 'suelto' && Math.hypot(p.x - m.enchufe.x, p.y - m.enchufe.y) < 50; })[0];
            if (q) {
                q.estado = 'arrastrando';
                this.arr = q;
                q.enchufe.setScale(1.25).setDepth(60);
                K.ruido({ f: 1500, q: 2, dur: 0.05, vol: 0.05 });
                this.pista.reiniciar();
                return;
            }
            // Tocar una máquina: tiembla un poco y su cable brilla (para seguirlo con la vista).
            var maq = this.maqs.filter(function (m) { return Math.hypot(p.x - m.actor.cont.x, p.y - m.actor.cont.y) < self.L.tam * 0.5; })[0];
            if (maq) { maq.actor.sacudir(); this.brillo(maq.enchufe.x, maq.enchufe.y, 6); }
        },

        alMover: function (p) {
            var q = this.arr;
            if (!q) return;
            q.enchufe.setPosition(p.x, p.y);
            var cerca = Math.hypot(p.x - this.toma.x, p.y - this.toma.y) < 46;
            this.regleta.setScale(cerca ? 1.06 : 1);
        },

        alSoltar: function (p) {
            var q = this.arr;
            if (!q) return;
            this.arr = null;
            this.regleta.setScale(1);
            var e = q.enchufe;
            if (Math.hypot(e.x - this.toma.x, e.y - this.toma.y) < 50 && this.fase === 'jugar') this.enchufar(q);
            else this.devolver(q);
        },

        devolver: function (q) {
            q.estado = 'mov';
            return tw(this, { targets: q.enchufe, x: q.casa.x, y: q.casa.y, scale: 1, duration: 420, ease: 'Back.easeOut' }).then(function () { q.estado = 'suelto'; q.enchufe.setDepth(25); });
        },

        enchufar: async function (q) {
            var self = this;
            var a = q.actor;
            q.estado = 'enchufado';
            await tw(this, { targets: q.enchufe, x: this.toma.x, y: this.toma.y - 4, scale: 1, duration: 140 });
            K.ruido({ f: 2500, q: 3, dur: 0.06, vol: 0.12 });
            Ut.estallido(this, this.toma.x, this.toma.y, { n: 6, tex: 'chispa', tam: 14, dist: 30, colores: [0xfff3bf, 0x74c0fc], depth: 61 });
            this.luzRegleta.setFillStyle(0x40c057);
            if (q.id === this.objetivo) {
                this.fase = 'premio';
                this.brillo(a.cont.x, a.cont.y, 10);
                await this.celebrar(a);
                // Queda trabajando con su luz verde; el enchufe vuelve a su lugar (ya enchufado al muro de atrás).
                q.estado = 'listo';
                this.coleccion.push(a);
                var luz = this.add.circle(a.cont.x + this.L.tam * 0.35, a.cont.y - this.L.tam * 0.35, 7, 0x40c057).setStrokeStyle(2, 0xffffff).setDepth(30);
                q.luz = luz;
                this.luzRegleta.setFillStyle(0xe03131);
                await tw(this, { targets: q.enchufe, x: q.casa.x, y: q.casa.y, duration: 400 });
                q.enchufe.setAlpha(0.6);
                await this.seguir();
            } else {
                // Arranca un momento con su ruido, y salta el enchufe.
                a.acierto(900);
                await this.fallar(a);
                this.luzRegleta.setFillStyle(0xe03131);
                q.enchufe.setDepth(60);
                await tw(this, { targets: q.enchufe, y: this.toma.y - 60, duration: 180, ease: 'Quad.easeOut' });
                await this.devolver(q);
            }
        },

        /* ── Niveles ── */

        planNiveles: function () {
            var plan = this.planBase({ extra: EXTRA, n: [4, 5, 5, 5] });
            plan[1].cruzados = true;
            plan[2].cruzados = true; plan[2].gris = true;
            plan[3].cruzados = true; plan[3].gris = true;
            return plan;
        },

        prepararNivel: async function (i, nv) {
            var self = this;
            this.maqs.forEach(function (m) { if (m.luz) m.luz.destroy(); });
            // Las de antes salen del mesón; llegan las nuevas.
            this.poner(nv.ids, nv);
            this.maqs.forEach(function (m, k) {
                var a = m.actor.cont, y = a.y;
                a.y = y - self.L.tam * 0.6; a.setAlpha(0);
                self.tweens.add({ targets: a, y: y, alpha: 1, duration: 400, delay: k * 110, ease: 'Bounce.easeOut' });
            });
            await esperar(this, 700);
        },

        paso: function (time) { this.dibujarCables(time); },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            var q = this.maqs.filter(function (m) { return m.id === self.objetivo && m.estado === 'suelto'; })[0];
            if (!q) return Promise.resolve();
            if (this.ayuda) { this.brillo(q.actor.cont.x, q.actor.cont.y, 6); this.brillo(q.enchufe.x, q.enchufe.y, 6); }
            return this.ctx.mano({
                punto: { x: q.enchufe.x, y: q.enchufe.y }, holdMs: 250,
                arrastre: { dx: this.toma.x - q.enchufe.x, dy: this.toma.y - q.enchufe.y, durMs: 1100 },
                cancelado: function () { return cancelada() || self.fase !== 'jugar' || !!self.arr; }
            });
        },

        estadoExtra: function () {
            return this.maqs.map(function (m) { return { id: m.id, estado: m.estado, enchufe: { x: Math.round(m.enchufe.x), y: Math.round(m.enchufe.y) } }; });
        },

        zonaFiesta: function () { var L = this.L; return { x: L.meson.x0, y: L.meson.y - L.tam * 0.45, w: L.meson.x1 - L.meson.x0 }; },

        antesDeFiesta: async function () {
            // Todas a la vez sobre el mesón.
            this.maqs.forEach(function (m) { if (m.estado !== 'listo') m.actor.cont.setAlpha(0.35); });
        },

        demo: async function () {
            var self = this;
            var ctx = this.ctx;
            var t = ctx.textos || {};
            var L = this.L;
            this.fase = 'demo';
            var limpiar = function () {
                ctx.quitarMano();
                self.maqs.forEach(function (m) { m.actor.destruir(); m.enchufe.destroy(); if (m.luz) m.luz.destroy(); });
                self.maqs = [];
                self.vivos = [];
                self.luzRegleta.setFillStyle(0xe03131);
            };
            await ctx.decir({ voz: 'zeus', texto: t.demostracion || '¡Mira cómo se juega!' }, { minMs: 1600 });
            if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
            // Demo con el ventilador y la licuadora (cables cruzados para mostrar cómo se siguen).
            var ids = ['ventilador', 'licuadora'];
            this.poner(ids, { cruzados: false });
            this.maqs[0].slot = 1; this.maqs[1].slot = 0;
            this.ubicar(true);
            await esperar(this, 600);
            var b = L.bocina;
            var sonando = Promise.resolve();
            await ctx.mano({ punto: { x: b.x, y: b.y }, holdMs: 500, onPresionar: function () { sonando = self.escuchar('licuadora'); } });
            await sonando;
            var q = this.maqs[1];
            if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
            // La mano recorre el cable desde la licuadora hasta su enchufe.
            await ctx.mano({ punto: { x: q.actor.cont.x, y: q.actor.cont.y }, holdMs: 150, arrastre: { dx: q.enchufe.x - q.actor.cont.x, dy: q.enchufe.y - q.actor.cont.y, durMs: 1200, soltarEnDestino: true } });
            this.brillo(q.enchufe.x, q.enchufe.y, 6);
            await ctx.mano({
                punto: { x: q.enchufe.x, y: q.enchufe.y }, holdMs: 200, arrastre: { dx: this.toma.x - q.enchufe.x, dy: this.toma.y - q.enchufe.y, durMs: 1000, soltarEnDestino: true },
                onDuranteArrastre: function () { self.tweens.add({ targets: q.enchufe, x: self.toma.x, y: self.toma.y - 4, duration: 1000, ease: 'Sine.easeInOut' }); }
            });
            if (!ctx.vivo()) return limpiar();
            K.ruido({ f: 2500, q: 3, dur: 0.06, vol: 0.12 });
            this.luzRegleta.setFillStyle(0x40c057);
            K.efecto(this, 'recompensa');
            Ut.estallido(this, q.actor.cont.x, q.actor.cont.y - L.tam * 0.2, { n: 14, tex: 'estrella', tam: 28, dist: 150, sinTinte: true, depth: 85 });
            await Promise.all([this.escuchar('licuadora', { breve: true, bocina: false }), q.actor.acierto(1500)]);
            await ctx.decir({ voz: 'zoe', texto: t.demostracionAcierto || '¡Así se hace!' }, { estado: 'acierto', minMs: 1300 });
            await ctx.decir({ voz: 'zeus', texto: t.demostracionFin || '¡Ahora te toca a ti!' }, { minMs: 1000 });
            limpiar();
        }
    };

    K.crear({ id: 'enchufes', fondo: '#d0ebff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
