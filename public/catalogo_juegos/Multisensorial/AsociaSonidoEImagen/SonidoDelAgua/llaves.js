/**
 * «Las llaves del agua» — motor propio de Sonido del agua (5-6 años).
 *
 * Una pared de la casa abierta como un plano: cocina, baño, lavadero y jardín, cada uno con su
 * aparato de agua (llave del lavaplatos, ducha, lavadora, fuente, regadera) y su VÁLVULA en la
 * cañería. Suena el agua de uno. Todos los sonidos de agua se parecen, así que el niño GIRA LA
 * VÁLVULA (movimiento circular con el dedo; un toque también la gira) para abrir el agua y oír
 * cómo suena cada uno. Si abre el que sonó, el agua corre completa con su acción y se llena el
 * tanque de la casa. Si no, ese aparato suena un momento y la válvula se cierra sola.
 *
 * Niveles: 1 el reto · 2 otro sonido · 3 válvulas duras (hay que dar una vuelta entera) y el
 * sonido no se repite solo · 4 cada acierto trae un sonido nuevo.
 */
(function (global) {
    'use strict';

    var K = global.AsociaKit;
    var Ut = global.PedniaParejaBase.util;
    var Act = global.AsociaActores;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var rnd = Ut.rnd;
    var CUARTO = {
        pluma: { piso: '#f1f3f5', pared: '#fff4e6', az: '#ffd8a8' },
        ducha: { piso: '#e7f5ff', pared: '#e3fafc', az: '#99e9f2' },
        lavadora: { piso: '#f8f0fc', pared: '#f3f0ff', az: '#d0bfff' },
        fuente: { piso: '#d3f9d8', pared: '#a5d8ff', az: null },
        regadera: { piso: '#d3f9d8', pared: '#a5d8ff', az: null }
    };

    var escena = {
        iniciar: function () { this.cosas = []; this.tanque = 0; },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.bocina = { x: W / 2, y: Math.max(60, Math.min(96, 54 + hueco * 0.2)), r: Math.max(28, Math.min(38, hueco * 0.3)) };
            L.pres = W >= 820 ? { x: W - 64, piso: H - 104, alto: Math.min(150, H * 0.26), modelo: 'nino' } : null;
            var der = L.pres ? W - 130 : W - 12;
            L.tubo = L.bocina.y + L.bocina.r + Math.max(24, H * 0.05);   // cañería principal
            L.cuartos = { x0: 12, x1: der, y0: L.tubo + 14, y1: H - 14 };
            var n = 5;
            L.ancho = (L.cuartos.x1 - L.cuartos.x0) / n;
            L.tam = Math.max(70, Math.min(140, L.ancho * 0.78, (L.cuartos.y1 - L.cuartos.y0) * 0.4));
            L.valvula = Math.max(26, Math.min(40, L.ancho * 0.2));
            L.tanque = { x: 12 + 40, y: L.tubo - 4 };
            return L;
        },

        armar: function () {
            var self = this;
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            K.textura(this, 'agua_fondo', L.W, L.H, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#dee2e6'); g.addColorStop(1, '#ced4da');
                x.fillStyle = g; x.fillRect(0, 0, w, h);
                K.grano(x, 0, 0, w, h, Math.round(w * h / 500), ['#adb5bd', '#f8f9fa'], 1.2, 0.3);
            });
            keep(this.add.image(0, 0, 'agua_fondo').setOrigin(0, 0).setDepth(0));
            this.cuartosG = keep(this.add.image(0, 0, 'agua_fondo').setOrigin(0, 0).setDepth(1).setVisible(false));
            this.tuberiaG = keep(this.add.graphics().setDepth(12));
            this.tanqueG = keep(this.add.graphics().setDepth(13));
            var V = this.montarVida(keep);
            if (V) for (var gi = 0; gi < 5; gi++) V.gotas(L.cuartos.x0 + L.ancho * (gi + 0.5) + 8, L.cuartos.y0 + L.valvula * 2.7);
            this.montarHud(keep);
            this.valvulas = [];
            if (this.cosas.length) this.pintarCuartos(keep);
        },

        /** Cada cosa en su cuarto: azulejos, pasto, cielo. Se repinta al cambiar el nivel. */
        pintarCuartos: function (keep) {
            var self = this;
            var L = this.L;
            keep = keep || function (o) { (self.estaticos || []).push(o); return o; };
            if (this.cuartosImg) this.cuartosImg.destroy();
            var ids = this.cosas.map(function (c) { return c.id; });
            K.textura(this, 'agua_cuartos', L.W, L.H, function (x, w, h) {
                ids.forEach(function (id, i) {
                    var c = CUARTO[id] || CUARTO.pluma;
                    var x0 = L.cuartos.x0 + i * L.ancho, y0 = L.cuartos.y0, y1 = L.cuartos.y1;
                    var piso = y0 + (y1 - y0) * 0.72;
                    x.save();
                    x.beginPath(); x.rect(x0, y0, L.ancho, y1 - y0); x.clip();
                    x.fillStyle = c.pared; x.fillRect(x0, y0, L.ancho, piso - y0);
                    if (c.az) {
                        var az = 22;
                        for (var yy = piso - (y1 - y0) * 0.35; yy < piso; yy += az) for (var xx = x0; xx < x0 + L.ancho; xx += az) {
                            x.fillStyle = c.az; x.globalAlpha = 0.55; x.fillRect(xx + 1, yy + 1, az - 2, az - 2); x.globalAlpha = 1;
                        }
                    } else {
                        // Jardín: nubes y arbusto.
                        x.fillStyle = 'rgba(255,255,255,0.8)';
                        x.beginPath(); x.arc(x0 + L.ancho * 0.3, y0 + 40, 16, 0, Math.PI * 2); x.arc(x0 + L.ancho * 0.42, y0 + 34, 20, 0, Math.PI * 2); x.fill();
                        x.fillStyle = '#51cf66'; x.beginPath(); x.arc(x0 + L.ancho * 0.85, piso, 26, Math.PI, 0); x.fill();
                    }
                    x.fillStyle = c.piso; x.fillRect(x0, piso, L.ancho, y1 - piso);
                    K.grano(x, x0, piso, L.ancho, y1 - piso, 120, ['#adb5bd', '#ffffff'], 1, 0.3);
                    x.restore();
                    // Paredes divisorias.
                    x.fillStyle = '#868e96'; x.fillRect(x0 - 3, y0, 6, y1 - y0);
                });
                x.fillStyle = '#868e96'; x.fillRect(L.cuartos.x0 + ids.length * L.ancho - 3, L.cuartos.y0, 6, L.cuartos.y1 - L.cuartos.y0);
                x.strokeStyle = '#495057'; x.lineWidth = 4;
                x.strokeRect(L.cuartos.x0, L.cuartos.y0, ids.length * L.ancho, L.cuartos.y1 - L.cuartos.y0);
            });
            this.cuartosImg = keep(this.add.image(0, 0, 'agua_cuartos').setOrigin(0, 0).setDepth(2));
            // Válvulas.
            (this.valvulas || []).forEach(function (v) { v.destroy(); });
            this.valvulas = [];
            this.cosas.forEach(function (c, i) {
                var x0 = L.cuartos.x0 + i * L.ancho;
                c.vx = x0 + L.ancho * 0.5;
                c.vy = L.cuartos.y0 + L.valvula * 1.6;
                var v = keep(self.crearValvula(c.vx, c.vy));
                c.valv = v;
                self.valvulas.push(v);
                var piso = L.cuartos.y0 + (L.cuartos.y1 - L.cuartos.y0) * 0.72;
                c.actor.cont.setPosition(c.vx, piso - L.tam * 0.36).setScale(L.tam / c.actor.tam);
            });
        },

        crearValvula: function (x, y) {
            var r = this.L.valvula;
            var c = this.add.container(x, y).setDepth(30);
            var rueda = this.add.container(0, 0);
            var aro = this.add.circle(0, 0, r, 0x000000, 0).setStrokeStyle(r * 0.28, 0xe03131);
            rueda.add(aro);
            for (var k = 0; k < 4; k++) {
                var rayo = this.add.rectangle(0, 0, r * 1.9, r * 0.2, 0xc92a2a);
                rayo.angle = k * 45;
                rueda.add(rayo);
            }
            rueda.add(this.add.circle(0, 0, r * 0.28, 0xadb5bd).setStrokeStyle(2, 0x868e96));
            rueda.add(this.add.circle(-r * 0.4, -r * 0.6, r * 0.12, 0xffffff, 0.6));
            var flecha = this.add.graphics();
            flecha.lineStyle(3, 0xffffff, 0.7);
            flecha.beginPath(); flecha.arc(0, 0, r * 1.35, -2.4, -0.7); flecha.strokePath();
            flecha.fillStyle(0xffffff, 0.7); flecha.fillTriangle(r * 1.35 * Math.cos(-0.7) - 6, r * 1.35 * Math.sin(-0.7) - 2, r * 1.35 * Math.cos(-0.7) + 6, r * 1.35 * Math.sin(-0.7) + 2, r * 1.35 * Math.cos(-0.5), r * 1.35 * Math.sin(-0.5) + 8);
            c.add([flecha, rueda]);
            c.rueda = rueda;
            c.flecha = flecha;
            return c;
        },

        dibujarTuberia: function (t) {
            var g = this.tuberiaG;
            g.clear();
            var L = this.L;
            var x1 = L.cuartos.x0 + this.cosas.length * L.ancho;
            // Cañería principal y bajadas a cada válvula y aparato.
            g.lineStyle(12, 0x868e96, 1); g.beginPath(); g.moveTo(L.tanque.x, L.tubo); g.lineTo(x1, L.tubo); g.strokePath();
            g.lineStyle(4, 0xdee2e6, 0.8); g.beginPath(); g.moveTo(L.tanque.x, L.tubo - 3); g.lineTo(x1, L.tubo - 3); g.strokePath();
            var self = this;
            this.cosas.forEach(function (c) {
                if (c.vx == null) return;
                var a = c.actor.cont;
                g.lineStyle(8, 0x868e96, 1);
                g.beginPath(); g.moveTo(c.vx, L.tubo); g.lineTo(c.vx, c.vy); g.lineTo(c.vx, a.y - L.tam * 0.45); g.strokePath();
                // Agua que corre por el tubo cuando la válvula está abierta.
                if (c.abierto > 0.05) {
                    g.fillStyle(0x4dabf7, 0.9);
                    for (var y = L.tubo + ((t / 6) % 14); y < a.y - L.tam * 0.45; y += 14) g.fillCircle(c.vx, y, 2.5);
                }
            });
            // Tanque de la casa (se llena con cada acierto).
            var tg = this.tanqueG;
            tg.clear();
            // Tinaco sobre la cañería: cuerpo, tapa, aros, mirilla con el nivel y una gota pintada.
            var tx = L.tanque.x, ty = L.tanque.y, tw2 = 50, th = 58;
            var x0 = tx - tw2 / 2, y0 = ty - th;
            tg.fillStyle(0x000000, 0.15); tg.fillEllipse(tx + 3, ty + 2, tw2 + 6, 10);
            tg.fillStyle(0x1c7ed6, 1); tg.fillRoundedRect(x0, y0, tw2, th, 10);
            tg.fillStyle(0x4dabf7, 1); tg.fillRoundedRect(x0 + 4, y0 + 2, tw2 * 0.35, th - 4, 8);
            tg.lineStyle(3, 0x1864ab, 1);
            [0.3, 0.7].forEach(function (k) { tg.lineBetween(x0 + 2, y0 + th * k, x0 + tw2 - 2, y0 + th * k); });
            tg.fillStyle(0x1864ab, 1); tg.fillEllipse(tx, y0 + 1, tw2 * 0.9, 12);
            tg.fillStyle(0x339af0, 1); tg.fillEllipse(tx, y0 - 2, tw2 * 0.55, 8);
            // Mirilla: se llena con cada acierto.
            var mw = 12, mx = x0 + tw2 - mw - 6, my0 = y0 + 8, mh = th - 16;
            tg.fillStyle(0xe7f5ff, 1); tg.fillRoundedRect(mx, my0, mw, mh, 5);
            if (this.tanque > 0.01) { tg.fillStyle(0x74c0fc, 1); tg.fillRoundedRect(mx + 2, my0 + mh - 2 - (mh - 4) * this.tanque, mw - 4, (mh - 4) * this.tanque, 3); }
            tg.lineStyle(2, 0x1864ab, 1); tg.strokeRoundedRect(mx, my0, mw, mh, 5);
            // Gota blanca en el cuerpo.
            var gx = x0 + tw2 * 0.36, gy = y0 + th * 0.52;
            tg.fillStyle(0xffffff, 0.95);
            tg.fillCircle(gx, gy + 3, 6);
            tg.fillTriangle(gx - 5.5, gy + 1, gx + 5.5, gy + 1, gx, gy - 9);
        },

        /* ── Cosas de agua ── */

        poner: function (ids) {
            var self = this;
            this.cosas.forEach(function (c) { c.actor.destruir(); });
            this.cosas = [];
            this.vivos = [];
            ids.forEach(function (id) {
                var a = Act.crear(self, id, 0, 0, self.L.tam);
                if (a.animarIdle) a.animarIdle(false);
                a.sonido = self.sonidoDe(id);
                a.cont.setDepth(20);
                self.cosas.push({ id: id, actor: a, abierto: 0, giro: 0, estado: 'cerrado' });
                self.vivos.push(a);
            });
            this.pintarCuartos();
        },

        disponibles: function () { return this.cosas.filter(function (c) { return c.estado === 'cerrado'; }).map(function (c) { return c.id; }); },

        /* ── Entrada: girar la válvula ── */

        valvulaEn: function (x, y) {
            var r = this.L.valvula * 1.6;
            return this.cosas.filter(function (c) { return c.estado === 'cerrado' && Math.hypot(x - c.vx, y - c.vy) < r; })[0] || null;
        },

        alTocar: function (p) {
            if (this.fase !== 'jugar') return;
            var c = this.valvulaEn(p.x, p.y);
            if (!c) return;
            this.girando = { c: c, ang: Math.atan2(p.y - c.vy, p.x - c.vx), t: this.time.now, mov: 0 };
            this.pista.reiniciar();
        },

        alMover: function (p) {
            var g = this.girando;
            if (!g) return;
            var c = g.c;
            var ang = Math.atan2(p.y - c.vy, p.x - c.vx);
            var d = ang - g.ang;
            if (d > Math.PI) d -= Math.PI * 2;
            if (d < -Math.PI) d += Math.PI * 2;
            g.ang = ang;
            g.mov += Math.abs(d);
            this.girar(c, Math.abs(d));
        },

        alSoltar: function () {
            var g = this.girando;
            this.girando = null;
            if (!g) return;
            // Un toque también gira la válvula (un poco cada vez).
            if (g.mov < 0.2 && this.time.now - g.t < 450) {
                var c = g.c, self = this;
                var o = { k: 0 };
                var paso = this.vueltaNecesaria() * 0.55;
                var prev = 0;
                this.tweens.add({ targets: o, k: paso, duration: 420, ease: 'Sine.easeInOut', onUpdate: function () { self.girar(c, o.k - prev); prev = o.k; } });
            }
        },

        vueltaNecesaria: function () { return Math.PI * (this.nv && this.nv.dificil ? 2 : 1.1); },

        girar: function (c, d) {
            if (c.estado !== 'cerrado' || this.fase !== 'jugar') return;
            c.giro += d;
            c.valv.rueda.rotation -= d;
            c.abierto = Math.min(1, c.giro / this.vueltaNecesaria());
            if (this.time.now - (this.ultChirrido || 0) > 120) { this.ultChirrido = this.time.now; K.ruido({ f: 2400, q: 6, dur: 0.06, vol: 0.03 }); }
            if (c.abierto >= 1) this.abrir(c);
        },

        abrir: async function (c) {
            var self = this;
            var a = c.actor;
            c.estado = 'abierto';
            this.girando = null;
            if (c.id === this.objetivo) {
                this.fase = 'premio';
                await this.celebrar(a);
                c.estado = 'listo';
                // El tanque de la casa sube.
                var o = { v: this.tanque };
                this.tweens.add({ targets: o, v: Math.min(1, this.tanque + 0.125), duration: 600, onUpdate: function () { self.tanque = o.v; } });
                this.brillo(c.vx, c.vy, 8);
                c.valv.rueda.list[0].setStrokeStyle(this.L.valvula * 0.28, 0x2f9e44);
                this.coleccion.push(a);
                await this.cerrarValvula(c, true);
                await this.seguir();
            } else {
                a.acierto(1100);
                await this.fallar(a);
                await this.cerrarValvula(c, false);
                c.estado = 'cerrado';
            }
        },

        cerrarValvula: function (c, quedaVerde) {
            var self = this;
            var o = { g: c.giro };
            return tw(this, {
                targets: o, g: 0, duration: 500, ease: 'Sine.easeInOut',
                onUpdate: function () { var d = c.giro - o.g; c.giro = o.g; c.valv.rueda.rotation += d; c.abierto = c.giro / self.vueltaNecesaria(); }
            }).then(function () { c.abierto = 0; c.giro = 0; });
        },

        /* ── Niveles ── */

        planNiveles: function () {
            var plan = this.planBase({ extra: [], n: [5, 5, 5, 5] });
            return plan;
        },

        prepararNivel: async function (i, nv) {
            this.autoRepetir = !nv.dificil || !!nv.cambia;
            this.poner(nv.ids);
            this.cosas.forEach(function (c, k) {
                var a = c.actor.cont, y = a.y;
                a.y = y + 30; a.setAlpha(0);
                this.tweens.add({ targets: a, y: y, alpha: 1, duration: 380, delay: k * 90, ease: 'Back.easeOut' });
            }, this);
            await esperar(this, 600);
        },

        paso: function (time) {
            this.dibujarTuberia(time);
            var self = this;
            this.cosas.forEach(function (c) {
                if (!c.valv) return;
                c.valv.flecha.setAlpha(c.estado === 'cerrado' && self.fase === 'jugar' ? 0.5 + Math.sin(time / 300) * 0.3 : 0);
            });
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            var c = this.cosas.filter(function (q) { return q.id === self.objetivo && q.estado === 'cerrado'; })[0];
            if (!c) return Promise.resolve();
            if (this.ayuda) this.brillo(c.actor.cont.x, c.actor.cont.y, 6);
            var r = this.L.valvula * 1.1;
            return this.ctx.mano({ punto: { x: c.vx + r, y: c.vy }, holdMs: 200, arrastre: { dx: -r, dy: -r, durMs: 500 }, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
        },

        estadoExtra: function () {
            return { tanque: +this.tanque.toFixed(2), cosas: this.cosas.map(function (c) { return { id: c.id, estado: c.estado, abierto: +c.abierto.toFixed(2), vx: Math.round(c.vx), vy: Math.round(c.vy) }; }) };
        },

        zonaFiesta: function () { var L = this.L; return { x: L.cuartos.x0, y: L.cuartos.y0 + (L.cuartos.y1 - L.cuartos.y0) * 0.55, w: L.cuartos.x1 - L.cuartos.x0 }; },

        /* ── Escena final: el tinaco riega todo. Se llena, el agua corre por la cañería, se abren
              todas las válvulas a la vez (cada aparato con su sonido) y sale un arcoíris. ── */

        escenaFinal: async function () {
            var self = this;
            var L = this.L;
            this.cosas.forEach(function (c) { c.actor.cont.setAlpha(1); });
            // 1) El tinaco se llena con un gorgoteo.
            var o = { v: this.tanque };
            K.ruido({ f: 300, q: 1.2, dur: 1.0, vol: 0.06 });
            await tw(this, { targets: o, v: 1, duration: 900, ease: 'Sine.easeInOut', onUpdate: function () { self.tanque = o.v; } });
            Ut.estallido(this, L.tanque.x, L.tanque.y - 60, { n: 8, tex: 'burbuja', tam: 18, dist: 50, angulo: -Math.PI / 2, abanico: 1.2, depth: 30 });
            if (!this.sigue()) return;
            // 2) El agua corre por la cañería principal hacia los cuartos.
            var x1 = L.cuartos.x0 + this.cosas.length * L.ancho;
            var ag = this.add.graphics().setDepth(14);
            var frente = { x: L.tanque.x };
            K.ruido({ f: 700, q: 0.8, dur: 0.9, vol: 0.05 });
            await tw(this, {
                targets: frente, x: x1, duration: 900, ease: 'Sine.easeIn',
                onUpdate: function () { ag.clear(); ag.lineStyle(6, 0x4dabf7, 0.9); ag.lineBetween(L.tanque.x, L.tubo, frente.x, L.tubo); }
            });
            // 3) Todas las válvulas se abren a la vez y cada aparato hace lo suyo.
            var tope = this.vueltaNecesaria();
            this.cosas.forEach(function (c, k) {
                self.time.delayedCall(k * 170, function () {
                    var g0 = c.giro;
                    var q = { g: g0 };
                    self.tweens.add({
                        targets: q, g: tope, duration: 450, ease: 'Sine.easeOut',
                        onUpdate: function () { var d = q.g - c.giro; c.giro = q.g; c.valv.rueda.rotation -= d; c.abierto = Math.min(1, c.giro / tope); }
                    });
                    c.valv.rueda.list[0].setStrokeStyle(L.valvula * 0.28, 0x2f9e44);
                    self.escuchar(c.actor.sonido, { breve: true, bocina: false, vol: 0.6 });
                    if (c.actor.acierto) c.actor.acierto(1800);
                });
            });
            await esperar(this, this.cosas.length * 170 + 900);
            if (!this.sigue()) return;
            // 4) Arcoíris sobre los cuartos.
            var cx = (L.cuartos.x0 + x1) / 2, R0 = (x1 - L.cuartos.x0) * 0.42;
            var cy = L.cuartos.y0 + R0 * 0.95;
            // Detrás de cañerías (12), válvulas (30) y aparatos (20): se ve en el fondo de los cuartos.
            var arco = this.add.graphics().setDepth(3).setAlpha(0);
            [0xff6b6b, 0xff922b, 0xffd43b, 0x51cf66, 0x339af0, 0x845ef7].forEach(function (col, i) {
                arco.lineStyle(Math.max(6, R0 * 0.045), col, 0.85);
                arco.beginPath(); arco.arc(cx, cy, R0 - i * Math.max(6, R0 * 0.045), Math.PI, 0); arco.strokePath();
            });
            K.tono({ f: 800, f2: 1600, dur: 0.6, vol: 0.04 });
            await tw(this, { targets: arco, alpha: 1, duration: 800 });
            Ut.estallido(this, cx, cy - R0, { n: 14, tex: 'chispa', tam: 22, dist: 120, colores: [0xffffff, 0xffe066, 0x74c0fc], depth: 41 });
            await esperar(this, 700);
        },

        antesDeFiesta: async function () {
            // Las que no se usaron quedan atenuadas; cada aparato reaparece en su cuarto final.
            var vistos = {};
            this.coleccion = this.coleccion.filter(function (a) { if (!a.cont.active || vistos[a.id]) return false; vistos[a.id] = 1; return true; });
            this.cosas.forEach(function (c) { if (c.estado !== 'listo') c.actor.cont.setAlpha(0.35); });
        },

        demo: async function () {
            var self = this;
            var ctx = this.ctx;
            var t = ctx.textos || {};
            var L = this.L;
            this.fase = 'demo';
            var limpiar = function () {
                ctx.quitarMano();
                self.cosas.forEach(function (c) { c.actor.destruir(); });
                self.cosas = [];
                self.vivos = [];
            };
            await ctx.decir({ voz: 'zeus', texto: t.demostracion || '¡Mira cómo se juega!' }, { minMs: 1600 });
            if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
            // La ducha y la regadera, a la izquierda.
            this.poner(['regadera', 'ducha']);
            var b = L.bocina;
            var sonando = Promise.resolve();
            await ctx.mano({ punto: { x: b.x, y: b.y }, holdMs: 500, onPresionar: function () { sonando = self.escuchar('ducha'); } });
            await sonando;
            var c = this.cosas[1];
            if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
            var r = L.valvula * 1.1;
            await ctx.mano({
                punto: { x: c.vx + r, y: c.vy }, holdMs: 150, arrastre: { dx: -r, dy: -r, durMs: 700, soltarEnDestino: true },
                onDuranteArrastre: function () { var o = { k: 0 }, prev = 0; self.tweens.add({ targets: o, k: Math.PI * 1.1, duration: 700, onUpdate: function () { c.giro += o.k - prev; c.valv.rueda.rotation -= o.k - prev; c.abierto = Math.min(1, c.giro / (Math.PI * 1.1)); prev = o.k; } }); }
            });
            if (!ctx.vivo()) return limpiar();
            K.efecto(this, 'recompensa');
            Ut.estallido(this, c.actor.cont.x, c.actor.cont.y - L.tam * 0.2, { n: 14, tex: 'estrella', tam: 28, dist: 150, sinTinte: true, depth: 85 });
            await Promise.all([this.escuchar('ducha', { breve: true, bocina: false }), c.actor.acierto(1500)]);
            await ctx.decir({ voz: 'zoe', texto: t.demostracionAcierto || '¡Así se hace!' }, { estado: 'acierto', minMs: 1300 });
            await ctx.decir({ voz: 'zeus', texto: t.demostracionFin || '¡Ahora te toca a ti!' }, { minMs: 1000 });
            limpiar();
        }
    };

    K.crear({ id: 'llaves', fondo: '#dee2e6', escena: escena });
})(typeof window !== 'undefined' ? window : this);
