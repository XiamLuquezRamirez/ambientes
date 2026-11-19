/**
 * EscenarioComer — escenas Phaser 4 de "¡La Hora de Comer!" (window.EscenarioComer).
 * La escena dibuja, anima y avisa; no decide (reglas.js decide y script.js ordena el flujo).
 *
 *   Escena "Picnic": bosque, manta, osito (OsoComer), plato con cuatro frutas que se arrastran.
 *   Escena "Fiesta": escena final independiente; el osito se levanta, salta y el picnic celebra.
 *
 * Mundo de diseño 1600 × 900 con Scale.ENVELOP (llena la pantalla; lo importante va en el centro).
 * Todas las animaciones esperadas devuelven Promise con respaldo por tiempo (Animador).
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser || null;
    var D = function () { return global.DibujosComer; };
    var R = function () { return global.ReglasComer; };
    var W = 1600, H = 900;
    var PLATO = { x: 800, y: 812 };
    var RANURAS = [{ x: -170, y: -16 }, { x: -58, y: -6 }, { x: 58, y: -6 }, { x: 170, y: -16 }];
    var TAM_FRUTA = 116;

    /** Lugares en el plato según cuántas piezas hay: una fila de 4 o dos filas (atrás y adelante) de 5-6. */
    function lugaresPlato(n) {
        if (n <= 4) {
            return { plato: 1, tam: TAM_FRUTA, pos: RANURAS.slice(0, n).map(function (r) { return { x: r.x, y: r.y, prof: 8 }; }) };
        }
        var atras = n === 5 ? [-78, 78] : [-118, 0, 118];
        var adelante = [-176, -58, 58, 176].slice(0, n - atras.length);
        if (adelante.length === 3) adelante = [-160, 0, 160];
        return {
            plato: 1.2,
            tam: 102,
            pos: atras.map(function (x) { return { x: x, y: -40, prof: 7.8 }; })
                .concat(adelante.map(function (x, i) { return { x: x, y: 8 + (Math.abs(x) > 150 ? -8 : 0), prof: 8 + i * 0.01 }; }))
        };
    }
    var OSO = { x: 800, y: 640 };

    var juego = null, el = null, cfg = null;
    var picnic = null, fiesta = null;
    var esperaPicnic = null, esperaFiesta = null;
    var cb = { tomar: null, arrastrar: null, soltar: null, evento: null };

    function avisar(nombre, a, b) {
        var f = cb[nombre];
        if (typeof f === "function") {
            try { f(a, b); } catch (e) { console.warn("[EscenarioComer]", nombre, e); }
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

    function prepararTexturas(scene) {
        var d = D();
        d.tiposArbol.forEach(function (t) { tex(scene, "arbol-" + t, function () { return d.arbol(t); }); });
        tex(scene, "cesta", d.cesta);
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
        tex(scene, "oso-cuerpo", d.osoCuerpo);
        tex(scene, "oso-cabeza", d.osoCabeza);
        tex(scene, "oso-brazo", d.osoBrazo);
        tex(scene, "oso-pie", d.osoPie);
        tex(scene, "oso-pierna", d.osoPierna);
        d.tiposFruta.forEach(function (t) { tex(scene, "fruta-" + t, function () { return d.fruta(t); }); });
        d.tiposObjeto.forEach(function (t) { tex(scene, "objeto-" + t, function () { return d.objeto(t); }); });
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
            this.cesta = this.add.image(1300, 770, "cesta").setOrigin(0.5, 1).setScale(0.9).setDepth(3);
            this.oso = new global.OsoComer(this, OSO.x, OSO.y, this.anim);
            this.oso.c.setDepth(5);
            this.oso.alAbrir = function () { evento("abre"); };
            this.oso.alMasticar = function (k) { evento("mastica", k); };
            this.oso.mostrarHalo(true);
            this.plato = this.add.image(PLATO.x, PLATO.y, "plato").setDepth(6);
            this.guia = this.add.graphics().setDepth(9);
            this.particulas = new Particulas(this, 44, 60);

            // seis piezas reutilizables (frutas u objetos que no se comen): cada ronda cambia textura, id y lugar
            this.frutas = [0, 1, 2, 3, 4, 5].map(function (k) {
                var r = RANURAS[k % RANURAS.length];
                var base = { x: PLATO.x + r.x, y: PLATO.y + r.y - 40 };
                var sombra = self.add.image(base.x, base.y + 46, "sombra").setDisplaySize(96, 22).setAlpha(0.45).setDepth(7).setVisible(false);
                var img = self.add.image(base.x, base.y, "fruta-manzana").setDepth(8).setVisible(false);
                img.setScale(TAM_FRUTA / 128);
                img.setInteractive({
                    hitArea: new Phaser.Geom.Circle(64, 64, 80),
                    hitAreaCallback: Phaser.Geom.Circle.Contains,
                    draggable: true,
                    useHandCursor: true
                });
                var f = { k: k, id: null, tipo: null, img: img, sombra: sombra, base: base, escala: TAM_FRUTA / 128, estado: "vacia" };
                img.setData("fruta", f);
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
                picnic = null;
            });

            picnic = this;
            if (esperaPicnic) {
                var res = esperaPicnic;
                esperaPicnic = null;
                res(true);
            }
        }

        alEmpezar(p, obj) {
            var f = obj.getData("fruta");
            if (!f || !this.arrastreOn || f.estado !== "plato" || this.arrastrando) return;
            this.tomar(f);
            avisar("tomar", f.id);
        }

        alMover(p, obj, x, y) {
            var f = obj.getData("fruta");
            if (!f || f.estado !== "arrastrando" || f !== this.arrastrando) return;
            obj.x = Math.max(40, Math.min(W - 40, x));
            obj.y = Math.max(40, Math.min(H - 30, y));
            avisar("arrastrar", f.id);
        }

        alSoltar(p, obj) {
            var f = obj.getData("fruta");
            if (!f || f.estado !== "arrastrando" || f !== this.arrastrando) return;
            this.arrastrando = null;
            f.estado = "soltada";
            this.oso.resaltarHalo(false);
            if (cb.soltar) avisar("soltar", f.id);
            else this.devolver(f);
        }

        tomar(f) {
            f.estado = "arrastrando";
            this.arrastrando = f;
            f.img.setDepth(50);
            f.sombra.setVisible(false);
            var e0 = f.img.scaleX, e1 = f.escala * 1.18;
            this.anim.agregar(140, function (u) { f.img.setScale(lerp(e0, e1, u)); });
        }

        update(time, delta) {
            var dt = Math.min(delta, 60);
            this.t += dt;
            var ts = this.t / 1000;
            this.anim.update(dt);
            this.oso.update(dt);
            this.particulas.update(dt);
            animarBosque(this.bosque, dt, ts, 0);
            // las frutas del plato respiran un poquito para invitar a tomarlas
            this.frutas.forEach(function (f, i) {
                if (f.estado === "plato") f.img.y = f.base.y + Math.sin(ts * 2.4 + i) * 2.5;
            });
            // la boca brilla más cuando la fruta arrastrada está cerca
            if (this.arrastrando) {
                var b = this.oso.puntoBoca();
                var d = Math.hypot(this.arrastrando.img.x - b.x, this.arrastrando.img.y - b.y);
                this.oso.resaltarHalo(d < this.radio * 1.35);
            }
            this.oso.mostrarHalo(this.haloAyuda);
            this.dibujarGuia(ts);
        }

        /** Ayuda visual: halo bajo la fruta sugerida y caminito de puntos hasta la boca. */
        dibujarGuia(ts) {
            var g = this.guia;
            g.clear();
            var f = this.destacado;
            if (!f || f.estado !== "plato") return;
            var pulso = 0.5 + 0.5 * Math.sin(ts * 5);
            g.lineStyle(7, 0xfff3bf, 0.5 + pulso * 0.4);
            g.strokeCircle(f.img.x, f.img.y, 66 + pulso * 8);
            var b = this.oso.puntoBoca();
            var cx = (f.img.x + b.x) / 2 + 120, cy = Math.min(f.img.y, b.y) - 40;
            for (var i = 1; i < 14; i++) {
                var u = i / 14;
                var x = (1 - u) * (1 - u) * f.img.x + 2 * (1 - u) * u * cx + u * u * b.x;
                var y = (1 - u) * (1 - u) * f.img.y + 2 * (1 - u) * u * cy + u * u * b.y;
                var vis = ((u * 14 - ts * 6) % 3 + 3) % 3 < 1.6;
                g.fillStyle(0xffffff, vis ? 0.95 : 0.45);
                g.fillCircle(x, y, vis ? 7 : 5);
            }
        }

        frutaPorId(id) {
            for (var i = 0; i < this.frutas.length; i++) if (this.frutas[i].id === id) return this.frutas[i];
            return null;
        }

        /**
         * Coloca las piezas de la ronda (frutas y objetos que no se comen): caen al plato una tras otra.
         * piezas: [{ id, tipo, fruta }] (o, por compatibilidad, una lista de tipos de fruta).
         */
        cargarRonda(idx, piezas) {
            var self = this;
            var lista = piezas.map(function (p, k) {
                return typeof p === "string" ? { id: R().idFruta(idx, k, p), tipo: p, fruta: true } : p;
            });
            var lug = lugaresPlato(lista.length);
            this.plato.setScale(lug.plato);
            this.frutas.forEach(function (f) {
                f.estado = "vacia";
                f.id = null;
                f.img.setVisible(false);
                f.sombra.setVisible(false);
            });
            var promesas = lista.map(function (p, k) {
                var f = self.frutas[k];
                var l = lug.pos[k];
                f.base = { x: PLATO.x + l.x, y: PLATO.y + l.y - 40 };
                f.escala = lug.tam / 128;
                f.id = p.id;
                f.tipo = p.tipo;
                f.esFruta = p.fruta !== false;
                f.estado = "cayendo";
                f.sombra.setPosition(f.base.x, f.base.y + lug.tam * 0.4).setDisplaySize(lug.tam * 0.82, 20);
                f.img.setTexture((f.esFruta ? "fruta-" : "objeto-") + p.tipo).setScale(f.escala).setAlpha(1).setDepth(l.prof).setVisible(true);
                f.prof = l.prof;
                f.img.setPosition(f.base.x, f.base.y - 320);
                f.sombra.setVisible(true).setAlpha(0);
                return new Promise(function (res) { setTimeout(res, k * 130); }).then(function () {
                    evento("aparece");
                    return self.anim.agregar(560, function (u) {
                        var y;
                        if (u < 0.7) y = lerp(f.base.y - 320, f.base.y, (u / 0.7) * (u / 0.7));
                        else y = f.base.y - 26 * Math.sin(((u - 0.7) / 0.3) * Math.PI);
                        f.img.y = y;
                        f.sombra.setAlpha(0.45 * u);
                    });
                }).then(function () { f.estado = "plato"; });
            });
            return Promise.all(promesas);
        }

        vaciar() {
            this.frutas.forEach(function (f) {
                f.estado = "vacia";
                f.id = null;
                f.img.setVisible(false);
                f.sombra.setVisible(false);
            });
            this.destacado = null;
            this.arrastrando = null;
        }

        /** La fruta vuela a la boca (siguiéndola), el osito la recibe y come. */
        async entregar(f) {
            var self = this;
            f.estado = "entregando";
            this.destacado = null;
            this.oso.ocupado = true;
            this.oso.resaltarHalo(false);
            var x0 = f.img.x, y0 = f.img.y, e0 = f.img.scaleX;
            await this.anim.agregar(300, function (u) {
                var b = self.oso.puntoBoca();
                var k = suave(u);
                f.img.x = lerp(x0, b.x, k);
                f.img.y = lerp(y0, b.y, k) - Math.sin(u * Math.PI) * 30;
                f.img.setScale(e0 * (1 - 0.72 * k));
                f.img.setAlpha(u < 0.75 ? 1 : 1 - (u - 0.75) / 0.25);
            });
            f.img.setVisible(false);
            f.estado = "entregada";
            evento("entra");
            var b = this.oso.puntoBoca();
            this.particulas.emitir(b.x, b.y - 20, { n: 14, tipos: ["corazon", "estrella", "chispa"], vel: 300, grav: -60, vida: 1300, escala: 0.75, angulo: -Math.PI / 2, apertura: 2.6 });
            await this.oso.comer();
            evento("feliz");
            this.particulas.emitir(this.oso.c.x, OSO.y - 330, { n: 8, tipos: ["corazon", "corazon-lila"], vel: 120, grav: -90, vida: 1500, escala: 0.6, angulo: -Math.PI / 2, apertura: 1.4 });
        }

        /** Un objeto que no se come llega a la boca: el osito cierra la boca, niega con la cabeza y el objeto vuelve. */
        async rechazar(f) {
            this.oso.resaltarHalo(false);
            evento("niega");
            await Promise.all([this.oso.negar(), this.devolver(f)]);
        }

        /** La fruta rebota suavemente y vuelve a su lugar en el plato. */
        async devolver(f) {
            var self = this;
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
            void self;
        }

        async celebrarRonda() {
            var x = this.oso.c.x;
            this.particulas.emitir(x, OSO.y - 300, { n: 22, tipos: ["corazon", "estrella", "corazon-lila", "chispa"], vel: 420, grav: 260, vida: 1500, escala: 0.8 });
            await this.oso.celebrar();
        }
    } : null;

    // ------------------------------------------------------------------ escena final independiente

    /**
     * Amigo del bosque de la escena final: ardilla, conejo o pajarito. Lleva una fruta que levanta al bailar.
     * mano: punto de la fruta respecto a los pies (o al centro, en los pájaros).
     */
    function Amigo(scene, o) {
        this.scene = scene;
        this.x0 = o.x;
        this.y0 = o.y;
        this.vuela = !!o.ala;
        this.c = scene.add.container(o.desde[0], o.desde[1]).setDepth(o.prof || 4.5);
        this.img = scene.add.image(0, 0, o.textura).setOrigin(0.5, this.vuela ? 0.5 : 1).setScale(o.escala || 1);
        if (o.voltear) this.img.setFlipX(true);
        this.partes = [this.img];
        if (o.ala) {
            this.ala = scene.add.image(o.ala[0], o.ala[1], o.ala[2]).setOrigin(0.15, 0.3).setScale(o.escala || 1);
            if (o.voltear) this.ala.setFlipX(true);
        }
        this.mano = { x: o.mano[0], y: o.mano[1] };
        this.fruta = scene.add.image(this.mano.x, this.mano.y, "fruta-" + o.fruta).setScale(o.tamFruta || 0.42);
        this.c.add(this.vuela ? [this.fruta, this.img, this.ala] : [this.img, this.fruta]);
        this.saltoY = 0;
        this.levanta = 0;
        this.giro = 0;
        this.bailando = false;
        this.f = Math.random() * 6.28;
    }

    Amigo.prototype.update = function (ts) {
        var bob = this.bailando ? Math.abs(Math.sin(ts * 4 + this.f)) * 10 : 0;
        if (this.vuela) {
            this.ala.rotation = Math.sin(ts * 20 + this.f) * 0.7;
            bob = Math.sin(ts * 3 + this.f) * 12;
        }
        if (this.llego) {
            this.c.x = this.x0 + (this.vuela ? Math.sin(ts * 1.3 + this.f) * 40 : 0);
            this.c.y = this.y0 - this.saltoY - bob;
        }
        this.c.rotation = this.giro + (this.bailando && !this.vuela ? Math.sin(ts * 4 + this.f) * 0.06 : 0);
        this.fruta.y = this.mano.y - this.levanta * 70;
        this.fruta.rotation = this.levanta * Math.sin(ts * 6) * 0.2;
    };

    /** Entra saltando (o volando) desde fuera de la pantalla hasta su lugar. */
    Amigo.prototype.entrar = function (anim, ms) {
        var self = this;
        var x0 = this.c.x, y0 = this.c.y;
        return anim.agregar(ms, function (u) {
            var k = u * u * (3 - 2 * u);
            self.c.x = x0 + (self.x0 - x0) * k;
            self.c.y = y0 + (self.y0 - y0) * k - (self.vuela ? 0 : Math.abs(Math.sin(u * Math.PI * 5)) * 46 * (1 - u * 0.3));
        }).then(function () { self.llego = true; });
    };

    var EscenaFiesta = Phaser ? class extends Phaser.Scene {
        constructor() { super({ key: "Fiesta" }); }

        create() {
            prepararTexturas(this);
            tex(this, "fondo-fiesta", D().fondoFiesta);
            tex(this, "banderines", D().banderines);
            D().piezasAmigos.forEach(function (k) { tex(this, k, function () { return D().pieza(k); }); }, this);
            var self = this;
            this.anim = new Animador();
            this.t = 0;
            this.reaccion = 0;
            this.lluviaOn = false;
            this.tLluvia = 0;
            this.add.image(W / 2, H / 2, "fondo-fiesta").setDepth(0);
            this.bosque = crearBosque(this, {
                filaY: 380,
                semilla: 777,
                rayos: 0.12,
                lados: [[100, 800, "verde", 1.3], [1500, 800, "rosa", 1.3]],
                decor: [["arbusto", 330, 640, 1.0], ["arbusto", 1270, 640, 1.0], ["hongos", 1400, 900, 0.9, 7], ["hierba", 200, 900, 1.3, 7]]
            });
            this.banderines = this.add.image(W / 2, 2, "banderines").setOrigin(0.5, 0).setDepth(3);
            this.flores = [[470, 900, 0], [560, 905, 1], [1060, 905, 2], [1150, 900, 0], [250, 880, 1], [1350, 880, 2]].map(function (f) {
                return self.add.image(f[0], f[1], "flor-" + f[2]).setOrigin(0.5, 1).setDepth(7);
            });
            this.cesta = this.add.image(400, 830, "cesta").setOrigin(0.5, 1).setDepth(4);
            this.plato = this.add.image(1190, 850, "plato").setScale(0.62).setDepth(4);
            this.oso = new global.OsoComer(this, 800, 680, this.anim);
            this.oso.c.setDepth(5).setScale(1.04);
            this.oso.alMasticar = function (k) { evento("mastica", k); };

            // amigos del bosque (empiezan fuera de la pantalla)
            this.amigos = [
                new Amigo(this, { textura: "ardilla", x: 520, y: 618, desde: [-220, 618], escala: 1.05, mano: [78, -86], fruta: "manzana", tamFruta: 0.42 }),
                new Amigo(this, { textura: "conejo", x: 1085, y: 618, desde: [1820, 618], escala: 1.0, mano: [-24, -96], fruta: "fresa", tamFruta: 0.4 }),
                new Amigo(this, { textura: "pajaro-azul", ala: [-6, -8, "ala-azul"], x: 600, y: 210, desde: [-160, 60], escala: 0.95, mano: [6, 44], fruta: "uvas", tamFruta: 0.3, prof: 6 }),
                new Amigo(this, { textura: "pajaro-rojo", ala: [6, -8, "ala-roja"], voltear: true, x: 1010, y: 190, desde: [1760, 40], escala: 0.95, mano: [-6, 44], fruta: "naranja", tamFruta: 0.3, prof: 6 })
            ];
            this.particulas = new Particulas(this, 80, 60);
            this.events.once("shutdown", function () {
                self.anim.limpiar();
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
            this.anim.update(dt);
            this.oso.update(dt);
            this.particulas.update(dt);
            this.amigos.forEach(function (a) { a.update(ts); });
            var r = this.reaccion;
            animarBosque(this.bosque, dt, ts, r);
            this.banderines.y = 2 + Math.sin(ts * 3) * 4 * r;
            this.banderines.rotation = Math.sin(ts * 2.2) * 0.008 * r;
            this.cesta.y = 830 - Math.abs(Math.sin(ts * 5.5)) * 26 * r;
            this.cesta.rotation = Math.sin(ts * 5.5) * 0.08 * r;
            this.plato.rotation = Math.sin(ts * 7) * 0.06 * r;
            this.plato.y = 850 - Math.abs(Math.sin(ts * 7 + 1)) * 14 * r;
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

        bailarAmigos(on) {
            this.amigos.forEach(function (a) { a.bailando = on; });
        }

        /** Todos los amigos levantan su fruta (y la bajan). */
        levantarFrutas(ms) {
            var self = this;
            this.amigos.forEach(function (a) {
                var b = a.fruta.getWorldTransformMatrix();
                self.particulas.emitir(b.tx, b.ty - 60, { n: 5, tipos: ["chispa", "estrella"], vel: 160, grav: 80, vida: 900, escala: 0.5 });
            });
            return this.anim.agregar(ms || 900, function (u) {
                var k = Math.sin(u * Math.PI);
                self.amigos.forEach(function (a) { a.levanta = k; });
            });
        }

        saltitoAmigos() {
            var self = this;
            return this.anim.agregar(520, function (u) {
                self.amigos.forEach(function (a, i) { if (!a.vuela) a.saltoY = Math.sin(u * Math.PI) * (i % 2 ? 50 : 40); });
            });
        }

        saludar() {
            var self = this;
            var oso = this.oso;
            return this.anim.agregar(1800, function (u) {
                var s = Math.sin(u * Math.PI * 6);
                self.amigos.forEach(function (a) { if (!a.vuela) a.giro = s * 0.14; });
                oso.brazoExtra.d = 2.4 + s * 0.35;
                oso.brazoExtra.i = -0.2;
            }).then(function () {
                self.amigos.forEach(function (a) { a.giro = 0; });
                oso.brazoExtra.d = oso.brazoExtra.i = 0;
            });
        }

        /**
         * El osito termina de comer y se frota la barriga; llegan la ardilla, el conejo y los pajaritos;
         * todos bailan alrededor de la manta, levantan sus frutas, caen hojas y pétalos, y se despiden saludando.
         */
        async secuencia() {
            var self = this;
            var oso = this.oso;
            oso.configurar({ velocidad: 1.4, rango: 26 }, {});
            oso.apertura = 0.5;
            evento("final-come");
            await oso.comer();
            await oso.frotarBarriga(1200);
            evento("final-amigos");
            this.lluviaOn = true;
            await Promise.all(this.amigos.map(function (a, i) {
                return new Promise(function (r) { setTimeout(r, i * 260); }).then(function () { return a.entrar(self.anim, a.vuela ? 1700 : 2000); });
            }));
            evento("final-levanta");
            await oso.ponerseDePie();
            oso.ocupado = false;
            evento("final-fiesta");
            this.bailarAmigos(true);
            await this.anim.agregar(500, function (u) { self.reaccion = u; });
            for (var i = 0; i < 4; i++) {
                evento("final-salto", i);
                this.particulas.emitir(oso.c.x, 680 - 420, { n: 10, tipos: ["corazon", "corazon-lila", "estrella", "chispa"], vel: 380, grav: 240, vida: 1400, escala: 0.75 });
                if (i % 2 === 1) {
                    evento("final-frutas");
                    await Promise.all([oso.saltar(1), this.saltitoAmigos(), this.levantarFrutas(900)]);
                } else {
                    await Promise.all([oso.saltar(1), this.saltitoAmigos()]);
                }
            }
            evento("final-saludo");
            await this.saludar();
            oso.mover(true);
            oso.ojos = "feliz";
        }

        detener() {
            this.lluviaOn = false;
            this.bailarAmigos(false);
            this.oso.mover(false);
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
        global.__escenarioComer = juego;
    }

    // ------------------------------------------------------------------ API pública

    var EscenarioComer = {
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
        oso: function () { return picnic ? picnic.oso : (fiesta ? fiesta.oso : null); },

        configurarOso: function (ronda) {
            if (!picnic) return;
            picnic.oso.configurar(ronda, cfg.juego);
        },
        activar: function (on) { if (picnic) picnic.oso.activo(on); },
        arrastre: function (on) { if (picnic) picnic.arrastreOn = !!on; },
        haloAyuda: function (on) { if (picnic) picnic.haloAyuda = !!on; },
        radio: function (r) { if (picnic) picnic.radio = r; },
        reiniciarOso: function () { if (picnic) picnic.oso.reiniciar(); },

        cargarRonda: function (idx, tipos) { return picnic ? picnic.cargarRonda(idx, tipos) : Promise.resolve(); },
        vaciar: function () { if (picnic) picnic.vaciar(); },
        /** Solo las frutas que siguen en el plato (los objetos que no se comen no cuentan). */
        frutasEnPlato: function () {
            return picnic ? picnic.frutas.filter(function (f) { return f.estado === "plato" && f.esFruta !== false; }).map(function (f) { return f.id; }) : [];
        },
        /** Todas las piezas del plato, frutas y objetos. */
        piezasEnPlato: function () {
            return picnic ? picnic.frutas.filter(function (f) { return f.estado === "plato"; }).map(function (f) { return f.id; }) : [];
        },
        tipoDe: function (id) {
            var f = picnic && picnic.frutaPorId(id);
            return f ? f.tipo : null;
        },
        /** Datos para decidir una entrega (coordenadas del mundo). */
        estado: function (id) {
            var f = picnic && picnic.frutaPorId(id);
            if (!f) return null;
            return {
                fruta: { x: f.img.x, y: f.img.y },
                boca: picnic.oso.puntoBoca(),
                apertura: picnic.oso.apertura,
                entregada: f.estado === "entregada" || f.estado === "entregando",
                esFruta: f.esFruta !== false
            };
        },
        rechazar: function (id) {
            var f = picnic && picnic.frutaPorId(id);
            return f ? picnic.rechazar(f) : Promise.resolve();
        },
        entregar: function (id) {
            var f = picnic && picnic.frutaPorId(id);
            return f ? picnic.entregar(f) : Promise.resolve();
        },
        devolver: function (id) {
            var f = picnic && picnic.frutaPorId(id);
            return f ? picnic.devolver(f) : Promise.resolve();
        },
        destacar: function (id) {
            if (!picnic) return;
            picnic.destacado = id ? picnic.frutaPorId(id) : null;
        },
        celebrarRonda: function () { return picnic ? picnic.celebrarRonda() : Promise.resolve(); },

        // demo: la mano mueve una fruta por código
        tomarDemo: function (id) {
            var f = picnic && picnic.frutaPorId(id);
            if (f && f.estado === "plato") picnic.tomar(f);
        },
        moverDemo: function (id, sx, sy) {
            var f = picnic && picnic.frutaPorId(id);
            if (!f) return;
            var p = aMundo(sx, sy);
            f.img.setPosition(p.x, p.y);
        },
        soltarDemo: function (id) {
            var f = picnic && picnic.frutaPorId(id);
            if (!f) return;
            picnic.arrastrando = null;
            f.estado = "soltada";
        },

        puntoDe: function (id) {
            var f = picnic && picnic.frutaPorId(id);
            return f ? aPantalla(f.img.x, f.img.y) : null;
        },
        puntoBoca: function () {
            var o = EscenarioComer.oso();
            if (!o) return null;
            var b = o.puntoBoca();
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

    global.EscenarioComer = EscenarioComer;
})(window);
