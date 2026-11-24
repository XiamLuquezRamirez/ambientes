/**
 * TallerMaquina — "El taller de máquinas maravillosas", el fondo vivo (window.TallerMaquina).
 *
 * Lo quieto (pared, ventanas con fábricas lejanas, tuberías, tablero de herramientas, piso) se
 * hornea una vez. Encima corre lo que se mueve todo el tiempo y reacciona a EventosMaquina:
 *   - grupos de ruedas decorativas que engranan de verdad (misma fase que el juego),
 *   - poleas con correa en las paredes laterales,
 *   - un tubo de cristal con bolas de colores, la cinta del piso con cajas y un brazo robótico,
 *   - un compresor que vibra y suelta vapor, focos que parpadean, balizas y el medidor de energía.
 * La energía sube con cada pieza ensamblada; al poner la máquina en marcha todo el taller cobra vida.
 */
(function (global) {
    "use strict";

    var M = function () { return global.MotorMaquina; };
    var D = function () { return global.DibujosMaquina; };
    var R = function () { return global.ReglasMaquina; };
    var EV = function () { return global.EventosMaquina; };
    var Phaser = global.Phaser;
    var W = 1600, H = 900;
    var DOS_PI = Math.PI * 2;
    var PISO = 792;
    var CINTA_Y = 848;
    var TUBO = [{ x: 470, y: 112 }, { x: 1398, y: 112 }, { x: 1398, y: 128 }, { x: 1600, y: 128 }];
    var MEDIDOR = { x0: 1334, x1: 1390, y0: 160, y1: 470 };

    function Taller(scene, variante) {
        var self = this;
        this.scene = scene;
        this.v = variante || {};
        this.t = 0;
        this.energia = 0;
        this.energiaVis = 0;
        this.vivo = 0;
        this.vivoObj = 0;
        this.agita = 0;
        this.destello = 0;
        this.destelloColor = 0xffd43b;
        this.texturas();
        this.hFondo = new (M().Horno)(scene, 0, 0, W, H, { mundo: true, prof: 0 });
        this.hFondo.pintar(function (g) { self.pintarFondo(g); });
        this.crearVentanas();
        this.hFrente = new (M().Horno)(scene, 0, 0, W, 140, { mundo: true, prof: 4 });
        this.hFrente.pintar(function (g) { self.pintarMarcos(g); });
        this.crearRuedas();
        this.crearPoleas();
        this.crearTubo();
        this.crearCinta();
        this.crearBrazo();
        this.crearCompresor();
        this.crearLuces();
        this.crearMedidor();
        this.luzGeneral = scene.add.rectangle(W / 2, H / 2, W, H, 0xfff3bf, 0).setDepth(70).setBlendMode(Phaser.BlendModes.ADD);
        this.particulas = new (M().Particulas)(scene, 30, 145);
        var b = EV();
        this.quitar = [];
        if (b) {
            this.quitar.push(b.on("pieza_seleccionada", function (d) { self.flash(d.talla === "grande" ? 0xffd43b : (d.talla === "mediano" ? 0x4dabf7 : (d.tipo === "correa" ? 0xb197fc : 0x69db7c)), 0.8); }));
            this.quitar.push(b.on("pieza_cerca_de_eje", function () { self.panelVerde = 1; }));
            this.quitar.push(b.on("pieza_ensamblada", function (d) { self.flash(0x8ce99a, 1); self.chispasMedidor(); self.empujon = 1; }));
            this.quitar.push(b.on("pieza_rechazada", function (d) { if (d.motivo !== "fuera") self.sacudirCompresor(); }));
            this.quitar.push(b.on("energia", function (d) { self.energia = Math.max(0, Math.min(1, Number(d.valor) || 0)); }));
            this.quitar.push(b.on("maquina_en_marcha", function () { self.vivoObj = 1; self.flash(0xffffff, 1.4); }));
            this.quitar.push(b.on("nivel_iniciado", function () { self.vivoObj = 0; self.energia = 0; self.palancaArriba(); }));
        }
    }

    // ------------------------------------------------------------------ texturas pequeñas

    Taller.prototype.texturas = function () {
        var s = this.scene;
        D().hornear(s, "bola", 26, 26, function (g) {
            g.fillStyle(0xffffff, 1); g.fillCircle(0, 0, 11);
            g.fillStyle(0x000000, 0.18); g.fillCircle(2, 3, 8);
            g.fillStyle(0xffffff, 0.9); g.fillCircle(-4, -4, 3.5);
        });
        D().hornear(s, "cinta-banda", 48, 30, function (g) {
            g.fillStyle(0x2d3142, 1); g.fillRect(-24, -15, 48, 30);
            g.fillStyle(0x474d63, 1); g.fillRect(-22, -11, 18, 22);
            g.fillStyle(0x474d63, 1); g.fillRect(2, -11, 18, 22);
            g.fillStyle(0x5c6584, 1); g.fillRect(-22, -11, 18, 3);
            g.fillRect(2, -11, 18, 3);
        });
        ["#ff8787", "#ffd43b", "#74c0fc", "#8ce99a", "#b197fc", "#ffa94d"].forEach(function (c, i) {
            var col = D().hexA(c);
            D().hornear(s, "caja-" + i, 54, 46, function (g) {
                g.fillStyle(0x000000, 0.2); g.fillRoundedRect(-22, -16, 46, 36, 6);
                g.fillStyle(col, 1); g.fillRoundedRect(-24, -20, 46, 36, 6);
                g.fillStyle(D().mezclar(col, 0xffffff, 0.35), 1); g.fillRoundedRect(-24, -20, 46, 9, { tl: 6, tr: 6, bl: 0, br: 0 });
                g.lineStyle(3, D().mezclar(col, 0x000000, 0.3), 1); g.strokeRoundedRect(-24, -20, 46, 36, 6);
                g.lineStyle(4, D().mezclar(col, 0x000000, 0.18), 1); g.lineBetween(-1, -20, -1, 16);
            });
        });
        D().hornear(s, "brazo-seg", 120, 40, function (g) {
            g.fillStyle(0x1b1e2b, 0.25); g.fillRoundedRect(-52, -10, 108, 26, 13);
            g.fillStyle(0xff922b, 1); g.fillRoundedRect(-55, -13, 108, 26, 13);
            g.fillStyle(0xffc078, 1); g.fillRoundedRect(-50, -10, 98, 7, 4);
            g.fillStyle(0x495057, 1); g.fillCircle(-42, 0, 9); g.fillCircle(40, 0, 9);
            g.fillStyle(0xdee2e6, 1); g.fillCircle(-42, 0, 5); g.fillCircle(40, 0, 5);
        });
        D().hornear(s, "brazo-pinza", 60, 60, function (g) {
            g.fillStyle(0x495057, 1); g.fillRoundedRect(-12, -10, 24, 20, 6);
            g.fillStyle(0x868e96, 1);
            g.fillPoints([{ x: -10, y: 8 }, { x: -4, y: 8 }, { x: -8, y: 26 }, { x: -16, y: 22 }], true, true);
            g.fillPoints([{ x: 10, y: 8 }, { x: 4, y: 8 }, { x: 8, y: 26 }, { x: 16, y: 22 }], true, true);
        });
        D().hornear(s, "aspa", 30, 30, function (g) {
            g.fillStyle(0xffffff, 1); g.fillCircle(0, 0, 12);
        });
    };

    // ------------------------------------------------------------------ fondo horneado

    Taller.prototype.pintarFondo = function (g) {
        var i, y, x;
        // pared con degradado de turquesa a azul claro
        var arriba = 0x2b7a9e, abajo = 0x67bcd6;
        for (y = 0; y < PISO; y += 12) {
            g.fillStyle(D().mezclar(arriba, abajo, y / PISO), 1);
            g.fillRect(0, y, W, 13);
        }
        // paneles de la pared con costuras y remaches
        for (x = 0; x <= W; x += 200) {
            g.fillStyle(0x1f5f7e, 0.35);
            g.fillRect(x - 2, 140, 4, PISO - 140);
            for (y = 170; y < PISO - 20; y += 90) {
                g.fillStyle(0x1f5f7e, 0.5); g.fillCircle(x - 10, y, 3.5); g.fillCircle(x + 10, y, 3.5);
            }
        }
        g.fillStyle(0x1f5f7e, 0.3);
        g.fillRect(0, 470, W, 5);
        // franja superior (techo) con tubos fluorescentes
        g.fillStyle(0x1b4f6b, 1);
        g.fillRect(0, 0, W, 16);
        for (i = 0; i < 8; i++) {
            g.fillStyle(0xe7f5ff, 0.6);
            g.fillRoundedRect(40 + i * 200, 4, 120, 8, 4);
        }
        // tubería gruesa de la pared, con codos
        var tubo = function (x0, y0, x1, y1, r) {
            g.fillStyle(0x1b4f6b, 1);
            if (x0 === x1) g.fillRect(x0 - r, Math.min(y0, y1), r * 2, Math.abs(y1 - y0));
            else g.fillRect(Math.min(x0, x1), y0 - r, Math.abs(x1 - x0), r * 2);
            g.fillStyle(0x7fb7cf, 0.55);
            if (x0 === x1) g.fillRect(x0 - r + 3, Math.min(y0, y1), 4, Math.abs(y1 - y0));
            else g.fillRect(Math.min(x0, x1), y0 - r + 3, Math.abs(x1 - x0), 4);
        };
        tubo(0, 150, W, 150, 9);
        tubo(1450, 150, 1450, PISO, 9);
        tubo(150, 150, 150, PISO, 9);
        [150, 1450].forEach(function (px) {
            for (var yy = 200; yy < PISO; yy += 150) {
                g.fillStyle(0x0f3a52, 1); g.fillRoundedRect(px - 13, yy, 26, 12, 4);
            }
        });
        // tablero de herramientas (izquierda, se ve en pantallas anchas)
        g.fillStyle(0xc98a4b, 1);
        g.fillRoundedRect(8, 190, 128, 250, 10);
        g.fillStyle(0xb5773a, 1);
        for (y = 205; y < 430; y += 22) for (x = 22; x < 130; x += 22) g.fillCircle(x, y, 2.5);
        // llave
        g.fillStyle(0xadb5bd, 1);
        g.fillRoundedRect(34, 214, 14, 90, 6);
        g.fillCircle(41, 214, 15);
        g.fillStyle(0xc98a4b, 1); g.fillRect(36, 196, 10, 16);
        // martillo
        g.fillStyle(0x8b5a2b, 1); g.fillRoundedRect(84, 230, 12, 100, 5);
        g.fillStyle(0x868e96, 1); g.fillRoundedRect(68, 218, 44, 20, 5);
        // destornillador
        g.fillStyle(0xfa5252, 1); g.fillRoundedRect(36, 330, 18, 46, 7);
        g.fillStyle(0xced4da, 1); g.fillRect(42, 376, 6, 42);
        // regla y alicate
        g.fillStyle(0xffd43b, 1); g.fillRoundedRect(84, 350, 40, 70, 4);
        g.fillStyle(0x2b2f4a, 1); for (y = 356; y < 418; y += 8) g.fillRect(84, y, 10, 2);
        // panel de control (derecha, bajo el medidor)
        g.fillStyle(0x0b1d3a, 0.28); g.fillRoundedRect(1332, 498, 66, 260, 14);
        g.fillStyle(0x34495e, 1); g.fillRoundedRect(1328, 492, 64, 258, 14);
        g.fillStyle(0x4b6584, 1); g.fillRoundedRect(1334, 498, 52, 246, 10);
        g.fillStyle(0x1b1e2b, 1); g.fillRoundedRect(1340, 640, 40, 96, 10);
        g.fillStyle(0xffd43b, 1); g.fillRect(1336, 744, 48, 4);
        // estante con aceitera en la derecha ancha
        g.fillStyle(0x8b5a2b, 1); g.fillRect(1470, 520, 120, 10);
        g.fillStyle(0x2f9e44, 1); g.fillRoundedRect(1490, 476, 34, 44, 8);
        g.fillStyle(0xadb5bd, 1); g.fillRect(1522, 482, 26, 5);
        g.fillStyle(0xfab005, 1); g.fillRoundedRect(1548, 488, 30, 32, 6);
        // piso
        g.fillStyle(0x3d4d63, 1);
        g.fillRect(0, PISO, W, H - PISO);
        g.fillStyle(0x52637a, 1);
        g.fillRect(0, PISO, W, 8);
        for (x = 0; x < W; x += 80) {
            g.fillStyle(0x34435a, 1);
            g.fillRect(x, PISO + 8, 2, H - PISO);
        }
        // banda de peligro del piso
        for (x = 0; x < W; x += 40) {
            g.fillStyle(0xffc425, 0.85);
            g.fillPoints([{ x: x, y: H - 10 }, { x: x + 20, y: H - 10 }, { x: x + 30, y: H }, { x: x + 10, y: H }], true, true);
        }
        // cuerpo de la cinta del piso
        g.fillStyle(0x0b1d3a, 0.3);
        g.fillRoundedRect(0, CINTA_Y - 18, W, 50, 10);
        g.fillStyle(0x6c7a91, 1);
        g.fillRoundedRect(-10, CINTA_Y - 24, W + 20, 48, 12);
        for (x = 60; x < W; x += 170) {
            g.fillStyle(0x495568, 1);
            g.fillRect(x, CINTA_Y + 22, 14, 28);
        }
    };

    // ------------------------------------------------------------------ ventanas con máquinas lejanas

    var VENTANAS = [
        { x0: 30, x1: 190, y0: 24, y1: 104 },
        { x0: 230, x1: 460, y0: 24, y1: 100 },
        { x0: 1030, x1: 1220, y0: 24, y1: 100 },
        { x0: 1430, x1: 1580, y0: 24, y1: 104 }
    ];

    Taller.prototype.crearVentanas = function () {
        var s = this.scene, self = this;
        this.lejanas = [];
        var key = D().engranaje(s, "lejana", 12, 6, "#2f6f8f", "rayos");
        // cielo y fábricas lejanas, horneados detrás de los marcos
        this.hCielo = new (M().Horno)(s, 0, 0, W, 120, { mundo: true, prof: 1 });
        this.hCielo.pintar(function (g) {
            VENTANAS.forEach(function (v, i) {
                for (var y = v.y0; y < v.y1; y += 6) {
                    g.fillStyle(D().mezclar(0xbdf0ff, 0xfff3d6, (y - v.y0) / (v.y1 - v.y0)), 1);
                    g.fillRect(v.x0, y, v.x1 - v.x0, 7);
                }
                g.fillStyle(0x7fb2c9, 1);
                var x = v.x0 + 8;
                while (x < v.x1 - 10) {
                    var w = 22 + ((x * 7 + i * 13) % 30), h = 16 + ((x * 11 + i * 5) % 34);
                    g.fillRect(x, v.y1 - h, w, h);
                    if ((x + i) % 3 === 0) g.fillRect(x + w * 0.6, v.y1 - h - 18, 7, 18);
                    x += w + 4;
                }
            });
        });
        VENTANAS.forEach(function (v, i) {
            var cx = (v.x0 + v.x1) / 2 + (i % 2 ? 30 : -30), cy = v.y1 - 18;
            var a = s.add.image(cx, cy, key).setDepth(2).setScale(0.52).setAlpha(0.75);
            var b = s.add.image(cx + 47 * 0.52 * 1.62, cy - 6, key).setDepth(2).setScale(0.52).setAlpha(0.75);
            self.lejanas.push({ img: a, s: 1 }, { img: b, s: -1, fase: Math.PI / 12 });
            var luz = s.add.image(v.x0 + 16 + (i * 37) % (v.x1 - v.x0 - 30), v.y0 + 30, "p-chispa").setDepth(2.5).setScale(0.4).setTint(0xff6b6b).setBlendMode(Phaser.BlendModes.ADD);
            self.lejanas.push({ luz: luz, fase: i * 1.3 });
        });
    };

    Taller.prototype.pintarMarcos = function (g) {
        VENTANAS.forEach(function (v) {
            g.lineStyle(9, 0x1b4f6b, 1);
            g.strokeRoundedRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0, 8);
            g.lineStyle(5, 0x1b4f6b, 1);
            g.lineBetween((v.x0 + v.x1) / 2, v.y0, (v.x0 + v.x1) / 2, v.y1);
            g.lineBetween(v.x0, (v.y0 + v.y1) / 2, v.x1, (v.y0 + v.y1) / 2);
            g.fillStyle(0xffffff, 0.22);
            g.fillPoints([{ x: v.x0 + 10, y: v.y1 - 6 }, { x: v.x0 + 36, y: v.y0 + 6 }, { x: v.x0 + 52, y: v.y0 + 6 }, { x: v.x0 + 26, y: v.y1 - 6 }], true, true);
        });
        // tubo de cristal (vidrio delante de las bolas): bordes y brillo
        g.lineStyle(3, 0xe7f5ff, 0.8);
        g.lineBetween(TUBO[0].x, TUBO[0].y - 11, TUBO[1].x + 11, TUBO[1].y - 11);
        g.lineBetween(TUBO[0].x, TUBO[0].y + 11, TUBO[1].x - 11, TUBO[1].y + 11);
        g.lineBetween(TUBO[1].x + 11, TUBO[2].y - 11 + 16, TUBO[3].x, TUBO[3].y - 11);
        g.lineBetween(TUBO[1].x - 11, TUBO[2].y + 11, TUBO[3].x, TUBO[3].y + 11);
        g.fillStyle(0xffffff, 0.16);
        g.fillRect(TUBO[0].x, TUBO[0].y - 9, TUBO[1].x - TUBO[0].x, 5);
        g.fillStyle(0x1b4f6b, 1);
        [TUBO[0].x, 760, 1000, 1240, TUBO[1].x].forEach(function (x) { g.fillRoundedRect(x - 7, TUBO[0].y - 15, 14, 30, 4); });
    };

    // ------------------------------------------------------------------ ruedas decorativas (engranan de verdad)

    Taller.prototype.crearRuedas = function () {
        var s = this.scene, self = this;
        this.grupos = [];
        var colores = ["#f4a259", "#5fb8c2", "#8fa8c8", "#f6c453"];
        var hacer = function (cx, cy, m, z0, hijos, prof, alfa, vel) {
            var raiz = { x: cx, y: cy, z: z0 };
            var lista = [{ def: raiz, a: 1, b: 0 }];
            var key0 = D().engranaje(s, "deco", z0, m, colores[(cx + cy) % 4], "rayos");
            lista[0].img = s.add.image(cx, cy, key0).setDepth(prof).setAlpha(alfa);
            hijos.forEach(function (h, i) {
                var padre = lista[h.de || 0];
                var d = m * (padre.def.z + h.z) / 2;
                var def = { x: padre.def.x + d * Math.cos(h.ang), y: padre.def.y + d * Math.sin(h.ang), z: h.z };
                var key = D().engranaje(s, "deco", h.z, m, colores[(i + 1 + cx) % 4], i % 2 ? "agujeros" : "estrella");
                var e = { def: def, padre: padre, img: s.add.image(def.x, def.y, key).setDepth(prof - 0.01 * (i + 1)).setAlpha(alfa) };
                lista.push(e);
            });
            self.grupos.push({ lista: lista, phi: Math.random() * 3, vel: vel });
        };
        // esquina superior izquierda (sobre el tablero de herramientas) y derecha ancha
        hacer(70, 520, 7, 18, [{ z: 10, ang: -0.9 }, { z: 14, ang: 0.95 }], 6, 0.95, 0.35);
        hacer(1520, 330, 7, 16, [{ z: 11, ang: 2.3 }, { z: 9, ang: 0.6, de: 1 }], 6, 0.95, -0.3);
        // detrás del panel derecho: asoman entre el tablero y el medidor
        hacer(1360, 620, 5, 12, [{ z: 8, ang: -1.2 }], 7, 0.0, 0.4);
        // junto a la bandeja, bajo las ventanas
        hacer(490, 640, 5, 10, [{ z: 8, ang: 1.6 }], 7, 0.0, 0.45);
        // la tercera y cuarta familias solo asoman cuando la máquina está en marcha
        this.gruposMarcha = this.grupos.slice(2);
    };

    // ------------------------------------------------------------------ poleas de pared con correa

    Taller.prototype.crearPoleas = function () {
        var s = this.scene;
        this.poleasPared = [];
        var defs = [
            { a: { x: 70, y: 640, r: 34 }, b: { x: 70, y: 740, r: 22 } },
            { a: { x: 1525, y: 600, r: 30 }, b: { x: 1525, y: 740, r: 44 } }
        ];
        var self = this;
        defs.forEach(function (d) {
            var ka = D().polea(s, "pared-a", d.a.r, 6, "#5fb8c2");
            var kb = D().polea(s, "pared-b", d.b.r, 6, "#f4a259");
            var g = s.add.graphics().setDepth(9);
            var ia = s.add.image(d.a.x, d.a.y, ka).setDepth(8);
            var ib = s.add.image(d.b.x, d.b.y, kb).setDepth(8);
            self.poleasPared.push({ c: R().correa(d.a, d.b), a: d.a, b: d.b, ia: ia, ib: ib, g: g, phi: 0, ult: null });
        });
    };

    // ------------------------------------------------------------------ tubo con bolas de colores

    Taller.prototype.crearTubo = function () {
        var s = this.scene;
        this.bolas = [];
        var tramos = [];
        var L = 0;
        for (var i = 0; i < TUBO.length - 1; i++) {
            var a = TUBO[i], b = TUBO[i + 1];
            var l = Math.sqrt((b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y));
            tramos.push({ a: a, b: b, l: l, desde: L });
            L += l;
        }
        this.tubo = { tramos: tramos, largo: L };
        var colores = (this.v.luces || ["#ffd43b", "#69db7c", "#4dd4f0", "#ff8787", "#b197fc"]).map(D().hexA);
        for (var k = 0; k < 16; k++) {
            this.bolas.push({ img: s.add.image(-50, -50, "bola").setDepth(3).setTint(colores[k % colores.length]).setScale(0.78), s: k * L / 16 + Math.random() * 20 });
        }
    };

    Taller.prototype.puntoTubo = function (s) {
        var t = ((s % this.tubo.largo) + this.tubo.largo) % this.tubo.largo;
        var tr = this.tubo.tramos;
        for (var i = 0; i < tr.length; i++) {
            if (t <= tr[i].desde + tr[i].l) {
                var u = (t - tr[i].desde) / tr[i].l;
                return { x: tr[i].a.x + (tr[i].b.x - tr[i].a.x) * u, y: tr[i].a.y + (tr[i].b.y - tr[i].a.y) * u };
            }
        }
        return TUBO[0];
    };

    // ------------------------------------------------------------------ cinta del piso con cajas

    Taller.prototype.crearCinta = function () {
        var s = this.scene;
        this.banda = s.add.tileSprite(W / 2, CINTA_Y - 6, W + 40, 30, "cinta-banda").setDepth(10);
        this.cajas = [];
        for (var i = 0; i < 9; i++) {
            this.cajas.push({ img: s.add.image(0, CINTA_Y - 38, "caja-" + (i % 6)).setDepth(11), x: i * (W + 200) / 9 });
        }
        this.rodillos = [];
        for (var x = 30; x < W; x += 120) {
            this.rodillos.push(s.add.image(x, CINTA_Y + 10, "bola").setDepth(10.5).setTint(0x343a40).setScale(0.7));
        }
        this.cintaX = 0;
    };

    // ------------------------------------------------------------------ brazo robótico del piso

    Taller.prototype.crearBrazo = function () {
        var s = this.scene;
        // delante del tablero, en el borde de abajo: toma cajas de la cinta del piso
        var x = this.v.brazoIzquierda ? 540 : 1185;
        var base = s.add.container(x, H - 8).setDepth(140);
        var pie = s.add.graphics();
        pie.fillStyle(0x343a40, 1); pie.fillRoundedRect(-36, -14, 72, 26, 8);
        pie.fillStyle(0x495057, 1); pie.fillCircle(0, -14, 18);
        pie.fillStyle(0xffd43b, 1); pie.fillRect(-30, 4, 60, 5);
        var seg1 = s.add.container(0, -14);
        var i1 = s.add.image(42, 0, "brazo-seg");
        var seg2 = s.add.container(84, 0);
        var i2 = s.add.image(36, 0, "brazo-seg").setScale(0.75, 0.85);
        var pinza = s.add.image(74, 0, "brazo-pinza");
        var luz = s.add.image(74, 0, "p-chispa").setBlendMode(Phaser.BlendModes.ADD).setTint(0x4dd4f0).setScale(0.5);
        seg2.add([i2, pinza, luz]);
        seg1.add([i1, seg2]);
        base.add([pie, seg1]);
        // el pie es un Graphics fijo: se hornea para que no se vuelva a teselar
        this.brazo = { base: base, seg1: seg1, seg2: seg2, pinza: pinza, luz: luz, fase: 0, dir: this.v.brazoIzquierda ? 1 : -1 };
    };

    // ------------------------------------------------------------------ compresor que vibra

    Taller.prototype.crearCompresor = function () {
        var s = this.scene;
        var x = this.v.brazoIzquierda ? 1150 : 560;
        var key = D().hornear(s, "compresor", 140, 120, function (g) {
            g.fillStyle(0x0b1d3a, 0.25); g.fillEllipse(6, 50, 120, 20);
            g.fillStyle(0x1c7ed6, 1); g.fillRoundedRect(-56, -40, 112, 86, 16);
            g.fillStyle(0x4dabf7, 1); g.fillRoundedRect(-50, -34, 100, 16, 8);
            g.fillStyle(0xe7f5ff, 1); g.fillCircle(-22, 6, 18);
            g.fillStyle(0x1b1e2b, 1); g.fillCircle(-22, 6, 13);
            g.lineStyle(3, 0xfa5252, 1); g.lineBetween(-22, 6, -14, -2);
            g.fillStyle(0x343a40, 1); g.fillRoundedRect(10, -10, 34, 40, 6);
            for (var i = 0; i < 4; i++) { g.fillStyle(0x868e96, 1); g.fillRect(14, -4 + i * 9, 26, 4); }
            g.fillStyle(0x343a40, 1); g.fillRect(30, -58, 10, 20);
        });
        this.compresor = { img: s.add.image(x, H - 5, key).setOrigin(0.5, 0.9).setDepth(140), x: x, y: H - 5, chimenea: H - 5 - 106, sac: 0, vapor: 0 };
    };

    Taller.prototype.sacudirCompresor = function () {
        this.compresor.sac = 1;
        this.agita = 1;
        var c = this.compresor;
        this.particulas.emitir(c.x + 35, c.chimenea, { n: 7, tipos: ["p-polvo"], vel: 70, grav: -60, vida: 1100, escala: 0.8, crece: true, dispersion: 10, angulo: -Math.PI / 2, apertura: 0.8, tintes: [0xffffff, 0xe7f5ff], alfa: 0.8 });
    };

    // ------------------------------------------------------------------ luces, balizas y medidor

    Taller.prototype.crearLuces = function () {
        var s = this.scene;
        this.focos = [];
        var colores = (this.v.luces || ["#ffd43b", "#69db7c", "#4dd4f0", "#ff8787"]).map(D().hexA);
        var xs = [480, 520, 560, 1240, 1280, 1320];
        var self = this;
        xs.forEach(function (x, i) {
            self.focos.push({ img: s.add.image(x, 140, "p-chispa").setDepth(5).setBlendMode(Phaser.BlendModes.ADD).setTint(colores[i % colores.length]).setScale(0.55), fase: i * 0.8, color: colores[i % colores.length] });
        });
        // panel de control: tres lámparas y una palanca
        this.panel = [0xff6b6b, 0xffd43b, 0x51cf66].map(function (c, i) {
            return s.add.image(1360, 530 + i * 38, "p-chispa").setDepth(5).setBlendMode(Phaser.BlendModes.ADD).setTint(c).setScale(0.75);
        });
        this.crearPalanca();
        // balizas giratorias arriba de las ventanas
        this.balizas = [{ x: 210, y: 40 }, { x: 1240, y: 40 }].map(function (b) {
            var cuerpo = s.add.circle(b.x, b.y, 12, 0xffa94d).setDepth(5);
            var haz = s.add.image(b.x, b.y, "p-luz").setDepth(5.2).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffa94d).setScale(1.1, 0.35).setAlpha(0);
            return { cuerpo: cuerpo, haz: haz };
        });
    };

    // ------------------------------------------------------------------ la palanca de marcha
    //
    // Siempre está en el panel de control. Mientras falten piezas está trabada (si el niño la toca
    // tiembla y Zoe avisa); cuando todo está ensamblado brilla, una flecha la señala y al tocarla o
    // bajarla con el dedo la máquina arranca. Avisa con alPalanca / alPalancaBloqueada.

    var PALANCA = { x: 1360, y: 716, largo: 86, off: -0.55, on: 0.8 };

    Taller.prototype.crearPalanca = function () {
        var s = this.scene, self = this;
        var P = PALANCA;
        var cont = s.add.container(P.x, P.y).setDepth(150);
        var brillo = s.add.image(0, -P.largo, "p-luz").setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd43b).setScale(0.9).setAlpha(0);
        var vara = s.add.rectangle(0, 0, 14, P.largo, 0xced4da).setOrigin(0.5, 1).setStrokeStyle(3, 0x495057);
        var pomo = s.add.circle(0, -P.largo, 19, 0xfa5252).setStrokeStyle(4, 0xc92a2a);
        var reflejo = s.add.circle(-6, -P.largo - 6, 6, 0xffffff, 0.75);
        cont.add([brillo, vara, pomo, reflejo]);
        var eje = s.add.circle(P.x, P.y, 13, 0x343a40).setStrokeStyle(3, 0xadb5bd).setDepth(150.1);
        var flecha = s.add.triangle(P.x - 64, P.y - 60, 0, 0, 0, 34, 28, 17, 0xffd43b).setStrokeStyle(4, 0xe67700).setDepth(150.2).setAlpha(0);
        var zona = s.add.zone(P.x, P.y - 46, 130, 190).setDepth(151).setInteractive({ useHandCursor: true });
        zona.on("pointerdown", function () { self.tocarPalanca(); });
        this.palanca = { cont: cont, brillo: brillo, pomo: pomo, eje: eje, flecha: flecha, zona: zona, estado: "off", ang: P.off, obj: P.off, sacude: 0 };
        cont.setRotation(P.off);
    };

    /** on: todas las piezas están puestas y la palanca espera al niño. off: trabada (o ya bajada). */
    Taller.prototype.palancaLista = function (on) {
        var p = this.palanca;
        if (on) { p.estado = "lista"; p.obj = PALANCA.off; }
        else if (p.estado === "lista") p.estado = "off";
    };

    /** Vuelve arriba (nivel nuevo). */
    Taller.prototype.palancaArriba = function () {
        var p = this.palanca;
        p.estado = "off";
        p.obj = PALANCA.off;
    };

    Taller.prototype.tocarPalanca = function () {
        var p = this.palanca;
        if (p.estado === "on") return;
        if (p.estado !== "lista") {
            p.sacude = 1;
            if (typeof this.alPalancaBloqueada === "function") this.alPalancaBloqueada();
            return;
        }
        p.estado = "on";
        p.obj = PALANCA.on;
        var self = this;
        var x = PALANCA.x + Math.sin(PALANCA.on) * PALANCA.largo, y = PALANCA.y - Math.cos(PALANCA.on) * PALANCA.largo;
        this.particulas.emitir(x, y, { n: 12, tipos: ["p-chispa", "p-estrella"], vel: 200, grav: 120, vida: 700, escala: 0.4, sumar: true, tintes: [0xffd43b, 0xffffff, 0xff8787] });
        this.flash(0xffd43b, 1.2);
        setTimeout(function () { if (typeof self.alPalanca === "function") self.alPalanca(); }, 260);
    };

    /** Centro de la zona de la palanca (para la mano del tutorial). */
    Taller.prototype.puntoPalanca = function () {
        return { x: PALANCA.x + Math.sin(PALANCA.off) * PALANCA.largo * 0.85, y: PALANCA.y - Math.cos(PALANCA.off) * PALANCA.largo * 0.85 };
    };

    Taller.prototype.actualizarPalanca = function (dt, ts) {
        var p = this.palanca;
        var k = p.estado === "on" ? Math.min(1, dt / 90) : Math.min(1, dt / 220);
        p.ang += (p.obj - p.ang) * k;
        var temblor = 0;
        if (p.sacude > 0) { p.sacude = Math.max(0, p.sacude - dt / 500); temblor = Math.sin(this.t * 0.08) * 0.09 * p.sacude; }
        var espera = p.estado === "lista";
        // lista: se mueve un poquito hacia abajo, como invitando a bajarla
        var invita = espera ? Math.max(0, Math.sin(ts * 3.2)) * 0.12 : 0;
        p.cont.setRotation(p.ang + temblor + invita);
        var pulso = 0.5 + 0.5 * Math.sin(ts * 5);
        p.brillo.setAlpha(espera ? 0.55 + 0.45 * pulso : (p.estado === "on" ? 0.35 : 0)).setScale(espera ? 0.9 + pulso * 0.35 : 0.8);
        p.pomo.setFillStyle(p.estado === "off" ? 0xc0392b : (espera ? (pulso > 0.5 ? 0xff6b6b : 0xfa5252) : 0x51cf66));
        p.flecha.setAlpha(espera ? 1 : 0).setX(PALANCA.x - 70 + Math.sin(ts * 6) * 8);
    };

    Taller.prototype.crearMedidor = function () {
        var s = this.scene;
        var m = MEDIDOR;
        this.hMedidor = new (M().Horno)(s, m.x0 - 14, m.y0 - 40, m.x1 - m.x0 + 30, m.y1 - m.y0 + 70, { mundo: true, prof: 5 });
        this.hMedidor.pintar(function (g) {
            g.fillStyle(0x0b1d3a, 0.3); g.fillRoundedRect(m.x0 - 4, m.y0 - 28, m.x1 - m.x0 + 14, m.y1 - m.y0 + 50, 18);
            g.fillStyle(0x34495e, 1); g.fillRoundedRect(m.x0 - 8, m.y0 - 34, m.x1 - m.x0 + 16, m.y1 - m.y0 + 50, 18);
            g.fillStyle(0x1b1e2b, 1); g.fillRoundedRect(m.x0, m.y0, m.x1 - m.x0, m.y1 - m.y0, 12);
            for (var i = 1; i < 10; i++) {
                var y = m.y1 - (m.y1 - m.y0) * i / 10;
                g.fillStyle(0xffffff, 0.35); g.fillRect(m.x0 + 4, y, i % 5 ? 8 : 14, 2);
            }
            // rayo
            g.fillStyle(0xffd43b, 1);
            var cx = (m.x0 + m.x1) / 2, cy = m.y0 - 17;
            g.fillPoints([{ x: cx + 3, y: cy - 12 }, { x: cx - 8, y: cy + 2 }, { x: cx - 1, y: cy + 2 }, { x: cx - 4, y: cy + 13 }, { x: cx + 8, y: cy - 3 }, { x: cx + 1, y: cy - 3 }], true, true);
        });
        this.gMedidor = s.add.graphics().setDepth(5.5);
        this.brilloMedidor = s.add.image((m.x0 + m.x1) / 2, m.y0 + 30, "p-luz").setDepth(5.6).setBlendMode(Phaser.BlendModes.ADD).setTint(0x8ce99a).setScale(0.9, 2.6).setAlpha(0);
    };

    Taller.prototype.chispasMedidor = function () {
        var m = MEDIDOR;
        var y = m.y1 - (m.y1 - m.y0) * this.energia;
        this.particulas.emitir((m.x0 + m.x1) / 2, y, { n: 8, tipos: ["p-chispa", "p-estrella"], vel: 140, grav: 60, vida: 700, escala: 0.35, sumar: true, tintes: [0x8ce99a, 0xffd43b, 0xffffff] });
    };

    Taller.prototype.flash = function (color, fuerza) {
        this.destello = Math.max(this.destello, fuerza || 1);
        this.destelloColor = color;
    };

    /** Para la cinemática: chispas de fiesta desde un punto. */
    Taller.prototype.fiesta = function (x, y) {
        this.particulas.emitir(x, y, { n: 14, tipos: ["p-confeti", "p-estrella"], vel: 360, grav: 420, vida: 1500, escala: 0.6, aleteo: true, angulo: -Math.PI / 2, apertura: 2.2, tintes: [0xff6b6b, 0xffd43b, 0x69db7c, 0x4dabf7, 0xb197fc] });
    };

    Taller.prototype.tema = function (indice) {
        // las cajas de la cinta cambian de color con el nivel (variedad sin cambiar nada del juego)
        this.cajas.forEach(function (c, i) { c.img.setTexture("caja-" + ((i + indice * 2) % 6)); });
    };

    // ------------------------------------------------------------------ cuadro a cuadro

    Taller.prototype.update = function (dt, ts) {
        var s = dt / 1000;
        var self = this;
        this.t += dt;
        this.vivo += (this.vivoObj - this.vivo) * Math.min(1, dt / 900);
        this.energiaVis += (Math.max(this.energia, this.vivo) - this.energiaVis) * Math.min(1, dt / 500);
        var e = this.energiaVis;
        var ritmo = 0.35 + e * 0.9 + this.vivo * 1.6;
        if (this.empujon > 0) { this.empujon = Math.max(0, this.empujon - dt / 900); ritmo += this.empujon * 1.4; }

        // ruedas decorativas: la principal gira y las demás siguen con su fase de engrane
        this.grupos.forEach(function (gr, gi) {
            var asoma = gi >= 2 ? self.vivo : 1;
            gr.phi += gr.vel * ritmo * s;
            gr.lista.forEach(function (it, k) {
                var ang = k === 0 ? gr.phi : R().fase(it.padre.def, it.def, it.padre.ang);
                it.ang = ang;
                it.img.setRotation(ang);
                if (gi >= 2) it.img.setAlpha(0.9 * asoma);
            });
        });
        this.lejanas.forEach(function (l) {
            if (l.img) l.img.setRotation((l.fase || 0) + l.s * self.t * 0.0004 * (1 + self.vivo * 2) * (l.s > 0 ? 1 : 1.5));
            if (l.luz) l.luz.setAlpha(0.35 + 0.65 * Math.max(0, Math.sin(ts * 2 + l.fase)));
        });

        // poleas de pared: la correa corre y marca el giro
        this.poleasPared.forEach(function (p, i) {
            p.phi += (i ? -1 : 1) * 0.8 * ritmo * s;
            p.ia.setRotation(p.phi);
            p.ib.setRotation(p.phi * p.a.r / p.b.r);
            var sv = -p.phi * p.a.r;
            var firma = Math.round(sv);
            if (firma !== p.ult) {
                p.ult = firma;
                p.g.clear();
                D().dibujarCorrea(p.g, p.c, sv, { grosor: 7, paso: 16 });
            }
        });

        // bolas del tubo
        var vb = 50 + e * 90 + this.vivo * 190;
        this.bolas.forEach(function (b) {
            b.s += vb * s;
            var p = self.puntoTubo(b.s);
            b.img.setPosition(p.x, p.y);
        });

        // cinta del piso, cajas y rodillos
        var vc = 22 + e * 40 + this.vivo * 120;
        this.cintaX += vc * s;
        this.banda.tilePositionX = -this.cintaX;
        var largo = W + 200;
        this.cajas.forEach(function (c) {
            var x = ((c.x + self.cintaX) % largo + largo) % largo - 100;
            c.img.setPosition(x, CINTA_Y - 38);
        });
        this.rodillos.forEach(function (r) { r.setRotation(self.cintaX / 10); });

        // brazo robótico: toma cajas de la cinta (se apura con la energía)
        var b = this.brazo;
        b.fase += s * (0.7 + e * 0.8 + this.vivo * 1.8);
        var f = b.fase;
        var r1 = -0.62 - Math.sin(f) * 0.3;
        var r2 = 1.0 + Math.sin(f + 1.1) * 0.45;
        b.seg1.setRotation(b.dir > 0 ? r1 : -Math.PI - r1);
        b.seg2.setRotation(b.dir > 0 ? r2 : -r2);
        b.pinza.setRotation((b.dir > 0 ? 1 : -1) * (1.2 - Math.sin(f + 1.1) * 0.2));
        b.luz.setAlpha(0.4 + 0.6 * Math.max(0, Math.sin(f * 3)));

        // compresor: vibra siempre un poquito y fuerte cuando algo no encajó
        var c = this.compresor;
        if (c.sac > 0) c.sac = Math.max(0, c.sac - dt / 700);
        var amp = 0.8 + e * 0.6 + this.vivo * 1.2 + c.sac * 6;
        c.img.setPosition(c.x + Math.sin(this.t * 0.07) * amp, c.y + Math.cos(this.t * 0.09) * amp * 0.4);
        c.vapor -= dt;
        if (c.vapor <= 0) {
            c.vapor = 2600 - this.vivo * 1600 + Math.random() * 1200;
            this.particulas.emitir(c.x + 35, c.chimenea, { n: 2, tipos: ["p-polvo"], vel: 40, grav: -50, vida: 1300, escala: 0.6, crece: true, dispersion: 6, angulo: -Math.PI / 2, apertura: 0.5, tintes: [0xffffff], alfa: 0.6 });
        }

        // focos: parpadeo suave; con la máquina en marcha, una ola de luz
        if (this.destello > 0) this.destello = Math.max(0, this.destello - dt / 700);
        this.focos.forEach(function (fo, i) {
            var a = 0.35 + 0.25 * Math.sin(ts * 1.7 + fo.fase);
            if (self.vivo > 0.05) a = Math.max(a, self.vivo * (0.5 + 0.5 * Math.sin(ts * 7 - i * 0.9)));
            fo.img.setTint(self.destello > 0.3 ? self.destelloColor : fo.color);
            fo.img.setAlpha(Math.min(1, a + self.destello * 0.6));
        });
        if (this.panelVerde > 0) this.panelVerde = Math.max(0, this.panelVerde - dt / 900);
        this.panel[0].setAlpha(0.25 + (c.sac > 0 ? 0.75 * Math.abs(Math.sin(ts * 12)) : 0.15 * Math.sin(ts * 2)));
        this.panel[1].setAlpha(0.3 + 0.5 * Math.max(0, Math.sin(ts * 3.1)) * (0.4 + e));
        this.panel[2].setAlpha(Math.min(1, 0.25 + e * 0.5 + this.panelVerde * 0.6 + this.vivo * 0.4));
        this.actualizarPalanca(dt, ts);
        this.balizas.forEach(function (bz, i) {
            var on = Math.max(self.vivo, self.destello * 0.5);
            bz.haz.setAlpha(on * 0.8).setRotation(ts * 5 + i * Math.PI);
            bz.cuerpo.setFillStyle(on > 0.2 ? 0xffd43b : 0xffa94d);
        });

        // medidor de energía
        var m = MEDIDOR;
        var nivel = Math.min(1, e + Math.sin(ts * 9) * 0.01 * (0.3 + e));
        var hh = (m.y1 - m.y0 - 8) * nivel;
        var col = nivel < 0.4 ? 0xffd43b : (nivel < 0.85 ? 0x94d82d : 0x51cf66);
        var gm = this.gMedidor;
        gm.clear();
        gm.fillStyle(col, 1);
        gm.fillRoundedRect(m.x0 + 18, m.y1 - 4 - hh, m.x1 - m.x0 - 24, Math.max(0, hh), 6);
        gm.fillStyle(0xffffff, 0.35);
        gm.fillRect(m.x0 + 22, m.y1 - 4 - hh, 5, Math.max(0, hh));
        this.brilloMedidor.setY(m.y1 - hh).setAlpha(0.25 + this.vivo * 0.6);

        this.luzGeneral.setAlpha(this.vivo * 0.06 + this.destello * 0.03);
        this.particulas.update(dt);
    };

    Taller.prototype.destruir = function () {
        (this.quitar || []).forEach(function (f) { f(); });
    };

    Taller.MEDIDOR = MEDIDOR;
    global.TallerMaquina = Taller;
})(typeof window !== "undefined" ? window : global);
