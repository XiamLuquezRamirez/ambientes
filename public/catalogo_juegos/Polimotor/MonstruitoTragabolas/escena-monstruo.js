/**
 * EscenarioMonstruo — escena Phaser 4 de "Alimenta al Monstruito Tragabolas" (window.EscenarioMonstruo).
 *
 * Dibuja el Jardín de los Colores por capas (cielo, sol, nubes, arcoíris, estrellas, colinas, arbustos, flores,
 * mariposas, hojas, burbujas, formas, banderines y globos según el nivel), el cojín con el monstruito
 * (monstruo.js), la bandeja acolchada con las bolas blandas, la guía punteada y el progreso.
 *
 * Entrada: el dedo toca una bola, la bola lo sigue con correa corta y, al deslizar hacia arriba, sale disparada.
 * ReglasMonstruo decide si el gesto es un lanzamiento y si entra en la boca; la escena anima el vuelo (curva con
 * impulso, giro, estela), el ¡ñam! o el rebote cómico y el regreso a la bandeja, y avisa a script.js con eventos
 * (toma, suelta, lanza, acierto, fallo, rebote, regresa, listo, nivelCompleto, guiaOculta, aparece…).
 *
 * Mundo de diseño 1600 × 900 con Scale.ENVELOP; lo jugable cabe en 4:3 (x 230…1370). Cada animación que el flujo
 * espera es una Promise con respaldo por tiempo (Animador), que también respeta la pausa.
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser;
    var W = 1600, H = 900;

    var D = function () { return global.DibujosMonstruo; };
    var R = function () { return global.ReglasMonstruo; };

    var juego = null, escena = null, el = null, cfg = null, espera = null;
    var cb = {};
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);

    function avisar(nombre, a) {
        var f = cb[nombre];
        if (typeof f === "function") {
            try { f(a); } catch (e) { console.warn("[EscenarioMonstruo]", nombre, e); }
        }
    }

    function lerp(a, b, u) { return a + (b - a) * u; }
    function saleSuave(u) { return 1 - Math.pow(1 - u, 3); }
    function elastico(u) { return u === 0 || u === 1 ? u : Math.pow(2, -10 * u) * Math.sin((u * 10 - 0.75) * (2 * Math.PI / 3)) + 1; }
    function mezclar(a, b, u) {
        var ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
        var br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
        return (Math.round(lerp(ar, br, u)) << 16) | (Math.round(lerp(ag, bg, u)) << 8) | Math.round(lerp(ab, bb, u));
    }
    function hex(c) { return typeof c === "number" ? c : parseInt(String(c || "#ffffff").replace("#", ""), 16); }
    function jcfg() { return (cfg && cfg.juego) || {}; }
    function azarEn(a, b) { return a + Math.random() * (b - a); }
    function elegir(l) { return l[Math.floor(Math.random() * l.length)]; }

    var COLORES_FIESTA = [0xffd43b, 0x4dabf7, 0x69db7c, 0xb197fc, 0xffa94d, 0xf783ac, 0x63e6be];

    // Identidad de cada nivel: colores y qué hay en el jardín.
    var TEMAS = {
        manana: { cojin: 0xffc9de, bandeja: 0xffd8a8, colinas: 0xffffff, sol: 1, solTinte: 0xffffff, arco: 0, mariposas: 2, flores: 9, hojas: 4, burbujas: 0, formas: 4, estrellas: 8, guirnaldas: 0, banderines: false, globos: 0, tintesFlor: [0xff8fab, 0xffe066, 0xffffff, 0xffc078] },
        mariposas: { cojin: 0xb5f2f7, bandeja: 0xc3f5cd, colinas: 0xffffff, sol: 1, solTinte: 0xffffff, arco: 0.8, mariposas: 5, flores: 11, hojas: 3, burbujas: 0, formas: 5, estrellas: 8, guirnaldas: 0, banderines: false, globos: 0, tintesFlor: [0xb197fc, 0xff8fab, 0x74c0fc, 0xffe066, 0xff8787] },
        burbujas: { cojin: 0xd9ccff, bandeja: 0xffd1e3, colinas: 0xf1e6ff, sol: 0.75, solTinte: 0xffc9a0, arco: 0, mariposas: 2, flores: 9, hojas: 2, burbujas: 0, formas: 8, estrellas: 18, guirnaldas: 7, banderines: false, globos: 0, tintesFlor: [0xffffff, 0xf783ac, 0xb197fc, 0x99e9f2] },
        festin: { cojin: 0xffe066, bandeja: 0xfff0b3, colinas: 0xffffff, sol: 1, solTinte: 0xffffff, arco: 0.55, mariposas: 3, flores: 11, hojas: 3, burbujas: 0, formas: 9, estrellas: 10, guirnaldas: 0, banderines: true, globos: 4, tintesFlor: [0xff8787, 0xffe066, 0x74c0fc, 0xb197fc, 0x8ce99a] }
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
            a.timer = setTimeout(respaldo, dur + 500);
            self.lista.push(a);
        });
    };

    Animador.prototype.fin = function (a) {
        if (a.hecho) return;
        a.hecho = true;
        clearTimeout(a.timer);
        try { a.fn(1); } catch (e) { console.warn("[EscenarioMonstruo] anim", e); }
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
            if (u >= 1) { p.vivo = false; p.img.setVisible(false); continue; }
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

    /** Imagen a su tamaño de diseño (compensa la resolución del SVG rasterizado). */
    function img(scene, x, y, key, k) {
        var i = scene.add.image(x, y, key);
        i.base = (k || 1) / D().res(key);
        i.setScale(i.base);
        return i;
    }

    // ------------------------------------------------------------------ escena

    var EscenaJardin = Phaser ? class extends Phaser.Scene {
        constructor() { super({ key: "Jardin" }); }

        create() {
            var self = this;
            D().claves().forEach(function (k) { tex(self, k); });
            this.anim = new Animador();
            this.t = 0;
            this.pausado = false;
            this.nivel = null;
            this.ronda = null;
            this.marcador = null;
            this.bolas = [];
            this.deco = [];
            this.estado = "oculta";     // oculta · lista · tomada · vuelo · vuelta · come · completo
            this.entradaOn = false;
            this.ptrId = null;
            this.sel = null;
            this.muestras = [];
            this.tEstela = 0;
            this.impulsoFlores = 0;
            this.brilloEstrellas = 0;
            this.pulsoBandeja = 0;
            this.fiestaOn = false;
            this.tConfeti = 0;
            this.mostrarProg = true;
            this.progPop = [];
            this.guiaOn = false;
            this.guiaT = 0;
            this.guiaPts = [];
            this.tema = null;

            // capas fijas
            this.cielo = img(this, W / 2, H / 2, "cielo-manana", 2).setDepth(0);
            this.cieloNuevo = img(this, W / 2, H / 2, "cielo-manana", 2).setDepth(0.1).setAlpha(0);
            this.rayos = img(this, 1300, 120, "rayos", 0.9).setDepth(0.6).setAlpha(0.7);
            this.sol = img(this, 1300, 120, "sol", 0.8).setDepth(0.7);
            this.arco = img(this, W / 2, 610, "arcoiris", 1.45).setOrigin(0.5, 1).setDepth(1.2).setAlpha(0);
            this.nubes = [];
            for (var i = 0; i < 5; i++) {
                var n = img(this, 120 + i * 360, 70 + (i % 2) * 90, "nube", 0.55 + (i % 3) * 0.15).setDepth(1).setAlpha(0.92);
                n.vel = 7 + i * 2.5;
                this.nubes.push(n);
            }
            this.colinasL = img(this, W / 2, 660, "colinasLejos").setOrigin(0.5, 1).setDepth(3);
            this.colinasC = img(this, W / 2, 790, "colinasCerca").setOrigin(0.5, 1).setDepth(4);
            this.cesped = img(this, W / 2, 694, "cesped").setOrigin(0.5, 0).setDepth(36);
            this.cojin = img(this, W / 2, 540, "cojin", 1).setDepth(8);
            this.cojinSombra = img(this, W / 2, 580, "sombra", 2.6).setDepth(7.9).setAlpha(0.6);
            this.brillo = this.add.rectangle(W / 2, H / 2, W, H, 0xfff3bf).setDepth(65).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);

            this.monstruo = global.MonstruoTragabolas.crear(this, { x: 800, y: 346, escala: 1, anim: this.anim, depth: 20 });
            this.monstruo.cont.setVisible(false);

            this.bandeja = img(this, W / 2, 790, "bandeja-1").setDepth(40).setVisible(false);
            this.bandejaSombra = img(this, W / 2, 858, "sombra", 4.5).setDepth(39).setAlpha(0.5).setVisible(false);

            // guía punteada y flecha
            this.puntos = [];
            for (var k = 0; k < 14; k++) this.puntos.push(img(this, 0, 0, "puntoGuia", 1).setDepth(50).setAlpha(0).setVisible(false));
            this.flecha = img(this, 0, 0, "flecha", 0.9).setDepth(51).setVisible(false);

            this.gProg = this.add.graphics().setDepth(46);
            this.particulas = new Particulas(this, 140, 60);
            this.particulasAtras = new Particulas(this, 40, 9);

            this.crearEntrada();
            this.cameras.main.setBackgroundColor("#bde8ff");
            escena = this;
            if (espera) { var e = espera; espera = null; e(true); }
        }

        // ------------------------------------------------------------------ entrada (un solo puntero)

        crearEntrada() {
            var self = this;
            var mundo = function (p) {
                self.scale.updateBounds();
                return { x: p.worldX, y: p.worldY, t: performance.now() };
            };
            this.input.on("pointerdown", function (p) { self.bajar(p.id, mundo(p)); });
            this.input.on("pointermove", function (p) {
                if (self.ptrId === null || p.id !== self.ptrId) return;
                self.mover(mundo(p));
            });
            var arriba = function (p) {
                if (self.ptrId === null || (p && p.id !== self.ptrId)) return;
                self.soltar(p ? mundo(p) : null);
            };
            this.input.on("pointerup", arriba);
            this.input.on("pointerupoutside", arriba);
            var perder = function () { if (self.ptrId !== null) self.soltar(null, true); };
            var lienzo = this.game.canvas;
            if (lienzo) {
                lienzo.addEventListener("pointercancel", perder);
                lienzo.addEventListener("touchcancel", perder);
                lienzo.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });
            }
        }

        bolaEn(x, y) {
            var mejor = null, dm = Infinity;
            this.bolas.forEach(function (b) {
                if (b.estado !== "lista") return;
                var d = Math.hypot(b.cont.x - x, b.cont.y - y);
                if (d <= b.r + 28 && d < dm) { dm = d; mejor = b; }
            });
            return mejor;
        }

        bajar(id, p) {
            if (!this.entradaOn || this.pausado || this.estado !== "lista" || this.ptrId !== null) return;
            var b = this.bolaEn(p.x, p.y);
            if (!b) { avisar("tocaFuera", { x: p.x, y: p.y }); return; }
            this.ptrId = id;
            this.sel = b;
            this.muestras = [p];
            this.estado = "tomada";
            this.movio = false;
            b.estado = "tomada";
            b.cont.setDepth(55);
            b.k = 1.16;
            this.pulsoBandeja = 1;
            this.particulas.emitir(b.cont.x, b.cont.y, { n: 8, tipos: ["chispa"], vel: 160, vida: 420, escala: 0.4, tintes: [0xffffff, b.color] });
            this.monstruo.hambre(true);
            this.monstruo.mirar({ x: b.cont.x, y: b.cont.y });
            avisar("toma", { id: b.id });
        }

        mover(p) {
            var b = this.sel;
            if (!b || this.estado !== "tomada") return;
            this.muestras.push(p);
            if (this.muestras.length > 60) this.muestras.splice(1, this.muestras.length - 60);
            var a = this.muestras[0];
            var dx = p.x - a.x, dy = p.y - a.y;
            var d = Math.hypot(dx, dy);
            if (!this.movio && d > (Number(jcfg().toqueMax) || 14)) {
                this.movio = true;
                if (this.guiaOn) { this.guia(false); avisar("guiaOculta"); }
            }
            // la bola sigue al dedo con una correa corta (no se puede llevar hasta la boca)
            var correa = Number(jcfg().correa) || 78;
            var k = d > correa ? correa / d : 1;
            b.cont.x = b.home.x + dx * k;
            b.cont.y = b.home.y + dy * k;
            this.monstruo.mirar({ x: b.cont.x, y: b.cont.y });
            // estela mientras desliza
            if (this.movio && this.t - this.tEstela > 45) {
                this.tEstela = this.t;
                this.particulas.emitir(b.cont.x, b.cont.y + b.r * 0.4, { n: 2, tipos: ["chispa"], vel: 40, vida: 380, escala: 0.32, tintes: [b.color, 0xffffff], dispersion: 26 });
                avisar("mueve", { d: d });
            }
            // un deslizamiento largo hacia arriba lanza sin esperar a que se levante el dedo
            if (-dy >= (Number(jcfg().autoSubida) || 150)) this.soltar(p);
        }

        soltar(p, cancelado) {
            var b = this.sel;
            this.ptrId = null;
            if (!b || this.estado !== "tomada") { this.sel = null; return; }
            if (p) this.muestras.push(p);
            var res = cancelado ? { lanza: false, motivo: "toque" } :
                R().analizarGesto(this.muestras, b.home, this.nivel.boca, this.nivel, jcfg());
            this.sel = null;
            if (res.lanza) {
                this.lanzar(b, res);
            } else {
                this.devolver(b);
                this.estado = "lista";
                this.monstruo.hambre(false);
                this.monstruo.mirar(null);
                avisar("suelta", { id: b.id, motivo: res.motivo });
            }
        }

        /** La bola vuelve a su hueco con un rebote elástico (sin lanzarse). */
        devolver(b) {
            var x0 = b.cont.x, y0 = b.cont.y;
            b.estado = "volviendo";
            return this.anim.agregar(reducido ? 60 : 420, function (u) {
                var e = elastico(u);
                b.cont.x = lerp(x0, b.home.x, e);
                b.cont.y = lerp(y0, b.home.y, e);
                b.k = lerp(1.16, 1, u);
                if (u >= 1) { b.estado = "lista"; b.cont.setDepth(44); b.k = 1; }
            });
        }

        // ------------------------------------------------------------------ vuelo

        /** opciones.demo: la demostración (no cuenta y la bola reaparece). */
        lanzar(b, res, opciones) {
            var self = this;
            var demo = !!(opciones && opciones.demo);
            this.estado = "vuelo";
            b.estado = "vuelo";
            b.cont.setDepth(56);
            if (this.guiaOn) this.guia(false);
            var o = { x: b.cont.x, y: b.cont.y };
            var d = res.destino;
            var c = R().controlVuelo(o, d, res.acierto ? 70 : 55);
            var dur = reducido ? 300 : res.vueloMs;
            this.vuelo = b;
            this.impulsoFlores = Math.max(this.impulsoFlores, 0.5);
            this.brilloEstrellas = Math.max(this.brilloEstrellas, 0.4);
            this.particulas.emitir(o.x, o.y + b.r * 0.6, { n: 14, tipos: ["chispa", "estrellita"], angulo: Math.PI / 2, apertura: 2.4, vel: 260, vida: 520, escala: 0.38, tintes: [b.color, 0xffffff, 0xffe066] });
            if (!demo) avisar("lanza", { id: b.id, acierto: res.acierto, angulo: res.angulo, error: res.error });
            else avisar("demoLanza");
            var lado = res.lado || 1;
            return this.anim.agregar(dur, function (u) {
                var e = 1 - Math.pow(1 - u, 1.5);
                var p = R().bezier(o, c, d, e);
                b.cont.x = p.x;
                b.cont.y = p.y;
                b.cont.rotation += 0.12 * lado;
                b.k = res.acierto ? (u < 0.7 ? 1.16 + Math.sin(u / 0.7 * Math.PI) * 0.1 : lerp(1.16, 0.62, (u - 0.7) / 0.3)) : lerp(1.16, 0.95, u);
                b.sombraAlpha = Math.max(0, 0.5 - u);
                if (self.t - self.tEstela > 34) {
                    self.tEstela = self.t;
                    self.particulas.emitir(p.x, p.y, { n: 2, tipos: ["chispa", "confeti"], vel: 50, vida: 460, escala: 0.34, tintes: [b.color, 0xffffff], dispersion: b.r * 0.6 });
                }
                self.monstruo.mirar(p);
            }).then(function () {
                self.vuelo = null;
                return res.acierto ? self.entra(b, demo) : self.rebota(b, res, demo);
            });
        }

        /** ¡Ñam! La bola entra en la boca. */
        entra(b, demo) {
            var self = this;
            var boca = this.monstruo.boca();
            var x0 = b.cont.x, y0 = b.cont.y;
            this.estado = "come";
            this.anim.agregar(140, function (u) {
                b.cont.x = lerp(x0, boca.x, u);
                b.cont.y = lerp(y0, boca.y + 10, u);
                b.k = lerp(0.62, 0.05, u);
                if (u >= 1) b.cont.setVisible(false);
            });
            var p = this.monstruo.comer();
            // estrellas y confeti, el jardín reacciona
            this.particulas.emitir(boca.x, boca.y - 20, { n: 16, tipos: ["estrellita", "chispa"], vel: 380, vida: 900, escala: 0.5, grav: 260, tintes: [0xffe066, 0xffffff, b.color] });
            this.particulas.emitir(boca.x, boca.y - 40, { n: 18, tipos: ["confeti"], vel: 320, vida: 1100, escala: 0.6, grav: 380, normal: true, tintes: COLORES_FIESTA, angulo: -Math.PI / 2, apertura: 2.6 });
            this.impulsoFlores = 1;
            this.brilloEstrellas = 1;
            if (demo) {
                avisar("demoCome");
            } else {
                b.estado = "comida";
                var nuevo = R().registrarAcierto(this.marcador, this.nivel, b.id);
                if (nuevo) {
                    var idx = this.marcador.n - 1;
                    this.progPop[idx] = 1;
                    this.hueco(b, false);
                }
                avisar("acierto", { id: b.id, n: this.marcador.n, total: this.marcador.total, quedan: this.marcador.total - this.marcador.n, nuevo: nuevo });
            }
            return p.then(function () {
                self.monstruo.mirar(null);
                if (demo) return self.reaparecer(b).then(function () { self.estado = "lista"; });
                if (R().completo(self.marcador)) {
                    self.estado = "completo";
                    avisar("nivelCompleto", { total: self.marcador.total });
                } else {
                    self.estado = "lista";
                    avisar("listo");
                }
            });
        }

        /** La bola pasó al lado: cae, rebota dos veces (¡boing!) y vuelve saltando a su hueco. */
        rebota(b, res, demo) {
            var self = this;
            var lado = res.lado || 1;
            var x0 = b.cont.x, y0 = b.cont.y;
            var suelo = 690;
            var x1 = Math.max(110, Math.min(W - 110, x0 + lado * 90));
            var x2 = Math.max(110, Math.min(W - 110, x1 + lado * 70));
            var x3 = Math.max(110, Math.min(W - 110, x2 + lado * 40));
            this.estado = "vuelta";
            if (!demo) {
                R().registrarFallo(this.marcador);
                avisar("fallo", { id: b.id, casi: !!res.casi, seguidos: this.marcador.fallosSeguidos, error: res.error });
            }
            this.monstruo.reir();
            var boing = function (x, fuerza) {
                b.aplasta = fuerza;
                self.particulas.emitir(x, suelo + b.r * 0.6, { n: 7, tipos: ["estrellita", "chispa"], angulo: -Math.PI / 2, apertura: 2.2, vel: 200, vida: 520, escala: 0.34, grav: 300, tintes: [0xffffff, 0xffe066, b.color] });
                self.impulsoFlores = Math.max(self.impulsoFlores, 0.6);
                avisar("rebote", { fuerza: fuerza });
            };
            var tramo = function (xa, ya, xb, yb, alto, ms, alFinal) {
                return self.anim.agregar(reducido ? 80 : ms, function (u) {
                    b.cont.x = lerp(xa, xb, u);
                    b.cont.y = lerp(ya, yb, u) - Math.sin(u * Math.PI) * alto;
                    b.cont.rotation += 0.08 * lado;
                    b.k = lerp(b.k, 1, 0.1);
                    if (u >= 1 && alFinal) alFinal();
                });
            };
            // cae al pasto (con un arquito: la gravedad la tira hacia abajo)
            return tramo(x0, y0, x1, suelo, 60, 420, function () { boing(x1, 1); })
                .then(function () { return tramo(x1, suelo, x2, suelo, 110, 420, function () { boing(x2, 0.6); }); })
                .then(function () { return tramo(x2, suelo, x3, suelo, 40, 280, function () { boing(x3, 0.3); }); })
                .then(function () {
                    // vuelve saltando a la bandeja
                    avisar("regresa", { id: b.id });
                    var xa = b.cont.x, ya = b.cont.y;
                    return self.anim.agregar(reducido ? 100 : 700, function (u) {
                        var e = saleSuave(u);
                        b.cont.x = lerp(xa, b.home.x, e);
                        b.cont.y = lerp(ya, b.home.y, e) - Math.sin(u * Math.PI) * 150;
                        b.cont.rotation = lerp(b.cont.rotation, 0, u);
                        b.sombraAlpha = u * 0.5;
                        b.k = 1;
                    });
                })
                .then(function () {
                    b.cont.rotation = 0;
                    b.estado = "lista";
                    b.cont.setDepth(44);
                    b.aplasta = 0.5;
                    self.pulsoBandeja = 0.8;
                    self.particulas.emitir(b.home.x, b.home.y, { n: 6, tipos: ["chispa"], vel: 120, vida: 380, escala: 0.3, tintes: [0xffffff, b.color] });
                    self.estado = "lista";
                    self.monstruo.mirar(null);
                    if (!demo) avisar("listo");
                });
        }

        /** Después de la demostración la bola vuelve a aparecer en su hueco (no se gastó). */
        reaparecer(b) {
            b.cont.setPosition(b.home.x, b.home.y).setVisible(true).setRotation(0).setDepth(44);
            b.estado = "lista";
            b.k = 0;
            b.sombraAlpha = 0.5;
            this.particulas.emitir(b.home.x, b.home.y, { n: 10, tipos: ["chispa", "estrellita"], vel: 180, vida: 520, escala: 0.4, tintes: [0xffffff, b.color] });
            avisar("aparece");
            return this.anim.agregar(reducido ? 60 : 520, function (u) { b.k = elastico(u); });
        }

        hueco(b, lleno) {
            if (b.huecoImg) b.huecoImg.setAlpha(lleno ? 0.9 : 0.45);
        }

        // ------------------------------------------------------------------ nivel

        cargar(nivel, ronda) {
            this.anim.limpiar();
            this.limpiarBolas();
            this.nivel = nivel;
            this.ronda = ronda;
            this.marcador = R().nuevoMarcador(nivel);
            this.progPop = nivel.bolas.map(function () { return 0; });
            this.estado = "oculta";
            this.guia(false);
            this.fiestaOn = false;
            var tinteAntes = this.cojinTinte;
            this.ponerTema(nivel.tema);
            this.cojinTinte = TEMAS[this.tema].cojin;
            var m = nivel.monstruo;
            var mon = this.monstruo;
            if (mon.cont.visible && tinteAntes != null) {
                // cambio de nivel: el monstruito se queda en escena y en presentar() salta hasta su nuevo lugar
                this.mudanza = { x0: mon.x, y0: mon.y, e0: mon.escala, x1: m.x, y1: m.y, e1: m.escala, t0: tinteAntes, t1: this.cojinTinte };
                this.cojin.setTint(tinteAntes);
            } else {
                this.mudanza = null;
                mon.colocar(m.x, m.y, m.escala);
                mon.cont.setVisible(false);
                this.ponerCojin(m.x, m.y, m.escala);
                this.cojin.setVisible(false);
                this.cojinSombra.setVisible(false);
            }
            mon.gorro(nivel.tema === "festin");

            var by = Math.round(nivel.bolas.reduce(function (s, b) { return s + b.y; }, 0) / nivel.bolas.length);
            this.bandejaY = by + 20;
            this.bandeja.setTexture("bandeja-" + nivel.id);
            this.bandeja.base = 1 / D().res("bandeja-" + nivel.id);
            this.bandeja.setScale(this.bandeja.base).setPosition(W / 2, this.bandejaY).setTint(TEMAS[this.tema].bandeja).setVisible(false);
            this.bandejaSombra.setPosition(W / 2, this.bandejaY + 66).setVisible(false);

            var self = this;
            this.bolas = nivel.bolas.map(function (d, i) {
                var hueco = img(self, d.x, d.y + d.r * 0.55, "hueco", d.r / 62).setDepth(41).setTint(TEMAS[self.tema].bandeja).setAlpha(0.9).setVisible(false);
                var sombra = img(self, d.x, d.y + d.r * 0.78, "sombra", d.r / 80).setDepth(42).setVisible(false);
                var cont = self.add.container(d.x, d.y).setDepth(44).setVisible(false);
                var bola = img(self, 0, 0, "bola", (d.r * 2) / 124).setTint(hex(d.hex));
                var brillo = img(self, 0, 0, "bolaBrillo", (d.r * 2) / 124);
                cont.add([bola, brillo]);
                return {
                    id: d.id, i: i, r: d.r, color: hex(d.hex), colorId: d.color,
                    home: { x: d.x, y: d.y }, cont: cont, sombra: sombra, huecoImg: hueco,
                    estado: "oculta", k: 1, aplasta: 0, sombraAlpha: 0.5, fase: Math.random() * 6
                };
            });
            this.pintarProgreso();
        }

        limpiarBolas() {
            this.bolas.forEach(function (b) { b.cont.destroy(); b.sombra.destroy(); b.huecoImg.destroy(); });
            this.bolas = [];
            this.sel = null;
            this.ptrId = null;
            this.vuelo = null;
        }

        /** Cambia el jardín al tema del nivel: cielo, colinas, decoración propia. */
        ponerTema(tema) {
            var T = TEMAS[tema] || TEMAS.manana;
            var antes = this.tema;
            this.tema = TEMAS[tema] ? tema : "manana";
            this.deco.forEach(function (o) { o.img.destroy(); if (o.extra) o.extra.forEach(function (e) { e.destroy(); }); });
            this.deco = [];
            if (antes !== this.tema) {
                this.cieloNuevo.setTexture("cielo-" + this.tema).setAlpha(antes ? 0 : 1);
                this.cieloNuevo.base = 2 / D().res("cielo-" + this.tema);
                this.cieloNuevo.setScale(this.cieloNuevo.base);
                this.fundeCielo = antes ? 0.0001 : 0;
                if (!antes) this.cielo.setTexture("cielo-" + this.tema);
            }
            this.colinasL.setTint(T.colinas);
            this.colinasC.setTint(T.colinas);
            this.cojin.setTint(T.cojin);
            this.sol.setTint(T.solTinte).setAlpha(T.sol);
            this.rayos.setAlpha(0.7 * T.sol);
            this.arcoObj = T.arco;
            this.crearDeco(T);
        }

        crearDeco(T) {
            var self = this;
            var add = function (o) { o.img.setAlpha(0); o.alpha = o.alpha == null ? 1 : o.alpha; self.deco.push(o); return o; };
            var lados = function () { return Math.random() < 0.5 ? azarEn(70, 430) : azarEn(1170, 1530); };
            var i;
            // estrellitas que titilan en el cielo
            for (i = 0; i < T.estrellas; i++) {
                add({ tipo: "estrella", img: img(this, azarEn(60, 1540), azarEn(40, 300), "estrellita", azarEn(0.25, 0.45)).setDepth(0.5).setTint(elegir([0xffffff, 0xfff3bf, 0xffe066])), fase: Math.random() * 6, per: azarEn(700, 1600) });
            }
            // arbolitos de topiario detrás y arbustos frondosos delante, a los lados
            [azarEn(90, 200), azarEn(1400, 1510)].forEach(function (x, k) {
                add({ tipo: "planta", img: img(self, x, azarEn(650, 668), "arbolito", azarEn(0.85, 1)).setOrigin(0.5, 0.97).setDepth(4.6).setFlipX(k === 1), fase: Math.random() * 6, amp: 0.012 });
            });
            [azarEn(230, 360), azarEn(1240, 1370)].forEach(function (x, k) {
                add({ tipo: "planta", img: img(self, x, azarEn(664, 684), "arbusto", azarEn(0.8, 0.95)).setOrigin(0.5, 0.95).setDepth(5).setFlipX(k === 1), fase: Math.random() * 6, amp: 0.008 });
            });
            // flores: atrás sobre las colinas y algunas adelante, lejos de la bandeja y del vuelo
            for (i = 0; i < T.flores; i++) {
                var adelante = i < 4;
                var x = adelante ? (i % 2 ? azarEn(1330, 1560) : azarEn(40, 270)) : lados();
                var y = adelante ? azarEn(860, 890) : azarEn(650, 705);
                var k = adelante ? azarEn(0.85, 1.05) : azarEn(0.55, 0.8);
                var cont = this.add.container(x, y).setDepth(adelante ? 38 : 6);
                var tallo = img(this, 0, 0, "tallo", k).setOrigin(0.5, 1);
                var pet = img(this, 0, -150 * k, "petalos", k * 0.85).setTint(elegir(T.tintesFlor));
                var centro = img(this, 0, -150 * k, "centroFlor", k * 0.8);
                cont.add([tallo, pet, centro]);
                add({ tipo: "flor", img: cont, pet: pet, fase: Math.random() * 6, k: k });
            }
            // mariposas
            for (i = 0; i < T.mariposas; i++) {
                var mc = this.add.container(0, 0).setDepth(15);
                var tinteAla = elegir([0xffa8d8, 0xffe066, 0x99e9f2, 0xb197fc, 0xffc078]);
                var alaI = img(this, 0, 0, "alaMariposa", 0.5).setOrigin(1, 0.45).setTint(tinteAla);
                var alaD = img(this, 0, 0, "alaMariposa", 0.5).setOrigin(1, 0.45).setTint(tinteAla).setFlipX(true);
                alaD.setOrigin(0, 0.45);
                var cuerpo = img(this, 0, 0, "cuerpoMariposa", 0.5);
                mc.add([alaI, alaD, cuerpo]);
                var izq = i % 2 === 0;
                add({ tipo: "mariposa", img: mc, alaI: alaI, alaD: alaD, cx: izq ? azarEn(180, 400) : azarEn(1200, 1420), cy: azarEn(250, 520), ax: azarEn(90, 160), ay: azarEn(50, 90), f1: azarEn(0.00035, 0.0006), f2: azarEn(0.0007, 0.0011), fase: Math.random() * 6 });
            }
            // hojas que flotan y caen despacio
            for (i = 0; i < T.hojas; i++) {
                add({ tipo: "hoja", img: img(this, lados(), azarEn(-200, 500), "hoja", azarEn(0.5, 0.75)).setDepth(30).setTint(elegir([0x8ce99a, 0xffc078, 0xffe066, 0x69db7c])), vy: azarEn(26, 46), fase: Math.random() * 6 });
            }
            // burbujas que suben
            for (i = 0; i < T.burbujas; i++) {
                add({ tipo: "burbuja", img: img(this, lados(), azarEn(300, 900), "burbuja", azarEn(0.35, 0.7)).setDepth(31), vy: azarEn(30, 60), fase: Math.random() * 6, alpha: 0.85 });
            }
            // formas geométricas suaves que flotan en el cielo
            for (i = 0; i < T.formas; i++) {
                add({ tipo: "forma", img: img(this, lados(), azarEn(120, 420), elegir(["formaTri", "formaAro", "formaCuadro"]), azarEn(0.35, 0.6)).setDepth(1.4).setTint(elegir(COLORES_FIESTA)), fase: Math.random() * 6, giro: azarEn(-0.6, 0.6), alpha: 0.55 });
            }
            // guirnaldas de estrellas (nivel 3)
            for (i = 0; i < T.guirnaldas; i++) {
                var gx = i < Math.ceil(T.guirnaldas / 2) ? 120 + i * 95 : 1480 - (i - Math.ceil(T.guirnaldas / 2)) * 95;
                add({ tipo: "colgante", img: img(this, gx, 0, "guirnalda", azarEn(0.8, 1.1)).setOrigin(0.5, 0).setDepth(2.5), fase: Math.random() * 6 });
            }
            // banderines de fiesta (nivel 4)
            if (T.banderines) {
                [[0, 40, 720, 64], [880, 40, 1600, 64]].forEach(function (t) {
                    var n = 9;
                    for (var j = 0; j < n; j++) {
                        var u = j / (n - 1);
                        var bx = lerp(t[0] + 40, t[2] - 40, u);
                        var by = t[1] + Math.sin(u * Math.PI) * 70;
                        add({ tipo: "colgante", img: img(self, bx, by, "banderin", 0.75).setOrigin(0.5, 0).setDepth(2.6).setTint(COLORES_FIESTA[j % COLORES_FIESTA.length]), fase: j * 0.6 });
                    }
                    var cuerda = self.add.graphics().setDepth(2.55);
                    cuerda.lineStyle(4, 0xffffff, 0.9);
                    var pts = [];
                    for (var q = 0; q <= 20; q++) { var v = q / 20; pts.push({ x: lerp(t[0], t[2], v), y: t[1] + 4 + Math.sin(v * Math.PI) * 74 }); }
                    cuerda.strokePoints(pts, false);
                    add({ tipo: "fijo", img: cuerda });
                });
            }
            // globos (nivel 4)
            for (i = 0; i < T.globos; i++) {
                var gx2 = i % 2 ? azarEn(1240, 1420) : azarEn(180, 360);
                add({ tipo: "globo", img: img(this, gx2, azarEn(330, 470), "globo", azarEn(0.7, 0.9)).setDepth(5.5).setTint(COLORES_FIESTA[i % COLORES_FIESTA.length]), fase: Math.random() * 6, y0: 0 });
            }
            this.deco.forEach(function (o) { if (o.tipo === "globo") o.y0 = o.img.y; });
            this.decoAlpha = 0;
        }

        /** El cojín (y su sombra) bajo el monstruito, a su escala. */
        ponerCojin(x, y, e) {
            this.cojin.setPosition(x, y + 196 * e).setScale(this.cojin.base * e);
            this.cojinSombra.setPosition(x, y + 236 * e).setScale(this.cojinSombra.base * e);
        }

        /** Las bolas caen una por una a su hueco; luego el nivel queda listo. */
        caerBolas() {
            var self = this;
            var ps = this.bolas.map(function (b, i) {
                return esperar(self.anim, reducido ? 10 : i * 170).then(function () {
                    b.huecoImg.setVisible(true);
                    b.sombra.setVisible(true);
                    b.cont.setVisible(true);
                    b.estado = "cayendo";
                    avisar("aparece", { i: i });
                    return self.anim.agregar(reducido ? 60 : 560, function (u) {
                        b.cont.y = b.home.y - (1 - u * u) * 420 + (u > 0.8 ? Math.sin((u - 0.8) / 0.2 * Math.PI) * -12 : 0);
                        b.sombraAlpha = u * 0.5;
                        if (u >= 1) { b.cont.y = b.home.y; b.aplasta = 0.7; b.estado = "lista"; }
                    });
                });
            });
            return Promise.all(ps).then(function () {
                self.estado = "lista";
                self.pintarProgreso();
            });
        }

        /**
         * Cambio de nivel sin desaparecer: el monstruito, sentado en su cojín, se aleja dando saltitos hasta su
         * nuevo lugar (más arriba y más pequeño) mientras el jardín nuevo aparece y sube la bandeja.
         */
        mudarse() {
            var self = this;
            var md = this.mudanza;
            this.mudanza = null;
            var mon = this.monstruo;
            var bY = this.bandejaY;
            this.bandeja.setVisible(true).setY(bY + 260);
            this.bandejaSombra.setVisible(true).setAlpha(0);
            this.cojin.setVisible(true).setAlpha(1);
            this.cojinSombra.setVisible(true).setAlpha(0.6);
            var dir = md.x1 >= md.x0 ? 1 : -1;
            var saltos = Math.max(2, Math.min(4, Math.round(Math.hypot(md.x1 - md.x0, md.y1 - md.y0) / 110)));
            avisar("mudanza", { saltos: saltos });
            return this.anim.agregar(reducido ? 120 : 1600, function (u) {
                var e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
                var x = lerp(md.x0, md.x1, e), y = lerp(md.y0, md.y1, e), k = lerp(md.e0, md.e1, e);
                var brinco = Math.abs(Math.sin(u * Math.PI * saltos));
                mon.colocar(x, y, k);
                mon.saltoY = -brinco * 58 * k;
                mon.aplasta = brinco < 0.25 ? (0.25 - brinco) * 1.6 : -0.12;
                mon.brazosObj = 0.45;
                mon.mirar({ x: x + dir * 400, y: y + 80 });
                self.ponerCojin(x, y, k);
                self.cojin.setTint(mezclar(md.t0, md.t1, e));
                self.decoAlpha = u;
                self.bandeja.setY(bY + (1 - saleSuave(u)) * 260);
                self.bandejaSombra.setAlpha(u * 0.5);
                if (u >= 1) {
                    mon.colocar(md.x1, md.y1, md.e1);
                    mon.saltoY = 0;
                    mon.aplasta = 0.5;
                    mon.brazosObj = 0;
                    mon.mirar(null);
                    self.ponerCojin(md.x1, md.y1, md.e1);
                    self.cojin.setTint(md.t1);
                }
            }).then(function () {
                mon.saltito(26);
                return self.caerBolas();
            });
        }

        /** Entrada del nivel: el jardín aparece, el monstruito salta a su cojín, la bandeja sube y caen las bolas. */
        presentar() {
            var self = this;
            var m = this.monstruo;
            if (this.mudanza) return this.mudarse();
            this.cojin.setVisible(true).setAlpha(0);
            this.cojinSombra.setVisible(true).setAlpha(0);
            m.cont.setVisible(true);
            var y0 = m.y;
            var bY = this.bandejaY;
            this.bandeja.setVisible(true).setY(bY + 260);
            this.bandejaSombra.setVisible(true).setAlpha(0);
            var dur = reducido ? 100 : 900;
            m.escalaVis = 0;
            return this.anim.agregar(dur, function (u) {
                self.decoAlpha = u;
                self.cojin.setAlpha(u);
                self.cojinSombra.setAlpha(u * 0.6);
                var e = elastico(Math.min(1, u * 1.15));
                m.cont.setAlpha(Math.min(1, u * 2));
                m.y = y0 + (1 - e) * 120;
                self.bandeja.setY(bY + (1 - saleSuave(u)) * 260);
                self.bandejaSombra.setAlpha(u * 0.5);
                if (u >= 1) m.y = y0;
            }).then(function () {
                m.saltito(34);
                return self.caerBolas();
            });
        }

        /** Fin del nivel: el jardín se ilumina, partículas de colores, las flores se animan y el monstruito celebra. */
        celebrarNivel(grande) {
            var self = this;
            this.impulsoFlores = 1.4;
            this.brilloEstrellas = 1.5;
            var ms = grande ? 3400 : 2600;
            var tiros = grande ? 7 : 4;
            for (var i = 0; i < tiros; i++) {
                (function (k) {
                    esperar(self.anim, k * 380).then(function () {
                        var x = azarEn(380, 1220), y = azarEn(160, 420);
                        self.particulas.emitir(x, y, { n: 22, tipos: ["estrellita", "chispa", "corazon"], vel: 360, vida: 1100, escala: 0.46, grav: 160, tintes: COLORES_FIESTA });
                        avisar("destello");
                    });
                })(i);
            }
            this.particulas.emitir(800, 120, { n: 34, tipos: ["confeti"], vel: 380, vida: 1800, escala: 0.62, grav: 340, normal: true, tintes: COLORES_FIESTA, angulo: Math.PI / 2, apertura: 3, dispersion: 900, dispersionY: 60, oscila: 40 });
            // el jardín se ilumina apenas (sin lavar los colores)
            var luz = this.anim.agregar(ms, function (u) { self.brillo.setAlpha(Math.sin(u * Math.PI) * (grande ? 0.1 : 0.07)); });
            return Promise.all([luz, this.monstruo.celebrar(ms)]);
        }

        /** Salida del nivel: las cosas se despiden para que entre el jardín siguiente. */
        salida() {
            var self = this;
            this.guia(false);
            // el monstruito y su cojín se quedan: en el nivel siguiente se mudan saltando (mudarse)
            return this.anim.agregar(reducido ? 80 : 700, function (u) {
                self.decoAlpha = 1 - u;
                self.bandeja.setY(self.bandejaY + saleSuave(u) * 280);
                self.bandejaSombra.setAlpha((1 - u) * 0.5);
                self.bolas.forEach(function (b) {
                    b.cont.y = b.home.y + saleSuave(u) * 280;
                    b.sombra.setAlpha((1 - u) * 0.5);
                    b.huecoImg.setAlpha((1 - u) * 0.9);
                });
            });
        }

        fiesta(on) { this.fiestaOn = !!on; }

        // ------------------------------------------------------------------ guía punteada

        /** Muestra (o esconde) la línea punteada desde una bola hasta la boca. */
        guia(on, idBola) {
            if (!on) {
                this.guiaOn = false;
                return;
            }
            if (!this.nivel) return;
            var b = null;
            if (idBola) b = this.bolas.find(function (x) { return x.id === idBola; });
            if (!b || b.estado !== "lista") {
                // la bola disponible más cercana al centro
                var libres = this.bolas.filter(function (x) { return x.estado === "lista"; });
                var boca = this.nivel.boca;
                libres.sort(function (p, q) { return Math.abs(p.home.x - boca.x) - Math.abs(q.home.x - boca.x); });
                b = libres[0];
            }
            if (!b) return;
            var o = { x: b.home.x, y: b.home.y - b.r - 10 };
            var d = this.monstruo.boca();
            var c = R().controlVuelo(o, d, 70);
            this.guiaPts = [];
            var n = this.puntos.length;
            for (var i = 0; i < n; i++) {
                var u = 0.06 + (i / (n - 1)) * 0.86;
                this.guiaPts.push(R().bezier(o, c, d, u));
            }
            this.guiaBola = b;
            this.guiaOn = true;
            this.guiaT = 0;
        }

        // ------------------------------------------------------------------ progreso (iconos, sin números)

        pintarProgreso() {
            var g = this.gProg;
            g.clear();
            if (!this.nivel || !this.mostrarProg || !this.bandeja.visible) return;
            var n = this.marcador.total, comidas = this.marcador.n;
            var sep = 46;
            var x0 = W / 2 - (n - 1) * sep / 2;
            var y = this.bandeja.y + 70;
            g.fillStyle(0xffffff, 0.85);
            g.fillRoundedRect(x0 - 34, y - 24, (n - 1) * sep + 68, 48, 24);
            g.lineStyle(4, hex("#7d8aa6"), 0.6);
            g.strokeRoundedRect(x0 - 34, y - 24, (n - 1) * sep + 68, 48, 24);
            var colores = this.bolas.filter(function (b) { return b.estado === "comida"; }).map(function (b) { return b.color; });
            for (var i = 0; i < n; i++) {
                var pop = this.progPop[i] || 0;
                var r = 15 * (1 + pop * 0.5);
                if (i < comidas) {
                    g.fillStyle(colores[i] || 0xffe066, 1);
                    g.fillCircle(x0 + i * sep, y, r);
                    g.fillStyle(0xffffff, 0.8);
                    g.fillCircle(x0 + i * sep - r * 0.35, y - r * 0.35, r * 0.3);
                    g.lineStyle(3, 0x1b5e5f, 0.7);
                    g.strokeCircle(x0 + i * sep, y, r);
                } else {
                    g.lineStyle(4, 0xadb5bd, 0.9);
                    g.strokeCircle(x0 + i * sep, y, 13);
                }
            }
        }

        // ------------------------------------------------------------------ demostración

        /** La mano toma una bola, desliza hacia arriba y el monstruito se la come (no cuenta). mano(x, y, fase). */
        demo(mano) {
            var self = this;
            var b = this.bolas.find(function (x) { return x.estado === "lista"; });
            if (!b) return Promise.resolve();
            var mover = function (x, y, fase) { try { if (mano) mano(x, y, fase); } catch (e) { /* noop */ } };
            this.guia(true, b.id);
            mover(b.home.x + 160, b.home.y + 120, "viaja");
            return esperar(this.anim, 900).then(function () {
                mover(b.home.x, b.home.y, "viaja");
                return esperar(self.anim, 700);
            }).then(function () {
                mover(b.home.x, b.home.y, "presiona");
                b.estado = "tomada";
                b.k = 1.16;
                b.cont.setDepth(55);
                self.pulsoBandeja = 1;
                self.monstruo.hambre(true);
                avisar("demoToma");
                return esperar(self.anim, 450);
            }).then(function () {
                var y0 = b.home.y;
                self.guia(false);
                return self.anim.agregar(320, function (u) {
                    b.cont.y = y0 - u * 70;
                    mover(b.home.x, b.cont.y, "arrastra");
                });
            }).then(function () {
                mover(b.home.x, b.cont.y - 80, "suelta");
                var boca = self.monstruo.boca();
                return self.lanzar(b, { lanza: true, acierto: true, destino: { x: boca.x, y: boca.y + 4 }, lado: 1, vueloMs: 720 }, { demo: true });
            }).then(function () {
                self.monstruo.hambre(false);
                return esperar(self.anim, 300);
            });
        }

        // ------------------------------------------------------------------ cuadro a cuadro

        update(time, delta) {
            if (this.pausado) return;
            var dt = Math.min(50, delta || 16);
            this.t += dt;
            var t = this.t;
            this.anim.update(dt);
            this.monstruo.update(dt);
            this.particulas.update(dt);
            this.particulasAtras.update(dt);

            // cielo que cambia de tema
            if (this.fundeCielo > 0) {
                this.fundeCielo = Math.min(1, this.fundeCielo + dt / 900);
                this.cieloNuevo.setAlpha(this.fundeCielo);
                if (this.fundeCielo >= 1) {
                    this.cielo.setTexture(this.cieloNuevo.texture.key);
                    this.cieloNuevo.setAlpha(0);
                    this.fundeCielo = 0;
                }
            }
            this.arco.setAlpha(lerp(this.arco.alpha, (this.arcoObj || 0) * (this.decoAlpha == null ? 1 : this.decoAlpha), 0.04));
            this.rayos.rotation += dt * 0.00008;
            this.sol.y = 120 + Math.sin(t / 1400) * 5;
            this.rayos.y = this.sol.y;
            var self = this;
            this.nubes.forEach(function (n) {
                n.x += n.vel * dt / 1000;
                if (n.x > W + 200) n.x = -200;
            });

            this.impulsoFlores = Math.max(0, this.impulsoFlores - dt / 1400);
            this.brilloEstrellas = Math.max(0, this.brilloEstrellas - dt / 1600);
            var da = this.decoAlpha == null ? 1 : this.decoAlpha;
            this.deco.forEach(function (o) {
                var im = o.img;
                switch (o.tipo) {
                    case "estrella":
                        im.setAlpha(da * Math.min(1, (0.25 + 0.75 * Math.abs(Math.sin(t / o.per + o.fase))) * (1 + self.brilloEstrellas)));
                        im.setScale(im.base * (1 + self.brilloEstrellas * 0.4));
                        break;
                    case "flor":
                        im.setAlpha(da);
                        im.rotation = Math.sin(t / 900 + o.fase) * 0.06 + self.impulsoFlores * Math.sin(t / 110 + o.fase) * 0.16;
                        o.pet.rotation += dt * 0.0002 * (1 + self.impulsoFlores * 6);
                        break;
                    case "mariposa":
                        var mx = o.cx + Math.sin(t * o.f1 + o.fase) * o.ax;
                        var my = o.cy + Math.sin(t * o.f2 + o.fase * 2) * o.ay;
                        var vx = Math.cos(t * o.f1 + o.fase);
                        im.setPosition(mx, my).setAlpha(da);
                        var aleteo = 0.25 + 0.75 * Math.abs(Math.cos(t / 80 + o.fase));
                        o.alaI.scaleX = o.alaI.base * aleteo;
                        o.alaD.scaleX = o.alaD.base * aleteo;
                        im.rotation = vx * 0.25;
                        break;
                    case "hoja":
                        im.y += o.vy * dt / 1000;
                        im.x += Math.sin(t / 700 + o.fase) * 0.5;
                        im.rotation = Math.sin(t / 600 + o.fase) * 0.8;
                        if (im.y > 720) { im.y = -40; }
                        im.setAlpha(da * 0.95);
                        break;
                    case "burbuja":
                        im.y -= o.vy * dt / 1000;
                        im.x += Math.sin(t / 500 + o.fase) * 0.4;
                        if (im.y < 60) {
                            self.particulasAtras.emitir(im.x, im.y, { n: 4, tipos: ["chispa"], vel: 80, vida: 300, escala: 0.25 });
                            im.y = azarEn(820, 900);
                        }
                        im.setAlpha(da * o.alpha);
                        break;
                    case "forma":
                        im.rotation += o.giro * dt / 1000;
                        im.y += Math.sin(t / 1200 + o.fase) * 0.12;
                        im.setAlpha(da * o.alpha);
                        break;
                    case "colgante":
                        im.rotation = Math.sin(t / 900 + o.fase) * 0.12 * (1 + self.impulsoFlores);
                        im.setAlpha(da);
                        break;
                    case "planta":
                        // se mece apenas con la brisa y más fuerte cuando el jardín celebra
                        im.rotation = Math.sin(t / 1300 + o.fase) * o.amp * (1 + self.impulsoFlores * 3);
                        im.scaleY = im.base * (1 + Math.sin(t / 900 + o.fase) * 0.008);
                        im.setAlpha(da);
                        break;
                    case "globo":
                        im.y = o.y0 + Math.sin(t / 1100 + o.fase) * 12;
                        im.rotation = Math.sin(t / 1500 + o.fase) * 0.06;
                        im.setAlpha(da);
                        break;
                    default:
                        im.setAlpha(da);
                }
            });

            // bandeja flotando suave y bolas en sus huecos
            this.pulsoBandeja = Math.max(0, this.pulsoBandeja - dt / 380);
            if (this.bandeja.visible && this.estado !== "oculta") {
                var flot = Math.sin(t / 900) * 3;
                this.bandeja.y = this.bandejaY + flot;
                this.bandeja.scaleY = this.bandeja.base * (1 - this.pulsoBandeja * 0.04);
                this.bandeja.scaleX = this.bandeja.base * (1 + this.pulsoBandeja * 0.015);
            }
            var fl = this.bandeja.visible ? this.bandeja.y - this.bandejaY : 0;
            this.bolas.forEach(function (b) {
                b.aplasta = Math.max(0, b.aplasta - dt / 260);
                var resp = 0;
                if (b.estado === "lista") {
                    resp = Math.sin(t / 650 + b.fase);
                    b.cont.y = b.home.y + fl + resp * 3;
                    b.cont.x = b.home.x;
                }
                var k = b.k;
                b.cont.setScale(k * (1 + b.aplasta * 0.18 + resp * 0.01), k * (1 - b.aplasta * 0.2 - resp * 0.01));
                b.sombra.setPosition(b.home.x, b.home.y + b.r * 0.78 + fl);
                b.sombra.setAlpha(b.estado === "comida" ? 0 : b.sombraAlpha);
                b.huecoImg.y = b.home.y + b.r * 0.55 + fl;
            });

            // guía: los puntos aparecen uno tras otro y "caminan" hacia la boca
            if (this.guiaOn) this.guiaT += dt;
            var n = this.puntos.length;
            for (var i = 0; i < n; i++) {
                var p = this.puntos[i];
                if (!this.guiaOn) {
                    if (p.visible) { p.setAlpha(p.alpha - dt / 200); if (p.alpha <= 0.02) p.setVisible(false); }
                    continue;
                }
                var q = this.guiaPts[i];
                if (!q) continue;
                var aparece = Math.max(0, Math.min(1, (this.guiaT - i * 55) / 220));
                var ola = 0.55 + 0.45 * Math.sin(t / 160 - i * 0.7);
                p.setVisible(true).setPosition(q.x, q.y).setAlpha(aparece * (0.62 + 0.33 * ola));
                p.setScale(p.base * (0.9 + 0.25 * ola) * (1 - 0.3 * i / n));
            }
            if (this.guiaOn && this.guiaBola) {
                var gb = this.guiaBola;
                this.flecha.setVisible(true).setPosition(gb.home.x, gb.home.y - gb.r - 54 - Math.abs(Math.sin(t / 260)) * 16).setAlpha(Math.min(1, this.guiaT / 300));
            } else if (this.flecha.visible) {
                this.flecha.setAlpha(this.flecha.alpha - dt / 200);
                if (this.flecha.alpha <= 0.02) this.flecha.setVisible(false);
            }

            // progreso
            var animando = false;
            for (var j = 0; j < this.progPop.length; j++) {
                if (this.progPop[j] > 0) { this.progPop[j] = Math.max(0, this.progPop[j] - dt / 500); animando = true; }
            }
            if (animando || this.bandeja.visible) this.pintarProgreso();

            // lluvia de confeti en la fiesta final
            if (this.fiestaOn) {
                this.tConfeti -= dt;
                if (this.tConfeti <= 0) {
                    this.tConfeti = 90;
                    this.particulas.emitir(azarEn(200, 1400), -20, { n: 3, tipos: ["confeti", "estrellita"], angulo: Math.PI / 2, apertura: 0.6, vel: 160, vida: 3200, escala: 0.55, grav: 60, normal: true, tintes: COLORES_FIESTA, oscila: 60, encoge: 0 });
                }
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
            backgroundColor: "#bde8ff",
            banner: false,
            scale: { mode: Phaser.Scale.ENVELOP, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
            input: { activePointers: 2 },
            render: { antialias: true },
            scene: [EscenaJardin]
        });
        global.__escenarioMonstruo = juego;
        global.__pedniaPhaserGame = juego;
    }

    // ------------------------------------------------------------------ API pública

    global.EscenarioMonstruo = {
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
        /** Habilita o bloquea la entrada. Al bloquear, una bola tomada vuelve a su hueco sin lanzarse. */
        entrada: function (on) {
            if (!escena) return;
            escena.entradaOn = !!on;
            if (!on && escena.sel && escena.estado === "tomada") {
                var b = escena.sel;
                escena.sel = null;
                escena.ptrId = null;
                escena.devolver(b);
                escena.estado = "lista";
                escena.monstruo.hambre(false);
            }
        },
        guia: function (on, id) { if (escena) escena.guia(on, id); },
        celebrarNivel: function (grande) { return escena ? escena.celebrarNivel(grande) : Promise.resolve(); },
        salida: function () { return escena ? escena.salida() : Promise.resolve(); },
        fiesta: function (on) { if (escena) escena.fiesta(on); },
        saltito: function () { if (escena) escena.monstruo.saltito(30); },
        pausar: function (on) {
            if (!escena) return;
            escena.pausado = !!on;
            escena.anim.pausado = !!on;
            escena.monstruo.pausado = !!on;
            if (on && escena.sel && escena.estado === "tomada") global.EscenarioMonstruo.entrada(escena.entradaOn);
        },
        mostrarProgreso: function (on) {
            if (!escena) return;
            escena.mostrarProg = !!on;
            escena.pintarProgreso();
        },
        aPantalla: aPantalla,
        aMundo: aMundo,
        /** Centro de una bola (pantalla). */
        puntoDe: function (id) {
            if (!escena) return null;
            var b = escena.bolas.find(function (x) { return x.id === id; });
            return b ? aPantalla(b.cont.x, b.cont.y) : null;
        },
        puntoBoca: function () { if (!escena) return null; var p = escena.monstruo.boca(); return aPantalla(p.x, p.y); },
        /** Pruebas: un gesto completo sobre una bola (dx, dy en el mundo; ms de duración). */
        probar: {
            gesto: function (id, dx, dy, ms) {
                if (!escena) return false;
                var b = escena.bolas.find(function (x) { return x.id === id; });
                if (!b) return false;
                var t0 = performance.now();
                escena.bajar("prueba", { x: b.cont.x, y: b.cont.y, t: t0 });
                if (escena.ptrId !== "prueba") return false;
                var pasos = 8;
                for (var i = 1; i <= pasos && escena.ptrId === "prueba"; i++) {
                    escena.mover({ x: b.home.x + dx * i / pasos, y: b.home.y + dy * i / pasos, t: t0 + (ms || 200) * i / pasos });
                }
                if (escena.ptrId === "prueba") escena.soltar({ x: b.home.x + dx, y: b.home.y + dy, t: t0 + (ms || 200) });
                return true;
            },
            /** Lanza la bola directo a la boca (sin pasar por el gesto). */
            acertar: function (id) {
                if (!escena || escena.estado !== "lista") return false;
                var b = escena.bolas.find(function (x) { return x.id === id; });
                if (!b || b.estado !== "lista") return false;
                var bo = escena.nivel.boca;
                var dy = -120, dx = (bo.x - b.home.x) / (b.home.y - bo.y) * 120;
                return global.EscenarioMonstruo.probar.gesto(id, dx, dy, 220);
            },
            paso: function (ms) { if (escena) escena.update(0, ms || 16); }
        },
        estado: function () {
            if (!escena || !escena.nivel) return null;
            return {
                estado: escena.estado,
                nivel: escena.nivel.id,
                tema: escena.tema,
                entrada: escena.entradaOn,
                pausado: escena.pausado,
                comidas: escena.marcador.n,
                total: escena.marcador.total,
                fallos: escena.marcador.fallos,
                guia: escena.guiaOn,
                boca: escena.nivel.boca,
                monstruo: { x: escena.monstruo.x, y: escena.monstruo.y, estado: escena.monstruo.estado, apertura: Math.round(escena.monstruo.apertura * 100) / 100 },
                bolas: escena.bolas.map(function (b) { return { id: b.id, color: b.colorId, estado: b.estado, x: Math.round(b.cont.x), y: Math.round(b.cont.y), r: b.r, visible: b.cont.visible }; })
            };
        }
    };
})(typeof window !== "undefined" ? window : global);
