/**
 * PanelPuzle — paneles del taller (window.PanelPuzle).
 *
 *  - Arriba: placa con el nivel y el nombre de la construcción, y los cuatro niveles.
 *  - Derecha: el PLANO (vista de referencia de la figura terminada que se va llenando con cada
 *    bloque), el indicador de capas y bloques, y el panel de GIRO que compara el bloque elegido con
 *    la guía.
 *  - Abajo: herramientas (girar a la izquierda, girar a la derecha, guía) y la fila de bloques del
 *    nivel que se encienden al colocarlos.
 * Los botones son reales: llaman a la escena.
 */
(function (global) {
    "use strict";

    var M = function () { return global.MotorPuzle; };
    var S = function () { return global.SolidosPuzle; };
    var R = function () { return global.ReglasPuzle; };
    var EV = function () { return global.EventosPuzle; };

    var BARRA = { x0: 528, x1: 1212, y0: 806, y1: 888 };
    // panel derecho pensado para 16:9; en pantallas más angostas (4:3) se corre a la izquierda
    // lo justo para que quepa entero (ver ubicarDerecha)
    var BASE = {
        DER: { x0: 1148, x1: 1448, y0: 112, y1: 704 },
        PLANO: { x0: 1162, x1: 1434, y0: 160, y1: 478 },
        // casillas de capas y bloques, y panel de giro (debajo del plano)
        CAPAS: { x0: 1164, y0: 512, w: 104, h: 82, cx: 1216 },
        BLOQ: { x0: 1280, y0: 512, w: 152, h: 82, cx: 1356 },
        GIRO: { x0: 1164, y0: 624, w: 268, h: 66, cy: 657 }
    };
    var DER, PLANO, CAPAS, BLOQ, GIRO;

    function correr(o, dx) {
        var c = {};
        Object.keys(o).forEach(function (k) { c[k] = /^(x0|x1|cx)$/.test(k) ? o[k] + dx : o[k]; });
        return c;
    }

    /** x1 visible del mundo (1600 en 16:9, ~1400 en 4:3): el panel termina 14 px antes. */
    function ubicarDerecha(xVisible) {
        var dx = Math.min(0, Math.round((xVisible || 1600) - 14 - BASE.DER.x1));
        DER = correr(BASE.DER, dx);
        PLANO = correr(BASE.PLANO, dx);
        CAPAS = correr(BASE.CAPAS, dx);
        BLOQ = correr(BASE.BLOQ, dx);
        GIRO = correr(BASE.GIRO, dx);
    }
    ubicarDerecha(1600);

    function Panel(scene, opciones) {
        var self = this;
        this.scene = scene;
        this.o = opciones || {};
        ubicarDerecha(this.o.xVisible);
        this.v = this.o.variante || {};
        var est = this.v.estacion || {};
        this.marco = S().hexA(est.marco || "#ff922b");
        this.oscuro = S().hexA(est.oscuro || "#c25e0a");
        this.lista = [];
        this.colocadas = {};
        this.objetivo = null;
        this.sel = null;
        this.habilitado = false;
        this.giroOn = false;
        this.encendido = 0;
        this.capaPulso = {};
        this.visible = true;

        // ---------------- placa superior
        this.hPlaca = new (M().Horno)(scene, 300, 8, 1000, 96, { mundo: true, prof: 230 });
        this.tNivel = scene.add.text(0, 0, "1", { fontFamily: M().FUENTE, fontSize: "34px", fontStyle: "700", color: "#ffffff" }).setOrigin(0.5).setDepth(231);
        this.tNombre = scene.add.text(0, 0, "", { fontFamily: M().FUENTE, fontSize: "30px", fontStyle: "700", color: "#2b2f4a" }).setOrigin(0, 0.5).setDepth(231);

        // ---------------- panel derecho
        // lo fijo y lo que cambia poco va horneado; solo los latidos se dibujan cada cuadro
        this.hDer = new (M().Horno)(scene, DER.x0 - 4, DER.y0 - 4, DER.x1 - DER.x0 + 20, DER.y1 - DER.y0 + 24, { mundo: true, prof: 220 });
        this.hPlano = new (M().Horno)(scene, PLANO.x0 - 6, PLANO.y0 - 6, PLANO.x1 - PLANO.x0 + 12, PLANO.y1 - PLANO.y0 + 12, { mundo: true, prof: 222 });
        this.solObjetivo = null;
        this.hCapas = new (M().Horno)(scene, CAPAS.x0 - 4, CAPAS.y0 - 10, BLOQ.x0 + BLOQ.w - CAPAS.x0 + 8, CAPAS.h + 20, { mundo: true, prof: 222 });
        this.gCapas = scene.add.graphics().setDepth(222.5);
        this.gGiro = scene.add.graphics().setDepth(222);
        this.solSel = null;
        this.solMeta = null;
        this.gGiroIcono = scene.add.graphics().setDepth(224);
        var etiqueta = function (x, y, t) {
            return scene.add.text(x, y, t, { fontFamily: M().FUENTE, fontSize: "19px", fontStyle: "700", color: "#ffffff" }).setOrigin(0.5).setDepth(224);
        };
        this.tPlano = etiqueta((DER.x0 + DER.x1) / 2, DER.y0 + 30, "PLANO");
        this.tCapas = etiqueta(CAPAS.cx, CAPAS.y0 - 14, "CAPAS");
        this.tBloques = etiqueta(BLOQ.cx, BLOQ.y0 - 14, "BLOQUES");
        this.tGiro = etiqueta((DER.x0 + DER.x1) / 2, GIRO.y0 - 14, "¿COINCIDE?");

        // ---------------- barra de herramientas
        this.hBarra = new (M().Horno)(scene, BARRA.x0 - 4, BARRA.y0 - 4, BARRA.x1 - BARRA.x0 + 20, BARRA.y1 - BARRA.y0 + 16, { mundo: true, prof: 240 });
        this.hFila = new (M().Horno)(scene, 826, BARRA.y0, BARRA.x1 - 826, BARRA.y1 - BARRA.y0, { mundo: true, prof: 241 });
        this.botones = {};
        this.crearBoton("izq", 600, 847, function () { if (self.o.girar) self.o.girar(-1); });
        this.crearBoton("der", 690, 847, function () { if (self.o.girar) self.o.girar(1); });
        this.crearBoton("guia", 780, 847, function () { if (self.o.ayuda) self.o.ayuda(); });
        this.pintarFijos();

        var b = EV();
        this.quitar = [];
        if (b) {
            this.quitar.push(b.on("capa_completada", function (d) { self.capaPulso[d.capa] = 1; }));
            this.quitar.push(b.on("bloque_ensamblado", function () { self.pulsoFila = 1; }));
        }
    }

    Panel.BARRA = BARRA;
    Panel.plano = function () { return PLANO; };

    // ------------------------------------------------------------------ fijos

    Panel.prototype.pintarFijos = function () {
        var self = this;
        this.hDer.pintar(function (g) { self.dibujarDer(g); });
        this.hBarra.pintar(function (g) { self.dibujarBarra(g); });
    };

    Panel.prototype.dibujarDer = function (g) {
        var w = DER.x1 - DER.x0, h = DER.y1 - DER.y0;
        g.fillStyle(0x1f2a44, 0.2); g.fillRoundedRect(DER.x0 + 6, DER.y0 + 10, w, h, 24);
        g.fillStyle(0x3b5bdb, 1); g.fillRoundedRect(DER.x0, DER.y0, w, h, 24);
        g.fillStyle(0x4c6ef5, 1); g.fillRoundedRect(DER.x0 + 8, DER.y0 + 6, w - 16, 18, 9);
        // pantalla del plano con cuadrícula azul de arquitecto
        g.fillStyle(0xe7f5ff, 1); g.fillRoundedRect(PLANO.x0 - 6, PLANO.y0 - 6, PLANO.x1 - PLANO.x0 + 12, PLANO.y1 - PLANO.y0 + 12, 14);
        g.lineStyle(1, 0xa5d8ff, 0.8);
        for (var x = PLANO.x0 + 12; x < PLANO.x1; x += 18) g.lineBetween(x, PLANO.y0, x, PLANO.y1);
        for (var y = PLANO.y0 + 12; y < PLANO.y1; y += 18) g.lineBetween(PLANO.x0, y, PLANO.x1, y);
        // casillas de capas y bloques
        g.fillStyle(0x364fc7, 1);
        g.fillRoundedRect(CAPAS.x0, CAPAS.y0, CAPAS.w, CAPAS.h, 12);
        g.fillRoundedRect(BLOQ.x0, BLOQ.y0, BLOQ.w, BLOQ.h, 12);
        // panel de giro
        g.fillStyle(0x364fc7, 1);
        g.fillRoundedRect(GIRO.x0, GIRO.y0, GIRO.w, GIRO.h, 14);
        g.lineStyle(4, 0x23338a, 1);
        g.strokeRoundedRect(DER.x0, DER.y0, w, h, 24);
    };

    Panel.prototype.dibujarBarra = function (b) {
        b.fillStyle(0x1f2a44, 0.25); b.fillRoundedRect(BARRA.x0 + 6, BARRA.y0 + 8, BARRA.x1 - BARRA.x0, BARRA.y1 - BARRA.y0, 26);
        b.fillStyle(0x495057, 1); b.fillRoundedRect(BARRA.x0, BARRA.y0, BARRA.x1 - BARRA.x0, BARRA.y1 - BARRA.y0, 26);
        b.fillStyle(0x5f6b7a, 1); b.fillRoundedRect(BARRA.x0 + 8, BARRA.y0 + 5, BARRA.x1 - BARRA.x0 - 16, 14, 7);
        b.fillStyle(0x343a40, 1); b.fillRoundedRect(826, BARRA.y0 + 16, BARRA.x1 - 840, BARRA.y1 - BARRA.y0 - 32, 16);
        b.lineStyle(4, 0x212529, 1); b.strokeRoundedRect(BARRA.x0, BARRA.y0, BARRA.x1 - BARRA.x0, BARRA.y1 - BARRA.y0, 26);
    };

    // ------------------------------------------------------------------ botones

    Panel.prototype.crearBoton = function (nombre, x, y, fn) {
        var s = this.scene, self = this;
        var g = s.add.graphics().setDepth(242).setPosition(x, y);
        var z = s.add.zone(x, y, 84, 84).setDepth(243);
        z.setInteractive({ useHandCursor: true });
        var bt = { nombre: nombre, x: x, y: y, g: g, z: z, apretado: 0, latido: 0, visible: true, activo: true, fn: fn };
        z.on("pointerdown", function () {
            if (!bt.visible || !bt.activo || !self.habilitado) return;
            bt.apretado = 1;
            fn();
        });
        this.botones[nombre] = bt;
        this.pintarBoton(bt);
    };

    Panel.prototype.pintarBoton = function (bt) {
        var g = bt.g;
        g.clear();
        var col = bt.nombre === "guia" ? 0x20c997 : 0xff922b;
        var osc = bt.nombre === "guia" ? 0x087f5b : 0xc25e0a;
        var on = this.habilitado && bt.activo;
        if (!on) { col = 0x868e96; osc = 0x495057; }
        g.fillStyle(osc, 1); g.fillCircle(0, 5, 36);
        g.fillStyle(col, 1); g.fillCircle(0, 0, 36);
        g.fillStyle(0xffffff, 0.25); g.fillEllipse(-8, -16, 40, 18);
        g.lineStyle(4, 0xffffff, 1); g.strokeCircle(0, 0, 36);
        g.lineStyle(7, 0xffffff, 1);
        if (bt.nombre === "izq" || bt.nombre === "der") {
            var d = bt.nombre === "der" ? 1 : -1;
            // flecha curva (giro sobre el piso)
            g.beginPath();
            if (d > 0) g.arc(0, 2, 17, Math.PI * 1.05, Math.PI * 1.95, false);
            else g.arc(0, 2, 17, Math.PI * 1.95, Math.PI * 1.05, true);
            g.strokePath();
            var ax = d * 17 * Math.cos(Math.PI * 0.05), ay = 2 - 17 * Math.sin(Math.PI * 0.05);
            g.fillStyle(0xffffff, 1);
            g.fillTriangle(ax - 10 * d, ay - 2, ax + 8 * d, ay - 4, ax - 1 * d, ay + 13);
            // cubito debajo
            g.fillStyle(0xffffff, 0.9);
            g.fillPoints([{ x: -9, y: 14 }, { x: 0, y: 10 }, { x: 9, y: 14 }, { x: 0, y: 18 }], true, true);
        } else {
            // lupa
            g.strokeCircle(-5, -5, 13);
            g.lineBetween(5, 5, 16, 16);
        }
    };

    // ------------------------------------------------------------------ nivel

    /**
     * nivel: { id, nombre, giro }. lista: posiciones (ReglasPuzle.piezasNivel). aspecto(id) → color.
     */
    Panel.prototype.configurar = function (nivel, indice, total, lista, aspecto, esc) {
        this.nivel = nivel || {};
        this.indice = indice || 0;
        this.totalNiveles = total || 4;
        this.lista = lista.slice();
        this.aspecto = aspecto;
        this.colocadas = {};
        this.color = {};
        this.giroOn = !!this.nivel.giro;
        this.objetivo = null;
        this.sel = null;
        this.capaPulso = {};
        this.firmaCapas = this.firmaFila = null;
        this.orden = R().ordenPintado(lista.map(function (p) { return { id: p.id, caja: p.caja, orden: p.orden }; }));
        // escala del plano para que entre la figura completa
        var t = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity, z1: 0 };
        lista.forEach(function (p) {
            t.x0 = Math.min(t.x0, p.caja.x0); t.y0 = Math.min(t.y0, p.caja.y0);
            t.x1 = Math.max(t.x1, p.caja.x1); t.y1 = Math.max(t.y1, p.caja.y1); t.z1 = Math.max(t.z1, p.caja.z1);
        });
        var pts = [];
        [t.x0, t.x1].forEach(function (x) { [t.y0, t.y1].forEach(function (y) { [0, t.z1].forEach(function (z) { pts.push(S().proyectar(x, y, z, 1)); }); }); });
        var mnx = Math.min.apply(null, pts.map(function (q) { return q.x; })), mxx = Math.max.apply(null, pts.map(function (q) { return q.x; }));
        var mny = Math.min.apply(null, pts.map(function (q) { return q.y; })), mxy = Math.max.apply(null, pts.map(function (q) { return q.y; }));
        this.escPlano = Math.min((PLANO.x1 - PLANO.x0 - 16) / (mxx - mnx), (PLANO.y1 - PLANO.y0 - 16) / (mxy - mny));
        this.origenPlano = {
            x: (PLANO.x0 + PLANO.x1) / 2 - (mnx + mxx) / 2 * this.escPlano,
            y: (PLANO.y0 + PLANO.y1) / 2 - (mny + mxy) / 2 * this.escPlano
        };
        this.botones.izq.visible = this.botones.der.visible = this.giroOn;
        this.botones.izq.g.setVisible(this.giroOn);
        this.botones.der.g.setVisible(this.giroOn);
        // sin botones de giro, la guía queda en el primer lugar
        this.botones.guia.g.x = this.giroOn ? 780 : 600;
        this.botones.guia.z.x = this.botones.guia.g.x;
        this.tGiro.setText(this.giroOn ? "¿COINCIDE?" : "¿ES ESTA?");
        this.pintarPlaca();
        this.pintarPlano();
        this.pintarGiro();
    };

    Panel.prototype.pintarPlaca = function () {
        var self = this;
        var nombre = this.nivel.nombre || "";
        this.tNombre.setText(nombre);
        var w = Math.max(360, this.tNombre.width + 200), h = 66;
        var x0 = 800 - w / 2, y0 = 18;
        this.tNivel.setText(String(this.indice + 1)).setPosition(x0 + 36, y0 + h / 2);
        this.tNombre.setPosition(x0 + 76, y0 + h / 2);
        this.hPlaca.pintar(function (g) {
            g.fillStyle(0x1f2a44, 0.22); g.fillRoundedRect(x0 + 5, y0 + 8, w, h, 33);
            g.fillStyle(0xfff9db, 1); g.fillRoundedRect(x0, y0, w, h, 33);
            g.lineStyle(5, self.marco, 1); g.strokeRoundedRect(x0, y0, w, h, 33);
            g.fillStyle(self.oscuro, 1); g.fillCircle(x0 + 36, y0 + h / 2 + 3, 28);
            g.fillStyle(self.marco, 1); g.fillCircle(x0 + 36, y0 + h / 2, 28);
            // los cuatro niveles: cumplidos, actual y por venir
            for (var i = 0; i < self.totalNiveles; i++) {
                var cx = x0 + w - 30 - (self.totalNiveles - 1 - i) * 22, cy = y0 + h / 2;
                g.fillStyle(i < self.indice ? 0x40c057 : i === self.indice ? self.marco : 0xdee2e6, 1);
                g.fillCircle(cx, cy, i === self.indice ? 9 : 7);
            }
        });
    };

    Panel.prototype.mostrar = function (on) {
        this.visible = !!on;
        [this.hPlaca.img, this.tNivel, this.tNombre].forEach(function (o) { o.setVisible(!!on); });
    };

    // ------------------------------------------------------------------ plano

    Panel.prototype.puntoPlano = function (p) {
        var c = S().centroCaja(p.caja);
        var q = S().proyectar(c[0], c[1], c[2], this.escPlano);
        return { x: this.origenPlano.x + q.x, y: this.origenPlano.y + q.y };
    };

    Panel.prototype.pintarPlano = function () {
        var self = this;
        if (!this.lista.length) { this.hPlano.vaciar(); return; }
        this.hPlano.pintar(function (g) {
            self.orden.forEach(function (id) {
                var p = self.lista.filter(function (x) { return x.id === id; })[0];
                var a = self.puntoPlano(p);
                var puesta = !!self.colocadas[id];
                S().dibujar(g, p.def, p.orient, puesta ?
                    { esc: self.escPlano, color: self.color[id], dx: a.x, dy: a.y, anchoContorno: 1.4 } :
                    { esc: self.escPlano, color: "#ffffff", fantasma: true, contorno: 0x74c0fc, anchoContorno: 1.4, dx: a.x, dy: a.y });
            });
        });
    };

    Panel.prototype.colocar = function (id, color) {
        this.colocadas[id] = true;
        this.color[id] = color;
        this.pintarPlano();
    };

    Panel.prototype.quitarColocada = function (id) {
        delete this.colocadas[id];
        this.pintarPlano();
    };

    /** Posición que señala la guía (se ve pulsando en el plano y en el panel de giro). */
    Panel.prototype.marcarObjetivo = function (id) {
        if (this.objetivo === id) return;
        this.objetivo = id;
        if (this.solObjetivo) { this.solObjetivo.destruir(); this.solObjetivo = null; }
        var p = this.lista.filter(function (x) { return x.id === id; })[0];
        if (p) {
            var a = this.puntoPlano(p);
            this.solObjetivo = new (M().Solido)(this.scene, p.def, this.escPlano, 6, 223);
            this.solObjetivo.pintar(p.orient, { color: "#ffe066", fantasma: true, contorno: 0xf59f00, anchoContorno: 2.6 });
            this.solObjetivo.img.setPosition(a.x, a.y);
        }
        this.pintarGiro();
    };

    // ------------------------------------------------------------------ panel de giro

    /** sel: { def, rot, color, forma } del bloque elegido o null. */
    Panel.prototype.seleccion = function (sel) {
        this.sel = sel;
        if (sel) this.encendido = 1;
        this.pintarGiro();
    };

    Panel.prototype.pintarGiro = function () {
        var gi = this.gGiroIcono;
        gi.clear();
        var meta = this.lista.filter(function (x) { return x.id === this.objetivo; }, this)[0];
        var sel = this.sel;
        var caja = { w: 70, h: 52 };
        var ajustar = function (def) {
            var r0 = S().rect2d(def, 0, 1), r1 = S().rect2d(def, 1, 1);
            return Math.min(caja.w / Math.max(r0.w, r1.w), caja.h / Math.max(r0.h, r1.h));
        };
        var scene = this.scene;
        // las miniaturas se hornean de nuevo solo si cambia la forma (el giro reusa la textura)
        var mini = function (actual, def, x) {
            if (actual && actual.def === def) return actual;
            if (actual) actual.destruir();
            if (!def) return null;
            var so = new (M().Solido)(scene, def, ajustar(def), 4, 223);
            so.img.setPosition(x, GIRO.cy);
            return so;
        };
        this.solSel = mini(this.solSel, sel ? sel.def : null, GIRO.x0 + 48);
        if (this.solSel) this.solSel.pintar(R().indice(sel.rot), { color: sel.color, deco: sel.deco, anchoContorno: 1.6 });
        this.solMeta = mini(this.solMeta, meta ? meta.def : null, GIRO.x0 + GIRO.w - 48);
        if (this.solMeta) this.solMeta.pintar(meta.orient, { color: "#ffffff", fantasma: true, contorno: 0xffe066, anchoContorno: 2.2 });
        // en el medio: visto si coincide, flecha de giro si falta girarla, puntos si es otra forma
        if (sel && meta) {
            var mismaForma = sel.forma === meta.forma;
            var bien = mismaForma && R().orientacionOk(sel.def, sel.rot, meta.orient);
            gi.setPosition(GIRO.x0 + GIRO.w / 2, GIRO.cy);
            if (bien) {
                gi.fillStyle(0x40c057, 1); gi.fillCircle(0, 0, 20);
                gi.lineStyle(6, 0xffffff, 1);
                gi.beginPath(); gi.moveTo(-9, 0); gi.lineTo(-2, 8); gi.lineTo(10, -8); gi.strokePath();
            } else if (mismaForma) {
                gi.fillStyle(0xff922b, 1); gi.fillCircle(0, 0, 20);
                gi.lineStyle(5, 0xffffff, 1);
                gi.beginPath(); gi.arc(0, 0, 10, Math.PI * 1.1, Math.PI * 2.6, false); gi.strokePath();
                gi.fillStyle(0xffffff, 1); gi.fillTriangle(8, -12, 14, -2, 2, -3);
            } else {
                gi.fillStyle(0x748ffc, 1); gi.fillCircle(0, 0, 20);
                gi.fillStyle(0xffffff, 1); gi.fillCircle(-8, 0, 3); gi.fillCircle(0, 0, 3); gi.fillCircle(8, 0, 3);
            }
        }
    };

    // ------------------------------------------------------------------ estado general

    Panel.prototype.habilitar = function (on) {
        this.habilitado = !!on;
        var self = this;
        Object.keys(this.botones).forEach(function (k) { self.pintarBoton(self.botones[k]); });
    };

    Panel.prototype.llamarAtencionGiro = function () {
        this.botones.izq.latido = 1;
        this.botones.der.latido = 1;
    };

    Panel.prototype.llamarAtencionGuia = function () { this.botones.guia.latido = 1; };

    Panel.prototype.puntoBoton = function (nombre) {
        var b = this.botones[nombre];
        return b && b.visible ? { x: b.g.x, y: b.g.y } : null;
    };

    Panel.prototype.mostrarProgreso = function (on) {
        [this.hCapas.img, this.gCapas, this.hFila.img, this.tCapas, this.tBloques].forEach(function (o) { o.setVisible(!!on); });
    };

    Panel.prototype.update = function (dt, ts) {
        var self = this;
        Object.keys(this.botones).forEach(function (k) {
            var b = self.botones[k];
            b.apretado = Math.max(0, b.apretado - dt / 220);
            b.latido = Math.max(0, b.latido - dt / 2600);
            var lat = b.latido > 0 ? 1 + Math.abs(Math.sin(ts * 7)) * 0.12 * Math.min(1, b.latido * 2) : 1;
            b.g.setScale((1 - Math.sin(b.apretado * Math.PI) * 0.12) * lat);
            b.z.x = b.g.x;
        });
        // la guía pulsa en el plano
        if (this.solObjetivo) this.solObjetivo.img.setAlpha(0.5 + 0.5 * Math.abs(Math.sin(ts * 3)));
        // panel de giro: se enciende al elegir un bloque
        this.encendido = this.sel ? 1 : Math.max(0, this.encendido - dt / 600);
        var gg = this.gGiro;
        gg.clear();
        gg.lineStyle(4, 0xffe066, 0.3 + 0.7 * this.encendido * (0.7 + 0.3 * Math.sin(ts * 6)));
        gg.strokeRoundedRect(GIRO.x0, GIRO.y0, GIRO.w, GIRO.h, 14);
        if (!this.sel) {
            gg.fillStyle(0xffffff, 0.12);
            gg.fillRoundedRect(GIRO.x0 + 16, GIRO.y0 + 9, 64, 48, 10);
        }
        this.pintarCapas(ts);
        this.pintarFila(dt);
    };

    /**
     * Capas (una barra por capa, de abajo hacia arriba) y bloques (un punto por bloque) en el panel
     * derecho, más la fila de cubitos de la barra. Se hornean cuando cambia el progreso o un pulso;
     * el latido de la capa actual es un rectángulo encima.
     */
    Panel.prototype.pintarCapas = function (ts) {
        var self = this;
        var capas = R().capas(this.lista);
        var actual = R().capaActual(this.lista, this.colocadas);
        var n = capas.length;
        var alto = Math.min(13, 66 / Math.max(1, n));
        var barras = capas.map(function (c, i) {
            var pulso = self.capaPulso[c] || 0;
            if (pulso) self.capaPulso[c] = Math.max(0, pulso - 0.03);
            return {
                c: c, y: CAPAS.y0 + CAPAS.h - 6 - (i + 1) * (alto + 1), ancho: 84 - i * (40 / Math.max(1, n)), pulso: Math.round(pulso * 10) / 10,
                llena: self.lista.filter(function (p) { return p.capa === c; }).every(function (p) { return self.colocadas[p.id]; })
            };
        });
        var firma = barras.map(function (b) { return (b.llena ? 1 : b.c === actual ? 2 : 0) + ":" + b.pulso; }).join("|") + "#" + Object.keys(this.colocadas).join(",");
        if (firma !== this.firmaCapas) {
            this.firmaCapas = firma;
            this.hCapas.pintar(function (g) {
                barras.forEach(function (b) {
                    var col = b.llena ? S().mezclar(0x51cf66, 0xffffff, b.pulso * 0.6) : b.c === actual ? 0xffd43b : 0x5c7cfa;
                    g.fillStyle(S().escalar(col, 0.72), 1);
                    g.fillRoundedRect(CAPAS.cx - b.ancho / 2, b.y + 3, b.ancho, alto, 4);
                    g.fillStyle(col, 1);
                    g.fillRoundedRect(CAPAS.cx - b.ancho / 2, b.y, b.ancho, alto, 4);
                });
                self.dibujarPuntos(g);
            });
        }
        var gc = this.gCapas;
        gc.clear();
        barras.forEach(function (b) {
            if (b.c !== actual) return;
            gc.lineStyle(3, 0xffffff, 0.35 + 0.45 * Math.abs(Math.sin(ts * 5)));
            gc.strokeRect(CAPAS.cx - b.ancho / 2 - 2, b.y - 2, b.ancho + 4, alto + 4);
        });
    };

    Panel.prototype.dibujarPuntos = function (g) {
        var self = this;
        var n = this.lista.length;
        var cols = n > 6 ? 4 : 3;
        this.lista.forEach(function (p, i) {
            var sep = cols === 4 ? 34 : 44;
            var cx = BLOQ.cx + ((i % cols) - (cols - 1) / 2) * sep;
            var cy = BLOQ.y0 + 18 + Math.floor(i / cols) * 23;
            var puesta = !!self.colocadas[p.id];
            g.fillStyle(0x23338a, 1);
            g.fillCircle(cx, cy, 10);
            g.fillStyle(puesta ? S().hexA(self.color[p.id]) : 0x748ffc, puesta ? 1 : 0.5);
            g.fillCircle(cx, cy, puesta ? 9 : 6);
        });
    };

    Panel.prototype.pintarFila = function (dt) {
        var self = this;
        this.pulsoFila = Math.max(0, (this.pulsoFila || 0) - dt / 600);
        var pulso = Math.round(this.pulsoFila * 10) / 10;
        var firma = Object.keys(this.colocadas).join(",") + "#" + pulso + "#" + this.lista.length;
        if (firma === this.firmaFila) return;
        this.firmaFila = firma;
        this.hFila.pintar(function (g) { self.dibujarFila(g, pulso); });
    };

    Panel.prototype.dibujarFila = function (g, pulso) {
        var self = this;
        var n = this.lista.length;
        var ultimo = Object.keys(this.colocadas).pop();
        // fila de la barra: un cubito por bloque, encendido al colocarlo (el último late)
        var x0 = 846, x1 = BARRA.x1 - 30;
        var paso = Math.min(40, (x1 - x0) / Math.max(1, n));
        this.lista.forEach(function (p, i) {
            var x = x0 + paso * (i + 0.5), y = 847;
            var puesta = !!self.colocadas[p.id];
            var col = puesta ? S().hexA(self.color[p.id]) : 0x6c757d;
            var e = puesta && p.id === ultimo ? 1 + pulso * 0.3 : 1;
            var s = 11 * e;
            g.fillStyle(S().mezclar(col, 0xffffff, 0.25), 1);
            g.fillPoints([{ x: x, y: y - s }, { x: x + s, y: y - s / 2 }, { x: x, y: y }, { x: x - s, y: y - s / 2 }], true, true);
            g.fillStyle(col, 1);
            g.fillPoints([{ x: x - s, y: y - s / 2 }, { x: x, y: y }, { x: x, y: y + s }, { x: x - s, y: y + s / 2 }], true, true);
            g.fillStyle(S().escalar(col, 0.72), 1);
            g.fillPoints([{ x: x, y: y }, { x: x + s, y: y - s / 2 }, { x: x + s, y: y + s / 2 }, { x: x, y: y + s }], true, true);
        });
    };

    Panel.prototype.destruir = function () {
        this.quitar.forEach(function (f) { f(); });
        this.quitar = [];
    };

    global.PanelPuzle = Panel;
})(typeof window !== "undefined" ? window : global);
