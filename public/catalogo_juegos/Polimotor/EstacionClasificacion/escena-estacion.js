/**
 * EscenarioEstacion — escena Phaser 4 de "¡La Estación de Clasificación!" (window.EscenarioEstacion).
 *
 * Dibuja la estación: contenedores arriba (con etiqueta, ventana de atributos, luz de estado y
 * compuerta), la cinta con los objetos abajo, el indicador de nivel y el progreso. Maneja el
 * arrastre real con mouse y touch. No decide aciertos: al soltar avisa qué contenedor quedó bajo
 * el objeto (evento "soltar") y script.js le pregunta a ReglasEstacion.
 *
 * Mundo de diseño 1600 × 900 con Scale.ENVELOP. Lo jugable cabe en 4:3 (x 200..1400) y en
 * pantallas anchas recortadas por arriba y por abajo: el indicador de nivel y el progreso se
 * anclan a los bordes visibles (limitesVisibles).
 * Cada animación que el flujo espera es una Promise con respaldo por tiempo (Animador).
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser;
    var W = 1600, H = 900;
    var BIN_Y = 318;                 // centro de los contenedores
    var BOCA_DY = -76;               // boca del contenedor respecto a su centro
    var VENTANA_DY = 33;             // centro de la ventana de atributos
    var PLACA_Y = 122;               // etiqueta sobre un contenedor de tamaño normal
    var BASE_BIN = 454;              // y donde se apoya la base de los contenedores (el estante)
    /** Centro y etiqueta de un contenedor de escala k: la base queda siempre sobre el estante. */
    function binY(k) { return BASE_BIN - 136 * k; }
    function placaY(k) { return 408 - 286 * k; }
    var CINTA_Y = 728;               // donde se apoyan los objetos
    var TAM = { grande: 0.95, pequeno: 0.52 };
    /** Distancia del centro del lienzo (180) a la base de cada figura. */
    var BASE = { cuadrado: 68, circulo: 70, estrella: 66, triangulo: 64, rectangulo: 40 };
    var COLORES = [0x3498ff, 0xffcf32, 0x40c057, 0xf03e3e, 0x9b5de5, 0xff922b, 0x3bdcff];
    var PAPEL = [0xe9d8b4, 0xd6bf8f, 0xf4ecd8, 0x3498ff, 0xffcf32, 0x69db7c];
    var VERDE = 0x51e07a, NARANJA = 0xff9f43, CIAN = 0x7ff3ff;

    var D = function () { return global.DibujosEstacion; };

    var juego = null, escena = null, el = null, cfg = null, espera = null;
    var cb = {};

    function avisar(nombre, a) {
        var f = cb[nombre];
        if (typeof f === "function") {
            try { f(a); } catch (e) { console.warn("[EscenarioEstacion]", nombre, e); }
        }
    }

    function suave(u) { return u * u * (3 - 2 * u); }
    function saleSuave(u) { return 1 - Math.pow(1 - u, 3); }
    function entraSuave(u) { return u * u * u; }
    function lerp(a, b, u) { return a + (b - a) * u; }
    function rebote(u) {
        var c1 = 1.70158 * 1.4, c3 = c1 + 1;
        return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
    }
    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    function hexNum(h) { return parseInt(String(h || "#3498ff").replace("#", ""), 16); }
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);

    /** Posiciones x de los contenedores según cuántos tiene el nivel. */
    function xsContenedores(n) {
        if (n <= 2) return [620, 980];
        if (n === 3) return [500, 800, 1100];
        return [410, 670, 930, 1190];
    }
    /** Posiciones x de los huecos de la cinta. */
    function xsCinta(n) {
        var paso = 184, out = [];
        for (var i = 0; i < n; i++) out.push(800 + (i - (n - 1) / 2) * paso);
        return out;
    }

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
            p.latido = !!o.latido;
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
            // burbujas que crecen y se encogen (celebración de los tamaños)
            if (p.latido) e *= 0.75 + 0.5 * Math.abs(Math.sin(p.t * 0.005 + p.fase));
            p.img.setScale(p.aleteo ? e * Math.cos(p.t * 0.012 + p.fase) : e, e);
        }
    };
    Particulas.prototype.apagar = function () {
        this.lista.forEach(function (p) { p.vivo = false; p.img.setVisible(false); });
    };

    // ------------------------------------------------------------------ utilidades

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

    var FUENTE = "Fredoka, 'Arial Rounded MT Bold', Arial, sans-serif";

    // ------------------------------------------------------------------ escena

    var EscenaEstacion = Phaser ? class extends Phaser.Scene {
        constructor() { super({ key: "Estacion" }); }

        create() {
            var self = this;
            D().claves().forEach(function (k) { tex(self, k); });
            this.anim = new Animador();
            this.t = 0;
            this.arrastreOn = false;
            this.arrastrando = null;
            this.puntero = null;
            this.fiesta = false;
            this.ayuda = null;
            this.bins = [];
            this.objs = [];
            this.slots = [];
            this.cola = [];
            this.cintaFase = 0;
            this.cintaVel = 0;
            this.verProgreso = true;
            this.hud = { hechos: 0, total: 0 };

            this.add.image(W / 2, H / 2, "estacion").setDepth(0);
            this.crearAmbiente();
            this.chevrones = this.add.graphics().setDepth(5);
            this.guia = this.add.graphics().setDepth(45);
            this.crearHud();
            this.particulas = new Particulas(this, 90, 60);
            this.confeti = new Particulas(this, 110, 62);
            this.barridoImg = img(this, 0, 0, "barrido", 1).setDepth(48).setBlendMode(Phaser.BlendModes.ADD).setTint(VERDE).setAlpha(0);

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

        // ---------------------------------------------------------------- ambiente

        crearAmbiente() {
            var self = this;
            var puntos = [[38, 690], [62, 690], [86, 690], [1514, 690], [1538, 690], [1562, 690],
                [74, 236], [1526, 236], [118, 150], [1482, 150], [118, 420], [1482, 420]];
            this.leds = puntos.map(function (p, i) {
                var l = img(self, p[0], p[1], "chispa", 0.55).setDepth(1).setBlendMode(Phaser.BlendModes.ADD).setTint(COLORES[i % COLORES.length]);
                l.fase = Math.random() * 6;
                l.vel = 1.5 + Math.random() * 3;
                return l;
            });
            this.pantallas = [[95, 700], [1505, 700], [74, 280], [1526, 280]].map(function (p) {
                return img(self, p[0], p[1], "luz", 0.9).setDepth(1).setBlendMode(Phaser.BlendModes.ADD).setTint(0x3bdcff).setAlpha(0.2);
            });
        }

        animarAmbiente(dt, ts) {
            this.leds.forEach(function (l) { l.setAlpha(0.25 + 0.75 * Math.max(0, Math.sin(ts * l.vel + l.fase))); });
            this.pantallas.forEach(function (p, i) { p.setAlpha(0.14 + 0.08 * Math.sin(ts * 7 + i * 2) + (Math.random() < 0.02 ? 0.12 : 0)); });
            // la cinta: flechas que avanzan cuando entra un objeto nuevo
            this.cintaVel += ((this.cintaMueve ? 1 : 0) - this.cintaVel) * Math.min(1, dt / 200);
            this.cintaFase = (this.cintaFase + this.cintaVel * dt * 0.25) % 58;
            var g = this.chevrones;
            g.clear();
            g.lineStyle(5, 0x7ff3ff, 0.12 + 0.18 * this.cintaVel);
            for (var x = 250 + this.cintaFase; x < 1352; x += 58) {
                g.beginPath();
                g.moveTo(x - 8, 668);
                g.lineTo(x + 6, 694);
                g.lineTo(x - 8, 720);
                g.strokePath();
            }
        }

        // ---------------------------------------------------------------- HUD (nivel y progreso)

        crearHud() {
            this.chip = this.add.graphics().setDepth(70);
            this.chipTexto = this.add.text(0, 0, "", { fontFamily: FUENTE, fontSize: "26px", fontStyle: "bold", color: "#ffffff", resolution: 2 }).setOrigin(0, 0.5).setDepth(71);
            this.chipEdad = this.add.text(0, 0, "", { fontFamily: FUENTE, fontSize: "18px", fontStyle: "bold", color: "#13234a", resolution: 2 }).setOrigin(0.5, 0.5).setDepth(72);
            this.panel = this.add.graphics().setDepth(70);
            this.panelTexto = this.add.text(0, 0, "", { fontFamily: FUENTE, fontSize: "24px", fontStyle: "bold", color: "#ffffff", resolution: 2 }).setOrigin(0, 0.5).setDepth(71);
        }

        /** El indicador de nivel se esconde mientras el cartel de celebración ocupa la franja de arriba. */
        verChip(on) {
            [this.chip, this.chipTexto, this.chipEdad].forEach(function (o) { o.setVisible(on !== false); });
        }

        pintarHud() {
            var L = this.limites || this.limitesVisibles();
            var info = this.info || {};
            // indicador de nivel (arriba a la izquierda)
            var x0 = L.x0 + 22, y0 = L.y0 + 18;
            var g = this.chip;
            g.clear();
            this.chipTexto.setText("NIVEL " + (info.numero || 1) + " · " + (info.criterio || ""));
            var tw = this.chipTexto.width;
            var ancho = tw + 52 + 4 * 22 + 96;
            g.fillStyle(0x0b1636, 0.35).fillRoundedRect(x0 + 3, y0 + 5, ancho, 56, 20);
            g.fillStyle(0x13306b, 1).fillRoundedRect(x0, y0, ancho, 56, 20);
            g.lineStyle(4, 0x7ff3ff, 1).strokeRoundedRect(x0, y0, ancho, 56, 20);
            this.chipTexto.setPosition(x0 + 20, y0 + 29);
            var total = info.total || 4;
            for (var i = 0; i < total; i++) {
                var cx = x0 + 46 + tw + i * 22, on = i < (info.numero || 1);
                g.fillStyle(on ? 0xffd43b : 0x2c4f86, 1).fillCircle(cx, y0 + 28, 8);
                g.lineStyle(2, 0xffffff, on ? 0.9 : 0.4).strokeCircle(cx, y0 + 28, 8);
            }
            var ex = x0 + ancho - 54;
            g.fillStyle(0xffd43b, 1).fillRoundedRect(ex - 44, y0 + 13, 88, 30, 15);
            this.chipEdad.setText(info.edad || "5-6 años").setPosition(ex, y0 + 28);

            // progreso (abajo, al centro)
            var p = this.panel;
            p.clear();
            var v = this.verProgreso && this.hud.total > 0;
            p.setVisible(v);
            this.panelTexto.setVisible(v);
            if (!v) return;
            var n = this.hud.total;
            this.panelTexto.setText(this.hud.hechos + " de " + n + " objetos clasificados");
            var tx = this.panelTexto.width;
            var puntos = n * 24;
            var anchoP = 36 + puntos + 18 + tx + 28;
            var cy = Math.min(860, L.y1 - 36);
            var px = 800 - anchoP / 2;
            p.fillStyle(0x0b1636, 0.35).fillRoundedRect(px + 3, cy - 24, anchoP, 54, 22);
            p.fillStyle(0x13306b, 0.96).fillRoundedRect(px, cy - 27, anchoP, 54, 22);
            p.lineStyle(4, 0x7ff3ff, 1).strokeRoundedRect(px, cy - 27, anchoP, 54, 22);
            var self = this;
            var hechos = this.hud.colores || [];
            for (var k = 0; k < n; k++) {
                var dx = px + 30 + k * 24;
                var col = hechos[k];
                p.fillStyle(col != null ? col : 0x2c4f86, 1).fillCircle(dx, cy, 9);
                p.lineStyle(2, 0xffffff, col != null ? 1 : 0.4).strokeCircle(dx, cy, 9);
            }
            this.panelTexto.setPosition(px + 36 + puntos + 6, cy);
            self.panelCentro = { x: 800, y: cy };
        }

        progreso(hechos, total, colores) {
            this.hud = { hechos: hechos | 0, total: total | 0, colores: colores || [] };
            this.pintarHud();
        }

        mostrarProgreso(on) {
            this.verProgreso = on !== false;
            this.pintarHud();
        }

        // ---------------------------------------------------------------- carga de nivel

        /**
         * info: { numero, total, criterio, edad, celebracion, visibles,
         *         contenedores: [{ id, etiqueta, cuerpo, iconos, color, tamano, forma }],
         *         objetos: [{ id, forma, color, tamano }] en el orden de salida a la cinta }
         */
        cargar(info) {
            this.anim.limpiar();
            this.montarNivel(info, false);
        }

        /**
         * Arma contenedores y cinta del nivel. entrada: los contenedores quedan fuera de la pantalla
         * (a la derecha) y los objetos en la cola, para que cambiarNivel los haga entrar.
         */
        montarNivel(info, entrada) {
            var self = this;
            this.limpiarAyuda();
            this.particulas.apagar();
            this.confeti.apagar();
            this.fiesta = false;
            this.arrastrando = null;
            this.puntero = null;
            this.cameras.main.setZoom(1).centerOn(W / 2, H / 2);
            this.bins.forEach(function (b) { b.partes.forEach(function (p) { p.destroy(); }); });
            this.objs.forEach(function (o) { [o.img, o.contorno, o.sombra].forEach(function (p) { p.destroy(); }); });
            this.info = info;
            var xs = xsContenedores(info.contenedores.length);
            this.limites = this.limitesVisibles();
            var L = this.limites;
            this.bins = info.contenedores.map(function (def, i) {
                var b = self.crearBin(def, xs[i]);
                if (entrada) b.dx = L.x1 - b.x + 180;
                return b;
            });
            var n = Math.min(info.visibles || 6, info.objetos.length);
            this.slots = xsCinta(n).map(function (x) { return { x: x, obj: null }; });
            this.objs = info.objetos.map(function (def, i) { return self.crearObjeto(def, i); });
            this.cola = this.objs.slice();
            if (!entrada) {
                this.slots.forEach(function (s) {
                    var o = self.cola.shift();
                    if (o) self.ponerEnCinta(o, s);
                });
            }
            this.progreso(0, this.objs.length, []);
        }

        /**
         * Cambio de nivel sin fundido: la estación se reconfigura a la vista.
         *  1. las compuertas se cierran y los contenedores del nivel terminado se van por el estante hacia la izquierda;
         *  2. los del nivel nuevo llegan por la derecha, uno tras otro, y frenan con un rebote;
         *  3. la cinta se pone en marcha y trae los objetos nuevos.
         */
        cambiarNivel(info) {
            var self = this;
            this.limpiarAyuda();
            this.fiesta = false;
            this.verChip(true);
            this.arrastrando = null;
            this.puntero = null;
            this.cameras.main.setZoom(1).centerOn(W / 2, H / 2);
            var L = this.limitesVisibles();
            var viejos = this.bins;
            var rapido = reducido ? 0.25 : 1;
            viejos.forEach(function (b) { b.abreObj = 0; b.luz = { color: CIAN, a: 0 }; });
            avisar("cinta", true);
            var salen = viejos.map(function (b, i) {
                var meta = -(b.x - L.x0 + 200);
                return sleep(i * 110 * rapido).then(function () {
                    return self.anim.agregar(700 * rapido, function (u) { b.dx = meta * entraSuave(u); });
                });
            });
            return Promise.all(salen).then(function () {
                viejos.forEach(function (b) { b.partes.forEach(function (p) { p.destroy(); }); });
                self.objs.forEach(function (o) { [o.img, o.contorno, o.sombra].forEach(function (p) { p.destroy(); }); });
                self.bins = [];
                self.objs = [];
                self.particulas.apagar();
                self.confeti.apagar();
                self.montarNivel(info, true);
                var entran = self.bins.map(function (b, i) {
                    var d0 = b.dx;
                    return sleep(i * 140 * rapido).then(function () {
                        avisar("llega", b.id);
                        return self.anim.agregar(760 * rapido, function (u) { b.dx = d0 * (1 - saleSuave(u)); });
                    }).then(function () {
                        b.dx = 0;
                        avisar("frena", b.id);
                        self.particulas.emitir(b.x, BASE_BIN - 6, { n: 6, tipos: ["chispa"], vel: 120, angulo: -Math.PI / 2, apertura: 2.4, grav: 200, vida: 500, escala: 0.5, dispersion: 90, sumar: true, tintes: [0xffffff, CIAN] });
                        return self.anim.agregar(420, function (u) { b.salto = Math.sin(u * Math.PI) * 0.6; b.luz = { color: CIAN, a: Math.sin(u * Math.PI) * 0.8 }; });
                    }).then(function () { b.salto = 0; });
                });
                return Promise.all(entran);
            }).then(function () {
                var llegan = self.slots.map(function (s, i) {
                    return sleep(i * 150 * rapido).then(function () { return self.traerSiguiente(s); });
                });
                return Promise.all(llegan);
            }).then(function () {
                self.cintaMueve = false;
                avisar("cinta", false);
            });
        }

        crearBin(def, x) {
            var self = this;
            var k = Number(def.escala) || 1;     // los contenedores de objetos pequeños son más pequeños
            var y = binY(k);
            var py = placaY(k);
            var b = { id: def.id, def: def, x: x, y: y, k: k, dx: 0, placaY: py, abre: 0, abreObj: 0, hover: 0, hoverObj: 0, tiembla: 0, salto: 0, ayuda: 0, luz: { color: CIAN, a: 0 }, recibidos: [], fase: Math.random() * 6 };
            b.glow = img(this, x, y, "luz", 3.4).setDepth(2).setBlendMode(Phaser.BlendModes.ADD).setTint(CIAN).setAlpha(0);
            b.cuerpo = img(this, x, y, D().claveBin(def.cuerpo), 1).setDepth(3);
            b.tapa = img(this, x, y + BOCA_DY, "tapa", 1).setDepth(3.8);
            b.led = img(this, x + 82, y - 40, "chispa", 0.75).setDepth(3.7).setBlendMode(Phaser.BlendModes.ADD).setTint(CIAN).setAlpha(0.5);
            b.franja = this.add.rectangle(x, py + 31, 196, 8, hexNum(def.cuerpo)).setDepth(3.1);
            b.placa = img(this, x, py, "placa", 1).setDepth(3.2);
            b.texto = this.add.text(x, py, def.etiqueta || "", { fontFamily: FUENTE, fontSize: "27px", fontStyle: "bold", color: "#13234a", resolution: 2 }).setOrigin(0.5, 0.5).setDepth(3.3);
            var fs = 27;
            while (b.texto.width > 220 && fs > 15) { fs -= 1; b.texto.setFontSize(fs); }
            b.iconos = this.crearIconos(def, x, y + VENTANA_DY);
            b.partes = [b.glow, b.cuerpo, b.tapa, b.led, b.franja, b.placa, b.texto];
            b.iconos.forEach(function (ic) { b.partes.push(ic.img, ic.marca); });
            return b;
        }

        /** Íconos de la ventana: muestra de color, referencia de tamaño o figura. */
        crearIconos(def, cx, cy) {
            var self = this;
            var attrs = def.iconos || [];
            var dos = attrs.length > 1;
            return attrs.map(function (a, i) {
                var key, k;
                if (a === "color") { key = "ico-color-" + def.color; k = dos ? 0.66 : 0.82; }
                else if (a === "tamano") { key = def.tamano === "grande" ? "ico-grande" : "ico-pequeno"; k = dos ? 0.7 : 0.95; }
                else { key = "ico-" + def.forma; k = 0.47; }
                var dx = dos ? (i === 0 ? -42 : 30) : 0;
                var im = img(self, cx + dx, cy, key, k).setDepth(3.5);
                var marca = img(self, cx + dx + (dos ? 26 : 44), cy - 30, "marca-ok", dos ? 0.62 : 0.72).setDepth(3.6).setAlpha(0);
                return { attr: a, img: im, marca: marca, dx: dx, k: im.base, latido: 0 };
            });
        }

        bin(id) { return this.bins.filter(function (b) { return b.id === id; })[0] || null; }
        obj(id) { return this.objs.filter(function (o) { return o.id === id; })[0] || null; }
        bocaDe(b) { return { x: b.x + (b.dx || 0), y: b.y + BOCA_DY * b.k }; }

        crearObjeto(def, i) {
            var k = TAM[def.tamano] || TAM.grande;
            var key = D().claveObjeto(def.forma, def.color);
            var o = { id: def.id, def: def, k: k, key: key, estado: "cola", slot: null, esc: 1, salto: 0, fase: i * 1.37, offset: { x: 0, y: 0 } };
            o.sombra = img(this, 0, 0, "sombra", 0.8 * k / 0.95).setDepth(8).setAlpha(0);
            o.contorno = img(this, 0, 0, "contorno-" + def.forma, k).setDepth(9).setTint(0xfff3a0).setAlpha(0);
            o.img = img(this, 0, 0, key, k).setDepth(10);
            var kr = D().res(key);
            // zona de toque generosa (dedos pequeños): un círculo algo mayor que la figura, mínimo 58 de radio
            var radio = Math.max(58, 78 * k) / k * kr;
            o.img.setInteractive({
                hitArea: new Phaser.Geom.Circle(90 * kr, 90 * kr, radio),
                hitAreaCallback: Phaser.Geom.Circle.Contains,
                draggable: true,
                useHandCursor: true
            });
            o.img.setData("obj", o);
            o.img.setVisible(false);
            o.colorTinte = D().tinte(def.color);
            return o;
        }

        puntoCinta(o, slot) {
            var s = slot || o.slot;
            return { x: s.x, y: CINTA_Y - (BASE[o.def.forma] || 66) * o.k };
        }

        ponerEnCinta(o, slot) {
            o.slot = slot;
            slot.obj = o;
            var p = this.puntoCinta(o);
            o.estado = "cinta";
            o.esc = 1;
            o.img.setPosition(p.x, p.y).setDepth(10).setRotation(0).setVisible(true).setAlpha(1);
            o.img.setScale(o.img.base);
            o.contorno.setAlpha(0);
            o.sombra.setAlpha(0);
            if (o.img.input) o.img.input.enabled = true;
        }

        /** El siguiente objeto de la cola entra por la cinta al hueco libre. */
        traerSiguiente(slot) {
            var o = this.cola.shift();
            if (!o) return Promise.resolve(false);
            var self = this;
            o.slot = slot;
            slot.obj = o;
            var p = this.puntoCinta(o);
            o.estado = "entrando";
            o.img.setVisible(true).setAlpha(0).setDepth(10).setRotation(0);
            if (o.img.input) o.img.input.enabled = false;
            this.cintaMueve = true;
            avisar("entra", o.id);
            var x0 = p.x - 150;
            return this.anim.agregar(reducido ? 120 : 650, function (u) {
                var e = saleSuave(u);
                o.img.setPosition(lerp(x0, p.x, e), p.y).setAlpha(Math.min(1, u * 3));
                o.esc = 1;
            }).then(function () {
                self.cintaMueve = false;
                self.particulas.emitir(p.x, p.y, { n: 6, tipos: ["destello", "chispa"], vel: 140, grav: 0, vida: 500, escala: 0.45, dispersion: 50, sumar: true, tintes: [o.colorTinte, 0xffffff] });
                return self.anim.agregar(260, function (u) { o.esc = 1 + Math.sin(u * Math.PI) * 0.1; });
            }).then(function () {
                if (o.estado === "entrando") self.ponerEnCinta(o, slot);
                return true;
            });
        }

        /** Las etiquetas laten una vez: se usa al presentar el criterio nuevo. */
        resaltarEtiquetas() {
            var self = this;
            this.bins.forEach(function (b, i) {
                setTimeout(function () {
                    if (!b.placa.scene) return;
                    b.ayuda = 0;
                    self.anim.agregar(700, function (u) {
                        var s = 1 + Math.sin(u * Math.PI) * 0.12;
                        b.placa.setScale(b.placa.base * s);
                        b.texto.setScale(s);
                        b.iconos.forEach(function (ic) { ic.latido = Math.sin(u * Math.PI); });
                        b.luz = { color: 0xfff3a0, a: Math.sin(u * Math.PI) * 0.7 };
                    });
                }, i * 180);
            });
        }

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
            var o = obj.getData("obj");
            if (!o || !this.arrastreOn || o.estado !== "cinta" || this.arrastrando) return;
            this.limpiarAyuda();
            this.tomar(o, p.worldX, p.worldY);
            this.puntero = p;
            avisar("tomar", o.id);
        }

        tomar(o, px, py) {
            o.estado = "arrastrando";
            this.arrastrando = o;
            this.limites = this.limitesVisibles();
            o.img.setDepth(50);
            o.contorno.setDepth(49);
            o.sombra.setDepth(48);
            // el objeto sigue al dedo; el desfase sube un poco para que quede a la vista sobre el dedo
            o.offset = { x: o.img.x - px, y: o.img.y - py };
            o.objetivo = { x: o.img.x, y: o.img.y };
            o.sigue = { x: o.img.x, y: o.img.y };
            var e0 = o.esc;
            this.anim.agregar(160, function (u) { o.esc = lerp(e0, 1.12, saleSuave(u)); });
            this.particulas.emitir(o.img.x, o.img.y, { n: 6, tipos: ["destello", "chispa"], vel: 150, grav: 0, vida: 500, escala: 0.4, dispersion: 40, sumar: true, tintes: [o.colorTinte, 0xffffff] });
        }

        alMover(p, obj) {
            var o = obj.getData("obj");
            if (!o || o !== this.arrastrando) return;
            this.apuntar(o, p.worldX, p.worldY);
            avisar("arrastrar", o.id);
        }

        apuntar(o, px, py) {
            var L = this.limites || { x0: 0, y0: 0, x1: W, y1: H };
            o.objetivo = {
                x: Math.max(L.x0 + 50, Math.min(L.x1 - 50, px + o.offset.x)),
                y: Math.max(L.y0 + 60, Math.min(L.y1 - 40, py + o.offset.y))
            };
        }

        alSoltar(p, obj) {
            var o = obj.getData("obj");
            if (!o || o !== this.arrastrando) return;
            this.soltar(o);
        }

        /** Contenedor bajo el punto (zona amplia: desde la etiqueta hasta la base). */
        binEn(x, y) {
            var mejor = null, dmin = 1e9;
            this.bins.forEach(function (b) {
                var dx = Math.abs(x - b.x);
                if (dx < Math.max(112, 132 * b.k) && y > b.placaY - 40 && y < BASE_BIN + 20 && dx < dmin) { dmin = dx; mejor = b; }
            });
            return mejor;
        }

        soltar(o) {
            this.arrastrando = null;
            this.puntero = null;
            o.estado = "soltado";
            // se mira donde está el dedo, no la imagen: el suavizado la deja unos px atrás en un gesto rápido
            var meta = o.objetivo || { x: o.img.x, y: o.img.y };
            var b = this.binEn(meta.x, meta.y) || this.binEn(o.img.x, o.img.y);
            this.bins.forEach(function (bb) { bb.hoverObj = 0; });
            this.binSobre = null;
            var datos = { id: o.id, contenedor: b ? b.id : null };
            if (cb.soltar) avisar("soltar", datos);
            else this.devolver(o.id);
        }

        seguirArrastre(dt) {
            var o = this.arrastrando;
            if (!o) return;
            // si el dedo se perdió (touchcancel, salió de la ventana) se suelta como un soltado normal
            if (this.puntero && !this.puntero.isDown && !this.demo) { this.soltar(o); return; }
            if (o.offset.x || o.offset.y) {
                var decae = Math.min(1, dt / 180);
                o.offset.x += (0 - o.offset.x) * decae;
                o.offset.y += (-30 - o.offset.y) * decae;
            }
            if (o.objetivo && o.sigue) {
                var k = 1 - Math.exp(-dt / 34);
                o.sigue.x += (o.objetivo.x - o.sigue.x) * k;
                o.sigue.y += (o.objetivo.y - o.sigue.y) * k;
            }
            o.img.setPosition(o.sigue.x, o.sigue.y);
            o.img.rotation += (Math.sin(this.t / 260) * 0.05 - o.img.rotation) * Math.min(1, dt / 120);
            var b = this.binEn(o.img.x, o.img.y);
            this.bins.forEach(function (bb) { bb.hoverObj = bb === b ? 1 : 0; });
            if (b !== this.binSobre) {
                this.binSobre = b;
                if (b) avisar("sobre", b.id);
            }
        }

        // ---------------------------------------------------------------- resultados (los llama script.js)

        /**
         * Clasificación correcta: escaneo, la compuerta se abre, el objeto entra y la luz se pone verde.
         * opciones.demo: no libera el hueco ni trae otro objeto (la demo lo deshace después).
         */
        aceptar(id, binId, opciones) {
            var o = this.obj(id), b = this.bin(binId);
            if (!o || !b) return Promise.resolve();
            var op = opciones || {};
            var self = this;
            if (this.arrastrando === o) { this.arrastrando = null; this.puntero = null; }
            o.estado = "absorbiendo";
            if (o.img.input) o.img.input.enabled = false;
            var boca = this.bocaDe(b);
            var x0 = o.img.x, y0 = o.img.y, e0 = o.esc, r0 = o.img.rotation;
            var arriba = { x: boca.x, y: boca.y - 26 - 60 * o.k };
            b.luz = { color: VERDE, a: 1 };
            o.contorno.setTint(VERDE);
            return this.anim.agregar(240, function (u) {
                var e = saleSuave(u);
                o.img.x = lerp(x0, arriba.x, e);
                o.img.y = lerp(y0, arriba.y, e);
                o.img.rotation = lerp(r0, 0, e);
                o.esc = lerp(e0, 1, e);
            }).then(function () {
                // escáner: una línea verde baja por el objeto
                avisar("escaner", id);
                var alto = 150 * o.k;
                self.barridoImg.setScale(self.barridoImg.base * o.k * 0.9, self.barridoImg.base).setAlpha(0);
                return self.anim.agregar(reducido ? 100 : 420, function (u) {
                    self.barridoImg.setPosition(arriba.x, arriba.y - alto / 2 + alto * u).setAlpha(Math.sin(u * Math.PI));
                });
            }).then(function () {
                self.barridoImg.setAlpha(0);
                avisar("compuerta", binId);
                b.abreObj = 1;
                return sleep(reducido ? 60 : 200);
            }).then(function () {
                o.img.setDepth(4);
                o.contorno.setAlpha(0);
                o.sombra.setAlpha(0);
                return self.anim.agregar(reducido ? 120 : 340, function (u) {
                    var e = entraSuave(u);
                    o.img.y = lerp(arriba.y, boca.y + 6, e);
                    o.esc = lerp(1, 0.18, e);
                    o.img.setAlpha(1 - Math.max(0, (u - 0.55) / 0.45));
                });
            }).then(function () {
                o.img.setVisible(false);
                o.estado = op.demo ? "en-demo" : "clasificado";
                o.binId = b.id;
                if (!op.demo) b.recibidos.push(o.key);
                self.efectoAcierto(b, o);
                return sleep(reducido ? 60 : 260);
            }).then(function () {
                b.abreObj = 0;
                b.salto = 1;
                self.anim.agregar(480, function (u) { b.salto = 1 - u; });
                if (op.demo) return null;
                var slot = o.slot;
                if (slot) slot.obj = null;
                o.slot = null;
                if (slot && self.cola.length) return self.traerSiguiente(slot);
                return null;
            });
        }

        efectoAcierto(b, o) {
            var self = this;
            var boca = this.bocaDe(b);
            var tipo = (this.info && this.info.celebracion) || "colores";
            avisar("dentro", { objeto: o.id, contenedor: b.id });
            var anillo =img(this, boca.x, boca.y, "anillo", 0.6).setDepth(58).setBlendMode(Phaser.BlendModes.ADD).setTint(VERDE);
            this.anim.agregar(620, function (u) {
                anillo.setScale(anillo.base * (1 + u * 2), anillo.base * (1 + u * 2) * 0.45).setAlpha(1 - u);
            }).then(function () { anillo.destroy(); });
            var tipos = ["estrella", "destello"], tintes = [o.colorTinte, 0xffffff, VERDE];
            if (tipo === "formas") tipos = ["geo-circulo", "geo-cuadrado", "geo-triangulo", "geo-rectangulo"];
            if (tipo === "tamanos") tipos = ["burbuja", "estrella"];
            this.particulas.emitir(boca.x, boca.y - 10, { n: 12, tipos: tipos, vel: 300, angulo: -Math.PI / 2, apertura: 2.2, grav: 420, vida: 900, escala: 0.55, dispersion: 40, tintes: tintes, latido: tipo === "tamanos" });
            this.particulas.emitir(boca.x, boca.y, { n: 8, tipos: ["chispa"], vel: 200, grav: 0, vida: 600, escala: 0.6, dispersion: 30, sumar: true, tintes: [VERDE, 0xffffff] });
            // marcas verdes sobre los atributos que coincidieron
            b.iconos.forEach(function (ic) {
                ic.marca.setTexture("marca-ok");
                self.anim.agregar(1100, function (u) {
                    ic.marca.setAlpha(u < 0.2 ? u / 0.2 : (u > 0.75 ? (1 - u) / 0.25 : 1)).setScale(ic.marca.base * (u < 0.2 ? rebote(u / 0.2) : 1));
                });
            });
            this.anim.agregar(1100, function (u) { b.luz = { color: VERDE, a: 1 - u * 0.6 }; });
        }

        /**
         * Clasificación incorrecta: luz naranja suave, el contenedor tiembla, cada atributo de la
         * ventana muestra si coincidió (verde) o hay que mirarlo otra vez (naranja); el objeto vuelve.
         */
        rechazar(id, binId, fallos) {
            var b = this.bin(binId);
            var self = this;
            if (b) {
                var lista = fallos || [];
                b.tiembla = 480;
                b.iconos.forEach(function (ic) {
                    var falla = lista.indexOf(ic.attr) >= 0;
                    ic.marca.setTexture(falla ? "marca-mira" : "marca-ok");
                    ic.marcaFalla = falla;
                    self.anim.agregar(1700, function (u) {
                        var a = u < 0.12 ? u / 0.12 : (u > 0.8 ? (1 - u) / 0.2 : 1);
                        ic.marca.setAlpha(a).setScale(ic.marca.base * (u < 0.12 ? rebote(u / 0.12) : 1));
                        ic.latido = falla ? Math.abs(Math.sin(u * Math.PI * 4)) * (1 - u) : 0;
                    });
                });
                this.anim.agregar(1400, function (u) {
                    b.luz = { color: NARANJA, a: (0.55 + 0.45 * Math.abs(Math.sin(u * Math.PI * 3))) * (1 - u * 0.6) };
                });
            }
            return this.devolver(id);
        }

        /** El objeto vuelve suavemente a su hueco de la cinta. */
        devolver(id) {
            var o = this.obj(id);
            if (!o || !o.slot) return Promise.resolve();
            if (this.arrastrando === o) { this.arrastrando = null; this.puntero = null; }
            var self = this;
            o.estado = "volviendo";
            var l = this.puntoCinta(o);
            var x0 = o.img.x, y0 = o.img.y, e0 = o.esc, r0 = o.img.rotation;
            var dist = Math.sqrt((l.x - x0) * (l.x - x0) + (l.y - y0) * (l.y - y0));
            var dur = Math.max(320, Math.min(720, dist * 0.7));
            return this.anim.agregar(dur, function (u) {
                var e = suave(u);
                o.img.x = lerp(x0, l.x, e);
                o.img.y = lerp(y0, l.y, e) - Math.sin(u * Math.PI) * Math.min(80, dist * 0.15);
                o.img.rotation = lerp(r0, 0, e);
                o.esc = lerp(e0, 1, e);
            }).then(function () {
                return self.anim.agregar(240, function (u) { o.esc = 1 + Math.sin(u * Math.PI) * 0.06; });
            }).then(function () {
                if (o.slot) self.ponerEnCinta(o, o.slot);
            });
        }

        /** Para la demo: el objeto sale del contenedor y vuelve a su hueco. */
        deshacer(id) {
            var o = this.obj(id);
            if (!o || !o.slot) return Promise.resolve();
            var b = this.bin(o.binId);
            var self = this;
            var boca = b ? this.bocaDe(b) : { x: o.slot.x, y: 300 };
            if (b) b.abreObj = 1;
            o.estado = "volviendo";
            o.img.setVisible(true).setAlpha(1).setDepth(10).setPosition(boca.x, boca.y);
            o.esc = 0.2;
            return this.anim.agregar(260, function (u) {
                o.esc = lerp(0.2, 1, saleSuave(u));
                o.img.y = boca.y - 70 * o.k * u;
            }).then(function () {
                if (b) b.abreObj = 0;
                return self.devolver(id);
            });
        }

        // ---------------------------------------------------------------- ayuda (guiado sutil)

        pulsoAyuda(id, binId) {
            var o = this.obj(id), b = this.bin(binId);
            if (!o || !b || o.estado !== "cinta") return;
            var self = this;
            this.limpiarAyuda();
            var a = { o: o, b: b };
            this.ayuda = a;
            o.salto = 1;
            this.anim.agregar(2800, function (u) {
                if (self.ayuda !== a) return;
                b.ayuda = Math.sin(u * Math.PI);
                o.salto = 1 - u;
                o.contorno.setTint(0xfff3a0).setAlpha(Math.sin(u * Math.PI) * 0.8);
                self.dibujarCamino(o, b, u);
            }).then(function () {
                if (self.ayuda === a) self.limpiarAyuda();
            });
        }

        dibujarCamino(o, b, u) {
            var g = this.guia;
            g.clear();
            var boca = this.bocaDe(b);
            var x0 = o.img.x, y0 = o.img.y - 40 * o.k, x1 = boca.x, y1 = boca.y - 30;
            var cx = (x0 + x1) / 2, cy = Math.min(y0, y1) - 60;
            var n = 18;
            var visibles = Math.floor(n * Math.min(1, u * 2.2));
            var alfa = u < 0.75 ? 1 : 1 - (u - 0.75) / 0.25;
            for (var i = 1; i < visibles; i++) {
                var t = i / n;
                var x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
                var y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
                g.fillStyle(0x06203f, 0.6 * alfa).fillCircle(x, y, 9);
                g.fillStyle(0xfff3a0, alfa).fillCircle(x, y, 6);
            }
        }

        limpiarAyuda() {
            if (!this.ayuda) return;
            this.ayuda.b.ayuda = 0;
            this.ayuda.o.salto = 0;
            if (this.ayuda.o.estado === "cinta") this.ayuda.o.contorno.setAlpha(0);
            this.ayuda = null;
            this.guia.clear();
        }

        // ---------------------------------------------------------------- celebraciones por nivel

        lluvia(n, o) {
            var L = this.limitesVisibles();
            for (var i = 0; i < n; i++) {
                var x = L.x0 + Math.random() * (L.x1 - L.x0);
                this.confeti.emitir(x, L.y0 - 20, Object.assign({ n: 1, angulo: Math.PI / 2, apertura: 0.8, vel: 120, grav: 140, vida: 2600, escala: 0.7, giro: 5, aleteo: true }, o));
            }
        }

        fuegoPapel(x, y, tintes) {
            var self = this;
            var a = img(this, x, y, "anillo", 0.5).setDepth(58).setBlendMode(Phaser.BlendModes.ADD).setTint(tintes[0]);
            this.anim.agregar(800, function (u) { a.setScale(a.base * (1 + u * 4)).setAlpha(1 - u); }).then(function () { a.destroy(); });
            this.particulas.emitir(x, y, { n: 16, tipos: ["papel", "papel", "estrella"], vel: 440, grav: 260, vida: 1500, escala: 0.6, dispersion: 30, giro: 9, tintes: tintes });
            this.particulas.emitir(x, y, { n: 6, tipos: ["chispa"], vel: 220, grav: 0, vida: 600, escala: 0.8, dispersion: 20, sumar: true, tintes: [0xffffff, tintes[0]] });
            avisar("fuego");
            self.fuegos = (self.fuegos || 0) + 1;
        }

        /** Saltito de cada contenedor, uno tras otro (la "ola" de celebración). */
        ola(ms, veces) {
            var self = this;
            this.bins.forEach(function (b, i) {
                for (var v = 0; v < (veces || 1); v++) {
                    setTimeout(function () {
                        if (!self.fiesta || !b.cuerpo.scene) return;
                        self.anim.agregar(420, function (u) { b.salto = Math.sin(u * Math.PI); });
                    }, i * (ms || 140) + v * (self.bins.length * (ms || 140) + 200));
                }
            });
        }

        /** tipo: colores · tamanos · formas · doble (≈2,6 s). */
        celebrarNivel(tipo) {
            var self = this;
            this.fiesta = true;
            this.verChip(false);
            this.limpiarAyuda();
            var dur = reducido ? 600 : 2600;
            var L = this.limitesVisibles();
            if (tipo === "colores") {
                this.lluvia(30, { tipos: ["confeti", "estrella"], tintes: [0x3498ff, 0xffcf32, 0x9fd6ff, 0xfff6b8] });
                this.ola(150, 2);
                this.bins.forEach(function (b, i) {
                    setTimeout(function () {
                        if (!self.fiesta) return;
                        var boca = self.bocaDe(b);
                        self.particulas.emitir(boca.x, boca.y, { n: 14, tipos: ["confeti", "estrella"], vel: 420, angulo: -Math.PI / 2, apertura: 1.4, grav: 380, vida: 1300, escala: 0.6, dispersion: 30, giro: 8, tintes: [hexNum(b.def.cuerpo), 0xffffff] });
                    }, 200 + i * 300);
                });
                return this.anim.agregar(dur, function (u) {
                    self.bins.forEach(function (b, i) {
                        var on = Math.floor(u * 10 + i) % 2 === 0;
                        b.luz = { color: on ? 0x3498ff : 0xffcf32, a: 0.8 };
                    });
                });
            }
            if (tipo === "tamanos") {
                // burbujas que crecen y se encogen y objetos que saltan de los contenedores cambiando de tamaño
                for (var i = 0; i < 16; i++) {
                    var x = L.x0 + 80 + Math.random() * (L.x1 - L.x0 - 160);
                    this.confeti.emitir(x, 800, { n: 1, tipos: ["burbuja"], angulo: -Math.PI / 2, apertura: 0.5, vel: 180, grav: -40, vida: 2400, escala: 0.6 + Math.random() * 1.1, giro: 1, latido: true, tintes: [0x9fd6ff, 0xc3f7b4, 0xe5c9ff, 0xffffff] });
                }
                this.bins.forEach(function (b, i) {
                    var keys = b.recibidos.slice(-3);
                    keys.forEach(function (key, j) {
                        setTimeout(function () {
                            if (!self.fiesta) return;
                            var boca = self.bocaDe(b);
                            var c = img(self, boca.x, boca.y, key, 0.5).setDepth(57);
                            var dx = (j - 1) * 70;
                            self.anim.agregar(1500, function (u) {
                                var k = 0.25 + 0.75 * Math.sin(u * Math.PI) * (0.7 + 0.5 * Math.sin(u * Math.PI * 4));
                                c.setPosition(boca.x + dx * u, boca.y - Math.sin(u * Math.PI) * 170).setScale(c.base * k).setAlpha(u > 0.85 ? (1 - u) / 0.15 : 1);
                            }).then(function () { c.destroy(); });
                        }, 150 + i * 250 + j * 160);
                    });
                    self.anim.agregar(dur, function (u) {
                        b.escala = 1 + Math.sin(u * Math.PI * 4) * 0.07 * (i % 2 ? 1 : -1);
                        b.luz = { color: i % 2 ? 0x20c997 : 0x9b5de5, a: 0.5 + 0.4 * Math.abs(Math.sin(u * Math.PI * 4)) };
                    }).then(function () { b.escala = 1; });
                });
                return this.anim.agregar(dur, function () {});
            }
            if (tipo === "formas") {
                var geos = ["geo-circulo", "geo-cuadrado", "geo-triangulo", "geo-rectangulo"];
                this.lluvia(34, { tipos: geos, tintes: COLORES, escala: 0.75 });
                this.ola(130, 2);
                this.bins.forEach(function (b, i) {
                    setTimeout(function () {
                        if (!self.fiesta) return;
                        var boca = self.bocaDe(b);
                        self.particulas.emitir(boca.x, boca.y, { n: 16, tipos: [geos[i % 4]], vel: 460, angulo: -Math.PI / 2, apertura: 1.6, grav: 380, vida: 1300, escala: 0.7, dispersion: 20, giro: 7, tintes: [hexNum(b.def.cuerpo), 0xffffff, 0xffd43b] });
                        b.iconos.forEach(function (ic) {
                            self.anim.agregar(700, function (u) { ic.latido = Math.sin(u * Math.PI); });
                        });
                    }, 150 + i * 260);
                });
                return this.anim.agregar(dur, function (u) {
                    self.bins.forEach(function (b, i) { b.luz = { color: COLORES[(Math.floor(u * 8) + i) % COLORES.length], a: 0.75 }; });
                });
            }
            // doble: azul, amarillo, luces verdes y fuegos artificiales de papel reciclado
            this.lluvia(26, { tipos: ["papel", "confeti"], tintes: [0x3498ff, 0xffcf32, 0xe9d8b4, 0xd6bf8f] });
            this.ola(140, 2);
            [0, 1, 2].forEach(function (i) {
                setTimeout(function () {
                    if (self.fiesta) self.fuegoPapel(L.x0 + 300 + Math.random() * (L.x1 - L.x0 - 600), 170 + Math.random() * 200, i % 2 ? [0xffcf32].concat(PAPEL) : [0x3498ff].concat(PAPEL));
                }, 250 + i * 520);
            });
            return this.anim.agregar(dur, function (u) {
                self.bins.forEach(function (b, i) {
                    b.luz = { color: (Math.floor(u * 12) + i) % 3 === 0 ? VERDE : (i < 2 ? 0x3498ff : 0xffcf32), a: 0.85 };
                });
            });
        }

        // ---------------------------------------------------------------- escena final «La estación en marcha»

        camara(x, y, zoom) {
            var c = this.cameras.main;
            c.setZoom(zoom);
            c.centerOn(x, y);
        }

        /**
         * Tras el nivel 4 (≈10 s, con franjas de cine y botones ocultos):
         *  1. la cámara se acerca a los contenedores y un escáner verde los recorre: cada uno se enciende;
         *  2. las compuertas se abren y los objetos clasificados salen disparados hacia arriba, girando,
         *     y estallan en fuegos artificiales de papel del color de su contenedor;
         *  3. la cámara se aleja, cae confeti multicolor y los contenedores bailan en ola;
         *  4. las compuertas se cierran: la estación queda organizada.
         * Con movimiento reducido la cámara no viaja y todo es más corto.
         */
        cinematica() {
            var self = this;
            this.fiesta = true;
            this.verChip(false);
            this.limpiarAyuda();
            avisar("cine", true);
            var cx = 800, cy = BIN_Y + 20;
            var z = reducido ? 1 : 1.14;
            var barra = img(this, 0, BIN_Y, "barrido", 1).setDepth(59).setBlendMode(Phaser.BlendModes.ADD).setTint(VERDE).setAlpha(0).setRotation(Math.PI / 2);
            barra.setScale(barra.base * 2.1, barra.base * 1.4);
            var fin = function () {
                self.camara(W / 2, H / 2, 1);
                barra.destroy();
                self.bins.forEach(function (b) { b.abreObj = 0; });
            };
            this.bins.forEach(function (b) { b.luz = { color: CIAN, a: 0 }; });
            return this.anim.agregar(reducido ? 100 : 1200, function (u) {
                // 1) acercamiento
                var k = suave(u);
                if (!reducido) self.camara(lerp(W / 2, cx, k), lerp(H / 2, cy, k), lerp(1, z, k));
            }).then(function () {
                // escáner que recorre los contenedores de izquierda a derecha
                var xs = self.bins.map(function (b) { return b.x; });
                var x0 = xs[0] - 180, x1 = xs[xs.length - 1] + 180;
                var encendidos = {};
                return self.anim.agregar(reducido ? 300 : 1800, function (u) {
                    var x = lerp(x0, x1, u);
                    barra.setPosition(x, BIN_Y).setAlpha(Math.sin(u * Math.PI) * 0.9);
                    self.bins.forEach(function (b, i) {
                        if (!encendidos[i] && x >= b.x) {
                            encendidos[i] = true;
                            b.luz = { color: VERDE, a: 1 };
                            b.salto = 1;
                            self.anim.agregar(380, function (v) { b.salto = 1 - v; });
                            self.particulas.emitir(b.x, b.y, { n: 8, tipos: ["chispa", "destello"], vel: 220, grav: 0, vida: 600, escala: 0.6, dispersion: 60, sumar: true, tintes: [VERDE, 0xffffff] });
                            avisar("ding", i);
                        }
                    });
                });
            }).then(function () {
                // 2) compuertas abiertas: los objetos salen disparados y estallan en papel
                avisar("compuerta");
                self.bins.forEach(function (b) { b.abreObj = 1; });
                var lanzados = [];
                self.bins.forEach(function (b, i) {
                    var keys = b.recibidos.length ? b.recibidos.slice(-3) : [];
                    keys.forEach(function (key, j) {
                        lanzados.push(new Promise(function (resolve) {
                            setTimeout(function () {
                                if (!self.fiesta || !b.cuerpo.scene) { resolve(); return; }
                                var boca = self.bocaDe(b);
                                var c = img(self, boca.x, boca.y, key, 0.3).setDepth(57);
                                var dx = (j - (keys.length - 1) / 2) * 90 + (i - (self.bins.length - 1) / 2) * 30;
                                // estallan por encima de las etiquetas pero debajo de la franja de cine
                                var alto = 150 + Math.random() * 50;
                                var giro = (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 4);
                                avisar("lanza");
                                self.anim.agregar(reducido ? 200 : 900, function (u) {
                                    var e = saleSuave(u);
                                    c.setPosition(boca.x + dx * e, boca.y - alto * e).setScale(c.base * lerp(1, 2.1, e)).setRotation(giro * u);
                                }).then(function () {
                                    var p = { x: c.x, y: c.y };
                                    c.destroy();
                                    self.fuegoPapel(p.x, p.y, [hexNum(b.def.cuerpo)].concat(PAPEL));
                                    resolve();
                                });
                            }, (reducido ? 0 : 200) + i * 230 + j * 330);
                        }));
                    });
                });
                return Promise.all(lanzados).then(function () { return sleep(reducido ? 100 : 500); });
            }).then(function () {
                // 3) la cámara se aleja y la estación entera celebra
                self.bins.forEach(function (b) { b.abreObj = 0; });
                avisar("compuerta");
                self.lluvia(40, { tipos: ["confeti", "papel", "estrella", "geo-circulo", "geo-triangulo"], tintes: COLORES });
                self.ola(120, 3);
                var L = self.limitesVisibles();
                [0, 1, 2, 3].forEach(function (i) {
                    setTimeout(function () {
                        if (self.fiesta) self.fuegoPapel(L.x0 + 260 + Math.random() * (L.x1 - L.x0 - 520), 150 + Math.random() * 220, [COLORES[i % COLORES.length]].concat(PAPEL));
                    }, 300 + i * 420);
                });
                return self.anim.agregar(reducido ? 300 : 2400, function (u) {
                    if (!reducido) {
                        var k = suave(Math.min(1, u * 2.5));
                        self.camara(lerp(cx, W / 2, k), lerp(cy, H / 2, k), lerp(z, 1, k));
                    }
                    self.bins.forEach(function (b, i) { b.luz = { color: COLORES[(Math.floor(u * 14) + i) % COLORES.length], a: 0.9 }; });
                });
            }).then(function () {
                fin();
                self.bins.forEach(function (b) { b.luz = { color: VERDE, a: 0.7 }; });
                avisar("cine", false);
            }, function (err) {
                fin();
                avisar("cine", false);
                throw err;
            });
        }

        terminarFiesta() {
            this.fiesta = false;
            this.verChip(true);
            this.bins.forEach(function (b) { b.escala = 1; b.salto = 0; });
        }

        // ---------------------------------------------------------------- bucle

        animarBins(dt, ts) {
            var self = this;
            this.bins.forEach(function (b) {
                b.hover += (b.hoverObj - b.hover) * Math.min(1, dt / 90);
                // la compuerta se entreabre al pasar un objeto por encima y se abre del todo al recibirlo
                var meta = Math.max(b.abreObj, b.hover * 0.35);
                b.abre += (meta - b.abre) * Math.min(1, dt / (meta > b.abre ? 70 : 110));
                var temblor = 0;
                if (b.tiembla > 0) {
                    b.tiembla = Math.max(0, b.tiembla - dt);
                    temblor = Math.sin(b.tiembla * 0.07) * 7 * (b.tiembla / 480);
                }
                var salto = (b.salto || 0) * 22;
                var e = b.k * (b.escala || 1) * (1 + b.hover * 0.03);
                var x = b.x + (b.dx || 0) + temblor, y = b.y - salto;
                b.placa.setPosition(x - temblor, b.placaY);
                b.texto.setPosition(x - temblor, b.placaY);
                b.franja.setPosition(x - temblor, b.placaY + 31);
                b.cuerpo.setPosition(x, y).setScale(b.cuerpo.base * e, b.cuerpo.base * e * (1 - (b.salto || 0) * 0.04));
                var boca = { x: x, y: y + BOCA_DY * e };
                b.tapa.setPosition(boca.x, boca.y - 2 - b.abre * 48 * e).setScale(b.tapa.base * e, b.tapa.base * e * (1 - b.abre * 0.62)).setRotation(temblor * 0.004);
                b.tapa.setAlpha(1 - b.abre * 0.15);
                b.iconos.forEach(function (ic) {
                    var lat = 1 + (ic.latido || 0) * 0.18;
                    ic.img.setPosition(x + ic.dx * e, y + VENTANA_DY * e).setScale(ic.k * e * lat);
                    ic.marca.setPosition(ic.img.x + (b.iconos.length > 1 ? 26 : 44) * e, ic.img.y - 30 * e);
                });
                b.led.setPosition(x + 82 * e, y - 40 * e);
                // luz: estado (verde/naranja/celebración) o reposo cian que respira
                var a = b.luz.a;
                var ayuda = b.ayuda * (0.5 + 0.5 * Math.sin(ts * 9));
                var glowA = Math.max(a * (b.luz.color === NARANJA ? 0.95 : 0.6), b.hover * 0.45, ayuda * 0.6);
                var color = b.hover > 0.5 && a < 0.3 ? 0xe3fafc : (ayuda > a ? 0xfff3a0 : b.luz.color);
                b.glow.setPosition(x, y).setScale(b.glow.base * b.k).setTint(color).setAlpha(glowA);
                // error: el cuerpo se tiñe de naranja suave mientras dura la señal
                if (b.luz.color === NARANJA && a > 0.02) {
                    var t = Math.min(1, a) * 0.75;
                    var gC = Math.round(255 - (255 - 0xb0) * t), bC = Math.round(255 - (255 - 0x70) * t);
                    b.cuerpo.setTint((255 << 16) | (gC << 8) | bC);
                    b.tenido = true;
                } else if (b.tenido) {
                    b.cuerpo.clearTint();
                    b.tenido = false;
                }
                b.led.setTint(a > 0.2 ? b.luz.color : (b.hover > 0.5 ? 0xffffff : CIAN)).setAlpha(Math.max(0.35 + 0.25 * Math.sin(ts * 2 + b.fase), a, b.hover));
                // la luz de estado se apaga sola
                if (!self.fiesta && a > 0) b.luz.a = Math.max(0, a - dt / 2200);
            });
        }

        update(time, delta) {
            var dt = Math.min(delta, 60);
            this.t += dt;
            var ts = this.t / 1000;
            this.anim.update(dt);
            this.seguirArrastre(dt);
            this.animarAmbiente(dt, ts);
            this.animarBins(dt, ts);
            this.objs.forEach(function (o) {
                if (o.estado === "cola" || o.estado === "clasificado" || o.estado === "en-demo") return;
                var lev = o.estado === "arrastrando";
                if (o.estado === "cinta") {
                    var p = escena.puntoCinta(o);
                    var salto = o.salto ? Math.abs(Math.sin(ts * 6)) * 24 * o.salto : 0;
                    o.img.y = p.y + Math.sin(ts * 1.6 + o.fase) * 2.5 - salto;
                    o.img.x = p.x;
                    o.img.rotation = Math.sin(ts * 1.1 + o.fase) * 0.02;
                }
                o.img.setScale(o.img.base * o.esc);
                // contorno brillante y sombra mientras se arrastra
                var cA = lev ? 0.85 + 0.15 * Math.sin(ts * 8) : (o.estado === "absorbiendo" ? o.contorno.alpha : (escena.ayuda && escena.ayuda.o === o ? o.contorno.alpha : 0));
                o.contorno.setPosition(o.img.x, o.img.y).setRotation(o.img.rotation).setScale(o.contorno.base * o.esc * 1.02);
                if (lev) o.contorno.setTint(0xfff3a0);
                o.contorno.setAlpha(o.contorno.alpha + (cA - o.contorno.alpha) * Math.min(1, dt / 90));
                var sA = lev ? 0.5 : 0;
                o.sombra.setAlpha(o.sombra.alpha + (sA - o.sombra.alpha) * Math.min(1, dt / 100));
                if (lev) o.sombra.setPosition(o.img.x + 18, o.img.y + 95 * o.k * o.esc).setScale(o.sombra.base * o.esc);
            });
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
            Promise.all([document.fonts.load("700 27px Fredoka"), document.fonts.load("600 23px Fredoka")]),
            sleep(1500)
        ]).catch(function () { /* sin la fuente queda Arial */ });
    }

    function crearJuego() {
        juego = new Phaser.Game({
            type: Phaser.AUTO,
            parent: el,
            transparent: false,
            backgroundColor: "#173a78",
            banner: false,
            scale: { mode: Phaser.Scale.ENVELOP, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
            input: { activePointers: 2 },
            render: { antialias: true },
            scene: [EscenaEstacion]
        });
        global.__escenarioEstacion = juego;
        global.__pedniaPhaserGame = juego;
    }

    // ------------------------------------------------------------------ API pública

    global.EscenarioEstacion = {
        xsContenedores: xsContenedores,
        xsCinta: xsCinta,
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
        al: function (nombre, fn) { cb[nombre] = fn; },
        reacomodar: function () {
            if (!juego) return;
            juego.scale.refresh();
            if (escena) {
                escena.limites = escena.limitesVisibles();
                escena.pintarHud();
            }
        },
        cargar: function (info) { if (escena) escena.cargar(info); },
        cambiarNivel: function (info) { return escena ? escena.cambiarNivel(info) : Promise.resolve(); },
        arrastre: function (on) {
            if (!escena) return;
            escena.arrastreOn = !!on;
            if (!on && escena.arrastrando) escena.devolver(escena.arrastrando.id);
        },
        aceptar: function (id, binId, op) { return escena ? escena.aceptar(id, binId, op) : Promise.resolve(); },
        rechazar: function (id, binId, fallos) { return escena ? escena.rechazar(id, binId, fallos) : Promise.resolve(); },
        devolver: function (id) { return escena ? escena.devolver(id) : Promise.resolve(); },
        deshacer: function (id) { return escena ? escena.deshacer(id) : Promise.resolve(); },
        pulsoAyuda: function (id, binId) { if (escena) escena.pulsoAyuda(id, binId); },
        limpiarAyuda: function () { if (escena) escena.limpiarAyuda(); },
        progreso: function (h, t, colores) { if (escena) escena.progreso(h, t, colores); },
        mostrarProgreso: function (on) { if (escena) escena.mostrarProgreso(on); },
        resaltarEtiquetas: function () { if (escena) escena.resaltarEtiquetas(); },
        /** La demo resalta el contenedor correcto mientras la mano lleva el objeto. */
        resaltarBin: function (id, on) {
            var b = escena && escena.bin(id);
            if (b) b.ayuda = on ? 1 : 0;
        },
        celebrarNivel: function (tipo) { return escena ? escena.celebrarNivel(tipo) : Promise.resolve(); },
        cinematica: function () { return escena ? escena.cinematica() : Promise.resolve(); },
        terminarFiesta: function () { if (escena) escena.terminarFiesta(); },
        /** Objetos que están en la cinta ahora mismo (se pueden tomar). */
        enCinta: function () {
            return escena ? escena.objs.filter(function (o) { return o.estado === "cinta"; }).map(function (o) { return o.id; }) : [];
        },
        // demo y pruebas: coordenadas de pantalla
        puntoCliente: function (id) {
            var o = escena && escena.obj(id);
            return o ? aPantalla(o.img.x, o.img.y) : null;
        },
        puntoBinCliente: function (id) {
            var b = escena && escena.bin(id);
            if (!b) return null;
            var boca = escena.bocaDe(b);
            return aPantalla(boca.x, boca.y - 30);
        },
        tomarDemo: function (id) {
            var o = escena && escena.obj(id);
            if (!o || o.estado !== "cinta") return;
            escena.demo = true;
            escena.tomar(o, o.img.x, o.img.y);
        },
        ponerCliente: function (id, x, y) {
            var o = escena && escena.obj(id);
            if (!o || o !== escena.arrastrando) return;
            var p = aMundo(x, y);
            o.offset = { x: 0, y: 0 };
            o.objetivo = { x: p.x, y: p.y };
        },
        finDemo: function () { if (escena) escena.demo = false; },
        estado: function () {
            if (!escena) return null;
            return {
                contenedores: escena.bins.map(function (b) {
                    return { id: b.id, x: Math.round(b.x), y: Math.round(b.y), recibidos: b.recibidos.length, abre: Math.round(b.abre * 100) / 100 };
                }),
                objetos: escena.objs.map(function (o) {
                    return { id: o.id, estado: o.estado, x: Math.round(o.img.x), y: Math.round(o.img.y), slot: o.slot ? Math.round(o.slot.x) : null };
                }),
                cola: escena.cola.map(function (o) { return o.id; }),
                hud: escena.hud,
                arrastrando: escena.arrastrando ? escena.arrastrando.id : null
            };
        }
    };
})(typeof window !== "undefined" ? window : global);
