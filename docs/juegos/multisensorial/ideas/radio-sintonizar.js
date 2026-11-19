/**
 * «La radio mágica» — motor propio de Secuencia de 3 Sonidos Diferentes (5-6 años).
 *
 * Verbo de juego: SINTONIZAR. Una radio antigua tiene una emisora por cada sonido. El niño desliza el
 * dedo para mover la aguja del dial; los sonidos se oyen cada vez más claros y la estática baja a
 * medida que se acerca a una emisora, y el ojo mágico, el osciloscopio y las barras de señal lo
 * muestran. Si mantiene la aguja quieta sobre una emisora, esta se fija (la aguja se «imanta» para
 * ayudar). La canción se arma fijando las emisoras EN EL ORDEN del programa: una emisora que no
 * toca todavía solo se marca como «no es esta» y se puede seguir buscando: nunca se pierde lo logrado.
 *
 * Niveles: más emisoras y más juntas. La ventana de la sala cambia (atardecer, lluvia, nieve, noche
 * de estrellas). Final: la radio se enciende a todo volumen y los personajes salen a cantar.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var C = Phaser.Display.Color;

    var COL_E = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xcc5de8, 0xff922b];
    var VENTANAS = ['atardecer', 'lluvia', 'nieve', 'estrellas'];
    var PAREDES = [[0x6b4a2f, 0x8a6240], [0x35506b, 0x4d6a86], [0x6a4f7a, 0x86689a], [0x2b3a55, 0x3e5073]];

    function mezcla(a, b, t) {
        var c = C.Interpolate.ColorWithColor(C.ValueToColor(a), C.ValueToColor(b), 100, Math.max(0, Math.min(1, t)) * 100);
        return C.GetColor(c.r, c.g, c.b);
    }

    var escena = {
        iniciar: function () {
            this.agu = 0.5; this.objAgu = 0.5; this.aguV = 0;
            this.estaciones = [];
            this.dedo = null; this.xAnt = 0;
            this.prog = 0; this.song = [];
            this.reunidos = [];
            this.holdT = 0;
            this.ultEst = 0; this.ultSonidoE = 0; this.ultSonidoT = -9999;
            this.avatares = [];
            this.ultimoReclamo = -99999;
            this.nivelV = 0;
            this.fiesta = false;
            this.senal = 0;
            this.lluvia = [];
            this.chispas = [];
            this.bombillasEsc = 0;
        },

        filtrarPool: function (pool) {
            var ok = K.ANIMALES.concat(['campana', 'tambor', 'maracas', 'trompeta', 'carro', 'tren', 'reloj', 'pelota']);
            var f = pool.filter(function (id) { return ok.indexOf(id) >= 0; });
            return f.length >= 6 ? f : pool;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.k = Math.max(0.72, Math.min(1.15, H / 768));
            var rw = Math.round(Math.min(L.der * 0.8, 900 * L.k)), rh = Math.round(H * 0.42);
            L.mesa = Math.round(H * 0.9);
            L.radio = { x0: Math.round(L.der / 2 - rw / 2 + 24), w: rw, h: rh, y0: L.mesa - rh };
            var R = L.radio;
            L.altavoz = { x: R.x0 + R.w * 0.2, y: R.y0 + R.h * 0.54, rx: R.w * 0.145, ry: R.h * 0.36 };
            L.ojo = { x: R.x0 + R.w * 0.2, y: R.y0 + R.h * 0.12, r: Math.round(22 * L.k) };
            L.dial = { x0: R.x0 + R.w * 0.43, x1: R.x0 + R.w * 0.93, y0: R.y0 + R.h * 0.27, y1: R.y0 + R.h * 0.55 };
            L.perilla = { x: R.x0 + R.w * 0.68, y: R.y0 + R.h * 0.8, r: Math.round(R.h * 0.12) };
            L.bocina = { x: 48, y: Math.round(H * 0.2), r: 30 };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            this.salaG = keep(this.add.graphics().setDepth(1));
            this.ventanaG = keep(this.add.graphics().setDepth(2));
            this.radioG = keep(this.add.graphics().setDepth(10));
            this.vivoG = keep(this.add.graphics().setDepth(12));
            this.luzG = keep(this.add.graphics().setDepth(40));
            this.pintarSala();
            this.pintarRadio();
            this.montarHud(keep);
            this.sembrarMotes(keep, 8, { x: 0, y: 60, w: L.W, h: L.mesa - 80, depth: 6 }, 0xffe9a8);
            this.reubicarAvatares();
        },

        /* ── Sala: papel pintado, ventana, estante, lámpara y mesa con mantel ── */

        pintarSala: function () {
            var L = this.L, g = this.salaG, P = PAREDES[this.nivelV % 4];
            g.clear();
            for (var b = 0; b < 14; b++) { g.fillStyle(mezcla(P[0], P[1], b / 13), 1); g.fillRect(0, (L.mesa / 14) * b, L.W, L.mesa / 14 + 1); }
            g.fillStyle(0x000000, 0.1); for (var x = 0; x < L.W; x += 90) g.fillRect(x, 0, 4, L.mesa);
            g.fillStyle(0xffffff, 0.06); for (var y = 40; y < L.mesa; y += 80) for (var xx = 45; xx < L.W; xx += 90) g.fillCircle(xx + (y % 160 ? 45 : 0), y, 5);
            // Zócalo de madera y suelo.
            g.fillStyle(0x3b2a1a, 1); g.fillRect(0, L.mesa - 8, L.W, L.H - L.mesa + 8);
            // Ventana de la sala (el exterior se anima en ventanaG).
            var V = this.ventana = { x: Math.round(L.W * 0.07), y: Math.round(L.H * 0.1), w: Math.round(L.W * 0.17), h: Math.round(L.H * 0.3) };
            g.fillStyle(0x000000, 0.3); g.fillRoundedRect(V.x - 6 + 4, V.y - 6 + 6, V.w + 12, V.h + 12, 8);
            g.fillStyle(0x7a4419, 1); g.fillRoundedRect(V.x - 10, V.y - 10, V.w + 20, V.h + 20, 10);
            g.fillStyle(0x5c3312, 1); g.fillRect(V.x + V.w / 2 - 3, V.y, 6, V.h); g.fillRect(V.x, V.y + V.h / 2 - 3, V.w, 6);
            // Estante con libros y una planta.
            var ex = Math.round(L.W * 0.3), ey = Math.round(L.H * 0.2), ew = Math.round(L.W * 0.26);
            g.fillStyle(0x6d3d16, 1); g.fillRoundedRect(ex, ey, ew, 12, 4);
            var cols = [0xc92a2a, 0x1c7ed6, 0x2f9e44, 0xe67700, 0x7048e8];
            for (var i = 0; i < 9; i++) { var bw = 18 + (i % 3) * 6, bh = 46 + (i * 7) % 26; g.fillStyle(cols[i % 5], 1); g.fillRect(ex + 14 + i * 24, ey - bh, bw, bh); g.fillStyle(0xffffff, 0.3); g.fillRect(ex + 14 + i * 24 + 3, ey - bh + 6, bw - 6, 4); }
            g.fillStyle(0xb5803f, 1); g.fillRoundedRect(ex + ew - 62, ey - 30, 40, 30, 6); g.fillStyle(0x2f9e44, 1); g.fillEllipse(ex + ew - 42, ey - 48, 54, 40); g.fillEllipse(ex + ew - 58, ey - 38, 30, 30); g.fillEllipse(ex + ew - 26, ey - 40, 30, 30);
            // Cuadro en la pared.
            var cx = Math.round(L.der * 0.8), cy = Math.round(L.H * 0.1);
            g.fillStyle(0x7a4419, 1); g.fillRoundedRect(cx, cy, 120, 90, 6); g.fillStyle(0xffe9a8, 1); g.fillRoundedRect(cx + 8, cy + 8, 104, 74, 4);
            g.fillStyle(0x4dabf7, 1); g.fillTriangle(cx + 20, cy + 74, cx + 56, cy + 30, cx + 92, cy + 74); g.fillStyle(0xfab005, 1); g.fillCircle(cx + 90, cy + 26, 10);
            // Mesa con mantel de cuadros bajo la radio.
            g.fillStyle(0x000000, 0.3); g.fillRect(0, L.mesa - 4, L.W, 10);
            g.fillStyle(0x8b5524, 1); g.fillRect(0, L.mesa, L.W, L.H - L.mesa);
            g.fillStyle(0xc92a2a, 1); g.fillRect(L.radio.x0 - 70, L.mesa, L.radio.w + 140, 16);
            g.fillStyle(0xffffff, 0.5); for (var q = L.radio.x0 - 70; q < L.radio.x0 + L.radio.w + 70; q += 24) g.fillRect(q, L.mesa, 12, 16);
        },

        /* ── La radio: mueble de madera, rejilla del altavoz, ventana del dial y perillas ── */

        pintarRadio: function () {
            var L = this.L, g = this.radioG, R = L.radio;
            g.clear();
            g.fillStyle(0x000000, 0.3); g.fillRoundedRect(R.x0 + 8, R.y0 + 12, R.w, R.h, 26);
            g.fillStyle(0x5c3312, 1); g.fillRoundedRect(R.x0, R.y0, R.w, R.h, 26);
            g.fillStyle(0x8b5524, 1); g.fillRoundedRect(R.x0 + 8, R.y0 + 8, R.w - 16, R.h - 16, 20);
            g.fillStyle(0xa8642e, 1); g.fillRoundedRect(R.x0 + 8, R.y0 + 8, R.w - 16, 14, { tl: 20, tr: 20, bl: 0, br: 0 });
            g.lineStyle(3, 0x4a290e, 0.6); for (var v = R.y0 + 30; v < R.y0 + R.h - 10; v += 20) g.lineBetween(R.x0 + 14, v, R.x0 + R.w - 14, v);
            // Antena.
            g.lineStyle(5, 0xadb5bd, 1); g.lineBetween(R.x0 + R.w * 0.88, R.y0, R.x0 + R.w * 0.97, R.y0 - R.h * 0.55); g.lineBetween(R.x0 + R.w * 0.88, R.y0, R.x0 + R.w * 0.8, R.y0 - R.h * 0.5);
            g.fillStyle(0xe9ecef, 1); g.fillCircle(R.x0 + R.w * 0.97, R.y0 - R.h * 0.55, 6); g.fillCircle(R.x0 + R.w * 0.8, R.y0 - R.h * 0.5, 6);
            // Altavoz: rejilla de tela con trama.
            var A = L.altavoz;
            g.fillStyle(0x3d2208, 1); g.fillEllipse(A.x, A.y, A.rx * 2 + 16, A.ry * 2 + 16);
            g.fillStyle(0xd9b57a, 1); g.fillEllipse(A.x, A.y, A.rx * 2, A.ry * 2);
            g.lineStyle(2, 0x8a6a3a, 0.7);
            for (var gx = -A.rx; gx <= A.rx; gx += 12) { var h = Math.sqrt(Math.max(0, 1 - (gx / A.rx) * (gx / A.rx))) * A.ry; g.lineBetween(A.x + gx, A.y - h, A.x + gx, A.y + h); }
            for (var gy = -A.ry; gy <= A.ry; gy += 12) { var w2 = Math.sqrt(Math.max(0, 1 - (gy / A.ry) * (gy / A.ry))) * A.rx; g.lineBetween(A.x - w2, A.y + gy, A.x + w2, A.y + gy); }
            g.fillStyle(0xffffff, 0.12); g.fillEllipse(A.x - A.rx * 0.3, A.y - A.ry * 0.4, A.rx * 0.8, A.ry * 0.5);
            // Ventana del dial.
            var D = L.dial;
            g.fillStyle(0x3d2208, 1); g.fillRoundedRect(D.x0 - 18, D.y0 - 44, D.x1 - D.x0 + 36, D.y1 - D.y0 + 70, 16);
            g.fillStyle(0xffe9a8, 1); g.fillRoundedRect(D.x0 - 10, D.y0 - 10, D.x1 - D.x0 + 20, D.y1 - D.y0 + 20, 10);
            g.lineStyle(2, 0x5c3312, 0.8); for (var i = 0; i <= 40; i++) { var x = D.x0 + (D.x1 - D.x0) * i / 40, hh = i % 5 === 0 ? 22 : 11; g.lineBetween(x, D.y1 - 2, x, D.y1 - 2 - hh); }
            g.lineBetween(D.x0, D.y1 - 2, D.x1, D.y1 - 2);
            // Perilla de sintonía y de volumen.
            this.pintarPerilla(g, L.perilla.x, L.perilla.y, L.perilla.r, 0);
            g.fillStyle(0x2b1608, 1); g.fillCircle(R.x0 + R.w * 0.86, R.y0 + R.h * 0.8, L.perilla.r * 0.62);
            g.fillStyle(0xd9a05b, 1); g.fillCircle(R.x0 + R.w * 0.86, R.y0 + R.h * 0.8, L.perilla.r * 0.5);
            g.fillStyle(0x3d2208, 1); g.fillRect(R.x0 + R.w * 0.86 - 2, R.y0 + R.h * 0.8 - L.perilla.r * 0.5, 4, L.perilla.r * 0.5);
        },

        pintarPerilla: function (g, x, y, r, ang) {
            g.fillStyle(0x000000, 0.3); g.fillCircle(x + 3, y + 5, r + 6);
            g.fillStyle(0x2b1608, 1); g.fillCircle(x, y, r + 6);
            for (var i = 0; i < 24; i++) { var a = ang + i * Math.PI / 12; g.fillStyle(0x4a290e, 1); g.fillCircle(x + Math.cos(a) * (r + 3), y + Math.sin(a) * (r + 3), 5); }
            g.fillStyle(0xd9a05b, 1); g.fillCircle(x, y, r);
            g.fillStyle(0xf0c27f, 1); g.fillCircle(x - r * 0.2, y - r * 0.2, r * 0.75);
            g.lineStyle(4, 0x7a4419, 1); g.lineBetween(x + Math.cos(ang) * r * 0.2, y + Math.sin(ang) * r * 0.2, x + Math.cos(ang) * r * 0.9, y + Math.sin(ang) * r * 0.9);
        },

        /* ── Avatares: cada emisora fijada aparece sobre la radio (la canción que se arma) ── */

        posAvatar: function (k, n) {
            var L = this.L, R = L.radio, paso = Math.min(110, (R.w * 0.62) / Math.max(1, n));
            return { x: Math.round(R.x0 + R.w * 0.43 + (R.w * 0.5) / 2 - ((n - 1) * paso) / 2 + k * paso), y: Math.round(R.y0 - 62 * L.k) };
        },

        reubicarAvatares: function () {
            var self = this, n = this.song.length || 3;
            this.avatares.forEach(function (a, k) { if (a.cont && a.cont.active) { var p = self.posAvatar(k, n); a.cont.setPosition(p.x, p.y); } });
        },

        crearAvatar: function (id, k, n) {
            var L = this.L, p = this.posAvatar(k, n), r = Math.round(36 * L.k);
            var c = this.add.container(p.x, p.y).setDepth(30);
            var g = this.add.graphics();
            g.fillStyle(0x000000, 0.25); g.fillCircle(3, 5, r);
            g.fillStyle(0xffffff, 1); g.fillCircle(0, 0, r);
            g.lineStyle(5, 0xffd43b, 1); g.strokeCircle(0, 0, r);
            var im = this.add.image(0, 0, 'el_' + id); im.setScale((r * 1.25) / Math.max(im.width, im.height));
            c.add([g, im]);
            return { cont: c, id: id };
        },

        /* ── Niveles ── */

        generarEmisoras: function (nv) {
            var n = nv.opciones.length;
            var base = [];
            for (var i = 0; i < n; i++) base.push((i + 0.75) / (n + 0.5));
            var pos = Ut.mezclar(base).map(function (p) { return Math.max(0.06, Math.min(0.94, p + (Math.random() - 0.5) * 0.04)); });
            return nv.opciones.map(function (id, i) { return { id: id, pos: pos[i], col: COL_E[i % 6], estado: null, cool: 0 }; });
        },

        preguntar: function () {
            if (this.nv.demo || this.nivelActual > 0) return Promise.resolve();
            return this.ctx.decir({ voz: 'zeus', texto: '¡Sintoniza las emisoras en el orden del programa! Desliza el dedo y escucha con atención.' }, { minMs: 900 });
        },

        prepararNivel: async function (i, nv) {
            var self = this;
            this.nv = nv;
            this.nivelV = Math.max(0, Math.min(3, i < 0 ? 0 : this.nivelActual));
            this.pintarSala();
            this.avatares.forEach(function (a) { if (a.cont.active) tw(self, { targets: a.cont, alpha: 0, duration: 250 }).then(function () { a.cont.destroy(); }); });
            this.avatares = [];
            this.prog = 0; this.completa = false; this.llegando = false; this.erroresNivel = 0;
            this.song = nv.correctas.slice();
            this.estaciones = this.generarEmisoras(nv);
            this.agu = this.objAgu = 0.5 + (Math.random() < 0.5 ? -0.3 : 0.3) * 0; this.aguV = 0; this.holdT = 0;
            this.bombillasEsc = 0;
            await esperar(this, 700);
        },

        /** La radio toca el programa: cada sonido enciende una bombilla y el ojo mágico late. */
        alSonar: function (id, k) { this.bombillasEsc = k + 1; this.pulsoOjo = this.time.now; },
        alReescuchar: function (empieza) { if (empieza) this.bombillasEsc = 0; },

        mostrarOpciones: async function () { await esperar(this, 300); },

        /* ── Entrada: deslizar el dedo mueve la aguja (movimiento relativo, sin saltos) ── */

        alTocar: function (p) {
            if (this.fase !== 'jugar' && this.fase !== 'demo') return;
            this.dedo = { x: p.x }; this.xAnt = p.x;
            this.pista.reiniciar();
        },
        alMover: function (p) {
            if (!this.dedo || !p.isDown) return;
            var D = this.L.dial, dx = p.x - this.xAnt;
            this.xAnt = p.x;
            this.objAgu = Math.max(0, Math.min(1, this.objAgu + dx / (D.x1 - D.x0)));
            this.pista.reiniciar();
        },
        alSoltar: function () { this.dedo = null; },

        ocupadoPorJuego: function () { return !!this.dedo; },

        /* ── Fijar una emisora ── */

        fijar: function (e) {
            var self = this;
            e.cool = 1.6;
            var esp = this.song[this.prog];
            this.sonar(e.id, { breve: true, bocina: false });
            this.efectos = this.efectos || [];
            this.efectos.push({ t0: this.time.now, col: e.col, pos: e.pos });
            if (e.id === esp) {
                e.estado = 'ok';
                var k = this.prog;
                this.prog += 1;
                var av = this.crearAvatar(e.id, k, this.song.length);
                av.cont.setScale(0.2).setAlpha(0);
                this.avatares.push(av);
                tw(this, { targets: av.cont, scale: 1, alpha: 1, duration: 360, ease: 'Back.easeOut' });
                K.tono({ f: 660 + this.prog * 110, f2: 990 + this.prog * 110, dur: 0.22, vol: 0.05 });
                Ut.estallido(this, av.cont.x, av.cont.y, { n: 10, tex: 'estrella', tam: 24, dist: 110, depth: 71, sinTinte: true });
                this.pista.reiniciar();
                if (this.prog >= this.song.length) this.llegar();
            } else {
                // No toca esa emisora todavía: se marca y se sigue buscando (no se pierde nada).
                e.estado = 'mal';
                this.errores += 1; this.erroresNivel += 1;
                K.tono({ f: 320, f2: 220, dur: 0.2, vol: 0.05 });
                this.sacudida = this.time.now;
                if (this.erroresNivel >= 4) this.ayuda = true;
                if (this.time.now - this.ultimoReclamo > 7000) {
                    this.ultimoReclamo = this.time.now;
                    this.reaccion('Decir_no', 1400);
                    this.ctx.decir({ voz: 'zeus', texto: '¡Esa emisora todavía no! Sigue buscando la que sigue en el programa.' }, { minMs: 800 });
                }
                setTimeout(function () { if (e.estado === 'mal') e.estado = null; }, 1800);
            }
        },

        llegar: async function () {
            if (this.llegando) return;
            this.llegando = true; this.completa = true; this.fase = 'premio';
            this.marcadas = this.song.slice();
            var R = this.L.radio;
            await this.acertar(this.song.slice(), { x: R.x0 + R.w * 0.5, y: R.y0 - 40 });
            this.llegando = false;
        },

        alAcertar: async function () {
            for (var k = 0; k < this.avatares.length; k++) {
                if (!this.sigue()) return;
                var a = this.avatares[k];
                this.reunidos.push(a.id);
                this.tweens.add({ targets: a.cont, y: a.cont.y - 26, duration: 160, yoyo: true, repeat: 1 });
                Ut.estallido(this, a.cont.x, a.cont.y, { n: 10, tex: 'estrella', tam: 24, dist: 110, depth: 71, sinTinte: true });
                await this.sonar(a.id, { breve: true, bocina: false });
            }
            Ut.confeti(this, 60);
            await esperar(this, 600);
        },

        alTerminarNivel: async function () { await esperar(this, 300); },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.dedo) return Promise.resolve();
            this.pulsoOjo = this.time.now;
            if (!this.ayuda) return esperar(this, 800);
            var e = this.estaciones.filter(function (q) { return q.id === self.song[self.prog]; })[0];
            if (!e) return esperar(this, 500);
            var D = this.L.dial, y = (D.y0 + D.y1) / 2;
            return this.ctx.mano({ punto: { x: D.x0 + (D.x1 - D.x0) * this.agu, y: y + 60 }, holdMs: 250, arrastre: { dx: (e.pos - this.agu) * (D.x1 - D.x0), dy: 0, durMs: 1400 }, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
        },

        demoPaso: function () {
            var self = this;
            return this.nv.correctas.map(function (id) {
                return function () {
                    var e = self.estaciones.filter(function (q) { return q.id === id; })[0];
                    if (!e) return null;
                    var D = self.L.dial, y = (D.y0 + D.y1) / 2 + 60, ww = D.x1 - D.x0;
                    return {
                        desde: { x: D.x0 + ww * self.agu, y: y }, hasta: { x: D.x0 + ww * e.pos, y: y },
                        hacer: async function () {
                            self.fase = 'jugar';
                            self.dedo = { x: 0 };
                            var antes = self.prog;
                            for (var t = 0; t < 90 && self.prog === antes; t++) { self.objAgu += (e.pos - self.objAgu) * 0.12; await esperar(self, 40); }
                            self.dedo = null;
                            await esperar(self, 500);
                        }
                    };
                };
            });
        },

        /* ── Final: la radio a todo volumen y los personajes cantan ── */

        escenaFinal: async function () {
            var self = this, L = this.L, R = L.radio;
            this.fiesta = true; this.dedo = null;
            this.nivelV = 3; this.pintarSala();
            var ids = this.reunidos.filter(function (id, i, a) { return a.indexOf(id) === i; }).slice(0, 6);
            if (!ids.length) ids = ['tambor', 'campana', 'maracas'];
            this.avatares.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.avatares = [];
            await esperar(this, 700);
            // Salen del altavoz uno por uno y bailan sobre la radio.
            ids.forEach(function (id, i) {
                var x = R.x0 + R.w * (0.18 + 0.64 * (i / Math.max(1, ids.length - 1 || 1))), y = R.y0 - 58 * L.k;
                var av = self.crearAvatar(id, 0, 1);
                av.cont.setPosition(L.altavoz.x, L.altavoz.y).setScale(0.1).setAlpha(0);
                self.avatares.push(av);
                self.tweens.add({ targets: av.cont, x: x, y: y, scale: 1.25, alpha: 1, duration: 700, delay: i * 260, ease: 'Back.easeOut' });
            });
            await esperar(this, 700 + ids.length * 260);
            for (var v = 0; v < 2; v++) {
                for (var k = 0; k < this.avatares.length; k++) {
                    if (!this.sigue()) return;
                    var a = this.avatares[k];
                    this.tweens.add({ targets: a.cont, y: a.cont.y - 34, duration: 170, yoyo: true });
                    this.fuego(a.cont.x, L.H * (0.1 + Math.random() * 0.1), k);
                    await this.sonar(a.id, { breve: true, bocina: false });
                }
            }
            Ut.confeti(this, 100);
            await esperar(this, 1600);
        },

        fuego: function (x, y, k) {
            var cols = [0xff6b6b, 0xfab005, 0x69db7c, 0x4dabf7, 0xcc5de8];
            K.ruido({ f: 2400, q: 0.6, dur: 0.3, vol: 0.08 });
            Ut.estallido(this, x, y, { n: 20, tex: 'chispa', tam: 22, dist: 130, depth: 52, colores: [cols[k % 5], 0xffffff, cols[(k + 2) % 5]], ms: 1000, gravedad: 50 });
        },

        estadoExtra: function () {
            return {
                song: this.song, prog: this.prog, completa: !!this.completa, agu: +this.agu.toFixed(3), senal: +this.senal.toFixed(2), hold: +this.holdT.toFixed(2),
                est: this.estaciones.map(function (e) { return { id: e.id, pos: +e.pos.toFixed(3), estado: e.estado }; }), dial: this.L.dial
            };
        },

        /* ── Cada cuadro ── */

        paso: function (time, delta) {
            var L = this.L, s = time / 1000, dt = Math.min(0.05, (delta || 16) / 1000), self = this;
            if (!L || !this.vivoG || !this.vivoG.active) return;
            var jugando = this.fase === 'jugar' || this.fase === 'demo';
            // Aguja con inercia suave; imán cerca de una emisora.
            var antes = this.agu;
            this.agu += (this.objAgu - this.agu) * Math.min(1, dt * 14);
            var mejor = null, dm = 9;
            this.estaciones.forEach(function (e) { var d = Math.abs(self.agu - e.pos); if (d < dm) { dm = d; mejor = e; } e.cool = Math.max(0, e.cool - dt); });
            if (jugando && mejor && dm < 0.028 && mejor.estado !== 'ok') { var f = (1 - dm / 0.028) * dt * 2.2; this.agu += (mejor.pos - this.agu) * f; this.objAgu += (mejor.pos - this.objAgu) * f * 0.6; }
            var vel = Math.abs(this.agu - antes) / Math.max(dt, 0.001);
            // Señal de cada emisora: cae con la distancia (ancho fijo del dial).
            var senal = 0, cerca = null;
            this.estaciones.forEach(function (e) { e.sen = Math.pow(Math.max(0, 1 - Math.abs(self.agu - e.pos) / 0.1), 1.4); if (e.sen > senal) { senal = e.sen; cerca = e; } });
            this.senal += (senal - this.senal) * Math.min(1, dt * 10);
            // Fijar: aguja quieta sobre la emisora (con tolerancia generosa).
            var tol = 0.016;
            if (jugando && !this.completa && cerca && cerca.estado !== 'ok' && cerca.cool <= 0 && Math.abs(this.agu - cerca.pos) < tol && vel < 0.06) {
                this.holdT += dt;
                if (this.holdT >= 0.8) { this.holdT = 0; this.fijar(cerca); }
            } else this.holdT = Math.max(0, this.holdT - dt * 2);
            // Sonido: estática + el sonido de la emisora cuando hay buena señal.
            if (jugando && !(this.ctx.enDemo && this.ctx.enDemo() && !this.dedo)) {
                if (time - this.ultEst > 330) { this.ultEst = time; var vE = 0.05 * Math.pow(1 - this.senal, 1.3); if (vE > 0.002) K.ruido({ f: 1500 + Math.random() * 1500, q: 0.3, dur: 0.3, vol: vE, tipo: 'bandpass' }); }
                if (cerca && senal > 0.42 && cerca.estado !== 'ok' && time - this.ultSonidoT > 2300 && !this.sonando) { this.ultSonidoT = time; this.sonar(cerca.id, { breve: true, bocina: false }); this.ojoPulso = time; }
            }

            // ── Dibujo dinámico ──
            var D = L.dial, R = L.radio, g = this.vivoG; g.clear();
            // Ventana de la sala (según el nivel).
            this.pintarVentana(s, dt);
            // Luz cálida del dial; las emisoras ya fijadas muestran su lámpara en su lugar.
            var ww = D.x1 - D.x0, dy0 = D.y0, dy1 = D.y1;
            g.fillStyle(0xffb347, 0.18 + 0.05 * Math.sin(s * 3)); g.fillRoundedRect(D.x0 - 10, D.y0 - 10, ww + 20, dy1 - dy0 + 20, 10);
            this.estaciones.forEach(function (e) {
                var x = D.x0 + ww * e.pos;
                if (e.estado === 'ok') { g.fillStyle(0xffd43b, 0.35); g.fillCircle(x, dy1 + 22, 18); g.fillStyle(0xffd43b, 1); g.fillCircle(x, dy1 + 22, 9); g.lineStyle(2, 0xffffff, 0.9); g.strokeCircle(x, dy1 + 22, 9); }
                else if (e.estado === 'mal') { g.fillStyle(0xff6b6b, 0.4); g.fillCircle(x, dy1 + 22, 18); g.fillStyle(0xff6b6b, 1); g.fillCircle(x, dy1 + 22, 9); }
            });
            // Aguja con aro de progreso del enfoque.
            var nx = D.x0 + ww * this.agu;
            g.fillStyle(0x000000, 0.22); g.fillRect(nx - 2 + 3, D.y0 - 12 + 3, 6, dy1 - dy0 + 24);
            g.fillStyle(0xe03131, 1); g.fillRoundedRect(nx - 3, D.y0 - 14, 6, dy1 - dy0 + 28, 3);
            g.fillStyle(0xff8787, 1); g.fillRect(nx - 1, D.y0 - 12, 2, dy1 - dy0 + 24);
            if (this.holdT > 0.02) { var pr = Math.min(1, this.holdT / 0.8); g.lineStyle(7, 0x69db7c, 0.95); g.beginPath(); g.arc(nx, (D.y0 + dy1) / 2, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pr); g.strokePath(); g.lineStyle(3, 0xffffff, 0.5); g.strokeCircle(nx, (D.y0 + dy1) / 2, 30); }
            // Flechas que apuntan hacia la emisora que sigue (solo con ayuda).
            if (this.ayuda && jugando && !this.completa && this.song) {
                var obj = this.estaciones.filter(function (q) { return q.id === self.song[self.prog]; })[0];
                if (obj && Math.abs(obj.pos - this.agu) > 0.03) { var dir = obj.pos > this.agu ? 1 : -1; for (var c = 0; c < 3; c++) { var fx = nx + dir * (40 + c * 22 + ((s * 40) % 22)); g.fillStyle(0xffe066, 0.8 - c * 0.2); g.fillTriangle(fx, (D.y0 + dy1) / 2 - 12, fx, (D.y0 + dy1) / 2 + 12, fx + dir * 14, (D.y0 + dy1) / 2); } }
            }
            // Barras de señal bajo la ventana.
            for (var b = 0; b < 8; b++) { var on = this.senal * 8 > b + 0.4; g.fillStyle(on ? (b > 5 ? 0x69db7c : b > 2 ? 0xffd43b : 0xff922b) : 0x3d2208, 1); g.fillRoundedRect(D.x0 + b * 14, dy1 + 44 + (7 - b) * 0, 10, 10 + b * 3, 2); }
            // Bombillas del programa (una por sonido de la canción).
            var n = this.song ? this.song.length : 0;
            for (var i = 0; i < n; i++) {
                var bx = D.x0 + ww - 20 - (n - 1 - i) * 44, by = D.y0 - 28;
                var oro = this.prog > i, esc = this.fase === 'escuchando' && (this.bombillasEsc || 0) > i;
                g.fillStyle(0xffd43b, (oro || esc ? 0.35 : 0.06)); g.fillCircle(bx, by, 22);
                g.fillStyle(oro ? 0x69db7c : esc ? 0xffd43b : 0x6b5a4a, 1); g.fillCircle(bx, by, 11);
                g.fillStyle(0xffffff, oro || esc ? 0.8 : 0.25); g.fillCircle(bx - 3, by - 3, 3.5);
            }
            // Ojo mágico: el abanico verde se cierra con la señal.
            var O = L.ojo, abre = (1 - this.senal) * 1.3 + 0.2 + (this.ojoPulso && time - this.ojoPulso < 300 ? 0.15 : 0);
            g.fillStyle(0x1b2a14, 1); g.fillCircle(O.x, O.y, O.r + 5);
            g.fillStyle(0x69db7c, 0.95); g.beginPath(); g.moveTo(O.x, O.y); g.arc(O.x, O.y, O.r, -Math.PI / 2 - abre, -Math.PI / 2 + abre); g.closePath(); g.fillPath();
            g.fillStyle(0xb2f2bb, 0.9); g.fillCircle(O.x, O.y, 5); g.lineStyle(2, 0xffffff, 0.3); g.strokeCircle(O.x, O.y, O.r + 5);
            g.fillStyle(0x69db7c, 0.1 + 0.16 * this.senal); g.fillCircle(O.x, O.y, O.r + 18);
            // Osciloscopio: ruido cuando la señal es débil y onda limpia cuando es fuerte.
            var OS = { x: R.x0 + R.w * 0.2, y: R.y0 + R.h * 0.3, w: R.w * 0.26, h: R.h * 0.15 };
            g.fillStyle(0x0b1a10, 1); g.fillRoundedRect(OS.x - OS.w / 2, OS.y - OS.h / 2, OS.w, OS.h, 8);
            g.lineStyle(2, 0x2fa65a, 0.25); g.lineBetween(OS.x - OS.w / 2 + 6, OS.y, OS.x + OS.w / 2 - 6, OS.y);
            g.lineStyle(3, 0x7cff9a, 0.95); g.beginPath();
            for (var q = 0; q <= 40; q++) { var u = q / 40, xx = OS.x - OS.w / 2 + 8 + u * (OS.w - 16), ruido = (Math.random() - 0.5) * (1 - this.senal) * OS.h * 0.9, onda = Math.sin(u * 14 + s * 9) * this.senal * OS.h * 0.36 * (this.sonando ? 1.2 : 1); var yy = OS.y + ruido + onda; if (!q) g.moveTo(xx, yy); else g.lineTo(xx, yy); }
            g.strokePath();
            // Altavoz que vibra con el sonido.
            if (this.sonando) { var A = L.altavoz; g.lineStyle(4, 0xffffff, 0.14 + 0.1 * Math.sin(s * 30)); g.strokeEllipse(A.x, A.y, A.rx * 2 * (1 + 0.03 * Math.sin(s * 30)), A.ry * 2 * (1 + 0.03 * Math.sin(s * 30))); }
            // Perilla: gira con la aguja.
            this.pintarPerilla(g, L.perilla.x, L.perilla.y, L.perilla.r, this.agu * Math.PI * 7);
            // Anillos de las emisoras recién fijadas.
            this.efectos = (this.efectos || []).filter(function (e) { return time - e.t0 < 900; });
            this.efectos.forEach(function (e) { var f = (time - e.t0) / 900, x = D.x0 + ww * e.pos; g.lineStyle(4 * (1 - f) + 1, e.col, 0.8 * (1 - f)); g.strokeCircle(x, (D.y0 + dy1) / 2, 14 + f * 60); });
            // Resplandor general de la radio al sonar.
            if (this.sonando || this.fiesta) { var lz = this.luzG; lz.clear(); lz.fillStyle(0xfff3bf, 0.05 + 0.04 * Math.sin(s * 14)); lz.fillEllipse(R.x0 + R.w / 2, R.y0 + R.h / 2, R.w * 1.2, R.h * 1.3); }
            else this.luzG.clear();
            // Sacudida de la radio cuando una emisora no toca.
            this.radioG.x = this.sacudida && time - this.sacudida < 300 ? Math.sin(time / 18) * 4 : 0;
        },

        /** La ventana cambia con el nivel: atardecer, lluvia, nieve y noche de estrellas. */
        pintarVentana: function (s, dt) {
            var V = this.ventana, g = this.ventanaG, tipo = VENTANAS[this.nivelV % 4];
            if (!V || !g || !g.active) return;
            g.clear();
            var cieloArr = { atardecer: [0xff9a5c, 0xffd9a0], lluvia: [0x4a5b73, 0x7d8ea3], nieve: [0x9fb4d1, 0xe3ecf7], estrellas: [0x0a1030, 0x28397a] }[tipo];
            for (var b = 0; b < 10; b++) { g.fillStyle(mezcla(cieloArr[0], cieloArr[1], b / 9), 1); g.fillRect(V.x, V.y + (V.h / 10) * b, V.w, V.h / 10 + 1); }
            if (tipo === 'atardecer') { g.fillStyle(0xfff3bf, 0.4); g.fillCircle(V.x + V.w * 0.7, V.y + V.h * 0.75, 40); g.fillStyle(0xff6d3a, 1); g.fillCircle(V.x + V.w * 0.7, V.y + V.h * 0.75, 24); for (var p = 0; p < 2; p++) { var bx = V.x + ((s * 14 + p * 70) % (V.w + 30)) - 15, by = V.y + V.h * (0.25 + p * 0.1); g.lineStyle(2, 0x343a40, 0.8); g.beginPath(); g.moveTo(bx - 8, by); g.lineTo(bx, by + 4); g.lineTo(bx + 8, by); g.strokePath(); } }
            if (tipo === 'lluvia') { g.lineStyle(2, 0xcfe3f5, 0.7); for (var r = 0; r < 18; r++) { var rx = V.x + ((r * 41) % V.w), ry = V.y + ((s * 220 + r * 53) % V.h); g.lineBetween(rx, ry, rx - 4, ry + 14); } if (Math.sin(s * 0.9) > 0.97) { g.fillStyle(0xffffff, 0.35); g.fillRect(V.x, V.y, V.w, V.h); } }
            if (tipo === 'nieve') { g.fillStyle(0xffffff, 0.95); for (var n = 0; n < 24; n++) g.fillCircle(V.x + ((n * 37 + Math.sin(s + n) * 8) % V.w + V.w) % V.w, V.y + ((s * (24 + n % 5 * 6) + n * 29) % V.h), 2 + n % 3 * 0.6); g.fillStyle(0xffffff, 1); g.fillEllipse(V.x + V.w / 2, V.y + V.h + 2, V.w * 1.1, 36); }
            if (tipo === 'estrellas') { for (var e = 0; e < 26; e++) { g.fillStyle(0xffffff, 0.3 + 0.7 * Math.abs(Math.sin(s * 1.3 + e * 2.1))); g.fillCircle(V.x + (e * 53) % V.w, V.y + (e * 37) % (V.h * 0.8), 1 + e % 3 * 0.5); } g.fillStyle(0xf1f3f5, 1); g.fillCircle(V.x + V.w * 0.3, V.y + V.h * 0.3, 14); g.fillStyle(0x2f9e44, 0.12); g.fillEllipse(V.x + V.w / 2, V.y + V.h * 0.4, V.w * 1.1, 30); }
            // Silueta de casas lejanas y marco.
            g.fillStyle(0x000000, 0.35); for (var h = 0; h < 4; h++) { var hx = V.x + 10 + h * (V.w / 4), hh = 24 + (h * 13) % 22; g.fillRect(hx, V.y + V.h - hh, V.w / 5, hh); g.fillTriangle(hx - 3, V.y + V.h - hh, hx + V.w / 5 + 3, V.y + V.h - hh, hx + V.w / 10, V.y + V.h - hh - 12); }
            g.lineStyle(6, 0x5c3312, 1); g.lineBetween(V.x + V.w / 2, V.y, V.x + V.w / 2, V.y + V.h); g.lineBetween(V.x, V.y + V.h / 2, V.x + V.w, V.y + V.h / 2);
        }
    };

    K.crear({ id: 'radio', fondo: '#6b4a2f', escena: escena });
})(typeof window !== 'undefined' ? window : this);
