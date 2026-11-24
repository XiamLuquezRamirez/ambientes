/**
 * EscenarioPuzle — escena Phaser 4 de "El Puzle Geométrico 3D" (window.EscenarioPuzle).
 *
 * Arma el mundo (MundoPuzle), la construcción (ConstruccionPuzle), la bandeja (BandejaPuzle) y los
 * paneles (PanelPuzle). Maneja la entrada real con mouse y touch: tocar un compartimento elige el
 * bloque, arrastrarlo lo lleva a la construcción, los botones de la barra lo giran de 90 en 90.
 * Cuenta cada acción en EventosPuzle. No decide aciertos: al soltar avisa con la forma, el giro y
 * la distancia a cada posición (callback "soltar") y script.js le pregunta a ReglasPuzle.
 *
 * Mundo de diseño 1600 × 900 con Scale.ENVELOP: lo jugable va entre x 210 y 1390, que cabe en 4:3
 * (1024 × 768); en 16:9 el panel del plano se corre hasta x 1448.
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser;
    var W = 1600, H = 900;
    var UMBRAL_ARRASTRE = 12;
    var SOBRE_DEDO = 38;

    var M = function () { return global.MotorPuzle; };
    var S = function () { return global.SolidosPuzle; };
    var R = function () { return global.ReglasPuzle; };
    var EV = function () { return global.EventosPuzle; };

    var juego = null, escena = null, el = null, cfg = null, variante = null, espera = null;
    var cb = {};

    function avisar(nombre, a) {
        var f = cb[nombre];
        if (typeof f === "function") {
            try { return f(a); } catch (e) { console.warn("[EscenarioPuzle]", nombre, e); }
        }
        return undefined;
    }

    function emitir(nombre, datos) { if (EV()) EV().emitir(nombre, datos); }
    function jcfg() { return (cfg && cfg.juego) || {}; }
    function num(v, d) { var n = Number(v); return isFinite(n) && n > 0 ? n : d; }
    function arrastra(f) { return f && (f.estado === "arrastrando" || f.estado === "cerca"); }

    var EscenaPuzle = Phaser ? class extends Phaser.Scene {
        constructor() { super({ key: "Puzle" }); }

        create() {
            var self = this;
            M().texturas(this);
            this.anim = new (M().Animador)();
            this.t = 0;
            this.arrastreOn = false;
            this.sel = null;
            this.tomada = null;
            this.puntero = null;
            this.lista = [];
            this.colocadas = {};
            this.destinoDe = {};
            this.giroOn = false;
            this.cercaDe = null;
            this.demo = false;

            this.mundo = new global.MundoPuzle(this, variante);
            this.obra = new global.ConstruccionPuzle(this);
            this.bandeja = new global.BandejaPuzle(this, variante);
            this.panel = new global.PanelPuzle(this, {
                variante: variante,
                xVisible: this.limitesVisibles().x1,
                girar: function (dir) { self.girarSeleccion(dir); },
                ayuda: function () { avisar("ayuda", self.sel ? self.sel.id : null); }
            });
            this.particulas = new (M().Particulas)(this, 40, 650);

            this.input.on("dragstart", this.alEmpezar, this);
            this.input.on("drag", this.alMover, this);
            this.input.on("dragend", this.alSoltar, this);
            this.events.once("shutdown", function () {
                self.input.off("dragstart", self.alEmpezar, self);
                self.input.off("drag", self.alMover, self);
                self.input.off("dragend", self.alSoltar, self);
                self.anim.limpiar();
                self.mundo.destruir();
                self.bandeja.destruir();
                self.panel.destruir();
                escena = null;
            });
            escena = this;
            if (espera) { var r = espera; espera = null; r(true); }
        }

        // ---------------------------------------------------------------- nivel

        /**
         * info: { indice, total, nivel, lista (posiciones), fichas: [{ id, forma, def, rot, color, deco, hueco }],
         *         aspecto(id) → { color, deco } }
         */
        cargar(info) {
            this.anim.limpiar();
            this.nivel = info.nivel || {};
            this.lista = info.lista.slice();
            this.aspecto = info.aspecto;
            this.colocadas = {};
            this.destinoDe = {};
            this.giroOn = !!this.nivel.giro;
            this.sel = null;
            this.tomada = null;
            this.cercaDe = null;
            this.mundo.tema(this.nivel.clave);
            this.obra.configurar(this.lista, this.nivel, info.aspecto);
            this.bandeja.configurar(info.fichas, this.obra.esc);
            this.panel.configurar(this.nivel, info.indice, info.total, this.lista, info.aspecto, this.obra.esc);
            this.panel.seleccion(null);
            this.actualizarGuia();
            emitir("nivel_iniciado", { nivel: (info.indice || 0) + 1, clave: this.nivel.clave, total: this.lista.length });
        }

        ficha(id) { return this.bandeja.ficha(id); }

        /** La guía fantasma (y el plano) señalan la próxima posición; si hay bloque elegido, la suya. */
        actualizarGuia() {
            var sel = this.sel;
            var meta = R().siguiente(this.lista, this.colocadas, sel ? sel.forma : null);
            if (!meta) { this.obra.guia(null); this.panel.marcarObjetivo(null); return null; }
            var modo = "normal";
            if (sel && sel.forma === meta.forma) modo = R().orientacionOk(sel.def, sel.rot, meta.orient) ? "perfecta" : "lista";
            this.obra.guia(meta.id, modo);
            this.panel.marcarObjetivo(meta.id);
            this.panel.seleccion(sel ? { def: sel.def, rot: sel.rot, color: sel.color, deco: sel.deco, forma: sel.forma } : null);
            return meta;
        }

        /** Distancia del ancla del bloque a cada posición, con su estado. */
        distancias(x, y) {
            var self = this;
            return this.lista.map(function (p) {
                var c = self.obra.punto(p.id);
                var dx = x - c.x, dy = y - c.y;
                return { id: p.id, forma: p.forma, orient: p.orient, distancia: Math.sqrt(dx * dx + dy * dy), ocupado: !!self.colocadas[p.id], habilitada: R().habilitada(p, self.lista, self.colocadas) };
            });
        }

        radios() {
            var e = Math.max(0.8, Math.min(1.3, this.obra.esc));
            var acierto = num(jcfg().radioAcierto, 70) * e;
            var casi = Math.max(acierto + 40, num(jcfg().radioCasi, 165) * e);
            return { acierto: acierto, casi: casi, cerca: Math.max(casi, num(jcfg().radioCerca, 230) * e), iman: Math.max(acierto, num(jcfg().radioIman, 110) * e) };
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
            var f = this.bandeja.fichaDeZona(obj);
            if (!f || !this.arrastreOn || this.tomada) return;
            if (f.estado !== "disponible" && f.estado !== "seleccionada") return;
            this.seleccionar(f);
            this.tomada = f;
            this.puntero = p;
            f.inicio = { x: p.worldX, y: p.worldY };
            f.offset = { x: f.g.x - p.worldX, y: f.g.y - p.worldY };
            f.objetivo = { x: f.g.x, y: f.g.y };
            f.sigue = { x: f.g.x, y: f.g.y };
            this.limites = this.limitesVisibles();
        }

        /** Selección: el bloque se levanta, su compartimento se enciende y el panel de giro lo muestra. */
        seleccionar(f) {
            if (this.sel && this.sel !== f && this.sel.estado === "seleccionada") { this.sel.estado = "disponible"; this.sel.escObj = this.sel.fit; }
            var nueva = this.sel !== f;
            this.sel = f;
            f.estado = "seleccionada";
            f.escObj = f.fit * 1.1;
            if (nueva) {
                this.particulas.emitir(f.g.x, f.g.y, { n: 6, tipos: ["p-destello", "p-chispa"], vel: 140, grav: 0, vida: 480, escala: 0.4, dispersion: 40, sumar: true, tintes: [0xffd43b, 0xffffff] });
                var meta = this.actualizarGuia();
                var sirve = R().habilitadas(this.lista, this.colocadas).some(function (p) { return p.forma === f.forma; });
                emitir("bloque_seleccionado", { id: f.id, forma: f.forma, x: f.g.x, y: f.g.y, sirve: sirve });
                avisar("seleccion", { id: f.id, sirve: sirve, meta: meta ? meta.id : null });
            }
        }

        deseleccionar() {
            if (this.sel && this.sel.estado === "seleccionada") { this.sel.estado = "disponible"; this.sel.escObj = this.sel.fit; }
            this.sel = null;
            this.actualizarGuia();
        }

        alMover(p, obj) {
            var f = this.bandeja.fichaDeZona(obj);
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
            f.g.setDepth(300);
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
            var f = this.bandeja.fichaDeZona(obj);
            if (!f || f !== this.tomada) return;
            this.soltar(f);
        }

        soltar(f) {
            this.tomada = null;
            this.puntero = null;
            if (f.estado === "seleccionada") return; // fue un toque: queda elegido en su compartimento
            // se evalúa donde el dedo dejó el bloque (el suavizado del seguimiento no le quita el acierto)
            var x = f.objetivo ? f.objetivo.x : f.g.x, y = f.objetivo ? f.objetivo.y : f.g.y;
            var r = this.radios();
            var cer = R().cercano({ forma: f.forma, def: f.def, rot: f.rot, destinos: this.distancias(x, y) }, r.cerca);
            if (cer && cer.orientacionOk) {
                var c = this.obra.punto(cer.id);
                var tira = R().iman(cer.distancia, r.iman, jcfg().iman, true);
                x += (c.x - x) * tira;
                y += (c.y - y) * tira;
            }
            f.g.setPosition(x, y);
            f.estado = "soltada";
            this.apagarCercania(f);
            var datos = { id: f.id, forma: f.forma, def: f.def, rot: f.rot, destinos: this.distancias(x, y), radio: r.acierto, radioCasi: r.casi };
            if (cb.soltar) avisar("soltar", datos);
            else this.devolver(f.id);
        }

        apagarCercania(f) {
            this.obra.apagarArrastre();
            if (this.cercaDe) emitir("bloque_lejos", { id: f ? f.id : null });
            this.cercaDe = null;
        }

        /** Botones de la barra: giro de 90° del bloque elegido (en la bandeja o mientras se arrastra). */
        girarSeleccion(dir) {
            var f = this.sel;
            if (!this.arrastreOn && !this.demo) return;
            if (!f || !this.giroOn || f.estado === "ensamblada") { avisar("giroSinPieza", null); return; }
            if (!R().girable(f.def)) {
                f.giro = 1;
                avisar("noGira", f.id);
                return;
            }
            var antes = f.estado;
            f.rot = R().girar(f.rot, dir, num(jcfg().pasoGiro, 90));
            f.giro = 1;
            if (antes === "seleccionada") {
                f.estado = "rotando";
                setTimeout(function () { if (f.estado === "rotando") f.estado = "seleccionada"; }, 240);
            }
            this.bandeja.dibujar(f);
            var meta = this.actualizarGuia();
            var coincide = !!meta && meta.forma === f.forma && R().orientacionOk(f.def, f.rot, meta.orient);
            emitir("bloque_rotado", { id: f.id, rot: f.rot, dir: dir, coincide: coincide });
            avisar("girar", { id: f.id, rot: f.rot, coincide: coincide, mismaForma: !!meta && meta.forma === f.forma });
        }

        seguirArrastre(dt, ts) {
            var f = this.tomada;
            if (!f) return;
            if (this.puntero && !this.puntero.isDown && !this.demo) { this.soltar(f); return; }
            if (!arrastra(f)) return;
            // el bloque se coloca un poco por encima del dedo para que se vea
            var decae = Math.min(1, dt / 180);
            f.offset.x += (0 - f.offset.x) * decae;
            f.offset.y += (-SOBRE_DEDO - f.offset.y) * decae;
            var k = 1 - Math.exp(-dt / 34);
            f.sigue.x += (f.objetivo.x - f.sigue.x) * k;
            f.sigue.y += (f.objetivo.y - f.sigue.y) * k;
            var x = f.sigue.x, y = f.sigue.y;
            var r = this.radios();
            var dist = this.distancias(x, y);
            var cer = R().cercano({ forma: f.forma, def: f.def, rot: f.rot, destinos: dist }, r.cerca);
            if (cer && cer.orientacionOk) {
                var c = this.obra.punto(cer.id);
                var tira = R().iman(cer.distancia, r.iman, jcfg().iman, true);
                x += (c.x - x) * tira;
                y += (c.y - y) * tira;
            }
            f.esc += (1 - f.esc) * Math.min(1, dt / 120);
            f.g.setPosition(x, y).setScale(f.esc).setRotation(0).setAlpha(1);
            emitir("bloque_arrastrado", { id: f.id, x: x, y: y });
            var validas = R().habilitadas(this.lista, this.colocadas).filter(function (p) { return p.forma === f.forma; }).map(function (p) { return p.id; });
            this.obra.resaltar(validas, cer ? cer.id : null, cer ? cer.fuerza : 0, ts);
            this.obra.sombra(f, x, y, cer ? cer.id : null, cer ? cer.fuerza : 0);
            this.obra.focoAltura(cer ? cer.id : null);
            if (cer) {
                f.estado = "cerca";
                var clave = cer.id + (cer.orientacionOk ? ":ok" : ":giro");
                if (this.cercaDe !== clave) {
                    this.cercaDe = clave;
                    var cc = this.obra.punto(cer.id);
                    emitir("bloque_cerca_de_posicion", { id: f.id, destino: cer.id, fuerza: cer.fuerza, orientacionOk: cer.orientacionOk, x: cc.x, y: cc.y });
                    avisar("cerca", { id: f.id, destino: cer.id, orientacionOk: cer.orientacionOk });
                }
            } else {
                f.estado = "arrastrando";
                if (this.cercaDe) { emitir("bloque_lejos", { id: f.id }); this.cercaDe = null; }
            }
        }

        // ---------------------------------------------------------------- resultados (los llama script.js)

        /** El bloque se ensambla en la posición `destino`: secuencia completa de encaje y reacciones. */
        encajar(id, destino) {
            var f = this.ficha(id);
            var p = this.lista.filter(function (x) { return x.id === destino; })[0];
            if (!f || !p || this.colocadas[destino]) return Promise.resolve();
            var self = this;
            if (this.tomada === f) { this.tomada = null; this.puntero = null; }
            f.estado = "ensamblando";
            this.colocadas[destino] = true;
            this.destinoDe[id] = destino;
            this.apagarCercania(f);
            if (this.sel === f) this.sel = null;
            var desde = { x: f.g.x, y: f.g.y, esc: f.esc };
            f.g.setVisible(false);
            this.actualizarGuia();
            return this.obra.encajar(destino, { color: f.color, deco: f.deco, forma: f.forma }, desde).then(function () {
                f.estado = "ensamblada";
                self.panel.colocar(destino, f.color);
                var n = Object.keys(self.colocadas).length;
                var a = self.obra.punto(destino);
                emitir("bloque_ensamblado", { id: id, destino: destino, colocadas: n, total: self.lista.length, x: a.x, y: a.y, capa: p.capa });
                var capa = R().capaCompletada(destino, self.lista, self.colocadas);
                var capas = R().capas(self.lista);
                if (capa != null) {
                    self.obra.iluminarCapa(capa);
                    emitir("capa_completada", { capa: capa, indice: capas.indexOf(capa), total: capas.length });
                }
                var alt = R().altura(self.lista, self.colocadas);
                if (alt > (self.alturaPrev || 0) + 1e-6) {
                    self.alturaPrev = alt;
                    emitir("altura_incrementada", { altura: alt, maxima: self.obra.total.z1 });
                }
                self.actualizarGuia();
                return { capa: capa };
            });
        }

        /**
         * El bloque vuelve suave a su compartimento y sigue elegido. motivo: casi, orientacion,
         * otraForma, orden, ocupado, fuera. La guía muestra dónde va lo que corresponde.
         */
        devolver(id, motivo, destino) {
            var f = this.ficha(id);
            if (!f) return Promise.resolve();
            var self = this;
            if (this.tomada === f) { this.tomada = null; this.puntero = null; }
            this.apagarCercania(f);
            f.estado = "volviendo";
            if (motivo) emitir("bloque_rechazado", { id: id, motivo: motivo, destino: destino || null });
            if (motivo && motivo !== "fuera") this.obra.pista();
            if (motivo === "orientacion") this.panel.llamarAtencionGiro();
            var h = this.bandeja.puntoHueco(f);
            var x0 = f.g.x, y0 = f.g.y, e0 = f.esc;
            var dist = Math.sqrt((h.x - x0) * (h.x - x0) + (h.y - y0) * (h.y - y0));
            var dur = Math.min(700, 320 + dist * 0.35);
            f.sacudir = motivo && motivo !== "fuera" ? 1 : 0;
            return this.anim.agregar(dur, function (u) {
                var s = M().suave(u);
                f.g.setPosition(M().lerp(x0, h.x, s), M().lerp(y0, h.y, s) - Math.sin(u * Math.PI) * Math.min(90, dist * 0.2));
                f.esc = M().lerp(e0, f.fit * 1.1, s);
                f.g.setScale(f.esc);
            }).then(function () {
                f.g.setDepth(212);
                if (f.estado === "volviendo") {
                    f.estado = self.sel === f ? "seleccionada" : "disponible";
                    f.escObj = self.sel === f ? f.fit * 1.1 : f.fit;
                }
            });
        }

        pista() { this.obra.pista(); this.panel.llamarAtencionGuia(); }

        // ---------------------------------------------------------------- momentos del nivel

        celebrar() {
            var self = this;
            this.bandeja.bloquear(true);
            emitir("construccion_completada", { nivel: (this.nivel && this.nivel.id) || 0 });
            return this.obra.completar().then(function () {
                var a = self.obra.luzCuspide;
                self.mundo.emitirFiesta(a.x, a.y - 20);
                return M().sleep(900);
            });
        }

        salida() {
            var self = this;
            this.mundo.calmar();
            var pl = global.PanelPuzle.plano();
            return Promise.all([this.obra.salida({ x: (pl.x0 + pl.x1) / 2, y: (pl.y0 + pl.y1) / 2 }), this.bandeja.vaciar()]);
        }

        // ---------------------------------------------------------------- cuadro a cuadro

        update(time, delta) {
            var dt = Math.min(50, delta || 16);
            this.t += dt;
            var ts = this.t / 1000;
            this.anim.update(dt);
            this.seguirArrastre(dt, ts);
            this.mundo.update(dt, ts);
            this.obra.update(dt, ts);
            this.bandeja.update(dt, ts);
            this.panel.update(dt, ts);
            this.particulas.update(dt);
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
            Promise.all([document.fonts.load("700 30px Fredoka"), document.fonts.load("600 20px Fredoka")]),
            M().sleep(1500)
        ]).catch(function () { /* sin la fuente queda Arial */ });
    }

    function crearJuego() {
        juego = new Phaser.Game({
            type: Phaser.AUTO,
            parent: el,
            transparent: false,
            backgroundColor: "#bfe6ff",
            banner: false,
            scale: { mode: Phaser.Scale.ENVELOP, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
            input: { activePointers: 3 },
            render: { antialias: true },
            scene: [EscenaPuzle]
        });
        global.__escenarioPuzle = juego;
        global.__pedniaPhaserGame = juego;
    }

    // ------------------------------------------------------------------ API pública

    global.EscenarioPuzle = {
        montar: function (contenedor, config, v) {
            el = contenedor;
            cfg = config;
            variante = v;
            if (!Phaser || !el) return Promise.resolve(false);
            return fuentesListas().then(function () {
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
            escena.panel.habilitar(!!on);
            escena.bandeja.bloquear(!on);
            if (!on && escena.tomada) {
                var f = escena.tomada;
                if (arrastra(f)) escena.devolver(f.id);
                escena.tomada = null;
            }
        },
        arranque: function () { if (escena) { escena.mundo.arranque(); return escena.obra.aparecer(); } return Promise.resolve(); },
        encajar: function (id, destino) { return escena ? escena.encajar(id, destino) : Promise.resolve(); },
        devolver: function (id, motivo, destino) { return escena ? escena.devolver(id, motivo, destino) : Promise.resolve(); },
        pista: function () { if (escena) escena.pista(); },
        seleccionada: function () { return escena && escena.sel ? escena.sel.id : null; },
        celebrar: function () { return escena ? escena.celebrar() : Promise.resolve(); },
        salida: function () { return escena ? escena.salida() : Promise.resolve(); },
        llamarAtencionGiro: function () { if (escena) escena.panel.llamarAtencionGiro(); },
        mostrarProgreso: function (on) { if (escena) escena.panel.mostrarProgreso(on); },
        cinematica: function (avisos) {
            if (!escena || !global.CinematicaPuzle) return Promise.resolve();
            return global.CinematicaPuzle.correr(escena, avisos || {});
        },
        // demo y pruebas: coordenadas de pantalla
        puntoCliente: function (id) {
            var f = escena && escena.ficha(id);
            return f ? aPantalla(f.g.x, f.g.y) : null;
        },
        puntoPosicionCliente: function (destino) {
            if (!escena) return null;
            var c = escena.obra.punto(destino);
            return aPantalla(c.x, c.y);
        },
        puntoBotonCliente: function (nombre) {
            var p = escena && escena.panel.puntoBoton(nombre);
            return p ? aPantalla(p.x, p.y) : null;
        },
        aMundo: aMundo,
        aPantalla: aPantalla,
        tomarDemo: function (id) {
            var f = escena && escena.ficha(id);
            if (!f || (f.estado !== "disponible" && f.estado !== "seleccionada" && f.estado !== "bloqueada")) return;
            escena.demo = true;
            f.estado = "disponible";
            escena.seleccionar(f);
            escena.tomada = f;
            f.offset = { x: 0, y: 0 };
            f.objetivo = { x: f.g.x, y: f.g.y };
            f.sigue = { x: f.g.x, y: f.g.y };
            f.inicio = { x: f.g.x, y: f.g.y };
            escena.empezarArrastre(f);
        },
        ponerCliente: function (id, x, y) {
            var f = escena && escena.ficha(id);
            if (!f || f !== escena.tomada) return;
            var p = aMundo(x, y);
            f.offset = { x: 0, y: 0 };
            f.objetivo = { x: p.x, y: p.y };
        },
        deshacer: function (id) {
            if (!escena) return;
            var f = escena.ficha(id);
            var destino = escena.destinoDe[id];
            if (destino) {
                delete escena.colocadas[destino];
                escena.obra.deshacer(destino);
                escena.panel.quitarColocada(destino);
            }
            delete escena.destinoDe[id];
            escena.alturaPrev = R().altura(escena.lista, escena.colocadas);
            if (f) {
                f.estado = "disponible";
                f.g.setVisible(true).setDepth(212);
                f.esc = f.escObj = f.fit;
            }
            escena.actualizarGuia();
        },
        finDemo: function () {
            if (!escena) return;
            escena.demo = false;
            escena.tomada = null;
            escena.deseleccionar();
        },
        estado: function () {
            if (!escena) return null;
            return {
                nivel: escena.nivel ? escena.nivel.id : null,
                seleccion: escena.sel ? escena.sel.id : null,
                tomada: escena.tomada ? escena.tomada.id : null,
                colocadas: Object.keys(escena.colocadas),
                giro: escena.giroOn,
                guia: escena.obra.guiaId,
                guiaModo: escena.obra.guiaModo,
                radios: escena.radios(),
                capa: R().capaActual(escena.lista, escena.colocadas),
                fichas: escena.bandeja.fichas.map(function (f) {
                    return { id: f.id, forma: f.forma, estado: f.estado, rot: f.rot, hueco: f.hueco, x: Math.round(f.g.x), y: Math.round(f.g.y), visible: f.g.visible };
                }),
                posiciones: escena.lista.map(function (p) {
                    var c = escena.obra.punto(p.id);
                    return { id: p.id, forma: p.forma, orient: p.orient, capa: p.capa, x: Math.round(c.x), y: Math.round(c.y), puesta: !!escena.colocadas[p.id] };
                })
            };
        }
    };
})(typeof window !== "undefined" ? window : global);
