/**
 * EscenarioCanon — escena Phaser 4 de "El Cañón Láser y los Meteoritos en Movimiento" (window.EscenarioCanon).
 *
 * Dibuja el espacio por capas (cielo estrellado, nebulosas que respiran, galaxia, planetas que giran un poco, luna,
 * constelaciones, asteroides lejanos, polvo estelar y estrellas fugaces) y la base de defensa (consola con luces,
 * plataforma con pulsos de energía, torreta, tubo del cañón, núcleo, arco indicador de ángulo, rueda de giro y botón
 * DISPARAR). Los meteoritos cruzan por carriles (ReglasCanon) con estela; el proyectil sale de la boca del cañón y
 * sigue la misma recta que la línea de mira; la colisión se comprueba cada cuadro con las posiciones actuales.
 *
 * Estados de la escena: presentacion → demo → espera → jugando → completo (+ pausado).
 * Estados del cañón: listo ─DISPARAR→ recargando ─(recargaMs)→ listo.  Con el dedo en la rueda se gira, nunca se dispara.
 * Eventos para script.js: disparo, impacto, fallo, enMira, quieto, entra, nivelCompleto, demoPuntos, sonido.
 *
 * Mundo de diseño 1600 × 900 con Scale.ENVELOP; lo jugable cabe en 4:3 (x 230…1370). Cada animación que el flujo
 * espera es una Promise con respaldo por tiempo (Animador), que también respeta la pausa.
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser;
    var W = 1600, H = 900;

    var D = function () { return global.DibujosCanon; };
    var R = function () { return global.ReglasCanon; };

    var juego = null, escena = null, el = null, cfg = null, espera = null;
    var cb = {};

    function avisar(nombre, a) {
        var f = cb[nombre];
        if (typeof f === "function") {
            try { f(a); } catch (e) { console.warn("[EscenarioCanon]", nombre, e); }
        }
    }
    function sonar(n, a) { avisar("sonido", { n: n, a: a }); }

    function lerp(a, b, u) { return a + (b - a) * u; }
    function saleSuave(u) { return 1 - Math.pow(1 - u, 3); }
    function suave(u) { return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
    function jcfg() { return (cfg && cfg.juego) || {}; }
    function azarEn(a, b) { return a + Math.random() * (b - a); }
    function num(v, d) { var n = Number(v); return isFinite(n) ? n : d; }
    function elegir(l) { return l[Math.floor(Math.random() * l.length)]; }
    function dist(ax, ay, bx, by) { return Math.sqrt((ax - bx) * (ax - bx) + (ay - by) * (ay - by)); }

    var TINTE_MET = { dorado: 0xffb703, azul: 0x4dabf7, naranja: 0xff7b00, violeta: 0xb197fc };
    var CHISPAS_MET = {
        dorado: [0xffe066, 0xfff3bf, 0xffd43b, 0xffffff],
        azul: [0x74c0fc, 0xd0ebff, 0x4dabf7, 0xffffff],
        naranja: [0xffa94d, 0xffe8cc, 0xff922b, 0xffffff],
        violeta: [0xd0bfff, 0xf3f0ff, 0xb197fc, 0xffffff]
    };
    var CIAN = 0x63e6ff;
    var ARCOIRIS = [0xff6b6b, 0xffd43b, 0x69db7c, 0x4dabf7, 0xb197fc, 0xf783ac, 0x63e6be];

    // Lo que cambia en cada nivel (ambientación).
    var TEMAS = {
        nebulosa: { nebulas: [0x9b5de5, 0x4361ee, 0xf15bb5], fondo: 0x000000, planetas: ["anillo", "luna"], asteroides: 5, galaxia: false, fugazMs: 6000 },
        galaxiaAzul: { nebulas: [0x4cc9f0, 0x4361ee, 0x3a0ca3], fondo: 0x0b2a6b, planetas: ["azul", "luna"], asteroides: 6, galaxia: true, fugazMs: 5000 },
        asteroides: { nebulas: [0xf77f00, 0x9d4edd, 0x4361ee], fondo: 0x2b0f3d, planetas: ["verde", "anillo"], asteroides: 16, galaxia: false, fugazMs: 4800 },
        supernova: { nebulas: [0xff006e, 0x8338ec, 0x3a86ff, 0xffbe0b], fondo: 0x3a0b4f, planetas: ["azul", "anillo", "verde", "luna"], asteroides: 9, galaxia: true, fugazMs: 3600 }
    };

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
            a.timer = setTimeout(respaldo, dur + 600);
            self.lista.push(a);
        });
    };

    Animador.prototype.fin = function (a) {
        if (a.hecho) return;
        a.hecho = true;
        clearTimeout(a.timer);
        try { a.fn(1); } catch (e) { console.warn("[EscenarioCanon] anim", e); }
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

    Animador.prototype.vaciar = function () {
        var l = this.lista;
        this.lista = [];
        var self = this;
        l.forEach(function (a) { self.fin(a); });
    };

    // ------------------------------------------------------------------ partículas (reserva fija, se reutilizan)

    function Particulas(scene, n, prof) {
        this.lista = [];
        for (var i = 0; i < n; i++) {
            var im = scene.add.image(-100, -100, "chispa").setVisible(false).setDepth(prof || 30);
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
            var v = (o.vel || 200) * (0.45 + Math.random() * 0.7);
            var tx = tipos[Math.floor(Math.random() * tipos.length)];
            p.vivo = true;
            p.t = 0;
            p.vida = (o.vida || 700) * (0.7 + Math.random() * 0.5);
            p.vx = Math.cos(ang) * v;
            p.vy = Math.sin(ang) * v;
            p.grav = o.grav != null ? o.grav : 0;
            p.roce = o.roce != null ? o.roce : 0.985;
            p.giro = o.sinGiro ? 0 : (Math.random() - 0.5) * (o.giro || 6);
            p.esc = (o.escala || 0.35) * (0.6 + Math.random() * 0.7) / D().res(tx);
            p.encoge = o.encoge != null ? o.encoge : 0.35;
            p.img.setTexture(tx);
            p.img.setBlendMode(o.normal ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD);
            p.img.setTint(o.tintes ? elegir(o.tintes) : 0xffffff);
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
            p.img.x += p.vx * s;
            p.img.y += p.vy * s;
            p.img.rotation += p.giro * s;
            p.img.setAlpha(p.a0 * (u < 0.65 ? 1 : 1 - (u - 0.65) / 0.35));
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

    // ------------------------------------------------------------------ escena

    var EscenaEspacio = Phaser ? class extends Phaser.Scene {
        constructor() { super({ key: "Espacio" }); }

        create() {
            var self = this;
            D().claves().forEach(function (k) { tex(self, k); });
            var j = jcfg();
            this.C = R().canon(j);
            this.DIA = { x: num(j.diaX, 548), y: num(j.diaY, 806), r: num(j.diaRadio, 96) };
            this.BOT = { x: num(j.botonX, 1052), y: num(j.botonY, 800), r: num(j.botonRadio, 84) };
            this.anim = new Animador();
            this.t = 0;
            this.gen = 0;
            this.pausado = false;
            this.entradaOn = false;
            this.ayudaAuto = true;
            this.estado = "presentacion";
            this.canonEstado = "listo";
            this.recargaT = 0;
            this.recargaMs = 650;
            this.nivel = null;
            this.ronda = null;
            this.marcador = null;
            this.tema = "nebulosa";
            this.angulo = 0;            // ángulo real del cañón (la mira y el disparo usan este)
            this.objetivo = 0;          // a dónde lo lleva el dedo (el real lo sigue con suavidad)
            this.pasoGiro = 0;
            this.arrastre = null;
            this.proyectiles = [];
            this.activos = [];          // meteoritos en pantalla
            this.cola = [];             // meteoritos que faltan por salir
            this.slotsLibres = [];
            this.tQuieto = 0;
            this.ayudaOn = false;
            this.enMiraId = null;
            this.brilloCanon = 0;
            this.pulsoPlat = 0;
            this.lucesConsolaT = 0;
            this.fiestaOn = false;
            this.tFiesta = 0;
            this.tFugaz = 2500;
            this.demoMeteoro = false;
            this.velDemo = 0;

            // ---------------- cielo y capas lejanas
            this.cameras.main.setBackgroundColor("#070b2e");
            img(this, W / 2, H / 2, "cielo", 1).setDepth(0);
            this.tinteFondo = this.add.rectangle(W / 2, H / 2, W, H, 0x000000).setDepth(0.2).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
            this.nebulas = [];
            var posNeb = [[330, 260, 2.2], [1250, 200, 2.4], [800, 470, 2.8], [1400, 560, 1.8]];
            posNeb.forEach(function (q, i) {
                var n = img(self, q[0], q[1], "nebulosa", q[2]).setDepth(0.5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.3);
                n.x0 = q[0];
                n.y0 = q[1];
                n.fase = i * 1.7;
                n.a0 = 0.26;
                n.extra = 0;
                n.rot0 = azarEn(-0.3, 0.3);
                n.setRotation(n.rot0);
                self.nebulas.push(n);
            });
            this.galaxia = img(this, 1180, 150, "galaxia", 0.9).setDepth(0.7).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.55).setTint(0xd0bfff).setRotation(-0.3);
            this.constelaciones = this.add.graphics().setDepth(0.8);
            // estrellas que titilan (y reaccionan a impactos y disparos)
            this.estrellas = [];
            for (var e = 0; e < 46; e++) {
                var st = img(this, azarEn(20, W - 20), azarEn(20, 700), e % 3 ? "punto" : "chispa", azarEn(0.25, 0.6)).setDepth(0.9).setBlendMode(Phaser.BlendModes.ADD);
                st.fase = Math.random() * 6;
                st.vel = azarEn(0.8, 2.4);
                st.a0 = azarEn(0.4, 0.9);
                st.extra = 0;
                st.setTint(elegir([0xffffff, 0xd0ebff, 0xfff3bf, 0xe5dbff]));
                this.estrellas.push(st);
            }
            // planetas y luna
            this.planetas = {
                anillo: img(this, 330, 575, "planetaAnillo", 0.6).setDepth(1),
                azul: img(this, 1270, 300, "planetaAzul", 0.95).setDepth(1),
                verde: img(this, 1290, 590, "planetaVerde", 0.5).setDepth(1),
                luna: img(this, 620, 205, "luna", 0.5).setDepth(1)
            };
            this.planetaLuz = {};
            Object.keys(this.planetas).forEach(function (k, i) {
                var p = self.planetas[k];
                p.x0 = p.x;
                p.y0 = p.y;
                p.fase = i * 1.3;
                p.extra = 0;
                self.planetaLuz[k] = img(self, p.x, p.y, "luz", 3.2 * p.base * D().res(k === "luna" ? "luna" : "planetaAzul")).setDepth(0.95).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
            });
            // asteroides lejanos que flotan despacio
            this.lejanos = [];
            for (var a = 0; a < 18; a++) {
                var as = img(this, azarEn(0, W), azarEn(90, 640), "asteroide" + (a % 3), azarEn(0.18, 0.42)).setDepth(1.2).setTint(elegir([0x5c6bc0, 0x7048e8, 0x4263eb])).setAlpha(0.55);
                as.vx = azarEn(6, 16) * (Math.random() < 0.5 ? -1 : 1);
                as.vy = azarEn(-3, 3);
                as.giro = azarEn(-0.3, 0.3);
                this.lejanos.push(as);
            }
            // polvo estelar que flota (se aparta al paso del láser)
            this.polvo = [];
            for (var p = 0; p < 40; p++) {
                var pv = img(this, azarEn(0, W), azarEn(60, 720), "punto", azarEn(0.18, 0.35)).setDepth(1.4).setBlendMode(Phaser.BlendModes.ADD).setAlpha(azarEn(0.3, 0.7)).setTint(elegir([0xc5f6fa, 0xe5dbff, 0xffffff]));
                pv.vx = azarEn(-8, 8);
                pv.vy = azarEn(-6, 4);
                pv.ex = 0;
                pv.ey = 0;
                this.polvo.push(pv);
            }
            this.fugaz = img(this, -300, 100, "fugaz", 1).setDepth(1.3).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
            this.fugaz.activa = false;

            // ---------------- capa del juego
            this.gRuta = this.add.graphics().setDepth(4);          // trayectorias de los meteoritos (niveles 3 y 4)
            this.gMira = this.add.graphics().setDepth(6);          // línea de mira
            this.finMira = img(this, 0, 0, "punto", 0.9).setDepth(6.2).setBlendMode(Phaser.BlendModes.ADD).setTint(CIAN);
            this.reticula = img(this, 0, 0, "reticula", 0.9).setDepth(9).setBlendMode(Phaser.BlendModes.ADD).setTint(0x8ce99a).setAlpha(0);
            this.marcaAyuda = img(this, 0, 0, "anillo", 0.8).setDepth(8.9).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffe066).setAlpha(0);

            // ---------------- base de defensa
            this.consola = img(this, W / 2, H, "consola", 1).setOrigin(0.5, 1).setDepth(20);
            this.lucesConsola = [];
            for (var lc = 0; lc < 12; lc++) {
                var lx = lc < 6 ? 70 + lc * 46 : 1290 + (lc - 6) * 46;
                var lz = img(this, lx, 868, "punto", 0.5).setDepth(20.5).setBlendMode(Phaser.BlendModes.ADD).setTint(lc % 2 ? CIAN : 0xffd43b).setAlpha(0.5);
                lz.fase = lc * 0.6;
                this.lucesConsola.push(lz);
            }
            this.platLuz = img(this, this.C.x, this.C.y + 14, "luz", 4.2).setDepth(20.6).setBlendMode(Phaser.BlendModes.ADD).setTint(0x4dabf7).setAlpha(0.35).setScale(4.2, 1.6);
            this.plataforma = img(this, this.C.x, this.C.y + 12, "plataforma", 0.9).setOrigin(0.5, 100 / 200).setDepth(21);
            this.gArco = this.add.graphics().setDepth(21.5);        // arco luminoso de orientación alrededor de la plataforma
            this.ondas = [];
            for (var o = 0; o < 4; o++) this.ondas.push(img(this, this.C.x, this.C.y + 10, "anillo", 1).setDepth(21.2).setBlendMode(Phaser.BlendModes.ADD).setTint(CIAN).setAlpha(0));
            this.tubo = img(this, this.C.x, this.C.y, "canon", this.C.largo / 196).setOrigin(60 / 120, 214 / 240).setDepth(22);
            this.torreta = img(this, this.C.x, this.C.y + 6, "torreta", 0.74).setOrigin(0.5, 60 / 150).setDepth(23);
            this.nucleo = img(this, this.C.x, this.C.y, "luz", 1.1).setDepth(23.5).setBlendMode(Phaser.BlendModes.ADD).setTint(CIAN).setAlpha(0.6);
            this.bocaLuz = img(this, 0, 0, "luz", 1.3).setDepth(24).setBlendMode(Phaser.BlendModes.ADD).setTint(0xc5f6fa).setAlpha(0);

            // rueda de giro (control del ángulo) e indicador de aguja
            this.rueda = img(this, this.DIA.x, this.DIA.y, "rueda", (this.DIA.r + 18) / 116).setOrigin(130 / 260, 140 / 170).setDepth(24);
            this.gRueda = this.add.graphics().setDepth(24.5);
            this.perilla = img(this, this.DIA.x, this.DIA.y, "perilla", 0.95).setDepth(25);
            this.perillaLuz = img(this, this.DIA.x, this.DIA.y, "luz", 1.1).setDepth(24.8).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffe066).setAlpha(0.3);
            this.textoRueda = this.add.text(this.DIA.x, this.DIA.y + 46, "GIRAR", { fontFamily: "Fredoka, Arial", fontSize: "26px", fontStyle: "bold", color: "#c5f6fa", stroke: "#0b1240", strokeThickness: 6 }).setOrigin(0.5).setDepth(25);

            // botón DISPARAR con anillo de energía (recarga)
            this.botonLuz = img(this, this.BOT.x, this.BOT.y, "luz", 3.2).setDepth(24).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffa94d).setAlpha(0.45);
            this.boton = img(this, this.BOT.x, this.BOT.y, "boton", this.BOT.r / 96).setOrigin(0.5, 108 / 220).setDepth(25);
            this.gBoton = this.add.graphics().setDepth(25.5);
            this.textoBoton = this.add.text(this.BOT.x, this.BOT.y + 40, "DISPARAR", { fontFamily: "Fredoka, Arial", fontSize: "30px", fontStyle: "bold", color: "#ffffff", stroke: "#8a2c00", strokeThickness: 7 }).setOrigin(0.5).setDepth(26);
            this.hundido = 0;

            // ---------------- meteoritos, láser y efectos
            this.particulas = new Particulas(this, 260, 30);
            this.reservaLaser = [];
            for (var lz2 = 0; lz2 < 4; lz2++) {
                this.reservaLaser.push({
                    img: img(this, -100, -100, "laser", 1.1).setOrigin(1, 0.5).setDepth(12).setBlendMode(Phaser.BlendModes.ADD).setTint(CIAN).setVisible(false),
                    luz: img(this, -100, -100, "luz", 0.9).setDepth(11.9).setBlendMode(Phaser.BlendModes.ADD).setTint(0x99e9f2).setVisible(false),
                    libre: true
                });
            }
            this.textos = [];
            this.brillo = this.add.rectangle(W / 2, H / 2, W, H, 0xffffff).setDepth(60).setAlpha(0);
            this.supernova = img(this, W / 2, 360, "luz", 1).setDepth(3).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
            this.gHiper = this.add.graphics().setDepth(59);

            this.teclas = { izq: false, der: false };
            this.tLayout = 0;
            this.crearEntrada();
            this.colocarControles();
            this.ponerAngulo(0, true);
            escena = this;
            if (espera) { var ok = espera; espera = null; ok(true); }
        }

        // ------------------------------------------------------------------ entrada: rueda, cañón y botón

        crearEntrada() {
            var self = this;
            this.input.on("pointerdown", function (p) {
                self.scale.updateBounds();
                self.alTocar(p);
            });
            this.input.on("pointermove", function (p) {
                if (self.arrastre && self.arrastre.id === p.id && p.isDown) self.alArrastrar(p);
            });
            var soltar = function (p) {
                if (self.arrastre && self.arrastre.id === p.id) self.arrastre = null;
            };
            this.input.on("pointerup", soltar);
            this.input.on("pointerupoutside", soltar);
            var lienzo = this.game.canvas;
            if (lienzo) lienzo.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });
            this.crearTeclado();
        }

        /**
         * La rueda va pegada al borde izquierdo de lo que se ve y el botón DISPARAR justo encima de los botones de
         * accesibilidad y volumen (DOM), en cualquier proporción de pantalla (ENVELOP recorta los lados en 4:3).
         */
        colocarControles() {
            var izq = aMundo(0, 0), der = aMundo(global.innerWidth || W, global.innerHeight || H);
            var x0 = Math.max(0, izq.x), x1 = Math.min(W, der.x);
            var anchoRueda = (this.DIA.r + 18) / 116 * 130;
            var dx = x0 + 26 + anchoRueda;
            var bx = this.BOT.x, by = this.BOT.y, r = this.BOT.r;
            var fabs = ["btn-menu-acc", "btn-menu-vol"].map(function (id) { return document.getElementById(id); }).filter(Boolean);
            if (fabs.length) {
                var a = fabs[0].getBoundingClientRect(), b = fabs[fabs.length - 1].getBoundingClientRect();
                var p0 = aMundo(Math.min(a.left, b.left), Math.min(a.top, b.top));
                var p1 = aMundo(Math.max(a.right, b.right), Math.max(a.bottom, b.bottom));
                if (p1.x > p0.x && p0.y > 0) {
                    bx = (p0.x + p1.x) / 2;
                    by = p0.y - 22 - r;
                }
            }
            bx = Math.max(this.C.x + 260 + r, Math.min(x1 - r - 34, bx));
            by = Math.max(600, Math.min(H - r - 10, by));
            if (Math.abs(dx - this.DIA.x) < 0.5 && Math.abs(bx - this.BOT.x) < 0.5 && Math.abs(by - this.BOT.y) < 0.5) return;
            this.DIA.x = dx;
            this.BOT.x = bx;
            this.BOT.y = by;
            this.rueda.setPosition(this.DIA.x, this.DIA.y);
            this.textoRueda.setPosition(this.DIA.x, this.DIA.y + 46);
            this.botonLuz.setPosition(this.BOT.x, this.BOT.y);
            this.boton.setPosition(this.BOT.x, this.BOT.y);
            this.textoBoton.setPosition(this.BOT.x, this.BOT.y + 40);
            this.ponerAngulo(this.angulo, false);
        }

        /** PC: flechas ← → giran el cañón (mientras se mantienen) y ESPACIO dispara. */
        crearTeclado() {
            var self = this;
            var abajo = function (ev) {
                var k = ev.code || ev.key;
                var esFlecha = k === "ArrowLeft" || k === "ArrowRight" || k === "Left" || k === "Right";
                var esEspacio = k === "Space" || ev.key === " " || k === "Spacebar";
                if (!esFlecha && !esEspacio) return;
                if (!self.puedeApuntar()) return;
                ev.preventDefault();
                // que ESPACIO no "pulse" el botón del DOM que tenga el foco (pausa, reiniciar…)
                if (document.activeElement && document.activeElement !== document.body && document.activeElement.blur) document.activeElement.blur();
                if (esFlecha) {
                    if (k === "ArrowLeft" || k === "Left") self.teclas.izq = true;
                    else self.teclas.der = true;
                    self.tQuieto = 0;
                } else if (!ev.repeat) {
                    self.disparar(false);
                }
            };
            var arriba = function (ev) {
                var k = ev.code || ev.key;
                if (k === "ArrowLeft" || k === "Left") self.teclas.izq = false;
                if (k === "ArrowRight" || k === "Right") self.teclas.der = false;
            };
            global.addEventListener("keydown", abajo, true);
            global.addEventListener("keyup", arriba, true);
            global.addEventListener("blur", function () { self.teclas.izq = self.teclas.der = false; });
        }

        puedeApuntar() { return this.entradaOn && !this.pausado && this.estado === "jugando"; }

        alTocar(p) {
            if (!this.puedeApuntar()) return;
            var x = p.worldX, y = p.worldY;
            // 1) el botón DISPARAR (solo dispara; nunca cambia el ángulo)
            if (dist(x, y, this.BOT.x, this.BOT.y) <= this.BOT.r + 16) {
                this.disparar(false);
                return;
            }
            // 2) la rueda de giro (solo gira; nunca dispara)
            if (dist(x, y, this.DIA.x, this.DIA.y) <= this.DIA.r + 44 && y <= this.DIA.y + 50) {
                this.arrastre = { id: p.id, modo: "rueda" };
                this.alArrastrar(p);
                return;
            }
            // 3) el propio cañón y su plataforma: el cañón mira hacia el dedo
            if (dist(x, y, this.C.x, this.C.y) <= 230 && y <= this.C.y + 40) {
                this.arrastre = { id: p.id, modo: "canon" };
                this.alArrastrar(p);
            }
        }

        alArrastrar(p) {
            if (!this.puedeApuntar() || !this.arrastre) return;
            var c = this.arrastre.modo === "rueda" ? { x: this.DIA.x, y: this.DIA.y } : { x: this.C.x, y: this.C.y };
            var dx = p.worldX - c.x, dy = Math.min(c.y - p.worldY, 400);
            if (dy < 8) dy = 8;                         // por debajo del centro: queda en el extremo de ese lado
            var a = Math.atan2(dx, dy);
            this.objetivo = R().limitarAngulo(a, this.C);
            this.tQuieto = 0;
        }

        /** Coloca el cañón (y todo lo que lo acompaña). */
        ponerAngulo(a, inmediato) {
            this.angulo = a;
            if (inmediato) this.objetivo = a;
            this.tubo.setRotation(a);
            this.torreta.setRotation(a * 0.22);
            var b = R().boca(this.C, a);
            this.bocaLuz.setPosition(b.x, b.y);
            // aguja de la rueda (indicador del ángulo)
            var kr = this.DIA.r * 0.86;
            this.perilla.setPosition(this.DIA.x + Math.sin(a) * kr, this.DIA.y - Math.cos(a) * kr);
            this.perillaLuz.setPosition(this.perilla.x, this.perilla.y);
        }

        // ------------------------------------------------------------------ nivel

        cargar(nivel, ronda) {
            this.gen++;
            this.anim.vaciar();
            this.limpiarJuego();
            this.nivel = nivel;
            this.ronda = ronda || {};
            this.tema = TEMAS[nivel.tema] ? nivel.tema : "nebulosa";
            this.marcador = R().crearMarcador(nivel);
            this.cola = nivel.meteoritos.slice();
            this.slotsLibres = [];
            for (var s = 0; s < nivel.simultaneos; s++) this.slotsLibres.push(s);
            this.recargaMs = nivel.recargaMs;
            this.canonEstado = "listo";
            this.recargaT = 0;
            this.tQuieto = 0;
            this.ayudaOn = false;
            this.enMiraId = null;
            this.estado = "presentacion";
            this.ponerAngulo(0, true);
            this.aplicarTema();
        }

        limpiarJuego() {
            this.activos.forEach(function (m) { m.partes.forEach(function (o) { o.destroy(); }); });
            this.activos = [];
            this.proyectiles.forEach(function (p) { p.res.libre = true; p.res.img.setVisible(false); p.res.luz.setVisible(false); });
            this.proyectiles = [];
            this.textos.forEach(function (t) { t.destroy(); });
            this.textos = [];
            this.particulas.apagar();
            this.reticula.setAlpha(0);
            this.marcaAyuda.setAlpha(0);
            this.gRuta.clear();
            this.arrastre = null;
            this.demoMeteoro = false;
        }

        aplicarTema() {
            var T = TEMAS[this.tema];
            var self = this;
            this.nebulas.forEach(function (n, i) {
                n.setTint(T.nebulas[i % T.nebulas.length]);
                n.setVisible(i < (T.nebulas.length >= 4 ? 4 : 3));
                n.x = n.x0 + azarEn(-60, 60);
                n.y0 = n.y0 + azarEn(-10, 10) * 0;
                n.setRotation(n.rot0 + azarEn(-0.2, 0.2));
            });
            this.tinteFondo.setFillStyle(T.fondo).setAlpha(T.fondo ? 0.25 : 0);
            this.galaxia.setVisible(T.galaxia);
            Object.keys(this.planetas).forEach(function (k) {
                var on = T.planetas.indexOf(k) >= 0;
                self.planetas[k].setVisible(on);
                self.planetaLuz[k].setVisible(on).setAlpha(0);
            });
            this.lejanos.forEach(function (a, i) { a.setVisible(i < T.asteroides); });
            // constelaciones: tres grupitos de estrellas unidas con líneas tenues, en lugares distintos cada vez
            var g = this.constelaciones;
            g.clear();
            for (var c = 0; c < 3; c++) {
                var cx = azarEn(260, 1340), cy = azarEn(110, 420);
                var pts = [];
                for (var k = 0; k < 5; k++) pts.push([cx + azarEn(-110, 110), cy + azarEn(-60, 60)]);
                pts.sort(function (a, b) { return a[0] - b[0]; });
                g.lineStyle(2, 0xbac8ff, 0.22);
                g.beginPath();
                g.moveTo(pts[0][0], pts[0][1]);
                for (var q = 1; q < pts.length; q++) g.lineTo(pts[q][0], pts[q][1]);
                g.strokePath();
                pts.forEach(function (pp) { g.fillStyle(0xe5dbff, 0.7); g.fillCircle(pp[0], pp[1], 3); });
            }
            this.estrellas.forEach(function (st) { st.x = azarEn(20, W - 20); st.y = azarEn(20, 700); });
        }

        /** Entrada de nivel: el cañón se enciende y la plataforma late. */
        presentar() {
            var self = this;
            this.estado = "presentacion";
            sonar("activar");
            this.ondaPlataforma(CIAN);
            return this.anim.agregar(900, function (u) {
                self.nucleo.setAlpha(0.2 + 0.6 * u);
                self.brilloCanon = 1 - u;
            });
        }

        iniciarRonda() {
            if (!this.nivel) return;
            this.estado = "jugando";
            this.tQuieto = 0;
            var self = this;
            // salen los primeros meteoritos, separados en el tiempo
            var n = Math.min(this.nivel.simultaneos, this.cola.length);
            for (var i = 0; i < n; i++) this.programarSalida(i * 2600 + 400);
            this.canonListo(true);
            void self;
        }

        /** Sale el siguiente meteorito de la cola tras ms (en un carril libre). */
        programarSalida(ms) {
            var self = this, gen = this.gen;
            if (!this.cola.length || !this.slotsLibres.length) return;
            var slot = this.slotsLibres.shift();
            var def = this.cola.shift();
            this.anim.agregar(ms, function () {}).then(function () {
                if (gen !== self.gen) return;
                self.crearMeteorito(def, slot, null);
            });
        }

        crearMeteorito(def, slot, opciones) {
            var o = opciones || {};
            var nv = this.nivel;
            def = Object.assign({}, def);       // la vida de la coraza no se guarda en la partida generada
            var carril = o.carril != null ? o.carril : this.carrilLibre();
            var m = { d: def, id: def.id, golpes: def.golpes || 1, carrilBase: carril, tipo: def.tipo, radio: def.radio, carril: carril, slot: slot, activo: true, entrando: 0, x: -500, y: carril, vx: 0, vy: 0, giro: azarEn(-0.8, 0.8), demo: !!o.demo };
            // sale por un lado al azar y, en la partida, aparece en un punto al azar del primer tramo de su pasada
            var dir = o.dir || (Math.random() < 0.5 ? 1 : -1);
            var rondaMov = o.ronda || nv.ronda;
            R().nuevaPasada(m, dir, rondaMov, Math.random);
            if (!m.demo) m.t = azarEn(0, 0.3) * m.largo / m.vel * 1000;
            m.estela = img(this, 0, 0, "estela", 1).setOrigin(1, 0.5).setDepth(7).setBlendMode(Phaser.BlendModes.ADD).setTint(TINTE_MET[m.tipo] || 0xffb703).setAlpha(0.85);
            m.halo = img(this, 0, 0, "luz", m.radio / 26).setDepth(7.5).setBlendMode(Phaser.BlendModes.ADD).setTint(TINTE_MET[m.tipo] || 0xffb703).setAlpha(m.tipo === "dorado" ? 0.55 : 0.4);
            m.img = img(this, 0, 0, "met_" + m.tipo, m.radio / 80).setDepth(8);
            m.flechas = [];
            for (var f = 0; f < 3; f++) m.flechas.push(img(this, 0, 0, "flecha", 0.5 - f * 0.08).setDepth(7.8).setBlendMode(Phaser.BlendModes.ADD).setTint(TINTE_MET[m.tipo]).setAlpha(0));
            m.partes = [m.estela, m.halo, m.img].concat(m.flechas);
            // coraza: placas de roca y metal alrededor + dos escuditos que dicen cuántos disparos faltan
            m.pips = [];
            if (m.golpes > 1) {
                m.coraza = img(this, 0, 0, "coraza", m.radio / 80).setDepth(8.2);
                m.partes.push(m.coraza);
                for (var q = 0; q < m.golpes; q++) {
                    var pip = img(this, 0, 0, "escudo", 0.55).setDepth(8.4);
                    m.pips.push(pip);
                    m.partes.push(pip);
                }
            }
            m.tChispa = 0;
            this.activos.push(m);
            this.moverMeteorito(m, 0);
            this.portal(m.x, m.y, m);
            if (!m.demo) avisar("entra", { tipo: m.tipo, coraza: m.golpes > 1 });
            sonar("entra");
            return m;
        }

        /** Un carril al azar entre los que no usa otro meteorito en pantalla. */
        carrilLibre() {
            var usados = this.activos.filter(function (a) { return a.activo && !a.demo; }).map(function (a) { return a.carrilBase; });
            var libres = this.nivel.carriles.filter(function (c) { return usados.indexOf(c) < 0; });
            var c = elegir(libres.length ? libres : this.nivel.carriles);
            return c;
        }

        moverMeteorito(m, dt) {
            m.t += dt;
            var pos = R().posicionPasada(m, m.t);
            if (pos.u >= 1) {
                // terminó su pasada sin ser alcanzado: vuelve por el otro lado (nunca desaparece del todo)
                var r2 = m.demo ? { velMin: m.vel, velMax: m.vel } : this.nivel.ronda;
                var dir = -m.dir;
                R().nuevaPasada(m, dir, r2, Math.random);
                pos = R().posicionPasada(m, 0);
                m.edad = 0;
                this.portal(pos.x, pos.y, m);
            }
            var vel = R().velocidadPasada(m, m.t);
            m.x = pos.x;
            m.y = pos.y;
            m.vx = vel.x;
            m.vy = vel.y;
            var ang = Math.atan2(vel.y, vel.x);
            // aparece y se apaga en los bordes de su pasada (portales de luz), nunca de golpe
            var restante = (1 - pos.u) * m.largo / m.vel * 1000;
            m.edad = (m.edad || 0) + dt;
            var vis = Math.max(0, Math.min(1, m.edad / 600, restante / 600));
            m.img.setAlpha(vis);
            m.estela.visible = vis > 0.05;
            m.halo.visible = vis > 0.05;
            m.img.setPosition(m.x, m.y);
            m.img.rotation += m.giro * dt / 1000;
            if (m.coraza && m.coraza.active) m.coraza.setPosition(m.x, m.y).setRotation(-m.img.rotation * 0.6).setAlpha(vis);
            for (var pi = 0; pi < m.pips.length; pi++) {
                var px = m.x + (pi - (m.pips.length - 1) / 2) * 30;
                m.pips[pi].setPosition(px, m.y - m.radio - 26 + Math.sin(this.t / 260 + pi) * 3).setAlpha(vis);
            }
            m.halo.setPosition(m.x, m.y);
            m.estela.setPosition(m.x, m.y).setRotation(ang);
            m.estela.setScale(m.radio * 3.4 / 360 / D().res("estela"), m.radio * 1.5 / 120 / D().res("estela"));
            // la estela vibra un poquito (energía)
            m.estela.setAlpha((0.7 + Math.sin(this.t / 90 + m.radio) * 0.12) * vis);
            m.halo.setAlpha(((m.tipo === "dorado" ? 0.5 : 0.36) + Math.sin(this.t / 300 + m.radio) * 0.1) * vis);
            // referencia de dirección (niveles 3 y 4, o con ayuda): flechitas por delante
            var verFlechas = (this.nivel && this.nivel.ronda.direccion) || this.ayudaOn;
            for (var f = 0; f < m.flechas.length; f++) {
                var fl = m.flechas[f];
                if (!verFlechas || !m.activo) { fl.setAlpha(0); continue; }
                var d = m.radio + 26 + f * 30 + ((this.t / 12) % 30);
                fl.setPosition(m.x + Math.cos(ang) * d, m.y + Math.sin(ang) * d).setRotation(ang);
                fl.setAlpha((0.75 - f * 0.22) * vis);
            }
            // chispitas de la estela
            m.tChispa -= dt;
            if (m.tChispa <= 0) {
                m.tChispa = 90;
                this.particulas.emitir(m.x - Math.cos(ang) * m.radio * 0.8, m.y - Math.sin(ang) * m.radio * 0.8, { n: 1, vel: 30, vida: 600, escala: 0.18, tintes: CHISPAS_MET[m.tipo], tipos: ["punto", "chispa"] });
            }
        }

        /** Portal de luz por donde entra un meteorito. */
        portal(x, y, m) {
            this.particulas.emitir(x, y, { n: 14, vel: 140, vida: 700, escala: 0.3, tintes: CHISPAS_MET[m.tipo], tipos: ["chispa", "punto"] });
            this.onda(x, y, TINTE_MET[m.tipo], m.radio / 70);
        }

        // ------------------------------------------------------------------ disparo

        canonListo(silencio) {
            this.canonEstado = "listo";
            this.recargaT = 0;
            this.boton.setTexture("boton");
            this.textoBoton.setStroke("#8a2c00", 7);
            if (!silencio) sonar("listo");
        }

        /** Toca DISPARAR: sale un proyectil de la boca del cañón con el ángulo actual. */
        disparar(demo) {
            if (this.canonEstado !== "listo" || this.pausado) return false;
            if (!demo && !this.puedeApuntar()) return false;
            var nv = this.nivel;
            var p = R().disparar(this.C, this.angulo, nv ? nv.velProyectil : 1250);
            var res = this.reservaLaser.find(function (r) { return r.libre; }) || this.reservaLaser[0];
            res.libre = false;
            res.img.setVisible(true).setAlpha(1).setRotation(this.angulo - Math.PI / 2).setPosition(p.x, p.y);
            res.luz.setVisible(true).setAlpha(0.9).setPosition(p.x, p.y);
            p.res = res;
            p.demo = !!demo;
            p.cercano = null;
            p.tAlFuego = this.t;
            // para el consejo amable: cuál meteorito tenía en mente (el de ángulo más parecido al disparo)
            p.objetivo = this.meteoritoMasCercanoAlAngulo(this.angulo);
            this.proyectiles.push(p);
            this.canonEstado = "recargando";
            this.recargaT = 0;
            this.boton.setTexture("botonCarga");
            this.textoBoton.setStroke("#1a237e", 7);
            this.hundido = 1;
            this.tQuieto = 0;
            // reacciones de la base y el fondo
            this.brilloCanon = 1;
            this.bocaLuz.setAlpha(1);
            this.ondaPlataforma(CIAN);
            this.lucesConsolaT = 600;
            var b = R().boca(this.C, this.angulo);
            this.particulas.emitir(b.x, b.y, { n: 14, vel: 260, vida: 420, escala: 0.3, angulo: this.angulo - Math.PI / 2, apertura: 1.2, tintes: [CIAN, 0xffffff, 0xc5f6fa] });
            this.estrellas.forEach(function (st) { st.extra = Math.max(st.extra, 0.25); });
            sonar("disparo");
            sonar("carga", this.recargaMs);
            if (!demo) avisar("disparo", { angulo: this.angulo });
            return true;
        }

        meteoritoMasCercanoAlAngulo(a) {
            var mejor = null, dif = Infinity, C = this.C;
            this.activos.forEach(function (m) {
                if (!m.activo) return;
                var am = R().anguloHacia(C, m.x, m.y);
                if (Math.abs(am - a) < dif) { dif = Math.abs(am - a); mejor = m; }
            });
            return mejor;
        }

        actualizarProyectiles(dt) {
            var self = this;
            var tol = this.nivel ? R().toleranciaConAyuda(this.nivel.tolerancia, this.marcador.fallosSeguidos, num(jcfg().fallosParaAsistir, 3)) : 1.3;
            var rp = num(jcfg().radioProyectil, 13);
            this.proyectiles = this.proyectiles.filter(function (p) {
                R().moverProyectil(p, dt);
                var res = p.res;
                if (p.vivo) {
                    res.img.setPosition(p.x, p.y);
                    res.luz.setPosition(p.x, p.y);
                    // estela de energía del láser y el polvo se aparta
                    self.particulas.emitir(p.x, p.y, { n: 1, vel: 20, vida: 300, escala: 0.22, tintes: [CIAN, 0xc5f6fa], tipos: ["punto"] });
                    self.empujarPolvo(p.x, p.y);
                    // seguimiento para el consejo: el paso más cercano al meteorito que tenía en mente
                    if (p.objetivo && p.objetivo.activo) {
                        var q = R().distSegmento(p.px, p.py, p.x, p.y, p.objetivo.x, p.objetivo.y);
                        if (!p.cercano || q.d < p.cercano.d) {
                            var cx = p.px + (p.x - p.px) * q.u, cy = p.py + (p.y - p.py) * q.u;
                            var adelante = (p.objetivo.x - cx) * p.objetivo.vx + (p.objetivo.y - cy) * p.objetivo.vy;
                            p.cercano = { d: q.d, adelante: adelante, mx: p.objetivo.x, my: p.objetivo.y };
                        }
                    }
                    var golpe = R().impacto(p, self.activos.filter(function (m) { return m.activo && (p.demo || !m.demo || self.demoMeteoro); }), tol, rp);
                    if (golpe) {
                        self.alImpactar(p, golpe);
                        res.libre = true;
                        res.img.setVisible(false);
                        res.luz.setVisible(false);
                        return false;
                    }
                    // se desvanece cerca del final de su recorrido
                    var margen = Math.min(p.x - R().CAMPO.x0, R().CAMPO.x1 - p.x, p.y - R().CAMPO.y0);
                    res.img.setAlpha(Math.max(0.15, Math.min(1, margen / 160)));
                    return true;
                }
                // salió del campo útil: no alcanzó nada
                res.libre = true;
                res.img.setVisible(false);
                res.luz.setVisible(false);
                self.particulas.emitir(p.px, p.py, { n: 6, vel: 60, vida: 500, escala: 0.2, tintes: [CIAN, 0xffffff], tipos: ["punto"] });
                if (!p.demo) self.alFallar(p);
                return false;
            });
        }

        alImpactar(p, golpe) {
            var m = golpe.meteorito;
            var met = this.activos.find(function (a) { return a.id === m.id; });
            if (!met) return;
            var demo = p.demo;
            var ganados = 0;
            var resultado = { meteorito: met.d, preciso: golpe.preciso };
            if (!demo) ganados = R().registrar(this.marcador, resultado, jcfg());
            if (resultado.parcial) {
                this.romperCoraza(met);
                this.flotarTexto(met.x, met.y - met.radio - 10, "+" + ganados, "#d0ebff");
                avisar("coraza", { faltan: met.d.vida, puntos: this.marcador.puntos, ganados: ganados });
                return;
            }
            met.activo = false;
            this.efectoImpacto(met, golpe.preciso);
            sonar("impacto", golpe.preciso);
            var self = this, gen = this.gen;
            this.anim.agregar(260, function () {}).then(function () { if (gen === self.gen) sonar("desintegra"); });
            if (demo) {
                avisar("demoPuntos", { puntos: met.d.puntos || 100 });
                return;
            }
            this.flotarTexto(met.x, met.y - met.radio - 10, "+" + ganados, met.tipo === "dorado" ? "#ffe066" : "#c5f6fa");
            sonar("recompensa", this.marcador.hechos);
            avisar("impacto", {
                tipo: met.tipo,
                coraza: met.golpes > 1,
                ganados: ganados,
                preciso: golpe.preciso,
                hechos: this.marcador.hechos,
                total: this.marcador.total,
                puntos: this.marcador.puntos
            });
            this.slotsLibres.push(met.slot);
            if (this.marcador.completo) {
                this.estado = "completo";
                this.entradaOn = false;
                this.arrastre = null;
                this.anim.agregar(1300, function () {}).then(function () {
                    if (gen === self.gen) avisar("nivelCompleto");
                });
            } else if (this.cola.length) {
                this.programarSalida(num(jcfg().pausaEntreMeteoritosMs, 900));
            }
        }

        alFallar(p) {
            var registro = R().registrar(this.marcador, null, jcfg());
            void registro;
            sonar("pierde");
            var rel = "";
            if (p.cercano && p.objetivo && p.cercano.d < p.objetivo.radio * 3.2) rel = p.cercano.adelante > 0 ? "detras" : "delante";
            var info = { relacion: rel, anguloDisparo: p.angulo, anguloMeteorito: p.objetivo ? R().anguloIntercepcion(this.C, this.nivel.velProyectil, { x: p.cercano ? p.cercano.mx : p.objetivo.x, y: p.cercano ? p.cercano.my : p.objetivo.y }, { x: 0, y: 0 }) : p.angulo };
            avisar("fallo", { consejo: R().consejo(info), seguidos: this.marcador.fallosSeguidos, fallos: this.marcador.fallos });
            if (this.marcador.fallosSeguidos >= num(jcfg().fallosParaAyuda, 2) && this.ayudaAuto) this.ayudaOn = true;
        }

        // ------------------------------------------------------------------ efectos

        /** Primer acierto a un meteorito con coraza: las placas saltan, queda un escudito y el meteorito sigue volando. */
        romperCoraza(met) {
            var x = met.x, y = met.y;
            sonar("coraza");
            this.particulas.emitir(x, y, { n: 14, vel: 260, vida: 900, escala: met.radio / 70, tintes: [0x91a7ff, 0xbac8ff, 0x748ffc, 0xdee2e6], tipos: ["fragmento0", "fragmento1", "fragmento2"], roce: 0.96, giro: 12, normal: true });
            this.particulas.emitir(x, y, { n: 18, vel: 220, vida: 600, escala: 0.3, tintes: [0xffffff, 0xd0ebff, CIAN], tipos: ["chispa"] });
            this.onda(x, y, 0xbac8ff, met.radio / 60);
            this.destello(0xd0ebff, 0.12);
            var cz = met.coraza;
            if (cz) {
                met.coraza = null;
                var b0 = cz.scaleX;
                this.anim.agregar(380, function (u) { cz.setScale(b0 * (1 + 0.5 * u)).setAlpha(1 - u); }).then(function () { cz.destroy(); });
            }
            var pip = met.pips.pop();
            if (pip) {
                var py = pip.y;
                this.anim.agregar(420, function (u) { pip.y = py - 40 * u; pip.setAlpha(1 - u); }).then(function () { pip.destroy(); });
            }
            // un sacudón: el meteorito tiembla y vuelve a su recorrido
            var g0 = met.giro;
            met.giro = g0 * 6;
            this.anim.agregar(500, function () {}).then(function () { met.giro = g0; });
            met.partes = met.partes.filter(function (o) { return o !== cz && o !== pip; });
        }

        efectoImpacto(met, preciso) {
            var self = this;
            var tintes = CHISPAS_MET[met.tipo];
            // el meteorito se ilumina, crece un poquito y se deshace en luz
            var x = met.x, y = met.y, r = met.radio;
            met.flechas.forEach(function (f) { f.setAlpha(0); });
            var b0 = met.img.base;
            this.anim.agregar(420, function (u) {
                met.img.setScale(b0 * (1 + 0.35 * u)).setAlpha(1 - u);
                met.img.setTint(0xffffff);
                met.halo.setScale(met.halo.base * (1 + 2 * u)).setAlpha(0.9 * (1 - u));
                met.estela.setAlpha(0.8 * (1 - u));
            }).then(function () {
                met.partes.forEach(function (o) { o.destroy(); });
                self.activos = self.activos.filter(function (a) { return a !== met; });
            });
            this.particulas.emitir(x, y, { n: preciso ? 46 : 34, vel: 320, vida: 1000, escala: 0.42, tintes: tintes, tipos: ["chispa", "punto"], roce: 0.96 });
            this.particulas.emitir(x, y, { n: 10, vel: 220, vida: 1100, escala: r / 90, tintes: tintes, tipos: ["fragmento0", "fragmento1", "fragmento2"], roce: 0.97, giro: 10 });
            this.onda(x, y, TINTE_MET[met.tipo], r / 60);
            if (preciso) this.onda(x, y, 0xffffff, r / 45);
            // destello breve del fondo y de las estrellas cercanas, la nebulosa respira más fuerte
            this.destello(met.tipo === "dorado" ? 0xfff3bf : 0xd0ebff, preciso ? 0.32 : 0.22);
            this.estrellas.forEach(function (st) { if (dist(st.x, st.y, x, y) < 420) st.extra = 1; });
            this.nebulas.forEach(function (n) { n.extra = 0.25; });
            this.lucesConsolaT = 1400;
        }

        onda(x, y, tinte, k) {
            var o = this.ondas.find(function (a) { return !a.activa; }) || this.ondas[0];
            o.activa = true;
            o.setPosition(x, y).setTint(tinte).setAlpha(0.9);
            var base = o.base * (k || 1);
            var self = this;
            this.anim.agregar(560, function (u) {
                o.setScale(base * (0.3 + 1.6 * saleSuave(u))).setAlpha(0.9 * (1 - u));
            }).then(function () { o.activa = false; o.setAlpha(0); void self; });
        }

        /** Onda luminosa que se abre desde la plataforma del cañón. */
        ondaPlataforma(tinte) {
            var o = this.ondas.find(function (a) { return !a.activa; }) || this.ondas[0];
            o.activa = true;
            o.setPosition(this.C.x, this.C.y + 12).setTint(tinte).setAlpha(0.8);
            var base = o.base;
            this.anim.agregar(700, function (u) {
                var k = base * (1 + 2.2 * saleSuave(u));
                o.setScale(k, k * 0.32).setAlpha(0.8 * (1 - u));
            }).then(function () { o.activa = false; o.setAlpha(0); });
            this.pulsoPlat = 1;
        }

        destello(color, alfa) {
            var b = this.brillo;
            b.setFillStyle(color);
            this.anim.agregar(380, function (u) { b.setAlpha(alfa * (1 - u)); });
        }

        flotarTexto(x, y, texto, color) {
            var t = this.add.text(x, y, texto, { fontFamily: "Fredoka, Arial", fontSize: "44px", fontStyle: "bold", color: color, stroke: "#1b1464", strokeThickness: 8 }).setOrigin(0.5).setDepth(40);
            this.textos.push(t);
            var self = this;
            this.anim.agregar(1100, function (u) {
                t.y = y - 70 * saleSuave(u);
                t.setScale(0.6 + 0.5 * Math.min(1, u * 4)).setAlpha(u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3);
            }).then(function () {
                t.destroy();
                self.textos = self.textos.filter(function (a) { return a !== t; });
            });
        }

        empujarPolvo(x, y) {
            for (var i = 0; i < this.polvo.length; i++) {
                var p = this.polvo[i];
                var dx = p.x - x, dy = p.y - y, d2 = dx * dx + dy * dy;
                if (d2 < 6400 && d2 > 1) {
                    var d = Math.sqrt(d2);
                    p.ex += dx / d * 120;
                    p.ey += dy / d * 120;
                }
            }
        }

        // ------------------------------------------------------------------ celebraciones y transiciones

        /** Nivel superado: el planeta del nivel se ilumina, lluvia de partículas, la plataforma celebra. */
        celebrarNivel(grande) {
            var self = this;
            var T = TEMAS[this.tema];
            this.fiestaOn = true;
            this.ponerObjetivoSuave(0);
            T.planetas.forEach(function (k) { self.planetas[k].extra = 1; });
            for (var i = 0; i < 4; i++) {
                (function (k) {
                    self.anim.agregar(k * 320, function () {}).then(function () { self.ondaPlataforma(ARCOIRIS[k % ARCOIRIS.length]); });
                })(i);
            }
            this.estrellas.forEach(function (st) { st.extra = 1; });
            var lluvia = 0;
            var p = this.anim.agregar(grande ? 3400 : 2400, function (u) {
                var n = Math.floor(u * 40);
                while (lluvia < n) {
                    lluvia++;
                    self.particulas.emitir(azarEn(240, 1360), azarEn(60, 200), { n: 3, vel: 90, vida: 1600, escala: 0.4, angulo: Math.PI / 2, apertura: 0.8, grav: 120, tintes: ARCOIRIS, tipos: ["chispa", "punto"] });
                }
                self.nebulas.forEach(function (nb) { nb.extra = 0.3 * Math.sin(u * Math.PI); });
            });
            return p.then(function () { self.fiestaOn = false; });
        }

        ponerObjetivoSuave(a) { this.objetivo = a; }

        /** Gran final: supernova de colores, planetas con destellos, la cabina brilla. */
        celebrarFinal() {
            var self = this;
            this.fiestaOn = true;
            sonar("supernova");
            Object.keys(this.planetas).forEach(function (k) { self.planetas[k].setVisible(true); self.planetaLuz[k].setVisible(true); self.planetas[k].extra = 1; });
            var sn = this.supernova;
            sn.setAlpha(0).setScale(0.2);
            var p1 = this.anim.agregar(2600, function (u) {
                var k = saleSuave(u);
                sn.setScale(0.6 + 11 * k).setAlpha(Math.sin(u * Math.PI) * 0.95);
                sn.setTint(ARCOIRIS[Math.floor(u * 14) % ARCOIRIS.length]);
                if (Math.random() < 0.35) self.particulas.emitir(W / 2 + azarEn(-60, 60), 360 + azarEn(-40, 40), { n: 4, vel: 520, vida: 1500, escala: 0.5, tintes: ARCOIRIS, tipos: ["chispa", "punto"], roce: 0.97 });
            });
            for (var i = 0; i < 6; i++) {
                (function (k) {
                    self.anim.agregar(200 + k * 380, function () {}).then(function () {
                        self.onda(W / 2, 360, ARCOIRIS[k], 3 + k);
                        self.ondaPlataforma(ARCOIRIS[(k + 3) % ARCOIRIS.length]);
                    });
                })(i);
            }
            this.destello(0xffffff, 0.45);
            this.lucesConsolaT = 4000;
            this.estrellas.forEach(function (st) { st.extra = 1; });
            return p1.then(function () { return self.celebrarNivel(true); });
        }

        /** Transición espacial (salto al hiperespacio): estrellas que se estiran desde el centro y un destello. */
        transicionEspacial() {
            var self = this;
            var g = this.gHiper;
            var rayos = [];
            for (var i = 0; i < 70; i++) rayos.push({ a: Math.random() * Math.PI * 2, d0: azarEn(20, 300), v: azarEn(0.6, 1.4), c: elegir([0xffffff, 0xc5f6fa, 0xd0bfff, 0xffe066]) });
            sonar("transicion");
            return this.anim.agregar(1000, function (u) {
                g.clear();
                var k = suave(u);
                rayos.forEach(function (r) {
                    var d = r.d0 + k * 900 * r.v;
                    var l = 40 + k * 260 * r.v;
                    g.lineStyle(3 + 3 * k, r.c, Math.sin(u * Math.PI) * 0.9);
                    g.beginPath();
                    g.moveTo(W / 2 + Math.cos(r.a) * d, 420 + Math.sin(r.a) * d);
                    g.lineTo(W / 2 + Math.cos(r.a) * (d + l), 420 + Math.sin(r.a) * (d + l));
                    g.strokePath();
                });
                self.brillo.setFillStyle(0xe5dbff).setAlpha(u > 0.6 ? (u - 0.6) / 0.4 * 0.5 * (1 - (u - 0.6) / 0.4) * 4 : 0);
            }).then(function () { g.clear(); self.brillo.setAlpha(0); });
        }

        /** Salida del nivel: lo que quede se apaga. */
        salida() {
            var self = this;
            this.entradaOn = false;
            this.arrastre = null;
            return this.anim.agregar(500, function (u) {
                self.activos.forEach(function (m) { m.partes.forEach(function (o) { o.setAlpha(Math.min(o.alpha, 1 - u)); }); });
            });
        }

        // ------------------------------------------------------------------ demostración automática

        /**
         * Un meteorito dorado cruza, la mano gira la rueda hasta el ángulo de intercepción, va al botón y toca
         * DISPARAR en el momento justo: el láser lo alcanza y se desintegra. No cuenta para el nivel.
         * mano(x, y, fase) recibe coordenadas del mundo.
         */
        demo(mano) {
            var self = this, gen = this.gen;
            var vivo = function () { return gen === self.gen; };
            this.estado = "demo";
            this.demoMeteoro = true;
            var dir = Math.random() < 0.5 ? 1 : -1;
            var vel = 150;
            var m = this.crearMeteorito({ id: "demo", tipo: "dorado", radio: 70, puntos: 100 }, 0, { demo: true, dir: dir, carril: 225, ronda: { velMin: vel, velMax: vel, diagonal: 0, vaiven: 0 } });
            var esperarHasta = function (cond, max) {
                return new Promise(function (resolve) {
                    var t0 = Date.now();
                    var vigia = setInterval(function () {
                        if (!vivo() || cond() || Date.now() - t0 > max) { clearInterval(vigia); resolve(); }
                    }, 40);
                });
            };
            var dormir = function (ms) { return esperarHasta(function () { return false; }, ms); };
            var C = this.C, DIA = this.DIA, BOT = this.BOT;
            var kr = DIA.r * 0.86;
            var punto = function (a) { return { x: DIA.x + Math.sin(a) * kr, y: DIA.y - Math.cos(a) * kr }; };
            // momento del disparo: cuando el meteorito pase cerca del centro (x 560…1040 según el lado)
            var xDisparo = dir > 0 ? 740 : 860;
            var plan = null;
            return esperarHasta(function () { return dir > 0 ? m.x > 300 : m.x < 1300; }, 9000).then(function () {
                if (!vivo()) return;
                var tFuego = m.t + Math.abs(xDisparo - m.x) / vel * 1000;
                var pos = R().posicionPasada(m, tFuego);
                var aL = R().limitarAngulo(R().anguloIntercepcion(C, self.nivel ? self.nivel.velProyectil : 1250, pos, { x: vel * dir, y: 0 }), C);
                plan = { tFuego: tFuego, angulo: aL };
                // 1) la mano toma la perilla y gira la rueda hasta el ángulo
                var p0 = punto(self.angulo);
                mano(p0.x, p0.y, "aparece");
                return dormir(450).then(function () {
                    var a0 = self.angulo;
                    return self.anim.agregar(1300, function (u) {
                        var a = lerp(a0, aL, suave(u));
                        self.objetivo = a;
                        var q = punto(a);
                        mano(q.x, q.y, "arrastra");
                    });
                });
            }).then(function () {
                if (!vivo() || !plan) return;
                // 2) la mano va al botón y espera el momento justo
                return dormir(250).then(function () {
                    mano(BOT.x + 8, BOT.y + 10, "arrastra");
                    self.objetivo = plan.angulo;
                    return esperarHasta(function () { return m.t >= plan.tFuego - 30; }, 8000);
                }).then(function () {
                    if (!vivo()) return;
                    // el cañón ya llegó: corregir cualquier diferencia mínima del suavizado
                    self.ponerAngulo(plan.angulo, true);
                    mano(BOT.x + 8, BOT.y + 10, "presiona");
                    self.disparar(true);
                    return esperarHasta(function () { return !m.activo; }, 2500);
                });
            }).then(function () {
                return dormir(1200);
            }).then(function () {
                if (vivo()) {
                    self.demoMeteoro = false;
                    if (m.activo) {
                        m.activo = false;
                        m.partes.forEach(function (o) { o.destroy(); });
                        self.activos = self.activos.filter(function (a) { return a !== m; });
                    }
                    self.estado = "presentacion";
                }
            });
        }

        // ------------------------------------------------------------------ ayuda

        ayudaVisual() {
            if (!this.ayudaAuto) return;
            this.ayudaOn = true;
        }

        /** ¿Si dispara ahora, el láser alcanzaría a m? (estimación rápida; solo para el brillo de la mira). */
        estaEnMira(m) {
            var nv = this.nivel;
            var b = R().boca(this.C, this.angulo);
            var tv = dist(b.x, b.y, m.x, m.y) / nv.velProyectil;
            var fx = m.x + m.vx * tv, fy = m.y + m.vy * tv;
            var l = R().lineaMira(this.C, this.angulo);
            var q = R().distSegmento(l.x0, l.y0, l.x1, l.y1, fx, fy);
            return q.d <= m.radio * nv.tolerancia * 0.85;
        }

        // ------------------------------------------------------------------ dibujo de la mira, el arco y los controles

        dibujarMira() {
            var g = this.gMira;
            g.clear();
            var verMira = this.estado === "jugando" || this.estado === "demo" || this.estado === "presentacion";
            if (!verMira) { this.finMira.setAlpha(0); return; }
            var alfa = this.nivel ? this.nivel.miraAlfa : 1;
            if (this.ayudaOn) alfa = 1;
            if (this.canonEstado === "recargando") alfa *= 0.55;
            var l = R().lineaMira(this.C, this.angulo);
            var dx = (l.x1 - l.x0) / l.largo, dy = (l.y1 - l.y0) / l.largo;
            var enMira = this.enMiraId != null;
            var color = enMira ? 0x8ce99a : CIAN;
            g.lineStyle(16, color, 0.07 * alfa);
            g.lineBetween(l.x0, l.y0, l.x1, l.y1);
            g.lineStyle(4, color, 0.3 * alfa);
            g.lineBetween(l.x0, l.y0, l.x1, l.y1);
            // trazos que avanzan en la dirección del disparo
            var paso = 46, trazo = 24;
            var off = (this.t * 0.16) % paso;
            g.lineStyle(6, color, 0.85 * alfa);
            for (var s = off; s < l.largo; s += paso) {
                var e = Math.min(l.largo, s + trazo);
                g.lineBetween(l.x0 + dx * s, l.y0 + dy * s, l.x0 + dx * e, l.y0 + dy * e);
            }
            // chispitas sobre la línea
            g.fillStyle(0xffffff, 0.8 * alfa);
            for (var k = (this.t * 0.3) % 140; k < l.largo; k += 140) g.fillCircle(l.x0 + dx * k, l.y0 + dy * k, 3.5);
            this.finMira.setPosition(l.x1, l.y1).setAlpha((0.6 + Math.sin(this.t / 200) * 0.3) * alfa).setTint(color);
        }

        dibujarArco() {
            var g = this.gArco, C = this.C;
            g.clear();
            var r = 236, ry = 0.36;
            // arco de orientación en perspectiva alrededor de la plataforma: segmentos encendidos cerca del ángulo actual
            var n = 21;
            for (var i = 0; i < n; i++) {
                var a = -C.limite + i / (n - 1) * 2 * C.limite;
                var cerca = Math.max(0, 1 - Math.abs(a - this.angulo) / 0.28);
                var x = C.x + Math.sin(a) * r, y = C.y + 30 - Math.cos(a) * r * ry;
                g.fillStyle(cerca > 0 ? 0xffe066 : 0x4dabf7, 0.35 + 0.65 * cerca);
                g.fillCircle(x, y, 5 + 4 * cerca);
            }
            // rueda: arco recorrido hasta la perilla
            var gr = this.gRueda, D2 = this.DIA;
            gr.clear();
            gr.lineStyle(10, 0xffe066, 0.85);
            gr.beginPath();
            gr.arc(D2.x, D2.y, D2.r * 0.86, -Math.PI / 2, -Math.PI / 2 + this.angulo, this.angulo < 0);
            gr.strokePath();
            gr.lineStyle(7, 0xffffff, 0.95);
            gr.lineBetween(D2.x, D2.y, this.perilla.x, this.perilla.y);
            gr.fillStyle(0xffe066, 1);
            gr.fillCircle(D2.x, D2.y, 10);
            // botón: anillo de energía (recarga)
            var gb = this.gBoton, B = this.BOT;
            gb.clear();
            var u = this.canonEstado === "listo" ? 1 : Math.min(1, this.recargaT / this.recargaMs);
            gb.lineStyle(10, 0x1b1464, 0.6);
            gb.strokeCircle(B.x, B.y - this.hundido * 4, B.r + 8);
            gb.lineStyle(10, u >= 1 ? 0xffe066 : CIAN, 1);
            gb.beginPath();
            gb.arc(B.x, B.y - this.hundido * 4, B.r + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * u, false);
            gb.strokePath();
        }

        // ------------------------------------------------------------------ bucle

        update(time, delta) {
            var dt = Math.min(50, delta || 16);
            if (this.pausado) return;
            this.t += dt;
            this.anim.update(dt);
            this.particulas.update(dt);
            var s = dt / 1000;
            var self = this;

            // ---- controles en su sitio (cambia con el tamaño de la ventana)
            this.tLayout -= dt;
            if (this.tLayout <= 0) { this.tLayout = 500; this.colocarControles(); }

            // ---- flechas del teclado: giro continuo mientras se mantienen
            if (this.teclas.izq !== this.teclas.der && this.puedeApuntar()) {
                this.objetivo = R().limitarAngulo(this.objetivo + (this.teclas.der ? 1 : -1) * 1.15 * s, this.C);
                this.tQuieto = 0;
            } else if (!this.puedeApuntar()) {
                this.teclas.izq = this.teclas.der = false;
            }

            // ---- cañón: sigue al dedo con suavidad
            var antes = this.angulo;
            var na = this.angulo + (this.objetivo - this.angulo) * Math.min(1, dt / 1000 * 16);
            if (Math.abs(this.objetivo - na) < 0.0005) na = this.objetivo;
            this.ponerAngulo(na, false);
            var cambio = Math.abs(na - antes);
            if (cambio > 0.0005) {
                this.pasoGiro += cambio;
                this.brilloCanon = Math.min(0.6, this.brilloCanon + cambio * 3);
                if (this.pasoGiro > 0.05) { this.pasoGiro = 0; sonar("giro", Math.round(na * 20)); }
            }

            // ---- recarga
            if (this.canonEstado === "recargando") {
                this.recargaT += dt;
                if (this.recargaT >= this.recargaMs) this.canonListo(this.estado !== "jugando");
            }
            this.hundido = Math.max(0, this.hundido - dt / 220);
            var listo = this.canonEstado === "listo";
            this.boton.setScale(this.boton.base * (1 - this.hundido * 0.07 + (listo ? Math.sin(this.t / 260) * 0.025 : 0)));
            this.boton.y = this.BOT.y + this.hundido * 5;
            this.textoBoton.y = this.BOT.y + 40 + this.hundido * 5;
            this.botonLuz.setAlpha(listo ? 0.35 + Math.sin(this.t / 260) * 0.15 : 0.12);
            this.textoBoton.setAlpha(listo ? 1 : 0.7);

            // ---- núcleo, boca, plataforma y consola
            this.brilloCanon = Math.max(0, this.brilloCanon - dt / 600);
            var carga = listo ? 1 : this.recargaT / this.recargaMs;
            this.nucleo.setAlpha(0.25 + 0.45 * carga + 0.3 * this.brilloCanon + Math.sin(this.t / 300) * 0.05);
            this.nucleo.setScale(this.nucleo.base * (0.8 + 0.4 * carga));
            this.bocaLuz.setAlpha(Math.max(0, this.bocaLuz.alpha - dt / 260) + (listo ? 0.12 + Math.sin(this.t / 180) * 0.06 : 0));
            this.pulsoPlat = Math.max(0, this.pulsoPlat - dt / 700);
            this.platLuz.setAlpha(0.22 + Math.sin(this.t / 700) * 0.08 + this.pulsoPlat * 0.4 + (this.fiestaOn ? 0.25 : 0));
            this.lucesConsolaT = Math.max(0, this.lucesConsolaT - dt);
            this.lucesConsola.forEach(function (lz, i) {
                var base = 0.35 + Math.sin(self.t / 420 + lz.fase) * 0.2;
                if (self.lucesConsolaT > 0) base = ((Math.floor(self.t / 90) + i) % 3 === 0) ? 1 : 0.25;
                lz.setAlpha(base);
            });
            this.perillaLuz.setAlpha(this.arrastre && this.arrastre.modo === "rueda" ? 0.7 : 0.25 + Math.sin(this.t / 400) * 0.1);

            // ---- fondo vivo
            this.nebulas.forEach(function (n) {
                n.extra = Math.max(0, n.extra - dt / 1600);
                n.setAlpha(n.a0 + Math.sin(self.t / 2600 + n.fase) * 0.08 + n.extra);
                // la nebulosa se corre un poquito con el ángulo del cañón (paralaje)
                n.y = n.y0 + Math.sin(self.t / 5200 + n.fase) * 8;
                n.x += ((n.x0 + self.angulo * -22) - n.x) * Math.min(1, dt / 900);
            });
            this.galaxia.rotation += s * 0.02;
            this.estrellas.forEach(function (st) {
                st.extra = Math.max(0, st.extra - dt / 900);
                st.setAlpha(Math.min(1, st.a0 * (0.55 + 0.45 * Math.sin(self.t / 1000 * st.vel + st.fase)) + st.extra * 0.6));
                st.setScale(st.base * (1 + st.extra * 0.8));
            });
            Object.keys(this.planetas).forEach(function (k) {
                var p = self.planetas[k];
                p.extra = Math.max(0, p.extra - dt / 2400);
                p.setRotation(Math.sin(self.t / 4000 + p.fase) * 0.06);
                p.y = p.y0 + Math.sin(self.t / 3000 + p.fase) * 5;
                self.planetaLuz[k].setPosition(p.x, p.y).setAlpha(p.extra * 0.9);
            });
            this.lejanos.forEach(function (a) {
                if (!a.visible) return;
                a.x += a.vx * s;
                a.y += a.vy * s;
                a.rotation += a.giro * s;
                if (a.x < -60) a.x = W + 60;
                if (a.x > W + 60) a.x = -60;
                if (a.y < 70 || a.y > 660) a.vy = -a.vy;
            });
            this.polvo.forEach(function (p) {
                p.ex *= 0.92;
                p.ey *= 0.92;
                p.x += (p.vx + p.ex) * s;
                p.y += (p.vy + p.ey) * s;
                if (p.x < -10) p.x = W + 10;
                if (p.x > W + 10) p.x = -10;
                if (p.y < 40) p.y = 720;
                if (p.y > 730) p.y = 50;
            });
            this.actualizarFugaz(dt);

            // ---- meteoritos y proyectiles
            this.activos.forEach(function (m) {
                if (m.activo) self.moverMeteorito(m, dt);
            });
            this.actualizarProyectiles(dt);

            // ---- mira, "en la mira" y ayuda
            this.enMiraId = null;
            if (this.estado === "jugando" && this.canonEstado === "listo" && this.nivel) {
                var ayudaMira = !this.nivel.ronda.direccion || this.ayudaOn;
                for (var i = 0; i < this.activos.length; i++) {
                    var m = this.activos[i];
                    if (m.activo && !m.demo && m.x > R().VISIBLE.x0 && m.x < R().VISIBLE.x1 && this.estaEnMira(m)) { this.enMiraId = m.id; break; }
                }
                if (this.enMiraId && ayudaMira) {
                    var mm = this.activos.find(function (a) { return a.id === self.enMiraId; });
                    this.reticula.setPosition(mm.x, mm.y).setAlpha(0.7 + Math.sin(this.t / 120) * 0.25).setRotation(this.t / 600).setScale(this.reticula.base * mm.radio / 50);
                    avisar("enMira", { id: mm.id });
                } else {
                    this.reticula.setAlpha(Math.max(0, this.reticula.alpha - dt / 200));
                }
                // sin tocar un rato: la ayuda se enciende y Zeus anima
                if (this.entradaOn && !this.arrastre) {
                    this.tQuieto += dt;
                    if (this.tQuieto > num(jcfg().quietoParaAyudaMs, 10000)) {
                        this.tQuieto = 0;
                        if (this.ayudaAuto) this.ayudaOn = true;
                        avisar("quieto");
                    }
                }
                // marca de ayuda: anillo dorado alrededor del meteorito más cercano a la mira
                if (this.ayudaOn) {
                    var obj = this.meteoritoMasCercanoAlAngulo(this.angulo);
                    if (obj) this.marcaAyuda.setPosition(obj.x, obj.y).setScale(this.marcaAyuda.base * obj.radio / 70 * (1 + Math.sin(this.t / 200) * 0.08)).setAlpha(0.6);
                    else this.marcaAyuda.setAlpha(0);
                } else {
                    this.marcaAyuda.setAlpha(0);
                }
            } else {
                this.reticula.setAlpha(Math.max(0, this.reticula.alpha - dt / 200));
                this.marcaAyuda.setAlpha(0);
            }
            this.dibujarRutas();
            this.dibujarMira();
            this.dibujarArco();
        }

        /** Trayectoria punteada por delante del meteorito (nivel 3, o con ayuda). */
        dibujarRutas() {
            var g = this.gRuta;
            g.clear();
            if (!this.nivel || this.estado !== "jugando") return;
            var ver = this.nivel.ronda.tema === "asteroides" || this.ayudaOn;
            if (!ver) return;
            var self = this;
            this.activos.forEach(function (m) {
                if (!m.activo) return;
                for (var k = 1; k <= 7; k++) {
                    var p = R().posicionPasada(m, m.t + k * 180);
                    g.fillStyle(TINTE_MET[m.tipo], 0.5 - k * 0.055);
                    g.fillCircle(p.x, p.y, 5);
                }
                void self;
            });
        }

        actualizarFugaz(dt) {
            var f = this.fugaz;
            if (!f.activa) {
                this.tFugaz -= dt;
                if (this.tFugaz <= 0) {
                    var T = TEMAS[this.tema];
                    this.tFugaz = T.fugazMs * azarEn(0.8, 1.4);
                    f.activa = true;
                    var dir = Math.random() < 0.5 ? 1 : -1;
                    f.x = dir > 0 ? azarEn(-100, 600) : azarEn(1000, 1700);
                    f.y = azarEn(40, 260);
                    f.vx = dir * azarEn(700, 950);
                    f.vy = azarEn(220, 360);
                    f.vida = 0;
                    f.setRotation(Math.atan2(f.vy, f.vx)).setAlpha(0.9);
                }
                return;
            }
            f.vida += dt;
            f.x += f.vx * dt / 1000;
            f.y += f.vy * dt / 1000;
            f.setAlpha(Math.max(0, 0.9 - f.vida / 900));
            if (f.vida > 900) f.activa = false;
        }

        fiesta(on) { this.fiestaOn = !!on; }
    } : null;

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
            backgroundColor: "#070b2e",
            banner: false,
            scale: { mode: Phaser.Scale.ENVELOP, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
            input: { activePointers: 3, touch: true, mouse: true },
            render: { antialias: true },
            scene: [EscenaEspacio]
        });
        global.__escenarioCanon = juego;
        global.__pedniaPhaserGame = juego;
    }

    function fuentesListas() {
        if (!document.fonts || !document.fonts.load) return Promise.resolve();
        return Promise.race([
            document.fonts.load('700 30px "Fredoka"').catch(function () {}),
            new Promise(function (r) { setTimeout(r, 1500); })
        ]);
    }

    // ------------------------------------------------------------------ API pública

    global.EscenarioCanon = {
        W: W,
        H: H,
        montar: function (contenedor, config) {
            el = contenedor;
            cfg = config;
            if (!Phaser || !el) return Promise.resolve(false);
            return Promise.all([D().preparar(config), fuentesListas()]).then(function () {
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
        /** Habilita o bloquea los toques. */
        entrada: function (on) {
            if (!escena) return;
            escena.entradaOn = !!on;
            if (!on) escena.arrastre = null;
        },
        ayudaAutomatica: function (on) {
            if (!escena) return;
            escena.ayudaAuto = !!on;
            if (!on) escena.ayudaOn = false;
        },
        ayudaVisual: function () { if (escena) escena.ayudaVisual(); },
        celebrarNivel: function (grande) { return escena ? escena.celebrarNivel(grande) : Promise.resolve(); },
        celebrarFinal: function () { return escena ? escena.celebrarFinal() : Promise.resolve(); },
        transicion: function () { return escena ? escena.transicionEspacial() : Promise.resolve(); },
        salida: function () { return escena ? escena.salida() : Promise.resolve(); },
        fiesta: function (on) { if (escena) escena.fiesta(on); },
        pausar: function (on) {
            if (!escena) return;
            escena.pausado = !!on;
            escena.anim.pausado = !!on;
            if (on) escena.arrastre = null;
        },
        aPantalla: aPantalla,
        aMundo: aMundo,
        /** Pruebas: girar, apuntar con anticipación al meteorito i y disparar (como lo haría un niño muy preciso). */
        probar: {
            girar: function (a) { if (escena) escena.ponerAngulo(R().limitarAngulo(a, escena.C), true); return escena ? escena.angulo : null; },
            apuntarA: function (i) {
                if (!escena || !escena.nivel) return null;
                var vivos = escena.activos.filter(function (m) { return m.activo && !m.demo; });
                var m = vivos[i || 0];
                if (!m) return null;
                var a = R().anguloIntercepcion(escena.C, escena.nivel.velProyectil, { x: m.x, y: m.y }, { x: m.vx, y: m.vy });
                escena.ponerAngulo(R().limitarAngulo(a, escena.C), true);
                return { id: m.id, x: Math.round(m.x), y: Math.round(m.y), angulo: escena.angulo };
            },
            disparar: function () { return escena ? escena.disparar(false) : false; },
            rafaga: function (n) {
                var ok = 0;
                for (var k = 0; k < (n || 5); k++) if (escena && escena.disparar(false)) ok++;
                return ok;
            }
        },
        estado: function () {
            if (!escena || !escena.nivel) return null;
            var R2 = R();
            return {
                estado: escena.estado,
                canon: escena.canonEstado,
                nivel: escena.nivel.id,
                tema: escena.tema,
                entrada: escena.entradaOn,
                pausado: escena.pausado,
                angulo: Math.round(escena.angulo * 1000) / 1000,
                limite: Math.round(escena.C.limite * 1000) / 1000,
                boca: R2.boca(escena.C, escena.angulo),
                mira: R2.lineaMira(escena.C, escena.angulo),
                hechos: escena.marcador.hechos,
                total: escena.marcador.total,
                puntos: escena.marcador.puntos,
                disparos: escena.marcador.disparos,
                fallos: escena.marcador.fallos,
                fallosSeguidos: escena.marcador.fallosSeguidos,
                completo: escena.marcador.completo,
                ayuda: escena.ayudaOn,
                enMira: escena.enMiraId,
                cola: escena.cola.length,
                proyectiles: escena.proyectiles.map(function (p) { return { x: Math.round(p.x), y: Math.round(p.y), vivo: p.vivo }; }),
                meteoritos: escena.activos.map(function (m) { return { id: m.id, tipo: m.tipo, x: Math.round(m.x), y: Math.round(m.y), r: m.radio, activo: m.activo, demo: m.demo, golpes: m.golpes, vida: m.d.vida == null ? m.golpes : m.d.vida, carril: m.carrilBase }; })
            };
        }
    };
})(typeof window !== "undefined" ? window : global);
