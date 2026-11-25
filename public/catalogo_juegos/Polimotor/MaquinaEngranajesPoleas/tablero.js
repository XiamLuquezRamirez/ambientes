/**
 * TableroMaquina — el tablero mecánico del centro (window.TableroMaquina).
 *
 * Dibuja la placa (horneada), los ejes con su base, la sombra de la pieza que espera, el aro
 * magnético, el foco y la etiqueta de tamaño; las poleas y correas fijas del nivel; y las piezas
 * ya ensambladas. Lleva la transmisión: la rueda principal tiene el ángulo φ0 y cada pieza
 * conectada vale a·φ0 + b (ReglasMaquina.relaciones / fase), así las ruedas que se tocan giran al
 * revés, la pequeña más rápido y los dientes nunca se pisan. No decide aciertos.
 */
(function (global) {
    "use strict";

    var M = function () { return global.MotorMaquina; };
    var D = function () { return global.DibujosMaquina; };
    var R = function () { return global.ReglasMaquina; };
    var EV = function () { return global.EventosMaquina; };
    var Phaser = global.Phaser;
    var DOS_PI = Math.PI * 2;

    var COLOR = { apagado: 0x9fb3d1, libre: 0xd0ebff, guia: 0x4dd4f0, cerca: 0x51cf66, error: 0xff922b, puesto: 0x8ce99a, pista: 0xffd43b };
    var NOMBRE_TALLA = { grande: "GRANDE", mediano: "MEDIANO", pequeno: "PEQUEÑO" };

    function emitir(n, d) { if (EV()) EV().emitir(n, d); }

    function Tablero(scene, cfg, variante) {
        this.scene = scene;
        this.cfg = cfg;
        this.v = variante;
        this.mb = Number((cfg.juego || {}).moduloBase) || 12;
        this.objetos = [];
        this.el = {};
        this.co = {};
        this.dest = {};
        this.puestos = {};
        this.phi0 = 0;
        this.omega = 0;
        this.omegaObj = 0;
        this.cursor = null;
        this.luces = [];
        this.particulas = new (M().Particulas)(scene, 46, 640);
        this.anim = scene.anim;
        this.encendido = 0;
        this.alfa = 1;
        this.t = 0;
    }

    Tablero.prototype.escala = function () { return this.geo ? this.geo.modulo / this.mb : 1; };

    Tablero.prototype.limpiar = function () {
        this.objetos.forEach(function (o) { if (o && o.destroy) o.destroy(); });
        this.objetos = [];
        if (this.hPlaca) { this.hPlaca.destruir(); this.hPlaca = null; }
        if (this.hEjes) { this.hEjes.destruir(); this.hEjes = null; }
        var self = this;
        Object.keys(this.el).forEach(function (k) {
            var e = self.el[k];
            if (e.fijo && e.pieza) e.pieza.cont.destroy();
        });
        this.el = {};
        this.co = {};
        this.dest = {};
        this.puestos = {};
        this.luces = [];
        this.particulas.apagar();
    };

    Tablero.prototype.guardar = function (o) { this.objetos.push(o); return o; };

    // ------------------------------------------------------------------ armado del nivel

    Tablero.prototype.configurar = function (geo, nivel) {
        this.limpiar();
        this.geo = geo;
        this.nivel = nivel || {};
        this.phi0 = 0;
        this.omega = 0;
        this.omegaObj = 0;
        this.marcha = false;
        this.encendido = 0;
        this.alfa = 1;
        this.rel = R().relaciones(geo);
        var s = this.scene, self = this;
        var esc = this.escala();
        this.pintarPlaca(geo);

        Object.keys(geo.ejes).forEach(function (k) {
            var d = geo.ejes[k];
            self.el[k] = { id: k, def: d, tipo: d.tipo, fijo: !!d.fijo, a: self.rel[k] || 0, b: 0, ang: Math.random() * DOS_PI, conectado: false, visible: false, pieza: null };
        });

        // destinos: sombra de la pieza, aro, foco y etiqueta
        R().destinos(geo).forEach(function (d) {
            var o = { id: d.id, def: d, estado: "apagado", t: 0, flash: 0, flashColor: 0, sacude: 0, brillo: 0 };
            if (d.tipo === "correa") {
                // guía de la correa: siempre a la vista (tenue mientras faltan sus poleas), con
                // trazos que corren alrededor de las dos poleas y un letrero «CORREA»
                var pc = geo.ejes[d.entre[0]], qc = geo.ejes[d.entre[1]];
                o.cgeo = R().correa(pc, qc);
                o.guia = self.guardar(s.add.graphics().setDepth(129));
                o.etiqueta = self.guardar(s.add.text(d.x, d.y - 26, "CORREA", {
                    fontFamily: M().FUENTE, fontSize: "18px", fontStyle: "700", color: "#ffffff",
                    backgroundColor: "#7048e8", padding: { x: 10, y: 4 }
                }).setOrigin(0.5).setDepth(130));
                self.pintarGuiaCorrea(o, 0, "apagado", 0);
            } else {
                var polea = d.tipo === "polea";
                var key = !polea ? D().silueta(s, d.z, self.mb) : D().siluetaPolea(s, R().radioPolea(self.cfg, d.talla, self.mb), self.mb);
                // las guías de las poleas van por encima de las máquinas (noria, ventilador, cinta)
                var prof = polea ? (d.sobre ? 121 : 119.5) : 86;
                o.sil = self.guardar(s.add.image(d.x, d.y, key).setScale(esc).setTint(polea ? 0xf76707 : 0x0b1d3a).setAlpha(polea ? 0.5 : 0.34).setDepth(prof));
                o.aro = self.guardar(s.add.image(d.x, d.y, D().aro(s)).setScale((d.ra + 9) / 100).setDepth(polea ? prof + 0.6 : 95).setBlendMode(Phaser.BlendModes.ADD));
                if (polea) {
                    // contorno punteado que gira despacio: «aquí va una polea»
                    o.punteado = self.guardar(s.add.graphics({ x: d.x, y: d.y }).setDepth(prof + 0.4));
                    var rp = d.ra + 3, nseg = 18;
                    o.punteado.lineStyle(9, 0x7a2e00, 0.55);
                    o.punteado.strokeCircle(0, 0, rp);
                    o.punteado.lineStyle(6, 0xffffff, 1);
                    for (var i = 0; i < nseg; i++) {
                        var a0 = i / nseg * Math.PI * 2, a1 = a0 + Math.PI / nseg;
                        o.punteado.beginPath();
                        o.punteado.arc(0, 0, rp, a0, a1, false);
                        o.punteado.strokePath();
                    }
                }
                var ang = d.sobre ? 0.25 * Math.PI : 0.3 * Math.PI;
                o.foco = self.guardar(s.add.image(d.x + Math.cos(ang) * (d.ra + 16), d.y + Math.sin(ang) * (d.ra + 16), "p-chispa").setDepth(polea ? prof + 0.8 : 96).setBlendMode(Phaser.BlendModes.ADD).setScale(0.7));
                var texto = !polea ? NOMBRE_TALLA[d.talla] : (d.talla === "grande" ? "POLEA GRANDE" : "POLEA PEQUEÑA");
                var estilo = !polea ? {
                    fontFamily: M().FUENTE, fontSize: Math.round(Math.max(13, Math.min(19, d.r * 0.2))) + "px", fontStyle: "700", color: "#ffffff",
                    stroke: "#0b1d3a", strokeThickness: 4
                } : {
                    fontFamily: M().FUENTE, fontSize: "17px", fontStyle: "700", color: "#ffffff",
                    backgroundColor: "#e8590c", padding: { x: 9, y: 3 }
                };
                var ye = !polea ? d.y + Math.max(d.r * 0.48, 30) : d.y + d.ra + 20;
                o.etiqueta = self.guardar(s.add.text(d.x, ye, texto, estilo).setOrigin(0.5).setDepth(polea ? 127 : 97).setAlpha(0.9));
                if (d.sobre) { o.sil.setVisible(false); o.aro.setVisible(false); o.foco.setVisible(false); o.etiqueta.setVisible(false); o.punteado.setVisible(false); }
            }
            self.dest[d.id] = o;
        });

        // poleas fijas (aparecen al poner su rueda)
        geo.fijos.poleas.forEach(function (d) {
            var e = self.el[d.id];
            e.pieza = D().crearPieza(s, { id: d.id, tipo: "polea", talla: d.talla }, self.v, self.opcionesPieza());
            e.pieza.cont.setPosition(d.x, d.y).setScale(0).setDepth(d.sobre ? 131 : 124);
            e.pieza.girar(e.ang);
            e.escObj = esc;
            if (!d.aparece) self.mostrarFijo(d.id, true);
        });
        geo.fijos.correas.forEach(function (c) { self.crearCorrea(c); });
        geo.correas.forEach(function (c) { self.crearCorrea(c); });

        // focos del borde superior: uno por pieza, se encienden con el progreso
        var T = geo.tablero;
        var n = R().destinos(geo).length;
        for (var i = 0; i < n; i++) {
            var x = T.x0 + 70 + i * ((T.x1 - T.x0 - 140) / Math.max(1, n - 1));
            if (n === 1) x = (T.x0 + T.x1) / 2;
            var base = this.guardar(s.add.image(x, T.y0 + 15, "p-chispa").setDepth(84).setTint(0x16294a).setScale(0.62));
            var luz = this.guardar(s.add.image(x, T.y0 + 15, "p-chispa").setDepth(85).setBlendMode(Phaser.BlendModes.ADD).setTint(0x8ce99a).setScale(0.75).setAlpha(0));
            this.luces.push({ base: base, luz: luz, on: 0, obj: 0, fase: i * 0.7 });
        }
        this.actualizarDestinos(null);
    };

    Tablero.prototype.opcionesPieza = function () {
        var self = this;
        return {
            moduloBase: this.mb,
            dientes: { grande: R().dientes(this.cfg, "grande"), mediano: R().dientes(this.cfg, "mediano"), pequeno: R().dientes(this.cfg, "pequeno") },
            radioPolea: function (t, m) { return R().radioPolea(self.cfg, t, m); }
        };
    };

    Tablero.prototype.crearCorrea = function (c) {
        var p = this.geo.ejes[c.entre[0]], q = this.geo.ejes[c.entre[1]];
        var g = this.guardar(this.scene.add.graphics().setDepth(136));
        this.co[c.id] = { id: c.id, def: c, p: p.id, q: q.id, geo: R().correa(p, q), g: g, visible: false, tension: 0, s: 0, ultimo: null };
    };

    Tablero.prototype.pintarPlaca = function (geo) {
        var T = geo.tablero, E = geo.estacion, v = this.v.tablero || {};
        var placa = D().hexA(v.placa || "#3d6fb6"), oscuro = D().hexA(v.oscuro || "#24457e"), claro = D().hexA(v.claro || "#6f9de0");
        var self = this;
        var w = T.x1 - T.x0, h = T.y1 - T.y0;
        this.hPlaca = new (M().Horno)(this.scene, T.x0 - 20, T.y0 - 20, w + 50, h + 54, { mundo: true, prof: 80 });
        var semilla = this.v.semilla || 1;
        this.hPlaca.pintar(function (g) {
            g.fillStyle(0x0b1d3a, 0.28);
            g.fillRoundedRect(T.x0 + 10, T.y0 + 16, w, h, 34);
            g.fillStyle(oscuro, 1);
            g.fillRoundedRect(T.x0, T.y0 + 8, w, h, 34);
            g.fillStyle(placa, 1);
            g.fillRoundedRect(T.x0, T.y0, w, h, 34);
            g.fillStyle(D().mezclar(placa, 0xffffff, 0.12), 1);
            g.fillRoundedRect(T.x0 + 16, T.y0 + 30, w - 32, h - 46, 24);
            g.fillStyle(placa, 1);
            g.fillRoundedRect(T.x0 + 20, T.y0 + 34, w - 40, h - 54, 22);
            // cuadrícula de mecánico
            g.lineStyle(1.5, claro, 0.22);
            for (var x = T.x0 + 60; x < T.x1 - 20; x += 50) g.lineBetween(x, T.y0 + 36, x, T.y1 - 22);
            for (var y = T.y0 + 60; y < T.y1 - 20; y += 50) g.lineBetween(T.x0 + 22, y, T.x1 - 22, y);
            // franja del borde superior (para los focos) y franja de peligro abajo
            g.fillStyle(oscuro, 1);
            g.fillRoundedRect(T.x0 + 30, T.y0 + 4, w - 60, 22, 11);
            for (var k = 0; k < Math.floor((w - 120) / 36); k++) {
                g.fillStyle(k % 2 ? 0x1b1e2b : 0xffc425, 0.9);
                g.fillPoints([
                    { x: T.x0 + 60 + k * 36, y: T.y1 - 4 }, { x: T.x0 + 78 + k * 36, y: T.y1 - 4 },
                    { x: T.x0 + 70 + k * 36, y: T.y1 - 18 }, { x: T.x0 + 52 + k * 36, y: T.y1 - 18 }
                ], true, true);
            }
            // remaches (posición sorteada en los bordes)
            var rnd = semilla;
            var r = function () { rnd = (rnd * 9301 + 49297) % 233280; return rnd / 233280; };
            var remache = function (rx, ry) {
                g.fillStyle(oscuro, 1); g.fillCircle(rx + 1, ry + 2, 7);
                g.fillStyle(0xd7dde6, 1); g.fillCircle(rx, ry, 6);
                g.fillStyle(0xffffff, 0.8); g.fillCircle(rx - 2, ry - 2, 2.2);
            };
            [[T.x0 + 24, T.y0 + 24], [T.x1 - 24, T.y0 + 24], [T.x0 + 24, T.y1 - 24], [T.x1 - 24, T.y1 - 24]].forEach(function (p) { remache(p[0], p[1]); });
            var nRem = 6 + Math.floor(r() * 5);
            for (var i = 0; i < nRem; i++) {
                if (r() < 0.5) remache(T.x0 + 12, T.y0 + 80 + r() * (h - 160));
                else remache(T.x1 - 12, T.y0 + 80 + r() * (h - 160));
            }
            // estación de poleas
            if (E) {
                g.fillStyle(0x0b1d3a, 0.25);
                g.fillRoundedRect(E.x0 + 6, E.y0 + 8, E.x1 - E.x0, E.y1 - E.y0, 24);
                g.fillStyle(D().mezclar(placa, 0x2b8a3e, 0.45), 1);
                g.fillRoundedRect(E.x0, E.y0, E.x1 - E.x0, E.y1 - E.y0, 24);
                g.lineStyle(4, 0xffd43b, 0.85);
                g.strokeRoundedRect(E.x0 + 6, E.y0 + 6, E.x1 - E.x0 - 12, E.y1 - E.y0 - 12, 20);
            }
            // bases de los ejes
            Object.keys(geo.ejes).forEach(function (k) {
                var d = geo.ejes[k];
                if (d.sobre) return;
                var rb = Math.max(d.ra * 0.42, 26);
                g.fillStyle(0x0b1d3a, 0.3);
                g.fillCircle(d.x + 4, d.y + 6, rb + 6);
                g.fillStyle(oscuro, 1);
                g.fillCircle(d.x, d.y, rb + 4);
                g.fillStyle(0x8f9bb0, 1);
                g.fillCircle(d.x, d.y, rb);
                g.fillStyle(0xb8c2d3, 1);
                g.fillCircle(d.x - rb * 0.1, d.y - rb * 0.12, rb * 0.78);
                for (var b = 0; b < 4; b++) {
                    var a = b * Math.PI / 2 + Math.PI / 4;
                    g.fillStyle(0x4a5262, 1);
                    g.fillCircle(d.x + Math.cos(a) * rb * 0.72, d.y + Math.sin(a) * rb * 0.72, 4);
                }
            });
        });
        // ejes metálicos (encima de las sombras, debajo de las piezas)
        this.hEjes = new (M().Horno)(this.scene, T.x0, T.y0, w, h, { mundo: true, prof: 90 });
        this.hEjes.pintar(function (g) {
            Object.keys(geo.ejes).forEach(function (k) {
                var d = geo.ejes[k];
                if (d.sobre) return;
                var re = Math.max(9, geo.modulo * 1.2);
                g.fillStyle(0x2a3140, 1);
                g.fillCircle(d.x + 2, d.y + 3, re + 2);
                g.fillStyle(0xe9edf3, 1);
                g.fillCircle(d.x, d.y, re);
                g.fillStyle(0x5c6677, 1);
                g.fillCircle(d.x, d.y, re * 0.55);
                g.fillStyle(0x1b1e2b, 1);
                g.fillCircle(d.x, d.y, re * 0.3);
                g.fillStyle(0xffffff, 0.9);
                g.fillCircle(d.x - re * 0.35, d.y - re * 0.4, re * 0.22);
            });
        });
        if (E && E.titulo) {
            var t = this.guardar(this.scene.add.text((E.x0 + E.x1) / 2, E.y0 + 22, E.titulo, {
                fontFamily: M().FUENTE, fontSize: "20px", fontStyle: "700", color: "#fff3bf", stroke: "#1c3a18", strokeThickness: 5
            }).setOrigin(0.5).setDepth(84));
            t.setLetterSpacing && t.setLetterSpacing(3);
        }
        this.guardar(this.scene.add.text(T.x0 + 40, T.y0 + 48, "TABLERO MECÁNICO", {
            fontFamily: M().FUENTE, fontSize: "17px", fontStyle: "700", color: "#ffffff", stroke: "#0b1d3a", strokeThickness: 4
        }).setOrigin(0, 0.5).setDepth(84).setAlpha(0.55));
    };

    /**
     * Guía de la correa: borde oscuro y trazos claros que avanzan (desplaz) alrededor de las dos
     * poleas. estado: apagado (faltan poleas: gris), libre (amarillo), guia (la correa está elegida:
     * más gruesa y blanca), cerca (verde).
     */
    var ESTILO_CORREA = {
        apagado: { color: 0xdee2e6, ancho: 6 },
        libre: { color: 0xffd43b, ancho: 7 },
        guia: { color: 0xffffff, ancho: 9 },
        cerca: { color: 0x69db7c, ancho: 9 },
        pista: { color: 0xffd43b, ancho: 9 }
    };

    Tablero.prototype.pintarGuiaCorrea = function (o, desplaz, estado, extra) {
        var c = o.cgeo;
        var g = o.guia;
        var e = ESTILO_CORREA[estado] || ESTILO_CORREA.libre;
        var ancho = e.ancho + (extra || 0);
        g.clear();
        var nb = Math.max(48, Math.round(c.largo / 8));
        var pts = [];
        for (var k = 0; k < nb; k++) pts.push(R().puntoCorrea(c, k / nb * c.largo));
        g.lineStyle(ancho + 6, 0x1b1e2b, 0.55);
        g.strokePoints(pts, true, true);
        var paso = 26, trazo = 15;
        var n = Math.floor(c.largo / paso);
        g.lineStyle(ancho, e.color, 1);
        for (var i = 0; i < n; i++) {
            var s0 = i * paso + (desplaz || 0);
            var a = R().puntoCorrea(c, s0), m = R().puntoCorrea(c, s0 + trazo / 2), b = R().puntoCorrea(c, s0 + trazo);
            g.beginPath();
            g.moveTo(a.x, a.y);
            g.lineTo(m.x, m.y);
            g.lineTo(b.x, b.y);
            g.strokePath();
        }
    };

    // ------------------------------------------------------------------ consultas

    Tablero.prototype.punto = function (id) {
        var d = this.geo && (this.geo.ejes[id] || this.geo.correas.filter(function (c) { return c.id === id; })[0]);
        return d ? { x: d.x, y: d.y } : { x: 800, y: 450 };
    };

    Tablero.prototype.habilitado = function (id) {
        return R().habilitado(this.dest[id] ? this.dest[id].def : null, this.geo, this.puestos);
    };

    /** Distancia del centro de la pieza a cada destino (las correas miden al tramo entre sus poleas). */
    Tablero.prototype.distancias = function (x, y) {
        var self = this;
        return R().destinos(this.geo).map(function (d) {
            var dist = d.tipo === "correa" ? R().distanciaCorrea(self.geo, d, x, y) : Math.sqrt((x - d.x) * (x - d.x) + (y - d.y) * (y - d.y));
            return { id: d.id, tipo: d.tipo, talla: d.talla, distancia: dist, ocupado: !!self.puestos[d.id], habilitado: R().habilitado(d, self.geo, self.puestos) };
        });
    };

    /** Ángulo con que la rueda debe entrar para que sus dientes caigan en los huecos del padre. */
    Tablero.prototype.faseObjetivo = function (id) {
        var e = this.el[id];
        if (!e || e.tipo !== "engranaje" || !e.def.padre) return null;
        var p = this.el[e.def.padre];
        if (!p || !this.puestos[p.id]) return null;
        return R().fase(p.def, e.def, p.ang);
    };

    /** Lleva `actual` al ángulo equivalente (por simetría de dientes) más cercano a `objetivo`. */
    Tablero.prototype.giroCercano = function (actual, objetivo, z) {
        var paso = z ? DOS_PI / z : DOS_PI;
        var d = objetivo - actual;
        d -= Math.round(d / paso) * paso;
        return actual + d;
    };

    Tablero.prototype.energia = function () {
        var n = R().destinos(this.geo).length;
        return n ? Object.keys(this.puestos).length / n : 0;
    };

    // ------------------------------------------------------------------ estados de los aros

    /**
     * sel: { tipo, talla } de la pieza elegida o arrastrada (o null). Los ejes que le sirven se
     * iluminan en azul; el resto queda tenue.
     */
    Tablero.prototype.actualizarDestinos = function (sel) {
        var self = this;
        this.sel = sel;
        Object.keys(this.dest).forEach(function (k) {
            var o = self.dest[k];
            var d = o.def;
            if (self.puestos[k]) { o.estado = "puesto"; return; }
            var hab = R().habilitado(d, self.geo, self.puestos);
            if (d.sobre) {
                var ver = hab;
                o.sil.setVisible(ver); o.aro.setVisible(ver); o.foco.setVisible(ver); o.etiqueta.setVisible(ver);
                if (o.punteado) o.punteado.setVisible(ver);
            }
            if (!hab) { o.estado = "apagado"; return; }
            if (sel && sel.tipo === d.tipo && sel.talla === d.talla) o.estado = "guia";
            else o.estado = "libre";
        });
    };

    Tablero.prototype.cerca = function (id, fuerza) {
        this.cercaId = id;
        this.cercaFuerza = fuerza || 0;
    };

    Tablero.prototype.flash = function (id, color, ms) {
        var o = this.dest[id];
        if (!o) return;
        o.flash = ms || 700;
        o.flashTotal = o.flash;
        o.flashColor = color;
    };

    /** Soltado en un eje que no le corresponde: el aro cambia de color y el mecanismo tiembla. */
    Tablero.prototype.error = function (id) {
        var o = this.dest[id];
        if (!o) return;
        this.flash(id, COLOR.error, 900);
        o.sacude = 1;
        var p = this.punto(id);
        this.particulas.emitir(p.x, p.y, { n: 6, tipos: ["p-polvo"], vel: 90, grav: -20, vida: 600, escala: 0.5, dispersion: 30, tintes: [0xffc078, 0xffffff] });
        var self = this;
        Object.keys(this.el).forEach(function (k) { var e = self.el[k]; if (e.pieza && self.puestos[k]) e.sacude = 0.6; });
    };

    /** Ayuda: el aro del eje correcto destella en amarillo y su sombra se aclara. */
    Tablero.prototype.pista = function (id) {
        var o = this.dest[id];
        if (!o) return;
        this.flash(id, COLOR.pista, 2600);
        o.brillo = 1;
    };

    // ------------------------------------------------------------------ ensamblaje

    Tablero.prototype.mostrarFijo = function (id, animar) {
        var e = this.el[id];
        if (!e || e.visible) return Promise.resolve();
        e.visible = true;
        var esc = this.escala();
        var cont = e.pieza.cont;
        var self = this;
        this.recalcular();
        if (!animar) { cont.setScale(esc); return Promise.resolve(); }
        return this.anim.agregar(620, function (u) { cont.setScale(esc * M().rebote(u)); }).then(function () {
            self.particulas.emitir(cont.x, cont.y, { n: 8, tipos: ["p-chispa", "p-estrella"], vel: 160, grav: 60, vida: 700, escala: 0.4, sumar: true, tintes: [0xffd43b, 0xffffff] });
        });
    };

    Tablero.prototype.tensarCorrea = function (id, ms) {
        var c = this.co[id];
        if (!c) return Promise.resolve();
        c.visible = true;
        c.tension = 0;
        this.recalcular();
        return this.anim.agregar(ms || 820, function (u) { c.tension = u; c.ultimo = null; });
    };

    /**
     * La pieza entra al eje: se centra, toma la fase de los dientes, hace un pequeño ajuste,
     * echa chispas en el punto de contacto y el tren conectado se mueve un poquito.
     */
    Tablero.prototype.encajar = function (pieza, id) {
        var o = this.dest[id];
        var self = this;
        if (!o || this.puestos[id]) return Promise.resolve();
        this.puestos[id] = true;
        var d = o.def;
        var cont = pieza.cont;
        var esc = this.escala();
        var x0 = cont.x, y0 = cont.y, e0 = cont.scaleX;
        if (d.tipo === "correa") return this.encajarCorrea(pieza, id, x0, y0, e0);
        var e = this.el[id];
        e.pieza = pieza;
        e.visible = true;
        var objetivo = this.faseObjetivo(id);
        var a0 = pieza.ang;
        var a1 = objetivo != null ? this.giroCercano(a0, objetivo, pieza.z) : a0;
        cont.setDepth(d.tipo === "polea" ? (d.sobre ? 132 : 125) : 110 + (d.z ? 20 - d.z : 0) * 0.01);
        this.actualizarDestinos(this.sel);
        return this.anim.agregar(240, function (u) {
            var s = M().saleSuave(u);
            cont.setPosition(M().lerp(x0, d.x, s), M().lerp(y0, d.y, s)).setScale(M().lerp(e0, esc * 1.07, s));
            pieza.girar(M().lerp(a0, a1, s));
        }).then(function () {
            // ajuste: la rueda baja al eje con un pequeño vaivén
            return self.anim.agregar(380, function (u) {
                cont.setScale(esc * (1.07 - 0.07 * M().rebote(u)));
                pieza.girar(a1 + Math.sin(u * Math.PI * 2) * (1 - u) * 0.035);
            });
        }).then(function () {
            pieza.girar(a1);
            e.ang = a1;
            pieza.brillo.setAlpha(0);
            self.recalcular();
            self.flash(id, 0xffffff, 450);
            var c = self.contacto(id);
            self.particulas.emitir(c.x, c.y, { n: 14, tipos: ["p-chispa", "p-estrella", "p-destello"], vel: 220, grav: 120, vida: 800, escala: 0.42, sumar: true, tintes: [0xffd43b, 0xfff3bf, 0x8ce99a, 0xffffff] });
            var con = d.padre || d.sobre || null;
            if (con) emitir("conexion_activada", { destino: id, con: con });
            // las poleas y correas fijas que dependen de este eje aparecen
            var aparecen = [];
            self.geo.fijos.poleas.forEach(function (f) { if (f.aparece === id) aparecen.push(self.mostrarFijo(f.id, true)); });
            self.geo.fijos.correas.forEach(function (f) { if (f.aparece === id) aparecen.push(self.tensarCorrea(f.id, 900)); });
            var jog = self.empujar(d.tipo === "engranaje" && d.padre ? 1.6 : 0.8);
            return Promise.all(aparecen.concat([jog]));
        });
    };

    Tablero.prototype.encajarCorrea = function (pieza, id, x0, y0, e0) {
        var self = this;
        var o = this.dest[id];
        var c = this.co[id];
        var cont = pieza.cont;
        this.actualizarDestinos(this.sel);
        return this.anim.agregar(300, function (u) {
            var s = M().saleSuave(u);
            cont.setPosition(M().lerp(x0, o.def.x, s), M().lerp(y0, o.def.y, s)).setScale(M().lerp(e0, e0 * 0.5, s)).setAlpha(1 - s);
        }).then(function () {
            cont.setVisible(false).setAlpha(1);
            self.el[c.p].sacude = 0.5;
            self.el[c.q].sacude = 0.5;
            return self.tensarCorrea(id, 900);
        }).then(function () {
            self.particulas.emitir(o.def.x, o.def.y, { n: 12, tipos: ["p-chispa", "p-estrella"], vel: 200, grav: 80, vida: 800, escala: 0.4, sumar: true, tintes: [0xffd43b, 0xffffff, 0x74c0fc] });
            emitir("conexion_activada", { destino: id, con: c.p });
            return self.empujar(1.4);
        });
    };

    /** Punto donde la rueda toca a su padre (o su centro). */
    Tablero.prototype.contacto = function (id) {
        var d = this.el[id].def;
        if (d.tipo === "engranaje" && d.padre) {
            var p = this.el[d.padre].def;
            var dx = d.x - p.x, dy = d.y - p.y, L = Math.sqrt(dx * dx + dy * dy);
            return { x: p.x + dx / L * p.r, y: p.y + dy / L * p.r };
        }
        return { x: d.x, y: d.y };
    };

    /** Las piezas conectadas avanzan un poco juntas (prueba de transmisión), sin poner la máquina en marcha. */
    Tablero.prototype.empujar = function (dientes) {
        var raiz = this.raiz();
        if (!raiz || !this.puestos[raiz.id]) return Promise.resolve();
        var paso = DOS_PI / raiz.def.z * (dientes || 1);
        var desde = this.phi0;
        var self = this;
        return this.anim.agregar(900, function (u) { self.phi0 = desde + paso * M().saleSuave(u); });
    };

    Tablero.prototype.raiz = function () {
        var r = this.geo ? this.geo.lista.filter(function (e) { return e.tipo === "engranaje" && !e.padre; })[0] : null;
        return r ? this.el[r.id] : null;
    };

    /** Quién recibe movimiento de la rueda principal; al conectarse, b mantiene el ángulo actual. */
    Tablero.prototype.recalcular = function () {
        var self = this;
        var con = {};
        var raiz = this.raiz();
        if (raiz && this.puestos[raiz.id]) con[raiz.id] = true;
        var vis = function (id) { var e = self.el[id]; return e && (e.fijo ? e.visible : !!self.puestos[id]); };
        for (var v = 0; v < 20; v++) {
            var cambio = false;
            Object.keys(this.el).forEach(function (k) {
                if (con[k] || !vis(k)) return;
                var d = self.el[k].def;
                if ((d.padre && con[d.padre]) || (d.sobre && con[d.sobre])) { con[k] = true; cambio = true; }
            });
            Object.keys(this.co).forEach(function (k) {
                var c = self.co[k];
                if (!c.visible) return;
                if (con[c.p] && !con[c.q] && vis(c.q)) { con[c.q] = true; cambio = true; }
                if (con[c.q] && !con[c.p] && vis(c.p)) { con[c.p] = true; cambio = true; }
            });
            if (!cambio) break;
        }
        Object.keys(this.el).forEach(function (k) {
            var e = self.el[k];
            var ahora = !!con[k];
            if (ahora && !e.conectado) e.b = e.ang - e.a * self.phi0;
            e.conectado = ahora;
        });
        var n = R().destinos(this.geo).length;
        var puestas = Object.keys(this.puestos).length;
        this.luces.forEach(function (l, i) { l.obj = i < puestas ? 1 : 0; });
        emitir("energia", { valor: n ? puestas / n : 0 });
    };

    /** Demo: quitar una pieza puesta (vuelve a quedar el eje libre). */
    Tablero.prototype.deshacer = function (id) {
        if (!this.puestos[id]) return null;
        delete this.puestos[id];
        var e = this.el[id];
        var pieza = null;
        if (e) {
            pieza = e.pieza;
            e.pieza = null;
            e.visible = false;
            e.conectado = false;
        }
        var self = this;
        this.geo.fijos.poleas.forEach(function (f) {
            if (f.aparece === id) { var fe = self.el[f.id]; fe.visible = false; fe.conectado = false; fe.pieza.cont.setScale(0); }
        });
        this.geo.fijos.correas.forEach(function (f) { if (f.aparece === id) { var c = self.co[f.id]; c.visible = false; c.g.clear(); } });
        this.phi0 = 0;
        this.recalcular();
        this.actualizarDestinos(null);
        return pieza;
    };

    // ------------------------------------------------------------------ marcha

    Tablero.prototype.arrancar = function (velocidad) {
        this.marcha = true;
        this.omegaObj = velocidad || 0.55;
    };

    Tablero.prototype.frenar = function () { this.omegaObj = 0; };

    /** Ángulo actual de un eje (para las máquinas secundarias). */
    Tablero.prototype.angulo = function (id) { var e = this.el[id]; return e ? e.ang : 0; };
    Tablero.prototype.visible = function (id) { var e = this.el[id]; return !!e && (e.fijo ? e.visible : !!this.puestos[id]); };
    Tablero.prototype.velocidad = function (id) { var e = this.el[id]; return e && e.conectado ? e.a * this.omega : 0; };

    Tablero.prototype.salida = function () {
        var self = this;
        var conts = [];
        Object.keys(this.el).forEach(function (k) { var e = self.el[k]; if (e.pieza && (e.visible || self.puestos[k])) conts.push(e.pieza.cont); });
        var objs = this.objetos.slice();
        var e0 = conts.map(function (c) { return c.scaleX; });
        var a0 = objs.map(function (o) { return o.alpha == null ? 1 : o.alpha; });
        var img = this.hPlaca ? this.hPlaca.img : null, ejes = this.hEjes ? this.hEjes.img : null;
        this.frenar();
        return this.anim.agregar(900, function (u) {
            var s = M().suave(u);
            self.alfa = 1 - s;
            conts.forEach(function (c, i) { c.setScale(e0[i] * (1 - s)).setAlpha(1 - s); });
            objs.forEach(function (o, i) { if (o.setAlpha) o.setAlpha(a0[i] * (1 - s)); });
            if (img) img.setAlpha(1 - s * 0.85);
            if (ejes) ejes.setAlpha(1 - s);
        }).then(function () {
            conts.forEach(function (c) { c.setVisible(false); });
        });
    };

    /** El tablero nuevo aparece: placa, ejes, sombras, aros y textos suben de 0 a su brillo. */
    Tablero.prototype.aparecer = function () {
        var self = this;
        var img = this.hPlaca ? this.hPlaca.img : null, ejes = this.hEjes ? this.hEjes.img : null;
        this.alfa = 0;
        if (img) img.setAlpha(0.15);
        if (ejes) ejes.setAlpha(0);
        return this.anim.agregar(700, function (u) {
            var s = M().suave(u);
            self.alfa = s;
            if (img) img.setAlpha(0.15 + 0.85 * s);
            if (ejes) ejes.setAlpha(s);
        });
    };

    // ------------------------------------------------------------------ cuadro a cuadro

    Tablero.prototype.update = function (dt, ts) {
        if (!this.geo) return;
        var self = this;
        this.t += dt;
        var s = dt / 1000;
        this.omega += (this.omegaObj - this.omega) * Math.min(1, dt / 700);
        if (Math.abs(this.omega) > 1e-4) this.phi0 += this.omega * s;
        var cur = this.cursor;
        // ángulos de todo lo conectado
        Object.keys(this.el).forEach(function (k) {
            var e = self.el[k];
            if (!e.pieza) return;
            if (e.conectado) e.ang = e.a * self.phi0 + e.b;
            var extra = 0;
            if (e.sacude > 0) { e.sacude = Math.max(0, e.sacude - dt / 500); extra += Math.sin(self.t * 0.06) * 0.05 * e.sacude; }
            if (cur && self.puestos[k] && e.def) {
                // las piezas cercanas a la que se arrastra se mueven un poquito
                var dx = cur.x - e.def.x, dy = cur.y - e.def.y;
                var lim = e.def.ra + cur.r + 40;
                var dd = Math.sqrt(dx * dx + dy * dy);
                if (dd < lim) extra += Math.sin(self.t * 0.018 + k.length) * 0.03 * (1 - dd / lim);
            }
            e.pieza.girar(e.ang + extra);
        });
        // correas
        Object.keys(this.co).forEach(function (k) {
            var c = self.co[k];
            if (!c.visible) return;
            var p = self.el[c.p];
            var sv = -p.ang * p.def.r;
            var firma = Math.round(sv * 2) + ":" + c.tension.toFixed(3);
            if (firma === c.ultimo) return;
            c.ultimo = firma;
            c.g.clear();
            D().dibujarCorrea(c.g, c.geo, sv, { grosor: Math.max(7, self.geo.modulo * 0.95), tension: c.tension, paso: 20 });
        });
        // aros, sombras y focos de los destinos
        var pulso = 0.5 + 0.5 * Math.sin(ts * 4.2);
        Object.keys(this.dest).forEach(function (k) {
            var o = self.dest[k];
            var color = COLOR[o.estado] || COLOR.libre;
            var alfa = 0.22;
            var escala = 1;
            if (o.estado === "apagado") alfa = 0.12;
            else if (o.estado === "libre") alfa = 0.3 + pulso * 0.08;
            else if (o.estado === "guia") { alfa = 0.55 + pulso * 0.35; escala = 1 + pulso * 0.03; }
            else if (o.estado === "puesto") alfa = 0.45 + self.encendido * 0.4;
            if (self.cercaId === k && o.estado !== "puesto") {
                color = COLOR.cerca;
                var parp = Math.sin(ts * 18) > 0 ? 1 : 0.55;
                alfa = (0.6 + self.cercaFuerza * 0.4) * parp;
                escala = 1 + 0.06 * self.cercaFuerza;
            }
            if (o.flash > 0) {
                o.flash -= dt;
                var f = Math.max(0, o.flash / (o.flashTotal || 700));
                color = o.flashColor;
                alfa = Math.max(alfa, 0.5 + 0.5 * Math.abs(Math.sin(ts * 9)) * f);
            }
            var dx = 0;
            if (o.sacude > 0) { o.sacude = Math.max(0, o.sacude - dt / 600); dx = Math.sin(self.t * 0.09) * 7 * o.sacude; }
            if (o.brillo > 0) o.brillo = Math.max(0, o.brillo - dt / 2600);
            var A = self.alfa;
            var esPolea = o.def.tipo === "polea";
            if (esPolea && !self.puestos[k] && o.flash <= 0 && self.cercaId !== k) {
                // las poleas se distinguen de las ruedas: aro naranja y bien visible
                if (o.estado === "libre") { color = 0xffa94d; alfa = 0.6 + pulso * 0.3; }
                else if (o.estado === "apagado") { color = 0xffc078; alfa = 0.35; }
            }
            if (o.punteado) {
                o.punteado.setRotation(ts * 0.6).setX(o.def.x + dx);
                o.punteado.setAlpha(A * (self.puestos[k] ? 0 : (o.estado === "apagado" ? 0.55 : (o.estado === "guia" || self.cercaId === k ? 1 : 0.6 + pulso * 0.4))));
                o.punteado.setScale(o.estado === "guia" || self.cercaId === k ? 1 + pulso * 0.06 : 1);
            }
            if (o.aro) {
                o.aro.setTint(color).setAlpha(alfa * A).setScale((o.def.ra + 9) / 100 * escala).setX(o.def.x + dx);
                o.sil.setX(o.def.x + dx);
                if (esPolea) {
                    var pAlfa = self.puestos[k] ? 0 : (o.estado === "guia" || o.brillo > 0 || self.cercaId === k ? 0.8 : (o.estado === "apagado" ? 0.4 : 0.55 + pulso * 0.15));
                    o.sil.setAlpha(pAlfa * A).setTint(o.brillo > 0 || o.estado === "guia" || self.cercaId === k ? 0xffd43b : 0xf76707);
                } else {
                    var sAlfa = self.puestos[k] ? 0 : (o.estado === "guia" || o.brillo > 0 || self.cercaId === k ? 0.5 : 0.34);
                    o.sil.setAlpha(sAlfa * A).setTint(o.brillo > 0 || o.estado === "guia" || self.cercaId === k ? 0x2f6fb0 : 0x0b1d3a);
                }
                var fc = self.puestos[k] ? 0x69db7c : (self.cercaId === k ? 0x51cf66 : (o.estado === "guia" ? 0x4dd4f0 : (o.estado === "libre" ? 0xffd43b : 0x5c6677)));
                o.foco.setTint(fc).setAlpha(A * (self.puestos[k] ? 0.9 : (o.estado === "apagado" ? 0.3 : 0.55 + pulso * 0.4)));
                o.etiqueta.setAlpha(A * (self.puestos[k] ? 0 : (o.estado === "apagado" ? (esPolea ? 0.75 : 0.45) : (esPolea ? 1 : 0.9))));
            } else if (o.guia) {
                if (self.puestos[k]) {
                    if (o.guia.visible) { o.guia.clear(); o.guia.setVisible(false); o.etiqueta.setVisible(false); }
                } else {
                    var est = self.cercaId === k ? "cerca" : (o.flash > 0 ? "pista" : o.estado);
                    var corre = est === "apagado" ? 0 : ts * (est === "guia" || est === "cerca" ? 60 : 30);
                    var grueso = est === "guia" || est === "cerca" ? pulso * 3 : 0;
                    self.pintarGuiaCorrea(o, corre, est, grueso);
                    o.guia.setAlpha(A * (est === "apagado" ? 0.85 : 1));
                    o.etiqueta.setAlpha(A * (est === "apagado" ? 0.7 : 1)).setScale(est === "guia" || est === "cerca" ? 1 + pulso * 0.08 : 1);
                }
            }
        });
        this.luces.forEach(function (l) {
            l.on += (l.obj - l.on) * Math.min(1, dt / 250);
            var chispa = self.marcha ? 0.5 + 0.5 * Math.sin(ts * 8 - l.fase * 2) : 1;
            l.luz.setAlpha(self.alfa * l.on * (0.55 + 0.45 * chispa));
        });
        this.particulas.update(dt);
    };

    Tablero.COLOR = COLOR;
    global.TableroMaquina = Tablero;
})(typeof window !== "undefined" ? window : global);
