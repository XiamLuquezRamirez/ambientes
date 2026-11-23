/**
 * EscenarioNave — escena Phaser 4 de "El Ensamblaje de la Nave" (window.EscenarioNave).
 *
 * Dibuja el taller espacial, la bandeja de piezas (izquierda), el plano holográfico con la nave
 * del nivel (centro), los contornos de encaje y la consola de progreso; maneja el arrastre real
 * con mouse y touch. No decide aciertos: al soltar avisa con las distancias a cada contorno
 * (evento "soltar") y script.js le pregunta a ReglasNave qué hacer.
 *
 * Mundo de diseño 1600 × 900 con Scale.ENVELOP: llena la pantalla y lo jugable queda entre
 * x 212 y 1360, que cabe en 4:3 (1024 × 768) sin tocar los botones de las esquinas.
 * Cada animación que el flujo espera es una Promise con respaldo por tiempo (Animador).
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser;
    var W = 1600, H = 900;
    var ELEVA = 1.06;                         // cuánto más grande que en la nave va la pieza tomada
    var NAVE = { x: 978, y: 478 };            // centro de la nave en el plano
    var PLANO = { x: 978, y: 464 };
    var BANDEJA = { x: 382, y: 465 };
    var CONSOLA = { x: 960, y: 858 };

    /** Huecos de la bandeja según cuántas piezas tiene el nivel. */
    var HUECOS = {
        4: [{ x: 297, y: 330 }, { x: 467, y: 330 }, { x: 297, y: 590 }, { x: 467, y: 590 }],
        5: [{ x: 297, y: 268 }, { x: 467, y: 268 }, { x: 297, y: 466 }, { x: 467, y: 466 }, { x: 382, y: 664 }],
        6: [{ x: 297, y: 262 }, { x: 467, y: 262 }, { x: 297, y: 460 }, { x: 467, y: 460 }, { x: 297, y: 658 }, { x: 467, y: 658 }]
    };
    var INCLINACION = [-9, 7, 5, -6, 10, -4];   // grados: desorden controlado en la bandeja
    var COLORES = [0xff6b6b, 0xffd43b, 0x69db7c, 0x4dabf7, 0xb197fc, 0xff922b, 0x3bc9db];

    var D = function () { return global.DibujosNave; };
    var R = function () { return global.ReglasNave; };

    var juego = null, escena = null, el = null, cfg = null, espera = null;
    var cb = { tomar: null, arrastrar: null, soltar: null, cerca: null };

    function avisar(nombre, a) {
        var f = cb[nombre];
        if (typeof f === "function") {
            try { f(a); } catch (e) { console.warn("[EscenarioNave]", nombre, e); }
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
    function rad(g) { return g * Math.PI / 180; }
    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    function huecos(n) { return HUECOS[n] || HUECOS[Math.max(4, Math.min(6, n | 0))] || HUECOS[6]; }
    function jcfg() { return (cfg && cfg.juego) || {}; }
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);

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

    var EscenaNave = Phaser ? class extends Phaser.Scene {
        constructor() { super({ key: "Nave" }); }

        create() {
            var self = this;
            D().claves().forEach(function (k) { tex(self, k); });
            this.anim = new Animador();
            this.t = 0;
            this.arrastreOn = false;
            this.arrastrando = null;
            this.puntero = null;
            this.energia = 0;        // 0..1: cuánto de la nave está ensamblada (casco sólido, luces)
            this.encendida = 0;      // 0..1: nave encendida (celebración)
            this.fiesta = false;
            this.ayuda = null;
            this.nivel = null;
            this.escNave = 1;
            this.vuelo = { dx: 0, dy: 0, rot: 0, llama: 0 };
            this.radios = R().radios([{ x: 0, y: 0 }, { x: 300, y: 0 }], jcfg());

            this.add.image(W / 2, H / 2, "taller").setDepth(0);
            this.crearAmbiente();
            this.crearBandeja();
            this.crearPlano();
            this.crearMoldes();
            this.crearPiezas();
            this.crearConsola();
            this.guia = this.add.graphics().setDepth(45);
            this.particulas = new Particulas(this, 80, 60);
            this.confeti = new Particulas(this, 80, 62);

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

        // ---------------------------------------------------------------- taller

        crearAmbiente() {
            var self = this;
            // luces LED de las consolas y paneles del fondo
            var puntos = [[40, 712], [70, 712], [100, 712], [1450, 712], [1480, 712], [1510, 712], [1560, 712],
                [214, 140], [1386, 140], [92, 182], [1508, 182], [60, 600], [1540, 600]];
            this.leds = puntos.map(function (p, i) {
                var l = img(self, p[0], p[1], "chispa", 0.5).setDepth(1).setBlendMode(Phaser.BlendModes.ADD).setTint(COLORES[i % COLORES.length]);
                l.fase = Math.random() * 6;
                l.vel = 1.5 + Math.random() * 3;
                return l;
            });
            // pantallas de las consolas que titilan
            this.pantallas = [[95, 721], [1505, 721]].map(function (p) {
                return img(self, p[0], p[1], "luz", 0.75).setDepth(1).setBlendMode(Phaser.BlendModes.ADD).setTint(0x3bdcff).setAlpha(0.2);
            });
            // motas de luz del holograma que suben despacio
            this.motas = [];
            for (var i = 0; i < 18; i++) {
                var m = img(this, 0, 0, "chispa", 0.28 + Math.random() * 0.2).setDepth(5).setBlendMode(Phaser.BlendModes.ADD).setTint(i % 4 ? 0x7ff3ff : 0xffffff);
                this.reiniciarMota(m, true);
                this.motas.push(m);
            }
            // haz del proyector bajo el plano
            this.haz = img(this, PLANO.x, 840, "luz", 2.4).setDepth(1).setBlendMode(Phaser.BlendModes.ADD).setTint(0x3bdcff).setAlpha(0.18);
            this.haz.setScale(this.haz.base * 1.4, this.haz.base * 0.35);
        }

        reiniciarMota(m, inicio) {
            m.x = PLANO.x - 340 + Math.random() * 680;
            m.y = inicio ? 140 + Math.random() * 640 : 790;
            m.vy = -(14 + Math.random() * 22);
            m.fase = Math.random() * 6;
        }

        animarAmbiente(dt, ts) {
            var self = this;
            this.leds.forEach(function (l) { l.setAlpha(0.25 + 0.75 * Math.max(0, Math.sin(ts * l.vel + l.fase))); });
            this.pantallas.forEach(function (p, i) { p.setAlpha(0.14 + 0.08 * Math.sin(ts * 7 + i * 2) + (Math.random() < 0.02 ? 0.12 : 0)); });
            var s = dt / 1000;
            this.motas.forEach(function (m) {
                m.y += m.vy * s;
                m.x += Math.sin(ts * 1.3 + m.fase) * 8 * s;
                m.setAlpha(0.2 + 0.5 * Math.max(0, Math.sin(ts * 2 + m.fase)));
                if (m.y < 140) self.reiniciarMota(m, false);
            });
            this.haz.setAlpha(0.14 + 0.06 * Math.sin(ts * 3) + this.energia * 0.12);
            // barrido del escáner sobre el plano
            var u = (ts * 0.18) % 1;
            this.barrido.y = 130 + u * 660;
            this.barrido.setAlpha(Math.sin(u * Math.PI) * 0.22);
            // el holograma parpadea apenas
            this.holo.setAlpha(this.holoAlfa * (0.9 + 0.1 * Math.sin(ts * 23) * Math.sin(ts * 3.1)));
        }

        // ---------------------------------------------------------------- bandeja

        crearBandeja() {
            this.bandeja = img(this, BANDEJA.x, BANDEJA.y, "bandeja").setDepth(2);
            this.bandejaTitulo = this.add.text(BANDEJA.x, 150, "Bandeja de Piezas", {
                fontFamily: FUENTE, fontSize: "26px", fontStyle: "bold", color: "#ffe066", resolution: 2
            }).setOrigin(0.5, 0.5).setDepth(3);
            var self = this;
            this.plataformas = [];
            for (var i = 0; i < 6; i++) this.plataformas.push(img(self, 0, 0, "plataforma", 0.82).setDepth(3));
        }

        // ---------------------------------------------------------------- plano y nave

        crearPlano() {
            this.plano = img(this, PLANO.x, PLANO.y, "plano").setDepth(2);
            this.barrido = img(this, PLANO.x, 300, "barrido", 1.05).setDepth(4.6).setBlendMode(Phaser.BlendModes.ADD).setTint(0x7ff3ff).setAlpha(0);
            this.holoAlfa = 1;
            this.holo = img(this, NAVE.x, NAVE.y, "holo-chispa").setDepth(3);
            this.casco = img(this, NAVE.x, NAVE.y, "casco-chispa").setDepth(3.5).setAlpha(0);
            this.brilloNave = img(this, NAVE.x, NAVE.y, "luz", 3.2).setDepth(3.4).setBlendMode(Phaser.BlendModes.ADD).setTint(0x7ff3ff).setAlpha(0);
            var self = this;
            this.luces = [0, 1].map(function (i) {
                return img(self, 0, 0, "chispa", 1).setDepth(13).setBlendMode(Phaser.BlendModes.ADD).setTint(i ? 0x69db7c : 0xff6b6b).setAlpha(0);
            });
            this.llama = img(this, 0, 0, "llama", 0.9).setOrigin(0.5, 0).setDepth(11.5).setBlendMode(Phaser.BlendModes.ADD).setTint(0xff922b).setAlpha(0);
            this.llamaCentro = img(this, 0, 0, "llama", 0.5).setOrigin(0.5, 0).setDepth(11.6).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff3bf).setAlpha(0);
            this.etiquetaPlano = this.add.text(PLANO.x, 792, "", {
                fontFamily: FUENTE, fontSize: "22px", fontStyle: "bold", color: "#c5f6fa",
                stroke: "#06203f", strokeThickness: 6, resolution: 2
            }).setOrigin(0.5, 0.5).setDepth(4.8);
        }

        crearMoldes() {
            var self = this;
            this.moldes = {};
            D().tipos.forEach(function (id) {
                var base = img(self, 0, 0, "molde-" + id).setDepth(4);
                var brillo = img(self, 0, 0, "brillo-" + id).setDepth(4.1).setBlendMode(Phaser.BlendModes.ADD).setTint(0x7ff3ff).setAlpha(0);
                var mira = img(self, 0, 0, "anillo", 1).setDepth(4.2).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff3a0).setAlpha(0);
                var borde = img(self, 0, 0, "borde-" + id).setDepth(11).setTint(0x8ce99a).setAlpha(0);
                self.moldes[id] = {
                    id: id, x: 0, y: 0, rot: 0, base: base, brillo: brillo, mira: mira, borde: borde,
                    activo: false, ocupado: null, cerca: 0, cercaObj: 0, tiembla: 0, casi: 0, ayuda: 0, chispaT: 0
                };
            });
        }

        moldesActivos() {
            var self = this;
            return Object.keys(this.moldes).filter(function (k) { return self.moldes[k].activo; });
        }

        animarMoldes(dt, ts) {
            var self = this;
            var e = this.escNave;
            this.moldesActivos().forEach(function (id) {
                var m = self.moldes[id];
                m.cerca += (m.cercaObj - m.cerca) * Math.min(1, dt / 90);
                var pulso = 0.5 + 0.5 * Math.sin(ts * 7);
                var lleno = m.ocupado ? 1 : 0;
                // vacío: respira · cerca: resplandece y late · ayuda: dos destellos · casi: ámbar
                var a = lleno ? 0 : 0.12 + 0.1 * Math.sin(ts * 2 + m.x * 0.01);
                a = Math.max(a, m.cerca * (0.55 + 0.4 * pulso), m.ayuda * (0.35 + 0.55 * pulso));
                if (m.casi > 0) {
                    m.casi = Math.max(0, m.casi - dt);
                    a = Math.max(a, 0.8 * Math.abs(Math.sin(m.casi * 0.012)));
                }
                m.brillo.setAlpha(Math.min(1, a));
                m.brillo.setTint(m.casi > 0 ? 0xffc078 : (m.cerca > 0.6 ? 0xfff3a0 : 0x7ff3ff));
                var k = 1 + m.cerca * 0.05 * pulso + m.ayuda * 0.04 * pulso;
                m.base.setScale(m.base.base * e * k);
                m.brillo.setScale(m.brillo.base * e * (k + m.cerca * 0.06));
                m.base.setAlpha(lleno ? 0 : 1);
                // indicador de proximidad: un aro que se cierra sobre el contorno
                if (m.cerca > 0.02 && !lleno) {
                    var r = D().radioToque(id) * e;
                    var aro = (r + (1 - m.cerca) * 120) * 2 / 176;
                    m.mira.setPosition(m.x, m.y).setScale(m.mira.base * aro).setAlpha(m.cerca * 0.85).setRotation(ts * 1.5);
                } else {
                    m.mira.setAlpha(0);
                }
                var rot = rad(m.rot);
                if (m.tiembla > 0) {
                    m.tiembla = Math.max(0, m.tiembla - dt);
                    rot += Math.sin(m.tiembla * 0.06) * 0.08 * (m.tiembla / 420);
                }
                m.base.rotation = rot;
                m.brillo.rotation = rot;
                if (m.cerca > 0.4 && !lleno) {
                    m.chispaT -= dt;
                    if (m.chispaT <= 0) {
                        m.chispaT = 160;
                        self.particulas.emitir(m.x, m.y, { n: 2, tipos: ["destello", "chispa"], vel: 90, grav: -40, vida: 700, escala: 0.4, dispersion: 110, sumar: true, tintes: [0x7ff3ff, 0xffffff] });
                    }
                }
                if (lleno) m.borde.setPosition(m.x + self.vuelo.dx, m.y + self.vuelo.dy);
            });
        }

        // ---------------------------------------------------------------- piezas

        crearPiezas() {
            var self = this;
            var defs = (cfg && cfg.piezas) || [];
            this.piezas = defs.filter(function (d) { return D().tipos.indexOf(d.id) >= 0; }).map(function (def, i) {
                var kr = D().res("pieza-" + def.id);
                var sombra = img(self, 0, 0, "sombra", 0.8).setDepth(8).setAlpha(0);
                var aura = img(self, 0, 0, "luz", 0.9).setDepth(9).setBlendMode(Phaser.BlendModes.ADD).setTint(D().tinte(def.id)).setAlpha(0);
                var im = img(self, 0, 0, "pieza-" + def.id, 1).setDepth(10);
                // zona de toque generosa: el radio de la pieza más un margen para dedos pequeños
                im.setInteractive({
                    hitArea: new Phaser.Geom.Circle(D().PIEZA.c * kr, D().PIEZA.c * kr, (D().radioToque(def.id) + 16) * kr),
                    hitAreaCallback: Phaser.Geom.Circle.Contains,
                    draggable: true,
                    useHandCursor: true
                });
                var etiqueta = img(self, 0, 0, "etiqueta", 1).setDepth(8.5);
                var texto = self.add.text(0, 0, def.nombre || "", {
                    fontFamily: FUENTE, fontSize: "17px", fontStyle: "bold", color: "#ffffff", resolution: 2
                }).setOrigin(0.5, 0.54).setDepth(8.6);
                var f = {
                    id: def.id, def: def, img: im, sombra: sombra, aura: aura, etiqueta: etiqueta, texto: texto,
                    hueco: i % 6, activo: false, estado: "fuera", fase: i * 1.7, esc: 0.62, k: 1, salto: 0,
                    inclin: 0, objetivo: null, sigue: null, offset: { x: 0, y: 0 }, destino: null
                };
                im.setData("pieza", f);
                im.setVisible(false);
                return f;
            });
        }

        /** Escala en la bandeja: la del config, pero ninguna pieza pasa de ~140 × 118 de su hueco. */
        escBandeja(f) {
            var k = Number(jcfg().escalaBandeja) || 0.62;
            if (!f) return k;
            var t = D().tamano(f.id);
            return Math.min(k, 140 / t.w, 118 / t.h);
        }

        puntoHueco(f) {
            var h = huecos(this.nivel ? this.nivel.piezas.length : 6);
            return h[f.hueco % h.length];
        }

        ponerEnBandeja(f) {
            var p = this.puntoHueco(f);
            f.estado = f.activo ? "bandeja" : "fuera";
            f.esc = this.escBandeja(f);
            f.k = 1;
            f.salto = 0;
            f.inclin = rad(INCLINACION[f.hueco % INCLINACION.length]);
            f.img.setPosition(p.x, p.y).setDepth(10).setRotation(f.inclin).setVisible(f.activo).setAlpha(1);
            f.img.setScale(f.img.base * f.esc);
            f.sombra.setAlpha(0).setVisible(f.activo);
            f.aura.setAlpha(0).setVisible(f.activo);
            f.etiqueta.setPosition(p.x, p.y + 80).setAlpha(1).setVisible(f.activo);
            f.texto.setPosition(p.x, p.y + 80).setAlpha(1).setVisible(f.activo);
            if (f.img.input) f.img.input.enabled = f.activo;
        }

        /**
         * Prepara un nivel.
         * info: { nave, nombreNave, titulo, escala, piezas: [{ id, x, y, rot }] } (ReglasNave.piezasNivel)
         * reparto: { idPieza: índice de hueco en la bandeja }
         */
        cargar(info, reparto) {
            var self = this;
            this.nivel = info;
            this.escNave = Number(info.escala) || 1;
            var e = this.escNave;
            var nave = D().naves.indexOf(info.nave) >= 0 ? info.nave : "chispa";
            this.nave = nave;
            this.holo.setTexture("holo-" + nave);
            this.casco.setTexture("casco-" + nave);
            this.holo.base = e / D().res("holo-" + nave);
            this.casco.base = e / D().res("casco-" + nave);
            this.etiquetaPlano.setText((info.titulo ? info.titulo + " · " : "") + (info.nombreNave || ""));
            // contornos del nivel
            var activos = {};
            info.piezas.forEach(function (p) { activos[p.id] = p; });
            Object.keys(this.moldes).forEach(function (id) {
                var m = self.moldes[id];
                var p = activos[id];
                m.activo = !!p;
                [m.base, m.brillo, m.mira, m.borde].forEach(function (i) { i.setVisible(m.activo); });
                if (!p) return;
                m.x = NAVE.x + p.x;
                m.y = NAVE.y + p.y;
                m.rot = p.rot || 0;
                [m.base, m.brillo, m.borde].forEach(function (i) {
                    i.setPosition(m.x, m.y).setRotation(rad(m.rot)).setScale(i.base * e);
                });
            });
            this.radios = R().radios(info.piezas.map(function (p) { return { x: p.x, y: p.y }; }), jcfg());
            // plataformas de la bandeja
            var hs = huecos(info.piezas.length);
            this.plataformas.forEach(function (pl, i) {
                var h = hs[i];
                pl.setVisible(!!h);
                if (h) pl.setPosition(h.x, h.y + 46);
            });
            // luces de las puntas de las alas
            var luces = D().luces(nave);
            this.luces.forEach(function (l, i) {
                var p = luces[i] || [0, 0];
                l.cx = NAVE.x + p[0] * e;
                l.cy = NAVE.y + p[1] * e;
            });
            this.piezas.forEach(function (f) {
                f.activo = !!activos[f.id];
                f.destino = activos[f.id] || null;
            });
            this.montarConsola(info.piezas);
            this.reiniciar(reparto);
        }

        reiniciar(reparto) {
            var self = this;
            this.anim.limpiar();
            this.arrastrando = null;
            this.puntero = null;
            this.fiesta = false;
            this.energia = 0;
            this.encendida = 0;
            this.holoAlfa = 1;
            this.vuelo = { dx: 0, dy: 0, rot: 0, llama: 0 };
            this.guia.clear();
            this.ayuda = null;
            this.particulas.apagar();
            this.confeti.apagar();
            Object.keys(this.moldes).forEach(function (k) {
                var m = self.moldes[k];
                m.ocupado = null; m.cerca = 0; m.cercaObj = 0; m.ayuda = 0; m.tiembla = 0; m.casi = 0;
                m.borde.setAlpha(0);
            });
            this.piezas.forEach(function (f) {
                if (reparto && reparto[f.id] != null) f.hueco = reparto[f.id];
                self.ponerEnBandeja(f);
            });
            this.pintarConsola();
        }

        pieza(id) { return this.piezas.filter(function (f) { return f.id === id; })[0] || null; }

        // ---------------------------------------------------------------- consola de progreso

        crearConsola() {
            this.consola = img(this, CONSOLA.x, CONSOLA.y, "consola", 0.92).setDepth(6);
            this.consolaTexto = this.add.text(CONSOLA.x - 168, CONSOLA.y - 4, "0 / 0", {
                fontFamily: FUENTE, fontSize: "30px", fontStyle: "bold", color: "#ffffff",
                stroke: "#06203f", strokeThickness: 6, resolution: 2
            }).setOrigin(0.5, 0.5).setDepth(7);
            this.slots = [];
        }

        montarConsola(lista) {
            var self = this;
            this.slots.forEach(function (s) { s.icono.destroy(); s.silueta.destroy(); s.led.destroy(); });
            var n = lista.length;
            var paso = 56;
            var x0 = CONSOLA.x + 70 - (n - 1) * paso / 2;
            this.slots = lista.map(function (p, i) {
                var x = x0 + i * paso, y = CONSOLA.y - 4;
                var t = D().tamano(p.id);
                var k = 46 / Math.max(t.w, t.h);
                var silueta = img(self, x, y, "silueta-" + p.id, k).setDepth(7).setTint(0x5b86c9).setAlpha(0.9);
                var icono = img(self, x, y, "pieza-" + p.id, k).setDepth(7.1).setAlpha(0);
                var led = img(self, x, y, "luz", 0.34).setDepth(6.9).setBlendMode(Phaser.BlendModes.ADD).setTint(D().tinte(p.id)).setAlpha(0);
                return { id: p.id, icono: icono, silueta: silueta, led: led, on: false };
            });
        }

        pintarConsola(recien) {
            var self = this;
            var hechos = 0;
            this.slots.forEach(function (s) {
                var m = self.moldes[s.id];
                var on = !!(m && m.ocupado);
                if (on) hechos += 1;
                if (on && !s.on && recien === s.id) {
                    self.anim.agregar(600, function (u) {
                        s.icono.setAlpha(Math.min(1, u * 3)).setScale(s.icono.base * rebote(u));
                    });
                } else {
                    s.icono.setAlpha(on ? 1 : 0).setScale(s.icono.base);
                }
                s.led.setAlpha(on ? 0.55 : 0);
                s.silueta.setAlpha(on ? 0 : 0.9);
                s.on = on;
            });
            this.consolaTexto.setText(hechos + " / " + this.slots.length);
            this.energia = this.slots.length ? hechos / this.slots.length : 0;
        }

        mostrarProgreso(on) {
            var v = on !== false;
            this.consola.setVisible(v);
            this.consolaTexto.setVisible(v);
            this.slots.forEach(function (s) { s.icono.setVisible(v); s.silueta.setVisible(v); s.led.setVisible(v); });
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
            var f = obj.getData("pieza");
            if (!f || !this.arrastreOn || f.estado !== "bandeja" || this.arrastrando) return;
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
            // la pieza sigue al dedo desde donde se tomó; el desfase se va corriendo hacia arriba
            // para que la pieza quede siempre a la vista, por encima del dedo
            f.offset = { x: f.img.x - px, y: f.img.y - py };
            f.objetivo = { x: f.img.x, y: f.img.y };
            f.sigue = { x: f.img.x, y: f.img.y };
            var e0 = f.esc, k0 = f.k, meta = this.escNave * ELEVA;
            this.anim.agregar(180, function (u) {
                var s = saleSuave(u);
                f.esc = lerp(e0, meta, s);
                f.k = lerp(k0, 1, s);
            });
            f.etiqueta.setAlpha(0.35);
            f.texto.setAlpha(0.35);
            this.particulas.emitir(f.img.x, f.img.y, { n: 6, tipos: ["destello", "chispa"], vel: 150, grav: 0, vida: 500, escala: 0.4, dispersion: 40, sumar: true, tintes: [D().tinte(f.id), 0xffffff] });
        }

        alMover(p, obj) {
            var f = obj.getData("pieza");
            if (!f || f !== this.arrastrando) return;
            this.apuntar(f, p.worldX, p.worldY);
            avisar("arrastrar", f.id);
        }

        apuntar(f, px, py) {
            var L = this.limites || { x0: 0, y0: 0, x1: W, y1: H };
            f.objetivo = {
                x: Math.max(L.x0 + 50, Math.min(L.x1 - 50, px + f.offset.x)),
                y: Math.max(L.y0 + 50, Math.min(L.y1 - 40, py + f.offset.y))
            };
        }

        alSoltar(p, obj) {
            var f = obj.getData("pieza");
            if (!f || f !== this.arrastrando) return;
            this.soltar(f);
        }

        soltar(f) {
            this.arrastrando = null;
            this.puntero = null;
            f.estado = "soltado";
            this.apagarCercania();
            var datos = { id: f.id, destinos: this.distancias(f), radio: this.radios.acierto, radioCasi: this.radios.casi };
            if (cb.soltar) avisar("soltar", datos);
            else this.devolver(f.id);
        }

        distancias(f, x, y) {
            var self = this;
            var px = x != null ? x : f.img.x, py = y != null ? y : f.img.y;
            return this.moldesActivos().map(function (k) {
                var m = self.moldes[k];
                var dx = px - m.x, dy = py - m.y;
                return { id: k, distancia: Math.sqrt(dx * dx + dy * dy), ocupado: !!m.ocupado };
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
                var decae = Math.min(1, dt / 180);
                f.offset.x += (0 - f.offset.x) * decae;
                f.offset.y += (-36 - f.offset.y) * decae;
            }
            var o = f.objetivo;
            if (o && f.sigue) {
                // suavizado exponencial independiente de los fps: sigue al dedo sin vibrar
                var k = 1 - Math.exp(-dt / 34);
                f.sigue.x += (o.x - f.sigue.x) * k;
                f.sigue.y += (o.y - f.sigue.y) * k;
            }
            var m = this.moldes[f.id];
            var x = f.sigue.x, y = f.sigue.y;
            // imán sutil: cerca de su contorno la pieza se corre un poco hacia el centro
            if (m && m.activo && !m.ocupado) {
                var dx = m.x - x, dy = m.y - y;
                var tira = R().iman(Math.sqrt(dx * dx + dy * dy), this.radios.iman, jcfg().iman);
                x += dx * tira;
                y += dy * tira;
            }
            f.img.setPosition(x, y);
            // la pieza se endereza hacia la orientación de su destino
            var meta = rad(f.destino ? f.destino.rot : 0);
            f.img.rotation += (meta - f.img.rotation) * Math.min(1, dt / 120);
            var c = R().cercano(f.id, this.distancias(f), this.radios.cerca);
            var self = this;
            Object.keys(this.moldes).forEach(function (k2) { self.moldes[k2].cercaObj = c && c.id === k2 ? 0.2 + 0.8 * c.fuerza : 0; });
            if (c && !this.yaCerca) avisar("cerca", f.id);
            this.yaCerca = !!c;
        }

        // ---------------------------------------------------------------- resultados (los llama script.js)

        encajar(id) {
            var f = this.pieza(id);
            if (!f) return Promise.resolve();
            var m = this.moldes[f.id];
            var self = this;
            if (this.arrastrando === f) { this.arrastrando = null; this.puntero = null; }
            f.estado = "encajando";
            m.ocupado = f.id;
            m.cercaObj = 0;
            if (f.img.input) f.img.input.enabled = false;
            var x0 = f.img.x, y0 = f.img.y, r0 = f.img.rotation, e0 = f.esc;
            var r1 = rad(m.rot);
            f.img.setDepth(12);
            f.aura.setDepth(11.8);
            f.etiqueta.setVisible(false);
            f.texto.setVisible(false);
            return this.anim.agregar(220, function (u) {
                var e = saleSuave(u);
                f.img.x = lerp(x0, m.x, e);
                f.img.y = lerp(y0, m.y, e);
                f.img.rotation = lerp(r0, r1, e);
                f.esc = lerp(e0, self.escNave * 0.92, e);
            }).then(function () {
                f.img.setPosition(m.x, m.y).setRotation(r1);
                f.sombra.setAlpha(0);
                self.efectoEncaje(m, f);
                return self.anim.agregar(420, function (u) { f.esc = self.escNave * lerp(0.92, 1, rebote(u)); });
            }).then(function () {
                f.esc = self.escNave;
                f.estado = "encajado";
                self.pintarConsola(f.id);
            });
        }

        efectoEncaje(m, f) {
            var self = this;
            var e = this.escNave;
            var tinte = D().tinte(f.id);
            var anillo = img(this, m.x, m.y, "anillo", 0.6).setDepth(58).setBlendMode(Phaser.BlendModes.ADD).setTint(0x7ff3ff);
            var destello = img(this, m.x, m.y, "destello", 1.2).setDepth(59).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffffff);
            this.anim.agregar(620, function (u) {
                anillo.setScale(anillo.base * (1 + u * 2)).setAlpha(1 - u);
                destello.setScale(destello.base * (0.4 + Math.sin(u * Math.PI) * 3)).setAlpha(1 - u * u).setRotation(u * 1.2);
            }).then(function () { anillo.destroy(); destello.destroy(); });
            // seguro magnético: cuatro cerrojos se cierran sobre la pieza y se desvanecen
            var r = D().radioToque(f.id) * e * 0.95;
            [[-1, -1, 0], [1, -1, 90], [1, 1, 180], [-1, 1, 270]].forEach(function (c) {
                var ce = img(self, m.x + c[0] * (r + 60), m.y + c[1] * (r + 60), "cerrojo", 0.75).setDepth(57).setTint(0x8ce99a).setRotation(rad(c[2])).setAlpha(0);
                self.anim.agregar(320, function (u) {
                    var s = saleSuave(u);
                    ce.setPosition(m.x + c[0] * lerp(r + 60, r * 0.8, s), m.y + c[1] * lerp(r + 60, r * 0.8, s)).setAlpha(s);
                }).then(function () {
                    return self.anim.agregar(520, function (u) { ce.setAlpha(1 - u); });
                }).then(function () { ce.destroy(); });
            });
            m.borde.setPosition(m.x, m.y).setRotation(rad(m.rot)).setScale(m.borde.base * e);
            this.anim.agregar(900, function (u) { m.borde.setAlpha(u < 0.3 ? u / 0.3 : 1 - (u - 0.3) / 0.7 * 0.65); });
            this.particulas.emitir(m.x, m.y, { n: 12, tipos: ["chispa", "destello"], vel: 300, grav: 0, vida: 700, escala: 0.5, dispersion: 30, sumar: true, tintes: [0x7ff3ff, 0xffffff, tinte] });
            this.particulas.emitir(m.x, m.y, { n: 6, tipos: ["tuerca", "estrella"], vel: 260, grav: 420, vida: 900, escala: 0.45, dispersion: 20, tintes: [0xffffff, 0xffe066] });
            // la energía corre por el casco: destello general de la nave
            this.anim.agregar(700, function (u) { self.brilloNave.setAlpha(Math.sin(u * Math.PI) * 0.35); });
            // el aura de la pieza late una vez
            f.aura.setPosition(m.x, m.y);
            this.anim.agregar(700, function (u) { f.aura.setAlpha(Math.sin(u * Math.PI) * 0.8); });
        }

        /**
         * La pieza vuelve a su hueco de la bandeja.
         * rechazo: id del contorno donde la soltaron (tiembla). modo "casi": el contorno propio parpadea en ámbar.
         */
        devolver(id, rechazo, modo) {
            var f = this.pieza(id);
            if (!f) return Promise.resolve();
            if (this.arrastrando === f) { this.arrastrando = null; this.puntero = null; }
            var self = this;
            if (rechazo && this.moldes[rechazo]) {
                if (modo === "casi") this.moldes[rechazo].casi = 900;
                else this.moldes[rechazo].tiembla = 420;
            }
            f.estado = "volviendo";
            var l = this.puntoHueco(f);
            var x0 = f.img.x, y0 = f.img.y, e0 = f.esc, r0 = f.img.rotation;
            var dist = Math.sqrt((l.x - x0) * (l.x - x0) + (l.y - y0) * (l.y - y0));
            var dur = Math.max(320, Math.min(700, dist * 0.7));
            var meta = this.escBandeja(f);
            var inclin = rad(INCLINACION[f.hueco % INCLINACION.length]);
            return this.anim.agregar(dur, function (u) {
                var e = suave(u);
                f.img.x = lerp(x0, l.x, e);
                f.img.y = lerp(y0, l.y, e) - Math.sin(u * Math.PI) * Math.min(80, dist * 0.15);
                f.img.rotation = lerp(r0, inclin, e);
                f.esc = lerp(e0, meta, e);
            }).then(function () {
                return self.anim.agregar(240, function (u) { f.k = 1 + Math.sin(u * Math.PI) * 0.06; });
            }).then(function () {
                self.ponerEnBandeja(f);
            });
        }

        /** Para la demo: deshace un encaje y deja la pieza en la bandeja como al principio. */
        deshacer(id) {
            var f = this.pieza(id);
            if (!f) return Promise.resolve();
            var m = this.moldes[f.id];
            var self = this;
            m.ocupado = null;
            this.anim.agregar(400, function (u) { m.borde.setAlpha((1 - u) * m.borde.alpha); });
            f.estado = "volviendo";
            f.img.setDepth(10);
            this.pintarConsola();
            return this.devolver(id).then(function () { self.ponerEnBandeja(f); });
        }

        // ---------------------------------------------------------------- ayuda (guiado sutil)

        pulsoAyuda(id) {
            var f = this.pieza(id);
            if (!f || f.estado !== "bandeja") return;
            var m = this.moldes[f.id];
            var self = this;
            this.limpiarAyuda();
            var a = { f: f, m: m };
            this.ayuda = a;
            f.salto = 1;
            this.anim.agregar(2800, function (u) {
                if (self.ayuda !== a) return;
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
            var x0 = f.img.x, y0 = f.img.y, x1 = m.x, y1 = m.y;
            var cx = (x0 + x1) / 2, cy = Math.min(y0, y1) - 100;
            var n = 18;
            var visibles = Math.floor(n * Math.min(1, u * 2.2));
            var alfa = u < 0.75 ? 1 : 1 - (u - 0.75) / 0.25;
            for (var i = 1; i < visibles; i++) {
                var t = i / n;
                var x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
                var y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
                g.fillStyle(0x06203f, 0.6 * alfa);
                g.fillCircle(x, y, 8);
                g.fillStyle(0x7ff3ff, alfa);
                g.fillCircle(x, y, 5);
            }
        }

        limpiarAyuda() {
            if (!this.ayuda) return;
            this.ayuda.m.ayuda = 0;
            this.ayuda.f.salto = 0;
            this.ayuda = null;
            this.guia.clear();
        }

        // ---------------------------------------------------------------- celebración

        /** Luces que recorren las piezas una por una y la nave que se enciende. */
        encender() {
            var self = this;
            var lista = this.piezas.filter(function (f) { return f.activo && f.estado === "encajado"; });
            lista.sort(function (a, b) { return a.img.y - b.img.y; });
            lista.forEach(function (f, i) {
                setTimeout(function () {
                    if (!self.fiesta) return;
                    f.aura.setPosition(f.img.x, f.img.y);
                    self.anim.agregar(520, function (u) {
                        f.aura.setAlpha(Math.sin(u * Math.PI) * 0.9);
                        f.k = 1 + Math.sin(u * Math.PI) * 0.08;
                    });
                    self.particulas.emitir(f.img.x, f.img.y, { n: 5, tipos: ["destello", "chispa"], vel: 160, grav: -20, vida: 600, escala: 0.45, dispersion: 40, sumar: true, tintes: [D().tinte(f.id), 0xffffff] });
                }, i * 160);
            });
            var h0 = this.holoAlfa;
            return this.anim.agregar(260 + lista.length * 160, function (u) {
                self.encendida = suave(u);
                self.holoAlfa = lerp(h0, 0.35, u);
                self.brilloNave.setAlpha(Math.sin(u * Math.PI) * 0.45);
            });
        }

        /** corta: paso de nivel (se enciende y flota). Sin corta: despega, cruza y vuelve a flotar. */
        celebrar(corta) {
            var self = this;
            this.fiesta = true;
            Object.keys(this.moldes).forEach(function (k) { self.moldes[k].borde.setAlpha(0); });
            var L = this.limitesVisibles();
            var lluvia = function (n) {
                for (var i = 0; i < n; i++) {
                    var x = L.x0 + Math.random() * (L.x1 - L.x0);
                    self.confeti.emitir(x, L.y0 - 20, { n: 1, tipos: Math.random() < 0.3 ? ["estrella"] : ["confeti"], angulo: Math.PI / 2, apertura: 0.8, vel: 120, grav: 140, vida: 2600, escala: 0.7, giro: 5, tintes: COLORES, aleteo: true });
                }
            };
            var estallido = function (x, y, i) {
                var a = img(self, x, y, "anillo", 0.6).setDepth(58).setBlendMode(Phaser.BlendModes.ADD).setTint(COLORES[i % COLORES.length]);
                self.anim.agregar(900, function (u) { a.setScale(a.base * (1 + u * 4)).setAlpha(1 - u); }).then(function () { a.destroy(); });
                self.particulas.emitir(x, y, { n: 14, tipos: ["estrella", "destello"], vel: 480, grav: 300, vida: 1400, escala: 0.55, dispersion: 80 });
            };
            return this.encender().then(function () {
                if (!self.fiesta) return;
                estallido(NAVE.x, NAVE.y, 0);
                lluvia(corta ? 14 : 22);
                if (corta) {
                    // motores encendidos: la nave flota un poco y vuelve a su lugar
                    return self.anim.agregar(1700, function (u) {
                        self.vuelo.llama = Math.sin(u * Math.PI);
                        self.vuelo.dy = -Math.sin(u * Math.PI) * 34;
                    }).then(function () { return sleep(300); });
                }
                // despegue: tiembla, sube con fuego, sale por arriba y vuelve flotando desde abajo
                return self.anim.agregar(700, function (u) {
                    self.vuelo.llama = u * 0.8;
                    self.vuelo.dx = Math.sin(u * 90) * 3 * u;
                }).then(function () {
                    avisar("despegue");
                    var estela = 0;
                    return self.anim.agregar(1500, function (u) {
                        self.vuelo.llama = 1;
                        self.vuelo.dx = Math.sin(u * 60) * 2 * (1 - u);
                        self.vuelo.dy = -entraSuave(u) * 980;
                        estela += 1;
                        if (estela % 2 === 0) {
                            var p = self.puntoLlama();
                            self.particulas.emitir(p.x, p.y + 40, { n: 2, tipos: ["chispa", "destello"], vel: 120, angulo: Math.PI / 2, apertura: 0.8, grav: 120, vida: 700, escala: 0.6, dispersion: 30, sumar: true, tintes: [0xff922b, 0xffd43b, 0xffffff] });
                        }
                    });
                }).then(function () {
                    [0, 1, 2].forEach(function (i) { setTimeout(function () { if (self.fiesta) estallido(L.x0 + 300 + Math.random() * (L.x1 - L.x0 - 600), 220 + Math.random() * 300, i + 1); }, i * 260); });
                    lluvia(24);
                    self.vuelo.dy = 760;
                    return self.anim.agregar(1500, function (u) {
                        self.vuelo.llama = 0.6 + 0.4 * (1 - u);
                        self.vuelo.dy = lerp(760, 0, saleSuave(u));
                    });
                }).then(function () {
                    lluvia(18);
                    return self.anim.agregar(900, function (u) { self.vuelo.llama = lerp(0.6, 0.35, u); });
                });
            });
        }

        // ---------------------------------------------------------------- cinemática final «Viaje al espacio»

        camara(x, y, zoom) {
            var c = this.cameras.main;
            c.setZoom(zoom);
            c.centerOn(x, y);
        }

        /** El espacio que hay sobre el taller (se crea una sola vez, por encima de y = 0). */
        crearEspacio() {
            if (this.espacio) return this.espacio;
            var self = this;
            var e = { estrellas: [], nebulosas: [], todo: [] };
            // degradado: del techo del taller al negro del espacio
            for (var i = 0; i < 8; i++) {
                var r = this.add.rectangle(W / 2, -40 - i * 70, W * 3, 72, 0x121d45, 1 - i / 8).setDepth(0.2);
                e.todo.push(r);
            }
            for (var k = 0; k < 120; k++) {
                var cerca = k % 3 === 0;
                var st = img(this, NAVE.x - 1300 + Math.random() * 2600, -260 - Math.random() * 3900, k % 7 ? "chispa" : "estrella", cerca ? 0.32 : 0.16)
                    .setDepth(cerca ? 0.6 : 0.4).setBlendMode(Phaser.BlendModes.ADD).setTint(k % 5 ? 0xffffff : (k % 2 ? 0x99e9f2 : 0xffd43b));
                st.fase = Math.random() * 6;
                st.cerca = cerca;
                st.y0 = st.y;
                e.estrellas.push(st);
                e.todo.push(st);
            }
            [[NAVE.x - 520, -1500, 0xb197fc], [NAVE.x + 460, -2600, 0x3bdcff], [NAVE.x - 300, -3500, 0xff6bd6]].forEach(function (n) {
                var im = img(self, n[0], n[1], "luz", 7).setDepth(0.3).setBlendMode(Phaser.BlendModes.ADD).setTint(n[2]).setAlpha(0.35);
                e.nebulosas.push(im);
                e.todo.push(im);
            });
            // planeta con anillo y una luna
            var g = this.add.graphics().setDepth(0.5);
            var px = NAVE.x + 470, py = -2250;
            g.fillStyle(0x5f3dc4, 1).fillCircle(px, py, 170);
            g.fillStyle(0x7950f2, 1).fillCircle(px - 26, py - 22, 140);
            g.fillStyle(0x9775fa, 1).fillCircle(px - 56, py - 50, 80);
            g.lineStyle(16, 0xffd43b, 0.85).strokeEllipse(px, py, 540, 110);
            g.lineStyle(6, 0xfff3bf, 0.6).strokeEllipse(px, py, 500, 90);
            g.fillStyle(0xdee2e6, 1).fillCircle(NAVE.x - 560, -3050, 56);
            g.fillStyle(0xadb5bd, 1).fillCircle(NAVE.x - 576, -3064, 14).fillCircle(NAVE.x - 538, -3030, 10);
            e.todo.push(g);
            this.destelloCine = this.add.rectangle(W / 2, H / 2, W * 3, H * 3, 0xffffff, 1).setScrollFactor(0).setDepth(200).setAlpha(0);
            this.espacio = e;
            return e;
        }

        /**
         * Tras la última nave (≈13 s, con franjas de cine y botones ocultos):
         *  1. la nave se enciende y la cámara se acerca;  2. cuenta regresiva 3, 2, 1 (evento "cuenta");
         *  3. ignición: temblor y fuego;  4. despegue: la cámara sigue la nave por encima del taller hasta el
         *  espacio (estrellas, nebulosas, planeta con anillo);  5. salto al hiperespacio: las estrellas se
         *  estiran y un destello blanco;  6. la nave vuelve al taller y se posa en el plano con fuegos de colores.
         * Con movimiento reducido la cámara no viaja y la cuenta es rápida.
         */
        cinematica() {
            var self = this;
            var cam = this.cameras.main;
            var E = this.crearEspacio();
            var esc = this.escNave;
            this.fiesta = true;
            Object.keys(this.moldes).forEach(function (k) { self.moldes[k].borde.setAlpha(0); });
            avisar("cine", true);
            var yNave = function () { return NAVE.y + self.vuelo.dy; };
            var estelaN = 0;
            var estela = function (fuerza) {
                estelaN += 1;
                if (estelaN % 2) return;
                var p = self.puntoLlama();
                self.particulas.emitir(p.x, p.y + 40 * esc, { n: 2, tipos: ["chispa", "destello"], vel: 140 * fuerza, angulo: Math.PI / 2, apertura: 0.8, grav: 120, vida: 700, escala: 0.6, dispersion: 30, sumar: true, tintes: [0xff922b, 0xffd43b, 0xffffff] });
            };
            var titilar = function (vel) {
                var t = self.t / 1000;
                E.estrellas.forEach(function (st) {
                    st.setAlpha(0.45 + 0.55 * Math.abs(Math.sin(t * 2 + st.fase)));
                    if (vel) st.setScale(st.base, st.base * (1 + vel * (st.cerca ? 9 : 5)));
                });
            };
            var fin = function () {
                self.camara(W / 2, H / 2, 1);
                cam.setBackgroundColor("#121d45");
                E.estrellas.forEach(function (st) { st.setScale(st.base).setY(st.y0); });
                self.destelloCine.setAlpha(0);
            };
            var z1 = reducido ? 1 : 1.5;
            return this.encender().then(function () {
                // 1) acercamiento a la nave encendida
                cam.setBackgroundColor("#050a1f");
                return self.anim.agregar(reducido ? 100 : 1300, function (u) {
                    var k = suave(u);
                    if (!reducido) self.camara(lerp(W / 2, NAVE.x, k), lerp(H / 2, NAVE.y - 30, k), lerp(1, z1, k));
                    self.vuelo.llama = 0.25 * u;
                });
            }).then(function () {
                // 2) cuenta regresiva
                var paso = reducido ? 250 : 900;
                var cuenta = function (n) {
                    avisar("cuenta", n);
                    return self.anim.agregar(paso, function (u) {
                        self.vuelo.llama = 0.25 + (3 - n) * 0.12 + 0.08 * Math.sin(u * Math.PI);
                        self.vuelo.dx = Math.sin(self.t / 25) * (3 - n);
                    });
                };
                return cuenta(3).then(function () { return cuenta(2); }).then(function () { return cuenta(1); });
            }).then(function () {
                // 3) ignición
                avisar("cuenta", 0);
                avisar("despegue");
                if (!reducido) cam.shake(900, 0.006);
                return self.anim.agregar(reducido ? 150 : 800, function (u) {
                    self.vuelo.llama = 0.6 + 0.4 * u;
                    self.vuelo.dx = Math.sin(self.t / 18) * 4 * (1 - u * 0.5);
                    self.vuelo.dy = -18 * u;
                    estela(1);
                });
            }).then(function () {
                // 4) despegue: la cámara sigue la nave hasta el espacio
                var y0 = self.vuelo.dy;
                return self.anim.agregar(reducido ? 300 : 3600, function (u) {
                    var k = u * u * (3 - 2 * u) * 0.35 + u * u * 0.65;
                    self.vuelo.llama = 1;
                    self.vuelo.dx = Math.sin(self.t / 300) * 18 * u;
                    self.vuelo.dy = lerp(y0, -3000, k);
                    if (!reducido) self.camara(NAVE.x + self.vuelo.dx * 0.5, yNave() - 60, lerp(z1, 1.05, u));
                    estela(1.2);
                    titilar(0);
                });
            }).then(function () {
                // 5) hiperespacio: las estrellas se estiran y destello blanco
                avisar("hiper");
                var y0 = self.vuelo.dy;
                return self.anim.agregar(reducido ? 200 : 1500, function (u) {
                    self.vuelo.dy = y0 - 500 * u * u;
                    if (!reducido) self.camara(NAVE.x, yNave() - 60 - 120 * u, 1.05 + 0.25 * u);
                    titilar(u);
                    E.estrellas.forEach(function (st) { st.y = st.y0 + 700 * u * u * (st.cerca ? 1.5 : 1); });
                    self.destelloCine.setAlpha(Math.max(0, (u - 0.6) / 0.4));
                    estela(1.5);
                });
            }).then(function () {
                // 6) de vuelta en el taller: la nave baja y se posa en el plano
                fin();
                self.destelloCine.setAlpha(1);
                self.vuelo.dy = 760;
                self.vuelo.dx = 0;
                var L = self.limitesVisibles();
                [0, 1, 2, 3].forEach(function (i) {
                    setTimeout(function () {
                        if (!self.fiesta) return;
                        var x = L.x0 + 300 + Math.random() * (L.x1 - L.x0 - 600), y = 200 + Math.random() * 300;
                        var a = img(self, x, y, "anillo", 0.6).setDepth(58).setBlendMode(Phaser.BlendModes.ADD).setTint(COLORES[(i + 1) % COLORES.length]);
                        self.anim.agregar(900, function (u) { a.setScale(a.base * (1 + u * 4)).setAlpha(1 - u); }).then(function () { a.destroy(); });
                        self.particulas.emitir(x, y, { n: 14, tipos: ["estrella", "destello"], vel: 480, grav: 300, vida: 1400, escala: 0.55, dispersion: 80 });
                        avisar("fuego");
                    }, 500 + i * 320);
                });
                for (var i = 0; i < 26; i++) {
                    var x = L.x0 + Math.random() * (L.x1 - L.x0);
                    self.confeti.emitir(x, L.y0 - 20, { n: 1, tipos: Math.random() < 0.3 ? ["estrella"] : ["confeti"], angulo: Math.PI / 2, apertura: 0.8, vel: 120, grav: 140, vida: 2600, escala: 0.7, giro: 5, tintes: COLORES, aleteo: true });
                }
                return self.anim.agregar(reducido ? 200 : 1700, function (u) {
                    self.destelloCine.setAlpha(Math.max(0, 1 - u * 3));
                    self.vuelo.llama = 0.6 + 0.4 * (1 - u);
                    self.vuelo.dy = lerp(760, 0, saleSuave(u));
                });
            }).then(function () {
                return self.anim.agregar(reducido ? 100 : 900, function (u) { self.vuelo.llama = lerp(0.6, 0.35, u); });
            }).then(function () {
                avisar("cine", false);
            }, function (err) {
                fin();
                avisar("cine", false);
                throw err;
            });
        }

        terminarFiesta() {
            this.fiesta = false;
            this.vuelo = { dx: 0, dy: 0, rot: 0, llama: 0 };
            this.encendida = 0;
        }

        puntoLlama() {
            var m = this.moldes.propulsor;
            if (m && m.activo) return { x: m.x + this.vuelo.dx, y: m.y + this.vuelo.dy + 58 * this.escNave };
            return { x: NAVE.x + this.vuelo.dx, y: NAVE.y + this.vuelo.dy + 200 * this.escNave };
        }

        animarNave(dt, ts) {
            var e = this.escNave;
            var v = this.vuelo;
            var flota = this.fiesta ? Math.sin(ts * 2.4) * 6 * this.encendida : 0;
            var x = NAVE.x + v.dx, y = NAVE.y + v.dy + flota;
            this.holo.setPosition(NAVE.x, NAVE.y).setScale(this.holo.base);
            this.casco.setPosition(x, y).setScale(this.casco.base);
            // el casco se vuelve sólido a medida que se ensambla; encendido, del todo
            var meta = Math.max(this.energia * 0.75, this.encendida);
            this.casco.setAlpha(this.casco.alpha + (meta - this.casco.alpha) * Math.min(1, dt / 220));
            this.brilloNave.setPosition(x, y);
            var luzOn = Math.max(this.energia > 0 ? 0.35 : 0, this.encendida);
            this.luces.forEach(function (l, i) {
                var parpadeo = Math.max(0, Math.sin(ts * 5 + i * Math.PI));
                l.setPosition(l.cx + v.dx, l.cy + v.dy + flota).setAlpha(luzOn * (0.3 + 0.7 * parpadeo));
            });
            var p = this.puntoLlama();
            var fl = v.llama * (0.85 + 0.15 * Math.sin(ts * 40));
            this.llama.setPosition(p.x, p.y + flota).setAlpha(v.llama * 0.95).setScale(this.llama.base * e * (0.6 + 0.6 * fl), this.llama.base * e * (0.5 + 1.1 * fl));
            this.llamaCentro.setPosition(p.x, p.y + flota).setAlpha(v.llama).setScale(this.llamaCentro.base * e * (0.6 + 0.5 * fl), this.llamaCentro.base * e * (0.5 + 0.9 * fl));
            this.vuelo.flota = flota;
        }

        // ---------------------------------------------------------------- bucle

        update(time, delta) {
            var dt = Math.min(delta, 60);
            this.t += dt;
            var ts = this.t / 1000;
            this.anim.update(dt);
            this.seguirArrastre(dt);
            this.animarAmbiente(dt, ts);
            this.animarNave(dt, ts);
            this.animarMoldes(dt, ts);
            var self = this;
            var v = this.vuelo;
            this.piezas.forEach(function (f) {
                if (!f.activo) return;
                var lev = f.estado === "arrastrando";
                if (f.estado === "bandeja") {
                    var l = self.puntoHueco(f);
                    var salto = f.salto ? Math.abs(Math.sin(ts * 6)) * 20 * f.salto : 0;
                    f.img.y = l.y + Math.sin(ts * 1.6 + f.fase) * 3 - salto;
                    f.img.x = l.x;
                    f.img.rotation = f.inclin + Math.sin(ts * 1.1 + f.fase) * 0.025;
                } else if (f.estado === "encajado") {
                    var m = self.moldes[f.id];
                    f.img.setPosition(m.x + v.dx, m.y + v.dy + (v.flota || 0));
                    f.aura.setPosition(f.img.x, f.img.y);
                }
                f.img.setScale(f.img.base * f.esc * f.k);
                // sombra: aparece bajo la pieza tomada, como si flotara sobre el taller
                var sombraA = lev ? 0.5 : 0;
                f.sombra.setAlpha(f.sombra.alpha + (sombraA - f.sombra.alpha) * Math.min(1, dt / 100));
                if (lev) f.sombra.setPosition(f.img.x + 16, f.img.y + 70 * f.esc).setScale(f.sombra.base * f.esc);
                if (f.estado === "arrastrando" || f.estado === "bandeja" || f.estado === "volviendo") {
                    var auraA = lev ? 0.5 + 0.15 * Math.sin(ts * 6) : 0;
                    f.aura.setAlpha(f.aura.alpha + (auraA - f.aura.alpha) * Math.min(1, dt / 100));
                    f.aura.setPosition(f.img.x, f.img.y).setScale(f.aura.base * f.esc * 1.2);
                }
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
            Promise.all([document.fonts.load("700 54px Fredoka"), document.fonts.load("600 23px Fredoka")]),
            sleep(1500)
        ]).catch(function () { /* sin la fuente queda Arial */ });
    }

    function crearJuego() {
        juego = new Phaser.Game({
            type: Phaser.AUTO,
            parent: el,
            transparent: false,
            backgroundColor: "#121d45",
            banner: false,
            scale: { mode: Phaser.Scale.ENVELOP, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
            input: { activePointers: 2 },
            render: { antialias: true },
            scene: [EscenaNave]
        });
        global.__escenarioNave = juego;
        global.__pedniaPhaserGame = juego;
    }

    // ------------------------------------------------------------------ API pública

    global.EscenarioNave = {
        HUECOS: HUECOS,
        NAVE: NAVE,
        /** Cuántos huecos tiene la bandeja para un nivel de n piezas (para sortear el reparto). */
        numHuecos: function (n) { return huecos(n).length; },
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
        reacomodar: function () { if (juego) { juego.scale.refresh(); if (escena) escena.limites = escena.limitesVisibles(); } },
        cargar: function (info, reparto) { if (escena) escena.cargar(info, reparto); },
        arrastre: function (on) {
            if (!escena) return;
            escena.arrastreOn = !!on;
            if (!on && escena.arrastrando) escena.devolver(escena.arrastrando.id);
        },
        encajar: function (id) { return escena ? escena.encajar(id) : Promise.resolve(); },
        devolver: function (id, rechazo, modo) { return escena ? escena.devolver(id, rechazo, modo) : Promise.resolve(); },
        deshacer: function (id) { return escena ? escena.deshacer(id) : Promise.resolve(); },
        pulsoAyuda: function (id) { if (escena) escena.pulsoAyuda(id); },
        limpiarAyuda: function () { if (escena) escena.limpiarAyuda(); },
        mostrarProgreso: function (on) { if (escena) escena.mostrarProgreso(on); },
        celebrar: function (corta) { return escena ? escena.celebrar(corta) : Promise.resolve(); },
        cinematica: function () { return escena ? escena.cinematica() : Promise.resolve(); },
        terminarFiesta: function () { if (escena) escena.terminarFiesta(); },
        // demo y pruebas: coordenadas de pantalla
        puntoCliente: function (id) {
            var f = escena && escena.pieza(id);
            return f ? aPantalla(f.img.x, f.img.y) : null;
        },
        puntoMoldeCliente: function (id) {
            var m = escena && escena.moldes[id];
            return m && m.activo ? aPantalla(m.x, m.y) : null;
        },
        tomarDemo: function (id) {
            var f = escena && escena.pieza(id);
            if (!f || f.estado !== "bandeja") return;
            escena.demo = true;
            escena.tomar(f, f.img.x, f.img.y);
        },
        ponerCliente: function (id, x, y) {
            var f = escena && escena.pieza(id);
            if (!f || f !== escena.arrastrando) return;
            var p = aMundo(x, y);
            f.offset = { x: 0, y: 0 };
            f.objetivo = { x: p.x, y: p.y };
        },
        finDemo: function () { if (escena) escena.demo = false; },
        estado: function () {
            if (!escena) return null;
            return {
                nave: escena.nave,
                piezas: escena.piezas.filter(function (f) { return f.activo; }).map(function (f) {
                    return { id: f.id, estado: f.estado, x: Math.round(f.img.x), y: Math.round(f.img.y), hueco: f.hueco };
                }),
                moldes: escena.moldesActivos().map(function (k) {
                    var m = escena.moldes[k];
                    return { id: k, x: Math.round(m.x), y: Math.round(m.y), ocupado: m.ocupado, cerca: Math.round(m.cerca * 100) / 100 };
                }),
                radios: escena.radios,
                energia: escena.energia,
                arrastrando: escena.arrastrando ? escena.arrastrando.id : null
            };
        }
    };
})(typeof window !== "undefined" ? window : global);
