/**
 * «El gran pinball del circo» — motor propio de Secuencia de 3 Sonidos Diferentes (5-6 años).
 *
 * Verbo de juego: REFLEJOS con flippers. Una mesa de pinball de circo con bumpers que son tambores
 * de instrumentos. Se lanza la bola, se tocan las mitades de la pantalla para mover los flippers
 * (izquierda / derecha) y hay que hacer que la bola golpee los bumpers EN EL ORDEN de la canción de
 * sonidos diferentes. Cada golpe correcto enciende una bombilla de la marquesina; un bumper que no
 * sigue la canción apaga la marquesina y la melodía vuelve a empezar. Completar la canción las veces
 * que pide el nivel abre el telón. Si la bola se pierde, sale otra sin castigo.
 *
 * Física real con el motor Matter (bola, bumpers, flippers articulados, plunger).
 * Niveles: más bumpers, distractores y obstáculos que giran.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var C = Phaser.Display.Color;
    var M = global.Phaser && global.Phaser.Physics && global.Phaser.Physics.Matter && global.Phaser.Physics.Matter.Matter;

    var DISP = {
        3: [[0.30, 0.20], [0.70, 0.20], [0.50, 0.62]],
        4: [[0.25, 0.18], [0.75, 0.18], [0.50, 0.46], [0.50, 0.86]],
        5: [[0.20, 0.15], [0.80, 0.15], [0.50, 0.32], [0.27, 0.68], [0.73, 0.68]],
        6: [[0.20, 0.12], [0.50, 0.12], [0.80, 0.12], [0.30, 0.52], [0.70, 0.52], [0.50, 0.90]]
    };
    var COL_B = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xcc5de8, 0xff922b];

    function mezcla(a, b, t) {
        var c = C.Interpolate.ColorWithColor(C.ValueToColor(a), C.ValueToColor(b), 100, Math.max(0, Math.min(1, t)) * 100);
        return C.GetColor(c.r, c.g, c.b);
    }

    var escena = {
        iniciar: function () {
            this.motor = null; this.estaticosF = [];
            this.bumpers = []; this.giratorios = [];
            this.bola = null; this.enLane = true; this.laneT = 0;
            this.flips = [];
            this.ptrs = {};
            this.prog = 0; this.vueltas = 0; this.song = [];
            this.reunidos = [];
            this.ultimoReclamo = -99999;
            this.fiesta = false;
            this.lucesT = 0;
            this.sinMovimiento = 0;
            this.cargaT = 0;
            this.balones = [];
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
            var tw = Math.round(Math.min(L.der * 0.4, 500 * L.k));
            L.mesa = { cx: Math.round(L.der * 0.46), w: tw, y0: Math.round(H * 0.1), y1: Math.round(H * 0.975) };
            L.mesa.x0 = L.mesa.cx - tw / 2; L.mesa.x1 = L.mesa.cx + tw / 2;
            L.lane = Math.round(46 * L.k);
            L.flip = { y: L.mesa.y1 - Math.round(80 * L.k), len: Math.round(96 * L.k), th: Math.round(20 * L.k), gap: Math.round(34 * L.k) };
            L.campo = { x0: L.mesa.x0 + 14, x1: L.mesa.x1 - L.lane - 6, y0: L.mesa.y0 + tw * 0.36, y1: L.flip.y - Math.round(150 * L.k) };
            L.bocina = { x: 48, y: Math.round(H * 0.2), r: 30 };
            L.marq = { x: Math.round(L.mesa.x1 + 70 * L.k), y: Math.round(H * 0.22) };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            this.carpaG = keep(this.add.graphics().setDepth(1));
            this.dinG = keep(this.add.graphics().setDepth(12));
            this.mesaG = keep(this.add.graphics().setDepth(10));
            this.luzG = keep(this.add.graphics().setDepth(40));
            this.input.addPointer(2);
            this.pintarCarpa();
            this.pintarMesa();
            this.montarHud(keep);
            this.sembrarMotes(keep, 8, { x: 0, y: 60, w: L.W, h: L.H - 100, depth: 6 }, 0xfff3bf);
            this.montarFisica();
            if (reubicar && this.nv && this.nv.opciones) this.colocarNivel(this.nv);
        },

        /* ── Carpa de circo ── */

        pintarCarpa: function () {
            var L = this.L, g = this.carpaG;
            g.clear();
            // Fondo de lona con rayas rojas y crema.
            for (var x = 0; x < L.W; x += 80) { g.fillStyle((x / 80) % 2 ? 0xe9d8b4 : 0xc92a2a, 1); g.fillRect(x, 0, 80, L.H); }
            g.fillStyle(0x000000, 0.28); g.fillRect(0, 0, L.W, L.H);
            // Escalón de aserrín y público de siluetas.
            g.fillStyle(0xd9b36b, 1); g.fillRect(0, L.H * 0.93, L.W, L.H * 0.07);
            g.fillStyle(0x000000, 0.35); g.fillRect(0, L.H * 0.93, L.W, 6);
            // Cenefa festoneada de la carpa y banderines.
            for (var s = 0; s < L.W; s += 60) { g.fillStyle(s % 120 ? 0xfab005 : 0xe03131, 1); g.fillTriangle(s, 0, s + 60, 0, s + 30, 52); g.fillStyle(0xffffff, 0.35); g.fillTriangle(s + 6, 0, s + 30, 0, s + 22, 24); }
            g.lineStyle(3, 0x5c3312, 1); g.beginPath(); g.moveTo(0, 74); for (var q = 0; q <= 1.0001; q += 0.05) g.lineTo(q * L.W, 74 + Math.sin(q * Math.PI * 4) * 12); g.strokePath();
            var cols = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xcc5de8];
            for (var b = 0; b < 26; b++) { var qb = b / 25, bx = qb * L.W, by = 74 + Math.sin(qb * Math.PI * 4) * 12; g.fillStyle(cols[b % 5], 1); g.fillTriangle(bx - 12, by, bx + 12, by, bx, by + 30); }
        },

        pintarMesa: function () {
            var L = this.L, g = this.mesaG, Me = L.mesa;
            g.clear();
            var R = Me.w / 2, cy = Me.y0 + R;
            // Sombra y marco dorado de la mesa (con arco superior).
            var perfil = function (grow) {
                var pts = [];
                for (var a = Math.PI; a <= Math.PI * 2 + 0.001; a += 0.08) pts.push({ x: Me.cx + Math.cos(a) * (R + grow), y: cy + Math.sin(a) * (R + grow) });
                pts.push({ x: Me.x1 + grow, y: Me.y1 + grow }); pts.push({ x: Me.x0 - grow, y: Me.y1 + grow });
                return pts;
            };
            g.fillStyle(0x000000, 0.3); g.fillPoints(perfil(18).map(function (p) { return { x: p.x + 8, y: p.y + 10 }; }), true);
            g.fillStyle(0xfab005, 1); g.fillPoints(perfil(14), true);
            g.fillStyle(0x7a4419, 1); g.fillPoints(perfil(8), true);
            // Tapete de la pista: un ring de circo con estrellas.
            g.fillStyle(0x16275a, 1); g.fillPoints(perfil(0), true);
            g.fillStyle(0x203a7a, 1); g.fillCircle(L.campo.x0 + (L.campo.x1 - L.campo.x0) / 2, (L.campo.y0 + L.campo.y1) / 2, (L.campo.x1 - L.campo.x0) * 0.46);
            g.lineStyle(6, 0xfab005, 0.9); g.strokeCircle(L.campo.x0 + (L.campo.x1 - L.campo.x0) / 2, (L.campo.y0 + L.campo.y1) / 2, (L.campo.x1 - L.campo.x0) * 0.46);
            g.lineStyle(3, 0xe03131, 0.8); g.strokeCircle(L.campo.x0 + (L.campo.x1 - L.campo.x0) / 2, (L.campo.y0 + L.campo.y1) / 2, (L.campo.x1 - L.campo.x0) * 0.36);
            g.fillStyle(0xffffff, 0.12);
            for (var e = 0; e < 40; e++) g.fillCircle(Me.x0 + 20 + (e * 97) % (Me.w - 40), Me.y0 + 40 + (e * 61) % (Me.y1 - Me.y0 - 80), 2 + e % 3);
            // Carril del lanzador.
            var lx0 = Me.x1 - L.lane - 4, lx1 = Me.x1 - 2;
            g.fillStyle(0x0d1838, 1); g.fillRect(lx0, Me.y0 + R * 0.4, L.lane + 2, Me.y1 - Me.y0 - R * 0.4);
            g.fillStyle(0xfab005, 0.8); g.fillRect(lx0 - 4, Me.y0 + R * 1.02, 6, Me.y1 - Me.y0 - R * 1.02);
            // Embudos hacia los flippers.
            var F = L.flip, yfl = F.y, cxm = (L.campo.x0 + L.campo.x1) / 2;
            [[L.campo.x0, -1], [L.campo.x1, 1]].forEach(function (h) {
                var px = cxm + h[1] * (F.gap / 2 + F.len);
                g.fillStyle(0x7a4419, 1); g.fillPoints([{ x: h[0], y: yfl - 150 * L.k }, { x: h[0] + h[1] * -10, y: yfl - 150 * L.k + 24 }, { x: px - h[1] * 6, y: yfl + 20 }, { x: px - h[1] * 6, y: yfl - 4 }], true);
            });
            // Cartel del payaso arriba del campo.
            g.fillStyle(0xffffff, 1); g.fillCircle(Me.cx, Me.y0 + R * 0.5, 36 * L.k);
            g.fillStyle(0xffd0a8, 1); g.fillCircle(Me.cx, Me.y0 + R * 0.5, 30 * L.k);
            g.fillStyle(0xe03131, 1); g.fillCircle(Me.cx, Me.y0 + R * 0.5 + 4 * L.k, 8 * L.k); g.fillCircle(Me.cx - 18 * L.k, Me.y0 + R * 0.5 - 4 * L.k, 6 * L.k); g.fillCircle(Me.cx + 18 * L.k, Me.y0 + R * 0.5 - 4 * L.k, 6 * L.k);
            g.fillStyle(0x4dabf7, 1); g.fillTriangle(Me.cx - 30 * L.k, Me.y0 + R * 0.5 - 22 * L.k, Me.cx + 30 * L.k, Me.y0 + R * 0.5 - 22 * L.k, Me.cx, Me.y0 + R * 0.5 - 74 * L.k);
            g.fillStyle(0xfab005, 1); g.fillCircle(Me.cx, Me.y0 + R * 0.5 - 76 * L.k, 8 * L.k);
        },

        /* ── Física ── */

        montarFisica: function () {
            var L = this.L, self = this;
            if (!M) return;
            if (!this.motor) {
                this.motor = M.Engine.create({ gravity: { x: 0, y: 1.35 }, positionIterations: 10, velocityIterations: 8 });
                M.Events.on(this.motor, 'collisionStart', function (ev) { self.alChoque(ev); });
            }
            var mundo = this.motor.world;
            this.estaticosF.forEach(function (b) { M.Composite.remove(mundo, b); });
            this.flips.forEach(function (f) { M.Composite.remove(mundo, f.body); M.Composite.remove(mundo, f.cons); });
            this.estaticosF = []; this.flips = [];
            var Me = L.mesa, R = Me.w / 2, cy = Me.y0 + R;
            var add = function (x, y, w, h, o) { var b = M.Bodies.rectangle(x, y, w, h, Object.assign({ isStatic: true, friction: 0.05, restitution: 0.35 }, o || {})); self.estaticosF.push(b); return b; };
            // Paredes y arco superior (segmentos).
            add(Me.x0 - 15, (Me.y0 + Me.y1) / 2 + 40, 30, Me.y1 - Me.y0 + 80);
            add(Me.x1 + 15, (Me.y0 + Me.y1) / 2 + 40, 30, Me.y1 - Me.y0 + 80);
            var prev = null;
            for (var a = Math.PI; a <= Math.PI * 2 + 0.001; a += 0.12) {
                var p = { x: Me.cx + Math.cos(a) * (R + 14), y: cy + Math.sin(a) * (R + 14) };
                if (prev) { var ang = Math.atan2(p.y - prev.y, p.x - prev.x), len = Math.hypot(p.x - prev.x, p.y - prev.y); add((p.x + prev.x) / 2, (p.y + prev.y) / 2, len + 4, 30, { angle: ang }); }
                prev = p;
            }
            // Divisor del carril del lanzador y suelo del carril.
            var lx = Me.x1 - L.lane - 4;
            var topeDiv = Me.y0 + R * 1.02; add(lx - 3, topeDiv + (Me.y1 - topeDiv) / 2, 8, Me.y1 - topeDiv);
            add((lx + Me.x1) / 2, Me.y1 - 20 * L.k, L.lane, 14);
            // Embudos y "rampas de entrada" a los flippers.
            var F = L.flip, yfl = F.y, cxm = (L.campo.x0 + L.campo.x1) / 2;
            [[L.campo.x0, -1], [L.campo.x1, 1]].forEach(function (h) {
                var px = cxm + h[1] * (F.gap / 2 + F.len), x0 = h[0], y0 = yfl - 150 * L.k, x1 = px - h[1] * 6, y1 = yfl + 8;
                var ang = Math.atan2(y1 - y0, x1 - x0), len = Math.hypot(x1 - x0, y1 - y0);
                add((x0 + x1) / 2, (y0 + y1) / 2, len, 18, { angle: ang, friction: 0.02, restitution: 0.3 });
            });
            M.Composite.add(mundo, this.estaticosF);
            // Flippers: cuerpos dinámicos articulados en un pivote (el de la derecha es el espejo).
            var len = F.len, th = F.th;
            [[-1, cxm - F.gap / 2 - len], [1, cxm + F.gap / 2 + len]].forEach(function (cfg) {
                var lado = cfg[0], px = cfg[1], py = yfl;
                // lado -1: izquierdo (pivote a la izquierda, apunta a la derecha) | lado 1: derecho (pivote a la derecha)
                var cuerpo = M.Bodies.rectangle(px - lado * len / 2, py, len, th, { density: 0.02, friction: 0.15, restitution: 0.2, chamfer: { radius: th / 2 }, frictionAir: 0.01 });
                var reposo = lado === -1 ? 0.5 : -0.5, activo = lado === -1 ? -0.5 : 0.5;
                M.Body.setAngle(cuerpo, reposo);
                M.Body.setPosition(cuerpo, { x: px + Math.cos(reposo) * (-lado * len / 2), y: py + Math.sin(reposo) * (-lado * len / 2) });
                var cons = M.Constraint.create({ bodyA: cuerpo, pointA: { x: lado * len / 2, y: 0 }, pointB: { x: px, y: py }, stiffness: 1, length: 0 });
                M.Composite.add(mundo, [cuerpo, cons]);
                cuerpo.plugin = { flipper: true };
                self.flips.push({ body: cuerpo, cons: cons, lado: lado, px: px, py: py, len: len, th: th, reposo: reposo, activo: activo, on: false });
            });
        },

        /** Bumpers (tambores-instrumento) y obstáculos giratorios según el nivel. */
        colocarNivel: function (nv) {
            var L = this.L, self = this, mundo = this.motor.world, Cm = L.campo;
            this.bumpers.forEach(function (b) { M.Composite.remove(mundo, b.body); if (b.cont.active) b.cont.destroy(); });
            this.giratorios.forEach(function (b) { M.Composite.remove(mundo, b.body); if (b.cont.active) b.cont.destroy(); });
            this.bumpers = []; this.giratorios = [];
            var n = nv.opciones.length;
            var disp = DISP[Math.max(3, Math.min(6, n))].slice(0, n);
            nv.opciones.forEach(function (id, i) {
                var d = disp[i], x = Cm.x0 + (Cm.x1 - Cm.x0) * d[0], y = Cm.y0 + (Cm.y1 - Cm.y0) * d[1], r = Math.round((n >= 5 ? 32 : 38) * L.k);
                var cuerpo = M.Bodies.circle(x, y, r, { isStatic: true, restitution: 1.2, friction: 0 });
                M.Composite.add(mundo, cuerpo);
                var c = self.add.container(x, y).setDepth(14);
                var g = self.add.graphics();
                var col = COL_B[i % 6];
                g.fillStyle(0x000000, 0.22); g.fillCircle(3, 6, r);
                g.fillStyle(0x7a4419, 1); g.fillCircle(0, 0, r);
                g.fillStyle(col, 1); g.fillCircle(0, 0, r - 5);
                g.fillStyle(0xffffff, 0.3); g.fillCircle(-r * 0.3, -r * 0.35, r * 0.34);
                g.lineStyle(3, 0xffffff, 0.8); g.strokeCircle(0, 0, r - 5);
                g.fillStyle(0xfff9db, 1); g.fillCircle(0, 0, r * 0.62);
                g.lineStyle(3, col, 1); g.strokeCircle(0, 0, r * 0.62);
                var halo = self.add.graphics();
                var im = self.add.image(0, 0, 'el_' + id); im.setScale((r * 0.9) / Math.max(im.width, im.height));
                c.add([g, halo, im]);
                var b = { id: id, body: cuerpo, cont: c, halo: halo, r: r, col: col, estado: null, ultimo: 0 };
                cuerpo.plugin = { bumper: b };
                self.bumpers.push(b);
            });
            // Nivel 3-4: aspas giratorias (obstáculo que se mueve y desvía la bola).
            if (this.nivelActual >= 2 && nv.opciones.length >= 5) {
                var gx = (Cm.x0 + Cm.x1) / 2, gy = Cm.y0 + (Cm.y1 - Cm.y0) * 0.5, largo = Math.round(70 * L.k);
                var aspa = M.Bodies.rectangle(gx, gy, largo * 2, 12, { isStatic: true, restitution: 0.9, friction: 0 });
                M.Composite.add(mundo, aspa);
                var cc = this.add.container(gx, gy).setDepth(13);
                var ag = this.add.graphics();
                ag.fillStyle(0xe03131, 1); ag.fillRoundedRect(-largo, -6, largo * 2, 12, 6); ag.fillStyle(0xffffff, 1); ag.fillCircle(0, 0, 10);
                ag.fillStyle(0xffffff, 0.8); for (var k2 = -largo + 14; k2 < largo - 8; k2 += 28) ag.fillRect(k2, -3, 10, 6);
                cc.add(ag);
                this.giratorios.push({ body: aspa, cont: cc, ang: 0, w: 1.1 });
            }
        },

        /** La bola espera en el carril del lanzador hasta que se toca para lanzarla. */
        crearBola: function () {
            var L = this.L, Me = L.mesa;
            this.quitarBola();
            var r = Math.round(14 * L.k);
            var x = Me.x1 - L.lane / 2 - 3, y = Me.y1 - 52 * L.k;
            var cuerpo = M.Bodies.circle(x, y, r, { restitution: 0.4, friction: 0.01, frictionAir: 0.0005, density: 0.0025 });
            M.Composite.add(this.motor.world, cuerpo);
            cuerpo.plugin = { bola: true };
            var c = this.add.container(x, y).setDepth(30);
            var g = this.add.graphics();
            g.fillStyle(0xe9ecef, 1); g.fillCircle(0, 0, r); g.fillStyle(0xadb5bd, 1); g.fillCircle(r * 0.2, r * 0.25, r * 0.7); g.fillStyle(0xffffff, 0.9); g.fillCircle(-r * 0.35, -r * 0.35, r * 0.3);
            g.lineStyle(2, 0x495057, 0.8); g.strokeCircle(0, 0, r);
            c.add(g);
            this.bola = { body: cuerpo, cont: c, r: r, estela: [] };
            this.enLane = true; this.laneT = 0; this.sinMovimiento = 0;
            c.setScale(0.3); this.tweens.add({ targets: c, scale: 1, duration: 260, ease: 'Back.easeOut' });
        },

        quitarBola: function () {
            if (!this.bola) return;
            M.Composite.remove(this.motor.world, this.bola.body);
            if (this.bola.cont.active) this.bola.cont.destroy();
            this.bola = null;
        },

        lanzar: function () {
            if (!this.bola || !this.enLane) return;
            this.enLane = false;
            var fuerza = 26.5 + Math.random() * 1.5;
            M.Body.setVelocity(this.bola.body, { x: 0, y: -fuerza * (0.9 + Math.min(0.25, this.cargaT * 0.25)) });
            this.cargaT = 0;
            K.ruido({ f: 500, q: 0.6, dur: 0.18, vol: 0.1, tipo: 'lowpass' });
            K.tono({ f: 300, f2: 700, dur: 0.18, vol: 0.05 });
            this.plunger = this.time.now;
        },

        /* ── Entrada: mitades de pantalla = flippers; con la bola en el carril, un toque la lanza ── */

        alTocar: function (p) {
            if (this.fase !== 'jugar' && this.fase !== 'demo') return;
            this.ptrs[p.id] = p.x;
            if (this.enLane && this.bola) { this.lanzar(); return; }
            this.pista.reiniciar();
        },
        alMover: function (p) { if (this.ptrs[p.id] != null) this.ptrs[p.id] = p.x; },
        alSoltar: function (p) { if (p) delete this.ptrs[p.id]; else this.ptrs = {}; },

        /* ── Choques ── */

        alChoque: function (ev) {
            var self = this, now = this.time.now;
            ev.pairs.forEach(function (p) {
                var bola = p.bodyA.plugin && p.bodyA.plugin.bola ? p.bodyA : (p.bodyB.plugin && p.bodyB.plugin.bola ? p.bodyB : null);
                if (!bola) return;
                var otro = bola === p.bodyA ? p.bodyB : p.bodyA;
                var b = otro.plugin && otro.plugin.bumper;
                var v = Math.hypot(bola.velocity.x, bola.velocity.y);
                if (b && now - b.ultimo > 260) { b.ultimo = now; self.golpeBumper(b, v); }
                else if (otro.plugin && otro.plugin.flipper && v > 2) K.tono({ f: 280 + Math.random() * 40, dur: 0.04, vol: 0.02 });
            });
        },

        golpeBumper: function (b, v) {
            var self = this;
            this.sonar(b.id, { breve: true, bocina: false });
            this.tweens.add({ targets: b.cont, scale: 1.18, duration: 80, yoyo: true });
            Ut.estallido(this, b.body.position.x, b.body.position.y, { n: 5, tex: 'nota', tam: 22, dist: 80, depth: 70 });
            this.destello = { x: b.body.position.x, y: b.body.position.y, t0: this.time.now, col: b.col };
            if (this.fase !== 'jugar' || this.completa) return;
            var esp = this.song[this.prog], anterior = this.prog > 0 ? this.song[this.prog - 1] : null;
            if (b.id === esp) {
                this.prog += 1;
                this.pintarBumper(b, 'ok');
                this.pista.reiniciar();
                K.tono({ f: 660 + this.prog * 110, f2: 990 + this.prog * 110, dur: 0.2, vol: 0.05 });
                Ut.estallido(this, b.body.position.x, b.body.position.y, { n: 10, tex: 'estrella', tam: 24, dist: 110, depth: 71, sinTinte: true });
                if (this.prog >= this.song.length) {
                    this.vueltas += 1;
                    this.fuego(b.body.position.x, b.body.position.y - 40, this.vueltas);
                    if (this.vueltas >= this.nv.meta) this.llegar();
                    else {
                        this.ctx.decir({ voz: 'zoe', texto: '¡Muy bien! ¡Otra vez la canción completa!' }, { minMs: 600 });
                        this.prog = 0;
                        this.bumpers.forEach(function (q) { self.pintarBumper(q, null); });
                    }
                }
            } else if (b.id !== anterior || this.prog === 0) {
                if (this.prog > 0 || b.estado !== 'mal') {
                    this.prog = 0;
                    this.bumpers.forEach(function (q) { self.pintarBumper(q, null); });
                    this.pintarBumper(b, 'mal');
                    this.tweens.add({ targets: b.cont, angle: { from: -8, to: 8 }, duration: 60, yoyo: true, repeat: 3 });
                    this.errores += 1; this.erroresNivel += 1;
                    if (this.erroresNivel >= 5) this.ayuda = true;
                    if (this.time.now - this.ultimoReclamo > 7000) {
                        this.ultimoReclamo = this.time.now;
                        this.reaccion('Decir_no', 1400);
                        this.ctx.decir({ voz: 'zeus', texto: '¡Ese tambor no sigue la canción! Empieza otra vez.' }, { minMs: 800 });
                    }
                }
            }
        },

        pintarBumper: function (b, estado) {
            b.estado = estado;
            var g = b.halo; g.clear();
            if (!estado) return;
            var col = estado === 'ok' ? 0xffd43b : 0xff6b6b;
            g.lineStyle(7, col, 1); g.strokeCircle(0, 0, b.r + 5);
            g.lineStyle(16, col, 0.25); g.strokeCircle(0, 0, b.r + 10);
        },

        llegar: async function () {
            if (this.llegando) return;
            this.llegando = true; this.completa = true; this.fase = 'premio';
            this.marcadas = this.song.slice();
            var Me = this.L.mesa;
            await this.acertar(this.song.slice(), { x: Me.cx, y: Me.y0 + 120 });
            this.llegando = false;
        },

        alAcertar: async function () {
            var self = this;
            for (var k = 0; k < this.song.length; k++) {
                if (!this.sigue()) return;
                var b = this.bumpers.filter(function (q) { return q.id === self.song[k]; })[0];
                if (b) { this.reunidos.push(b.id); this.tweens.add({ targets: b.cont, scale: 1.2, duration: 120, yoyo: true }); this.fuego(b.body.position.x, b.body.position.y, k); }
                await this.sonar(this.song[k], { breve: true, bocina: false });
            }
            Ut.confeti(this, 70);
            await esperar(this, 700);
        },

        fuego: function (x, y, k) {
            var cols = [0xff6b6b, 0xfab005, 0x69db7c, 0x4dabf7, 0xcc5de8];
            K.ruido({ f: 2400, q: 0.6, dur: 0.3, vol: 0.08 });
            Ut.estallido(this, x, y, { n: 20, tex: 'chispa', tam: 22, dist: 130, depth: 52, colores: [cols[k % 5], 0xffffff, cols[(k + 2) % 5]], ms: 1000, gravedad: 50 });
        },

        /* ── Niveles ── */

        alSonar: function (id, k) { this.bombillasEsc = k + 1; this.lucesT = this.time.now; },
        alReescuchar: function (empieza) { if (empieza) this.bombillasEsc = 0; },

        preguntar: function () {
            if (this.nv.demo || this.nivelActual > 0) return Promise.resolve();
            return this.ctx.decir({ voz: 'zeus', texto: '¡Lanza la bola y golpea los tambores en el orden de la canción!' }, { minMs: 900 });
        },

        prepararNivel: async function (i, nv) {
            this.nv = nv;
            this.quitarBola();
            this.prog = 0; this.vueltas = 0; this.completa = false; this.llegando = false; this.erroresNivel = 0;
            this.song = nv.correctas.slice();
            this.bombillasEsc = 0;
            this.colocarNivel(nv);
            var self = this;
            this.bumpers.forEach(function (b, k) { b.cont.setAlpha(0); self.tweens.add({ targets: b.cont, alpha: 1, scale: { from: 0.3, to: 1 }, duration: 320, delay: k * 90, ease: 'Back.easeOut' }); });
            await esperar(this, 800);
        },

        mostrarOpciones: async function () {
            this.crearBola();
            await esperar(this, 400);
        },

        alTerminarNivel: async function () {
            var self = this;
            this.quitarBola();
            this.bumpers.forEach(function (b) { if (b.cont.active) tw(self, { targets: b.cont, alpha: 0, duration: 350 }); });
            this.giratorios.forEach(function (b) { if (b.cont.active) tw(self, { targets: b.cont, alpha: 0, duration: 350 }); });
            await esperar(this, 450);
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar') return Promise.resolve();
            var sig = this.song[this.prog];
            this.pulso = this.time.now;
            if (!this.ayuda) return esperar(this, 800);
            var b = this.bumpers.filter(function (q) { return q.id === sig; })[0];
            return this.ctx.mano({ punto: { x: this.L.mesa.cx, y: this.L.flip.y + 40 }, holdMs: 400, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
        },

        demoPaso: function () {
            var self = this;
            return this.nv.correctas.map(function (id, k) {
                return function () {
                    var b = self.bumpers.filter(function (q) { return q.id === id; })[0];
                    if (!b) return null;
                    return {
                        desde: { x: self.L.mesa.cx, y: self.L.flip.y + 40 }, hasta: { x: b.body.position.x, y: b.body.position.y },
                        hacer: async function () {
                            self.fase = 'jugar';
                            if (!self.bola) self.crearBola();
                            self.enLane = false;
                            M.Body.setPosition(self.bola.body, { x: b.body.position.x - b.r * 0.4, y: b.body.position.y - b.r - 80 });
                            M.Body.setVelocity(self.bola.body, { x: 0.2, y: 2 });
                            await esperar(self, 1600);
                        }
                    };
                };
            });
        },

        /* ── Final: se abre el telón y llueven pelotas de circo ── */

        escenaFinal: async function () {
            var self = this, L = this.L;
            this.fiesta = true;
            this.quitarBola();
            this.telon = 0;
            var tel = this.add.graphics().setDepth(90);
            this.telonG = tel;
            var ids = this.reunidos.filter(function (id, i, a) { return a.indexOf(id) === i; });
            if (!ids.length) ids = ['tambor', 'campana', 'maracas'];
            // Telón rojo que se abre dejando ver la fiesta.
            for (var f = 0; f <= 1.0001; f += 0.02) {
                tel.clear();
                var ancho = (L.W / 2) * (1 - f);
                tel.fillStyle(0xb02020, 1); tel.fillRect(0, 0, ancho, L.H); tel.fillRect(L.W - ancho, 0, ancho, L.H);
                tel.fillStyle(0xe03131, 1); for (var k2 = 0; k2 < 8; k2++) { tel.fillRect(ancho - (k2 * 14), 0, 8, L.H); tel.fillRect(L.W - ancho + (k2 * 14) - 8, 0, 8, L.H); }
                await esperar(this, 20);
            }
            tel.clear();
            // Lluvia de pelotas de colores que rebotan en la mesa.
            var cols = [0xff6b6b, 0xffd43b, 0x69db7c, 0x4dabf7, 0xcc5de8, 0xff922b];
            for (var n = 0; n < 30; n++) {
                if (!this.sigue()) return;
                var r = Math.round((10 + Math.random() * 12) * L.k);
                var x = L.mesa.x0 + 30 + Math.random() * (L.mesa.w - 90), y = L.mesa.y0 + 60;
                var cuerpo = M.Bodies.circle(x, y, r, { restitution: 0.8, friction: 0.02, density: 0.002 });
                M.Body.setVelocity(cuerpo, { x: (Math.random() - 0.5) * 4, y: 1 });
                M.Composite.add(this.motor.world, cuerpo);
                var c = this.add.container(x, y).setDepth(32);
                var g = this.add.graphics(); var col = cols[n % 6];
                g.fillStyle(col, 1); g.fillCircle(0, 0, r); g.fillStyle(0xffffff, 0.7); g.fillCircle(-r * 0.35, -r * 0.35, r * 0.28);
                c.add(g);
                this.balones.push({ body: cuerpo, cont: c });
                if (n % 5 === 0) { this.sonar(ids[(n / 5 | 0) % ids.length], { breve: true, bocina: false }); this.fuego(L.mesa.cx + (Math.random() - 0.5) * 300, L.H * (0.2 + Math.random() * 0.2), n); }
                await esperar(this, 110);
            }
            Ut.confeti(this, 100);
            for (var q = 0; q < ids.length; q++) { await this.sonar(ids[q], { breve: true, bocina: false }); }
            await esperar(this, 1500);
            this.balones.forEach(function (b) { M.Composite.remove(self.motor.world, b.body); if (b.cont.active) b.cont.destroy(); });
            this.balones = [];
            tel.destroy();
        },

        estadoExtra: function () {
            var b = this.bola && this.bola.body;
            return {
                song: this.song, prog: this.prog, vueltas: this.vueltas, completa: !!this.completa, enLane: this.enLane,
                bola: b && { x: Math.round(b.position.x), y: Math.round(b.position.y), v: +Math.hypot(b.velocity.x, b.velocity.y).toFixed(2) },
                bumpers: this.bumpers.map(function (q) { return { id: q.id, x: Math.round(q.body.position.x), y: Math.round(q.body.position.y), estado: q.estado }; }),
                flips: this.flips.map(function (f) { return { a: +f.body.angle.toFixed(2), on: f.on }; })
            };
        },

        /* ── Cada cuadro ── */

        paso: function (time, delta) {
            var L = this.L, s = time / 1000, dt = Math.min(0.05, (delta || 16) / 1000), self = this;
            if (!L || !this.motor || !this.dinG || !this.dinG.active) return;
            // Flippers: se levantan si hay un dedo en su mitad de la pantalla.
            var cxm = L.mesa.cx, izq = false, der = false;
            Object.keys(this.ptrs).forEach(function (k) { if (self.ptrs[k] < cxm) izq = true; else der = true; });
            if (this.fase !== 'jugar' && this.fase !== 'demo') { izq = false; der = false; }
            this.flips.forEach(function (f) { var on = f.lado === -1 ? izq : der; if (on && !f.on) K.tono({ f: 200, f2: 120, dur: 0.06, vol: 0.04 }); f.on = on; });
            for (var st = 0; st < 2; st++) {
                this.flips.forEach(function (f) {
                    var tgt = f.on ? f.activo : f.reposo;
                    var da = tgt - f.body.angle;
                    var vel = Math.abs(da) < 0.03 ? 0 : (da > 0 ? 1 : -1) * (f.on ? 0.34 : 0.2);
                    M.Body.setAngularVelocity(f.body, vel);
                });
                // Aspas giratorias: cuerpos estáticos que giran (se les da velocidad para desviar la bola).
                this.giratorios.forEach(function (g) { g.ang += g.w * 0.0083 * 1.0; M.Body.setAngle(g.body, g.ang); M.Body.setAngularVelocity(g.body, g.w * 0.0083); });
                M.Engine.update(this.motor, 1000 / 120);
                this.flips.forEach(function (f) {
                    var lo = Math.min(f.reposo, f.activo), hi = Math.max(f.reposo, f.activo);
                    if (f.body.angle < lo) { M.Body.setAngle(f.body, lo); M.Body.setAngularVelocity(f.body, 0); }
                    else if (f.body.angle > hi) { M.Body.setAngle(f.body, hi); M.Body.setAngularVelocity(f.body, 0); }
                });
            }
            // Bola: sigue su cuerpo; si se pierde por abajo, sale otra en el carril.
            var B = this.bola;
            if (B) {
                var p = B.body.position;
                var vv = Math.hypot(B.body.velocity.x, B.body.velocity.y);
                if (vv > 32) M.Body.setVelocity(B.body, { x: B.body.velocity.x * 32 / vv, y: B.body.velocity.y * 32 / vv });
                B.cont.setPosition(p.x, p.y); B.cont.rotation = B.body.angle;
                B.estela.unshift({ x: p.x, y: p.y }); if (B.estela.length > 12) B.estela.length = 12;
                if (this.enLane) {
                    this.laneT += dt;
                    if (this.laneT > 6 && (this.fase === 'jugar')) this.lanzar();
                } else {
                    this.sinMovimiento = vv < 0.1 ? this.sinMovimiento + dt : 0;
                    if (this.sinMovimiento > 1.2 && this.fase === 'jugar') { M.Body.setVelocity(B.body, { x: (Math.random() < 0.5 ? -1 : 1) * 2, y: -3 }); this.sinMovimiento = 0; }
                    if (p.y > L.mesa.y1 + 40 || p.x < L.mesa.x0 - 40 || p.x > L.mesa.x1 + 40) { if (this.fase === 'jugar' || this.fase === 'demo') { this.crearBola(); K.tono({ f: 300, f2: 140, dur: 0.3, vol: 0.05 }); } }
                }
            }
            this.balones.forEach(function (b) { b.cont.setPosition(b.body.position.x, b.body.position.y); b.cont.rotation = b.body.angle; });
            this.bumpers.forEach(function (b) { if (b.estado) b.halo.setAlpha(0.7 + 0.3 * Math.sin(s * 6 + b.body.id)); });

            // ── Dibujo dinámico: focos de la carpa, bombillas del marco, marquesina, flippers, aspas ──
            var g = this.dinG; g.clear();
            // Focos que barren la carpa.
            for (var fo = 0; fo < 3; fo++) {
                var fx = L.W * (0.12 + fo * 0.38), ang = Math.sin(s * 0.7 + fo * 2) * 0.35;
                g.fillStyle(0xfff3bf, 0.07);
                g.fillTriangle(fx, 80, fx + Math.sin(ang - 0.2) * L.H, 80 + Math.cos(ang - 0.2) * L.H, fx + Math.sin(ang + 0.2) * L.H, 80 + Math.cos(ang + 0.2) * L.H);
            }
            // Público: siluetas con globos que suben.
            for (var pu = 0; pu < 18; pu++) {
                var px = ((pu * 97) % L.W), py = L.H * 0.955 - Math.abs(Math.sin(s * 1.5 + pu)) * 6;
                if (px > L.mesa.x0 - 30 && px < L.mesa.x1 + 30) continue;
                g.fillStyle(0x2a0f0f, 0.85); g.fillCircle(px, py, 22); g.fillRect(px - 20, py + 10, 40, L.H);
                if (pu % 3 === 0) { var gy = L.H * 0.9 - ((s * 30 + pu * 40) % (L.H * 0.7)); g.lineStyle(2, 0xffffff, 0.5); g.lineBetween(px, py - 20, px + Math.sin(s + pu) * 6, gy + 20); g.fillStyle([0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c][pu % 4], 0.9); g.fillEllipse(px + Math.sin(s + pu) * 6, gy, 24, 30); }
            }
            // Bombillas parpadeantes del marco de la mesa.
            var Me = L.mesa, R = Me.w / 2, cyA = Me.y0 + R, nB = 34;
            for (var bl = 0; bl < nB; bl++) {
                var u = bl / (nB - 1), pos, ar = Math.PI + u * Math.PI;
                if (u < 0.55) { var aa = Math.PI + (u / 0.55) * Math.PI; pos = { x: Me.cx + Math.cos(aa) * (R + 9), y: cyA + Math.sin(aa) * (R + 9) }; }
                else { var vv2 = (u - 0.55) / 0.45; pos = { x: Me.x1 + 9, y: cyA + vv2 * (Me.y1 - cyA) }; }
                var on = (Math.floor(s * 4 + bl) % 3) === 0;
                g.fillStyle(on ? 0xfff3bf : 0xc9a24a, 1); g.fillCircle(pos.x, pos.y, on ? 5 : 3.5);
                if (on) { g.fillStyle(0xfff3bf, 0.25); g.fillCircle(pos.x, pos.y, 11); }
            }
            // Marquesina con las bombillas de la canción (a la derecha de la mesa).
            var n = this.song ? this.song.length : 0;
            if (n) {
                var mx = L.marq.x, my = L.marq.y, mh = n * 62 + 40;
                g.fillStyle(0x000000, 0.3); g.fillRoundedRect(mx - 38 + 4, my - 30 + 6, 76, mh, 14);
                g.fillStyle(0x7a4419, 1); g.fillRoundedRect(mx - 38, my - 30, 76, mh, 14);
                g.fillStyle(0xfab005, 1); g.fillRoundedRect(mx - 32, my - 24, 64, mh - 12, 10);
                g.fillStyle(0x3b1a0a, 1); g.fillRoundedRect(mx - 28, my - 20, 56, mh - 20, 8);
                for (var i = 0; i < n; i++) {
                    var by = my + 12 + i * 62, oro = this.prog > i, esc = this.fase === 'escuchando' && (this.bombillasEsc || 0) > i;
                    var pul = this.pulso && time - this.pulso < 900 && i === this.prog ? 1 + 0.25 * Math.sin((time - this.pulso) / 60) : 1;
                    g.fillStyle(0xffd43b, (oro || esc ? 0.3 : 0.05) + (oro ? 0.08 * Math.sin(s * 5 + i) : 0)); g.fillCircle(mx, by + 12, 28 * pul);
                    g.fillStyle(oro ? 0xff6b6b : esc ? 0xffd43b : 0x6b5a4a, 1); g.fillCircle(mx, by + 12, 17 * pul);
                    g.fillStyle(0xffffff, oro || esc ? 0.8 : 0.25); g.fillCircle(mx - 5, by + 7, 5);
                }
                // Estrellitas de las canciones completadas.
                for (var v = 0; v < (this.nv ? this.nv.meta : 1); v++) { g.fillStyle(this.vueltas > v ? 0xffd43b : 0x6b5a4a, 1); var sx = mx - 14 + v * 28, sy = my + mh - 8, pts = []; for (var k3 = 0; k3 < 10; k3++) { var a3 = -Math.PI / 2 + k3 * Math.PI / 5, r3 = k3 % 2 ? 5 : 11; pts.push({ x: sx + Math.cos(a3) * r3, y: sy + Math.sin(a3) * r3 }); } g.fillPoints(pts, true); }
            }
            // Flippers (se dibujan según su ángulo real) y plunger.
            this.flips.forEach(function (f) {
                var b = f.body, th = f.th, len = f.len;
                var cs = Math.cos(b.angle), sn = Math.sin(b.angle);
                var px = f.px, py = f.py, tx = px + cs * (-f.lado * len), ty = py + sn * (-f.lado * len);
                g.lineStyle(th + 6, 0x7a4419, 1); g.lineBetween(px, py, tx, ty);
                g.lineStyle(th, f.on ? 0xffd43b : 0xe03131, 1); g.lineBetween(px, py, tx, ty);
                g.lineStyle(th * 0.3, 0xffffff, 0.45); g.lineBetween(px, py - 4, tx, ty - 4);
                g.fillStyle(0xfab005, 1); g.fillCircle(px, py, th * 0.7); g.fillStyle(0x5c3312, 1); g.fillCircle(px, py, th * 0.3);
            });
            var Mq = this.mesa;
            var lx = Me.x1 - L.lane / 2 - 3, py2 = Me.y1 - 30 * L.k;
            var retro = this.plunger && time - this.plunger < 200 ? (1 - (time - this.plunger) / 200) * 0 : Math.min(26, this.enLane ? this.laneT * 6 : 0);
            g.fillStyle(0x868e96, 1); g.fillRect(lx - 5, py2 + retro, 10, 40);
            g.fillStyle(0xe03131, 1); g.fillCircle(lx, py2 + retro, 11);
            if (this.enLane && this.bola && this.fase === 'jugar') {
                var fl = 0.5 + 0.5 * Math.sin(s * 6);
                g.lineStyle(4, 0xffe066, 0.4 + 0.5 * fl); g.beginPath(); g.moveTo(lx - 10, Me.y1 - 150); g.lineTo(lx, Me.y1 - 170 - fl * 8); g.lineTo(lx + 10, Me.y1 - 150); g.strokePath();
            }
            // Aspas giratorias.
            this.giratorios.forEach(function (gi) { gi.cont.setPosition(gi.body.position.x, gi.body.position.y); gi.cont.rotation = gi.body.angle; });
            // Estela de la bola y destello del último bumper.
            var lz = this.luzG; lz.clear();
            if (B) for (var e = 1; e < B.estela.length; e += 2) { lz.fillStyle(0xffffff, 0.3 * (1 - e / 12)); lz.fillCircle(B.estela[e].x, B.estela[e].y, B.r * (1 - e / 16)); }
            if (this.destello && time - this.destello.t0 < 350) { var dd = this.destello, ff = (time - dd.t0) / 350; lz.lineStyle(5 * (1 - ff) + 1, dd.col, 0.9 * (1 - ff)); lz.strokeCircle(dd.x, dd.y, 40 + ff * 70); }
            // Ayuda: el tambor que sigue pulsa.
            if (this.ayuda && this.fase === 'jugar' && !this.completa && this.song) {
                var sig = this.song[this.prog], bm = this.bumpers.filter(function (q) { return q.id === sig; })[0];
                if (bm) { lz.lineStyle(5, 0xffe066, 0.5 + 0.4 * Math.sin(s * 6)); lz.strokeCircle(bm.body.position.x, bm.body.position.y, bm.r + 14); }
            }
        }
    };

    K.crear({ id: 'pinball', fondo: '#6b1a1a', escena: escena });
})(typeof window !== 'undefined' ? window : this);
