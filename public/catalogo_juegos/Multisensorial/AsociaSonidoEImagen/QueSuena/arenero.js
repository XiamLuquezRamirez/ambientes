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
    var EXTRA = ['tren', 'avion', 'vaca', 'gallo', 'ambulancia'];
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

    function pintarMarco(x, R, W, H, grosor) {
        // Tablas de madera alrededor del arenero, con veta, clavos y la tabla de adelante más ancha.
        function tabla(px, py, pw, ph, vertical, oscuro) {
            var g = vertical ? x.createLinearGradient(px, 0, px + pw, 0) : x.createLinearGradient(0, py, 0, py + ph);
            g.addColorStop(0, oscuro ? '#b07636' : '#d39a55');
            g.addColorStop(0.45, oscuro ? '#9a6229' : '#c0843f');
            g.addColorStop(1, oscuro ? '#6f4119' : '#8c5724');
            x.fillStyle = g;
            x.beginPath();
            if (x.roundRect) x.roundRect(px, py, pw, ph, 6); else x.rect(px, py, pw, ph);
            x.fill();
            x.strokeStyle = 'rgba(80,45,15,0.35)';
            x.lineWidth = 1.2;
            for (var i = 0; i < 4; i++) {
                x.beginPath();
                if (vertical) {
                    var vx = px + pw * (0.2 + i * 0.2);
                    x.moveTo(vx, py + 4);
                    for (var yy = py; yy < py + ph; yy += 30) x.lineTo(vx + Math.sin(yy / 40 + i) * 2.5, yy);
                } else {
                    var vy = py + ph * (0.22 + i * 0.19);
                    x.moveTo(px + 4, vy);
                    for (var xx = px; xx < px + pw; xx += 30) x.lineTo(xx, vy + Math.sin(xx / 47 + i) * 2.2);
                }
                x.stroke();
            }
            x.fillStyle = 'rgba(255,235,200,0.35)';
            if (vertical) x.fillRect(px + 2, py + 2, 3, ph - 4); else x.fillRect(px + 4, py + 2, pw - 8, 3);
        }
        function clavo(cx, cy) {
            x.fillStyle = '#5c5f66';
            x.beginPath(); x.arc(cx, cy, 3.2, 0, Math.PI * 2); x.fill();
            x.fillStyle = 'rgba(255,255,255,0.6)';
            x.beginPath(); x.arc(cx - 1, cy - 1, 1.2, 0, Math.PI * 2); x.fill();
        }
        var gf = grosor;
        // Sombra del arenero sobre el pasto.
        x.fillStyle = 'rgba(0,0,0,0.18)';
        x.beginPath();
        if (x.roundRect) x.roundRect(R.x - gf + 6, R.y - gf * 0.6 + 10, R.w + gf * 2, R.h + gf * 1.6, 14); else x.rect(R.x - gf + 6, R.y - gf * 0.6 + 10, R.w + gf * 2, R.h + gf * 1.6);
        x.fill();
        tabla(R.x - gf, R.y - gf * 0.6, R.w + gf * 2, gf * 0.6 + 4, false, true);       // fondo (lejos)
        tabla(R.x - gf, R.y - gf * 0.6, gf, R.h + gf * 0.6, true, false);               // izquierda
        tabla(R.x + R.w, R.y - gf * 0.6, gf, R.h + gf * 0.6, true, false);              // derecha
        tabla(R.x - gf, R.y + R.h - 2, R.w + gf * 2, gf + 2, false, false);              // frente
        [[R.x - gf * 0.5, R.y - gf * 0.3], [R.x + R.w + gf * 0.5, R.y - gf * 0.3], [R.x - gf * 0.5, R.y + R.h + gf * 0.45], [R.x + R.w + gf * 0.5, R.y + R.h + gf * 0.45]].forEach(function (q) { clavo(q[0], q[1]); });
        // Sombra interior de la tabla de atrás sobre la arena.
        var s = x.createLinearGradient(0, R.y, 0, R.y + 26);
        s.addColorStop(0, 'rgba(60,35,10,0.35)');
        s.addColorStop(1, 'rgba(60,35,10,0)');
        x.fillStyle = s;
        x.fillRect(R.x, R.y, R.w, 26);
    }

    /* ══ Escena ══ */

    var escena = {
        create: function () {
            var self = this;
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
            var arriba = Math.max(H * 0.4, Math.min(250, H * 0.46));
            L.R = { x: L.grosor + 8, y: arriba, w: W - (L.grosor + 8) * 2, h: H - arriba - L.grosor - 10 };
            L.tam = Math.max(78, Math.min(160, L.R.h * 0.44, L.R.w / 4.6));
            L.pincel = Math.max(26, L.tam * 0.24);
            var hueco = arriba - 70;
            L.bocina = { x: W / 2, y: Math.max(64, Math.min(132, 70 + hueco * 0.35)), r: Math.max(30, Math.min(44, hueco * 0.3)) };
            L.carrito = { w: Math.max(110, Math.min(190, W * 0.17)) };
            L.carrito.h = L.carrito.w * 0.42;
            L.carrito.x = L.R.x + L.carrito.w * 0.55;
            L.carrito.y = L.R.y - L.grosor * 0.6 - L.carrito.h * 0.5 - 4;
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
            if (this.vidaAmb) this.vidaAmb.parque({ horizonte: R.y - L.grosor - 8, arboles: [0.3, 0.46, 0.7, 0.9], solX: 0.2 });
            // Pasto delante y a los costados del arenero.
            var pasto = keep(this.add.graphics().setDepth(1));
            pasto.fillStyle(0x6fbf4a, 1);
            pasto.fillRect(0, R.y - L.grosor, L.W, L.H - R.y + L.grosor);
            pasto.fillStyle(0x5aa83a, 1);
            for (var i = 0; i < L.W; i += 7) pasto.fillTriangle(i, R.y - L.grosor + 2, i + 3, R.y - L.grosor - 6 - (i * 7 % 5), i + 6, R.y - L.grosor + 2);

            // Marco de madera (una textura).
            var mk = 'arenero_marco';
            texturaCanvas(this, mk, L.W, L.H, function (x) { pintarMarco(x, R, L.W, L.H, L.grosor); });
            keep(this.add.image(0, 0, mk).setOrigin(0, 0).setDepth(3));

            // Fondo del hoyo: arena húmeda y más oscura, con sombra en el borde.
            texturaCanvas(this, 'arenero_hoyo', R.w, R.h, function (x, w, h) {
                x.fillStyle = x.createPattern(self.baldosaHumeda, 'repeat');
                x.fillRect(0, 0, w, h);
            });
            keep(this.add.image(R.x, R.y, 'arenero_hoyo').setOrigin(0, 0).setDepth(4));

            // Capa de arena seca que se borra con el dedo.
            this.capa = texturaCanvas(this, 'arenero_capa', R.w, R.h, function (x, w, h) {
                x.fillStyle = x.createPattern(self.baldosaSeca, 'repeat');
                x.fillRect(0, 0, w, h);
            });
            this.capaCtx = this.capa.getContext();
            this.patron = this.capaCtx.createPattern(this.baldosaSeca, 'repeat');
            keep(this.add.image(R.x, R.y, 'arenero_capa').setOrigin(0, 0).setDepth(20));
            this.cols = Math.ceil(R.w / CELDA);
            this.filas = Math.ceil(R.h / CELDA);
            this.tapado = new Uint8Array(this.cols * this.filas).fill(1);

            this.montarBocina(keep);
            this.montarEstrellas(keep);
            this.montarCarrito(keep);
            this.montarVida(keep);
            this.montarPresentador();

            // Al cambiar el tamaño, los juguetes conservan su lugar relativo y lo ya cavado se recava.
            if (reubicar && viejo) {
                this.juguetes.forEach(function (j) {
                    if (j.estado === 'fuera') return;
                    j.x = R.x + j.u * R.w;
                    j.y = R.y + j.v * R.h;
                    j.actor.cont.setPosition(j.x, j.y);
                    j.actor.cont.setScale(L.tam / j.tam0);
                    if (j.estado === 'visto') self.cavarElipse(j, 1.05);
                    else self.montonDe(j);
                });
                this.enCarrito.forEach(function (a, k) { self.ubicarEnCarrito(a, k, false); });
            }
            this.capa.refresh();
        },

        montarBocina: function (keep) {
            var L = this.L;
            var b = keep(this.add.container(L.bocina.x, L.bocina.y).setDepth(30));
            var halo = this.add.circle(0, 0, L.bocina.r * 1.25, 0xffffff, 0.35);
            var plato = this.add.circle(0, 0, L.bocina.r, 0xff922b).setStrokeStyle(5, 0xffffff);
            var luz = this.add.circle(-L.bocina.r * 0.3, -L.bocina.r * 0.35, L.bocina.r * 0.35, 0xffffff, 0.3);
            var icono = this.add.image(0, 0, A.textura(this, 'bocina', 128)).setDisplaySize(L.bocina.r * 1.35, L.bocina.r * 1.35);
            b.add([halo, plato, luz, icono]);
            b.halo = halo;
            this.bocina = b;
            this.ondasG = keep(this.add.graphics().setDepth(29));
        },

        montarEstrellas: function (keep) {
            var L = this.L;
            this.estrellas = [];
            var tam = Math.max(22, L.bocina.r * 0.62);
            for (var i = 0; i < 4; i++) {
                var x = L.bocina.x + L.bocina.r + 26 + i * (tam + 6);
                var e = keep(this.add.image(x, L.bocina.y, A.textura(this, 'estrella', 64)).setDisplaySize(tam, tam).setDepth(30));
                if (i >= this.nivelActual) e.setTint(0x8a8f98).setAlpha(0.45);
                this.estrellas.push(e);
            }
        },

        montarCarrito: function (keep) {
            var c = this.L.carrito;
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
            var por = 3;
            var col = k % por, fila = Math.floor(k / por);
            var tam = c.w * 0.5;
            var x = c.x - c.w * 0.3 + col * (c.w * 0.3);
            var y = c.y - c.h * 0.35 - fila * tam * 0.3;
            var esc = tam / a.tam;
            a.cont.setDepth(8 - fila * 0.01 + col * 0.001);
            if (!animar) { a.cont.setPosition(x, y).setScale(esc).setAngle(rnd(-14, 14)); return Promise.resolve(); }
            return { x: x, y: y, esc: esc };
        },

        montarVida: function (keep) {
            var self = this;
            var L = this.L;
            this.vida = [];
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
            this.pres.ubicar(L.presX, L.R.y - L.grosor * 0.5 - L.presAlto / 2 + 6);
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
            c.save();
            c.globalCompositeOperation = 'destination-out';
            var g = c.createRadialGradient(lx, ly, r * 0.25, lx, ly, r);
            g.addColorStop(0, 'rgba(0,0,0,1)');
            g.addColorStop(0.7, 'rgba(0,0,0,0.85)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            c.fillStyle = g;
            c.beginPath();
            c.arc(lx, ly, r, 0, Math.PI * 2);
            c.fill();
            c.restore();
            this.marcar(lx, ly, r * 0.78, 0);
            this.sucio();
            return true;
        },

        tapar: function (x, y, r) {
            var R = this.L.R;
            var lx = x - R.x, ly = y - R.y;
            var c = this.capaCtx;
            c.save();
            c.beginPath();
            c.arc(lx, ly, r, 0, Math.PI * 2);
            c.clip();
            c.fillStyle = this.patron;
            c.fillRect(lx - r, ly - r, r * 2, r * 2);
            c.restore();
            this.marcar(lx, ly, r, 1);
            this.sucio();
        },

        marcar: function (lx, ly, r, v) {
            var c0 = Math.max(0, Math.floor((lx - r) / CELDA)), c1 = Math.min(this.cols - 1, Math.floor((lx + r) / CELDA));
            var f0 = Math.max(0, Math.floor((ly - r) / CELDA)), f1 = Math.min(this.filas - 1, Math.floor((ly + r) / CELDA));
            for (var f = f0; f <= f1; f++) {
                for (var k = c0; k <= c1; k++) {
                    var dx = (k + 0.5) * CELDA - lx, dy = (f + 0.5) * CELDA - ly;
                    if (dx * dx + dy * dy <= r * r) this.tapado[f * this.cols + k] = v;
                }
            }
        },

        /** Montoncito sobre un juguete enterrado (luz arriba, sombra abajo). */
        montonDe: function (j) {
            var R = this.L.R;
            var c = this.capaCtx;
            var lx = j.x - R.x, ly = j.y - R.y;
            var rx = this.L.tam * 0.46, ry = this.L.tam * 0.3;
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
            var rx = this.L.tam * 0.4 * (k || 1), ry = this.L.tam * 0.32 * (k || 1);
            for (var a = -1; a <= 1; a += 0.5) for (var b = -1; b <= 1; b += 0.5) this.cavar(j.x + a * rx * 0.7, j.y + b * ry * 0.7, this.L.pincel);
        },

        /** Fracción descubierta del juguete (celdas dentro de su elipse). */
        descubierto: function (j) {
            var R = this.L.R;
            var rx = this.L.tam * 0.36, ry = this.L.tam * 0.3;
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
                var x = rnd(R.x + m, R.x + R.w - m);
                var y = rnd(R.y + L.tam * 0.5, R.y + R.h - L.tam * 0.42);
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
                a.cont.setDepth(12).setAngle(rnd(-10, 10));
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
            var r = this.add.container(R.x - 30, R.y + R.h / 2).setDepth(26);
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
            c.strokeStyle = 'rgba(160,115,60,0.09)';
            c.lineWidth = 2;
            for (var yy = 18; yy < R.h; yy += 16) {
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
            this.cameras.main.shake(140, 0.003);
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
            var t2 = otros[0] || extra[0];
            var t3 = otros[1] || extra[1];
            var pool = function (obj, n, copias) {
                var resto = mezclar(ops.concat(extra).filter(function (e) { return e !== obj; }));
                var ids = [];
                for (var i = 0; i < copias; i++) ids.push(obj);
                return mezclar(ids.concat(resto.slice(0, n - copias)));
            };
            return [
                { objetivo: correcto, ids: mezclar(ops), meta: 1 },
                { objetivo: t2, ids: pool(t2, 5, 2), meta: 2 },
                { objetivo: t3, ids: pool(t3, 5, 2), meta: 2, topo: true },
                { objetivo: null, ids: mezclar([correcto, t2, t3].concat(extra.slice(2, 4))), meta: 3, topo: true, cambia: true }
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

        /* ── Fiesta final: los juguetes saltan del carrito y hacen su acción todos juntos ── */

        fiestaFinal: async function () {
            var self = this;
            var L = this.L;
            this.fase = 'fin';
            this.pista.parar();
            // El rastrillo deja la arena lisa para la fiesta.
            this.quitarJuguetes();
            await this.rastrillar();
            efecto(this, 'victoria');
            Ut.confeti(this, 110);
            this.reaccion('Bailar', 60000);
            var n = this.enCarrito.length;
            this.enCarrito.forEach(function (a, i) {
                var x = L.R.x + L.R.w * (i + 0.5) / n;
                var y = L.R.y + L.R.h * 0.5;
                self.time.delayedCall(i * 140, function () {
                    if (!a.cont.active) return;
                    a.cont.setDepth(45);
                    self.tweens.add({ targets: a.cont, x: x, y: y, scale: Math.min(1, (L.R.w / n) / a.tam * 0.9), angle: 0, duration: 650, ease: 'Back.easeOut', onComplete: function () { a.acierto(1600); } });
                });
            });
            await esperar(this, 3200);
            if (global.AsociaPj3D && global.AsociaPj3D.capa) global.AsociaPj3D.capa(false);
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
                o.alas[0].scaleX = ab;
                o.alas[1].scaleX = ab;
                if (o.x > L.W + 20) o.x = -20;
            });
        }
    };

    B.crearMotor({ id: 'arenero', fondo: '#9fd3f5', escena: escena });
})(typeof window !== 'undefined' ? window : this);
