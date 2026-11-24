/**
 * EscenarioMaquina — escena Phaser 4 de "La Máquina de Engranajes y Poleas" (window.EscenarioMaquina).
 *
 * Arma el taller (TallerMaquina), el tablero (TableroMaquina), la máquina secundaria
 * (MaquinasMaquina), la bandeja (BandejaMaquina) y la placa (PanelMaquina). Maneja la entrada
 * real con mouse y touch: tocar un compartimento elige la pieza, arrastrarla la lleva al tablero.
 * Mientras se arrastra, el aro del eje que le sirve se ilumina, el imán la atrae un poco y una
 * rueda gira sola hasta que sus dientes quedan frente a los huecos de su vecina. No decide
 * aciertos: al soltar avisa (callback "soltar") y script.js le pregunta a ReglasMaquina.
 *
 * Mundo de diseño 1600 × 900 con Scale.ENVELOP: lo jugable va entre x 210 y 1390 (cabe en 4:3).
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser;
    var W = 1600, H = 900;
    var UMBRAL_ARRASTRE = 12;
    var SOBRE_DEDO = 34;

    var M = function () { return global.MotorMaquina; };
    var R = function () { return global.ReglasMaquina; };
    var EV = function () { return global.EventosMaquina; };

    var juego = null, escena = null, el = null, cfg = null, variante = null, espera = null;
    var cb = {};

    function avisar(nombre, a) {
        var f = cb[nombre];
        if (typeof f === "function") {
            try { return f(a); } catch (e) { console.warn("[EscenarioMaquina]", nombre, e); }
        }
        return undefined;
    }

    function emitir(nombre, datos) { if (EV()) EV().emitir(nombre, datos); }
    function jcfg() { return (cfg && cfg.juego) || {}; }
    function num(v, d) { var n = Number(v); return isFinite(n) && n > 0 ? n : d; }
    function arrastra(f) { return f && (f.estado === "arrastrando" || f.estado === "cerca"); }

    var EscenaMaquina = Phaser ? class extends Phaser.Scene {
        constructor() { super({ key: "Maquina" }); }

        create() {
            var self = this;
            M().texturas(this);
            this.anim = new (M().Animador)();
            this.t = 0;
            this.arrastreOn = false;
            this.sel = null;
            this.tomada = null;
            this.puntero = null;
            this.cercaDe = null;
            this.demo = false;
            this.chispaT = 0;

            global.DibujosMaquina.rollo(this);
            global.DibujosMaquina.aro(this);
            this.taller = new global.TallerMaquina(this, variante);
            this.taller.alPalanca = function () { avisar("palanca"); };
            this.taller.alPalancaBloqueada = function () { avisar("palancaBloqueada"); };
            this.tablero = new global.TableroMaquina(this, cfg, variante);
            this.maquinas = new global.MaquinasMaquina(this, this.tablero);
            this.bandeja = new global.BandejaMaquina(this, cfg, variante);
            this.panel = new global.PanelMaquina(this, variante);
            this.particulas = new (M().Particulas)(this, 40, 650);

            this.input.on("dragstart", this.alEmpezar, this);
            this.input.on("drag", this.alMover, this);
            this.input.on("dragend", this.alSoltar, this);
            this.events.once("shutdown", function () {
                self.input.off("dragstart", self.alEmpezar, self);
                self.input.off("drag", self.alMover, self);
                self.input.off("dragend", self.alSoltar, self);
                self.anim.limpiar();
                self.taller.destruir();
                self.bandeja.destruir();
                escena = null;
            });
            escena = this;
            if (espera) { var r = espera; espera = null; r(true); }
        }

        // ---------------------------------------------------------------- nivel

        /** info: { indice, total, nivel (nivelesJuego[i]), geo, piezas (orden de la bandeja) } */
        cargar(info) {
            this.anim.limpiar();
            this.nivel = info.nivel || {};
            this.geo = info.geo;
            this.indice = info.indice || 0;
            this.sel = null;
            this.tomada = null;
            this.cercaDe = null;
            this.taller.tema(this.indice);
            this.tablero.configurar(info.geo, this.nivel);
            this.maquinas.configurar(this.nivel, info.geo);
            this.bandeja.configurar(info.piezas, this.tablero.opcionesPieza(), this.tablero.escala());
            this.panel.configurar(this.indice, info.total, this.nivel, R().destinos(info.geo));
            emitir("nivel_iniciado", { nivel: this.indice + 1, clave: this.nivel.clave, total: R().destinos(info.geo).length });
        }

        ficha(id) { return this.bandeja.ficha(id); }

        radios(tipo) {
            var acierto = tipo === "correa" ? num(jcfg().radioCorrea, 70) : num(jcfg().radioAcierto, 80);
            return {
                acierto: acierto,
                casi: Math.max(acierto + 40, num(jcfg().radioCasi, 175)),
                cerca: num(jcfg().radioCerca, 210),
                iman: num(jcfg().radioIman, 120)
            };
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
            f.offset = { x: f.cont.x - p.worldX, y: f.cont.y - p.worldY };
            f.objetivo = { x: f.cont.x, y: f.cont.y };
            f.sigue = { x: f.cont.x, y: f.cont.y };
            this.limites = this.limitesVisibles();
        }

        /** Selección: la pieza se levanta y brilla, su compartimento se enciende y el tablero señala su eje. */
        seleccionar(f) {
            if (this.sel && this.sel !== f && this.sel.estado === "seleccionada") this.sel.estado = "disponible";
            var nueva = this.sel !== f;
            this.sel = f;
            f.estado = "seleccionada";
            this.tablero.actualizarDestinos({ tipo: f.tipo, talla: f.talla });
            if (nueva) {
                this.particulas.emitir(f.cont.x, f.cont.y, { n: 7, tipos: ["p-destello", "p-chispa"], vel: 150, grav: 0, vida: 480, escala: 0.4, dispersion: 40, sumar: true, tintes: [0xffd43b, 0xffffff] });
                var self = this;
                var sirve = R().destinos(this.geo).some(function (d) {
                    return d.tipo === f.tipo && d.talla === f.talla && !self.tablero.puestos[d.id] && self.tablero.habilitado(d.id);
                });
                emitir("pieza_seleccionada", { id: f.id, tipo: f.tipo, talla: f.talla, x: f.cont.x, y: f.cont.y, sirve: sirve });
                avisar("seleccion", { id: f.id, tipo: f.tipo, talla: f.talla, sirve: sirve });
            }
        }

        deseleccionar() {
            if (this.sel && this.sel.estado === "seleccionada") this.sel.estado = "disponible";
            this.sel = null;
            this.tablero.actualizarDestinos(null);
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
            f.cont.setDepth(300);
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
            var f = this.bandeja.fichaDeZona(obj);
            if (!f || f !== this.tomada) return;
            this.soltar(f);
        }

        /** Destino más cercano que le sirve a la pieza (o null). */
        cercanoA(f, x, y) {
            var r = this.radios(f.tipo);
            return R().cercano({ tipo: f.tipo, talla: f.talla, destinos: this.tablero.distancias(x, y) }, r.cerca);
        }

        soltar(f) {
            this.tomada = null;
            this.puntero = null;
            this.tablero.cursor = null;
            if (f.estado === "seleccionada") return; // fue un toque: queda elegida en su compartimento
            // se evalúa donde el dedo dejó la pieza; el imán la acerca un poco al eje que le sirve
            var x = f.objetivo ? f.objetivo.x : f.cont.x, y = f.objetivo ? f.objetivo.y : f.cont.y;
            var r = this.radios(f.tipo);
            var cer = this.cercanoA(f, x, y);
            if (cer) {
                var c = this.tablero.punto(cer.id);
                var tira = R().iman(cer.distancia, r.iman, jcfg().iman);
                x += (c.x - x) * tira;
                y += (c.y - y) * tira;
            }
            f.cont.setPosition(x, y);
            f.estado = "soltada";
            this.apagarCercania(f);
            var datos = { id: f.id, tipo: f.tipo, talla: f.talla, x: x, y: y, destinos: this.tablero.distancias(x, y), radio: r.acierto, radioCasi: r.casi };
            if (cb.soltar) avisar("soltar", datos);
            else this.devolver(f.id);
        }

        apagarCercania(f) {
            this.tablero.cerca(null, 0);
            if (this.cercaDe) emitir("pieza_lejos", { id: f ? f.id : null });
            this.cercaDe = null;
        }

        seguirArrastre(dt, ts) {
            var f = this.tomada;
            if (!f) return;
            if (this.puntero && !this.puntero.isDown && !this.demo) { this.soltar(f); return; }
            if (!arrastra(f)) return;
            // la pieza se ve un poco por encima del dedo y sigue su movimiento con suavidad
            var decae = Math.min(1, dt / 180);
            f.offset.x += (0 - f.offset.x) * decae;
            f.offset.y += (-SOBRE_DEDO - f.offset.y) * decae;
            var k = 1 - Math.exp(-dt / 34);
            f.sigue.x += (f.objetivo.x - f.sigue.x) * k;
            f.sigue.y += (f.objetivo.y - f.sigue.y) * k;
            var x = f.sigue.x, y = f.sigue.y;
            var r = this.radios(f.tipo);
            var cer = this.cercanoA(f, x, y);
            if (cer) {
                var c = this.tablero.punto(cer.id);
                var tira = R().iman(cer.distancia, r.iman, jcfg().iman);
                x += (c.x - x) * tira;
                y += (c.y - y) * tira;
            }
            // tamaño del tablero (la correa se queda como rollo)
            var escObj = f.tipo === "correa" ? f.fit * 1.1 : this.tablero.escala();
            f.esc += (escObj - f.esc) * Math.min(1, dt / 120);
            f.cont.setPosition(x, y).setScale(f.esc);
            f.brillo.setAlpha(0.35 + (cer ? cer.fuerza * 0.5 : 0));
            // los dientes se alinean solos al acercarse al eje correcto; lejos, gira despacio
            if (f.tipo !== "correa") {
                var obj = cer ? this.tablero.faseObjetivo(cer.id) : null;
                if (obj != null) {
                    var meta = this.tablero.giroCercano(f.ang, obj, f.z);
                    f.girar(f.ang + (meta - f.ang) * Math.min(1, dt / 160) * (0.3 + cer.fuerza));
                } else {
                    f.girar(f.ang + f.vel * 1.6 * dt / 1000);
                }
            }
            emitir("pieza_arrastrada", { id: f.id, x: x, y: y });
            this.tablero.cursor = { x: x, y: y, r: f.radio * this.tablero.escala() };
            this.tablero.cerca(cer ? cer.id : null, cer ? cer.fuerza : 0);
            // energía: chispitas que acompañan la pieza
            this.chispaT -= dt;
            if (this.chispaT <= 0) {
                this.chispaT = cer ? 70 : 160;
                var a = Math.random() * Math.PI * 2, rr = f.radio * f.esc * 0.95;
                this.particulas.emitir(x + Math.cos(a) * rr, y + Math.sin(a) * rr, { n: 1, tipos: ["p-chispa"], vel: 30, grav: -30, vida: 500, escala: 0.3, sumar: true, tintes: cer ? [0x8ce99a, 0xffffff] : [0x74c0fc, 0xffe066] });
            }
            if (cer) {
                f.estado = "cerca";
                if (this.cercaDe !== cer.id) {
                    this.cercaDe = cer.id;
                    var cc = this.tablero.punto(cer.id);
                    emitir("pieza_cerca_de_eje", { id: f.id, destino: cer.id, fuerza: cer.fuerza, x: cc.x, y: cc.y });
                    this.particulas.emitir(cc.x, cc.y, { n: 8, tipos: ["p-chispa", "p-estrella"], vel: 120, grav: 0, vida: 600, escala: 0.35, sumar: true, dispersion: 60, tintes: [0x8ce99a, 0xffffff] });
                    avisar("cerca", { id: f.id, destino: cer.id });
                }
            } else {
                f.estado = "arrastrando";
                if (this.cercaDe) { emitir("pieza_lejos", { id: f.id }); this.cercaDe = null; }
            }
        }

        // ---------------------------------------------------------------- resultados (los llama script.js)

        encajar(id, destino) {
            var f = this.ficha(id);
            if (!f || this.tablero.puestos[destino]) return Promise.resolve();
            var self = this;
            if (this.tomada === f) { this.tomada = null; this.puntero = null; }
            f.estado = "ensamblando";
            if (f.zona && f.zona.input) f.zona.input.enabled = false;
            this.apagarCercania(f);
            this.tablero.cursor = null;
            if (this.sel === f) this.sel = null;
            this.tablero.actualizarDestinos(null);
            return this.tablero.encajar(f, destino).then(function () {
                self.bandeja.marcarUsada(f);
                self.panel.colocar(destino);
                var n = Object.keys(self.tablero.puestos).length;
                var total = R().destinos(self.geo).length;
                var p = self.tablero.punto(destino);
                emitir("pieza_ensamblada", { id: id, destino: destino, tipo: f.tipo, talla: f.talla, puestas: n, total: total, x: p.x, y: p.y });
                self.tablero.actualizarDestinos(self.sel ? { tipo: self.sel.tipo, talla: self.sel.talla } : null);
                if (n >= total) emitir("maquina_lista", { nivel: self.indice + 1 });
            });
        }

        /**
         * La pieza vuelve suave a su compartimento y sigue elegida. motivo: otraTalla, otraPieza,
         * orden, ocupado (el aro cambia de color y tiembla), casi (el aro correcto destella), fuera.
         */
        devolver(id, motivo, destino) {
            var f = this.ficha(id);
            if (!f) return Promise.resolve();
            var self = this;
            if (this.tomada === f) { this.tomada = null; this.puntero = null; }
            this.apagarCercania(f);
            this.tablero.cursor = null;
            f.estado = "volviendo";
            var p = destino ? this.tablero.punto(destino) : { x: f.cont.x, y: f.cont.y };
            if (motivo) emitir("pieza_rechazada", { id: id, motivo: motivo, destino: destino || null, x: p.x, y: p.y });
            if (destino && (motivo === "otraTalla" || motivo === "otraPieza" || motivo === "orden" || motivo === "ocupado")) this.tablero.error(destino);
            else if (destino && motivo === "casi") this.tablero.flash(destino, global.TableroMaquina.COLOR.guia, 900);
            var h = this.bandeja.puntoHueco(f);
            var x0 = f.cont.x, y0 = f.cont.y, e0 = f.esc;
            var dist = Math.sqrt((h.x - x0) * (h.x - x0) + (h.y - y0) * (h.y - y0));
            var dur = Math.min(720, 330 + dist * 0.35);
            var sac = motivo && motivo !== "fuera" && motivo !== "casi";
            return this.anim.agregar(dur, function (u) {
                var s = M().suave(u);
                var temblor = sac && u < 0.3 ? Math.sin(u * 80) * 6 * (1 - u / 0.3) : 0;
                f.cont.setPosition(M().lerp(x0, h.x, s) + temblor, M().lerp(y0, h.y, s) - Math.sin(u * Math.PI) * Math.min(90, dist * 0.2));
                f.esc = M().lerp(e0, f.fit * 1.12, s);
                f.cont.setScale(f.esc);
            }).then(function () {
                f.cont.setDepth(212);
                f.brillo.setAlpha(0);
                if (f.estado === "volviendo") f.estado = self.sel === f ? "seleccionada" : "disponible";
            });
        }

        /** Ayuda: el eje que sigue destella y la pieza que le sirve salta en la bandeja. */
        pista(destino) {
            if (!destino) return;
            this.tablero.pista(destino);
            var d = R().destino(this.geo, destino);
            var f = d ? this.bandeja.fichas.filter(function (x) { return x.tipo === d.tipo && x.talla === d.talla && (x.estado === "disponible" || x.estado === "seleccionada"); })[0] : null;
            this.bandeja.llamar(f);
        }

        // ---------------------------------------------------------------- momentos del nivel

        salida() {
            var self = this;
            this.bandeja.bloquear(true);
            return Promise.all([this.tablero.salida(), this.maquinas.salida(), this.bandeja.vaciar()]).then(function () {
                self.tablero.frenar();
            });
        }

        // ---------------------------------------------------------------- cuadro a cuadro

        update(time, delta) {
            var dt = Math.min(50, delta || 16);
            this.t += dt;
            var ts = this.t / 1000;
            this.anim.update(dt);
            this.seguirArrastre(dt, ts);
            this.taller.update(dt, ts);
            this.tablero.update(dt, ts);
            this.maquinas.update(dt, ts);
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
            backgroundColor: "#4f9fc0",
            banner: false,
            scale: { mode: Phaser.Scale.ENVELOP, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
            input: { activePointers: 3 },
            render: { antialias: true },
            scene: [EscenaMaquina]
        });
        global.__escenarioMaquina = juego;
        global.__pedniaPhaserGame = juego;
    }

    // ------------------------------------------------------------------ API pública

    global.EscenarioMaquina = {
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
            escena.bandeja.bloquear(!on);
            if (!on && escena.tomada) {
                var f = escena.tomada;
                if (arrastra(f)) escena.devolver(f.id);
                escena.tomada = null;
            }
        },
        aparecer: function () { return escena ? escena.tablero.aparecer() : Promise.resolve(); },
        encajar: function (id, destino) { return escena ? escena.encajar(id, destino) : Promise.resolve(); },
        devolver: function (id, motivo, destino) { return escena ? escena.devolver(id, motivo, destino) : Promise.resolve(); },
        pista: function (destino) { if (escena) escena.pista(destino); },
        seleccionada: function () { return escena && escena.sel ? { id: escena.sel.id, tipo: escena.sel.tipo, talla: escena.sel.talla } : null; },
        puestos: function () { return escena ? Object.assign({}, escena.tablero.puestos) : {}; },
        salida: function () { return escena ? escena.salida() : Promise.resolve(); },
        mostrarProgreso: function (on) { if (escena) escena.panel.mostrarProgreso(on); },
        /** La palanca del panel espera al niño (true) o queda trabada (false). */
        palanca: function (on) { if (escena) escena.taller.palancaLista(!!on); },
        tocarPalanca: function () { if (escena) escena.taller.tocarPalanca(); },
        puntoPalancaCliente: function () {
            if (!escena) return null;
            var p = escena.taller.puntoPalanca();
            return aPantalla(p.x, p.y);
        },
        estadoPalanca: function () { return escena ? escena.taller.palanca.estado : null; },
        /** La palanca bajó: la máquina arranca (CinematicaMaquina.marcha). */
        marcha: function (avisos) {
            if (!escena || !global.CinematicaMaquina) return Promise.resolve();
            return global.CinematicaMaquina.marcha(escena, avisos || {});
        },
        final: function (avisos) {
            if (!escena || !global.CinematicaMaquina) return Promise.resolve();
            return global.CinematicaMaquina.final(escena, avisos || {});
        },
        // demo y pruebas: coordenadas de pantalla
        puntoCliente: function (id) {
            var f = escena && escena.ficha(id);
            return f ? aPantalla(f.cont.x, f.cont.y) : null;
        },
        puntoDestinoCliente: function (destino) {
            if (!escena) return null;
            var c = escena.tablero.punto(destino);
            return aPantalla(c.x, c.y);
        },
        fichaPara: function (destino) {
            if (!escena) return null;
            var d = R().destino(escena.geo, destino);
            var f = d ? escena.bandeja.fichas.filter(function (x) { return x.tipo === d.tipo && x.talla === d.talla && x.estado !== "ensamblada" && x.estado !== "ensamblando"; })[0] : null;
            return f ? f.id : null;
        },
        aMundo: aMundo,
        aPantalla: aPantalla,
        tomarDemo: function (id) {
            var f = escena && escena.ficha(id);
            if (!f || (f.estado !== "disponible" && f.estado !== "seleccionada")) return;
            escena.demo = true;
            f.estado = "disponible";
            escena.seleccionar(f);
            escena.tomada = f;
            f.offset = { x: 0, y: 0 };
            f.objetivo = { x: f.cont.x, y: f.cont.y };
            f.sigue = { x: f.cont.x, y: f.cont.y };
            f.inicio = { x: f.cont.x, y: f.cont.y };
            escena.empezarArrastre(f);
        },
        ponerCliente: function (id, x, y) {
            var f = escena && escena.ficha(id);
            if (!f || f !== escena.tomada) return;
            var p = aMundo(x, y);
            f.offset = { x: 0, y: 0 };
            f.objetivo = { x: p.x, y: p.y };
        },
        deshacer: function (destino) {
            if (!escena) return;
            var pieza = escena.tablero.deshacer(destino);
            escena.panel.quitar(destino);
            if (pieza) {
                pieza.estado = "disponible";
                pieza.cont.setVisible(true).setAlpha(1).setDepth(212);
                pieza.esc = pieza.fit;
                pieza.brillo.setAlpha(0);
                pieza.visto.setVisible(false);
                pieza.cont.setPosition(pieza.hueco.x, pieza.hueco.y).setScale(pieza.fit);
                escena.bandeja.bloquear(!escena.arrastreOn);
            }
        },
        finDemo: function () {
            if (!escena) return;
            escena.demo = false;
            escena.tomada = null;
            escena.deseleccionar();
        },
        estado: function () {
            if (!escena) return null;
            var tb = escena.tablero;
            return {
                nivel: escena.nivel ? escena.nivel.id : null,
                seleccion: escena.sel ? escena.sel.id : null,
                tomada: escena.tomada ? escena.tomada.id : null,
                puestos: Object.keys(tb.puestos),
                marcha: tb.marcha,
                omega: tb.omega,
                fichas: escena.bandeja.fichas.map(function (f) {
                    return { id: f.id, tipo: f.tipo, talla: f.talla, estado: f.estado, x: Math.round(f.cont.x), y: Math.round(f.cont.y), visible: f.cont.visible };
                }),
                ejes: Object.keys(tb.el).map(function (k) {
                    var e = tb.el[k];
                    return { id: k, tipo: e.tipo, talla: e.def.talla, x: Math.round(e.def.x), y: Math.round(e.def.y), ang: e.ang, a: e.a, conectado: e.conectado, visible: tb.visible(k), z: e.def.z, r: e.def.r };
                }),
                correas: Object.keys(tb.co).map(function (k) { return { id: k, visible: tb.co[k].visible, tension: tb.co[k].tension }; })
            };
        }
    };
})(typeof window !== "undefined" ? window : global);
