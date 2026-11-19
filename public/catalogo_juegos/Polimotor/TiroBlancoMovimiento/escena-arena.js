/**
 * EscenarioTiro — escena Phaser 4 de "El Tiro al Blanco en Movimiento" (window.EscenarioTiro).
 * La escena dibuja, anima y avisa; no decide (reglas.js decide y script.js ordena el flujo).
 *
 *   Arena de puntería espacial en perspectiva: fondo con nebulosas y planetas, conos de luz, torres
 *   holográficas, piso metálico con paneles que se encienden, partículas flotantes, diana holográfica
 *   móvil (con reflejo en el piso y sombra fantasma), lanzador estelar de Zeus y disco de luz con estela.
 *
 * Mundo de diseño 1600 × 900 con Scale.ENVELOP (llena la pantalla; lo importante va en el centro).
 * Todo se mueve con delta time; las animaciones que el flujo espera devuelven Promise con respaldo por tiempo.
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser || null;
    var D = function () { return global.DibujosTiro; };
    var R = function () { return global.ReglasTiro; };
    var W = 1600, H = 900;
    var BOCA = { x: 800, y: 686 };      // de aquí sale el disco (apoyado en el collar del lanzador)
    var BASE = { x: 800, y: 690 };      // collar del lanzador (origen de su textura)
    var PISO_LZ = 836;                  // donde el lanzador toca el piso
    var RADIO_DISCO = 16;

    var juego = null, el = null, cfg = null, arena = null, espera = null;
    var cb = { apuntar: null, mover: null, soltar: null, fuera: null, evento: null };

    function avisar(nombre, a, b) {
        var f = cb[nombre];
        if (typeof f === "function") {
            try { f(a, b); } catch (e) { console.warn("[EscenarioTiro]", nombre, e); }
        }
    }

    function evento(nombre, datos) { avisar("evento", nombre, datos); }

    function limitar(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function suave(u) { return u * u * (3 - 2 * u); }
    function lerp(a, b, u) { return a + (b - a) * u; }
    function salida(u) { return 1 - Math.pow(1 - u, 3); }

    // ------------------------------------------------------------------ animador con delta time y respaldo

    function Animador() { this.lista = []; }

    Animador.prototype.agregar = function (dur, fn, ease) {
        var self = this;
        return new Promise(function (resolve) {
            var a = { t: 0, dur: Math.max(1, dur), fn: fn, ease: ease || null, resolve: resolve, hecho: false };
            a.timer = setTimeout(function () { self.fin(a); }, dur + 450);
            self.lista.push(a);
        });
    };

    Animador.prototype.fin = function (a) {
        if (a.hecho) return;
        a.hecho = true;
        clearTimeout(a.timer);
        try { a.fn(1); } catch (e) { /* noop */ }
        a.resolve();
    };

    Animador.prototype.update = function (dt) {
        var vivos = [];
        for (var i = 0; i < this.lista.length; i++) {
            var a = this.lista[i];
            if (a.hecho) continue;
            a.t += dt;
            var u = Math.min(1, a.t / a.dur);
            if (u >= 1) {
                this.fin(a);
                continue;
            }
            try { a.fn(a.ease ? a.ease(u) : u); } catch (e) { /* noop */ }
            vivos.push(a);
        }
        this.lista = vivos;
    };

    Animador.prototype.limpiar = function () {
        var l = this.lista;
        this.lista = [];
        l.forEach(function (a) { this.fin(a); }, this);
    };

    function esperar(ms) {
        return new Promise(function (r) { setTimeout(r, ms); });
    }

    // ------------------------------------------------------------------ partículas (una reserva fija de imágenes)

    function Particulas(scene, n, prof) {
        this.lista = [];
        for (var i = 0; i < n; i++) {
            var img = scene.add.image(-100, -100, "chispa").setVisible(false).setDepth(prof || 60).setBlendMode(Phaser.BlendModes.ADD);
            this.lista.push({ img: img, vivo: false, t: 0 });
        }
        this.i = 0;
    }

    Particulas.prototype.emitir = function (x, y, o) {
        var colores = o.colores || [0xffffff];
        var tipos = o.tipos || ["chispa"];
        for (var k = 0; k < (o.n || 8); k++) {
            var p = this.lista[this.i];
            this.i = (this.i + 1) % this.lista.length;
            var ang = o.angulo != null ? o.angulo + (Math.random() - 0.5) * (o.apertura || 1) : Math.random() * Math.PI * 2;
            var v = (o.vel || 260) * (0.4 + Math.random() * 0.8);
            p.vivo = true;
            p.t = 0;
            p.vida = (o.vida || 900) * (0.7 + Math.random() * 0.5);
            p.vx = Math.cos(ang) * v + (o.vx || 0);
            p.vy = Math.sin(ang) * v + (o.vy || 0);
            p.grav = o.grav != null ? o.grav : 160;
            p.giro = (Math.random() - 0.5) * (o.giro || 4);
            p.esc = (o.escala || 0.5) * (0.6 + Math.random() * 0.7);
            p.img.setTexture(tipos[Math.floor(Math.random() * tipos.length)]);
            p.img.setTint(colores[Math.floor(Math.random() * colores.length)]);
            p.img.setPosition(x + (Math.random() - 0.5) * (o.dispersion || 10), y + (Math.random() - 0.5) * (o.dispersion || 10));
            p.img.setScale(p.esc).setAlpha(1).setVisible(true).setRotation(Math.random() * 6);
        }
    };

    Particulas.prototype.update = function (dt) {
        var s = dt / 1000;
        for (var i = 0; i < this.lista.length; i++) {
            var p = this.lista[i];
            if (!p.vivo) continue;
            p.t += dt;
            var u = p.t / p.vida;
            if (u >= 1) {
                p.vivo = false;
                p.img.setVisible(false);
                continue;
            }
            p.vy += p.grav * s;
            p.vx *= Math.exp(-1.2 * s);
            p.img.x += p.vx * s;
            p.img.y += p.vy * s;
            p.img.rotation += p.giro * s;
            p.img.setAlpha(1 - u * u);
            p.img.setScale(p.esc * (u < 0.12 ? 0.4 + u * 5 : 1 - u * 0.4));
        }
    };

    Particulas.prototype.apagar = function () {
        this.lista.forEach(function (p) { p.vivo = false; p.img.setVisible(false); });
    };

    // ------------------------------------------------------------------ escena

    var EscenaArena = Phaser ? class extends Phaser.Scene {
        constructor() { super({ key: "Arena" }); }

        create() {
            var self = this;
            var tx = D().texturas();
            Object.keys(tx).forEach(function (k) {
                if (!self.textures.exists(k)) self.textures.addCanvas(k, tx[k]());
            });
            var ADD = Phaser.BlendModes.ADD;
            this.anim = new Animador();
            this.t = 0;
            this.brillo = 0;
            this.brilloFijo = 0;
            this.entradaOn = false;
            this.apuntando = false;
            this.apunte = null;
            this.anguloPrevio = null;
            this.carga = 0;
            this.retro = 0;
            this.saltoL = 0;
            this.destacado = false;
            this.haloAyuda = true;
            this.vuelo = null;
            this.discoListo = true;
            this.enFinal = false;
            this.tFuego = 0;
            this.dianaVel = 120;

            // --- cielo
            this.add.image(W / 2, H / 2, "fondo").setDepth(0);
            this.estrellas = [];
            for (var i = 0; i < 46; i++) {
                var e = this.add.image(Math.random() * W, Math.random() * 500, i % 4 ? "chispa" : "destello")
                    .setBlendMode(ADD).setDepth(0.5).setScale(i % 4 ? 0.12 + Math.random() * 0.2 : 0.25 + Math.random() * 0.15);
                e.fase = Math.random() * 6.28;
                e.vel = 0.8 + Math.random() * 2;
                this.estrellas.push(e);
            }
            this.planetas = [
                this.add.image(1365, 150, "planeta-a").setDepth(1),
                this.add.image(215, 118, "planeta-b").setDepth(1),
                this.add.image(560, 64, "planeta-c").setDepth(1)
            ];
            this.planetas.forEach(function (p) { p.x0 = p.x; p.y0 = p.y; });
            // --- conos de luz desde arriba
            var tintes = [0x3be8ff, 0xff4fd8, 0x8b5cf6, 0x3be8ff];
            this.conos = [300, 640, 960, 1300].map(function (x, k) {
                var c = self.add.image(x, -30, "cono").setOrigin(0.5, 0).setBlendMode(ADD).setDepth(2).setTint(tintes[k]).setAlpha(0.08);
                c.base = (k - 1.5) * 0.12;
                return c;
            });
            // --- estructuras holográficas
            this.torres = [
                this.add.image(455, 566, "torre").setOrigin(0.5, 1).setDepth(3).setScale(0.82),
                this.add.image(1145, 566, "torre").setOrigin(0.5, 1).setDepth(3).setScale(0.82)
            ];
            this.pantalla = this.add.image(1428, 556, "pantalla").setDepth(4.5).setScale(0.62);
            this.plataformas = [
                this.add.image(178, 640, "plataforma").setDepth(4).setScale(0.9),
                this.add.image(1428, 640, "plataforma").setDepth(4).setScale(0.9)
            ];
            this.plataformas.forEach(function (p, k) { p.y0 = p.y; p.fase = k * 2; });
            // --- piso metálico y sus paneles
            this.add.image(W / 2, H / 2, "piso").setDepth(5);
            this.pisoLuz = this.add.graphics().setDepth(6).setBlendMode(ADD);
            var P = D().PISO;
            this.celdas = [];
            for (var f = 0; f < P.filas; f++) {
                for (var c = 0; c < P.columnas; c++) {
                    var q = D().celdaPiso(c, f);
                    this.celdas.push({
                        q: q,
                        cx: (q[0].x + q[1].x + q[2].x + q[3].x) / 4,
                        cy: (q[0].y + q[1].y + q[2].y + q[3].y) / 4,
                        luz: 0,
                        color: (c + f) % 3 === 0 ? 0xff4fd8 : ((c + f) % 3 === 1 ? 0x3be8ff : 0x8b5cf6)
                    });
                }
            }
            this.ondasPiso = [];
            this.tPanel = 0;
            // --- partículas flotantes
            this.flotantes = [];
            for (var k = 0; k < 34; k++) {
                var fl = this.add.image(Math.random() * W, 120 + Math.random() * 640, "chispa").setBlendMode(ADD).setDepth(8)
                    .setScale(0.1 + Math.random() * 0.14).setTint(k % 2 ? 0x7ff3ff : 0xff9ce6).setAlpha(0.6);
                fl.vx = 0;
                fl.vy = -(8 + Math.random() * 18);
                fl.fase = Math.random() * 6.28;
                this.flotantes.push(fl);
            }

            // --- diana holográfica
            this.d = {
                patron: "horizontal-der", u: 0, w: 0, vel: 0, mover: false, R: 120, Robj: 120,
                x: 800, y: 330, extra: {}, visible: false, alfa: 0, escalaExtra: 1, giro: 0, vib: 0,
                empX: 0, empY: 0, impacto: 0, trans: null, fijo: null
            };
            this.reflejo = this.add.image(800, 600, "reflejo").setDepth(7).setBlendMode(ADD).setAlpha(0);
            this.haz = this.add.graphics().setDepth(7.5).setBlendMode(ADD);
            this.flecha = this.add.graphics().setDepth(28).setBlendMode(ADD);
            this.sombraImg = this.add.image(800, 330, "sombra").setDepth(29).setAlpha(0);
            this.sombraAlfa = 0;
            this.sombraHasta = 0;
            this.sombraAlApuntar = false;
            this.sombraAnticipo = 0.7;
            this.dianaHalo = this.add.image(800, 330, "diana-halo").setDepth(30).setBlendMode(ADD).setAlpha(0);
            this.dianaImg = this.add.image(800, 330, "diana").setDepth(31).setAlpha(0);
            this.dianaAro = this.add.image(800, 330, "diana-aro").setDepth(32).setAlpha(0);
            this.orbita = [];
            for (var o = 0; o < 6; o++) {
                this.orbita.push(this.add.image(0, 0, "destello").setDepth(33).setBlendMode(ADD).setScale(0.3).setAlpha(0)
                    .setTint(o % 2 ? 0xff9ce6 : 0x9bf6ff));
            }

            // --- lanzador estelar de Zeus
            // pedestal: plato, cilindro de vidrio con energía y collar; el disco rosa espera apoyado arriba
            this.lzAnilloBase = this.add.image(BASE.x, PISO_LZ, "anillo-cian").setDepth(19).setScale(1.35).setBlendMode(ADD);
            this.lzBase = this.add.image(BASE.x, BASE.y, "lanzador").setOrigin(0.5, 40 / 250).setDepth(20);
            this.lzNucleo = this.add.image(BASE.x, BASE.y + 80, "lanzador-nucleo").setDepth(21).setBlendMode(ADD);
            this.lzDisco = this.add.image(BOCA.x, BOCA.y, "disco-plano").setDepth(22).setScale(0.86);
            this.lzAyuda = this.add.image(BASE.x, PISO_LZ, "anillo-cian").setDepth(18).setBlendMode(ADD).setAlpha(0);
            // esfera de energía (zona de apuntado) y el punto de mira que corre por ella
            this.esfera = this.add.image(BOCA.x, BOCA.y, "esfera-mira").setDepth(24).setBlendMode(ADD).setAlpha(0);
            this.esferaAro = this.add.image(BOCA.x, BOCA.y, "esfera-aro").setDepth(24.1).setBlendMode(ADD).setAlpha(0).setScale(radioMira() / 150);
            this.esferaAlfa = 0;
            this.esferaAviso = 0;
            // discos de repuesto a los lados (decorado)
            this.repuestos = [
                this.add.image(708, 852, "disco-plano-cian").setDepth(23).setScale(0.78),
                this.add.image(898, 858, "disco-plano").setDepth(23).setScale(0.78),
                this.add.image(898, 842, "disco-plano").setDepth(23.1).setScale(0.78)
            ];

            // --- apuntado, disco y efectos
            this.guia = this.add.graphics().setDepth(50);
            this.estela = this.add.graphics().setDepth(39).setBlendMode(ADD);
            this.discoImg = this.add.image(-200, -200, "disco").setDepth(40).setVisible(false);
            this.discoHalo = this.add.image(-200, -200, "chispa").setDepth(39.5).setBlendMode(ADD).setTint(0xff7ae0).setVisible(false);
            this.particulas = new Particulas(this, 170, 60);
            this.ondas = [];
            for (var n = 0; n < 8; n++) {
                var on = this.add.image(-300, -300, "onda").setDepth(58).setBlendMode(ADD).setVisible(false);
                this.ondas.push(on);
            }
            this.iOnda = 0;
            this.destelloPantalla = this.add.rectangle(W / 2, H / 2, W, H, 0xffffff).setDepth(80).setAlpha(0).setBlendMode(ADD);

            // --- final: estrella holográfica y discos en órbita
            this.estrellaHalo = this.add.image(800, 260, "diana-halo").setDepth(33.5).setBlendMode(ADD).setTint(0xffd43b).setAlpha(0);
            this.estrella = this.add.image(800, 260, "estrella-grande").setDepth(34).setAlpha(0).setScale(0.1);
            this.discosFinal = [];
            for (var m = 0; m < 8; m++) {
                this.discosFinal.push(this.add.image(0, 0, "disco").setDepth(25).setAlpha(0).setScale(0.4));
            }
            this.alfaFinal = 0;

            // --- entrada: tocar y arrastrar (un solo puntero)
            this.input.on("pointerdown", this.alPresionar, this);
            this.input.on("pointermove", this.alMover, this);
            this.input.on("pointerup", this.alSoltar, this);
            this.input.on("pointerupoutside", this.alSoltar, this);

            arena = this;
            this.events.once("shutdown", function () { if (arena === self) arena = null; });
            if (espera) {
                var r = espera;
                espera = null;
                r(true);
            }
        }

        // ------------------------------------------------------------ entrada

        alPresionar(p) {
            if (!this.entradaOn || this.vuelo || !this.discoListo) return;
            // solo se apunta empezando dentro de la esfera de energía del disco
            if (Math.hypot(p.worldX - BOCA.x, p.worldY - BOCA.y) > radioMira() * 1.12) {
                this.esferaAviso = 1;
                avisar("fuera");
                return;
            }
            this.apuntando = true;
            this.apunte = { x: p.worldX, y: p.worldY };
            this.ultimoVector = null;
            this.anguloPrevio = null;
            evento("carga");
            avisar("apuntar");
        }

        alMover(p) {
            if (!this.apuntando) return;
            this.apunte = { x: p.worldX, y: p.worldY };
            avisar("mover");
        }

        alSoltar(p) {
            if (!this.apuntando) return;
            if (p && p.worldX != null) this.apunte = { x: p.worldX, y: p.worldY };
            this.apuntando = false;
            var a = this.apunte;
            this.apunte = null;
            if (!a) return;
            var vec = { dx: a.x - BOCA.x, dy: a.y - BOCA.y };
            // si el dedo volvió sobre el disco (sin dirección), vale la última mira válida
            if (!tiroDe(vec.dx, vec.dy).valido && this.ultimoVector) vec = this.ultimoVector;
            this.ultimoVector = null;
            avisar("soltar", { dx: vec.dx, dy: vec.dy, tiro: tiroDe(vec.dx, vec.dy) });
        }

        // ------------------------------------------------------------ diana

        zona() { return R().zona(cfg); }

        posPatron(u) {
            return R().posicion(this.d.patron, u, this.zona(), this.d.extra);
        }

        predecir(seg) {
            var d = this.d;
            if (d.fijo) return { x: d.fijo.x, y: d.fijo.y };
            var vel = d.mover ? 1 : 0;
            return this.posPatron(d.u + d.w * vel * seg);
        }

        actualizarDiana(s) {
            var d = this.d;
            if (d.mover) d.vel = Math.min(1, d.vel + s / 0.8);
            else d.vel = Math.max(0, d.vel - s / 0.35);
            d.u += d.w * d.vel * s;
            d.R += (d.Robj - d.R) * Math.min(1, s * 4);
            var p = this.posPatron(d.u);
            if (d.trans) p = { x: lerp(d.trans.x0, p.x, d.trans.k), y: lerp(d.trans.y0, p.y, d.trans.k) };
            if (d.fijo) p = d.fijo;
            var amort = Math.exp(-5 * s);
            d.empX *= amort;
            d.empY *= amort;
            d.vib *= Math.exp(-4 * s);
            d.impacto *= Math.exp(-2.5 * s);
            d.x = p.x + d.empX;
            d.y = p.y + d.empY;

            var k = d.R / D().RADIO_DIANA * d.escalaExtra;
            var pulso = 1 + 0.025 * Math.sin(this.t * 3.2) + d.impacto * 0.08;
            var fx = Math.max(0.12, Math.abs(Math.cos(d.giro))) * (0.95 + 0.05 * Math.cos(this.t * 0.9));
            var vx = Math.sin(this.t * 70) * d.vib * 7;
            var a = d.alfa;
            this.dianaImg.setPosition(d.x + vx, d.y).setScale(k * pulso * fx, k * pulso).setAlpha(a);
            this.dianaAro.setPosition(d.x + vx, d.y).setScale(k * fx, k).setAlpha(a * 0.9);
            this.dianaAro.rotation += s * (0.5 + d.impacto * 6);
            this.dianaHalo.setPosition(d.x, d.y).setScale(k * (1.15 + 0.05 * Math.sin(this.t * 2.4) + d.impacto * 0.5))
                .setAlpha(a * (0.32 + d.impacto * 0.6));
            for (var i = 0; i < this.orbita.length; i++) {
                var ang = this.t * 1.3 + i * Math.PI / 3;
                this.orbita[i].setPosition(d.x + Math.cos(ang) * d.R * 1.28 * fx, d.y + Math.sin(ang) * d.R * 1.12)
                    .setAlpha(a * (0.45 + 0.45 * Math.sin(this.t * 4 + i)))
                    .setRotation(this.t * 2 + i);
            }
            // reflejo holográfico en el piso y haz que lo une con la diana
            var yRef = 596 + (d.y - 215) * 0.1;
            this.reflejo.setPosition(d.x, yRef).setScale(k * 1.05, k).setAlpha(a * (0.45 + d.impacto * 0.4));
            this.haz.clear();
            if (a > 0.02) {
                for (var h = -1; h <= 1; h++) {
                    this.haz.lineStyle(h ? 2 : 4, 0x7ff3ff, a * (h ? 0.08 : 0.13));
                    this.haz.beginPath();
                    this.haz.moveTo(d.x + h * d.R * 0.45, yRef);
                    this.haz.lineTo(d.x + h * d.R * 0.2, d.y + d.R * 0.75);
                    this.haz.strokePath();
                }
            }
            // sombra fantasma: posición futura aproximada (desaparece de a poco)
            var visible = d.alfa > 0.5 && (this.time.now < this.sombraHasta || (this.sombraAlApuntar && this.apuntando));
            this.sombraAlfa += ((visible ? 0.8 : 0) - this.sombraAlfa) * Math.min(1, s * (visible ? 6 : 1.8));
            this.flecha.clear();
            if (this.sombraAlfa > 0.01) {
                var f = this.predecir(this.sombraAnticipo);
                this.sombraImg.setPosition(f.x, f.y).setScale(d.R / D().RADIO_DIANA).setAlpha(this.sombraAlfa)
                    .setRotation(this.t * 0.4);
                var dx = f.x - d.x, dy = f.y - d.y, dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > d.R * 0.8) {
                    var ux = dx / dist, uy = dy / dist;
                    var x0 = d.x + ux * d.R * 1.05, y0 = d.y + uy * d.R * 1.05;
                    var x1 = f.x - ux * d.R * 1.05, y1 = f.y - uy * d.R * 1.05;
                    var largo = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0));
                    var mov = (this.t * 80) % 26;
                    this.flecha.fillStyle(0x8cffcd, this.sombraAlfa * 0.9);
                    for (var q = mov; q < largo; q += 26) {
                        this.flecha.fillCircle(x0 + ux * q, y0 + uy * q, 5);
                    }
                    // punta de flecha
                    this.flecha.beginPath();
                    this.flecha.moveTo(x1 + ux * 6, y1 + uy * 6);
                    this.flecha.lineTo(x1 - ux * 18 - uy * 12, y1 - uy * 18 + ux * 12);
                    this.flecha.lineTo(x1 - ux * 18 + uy * 12, y1 - uy * 18 - ux * 12);
                    this.flecha.closePath();
                    this.flecha.fillPath();
                }
            } else {
                this.sombraImg.setAlpha(0);
            }
        }

        // ------------------------------------------------------------ lanzador y guía de trayectoria

        actualizarLanzador(s) {
            this.carga = this.apuntando ? Math.min(1, this.carga + s * 2.4) : Math.max(0, this.carga - s * 2);
            this.retro *= Math.exp(-6 * s);
            var tiro = null;
            if (this.apuntando && this.apunte) {
                var vec = { dx: this.apunte.x - BOCA.x, dy: this.apunte.y - BOCA.y };
                tiro = tiroDe(vec.dx, vec.dy);
                if (tiro.valido) this.ultimoVector = vec;
                else if (this.ultimoVector) tiro = tiroDe(this.ultimoVector.dx, this.ultimoVector.dy);
            }
            var fuerza = tiro && tiro.valido ? 1 : 0;
            var bajo = this.retro * 16 - this.saltoL;
            this.lzBase.y = BASE.y + bajo * 0.5;
            var pulso = 0.5 + 0.5 * Math.sin(this.t * (3 + this.carga * 6));
            this.lzAnilloBase.setScale(1.35 + 0.04 * pulso, 1.35 + 0.04 * pulso).setAlpha(0.45 + 0.4 * this.carga);
            // la energía del vidrio sube al cargar
            this.lzNucleo.y = BASE.y + 80 + bajo * 0.5 - this.carga * 30;
            this.lzNucleo.setScale(0.8 + 0.1 * pulso + fuerza * 0.25, 1.1 + 0.15 * pulso + this.carga * 0.4)
                .setAlpha(0.3 + 0.2 * pulso + 0.4 * this.carga);
            // el disco espera apoyado; al cargar se eleva un poco y tiembla
            this.lzDisco.setVisible(this.discoListo && !this.vuelo && !this.enFinal);
            this.lzDisco.y = BOCA.y + bajo * 0.5 - this.carga * 12 - (this.enFinal ? 0 : Math.sin(this.t * 2) * 1.5);
            this.lzDisco.rotation = this.carga > 0.05 ? Math.sin(this.t * 40) * 0.03 * this.carga : 0;
            this.lzDisco.setScale(0.86 + this.carga * 0.06);
            this.repuestos.forEach(function (r, k) { r.y = (k ? (k === 1 ? 858 : 842) : 852) - this.saltoL * 0.4; }, this);
            var ayuda = this.destacado && this.haloAyuda;
            this.lzAyuda.setAlpha(ayuda ? 0.45 + 0.4 * Math.sin(this.t * 5) : 0)
                .setScale(1.6 + 0.15 * Math.sin(this.t * 5), 1.6 + 0.15 * Math.sin(this.t * 5));

            // esfera de energía: suave cuando se puede lanzar, encendida al apuntar, parpadea si tocan fuera
            var puede = this.entradaOn && this.discoListo && !this.vuelo && !this.enFinal;
            var meta = this.apuntando ? 0.95 : (puede ? 0.5 + 0.15 * Math.sin(this.t * 2.5) : 0);
            this.esferaAviso = Math.max(0, this.esferaAviso - s * 1.5);
            meta = Math.max(meta, puede ? this.esferaAviso : 0);
            this.esferaAlfa += (meta - this.esferaAlfa) * Math.min(1, s * 6);
            var late = 1 + 0.02 * Math.sin(this.t * 3) + this.esferaAviso * 0.08 * Math.sin(this.t * 20);
            this.esfera.setPosition(BOCA.x, BOCA.y + bajo * 0.5).setAlpha(this.esferaAlfa).setScale(late);
            this.esferaAro.setPosition(BOCA.x, BOCA.y + bajo * 0.5).setAlpha(this.esferaAlfa)
                .setScale(radioMira() / 150 * late);
            this.esferaAro.rotation += s * (0.7 + this.carga * 3);

            var g = this.guia;
            g.clear();
            if (!this.apuntando || !this.apunte) return;
            var a = this.apunte;
            // el punto de mira queda dentro de la esfera aunque el dedo salga de ella
            var ddx = a.x - BOCA.x, ddy = a.y - BOCA.y, dd = Math.hypot(ddx, ddy);
            var km = dd > radioMira() ? radioMira() / dd : 1;
            var mx = BOCA.x + ddx * km, my = BOCA.y + ddy * km;
            g.lineStyle(5, 0xff7ae0, 0.45);
            g.beginPath();
            g.moveTo(BOCA.x, BOCA.y);
            g.lineTo(mx, my);
            g.strokePath();
            g.fillStyle(0xffffff, 0.95);
            g.fillCircle(mx, my, 11);
            g.lineStyle(4, 0xff4fd8, 0.95);
            g.strokeCircle(mx, my, 15 + 2 * Math.sin(this.t * 8));
            if (!tiro || !tiro.valido) {
                g.lineStyle(4, 0xffffff, 0.5 + 0.3 * Math.sin(this.t * 8));
                g.strokeCircle(BOCA.x, BOCA.y, R().fisica(cfg).arrastreMin + 6);
                return;
            }
            var ang = Math.round(tiro.angulo / 4);
            if (this.anguloPrevio !== null && ang !== this.anguloPrevio) evento("mira");
            this.anguloPrevio = ang;
            // trayectoria punteada desde el disco hasta la mira (más lejos del centro de la esfera = más alto)
            var gF = R().fisica(cfg).g;
            var T = Math.max(0.05, tiro.T);
            var tMax = T, paso = tMax / Math.max(6, Math.round(tiro.distancia / 34));
            var fin = null;
            for (var t = paso; t <= tMax + 0.0001; t += paso) {
                var p = R().punto(BOCA, tiro, gF, t);
                var u = t / tMax;
                var esc = escVuelo(t, T) / 0.6;
                var rad = (8 - u * 3) * esc;
                g.fillStyle(0x3be8ff, 0.35 * (1 - u * 0.6));
                g.fillCircle(p.x, p.y, rad + 4);
                g.fillStyle(0xffffff, 0.95 * (1 - u * 0.55));
                g.fillCircle(p.x, p.y, rad);
                fin = p;
            }
            // mira al final de la línea
            var q = tiro.destino, rm = 18 + 3 * Math.sin(this.t * 6);
            g.lineStyle(4, 0xfff3a6, 0.95);
            g.strokeCircle(q.x, q.y, rm);
            g.beginPath();
            g.moveTo(q.x - rm - 8, q.y); g.lineTo(q.x - rm + 6, q.y);
            g.moveTo(q.x + rm - 6, q.y); g.lineTo(q.x + rm + 8, q.y);
            g.moveTo(q.x, q.y - rm - 8); g.lineTo(q.x, q.y - rm + 6);
            g.moveTo(q.x, q.y + rm - 6); g.lineTo(q.x, q.y + rm + 8);
            g.strokePath();
            void fin;
        }

        // ------------------------------------------------------------ disco en vuelo

        disparar(tiro) {
            var self = this;
            this.apuntando = false;
            this.apunte = null;
            this.guia.clear();
            return new Promise(function (resolve) {
                self.discoListo = false;
                self.retro = 1;
                self.brillo = Math.min(1, self.brillo + 0.55);
                self.ondasPiso.push({ r: 40, a: 1 });
                self.vuelo = {
                    x: BOCA.x, y: BOCA.y, vx: tiro.vx, vy: tiro.vy, t: 0,
                    o: { x: BOCA.x, y: BOCA.y }, tiro: tiro, pasado: false,
                    distancia: tiro.distancia, T: Math.max(0.05, tiro.T),
                    rastro: [], terminado: false, desvanece: 0, resolve: resolve
                };
                self.discoImg.setDepth(40);
                self.discoHalo.setDepth(39.5);
                self.estela.setDepth(39);
                self.particulas.emitir(BOCA.x, BOCA.y - 10, { n: 16, colores: [0xff7ae0, 0x7ff3ff, 0xffffff], vel: 260, grav: 60, vida: 600, escala: 0.45 });
                self.onda(BOCA.x, BOCA.y, 0.25, 0.9, 0xff7ae0, 420);
                evento("lanzar");
                // respaldo: si Phaser no avanza (pestaña oculta), el lanzamiento no se queda colgado
                self.vuelo.respaldo = setTimeout(function () {
                    if (self.vuelo && self.vuelo.resolve === resolve && !self.vuelo.terminado) self.terminarFallo(self.vuelo);
                }, 4000);
            });
        }

        actualizarVuelo(s) {
            var v = this.vuelo;
            this.estela.clear();
            if (!v) {
                this.discoImg.setVisible(false);
                this.discoHalo.setVisible(false);
                return;
            }
            var gF = R().fisica(cfg).g;
            var d = this.d;
            if (!v.terminado) {
                // integración exacta de la parábola: el disco sigue la misma curva que la guía punteada
                var prev = { x: v.x, y: v.y };
                v.x += v.vx * s;
                v.y += v.vy * s + 0.5 * gF * s * s;
                v.vy += gF * s;
                v.t += s;
                // profundidad: el disco llega a la mira (a su distancia del lanzador); si la diana está ahí,
                // se puntúa según qué tan cerca de su centro pasa. Si no, sigue de largo por detrás.
                var r0 = Math.hypot(prev.x - v.o.x, prev.y - v.o.y), r1 = Math.hypot(v.x - v.o.x, v.y - v.o.y);
                if (!v.pasado && r1 >= v.distancia) {
                    var k = r1 > r0 ? limitar((v.distancia - r0) / (r1 - r0), 0, 1) : 1;
                    var pT = { x: prev.x + (v.x - prev.x) * k, y: prev.y + (v.y - prev.y) * k };
                    v.T = v.t - s * (1 - k);
                    if (d.visible && d.alfa > 0.5) {
                        var zona = R().zonaImpacto(cfg, Math.hypot(pT.x - d.x, pT.y - d.y), d.R);
                        if (zona) this.terminarImpacto(v, zona, pT.x, pT.y);
                    }
                    if (!v.terminado) {
                        // no la encontró: sigue de largo por detrás de la diana
                        v.pasado = true;
                        this.discoImg.setDepth(28.5);
                        this.discoHalo.setDepth(28.4);
                        this.estela.setDepth(28.3);
                    }
                }
                if (!v.terminado) {
                    var salio = v.x < -100 || v.x > W + 100 || v.y < -160 || v.y > H + 60;
                    if (salio || (v.pasado && v.t > v.T + 0.7)) this.terminarFallo(v);
                }
                // chispas de la estela
                if (!v.terminado && Math.random() < 0.8) {
                    this.particulas.emitir(v.x, v.y, { n: 1, colores: [0xff7ae0, 0x9bf6ff], vel: 40, grav: 0, vida: 520, escala: 0.32 * escVuelo(v.t, v.T) / 0.6 });
                }
            } else if (v.desvanece > 0) {
                // el fallo sigue su camino y se apaga en el espacio
                v.vy += gF * 0.35 * s;
                v.x += v.vx * s;
                v.y += v.vy * s;
                v.t += s;
                v.desvanece = Math.max(0, v.desvanece - s / 0.7);
                if (v.desvanece <= 0) {
                    this.vuelo = null;
                    this.discoImg.setVisible(false);
                    this.discoHalo.setVisible(false);
                    return;
                }
            }
            if (v.terminado && v.desvanece <= 0) {
                this.discoImg.setVisible(false);
                this.discoHalo.setVisible(false);
                return;
            }
            v.rastro.push({ x: v.x, y: v.y });
            if (v.rastro.length > 18) v.rastro.shift();
            var esc = escVuelo(v.t, v.T);
            var alfa = v.terminado ? v.desvanece : 1;
            for (var i = 0; i < v.rastro.length; i++) {
                var u = (i + 1) / v.rastro.length;
                this.estela.fillStyle(i % 2 ? 0xff7ae0 : 0x7ff3ff, 0.32 * u * alfa);
                this.estela.fillCircle(v.rastro[i].x, v.rastro[i].y, 22 * esc * u + 2);
            }
            this.discoImg.setVisible(true).setPosition(v.x, v.y).setScale(esc).setAlpha(alfa);
            this.discoImg.rotation += s * 16;
            this.discoHalo.setVisible(true).setPosition(v.x, v.y).setScale(esc * 2.6).setAlpha(0.6 * alfa);
        }

        terminarImpacto(v, zona, x, y) {
            var self = this;
            var d = this.d;
            v.terminado = true;
            v.desvanece = 0;
            clearTimeout(v.respaldo);
            this.discoImg.setVisible(false);
            this.discoHalo.setVisible(false);
            this.estela.clear();
            // la diana reacciona físicamente: retrocede en la dirección del golpe
            var vl = Math.sqrt(v.vx * v.vx + v.vy * v.vy) || 1;
            var empuje = zona.id === "centro" ? 34 : (zona.id === "medio" ? 24 : 16);
            d.empX += v.vx / vl * empuje;
            d.empY += v.vy / vl * empuje * 0.6 - 6;
            d.impacto = 1;
            this.brillo = Math.min(1.2, this.brillo + 0.7);
            this.ondasPiso.push({ r: 40, a: 0.8 });
            var k = d.R / D().RADIO_DIANA;
            if (zona.id === "centro") {
                this.particulas.emitir(x, y, { n: 46, colores: [0xffd43b, 0xfff3a6, 0xffffff, 0xffa94d], tipos: ["chispa", "destello"], vel: 520, grav: 220, vida: 1300, escala: 0.65, giro: 8 });
                this.onda(x, y, 0.3, 2.2 * k, 0xffd43b, 700);
                this.onda(x, y, 0.2, 1.5 * k, 0xffffff, 520);
                setTimeout(function () { self.onda(x, y, 0.3, 2.8 * k, 0xff7ae0, 800); }, 140);
                this.anim.agregar(1100, function (u) { d.giro = salida(u) * Math.PI * 4; }).then(function () { d.giro = 0; });
                this.anim.agregar(450, function (u) { self.destelloPantalla.setAlpha(0.32 * (1 - u)); });
                d.vib = 0.6;
            } else if (zona.id === "medio") {
                this.particulas.emitir(x, y, { n: 24, colores: [0x4dabf7, 0x9bf6ff, 0xc77dff, 0xffffff], tipos: ["chispa", "destello"], vel: 380, grav: 180, vida: 1000, escala: 0.5 });
                this.onda(x, y, 0.25, 1.6 * k, 0x4dabf7, 600);
                d.vib = 1;
            } else {
                this.particulas.emitir(x, y, { n: 12, colores: [0x9bf6ff, 0xffffff], vel: 260, grav: 140, vida: 800, escala: 0.4 });
                this.onda(x, y, 0.2, 1.1 * k, 0x9bf6ff, 500);
                d.vib = 0.45;
            }
            this.marcador(x, y - 20, zona.puntos, zona.id);
            evento("impacto", zona.id);
            setTimeout(function () {
                if (self.vuelo === v) self.vuelo = null;
                self.discoListo = true;
                v.resolve({ acierto: true, zona: zona.id, puntos: zona.puntos, x: x, y: y });
            }, 750);
        }

        terminarFallo(v) {
            var self = this;
            if (v.terminado) return;
            v.terminado = true;
            v.desvanece = 1;
            clearTimeout(v.respaldo);
            evento("fallo");
            setTimeout(function () {
                if (self.vuelo === v) self.vuelo = null;
                self.discoListo = true;
                v.resolve({ acierto: false, zona: null, puntos: 0 });
            }, 650);
        }

        onda(x, y, e0, e1, color, ms) {
            var img = this.ondas[this.iOnda];
            this.iOnda = (this.iOnda + 1) % this.ondas.length;
            img.setVisible(true).setPosition(x, y).setTint(color || 0xffffff).setScale(e0).setAlpha(1);
            return this.anim.agregar(ms || 600, function (u) {
                var k = salida(u);
                img.setScale(lerp(e0, e1, k)).setAlpha(1 - u);
                if (u >= 1) img.setVisible(false);
            });
        }

        marcador(x, y, puntos, zona) {
            var colores = { centro: "#ffe066", medio: "#a5d8ff", exterior: "#e3fafc" };
            var txt = this.add.text(x, y, "+" + puntos, {
                fontFamily: "Fredoka, 'Arial Rounded MT Bold', Arial, sans-serif",
                fontSize: zona === "centro" ? "78px" : "62px",
                fontStyle: "bold",
                color: colores[zona] || "#ffffff",
                stroke: "#3b0f6b",
                strokeThickness: 12
            }).setOrigin(0.5).setDepth(70);
            this.anim.agregar(1250, function (u) {
                var pop = u < 0.2 ? salida(u / 0.2) * 1.25 : 1.25 - (u - 0.2) * 0.3;
                txt.setScale(pop).setY(y - salida(u) * 110).setAlpha(u > 0.65 ? 1 - (u - 0.65) / 0.35 : 1);
            }).then(function () { txt.destroy(); });
        }

        // ------------------------------------------------------------ arena viva

        actualizarArena(s) {
            var brillo = Math.max(this.brillo, this.brilloFijo);
            this.brillo *= Math.exp(-1.4 * s);
            for (var i = 0; i < this.estrellas.length; i++) {
                var e = this.estrellas[i];
                e.setAlpha(0.35 + 0.5 * (0.5 + 0.5 * Math.sin(this.t * e.vel + e.fase)));
            }
            this.planetas.forEach(function (p, k) {
                p.x = p.x0 + Math.sin(this.t * 0.05 + k) * 12;
                p.y = p.y0 + Math.cos(this.t * 0.07 + k) * 5;
            }, this);
            this.conos.forEach(function (c, k) {
                c.rotation = c.base + Math.sin(this.t * 0.35 + k * 1.7) * 0.12;
                c.setAlpha(0.06 + 0.035 * Math.sin(this.t * 0.8 + k) + brillo * 0.22);
            }, this);
            this.plataformas.forEach(function (p) { p.y = p.y0 + Math.sin(this.t * 1.1 + p.fase) * 6; }, this);
            // el letrero va apoyado sobre la plataforma derecha y flota con ella
            this.pantalla.y = this.plataformas[1].y - 92;
            this.pantalla.setAlpha(0.85 + 0.15 * Math.sin(this.t * 3.1) * Math.sin(this.t * 1.3));
            // partículas flotantes que se apartan al paso del disco
            var v = this.vuelo && !this.vuelo.terminado ? this.vuelo : null;
            for (var k = 0; k < this.flotantes.length; k++) {
                var f = this.flotantes[k];
                if (v) {
                    var dx = f.x - v.x, dy = f.y - v.y, d2 = dx * dx + dy * dy;
                    if (d2 < 140 * 140 && d2 > 1) {
                        var d = Math.sqrt(d2);
                        f.vx += dx / d * 600 * s;
                        f.vy += dy / d * 600 * s;
                    }
                }
                f.vx *= Math.exp(-1.5 * s);
                f.vy += (-(8 + (k % 5) * 3) - f.vy) * Math.min(1, s * 0.8);
                f.x += (f.vx + Math.sin(this.t * 0.6 + f.fase) * 10) * s;
                f.y += f.vy * s;
                if (f.y < 90) { f.y = 780; f.x = Math.random() * W; }
                if (f.x < -20) f.x = W + 10;
                if (f.x > W + 20) f.x = -10;
                f.setAlpha(0.35 + 0.35 * Math.sin(this.t * 2 + f.fase) + brillo * 0.3);
            }
            // paneles del piso: ondas desde el lanzador y destellos sueltos
            this.tPanel -= s;
            if (this.tPanel <= 0) {
                this.tPanel = this.enFinal ? 0.08 : 0.45;
                var c = this.celdas[Math.floor(Math.random() * this.celdas.length)];
                c.luz = Math.max(c.luz, this.enFinal ? 0.9 : 0.45);
            }
            var g = this.pisoLuz;
            g.clear();
            for (var w = this.ondasPiso.length - 1; w >= 0; w--) {
                var o = this.ondasPiso[w];
                o.r += 820 * s;
                o.a -= s * 0.8;
                if (o.a <= 0 || o.r > 1500) {
                    this.ondasPiso.splice(w, 1);
                    continue;
                }
                g.lineStyle(6, 0x7ff3ff, o.a * 0.55);
                g.strokeEllipse(BASE.x, 812, o.r * 2, o.r * 0.62);
                for (var j = 0; j < this.celdas.length; j++) {
                    var cel = this.celdas[j];
                    var ex = (cel.cx - BASE.x) / o.r, ey = (cel.cy - 812) / (o.r * 0.31);
                    var dd = Math.sqrt(ex * ex + ey * ey);
                    if (Math.abs(dd - 1) < 0.18) cel.luz = Math.max(cel.luz, o.a * 0.85);
                }
            }
            for (var m = 0; m < this.celdas.length; m++) {
                var ce = this.celdas[m];
                if (this.brilloFijo > 0) ce.luz = Math.max(ce.luz, 0.12 + 0.12 * Math.sin(this.t * 3 + m));
                if (ce.luz <= 0.01) continue;
                g.fillStyle(ce.color, ce.luz * 0.42);
                g.beginPath();
                g.moveTo(ce.q[0].x + 3, ce.q[0].y + 2);
                g.lineTo(ce.q[1].x - 3, ce.q[1].y + 2);
                g.lineTo(ce.q[2].x - 3, ce.q[2].y - 2);
                g.lineTo(ce.q[3].x + 3, ce.q[3].y - 2);
                g.closePath();
                g.fillPath();
                ce.luz *= Math.exp(-2.2 * s);
            }
        }

        // ------------------------------------------------------------ final

        actualizarFinal(s) {
            var a = this.alfaFinal;
            if (a <= 0.001 && !this.enFinal) return;
            this.estrella.rotation = Math.sin(this.t * 0.8) * 0.12;
            var late = 1 + 0.05 * Math.sin(this.t * 3);
            this.estrella.setScale(this.escEstrella * late);
            this.estrellaHalo.setScale(this.escEstrella * 1.9 * late).setAlpha(a * 0.7);
            for (var i = 0; i < this.discosFinal.length; i++) {
                var ang = this.t * 0.8 + i * Math.PI / 4;
                var sn = Math.sin(ang);
                this.discosFinal[i].setPosition(800 + Math.cos(ang) * 620, 390 + sn * 130)
                    .setScale(0.32 + 0.2 * (sn + 1) / 2).setDepth(sn > 0 ? 45 : 25).setAlpha(a);
                this.discosFinal[i].rotation += s * 8;
            }
            this.saltoL = this.enFinal ? Math.abs(Math.sin(this.t * 4.5)) * 22 : this.saltoL * Math.exp(-8 * s);
            if (!this.enFinal) return;
            this.tFuego -= s;
            if (this.tFuego <= 0) {
                this.tFuego = 0.55 + Math.random() * 0.4;
                var x = 260 + Math.random() * 1080, y = 110 + Math.random() * 220;
                var paleta = [[0xffd43b, 0xfff3a6], [0xff7ae0, 0xffc9f0], [0x7ff3ff, 0xd0ebff], [0xb197fc, 0xffffff]][Math.floor(Math.random() * 4)];
                this.particulas.emitir(x, y, { n: 30, colores: paleta, tipos: ["chispa", "destello"], vel: 330, grav: 90, vida: 1300, escala: 0.45 });
                this.onda(x, y, 0.1, 0.9, paleta[0], 650);
                evento("fuego");
            }
        }

        update(time, delta) {
            var dt = Math.min(delta, 60);
            var s = dt / 1000;
            this.t += s;
            this.anim.update(dt);
            this.actualizarArena(s);
            this.actualizarDiana(s);
            this.actualizarLanzador(s);
            this.actualizarVuelo(s);
            this.actualizarFinal(s);
            this.particulas.update(dt);
        }
    } : null;

    /** Escala del disco según el tiempo de vuelo: se achica al ir hacia el fondo y más aún si pasa de largo. */
    function escVuelo(t, T) {
        if (t <= T) return 0.6 - 0.24 * (t / T);
        return Math.max(0.16, 0.36 - 0.25 * (t - T) / 0.6);
    }

    // ------------------------------------------------------------------ coordenadas

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

    function radioMira() { return R().fisica(cfg).radioMira; }

    /** Parte del mundo que se ve en pantalla (ENVELOP recorta los lados en tableta 4:3). */
    function rectVisible() {
        var a = aMundo(0, 0), b = aMundo(global.innerWidth || W, global.innerHeight || H);
        return { x0: Math.max(0, a.x), y0: Math.max(0, a.y), x1: Math.min(W, b.x), y1: Math.min(H, b.y) };
    }

    function tiroDe(dx, dy) { return R().lanzamiento(cfg, BOCA, dx, dy, rectVisible()); }

    // ------------------------------------------------------------------ API pública

    var EscenarioTiro = {
        BOCA: BOCA,
        montar: function (contenedor, config) {
            el = contenedor;
            cfg = config;
            if (!Phaser || !el || !D()) return Promise.resolve(false);
            return new Promise(function (resolve) {
                espera = resolve;
                juego = new Phaser.Game({
                    type: Phaser.AUTO,
                    parent: el,
                    transparent: false,
                    backgroundColor: "#0b0a2e",
                    banner: false,
                    scale: { mode: Phaser.Scale.ENVELOP, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
                    input: { activePointers: 1, mouse: true, touch: true },
                    render: { antialias: true },
                    scene: [EscenaArena]
                });
                global.__escenarioTiro = juego;
                setTimeout(function () {
                    if (espera === resolve) {
                        espera = null;
                        resolve(!!arena);
                    }
                }, 8000);
            });
        },
        listo: function () { return !!arena; },
        juego: function () { return juego; },
        al: function (nombre, fn) { if (nombre in cb) cb[nombre] = fn; },
        reacomodar: function () {
            if (!juego) return;
            juego.scale.refresh();
            juego.scale.updateBounds();
        },

        /** Permite (o no) apuntar y lanzar con el dedo o el ratón. */
        entrada: function (on) {
            if (!arena) return;
            arena.entradaOn = !!on;
            if (!on) {
                arena.apuntando = false;
                arena.apunte = null;
            }
        },
        apuntando: function () { return !!(arena && arena.apuntando); },
        cancelarApunte: function () {
            if (!arena) return;
            arena.apuntando = false;
            arena.apunte = null;
        },

        /** Tamaño, velocidad y largo de la guía de la ronda. */
        configurar: function (r) {
            if (!arena) return;
            arena.d.Robj = r.radio;
            if (!arena.d.visible) arena.d.R = r.radio;
            arena.dianaVel = r.velocidad;
            arena.d.w = R().omega(arena.d.patron, r.velocidad, R().zona(cfg));
        },

        /**
         * Nuevo lanzamiento: la diana se desliza suave hasta el inicio del patrón elegido y empieza a moverse.
         * o = { patron, u0, extra }. Devuelve Promise al terminar el deslizamiento.
         */
        nuevoLanzamiento: function (o) {
            if (!arena) return Promise.resolve();
            var a = arena, d = a.d;
            d.fijo = null;
            var antes = { x: d.x, y: d.y };
            var aparecer = !d.visible;
            d.patron = o.patron;
            d.extra = o.extra || {};
            d.u = o.u0 || 0;
            d.w = R().omega(d.patron, a.dianaVel, R().zona(cfg));
            d.vel = 0;
            d.mover = false;
            a.discoListo = true;
            if (aparecer) {
                d.visible = true;
                d.trans = null;
                d.escalaExtra = 0.2;
                evento("aparece");
                return a.anim.agregar(650, function (u) {
                    d.alfa = u;
                    d.escalaExtra = 0.2 + 0.8 * salida(u);
                }).then(function () { d.mover = true; });
            }
            d.trans = { x0: antes.x - d.empX, y0: antes.y - d.empY, k: 0 };
            return a.anim.agregar(700, function (u) { d.trans.k = suave(u); }).then(function () {
                d.trans = null;
                d.mover = true;
            });
        },
        mover: function (on) { if (arena) arena.d.mover = !!on; },
        /** La diana deja de verse (entre partidas). */
        ocultarDiana: function () {
            if (!arena) return Promise.resolve();
            var d = arena.d;
            d.mover = false;
            return arena.anim.agregar(400, function (u) { d.alfa = Math.min(d.alfa, 1 - u); }).then(function () { d.visible = false; });
        },
        /** Sombra fantasma durante ms; alApuntar: también mientras el niño apunta. anticipo en segundos. */
        sombra: function (ms, alApuntar, anticipo) {
            if (!arena) return;
            arena.sombraHasta = arena.time.now + (ms || 0);
            arena.sombraAlApuntar = !!alApuntar;
            if (anticipo) arena.sombraAnticipo = anticipo;
        },
        ocultarSombra: function () {
            if (!arena) return;
            arena.sombraHasta = 0;
            arena.sombraAlApuntar = false;
        },
        disparar: function (tiro) { return arena ? arena.disparar(tiro) : Promise.resolve({ acierto: false, zona: null, puntos: 0 }); },
        enVuelo: function () { return !!(arena && arena.vuelo); },
        predecir: function (seg) { return arena ? arena.predecir(seg) : { x: 800, y: 330 }; },
        estadoDiana: function () {
            if (!arena) return null;
            var d = arena.d;
            return { x: d.x, y: d.y, radio: d.R, patron: d.patron, mover: d.mover, visible: d.visible, sombra: arena.sombraAlfa };
        },
        origen: function () { return { x: BOCA.x, y: BOCA.y }; },
        aPantalla: aPantalla,
        aMundo: aMundo,
        puntoLanzador: function () { return aPantalla(BOCA.x, BOCA.y); },
        /** Tiro que sale con el dedo en (dx, dy) dentro de la esfera (mismo cálculo que el juego). */
        tiroDe: function (dx, dy) { return tiroDe(dx, dy); },
        /** Dedo dentro de la esfera que pone la mira en P (mundo). */
        dedoPara: function (P) { return R().dedoPara(cfg, BOCA, P, rectVisible()); },
        /** Punto de pantalla justo encima de la esfera de energía (para la pista). */
        puntoPista: function () { return aPantalla(BOCA.x, BOCA.y - radioMira() - 14); },
        puntoDiana: function () { return arena ? aPantalla(arena.d.x, arena.d.y) : null; },

        /** Demostración: la mano mueve la mira (en coordenadas del mundo) sin pasar por los callbacks. */
        demoApuntar: function (x, y) {
            if (!arena) return;
            if (!arena.apuntando) evento("carga");
            arena.apuntando = true;
            arena.apunte = { x: x, y: y };
        },
        demoSoltar: function () {
            if (!arena) return;
            arena.apuntando = false;
            arena.apunte = null;
        },

        destacar: function (on) { if (arena) arena.destacado = !!on; },
        haloAyuda: function (on) { if (arena) arena.haloAyuda = !!on; },

        /** Celebración breve de fin de ronda: luces de la arena y ondas en el piso. */
        celebrarRonda: function () {
            if (!arena) return Promise.resolve();
            var a = arena;
            a.brillo = 1.2;
            [0, 260, 520].forEach(function (ms) { setTimeout(function () { a.ondasPiso.push({ r: 40, a: 1 }); }, ms); });
            a.celdas.forEach(function (c) { c.luz = Math.max(c.luz, 0.5 + Math.random() * 0.4); });
            for (var i = 0; i < 3; i++) {
                (function (k) {
                    setTimeout(function () {
                        var x = 420 + k * 380;
                        a.particulas.emitir(x, 220, { n: 24, colores: [0xffd43b, 0xff7ae0, 0x7ff3ff], tipos: ["chispa", "destello"], vel: 300, grav: 100, vida: 1100, escala: 0.45 });
                        a.onda(x, 220, 0.1, 0.9, 0xfff3a6, 600);
                    }, k * 240);
                })(i);
            }
            return esperar(1300);
        },

        /** Escena final: luces al máximo, la diana se transforma en estrella, discos en órbita y fuegos. */
        irFinal: function () {
            if (!arena) return Promise.resolve();
            var a = arena, d = a.d;
            a.enFinal = true;
            a.entradaOn = false;
            a.apuntando = false;
            a.sombraHasta = 0;
            a.sombraAlApuntar = false;
            a.brilloFijo = 0.7;
            a.celdas.forEach(function (c) { c.luz = 1; });
            [0, 200, 400].forEach(function (ms) { setTimeout(function () { a.ondasPiso.push({ r: 40, a: 1 }); }, ms); });
            evento("final-luces");
            var desde = { x: d.x, y: d.y };
            d.mover = false;
            d.fijo = { x: desde.x, y: desde.y };
            a.escEstrella = 0.1;
            evento("final-transforma");
            return a.anim.agregar(1300, function (u) {
                var k = suave(u);
                d.fijo = { x: lerp(desde.x, 800, k), y: lerp(desde.y, 260, k) };
                d.giro = u * Math.PI * 6;
                d.escalaExtra = 1 - 0.6 * u;
            }).then(function () {
                a.particulas.emitir(800, 260, { n: 50, colores: [0xffd43b, 0xfff3a6, 0xffffff, 0xff7ae0], tipos: ["chispa", "destello"], vel: 520, grav: 120, vida: 1400, escala: 0.6 });
                a.onda(800, 260, 0.3, 3, 0xffd43b, 800);
                a.anim.agregar(450, function (u) { a.destelloPantalla.setAlpha(0.4 * (1 - u)); });
                evento("final-estrella");
                return a.anim.agregar(800, function (u) {
                    d.alfa = 1 - u;
                    a.alfaFinal = u;
                    a.estrella.setAlpha(u);
                    a.escEstrella = 0.1 + 0.75 * salida(u);
                });
            }).then(function () {
                d.visible = false;
                d.giro = 0;
                evento("final-fiesta");
                return esperar(1200);
            });
        },
        detenerFinal: function () {
            if (!arena) return;
            var a = arena, d = a.d;
            a.enFinal = false;
            a.brilloFijo = 0;
            a.alfaFinal = 0;
            a.estrella.setAlpha(0);
            a.estrellaHalo.setAlpha(0);
            a.discosFinal.forEach(function (x) { x.setAlpha(0); });
            a.particulas.apagar();
            d.fijo = null;
            d.giro = 0;
            d.escalaExtra = 1;
            d.alfa = 0;
            d.visible = false;
            d.mover = false;
        },
        enFinal: function () { return !!(arena && arena.enFinal); },
        /** Deja la arena como al empezar: sin disco en vuelo, sin diana visible. */
        reiniciar: function () {
            if (!arena) return;
            var a = arena;
            EscenarioTiro.detenerFinal();
            if (a.vuelo) {
                clearTimeout(a.vuelo.respaldo);
                a.vuelo = null;
            }
            a.discoListo = true;
            a.apuntando = false;
            a.apunte = null;
            a.sombraHasta = 0;
            a.sombraAlApuntar = false;
            a.destacado = false;
            a.d.empX = a.d.empY = 0;
            a.ondasPiso = [];
        },

        /** Caja en pantalla para Zoe 3D (abajo a la izquierda, sobre la plataforma). */
        zonaZoe: function () {
            if (!el) return null;
            var r = el.getBoundingClientRect();
            var h = Math.min(r.height * 0.5, 430);
            var w = h * 0.62;
            return { left: r.left + Math.max(12, r.width * 0.035), top: r.bottom - h - r.height * 0.05, width: w, height: h };
        }
    };

    global.EscenarioTiro = EscenarioTiro;
})(window);
