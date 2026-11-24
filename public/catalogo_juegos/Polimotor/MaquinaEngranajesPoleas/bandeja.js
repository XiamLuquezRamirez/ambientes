/**
 * BandejaMaquina — la estación de piezas a la izquierda (window.BandejaMaquina).
 *
 * Un mueble de taller con focos arriba y un compartimento por pieza. Todas las piezas se muestran a
 * la misma escala, así se ve cuál es grande, mediana o pequeña; las ruedas giran despacio en su
 * compartimento. Al elegir una, su compartimento se enciende; cuando queda en el tablero, el
 * compartimento muestra un visto. La entrada (tocar y arrastrar) la maneja la escena con las zonas.
 */
(function (global) {
    "use strict";

    var M = function () { return global.MotorMaquina; };
    var D = function () { return global.DibujosMaquina; };
    var R = function () { return global.ReglasMaquina; };
    var EV = function () { return global.EventosMaquina; };
    var Phaser = global.Phaser;

    var MARCO = { x0: 214, x1: 464, y0: 104, y1: 622 };
    var AREA = { x0: 230, x1: 448, y0: 158, y1: 606 };

    function Bandeja(scene, cfg, variante) {
        var self = this;
        this.scene = scene;
        this.cfg = cfg;
        this.v = variante || {};
        this.fichas = [];
        this.zonas = [];
        this.focos = [];
        this.flash = { color: 0xffe066, t: 0 };
        this.bloqueada = true;
        this.hMueble = new (M().Horno)(scene, MARCO.x0 - 4, MARCO.y0 - 4, MARCO.x1 - MARCO.x0 + 30, MARCO.y1 - MARCO.y0 + 30, { mundo: true, prof: 200 });
        this.hMueble.pintar(function (g) { self.dibujarMueble(g); });
        this.hHuecos = new (M().Horno)(scene, AREA.x0 - 4, AREA.y0 - 4, AREA.x1 - AREA.x0 + 8, AREA.y1 - AREA.y0 + 8, { mundo: true, prof: 201 });
        this.titulo = scene.add.text((MARCO.x0 + MARCO.x1) / 2, MARCO.y0 + 30, "PIEZAS", {
            fontFamily: M().FUENTE, fontSize: "24px", fontStyle: "700", color: "#ffffff", stroke: "#a34d00", strokeThickness: 6
        }).setOrigin(0.5).setDepth(203);
        for (var i = 0; i < 6; i++) {
            var fx = MARCO.x0 + 26 + i * ((MARCO.x1 - MARCO.x0 - 52) / 5);
            this.focos.push({ img: scene.add.image(fx, MARCO.y0 + 8, "p-chispa").setDepth(203).setBlendMode(Phaser.BlendModes.ADD).setScale(0.55), fase: i * 0.9 });
        }
        this.resalte = scene.add.graphics().setDepth(201.5);
        this.vistos = [];
        var b = EV();
        this.quitar = [];
        if (b) {
            this.quitar.push(b.on("pieza_seleccionada", function () { self.destellar(0xffe066); }));
            this.quitar.push(b.on("pieza_ensamblada", function () { self.destellar(0x8ce99a); }));
            this.quitar.push(b.on("maquina_en_marcha", function () { self.destellar(0xffd43b, 3); }));
        }
    }

    Bandeja.MARCO = MARCO;

    Bandeja.prototype.dibujarMueble = function (g) {
        var w = MARCO.x1 - MARCO.x0, h = MARCO.y1 - MARCO.y0;
        g.fillStyle(0x0b1d3a, 0.25);
        g.fillRoundedRect(MARCO.x0 + 10, MARCO.y0 + 14, w, h, 26);
        g.fillStyle(0xd9480f, 1);
        g.fillRoundedRect(MARCO.x0 + 4, MARCO.y0 + 8, w, h, 26);
        g.fillStyle(0xff922b, 1);
        g.fillRoundedRect(MARCO.x0, MARCO.y0, w, h, 26);
        g.fillStyle(0xffc078, 1);
        g.fillRoundedRect(MARCO.x0 + 10, MARCO.y0 + 6, w - 20, 14, 7);
        g.fillStyle(0xfff4e6, 1);
        g.fillRoundedRect(AREA.x0 - 6, AREA.y0 - 8, AREA.x1 - AREA.x0 + 12, AREA.y1 - AREA.y0 + 14, 18);
        g.lineStyle(4, 0xd9480f, 1);
        g.strokeRoundedRect(MARCO.x0, MARCO.y0, w, h, 26);
        [[MARCO.x0 + 16, MARCO.y0 + 16], [MARCO.x1 - 16, MARCO.y0 + 16], [MARCO.x0 + 16, MARCO.y1 - 16], [MARCO.x1 - 16, MARCO.y1 - 16]].forEach(function (p) {
            g.fillStyle(0xa34d00, 1); g.fillCircle(p[0] + 1, p[1] + 2, 6);
            g.fillStyle(0xe9ecef, 1); g.fillCircle(p[0], p[1], 5);
        });
        // engranaje del rótulo
        var c = D().contorno(10, 2.6);
        g.fillStyle(0xffd43b, 1);
        g.fillPoints(c.pts.map(function (p) { return { x: p.x + MARCO.x0 + 40, y: p.y + MARCO.y0 + 30 }; }), true, true);
        g.fillStyle(0xd9480f, 1);
        g.fillCircle(MARCO.x0 + 40, MARCO.y0 + 30, 4);
    };

    /**
     * defs: [{ id, tipo, talla, para }] en el orden en que se muestran (ya barajado).
     * opciones: TableroMaquina.opcionesPieza(); escTablero: escala de la pieza en el tablero.
     */
    Bandeja.prototype.configurar = function (defs, opciones, escTablero) {
        var self = this, s = this.scene;
        this.fichas.forEach(function (f) { f.cont.destroy(); });
        this.zonas.forEach(function (z) { z.destroy(); });
        this.vistos.forEach(function (v) { v.destroy(); });
        this.fichas = [];
        this.zonas = [];
        this.vistos = [];
        this.escTablero = escTablero;
        defs.forEach(function (d) {
            var p = D().crearPieza(s, d, self.v, opciones);
            p.estado = "disponible";
            p.g = p.cont;
            p.vel = (p.tipo === "engranaje" ? 0.25 : 0.35) * (Math.random() < 0.5 ? -1 : 1);
            self.fichas.push(p);
        });
        this.acomodar();
        this.hHuecos.pintar(function (g) { self.dibujarHuecos(g); });
        this.fichas.forEach(function (f, i) {
            var h = f.hueco;
            var z = s.add.zone(h.x, h.y, h.w, h.h).setDepth(205);
            z.setInteractive({ draggable: true, useHandCursor: true });
            z.setData("ficha", f.id);
            self.zonas.push(z);
            f.zona = z;
            f.cont.setPosition(h.x, h.y).setDepth(212).setScale(0).setAlpha(1).setVisible(true);
            f.esc = 0;
            f.escObj = f.fit;
            f.retraso = 120 + i * 90;
            var v = s.add.text(h.x + h.w / 2 - 16, h.y - h.h / 2 + 14, "✓", {
                fontFamily: M().FUENTE, fontSize: "26px", fontStyle: "700", color: "#2b8a3e", stroke: "#ffffff", strokeThickness: 5
            }).setOrigin(0.5).setDepth(213).setVisible(false);
            self.vistos.push(v);
            f.visto = v;
        });
        this.bloquear(true);
    };

    /**
     * Reparte las piezas en 1, 2 o 3 columnas con UNA escala común (así se comparan los tamaños):
     * se queda con el reparto que deja las piezas más grandes sin salirse de la estación.
     */
    Bandeja.prototype.acomodar = function () {
        var fichas = this.fichas;
        var ancho = AREA.x1 - AREA.x0, alto = AREA.y1 - AREA.y0;
        var ROLLO = 124, ROLLO_H = 78, GAP = 12, KMAX = 0.62;
        var escalaRollo = function (k, anchoCol) { return Math.min(0.82, k * 2.1, (anchoCol - 10) / ROLLO); };
        var medida = function (f, k, anchoCol) {
            if (f.tipo === "correa") { var e = escalaRollo(k, anchoCol); return { w: ROLLO * e, h: ROLLO_H * e }; }
            return { w: f.radio * 2 * k, h: f.radio * 2 * k };
        };
        var probar = function (cols, k) {
            var anchoCol = ancho / cols;
            var total = 0;
            for (var i = 0; i < fichas.length; i += cols) {
                var hFila = 0;
                var fila = fichas.slice(i, i + cols);
                var aCol = fila.length === 1 ? ancho : anchoCol;
                for (var j = 0; j < fila.length; j++) {
                    var m = medida(fila[j], k, aCol);
                    if (m.w > aCol - 8) return false;
                    hFila = Math.max(hFila, m.h);
                }
                total += hFila + GAP;
            }
            return total <= alto;
        };
        var mejor = { cols: 2, k: 0.15 };
        [1, 2, 3].forEach(function (cols) {
            var lo = 0.1, hi = KMAX;
            if (probar(cols, hi)) lo = hi;
            else for (var it = 0; it < 24; it++) { var mid = (lo + hi) / 2; if (probar(cols, mid)) lo = mid; else hi = mid; }
            if (probar(cols, lo) && lo > mejor.k + 0.005) mejor = { cols: cols, k: lo };
        });
        var cols = mejor.cols, k = mejor.k * 0.97;
        this.k = k;
        var anchoCol = ancho / cols;
        var filas = [];
        for (var i = 0; i < fichas.length; i += cols) filas.push(fichas.slice(i, i + cols));
        var hs = filas.map(function (fila) {
            var aCol = fila.length === 1 ? ancho : anchoCol;
            var h = 0;
            fila.forEach(function (f) { h = Math.max(h, medida(f, k, aCol).h); });
            return h + GAP;
        });
        var totalAlto = hs.reduce(function (a, b) { return a + b; }, 0);
        var y = AREA.y0 + Math.max(0, (alto - totalAlto) / 2);
        filas.forEach(function (fila, fi) {
            var aCol = fila.length === 1 ? ancho : ancho / fila.length;
            fila.forEach(function (f, ci) {
                var cx = AREA.x0 + aCol * (ci + 0.5);
                f.hueco = { x: cx, y: y + hs[fi] / 2, w: aCol - 6, h: hs[fi] - 4 };
                f.fit = f.tipo === "correa" ? escalaRollo(k, aCol) : k;
            });
            y += hs[fi];
        });
    };

    Bandeja.prototype.dibujarHuecos = function (g) {
        this.fichas.forEach(function (f) {
            var h = f.hueco;
            g.fillStyle(0xffe8cc, 1);
            g.fillRoundedRect(h.x - h.w / 2, h.y - h.h / 2, h.w, h.h, 14);
            g.lineStyle(3, 0xffc078, 1);
            g.strokeRoundedRect(h.x - h.w / 2, h.y - h.h / 2, h.w, h.h, 14);
            g.fillStyle(0xffd8a8, 1);
            g.fillEllipse(h.x, h.y + h.h * 0.32, h.w * 0.6, 12);
        });
    };

    Bandeja.prototype.ficha = function (id) { return this.fichas.filter(function (f) { return f.id === id; })[0] || null; };
    Bandeja.prototype.fichaDeZona = function (z) { return z && z.getData ? this.ficha(z.getData("ficha")) : null; };
    Bandeja.prototype.puntoHueco = function (f) { return { x: f.hueco.x, y: f.hueco.y }; };

    Bandeja.prototype.bloquear = function (on) {
        this.bloqueada = !!on;
        this.zonas.forEach(function (z) {
            var f = this.fichaDeZona(z);
            if (z.input) z.input.enabled = !on && !!f && f.estado !== "ensamblada" && f.estado !== "ensamblando";
        }, this);
    };

    Bandeja.prototype.marcarUsada = function (f) {
        f.estado = "ensamblada";
        if (f.zona && f.zona.input) f.zona.input.enabled = false;
        f.visto.setVisible(true).setScale(0);
        var v = f.visto;
        this.scene.anim.agregar(380, function (u) { v.setScale(M().rebote(u)); });
    };

    /** Ayuda: la pieza que sirve da un saltito en su compartimento. */
    Bandeja.prototype.llamar = function (f) {
        if (f) f.salto = 1;
    };

    Bandeja.prototype.destellar = function (color, fuerza) {
        this.flash.color = color;
        this.flash.t = fuerza || 1;
    };

    Bandeja.prototype.vaciar = function () {
        var fichas = this.fichas.filter(function (f) { return f.estado !== "ensamblada" && f.estado !== "ensamblando"; });
        var vistos = this.vistos.slice();
        var e0 = fichas.map(function (f) { return f.cont.scaleX; });
        return this.scene.anim.agregar(500, function (u) {
            fichas.forEach(function (f, i) { f.cont.setScale(e0[i] * (1 - u)); });
            vistos.forEach(function (v) { v.setAlpha(1 - u); });
        });
    };

    Bandeja.prototype.update = function (dt, ts) {
        var self = this;
        var sel = null;
        this.fichas.forEach(function (f) {
            if (f.retraso > 0) { f.retraso -= dt; return; }
            var enBandeja = f.estado === "disponible" || f.estado === "seleccionada" || f.estado === "volviendo";
            if (enBandeja && f.tipo !== "correa") f.girar(f.ang + f.vel * dt / 1000);
            if (f.estado === "disponible" || f.estado === "seleccionada") {
                var obj = f.estado === "seleccionada" ? f.fit * 1.12 : f.fit;
                f.esc += (obj - f.esc) * Math.min(1, dt / 140);
                var dy = 0;
                if (f.salto > 0) { f.salto = Math.max(0, f.salto - dt / 1400); dy = -Math.abs(Math.sin(f.salto * Math.PI * 4)) * 16 * f.salto; }
                var flota = f.estado === "seleccionada" ? Math.sin(ts * 5) * 3 - 4 : 0;
                f.cont.setPosition(f.hueco.x, f.hueco.y + dy + flota).setScale(f.esc);
                f.brillo.setAlpha(f.estado === "seleccionada" ? 0.55 + 0.25 * Math.sin(ts * 6) : (f.salto > 0 ? 0.6 * f.salto : 0));
            }
            if (f.estado === "seleccionada" || f.estado === "arrastrando" || f.estado === "cerca") sel = f;
        });
        // compartimento encendido de la pieza elegida
        var g = this.resalte;
        g.clear();
        if (sel) {
            var h = sel.hueco;
            g.lineStyle(5, 0xffd43b, 0.6 + 0.4 * Math.sin(ts * 6));
            g.strokeRoundedRect(h.x - h.w / 2, h.y - h.h / 2, h.w, h.h, 14);
        }
        if (this.flash.t > 0) this.flash.t = Math.max(0, this.flash.t - dt / 800);
        this.focos.forEach(function (fo) {
            var a = 0.35 + 0.3 * Math.sin(ts * 2 + fo.fase);
            fo.img.setTint(self.flash.t > 0.1 ? self.flash.color : 0xffe066);
            fo.img.setAlpha(Math.min(1, a + self.flash.t * 0.7));
        });
    };

    Bandeja.prototype.destruir = function () {
        (this.quitar || []).forEach(function (f) { f(); });
    };

    global.BandejaMaquina = Bandeja;
})(typeof window !== "undefined" ? window : global);
