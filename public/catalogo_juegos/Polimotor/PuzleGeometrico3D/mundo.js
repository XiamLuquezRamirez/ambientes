/**
 * MundoPuzle — el mundo mágico de la construcción (window.MundoPuzle).
 *
 * Planos de atrás hacia adelante: cielo con sol sonriente y nubes, islas flotantes con casitas
 * geométricas, montañas, bosque del fondo (flores que se encienden), torres y pilares del fondo, pasto con
 * caminos de faroles, grúa pequeña del fondo, máquinas constructoras que llevan bloques, la grúa
 * grande sobre la construcción y la cinta transportadora con su prensa de bloques.
 *
 * Todo se mueve solo (animaciones permanentes suaves) y además escucha EventosPuzle: cada acción
 * del niño tiene una respuesta concreta (la grúa sigue el bloque, la cinta acelera al encajar, se
 * encienden flores, torres, pilares y faroles, las fuentes saltan al completar una capa…).
 */
(function (global) {
    "use strict";

    var M = function () { return global.MotorPuzle; };
    var S = function () { return global.SolidosPuzle; };
    var EV = function () { return global.EventosPuzle; };
    var W = 1600;
    // horizonte alto: deja una franja de pasto amplia para que la obra se vea parada en el suelo
    // (con el horizonte en 560 la losa tocaba los árboles y parecía flotar)
    var HORIZONTE = 455;

    function hexA(c) { return S().hexA(c); }
    function mezclar(a, b, u) { return S().mezclar(a, b, u); }

    function semilla(s) {
        var a = (s >>> 0) || 1;
        return function () {
            a = (a + 0x6D2B79F5) >>> 0;
            var t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    /** Degradado vertical en bandas (sirve en cualquier renderizador). */
    function degradado(g, x, y, w, h, c1, c2, bandas) {
        var n = bandas || 28;
        for (var i = 0; i < n; i++) {
            g.fillStyle(mezclar(c1, c2, i / (n - 1)), 1);
            g.fillRect(x, y + h * i / n, w, h / n + 1);
        }
    }

    // ------------------------------------------------------------------ tonos por nivel

    var TONOS = {
        piramide: { cielo: [0, 0], sol: 0xffe066, brillo: 0 },
        torre: { cielo: [0x8fe3ff, 0xf1fbff], sol: 0xfff3a0, brillo: 0.05 },
        castillo: { cielo: [0x9bb8ff, 0xffe7cc], sol: 0xffd43b, brillo: 0.08 },
        templo: { cielo: [0xb197fc, 0xffd8a8], sol: 0xffc078, brillo: 0.12 }
    };

    function Mundo(scene, variante) {
        var self = this;
        this.scene = scene;
        this.v = variante || {};
        this.rnd = semilla(this.v.semilla || 7);
        this.anim = new (M().Animador)();
        this.t = 0;
        this.clave = "piramide";
        var c = this.v.cielo || {};
        this.colorBase = { arriba: hexA(c.arriba || "#7fd3ff"), abajo: hexA(c.abajo || "#e3f6ff") };
        this.cielo = { arriba: this.colorBase.arriba, abajo: this.colorBase.abajo };
        this.cieloObj = { arriba: this.cielo.arriba, abajo: this.cielo.abajo };
        this.magia = 0;          // 0..1: iluminación especial (al completar y en la cinemática)
        this.magiaObj = 0;
        this.progreso = 0;       // 0..1 de la construcción
        this.velCinta = 46;
        this.velCintaObj = 46;
        this.velCintaBase = 46;
        this.fiesta = false;

        this.crearCielo();
        this.crearSol();
        this.crearNubes();
        this.crearIslas();
        this.crearMontanas();
        this.crearBosque();
        this.crearTorresFondo();
        this.crearSuelo();
        this.crearCaminos();
        this.crearGruaFondo();
        this.crearPilares();
        this.crearMaquinas();
        this.crearGrua();
        this.crearCinta();
        this.particulas = new (M().Particulas)(scene, 90, 640);
        this.ambiente = new (M().Particulas)(scene, 24, 95);
        this.tAmbiente = 0;

        var b = EV();
        this.quitar = [];
        var on = function (n, fn) { if (b) self.quitar.push(b.on(n, fn)); };
        on("bloque_seleccionado", function (d) { self.alSeleccionar(d); });
        on("bloque_arrastrado", function (d) { self.grua.objetivoX = d.x; self.grua.siguiendo = true; });
        on("bloque_cerca_de_posicion", function (d) { self.grua.foco = d.orientacionOk ? 1 : 0.5; self.grua.objetivoX = d.x; });
        on("bloque_lejos", function () { self.grua.foco = 0; });
        on("bloque_rechazado", function () { self.grua.siguiendo = false; self.grua.foco = 0; self.grua.objetivoX = self.grua.reposo; });
        on("bloque_ensamblado", function (d) { self.alEnsamblar(d); });
        on("capa_completada", function (d) { self.alCapa(d); });
        on("construccion_completada", function () { self.alCompletar(); });
    }

    // ------------------------------------------------------------------ cielo, sol y nubes

    Mundo.prototype.crearCielo = function () {
        this.hCielo = new (M().Horno)(this.scene, 0, 0, W, HORIZONTE + 24, { mundo: true, prof: 0 });
        this.arcoiris = this.scene.add.graphics().setDepth(1).setAlpha(0);
        var g = this.arcoiris;
        [0xff6b6b, 0xffa94d, 0xffe066, 0x8ce99a, 0x74c0fc, 0xb197fc].forEach(function (col, i) {
            g.lineStyle(14, col, 0.8);
            g.beginPath();
            g.arc(800, 640, 520 - i * 14, Math.PI, Math.PI * 2, false);
            g.strokePath();
        });
        this.pintarCielo();
    };

    Mundo.prototype.pintarCielo = function () {
        var arriba = mezclar(this.cielo.arriba, 0xffd8a8, this.magia * 0.35);
        var abajo = mezclar(this.cielo.abajo, 0xfff3bf, this.magia * 0.6);
        this.hCielo.pintar(function (g) { degradado(g, 0, 0, W, HORIZONTE + 24, arriba, abajo, 30); });
        this.cieloPintado = { a: this.cielo.arriba, b: this.cielo.abajo, m: this.magia };
    };

    Mundo.prototype.crearSol = function () {
        var s = this.scene;
        var x = 1012, y = 104;
        this.sol = { x: x, y: y, guiño: 0, alegria: 0 };
        this.solLuz = s.add.image(x, y, "p-luz").setDepth(2).setTint(0xffe066).setAlpha(0.75).setScale(2.4).setBlendMode(global.Phaser.BlendModes.ADD);
        this.solRayos = s.add.graphics().setDepth(3).setPosition(x, y);
        var g = this.solRayos;
        for (var i = 0; i < 12; i++) {
            var a = i / 12 * Math.PI * 2;
            var a1 = a - 0.12, a2 = a + 0.12;
            g.fillStyle(i % 2 ? 0xffd43b : 0xffe066, 1);
            g.fillTriangle(Math.cos(a1) * 50, Math.sin(a1) * 50, Math.cos(a2) * 50, Math.sin(a2) * 50, Math.cos(a) * (i % 2 ? 72 : 84), Math.sin(a) * (i % 2 ? 72 : 84));
        }
        this.solDisco = s.add.graphics().setDepth(4).setPosition(x, y);
        g = this.solDisco;
        g.fillStyle(0xf59f00, 1); g.fillCircle(0, 2, 47);
        g.fillStyle(0xffd43b, 1); g.fillCircle(0, 0, 46);
        g.fillStyle(0xffe066, 1); g.fillCircle(-10, -12, 30);
        g.fillStyle(0xff8787, 0.55); g.fillCircle(-24, 12, 8); g.fillCircle(24, 12, 8);
        g.lineStyle(4, 0x8a4b08, 1);
        g.beginPath(); g.arc(0, 8, 16, 0.15 * Math.PI, 0.85 * Math.PI, false); g.strokePath();
        this.solOjos = s.add.graphics().setDepth(5).setPosition(x, y - 6);
        g = this.solOjos;
        g.fillStyle(0x5c3a06, 1); g.fillEllipse(-14, 0, 9, 13); g.fillEllipse(14, 0, 9, 13);
        g.fillStyle(0xffffff, 1); g.fillCircle(-12, -3, 2.4); g.fillCircle(16, -3, 2.4);
    };

    Mundo.prototype.crearNubes = function () {
        var s = this.scene, r = this.rnd;
        this.nubes = [];
        for (var i = 0; i < 7; i++) {
            var g = s.add.graphics().setDepth(6 + (i % 2));
            var k = 0.55 + r() * 0.6;
            g.fillStyle(0xdbe4ff, 0.9);
            g.fillEllipse(0, 14, 170, 34);
            g.fillStyle(0xffffff, 1);
            g.fillCircle(-46, 4, 26); g.fillCircle(-10, -12, 36); g.fillCircle(32, -2, 30); g.fillCircle(62, 8, 20);
            g.fillEllipse(0, 12, 160, 30);
            g.setScale(k);
            g.setPosition(-120 + r() * 1800, 70 + r() * 300);
            g.setAlpha(0.78 + r() * 0.22);
            this.nubes.push({ g: g, vel: 6 + r() * 12, k: k });
        }
    };

    // ------------------------------------------------------------------ islas flotantes

    Mundo.prototype.crearIslas = function () {
        var s = this.scene, r = this.rnd, self = this;
        var techo = hexA(this.v.techo || "#ff6b6b");
        var arbol = hexA(this.v.arbol || "#51cf66");
        var sitios = [
            { x: 600, y: 196, k: 0.8 },
            { x: 1060, y: 236, k: 0.95 },
            { x: 770, y: 118, k: 0.5 }
        ];
        this.islas = sitios.map(function (p, i) {
            var c = s.add.container(p.x, p.y).setDepth(8 + i * 0.1);
            var g = s.add.graphics();
            var w = 150;
            g.fillStyle(0x8d6e63, 1);
            g.fillPoints([{ x: -w / 2, y: 0 }, { x: w / 2, y: 0 }, { x: 34, y: 40 }, { x: 6, y: 86 }, { x: -24, y: 46 }], true, true);
            g.fillStyle(0x6d4c41, 1);
            g.fillPoints([{ x: 6, y: 0 }, { x: w / 2, y: 0 }, { x: 34, y: 40 }, { x: 6, y: 86 }], true, true);
            g.fillStyle(0x94d82d, 1);
            g.fillEllipse(0, 0, w + 10, 32);
            g.fillStyle(0xc0eb75, 1);
            g.fillEllipse(-10, -4, w - 30, 18);
            // cascadita en la isla grande
            if (i === 1) { g.fillStyle(0x74c0fc, 0.85); g.fillRect(44, 4, 8, 60); g.fillStyle(0xd0ebff, 0.9); g.fillRect(46, 4, 3, 60); }
            c.add(g);
            // casita geométrica: cubo + techo de prisma, o torre cilíndrica con cono
            var casa;
            if (i % 2 === 0) {
                casa = solido(s, { tipo: "caja", w: 1, d: 1, h: 0.9 }, 0, { esc: 0.62, color: "#fff4e6", deco: "puntos" });
                var techoG = solido(s, { tipo: "prisma", w: 1.1, d: 1.1, h: 0.7 }, 0, { esc: 0.62, color: techo });
                techoG.setPosition(-22, -44);
                casa.setPosition(-22, -20);
                c.add([casa, techoG]);
            } else {
                casa = solido(s, { tipo: "cilindro", w: 0.8, d: 0.8, h: 1.4 }, 0, { esc: 0.62, color: "#e7f5ff", deco: "rayas" });
                var cono = solido(s, { tipo: "cono", w: 0.95, d: 0.95, h: 0.9 }, 0, { esc: 0.62, color: techo });
                casa.setPosition(-26, -30);
                cono.setPosition(-26, -70);
                c.add([casa, cono]);
            }
            // árbol redondo
            var t = s.add.graphics();
            t.fillStyle(0x8d6e63, 1); t.fillRect(-4, -26, 8, 26);
            t.fillStyle(mezclar(arbol, 0x000000, 0.18), 1); t.fillCircle(2, -38, 22);
            t.fillStyle(arbol, 1); t.fillCircle(-2, -42, 20);
            t.fillStyle(0xffffff, 0.3); t.fillCircle(-9, -50, 7);
            t.setPosition(36 - r() * 10, -2);
            c.add(t);
            // farolito de cristal que se enciende con los aciertos
            var luz = s.add.image(-56, -18, "p-luz").setTint(0xfff3bf).setAlpha(0.15).setScale(0.5).setBlendMode(global.Phaser.BlendModes.ADD);
            var cristal = s.add.graphics();
            cristal.fillStyle(0x845ef7, 1);
            cristal.fillPoints([{ x: -56, y: -30 }, { x: -50, y: -18 }, { x: -56, y: -6 }, { x: -62, y: -18 }], true, true);
            c.add([luz, cristal]);
            c.setScale(p.k);
            return { c: c, base: p.y, fase: r() * 6, luz: luz, brillo: 0, x: p.x };
        });
        this.islas.forEach(function (isla) { isla.c.x = isla.x; });
        self.islasListas = true;
    };

    // ------------------------------------------------------------------ montañas y bosque

    Mundo.prototype.crearMontanas = function () {
        var horno = new (M().Horno)(this.scene, 0, 200, W, HORIZONTE + 60 - 200, { mundo: true, prof: 10 });
        var g = { capas: [] };
        var c = this.v.cielo || {};
        var lejos = hexA(c.monte2 || "#c4e8c2"), cerca = hexA(c.monte || "#9ad4a8");
        var r = this.rnd;
        var cima = function (col, base, alt, n, desfase) {
            var pts = [{ x: 0, y: base + 40 }];
            for (var i = 0; i <= n; i++) {
                var x = i / n * W;
                var y = base - alt * (0.55 + 0.45 * Math.abs(Math.sin(i * 1.7 + desfase))) - r() * 20;
                pts.push({ x: x - W / n / 2, y: base });
                pts.push({ x: x, y: y });
            }
            pts.push({ x: W, y: base }, { x: W, y: base + 40 });
            g.capas.push({ col: col, pts: pts });
        };
        cima(lejos, HORIZONTE - 18, 120, 7, 0.6);
        cima(cerca, HORIZONTE, 70, 9, 2.1);
        horno.pintar(function (q) {
            g.capas.forEach(function (m) { q.fillStyle(m.col, 1); q.fillPoints(m.pts, true, true); });
        });
        this.hMontes = horno;
    };

    /**
     * Bosque del fondo: una franja continua de árboles redondos, pinos y arbustos parada sobre el
     * horizonte, de borde a borde (encima del pasto, prof. 15.2, para que no quede cortada). En el
     * centro, detrás de la obra, es más bajita. Las flores de los arbustos son las luces que se
     * encienden con la torre.
     */
    Mundo.prototype.crearBosque = function () {
        var s = this.scene, r = this.rnd, self = this;
        var verde = hexA(this.v.arbol || "#51cf66");
        var verdes = [verde, mezclar(verde, 0x2b8a3e, 0.45), mezclar(verde, 0x94d82d, 0.5), mezclar(verde, 0x0ca678, 0.4)];
        var flores = [0xff8787, 0xffffff, 0xf783ac, 0xda77f2, 0xffa8a8];
        var arboles = [], arbustos = [];
        for (var x = -10 + r() * 16; x < W + 30; x += 30 + r() * 22) {
            var centro = Math.abs(x - 812) < 190;
            var k = centro ? 0.55 + r() * 0.25 : 0.8 + r() * 0.55;
            arboles.push({ x: x, y: HORIZONTE + 2 + r() * 4, k: k, tipo: r() < 0.4 ? "pino" : "redondo", col: elegir(verdes, r) });
        }
        for (var x2 = 6 + r() * 20; x2 < W + 20; x2 += 46 + r() * 30) {
            arbustos.push({ x: x2, y: HORIZONTE + 10 + r() * 5, k: 0.7 + r() * 0.5, col: elegir(verdes, r) });
        }
        this.flores = [];
        arbustos.forEach(function (a) {
            var n = 2 + Math.floor(r() * 2);
            for (var i = 0; i < n; i++) {
                self.flores.push({ x: a.x + (r() - 0.5) * 34 * a.k, y: a.y - 8 * a.k - r() * 14 * a.k, r: 3.2 + r() * 1.6, col: elegir(flores, r), luz: 0, obj: 0 });
            }
        });
        this.hBosque = new (M().Horno)(s, 0, HORIZONTE - 170, W, 210, { mundo: true, prof: 15.2 });
        this.hBosque.pintar(function (g) {
            arboles.sort(function (a, b) { return a.y - b.y; }).forEach(function (a) { self.dibujarArbol(g, a); });
            arbustos.forEach(function (a) { self.dibujarArbusto(g, a); });
        });
        this.hFlores = new (M().Horno)(s, 0, HORIZONTE - 170, W, 210, { mundo: true, prof: 15.4 });
        this.flores = R().barajar(this.flores, this.rnd);
        this.pintarFlores();
    };

    function elegir(lista, r) { return lista[Math.floor(r() * lista.length) % lista.length]; }

    Mundo.prototype.dibujarArbol = function (g, a) {
        var k = a.k, x = a.x, y = a.y;
        var oscuro = mezclar(a.col, 0x000000, 0.22), claro = mezclar(a.col, 0xffffff, 0.3);
        g.fillStyle(0x000000, 0.08); g.fillEllipse(x + 4 * k, y + 2, 40 * k, 8 * k);
        g.fillStyle(0x8d6e63, 1); g.fillRect(x - 4 * k, y - 22 * k, 8 * k, 22 * k);
        if (a.tipo === "pino") {
            [[0, 46, 26], [-20, 38, 20], [-38, 28, 14]].forEach(function (t) {
                var base = y - 16 * k + t[0] * k;
                g.fillStyle(oscuro, 1);
                g.fillTriangle(x - t[1] / 2 * k, base, x + t[1] / 2 * k, base, x, base - t[2] * k * 1.4);
                g.fillStyle(a.col, 1);
                g.fillTriangle(x - t[1] / 2 * k, base, x + 2 * k, base, x, base - t[2] * k * 1.4);
            });
        } else {
            g.fillStyle(oscuro, 1); g.fillCircle(x + 3 * k, y - 34 * k, 22 * k);
            g.fillStyle(a.col, 1); g.fillCircle(x - 2 * k, y - 38 * k, 20 * k);
            g.fillCircle(x - 13 * k, y - 28 * k, 12 * k);
            g.fillStyle(claro, 0.55); g.fillCircle(x - 8 * k, y - 46 * k, 7 * k);
        }
    };

    Mundo.prototype.dibujarArbusto = function (g, a) {
        var k = a.k, x = a.x, y = a.y;
        g.fillStyle(mezclar(a.col, 0x000000, 0.2), 1);
        g.fillCircle(x + 9 * k, y - 8 * k, 11 * k);
        g.fillStyle(a.col, 1);
        g.fillCircle(x - 10 * k, y - 7 * k, 10 * k);
        g.fillCircle(x, y - 12 * k, 13 * k);
        g.fillRect(x - 18 * k, y - 8 * k, 34 * k, 8 * k);
        g.fillStyle(mezclar(a.col, 0xffffff, 0.3), 0.5); g.fillCircle(x - 4 * k, y - 18 * k, 5 * k);
    };

    function R() { return global.ReglasPuzle; }

    /** Sólido fijo del decorado, horneado una vez en una textura (imagen con el ancla en su origen). */
    function solido(scene, def, orient, op) {
        var so = new (M().Solido)(scene, def, op.esc || 1, 8);
        so.pintar(orient, op);
        return so.img;
    }

    /** Las flores se hornean solo cuando cambia su luz (en pasos de 0.1): encendidas brillan doradas. */
    Mundo.prototype.pintarFlores = function () {
        var firma = this.flores.map(function (v) { return Math.round(v.luz * 10); }).join(",");
        if (firma === this.firmaFlores) return;
        this.firmaFlores = firma;
        var self = this;
        this.hFlores.pintar(function (g) {
            self.flores.forEach(function (v) {
                var u = Math.round(v.luz * 10) / 10;
                if (u > 0) { g.fillStyle(0xfff3bf, 0.35 * u); g.fillCircle(v.x, v.y, v.r * (1.6 + u)); }
                g.fillStyle(mezclar(v.col, 0xffe066, u), 1);
                for (var p = 0; p < 5; p++) {
                    var an = p / 5 * Math.PI * 2;
                    g.fillCircle(v.x + Math.cos(an) * v.r * 0.7, v.y + Math.sin(an) * v.r * 0.7, v.r * 0.6);
                }
                g.fillStyle(u > 0.5 ? 0xffffff : 0xffd43b, 1); g.fillCircle(v.x, v.y, v.r * 0.45);
            });
        });
    };

    /** Torres del fondo (castillo) y su bandera: se encienden cuando el niño pone las del castillo. */
    Mundo.prototype.crearTorresFondo = function () {
        var s = this.scene;
        var techo = hexA(this.v.techo || "#ff6b6b");
        this.torres = [[700, HORIZONTE - 8], [925, HORIZONTE - 12]].map(function (p) {
            var c = s.add.container(p[0], p[1]).setDepth(15.1);
            var cuerpo = solido(s, { tipo: "cilindro", w: 0.8, d: 0.8, h: 2.2 }, 0, { esc: 0.6, color: "#e9ecef", deco: "ladrillos" });
            var cono = solido(s, { tipo: "cono", w: 1, d: 1, h: 1 }, 0, { esc: 0.6, color: techo });
            cono.setPosition(0, -62);
            var brillo = s.add.image(0, -10, "p-luz").setTint(0xffe066).setAlpha(0).setScale(1.2).setBlendMode(global.Phaser.BlendModes.ADD);
            var bandera = s.add.graphics();
            bandera.lineStyle(3, 0x495057, 1); bandera.lineBetween(0, -92, 0, -126);
            bandera.fillStyle(techo, 1); bandera.fillTriangle(0, -126, 26, -118, 0, -110);
            bandera.setAlpha(0);
            c.add([brillo, cuerpo, cono, bandera]);
            return { c: c, brillo: brillo, bandera: bandera, luz: 0, obj: 0 };
        });
        this.torres.forEach(function (t) { t.c.setAlpha(0); });
    };

    // ------------------------------------------------------------------ suelo y caminos

    Mundo.prototype.crearSuelo = function () {
        var self = this;
        this.hSuelo = new (M().Horno)(this.scene, 0, HORIZONTE - 6, W, 900 - HORIZONTE + 6, { mundo: true, prof: 15 });
        this.hSuelo.pintar(function (g) { self.pintarSuelo(g); });
        // los árboles grandes van en su propia capa, delante del bosque del fondo
        this.hArboles = new (M().Horno)(this.scene, 440, HORIZONTE, 760, 120, { mundo: true, prof: 15.6 });
        this.hArboles.pintar(function (g) { self.pintarArboles(g); });
    };

    Mundo.prototype.pintarSuelo = function (g) {
        var c = this.v.cielo || {};
        var p1 = hexA(c.pasto || "#8fd16a"), p2 = hexA(c.pasto2 || "#6fbf4f");
        degradado(g, 0, HORIZONTE - 4, W, 900 - HORIZONTE + 4, mezclar(p1, 0xffffff, 0.12), p2, 18);
        // matas y florecitas
        var r = this.rnd;
        for (var i = 0; i < 46; i++) {
            var x = r() * W, y = HORIZONTE + 30 + r() * 320;
            g.fillStyle(mezclar(p2, 0x000000, 0.12), 0.6);
            g.fillEllipse(x, y, 24 + r() * 26, 8);
            if (r() < 0.4) {
                g.fillStyle([0xff8787, 0xffe066, 0xffffff, 0xda77f2][i % 4], 1);
                g.fillCircle(x + 6, y - 4, 3.5);
            }
        }
    };

    Mundo.prototype.pintarArboles = function (g) {
        // árboles redondos del fondo
        var arbol = hexA(this.v.arbol || "#51cf66");
        [[488, HORIZONTE + 92, 0.8], [1135, HORIZONTE + 92, 0.8]].forEach(function (a) {
            g.fillStyle(0x8d6e63, 1); g.fillRect(a[0] - 5 * a[2], a[1] - 30 * a[2], 10 * a[2], 32 * a[2]);
            g.fillStyle(mezclar(arbol, 0x000000, 0.2), 1); g.fillCircle(a[0] + 4 * a[2], a[1] - 44 * a[2], 28 * a[2]);
            g.fillStyle(arbol, 1); g.fillCircle(a[0], a[1] - 48 * a[2], 26 * a[2]);
            g.fillStyle(0xffffff, 0.25); g.fillCircle(a[0] - 9 * a[2], a[1] - 58 * a[2], 9 * a[2]);
        });
    };

    /** Dos caminos de baldosas desde la plataforma hacia los lados, con faroles que se encienden. */
    // camino de atrás (entre el bosque y la obra, por donde van los camiones) y dos senderos que
    // bajan desde él por los costados de la losa
    var CAMINO_Y = HORIZONTE + 44;
    var TRAMOS = [
        [[380, CAMINO_Y + 2], [800, CAMINO_Y], [1240, CAMINO_Y - 2]],
        [[625, 712], [565, 640], [535, 575], [560, CAMINO_Y]],
        [[1000, 712], [1060, 640], [1085, 575], [1060, CAMINO_Y]]
    ];

    Mundo.prototype.crearCaminos = function () {
        var s = this.scene;
        var horno = new (M().Horno)(s, 340, HORIZONTE + 20, 920, 900 - HORIZONTE - 20, { mundo: true, prof: 16 });
        // salen de los costados de la obra y se alejan hacia el bosque (por ahí van los camiones)
        var tramos = TRAMOS;
        horno.pintar(function (g) {
            tramos.forEach(function (t) {
                g.lineStyle(30, 0xe9d8a6, 1);
                g.strokePoints(t.map(function (p) { return { x: p[0], y: p[1] }; }), false, false);
                g.lineStyle(20, 0xf8efd4, 1);
                g.strokePoints(t.map(function (p) { return { x: p[0], y: p[1] }; }), false, false);
            });
        });
        this.gFaroles = s.add.graphics().setDepth(17);
        this.faroles = [];
        var self = this;
        tramos.forEach(function (t, k) {
            if (k === 0) return;
            var lado = k - 1;
            t.forEach(function (p, i) {
                if (i === 0 || i === t.length - 1) return;
                self.faroles.push({ x: p[0] + (lado ? 14 : -14), y: p[1] - 18, luz: 0, obj: 0, orden: i * 2 + lado });
            });
        });
        this.faroles.sort(function (a, b) { return a.orden - b.orden; });
        this.luzFaroles = s.add.graphics().setDepth(17.5).setBlendMode(global.Phaser.BlendModes.ADD);
    };

    Mundo.prototype.pintarFaroles = function (ts) {
        var g = this.gFaroles, l = this.luzFaroles;
        g.clear(); l.clear();
        this.faroles.forEach(function (f) {
            g.fillStyle(0x495057, 1);
            g.fillRect(f.x - 2, f.y, 4, 22);
            g.fillStyle(0x343a40, 1);
            g.fillRoundedRect(f.x - 7, f.y - 12, 14, 14, 4);
            var c = mezclar(0x868e96, 0xffe066, f.luz);
            g.fillStyle(c, 1);
            g.fillCircle(f.x, f.y - 5, 5);
            if (f.luz > 0.05) {
                l.fillStyle(0xffe066, 0.18 * f.luz * (0.85 + 0.15 * Math.sin(ts * 5 + f.x)));
                l.fillCircle(f.x, f.y - 5, 18);
            }
        });
    };

    // ------------------------------------------------------------------ grúa del fondo

    Mundo.prototype.crearGruaFondo = function () {
        var s = this.scene;
        var c = s.add.container(1132, HORIZONTE + 4).setDepth(13).setScale(0.62);
        var g = s.add.graphics();
        g.fillStyle(0xfab005, 1);
        g.fillRect(-8, -200, 16, 200);
        g.lineStyle(2, 0xe67700, 1);
        for (var y = -200; y < 0; y += 20) { g.lineBetween(-8, y, 8, y + 20); g.lineBetween(8, y, -8, y + 20); }
        c.add(g);
        var brazo = s.add.container(0, -200);
        var b = s.add.graphics();
        b.fillStyle(0xfab005, 1);
        b.fillRect(-60, -8, 200, 12);
        b.fillStyle(0x495057, 1);
        b.fillRect(-70, -12, 24, 22);
        b.lineStyle(2, 0x495057, 1);
        b.lineBetween(110, 4, 110, 70);
        b.fillStyle(0x4dabf7, 1);
        b.fillRect(96, 70, 28, 22);
        brazo.add(b);
        c.add(brazo);
        this.gruaFondo = { c: c, brazo: brazo };
    };

    // ------------------------------------------------------------------ pilares y fuentes (templo)

    Mundo.prototype.crearPilares = function () {
        var s = this.scene;
        this.pilares = [[560, 708], [1060, 708]].map(function (p, i) {
            var c = s.add.container(p[0], p[1]).setDepth(18);
            var pila = s.add.graphics();
            pila.fillStyle(0x74c0fc, 1); pila.fillEllipse(0, 20, 110, 30);
            pila.fillStyle(0xd0ebff, 1); pila.fillEllipse(0, 16, 88, 20);
            pila.lineStyle(4, 0x1971c2, 1); pila.strokeEllipse(0, 20, 110, 30);
            var col = solido(s, { tipo: "cilindro", w: 0.5, d: 0.5, h: 3 }, 0, { esc: 0.75, color: "#f8f0fc", deco: "rayas" });
            col.setPosition(0, -42);
            var cristal = solido(s, { tipo: "piramide", w: 0.6, d: 0.6, h: 0.7 }, 0, { esc: 0.75, color: "#b197fc" });
            cristal.setPosition(0, -110);
            var brillo = s.add.image(0, -104, "p-luz").setTint(0xd0bfff).setAlpha(0).setScale(0.9).setBlendMode(global.Phaser.BlendModes.ADD);
            c.add([pila, col, cristal, brillo]);
            c.setAlpha(0);
            return { c: c, brillo: brillo, luz: 0, obj: 0, chorro: 0, x: p[0], y: p[1] };
        });
    };

    // ------------------------------------------------------------------ máquinas constructoras

    Mundo.prototype.crearMaquinas = function () {
        var s = this.scene;
        var colores = this.v.color || {};
        var claves = Object.keys(colores);
        var c0 = claves.length ? colores[claves[0]] : "#ffa94d";
        var c1 = claves.length > 1 ? colores[claves[1]] : "#4dabf7";
        var est = this.v.estacion || {};
        var cuerpoCol = hexA(est.marco || "#ff922b");
        // cada camión va y viene por su camino, fuera de la losa (antes pasaban por debajo de ella)
        this.maquinas = [{ a: [470, CAMINO_Y - 6], b: [780, CAMINO_Y - 8], carga: c0 }, { a: [830, CAMINO_Y - 8], b: [1130, CAMINO_Y - 10], carga: c1 }].map(function (m, i) {
            m.x0 = Math.min(m.a[0], m.b[0]); m.x1 = Math.max(m.a[0], m.b[0]);
            var yDe = function (x) { var u = (x - m.a[0]) / (m.b[0] - m.a[0]); return m.a[1] + (m.b[1] - m.a[1]) * u; };
            m.y = yDe(m.x0);
            var c = s.add.container(m.x0, m.y).setDepth(20);
            var g = s.add.graphics();
            // carrocería con cabina
            g.fillStyle(0x343a40, 1); g.fillEllipse(0, 18, 76, 12);
            g.fillStyle(cuerpoCol, 1); g.fillRoundedRect(-34, -8, 68, 22, 6);
            g.fillStyle(mezclar(cuerpoCol, 0xffffff, 0.3), 1); g.fillRoundedRect(8, -30, 26, 24, 5);
            g.fillStyle(0xa5d8ff, 1); g.fillRoundedRect(13, -26, 16, 12, 3);
            g.lineStyle(3, mezclar(cuerpoCol, 0x000000, 0.45), 1); g.strokeRoundedRect(-34, -8, 68, 22, 6);
            c.add(g);
            var ruedas = [-20, 20].map(function (x) {
                var r = s.add.graphics();
                r.fillStyle(0x212529, 1); r.fillCircle(0, 0, 10);
                r.fillStyle(0xadb5bd, 1); r.fillCircle(0, 0, 4);
                r.fillStyle(0xffffff, 1); r.fillRect(-1, -9, 2, 6);
                r.setPosition(x, 16);
                c.add(r);
                return r;
            });
            var carga = solido(s, { tipo: i ? "cilindro" : "caja", w: 0.7, d: 0.7, h: 0.6 }, 0, { esc: 0.7, color: m.carga });
            carga.setPosition(-14, -22);
            c.add(carga);
            var faro = s.add.image(i ? 38 : -38, 0, "p-luz").setTint(0xfff3bf).setAlpha(0.25).setScale(0.45).setBlendMode(global.Phaser.BlendModes.ADD);
            c.add(faro);
            return { c: c, ruedas: ruedas, carga: carga, faro: faro, x0: m.x0, x1: m.x1, y: m.y, yDe: yDe, x: m.x0 + (m.x1 - m.x0) * (i ? 0.7 : 0.2), dir: i ? -1 : 1, salto: 0, vel: 26, festejo: 0 };
        });
    };

    // ------------------------------------------------------------------ grúa grande

    Mundo.prototype.crearGrua = function () {
        var s = this.scene;
        var mx = 1088, y0 = 742, top = 150;
        var c = s.add.container(0, 0).setDepth(170);
        var mastil = s.add.graphics();
        mastil.fillStyle(0x495057, 1); mastil.fillRect(mx - 30, y0 - 6, 60, 18);
        mastil.fillStyle(0xfab005, 1); mastil.fillRect(mx - 12, top, 24, y0 - top);
        mastil.lineStyle(3, 0xe67700, 1);
        for (var y = top; y < y0 - 20; y += 26) { mastil.lineBetween(mx - 12, y, mx + 12, y + 26); mastil.lineBetween(mx + 12, y, mx - 12, y + 26); }
        mastil.strokeRect(mx - 12, top, 24, y0 - top);
        c.add(mastil);
        // cabina
        var cabina = s.add.graphics();
        cabina.fillStyle(0xff922b, 1); cabina.fillRoundedRect(mx - 26, top + 6, 52, 40, 8);
        cabina.fillStyle(0xa5d8ff, 1); cabina.fillRoundedRect(mx - 18, top + 12, 24, 18, 4);
        cabina.lineStyle(3, 0xc25e0a, 1); cabina.strokeRoundedRect(mx - 26, top + 6, 52, 40, 8);
        c.add(cabina);
        // brazo (pluma) que puede levantarse en las celebraciones
        var pluma = s.add.container(mx, top);
        var p = s.add.graphics();
        p.fillStyle(0xfab005, 1); p.fillRect(-540, -14, 620, 16);
        p.lineStyle(3, 0xe67700, 1);
        for (var x = -540; x < 80; x += 28) { p.lineBetween(x, -14, x + 28, 2); p.lineBetween(x + 28, -14, x, 2); }
        p.strokeRect(-540, -14, 620, 16);
        p.fillStyle(0x495057, 1); p.fillRect(40, -24, 46, 36);
        p.fillStyle(0xff6b6b, 1); p.fillCircle(-540, -6, 6);
        pluma.add(p);
        var carro = s.add.container(-300, 2);
        var cg = s.add.graphics();
        cg.fillStyle(0x495057, 1); cg.fillRoundedRect(-18, 0, 36, 14, 4);
        carro.add(cg);
        var cable = s.add.graphics();
        carro.add(cable);
        var gancho = s.add.graphics();
        gancho.fillStyle(0x343a40, 1); gancho.fillRoundedRect(-14, 0, 28, 14, 4);
        gancho.lineStyle(5, 0x868e96, 1);
        gancho.beginPath(); gancho.arc(0, 26, 10, -Math.PI * 0.1, Math.PI * 1.1, false); gancho.strokePath();
        var lampara = s.add.image(0, 8, "p-luz").setTint(0xffe066).setAlpha(0).setScale(0.6).setBlendMode(global.Phaser.BlendModes.ADD);
        carro.add([gancho, lampara]);
        pluma.add(carro);
        c.add(pluma);
        this.grua = {
            c: c, pluma: pluma, carro: carro, cable: cable, gancho: gancho, lampara: lampara,
            mx: mx, top: top, x: 800, objetivoX: 800, reposo: 860, largo: 110, largoObj: 110,
            siguiendo: false, foco: 0, alza: 0, alzaObj: 0, baile: 0
        };
        this.grua.x = this.grua.reposo;
    };

    // ------------------------------------------------------------------ cinta transportadora y prensa

    Mundo.prototype.crearCinta = function () {
        var s = this.scene;
        var x0 = 528, x1 = 1040, y = 772;
        var g = s.add.graphics().setDepth(180);
        g.fillStyle(0x343a40, 1); g.fillRoundedRect(x0 - 10, y - 4, x1 - x0 + 20, 26, 13);
        g.fillStyle(0x495057, 1); g.fillRect(x0, y, x1 - x0, 16);
        for (var px = x0 + 20; px < x1; px += 120) { g.fillStyle(0x868e96, 1); g.fillRect(px - 4, y + 20, 8, 22); }
        this.gCintaMarcas = s.add.graphics().setDepth(181);
        this.cinta = { x0: x0, x1: x1, y: y, fase: 0 };
        // bloques decorativos que viajan por la cinta
        var colores = this.v.color || {};
        var claves = Object.keys(colores);
        var tipos = ["caja", "cilindro", "prisma", "caja", "piramide", "caja"];
        this.bloquesCinta = tipos.map(function (t, i) {
            var b = solido(s, { tipo: t, w: 0.6, d: 0.6, h: 0.55 }, i % 2, { esc: 0.62, color: claves.length ? colores[claves[(i * 3) % claves.length]] : "#ffa94d", deco: i % 2 ? "puntos" : "liso" }).setDepth(182);
            return { g: b, x: x0 + 30 + i * 85, y: y - 14 };
        });
        // prensa de bloques al final
        var pr = s.add.container(1078, y - 4).setDepth(183);
        var cuerpo = s.add.graphics();
        cuerpo.fillStyle(0x5c7cfa, 1); cuerpo.fillRoundedRect(-36, -70, 72, 92, 10);
        cuerpo.fillStyle(0x364fc7, 1); cuerpo.fillRoundedRect(-36, 6, 72, 18, 6);
        cuerpo.fillStyle(0xdbe4ff, 1); cuerpo.fillRoundedRect(-26, -60, 52, 20, 5);
        cuerpo.lineStyle(3, 0x23338a, 1); cuerpo.strokeRoundedRect(-36, -70, 72, 92, 10);
        var piston = s.add.graphics();
        piston.fillStyle(0xadb5bd, 1); piston.fillRect(-6, -36, 12, 26);
        piston.fillStyle(0x495057, 1); piston.fillRoundedRect(-20, -12, 40, 10, 3);
        var foco = s.add.graphics();
        this.prensaLuces = [-18, 0, 18].map(function (x) { return { x: x, y: -50, luz: 0 }; });
        pr.add([cuerpo, piston, foco]);
        this.prensa = { c: pr, piston: piston, foco: foco, golpe: 0, ciclo: 0 };
    };

    // ------------------------------------------------------------------ tema del nivel

    Mundo.prototype.tema = function (clave) {
        this.clave = clave || "piramide";
        var t = TONOS[this.clave] || TONOS.piramide;
        if (t.cielo[0]) {
            this.cieloObj = { arriba: mezclar(this.colorBase.arriba, t.cielo[0], 0.6), abajo: mezclar(this.colorBase.abajo, t.cielo[1], 0.6) };
        } else {
            this.cieloObj = { arriba: this.colorBase.arriba, abajo: this.colorBase.abajo };
        }
        this.solLuz.setTint(t.sol);
        this.magiaObj = 0;
        this.progreso = 0;
        this.velCintaBase = this.clave === "torre" ? 40 : 46;
        this.velCintaObj = this.velCintaBase;
        var torresVis = this.clave === "castillo" || this.clave === "templo";
        this.torres.forEach(function (tt) { tt.obj = 0; tt.visObj = torresVis ? 1 : 0; tt.bandera.setAlpha(0); });
        this.pilares.forEach(function (p) { p.obj = 0; p.visObj = this.clave === "templo" ? 1 : 0; }, this);
        this.flores.forEach(function (v) { v.obj = 0; });
        this.faroles.forEach(function (f) { f.obj = 0; });
        this.grua.alzaObj = 0;
        this.grua.baile = 0;
        this.fiesta = false;
        this.arcoiris.setAlpha(0);
        this.floresEncendidas = 0;
    };

    /** Al comenzar: la base del escenario se ilumina y las máquinas se ponen en marcha. */
    Mundo.prototype.arranque = function () {
        var self = this;
        this.velCinta = 140;
        this.maquinas.forEach(function (m) { m.salto = 1; m.vel = 60; });
        this.particulas.emitir(810, 720, { n: 14, tipos: ["p-chispa", "p-estrella"], vel: 220, grav: -40, vida: 900, escala: 0.45, dispersion: 260, dispersionY: 30, sumar: true, tintes: [0xffe066, 0xffffff] });
        setTimeout(function () { self.maquinas.forEach(function (m) { m.vel = 26; }); }, 1600);
    };

    // ------------------------------------------------------------------ reacciones

    Mundo.prototype.alSeleccionar = function () {
        // la grúa se prepara: el gancho sube y la lámpara parpadea
        this.grua.largoObj = 70;
        this.grua.lamparaFlash = 1;
        this.prensaLuces.forEach(function (l) { l.luz = 1; });
    };

    Mundo.prototype.alEnsamblar = function (d) {
        var self = this;
        var gr = this.grua;
        gr.siguiendo = false;
        gr.foco = 0;
        gr.objetivoX = d.x;
        // el gancho baja hacia la pieza y vuelve a subir
        this.anim.agregar(900, function (u) { gr.largoObj = 70 + Math.sin(u * Math.PI) * Math.max(40, (d.y - gr.top) * 0.55); }).then(function () {
            gr.largoObj = 110;
            gr.objetivoX = gr.reposo;
        });
        this.velCinta = 220;
        this.prensa.golpe = 1;
        this.prensaLuces.forEach(function (l) { l.luz = 1; });
        this.maquinas.forEach(function (m) { m.salto = 1; });
        this.progreso = d.total ? d.colocadas / d.total : 0;
        var n = Math.round(this.progreso * this.faroles.length);
        this.faroles.forEach(function (f, i) { f.obj = i < n ? 1 : 0; });
        var isla = this.islas[(d.colocadas || 0) % this.islas.length];
        if (isla) isla.brillo = 1;
        // respuestas propias de cada construcción
        if (this.clave === "torre") {
            var por = Math.ceil(this.flores.length / Math.max(1, d.total || 6));
            this.floresEncendidas = Math.min(this.flores.length, (this.floresEncendidas || 0) + por);
            this.flores.forEach(function (v, i) { v.obj = i < self.floresEncendidas ? 1 : 0; });
        }
        if (this.clave === "castillo" && /^torre-/.test(d.destino || "")) {
            var t = this.torres[d.destino === "torre-izq" ? 0 : 1];
            if (t) { t.obj = 1; this.particulas.emitir(t.c.x, t.c.y - 40, { n: 10, tipos: ["p-estrella"], vel: 160, grav: 60, vida: 900, escala: 0.4, sumar: true, tintes: [0xffe066] }); }
        }
        if (this.clave === "templo" && /^columna-/.test(d.destino || "")) {
            var p = this.pilares[d.destino === "columna-izq" ? 0 : 1];
            if (p) p.obj = 1;
        }
    };

    Mundo.prototype.alCapa = function (d) {
        var self = this;
        // la grúa celebra con un balanceo y la cinta cambia de velocidad
        this.grua.baile = 1;
        this.velCintaBase = this.clave === "torre" ? 40 + 22 * (d.indice + 1) : this.velCintaBase;
        this.velCintaObj = this.velCintaBase;
        this.velCinta = 260;
        this.islas.forEach(function (i) { i.brillo = 1; });
        if (this.clave === "templo") this.pilares.forEach(function (p) { p.chorro = 1; self.fuente(p); });
        this.particulas.emitir(this.grua.mx - 540 + 20, this.grua.top - 6, { n: 8, tipos: ["p-confeti"], vel: 200, grav: 380, vida: 1200, escala: 0.6, tintes: [0xff6b6b, 0xffe066, 0x74c0fc, 0x8ce99a] });
    };

    Mundo.prototype.fuente = function (p) {
        this.particulas.emitir(p.x, p.y + 6, { n: 16, tipos: ["p-chispa"], angulo: -Math.PI / 2, apertura: 0.9, vel: 340, grav: 620, vida: 1100, escala: 0.4, sumar: true, tintes: [0x74c0fc, 0xd0ebff, 0xffffff] });
    };

    Mundo.prototype.alCompletar = function () {
        var self = this;
        this.magiaObj = 1;
        this.grua.alzaObj = 1;
        this.faroles.forEach(function (f) { f.obj = 1; });
        this.flores.forEach(function (v) { v.obj = 1; });
        this.torres.forEach(function (t) { if (t.visObj) t.obj = 1; });
        this.pilares.forEach(function (p) { if (p.visObj) { p.obj = 1; p.chorro = 1; self.fuente(p); } });
        this.islas.forEach(function (i) { i.brillo = 1; });
        this.maquinas.forEach(function (m) { m.festejo = 1; });
        if (this.clave === "castillo") this.torres.forEach(function (t) { t.bandera.setAlpha(1); });
        for (var k = 0; k < 4; k++) {
            setTimeout(function () {
                self.particulas.emitir(560 + Math.random() * 500, 160 + Math.random() * 200, { n: 12, tipos: ["p-estrella", "p-chispa"], vel: 200, grav: 120, vida: 1400, escala: 0.5, sumar: true, tintes: [0xffd43b, 0xffe066, 0xfff3bf] });
            }, k * 260);
        }
    };

    /** Fin del nivel: el mundo vuelve a su estado base poco a poco (el nivel siguiente lo renueva). */
    Mundo.prototype.calmar = function () {
        this.magiaObj = 0;
        this.grua.alzaObj = 0;
        this.maquinas.forEach(function (m) { m.festejo = 0; });
    };

    /** Cinemática: todo el paisaje se transforma (arcoíris, luz dorada, islas con luces). */
    Mundo.prototype.transformar = function (on) {
        this.fiesta = !!on;
        this.magiaObj = on ? 1 : 0;
        this.grua.alzaObj = on ? 1 : 0;
        var self = this;
        if (on) {
            this.anim.agregar(1600, function (u) { self.arcoiris.setAlpha(0.85 * M().suave(u)); });
            this.maquinas.forEach(function (m) { m.festejo = 1; });
            this.velCintaObj = 180;
        } else {
            this.arcoiris.setAlpha(0);
            this.velCintaObj = this.velCintaBase;
        }
    };

    Mundo.prototype.emitirFiesta = function (x, y) {
        this.particulas.emitir(x, y, { n: 22, tipos: ["p-confeti", "p-estrella"], vel: 380, grav: 320, vida: 1700, escala: 0.6, giro: 10, aleteo: true, tintes: [0xff6b6b, 0xffd43b, 0x69db7c, 0x4dabf7, 0xda77f2, 0xffffff] });
    };

    Mundo.prototype.lucesIslas = function () {
        var self = this;
        this.islas.forEach(function (i, k) {
            i.brillo = 1;
            self.particulas.emitir(i.c.x - 40, i.c.y - 10, { n: 6, tipos: ["p-chispa"], vel: 90, grav: -30, vida: 1400, escala: 0.35, sumar: true, tintes: [0xfff3bf, 0xd0bfff] });
        });
    };

    // ------------------------------------------------------------------ cuadro a cuadro

    Mundo.prototype.update = function (dt, ts) {
        var s = dt / 1000;
        var self = this;
        this.anim.update(dt);
        // cielo: transición suave al tono del nivel y a la iluminación especial
        var k = Math.min(1, dt / 900);
        this.cielo.arriba = mezclar(this.cielo.arriba, this.cieloObj.arriba, k);
        this.cielo.abajo = mezclar(this.cielo.abajo, this.cieloObj.abajo, k);
        this.magia += (this.magiaObj - this.magia) * Math.min(1, dt / 700);
        var cp = this.cieloPintado;
        if (!cp || cp.a !== this.cielo.arriba || cp.b !== this.cielo.abajo || Math.abs(cp.m - this.magia) > 0.01) this.pintarCielo();

        // sol: rayos que giran, latido y guiño de vez en cuando
        this.solRayos.rotation += s * (0.12 + this.magia * 0.5);
        var lat = 1 + Math.sin(ts * 1.6) * 0.03 + this.magia * 0.08;
        this.solDisco.setScale(lat);
        this.solRayos.setScale(lat * (1 + Math.sin(ts * 2.2) * 0.04));
        this.solLuz.setScale(2.4 + this.magia * 1.2 + Math.sin(ts * 1.2) * 0.1).setAlpha(0.6 + this.magia * 0.3);
        var parpado = (ts % 5.2) < 0.16 ? 0.15 : 1;
        this.solOjos.setScale(lat, parpado * lat);

        // nubes
        this.nubes.forEach(function (n) {
            n.g.x += n.vel * s;
            if (n.g.x > 1760) n.g.x = -160;
        });

        // islas flotantes
        this.islas.forEach(function (i) {
            i.c.y = i.base + Math.sin(ts * 0.6 + i.fase) * 7;
            i.brillo = Math.max(self.magia * 0.8, i.brillo - dt / 1400);
            i.luz.setAlpha(0.15 + i.brillo * 0.85).setScale(0.5 + i.brillo * 0.7);
        });

        // flores, torres, pilares y faroles
        var vk = Math.min(1, dt / 350);
        var cambio = false;
        this.flores.forEach(function (v) { var a = v.luz; v.luz += (v.obj - v.luz) * vk; if (Math.abs(a - v.luz) > 0.002) cambio = true; });
        if (cambio) this.pintarFlores();
        this.torres.forEach(function (t) {
            t.c.setAlpha(t.c.alpha + ((t.visObj || 0) - t.c.alpha) * vk);
            t.luz += (t.obj - t.luz) * vk;
            t.brillo.setAlpha(t.luz * (0.7 + 0.3 * Math.sin(ts * 4)));
        });
        this.pilares.forEach(function (p) {
            p.c.setAlpha(p.c.alpha + ((p.visObj || 0) - p.c.alpha) * vk);
            p.luz += (p.obj - p.luz) * vk;
            p.brillo.setAlpha(p.luz * (0.7 + 0.3 * Math.sin(ts * 3 + p.x)));
            if (p.c.alpha > 0.5 && Math.random() < dt / 900) self.particulas.emitir(p.x, p.y + 8, { n: 2, tipos: ["p-chispa"], angulo: -Math.PI / 2, apertura: 0.5, vel: 120 + p.luz * 140, grav: 400, vida: 700, escala: 0.25, sumar: true, tintes: [0xd0ebff] });
        });
        this.faroles.forEach(function (f) { f.luz += (f.obj - f.luz) * vk; });
        this.pintarFaroles(ts);

        // grúa del fondo: gira el brazo despacio
        this.gruaFondo.brazo.setScale(Math.cos(ts * 0.35), 1);

        // máquinas constructoras: van y vienen por el camino
        this.maquinas.forEach(function (m) {
            m.x += m.dir * m.vel * s;
            if (m.x > m.x1) { m.x = m.x1; m.dir = -1; }
            if (m.x < m.x0) { m.x = m.x0; m.dir = 1; }
            m.salto = Math.max(0, m.salto - dt / 600);
            var hop = Math.sin(m.salto * Math.PI) * 16 + (m.festejo ? Math.abs(Math.sin(ts * 6 + m.x0)) * 10 : 0);
            m.c.setPosition(m.x, m.yDe(m.x) - hop);
            // van por el camino del fondo: se ven un poco más chicos (más lejos)
            var lejos = 0.75;
            m.c.setScale((m.dir < 0 ? -1 : 1) * lejos, lejos);
            m.ruedas.forEach(function (r) { r.rotation += m.dir * m.vel * s / 10; });
            m.faro.setAlpha(0.2 + 0.6 * m.salto + (m.festejo ? 0.4 : 0) + 0.1 * Math.sin(ts * 3));
        });

        // grúa grande: el carro sigue al bloque, el gancho sube y baja, la pluma celebra
        var gr = this.grua;
        var meta = gr.siguiendo || gr.objetivoX !== gr.reposo ? gr.objetivoX : gr.reposo + Math.sin(ts * 0.5) * 60;
        meta = Math.max(gr.mx - 520, Math.min(gr.mx - 90, meta));
        gr.x += (meta - gr.x) * Math.min(1, dt / 260);
        gr.largo += (gr.largoObj - gr.largo) * Math.min(1, dt / 220);
        gr.alza += (gr.alzaObj - gr.alza) * Math.min(1, dt / 500);
        gr.baile = Math.max(0, gr.baile - dt / 1600);
        var angulo = -0.12 * gr.alza - Math.sin(gr.baile * Math.PI * 4) * 0.05 * gr.baile - (this.fiesta ? Math.abs(Math.sin(ts * 2)) * 0.06 : 0);
        gr.pluma.setRotation(angulo);
        gr.carro.x = gr.x - gr.mx;
        var balanceo = Math.sin(ts * 1.4) * 4 + (gr.siguiendo ? 0 : 0);
        gr.cable.clear();
        gr.cable.lineStyle(3, 0x495057, 1);
        gr.cable.lineBetween(0, 14, balanceo * 0.6, gr.largo);
        gr.gancho.setPosition(balanceo * 0.6, gr.largo);
        gr.lamparaFlash = Math.max(0, (gr.lamparaFlash || 0) - dt / 700);
        gr.lampara.setPosition(balanceo * 0.6, gr.largo + 8).setAlpha(Math.min(1, gr.foco * 0.8 + gr.lamparaFlash + this.magia * 0.5) * (0.8 + 0.2 * Math.sin(ts * 8)));

        // cinta: velocidad que vuelve a la base, marcas que corren, bloques que viajan
        this.velCinta += (this.velCintaObj - this.velCinta) * Math.min(1, dt / 900);
        var ci = this.cinta;
        ci.fase = (ci.fase + this.velCinta * s) % 40;
        var gm = this.gCintaMarcas;
        gm.clear();
        gm.fillStyle(0x6c757d, 1);
        for (var x = ci.x0 + ci.fase; x < ci.x1; x += 40) gm.fillRect(x, ci.y + 2, 14, 12);
        gm.fillStyle(0x212529, 1);
        gm.fillCircle(ci.x0, ci.y + 9, 11); gm.fillCircle(ci.x1, ci.y + 9, 11);
        gm.fillStyle(0xadb5bd, 1);
        gm.fillCircle(ci.x0 + Math.cos(ts * this.velCinta / 12) * 6, ci.y + 9 + Math.sin(ts * this.velCinta / 12) * 6, 3);
        gm.fillCircle(ci.x1 + Math.cos(ts * this.velCinta / 12) * 6, ci.y + 9 + Math.sin(ts * this.velCinta / 12) * 6, 3);
        this.bloquesCinta.forEach(function (b) {
            b.x += self.velCinta * s;
            if (b.x > ci.x1 - 10) { b.x = ci.x0 + 10; self.prensa.ciclo = 1; }
            b.g.setPosition(b.x, b.y + Math.sin(b.x * 0.2) * 0.6);
        });

        // prensa: golpe periódico y en cada encaje
        var pr = this.prensa;
        pr.ciclo = Math.max(0, pr.ciclo - dt / 400);
        pr.golpe = Math.max(0, pr.golpe - dt / 500);
        var baja = Math.max(Math.sin(pr.golpe * Math.PI), Math.sin(pr.ciclo * Math.PI) * 0.5);
        pr.piston.setPosition(0, baja * 16);
        pr.foco.clear();
        this.prensaLuces.forEach(function (l, i) {
            l.luz = Math.max(0, l.luz - dt / 900);
            var on = 0.35 + 0.65 * Math.max(l.luz, (Math.floor(ts * 2.5) % 3 === i) ? 0.6 : 0, self.magia);
            pr.foco.fillStyle(mezclar(0x364fc7, [0xff6b6b, 0xffe066, 0x69db7c][i], on), 1);
            pr.foco.fillCircle(l.x, l.y, 6);
        });

        // partículas de ambiente (polvo mágico que flota)
        this.tAmbiente += dt;
        if (this.tAmbiente > (this.fiesta ? 120 : 420)) {
            this.tAmbiente = 0;
            this.ambiente.emitir(520 + Math.random() * 600, 300 + Math.random() * 420, { n: 1, tipos: ["p-chispa"], vel: 18, grav: -12, vida: 3200, escala: 0.28, sumar: true, alfa: 0.7, tintes: this.fiesta ? [0xffd43b, 0xffffff] : [0xffffff, 0xfff3bf, 0xd0bfff] });
        }
        this.particulas.update(dt);
        this.ambiente.update(dt);
    };

    Mundo.prototype.destruir = function () {
        this.quitar.forEach(function (f) { f(); });
        this.quitar = [];
        this.anim.limpiar();
    };

    global.MundoPuzle = Mundo;
})(typeof window !== "undefined" ? window : global);
