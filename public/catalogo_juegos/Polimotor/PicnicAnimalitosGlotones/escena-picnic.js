/**
 * EscenarioPicnic — escenas Phaser 4 de "Picnic con los Animalitos Glotones" (window.EscenarioPicnic).
 * La escena dibuja, anima y avisa; no decide (reglas.js decide y script.js ordena el flujo).
 *
 *   Escena "Picnic": el mismo bosque y la manta del juego del oso, los animales de la ronda sentados en la
 *   manta (AnimalesPicnic) y el plato centrada abajo con los alimentos que se arrastran.
 *   Escena "Fiesta": escena final independiente; los cuatro animales terminan de comer, bailan y saludan.
 *
 * Mundo de diseño 1600 × 900 con Scale.ENVELOP (llena la pantalla; lo importante va en el centro).
 * Todas las animaciones esperadas devuelven Promise con respaldo por tiempo (Animador).
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser || null;
    var D = function () { return global.DibujosPicnic; };
    var R = function () { return global.ReglasPicnic; };
    var W = 1600, H = 900;
    var PLATO = { x: 800, y: 812, escala: 1 };
    /** Desplazamiento en x de cada alimento sobre el plato, según cuántos hay en la ronda. */
    var RANURAS = { 1: [0], 2: [-64, 64], 3: [-122, 0, 122], 4: [-180, -60, 60, 180] };
    var TAM_ALIMENTO = 112;
    /**
     * Lugar fijo de cada animal en la manta (los pies). Cada uno conserva el suyo cuando llega otro:
     * R1 conejo y perro en el centro, R2 el pajarito a la izquierda, R3 el osito a la derecha.
     */
    var LUGARES = {
        pajaro: { x: 455, y: 650, esc: 1 },
        conejo: { x: 690, y: 662, esc: 1 },
        perro: { x: 925, y: 662, esc: 1 },
        oso: { x: 1165, y: 656, esc: 1 }
    };

    var juego = null, el = null, cfg = null;
    var picnic = null, fiesta = null;
    var esperaPicnic = null, esperaFiesta = null;
    var cb = { tomar: null, arrastrar: null, soltar: null, evento: null };

    function avisar(nombre, a, b) {
        var f = cb[nombre];
        if (typeof f === "function") {
            try { f(a, b); } catch (e) { console.warn("[EscenarioPicnic]", nombre, e); }
        }
    }

    function evento(nombre, datos) { avisar("evento", nombre, datos); }

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

    function suave(u) { return u * u * (3 - 2 * u); }
    function lerp(a, b, u) { return a + (b - a) * u; }

    // ------------------------------------------------------------------ partículas (una sola reserva de imágenes)

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
            p.vivo = true;
            p.t = 0;
            p.vida = (o.vida || 1200) * (0.7 + Math.random() * 0.5);
            p.vx = Math.cos(ang) * v + (o.vx || 0);
            p.vy = Math.sin(ang) * v + (o.vy || 0);
            p.grav = o.grav != null ? o.grav : 380;
            p.giro = (Math.random() - 0.5) * (o.giro || 6);
            p.esc = (o.escala || 0.7) * (0.7 + Math.random() * 0.6);
            var tx = tipos[Math.floor(Math.random() * tipos.length)];
            p.img.setTexture(tx);
            // las hojas blancas se tiñen de colores de otoño; lo demás conserva su color
            p.img.setTint(o.tintes && tx === "hoja" ? o.tintes[Math.floor(Math.random() * o.tintes.length)] : 0xffffff);
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
            if (u >= 1) {
                p.vivo = false;
                p.img.setVisible(false);
                continue;
            }
            p.vy += p.grav * s;
            p.img.x += p.vx * s;
            p.img.y += p.vy * s;
            p.img.rotation += p.giro * s;
            p.img.setAlpha(1 - u * u);
            p.img.setScale(p.esc * (u < 0.15 ? 0.4 + u * 4 : 1));
        }
    };

    Particulas.prototype.apagar = function () {
        this.lista.forEach(function (p) { p.vivo = false; p.img.setVisible(false); });
    };

    // ------------------------------------------------------------------ texturas (se crean una sola vez)

    function tex(scene, key, fn) {
        if (!scene.textures.exists(key)) scene.textures.addCanvas(key, fn());
    }

    var PIEZAS_ANIMALES = [
        "oso-cuerpo", "oso-cabeza", "oso-brazo", "oso-pie", "oso-pierna",
        "conejo-cuerpo", "conejo-cabeza", "conejo-oreja", "conejo-pata",
        "perro-cuerpo", "perro-cabeza", "perro-oreja", "perro-pata", "perro-cola",
        "pajaro-cuerpo", "pajaro-cabeza", "pajaro-ala", "pajaro-pata"
    ];

    function prepararTexturas(scene) {
        var d = D();
        d.tiposArbol.forEach(function (t) { tex(scene, "arbol-" + t, function () { return d.arbol(t); }); });
        tex(scene, "plato", d.plato);
        tex(scene, "letrero", d.letrero);
        tex(scene, "cerca", d.cerca);
        tex(scene, "arbusto", d.arbusto);
        tex(scene, "hongos", d.hongos);
        tex(scene, "hierba", d.hierba);
        tex(scene, "hoja", d.hoja);
        tex(scene, "sombra", d.sombra);
        tex(scene, "fx-luz", d.manchaLuz);
        tex(scene, "fx-rayo", d.rayo);
        // piezas de los cuatro animales y los nueve alimentos (ya rasterizadas por DibujosPicnic.preparar)
        PIEZAS_ANIMALES.forEach(function (k) { tex(scene, k, function () { return d.pieza(k); }); });
        d.tiposAlimento().forEach(function (t) { tex(scene, "alimento-" + t, function () { return d.alimento(t); }); });
        ["petalo-0", "petalo-1", "petalo-2"].forEach(function (k) { tex(scene, k, function () { return d.pieza(k); }); });
        tex(scene, "corazon", d.corazon);
        tex(scene, "corazon-lila", d.corazonLila);
        tex(scene, "estrella", d.estrella);
        tex(scene, "chispa", d.chispa);
        ["#ff6b6b", "#ffd43b", "#69db7c", "#4dabf7", "#b197fc"].forEach(function (c, i) { tex(scene, "confeti-" + i, function () { return d.confeti(c); }); });
        [0, 1, 2].forEach(function (i) { tex(scene, "flor-" + i, function () { return d.flor(i); }); });
    }

    // ------------------------------------------------------------------ bosque de la Ardilla (compartido por las dos escenas)

    var COLORES_HOJA = [0xe03131, 0xf76707, 0xfab005, 0xfd7e14, 0xc92a2a, 0xffd43b, 0xe8590c];
    var TIPOS_ARBOL = ["otono", "verde", "rosa", "amarillo"];

    /**
     * Fila de árboles detrás de una cerca de madera, árboles grandes a los lados, matas, hongos, hierba y flores,
     * manchas de sol, rayos cálidos y hojas que caen (como en "La Ardilla y la Bellota Gigante").
     */
    function crearBosque(scene, o) {
        var rnd = (function () {
            var s = o.semilla || 12345;
            return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
        })();
        var b = { arboles: [], hojas: [], rayos: [], manchas: [] };
        var filaY = o.filaY || 340;
        for (var i = 0; i < 10; i++) {
            var x = -70 + i * 192 + (rnd() - 0.5) * 50;
            var a = scene.add.image(x, filaY + 6, "arbol-" + TIPOS_ARBOL[i % 4]).setOrigin(0.5, 1).setDepth(1 + rnd() * 0.1);
            a.setScale(0.7 + rnd() * 0.18);
            b.arboles.push(a);
        }
        for (var c = 0; c < 16; c++) {
            scene.add.image(c * 106 - 20, filaY + 14, "cerca").setOrigin(0, 1).setDisplaySize(110, 62).setDepth(1.5);
        }
        (o.lados || []).forEach(function (l) {
            var g = scene.add.image(l[0], l[1], "arbol-" + l[2]).setOrigin(0.5, 1).setScale(l[3]).setDepth(2);
            b.arboles.push(g);
        });
        (o.decor || []).forEach(function (dc) {
            scene.add.image(dc[1], dc[2], dc[0]).setOrigin(0.5, 1).setScale(dc[3] || 1).setDepth(dc[4] || 2.5);
        });
        for (var m = 0; m < 6; m++) {
            var mancha = scene.add.image(rnd() * W, 380 + rnd() * 480, "fx-luz").setBlendMode(Phaser.BlendModes.ADD).setDepth(0.6);
            mancha.setScale(2.2 + rnd() * 1.4).setTint(m % 2 ? 0xfff3bf : 0xffe8a3).setAlpha(0.2);
            b.manchas.push({ s: mancha, bx: mancha.x, by: mancha.y, f: rnd() * 6.28, v: 0.5 + rnd() * 0.5 });
        }
        for (var k = 0; k < 4; k++) {
            var ray = scene.add.image(W * (0.05 + k * 0.17), -60, "fx-rayo").setOrigin(0.5, 0).setBlendMode(Phaser.BlendModes.ADD).setDepth(40).setTint(0xffe8a3);
            ray.setRotation(-0.5 + k * 0.05).setDisplaySize(W * 0.14, H * 1.3).setAlpha(o.rayos || 0.08);
            b.rayos.push({ s: ray, base: (o.rayos || 0.07) + (k % 2) * 0.03, f: rnd() * 6.28 });
        }
        for (var h = 0; h < 14; h++) {
            var hj = scene.add.image(rnd() * W, rnd() * H, "hoja").setDepth(38);
            hj.setTint(COLORES_HOJA[h % COLORES_HOJA.length]).setScale(0.45 + rnd() * 0.35);
            b.hojas.push({ s: hj, v: 30 + rnd() * 40, f: rnd() * 6.28, giro: (rnd() - 0.5) * 4 });
        }
        return b;
    }

    function animarBosque(b, dt, ts, fuerza) {
        var s = dt / 1000;
        var k = fuerza || 0;
        b.arboles.forEach(function (a, i) { a.rotation = Math.sin(ts * (0.9 + k * 2) + i * 1.7) * (0.012 + k * 0.03); });
        b.manchas.forEach(function (m) {
            m.s.x = m.bx + Math.sin(ts * 0.3 * m.v + m.f) * 40;
            m.s.y = m.by + Math.cos(ts * 0.25 * m.v + m.f) * 24;
        });
        b.rayos.forEach(function (r) { r.s.setAlpha(r.base * (0.75 + 0.25 * Math.sin(ts * 0.6 + r.f))); });
        b.hojas.forEach(function (h) {
            h.s.y += h.v * s;
            h.s.x += Math.sin(ts * 1.4 + h.f) * 30 * s;
            h.s.rotation += h.giro * s;
            if (h.s.y > H + 30) {
                h.s.y = -30;
                h.s.x = Math.random() * W;
            }
        });
    }

    // ------------------------------------------------------------------ escena del picnic

    var EscenaPicnic = Phaser ? class extends Phaser.Scene {
        constructor() { super({ key: "Picnic" }); }

        create() {
            prepararTexturas(this);
            tex(this, "fondo-picnic", D().fondoPicnic);
            var self = this;
            this.anim = new Animador();
            this.t = 0;
            this.arrastreOn = false;
            this.arrastrando = null;
            this.destacado = null;
            this.radio = 92;
            this.haloAyuda = true;
            this.animales = {};

            // el mismo bosque del juego del oso (no cambiar: el fondo del picnic debe verse igual)
            this.add.image(W / 2, H / 2, "fondo-picnic").setDepth(0);
            this.bosque = crearBosque(this, {
                filaY: 340,
                semilla: 2024,
                lados: [[90, 760, "rosa", 1.15], [1510, 760, "otono", 1.15]],
                decor: [
                    ["letrero", 1205, 612, 0.82], ["arbusto", 300, 600, 1.1], ["arbusto", 1420, 610, 1.0], ["hongos", 250, 760, 0.9],
                    ["hongos", 1430, 860, 0.8, 7], ["hierba", 380, 590, 1.2], ["hierba", 1080, 590, 1.1], ["hierba", 210, 860, 1.3, 7],
                    ["flor-0", 330, 820, 1.1, 7], ["flor-1", 1360, 880, 1.1, 7], ["flor-2", 470, 590, 1.0], ["flor-0", 1130, 588, 1.0], ["flor-1", 260, 640, 1.0]
                ]
            });
            // el plato, centrado abajo, es de donde salen los alimentos
            this.plato = this.add.image(PLATO.x, PLATO.y, "plato").setScale(PLATO.escala).setDepth(6);
            this.guia = this.add.graphics().setDepth(9);
            this.particulas = new Particulas(this, 44, 60);

            // cuatro piezas reutilizables: cada ronda cambia textura, id, dueño y lugar
            this.alimentos = [0, 1, 2, 3].map(function (k) {
                var base = { x: PLATO.x, y: PLATO.y - 40 };
                var sombra = self.add.image(base.x, base.y + 46, "sombra").setDisplaySize(96, 22).setAlpha(0.45).setDepth(7).setVisible(false);
                var img = self.add.image(base.x, base.y, "alimento-zanahoria").setDepth(8).setVisible(false);
                img.setScale(TAM_ALIMENTO / 128);
                img.setInteractive({
                    hitArea: new Phaser.Geom.Circle(64, 64, 80),
                    hitAreaCallback: Phaser.Geom.Circle.Contains,
                    draggable: true,
                    useHandCursor: true
                });
                var f = { k: k, id: null, tipo: null, animal: null, img: img, sombra: sombra, base: base, escala: TAM_ALIMENTO / 128, estado: "vacia" };
                img.setData("alimento", f);
                return f;
            });

            this.input.on("dragstart", this.alEmpezar, this);
            this.input.on("drag", this.alMover, this);
            this.input.on("dragend", this.alSoltar, this);
            this.events.once("shutdown", function () {
                self.input.off("dragstart", self.alEmpezar, self);
                self.input.off("drag", self.alMover, self);
                self.input.off("dragend", self.alSoltar, self);
                self.anim.limpiar();
                Object.keys(self.animales).forEach(function (t) { self.animales[t].destruir(); });
                self.animales = {};
                picnic = null;
            });

            picnic = this;
            if (esperaPicnic) {
                var res = esperaPicnic;
                esperaPicnic = null;
                res(true);
            }
        }

        /** Animales presentes en la manta, en el orden de entrada de la ronda. */
        lista() {
            var a = this.animales;
            return Object.keys(a).map(function (t) { return a[t]; });
        }

        animalPorId(id) { return this.animales[id] || null; }

        apagarAros() {
            this.lista().forEach(function (a) { a.mostrarAro(false); });
        }

        alEmpezar(p, obj) {
            var f = obj.getData("alimento");
            if (!f || !this.arrastreOn || f.estado !== "plato" || this.arrastrando) return;
            this.tomar(f);
            avisar("tomar", f.id);
        }

        alMover(p, obj, x, y) {
            var f = obj.getData("alimento");
            if (!f || f.estado !== "arrastrando" || f !== this.arrastrando) return;
            obj.x = Math.max(40, Math.min(W - 40, x));
            obj.y = Math.max(40, Math.min(H - 30, y));
            avisar("arrastrar", f.id);
        }

        alSoltar(p, obj) {
            var f = obj.getData("alimento");
            if (!f || f.estado !== "arrastrando" || f !== this.arrastrando) return;
            this.arrastrando = null;
            f.estado = "soltada";
            this.apagarAros();
            if (cb.soltar) avisar("soltar", f.id);
            else this.devolver(f);
        }

        /** Toma el alimento: crece un poco y se enciende el aro dorado del animal que lo come. */
        tomar(f) {
            f.estado = "arrastrando";
            this.arrastrando = f;
            f.img.setDepth(50);
            f.sombra.setVisible(false);
            var e0 = f.img.scaleX, e1 = f.escala * 1.18;
            this.anim.agregar(140, function (u) { f.img.setScale(lerp(e0, e1, u)); });
            this.apagarAros();
            var a = this.animalPorId(f.animal);
            if (a) a.mostrarAro(true);
        }

        update(time, delta) {
            var dt = Math.min(delta, 60);
            this.t += dt;
            var ts = this.t / 1000;
            var self = this;
            this.anim.update(dt);
            this.lista().forEach(function (a) {
                a.radioAro = self.radio;
                a.update(dt);
            });
            this.particulas.update(dt);
            animarBosque(this.bosque, dt, ts, 0);
            // los alimentos del plato respiran un poquito para invitar a tomarlos
            this.alimentos.forEach(function (f, i) {
                if (f.estado === "plato") f.img.y = f.base.y + Math.sin(ts * 2.4 + i) * 2.5;
            });
            // el aro brilla más cuando el alimento arrastrado está cerca de la boca de su dueño
            if (this.arrastrando) {
                var a = this.animalPorId(this.arrastrando.animal);
                if (a) {
                    var b = a.puntoBoca();
                    var d = Math.hypot(this.arrastrando.img.x - b.x, this.arrastrando.img.y - b.y);
                    a.resaltarAro(d < this.radio * 1.35);
                }
            }
            this.dibujarGuia(ts);
        }

        /** Ayuda visual: halo bajo el alimento sugerido y caminito de puntos hasta la boca de su dueño. */
        dibujarGuia(ts) {
            var g = this.guia;
            g.clear();
            var f = this.destacado;
            if (!f || f.estado !== "plato" || !this.haloAyuda) return;
            var a = this.animalPorId(f.animal);
            if (!a) return;
            var pulso = 0.5 + 0.5 * Math.sin(ts * 5);
            g.lineStyle(7, 0xfff3bf, 0.5 + pulso * 0.4);
            g.strokeCircle(f.img.x, f.img.y, 66 + pulso * 8);
            var b = a.puntoBoca();
            var cx = (f.img.x + b.x) / 2 + (b.x < f.img.x ? -80 : 80), cy = Math.min(f.img.y, b.y) - 40;
            for (var i = 1; i < 14; i++) {
                var u = i / 14;
                var x = (1 - u) * (1 - u) * f.img.x + 2 * (1 - u) * u * cx + u * u * b.x;
                var y = (1 - u) * (1 - u) * f.img.y + 2 * (1 - u) * u * cy + u * u * b.y;
                var vis = ((u * 14 - ts * 6) % 3 + 3) % 3 < 1.6;
                g.fillStyle(0xffffff, vis ? 0.95 : 0.45);
                g.fillCircle(x, y, vis ? 7 : 5);
            }
        }

        alimentoPorId(id) {
            for (var i = 0; i < this.alimentos.length; i++) if (this.alimentos[i].id === id) return this.alimentos[i];
            return null;
        }

        /** Crea un animal en su lugar fijo de la manta (cada uno conserva su lugar entre rondas). */
        crearAnimal(tipo) {
            var l = LUGARES[tipo];
            var a = global.AnimalesPicnic.crear(tipo, this, l.x, l.y, this.anim, l.esc);
            a.setDepth(5 + l.y / 1000);
            a.pulsoAroMs = Number(cfg && cfg.juego && cfg.juego.aroPulsoMs) || 1200;
            a.alMasticar = function (k) { evento("mastica", { animal: tipo, k: k }); };
            this.animales[tipo] = a;
            return a;
        }

        /**
         * Prepara la ronda: se van los animales que no juegan, los que siguen se quedan en su lugar, los nuevos
         * llegan saltando y se sientan, y los alimentos caen en el plato uno tras otro.
         * piezas: [{ id, tipo, animal }] de ReglasPicnic.piezasRonda.
         */
        cargarRonda(idx, piezas) {
            var self = this;
            var tipos = R().animalesRonda(cfg, idx);
            var promesas = [];
            Object.keys(this.animales).forEach(function (t) {
                if (tipos.indexOf(t) >= 0) {
                    self.animales[t].reiniciar();
                    return;
                }
                var a = self.animales[t];
                delete self.animales[t];
                promesas.push(a.salir(a.x0 < W / 2 ? -260 : W + 260, 800).then(function () { a.destruir(); }));
            });
            var nuevos = tipos.filter(function (t) { return !self.animales[t]; });
            nuevos.forEach(function (t, i) {
                var a = self.crearAnimal(t);
                var desde = LUGARES[t].x < W / 2 ? -240 : W + 240;
                a.c.x = desde;
                promesas.push(new Promise(function (r) { setTimeout(r, i * 280); }).then(function () {
                    evento("llega", t);
                    return a.entrar(desde, 1100);
                }));
            });

            var lista = piezas.map(function (p, k) {
                return typeof p === "string" ? { id: R().idAlimento(idx, k, p), tipo: p, animal: R().animalDe(cfg, p) } : p;
            });
            var lug = RANURAS[Math.min(4, Math.max(1, lista.length))];
            this.alimentos.forEach(function (f) {
                f.estado = "vacia";
                f.id = null;
                f.img.setVisible(false);
                f.sombra.setVisible(false);
            });
            var retraso = nuevos.length ? 500 : 0;
            lista.forEach(function (p, k) {
                var f = self.alimentos[k];
                var dx = lug[k];
                f.base = { x: PLATO.x + dx, y: PLATO.y - 44 + Math.abs(dx) * 0.04 };
                f.escala = TAM_ALIMENTO / 128;
                f.id = p.id;
                f.tipo = p.tipo;
                f.animal = p.animal;
                f.estado = "cayendo";
                f.prof = 8 + k * 0.01;
                f.sombra.setPosition(f.base.x, f.base.y + TAM_ALIMENTO * 0.4).setDisplaySize(TAM_ALIMENTO * 0.82, 20);
                f.img.setTexture("alimento-" + p.tipo).setScale(f.escala).setAlpha(1).setDepth(f.prof).setVisible(true);
                f.img.setPosition(f.base.x, f.base.y - 320);
                f.sombra.setVisible(true).setAlpha(0);
                promesas.push(new Promise(function (res) { setTimeout(res, retraso + k * 130); }).then(function () {
                    evento("aparece");
                    return self.anim.agregar(560, function (u) {
                        var y;
                        if (u < 0.7) y = lerp(f.base.y - 320, f.base.y, (u / 0.7) * (u / 0.7));
                        else y = f.base.y - 26 * Math.sin(((u - 0.7) / 0.3) * Math.PI);
                        f.img.y = y;
                        f.sombra.setAlpha(0.45 * u);
                    });
                }).then(function () { f.estado = "plato"; }));
            });
            return Promise.all(promesas);
        }

        vaciar() {
            this.alimentos.forEach(function (f) {
                f.estado = "vacia";
                f.id = null;
                f.img.setVisible(false);
                f.sombra.setVisible(false);
            });
            this.destacado = null;
            this.arrastrando = null;
            this.apagarAros();
        }

        /** El alimento vuela a la boca de su dueño (siguiéndola) y el animal come a su manera. */
        async entregar(f) {
            var self = this;
            var a = this.animalPorId(f.animal);
            f.estado = "entregando";
            this.destacado = null;
            this.apagarAros();
            if (!a) {
                f.img.setVisible(false);
                f.estado = "entregada";
                return;
            }
            a.ocupado = true;
            var x0 = f.img.x, y0 = f.img.y, e0 = f.img.scaleX;
            await this.anim.agregar(300, function (u) {
                var b = a.puntoBoca();
                var k = suave(u);
                f.img.x = lerp(x0, b.x, k);
                f.img.y = lerp(y0, b.y, k) - Math.sin(u * Math.PI) * 30;
                f.img.setScale(e0 * (1 - 0.72 * k));
                f.img.setAlpha(u < 0.75 ? 1 : 1 - (u - 0.75) / 0.25);
            });
            f.img.setVisible(false);
            f.sombra.setVisible(false);
            f.estado = "entregada";
            evento("entra", f.animal);
            var b = a.puntoBoca();
            this.particulas.emitir(b.x, b.y - 20, { n: 14, tipos: ["corazon", "estrella", "chispa"], vel: 300, grav: -60, vida: 1300, escala: 0.75, angulo: -Math.PI / 2, apertura: 2.6 });
            await a.comer();
            evento("feliz", f.animal);
            var arriba = a.puntoArriba();
            this.particulas.emitir(arriba.x, arriba.y, { n: 8, tipos: ["corazon", "corazon-lila"], vel: 120, grav: -90, vida: 1500, escala: 0.6, angulo: -Math.PI / 2, apertura: 1.4 });
        }

        /** El alimento llegó a la boca de otro animal: ese animal niega con la cabeza y el alimento vuelve. */
        async rechazar(f, idAnimal) {
            var a = this.animalPorId(idAnimal);
            this.apagarAros();
            evento("niega", idAnimal);
            await Promise.all([a ? a.negar() : Promise.resolve(), this.devolver(f)]);
        }

        /** El alimento rebota suavemente y vuelve a su lugar en el plato. */
        async devolver(f) {
            f.estado = "volviendo";
            var x0 = f.img.x, y0 = f.img.y, e0 = f.img.scaleX;
            await this.anim.agregar(560, function (u) {
                var k = suave(u);
                f.img.x = lerp(x0, f.base.x, k);
                f.img.y = lerp(y0, f.base.y, k) - Math.sin(u * Math.PI) * 70;
                f.img.setScale(lerp(e0, f.escala, k));
            });
            evento("rebote");
            await this.anim.agregar(260, function (u) {
                var s = Math.sin(u * Math.PI);
                f.img.setScale(f.escala * (1 + 0.14 * s), f.escala * (1 - 0.14 * s));
                f.img.y = f.base.y - 18 * Math.sin(u * Math.PI);
            });
            f.img.setScale(f.escala).setDepth(f.prof || 8);
            f.sombra.setVisible(true).setAlpha(0.45);
            f.estado = "plato";
        }

        async celebrarRonda() {
            var self = this;
            await Promise.all(this.lista().map(function (a, i) {
                var p = a.puntoArriba();
                self.particulas.emitir(p.x, p.y, { n: 10, tipos: ["corazon", "estrella", "corazon-lila", "chispa"], vel: 380, grav: 260, vida: 1400, escala: 0.75 });
                return new Promise(function (r) { setTimeout(r, i * 120); }).then(function () { return a.celebrar(); });
            }));
        }
    } : null;

    // ------------------------------------------------------------------ escena final independiente

    /** Alimento que cada animal levanta en la fiesta: el de la última ronda en que comió. */
    var ALIMENTO_FIESTA = { conejo: "manzana", perro: "croqueta", pajaro: "maiz", oso: "miel" };
    var LUGARES_FIESTA = {
        pajaro: { x: 455, y: 716, esc: 1.04 },
        conejo: { x: 690, y: 726, esc: 1.04 },
        perro: { x: 925, y: 726, esc: 1.04 },
        oso: { x: 1165, y: 720, esc: 1.04 }
    };

    var EscenaFiesta = Phaser ? class extends Phaser.Scene {
        constructor() { super({ key: "Fiesta" }); }

        create() {
            prepararTexturas(this);
            tex(this, "fondo-fiesta", D().fondoFiesta);
            tex(this, "banderines", D().banderines);
            var self = this;
            this.anim = new Animador();
            this.t = 0;
            this.reaccion = 0;
            this.lluviaOn = false;
            this.tLluvia = 0;
            this.levanta = 0;
            this.add.image(W / 2, H / 2, "fondo-fiesta").setDepth(0);
            this.bosque = crearBosque(this, {
                filaY: 380,
                semilla: 777,
                rayos: 0.12,
                lados: [[100, 800, "verde", 1.3], [1500, 800, "rosa", 1.3]],
                decor: [["arbusto", 330, 640, 1.0], ["arbusto", 1270, 640, 1.0], ["hongos", 1400, 900, 0.9, 7], ["hierba", 200, 900, 1.3, 7]]
            });
            this.banderines = this.add.image(W / 2, 2, "banderines").setOrigin(0.5, 0).setDepth(3);
            this.flores = [[560, 905, 1], [1060, 905, 2], [250, 880, 1], [1350, 880, 2]].map(function (f) {
                return self.add.image(f[0], f[1], "flor-" + f[2]).setOrigin(0.5, 1).setDepth(7);
            });
            this.plato = this.add.image(1290, 850, "plato").setScale(0.55).setDepth(6);
            // los cuatro animales del juego, en el mismo orden que en el picnic
            this.animales = ["pajaro", "conejo", "perro", "oso"].map(function (t, i) {
                var l = LUGARES_FIESTA[t];
                var a = global.AnimalesPicnic.crear(t, self, l.x, l.y, self.anim, l.esc * (LUGARES[t] ? LUGARES[t].esc : 1));
                a.setDepth(5 + l.y / 1000);
                a.fase = i * 1.3;
                a.alMasticar = function (k) { evento("mastica", { animal: t, k: k }); };
                a.comida = self.add.image(l.x, l.y - 300, "alimento-" + ALIMENTO_FIESTA[t]).setScale(0.62).setDepth(20).setVisible(false);
                return a;
            });
            this.particulas = new Particulas(this, 80, 60);
            this.events.once("shutdown", function () {
                self.anim.limpiar();
                self.animales.forEach(function (a) { a.comida.destroy(); a.destruir(); });
                fiesta = null;
            });
            fiesta = this;
            // Fundido cruzado: la fiesta aparece poco a poco encima del picnic (sin pantalla en blanco);
            // al terminar se apaga el picnic que quedó debajo.
            var cam = this.cameras.main;
            if (cam.setAlpha) cam.setAlpha(0);
            this.anim.agregar(700, function (u) { if (cam.setAlpha) cam.setAlpha(u * u * (3 - 2 * u)); }).then(function () {
                if (cam.setAlpha) cam.setAlpha(1);
                if (self.scene.isActive("Picnic")) self.scene.stop("Picnic");
                if (esperaFiesta) {
                    var res = esperaFiesta;
                    esperaFiesta = null;
                    res(true);
                }
            });
        }

        update(time, delta) {
            var dt = Math.min(delta, 60);
            this.t += dt;
            var ts = this.t / 1000;
            var self = this;
            this.anim.update(dt);
            this.animales.forEach(function (a) {
                a.update(dt);
                // cada uno levanta su alimento por encima de la cabeza
                var p = a.puntoArriba();
                a.comida.setVisible(self.levanta > 0.03);
                a.comida.setPosition(p.x, p.y - 30 - self.levanta * 70);
                a.comida.rotation = Math.sin(ts * 6 + a.fase) * 0.2 * self.levanta;
                a.comida.setAlpha(Math.min(1, self.levanta * 3));
            });
            this.particulas.update(dt);
            var r = this.reaccion;
            animarBosque(this.bosque, dt, ts, r);
            this.banderines.y = 2 + Math.sin(ts * 3) * 4 * r;
            this.banderines.rotation = Math.sin(ts * 2.2) * 0.008 * r;
            this.plato.y = 850 - Math.abs(Math.sin(ts * 7 + 1)) * 14 * r;
            this.plato.rotation = Math.sin(ts * 7) * 0.06 * r;
            this.flores.forEach(function (f, i) {
                var s = Math.sin(ts * 6 + i * 0.9);
                f.setScale(1 + 0.06 * s * r, 1 - 0.1 * s * r);
                f.rotation = Math.sin(ts * 3 + i) * 0.12 * r;
            });
            // lluvia de hojas de colores y pétalos
            if (this.lluviaOn) {
                this.tLluvia += dt;
                while (this.tLluvia > 110) {
                    this.tLluvia -= 110;
                    this.particulas.emitir(Math.random() * W, -30, {
                        n: 2, tipos: ["hoja", "hoja", "petalo-0", "petalo-1", "petalo-2"], tintes: COLORES_HOJA,
                        vel: 50, vy: 90, grav: 30, vida: 7000, escala: 0.8, giro: 5, dispersion: 80
                    });
                }
            }
        }

        bailar(on) {
            this.animales.forEach(function (a) { a.baile = on ? 1 : 0; });
        }

        /** Todos levantan su alimento con destellos (y lo bajan). */
        levantarAlimentos(ms) {
            var self = this;
            this.animales.forEach(function (a) {
                var p = a.puntoArriba();
                self.particulas.emitir(p.x, p.y - 90, { n: 6, tipos: ["chispa", "estrella"], vel: 160, grav: 80, vida: 900, escala: 0.5 });
            });
            return this.anim.agregar(ms || 900, function (u) { self.levanta = Math.sin(u * Math.PI); }).then(function () { self.levanta = 0; });
        }

        saludar() {
            var self = this;
            return this.anim.agregar(1800, function (u) {
                var s = Math.sin(u * Math.PI * 6);
                self.animales.forEach(function (a) {
                    if (a.saludo) a.saludo(s);
                    else {
                        a.giroCabeza = s * 0.12;
                        if (a.alCelebrar) a.alCelebrar(0.5 + 0.5 * s);
                    }
                });
            }).then(function () {
                self.animales.forEach(function (a) {
                    a.giroCabeza = 0;
                    if (a.alCelebrar) a.alCelebrar(0);
                });
            });
        }

        /**
         * Los cuatro terminan de comer a su manera; caen hojas y pétalos; se levantan y bailan cuatro tiempos;
         * en los tiempos 2 y 4 levantan su alimento; al final todos saludan.
         */
        async secuencia() {
            var self = this;
            var oso = this.animales[3];
            evento("final-come");
            await Promise.all(this.animales.map(function (a) { return a.terminarDeComer(); }));
            evento("final-amigos");
            this.lluviaOn = true;
            await this.anim.agregar(500, function () {});
            evento("final-levanta");
            await Promise.all(this.animales.map(function (a) { return a.ponerseDePie ? a.ponerseDePie() : a.saltar(1); }));
            evento("final-fiesta");
            this.bailar(true);
            await this.anim.agregar(500, function (u) { self.reaccion = u; });
            for (var i = 0; i < 4; i++) {
                evento("final-salto", i);
                this.animales.forEach(function (a) {
                    var p = a.puntoArriba();
                    self.particulas.emitir(p.x, p.y - 40, { n: 5, tipos: ["corazon", "corazon-lila", "estrella", "chispa"], vel: 340, grav: 240, vida: 1300, escala: 0.7 });
                });
                var saltos = this.animales.map(function (a) { return a.saltar(1); });
                if (i % 2 === 1) {
                    evento("final-frutas");
                    saltos.push(this.levantarAlimentos(900));
                }
                await Promise.all(saltos);
            }
            evento("final-saludo");
            await this.saludar();
            this.animales.forEach(function (a) { a.ojos = "feliz"; });
            void oso;
        }

        detener() {
            this.lluviaOn = false;
            this.bailar(false);
        }
    } : null;

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

    function crearJuego() {
        juego = new Phaser.Game({
            type: Phaser.AUTO,
            parent: el,
            transparent: false,
            backgroundColor: "#7cc24a",
            banner: false,
            scale: { mode: Phaser.Scale.ENVELOP, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
            input: { activePointers: 1 },
            render: { antialias: true },
            scene: [EscenaPicnic, EscenaFiesta]
        });
        global.__escenarioPicnic = juego;
    }

    // ------------------------------------------------------------------ API pública

    function alimento(id) { return picnic ? picnic.alimentoPorId(id) : null; }

    var EscenarioPicnic = {
        montar: function (contenedor, config) {
            el = contenedor;
            cfg = config;
            if (!Phaser || !el) return Promise.resolve(false);
            // los dibujos SVG se rasterizan antes de crear el juego (las escenas los usan como texturas)
            return D().preparar().then(function () {
                return new Promise(function (resolve) {
                    esperaPicnic = resolve;
                    crearJuego();
                    setTimeout(function () {
                        if (esperaPicnic === resolve) {
                            esperaPicnic = null;
                            resolve(!!picnic);
                        }
                    }, 8000);
                });
            });
        },
        listo: function () { return !!picnic; },
        enFiesta: function () { return !!fiesta; },
        juego: function () { return juego; },
        al: function (nombre, fn) { if (nombre in cb) cb[nombre] = fn; },
        reacomodar: function () { if (juego) juego.scale.refresh(); },
        aPantalla: aPantalla,
        aMundo: aMundo,

        /** Animales presentes (en el picnic, o los de la fiesta). */
        animales: function () { return picnic ? picnic.lista() : (fiesta ? fiesta.animales.slice() : []); },
        animal: function (id) { return picnic ? picnic.animalPorId(id) : null; },
        /** Bocas de los animales presentes en coordenadas del mundo: [{ id, x, y }] (lo que pide evaluarEntrega). */
        bocas: function () {
            if (!picnic) return [];
            return picnic.lista().map(function (a) {
                var b = a.puntoBoca();
                return { id: a.tipo, x: b.x, y: b.y };
            });
        },
        arrastre: function (on) { if (picnic) picnic.arrastreOn = !!on; },
        /** Compatibilidad con el flujo del juego base: aquí los animales no tienen ciclo propio que encender. */
        activar: function () {},
        haloAyuda: function (on) { if (picnic) picnic.haloAyuda = !!on; },
        radio: function (r) { if (picnic) picnic.radio = r; },
        reiniciarAnimales: function () { if (picnic) picnic.lista().forEach(function (a) { a.reiniciar(); }); },

        cargarRonda: function (idx, piezas) { return picnic ? picnic.cargarRonda(idx, piezas) : Promise.resolve(); },
        vaciar: function () { if (picnic) picnic.vaciar(); },
        /** Ids de los alimentos que siguen en el plato, en el orden en que quedaron mezclados. */
        alimentosEnPlato: function () {
            return picnic ? picnic.alimentos.filter(function (f) { return f.estado === "plato"; }).map(function (f) { return f.id; }) : [];
        },
        tipoDe: function (id) {
            var f = alimento(id);
            return f ? f.tipo : null;
        },
        /** Datos para decidir una entrega (coordenadas del mundo). */
        estado: function (id) {
            var f = alimento(id);
            if (!f) return null;
            return {
                alimento: { x: f.img.x, y: f.img.y },
                tipo: f.tipo,
                animal: f.animal,
                entregada: f.estado === "entregada" || f.estado === "entregando"
            };
        },
        rechazar: function (id, idAnimal) {
            var f = alimento(id);
            return f ? picnic.rechazar(f, idAnimal) : Promise.resolve();
        },
        entregar: function (id) {
            var f = alimento(id);
            return f ? picnic.entregar(f) : Promise.resolve();
        },
        devolver: function (id) {
            var f = alimento(id);
            if (picnic) picnic.apagarAros();
            return f ? picnic.devolver(f) : Promise.resolve();
        },
        destacar: function (id) {
            if (!picnic) return;
            picnic.destacado = id ? picnic.alimentoPorId(id) : null;
        },
        celebrarRonda: function () { return picnic ? picnic.celebrarRonda() : Promise.resolve(); },

        // demo: la mano mueve un alimento por código
        tomarDemo: function (id) {
            var f = alimento(id);
            if (f && f.estado === "plato") picnic.tomar(f);
        },
        moverDemo: function (id, sx, sy) {
            var f = alimento(id);
            if (!f) return;
            var p = aMundo(sx, sy);
            f.img.setPosition(p.x, p.y);
            var a = picnic.animalPorId(f.animal);
            if (a) {
                var b = a.puntoBoca();
                a.resaltarAro(Math.hypot(p.x - b.x, p.y - b.y) < picnic.radio * 1.35);
            }
        },
        soltarDemo: function (id) {
            var f = alimento(id);
            if (!f) return;
            picnic.arrastrando = null;
            f.estado = "soltada";
        },

        /** Punto en pantalla de un alimento. */
        puntoDe: function (id) {
            var f = alimento(id);
            return f ? aPantalla(f.img.x, f.img.y) : null;
        },
        /** Punto en pantalla de la boca de un animal. */
        puntoBocaDe: function (idAnimal) {
            var a = picnic && picnic.animalPorId(idAnimal);
            if (!a) return null;
            var b = a.puntoBoca();
            return aPantalla(b.x, b.y);
        },
        /** Caja en pantalla para Zoe 3D (abajo a la izquierda, sobre el prado). */
        zonaZoe: function () {
            if (!el) return null;
            var r = el.getBoundingClientRect();
            var h = Math.min(r.height * 0.5, 430);
            var w = h * 0.62;
            return { left: r.left + Math.max(12, r.width * 0.035), top: r.bottom - h - r.height * 0.05, width: w, height: h };
        },

        irFiesta: function () {
            if (!juego) return Promise.resolve(false);
            return new Promise(function (resolve) {
                esperaFiesta = resolve;
                // run: arranca la fiesta sin detener el picnic (se detiene tras el fundido cruzado)
                juego.scene.run("Fiesta");
                setTimeout(function () {
                    if (esperaFiesta === resolve) {
                        esperaFiesta = null;
                        resolve(!!fiesta);
                    }
                }, 5000);
            });
        },
        secuenciaFiesta: function () { return fiesta ? fiesta.secuencia() : Promise.resolve(); },
        detenerFiesta: function () { if (fiesta) fiesta.detener(); },
        volverPicnic: function () {
            if (!juego) return Promise.resolve(false);
            if (picnic && !fiesta) return Promise.resolve(true);
            var f = fiesta;
            return new Promise(function (resolve) {
                // el picnic se arma debajo y la fiesta se desvanece encima (sin pantalla en blanco)
                esperaPicnic = function () {
                    if (!f || !f.anim) {
                        juego.scene.stop("Fiesta");
                        resolve(true);
                        return;
                    }
                    var cam = f.cameras.main;
                    f.anim.agregar(600, function (u) { if (cam.setAlpha) cam.setAlpha(1 - u); }).then(function () {
                        juego.scene.stop("Fiesta");
                        resolve(true);
                    });
                };
                juego.scene.run("Picnic");
                setTimeout(function () {
                    if (esperaPicnic) {
                        esperaPicnic = null;
                        juego.scene.stop("Fiesta");
                        resolve(!!picnic);
                    }
                }, 5000);
            });
        }
    };

    global.EscenarioPicnic = EscenarioPicnic;
})(window);
