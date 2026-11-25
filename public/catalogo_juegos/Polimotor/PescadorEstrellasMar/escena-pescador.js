/**
 * EscenarioPescador — escena Phaser 4 de "El Pescador de Estrellas de Mar" (window.EscenarioPescador).
 *
 * Dibuja el fondo marino por capas (cielo con nubes, superficie con ondas y destellos, rayos de luz, arrecife lejano,
 * siluetas de peces, peces de colores, burbujas, algas que se mecen, corales, rocas, conchas, arena), la barca de Zoe y
 * Zeus con su pescante, la polea, la cuerda, el gancho dorado, la red con las estrellas pescadas y las estrellas de mar
 * del fondo (parpadean, laten y se alegran).
 *
 * La barca navega despacio de lado a lado y el gancho cuelga de su pescante (vaivén de ReglasPescador). Estados:
 *   presentacion → espera → moviendo ─toque→ detenido → bajando → comprobando → atrapada | fallo → subiendo
 *   → depositando (la estrella salta a la red) → esperaSiguiente → moviendo … → completo.   (+ pausado)
 * Solo en «moviendo» un toque lanza la cuerda; mientras baja o sube no se aceptan más intentos.
 * ReglasPescador decide qué estrella atrapa el toque (distancia horizontal, tolerancia del nivel).
 * Eventos para script.js: lanza, cerca, atrapa, fallo, deposita, ayuda, nivelCompleto, sonido.
 *
 * Mundo de diseño 1600 × 900 con Scale.ENVELOP; lo jugable cabe en 4:3 (x 230…1370). Cada animación que el flujo
 * espera es una Promise con respaldo por tiempo (Animador), que también respeta la pausa.
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser;
    var W = 1600, H = 900;

    var D = function () { return global.DibujosPescador; };
    var R = function () { return global.ReglasPescador; };

    var juego = null, escena = null, el = null, cfg = null, espera = null;
    var cb = {};
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);

    function avisar(nombre, a) {
        var f = cb[nombre];
        if (typeof f === "function") {
            try { f(a); } catch (e) { console.warn("[EscenarioPescador]", nombre, e); }
        }
    }
    function sonar(n) { avisar("sonido", n); }

    function lerp(a, b, u) { return a + (b - a) * u; }
    function saleSuave(u) { return 1 - Math.pow(1 - u, 3); }
    function suave(u) { return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
    function rebote(u) { var c = 1.70158 * 1.3; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); }
    function jcfg() { return (cfg && cfg.juego) || {}; }
    function azarEn(a, b) { return a + Math.random() * (b - a); }
    function num(v, d) { var n = Number(v); return isFinite(n) ? n : d; }
    function elegir(l) { return l[Math.floor(Math.random() * l.length)]; }

    var CORALES = [0xff8fab, 0xffa94d, 0xb197fc, 0xff6fae, 0x63e6be, 0xffd43b, 0x74c0fc, 0xf783ac];
    var PECES = [0xffd43b, 0xff922b, 0x74c0fc, 0xf783ac, 0x63e6be, 0xb197fc, 0xff6b6b, 0x8ce99a];
    var BRILLOS = [0xffffff, 0xfff3bf, 0xc5f6fa, 0xffe066, 0xffc9e3];

    // Lo que cambia en cada nivel (decoración y luz del agua).
    var TEMAS = {
        laguna: { tinte: 0x9ff5ff, tAlfa: 0.1, corales: 2, algas: 5, peces: 6, cofre: false, medusas: 0, adornos: false, rayos: 0.55, burbujasMs: 520 },
        arrecife: { tinte: 0xffb3d9, tAlfa: 0.07, corales: 6, algas: 4, peces: 7, cofre: false, medusas: 0, adornos: false, rayos: 0.5, burbujasMs: 420 },
        tesoro: { tinte: 0x2b5fd9, tAlfa: 0.1, corales: 7, algas: 4, peces: 9, cofre: true, medusas: 0, adornos: false, rayos: 0.62, burbujasMs: 380 },
        magico: { tinte: 0x9b6bff, tAlfa: 0.1, corales: 8, algas: 5, peces: 10, cofre: true, medusas: 4, adornos: true, rayos: 0.7, burbujasMs: 320 }
    };

    // Barca: textura 400 × 290 con la línea de flotación en (200, 230); la polea en (360, 44).
    var BARCA_ORIGEN_Y = 230 / 290;
    var POLEA_LOCAL = { x: 160, y: -186 };
    var RED_LOCAL = { x: 46, y: -36 };   // la red cuelga cerca del pescante: siempre a la vista aunque la barca llegue al borde
    var RED_ESC = 0.85;
    var HUECOS_RED = [[-32, 46], [0, 58], [32, 46], [-18, 84], [18, 84], [0, 110], [-40, 20], [40, 20]];
    var GANCHO_AGARRE = 132;     // del aro a la curva del gancho

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
        try { a.fn(1); } catch (e) { console.warn("[EscenarioPescador] anim", e); }
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

    function esperar(anim, ms) { return anim.agregar(ms, function () {}); }

    // ------------------------------------------------------------------ partículas (reserva fija)

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
            p.oscila = o.oscila || 0;
            p.fase = Math.random() * 6;
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

    // ------------------------------------------------------------------ burbujas que suben (reserva fija)

    function Burbujas(scene, n, superficie) {
        this.lista = [];
        this.sup = superficie;
        for (var i = 0; i < n; i++) {
            var im = scene.add.image(-100, -100, "burbuja").setVisible(false).setDepth(10);
            this.lista.push({ img: im, vivo: false });
        }
        this.i = 0;
    }

    Burbujas.prototype.soltar = function (x, y, o) {
        o = o || {};
        for (var k = 0; k < (o.n || 1); k++) {
            var b = this.lista[this.i];
            this.i = (this.i + 1) % this.lista.length;
            b.vivo = true;
            b.x = x + (Math.random() - 0.5) * (o.dispersion || 0);
            b.y = y + (Math.random() - 0.5) * (o.dispersion || 0) * 0.5;
            b.vy = -(o.vel || 70) * (0.7 + Math.random() * 0.6);
            b.vx = (o.vx || 0) * (0.5 + Math.random());
            b.fase = Math.random() * 6;
            b.esc = (o.escala || 0.3) * (0.55 + Math.random() * 0.8) / D().res("burbuja");
            b.empuje = 0;
            b.img.setPosition(b.x, b.y).setScale(b.esc).setAlpha(o.alpha || 0.85).setVisible(true);
            b.a0 = o.alpha || 0.85;
        }
    };

    Burbujas.prototype.update = function (dt, t, gancho) {
        var s = dt / 1000;
        for (var i = 0; i < this.lista.length; i++) {
            var b = this.lista[i];
            if (!b.vivo) continue;
            // las burbujas cerca del gancho se apartan con suavidad
            if (gancho) {
                var dx = b.x - gancho.x, dy = b.y - gancho.y;
                var d2 = dx * dx + dy * dy;
                if (d2 < 9000 && d2 > 1) b.empuje += (dx > 0 ? 1 : -1) * 90 * s;
            }
            b.empuje *= 0.95;
            b.vx *= 0.97;
            b.x += (b.vx + b.empuje + Math.sin(t / 380 + b.fase) * 14) * s;
            b.y += b.vy * s;
            var sup = this.sup + 8;
            if (b.y < sup) { b.vivo = false; b.img.setVisible(false); continue; }
            b.img.setPosition(b.x, b.y);
            b.img.setAlpha(b.a0 * Math.min(1, (b.y - sup) / 60));
        }
    };

    Burbujas.prototype.apagar = function () {
        this.lista.forEach(function (b) { b.vivo = false; b.img.setVisible(false); });
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

    var EscenaMar = Phaser ? class extends Phaser.Scene {
        constructor() { super({ key: "Mar" }); }

        create() {
            var self = this;
            D().claves().forEach(function (k) { tex(self, k); });
            var j = jcfg();
            this.SUP = num(j.superficieY, 200);
            this.OFF = num(j.barcaOffsetX, 160);
            this.REPOSO = num(j.ganchoY, 300);
            this.anim = new Animador();
            this.t = 0;
            this.tE = 0;              // reloj de las estrellas que se mecen (niveles 3 y 4)
            this.gen = 0;
            this.pausado = false;
            this.entradaOn = false;
            this.ayudaAuto = true;
            this.estado = "presentacion";
            this.nivel = null;
            this.ronda = null;
            this.marcador = null;
            this.tema = "laguna";
            this.fase = 0;
            this.corrX = 0;
            this.ganchoX = 800;
            this.ganchoY = this.REPOSO;
            this.angGancho = 0;
            this.velGancho = 0;
            this.giroPolea = 0;
            this.hundir = 0;          // la barca se hunde un poco con el peso (px)
            this.vaivenExtra = 0;     // la barca se balancea al recibir una estrella
            this.tBurbuja = 0;
            this.tDestello = 1200;
            this.tQuieto = 0;
            this.ayudaOn = false;
            this.cercaId = null;
            this.cercaDesde = 0;
            this.guiaAlpha = 0;
            this.guiaOffset = 0;
            this.fiestaOn = false;
            this.tFiesta = 0;
            this.brilloRed = 0;
            this.brilloCorales = 0;
            this.estrellas = [];
            this.enRed = [];
            this.deco = [];
            this.frente = [];

            // ---------------- cielo, agua y fondo lejano
            img(this, W / 2, H / 2, "mar", 1).setDepth(0);
            this.nubes = [];
            for (var n = 0; n < 4; n++) {
                var nb = img(this, azarEn(0, W), azarEn(40, 120), "nube", azarEn(0.45, 0.75)).setDepth(0.4).setAlpha(0.9);
                nb.vel = azarEn(5, 12);
                this.nubes.push(nb);
            }
            this.tinteAgua = this.add.rectangle(W / 2, (this.SUP + H) / 2, W, H - this.SUP, 0x9ff5ff).setDepth(0.6).setAlpha(0.1);
            this.rayos = [];
            for (var r = 0; r < 6; r++) {
                var ry = img(this, 160 + r * 260 + azarEn(-40, 40), this.SUP - 10, "rayo", azarEn(0.8, 1.15)).setOrigin(0.5, 0).setDepth(1).setBlendMode(Phaser.BlendModes.ADD).setTint(0xe3fafc);
                ry.rot0 = azarEn(-0.22, 0.22);
                ry.fase = Math.random() * 6;
                ry.vel = azarEn(0.5, 1.1);
                ry.setRotation(ry.rot0);
                this.rayos.push(ry);
            }
            this.lejano = img(this, W / 2, 760, "arrecifeLejano", 1).setOrigin(0.5, 1).setDepth(2).setTint(0x1f6fae).setAlpha(0.45);
            this.siluetas = [];
            for (var s = 0; s < 4; s++) {
                var si = img(this, azarEn(0, W), azarEn(420, 620), "silueta", azarEn(0.4, 0.7)).setDepth(2.2).setTint(0x1c5f99).setAlpha(0.35);
                si.vel = azarEn(14, 26) * (Math.random() < 0.5 ? -1 : 1);
                si.setFlipX(si.vel > 0);
                this.siluetas.push(si);
            }

            // ---------------- arena (lecho marino)
            this.arena = img(this, W / 2, H, "arena", 1).setOrigin(0.5, 1).setDepth(4);

            // ---------------- peces de colores (se crean por nivel)
            this.peces = [];

            // ---------------- guía punteada, cuerda y gancho
            this.gGuia = this.add.graphics().setDepth(12);
            this.gCuerda = this.add.graphics().setDepth(14);
            this.gancho = img(this, 800, this.REPOSO, "gancho", 1).setOrigin(0.5, 16 / 180).setDepth(15);
            this.ganchoLuz = img(this, 800, this.REPOSO, "luz", 1.5).setDepth(14.5).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffe066).setAlpha(0.35);
            this.reflejo = img(this, 0, 0, "chispa", 0.6).setDepth(15.5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);

            // ---------------- superficie del agua (ondas) y barca
            this.gSuperficie = this.add.graphics().setDepth(16);
            this.destellos = [];
            for (var d = 0; d < 10; d++) {
                var de = img(this, azarEn(0, W), this.SUP, "chispa", azarEn(0.25, 0.5)).setDepth(16.5).setBlendMode(Phaser.BlendModes.ADD);
                de.vel = azarEn(20, 45) * (Math.random() < 0.5 ? -1 : 1);
                de.fase = Math.random() * 6;
                this.destellos.push(de);
            }
            this.barcaLuz = img(this, 0, 0, "luz", 4).setDepth(17).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff3bf).setAlpha(0);
            this.barca = img(this, 640, this.SUP, "barca", 1).setOrigin(0.5, BARCA_ORIGEN_Y).setDepth(18);
            this.cuerdaMastil = this.add.graphics().setDepth(18.2);
            this.redLuz = img(this, 0, 0, "luz", 1.8).setDepth(18.4).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff3bf).setAlpha(0);
            this.red = img(this, 0, 0, "red", RED_ESC).setOrigin(0.5, 0.1).setDepth(19.2);
            this.polea = img(this, 0, 0, "polea", 0.62).setDepth(21);
            this.aguaFrente = this.add.graphics().setDepth(19);
            this.adornos = [];
            for (var a = 0; a < 7; a++) {
                var ban = img(this, 0, 0, "banderin", 0.55).setOrigin(0.5, 0).setDepth(18.1).setTint(PECES[a % PECES.length]).setVisible(false);
                this.adornos.push(ban);
            }
            this.faroles = [];
            for (var f = 0; f < 2; f++) {
                var fl = img(this, 0, 0, "farol", 0.8).setOrigin(0.5, 0).setDepth(18.3).setVisible(false);
                fl.luz = img(this, 0, 0, "luz", 0.7).setDepth(18.35).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd43b).setVisible(false);
                this.faroles.push(fl);
            }

            // ---------------- partículas y burbujas
            this.burbujas = new Burbujas(this, 90, this.SUP);
            this.particulas = new Particulas(this, 220, 30);
            this.brillo = this.add.rectangle(W / 2, H / 2, W, H, 0xc5f6fa).setDepth(60).setAlpha(0);

            this.crearEntrada();
            this.cameras.main.setBackgroundColor("#2bb8d8");
            this.colocarBarca();
            escena = this;
            if (espera) { var e = espera; espera = null; e(true); }
        }

        // ------------------------------------------------------------------ entrada (un toque = un descenso)

        crearEntrada() {
            var self = this;
            this.input.on("pointerdown", function (p) {
                self.scale.updateBounds();
                self.tocar(p ? p.worldX : null);
            });
            var lienzo = this.game.canvas;
            if (lienzo) lienzo.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });
        }

        puedeLanzar() { return this.estado === "moviendo" && this.entradaOn && !this.pausado && !!this.nivel; }

        tocar(x) {
            if (!this.puedeLanzar()) return false;
            this.tQuieto = 0;
            if (x != null) this.ondaToque(x);
            this.pescar(false);
            return true;
        }

        ondaToque(x) {
            this.particulas.emitir(this.ganchoX, this.ganchoY + 20, { n: 6, vel: 90, vida: 500, escala: 0.25, tintes: BRILLOS });
        }

        // ------------------------------------------------------------------ nivel

        cargar(nivel, ronda) {
            this.gen++;
            this.anim.vaciar();
            this.nivel = nivel;
            this.ronda = ronda || {};
            this.tema = TEMAS[nivel.tema] ? nivel.tema : "laguna";
            this.marcador = R().crearMarcador(nivel);
            this.fase = nivel.faseInicial || 0;
            this.corrX = 0;
            this.ganchoY = this.REPOSO;
            this.angGancho = 0;
            this.ayudaOn = false;
            this.tQuieto = 0;
            this.cercaId = null;
            this.guiaAlpha = 0;
            this.hundir = 0;
            this.vaivenExtra = 0;
            this.estado = "presentacion";
            this.burbujas.apagar();
            this.particulas.apagar();
            this.limpiarEstrellas();
            this.limpiarRed();
            this.decorar(this.tema);
            var self = this;
            nivel.estrellas.forEach(function (e) { self.crearEstrella(e); });
            this.colocarBarca();
        }

        limpiarEstrellas() {
            this.estrellas.forEach(function (s) {
                [s.img, s.halo, s.sombra].forEach(function (o) { if (o) o.destroy(); });
            });
            this.estrellas = [];
        }

        limpiarRed() {
            this.enRed.forEach(function (m) { m.destroy(); });
            this.enRed = [];
        }

        crearEstrella(e) {
            var k = e.r / 80;
            var s = {
                d: e,
                estado: "libre",
                k: k,
                fase: Math.random() * 6,
                tParpadeo: azarEn(1200, 4000),
                cerrado: 0,
                brillo: 0,
                pop: 0,
                visible: 0
            };
            s.sombra = img(this, e.x, e.y + e.r * 0.72, "sombra", k * 0.95).setDepth(7).setAlpha(0);
            s.halo = img(this, e.x, e.y, "halo", k * 1.45).setDepth(6).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff3bf).setAlpha(0);
            s.img = img(this, e.x, e.y, "estrella_" + e.color, k).setDepth(8).setRotation(e.giro * Math.PI / 180).setAlpha(0);
            this.estrellas.push(s);
            return s;
        }

        /** Decoración del nivel: algas, corales, rocas y conchas en los huecos entre estrellas (nunca encima). */
        decorar(tema) {
            this.deco.forEach(function (o) { if (o.luz) o.luz.destroy(); o.destroy(); });
            this.deco = [];
            this.frente.forEach(function (o) { o.destroy(); });
            this.frente = [];
            this.peces.forEach(function (p) { p.destroy(); });
            this.peces = [];
            var T = TEMAS[tema];
            var self = this;
            var xs = this.nivel.estrellas.map(function (e) { return e.x; }).sort(function (a, b) { return a - b; });
            // huecos: entre estrellas y a los lados
            var huecos = [];
            for (var i = 0; i + 1 < xs.length; i++) huecos.push((xs[i] + xs[i + 1]) / 2);
            huecos.push(xs[0] - 110, xs[xs.length - 1] + 110, 330, 1270, 250, 1350);
            huecos = huecos.map(function (h) { return Math.max(200, Math.min(1400, h)); });
            var corales = ["coralRama", "coralAbanico", "coralTubo", "coralCerebro"];

            // capa de atrás (detrás de las estrellas): algas y corales en los huecos
            var nAlg = T.algas, nCor = T.corales;
            var orden = huecos.slice().sort(function () { return Math.random() - 0.5; });
            for (var c = 0; c < nCor; c++) {
                var hx = orden[c % orden.length] + azarEn(-14, 14);
                var key = corales[c % corales.length];
                var co = img(this, hx, 716 + azarEn(-4, 6), key, azarEn(0.42, 0.6)).setOrigin(0.5, 1).setDepth(4.5).setTint(elegir(CORALES));
                co.luz = img(this, hx, 676, "luz", 1.6).setDepth(4.45).setBlendMode(Phaser.BlendModes.ADD).setTint(co.tintTopLeft || 0xffffff).setAlpha(0);
                co.fase = Math.random() * 6;
                co.tipo = "coral";
                this.deco.push(co);
            }
            for (var a = 0; a < nAlg; a++) {
                var ax = a < huecos.length ? huecos[(a * 3 + 1) % huecos.length] + azarEn(-30, 30) : azarEn(220, 1380);
                var al = img(this, ax, 714 + azarEn(-4, 6), Math.random() < 0.7 ? "alga" : "algaFina", azarEn(0.65, 0.95)).setOrigin(0.5, 1).setDepth(4.4);
                if (al.texture.key === "algaFina") al.setTint(elegir([0x8ce99a, 0x63e6be, 0xb2f2bb])).setAlpha(0.9);
                al.fase = Math.random() * 6;
                al.vel = azarEn(0.7, 1.2);
                al.impulso = 0;
                al.tipo = "alga";
                this.deco.push(al);
            }
            [[260, 0.7], [1340, 0.75]].forEach(function (q, k) {
                var ro = img(self, q[0] + azarEn(-30, 30), 740, "roca", q[1]).setOrigin(0.5, 1).setDepth(4.3).setFlipX(k === 1);
                ro.tipo = "roca";
                self.deco.push(ro);
            });

            // sobre la arena (debajo de las estrellas): conchas, caracoles y piedritas
            for (var k2 = 0; k2 < 9; k2++) {
                var px = azarEn(220, 1380);
                var cerca = xs.some(function (x) { return Math.abs(x - px) < 80; });
                var py = cerca ? azarEn(866, 890) : azarEn(820, 885);
                var tipo = elegir(["concha", "caracol", "piedra", "concha"]);
                var co2 = img(this, px, py, tipo, azarEn(0.32, 0.5)).setDepth(5).setRotation(azarEn(-0.4, 0.4));
                if (tipo !== "piedra") co2.setTint(elegir([0xffc9de, 0xffe8cc, 0xfff3bf, 0xe5dbff, 0xffffff]));
                co2.tipo = "suelo";
                this.deco.push(co2);
            }
            if (T.cofre) {
                // detrás de las estrellas, en un hueco del centro (a los lados lo taparían Zoe o Zeus)
                var cx = xs.length > 1 ? (xs[Math.floor(xs.length / 2) - 1] + xs[Math.floor(xs.length / 2)]) / 2 : 1000;
                var cof = img(this, cx, 726, "cofre", 0.5).setOrigin(0.5, 1).setDepth(4.6);
                cof.luz = img(this, cx, 680, "luz", 2).setDepth(4.55).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd43b).setAlpha(0.3);
                cof.tipo = "cofre";
                cof.fase = 0;
                this.deco.push(cof);
            }
            for (var m = 0; m < T.medusas; m++) {
                var me = img(this, azarEn(300, 1300), azarEn(380, 560), "medusa", azarEn(0.45, 0.65)).setDepth(2.6).setBlendMode(Phaser.BlendModes.ADD).setTint(elegir([0xff8cc6, 0xb197fc, 0x66d9e8])).setAlpha(0.55);
                me.fase = Math.random() * 6;
                me.y0 = me.y;
                me.tipo = "medusa";
                this.deco.push(me);
            }

            // capa de delante: solo en los bordes (no tapan estrellas)
            [[150, 900, "alga", 1.15], [70, 900, "coralRama", 0.7], [1450, 900, "alga", 1.1], [1540, 900, "coralAbanico", 0.65]].forEach(function (q) {
                var fr = img(self, q[0] + azarEn(-20, 20), q[1], q[2], q[3]).setOrigin(0.5, 1).setDepth(25);
                if (q[2] !== "alga") fr.setTint(elegir(CORALES));
                fr.fase = Math.random() * 6;
                fr.vel = azarEn(0.6, 1);
                fr.impulso = 0;
                fr.tipo = q[2] === "alga" ? "alga" : "coral";
                self.frente.push(fr);
            });

            // peces de colores
            for (var p = 0; p < T.peces; p++) {
                var pz = img(this, azarEn(0, W), azarEn(380, 650), "pez", azarEn(0.38, 0.6)).setDepth(9).setTint(PECES[p % PECES.length]);
                pz.vel = azarEn(35, 70) * (Math.random() < 0.5 ? -1 : 1);
                pz.setFlipX(pz.vel > 0);
                pz.y0 = pz.y;
                pz.fase = Math.random() * 6;
                pz.salto = 0;
                pz.giro = 0;
                pz.rodea = 0;
                this.peces.push(pz);
            }

            // agua y barca del nivel
            this.tinteAgua.setFillStyle(T.tinte).setAlpha(T.tAlfa);
            this.rayos.forEach(function (ry) { ry.a0 = T.rayos * azarEn(0.6, 1); });
            this.adornos.forEach(function (b) { b.setVisible(T.adornos); });
            this.faroles.forEach(function (fl) { fl.setVisible(T.adornos); fl.luz.setVisible(T.adornos); });
        }

        // ------------------------------------------------------------------ presentación y demostración

        presentar() {
            var self = this, gen = this.gen;
            this.ganchoY = -60;
            this.estrellas.forEach(function (s, i) { s.visible = 0; s.retraso = 200 + i * 170; });
            sonar("burbujas");
            var p1 = this.anim.agregar(900, function (u) { self.ganchoY = lerp(-60, self.REPOSO, rebote(u)); });
            var p2 = this.anim.agregar(250 + this.estrellas.length * 170 + 600, function (u) {
                var t = u * (250 + self.estrellas.length * 170 + 600);
                self.estrellas.forEach(function (s) {
                    var v = Math.max(0, Math.min(1, (t - s.retraso) / 520));
                    if (v > 0 && s.visible === 0) {
                        self.burbujas.soltar(self.xEstrella(s), s.d.y, { n: 4, dispersion: 40, escala: 0.25 });
                        sonar("aparece");
                    }
                    s.visible = v > 0 ? rebote(v) : 0;
                });
            });
            return Promise.all([p1, p2]).then(function () {
                if (gen !== self.gen) return;
                self.estrellas.forEach(function (s) { s.visible = 1; });
                self.ganchoY = self.REPOSO;
                if (self.estado === "presentacion") self.estado = "espera";
            });
        }

        /**
         * Demostración (no cuenta): la mano espera sobre el agua; cuando el gancho pasa sobre una estrella, toca y la
         * cuerda baja y la pesca. El flujo vuelve a cargar el nivel después.
         */
        demo(mover) {
            var self = this, gen = this.gen;
            if (!this.nivel) return Promise.resolve();
            this.estado = "espera";
            // la estrella hacia la que va el gancho
            var dir = R().velocidadGancho(this.nivel, this.fase) >= 0 ? 1 : -1;
            var lista = this.nivel.estrellas.slice().sort(function (a, b) { return a.x - b.x; });
            var meta = null;
            for (var i = 0; i < lista.length && !meta; i++) {
                var e = dir > 0 ? lista[i] : lista[lista.length - 1 - i];
                if ((R().posicionEstrella(e, this.tE) - this.ganchoX) * dir > 60) meta = e;
            }
            if (!meta) meta = dir > 0 ? lista[lista.length - 1] : lista[0];
            var punto = { x: meta.x, y: 560 };
            mover(punto.x, punto.y, "aparece");
            return new Promise(function (resolve) {
                var t0 = Date.now();
                var vigia = setInterval(function () {
                    if (gen !== self.gen) { clearInterval(vigia); resolve(); return; }
                    if (self.pausado) return;
                    var listo = Math.abs(self.ganchoX - R().posicionEstrella(meta, self.tE)) < 8;
                    if (!listo && Date.now() - t0 > 14000) listo = true;
                    if (!listo) return;
                    clearInterval(vigia);
                    mover(punto.x, punto.y, "presiona");
                    self.estado = "moviendo";
                    self.pescar(true).then(resolve, resolve);
                    setTimeout(function () { mover(punto.x, punto.y, "suelta"); }, 260);
                }, 30);
            });
        }

        iniciarRonda() {
            this.estado = "moviendo";
            this.tQuieto = 0;
        }

        // ------------------------------------------------------------------ la pesca

        /** Secuencia completa de un intento. demo: no avisa al flujo de aciertos ni fallos. */
        async pescar(demo) {
            if (this.estado !== "moviendo" || !this.nivel) return;
            var self = this, gen = this.gen, nv = this.nivel, mk = this.marcador;
            var vivo = function () { return gen === self.gen; };
            this.estado = "detenido";
            this.velGancho = 0;
            avisar("lanza", { demo: demo });
            sonar("polea");
            var x0 = this.ganchoX;
            var res = R().evaluarCaptura(x0, nv, mk.capturadas, this.ayudaOn ? 6 : 0, this.tE);
            var star = res.estrella ? this.estrellaDe(res.estrella.id) : null;
            await esperar(this.anim, 240);
            if (!vivo()) return;

            // ---- baja la cuerda (corrección amable hacia la estrella si la va a atrapar)
            this.estado = "bajando";
            sonar("baja");
            var corr = star ? R().correccion(res.dx, nv) : 0;
            var y0 = this.ganchoY;
            var y1 = star ? star.d.y - star.d.r * 0.5 - GANCHO_AGARRE : nv.sueloY - GANCHO_AGARRE + 30;
            var tb = 0;
            await this.anim.agregar(nv.bajadaMs, function (u) {
                var e = suave(u);
                self.ganchoY = lerp(y0, y1, e);
                self.corrX = corr * saleSuave(Math.min(1, u * 1.4));
                tb += 1;
                if (tb % 7 === 0) self.burbujas.soltar(self.ganchoX, self.ganchoY + 40, { n: 1, escala: 0.2, vel: 60 });
                if (self.ganchoY > 560) self.empujarAlgas(self.ganchoX, 0.4);
            });
            if (!vivo()) return;

            // ---- comprueba
            this.estado = "comprobando";
            await esperar(this.anim, 120);
            if (!vivo()) return;

            if (star && star.estado === "libre") {
                this.estado = "atrapada";
                R().registrar(mk, "captura", star.d);
                this.capturar(star);
                if (!demo) avisar("atrapa", { id: star.d.id, color: star.d.color, hechas: mk.hechas, total: mk.total });
                else sonar("atrapa");
                await esperar(this.anim, 520);
                if (!vivo()) return;
            } else {
                star = null;
                this.estado = "fallo";
                R().registrar(mk, "fallo");
                this.fondoVacio();
                if (!demo) avisar("fallo", { seguidos: mk.fallosSeguidos, dx: res.dx });
                if (!demo && mk.fallosSeguidos >= num(jcfg().fallosParaAyuda, 2) && this.ayudaAuto) this.ayudaVisual();
                await esperar(this.anim, 380);
                if (!vivo()) return;
            }

            // ---- sube la cuerda (con la estrella colgando si la atrapó)
            this.estado = "subiendo";
            sonar("sube");
            var ya = this.ganchoY;
            var yb = star ? this.SUP - 60 : this.REPOSO;
            var c0 = this.corrX;
            var ts = 0;
            await this.anim.agregar(nv.subidaMs * (star ? 1.15 : 1), function (u) {
                var e = suave(u);
                self.ganchoY = lerp(ya, yb, e);
                self.corrX = lerp(c0, 0, saleSuave(u));
                ts += 1;
                if (ts % 5 === 0) self.burbujas.soltar(self.ganchoX + azarEn(-20, 20), self.ganchoY + (star ? 200 : 60), { n: 1, escala: 0.22, vel: 80 });
            });
            if (!vivo()) return;

            if (star) {
                // ---- la estrella salta a la red de la barca
                this.estado = "depositando";
                await this.depositar(star, demo);
                if (!vivo()) return;
                var yr = this.ganchoY;
                await this.anim.agregar(520, function (u) { self.ganchoY = lerp(yr, self.REPOSO, suave(u)); });
                if (!vivo()) return;
            }

            this.estado = "esperaSiguiente";
            await esperar(this.anim, num(jcfg().pausaEntreIntentosMs, 350));
            if (!vivo()) return;
            if (mk.completo && !demo) {
                this.estado = "completo";
                avisar("nivelCompleto", { total: mk.total });
                return;
            }
            this.estado = "moviendo";
            this.tQuieto = 0;
        }

        /** x actual de una estrella (se mece un poquito en los niveles 3 y 4). */
        xEstrella(s) { return R().posicionEstrella(s.d, this.tE); }

        estrellaDe(id) {
            for (var i = 0; i < this.estrellas.length; i++) if (this.estrellas[i].d.id === id) return this.estrellas[i];
            return null;
        }

        /** El gancho atrapa la estrella: sorpresa, burbujas, chispas, peces que celebran y corales que brillan. */
        capturar(s) {
            s.estado = "atrapada";
            s.img.setTexture("estrella_" + s.d.color + "_s");
            s.pop = 1;
            s.halo.setAlpha(0);
            // la estrella queda donde estaba y se acomoda bajo el gancho mientras sube (sin saltos)
            s.offX = this.xEstrella(s) - (this.ganchoX - 8 - Math.sin(this.gancho.rotation) * GANCHO_AGARRE);
            var x = this.xEstrella(s), y = s.d.y;
            sonar("chapoteo");
            this.burbujas.soltar(x, y, { n: 14, dispersion: 90, escala: 0.32, vel: 110, vx: 30 });
            this.particulas.emitir(x, y, { n: 18, vel: 260, vida: 800, escala: 0.4, tintes: BRILLOS.concat([0xffd43b]) });
            this.brilloCorales = 1;
            this.hundir = 7;
            this.vaivenExtra = 0.05;
            this.empujarAlgas(x, 1);
            this.peces.forEach(function (p) {
                if (Math.abs(p.x - x) < 420) { p.salto = 1; p.giro = 1; }
            });
        }

        /** Fallo: el gancho toca la arena; nubecita de arena y burbujas, sin castigo. */
        fondoVacio() {
            var x = this.ganchoX, y = this.ganchoY + GANCHO_AGARRE;
            sonar("arena");
            this.burbujas.soltar(x, y - 10, { n: 6, dispersion: 40, escala: 0.25, vel: 70 });
            this.particulas.emitir(x, y + 10, { n: 10, tipos: ["luz"], vel: 70, vida: 900, escala: 0.25, normal: true, tintes: [0xfbe6b4, 0xf4dba0], alpha: 0.7, angulo: -Math.PI / 2, apertura: 2.4, sinGiro: true, encoge: -0.6 });
        }

        /** La estrella deja el gancho, hace un arco hasta la red, se encoge y queda dentro con un saltito. */
        depositar(s, demo) {
            var self = this;
            var hueco = HUECOS_RED[this.enRed.length % HUECOS_RED.length];
            var x0 = s.img.x, y0 = s.img.y;
            var k0 = s.img.scaleX;
            var kFin = 0.5 / D().res("mini_" + s.d.color);
            s.estado = "volando";
            sonar("salto");
            return this.anim.agregar(780, function (u) {
                var dest = self.puntoRed(hueco[0], hueco[1]);
                var e = suave(u);
                s.img.x = lerp(x0, dest.x, e);
                s.img.y = lerp(y0, dest.y, e) - Math.sin(u * Math.PI) * 140;
                s.img.rotation += 0.12;
                s.img.setScale(lerp(k0, s.k / D().res("estrella_" + s.d.color) * 0.55, e));
            }).then(function () {
                s.estado = "red";
                s.img.setVisible(false);
                s.sombra.setVisible(false);
                var mini = img(self, 0, 0, "mini_" + s.d.color, 0.68).setDepth(19.4);
                mini.hueco = hueco;
                mini.salto = 1;
                mini.giro = azarEn(-0.4, 0.4);
                self.enRed.push(mini);
                self.brilloRed = 1;
                self.vaivenExtra = 0.07;
                self.hundir = 5;
                var p = self.puntoRed(0, 10);
                sonar("chapoteo");
                sonar("red");
                self.particulas.emitir(p.x, self.SUP, { n: 14, tipos: ["burbuja"], vel: 260, vida: 700, escala: 0.22, normal: true, angulo: -Math.PI / 2, apertura: 1.6, grav: 600, alpha: 0.9 });
                self.particulas.emitir(p.x, p.y + 50, { n: 12, vel: 200, vida: 700, escala: 0.35, tintes: BRILLOS });
                if (!demo) avisar("deposita", { id: s.d.id, color: s.d.color, hechas: self.marcador.hechas, total: self.marcador.total });
                void kFin;
            });
        }

        // ------------------------------------------------------------------ ayudas

        ayudaVisual() {
            if (!this.ayudaAuto) return;
            this.ayudaOn = true;
            this.cercaDesde = this.t;
        }

        empujarAlgas(x, fuerza) {
            this.deco.concat(this.frente).forEach(function (o) {
                if (o.tipo === "alga" && Math.abs(o.x - x) < 260) o.impulso = Math.max(o.impulso, fuerza * (1 - Math.abs(o.x - x) / 260));
            });
        }

        // ------------------------------------------------------------------ celebraciones y transiciones

        celebrarNivel(grande) {
            var self = this;
            this.brilloRed = 1;
            this.brilloCorales = 1;
            this.vaivenExtra = 0.08;
            this.peces.forEach(function (p, i) { p.rodea = grande ? 3200 : 2400; p.angRodea = i * Math.PI * 2 / self.peces.length; });
            var b = this.puntoRed(0, 0);
            for (var i = 0; i < 4; i++) {
                setTimeout(function () {
                    if (!escena) return;
                    self.particulas.emitir(b.x + azarEn(-120, 220), self.SUP + azarEn(-40, 40), { n: 16, vel: 260, vida: 900, escala: 0.45, tintes: BRILLOS.concat([0xffd43b, 0xff8cc6]) });
                    self.burbujas.soltar(azarEn(300, 1300), 880, { n: 6, dispersion: 120, escala: 0.35, vel: 160 });
                    sonar("burbujas");
                }, i * 420);
            }
            return esperar(this.anim, grande ? 3000 : 2400);
        }

        fiesta(on) { this.fiestaOn = !!on; }

        /** Ola de burbujas que cubre la pantalla (al empezar y entre niveles). */
        transicionAgua() {
            var self = this;
            sonar("transicion");
            for (var i = 0; i < 26; i++) this.burbujas.soltar(azarEn(150, 1450), azarEn(860, 940), { n: 2, dispersion: 60, escala: azarEn(0.4, 0.8), vel: 420 });
            return this.anim.agregar(900, function (u) {
                self.brillo.setAlpha(Math.sin(u * Math.PI) * 0.45);
            });
        }

        salida() {
            var self = this;
            this.estado = "completo";
            return this.transicionAgua().then(function () {
                self.estrellas.forEach(function (s) { s.img.setVisible(false); s.halo.setAlpha(0); });
            });
        }

        // ------------------------------------------------------------------ geometría de la barca

        /** Punto local de la barca (origen en la línea de flotación) → mundo. */
        aMundoBarca(lx, ly) {
            var b = this.barca, c = Math.cos(b.rotation), s = Math.sin(b.rotation);
            return { x: b.x + lx * c - ly * s, y: b.y + lx * s + ly * c };
        }

        /** Punto dentro de la red (coordenadas de su textura, desde el aro). */
        puntoRed(dx, dy) {
            return this.aMundoBarca(RED_LOCAL.x + dx * RED_ESC, RED_LOCAL.y + 8 + dy * RED_ESC);
        }

        colocarBarca() {
            var nv = this.nivel;
            var baseX = nv ? R().posicionGancho(nv, this.fase) : 800;
            this.ganchoX = baseX + this.corrX;
            var t = this.t;
            this.barca.x = baseX - this.OFF;
            this.barca.y = this.SUP + Math.sin(t / 900) * 4 + this.hundir;
            this.barca.rotation = Math.sin(t / 1300) * 0.022 + Math.sin(t / 260) * this.vaivenExtra;
            var pl = this.aMundoBarca(POLEA_LOCAL.x, POLEA_LOCAL.y);
            this.polea.setPosition(pl.x, pl.y);
            this.poleaPunto = pl;
            var rr = this.aMundoBarca(RED_LOCAL.x, RED_LOCAL.y);
            this.red.setPosition(rr.x, rr.y).setRotation(this.barca.rotation + Math.sin(t / 700) * 0.03);
            var rl = this.puntoRed(0, 60);
            this.redLuz.setPosition(rl.x, rl.y);
            this.barcaLuz.setPosition(this.barca.x, this.barca.y - 60);
            var self = this;
            this.enRed.forEach(function (m) {
                var p = self.puntoRed(m.hueco[0], m.hueco[1]);
                m.setPosition(p.x, p.y - Math.sin(m.salto * Math.PI) * 26).setRotation(m.giro + Math.sin(t / 600 + m.hueco[0]) * 0.06);
            });
            // banderines del mástil a la proa y a la popa; faroles en la cabina
            var tope = this.aMundoBarca(40, -186), proa = this.aMundoBarca(140, -44), popa = this.aMundoBarca(-138, -40);
            this.adornos.forEach(function (b, i) {
                var u = (i + 1) / (self.adornos.length + 1);
                var a = u < 0.5 ? popa : proa, w = u < 0.5 ? u * 2 : (u - 0.5) * 2;
                var p0 = u < 0.5 ? popa : tope, p1 = u < 0.5 ? tope : proa;
                void a;
                var x = lerp(p0.x, p1.x, w), y = lerp(p0.y, p1.y, w) + Math.sin(w * Math.PI) * 18;
                b.setPosition(x, y).setRotation(self.barca.rotation + Math.sin(t / 300 + i) * 0.15);
            });
            var fpos = [this.aMundoBarca(-92, -98), this.aMundoBarca(4, -98)];
            this.faroles.forEach(function (fl, i) {
                fl.setPosition(fpos[i].x, fpos[i].y).setRotation(Math.sin(t / 500 + i) * 0.12);
                fl.luz.setPosition(fpos[i].x, fpos[i].y + 18).setAlpha(0.45 + Math.sin(t / 220 + i * 2) * 0.15);
            });
        }

        // ------------------------------------------------------------------ dibujo por cuadro

        dibujarCuerda() {
            var g = this.gCuerda;
            g.clear();
            var p = this.poleaPunto || { x: this.ganchoX, y: 20 };
            var x1 = this.ganchoX, y1 = this.ganchoY - 6;
            if (y1 < p.y) return;
            g.lineStyle(7, 0x6b3408, 1);
            g.beginPath(); g.moveTo(p.x + 10, p.y); g.lineTo(x1, y1); g.strokePath();
            g.lineStyle(3, 0xf4d58d, 1);
            g.beginPath(); g.moveTo(p.x + 10, p.y); g.lineTo(x1, y1); g.strokePath();
            // nudos de la cuerda que corren al bajar/subir
            var largo = y1 - p.y;
            var paso = 26, off = (this.ganchoY * 1.0) % paso;
            g.fillStyle(0xc99a52, 1);
            for (var d = off; d < largo; d += paso) {
                var u = d / largo;
                g.fillCircle(lerp(p.x + 10, x1, u), lerp(p.y, y1, u), 2.4);
            }
            // cabo del mástil a la polea (detalle)
            var m = this.cuerdaMastil;
            m.clear();
            var tope = this.aMundoBarca(40, -150);
            m.lineStyle(3, 0x6b3408, 0.8);
            m.beginPath(); m.moveTo(tope.x, tope.y); m.lineTo(p.x, p.y + 6); m.strokePath();
        }

        dibujarSuperficie() {
            var g = this.gSuperficie, t = this.t, sup = this.SUP;
            g.clear();
            var ola = function (x) { return sup + Math.sin(x / 90 + t / 700) * 5 + Math.sin(x / 37 - t / 430) * 2; };
            // franja clara de la superficie
            g.fillStyle(0xbff6ff, 0.55);
            g.beginPath();
            g.moveTo(0, ola(0));
            for (var x = 0; x <= W; x += 20) g.lineTo(x, ola(x));
            g.lineTo(W, sup + 22);
            for (var x2 = W; x2 >= 0; x2 -= 40) g.lineTo(x2, sup + 18 + Math.sin(x2 / 60 + t / 500) * 3);
            g.closePath();
            g.fillPath();
            // cresta blanca
            g.lineStyle(4, 0xffffff, 0.9);
            g.beginPath();
            g.moveTo(0, ola(0));
            for (var x3 = 0; x3 <= W; x3 += 20) g.lineTo(x3, ola(x3));
            g.strokePath();
            // agua por delante de la parte sumergida de la barca y la red
            var a = this.aguaFrente;
            a.clear();
            a.fillStyle(0x3cc6e0, 0.22);
            var bx = this.barca.x;
            a.beginPath();
            a.moveTo(bx - 230, ola(bx - 230) + 4);
            for (var x4 = bx - 230; x4 <= bx + 170; x4 += 20) a.lineTo(x4, ola(x4) + 4);
            a.lineTo(bx + 170, sup + 160);
            a.lineTo(bx - 230, sup + 160);
            a.closePath();
            a.fillPath();
            // ondas alrededor del casco
            a.lineStyle(3, 0xffffff, 0.6);
            for (var k = 0; k < 2; k++) {
                var r = 140 + ((t / 12 + k * 40) % 80);
                a.strokeEllipse(bx, sup + 4, r * 2, 14);
            }
        }

        dibujarGuia(dt) {
            var g = this.gGuia;
            g.clear();
            var nv = this.nivel;
            if (!nv) return;
            var activa = this.estado === "moviendo" || this.estado === "espera" || this.estado === "detenido";
            var cerca = activa ? R().cercana(this.ganchoX, nv, this.marcador.capturadas, 1, this.tE) : null;
            var id = cerca ? cerca.id : null;
            if (id !== this.cercaId) {
                this.cercaId = id;
                this.cercaDesde = this.t;
                if (id && this.estado === "moviendo") avisar("cerca", { id: id });
            }
            var modo = this.ayudaOn ? "persistente" : nv.guia;
            if (!this.ayudaAuto && modo !== "persistente") modo = nv.guia;
            var meta = 0;
            if (activa) {
                if (modo === "persistente") meta = cerca ? 0.95 : 0.22;
                else if (modo === "intermitente") meta = cerca ? 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(this.t / 160)) : 0;
                else if (modo === "breve") meta = cerca ? (this.t - this.cercaDesde < 1000 ? 0.85 : 0.12) : 0;
                else meta = 0; // contextual: solo con ayuda
            }
            this.guiaAlpha += (meta - this.guiaAlpha) * Math.min(1, dt / 140);
            // halo de la estrella cercana
            var self = this;
            this.estrellas.forEach(function (s) {
                var obj = (s.estado === "libre" && cerca && s.d.id === cerca.id) ? Math.max(0.25, self.guiaAlpha) : 0;
                s.brillo += (obj - s.brillo) * Math.min(1, dt / 150);
            });
            if (this.guiaAlpha < 0.02) return;
            var x = this.ganchoX, y0 = this.ganchoY + GANCHO_AGARRE + 20, y1 = nv.sueloY - 40;
            this.guiaOffset = (this.guiaOffset + dt * 0.05) % 28;
            var color = cerca ? 0xfff3a6 : 0xc5f6fa;
            g.lineStyle(6, color, this.guiaAlpha);
            for (var y = y0 + this.guiaOffset; y < y1; y += 28) {
                g.beginPath();
                g.moveTo(x, y);
                g.lineTo(x, Math.min(y1, y + 14));
                g.strokePath();
            }
            if (cerca && this.guiaAlpha > 0.5 && Math.random() < dt / 120) {
                this.particulas.emitir(x, azarEn(y0, y1), { n: 1, vel: 20, vida: 600, escala: 0.25, tintes: [0xfff3a6, 0xffffff] });
            }
        }

        update(time, delta) {
            var dt = Math.min(50, delta || 16);
            if (this.pausado) return;
            this.t += dt;
            this.tE += dt;
            var t = this.t;
            this.anim.update(dt);

            // ---- gancho: se mueve de lado a lado solo cuando no está pescando
            var nv = this.nivel;
            var mueve = nv && (this.estado === "moviendo" || this.estado === "espera" || this.estado === "presentacion" || this.estado === "esperaSiguiente");
            var xAntes = this.ganchoX;
            if (mueve) this.fase = R().avanzarFase(nv, this.fase, dt);
            this.hundir *= 0.96;
            this.vaivenExtra *= 0.985;
            this.colocarBarca();
            var dx = this.ganchoX - xAntes;
            this.velGancho = dx / (dt / 1000);
            var angMeta = mueve ? Math.max(-0.22, Math.min(0.22, -this.velGancho * 0.0009)) : 0;
            this.angGancho += (angMeta - this.angGancho) * Math.min(1, dt / 220);
            var balanceo = Math.sin(t / 650) * 0.03;
            this.gancho.setPosition(this.ganchoX, this.ganchoY).setRotation(this.angGancho + balanceo);
            this.ganchoLuz.setPosition(this.ganchoX - 10, this.ganchoY + 90).setAlpha(0.28 + Math.sin(t / 300) * 0.1);
            // la polea gira con el movimiento y con la cuerda
            this.giroPolea += dx * 0.03 + (this.ganchoY - (this.yAntes || this.ganchoY)) * 0.05;
            this.yAntes = this.ganchoY;
            this.polea.setRotation(this.giroPolea);
            // reflejo metálico y destellos del gancho
            this.tDestello -= dt;
            if (this.tDestello <= 0) {
                this.tDestello = azarEn(1100, 1900);
                this.reflejoT = 0;
                if (mueve && !reducido) this.particulas.emitir(this.ganchoX - 18, this.ganchoY + 110, { n: 2, vel: 40, vida: 500, escala: 0.22, tintes: [0xfff3a6, 0xffffff] });
            }
            if (this.reflejoT != null) {
                this.reflejoT += dt;
                var ur = this.reflejoT / 420;
                this.reflejo.setPosition(this.ganchoX + 2, this.ganchoY + lerp(30, 100, ur)).setAlpha(ur < 1 ? Math.sin(ur * Math.PI) : 0).setRotation(ur * 2);
                if (ur >= 1) this.reflejoT = null;
            }

            this.dibujarCuerda();
            this.dibujarSuperficie();
            this.dibujarGuia(dt);

            // ---- estrellas: latido, parpadeo, brillo, y la atrapada cuelga del gancho
            var self = this;
            this.estrellas.forEach(function (s) {
                var base = s.k / D().res("estrella_" + s.d.color);
                if (s.estado === "libre") {
                    s.tParpadeo -= dt;
                    if (s.tParpadeo <= 0 && s.cerrado <= 0) { s.cerrado = 150; s.tParpadeo = azarEn(2200, 5200); }
                    if (s.cerrado > 0) { s.cerrado -= dt; s.img.setTexture("estrella_" + s.d.color + (s.cerrado > 0 ? "_c" : "")); }
                    var late = 1 + Math.sin(t / 520 + s.fase) * 0.035 + s.brillo * 0.08;
                    s.img.setScale(base * late * s.visible);
                    s.img.setAlpha(Math.min(1, s.visible * 1.5));
                    s.img.setRotation(s.d.giro * Math.PI / 180 + Math.sin(t / 700 + s.fase) * 0.05);
                    var ex = self.xEstrella(s);
                    var ey = s.d.y + (s.d.deriva ? Math.sin(self.tE / 700 + s.fase) * 3 : 0);
                    s.img.setPosition(ex, ey);
                    s.halo.setPosition(ex, ey);
                    s.sombra.setPosition(ex, s.d.y + s.d.r * 0.72);
                    s.sombra.setAlpha(0.8 * Math.min(1, s.visible));
                    s.halo.setAlpha(s.brillo * (0.8 + Math.sin(t / 140) * 0.2)).setScale(s.halo.base * (1 + s.brillo * 0.15));
                    if (!reducido && Math.random() < dt / 4200) self.burbujas.soltar(self.xEstrella(s) + azarEn(-20, 20), s.d.y - 20, { n: 1, escala: 0.15, vel: 50 });
                } else if (s.estado === "atrapada") {
                    s.pop = Math.max(0, s.pop - dt / 500);
                    var ang = self.gancho.rotation;
                    var ax = self.ganchoX - 8 - Math.sin(ang) * GANCHO_AGARRE, ay = self.ganchoY + Math.cos(ang) * GANCHO_AGARRE;
                    s.offX = (s.offX || 0) * Math.max(0, 1 - dt / 450);
                    s.img.setPosition(ax + s.offX, ay + s.d.r * 0.55).setScale(base * (1 + Math.sin(s.pop * Math.PI) * 0.25)).setRotation(Math.sin(t / 200) * 0.12);
                    s.sombra.setAlpha(Math.max(0, s.sombra.alpha - dt / 300));
                    if (s.pop <= 0 && s.img.texture.key !== "estrella_" + s.d.color) s.img.setTexture("estrella_" + s.d.color);
                }
            });
            this.enRed.forEach(function (m) { m.salto = Math.max(0, m.salto - dt / 520); });

            // ---- ambiente: nubes, rayos, destellos, siluetas, peces, algas, corales, medusas
            this.nubes.forEach(function (n) {
                n.x += n.vel * dt / 1000;
                if (n.x > W + 160) n.x = -160;
            });
            var T = TEMAS[this.tema];
            this.rayos.forEach(function (ry) {
                ry.setAlpha((ry.a0 || 0.5) * (0.55 + 0.45 * Math.sin(t / 1600 * ry.vel + ry.fase)));
                ry.setRotation(ry.rot0 + Math.sin(t / 3000 + ry.fase) * 0.03);
            });
            this.destellos.forEach(function (d) {
                d.x += d.vel * dt / 1000;
                if (d.x > W + 20) d.x = -20;
                if (d.x < -20) d.x = W + 20;
                d.y = self.SUP + Math.sin(d.x / 90 + t / 700) * 5 + 6;
                d.setAlpha(0.3 + 0.7 * Math.max(0, Math.sin(t / 260 + d.fase)));
            });
            this.siluetas.forEach(function (si) {
                si.x += si.vel * dt / 1000;
                if (si.x > W + 100) si.x = -100;
                if (si.x < -100) si.x = W + 100;
            });
            var b = this.barca;
            this.peces.forEach(function (p) {
                if (p.rodea > 0) {
                    // celebración: nadan en círculo alrededor de la barca
                    p.rodea -= dt;
                    p.angRodea += dt / 600;
                    var tx = b.x + Math.cos(p.angRodea) * 260, ty = self.SUP + 130 + Math.sin(p.angRodea) * 60;
                    p.x += (tx - p.x) * Math.min(1, dt / 300);
                    p.y += (ty - p.y) * Math.min(1, dt / 300);
                    p.setFlipX(Math.sin(p.angRodea) < 0);
                    if (p.rodea <= 0) p.y0 = Math.max(380, Math.min(650, p.y + 200));
                } else {
                    p.x += p.vel * dt / 1000;
                    if (p.x > W + 80) p.x = -80;
                    if (p.x < -80) p.x = W + 80;
                    p.salto = Math.max(0, p.salto - dt / 700);
                    p.giro = Math.max(0, p.giro - dt / 700);
                    p.y += ((p.y0 + Math.sin(t / 600 + p.fase) * 10 - Math.sin(p.salto * Math.PI) * 60) - p.y) * Math.min(1, dt / 120);
                    p.setFlipX(p.vel > 0);
                }
                p.setRotation(p.giro > 0 ? (1 - p.giro) * Math.PI * 2 : Math.sin(t / 300 + p.fase) * 0.06);
            });
            this.brilloCorales = Math.max(0, this.brilloCorales - dt / 1600);
            this.brilloRed = Math.max(0, this.brilloRed - dt / 1200);
            this.redLuz.setAlpha(this.brilloRed * 0.9);
            this.barcaLuz.setAlpha(this.brilloRed * 0.45 + (this.fiestaOn ? 0.25 + Math.sin(t / 200) * 0.1 : 0));
            var magico = T && T.adornos;
            this.deco.concat(this.frente).forEach(function (o) {
                if (o.tipo === "alga") {
                    o.impulso *= 0.985;
                    o.setRotation(Math.sin(t / 1000 * o.vel + o.fase) * 0.07 + Math.sin(t / 180 + o.fase) * o.impulso * 0.12);
                } else if (o.tipo === "coral") {
                    o.setScale(o.base * (1 + Math.sin(t / 900 + o.fase) * 0.015));
                    if (o.luz) o.luz.setAlpha(self.brilloCorales * 0.7 + (magico ? 0.18 + Math.sin(t / 500 + o.fase) * 0.1 : 0));
                } else if (o.tipo === "medusa") {
                    o.y = o.y0 + Math.sin(t / 1400 + o.fase) * 30;
                    o.setScale(o.base * (1 + Math.sin(t / 400 + o.fase) * 0.05), o.base * (1 - Math.sin(t / 400 + o.fase) * 0.05));
                } else if (o.tipo === "cofre" && o.luz) {
                    o.luz.setAlpha(0.25 + Math.sin(t / 600) * 0.12 + self.brilloCorales * 0.4);
                    if (!reducido && Math.random() < dt / 1800) self.burbujas.soltar(o.x + azarEn(-30, 30), o.y - 60, { n: 1, escala: 0.18 });
                }
            });

            // ---- burbujas del ambiente
            this.tBurbuja -= dt;
            if (this.tBurbuja <= 0 && !reducido) {
                this.tBurbuja = (T ? T.burbujasMs : 450) * azarEn(0.6, 1.4);
                var bx = this.deco.length ? elegir(this.deco).x : azarEn(200, 1400);
                this.burbujas.soltar(bx + azarEn(-20, 20), azarEn(680, 720), { n: Math.random() < 0.3 ? 3 : 1, dispersion: 20, escala: 0.22 });
            }
            this.burbujas.update(dt, t, { x: this.ganchoX, y: this.ganchoY + 70 });
            this.particulas.update(dt);

            // ---- fiesta final: lluvia de burbujas y destellos
            if (this.fiestaOn && !reducido) {
                this.tFiesta -= dt;
                if (this.tFiesta <= 0) {
                    this.tFiesta = 140;
                    this.burbujas.soltar(azarEn(240, 1360), 900, { n: 2, dispersion: 40, escala: 0.4, vel: 150 });
                    this.particulas.emitir(azarEn(240, 1360), azarEn(260, 700), { n: 2, vel: 60, vida: 1000, escala: 0.4, tintes: BRILLOS.concat([0xff8cc6, 0xffd43b]) });
                }
            }

            // ---- ayuda por quedarse quieto
            if (this.estado === "moviendo" && this.entradaOn) {
                this.tQuieto += dt;
                if (this.tQuieto > num(jcfg().quietoParaAyudaMs, 9000)) {
                    this.tQuieto = 0;
                    if (this.ayudaAuto) {
                        this.ayudaVisual();
                        avisar("ayuda", { motivo: "quieto" });
                    }
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
            backgroundColor: "#2bb8d8",
            banner: false,
            scale: { mode: Phaser.Scale.ENVELOP, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
            input: { activePointers: 2 },
            render: { antialias: true },
            scene: [EscenaMar]
        });
        global.__escenarioPescador = juego;
        global.__pedniaPhaserGame = juego;
    }

    /** Fase en la que el gancho queda en x (yendo hacia la derecha). */
    function faseParaX(nv, x) {
        var s = Math.max(-1, Math.min(1, (x - nv.centroX) / nv.amplitud));
        return Math.asin(s);
    }

    // ------------------------------------------------------------------ API pública

    global.EscenarioPescador = {
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
        /** Habilita o bloquea los toques. */
        entrada: function (on) { if (escena) escena.entradaOn = !!on; },
        ayudaAutomatica: function (on) {
            if (!escena) return;
            escena.ayudaAuto = !!on;
            if (!on) escena.ayudaOn = false;
        },
        ayudaVisual: function () { if (escena) escena.ayudaVisual(); },
        celebrarNivel: function (grande) { return escena ? escena.celebrarNivel(grande) : Promise.resolve(); },
        transicionAgua: function () { return escena ? escena.transicionAgua() : Promise.resolve(); },
        salida: function () { return escena ? escena.salida() : Promise.resolve(); },
        fiesta: function (on) { if (escena) escena.fiesta(on); },
        pausar: function (on) {
            if (!escena) return;
            escena.pausado = !!on;
            escena.anim.pausado = !!on;
        },
        aPantalla: aPantalla,
        aMundo: aMundo,
        /** Pruebas: lleva el gancho sobre la estrella i (± dx) y toca. */
        probar: {
            alinear: function (i, dx) {
                if (!escena || !escena.nivel) return null;
                var libres = escena.estrellas.filter(function (s) { return s.estado === "libre"; });
                var s = typeof i === "number" ? libres[i] : null;
                var x = s ? escena.xEstrella(s) + (dx || 0) : (dx || 0);
                escena.fase = faseParaX(escena.nivel, x);
                escena.colocarBarca();
                return { x: escena.ganchoX, estrella: s ? s.d.id : null };
            },
            tocar: function () { return escena ? escena.tocar(null) : false; },
            tocarEn: function (i, dx) {
                global.EscenarioPescador.probar.alinear(i, dx);
                return escena ? escena.tocar(null) : false;
            },
            /** Toca varias veces seguidas (solo el primero debe lanzar). */
            rafaga: function (n) {
                var ok = 0;
                for (var k = 0; k < (n || 5); k++) if (escena && escena.tocar(null)) ok++;
                return ok;
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
                gancho: { x: Math.round(escena.ganchoX), y: Math.round(escena.ganchoY), min: escena.nivel.minX, max: escena.nivel.maxX },
                barca: { x: Math.round(escena.barca.x), y: Math.round(escena.barca.y) },
                hechas: escena.marcador.hechas,
                total: escena.marcador.total,
                fallos: escena.marcador.fallos,
                fallosSeguidos: escena.marcador.fallosSeguidos,
                completo: escena.marcador.completo,
                ayuda: escena.ayudaOn,
                guia: Math.round(escena.guiaAlpha * 100) / 100,
                cerca: escena.cercaId,
                enRed: escena.enRed.length,
                estrellas: escena.estrellas.map(function (s) { return { id: s.d.id, x: Math.round(escena.xEstrella(s)), color: s.d.color, estado: s.estado, visible: s.img.visible }; }),
                deco: escena.deco.length,
                peces: escena.peces.length
            };
        }
    };
})(typeof window !== "undefined" ? window : global);
