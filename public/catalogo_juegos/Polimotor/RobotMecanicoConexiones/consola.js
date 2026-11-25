/**
 * ConsolaRobot — estación de herramientas de la izquierda (window.ConsolaRobot).
 *
 *  - Pantalla de diagnóstico: esquema del robot con cada pieza encendida al conectarla y el avance.
 *  - Pantalla de pieza: muestra la pieza tomada con su orientación real y un indicador circular
 *    (verde cuando la pieza quedó derecha). Sin pieza tomada muestra el plano del nivel.
 *  - Botones reales: girar a la izquierda, escáner (señala la ranura de la pieza) y girar a la derecha.
 *
 * Los botones avisan a la escena por callbacks; la consola no decide nada.
 */
(function (global) {
    "use strict";

    var M = function () { return global.MotorRobot; };
    var D = function () { return global.DibujosRobot; };

    var C = { x: 360, y: 325 };
    var DIAG = { x: 298, y: 172, k: 0.15 };
    var PANT = { x: 360, y: 336, r: 86 };
    var BOTONES = { izq: { x: 270, y: 503, r: 46 }, escaner: { x: 360, y: 503, r: 38 }, der: { x: 450, y: 503, r: 46 } };

    function ConsolaRobot(scene, cb) {
        this.scene = scene;
        this.cb = cb || {};
        this.anim = new (M().Animador)();
        this.ids = [];
        this.puestas = {};
        this.sel = null;
        this.rot = 0;
        this.rotVis = 0;
        this.indicador = 0;
        this.giro = false;
        this.habilitada = true;
        this.modoActual = "normal";
        this.plano = 0;
        this.planoT = 0;
        this.atencion = 0;
        this.luz = D().luzLab();
        this.crear();
    }

    ConsolaRobot.prototype.crear = function () {
        var s = this.scene, self = this;
        var img = M().img, ADD = global.Phaser.BlendModes.ADD;
        var fuente = M().FUENTE;
        img(s, C.x, C.y, "consola", 1).setDepth(8);
        this.gDiag = s.add.graphics().setDepth(9);
        this.cuenta = s.add.text(420, 150, "0/0", { fontFamily: fuente, fontSize: "40px", fontStyle: "700", color: "#e3fafc" }).setOrigin(0.5).setDepth(9.2);
        this.etiquetaDiag = s.add.text(420, 196, "PIEZAS", { fontFamily: fuente, fontSize: "16px", color: "#99e9f2" }).setOrigin(0.5).setDepth(9.2);
        this.gPant = s.add.graphics().setDepth(9);
        this.piezas = {};
        Object.keys(D().GEOM).forEach(function (id) {
            self.piezas[id] = img(s, PANT.x, PANT.y, "pieza-" + id, 1).setDepth(9.1).setVisible(false);
        });
        this.planoImg = img(s, PANT.x, PANT.y, "silueta-cabeza", 0.6).setDepth(9.05).setTint(this.luz).setAlpha(0);
        this.ruedita = img(s, PANT.x + 100, PANT.y - 82, "engranaje3", 0.55).setDepth(9.2);
        this.nombre = s.add.text(PANT.x, PANT.y + 98, "", { fontFamily: fuente, fontSize: "19px", color: "#e3fafc" }).setOrigin(0.5).setDepth(9.2);
        this.check = s.add.text(PANT.x - 98, PANT.y - 84, "", { fontFamily: fuente, fontSize: "26px", fontStyle: "700", color: "#69db7c" }).setOrigin(0.5).setDepth(9.2);
        // botones
        this.botones = {};
        [["izq", "boton-izq"], ["escaner", "boton-escaner"], ["der", "boton-der"]].forEach(function (b) {
            var def = BOTONES[b[0]];
            var tam = b[0] === "escaner" ? 100 : 120;
            var k = def.r * 2 / (tam * 0.92);
            var i = img(s, def.x, def.y, b[1], k).setDepth(9.5);
            var aura = img(s, def.x, def.y, "luz", def.r / 70).setDepth(9.4).setBlendMode(ADD).setTint(b[0] === "escaner" ? 0x69db7c : 0xffd43b).setAlpha(0);
            var r = (tam / 2) * D().res(b[1]);
            i.setInteractive({ hitArea: new global.Phaser.Geom.Circle(r, r, r * 1.08), hitAreaCallback: global.Phaser.Geom.Circle.Contains, useHandCursor: true });
            i.on("pointerdown", function () { self.pulsar(b[0]); });
            self.botones[b[0]] = { img: i, aura: aura, k: k, presion: 0, def: def, visible: true };
        });
    };

    ConsolaRobot.prototype.pulsar = function (nombre) {
        var b = this.botones[nombre];
        if (!b || !b.visible || !this.habilitada) return;
        b.presion = 1;
        if (nombre === "escaner") { if (this.cb.escaner) this.cb.escaner(); }
        else if (this.cb.girar) this.cb.girar(nombre === "izq" ? -1 : 1);
    };

    ConsolaRobot.prototype.configurar = function (o) {
        var self = this;
        this.ids = o.ids || [];
        this.puestas = {};
        this.giro = !!o.giro;
        this.sel = null;
        this.modoActual = "normal";
        this.planoIds = o.plano && o.plano.length ? o.plano : this.ids;
        this.plano = 0;
        this.planoT = 0;
        ["izq", "der"].forEach(function (k) {
            self.botones[k].visible = self.giro;
            self.botones[k].img.setVisible(self.giro);
            self.botones[k].aura.setVisible(self.giro);
        });
        this.actualizarCuenta();
        this.mostrarPlano();
    };

    ConsolaRobot.prototype.actualizarCuenta = function () {
        var n = Object.keys(this.puestas).length;
        this.cuenta.setText(n + "/" + this.ids.length);
    };

    ConsolaRobot.prototype.mostrarPlano = function () {
        var id = this.planoIds[this.plano % Math.max(1, this.planoIds.length)];
        if (!id) return;
        this.planoImg.setTexture("silueta-" + id);
        var g = D().GEOM[id];
        this.planoImg.base = Math.min(1, 120 / Math.max(g.w, g.h)) / D().res("silueta-" + id);
        this.planoImg.setScale(this.planoImg.base);
    };

    ConsolaRobot.prototype.seleccionar = function (id, rot) {
        var self = this;
        Object.keys(this.piezas).forEach(function (k) { self.piezas[k].setVisible(k === id); });
        this.sel = id;
        this.rot = rot || 0;
        this.rotVis = this.rot;
        var p = this.piezas[id];
        if (p) {
            var g = D().GEOM[id];
            p.k = Math.min(1, 118 / Math.max(g.w, g.h));
            p.pop = 1;
        }
        var def = this.cb.nombre ? this.cb.nombre(id) : id;
        this.nombre.setText(def || "");
    };

    ConsolaRobot.prototype.deseleccionar = function () {
        var self = this;
        Object.keys(this.piezas).forEach(function (k) { self.piezas[k].setVisible(false); });
        this.sel = null;
        this.nombre.setText("");
    };

    ConsolaRobot.prototype.girar = function (rot, dir) {
        this.rot = rot;
        this.indicador += (dir < 0 ? -1 : 1) * Math.PI / 2;
    };

    ConsolaRobot.prototype.marcar = function (id) {
        this.puestas[id] = true;
        this.actualizarCuenta();
        this.cuentaPop = 1;
        if (this.sel === id) this.deseleccionar();
    };

    ConsolaRobot.prototype.desmarcar = function (id) {
        delete this.puestas[id];
        this.actualizarCuenta();
    };

    /** Accesibilidad «Mostrar progreso»: oculta el contador y las luces de avance. */
    ConsolaRobot.prototype.mostrarProgreso = function (on) {
        this.progresoOn = on !== false;
        this.cuenta.setVisible(this.progresoOn);
        this.etiquetaDiag.setVisible(this.progresoOn);
    };

    ConsolaRobot.prototype.habilitar = function (on) { this.habilitada = !!on; };
    ConsolaRobot.prototype.modo = function (m) { this.modoActual = m || "normal"; };
    ConsolaRobot.prototype.llamarAtencion = function () { this.atencion = 1; };

    ConsolaRobot.prototype.puntoBoton = function (nombre) {
        var b = this.botones[nombre];
        return b ? { x: b.def.x, y: b.def.y } : null;
    };

    ConsolaRobot.prototype.update = function (dt, ts) {
        var self = this;
        var s = dt / 1000;
        this.anim.update(dt);
        this.atencion = Math.max(0, this.atencion - s * 0.25);
        this.cuentaPop = Math.max(0, (this.cuentaPop || 0) - s * 2.5);
        this.cuenta.setScale(1 + 0.35 * Math.sin((this.cuentaPop || 0) * Math.PI));
        this.dibujarDiag(ts);
        // pantalla de pieza
        var dif = ((this.rot - this.rotVis + 540) % 360) - 180;
        this.rotVis += dif * Math.min(1, dt / 90);
        var g = this.gPant;
        g.clear();
        var fiesta = this.modoActual !== "normal";
        if (this.sel && !fiesta) {
            var p = this.piezas[this.sel];
            p.pop = Math.max(0, (p.pop || 0) - s * 3);
            p.setScale(p.base * p.k * (1 + 0.15 * Math.sin(p.pop * Math.PI)));
            p.setRotation(M().rad(this.rotVis));
            this.planoImg.setAlpha(0);
            var derecha = Math.abs(((this.rot % 360) + 360) % 360) < 1;
            var col = derecha ? 0x69db7c : 0xffc94d;
            g.lineStyle(10, 0x14213d, 1);
            g.strokeCircle(PANT.x, PANT.y, PANT.r);
            g.lineStyle(6, col, 0.9);
            g.strokeCircle(PANT.x, PANT.y, PANT.r);
            // marca de "arriba" (meta) y flecha con la orientación actual
            g.fillStyle(0x69db7c, 1);
            g.fillTriangle(PANT.x - 12, PANT.y - PANT.r - 16, PANT.x + 12, PANT.y - PANT.r - 16, PANT.x, PANT.y - PANT.r + 2);
            var a = M().rad(this.rotVis) - Math.PI / 2;
            var ax = PANT.x + Math.cos(a) * PANT.r, ay = PANT.y + Math.sin(a) * PANT.r;
            g.fillStyle(col, 1);
            g.fillCircle(ax, ay, 11);
            g.lineStyle(3, 0x14213d, 1);
            g.strokeCircle(ax, ay, 11);
            this.check.setText(derecha ? "✓" : "");
        } else {
            Object.keys(this.piezas).forEach(function (k) { self.piezas[k].setVisible(false); });
            this.check.setText("");
            // plano del nivel: silueta que cambia cada tanto con una línea de escaneo
            this.planoT += dt;
            if (this.planoT > 2600) { this.planoT = 0; this.plano += 1; this.mostrarPlano(); }
            var u = this.planoT / 2600;
            this.planoImg.setAlpha(fiesta ? 0 : 0.55 * Math.min(1, u * 5, (1 - u) * 5));
            g.lineStyle(2, this.luz, 0.25);
            for (var y = PANT.y - 100; y < PANT.y + 100; y += 22) g.lineBetween(PANT.x - 118, y, PANT.x + 118, y);
            if (!fiesta) {
                var sy = PANT.y - 100 + 200 * ((ts * 0.6) % 1);
                g.lineStyle(4, this.luz, 0.6);
                g.lineBetween(PANT.x - 118, sy, PANT.x + 118, sy);
            } else {
                // pantalla de felicitación: estrellas que giran y una carita
                for (var k = 0; k < 6; k++) {
                    var an = ts * 2 + k * Math.PI / 3;
                    g.fillStyle([0xffd43b, 0xff8cc6, 0x69db7c, 0x74c0fc][k % 4], 1);
                    g.fillCircle(PANT.x + Math.cos(an) * 70, PANT.y + Math.sin(an) * 70, 9);
                }
                g.lineStyle(7, 0xffd43b, 1);
                g.strokeCircle(PANT.x, PANT.y, 38);
                g.fillStyle(0xffd43b, 1);
                g.fillCircle(PANT.x - 13, PANT.y - 8, 5);
                g.fillCircle(PANT.x + 13, PANT.y - 8, 5);
                g.beginPath();
                g.arc(PANT.x, PANT.y + 2, 20, Math.PI * 0.15, Math.PI * 0.85, false);
                g.strokePath();
            }
            this.nombre.setText(fiesta ? (this.modoActual === "activacion" ? "¡ACTIVANDO!" : "¡MUY BIEN!") : "");
        }
        // indicador circular que gira con cada giro
        this.ruedita.rotation += (this.indicador - this.ruedita.rotation) * Math.min(1, dt / 120);
        // botones: presión, brillo de atención y apagado si no hay pieza tomada
        Object.keys(this.botones).forEach(function (k) {
            var b = self.botones[k];
            if (!b.visible) return;
            b.presion = Math.max(0, b.presion - s * 5);
            var at = k !== "escaner" ? self.atencion : 0;
            var latido = at > 0 ? Math.abs(Math.sin(ts * 5)) * at : 0;
            b.img.setScale(b.img.base * (1 - 0.12 * b.presion + 0.1 * latido));
            var listo = self.habilitada && (k === "escaner" || !!self.sel);
            b.img.setAlpha(listo ? 1 : 0.55);
            b.aura.setAlpha(Math.max(latido * 0.8, b.presion * 0.7, k !== "escaner" && self.sel ? 0.18 + 0.12 * Math.sin(ts * 4) : 0));
        });
    };

    /** Esquema del robot: cada pieza del nivel encendida si ya está conectada. */
    ConsolaRobot.prototype.dibujarDiag = function (ts) {
        var g = this.gDiag, self = this;
        g.clear();
        var k = DIAG.k;
        var fiesta = this.modoActual !== "normal";
        g.fillStyle(0x3b4a6e, 1);
        g.fillRoundedRect(DIAG.x - 110 * k, DIAG.y - 120 * k, 220 * k, 240 * k, 6);
        var orden = ["pierna-izq", "pierna-der", "pie-izq", "pie-der", "modulo", "brazo-izq", "brazo-der", "mano-izq", "mano-der", "cabeza", "antena"];
        orden.forEach(function (id) {
            if (self.ids.indexOf(id) < 0) return;
            var c = D().centro(id), geo = D().GEOM[id];
            var w = geo.w * k * 0.7, h = geo.h * k * 0.8;
            var on = !!self.puestas[id];
            var col = on ? (fiesta ? [0xffd43b, 0xff8cc6, 0x69db7c, 0x74c0fc][(id.length + Math.floor(ts * 4)) % 4] : 0x69db7c) : 0x495a80;
            g.fillStyle(col, on ? 1 : 0.6);
            g.fillRoundedRect(DIAG.x + c.x * k - w / 2, DIAG.y + c.y * k - h / 2, w, h, 3);
            if (!on && self.sel === id) {
                g.lineStyle(2, 0xffd43b, 0.6 + 0.4 * Math.sin(ts * 8));
                g.strokeRoundedRect(DIAG.x + c.x * k - w / 2 - 2, DIAG.y + c.y * k - h / 2 - 2, w + 4, h + 4, 3);
            }
        });
        // luces de avance
        if (this.progresoOn === false) return;
        var n = this.ids.length;
        var paso = Math.min(18, 130 / Math.max(1, n));
        for (var i = 0; i < n; i++) {
            var on = i < Object.keys(this.puestas).length;
            g.fillStyle(on ? 0x69db7c : 0x253556, 1);
            g.fillCircle(420 - (n - 1) * paso / 2 + i * paso, 214, 5);
        }
    };

    global.ConsolaRobot = ConsolaRobot;
})(typeof window !== "undefined" ? window : global);
