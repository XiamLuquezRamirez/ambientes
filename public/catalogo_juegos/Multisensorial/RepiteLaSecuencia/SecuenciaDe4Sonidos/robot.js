/**
 * «Robot programado» — motor propio de Secuencia de 4 Sonidos (5-6 años).
 *
 * El sonido NO es lo que hay que repetir: es una ORDEN. Cada uno de los cuatro sonidos del tablero de
 * órdenes (siempre a la vista, se puede tocar para oírlo) mueve al robot una casilla: arriba, derecha,
 * abajo o izquierda. El programa suena una sola vez (la bocina lo repite) y el niño debe decidir
 * A DÓNDE LLEGARÁ el robot, tocando esa casilla. Después el robot ejecuta el programa de verdad:
 * si acertó, planta la estrella; si no, el recorrido queda marcado para ver dónde se torció y el
 * programa vuelve a sonar.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    // 0 arriba, 1 derecha, 2 abajo, 3 izquierda
    var DIRS = [{ dc: 0, dr: -1, ang: -Math.PI / 2 }, { dc: 1, dr: 0, ang: 0 }, { dc: 0, dr: 1, ang: Math.PI / 2 }, { dc: -1, dr: 0, ang: Math.PI }];
    var COL_DIR = [0x4dabf7, 0x69db7c, 0xff922b, 0xcc5de8];
    var PREFERIDOS = ['tambor', 'campana', 'trompeta', 'maracas', 'carro', 'vaca', 'gallo', 'perro', 'tren', 'pato'];
    // cuadrícula y número de órdenes por nivel
    var NIV = [{ cols: 4, rows: 3, n: 2 }, { cols: 4, rows: 4, n: 3 }, { cols: 5, rows: 4, n: 3 }, { cols: 5, rows: 5, n: 4 }];

    function flecha(g, ang, s, color) {
        var base = [[-1, -0.28], [0.1, -0.28], [0.1, -0.62], [1, 0], [0.1, 0.62], [0.1, 0.28], [-1, 0.28]];
        var ca = Math.cos(ang), sa = Math.sin(ang);
        var pts = base.map(function (p) { return { x: (p[0] * ca - p[1] * sa) * s, y: (p[0] * sa + p[1] * ca) * s }; });
        g.fillStyle(color, 1);
        g.fillPoints(pts, true);
    }

    var escena = {
        iniciar: function () {
            this.tabObjs = [];
            this.cartas = [];
            this.mapa = null;
            this.robot = null;
            this.rastro = [];
            this.reunidos = [];
            this.engr = 0;
        },

        /** Elige una vez por partida qué sonido manda cada dirección. */
        elegirMapa: function () {
            var self = this;
            var hay = Object.keys(this.config.elementos || {}).filter(function (id) { return self.textures.exists('el_' + id); });
            var bien = PREFERIDOS.filter(function (id) { return hay.indexOf(id) >= 0; });
            var pool = Ut.mezclar(bien.length >= 4 ? bien : hay);
            return pool.slice(0, 4);
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.cartaW = Math.max(120, Math.min(170, W * 0.12));
            L.zona = { x0: 108, x1: L.der - L.cartaW - 28, y0: 96, y1: H - 22 };
            L.bocina = { x: 48, y: Math.round(H * 0.2), r: Math.max(24, Math.min(32, H * 0.045)) };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            if (!this.mapa) this.mapa = this.elegirMapa();
            var g = keep(this.add.graphics().setDepth(1));
            // Espacio exterior visto por el ventanal de la estación.
            var bandas = 18;
            for (var b = 0; b < bandas; b++) {
                var t = b / (bandas - 1);
                var c = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(0x040616), Phaser.Display.Color.ValueToColor(0x2a1a5e), 100, t * 100);
                g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
                g.fillRect(0, (L.H / bandas) * b, L.W, L.H / bandas + 1);
            }
            // Nebulosas.
            [[0.22, 0.32, 250, 0x7048e8, 0.12], [0.78, 0.5, 300, 0xe64980, 0.09], [0.5, 0.16, 220, 0x15aabf, 0.08], [0.92, 0.86, 260, 0x7048e8, 0.12], [0.35, 0.72, 200, 0x15aabf, 0.07]].forEach(function (n) {
                g.fillStyle(n[3], n[4]); g.fillCircle(L.W * n[0], L.H * n[1], n[2]);
                g.fillStyle(n[3], n[4]); g.fillCircle(L.W * n[0] + n[2] * 0.25, L.H * n[1] - n[2] * 0.2, n[2] * 0.62);
            });
            // Planeta gigante con anillos (asoma abajo a la izquierda).
            var px = L.W * 0.06, py = L.H * 0.84, pr = Math.min(L.H * 0.27, 210);
            var anillo = function (desde, hasta, ancho, col, alfa) {
                g.lineStyle(ancho, col, alfa); g.beginPath();
                for (var a = desde; a <= hasta; a += 0.06) { var ax = px + Math.cos(a) * pr * 1.75, ay = py + Math.sin(a) * pr * 0.42 - pr * 0.1; if (a === desde) g.moveTo(ax, ay); else g.lineTo(ax, ay); }
                g.strokePath();
            };
            anillo(Math.PI, Math.PI * 2, pr * 0.14, 0xffd8a8, 0.55);   // mitad de atrás
            g.fillStyle(0xf08c00, 1); g.fillCircle(px, py, pr);
            g.fillStyle(0xffa94d, 0.55); g.fillCircle(px - pr * 0.18, py - pr * 0.2, pr * 0.72);
            [-0.45, -0.2, 0.08, 0.32].forEach(function (k, i) {
                g.lineStyle(pr * 0.1, i % 2 ? 0xd9480f : 0xffe8cc, 0.35); g.beginPath();
                for (var a = 0; a <= 1.0001; a += 0.05) { var ang = Math.PI * (0.12 + a * 0.76); var ax = px + Math.cos(ang) * pr * 0.96 * Math.sqrt(Math.max(0, 1 - k * k)) * -1 + pr * 0.0, ay = py + k * pr; if (a === 0) g.moveTo(px - pr * Math.sqrt(1 - k * k) * 0.97, ay); else g.lineTo(px - pr * Math.sqrt(1 - k * k) * 0.97 + (a * 2 * pr * Math.sqrt(1 - k * k) * 0.97), ay); }
                g.strokePath();
            });
            anillo(0, Math.PI, pr * 0.14, 0xffd8a8, 0.8);               // mitad de adelante
            // Planeta pequeño con cráteres y su satélite (arriba a la derecha).
            this.planeta = { x: L.W * 0.52, y: L.H * 0.17, r: Math.max(22, Math.min(36, L.H * 0.05)) };
            var P = this.planeta;
            g.fillStyle(0x15aabf, 1); g.fillCircle(P.x, P.y, P.r);
            g.fillStyle(0x66d9e8, 0.5); g.fillCircle(P.x - P.r * 0.2, P.y - P.r * 0.25, P.r * 0.7);
            g.fillStyle(0x0b7285, 0.7); g.fillCircle(P.x + P.r * 0.3, P.y + P.r * 0.25, P.r * 0.22); g.fillCircle(P.x - P.r * 0.35, P.y + P.r * 0.4, P.r * 0.14);
            // Marco del ventanal: vigas, remaches y cubierta con franjas de aviso.
            g.fillStyle(0x151d33, 1); g.fillRect(0, 0, L.W, 14); g.fillRect(0, 0, 12, L.H); g.fillRect(L.W - 12, 0, 12, L.H);
            g.fillStyle(0x4dd4ff, 0.7); g.fillRect(0, 14, L.W, 2);
            g.fillStyle(0x4dd4ff, 0.4); g.fillRect(12, 0, 2, L.H); g.fillRect(L.W - 14, 0, 2, L.H);
            g.fillStyle(0x8294b4, 1);
            for (var rx = 30; rx < L.W; rx += 90) g.fillCircle(rx, 7, 3);
            g.fillStyle(0x0d1428, 1); g.fillRect(0, L.H - 22, L.W, 22);
            g.fillStyle(0xffd43b, 0.85);
            for (var h = 0; h < L.W; h += 44) g.fillTriangle(h, L.H, h + 22, L.H, h + 11, L.H - 12);
            g.fillStyle(0x4dd4ff, 0.6); g.fillRect(0, L.H - 24, L.W, 2);
            this.fondoG = keep(this.add.graphics().setDepth(2));   // engranajes y luces que se mueven
            this.montarHud(keep);
            this.sembrarMotes(keep, 14, { x: 0, y: 60, w: L.W, h: L.H - 100, depth: 8 }, 0x74c0fc);
            this.construirCartas(keep);
            if (this.nv && this.nv.grid) { this.construirTablero(this.nv, true); }
        },

        /* ── Tablero de órdenes (a la derecha) ── */

        construirCartas: function (keep) {
            var self = this, L = this.L;
            var n = 4, alto = Math.min(118, (L.zona.y1 - L.zona.y0 - 40) / n - 10);
            var x = L.zona.x1 + 14 + L.cartaW / 2;
            var y0 = L.zona.y0 + 34;
            var titulo = keep(this.add.text(x, L.zona.y0 + 4, 'ÓRDENES', { fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#bac8ff' }).setOrigin(0.5, 0).setDepth(12));
            this.cartas = this.mapa.map(function (id, i) {
                var y = y0 + i * (alto + 10) + alto / 2;
                var c = keep(self.add.container(x, y).setDepth(12));
                var fondo = self.add.graphics();
                fondo.fillStyle(0x000000, 0.25); fondo.fillRoundedRect(-L.cartaW / 2 + 3, -alto / 2 + 5, L.cartaW, alto, 16);
                fondo.fillStyle(0xffffff, 1); fondo.fillRoundedRect(-L.cartaW / 2, -alto / 2, L.cartaW, alto, 16);
                fondo.lineStyle(5, COL_DIR[i], 1); fondo.strokeRoundedRect(-L.cartaW / 2, -alto / 2, L.cartaW, alto, 16);
                var brillo = self.add.graphics();
                brillo.fillStyle(0xffe066, 1); brillo.fillRoundedRect(-L.cartaW / 2, -alto / 2, L.cartaW, alto, 16);
                brillo.setAlpha(0);
                var img = self.add.image(-L.cartaW * 0.2, 0, 'el_' + id);
                img.setScale((alto * 0.68) / Math.max(img.width, img.height));
                var fl = self.add.graphics();
                var ff = alto * 0.3;
                fl.setPosition(L.cartaW * 0.26, 0);
                flecha(fl, DIRS[i].ang, ff, COL_DIR[i]);
                c.add([fondo, brillo, img, fl]);
                return { id: id, dir: i, cont: c, brillo: brillo, w: L.cartaW, h: alto, x: x, y: y };
            });
        },

        cartaEn: function (p) {
            return this.cartas.filter(function (c) { return Math.abs(p.x - c.x) < c.w / 2 && Math.abs(p.y - c.y) < c.h / 2; })[0] || null;
        },

        iluminar: function (carta, on) {
            if (!carta || !carta.brillo.active) return;
            this.tweens.killTweensOf(carta.cont);
            carta.brillo.setAlpha(on ? 0.9 : 0);
            this.tweens.add({ targets: carta.cont, scale: on ? 1.08 : 1, duration: 120 });
        },

        oirCarta: async function (carta) {
            if (this.oyendo) return;
            this.oyendo = true;
            this.iluminar(carta, true);
            await this.sonar(carta.id, { breve: true, bocina: false });
            this.iluminar(carta, false);
            this.oyendo = false;
        },

        /* ── Tablero del robot ── */

        celda: function (c, r) {
            var T = this.T;
            return { x: T.x + c * T.cs + T.cs / 2, y: T.y + r * T.cs + T.cs / 2 };
        },

        celdaEn: function (p) {
            var T = this.T;
            if (!T) return null;
            var c = Math.floor((p.x - T.x) / T.cs), r = Math.floor((p.y - T.y) / T.cs);
            if (c < 0 || r < 0 || c >= T.cols || r >= T.rows) return null;
            return { c: c, r: r };
        },

        limpiarTablero: function () {
            this.tabObjs.forEach(function (o) { if (o && o.active) o.destroy(); });
            this.tabObjs = [];
            this.robot = null;
            this.rastro = [];
        },

        construirTablero: function (nv, reubicar) {
            var self = this, L = this.L, Z = L.zona;
            this.limpiarTablero();
            var cols = nv.grid.cols, rows = nv.grid.rows;
            var cs = Math.floor(Math.min((Z.x1 - Z.x0) / cols, (Z.y1 - Z.y0) / rows, 150));
            var T = this.T = { cols: cols, rows: rows, cs: cs, x: Math.round(Z.x0 + (Z.x1 - Z.x0 - cs * cols) / 2), y: Math.round(Z.y0 + (Z.y1 - Z.y0 - cs * rows) / 2) };
            var add = function (o) { self.tabObjs.push(o); return o; };
            var g = add(this.add.graphics().setDepth(10));
            var W2 = cs * cols, H2 = cs * rows;
            g.fillStyle(0x4dd4ff, 0.10); g.fillRoundedRect(T.x - 22, T.y - 22, W2 + 44, H2 + 44, 30);
            g.fillStyle(0x4dd4ff, 0.12); g.fillRoundedRect(T.x - 16, T.y - 16, W2 + 32, H2 + 32, 26);
            g.fillStyle(0x1b2740, 1); g.fillRoundedRect(T.x - 10, T.y - 10, W2 + 20, H2 + 20, 22);
            g.lineStyle(3, 0x4dd4ff, 0.85); g.strokeRoundedRect(T.x - 10, T.y - 10, W2 + 20, H2 + 20, 22);
            g.fillStyle(0x8294b4, 1);
            [[-4, -4], [W2 + 4, -4], [-4, H2 + 4], [W2 + 4, H2 + 4]].forEach(function (q) { g.fillCircle(T.x + q[0], T.y + q[1], 3.5); });
            for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
                var tx = T.x + c * cs + 2, ty = T.y + r * cs + 2;
                g.fillStyle((c + r) % 2 ? 0x44587a : 0x3a4d6d, 1);
                g.fillRoundedRect(tx, ty, cs - 4, cs - 4, 10);
                g.fillStyle(0xffffff, 0.07); g.fillRoundedRect(tx + 3, ty + 3, cs - 10, (cs - 4) * 0.42, 8);
                g.lineStyle(2, 0x4dd4ff, 0.45); g.strokeRoundedRect(tx + 1, ty + 1, cs - 6, cs - 6, 9);
                g.fillStyle(0x8294b4, 0.8);
                g.fillCircle(tx + 9, ty + 9, 2); g.fillCircle(tx + cs - 13, ty + 9, 2); g.fillCircle(tx + 9, ty + cs - 13, 2); g.fillCircle(tx + cs - 13, ty + cs - 13, 2);
            }
            // Base de salida (plataforma de lanzamiento).
            var s0 = this.celda(nv.inicio.c, nv.inicio.r);
            g.fillStyle(0x4dd4ff, 0.25); g.fillCircle(s0.x, s0.y + cs * 0.22, cs * 0.4);
            g.fillStyle(0x1c7ed6, 0.95); g.fillCircle(s0.x, s0.y + cs * 0.22, cs * 0.34);
            g.fillStyle(0x74c0fc, 1); g.fillCircle(s0.x, s0.y + cs * 0.22, cs * 0.26);
            g.lineStyle(3, 0xffffff, 0.8); g.strokeCircle(s0.x, s0.y + cs * 0.22, cs * 0.18);
            this.marcasG = add(this.add.graphics().setDepth(11));   // pisadas, casilla elegida
            this.robot = this.crearRobot(cs);
            add(this.robot.cont);
            this.robot.cont.setPosition(s0.x, s0.y);
            this.robot.cont.setDepth(30);
            this.robot.pos = { c: nv.inicio.c, r: nv.inicio.r };
            this.mirar(1);
            if (!reubicar) this.robot.cont.setAlpha(0);
        },

        crearRobot: function (cs) {
            var s = cs * 0.95;
            var cont = this.add.container(0, 0);
            var g = this.add.graphics();
            g.fillStyle(0x000000, 0.22); g.fillEllipse(0, s * 0.4, s * 0.62, s * 0.14);
            g.fillStyle(0x343a40, 1); g.fillRoundedRect(-s * 0.3, s * 0.2, s * 0.6, s * 0.17, s * 0.08);
            g.fillStyle(0xadb5bd, 1); g.fillRoundedRect(-s * 0.26, -s * 0.08, s * 0.52, s * 0.34, s * 0.08);
            g.fillStyle(0x4dabf7, 1); g.fillRoundedRect(-s * 0.14, 0, s * 0.28, s * 0.14, s * 0.04);
            g.fillStyle(0xe9ecef, 1); g.fillRoundedRect(-s * 0.25, -s * 0.38, s * 0.5, s * 0.31, s * 0.09);
            g.lineStyle(3, 0x868e96, 1); g.strokeRoundedRect(-s * 0.25, -s * 0.38, s * 0.5, s * 0.31, s * 0.09);
            g.lineBetween(0, -s * 0.38, 0, -s * 0.48);
            g.fillStyle(0xff6b6b, 1); g.fillCircle(0, -s * 0.5, s * 0.055);
            g.fillStyle(0xffffff, 1); g.fillCircle(-s * 0.09, -s * 0.23, s * 0.07); g.fillCircle(s * 0.09, -s * 0.23, s * 0.07);
            var pl = this.add.circle(-s * 0.09, -s * 0.23, s * 0.035, 0x212529);
            var pr = this.add.circle(s * 0.09, -s * 0.23, s * 0.035, 0x212529);
            cont.add([g, pl, pr]);
            return { cont: cont, pl: pl, pr: pr, s: s, pos: null };
        },

        /** Las pupilas miran hacia donde va el robot. */
        mirar: function (dir) {
            var R = this.robot;
            if (!R) return;
            var d = DIRS[dir], k = R.s * 0.03;
            R.pl.setPosition(-R.s * 0.09 + d.dc * k, -R.s * 0.23 + d.dr * k);
            R.pr.setPosition(R.s * 0.09 + d.dc * k, -R.s * 0.23 + d.dr * k);
        },

        dibujarMarcas: function (guess, malo) {
            var g = this.marcasG, T = this.T;
            if (!g || !g.active) return;
            g.clear();
            this.rastro.forEach(function (q, i) {
                var p = this.celda(q.c, q.r);
                g.fillStyle(0xffffff, 0.55); g.fillCircle(p.x, p.y + T.cs * 0.28, T.cs * 0.1);
                g.fillStyle(COL_DIR[q.dir], 0.9); g.fillCircle(p.x, p.y + T.cs * 0.28, T.cs * 0.06);
            }, this);
            if (guess) {
                var p = this.celda(guess.c, guess.r);
                g.lineStyle(6, malo ? 0xff6b6b : 0xffd43b, 1);
                g.strokeRoundedRect(T.x + guess.c * T.cs + 4, T.y + guess.r * T.cs + 4, T.cs - 8, T.cs - 8, 10);
                if (malo) { g.lineBetween(p.x - T.cs * 0.25, p.y - T.cs * 0.25, p.x + T.cs * 0.25, p.y + T.cs * 0.25); g.lineBetween(p.x + T.cs * 0.25, p.y - T.cs * 0.25, p.x - T.cs * 0.25, p.y + T.cs * 0.25); }
            }
        },

        /* ── Niveles ── */

        generarNivel: function (i) {
            var d = NIV[Math.min(i, NIV.length - 1)];
            var mapa = this.mapa;
            var nv, tries = 0;
            do {
                var pos = { c: (Math.random() * d.cols) | 0, r: (Math.random() * d.rows) | 0 };
                var ini = { c: pos.c, r: pos.r }, pasos = [], prev = -1;
                for (var k = 0; k < d.n; k++) {
                    var ok = [0, 1, 2, 3].filter(function (q) {
                        var nc = pos.c + DIRS[q].dc, nr = pos.r + DIRS[q].dr;
                        return nc >= 0 && nr >= 0 && nc < d.cols && nr < d.rows && (prev < 0 || q !== (prev + 2) % 4);
                    });
                    if (!ok.length) break;
                    var q = ok[(Math.random() * ok.length) | 0];
                    pasos.push(q); pos = { c: pos.c + DIRS[q].dc, r: pos.r + DIRS[q].dr }; prev = q;
                }
                nv = { ini: ini, pasos: pasos, fin: pos };
                tries++;
            } while ((pasos.length < d.n || (pos.c === ini.c && pos.r === ini.r)) && tries < 80);
            var ids = nv.pasos.map(function (q) { return mapa[q]; });
            return {
                tipo: 'secuencia', reproducciones: [ids], opciones: mapa.slice(), correctas: ids.slice(), meta: 1, preguntas: [],
                grid: { cols: d.cols, rows: d.rows }, inicio: nv.ini, pasos: nv.pasos, fin: nv.fin
            };
        },

        planNiveles: function () {
            var self = this;
            return [0, 1, 2, 3].map(function (i) { return self.generarNivel(i); });
        },

        nivelDemo: function () {
            var nv = this.generarNivel(0);
            nv.demo = true;
            return nv;
        },

        preguntar: function () {
            if (this.nv.demo || this.nivelActual > 0) return Promise.resolve();
            return this.ctx.decir({ voz: 'zeus', texto: '¿A dónde llegará el robot?' }, { minMs: 800 });
        },

        prepararNivel: async function (i, nv) {
            this.construirTablero(nv, false);
            this.dibujarMarcas();
            var R = this.robot;
            await tw(this, { targets: R.cont, alpha: 1, duration: 400 });
            K.ruido({ f: 1400, q: 1, dur: 0.08, vol: 0.05 });
            await this.saltarA(R.cont, R.cont.x, R.cont.y, { alto: this.T.cs * 0.3, ms: 380 });
        },

        alTerminarNivel: async function () {
            if (!this.robot) return;
            await tw(this, { targets: this.tabObjs.filter(function (o) { return o && o.active; }), alpha: 0, duration: 350 });
            this.limpiarTablero();
        },

        /* ── Jugar ── */

        alTocar: async function (p) {
            if (this.fase !== 'jugar' || this.sonando) return;
            var carta = this.cartaEn(p);
            if (carta) { this.pista.reiniciar(); await this.oirCarta(carta); return; }
            var c = this.celdaEn(p);
            if (!c) return;
            this.pista.reiniciar();
            await this.adivinar(c);
        },

        /** El robot ejecuta el programa de verdad, casilla a casilla, con el sonido de cada orden. */
        recorrer: async function (nv) {
            var R = this.robot;
            var self = this;
            for (var k = 0; k < nv.pasos.length; k++) {
                if (!this.sigue()) return;
                var q = nv.pasos[k], d = DIRS[q];
                var carta = this.cartas[q];
                this.iluminar(carta, true);
                this.mirar(q);
                var suena = this.sonar(nv.correctas[k], { breve: true, bocina: false });
                var pos = { c: R.pos.c + d.dc, r: R.pos.r + d.dr };
                var p = this.celda(pos.c, pos.r);
                await this.saltarA(R.cont, p.x, p.y, { alto: this.T.cs * 0.22, ms: 430 });
                R.pos = pos;
                this.rastro.push({ c: pos.c, r: pos.r, dir: q });
                this.dibujarMarcas(this.guess, false);
                await suena;   // el sonido termina antes de pasar a la siguiente orden
                await esperar(this, 250);
                this.iluminar(carta, false);
            }
        },

        adivinar: async function (c) {
            var nv = this.nv;
            this.fase = 'revelando';
            this.pista.parar();
            this.guess = c;
            this.dibujarMarcas(c, false);
            K.tono({ f: 620, dur: 0.08, vol: 0.05 });
            await esperar(this, 350);
            await this.recorrer(nv);
            if (!this.sigue()) return;
            var ok = c.c === nv.fin.c && c.r === nv.fin.r;
            var pf = this.celda(nv.fin.c, nv.fin.r);
            if (ok) {
                this.fase = 'premio';
                await this.acertar([nv.correctas[nv.correctas.length - 1]], pf);
                return;
            }
            this.dibujarMarcas(c, true);
            await this.fallar(nv.correctas[nv.correctas.length - 1], pf);
            if (!this.sigue()) return;
            this.fase = 'jugar';
            await this.repetir();
        },

        alFallar: async function () {
            var R = this.robot;
            this.cameras.main.shake(180, 0.004);
            if (R) this.tweens.add({ targets: R.cont, angle: { from: -8, to: 8 }, duration: 80, yoyo: true, repeat: 3, onComplete: function () { R.cont.angle = 0; } });
            await esperar(this, 1500);
            // Vuelve a la base para escuchar el programa otra vez.
            var s0 = this.celda(this.nv.inicio.c, this.nv.inicio.r);
            this.guess = null;
            this.rastro = [];
            this.dibujarMarcas();
            if (R) { await this.saltarA(R.cont, s0.x, s0.y, { alto: this.T.cs * 0.3, ms: 600 }); R.pos = { c: this.nv.inicio.c, r: this.nv.inicio.r }; this.mirar(1); }
        },

        alAcertar: async function () {
            var nv = this.nv, R = this.robot;
            var pf = this.celda(nv.fin.c, nv.fin.r);
            this.dibujarMarcas(this.guess, false);
            var est = this.add.image(pf.x, pf.y - this.T.cs * 0.55, 'pa:estrella@256').setDisplaySize(this.T.cs * 0.7, this.T.cs * 0.7).setDepth(40).setAlpha(0);
            this.tabObjs.push(est);
            this.reunidos.push(nv.correctas[0]);
            this.tweens.add({ targets: est, alpha: 1, y: pf.y - this.T.cs * 0.75, duration: 400, ease: 'Back.easeOut' });
            if (R) await tw(this, { targets: R.cont, scale: 1.15, duration: 160, yoyo: true, repeat: 3 });
            Ut.estallido(this, pf.x, pf.y, { n: 12, tex: 'estrella', tam: 26, dist: 130, depth: 70, sinTinte: true });
            Ut.confeti(this, 40);
            await esperar(this, 900);
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            if (!this.ayuda || !this.nv.fin) return this.pistaBocina();
            var f = this.celda(this.nv.fin.c, this.nv.fin.r);
            return this.ctx.mano({ punto: f, holdMs: 500, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
        },

        demoPaso: function () {
            var self = this;
            return [function () {
                var f = self.celda(self.nv.fin.c, self.nv.fin.r);
                return { desde: f, hacer: function () { return self.adivinar({ c: self.nv.fin.c, r: self.nv.fin.r }); } };
            }];
        },

        /* ── Final: el robot baila las cuatro órdenes ── */

        escenaFinal: async function () {
            var self = this, L = this.L;
            this.limpiarTablero();
            var cs = Math.min(110, L.H * 0.16);
            var cx = Math.round((L.zona.x0 + L.zona.x1) / 2), cy = Math.round(L.H * 0.5);
            var robot = this.crearRobot(cs);
            robot.cont.setPosition(cx, cy).setDepth(30).setAlpha(0).setScale(1.5);
            this.tabObjs.push(robot.cont);
            this.robot = robot;
            await tw(this, { targets: robot.cont, alpha: 1, duration: 400 });
            var tray = [[0, -1], [1, 0], [0, 1], [-1, 0]];
            for (var k = 0; k < 4; k++) {
                if (!this.sigue()) return;
                this.iluminar(this.cartas[k], true);
                this.mirar(k);
                var suenaF = this.sonar(this.mapa[k], { breve: true, bocina: false });
                await this.saltarA(robot.cont, robot.cont.x + tray[k][0] * cs * 1.1, robot.cont.y + tray[k][1] * cs * 1.1, { alto: cs * 0.4, ms: 480 });
                Ut.estallido(this, robot.cont.x, robot.cont.y, { n: 8, tex: 'estrella', tam: 24, dist: 100, depth: 70, sinTinte: true });
                await suenaF;
                await esperar(this, 200);
                this.iluminar(this.cartas[k], false);
            }
            Ut.confeti(this, 100);
            for (var b = 0; b < 3; b++) { await tw(this, { targets: robot.cont, y: robot.cont.y - cs * 0.5, angle: b % 2 ? 10 : -10, duration: 200, yoyo: true }); }
            robot.cont.angle = 0;
            await esperar(this, 900);
        },

        estadoExtra: function () {
            var nv = this.nv || {};
            return {
                inicio: nv.inicio, fin: nv.fin, pasos: nv.pasos, grid: nv.grid, mapa: this.mapa,
                robot: this.robot && this.robot.pos, T: this.T && { x: this.T.x, y: this.T.y, cs: this.T.cs }
            };
        },

        paso: function (time, delta) {
            var g = this.fondoG, L = this.L;
            if (!g || !g.active) return;
            g.clear();
            var s = time / 1000;
            // Estrellas que titilan.
            for (var i = 0; i < 70; i++) {
                var x = (i * 977 + 131) % L.W, y = 20 + (i * 613) % (L.H - 60);
                g.fillStyle(0xffffff, 0.25 + 0.6 * Math.abs(Math.sin(s * 1.3 + i * 1.7)));
                g.fillCircle(x, y, 1 + (i % 4) * 0.45);
            }
            // Asteroides a la deriva.
            for (var a = 0; a < 5; a++) {
                var v = 14 + a * 6, ax = ((s * v + a * 311) % (L.W + 200)) - 100, ay = L.H * (0.12 + a * 0.17), r = 9 + (a % 3) * 6;
                g.fillStyle(0x5c677d, 1); g.fillCircle(ax, ay, r); g.fillStyle(0x7d8aa3, 1); g.fillCircle(ax - r * 0.25, ay - r * 0.25, r * 0.55);
                g.fillStyle(0x3d4659, 1); g.fillCircle(ax + r * 0.35, ay + r * 0.2, r * 0.22);
            }
            // Satélite que orbita el planeta pequeño.
            var P = this.planeta;
            if (P) {
                var ang = s * 0.7, sx = P.x + Math.cos(ang) * P.r * 2.1, sy = P.y + Math.sin(ang) * P.r * 0.8;
                g.lineStyle(1, 0xffffff, 0.15); g.strokeEllipse(P.x, P.y, P.r * 4.2, P.r * 1.6);
                g.fillStyle(0xdee2e6, 1); g.fillRect(sx - 5, sy - 3, 10, 6);
                g.fillStyle(0x4dabf7, 1); g.fillRect(sx - 16, sy - 2, 9, 4); g.fillRect(sx + 7, sy - 2, 9, 4);
                g.fillStyle(0xff6b6b, Math.sin(s * 6) > 0 ? 1 : 0.2); g.fillCircle(sx, sy - 5, 1.8);
            }
            // Estrella fugaz cada pocos segundos.
            var ciclo = (time % 6500) / 1000;
            if (ciclo < 1.1) {
                var f = ciclo / 1.1, hx = L.W * 0.95 - f * L.W * 0.55, hy = 40 + f * L.H * 0.3;
                g.lineStyle(3, 0xffffff, 0.9 * (1 - f)); g.lineBetween(hx, hy, hx + 90, hy - 36);
                g.lineStyle(2, 0x74c0fc, 0.6 * (1 - f)); g.lineBetween(hx + 90, hy - 36, hx + 190, hy - 76);
                g.fillStyle(0xffffff, 1 - f); g.fillCircle(hx, hy, 3.5);
            }
            // Propulsores bajo la plataforma flotante.
            var T = this.T;
            if (T) {
                var yb = T.y + T.cs * T.rows + 10;
                [T.x + T.cs * 0.55, T.x + T.cs * T.cols - T.cs * 0.55].forEach(function (fx, k) {
                    var alto = 34 + 12 * Math.sin(s * 22 + k * 2) + 8 * Math.sin(s * 37);
                    g.fillStyle(0x4dd4ff, 0.35); g.fillTriangle(fx - 22, yb, fx + 22, yb, fx, yb + alto * 1.5);
                    g.fillStyle(0xffd43b, 0.85); g.fillTriangle(fx - 14, yb, fx + 14, yb, fx, yb + alto);
                    g.fillStyle(0xffffff, 0.95); g.fillTriangle(fx - 6, yb, fx + 6, yb, fx, yb + alto * 0.55);
                });
            }
            // Luces de estado de la viga (más rápidas mientras el robot se mueve).
            var rapido = this.fase === 'revelando' ? 4 : 1;
            for (var j = 0; j < 6; j++) {
                var on = Math.floor(s * rapido * 1.5 + j) % 3 === 0;
                g.fillStyle(on ? [0xff6b6b, 0x69db7c, 0x4dabf7][j % 3] : 0x2b3a55, 1);
                g.fillCircle(L.W - 200 - j * 22, 7, 4);
            }
        }
    };

    K.crear({ id: 'robot', fondo: '#040616', escena: escena });
})(typeof window !== 'undefined' ? window : this);
