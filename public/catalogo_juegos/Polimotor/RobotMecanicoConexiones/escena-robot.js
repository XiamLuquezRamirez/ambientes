/**
 * EscenarioRobot — escena Phaser 4 de "El Robot Mecánico y sus Conexiones" (window.EscenarioRobot).
 *
 * Arma el laboratorio (LaboratorioRobot), el robot (RobotMecanico), la consola de herramientas
 * (ConsolaRobot) y la bandeja de componentes con sus piezas. Maneja la entrada real con mouse y
 * touch: tocar selecciona, arrastrar lleva la pieza, los botones de la consola la giran de 90 en 90.
 * Cuenta cada acción en EventosRobot. No decide aciertos: al soltar avisa con distancias, giro y
 * disponibilidad de cada ranura (callback "soltar") y script.js le pregunta a ReglasRobot.
 *
 * Mundo de diseño 1600 × 900 con Scale.ENVELOP: lo jugable va entre x 210 y 1390, que cabe en 4:3
 * (1024 × 768) sin tocar los botones de las esquinas.
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser;
    var W = 1600, H = 900;
    var BANDEJA = { x: 1220, y: 450, x0: 1066, x1: 1374, y0: 136, y1: 796, cols: [1143, 1297] };
    var UMBRAL_ARRASTRE = 12;

    var M = function () { return global.MotorRobot; };
    var D = function () { return global.DibujosRobot; };
    var R = function () { return global.ReglasRobot; };
    var EV = function () { return global.EventosRobot; };

    var juego = null, escena = null, el = null, cfg = null, espera = null;
    var cb = {};

    function avisar(nombre, a) {
        var f = cb[nombre];
        if (typeof f === "function") {
            try { return f(a); } catch (e) { console.warn("[EscenarioRobot]", nombre, e); }
        }
        return undefined;
    }

    function emitir(nombre, datos) { if (EV()) EV().emitir(nombre, datos); }
    function jcfg() { return (cfg && cfg.juego) || {}; }
    function num(v, d) { var n = Number(v); return isFinite(n) && n > 0 ? n : d; }

    var EscenaRobot = Phaser ? class extends Phaser.Scene {
        constructor() { super({ key: "Robot" }); }

        create() {
            var self = this;
            D().claves().forEach(function (k) { M().tex(self, k); });
            this.anim = new (M().Animador)();
            this.t = 0;
            this.arrastreOn = false;
            this.sel = null;
            this.tomada = null;
            this.puntero = null;
            this.ids = [];
            this.colocadas = {};
            this.bloq = {};
            this.giroOn = false;
            this.cercaDe = null;
            this.demo = false;
            this.huecos = [];
            this.celda = { w: 150, h: 160 };

            this.robot = new global.RobotMecanico(this, M().ROBOT.x, M().ROBOT.y);
            this.lab = new global.LaboratorioRobot(this, { robot: this.robot });
            this.consola = new global.ConsolaRobot(this, {
                girar: function (dir) { self.girarSeleccion(dir); },
                escaner: function () { avisar("escaner", self.sel ? self.sel.id : null); },
                nombre: function (id) { var p = R().pieza(cfg, id); return p ? p.nombre : id; }
            });
            this.crearBandeja();
            this.crearPiezas();
            this.haz = M().img(this, M().ROBOT.x, 0, "haz", 1).setDepth(45).setBlendMode(Phaser.BlendModes.ADD).setTint(0x69db7c).setAlpha(0);
            this.haz.setScale(4.2 / D().res("haz"), 1 / D().res("haz"));
            this.particulas = new (M().Particulas)(this, 70, 60);

            this.input.on("dragstart", this.alEmpezar, this);
            this.input.on("drag", this.alMover, this);
            this.input.on("dragend", this.alSoltar, this);
            this.events.once("shutdown", function () {
                self.input.off("dragstart", self.alEmpezar, self);
                self.input.off("drag", self.alMover, self);
                self.input.off("dragend", self.alSoltar, self);
                self.anim.limpiar();
                self.lab.destruir();
                escena = null;
            });
            escena = this;
            if (espera) { var r = espera; espera = null; r(true); }
        }

        // ---------------------------------------------------------------- bandeja de componentes

        crearBandeja() {
            M().img(this, BANDEJA.x, BANDEJA.y, "bandeja", 1).setDepth(8);
            this.add.text(BANDEJA.x, 112, "COMPONENTES", { fontFamily: M().FUENTE, fontSize: "22px", fontStyle: "700", color: "#ffe8cc" }).setOrigin(0.5).setDepth(8.2);
            this.gBandeja = this.add.graphics().setDepth(8.5);
        }

        /** Compartimentos según cuántas piezas trae el nivel (dos columnas). */
        armarHuecos(n) {
            var filas = Math.ceil(n / 2);
            var alto = Math.min(230, (BANDEJA.y1 - BANDEJA.y0) / filas);
            this.celda = { w: 148, h: alto - 10 };
            var top = BANDEJA.y0 + ((BANDEJA.y1 - BANDEJA.y0) - alto * filas) / 2;
            this.huecos = [];
            for (var f = 0; f < filas; f++) {
                for (var c = 0; c < 2; c++) this.huecos.push({ x: BANDEJA.cols[c], y: top + alto * (f + 0.5) });
            }
        }

        crearPiezas() {
            var self = this;
            this.piezas = R().TIPOS.map(function (id, i) {
                var g = D().GEOM[id];
                var marca = M().img(self, 0, 0, "silueta-" + id, 1).setDepth(8.7).setTint(0xffe8cc).setAlpha(0);
                var sombra = M().img(self, 0, 0, "sombra", 1).setDepth(48).setAlpha(0);
                var aura = M().img(self, 0, 0, "luz", 1).setDepth(49).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd43b).setAlpha(0);
                var im = M().img(self, 0, 0, "pieza-" + id, 1).setDepth(12).setVisible(false);
                var candado = M().img(self, 0, 0, "candado", 0.7).setDepth(13).setVisible(false);
                var res = D().res("pieza-" + id);
                im.setInteractive({
                    hitArea: new Phaser.Geom.Circle(g.w * res / 2, g.h * res / 2, Math.max(g.w, g.h) * res * 0.6),
                    hitAreaCallback: Phaser.Geom.Circle.Contains,
                    draggable: true,
                    useHandCursor: true
                });
                var f = { id: id, g: g, img: im, aura: aura, sombra: sombra, candado: candado, marca: marca, estado: "fuera", activo: false, rot: 0, rotVis: 0, esc: 0.6, escObj: 0.6, fit: 0.6, k: 1, hueco: 0, fase: i * 0.7, temblor: 0, sacudir: 0, giro: 0 };
                im.setData("pieza", f);
                return f;
            });
        }

        pieza(id) { return this.piezas.filter(function (f) { return f.id === id; })[0] || null; }

        /**
         * Nivel nuevo. info: { nivel, ids, rot: {id: grados}, reparto: {id: hueco}, giro, bloqueadas: [] }.
         * La bandeja se reacomoda, el robot queda desarmado y el laboratorio vuelve a su estado base.
         */
        cargar(info) {
            var self = this;
            this.anim.limpiar();
            this.ids = info.ids.slice();
            this.colocadas = {};
            this.giroOn = !!info.giro;
            this.sel = null;
            this.tomada = null;
            this.cercaDe = null;
            this.armarHuecos(this.ids.length);
            this.robot.configurar(this.ids);
            this.consola.configurar({ ids: this.ids, giro: this.giroOn, plano: info.plano });
            this.consola.deseleccionar();
            var lado = Math.min(this.celda.w, this.celda.h);
            this.piezas.forEach(function (f) {
                f.activo = self.ids.indexOf(f.id) >= 0;
                f.img.setVisible(f.activo);
                f.candado.setVisible(false);
                f.marca.setAlpha(0);
                f.aura.setAlpha(0);
                f.sombra.setAlpha(0);
                if (!f.activo) { f.estado = "fuera"; if (f.img.input) f.img.input.enabled = false; return; }
                f.hueco = info.reparto && info.reparto[f.id] != null ? info.reparto[f.id] : self.ids.indexOf(f.id);
                f.rot = R().normalizar(info.rot ? info.rot[f.id] : 0);
                f.rotVis = f.rot;
                // tamaño en la bandeja: si el nivel no gira piezas se aprovecha todo el compartimento;
                // si gira, se mide por el lado mayor para que la pieza quepa en cualquier orientación
                var mayor = Math.max(f.g.w, f.g.h);
                f.fit = self.giroOn ? Math.min(0.95, (lado - 14) / mayor) :
                    Math.min(0.95, (self.celda.w - 16) / f.g.w, (self.celda.h - 16) / f.g.h);
                f.esc = f.escObj = f.fit;
                f.k = 0; // aparece creciendo en su compartimento
                f.estado = "disponible";
                if (f.img.input) {
                    f.img.input.enabled = true;
                    // zona de toque: casi todo el compartimento
                    var res = D().res("pieza-" + f.id);
                    f.img.input.hitArea.radius = ((lado / 2) - 4) / f.fit * res;
                }
                var h = self.puntoHueco(f);
                f.img.setPosition(h.x, h.y).setRotation(M().rad(f.rot)).setDepth(12);
                f.marca.setPosition(h.x, h.y);
                f.marca.setScale(f.marca.base * f.fit);
            });
            this.actualizarBloqueos(info.bloqueadas || []);
            emitir("nivel_iniciado", { nivel: info.nivel, total: this.ids.length, ids: this.ids.slice() });
        }

        /** Piezas que esperan a su pieza madre: candado y sin poder tomarse. */
        actualizarBloqueos(lista) {
            var self = this;
            this.bloq = {};
            (lista || []).forEach(function (id) { self.bloq[id] = true; });
            this.piezas.forEach(function (f) {
                if (!f.activo || f.estado === "ensamblada") return;
                var b = !!self.bloq[f.id];
                if (b && f.estado === "disponible") f.estado = "bloqueada";
                if (!b && f.estado === "bloqueada") { f.estado = "disponible"; f.k = 1.25; }
                f.candado.setVisible(b);
            });
        }

        puntoHueco(f) {
            return this.huecos[f.hueco % Math.max(1, this.huecos.length)] || { x: BANDEJA.x, y: BANDEJA.y };
        }

        /** Radios a partir de la separación real entre ranuras del nivel. */
        radios() {
            var self = this;
            var pos = this.ids.map(function (id) { return self.robot.puntoRanura(id); });
            var minD = Infinity;
            for (var i = 0; i < pos.length; i++) {
                for (var k = i + 1; k < pos.length; k++) {
                    var dx = pos[i].x - pos[k].x, dy = pos[i].y - pos[k].y;
                    var d = Math.sqrt(dx * dx + dy * dy);
                    if (d > 1 && d < minD) minD = d;
                }
            }
            if (!isFinite(minD)) minD = 200;
            var acierto = Math.min(num(jcfg().radioAcierto, 64), minD * 0.6);
            var casi = Math.max(acierto + 30, num(jcfg().radioCasi, 150));
            return { acierto: acierto, casi: casi, cerca: Math.max(casi, num(jcfg().radioCerca, 215)), iman: Math.max(acierto, Math.min(num(jcfg().radioIman, 105), casi)) };
        }

        // ---------------------------------------------------------------- entrada

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
            if (!f || !f.activo || !this.arrastreOn || this.tomada) return;
            if (f.estado === "bloqueada") {
                f.sacudir = 1;
                emitir("conexion_incorrecta", { id: f.id, motivo: "bloqueada" });
                avisar("bloqueada", f.id);
                return;
            }
            if (f.estado !== "disponible" && f.estado !== "seleccionada") return;
            this.seleccionar(f);
            this.tomada = f;
            this.puntero = p;
            f.estado = "seleccionada";
            f.inicio = { x: p.worldX, y: p.worldY, t: Date.now() };
            f.offset = { x: f.img.x - p.worldX, y: f.img.y - p.worldY };
            f.objetivo = { x: f.img.x, y: f.img.y };
            f.sigue = { x: f.img.x, y: f.img.y };
            this.limites = this.limitesVisibles();
        }

        /** Selección: la pieza se levanta en su compartimento y la consola la muestra. */
        seleccionar(f) {
            if (this.sel && this.sel !== f && this.sel.estado === "seleccionada") this.sel.estado = "disponible";
            var nueva = this.sel !== f;
            this.sel = f;
            f.estado = "seleccionada";
            f.escObj = f.fit * 1.06;
            f.k = 1.08;
            this.consola.seleccionar(f.id, f.rot);
            if (nueva) {
                this.particulas.emitir(f.img.x, f.img.y, { n: 6, tipos: ["destello", "chispa"], vel: 140, grav: 0, vida: 480, escala: 0.4, dispersion: 40, sumar: true, tintes: [0xffd43b, 0xffffff] });
                emitir("pieza_seleccionada", { id: f.id, x: f.img.x, y: f.img.y, rot: f.rot });
                avisar("seleccion", f.id);
            }
        }

        deseleccionar() {
            if (this.sel && this.sel.estado === "seleccionada") this.sel.estado = "disponible";
            this.sel = null;
            this.consola.deseleccionar();
        }

        alMover(p, obj) {
            var f = obj.getData("pieza");
            if (!f || f !== this.tomada) return;
            if (f.estado === "seleccionada") {
                var dx = p.worldX - f.inicio.x, dy = p.worldY - f.inicio.y;
                if (dx * dx + dy * dy < UMBRAL_ARRASTRE * UMBRAL_ARRASTRE) return;
                this.empezarArrastre(f);
            }
            this.apuntar(f, p.worldX, p.worldY);
        }

        empezarArrastre(f) {
            f.estado = "arrastrando";
            f.escObj = 1;
            f.img.setDepth(50);
            f.marca.setAlpha(0.35);
            avisar("arrastrar", f.id);
        }

        apuntar(f, px, py) {
            var L = this.limites || { x0: 0, y0: 0, x1: W, y1: H };
            f.objetivo = {
                x: Math.max(L.x0 + 40, Math.min(L.x1 - 40, px + f.offset.x)),
                y: Math.max(L.y0 + 40, Math.min(L.y1 - 30, py + f.offset.y))
            };
        }

        alSoltar(p, obj) {
            var f = obj.getData("pieza");
            if (!f || f !== this.tomada) return;
            this.soltar(f);
        }

        soltar(f) {
            this.tomada = null;
            this.puntero = null;
            if (f.estado === "seleccionada") {
                // fue un toque: la pieza queda seleccionada en su compartimento
                return;
            }
            // se evalúa donde el dedo dejó la pieza (el suavizado del seguimiento no debe quitarle el acierto)
            if (f.objetivo) {
                f.sigue = { x: f.objetivo.x, y: f.objetivo.y };
                var c0 = this.robot.puntoRanura(f.id);
                var dx0 = c0.x - f.objetivo.x, dy0 = c0.y - f.objetivo.y;
                var req0 = this.requiere(f.id);
                var tira0 = R().iman(Math.sqrt(dx0 * dx0 + dy0 * dy0), this.radios().iman, jcfg().iman, R().orientacionValida(f.rot), (!req0 || !!this.colocadas[req0]) && !this.colocadas[f.id]);
                f.img.setPosition(f.objetivo.x + dx0 * tira0, f.objetivo.y + dy0 * tira0);
            }
            f.estado = "soltada";
            this.apagarCercania(f);
            emitir("pieza_soltada", { id: f.id });
            var r = this.radios();
            var datos = { id: f.id, rot: f.rot, destinos: this.distancias(f), radio: r.acierto, radioCasi: r.casi, requiere: this.requiere(f.id) };
            if (cb.soltar) avisar("soltar", datos);
            else this.devolver(f.id);
        }

        requiere(id) {
            var p = R().pieza(cfg, id);
            return p && p.depende && this.ids.indexOf(p.depende) >= 0 ? p.depende : null;
        }

        distancias(f) {
            var self = this;
            return this.ids.map(function (id) {
                var c = self.robot.puntoRanura(id);
                var dx = f.img.x - c.x, dy = f.img.y - c.y;
                var req = self.requiere(id);
                return { id: id, distancia: Math.sqrt(dx * dx + dy * dy), ocupado: !!self.colocadas[id], disponible: !req || !!self.colocadas[req] };
            });
        }

        apagarCercania(f) {
            this.robot.apagarResaltes();
            if (this.cercaDe) emitir("pieza_lejos", { id: f ? f.id : null });
            this.cercaDe = null;
        }

        /** Botones de la consola: giro de 90° de la pieza seleccionada (en la bandeja o arrastrándose). */
        girarSeleccion(dir) {
            var f = this.sel;
            if (!this.arrastreOn && !this.demo) return;
            if (!f || !this.giroOn || f.estado === "ensamblada") {
                avisar("giroSinPieza", null);
                return;
            }
            var paso = num(jcfg().pasoGiro, 90);
            f.rot = R().girar(f.rot, dir, paso);
            f.giro = 1;
            this.consola.girar(f.rot, dir);
            emitir("pieza_rotada", { id: f.id, rot: f.rot, dir: dir, derecha: R().orientacionValida(f.rot) });
            avisar("girar", { id: f.id, rot: f.rot, derecha: R().orientacionValida(f.rot) });
        }

        seguirArrastre(dt) {
            var f = this.tomada;
            if (!f) return;
            if (this.puntero && !this.puntero.isDown && !this.demo) { this.soltar(f); return; }
            if (f.estado !== "arrastrando") return;
            if (f.offset.x || f.offset.y) {
                var decae = Math.min(1, dt / 180);
                f.offset.x += (0 - f.offset.x) * decae;
                f.offset.y += (-30 - f.offset.y) * decae;
            }
            var k = 1 - Math.exp(-dt / 34);
            f.sigue.x += (f.objetivo.x - f.sigue.x) * k;
            f.sigue.y += (f.objetivo.y - f.sigue.y) * k;
            var x = f.sigue.x, y = f.sigue.y;
            var r = this.radios();
            var c = this.robot.puntoRanura(f.id);
            var dx = c.x - x, dy = c.y - y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var req = this.requiere(f.id);
            var disp = !req || !!this.colocadas[req];
            var tira = R().iman(dist, r.iman, jcfg().iman, R().orientacionValida(f.rot), disp && !this.colocadas[f.id]);
            x += dx * tira;
            y += dy * tira;
            f.img.setPosition(x, y);
            this.robot.mirar(x);
            emitir("pieza_arrastrada", { id: f.id, x: x, y: y });
            var cer = R().cercano(f.id, f.rot, this.distancias(f), r.cerca);
            if (cer && cer.disponible) {
                this.robot.resaltar(f.id, 0.2 + 0.8 * cer.fuerza, cer.orientacionOk);
                var clave = f.id + (cer.orientacionOk ? ":ok" : ":giro");
                if (this.cercaDe !== clave) {
                    this.cercaDe = clave;
                    emitir("pieza_cerca_de_ranura", { id: f.id, fuerza: cer.fuerza, orientacionOk: cer.orientacionOk, disponible: true, x: c.x, y: c.y });
                    avisar("cerca", { id: f.id, orientacionOk: cer.orientacionOk });
                }
            } else if (this.cercaDe) {
                this.apagarCercania(f);
            }
        }

        // ---------------------------------------------------------------- resultados (los llama script.js)

        /** La pieza entra en su ranura: viaja, se endereza, clic, y el robot la muestra conectada. */
        encajar(id) {
            var f = this.pieza(id);
            if (!f) return Promise.resolve();
            var self = this;
            if (this.tomada === f) { this.tomada = null; this.puntero = null; }
            f.estado = "ensamblando";
            this.colocadas[id] = true;
            if (f.img.input) f.img.input.enabled = false;
            this.apagarCercania(f);
            var c = this.robot.puntoRanura(id);
            var x0 = f.img.x, y0 = f.img.y, e0 = f.esc;
            var r0 = f.img.rotation;
            return this.anim.agregar(200, function (u) {
                var s = M().saleSuave(u);
                f.img.setPosition(M().lerp(x0, c.x, s), M().lerp(y0, c.y, s));
                f.img.setRotation(M().lerp(r0, 0, s));
                f.esc = M().lerp(e0, 1, s);
            }).then(function () {
                f.estado = "ensamblada";
                f.img.setVisible(false);
                f.aura.setAlpha(0);
                f.sombra.setAlpha(0);
                f.marca.setAlpha(0);
                if (self.sel === f) self.deseleccionar();
                self.consola.marcar(id);
                self.chispazo(c.x, c.y);
                var n = Object.keys(self.colocadas).length;
                emitir("pieza_ensamblada", { id: id, colocadas: n, total: self.ids.length, x: c.x, y: c.y });
                return self.robot.encajar(id);
            });
        }

        /** Efecto de conexión luminosa: chispa azul, anillo y destello. */
        chispazo(x, y) {
            var self = this;
            var anillo = M().img(this, x, y, "anillo", 0.5).setDepth(58).setBlendMode(Phaser.BlendModes.ADD).setTint(0x74c0fc);
            var destello = M().img(this, x, y, "destello", 1.4).setDepth(59).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffffff);
            this.anim.agregar(620, function (u) {
                anillo.setScale(anillo.base * (1 + u * 2.2)).setAlpha(1 - u);
                destello.setScale(destello.base * (0.4 + Math.sin(u * Math.PI) * 1.1)).setAlpha(1 - u * u).setRotation(u * 1.5);
            }).then(function () { anillo.destroy(); destello.destroy(); });
            this.particulas.emitir(x, y, { n: 14, tipos: ["chispa", "destello", "estrella"], vel: 300, grav: 160, vida: 800, escala: 0.45, sumar: true, tintes: [0x74c0fc, 0x7ff3ff, 0xffffff] });
            if (self.robot) self.robot.expresion("contento");
            setTimeout(function () { if (self.robot) self.robot.expresion("feliz"); }, 1400);
        }

        /**
         * La pieza vuelve suave a su compartimento y sigue seleccionada. motivo: casi, orientacion,
         * otraPieza, ocupado, dependencia, fuera (para la señal del laboratorio).
         */
        devolver(id, motivo, destino) {
            var f = this.pieza(id);
            if (!f) return Promise.resolve();
            var self = this;
            if (this.tomada === f) { this.tomada = null; this.puntero = null; }
            this.apagarCercania(f);
            f.estado = "volviendo";
            if (motivo) emitir("conexion_incorrecta", { id: id, motivo: motivo, destino: destino || null });
            if (motivo === "orientacion" && destino) {
                this.robot.resaltar(destino, 0.6, false);
                this.consola.llamarAtencion();
                setTimeout(function () { if (self.robot) self.robot.apagarResaltes(); }, 1600);
            } else if (destino && motivo === "dependencia") {
                var req = this.requiere(id);
                if (req) this.robot.pulso(req);
            }
            var h = this.puntoHueco(f);
            var x0 = f.img.x, y0 = f.img.y;
            var dist = Math.sqrt((h.x - x0) * (h.x - x0) + (h.y - y0) * (h.y - y0));
            var dur = Math.min(650, 300 + dist * 0.4);
            var e0 = f.esc;
            f.sacudir = motivo && motivo !== "fuera" ? 1 : 0;
            return this.anim.agregar(dur, function (u) {
                var s = M().suave(u);
                f.img.setPosition(M().lerp(x0, h.x, s), M().lerp(y0, h.y, s) - Math.sin(u * Math.PI) * Math.min(80, dist * 0.18));
                f.esc = M().lerp(e0, f.fit * 1.06, s);
            }).then(function () {
                f.img.setDepth(12);
                f.marca.setAlpha(0);
                if (f.estado === "volviendo") {
                    f.estado = self.sel === f ? "seleccionada" : "disponible";
                    if (self.sel !== f) f.escObj = f.fit;
                }
            });
        }

        /** Herramienta de diagnóstico: un haz recorre el robot y la ranura buscada parpadea. */
        escanear(id) {
            var self = this;
            var c = this.robot.puntoRanura(id);
            var y0 = 90, y1 = 780;
            this.robot.pulso(id);
            emitir("escaner", { id: id, x: c.x, y: c.y });
            return this.anim.agregar(900, function (u) {
                self.haz.setPosition(M().ROBOT.x, M().lerp(y0, y1, u)).setAlpha(Math.sin(u * Math.PI) * 0.85);
            }).then(function () {
                self.haz.setAlpha(0);
                self.robot.pulso(id);
            });
        }

        // ---------------------------------------------------------------- momentos del nivel

        /** Nivel completo: el laboratorio celebra y el robot hace su movimiento. */
        celebrar(final) {
            var self = this;
            this.consola.modo("fiesta");
            this.robot.expresion("corazon");
            var mov = final === "cabeza" ? this.robot.moverCabeza() : final === "manos-pies" ? this.robot.manosYPasos() : this.robot.moverExtremidades();
            return Promise.all([this.lab.celebrar(2800), mov]).then(function () {
                self.robot.expresion("feliz");
            });
        }

        /** Fin de nivel sin fundido: las piezas del robot se apagan y se desarman con suavidad. */
        salida() {
            this.consola.modo("normal");
            return this.robot.desarmar();
        }

        terminarFiesta() {
            this.consola.modo("normal");
            this.lab.fiestaFinal(false);
        }

        // ---------------------------------------------------------------- cuadro a cuadro

        update(time, delta) {
            var dt = Math.min(50, delta || 16);
            this.t += dt;
            var ts = this.t / 1000;
            this.anim.update(dt);
            this.seguirArrastre(dt);
            this.lab.update(dt, ts);
            this.robot.update(dt, ts);
            this.consola.update(dt, ts);
            this.animarPiezas(dt, ts);
            this.dibujarBandeja(ts);
            this.particulas.update(dt);
        }

        animarPiezas(dt, ts) {
            var self = this;
            var k = Math.min(1, dt / 110);
            this.piezas.forEach(function (f) {
                if (!f.activo || f.estado === "ensamblada" || f.estado === "fuera") return;
                f.esc += (f.escObj - f.esc) * k;
                f.k += (1 - f.k) * Math.min(1, dt / 200);
                f.giro = Math.max(0, f.giro - dt / 220);
                f.sacudir = Math.max(0, f.sacudir - dt / 500);
                // rotación visual hacia la orientación lógica (por el camino más corto)
                var dif = ((f.rot - f.rotVis + 540) % 360) - 180;
                f.rotVis += dif * Math.min(1, dt / 90);
                var h = self.puntoHueco(f);
                var mueve = f.estado === "arrastrando" || f.estado === "volviendo" || f.estado === "ensamblando";
                if (!mueve) {
                    var flota = f.estado === "seleccionada" ? -8 + Math.sin(ts * 4) * 3 : Math.sin(ts * 1.6 + f.fase) * 2.5;
                    var tiembla = f.sacudir > 0 ? Math.sin(ts * 50) * 7 * f.sacudir : 0;
                    f.img.setPosition(h.x + tiembla, h.y + flota);
                }
                if (f.estado !== "ensamblando") f.img.setRotation(M().rad(f.rotVis) + (f.estado === "disponible" ? Math.sin(ts * 1.1 + f.fase) * 0.03 : 0));
                var bloqueada = f.estado === "bloqueada";
                f.img.setScale(f.img.base * f.esc * f.k).setAlpha(bloqueada ? 0.55 : 1);
                f.candado.setPosition(h.x + self.celda.w * 0.32, h.y - self.celda.h * 0.28).setVisible(bloqueada);
                var lev = f.estado === "arrastrando";
                var sA = lev ? 0.45 : 0;
                f.sombra.setAlpha(f.sombra.alpha + (sA - f.sombra.alpha) * k);
                if (lev) f.sombra.setPosition(f.img.x + 16, f.img.y + f.g.h * 0.5 + 16).setScale(f.sombra.base * Math.max(0.5, f.g.w / 140));
                var aA = f.estado === "seleccionada" || lev ? 0.35 + 0.15 * Math.sin(ts * 6) + f.giro * 0.4 : 0;
                f.aura.setAlpha(f.aura.alpha + (aA - f.aura.alpha) * k);
                f.aura.setPosition(f.img.x, f.img.y).setScale(f.aura.base * Math.max(f.g.w, f.g.h) / 200 * f.esc * 1.5);
            });
        }

        /** Compartimentos: se iluminan al seleccionar, muestran la silueta al vaciarse y un visto al ensamblar. */
        dibujarBandeja(ts) {
            var g = this.gBandeja, self = this;
            g.clear();
            var w = this.celda.w, h = this.celda.h;
            var porHueco = {};
            this.piezas.forEach(function (f) { if (f.activo) porHueco[f.hueco] = f; });
            this.huecos.forEach(function (c, i) {
                var f = porHueco[i];
                var x = c.x - w / 2, y = c.y - h / 2;
                g.fillStyle(0x2a2017, 1);
                g.fillRoundedRect(x, y, w, h, 16);
                g.lineStyle(4, 0x14213d, 1);
                g.strokeRoundedRect(x, y, w, h, 16);
                if (!f) return;
                if (f.estado === "ensamblada") {
                    g.fillStyle(0x2f9e44, 0.45);
                    g.fillRoundedRect(x + 4, y + 4, w - 8, h - 8, 13);
                    g.lineStyle(8, 0x8ce99a, 1);
                    g.beginPath();
                    g.moveTo(c.x - 22, c.y);
                    g.lineTo(c.x - 6, c.y + 16);
                    g.lineTo(c.x + 24, c.y - 18);
                    g.strokePath();
                } else if (f === self.sel) {
                    g.fillStyle(0xffd43b, 0.12 + 0.08 * Math.sin(ts * 6));
                    g.fillRoundedRect(x + 4, y + 4, w - 8, h - 8, 13);
                    g.lineStyle(5, 0xffd43b, 0.8 + 0.2 * Math.sin(ts * 6));
                    g.strokeRoundedRect(x + 2, y + 2, w - 4, h - 4, 15);
                } else if (f.estado === "bloqueada") {
                    g.fillStyle(0x000000, 0.25);
                    g.fillRoundedRect(x + 4, y + 4, w - 8, h - 8, 13);
                } else {
                    // disponibilidad: borde que respira
                    g.lineStyle(3, 0xffc078, 0.25 + 0.2 * Math.sin(ts * 2 + i));
                    g.strokeRoundedRect(x + 4, y + 4, w - 8, h - 8, 13);
                }
            });
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
            Promise.all([document.fonts.load("700 40px Fredoka"), document.fonts.load("600 20px Fredoka")]),
            M().sleep(1500)
        ]).catch(function () { /* sin la fuente queda Arial */ });
    }

    function crearJuego() {
        juego = new Phaser.Game({
            type: Phaser.AUTO,
            parent: el,
            transparent: false,
            backgroundColor: "#1a2858",
            banner: false,
            scale: { mode: Phaser.Scale.ENVELOP, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
            input: { activePointers: 3 },
            render: { antialias: true },
            scene: [EscenaRobot]
        });
        global.__escenarioRobot = juego;
        global.__pedniaPhaserGame = juego;
    }

    // ------------------------------------------------------------------ API pública

    global.EscenarioRobot = {
        BANDEJA: BANDEJA,
        montar: function (contenedor, config, variante) {
            el = contenedor;
            cfg = config;
            if (!Phaser || !el) return Promise.resolve(false);
            return Promise.all([D().preparar(variante), fuentesListas()]).then(function () {
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
        reacomodar: function () {
            if (juego) {
                juego.scale.refresh();
                if (escena) escena.limites = escena.limitesVisibles();
            }
        },
        cargar: function (info) { if (escena) escena.cargar(info); },
        arrastre: function (on) {
            if (!escena) return;
            escena.arrastreOn = !!on;
            escena.consola.habilitar(!!on);
            if (!on && escena.tomada) {
                var f = escena.tomada;
                if (f.estado === "arrastrando") escena.devolver(f.id);
                escena.tomada = null;
            }
        },
        encajar: function (id) { return escena ? escena.encajar(id) : Promise.resolve(); },
        devolver: function (id, motivo, destino) { return escena ? escena.devolver(id, motivo, destino) : Promise.resolve(); },
        bloqueos: function (lista) { if (escena) escena.actualizarBloqueos(lista); },
        escanear: function (id) { return escena ? escena.escanear(id) : Promise.resolve(); },
        seleccionada: function () { return escena && escena.sel ? escena.sel.id : null; },
        celebrar: function (final) { return escena ? escena.celebrar(final) : Promise.resolve(); },
        terminarFiesta: function () { if (escena) escena.terminarFiesta(); },
        salida: function () { return escena ? escena.salida() : Promise.resolve(); },
        llamarAtencionGiro: function () { if (escena) escena.consola.llamarAtencion(); },
        mostrarProgreso: function (on) { if (escena) escena.consola.mostrarProgreso(on); },
        cinematica: function (avisos) {
            if (!escena || !global.CinematicaRobot) return Promise.resolve();
            return global.CinematicaRobot.correr(escena, avisos || {});
        },
        // demo y pruebas: coordenadas de pantalla
        puntoCliente: function (id) {
            var f = escena && escena.pieza(id);
            return f ? aPantalla(f.img.x, f.img.y) : null;
        },
        puntoRanuraCliente: function (id) {
            if (!escena) return null;
            var c = escena.robot.puntoRanura(id);
            return aPantalla(c.x, c.y);
        },
        puntoBotonCliente: function (nombre) {
            var p = escena && escena.consola.puntoBoton(nombre);
            return p ? aPantalla(p.x, p.y) : null;
        },
        aMundo: aMundo,
        aPantalla: aPantalla,
        tomarDemo: function (id) {
            var f = escena && escena.pieza(id);
            if (!f || (f.estado !== "disponible" && f.estado !== "seleccionada")) return;
            escena.demo = true;
            escena.seleccionar(f);
            escena.tomada = f;
            f.offset = { x: 0, y: 0 };
            f.objetivo = { x: f.img.x, y: f.img.y };
            f.sigue = { x: f.img.x, y: f.img.y };
            f.inicio = { x: f.img.x, y: f.img.y, t: Date.now() };
            escena.empezarArrastre(f);
        },
        ponerCliente: function (id, x, y) {
            var f = escena && escena.pieza(id);
            if (!f || f !== escena.tomada) return;
            var p = aMundo(x, y);
            f.offset = { x: 0, y: 0 };
            f.objetivo = { x: p.x, y: p.y };
        },
        deshacer: function (id) {
            if (!escena) return;
            var f = escena.pieza(id);
            delete escena.colocadas[id];
            escena.robot.deshacer(id);
            escena.consola.desmarcar(id);
            if (f) {
                f.estado = "disponible";
                f.img.setVisible(true).setDepth(12);
                f.esc = f.escObj = f.fit;
                if (f.img.input) f.img.input.enabled = true;
            }
        },
        finDemo: function () {
            if (!escena) return;
            escena.demo = false;
            escena.deseleccionar();
        },
        estado: function () {
            if (!escena) return null;
            return {
                ids: escena.ids.slice(),
                seleccion: escena.sel ? escena.sel.id : null,
                tomada: escena.tomada ? escena.tomada.id : null,
                colocadas: Object.keys(escena.colocadas),
                bloqueadas: Object.keys(escena.bloq),
                giro: escena.giroOn,
                radios: escena.radios(),
                piezas: escena.piezas.filter(function (f) { return f.activo; }).map(function (f) {
                    return { id: f.id, estado: f.estado, rot: f.rot, hueco: f.hueco, x: Math.round(f.img.x), y: Math.round(f.img.y), visible: f.img.visible };
                }),
                ranuras: escena.ids.map(function (id) {
                    var c = escena.robot.puntoRanura(id);
                    var p = escena.robot.partes[id];
                    return { id: id, x: Math.round(c.x), y: Math.round(c.y), visible: p.visible, puesta: p.puesta };
                })
            };
        }
    };
})(typeof window !== "undefined" ? window : global);
