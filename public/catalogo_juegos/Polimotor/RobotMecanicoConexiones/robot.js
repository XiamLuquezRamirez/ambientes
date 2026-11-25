/**
 * RobotMecanico — el robot de la estación de ensamblaje (window.RobotMecanico).
 *
 * Torso preensamblado con su pantalla-cara, ranuras visibles (silueta de la pieza + pestaña con la
 * forma de su conexión) y las piezas encajadas. Cada pieza vive en un contenedor anclado a su junta
 * (hombro, cadera, cuello, muñeca, tobillo…), así brazos, manos, piernas, pies y cabeza giran desde
 * donde se conectan y los hijos siguen a su pieza madre.
 *
 * No decide nada: la escena le dice qué ranuras están activas, cuál resaltar y cuándo encajar.
 */
(function (global) {
    "use strict";

    var M = function () { return global.MotorRobot; };
    var D = function () { return global.DibujosRobot; };

    // orden de dibujo: piernas detrás del torso, brazos y cabeza delante
    var ATRAS = ["pierna-izq", "pierna-der"];
    var DELANTE = ["modulo", "brazo-izq", "brazo-der", "cabeza"];
    var HIJOS = { "brazo-izq": ["mano-izq"], "brazo-der": ["mano-der"], "pierna-izq": ["pie-izq"], "pierna-der": ["pie-der"], "cabeza": ["antena"] };
    var TINTE_RANURA = 0xbfefff;
    var TINTE_OK = 0x8ce99a;
    var TINTE_GIRO = 0xffc94d;

    function RobotMecanico(scene, x, y) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.anim = new (M().Animador)();
        this.partes = {};
        this.activos = {};
        this.t = 0;
        this.cara = "feliz";
        this.mirada = 0;
        this.parpadeo = 0;
        this.proxParpadeo = 2200;
        this.ojosOn = 0;
        this.brilloJuntas = 0;
        this.modBrillo = 0;
        this.senales = [];
        this.luzCara = D().luzLab();
        this.construir();
    }

    RobotMecanico.prototype.construir = function () {
        var s = this.scene, self = this;
        var img = M().img;
        this.raiz = s.add.container(this.x, this.y).setDepth(20);
        this.sombra = img(s, this.x, this.y + 330, "sombra", 2.6).setDepth(19).setAlpha(0.55);

        ATRAS.forEach(function (id) { self.crearParte(id, self.raiz); });
        this.torso = img(s, 0, 0, "torso", 1);
        this.raiz.add(this.torso);
        this.tapa = img(s, 0, -112, "tapa", 1);
        this.raiz.add(this.tapa);
        this.caraG = s.add.graphics();
        this.raiz.add(this.caraG);
        // fila de luces de conexión en el pecho (una por pieza del nivel)
        this.leds = [];
        for (var i = 0; i < 11; i++) {
            var l = img(s, 0, -95, "chispa", 0.42).setBlendMode(global.Phaser.BlendModes.ADD).setAlpha(0);
            var base = s.add.circle(0, -95, 5, 0x0b1830).setStrokeStyle(2, 0x14213d);
            this.raiz.add(base);
            this.raiz.add(l);
            this.leds.push({ luz: l, base: base, id: null, on: 0 });
        }
        this.brilloModulo = img(s, 0, 38, "luz", 0.7).setBlendMode(global.Phaser.BlendModes.ADD).setTint(0xfff3a0).setAlpha(0);
        this.raiz.add(this.brilloModulo);
        DELANTE.forEach(function (id) { self.crearParte(id, self.raiz); });
        this.flecha = img(s, 0, 0, "flecha-giro", 0.8).setDepth(46).setTint(TINTE_GIRO).setAlpha(0);
    };

    /** Contenedor de una pieza en su junta, con silueta, pestaña, pieza y brillo de articulación. */
    RobotMecanico.prototype.crearParte = function (id, padre) {
        var s = this.scene, self = this;
        var img = M().img;
        var g = D().GEOM[id];
        var j = D().junta(id);
        var pos;
        if (g.padre) {
            var gp = D().GEOM[g.padre];
            pos = { x: -gp.jx + gp.hijo.x, y: -gp.jy + gp.hijo.y };
        } else {
            pos = { x: j.x, y: j.y };
        }
        var cont = s.add.container(pos.x, pos.y);
        var ghost = img(s, -g.jx, -g.jy, "silueta-" + id, 1).setTint(TINTE_RANURA).setAlpha(0);
        var pieza = img(s, -g.jx, -g.jy, "pieza-" + id, 1).setVisible(false);
        var sock = img(s, 0, 0, D().socketDe(id), g.tipo === "modulo" ? 1.3 : (g.tipo === "mano" || g.tipo === "pie" || g.tipo === "antena" ? 0.62 : 0.78)).setTint(TINTE_RANURA).setAlpha(0);
        var junta = img(s, 0, 0, "chispa", 0.9).setBlendMode(global.Phaser.BlendModes.ADD).setTint(0x7ff3ff).setAlpha(0);
        if (g.tipo === "modulo") { ghost.setPosition(0, 0); pieza.setPosition(0, 0); }
        cont.add([ghost, sock]);
        // los hijos (mano, pie, antena) van dentro del contenedor de su pieza madre
        var parte = { id: id, g: g, cont: cont, ghost: ghost, pieza: pieza, sock: sock, junta: junta, activo: false, visible: false, puesta: false, cerca: 0, cercaObj: 0, giroMal: false, pulso: 0 };
        this.partes[id] = parte;
        if (id === "cabeza") {
            cont.add(pieza);
            // ojos de la visera (se encienden en la activación)
            parte.ojos = D().ojos().map(function (o) {
                var e = img(s, -g.jx + o.x, -g.jy + o.y, "chispa", o.r / 14).setBlendMode(global.Phaser.BlendModes.ADD).setTint(0x7ff3ff).setAlpha(0);
                cont.add(e);
                return e;
            });
            (HIJOS[id] || []).forEach(function (h) { self.crearParte(h, cont); });
        } else {
            (HIJOS[id] || []).forEach(function (h) { self.crearParte(h, cont); });
            cont.add(pieza);
        }
        cont.add(junta);
        padre.add(cont);
        return parte;
    };

    /** Prepara el robot para un nivel: solo las ranuras de esas piezas, todo desarmado. */
    RobotMecanico.prototype.configurar = function (ids) {
        var self = this;
        this.anim.limpiar();
        this.activos = {};
        ids.forEach(function (id) { self.activos[id] = true; });
        Object.keys(this.partes).forEach(function (id) {
            var p = self.partes[id];
            p.activo = !!self.activos[id];
            p.puesta = false;
            p.cerca = 0;
            p.cercaObj = 0;
            p.giroMal = false;
            p.pieza.setVisible(false).setScale(p.pieza.base).setAlpha(1);
            p.cont.setRotation(0).setScale(1);
            p.junta.setAlpha(0);
            if (p.ojos) p.ojos.forEach(function (o) { o.setAlpha(0); });
            // una ranura hija se ve solo cuando su pieza madre ya está puesta
            self.verRanura(id, p.activo && !p.g.padre);
        });
        this.tapa.setVisible(!this.activos.cabeza);
        this.aparece = 0;
        this.raiz.setPosition(this.x, this.y).setScale(1).setRotation(0);
        this.sombra.setPosition(this.x, this.y + 330).setAlpha(0.55);
        this.ojosOn = 0;
        this.brilloJuntas = 0;
        this.modBrillo = 0;
        this.cara = "feliz";
        this.senales.forEach(function (sn) { sn.img.destroy(); });
        this.senales = [];
        this.brilloModulo.setAlpha(0);
        // luces del pecho: una por pieza del nivel, centradas
        var n = ids.length, paso = 15;
        this.leds.forEach(function (l, i) {
            var on = i < n;
            l.id = on ? ids[i] : null;
            l.on = 0;
            var x = (i - (n - 1) / 2) * paso;
            l.base.setVisible(on).setPosition(x, -95);
            l.luz.setVisible(on).setPosition(x, -95).setAlpha(0);
        });
    };

    RobotMecanico.prototype.verRanura = function (id, on) {
        var p = this.partes[id];
        if (!p) return;
        p.visible = !!on;
        p.ghost.setAlpha(on ? 0.3 : 0);
        p.sock.setAlpha(on ? 0.9 : 0);
    };

    /** Centro de la ranura en el mundo (donde debe quedar el centro de la pieza). */
    RobotMecanico.prototype.puntoRanura = function (id) {
        var c = D().centro(id);
        var k = this.raiz.scaleX || 1;
        return { x: this.raiz.x + c.x * k, y: this.raiz.y + c.y * k };
    };

    RobotMecanico.prototype.puntoJunta = function (id) {
        var c = D().junta(id);
        var k = this.raiz.scaleX || 1;
        return { x: this.raiz.x + c.x * k, y: this.raiz.y + c.y * k };
    };

    RobotMecanico.prototype.puntoCabeza = function () {
        var c = D().centro("cabeza");
        return { x: this.raiz.x + c.x, y: this.raiz.y + c.y };
    };

    /** La pieza que se arrastra se acerca a su ranura: brillo, y flecha de giro si está torcida. */
    RobotMecanico.prototype.resaltar = function (id, fuerza, orientacionOk) {
        var self = this;
        Object.keys(this.partes).forEach(function (k) {
            var p = self.partes[k];
            p.cercaObj = k === id ? fuerza : 0;
            p.giroMal = k === id && orientacionOk === false;
        });
        if (id && orientacionOk === false) {
            var c = this.puntoRanura(id);
            this.flecha.setPosition(c.x + 54, c.y - 50);
        }
    };

    RobotMecanico.prototype.apagarResaltes = function () { this.resaltar(null, 0, true); };

    /** Pulso de ayuda sobre una ranura (escáner o pista). */
    RobotMecanico.prototype.pulso = function (id) {
        var p = this.partes[id];
        if (!p || !p.visible) return;
        p.pulso = 1;
    };

    /** La pieza entra en su ranura: aparece encajada con un rebote, chispa azul y luz de conexión. */
    RobotMecanico.prototype.encajar = function (id) {
        var p = this.partes[id];
        if (!p) return Promise.resolve();
        var self = this, s = this.scene;
        p.puesta = true;
        p.cercaObj = 0;
        p.giroMal = false;
        p.ghost.setAlpha(0);
        p.sock.setAlpha(0);
        p.pieza.setVisible(true);
        var b = p.pieza.base;
        var led = this.leds.filter(function (l) { return l.id === id; })[0];
        (HIJOS[id] || []).forEach(function (h) { if (self.activos[h]) self.verRanura(h, true); });
        return this.anim.agregar(380, function (u) {
            p.pieza.setScale(b * M().lerp(1.12, 1, M().rebote(u)));
            p.junta.setAlpha(Math.sin(u * Math.PI) * 0.95);
            if (led) led.luz.setAlpha(u);
        }).then(function () {
            if (led) led.on = 1;
            p.pieza.setScale(b);
            p.junta.setAlpha(0);
        });
    };

    /** Quita una pieza encajada (lo usa la demostración). */
    RobotMecanico.prototype.deshacer = function (id) {
        var p = this.partes[id];
        if (!p) return;
        var self = this;
        p.puesta = false;
        p.pieza.setVisible(false);
        this.verRanura(id, p.activo);
        (HIJOS[id] || []).forEach(function (h) { self.verRanura(h, false); });
        this.leds.forEach(function (l) { if (l.id === id) { l.on = 0; l.luz.setAlpha(0); } });
    };

    /** Las piezas puestas se desvanecen y se encogen hacia su junta (salida de nivel sin parpadeo). */
    RobotMecanico.prototype.desarmar = function () {
        var self = this;
        var puestas = Object.keys(this.partes).filter(function (id) { return self.partes[id].puesta; });
        var leds = this.leds.filter(function (l) { return l.id; });
        this.cara = "feliz";
        return this.anim.agregar(650, function (u) {
            var s = M().suave(u);
            puestas.forEach(function (id) {
                var p = self.partes[id];
                p.pieza.setAlpha(1 - s);
                p.cont.setScale(1 - 0.15 * s);
            });
            leds.forEach(function (l) { l.luz.setAlpha((1 - s) * 0.8); });
        });
    };

    // ------------------------------------------------------------------ movimientos

    function cont(self, id) { return self.partes[id] && self.partes[id].puesta ? self.partes[id].cont : null; }

    /** Gira contenedores desde su junta: objetivo en grados por id, ida y vuelta. */
    RobotMecanico.prototype.gesto = function (rotaciones, ms, veces) {
        var self = this;
        var n = veces || 1;
        var ids = Object.keys(rotaciones);
        var r0 = {};
        ids.forEach(function (id) { var c = cont(self, id); r0[id] = c ? c.rotation : 0; });
        return this.anim.agregar(ms * n, function (u) {
            var w = Math.sin(u * Math.PI * n);
            ids.forEach(function (id) {
                var c = cont(self, id);
                if (c) c.setRotation(r0[id] + M().rad(rotaciones[id]) * w);
            });
        }).then(function () {
            ids.forEach(function (id) { var c = cont(self, id); if (c) c.setRotation(r0[id]); });
        });
    };

    /** Nivel 1: mueve brazos y piernas. */
    RobotMecanico.prototype.moverExtremidades = function () {
        var self = this;
        this.cara = "contento";
        return this.gesto({ "brazo-izq": 28, "brazo-der": -28 }, 520, 2).then(function () {
            return Promise.all([
                self.gesto({ "pierna-izq": 14 }, 420, 1),
                M().sleep(260).then(function () { return self.gesto({ "pierna-der": -14 }, 420, 1); })
            ]);
        }).then(function () { return self.gesto({ "brazo-izq": 60, "brazo-der": -60 }, 700, 1); });
    };

    /** Nivel 2: mueve la cabeza y enciende los ojos. */
    RobotMecanico.prototype.moverCabeza = function () {
        var self = this;
        this.cara = "sorpresa";
        return this.encenderOjos(true).then(function () {
            self.cara = "contento";
            return self.gesto({ cabeza: 12 }, 600, 2);
        }).then(function () { return self.gesto({ "brazo-izq": 50, "brazo-der": -50 }, 600, 1); });
    };

    RobotMecanico.prototype.encenderOjos = function (on) {
        var p = this.partes.cabeza;
        var self = this;
        if (!p || !p.ojos) return Promise.resolve();
        var a0 = this.ojosOn, a1 = on ? 1 : 0;
        return this.anim.agregar(500, function (u) {
            // parpadea dos veces antes de quedar encendido
            var v = M().lerp(a0, a1, u);
            if (on && u < 0.6) v *= (Math.sin(u * 30) > 0 ? 1 : 0.2);
            self.ojosOn = v;
        });
    };

    /** Un pasito: el cuerpo sube y baja mientras una pierna se levanta. */
    RobotMecanico.prototype.paso = function (lado, dx) {
        var self = this;
        var id = lado === "der" ? "pierna-der" : "pierna-izq";
        var x0 = this.raiz.x, y0 = this.raiz.y;
        var sx0 = this.sombra.x;
        return this.anim.agregar(480, function (u) {
            var w = Math.sin(u * Math.PI);
            var c = cont(self, id);
            if (c) c.setRotation(M().rad(lado === "der" ? -16 : 16) * w);
            self.raiz.setPosition(x0 + (dx || 0) * u, y0 - 10 * w);
            self.sombra.setX(sx0 + (dx || 0) * u);
        }).then(function () {
            var c = cont(self, id);
            if (c) c.setRotation(0);
        });
    };

    /** Nivel 3: mueve las manos, levanta los brazos y da pasitos. */
    RobotMecanico.prototype.manosYPasos = function () {
        var self = this;
        this.cara = "contento";
        return Promise.all([
            this.gesto({ "mano-izq": 30, "mano-der": -30 }, 300, 4),
            this.gesto({ "brazo-izq": 25, "brazo-der": -25 }, 600, 2)
        ]).then(function () {
            return self.gesto({ "brazo-izq": 150, "brazo-der": -150 }, 1100, 1);
        }).then(function () {
            return self.paso("izq", 18);
        }).then(function () { return self.paso("der", 18); })
            .then(function () { return self.paso("izq", -18); })
            .then(function () { return self.paso("der", -18); });
    };

    /** Brillo en las articulaciones (cinemática). */
    RobotMecanico.prototype.brillarJuntas = function (v) { this.brilloJuntas = v; };
    RobotMecanico.prototype.brillarModulo = function (v) { this.modBrillo = v; };

    /** Señal luminosa de la antena: anillos que salen de la punta. */
    RobotMecanico.prototype.senalAntena = function (n) {
        var p = this.partes.antena;
        if (!p || !p.puesta) return;
        var self = this, s = this.scene;
        for (var i = 0; i < (n || 3); i++) {
            (function (k) {
                setTimeout(function () {
                    if (!self.raiz || !self.raiz.scene) return;
                    var punta = self.puntaAntenaMundo();
                    var a = M().img(s, punta.x, punta.y, "anillo", 0.15).setDepth(47).setBlendMode(global.Phaser.BlendModes.ADD).setTint(D().color("acento"));
                    self.senales.push({ img: a, t: 0 });
                }, k * 260);
            })(i);
        }
    };

    RobotMecanico.prototype.puntaAntenaMundo = function () {
        var p = this.partes.antena;
        var o = D().puntaAntena();
        var m = p.pieza.getWorldTransformMatrix ? p.pieza.getWorldTransformMatrix() : null;
        if (m && typeof m.transformPoint === "function") {
            var r = m.transformPoint(o.x * D().res("pieza-antena"), o.y * D().res("pieza-antena"));
            if (r && isFinite(r.x)) return { x: r.x, y: r.y };
        }
        var c = this.puntoRanura("antena");
        return { x: c.x + o.x, y: c.y + o.y };
    };

    /** Mirada de la cara del pecho hacia un punto del mundo (o al frente con null). */
    RobotMecanico.prototype.mirar = function (x) {
        this.mirada = x == null ? 0 : Math.max(-1, Math.min(1, (x - this.raiz.x) / 400));
    };

    RobotMecanico.prototype.expresion = function (c) { this.cara = c || "feliz"; };

    // ------------------------------------------------------------------ cuadro a cuadro

    RobotMecanico.prototype.update = function (dt, ts) {
        var self = this;
        this.t += dt;
        this.anim.update(dt);
        var k = Math.min(1, dt / 90);
        this.aparece = Math.min(1, (this.aparece == null ? 1 : this.aparece) + dt / 700);
        var ap = M().suave(this.aparece);
        Object.keys(this.partes).forEach(function (id) {
            var p = self.partes[id];
            if (!p.visible || p.puesta) return;
            p.cerca += (p.cercaObj - p.cerca) * k;
            p.pulso = Math.max(0, p.pulso - dt / 2200);
            var latido = 0.5 + 0.5 * Math.sin(ts * 3 + id.length);
            var ayuda = p.pulso > 0 ? Math.abs(Math.sin(ts * 9)) * p.pulso : 0;
            var a = 0.24 + 0.1 * latido + 0.5 * p.cerca + 0.55 * ayuda;
            p.ghost.setAlpha(Math.min(0.95, a) * ap);
            p.ghost.setTint(p.giroMal ? TINTE_GIRO : (p.cerca > 0.05 || ayuda > 0 ? TINTE_OK : TINTE_RANURA));
            var esc = p.sock.base * (1 + 0.12 * p.cerca + 0.08 * latido * (p.cerca > 0.05 ? 1 : 0.3) + 0.25 * ayuda);
            p.sock.setScale(esc).setAlpha((0.85 + 0.15 * latido) * ap);
            p.sock.setTint(p.giroMal ? TINTE_GIRO : (p.cerca > 0.05 || ayuda > 0 ? TINTE_OK : TINTE_RANURA));
        });
        // flecha que sugiere girar la pieza (gira sobre sí misma)
        var giro = Object.keys(this.partes).some(function (id) { return self.partes[id].giroMal; });
        this.flecha.setAlpha(this.flecha.alpha + ((giro ? 0.95 : 0) - this.flecha.alpha) * k);
        if (this.flecha.alpha > 0.01) this.flecha.rotation += dt / 260;
        // luces del pecho
        this.leds.forEach(function (l, i) {
            if (!l.id || !l.on) return;
            l.luz.setAlpha(0.75 + 0.25 * Math.sin(ts * 4 + i)).setTint(0x69db7c);
        });
        // ojos, articulaciones y módulo
        var cab = this.partes.cabeza;
        if (cab && cab.ojos) cab.ojos.forEach(function (o) { o.setAlpha(self.ojosOn * (0.85 + 0.15 * Math.sin(ts * 5))); });
        Object.keys(this.partes).forEach(function (id) {
            var p = self.partes[id];
            if (p.puesta && self.brilloJuntas > 0) p.junta.setAlpha(self.brilloJuntas * (0.6 + 0.4 * Math.sin(ts * 6 + id.length)));
        });
        this.brilloModulo.setAlpha(this.modBrillo * (0.7 + 0.3 * Math.sin(ts * 7)));
        // señales de la antena
        this.senales = this.senales.filter(function (sn) {
            sn.t += dt;
            var u = sn.t / 1100;
            if (u >= 1) { sn.img.destroy(); return false; }
            sn.img.setScale(sn.img.base * (1 + u * 5)).setAlpha(1 - u);
            return true;
        });
        this.dibujarCara(dt, ts);
    };

    /** Cara en la pantalla del pecho: ojos que parpadean, miran y cambian de expresión. */
    RobotMecanico.prototype.dibujarCara = function (dt, ts) {
        var g = this.caraG;
        g.clear();
        this.proxParpadeo -= dt;
        if (this.proxParpadeo <= 0) { this.parpadeo = 1; this.proxParpadeo = 2400 + Math.random() * 2600; }
        this.parpadeo = Math.max(0, this.parpadeo - dt / 160);
        var cierre = this.parpadeo > 0 ? Math.sin(this.parpadeo * Math.PI) : 0;
        var col = this.luzCara;
        var cx = 0, cy = -39;
        var mx = this.mirada * 8;
        g.fillStyle(col, 0.12);
        g.fillRoundedRect(cx - 46, cy - 25, 92, 50, 12);
        g.lineStyle(5, col, 1);
        g.fillStyle(col, 1);
        var c = this.cara;
        [-1, 1].forEach(function (lado) {
            var ex = cx + lado * 21 + mx, ey = cy - 6;
            if (c === "contento") {
                g.beginPath();
                g.arc(ex, ey + 4, 9, Math.PI * 1.1, Math.PI * 1.9, false);
                g.strokePath();
            } else if (c === "corazon") {
                g.fillCircle(ex - 4, ey - 2, 5);
                g.fillCircle(ex + 4, ey - 2, 5);
                g.fillTriangle(ex - 9, ey, ex + 9, ey, ex, ey + 10);
            } else {
                var h = (c === "sorpresa" ? 18 : 15) * (1 - 0.9 * cierre);
                g.fillRoundedRect(ex - 6, ey - h / 2, 12, Math.max(2, h), Math.min(6, Math.max(1, h / 2)));
            }
        });
        if (c === "sorpresa") {
            g.strokeCircle(cx + mx * 0.5, cy + 14, 5);
        } else {
            g.beginPath();
            g.arc(cx + mx * 0.5, cy + 8, 11, Math.PI * 0.15, Math.PI * 0.85, false);
            g.strokePath();
        }
    };

    global.RobotMecanico = RobotMecanico;
})(typeof window !== "undefined" ? window : global);
