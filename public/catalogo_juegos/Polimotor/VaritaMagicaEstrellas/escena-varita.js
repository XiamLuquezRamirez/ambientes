/**
 * EscenarioVarita — escena Phaser 4 de "La Varita Mágica y las Estrellas en el Cielo" (window.EscenarioVarita).
 *
 * Dibuja el cielo por capas (fondo, luna, planeta, colinas con paralaje lento, nubes, lucecitas), el carril
 * luminoso del nivel, las estrellas grandes con sus tres estados (apagada → activándose → encendida), la varita con
 * su estela de polvo de hada, las figuras de cada nivel y la escena final «El cielo de los pequeños magos».
 *
 * No decide nada: cada movimiento del dedo pasa por ReglasVarita.seguir() y la escena avisa los eventos a script.js
 * (tomar, mover, estrella, fuera, vuelve, soltar, meta, tocaFuera, quieto).
 *
 * Mundo de diseño 1600 × 900 con Scale.ENVELOP (llena la pantalla sin deformar). Lo jugable queda en la franja
 * central (ReglasVarita.ZONA), que cabe en 4:3 sin tocar los botones de las esquinas. Cada animación que el flujo
 * espera es una Promise con respaldo por tiempo (Animador): con la pestaña oculta los cuadros no corren.
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser;
    var W = 1600, H = 900;
    var CONSOLA = { x: 800, y: 850, sep: 80 };
    var APAGADA = 0x9aa0d8;

    var D = function () { return global.DibujosVarita; };
    var R = function () { return global.ReglasVarita; };

    var juego = null, escena = null, el = null, cfg = null, espera = null;
    var cb = {};
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);

    function avisar(nombre, a) {
        var f = cb[nombre];
        if (typeof f === "function") {
            try { f(a); } catch (e) { console.warn("[EscenarioVarita]", nombre, e); }
        }
    }

    function suave(u) { return u * u * (3 - 2 * u); }
    function saleSuave(u) { return 1 - Math.pow(1 - u, 3); }
    function rebote(u) { var c = 1.7; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); }
    function lerp(a, b, u) { return a + (b - a) * u; }
    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    function jcfg() { return (cfg && cfg.juego) || {}; }
    function hex(c) { return typeof c === "number" ? c : parseInt(String(c || "#ffffff").replace("#", ""), 16); }
    function mezclar(a, b, u) {
        var ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
        var br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
        return (Math.round(lerp(ar, br, u)) << 16) | (Math.round(lerp(ag, bg, u)) << 8) | Math.round(lerp(ab, bb, u));
    }
    function arcoiris(u) {
        var c = [0xff6b6b, 0xffa94d, 0xffd43b, 0x69db7c, 0x4dabf7, 0xb197fc, 0xff6b6b];
        var x = ((u % 1) + 1) % 1 * (c.length - 1);
        var i = Math.floor(x);
        return mezclar(c[i], c[i + 1], x - i);
    }

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
            p.roce = o.roce != null ? o.roce : 0.985;
            p.giro = (Math.random() - 0.5) * (o.giro || 6);
            p.esc = (o.escala || 0.35) * (0.6 + Math.random() * 0.7) / D().res(tx);
            p.oscila = o.oscila || 0;
            p.fase = Math.random() * 6;
            p.img.setTexture(tx);
            p.img.setBlendMode(o.normal ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD);
            p.img.setTint(o.tintes ? o.tintes[Math.floor(Math.random() * o.tintes.length)] : 0xffffff);
            p.img.setPosition(x + (Math.random() - 0.5) * (o.dispersion || 10), y + (Math.random() - 0.5) * (o.dispersionY != null ? o.dispersionY : (o.dispersion || 10)));
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
            p.vx *= p.roce;
            p.vy *= p.roce;
            p.img.x += (p.vx + (p.oscila ? Math.sin(p.t / 260 + p.fase) * p.oscila : 0)) * s;
            p.img.y += p.vy * s;
            p.img.rotation += p.giro * s;
            p.img.setAlpha(u < 0.75 ? 1 : 1 - (u - 0.75) / 0.25);
            p.img.setScale(p.esc * (1 - u * 0.35));
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

    var EscenaVarita = Phaser ? class extends Phaser.Scene {
        constructor() { super({ key: "Varita" }); }

        create() {
            var self = this;
            D().claves().forEach(function (k) { tex(self, k); });
            this.anim = new Animador();
            this.t = 0;
            this.camino = null;
            this.def = null;
            this.est = null;
            this.entradaOn = false;
            this.ptrId = null;
            this.ptr = null;
            this.ptrNuevo = false;
            this.dibujadoS = -1;
            this.estado = "oculta";            // oculta · lista · trazando · meta · final
            this.estrellas = [];
            this.nubesNivel = [];
            this.figura = [];
            this.cinta = [];
            this.tAvance = 0;
            this.tPolvo = 0;
            this.demoOn = false;
            this.mostrarConsola = true;
            this.nivelesInfo = { total: 4, actual: 0, hechos: 0, colores: [] };
            this.colorNivel = 0x8ce9ff;
            this.fiesta = null;
            this.camKey = null;
            this.contador = 0;

            // ---- cielo por capas
            this.cielo = img(this, W / 2, H / 2, "cielo").setDepth(0);
            this.cieloFinal = img(this, W / 2, H / 2, "cielo-final").setDepth(0.5).setAlpha(0);
            this.decor = [];
            for (var i = 0; i < 26; i++) {
                var tipo = i % 3 ? "punto" : "chispa";
                var d = img(this, 120 + Math.random() * 1360, 40 + Math.random() * 640, tipo, tipo === "punto" ? 0.42 : 0.24).setDepth(1).setBlendMode(Phaser.BlendModes.ADD);
                d.setTint([0xffffff, 0xfff3bf, 0xd0ebff, 0xffd6f0][i % 4]);
                d.fase = Math.random() * 6;
                d.vel = 0.7 + Math.random() * 1.2;
                this.decor.push(d);
            }
            this.planeta = img(this, 1450, 300, "planeta", 0.85).setDepth(1).setAlpha(0.9);
            var ob = R().OBSTACULOS[0];
            this.lunaHalo = img(this, ob.x, ob.y, "halo", 2.2).setDepth(1).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff3bf).setAlpha(0.35);
            this.luna = img(this, ob.x, ob.y, "luna-dormida", 0.72).setDepth(2);
            this.lunaFeliz = img(this, ob.x, ob.y, "luna-feliz", 0.72).setDepth(2.1).setAlpha(0);
            this.nubesFondo = [
                img(this, 520, 120, "nube", 0.7).setDepth(1.5).setAlpha(0.5),
                img(this, 1180, 90, "nube", 0.55).setDepth(1.5).setAlpha(0.45),
                img(this, 1380, 700, "nube", 0.8).setDepth(3.5).setAlpha(0.55),
                img(this, 180, 690, "nube", 0.7).setDepth(3.5).setAlpha(0.5)
            ];
            this.nubesFondo.forEach(function (n, k) { n.vel = 5 + k * 2; n.x0 = n.x; });
            this.colinasLejos = this.add.image(W / 2, H + 10, "colinas-lejos").setOrigin(0.5, 1).setDepth(3).setAlpha(0.9);
            this.colinasCerca = this.add.image(W / 2, H + 30, "colinas-cerca").setOrigin(0.5, 1).setDepth(3.2);

            // ---- figuras de los niveles
            this.arco = this.add.image(W / 2, 700, "arcoiris").setOrigin(0.5, 1).setDepth(4).setAlpha(0);
            this.arco.base = 1 / D().res("arcoiris");
            this.cometa = img(this, -300, 150, "cometa", 0.8).setDepth(4.5).setAlpha(0);
            this.lineas = this.add.graphics().setDepth(8).setBlendMode(Phaser.BlendModes.ADD);
            this.estrellaMayor = img(this, W / 2, H / 2, "estrella", 1.6).setDepth(13).setAlpha(0);
            this.estrellaMayorCara = img(this, W / 2, H / 2, "cara-feliz", 1.6).setDepth(13.1).setAlpha(0);
            this.estrellaMayorHalo = img(this, W / 2, H / 2, "halo", 3.2).setDepth(12.9).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);

            // ---- carril, luz del recorrido, guías
            this.caminoImg = null;
            this.crearLuz();
            this.guia = this.add.graphics().setDepth(9);
            this.flechas = [];
            for (var f = 0; f < 3; f++) this.flechas.push(img(this, -100, -100, "flecha", 0.62).setDepth(7).setAlpha(0));
            this.luzAyuda = img(this, -100, -100, "halo", 0.75).setDepth(9).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff3bf).setVisible(false);
            this.inicioHalo = img(this, -100, -100, "halo", 1.6).setDepth(8.5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
            this.inicioAro = img(this, -100, -100, "aro", 1.05).setDepth(8.6).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
            this.ondas = [];
            for (var o = 0; o < 6; o++) this.ondas.push({ img: img(this, -100, -100, "aro", 0.5).setDepth(15).setBlendMode(Phaser.BlendModes.ADD).setVisible(false), t: 0, vivo: false });

            // ---- estela y varita
            this.cintaG = this.add.graphics().setDepth(14).setBlendMode(Phaser.BlendModes.ADD);
            this.particulas = new Particulas(this, 130, 17);
            var P = D().PUNTA;
            this.varitaHalo = img(this, -100, -100, "halo", 1.05).setDepth(18).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff3bf).setAlpha(0);
            this.varita = img(this, -100, -100, "varita", 0.88).setDepth(19).setOrigin(P.x / P.w, P.y / P.h).setAlpha(0);
            this.varitaBrillo = img(this, -100, -100, "chispa", 0.6).setDepth(20).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);


            // ---- consola de niveles (abajo al centro)
            this.consola = [];
            this.flash = this.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 1).setDepth(40).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);

            // ---- escena final
            this.lluvia = new Particulas(this, 220, 25);
            this.corona = [];

            this.crearEntrada();
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
            this.input.on("pointerdown", function (p) { self.bajar(p.id, mundo(p)); });
            this.input.on("pointermove", function (p) {
                if (self.ptrId === null || p.id !== self.ptrId) return;
                self.ptr = mundo(p);
                self.ptrNuevo = true;
                self.procesarDedo();
            });
            var arriba = function (p) {
                if (self.ptrId === null || (p && p.id !== self.ptrId)) return;
                self.liberar();
            };
            this.input.on("pointerup", arriba);
            this.input.on("pointerupoutside", arriba);
            var perder = function () { if (self.ptrId !== null) self.liberar(); };
            var lienzo = this.game.canvas;
            if (lienzo) {
                lienzo.addEventListener("pointercancel", perder);
                lienzo.addEventListener("touchcancel", perder);
                lienzo.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });
            }
            global.addEventListener("blur", perder);
            document.addEventListener("visibilitychange", function () { if (document.hidden) perder(); });
        }

        bajar(id, w) {
            if (!this.entradaOn || !this.camino || this.ptrId !== null || this.estado !== "lista") return;
            if (R().tocaVarita(this.camino, this.est, w.x, w.y, jcfg())) this.tomar(id, w);
            else avisar("tocaFuera", w);
        }

        tomar(id, w) {
            this.ptrId = id;
            this.ptr = w;
            this.ptrNuevo = true;
            // el dedo arranca desde la varita: el primer tramo se mide desde donde quedó el progreso
            R().tomar(this.est, this.est.x, this.est.y);
            this.estado = "trazando";
            this.tAvance = this.t;
            this.cinta = [];
            this.flechas.forEach(function (fl) { fl.setAlpha(0); });
            this.onda(this.est.x, this.est.y, this.colorNivel, 0.9);
            this.particulas.emitir(this.est.x, this.est.y, { n: 14, vel: 220, tintes: this.tintes(), escala: 0.32, tipos: ["chispa", "estrellita"] });
            avisar("tomar", { s: this.est.s });
        }

        /** El dedo se levantó: la varita se queda donde llegó el progreso, sin perder nada. */
        liberar() {
            this.ptrId = null;
            this.ptr = null;
            this.guia.clear();
            if (!this.est || this.est.enMeta) return;
            R().soltar(this.est);
            this.est.fuera = false;
            if (this.estado === "trazando") {
                this.estado = "lista";
                avisar("soltar", { s: this.est.s });
            }
        }

        tintes() {
            var c = (this.def && this.def.colores) || ["#ffffff"];
            return c.map(hex).concat([0xffffff]);
        }

        colorEstrella(i) {
            var c = (this.def && this.def.colores) || ["#ffffff"];
            return hex(c[i % c.length]);
        }

        // ------------------------------------------------------------------ nivel

        /** Carga el camino ya generado y validado de un nivel (def = config.cielos[i]). Todo queda oculto. */
        cargar(camino, def) {
            var self = this;
            this.anim.limpiar();
            this.demoOn = false;
            this.demoPtr = null;
            this.camino = camino;
            this.def = def || {};
            this.est = R().nuevoEstado(camino);
            this.estado = "oculta";
            this.ptrId = null;
            this.ptr = null;
            this.dibujadoS = -1;
            this.cinta = [];
            this.colorNivel = hex((this.def.colores || ["#8ce9ff"])[0]);
            this.particulas.apagar();
            this.luz.clear();
            this.guia.clear();
            this.cintaG.clear();
            this.lineas.clear();
            this.luzAyuda.setVisible(false);
            this.flash.setAlpha(0);

            // carril del nivel como textura (se rehace en cada nivel, la anterior se libera)
            var k = Math.min(1.5, Math.max(1, global.devicePixelRatio || 1));
            var clave = "camino-" + (++this.contador);
            this.textures.addCanvas(clave, D().camino(camino, this.def.colores, k));
            if (this.caminoImg) this.caminoImg.destroy();
            if (this.camKey && this.textures.exists(this.camKey)) this.textures.remove(this.camKey);
            this.camKey = clave;
            this.caminoImg = this.add.image(W / 2, H / 2, clave).setDepth(5).setScale(1 / k).setAlpha(0);

            // estrellas grandes del recorrido
            this.estrellas.forEach(function (e) { e.halo.destroy(); e.cuerpo.destroy(); e.cara0.destroy(); e.cara1.destroy(); });
            this.estrellas = camino.estrellas.map(function (st, i) {
                var k2 = st.ultima ? 0.86 : 0.74;
                var e = {
                    i: i,
                    s: st.s,
                    x: st.x,
                    y: st.y,
                    k: k2,
                    on: false,
                    color: self.colorEstrella(i),
                    halo: img(self, st.x, st.y, "halo", k2 * 1.9).setDepth(10).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0),
                    cuerpo: img(self, st.x, st.y, "estrella", k2).setDepth(11).setTint(APAGADA).setAlpha(0),
                    cara0: img(self, st.x, st.y, "cara-dormida", k2).setDepth(11.1).setAlpha(0),
                    cara1: img(self, st.x, st.y, "cara-feliz", k2).setDepth(11.1).setAlpha(0),
                    fase: Math.random() * 6,
                    pop: 0,
                    brillo: 0
                };
                return e;
            });

            // inicio: aro grande que late y flechas que muestran hacia dónde ir
            var ini = camino.inicio;
            this.inicioHalo.setPosition(ini.x, ini.y).setTint(this.colorNivel).setAlpha(0);
            this.inicioAro.setPosition(ini.x, ini.y).setTint(0xffffff).setAlpha(0);
            [64, 104, 144].forEach(function (s, i) {
                var p = R().puntoEn(camino, s);
                self.flechas[i].setPosition(p.x, p.y).setRotation(p.ang).setAlpha(0).setTint(0xffffff);
            });

            // la varita descansa en el inicio
            this.varita.setPosition(ini.x, ini.y).setAlpha(0).setRotation(0);
            this.varitaHalo.setPosition(ini.x, ini.y).setAlpha(0);
            this.varitaBrillo.setPosition(ini.x, ini.y).setAlpha(0);

            // nubes mágicas del nivel 3 (junto al camino, sin taparlo)
            this.nubesNivel.forEach(function (n) { n.destroy(); });
            this.nubesNivel = [];
            if (this.def.figura === "arco") this.ponerNubes();

            // la luna vuelve a dormir; figuras ocultas
            this.luna.setAlpha(1);
            this.lunaFeliz.setAlpha(0);
            this.lunaHalo.setAlpha(0.35).setScale(this.lunaHalo.base);
            this.arco.setAlpha(0);
            this.cometa.setAlpha(0);
            this.estrellaMayor.setAlpha(0);
            this.estrellaMayorCara.setAlpha(0);
            this.estrellaMayorHalo.setAlpha(0);
            this.pintarConsola();
            return camino;
        }

        ponerNubes() {
            var c = this.camino;
            var self = this;
            var lados = Math.random() < 0.5 ? 1 : -1;
            [0.22, 0.5, 0.78].forEach(function (u, k) {
                var p = R().puntoEn(c, c.largo * u);
                var opciones = [lados * (k % 2 ? -1 : 1), -lados * (k % 2 ? -1 : 1)];
                for (var q = 0; q < opciones.length; q++) {
                    var off = (c.ancho / 2 + 92) * opciones[q];
                    var x = p.x + Math.sin(p.ang) * off, y = p.y - Math.cos(p.ang) * off;
                    if (x < 220 || x > 1380 || y < 170 || y > 740) continue;
                    var lejos = c.muestras.every(function (m) { return Math.hypot(m.x - x, m.y - y) > c.ancho / 2 + 60; });
                    if (!lejos) continue;
                    var n = img(self, x, y, "nube", 0.62).setDepth(4.2).setAlpha(0);
                    n.k = 0;
                    n.y0 = y;
                    n.color = k % 2 ? 0xc77dff : 0xff8fc0;
                    n.fase = Math.random() * 6;
                    self.nubesNivel.push(n);
                    break;
                }
            });
        }

        /** El cielo del nivel aparece: carril, estrellas (en cadena) y la varita en el inicio. */
        presentar() {
            var self = this;
            var est = this.estrellas;
            avisar("aparece");
            return this.anim.agregar(reducido ? 120 : 1100, function (u) {
                var a = suave(Math.min(1, u * 1.6));
                if (self.caminoImg) self.caminoImg.setAlpha(a);
                est.forEach(function (e, i) {
                    var ui = Math.max(0, Math.min(1, (u - 0.2 - i * 0.08) / 0.35));
                    var k = e.k / D().res("estrella") * (ui > 0 ? rebote(ui) : 0);
                    e.cuerpo.setAlpha(ui > 0 ? 1 : 0).setScale(k);
                    e.cara0.setAlpha(ui > 0 ? 1 : 0).setScale(k);
                });
                self.nubesNivel.forEach(function (n) { n.setAlpha(0.85 * a); });
                var uv = Math.max(0, (u - 0.55) / 0.45);
                self.varita.setAlpha(uv);
                self.varitaHalo.setAlpha(0.6 * uv);
                self.inicioAro.setAlpha(0.8 * uv);
                self.inicioHalo.setAlpha(0.5 * uv);
            }).then(function () {
                self.estado = "lista";
                self.flechas.forEach(function (fl) { fl.setAlpha(0.9); });
                self.particulas.emitir(self.camino.inicio.x, self.camino.inicio.y, { n: 12, vel: 180, tintes: self.tintes(), escala: 0.28 });
            });
        }

        /**
         * Demostración: la propia varita recorre la curva desde el inicio hasta el final, con su estela, la luz del
         * camino y las estrellas que se encienden al pasar. Es solo para mirar: no toca el progreso del niño y al
         * terminar todo vuelve a su estado de juego (varita en el inicio, estrellas dormidas, camino sin luz).
         * mano(x, y, fase) se llama en cada paso con la punta de la varita (mundo) para que el flujo mueva la mano del
         * tutorial encima: fase "llega" (va hacia la varita), "presiona", "arrastra", "suelta".
         */
        demo(mano) {
            var self = this;
            var c = this.camino;
            if (!c) return Promise.resolve();
            var aviso = typeof mano === "function" ? mano : function () {};
            this.demoOn = true;
            this.demoPtr = null;
            var vel = Number(jcfg().demoVelocidad) || 330;
            var dur = reducido ? 700 : Math.max(1800, c.largo / vel * 1000);
            var tocadas = {};
            var ini = c.inicio;
            // 1) la mano llega a la varita y la presiona
            return this.anim.agregar(reducido ? 100 : 750, function (u) {
                var k = suave(u);
                aviso(ini.x + 170 * (1 - k), ini.y + 140 * (1 - k), "llega");
            }).then(function () {
                aviso(ini.x, ini.y, "presiona");
                self.demoPtr = { x: ini.x, y: ini.y };
                self.cinta = [];
                self.onda(ini.x, ini.y, self.colorNivel, 0.9);
                self.particulas.emitir(ini.x, ini.y, { n: 12, vel: 200, tintes: self.tintes(), escala: 0.3, tipos: ["chispa", "estrellita"] });
                avisar("demoToma");
                return sleep(reducido ? 80 : 350);
            }).then(function () {
                // 2) la varita viaja por la curva; la luz y las estrellas responden
                self.luz.setAlpha(0.75);
                return self.anim.agregar(dur, function (u) {
                    if (!self.demoOn) return;
                    var s = c.largo * u;
                    var p = R().puntoEn(c, s);
                    self.demoPtr = { x: p.x, y: p.y };
                    aviso(p.x, p.y, "arrastra");
                    self.pintarLuz(s);
                    self.estrellas.forEach(function (e) {
                        if (!tocadas[e.i] && s >= e.s - 30) {
                            tocadas[e.i] = true;
                            e.brillo = 1;
                            e.cuerpo.setTint(e.color);
                            e.cara0.setAlpha(0);
                            e.cara1.setAlpha(1).setScale(e.cuerpo.scaleX);
                            self.onda(e.x, e.y, e.color, 1);
                            self.particulas.emitir(e.x, e.y, { n: 10, vel: 200, tintes: [e.color, 0xffffff], escala: 0.3, vida: 700, tipos: ["chispa", "estrellita"] });
                            avisar("demoEstrella", { i: e.i, ultima: e.i === self.estrellas.length - 1 });
                        }
                    });
                });
            }).then(function () {
                aviso(c.fin.x, c.fin.y, "suelta");
                return sleep(reducido ? 100 : 700);
            }).then(function () {
                // 3) todo vuelve a empezar: la varita regresa al inicio y las estrellas se duermen
                var x0 = self.demoPtr ? self.demoPtr.x : c.fin.x, y0 = self.demoPtr ? self.demoPtr.y : c.fin.y;
                return self.anim.agregar(reducido ? 100 : 650, function (u) {
                    self.luz.setAlpha(0.75 * (1 - u));
                    self.varita.setAlpha(1 - u);
                    self.demoPtr = { x: x0, y: y0 };
                });
            }).then(function () {
                self.demoOn = false;
                self.demoPtr = null;
                self.cinta = [];
                self.luz.clear();
                self.luz.setAlpha(1);
                self.dibujadoS = -1;
                self.estrellas.forEach(function (e) {
                    e.brillo = 0;
                    e.cuerpo.setTint(APAGADA);
                    e.cara0.setAlpha(1);
                    e.cara1.setAlpha(0);
                });
                self.onda(ini.x, ini.y, 0xffffff, 0.8);
                return self.anim.agregar(reducido ? 80 : 400, function (u) { self.varita.setAlpha(u); });
            });
        }

        // ------------------------------------------------------------------ dibujo por cuadro

        /** Luz del tramo recorrido (de 0 a s). En el nivel multicolor el color avanza con el recorrido. */
        /**
         * Luz del tramo recorrido (de 0 a s) en un lienzo 2D a media resolución: uniones y puntas redondas, sin los
         * solapes "dentados" de Graphics.strokePoints con mezcla aditiva. Cada capa se pinta opaca en un lienzo
         * auxiliar y se compone con su transparencia. En el nivel multicolor el color avanza con el recorrido.
         * (alfa ya no se usa aquí: la transparencia general es la de la imagen this.luz.)
         */
        pintarLuz(s) {
            var L = this.luzLienzo;
            var ctx = L.ctx, aux = L.aux;
            ctx.clearRect(0, 0, L.w, L.h);
            var c = this.camino;
            if (!c || s < 3) { L.tex.refresh(); return; }
            var m = c.muestras;
            var fin = Math.min(m.length - 1, Math.round(s / c.paso));
            var multi = this.def && this.def.figura === "constelacion";
            var capas = [[c.ancho * 0.66, 0.3], [c.ancho * 0.36, 0.55], [12, 0.95]];
            var trozo = multi ? 10 : fin + 1;
            var css = function (n) { return "#" + ("000000" + n.toString(16)).slice(-6); };
            for (var q = 0; q < capas.length; q++) {
                aux.clearRect(0, 0, L.w, L.h);
                aux.lineWidth = capas[q][0] * L.k;
                aux.lineCap = "round";
                aux.lineJoin = "round";
                for (var i0 = 0; i0 < fin; i0 += trozo) {
                    var i1 = Math.min(fin, i0 + trozo);
                    aux.strokeStyle = q === 2 ? "#ffffff" : css(multi ? arcoiris(m[i0].s / c.largo * 0.95) : this.colorNivel);
                    aux.beginPath();
                    aux.moveTo(m[i0].x * L.k, m[i0].y * L.k);
                    for (var i = i0 + 1; i <= i1; i++) aux.lineTo(m[i].x * L.k, m[i].y * L.k);
                    aux.stroke();
                }
                ctx.globalAlpha = capas[q][1];
                ctx.drawImage(L.auxLienzo, 0, 0);
            }
            ctx.globalAlpha = 1;
            L.tex.refresh();
        }

        crearLuz() {
            var k = 0.5;
            var w = Math.round(W * k), h = Math.round(H * k);
            var tex = this.textures.createCanvas("luz-recorrido", w, h);
            var auxLienzo = document.createElement("canvas");
            auxLienzo.width = w;
            auxLienzo.height = h;
            this.luzLienzo = { k: k, w: w, h: h, tex: tex, ctx: tex.getContext(), auxLienzo: auxLienzo, aux: auxLienzo.getContext("2d") };
            var self = this;
            this.luz = this.add.image(W / 2, H / 2, "luz-recorrido").setScale(1 / k).setDepth(6).setBlendMode(Phaser.BlendModes.ADD);
            this.luz.clear = function () {
                var L = self.luzLienzo;
                L.ctx.clearRect(0, 0, L.w, L.h);
                L.tex.refresh();
            };
        }

        update(time, delta) {
            var dt = Math.min(50, delta || 16);
            this.t += dt;
            this.anim.update(dt);
            this.particulas.update(dt);
            this.lluvia.update(dt);
            this.actualizarOndas(dt);
            this.animarCielo(dt);
            if (this.estado === "final") { this.animarFinal(dt); return; }
            if (!this.camino) return;

            var est = this.est;
            this.procesarDedo();
            if (!this.demoOn && est.s !== this.dibujadoS) {
                this.dibujadoS = est.s;
                this.pintarLuz(est.s);
            }
            this.animarVarita(dt);
            this.animarEstrellas(dt);
            this.animarGuias(dt);
            // se detuvo con el dedo puesto: pista visual suave (sin voz aquí; script.js decide si habla)
            if (this.estado === "trazando" && !est.fuera && this.t - this.tAvance > (Number(jcfg().quietoMs) || 4500)) {
                this.tAvance = this.t;
                this.ayuda();
                avisar("quieto");
            }
        }

        /** Pasa la última posición del dedo por las reglas (en cada evento del puntero y, por si acaso, en cada cuadro). */
        procesarDedo() {
            if (this.estado !== "trazando" || !this.ptr || !this.ptrNuevo) return;
            this.ptrNuevo = false;
            var ev = R().seguir(this.camino, this.est, this.ptr.x, this.ptr.y, jcfg());
            if (ev.avance > 0) {
                this.tAvance = this.t;
                avisar("mover", { avance: ev.avance });
            }
            if (ev.salio) avisar("fuera");
            if (ev.volvio) avisar("vuelve");
            for (var n = 0; n < ev.nuevas.length; n++) this.encender(ev.nuevas[n]);
            if (ev.meta) {
                this.estado = "meta";
                this.entradaOn = false;
                this.ptrId = null;
                this.ptr = null;
                this.guia.clear();
                avisar("meta");
            }
        }

        animarCielo(dt) {
            var t = this.t;
            for (var i = 0; i < this.decor.length; i++) {
                var d = this.decor[i];
                var b = 0.5 + 0.5 * Math.sin(t / 900 * d.vel + d.fase);
                d.setAlpha((this.brilloCielo ? 0.6 : 0.25) + 0.55 * b);
                d.setScale(d.base * (0.75 + 0.45 * b) * (this.brilloCielo ? 1.6 : 1));
            }
            var s = dt / 1000;
            this.nubesFondo.forEach(function (n) {
                n.x += n.vel * s;
                if (n.x > W + 200) n.x = -200;
            });
            // paralaje lento y discreto: las colinas se mecen y siguen un poco a la varita
            var vx = this.varita.alpha > 0 ? (this.varita.x - W / 2) : 0;
            this.colinasLejos.x = W / 2 + Math.sin(t / 7000) * 12 - vx * 0.012;
            this.colinasCerca.x = W / 2 + Math.sin(t / 5200) * 20 - vx * 0.025;
            this.planeta.y = 300 + Math.sin(t / 2400) * 8;
            if (this.estado !== "final") this.luna.y = this.lunaFeliz.y = this.lunaHalo.y = R().OBSTACULOS[0].y + Math.sin(t / 2000) * 4;
        }

        animarVarita(dt) {
            var est = this.est;
            var v = this.varita;
            if ((v.alpha <= 0 && !this.demoOn) || this.estado === "meta") {
                this.cintaG.clear();
                return;
            }
            var x, y;
            var demo = this.demoOn && this.demoPtr;
            if (this.estado === "trazando" && this.ptr) {
                x = this.ptr.x;
                y = this.ptr.y;
            } else if (demo) {
                x = this.demoPtr.x;
                y = this.demoPtr.y;
            } else {
                x = est.x;
                y = est.y + Math.sin(this.t / 420) * 5;
            }
            var activa = this.estado === "trazando" || !!demo;
            v.setPosition(x, y);
            v.rotation = Math.sin(this.t / 600) * 0.08 + (activa ? -0.12 : 0);
            var latido = 0.5 + 0.5 * Math.sin(this.t / (activa ? 140 : 380));
            this.varitaHalo.setPosition(x, y).setAlpha((activa ? 0.75 : 0.45) + 0.25 * latido)
                .setScale(this.varitaHalo.base * (0.9 + 0.25 * latido)).setTint(est.fuera ? 0xffffff : 0xfff3bf);
            this.varitaBrillo.setPosition(x, y).setAlpha(activa ? 0.9 : 0.4 + 0.4 * latido).setRotation(this.t / 260)
                .setScale(this.varitaBrillo.base * (0.8 + 0.4 * latido));

            // estela: cinta que se desvanece y polvo de hada (solo si va por el camino)
            var enCamino = activa && !est.fuera;
            if (enCamino) {
                var u = this.cinta[this.cinta.length - 1];
                if (!u || Math.hypot(u.x - x, u.y - y) > 6) this.cinta.push({ x: x, y: y, t: this.t });
                if (this.t - this.tPolvo > 45) {
                    this.tPolvo = this.t;
                    this.particulas.emitir(x, y, { n: 2, vel: 70, tintes: this.tintes(), escala: 0.24, vida: 760, grav: 40, tipos: ["chispa", "estrellita", "punto"] });
                }
            }
            var vida = enCamino ? 380 : 180;
            while (this.cinta.length && (this.t - this.cinta[0].t > vida || this.cinta.length > 22)) this.cinta.shift();
            var g = this.cintaG;
            g.clear();
            for (var i = 1; i < this.cinta.length; i++) {
                var a = this.cinta[i - 1], b = this.cinta[i];
                var k = i / this.cinta.length;
                var col = this.def && this.def.figura === "constelacion" ? arcoiris(this.t / 2000 + k * 0.3) : this.colorNivel;
                g.lineStyle(4 + 20 * k, col, 0.45 * k);
                g.lineBetween(a.x, a.y, b.x, b.y);
                g.lineStyle(2 + 6 * k, 0xffffff, 0.7 * k);
                g.lineBetween(a.x, a.y, b.x, b.y);
            }
        }

        animarEstrellas(dt) {
            var t = this.t;
            var res = D().res("estrella");
            var self = this;
            this.estrellas.forEach(function (e) {
                if (e.cuerpo.alpha <= 0) return;
                var k = e.k / res;
                if (e.pop > 0) {
                    // activándose: crece suave, brilla y se asienta un poco más grande
                    e.pop = Math.max(0, e.pop - dt / 520);
                    var u = 1 - e.pop;
                    var esc = u < 0.45 ? lerp(1, 1.4, saleSuave(u / 0.45)) : lerp(1.4, 1.12, suave((u - 0.45) / 0.55));
                    e.cuerpo.setScale(k * esc);
                    e.cara1.setScale(k * esc);
                    e.halo.setAlpha(0.95).setScale(e.halo.base * esc * 1.25);
                } else if (e.on) {
                    var b = 0.5 + 0.5 * Math.sin(t / 520 + e.fase);
                    e.cuerpo.setScale(k * (1.1 + 0.05 * b));
                    e.cara1.setScale(k * (1.1 + 0.05 * b));
                    e.halo.setAlpha(0.55 + 0.3 * b).setScale(e.halo.base * (1 + 0.12 * b));
                } else {
                    var r = 0.5 + 0.5 * Math.sin(t / 900 + e.fase);
                    e.cuerpo.setScale(k * (0.97 + 0.04 * r));
                    e.cara0.setScale(k * (0.97 + 0.04 * r));
                    e.halo.setTint(e.color).setAlpha(e.brillo * 0.8).setScale(e.halo.base);
                    if (e.brillo > 0) e.brillo = Math.max(0, e.brillo - dt / 700);
                }
            });
            // nubes del nivel 3: se tiñen de rosa cuando la varita pasa cerca
            if (this.nubesNivel.length) {
                var vx = this.varita.x, vy = this.varita.y;
                var activa = this.estado === "trazando" || this.estado === "meta";
                this.nubesNivel.forEach(function (n) {
                    var cerca = activa && Math.hypot(n.x - vx, n.y - vy) < 210;
                    n.k = Math.max(n.k, cerca ? Math.min(1, n.k + dt / 500) : n.k);
                    n.setTint(mezclar(0xffffff, n.color, n.k * 0.9));
                    n.y = n.y0 + Math.sin(t / 1400 + n.fase) * 5;
                });
            }
        }

        /** Fuera del carril: el carril parpadea, una línea de puntitos lleva al punto donde se sigue. */
        animarGuias(dt) {
            var est = this.est;
            var g = this.guia;
            var lat = 0.5 + 0.5 * Math.sin(this.t / 150);
            if (this.caminoImg && this.estado !== "oculta" && !this.demoOn) {
                this.caminoImg.setAlpha(est.fuera && this.estado === "trazando" ? 0.6 + 0.4 * lat : 1);
            }
            // inicio: el aro late mientras no se ha empezado
            if (!est.empezo && this.estado === "lista") {
                var li = 0.5 + 0.5 * Math.sin(this.t / 300);
                this.inicioAro.setAlpha(0.5 + 0.4 * li).setScale(this.inicioAro.base * (0.95 + 0.15 * li));
                this.inicioHalo.setAlpha(0.35 + 0.3 * li);
                for (var f = 0; f < this.flechas.length; f++) {
                    var on = Math.sin(this.t / 260 - f * 0.9);
                    this.flechas[f].setAlpha(0.35 + 0.55 * Math.max(0, on));
                }
            } else if (est.empezo && this.inicioAro.alpha > 0) {
                this.inicioAro.setAlpha(Math.max(0, this.inicioAro.alpha - dt / 400));
                this.inicioHalo.setAlpha(Math.max(0, this.inicioHalo.alpha - dt / 400));
            }
            g.clear();
            if (this.estado === "trazando" && est.fuera && this.ptr) {
                var x0 = this.ptr.x, y0 = this.ptr.y, x1 = est.x, y1 = est.y;
                var d = Math.hypot(x1 - x0, y1 - y0);
                var n = Math.max(2, Math.floor(d / 34));
                g.fillStyle(0xffffff, 0.9);
                for (var i = 1; i < n; i++) {
                    var u = (i + (this.t / 400) % 1) / n;
                    if (u >= 1) continue;
                    g.fillCircle(lerp(x0, x1, u), lerp(y0, y1, u), 5 + 2 * Math.sin(this.t / 120 + i));
                }
                g.lineStyle(6, this.colorNivel, 0.9);
                g.strokeCircle(x1, y1, 26 + 8 * lat);
                g.lineStyle(3, 0xffffff, 0.9);
                g.strokeCircle(x1, y1, 16 + 4 * lat);
            }
        }

        actualizarOndas(dt) {
            for (var i = 0; i < this.ondas.length; i++) {
                var o = this.ondas[i];
                if (!o.vivo) continue;
                o.t += dt;
                var u = o.t / 620;
                if (u >= 1) { o.vivo = false; o.img.setVisible(false); continue; }
                o.img.setScale(o.k * (0.4 + 1.4 * saleSuave(u))).setAlpha(0.9 * (1 - u));
            }
        }

        onda(x, y, color, k) {
            var o = null;
            for (var i = 0; i < this.ondas.length; i++) if (!this.ondas[i].vivo) { o = this.ondas[i]; break; }
            if (!o) o = this.ondas[0];
            o.vivo = true;
            o.t = 0;
            o.k = (k || 1) * o.img.base * 1.6;
            o.img.setPosition(x, y).setTint(color || 0xffffff).setVisible(true);
        }

        /** Estrella encendida por el progreso real: crece, se tiñe, sonríe, destella y suelta partículas. */
        encender(i) {
            var e = this.estrellas[i];
            if (!e || e.on) return;
            e.on = true;
            e.pop = 1;
            e.cuerpo.setTint(e.color);
            e.cara0.setAlpha(0);
            e.cara1.setAlpha(1);
            e.halo.setTint(e.color).setAlpha(0.95);
            var rosa = this.def && this.def.figura === "arco";
            this.onda(e.x, e.y, e.color, rosa ? 1.4 : 1);
            this.onda(e.x, e.y, 0xffffff, 0.7);
            this.particulas.emitir(e.x, e.y, { n: rosa ? 22 : 14, vel: rosa ? 300 : 230, tintes: [e.color, 0xffffff, e.color], escala: 0.34, vida: 800, tipos: ["chispa", "estrellita"] });
            avisar("estrella", { i: i, total: this.estrellas.length, ultima: i === this.estrellas.length - 1 });
        }

        /** Pista suave: una lucecita recorre el tramo que sigue y la varita late. */
        ayuda() {
            var self = this;
            var c = this.camino;
            if (!c) return;
            var s0 = this.est.s;
            this.onda(this.est.x, this.est.y, 0xfff3bf, 1.1);
            this.luzAyuda.setVisible(true).setAlpha(0);
            avisar("ayuda");
            this.anim.agregar(reducido ? 200 : 1500, function (u) {
                var p = R().puntoEn(c, s0 + Math.min(260, c.largo - s0) * suave(u));
                self.luzAyuda.setPosition(p.x, p.y).setAlpha(Math.sin(u * Math.PI));
            }).then(function () { self.luzAyuda.setVisible(false); });
        }

        limpiarAyuda() { this.luzAyuda.setVisible(false); }

        // ------------------------------------------------------------------ nivel completado

        /** Toda la curva se ilumina, las estrellas laten en ola y aparece la figura del nivel. */
        completar() {
            var self = this;
            var c = this.camino;
            var fig = this.def.figura;
            this.estado = "meta";
            this.cinta = [];
            this.cintaG.clear();
            this.guia.clear();
            this.pintarLuz(c.largo);
            this.estrellas.forEach(function (e) { if (!e.on) self.encender(e.i); });
            avisar("figura", fig);
            var v0 = this.varita.alpha;
            var sec = this.anim.agregar(reducido ? 150 : 900, function (u) {
                // la varita se aparta (se desvanece) para que se vea la estrella final
                self.varita.setAlpha(v0 * (1 - u));
                self.varitaHalo.setAlpha(0.6 * (1 - u));
                self.varitaBrillo.setAlpha(1 - u);
                self.estrellas.forEach(function (e, i) {
                    var ui = Math.max(0, Math.min(1, u * 1.6 - i * 0.12));
                    if (ui > 0 && ui < 1) e.halo.setScale(e.halo.base * (1 + 0.6 * Math.sin(ui * Math.PI)));
                });
                self.luz.setAlpha(0.8 + 0.2 * Math.sin(u * Math.PI * 3));
                self.pintarLineas(u, fig);
            });
            var p = sec.then(function () {
                self.luz.setAlpha(1);
                if (fig === "cometa") return self.figuraCometa();
                if (fig === "luna") return self.figuraLuna();
                if (fig === "arco") return self.figuraArco();
                return self.figuraConstelacion();
            });
            this.estrellas.forEach(function (e, i) {
                setTimeout(function () {
                    self.particulas.emitir(e.x, e.y, { n: 8, vel: 160, angulo: -Math.PI / 2, apertura: 1.6, tintes: self.tintes(), escala: 0.3, vida: 1000, tipos: ["estrellita", "chispa"] });
                }, 120 * i);
            });
            return p;
        }

        /** Líneas de constelación que unen el inicio con cada estrella, en orden. */
        pintarLineas(u, fig) {
            var g = this.lineas;
            g.clear();
            var pts = [this.camino.inicio].concat(this.estrellas);
            var n = pts.length - 1;
            var hasta = u * n;
            for (var i = 0; i < n; i++) {
                if (hasta <= i) break;
                var k = Math.min(1, hasta - i);
                var a = pts[i], b = pts[i + 1];
                var col = fig === "constelacion" ? arcoiris(i / n) : this.colorNivel;
                g.lineStyle(7, col, 0.55);
                g.lineBetween(a.x, a.y, lerp(a.x, b.x, k), lerp(a.y, b.y, k));
                g.lineStyle(3, 0xffffff, 0.9);
                g.lineBetween(a.x, a.y, lerp(a.x, b.x, k), lerp(a.y, b.y, k));
            }
        }

        /** Nivel 1: un cometa azul cruza el cielo dejando estrellitas. */
        figuraCometa() {
            var self = this;
            var izq = Math.random() < 0.5;
            var y0 = 150 + Math.random() * 60, y1 = 110 + Math.random() * 80;
            var x0 = izq ? -200 : W + 200, x1 = izq ? W + 200 : -200;
            this.cometa.setFlipX(!izq).setAlpha(1);
            var ult = 0;
            return this.anim.agregar(reducido ? 300 : 2200, function (u) {
                var x = lerp(x0, x1, u), y = lerp(y0, y1, u) - Math.sin(u * Math.PI) * 60;
                self.cometa.setPosition(x, y);
                if (self.t - ult > 50) {
                    ult = self.t;
                    self.particulas.emitir(x + (izq ? -60 : 60), y, { n: 2, vel: 40, tintes: [0x8ce9ff, 0xffffff, 0x74c0fc], escala: 0.28, vida: 900, grav: 30, tipos: ["estrellita", "chispa"] });
                }
            }).then(function () { self.cometa.setAlpha(0); });
        }

        /** Nivel 2: la luna despierta, sonríe y se rodea de luz dorada. */
        figuraLuna() {
            var self = this;
            var ob = R().OBSTACULOS[0];
            avisar("luna");
            this.onda(ob.x, ob.y, 0xffd43b, 1.8);
            this.particulas.emitir(ob.x, ob.y, { n: 24, vel: 220, tintes: [0xffd43b, 0xffa94d, 0xffffff], escala: 0.34, vida: 1000, tipos: ["estrellita", "chispa"] });
            return this.anim.agregar(reducido ? 200 : 1600, function (u) {
                self.lunaFeliz.setAlpha(Math.min(1, u * 2.5));
                self.luna.setAlpha(1 - Math.min(1, u * 2.5));
                var k = 0.72 / D().res("luna-feliz") * (1 + 0.18 * Math.sin(Math.min(1, u * 1.4) * Math.PI));
                self.luna.setScale(k);
                self.lunaFeliz.setScale(k);
                self.lunaHalo.setTint(0xffd43b).setAlpha(0.35 + 0.5 * Math.sin(u * Math.PI)).setScale(self.lunaHalo.base * (1 + 0.4 * u));
            });
        }

        /** Nivel 3: aparece un arco mágico sobre las nubes rosadas. */
        figuraArco() {
            var self = this;
            var m = this.camino.muestras;
            var x0 = Infinity, x1 = -Infinity, y1 = -Infinity;
            m.forEach(function (p) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); });
            var ancho = Math.max(600, Math.min(1100, x1 - x0 + 120));
            var k = ancho / 800 * this.arco.base;
            this.arco.setPosition((x0 + x1) / 2, Math.min(800, y1 + 60));
            this.nubesNivel.forEach(function (n) { n.k = 1; });
            return this.anim.agregar(reducido ? 200 : 1500, function (u) {
                var e = saleSuave(u);
                self.arco.setAlpha(0.85 * e).setScale(k * (0.6 + 0.4 * e));
                if (u > 0.3 && Math.random() < 0.3) {
                    var ang = Math.PI + Math.random() * Math.PI;
                    self.particulas.emitir(self.arco.x + Math.cos(ang) * ancho * 0.45, self.arco.y + Math.sin(ang) * ancho * 0.48, { n: 2, vel: 60, tintes: [0xf783ac, 0xda77f2, 0xffffff], escala: 0.3, vida: 700, tipos: ["chispa"] });
                }
            });
        }

        /** Nivel 4: la constelación multicolor se une y nace una gran estrella en el centro. */
        figuraConstelacion() {
            var self = this;
            var cx = 0, cy = 0;
            this.estrellas.forEach(function (e) { cx += e.x; cy += e.y; });
            cx /= this.estrellas.length;
            cy /= this.estrellas.length;
            // que la gran estrella no tape una estrella del recorrido
            var libre = this.camino.muestras.every(function (m) { return Math.hypot(m.x - cx, m.y - cy) > 130; });
            if (!libre) {
                // el punto de la zona visible más alejado del camino (debajo del cartel de arriba)
                var mejor = -1, ms = this.camino.muestras;
                for (var gx = 330; gx <= 1270; gx += 40) {
                    for (var gy = 320; gy <= 700; gy += 40) {
                        var d = Infinity;
                        for (var q = 0; q < ms.length; q += 3) d = Math.min(d, Math.hypot(ms[q].x - gx, ms[q].y - gy));
                        if (d > mejor) { mejor = d; cx = gx; cy = gy; }
                    }
                }
            }
            this.estrellaMayor.setPosition(cx, cy);
            this.estrellaMayorCara.setPosition(cx, cy);
            this.estrellaMayorHalo.setPosition(cx, cy);
            var kb = 1.3 / D().res("estrella");
            return this.anim.agregar(reducido ? 200 : 1700, function (u) {
                var e = rebote(Math.min(1, u * 1.4));
                var col = arcoiris(self.t / 1600);
                self.estrellaMayor.setAlpha(Math.min(1, u * 3)).setScale(kb * e).setTint(col).setRotation(Math.sin(u * 6) * 0.1);
                self.estrellaMayorCara.setAlpha(Math.min(1, u * 3)).setScale(kb * e).setRotation(Math.sin(u * 6) * 0.1);
                self.estrellaMayorHalo.setAlpha(0.8 * Math.min(1, u * 2)).setTint(col).setScale(self.estrellaMayorHalo.base * e);
                self.pintarLineas(1, "constelacion");
                if (Math.random() < 0.35) self.particulas.emitir(cx, cy, { n: 2, vel: 260, tintes: [arcoiris(Math.random()), 0xffffff], escala: 0.32, vida: 800, tipos: ["estrellita", "chispa"] });
            });
        }

        // ------------------------------------------------------------------ final de la aventura

        /** Última estrella: la varita estalla en luz y todas las estrellas del cielo brillan. */
        granFinal() {
            var self = this;
            var x = this.varita.x, y = this.varita.y;
            avisar("explosion");
            this.brilloCielo = true;
            for (var k = 0; k < 4; k++) {
                (function (k) {
                    setTimeout(function () {
                        self.onda(x, y, arcoiris(k / 4), 1.6 + k * 0.7);
                        self.particulas.emitir(x, y, { n: 26, vel: 420 + k * 80, tintes: [arcoiris(Math.random()), arcoiris(Math.random()), 0xffffff], escala: 0.4, vida: 1100, tipos: ["estrellita", "chispa", "punto"] });
                    }, k * 160);
                })(k);
            }
            return this.anim.agregar(reducido ? 300 : 1700, function (u) {
                self.flash.setAlpha(0.65 * Math.max(0, Math.sin(Math.min(1, u * 2.2) * Math.PI)));
                self.estrellas.forEach(function (e) { e.halo.setTint(arcoiris(self.t / 900 + e.i / 6)); });
            });
        }

        /**
         * Escena final «El cielo de los pequeños magos»: cielo multicolor, luna sonriente, arcoíris, gran estrella
         * central con una corona de estrellas, lluvia de estrellas, confeti y partículas que suben. La fiesta sigue
         * hasta terminarFiesta(). La promesa se resuelve cuando la escena terminó de armarse.
         */
        escenaFinal() {
            var self = this;
            this.estado = "final";
            this.entradaOn = false;
            this.ptrId = null;
            this.particulas.apagar();
            this.guia.clear();
            this.cintaG.clear();
            var ocultar = [this.caminoImg, this.varita, this.varitaHalo, this.varitaBrillo, this.inicioAro, this.inicioHalo,
                this.cometa, this.estrellaMayor, this.estrellaMayorCara, this.estrellaMayorHalo, this.luzAyuda].filter(Boolean);
            this.estrellas.forEach(function (e) { ocultar.push(e.cuerpo, e.cara0, e.cara1, e.halo); });
            this.nubesNivel.forEach(function (n) { ocultar.push(n); });
            var desde = ocultar.map(function (o) { return o.alpha; });
            var lunaX0 = this.luna.x;
            var ob = R().OBSTACULOS[0];
            this.consolaVisible(false);
            // corona de estrellas alrededor de la gran estrella central
            this.corona.forEach(function (c) { c.cuerpo.destroy(); c.cara.destroy(); });
            this.corona = [];
            for (var i = 0; i < 10; i++) {
                var cu = img(this, W / 2, 470, "estrella", 0.46).setDepth(13).setTint(arcoiris(i / 10)).setAlpha(0);
                var ca = img(this, W / 2, 470, "cara-feliz", 0.46).setDepth(13.1).setAlpha(0);
                this.corona.push({ cuerpo: cu, cara: ca, ang: i / 10 * Math.PI * 2 });
            }
            this.centro = { x: W / 2, y: 480 };
            this.estrellaMayor.setPosition(W / 2, 480).setRotation(0);
            this.estrellaMayorCara.setPosition(W / 2, 480).setRotation(0);
            this.estrellaMayorHalo.setPosition(W / 2, 480);
            this.arco.setPosition(W / 2, 760);
            this.fiesta = { t: 0, lluvia: 0, confeti: 0, sube: 0, entrada: 0 };
            var kb = 1.7 / D().res("estrella");
            var ka = 1.55 * this.arco.base;
            return this.anim.agregar(reducido ? 300 : 2600, function (u) {
                var a = suave(Math.min(1, u * 2));
                ocultar.forEach(function (o, k) { o.setAlpha(desde[k] * (1 - a)); });
                self.luz.setAlpha(1 - a);
                self.lineas.setAlpha(1 - a);
                self.cieloFinal.setAlpha(a);
                self.lunaFeliz.setAlpha(a);
                self.luna.setAlpha(1 - a);
                var kl = 0.72 / D().res("luna-feliz") * (1 + 0.35 * a);
                self.lunaFeliz.setScale(kl).setPosition(lerp(lunaX0, 320, a), lerp(ob.y, 300, a));
                self.lunaHalo.setTint(0xfff3bf).setAlpha(0.6 * a).setPosition(self.lunaFeliz.x, self.lunaFeliz.y);
                self.luna.setPosition(self.lunaFeliz.x, self.lunaFeliz.y);
                // el arcoíris crece desde el lado de Zoe
                var ua = suave(Math.max(0, Math.min(1, (u - 0.25) / 0.5)));
                self.arco.setAlpha(0.9 * ua).setScale(ka * (0.4 + 0.6 * ua));
                var ue = Math.max(0, Math.min(1, (u - 0.45) / 0.5));
                var e = ue > 0 ? rebote(ue) : 0;
                self.estrellaMayor.setAlpha(ue > 0 ? 1 : 0).setScale(kb * e).setTint(arcoiris(self.t / 2200));
                self.estrellaMayorCara.setAlpha(ue > 0 ? 1 : 0).setScale(kb * e);
                self.estrellaMayorHalo.setAlpha(0.85 * Math.min(1, ue * 2)).setScale(self.estrellaMayorHalo.base * 1.3 * e).setTint(0xfff3bf);
                self.fiesta.entrada = Math.max(0, (u - 0.6) / 0.4);
            }).then(function () {
                self.lineas.clear();
                self.lineas.setAlpha(1);
                self.luz.clear();
                self.luz.setAlpha(1);
                self.brilloCielo = true;
            });
        }

        animarFinal(dt) {
            var f = this.fiesta;
            if (!f) return;
            f.t += dt;
            var t = this.t;
            var c = this.centro;
            var entrada = suave(Math.min(1, f.entrada));
            var self = this;
            // corona que gira despacio y late
            this.corona.forEach(function (s, i) {
                var ang = s.ang + t / 5200;
                var r = 1 + 0.06 * Math.sin(t / 500 + i);
                var x = c.x + Math.cos(ang) * 255 * r, y = c.y + Math.sin(ang) * 165 * r;
                var k = s.cuerpo.base * (0.9 + 0.15 * Math.sin(t / 300 + i)) * entrada;
                s.cuerpo.setPosition(x, y).setScale(k).setAlpha(entrada).setTint(arcoiris(i / 10 + t / 6000));
                s.cara.setPosition(x, y).setScale(k).setAlpha(entrada);
            });
            if (this.estrellaMayor.alpha > 0) {
                var lat = 1 + 0.05 * Math.sin(t / 420);
                var kb = 1.7 / D().res("estrella") * lat;
                this.estrellaMayor.setScale(kb).setTint(arcoiris(t / 2200)).setRotation(Math.sin(t / 900) * 0.06);
                this.estrellaMayorCara.setScale(kb).setRotation(Math.sin(t / 900) * 0.06);
            }
            this.lunaFeliz.setRotation(Math.sin(t / 1300) * 0.06);
            if (!f.activa) return;
            // lluvia de estrellas, confeti mágico y partículas que suben (ritmo fijo, reserva fija)
            f.lluvia += dt;
            f.confeti += dt;
            f.sube += dt;
            if (f.lluvia > 120) {
                f.lluvia = 0;
                this.lluvia.emitir(100 + Math.random() * 1400, -20, { n: 1, vel: 190, angulo: Math.PI / 2 + 0.25, apertura: 0.3, tintes: [arcoiris(Math.random()), 0xffffff], escala: 0.42, vida: 4600, roce: 1, giro: 3, tipos: ["estrellita"], dispersion: 0 });
            }
            if (f.confeti > 80) {
                f.confeti = 0;
                this.lluvia.emitir(Math.random() * W, -10, { n: 1, vel: 120, angulo: Math.PI / 2, apertura: 0.6, tintes: [0xff6b6b, 0xffd43b, 0x69db7c, 0x4dabf7, 0xda77f2, 0xff8fab], escala: 0.9, vida: 6000, roce: 1, giro: 9, oscila: 60, tipos: ["confeti"], normal: true, dispersion: 0 });
            }
            if (f.sube > 170) {
                f.sube = 0;
                this.lluvia.emitir(200 + Math.random() * 1200, H + 10, { n: 1, vel: 90, angulo: -Math.PI / 2, apertura: 0.4, tintes: [0xfff3bf, 0xffd6f0, 0xd0ebff], escala: 0.5, vida: 4200, roce: 1, oscila: 25, tipos: ["punto"], dispersion: 0 });
            }
            if (f.t % 1400 < dt) {
                var ang = Math.random() * Math.PI * 2;
                self.onda(c.x + Math.cos(ang) * 120, c.y + Math.sin(ang) * 80, arcoiris(Math.random()), 1.2);
            }
        }

        fiestaActiva(on) { if (this.fiesta) this.fiesta.activa = !!on; }

        terminarFiesta() {
            if (this.fiesta) this.fiesta.activa = false;
            this.lluvia.apagar();
            this.brilloCielo = false;
        }

        /** Restaura el cielo de juego (si se vuelve a jugar sin recargar). */
        restaurarCielo() {
            this.terminarFiesta();
            this.fiesta = null;
            this.estado = "oculta";
            this.cieloFinal.setAlpha(0);
            this.corona.forEach(function (c) { c.cuerpo.destroy(); c.cara.destroy(); });
            this.corona = [];
            var ob = R().OBSTACULOS[0];
            this.lunaFeliz.setPosition(ob.x, ob.y).setRotation(0);
            this.luna.setPosition(ob.x, ob.y);
            this.lunaHalo.setPosition(ob.x, ob.y);
            this.arco.setAlpha(0);
            this.consolaVisible(true);
        }

        // ------------------------------------------------------------------ consola de niveles

        pintarConsola() {
            var self = this;
            this.consola.forEach(function (o) { o.destroy(); });
            this.consola = [];
            var info = this.nivelesInfo;
            var n = info.total || 4;
            var x0 = CONSOLA.x - (n - 1) * CONSOLA.sep / 2;
            for (var i = 0; i < n; i++) {
                var x = x0 + i * CONSOLA.sep;
                var hecho = i < info.hechos;
                var actual = i === info.actual;
                var col = hex((info.colores || [])[i] || "#ffffff");
                var base = img(this, x, CONSOLA.y, "ranura", actual ? 0.95 : 0.8).setDepth(30);
                var est = img(this, x, CONSOLA.y, "estrella", hecho ? 0.4 : (actual ? 0.36 : 0.3)).setDepth(31)
                    .setTint(hecho ? col : (actual ? mezclar(col, 0xffffff, 0.45) : 0xb8bce6)).setAlpha(hecho || actual ? 1 : 0.6);
                var cara = img(this, x, CONSOLA.y, hecho ? "cara-feliz" : "cara-dormida", hecho ? 0.4 : (actual ? 0.36 : 0.3)).setDepth(31.1).setAlpha(hecho || actual ? 1 : 0.6);
                var o = [base, est, cara];
                if (actual) {
                    var h = img(this, x, CONSOLA.y, "halo", 1.0).setDepth(29.5).setBlendMode(Phaser.BlendModes.ADD).setTint(col).setAlpha(0.7);
                    o.push(h);
                    (function (h, est) {
                        var latir = function () {
                            if (!h.active) return;
                            self.anim.agregar(1100, function (u) {
                                if (!h.active) return;
                                h.setAlpha(0.35 + 0.45 * Math.sin(u * Math.PI));
                            }).then(latir);
                        };
                        latir();
                    })(h, est);
                }
                o.forEach(function (q) { q.esConsola = true; q.setVisible(self.mostrarConsola && !self.consolaOculta); });
                this.consola = this.consola.concat(o);
            }
        }

        consolaVisible(on) {
            this.consolaOculta = !on;
            var vis = this.mostrarConsola && on;
            this.consola.forEach(function (o) { o.setVisible(vis); });
        }

        ganarNivelConsola(i) {
            var info = this.nivelesInfo;
            var n = info.total || 4;
            var x = CONSOLA.x - (n - 1) * CONSOLA.sep / 2 + i * CONSOLA.sep;
            if (!this.mostrarConsola) return;
            this.onda(x, CONSOLA.y, hex((info.colores || [])[i] || "#ffffff"), 0.8);
            this.particulas.emitir(x, CONSOLA.y, { n: 12, vel: 180, tintes: this.tintes(), escala: 0.3, tipos: ["estrellita", "chispa"] });
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
            backgroundColor: "#6f74e6",
            banner: false,
            scale: { mode: Phaser.Scale.ENVELOP, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
            input: { activePointers: 3 },
            render: { antialias: true },
            scene: [EscenaVarita]
        });
        global.__escenarioVarita = juego;
        global.__pedniaPhaserGame = juego;
    }

    // ------------------------------------------------------------------ API pública

    global.EscenarioVarita = {
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
        cargar: function (camino, def) { return escena ? escena.cargar(camino, def) : null; },
        presentar: function () { return escena ? escena.presentar() : Promise.resolve(); },
        demo: function (mano) { return escena ? escena.demo(mano) : Promise.resolve(); },
        /** Habilita o bloquea la entrada. Al bloquear, si la varita iba tomada se suelta sin castigo. */
        entrada: function (on) {
            if (!escena) return;
            escena.entradaOn = !!on;
            if (!on && escena.ptrId !== null) {
                escena.ptrId = null;
                escena.ptr = null;
                escena.guia.clear();
                if (escena.est) { R().soltar(escena.est); escena.est.fuera = false; }
                if (escena.estado === "trazando") escena.estado = "lista";
            }
        },
        completar: function () { return escena ? escena.completar() : Promise.resolve(); },
        granFinal: function () { return escena ? escena.granFinal() : Promise.resolve(); },
        escenaFinal: function () { return escena ? escena.escenaFinal() : Promise.resolve(); },
        fiesta: function (on) { if (escena) escena.fiestaActiva(on); },
        terminarFiesta: function () { if (escena) escena.terminarFiesta(); },
        restaurarCielo: function () { if (escena) escena.restaurarCielo(); },
        ayuda: function () { if (escena && escena.camino) escena.ayuda(); },
        limpiarAyuda: function () { if (escena) escena.limpiarAyuda(); },
        destelloVarita: function () {
            if (!escena || !escena.est) return;
            escena.onda(escena.est.x, escena.est.y, 0xffffff, 1);
            escena.particulas.emitir(escena.est.x, escena.est.y, { n: 8, vel: 140, tintes: escena.tintes(), escala: 0.26 });
        },
        niveles: function (total, actual, hechos, colores) {
            if (!escena) return;
            escena.nivelesInfo = { total: total, actual: actual, hechos: hechos, colores: colores || escena.nivelesInfo.colores };
            escena.pintarConsola();
        },
        ganarNivel: function (i) { if (escena) escena.ganarNivelConsola(i); },
        mostrarProgreso: function (on) {
            if (!escena) return;
            escena.mostrarConsola = !!on;
            escena.consolaVisible(!escena.consolaOculta);
        },
        aPantalla: aPantalla,
        aMundo: aMundo,
        camino: function () { return escena ? escena.camino : null; },
        puntoEn: function (s) { return escena && escena.camino ? R().puntoEn(escena.camino, s) : null; },
        /** Pruebas: el mismo camino que el dedo (bajar, mover, subir en coordenadas del mundo). */
        probar: {
            bajar: function (x, y) { if (escena) escena.bajar("prueba", { x: x, y: y }); },
            mover: function (x, y) { if (escena && escena.ptrId === "prueba") { escena.ptr = { x: x, y: y }; escena.ptrNuevo = true; } },
            subir: function () { if (escena && escena.ptrId === "prueba") escena.liberar(); },
            paso: function (ms) { if (escena) escena.update(0, ms || 16); }
        },
        estado: function () {
            if (!escena || !escena.camino) return null;
            var e = escena.est;
            return {
                estado: escena.estado,
                s: Math.round(e.s),
                largo: Math.round(escena.camino.largo),
                encendidas: e.encendidas,
                estrellas: escena.camino.estrellas.length,
                conectado: e.conectado,
                fuera: e.fuera,
                enMeta: e.enMeta,
                plantilla: escena.camino.plantilla,
                respaldo: !!escena.camino.respaldo,
                x: Math.round(e.x),
                y: Math.round(e.y),
                entrada: escena.entradaOn
            };
        }
    };
})(typeof window !== "undefined" ? window : global);
