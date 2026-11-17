/**
 * «Enchufa la máquina» — motor propio de Sonido de una máquina (5-6 años).
 *
 * En la cocina (fondo del diseño en img/diseno/fondo.svg), las máquinas están sobre el mesón y sus cables cuelgan y se enredan
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

    /* Cocina del diseño (img/diseno/fondo.svg, lienzo 1280×720). Medidas tomadas por color. */
    var DISENO = 'img/diseno/';
    var FONDO_W = 1280, FONDO_H = 720;
    var COCINA = {
        meson: { x0: 152, x1: 1128, y: 347 },      // tablero 347-366; cajones hasta 548
        piso: 549,                                  // zócalo 517-548; piso de madera desde aquí
        anchoUtil: 1000,                            // el mesón entero siempre debe caber
        alto: 540,                                  // alto del dibujo (desde y 180) que debe caber bajo la bocina
        tam: 135,                                   // alto de cada máquina en unidades del dibujo (cajón: 240 de ancho)
        vidrio: { x0: 868, x1: 1035, y0: 217, y1: 278 },   // vidrio bajo la persiana
        repisa: { x0: 1107, x1: 1274, alta: 96, baja: 179 }, // repisas vacías de la derecha
        pared: 0xf9f8e4
    };

    function bezier(p0, p1, p2, p3, t) {
        var u = 1 - t;
        return {
            x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
            y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
        };
    }

    var escena = {
        iniciar: function () { this.maqs = []; this.adornos = []; },

        preload: function () {
            if (!this.textures.exists('mq_fondo')) this.load.svg('mq_fondo', DISENO + 'fondo.svg', { width: 1920, height: 1080 });
        },

        /** Encaje del fondo: cubre la pantalla anclado abajo, sin recortar el mesón ni dejarlo bajo la bocina. */
        marcoFondo: function (W, H, techo) {
            if (!this.textures.exists('mq_fondo')) return null;
            var k = Math.min(Math.max(W / FONDO_W, H / FONDO_H), W / COCINA.anchoUtil, (H - techo) / COCINA.alto);
            var ox = (W - FONDO_W * k) / 2, oy = H - FONDO_H * k;
            return { k: k, ox: ox, oy: oy, sx: function (x) { return ox + x * k; }, sy: function (y) { return oy + y * k; } };
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.bocina = { x: W / 2, y: Math.max(60, Math.min(100, 56 + hueco * 0.2)), r: Math.max(28, Math.min(40, hueco * 0.3)) };
            L.pres = W >= 760 ? { x: W - 70, piso: H - 104, alto: Math.min(160, H * 0.28), modelo: 'nino' } : null;
            var der = L.pres ? W - 145 : W - 16;
            var F = L.F = this.marcoFondo(W, H, L.bocina.y + L.bocina.r + 14);
            if (F) return this.calcularConFondo(L, F, der);
            L.meson = { y: Math.max(L.bocina.y + L.bocina.r + H * 0.22, H * 0.46), x0: 16, x1: der - 10 };
            L.tam = Math.max(70, Math.min(135, H * 0.2, (L.meson.x1 - L.meson.x0) / 5.6));
            L.y0 = L.meson.y + H * 0.12;                        // piso
            L.enchufesY = H - Math.max(70, H * 0.12);
            L.regleta = { x: Math.min(der - 60, W * 0.74), y: L.enchufesY, w: Math.max(120, W * 0.13), h: 34 };
            L.zonaEnch = { x0: W * 0.06, x1: L.regleta.x - L.regleta.w * 0.7 - 20 };
            return L;
        },

        /** Máquinas sobre el tablero del mesón del dibujo; enchufes y regleta en el piso de madera. */
        calcularConFondo: function (L, F, der) {
            var W = L.W, H = L.H, M = COCINA.meson;
            L.y0 = F.sy(COCINA.piso);
            L.meson = { y: F.sy(M.y) + 2, x0: Math.max(16, F.sx(M.x0) + 8), x1: Math.min(der - 10, F.sx(M.x1) - 8) };
            var techo = L.bocina.y + L.bocina.r + 10;
            L.tam = Math.max(60, Math.min(COCINA.tam * F.k, (L.meson.y - techo) / 0.95, (L.meson.x1 - L.meson.x0) / 5.2));
            var piso = H - L.y0;
            L.enchufesY = Math.max(L.y0 + 36, H - Math.max(52, piso * 0.42));
            L.regleta = { x: Math.min(der - 60, W * 0.74), y: L.enchufesY, w: Math.max(110, Math.min(170, 150 * F.k)), h: 34 };
            L.zonaEnch = { x0: Math.max(W * 0.06, 30), x1: L.regleta.x - L.regleta.w * 0.7 - 20 };
            return L;
        },

        armar: function (reubicar) {
            var self = this;
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            this.adornos = [];
            this.cielo = null;
            if (L.F) this.montarCocina(keep);
            else {
                K.textura(this, 'lavado_fondo', L.W, L.H, function (x, w, h) { self.pintarCuarto(x, w, h); });
                keep(this.add.image(0, 0, 'lavado_fondo').setOrigin(0, 0).setDepth(0));
            }
            this.cablesG = keep(this.add.graphics().setDepth(15));
            var V = this.montarVida(keep);
            if (V) {
                var by = L.bocina.y + L.bocina.r;
                V.burbujas({ x: L.W * 0.05, y: by, w: L.meson.x1 - L.W * 0.05, h: Math.max(30, L.meson.y - L.tam - by), n: 7, depth: 9 });
                // El escenario también festeja o se sorprende: los adornos de la cocina se suman.
                var reac = V.reaccionar;
                V.reaccionar = function (tipo, p) { reac(tipo, p); self.reaccionarCocina(tipo); };
                var toc = V.tocar;
                V.tocar = function (p) { return self.tocarCocina(p) || toc(p); };
            }
            this.montarRegleta(keep);
            this.montarHud(keep);
            if (reubicar && this.maqs.length) this.ubicar(false);
        },

        /* ── Cocina del diseño: fondo, cielo en la ventana y adornos de las repisas vacías ── */

        montarCocina: function (keep) {
            var self = this, L = this.L, F = L.F, k = F.k;
            var fw = FONDO_W * k, fh = FONDO_H * k;
            // Si sobra pantalla arriba, la pared lisa sigue con su color; a los lados, copias en espejo.
            if (F.oy > 0) keep(this.add.rectangle(0, 0, L.W, F.oy + 2, COCINA.pared).setOrigin(0, 0).setDepth(0));
            keep(this.add.image(F.ox, F.oy, 'mq_fondo').setOrigin(0, 0).setDisplaySize(fw, fh).setDepth(0));
            if (F.ox > 0) {
                keep(this.add.image(F.ox, F.oy, 'mq_fondo').setOrigin(1, 0).setDisplaySize(fw, fh).setFlipX(true).setDepth(0));
                keep(this.add.image(F.ox + fw, F.oy, 'mq_fondo').setOrigin(0, 0).setDisplaySize(fw, fh).setFlipX(true).setDepth(0));
            }
            // Cielo vivo detrás del vidrio (nubes que pasan, un pájaro de vez en cuando).
            var v = COCINA.vidrio;
            var cx = F.sx(v.x0 + 1), cy = F.sy(v.y0 + 1);
            var cw = Math.ceil((v.x1 - v.x0 - 2) * k), ch = Math.ceil((v.y1 - v.y0 - 2) * k);
            if (cw > 24 && cx > -cw && cx < L.W) {
                var clave = 'mq_cielo_' + cw + 'x' + ch;
                var tex = this.textures.exists(clave) ? this.textures.get(clave) : this.textures.createCanvas(clave, cw, ch);
                var nubes = [];
                for (var n = 0; n < 3; n++) nubes.push({ x: rnd(0, 1.2), y: rnd(0.25, 0.7), s: rnd(0.7, 1.15), v: rnd(0.018, 0.035) });
                this.cielo = { tex: tex, w: cw, h: ch, x: cx, y: cy, nubes: nubes, pajaro: null, ult: -1 };
                keep(this.add.image(cx, cy, clave).setOrigin(0, 0).setDepth(1));
                this.pintarCielo(0);
            }
            // Repisa baja: frascos de detergente y toallas dobladas (la alta queda bajo los botones de la esquina).
            var R = COCINA.repisa;
            var frascos = [[1126, 0x4dabf7, 46], [1156, 0xff8787, 38]];
            frascos.forEach(function (q, i) {
                self.adorno(keep, 'frasco', F.sx(q[0]), F.sy(R.baja), k, function (g) {
                    var h = q[2], w = 26;
                    g.fillStyle(0x000000, 0.12); g.fillEllipse(0, 0, w + 8, 6);
                    g.fillStyle(q[1], 1); g.fillRoundedRect(-w / 2, -h, w, h, 7);
                    g.fillStyle(0xffffff, 0.25); g.fillRoundedRect(-w / 2 + 3, -h + 4, 6, h - 10, 3);
                    g.fillStyle(0xffffff, 0.75); g.fillRoundedRect(-w / 2 + 4, -h * 0.62, w - 8, h * 0.28, 3);
                    g.fillStyle(q[1], 0.7); g.fillCircle(0, -h * 0.48, 4);
                    g.fillStyle(Phaser.Display.Color.ValueToColor(q[1]).darken(25).color, 1); g.fillRoundedRect(-6, -h - 9, 12, 10, 3);
                    if (i === 1) { g.fillRect(4, -h - 7, 10, 4); }
                }, i);
            });
            var toallas = [[0x63e6be, 0], [0xffa8a8, 1], [0x91a7ff, 2]];
            this.adorno(keep, 'toallas', F.sx(1226), F.sy(R.baja), k, function (g) {
                g.fillStyle(0x000000, 0.12); g.fillEllipse(0, 0, 92, 6);
                toallas.forEach(function (t) {
                    var y = -13 - t[1] * 13, w = 80 - t[1] * 6;
                    g.fillStyle(t[0], 1); g.fillRoundedRect(-w / 2, y, w, 13, 6);
                    g.fillStyle(0xffffff, 0.55); g.fillRect(-w / 2 + 8, y + 4, w - 16, 2);
                    g.fillStyle(0x000000, 0.08); g.fillRect(-w / 2 + 2, y + 10, w - 4, 3);
                });
            }, 3);
        },

        /** Adorno de la cocina: graphics con base en (0,0) para que salte y se aplaste desde abajo. */
        adorno: function (keep, tipo, x, y, k, dibujar, i) {
            if (x < 10 || x > this.L.W - 10) return null;
            var c = keep(this.add.container(x, y).setDepth(2).setScale(k));
            var g = this.add.graphics();
            dibujar(g);
            c.add(g);
            var a = { tipo: tipo, c: c, k: k, i: i, x: x, y: y };
            this.adornos.push(a);
            return a;
        },

        saltarAdorno: function (a, alto, ms) {
            var self = this;
            this.tweens.killTweensOf(a.c);
            a.c.setPosition(a.x, a.y).setScale(a.k).setAngle(0);
            this.tweens.add({ targets: a.c, scaleY: a.k * 0.82, scaleX: a.k * 1.12, duration: 90, yoyo: true, onComplete: function () {
                self.tweens.add({ targets: a.c, y: a.y - alto * a.k, duration: ms, yoyo: true, ease: 'Quad.easeOut', onComplete: function () {
                    self.tweens.add({ targets: a.c, scaleY: a.k * 0.88, scaleX: a.k * 1.08, duration: 80, yoyo: true });
                } });
            } });
        },

        reaccionarCocina: function (tipo) {
            var self = this;
            this.adornos.forEach(function (a, j) {
                if (!a.c.active) return;
                if (tipo === 'acierto') self.time.delayedCall(j * 90, function () { if (a.c.active) self.saltarAdorno(a, 14, 170); });
                else { self.tweens.killTweensOf(a.c); a.c.setAngle(0); self.tweens.add({ targets: a.c, angle: 7, duration: 70, yoyo: true, repeat: 3, onComplete: function () { a.c.setAngle(0); } }); }
            });
            if (tipo === 'acierto' && this.cielo) this.cielo.pajaro = { t: this.time.now };
        },

        tocarCocina: function (p) {
            var self = this;
            var S = this.vidaAmb && this.vidaAmb.sonido;
            var a = this.adornos.filter(function (q) { return q.c.active && Math.abs(p.x - q.x) < 22 * q.k + 14 && p.y < q.y + 10 && p.y > q.y - 64 * q.k; })[0];
            if (a) {
                this.saltarAdorno(a, a.tipo === 'frasco' ? 22 : 10, 200);
                if (a.tipo === 'frasco') {
                    if (S) S.blup();
                    for (var b = 0; b < 3; b++) {
                        var r = rnd(4, 8) * a.k + 2;
                        var bu = this.add.circle(a.x + rnd(-8, 8) * a.k, a.y - 50 * a.k, r, 0xd0ebff, 0.35).setStrokeStyle(1.5, 0xffffff, 0.9).setDepth(9);
                        this.tweens.add({ targets: bu, y: bu.y - rnd(40, 80), x: bu.x + rnd(-20, 20), alpha: 0, duration: rnd(700, 1100), delay: b * 90, onComplete: function (tw0, tg) { tg[0].destroy(); } });
                    }
                } else if (S) S.puf();
                return true;
            }
            var c = this.cielo;
            if (c && p.x > c.x && p.x < c.x + c.w && p.y > c.y - 140 * this.L.F.k && p.y < c.y + c.h) {
                // Tocar la ventana (o su persiana): pasa un pájaro y las nubes se apuran un momento.
                c.pajaro = { t: this.time.now };
                c.prisa = this.time.now + 1200;
                if (S) S.pio();
                return true;
            }
            return false;
        },

        pintarCielo: function (t) {
            var c = this.cielo;
            if (!c || !c.tex) return;
            var x = c.tex.getContext(), w = c.w, h = c.h;
            var g = x.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, '#8fcaf3'); g.addColorStop(1, '#e3f4fd');
            x.fillStyle = g; x.fillRect(0, 0, w, h);
            x.fillStyle = 'rgba(255,255,255,0.95)';
            c.nubes.forEach(function (n) {
                var cx = (n.x % 1.4) * w * 1.0 - w * 0.2, cy = n.y * h, r = h * 0.17 * n.s;
                x.beginPath();
                x.arc(cx, cy, r, 0, Math.PI * 2); x.arc(cx + r * 1.1, cy - r * 0.45, r * 1.15, 0, Math.PI * 2);
                x.arc(cx + r * 2.2, cy, r * 0.95, 0, Math.PI * 2); x.rect(cx, cy, r * 2.2, r * 0.9);
                x.fill();
            });
            if (c.pajaro) {
                var f = (t - c.pajaro.t) / 2600;
                if (f > 1) c.pajaro = null;
                else {
                    var px = -10 + f * (w + 20), py = h * (0.45 - Math.sin(f * Math.PI) * 0.2), ala = Math.sin(t / 70) * h * 0.06;
                    x.strokeStyle = '#343a40'; x.lineWidth = Math.max(1.5, h * 0.03); x.lineCap = 'round';
                    x.beginPath(); x.moveTo(px - h * 0.09, py - ala); x.quadraticCurveTo(px - h * 0.04, py - h * 0.03, px, py);
                    x.quadraticCurveTo(px + h * 0.04, py - h * 0.03, px + h * 0.09, py - ala); x.stroke();
                }
            }
            // Reflejo del vidrio.
            x.fillStyle = 'rgba(255,255,255,0.28)';
            x.beginPath(); x.moveTo(w * 0.12, h); x.lineTo(w * 0.3, 0); x.lineTo(w * 0.38, 0); x.lineTo(w * 0.2, h); x.fill();
            c.tex.refresh();
        },

        moverCielo: function (t, dt) {
            var c = this.cielo;
            if (!c) return;
            var vel = (c.prisa && t < c.prisa ? 5 : 1) * (Ut.reducido && Ut.reducido() ? 0.33 : 1);
            c.nubes.forEach(function (n) { n.x += n.v * vel * (dt || 16) / 1000; });
            if (t - c.ult < 50) return;
            c.ult = t;
            this.pintarCielo(t);
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
            if (this.L.F) {
                // Cable de la regleta: corre por el piso hasta el borde derecho (detrás del presentador).
                var cg = keep(this.add.graphics().setDepth(13));
                var x0 = r.x + r.w / 2 - 4, x1 = this.L.W + 10, yc = r.y + 2;
                [[8, 0x000000, 0.15, 3], [7, 0x343a40, 1, 0], [2, 0xffffff, 0.2, -2]].forEach(function (s) {
                    cg.lineStyle(s[0], s[1], s[2]);
                    var cv = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(x0, yc + s[3]), new Phaser.Math.Vector2((x0 + x1) / 2, yc + 26 + s[3]), new Phaser.Math.Vector2(x1, yc - 6 + s[3]));
                    cv.draw(cg, 24);
                });
            }
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

        paso: function (time, delta) { this.dibujarCables(time); this.moverCielo(time, delta); },

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
            this.coleccion.forEach(function (a) { if (a.cont && a.cont.active) a.cont.setAlpha(1); });
        },

        /* ── Escena final: orquesta de máquinas. Todas se enchufan a la regleta (que se prende en
              cadena) y suenan por turnos al compás, moviéndose con el ritmo. ── */

        escenaFinal: async function () {
            var self = this;
            var L = this.L, R = L.regleta;
            var maqs = this.maqs.filter(function (m) { return m.actor && m.actor.cont && m.actor.cont.active; });
            var n = maqs.length;
            if (!n) return;
            maqs.forEach(function (m) { m.actor.cont.setAlpha(1); if (m.luz) m.luz.destroy(); });
            // Luces de la regleta: una por máquina.
            var leds = maqs.map(function (m, k) {
                return self.add.circle(R.x - R.w * 0.38 + R.w * 0.76 * (k + 0.5) / n, R.y - R.h * 0.05, 5, 0x868e96).setStrokeStyle(1.5, 0xffffff).setDepth(62);
            });
            // 1) Se enchufan una tras otra.
            for (var i = 0; i < n; i++) {
                var m = maqs[i];
                m.enchufe.setAlpha(1).setDepth(61);
                await tw(this, { targets: m.enchufe, x: leds[i].x, y: R.y - 4, duration: 320, ease: 'Quad.easeInOut' });
                K.ruido({ f: 2500, q: 3, dur: 0.05, vol: 0.1 });
                leds[i].setFillStyle(0x40c057);
                Ut.estallido(this, leds[i].x, leds[i].y, { n: 4, tex: 'chispa', tam: 12, dist: 24, colores: [0xfff3bf, 0x74c0fc], depth: 63 });
                this.tweens.add({ targets: m.actor.cont, angle: 4, duration: 60, yoyo: true, repeat: 2 });
            }
            if (!this.sigue()) return;
            await esperar(this, 300);
            // 2) Al compás: cada golpe suena una máquina; todas saltan con el golpe.
            var esc0 = maqs.map(function (m) { return m.actor.cont.scale; });
            var golpes = Math.max(8, n * 2);
            for (var b = 0; b < golpes; b++) {
                var k = b % n;
                var a = maqs[k].actor;
                K.ruido({ f: 120, q: 1, dur: 0.12, vol: 0.12 });            // bombo
                if (b % 2) K.ruido({ f: 5000, q: 1.5, dur: 0.05, vol: 0.05 });   // platillo
                maqs.forEach(function (q, j) {
                    self.tweens.add({ targets: q.actor.cont, scaleY: esc0[j] * (j === k ? 1.18 : 1.06), scaleX: esc0[j] * (j === k ? 0.92 : 0.97), duration: 110, yoyo: true, ease: 'Quad.easeOut' });
                });
                leds.forEach(function (l, j) { l.setFillStyle(j === k ? 0xfcc419 : 0x40c057); });
                this.escuchar(a.sonido, { breve: true, bocina: false, vol: 0.65 });
                Ut.estallido(this, a.cont.x, a.cont.y - L.tam * 0.45, { n: 3, tex: 'nota', tam: 24, dist: 80, angulo: -Math.PI / 2, abanico: 1.2, depth: 60 });
                await esperar(this, 430);
                if (!this.sigue()) return;
            }
            // 3) Final todas juntas.
            K.ruido({ f: 100, q: 0.8, dur: 0.4, vol: 0.14 });
            maqs.forEach(function (q, j) {
                if (q.actor.acierto && q.actor.id !== 'aspiradora') q.actor.acierto(900);
                Ut.estallido(self, q.actor.cont.x, q.actor.cont.y - L.tam * 0.4, { n: 5, tex: 'nota', tam: 26, dist: 110, depth: 60 });
            });
            leds.forEach(function (l) { l.setFillStyle(0x40c057); });
            await esperar(this, 900);
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

    K.crear({
        id: 'enchufes',
        fondo: '#f9f8e4',
        /* SVG en img/ — sin esto Act.crear sigue con PedniaArte */
        pieles: ['aspiradora', 'secador', 'licuadora', 'ventilador', 'lavadora', 'gallo', 'vaca'],
        escena: escena
    });
})(typeof window !== 'undefined' ? window : this);
