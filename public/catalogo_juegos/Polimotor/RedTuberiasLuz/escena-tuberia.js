/**
 * EscenarioTuberia — escena Phaser 4 de "¡La Red de Tuberías!" (window.EscenarioTuberia).
 *
 * Dibuja el laboratorio, el generador de luz, la tubería del nivel, los checkpoints, la gema, la estela de energía
 * y el reactor; maneja la entrada (un solo puntero controla la gema: el que la tomó). No decide nada: cada cuadro le
 * pasa el dedo a ReglasTuberia.conducir() y avisa los eventos (tomar, mover, checkpoint, fuera, vuelve, perdida,
 * soltar, meta, tocaFuera) a script.js.
 *
 * Mundo de diseño 1600 × 900 con Scale.ENVELOP: llena la pantalla; lo jugable queda entre x 175 y 1400, que cabe en
 * 4:3 (1024 × 768) sin tocar los botones de las esquinas. Cada animación que el flujo espera es una Promise con
 * respaldo por tiempo (Animador): con la pestaña oculta los cuadros no corren.
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser;
    var W = 1600, H = 900;
    var CONSOLA = { x: 800, y: 852, sep: 84 };
    var MAGENTA = 0xff6bd6, CIAN = 0x3bdcff, AMBAR = 0xffc94d, VERDE = 0x4ade80;

    var D = function () { return global.DibujosTuberia; };
    var R = function () { return global.ReglasTuberia; };

    var juego = null, escena = null, el = null, cfg = null, espera = null;
    var cb = {};

    function avisar(nombre, a) {
        var f = cb[nombre];
        if (typeof f === "function") {
            try { f(a); } catch (e) { console.warn("[EscenarioTuberia]", nombre, e); }
        }
    }

    function suave(u) { return u * u * (3 - 2 * u); }
    function saleSuave(u) { return 1 - Math.pow(1 - u, 3); }
    function lerp(a, b, u) { return a + (b - a) * u; }
    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    function jcfg() { return (cfg && cfg.juego) || {}; }
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);

    // ------------------------------------------------------------------ animador con respaldo por tiempo

    function Animador() { this.lista = []; }

    Animador.prototype.agregar = function (dur, fn) {
        var self = this;
        return new Promise(function (resolve) {
            var a = { t: 0, dur: Math.max(1, dur), fn: fn, resolve: resolve, hecho: false };
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
            var v = (o.vel || 240) * (0.45 + Math.random() * 0.7);
            var tx = tipos[Math.floor(Math.random() * tipos.length)];
            p.vivo = true;
            p.t = 0;
            p.vida = (o.vida || 700) * (0.7 + Math.random() * 0.5);
            p.vx = Math.cos(ang) * v;
            p.vy = Math.sin(ang) * v;
            p.grav = o.grav != null ? o.grav : 0;
            p.giro = (Math.random() - 0.5) * (o.giro || 6);
            p.esc = (o.escala || 0.35) * (0.6 + Math.random() * 0.7) / D().res(tx);
            p.img.setTexture(tx);
            p.img.setBlendMode(Phaser.BlendModes.ADD);
            p.img.setTint(o.tintes ? o.tintes[Math.floor(Math.random() * o.tintes.length)] : 0xffffff);
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
            p.vx *= 0.985;
            p.vy *= 0.985;
            p.img.x += p.vx * s;
            p.img.y += p.vy * s;
            p.img.rotation += p.giro * s;
            p.img.setAlpha(1 - u * u);
            p.img.setScale(p.esc * (1 - u * 0.5));
        }
    };

    Particulas.prototype.apagar = function () {
        this.lista.forEach(function (p) { p.vivo = false; p.img.setVisible(false); });
    };

    // ------------------------------------------------------------------ utilidades de imagen

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

    // ------------------------------------------------------------------ escena

    var EscenaTuberia = Phaser ? class extends Phaser.Scene {
        constructor() { super({ key: "Tuberia" }); }

        create() {
            var self = this;
            D().claves().forEach(function (k) { tex(self, k); });
            this.anim = new Animador();
            this.t = 0;
            this.red = null;
            this.est = null;
            this.entradaOn = false;
            this.ptrId = null;
            this.ptr = null;
            this.vis = { s: 0, maxS: 0, activo: false };     // durante el regreso, la gema y la estela se dibujan aquí
            this.dibujadoS = -99;
            this.estado = "oculta";                          // oculta · lista · conduciendo · fuera · pausa · regresando · meta
            this.fiesta = 0;
            this.giroExtra = 0;
            this.carga = 0;                                  // 0..1 energía que llega al reactor (sigue al progreso)
            this.mostrarConsola = true;
            this.nivelesInfo = { total: 4, actual: 0, hechos: 0 };
            this.ultimaChispa = 0;
            this.tAyuda = 0;
            this.sAyuda = 0;

            img(this, W / 2, H / 2, "taller").setDepth(0);
            this.engranajes = [
                img(this, 1446, 180, "engranaje-a", 0.8).setDepth(1).setAlpha(0.9),
                img(this, 1372, 236, "engranaje-b", 0.45).setDepth(1).setAlpha(0.9),
                img(this, 196, 796, "engranaje-b", 0.7).setDepth(1).setAlpha(0.85),
                img(this, 1420, 780, "engranaje-a", 0.6).setDepth(1).setAlpha(0.85)
            ];
            this.engranajes.forEach(function (g, i) { g.vel = (i % 2 ? -1 : 1) * (0.25 + i * 0.05); });

            // lucecitas del laboratorio que parpadean
            this.luces = [];
            for (var i = 0; i < 12; i++) {
                var l = img(this, 180 + Math.random() * 1240, 150 + Math.random() * 600, "punto", 0.32).setDepth(1).setBlendMode(Phaser.BlendModes.ADD);
                l.setTint([CIAN, MAGENTA, 0xffd43b, 0xc77dff][i % 4]);
                l.fase = Math.random() * 6;
                this.luces.push(l);
            }

            this.tuboImg = null;
            this.estela = this.add.graphics().setDepth(7).setBlendMode(Phaser.BlendModes.ADD);
            this.pulsos = [];
            for (var p = 0; p < 9; p++) {
                this.pulsos.push(img(this, -100, -100, "punto", 0.55).setDepth(9).setBlendMode(Phaser.BlendModes.ADD).setTint(p % 3 ? MAGENTA : 0xffffff).setVisible(false));
            }
            this.adelante = [];
            for (var a = 0; a < 6; a++) {
                this.adelante.push(img(this, -100, -100, "punto", 0.42).setDepth(8).setBlendMode(Phaser.BlendModes.ADD).setTint(MAGENTA).setVisible(false));
            }
            this.luzGuia = img(this, -100, -100, "halo", 0.5).setDepth(9).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffe066).setVisible(false);

            // generador de luz
            this.genLuz = img(this, 0, 0, "halo", 0.9).setDepth(9).setBlendMode(Phaser.BlendModes.ADD).setTint(MAGENTA).setAlpha(0.5);
            this.generador = img(this, 0, 0, "generador").setDepth(10);
            this.genChispa = img(this, 0, 0, "halo", 0.45).setDepth(11).setBlendMode(Phaser.BlendModes.ADD).setTint(CIAN).setAlpha(0.6);

            // reactor
            this.reactorAura = img(this, 0, 0, "halo", 2.4).setDepth(9).setBlendMode(Phaser.BlendModes.ADD).setTint(MAGENTA).setAlpha(0);
            this.reactor = img(this, 0, 0, "reactor").setDepth(10);
            this.nucleo = img(this, 0, 0, "nucleo", 0.84).setDepth(11).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.25);
            this.anillo = img(this, 0, 0, "anillo", 0.86).setDepth(12).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.45);
            this.medidor = this.add.graphics().setDepth(12);
            this.rayos = [];
            for (var r = 0; r < 14; r++) {
                this.rayos.push(img(this, 0, 0, "rayo", 1).setDepth(13).setBlendMode(Phaser.BlendModes.ADD).setOrigin(0, 0.5).setVisible(false));
            }

            this.collares = [];
            this.hilo = this.add.graphics().setDepth(18);

            // la gema
            this.gemaHalo = img(this, 0, 0, "halo", 0.75).setDepth(20).setBlendMode(Phaser.BlendModes.ADD).setTint(MAGENTA).setVisible(false);
            this.gemaAro = img(this, 0, 0, "aro", 0.5).setDepth(19).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffffff).setVisible(false);
            this.gema = img(this, 0, 0, "gema", 0.6).setDepth(21).setVisible(false);
            this.gemaBrillo = img(this, 0, 0, "chispa", 0.5).setDepth(22).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);

            // consola de niveles (abajo al centro)
            this.consola = [];
            this.particulas = new Particulas(this, 90, 30);
            this.flash = this.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 1).setDepth(40).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);

            this.crearEntrada();
            this.limites = null;
            escena = this;
            if (espera) {
                var e = espera;
                espera = null;
                e(true);
            }
        }

        // ------------------------------------------------------------------ entrada (un solo puntero)

        crearEntrada() {
            var self = this;
            var mundo = function (p) {
                self.scale.updateBounds();
                return { x: p.worldX, y: p.worldY };
            };
            this.input.on("pointerdown", function (p) {
                if (!self.entradaOn || !self.red || self.ptrId !== null) return;
                var w = mundo(p);
                if (self.estado === "lista" && R().tocaGema(self.red, self.est, w.x, w.y, jcfg())) {
                    self.tomar(p.id, w);
                } else {
                    avisar("tocaFuera", w);
                }
            });
            this.input.on("pointermove", function (p) {
                if (self.ptrId === null || p.id !== self.ptrId) return;
                self.ptr = mundo(p);
            });
            var arriba = function (p) {
                if (self.ptrId === null || (p && p.id !== self.ptrId)) return;
                self.liberar();
            };
            this.input.on("pointerup", arriba);
            this.input.on("pointerupoutside", arriba);
            var perder = function () { if (self.ptrId !== null && self.ptrId !== "demo") self.liberar(); };
            var lienzo = this.game.canvas;
            if (lienzo) {
                lienzo.addEventListener("pointercancel", perder);
                lienzo.addEventListener("touchcancel", perder);
                lienzo.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });
            }
            global.addEventListener("blur", perder);
            document.addEventListener("visibilitychange", function () { if (document.hidden) perder(); });
        }

        tomar(id, w) {
            this.ptrId = id;
            this.ptr = w;
            R().tomar(this.est);
            this.estado = "conduciendo";
            this.gemaAro.setVisible(false);
            this.particulas.emitir(this.est.x, this.est.y, { n: 12, vel: 200, tintes: [MAGENTA, 0xffffff, CIAN], escala: 0.32 });
            this.onda(this.est.x, this.est.y, MAGENTA, 0.6);
            avisar("tomar", { s: this.est.s });
        }

        /** El dedo se levantó (o se perdió): la gema se detiene, parpadea y vuelve al último checkpoint. */
        liberar() {
            var est = this.est;
            this.ptrId = null;
            this.ptr = null;
            this.hilo.clear();
            if (!est || est.enMeta) return;
            var desdeMax = est.maxS;
            var r = R().soltar(this.red, est);
            avisar("soltar", { desde: r.desde, hasta: r.hasta, cp: est.cp });
            this.regresar(r.desde, r.hasta, desdeMax, "soltar");
        }

        /** Pausa visible (la gema parpadea en su sitio) y regreso suave por el tubo hasta el checkpoint. */
        regresar(desde, hasta, desdeMax, motivo) {
            var self = this;
            this.estado = "pausa";
            this.vis = { s: desde, maxS: desdeMax, activo: true };
            var dur = Math.max(350, Math.min(1500, Math.abs(desde - hasta) / 520 * 1000));
            var pausa = reducido ? 120 : 520;
            return this.anim.agregar(pausa, function (u) {
                self.gema.setAlpha(0.55 + 0.45 * Math.abs(Math.cos(u * Math.PI * 3)));
            }).then(function () {
                if (self.estado !== "pausa") return;
                self.estado = "regresando";
                self.gema.setAlpha(1);
                avisar("regreso", { motivo: motivo, hasta: hasta });
                return self.anim.agregar(reducido ? 150 : dur, function (u) {
                    var k = suave(u);
                    self.vis.s = lerp(desde, hasta, k);
                    self.vis.maxS = lerp(desdeMax, hasta, k);
                });
            }).then(function () {
                if (self.estado !== "regresando" && self.estado !== "pausa") return;
                self.vis.activo = false;
                self.estado = "lista";
                self.dibujadoS = -99;
                avisar("listaDeNuevo", { s: hasta });
            });
        }

        // ------------------------------------------------------------------ cargar un nivel

        cargar(def) {
            var self = this;
            this.anim.limpiar();
            this.particulas.apagar();
            this.terminarFiesta();
            this.camara(W / 2, H / 2, 1);
            this.red = R().construir(def, jcfg());
            this.est = R().nuevoEstado(this.red);
            this.ptrId = null;
            this.ptr = null;
            this.vis = { s: 0, maxS: 0, activo: false };
            this.estado = "oculta";
            this.carga = 0;
            this.dibujadoS = -99;
            this.estela.clear();
            this.hilo.clear();
            this.luzGuia.setVisible(false);
            this.tAyuda = 0;

            var clave = "tubo-" + (def.id || 0);
            if (this.tuboImg) {
                this.tuboImg.destroy();
                this.tuboImg = null;
            }
            if (this.textures.exists(clave)) this.textures.remove(clave);
            var k = Math.min(2, Math.max(1, (global.devicePixelRatio || 1) * 0.9));
            this.textures.addCanvas(clave, D().tubo(this.red, k));
            this.tuboImg = this.add.image(W / 2, H / 2, clave).setDepth(5).setScale(1 / k).setAlpha(0);

            var ini = this.red.inicio, fin = this.red.meta;
            var G = D().GEN, Rr = D().REA;
            this.generador.setPosition(ini.x - (G.px - G.w / 2), ini.y - (G.py - G.h / 2)).setAlpha(0);
            this.genLuz.setPosition(this.generador.x, this.generador.y - 4).setAlpha(0);
            this.genChispa.setPosition(ini.x - 10, ini.y).setAlpha(0);
            this.reactor.setPosition(fin.x + (Rr.w / 2 - Rr.px), fin.y + (Rr.h / 2 - Rr.py)).setAlpha(0);
            this.nucleoPos = { x: this.reactor.x + 10, y: fin.y };
            this.nucleo.setPosition(this.nucleoPos.x, this.nucleoPos.y).setAlpha(0);
            this.anillo.setPosition(this.nucleoPos.x, this.nucleoPos.y).setAlpha(0);
            this.reactorAura.setPosition(this.nucleoPos.x, this.nucleoPos.y).setAlpha(0);
            this.medidorPos = { x: this.reactor.x + 50, y: fin.y - 74 + 4, w: 18, h: 140 };

            this.collares.forEach(function (c) { c.collar.destroy(); c.led.destroy(); c.brillo.destroy(); });
            this.collares = this.red.checkpoints.map(function (cp) {
                var n = R().normal(cp.ang);
                if (n.y > 0) n = { x: -n.x, y: -n.y };
                // collar ámbar = punto de control pendiente; al pasarlo se pone verde
                var col = img(self, cp.x, cp.y, "collar").setDepth(6).setRotation(cp.ang).setAlpha(0).setTint(AMBAR);
                col.setScale(col.base * 1.15, col.base * (self.red.ancho + 60) / 160);
                var dl = self.red.ancho / 2 + 36;
                var led = img(self, cp.x + n.x * dl, cp.y + n.y * dl, "led", 0.7).setDepth(13).setTint(AMBAR).setAlpha(0);
                var brillo = img(self, led.x, led.y, "halo", 0.36).setDepth(12).setBlendMode(Phaser.BlendModes.ADD).setTint(AMBAR).setAlpha(0);
                return { cp: cp, collar: col, led: led, brillo: brillo, on: false };
            });

            this.gema.setVisible(false);
            this.gemaHalo.setVisible(false);
            this.gemaAro.setVisible(false);
            this.gemaBrillo.setVisible(false);
            this.pintarConsola();
            return this.red;
        }

        /** Presentación del nivel: aparecen la tubería y las máquinas, una luz recorre el tubo y nace la gema. */
        presentar() {
            var self = this;
            var red = this.red;
            if (!red) return Promise.resolve();
            var piezas = [this.tuboImg, this.generador, this.reactor];
            return this.anim.agregar(reducido ? 100 : 600, function (u) {
                piezas.forEach(function (p) { if (p) p.setAlpha(u); });
                self.collares.forEach(function (c) { c.collar.setAlpha(u); c.led.setAlpha(u); });
                self.nucleo.setAlpha(0.25 * u);
                self.anillo.setAlpha(0.45 * u);
                self.genLuz.setAlpha(0.5 * u);
                self.genChispa.setAlpha(0.6 * u);
            }).then(function () {
                avisar("barrido", {});
                self.luzGuia.setVisible(true).setTint(0xffffff);
                return self.anim.agregar(reducido ? 150 : 1300, function (u) {
                    var p = R().puntoEn(red, red.largo * suave(u));
                    self.luzGuia.setPosition(p.x, p.y).setAlpha(Math.sin(u * Math.PI) * 0.9 + 0.1);
                    if (Math.random() < 0.35) self.particulas.emitir(p.x, p.y, { n: 1, vel: 60, tintes: [CIAN, MAGENTA], escala: 0.22, vida: 500 });
                });
            }).then(function () {
                self.luzGuia.setVisible(false);
                self.onda(self.nucleoPos.x, self.nucleoPos.y, CIAN, 0.8);
                var ini = red.inicio;
                self.gema.setVisible(true).setPosition(ini.x, ini.y).setScale(0.01);
                self.gemaHalo.setVisible(true).setPosition(ini.x, ini.y).setAlpha(0);
                self.particulas.emitir(ini.x, ini.y, { n: 16, vel: 220, tintes: [MAGENTA, 0xffffff, 0xc77dff], escala: 0.34 });
                avisar("gemaAparece", {});
                return self.anim.agregar(reducido ? 100 : 520, function (u) {
                    var k = u < 0.7 ? saleSuave(u / 0.7) * 1.15 : lerp(1.15, 1, (u - 0.7) / 0.3);
                    self.gema.setScale(self.gema.base * k);
                    self.gemaHalo.setAlpha(0.7 * u);
                });
            }).then(function () {
                self.estado = "lista";
            });
        }

        // ------------------------------------------------------------------ cuadro a cuadro

        update(time, delta) {
            var dt = Math.min(50, delta || 16);
            this.t += dt;
            this.anim.update(dt);
            this.particulas.update(dt);
            this.animarAmbiente(dt);
            if (!this.red) return;
            if (this.ptrId !== null && this.ptr && this.est.conectado) this.conducir(dt);
            this.pintarGema(dt);
            this.pintarEstela();
            this.pintarPulsos();
            this.pintarReactor(dt);
            this.pintarAyuda(dt);
            var t = this.t;
            this.collares.forEach(function (c, i) {
                if (!c.on && c.led.alpha > 0.5) c.brillo.setAlpha(0.25 + 0.2 * Math.sin(t / 380 + i));
            });
        }

        conducir(dt) {
            var est = this.est;
            var x0 = est.x, y0 = est.y;
            // sub-pasos: con un cuadro largo (tableta lenta) la gema sigue el tubo igual de fiel
            var n = Math.max(1, Math.ceil(dt / 17));
            var res = null;
            for (var i = 0; i < n; i++) {
                res = R().conducir(this.red, est, this.ptr.x, this.ptr.y, dt / n, jcfg());
                for (var k = 0; k < res.checkpoints.length; k++) this.activarCheckpoint(res.checkpoints[k]);
                if (res.evento && res.evento !== "vuelve" && res.evento !== "fuera") break;
                if (res.evento === "fuera") break;
            }
            if (!res) return;
            if (res.evento === "fuera") {
                this.estado = "fuera";
                avisar("fuera", { s: est.s });
            } else if (res.evento === "vuelve") {
                this.estado = "conduciendo";
                this.hilo.clear();
                avisar("vuelve", { s: est.s });
            } else if (res.evento === "perdida") {
                // el dedo se quedó fuera del tubo: la gema vuelve al checkpoint y hay que tomarla otra vez
                this.ptrId = null;
                this.ptr = null;
                this.hilo.clear();
                avisar("perdida", { hasta: est.s, cp: est.cp });
                this.regresar(this.ultimoS || est.s, est.s, this.ultimoMax || est.s, "perdida");
                return;
            } else if (res.evento === "meta") {
                this.ptrId = null;
                this.ptr = null;
                this.estado = "meta";
                avisar("meta", {});
                return;
            }
            if (this.estado === "fuera") {
                this.pintarHilo();
            }
            this.ultimoS = est.s;
            this.ultimoMax = est.maxS;
            var mov = Math.hypot(est.x - x0, est.y - y0);
            if (mov > 0.3) {
                this.ultimaChispa += mov;
                if (this.ultimaChispa > 26) {
                    this.ultimaChispa = 0;
                    var ang = Math.atan2(y0 - est.y, x0 - est.x);
                    this.particulas.emitir(est.x, est.y, { n: 2, vel: 90, angulo: ang, apertura: 1.4, tintes: [MAGENTA, CIAN, 0xffffff], escala: 0.24, vida: 520 });
                }
            }
            avisar("mover", { vel: mov / dt * 1000, progreso: R().progreso(this.red, est) });
        }

        pintarHilo() {
            var g = this.hilo;
            g.clear();
            if (!this.ptr) return;
            var x0 = this.est.x, y0 = this.est.y, x1 = this.ptr.x, y1 = this.ptr.y;
            var l = Math.hypot(x1 - x0, y1 - y0);
            var n = Math.floor(l / 18);
            g.fillStyle(AMBAR, 0.85);
            for (var i = 1; i < n; i++) {
                var u = i / n;
                g.fillCircle(lerp(x0, x1, u), lerp(y0, y1, u), 4 + 2 * Math.sin(this.t / 120 + i));
            }
            g.lineStyle(4, AMBAR, 0.9);
            g.strokeCircle(x1, y1, 16 + 4 * Math.sin(this.t / 140));
        }

        posGema() {
            if (this.vis.activo && this.estado === "regresando") {
                var p = R().puntoEn(this.red, this.vis.s);
                return { x: p.x, y: p.y };
            }
            return { x: this.est.x, y: this.est.y };
        }

        pintarGema(dt) {
            if (!this.gema.visible || this.estado === "meta" || this.estado === "oculta") {
                this.gemaAro.setVisible(false);
                return;
            }
            var p = this.posGema();
            var t = this.t;
            var flota = Math.sin(t / 260) * 2;
            this.gema.setPosition(p.x, p.y + flota).setRotation(Math.sin(t / 700) * 0.12);
            this.gemaHalo.setPosition(p.x, p.y);
            this.gemaBrillo.setPosition(p.x - 10, p.y - 14 + flota);
            var conduce = this.estado === "conduciendo";
            if (this.estado === "fuera") {
                // señal suave: la gema titila en ámbar y espera
                var u = 0.5 + 0.5 * Math.sin(t / 110);
                this.gema.setTint(Phaser.Display.Color.GetColor(255, Math.round(200 + 55 * u), Math.round(120 + 135 * u)));
                this.gemaHalo.setTint(AMBAR).setAlpha(0.5 + 0.3 * u).setScale(this.gemaHalo.base * (1 + 0.1 * u));
            } else {
                this.gema.clearTint();
                var pulso = conduce ? 1.15 + 0.1 * Math.sin(t / 90) : 0.85 + 0.15 * Math.sin(t / 380);
                this.gemaHalo.setTint(MAGENTA).setAlpha(conduce ? 0.95 : 0.7).setScale(this.gemaHalo.base * pulso);
            }
            var b = (t / 900) % 1;
            this.gemaBrillo.setVisible(true).setAlpha(Math.max(0, Math.sin(b * Math.PI)) * 0.9).setScale(this.gemaBrillo.base * (0.4 + b * 0.6)).setRotation(b * 2);
            // aro "pon aquí tu dedo" mientras espera
            if (this.estado === "lista" && this.entradaOn) {
                var a = (t / 1100) % 1;
                this.gemaAro.setVisible(true).setPosition(p.x, p.y).setAlpha((1 - a) * 0.85).setScale(this.gemaAro.base * (0.75 + a * 0.75));
            } else {
                this.gemaAro.setVisible(false);
            }
        }

        sEstela() {
            return this.vis.activo ? this.vis.maxS : this.est.maxS;
        }

        pintarEstela() {
            var s = this.sEstela();
            if (Math.abs(s - this.dibujadoS) < 1.5) return;
            this.dibujadoS = s;
            var g = this.estela;
            g.clear();
            if (s < 4) return;
            var red = this.red;
            var m = red.muestras;
            var fin = Math.min(m.length - 1, Math.round(s / red.paso));
            var pts = [];
            for (var i = 0; i <= fin; i += 2) pts.push({ x: m[i].x, y: m[i].y });
            pts.push({ x: m[fin].x, y: m[fin].y });
            if (pts.length < 2) return;
            g.lineStyle(red.ancho * 0.92, CIAN, 0.2);
            g.strokePoints(pts, false, false);
            g.lineStyle(red.ancho * 0.56, 0x7b8cff, 0.32);
            g.strokePoints(pts, false, false);
            g.lineStyle(red.ancho * 0.3, MAGENTA, 0.6);
            g.strokePoints(pts, false, false);
            g.lineStyle(red.ancho * 0.1, 0xffffff, 0.85);
            g.strokePoints(pts, false, false);
        }

        /** Pulsos de luz que viajan por el tramo iluminado y puntos que anticipan el tramo siguiente. */
        pintarPulsos() {
            var red = this.red;
            var s = this.sEstela();
            var vel = this.fiesta ? 0.9 : 0.42;
            var n = this.pulsos.length;
            for (var i = 0; i < n; i++) {
                var im = this.pulsos[i];
                if (s < 60 || this.estado === "oculta") { im.setVisible(false); continue; }
                var q = ((this.t * vel + i * (s / n)) % s);
                var p = R().puntoEn(red, q);
                im.setVisible(true).setPosition(p.x, p.y).setAlpha(0.55 + 0.45 * Math.sin(this.t / 160 + i));
            }
            var mostrar = this.estado === "lista" || this.estado === "conduciendo";
            var base = this.posS();
            for (var k = 0; k < this.adelante.length; k++) {
                var a = this.adelante[k];
                var sa = base + 46 + k * 38;
                if (!mostrar || sa > red.largo - 10) { a.setVisible(false); continue; }
                var pa = R().puntoEn(red, sa);
                var ola = Math.max(0, Math.sin(this.t / 220 - k * 0.7));
                a.setVisible(true).setPosition(pa.x, pa.y).setAlpha((0.15 + 0.6 * ola) * (1 - k / (this.adelante.length + 1)));
            }
        }

        posS() {
            return this.vis.activo ? this.vis.s : this.est.s;
        }

        pintarReactor(dt) {
            var objetivo = this.estado === "meta" ? 1 : R().progreso(this.red, { maxS: this.sEstela() });
            this.carga += (objetivo - this.carga) * Math.min(1, dt / 220);
            var c = this.carga;
            if (!this.fiesta && this.estado !== "meta") {
                this.nucleo.setAlpha(this.tuboImg && this.tuboImg.alpha > 0.5 ? 0.25 + 0.6 * c + 0.06 * Math.sin(this.t / 300) : this.nucleo.alpha)
                    .setScale(this.nucleo.base * (0.8 + 0.3 * c));
                this.anillo.rotation += dt / 1000 * (0.3 + 2.2 * c);
                this.reactorAura.setAlpha(0.25 * c);
            } else {
                this.anillo.rotation += dt / 1000 * 6;
            }
            // medidor de energía: 8 barras
            var g = this.medidor;
            g.clear();
            if (!this.tuboImg || this.tuboImg.alpha < 0.5) return;
            var m = this.medidorPos;
            var nb = 8;
            var llenas = this.estado === "meta" || this.fiesta ? nb : Math.floor(c * nb + 0.001);
            for (var i = 0; i < nb; i++) {
                var y = m.y + m.h - (i + 1) * (m.h / nb) + 3;
                var on = i < llenas;
                var col = i < 3 ? CIAN : (i < 6 ? 0xc77dff : MAGENTA);
                g.fillStyle(on ? col : 0x1b2a5c, on ? 0.95 : 1);
                g.fillRoundedRect(m.x - m.w / 2, y, m.w, m.h / nb - 5, 3);
            }
            // generador: late más fuerte mientras se conduce
            var cond = this.estado === "conduciendo";
            this.genLuz.setAlpha((cond ? 0.85 : 0.45) + 0.15 * Math.sin(this.t / (cond ? 90 : 320))).setScale(this.genLuz.base * (cond ? 1.12 : 1));
            this.genChispa.setAlpha(0.4 + 0.4 * Math.abs(Math.sin(this.t / (cond ? 70 : 260))));
        }

        animarAmbiente(dt) {
            var s = dt / 1000;
            var extra = this.fiesta ? 6 : this.giroExtra;
            this.engranajes.forEach(function (g) { g.rotation += g.vel * (1 + extra) * s; });
            var t = this.t;
            var ola = this.olaX;
            this.luces.forEach(function (l) {
                // durante la cinemática, la ola de energía deja encendidas las luces por donde pasa
                if (ola != null && l.x < ola) l.setAlpha(0.85 + 0.15 * Math.sin(t / 120 + l.fase)).setScale(l.base * 1.8);
                else l.setAlpha(0.25 + 0.5 * Math.max(0, Math.sin(t / 700 + l.fase))).setScale(l.base);
            });
            if (this.giroExtra > 0) this.giroExtra = Math.max(0, this.giroExtra - s * 1.2);
        }

        // ------------------------------------------------------------------ checkpoints

        activarCheckpoint(i) {
            var c = this.collares[i];
            if (!c || c.on) return;
            c.on = true;
            var self = this;
            c.led.setTint(VERDE);
            c.brillo.setTint(VERDE);
            this.onda(c.cp.x, c.cp.y, VERDE, 0.7);
            this.particulas.emitir(c.led.x, c.led.y, { n: 12, vel: 200, tintes: [VERDE, CIAN, 0xffffff], escala: 0.3 });
            this.giroExtra = 2;
            this.anim.agregar(700, function (u) {
                c.brillo.setAlpha(Math.sin(u * Math.PI) * 0.9 + (u > 0.5 ? 0.5 : 0) * u);
                c.collar.setTint(Phaser.Display.Color.GetColor(Math.round(lerp(140, 255, 1 - u)), 255, Math.round(lerp(180, 255, 1 - u))));
            }).then(function () {
                c.brillo.setAlpha(0.55);
                c.collar.setTint(0xa7f3c0);
            });
            avisar("checkpoint", { i: i, total: this.collares.length });
        }

        // ------------------------------------------------------------------ efectos

        onda(x, y, color, escala) {
            var o = img(this, x, y, "aro", 0.2).setDepth(26).setBlendMode(Phaser.BlendModes.ADD).setTint(color || 0xffffff);
            var b = o.base;
            this.anim.agregar(reducido ? 120 : 650, function (u) {
                o.setScale(b * (1 + u * 4 * (escala || 1))).setAlpha(1 - u);
            }).then(function () { o.destroy(); });
        }

        /** Ayuda: una luz dorada recorre el tramo siguiente y la gema destella. */
        pulsoAyuda() {
            if (!this.red) return;
            this.tAyuda = 2600;
            this.sAyuda = this.posS();
            var p = this.posGema();
            this.onda(p.x, p.y, 0xffe066, 0.8);
            this.particulas.emitir(p.x, p.y, { n: 10, vel: 160, tintes: [0xffe066, MAGENTA], escala: 0.3 });
        }

        pintarAyuda(dt) {
            if (this.tAyuda <= 0) {
                if (this.luzGuia.visible && this.estado !== "oculta" && !this.presentando) this.luzGuia.setVisible(false);
                return;
            }
            this.tAyuda -= dt;
            var u = 1 - Math.max(0, this.tAyuda) / 2600;
            var tramo = Math.min(this.red.largo - this.sAyuda, 340);
            var k = (u * 2) % 1;
            var p = R().puntoEn(this.red, this.sAyuda + tramo * k);
            this.luzGuia.setVisible(true).setTint(0xffe066).setPosition(p.x, p.y).setAlpha(Math.sin(k * Math.PI));
            if (this.tAyuda <= 0) this.luzGuia.setVisible(false);
        }

        limpiarAyuda() {
            this.tAyuda = 0;
            this.luzGuia.setVisible(false);
        }

        /** La gema entra al reactor: se achica en la boca, el núcleo se enciende, rayos y chispas. */
        llegar() {
            var self = this;
            var fin = this.red.meta;
            var desde = { x: this.est.x, y: this.est.y };
            this.estado = "meta";
            this.hilo.clear();
            this.limpiarAyuda();
            return this.anim.agregar(reducido ? 100 : 520, function (u) {
                var k = suave(u);
                var x = lerp(desde.x, self.nucleoPos.x, k), y = lerp(desde.y, self.nucleoPos.y, k);
                self.gema.setPosition(x, y).setScale(self.gema.base * (1 - 0.6 * k)).setAlpha(1 - u * 0.6);
                self.gemaHalo.setPosition(x, y).setAlpha(1).setScale(self.gemaHalo.base * (1 + u));
            }).then(function () {
                self.gema.setVisible(false);
                self.gemaHalo.setVisible(false);
                self.gemaBrillo.setVisible(false);
                avisar("conexion", {});
                self.dibujadoS = -99;
                self.particulas.emitir(self.nucleoPos.x, self.nucleoPos.y, { n: 30, vel: 380, tintes: [MAGENTA, CIAN, 0xffffff, 0xffd43b], escala: 0.4, tipos: ["chispa", "estrella"], vida: 900 });
                self.onda(self.nucleoPos.x, self.nucleoPos.y, MAGENTA, 1.2);
                self.onda(fin.x, fin.y, CIAN, 0.8);
                self.lanzarRayos(900);
                return self.anim.agregar(reducido ? 120 : 1100, function (u) {
                    var pico = Math.sin(Math.min(1, u * 1.4) * Math.PI);
                    self.nucleo.setAlpha(1).setScale(self.nucleo.base * (1.1 + 0.6 * pico));
                    self.reactorAura.setAlpha(0.5 + 0.5 * pico).setScale(self.reactorAura.base * (1 + 0.3 * pico));
                    self.flash.setAlpha(0.18 * Math.max(0, 1 - u * 3));
                });
            }).then(function () {
                self.reactorAura.setAlpha(0.45);
                self.nucleo.setScale(self.nucleo.base * 1.15);
            });
        }

        lanzarRayos(ms) {
            var self = this;
            var c = this.nucleoPos;
            this.rayos.forEach(function (r, i) {
                r.setVisible(true).setPosition(c.x, c.y).setRotation(i / self.rayos.length * Math.PI * 2).setTint(i % 2 ? MAGENTA : CIAN);
            });
            return this.anim.agregar(reducido ? 100 : ms, function (u) {
                self.rayos.forEach(function (r, i) {
                    r.rotation += 0.02;
                    r.setAlpha(Math.sin(u * Math.PI)).setScale(r.base * (0.4 + u * 1.4), r.base * (1 + 0.4 * Math.sin(u * 9 + i)));
                });
            }).then(function () { self.rayos.forEach(function (r) { r.setVisible(false); }); });
        }

        /** Gran final: el reactor estalla en ráfagas de neón, los engranajes giran y el laboratorio se ilumina. */
        celebrarFinal() {
            var self = this;
            this.fiesta = 1;
            var tiros = 0;
            var lanzar = function () {
                if (!self.fiesta) return;
                tiros++;
                var x = 300 + Math.random() * 1000, y = 160 + Math.random() * 420;
                self.particulas.emitir(x, y, { n: 18, vel: 300, tintes: [MAGENTA, CIAN, 0xffd43b, 0xc77dff, VERDE], escala: 0.38, tipos: ["estrella", "chispa"], grav: 160, vida: 1100 });
                avisar("fuego", { n: tiros });
                if (tiros % 3 === 0) self.lanzarRayos(800);
            };
            this.fuegoTimer = setInterval(lanzar, reducido ? 900 : 420);
            lanzar();
            this.collares.forEach(function (c) { c.brillo.setAlpha(1); });
            return this.anim.agregar(reducido ? 200 : 3200, function (u) {
                var pul = 0.5 + 0.5 * Math.sin(u * Math.PI * 8);
                self.flash.setFillStyle(u < 0.5 ? CIAN : MAGENTA, 1).setAlpha(0.05 + 0.07 * pul);
                self.reactorAura.setAlpha(0.6 + 0.4 * pul).setScale(self.reactorAura.base * (1.2 + 0.4 * pul));
                self.nucleo.setAlpha(1).setScale(self.nucleo.base * (1.3 + 0.3 * pul));
                self.genLuz.setAlpha(1).setScale(self.genLuz.base * (1.2 + 0.3 * pul));
                self.luces.forEach(function (l) { l.setAlpha(0.6 + 0.4 * pul); });
            });
        }

        // ------------------------------------------------------------------ cinemática final «La energía vuelve a la red»

        camara(x, y, zoom) {
            var c = this.cameras.main;
            c.setZoom(zoom);
            c.centerOn(x, y);
        }

        /**
         * Tras la última red (≈11 s, con franjas de cine y botones ocultos):
         *  1. la cámara se acerca al reactor;  2. el reactor se carga: rayos, temblor, núcleo al máximo;
         *  3. un pulso de luz sale del reactor y recorre de vuelta TODA la tubería, la cámara lo sigue;
         *  4. el generador se sobrecarga y destella;  5. la cámara se aleja y una ola de luz enciende el
         *  laboratorio de izquierda a derecha;  6. fuegos de neón (celebrarFinal).
         * Con movimiento reducido la cámara no viaja: solo se ven los destellos.
         */
        cinematica() {
            var self = this;
            var red = this.red;
            if (!red) return Promise.resolve();
            var cam = this.cameras.main;
            cam.setBounds(0, 0, W, H);
            var N = this.nucleoPos;
            var G = { x: this.generador.x, y: this.generador.y };
            var zPulso = reducido ? 1 : 1.45;
            this.cine = true;
            avisar("cine", true);
            if (!this.pulsoCine) {
                this.pulsoCine = img(this, 0, 0, "halo", 1.3).setDepth(24).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffffff).setVisible(false);
                this.pulsoNucleo = img(this, 0, 0, "estrella", 0.9).setDepth(25).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffe3fb).setVisible(false);
            }
            var fin = function () {
                self.pulsoCine.setVisible(false);
                self.pulsoNucleo.setVisible(false);
                self.olaX = null;
                self.camara(W / 2, H / 2, 1);
            };
            // 1) acercamiento al reactor
            return this.anim.agregar(reducido ? 100 : 1400, function (u) {
                var k = suave(u);
                if (!reducido) self.camara(lerp(W / 2, N.x - 80, k), lerp(H / 2, N.y, k), lerp(1, 1.8, k));
                self.nucleo.setAlpha(1).setScale(self.nucleo.base * (1.15 + 0.15 * Math.sin(u * 12)));
            }).then(function () {
                // 2) el reactor se carga
                avisar("cineEvento", "carga");
                if (!reducido) cam.shake(900, 0.006);
                self.lanzarRayos(1400);
                return self.anim.agregar(reducido ? 120 : 1500, function (u) {
                    var k = Math.sin(u * Math.PI);
                    self.nucleo.setScale(self.nucleo.base * (1.2 + 0.9 * u));
                    self.reactorAura.setAlpha(0.6 + 0.4 * k).setScale(self.reactorAura.base * (1 + 0.8 * u));
                    self.anillo.rotation += 0.25 * u;
                    if (Math.random() < 0.5) self.particulas.emitir(N.x, N.y, { n: 2, vel: 300, tintes: [MAGENTA, CIAN, 0xffffff], escala: 0.32, vida: 600 });
                });
            }).then(function () {
                // 3) el pulso de luz recorre la tubería de vuelta hasta el generador
                avisar("cineEvento", "pulso");
                self.onda(N.x, N.y, 0xffffff, 1.4);
                self.pulsoCine.setVisible(true);
                self.pulsoNucleo.setVisible(true);
                var dur = reducido ? 300 : Math.max(2600, Math.min(4200, red.largo * 1.7));
                var ultimo = -1;
                return self.anim.agregar(dur, function (u) {
                    var k = suave(u);
                    var sp = red.largo * (1 - k);
                    var p = R().puntoEn(red, sp);
                    self.pulsoCine.setPosition(p.x, p.y).setAlpha(0.9).setScale(self.pulsoCine.base * (1 + Math.sin(self.t / 60) * 0.06));
                    self.pulsoNucleo.setPosition(p.x, p.y).setRotation(self.t / 200);
                    if (!reducido) {
                        // la cámara sigue el pulso; al principio se acomoda suave
                        var z = u < 0.12 ? lerp(1.8, zPulso, u / 0.12) : zPulso;
                        self.camara(p.x, p.y, z);
                    }
                    var tramo = Math.floor(u * 40);
                    if (tramo !== ultimo) {
                        ultimo = tramo;
                        self.particulas.emitir(p.x, p.y, { n: 3, vel: 160, tintes: [MAGENTA, CIAN, 0xffd43b, 0xffffff], escala: 0.3, vida: 700, tipos: ["chispa", "estrella"] });
                    }
                    // los checkpoints destellan cuando el pulso pasa
                    self.collares.forEach(function (c) {
                        var d = Math.abs(c.cp.s - sp);
                        c.brillo.setAlpha(d < 60 ? 1 : 0.55).setScale(c.brillo.base * (d < 60 ? 1.8 : 1));
                    });
                });
            }).then(function () {
                // 4) el generador se sobrecarga
                avisar("cineEvento", "generador");
                self.pulsoCine.setVisible(false);
                self.pulsoNucleo.setVisible(false);
                self.onda(G.x, G.y, MAGENTA, 1.6);
                self.onda(G.x, G.y, CIAN, 1.1);
                self.particulas.emitir(G.x, G.y, { n: 30, vel: 380, tintes: [MAGENTA, CIAN, 0xffd43b, 0xffffff], escala: 0.4, tipos: ["chispa", "estrella"], vida: 900 });
                if (!reducido) cam.shake(500, 0.008);
                return self.anim.agregar(reducido ? 100 : 900, function (u) {
                    var k = Math.sin(u * Math.PI);
                    self.genLuz.setAlpha(1).setScale(self.genLuz.base * (1.2 + 1.6 * k));
                    self.genChispa.setAlpha(1).setScale(self.genChispa.base * (1 + 2 * k));
                    self.flash.setFillStyle(0xffffff, 1).setAlpha(0.25 * k);
                });
            }).then(function () {
                // 5) la cámara se aleja y la ola de luz enciende el laboratorio
                avisar("cineEvento", "ola");
                self.giroExtra = 5;
                var desde = { x: cam.midPoint.x, y: cam.midPoint.y, z: cam.zoom };
                return self.anim.agregar(reducido ? 150 : 1800, function (u) {
                    var k = suave(u);
                    if (!reducido) self.camara(lerp(desde.x, W / 2, k), lerp(desde.y, H / 2, k), lerp(desde.z, 1, k));
                    self.olaX = lerp(100, W + 100, u);
                    self.flash.setFillStyle(CIAN, 1).setAlpha(0.06 * Math.sin(u * Math.PI));
                    if (Math.random() < 0.3) self.particulas.emitir(self.olaX, 150 + Math.random() * 600, { n: 2, vel: 120, tintes: [CIAN, MAGENTA, 0xffd43b], escala: 0.3, vida: 700 });
                });
            }).then(function () {
                fin();
                self.olaX = W + 200;
                // 6) fuegos de neón
                return self.celebrarFinal();
            }).then(function () {
                self.cine = false;
                avisar("cine", false);
            }, function (e) {
                fin();
                self.cine = false;
                avisar("cine", false);
                throw e;
            });
        }

        terminarFiesta() {
            this.olaX = null;
            this.fiesta = 0;
            clearInterval(this.fuegoTimer);
            this.fuegoTimer = null;
            if (this.flash) this.flash.setAlpha(0);
            if (this.rayos) this.rayos.forEach(function (r) { r.setVisible(false); });
        }

        // ------------------------------------------------------------------ consola de niveles

        pintarConsola() {
            var self = this;
            var info = this.nivelesInfo;
            this.consola.forEach(function (o) { o.destroy(); });
            this.consola = [];
            if (!this.mostrarConsola) return;
            var x0 = CONSOLA.x - (info.total - 1) * CONSOLA.sep / 2;
            for (var i = 0; i < info.total; i++) {
                var x = x0 + i * CONSOLA.sep;
                var r = img(this, x, CONSOLA.y, "ranura", 0.9).setDepth(15);
                this.consola.push(r);
                if (i < info.hechos) {
                    var h = img(this, x, CONSOLA.y, "halo", 0.42).setDepth(15).setBlendMode(Phaser.BlendModes.ADD).setTint(MAGENTA).setAlpha(0.8);
                    var g = img(this, x, CONSOLA.y + 2, "gema", 0.36).setDepth(16);
                    this.consola.push(h, g);
                } else if (i === info.actual) {
                    var a = img(this, x, CONSOLA.y, "aro", 0.34).setDepth(16).setBlendMode(Phaser.BlendModes.ADD).setTint(CIAN);
                    a.vivo = true;
                    this.consola.push(a);
                    var base = a.base;
                    var latir = function () {
                        if (!a.active) return;
                        self.anim.agregar(1100, function (u) { if (a.active) a.setScale(base * (1 + 0.12 * Math.sin(u * Math.PI))).setAlpha(0.5 + 0.5 * Math.sin(u * Math.PI)); }).then(latir);
                    };
                    latir();
                }
            }
        }

        ganarNivelConsola(i) {
            var info = this.nivelesInfo;
            var x0 = CONSOLA.x - (info.total - 1) * CONSOLA.sep / 2;
            var x = x0 + i * CONSOLA.sep;
            if (this.mostrarConsola) {
                this.onda(x, CONSOLA.y, MAGENTA, 0.5);
                this.particulas.emitir(x, CONSOLA.y, { n: 14, vel: 200, tintes: [MAGENTA, 0xffd43b, CIAN], escala: 0.3, tipos: ["estrella"] });
            }
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
            backgroundColor: "#0d1b45",
            banner: false,
            scale: { mode: Phaser.Scale.ENVELOP, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
            input: { activePointers: 3 },
            render: { antialias: true },
            scene: [EscenaTuberia]
        });
        global.__escenarioTuberia = juego;
        global.__pedniaPhaserGame = juego;
    }

    // ------------------------------------------------------------------ API pública

    global.EscenarioTuberia = {
        W: W,
        H: H,
        montar: function (contenedor, config) {
            el = contenedor;
            cfg = config;
            if (!Phaser || !el) return Promise.resolve(false);
            return D().preparar().then(function () {
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
        cargar: function (def) { return escena ? escena.cargar(def) : null; },
        presentar: function () { return escena ? escena.presentar() : Promise.resolve(); },
        /** Habilita o bloquea la entrada. Al bloquear, si la gema iba conducida se suelta sin castigo. */
        entrada: function (on) {
            if (!escena) return;
            escena.entradaOn = !!on;
            if (!on && escena.ptrId !== null && escena.ptrId !== "demo") {
                escena.ptrId = null;
                escena.ptr = null;
                if (escena.est) escena.est.conectado = false;
                escena.hilo.clear();
                if (escena.estado === "conduciendo" || escena.estado === "fuera") escena.estado = "lista";
            }
        },
        llegar: function () { return escena ? escena.llegar() : Promise.resolve(); },
        celebrarFinal: function () { return escena ? escena.celebrarFinal() : Promise.resolve(); },
        cinematica: function () { return escena ? escena.cinematica() : Promise.resolve(); },
        terminarFiesta: function () { if (escena) escena.terminarFiesta(); },
        pulsoAyuda: function () { if (escena) escena.pulsoAyuda(); },
        limpiarAyuda: function () { if (escena) escena.limpiarAyuda(); },
        destelloGema: function () {
            if (!escena || !escena.red) return;
            var p = escena.posGema();
            escena.onda(p.x, p.y, 0xffffff, 0.6);
            escena.particulas.emitir(p.x, p.y, { n: 8, vel: 140, tintes: [MAGENTA, 0xffffff], escala: 0.26 });
        },
        onda: function (x, y, color, k) { if (escena) escena.onda(x, y, color, k); },
        niveles: function (total, actual, hechos) {
            if (!escena) return;
            escena.nivelesInfo = { total: total, actual: actual, hechos: hechos };
            escena.pintarConsola();
        },
        ganarNivel: function (i) { if (escena) escena.ganarNivelConsola(i); },
        mostrarProgreso: function (on) {
            if (!escena) return;
            escena.mostrarConsola = !!on;
            escena.medidor.setVisible(!!on);
            escena.pintarConsola();
        },
        // demo y pruebas: el mismo camino que el dedo, con un puntero "demo"
        tomarDemo: function () {
            if (!escena || !escena.red || escena.estado !== "lista") return false;
            escena.tomar("demo", { x: escena.est.x, y: escena.est.y });
            return true;
        },
        moverDemo: function (x, y) { if (escena && escena.ptrId === "demo") escena.ptr = { x: x, y: y }; },
        soltarDemo: function () { if (escena && escena.ptrId === "demo") escena.liberar(); },
        /** Deja la gema en el generador y apaga los checkpoints (después de la demostración). */
        reiniciarGema: function () {
            if (!escena || !escena.red) return;
            escena.est = R().nuevoEstado(escena.red);
            escena.vis = { s: 0, maxS: 0, activo: false };
            escena.dibujadoS = -99;
            escena.collares.forEach(function (c) { c.on = false; c.led.setTint(AMBAR); c.brillo.setTint(AMBAR).setAlpha(0); c.collar.setTint(AMBAR); });
            escena.estado = "lista";
            escena.gema.setAlpha(1);
        },
        aPantalla: aPantalla,
        aMundo: aMundo,
        puntoEje: function (s) { return escena && escena.red ? R().puntoEn(escena.red, s) : null; },
        red: function () { return escena ? escena.red : null; },
        estado: function () {
            if (!escena || !escena.red) return null;
            var e = escena.est;
            return {
                estado: escena.estado,
                s: Math.round(e.s),
                maxS: Math.round(e.maxS),
                largo: Math.round(escena.red.largo),
                cp: e.cp,
                checkpoints: escena.red.checkpoints.length,
                conectado: e.conectado,
                fuera: e.fuera,
                enMeta: e.enMeta,
                x: Math.round(e.x),
                y: Math.round(e.y),
                puntero: escena.ptrId,
                entrada: escena.entradaOn
            };
        }
    };
})(typeof window !== "undefined" ? window : global);
