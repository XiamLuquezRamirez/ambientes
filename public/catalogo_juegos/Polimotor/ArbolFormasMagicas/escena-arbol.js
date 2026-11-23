/**
 * EscenarioArbol — escena Phaser 4 de "El Árbol de las Formas Mágicas" (window.EscenarioArbol).
 *
 * Dibuja el claro del bosque, el árbol con cara, los tres moldes del tronco y los tres frutos,
 * y maneja el arrastre real con mouse y touch. No decide aciertos: al soltar avisa con las
 * distancias a cada molde (evento "soltar") y script.js pregunta a ReglasArbol qué hacer.
 *
 * Mundo de diseño 1600 × 900 con Scale.ENVELOP: llena la pantalla y lo jugable queda entre
 * x 230 y 1370, que cabe en 4:3 (1024 × 768) sin tocar los botones de las esquinas.
 * Cada animación que el flujo espera es una Promise con respaldo por tiempo (Animador).
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser;
    var W = 1600, H = 900;
    var ELEVA = 1.16;            // cuánto crece el fruto al tomarlo

    // Lugares donde reposan los frutos (centro del cuerpo): dos en las ramas, dos en el pasto
    // y dos colgando de la copa (estos solo con 4 o 5 frutos).
    var LUGARES = [
        { x: 342, y: 455 },
        { x: 1258, y: 455 },
        { x: 478, y: 732 },
        { x: 1122, y: 732 },
        { x: 500, y: 235 },
        { x: 1100, y: 235 }
    ];

    /**
     * Cómo se reparten los moldes en el tronco según cuántos frutos tiene el nivel.
     * escala: tamaño de frutos y moldes (siempre el mismo para los dos, para que encajen).
     * lugares: cuántos de LUGARES se usan (hay más lugares que frutos: el reparto cambia).
     */
    var DISPOSICIONES = {
        3: {
            escala: 1.1, lugares: 4,
            moldes: { circulo: { x: 680, y: 612 }, triangulo: { x: 920, y: 612 }, cuadrado: { x: 800, y: 770 } }
        },
        4: {
            escala: 1.0, lugares: 6,
            moldes: { circulo: { x: 690, y: 602 }, triangulo: { x: 910, y: 602 }, corazon: { x: 690, y: 772 }, cuadrado: { x: 910, y: 772 } }
        },
        5: {
            escala: 0.92, lugares: 6,
            moldes: {
                circulo: { x: 700, y: 606 }, triangulo: { x: 900, y: 606 },
                corazon: { x: 648, y: 772 }, estrella: { x: 800, y: 770 }, cuadrado: { x: 952, y: 772 }
            }
        }
    };
    var ORBES = {
        circulo: { x: 655, y: 232 }, cuadrado: { x: 800, y: 150 }, triangulo: { x: 945, y: 232 },
        corazon: { x: 690, y: 110 }, estrella: { x: 910, y: 110 }
    };
    var COLOR = { circulo: 0xff6b6b, cuadrado: 0xb197fc, triangulo: 0xa9e34b, corazon: 0xff8fab, estrella: 0xffd43b };
    var CARA = { x: 800, ojosY: 448, sep: 62, bocaY: 500 };

    var D = function () { return global.DibujosArbol; };
    var R = function () { return global.ReglasArbol; };

    var juego = null, escena = null, el = null, cfg = null, espera = null;
    var cb = { tomar: null, arrastrar: null, soltar: null, cerca: null };

    function avisar(nombre, a) {
        var f = cb[nombre];
        if (typeof f === "function") {
            try { f(a); } catch (e) { console.warn("[EscenarioArbol]", nombre, e); }
        }
    }

    function suave(u) { return u * u * (3 - 2 * u); }
    function saleSuave(u) { return 1 - Math.pow(1 - u, 3); }
    function lerp(a, b, u) { return a + (b - a) * u; }
    function rebote(u) {
        // sube por encima de 1 y se asienta: el "pop" del encaje
        var c1 = 1.70158 * 1.4, c3 = c1 + 1;
        return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
    }
    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    // ------------------------------------------------------------------ animador con delta time y respaldo

    function Animador() { this.lista = []; }

    Animador.prototype.agregar = function (dur, fn) {
        var self = this;
        return new Promise(function (resolve) {
            var a = { t: 0, dur: Math.max(1, dur), fn: fn, resolve: resolve, hecho: false };
            // con la pestaña oculta los frames no corren: el respaldo cierra la animación igual
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
            if (u >= 1) { this.fin(a); continue; }
            try { a.fn(u); } catch (e) { /* noop */ }
            vivos.push(a);
        }
        this.lista = vivos;
    };

    Animador.prototype.limpiar = function () {
        var l = this.lista;
        this.lista = [];
        l.forEach(function (a) { this.fin(a); }, this);
    };

    // ------------------------------------------------------------------ partículas (reserva fija, sin acumular)

    function Particulas(scene, n, prof) {
        this.lista = [];
        for (var i = 0; i < n; i++) {
            var img = scene.add.image(-100, -100, "chispa").setVisible(false).setDepth(prof || 60);
            this.lista.push({ img: img, vivo: false, t: 0 });
        }
        this.i = 0;
    }

    Particulas.prototype.emitir = function (x, y, o) {
        var tipos = o.tipos || ["estrella"];
        for (var k = 0; k < (o.n || 8); k++) {
            var p = this.lista[this.i];
            this.i = (this.i + 1) % this.lista.length;
            var ang = o.angulo != null ? o.angulo + (Math.random() - 0.5) * (o.apertura || 1) : Math.random() * Math.PI * 2;
            var v = (o.vel || 260) * (0.5 + Math.random() * 0.7);
            var tx = tipos[Math.floor(Math.random() * tipos.length)];
            p.vivo = true;
            p.t = 0;
            p.vida = (o.vida || 1100) * (0.7 + Math.random() * 0.5);
            p.vx = Math.cos(ang) * v;
            p.vy = Math.sin(ang) * v;
            p.grav = o.grav != null ? o.grav : 320;
            p.giro = (Math.random() - 0.5) * (o.giro || 6);
            p.esc = (o.escala || 0.6) * (0.7 + Math.random() * 0.6) / D().res(tx);
            p.aleteo = !!o.aleteo;
            p.fase = Math.random() * 6;
            p.img.setTexture(tx);
            p.img.setBlendMode(o.sumar ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
            p.img.setTint(o.tintes ? o.tintes[Math.floor(Math.random() * o.tintes.length)] : 0xffffff);
            p.img.setPosition(x + (Math.random() - 0.5) * (o.dispersion || 20), y + (Math.random() - 0.5) * (o.dispersion || 20));
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
            if (u >= 1) { p.vivo = false; p.img.setVisible(false); continue; }
            p.vy += p.grav * s;
            if (p.aleteo) { p.vx *= 0.985; p.vy = Math.min(p.vy, 170); }
            p.img.x += p.vx * s;
            p.img.y += p.vy * s;
            p.img.rotation += p.giro * s;
            p.img.setAlpha(u < 0.75 ? 1 : 1 - (u - 0.75) / 0.25);
            var e = p.esc * (u < 0.12 ? 0.4 + u * 5 : 1);
            p.img.setScale(p.aleteo ? e * Math.cos(p.t * 0.012 + p.fase) : e, e);
        }
    };

    Particulas.prototype.apagar = function () {
        this.lista.forEach(function (p) { p.vivo = false; p.img.setVisible(false); });
    };

    // ------------------------------------------------------------------ escena

    function posiciones(disp) {
        return Object.keys(disp.moldes).map(function (k) { return disp.moldes[k]; });
    }

    function disposicion(n) {
        return DISPOSICIONES[n] || DISPOSICIONES[Math.max(3, Math.min(5, n | 0))] || DISPOSICIONES[3];
    }

    function tex(scene, key) {
        if (!scene.textures.exists(key) && D().lienzo(key)) scene.textures.addCanvas(key, D().lienzo(key));
    }

    /** Imagen a su tamaño de diseño: compensa la resolución a la que se rasterizó el SVG. */
    function img(scene, x, y, key, k) {
        var i = scene.add.image(x, y, key);
        i.base = (k || 1) / D().res(key);
        i.setScale(i.base);
        return i;
    }

    var EscenaArbol = Phaser ? class extends Phaser.Scene {
        constructor() { super({ key: "Arbol" }); }

        create() {
            var self = this;
            D().claves().forEach(function (k) { tex(self, k); });
            this.anim = new Animador();
            this.t = 0;
            this.arrastreOn = false;
            this.arrastrando = null;
            this.puntero = null;
            this.magia = 0;          // 0..1: cuánto brilla el árbol (sube con cada fruto y en la fiesta)
            this.fiesta = false;
            this.ayuda = null;
            this.disp = DISPOSICIONES[3];
            this.escala = this.disp.escala;
            this.radios = R().radios(posiciones(this.disp), (cfg && cfg.juego) || {});

            // bosque de fondo por capas (bosque.js): profundidad, luz por nivel y reacciones al juego
            this.bosque = global.FondoBosque ? new global.FondoBosque(this, Phaser) : null;
            this.crearDecoracion();

            // árbol: tronco (con ramas y raíces), cara, moldes, copa
            this.tronco = img(this, 250, 300, "tronco").setOrigin(0, 0).setDepth(2);
            this.cara = this.add.graphics().setDepth(3);
            this.caraEstado = { modo: "normal", hasta: 0, parpadeo: 0, proximo: 2500, mira: { x: CARA.x, y: 700 }, ojo: { x: 0, y: 0 } };
            this.crearMoldes();
            this.copaAtras = img(this, 800, 412, "copa-atras").setOrigin(0.5, 1).setDepth(5);
            this.orbes = {};
            Object.keys(ORBES).forEach(function (f) {
                var o = ORBES[f];
                var halo = img(self, o.x, o.y, "luz", 0.42).setDepth(5.4).setBlendMode(Phaser.BlendModes.ADD).setTint(COLOR[f]).setAlpha(0.25);
                var nucleo = img(self, o.x, o.y, "chispa", 0.9).setDepth(5.5).setBlendMode(Phaser.BlendModes.ADD).setTint(COLOR[f]).setAlpha(0.35);
                self.orbes[f] = { halo: halo, nucleo: nucleo, on: 0, fase: Math.random() * 6 };
            });
            this.copaFrente = img(this, 800, 380, "copa-frente").setOrigin(0.5, 1).setDepth(6);
            this.copaBrillo = img(this, 800, 250, "luz", 4.2).setDepth(6.5).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff0a8).setAlpha(0);
            this.arbolBrillo = img(this, 800, 560, "luz", 2.6).setDepth(2.5).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffe9a8).setAlpha(0);

            this.crearFrutos();
            this.guia = this.add.graphics().setDepth(45);
            this.particulas = new Particulas(this, 70, 60);
            this.confeti = new Particulas(this, 80, 62);
            this.crearAmbiente();
            if (this.bosque) {
                this.bosque.alAbrirFlor = function (x, y) {
                    self.particulas.emitir(x, y, { n: 3, tipos: ["destello", "chispa"], vel: 70, grav: -30, vida: 650, escala: 0.38, dispersion: 14, sumar: true, tintes: [0xfff3a0, 0xffffff] });
                };
            }

            this.input.on("dragstart", this.alEmpezar, this);
            this.input.on("drag", this.alMover, this);
            this.input.on("dragend", this.alSoltar, this);
            this.events.once("shutdown", function () {
                self.input.off("dragstart", self.alEmpezar, self);
                self.input.off("drag", self.alMover, self);
                self.input.off("dragend", self.alSoltar, self);
                self.anim.limpiar();
                escena = null;
            });

            escena = this;
            if (espera) { var r = espera; espera = null; r(true); }
        }

        // ---------------------------------------------------------------- decoración y ambiente

        crearDecoracion() {
            var self = this;
            this.decor = [];
            var poner = function (k, x, y, esc, prof) {
                var d = img(self, x, y, k, esc).setOrigin(0.5, 1).setDepth(prof || 1);
                d.fase = Math.random() * 6;
                self.decor.push(d);
                return d;
            };
            poner("arbusto", 110, 690, 1.15);
            poner("arbusto", 1500, 680, 1.05);
            poner("letrero", 1440, 700, 0.62);
            poner("flor-0", 230, 860, 0.9, 7);
            poner("flor-1", 560, 880, 0.85, 7);
            poner("flor-3", 1040, 885, 0.85, 7);
            poner("flor-2", 1370, 860, 0.9, 7);
            poner("flor-1", 140, 780, 0.7, 1.5);
            poner("flor-3", 1470, 790, 0.7, 1.5);
            poner("flor-2", 600, 680, 0.6, 1.5);
            poner("flor-0", 1010, 672, 0.6, 1.5);
        }

        crearAmbiente() {
            var self = this;
            this.rayos = [0, 1, 2].map(function (k) {
                var r = img(self, 150 + k * 240, -40, "rayo", 1).setOrigin(0.5, 0).setDepth(30).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff3bf);
                r.rotation = -0.32;
                r.alfa = 0.22 - k * 0.04;
                r.setAlpha(r.alfa);
                return r;
            });
            this.luciernagas = [];
            for (var i = 0; i < 16; i++) {
                var l = img(this, 0, 0, "chispa", 0.55).setDepth(40).setBlendMode(Phaser.BlendModes.ADD).setTint(i % 3 ? 0xfff3a0 : 0xc0f7ff);
                l.cx = 300 + Math.random() * 1000;
                l.cy = 80 + Math.random() * 560;
                l.fase = Math.random() * 10;
                l.vel = 0.25 + Math.random() * 0.35;
                this.luciernagas.push(l);
            }
            this.hojas = [];
            for (var h = 0; h < 6; h++) {
                var hj = img(this, 0, 0, "hoja", 0.9).setDepth(41).setTint([0x69db7c, 0x40c057, 0xa9e34b, 0xffd43b][h % 4]);
                this.reiniciarHoja(hj, true);
                this.hojas.push(hj);
            }
            this.mariposas = [0, 1].map(function (k) {
                var m = img(self, 0, 0, "mariposa-" + k, 0.7).setDepth(42);
                m.fase = k * 3.1;
                return m;
            });
        }

        reiniciarHoja(h, inicio) {
            h.x = 380 + Math.random() * 840;
            h.y = inicio ? 120 + Math.random() * 600 : 150 + Math.random() * 180;
            h.vy = 34 + Math.random() * 30;
            h.fase = Math.random() * 6;
            h.setAlpha(0.9);
        }

        animarAmbiente(dt, ts) {
            var s = dt / 1000;
            var viento = Math.sin(ts * 0.6);
            this.copaAtras.rotation = viento * 0.006;
            this.copaFrente.rotation = Math.sin(ts * 0.6 + 0.8) * 0.009;
            this.copaFrente.x = 800 + Math.sin(ts * 0.5) * 3;
            this.decor.forEach(function (d) { d.rotation = Math.sin(ts * 1.3 + d.fase) * 0.035; });
            var tinteRayos = this.bosque ? this.bosque.tinteRayos() : 0xfff3bf;
            this.rayos.forEach(function (r, i) { r.setTint(tinteRayos).setAlpha(r.alfa * (0.7 + 0.3 * Math.sin(ts * 0.5 + i * 2))); });
            var extra = this.magia;
            this.luciernagas.forEach(function (l) {
                var t = ts * l.vel + l.fase;
                l.x = l.cx + Math.sin(t) * 60 + Math.sin(t * 2.3) * 18;
                l.y = l.cy + Math.cos(t * 0.8) * 40;
                l.setAlpha((0.35 + 0.65 * Math.max(0, Math.sin(t * 2.4))) * (0.55 + extra * 0.45));
            });
            var self = this;
            this.hojas.forEach(function (h) {
                h.y += h.vy * s;
                h.x += Math.sin(ts * 1.4 + h.fase) * 26 * s;
                h.rotation = Math.sin(ts * 2 + h.fase) * 0.9;
                if (h.y > 880) self.reiniciarHoja(h, false);
            });
            this.mariposas.forEach(function (m, k) {
                var t = ts * 0.32 + m.fase;
                var cxm = k ? 1320 : 260;
                m.x = cxm + Math.sin(t) * 120;
                m.y = 300 + Math.sin(t * 1.7) * 90 + (k ? 60 : 0);
                var aleteo = Math.abs(Math.cos(ts * 11 + k));
                m.setScale(m.base * (0.25 + 0.75 * aleteo), m.base);
                m.rotation = Math.cos(t) * 0.25;
            });
            // brillo general del árbol
            this.arbolBrillo.setAlpha(this.magia * 0.22 + (this.fiesta ? 0.12 * (1 + Math.sin(ts * 4)) : 0));
            this.copaBrillo.setAlpha(this.magia * 0.16 + (this.fiesta ? 0.14 * (1 + Math.sin(ts * 3.2)) : 0));
            Object.keys(this.orbes).forEach(function (f) {
                var o = self.orbes[f];
                var pulso = 0.5 + 0.5 * Math.sin(ts * 3 + o.fase);
                o.halo.setAlpha(0.18 + o.on * (0.55 + 0.3 * pulso));
                o.halo.setScale(o.halo.base * (1 + o.on * (0.5 + 0.15 * pulso)));
                o.nucleo.setAlpha(0.3 + o.on * 0.7);
                o.nucleo.setScale(o.nucleo.base * (1 + o.on * 0.6 * pulso));
            });
        }

        // ---------------------------------------------------------------- moldes

        crearMoldes() {
            var self = this;
            this.moldes = {};
            // un molde por cada forma dibujada; cada nivel muestra y coloca los suyos (cargar)
            D().formas.forEach(function (f) {
                var brillo = img(self, 0, 0, "brillo-" + f, 1.05).setDepth(3.9).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffe066).setAlpha(0);
                var base = img(self, 0, 0, "molde-" + f, 1).setDepth(4);
                var borde = img(self, 0, 0, "borde-" + f, 1).setDepth(11).setAlpha(0);
                self.moldes[f] = { forma: f, x: 0, y: 0, base: base, brillo: brillo, borde: borde, activo: false, ocupado: null, cerca: 0, cercaObj: 0, tiembla: 0, ayuda: 0, chispaT: 0 };
            });
        }

        /** Coloca y escala los moldes del nivel; los demás se esconden. */
        ponerMoldes(disp) {
            var self = this;
            var e = disp.escala;
            Object.keys(this.moldes).forEach(function (f) {
                var m = self.moldes[f];
                var p = disp.moldes[f];
                m.activo = !!p;
                m.ocupado = null; m.cerca = 0; m.cercaObj = 0; m.ayuda = 0; m.tiembla = 0;
                [m.base, m.brillo, m.borde].forEach(function (i) { i.setVisible(m.activo); });
                if (!p) return;
                m.x = p.x; m.y = p.y;
                m.base.base = e / D().res("molde-" + f);
                m.brillo.base = e * 1.05 / D().res("brillo-" + f);
                m.borde.base = e / D().res("borde-" + f);
                [m.base, m.brillo, m.borde].forEach(function (i) { i.setPosition(p.x, p.y).setScale(i.base); });
                m.borde.setAlpha(0);
            });
        }

        moldesActivos() {
            var self = this;
            return Object.keys(this.moldes).filter(function (k) { return self.moldes[k].activo; });
        }

        animarMoldes(dt, ts) {
            var self = this;
            this.moldesActivos().forEach(function (f) {
                var m = self.moldes[f];
                m.cerca += (m.cercaObj - m.cerca) * Math.min(1, dt / 90);
                var pulso = 0.5 + 0.5 * Math.sin(ts * 7);
                var lleno = m.ocupado ? 1 : 0;
                // vacío: respira tenue · cerca: resplandece y late · ayuda: dos destellos · lleno: dorado quieto
                var a = lleno ? 0.32 + 0.12 * Math.sin(ts * 2.2) : 0.06 + 0.05 * Math.sin(ts * 1.6 + m.x);
                a = Math.max(a, m.cerca * (0.55 + 0.4 * pulso), m.ayuda * (0.35 + 0.55 * pulso));
                m.brillo.setAlpha(Math.min(1, a));
                m.brillo.setTint(lleno ? 0xffd43b : 0xfff3a0);
                var e = 1 + m.cerca * 0.06 * pulso + m.ayuda * 0.04 * pulso;
                m.base.setScale(m.base.base * e);
                m.brillo.setScale(m.brillo.base * (e + m.cerca * 0.08));
                if (m.tiembla > 0) {
                    m.tiembla = Math.max(0, m.tiembla - dt);
                    var k = m.tiembla / 420;
                    m.base.rotation = Math.sin(m.tiembla * 0.06) * 0.09 * k;
                } else {
                    m.base.rotation = 0;
                }
                if (m.cerca > 0.35 && !m.ocupado) {
                    m.chispaT -= dt;
                    if (m.chispaT <= 0) {
                        m.chispaT = 170;
                        self.particulas.emitir(m.x, m.y, { n: 2, tipos: ["destello", "chispa"], vel: 90, grav: -40, vida: 700, escala: 0.45, dispersion: 120, sumar: true, tintes: [0xfff3a0, 0xffffff] });
                    }
                }
            });
        }

        // ---------------------------------------------------------------- frutos

        crearFrutos() {
            var self = this;
            var fs = (cfg && cfg.frutos) || [];
            var kFruto = D().res("fruto-circulo");
            this.nidos = LUGARES.map(function (l) {
                var n = img(self, l.x, l.y + 50, "nido", 0.95).setDepth(7);
                n.fase = Math.random() * 6;
                return n;
            });
            this.frutos = fs.map(function (def, i) {
                var forma = def.forma;
                var sombra = img(self, 0, 0, "sombra", 0.8).setDepth(8).setAlpha(0);
                var aura = img(self, 0, 0, "luz", 0.95).setDepth(9).setBlendMode(Phaser.BlendModes.ADD).setTint(COLOR[forma]).setAlpha(0);
                var im = img(self, 0, 0, "fruto-" + forma, 1.1).setDepth(10);
                im.setOrigin(D().FRUTO.cx / D().FRUTO.w, D().FRUTO.cy / D().FRUTO.h);
                // zona de toque generosa: ~100 px de diseño con la escala grande, proporcional en las otras
                var radioToque = 100 * kFruto / 1.1;
                im.setInteractive({
                    hitArea: new Phaser.Geom.Circle(D().FRUTO.cx * kFruto, D().FRUTO.cy * kFruto, radioToque),
                    hitAreaCallback: Phaser.Geom.Circle.Contains,
                    draggable: true,
                    useHandCursor: true
                });
                var cinta = img(self, 0, 0, "cinta-" + forma, 0.78).setDepth(8.5);
                var texto = self.add.text(0, 0, def.nombre || "", {
                    fontFamily: "Fredoka, 'Arial Rounded MT Bold', Arial, sans-serif",
                    fontSize: "23px",
                    fontStyle: "bold",
                    color: "#ffffff",
                    stroke: "#3b2414",
                    strokeThickness: 5,
                    resolution: 2
                }).setOrigin(0.5, 0.56).setDepth(8.6);
                var f = {
                    id: def.id, forma: forma, def: def, img: im, sombra: sombra, aura: aura, cinta: cinta, texto: texto,
                    lugar: i % LUGARES.length, activo: true, estado: "lugar", fase: i * 2.1, k: 1, salto: 0, objetivo: null, offset: { x: 0, y: 0 }
                };
                im.setData("fruto", f);
                return f;
            });
        }

        colocarEnLugar(f) {
            var l = LUGARES[f.lugar];
            var e = this.escala;
            f.img.base = e / D().res("fruto-" + f.forma);
            f.estado = f.activo ? "lugar" : "fuera";
            f.k = 1;
            f.salto = 0;
            f.img.setPosition(l.x, l.y).setDepth(10).setRotation(0).setVisible(f.activo);
            f.img.setScale(f.img.base);
            f.sombra.setPosition(l.x, l.y + 72).setAlpha(0).setVisible(f.activo);
            f.aura.setAlpha(0).setVisible(f.activo);
            var yCinta = l.y + 52 + 55 * e;
            f.cinta.setPosition(l.x, yCinta).setAlpha(1).setVisible(f.activo);
            f.texto.setPosition(l.x, yCinta).setAlpha(1).setVisible(f.activo);
            if (f.img.input) f.img.input.enabled = f.activo;
        }

        /**
         * Prepara un nivel. formas: las formas del nivel (sus frutos y sus moldes).
         * reparto: { idFruto: índice de lugar } dentro de los lugares de la disposición.
         */
        cargar(formas, reparto) {
            var lista = formas && formas.length ? formas : this.frutos.map(function (f) { return f.forma; });
            this.disp = disposicion(lista.length);
            this.escala = this.disp.escala;
            this.radios = R().radios(posiciones(this.disp), (cfg && cfg.juego) || {});
            var e = this.escala, nLug = this.disp.lugares;
            this.nidos.forEach(function (n, i) {
                var l = LUGARES[i];
                n.setVisible(i < nLug).setPosition(l.x, l.y + 50 * e / 1.1);
                n.setScale(n.base * e / 1.1);
            });
            this.frutos.forEach(function (f) { f.activo = lista.indexOf(f.forma) >= 0; });
            if (this.bosque) {
                this.bosque.reiniciar();
                this.bosque.ponerHora(lista.length - 3);   // 3 frutos: mañana · 4: mediodía · 5: atardecer
            }
            this.ponerMoldes(this.disp);
            var self = this;
            Object.keys(this.orbes).forEach(function (k) {
                var o = self.orbes[k];
                var ver = lista.indexOf(k) >= 0;
                o.halo.setVisible(ver);
                o.nucleo.setVisible(ver);
            });
            this.reiniciar(reparto);
        }

        reiniciar(reparto) {
            var self = this;
            this.anim.limpiar();
            this.arrastrando = null;
            this.puntero = null;
            this.fiesta = false;
            this.magia = 0;
            this.guia.clear();
            this.ayuda = null;
            this.particulas.apagar();
            this.confeti.apagar();
            Object.keys(this.moldes).forEach(function (k) {
                var m = self.moldes[k];
                m.ocupado = null; m.cerca = 0; m.cercaObj = 0; m.ayuda = 0; m.tiembla = 0;
                m.borde.setAlpha(0);
            });
            Object.keys(this.orbes).forEach(function (k) { self.orbes[k].on = 0; });
            this.frutos.forEach(function (f) {
                if (reparto && reparto[f.id] != null) f.lugar = reparto[f.id];
                self.colocarEnLugar(f);
            });
            this.frutos.forEach(function (f) { f.img.setDepth(10); });
            this.ponerCara("normal", 0);
        }

        fruto(id) { return this.frutos.filter(function (f) { return f.id === id; })[0] || null; }

        // ---------------------------------------------------------------- arrastre

        limitesVisibles() {
            var c = juego && juego.canvas;
            var r = c ? c.getBoundingClientRect() : null;
            var p = el ? el.getBoundingClientRect() : null;
            if (!r || !p || !r.width) return { x0: 0, y0: 0, x1: W, y1: H };
            return {
                x0: Math.max(0, (p.left - r.left) * W / r.width),
                y0: Math.max(0, (p.top - r.top) * H / r.height),
                x1: Math.min(W, (p.right - r.left) * W / r.width),
                y1: Math.min(H, (p.bottom - r.top) * H / r.height)
            };
        }

        alEmpezar(p, obj) {
            var f = obj.getData("fruto");
            if (!f || !this.arrastreOn || f.estado !== "lugar" || this.arrastrando) return;
            this.limpiarAyuda();
            this.tomar(f, p.worldX, p.worldY);
            this.puntero = p;
            avisar("tomar", f.id);
        }

        tomar(f, px, py) {
            f.estado = "arrastrando";
            this.arrastrando = f;
            this.limites = this.limitesVisibles();
            f.img.setDepth(50);
            f.aura.setDepth(49);
            f.sombra.setDepth(48);
            // el fruto queda un poco por encima del dedo, para que se vea mientras se arrastra
            f.offset = { x: f.img.x - px, y: f.img.y - py };
            f.objetivo = { x: f.img.x, y: f.img.y };
            var k0 = f.k;
            this.anim.agregar(150, function (u) { f.k = lerp(k0, ELEVA, saleSuave(u)); });
            f.cinta.setAlpha(0.45);
            f.texto.setAlpha(0.45);
            this.particulas.emitir(f.img.x, f.img.y, { n: 6, tipos: ["destello", "chispa"], vel: 160, grav: 0, vida: 520, escala: 0.4, dispersion: 40, sumar: true, tintes: [COLOR[f.forma], 0xffffff] });
        }

        alMover(p, obj) {
            var f = obj.getData("fruto");
            if (!f || f !== this.arrastrando) return;
            this.apuntar(f, p.worldX, p.worldY);
            avisar("arrastrar", f.id);
        }

        apuntar(f, px, py) {
            var L = this.limites || { x0: 0, y0: 0, x1: W, y1: H };
            f.objetivo = {
                x: Math.max(L.x0 + 60, Math.min(L.x1 - 60, px + f.offset.x)),
                y: Math.max(L.y0 + 70, Math.min(L.y1 - 60, py + f.offset.y))
            };
        }

        alSoltar(p, obj) {
            var f = obj.getData("fruto");
            if (!f || f !== this.arrastrando) return;
            this.soltar(f);
        }

        soltar(f) {
            this.arrastrando = null;
            this.puntero = null;
            if (f.objetivo) f.img.setPosition(f.objetivo.x, f.objetivo.y);
            f.estado = "soltado";
            this.apagarCercania();
            var datos = { id: f.id, forma: f.forma, moldes: this.distancias(f), radio: this.radios.acierto };
            if (cb.soltar) avisar("soltar", datos);
            else this.devolver(f.id);
        }

        distancias(f) {
            var self = this;
            return this.moldesActivos().map(function (k) {
                var m = self.moldes[k];
                var dx = f.img.x - m.x, dy = f.img.y - m.y;
                return { forma: k, distancia: Math.sqrt(dx * dx + dy * dy), ocupado: !!m.ocupado };
            });
        }

        apagarCercania() {
            var self = this;
            Object.keys(this.moldes).forEach(function (k) { self.moldes[k].cercaObj = 0; });
        }

        seguirArrastre(dt) {
            var f = this.arrastrando;
            if (!f) return;
            // si el dedo se perdió (touchcancel, salió de la ventana) se suelta como un soltado normal
            if (this.puntero && !this.puntero.isDown && !this.demo) { this.soltar(f); return; }
            if (f.offset.x || f.offset.y) {
                var decae = Math.min(1, dt / 160);
                f.offset.x += (0 - f.offset.x) * decae;
                f.offset.y += (-24 - f.offset.y) * decae;
            }
            var o = f.objetivo;
            if (o) {
                var k = 1 - Math.exp(-dt / 38);
                f.img.x += (o.x - f.img.x) * k;
                f.img.y += (o.y - f.img.y) * k;
            }
            var c = R().cercano(f.forma, this.distancias(f), this.radios.cerca);
            var self = this;
            Object.keys(this.moldes).forEach(function (k2) { self.moldes[k2].cercaObj = c && c.forma === k2 ? 0.25 + 0.75 * c.fuerza : 0; });
            if (c && !this.yaCerca) avisar("cerca", f.id);
            this.yaCerca = !!c;
            this.caraEstado.mira = { x: f.img.x, y: f.img.y };
            if (c && c.fuerza > 0.25 && this.caraEstado.modo === "normal") this.ponerCara("ilusion", 500);
        }

        // ---------------------------------------------------------------- resultados (los llama script.js)

        encajar(id) {
            var f = this.fruto(id);
            if (!f) return Promise.resolve();
            var m = this.moldes[f.forma];
            var self = this;
            if (this.arrastrando === f) { this.arrastrando = null; this.puntero = null; }
            f.estado = "encajando";
            m.ocupado = f.id;
            m.cercaObj = 0;
            if (f.img.input) f.img.input.enabled = false;
            var x0 = f.img.x, y0 = f.img.y, k0 = f.k, r0 = f.img.rotation;
            f.img.setDepth(12);
            f.aura.setDepth(11.5);
            return this.anim.agregar(260, function (u) {
                var e = saleSuave(u);
                f.img.x = lerp(x0, m.x, e);
                f.img.y = lerp(y0, m.y, e) - Math.sin(u * Math.PI) * 26;
                f.img.rotation = lerp(r0, 0, e);
                f.k = lerp(k0, 0.86, e);
            }).then(function () {
                f.img.setPosition(m.x, m.y);
                f.sombra.setAlpha(0);
                self.efectoEncaje(m, f);
                return self.anim.agregar(420, function (u) { f.k = lerp(0.86, 1, rebote(u)); });
            }).then(function () {
                f.k = 1;
                f.estado = "encajado";
                f.cinta.setVisible(false);
                f.texto.setVisible(false);
            });
        }

        efectoEncaje(m, f) {
            var self = this;
            var anillo = img(this, m.x, m.y, "anillo", 0.5).setDepth(58).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffe066);
            var destello = img(this, m.x, m.y, "destello", 1).setDepth(59).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff9db);
            this.anim.agregar(620, function (u) {
                anillo.setScale(anillo.base * (1 + u * 1.8)).setAlpha(1 - u);
                destello.setScale(destello.base * (0.4 + Math.sin(u * Math.PI) * 3)).setAlpha(1 - u * u).setRotation(u * 1.2);
            }).then(function () { anillo.destroy(); destello.destroy(); });
            this.anim.agregar(500, function (u) { m.borde.setAlpha(saleSuave(u)); });
            this.particulas.emitir(m.x, m.y, { n: 14, tipos: ["estrella", "destello"], vel: 330, grav: 260, vida: 1000, escala: 0.55, dispersion: 30 });
            this.particulas.emitir(m.x, m.y, { n: 10, tipos: ["chispa"], vel: 220, grav: -30, vida: 800, escala: 0.6, dispersion: 40, sumar: true, tintes: [COLOR[f.forma], 0xfff3a0] });
            // la magia sube por el tronco hasta su orbe en la copa
            var o = this.orbes[f.forma];
            var bola = img(this, m.x, m.y, "chispa", 1.2).setDepth(57).setBlendMode(Phaser.BlendModes.ADD).setTint(COLOR[f.forma]);
            var oo = ORBES[f.forma];
            this.anim.agregar(700, function (u) {
                var e = suave(u);
                bola.x = lerp(m.x, oo.x, e) + Math.sin(u * Math.PI * 2) * 30;
                bola.y = lerp(m.y, oo.y, e);
                if (Math.random() < 0.5) self.particulas.emitir(bola.x, bola.y, { n: 1, tipos: ["chispa"], vel: 30, grav: 0, vida: 500, escala: 0.35, sumar: true, tintes: [COLOR[f.forma]] });
            }).then(function () {
                bola.destroy();
                o.on = 1;
                self.particulas.emitir(oo.x, oo.y, { n: 10, tipos: ["destello", "estrella"], vel: 220, grav: 120, vida: 900, escala: 0.45, dispersion: 20 });
                self.magia = Math.min(1, self.magia + 1 / Math.max(1, self.moldesActivos().length));
            });
            this.ponerCara("feliz", 1800);
            this.sacudirCopa(0.6);
            if (this.bosque) {
                this.bosque.onda(COLOR[f.forma]);
                if (Math.random() < 0.5) this.bosque.bandada(2);
            }
        }

        devolver(id, rechazo) {
            var f = this.fruto(id);
            if (!f) return Promise.resolve();
            if (this.arrastrando === f) { this.arrastrando = null; this.puntero = null; }
            var self = this;
            if (rechazo && this.moldes[rechazo]) {
                this.moldes[rechazo].tiembla = 420;
                this.ponerCara("duda", 1300);
            }
            f.estado = "volviendo";
            var l = LUGARES[f.lugar];
            var x0 = f.img.x, y0 = f.img.y, k0 = f.k;
            var dist = Math.sqrt((l.x - x0) * (l.x - x0) + (l.y - y0) * (l.y - y0));
            var dur = Math.max(320, Math.min(620, dist * 0.7));
            return this.anim.agregar(dur, function (u) {
                var e = suave(u);
                f.img.x = lerp(x0, l.x, e);
                f.img.y = lerp(y0, l.y, e) - Math.sin(u * Math.PI) * Math.min(90, dist * 0.18);
                f.img.rotation = Math.sin(u * Math.PI * 2) * 0.15;
                f.k = lerp(k0, 1, e);
            }).then(function () {
                return self.anim.agregar(260, function (u) { f.k = 1 + Math.sin(u * Math.PI) * 0.06; });
            }).then(function () {
                self.colocarEnLugar(f);
            });
        }

        /** Para la demo: deshace un encaje y deja el fruto en su lugar como al principio. */
        deshacer(id) {
            var f = this.fruto(id);
            if (!f) return Promise.resolve();
            var m = this.moldes[f.forma];
            var self = this;
            m.ocupado = null;
            this.anim.agregar(400, function (u) { m.borde.setAlpha(1 - u); });
            this.orbes[f.forma].on = 0;
            this.magia = 0;
            f.estado = "volviendo";
            f.cinta.setVisible(true).setAlpha(0);
            f.texto.setVisible(true).setAlpha(0);
            return this.devolver(id).then(function () { self.colocarEnLugar(f); });
        }

        // ---------------------------------------------------------------- ayuda (guiado sutil)

        pulsoAyuda(id) {
            var f = this.fruto(id);
            if (!f || f.estado !== "lugar") return;
            var m = this.moldes[f.forma];
            var self = this;
            this.limpiarAyuda();
            var a = { f: f, m: m, t: 0 };
            this.ayuda = a;
            f.salto = 1;
            this.anim.agregar(2600, function (u) {
                if (self.ayuda !== a) return;
                a.t = u;
                m.ayuda = Math.sin(u * Math.PI);
                f.salto = 1 - u;
                self.dibujarCamino(f, m, u);
            }).then(function () {
                if (self.ayuda === a) self.limpiarAyuda();
            });
        }

        dibujarCamino(f, m, u) {
            var g = this.guia;
            g.clear();
            var x0 = f.img.x, y0 = f.img.y - 10, x1 = m.x, y1 = m.y;
            var cx = (x0 + x1) / 2, cy = Math.min(y0, y1) - 120;
            var n = 16;
            var visibles = Math.floor(n * Math.min(1, u * 2.2));
            var alfa = u < 0.75 ? 1 : 1 - (u - 0.75) / 0.25;
            for (var i = 1; i < visibles; i++) {
                var t = i / n;
                var x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
                var y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
                g.fillStyle(0xffffff, 0.9 * alfa);
                g.fillCircle(x, y, 7);
                g.fillStyle(0xffd43b, alfa);
                g.fillCircle(x, y, 4.5);
            }
        }

        limpiarAyuda() {
            if (!this.ayuda) return;
            this.ayuda.m.ayuda = 0;
            this.ayuda.f.salto = 0;
            this.ayuda = null;
            this.guia.clear();
        }

        // ---------------------------------------------------------------- cara del árbol

        ponerCara(modo, ms) {
            this.caraEstado.modo = modo;
            this.caraEstado.hasta = ms ? this.t + ms : 0;
        }

        dibujarCara(dt) {
            var c = this.caraEstado;
            if (c.hasta && this.t > c.hasta) { c.modo = this.fiesta ? "feliz" : "normal"; c.hasta = 0; }
            c.proximo -= dt;
            if (c.proximo <= 0) { c.parpadeo = 160; c.proximo = 2600 + Math.random() * 2600; }
            if (c.parpadeo > 0) c.parpadeo -= dt;
            if (!this.arrastrando) {
                var p = this.input.activePointer;
                c.mira = p && p.worldX > 0 ? { x: p.worldX, y: p.worldY } : { x: CARA.x, y: 700 };
            }
            var g = this.cara;
            g.clear();
            var ojos = [CARA.x - CARA.sep, CARA.x + CARA.sep];
            var dx = c.mira.x - CARA.x, dy = c.mira.y - CARA.ojosY;
            var L = Math.sqrt(dx * dx + dy * dy) || 1;
            var tx = dx / L * Math.min(9, L / 30), ty = dy / L * Math.min(8, L / 30);
            c.ojo.x += (tx - c.ojo.x) * Math.min(1, dt / 120);
            c.ojo.y += (ty - c.ojo.y) * Math.min(1, dt / 120);
            var feliz = c.modo === "feliz";
            var cerrado = c.parpadeo > 0;
            // cachetes
            g.fillStyle(0xff8fab, feliz ? 0.6 : 0.38);
            g.fillEllipse(CARA.x - 96, CARA.bocaY - 6, 44, 24);
            g.fillEllipse(CARA.x + 96, CARA.bocaY - 6, 44, 24);
            // cejas
            g.lineStyle(7, 0x3b1f0b, 1);
            var cejaY = CARA.ojosY - (feliz || c.modo === "ilusion" ? 50 : 42);
            var dudaK = c.modo === "duda" ? 1 : 0;
            ojos.forEach(function (x, i) {
                var s = i ? 1 : -1;
                g.beginPath();
                g.moveTo(x - 20, cejaY + 6 - dudaK * s * 6);
                g.lineTo(x, cejaY - 2);
                g.lineTo(x + 20, cejaY + 6 + dudaK * s * 6);
                g.strokePath();
            });
            ojos.forEach(function (x) {
                if (feliz || cerrado) {
                    // ojos cerrados de alegría (arco hacia arriba) o parpadeo (línea)
                    g.lineStyle(7, 0x2b1608, 1);
                    g.beginPath();
                    if (feliz) g.arc(x, CARA.ojosY + 8, 20, Math.PI * 1.15, Math.PI * 1.85, false);
                    else { g.moveTo(x - 22, CARA.ojosY); g.lineTo(x + 22, CARA.ojosY); }
                    g.strokePath();
                    return;
                }
                var ry = c.modo === "ilusion" ? 33 : 30;
                g.fillStyle(0x3b1f0b, 1);
                g.fillEllipse(x, CARA.ojosY, 58, ry * 2 + 8);
                g.fillStyle(0xffffff, 1);
                g.fillEllipse(x, CARA.ojosY, 50, ry * 2);
                g.fillStyle(0x2b1608, 1);
                g.fillCircle(x + c.ojo.x, CARA.ojosY + c.ojo.y + 4, c.modo === "ilusion" ? 16 : 14);
                g.fillStyle(0xffffff, 1);
                g.fillCircle(x + c.ojo.x - 5, CARA.ojosY + c.ojo.y - 2, 5.5);
                g.fillCircle(x + c.ojo.x + 5, CARA.ojosY + c.ojo.y + 9, 2.5);
            });
            // boca
            var by = CARA.bocaY;
            if (feliz || c.modo === "ilusion") {
                var ancho = feliz ? 46 : 34, alto = feliz ? 40 : 28;
                g.fillStyle(0x3b1f0b, 1);
                g.beginPath();
                g.moveTo(CARA.x - ancho, by - 6);
                g.lineTo(CARA.x + ancho, by - 6);
                g.arc(CARA.x, by - 6, ancho, 0, Math.PI, false);
                g.closePath();
                g.fillPath();
                g.fillStyle(0xff8787, 1);
                g.fillEllipse(CARA.x, by - 6 + alto * 0.62, ancho * 1.05, alto * 0.55);
                g.fillStyle(0xffffff, 1);
                g.fillRect(CARA.x - ancho * 0.6, by - 6, ancho * 1.2, 8);
            } else if (c.modo === "duda") {
                g.lineStyle(7, 0x3b1f0b, 1);
                g.beginPath();
                g.moveTo(CARA.x - 26, by);
                g.lineTo(CARA.x - 9, by - 6);
                g.lineTo(CARA.x + 9, by + 4);
                g.lineTo(CARA.x + 26, by - 2);
                g.strokePath();
            } else {
                g.lineStyle(7, 0x3b1f0b, 1);
                g.beginPath();
                g.arc(CARA.x, by - 22, 34, Math.PI * 0.2, Math.PI * 0.8, false);
                g.strokePath();
            }
        }

        sacudirCopa(fuerza) {
            var self = this;
            var a0 = this.copaAtras.base, f0 = this.copaFrente.base;
            return this.anim.agregar(700, function (u) {
                var s = Math.sin(u * Math.PI * 3) * (1 - u) * 0.035 * fuerza;
                self.copaAtras.setScale(a0 * (1 + s), a0 * (1 - s));
                self.copaFrente.setScale(f0 * (1 - s), f0 * (1 + s * 1.2));
            });
        }

        // ---------------------------------------------------------------- celebración final

        /** corta: paso de nivel (un anillo, un salto, poco confeti). Sin corta: la gran fiesta final. */
        celebrar(corta) {
            var self = this;
            this.fiesta = true;
            if (this.bosque) {
                this.bosque.ponerArcoiris(corta ? 0.6 : 1);
                this.bosque.bandada(corta ? 3 : 5);
                this.bosque.onda(0xffe066);
            }
            this.magia = 1;
            this.ponerCara("feliz", 0);
            var L = this.limitesVisibles();
            var colores = [0xff6b6b, 0xffd43b, 0x69db7c, 0x4dabf7, 0xb197fc, 0xff922b, 0x3bc9db];
            // explosión de color desde el centro del árbol
            (corta ? [0] : [0, 160, 320]).forEach(function (ret, i) {
                setTimeout(function () {
                    if (!self.fiesta) return;
                    var a = img(self, 800, 520, "anillo", 0.6).setDepth(58).setBlendMode(Phaser.BlendModes.ADD).setTint(colores[i * 2]);
                    self.anim.agregar(900, function (u) { a.setScale(a.base * (1 + u * 5)).setAlpha(1 - u); }).then(function () { a.destroy(); });
                    self.particulas.emitir(800, 300, { n: 16, tipos: ["estrella", "destello"], vel: 520, grav: 300, vida: 1500, escala: 0.6, dispersion: 120 });
                }, ret);
            });
            // los frutos brillan en sus moldes
            this.frutos.filter(function (f) { return f.activo; }).forEach(function (f, i) {
                f.aura.setPosition(f.img.x, f.img.y).setDepth(11.5);
                self.anim.agregar(corta ? 1600 : 3000, function (u) {
                    f.aura.setAlpha(Math.sin(u * Math.PI) * (0.6 + 0.3 * Math.sin(u * 30 + i)));
                    f.k = 1 + Math.sin(u * Math.PI * 6 + i) * 0.06 * (1 - u);
                });
            });
            // confeti y serpentinas desde arriba
            var lluvia = function (n) {
                for (var i = 0; i < n; i++) {
                    var x = L.x0 + Math.random() * (L.x1 - L.x0);
                    self.confeti.emitir(x, L.y0 - 20, { n: 1, tipos: Math.random() < 0.3 ? ["serpentina"] : ["confeti"], angulo: Math.PI / 2, apertura: 0.8, vel: 120, grav: 140, vida: 2600, escala: 0.75, giro: 5, tintes: colores, aleteo: true });
                }
            };
            lluvia(corta ? 14 : 26);
            var oleadas = corta ? [500] : [450, 900, 1400, 1900];
            oleadas.forEach(function (ms) { setTimeout(function () { if (self.fiesta) lluvia(18); }, ms); });
            // el árbol salta de alegría
            var salto = function () {
                return self.sacudirCopa(1.6);
            };
            if (corta) return salto().then(function () { return sleep(700); });
            return salto().then(function () { return self.anim.agregar(250, function () {}); })
                .then(salto)
                .then(function () { return sleep(900); });
        }

        // ---------------------------------------------------------------- bucle

        update(time, delta) {
            var dt = Math.min(delta, 60);
            this.t += dt;
            var ts = this.t / 1000;
            this.anim.update(dt);
            this.seguirArrastre(dt);
            this.animarAmbiente(dt, ts);
            if (this.bosque) {
                var foco = this.arrastrando ? { x: this.arrastrando.img.x, y: this.arrastrando.img.y } : null;
                var p = this.input.activePointer;
                if (!foco && p && p.worldX > 0) foco = { x: p.worldX, y: p.worldY };
                this.bosque.update(dt, ts, { magia: this.magia, foco: foco, arrastra: !!this.arrastrando, fiesta: this.fiesta });
            }
            this.animarMoldes(dt, ts);
            var self = this;
            this.nidos.forEach(function (n) { n.rotation = Math.sin(ts * 1.2 + n.fase) * 0.03; });
            this.frutos.forEach(function (f) {
                if (!f.activo) return;
                var lev = f.estado === "arrastrando";
                if (f.estado === "lugar") {
                    var l = LUGARES[f.lugar];
                    var salto = f.salto ? Math.abs(Math.sin(ts * 6)) * 22 * f.salto : 0;
                    f.img.y = l.y + Math.sin(ts * 1.6 + f.fase) * 4 - salto;
                    f.img.rotation = Math.sin(ts * 1.1 + f.fase) * 0.035;
                }
                if (lev) f.img.rotation = Math.sin(ts * 5) * 0.04;
                f.img.setScale(f.img.base * f.k);
                // sombra en el suelo: más pequeña y difusa cuanto más alto va el fruto
                var sombraA = lev ? 0.45 : 0;
                f.sombra.setAlpha(f.sombra.alpha + (sombraA - f.sombra.alpha) * Math.min(1, dt / 100));
                if (lev) f.sombra.setPosition(f.img.x + 10, f.img.y + 96);
                if (f.estado !== "encajado" && !self.fiesta) {
                    var auraA = lev ? 0.55 + 0.15 * Math.sin(ts * 6) : 0;
                    f.aura.setAlpha(f.aura.alpha + (auraA - f.aura.alpha) * Math.min(1, dt / 100));
                    f.aura.setPosition(f.img.x, f.img.y);
                }
            });
            this.dibujarCara(dt);
            this.particulas.update(dt);
            this.confeti.update(dt);
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

    function fuentesListas() {
        if (!document.fonts || !document.fonts.load) return Promise.resolve();
        return Promise.race([
            Promise.all([document.fonts.load("700 23px Fredoka"), document.fonts.load("600 23px Fredoka")]),
            sleep(1500)
        ]).catch(function () { /* sin la fuente queda Arial */ });
    }

    function crearJuego() {
        juego = new Phaser.Game({
            type: Phaser.AUTO,
            parent: el,
            transparent: false,
            backgroundColor: "#7cc24a",
            banner: false,
            scale: { mode: Phaser.Scale.ENVELOP, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
            input: { activePointers: 2 },
            render: { antialias: true },
            scene: [EscenaArbol]
        });
        global.__escenarioArbol = juego;
        global.__pedniaPhaserGame = juego;
    }

    // ------------------------------------------------------------------ API pública

    global.EscenarioArbol = {
        DISPOSICIONES: DISPOSICIONES,
        LUGARES: LUGARES,
        /** Cuántos lugares usa un nivel de n frutos (para sortear el reparto). */
        numLugares: function (n) { return disposicion(n).lugares; },
        montar: function (contenedor, config) {
            el = contenedor;
            cfg = config;
            if (!Phaser || !el) return Promise.resolve(false);
            return Promise.all([D().preparar(), fuentesListas()]).then(function () {
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
        al: function (nombre, fn) { if (nombre in cb) cb[nombre] = fn; },
        reacomodar: function () { if (juego) { juego.scale.refresh(); if (escena) escena.limites = escena.limitesVisibles(); } },
        cargar: function (formas, reparto) { if (escena) escena.cargar(formas, reparto); },
        arrastre: function (on) {
            if (!escena) return;
            escena.arrastreOn = !!on;
            if (!on && escena.arrastrando) escena.devolver(escena.arrastrando.id);
        },
        encajar: function (id) { return escena ? escena.encajar(id) : Promise.resolve(); },
        devolver: function (id, rechazo) { return escena ? escena.devolver(id, rechazo) : Promise.resolve(); },
        deshacer: function (id) { return escena ? escena.deshacer(id) : Promise.resolve(); },
        pulsoAyuda: function (id) { if (escena) escena.pulsoAyuda(id); },
        limpiarAyuda: function () { if (escena) escena.limpiarAyuda(); },
        cara: function (modo, ms) { if (escena) escena.ponerCara(modo, ms); },
        celebrar: function (corta) { return escena ? escena.celebrar(corta) : Promise.resolve(); },
        terminarFiesta: function () { if (escena) escena.fiesta = false; },
        // demo y pruebas: coordenadas de pantalla
        puntoCliente: function (id) {
            var f = escena && escena.fruto(id);
            return f ? aPantalla(f.img.x, f.img.y) : null;
        },
        puntoMoldeCliente: function (forma) {
            var m = escena && escena.moldes[forma];
            return m && m.activo ? aPantalla(m.x, m.y) : null;
        },
        tomarDemo: function (id) {
            var f = escena && escena.fruto(id);
            if (!f || f.estado !== "lugar") return;
            escena.demo = true;
            escena.tomar(f, f.img.x, f.img.y);
        },
        ponerCliente: function (id, x, y) {
            var f = escena && escena.fruto(id);
            if (!f || f !== escena.arrastrando) return;
            var p = aMundo(x, y);
            f.offset = { x: 0, y: 0 };
            f.objetivo = { x: p.x, y: p.y };
        },
        finDemo: function () { if (escena) escena.demo = false; },
        estado: function () {
            if (!escena) return null;
            return {
                frutos: escena.frutos.map(function (f) { return { id: f.id, forma: f.forma, estado: f.estado, x: Math.round(f.img.x), y: Math.round(f.img.y), lugar: f.lugar }; }),
                moldes: Object.keys(escena.moldes).map(function (k) { return { forma: k, ocupado: escena.moldes[k].ocupado, cerca: Math.round(escena.moldes[k].cerca * 100) / 100 }; }),
                radios: escena.radios,
                arrastrando: escena.arrastrando ? escena.arrastrando.id : null
            };
        }
    };
})(typeof window !== "undefined" ? window : global);
