/**
 * «La feria de los aros» — motor propio de La gran asociación (5-6 años, reto final).
 *
 * Puesto de feria con el TELÓN CERRADO. Suena un sonido nuevo (un teléfono vibrando…) y hay que
 * RECORDARLO: el telón no deja ver nada. Cuando el sonido termina (unos 2 s, como pide el
 * documento), el niño TIRA DE LA CUERDA y el telón se abre: aparecen cinco objetos en sus postes.
 * Entonces LANZA UN ARO como con una honda (arrastra el aro hacia atrás y suelta): si el aro cae
 * en el objeto que sonó, el objeto hace su acción, Zoe y Zeus celebran y gana un premio. Si cae en
 * otro, ese suena con su sonido y el aro rebota.
 *
 * Niveles: 1 el reto · 2 otro sonido · 3 los postes giran en un carrusel · 4 el telón se cierra
 * después de cada acierto y suena algo nuevo (hay que recordar otra vez).
 */
(function (global) {
    'use strict';

    var K = global.AsociaKit;
    var Ut = global.PedniaParejaBase.util;
    var Act = global.AsociaActores;
    var A = global.PedniaArte;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var rnd = Ut.rnd;
    var EXTRA = ['ventilador', 'tren', 'avion'];

    var escena = {
        iniciar: function () { this.postes = []; this.abierto = 0; this.giro = 0; },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.bocina = { x: W / 2, y: Math.max(60, Math.min(96, 54 + hueco * 0.2)), r: Math.max(28, Math.min(38, hueco * 0.3)) };
            L.pres = W >= 820 ? { x: W - 64, piso: H - 104, alto: Math.min(150, H * 0.26), modelo: 'nina' } : null;
            var der = L.pres ? W - 130 : W - 16;
            L.esc = { x0: 24, x1: der - 50, y0: L.bocina.y + L.bocina.r + 34, y1: H * 0.66 };   // escenario
            L.tam = Math.max(64, Math.min(120, (L.esc.x1 - L.esc.x0) / 6.2, (L.esc.y1 - L.esc.y0) * 0.5));
            L.cuerda = { x: der - 26, y0: L.esc.y0 - 10, y1: L.esc.y0 + (L.esc.y1 - L.esc.y0) * 0.55 };
            var piso = L.esc.y1 + 26 + H * 0.06;
            L.aro = { x: (L.esc.x0 + L.esc.x1) / 2, y: piso + (H - piso) * 0.25, r: Math.max(26, L.tam * 0.3) };
            L.tiroMax = Math.max(60, Math.min(150, H - L.aro.y - 18));     // cuánto se puede tirar hacia atrás sin salir de la pantalla
            return L;
        },

        armar: function () {
            var self = this;
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            // Capas: cielo de atardecer → noria y globos (vivos) → el puesto.
            K.textura(this, 'feria_cielo', L.W, L.H, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#5f3dc4'); g.addColorStop(0.5, '#e64980'); g.addColorStop(1, '#ffa94d');
                x.fillStyle = g; x.fillRect(0, 0, w, h);
            });
            keep(this.add.image(0, 0, 'feria_cielo').setOrigin(0, 0).setDepth(0));
            var V = this.montarVida(keep);
            if (V) {
                // Detrás del puesto, a la derecha: asoma la mitad de arriba por encima del toldo.
                var techo = L.esc.y0 - 40;
                var nr = Math.max(60, Math.min(120, techo * 0.95));
                V.noria(L.W * 0.78, techo + nr * 0.15, nr);
                V.globos({ x: L.W * 0.05, y: 0, w: L.W * 0.9, h: L.esc.y0 - 40, n: 4, depth: 0.6 });
            }
            K.textura(this, 'feria_fondo', L.W, L.H, function (x, w, h) { self.pintarFeria(x, w, h); });
            keep(this.add.image(0, 0, 'feria_fondo').setOrigin(0, 0).setDepth(1));
            this.telonG = keep(this.add.graphics().setDepth(40));
            this.cuerdaG = keep(this.add.graphics().setDepth(41));
            this.aroG = keep(this.add.graphics().setDepth(60));
            this.focos = [];
            for (var i = 0; i < 9; i++) this.focos.push({ x: L.esc.x0 + (L.esc.x1 - L.esc.x0) * i / 8, y: L.esc.y0 - 22 });
            this.focosG = keep(this.add.graphics().setDepth(42));
            this.montarHud(keep);
            this.ubicarPostes();
        },

        pintarFeria: function (x, w, h) {
            var L = this.L, e = L.esc;
            // El cielo y la noria van en capas aparte (detrás), para que la noria gire.
            // Toldo a rayas del puesto.
            var tw2 = e.x1 - e.x0 + 40, th = 40;
            for (var s = 0; s < 12; s++) {
                x.fillStyle = s % 2 ? '#ffffff' : '#e03131';
                x.beginPath();
                x.moveTo(e.x0 - 20 + tw2 * s / 12, e.y0 - 40);
                x.lineTo(e.x0 - 20 + tw2 * (s + 1) / 12, e.y0 - 40);
                x.lineTo(e.x0 - 20 + tw2 * (s + 1) / 12, e.y0 - 40 + th);
                x.arc(e.x0 - 20 + tw2 * (s + 0.5) / 12, e.y0 - 40 + th, tw2 / 24, 0, Math.PI);
                x.closePath(); x.fill();
            }
            // Fondo del escenario (madera oscura) y piso del puesto.
            x.fillStyle = '#3b2a1a'; x.fillRect(e.x0, e.y0, e.x1 - e.x0, e.y1 - e.y0);
            for (var p = e.x0; p < e.x1; p += 40) { x.fillStyle = 'rgba(255,255,255,0.04)'; x.fillRect(p, e.y0, 20, e.y1 - e.y0); }
            K.madera(x, e.x0 - 20, e.y1, e.x1 - e.x0 + 40, 26, { r: 4 });
            // Postes del costado.
            K.madera(x, e.x0 - 24, e.y0 - 40, 18, e.y1 - e.y0 + 66, { vertical: true, r: 4 });
            K.madera(x, e.x1 + 6, e.y0 - 40, 18, e.y1 - e.y0 + 66, { vertical: true, r: 4 });
            // Mostrador delante (desde donde se lanzan los aros).
            var my = e.y1 + 26;
            x.fillStyle = '#c92a2a'; x.fillRect(e.x0 - 20, my, e.x1 - e.x0 + 40, h * 0.06);
            x.fillStyle = '#ffd43b';
            for (var b = e.x0; b < e.x1 + 20; b += 36) { x.beginPath(); x.arc(b, my + h * 0.03, 6, 0, Math.PI * 2); x.fill(); }
            // Pasto de la feria.
            x.fillStyle = '#2b8a3e'; x.fillRect(0, my + h * 0.06, w, h);
            K.grano(x, 0, my + h * 0.06, w, h, Math.round(w * h / 700), ['#37b24d', '#1e6b30'], 1.4, 0.4);
            // Canasta de aros.
            var c = L.aro;
            x.fillStyle = '#a5672b'; K.rr(x, c.x - c.r * 2.4, c.y + c.r * 0.2, c.r * 1.4, c.r * 1.2, 8); x.fill();
            ['#4dabf7', '#ffd43b', '#69db7c'].forEach(function (col, i) {
                x.strokeStyle = col; x.lineWidth = 6;
                x.beginPath(); x.ellipse(c.x - c.r * 1.7, c.y + c.r * 0.1 - i * 5, c.r * 0.55, c.r * 0.2, 0, 0, Math.PI * 2); x.stroke();
            });
        },

        /* ── Telón y cuerda ── */

        dibujarTelon: function (t) {
            var L = this.L, e = L.esc;
            var g = this.telonG;
            g.clear();
            var mitad = (e.x1 - e.x0) / 2;
            var ancho = mitad * (1 - this.abierto * 0.88);
            [[e.x0, 1], [e.x1, -1]].forEach(function (q) {
                var x0 = q[0], dir = q[1];
                var pliegues = 6;
                for (var k = 0; k < pliegues; k++) {
                    var a = x0 + dir * ancho * k / pliegues, b = x0 + dir * ancho * (k + 1) / pliegues;
                    g.fillStyle(k % 2 ? 0xb3001b : 0xd6002a, 1);
                    g.fillRect(Math.min(a, b), e.y0, Math.abs(b - a) + 1, e.y1 - e.y0);
                }
                g.fillStyle(0x000000, 0.18);
                g.fillRect(dir > 0 ? x0 + ancho - 6 : x0 - ancho, e.y0, 6, e.y1 - e.y0);
            });
            // Bambalina arriba.
            g.fillStyle(0x8f0016, 1); g.fillRect(e.x0, e.y0, e.x1 - e.x0, 18);
            g.fillStyle(0xffd43b, 1); for (var x = e.x0; x < e.x1; x += 22) g.fillCircle(x + 11, e.y0 + 18, 4);
            // Cuerda con borla.
            var c = this.cuerdaG;
            c.clear();
            var tir = this.tiro || 0;
            c.lineStyle(5, 0xf4d03f, 1);
            c.beginPath(); c.moveTo(L.cuerda.x, L.cuerda.y0); c.lineTo(L.cuerda.x, L.cuerda.y1 + tir); c.strokePath();
            c.fillStyle(0xf59f00, 1); c.fillCircle(L.cuerda.x, L.cuerda.y1 + tir, 13);
            c.fillStyle(0xffd43b, 1); c.fillTriangle(L.cuerda.x - 11, L.cuerda.y1 + tir + 6, L.cuerda.x + 11, L.cuerda.y1 + tir + 6, L.cuerda.x, L.cuerda.y1 + tir + 30);
            if (this.abierto < 0.5 && this.fase === 'jugar' && !this.sonando) {
                c.lineStyle(3, 0xffffff, 0.5 + Math.sin(t / 220) * 0.4);
                c.strokeCircle(L.cuerda.x, L.cuerda.y1 + tir, 22);
            }
            // Focos del puesto que titilan.
            var f = this.focosG;
            f.clear();
            this.focos.forEach(function (q, i) {
                var on = Math.sin(t / 200 + i * 1.3) > -0.3;
                f.fillStyle(on ? 0xfff3bf : 0x8a6d00, 1);
                f.fillCircle(q.x, q.y, 6);
                if (on) { f.fillStyle(0xfff3bf, 0.25); f.fillCircle(q.x, q.y, 12); }
            });
        },

        abrirTelon: async function () {
            if (this.abierto >= 1 || this.abriendo) return;
            this.abriendo = true;
            K.ruido({ f: 900, q: 0.5, dur: 0.7, vol: 0.08 });
            this.postes.forEach(function (p) { p.actor.cont.setVisible(true); });
            await tw(this, { targets: this, abierto: 1, duration: 700, ease: 'Sine.easeInOut' });
            this.abriendo = false;
        },

        cerrarTelon: async function () {
            K.ruido({ f: 700, q: 0.5, dur: 0.6, vol: 0.07 });
            await tw(this, { targets: this, abierto: 0, duration: 600, ease: 'Sine.easeInOut' });
            this.postes.forEach(function (p) { p.actor.cont.setVisible(false); });
        },

        /* ── Postes con objetos ── */

        poner: function (ids) {
            var self = this;
            this.postes.forEach(function (p) { p.actor.destruir(); });
            this.postes = [];
            this.vivos = this.coleccion.slice();
            ids.forEach(function (id, i) {
                var a = Act.crear(self, id, 0, 0, self.L.tam, { variante: id === 'telefono' && self.reto.sonido === 'vibracion' ? 'movil' : null });
                if (a.animarIdle) a.animarIdle(false);
                a.sonido = self.sonidoDe(id);
                a.cont.setDepth(20).setVisible(self.abierto > 0.5);
                self.postes.push({ id: id, actor: a, i: i, hecho: false });
                self.vivos.push(a);
            });
            this.ubicarPostes();
        },

        ubicarPostes: function () {
            var L = this.L, e = L.esc;
            var n = this.postes.length;
            var self = this;
            this.postes.forEach(function (p, i) {
                var u = (i + 0.5) / n;
                if (self.nv && self.nv.carrusel) u = ((u + self.giro) % 1 + 1) % 1;
                var x = e.x0 + 30 + (e.x1 - e.x0 - 60) * u;
                // Carrusel: los de atrás un poco más arriba y más chicos.
                var prof = self.nv && self.nv.carrusel ? Math.sin(u * Math.PI * 2) * 0.12 : 0;
                p.actor.cont.setPosition(x, e.y1 - L.tam * 0.55 - prof * L.tam).setScale((1 - prof) * L.tam / p.actor.tam);
                p.cuello = { x: x, y: e.y1 - L.tam * 0.2 };
            });
        },

        disponibles: function () { return this.postes.filter(function (p) { return !p.hecho; }).map(function (p) { return p.id; }); },

        /* ── Entrada: cuerda y honda ── */

        alTocar: function (p) {
            if (this.fase !== 'jugar') return;
            var L = this.L;
            if (this.abierto < 0.5) {
                if (Math.abs(p.x - L.cuerda.x) < 40 && p.y > L.cuerda.y0 && p.y < L.cuerda.y1 + 60) {
                    if (this.sonando) return;           // primero se escucha completo
                    this.tirandoCuerda = { y: p.y, t: this.time.now };
                }
                return;
            }
            if (this.vuela) return;
            if (Math.hypot(p.x - L.aro.x, p.y - L.aro.y) < L.aro.r * 2.2) {
                this.honda = { x: p.x, y: p.y, dx: 0, dy: 0 };
                this.pista.reiniciar();
                K.tono({ f: 600, dur: 0.05, vol: 0.05 });
            }
        },

        alMover: function (p) {
            if (this.tirandoCuerda) {
                this.tiro = Math.max(0, Math.min(60, p.y - this.tirandoCuerda.y));
                if (this.tiro > 40) { this.tirandoCuerda = null; this.tiro = 0; this.abrirTelon(); }
                return;
            }
            var h = this.honda;
            var L = this.L;
            if (!h) return;
            h.dx = Math.max(-140, Math.min(140, p.x - h.x));
            h.dy = Math.max(0, Math.min(L.tiroMax, p.y - h.y));
        },

        alSoltar: function () {
            if (this.tirandoCuerda) {
                var t = this.tirandoCuerda;
                this.tirandoCuerda = null;
                this.tiro = 0;
                if (this.time.now - t.t < 450) this.abrirTelon();
                return;
            }
            var h = this.honda;
            this.honda = null;
            if (!h || h.dy < Math.min(25, this.L.tiroMax * 0.3) || this.fase !== 'jugar') return;
            this.lanzar(h.dx, h.dy);
        },

        /** Destino del aro según el tirón (opuesto a la dirección en que se tiró). */
        destino: function (dx, dy) {
            var L = this.L, e = L.esc;
            var x = L.aro.x - dx * ((e.x1 - e.x0) / 2 / 120);
            var y = L.aro.y - dy * ((L.aro.y - (e.y1 - L.tam * 0.2)) / (L.tiroMax * 0.75));
            return { x: x, y: y };
        },

        lanzar: async function (dx, dy) {
            var self = this;
            var L = this.L;
            var d = this.destino(dx, dy);
            // Ayuda: el aro "busca" el poste más cercano al destino si cae cerca.
            var mejor = null, dmin = L.tam * 0.75;
            this.postes.forEach(function (p) {
                var q = Math.hypot(p.cuello.x - d.x, (p.cuello.y - d.y) * 0.6);
                if (q < dmin) { dmin = q; mejor = p; }
            });
            if (mejor) d = { x: mejor.cuello.x, y: mejor.cuello.y };
            this.vuela = { x: L.aro.x, y: L.aro.y, esc: 1, ang: 0 };
            K.ruido({ f: 1200, q: 0.6, dur: 0.3, vol: 0.06 });
            var x0 = L.aro.x, y0 = L.aro.y, cima = Math.min(y0, d.y) - L.tam * 1.2;
            var o = { t: 0 };
            await tw(this, {
                targets: o, t: 1, duration: 650, ease: 'Sine.easeIn',
                onUpdate: function () {
                    var t = o.t;
                    self.vuela.x = x0 + (d.x - x0) * t;
                    self.vuela.y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cima + t * t * d.y;
                    self.vuela.esc = 1 - t * 0.35;
                    self.vuela.ang = t * 12;
                }
            });
            if (mejor && !mejor.hecho) await this.embocar(mejor);
            else await this.caeAlPiso();
            this.vuela = null;
        },

        caeAlPiso: async function () {
            var v = this.vuela;
            K.ruido({ f: 300, q: 1, dur: 0.15, vol: 0.1 });
            await tw(this, { targets: v, y: this.L.esc.y1 + 10, esc: 0.5, duration: 300, ease: 'Bounce.easeOut' });
            await esperar(this, 250);
        },

        embocar: async function (p) {
            var self = this;
            var a = p.actor;
            var v = this.vuela;
            // El aro baja por el objeto girando y queda en el poste.
            K.tono({ f: 1300, dur: 0.12, vol: 0.06 });
            await tw(this, { targets: v, y: p.cuello.y + 8, ang: 0, duration: 220, ease: 'Bounce.easeOut' });
            if (p.id === this.objetivo) {
                p.hecho = true;
                p.aro = { x: v.x, y: v.y };
                this.vuela = null;
                this.fase = 'premio';
                await this.celebrar(a);
                if (this.ctx.celebrar) { this.ctx.celebrar(true); this.time.delayedCall(2200, function () { self.ctx.celebrar(false); }); }
                Ut.confeti(this, 60);
                this.coleccion.push(a);
                // Nivel 4: el telón se cierra y hay que recordar un sonido nuevo.
                if (this.nv.cambia && this.cuenta < this.nv.meta) await this.cerrarTelon();
                await this.seguir();
            } else {
                // Rebota: salta del poste y cae.
                await tw(this, { targets: v, y: v.y - 50, x: v.x + rnd(-40, 40), duration: 220, ease: 'Quad.easeOut' });
                this.caeAlPiso();
                await this.fallar(a);
            }
        },

        dibujarAros: function () {
            var g = this.aroG;
            g.clear();
            var L = this.L;
            var r = L.aro.r;
            var dibujar = function (x, y, esc, col, alfa) {
                g.lineStyle(9 * esc, 0x000000, 0.2 * alfa); g.strokeEllipse(x + 3, y + 4, r * 2 * esc, r * 0.75 * esc);
                g.lineStyle(9 * esc, col, alfa); g.strokeEllipse(x, y, r * 2 * esc, r * 0.75 * esc);
                g.lineStyle(3 * esc, 0xffffff, 0.5 * alfa); g.strokeEllipse(x, y - 2, r * 1.8 * esc, r * 0.6 * esc);
            };
            // Aros embocados en sus postes.
            this.postes.forEach(function (p) { if (p.aro) dibujar(p.aro.x, p.aro.y, 0.7, 0xffd43b, 1); });
            if (this.abierto < 0.5) return;
            // Aro en vuelo o listo en la mano (con la banda de la honda).
            if (this.vuela) { dibujar(this.vuela.x, this.vuela.y, this.vuela.esc, 0x4dabf7, 1); return; }
            var h = this.honda;
            var x = L.aro.x + (h ? h.dx : 0), y = L.aro.y + (h ? h.dy : 0);
            if (h) {
                g.lineStyle(4, 0x868e96, 1);
                g.beginPath(); g.moveTo(L.aro.x - r * 1.4, L.aro.y - 10); g.lineTo(x, y); g.lineTo(L.aro.x + r * 1.4, L.aro.y - 10); g.strokePath();
                // Línea punteada hacia donde va a caer.
                var d = this.destino(h.dx, h.dy);
                g.fillStyle(0xffffff, 0.7);
                for (var k = 1; k < 10; k++) { var t = k / 10; g.fillCircle(x + (d.x - x) * t, y + (d.y - y) * t - Math.sin(t * Math.PI) * 60, 3); }
            }
            dibujar(x, y, 1, 0x4dabf7, 1);
        },

        /* ── Memoria: el sonido suena con el telón cerrado ── */

        anunciar: async function () {
            if (this.abierto > 0.5 && this.fase === 'jugar') return this.escuchar(this.sonidoDe(this.objetivo));
            await this.escuchar(this.sonidoDe(this.objetivo));
            // Espera ~2 s antes de dejar abrir (memoria, según el documento).
            await esperar(this, 1600);
            this.puedeAbrir = true;
            if (this.abierto < 0.5) this.invitarCuerda();
        },

        invitarCuerda: function () {
            var L = this.L;
            this.brillo(L.cuerda.x, L.cuerda.y1, 6);
        },

        /* ── Niveles ── */

        planNiveles: function () {
            var plan = this.planBase({ extra: EXTRA, n: [5, 5, 5, 5] });
            plan[2].carrusel = true;
            plan[3].carrusel = false;
            return plan;
        },

        prepararNivel: async function (i, nv) {
            if (this.abierto > 0.01) await this.cerrarTelon();
            this.giro = 0;
            this.poner(nv.ids);
        },

        alSeguir: async function () {
            // En el nivel 4 el sonido nuevo suena con el telón cerrado.
        },

        paso: function (time, delta) {
            this.dibujarTelon(time);
            if (this.nv && this.nv.carrusel && this.abierto > 0.5) {
                this.giro += delta / 16000;
                this.ubicarPostes();
                var self = this;
                this.postes.forEach(function (p) { if (p.aro) { p.aro.x = p.cuello.x; p.aro.y = p.cuello.y + 8; } });
            }
            this.dibujarAros();
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            var L = this.L;
            var no = function () { return cancelada() || self.fase !== 'jugar'; };
            if (this.abierto < 0.5) return this.ctx.mano({ punto: { x: L.cuerda.x, y: L.cuerda.y1 }, holdMs: 200, arrastre: { dx: 0, dy: 50, durMs: 400 }, cancelado: no });
            var p = this.postes.filter(function (q) { return q.id === self.objetivo && !q.hecho; })[0];
            if (!p) return Promise.resolve();
            if (this.ayuda) this.brillo(p.actor.cont.x, p.actor.cont.y, 6);
            // Tirón hacia el lado contrario del objetivo.
            var dx = -(p.cuello.x - L.aro.x) / ((L.esc.x1 - L.esc.x0) / 2 / 120);
            return this.ctx.mano({ punto: { x: L.aro.x, y: L.aro.y }, holdMs: 200, arrastre: { dx: Math.max(-140, Math.min(140, dx)), dy: L.tiroMax * 0.75, durMs: 700 }, cancelado: no });
        },

        estadoExtra: function () {
            return { abierto: +this.abierto.toFixed(2), postes: this.postes.map(function (p) { return { id: p.id, x: Math.round(p.cuello.x), hecho: p.hecho }; }) };
        },

        zonaFiesta: function () { var L = this.L; return { x: L.esc.x0, y: L.esc.y1 - L.tam * 0.55, w: L.esc.x1 - L.esc.x0 }; },

        antesDeFiesta: async function () {
            var vistos = {};
            this.coleccion = this.coleccion.filter(function (a) { if (!a.cont.active || vistos[a.id]) return false; vistos[a.id] = 1; return true; });
            await this.abrirTelon();
            this.postes.forEach(function (p) { if (!p.hecho) p.actor.cont.setAlpha(0.35); p.aro = null; });
            if (this.ctx.celebrar) this.ctx.celebrar(true);
        },

        demo: async function () {
            var self = this;
            var ctx = this.ctx;
            var t = ctx.textos || {};
            var d = this.config.demo || { sonido: 'mugido', correcto: 'vaca', opciones: ['gallo', 'vaca'] };
            var L = this.L;
            this.fase = 'demo';
            var limpiar = async function () {
                ctx.quitarMano();
                self.vuela = null;
                if (self.abierto > 0) await self.cerrarTelon();
                self.postes.forEach(function (p) { p.actor.destruir(); });
                self.postes = [];
                self.vivos = [];
            };
            await ctx.decir({ voz: 'zeus', texto: t.demostracion || '¡Mira cómo se juega!' }, { minMs: 1600 });
            if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
            this.nv = null;
            this.poner(d.opciones);
            this.postes.forEach(function (p) { p.actor.sonido = p.id === d.correcto ? d.sonido : Act.sonidoDe(p.id); });
            var b = L.bocina;
            var sonando = Promise.resolve();
            await ctx.mano({ punto: { x: b.x, y: b.y }, holdMs: 500, onPresionar: function () { sonando = self.escuchar(d.sonido); } });
            await sonando;
            await esperar(this, 800);
            if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
            await ctx.mano({ punto: { x: L.cuerda.x, y: L.cuerda.y1 }, holdMs: 150, arrastre: { dx: 0, dy: 50, durMs: 400 }, onDuranteArrastre: function () { self.abrirTelon(); } });
            await esperar(this, 500);
            var vaca = this.postes.filter(function (p) { return p.id === d.correcto; })[0];
            var dx = -(vaca.cuello.x - L.aro.x) / ((L.esc.x1 - L.esc.x0) / 2 / 120);
            dx = Math.max(-140, Math.min(140, dx));
            await ctx.mano({
                punto: { x: L.aro.x, y: L.aro.y }, holdMs: 150, arrastre: { dx: dx, dy: L.tiroMax * 0.75, durMs: 700 },
                onDuranteArrastre: function () { var o = { k: 0 }; self.honda = { x: L.aro.x, y: L.aro.y, dx: 0, dy: 0 }; self.tweens.add({ targets: o, k: 1, duration: 700, onUpdate: function () { if (self.honda) { self.honda.dx = dx * o.k; self.honda.dy = L.tiroMax * 0.75 * o.k; } } }); },
                onVolver: function () { self.honda = null; }
            });
            if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
            this.honda = null;
            // Vuelo hasta la vaca.
            this.vuela = { x: L.aro.x, y: L.aro.y, esc: 1, ang: 0 };
            var o = { t: 0 }, x0 = L.aro.x, y0 = L.aro.y, cima = Math.min(y0, vaca.cuello.y) - L.tam * 1.2;
            await tw(this, { targets: o, t: 1, duration: 650, onUpdate: function () { var k = o.t; self.vuela.x = x0 + (vaca.cuello.x - x0) * k; self.vuela.y = (1 - k) * (1 - k) * y0 + 2 * (1 - k) * k * cima + k * k * vaca.cuello.y; self.vuela.esc = 1 - k * 0.35; } });
            vaca.aro = { x: vaca.cuello.x, y: vaca.cuello.y + 8 };
            this.vuela = null;
            K.efecto(this, 'recompensa');
            Ut.estallido(this, vaca.actor.cont.x, vaca.actor.cont.y - L.tam * 0.2, { n: 14, tex: 'estrella', tam: 28, dist: 150, sinTinte: true, depth: 85 });
            await Promise.all([this.escuchar(d.sonido, { breve: true, bocina: false }), vaca.actor.acierto(1500)]);
            await ctx.decir({ voz: 'zoe', texto: t.demostracionAcierto || '¡Así se hace!' }, { estado: 'acierto', minMs: 1300 });
            await ctx.decir({ voz: 'zeus', texto: t.demostracionFin || '¡Ahora te toca a ti!' }, { minMs: 1000 });
            await limpiar();
        }
    };

    K.crear({ id: 'feria', fondo: '#5f3dc4', escena: escena });
})(typeof window !== 'undefined' ? window : this);
