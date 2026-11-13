/**
 * EscenarioUso — escena Phaser 4 de "¿Dónde lo uso?" (window.EscenarioUso).
 *
 * Dibuja en #escenario-phaser, sobre el vestidor de PedNia (fondo en CSS/SVG):
 *   - el tablero central luminoso con dos columnas: objetos a la izquierda y partes del cuerpo a la derecha;
 *   - las tarjetas (iconos.js) con su conector circular en el borde que mira al centro;
 *   - los hilos mágicos (líneas) que unen cada pareja, redibujados en cada cuadro;
 *   - el dibujo del objeto que viaja por el hilo hasta su parte del cuerpo al encontrar la pareja.
 * Durante la partida solo está el tablero; Zoe 3D (guia-3d.js, en el DOM) sale en la presentación y la demo
 * en el hueco de la izquierda que da zonaZoe().
 *
 * El arrastre lo maneja conexiones.js; la validación, reglas.js. Esta escena solo dibuja.
 *
 * API:
 *   montar(el, cfgRonda) → Promise · listo() · reacomodar() · escena() · diseno()
 *   cargarRonda(cfgRonda) · ocultarTarjetas() → Promise   (cambio de ronda)
 *   tarjetaEn(x, y)               id de la tarjeta (o su conector) bajo un punto del mundo
 *   destinoEn(x, y, origenId)     id de la tarjeta de la otra columna donde se soltaría la línea
 *   iniciarLinea(id, x, y) · moverLinea(x, y) · candidato(id|null)
 *   retraerLinea() → Promise      la línea vuelve suave a su conector
 *   fijarLinea(origen, destino) → Promise   la línea queda fija como hilo de luz, con destellos
 *   romperLinea(origen, destino) → Promise  tiembla, parpadea y se deshace en partículas
 *   estadoTarjeta(id, "normal"|"activa"|"candidata"|"hecha") · menearTarjeta(id) · brilloConector(id, on)
 *   mostrarTarjetas() → Promise · iluminarConectores() → Promise · lineaMuestra(a, b) → Promise
 *   reordenarPartes({ parteId: fila }) → Promise · filasPartes() · filasIniciales() · limpiarConexiones() · celebrar(on)
 *   estrellas(x, y, n, colores, fuerza)
 *   puntoDe(id) → coords de pantalla del conector · zonaZoe()
 *   aPantalla(x, y) · mundoDePantalla(x, y)
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser || null;
    var I = global.IconosUso;
    var R = global.ReglasUso;
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);

    var RES = 2;
    var COLORES_FIESTA = [0xffe066, 0xff8fc7, 0x7cf3ff, 0xb197fc, 0xffb36b, 0xffffff];
    var ORO = 0xffc94d;

    var cfg = null;
    var juego = null;
    var sc = null;
    var tarjetas = {};      // id → contenedor
    var conexiones = {};    // objetoId → parteId (líneas fijas)
    var brillos = {};       // id → true (conector con brillo dorado de ayuda)
    var activa = null;      // { id, x, y, retrayendo, x0, y0, u }
    var rota = null;        // { origen, destino, t0, dur }
    var muestra = null;     // { a, b, alpha }
    var candidatoId = null;
    var fiesta = { on: false, k: 0 };
    var gLineas = null;
    var gActiva = null;
    var tableroG = null;
    var lucesG = null;
    var fondoG = null;
    var lay = { W: 0, H: 0, cw: 240, ch: 90, rc: 14, ancho: 9, modo: "fila" };
    var listoPromesa = null;

    function sleep(ms) {
        return new Promise(function (r) { setTimeout(r, reducido ? Math.min(ms, 80) : ms); });
    }

    function colorNum(hex) {
        return parseInt(String(hex || "#7950f2").replace("#", ""), 16);
    }

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

    // ------------------------------------------------------------------ tweens con respaldo

    var CLAVES_TWEEN = ["targets", "duration", "delay", "ease", "yoyo", "repeat", "repeatDelay", "hold", "onComplete", "onUpdate", "onStart"];

    function aplicarFinal(c) {
        if (c.yoyo) return;
        var objetivos = [].concat(c.targets || []);
        Object.keys(c).forEach(function (k) {
            if (CLAVES_TWEEN.indexOf(k) >= 0) return;
            var v = c[k];
            if (v && typeof v === "object" && typeof v.to === "number") v = v.to;
            if (typeof v !== "number") return;
            objetivos.forEach(function (o) {
                if (!o) return;
                if (k === "scale" && o.setScale) o.setScale(v);
                else o[k] = v;
            });
        });
    }

    /** Tween con Promise; si Phaser no avanza (pestaña oculta), resuelve igual por tiempo. */
    function tw(c) {
        if (!sc) return Promise.resolve();
        var dur = (c.duration || 300) * ((c.repeat || 0) + 1) * (c.yoyo ? 2 : 1) + (c.delay || 0);
        if (reducido) {
            c.duration = Math.min(c.duration || 300, 80);
            dur = Math.min(dur, 400);
        }
        return new Promise(function (resolve) {
            var hecho = false;
            var fin = function () { if (!hecho) { hecho = true; resolve(); } };
            var prev = c.onComplete;
            c.onComplete = function () { if (typeof prev === "function") prev(); fin(); };
            var t = sc.tweens.add(c);
            setTimeout(function () {
                if (hecho) return;
                if (t && t.isPlaying && t.isPlaying()) t.stop();
                aplicarFinal(c);
                if (typeof prev === "function") prev();
                fin();
            }, dur + 250);
        });
    }

    // ------------------------------------------------------------------ texturas

    /** viewBox de cada SVG → origen (0..1) y tamaño. */
    function origen(s) {
        var m = /viewBox="([^"]+)"/.exec(s || "");
        if (!m) return { x: 0.5, y: 0.5, w: 0, h: 0 };
        var v = m[1].split(/\s+/).map(Number);
        return { x: -v[0] / v[2], y: -v[1] / v[3], w: v[2], h: v[3] };
    }

    function cargarSvg(clave, s) {
        return new Promise(function (resolve) {
            var o = origen(s);
            var img = new Image();
            img.onload = function () {
                var c = document.createElement("canvas");
                c.width = Math.ceil(o.w * RES);
                c.height = Math.ceil(o.h * RES);
                c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
                if (sc.textures.exists(clave)) sc.textures.remove(clave);
                sc.textures.addCanvas(clave, c);
                resolve();
            };
            img.onerror = function () {
                console.warn("[EscenarioUso] no se pudo dibujar", clave);
                resolve();
            };
            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
        });
    }

    function texturaCanvas(clave, s, dibujar) {
        if (sc.textures.exists(clave)) return;
        var c = document.createElement("canvas");
        c.width = s;
        c.height = s;
        dibujar(c.getContext("2d"), s);
        sc.textures.addCanvas(clave, c);
    }

    function texturasFx() {
        texturaCanvas("fx-halo", 128, function (ctx, s) {
            var g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
            g.addColorStop(0, "rgba(255,255,255,0.95)");
            g.addColorStop(0.4, "rgba(255,255,255,0.5)");
            g.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, s, s);
        });
        texturaCanvas("fx-estrella", 48, function (ctx, s) {
            ctx.translate(s / 2, s / 2);
            ctx.beginPath();
            for (var i = 0; i < 10; i++) {
                var r = i % 2 === 0 ? s * 0.48 : s * 0.2;
                var a = -Math.PI / 2 + i * Math.PI / 5;
                ctx[i === 0 ? "moveTo" : "lineTo"](Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fillStyle = "#ffffff";
            ctx.fill();
        });
        texturaCanvas("fx-chispa", 32, function (ctx, s) {
            ctx.translate(s / 2, s / 2);
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.moveTo(0, -s / 2);
            ctx.quadraticCurveTo(0, 0, s / 2, 0);
            ctx.quadraticCurveTo(0, 0, 0, s / 2);
            ctx.quadraticCurveTo(0, 0, -s / 2, 0);
            ctx.quadraticCurveTo(0, 0, 0, -s / 2);
            ctx.fill();
        });
        texturaCanvas("fx-punto", 24, function (ctx, s) {
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(s / 2, s / 2, s / 2 - 1, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // ------------------------------------------------------------------ tarjetas

    function crearTarjeta(t) {
        var c = sc.add.container(0, 0);
        c.setDepth(10);
        c.tid = t.id;
        c.def = t;
        c.columna = t.columna;
        c.fila = t.fila || 0;
        c.filaInicial = c.fila;
        c.colorN = colorNum(t.color);
        c.bordeN = colorNum(t.borde || t.color);
        c.estado = "normal";
        c.glow = sc.add.image(0, 0, "fx-halo");
        c.glow.setTint(c.bordeN);
        c.glow.setAlpha(0);
        c.fondo = sc.add.graphics();
        c.icono = sc.add.image(0, 0, "ico-" + t.icono);
        c.texto = sc.add.text(0, 0, String(t.nombre || t.id), {
            fontFamily: "Fredoka, sans-serif",
            fontStyle: "700",
            fontSize: "22px",
            color: "#2b2350",
            align: "center"
        });
        c.texto.setOrigin(0.5, 0.5);
        if (c.texto.setResolution) c.texto.setResolution(2);
        c.conector = sc.add.container(0, 0);
        c.halo = sc.add.image(0, 0, "fx-halo");
        c.halo.setBlendMode(Phaser.BlendModes.ADD);
        c.halo.setAlpha(0);
        c.conectorG = sc.add.graphics();
        c.conector.add([c.halo, c.conectorG]);
        c.insignia = sc.add.graphics();
        c.add([c.glow, c.fondo, c.icono, c.texto, c.insignia, c.conector]);
        c.setAlpha(0);
        tarjetas[t.id] = c;
        return c;
    }

    function estrellaPuntos(cx, cy, r1, r2) {
        var pts = [];
        for (var i = 0; i < 10; i++) {
            var r = i % 2 === 0 ? r1 : r2;
            var a = -Math.PI / 2 + i * Math.PI / 5;
            pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
        }
        return pts;
    }

    /**
     * Nombre en una o dos líneas sin partir palabras ("Calcetines" nunca queda "Calcetin-es"): primero la
     * palabra más larga tiene que caber a lo ancho; luego el nombre completo, ya con saltos, a lo alto.
     */
    function ajustarTexto(c, fs, anchoMax, altoMax) {
        var t = c.texto;
        var nombre = String(c.def.nombre || c.def.id);
        var larga = nombre.split(/\s+/).sort(function (a, b) { return b.length - a.length; })[0];
        t.setWordWrapWidth(null);
        t.setText(larga);
        for (var n = 0; n < 16 && fs > 13; n++) {
            t.setFontSize(fs);
            if (t.width <= anchoMax) break;
            fs -= 1;
        }
        t.setText(nombre);
        t.setWordWrapWidth(anchoMax, false);
        for (var k = 0; k < 16; k++) {
            t.setFontSize(fs);
            if (t.height <= altoMax || fs <= 13) break;
            fs -= 1;
        }
    }

    function pintarTarjeta(c) {
        var w = lay.cw;
        var h = lay.ch;
        var hecha = c.estado === "hecha";
        var activaT = c.estado === "activa" || c.estado === "candidata";
        var r = Math.min(20, h * 0.22);
        var f = c.fondo;
        f.clear();
        // sombra
        f.fillStyle(0x5c3b1e, 0.16);
        f.fillRoundedRect(-w / 2 + 2, -h / 2 + 6, w, h, r);
        // tarjeta: color propio; al encontrar su pareja se aclara (ya se usó)
        f.fillStyle(c.colorN, 1);
        f.fillRoundedRect(-w / 2, -h / 2, w, h, r);
        if (hecha) {
            f.fillStyle(0xffffff, 0.45);
            f.fillRoundedRect(-w / 2, -h / 2, w, h, r);
        }
        // brillo de arriba
        f.fillStyle(0xffffff, 0.28);
        f.fillRoundedRect(-w / 2 + 6, -h / 2 + 5, w - 12, h * 0.28, Math.max(4, r - 6));

        var izq = c.columna === "obj";
        var rcx = lay.rc + 6;
        var is, ix, iy, tx, ty, tAncho, tAlto;
        if (lay.modo === "fila") {
            var area = Math.min(h * 0.94, w * 0.42);
            is = area * 0.84;
            if (izq) {
                ix = -w / 2 + area / 2 + 6;
                tx = (-w / 2 + area + 6 + w / 2 - rcx) / 2;
                tAncho = w / 2 - rcx - (-w / 2 + area + 6) - 6;
            } else {
                ix = w / 2 - area / 2 - 6;
                tx = (-w / 2 + rcx + w / 2 - area - 6) / 2;
                tAncho = w / 2 - area - 6 - (-w / 2 + rcx) - 6;
            }
            iy = 0;
            ty = 0;
            tAlto = h * 0.86;
        } else {
            is = Math.min(h * 0.58, w * 0.7);
            ix = 0;
            iy = -h / 2 + is / 2 + h * 0.06;
            tx = 0;
            ty = h / 2 - h * 0.18;
            tAncho = w - 2 * rcx;
            tAlto = h * 0.34;
        }
        // burbuja blanca detrás del dibujo
        f.fillStyle(0xffffff, hecha ? 0.75 : 0.92);
        f.fillCircle(ix, iy, is * 0.56);
        f.lineStyle(3, c.bordeN, 0.35);
        f.strokeCircle(ix, iy, is * 0.56);
        // borde
        f.lineStyle(activaT ? 7 : 5, hecha ? ORO : c.bordeN, 1);
        f.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
        if (activaT) {
            f.lineStyle(3, 0xffffff, 0.95);
            f.strokeRoundedRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12, Math.max(4, r - 6));
        }

        c.icono.setPosition(ix, iy);
        c.icono.setScale(is / (c.icono.width || 240));
        c.icono.setAlpha(hecha ? 0.9 : 1);

        var fs = lay.modo === "fila" ? Math.min(h * 0.27, 30) : Math.min(h * 0.2, 24);
        c.texto.setColor(hecha ? "#7a5200" : "#2b2350");
        ajustarTexto(c, Math.max(14, Math.round(fs)), Math.max(40, tAncho), tAlto);
        c.texto.setPosition(tx, ty);

        // conector: en el borde que mira al centro del tablero
        var cx = izq ? w / 2 : -w / 2;
        c.conector.setPosition(cx, lay.modo === "fila" ? 0 : -h * 0.08);
        pintarConector(c);

        // insignia de "pareja encontrada": estrella dorada en la esquina de afuera
        var m = c.insignia;
        m.clear();
        if (hecha) {
            var mx = izq ? -w / 2 + 8 : w / 2 - 8;
            var my = -h / 2 + 8;
            var mr = Math.max(14, h * 0.17);
            m.fillStyle(0xffffff, 1);
            m.fillCircle(mx, my, mr + 3);
            m.fillStyle(ORO, 1);
            m.fillPoints(estrellaPuntos(mx, my, mr * 0.95, mr * 0.42), true);
            m.lineStyle(2, 0xb07800, 1);
            m.strokePoints(estrellaPuntos(mx, my, mr * 0.95, mr * 0.42), true);
        }

        c.glow.setScale((w * 1.5) / 128, (h * 2) / 128);
        c.ancho = w;
        c.alto = h;
    }

    function pintarConector(c) {
        var g = c.conectorG;
        var rc = lay.rc;
        var hecha = c.estado === "hecha";
        g.clear();
        g.fillStyle(0x5c3b1e, 0.18);
        g.fillCircle(1, 3, rc + 5);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(0, 0, rc + 5);
        g.fillStyle(hecha ? ORO : c.bordeN, 1);
        g.fillCircle(0, 0, rc);
        g.fillStyle(0xffffff, 0.95);
        g.fillCircle(-rc * 0.25, -rc * 0.25, rc * 0.34);
        g.lineStyle(3, 0x5c3b1e, 0.25);
        g.strokeCircle(0, 0, rc + 5);
        c.halo.setScale((rc * 6) / 128);
        c.halo.setTint(hecha ? ORO : c.bordeN);
    }

    function filaY(fila) {
        var b = lay.tab;
        return b.y + lay.pad + lay.ch / 2 + fila * (lay.ch + lay.gap) + lay.desfY;
    }

    function baseDe(c) {
        var b = lay.tab;
        return {
            x: c.columna === "obj" ? b.x + lay.padX + lay.cw / 2 : b.x + b.w - lay.padX - lay.cw / 2,
            y: filaY(c.fila)
        };
    }

    function ubicarTarjeta(c) {
        var p = baseDe(c);
        c.baseX = p.x;
        c.baseY = p.y;
        if (!c.entrando) c.setPosition(c.baseX, c.baseY);
    }

    function mundoDe(objeto, x, y) {
        var m = objeto.getWorldTransformMatrix();
        var p = m.transformPoint(x || 0, y || 0);
        return { x: p.x, y: p.y };
    }

    function conectorMundo(id) {
        var c = tarjetas[id];
        if (!c) return null;
        return mundoDe(c.conector);
    }

    function dentroDeTarjeta(c, x, y, extra) {
        return Math.abs(x - c.x) <= (c.ancho / 2) * c.scaleX + (extra || 0) && Math.abs(y - c.y) <= (c.alto / 2) * c.scaleY + (extra || 0);
    }

    function tarjetaEn(x, y) {
        var encontrada = null;
        Object.keys(tarjetas).forEach(function (id) {
            var c = tarjetas[id];
            if (!c.visible || c.alpha < 0.5) return;
            var k = conectorMundo(id);
            var enConector = k && Math.hypot(x - k.x, y - k.y) <= lay.rc * 2.3;
            if (dentroDeTarjeta(c, x, y, 4) || enConector) encontrada = id;
        });
        return encontrada;
    }

    function radioCaptura() {
        var k = Number(cfg.juego && cfg.juego.radioCaptura) || 2.8;
        return Math.max(38, lay.rc * k);
    }

    /** Tarjeta de la otra columna donde se soltaría la línea: encima de la tarjeta o cerca de su conector. */
    function destinoEn(x, y, origenId) {
        var o = tarjetas[origenId];
        if (!o) return null;
        var mejor = null;
        Object.keys(tarjetas).forEach(function (id) {
            var c = tarjetas[id];
            if (c.columna === o.columna || c.alpha < 0.5) return;
            if (dentroDeTarjeta(c, x, y, 6)) {
                mejor = { id: id, d: 0 };
                return;
            }
            var k = conectorMundo(id);
            var d = Math.hypot(x - k.x, y - k.y);
            if (d <= radioCaptura() && (!mejor || d < mejor.d)) mejor = { id: id, d: d };
        });
        return mejor ? mejor.id : null;
    }

    function estadoTarjeta(id, estado) {
        var c = tarjetas[id];
        if (!c) return;
        c.estado = estado || "normal";
        pintarTarjeta(c);
        sc.tweens.killTweensOf([c.conector, c.glow]);
        var resalta = c.estado === "activa" || c.estado === "candidata";
        if (!c.entrando && !c.moviendo) c.setScale(resalta ? 1.05 : 1);
        c.conector.setScale(resalta ? 1.25 : 1);
        c.glow.setAlpha(resalta ? 0.55 : 0);
        if (c.estado === "hecha") {
            c.setScale(1.12);
            tw({ targets: c, scale: 1, duration: 420, ease: "Back.easeOut" });
        }
    }

    function menearTarjeta(id) {
        var c = tarjetas[id];
        if (!c || reducido) return Promise.resolve();
        c.glow.setAlpha(0.6);
        return tw({ targets: c, angle: 4, duration: 110, yoyo: true, repeat: 3, ease: "Sine.easeInOut",
            onComplete: function () { c.angle = 0; c.glow.setAlpha(c.estado === "activa" ? 0.55 : 0); } });
    }

    function brilloConector(id, on) {
        if (on) {
            brillos[id] = true;
            return;
        }
        delete brillos[id];
        if (tarjetas[id]) {
            tarjetas[id].conector.setScale(1);
            pintarConector(tarjetas[id]);
        }
    }

    async function mostrarTarjetas() {
        var ids = Object.keys(tarjetas);
        // fila por fila, alternando columnas: objeto de arriba, parte de arriba…
        ids.sort(function (a, b) {
            var ca = tarjetas[a], cb = tarjetas[b];
            return (ca.fila - cb.fila) || (ca.columna === "obj" ? -1 : 1);
        });
        var vuelos = ids.map(function (id, i) {
            var c = tarjetas[id];
            ubicarTarjeta(c);
            c.entrando = true;
            c.setAlpha(0);
            c.setScale(0.6);
            c.setPosition(c.baseX + (c.columna === "obj" ? -1 : 1) * lay.cw * 0.5, c.baseY);
            return sleep(i * 120).then(function () {
                sonarSiHay("aparece", i % 3 === 0);
                return tw({ targets: c, x: c.baseX, alpha: 1, scale: 1, duration: 460, ease: "Back.easeOut" });
            }).then(function () {
                c.entrando = false;
                c.setPosition(c.baseX, c.baseY);
                c.setAlpha(1);
                c.setScale(1);
            });
        });
        await Promise.all(vuelos);
    }

    /** Los conectores se encienden uno a uno (presentación). */
    async function iluminarConectores() {
        var ids = Object.keys(tarjetas);
        await Promise.all(ids.map(function (id, i) {
            var c = tarjetas[id];
            return sleep(i * 70).then(function () {
                c.halo.setAlpha(1);
                c.conector.setScale(1.5);
                return Promise.all([
                    tw({ targets: c.conector, scale: 1, duration: 420, ease: "Back.easeOut" }),
                    tw({ targets: c.halo, alpha: 0, duration: 900, delay: 300, ease: "Sine.easeIn" })
                ]);
            });
        }));
    }

    function sonarSiHay(nombre, si) {
        if (si && typeof global.sonarEvento === "function") global.sonarEvento(nombre);
    }

    /** Orden inicial de las filas (como en config.json). */
    function filasIniciales() {
        Object.keys(tarjetas).forEach(function (id) {
            var c = tarjetas[id];
            c.fila = c.filaInicial;
            sc.tweens.killTweensOf(c);
            c.moviendo = false;
            ubicarTarjeta(c);
        });
    }

    /** Las tarjetas salen volando hacia los lados (fin de una ronda). */
    async function ocultarTarjetas() {
        var ids = Object.keys(tarjetas);
        await Promise.all(ids.map(function (id, i) {
            var c = tarjetas[id];
            c.entrando = true;
            return sleep(i * 60).then(function () {
                return tw({ targets: c, x: c.x + (c.columna === "obj" ? -1 : 1) * lay.cw * 0.6, alpha: 0, scale: 0.6,
                    duration: 380, ease: "Back.easeIn" });
            });
        }));
    }

    /**
     * Cambia las tarjetas por las de otra ronda (cfgRonda = ReglasUso.ronda(config, i)). Quedan invisibles:
     * se muestran con mostrarTarjetas().
     */
    function cargarRonda(cfgRonda) {
        cfg = cfgRonda;
        Object.keys(tarjetas).forEach(function (id) {
            sc.tweens.killTweensOf(tarjetas[id]);
            tarjetas[id].destroy();
        });
        tarjetas = {};
        conexiones = {};
        brillos = {};
        activa = null;
        rota = null;
        muestra = null;
        candidatoId = null;
        celebrar(false);
        R.tarjetas(cfg).forEach(crearTarjeta);
        reacomodar();
    }

    /** Fila actual de cada parte del cuerpo: { parteId: fila }. */
    function filasPartes() {
        var r = {};
        Object.keys(tarjetas).forEach(function (id) {
            if (tarjetas[id].columna === "parte") r[id] = tarjetas[id].fila;
        });
        return r;
    }

    /**
     * Las partes del cuerpo cambian de fila (orden = { parteId: fila nueva }): cada tarjeta sale un poco hacia
     * afuera, viaja a su fila y vuelve al tablero.
     */
    async function reordenarPartes(orden) {
        var ids = Object.keys(tarjetas).filter(function (id) { return tarjetas[id].columna === "parte"; });
        await Promise.all(ids.map(function (id, i) {
            var c = tarjetas[id];
            var nueva = orden[id];
            if (nueva == null || nueva === c.fila) return Promise.resolve();
            c.fila = nueva;
            var p = baseDe(c);
            c.moviendo = true;
            var afuera = lay.cw * 0.18;
            return sleep(i * 90).then(function () {
                return tw({ targets: c, x: c.baseX + afuera, scale: 0.92, duration: 220, ease: "Sine.easeOut" });
            }).then(function () {
                return tw({ targets: c, y: p.y, duration: 420, ease: "Sine.easeInOut" });
            }).then(function () {
                return tw({ targets: c, x: p.x, scale: 1, duration: 260, ease: "Back.easeOut" });
            }).then(function () {
                c.moviendo = false;
                ubicarTarjeta(c);
                c.setScale(1);
            });
        }));
    }

    // ------------------------------------------------------------------ líneas

    function iniciarLinea(id, x, y) {
        var k = conectorMundo(id);
        rota = null;
        activa = { id: id, x: x != null ? x : k.x, y: y != null ? y : k.y, retrayendo: false };
    }

    function moverLinea(x, y) {
        if (!activa || activa.retrayendo) return;
        activa.x = x;
        activa.y = y;
    }

    /** La tarjeta de la otra columna sobre la que está la línea se ilumina. */
    function candidato(id) {
        if (candidatoId === id) return;
        var prev = candidatoId;
        candidatoId = id || null;
        if (prev && tarjetas[prev] && tarjetas[prev].estado === "candidata") estadoTarjeta(prev, "normal");
        if (candidatoId && tarjetas[candidatoId] && tarjetas[candidatoId].estado === "normal") estadoTarjeta(candidatoId, "candidata");
    }

    function retraerLinea() {
        candidato(null);
        if (!activa) return Promise.resolve();
        var a = activa;
        a.retrayendo = true;
        a.x0 = a.x;
        a.y0 = a.y;
        a.u = 1;
        return tw({ targets: a, u: 0, duration: 360, ease: "Cubic.easeIn" }).then(function () {
            if (activa === a) activa = null;
            if (tarjetas[a.id] && tarjetas[a.id].estado === "activa") estadoTarjeta(a.id, "normal");
        });
    }

    /** Ordena la pareja como (objeto, parte). */
    function par(a, b) {
        return tarjetas[a] && tarjetas[a].columna === "obj" ? { o: a, p: b } : { o: b, p: a };
    }

    /** Conexión correcta: la línea llega al conector, queda fija como hilo de luz y brillan los dos extremos. */
    async function fijarLinea(origenId, destinoId) {
        candidato(null);
        var k = conectorMundo(destinoId);
        if (!activa || activa.id !== origenId) iniciarLinea(origenId, k.x, k.y);
        var a = activa;
        a.retrayendo = true;
        await tw({ targets: a, x: k.x, y: k.y, duration: 140, ease: "Quad.easeOut" });
        var pp = par(origenId, destinoId);
        conexiones[pp.o] = pp.p;
        if (activa === a) activa = null;
        delete brillos[origenId];
        delete brillos[destinoId];
        estadoTarjeta(origenId, "hecha");
        estadoTarjeta(destinoId, "hecha");
        destello(origenId);
        destello(destinoId);
        // chispas a lo largo del hilo nuevo
        var ka = conectorMundo(pp.o);
        var kb = conectorMundo(pp.p);
        for (var i = 1; i <= 3; i++) {
            estrellas(ka.x + (kb.x - ka.x) * i / 4, ka.y + (kb.y - ka.y) * i / 4, 6, [ORO, 0xffffff, tarjetas[pp.o].bordeN], 0.45);
        }
        volarDibujo(pp.o, pp.p);
        await sleep(250);
    }

    /**
     * El dibujo del objeto viaja por el hilo hasta la tarjeta de su parte del cuerpo, se posa sobre su dibujo
     * con un rebote ("¡aquí se usa!"), estrellas, y vuelve a su tarjeta. No queda nada encima.
     */
    function volarDibujo(objetoId, parteId) {
        var o = tarjetas[objetoId];
        var p = tarjetas[parteId];
        if (!o || !p || reducido) return Promise.resolve();
        var desde = mundoDe(o.icono);
        var hasta = mundoDe(p.icono);
        var im = sc.add.image(desde.x, desde.y, o.icono.texture.key);
        var base = o.icono.scaleX;
        im.setScale(base);
        im.setDepth(36);
        var v = { u: 0 };
        var arco = Math.min(lay.H * 0.12, Math.abs(hasta.x - desde.x) * 0.18);
        return tw({ targets: v, u: 1, duration: 620, ease: "Sine.easeInOut",
            onUpdate: function () {
                im.x = desde.x + (hasta.x - desde.x) * v.u;
                im.y = desde.y + (hasta.y - desde.y) * v.u - Math.sin(v.u * Math.PI) * arco;
                im.setScale(base * (1 + 0.35 * Math.sin(v.u * Math.PI)));
                im.angle = Math.sin(v.u * Math.PI * 2) * 12;
            } })
            .then(function () {
                im.setPosition(hasta.x, hasta.y);
                im.angle = 0;
                estrellas(hasta.x, hasta.y, 16, [ORO, 0xffffff, o.bordeN], 0.7);
                return tw({ targets: im, scale: base * 1.25, duration: 160, yoyo: true, repeat: 1, ease: "Sine.easeInOut" });
            })
            .then(function () { return sleep(350); })
            .then(function () { return tw({ targets: im, alpha: 0, scale: base * 0.6, duration: 320, ease: "Sine.easeIn" }); })
            .then(function () { im.destroy(); });
    }

    function destello(id) {
        var c = tarjetas[id];
        var k = conectorMundo(id);
        if (!c || !k) return;
        c.halo.setAlpha(1);
        tw({ targets: c.halo, alpha: 0.45, duration: 1100, ease: "Sine.easeOut" });
        c.conector.setScale(1.7);
        tw({ targets: c.conector, scale: 1, duration: 480, ease: "Back.easeOut" });
        estrellas(k.x, k.y, 16, [ORO, 0xffffff, c.bordeN], 0.75);
        var aro = sc.add.circle(k.x, k.y, lay.rc * 1.2);
        aro.setStrokeStyle(5, ORO, 1);
        aro.setDepth(35);
        tw({ targets: aro, scale: 3.2, alpha: 0, duration: 650, ease: "Cubic.easeOut", onComplete: function () { aro.destroy(); } });
    }

    /**
     * Conexión incorrecta: la línea llega a la tarjeta, vibra suave y parpadea, se deshace en partículas
     * y las dos tarjetas vuelven a su estado. No castiga: no queda ninguna marca.
     */
    async function romperLinea(origenId, destinoId) {
        candidato(null);
        var k = conectorMundo(destinoId);
        if (!activa || activa.id !== origenId) iniciarLinea(origenId, k.x, k.y);
        var a = activa;
        a.retrayendo = true;
        await tw({ targets: a, x: k.x, y: k.y, duration: 120, ease: "Quad.easeOut" });
        if (activa === a) activa = null;
        var r = { origen: origenId, destino: destinoId, t0: sc.time.now, dur: reducido ? 120 : 720 };
        rota = r;
        var d = tarjetas[destinoId];
        if (d && !reducido) {
            d.glow.setTint(0xff922b);
            d.glow.setAlpha(0.5);
            tw({ targets: d, x: d.baseX + 6, duration: 70, yoyo: true, repeat: 3, onComplete: function () { d.x = d.baseX; } });
        }
        await sleep(r.dur);
        // se deshace: partículas a lo largo de la curva
        var ka = conectorMundo(origenId);
        var kb = conectorMundo(destinoId);
        var col = tarjetas[origenId] ? tarjetas[origenId].bordeN : 0xadb5bd;
        for (var i = 0; i <= 6; i++) {
            var u = i / 6;
            estrellas(ka.x + (kb.x - ka.x) * u, ka.y + (kb.y - ka.y) * u + Math.sin(u * Math.PI) * curvaCaida(ka, kb), 5, [col, 0xdee2e6, 0xffffff], 0.35, "fx-punto");
        }
        if (rota === r) rota = null;
        if (d) {
            d.glow.setTint(d.bordeN);
            d.glow.setAlpha(0);
        }
        // si el niño ya tomó otra línea mientras esta se deshacía, no se le apaga su tarjeta
        [origenId, destinoId].forEach(function (id) {
            var t = tarjetas[id];
            if (t && t.estado !== "hecha" && !(activa && activa.id === id)) estadoTarjeta(id, "normal");
        });
    }

    /** Línea de muestra (presentación): aparece entre dos tarjetas, brilla un momento y se apaga. */
    function lineaMuestra(a, b) {
        muestra = { a: a, b: b, alpha: 0 };
        var m = muestra;
        return tw({ targets: m, alpha: 1, duration: 450, ease: "Sine.easeOut" })
            .then(function () { return sleep(1100); })
            .then(function () { return tw({ targets: m, alpha: 0, duration: 450, ease: "Sine.easeIn" }); })
            .then(function () { if (muestra === m) muestra = null; });
    }

    function limpiarConexiones() {
        Object.keys(conexiones).forEach(function (o) {
            var p = conexiones[o];
            delete conexiones[o];
            estadoTarjeta(o, "normal");
            estadoTarjeta(p, "normal");
        });
        Object.keys(tarjetas).forEach(function (id) {
            tarjetas[id].halo.setAlpha(0);
            if (tarjetas[id].estado !== "normal") estadoTarjeta(id, "normal");
        });
        brillos = {};
        activa = null;
        rota = null;
        muestra = null;
        candidato(null);
        celebrar(false);
    }

    function celebrar(on) {
        fiesta.on = !!on;
        if (!sc) return;
        sc.tweens.killTweensOf(fiesta);
        if (on) {
            fiesta.k = 0;
            tw({ targets: fiesta, k: 1, duration: 500 });
            Object.keys(tarjetas).forEach(function (id, i) {
                setTimeout(function () {
                    var k = conectorMundo(id);
                    if (k) estrellas(k.x, k.y, 10, [ORO, 0xffffff, tarjetas[id].bordeN], 0.6);
                    tarjetas[id].halo.setAlpha(1);
                    if (!reducido) tw({ targets: tarjetas[id], scale: 1.08, duration: 220, yoyo: true, ease: "Sine.easeInOut" });
                }, i * 90);
            });
        } else {
            fiesta.k = 0;
        }
    }

    // ------------------------------------------------------------------ dibujo de cada cuadro

    var PUNTOS_CURVA = 24;
    var curva = [];
    for (var ci = 0; ci <= PUNTOS_CURVA; ci++) curva.push({ x: 0, y: 0 });

    function curvaCaida(a, b) {
        var len = Math.hypot(b.x - a.x, b.y - a.y);
        return Math.min(lay.H * 0.04, len * 0.08);
    }

    /**
     * Hilo mágico: curva suave, halo de color, núcleo blanco y chispas que viajan.
     * vib = desplazamiento perpendicular (línea que tiembla); alfa = intensidad.
     */
    function hilo(g, a, b, color, ancho, t, fase, brillo, vib, alfa) {
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) return;
        var nx = -dy / len;
        var ny = dx / len;
        var al = alfa == null ? 1 : alfa;
        var mx = (a.x + b.x) / 2;
        var my = (a.y + b.y) / 2 + curvaCaida(a, b);
        for (var i = 0; i <= PUNTOS_CURVA; i++) {
            var u = i / PUNTOS_CURVA;
            var v = 1 - u;
            var temblor = vib ? vib * Math.sin(u * Math.PI) * Math.sin(u * 18 + t / 30) : 0;
            curva[i].x = v * v * a.x + 2 * v * u * mx + u * u * b.x + nx * temblor;
            curva[i].y = v * v * a.y + 2 * v * u * my + u * u * b.y + ny * temblor;
        }
        var b2 = brillo || 0;
        g.lineStyle(ancho * (3 + b2 * 1.6), color, (0.16 + b2 * 0.2) * al);
        g.strokePoints(curva, false, false);
        g.lineStyle(ancho * 1.7, color, 0.35 * al);
        g.strokePoints(curva, false, false);
        g.lineStyle(ancho, color, al);
        g.strokePoints(curva, false, false);
        g.lineStyle(Math.max(2, ancho * 0.34), 0xffffff, (0.7 + b2 * 0.3) * al);
        g.strokePoints(curva, false, false);
        if (t != null && !reducido) {
            for (var s = 0; s < 2; s++) {
                var k = ((t / 1500) + (fase || 0) + s * 0.5) % 1;
                var j = Math.min(PUNTOS_CURVA, Math.floor(k * PUNTOS_CURVA));
                g.fillStyle(0xffffff, 0.95 * al);
                g.fillCircle(curva[j].x, curva[j].y, ancho * (0.55 + b2 * 0.35));
                g.fillStyle(color, 0.5 * al);
                g.fillCircle(curva[j].x, curva[j].y, ancho * (1 + b2 * 0.4));
            }
        }
    }

    function dibujar(time) {
        if (!gLineas || !gActiva) return;
        var t = time || 0;
        gLineas.clear();
        gActiva.clear();
        var ancho = lay.ancho;
        var b = fiesta.on ? fiesta.k * (0.6 + 0.4 * Math.sin(t / 180)) : 0;

        // hilos fijos (debajo de las tarjetas: el conector tapa el extremo)
        Object.keys(conexiones).forEach(function (o, i) {
            var a = conectorMundo(o);
            var p = conectorMundo(conexiones[o]);
            var col = fiesta.on ? COLORES_FIESTA[Math.floor(t / 260 + i) % COLORES_FIESTA.length] : ORO;
            if (a && p) hilo(gLineas, a, p, col, ancho, t, i * 0.17, 0.25 + b);
        });

        if (muestra && tarjetas[muestra.a] && tarjetas[muestra.b]) {
            hilo(gActiva, conectorMundo(muestra.a), conectorMundo(muestra.b), tarjetas[muestra.a].bordeN, ancho, t, 0, 0.4, 0, muestra.alpha);
        }

        if (rota && tarjetas[rota.origen] && tarjetas[rota.destino]) {
            var u = clamp((t - rota.t0) / rota.dur, 0, 1);
            var vib = ancho * 0.8 * (1 - u * 0.5);
            var parpadeo = 0.55 + 0.45 * Math.abs(Math.sin(t / 55));
            hilo(gActiva, conectorMundo(rota.origen), conectorMundo(rota.destino), tarjetas[rota.origen].bordeN, ancho, null, 0, 0, vib, parpadeo * (1 - u * 0.4));
        }

        if (activa && tarjetas[activa.id]) {
            var c0 = tarjetas[activa.id];
            var a0 = conectorMundo(activa.id);
            var fin = activa;
            if (activa.retrayendo && activa.x0 != null && activa.u < 1) {
                fin = { x: a0.x + (activa.x0 - a0.x) * activa.u, y: a0.y + (activa.y0 - a0.y) * activa.u };
            }
            hilo(gActiva, a0, fin, c0.bordeN, ancho * 1.1, t, 0, 0.35);
            gActiva.fillStyle(0xffffff, 1);
            gActiva.fillCircle(fin.x, fin.y, ancho * 1.05);
            gActiva.fillStyle(c0.bordeN, 1);
            gActiva.fillCircle(fin.x, fin.y, ancho * 0.7);
        }

        // halos de los conectores: los libres laten suave; los de ayuda brillan en dorado
        var pulso = reducido ? 0 : 0.5 + 0.5 * Math.sin(t / 380);
        Object.keys(tarjetas).forEach(function (id) {
            var c = tarjetas[id];
            if (c.alpha < 0.5) return;
            if (brillos[id]) {
                c.halo.setTint(0xffd43b);
                c.halo.setAlpha(0.6 + 0.4 * Math.sin(t / 200));
                c.conector.setScale(1.15 + 0.12 * Math.sin(t / 200));
            } else if (c.estado === "hecha") {
                c.halo.setTint(ORO);
                c.halo.setAlpha(Math.max(c.halo.alpha * 0.98, 0.35 + b * 0.6));
            } else if (c.estado === "normal") {
                c.halo.setTint(c.bordeN);
                c.halo.setAlpha(Math.max(c.halo.alpha * 0.96, 0.18 + 0.22 * pulso));
            }
        });

        if (lucesG) dibujarLuces(t);
    }

    // ------------------------------------------------------------------ tablero y suelo

    /** Tablero: marco luminoso azul, borde blanco y panel crema, como una pantalla interactiva. */
    function dibujarTablero() {
        var g = tableroG;
        var b = lay.tab;
        var r = Math.min(34, b.h * 0.06);
        g.clear();
        for (var i = 4; i >= 1; i--) {
            g.fillStyle(0x74c0fc, 0.07);
            g.fillRoundedRect(b.x - i * 7, b.y - i * 7, b.w + i * 14, b.h + i * 14, r + i * 7);
        }
        g.fillStyle(0x5c3b1e, 0.18);
        g.fillRoundedRect(b.x + 4, b.y + 10, b.w, b.h, r);
        g.fillStyle(0x339af0, 1);
        g.fillRoundedRect(b.x, b.y, b.w, b.h, r);
        var m = Math.max(8, Math.round(b.w * 0.012));
        lay.marco = m;
        g.fillStyle(0xffffff, 1);
        g.fillRoundedRect(b.x + m, b.y + m, b.w - 2 * m, b.h - 2 * m, Math.max(8, r - m));
        g.fillStyle(0xfff9ec, 1);
        g.fillRoundedRect(b.x + m + 4, b.y + m + 4, b.w - 2 * m - 8, b.h - 2 * m - 8, Math.max(6, r - m - 4));
        // líneas suaves de cuaderno en el centro, donde pasan los hilos
        var x0 = b.x + lay.padX + lay.cw + lay.rc * 2;
        var x1 = b.x + b.w - lay.padX - lay.cw - lay.rc * 2;
        g.fillStyle(0xd0ebff, 0.6);
        for (var f = 0; f < 5; f++) {
            var y = filaY(f);
            for (var x = x0; x < x1; x += 18) g.fillCircle(x, y, 2);
        }
        // brillo en el marco de arriba
        g.fillStyle(0xffffff, 0.35);
        g.fillRoundedRect(b.x + r, b.y + 3, b.w - 2 * r, Math.max(3, m * 0.35), 3);
    }

    /** Lucecitas en el marco que se encienden por turnos. */
    function dibujarLuces(t) {
        var g = lucesG;
        var b = lay.tab;
        if (!b) return;
        g.clear();
        var n = Math.max(6, Math.round(b.w / 70));
        var colores = [0xffe066, 0xff8fc7, 0x7cf3ff, 0xb197fc];
        var m = lay.marco || 10;
        for (var i = 0; i < n; i++) {
            var x = b.x + b.w * (i + 0.5) / n;
            var on = reducido ? 0.8 : 0.45 + 0.55 * Math.max(0, Math.sin(t / 300 - i * 0.9));
            var on2 = fiesta.on ? 1 : on;
            g.fillStyle(colores[i % colores.length], 0.35 * on2);
            g.fillCircle(x, b.y + m / 2, m * 0.9);
            g.fillCircle(x, b.y + b.h - m / 2, m * 0.9);
            g.fillStyle(colores[i % colores.length], on2);
            g.fillCircle(x, b.y + m / 2, m * 0.38);
            g.fillCircle(x, b.y + b.h - m / 2, m * 0.38);
        }
    }

    // ------------------------------------------------------------------ diseño

    function reacomodar() {
        if (!sc) return;
        var W = sc.scale.width;
        var H = sc.scale.height;
        if (W < 10 || H < 10) return;
        lay.W = W;
        lay.H = H;
        var horizontal = W >= H * 1.15;
        // márgenes iguales: el tablero queda centrado y a los lados se ve el vestidor (Zoe usa el de la izquierda)
        lay.zoeW = Math.round(horizontal ? clamp(W * 0.16, 130, 300) : clamp(W * 0.07, 24, 90));
        var bx = lay.zoeW;
        var bw = W - 2 * lay.zoeW;
        var by = Math.round(H * 0.025) + 8;
        var bh = H - by - Math.round(H * 0.03);
        lay.tab = { x: bx, y: by, w: bw, h: bh };

        lay.pad = Math.round(clamp(bh * 0.045, 14, 30));
        lay.padX = Math.round(clamp(bw * 0.04, 14, 34));
        var filas = 5;
        lay.gap = Math.round(clamp(bh * 0.026, 6, 18));
        var chDisp = (bh - 2 * lay.pad - (filas - 1) * lay.gap) / filas;
        lay.cw = Math.round(clamp((bw - 2 * lay.padX) * 0.35, 120, 320));
        lay.modo = lay.cw < 175 ? "columna" : "fila";
        lay.ch = Math.round(Math.min(chDisp, lay.modo === "fila" ? lay.cw * 0.42 : lay.cw * 0.9, 124));
        lay.desfY = (chDisp - lay.ch) * filas / 2;
        lay.rc = Math.round(clamp(lay.ch * 0.15, 12, 19));
        lay.ancho = Math.round(clamp(lay.ch * 0.09, 7, 12));

        lay.piso = H - Math.max(14, H * 0.035);

        Object.keys(tarjetas).forEach(function (id) {
            var c = tarjetas[id];
            pintarTarjeta(c);
            if (!c.moviendo) ubicarTarjeta(c);
        });
        dibujarTablero();
    }

    /** Phaser guarda la posición del lienzo; se renueva antes de cada toque (misma trampa que los otros juegos). */
    function vigilarPosicion(el) {
        var renovar = function () { if (sc && sc.scale) sc.scale.updateBounds(); };
        ["pointerdown", "mousedown", "touchstart"].forEach(function (ev) {
            el.addEventListener(ev, renovar, { capture: true, passive: true });
        });
        if (typeof ResizeObserver === "function") {
            var ro = new ResizeObserver(renovar);
            ro.observe(document.body);
            var principal = document.getElementById("principal");
            if (principal) ro.observe(principal);
        }
        global.addEventListener("scroll", renovar, { passive: true });
    }

    function aPantalla(x, y) {
        var r = sc.game.canvas.getBoundingClientRect();
        return { x: r.left + x * (r.width / sc.scale.width), y: r.top + y * (r.height / sc.scale.height) };
    }

    function mundoDePantalla(x, y) {
        var r = sc.game.canvas.getBoundingClientRect();
        return { x: (x - r.left) * (sc.scale.width / r.width), y: (y - r.top) * (sc.scale.height / r.height) };
    }

    /** Coordenadas de pantalla del conector de una tarjeta. */
    function puntoDe(id) {
        if (!sc || !tarjetas[id]) return null;
        var k = conectorMundo(id);
        return aPantalla(k.x, k.y);
    }

    /** Hueco a la izquierda del tablero para Zoe (coordenadas de pantalla). */
    function zonaZoe() {
        if (!sc) return null;
        var r = sc.game.canvas.getBoundingClientRect();
        var k = r.width / (lay.W || r.width);
        return { left: r.left, top: r.top, width: lay.zoeW * k, height: r.height, bottom: r.bottom };
    }

    function estrellas(x, y, n, colores, fuerza, textura) {
        if (!sc || reducido) return;
        var e = sc.add.particles(x, y, textura || (n > 14 ? "fx-estrella" : "fx-chispa"), {
            speed: { min: 110 * (fuerza || 1), max: 300 * (fuerza || 1) },
            angle: { min: 0, max: 360 },
            scale: { start: Math.max(0.4, lay.ch / 110), end: 0 },
            lifespan: { min: 450, max: 950 },
            rotate: { min: 0, max: 360 },
            gravityY: 240,
            tint: colores || COLORES_FIESTA,
            blendMode: "ADD",
            emitting: false
        });
        e.setDepth(40);
        e.explode(n || 12);
        sc.time.delayedCall(1300, function () { e.destroy(); });
    }

    // ------------------------------------------------------------------ montaje

    function fuenteLista() {
        if (!document.fonts || !document.fonts.load) return Promise.resolve();
        return Promise.race([
            document.fonts.load('700 24px "Fredoka"').catch(function () {}),
            sleep(1500)
        ]);
    }

    function montar(el, config) {
        if (config) cfg = config;
        if (listoPromesa) return listoPromesa;
        if (!Phaser || !I || !R || !cfg) {
            console.warn("[EscenarioUso] falta Phaser, IconosUso, ReglasUso o config");
            listoPromesa = Promise.resolve(false);
            return listoPromesa;
        }
        listoPromesa = new Promise(function (resolve) {
            juego = new Phaser.Game({
                type: Phaser.AUTO,
                parent: el,
                transparent: true,
                banner: false,
                scale: { mode: Phaser.Scale.RESIZE, width: el.clientWidth || 800, height: el.clientHeight || 600 },
                input: { activePointers: 2 },
                scene: {
                    create: function () {
                        sc = this;
                        texturasFx();
                        var cargas = [fuenteLista()];
                        Object.keys(I.SVG).forEach(function (k) { cargas.push(cargarSvg("ico-" + k, I.SVG[k])); });
                        Promise.all(cargas).then(function () {
                            fondoG = sc.add.graphics();
                            fondoG.setDepth(0);
                            tableroG = sc.add.graphics();
                            tableroG.setDepth(2);
                            lucesG = sc.add.graphics();
                            lucesG.setDepth(3);
                            gLineas = sc.add.graphics();
                            gLineas.setDepth(8);
                            gActiva = sc.add.graphics();
                            gActiva.setDepth(30);
                            R.tarjetas(cfg).forEach(crearTarjeta);
                            reacomodar();
                            sc.scale.on("resize", reacomodar);
                            sc.events.on("update", function (time) { dibujar(time); });
                            vigilarPosicion(el);
                            resolve(true);
                        });
                    }
                }
            });
            global.__escenarioUso = juego;
        });
        return listoPromesa;
    }

    global.EscenarioUso = {
        montar: montar,
        listo: function () { return !!(sc && gLineas); },
        reacomodar: reacomodar,
        escena: function () { return sc; },
        diseno: function () { return lay; },
        tarjetas: function () { return tarjetas; },
        tarjetaEn: tarjetaEn,
        destinoEn: destinoEn,
        iniciarLinea: iniciarLinea,
        moverLinea: moverLinea,
        candidato: candidato,
        retraerLinea: retraerLinea,
        fijarLinea: fijarLinea,
        romperLinea: romperLinea,
        lineaActiva: function () { return activa ? activa.id : null; },
        estadoTarjeta: estadoTarjeta,
        menearTarjeta: menearTarjeta,
        brilloConector: brilloConector,
        mostrarTarjetas: mostrarTarjetas,
        iluminarConectores: iluminarConectores,
        lineaMuestra: lineaMuestra,
        reordenarPartes: reordenarPartes,
        filasIniciales: filasIniciales,
        filasPartes: filasPartes,
        cargarRonda: cargarRonda,
        ocultarTarjetas: ocultarTarjetas,
        limpiarConexiones: limpiarConexiones,
        conexiones: function () { return Object.assign({}, conexiones); },
        celebrar: celebrar,
        estrellas: estrellas,
        puntoDe: puntoDe,
        zonaZoe: zonaZoe,
        conectorMundo: conectorMundo,
        aPantalla: aPantalla,
        mundoDePantalla: mundoDePantalla,
        radioCaptura: radioCaptura,
        dibujar: dibujar
    };
})(window);
