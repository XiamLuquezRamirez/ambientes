/**
 * «La alfombra de la ciudad» — motor propio de Un sonido de viaje (3-4 años).
 *
 * Una alfombra de juego con calles, vía de tren y pista de aterrizaje impresas. Los vehículos de
 * juguete esperan en el estacionamiento. Suena uno; el niño puede tocar cada vehículo para oírlo
 * y, cuando sabe cuál es, lo LLEVA CON EL DEDO por su camino (el avión por la pista, el tren por
 * la vía, los de calle por la calle): el juguete sigue el dedo pegado al camino, como cuando se
 * juega de verdad. Al llegar, hace su viaje: el avión despega, el tren pita y se va, la
 * ambulancia enciende la sirena. Si lleva otro, a mitad de camino se detiene, suena y vuelve.
 *
 * Niveles: 1 el reto · 2 otro sonido con cuatro vehículos · 3 cinco vehículos y el sonido llega
 * de lejos (más bajo) · 4 cada viaje trae un sonido nuevo.
 */
(function (global) {
    'use strict';

    var K = global.AsociaKit;
    var Ut = global.PedniaParejaBase.util;
    var Act = global.AsociaActores;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var rnd = Ut.rnd;
    var EXTRA = ['camion', 'motocicleta', 'bicicleta'];
    var CAMINO = { avion: 'pista', tren: 'via' };

    function largo(pts) {
        var acc = [0];
        for (var i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
        return acc;
    }
    function puntoEn(r, d) {
        var acc = r.acc, pts = r.pts;
        d = Math.max(0, Math.min(acc[acc.length - 1], d));
        for (var i = 1; i < pts.length; i++) {
            if (acc[i] >= d) {
                var t = (d - acc[i - 1]) / Math.max(1e-6, acc[i] - acc[i - 1]);
                return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t, dx: pts[i].x - pts[i - 1].x, dy: pts[i].y - pts[i - 1].y };
            }
        }
        var u = pts[pts.length - 1];
        return { x: u.x, y: u.y, dx: 1, dy: 0 };
    }
    /** Proyecta (x, y) sobre el camino y devuelve la distancia recorrida más cercana. */
    function proyectar(r, x, y, desde, hasta) {
        var mejor = desde, dmin = Infinity;
        for (var d = Math.max(0, desde); d <= hasta; d += 6) {
            var p = puntoEn(r, d);
            var q = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
            if (q < dmin) { dmin = q; mejor = d; }
        }
        return { d: mejor, dist: Math.sqrt(dmin) };
    }

    /**
     * Escenario del diseño (img/fondo.svg, 1280×720): ciudad vista desde arriba con cielo,
     * pista, vía, dos calles, avenida a la izquierda y estacionamiento de 5 bahías abajo.
     * Medidas en unidades del SVG.
     */
    var FONDO = {
        w: 1280, h: 720,
        cielo: 194, cieloColor: 0x85cfe8, pastoColor: 0x6d9338,
        recorte: 180,                       // a la izquierda solo hay casitas: se puede recortar hasta aquí
        pista: 257.4, via: 352.7, calle: 448, salida: 543.4,
        avenida: 223, ciudad: { x: 193, y: 218 }, fin: 1268,
        bahias: [317, 470, 640, 808, 962], bahiaY: 655, bahiaAncho: 150,
        lago: { x: 1150, y: 655 },
        acera: 200,                         // franja gris entre el cielo y la ciudad
        aceraCentro: 198,
        faroles: [32, 240, 429, 786, 995, 1182], farolY: 72,
        pistaBordes: [229, 283], pistaX0: 262, pistaX1: 1200,
        cieloArriba: 14, cieloAbajo: 72
    };

    var escena = {
        preload: function () {
            if (!this.textures.exists('vj_fondo')) this.load.svg('vj_fondo', 'img/fondo.svg', { width: 1920, height: 1080 });
        },

        iniciar: function () { this.autos = []; },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.bocina = { x: W / 2, y: Math.max(60, Math.min(100, 56 + hueco * 0.2)), r: Math.max(28, Math.min(40, hueco * 0.3)) };
            L.pres = W >= 760 ? { x: W - 70, piso: H - 104, alto: Math.min(160, H * 0.28) } : null;
            var der = L.pres ? W - 140 : W - 10;
            if (this.textures.exists('vj_fondo')) return this.calcularConFondo(L, der);
            // La alfombra ocupa casi todo, con un borde de tela.
            L.alf = { x: 14, y: L.bocina.y + L.bocina.r + 14, w: der - 28, h: H - (L.bocina.y + L.bocina.r + 14) - 12 };
            var A0 = L.alf;
            L.tam = Math.max(64, Math.min(118, A0.h * 0.2, A0.w / 7));
            // Estacionamiento abajo a la izquierda; caminos que salen hacia arriba y a la derecha.
            // Avenida de salida (calle con vía de tranvía) a la izquierda: une el estacionamiento con las tres franjas.
            L.conn = A0.x + Math.max(L.tam * 0.55, A0.w * 0.07);
            L.est = { x: L.conn + L.tam * 0.6, y: A0.y + A0.h * 0.66, w: Math.min(A0.w * 0.6, L.tam * 1.25 * 5), h: A0.h * 0.3 };
            L.pasillo = L.est.y + L.est.h * 0.12;
            var yP = A0.y + A0.h * 0.16, yV = A0.y + A0.h * 0.36, yC = A0.y + A0.h * 0.54;
            var xF = A0.x + A0.w - L.tam * 0.75;
            L.rutas = {
                pista: { y: yP, fin: xF, color: 0x495057 },
                via: { y: yV, fin: xF, color: 0x8d6e63 },
                calle: { y: yC, fin: xF, color: 0x5c5f66 }
            };
            return L;
        },

        /**
         * Con el escenario del diseño: la imagen cubre la pantalla (en vertical se recorta un poco de
         * las casitas de la izquierda y el resto se completa con cielo arriba y pasto abajo) y los
         * caminos se toman de sus medidas.
         */
        calcularConFondo: function (L, der) {
            var W = L.W, H = L.H, F = FONDO;
            var s = Math.max(W / F.w, Math.min(H / F.h, W * 1.35 / F.w));
            var fw = F.w * s, fh = F.h * s;
            var ix = Math.max((W - fw) / 2, -F.recorte * s), iy = (H - fh) * 0.7;
            if (ix + fw < W) ix = W - fw;
            var px = function (u) { return ix + u * s; };
            var py = function (v) { return iy + v * s; };
            L.fondo = { x: ix, y: iy, s: s, w: fw, h: fh };
            // Que la bocina quede en el cielo.
            L.bocina.y = Math.min(L.bocina.y, Math.max(40, py(F.cielo) - L.bocina.r - 10));
            L.tam = Math.max(56, Math.min(118, F.bahiaAncho * s * 0.85));
            // Los caminos terminan antes del presentador: el vehículo que llega se ve entero.
            var xFin = Math.min(px(F.fin), der - L.tam * 0.75);
            L.alf = { x: Math.max(0, px(F.ciudad.x)), y: py(F.ciudad.y) };
            L.alf.w = xFin - L.alf.x;
            L.alf.h = Math.min(H, py(F.h)) - L.alf.y;
            L.conn = px(F.avenida);
            L.pasillo = py(F.salida);
            var b0 = F.bahias[0] - F.bahiaAncho / 2, b1 = F.bahias[F.bahias.length - 1] + F.bahiaAncho / 2;
            L.est = { x: px(b0), y: py(583), w: (b1 - b0) * s, h: Math.min(H, py(F.h)) - py(583) };
            L.bahiasX = F.bahias.map(px);
            L.bahiaY = py(F.bahiaY) + L.tam * 0.3;
            L.lago = { x: px(F.lago.x), y: py(F.lago.y), w: 200 * s };
            L.acera = py(F.acera);
            L.aceraCentro = py(F.aceraCentro);
            L.faroles = F.faroles.map(function (u) { return { x: px(u), y: py(F.farolY) }; });
            L.pistaBordes = F.pistaBordes.map(py);
            L.pistaX0 = px(F.pistaX0);
            L.pistaX1 = Math.min(px(F.pistaX1), xFin);
            L.cielo = { y0: py(F.cieloArriba), y1: py(F.cieloAbajo) };
            L.rutas = {
                pista: { y: py(F.pista), fin: xFin, color: 0x495057 },
                via: { y: py(F.via), fin: xFin, color: 0x8d6e63 },
                calle: { y: py(F.calle), fin: xFin, color: 0x5c5f66 }
            };
            return L;
        },

        bahia: function (k, n) {
            var L = this.L;
            if (L.bahiasX) {
                // Bahías pintadas en el diseño; con menos vehículos se usan las del centro.
                var off = Math.max(0, Math.floor((L.bahiasX.length - n) / 2));
                return { x: L.bahiasX[Math.min(L.bahiasX.length - 1, k + off)], y: L.bahiaY };
            }
            var e = L.est;
            return { x: e.x + e.w * (k + 0.5) / n, y: e.y + e.h * 0.66 };
        },

        /**
         * Camino impreso: sale de la bahía al pasillo del estacionamiento, va a la avenida de la
         * izquierda, sube por ella y dobla por su franja (pista, vía o calle). Esquinas redondeadas.
         */
        ruta: function (tipo, desde) {
            var L = this.L, R = L.rutas[tipo];
            var esquinas = [
                { x: desde.x, y: desde.y },
                { x: desde.x, y: L.pasillo },
                { x: L.conn, y: L.pasillo },
                { x: L.conn, y: R.y },
                { x: R.fin, y: R.y }
            ];
            var rad = L.tam * 0.35;
            var pts = [esquinas[0]];
            for (var i = 1; i < esquinas.length - 1; i++) {
                var a = esquinas[i - 1], b = esquinas[i], c = esquinas[i + 1];
                var l1 = Math.hypot(b.x - a.x, b.y - a.y), l2 = Math.hypot(c.x - b.x, c.y - b.y);
                var r = Math.min(rad, l1 / 2, l2 / 2);
                var p1 = { x: b.x + (a.x - b.x) * r / Math.max(1, l1), y: b.y + (a.y - b.y) * r / Math.max(1, l1) };
                var p2 = { x: b.x + (c.x - b.x) * r / Math.max(1, l2), y: b.y + (c.y - b.y) * r / Math.max(1, l2) };
                pts.push(p1);
                for (var s = 0.2; s < 1; s += 0.2) {
                    var u = 1 - s;
                    pts.push({ x: u * u * p1.x + 2 * u * s * b.x + s * s * p2.x, y: u * u * p1.y + 2 * u * s * b.y + s * s * p2.y });
                }
                pts.push(p2);
            }
            pts.push(esquinas[esquinas.length - 1]);
            // Puntos cada ~8 px para que el dedo se pueda seguir en los tramos rectos largos.
            var densos = [pts[0]];
            for (var k = 1; k < pts.length; k++) {
                var q0 = pts[k - 1], q1 = pts[k];
                var n = Math.max(1, Math.ceil(Math.hypot(q1.x - q0.x, q1.y - q0.y) / 8));
                for (var m = 1; m <= n; m++) densos.push({ x: q0.x + (q1.x - q0.x) * m / n, y: q0.y + (q1.y - q0.y) * m / n });
            }
            return { tipo: tipo, pts: densos, acc: largo(densos) };
        },

        armar: function () {
            var self = this;
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            if (L.fondo) {
                // Escenario del diseño; si no llena la pantalla, cielo arriba y pasto abajo.
                var Fd = L.fondo;
                if (Fd.y > 0) keep(this.add.rectangle(0, 0, L.W, Fd.y + 1, FONDO.cieloColor).setOrigin(0, 0).setDepth(0));
                if (Fd.y + Fd.h < L.H) keep(this.add.rectangle(0, Fd.y + Fd.h - 1, L.W, L.H - Fd.y - Fd.h + 2, FONDO.pastoColor).setOrigin(0, 0).setDepth(0));
                keep(this.add.image(Fd.x, Fd.y, 'vj_fondo').setOrigin(0, 0).setDisplaySize(Fd.w, Fd.h).setDepth(0.1));
            } else {
                K.textura(this, 'alfombra_fondo', L.W, L.H, function (x, w, h) { self.pintarAlfombra(x, w, h); });
                keep(this.add.image(0, 0, 'alfombra_fondo').setOrigin(0, 0).setDepth(0));
            }
            this.rastroG = keep(this.add.graphics().setDepth(5));
            this.armarPista(keep);
            this.armarFaroles(keep);
            var V = this.montarVida(keep);
            var A0 = L.alf;
            if (V && L.lago) {
                V.pato(L.lago.x - L.lago.w * 0.25, L.lago.y + L.lago.w * 0.05, L.lago.w * 0.2, 0.9);
                V.mariposas(3, { x: L.conn, y: Math.max(0, L.fondo.y + 90 * L.fondo.s), w: A0.w * 0.7, h: 70 * L.fondo.s, depth: 8 });
                // Nubes que viajan por el cielo del dibujo y pájaros que lo cruzan.
                if (L.cielo) {
                    for (var nb = 0; nb < 3; nb++) V.nube(rnd(0, L.W), rnd(L.cielo.y0 + 10, L.cielo.y1 - 6), 0.5 * L.fondo.s / 0.86 + rnd(-0.06, 0.06));
                    V.pajaros(2, L.cielo.y0 + 6, L.cielo.y1);
                }
            } else if (V) {
                V.pato(A0.x + A0.w * 0.86, A0.y + A0.h * 0.82, A0.w * 0.04, 0.9);
                V.mariposas(2, { x: L.est.x + L.est.w + 20, y: A0.y + A0.h * 0.62, w: A0.x + A0.w - L.est.x - L.est.w - 140, h: A0.h * 0.1, depth: 8 });
            }
            this.montarHud(keep);
            // Los que ya viajaron siguen estacionados en la acera (también al cambiar el tamaño).
            (this.coleccion || []).forEach(function (a, k) {
                if (!a.cont || !a.cont.active) return;
                var d = self.lugarRecuerdo(k);
                a.cont.setPosition(d.x, d.y).setScale(d.rel * L.tam / a.tam).setAngle(0);
            });
            var n = this.autos.length;
            this.autos.forEach(function (c) {
                if (c.estado !== 'quieto') return;
                var b = self.bahia(c.k, Math.max(n, c.n || n));
                c.base = b;
                c.actor.cont.setPosition(b.x, b.y - L.tam * 0.3).setScale(L.tam / c.actor.tam);
            });
        },

        /**
         * La franja del avión se reconoce como pista: marcas de cabecera al empezar y luces en los
         * bordes que se encienden en cadena hacia donde despega.
         */
        armarPista: function (keep) {
            var L = this.L;
            this.lucesPista = [];
            if (!L.pistaBordes) return;
            var s = L.fondo.s;
            var g = keep(this.add.graphics().setDepth(0.5));
            var y0 = L.pistaBordes[0], y1 = L.pistaBordes[1];
            // Cabecera: barras blancas a lo largo, como las de una pista de verdad.
            g.fillStyle(0xffffff, 0.92);
            for (var b = 0; b < 6; b++) {
                var yb = y0 + (y1 - y0) * (0.12 + b * 0.152);
                g.fillRect(L.pistaX0 + 8 * s, yb, 40 * s, 4 * s);
            }
            // Flecha de despegue pintada en el piso.
            var xf = L.pistaX0 + 70 * s, yc = (y0 + y1) / 2;
            g.fillTriangle(xf + 26 * s, yc, xf + 8 * s, yc - 9 * s, xf + 8 * s, yc + 9 * s);
            g.fillRect(xf - 10 * s, yc - 3 * s, 20 * s, 6 * s);
            var paso = 58 * s;
            var k = 0;
            for (var x = L.pistaX0 + 120 * s; x < L.pistaX1; x += paso, k++) {
                [y0 + 3 * s, y1 - 3 * s].forEach(function (y) {
                    var halo = keep(this.add.circle(x, y, 5.5 * s, 0xffd43b, 0.25).setDepth(0.6));
                    var luz = keep(this.add.circle(x, y, 2.6 * s, 0xfff3bf, 1).setDepth(0.61));
                    this.lucesPista.push({ halo: halo, luz: luz, k: k });
                }, this);
            }
            this.nLuces = k;
        },

        /** Halos de los faroles del dibujo (se encienden en cadena cuando un vehículo viaja). */
        armarFaroles: function (keep) {
            var L = this.L;
            this.faroles = [];
            if (!L.faroles) return;
            var s = L.fondo.s;
            L.faroles.forEach(function (f) {
                var h = keep(this.add.circle(f.x, f.y, 22 * s, 0xfff3bf, 0).setDepth(0.55));
                var c = keep(this.add.circle(f.x, f.y, 8 * s, 0xffe066, 0).setDepth(0.56));
                this.faroles.push({ halo: h, luz: c });
            }, this);
        },

        encenderFaroles: function (quedan) {
            var self = this;
            (this.faroles || []).forEach(function (f, i) {
                self.time.delayedCall(i * 140, function () {
                    if (!f.halo.active) return;
                    self.tweens.add({ targets: f.halo, fillAlpha: 0.55, duration: 220 });
                    self.tweens.add({ targets: f.luz, fillAlpha: 0.95, duration: 220 });
                    if (!quedan) {
                        self.tweens.add({ targets: [f.halo, f.luz], fillAlpha: 0, duration: 600, delay: 2600 });
                    }
                });
            });
        },

        /** Luces de la pista: una ola que corre hacia la derecha (más rápida mientras despega). */
        paso: function (time) {
            var n = this.nLuces || 0;
            if (!n || !this.lucesPista) return;
            var vel = this.despegando ? 45 : 140;
            var ola = (time / vel) % (n + 6);
            this.lucesPista.forEach(function (l) {
                var d = ola - l.k;
                var a = d >= 0 && d < 3 ? 1 - d / 3 : 0;
                l.halo.fillAlpha = 0.12 + a * 0.6;
                l.luz.fillAlpha = 0.45 + a * 0.55;
            });
        },

        pintarAlfombra: function (x, w, h) {
            var L = this.L, A0 = L.alf;
            // Piso de la habitación alrededor.
            var g = x.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, '#c99a6a'); g.addColorStop(1, '#a8794a');
            x.fillStyle = g; x.fillRect(0, 0, w, h);
            K.grano(x, 0, 0, w, h, Math.round(w * h / 600), ['#7a4a1c', '#f0c58c'], 1.2, 0.3);
            // Alfombra: borde de tela azul con costura.
            K.sombra(x, A0.x + A0.w / 2, A0.y + A0.h, A0.w * 0.55, 18, 0.35);
            x.fillStyle = '#1971c2'; K.rr(x, A0.x - 8, A0.y - 8, A0.w + 16, A0.h + 16, 18); x.fill();
            x.strokeStyle = 'rgba(255,255,255,0.6)'; x.setLineDash([7, 6]); x.lineWidth = 2;
            K.rr(x, A0.x - 3, A0.y - 3, A0.w + 6, A0.h + 6, 14); x.stroke(); x.setLineDash([]);
            // Pasto impreso.
            x.fillStyle = '#8ce99a'; x.fillRect(A0.x, A0.y, A0.w, A0.h);
            K.grano(x, A0.x, A0.y, A0.w, A0.h, Math.round(A0.w * A0.h / 300), ['#69db7c', '#b2f2bb', '#51cf66'], 1.4, 0.4);
            // Lago y árboles impresos.
            x.fillStyle = '#74c0fc'; x.beginPath(); x.ellipse(A0.x + A0.w * 0.86, A0.y + A0.h * 0.82, A0.w * 0.08, A0.h * 0.08, 0, 0, Math.PI * 2); x.fill();
            x.fillStyle = '#a5d8ff'; x.beginPath(); x.ellipse(A0.x + A0.w * 0.85, A0.y + A0.h * 0.8, A0.w * 0.045, A0.h * 0.035, 0, 0, Math.PI * 2); x.fill();
            for (var i = 0; i < 7; i++) {
                var tx = A0.x + A0.w * (0.66 + (i % 4) * 0.08), ty = A0.y + A0.h * (0.68 + Math.floor(i / 4) * 0.16) + (i % 2) * 8;
                if (tx > A0.x + A0.w - 20) continue;
                x.fillStyle = 'rgba(0,0,0,0.15)'; x.beginPath(); x.ellipse(tx + 4, ty + 6, 15, 7, 0, 0, Math.PI * 2); x.fill();
                x.fillStyle = '#2f9e44'; x.beginPath(); x.arc(tx, ty, 14, 0, Math.PI * 2); x.fill();
                x.fillStyle = '#40c057'; x.beginPath(); x.arc(tx - 4, ty - 4, 8, 0, Math.PI * 2); x.fill();
            }
            var R = L.rutas, ancho = L.tam * 0.55;
            var xb = L.conn - ancho * 0.6, wb = A0.x + A0.w - xb;
            // Pista de aterrizaje.
            x.fillStyle = '#495057'; x.fillRect(xb, R.pista.y - ancho * 0.6, wb, ancho * 1.2);
            x.fillStyle = '#ffffff';
            for (var px = xb + ancho * 2.2; px < A0.x + A0.w; px += 46) x.fillRect(px, R.pista.y - 3, 26, 6);
            for (var k = 0; k < 6; k++) x.fillRect(xb + ancho * 1.4, R.pista.y - ancho * 0.5 + k * ancho * 0.2, 18, ancho * 0.1);
            x.fillStyle = '#ffd43b';
            for (var lx = xb + ancho * 1.4; lx < A0.x + A0.w; lx += 34) { x.beginPath(); x.arc(lx, R.pista.y - ancho * 0.62, 3, 0, Math.PI * 2); x.arc(lx, R.pista.y + ancho * 0.62, 3, 0, Math.PI * 2); x.fill(); }
            // Vía del tren: durmientes y rieles.
            var yv = R.via.y;
            x.fillStyle = '#8d6e63';
            for (var dx = xb; dx < A0.x + A0.w; dx += 16) x.fillRect(dx, yv - ancho * 0.42, 9, ancho * 0.84);
            x.fillStyle = '#adb5bd';
            x.fillRect(xb, yv - ancho * 0.28, wb, 4);
            x.fillRect(xb, yv + ancho * 0.24, wb, 4);
            // Estación impresa al final de la vía.
            var ex = A0.x + A0.w - L.tam * 0.9;
            x.fillStyle = '#ffa94d'; x.fillRect(ex, yv - ancho * 1.25, L.tam * 0.75, ancho * 0.7);
            x.fillStyle = '#e8590c'; x.beginPath(); x.moveTo(ex - 6, yv - ancho * 1.25); x.lineTo(ex + L.tam * 0.375, yv - ancho * 1.7); x.lineTo(ex + L.tam * 0.75 + 6, yv - ancho * 1.25); x.fill();
            // Calle con línea amarilla.
            var yc = R.calle.y;
            x.fillStyle = '#5c5f66'; x.fillRect(xb, yc - ancho * 0.6, wb, ancho * 1.2);
            x.fillStyle = '#ffd43b';
            for (var cx = xb + ancho * 1.4; cx < A0.x + A0.w; cx += 40) x.fillRect(cx, yc - 2, 22, 4);
            // Hospital con cruz roja al final de la calle.
            var hx = A0.x + A0.w - L.tam * 0.85;
            x.fillStyle = '#ffffff'; x.fillRect(hx, yc + ancho * 0.7, L.tam * 0.7, ancho * 0.9);
            x.fillStyle = '#e03131'; x.fillRect(hx + L.tam * 0.3, yc + ancho * 0.78, L.tam * 0.1, ancho * 0.7); x.fillRect(hx + L.tam * 0.18, yc + ancho * 1.05, L.tam * 0.34, ancho * 0.16);
            // Avenida de salida: calle con vía de tranvía, desde el pasillo del estacionamiento hasta la pista.
            var ya = R.pista.y - ancho * 0.6, yb = L.pasillo + ancho * 0.6;
            x.fillStyle = '#5c5f66'; x.fillRect(L.conn - ancho * 0.6, ya, ancho * 1.2, yb - ya);
            x.fillStyle = '#adb5bd';
            x.fillRect(L.conn - ancho * 0.26, ya, 4, yb - ya);
            x.fillRect(L.conn + ancho * 0.22, ya, 4, yb - ya);
            x.fillStyle = '#ffffff';
            for (var zy = ya + 10; zy < yb; zy += 34) x.fillRect(L.conn - 2, zy, 4, 16);
            // Estacionamiento: pasillo arriba y bahías pintadas abajo.
            var e = L.est;
            x.fillStyle = '#5c5f66'; x.fillRect(L.conn - ancho * 0.6, L.pasillo - ancho * 0.6, e.x + e.w - L.conn + ancho * 0.6, ancho * 1.2);
            x.fillStyle = '#868e96'; K.rr(x, e.x, L.pasillo + ancho * 0.6, e.w, e.y + e.h - L.pasillo - ancho * 0.6, 10); x.fill();
            x.strokeStyle = '#ffffff'; x.lineWidth = 3;
            for (var b = 0; b <= 5; b++) { x.beginPath(); x.moveTo(e.x + e.w * b / 5, L.pasillo + ancho * 0.7); x.lineTo(e.x + e.w * b / 5, e.y + e.h - 6); x.stroke(); }
            x.fillStyle = '#ffd43b';
            for (var px2 = L.conn + ancho; px2 < e.x + e.w; px2 += 40) x.fillRect(px2, L.pasillo - 2, 22, 4);
            x.fillStyle = '#ffffff'; x.font = 'bold ' + Math.round(ancho * 0.6) + 'px Fredoka, sans-serif';
            x.fillText('P', e.x + 8, e.y + e.h - 10);
        },

        /* ── Vehículos ── */

        tipoDe: function (id) { return CAMINO[id] || 'calle'; },

        estacionar: async function (ids) {
            var self = this;
            var L = this.L;
            var n = ids.length;
            // Los que ya viajaron quedan como recuerdo en la acera: no se borran.
            this.autos.forEach(function (c) { if (c.estado !== 'recuerdo' && c.actor.cont.active) c.actor.destruir(); });
            this.autos = [];
            this.vivos = this.coleccion.slice();
            var proms = ids.map(function (id, k) {
                var b = self.bahia(k, n);
                var a = Act.crear(self, id, -L.tam, b.y - L.tam * 0.3, L.tam);
                if (a.animarIdle) a.animarIdle(false);
                a.sonido = self.sonidoDe(id);
                a.cont.setDepth(20 + k * 0.01);
                var c = { id: id, actor: a, k: k, n: n, base: b, estado: 'llega' };
                self.autos.push(c);
                self.vivos.push(a);
                // Llegan rodando desde la izquierda a su bahía.
                return esperar(self, k * 180).then(function () {
                    return tw(self, { targets: a.cont, x: b.x, duration: 700 + k * 60, ease: 'Cubic.easeOut' });
                }).then(function () {
                    // Si la pantalla cambió de tamaño mientras llegaba, se acomoda en su bahía actual.
                    var bb = self.bahia(c.k, n);
                    c.base = bb;
                    a.cont.setPosition(bb.x, bb.y - self.L.tam * 0.3).setScale(self.L.tam / a.tam);
                    c.estado = 'quieto';
                });
            });
            K.ruido({ f: 400, q: 0.6, dur: 0.6, vol: 0.06 });
            await Promise.all(proms);
        },

        autoEn: function (x, y) {
            var L = this.L;
            var mejor = null, dmin = L.tam * 0.6;
            this.autos.forEach(function (c) {
                if (c.estado !== 'quieto') return;
                var d = Math.hypot(x - c.actor.cont.x, y - c.actor.cont.y);
                if (d < dmin) { dmin = d; mejor = c; }
            });
            return mejor;
        },

        disponibles: function () { return this.autos.filter(function (c) { return c.estado === 'quieto'; }).map(function (c) { return c.id; }); },

        /* ── Entrada: tocar = oír; arrastrar = llevar por su camino ── */

        alTocar: function (p) {
            if (this.fase !== 'jugar') return;
            var c = this.autoEn(p.x, p.y);
            if (!c) return;
            this.pista.reiniciar();
            c.ruta = this.ruta(this.tipoDe(c.id), { x: c.base.x, y: c.base.y - this.L.tam * 0.3 });
            c.d = 0;
            c.estado = 'llevando';
            c.t0 = this.time.now;
            c.sono = false;
            this.llevado = c;
            this.dibujarRuta(c, 0xffffff);
            c.actor.cont.setDepth(40);
            this.tweens.add({ targets: c.actor.cont, scale: (this.L.tam / c.actor.tam) * 1.12, duration: 120 });
            K.tono({ f: 900, dur: 0.05, vol: 0.05 });
        },

        alMover: function (p) {
            var c = this.llevado;
            if (!c) return;
            var r = c.ruta;
            var total = r.acc[r.acc.length - 1];
            var pr = proyectar(r, p.x, p.y, c.d - 20, c.d + 90);
            if (pr.dist > this.L.tam * 1.6) return;       // el dedo se fue lejos del camino
            if (pr.d > c.d) {
                c.d = pr.d;
                var q = puntoEn(r, c.d);
                var a = c.actor.cont;
                a.x = q.x; a.y = q.y;
                var dir = q.dx >= 0 ? 1 : -1;
                a.scaleX = Math.abs(a.scaleX) * dir;
                a.angle = Math.max(-25, Math.min(25, Math.atan2(q.dy, Math.abs(q.dx)) * 57 * 0.5));
                if (this.time.now - (this.ultMotor || 0) > 140) { this.ultMotor = this.time.now; K.ruido({ f: 220, q: 1.5, dur: 0.12, vol: 0.05 }); }
                this.dibujarRuta(c, 0xffffff);
            }
            // Si no es el que suena, a mitad de camino se frena.
            if (c.id !== this.objetivo && c.d > total * 0.3 && !c.frenado) { c.frenado = true; this.llevado = null; this.devolver(c, true); return; }
            if (c.d >= total - 4) { this.llevado = null; this.viajar(c); }
        },

        alSoltar: function () {
            var c = this.llevado;
            if (!c) return;
            this.llevado = null;
            // Solo un toque: el vehículo suena (para comparar) y vuelve; sin error.
            if (c.d < this.L.tam * 0.3) {
                if (!this.sonando) this.escuchar(c.actor.sonido, { breve: true, vol: 0.75, bocina: false });
                c.actor.saltito(0.08, 1);
                this.devolver(c, false);
                return;
            }
            this.devolver(c, false);
        },

        dibujarRuta: function (c, color) {
            var g = this.rastroG;
            g.clear();
            var r = c.ruta;
            // Camino punteado por delante, lleno por detrás.
            for (var d = 0; d < r.acc[r.acc.length - 1]; d += 18) {
                var p = puntoEn(r, d);
                if (d < c.d) { g.fillStyle(0xffe066, 0.9); g.fillCircle(p.x, p.y, 5); } else { g.fillStyle(color, 0.75); g.fillCircle(p.x, p.y, 4); }
            }
        },

        devolver: async function (c, error) {
            var self = this;
            var a = c.actor;
            if (error) await this.fallar(a);
            var o = { d: c.d };
            var r = c.ruta;
            await tw(this, {
                targets: o, d: 0, duration: Math.min(900, 200 + c.d * 1.5), ease: 'Sine.easeInOut',
                onUpdate: function () {
                    var q = puntoEn(r, o.d);
                    a.cont.x = q.x; a.cont.y = q.y;
                    c.d = o.d;
                    if (r) self.dibujarRuta(c, error ? 0xff8787 : 0xffffff);
                }
            });
            a.cont.setScale(this.L.tam / a.tam).setAngle(0).setDepth(20 + c.k * 0.01);
            this.rastroG.clear();
            c.estado = 'quieto';
            c.frenado = false;
        },

        /** Llegó al final de su camino: hace su viaje y se va. */
        viajar: async function (c) {
            var self = this;
            var L = this.L;
            var a = c.actor;
            c.estado = 'viaje';
            this.rastroG.clear();
            this.fase = 'premio';
            a.cont.setAngle(0);
            // Celebra al final de su camino (ahí se ve entero) y después hace su viaje de verdad.
            await this.celebrar(a, { punto: { x: a.cont.x, y: a.cont.y - L.tam * 0.3 } });
            if (!this.ctx.vivo()) return;
            this.encenderFaroles(false);
            await this.salirDeViaje(c);
            if (!this.ctx.vivo()) return;
            // Vuelve del viaje y se estaciona en la acera de arriba, donde se queda como recuerdo.
            var k = this.coleccion.length;
            var dest = this.lugarRecuerdo(k);
            this.coleccion.push(a);
            c.estado = 'recuerdo';
            var esc = dest.rel * L.tam / a.tam;
            a.cont.setVisible(true).setAlpha(1).setAngle(0).setScale(esc).setDepth(30 + k * 0.01);
            a.cont.setPosition(-L.tam, dest.y);
            var o = { t: 0 };
            var x0 = -L.tam;
            await tw(this, {
                targets: o, t: 1, duration: Ut.reducido() ? 1 : 900 + dest.x * 0.4, ease: 'Sine.easeOut',
                onUpdate: function () {
                    a.cont.x = x0 + (dest.x - x0) * o.t;
                    a.cont.y = dest.y - Math.abs(Math.sin(o.t * Math.PI * 4)) * L.tam * 0.05 * (1 - o.t);
                }
            });
            if (a.saltito) a.saltito(0.06, 1);
            await this.seguir();
        },

        /**
         * El viaje: el avión acelera por la pista, despega y se pierde en el cielo; el tren pita y
         * sale echando humo; la ambulancia sale con su luz y su sirena; los demás tocan bocina y se van.
         */
        salirDeViaje: async function (c) {
            var self = this;
            var L = this.L;
            var a = c.actor;
            var cont = a.cont;
            var x0 = cont.x, y0 = cont.y;
            var e0 = Math.abs(cont.scaleY);
            cont.scaleX = e0;
            if (Ut.reducido()) { cont.setVisible(false); return; }
            if (c.id === 'avion') {
                var sombra = this.add.ellipse(x0, y0 + L.tam * 0.25, L.tam * 0.8, L.tam * 0.2, 0x000000, 0.18).setDepth(cont.depth - 0.1);
                var xFin = L.W + L.tam * 2;
                var o = { t: 0 };
                this.despegando = true;
                K.ruido({ f: 700, q: 0.5, dur: 1.4, vol: 0.07 });
                await tw(this, {
                    targets: o, t: 1, duration: 2300, ease: 'Linear',
                    onUpdate: function () {
                        var t = o.t;
                        var x = x0 + (xFin - x0) * t * t;
                        var alto = Math.max(0, (t - 0.32) / 0.68);
                        var sube = alto * alto;
                        cont.x = x;
                        cont.y = y0 - sube * (y0 + L.tam);
                        cont.angle = -18 * Math.min(1, alto * 2.2);
                        cont.setScale(e0 * (1 + sube * 0.45));
                        sombra.setPosition(x - sube * L.tam * 0.6, y0 + L.tam * 0.25).setScale(1 - sube * 0.5).setAlpha(1 - alto);
                    }
                });
                this.despegando = false;
                sombra.destroy();
                cont.setVisible(false);
                return;
            }
            var dur = 1700;
            var humo = null, sirena = null, luz = null;
            if (c.id === 'tren') {
                K.tono({ f: 880, f2: 840, dur: 0.35, vol: 0.07, tipo: 'triangle' });
                this.time.delayedCall(420, function () { K.tono({ f: 880, f2: 820, dur: 0.6, vol: 0.07, tipo: 'triangle' }); });
                humo = this.time.addEvent({
                    delay: 150, loop: true, callback: function () {
                        Ut.estallido(self, cont.x + L.tam * 0.25, cont.y - L.tam * 0.45, { n: 2, tex: 'humo', tam: 26, dist: 40, angulo: -Math.PI / 2 - 0.5, abanico: 0.5, depth: 45 });
                    }
                });
            } else if (c.id === 'ambulancia') {
                // Luz que destella arriba y sirena de dos tonos.
                luz = this.add.circle(0, -a.tam * 0.42, a.tam * 0.07, 0xff3b3b, 1);
                cont.add(luz);
                var alterna = 0;
                sirena = this.time.addEvent({
                    delay: 260, loop: true, callback: function () {
                        alterna = 1 - alterna;
                        luz.fillColor = alterna ? 0x339af0 : 0xff3b3b;
                        K.tono({ f: alterna ? 960 : 770, dur: 0.24, vol: 0.05, tipo: 'triangle' });
                    }
                });
                dur = 2000;
            } else {
                K.tono({ f: 520, dur: 0.12, vol: 0.06, tipo: 'square' });
                this.time.delayedCall(170, function () { K.tono({ f: 520, dur: 0.16, vol: 0.06, tipo: 'square' }); });
            }
            var p = { t: 0 };
            var xF = L.W + L.tam * 2;
            var ultMotor = 0;
            await tw(this, {
                targets: p, t: 1, duration: dur, ease: 'Quad.easeIn',
                onUpdate: function () {
                    cont.x = x0 + (xF - x0) * p.t;
                    cont.y = y0 - Math.abs(Math.sin(p.t * 40)) * 1.5;
                    if (self.time.now - ultMotor > 180) { ultMotor = self.time.now; K.ruido({ f: 240, q: 1.4, dur: 0.12, vol: 0.04 }); }
                }
            });
            if (humo) humo.remove();
            if (sirena) sirena.remove();
            if (luz) luz.destroy();
            cont.setVisible(false);
        },

        /** Los que ya viajaron quedan estacionados chiquitos junto al parque de la alfombra. */
        lugarRecuerdo: function (k) {
            var L = this.L, A0 = L.alf, e = L.est;
            if (L.aceraCentro) {
                // En la acera de arriba (bajo los faroles), en fila desde la avenida.
                var rel = 0.62;
                var x0a = L.conn + L.tam * 0.45;
                var xMax = L.W - L.tam * 0.5;
                var pasoA = Math.min(L.tam * 0.72, (xMax - x0a) / 9);
                return { x: x0a + k * pasoA, y: L.aceraCentro - L.tam * 0.04, rel: rel, esc: rel };
            }
            var esc = 0.5;
            var paso = L.tam * 0.5;
            if (L.lago) {
                // En el pasto junto al lago, a la derecha del estacionamiento.
                var xa = e.x + e.w + paso * 0.7, xb = (L.pres ? L.W - 150 : L.W - 10) - paso * 0.5;
                if (xb - xa < paso) {
                    // Pantalla angosta: no hay pasto junto al lago; se quedan en la acera de arriba.
                    var x0 = L.conn + paso, porFila = Math.max(1, Math.floor((L.W - 10 - x0) / paso) + 1);
                    return { x: x0 + (k % porFila) * paso, y: L.acera - Math.floor(k / porFila) * paso * 0.8, esc: esc };
                }
                var cols = Math.max(1, Math.floor((xb - xa) / paso) + 1);
                return { x: xa + (k % cols) * paso, y: e.y + paso * 0.6 + Math.floor(k / cols) * paso * 0.8, esc: esc };
            }
            var x0 = e.x + e.w + paso * 0.8;
            var max = Math.max(1, Math.floor((A0.x + A0.w - 150 - x0) / paso));
            return { x: x0 + (k % max) * paso, y: e.y + e.h * 0.25 + Math.floor(k / max) * paso * 0.8, esc: esc };
        },

        anunciar: function () {
            // Nivel 3 y 4: el sonido llega de lejos (más bajo y del costado).
            var lejos = this.nv && this.nv.dificil;
            return this.escuchar(this.sonidoDe(this.objetivo), lejos ? { vol: 0.6, pan: 0.6 } : {});
        },

        planNiveles: function () { return this.planBase({ extra: EXTRA, n: [3, 4, 5, 5] }); },

        prepararNivel: async function (i, nv) { await this.estacionar(nv.ids); },

        mostrarPista: function (cancelada) {
            var self = this;
            var c = this.autos.filter(function (q) { return q.id === self.objetivo && q.estado === 'quieto'; })[0];
            if (this.fase !== 'jugar' || !c || this.sonando) return Promise.resolve();
            var r = this.ruta(this.tipoDe(c.id), { x: c.base.x, y: c.base.y - this.L.tam * 0.3 });
            var fin = puntoEn(r, r.acc[r.acc.length - 1] * 0.45);
            return this.ctx.mano({
                punto: { x: c.actor.cont.x, y: c.actor.cont.y }, holdMs: 300,
                arrastre: { dx: fin.x - c.actor.cont.x, dy: fin.y - c.actor.cont.y, durMs: 1200 },
                cancelado: function () { return cancelada() || self.fase !== 'jugar' || !!self.llevado; }
            });
        },

        estadoExtra: function () {
            return this.autos.map(function (c) { return { id: c.id, estado: c.estado, x: Math.round(c.actor.cont.x), y: Math.round(c.actor.cont.y) }; });
        },

        zonaFiesta: function () { var L = this.L; return { x: L.alf.x + 20, y: L.rutas.calle.y, w: L.alf.w * 0.8 }; },

        antesDeFiesta: async function () {
            this.encenderFaroles(true);
            this.autos.forEach(function (c) { if (c.estado === 'quieto') c.actor.cont.setAlpha(0.3); });
        },

        /* ── Escena final: desfile por la ciudad. Todos los que viajaron salen a la vez por su camino
              (pista, vía o calle), suenan al pasar el cruce, el tren echa humo y el avión despega,
              da una vuelta sobre la alfombra y aterriza. ── */

        escenaFinal: async function () {
            var self = this;
            var L = this.L, A0 = L.alf;
            var vistos = {};
            var lista = this.coleccion.filter(function (a) { if (!a.cont || !a.cont.active || vistos[a.id]) return false; vistos[a.id] = 1; return true; });
            // Los de niveles anteriores se destruyen al estacionar el nivel siguiente: se recrean
            // en el estacionamiento de recuerdos para que desfilen todos los que viajaron.
            this.coleccion.forEach(function (a) {
                if (vistos[a.id]) return;
                vistos[a.id] = 1;
                var d = self.lugarRecuerdo(lista.length);
                var nuevo = Act.crear(self, a.id, d.x, d.y, L.tam);
                if (nuevo.animarIdle) nuevo.animarIdle(false);
                nuevo.sonido = self.sonidoDe(a.id);
                nuevo.cont.setScale(d.rel ? d.rel * L.tam / nuevo.tam : d.esc).setDepth(40);
                lista.push(nuevo);
            });
            this.coleccion.forEach(function (a) { if (lista.indexOf(a) < 0 && a.cont && a.cont.active) a.cont.setVisible(false); });
            this.autos.forEach(function (c) { if (lista.indexOf(c.actor) < 0) self.tweens.add({ targets: c.actor.cont, alpha: 0, duration: 300 }); });
            this.rastroG.clear();
            if (!lista.length) return;
            var tamV = L.tam * 0.85;
            var porTipo = {};
            var plan = lista.map(function (a) {
                var tipo = self.tipoDe(a.id);
                var idx = porTipo[tipo] = (porTipo[tipo] || 0) + 1;
                return { a: a, tipo: tipo, idx: idx - 1, y: L.rutas[tipo].y };
            });
            plan.forEach(function (p) { p.cuantos = porTipo[p.tipo]; });
            // 1) Cada uno salta del estacionamiento al comienzo de su camino (en fila si comparten).
            await Promise.all(plan.map(function (p, k) {
                var x = L.conn + tamV * (0.4 + (p.cuantos - 1 - p.idx) * 1.05);
                p.x0 = x;
                p.x1 = A0.x + A0.w - tamV * (0.6 + p.idx * 1.05);
                p.a.cont.setVisible(true).setAlpha(1).setAngle(0).setDepth(40 + p.y * 0.001);
                return esperar(self, k * 140).then(function () {
                    K.ruido({ f: 900, q: 2, dur: 0.06, vol: 0.05 });
                    return self.saltarA(p.a.cont, x, p.y, { ms: 480, alto: L.tam * 0.6, esc: tamV / p.a.tam });
                });
            }));
            await esperar(this, 300);
            if (!this.sigue()) return;
            // 2) ¡Salen todos a la vez! Cada uno suena al pasar el cruce del medio.
            var o = { t: 0 };
            var xCruce = A0.x + A0.w * 0.5;
            plan.forEach(function (p) { p.sono = false; });
            var ultHumo = 0, ultMotor = 0;
            await tw(this, {
                targets: o, t: 1, duration: 3600, ease: 'Sine.easeInOut',
                onUpdate: function () {
                    plan.forEach(function (p) {
                        var c = p.a.cont;
                        c.x = p.x0 + (p.x1 - p.x0) * o.t;
                        c.y = p.y - Math.abs(Math.sin(o.t * 50 + p.idx)) * 2;
                        if (!p.sono && c.x > xCruce - tamV * 0.2 * p.idx) {
                            p.sono = true;
                            self.escuchar(p.a.sonido, { breve: true, bocina: false, vol: 0.7 });
                            if (p.a.saltito) p.a.saltito(0.08, 1);
                        }
                        if (p.a.id === 'tren' && self.time.now - ultHumo > 220) {
                            ultHumo = self.time.now;
                            Ut.estallido(self, c.x + tamV * 0.25, c.y - tamV * 0.45, { n: 2, tex: 'humo', tam: 22, dist: 36, angulo: -Math.PI / 2, abanico: 0.6, depth: 45 });
                        }
                    });
                    if (self.time.now - ultMotor > 260) { ultMotor = self.time.now; K.ruido({ f: 200, q: 1.4, dur: 0.14, vol: 0.04 }); }
                }
            });
            if (!this.sigue()) return;
            // 3) El avión despega, da una vuelta sobre la alfombra y aterriza en su pista.
            var av = plan.filter(function (p) { return p.a.id === 'avion'; })[0];
            if (av) {
                // La alfombra se ve desde arriba: el avión "sube" agrandándose y su sombra queda en el piso.
                var c = av.a.cont, e0 = c.scaleY;
                var cx = A0.x + A0.w * 0.5, cy = A0.y + A0.h * 0.42, rx = A0.w * 0.34, ry = Math.abs(cy - av.y);
                var xs = c.x, ys = c.y;
                var sombra = this.add.ellipse(xs, ys + tamV * 0.25, tamV * 0.8, tamV * 0.22, 0x000000, 0.18).setDepth(39);
                c.setDepth(60);
                var k2 = { t: 0 };
                var prevX = xs;
                K.ruido({ f: 1200, q: 0.6, dur: 0.6, vol: 0.06 });
                await tw(this, {
                    targets: k2, t: 1, duration: 3000, ease: 'Sine.easeInOut',
                    onUpdate: function () {
                        var t = k2.t, ang = t * Math.PI * 2;
                        var alto = Math.sin(t * Math.PI);                  // 0 en la pista, 1 en lo más alto
                        var ox = cx + Math.sin(ang) * rx, oy = cy - Math.cos(ang) * ry;
                        var x = xs + (ox - xs) * Math.min(1, alto * 2), y = ys + (oy - ys) * Math.min(1, alto * 2);
                        var dir = x >= prevX ? 1 : -1;
                        prevX = x;
                        c.x = x; c.y = y - alto * tamV * 0.5;
                        c.scaleY = e0 * (1 + alto * 0.35);
                        c.scaleX = c.scaleY * dir;
                        sombra.setPosition(x, y + tamV * 0.25).setScale(1 - alto * 0.3).setAlpha(1 - alto * 0.4);
                    }
                });
                c.scaleX = Math.abs(c.scaleY); c.angle = 0;
                sombra.destroy();
                c.setDepth(40 + av.y * 0.001);
                K.ruido({ f: 500, q: 0.8, dur: 0.25, vol: 0.06 });
            }
            await esperar(this, 300);
        },

        demo: async function () {
            var self = this;
            var ctx = this.ctx;
            var t = ctx.textos || {};
            var L = this.L;
            this.fase = 'demo';
            // En la alfombra no hay vacas: la demo usa el tren y la moto.
            var ids = ['motocicleta', 'tren'];
            var limpiar = function () {
                ctx.quitarMano();
                self.rastroG.clear();
                self.autos.forEach(function (c) { if (c.actor.cont.active) c.actor.destruir(); });
                self.autos = [];
                self.vivos = [];
            };
            await ctx.decir({ voz: 'zoe', texto: t.demostracion || '¡Mira cómo se juega!' }, { minMs: 1600 });
            if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
            await this.estacionar(ids);
            var b = L.bocina;
            var sonando = Promise.resolve();
            await ctx.mano({ punto: { x: b.x, y: b.y }, holdMs: 500, onPresionar: function () { sonando = self.escuchar('tren'); } });
            await sonando;
            var c = this.autos.filter(function (q) { return q.id === 'tren'; })[0];
            if (!ctx.vivo() || !ctx.enDemo() || !c) return limpiar();
            c.ruta = this.ruta('via', { x: c.base.x, y: c.base.y - L.tam * 0.3 });
            c.d = 0;
            var r = c.ruta, total = r.acc[r.acc.length - 1];
            var fin = puntoEn(r, total);
            var o = { d: 0 };
            await ctx.mano({
                punto: { x: c.actor.cont.x, y: c.actor.cont.y }, holdMs: 300,
                arrastre: { dx: fin.x - c.actor.cont.x, dy: fin.y - c.actor.cont.y, durMs: 1800, soltarEnDestino: true },
                onDuranteArrastre: function () {
                    self.tweens.add({ targets: o, d: total, duration: 1800, ease: 'Sine.easeInOut', onUpdate: function () { var q = puntoEn(r, o.d); c.actor.cont.setPosition(q.x, q.y); c.d = o.d; self.dibujarRuta(c, 0xffffff); } });
                }
            });
            if (!ctx.vivo()) return limpiar();
            self.rastroG.clear();
            K.efecto(this, 'recompensa');
            Ut.estallido(this, c.actor.cont.x - L.tam, c.actor.cont.y - L.tam * 0.3, { n: 14, tex: 'estrella', tam: 28, dist: 150, sinTinte: true, depth: 85 });
            await Promise.all([this.escuchar('tren', { breve: true, bocina: false }), c.actor.acierto(1500)]);
            await ctx.decir({ voz: 'zoe', texto: t.demostracionAcierto || '¡Así se hace!' }, { estado: 'acierto', minMs: 1300 });
            await ctx.decir({ voz: 'zoe', texto: t.demostracionFin || '¡Ahora te toca a ti!' }, { minMs: 1000 });
            limpiar();
        }
    };

    K.crear({
        id: 'alfombra',
        fondo: '#a8794a',
        pieles: ['ambulancia', 'avion', 'bicicleta', 'camion', 'gallo', 'motocicleta', 'tren', 'vaca'],
        escena: escena
    });
})(typeof window !== 'undefined' ? window : this);
