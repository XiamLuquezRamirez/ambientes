/**
 * «El arenero del parque» — motor propio de ¿Qué suena? (Asocia sonido e imagen, 3-4 años).
 *
 * Zoe enterró juguetes en el arenero. La bocina hace sonar uno; el niño FROTA la arena con el dedo
 * para desenterrar lo que hay debajo de cada montoncito. Cada juguete que asoma deja oír su propio
 * sonido (así el niño compara con el de la bocina) y, si es el que suena, lo TOCA para sacarlo:
 * sale de la arena, se sacude, hace su acción real y salta al carrito de Zoe. Si se equivoca, el
 * juguete suena, dice que no y se vuelve a hundir (la arena lo tapa otra vez). Sin castigo.
 *
 * Cuatro niveles (estrellas, sin texto):
 *   1  el juguete del reto entre los tres del documento
 *   2  otro sonido; hay dos juguetes iguales que encontrar entre cinco
 *   3  otro sonido; un topo cambia de lugar los juguetes enterrados
 *   4  el sonido cambia después de cada juguete encontrado (topo incluido)
 *
 * API (PedniaParejaBase.crearMotor → window.PedniaJuego): montar, demo, jugar, fiestaFinal, estado.
 */
(function (global) {
    'use strict';

    var B = global.PedniaParejaBase;
    var Ut = B.util;
    var A = global.PedniaArte;
    var Act = global.AsociaActores;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var mezclar = Ut.mezclar;
    var rnd = Ut.rnd;

    var CELDA = 12;
    var APLANA = 0.8;   // los hoyos se ven ovalados: el suelo está inclinado hacia el fondo
    var EXTRA = ['tren', 'avion', 'vaca', 'gallo'];   // solo los que tienen imagen del diseño
    var BOTONES_ABAJO = { w: 150, h: 96 };   // accesibilidad (esquina inferior derecha)

    function efecto(scene, n) { if (scene.ctx.efecto) scene.ctx.efecto(n); }

    /* ── Audio propio: arena que raspa y cae (ruido filtrado, sin archivos) ── */

    var audio = { ctx: null, ruido: null };
    function actx() {
        var C = global.AudioContext || global.webkitAudioContext;
        if (!C) return null;
        if (!audio.ctx) audio.ctx = new C();
        if (audio.ctx.state === 'suspended') audio.ctx.resume();
        if (!audio.ruido) {
            var n = Math.floor(audio.ctx.sampleRate * 1.2);
            audio.ruido = audio.ctx.createBuffer(1, n, audio.ctx.sampleRate);
            var d = audio.ruido.getChannelData(0);
            for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        }
        return audio.ctx;
    }
    function rasguno(fuerza, grave) {
        var c = actx();
        if (!c) return;
        var t = c.currentTime;
        var dur = grave ? 0.32 : 0.09 + Math.random() * 0.05;
        var s = c.createBufferSource();
        s.buffer = audio.ruido;
        var f = c.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = grave ? 700 : 1700 + Math.random() * 1500;
        f.Q.value = grave ? 0.7 : 1.4;
        var g = c.createGain();
        var v = (grave ? 0.16 : 0.07) * (fuerza || 1);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(v, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        s.connect(f).connect(g).connect(c.destination);
        s.start(t, Math.random() * 0.8, dur + 0.02);
    }

    /* ── Texturas dibujadas (arena, hoyo húmedo, montículo, marco, carrito, topo) ── */

    function grano(ctx, w, h, n, colores, rmax) {
        for (var i = 0; i < n; i++) {
            ctx.fillStyle = colores[(Math.random() * colores.length) | 0];
            ctx.globalAlpha = 0.25 + Math.random() * 0.5;
            var r = Math.random() * (rmax || 1.6) + 0.4;
            ctx.beginPath();
            ctx.arc(Math.random() * w, Math.random() * h, r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    /** Baldosa de arena seca (patrón que se repite sin costuras visibles). */
    function baldosaArena(seco) {
        var c = global.document.createElement('canvas');
        c.width = c.height = 192;
        var x = c.getContext('2d');
        x.fillStyle = seco ? '#ecc98c' : '#a87e4b';
        x.fillRect(0, 0, 192, 192);
        // Ondas suaves que deja el viento.
        x.strokeStyle = seco ? 'rgba(255,240,205,0.35)' : 'rgba(70,45,20,0.18)';
        x.lineWidth = 2;
        for (var k = 0; k < 7; k++) {
            x.beginPath();
            var y0 = k * 28 + Math.random() * 10;
            for (var px = -10; px <= 202; px += 8) x.lineTo(px, y0 + Math.sin(px / 23 + k) * 4);
            x.stroke();
        }
        grano(x, 192, 192, 1400, seco ? ['#fff3d6', '#d9ae6a', '#c4955a', '#f7dca5', '#b98b52'] : ['#7a5530', '#c39a62', '#5e4022', '#94693b'], seco ? 1.5 : 1.8);
        // Piedritas.
        for (var p = 0; p < 9; p++) {
            x.fillStyle = ['#bfb3a3', '#a39684', '#d8cfc2', '#8f8170'][p % 4];
            x.beginPath();
            x.ellipse(Math.random() * 192, Math.random() * 192, 1.5 + Math.random() * 2.5, 1 + Math.random() * 1.8, Math.random() * 3, 0, Math.PI * 2);
            x.fill();
        }
        return c;
    }

    function texturaCanvas(scene, clave, w, h, pintar) {
        if (scene.textures.exists(clave)) scene.textures.remove(clave);
        var t = scene.textures.createCanvas(clave, Math.max(2, Math.ceil(w)), Math.max(2, Math.ceil(h)));
        pintar(t.getContext(), t.width, t.height);
        t.refresh();
        return t;
    }

    /**
     * Borde de arriba de la arena, sin marco: una fila de montoncitos (como los surcos de una
     * huerta) que tapa la línea recta de la capa y se recorta contra el pasto.
     * Lienzo de alto h = 2.2·r; la superficie de la arena empieza en y = 1.1·r.
     */
    function pintarBorde(x, w, h, r, baldosa) {
        var base = r * 1.1;
        var pat = x.createPattern(baldosa, 'repeat');
        if (pat.setTransform && global.DOMMatrix) pat.setTransform(new global.DOMMatrix().scale(0.6, 0.47));
        function lomo(cx, cy, rx, ry, oscuro) {
            x.save();
            x.beginPath();
            x.ellipse(cx, cy, rx, ry, 0, Math.PI, 0);          // media elipse: la panza queda enterrada
            x.lineTo(cx + rx, cy + ry * 0.55);
            x.lineTo(cx - rx, cy + ry * 0.55);
            x.closePath();
            x.fillStyle = pat;
            x.fill();
            x.clip();
            // Luz arriba a la izquierda y sombra abajo: se lee como un montoncito con volumen.
            var g = x.createLinearGradient(cx - rx * 0.4, cy - ry, cx + rx * 0.3, cy + ry * 0.5);
            g.addColorStop(0, 'rgba(255,246,222,0.55)');
            g.addColorStop(0.5, 'rgba(255,240,205,0.05)');
            g.addColorStop(1, oscuro ? 'rgba(120,80,35,0.38)' : 'rgba(140,95,45,0.25)');
            x.fillStyle = g;
            x.fillRect(cx - rx, cy - ry, rx * 2, ry * 1.6);
            x.restore();
            x.strokeStyle = 'rgba(150,105,55,0.45)';
            x.lineWidth = 1.2;
            x.beginPath();
            x.ellipse(cx, cy, rx, ry, 0, Math.PI * 1.08, Math.PI * 1.92);
            x.stroke();
        }
        // Sombra suave de los montoncitos sobre el pasto.
        x.fillStyle = 'rgba(40,70,0,0.18)';
        x.beginPath();
        x.ellipse(w / 2, base - r * 0.15, w * 0.6, r * 0.8, 0, Math.PI, 0);
        x.fill();
        // Fila de atrás (más chicos y más oscuros) y fila de adelante, intercaladas.
        var paso = r * 1.5;
        var semilla = 7;
        var rnd = function () { semilla = (semilla * 9301 + 49297) % 233280; return semilla / 233280; };
        for (var cx = -r * 0.5; cx < w + r; cx += paso) {
            lomo(cx + paso * 0.5, base - r * 0.05, r * (0.75 + rnd() * 0.25), r * (0.6 + rnd() * 0.2), true);
        }
        for (cx = -r * 0.2; cx < w + r; cx += paso) {
            lomo(cx + (rnd() - 0.5) * r * 0.3, base + r * 0.25, r * (0.9 + rnd() * 0.3), r * (0.6 + rnd() * 0.25), false);
        }
        // Granitos sueltos que se escaparon al pasto.
        for (var i = 0; i < w / 14; i++) {
            x.fillStyle = ['#e8c486', '#d4a868', '#f5dcaa'][i % 3];
            x.globalAlpha = 0.7;
            x.beginPath();
            x.arc(rnd() * w, base - r * (0.55 + rnd() * 0.4), 0.8 + rnd() * 1.3, 0, Math.PI * 2);
            x.fill();
        }
        x.globalAlpha = 1;
    }

    /**
     * Pinta la arena "acostada" en el suelo: la textura se achica y se aplana hacia el fondo
     * y converge con los lados del cajón (trapecio). Se pinta fila por fila desde una lámina plana.
     */
    function pintarSuelo(ctx, w, h, ins, baldosa) {
        var prof = function (v) { return 0.62 + 0.38 * v; };   // escala de la textura según la profundidad
        var anchoMax = Math.ceil(w / prof(0)) + 4;
        var srcH = 0, filas = [];
        var paso = 2;
        for (var y = 0; y < h; y += paso) {
            var v = y / h, d = prof(v);
            var ancho = w - 2 * ins * (1 - v);
            filas.push({ y: y, x0: ins * (1 - v), ancho: ancho, sw: ancho / d, sy: srcH });
            srcH += paso / (d * 0.78);
        }
        var lam = global.document.createElement('canvas');
        lam.width = anchoMax; lam.height = Math.ceil(srcH) + 4;
        var lx = lam.getContext('2d');
        lx.fillStyle = lx.createPattern(baldosa, 'repeat');
        lx.fillRect(0, 0, lam.width, lam.height);
        filas.forEach(function (f) {
            var sx = (anchoMax - f.sw) / 2;
            var sh = paso / ((0.62 + 0.38 * f.y / h) * 0.78);
            ctx.drawImage(lam, sx, f.sy, f.sw, Math.max(1, sh), f.x0, f.y, f.ancho, paso + 0.5);
        });
        // Más luz lejos (bruma) y un poco más de contraste cerca.
        var g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, 'rgba(255,248,230,0.18)');
        g.addColorStop(0.5, 'rgba(255,248,230,0)');
        g.addColorStop(1, 'rgba(90,60,25,0.06)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
    }

    /** Borra lo que queda fuera del trapecio del cajón. */
    function recortarTrapecio(ctx, w, h, ins) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(ins, 0); ctx.lineTo(0, h); ctx.closePath();
        ctx.moveTo(w, 0); ctx.lineTo(w - ins, 0); ctx.lineTo(w, h); ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    /* ══ Escena ══ */

    /** Imágenes diseñadas por el equipo para este juego (img/diseno/). Si falta alguna, queda el dibujo. */
    var DISENO = 'img/diseno/';
    var PIELES = ['avion', 'bicicleta', 'gallo', 'reloj', 'telefono', 'tren', 'vaca'];
    // Hueco del cajón dentro de carrito.svg (medido sobre la imagen de 420×314).
    var CAJON = { x0: 29, x1: 350, y0: 82, y1: 157 };
    // Sol y nubes recortados de fondo.png: centro y ancho en píxeles de la imagen original (1281×721).
    var CIELO = [
        { id: 'sol', x: 960, y: 112, w: 138 },     // entre los dos árboles del fondo nuevo (ya no viene dibujado en fondo.png)
        { id: 'nube1', x: 1058.5, y: 33, w: 107 },
        { id: 'nube2', x: 341.5, y: 36.5, w: 107 },
        { id: 'nube3', x: 771.5, y: 36.5, w: 107 },
        { id: 'nube4', x: 1225, y: 99, w: 90 },
        { id: 'nube5', x: 1055, y: 125.5, w: 44 },
        { id: 'nube6', x: 40.5, y: 166.5, w: 45 }
    ];

    var escena = {
        preload: function () {
            var self = this;
            var svg = function (k, f, w, h) { if (!self.textures.exists(k)) self.load.svg(k, DISENO + f, { width: w, height: h }); };
            if (!this.textures.exists('qs_fondo')) this.load.image('qs_fondo', DISENO + 'fondo.png');
            // El mismo fondo sin sol ni nubes, y esas piezas por separado para animarlas.
            if (!this.textures.exists('qs_fondo_frente')) this.load.image('qs_fondo_frente', DISENO + 'fondo_frente.png');
            CIELO.forEach(function (c) { if (!self.textures.exists('qs_' + c.id)) self.load.image('qs_' + c.id, DISENO + c.id + '.png'); });
            PIELES.forEach(function (id) { svg('qs_' + id, id + '.svg', 420, 320); });
            svg('qs_carrito', 'carrito.svg', 420, 314);
            svg('qs_escuchar', 'escuchar.svg', 300, 300);
            svg('qs_topo', 'topo.svg', 300, 300);
            // Estrella del diseño: se carga con las mismas claves que usa el arte dibujado
            // (arte.js: 'pa:estrella@tam'), así la usan el marcador, los estallidos y el final.
            [64, 128, 256].forEach(function (t) { svg('pa:estrella@' + t, 'estrella.svg', t, t); });
            for (var i = 1; i <= 5; i++) svg('qs_mariposa' + i, 'mariposa' + i + '.svg', 160, 160);
        },

        create: function () {
            // Los juguetes se visten con las imágenes del diseño (comun/actores.js: piel).
            var self = this;
            PIELES.forEach(function (id) { if (self.textures.exists('qs_' + id)) Act.piel(id, 'qs_' + id); });
            this.fase = 'intro';
            this.errores = 0;
            this.hechos = 0;
            this.atrapados = 0;
            this.nivelActual = 0;
            this.juguetes = [];
            this.enCarrito = [];
            this.ultimoSonido = -99999;
            this.ultimoRasguno = 0;
            this.cavando = null;
            this.baldosaSeca = baldosaArena(true);
            this.baldosaHumeda = baldosaArena(false);
            this.cameras.main.setBackgroundColor('#9fd3f5');
            this.armar();
            this.input.on('pointerdown', function (p) { self.alTocar(p); });
            this.input.on('pointermove', function (p) { self.alMover(p); });
            this.input.on('pointerup', function () { self.cavando = null; });
            this.input.on('pointerupoutside', function () { self.cavando = null; });
            this.scale.on('resize', function () {
                if (self.timerResize) self.timerResize.remove();
                self.timerResize = self.time.delayedCall(220, function () { self.armar(true); });
            });
            this.pista = Ut.crearPista(this, 9000, function (cancelada) { return self.mostrarPista(cancelada); });
        },

        /* ── Layout y escenario (se rearma completo al cambiar el tamaño) ── */

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            L.grosor = Math.max(16, Math.min(30, H * 0.045));
            var arriba = Math.max(H * 0.48, Math.min(300, H * 0.54));   // la arena ocupa algo menos de la mitad de abajo
            // La arena va directo en el suelo, sin marco: de borde a borde y hasta abajo de la pantalla.
            // Arriba la cierra una fila de montoncitos (L.grosor es su alto) y encima queda el pasto.
            L.R = { x: 0, y: arriba, w: W, h: H - arriba };
            L.ins = 0;
            L.tam = Math.max(78, Math.min(160, L.R.h * 0.44, L.R.w / 4.6));
            L.pincel = Math.max(26, L.tam * 0.24);
            var hueco = arriba - 70;
            L.bocina = { x: W / 2, y: Math.max(64, Math.min(132, 70 + hueco * 0.35)), r: Math.max(30, Math.min(44, hueco * 0.3)) };
            L.carrito = { w: Math.max(110, Math.min(190, W * 0.17)) };
            L.carrito.h = L.carrito.w * 0.42;
            L.carrito.x = 14 + L.carrito.w * 0.55;
            // Apoyado en el pasto, justo encima de los montoncitos del borde de la arena.
            L.carrito.y = L.R.y - L.grosor * 1.25 - L.carrito.h * 0.5;
            L.pres = W >= 700;
            L.presAlto = Math.min(170, Math.max(110, L.R.y - 70));
            L.presX = W - Math.max(70, L.presAlto * 0.42);
            return L;
        },

        armar: function (reubicar) {
            var self = this;
            var viejo = this.L;
            var L = this.L = this.calcular();
            var R = L.R;
            (this.estaticos || []).forEach(function (o) { o.destroy(); });
            this.estaticos = [];
            var keep = function (o) { self.estaticos.push(o); return o; };

            // Parque vivo por capas (comun/vida.js): cielo, sol, nubes, montañas, árboles y pájaros que se mueven y se pueden tocar.
            this.vidaAmb = global.AsociaVida ? global.AsociaVida.montar(this, keep) : null;
            if (this.textures.exists('qs_fondo')) {
                // Fondo del diseño (parque con cerca, sol y árboles): cubre la pantalla y su línea del
                // pasto queda justo detrás del borde de arriba del arenero.
                var f = this.textures.get('qs_fondo').getSourceImage();
                var pastoY = 308 / 721;                         // dónde empieza el pasto en la imagen
                var meta = R.y - L.grosor * 1.8;              // franja de pasto entre la cerca y la arena
                // Solo ancho y cielo: el pasto de abajo lo completa el relleno del mismo verde, así
                // la imagen no se agranda de más y no se cortan el sol ni las copas de los árboles.
                var s = Math.max(L.W / f.width, meta / (f.height * pastoY));
                var cielo = keep(this.add.graphics().setDepth(0));
                cielo.fillStyle(0x95dff6, 1); cielo.fillRect(0, 0, L.W, meta);
                cielo.fillStyle(0x8bc10a, 1); cielo.fillRect(0, meta, L.W, L.H - meta);
                var arriba = meta - f.height * pastoY * s;
                var separado = this.textures.exists('qs_fondo_frente') && this.textures.exists('qs_sol');
                // Con las piezas separadas, el fondo va con el cielo transparente y por encima del sol y
                // las nubes (profundidad 0.6): así pasan por detrás de los árboles.
                keep(this.add.image(L.W / 2, arriba, separado ? 'qs_fondo_frente' : 'qs_fondo').setOrigin(0.5, 0).setScale(s).setDepth(separado ? 0.7 : 0.5));
                if (separado) this.montarCielo(keep, f.width, arriba, s);
            } else {
                if (this.vidaAmb) this.vidaAmb.parque({ horizonte: R.y - L.grosor - 8, arboles: [0.3, 0.46, 0.7, 0.9], solX: 0.2 });
                // Pasto delante y a los costados del arenero.
                var pasto = keep(this.add.graphics().setDepth(1));
                pasto.fillStyle(0x6fbf4a, 1);
                pasto.fillRect(0, R.y - L.grosor, L.W, L.H - R.y + L.grosor);
                pasto.fillStyle(0x5aa83a, 1);
                for (var i = 0; i < L.W; i += 7) pasto.fillTriangle(i, R.y - L.grosor + 2, i + 3, R.y - L.grosor - 6 - (i * 7 % 5), i + 6, R.y - L.grosor + 2);
            }

            // Fondo del hoyo: arena húmeda y más oscura, acostada en el suelo como la seca.
            texturaCanvas(this, 'arenero_hoyo', R.w, R.h, function (x, w, h) {
                pintarSuelo(x, w, h, L.ins, self.baldosaHumeda);
                recortarTrapecio(x, w, h, L.ins);
            });
            keep(this.add.image(R.x, R.y, 'arenero_hoyo').setOrigin(0, 0).setDepth(4));

            // Lámina de arena seca en perspectiva: de acá se copia al tapar hoyos.
            this.arenaSeca = global.document.createElement('canvas');
            this.arenaSeca.width = Math.max(2, Math.ceil(R.w));
            this.arenaSeca.height = Math.max(2, Math.ceil(R.h));
            pintarSuelo(this.arenaSeca.getContext('2d'), R.w, R.h, L.ins, this.baldosaSeca);

            // Capa de arena seca que se borra con el dedo.
            this.capa = texturaCanvas(this, 'arenero_capa', R.w, R.h, function (x, w, h) {
                x.drawImage(self.arenaSeca, 0, 0);
                recortarTrapecio(x, w, h, L.ins);
            });
            this.capaCtx = this.capa.getContext();
            keep(this.add.image(R.x, R.y, 'arenero_capa').setOrigin(0, 0).setDepth(20));
            // Borde de arriba: una fila de montoncitos de arena sobre el pasto (sin marco), como un surco.
            var alto = L.grosor * 2.2;
            texturaCanvas(this, 'arenero_borde', L.W, alto, function (x, w, h) { pintarBorde(x, w, h, L.grosor, self.baldosaSeca); });
            keep(this.add.image(0, R.y - L.grosor * 1.1, 'arenero_borde').setOrigin(0, 0).setDepth(20.5));
            this.cols = Math.ceil(R.w / CELDA);
            this.filas = Math.ceil(R.h / CELDA);
            this.tapado = new Uint8Array(this.cols * this.filas).fill(1);

            this.montarBocina(keep);
            this.montarCarrito(keep);        // monta también la placa de estrellas, encima del cajón
            this.montarEstrellas(keep);      // respaldo si no está la imagen del carrito
            this.montarVida(keep);
            this.montarPresentador();

            // Al cambiar el tamaño, los juguetes conservan su lugar relativo y lo ya cavado se recava.
            if (reubicar && viejo) {
                this.juguetes.forEach(function (j) {
                    if (j.estado === 'fuera') return;
                    j.x = R.x + j.u * R.w;
                    j.y = R.y + j.v * R.h;
                    j.actor.cont.setPosition(j.x, j.y);
                    j.actor.cont.setScale(L.tam / j.tam0 * self.prof(j.y));
                    if (j.estado === 'visto') self.cavarElipse(j, 1.05);
                    else self.montonDe(j);
                });
                this.enCarrito.forEach(function (a, k) { self.ubicarEnCarrito(a, k, false); });
            }
            this.capa.refresh();
        },

        /**
         * Sol y nubes del fondo, recortados de la imagen del diseño (img/diseno/sol.png, nubeN.png)
         * y puestos en el mismo lugar: el sol respira y se balancea, las nubes viajan despacio.
         * Al tocarlos responden (el sol gira y sonríe más grande, la nube se infla).
         */
        montarCielo: function (keep, fw, arriba, s) {
            var self = this, L = this.L;
            var aPantalla = function (p) { return { x: L.W / 2 + (p.x - fw / 2) * s, y: arriba + p.y * s }; };
            this.cielo = [];
            this.sol = null;
            CIELO.forEach(function (c) {
                var clave = 'qs_' + c.id;
                if (!self.textures.exists(clave)) return;
                var p = aPantalla(c);
                if (c.id === 'sol') {
                    var halo = keep(self.add.circle(p.x, p.y, c.w * s * 0.62, 0xfff3a3, 0.35).setDepth(0.64));
                    var sol = keep(self.add.image(p.x, p.y, clave).setScale(s).setDepth(0.65));   // delante de las nubes y detrás de los árboles
                    sol.base = s; sol.halo = halo; sol.r = c.w * s * 0.5;
                    self.sol = sol;
                    return;
                }
                // Si el fondo queda recortado arriba, la nube baja lo justo para verse entera.
                var y = Math.max(p.y, c.w * s * 0.25 + 10);
                var n = keep(self.add.image(p.x, y, clave).setScale(s).setDepth(0.6));
                n.base = s; n.y0 = y; n.fase = Math.random() * 6;
                n.vx = (6 + Math.random() * 6) * (c.w / 100);   // las grandes (más cerca) van un poco más rápido
                self.cielo.push(n);
            });
        },

        /** Toque arriba: el sol o una nube responden. Devuelve true si tocó alguno. */
        tocarCielo: function (p) {
            var self = this;
            var sol = this.sol;
            if (sol && sol.active && Math.hypot(p.x - sol.x, p.y - sol.y) < sol.r * 1.1) {
                if (sol.girando) return true;
                sol.girando = true;
                efecto(this, 'boing');
                this.tweens.add({ targets: sol, angle: sol.angle + 360, duration: 900, ease: 'Back.easeInOut' });
                this.tweens.add({ targets: sol, scale: sol.base * 1.25, duration: 300, yoyo: true, hold: 300, ease: 'Sine.easeOut', onComplete: function () { sol.girando = false; } });
                Ut.estallido(this, sol.x, sol.y, { n: 10, tex: 'chispa', tam: 16, dist: sol.r * 1.6, colores: [0xffe066, 0xffffff], depth: 1 });
                return true;
            }
            var nube = null;
            (this.cielo || []).forEach(function (n) {
                if (n.active && !n.inflada && Math.abs(p.x - n.x) < n.displayWidth * 0.55 && Math.abs(p.y - n.y) < n.displayHeight * 0.8) nube = n;
            });
            if (nube) {
                nube.inflada = true;
                efecto(this, 'clic');
                this.tweens.add({ targets: nube, scaleX: nube.base * 1.3, scaleY: nube.base * 1.2, duration: 220, yoyo: true, ease: 'Sine.easeOut', onComplete: function () { nube.inflada = false; } });
                nube.vx *= 2.5;
                this.time.delayedCall(1500, function () { if (nube.active) nube.vx /= 2.5; });
                return true;
            }
            return false;
        },

        animarCielo: function (time, delta) {
            var L = this.L, sol = this.sol;
            var quieto = Ut.reducido && Ut.reducido();
            if (sol && sol.active && !sol.girando && !quieto) {
                sol.setScale(sol.base * (1 + Math.sin(time / 900) * 0.035));
                sol.angle = Math.sin(time / 1300) * 6;
            }
            if (sol && sol.halo && sol.halo.active) {
                var k = quieto ? 1 : 1 + Math.sin(time / 700) * 0.12;
                sol.halo.setScale(k).setAlpha(0.22 + (quieto ? 0 : Math.sin(time / 700) * 0.1));
            }
            (this.cielo || []).forEach(function (n) {
                if (!n.active) return;
                n.fase += delta / 1000;
                n.x += n.vx * (quieto ? 0.3 : 1) * delta / 1000;
                n.y = n.y0 + Math.sin(n.fase * 0.6) * 3;
                if (n.x - n.displayWidth / 2 > L.W + 10) n.x = -n.displayWidth / 2 - 10;
            });
        },

        montarBocina: function (keep) {
            var L = this.L;
            var b = keep(this.add.container(L.bocina.x, L.bocina.y).setDepth(30));
            var halo = this.add.circle(0, 0, L.bocina.r * 1.25, 0xffffff, 0.35);
            if (this.textures.exists('qs_escuchar')) {
                // Botón de escuchar del diseño (la oreja morada).
                b.add([halo, this.add.image(0, 0, 'qs_escuchar').setDisplaySize(L.bocina.r * 2.3, L.bocina.r * 2.3)]);
            } else {
                var plato = this.add.circle(0, 0, L.bocina.r, 0xff922b).setStrokeStyle(5, 0xffffff);
                var luz = this.add.circle(-L.bocina.r * 0.3, -L.bocina.r * 0.35, L.bocina.r * 0.35, 0xffffff, 0.3);
                var icono = this.add.image(0, 0, A.textura(this, 'bocina', 128)).setDisplaySize(L.bocina.r * 1.35, L.bocina.r * 1.35);
                b.add([halo, plato, luz, icono]);
            }
            b.halo = halo;
            this.bocina = b;
            this.ondasG = keep(this.add.graphics().setDepth(29));
        },

        /**
         * Marcador del diseño: una placa rosada con borde encima del carrito, con una estrella
         * por nivel. Se apagan en gris hasta que el niño gana el nivel.
         */
        montarMarcador: function (keep, j) {
            var self = this;
            this.estrellas = [];
            var n = 4;
            var ancho = (j.x1 - j.x0) * 1.04;
            var tam = Math.min(ancho / n * 0.82, (j.y1 - j.y0) * 0.72);
            var pad = tam * 0.3, radio = tam * 0.34;
            var w = tam * n + tam * 0.22 * (n - 1) + pad * 2;
            var h = tam + pad * 1.1;
            // Despegada del carrito, flotando sobre el pasto.
            var cx = (j.x0 + j.x1) / 2, cy = j.y0 - h * 1.95;
            var g = keep(this.add.graphics().setDepth(29));
            g.fillStyle(0xd62a7f, 1);                                  // borde rosado oscuro
            g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, radio);
            g.fillStyle(0xf74d9c, 1);                                  // relleno rosado claro
            g.fillRoundedRect(cx - w / 2 + tam * 0.11, cy - h / 2 + tam * 0.11, w - tam * 0.22, h - tam * 0.22, radio * 0.82);
            for (var i = 0; i < n; i++) {
                var x = cx - w / 2 + pad + tam / 2 + i * (tam + tam * 0.22);
                var e = keep(this.add.image(x, cy, A.textura(this, 'estrella', 128)).setDisplaySize(tam, tam).setDepth(30));
                if (i >= this.nivelActual) e.setTint(0x9b6f86).setAlpha(0.5);
                this.estrellas.push(e);
            }
            this.marcador = { x: cx, y: cy, w: w, h: h, tam: tam };
        },

        /** Sin la imagen del carrito no hay placa: las estrellas van junto a la bocina. */
        montarEstrellas: function (keep) {
            if (this.textures.exists('qs_carrito')) return;
            var L = this.L;
            this.estrellas = [];
            var tam = Math.max(30, Math.min(48, L.bocina.r * 0.95, (L.W - L.bocina.x - L.bocina.r - 130) / 4.3));
            for (var i = 0; i < 4; i++) {
                var x = L.bocina.x + L.bocina.r + 10 + tam / 2 + i * (tam + 4);
                var e = keep(this.add.image(x, L.bocina.y, A.textura(this, 'estrella', 128)).setDisplaySize(tam, tam).setDepth(30));
                if (i >= this.nivelActual) e.setTint(0x8a8f98).setAlpha(0.45);
                this.estrellas.push(e);
            }
        },

        montarCarrito: function (keep) {
            var c = this.L.carrito;
            if (this.textures.exists('qs_carrito')) {
                // Carrito del diseño. Una copia recortada de su mitad de abajo va adelante, así los
                // juguetes quedan DENTRO del cajón y no flotando encima.
                var src = this.textures.get('qs_carrito').getSourceImage();
                var w = c.w * 1.3, k = w / src.width;
                var cx = c.x + c.w * 0.08, cy = c.y + c.h * 0.05;
                keep(this.add.ellipse(c.x, c.y + c.h * 0.62, c.w * 1.05, c.h * 0.22, 0x000000, 0.18).setDepth(5));
                keep(this.add.image(cx, cy, 'qs_carrito').setScale(k).setDepth(6));
                var frente = keep(this.add.image(cx, cy, 'qs_carrito').setScale(k).setDepth(9));
                // El cajón, medido en la imagen (420×314): va de x 29-350 y de y 82-157.
                // El recorte empieza en la mitad del cajón: lo de abajo tapa a los juguetes.
                // Corta justo bajo el borde de arriba del cajón: lo de abajo tapa a los juguetes,
                // de los que solo asoma la parte de arriba (como si estuvieran metidos dentro).
                var corte = CAJON.y0 + (CAJON.y1 - CAJON.y0) * 0.22;
                frente.setCrop(0, corte, src.width, src.height - corte);
                this.frenteCarrito = frente;
                // Hueco real del cajón en coordenadas de pantalla: ahí van los juguetes.
                var ix = cx - src.width * k / 2, iy = cy - src.height * k / 2;
                this.cajon = {
                    x0: ix + CAJON.x0 * k, x1: ix + CAJON.x1 * k,
                    y0: iy + CAJON.y0 * k, y1: iy + CAJON.y1 * k
                };
                this.montarMarcador(keep, this.cajon);
                return;
            }
            this.cajon = null;
            var g = keep(this.add.graphics().setDepth(6));
            var x0 = c.x - c.w / 2, y0 = c.y - c.h / 2;
            g.fillStyle(0x000000, 0.18);
            g.fillEllipse(c.x, c.y + c.h * 0.62, c.w * 1.05, c.h * 0.22);
            // Manija.
            g.lineStyle(Math.max(3, c.w * 0.03), 0x343a40, 1);
            g.beginPath();
            g.moveTo(x0 + c.w, y0 + c.h * 0.45);
            g.lineTo(x0 + c.w * 1.22, y0 - c.h * 0.25);
            g.strokePath();
            g.fillStyle(0x343a40, 1);
            g.fillCircle(x0 + c.w * 1.22, y0 - c.h * 0.25, c.w * 0.035);
            // Caja roja con borde claro.
            g.fillStyle(0xc92a2a, 1);
            g.fillRoundedRect(x0, y0, c.w, c.h, 8);
            g.fillStyle(0xe03131, 1);
            g.fillRoundedRect(x0 + 3, y0 + 3, c.w - 6, c.h * 0.55, 6);
            g.fillStyle(0xffffff, 0.28);
            g.fillRoundedRect(x0 + 8, y0 + 5, c.w - 16, c.h * 0.12, 4);
            // Ruedas.
            [0.22, 0.78].forEach(function (k) {
                var rx = x0 + c.w * k, ry = y0 + c.h + c.w * 0.02;
                g.fillStyle(0x212529, 1);
                g.fillCircle(rx, ry, c.w * 0.11);
                g.fillStyle(0xadb5bd, 1);
                g.fillCircle(rx, ry, c.w * 0.045);
            });
            // Frente del carrito (los juguetes quedan detrás de este borde).
            this.frenteCarrito = keep(this.add.graphics().setDepth(9));
            this.frenteCarrito.fillStyle(0xc92a2a, 1);
            this.frenteCarrito.fillRoundedRect(x0, y0 + c.h * 0.42, c.w, c.h * 0.58, { tl: 0, tr: 0, bl: 8, br: 8 });
            this.frenteCarrito.fillStyle(0xffffff, 0.18);
            this.frenteCarrito.fillRect(x0 + 6, y0 + c.h * 0.48, c.w - 12, 3);
        },

        ubicarEnCarrito: function (a, k, animar) {
            var c = this.L.carrito;
            var j = this.cajon;
            var x, y, tam;
            if (j) {
                // Dentro del cajón: en fila, apoyados en su piso y de un tamaño que quepa en el hueco.
                var ancho = j.x1 - j.x0, alto = j.y1 - j.y0;
                var por = 4;
                var col = k % por, fila = Math.floor(k / por);
                // Hundidos en el cajón: su centro queda por debajo del borde de arriba, así el
                // frente del carrito los tapa y solo se les ve la parte superior.
                tam = Math.min(ancho / por * 0.98, alto * 2.2);
                x = j.x0 + ancho * (col + 0.5) / por;
                // El frente tapa desde el 22 % del cajón: el centro va justo ahí, de modo que
                // asoma la mitad de arriba del juguete y la de abajo queda dentro.
                y = j.y0 + alto * 0.22 - fila * tam * 0.3;
            } else {
                var por2 = 3;
                var col2 = k % por2, fila2 = Math.floor(k / por2);
                tam = c.w * 0.5;
                x = c.x - c.w * 0.3 + col2 * (c.w * 0.3);
                y = c.y - c.h * 0.35 - fila2 * tam * 0.3;
                col = col2; fila = fila2;
            }
            var esc = tam / a.tam;
            a.cont.setDepth(8 - fila * 0.01 + col * 0.001);
            if (!animar) { a.cont.setPosition(x, y).setScale(esc).setAngle(rnd(-14, 14)); return Promise.resolve(); }
            return { x: x, y: y, esc: esc };
        },

        montarVida: function (keep) {
            var self = this;
            var L = this.L;
            this.vida = [];
            if (this.textures.exists('qs_mariposa1')) {
                // Mariposas del diseño revoloteando sobre la cerca y el pasto.
                for (var i = 1; i <= 5; i++) {
                    if (!this.textures.exists('qs_mariposa' + i)) continue;
                    var tm = Math.max(30, Math.min(54, L.W * 0.05));
                    var y0 = rnd(L.R.y * 0.35, L.R.y - L.grosor - tm * 0.6);
                    var m = keep(this.add.image(rnd(0, L.W), y0, 'qs_mariposa' + i).setDisplaySize(tm, tm).setDepth(7));
                    m.y0 = y0; m.fase = Math.random() * 6; m.base = m.scaleX; m.vel = rnd(0.25, 0.6);
                    this.vida.push(m);
                }
                return;
            }
            // Mariposas sobre el pasto (de comun/vida.js: se pueden tocar y escapan).
            if (this.vidaAmb) this.vidaAmb.mariposas(3, { x: 0, y: L.R.y - L.grosor - 70, w: L.W, h: 45, depth: 7 });
        },

        montarPresentador: function () {
            var L = this.L;
            if (!global.AsociaPj3D || !L.pres) {
                if (this.pres && !this.pres.falso) this.pres.visible(false);
                if (!this.pres) this.pres = { clip: function () {}, visible: function () {}, ubicar: function () {}, falso: true };
                return;
            }
            if (!this.pres || this.pres.falso) {
                this.pres = global.AsociaPj3D.crear('nina', { alto: L.presAlto, clip: 'Saludar', giro: -0.5 });
                this.reaccion('Saludar', 2600);
            }
            this.pres.visible(true);
            this.pres.ubicar(L.presX, L.R.y - L.grosor * 1.0 - L.presAlto / 2 + 6);
        },

        reaccion: function (clip, ms) {
            var self = this;
            if (!this.pres) return;
            this.pres.clip(clip);
            if (this.presTimer) this.presTimer.remove();
            this.presTimer = this.time.delayedCall(ms || 1800, function () {
                if (self.pres) self.pres.clip(self.fase === 'fin' ? 'Bailar' : 'Quieto');
            });
        },

        /* ── Arena: cavar, tapar y montoncitos ── */

        sucio: function () { this.capaSucia = true; },

        cavar: function (x, y, r) {
            var R = this.L.R;
            var lx = x - R.x, ly = y - R.y;
            if (lx < -r || ly < -r || lx > R.w + r || ly > R.h + r) return false;
            var c = this.capaCtx;
            // Hoyo ovalado (el suelo se ve inclinado) y más chico al fondo.
            var k = this.prof(y);
            c.save();
            c.globalCompositeOperation = 'destination-out';
            c.translate(lx, ly);
            c.scale(k, k * APLANA);
            var g = c.createRadialGradient(0, 0, r * 0.25, 0, 0, r);
            g.addColorStop(0, 'rgba(0,0,0,1)');
            g.addColorStop(0.7, 'rgba(0,0,0,0.85)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            c.fillStyle = g;
            c.beginPath();
            c.arc(0, 0, r, 0, Math.PI * 2);
            c.fill();
            c.restore();
            this.marcar(lx, ly, r * 0.78 * k, 0, APLANA);
            this.sucio();
            return true;
        },

        tapar: function (x, y, r) {
            var R = this.L.R;
            var lx = x - R.x, ly = y - R.y;
            var c = this.capaCtx;
            c.save();
            this.clipCajon(c);
            c.beginPath();
            c.arc(lx, ly, r, 0, Math.PI * 2);
            c.clip();
            c.clearRect(lx - r, ly - r, r * 2, r * 2);
            c.drawImage(this.arenaSeca, lx - r, ly - r, r * 2, r * 2, lx - r, ly - r, r * 2, r * 2);
            c.restore();
            this.marcar(lx, ly, r, 1);
            this.sucio();
        },

        /** Recorta el dibujo de la capa al trapecio del cajón. */
        clipCajon: function (c) {
            var R = this.L.R, ins = this.L.ins;
            c.beginPath();
            c.moveTo(ins, 0); c.lineTo(R.w - ins, 0); c.lineTo(R.w, R.h); c.lineTo(0, R.h); c.closePath();
            c.clip();
        },

        /** Escala según la profundidad: 1 adelante, más chico al fondo del cajón. */
        prof: function (y) {
            var R = this.L.R;
            var v = Math.max(0, Math.min(1, (y - R.y) / R.h));
            return 0.74 + 0.26 * v;
        },

        /** Límites izquierdo y derecho de la arena a la altura y. */
        bordesEn: function (y) {
            var R = this.L.R;
            var v = Math.max(0, Math.min(1, (y - R.y) / R.h));
            var m = this.L.ins * (1 - v);
            return { a: R.x + m, b: R.x + R.w - m };
        },

        marcar: function (lx, ly, r, v, ey) {
            ey = ey || 1;
            var c0 = Math.max(0, Math.floor((lx - r) / CELDA)), c1 = Math.min(this.cols - 1, Math.floor((lx + r) / CELDA));
            var f0 = Math.max(0, Math.floor((ly - r * ey) / CELDA)), f1 = Math.min(this.filas - 1, Math.floor((ly + r * ey) / CELDA));
            for (var f = f0; f <= f1; f++) {
                for (var k = c0; k <= c1; k++) {
                    var dx = (k + 0.5) * CELDA - lx, dy = ((f + 0.5) * CELDA - ly) / ey;
                    if (dx * dx + dy * dy <= r * r) this.tapado[f * this.cols + k] = v;
                }
            }
        },

        /** Montoncito sobre un juguete enterrado (luz arriba, sombra abajo). */
        montonDe: function (j) {
            var R = this.L.R;
            var c = this.capaCtx;
            var lx = j.x - R.x, ly = j.y - R.y;
            var kp = this.prof(j.y);
            var rx = this.L.tam * 0.46 * kp, ry = this.L.tam * 0.3 * kp;
            c.save();
            var s = c.createRadialGradient(lx + rx * 0.1, ly + ry * 0.55, 2, lx + rx * 0.1, ly + ry * 0.55, rx);
            s.addColorStop(0, 'rgba(120,80,35,0.38)');
            s.addColorStop(1, 'rgba(120,80,35,0)');
            c.fillStyle = s;
            c.beginPath(); c.ellipse(lx + rx * 0.1, ly + ry * 0.45, rx * 1.05, ry * 0.85, 0, 0, Math.PI * 2); c.fill();
            var h = c.createRadialGradient(lx - rx * 0.2, ly - ry * 0.35, 2, lx - rx * 0.1, ly - ry * 0.2, rx * 0.95);
            h.addColorStop(0, 'rgba(255,244,215,0.85)');
            h.addColorStop(0.55, 'rgba(250,225,170,0.45)');
            h.addColorStop(1, 'rgba(250,225,170,0)');
            c.fillStyle = h;
            c.beginPath(); c.ellipse(lx, ly - ry * 0.1, rx, ry, 0, 0, Math.PI * 2); c.fill();
            c.restore();
            this.sucio();
        },

        radioHoyo: function () { return this.L.tam * 0.45 + this.L.pincel * 1.15; },

        /** Al tapar un hoyo, los juguetes vecinos que ya estaban a la vista no deben quedar tapados. */
        recavarVecinos: function (j) {
            var self = this;
            var lim = this.radioHoyo() + this.L.tam * 0.5;
            this.juguetes.forEach(function (q) {
                if (q !== j && q.estado === 'visto' && Math.hypot(q.x - j.x, q.y - j.y) < lim) self.cavarElipse(q, 1.05);
            });
        },

        cavarElipse: function (j, k) {
            var kp = this.prof(j.y);
            var rx = this.L.tam * 0.4 * (k || 1) * kp, ry = this.L.tam * 0.32 * (k || 1) * kp;
            for (var a = -1; a <= 1; a += 0.5) for (var b = -1; b <= 1; b += 0.5) this.cavar(j.x + a * rx * 0.7, j.y + b * ry * 0.7, this.L.pincel);
        },

        /** Fracción descubierta del juguete (celdas dentro de su elipse). */
        descubierto: function (j) {
            var R = this.L.R;
            var kp = this.prof(j.y);
            var rx = this.L.tam * 0.36 * kp, ry = this.L.tam * 0.3 * kp;
            var tot = 0, lib = 0;
            for (var f = 0; f < this.filas; f++) {
                var cy = R.y + (f + 0.5) * CELDA;
                var dy = (cy - j.y) / ry;
                if (dy < -1 || dy > 1) continue;
                for (var k = 0; k < this.cols; k++) {
                    var dx = (R.x + (k + 0.5) * CELDA - j.x) / rx;
                    if (dx * dx + dy * dy > 1) continue;
                    tot += 1;
                    if (!this.tapado[f * this.cols + k]) lib += 1;
                }
            }
            return tot ? lib / tot : 0;
        },

        /** Granos de arena que saltan del dedo o caen de un juguete. */
        granos: function (x, y, n, o) {
            o = o || {};
            var colores = [0xe8c486, 0xd4a868, 0xf5dcaa, 0xbf9257];
            for (var i = 0; i < n; i++) {
                var g = this.add.circle(x + rnd(-8, 8), y + rnd(-6, 6), rnd(1.6, 3.6), colores[i % 4]).setDepth(o.depth || 25);
                var ang = o.angulo != null ? o.angulo + rnd(-0.7, 0.7) : rnd(-Math.PI * 0.95, -Math.PI * 0.05);
                var d = rnd(18, o.dist || 55);
                this.tweens.add({
                    targets: g,
                    x: g.x + Math.cos(ang) * d,
                    y: g.y + Math.sin(ang) * d * 0.6 + (o.cae || 26),
                    alpha: 0,
                    duration: rnd(380, 700),
                    ease: 'Quad.easeOut',
                    onComplete: function () { this.targets[0].destroy(); }
                });
            }
        },

        /* ── Juguetes ── */

        sonidoDe: function (id) {
            if (id === this.reto.correcto && this.reto.sonido) return this.reto.sonido;
            return Act.sonidoDe(id);
        },

        repartir: function (n) {
            var L = this.L, R = L.R;
            var m = L.tam * 0.55;
            var pts = [];
            for (var intento = 0; intento < 400 && pts.length < n; intento++) {
                var y = rnd(R.y + L.tam * 0.5, R.y + R.h - L.tam * 0.42);
                var bd = this.bordesEn(y);
                var x = rnd(bd.a + m, bd.b - m);
                if (x > L.W - BOTONES_ABAJO.w - m * 0.4 && y > L.H - BOTONES_ABAJO.h - m) continue;
                if (x < L.carrito.x + L.carrito.w * 0.5 && y < R.y + L.tam * 0.55) continue;
                var ok = pts.every(function (p) { return Math.hypot(p.x - x, (p.y - y) * 1.35) > L.tam * 1.15; });
                if (ok) pts.push({ x: x, y: y });
            }
            // Si no entran al azar, en fila.
            while (pts.length < n) {
                var k = pts.length;
                pts.push({ x: R.x + R.w * (k + 0.5) / n, y: R.y + R.h * (k % 2 ? 0.66 : 0.4) });
            }
            return pts;
        },

        enterrar: function (ids, fijos) {
            var self = this;
            var L = this.L, R = L.R;
            var pts = fijos || this.repartir(ids.length);
            ids.forEach(function (id, i) {
                var p = pts[i];
                var a = Act.crear(self, id, p.x, p.y, L.tam);
                if (a.animarIdle) a.animarIdle(false);
                // Más chico y más atrás cuanto más al fondo del cajón.
                a.cont.setScale(a.cont.scale * self.prof(p.y)).setDepth(12 + (p.y - R.y) / R.h * 0.5).setAngle(rnd(-10, 10));
                a.sonido = self.sonidoDe(id);
                var j = { id: id, actor: a, x: p.x, y: p.y, u: (p.x - R.x) / R.w, v: (p.y - R.y) / R.h, estado: 'enterrado', tam0: L.tam };
                self.juguetes.push(j);
                self.montonDe(j);
            });
        },

        quitarJuguetes: function () {
            this.juguetes.forEach(function (j) { if (j.estado !== 'fuera') j.actor.destruir(); });
            this.juguetes = [];
        },

        /** El rastrillo de Zoe alisa la arena: tapa todo de izquierda a derecha. */
        rastrillar: async function () {
            var self = this;
            var L = this.L, R = L.R;
            var alto = R.h + 20;
            // Arranca fuera de la pantalla (la arena ahora llega al borde izquierdo).
            var r = this.add.container(R.x - 60, R.y + R.h / 2).setDepth(26);
            var palo = this.add.rectangle(10, -alto * 0.1, 8, alto * 0.75, 0x9c6b30).setAngle(-12);
            var peine = this.add.rectangle(0, 0, 14, alto * 0.95, 0x2f9e44).setStrokeStyle(2, 0x2b8a3e);
            r.add([palo, peine]);
            for (var d = -alto * 0.45; d <= alto * 0.45; d += 16) r.add(this.add.rectangle(-9, d, 10, 4, 0x2b8a3e));
            rasguno(1.2, true);
            var paso = L.pincel * 1.1;
            var ultimo = R.x - 30;
            await tw(this, {
                targets: r, x: R.x + R.w + 30, duration: Math.max(900, R.w * 1.4), ease: 'Sine.easeInOut',
                onUpdate: function () {
                    while (ultimo < r.x) {
                        ultimo += paso * 0.6;
                        for (var y = R.y; y <= R.y + R.h + paso; y += paso * 0.9) self.tapar(ultimo, y, paso);
                        if (Math.random() < 0.5) self.granos(ultimo + 12, rnd(R.y, R.y + R.h), 3, { angulo: 0, dist: 40, cae: 4 });
                    }
                    if (self.time.now - self.ultimoRasguno > 160) { self.ultimoRasguno = self.time.now; rasguno(0.9, false); }
                }
            });
            this.tweens.add({ targets: r, alpha: 0, duration: 250, onComplete: function () { r.destroy(); } });
            // Rayitas del rastrillo sobre la arena lisa.
            var c = this.capaCtx;
            c.save();
            this.clipCajon(c);
            c.strokeStyle = 'rgba(160,115,60,0.09)';
            c.lineWidth = 2;
            // Las rayas se juntan hacia el fondo (perspectiva).
            for (var yy = 12; yy < R.h; yy += 9 + 9 * yy / R.h) {
                c.beginPath();
                for (var xx = 0; xx <= R.w; xx += 20) c.lineTo(xx, yy + Math.sin(xx / 60 + yy) * 2);
                c.stroke();
            }
            c.restore();
            this.sucio();
        },

        /* ── Bocina ── */

        escuchar: function (nombre, o) {
            var self = this;
            o = o || {};
            this.sonando = true;
            this.ultimoSonido = this.time.now;
            var b = this.bocina;
            if (o.bocina !== false && b) {
                this.tweens.killTweensOf(b);
                b.setScale(1);
                this.tweens.add({ targets: b, scale: 1.12, duration: 160, yoyo: true, repeat: 3 });
                this.ondas = this.time.now;
            }
            var p = Promise.resolve(this.ctx.sonido ? this.ctx.sonido(nombre, o) : null);
            return p.then(function () { self.sonando = false; self.ondas = 0; });
        },

        repetir: function () {
            if (this.fase !== 'jugar' || this.sonando) return;
            efecto(this, 'clic');
            this.pista.reiniciar();
            this.escuchar(this.sonidoDe(this.objetivo));
        },

        tocaBocina: function (p) {
            var b = this.L.bocina;
            return Math.hypot(p.x - b.x, p.y - b.y) < b.r * 1.3;
        },

        /* ── Entrada ── */

        alTocar: function (p) {
            if (this.ctx.enDemo && this.ctx.enDemo()) return;
            actx();
            // Arriba del arenero: el parque responde (sol, nubes, árboles, pájaros, mariposas).
            if (p.y < this.L.R.y - this.L.grosor * 0.6 && !(this.fase === 'jugar' && this.tocaBocina(p))) {
                if (this.tocarCielo(p)) return;
                if (this.vidaAmb) this.vidaAmb.tocar(p);
                return;
            }
            if (this.fase !== 'jugar') return;
            if (this.tocaBocina(p)) { this.repetir(); return; }
            var j = this.juguetePara(p.x, p.y);
            if (j) { this.elegir(j); return; }
            this.cavando = { x: p.x, y: p.y };
            this.cavarEn(p.x, p.y);
        },

        alMover: function (p) {
            if (!this.cavando || !p.isDown || this.fase !== 'jugar') return;
            var a = this.cavando;
            var d = Math.hypot(p.x - a.x, p.y - a.y);
            var paso = this.L.pincel * 0.35;
            if (d < paso) return;
            var n = Math.ceil(d / paso);
            for (var i = 1; i <= n; i++) this.cavarEn(a.x + (p.x - a.x) * i / n, a.y + (p.y - a.y) * i / n, i < n);
            this.cavando = { x: p.x, y: p.y };
        },

        cavarEn: function (x, y, silencio) {
            if (!this.cavar(x, y, this.L.pincel)) return;
            if (this.time.now - (this.ultimaPista || 0) > 400) { this.ultimaPista = this.time.now; this.pista.reiniciar(); }
            if (!silencio) {
                if (Math.random() < 0.6) this.granos(x, y, 3);
                if (this.time.now - this.ultimoRasguno > 75) { this.ultimoRasguno = this.time.now; rasguno(1, false); }
            }
            this.revisarDescubiertos();
        },

        juguetePara: function (x, y) {
            var L = this.L;
            var mejor = null, dmin = L.tam * 0.55;
            this.juguetes.forEach(function (j) {
                if (j.estado !== 'visto') return;
                var d = Math.hypot(x - j.actor.cont.x, (y - j.actor.cont.y) * 1.1);
                if (d < dmin) { dmin = d; mejor = j; }
            });
            return mejor;
        },

        /** Un juguete que ya se ve en más de un 40 %: se mueve, se sacude la arena y suena. */
        revisarDescubiertos: function () {
            var self = this;
            this.juguetes.forEach(function (j) {
                if (j.estado !== 'enterrado' || j.moviendo) return;
                if (self.descubierto(j) < 0.4) return;
                j.estado = 'visto';
                var a = j.actor;
                self.granos(a.cont.x, a.cont.y - self.L.tam * 0.1, 10, { dist: 60 });
                self.tweens.add({ targets: a.cont, angle: a.cont.angle + 8, duration: 90, yoyo: true, repeat: 3 });
                if (global.navigator && global.navigator.vibrate) { try { global.navigator.vibrate(12); } catch (e) { /* noop */ } }
                if (!self.sonando || self.time.now - self.ultimoSonido > 900) self.escuchar(a.sonido, { breve: true, vol: 0.8, bocina: false });
                self.brillo(a.cont.x, a.cont.y);
            });
        },

        brillo: function (x, y) {
            Ut.estallido(this, x, y - this.L.tam * 0.15, { n: 6, tex: 'chispa', tam: 18, dist: 60, colores: [0xffffff, 0xffe066], depth: 26 });
        },

        elegir: function (j) {
            if (this.fase !== 'jugar') return;
            this.pista.reiniciar();
            if (j.id === this.objetivo) this.sacar(j);
            else this.fallo(j);
        },

        /** Error: el juguete suena, dice que no con la cabeza y la arena lo vuelve a tapar. */
        fallo: async function (j) {
            var self = this;
            var a = j.actor;
            j.estado = 'hundiendo';
            this.errores += 1;
            this.reaccion('Decir_no', 1500);
            efecto(this, 'suave');
            this.escuchar(a.sonido, { breve: true, vol: 0.7, bocina: false });
            if (this.vidaAmb && this.vidaAmb.reaccionar) this.vidaAmb.reaccionar('error', { x: a.cont.x, y: a.cont.y });
            await a.sacudir();
            // La arena se escurre de los bordes hacia el hoyo.
            for (var k = 0; k < 4; k++) {
                var ang = k * Math.PI / 2 + 0.6;
                self.granos(j.x + Math.cos(ang) * self.L.tam * 0.45, j.y + Math.sin(ang) * self.L.tam * 0.3, 6, { angulo: ang + Math.PI, dist: 30, cae: 0 });
            }
            rasguno(1, true);
            var rx = this.L.tam * 0.45, ry = this.L.tam * 0.36;
            for (var i = 0; i < 6; i++) {
                await esperar(this, 70);
                var t = i / 5;
                this.tapar(j.x + Math.cos(i * 1.7) * rx * (1 - t), j.y + Math.sin(i * 1.7) * ry * (1 - t), this.L.pincel * 1.5);
            }
            // Radio que cubre también el borde difuso del pincel (si no, queda una media luna).
            this.tapar(j.x, j.y, this.radioHoyo());
            this.montonDe(j);
            this.recavarVecinos(j);
            j.estado = 'enterrado';
            if (this.time.now - (this.ultimoReclamo || -99999) > 7000) {
                this.ultimoReclamo = this.time.now;
                var e = this.reto.error || {};
                this.ctx.decir({ voz: e.voz || 'zeus', texto: e.texto || '¡Escucha otra vez!' }, { minMs: 900 });
            }
            this.invitar();
            if (this.errores >= 3) this.ayuda = true;
        },

        invitar: function () {
            var b = this.bocina;
            this.tweens.killTweensOf(b);
            b.setScale(1);
            this.tweens.add({ targets: b, scale: 1.14, duration: 380, yoyo: true, repeat: 3, ease: 'Sine.easeInOut' });
        },

        /** Acierto: el juguete sale de la arena, se sacude, hace su acción con su sonido y va al carrito. */
        sacar: async function (j) {
            var self = this;
            var L = this.L;
            var a = j.actor;
            this.fase = 'premio';
            this.pista.parar();
            this.reaccion('Celebrar', 2600);
            j.estado = 'fuera';
            this.cuenta += 1;
            this.atrapados += 1;
            this.hechos = this.atrapados;
            var principal = j.id === this.reto.correcto && !this.dijoReto;
            var ac = principal ? (this.reto.acierto || {}) : {};
            // Sale de la arena: deja el hoyo y cae arena de encima.
            this.cavarElipse(j, 1.1);
            a.cont.setDepth(40);
            efecto(this, 'whoosh');
            rasguno(1.2, true);
            this.granos(a.cont.x, a.cont.y, 16, { dist: 80 });
            var esc0 = a.cont.scale;
            // Sombra en el fondo del hoyo, que se achica cuando el juguete sube.
            var sombra = this.add.ellipse(j.x, j.y + L.tam * 0.3, L.tam * 0.7, L.tam * 0.16, 0x3b2410, 0.35).setDepth(21);
            this.tweens.add({ targets: sombra, scaleX: 0.7, alpha: 0.22, duration: 420 });
            await tw(this, { targets: a.cont, y: j.y - L.tam * 0.55, scale: esc0 * 1.18, angle: 0, duration: 420, ease: 'Back.easeOut' });
            // Se sacude la arena.
            this.tweens.add({ targets: a.cont, angle: { from: -9, to: 9 }, duration: 70, yoyo: true, repeat: 4, onComplete: function () { a.cont.angle = 0; } });
            for (var k = 0; k < 3; k++) this.time.delayedCall(k * 110, function () { self.granos(a.cont.x, a.cont.y + L.tam * 0.25, 7, { angulo: Math.PI / 2, dist: 40, cae: 30, depth: 39 }); });
            await esperar(this, 420);
            var sonido = this.escuchar(a.sonido, ac.repetir === 'completo' ? { bocina: false } : { breve: true, bocina: false });
            await Promise.all([sonido, a.acierto(this.ctx.duracionSonido ? this.ctx.duracionSonido() : 1500)]);
            if (!this.ctx.vivo()) return;
            efecto(this, ac.efecto || 'recompensa');
            if (!Ut.reducido()) this.cameras.main.shake(140, 0.003);
            if (this.vidaAmb && this.vidaAmb.reaccionar) this.vidaAmb.reaccionar('acierto', { x: a.cont.x, y: a.cont.y });
            Ut.estallido(this, a.cont.x, a.cont.y - L.tam * 0.2, { n: ac.especial || ac.efecto === 'celebracion' ? 22 : 14, tex: 'estrella', tam: 30, dist: 170, sinTinte: true });
            var linea = principal && ac.texto ? { voz: ac.voz || 'zoe', texto: ac.texto } : (this.cuenta === 1 ? this.elogio() : null);
            if (principal) this.dijoReto = true;
            var voz = linea ? this.ctx.decir(linea, { estado: 'acierto', minMs: 1000 }) : esperar(this, 300);
            // Salta al carrito de Zoe.
            this.enCarrito.push(a);
            var dest = this.ubicarEnCarrito(a, this.enCarrito.length - 1, true);
            this.tweens.add({ targets: sombra, alpha: 0, duration: 300, onComplete: function () { sombra.destroy(); } });
            var x0 = a.cont.x, y0 = a.cont.y, s0 = a.cont.scale;
            var cima = Math.min(y0, dest.y) - L.tam * 0.9;
            var o = { t: 0 };
            await tw(this, {
                targets: o, t: 1, duration: 720, ease: 'Sine.easeInOut',
                onUpdate: function () {
                    var t = o.t;
                    a.cont.x = x0 + (dest.x - x0) * t;
                    a.cont.y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cima + t * t * dest.y;
                    a.cont.setScale(s0 + (dest.esc - s0) * t);
                    a.cont.angle = t * 360;
                }
            });
            a.cont.setDepth(8 + this.enCarrito.length * 0.001).setAngle(rnd(-12, 12));
            efecto(this, 'pop');
            this.tweens.add({ targets: a.cont, scaleY: dest.esc * 0.85, duration: 90, yoyo: true });
            this.granos(dest.x, dest.y, 6, { dist: 30 });
            await voz;
            if (!this.ctx.vivo()) return;
            if (this.cuenta >= this.nv.meta) { this.resolverNivel(); return; }
            // Nivel 4: el sonido cambia por otro juguete que siga enterrado.
            if (this.nv.cambia) {
                var quedan = this.juguetes.filter(function (q) { return q.estado !== 'fuera'; });
                var nuevo = quedan[(Math.random() * quedan.length) | 0];
                if (nuevo) this.objetivo = nuevo.id;
                await esperar(this, 300);
                this.fase = 'jugar';
                await this.escuchar(this.sonidoDe(this.objetivo));
            } else {
                this.fase = 'jugar';
            }
            this.pista.reiniciar();
        },

        elogio: function () {
            var t = { bicicleta: '¡La bicicleta hace rin rin!', telefono: '¡El teléfono suena ring!', reloj: '¡El reloj despertador!', tren: '¡Chu chu, el tren!', avion: '¡El avión despega!', vaca: '¡La vaca dice muu!', gallo: '¡Kikirikí, el gallo!', ambulancia: '¡La ambulancia!' };
            var id = this.objetivo;
            var txt = t[id] || '¡Muy bien!';
            return { voz: 'zoe', texto: txt };
        },

        /* ── Topo: cambia de lugar un juguete que siga enterrado ── */

        moverConTopo: async function () {
            var self = this;
            var L = this.L, R = L.R;
            var cand = this.juguetes.filter(function (j) { return j.estado === 'enterrado' && !j.moviendo && self.descubierto(j) < 0.2; });
            if (!cand.length) return;
            var j = cand[(Math.random() * cand.length) | 0];
            var libres = this.repartir(this.juguetes.length + 2).filter(function (p) {
                return self.juguetes.every(function (q) { return q.estado === 'fuera' || Math.hypot(q.x - p.x, (q.y - p.y) * 1.35) > L.tam * 1.15; });
            });
            if (!libres.length) return;
            var dest = libres[0];
            j.moviendo = true;
            this.tapar(j.x, j.y, this.radioHoyo());
            this.recavarVecinos(j);
            // El túnel: un montoncito que avanza por debajo de la arena y deja marcado el surco.
            var bulto = this.add.image(j.x, j.y, this.texturaMonton()).setDisplaySize(L.tam * 0.62, L.tam * 0.4).setDepth(21);
            var x0 = j.x, y0 = j.y, o = { t: 0 };
            var ult = 0;
            await tw(this, {
                targets: o, t: 1, duration: 1700, ease: 'Sine.easeInOut',
                onUpdate: function () {
                    var t = o.t;
                    var x = x0 + (dest.x - x0) * t;
                    var y = y0 + (dest.y - y0) * t + Math.sin(t * Math.PI * 3) * L.tam * 0.12;
                    bulto.setPosition(x, y).setAngle(Math.sin(self.time.now / 60) * 4);
                    j.actor.cont.setPosition(x, y);
                    if (self.time.now - ult > 70) {
                        ult = self.time.now;
                        self.surco(x, y);
                        self.granos(x, y - L.tam * 0.08, 3, { dist: 34, cae: 10 });
                        rasguno(0.6, false);
                    }
                }
            });
            this.tweens.add({ targets: bulto, alpha: 0, duration: 200, onComplete: function () { bulto.destroy(); } });
            j.x = dest.x; j.y = dest.y;
            j.u = (j.x - R.x) / R.w; j.v = (j.y - R.y) / R.h;
            j.actor.cont.setScale(L.tam / j.tam0 * this.prof(j.y)).setDepth(12 + j.v * 0.5);
            this.tapar(j.x, j.y, L.tam * 0.5);
            this.montonDe(j);
            await this.asomaTopo(j.x + L.tam * 0.35, j.y - L.tam * 0.05);
            j.moviendo = false;
        },

        /** Textura del montoncito que viaja (arena con luz arriba y sombra abajo). */
        texturaMonton: function () {
            var self = this;
            if (this.textures.exists('arenero_monton')) return 'arenero_monton';
            texturaCanvas(this, 'arenero_monton', 160, 104, function (x, w, h) {
                x.save();
                x.beginPath(); x.ellipse(w / 2, h / 2, w / 2 - 2, h / 2 - 2, 0, 0, Math.PI * 2); x.clip();
                x.fillStyle = x.createPattern(self.baldosaSeca, 'repeat');
                x.fillRect(0, 0, w, h);
                var s = x.createRadialGradient(w * 0.55, h * 0.8, 4, w * 0.55, h * 0.8, w * 0.55);
                s.addColorStop(0, 'rgba(110,70,30,0.45)');
                s.addColorStop(1, 'rgba(110,70,30,0)');
                x.fillStyle = s; x.fillRect(0, 0, w, h);
                var l = x.createRadialGradient(w * 0.42, h * 0.3, 2, w * 0.45, h * 0.35, w * 0.45);
                l.addColorStop(0, 'rgba(255,246,220,0.9)');
                l.addColorStop(1, 'rgba(255,246,220,0)');
                x.fillStyle = l; x.fillRect(0, 0, w, h);
                x.restore();
                // Borde difuso para que se funda con la arena.
                x.globalCompositeOperation = 'destination-in';
                var b = x.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h / 2);
                b.addColorStop(0, 'rgba(0,0,0,1)');
                b.addColorStop(1, 'rgba(0,0,0,0)');
                x.setTransform(w / h, 0, 0, 1, 0, 0);
                x.fillStyle = b;
                x.fillRect(0, 0, h, h);
            });
            return 'arenero_monton';
        },

        /** Surco que deja el topo: una lomita alargada y clara con sombra. */
        surco: function (x, y) {
            var R = this.L.R, c = this.capaCtx;
            var lx = x - R.x, ly = y - R.y, r = this.L.tam * 0.13;
            c.save();
            c.fillStyle = 'rgba(120,80,35,0.12)';
            c.beginPath(); c.ellipse(lx + 2, ly + r * 0.5, r * 1.2, r * 0.6, 0, 0, Math.PI * 2); c.fill();
            c.fillStyle = 'rgba(255,240,205,0.22)';
            c.beginPath(); c.ellipse(lx, ly - r * 0.15, r, r * 0.55, 0, 0, Math.PI * 2); c.fill();
            c.restore();
            this.sucio();
        },

        /** El topo saca la cabeza un momento, mira y se vuelve a meter. */
        asomaTopo: async function (x, y) {
            if (this.textures.exists('qs_topo')) {
                // Topo del diseño: sale de su montoncito de tierra (base apoyada en la arena),
                // mira a los lados y se vuelve a meter.
                var tm = this.L.tam * 0.85 * this.prof(y);
                var base = y + tm * 0.28;
                var topo = this.add.image(x, base, 'qs_topo').setOrigin(0.5, 0.9).setDepth(22);
                var e0 = tm / topo.width;
                topo.setScale(e0, e0 * 0.1);
                efecto(this, 'boing');
                await tw(this, { targets: topo, scaleY: e0, duration: 320, ease: 'Back.easeOut' });
                await tw(this, { targets: topo, angle: 8, duration: 180, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
                await tw(this, { targets: topo, scaleY: e0 * 0.1, duration: 220, ease: 'Quad.easeIn' });
                topo.destroy();
                return;
            }
            var t = this.L.tam * 0.34;
            var c = this.add.container(x, y + t * 0.6).setDepth(22).setScale(0.2);
            c.add([
                this.add.ellipse(0, 0, t, t * 0.95, 0x5c4033),
                this.add.ellipse(0, t * 0.18, t * 0.55, t * 0.42, 0xa47551),
                this.add.circle(-t * 0.18, -t * 0.12, t * 0.07, 0x111111),
                this.add.circle(t * 0.18, -t * 0.12, t * 0.07, 0x111111),
                this.add.circle(0, t * 0.08, t * 0.11, 0xff8fab),
                this.add.ellipse(0, t * 0.5, t * 1.4, t * 0.35, 0xe8c486)
            ]);
            efecto(this, 'boing');
            await tw(this, { targets: c, y: y, scale: 1, duration: 260, ease: 'Back.easeOut' });
            await tw(this, { targets: c, angle: 10, duration: 160, yoyo: true, repeat: 1 });
            await tw(this, { targets: c, y: y + t * 0.6, scale: 0.2, duration: 200, ease: 'Quad.easeIn' });
            c.destroy();
        },

        /* ── Niveles ── */

        planNiveles: function () {
            var r = this.reto;
            var ops = (r.opciones || ['bicicleta', 'telefono', 'reloj']).slice();
            var correcto = r.correcto || ops[0];
            var otros = ops.filter(function (o) { return o !== correcto; });
            var extra = mezclar(EXTRA.filter(function (e) { return ops.indexOf(e) < 0; }));
            // Qué se pide en cada nivel: al azar (la bicicleta del reto siempre aparece en 1-3) y
            // distinto de la partida anterior, para que el niño no memorice la secuencia.
            var clave = 'asocia_orden_QueSuena', antes = null, orden;
            try { antes = global.localStorage.getItem(clave); } catch (e) { /* sin almacenamiento */ }
            for (var k = 0; k < 6; k++) {
                orden = mezclar([correcto].concat(mezclar(otros).concat(extra).slice(0, 2)));
                if (orden.join(',') !== antes) break;
            }
            try { global.localStorage.setItem(clave, orden.join(',')); } catch (e) { /* sin almacenamiento */ }
            var t1 = orden[0], t2 = orden[1], t3 = orden[2];
            var pool = function (obj, n, copias) {
                var resto = mezclar(ops.concat(extra).filter(function (e) { return e !== obj; }));
                var ids = [];
                for (var i = 0; i < copias; i++) ids.push(obj);
                return mezclar(ids.concat(resto.slice(0, n - copias)));
            };
            return [
                { objetivo: t1, ids: mezclar(ops), meta: 1 },
                { objetivo: t2, ids: pool(t2, 5, 2), meta: 2 },
                { objetivo: t3, ids: pool(t3, 5, 2), meta: 2, topo: true },
                { objetivo: null, ids: mezclar([t1, t2, t3].concat(extra.slice(2, 4))), meta: 3, topo: true, cambia: true }
            ];
        },

        jugar: async function () {
            var plan = this.planNiveles();
            this.nivelActual = 0;
            this.atrapados = 0;
            this.errores = 0;
            for (var i = 0; i < plan.length; i++) {
                if (!this.ctx.vivo()) return;
                await this.jugarNivel(i, plan[i]);
                if (!this.ctx.vivo()) return;
                this.nivelActual = i + 1;
                await this.ganarEstrella(i);
            }
            this.fase = 'listo';
        },

        jugarNivel: async function (i, nv) {
            var self = this;
            this.nv = nv;
            this.cuenta = 0;
            this.ayuda = false;
            this.fase = 'preparando';
            this.quitarJuguetes();
            await this.rastrillar();
            if (i > 0) await this.cartel(i + 1);
            this.enterrar(nv.ids);
            this.objetivo = nv.objetivo || nv.ids[(Math.random() * nv.ids.length) | 0];
            await esperar(this, 350);
            this.fase = 'jugar';
            await this.escuchar(this.sonidoDe(this.objetivo));
            this.pista.reiniciar();
            var hecho = new Promise(function (r) { self.resolverNivel = r; });
            // El topo pasea cada tanto en los niveles 3 y 4.
            var topo = nv.topo ? this.time.addEvent({
                delay: 7500, loop: true, callback: function () { if (self.fase === 'jugar') self.moverConTopo(); }
            }) : null;
            await hecho;
            if (topo) topo.remove();
            this.pista.parar();
            this.fase = 'entre';
        },

        cartel: async function (n) {
            var L = this.L;
            var c = this.add.container(L.W / 2, L.R.y + L.R.h / 2).setDepth(70).setScale(0.3).setAlpha(0);
            var tam = Math.min(90, L.W / 7);
            for (var i = 0; i < n; i++) c.add(this.add.image((i - (n - 1) / 2) * (tam * 1.05), 0, A.textura(this, 'estrella', 128)).setDisplaySize(tam, tam));
            efecto(this, 'magia');
            await tw(this, { targets: c, scale: 1, alpha: 1, duration: 380, ease: 'Back.easeOut' });
            await esperar(this, 700);
            await tw(this, { targets: c, scale: 0.4, alpha: 0, duration: 260 });
            c.destroy();
        },

        ganarEstrella: async function (i) {
            var e = this.estrellas[i];
            if (!e) return;
            var L = this.L;
            efecto(this, 'chispas');
            var v = this.add.image(L.W / 2, L.H / 2, A.textura(this, 'estrella', 128)).setDisplaySize(110, 110).setDepth(70);
            await tw(this, { targets: v, x: e.x, y: e.y, displayWidth: e.displayWidth, displayHeight: e.displayHeight, duration: 650, ease: 'Cubic.easeIn' });
            v.destroy();
            e.clearTint().setAlpha(1);
            this.tweens.add({ targets: e, scale: e.scale * 1.4, duration: 160, yoyo: true });
            Ut.estallido(this, e.x, e.y, { n: 8, tex: 'chispa', tam: 18, dist: 50, colores: [0xffe066, 0xffffff] });
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            // ¿Ya está a la vista el que suena? La mano lo toca. Si no, frota sobre su montoncito.
            var obj = this.juguetes.filter(function (j) { return j.id === self.objetivo && j.estado !== 'fuera'; })[0];
            if (!obj) return Promise.resolve();
            if (obj.estado === 'visto') {
                return this.ctx.mano({ punto: { x: obj.actor.cont.x, y: obj.actor.cont.y }, holdMs: 500, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
            }
            if (this.ayuda || Math.random() < 0.5) {
                this.brillo(obj.x, obj.y);
                return this.ctx.mano({
                    punto: { x: obj.x - this.L.tam * 0.3, y: obj.y }, holdMs: 200,
                    arrastre: { dx: this.L.tam * 0.6, dy: 0, durMs: 700 },
                    cancelado: function () { return cancelada() || self.fase !== 'jugar'; }
                });
            }
            var b = this.L.bocina;
            return this.ctx.mano({ punto: { x: b.x, y: b.y }, holdMs: 500, cancelado: function () { return cancelada() || self.fase !== 'jugar'; }, onPresionar: function () { self.repetir(); } });
        },

        /* ── Demostración: gallo y vaca enterrados ── */

        frotarDemo: function (j, ms) {
            var self = this;
            var L = this.L;
            var o = { t: 0 };
            var x0 = j.x - L.tam * 0.3, x1 = j.x + L.tam * 0.3;
            return tw(this, {
                targets: o, t: 1, duration: ms, ease: 'Sine.easeInOut',
                onUpdate: function () {
                    var x = x0 + (x1 - x0) * o.t;
                    for (var k = -1; k <= 1; k++) self.cavar(x, j.y + k * L.tam * 0.16 + Math.sin(o.t * 20) * 6, L.pincel);
                    if (Math.random() < 0.4) self.granos(x, j.y, 2);
                    if (self.time.now - self.ultimoRasguno > 80) { self.ultimoRasguno = self.time.now; rasguno(1, false); }
                }
            });
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
                self.quitarJuguetes();
                self.tapar(L.R.x + L.R.w / 2, L.R.y + L.R.h / 2, Math.max(L.R.w, L.R.h));
            };
            await ctx.decir({ voz: 'zoe', texto: t.demostracion || '¡Mira cómo se juega!' }, { minMs: 1800 });
            if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
            // A la izquierda y al centro: a la derecha se para el personaje del tutorial.
            var R = L.R;
            this.enterrar(d.opciones, d.opciones.map(function (id, i) {
                return { x: R.x + R.w * (0.2 + i * 0.25), y: R.y + R.h * (i % 2 ? 0.62 : 0.4) };
            }));
            this.juguetes.forEach(function (j) { j.actor.sonido = j.id === d.correcto ? d.sonido : Act.sonidoDe(j.id); });
            var b = L.bocina;
            var sonando = Promise.resolve();
            await ctx.mano({ punto: { x: b.x, y: b.y }, holdMs: 500, onPresionar: function () { sonando = self.escuchar(d.sonido); } });
            await sonando;
            for (var i = 0; i < this.juguetes.length; i++) {
                if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
                var j = this.juguetes[i];
                await ctx.mano({
                    punto: { x: j.x - L.tam * 0.3, y: j.y }, holdMs: 200,
                    arrastre: { dx: L.tam * 0.6, dy: 0, durMs: 900 },
                    onDuranteArrastre: (function (jj) { return function () { self.frotarDemo(jj, 900).then(function () { self.revisarDescubiertos(); }); }; })(j)
                });
                this.cavarElipse(j, 1);
                this.revisarDescubiertos();
                await esperar(this, 1300);
            }
            var vaca = this.juguetes.filter(function (q) { return q.id === d.correcto; })[0];
            if (!ctx.vivo() || !ctx.enDemo() || !vaca) return limpiar();
            await ctx.mano({ punto: { x: vaca.actor.cont.x, y: vaca.actor.cont.y }, holdMs: 450 });
            var a = vaca.actor;
            vaca.estado = 'fuera';
            a.cont.setDepth(40);
            this.granos(a.cont.x, a.cont.y, 14, { dist: 80 });
            await tw(this, { targets: a.cont, y: vaca.y - L.tam * 0.55, scale: a.cont.scale * 1.15, angle: 0, duration: 420, ease: 'Back.easeOut' });
            efecto(this, 'recompensa');
            Ut.estallido(this, a.cont.x, a.cont.y - L.tam * 0.2, { n: 14, tex: 'estrella', tam: 28, dist: 150, sinTinte: true });
            await Promise.all([this.escuchar(d.sonido, { breve: true, bocina: false }), a.acierto(1500)]);
            await ctx.decir({ voz: 'zoe', texto: t.demostracionAcierto || '¡Así se hace!' }, { estado: 'acierto', minMs: 1300 });
            await ctx.decir({ voz: 'zoe', texto: t.demostracionFin || '¡Ahora te toca a ti!' }, { minMs: 1000 });
            a.destruir();
            await limpiar();
            await esperar(this, 300);
        },

        /* ── Escena final: castillo de arena. Cada juguete salta del carrito y, al caer, levanta
              una parte del castillo; al final sube la bandera y todos festejan alrededor. ── */

        fiestaFinal: async function () {
            var self = this;
            var L = this.L;
            this.fase = 'fin';
            this.pista.parar();
            // El rastrillo deja la arena lisa para construir.
            this.quitarJuguetes();
            await this.rastrillar();
            if (!this.sigue()) return;
            this.reaccion('Celebrar', 60000);
            var cas = this.armarCastillo();
            var lista = this.enCarrito.filter(function (a) { return a.cont && a.cont.active; });
            var sitios = this.sitiosCastillo(lista.length, cas);
            var i;
            for (i = 0; i < lista.length; i++) {
                var a = lista[i], s = sitios[i];
                a.cont.setDepth(45 + s.y * 0.001).setAngle(0);
                efecto(this, 'whoosh');
                await this.saltoArco(a.cont, s.x, s.y, s.esc, 480);
                if (!this.sigue()) return;
                this.granos(s.x, s.y + L.tam * 0.2, 8, { dist: 40 });
                if (cas.partes[i]) { this.crecerParte(cas.partes[i]); rasguno(1, true); }
                var son = this.escuchar(a.sonido, { breve: true, bocina: false, vol: 0.75 });
                if (a.acierto && a.id !== 'tren' && a.id !== 'avion') a.acierto(900);
                else this.tweens.add({ targets: a.cont, y: s.y - 14, duration: 160, yoyo: true });
                await Promise.race([son, esperar(this, 700)]);
            }
            // Si hubo menos juguetes que partes, el castillo termina de levantarse solo.
            for (; i < cas.partes.length; i++) { this.crecerParte(cas.partes[i]); rasguno(0.8, true); await esperar(this, 260); }
            await esperar(this, 300);
            await this.izarBandera(cas);
            if (!this.sigue()) return;
            efecto(this, 'victoria');
            Ut.confeti(this, 110);
            this.reaccion('Bailar', 60000);
            lista.forEach(function (a, k) { self.time.delayedCall(k * 130, function () { if (a.cont.active && a.acierto) a.acierto(1600); }); });
            await esperar(this, 3000);
            if (global.AsociaPj3D && global.AsociaPj3D.capa) global.AsociaPj3D.capa(false);
        },

        /** ¿Sigue viva la escena? (en la fiesta final ctx.vivo() ya es falso). */
        sigue: function () { return !!(this.sys && this.sys.isActive && this.sys.isActive()); },

        /** Salto en arco de un contenedor hasta (x, y) con escala final. */
        saltoArco: function (c, x, y, esc, ms) {
            var x0 = c.x, y0 = c.y, s0 = c.scale, cima = Math.min(y0, y) - this.L.tam * 0.9, o = { t: 0 };
            return tw(this, {
                targets: o, t: 1, duration: ms || 500, ease: 'Sine.easeInOut',
                onUpdate: function () {
                    var t = o.t;
                    c.x = x0 + (x - x0) * t;
                    c.y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cima + t * t * y;
                    c.setScale(s0 + (esc - s0) * t);
                }
            });
        },

        /** Castillo de arena en el centro del arenero: partes ocultas (escala 0) que crecen desde el suelo. */
        armarCastillo: function () {
            var self = this;
            var R = this.L.R;
            var S = Math.min(R.w * 0.6, R.h * 0.62);
            var cx = R.x + R.w / 2, by = R.y + R.h * 0.56;
            var ARENA = 0xe6c588, SOMBRA = 0xcfa868, LUZ = 0xf4ddb0, BORDE = 0xb48a4e, HUECO = 0x8a6536;
            var partes = [];
            // Sombra en la arena.
            var piso = this.add.ellipse(cx, by + 4, S * 1.25, S * 0.14, 0x7a5a2a, 0.25).setDepth(30);
            function bloque(px, w, h, o) {
                o = o || {};
                var c = self.add.container(cx + px, by).setDepth(31 + (o.z || 0)).setScale(1, 0);
                var g = self.add.graphics();
                g.fillStyle(ARENA, 1); g.fillRect(-w / 2, -h, w, h);
                g.fillStyle(SOMBRA, 1); g.fillRect(w * 0.18, -h, w * 0.32, h);
                g.fillStyle(LUZ, 1); g.fillRect(-w / 2, -h, w, 4);
                // Almenas.
                var n = Math.max(3, Math.round(w / (S * 0.07)));
                var aw = w / (n * 2 - 1);
                for (var k = 0; k < n; k++) {
                    g.fillStyle(ARENA, 1); g.fillRect(-w / 2 + k * aw * 2, -h - aw * 0.9, aw, aw * 0.9);
                    g.fillStyle(LUZ, 1); g.fillRect(-w / 2 + k * aw * 2, -h - aw * 0.9, aw, 3);
                }
                g.lineStyle(2, BORDE, 0.8); g.strokeRect(-w / 2, -h, w, h);
                // Granitos y marcas del balde.
                g.fillStyle(BORDE, 0.45);
                for (var q = 0; q < Math.round(w * h / 260); q++) g.fillCircle(rnd(-w / 2 + 3, w / 2 - 3), -rnd(3, h - 3), rnd(0.8, 1.8));
                g.lineStyle(1.5, SOMBRA, 0.9);
                for (var r = 1; r < 3; r++) g.lineBetween(-w / 2 + 3, -h * r / 3, w / 2 - 3, -h * r / 3);
                if (o.ventana) { g.fillStyle(HUECO, 1); g.fillRoundedRect(-w * 0.14, -h * 0.72, w * 0.28, h * 0.2, { tl: w * 0.14, tr: w * 0.14, bl: 0, br: 0 }); }
                if (o.puerta) { g.fillStyle(HUECO, 1); g.fillRoundedRect(-w * 0.13, -h * 0.62, w * 0.26, h * 0.62, { tl: w * 0.13, tr: w * 0.13, bl: 0, br: 0 }); }
                c.add(g);
                c.alto = h + aw * 0.9;
                partes.push(c);
                return c;
            }
            bloque(0, S * 0.92, S * 0.3, { z: 0, puerta: true });                    // muralla con puerta
            bloque(-S * 0.42, S * 0.2, S * 0.52, { z: 1, ventana: true });           // torre izquierda
            bloque(S * 0.42, S * 0.2, S * 0.52, { z: 1, ventana: true });            // torre derecha
            var centro = bloque(0, S * 0.28, S * 0.74, { z: 0.5, ventana: true });    // torre del medio
            // La puerta va por delante de la torre del medio.
            bloque(0, S * 0.3, S * 0.22, { z: 2, puerta: true });
            return { partes: partes, cx: cx, by: by, S: S, centro: centro, piso: piso };
        },

        crecerParte: function (c) {
            this.tweens.add({ targets: c, scaleY: 1, duration: 420, ease: 'Back.easeOut' });
            this.granos(c.x, c.y - 6, 10, { dist: 50, colores: [0xe6c588, 0xcfa868, 0xf4ddb0, 0xb48a4e] });
        },

        /** Los juguetes se ubican delante del castillo, en una o dos filas (la de atrás, corrida a medio paso). */
        sitiosCastillo: function (n, cas) {
            var L = this.L, R = L.R;
            var filas = n > 4 ? 2 : 1;
            var porFila = Math.ceil(n / filas);
            var libre = R.y + R.h - cas.by - 10;
            var tam = Math.min(L.tam * 0.75, (R.w - 20) / porFila / 1.1, libre / (filas * 0.95 + 0.2));
            var sitios = [];
            for (var i = 0; i < n; i++) {
                var f = Math.floor(i / porFila), k = i % porFila;
                var enFila = f === filas - 1 ? n - f * porFila : porFila;
                var paso = (R.w - 20) / porFila;
                var x = R.x + R.w / 2 + (k - (enFila - 1) / 2) * paso;
                var y = cas.by + tam * 0.55 + f * tam * 0.95;
                sitios.push({ x: x, y: y, esc: tam / L.tam });
            }
            return sitios;
        },

        izarBandera: async function (cas) {
            var tope = cas.by - cas.centro.alto;
            var c = this.add.container(cas.cx, tope).setDepth(31.6).setScale(1, 0);
            // Que la bandera no se salga del arenero (en pantallas bajas la torre ya llega arriba).
            var alto = Math.max(26, Math.min(cas.S * 0.3, tope - this.L.R.y - 6));
            var palo = this.add.rectangle(0, -alto / 2, 4, alto, 0x8c5a2b);
            var tela = this.add.container(2, -alto + 2);
            var g = this.add.graphics();
            g.fillStyle(0xff6b6b, 1); g.fillTriangle(0, 0, alto * 0.62, alto * 0.17, 0, alto * 0.34);
            g.fillStyle(0xffd43b, 1); g.fillCircle(alto * 0.16, alto * 0.17, alto * 0.06);
            tela.add(g);
            c.add([palo, tela]);
            efecto(this, 'magia');
            await tw(this, { targets: c, scaleY: 1, duration: 500, ease: 'Back.easeOut' });
            // Ondea con el viento.
            this.tweens.add({ targets: tela, scaleX: 0.78, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            Ut.estallido(this, cas.cx, tope - alto, { n: 16, tex: 'estrella', tam: 26, dist: 130, sinTinte: true, depth: 60 });
            await esperar(this, 500);
        },

        estado: function () {
            var self = this;
            return {
                fase: this.fase,
                nivel: this.nivelActual,
                objetivo: this.objetivo,
                cuenta: this.cuenta,
                meta: this.nv ? this.nv.meta : 0,
                atrapados: this.atrapados || 0,
                hechos: this.hechos,
                errores: this.errores,
                sonando: !!this.sonando,
                juguetes: (this.juguetes || []).map(function (j) {
                    return { id: j.id, x: Math.round(j.actor.cont.x), y: Math.round(j.actor.cont.y), estado: j.estado, visto: j.estado === 'fuera' ? 1 : +self.descubierto(j).toFixed(2) };
                }),
                carrito: (this.enCarrito || []).length
            };
        },

        update: function (time, delta) {
            var self = this;
            var L = this.L;
            if (!L) return;
            if (this.vidaAmb) this.vidaAmb.actualizar(time, delta);
            this.animarCielo(time, delta);
            this.juguetes.forEach(function (j) { if (j.estado !== 'fuera' && j.actor.actualizar) j.actor.actualizar(time, delta); });
            this.enCarrito.forEach(function (a) { if (a.actualizar) a.actualizar(time, delta); });
            if (this.capaSucia && time - (this.ultimaSubida || 0) > 33) {
                this.capaSucia = false;
                this.ultimaSubida = time;
                this.capa.refresh();
            }
            // Ondas de la bocina mientras suena.
            var g = this.ondasG;
            if (g) {
                g.clear();
                if (this.ondas) {
                    var b = L.bocina;
                    for (var k = 0; k < 3; k++) {
                        var f = ((time - this.ondas) / 900 + k / 3) % 1;
                        g.lineStyle(4, 0xffffff, 0.75 * (1 - f));
                        g.strokeCircle(b.x, b.y, b.r * (1.1 + f * 0.9));
                    }
                }
            }
            if (this.bocina && this.bocina.halo) this.bocina.halo.setScale(1 + Math.sin(time / 380) * 0.06);
            // Repite el sonido sola si el niño lleva un rato sin oírlo.
            if (this.fase === 'jugar' && !this.sonando && time - this.ultimoSonido > 7000) this.escuchar(this.sonidoDe(this.objetivo));
            // Con ayuda (3 errores), el montoncito correcto brilla de a ratos.
            if (this.ayuda && this.fase === 'jugar' && time - (this.ultimoBrillo || 0) > 2600) {
                this.ultimoBrillo = time;
                this.juguetes.forEach(function (j) { if (j.id === self.objetivo && j.estado !== 'fuera') self.brillo(j.actor.cont.x, j.actor.cont.y); });
            }
            (this.vida || []).forEach(function (o) {
                if (!o.active) return;
                if (o.nube) { o.x += o.vx * delta / 1000; if (o.x > L.W + 80) o.x = -120; return; }
                o.fase += delta / 1000;
                o.x += Math.sin(o.fase * 0.7) * 0.9 + 0.3;
                o.y = o.y0 + Math.sin(o.fase * 1.6) * 16;
                var ab = Math.abs(Math.sin(time / 70 + o.fase));
                if (o.alas) { o.alas[0].scaleX = ab; o.alas[1].scaleX = ab; }
                else o.scaleX = o.base * (0.35 + 0.65 * ab);   // mariposa del diseño: aletea encogiéndose
                if (o.x > L.W + 20) o.x = -20;
            });
        }
    };

    B.crearMotor({ id: 'arenero', fondo: '#9fd3f5', escena: escena });
})(typeof window !== 'undefined' ? window : this);
