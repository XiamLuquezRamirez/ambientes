/**
 * «La cómoda del dormitorio» — motor propio de Escucha y asocia (3-4 años).
 *
 * Es de noche y el osito duerme. Algo suena GUARDADO dentro de la cómoda: se oye apagado, como
 * se oye de verdad a través de la madera. El niño TIRA de los cajones (los arrastra hacia abajo,
 * o los toca) para abrirlos; lo que hay adentro suena claro. Si es lo que sonaba, lo toca: sale
 * del cajón, hace su acción (el despertador repica y el osito se despierta) y se va a la repisa.
 * Si se equivoca, el juguete suena con su sonido y el cajón se cierra. Hay cajones con ropa.
 *
 * Niveles: 1 el reto · 2 otro sonido entre más juguetes · 3 al abrir el cajón el juguete no
 * suena solo (hay que recordar el sonido) · 4 el sonido cambia en cada acierto.
 */
(function (global) {
    'use strict';

    var K = global.AsociaKit;
    var Ut = global.PedniaParejaBase.util;
    var Act = global.AsociaActores;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var rnd = Ut.rnd;
    var EXTRA = ['telefono', 'avion', 'vaca', 'gallo', 'ambulancia'];
    var ROPA = [0xff8787, 0x74c0fc, 0xffd43b, 0x8ce99a, 0xb197fc];
    var A = global.PedniaArte;

    /** Imágenes del diseño (img/): las de ¿Qué suena? + la ambulancia y el dormitorio. */
    var DISENO = 'img/';
    var PIELES = ['avion', 'bicicleta', 'gallo', 'reloj', 'telefono', 'tren', 'vaca', 'ambulancia'];
    /**
     * Muebles dentro de fondo.png (1281×721), medidos sobre la imagen. La cómoda no viene en el
     * dibujo: se pinta en la zona libre de la derecha, apoyada en el piso.
     */
    var CUARTO = {
        fw: 1281, fh: 721,
        piso: 431,                                   // borde de abajo del zócalo
        cama: { x: 10, x1: 586, y: 348 },            // colchón
        repisa: { x: 33, x1: 367, y: 168 },
        comoda: { x: 820, x1: 1140, y: 262, y1: 530 }
    };

    var escena = {
        preload: function () {
            var self = this;
            var svg = function (k, f, w, h) { if (!self.textures.exists(k)) self.load.svg(k, DISENO + f, { width: w, height: h }); };
            // El dormitorio sin el móvil colgante (fondo_sin_movil.png) + el móvil aparte (movil.png),
            // recortados del fondo.png del diseño, para que el móvil gire.
            if (!this.textures.exists('ea_fondo')) this.load.image('ea_fondo', DISENO + 'fondo_sin_movil.png');
            if (!this.textures.exists('ea_movil')) this.load.image('ea_movil', DISENO + 'movil.png');
            PIELES.forEach(function (id) { svg('ea_' + id, id + '.svg', 420, 420); });
            svg('ea_escuchar', 'escuchar.svg', 300, 300);
            [64, 128, 256].forEach(function (t) { svg('pa:estrella@' + t, 'estrella.svg', t, t); });
        },

        iniciar: function () {
            var self = this;
            PIELES.forEach(function (id) { if (self.textures.exists('ea_' + id)) Act.piel(id, 'ea_' + id); });
            this.cajones = []; this.osoDespierto = 0;
        },

        /** HUD como ¿Qué suena?: botón de la oreja y estrellas en placa rosada. */
        montarHud: function (keep) {
            var L = this.L;
            var b = keep(this.add.container(L.bocina.x, L.bocina.y).setDepth(80));
            var halo = this.add.circle(0, 0, L.bocina.r * 1.25, 0xffffff, 0.35);
            if (this.textures.exists('ea_escuchar')) {
                b.add([halo, this.add.image(0, 0, 'ea_escuchar').setDisplaySize(L.bocina.r * 2.3, L.bocina.r * 2.3)]);
            } else {
                var plato = this.add.circle(0, 0, L.bocina.r, 0xff922b).setStrokeStyle(5, 0xffffff);
                b.add([halo, plato, this.add.image(0, 0, A.textura(this, 'bocina', 128)).setDisplaySize(L.bocina.r * 1.35, L.bocina.r * 1.35)]);
            }
            b.halo = halo;
            this.bocina = b;
            this.ondasG = keep(this.add.graphics().setDepth(79));
            this.estrellas = [];
            var n = 4;
            var x0 = L.bocina.x + L.bocina.r + 14;
            var libre = L.W - x0 - 10;
            var tam = Math.max(20, Math.min(40, L.bocina.r * 0.85, (libre - 12) / (n + 0.22 * (n - 1) + 0.6)));
            var pad = tam * 0.3, radio = tam * 0.34;
            var w = tam * n + tam * 0.22 * (n - 1) + pad * 2, h = tam + pad * 1.1, cy = L.bocina.y;
            if (L.marcador) { tam = Math.min(44, tam * 1.15); pad = tam * 0.3; radio = tam * 0.34; w = tam * n + tam * 0.22 * (n - 1) + pad * 2; h = tam + pad * 1.1; x0 = L.marcador.x - w / 2; cy = L.marcador.y; }
            var g = keep(this.add.graphics().setDepth(79.5));
            g.fillStyle(0xd62a7f, 1); g.fillRoundedRect(x0, cy - h / 2, w, h, radio);
            g.fillStyle(0xf74d9c, 1); g.fillRoundedRect(x0 + tam * 0.11, cy - h / 2 + tam * 0.11, w - tam * 0.22, h - tam * 0.22, radio * 0.82);
            for (var i = 0; i < n; i++) {
                var e = keep(this.add.image(x0 + pad + tam / 2 + i * (tam * 1.22), cy, A.textura(this, 'estrella', 128)).setDisplaySize(tam, tam).setDepth(80));
                if (i >= this.nivelActual) e.setTint(0x9b6f86).setAlpha(0.5);
                this.estrellas.push(e);
            }
            this.montarPresentador();
        },

        /**
         * Móvil colgante del diseño: cuelga del gancho (325, 172 en la imagen) y gira despacio sobre
         * su hilo; el ancho va y vuelve pasando de un lado a otro (como un objeto plano que da vueltas)
         * y se mece un poco. Al tocarlo da una vuelta rápida.
         */
        montarMovil: function (keep) {
            var L = this.L;
            if (!this.textures.exists('ea_movil')) return;
            var s = L.fondo.s;
            var m = keep(this.add.image(L.fondo.x + 325 * s, L.fondo.y + 172 * s, 'ea_movil')
                .setOrigin(47 / 96, 2 / 144).setScale(s).setDepth(-0.5));
            this.movil = m;
            var quieto = Ut.reducido && Ut.reducido();
            var giro = { t: 0, vel: 1 };
            m.giro = giro;
            var ancho = function (t) {
                var c = Math.cos(t);
                // Nunca llega a cero (no desaparece de canto): pasa de un lado al otro.
                return (c >= 0 ? 1 : -1) * (0.22 + 0.78 * Math.abs(c)) * s;
            };
            this.tweens.addCounter({
                from: 0, to: 1, duration: 1000, repeat: -1,
                onUpdate: function (tw) {
                    if (!m.active) return;
                    giro.t += (quieto ? 0.002 : 0.012) * giro.vel;
                    m.scaleX = ancho(giro.t);
                    m.angle = Math.sin(giro.t * 0.7) * (quieto ? 0.5 : 2.5);
                }
            });
            // Toque: una vuelta rápida que se va frenando.
            m.setInteractive({ useHandCursor: true });
            m.on('pointerdown', function () {
                giro.vel = 6;
                this.tweens.add({ targets: giro, vel: 1, duration: 1800, ease: 'Quad.easeOut' });
            }, this);
        },

        /**
         * Con el dormitorio del diseño: la imagen va abajo, de ancho completo (en vertical crece y
         * recorta los lados) y los muebles salen de sus medidas.
         */
        calcularConFondo: function (L) {
            var W = L.W, H = L.H, C = CUARTO;
            var s = Math.max(W / C.fw, H * 0.62 / C.fh);
            var ix = (W - C.fw * s) / 2, iy = H - C.fh * s;
            var px = function (u) { return ix + u * s; }, py = function (v) { return iy + v * s; };
            L.fondo = { x: ix, y: iy, s: s };
            if (W < 700) L.bocina.y = Math.max(L.bocina.y, 190);
            else {
                // La oreja a media altura de la ventana; las estrellas en la pared libre de la derecha.
                L.bocina.y = py(128);
                var pa = px(870), pb = Math.min(W - 12, px(1270));
                if (pb - pa > 160) L.marcador = { x: (pa + pb) / 2, y: py(150) };
            }
            L.y0 = py(C.piso);
            L.cama = { x: px(C.cama.x), y: py(C.cama.y), w: px(C.cama.x1) - px(C.cama.x), h: H * 0.2 };
            L.repisa = { x: px(C.repisa.x), y: py(C.repisa.y), w: px(C.repisa.x1) - px(C.repisa.x) };
            // Si la repisa del dibujo queda fuera (vertical, imagen recortada), se pinta otra visible.
            if (L.repisa.x < 8) {
                var rw = Math.min(L.repisa.w, W * 0.5);
                L.repisa = { x: 10, y: py(C.repisa.y), w: rw, propia: true };
            }
            var x0 = px(C.comoda.x), x1 = px(C.comoda.x1);
            // En pantalla angosta la cómoda no puede salirse por la derecha.
            if (x1 > W - 8) { x0 -= x1 - (W - 8); x1 = W - 8; }
            L.comoda = { x: x0, y: py(C.comoda.y), w: x1 - x0, h: py(C.comoda.y1) - py(C.comoda.y) };
            L.tam = Math.max(56, Math.min(120, L.comoda.h / 3 * 0.95, L.comoda.w / 2 * 0.7));
            return L;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            L.y0 = Math.round(H * 0.7);
            var hueco = Math.max(60, H * 0.2);
            L.bocina = { x: W / 2, y: Math.max(64, Math.min(116, 60 + hueco * 0.25)), r: Math.max(30, Math.min(42, hueco * 0.32)) };
            L.pres = W >= 760 ? { x: W - 78, piso: H - 104, alto: Math.min(170, H * 0.3) } : null;
            var der = L.pres ? W - 165 : W - 20;
            if (this.textures.exists('ea_fondo')) return this.calcularConFondo(L);
            // Cómoda: 3 filas × 2 columnas.
            var cw = Math.min(W * 0.46, 520, (der - W * 0.36));
            var ch = Math.min(H * 0.5, cw * 0.82);
            L.comoda = { x: Math.max(W * 0.36, der - cw - W * 0.02), y: L.y0 + H * 0.06 - ch, w: cw, h: ch };
            L.cama = { x: W * 0.02, y: L.y0 - H * 0.08, w: Math.min(W * 0.3, L.comoda.x - W * 0.05), h: H * 0.2 };
            // Repisa por encima de la cabecera de la cama.
            var cabecera = L.cama.y - L.cama.h * 0.9;
            L.repisa = { x: L.cama.x + L.cama.w * 0.14, y: Math.max(L.bocina.y + L.bocina.r + H * 0.1, cabecera - H * 0.06), w: Math.min(W * 0.26, L.comoda.x - L.cama.x - L.cama.w * 0.14 - W * 0.04) };
            L.tam = Math.max(64, Math.min(120, L.comoda.h / 3 * 0.95, L.comoda.w / 2 * 0.7));
            return L;
        },

        armar: function (reubicar) {
            var self = this;
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            if (L.fondo) {
                // Dormitorio del diseño. Si no llega arriba, la pared se completa estirando sus
                // primeras filas (rayas verticales).
                var tex = this.textures.get('ea_fondo');
                if (L.fondo.y > 0) {
                    if (!tex.has('arriba')) tex.add('arriba', 0, 0, 0, CUARTO.fw, 6);
                    keep(this.add.image(L.fondo.x, 0, 'ea_fondo', 'arriba').setOrigin(0, 0).setDisplaySize(CUARTO.fw * L.fondo.s, L.fondo.y + 2).setDepth(-1));
                }
                keep(this.add.image(L.fondo.x, L.fondo.y, 'ea_fondo', '__BASE').setOrigin(0, 0).setScale(L.fondo.s).setDepth(-1));
                this.montarMovil(keep);
            }
            K.textura(this, 'cuarto_fondo', L.W, L.H, function (x, w, h) { self.pintarCuarto(x, w, h); });
            keep(this.add.image(0, 0, 'cuarto_fondo').setOrigin(0, 0).setDepth(0));
            // Estrellitas fosforescentes pegadas en la pared: titilan; al tocarlas cruza una estrella fugaz.
            var V = this.montarVida(keep);
            if (V && !L.fondo) {
                // Estrellas fosforescentes repartidas por la pared (no sobre la bocina ni la cómoda).
                var techo = L.bocina.y + L.bocina.r + 12;
                V.estrellas({ x: 24, y: techo, w: L.bocina.x - L.bocina.r - 60, h: Math.max(30, L.repisa.y - techo - 50), depth: 1, pegatina: true }, 6);
                V.estrellas({ x: L.bocina.x + L.bocina.r + 140, y: techo, w: Math.max(40, L.W - L.bocina.x - L.bocina.r - 320), h: Math.max(30, L.comoda.y - techo - 40), depth: 1, pegatina: true }, 5);
                // Móvil colgante sobre la cama.
                V.movil(L.cama.x + L.cama.w * 0.6, L.repisa.y + 34, Math.min(130, L.cama.w * 0.6));
            }
            this.montarOso(keep);
            this.montarComoda(keep);
            this.montarHud(keep);
            // Lo ya ordenado en la repisa.
            this.coleccion.forEach(function (a, k) { var p = self.sitioRepisa(k); a.cont.setPosition(p.x, p.y).setScale(p.esc); });
        },

        pintarCuarto: function (x, w, h) {
            var L = this.L;
            // Con el dormitorio del diseño (cama, osito, repisa, ventana ya pintados) solo falta la cómoda.
            if (L.fondo) {
                if (L.repisa.propia) {
                    var r = L.repisa;
                    x.fillStyle = 'rgba(0,0,0,0.15)'; x.fillRect(r.x + 4, r.y + 6, r.w, 10);
                    K.madera(x, r.x, r.y, r.w, Math.max(10, h * 0.016), { r: 3, claro: '#d08a5c', medio: '#bf7655', oscuro: '#8f5333' });
                }
                this.pintarCuerpoComoda(x);
                return;
            }
            K.pared(x, w, L.y0, { arriba: '#e5dbff', abajo: '#d0bfff', raya: 'rgba(255,255,255,0.18)', motivo: 'rgba(255,255,255,0.35)' });
            K.piso(x, w, h, L.y0, { lejos: '#a9744a', cerca: '#cf9867' });
            // Ventana de noche con luna.
            var vw = Math.max(90, w * 0.14), vh = L.y0 * 0.38;
            var vx = w * 0.5 - vw * 1.4, vy = Math.max(L.bocina.y + L.bocina.r + 20, L.y0 * 0.16);
            if (vx > L.repisa.x + L.repisa.w + 10) K.ventana(x, vx, vy, vw, vh, { noche: true });
            // Alfombra.
            K.sombra(x, w * 0.42, h * 0.88, w * 0.2, h * 0.05, 0.2);
            x.fillStyle = '#f783ac'; K.rr(x, w * 0.24, h * 0.82, w * 0.34, h * 0.1, 30); x.fill();
            x.strokeStyle = '#fcc2d7'; x.lineWidth = 4; x.setLineDash([8, 6]);
            K.rr(x, w * 0.25, h * 0.83, w * 0.32, h * 0.08, 26); x.stroke(); x.setLineDash([]);
            // Repisa.
            var r = L.repisa;
            x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(r.x + 4, r.y + 6, r.w, 10);
            K.madera(x, r.x, r.y, r.w, Math.max(12, h * 0.022), { r: 3, claro: '#f1f3f5', medio: '#dee2e6', oscuro: '#adb5bd' });
            // Cama.
            var c = L.cama;
            K.sombra(x, c.x + c.w / 2, c.y + c.h + 6, c.w * 0.55, 12, 0.35);
            K.madera(x, c.x, c.y - c.h * 0.9, c.w * 0.1, c.h * 1.9, { vertical: true, r: 8 });                // cabecera
            K.madera(x, c.x + c.w * 0.92, c.y - c.h * 0.2, c.w * 0.08, c.h * 1.2, { vertical: true, r: 6 });   // pie
            x.fillStyle = '#ffffff'; K.rr(x, c.x + c.w * 0.08, c.y, c.w * 0.86, c.h * 0.55, 12); x.fill();
            var gc = x.createLinearGradient(0, c.y - c.h * 0.05, 0, c.y + c.h * 0.6);
            gc.addColorStop(0, '#74c0fc'); gc.addColorStop(1, '#339af0');
            x.fillStyle = gc; K.rr(x, c.x + c.w * 0.3, c.y - c.h * 0.08, c.w * 0.64, c.h * 0.7, 14); x.fill();
            x.fillStyle = 'rgba(255,255,255,0.35)';
            for (var i = 0; i < 4; i++) { x.beginPath(); x.arc(c.x + c.w * (0.4 + i * 0.13), c.y + c.h * 0.25, c.h * 0.06, 0, Math.PI * 2); x.fill(); }
            x.fillStyle = '#fff5f5'; K.rr(x, c.x + c.w * 0.1, c.y - c.h * 0.18, c.w * 0.24, c.h * 0.3, 14); x.fill();   // almohada
            // Mesita de noche con lámpara encendida.
            var mx = c.x + c.w + w * 0.01, my = L.y0 + h * 0.02;
            if (mx + w * 0.07 < L.comoda.x - 6) {
                K.sombra(x, mx + w * 0.035, my + 6, w * 0.05, 8, 0.3);
                K.madera(x, mx, my - h * 0.12, w * 0.07, h * 0.12, { r: 4 });
                x.fillStyle = '#ffe066'; x.beginPath(); x.moveTo(mx + w * 0.012, my - h * 0.17); x.lineTo(mx + w * 0.058, my - h * 0.17); x.lineTo(mx + w * 0.05, my - h * 0.22); x.lineTo(mx + w * 0.02, my - h * 0.22); x.fill();
                x.fillStyle = '#868e96'; x.fillRect(mx + w * 0.033, my - h * 0.17, 4, h * 0.05);
                var luz = x.createRadialGradient(mx + w * 0.035, my - h * 0.18, 4, mx + w * 0.035, my - h * 0.18, h * 0.22);
                luz.addColorStop(0, 'rgba(255,236,153,0.45)'); luz.addColorStop(1, 'rgba(255,236,153,0)');
                x.fillStyle = luz; x.fillRect(mx - h * 0.2, my - h * 0.4, h * 0.45, h * 0.45);
            }
            this.pintarCuerpoComoda(x);
        },

        /** Cuerpo de la cómoda (los frentes de los cajones son objetos aparte). */
        pintarCuerpoComoda: function (x) {
            var d = this.L.comoda;
            K.sombra(x, d.x + d.w / 2, d.y + d.h + 6, d.w * 0.55, 14, 0.4);
            K.madera(x, d.x - 10, d.y - 16, d.w + 20, 18, { r: 6, claro: '#f3d9a4', medio: '#e0b66f', oscuro: '#b9853c' });
            x.fillStyle = '#7a4a1c'; K.rr(x, d.x - 4, d.y, d.w + 8, d.h, 6); x.fill();
            x.fillStyle = '#5c3613';
            x.fillRect(d.x + d.w * 0.06, d.y + d.h, 12, 14); x.fillRect(d.x + d.w * 0.94 - 12, d.y + d.h, 12, 14);
        },

        /* ── Osito dormido en la cama (se despierta cuando suena el despertador) ── */

        montarOso: function (keep) {
            var L = this.L, c = L.cama;
            var t = Math.min(c.h * 0.7, 90);
            var o = keep(this.add.container(c.x + c.w * 0.22, c.y - t * 0.05).setDepth(5));
            var cafe = 0xb07d4f, claro = 0xe3b98c;
            o.add([
                this.add.circle(-t * 0.32, -t * 0.32, t * 0.16, cafe), this.add.circle(t * 0.32, -t * 0.32, t * 0.16, cafe),
                this.add.circle(-t * 0.32, -t * 0.32, t * 0.08, claro), this.add.circle(t * 0.32, -t * 0.32, t * 0.08, claro),
                this.add.circle(0, 0, t * 0.42, cafe),
                this.add.ellipse(0, t * 0.12, t * 0.36, t * 0.26, claro),
                this.add.ellipse(0, t * 0.04, t * 0.12, t * 0.08, 0x3b2410)
            ]);
            var ojos = this.add.graphics();
            o.add(ojos);
            o.ojos = ojos;
            o.t = t;
            this.oso = o;
            this.dibujarOjos(false);
            // El dormitorio del diseño ya trae su osito sobre la cama: el dibujado no se muestra.
            if (L.fondo) o.setVisible(false);
        },

        dibujarOjos: function (abiertos) {
            var o = this.oso, g = o.ojos, t = o.t;
            g.clear();
            if (abiertos === 'feliz') {
                // Ojitos felices (^ ^) y mejillas.
                g.lineStyle(3, 0x3b2410, 1);
                g.beginPath(); g.arc(-t * 0.15, -t * 0.08, t * 0.06, Math.PI + 0.2, -0.2); g.strokePath();
                g.beginPath(); g.arc(t * 0.15, -t * 0.08, t * 0.06, Math.PI + 0.2, -0.2); g.strokePath();
                g.fillStyle(0xff8787, 0.55); g.fillCircle(-t * 0.27, t * 0.04, t * 0.06); g.fillCircle(t * 0.27, t * 0.04, t * 0.06);
                return;
            }
            if (abiertos) {
                g.fillStyle(0x1b1b1b, 1);
                g.fillCircle(-t * 0.15, -t * 0.1, t * 0.06);
                g.fillCircle(t * 0.15, -t * 0.1, t * 0.06);
                g.fillStyle(0xffffff, 1);
                g.fillCircle(-t * 0.13, -t * 0.12, t * 0.02);
                g.fillCircle(t * 0.17, -t * 0.12, t * 0.02);
            } else {
                g.lineStyle(3, 0x3b2410, 1);
                g.beginPath(); g.arc(-t * 0.15, -t * 0.12, t * 0.06, 0.2, Math.PI - 0.2); g.strokePath();
                g.beginPath(); g.arc(t * 0.15, -t * 0.12, t * 0.06, 0.2, Math.PI - 0.2); g.strokePath();
            }
        },

        despertarOso: async function () {
            var o = this.oso;
            this.osoDespierto = this.time.now;
            this.dibujarOjos(true);
            await tw(this, { targets: o, y: o.y - o.t * 0.25, angle: -8, duration: 260, yoyo: true, repeat: 1, ease: 'Quad.easeOut' });
            this.time.delayedCall(2600, function () { this.dibujarOjos(false); this.osoDespierto = 0; }, null, this);
        },

        /* ── Cómoda y cajones ── */

        rectCajon: function (i) {
            var d = this.L.comoda;
            var col = i % 2, fila = Math.floor(i / 2);
            var m = d.w * 0.035;
            var w = (d.w - m * 3) / 2, h = (d.h - m * 4) / 3;
            return { x: d.x + m + col * (w + m), y: d.y + m + fila * (h + m), w: w, h: h };
        },

        montarComoda: function (keep) {
            var self = this;
            var L = this.L;
            K.textura(this, 'cajon_frente', 260, 120, function (x, w, h) {
                K.madera(x, 2, 2, w - 4, h - 4, { claro: '#e9b872', medio: '#d49a4f', oscuro: '#a86c2c', r: 7 });
                x.strokeStyle = 'rgba(80,45,15,0.35)'; x.lineWidth = 3;
                K.rr(x, 12, 12, w - 24, h - 24, 6); x.stroke();
                x.fillStyle = '#c0c4c9';
                K.rr(x, w * 0.36, h * 0.44, w * 0.28, h * 0.14, 6); x.fill();
                x.fillStyle = '#868e96';
                x.beginPath(); x.arc(w * 0.38, h * 0.51, 5, 0, Math.PI * 2); x.arc(w * 0.62, h * 0.51, 5, 0, Math.PI * 2); x.fill();
                x.fillStyle = 'rgba(255,255,255,0.5)'; x.fillRect(w * 0.38, h * 0.45, w * 0.24, 3);
            });
            K.textura(this, 'cajon_hueco', 260, 120, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#2b1708'); g.addColorStop(1, '#5c3613');
                x.fillStyle = g; x.fillRect(0, 0, w, h);
                x.fillStyle = 'rgba(255,255,255,0.08)'; x.fillRect(0, h - 8, w, 8);
            });
            // Si se rearma con un nivel en curso, los cajones conservan su contenido.
            var previos = this.cajones || [];
            this.cajones = [];
            for (var i = 0; i < 6; i++) {
                var r = this.rectCajon(i);
                var hueco = keep(this.add.image(r.x, r.y, 'cajon_hueco').setOrigin(0, 0).setDisplaySize(r.w, r.h).setDepth(10));
                var frente = keep(this.add.image(r.x + r.w / 2, r.y + r.h / 2, 'cajon_frente').setDisplaySize(r.w, r.h).setDepth(30));
                var cj = { i: i, r: r, hueco: hueco, frente: frente, abierto: false, actor: null, ropa: null };
                var prev = previos[i];
                if (prev && prev.actor && prev.actor.cont.active) {
                    cj.actor = prev.actor; cj.id = prev.id;
                    prev.actor.cont.setPosition(r.x + r.w / 2, r.y + r.h * 0.6).setScale(Math.min(r.h * 1.1, r.w * 0.7) / prev.actor.tam);
                }
                if (prev && prev.ropa) { prev.ropa.destroy(); }
                this.cajones.push(cj);
            }
        },

        llenar: function (ids) {
            var self = this;
            this.cajones.forEach(function (cj) {
                if (cj.actor) { cj.actor.destruir(); cj.actor = null; }
                if (cj.ropa) { cj.ropa.destroy(); cj.ropa = null; }
                cj.id = null;
            });
            var orden = Ut.mezclar([0, 1, 2, 3, 4, 5]);
            ids.forEach(function (id, k) {
                var cj = self.cajones[orden[k]];
                var r = cj.r;
                var tam = self.L.tam;
                var a = Act.crear(self, id, r.x + r.w / 2, r.y + r.h * 0.6, tam);
                if (a.animarIdle) a.animarIdle(false);
                a.cont.setScale(Math.min(r.h * 1.1, r.w * 0.7) / tam).setDepth(20).setVisible(false);
                a.sonido = self.sonidoDe(id);
                cj.actor = a;
                cj.id = id;
            });
            // Los demás tienen ropa doblada.
            orden.slice(ids.length).forEach(function (i, k) {
                var cj = self.cajones[i], r = cj.r;
                var g = self.add.graphics().setDepth(20).setVisible(false);
                for (var q = 0; q < 3; q++) {
                    g.fillStyle(ROPA[(k + q) % ROPA.length], 1);
                    g.fillRoundedRect(r.x + r.w * (0.12 + q * 0.27), r.y + r.h * 0.42, r.w * 0.24, r.h * 0.4, 6);
                    g.fillStyle(0xffffff, 0.25);
                    g.fillRect(r.x + r.w * (0.14 + q * 0.27), r.y + r.h * 0.46, r.w * 0.2, 3);
                }
                cj.ropa = g;
            });
        },

        cajonEn: function (x, y) {
            for (var i = 0; i < this.cajones.length; i++) {
                var cj = this.cajones[i];
                var f = cj.frente;
                var hw = f.displayWidth / 2, hh = f.displayHeight / 2;
                if (Math.abs(x - f.x) < hw && Math.abs(y - f.y) < hh) return cj;
            }
            return null;
        },

        abrir: async function (cj) {
            if (cj.abierto || cj.ocupado) return;
            var self = this;
            // Solo un cajón abierto a la vez: el anterior se cierra.
            this.cajones.forEach(function (o) { if (o !== cj && o.abierto) self.cerrar(o); });
            cj.ocupado = true;
            cj.abierto = true;
            var r = cj.r;
            if (cj.actor) cj.actor.cont.setVisible(true);
            if (cj.ropa) cj.ropa.setVisible(true);
            K.ruido({ f: 260, q: 0.9, dur: 0.35, vol: 0.14 });
            K.ruido({ f: 1300, q: 3, dur: 0.25, vol: 0.03 });
            // El frente baja y se agranda: el cajón sale hacia el niño y deja ver el interior.
            await tw(this, { targets: cj.frente, y: r.y + r.h * 1.05, displayWidth: r.w * 1.08, displayHeight: r.h * 0.62, duration: 280, ease: 'Quad.easeOut' });
            cj.frente.setDepth(31 + cj.i);
            cj.ocupado = false;
            if (cj.actor) {
                var a = cj.actor;
                this.tweens.add({ targets: a.cont, y: r.y + r.h * 0.45, duration: 240, ease: 'Back.easeOut' });
                this.brillo(a.cont.x, a.cont.y, 5);
                // Nivel 3: no suena solo, hay que recordar.
                if (!this.nv || !this.nv.mudo) this.escuchar(a.sonido, { breve: true, vol: 0.85, bocina: false });
            } else {
                K.ruido({ f: 3000, q: 0.6, dur: 0.3, vol: 0.03 });   // ropa
            }
        },

        cerrar: async function (cj) {
            if (!cj.abierto) return;
            var r = cj.r;
            cj.abierto = false;
            cj.ocupado = true;
            if (cj.actor) this.tweens.add({ targets: cj.actor.cont, y: r.y + r.h * 0.6, duration: 200 });
            await tw(this, { targets: cj.frente, y: r.y + r.h / 2, displayWidth: r.w, displayHeight: r.h, duration: 240, ease: 'Quad.easeIn' });
            cj.frente.setDepth(30);
            if (cj.actor) cj.actor.cont.setVisible(false);
            if (cj.ropa) cj.ropa.setVisible(false);
            K.ruido({ f: 180, q: 0.8, dur: 0.18, vol: 0.18 });
            this.granos(r.x + r.w / 2, r.y + r.h, 4, { colores: [0xdee2e6, 0xffffff], dist: 30, cae: 6, depth: 40 });
            cj.ocupado = false;
        },

        sitioRepisa: function (k) {
            var r = this.L.repisa;
            var n = 6;
            var esc = Math.min(0.62, (r.w / n) / this.L.tam * 1.25);
            return { x: r.x + r.w * ((k % n) + 0.5) / n, y: r.y - this.L.tam * esc * 0.42, esc: esc };
        },

        disponibles: function () {
            return this.cajones.filter(function (c) { return c.actor && !c.sacado; }).map(function (c) { return c.id; });
        },

        /* ── Entrada: tirar del cajón (o tocarlo) y tocar lo que hay adentro ── */

        alTocar: function (p) {
            // El osito se despierta si lo tocan.
            if (this.oso && Math.hypot(p.x - this.oso.x, p.y - this.oso.y) < this.oso.t * 0.6 && !this.osoDespierto) { this.despertarOso(); K.tono({ f: 600, f2: 900, dur: 0.15, vol: 0.05 }); return; }
            if (this.fase !== 'jugar') return;
            // ¿Toca un juguete de un cajón abierto?
            var abierto = this.cajones.filter(function (c) { return c.abierto && c.actor && !c.sacado; })[0];
            if (abierto) {
                var a = abierto.actor;
                if (Math.hypot(p.x - a.cont.x, p.y - a.cont.y) < this.L.tam * a.cont.scale * 0.6) { this.elegir(abierto); return; }
            }
            var cj = this.cajonEn(p.x, p.y);
            if (!cj) return;
            this.tirando = { cj: cj, y: p.y, t: this.time.now };
            this.pista.reiniciar();
        },

        alMover: function (p) {
            var t = this.tirando;
            if (!t || t.cj.abierto) return;
            // Arrastrar hacia abajo = tirar de la manija.
            var dy = Math.max(0, p.y - t.y);
            t.cj.frente.y = t.cj.r.y + t.cj.r.h / 2 + Math.min(dy, t.cj.r.h * 0.4) * 0.5;
            if (dy > t.cj.r.h * 0.3) { this.tirando = null; this.abrir(t.cj); }
        },

        alSoltar: function () {
            var t = this.tirando;
            this.tirando = null;
            if (!t || t.cj.abierto) return;
            // Un toque corto también abre (para los más chiquitos); si no, vuelve a su lugar.
            if (this.time.now - t.t < 450) this.abrir(t.cj);
            else this.tweens.add({ targets: t.cj.frente, y: t.cj.r.y + t.cj.r.h / 2, duration: 160 });
            if (t.cj.abierto && this.fase === 'jugar') return;
        },

        elegir: async function (cj) {
            var a = cj.actor;
            if (cj.id === this.objetivo) {
                cj.sacado = true;
                this.fase = 'premio';
                a.cont.setDepth(60);
                var s0 = a.cont.scale;
                var s1 = Math.max(s0 * 1.4, 0.9);
                // Agrandado no debe salirse por el borde (columna derecha en pantallas angostas).
                var medio = a.cont.getBounds().width / 2 * (s1 / s0) + 8;
                var x1 = Math.max(medio, Math.min(this.L.W - medio, a.cont.x));
                K.efecto(this, 'whoosh');
                await tw(this, { targets: a.cont, x: x1, y: cj.r.y - this.L.tam * 0.25, scale: s1, duration: 380, ease: 'Back.easeOut' });
                if (cj.id === 'reloj' || this.objetivo === this.reto.correcto) this.despertarOso();
                await this.celebrar(a);
                cj.actor = null;          // ya no es del cajón: que al cerrarse no lo esconda
                this.cerrar(cj);
                // A la repisa, en su sitio.
                var p = this.sitioRepisa(this.coleccion.length);
                this.coleccion.push(a);
                this.vivos.push(a);
                var x0 = a.cont.x, y0 = a.cont.y, e0 = a.cont.scale, o = { t: 0 };
                var cima = Math.min(y0, p.y) - this.L.tam * 0.6;
                await tw(this, {
                    targets: o, t: 1, duration: 700, ease: 'Sine.easeInOut',
                    onUpdate: function () {
                        var t = o.t;
                        a.cont.x = x0 + (p.x - x0) * t;
                        a.cont.y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cima + t * t * p.y;
                        a.cont.setScale(e0 + (p.esc - e0) * t);
                    }
                });
                K.ruido({ f: 700, q: 1, dur: 0.1, vol: 0.1 });
                this.tweens.add({ targets: a.cont, scaleY: p.esc * 0.85, duration: 90, yoyo: true });
                await this.seguir();
            } else {
                await this.fallar(a);
                await this.cerrar(cj);
            }
        },

        /* ── Sonido apagado desde la cómoda ── */

        anunciar: function () {
            var self = this;
            // Mientras suena, la cómoda tiembla apenas (algo vibra adentro).
            var d = this.L.comoda;
            var cuerpo = this.cajones.map(function (c) { return c.frente; });
            this.tweens.add({ targets: cuerpo, x: '+=1.5', duration: 50, yoyo: true, repeat: 10 });
            this.anillosComoda = this.time.now;
            return this.escuchar(this.sonidoDe(this.objetivo), { apagado: 520 }).then(function () { self.anillosComoda = 0; });
        },

        paso: function (time) {
            if (!this.ondasG || !this.anillosComoda) return;
            var d = this.L.comoda;
            var g = this.ondasG;
            for (var k = 0; k < 2; k++) {
                var f = ((time - this.anillosComoda) / 1100 + k / 2) % 1;
                g.lineStyle(3, 0xffffff, 0.5 * (1 - f));
                g.strokeEllipse(d.x + d.w / 2, d.y + d.h / 2, d.w * (1 + f * 0.3), d.h * (1 + f * 0.3));
            }
        },

        /* ── Niveles ── */

        planNiveles: function () {
            var plan = this.planBase({ extra: EXTRA, n: [3, 4, 4, 5], copias2: true });
            plan[2].mudo = true;
            return plan;
        },

        prepararNivel: async function (i, nv) {
            var self = this;
            await Promise.all(this.cajones.filter(function (c) { return c.abierto; }).map(function (c) { return self.cerrar(c); }));
            this.cajones.forEach(function (c) { c.sacado = false; });
            this.llenar(nv.ids);
            // Un saltito de la cómoda: se "guardaron" cosas nuevas.
            var frentes = this.cajones.map(function (c) { return c.frente; });
            K.ruido({ f: 220, q: 0.7, dur: 0.3, vol: 0.15 });
            await tw(this, { targets: frentes, y: '-=6', duration: 120, yoyo: true });
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            var cj = this.cajones.filter(function (c) { return c.id === self.objetivo && !c.sacado; })[0];
            if (!cj) return Promise.resolve();
            var no = function () { return cancelada() || self.fase !== 'jugar'; };
            if (cj.abierto) return this.ctx.mano({ punto: { x: cj.actor.cont.x, y: cj.actor.cont.y }, holdMs: 500, cancelado: no });
            if (this.ayuda) this.brillo(cj.frente.x, cj.frente.y, 8);
            return this.ctx.mano({ punto: { x: cj.frente.x, y: cj.frente.y }, holdMs: 200, arrastre: { dx: 0, dy: cj.r.h * 0.45, durMs: 600 }, cancelado: no });
        },

        estadoExtra: function () {
            return this.cajones.map(function (c) { return { i: c.i, id: c.id, abierto: c.abierto, x: Math.round(c.frente.x), y: Math.round(c.frente.y), sacado: !!c.sacado }; });
        },

        zonaFiesta: function () { var L = this.L; return { x: L.W * 0.05, y: L.y0 + (L.H - L.y0) * 0.4, w: L.W * 0.62 }; },

        antesDeFiesta: async function () {
            var self = this;
            await Promise.all(this.cajones.filter(function (c) { return c.abierto; }).map(function (c) { return self.cerrar(c); }));
            this.dibujarOjos(true);
        },

        /* ── Escena final: el osito despierta, abre los cajones, juega con los juguetes y los abraza ── */

        escenaFinal: async function () {
            var self = this;
            var L = this.L, o = this.oso, t = o.t;
            var vistos = {};
            var lista = this.coleccion.filter(function (a) { if (!a.cont || !a.cont.active || vistos[a.id]) return false; vistos[a.id] = 1; return true; });
            var x0 = o.x, y0 = o.y;
            // 1) Abre los ojos, bosteza y se estira; se sienta y asoma el cuerpo sobre la cobija.
            this.dibujarOjos(true);
            var boca = this.add.ellipse(0, t * 0.2, t * 0.1, t * 0.02, 0x3b2410);
            o.add(boca);
            K.tono({ f: 420, f2: 210, dur: 0.7, vol: 0.05, tipo: 'triangle' });
            await tw(this, { targets: boca, displayHeight: t * 0.14, duration: 350, yoyo: true, hold: 250 });
            boca.destroy();
            var cafe = 0xb07d4f, claro = 0xe3b98c;
            var cuerpo = this.add.container(0, 0);
            cuerpo.add([
                this.add.ellipse(-t * 0.2, t * 1.0, t * 0.26, t * 0.18, cafe),
                this.add.ellipse(t * 0.2, t * 1.0, t * 0.26, t * 0.18, cafe),
                this.add.ellipse(0, t * 0.62, t * 0.7, t * 0.74, cafe),
                this.add.ellipse(0, t * 0.68, t * 0.42, t * 0.46, claro)
            ]);
            var brazoI = this.add.ellipse(-t * 0.36, t * 0.5, t * 0.18, t * 0.4, cafe).setAngle(25);
            var brazoD = this.add.ellipse(t * 0.36, t * 0.5, t * 0.18, t * 0.4, cafe).setAngle(-25);
            cuerpo.add([brazoI, brazoD]);
            cuerpo.setScale(1, 0).setAlpha(0);
            o.addAt(cuerpo, 0);
            o.setDepth(44);
            await tw(this, { targets: cuerpo, scaleY: 1, alpha: 1, duration: 380, ease: 'Back.easeOut' });
            await tw(this, { targets: [brazoI, brazoD], angle: { getEnd: function (tg) { return tg === brazoI ? 150 : -150; } }, duration: 300, yoyo: true, ease: 'Sine.easeInOut' });
            if (!this.sigue()) return;
            // 2) Salta de la cama al piso, frente a la cómoda.
            var d = L.comoda;
            var px = d.x + d.w * 0.5, py = Math.min(L.H - t * 1.1, d.y + d.h + t * 0.05);
            K.efecto(this, 'whoosh');
            await this.saltarA(o, px, py, { ms: 650, alto: t * 1.4 });
            K.ruido({ f: 200, q: 1, dur: 0.15, vol: 0.12 });
            this.granos(px, py + t * 1.05, 6, { colores: [0xdee2e6, 0xffffff], dist: 40, cae: 6, depth: 46 });
            // 3) Los seis cajones se abren en cascada.
            for (var i = 0; i < this.cajones.length; i++) {
                (function (cj, k) {
                    self.time.delayedCall(k * 110, function () {
                        var r = cj.r;
                        K.ruido({ f: 260 + k * 30, q: 0.9, dur: 0.2, vol: 0.08 });
                        self.tweens.add({ targets: cj.frente, y: r.y + r.h * 1.05, displayWidth: r.w * 1.08, displayHeight: r.h * 0.62, duration: 260, ease: 'Quad.easeOut', yoyo: true, hold: 900 });
                    });
                })(this.cajones[i], i);
            }
            await esperar(this, 700);
            // 4) Los juguetes bajan de la repisa y juegan alrededor del osito; cada uno suena.
            var n = lista.length;
            var tamJ = Math.min(L.tam * 0.85, (L.W * 0.85) / Math.max(1, n));
            for (var j = 0; j < n; j++) {
                var a = lista[j];
                var ang = Math.PI + (j + 0.5) / n * Math.PI;   // medio círculo por delante
                var rx = Math.min(L.W * 0.4, t * 1.6 + n * 8);
                var qx = Math.max(tamJ * 0.6, Math.min(L.W - tamJ * 0.6, px + Math.cos(ang) * rx));
                var qy = py + t * 0.9 - Math.sin(ang) * t * 0.35;
                a.cont.setDepth(46 + qy * 0.001).setAngle(0);
                this.saltarA(a.cont, qx, qy, { ms: 480, alto: L.tam * 0.7, esc: tamJ / a.tam });
                await esperar(this, 380);
                this.escuchar(a.sonido, { breve: true, bocina: false, vol: 0.75 });
                if (a.saltito) a.saltito(0.12, 1);
                this.tweens.add({ targets: o, angle: j % 2 ? 8 : -8, duration: 160, yoyo: true });
                await esperar(this, 380);
            }
            if (!this.sigue()) return;
            // 5) Vuelve a la cama con todos y los abraza.
            await this.saltarA(o, x0, y0, { ms: 650, alto: t * 1.4 });
            o.setDepth(44);
            var c = L.cama;
            lista.forEach(function (a, k) {
                // Sobre la cobija, a su lado (los de la fila de atrás un poco más arriba).
                var bx = c.x + c.w * (0.45 + 0.5 * (k + 0.5) / n);
                var tamC = Math.min(tamJ, c.w * 0.5 / Math.max(1, Math.ceil(n / 2)) * 1.4);
                self.time.delayedCall(k * 90, function () { self.saltarA(a.cont, bx, c.y + c.h * 0.05 - (k % 2) * tamC * 0.3, { ms: 460, alto: L.tam * 0.6, esc: tamC / a.tam }).then(function () { a.cont.setDepth(43 + (k % 2 ? 0 : 0.5)); }); });
            });
            await esperar(this, 460 + n * 90);
            await tw(this, { targets: [brazoI, brazoD], angle: { getEnd: function (tg) { return tg === brazoI ? -40 : 40; } }, x: { getEnd: function (tg) { return tg === brazoI ? -t * 0.18 : t * 0.18; } }, duration: 300, ease: 'Back.easeOut' });
            this.dibujarOjos('feliz');
            Ut.estallido(this, o.x, o.y - t * 0.3, { n: 10, tex: 'corazon', tam: 26, dist: 110, depth: 60 });
            await esperar(this, 700);
        },

        /* ── Demostración ── */

        demo: async function () {
            var self = this;
            var ctx = this.ctx;
            var t = ctx.textos || {};
            var d = this.config.demo || { sonido: 'mugido', correcto: 'vaca', opciones: ['gallo', 'vaca'] };
            this.fase = 'demo';
            var limpiar = async function () {
                ctx.quitarMano();
                await Promise.all(self.cajones.filter(function (c) { return c.abierto; }).map(function (c) { return self.cerrar(c); }));
                self.llenar([]);
            };
            await ctx.decir({ voz: 'zoe', texto: t.demostracion || '¡Mira cómo se juega!' }, { minMs: 1600 });
            if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
            // Gallo arriba a la izquierda y vaca en el medio a la izquierda.
            this.llenar([]);
            var cjs = [this.cajones[0], this.cajones[2]];
            d.opciones.forEach(function (id, k) {
                var cj = cjs[k], r = cj.r;
                if (cj.ropa) { cj.ropa.destroy(); cj.ropa = null; }
                var a = Act.crear(self, id, r.x + r.w / 2, r.y + r.h * 0.6, self.L.tam);
                a.cont.setScale(Math.min(r.h * 1.1, r.w * 0.7) / self.L.tam).setDepth(20).setVisible(false);
                a.sonido = id === d.correcto ? d.sonido : Act.sonidoDe(id);
                cj.actor = a; cj.id = id;
            });
            var b = this.L.bocina;
            var sonando = Promise.resolve();
            await ctx.mano({ punto: { x: b.x, y: b.y }, holdMs: 500, onPresionar: function () { sonando = self.escuchar(d.sonido, { apagado: 520 }); } });
            await sonando;
            for (var k = 0; k < cjs.length; k++) {
                if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
                var cj = cjs[k];
                await ctx.mano({ punto: { x: cj.frente.x, y: cj.frente.y }, holdMs: 200, arrastre: { dx: 0, dy: cj.r.h * 0.45, durMs: 600 }, onDuranteArrastre: (function (c) { return function () { self.abrir(c); }; })(cj) });
                await esperar(this, 1400);
            }
            var vaca = cjs[1].actor;
            if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
            await ctx.mano({ punto: { x: vaca.cont.x, y: vaca.cont.y }, holdMs: 450 });
            vaca.cont.setDepth(60);
            await tw(this, { targets: vaca.cont, y: cjs[1].r.y - this.L.tam * 0.25, scale: 1, duration: 380, ease: 'Back.easeOut' });
            K.efecto(this, 'recompensa');
            Ut.estallido(this, vaca.cont.x, vaca.cont.y, { n: 14, tex: 'estrella', tam: 28, dist: 150, sinTinte: true, depth: 85 });
            this.despertarOso();
            await Promise.all([this.escuchar(d.sonido, { breve: true, bocina: false }), vaca.acierto(1500)]);
            await ctx.decir({ voz: 'zoe', texto: t.demostracionAcierto || '¡Así se hace!' }, { estado: 'acierto', minMs: 1300 });
            await ctx.decir({ voz: 'zoe', texto: t.demostracionFin || '¡Ahora te toca a ti!' }, { minMs: 1000 });
            await limpiar();
        }
    };

    K.crear({ id: 'comoda', fondo: '#d0bfff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
