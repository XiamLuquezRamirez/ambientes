/**
 * EscenarioArquero — escena Phaser 4 de "El Arquero de las Estrellas" (window.EscenarioArquero).
 *
 * Dibuja el gran torneo de arquería estelar por capas (cielo, nebulosas que respiran, galaxia, planetas que giran,
 * asteroides lejanos, polvo cósmico, estrellas fugaces, banderines, reflectores, trofeos
 * flotantes, piso de la arena) y lo que se juega: el arco de energía (palas que se flexionan, cuerda de luz, núcleo
 * que brilla con la tensión), la flecha, la curva predictiva y la diana que gira y sube y baja.
 *
 * La física es la de ReglasArquero: la curva predictiva y el vuelo real usan la MISMA función (lanzamiento +
 * posicion). El impacto se calcula cuando la punta cruza el plano de la diana, con la diana en su posición de ese
 * instante; el anillo sale de la distancia al centro (la rotación no influye).
 *
 * Estados: presentacion → demo → listo ─(toca la cuerda)→ tensando ─(suelta con fuerza)→ vuelo → impacto/fallo →
 *          (moviendo: la diana cambia de lugar) → listo … → completo. Pausa: todo se congela.
 * Eventos para script.js: tensa, alTope, cancela, disparo, impacto, fallo, situacion, quieto, nivelCompleto,
 *          demoPuntos, sonido.
 *
 * Mundo de diseño 1600 × 900 con Scale.ENVELOP; lo jugable cabe en 4:3 (x 230…1370).
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser;
    var W = 1600, H = 900;

    var D = function () { return global.DibujosArquero; };
    var R = function () { return global.ReglasArquero; };

    var juego = null, escena = null, el = null, cfg = null, espera = null;
    var cb = {};

    function avisar(nombre, a) {
        var f = cb[nombre];
        if (typeof f === "function") {
            try { f(a); } catch (e) { console.warn("[EscenarioArquero]", nombre, e); }
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

    var CIAN = 0x63e6ff;
    var ORO = 0xffd43b;
    var COLOR_ANILLO = { 10: 0x4dabf7, 30: 0xcc5de8, 50: 0xffd43b };
    var CHISPAS = {
        10: [0x74c0fc, 0xd0ebff, 0x63e6ff, 0xffffff],
        30: [0xda77f2, 0xf783ac, 0xe5dbff, 0xffffff],
        50: [0xffe066, 0xfff3bf, 0xffd43b, 0xffffff, 0xff922b]
    };
    var ZONA_COLOR = { suave: 0x63e6ff, media: 0xb197fc, potente: 0xffd43b };
    var ARCOIRIS = [0xff6b6b, 0xffd43b, 0x69db7c, 0x4dabf7, 0xb197fc, 0xf783ac, 0x63e6be];

    // Ambientación de cada nivel.
    var TEMAS = {
        nebulosa: { nebulas: [0x9b5de5, 0x4361ee, 0xf15bb5, 0x4cc9f0], luces: 0x63e6ff, fondo: 0x3a0ca3, fugazMs: 6500 },
        galaxiaAzul: { nebulas: [0x4cc9f0, 0x4361ee, 0x3a0ca3, 0x63e6ff], luces: 0x4dabf7, fondo: 0x0b2a6b, fugazMs: 5200 },
        violeta: { nebulas: [0xb5179e, 0x7209b7, 0x560bad, 0xf72585], luces: 0xcc5de8, fondo: 0x3c096c, fugazMs: 4600 },
        dorado: { nebulas: [0xffbe0b, 0xff006e, 0x8338ec, 0x3a86ff], luces: 0xffd43b, fondo: 0x5a189a, fugazMs: 3800 }
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
        try { a.fn(1); } catch (e) { console.warn("[EscenarioArquero] anim", e); }
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

    function estiloTexto(tam, color, borde, grosor) {
        return { fontFamily: "Fredoka, Arial", fontSize: tam + "px", fontStyle: "bold", color: color, stroke: borde || "#1b1464", strokeThickness: grosor || 8 };
    }

    /** Punto de una cúbica de Bézier. */
    function bezier(p0, p1, p2, p3, u) {
        var a = 1 - u;
        return {
            x: a * a * a * p0.x + 3 * a * a * u * p1.x + 3 * a * u * u * p2.x + u * u * u * p3.x,
            y: a * a * a * p0.y + 3 * a * a * u * p1.y + 3 * a * u * u * p2.y + u * u * u * p3.y
        };
    }

    // ------------------------------------------------------------------ escena

    var EscenaTorneo = Phaser ? class extends Phaser.Scene {
        constructor() { super({ key: "Torneo" }); }

        create() {
            var self = this;
            D().claves().forEach(function (k) { tex(self, k); });
            var j = jcfg();
            this.anim = new Animador();
            this.t = 0;
            this.gen = 0;
            this.pausado = false;
            this.entradaOn = false;
            this.ayudaAuto = true;
            this.estado = "presentacion";
            this.A = R().arco(j, {});
            this.nivel = null;
            this.ronda = null;
            this.sit = null;
            this.sitIdx = 0;
            this.tSit = 0;
            this.factorVel = 1;
            this.moviendo = false;
            this.diana = { x: 1080, y: 470, yPrev: 470, R: 120, rot: 0, giroExtra: 0, escala: 1, alfa: 1 };
            this.T = 0;                 // tensión real (la que dispara)
            this.tVis = 0;              // tensión que se ve (al soltar, la cuerda vibra y vuelve)
            this.resorte = null;
            this.arrastre = null;
            this.alTopeDicho = false;
            this.pulsoTope = 0;
            this.flechaCuerdaAlfa = 0;
            this.demoTensando = false;
            this.flechas = [];
            this.clavadas = [];
            this.marcador = null;
            this.tQuieto = 0;
            this.ayudaOn = false;
            this.excitacion = 0;
            this.brilloCols = 0;
            this.fiestaOn = false;
            this.tFugaz = 2500;
            this.tema = "nebulosa";
            this.tChispaCuerda = 0;
            this.pistaArrastre = 0;
            this.fuerzaVista = -1;

            // ---------------- cielo y capas lejanas
            this.cameras.main.setBackgroundColor("#070b2e");
            img(this, W / 2, H / 2, "cielo", 1).setDepth(0);
            this.tinteFondo = this.add.rectangle(W / 2, H / 2, W, H, 0x000000).setDepth(0.2).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
            this.nebulas = [];
            [[300, 250, 2.3], [1230, 210, 2.5], [780, 430, 2.8], [1380, 560, 1.9]].forEach(function (q, i) {
                var n = img(self, q[0], q[1], "nebulosa", q[2]).setDepth(0.5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.3);
                n.fase = i * 1.7;
                n.a0 = 0.24;
                n.extra = 0;
                n.k0 = n.base;
                n.setRotation(azarEn(-0.3, 0.3));
                self.nebulas.push(n);
            });
            this.galaxia = img(this, 760, 150, "galaxia", 0.85).setDepth(0.7).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5).setTint(0xd0bfff).setRotation(-0.25);
            // constelaciones (se dibujan una vez; respiran con su alfa)
            this.constelaciones = this.add.graphics().setDepth(0.8);
            [[[560, 120], [610, 90], [668, 108], [700, 70], [748, 96]], [[980, 300], [1030, 270], [1090, 286], [1120, 240]], [[140, 430], [190, 400], [236, 420], [262, 380]]].forEach(function (c) {
                self.constelaciones.lineStyle(2, 0xc5f6fa, 0.35);
                self.constelaciones.beginPath();
                c.forEach(function (p, i) { if (i) self.constelaciones.lineTo(p[0], p[1]); else self.constelaciones.moveTo(p[0], p[1]); });
                self.constelaciones.strokePath();
                c.forEach(function (p) { self.constelaciones.fillStyle(0xffffff, 0.9); self.constelaciones.fillCircle(p[0], p[1], 3.4); });
            });
            this.estrellas = [];
            for (var e = 0; e < 50; e++) {
                var st = img(this, azarEn(20, W - 20), azarEn(20, 720), e % 3 ? "punto" : "chispa", azarEn(0.25, 0.6)).setDepth(0.9).setBlendMode(Phaser.BlendModes.ADD);
                st.fase = Math.random() * 6;
                st.vel = azarEn(0.8, 2.4);
                st.a0 = azarEn(0.4, 0.9);
                st.extra = 0;
                st.setTint(elegir([0xffffff, 0xd0ebff, 0xfff3bf, 0xe5dbff]));
                this.estrellas.push(st);
            }
            this.planetas = [
                img(this, 255, 190, "planetaAnillo", 0.55).setDepth(1),
                img(this, 1470, 360, "planetaAzul", 0.6).setDepth(1),
                img(this, 1020, 96, "luna", 0.42).setDepth(1),
                img(this, 620, 560, "planetaVerde", 0.3).setDepth(1).setAlpha(0.8)
            ];
            this.planetas.forEach(function (p, i) { p.x0 = p.x; p.y0 = p.y; p.fase = i * 1.3; p.giro = (i % 2 ? -1 : 1) * azarEn(0.02, 0.05); });
            this.lejanos = [];
            for (var a = 0; a < 10; a++) {
                var as = img(this, azarEn(0, W), azarEn(90, 600), "asteroide" + (a % 3), azarEn(0.16, 0.36)).setDepth(1.2).setTint(elegir([0x5c6bc0, 0x7048e8, 0x4263eb])).setAlpha(0.5);
                as.vx = azarEn(5, 14) * (Math.random() < 0.5 ? -1 : 1);
                as.vy = azarEn(-3, 3);
                as.giro = azarEn(-0.3, 0.3);
                this.lejanos.push(as);
            }
            this.polvo = [];
            for (var p = 0; p < 36; p++) {
                var pv = img(this, azarEn(0, W), azarEn(60, 760), "punto", azarEn(0.18, 0.35)).setDepth(1.4).setBlendMode(Phaser.BlendModes.ADD).setAlpha(azarEn(0.3, 0.7)).setTint(elegir([0xc5f6fa, 0xe5dbff, 0xffffff]));
                pv.vx = azarEn(-8, 8);
                pv.vy = azarEn(-10, -2);
                this.polvo.push(pv);
            }
            this.fugaz = img(this, -300, 100, "fugaz", 1).setDepth(1.3).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
            this.fugaz.activa = false;

            // ---------------- escenario del torneo
            // reflectores que siguen a la diana
            this.haces = [1060, 1500].map(function (x, i) {
                var h = img(self, x, -30, "haz", 1.1).setOrigin(0.5, 0).setDepth(1.8).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.12);
                h.fase = i * 2;
                return h;
            });
            // sin columnas de energía (pedido del usuario): la lista queda vacía y los bucles no hacen nada
            this.columnas = [];
            // riel luminoso que enmarca el recorrido vertical de la diana
            this.gRiel = this.add.graphics().setDepth(2.6);
            this.lucesRiel = [];
            for (var lr = 0; lr < 10; lr++) {
                var l = img(this, 0, 0, "punto", 0.45).setDepth(2.7).setBlendMode(Phaser.BlendModes.ADD).setTint(lr % 2 ? CIAN : ORO);
                l.fase = lr * 0.7;
                this.lucesRiel.push(l);
            }
            // sin banderines (pedido del usuario): la lista queda vacía y los bucles no hacen nada
            this.banderines = [];
            // trofeos flotantes sobre pedestales de luz
            this.trofeos = [[640, 238, 0.4], [1440, 640, 0.42]].map(function (q, i) {
                var ped = img(self, q[0], q[1] + 66, "pedestal", 0.62).setDepth(3.4);
                var luzT = img(self, q[0], q[1] + 10, "luz", 1.4).setDepth(3.45).setBlendMode(Phaser.BlendModes.ADD).setTint(ORO).setAlpha(0.3);
                var tr = img(self, q[0], q[1], "trofeo", q[2]).setDepth(3.5);
                tr.x0 = q[0];
                tr.y0 = q[1];
                tr.fase = i * 2.1;
                tr.salto = 0;
                tr.ped = ped;
                tr.luz = luzT;
                return tr;
            });
            // piso de la arena y plataforma del arquero
            this.piso = img(this, W / 2, 790, "piso", 1).setOrigin(0.5, 0).setDepth(4);
            this.platLuz = img(this, this.A.empunadura.x - 20, 812, "luz", 3).setDepth(4.4).setBlendMode(Phaser.BlendModes.ADD).setTint(0x4dabf7).setAlpha(0.35);
            this.platLuz.setScale(4 / D().res("luz"), 1.1 / D().res("luz"));
            this.plataforma = img(this, this.A.empunadura.x - 20, 804, "plataforma", 0.9).setOrigin(0.5, 44 / 130).setDepth(4.5);

            // ---------------- la diana
            this.dianaHalo = img(this, 0, 0, "luz", 4).setDepth(8.5).setBlendMode(Phaser.BlendModes.ADD).setTint(CIAN).setAlpha(0.35);
            this.decoA = img(this, 0, 0, "anilloDeco", 1).setDepth(9).setBlendMode(Phaser.BlendModes.ADD).setTint(CIAN).setAlpha(0.75);
            this.decoB = img(this, 0, 0, "anilloDeco", 1).setDepth(9).setBlendMode(Phaser.BlendModes.ADD).setTint(0xf783ac).setAlpha(0.55);
            this.cara = img(this, 0, 0, "diana", 1).setDepth(10);
            this.coronas = {};
            [10, 30, 50].forEach(function (k) {
                self.coronas[k] = img(self, 0, 0, "corona", 1).setDepth(10.5).setBlendMode(Phaser.BlendModes.ADD).setTint(COLOR_ANILLO[k]).setAlpha(0);
            });
            this.etiquetas = {};
            [10, 30, 50].forEach(function (k) {
                self.etiquetas[k] = self.add.text(0, 0, String(k), estiloTexto(k === 50 ? 26 : 30, k === 50 ? "#7a3d00" : "#ffffff", k === 50 ? "#fff3bf" : "#14154a", k === 50 ? 6 : 7)).setOrigin(0.5).setDepth(12);
            });
            this.flechaArriba = img(this, 0, 0, "chevron", 0.8).setDepth(12).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffe066).setAlpha(0);
            this.flechaAbajo = img(this, 0, 0, "chevron", 0.8).setDepth(12).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffe066).setAlpha(0).setFlipY(true);

            // ---------------- asteroides guardianes (obstáculos móviles de los niveles 3 y 4)
            this.tObs = 0;
            this.gObs = this.add.graphics().setDepth(14.6);
            this.obstaculos = [0, 1, 2].map(function (i) {
                return {
                    luz: img(self, -300, -300, "luz", 1).setDepth(14.8).setBlendMode(Phaser.BlendModes.ADD).setTint(0xf783ac).setAlpha(0),
                    roca: img(self, -300, -300, "asteroide" + i, 1).setDepth(15).setTint(0x7048c8).setAlpha(0),
                    aro: img(self, -300, -300, "aro", 1).setDepth(15.2).setBlendMode(Phaser.BlendModes.ADD).setTint(0xff6fb5).setAlpha(0),
                    def: null, y: 0, yPrev: 0, sacudida: 0, alfa: 0
                };
            });

            // ---------------- curva predictiva
            this.gPred = this.add.graphics().setDepth(14);
            this.marca = img(this, 0, 0, "reticula", 0.7).setDepth(14.5).setBlendMode(Phaser.BlendModes.ADD).setTint(CIAN).setAlpha(0);

            // ---------------- el arco
            this.gArcoLuz = this.add.graphics().setDepth(19).setBlendMode(Phaser.BlendModes.ADD);
            this.gArco = this.add.graphics().setDepth(20);
            this.gCuerdaLuz = this.add.graphics().setDepth(20.5).setBlendMode(Phaser.BlendModes.ADD);
            this.gCuerda = this.add.graphics().setDepth(21);
            this.nucleo = img(this, 0, 0, "luz", 1).setDepth(22.6).setBlendMode(Phaser.BlendModes.ADD).setTint(CIAN).setAlpha(0.5);
            this.empunadura = img(this, 0, 0, "empunadura", 0.95).setDepth(22.5);
            this.puntas = [img(this, 0, 0, "puntaArco", 0.8).setDepth(22.4), img(this, 0, 0, "puntaArco", 0.8).setDepth(22.4)];
            this.puntasLuz = [0, 1].map(function () { return img(self, 0, 0, "luz", 0.7).setDepth(22.3).setBlendMode(Phaser.BlendModes.ADD).setTint(0xb197fc).setAlpha(0.5); });
            this.flechaLuz = img(this, 0, 0, "luz", 1).setDepth(22.8).setBlendMode(Phaser.BlendModes.ADD).setTint(CIAN).setAlpha(0);
            this.flechaCuerda = img(this, 0, 0, "flecha", 0.86).setOrigin(188 / 190, 0.5).setDepth(23).setAlpha(0);
            this.ondaArco = img(this, 0, 0, "aro", 1).setDepth(23.5).setBlendMode(Phaser.BlendModes.ADD).setTint(0xc5f6fa).setAlpha(0);

            // ---------------- flechas en vuelo y clavadas
            this.gEstela = this.add.graphics().setDepth(16).setBlendMode(Phaser.BlendModes.ADD);
            for (var f = 0; f < 3; f++) {
                this.flechas.push({
                    img: img(this, -200, -200, "flecha", 0.86).setOrigin(188 / 190, 0.5).setDepth(17).setVisible(false),
                    luz: img(this, -200, -200, "luz", 0.9).setDepth(16.5).setBlendMode(Phaser.BlendModes.ADD).setTint(CIAN).setVisible(false),
                    vivo: false,
                    estela: []
                });
            }

            // ---------------- efectos
            this.particulas = new Particulas(this, 240, 30);
            this.ondas = [];
            for (var o = 0; o < 6; o++) this.ondas.push(img(this, 0, 0, "aro", 1).setDepth(29).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0));
            this.textos = [];
            this.trofeoGrande = img(this, W / 2, 600, "trofeo", 1.3).setDepth(56).setAlpha(0);
            this.trofeoGrandeLuz = img(this, W / 2, 600, "luz", 6).setDepth(55.5).setBlendMode(Phaser.BlendModes.ADD).setTint(ORO).setAlpha(0);
            this.estrellasCel = [0, 1, 2].map(function () { return img(self, 0, 0, "estrella5", 0.9).setDepth(55).setAlpha(0); });
            this.brillo = this.add.rectangle(W / 2, H / 2, W, H, 0xffffff).setDepth(60).setAlpha(0);
            this.gHiper = this.add.graphics().setDepth(59);

            // ---------------- panel inferior: FUERZA y valores de la diana
            this.crearPanelFuerza();
            this.crearLeyenda();

            this.crearEntrada();
            this.aplicarTema();
            this.colocarDiana();
            this.dibujarRiel();
            escena = this;
            if (espera) { var ok = espera; espera = null; ok(true); }
        }

        // ------------------------------------------------------------------ paneles

        crearPanelFuerza() {
            this.PF = { x: 600, y: 818, w: 380, h: 70, bx: 726, by: 838, bw: 196, bh: 30 };
            var P = this.PF;
            this.gFuerzaFondo = this.add.graphics().setDepth(40);
            var g = this.gFuerzaFondo;
            g.fillStyle(0x14105a, 0.9);
            g.fillRoundedRect(P.x, P.y, P.w, P.h, 22);
            g.lineStyle(4, CIAN, 0.9);
            g.strokeRoundedRect(P.x, P.y, P.w, P.h, 22);
            this.textoFuerza = this.add.text(P.x + 64, P.y + 24, "FUERZA", estiloTexto(26, "#ffe066", "#14154a", 6)).setOrigin(0.5).setDepth(41);
            this.textoZona = this.add.text(P.x + 64, P.y + 52, "", estiloTexto(17, "#c5f6fa", "#14154a", 5)).setOrigin(0.5).setDepth(41);
            this.gFuerza = this.add.graphics().setDepth(41);
            this.textoPct = this.add.text(P.bx + P.bw + 10, P.by + P.bh / 2, "", estiloTexto(18, "#e7f5ff", "#14154a", 5)).setOrigin(0, 0.5).setDepth(41).setAlpha(0.85);
        }

        /** El marcador exterior estable de la diana: qué vale cada color. */
        crearLeyenda() {
            var x = 1000, y = 818, w = 200, h = 70;
            var g = this.add.graphics().setDepth(40);
            g.fillStyle(0x14105a, 0.9);
            g.fillRoundedRect(x, y, w, h, 22);
            g.lineStyle(4, 0xf783ac, 0.9);
            g.strokeRoundedRect(x, y, w, h, 22);
            var self = this;
            [[10, 0x4dabf7], [30, 0xcc5de8], [50, 0xffd43b]].forEach(function (q, i) {
                var cx = x + 38 + i * 62;
                g.fillStyle(q[1], 1);
                g.fillCircle(cx, y + h / 2, 25);
                g.lineStyle(3, 0xffffff, 1);
                g.strokeCircle(cx, y + h / 2, 25);
                self.add.text(cx, y + h / 2, String(q[0]), estiloTexto(24, q[0] === 50 ? "#7a3d00" : "#ffffff", q[0] === 50 ? "#fff3bf" : "#14154a", 5)).setOrigin(0.5).setDepth(41);
            });
        }

        dibujarFuerza() {
            var P = this.PF;
            var T = Math.max(0, Math.min(1, this.estado === "tensando" || this.demoTensando ? this.T : Math.max(0, this.tVis)));
            var clave = Math.round(T * 200) + (this.pulsoTope > 0 ? "p" + Math.round(this.pulsoTope * 10) : "");
            if (clave === this.fuerzaVista) return;
            this.fuerzaVista = clave;
            var g = this.gFuerza;
            g.clear();
            var cortes = [0, 0.4, 0.75, 1];
            var colores = [ZONA_COLOR.suave, ZONA_COLOR.media, ZONA_COLOR.potente];
            for (var i = 0; i < 3; i++) {
                var x0 = P.bx + P.bw * cortes[i] + (i ? 2 : 0), x1 = P.bx + P.bw * cortes[i + 1] - (i < 2 ? 2 : 0);
                g.fillStyle(colores[i], 0.18);
                g.fillRoundedRect(x0, P.by, x1 - x0, P.bh, 8);
                var lleno = Math.max(0, Math.min(1, (T - cortes[i]) / (cortes[i + 1] - cortes[i])));
                if (lleno > 0) {
                    g.fillStyle(colores[i], 0.95);
                    g.fillRoundedRect(x0, P.by, Math.max(6, (x1 - x0) * lleno), P.bh, 8);
                }
                g.lineStyle(2, colores[i], 0.9);
                g.strokeRoundedRect(x0, P.by, x1 - x0, P.bh, 8);
            }
            if (this.pulsoTope > 0) {
                g.lineStyle(6, 0xffffff, this.pulsoTope);
                g.strokeRoundedRect(P.bx - 4, P.by - 4, P.bw + 8, P.bh + 8, 12);
            }
            var z = R().zona(T);
            var nombre = T < 0.02 ? "" : (z === "suave" ? "SUAVE" : (z === "media" ? "MEDIA" : "POTENTE"));
            this.textoZona.setText(nombre).setColor(T < 0.02 ? "#c5f6fa" : (z === "suave" ? "#99e9f2" : (z === "media" ? "#d0bfff" : "#ffe066")));
            this.textoPct.setText(T < 0.02 ? "" : Math.round(T * 100) + "%");
        }

        // ------------------------------------------------------------------ entrada: tensar y soltar

        crearEntrada() {
            var self = this;
            this.input.on("pointerdown", function (p) {
                self.scale.updateBounds();
                self.alTocar(p);
            });
            this.input.on("pointermove", function (p) {
                if (self.arrastre && self.arrastre.id === p.id) self.alArrastrar(p);
            });
            var soltar = function (p) {
                if (self.arrastre && self.arrastre.id === p.id) self.alSoltar();
            };
            this.input.on("pointerup", soltar);
            this.input.on("pointerupoutside", soltar);
            // si el navegador interrumpe el toque (o la ventana pierde el foco), el arco vuelve a reposo sin disparar
            this.game.events.on("blur", function () { self.cancelarTension(); });
            var lienzo = this.game.canvas;
            if (lienzo) {
                lienzo.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });
                lienzo.addEventListener("pointercancel", function () { self.cancelarTension(); });
                lienzo.addEventListener("touchcancel", function () { self.cancelarTension(); });
            }
        }

        puedeTensar() { return this.entradaOn && !this.pausado && this.estado === "listo"; }

        alTocar(p) {
            if (!this.puedeTensar()) return;
            var x = p.worldX, y = p.worldY, A = this.A;
            var c = R().cuerdaEn(A, 0);
            var cerca = dist(x, y, c.x, c.y) <= A.zonaToque || dist(x, y, A.empunadura.x, A.empunadura.y) <= A.zonaToque * 0.9;
            if (!cerca) return;
            this.arrastre = { id: p.id, x0: x, y0: y };
            this.estado = "tensando";
            this.alTopeDicho = false;
            this.tQuieto = 0;
            this.pistaArrastre = 0;
            this.ponerTension(0);
            sonar("agarra");
            avisar("tensa", {});
        }

        alArrastrar(p) {
            if (this.estado !== "tensando" || this.pausado) return;
            var t = R().tension(this.A, p.worldX - this.arrastre.x0, p.worldY - this.arrastre.y0);
            this.ponerTension(t.T);
            if (t.alTope && !this.alTopeDicho) {
                this.alTopeDicho = true;
                this.pulsoTope = 1;
                sonar("alTope");
                avisar("alTope", {});
            } else if (t.T < 0.92) {
                this.alTopeDicho = false;
            }
        }

        ponerTension(T) {
            this.T = Math.max(0, Math.min(1, T));
            this.tVis = this.T;
            this.resorte = null;
            this.tQuieto = 0;
            sonar("tension", this.T);
        }

        alSoltar() {
            var T = this.T;
            this.arrastre = null;
            if (this.estado !== "tensando") return;
            if (T >= this.A.tensionMin) this.disparar(T, false);
            else this.cancelarTension();
        }

        /** El arco vuelve a reposo sin disparar (toque sin arrastre, movimiento accidental o interrupción). */
        cancelarTension() {
            this.arrastre = null;
            if (this.estado !== "tensando") return;
            this.estado = "listo";
            this.resorte = { T0: this.T, t: 0, suave: true };
            this.T = 0;
            sonar("tensionFin");
            if (this.tVis > 0.05) sonar("cancela");
            avisar("cancela", {});
        }

        // ------------------------------------------------------------------ disparo y vuelo

        disparar(T, demo) {
            if (!demo && this.estado !== "tensando") return false;
            var L = R().lanzamiento(this.A, T);
            var f = this.flechas.find(function (a) { return !a.vivo; });
            if (!f) {
                f = this.flechas[0];
                this.soltarFlecha(f);
            }
            f.vivo = true;
            f.L = L;
            f.t = 0;
            f.T = T;
            f.demo = !!demo;
            f.p = { x: L.x0, y: L.y0 };
            f.resuelta = false;
            f.clavada = false;
            f.rebote = null;
            f.apagando = 0;
            f.estela = [];
            f.img.setPosition(L.x0, L.y0).setRotation(Math.atan2(L.vy, L.vx)).setAlpha(1).setDepth(17).setVisible(true);
            f.luz.setPosition(L.x0, L.y0).setAlpha(0.5 + 0.4 * T).setVisible(true);
            // la cuerda vuelve rápido y vibra; la flecha de la cuerda ya salió
            this.resorte = { T0: T, t: 0 };
            this.T = 0;
            this.demoTensando = false;
            this.flechaCuerdaAlfa = 0;
            this.estado = "vuelo";
            this.arrastre = null;
            // destello en el arco, onda de energía y el escenario reacciona
            var c = R().cuerdaEn(this.A, 0);
            this.ondaArco.setPosition(c.x, c.y).setAlpha(0.9);
            var oa = this.ondaArco, base = oa.base;
            this.anim.agregar(420, function (u) { oa.setScale(base * (0.3 + 1.3 * saleSuave(u))).setAlpha(0.9 * (1 - u)); });
            this.destello(0xd0ebff, 0.08 + 0.14 * T);
            this.excitacion = Math.max(this.excitacion, 0.5 + 0.5 * T);
            this.particulas.emitir(L.x0, L.y0, { n: 6 + Math.round(8 * T), vel: 260, vida: 500, escala: 0.32, angulo: Math.atan2(L.vy, L.vx), apertura: 1.2, tintes: [CIAN, 0xffffff, 0xb197fc], tipos: ["chispa", "punto"] });
            sonar("tensionFin");
            sonar("suelta", T);
            if (!demo && this.marcador) this.marcador.disparos++;
            this.tQuieto = 0;
            avisar("disparo", { T: T, demo: !!demo });
            return true;
        }

        soltarFlecha(f) {
            f.vivo = false;
            f.clavada = false;
            f.rebote = null;
            f.img.setVisible(false);
            f.luz.setVisible(false);
            f.estela = [];
        }

        actualizarFlechas(dt) {
            var s = dt / 1000, self = this, d = this.diana;
            var g = this.gEstela;
            g.clear();
            this.flechas.forEach(function (f) {
                if (!f.vivo) return;
                if (f.apagando > 0) {
                    f.apagando -= dt;
                    var a = Math.max(0, f.apagando / 500);
                    f.img.setAlpha(a);
                    f.luz.setAlpha(a * 0.5);
                    if (f.apagando <= 0) self.soltarFlecha(f);
                    return;
                }
                if (f.clavada) return;          // sigue a la diana desde colocarDiana()
                if (f.rebote) {                 // chocó con un asteroide: sale despedida girando y se apaga
                    var rb = f.rebote;
                    rb.t += dt;
                    rb.vy += 900 * s;
                    rb.x += rb.vx * s;
                    rb.y += rb.vy * s;
                    rb.rot += rb.vr * s;
                    f.img.setPosition(rb.x, rb.y).setRotation(rb.rot).setAlpha(Math.max(0, 1 - rb.t / 700));
                    f.luz.setAlpha(0);
                    if (rb.t >= 700) self.soltarFlecha(f);
                    return;
                }
                var p0 = f.p;
                f.t += s;
                var p1 = R().posicion(f.L, f.t);
                if (!f.resuelta && !self.moviendo) {
                    for (var oi = 0; oi < self.obstaculos.length; oi++) {
                        var ob = self.obstaculos[oi];
                        if (!ob.def) continue;
                        var choque = R().choqueObstaculo(p0, p1, ob.def, ob.yPrev, ob.y);
                        if (choque) { self.rebotar(f, choque, ob); return; }
                    }
                }
                if (!f.resuelta && !self.moviendo) {
                    var hit = R().cruceDiana(p0, p1, d.x, d.yPrev, d.y, d.R * d.escala);
                    if (hit) {
                        f.resuelta = true;
                        if (hit.dentro) { self.clavar(f, hit); return; }
                        self.alFallar(f, hit.y);
                    }
                }
                f.p = { x: p1.x, y: p1.y };
                var ang = Math.atan2(p1.vy, p1.vx);
                f.img.setPosition(p1.x, p1.y).setRotation(ang);
                f.luz.setPosition(p1.x - Math.cos(ang) * 60, p1.y - Math.sin(ang) * 60);
                f.estela.push({ x: p1.x - Math.cos(ang) * 150, y: p1.y - Math.sin(ang) * 150 });
                if (f.estela.length > 14) f.estela.shift();
                for (var k = 1; k < f.estela.length; k++) {
                    var q0 = f.estela[k - 1], q1 = f.estela[k];
                    g.lineStyle(2 + k * 0.7, f.T > 0.75 ? ORO : (f.T > 0.4 ? 0xb197fc : CIAN), k / f.estela.length * 0.55);
                    g.beginPath();
                    g.moveTo(q0.x, q0.y);
                    g.lineTo(q1.x, q1.y);
                    g.strokePath();
                }
                if (Math.random() < 0.35) self.particulas.emitir(p1.x - Math.cos(ang) * 140, p1.y - Math.sin(ang) * 140, { n: 1, vel: 40, vida: 380, escala: 0.22, tintes: [CIAN, 0xe5dbff], tipos: ["punto"] });
                // suelo o fuera de la arena: la flecha se apaga poco a poco
                if (p1.y >= self.A.suelo) {
                    if (!f.resuelta) { f.resuelta = true; self.alFallar(f, null); }
                    self.particulas.emitir(p1.x, self.A.suelo, { n: 8, vel: 160, vida: 500, escala: 0.3, angulo: -Math.PI / 2, apertura: 1.6, grav: 300, tintes: [CIAN, 0xe5dbff], tipos: ["chispa", "punto"] });
                    f.apagando = 500;
                } else if (p1.x > W + 200 || p1.y < -300 || f.t > 6) {
                    if (!f.resuelta) { f.resuelta = true; self.alFallar(f, null); }
                    self.soltarFlecha(f);
                } else if (f.resuelta && p1.x > d.x + 420) {
                    f.apagando = 500;
                }
            });
        }

        /** La flecha queda clavada: anillo, puntos, efectos y (si toca) cambio de situación o fin del nivel. */
        clavar(f, hit) {
            var d = this.diana;
            var puntos = R().anillo(hit.dy, d.R * d.escala, this.nivel ? this.nivel.radios : null) || 10;
            f.clavada = true;
            f.dy = hit.dy / d.escala;
            f.ang = Math.atan2(R().posicion(f.L, f.t).vy, f.L.vx);
            f.img.setPosition(d.x, d.y + hit.dy).setRotation(f.ang).setDepth(11.5);
            f.luz.setVisible(false);
            f.estela = [];
            this.clavadas.push(f);
            if (this.clavadas.length > 3) {
                var vieja = this.clavadas.shift();
                vieja.clavada = false;
                vieja.apagando = 500;
                vieja.img.setDepth(17);
            }
            this.efectoImpacto(puntos, d.x, d.y + hit.dy);
            if (f.demo) {
                avisar("demoPuntos", { puntos: puntos });
                return;
            }
            var m = this.marcador;
            m.hechos++;
            m.puntos += puntos;
            m.por[puntos] = (m.por[puntos] || 0) + 1;
            m.seguidos = 0;
            this.factorVel = 1;
            this.ayudaOn = false;
            this.estado = "impacto";
            avisar("impacto", { puntos: puntos, hechos: m.hechos, total: m.total, por: m.por });
            var self = this, gen = this.gen;
            if (m.hechos >= m.total) {
                this.estado = "completo";
                this.anim.agregar(900, function () {}).then(function () {
                    if (gen !== self.gen) return;
                    avisar("nivelCompleto", { puntos: m.puntos, por: m.por });
                });
                return;
            }
            var cambia = this.nivel && m.hechos % this.nivel.cambiaCada === 0 && this.sitIdx + 1 < this.nivel.situaciones.length;
            this.anim.agregar(cambia ? 1100 : num(jcfg().recargaMs, 550) + 250, function () {}).then(function () {
                if (gen !== self.gen) return;
                if (cambia) self.cambiarSituacion(self.sitIdx + 1);
                else self.rearmar();
            });
        }

        /** La flecha chocó con un asteroide: rebota hacia atrás girando, chispas y el asteroide se sacude. */
        rebotar(f, choque, ob) {
            f.resuelta = true;
            var ang = Math.atan2(choque.y - ob.y, choque.x - ob.def.x);
            f.rebote = { t: 0, x: choque.x, y: choque.y, vx: Math.cos(ang) * 260 - 160, vy: Math.sin(ang) * 260 - 220, rot: f.img.rotation, vr: (Math.random() < 0.5 ? -1 : 1) * 9 };
            f.estela = [];
            ob.sacudida = 1;
            this.particulas.emitir(choque.x, choque.y, { n: 14, vel: 260, vida: 600, escala: 0.38, tintes: [0xf783ac, 0xffe066, 0xffffff, 0xb197fc], tipos: ["chispa", "punto"] });
            this.onda(ob.def.x, ob.y, 0xf783ac, ob.def.r / 70);
            sonar("rebota");
            this.alFallar(f, null, "obstaculo");
        }

        alFallar(f, llegadaY, motivo) {
            if (f.demo || !this.marcador) return;
            var m = this.marcador, j = jcfg();
            m.fallos++;
            m.seguidos++;
            if (motivo === "obstaculo") m.choques = (m.choques || 0) + 1;
            var cons = motivo || R().consejo(llegadaY, this.sit);
            if (this.ayudaAuto && m.seguidos >= num(j.fallosParaMarca, 3)) this.ayudaOn = true;
            if (m.seguidos >= num(j.fallosParaAsistir, 4)) this.factorVel = Math.max(0.7, this.factorVel - 0.1);
            if (motivo !== "obstaculo") sonar("pierde");
            avisar("fallo", { consejo: cons, seguidos: m.seguidos, llegada: llegadaY });
            var self = this, gen = this.gen;
            this.anim.agregar(num(j.recargaMs, 550), function () {}).then(function () {
                if (gen === self.gen && self.estado === "vuelo") self.rearmar();
            });
        }

        /** Una flecha nueva aparece en la cuerda: el arco queda listo. */
        rearmar() {
            if (this.estado === "completo") return;
            this.estado = "listo";
            this.tQuieto = 0;
            var self = this;
            sonar("recarga");
            this.anim.agregar(260, function (u) { self.flechaCuerdaAlfa = u; });
        }

        // ------------------------------------------------------------------ la diana

        colocarDiana() {
            var d = this.diana;
            var k = d.R * d.escala / 150;
            var resD = D().res("diana");
            this.cara.setPosition(d.x, d.y).setScale(k / resD).setRotation(d.rot).setAlpha(d.alfa);
            var rd = D().res("anilloDeco");
            this.decoA.setPosition(d.x, d.y).setScale(k * 1.2 / rd).setRotation(-d.rot * 0.6 + this.t / 2600);
            this.decoB.setPosition(d.x, d.y).setScale(k * 1.34 / rd).setRotation(d.rot * 0.35 - this.t / 3400);
            var rl = D().res("luz");
            this.dianaHalo.setPosition(d.x, d.y).setScale(d.R * d.escala * 2.6 / 64 / rl);
            var radios = (this.nivel && this.nivel.radios) || [0.3, 0.64, 1];
            var rc = D().res("corona");
            this.coronas[50].setPosition(d.x, d.y).setScale(d.R * d.escala * radios[0] * 1.08 / 100 / rc);
            this.coronas[30].setPosition(d.x, d.y).setScale(d.R * d.escala * radios[1] * 1.08 / 100 / rc);
            this.coronas[10].setPosition(d.x, d.y).setScale(d.R * d.escala * 1.1 / 100 / rc);
            var Rr = d.R * d.escala;
            // etiquetas estables (no giran) sobre cada anillo, del lado del arco
            var a10 = Math.PI * 1.17, a30 = Math.PI * 0.83;
            var r10 = Rr * (radios[1] + 1) / 2, r30 = Rr * (radios[0] + radios[1]) / 2;
            this.etiquetas[10].setPosition(d.x + Math.cos(a10) * r10, d.y + Math.sin(a10) * r10).setAlpha(d.alfa).setScale(Math.max(0.7, d.escala * d.R / 115));
            this.etiquetas[30].setPosition(d.x + Math.cos(a30) * r30, d.y + Math.sin(a30) * r30).setAlpha(d.alfa).setScale(Math.max(0.7, d.escala * d.R / 115));
            this.etiquetas[50].setPosition(d.x, d.y + Rr * radios[0] * 0.05).setAlpha(d.alfa * 0.95).setScale(Math.max(0.7, d.escala * d.R / 115));
            // flechas clavadas: siguen a la diana
            this.clavadas.forEach(function (f) { f.img.setPosition(d.x, d.y + f.dy * d.escala); });
        }

        actualizarDiana(dt) {
            var d = this.diana;
            d.yPrev = d.y;
            if (this.sit && !this.moviendo) {
                this.tSit += dt / 1000 * this.factorVel;
                d.y = R().dianaY(this.sit, this.tSit);
            }
            var giro = this.sit ? this.sit.giro : 0.4;
            d.rot += (giro + d.giroExtra) * dt / 1000;
            d.giroExtra *= Math.pow(0.2, dt / 1000);
            this.colocarDiana();
            // indicador suave de hacia dónde se mueve (no dice dónde disparar)
            var on = this.sit && !this.moviendo && (!this.nivel || this.nivel.direccion) && this.estado !== "presentacion";
            var vy = this.sit ? R().dianaVy(this.sit, this.tSit) * this.factorVel : 0;
            var k = Math.min(1, Math.abs(vy) / 110);
            var Rr = d.R * d.escala;
            var osc = Math.sin(this.t / 160) * 6;
            this.flechaArriba.setPosition(d.x, d.y - Rr * 1.36 - 10 + (vy < 0 ? -osc : 0)).setAlpha(on && vy < 0 ? 0.25 + 0.6 * k : 0);
            this.flechaAbajo.setPosition(d.x, d.y + Rr * 1.36 + 10 + (vy > 0 ? osc : 0)).setAlpha(on && vy > 0 ? 0.25 + 0.6 * k : 0);
            this.dianaHalo.setAlpha(0.22 + 0.1 * Math.sin(this.t / 400) + (this.fiestaOn ? 0.3 : 0));
        }

        /** Riel de luz que enmarca el recorrido vertical de la diana en la situación actual. */
        dibujarRiel() {
            var g = this.gRiel;
            g.clear();
            var s = this.sit;
            if (!s) { this.lucesRiel.forEach(function (l) { l.setAlpha(0); }); return; }
            var y0 = s.centro - s.amp - s.R * 1.15, y1 = s.centro + s.amp + s.R * 1.15;
            var x = s.x;
            g.fillStyle(0x4c2a9e, 0.28);
            g.fillRoundedRect(x - 16, y0, 32, y1 - y0, 16);
            g.lineStyle(3, CIAN, 0.45);
            g.strokeRoundedRect(x - 16, y0, 32, y1 - y0, 16);
            g.lineStyle(3, 0xffd43b, 0.6);
            g.beginPath(); g.moveTo(x - 34, y0); g.lineTo(x + 34, y0); g.strokePath();
            g.beginPath(); g.moveTo(x - 34, y1); g.lineTo(x + 34, y1); g.strokePath();
            this.lucesRiel.forEach(function (l, i) {
                l.setPosition(x + (i % 2 ? 26 : -26), y0 + (y1 - y0) * (Math.floor(i / 2) + 0.5) / 5);
                l.y0 = l.y;
            });
        }

        /** Coloca los asteroides guardianes de la situación (ninguno en los niveles 1 y 2). */
        ponerObstaculos(defs, aparecer) {
            var self = this;
            defs = defs || [];
            this.obstaculos.forEach(function (o, i) {
                o.def = defs[i] || null;
                o.sacudida = 0;
                if (!o.def) { o.alfa = 0; return; }
                o.y = o.yPrev = R().obstaculoY(o.def, self.tObs);
                if (aparecer) {
                    o.alfa = 0;
                    self.anim.agregar(600, function (u) { o.alfa = u; });
                } else {
                    o.alfa = 1;
                }
            });
            this.dibujarRielesObs();
        }

        /** Guía punteada del recorrido de cada asteroide (para que el niño anticipe por dónde pasa). */
        dibujarRielesObs() {
            var g = this.gObs;
            g.clear();
            this.obstaculos.forEach(function (o) {
                if (!o.def) return;
                var d = o.def, y0 = d.centro - d.amp, y1 = d.centro + d.amp;
                for (var y = y0; y < y1; y += 22) {
                    g.fillStyle(0xf783ac, 0.6);
                    g.fillCircle(d.x, y, 4);
                }
                g.lineStyle(3, 0xf783ac, 0.45);
                g.beginPath(); g.moveTo(d.x - 18, y0); g.lineTo(d.x + 18, y0); g.strokePath();
                g.beginPath(); g.moveTo(d.x - 18, y1); g.lineTo(d.x + 18, y1); g.strokePath();
            });
        }

        actualizarObstaculos(dt) {
            var t = this.t, rl = D().res("luz"), ra = D().res("aro");
            this.gObs.setAlpha(this.obstaculos.some(function (o) { return o.def; }) ? Math.max.apply(null, this.obstaculos.map(function (o) { return o.alfa; })) : 0);
            for (var i = 0; i < this.obstaculos.length; i++) {
                var o = this.obstaculos[i];
                if (!o.def || o.alfa <= 0) {
                    o.roca.setAlpha(0); o.luz.setAlpha(0); o.aro.setAlpha(0);
                    if (!o.def) continue;
                }
                o.yPrev = o.y;
                o.y = R().obstaculoY(o.def, this.tObs);
                o.sacudida = Math.max(0, o.sacudida - dt / 500);
                var x = o.def.x + Math.sin(t / 30) * 8 * o.sacudida;
                var r = o.def.r;
                var dRoca = D().res("asteroide" + i);
                o.roca.setPosition(x, o.y).setScale(r * 2.3 / 120 / dRoca * (1 + 0.12 * o.sacudida)).setAlpha(o.alfa);
                o.roca.rotation += dt / 1000 * 0.7 * (i % 2 ? -1 : 1);
                o.luz.setPosition(x, o.y).setScale(r * 3.4 / 64 / rl).setAlpha(o.alfa * (0.35 + 0.15 * Math.sin(t / 300 + i) + 0.4 * o.sacudida));
                o.aro.setPosition(x, o.y).setScale(r * 1.3 / 88 / ra).setRotation(t / 900).setAlpha(o.alfa * (0.75 + 0.25 * Math.sin(t / 250 + i)));
            }
        }

        /** La diana se desliza a su nueva distancia o altura (nivel 2: tres distancias; nivel 4: alturas). */
        cambiarSituacion(i) {
            var self = this, d = this.diana, gen = this.gen;
            var antes = this.sit;
            var nueva = this.nivel.situaciones[i];
            this.moviendo = true;
            this.estado = "moviendo";
            var x0 = d.x, y0 = d.y, R0 = d.R;
            var y1 = R().dianaY(nueva, 0);
            sonar("desliza");
            this.gRiel.clear();
            this.lucesRiel.forEach(function (l) { l.setAlpha(0); });
            // las flechas clavadas se desvanecen con la mudanza
            this.clavadas.forEach(function (f) { f.clavada = false; f.apagando = 400; });
            this.clavadas = [];
            var obs = this.obstaculos;
            return this.anim.agregar(1100, function (u) {
                var k = suave(u);
                obs.forEach(function (o) { if (o.def) o.alfa = Math.min(o.alfa, 1 - Math.min(1, u * 2)); });
                d.x = lerp(x0, nueva.x, k);
                d.y = d.yPrev = lerp(y0, y1, k);
                d.R = lerp(R0, nueva.R, k);
                d.giroExtra = 3 * Math.sin(u * Math.PI);
                if (Math.random() < 0.3) self.particulas.emitir(d.x, d.y + d.R, { n: 2, vel: 60, vida: 500, escala: 0.3, angulo: Math.PI / 2, apertura: 1, tintes: [CIAN, 0xffe066], tipos: ["punto"] });
            }).then(function () {
                if (gen !== self.gen) return;
                self.sitIdx = i;
                self.sit = nueva;
                self.tSit = 0;
                self.moviendo = false;
                self.dibujarRiel();
                self.ponerObstaculos(nueva.obstaculos, true);
                avisar("situacion", {
                    indice: i,
                    masLejos: nueva.x > antes.x + 60,
                    masCerca: nueva.x < antes.x - 60,
                    otraAltura: Math.abs(nueva.centro - antes.centro) > 40
                });
                self.rearmar();
            });
        }

        // ------------------------------------------------------------------ efectos

        efectoImpacto(puntos, x, y) {
            var d = this.diana, self = this;
            var col = COLOR_ANILLO[puntos];
            var cor = this.coronas[puntos];
            this.anim.agregar(900, function (u) { cor.setAlpha(Math.sin(Math.min(1, u * 1.4) * Math.PI) * 0.95 + (u < 0.2 ? 0 : 0)); });
            this.onda(d.x, d.y, col, d.R * d.escala / 88 * 1.05);
            if (puntos >= 30) this.onda(d.x, d.y, col, d.R * d.escala / 88 * 1.5);
            this.particulas.emitir(x, y, { n: puntos === 50 ? 34 : (puntos === 30 ? 22 : 14), vel: puntos === 50 ? 420 : 300, vida: 800, escala: 0.42, tintes: CHISPAS[puntos], tipos: ["chispa", "punto"] });
            if (puntos === 50) {
                this.particulas.emitir(d.x, d.y, { n: 18, vel: 520, vida: 1100, escala: 0.6, tintes: CHISPAS[50], tipos: ["chispa"], roce: 0.96 });
                this.destello(0xffe066, 0.28);
                this.trofeoPequeno(d.x, d.y - d.R * d.escala - 40);
            } else {
                this.destello(col, puntos === 30 ? 0.16 : 0.1);
            }
            d.giroExtra = puntos === 50 ? 6 : 3;
            var cara = this.cara;
            this.anim.agregar(380, function (u) { d.escala = 1 + 0.08 * Math.sin(u * Math.PI); }).then(function () { d.escala = 1; void cara; });
            this.flotarTexto(d.x - d.R - 70, d.y - 20, "+" + puntos, puntos === 50 ? "#ffe066" : (puntos === 30 ? "#e599f7" : "#a5d8ff"));
            // el escenario celebra: reflectores, trofeos, estrellas y banderines
            this.brilloCols = puntos === 50 ? 1 : 0.6;
            this.trofeos.forEach(function (t) { t.salto = 1; });
            this.estrellas.forEach(function (st) { st.extra = puntos === 50 ? 0.8 : 0.4; });
            this.banderines.forEach(function (b) { b.extra = puntos === 50 ? 1 : 0.5; });
            this.nebulas.forEach(function (nb) { nb.extra = 0.25; });
            sonar("impacto", puntos);
            void self;
        }

        /** Trofeo pequeño que sale flotando del centro dorado (50 puntos). */
        trofeoPequeno(x, y) {
            var t = img(this, x, y, "trofeo", 0.42).setDepth(44).setAlpha(0);
            var base = t.base;
            this.anim.agregar(1400, function (u) {
                t.y = y - 60 * saleSuave(u);
                t.setScale(base * (0.4 + 0.6 * Math.min(1, u * 3))).setAlpha(u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3).setRotation(Math.sin(u * 12) * 0.12);
            }).then(function () { t.destroy(); });
        }

        onda(x, y, tinte, k) {
            var o = this.ondas.find(function (a) { return !a.activa; }) || this.ondas[0];
            o.activa = true;
            o.setPosition(x, y).setTint(tinte).setAlpha(0.9);
            var base = o.base * (k || 1);
            this.anim.agregar(620, function (u) {
                o.setScale(base * (0.6 + 1.1 * saleSuave(u))).setAlpha(0.9 * (1 - u));
            }).then(function () { o.activa = false; o.setAlpha(0); });
        }

        destello(color, alfa) {
            var b = this.brillo;
            b.setFillStyle(color);
            this.anim.agregar(380, function (u) { b.setAlpha(alfa * (1 - u)); });
        }

        flotarTexto(x, y, texto, color, tam) {
            var t = this.add.text(x, y, texto, estiloTexto(tam || 52, color, "#1b1464", 9)).setOrigin(0.5).setDepth(45);
            this.textos.push(t);
            var self = this;
            this.anim.agregar(1200, function (u) {
                t.y = y - 80 * saleSuave(u);
                t.setScale(0.6 + 0.5 * Math.min(1, u * 4)).setAlpha(u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3);
            }).then(function () {
                t.destroy();
                self.textos = self.textos.filter(function (a) { return a !== t; });
            });
        }

        /** Mensaje del acierto en la escena (debajo de los puntos). */
        mensaje(texto, color) {
            var d = this.diana;
            this.flotarTexto(Math.max(520, d.x - d.R - 150), d.y + 50, texto, color || "#ffffff", 34);
        }

        // ------------------------------------------------------------------ niveles

        aplicarTema() {
            var T = TEMAS[this.tema] || TEMAS.nebulosa;
            this.nebulas.forEach(function (n, i) { n.setTint(T.nebulas[i % T.nebulas.length]); });
            this.tinteFondo.setFillStyle(T.fondo);
            this.columnas.forEach(function (c) { c.luz.setTint(T.luces); });
            this.haces.forEach(function (h) { h.setTint(T.luces); });
        }

        cargar(nivel, ronda) {
            this.gen++;
            this.nivel = nivel;
            this.ronda = ronda || {};
            this.A = nivel ? nivel.arco : R().arco(jcfg(), ronda);
            this.flechas.forEach(this.soltarFlecha, this);
            this.clavadas = [];
            this.particulas.apagar();
            this.textos.forEach(function (t) { t.destroy(); });
            this.textos = [];
            this.T = 0;
            this.tVis = 0;
            this.resorte = null;
            this.arrastre = null;
            this.demoTensando = false;
            this.moviendo = false;
            this.estado = "presentacion";
            this.sitIdx = 0;
            this.sit = nivel ? nivel.situaciones[0] : null;
            this.tSit = 0;
            this.factorVel = 1;
            this.ayudaOn = false;
            this.tQuieto = 0;
            this.flechaCuerdaAlfa = 0;
            var d = this.diana;
            if (this.sit) {
                d.x = this.sit.x;
                d.R = this.sit.R;
                d.y = d.yPrev = R().dianaY(this.sit, 0);
            }
            d.escala = 1;
            d.alfa = 1;
            this.marcador = { hechos: 0, total: nivel ? nivel.aciertos : 3, puntos: 0, disparos: 0, fallos: 0, seguidos: 0, por: { 10: 0, 30: 0, 50: 0 } };
            this.tema = this.ronda.tema || "nebulosa";
            this.aplicarTema();
            this.dibujarRiel();
            this.tObs = 0;
            this.ponerObstaculos(this.sit ? this.sit.obstaculos : [], false);
            this.colocarDiana();
            this.fuerzaVista = -1;
        }

        /** El arco se activa, la flecha aparece en la cuerda y la diana entra. */
        presentar() {
            var self = this, d = this.diana;
            this.estado = "presentacion";
            sonar("activar");
            this.onda(this.A.empunadura.x, this.A.empunadura.y, CIAN, 2);
            return this.anim.agregar(900, function (u) {
                self.flechaCuerdaAlfa = u;
                self.excitacion = Math.max(self.excitacion, 0.6 * (1 - u));
                d.escala = 0.6 + 0.4 * saleSuave(u);
                d.alfa = Math.min(1, u * 1.6);
            }).then(function () { d.escala = 1; d.alfa = 1; });
        }

        iniciarRonda() {
            if (!this.nivel) return;
            this.estado = "listo";
            this.tQuieto = 0;
            this.flechaCuerdaAlfa = 1;
        }

        // ------------------------------------------------------------------ celebraciones y transiciones

        celebrarNivel(grande) {
            var self = this, d = this.diana;
            this.fiestaOn = true;
            d.giroExtra = 5;
            [10, 30, 50].forEach(function (k, i) {
                self.anim.agregar(i * 220, function () {}).then(function () {
                    var c = self.coronas[k];
                    self.anim.agregar(900, function (u) { c.setAlpha(Math.sin(u * Math.PI)); });
                    self.onda(d.x, d.y, COLOR_ANILLO[k], d.R / 88 * (1.2 + i * 0.4));
                });
            });
            // tres estrellas luminosas sobre la diana
            this.estrellasCel.forEach(function (st, i) {
                var x = d.x + (i - 1) * 110, y = Math.max(150, d.y - d.R - 90) - (i === 1 ? 30 : 0);
                st.setPosition(x, y).setAlpha(0).setScale(0.01);
                var base = st.base;
                self.anim.agregar(300 + i * 250, function () {}).then(function () {
                    sonar("estrella", i);
                    self.particulas.emitir(x, y, { n: 12, vel: 260, vida: 700, escala: 0.4, tintes: CHISPAS[50], tipos: ["chispa"] });
                    self.anim.agregar(1700, function (u) {
                        st.setScale(base * (u < 0.25 ? saleSuave(u / 0.25) * 1.2 : 1.2 - 0.2 * Math.min(1, (u - 0.25) / 0.2))).setAlpha(u < 0.8 ? 1 : 1 - (u - 0.8) / 0.2).setRotation(Math.sin(u * 8) * 0.15);
                    });
                });
            });
            this.brilloCols = 1;
            this.banderines.forEach(function (b) { b.extra = 1; });
            this.estrellas.forEach(function (st) { st.extra = 1; });
            this.trofeos.forEach(function (t) { t.salto = 1; });
            var lluvia = 0;
            return this.anim.agregar(grande ? 3400 : 2500, function (u) {
                var n = Math.floor(u * 44);
                while (lluvia < n) {
                    lluvia++;
                    self.particulas.emitir(azarEn(240, 1360), azarEn(40, 180), { n: 3, vel: 90, vida: 1600, escala: 0.4, angulo: Math.PI / 2, apertura: 0.8, grav: 120, tintes: ARCOIRIS, tipos: ["chispa", "punto"] });
                }
                self.nebulas.forEach(function (nb) { nb.extra = 0.3 * Math.sin(u * Math.PI); });
                self.brilloCols = Math.max(self.brilloCols, 0.6);
            }).then(function () { self.fiestaOn = false; });
        }

        /** Gran final: onda dorada, el escenario se llena de estrellas y aparece el gran trofeo dorado. */
        celebrarFinal() {
            var self = this, d = this.diana;
            this.fiestaOn = true;
            sonar("trofeo");
            for (var i = 0; i < 5; i++) {
                (function (k) {
                    self.anim.agregar(k * 300, function () {}).then(function () { self.onda(d.x, d.y, k % 2 ? ORO : 0xfff3bf, 2 + k * 1.2); });
                })(i);
            }
            this.destello(0xffe066, 0.4);
            var tg = this.trofeoGrande, tl = this.trofeoGrandeLuz;
            var bt = tg.base, bl = tl.base;
            tg.setPosition(W / 2, 600);
            tl.setPosition(W / 2, 600);
            var p1 = this.anim.agregar(2600, function (u) {
                var k = saleSuave(Math.min(1, u * 1.6));
                tg.setScale(bt * (0.2 + 0.8 * k)).setAlpha(Math.min(1, u * 3)).setRotation(Math.sin(u * 10) * 0.06 * (1 - u));
                tg.y = 600 - 20 * Math.sin(u * Math.PI * 2);
                tl.setScale(bl * (0.4 + 0.8 * k)).setAlpha(0.55 * Math.min(1, u * 3));
                if (Math.random() < 0.4) self.particulas.emitir(W / 2 + azarEn(-120, 120), 560 + azarEn(-80, 80), { n: 3, vel: 380, vida: 1400, escala: 0.5, tintes: CHISPAS[50].concat(ARCOIRIS), tipos: ["chispa", "punto"], roce: 0.97 });
            });
            this.brilloCols = 1;
            this.banderines.forEach(function (b) { b.extra = 1; });
            this.estrellas.forEach(function (st) { st.extra = 1; });
            return p1.then(function () { return self.celebrarNivel(true); });
        }

        transicion() {
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

        salida() {
            var self = this, d = this.diana;
            this.entradaOn = false;
            this.arrastre = null;
            return this.anim.agregar(500, function (u) {
                d.alfa = 1 - u;
                self.clavadas.forEach(function (f) { f.img.setAlpha(1 - u); });
            });
        }

        fiesta(on) { this.fiestaOn = !!on; }

        // ------------------------------------------------------------------ demostración automática

        /**
         * La mano toma la cuerda, la arrastra hacia atrás (la fuerza sube y la curva se alarga), espera a que la
         * diana vaya a pasar por donde llegará la flecha y suelta. No cuenta para el nivel.
         * mano(x, y, fase) recibe coordenadas del mundo.
         */
        demo(mano) {
            var self = this, gen = this.gen;
            var vivo = function () { return gen === self.gen; };
            this.estado = "demo";
            this.flechaCuerdaAlfa = 1;
            var A = this.A, s = this.sit, d = this.diana;
            if (!s) return Promise.resolve();
            var T = R().tensionPara(A, d.x, s.centro) || 0.55;
            var L = R().lanzamiento(A, T);
            var tf = R().cruce(L, d.x).t;
            var yLlega = R().alturaLlegada(A, T, d.x);
            var esperarHasta = function (cond, max) {
                return new Promise(function (resolve) {
                    var t0 = Date.now();
                    var vigia = setInterval(function () {
                        if (!vivo() || cond() || Date.now() - t0 > max) { clearInterval(vigia); resolve(); }
                    }, 30);
                });
            };
            var dormir = function (ms) { return esperarHasta(function () { return false; }, ms); };
            var dedo = function (tiron) {
                var c = R().cuerdaEn(A, tiron);
                return { x: c.x - 6, y: c.y + 10 };
            };
            var p0 = dedo(0);
            mano(p0.x - 60, p0.y + 60, "aparece");
            return dormir(350).then(function () {
                if (!vivo()) return;
                mano(p0.x, p0.y, "viajar");
                return dormir(500);
            }).then(function () {
                if (!vivo()) return;
                mano(p0.x, p0.y, "presiona");
                self.demoTensando = true;
                sonar("agarra");
                return dormir(250).then(function () {
                    return self.anim.agregar(1500, function (u) {
                        if (!vivo()) return;
                        var Tu = T * suave(u);
                        self.T = Tu;
                        self.tVis = Tu;
                        sonar("tension", Tu);
                        var q = dedo(Tu * A.tironMax);
                        mano(q.x, q.y, "arrastra");
                    });
                });
            }).then(function () {
                if (!vivo()) return;
                // esperar el momento: cuando la diana vaya a estar a la altura de llegada al llegar la flecha
                return esperarHasta(function () {
                    var yFut = R().dianaY(s, self.tSit + tf * self.factorVel);
                    var vy = R().dianaVy(s, self.tSit + tf * self.factorVel);
                    return Math.abs(yFut - yLlega) < Math.max(5, Math.abs(vy) * 0.03);
                }, 9000);
            }).then(function () {
                if (!vivo()) return;
                var q = dedo(T * A.tironMax);
                mano(q.x - 30, q.y + 30, "viajar");
                self.disparar(T, true);
                return esperarHasta(function () { return !self.flechas.some(function (f) { return f.vivo && !f.resuelta; }); }, 3000);
            }).then(function () {
                return dormir(1300);
            }).then(function () {
                if (vivo()) {
                    self.demoTensando = false;
                    self.estado = "presentacion";
                }
            });
        }

        // ------------------------------------------------------------------ ayuda

        /** Pista visual: una onda en la cuerda y un chevron que muestra hacia dónde arrastrar. */
        ayudaVisual() {
            this.pistaArrastre = 1800;
            var c = R().cuerdaEn(this.A, 0);
            this.onda(c.x, c.y, 0xffe066, 1.2);
        }

        // ------------------------------------------------------------------ dibujo del arco

        /** Del sistema del arco (x hacia el tiro, y perpendicular) al mundo. */
        aMundoArco(lx, ly) {
            var A = this.A, g = A.empunadura, f = A.dir;
            var n = { x: -f.y, y: f.x };
            return { x: g.x + f.x * lx + n.x * ly, y: g.y + f.y * lx + n.y * ly };
        }

        dibujarArco() {
            var A = this.A, self = this;
            var Tv = Math.max(-0.18, Math.min(1, this.tVis));
            var flex = Math.max(0, Tv);
            var ga = this.gArco, gl = this.gArcoLuz, gc = this.gCuerda, gcl = this.gCuerdaLuz;
            ga.clear();
            gl.clear();
            gc.clear();
            gcl.clear();
            var atras = A.empunadura.x - A.cuerda.x !== 0 ? Math.sqrt(Math.pow(A.empunadura.x - A.cuerda.x, 2) + Math.pow(A.empunadura.y - A.cuerda.y, 2)) : 30;
            var tips = [];
            var pulso = this.pulsoTope > 0 ? this.pulsoTope : 0;
            [-1, 1].forEach(function (lado) {
                // pala: cúbica desde la empuñadura hasta la punta; al tensar la punta se va hacia atrás y adentro
                var p0 = { x: 6, y: lado * 26 };
                var p1 = { x: 52 + 10 * flex, y: lado * 70 };
                var p2 = { x: 30 + 6 * flex, y: lado * (128 - 10 * flex) };
                var p3 = { x: -atras + 4 - 30 * flex, y: lado * (154 - 20 * flex) };
                var lados = [], otros = [], centro = [];
                var N = 16;
                for (var i = 0; i <= N; i++) {
                    var u = i / N;
                    var c = bezier(p0, p1, p2, p3, u);
                    var c2 = bezier(p0, p1, p2, p3, Math.min(1, u + 0.02));
                    var c1 = bezier(p0, p1, p2, p3, Math.max(0, u - 0.02));
                    var tx = c2.x - c1.x, ty = c2.y - c1.y, tl = Math.sqrt(tx * tx + ty * ty) || 1;
                    var nx = -ty / tl, ny = tx / tl;
                    var ancho = lerp(17, 6, u);
                    lados.push(self.aMundoArco(c.x + nx * ancho / 2, c.y + ny * ancho / 2));
                    otros.unshift(self.aMundoArco(c.x - nx * ancho / 2, c.y - ny * ancho / 2));
                    centro.push(self.aMundoArco(c.x, c.y));
                }
                // resplandor de energía (más fuerte con la tensión)
                gl.lineStyle(16, CIAN, 0.1 + 0.25 * flex + 0.2 * pulso);
                gl.strokePoints(centro, false);
                // cuerpo metálico azul
                ga.fillStyle(0x2b4cc4, 1);
                ga.fillPoints(lados.concat(otros), true);
                ga.lineStyle(3, 0x14154a, 0.9);
                ga.strokePoints(lados.concat(otros), true);
                // brillo y borde luminoso
                ga.lineStyle(4, 0x74c0fc, 0.85);
                ga.strokePoints(centro.slice(1, 12), false);
                ga.lineStyle(3, flex > 0.75 ? 0xffe066 : CIAN, 0.65 + 0.35 * flex);
                ga.strokePoints(lados, false);
                // detalles violeta (mecanismos)
                var m1 = centro[5], m2 = centro[9];
                ga.fillStyle(0xb197fc, 1);
                ga.fillCircle(m1.x, m1.y, 6);
                ga.fillStyle(0xffd43b, 1);
                ga.fillCircle(m2.x, m2.y, 4);
                tips.push(self.aMundoArco(p3.x, p3.y));
            });
            // cuerda de luz
            var tironV = Tv * A.tironMax;
            var nock = R().cuerdaEn(A, tironV);
            var colCuerda = flex > 0.75 ? 0xffe066 : (flex > 0.4 ? 0xd0bfff : CIAN);
            gcl.lineStyle(12, colCuerda, 0.18 + 0.4 * flex + 0.3 * pulso);
            gcl.beginPath(); gcl.moveTo(tips[0].x, tips[0].y); gcl.lineTo(nock.x, nock.y); gcl.lineTo(tips[1].x, tips[1].y); gcl.strokePath();
            gc.lineStyle(3 + flex * 1.5, 0xffffff, 0.95);
            gc.beginPath(); gc.moveTo(tips[0].x, tips[0].y); gc.lineTo(nock.x, nock.y); gc.lineTo(tips[1].x, tips[1].y); gc.strokePath();
            // puntas, empuñadura y núcleo
            var ang = Math.atan2(A.dir.y, A.dir.x);
            this.puntas.forEach(function (pt, i) { pt.setPosition(tips[i].x, tips[i].y); });
            this.puntasLuz.forEach(function (pl, i) { pl.setPosition(tips[i].x, tips[i].y).setAlpha(0.35 + 0.5 * flex + 0.3 * pulso); });
            this.empunadura.setPosition(A.empunadura.x, A.empunadura.y).setRotation(ang);
            var latido = this.T >= 0.999 && this.estado === "tensando" ? Math.sin(this.t / 90) * 0.18 : Math.sin(this.t / 600) * 0.08;
            var rl = D().res("luz");
            this.nucleo.setPosition(A.empunadura.x, A.empunadura.y).setScale((0.55 + 0.8 * flex + latido) / rl).setAlpha(0.45 + 0.5 * flex);
            this.nucleo.setTint(flex > 0.75 ? 0xffe066 : (flex > 0.4 ? 0xb197fc : CIAN));
            // la flecha sobre la cuerda (se desplaza con ella)
            var hayFlecha = this.flechaCuerdaAlfa > 0 && this.estado !== "vuelo" && this.estado !== "impacto" && this.estado !== "moviendo" && this.estado !== "completo";
            if (hayFlecha) {
                var punta = R().puntaEn(A, Math.max(0, tironV));
                this.flechaCuerda.setPosition(punta.x, punta.y).setRotation(ang).setAlpha(this.flechaCuerdaAlfa);
                this.flechaLuz.setPosition((punta.x + nock.x) / 2, (punta.y + nock.y) / 2).setScale((0.8 + 1.6 * flex) / rl, (0.5 + 0.6 * flex) / rl).setRotation(ang).setAlpha(this.flechaCuerdaAlfa * (0.1 + 0.75 * flex + 0.2 * pulso));
                this.flechaLuz.setTint(colCuerda);
            } else {
                this.flechaCuerda.setAlpha(0);
                this.flechaLuz.setAlpha(0);
            }
            // chispas alrededor de la cuerda mientras se tensa
            if ((this.estado === "tensando" || this.demoTensando) && flex > 0.08) {
                this.tChispaCuerda -= 16;
                if (this.tChispaCuerda <= 0) {
                    this.tChispaCuerda = lerp(140, 45, flex);
                    var w = Math.random() < 0.5 ? 0 : 1, u2 = Math.random();
                    var px = lerp(tips[w].x, nock.x, u2), py = lerp(tips[w].y, nock.y, u2);
                    this.particulas.emitir(px, py, { n: 1, vel: 50, vida: 500, escala: 0.26, tintes: [colCuerda, 0xffffff], tipos: ["chispa", "punto"] });
                }
            }
        }

        // ------------------------------------------------------------------ curva predictiva

        dibujarPrediccion() {
            var g = this.gPred;
            g.clear();
            var tensando = this.estado === "tensando" || this.demoTensando;
            if (!tensando || this.T < 0.02) { this.marca.setAlpha(0); return; }
            var A = this.A, d = this.diana;
            var L = R().lanzamiento(A, this.T);
            var tr = R().trayectoria(L, { dt: 0.03, xFin: d.x + 40, suelo: A.suelo, xMeta: d.x });
            var frac = this.nivel ? this.nivel.prediccion : 1;
            if (this.ayudaOn || this.demoTensando) frac = 1;
            var xLim = L.x0 + (d.x - L.x0) * frac;
            var col = ZONA_COLOR[R().zona(this.T)];
            var pts = tr.puntos;
            var n = pts.length;
            for (var i = 1; i < n; i++) {
                var p = pts[i];
                if (p.x > xLim) break;
                var u = i / n;
                var a = (0.85 - 0.45 * u) * (frac < 1 ? Math.min(1, (xLim - p.x) / 120 + 0.15) : 1);
                g.fillStyle(col, a * 0.35);
                g.fillCircle(p.x, p.y, 9 - 3 * u);
                g.fillStyle(0xffffff, a);
                g.fillCircle(p.x, p.y, 4.5 - 1.5 * u);
            }
            var verMarca = frac >= 1 && (this.ayudaOn || this.demoTensando || (this.nivel && this.nivel.marcaLlegada));
            if (verMarca) {
                var rr = D().res("reticula");
                if (tr.llegada) {
                    this.marca.setPosition(tr.llegada.x, tr.llegada.y).setTint(col).setAlpha(0.85).setScale((0.6 + 0.08 * Math.sin(this.t / 140)) / rr).setRotation(this.t / 700);
                } else if (n) {
                    var ult = pts[n - 1];
                    this.marca.setPosition(ult.x, ult.y).setTint(0xffa94d).setAlpha(0.6).setScale(0.45 / rr).setRotation(0);
                }
            } else {
                this.marca.setAlpha(0);
            }
        }

        // ------------------------------------------------------------------ cuadro a cuadro

        update(time, delta) {
            var dt = Math.min(50, delta || 16);
            if (this.pausado) return;
            this.t += dt;
            this.anim.update(dt);
            this.particulas.update(dt);
            var s = dt / 1000, self = this, t = this.t;

            // ---- cuerda que vuelve tras soltar (vibra) o tras cancelar (suave)
            if (this.resorte) {
                var r = this.resorte;
                r.t += dt;
                if (r.suave) {
                    var u = Math.min(1, r.t / 220);
                    this.tVis = r.T0 * (1 - saleSuave(u));
                    if (u >= 1) this.resorte = null;
                } else {
                    this.tVis = r.T0 * Math.exp(-r.t / 70) * Math.cos(r.t / 26);
                    if (r.t > 450) { this.tVis = 0; this.resorte = null; }
                }
            }
            this.pulsoTope = Math.max(0, this.pulsoTope - dt / 700);
            if (this.estado === "tensando" && this.T >= 0.999 && this.pulsoTope <= 0.05) this.pulsoTope = 0.55;

            // ---- la diana, las flechas y la curva
            this.actualizarDiana(dt);
            this.tObs += dt / 1000 * this.factorVel;
            this.actualizarObstaculos(dt);
            this.actualizarFlechas(dt);
            this.dibujarArco();
            this.dibujarPrediccion();
            this.dibujarFuerza();

            // ---- ayuda: si el niño no hace nada un rato
            if (this.estado === "listo" && this.entradaOn) {
                this.tQuieto += dt;
                if (this.tQuieto > num(jcfg().quietoParaAyudaMs, 12000)) {
                    this.tQuieto = 0;
                    if (this.ayudaAuto) this.ayudaVisual();
                    avisar("quieto", {});
                }
            }
            if (this.pistaArrastre > 0) {
                this.pistaArrastre -= dt;
                var k = (1800 - this.pistaArrastre) % 900 / 900;
                var q = R().cuerdaEn(this.A, k * this.A.tironMax * 0.7);
                if (Math.random() < 0.5) this.particulas.emitir(q.x, q.y, { n: 1, vel: 20, vida: 400, escala: 0.4, tintes: [0xffe066, 0xffffff], tipos: ["chispa"] });
            }

            // ---- el fondo reacciona: tensión, disparo e impactos
            var tension = this.estado === "tensando" || this.demoTensando ? this.T : 0;
            this.excitacion = Math.max(tension * 0.8, this.excitacion - dt / 1400);
            this.brilloCols = Math.max(0, this.brilloCols - dt / 1600);
            var ex = this.excitacion;
            this.estrellas.forEach(function (st) {
                st.extra = Math.max(0, st.extra - dt / 2200);
                st.setAlpha(Math.min(1, st.a0 * (0.55 + 0.45 * Math.sin(t / 1000 * st.vel + st.fase)) + st.extra + ex * 0.25));
            });
            this.nebulas.forEach(function (nb) {
                nb.extra = Math.max(0, nb.extra - dt / 3000);
                nb.setAlpha(nb.a0 + 0.06 * Math.sin(t / 2400 + nb.fase) + ex * 0.18 + nb.extra);
                nb.setScale(nb.k0 * (1 + 0.04 * Math.sin(t / 3100 + nb.fase)));
            });
            this.galaxia.rotation += 0.012 * s;
            this.constelaciones.setAlpha(0.6 + 0.3 * Math.sin(t / 1800));
            this.planetas.forEach(function (p) {
                p.rotation += p.giro * s;
                p.y = p.y0 + Math.sin(t / 3000 + p.fase) * 5;
            });
            this.lejanos.forEach(function (as) {
                as.x += as.vx * s;
                as.y += as.vy * s;
                as.rotation += as.giro * s;
                if (as.x < -80) as.x = W + 60;
                if (as.x > W + 80) as.x = -60;
            });
            this.polvo.forEach(function (pv) {
                pv.x += pv.vx * s;
                pv.y += pv.vy * s * (1 + ex);
                if (pv.y < 30) { pv.y = 780; pv.x = azarEn(0, W); }
                if (pv.x < -10) pv.x = W + 5;
                if (pv.x > W + 10) pv.x = -5;
            });
            this.actualizarFugaz(dt);
            var luzEsc = 0.03 + 0.03 * Math.sin(t / 2000) + ex * 0.06 + (this.fiestaOn ? 0.06 : 0);
            this.tinteFondo.setAlpha(luzEsc);
            this.columnas.forEach(function (c) {
                var a = 0.32 + 0.18 * Math.sin(t / 420 + c.fase) + self.brilloCols * 0.6 + ex * 0.3;
                c.luz.setAlpha(Math.min(1, a));
                c.luz.setScale(c.luz.base * (1 + 0.15 * Math.sin(t / 300 + c.fase) + self.brilloCols * 0.5));
                c.haz.setAlpha(Math.min(0.8, 0.18 + 0.12 * Math.sin(t / 260 + c.fase) + self.brilloCols * 0.4 + ex * 0.2));
            });
            var d = this.diana;
            this.haces.forEach(function (h, i) {
                h.rotation = Math.atan2(h.x - d.x, d.y - h.y) * 0.98;
                h.setAlpha(0.08 + 0.05 * Math.sin(t / 900 + h.fase) + self.brilloCols * 0.15 + (self.fiestaOn ? 0.12 : 0));
                void i;
            });
            this.lucesRiel.forEach(function (l, i) {
                if (!self.sit || self.moviendo) return;
                l.setAlpha(0.35 + 0.55 * Math.max(0, Math.sin(t / 220 - i * 0.6)) + self.brilloCols * 0.4);
            });
            this.banderines.forEach(function (b) {
                b.extra = Math.max(0, b.extra - dt / 2500);
                b.rotation = 0.1 * Math.sin(t / 650 + b.fase) + 0.12 * b.extra * Math.sin(t / 90 + b.fase);
                b.setTint(b.extra > 0.05 || self.fiestaOn ? 0xffffff : 0xd8d8f0);
                b.setScale(b.base * (1 + 0.15 * b.extra));
            });
            this.trofeos.forEach(function (tr) {
                tr.salto = Math.max(0, tr.salto - dt / 900);
                tr.y = tr.y0 + Math.sin(t / 900 + tr.fase) * 9 - Math.sin(tr.salto * Math.PI) * 26;
                tr.rotation = Math.sin(t / 1300 + tr.fase) * 0.05;
                tr.luz.y = tr.y + 10;
                tr.luz.setAlpha(0.22 + 0.12 * Math.sin(t / 500 + tr.fase) + tr.salto * 0.5);
            });
            this.platLuz.setAlpha(0.25 + 0.4 * ex + 0.08 * Math.sin(t / 500));
        }

        actualizarFugaz(dt) {
            var f = this.fugaz;
            if (!f.activa) {
                this.tFugaz -= dt;
                if (this.tFugaz <= 0) {
                    var T = TEMAS[this.tema] || TEMAS.nebulosa;
                    this.tFugaz = T.fugazMs * azarEn(0.8, 1.4);
                    f.activa = true;
                    var dir = Math.random() < 0.5 ? 1 : -1;
                    f.x = dir > 0 ? azarEn(-100, 600) : azarEn(1000, 1700);
                    f.y = azarEn(30, 240);
                    f.vx = dir * azarEn(700, 950);
                    f.vy = azarEn(200, 340);
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
            input: { activePointers: 2, touch: true, mouse: true },
            render: { antialias: true },
            scene: [EscenaTorneo]
        });
        global.__escenarioArquero = juego;
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

    global.EscenarioArquero = {
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
        /** Habilita o bloquea los toques (si se bloquea con el arco tenso, vuelve a reposo sin disparar). */
        entrada: function (on) {
            if (!escena) return;
            escena.entradaOn = !!on;
            if (!on) escena.cancelarTension();
        },
        ayudaAutomatica: function (on) {
            if (!escena) return;
            escena.ayudaAuto = !!on;
            if (!on) escena.ayudaOn = false;
        },
        mensaje: function (texto, color) { if (escena) escena.mensaje(texto, color); },
        celebrarNivel: function (grande) { return escena ? escena.celebrarNivel(grande) : Promise.resolve(); },
        celebrarFinal: function () { return escena ? escena.celebrarFinal() : Promise.resolve(); },
        transicion: function () { return escena ? escena.transicion() : Promise.resolve(); },
        salida: function () { return escena ? escena.salida() : Promise.resolve(); },
        fiesta: function (on) { if (escena) escena.fiesta(on); },
        pausar: function (on) {
            if (!escena) return;
            if (on) escena.cancelarTension();
            escena.pausado = !!on;
            escena.anim.pausado = !!on;
        },
        aPantalla: aPantalla,
        aMundo: aMundo,
        /** Pruebas: planear un tiro (tensión para llegar a una altura) y disparar como lo haría un niño. */
        probar: {
            plan: function (y) {
                if (!escena || !escena.sit) return null;
                var A = escena.A, d = escena.diana;
                var T = R().tensionPara(A, d.x, y == null ? escena.sit.centro : y);
                if (T == null) return null;
                var L = R().lanzamiento(A, T);
                return { T: T, tf: R().cruce(L, d.x).t, yLlega: R().alturaLlegada(A, T, d.x) };
            },
            /** ¿Un tiro con tensión T soltado dentro de dt segundos pasaría entre los asteroides? */
            libre: function (T, dt) {
                if (!escena || !escena.sit) return true;
                var defs = escena.obstaculos.filter(function (o) { return o.def; }).map(function (o) { return o.def; });
                return !defs.length || R().libreDeObstaculos(escena.A, T, defs, escena.tObs + (dt || 0) * escena.factorVel, escena.diana.x);
            },
            /** Futura altura de la diana dentro de dt segundos. */
            dianaEn: function (dt) { return escena && escena.sit ? R().dianaY(escena.sit, escena.tSit + dt * escena.factorVel) : null; },
            disparar: function (T) {
                if (!escena || escena.estado !== "listo") return false;
                escena.estado = "tensando";
                escena.T = T;
                return escena.disparar(T, false);
            },
            prediccion: function () {
                if (!escena) return null;
                var L = R().lanzamiento(escena.A, escena.T);
                return R().trayectoria(L, { dt: 0.03, xFin: escena.diana.x + 40, suelo: escena.A.suelo, xMeta: escena.diana.x });
            }
        },
        estado: function () {
            if (!escena) return null;
            var d = escena.diana;
            return {
                estado: escena.estado,
                nivel: escena.nivel ? escena.nivel.id : null,
                tema: escena.tema,
                entrada: escena.entradaOn,
                pausado: escena.pausado,
                T: Math.round(escena.T * 1000) / 1000,
                cuerda: R().cuerdaEn(escena.A, escena.tVis * escena.A.tironMax),
                cuerdaReposo: R().cuerdaEn(escena.A, 0),
                dir: escena.A.dir,
                tironMax: escena.A.tironMax,
                diana: { x: Math.round(d.x), y: Math.round(d.y), R: d.R, rot: Math.round(d.rot * 100) / 100 },
                sit: escena.sit ? { i: escena.sitIdx, x: escena.sit.x, centro: escena.sit.centro, amp: Math.round(escena.sit.amp), giro: escena.sit.giro } : null,
                tSit: escena.tSit,
                marcador: escena.marcador,
                ayuda: escena.ayudaOn,
                factorVel: escena.factorVel,
                flechas: escena.flechas.filter(function (f) { return f.vivo; }).map(function (f) { return { x: Math.round(f.p.x), y: Math.round(f.p.y), t: f.t, clavada: !!f.clavada, resuelta: !!f.resuelta, demo: !!f.demo }; }),
                clavadas: escena.clavadas.length,
                tObs: escena.tObs,
                obstaculos: escena.obstaculos.filter(function (o) { return o.def; }).map(function (o) { return { x: o.def.x, y: Math.round(o.y), r: o.def.r, amp: Math.round(o.def.amp), periodo: o.def.periodo }; })
            };
        }
    };
})(typeof window !== "undefined" ? window : globalThis);
