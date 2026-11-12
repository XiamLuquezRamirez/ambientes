/**
 * «La sala: lleva el sonido a su dueño» — motor propio de ¿Qué objeto suena? (3-4 años).
 *
 * Los juguetes están en su sitio de una sala de verdad (sofá, mesita, repisa, alfombra). De la
 * bocina sale una BURBUJA DE SONIDO que flota por la sala; el niño la AGARRA y la ARRASTRA hasta
 * el juguete que hace ese sonido. Si acierta, la burbuja se mete en el juguete, que cobra vida
 * (el teléfono vibra y suena, el avión da una vuelta…) y salta a la caja de juguetes. Si no, la
 * burbuja rebota, el juguete deja oír su propio sonido y la burbuja vuelve a flotar.
 *
 * Niveles: 1 el reto · 2 otro sonido, dos juguetes iguales · 3 la burbuja se desinfla si no la
 * llevas a tiempo (sale otra) · 4 cada acierto trae un sonido nuevo.
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
    var EXTRA = ['aspiradora', 'bicicleta', 'reloj', 'tren', 'vaca', 'gallo'];

    /** Imágenes diseñadas por el equipo (img/). Si falta alguna, queda el dibujo de antes. */
    var DISENO = 'img/';
    // Las mismas imágenes de ¿Qué suena? (avión, bici, gallo, reloj, teléfono, tren, vaca) + la aspiradora.
    var PIELES = ['avion', 'bicicleta', 'gallo', 'reloj', 'telefono', 'tren', 'vaca', 'aspiradora'];
    /**
     * Muebles dentro de fondo.png (1281×721), en tanto por uno, para colocar encima los
     * juguetes: donde se apoyan y hasta dónde llega cada mueble.
     */
    // Filas de fondo.png: la franja oscura del techo (0-30) y la pared rayada sin muebles ni el brillo de la ventana (hasta 80).
    var TECHO = 30, PARED = 80;
    var SALA = {
        piso: 548 / 721,
        sofa: { x: 47 / 1281, x1: 525 / 1281, asiento: 505 / 721 },
        mesa: { x: 620 / 1281, x1: 817 / 1281, tapa: 425 / 721 },
        repisa: { x: 684 / 1281, x1: 1238 / 1281, tapa: 222 / 721 },
        ventana: { x: 243 / 1281, x1: 516 / 1281, y: 120 / 721, y1: 300 / 721 },
        alfombra: { x: 622 / 1281, x1: 1102 / 1281, y: 600 / 721, y1: 694 / 721 }
    };

    var escena = {
        preload: function () {
            var self = this;
            var svg = function (k, f, w, h) { if (!self.textures.exists(k)) self.load.svg(k, DISENO + f, { width: w, height: h }); };
            if (!this.textures.exists('qo_fondo')) this.load.image('qo_fondo', DISENO + 'fondo.png');
            PIELES.forEach(function (id) { svg('qo_' + id, id + '.svg', 420, 420); });
            svg('qo_cofre', 'cofre.svg', 420, 420);
            svg('qo_escuchar', 'escuchar.svg', 300, 300);
            for (var i = 1; i <= 5; i++) svg('qo_mariposa' + i, 'mariposa' + i + '.svg', 160, 160);
            // Estrella de ¿Qué suena?: con las claves del arte dibujado ('pa:estrella@tam'), así la
            // usan las estrellas del marcador, los estallidos y el final.
            [64, 128, 256].forEach(function (t) { svg('pa:estrella@' + t, 'estrella.svg', t, t); });
        },

        /** HUD propio: el botón de escuchar y la estrella del diseño (el del kit dibuja los suyos). */
        montarHud: function (keep) {
            var L = this.L;
            var b = keep(this.add.container(L.bocina.x, L.bocina.y).setDepth(80));
            var halo = this.add.circle(0, 0, L.bocina.r * 1.25, 0xffffff, 0.35);
            if (this.textures.exists('qo_escuchar')) {
                b.add([halo, this.add.image(0, 0, 'qo_escuchar').setDisplaySize(L.bocina.r * 2.3, L.bocina.r * 2.3)]);
            } else {
                var plato = this.add.circle(0, 0, L.bocina.r, 0xff922b).setStrokeStyle(5, 0xffffff);
                b.add([halo, plato, this.add.image(0, 0, A.textura(this, 'bocina', 128)).setDisplaySize(L.bocina.r * 1.35, L.bocina.r * 1.35)]);
            }
            b.halo = halo;
            this.bocina = b;
            this.ondasG = keep(this.add.graphics().setDepth(79));
            this.estrellas = [];
            // Placa rosada con las 4 estrellas, como en ¿Qué suena?. Cabe entre la bocina y el
            // borde derecho (en vertical hay poco espacio).
            var n = 4;
            var x0 = L.bocina.x + L.bocina.r + 14;
            var libre = L.W - x0 - 10;
            var tam = Math.max(20, Math.min(40, L.bocina.r * 0.85, (libre - 12) / (n + 0.22 * (n - 1) + 0.6)));
            var pad = tam * 0.3, radio = tam * 0.34;
            var w = tam * n + tam * 0.22 * (n - 1) + pad * 2;
            var h = tam + pad * 1.1;
            var cy = L.bocina.y;
            var g = keep(this.add.graphics().setDepth(79.5));
            g.fillStyle(0xd62a7f, 1);                                  // borde rosado oscuro
            g.fillRoundedRect(x0, cy - h / 2, w, h, radio);
            g.fillStyle(0xf74d9c, 1);                                  // relleno rosado claro
            g.fillRoundedRect(x0 + tam * 0.11, cy - h / 2 + tam * 0.11, w - tam * 0.22, h - tam * 0.22, radio * 0.82);
            for (var i = 0; i < n; i++) {
                var x = x0 + pad + tam / 2 + i * (tam + tam * 0.22);
                var e = keep(this.add.image(x, cy, A.textura(this, 'estrella', 128)).setDisplaySize(tam, tam).setDepth(80));
                if (i >= this.nivelActual) e.setTint(0x9b6f86).setAlpha(0.5);
                this.estrellas.push(e);
            }
            this.montarPresentador();
        },

        /** Mariposas de ¿Qué suena? que entran por la ventana y revolotean por la sala. */
        montarMariposas: function (keep) {
            var self = this, L = this.L;
            var tm = Math.max(26, Math.min(44, L.W * 0.04));
            for (var i = 1; i <= 3; i++) {
                if (!this.textures.exists('qo_mariposa' + i)) continue;
                var x0 = L.ventana.x + L.ventana.w * (0.2 + 0.3 * (i - 1)), y0 = L.ventana.y + L.ventana.h * 0.45;
                var m = keep(this.add.image(x0, y0, 'qo_mariposa' + i).setDisplaySize(tm, tm).setDepth(1));
                m.base = m.scaleX;
                // Aleteo (se encoge de lado) y un paseo lento ida y vuelta por la pared.
                this.tweens.add({ targets: m, scaleX: m.base * 0.35, duration: 140 + i * 20, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
                this.tweens.add({
                    targets: m, x: x0 + (i % 2 ? 1 : -1) * L.W * 0.12, y: y0 - L.H * 0.05 * i,
                    duration: 3800 + i * 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 400
                });
            }

        },

        iniciar: function () {
            var self = this;
            // Los juguetes se visten con las imágenes del diseño (comun/actores.js: piel).
            PIELES.forEach(function (id) { if (self.textures.exists('qo_' + id)) Act.piel(id, 'qo_' + id); });
            this.juguetes = [];
            this.burbuja = null;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            L.y0 = Math.round(H * 0.6);                       // donde empieza el piso
            L.tam = Math.max(70, Math.min(130, H * 0.19, W / 5.6));
            var hueco = Math.max(60, L.y0 * 0.32);
            L.bocina = { x: W / 2, y: Math.max(64, Math.min(120, 70 + hueco * 0.2)), r: Math.max(30, Math.min(42, hueco * 0.35)) };
            L.pres = W >= 760 ? { x: W - 78, piso: H - 104, alto: Math.min(170, H * 0.3) } : null;
            var der = L.pres ? W - 170 : W - 24;
            if (this.textures.exists('qo_fondo')) return this.calcularConFondo(L, der);
            // Muebles.
            var sw = Math.min(W * 0.32, 380);
            var sh = Math.min(H * 0.26, sw * 0.62);
            L.sofa = { x: W * 0.03, y: L.y0 + H * 0.16 - sh, w: sw, h: sh };
            L.mesa = { x: L.sofa.x + L.sofa.w + W * 0.03, w: Math.max(80, W * 0.11), y: L.y0 + H * 0.04 };
            L.repisa = { x: Math.max(L.mesa.x + L.mesa.w + 20, W * 0.5), y: L.y0 - H * 0.22, w: Math.min(der - Math.max(L.mesa.x + L.mesa.w + 20, W * 0.5) - 10, W * 0.36) };
            L.ventana = { x: L.mesa.x - 10, y: Math.max(L.bocina.y + L.bocina.r + 20, L.y0 * 0.18), w: Math.max(90, W * 0.15), h: L.y0 * 0.42 };
            var cw = Math.max(100, W * 0.12);
            L.caja = { x: der - cw, y: H - Math.max(130, H * 0.2), w: cw, h: Math.max(64, H * 0.11) };
            L.alfombra = { x: Math.max(L.mesa.x + L.mesa.w + L.tam * 0.9, W * 0.56), y: H * 0.82, rx: W * 0.17, ry: H * 0.08 };
            // Sitios donde se apoyan los juguetes (pies del juguete en `y`).
            L.sitios = [
                { x: L.sofa.x + L.sofa.w * 0.36, y: L.sofa.y + L.sofa.h * 0.55, esc: 0.9 },
                { x: L.mesa.x + L.mesa.w / 2, y: L.mesa.y, esc: 0.85 },
                { x: L.repisa.x + L.repisa.w * 0.25, y: L.repisa.y, esc: 0.75 },
                { x: L.repisa.x + L.repisa.w * 0.72, y: L.repisa.y, esc: 0.75 },
                { x: L.alfombra.x - L.tam * 0.55, y: L.alfombra.y + L.tam * 0.12, esc: 1 },
                { x: L.alfombra.x + L.tam * 0.55, y: L.alfombra.y - L.tam * 0.02, esc: 1 }
            ];
            L.zona = { x: W * 0.06, y: L.y0 - H * 0.04, w: W * 0.8, h: H - L.y0 - 30 };
            return L;
        },

        /**
         * Con el fondo del diseño, los muebles ya están pintados: aquí solo se calcula dónde
         * caen en pantalla (la imagen cubre el ancho y se ancla por la línea del piso) para
         * apoyar encima los juguetes.
         */
        calcularConFondo: function (L, der) {
            var W = L.W, H = L.H;
            var f = this.textures.get('qo_fondo').getSourceImage();
            // Se apoya abajo y entra el ancho completo. En pantallas altas crece hasta llenar
            // desde 1/4 de la altura (recortando un poco los lados), para que no quede una franja.
            var s = Math.max(W / f.width, H * 0.62 / f.height);
            var ix = (W - f.width * s) / 2, iy = H - f.height * s;
            var px = function (u) { return ix + u * f.width * s; };
            var py = function (v) { return iy + v * f.height * s; };
            L.fondo = { x: ix, y: iy, s: s, w: f.width * s, h: f.height * s };
            // En pantalla angosta el globo de Zoe ocupa todo el ancho arriba: la bocina baja
            // para quedar debajo del globo (sobra pared en vertical).
            if (W < 700) L.bocina.y = Math.max(L.bocina.y, 190);
            L.y0 = py(SALA.piso);
            L.tam = Math.max(70, Math.min(130, H * 0.19, W / 5.6));
            L.sofa = { x: px(SALA.sofa.x), y: py(SALA.sofa.asiento), w: px(SALA.sofa.x1) - px(SALA.sofa.x), h: H * 0.2 };
            L.mesa = { x: px(SALA.mesa.x), y: py(SALA.mesa.tapa), w: px(SALA.mesa.x1) - px(SALA.mesa.x) };
            L.repisa = { x: px(SALA.repisa.x), y: py(SALA.repisa.tapa), w: px(SALA.repisa.x1) - px(SALA.repisa.x) };
            L.ventana = { x: px(SALA.ventana.x), y: py(SALA.ventana.y), w: px(SALA.ventana.x1) - px(SALA.ventana.x), h: py(SALA.ventana.y1) - py(SALA.ventana.y) };
            L.alfombra = {
                x: (px(SALA.alfombra.x) + px(SALA.alfombra.x1)) / 2,
                y: (py(SALA.alfombra.y) + py(SALA.alfombra.y1)) / 2,
                rx: (px(SALA.alfombra.x1) - px(SALA.alfombra.x)) / 2,
                ry: (py(SALA.alfombra.y1) - py(SALA.alfombra.y)) / 2
            };
            // El cofre del diseño hace de caja de juguetes, abajo a la izquierda sobre el piso.
            var cw = Math.max(100, Math.min(165, W * 0.13));
            L.caja = { x: 14, y: H - cw * 0.62 - 26, w: cw, h: cw * 0.62 };
            // Sitios donde se apoyan los juguetes (sus pies en `y`), sobre los muebles del fondo.
            L.sitios = [
                { x: L.sofa.x + L.sofa.w * 0.5, y: L.sofa.y, esc: 0.85 },
                { x: L.mesa.x + L.mesa.w / 2, y: L.mesa.y, esc: 0.8 },
                { x: L.repisa.x + L.repisa.w * 0.22, y: L.repisa.y, esc: 0.7 },
                { x: L.repisa.x + L.repisa.w * 0.62, y: L.repisa.y, esc: 0.7 },
                { x: L.alfombra.x - L.alfombra.rx * 0.45, y: L.alfombra.y + L.alfombra.ry * 0.3, esc: 1 },
                { x: L.alfombra.x + L.alfombra.rx * 0.45, y: L.alfombra.y - L.alfombra.ry * 0.2, esc: 1 }
            ];
            // Con la sala recortada a los lados (pantalla vertical), ningún juguete queda fuera.
            L.sitios.forEach(function (q) {
                var m = L.tam * q.esc * 0.55;
                q.x = Math.max(m + 6, Math.min(W - m - 6, q.x));
            });
            L.zona = { x: W * 0.06, y: L.y0 - H * 0.04, w: W * 0.8, h: H - L.y0 - 30 };
            return L;
        },

        armar: function (reubicar) {
            var self = this;
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            if (L.fondo) {
                // Sala del diseño (ventana, sofá, mesita, repisa y alfombra ya pintados).
                // Y si la sala no llega abajo, el piso del mismo rosa completa el resto.
                var pie = L.fondo.y + L.fondo.h;
                if (pie < L.H) keep(this.add.rectangle(0, Math.floor(pie) - 1, L.W, L.H - pie + 2, 0xf3cedb).setOrigin(0, 0).setDepth(0));
                // '__BASE' explícito: al agregarle los cuadros 'techo' y 'pared' a la textura,
                // Phaser pasa a usar el primero como cuadro por defecto.
                keep(this.add.image(L.fondo.x, L.fondo.y, 'qo_fondo', '__BASE').setOrigin(0, 0).setScale(L.fondo.s).setDepth(0.1));
                // Si la imagen no llega arriba, se completa con la misma imagen (no con un color
                // plano): la franja del techo va arriba de la pantalla y la pared rayada se estira
                // hasta la sala, tapando la franja de techo que trae la imagen.
                if (L.fondo.y > 0) {
                    var tex = this.textures.get('qo_fondo');
                    var fw = tex.getSourceImage().width;
                    if (!tex.has('techo')) tex.add('techo', 0, 0, 0, fw, TECHO);
                    if (!tex.has('pared')) tex.add('pared', 0, 0, TECHO + 4, fw, PARED - TECHO - 4);
                    var s = L.fondo.s, alto = TECHO * s;
                    // Pared: desde bajo el techo de la pantalla hasta donde termina el techo de la imagen.
                    keep(this.add.image(L.fondo.x, alto, 'qo_fondo', 'pared').setOrigin(0, 0)
                        .setDisplaySize(fw * s, L.fondo.y + 1).setDepth(0.2));
                    keep(this.add.image(L.fondo.x, 0, 'qo_fondo', 'techo').setOrigin(0, 0).setDisplaySize(fw * s, alto).setDepth(0.3));
                }
                this.montarCofre(keep);
                var V0 = this.montarVida(keep);
                if (this.textures.exists('qo_mariposa1')) this.montarMariposas(keep);
                else if (V0) V0.mariposas(1, { x: L.ventana.x, y: L.ventana.y + 10, w: L.ventana.w, h: L.ventana.h * 0.5, depth: 1 });
                this.montarHud(keep);
                if (reubicar) this.reubicar(L);
                return;
            }
            K.textura(this, 'sala_fondo', L.W, L.H, function (x, w, h) { self.pintarSala(x, w, h); });
            keep(this.add.image(0, 0, 'sala_fondo').setOrigin(0, 0).setDepth(0));
            // Frente de la caja (los juguetes caen detrás).
            K.textura(this, 'sala_caja', L.caja.w + 20, L.caja.h + 20, function (x) {
                K.madera(x, 6, 10, L.caja.w, L.caja.h, { claro: '#e8a35c', medio: '#cf8642', oscuro: '#9c5a22', r: 8 });
                x.fillStyle = '#ffd43b';
                x.beginPath(); x.arc(6 + L.caja.w / 2, 10 + L.caja.h * 0.5, L.caja.h * 0.18, 0, Math.PI * 2); x.fill();
                x.fillStyle = '#f08c00';
                for (var i = 0; i < 5; i++) {
                    var a = -Math.PI / 2 + i * Math.PI * 2 / 5;
                    x.beginPath(); x.arc(6 + L.caja.w / 2 + Math.cos(a) * L.caja.h * 0.1, 10 + L.caja.h * 0.5 + Math.sin(a) * L.caja.h * 0.1, 2.5, 0, Math.PI * 2); x.fill();
                }
            });
            keep(this.add.image(L.caja.x - 6, L.caja.y - 10, 'sala_caja').setOrigin(0, 0).setDepth(40));
            // Reloj de péndulo en la pared (se balancea; al tocarlo da campanadas).
            var V = this.montarVida(keep);
            var px = L.ventana.x - Math.max(50, L.ventana.w * 0.45);
            var largo = Math.min(70, (L.sofa.y - L.sofa.h * 0.2 - L.ventana.y) / 1.5);
            if (V && px > L.sofa.x + 30 && largo > 36) V.pendulo(px, L.ventana.y + largo * 0.25, largo);
            if (V) V.mariposas(1, { x: L.ventana.x, y: L.ventana.y + 10, w: L.ventana.w, h: L.ventana.h * 0.5, depth: 1 });
            this.montarHud(keep);
            if (reubicar) this.reubicar(L);
        },

        /** Tras cambiar el tamaño: cada juguete vuelve a su sitio y la burbuja a su base. */
        reubicar: function (L) {
            this.juguetes.forEach(function (j) {
                var s = L.sitios[j.sitio];
                if (!s || j.estado !== 'quieto') return;
                j.actor.cont.setPosition(s.x, s.y - L.tam * s.esc * 0.42).setScale(s.esc * L.tam / j.actor.tam);
            });
            this.coleccion.forEach(function (a) { a.cont.setPosition(L.caja.x + L.caja.w / 2, L.caja.y + L.caja.h * 0.3); });
            if (this.burbuja) this.burbuja.base = { x: L.W * 0.5, y: L.y0 - L.H * 0.12 };
        },

        /**
         * Cofre del diseño: hace de caja de juguetes. Una copia recortada de su mitad de abajo
         * va delante, así los juguetes que entran quedan dentro y no encima.
         */
        montarCofre: function (keep) {
            var c = this.L.caja;
            if (!this.textures.exists('qo_cofre')) return;
            var src = this.textures.get('qo_cofre').getSourceImage();
            var k = c.w / src.width * 1.15;
            var cx = c.x + c.w / 2, cy = c.y + c.h / 2;
            keep(this.add.image(cx, cy, 'qo_cofre').setScale(k).setDepth(6));
            var frente = keep(this.add.image(cx, cy, 'qo_cofre').setScale(k).setDepth(40));
            frente.setCrop(0, src.height * 0.46, src.width, src.height * 0.54);
        },

        pintarSala: function (x, w, h) {
            var L = this.L;
            K.pared(x, w, L.y0, { arriba: '#fff4e0', abajo: '#ffe3bf', raya: 'rgba(255,190,120,0.16)' });
            K.piso(x, w, h, L.y0);
            K.ventana(x, L.ventana.x, L.ventana.y, L.ventana.w, L.ventana.h);
            // Cortinas.
            [[-1, L.ventana.x - 8], [1, L.ventana.x + L.ventana.w + 8]].forEach(function (q) {
                var cw = L.ventana.w * 0.24;
                var cx = q[0] < 0 ? q[1] - cw : q[1];
                var g = x.createLinearGradient(cx, 0, cx + cw, 0);
                g.addColorStop(0, '#e8590c'); g.addColorStop(0.5, '#ff922b'); g.addColorStop(1, '#d9480f');
                x.fillStyle = g;
                x.beginPath();
                x.moveTo(cx, L.ventana.y - 14);
                x.lineTo(cx + cw, L.ventana.y - 14);
                x.quadraticCurveTo(cx + cw * (q[0] < 0 ? 0.9 : 0.4), L.ventana.y + L.ventana.h * 0.6, cx + cw * (q[0] < 0 ? 1 : 0.2), L.ventana.y + L.ventana.h + 20);
                x.lineTo(cx + cw * (q[0] < 0 ? 0 : 1) - (q[0] < 0 ? 0 : 0), L.ventana.y + L.ventana.h + 20);
                x.closePath();
                x.fill();
            });
            x.fillStyle = '#868e96';
            x.fillRect(L.ventana.x - L.ventana.w * 0.35, L.ventana.y - 18, L.ventana.w * 1.7, 5);
            // Cuadro en la pared.
            var cq = { x: L.repisa.x + L.repisa.w * 0.3, y: Math.max(L.bocina.y + L.bocina.r + 24, L.repisa.y - L.H * 0.2), w: L.repisa.w * 0.4, h: L.H * 0.11 };
            if (cq.y + cq.h < L.repisa.y - L.tam * 0.75) {
                x.fillStyle = 'rgba(0,0,0,0.15)'; x.fillRect(cq.x + 4, cq.y + 5, cq.w, cq.h);
                K.madera(x, cq.x - 6, cq.y - 6, cq.w + 12, cq.h + 12, { r: 3 });
                var gc = x.createLinearGradient(0, cq.y, 0, cq.y + cq.h);
                gc.addColorStop(0, '#a5d8ff'); gc.addColorStop(1, '#ffec99');
                x.fillStyle = gc; x.fillRect(cq.x, cq.y, cq.w, cq.h);
                x.fillStyle = '#51cf66';
                x.beginPath(); x.moveTo(cq.x, cq.y + cq.h); x.lineTo(cq.x + cq.w * 0.35, cq.y + cq.h * 0.4); x.lineTo(cq.x + cq.w * 0.6, cq.y + cq.h * 0.75); x.lineTo(cq.x + cq.w * 0.8, cq.y + cq.h * 0.5); x.lineTo(cq.x + cq.w, cq.y + cq.h); x.fill();
                x.fillStyle = '#ffd43b'; x.beginPath(); x.arc(cq.x + cq.w * 0.78, cq.y + cq.h * 0.28, cq.h * 0.13, 0, Math.PI * 2); x.fill();
            }
            // Alfombra redonda con borde.
            var a = L.alfombra;
            K.sombra(x, a.x, a.y + 6, a.rx * 1.05, a.ry * 1.1, 0.25);
            x.fillStyle = '#4dabf7'; x.beginPath(); x.ellipse(a.x, a.y, a.rx, a.ry, 0, 0, Math.PI * 2); x.fill();
            x.fillStyle = '#74c0fc'; x.beginPath(); x.ellipse(a.x, a.y, a.rx * 0.8, a.ry * 0.78, 0, 0, Math.PI * 2); x.fill();
            x.fillStyle = '#a5d8ff'; x.beginPath(); x.ellipse(a.x, a.y, a.rx * 0.5, a.ry * 0.48, 0, 0, Math.PI * 2); x.fill();
            x.strokeStyle = 'rgba(255,255,255,0.7)'; x.setLineDash([6, 6]); x.lineWidth = 2;
            x.beginPath(); x.ellipse(a.x, a.y, a.rx * 0.92, a.ry * 0.9, 0, 0, Math.PI * 2); x.stroke(); x.setLineDash([]);
            K.grano(x, a.x - a.rx, a.y - a.ry, a.rx * 2, a.ry * 2, 400, ['#1c7ed6', '#e7f5ff'], 1, 0.25);
            // Repisa con ménsulas.
            var r = L.repisa;
            x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(r.x + 4, r.y + 6, r.w, 10);
            K.madera(x, r.x, r.y, r.w, Math.max(12, L.H * 0.022), { r: 3 });
            x.fillStyle = '#495057';
            [0.12, 0.88].forEach(function (k) {
                x.beginPath(); x.moveTo(r.x + r.w * k - 4, r.y + 12); x.lineTo(r.x + r.w * k + 4, r.y + 12); x.lineTo(r.x + r.w * k + 4, r.y + 40); x.closePath(); x.fill();
            });
            // Planta en maceta junto a la ventana.
            var px = L.ventana.x + L.ventana.w + L.ventana.w * 0.45, py = L.y0;
            if (px < r.x - 30) {
                K.sombra(x, px, py + 4, 34, 8, 0.3);
                x.fillStyle = '#c0582b'; x.beginPath(); x.moveTo(px - 24, py - 46); x.lineTo(px + 24, py - 46); x.lineTo(px + 18, py); x.lineTo(px - 18, py); x.fill();
                x.fillStyle = '#d9692f'; x.fillRect(px - 27, py - 52, 54, 9);
                for (var i = 0; i < 9; i++) {
                    var ang = -Math.PI / 2 + (i - 4) * 0.32;
                    x.fillStyle = i % 2 ? '#2f9e44' : '#40c057';
                    x.save(); x.translate(px, py - 50); x.rotate(ang + Math.PI / 2);
                    x.beginPath(); x.ellipse(0, -38, 9, 34, 0, 0, Math.PI * 2); x.fill(); x.restore();
                }
            }
            // Mesita redonda con lámpara.
            var m = L.mesa;
            K.sombra(x, m.x + m.w / 2, L.y0 + L.H * 0.15, m.w * 0.6, 10, 0.3);
            x.fillStyle = '#8c5724'; x.fillRect(m.x + m.w / 2 - 5, m.y, 10, L.H * 0.15);
            x.fillStyle = '#6f4119'; x.beginPath(); x.ellipse(m.x + m.w / 2, m.y + L.H * 0.15, m.w * 0.32, 7, 0, 0, Math.PI * 2); x.fill();
            x.fillStyle = '#b97c3a'; x.beginPath(); x.ellipse(m.x + m.w / 2, m.y + 4, m.w / 2 + 6, 11, 0, 0, Math.PI * 2); x.fill();
            x.fillStyle = '#d39a55'; x.beginPath(); x.ellipse(m.x + m.w / 2, m.y, m.w / 2 + 6, 10, 0, 0, Math.PI * 2); x.fill();
            // Sofá.
            var s = L.sofa;
            K.sombra(x, s.x + s.w / 2, s.y + s.h + 4, s.w * 0.55, 14, 0.35);
            var gs = x.createLinearGradient(0, s.y, 0, s.y + s.h);
            gs.addColorStop(0, '#9775fa'); gs.addColorStop(1, '#6741d9');
            x.fillStyle = gs;
            K.rr(x, s.x + s.w * 0.06, s.y - s.h * 0.15, s.w * 0.88, s.h * 0.75, 22); x.fill();          // respaldo
            x.fillStyle = '#7950f2';
            K.rr(x, s.x + s.w * 0.04, s.y + s.h * 0.48, s.w * 0.92, s.h * 0.38, 16); x.fill();          // asiento
            x.fillStyle = '#845ef7';
            K.rr(x, s.x + s.w * 0.1, s.y + s.h * 0.45, s.w * 0.4, s.h * 0.16, 12); x.fill();            // cojines del asiento
            K.rr(x, s.x + s.w * 0.5, s.y + s.h * 0.45, s.w * 0.4, s.h * 0.16, 12); x.fill();
            x.fillStyle = '#5f3dc4';
            K.rr(x, s.x - s.w * 0.02, s.y + s.h * 0.2, s.w * 0.13, s.h * 0.68, 14); x.fill();          // brazos
            K.rr(x, s.x + s.w * 0.89, s.y + s.h * 0.2, s.w * 0.13, s.h * 0.68, 14); x.fill();
            x.fillStyle = 'rgba(255,255,255,0.14)';
            K.rr(x, s.x + s.w * 0.12, s.y - s.h * 0.1, s.w * 0.76, s.h * 0.08, 10); x.fill();
            x.fillStyle = '#3b2a6b';
            x.fillRect(s.x + s.w * 0.08, s.y + s.h * 0.86, 10, s.h * 0.12);
            x.fillRect(s.x + s.w * 0.92 - 10, s.y + s.h * 0.86, 10, s.h * 0.12);
            // Cojín decorativo.
            x.fillStyle = '#ffd43b';
            x.save(); x.translate(s.x + s.w * 0.8, s.y + s.h * 0.3); x.rotate(0.25);
            K.rr(x, -s.w * 0.08, -s.h * 0.12, s.w * 0.16, s.h * 0.24, 10); x.fill(); x.restore();
            // Interior oscuro de la caja de juguetes.
            var c = L.caja;
            K.sombra(x, c.x + c.w / 2, c.y + c.h + 4, c.w * 0.6, 10, 0.35);
            x.fillStyle = '#5c3a17'; K.rr(x, c.x, c.y - c.h * 0.18, c.w, c.h * 0.3, 6); x.fill();
            // Tapa abierta apoyada atrás.
            K.madera(x, c.x + 4, c.y - c.h * 0.85, c.w - 8, c.h * 0.6, { claro: '#e8a35c', medio: '#cf8642', oscuro: '#9c5a22', r: 6 });
        },

        /* ── Juguetes ── */

        sitioDe: function (j) { return this.L.sitios[j.sitio]; },

        poner: async function (ids) {
            var self = this;
            var L = this.L;
            var libres = Ut.mezclar(L.sitios.map(function (s, i) { return i; }));
            var proms = ids.map(function (id, k) {
                var si = libres[k % libres.length];
                var s = L.sitios[si];
                var tam = L.tam;
                var a = Act.crear(self, id, s.x, -tam, tam);
                if (a.animarIdle) a.animarIdle(false);
                a.sonido = self.sonidoDe(id);
                a.cont.setScale(s.esc).setDepth(20 + s.y / 1000);
                var j = { id: id, actor: a, sitio: si, estado: 'cae' };
                self.juguetes.push(j);
                self.vivos.push(a);
                var yf = s.y - tam * s.esc * 0.42;
                return esperar(self, k * 160).then(function () {
                    return tw(self, { targets: a.cont, y: yf, duration: 520, ease: 'Bounce.easeOut' });
                }).then(function () {
                    j.estado = 'quieto';
                    self.granos(s.x, s.y, 6, { colores: [0xdee2e6, 0xf1f3f5], dist: 30, cae: 4 });
                    K.ruido({ f: 300, q: 0.8, dur: 0.12, vol: 0.12 });
                });
            });
            await Promise.all(proms);
        },

        guardarEnCaja: function (j) {
            var self = this;
            var L = this.L;
            var a = j.actor;
            j.estado = 'guardado';
            var x0 = a.cont.x, y0 = a.cont.y, s0 = a.cont.scale;
            var dx = L.caja.x + L.caja.w / 2, dy = L.caja.y + L.caja.h * 0.15;
            var cima = Math.min(y0, dy) - L.tam;
            var o = { t: 0 };
            a.cont.setDepth(39);
            return tw(this, {
                targets: o, t: 1, duration: 700, ease: 'Sine.easeInOut',
                onUpdate: function () {
                    var t = o.t;
                    a.cont.x = x0 + (dx - x0) * t;
                    a.cont.y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cima + t * t * dy;
                    a.cont.setScale(s0 * (1 - t * 0.45));
                    a.cont.angle = t * 300;
                }
            }).then(function () {
                K.ruido({ f: 500, q: 0.7, dur: 0.15, vol: 0.12 });
                self.granos(dx, L.caja.y, 6, { colores: [0xffd43b, 0xffffff], dist: 40 });
                return tw(self, { targets: a.cont, y: dy + L.caja.h * 0.5, alpha: 0, duration: 260 });
            });
        },

        disponibles: function () {
            return this.juguetes.filter(function (j) { return j.estado === 'quieto'; }).map(function (j) { return j.id; });
        },

        /* ── Burbuja de sonido ── */

        crearBurbuja: function () {
            var self = this;
            var L = this.L;
            this.quitarBurbuja();
            var r = Math.max(34, L.tam * 0.36);
            var c = this.add.container(L.bocina.x, L.bocina.y).setDepth(60).setScale(0.2);
            var cuerpo = this.add.circle(0, 0, r, 0xbde0ff, 0.38).setStrokeStyle(4, 0xffffff, 0.95);
            var tinte = this.add.circle(0, 0, r * 0.92, 0xffc9de, 0.18);
            var brillo = this.add.ellipse(-r * 0.35, -r * 0.42, r * 0.5, r * 0.28, 0xffffff, 0.75).setAngle(-30);
            var ondas = this.add.graphics();
            c.add([cuerpo, tinte, ondas, brillo]);
            c.r = r;
            c.ondas = ondas;
            c.vida = 1;
            c.base = { x: L.W * 0.5, y: L.y0 - L.H * 0.1 };
            c.fase = Math.random() * 6;
            this.burbuja = c;
            K.tono({ f: 500, f2: 900, dur: 0.25, vol: 0.06 });
            return tw(this, { targets: c, scale: 1, y: L.bocina.y + L.bocina.r + r + 10, duration: 500, ease: 'Back.easeOut' }).then(function () {
                if (self.burbuja === c) c.libre = true;
            });
        },

        quitarBurbuja: function (reventar) {
            var c = this.burbuja;
            if (!c) return;
            this.burbuja = null;
            if (reventar) {
                Ut.estallido(this, c.x, c.y, { n: 10, tex: 'burbuja', tam: 18, dist: 70, sinTinte: true, depth: 61 });
                K.tono({ f: 900, f2: 300, dur: 0.12, vol: 0.07 });
            }
            this.tweens.add({ targets: c, scale: reventar ? 1.4 : 0.2, alpha: 0, duration: 200, onComplete: function () { c.destroy(); } });
        },

        dibujarOndas: function (c, t) {
            var g = c.ondas;
            g.clear();
            var r = c.r;
            var pulso = this.sonando ? 1 : 0.55;
            for (var k = 0; k < 3; k++) {
                var f = ((t / 700) + k / 3) % 1;
                g.lineStyle(3, 0xffffff, (1 - f) * pulso);
                g.beginPath(); g.arc(-r * 0.2, 0, r * (0.18 + f * 0.5), -0.9, 0.9); g.strokePath();
            }
            g.fillStyle(0xffffff, 0.9);
            g.fillCircle(-r * 0.3, 0, r * 0.1);
        },

        anunciar: function () {
            var self = this;
            var p = this.burbuja ? Promise.resolve() : this.crearBurbuja();
            return p.then(function () { return self.escuchar(self.sonidoDe(self.objetivo)); });
        },

        juguetePara: function (x, y) {
            var mejor = null, dmin = Infinity;
            var L = this.L;
            this.juguetes.forEach(function (j) {
                if (j.estado !== 'quieto') return;
                var c = j.actor.cont;
                var d = Math.hypot(x - c.x, y - c.y);
                if (d < L.tam * c.scale * 0.62 && d < dmin) { dmin = d; mejor = j; }
            });
            return mejor;
        },

        alTocar: function (p) {
            var b = this.burbuja;
            if (this.fase !== 'jugar' || !b) return;
            if (Math.hypot(p.x - b.x, p.y - b.y) < b.r * 1.5) {
                this.agarrada = { dx: b.x - p.x, dy: b.y - p.y };
                b.libre = false;
                this.tweens.killTweensOf(b);
                b.setScale(1.1);
                K.tono({ f: 700, dur: 0.06, vol: 0.05 });
                this.pista.reiniciar();
            } else {
                // Tocar un juguete suelto: suena él (para comparar), sin contar como error.
                var j = this.juguetePara(p.x, p.y);
                if (j && !this.sonando) {
                    this.escuchar(j.actor.sonido, { breve: true, vol: 0.7, bocina: false });
                    j.actor.saltito(0.08, 1);
                }
            }
        },

        alMover: function (p) {
            if (!this.agarrada || !this.burbuja) return;
            var b = this.burbuja;
            b.x = p.x + this.agarrada.dx * 0.5;
            b.y = p.y + this.agarrada.dy * 0.5;
            var j = this.juguetePara(b.x, b.y);
            if (j !== this.apuntado) {
                if (this.apuntado) this.apuntado.actor.cont.setScale(this.sitioDe(this.apuntado).esc);
                this.apuntado = j;
                if (j) { j.actor.cont.setScale(this.sitioDe(j).esc * 1.1); K.tono({ f: 1200, dur: 0.04, vol: 0.03 }); }
            }
        },

        alSoltar: function () {
            if (!this.agarrada) return;
            this.agarrada = null;
            var b = this.burbuja;
            if (this.apuntado) this.apuntado.actor.cont.setScale(this.sitioDe(this.apuntado).esc);
            this.apuntado = null;
            if (!b) return;
            b.setScale(1);
            var j = this.juguetePara(b.x, b.y);
            if (j && this.fase === 'jugar') this.entregar(j);
            else b.libre = true;
        },

        entregar: async function (j) {
            var b = this.burbuja;
            var a = j.actor;
            if (j.id === this.objetivo) {
                j.estado = 'premio';
                this.fase = 'premio';
                await tw(this, { targets: b, x: a.cont.x, y: a.cont.y, scale: 0.4, alpha: 0.6, duration: 220 });
                this.quitarBurbuja(true);
                this.brillo(a.cont.x, a.cont.y, 10);
                a.cont.setDepth(50);
                var s0 = a.cont.scale;
                await tw(this, { targets: a.cont, y: a.cont.y - this.L.tam * 0.2, scale: s0 * 1.2, duration: 260, ease: 'Back.easeOut' });
                await this.celebrar(a);
                await this.guardarEnCaja(j);
                this.coleccion.push(a);
                await this.seguir();
            } else {
                // Rebota: la burbuja sale despedida y vuelve a flotar.
                var ang = Math.atan2(b.y - a.cont.y, b.x - a.cont.x);
                b.libre = false;
                K.tono({ f: 300, f2: 180, dur: 0.18, vol: 0.08 });
                this.tweens.add({ targets: b, x: b.x + Math.cos(ang) * 90, y: b.y + Math.sin(ang) * 60 - 30, scaleX: 1.2, scaleY: 0.85, duration: 260, ease: 'Quad.easeOut', yoyo: false, onComplete: function () { b.setScale(1); b.libre = true; } });
                await this.fallar(a);
            }
        },

        alSeguir: function () {
            // Nivel «cambia»: la burbuja de antes ya se fue; sale una nueva con el sonido nuevo.
            this.quitarBurbuja();
        },

        /* ── Niveles ── */

        planNiveles: function () {
            // Nivel 2: dos juguetes iguales que hay que llevar a la caja.
            return this.planBase({ extra: EXTRA, n: [3, 5, 5, 5], copias2: true, copias3: true });
        },

        prepararNivel: async function (i, nv) {
            var self = this;
            this.quitarBurbuja();
            var restos = this.juguetes.filter(function (j) { return j.estado === 'quieto'; });
            await Promise.all(restos.map(function (j) { return self.guardarEnCaja(j).then(function () { j.actor.destruir(); }); }));
            this.juguetes = [];
            this.vivos = this.coleccion.slice();
            await this.poner(nv.ids);
        },

        mostrarPista: function (cancelada) {
            var self = this;
            var b = this.burbuja;
            var j = this.juguetes.filter(function (q) { return q.id === self.objetivo && q.estado === 'quieto'; })[0];
            if (this.fase !== 'jugar' || !b || !j || this.sonando) return Promise.resolve();
            var a = j.actor;
            return this.ctx.mano({
                punto: { x: b.x, y: b.y }, holdMs: 300,
                arrastre: { dx: a.cont.x - b.x, dy: a.cont.y - b.y, durMs: 1100 },
                cancelado: function () { return cancelada() || self.fase !== 'jugar' || self.agarrada; }
            });
        },

        paso: function (time, delta) {
            var b = this.burbuja;
            if (!b || !b.active) return;
            this.dibujarOndas(b, time);
            if (b.libre) {
                b.fase += delta / 1000;
                var tx = b.base.x + Math.sin(b.fase * 0.5) * this.L.W * 0.18;
                var ty = b.base.y + Math.sin(b.fase * 0.9) * this.L.H * 0.05;
                b.x += (tx - b.x) * Math.min(1, delta / 600);
                b.y += (ty - b.y) * Math.min(1, delta / 600);
                b.angle = Math.sin(b.fase * 1.3) * 6;
                // Nivel 3 y 4: se desinfla si nadie la lleva y sale otra.
                if (this.nv && this.nv.dificil && this.fase === 'jugar' && !this.sonando) {
                    b.vida -= delta / 11000;
                    b.setScale(0.55 + b.vida * 0.45);
                    if (b.vida <= 0) {
                        this.quitarBurbuja(true);
                        this.time.delayedCall(500, this.anunciar, [], this);
                    }
                }
            }
            // La burbuja agarrada se ve tensa: tiembla un poco.
            if (this.agarrada) b.angle = Math.sin(time / 50) * 3;
        },

        estadoExtra: function () {
            var b = this.burbuja;
            return {
                burbuja: b ? { x: Math.round(b.x), y: Math.round(b.y), vida: +b.vida.toFixed(2) } : null,
                juguetes: this.juguetes.map(function (j) { return { id: j.id, x: Math.round(j.actor.cont.x), y: Math.round(j.actor.cont.y), estado: j.estado }; })
            };
        },

        zonaFiesta: function () { var L = this.L; return { x: L.W * 0.06, y: L.y0 + (L.H - L.y0) * 0.45, w: L.W * 0.62 }; },

        antesDeFiesta: async function () {
            var L = this.L;
            this.quitarBurbuja(true);
            // Salen todos de la caja.
            this.coleccion.forEach(function (a) { a.cont.setPosition(L.caja.x + L.caja.w / 2, L.caja.y).setAlpha(1).setScale(0.5); });
            this.juguetes.forEach(function (j) { if (j.estado === 'quieto') j.actor.cont.setAlpha(0.35); });
        },

        /* ── Escena final: desfile por la sala. Salen de la caja, dan la vuelta a la alfombra al
              ritmo del reloj (cada uno suena al pasar por delante) y suben a la repisa. ── */

        escenaFinal: async function () {
            var self = this;
            var L = this.L, A0 = L.alfombra;
            var vistos = {};
            var lista = this.coleccion.filter(function (a) { if (!a.cont || !a.cont.active || vistos[a.id]) return false; vistos[a.id] = 1; return true; });
            this.coleccion.forEach(function (a) { if (lista.indexOf(a) < 0 && a.cont) a.cont.setVisible(false); });
            // Los juguetes del último nivel que no se eligieron se van: la sala queda para el desfile.
            this.juguetes.forEach(function (j) { if (lista.indexOf(j.actor) < 0 && j.actor.cont) self.tweens.add({ targets: j.actor.cont, alpha: 0, duration: 300 }); });
            var n = lista.length;
            if (!n) return;
            var tamD = Math.min(L.tam * 0.62, (2 * Math.PI * A0.rx) / n * 0.9);
            var rx = Math.max(A0.rx * 1.05, tamD * 1.2), ry = Math.max(A0.ry * 1.35, tamD * 0.5);
            var punto = function (ang) { return { x: A0.x + Math.cos(ang) * rx, y: A0.y + Math.sin(ang) * ry - tamD * 0.35 }; };
            var gap = Math.min(0.75, (Math.PI * 2) / n);
            // 1) Salen de la caja uno tras otro y se forman en la alfombra.
            for (var i = 0; i < n; i++) {
                var a = lista[i];
                a.cont.setVisible(true).setAlpha(1).setAngle(0).setDepth(45);
                var p = punto(Math.PI - i * gap);
                K.tono({ f: 500 + i * 60, f2: 900 + i * 60, dur: 0.12, vol: 0.04 });
                this.saltarA(a.cont, p.x, p.y, { ms: 420, alto: L.tam * 0.6, esc: tamD / a.tam });
                await esperar(this, 220);
            }
            await esperar(this, 450);
            if (!this.sigue()) return;
            // 2) Vuelta a la alfombra; el péndulo del reloj marca el paso.
            var o = { t: 0 };
            var sono = lista.map(function () { return false; });
            var ultTic = 0;
            await tw(this, {
                targets: o, t: 1, duration: Math.max(3600, n * 700), ease: 'Sine.easeInOut',
                onUpdate: function () {
                    lista.forEach(function (a, k) {
                        var ang = Math.PI - k * gap + o.t * Math.PI * 2;
                        var q = punto(ang);
                        a.cont.x = q.x;
                        a.cont.y = q.y + Math.abs(Math.sin(o.t * 40 + k)) * -6;   // pasitos
                        a.cont.scaleX = Math.abs(a.cont.scaleX) * (Math.sin(ang) >= 0 ? -1 : 1);
                        a.cont.setDepth(45 + Math.sin(ang));
                        // Al pasar por delante (abajo de la alfombra) suena y salta.
                        var frente = ((ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                        if (!sono[k] && Math.abs(frente - Math.PI / 2) < 0.25) {
                            sono[k] = true;
                            self.escuchar(a.sonido, { breve: true, bocina: false, vol: 0.75 });
                            if (a.saltito) a.saltito(0.12, 1);
                        }
                    });
                    if (self.time.now - ultTic > 480) { ultTic = self.time.now; K.ruido({ f: 3200, q: 5, dur: 0.035, vol: 0.06 }); }
                }
            });
            lista.forEach(function (a) { a.cont.scaleX = Math.abs(a.cont.scaleX); });
            if (!this.sigue()) return;
            // 3) Suben a la repisa (los que no caben quedan en fila sobre la alfombra).
            var R = L.repisa;
            var cabe = Math.max(1, Math.floor(R.w / (tamD * 0.95)));
            var enRepisa = Math.min(n, cabe), resto = n - enRepisa;
            var proms = lista.map(function (a, k) {
                var x, y;
                if (k < enRepisa) { x = R.x + R.w * (k + 0.5) / enRepisa; y = R.y - tamD * 0.42; }
                else { var j = k - enRepisa; x = A0.x + (j - (resto - 1) / 2) * tamD * 1.05; y = A0.y - tamD * 0.2; }
                return esperar(self, k * 160).then(function () {
                    return self.saltarA(a.cont, x, y, { ms: 520, alto: L.tam * 0.8 });
                }).then(function () { a.cont.setDepth(k < enRepisa ? 30 : 46); K.tono({ f: 700, dur: 0.05, vol: 0.04 }); });
            });
            await Promise.all(proms);
            await esperar(this, 300);
        },

        /* ── Demostración: vaca y gallo de peluche ── */

        demo: async function () {
            var self = this;
            var ctx = this.ctx;
            var t = ctx.textos || {};
            var d = this.config.demo || { sonido: 'mugido', correcto: 'vaca', opciones: ['gallo', 'vaca'] };
            var L = this.L;
            this.fase = 'demo';
            var limpiar = function () {
                ctx.quitarMano();
                self.quitarBurbuja();
                self.juguetes.forEach(function (j) { j.actor.destruir(); });
                self.juguetes = [];
                self.vivos = [];
            };
            await ctx.decir({ voz: 'zoe', texto: t.demostracion || '¡Mira cómo se juega!' }, { minMs: 1600 });
            if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
            // Sofá y mesita (a la izquierda: a la derecha se para el personaje del tutorial).
            var sitios = [0, 1];
            d.opciones.forEach(function (id, k) {
                var s = L.sitios[sitios[k]];
                var a = Act.crear(self, id, s.x, s.y - L.tam * s.esc * 0.42, L.tam);
                a.cont.setScale(s.esc).setDepth(20);
                a.sonido = id === d.correcto ? d.sonido : Act.sonidoDe(id);
                self.juguetes.push({ id: id, actor: a, sitio: sitios[k], estado: 'quieto' });
                self.vivos.push(a);
            });
            await this.crearBurbuja();
            var b = this.burbuja;
            b.libre = false;
            await this.escuchar(d.sonido);
            var vaca = this.juguetes.filter(function (q) { return q.id === d.correcto; })[0];
            if (!ctx.vivo() || !ctx.enDemo() || !vaca) return limpiar();
            var a = vaca.actor;
            await ctx.mano({
                punto: { x: b.x, y: b.y }, holdMs: 300,
                arrastre: { dx: a.cont.x - b.x, dy: a.cont.y - b.y, durMs: 1200, soltarEnDestino: true },
                onDuranteArrastre: function () { self.tweens.add({ targets: b, x: a.cont.x, y: a.cont.y, duration: 1200, ease: 'Sine.easeInOut' }); }
            });
            if (!ctx.vivo()) return limpiar();
            this.quitarBurbuja(true);
            K.efecto(this, 'recompensa');
            Ut.estallido(this, a.cont.x, a.cont.y - L.tam * 0.2, { n: 14, tex: 'estrella', tam: 28, dist: 150, sinTinte: true, depth: 85 });
            await Promise.all([this.escuchar(d.sonido, { breve: true, bocina: false }), a.acierto(1500)]);
            await ctx.decir({ voz: 'zoe', texto: t.demostracionAcierto || '¡Así se hace!' }, { estado: 'acierto', minMs: 1300 });
            await ctx.decir({ voz: 'zoe', texto: t.demostracionFin || '¡Ahora te toca a ti!' }, { minMs: 1000 });
            limpiar();
            await esperar(this, 300);
        }
    };

    K.crear({ id: 'sala', fondo: '#ffe8cc', escena: escena });
})(typeof window !== 'undefined' ? window : this);
