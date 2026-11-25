/**
 * EscenarioDiana — escena Phaser 4 de "La Gran Diana de Estrellas" (window.EscenarioDiana).
 *
 * Dibuja la Feria Mágica de las Estrellas por capas (cielo con estrellas que titilan, luna, siluetas lejanas, noria
 * que gira, carpa, puestos con luces, guirnaldas de bombillas y banderines, globos, confeti y estrellitas flotantes),
 * la gran diana con anillos de neón y marquesina de bombillas, la estrella dorada, la guía del dedo y el progreso.
 *
 * La estrella SIEMPRE aparece en el centro de la diana. Desde el nivel 2 la diana es más pequeña y se mece un poco
 * alrededor del centro de la pantalla (ReglasDiana.moverA), y la estrella va con ella. Ciclo de cada oportunidad:
 *   espera → aparece (destello, crece, halo) → visible (parpadeo suave; ayuda a mitad de camino y un rato extra)
 *          → acierto (explosión, anillos, luces) o apaga (se desvanece sin castigo) → espera → …
 * ReglasDiana decide si el toque vale (zona amplia alrededor de la estrella, sin arrastrar ni dejar el dedo).
 * La escena avisa a script.js con eventos: aparece, visible, ayuda, presiona, fuera, deslizo, mantuvo, acierto,
 * explota, apaga, nivelCompleto, guiaOculta, fuegos.
 *
 * Mundo de diseño 1600 × 900 con Scale.ENVELOP; lo jugable cabe en 4:3 (x 230…1370). Cada animación que el flujo
 * espera es una Promise con respaldo por tiempo (Animador), que también respeta la pausa.
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser;
    var W = 1600, H = 900;

    var D = function () { return global.DibujosDiana; };
    var R = function () { return global.ReglasDiana; };

    var juego = null, escena = null, el = null, cfg = null, espera = null;
    var cb = {};
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);

    function avisar(nombre, a) {
        var f = cb[nombre];
        if (typeof f === "function") {
            try { f(a); } catch (e) { console.warn("[EscenarioDiana]", nombre, e); }
        }
    }

    function lerp(a, b, u) { return a + (b - a) * u; }
    function saleSuave(u) { return 1 - Math.pow(1 - u, 3); }
    function elastico(u) { return u === 0 || u === 1 ? u : Math.pow(2, -10 * u) * Math.sin((u * 10 - 0.75) * (2 * Math.PI / 3)) + 1; }
    function jcfg() { return (cfg && cfg.juego) || {}; }
    function azarEn(a, b) { return a + Math.random() * (b - a); }
    function num(v, d) { var n = Number(v); return isFinite(n) ? n : d; }

    var DORADOS = [0xffe066, 0xffd43b, 0xfff3bf, 0xffc928, 0xffffff];
    var FIESTA = [0xff4fa3, 0x22e3d6, 0xa25cff, 0xffd43b, 0x69db7c, 0xffa94d, 0x74c0fc];

    // Lo que tiene cada nivel (el escenario cambia algunos detalles).
    var TEMAS = {
        feria: { lucesLineas: 1, banderines: 1, globos: 2, colgantes: 0, carpa2: false, fuegos: 0, fugaces: 0, luna: 1, confeti: 16, flotantes: 6 },
        brillante: { lucesLineas: 2, banderines: 1, globos: 3, colgantes: 0, carpa2: false, fuegos: 0, fugaces: 0, luna: 1, confeti: 20, flotantes: 8 },
        magica: { lucesLineas: 1, banderines: 1, globos: 2, colgantes: 6, carpa2: false, fuegos: 0, fugaces: 4200, luna: 1.25, confeti: 18, flotantes: 12 },
        festival: { lucesLineas: 2, banderines: 2, globos: 5, colgantes: 4, carpa2: true, fuegos: 3400, fugaces: 0, luna: 1, confeti: 26, flotantes: 10 }
    };

    // Radios de los anillos de neón (de dentro hacia fuera): dorado, violeta, turquesa, rosa y el marco.
    var RADIOS_NEON = [170, 208, 248, 298, 320];

    // ------------------------------------------------------------------ animador con respaldo por tiempo (y pausa)

    function Animador() { this.lista = []; this.pausado = false; }

    Animador.prototype.agregar = function (dur, fn) {
        var self = this;
        return new Promise(function (resolve) {
            var a = { t: 0, dur: Math.max(1, dur), fn: fn, resolve: resolve, hecho: false };
            var respaldo = function () {
                if (a.hecho) return;
                if (self.pausado) { a.timer = setTimeout(respaldo, 400); return; }
                self.fin(a);
            };
            a.timer = setTimeout(respaldo, dur + 500);
            self.lista.push(a);
        });
    };

    Animador.prototype.fin = function (a) {
        if (a.hecho) return;
        a.hecho = true;
        clearTimeout(a.timer);
        try { a.fn(1); } catch (e) { console.warn("[EscenarioDiana] anim", e); }
        a.resolve();
    };

    Animador.prototype.update = function (dt) {
        var vivos = [];
        for (var i = 0; i < this.lista.length; i++) {
            var a = this.lista[i];
            if (a.hecho) continue;
            a.t += dt;
            var u = Math.min(1, a.t / a.dur);
            if (u >= 1) { this.fin(a); continue; }
            try { a.fn(u); } catch (e) { /* noop */ }
            vivos.push(a);
        }
        this.lista = vivos;
    };

    function esperar(anim, ms) { return anim.agregar(ms, function () {}); }

    // ------------------------------------------------------------------ partículas (reserva fija)

    function Particulas(scene, n, prof) {
        this.lista = [];
        for (var i = 0; i < n; i++) {
            var im = scene.add.image(-100, -100, "chispa").setVisible(false).setDepth(prof || 60);
            this.lista.push({ img: im, vivo: false, t: 0 });
        }
        this.i = 0;
    }

    Particulas.prototype.emitir = function (x, y, o) {
        var tipos = o.tipos || ["chispa"];
        for (var k = 0; k < (o.n || 8); k++) {
            var p = this.lista[this.i];
            this.i = (this.i + 1) % this.lista.length;
            var ang = o.angulo != null ? o.angulo + (Math.random() - 0.5) * (o.apertura || 1) : Math.random() * Math.PI * 2;
            var v = (o.vel || 240) * (o.velFija ? 1 : 0.45 + Math.random() * 0.7);
            var tx = tipos[Math.floor(Math.random() * tipos.length)];
            p.vivo = true;
            p.t = 0;
            p.vida = (o.vida || 700) * (o.velFija ? 1 : 0.7 + Math.random() * 0.5);
            p.vx = Math.cos(ang) * v;
            p.vy = Math.sin(ang) * v;
            p.grav = o.grav != null ? o.grav : 0;
            p.roce = o.roce != null ? o.roce : 0.985;
            p.giro = o.sinGiro ? 0 : (Math.random() - 0.5) * (o.giro || 6);
            p.esc = (o.escala || 0.35) * (0.6 + Math.random() * 0.7) / D().res(tx);
            p.oscila = o.oscila || 0;
            p.fase = Math.random() * 6;
            p.encoge = o.encoge != null ? o.encoge : 0.35;
            p.img.setTexture(tx);
            p.img.setBlendMode(o.normal ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD);
            p.img.setTint(o.tintes ? o.tintes[Math.floor(Math.random() * o.tintes.length)] : 0xffffff);
            p.img.setPosition(x + (Math.random() - 0.5) * (o.dispersion || 10), y + (Math.random() - 0.5) * (o.dispersion || 10));
            p.img.setScale(p.esc).setAlpha(o.alpha != null ? o.alpha : 1).setVisible(true).setRotation(o.sinGiro ? 0 : Math.random() * 6);
            p.a0 = o.alpha != null ? o.alpha : 1;
        }
    };

    Particulas.prototype.update = function (dt) {
        var s = dt / 1000;
        for (var i = 0; i < this.lista.length; i++) {
            var p = this.lista[i];
            if (!p.vivo) continue;
            p.t += dt;
            var u = p.t / p.vida;
            if (u >= 1) { p.vivo = false; p.img.setVisible(false); continue; }
            p.vy += p.grav * s;
            p.vx *= p.roce;
            p.vy *= p.roce;
            p.img.x += (p.vx + (p.oscila ? Math.sin(p.t / 260 + p.fase) * p.oscila : 0)) * s;
            p.img.y += p.vy * s;
            p.img.rotation += p.giro * s;
            p.img.setAlpha(p.a0 * (u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3));
            p.img.setScale(p.esc * (1 - u * p.encoge));
        }
    };

    Particulas.prototype.apagar = function () {
        this.lista.forEach(function (p) { p.vivo = false; p.img.setVisible(false); });
    };

    // ------------------------------------------------------------------ utilidades de imagen

    function tex(scene, key) {
        if (!scene.textures.exists(key) && D().lienzo(key)) scene.textures.addCanvas(key, D().lienzo(key));
    }

    /** Imagen a su tamaño de diseño (compensa la resolución del SVG rasterizado). */
    function img(scene, x, y, key, k) {
        var i = scene.add.image(x, y, key);
        i.base = (k || 1) / D().res(key);
        i.setScale(i.base);
        return i;
    }

    /** Punto de una curva cuadrática (guirnaldas). */
    function curva(p0, c, p1, u) {
        var a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, d = u * u;
        return { x: a * p0.x + b * c.x + d * p1.x, y: a * p0.y + b * c.y + d * p1.y };
    }

    // ------------------------------------------------------------------ escena

    var EscenaFeria = Phaser ? class extends Phaser.Scene {
        constructor() { super({ key: "Feria" }); }

        create() {
            var self = this;
            D().claves().forEach(function (k) { tex(self, k); });
            this.anim = new Animador();
            this.t = 0;
            this.pausado = false;
            this.entradaOn = false;
            this.nivel = null;
            this.ronda = null;
            this.tema = "feria";
            this.marcador = null;
            this.op = { estado: "oculta", t: 0, dur: 0, ayuda: false, gen: 0 };
            this.ptr = null;
            this.festejo = 0;          // ms de luces de fiesta (bombillas rápidas)
            this.impulso = 0;          // banderines y globos se agitan
            this.haloExtra = 0;        // ayuda visual
            this.boost = [0, 0, 0, 0, 0];
            this.decoAlpha = 0;
            this.fiestaOn = false;
            this.tConfeti = 0;
            this.tFuegos = 2000;
            this.tFugaz = 2500;
            this.mostrarProg = true;
            this.dedoOn = false;
            this.deco = [];
            this.progPop = [];

            var j = jcfg();
            var cx = num(j.dianaX, 800), cy = num(j.dianaY, 462);
            this.cx = cx;
            this.cy = cy;
            this.escDiana = 1;     // tamaño actual de la diana (se acerca al del nivel)
            this.mueve = 0;        // 0 quieta en el centro … 1 vaivén completo del nivel
            this.tMov = 0;

            // ---------------- cielo y fondo lejano
            this.cielo = img(this, W / 2, H / 2, "cielo").setDepth(0);
            this.estrellasCielo = [];
            for (var i = 0; i < 42; i++) {
                var ex = azarEn(20, W - 20), ey = azarEn(20, 520);
                if (Math.abs(ex - cx) < 330 && ey > 120) ey = azarEn(20, 120);
                var s = img(this, ex, ey, "chispa", azarEn(0.3, 0.75)).setDepth(0.5).setBlendMode(Phaser.BlendModes.ADD);
                s.fase = Math.random() * 6;
                s.vel = azarEn(0.6, 1.6);
                this.estrellasCielo.push(s);
            }
            this.luna = img(this, 1390, 118, "luna", 0.85).setDepth(0.8);
            this.fondoFeria = img(this, W / 2, 762, "fondoFeria").setOrigin(0.5, 1).setDepth(2).setAlpha(0.95);

            // ---------------- noria (derecha) y carpas
            this.noriaBase = img(this, 1340, 742, "noriaBase", 0.95).setOrigin(0.5, 1).setDepth(3);
            this.noriaRueda = img(this, 1340, 418, "noriaRueda", 0.86).setDepth(3.1);
            this.cabinas = [];
            for (var c = 0; c < 8; c++) {
                this.cabinas.push(img(this, 0, 0, "cabina", 0.8).setDepth(3.2).setOrigin(0.5, 0).setTint(FIESTA[c % FIESTA.length]));
            }
            this.noriaLuces = [];
            for (var nl = 0; nl < 24; nl++) this.noriaLuces.push(img(this, 0, 0, "bombilla", 0.42).setDepth(3.15).setBlendMode(Phaser.BlendModes.ADD));
            this.carpa = img(this, 255, 748, "carpa", 0.92).setOrigin(0.5, 1).setDepth(3);
            this.carpa2 = img(this, 1530, 752, "carpa2", 0.62).setOrigin(0.5, 1).setDepth(3.3).setAlpha(0);

            // ---------------- puestos de feria (abajo a los lados) con luces
            this.puestos = [
                this.crearPuesto(318, 872, "puesto", 0.84),
                this.crearPuesto(1282, 872, "puesto2", 0.84)
            ];

            // ---------------- capas de decoración por nivel (guirnaldas, globos…)
            this.gCables = this.add.graphics().setDepth(8);
            this.confetiAire = [];
            for (var k = 0; k < 26; k++) {
                var cf = img(this, azarEn(0, W), azarEn(0, H), "confeti", 0.9).setDepth(12).setTint(FIESTA[k % FIESTA.length]).setAlpha(0);
                cf.vx = azarEn(-14, 14); cf.vy = azarEn(8, 22); cf.giro = azarEn(-1.5, 1.5); cf.fase = Math.random() * 6;
                this.confetiAire.push(cf);
            }

            // ---------------- la gran diana
            this.dianaLuz = img(this, cx, cy, "luz", 4.6).setDepth(18).setBlendMode(Phaser.BlendModes.ADD).setTint(0x9c36b5).setAlpha(0.55);
            this.diana = img(this, cx, cy, "diana", 1).setDepth(20);
            this.neones = RADIOS_NEON.map(function (r, n) {
                return img(self, cx, cy, "neon", r / 180).setDepth(21).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.8);
            });
            this.marquesina = [];
            for (var b = 0; b < 30; b++) {
                var a = -Math.PI / 2 + b * Math.PI * 2 / 30;
                var bb = img(this, cx + Math.cos(a) * 309, cy + Math.sin(a) * 309, "bombilla", 0.5).setDepth(22).setBlendMode(Phaser.BlendModes.ADD);
                bb.ang = a;
                this.marquesina.push(bb);
            }
            this.centroLuz = img(this, cx, cy, "luz", 1.7).setDepth(23).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd43b).setAlpha(0.18);
            this.rayos = img(this, cx, cy, "rayos", 0.8).setDepth(24).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffe066).setAlpha(0);
            this.halo = img(this, cx, cy, "halo", 0.8).setDepth(25).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
            this.estrella = img(this, cx, cy, "estrella", 1).setDepth(26).setVisible(false);
            this.flash = img(this, cx, cy, "flash", 1).setDepth(27).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
            this.dedo = img(this, cx, cy, "dedo", 0.9).setDepth(28).setVisible(false);
            this.dianaPiezas = [this.dianaLuz, this.diana].concat(this.neones, this.marquesina);
            this.centroLuz.setAlpha(0);
            this.dianaPiezas.forEach(function (o) { o.a0 = o.alpha; o.setAlpha(0); });
            this.dianaVisible = 0;
            this.dianaEscala = 1;

            // ondas suaves del toque fuera
            this.ondas = [];
            for (var o = 0; o < 6; o++) this.ondas.push(img(this, 0, 0, "neon", 0.2).setDepth(30).setBlendMode(Phaser.BlendModes.ADD).setVisible(false));
            this.iOnda = 0;

            // ---------------- partículas
            this.pCielo = new Particulas(this, 120, 1.5);
            this.particulas = new Particulas(this, 240, 40);

            // ---------------- progreso y brillo
            this.gProg = this.add.graphics().setDepth(44);
            this.progHuecos = [];
            this.progLlenas = [];
            for (var p = 0; p < 8; p++) {
                this.progHuecos.push(img(this, 0, 0, "estrellaHueco", 0.9).setDepth(45).setVisible(false));
                this.progLlenas.push(img(this, 0, 0, "estrellaProgreso", 0.9).setDepth(46).setVisible(false));
            }
            this.brillo = this.add.rectangle(W / 2, H / 2, W, H, 0xfff3bf).setDepth(60).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);

            this.crearEntrada();
            this.cameras.main.setBackgroundColor("#120a3a");
            escena = this;
            if (espera) { var e = espera; espera = null; e(true); }
        }

        crearPuesto(x, y, key, k) {
            var im = img(this, x, y, key, k).setOrigin(0.5, 1).setDepth(6);
            var w = 300 * k, h = 330 * k;
            var x0 = x - w / 2, y0 = y - h;
            var luzP = img(this, x, y0 + 200 * k, "luz", 2.2).setDepth(5.9).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffa94d).setAlpha(0.35);
            var luces = [];
            for (var i = 0; i < 8; i++) {
                luces.push(img(this, x0 + (12 + i * 39) * k, y0 + 70 * k, "bombilla", 0.5).setDepth(6.1).setBlendMode(Phaser.BlendModes.ADD).setTint(i % 2 ? 0xfff3bf : 0xffd43b));
            }
            // cartel del puesto
            luces.push(img(this, x0 + 98 * k, y0 + 37 * k, "bombilla", 0.45).setDepth(6.1).setBlendMode(Phaser.BlendModes.ADD).setTint(0xff8cc6));
            luces.push(img(this, x0 + 202 * k, y0 + 37 * k, "bombilla", 0.45).setDepth(6.1).setBlendMode(Phaser.BlendModes.ADD).setTint(0x66e0ff));
            return { img: im, luz: luzP, luces: luces, brilla: 0 };
        }

        // ------------------------------------------------------------------ entrada (un solo dedo)

        crearEntrada() {
            var self = this;
            var mundo = function (p) {
                self.scale.updateBounds();
                return { x: p.worldX, y: p.worldY, t: performance.now() };
            };
            this.input.on("pointerdown", function (p) { self.bajar(p.id, mundo(p)); });
            var arriba = function (p) {
                if (!self.ptr || (p && p.id !== self.ptr.id)) return;
                self.subir(p ? mundo(p) : null);
            };
            this.input.on("pointerup", arriba);
            this.input.on("pointerupoutside", arriba);
            var perder = function () { if (self.ptr) self.soltarSinToque(); };
            var lienzo = this.game.canvas;
            if (lienzo) {
                lienzo.addEventListener("pointercancel", perder);
                lienzo.addEventListener("touchcancel", perder);
                lienzo.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });
            }
        }

        estrellaActiva() { return this.op.estado === "visible" || this.op.estado === "aparece"; }

        bajar(id, p) {
            if (!this.entradaOn || this.pausado || !this.nivel || this.ptr) return;
            var dentro = this.estrellaActiva() && R().dentroZona(p.x, p.y, this.nivel);
            if (!dentro) {
                this.onda(p.x, p.y, 1);
                if (this.estrellaActiva()) R().registrar(this.marcador, "fuera");
                avisar("fuera", { x: p.x, y: p.y, conEstrella: this.estrellaActiva(), seguidos: this.marcador ? this.marcador.fuerasSeguidos : 0 });
                return;
            }
            this.ptr = { id: id, x0: p.x, y0: p.y, t0: p.t };
            this.presion = 1;
            if (this.dedoOn) { this.guiaDedo(false); avisar("guiaOculta"); }
            avisar("presiona");
        }

        subir(p) {
            var g = this.ptr;
            this.ptr = null;
            this.presion = 0;
            if (!g || !this.nivel) return;
            var fin = p || { x: g.x0, y: g.y0, t: g.t0 };
            var res = R().evaluarToque({ x0: g.x0, y0: g.y0, t0: g.t0, x1: fin.x, y1: fin.y, t1: fin.t }, this.nivel, jcfg());
            if (res.tipo === "acierto") {
                if (this.estrellaActiva() && this.entradaOn && !this.pausado) this.acierto(res);
                return;
            }
            if (res.tipo === "deslizo" || res.tipo === "mantuvo") {
                R().registrar(this.marcador, res.tipo);
                this.onda(this.nivel.estrella.x, this.nivel.estrella.y, 1.6);
                avisar(res.tipo, { seguidos: this.marcador.fuerasSeguidos });
            }
        }

        soltarSinToque() { this.ptr = null; this.presion = 0; }

        /** Onda luminosa suave donde tocó (nada de cruces ni rojo). */
        onda(x, y, k) {
            var o = this.ondas[this.iOnda];
            this.iOnda = (this.iOnda + 1) % this.ondas.length;
            o.setPosition(x, y).setVisible(true).setTint(k > 1 ? 0xffe066 : 0x99e9f2);
            var base = o.base;
            this.anim.agregar(reducido ? 200 : 650, function (u) {
                o.setScale(base * (0.4 + u * 1.6) * (k || 1));
                o.setAlpha(0.9 * (1 - u));
                if (u >= 1) o.setVisible(false);
            });
        }

        // ------------------------------------------------------------------ nivel

        cargar(nivel, ronda) {
            this.nivel = nivel;
            this.ronda = ronda || {};
            this.tema = TEMAS[nivel.tema] ? nivel.tema : "feria";
            this.marcador = R().crearMarcador(nivel);
            this.op = { estado: "oculta", t: 0, dur: 0, ayuda: false, gen: this.op.gen + 1 };
            this.ptr = null;
            this.estrella.setVisible(false);
            this.halo.setAlpha(0);
            this.rayos.setAlpha(0);
            this.guiaDedo(false);
            this.haloExtra = 0;
            var self = this;
            // colores de los anillos (con una intensidad un poco distinta en cada partida)
            var cols = nivel.anillos;
            [cols[3], cols[2], cols[1], cols[0], cols[3]].forEach(function (c, i) { self.neones[i].setTint(c); });
            this.neones[0].setTint(0xffc928);
            this.neones[4].setTint(0xffd84a);
            this.intensidad = nivel.intensidad || 1;
            this.marquesina.forEach(function (b, i) { b.setTint(i % 2 ? 0xfff3bf : nivel.luces[(i >> 1) % nivel.luces.length]); });
            this.construirDeco();
            this.pintarProgreso();
        }

        /** Guirnaldas, banderines, globos y adornos según el nivel. */
        construirDeco() {
            var self = this;
            this.deco.forEach(function (o) { o.img.destroy(); });
            this.deco = [];
            this.gCables.clear();
            var tm = TEMAS[this.tema];
            var luces = this.nivel.luces;
            var add = function (o) { o.img.setAlpha(0); o.alpha = o.alpha == null ? 1 : o.alpha; self.deco.push(o); return o; };
            var cable = function (p0, c, p1) {
                self.gCables.lineStyle(4, 0x0b0626, 0.9);
                self.gCables.beginPath();
                for (var i = 0; i <= 30; i++) {
                    var q = curva(p0, c, p1, i / 30);
                    if (i) self.gCables.lineTo(q.x, q.y); else self.gCables.moveTo(q.x, q.y);
                }
                self.gCables.strokePath();
            };
            var lineaLuces = function (p0, c, p1, n, fila) {
                cable(p0, c, p1);
                for (var i = 1; i < n; i++) {
                    var q = curva(p0, c, p1, i / n);
                    add({ tipo: "bombilla", img: img(self, q.x, q.y + 8, "bombilla", 0.62).setDepth(8.2).setBlendMode(Phaser.BlendModes.ADD).setTint(luces[(i + fila) % luces.length]), i: i + fila * 7 });
                }
            };
            var lineaBanderines = function (p0, c, p1, n, fila) {
                cable(p0, c, p1);
                for (var i = 1; i < n; i++) {
                    var u = i / n;
                    var q = curva(p0, c, p1, u), q2 = curva(p0, c, p1, Math.min(1, u + 0.01));
                    var rot = Math.atan2(q2.y - q.y, q2.x - q.x);
                    var b = img(self, q.x, q.y, "banderin", 0.72).setOrigin(0.5, 0.04).setDepth(8.1).setTint(FIESTA[(i + fila * 3) % FIESTA.length]).setRotation(rot);
                    add({ tipo: "banderin", img: b, rot0: rot, i: i });
                }
            };
            // luces arriba de lado a lado (sin bajar hasta la diana)
            lineaLuces({ x: -40, y: 16 }, { x: 400, y: 120 }, { x: 800, y: 22 }, 12, 0);
            lineaLuces({ x: 800, y: 22 }, { x: 1200, y: 120 }, { x: 1640, y: 16 }, 12, 1);
            if (tm.lucesLineas > 1) {
                lineaLuces({ x: -40, y: 250 }, { x: 260, y: 330 }, { x: 500, y: 170 }, 8, 2);
                lineaLuces({ x: 1100, y: 170 }, { x: 1340, y: 330 }, { x: 1640, y: 250 }, 8, 3);
            }
            // banderines de las esquinas hacia la diana
            lineaBanderines({ x: -40, y: 60 }, { x: 280, y: 200 }, { x: 540, y: 110 }, 9, 0);
            lineaBanderines({ x: 1060, y: 110 }, { x: 1320, y: 200 }, { x: 1640, y: 60 }, 9, 1);
            if (tm.banderines > 1) {
                lineaBanderines({ x: -40, y: 330 }, { x: 200, y: 420 }, { x: 470, y: 300 }, 7, 2);
                lineaBanderines({ x: 1130, y: 300 }, { x: 1400, y: 420 }, { x: 1640, y: 330 }, 7, 3);
            }
            // globos a los lados
            var huecos = [[150, 420], [1460, 410], [420, 560], [1185, 570], [90, 600], [1530, 600]];
            for (var g = 0; g < tm.globos; g++) {
                var h = huecos[g % huecos.length];
                var gl = img(this, h[0] + azarEn(-30, 30), h[1] + azarEn(-30, 30), "globo", azarEn(0.72, 0.9)).setDepth(10).setTint(FIESTA[(g * 2 + 1) % FIESTA.length]);
                add({ tipo: "globo", img: gl, y0: gl.y, x0: gl.x, fase: Math.random() * 6 });
            }
            // estrellas colgantes (nivel mágico y festival)
            for (var s = 0; s < tm.colgantes; s++) {
                var lado = s % 2 ? 1 : -1;
                var x = 800 + lado * azarEn(360, 560), largo = azarEn(60, 170);
                self.gCables.lineStyle(2, 0xd0bfff, 0.6);
                self.gCables.beginPath();
                self.gCables.moveTo(x, 0);
                self.gCables.lineTo(x, largo);
                self.gCables.strokePath();
                add({ tipo: "colgante", img: img(this, x, largo + 16, "estrellita", azarEn(0.8, 1.1)).setDepth(8.3).setTint(DORADOS[s % DORADOS.length]), fase: Math.random() * 6 });
            }
            // estrellitas que flotan a los lados
            for (var f = 0; f < tm.flotantes; f++) {
                var fx = f % 2 ? azarEn(1130, 1550) : azarEn(50, 470);
                add({ tipo: "flotante", img: img(this, fx, azarEn(180, 700), "estrellita", azarEn(0.3, 0.55)).setDepth(13).setBlendMode(Phaser.BlendModes.ADD).setTint(FIESTA[f % FIESTA.length]), alpha: 0.75, fase: Math.random() * 6, vx: azarEn(-10, 10), vy: azarEn(-14, -6) });
            }
            this.confetiActivos = tm.confeti;
            this.carpa2Objetivo = tm.carpa2 ? 1 : 0;
            this.lunaEscala = tm.luna;
            this.tFuegos = tm.fuegos ? 1500 : 0;
            this.tFugaz = tm.fugaces ? 1800 : 0;
            this.decoAlpha = 0;
        }

        // ------------------------------------------------------------------ presentación y salida

        presentar() {
            var self = this;
            var primera = this.dianaVisible < 1;
            sfxAviso("luces");
            return this.anim.agregar(reducido ? 100 : (primera ? 1200 : 800), function (u) {
                self.decoAlpha = saleSuave(u);
                if (primera) {
                    self.dianaVisible = saleSuave(Math.min(1, u * 1.4));
                    self.dianaEscala = 0.7 + 0.3 * elastico(Math.min(1, u * 1.1));
                }
                // los anillos se encienden de fuera hacia dentro
                for (var k = 0; k < 5; k++) {
                    var v = Math.max(0, Math.min(1, u * 5 - (4 - k)));
                    if (v > 0) self.boost[k] = Math.max(self.boost[k], 1 - Math.abs(v - 0.5) * 2);
                }
            }).then(function () { self.dianaVisible = 1; self.dianaEscala = 1; self.pintarProgreso(); });
        }

        salida() {
            var self = this;
            this.detener();
            return this.anim.agregar(reducido ? 80 : 650, function (u) {
                self.decoAlpha = 1 - u;
                self.halo.setAlpha(self.halo.alpha * (1 - u));
            });
        }

        // ------------------------------------------------------------------ oportunidades

        iniciarRonda() {
            if (!this.nivel) return;
            this.marcador = R().crearMarcador(this.nivel);
            this.pintarProgreso();
            this.aparecer();
        }

        detener() {
            this.op = { estado: "oculta", t: 0, dur: 0, ayuda: false, gen: this.op.gen + 1 };
            this.ptr = null;
            var e = this.estrella, h = this.halo, r = this.rayos;
            if (e.visible) {
                this.anim.agregar(250, function (u) { e.setAlpha(1 - u); h.setAlpha(h.alpha * (1 - u)); r.setAlpha(r.alpha * (1 - u)); if (u >= 1) e.setVisible(false); });
            }
            this.guiaDedo(false);
        }

        /** La estrella aparece en el centro: luz del centro, destello, crece, halo. */
        aparecer(demo) {
            if (!this.nivel || (!demo && this.marcador.completo)) return Promise.resolve();
            var self = this;
            var gen = ++this.op.gen;
            this.op.estado = "aparece";
            this.op.t = 0;
            var i = this.marcador ? this.marcador.hechas : 0;
            var efecto = this.nivel.efectos[i % this.nivel.efectos.length] || "destello";
            var est = this.nivel.estrella;
            var k = est.r / 118;    // el dibujo mide 118 de radio
            this.kEstrella = k;
            avisar("aparece", { i: i, efecto: efecto, demo: !!demo });
            this.efectoAparicion(efecto);
            var e = this.estrella;
            e.setVisible(true).setAlpha(1).setScale(0.01).setPosition(est.x, est.y).setRotation(0);
            return this.anim.agregar(reducido ? 120 : 760, function (u) {
                if (self.op.gen !== gen) return;
                var v = elastico(Math.max(0, (u - 0.12) / 0.88));
                e.setScale(e.base * k * Math.max(0.01, v));
                self.halo.setAlpha(Math.min(1, u * 1.6) * 0.85 * self.nivel.halo);
                self.centroLuz.setAlpha(0.18 + Math.sin(u * Math.PI) * 0.6);
                for (var a = 0; a < 4; a++) {
                    var w = Math.max(0, Math.min(1, u * 4 - (3 - a)));
                    if (w > 0) self.boost[a] = Math.max(self.boost[a], 1 - w * 0.4);
                }
            }).then(function () {
                if (self.op.gen !== gen || self.op.estado !== "aparece") return;
                self.op.estado = "visible";
                self.op.t = 0;
                self.op.ayuda = false;
                self.op.dur = R().duracionOportunidad(self.nivel, false);
                avisar("visible", { i: i, demo: !!demo });
            });
        }

        efectoAparicion(efecto) {
            var x = this.cx, y = this.cy, f = this.flash, self = this;
            f.setAlpha(0).setScale(f.base * 0.4).setRotation(Math.random());
            this.anim.agregar(reducido ? 100 : 520, function (u) {
                f.setAlpha(Math.sin(u * Math.PI) * (efecto === "destello" ? 1 : 0.6));
                f.setScale(f.base * (0.4 + u * (efecto === "destello" ? 1.4 : 0.9)));
            });
            if (reducido) return;
            if (efecto === "espiral") {
                for (var i = 0; i < 16; i++) {
                    var a = i * Math.PI * 2 / 16;
                    this.particulas.emitir(x + Math.cos(a) * 240, y + Math.sin(a) * 240, { n: 1, angulo: a + Math.PI + 0.5, apertura: 0.05, vel: 430, velFija: true, vida: 560, roce: 1, escala: 0.6, tintes: DORADOS, encoge: 0.6 });
                }
            } else if (efecto === "lluvia") {
                for (var j = 0; j < 14; j++) {
                    this.particulas.emitir(x + azarEn(-120, 120), y - azarEn(230, 330), { n: 1, angulo: Math.PI / 2, apertura: 0.15, vel: 480, velFija: true, vida: 560, roce: 1, escala: 0.55, tintes: DORADOS, tipos: ["chispa", "estrellita"], encoge: 0.5 });
                }
            } else {
                this.particulas.emitir(x, y, { n: 14, vel: 260, vida: 600, escala: 0.5, tintes: DORADOS });
            }
            self.boost[0] = 1;
        }

        /** El tiempo de la estrella terminó: se apaga suave, sin castigo, y vendrá otra. */
        apagar() {
            var self = this;
            var gen = ++this.op.gen;
            this.op.estado = "apaga";
            R().registrar(this.marcador, "apagada");
            avisar("apaga", { apagadas: this.marcador.apagadas });
            var e = this.estrella, k = this.kEstrella || 1;
            this.guiaDedo(false);
            this.anim.agregar(reducido ? 120 : 950, function (u) {
                if (self.op.gen !== gen) return;
                e.setAlpha(1 - u);
                e.setScale(e.base * k * (1 - 0.15 * u));
                self.halo.setAlpha((1 - u) * 0.5);
                self.rayos.setAlpha(self.rayos.alpha * (1 - u));
            }).then(function () {
                if (self.op.gen !== gen) return;
                e.setVisible(false);
                self.op.estado = "espera";
                self.op.t = 0;
                self.op.dur = num(jcfg().pausaTrasApagarMs, 1300);
            });
        }

        /** ¡Centro exacto! La estrella crece, destella y estalla; los anillos y la feria se encienden. */
        acierto(res) {
            var self = this;
            var gen = ++this.op.gen;
            this.op.estado = "celebra";
            this.ptr = null;
            R().registrar(this.marcador, "acierto");
            var mk = this.marcador;
            this.progPop[mk.hechas - 1] = 1;
            this.pintarProgreso();
            this.guiaDedo(false);
            avisar("acierto", { n: mk.hechas, total: mk.total, quedan: mk.total - mk.hechas, centro: !!(res && res.centro) });
            this.celebrarEstrella(false).then(function () {
                if (self.op.gen !== gen) return;
                if (mk.completo) {
                    self.op.estado = "completo";
                    avisar("nivelCompleto", { hechas: mk.hechas });
                    return;
                }
                self.op.estado = "espera";
                self.op.t = 0;
                self.op.dur = num(jcfg().pausaTrasAciertoMs, 700);
            });
        }

        /** Secuencia visual del acierto (también la usa la demostración). */
        celebrarEstrella(demo) {
            var self = this, e = this.estrella, k = this.kEstrella || 1, x = this.cx, y = this.cy;
            var crece = this.anim.agregar(reducido ? 60 : 200, function (u) {
                e.setScale(e.base * k * (1 + 0.45 * saleSuave(u)));
                self.flash.setAlpha(u).setScale(self.flash.base * (0.6 + u));
            });
            return crece.then(function () {
                e.setVisible(false);
                avisar("explota", { demo: !!demo });
                self.particulas.emitir(x, y, { n: reducido ? 14 : 46, vel: 560, vida: 900, escala: 0.75, tipos: ["chispa", "estrellita"], tintes: DORADOS, roce: 0.96, grav: 120 });
                if (!reducido) {
                    self.particulas.emitir(x, y, { n: 34, vel: 520, vida: 1500, escala: 0.9, tipos: ["confeti"], tintes: FIESTA, normal: true, grav: 360, roce: 0.97, oscila: 40, encoge: 0 });
                    for (var i = 0; i < 12; i++) {
                        var a = i * Math.PI / 6;
                        self.particulas.emitir(x + Math.cos(a) * 335, y + Math.sin(a) * 335, { n: 1, angulo: a, apertura: 0.2, vel: 140, vida: 900, escala: 0.55, tipos: ["estrellita"], tintes: DORADOS });
                    }
                }
                self.festejo = 1600;
                self.impulso = 1;
                self.puestos.forEach(function (p) { p.brilla = 1; });
                for (var r = 0; r < 5; r++) {
                    (function (n) { esperar(self.anim, n * 110).then(function () { self.boost[n] = 1.4; }); })(r);
                }
                return self.anim.agregar(reducido ? 200 : Math.max(500, num(jcfg().celebracionMs, 1500) - 200), function (u) {
                    self.flash.setAlpha(Math.max(0, 1 - u * 3));
                    self.halo.setAlpha(Math.max(0, 0.9 * (1 - u * 1.5)));
                    self.rayos.setAlpha(Math.max(0, 0.6 * (1 - u * 1.2)));
                    self.brillo.setAlpha(Math.sin(Math.min(1, u * 3) * Math.PI) * 0.06);
                });
            });
        }

        // ------------------------------------------------------------------ guía del dedo y ayuda

        guiaDedo(on) {
            this.dedoOn = !!on && !!this.nivel;
            this.dedo.setVisible(this.dedoOn);
            if (this.dedoOn) { this.dedoT = 0; this.dedo.setAlpha(0); }
        }

        ayudaVisual() { this.haloExtra = 1; this.boost[0] = 1.2; }

        // ------------------------------------------------------------------ celebraciones de nivel

        celebrarNivel(grande) {
            var self = this;
            this.festejo = grande ? 4200 : 3000;
            this.impulso = 1.2;
            this.puestos.forEach(function (p) { p.brilla = 1.5; });
            var vueltas = grande ? 4 : 3;
            for (var v = 0; v < vueltas; v++) {
                for (var r = 0; r < 5; r++) {
                    (function (n, m) { esperar(self.anim, m * 560 + n * 100).then(function () { self.boost[n] = 1.5; }); })(r, v);
                }
            }
            if (!reducido) {
                [[300, 820], [1300, 820]].forEach(function (p, i) {
                    self.particulas.emitir(p[0], p[1], { n: 40, angulo: i ? -2.1 : -1.05, apertura: 0.7, vel: 900, vida: 2000, escala: 1, tipos: ["confeti"], tintes: FIESTA, normal: true, grav: 520, roce: 0.985, oscila: 50, encoge: 0 });
                });
                for (var f = 0; f < (grande ? 5 : 3); f++) {
                    (function (n) { esperar(self.anim, 250 + n * 480).then(function () { self.fuego(); }); })(f);
                }
            }
            return this.anim.agregar(reducido ? 300 : (grande ? 2800 : 2300), function (u) {
                // la diana late de alegría
                self.dianaEscala = 1 + Math.sin(u * Math.PI * 4) * 0.025 * (1 - u);
                self.centroLuz.setAlpha(0.18 + Math.sin(u * Math.PI) * 0.5);
                self.brillo.setAlpha(Math.sin(u * Math.PI) * 0.05);
                if (grande && !reducido && Math.random() < 0.5) {
                    self.particulas.emitir(azarEn(250, 1350), -20, { n: 1, angulo: Math.PI / 2, apertura: 0.3, vel: 300, vida: 2600, escala: 0.7, tipos: ["estrellita"], tintes: DORADOS, roce: 1 });
                }
            }).then(function () { self.dianaEscala = 1; });
        }

        fiesta(on) { this.fiestaOn = !!on; if (on) this.festejo = 1e9; else this.festejo = 0; }

        fuego(x, y) {
            var fx = x != null ? x : (Math.random() < 0.5 ? azarEn(260, 470) : azarEn(1130, 1340));
            var fy = y != null ? y : azarEn(90, 260);
            var col = FIESTA[Math.floor(Math.random() * FIESTA.length)];
            this.pCielo.emitir(fx, fy, { n: 26, vel: 230, vida: 1300, escala: 0.5, tintes: [col, 0xffffff], grav: 70, roce: 0.975 });
            avisar("fuegos");
        }

        // ------------------------------------------------------------------ demostración (no cuenta)

        demo(mano) {
            var self = this;
            var mover = function (x, y, fase) { try { if (mano) mano(x, y, fase); } catch (e) { /* noop */ } };
            var est = this.nivel.estrella;
            var desde = { x: est.x + 330, y: est.y + 250 };
            return esperar(this.anim, 300).then(function () {
                return self.aparecer(true);
            }).then(function () {
                self.op.estado = "demo";
                mover(desde.x, desde.y, "aparece");
                return esperar(self.anim, 450);
            }).then(function () {
                mover(est.x, est.y, "viaja");
                return esperar(self.anim, 900);
            }).then(function () {
                mover(est.x, est.y, "presiona");
                self.presion = 1;
                avisar("presiona");
                return esperar(self.anim, 280);
            }).then(function () {
                self.presion = 0;
                self.op.estado = "celebra";
                mover(est.x, est.y, "suelta");
                return self.celebrarEstrella(true);
            }).then(function () {
                mover(desde.x, desde.y, "viaja");
                self.op.estado = "oculta";
                return esperar(self.anim, 500);
            });
        }

        // ------------------------------------------------------------------ progreso (estrellas que se iluminan)

        pintarProgreso() {
            var g = this.gProg;
            g.clear();
            var self = this;
            this.progHuecos.forEach(function (h) { h.setVisible(false); });
            this.progLlenas.forEach(function (h) { h.setVisible(false); });
            if (!this.nivel || !this.mostrarProg || this.dianaVisible <= 0) return;
            var n = this.nivel.total, paso = 66;
            var ancho = n * paso + 34, y = 852;
            g.fillStyle(0x1a0a40, 0.82);
            g.fillRoundedRect(800 - ancho / 2, y - 36, ancho, 72, 36);
            g.lineStyle(4, 0xffd84a, 0.9);
            g.strokeRoundedRect(800 - ancho / 2, y - 36, ancho, 72, 36);
            var hechas = this.marcador ? this.marcador.hechas : 0;
            for (var i = 0; i < n; i++) {
                var x = 800 - (n - 1) * paso / 2 + i * paso;
                this.progHuecos[i].setPosition(x, y).setVisible(true);
                if (i < hechas) {
                    var pop = this.progPop[i] || 0;
                    self.progLlenas[i].setPosition(x, y).setVisible(true).setScale(self.progLlenas[i].base * (1 + pop * 0.6));
                }
            }
        }

        // ------------------------------------------------------------------ cuadro a cuadro

        update(time, delta) {
            var dt = Math.min(50, delta || 16);
            if (this.pausado) return;
            this.t += dt;
            var t = this.t, self = this;
            this.anim.update(dt);
            this.particulas.update(dt);
            this.pCielo.update(dt);
            if (this.festejo > 0) this.festejo -= dt;
            this.impulso = Math.max(0, this.impulso - dt / 1500);
            this.haloExtra = Math.max(0, this.haloExtra - dt / 4000);
            var fiesta = this.festejo > 0;

            // cielo: estrellas que titilan, luna
            this.estrellasCielo.forEach(function (s) {
                s.setAlpha(0.35 + 0.65 * Math.abs(Math.sin(t / 1000 * s.vel + s.fase)));
            });
            var lk = this.luna.base * (this.lunaEscala || 1);
            this.luna.setScale(lerp(this.luna.scaleX, lk, 0.05));

            // noria que gira y sus luces
            this.noriaRueda.rotation += dt * 0.00011;
            var nr = 0.86 * 240, rot = this.noriaRueda.rotation;
            this.cabinas.forEach(function (c, i) {
                var a = rot + i * Math.PI / 4;
                c.setPosition(1340 + Math.cos(a) * nr, 418 + Math.sin(a) * nr - 4);
            });
            this.noriaLuces.forEach(function (l, i) {
                var a = rot + i * Math.PI / 12;
                l.setPosition(1340 + Math.cos(a) * nr, 418 + Math.sin(a) * nr);
                l.setTint(fiesta ? FIESTA[(i + Math.floor(t / 140)) % FIESTA.length] : 0xfff3bf);
                l.setAlpha(fiesta ? 1 : 0.4 + 0.6 * (((i + Math.floor(t / 260)) % 4) === 0 ? 1 : 0.3));
            });
            this.carpa2.setAlpha(lerp(this.carpa2.alpha, this.carpa2Objetivo || 0, 0.04));

            // puestos: luces que parpadean
            this.puestos.forEach(function (p, k) {
                p.brilla = Math.max(0, p.brilla - dt / 2500);
                p.luz.setAlpha(0.3 + 0.1 * Math.sin(t / 500 + k) + p.brilla * 0.35);
                p.luces.forEach(function (l, i) {
                    var on = fiesta ? ((i + Math.floor(t / 110)) % 2 === 0) : ((i + Math.floor(t / 420) + k) % 3 !== 0);
                    l.setAlpha(on ? 1 : 0.35);
                });
            });

            // decoración del nivel
            var da = this.decoAlpha;
            this.gCables.setAlpha(da);
            this.deco.forEach(function (o) {
                var im = o.img;
                if (o.tipo === "bombilla") {
                    // las bombillas se encienden en secuencia
                    var on = fiesta ? ((o.i + Math.floor(t / 100)) % 2 === 0) : (0.5 + 0.5 * Math.sin(t / 380 - o.i * 0.9)) > 0.35;
                    im.setAlpha(da * (on ? 1 : 0.3));
                    if (fiesta && (o.i + Math.floor(t / 300)) % 3 === 0) im.setTint(FIESTA[(o.i + Math.floor(t / 300)) % FIESTA.length]);
                } else if (o.tipo === "banderin") {
                    im.setRotation(o.rot0 + Math.sin(t / 650 + o.i * 0.8) * (0.06 + self.impulso * 0.22));
                    im.setAlpha(da);
                } else if (o.tipo === "globo") {
                    im.y = o.y0 + Math.sin(t / 1300 + o.fase) * 14 - self.impulso * 10;
                    im.x = o.x0 + Math.sin(t / 2100 + o.fase) * 8;
                    im.setRotation(Math.sin(t / 1700 + o.fase) * 0.06);
                    im.setAlpha(da);
                } else if (o.tipo === "colgante") {
                    im.setRotation(Math.sin(t / 900 + o.fase) * 0.25);
                    im.setAlpha(da * (0.7 + 0.3 * Math.sin(t / 400 + o.fase)));
                } else if (o.tipo === "flotante") {
                    im.x += o.vx * dt / 1000;
                    im.y += o.vy * dt / 1000;
                    if (im.y < 150) { im.y = 720; }
                    if (im.x < 30) im.x = 470; else if (im.x > 1570) im.x = 1130;
                    if (im.x > 480 && im.x < 1120) im.x = im.x < 800 ? 470 : 1130;
                    im.setRotation(im.rotation + dt * 0.0006);
                    im.setAlpha(da * o.alpha * (0.5 + 0.5 * Math.sin(t / 700 + o.fase)));
                }
            });

            // confeti suspendido que se desplaza despacio (no pasa por el centro de la diana)
            var nConf = this.confetiActivos || 0;
            this.confetiAire.forEach(function (c, i) {
                if (i >= nConf) { c.setAlpha(0); return; }
                c.x += (c.vx + Math.sin(t / 900 + c.fase) * 10) * dt / 1000;
                c.y += c.vy * dt / 1000 * (1 + self.impulso);
                c.rotation += c.giro * dt / 1000;
                if (c.y > H + 10) { c.y = -10; c.x = azarEn(0, W); }
                var dc = Math.hypot(c.x - self.cx, c.y - self.cy);
                c.setAlpha(da * (dc < 340 ? 0 : 0.75));
            });

            // la diana se achica al pasar de nivel y, mientras se juega, se mece alrededor del centro
            if (this.nivel) {
                this.escDiana = lerp(this.escDiana, this.nivel.diana.escala || 1, Math.min(1, dt / 350));
                this.mueve = lerp(this.mueve, this.entradaOn && this.op.estado !== "completo" ? 1 : 0, Math.min(1, dt / 900));
                if (this.mueve > 0.001) this.tMov += dt * this.mueve;
                var pc = R().posicionCentro(this.nivel, this.tMov);
                this.cx = this.nivel.diana.x + (pc.x - this.nivel.diana.x) * this.mueve;
                this.cy = this.nivel.diana.y + (pc.y - this.nivel.diana.y) * this.mueve;
                this.nivel.estrella.x = this.nivel.zona.x = this.cx;
                this.nivel.estrella.y = this.nivel.zona.y = this.cy;
            }
            var cx = this.cx, cy = this.cy, es = this.escDiana;
            [this.diana, this.dianaLuz, this.centroLuz, this.rayos, this.halo, this.estrella, this.flash].concat(this.neones).forEach(function (o) { o.setPosition(cx, cy); });

            // la diana: pulso de los anillos, luces que recorren la marquesina
            var dv = this.dianaVisible, de = this.dianaEscala * es;
            this.dianaPiezas.forEach(function (o) { o.setAlpha(o.a0 * dv); });
            this.diana.setScale(this.diana.base * de);
            this.dianaLuz.setScale(this.dianaLuz.base * es);
            this.centroLuz.setScale(this.centroLuz.base * es);
            for (var k = 0; k < 5; k++) {
                this.boost[k] = Math.max(0, this.boost[k] - dt / 650);
                var nn = this.neones[k];
                var pulso = 0.62 + 0.22 * Math.sin(t / 620 + k * 1.1);
                nn.setAlpha(dv * Math.min(1, (pulso * (this.intensidad || 1)) + this.boost[k] * 0.5));
                nn.setScale(nn.base * de * (1 + this.boost[k] * 0.012));
            }
            var vel = fiesta ? 0.006 : 0.0011;
            this.marquesina.forEach(function (b, i) {
                var a = b.ang + Math.PI / 2;
                var onda1 = Math.max(0, Math.cos(a - t * vel)), onda2 = Math.max(0, Math.cos(a - t * vel + Math.PI));
                var v = Math.pow(Math.max(onda1, onda2), 6);
                b.setAlpha(dv * (fiesta ? ((i + Math.floor(t / 90)) % 2 ? 1 : 0.35) : 0.35 + 0.65 * v));
                b.setPosition(self.cx + Math.cos(b.ang) * 309 * de, self.cy + Math.sin(b.ang) * 309 * de);
            });
            this.dianaLuz.setAlpha(dv * (0.45 + 0.1 * Math.sin(t / 900) + (fiesta ? 0.2 : 0)));

            // la estrella: quieta en el centro, parpadeo suave y halo que se expande y contrae
            var op = this.op, est = this.estrella;
            if (op.estado === "visible" || op.estado === "demo") {
                var k2 = this.kEstrella || 1;
                var parp = this.nivel ? this.nivel.parpadeo : 0.15;
                var ciclo = Math.sin(t / 420);
                var apriete = this.presion ? 0.9 : 1;
                est.setAlpha(1 - parp * (0.5 + 0.5 * ciclo));
                est.setScale(est.base * k2 * (1 + 0.025 * Math.sin(t / 300)) * apriete);
                var h = this.nivel ? this.nivel.halo : 1;
                this.halo.setAlpha(Math.min(1, (0.55 + 0.25 * Math.sin(t / 520)) * h + this.haloExtra * 0.35));
                this.halo.setScale(this.halo.base * (1 + 0.12 * Math.sin(t / 520) + this.haloExtra * 0.25) * k2);
                this.rayos.setAlpha(0.18 + this.haloExtra * 0.25);
                this.rayos.setScale(this.rayos.base * k2 * (1 + this.haloExtra * 0.2));
                this.rayos.rotation += dt * 0.0003;
                this.centroLuz.setAlpha(0.22 + 0.08 * Math.sin(t / 520) + this.haloExtra * 0.3);
            } else if (op.estado !== "celebra" && op.estado !== "aparece" && op.estado !== "apaga") {
                this.centroLuz.setAlpha(dv * (0.14 + 0.06 * Math.sin(t / 700)));
            }
            if (op.estado === "visible" && !this.ptr) {
                op.t += dt;
                if (!op.ayuda && op.t >= this.nivel.tiempos.ayudaMs) {
                    op.ayuda = true;
                    op.dur = R().duracionOportunidad(this.nivel, true);
                    this.ayudaVisual();
                    avisar("ayuda", { hechas: this.marcador.hechas });
                }
                if (op.t >= op.dur) this.apagar();
            } else if (op.estado === "espera" && this.entradaOn) {
                op.t += dt;
                if (op.t >= op.dur) this.aparecer();
            }

            // guía del dedo: al lado de la estrella, señalándola (no la tapa)
            if (this.dedoOn && this.nivel) {
                this.dedoT += dt;
                var r0 = this.nivel.estrella.r;
                var vaiven = Math.sin(this.dedoT / 260) * 12;
                this.dedo.setPosition(this.cx + r0 * 0.95 + 70 + vaiven, this.cy + r0 * 0.9 + 70 + vaiven);
                this.dedo.setAlpha(Math.min(1, this.dedo.alpha + dt / 300));
            }

            // fuegos artificiales (festival) y estrellas fugaces (nivel mágico)
            var tm = TEMAS[this.tema] || TEMAS.feria;
            if (tm.fuegos && da > 0.5 && !reducido) {
                this.tFuegos -= dt;
                if (this.tFuegos <= 0) { this.tFuegos = tm.fuegos * azarEn(0.8, 1.3); this.fuego(); }
            }
            if (tm.fugaces && da > 0.5 && !reducido) {
                this.tFugaz -= dt;
                if (this.tFugaz <= 0) {
                    this.tFugaz = tm.fugaces * azarEn(0.7, 1.3);
                    var izq = Math.random() < 0.5;
                    this.pCielo.emitir(izq ? azarEn(120, 380) : azarEn(1150, 1450), azarEn(40, 140), { n: 6, angulo: izq ? 0.5 : Math.PI - 0.5, apertura: 0.05, vel: 520, vida: 900, escala: 0.45, tintes: [0xffffff, 0xfff3bf], roce: 1, dispersion: 30 });
                }
            }

            // progreso: estrellas que hacen pop
            var animando = false;
            for (var j = 0; j < this.progPop.length; j++) {
                if (this.progPop[j] > 0) { this.progPop[j] = Math.max(0, this.progPop[j] - dt / 500); animando = true; }
            }
            if (animando) this.pintarProgreso();

            // lluvia de confeti y estrellas en la fiesta final
            if (this.fiestaOn && !reducido) {
                this.tConfeti -= dt;
                if (this.tConfeti <= 0) {
                    this.tConfeti = 90;
                    this.particulas.emitir(azarEn(200, 1400), -20, { n: 3, tipos: ["confeti", "estrellita"], angulo: Math.PI / 2, apertura: 0.6, vel: 160, vida: 3400, escala: 0.6, grav: 60, normal: true, tintes: FIESTA.concat(DORADOS), oscila: 60, encoge: 0 });
                }
            }
        }
    } : null;

    function sfxAviso(n) { avisar("sonido", n); }

    // ------------------------------------------------------------------ coordenadas mundo ↔ pantalla

    function lienzoRect() {
        var c = juego && juego.canvas;
        return c ? c.getBoundingClientRect() : null;
    }

    function aPantalla(x, y) {
        var r = lienzoRect();
        if (!r) return { x: x, y: y };
        return { x: r.left + x * r.width / W, y: r.top + y * r.height / H };
    }

    function aMundo(x, y) {
        var r = lienzoRect();
        if (!r) return { x: x, y: y };
        return { x: (x - r.left) * W / r.width, y: (y - r.top) * H / r.height };
    }

    function crearJuego() {
        juego = new Phaser.Game({
            type: Phaser.AUTO,
            parent: el,
            transparent: false,
            backgroundColor: "#120a3a",
            banner: false,
            scale: { mode: Phaser.Scale.ENVELOP, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
            input: { activePointers: 2 },
            render: { antialias: true },
            scene: [EscenaFeria]
        });
        global.__escenarioDiana = juego;
        global.__pedniaPhaserGame = juego;
    }

    // ------------------------------------------------------------------ API pública

    global.EscenarioDiana = {
        W: W,
        H: H,
        montar: function (contenedor, config) {
            el = contenedor;
            cfg = config;
            if (!Phaser || !el) return Promise.resolve(false);
            return D().preparar(config).then(function () {
                return new Promise(function (resolve) {
                    espera = resolve;
                    crearJuego();
                    setTimeout(function () {
                        if (espera === resolve) { espera = null; resolve(!!escena); }
                    }, 8000);
                });
            });
        },
        listo: function () { return !!escena; },
        al: function (nombre, fn) { cb[nombre] = fn; },
        reacomodar: function () { if (juego) juego.scale.refresh(); },
        cargar: function (nivel, ronda) { if (escena) escena.cargar(nivel, ronda); },
        presentar: function () { return escena ? escena.presentar() : Promise.resolve(); },
        demo: function (mano) { return escena ? escena.demo(mano) : Promise.resolve(); },
        iniciarRonda: function () { if (escena) escena.iniciarRonda(); },
        /** Estrella de muestra en la presentación (parpadea en el centro; no se puede tocar). */
        muestra: function (on) {
            if (!escena || !escena.nivel) return;
            if (!on) { escena.detener(); return; }
            escena.aparecer(true).then(function () { if (escena.op.estado === "visible") escena.op.estado = "demo"; });
        },
        detener: function () { if (escena) escena.detener(); },
        /** Habilita o bloquea los toques (un dedo apoyado se olvida sin contar). */
        entrada: function (on) {
            if (!escena) return;
            escena.entradaOn = !!on;
            if (!on) escena.soltarSinToque();
        },
        guiaDedo: function (on) { if (escena) escena.guiaDedo(on); },
        ayudaVisual: function () { if (escena) escena.ayudaVisual(); },
        celebrarNivel: function (grande) { return escena ? escena.celebrarNivel(grande) : Promise.resolve(); },
        salida: function () { return escena ? escena.salida() : Promise.resolve(); },
        fiesta: function (on) { if (escena) escena.fiesta(on); },
        pausar: function (on) {
            if (!escena) return;
            escena.pausado = !!on;
            escena.anim.pausado = !!on;
            if (on) escena.soltarSinToque();
        },
        mostrarProgreso: function (on) {
            if (!escena) return;
            escena.mostrarProg = !!on;
            escena.pintarProgreso();
        },
        aPantalla: aPantalla,
        aMundo: aMundo,
        /** Centro de la estrella (pantalla). */
        puntoEstrella: function () {
            if (!escena || !escena.nivel) return null;
            return aPantalla(escena.nivel.estrella.x, escena.nivel.estrella.y);
        },
        /** Pruebas: gestos en coordenadas del mundo. */
        probar: {
            gesto: function (x0, y0, x1, y1, ms) {
                if (!escena) return false;
                var t0 = performance.now();
                escena.bajar("prueba", { x: x0, y: y0, t: t0 });
                if (!escena.ptr) return true;
                escena.subir({ x: x1, y: y1, t: t0 + (ms || 120) });
                return true;
            },
            tocar: function (dx, dy) {
                if (!escena || !escena.nivel) return false;
                var x = escena.nivel.estrella.x + (dx || 0), y = escena.nivel.estrella.y + (dy || 0);
                return global.EscenarioDiana.probar.gesto(x, y, x, y, 120);
            },
            /** Mantiene el dedo apoyado ms milisegundos y suelta (sin moverse). */
            mantener: function (ms) {
                var e = escena;
                if (!e || !e.nivel) return false;
                var x = e.nivel.estrella.x, y = e.nivel.estrella.y;
                return global.EscenarioDiana.probar.gesto(x, y, x, y, ms || 3000);
            },
            deslizar: function () {
                var e = escena;
                if (!e || !e.nivel) return false;
                var x = e.nivel.estrella.x, y = e.nivel.estrella.y;
                return global.EscenarioDiana.probar.gesto(x, y, x + 160, y + 20, 250);
            },
            /** Dos "arriba" del mismo dedo: el segundo no debe contar. */
            dobleArriba: function () {
                var e = escena;
                if (!e || !e.nivel) return false;
                var x = e.nivel.estrella.x, y = e.nivel.estrella.y, t0 = performance.now();
                e.bajar("prueba", { x: x, y: y, t: t0 });
                e.subir({ x: x, y: y, t: t0 + 100 });
                e.subir({ x: x, y: y, t: t0 + 140 });
                return true;
            },
            paso: function (ms) { if (escena) escena.update(0, ms || 16); }
        },
        estado: function () {
            if (!escena || !escena.nivel) return null;
            return {
                op: escena.op.estado,
                t: Math.round(escena.op.t),
                dur: Math.round(escena.op.dur),
                ayuda: escena.op.ayuda,
                nivel: escena.nivel.id,
                tema: escena.tema,
                entrada: escena.entradaOn,
                pausado: escena.pausado,
                hechas: escena.marcador.hechas,
                total: escena.marcador.total,
                fueras: escena.marcador.fueras,
                apagadas: escena.marcador.apagadas,
                completo: escena.marcador.completo,
                dedo: escena.dedoOn,
                estrella: { x: Math.round(escena.estrella.x), y: Math.round(escena.estrella.y), visible: escena.estrella.visible, alpha: Math.round(escena.estrella.alpha * 100) / 100, r: escena.nivel.estrella.r },
                zona: escena.nivel.zona,
                deco: escena.deco.length
            };
        }
    };
})(typeof window !== "undefined" ? window : global);
