/**
 * EscenarioLluvia — escena Phaser 4 de "La lluvia de colores y las flores del jardín" (window.EscenarioLluvia).
 *
 * Dibuja el jardín por capas (cielo, sol, nubecitas que pasan, arcoíris, colinas, césped y adornos), los carriles
 * verticales de gotitas punteadas, las nubes grandes (inicio de cada trazo) con su flecha hacia abajo, la gotita
 * que acompaña al dedo, las flores (tristes → regadas → felices), las mariposas, el progreso y la cinemática final.
 *
 * No decide nada: cada movimiento del dedo pasa por ReglasLluvia.seguir() y la escena avisa los eventos a script.js
 * (tomar, punto, mover, fuera, vuelve, meta, reintento, riego, florece, jardinCompleto, tocaCarril, tocaFuera…).
 *
 * Mundo de diseño 1600 × 900 con Scale.ENVELOP (llena la pantalla sin deformar); los carriles quedan en la franja
 * central (ReglasLluvia.ZONA), que cabe en 4:3. Cada animación que el flujo espera es una Promise con respaldo por
 * tiempo (Animador): con la pestaña oculta los cuadros no corren.
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser;
    var W = 1600, H = 900;
    var CONSOLA_Y = 864;
    var GRIS_GUIA = 0x86b4ec;
    var TRISTE = 0x9aa3b5;

    var D = function () { return global.DibujosLluvia; };
    var R = function () { return global.ReglasLluvia; };

    var juego = null, escena = null, el = null, cfg = null, espera = null;
    var cb = {};
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);

    function avisar(nombre, a) {
        var f = cb[nombre];
        if (typeof f === "function") {
            try { f(a); } catch (e) { console.warn("[EscenarioLluvia]", nombre, e); }
        }
    }

    function suave(u) { return u * u * (3 - 2 * u); }
    function saleSuave(u) { return 1 - Math.pow(1 - u, 3); }
    function rebote(u) { var c = 1.7; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); }
    function lerp(a, b, u) { return a + (b - a) * u; }
    function jcfg() { return (cfg && cfg.juego) || {}; }
    function hex(c) { return typeof c === "number" ? c : parseInt(String(c || "#ffffff").replace("#", ""), 16); }
    function mezclar(a, b, u) {
        var ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
        var br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
        return (Math.round(lerp(ar, br, u)) << 16) | (Math.round(lerp(ag, bg, u)) << 8) | Math.round(lerp(ab, bb, u));
    }
    var ARCOIRIS = [0xff8787, 0xffc078, 0xffe066, 0x8ce99a, 0x74c0fc, 0xb197fc, 0xff8cc6];

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
            p.giro = o.sinGiro ? 0 : (Math.random() - 0.5) * (o.giro || 6);
            p.esc = (o.escala || 0.35) * (0.6 + Math.random() * 0.7) / D().res(tx);
            p.oscila = o.oscila || 0;
            p.fase = Math.random() * 6;
            p.encoge = o.encoge != null ? o.encoge : 0.35;
            p.img.setTexture(tx);
            p.img.setBlendMode(o.normal ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD);
            p.img.setTint(o.tintes ? o.tintes[Math.floor(Math.random() * o.tintes.length)] : 0xffffff);
            p.img.setPosition(x + (Math.random() - 0.5) * (o.dispersion || 10), y + (Math.random() - 0.5) * (o.dispersionY != null ? o.dispersionY : (o.dispersion || 10)));
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
            p.img.setAlpha(p.a0 * (u < 0.75 ? 1 : 1 - (u - 0.75) / 0.25));
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

    /** Imagen a su tamaño de diseño: compensa la resolución a la que se rasterizó el SVG. */
    function img(scene, x, y, key, k) {
        var i = scene.add.image(x, y, key);
        i.base = (k || 1) / D().res(key);
        i.setScale(i.base);
        return i;
    }

    function fijarEscala(o, k) { o.setScale(o.base * k); }

    // ------------------------------------------------------------------ escena

    var EscenaLluvia = Phaser ? class extends Phaser.Scene {
        constructor() { super({ key: "Lluvia" }); }

        create() {
            var self = this;
            D().claves().forEach(function (k) { tex(self, k); });
            this.anim = new Animador();
            this.t = 0;
            this.jardin = null;
            this.def = null;
            this.estados = [];
            this.carriles = [];      // objetos visuales por carril: banda, gotitas, flecha, nube, flor
            this.adornos = [];
            this.mariposas = [];
            this.cruces = [];
            this.finales = [];
            this.activo = -1;
            this.estado = "oculta";   // oculta · lista · trazando · volviendo · riego · completo · final
            this.entradaOn = false;
            this.ptrId = null;
            this.ptr = null;
            this.metaT = 0;
            this.viento = 0;
            this.fiestaOn = false;
            this.lluviaOn = false;
            this.tFiesta = 0;
            this.tLluvia = 0;
            this.mostrarConsola = true;
            this.consolaOculta = false;
            this.nivelesInfo = { total: 4, actual: 0, hechos: 0, colores: [] };
            this.ultimoIntento = -1;

            // fondo
            // fondo por capas: cielo, luz cálida, sol con rayos, nubecitas, arcoíris, montañas, dos colinas y césped.
            // El jardín "reacciona": empieza un poco reseco y cada flor regada le devuelve el color (vida 0 → 1).
            this.fondo = img(this, W / 2, H / 2, "fondo").setDepth(0);
            this.calido = img(this, W / 2, H / 2, "cieloCalido").setDepth(0.2).setAlpha(0);
            this.rayos = img(this, 1230, 100, "rayosSol", 0.6).setDepth(0.6).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.6);
            this.sol = img(this, 1230, 100, "sol", 0.62).setDepth(1);
            this.arco = img(this, W / 2, 690, "arcoiris", 1.25).setOrigin(0.5, 1).setDepth(2).setAlpha(0);
            this.nubesDeco = [];
            for (var i = 0; i < 5; i++) {
                var nd = img(this, 200 + i * 330, 70 + (i % 2) * 70, "nubeDeco", 0.55 + (i % 3) * 0.12).setDepth(1.5).setAlpha(0.9);
                nd.vel = 8 + i * 3;
                this.nubesDeco.push(nd);
            }
            this.montanas = img(this, W / 2, 660, "montanas").setOrigin(0.5, 1).setDepth(2.2);
            this.colinasL = img(this, W / 2, 790, "colinasLejos").setOrigin(0.5, 1).setDepth(3);
            this.colinasC = img(this, W / 2, 840, "colinasCerca").setOrigin(0.5, 1).setDepth(4);
            this.brilloFinal = this.add.rectangle(W / 2, H / 2, W, H, 0xfff3bf).setDepth(4.9).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
            this.cesped = img(this, W / 2, 772, "cesped").setOrigin(0.5, 0).setDepth(36);
            this.pajaros = [];
            for (var b = 0; b < 3; b++) {
                var pj = img(this, -100, 0, "pajaro", 0.55 - b * 0.08).setDepth(5).setVisible(false);
                pj.vivo = false;
                this.pajaros.push(pj);
            }
            this.tPajaros = 2000;
            this.brotes = [];
            this.vida = 0;
            this.vidaVis = 0;
            this.calidoBase = 0.2;
            this.solPulso = 0;
            this.solGiro = 0;

            // la gotita que acompaña al dedo y la gotita fantasma de la ayuda
            this.gota = this.add.container(0, 0).setDepth(33).setVisible(false);
            this.gotaCuerpo = img(this, 0, -8, "gota", 0.8);
            this.gotaCara = img(this, 0, 6, "caraGota", 0.8);
            this.gota.add([this.gotaCuerpo, this.gotaCara]);
            this.fantasma = img(this, 0, 0, "gota", 0.7).setDepth(32).setVisible(false).setAlpha(0.6);
            this.fantasmaBrillo = img(this, 0, 0, "brillo", 1.3).setDepth(31).setVisible(false).setBlendMode(Phaser.BlendModes.ADD);

            this.lluviaP = new Particulas(this, 140, 29);
            this.particulas = new Particulas(this, 180, 60);
            this.consola = [];
            this.crearEntrada();

            escena = this;
            if (espera) { var e = espera; espera = null; e(true); }
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
            if (!this.entradaOn || !this.jardin || this.ptrId !== null || this.estado !== "lista") return;
            var i = R().nubeEn(this.jardin, this.estados, w.x, w.y, jcfg());
            if (i >= 0) { this.tomar(i, id, w); return; }
            var k = R().carrilEn(this.jardin, this.estados, w.x, w.y);
            if (k >= 0) {
                this.pulsoNube(k);
                avisar("tocaCarril", { i: k });
                return;
            }
            // ¿una flor que ya está feliz? un brillito, nada más
            for (var f = 0; f < this.carriles.length; f++) {
                var c = this.jardin.carriles[f];
                if (this.estados[f].hecho && Math.abs(w.x - c.x) < 90 && w.y > 480) {
                    this.particulas.emitir(c.x, 600, { n: 8, vel: 140, tintes: [hex(c.color), 0xffffff], escala: 0.3 });
                    avisar("tocaFlor", { i: f });
                    return;
                }
            }
            avisar("tocaFuera", w);
        }

        tomar(i, id, w) {
            var c = this.jardin.carriles[i];
            var est = this.estados[i];
            this.ptrId = id;
            this.ptr = w;
            this.activo = i;
            this.ultimoIntento = i;
            this.metaT = 0;
            R().tomar(c, est, w.x, w.y);
            this.estado = "trazando";
            this.limpiarAyuda();
            var v = this.carriles[i];
            v.luz = 0;
            this.encenderHasta(i, est.s);
            this.gota.setPosition(c.x, c.y0).setVisible(true).setAlpha(1).setScale(0.3);
            this.gotaCuerpo.setTint(hex(c.color));
            this.gx = c.x;
            this.gy = c.y0;
            var self = this;
            this.anim.agregar(reducido ? 60 : 260, function (u) { self.gota.setScale(lerp(0.3, 1, rebote(u))); });
            this.apretarNube(i);
            avisar("tomar", { i: i });
        }

        procesarDedo() {
            if (this.estado !== "trazando" || this.activo < 0 || !this.ptr) return;
            var i = this.activo;
            var c = this.jardin.carriles[i];
            var est = this.estados[i];
            var ev = R().seguir(c, est, this.ptr.x, this.ptr.y, jcfg());
            this.encenderHasta(i, est.s);
            if (ev.delta > 0) avisar("mover", { avance: R().avance(c, est) });
            if (ev.tipo === "fuera") {
                avisar("fuera", { i: i });
                this.guiarVuelta(i);
            } else if (ev.tipo === "vuelve") {
                avisar("vuelve", { i: i });
            } else if (ev.tipo === "meta") {
                this.florEspera(i, true);
                avisar("meta", { i: i });
            }
        }

        /** Enciende las gotitas guía hasta el progreso s (las ya encendidas no se apagan durante el trazo). */
        encenderHasta(i, s) {
            var c = this.jardin.carriles[i];
            var v = this.carriles[i];
            var y = c.y0 + s + 4;
            while (v.luz < v.gotitas.length && c.puntos[v.luz] <= y) {
                this.encenderGotita(i, v.luz);
                avisar("punto", { i: v.luz, total: v.gotitas.length });
                v.luz++;
            }
        }

        encenderGotita(i, k) {
            var c = this.jardin.carriles[i];
            var g = this.carriles[i].gotitas[k];
            if (!g || g.on) return;
            g.on = true;
            g.setTint(hex(c.color)).setAlpha(1);
            var self = this;
            this.anim.agregar(reducido ? 60 : 280, function (u) { fijarEscala(g, lerp(1.5, 1.2, saleSuave(u))); });
            this.particulas.emitir(R().xEn(c, c.puntos[k]), c.puntos[k], { n: 2, vel: 70, tintes: [hex(c.color), 0xffffff], escala: 0.2, vida: 420 });
        }

        apagarGotitas(i, animar) {
            var self = this;
            var v = this.carriles[i];
            var lista = v.gotitas.filter(function (g) { return g.on; }).reverse();
            v.luz = 0;
            lista.forEach(function (g, k) {
                var hacer = function () {
                    g.on = false;
                    g.setTint(GRIS_GUIA).setAlpha(0.85);
                    fijarEscala(g, 1);
                };
                if (!animar || reducido) hacer();
                else setTimeout(hacer, k * 35);
            });
            return animar ? lista.length * 35 : 0;
        }

        guiarVuelta(i) {
            var c = this.jardin.carriles[i];
            var est = this.estados[i];
            // destello sobre el tramo donde iba: "aquí está el camino"
            this.onda(R().xEn(c, c.y0 + est.s), c.y0 + est.s, hex(c.color), 0.8);
        }

        liberar(porEspera) {
            if (this.ptrId === null) return;
            this.ptrId = null;
            this.ptr = null;
            var i = this.activo;
            if (i < 0 || !this.jardin) return;
            var c = this.jardin.carriles[i];
            var est = this.estados[i];
            var r = R().soltar(c, est, jcfg());
            this.florEspera(i, false);
            if (r.resultado === "exito") this.regar(i, !!porEspera);
            else if (r.resultado === "nada") this.estado = "lista";
            else this.reintento(i, r);
        }

        /** El dedo se levantó antes de la flor: la gotita vuelve a su nube y las gotitas se apagan (sin castigo). */
        reintento(i, r) {
            var self = this;
            var c = this.jardin.carriles[i];
            this.estado = "volviendo";
            var x0 = this.gota.x, y0 = this.gota.y;
            var espera = this.apagarGotitas(i, true);
            this.anim.agregar(reducido ? 80 : Math.max(420, espera + 120), function (u) {
                var a = suave(u);
                self.gota.setPosition(lerp(x0, c.x, a), lerp(y0, c.nubeY + 20, a) - Math.sin(u * Math.PI) * 30);
                self.gota.setScale(lerp(1, 0.4, a)).setAlpha(1 - a * 0.9);
            }).then(function () {
                self.gota.setVisible(false);
                self.activo = -1;
                if (self.estado === "volviendo") self.estado = "lista";
                self.pulsoNube(i);
                avisar("reintento", { i: i, resultado: r.resultado, s: r.s });
            });
        }

        // ------------------------------------------------------------------ riego y flores

        regar(i, porEspera) {
            var self = this;
            var c = this.jardin.carriles[i];
            var v = this.carriles[i];
            var f = v.flor;
            this.estado = "riego";
            this.activo = -1;
            v.flecha.setAlpha(0);
            var x0 = this.gota.x, y0 = this.gota.y;
            var cabeza = f.cabezaMundo();
            this.anim.agregar(reducido ? 60 : 260, function (u) {
                var a = suave(u);
                self.gota.setPosition(lerp(x0, cabeza.x, a), lerp(y0, cabeza.y - 10, a));
                self.gota.setScale(lerp(1, 0.7, a));
            }).then(function () {
                self.gota.setVisible(false);
                avisar("riego", { i: i });
                self.particulas.emitir(cabeza.x, cabeza.y - 10, { n: 14, vel: 260, angulo: -Math.PI / 2, apertura: 2.4, grav: 700, tintes: [hex(c.color), 0xd0ebff, 0xffffff], escala: 0.32, tipos: ["gotaLluvia"], normal: true, sinGiro: false, vida: 650 });
                v.nube.lluvia = 1100;
                self.carrilHecho(i);
                self.pintarConsola();
                self.revivirJardin(i);
                // la flor crece sola: mientras tanto ya se puede empezar otra nube (si queda alguna)
                if (!R().completo(self.estados) && self.estado === "riego") self.estado = "lista";
                return self.florecer(f, c);
            }).then(function () {
                f.florecida = true;
                avisar("florece", { i: i, quedan: self.estados.filter(function (e) { return !e.hecho; }).length, variante: c.variante });
                // el nivel termina cuando TODAS las flores ya abrieron (una sola vez)
                var todas = self.carriles.every(function (w) { return w.flor.florecida; });
                if (R().completo(self.estados) && todas && !self.completoAvisado) {
                    self.completoAvisado = true;
                    self.estado = "completo";
                    avisar("jardinCompleto", {});
                }
            });
        }

        // ------------------------------------------------------------------ el jardín reacciona

        /** Florecitas escondidas en las colinas y el césped; brotan al regar las flores cercanas. */
        crearBrotes() {
            var self = this;
            this.brotes.forEach(function (b) { b.destroy(); });
            this.brotes = [];
            var cols = [0xff6b9d, 0xffd43b, 0xb197fc, 0xff922b, 0x4dabf7, 0xff8787, 0x63e6be, 0xf783ac];
            var carriles = this.jardin ? this.jardin.carriles : [];
            var poner = function (x, y, k, prof) {
                var b = img(self, x, y, "brote", k).setOrigin(0.5, 1).setDepth(prof).setTint(cols[self.brotes.length % cols.length]);
                b.setScale(b.base, 0.001).setVisible(false);
                b.salio = false;
                b.fase = Math.random() * 6;
                self.brotes.push(b);
            };
            for (var i = 0; i < 18; i++) poner(110 + Math.random() * 1380, 690 + Math.random() * 70, 0.65 + Math.random() * 0.35, 4.5);
            for (var k = 0, n = 0; k < 60 && n < 9; k++) {
                var x = 120 + Math.random() * 1360;
                if (carriles.some(function (c) { return Math.abs(c.x - x) < 85; })) continue;
                poner(x, 790 + Math.random() * 30, 0.8 + Math.random() * 0.3, 37);
                n++;
            }
        }

        brotar(b, retraso) {
            if (b.salio) return;
            b.salio = true;
            var self = this;
            setTimeout(function () {
                if (!b.scene) return;
                b.setVisible(true);
                self.anim.agregar(reducido ? 60 : 500, function (u) { b.setScale(b.base, b.base * Math.max(0.001, rebote(u))); });
                self.particulas.emitir(b.x, b.y - 30, { n: 3, vel: 90, tintes: [b.tintTopLeft, 0xffffff], escala: 0.18, vida: 500 });
            }, reducido ? 0 : retraso);
        }

        /**
         * Una flor regada revive el jardín: sube la "vida" (colores más vivos, arcoíris, luz cálida), el sol se
         * alegra, una ola de color recorre el fondo, brotan florecitas cerca y sale una mariposa de la flor.
         */
        revivirJardin(i) {
            var self = this;
            var c = this.jardin.carriles[i];
            var hechas = this.estados.filter(function (e) { return e.hecho; }).length;
            this.vida = hechas / Math.max(1, this.estados.length);
            this.solPulso = 1;
            this.solGiro = 0.004;
            // ola de color detrás de todo
            var ola = img(this, c.x, 720, "brillo", 1).setDepth(4.8).setTint(hex(c.color)).setBlendMode(Phaser.BlendModes.ADD);
            this.anim.agregar(reducido ? 100 : 1300, function (u) {
                fijarEscala(ola, lerp(1, 16, saleSuave(u)));
                ola.setAlpha(0.55 * (1 - u));
            }).then(function () { ola.destroy(); });
            // florecitas: las más cercanas a esta flor que aún no salieron
            var quedan = this.brotes.filter(function (b) { return !b.salio; });
            var cuota = hechas >= this.estados.length ? quedan.length : Math.ceil(this.brotes.length / this.estados.length);
            quedan.sort(function (a, b) { return Math.abs(a.x - c.x) - Math.abs(b.x - c.x); });
            quedan.slice(0, cuota).forEach(function (b, k) { self.brotar(b, 200 + k * 80); });
            // una mariposa nace de la flor y se va a volar con las demás
            if (this.mariposas.length < 9) {
                var cols = [0xff8cc6, 0xffd43b, 0x74c0fc, 0xb197fc, 0xffa94d, 0x63e6be];
                var m = this.crearMariposa(c.x, 640, cols[Math.floor(Math.random() * cols.length)], Math.random() * 6, 0.8 + Math.random() * 0.4, 16);
                var dx = 260 + Math.random() * 1080, dy = 300 + Math.random() * 220;
                m.x0 = c.x; m.y0 = 640;
                this.mariposas.push(m);
                this.anim.agregar(reducido ? 100 : 1600, function (u) {
                    var a = suave(u);
                    m.x0 = lerp(c.x, dx, a);
                    m.y0 = lerp(640, dy, a);
                });
            }
        }

        /** Capas del fondo según la vida del jardín (se llama cada cuadro). */
        pintarVida(dt, t) {
            this.vidaVis += (this.vida - this.vidaVis) * Math.min(1, dt / 700);
            var v = this.vidaVis;
            var seco = mezclar(0xd9cfa8, 0xffffff, v);
            this.colinasL.setTint(seco);
            this.colinasC.setTint(seco);
            this.cesped.setTint(seco);
            this.montanas.setTint(mezclar(0xdcd6e8, 0xffffff, v));
            this.fondo.setTint(mezclar(0xd8e0ea, 0xffffff, v));
            this.calido.setAlpha(this.calidoBase * (0.35 + 0.65 * v));
            this.solPulso = Math.max(0, this.solPulso - dt / 900);
            this.solGiro *= Math.pow(0.5, dt / 600);
            this.rayos.rotation += dt * (0.00005 + 0.00006 * v + this.solGiro);
            this.rayos.setAlpha(0.35 + 0.35 * v + this.solPulso * 0.15);
            fijarEscala(this.rayos, 1 + 0.05 * Math.sin(t / 700) + this.solPulso * 0.18 + v * 0.08);
            fijarEscala(this.sol, 1 + this.solPulso * 0.18 * Math.sin(this.solPulso * Math.PI));
            this.sol.rotation = Math.sin(t / 3000) * 0.05;
            if (this.estado !== "final" && this.estado !== "oculta") {
                var meta = Math.max(this.arcoMeta || 0, v * 0.6);
                this.arco.alpha += (meta - this.arco.alpha) * Math.min(1, dt / 500);
            }
            // las florecitas que ya salieron se mecen
            for (var i = 0; i < this.brotes.length; i++) {
                var b = this.brotes[i];
                if (b.salio) b.rotation = Math.sin(t / 650 + b.fase) * 0.08 + this.viento * Math.sin(t / 180 + b.fase) * 0.2;
            }
            // pajaritos cuando el jardín ya va a medio camino
            if (v >= 0.5 || this.estado === "final") {
                this.tPajaros -= dt;
                if (this.tPajaros <= 0) {
                    this.tPajaros = 5000 + Math.random() * 4000;
                    var y0 = 160 + Math.random() * 140, izq = Math.random() < 0.5;
                    this.pajaros.forEach(function (p, k) {
                        p.vivo = true;
                        p.vel = (izq ? 1 : -1) * (150 + k * 12);
                        p.setPosition(izq ? -60 - k * 70 : W + 60 + k * 70, y0 + k * 26).setVisible(true).setFlipX(!izq);
                    });
                }
            }
            this.pajaros.forEach(function (p, k) {
                if (!p.vivo) return;
                p.x += p.vel * dt / 1000;
                p.y += Math.sin(t / 400 + k) * 0.25;
                p.scaleY = p.base * (0.45 + Math.abs(Math.sin(t / 110 + k)) * 0.55);
                if (p.x < -160 || p.x > W + 160) { p.vivo = false; p.setVisible(false); }
            });
        }

        /** El carril regado cambia de aspecto: gotitas del color de la flor que brillan en ola y banda teñida. */
        carrilHecho(i) {
            var c = this.jardin.carriles[i];
            var v = this.carriles[i];
            var self = this;
            v.gotitas.forEach(function (g, k) {
                setTimeout(function () {
                    if (!g.scene) return;
                    g.on = true;
                    g.setTint(hex(c.color)).setAlpha(1);
                    fijarEscala(g, 1.15);
                    self.particulas.emitir(R().xEn(c, c.puntos[k]), c.puntos[k], { n: 1, vel: 50, tintes: [0xffffff], escala: 0.22, vida: 380 });
                }, reducido ? 0 : k * 40);
            });
            this.pintarBanda(i, true);
        }

        florecer(f, c) {
            var self = this;
            var k = c.escalaFlor;
            var var_ = c.variante || 0;
            var hFin = 158 + var_ * 14;
            var dur = reducido ? 200 : 1500 + var_ * 120;
            var giro = var_ === 0 ? Math.PI * 0.5 : 0;
            var colorFin = hex(c.color);
            var cambio = false;
            f.feliz = true;
            return this.anim.agregar(dur, function (u) {
                var a = saleSuave(Math.min(1, u * 1.25));
                var b = rebote(Math.min(1, Math.max(0, (u - 0.25) / 0.75)));
                f.h = lerp(f.hTriste, hFin, a);
                f.inclina = lerp(c.inclina, 0, a);
                f.escCabeza = lerp(0.55, 1, b);
                f.giroPetalos = giro * saleSuave(u) + (var_ === 1 ? Math.sin(u * Math.PI * 4) * 0.16 * (1 - u) : 0);
                f.estiraY = var_ === 2 ? 1 + Math.sin(u * Math.PI * 3) * 0.12 * (1 - u) : 1;
                f.petalos.setTint(mezclar(mezclar(colorFin, TRISTE, 0.55), colorFin, a));
                f.hojas = lerp(0.6, 1.08, b);
                if (!cambio && u > 0.42) {
                    cambio = true;
                    f.cara.setTexture("caraFeliz");
                    var p = f.cabezaMundo();
                    self.particulas.emitir(p.x, p.y, { n: 18, vel: 260, tintes: [colorFin, 0xffffff, 0xfff3bf], escala: 0.36, tipos: ["chispa", "estrellita"] });
                    self.onda(p.x, p.y, colorFin, 1.3);
                }
                self.ponerFlor(f);
            }).then(function () {
                var p = f.cabezaMundo();
                self.particulas.emitir(p.x, p.y, { n: 10, vel: 160, tintes: [colorFin, 0xffffff], escala: 0.3, tipos: ["petalo", "chispa"], grav: 120, vida: 900 });
            });
        }

        florEspera(i, on) {
            var v = this.carriles[i];
            if (!v || !v.flor) return;
            v.flor.espera = !!on;
            if (on) {
                var p = v.flor.cabezaMundo();
                this.onda(p.x, p.y, hex(this.jardin.carriles[i].color), 1);
            }
        }

        /** Coloca tallo, hojas y cabeza según el estado numérico de la flor. */
        ponerFlor(f) {
            var kT = f.k;
            f.tallo.setScale(kT * 0.95 / D().res("tallo"), (f.h / 240) / D().res("tallo"));
            f.tallo.setRotation(f.inclina * 0.25);
            var lean = f.inclina * 0.25;
            var topX = Math.sin(lean) * f.h, topY = -Math.cos(lean) * f.h;
            f.cabeza.setPosition(topX + Math.sin(f.inclina) * 10 * kT, topY + 4);
            var sway = f.mece || 0;
            f.cabeza.setRotation(f.inclina + sway);
            var e = f.escCabeza * f.k * (f.latido || 1);
            f.cabeza.setScale(e, e * (f.estiraY || 1));
            f.petalos.setRotation(f.giroPetalos || 0);
            var hI = f.hojas * kT;
            f.hojaI.setPosition(Math.sin(lean) * f.h * 0.38 - 2, -Math.cos(lean) * f.h * 0.38);
            f.hojaD.setPosition(Math.sin(lean) * f.h * 0.6 + 2, -Math.cos(lean) * f.h * 0.6);
            f.hojaI.setScale(hI * 0.62 / D().res("hoja")).setRotation(-0.25 + sway * 0.6 + lean);
            f.hojaD.setScale(hI * 0.55 / D().res("hoja")).setRotation(0.2 + sway * 0.6 + lean);
            f.cont.setRotation(f.brisa || 0);
        }

        crearFlor(c, x, suelo, prof, k) {
            var self = this;
            var tipo = c.tipoFlor;
            var info = D().FLORES[tipo] || D().FLORES.margarita;
            var cont = this.add.container(x, suelo).setDepth(prof || 35);
            var tallo = this.add.image(0, 0, "tallo").setOrigin(0.5, 1);
            var hojaI = this.add.image(0, 0, "hoja").setOrigin(1, 0.85).setFlipX(true);
            var hojaD = this.add.image(0, 0, "hoja").setOrigin(0, 0.85);
            var cabeza = this.add.container(0, 0);
            // la cabeza mide FLOR_ANCHO a escala 1: los pétalos del lienzo de 240 llegan a ~220
            var kP = (R().FLOR_ANCHO / 220) / D().res("petalos-" + tipo);
            var petalos = this.add.image(0, 0, "petalos-" + tipo).setScale(kP);
            cabeza.add(petalos);
            var centro = null;
            if (info.centro) {
                centro = this.add.image(0, 0, info.centro);
                centro.setScale((info.radioCentro * 2 / 108) * (R().FLOR_ANCHO / 220) / D().res(info.centro));
                cabeza.add(centro);
            }
            var cara = this.add.image(0, info.caraY * (R().FLOR_ANCHO / 220), "caraTriste");
            cara.setScale(0.62 * (R().FLOR_ANCHO / 220) * (tipo === "tulipan" ? 1.1 : 1) / D().res("caraTriste"));
            cabeza.add(cara);
            cont.add([hojaI, hojaD, tallo, cabeza]);
            var f = {
                cont: cont, tallo: tallo, hojaI: hojaI, hojaD: hojaD, cabeza: cabeza, petalos: petalos, centro: centro, cara: cara,
                k: k != null ? k : c.escalaFlor, hTriste: R().SUELO - 700, h: R().SUELO - 700, inclina: c.inclina, escCabeza: 0.55,
                giroPetalos: 0, hojas: 0.6, feliz: false, fase: Math.random() * 6, espera: false, latido: 1, mece: 0, brisa: 0,
                color: hex(c.color)
            };
            f.cabezaMundo = function () {
                var m = cabeza.getWorldTransformMatrix();
                return { x: m.tx, y: m.ty };
            };
            petalos.setTint(mezclar(f.color, TRISTE, 0.55));
            this.ponerFlor(f);
            return f;
        }

        // ------------------------------------------------------------------ cargar un nivel

        limpiarNivel() {
            this.carriles.forEach(function (v) {
                v.banda.destroy();
                v.gotitas.forEach(function (g) { g.destroy(); });
                v.flecha.destroy();
                v.nube.cont.destroy();
                v.flor.cont.destroy();
                if (v.brilloGuia) v.brilloGuia.destroy();
            });
            this.carriles = [];
            this.adornos.forEach(function (a) { a.destroy(); });
            this.adornos = [];
            this.mariposas.forEach(function (m) { m.cont.destroy(); });
            this.mariposas = [];
        }

        cargar(jardin, def) {
            var self = this;
            this.anim.limpiar();
            this.limpiarNivel();
            this.limpiarFinal();
            this.particulas.apagar();
            this.lluviaP.apagar();
            this.jardin = jardin;
            this.def = def || {};
            this.estados = jardin.carriles.map(function (c) { return R().nuevoEstado(c); });
            this.activo = -1;
            this.ptrId = null;
            this.estado = "oculta";
            this.completoAvisado = false;
            this.viento = 0;
            this.cameras.main.setZoom(1);
            this.gota.setVisible(false);
            this.limpiarAyuda();

            jardin.carriles.forEach(function (c, i) {
                var v = { i: i, luz: 0 };
                v.banda = self.add.graphics().setDepth(18);
                v.c = c;
                self.carriles.push(v);
                self.pintarBanda(i, false);
                v.gotitas = c.puntos.map(function (y) {
                    var g = img(self, R().xEn(c, y), y, "gotita", (c.radioPunto * 2 / 28)).setDepth(21).setTint(GRIS_GUIA).setAlpha(0);
                    g.setRotation(-Math.atan(R().pendiente(c, y)));
                    g.on = false;
                    return g;
                });
                v.brilloGuia = null;
                v.flecha = img(self, c.x, c.y0 + 40, "flecha", 0.58 * Math.min(1, c.escalaNube + 0.05)).setDepth(31).setAlpha(0);
                // nube
                var cont = self.add.container(c.x, c.nubeY).setDepth(30);
                var cuerpo = img(self, 0, 0, "nube", R().NUBE_ANCHO * c.escalaNube / 206).setOrigin(0.5, 0.6).setTint(hex(c.colorNube));
                var cara = img(self, 0, 10 * c.escalaNube, "caraNube", 0.8 * c.escalaNube);
                cont.add([cuerpo, cara]);
                cont.setAlpha(0);
                v.nube = { cont: cont, cuerpo: cuerpo, cara: cara, by: c.nubeY, dy: -320, fase: Math.random() * 6, parpadeo: 1500 + Math.random() * 3000, lluvia: 0, aprieta: 0, kx: 1 };
                // flor
                v.flor = self.crearFlor(c, c.x, R().SUELO, 35);
                v.flor.cont.setAlpha(0);
                v.flor.cont.setScale(1, 0.01);
            });

            jardin.adornos.forEach(function (a) {
                var o = img(self, a.x, a.y, a.tipo, a.escala * 0.9).setOrigin(0.5, 1).setDepth(38).setFlipX(!!a.espejo).setAlpha(0);
                o.fase = Math.random() * 6;
                o.tipo = a.tipo;
                o.x0 = a.x;
                self.adornos.push(o);
            });

            jardin.mariposas.forEach(function (m) { self.mariposas.push(self.crearMariposa(m.x, m.y, hex(m.color), m.fase, m.vel, 16)); });
            this.mariposas.forEach(function (m) { m.cont.setAlpha(0); });

            this.nubesDeco.forEach(function (n, k) { n.setVisible(k < (jardin.nubesDeco || 3)); });
            this.arco.setAlpha(0);
            this.arcoMeta = this.def.arcoiris ? 0.45 : 0;
            this.vida = 0;
            this.vidaVis = 0;
            this.calidoBase = [0.25, 0.35, 0.45, 0.6][Math.max(0, Math.min(3, (Number(this.def.id) || 1) - 1))];
            this.crearBrotes();
            this.pintarConsola();
            return true;
        }

        pintarBanda(i, hecho) {
            var v = this.carriles[i];
            var c = v.c;
            var g = v.banda;
            var ancho = Math.max(56, c.radioPunto * 4);
            g.clear();
            g.fillStyle(hecho ? hex(c.color) : 0xffffff, hecho ? 0.26 : 0.34);
            var pts = this.contornoBanda(c, ancho / 2);
            g.fillPoints(pts, true);
            g.lineStyle(3, hecho ? hex(c.color) : 0xffffff, hecho ? 0.5 : 0.55);
            g.strokePoints(pts, true);
            g.setAlpha(v.bandaAlpha != null ? v.bandaAlpha : 0);
        }

        /** Contorno de la banda del carril (recta o curva): bordes a ±r del eje y puntas redondas. */
        contornoBanda(c, r) {
            var izq = [], der = [];
            var ya = c.y0 - 16 + r, yb = c.y1 + 18 - r;
            for (var y = ya; y <= yb + 0.1; y += 8) {
                var yy = Math.min(y, yb);
                var m = R().pendiente(c, yy), n = Math.sqrt(1 + m * m);
                var x = R().xEn(c, yy);
                var nx = r / n, ny = -r * m / n;
                izq.push({ x: x - nx, y: yy - ny });
                der.push({ x: x + nx, y: yy + ny });
            }
            var pts = [];
            var arc = function (cx, cy, a0, a1) {
                for (var k = 0; k <= 8; k++) {
                    var a = a0 + (a1 - a0) * k / 8;
                    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
                }
            };
            var xa = R().xEn(c, ya), xb = R().xEn(c, yb);
            arc(xa, ya, Math.PI, Math.PI * 2);                 // punta de arriba
            der.forEach(function (p) { pts.push(p); });
            arc(xb, yb, 0, Math.PI);                           // punta de abajo
            for (var i = izq.length - 1; i >= 0; i--) pts.push(izq[i]);
            return pts.map(function (p) { return new Phaser.Math.Vector2(p.x, p.y); });
        }

        crearMariposa(x, y, color, fase, vel, prof) {
            var cont = this.add.container(x, y).setDepth(prof || 16);
            var ala = img(this, 0, 0, "alaMariposa", 0.55).setTint(color);
            var cuerpo = img(this, 0, 2, "cuerpoMariposa", 0.55);
            cont.add([ala, cuerpo]);
            return { cont: cont, ala: ala, x0: x, y0: y, fase: fase || 0, vel: vel || 1, px: x };
        }

        // ------------------------------------------------------------------ presentación del nivel

        presentar() {
            var self = this;
            var vs = this.carriles;
            this.estado = "oculta";
            var dur = reducido ? 150 : 1500;
            vs.forEach(function (v, i) { setTimeout(function () { avisar("aparece", { i: i }); }, reducido ? 0 : i * 160); });
            return this.anim.agregar(dur, function (u) {
                vs.forEach(function (v, i) {
                    var d = reducido ? 0 : i * 0.08;
                    var a = Math.max(0, Math.min(1, (u - d) / 0.55));
                    v.nube.dy = lerp(-320, 0, rebote(a));
                    v.nube.cont.setAlpha(Math.min(1, a * 2));
                    var b = Math.max(0, Math.min(1, (u - 0.2 - d) / 0.5));
                    v.flor.cont.setAlpha(Math.min(1, b * 2.5));
                    v.flor.cont.setScale(1, Math.max(0.01, rebote(b)));
                    var cg = Math.max(0, Math.min(1, (u - 0.45) / 0.45));
                    v.bandaAlpha = cg;
                    v.banda.setAlpha(cg);
                    v.gotitas.forEach(function (g, k) {
                        var ag = Math.max(0, Math.min(1, (u - 0.45 - k * 0.02) / 0.3));
                        g.setAlpha(ag * 0.85);
                    });
                });
                self.adornos.forEach(function (o, k) { o.setAlpha(Math.max(0, Math.min(1, (u - 0.3 - k * 0.04) / 0.3))); });
                self.mariposas.forEach(function (m) { m.cont.setAlpha(Math.max(0, Math.min(1, (u - 0.5) / 0.4))); });
                self.arco.setAlpha(self.arcoMeta * suave(u));
            }).then(function () {
                vs.forEach(function (v) {
                    v.nube.dy = 0;
                    v.flor.cont.setScale(1, 1);
                    v.flecha.setAlpha(1);
                });
                self.estado = "lista";
            });
        }

        /**
         * Demostración: la mano del tutorial (aviso) toca la primera nube y baja; la gotita la acompaña, las gotitas
         * se encienden, la flor se ilumina y luego todo vuelve a su lugar para que el niño lo haga.
         */
        demo(mano) {
            var self = this;
            var aviso = typeof mano === "function" ? mano : function () {};
            if (!this.jardin) return Promise.resolve();
            var i = 0;
            var c = this.jardin.carriles[i];
            var v = this.carriles[i];
            var est = this.estados[i];
            var prev = this.estado;
            this.estado = "demo";
            var dur = reducido ? 300 : Number(jcfg().demoMs) || 2200;
            aviso(c.x, c.nubeY, "viaja");
            return new Promise(function (r) { setTimeout(r, reducido ? 50 : 700); }).then(function () {
                aviso(c.x, c.nubeY, "presiona");
                self.apretarNube(i);
                avisar("demoToma", {});
                self.gota.setPosition(c.x, c.y0).setVisible(true).setAlpha(1).setScale(1);
                self.gotaCuerpo.setTint(hex(c.color));
                v.luz = 0;
                return new Promise(function (r) { setTimeout(r, reducido ? 50 : 350); });
            }).then(function () {
                return self.anim.agregar(dur, function (u) {
                    var s = c.largo * suave(u);
                    var x = R().xEn(c, c.y0 + s) + Math.sin(u * Math.PI * 3) * 6;
                    self.gota.setPosition(x, c.y0 + s);
                    aviso(x, c.y0 + s, "arrastra");
                    var y = c.y0 + s + 4;
                    while (v.luz < v.gotitas.length && c.puntos[v.luz] <= y) {
                        self.encenderGotita(i, v.luz);
                        avisar("demoPunto", { i: v.luz });
                        v.luz++;
                    }
                });
            }).then(function () {
                self.florEspera(i, true);
                v.flor.latido = 1.12;
                self.ponerFlor(v.flor);
                aviso(c.x, c.y1, "suelta");
                avisar("demoMeta", {});
                return new Promise(function (r) { setTimeout(r, reducido ? 80 : 700); });
            }).then(function () {
                v.flor.latido = 1;
                self.florEspera(i, false);
                var espera = self.apagarGotitas(i, true);
                var y0 = self.gota.y;
                return self.anim.agregar(reducido ? 80 : Math.max(450, espera), function (u) {
                    var yv = lerp(y0, c.nubeY + 20, suave(u));
                    self.gota.setPosition(R().xEn(c, yv), yv);
                    self.gota.setAlpha(1 - u);
                });
            }).then(function () {
                self.gota.setVisible(false);
                R().soltar(c, est, jcfg());
                est.s = 0; est.hecho = false; est.enMeta = false;
                self.estado = prev === "demo" ? "lista" : prev;
            });
        }

        // ------------------------------------------------------------------ ayudas y reacciones

        apretarNube(i) {
            var n = this.carriles[i] && this.carriles[i].nube;
            if (!n) return;
            this.anim.agregar(reducido ? 60 : 360, function (u) { n.kx = 1 + Math.sin(u * Math.PI) * 0.12; });
        }

        /** Llama la atención sobre una nube: rebota y brilla (por ejemplo, cuando se toca el carril y no la nube). */
        pulsoNube(i) {
            var v = this.carriles[i];
            if (!v) return;
            var c = this.jardin.carriles[i];
            var n = v.nube;
            this.onda(c.x, c.nubeY, 0xffffff, 1.2);
            this.anim.agregar(reducido ? 60 : 600, function (u) {
                n.dy = -Math.sin(u * Math.PI) * 22;
                v.flechaSalto = Math.sin(u * Math.PI) * 18;
            });
        }

        /** Un rato sin trazar: una gotita fantasma baja por el carril pendiente y su nube rebota. */
        ayuda() {
            if (!this.jardin) return;
            var i = this.ultimoIntento >= 0 && !this.estados[this.ultimoIntento].hecho ? this.ultimoIntento : this.estados.findIndex(function (e) { return !e.hecho; });
            if (i < 0) return;
            var c = this.jardin.carriles[i];
            var self = this;
            this.pulsoNube(i);
            avisar("ayuda", { i: i });
            this.fantasma.setTint(hex(c.color)).setVisible(true);
            this.fantasmaBrillo.setTint(hex(c.color)).setVisible(true);
            this.ayudaAnim = this.anim.agregar(reducido ? 200 : 1600, function (u) {
                var a = suave(u);
                var y = lerp(c.y0, c.y1, a);
                var xf = R().xEn(c, y);
                self.fantasma.setPosition(xf, y).setAlpha(0.65 * Math.sin(Math.min(1, u * 1.1) * Math.PI));
                self.fantasmaBrillo.setPosition(xf, y).setAlpha(0.5 * Math.sin(Math.min(1, u * 1.1) * Math.PI));
            }).then(function () { self.limpiarAyuda(); });
        }

        limpiarAyuda() {
            if (this.fantasma) this.fantasma.setVisible(false);
            if (this.fantasmaBrillo) this.fantasmaBrillo.setVisible(false);
        }

        onda(x, y, color, k) {
            var o = img(this, x, y, "brillo", 1.2 * (k || 1)).setDepth(59).setTint(color).setBlendMode(Phaser.BlendModes.ADD);
            var self = this;
            this.anim.agregar(reducido ? 100 : 520, function (u) {
                fijarEscala(o, lerp(0.6, 1.8, saleSuave(u)));
                o.setAlpha(0.8 * (1 - u));
            }).then(function () { o.destroy(); void self; });
        }

        // ------------------------------------------------------------------ fin de nivel: la brisa

        /** Nivel completo: brisa que mece las flores, mariposas que cruzan, destellos y un leve acercamiento. */
        completar() {
            var self = this;
            var cam = this.cameras.main;
            avisar("brisa", {});
            this.carriles.forEach(function (v) { v.flecha.setAlpha(0); });
            // mariposas que cruzan la pantalla
            var colores = [0xff8cc6, 0xffd43b, 0x74c0fc, 0xb197fc];
            var cruce = colores.map(function (col, k) {
                var m = self.crearMariposa(-80 - k * 90, 260 + k * 80, col, k, 1, 45);
                self.cruces.push(m);
                return m;
            });
            var dur = reducido ? 300 : 2300;
            return this.anim.agregar(dur, function (u) {
                self.viento = Math.sin(u * Math.PI);
                cam.setZoom(1 + 0.045 * Math.sin(u * Math.PI));
                cruce.forEach(function (m, k) {
                    var x = lerp(-80 - k * 90, W + 120, suave(Math.min(1, u * 1.1)));
                    m.cont.setPosition(x, m.y0 + Math.sin(u * 9 + k) * 30);
                    m.ala.scaleX = m.ala.base * (0.25 + Math.abs(Math.sin(self.t / 80 + k)) * 0.75);
                });
                self.carriles.forEach(function (v) {
                    v.nube.dy = -u * u * 380;
                    v.nube.cont.setAlpha(1 - suave(Math.max(0, (u - 0.3) / 0.7)));
                    v.banda.setAlpha(1 - u);
                    v.gotitas.forEach(function (g) { g.setAlpha(1 - u); });
                });
                if (Math.random() < 0.25) {
                    var c = self.jardin.carriles[Math.floor(Math.random() * self.jardin.carriles.length)];
                    self.particulas.emitir(c.x + (Math.random() - 0.5) * 120, 540 + Math.random() * 120, { n: 2, vel: 90, tintes: [hex(c.color), 0xffffff, 0xfff3bf], escala: 0.3, tipos: ["chispa", "estrellita", "petalo"], oscila: 60, vida: 900 });
                }
            }).then(function () {
                self.viento = 0;
                cam.setZoom(1);
                cruce.forEach(function (m) { m.cont.destroy(); });
                self.cruces = self.cruces.filter(function (m) { return cruce.indexOf(m) < 0; });
            });
        }

        /**
         * Despedida del jardín antes del nivel siguiente (sin destellos): las flores se esconden en la tierra con
         * un saltito, adornos y florecitas se desvanecen y las mariposas se van volando hacia arriba.
         */
        salida() {
            var self = this;
            var flores = this.carriles.map(function (v) { return v.flor; });
            var otros = this.adornos.concat(this.brotes.filter(function (b) { return b.salio; }));
            var desde = otros.map(function (o) { return o.alpha; });
            var mars = this.mariposas.map(function (m) { return { m: m, x0: m.x0, y0: m.y0, dir: Math.random() < 0.5 ? -1 : 1 }; });
            return this.anim.agregar(reducido ? 150 : 1100, function (u) {
                flores.forEach(function (f, i) {
                    var a = Math.max(0, Math.min(1, (u - i * 0.06) / 0.7));
                    var sube = a < 0.25 ? 1 + 0.12 * Math.sin(a / 0.25 * Math.PI) : 1 - suave((a - 0.25) / 0.75);
                    f.cont.setScale(1, Math.max(0.01, sube));
                    f.cont.setAlpha(1 - suave(Math.max(0, (a - 0.5) / 0.5)));
                });
                otros.forEach(function (o, k) { o.setAlpha(desde[k] * (1 - suave(u))); });
                mars.forEach(function (q) {
                    q.m.x0 = q.x0 + q.dir * 500 * u * u;
                    q.m.y0 = q.y0 - 600 * u * u;
                });
                self.arco.setAlpha(self.arco.alpha * (1 - u * 0.1));
            });
        }

        // ------------------------------------------------------------------ cinemática final

        limpiarFinal() {
            this.finales.forEach(function (f) { f.cont.destroy(); });
            this.finales = [];
            this.cruces.forEach(function (m) { m.cont.destroy(); });
            this.cruces = [];
            if (this.medallaObj) { this.medallaObj.forEach(function (o) { o.destroy(); }); this.medallaObj = null; }
            if (this.arcosChicos) { this.arcosChicos.forEach(function (o) { o.destroy(); }); this.arcosChicos = null; }
            this.fiestaOn = false;
            this.lluviaOn = false;
            this.brilloFinal.setAlpha(0);
        }

        /** Escena 1: el jardín completo con todas las flores de la partida, abiertas y felices. */
        escenaFinal(todas) {
            var self = this;
            this.estado = "final";
            this.entradaOn = false;
            var flores = (todas || []).slice(0, 16);
            var viejos = [];
            this.carriles.forEach(function (v) { viejos.push(v.flor.cont, v.nube.cont, v.banda, v.flecha); v.gotitas.forEach(function (g) { viejos.push(g); }); });
            this.mariposas.forEach(function (m) { viejos.push(m.cont); });
            var desde = viejos.map(function (o) { return o.alpha; });
            // dos filas que se intercalan: atrás (detrás del césped) y adelante
            var n = flores.length;
            var atras = Math.ceil(n / 2), adelante = n - atras;
            var pos = [];
            var x0 = 300, x1 = 1300;
            for (var a = 0; a < atras; a++) pos.push({ x: atras > 1 ? lerp(x0, x1, a / (atras - 1)) : 800, suelo: 790, prof: 34, k: 0.72 });
            for (var b = 0; b < adelante; b++) pos.push({ x: adelante > 1 ? lerp(x0 + 80, x1 - 80, b / (adelante - 1)) : 800, suelo: 846, prof: 37, k: 0.82 });
            this.finales = flores.map(function (c, i) {
                var p = pos[i];
                var f = self.crearFlor(c, p.x, p.suelo, p.prof, p.k);
                f.cont.setScale(1, 0.01);
                f.h = 140 + (i % 3) * 18;
                f.inclina = 0;
                f.escCabeza = 1;
                f.hojas = 1.05;
                f.feliz = true;
                f.cara.setTexture("caraFeliz");
                f.petalos.setTint(f.color);
                f.retraso = (i % atras) * 0.05 + (p.prof === 37 ? 0.12 : 0);
                self.ponerFlor(f);
                return f;
            });
            avisar("primavera", {});
            this.vida = 1;
            this.calidoBase = 0.7;
            this.solPulso = 1;
            this.solGiro = 0.006;
            this.brotes.forEach(function (b, k) { self.brotar(b, 300 + k * 60); });
            return this.anim.agregar(reducido ? 300 : 2800, function (u) {
                var a = suave(Math.min(1, u / 0.3));
                viejos.forEach(function (o, k) { o.setAlpha(desde[k] * (1 - a)); });
                self.finales.forEach(function (f, i) {
                    var b = Math.max(0, Math.min(1, (u - 0.2 - f.retraso) / 0.4));
                    f.cont.setScale(1, Math.max(0.01, rebote(b)));
                    if (b > 0 && !f.salio) {
                        f.salio = true;
                        var p = f.cabezaMundo();
                        self.particulas.emitir(p.x, p.y - f.h * 0.7, { n: 8, vel: 180, tintes: [f.color, 0xffffff], escala: 0.3, tipos: ["chispa", "estrellita"] });
                        if (i % 3 === 0) avisar("florFinal", { i: i });
                    }
                });
                self.brilloFinal.setAlpha(0.08 * suave(u));
                self.arco.setAlpha(Math.max(self.arco.alpha, 0.85 * suave(u)));
            }).then(function () {
                self.limpiarNivel();
                self.pintarConsola();
            });
        }

        /** Escena 2: celebración (mariposas que revolotean y brillos que no paran). */
        fiestaActiva(on) {
            var self = this;
            this.fiestaOn = !!on;
            if (on && !this.cruces.length) {
                [0xff8cc6, 0xffd43b, 0x74c0fc, 0xb197fc, 0xffa94d, 0x63e6be, 0xff8787].forEach(function (col, k) {
                    var m = self.crearMariposa(200 + k * 190, 300 + (k % 3) * 70, col, k * 0.9, 0.8 + (k % 3) * 0.2, 45);
                    m.libre = true;
                    self.cruces.push(m);
                });
            }
        }

        /** Escena 3: lluvia mágica de colores, arcoíris pequeños y flores que se mecen. */
        lluviaMagica() {
            var self = this;
            this.lluviaOn = true;
            avisar("lluvia", {});
            this.arcosChicos = [[430, 640], [1170, 650]].map(function (p) {
                return img(self, p[0], p[1], "arcoiris", 0.24).setOrigin(0.5, 1).setDepth(33).setAlpha(0);
            });
            return this.anim.agregar(reducido ? 300 : 3200, function (u) {
                self.viento = 0.55 * Math.sin(u * Math.PI);
                self.arcosChicos.forEach(function (a, k) {
                    var b = Math.max(0, Math.min(1, (u - 0.2 - k * 0.15) / 0.3));
                    a.setAlpha(0.9 * b * (u > 0.85 ? (1 - u) / 0.15 : 1));
                    fijarEscala(a, lerp(0.15, 0.28, saleSuave(b)));
                });
            }).then(function () {
                self.lluviaOn = false;
                self.viento = 0;
            });
        }

        /** Escena 5: la medalla con estrellas que giran. */
        medalla() {
            var self = this;
            avisar("medalla", {});
            var halo = img(this, W / 2, 400, "brillo", 4.4).setDepth(78).setTint(0xfff3bf).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
            var med = img(this, W / 2, -200, "medalla", 0.78).setDepth(80);
            var estrellas = [];
            for (var i = 0; i < 8; i++) estrellas.push(img(this, W / 2, 400, "estrellita", 0.7).setDepth(81).setTint(ARCOIRIS[i % ARCOIRIS.length]).setAlpha(0));
            this.medallaObj = [halo, med].concat(estrellas);
            return this.anim.agregar(reducido ? 300 : 1500, function (u) {
                med.y = lerp(-200, 400, rebote(Math.min(1, u * 1.3)));
                med.setRotation(Math.sin(u * Math.PI * 2) * 0.08 * (1 - u));
                halo.setAlpha(0.7 * suave(u));
                estrellas.forEach(function (s, k) { s.setAlpha(suave(Math.max(0, (u - 0.5) / 0.5))); });
            }).then(function () {
                self.particulas.emitir(W / 2, 400, { n: 30, vel: 380, tintes: ARCOIRIS, escala: 0.4, tipos: ["estrellita", "chispa"] });
                self.medallaGira = true;
            });
        }

        terminarFiesta() {
            this.fiestaOn = false;
            this.lluviaOn = false;
            this.medallaGira = false;
        }

        // ------------------------------------------------------------------ progreso (abajo al centro)

        pintarConsola() {
            var self = this;
            this.consola.forEach(function (o) { o.destroy(); });
            this.consola = [];
            if (!this.jardin) return;
            var info = this.nivelesInfo;
            var n = this.estados.length;
            var final = this.estado === "final";
            var sepN = 46, sepF = 54;
            var anchoN = info.total * sepN, anchoF = final ? 0 : n * sepF;
            var ancho = anchoN + anchoF + (final ? 40 : 70);
            var x0 = W / 2 - ancho / 2;
            var fondo = this.add.graphics().setDepth(70);
            fondo.fillStyle(0xffffff, 0.86);
            fondo.fillRoundedRect(x0, CONSOLA_Y - 30, ancho, 60, 30);
            fondo.lineStyle(4, 0x74c0fc, 0.9);
            fondo.strokeRoundedRect(x0, CONSOLA_Y - 30, ancho, 60, 30);
            this.consola.push(fondo);
            // niveles: una gota por nivel (hecha = color, actual = grande, pendiente = gris)
            for (var i = 0; i < info.total; i++) {
                var x = x0 + 30 + i * sepN + sepN / 2 - 10;
                var hecho = i < info.hechos;
                var actual = i === info.actual;
                var g = img(this, x, CONSOLA_Y, "gotita", actual ? 1.05 : 0.85).setDepth(71);
                g.setTint(hecho ? hex(info.colores[i] || "#74c0fc") : (actual ? 0x74c0fc : 0xced4da));
                if (actual) g.latir = true;
                this.consola.push(g);
                if (hecho) this.consola.push(img(this, x, CONSOLA_Y - 2, "estrellita", 0.38).setDepth(72).setTint(0xffffff));
            }
            if (!final) {
                var sx = x0 + 30 + anchoN + 14;
                var linea = this.add.graphics().setDepth(71);
                linea.fillStyle(0xa5d8ff, 1);
                linea.fillRoundedRect(sx - 4, CONSOLA_Y - 18, 5, 36, 3);
                this.consola.push(linea);
                // flores del nivel: grises y cerradas las que faltan, de su color las regadas
                this.estados.forEach(function (e, k) {
                    var c = self.jardin.carriles[k];
                    var fx = sx + 18 + k * sepF + sepF / 2 - 4;
                    var p = img(self, fx, CONSOLA_Y, "petalos-" + c.tipoFlor, e.hecho ? 0.24 : 0.17).setDepth(71);
                    p.setTint(e.hecho ? hex(c.color) : 0xced4da);
                    self.consola.push(p);
                    var info2 = D().FLORES[c.tipoFlor];
                    if (info2 && info2.centro) self.consola.push(img(self, fx, CONSOLA_Y, info2.centro, e.hecho ? 0.17 : 0.12).setDepth(72).setAlpha(e.hecho ? 1 : 0.6));
                });
            }
            this.consolaVisible(!this.consolaOculta);
        }

        consolaVisible(vis) {
            var on = vis && this.mostrarConsola;
            this.consola.forEach(function (o) { o.setVisible(on); });
        }

        // ------------------------------------------------------------------ cuadro a cuadro

        update(time, delta) {
            var dt = Math.min(delta || 16, 50);
            this.t += dt;
            var t = this.t;
            var self = this;
            this.anim.update(dt);
            this.particulas.update(dt);
            this.lluviaP.update(dt);

            // nubecitas que pasan
            this.nubesDeco.forEach(function (n) {
                n.x += n.vel * dt / 1000;
                if (n.x > W + 160) n.x = -160;
            });
            this.pintarVida(dt, t);

            // carriles: nubes que flotan, parpadean y llueven; flechas que invitan a bajar; flores que se mecen
            var trazando = this.estado === "trazando";
            this.carriles.forEach(function (v, i) {
                var c = v.c;
                var est = self.estados[i];
                var n = v.nube;
                n.parpadeo -= dt;
                if (n.parpadeo <= 0) {
                    n.cara.setTexture(n.cara.texture.key === "caraNube" ? "caraNubeCerrada" : "caraNube");
                    n.parpadeo = n.cara.texture.key === "caraNube" ? 2200 + Math.random() * 3000 : 140;
                }
                var bob = reducido ? 0 : Math.sin(t / 900 + n.fase) * 5;
                n.cont.setPosition(c.x, n.by + n.dy + bob);
                n.cont.setScale(n.kx, 2 - n.kx);
                var usada = trazando && self.activo === i;
                if (usada !== !!n.usada) {
                    n.usada = usada;
                    n.cuerpo.setTint(usada ? mezclar(hex(c.colorNube), 0x7f93c4, 0.32) : hex(c.colorNube));
                }
                if (usada && Math.random() < 0.35) {
                    self.lluviaP.emitir(c.x + (Math.random() - 0.5) * 110 * c.escalaNube, n.cont.y + 38, { n: 1, vel: 30, angulo: Math.PI / 2, apertura: 0.1, grav: 800, tintes: [hex(c.color), 0xd0ebff], escala: 0.38, tipos: ["gotaLluvia"], normal: true, sinGiro: true, vida: 380, encoge: 0, alpha: 0.7 });
                }
                if (n.lluvia > 0) {
                    n.lluvia -= dt;
                    if (Math.random() < 0.7) {
                        self.lluviaP.emitir(c.x + (Math.random() - 0.5) * 120 * c.escalaNube, n.cont.y + 40, { n: 1, vel: 40, angulo: Math.PI / 2, apertura: 0.1, grav: 900, tintes: [hex(c.color), 0xd0ebff], escala: 0.5, tipos: ["gotaLluvia"], normal: true, sinGiro: true, vida: 520, encoge: 0, alpha: 0.85 });
                    }
                }
                // flecha
                var verFlecha = !est.hecho && (self.estado === "lista" || (trazando && self.activo === i) || self.estado === "demo");
                if (self.estado === "lista" || self.estado === "trazando" || self.estado === "volviendo" || self.estado === "riego" || self.estado === "demo") {
                    var objetivo = verFlecha ? (trazando ? 0.35 : 1) : 0;
                    v.flecha.alpha += (objetivo - v.flecha.alpha) * Math.min(1, dt / 120);
                }
                var salto = reducido ? 0 : (Math.sin(t / 260 + i) * 0.5 + 0.5) * 22;
                var yFl = c.y0 + 30 + salto + (v.flechaSalto || 0);
                v.flecha.setPosition(R().xEn(c, yFl), yFl);
                v.flecha.setRotation(-Math.atan(R().pendiente(c, yFl)));
                fijarEscala(v.flecha, 1 + Math.sin(t / 260 + i) * 0.05);
                // flor
                var f = v.flor;
                var amp = f.feliz ? 0.06 : 0.025;
                f.mece = reducido ? 0 : Math.sin(t / 750 + f.fase) * amp + self.viento * Math.sin(t / 180 + f.fase) * 0.18;
                f.brisa = self.viento * Math.sin(t / 220 + f.fase) * 0.06;
                if (f.espera) f.latido = 1 + Math.sin(t / 120) * 0.05;
                else if (f.latido !== 1 && self.estado !== "demo") f.latido = 1;
                self.ponerFlor(f);
            });

            // gotita que acompaña al dedo: baja con el progreso y se inclina hacia el dedo sin salir del carril
            if (trazando && this.activo >= 0) {
                var c = this.jardin.carriles[this.activo];
                var est = this.estados[this.activo];
                var ty = c.y0 + est.s;
                var eje = R().xEn(c, ty);
                var lado = this.ptr ? Math.max(-c.tol * 0.4, Math.min(c.tol * 0.4, this.ptr.x - R().xEn(c, this.ptr.y))) * 0.5 : 0;
                var tx = eje + lado;
                this.gx += (tx - this.gx) * Math.min(1, dt / 50);
                this.gy += (ty - this.gy) * Math.min(1, dt / 40);
                var temblor = est.fuera ? Math.sin(t / 50) * 4 : 0;
                this.gota.setPosition(this.gx + temblor, this.gy);
                this.gota.setRotation((est.fuera ? Math.sin(t / 90) * 0.2 : 0) - Math.atan(R().pendiente(c, ty)) * 0.6);
                if (est.enMeta && this.ptrId !== null) {
                    this.metaT += dt;
                    if (this.metaT >= (Number(jcfg().metaEsperaMs) || 900)) this.liberar(true);
                } else {
                    this.metaT = 0;
                }
            }

            // adornos que se mueven un poquito
            this.adornos.forEach(function (o) {
                if (o.tipo === "mariquita" || o.tipo === "caracol") o.x = o.x0 + Math.sin(t / (o.tipo === "caracol" ? 2600 : 1400) + o.fase) * 18;
                else if (o.tipo === "hierba" || o.tipo === "florecitas" || o.tipo === "arbusto") o.rotation = Math.sin(t / 900 + o.fase) * 0.03 + self.viento * Math.sin(t / 200) * 0.06;
            });

            // mariposas del nivel (detrás de los carriles) y de la fiesta
            var volar = function (m, ancho, alto) {
                var x = m.x0 + Math.sin(t * 0.00042 * m.vel + m.fase) * ancho;
                var y = m.y0 + Math.sin(t * 0.0011 * m.vel + m.fase * 2) * alto;
                m.cont.setPosition(x, y);
                m.ala.scaleX = m.ala.base * (0.25 + Math.abs(Math.sin(t / 85 + m.fase)) * 0.75);
                m.cont.setScale(x < m.px ? -1 : 1, 1);
                m.px = x;
            };
            this.mariposas.forEach(function (m) { volar(m, 170, 45); });
            this.cruces.forEach(function (m) { if (m.libre) volar(m, 220, 90); });

            // progreso: la gota del nivel actual late
            this.consola.forEach(function (o) {
                if (o.latir) fijarEscala(o, 1 + Math.sin(t / 260) * 0.08);
            });

            // cinemática final: flores que se mecen, brillos y lluvia de colores
            if (this.finales.length) {
                this.finales.forEach(function (f) {
                    f.mece = Math.sin(t / 700 + f.fase) * 0.07 + self.viento * Math.sin(t / 180 + f.fase) * 0.2;
                    f.brisa = self.viento * Math.sin(t / 240 + f.fase) * 0.05;
                    self.ponerFlor(f);
                });
            }
            if (this.fiestaOn) {
                this.tFiesta += dt;
                if (this.tFiesta > 180) {
                    this.tFiesta = 0;
                    this.particulas.emitir(200 + Math.random() * 1200, 200 + Math.random() * 450, { n: 2, vel: 80, tintes: ARCOIRIS, escala: 0.32, tipos: ["chispa", "estrellita"], vida: 900, oscila: 40 });
                }
            }
            if (this.lluviaOn) {
                this.tLluvia += dt;
                while (this.tLluvia > 18) {
                    this.tLluvia -= 18;
                    this.lluviaP.emitir(Math.random() * W, -20, { n: 1, vel: 60, angulo: Math.PI / 2, apertura: 0.05, grav: 700, tintes: ARCOIRIS, escala: 0.9, tipos: ["gotaLluvia"], normal: true, sinGiro: true, vida: 1500, encoge: 0, alpha: 0.95 });
                }
            }
            if (this.medallaGira && this.medallaObj) {
                var est2 = this.medallaObj.slice(2);
                est2.forEach(function (s, k) {
                    var a = t / 900 + k * Math.PI * 2 / est2.length;
                    s.setPosition(W / 2 + Math.cos(a) * 210, 400 + Math.sin(a) * 150);
                    s.setRotation(t / 400);
                });
                this.medallaObj[0].rotation = t / 2000;
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
            backgroundColor: "#a8dcff",
            banner: false,
            scale: { mode: Phaser.Scale.ENVELOP, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
            input: { activePointers: 3 },
            render: { antialias: true },
            scene: [EscenaLluvia]
        });
        global.__escenarioLluvia = juego;
        global.__pedniaPhaserGame = juego;
    }

    // ------------------------------------------------------------------ API pública

    global.EscenarioLluvia = {
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
        cargar: function (jardin, def) { return escena ? escena.cargar(jardin, def) : null; },
        presentar: function () { return escena ? escena.presentar() : Promise.resolve(); },
        demo: function (mano) { return escena ? escena.demo(mano) : Promise.resolve(); },
        /** Habilita o bloquea la entrada. Al bloquear, un trazo a medias se suelta sin castigo (vuelve a la nube). */
        entrada: function (on) {
            if (!escena) return;
            escena.entradaOn = !!on;
            if (!on && escena.ptrId !== null) {
                escena.ptrId = null;
                escena.ptr = null;
                var i = escena.activo;
                if (i >= 0 && escena.estados[i] && !escena.estados[i].hecho) {
                    var est = escena.estados[i];
                    est.activo = false; est.s = 0; est.fuera = false; est.enMeta = false;
                    escena.apagarGotitas(i, false);
                    escena.florEspera(i, false);
                    escena.gota.setVisible(false);
                    escena.activo = -1;
                }
                if (escena.estado === "trazando") escena.estado = "lista";
            }
        },
        completar: function () { return escena ? escena.completar() : Promise.resolve(); },
        salida: function () { return escena ? escena.salida() : Promise.resolve(); },
        escenaFinal: function (todas) { return escena ? escena.escenaFinal(todas) : Promise.resolve(); },
        fiesta: function (on) { if (escena) escena.fiestaActiva(on); },
        lluviaMagica: function () { return escena ? escena.lluviaMagica() : Promise.resolve(); },
        medalla: function () { return escena ? escena.medalla() : Promise.resolve(); },
        terminarFiesta: function () { if (escena) escena.terminarFiesta(); },
        ayuda: function () { if (escena && escena.jardin && escena.estado === "lista") escena.ayuda(); },
        limpiarAyuda: function () { if (escena) escena.limpiarAyuda(); },
        pulsoNube: function (i) {
            if (!escena || !escena.jardin) return;
            var k = i != null ? i : escena.estados.findIndex(function (e) { return !e.hecho; });
            if (k >= 0) escena.pulsoNube(k);
        },
        niveles: function (total, actual, hechos, colores) {
            if (!escena) return;
            escena.nivelesInfo = { total: total, actual: actual, hechos: hechos, colores: colores || escena.nivelesInfo.colores };
            escena.pintarConsola();
        },
        mostrarProgreso: function (on) {
            if (!escena) return;
            escena.mostrarConsola = !!on;
            escena.consolaVisible(!escena.consolaOculta);
        },
        aPantalla: aPantalla,
        aMundo: aMundo,
        jardin: function () { return escena ? escena.jardin : null; },
        /** Pruebas: el mismo camino que el dedo (bajar, mover, subir en coordenadas del mundo). */
        probar: {
            bajar: function (x, y) { if (escena) escena.bajar("prueba", { x: x, y: y }); },
            mover: function (x, y) { if (escena && escena.ptrId === "prueba") { escena.ptr = { x: x, y: y }; escena.procesarDedo(); } },
            subir: function () { if (escena && escena.ptrId === "prueba") escena.liberar(); },
            paso: function (ms) { if (escena) escena.update(0, ms || 16); }
        },
        estado: function () {
            if (!escena || !escena.jardin) return null;
            return {
                estado: escena.estado,
                activo: escena.activo,
                entrada: escena.entradaOn,
                flores: escena.estados.length,
                hechas: escena.estados.filter(function (e) { return e.hecho; }).length,
                estados: escena.estados.map(function (e) { return { s: Math.round(e.s), hecho: e.hecho, fuera: e.fuera, enMeta: e.enMeta, activo: e.activo }; }),
                carriles: escena.jardin.carriles.map(function (c) { return { x: c.x, y0: c.y0, y1: c.y1, nubeY: c.nubeY, largo: c.largo, tol: c.tol, flor: c.tipoFlor, color: c.color, curva: c.curva }; }),
                respaldo: !!escena.jardin.respaldo
            };
        }
    };
})(typeof window !== "undefined" ? window : global);
