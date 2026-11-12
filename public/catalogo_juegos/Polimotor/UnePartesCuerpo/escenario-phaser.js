/**
 * EscenarioUne — escena Phaser 4 de "Une las Partes del Cuerpo" (window.EscenarioUne).
 *
 * Dibuja en #escenario-phaser: la tarima y el foco de luz, a Zeus armado por partes (personaje.js), las
 * tarjetas ilustradas a los dos lados (iconos.js) y, en cada cuadro, los puntos del cuerpo y los hilos
 * mágicos (líneas) que unen cada tarjeta con su parte.
 *
 * Puntos del cuerpo: cada tarjeta de config.json trae `destino` { contenedor, x, y } en las coordenadas
 * de una parte de Zeus (cabeza, zeus, brazoDer, manoIzq, pieIzq…). Ahí se crea un ancla invisible
 * dentro de ese contenedor; su posición en pantalla se lee en cada cuadro, así los puntos y las líneas
 * siguen a Zeus cuando respira, salta o cambia el tamaño de la pantalla (nunca hay posiciones fijas).
 *
 * El arrastre (pointer) lo maneja conexiones.js; la validación, reglas.js. Esta escena solo dibuja.
 *
 * API:
 *   montar(el, cfg) → Promise          listo(), reacomodar(), escena(), objetos(), diseno()
 *   tarjetaEn(x, y)                     id de la tarjeta bajo un punto del mundo (o su conector)
 *   candidatoEn(x, y)                   id del punto del cuerpo que elegiría el niño al soltar ahí
 *   iniciarLinea(id), moverLinea(x, y), candidato(puntoId|null)
 *   retraerLinea() → Promise            la línea vuelve suave a su tarjeta
 *   fijarLinea(id, puntoId) → Promise   la línea se queda pegada al punto, con destello
 *   estadoTarjeta(id, "normal"|"activa"|"unida"|"bien"|"mal"), menearTarjeta(id), rebotePunto(puntoId)
 *   calificarLinea(id, ok) → Promise   la línea y su tarjeta se pintan de verde (bien) o rojo (mal)
 *   soltarLinea(id) → Promise           una línea calificada en rojo vuelve a su tarjeta para corregirla
 *   brilloPunto(puntoId, on), mostrarTarjetas() → Promise, iluminarPuntos() → Promise
 *   limpiarConexiones(), celebrar(on), estrellas(x, y, n, colores, fuerza)
 *   puntoDe(id) → coords de pantalla (id de tarjeta = su conector; "p-…" = punto del cuerpo)
 *   aPantalla(x, y), mundoDePantalla(x, y)
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser || null;
    var P = global.Personaje;
    var I = global.IconosCuerpo;
    var R = global.ReglasUne;
    var G = P ? P.GEOMETRIA : null;
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);

    var RES = 2;
    var COLORES_FIESTA = [0xffe066, 0xff8fc7, 0x7cf3ff, 0x9df59a, 0xffb36b, 0xc9a7ff];

    var cfg = null;
    var juego = null;
    var sc = null;
    var obj = {};
    var anclas = {};        // puntoId → Zone dentro del contenedor de la parte
    var halos = {};         // puntoId → imagen ADD
    var estPunto = {};      // puntoId → { k (escala), luz (0..1), brillo (bool) }
    var tarjetas = {};      // tarjetaId → contenedor
    var conexiones = {};    // tarjetaId → puntoId (líneas fijas)
    var calif = {};         // tarjetaId → "bien" | "mal" (después de calificar)
    var retiros = [];       // líneas rojas que vuelven a su tarjeta
    var VERDE = 0x2f9e44;
    var ROJO = 0xe03131;
    var activa = null;      // { id, x, y, u, retrayendo }
    var candidatoId = null;
    var fiesta = { on: false, k: 0 };
    var gLineas = null;
    var gPuntos = null;
    var fondoG = null;
    var lay = { W: 0, H: 0, escala: 0.6, cw: 200, ch: 100, modo: "fila", rPunto: 13, ancho: 8, rc: 14 };
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

    function origen(s) { return P.origen(s); }

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
                console.warn("[EscenarioUne] no se pudo dibujar", clave);
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
    }

    function imagenDe(clave, svgTexto, x, y) {
        var o = origen(svgTexto);
        var im = sc.add.image(x || 0, y || 0, clave);
        im.setOrigin(o.x, o.y);
        im.setScale(1 / RES);
        im.escalaBase = 1 / RES;
        return im;
    }

    function parte(clave, x, y) { return imagenDe("zeus-" + clave, P.SVG[clave], x, y); }

    // ------------------------------------------------------------------ Zeus

    function armarZeus() {
        var zeus = sc.add.container(0, 0);
        zeus.setDepth(5);
        obj.zeus = zeus;
        obj.sombra = sc.add.ellipse(0, 4, 400, 50, 0x1c4f8f, 0.16);
        obj.cuerpo = parte("cuerpo");
        zeus.add([obj.sombra, obj.cuerpo]);

        function pie(k) {
            var c = sc.add.container(k * G.talon.x, G.talon.y);
            c.scaleX = k;
            c.add(parte("pie"));
            return c;
        }
        obj.pieIzq = pie(1);
        obj.pieDer = pie(-1);
        zeus.add([obj.pieIzq, obj.pieDer]);

        function brazo(lado) {
            var k = lado === "izq" ? 1 : -1;
            var b = sc.add.container(k * G.hombro.x, G.hombro.y);
            var sup = parte("brazo");
            var codo = sc.add.container(G.codo.x, G.codo.y);
            var ante = parte("antebrazo");
            var manoSprite = parte("mano");
            var mano = sc.add.container(G.mano.x, G.mano.y);
            mano.add(manoSprite);
            if (k < 0) {
                sup.setFlipX(true);
                ante.setFlipX(true);
                manoSprite.setFlipX(true);
            }
            codo.add([ante, mano]);
            b.add([sup, codo]);
            b.lado = lado;
            b.k = k;
            b.reposo = -k * G.brazoReposo;
            b.rotation = b.reposo;
            b.codo = codo;
            b.mano = mano;
            return b;
        }
        obj.brazoIzq = brazo("izq");
        obj.brazoDer = brazo("der");
        zeus.add([obj.brazoDer, obj.brazoIzq]);

        var cab = sc.add.container(G.cabeza.x, G.cabeza.y);
        cab.setScale(G.escalaCabeza || 1);
        obj.cabeza = cab;
        obj.cara = parte("cara");
        obj.pelo = parte("pelo");
        obj.ojoIzq = parte("ojo", G.ojo.x, G.ojo.y);
        obj.ojoDer = parte("ojo", -G.ojo.x, G.ojo.y);
        obj.ojoDer.setFlipX(true);
        obj.cejaIzq = parte("ceja", G.ceja.x, G.ceja.y);
        obj.cejaDer = parte("ceja", -G.ceja.x, G.ceja.y);
        obj.cejaDer.setFlipX(true);
        obj.nariz = parte("nariz", G.nariz.x, G.nariz.y);
        obj.boca = parte("boca_sonrisa", G.boca.x, G.boca.y);
        // Como en el dibujo de Zeus: el pelo (flequillo) va encima de los ojos y las cejas.
        cab.add([obj.cara, obj.nariz, obj.boca, obj.ojoIzq, obj.ojoDer, obj.cejaIzq, obj.cejaDer, obj.pelo]);
        zeus.add(cab);
    }

    function contenedorDe(nombre) {
        switch (nombre) {
            case "cabeza": return obj.cabeza;
            case "brazoIzq": return obj.brazoIzq;
            case "brazoDer": return obj.brazoDer;
            case "manoIzq": return obj.brazoIzq && obj.brazoIzq.mano;
            case "manoDer": return obj.brazoDer && obj.brazoDer.mano;
            case "pieIzq": return obj.pieIzq;
            case "pieDer": return obj.pieDer;
            default: return obj.zeus;
        }
    }

    /** Un ancla invisible por punto, dentro del contenedor de su parte: sigue a Zeus en todo momento. */
    function crearAnclas() {
        R.tarjetas(cfg).forEach(function (t) {
            var d = t.destino || {};
            var c = contenedorDe(d.contenedor) || obj.zeus;
            var z = sc.add.zone(d.x || 0, d.y || 0, 2, 2);
            z.puntoId = t.punto;
            c.add(z);
            anclas[t.punto] = z;
            estPunto[t.punto] = { k: 1, luz: 0, brillo: false, color: colorNum(t.color) };
            var h = sc.add.image(0, 0, "fx-halo");
            h.setBlendMode(Phaser.BlendModes.ADD);
            h.setDepth(21);
            h.setAlpha(0);
            halos[t.punto] = h;
        });
    }

    function mundoDe(objeto, x, y) {
        var m = objeto.getWorldTransformMatrix();
        var p = m.transformPoint(x || 0, y || 0);
        return { x: p.x, y: p.y };
    }

    function puntoMundo(puntoId) {
        var a = anclas[puntoId];
        return a ? mundoDe(a) : null;
    }

    function radioCaptura() {
        var k = Number(cfg.juego && cfg.juego.radioCaptura) || 2.6;
        return Math.max(34, lay.rPunto * k);
    }

    /**
     * Punto que elegiría el niño al soltar en (x, y): el más cercano de TODOS (también los ocupados).
     * Si el más cercano ya tiene su línea, reglas.js responde "ocupado"; nunca se salta al vecino libre.
     */
    function candidatoEn(x, y) {
        var todos = Object.keys(anclas).map(function (id) {
            var p = puntoMundo(id);
            return { id: id, x: p.x, y: p.y };
        });
        var c = R.puntoCercano(todos, x, y, radioCaptura());
        return c ? c.id : null;
    }

    // ------------------------------------------------------------------ tarjetas

    function defTarjeta(id) { return R.tarjeta(cfg, id); }

    function crearTarjeta(t) {
        var c = sc.add.container(0, 0);
        c.setDepth(25);
        c.tid = t.id;
        c.def = t;
        c.lado = (t.tarjeta && t.tarjeta.lado) === "der" ? "der" : "izq";
        c.fila = (t.tarjeta && t.tarjeta.fila) || 0;
        c.colorN = colorNum(t.color);
        c.estado = "normal";
        c.glow = sc.add.image(0, 0, "fx-halo");
        c.glow.setTint(c.colorN);
        c.glow.setAlpha(0);
        c.fondo = sc.add.graphics();
        c.icono = sc.add.image(0, 0, "ico-" + t.icono);
        c.texto = sc.add.text(0, 0, String(t.nombre || t.id).toUpperCase(), {
            fontFamily: "Fredoka, sans-serif",
            fontStyle: "700",
            fontSize: "22px",
            color: "#2b2350",
            align: "center"
        });
        c.texto.setOrigin(0.5, 0.5);
        if (c.texto.setResolution) c.texto.setResolution(2);
        c.conector = sc.add.container(0, 0);
        c.conectorG = sc.add.graphics();
        c.conector.add(c.conectorG);
        c.marca = sc.add.graphics();
        c.add([c.glow, c.fondo, c.icono, c.texto, c.conector, c.marca]);
        c.setAlpha(0);
        tarjetas[t.id] = c;
        return c;
    }

    function pintarTarjeta(c) {
        var w = lay.cw;
        var h = lay.ch;
        var hecha = c.estado === "unida" || c.estado === "bien" || c.estado === "mal";
        var colBorde = c.estado === "bien" ? VERDE : (c.estado === "mal" ? ROJO : c.colorN);
        var activaT = c.estado === "activa";
        var r = Math.min(22, h * 0.2);
        var f = c.fondo;
        f.clear();
        // sombra
        f.fillStyle(0x1c3f6e, 0.16);
        f.fillRoundedRect(-w / 2 + 2, -h / 2 + 6, w, h, r);
        // tarjeta
        f.fillStyle(0xffffff, 1);
        f.fillRoundedRect(-w / 2, -h / 2, w, h, r);
        if (hecha) {
            f.fillStyle(colBorde, c.estado === "unida" ? 0.14 : 0.2);
            f.fillRoundedRect(-w / 2, -h / 2, w, h, r);
        }
        // banda de color del lado de afuera (donde va el dibujo)
        var fila = lay.modo === "fila";
        var rcx = lay.rc + 8; // espacio que ocupa el conector dentro de la tarjeta
        var is, ix, iy, tx, ty, tw2;
        if (fila) {
            // dibujo del lado de afuera; el nombre entre el dibujo y el conector
            var area = Math.min(h * 0.92, w * 0.4);
            is = area * 0.86;
            var izqT, derT;
            if (c.lado === "izq") {
                ix = -w / 2 + area / 2 + 4;
                izqT = -w / 2 + area + 4;
                derT = w / 2 - rcx;
            } else {
                ix = w / 2 - area / 2 - 4;
                izqT = -w / 2 + rcx;
                derT = w / 2 - area - 4;
            }
            iy = 0;
            tx = (izqT + derT) / 2;
            ty = 0;
            tw2 = derT - izqT;
        } else {
            // tableta vertical: dibujo arriba y nombre abajo
            is = Math.min(h * 0.6, w * 0.7);
            ix = 0;
            iy = -h / 2 + is / 2 + h * 0.07;
            tx = 0;
            ty = h / 2 - h * 0.17;
            tw2 = w - 2 * rcx;
        }
        f.fillStyle(c.colorN, hecha ? 0.28 : 0.16);
        f.fillCircle(ix, iy, is * 0.56);
        f.lineStyle(activaT || c.estado === "bien" || c.estado === "mal" ? 7 : 5, colBorde, 1);
        f.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
        if (activaT) {
            f.lineStyle(3, 0xffffff, 0.9);
            f.strokeRoundedRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10, Math.max(4, r - 5));
        }

        c.icono.setPosition(ix, iy);
        var base = c.icono.width || 240;
        c.icono.setScale(is / base);
        c.icono.setAlpha(1);

        // Fredoka en mayúsculas: ~0,7 em por letra; las palabras largas tienen 6 letras (CABEZA, OREJAS…)
        var fs = fila ? Math.min(h * 0.26, tw2 / 4.4) : Math.min(h * 0.19, tw2 / 4.4);
        fs = Math.max(15, Math.round(fs));
        c.texto.setFontSize(fs);
        c.texto.setColor(hecha ? "#1f3d2b" : "#2b2350");
        c.texto.setPosition(tx, ty);

        // conector: en el borde que mira a Zeus
        var cx = c.lado === "izq" ? w / 2 : -w / 2;
        c.conector.setPosition(cx, fila ? 0 : -h * 0.08);
        var g = c.conectorG;
        var rc = lay.rc;
        g.clear();
        g.fillStyle(0xffffff, 1);
        g.fillCircle(0, 0, rc + 4);
        g.fillStyle(colBorde, 1);
        g.fillCircle(0, 0, rc);
        g.fillStyle(0xffffff, hecha ? 1 : 0.9);
        g.fillCircle(0, 0, rc * 0.38);
        g.lineStyle(3, 0x1c3f6e, 0.25);
        g.strokeCircle(0, 0, rc + 4);

        // marca de completado (esquina de afuera, arriba)
        var m = c.marca;
        m.clear();
        // marca de la calificación: ✓ verde o ✗ roja (al unir no hay marca: no se adelanta si está bien)
        if (c.estado === "bien" || c.estado === "mal") {
            var mx = c.lado === "izq" ? -w / 2 + 6 : w / 2 - 6;
            var my = -h / 2 + 6;
            var mr = Math.max(14, h * 0.16);
            m.fillStyle(0xffffff, 1);
            m.fillCircle(mx, my, mr + 3);
            m.fillStyle(colBorde, 1);
            m.fillCircle(mx, my, mr);
            m.lineStyle(Math.max(3, mr * 0.28), 0xffffff, 1);
            m.beginPath();
            if (c.estado === "bien") {
                m.moveTo(mx - mr * 0.45, my + mr * 0.02);
                m.lineTo(mx - mr * 0.1, my + mr * 0.38);
                m.lineTo(mx + mr * 0.48, my - mr * 0.32);
            } else {
                m.moveTo(mx - mr * 0.38, my - mr * 0.38);
                m.lineTo(mx + mr * 0.38, my + mr * 0.38);
                m.moveTo(mx + mr * 0.38, my - mr * 0.38);
                m.lineTo(mx - mr * 0.38, my + mr * 0.38);
            }
            m.strokePath();
        }

        c.glow.setScale((w * 1.5) / 128, (h * 1.9) / 128);
        c.ancho = w;
        c.alto = h;
    }

    function ubicarTarjeta(c) {
        var filas = filasPorLado(c.lado);
        var total = filas * lay.ch + (filas - 1) * lay.gap;
        var y0 = (lay.H - total) / 2 + lay.ch / 2;
        c.baseX = c.lado === "izq" ? lay.m + lay.cw / 2 : lay.W - lay.m - lay.cw / 2;
        c.baseY = y0 + c.fila * (lay.ch + lay.gap);
        if (!c.entrando) c.setPosition(c.baseX, c.baseY);
    }

    function filasPorLado(lado) {
        var n = 0;
        Object.keys(tarjetas).forEach(function (id) {
            var c = tarjetas[id];
            if (c.lado === lado) n = Math.max(n, c.fila + 1);
        });
        return Math.max(1, n);
    }

    function conectorMundo(id) {
        var c = tarjetas[id];
        if (!c) return null;
        return mundoDe(c.conector);
    }

    function tarjetaEn(x, y) {
        var encontrada = null;
        Object.keys(tarjetas).forEach(function (id) {
            var c = tarjetas[id];
            if (!c.visible || c.alpha < 0.5) return;
            var dentro = Math.abs(x - c.x) <= c.ancho / 2 * c.scaleX + 4 && Math.abs(y - c.y) <= c.alto / 2 * c.scaleY + 4;
            var k = conectorMundo(id);
            var enConector = k && Math.hypot(x - k.x, y - k.y) <= lay.rc * 2.2;
            if (dentro || enConector) encontrada = id;
        });
        return encontrada;
    }

    function estadoTarjeta(id, estado) {
        var c = tarjetas[id];
        if (!c) return;
        c.estado = estado || "normal";
        pintarTarjeta(c);
        sc.tweens.killTweensOf([c, c.conector, c.glow]);
        var s = c.estado === "activa" ? 1.06 : 1;
        c.setScale(s);
        c.conector.setScale(c.estado === "activa" ? 1.3 : 1);
        c.glow.setAlpha(c.estado === "activa" ? 0.55 : 0);
        if (c.estado === "unida" || c.estado === "bien" || c.estado === "mal") {
            c.setScale(c.estado === "unida" ? 1.06 : 1.12);
            tw({ targets: c, scale: 1, duration: 360, ease: "Back.easeOut" });
        }
    }

    function menearTarjeta(id) {
        var c = tarjetas[id];
        if (!c || reducido) return Promise.resolve();
        c.glow.setAlpha(0.6);
        return tw({ targets: c, angle: 4, duration: 110, yoyo: true, repeat: 3, ease: "Sine.easeInOut",
            onComplete: function () { c.angle = 0; c.glow.setAlpha(c.estado === "activa" ? 0.55 : 0); } });
    }

    async function mostrarTarjetas() {
        var ids = R.tarjetas(cfg).map(function (t) { return t.id; });
        // por filas, alternando lados: arriba izquierda, arriba derecha…
        ids.sort(function (a, b) {
            var ca = tarjetas[a], cb = tarjetas[b];
            return (ca.fila - cb.fila) || (ca.lado === "izq" ? -1 : 1);
        });
        var vuelos = ids.map(function (id, i) {
            var c = tarjetas[id];
            ubicarTarjeta(c);
            c.entrando = true;
            c.setAlpha(0);
            c.setScale(0.7);
            c.setPosition(c.baseX + (c.lado === "izq" ? -1 : 1) * lay.cw * 0.6, c.baseY);
            return sleep(i * 140).then(function () {
                sonarSiHay("aparece", i % 3 === 0);
                return tw({ targets: c, x: c.baseX, alpha: 1, scale: 1, duration: 480, ease: "Back.easeOut" });
            }).then(function () {
                c.entrando = false;
                c.setPosition(c.baseX, c.baseY);
                c.setAlpha(1);
                c.setScale(1);
            });
        });
        await Promise.all(vuelos);
    }

    function sonarSiHay(nombre, si) {
        if (si && typeof global.sonarEvento === "function") global.sonarEvento(nombre);
    }

    // ------------------------------------------------------------------ líneas

    function iniciarLinea(id, x, y) {
        var k = conectorMundo(id);
        activa = { id: id, x: x != null ? x : k.x, y: y != null ? y : k.y, u: 1, retrayendo: false };
    }

    function moverLinea(x, y) {
        if (!activa || activa.retrayendo) return;
        activa.x = x;
        activa.y = y;
    }

    /** El punto que elegiría el niño crece un poco (se suaviza en dibujar(): sin tweens que compitan). */
    function candidato(puntoId) {
        candidatoId = puntoId || null;
    }

    /** La línea vuelve suave a su tarjeta y desaparece. */
    function retraerLinea() {
        candidato(null);
        if (!activa) return Promise.resolve();
        var a = activa;
        a.retrayendo = true;
        a.x0 = a.x;
        a.y0 = a.y;
        return tw({ targets: a, u: 0, duration: 380, ease: "Cubic.easeIn" }).then(function () {
            if (activa === a) activa = null;
            if (tarjetas[a.id] && tarjetas[a.id].estado === "activa") estadoTarjeta(a.id, "normal");
        });
    }

    /** La línea se pega al punto: viaja el último tramo, destello, brillo del punto y la tarjeta queda completada. */
    async function fijarLinea(id, puntoId) {
        candidato(null);
        var p = puntoMundo(puntoId);
        if (!activa || activa.id !== id) iniciarLinea(id, p.x, p.y);
        var a = activa;
        a.retrayendo = true;
        await tw({ targets: a, x: p.x, y: p.y, duration: 130, ease: "Quad.easeOut" });
        conexiones[id] = puntoId;
        if (activa === a) activa = null;
        estadoTarjeta(id, "unida");
        destello(puntoId);
    }

    function colorLinea(id) {
        if (calif[id] === "bien") return VERDE;
        if (calif[id] === "mal") return ROJO;
        return tarjetas[id] ? tarjetas[id].colorN : 0x7950f2;
    }

    /** Calificación de una línea: se pinta de verde o rojo, con destello verde o temblor del punto. */
    function calificarLinea(id, ok) {
        var puntoId = conexiones[id];
        if (!puntoId) return Promise.resolve();
        calif[id] = ok ? "bien" : "mal";
        estadoTarjeta(id, ok ? "bien" : "mal");
        var e = estPunto[puntoId];
        var p = puntoMundo(puntoId);
        if (!e || !p) return sleep(300);
        e.luz = 1;
        tw({ targets: e, luz: ok ? 0.45 : 0.25, duration: 900, ease: "Sine.easeOut" });
        var aro = sc.add.circle(p.x, p.y, lay.rPunto * 1.2);
        aro.setStrokeStyle(6, ok ? VERDE : ROJO, 1);
        aro.setDepth(30);
        tw({ targets: aro, scale: 3, alpha: 0, duration: 600, ease: "Cubic.easeOut", onComplete: function () { aro.destroy(); } });
        if (ok) {
            estrellas(p.x, p.y, 12, [VERDE, 0xb2f2bb, 0xffffff], 0.6);
            e.k = 1.7;
            return tw({ targets: e, k: 1, duration: 420, ease: "Back.easeOut" });
        }
        var c = tarjetas[id];
        if (c && !reducido) tw({ targets: c, x: c.baseX + 8, duration: 60, yoyo: true, repeat: 3, onComplete: function () { c.x = c.baseX; } });
        return rebotePunto(puntoId);
    }

    /** Una línea roja vuelve a su tarjeta: el punto queda libre y la tarjeta disponible otra vez. */
    function soltarLinea(id) {
        var puntoId = conexiones[id];
        if (!puntoId) return Promise.resolve();
        var p = puntoMundo(puntoId);
        delete conexiones[id];
        delete calif[id];
        var r = { id: id, x0: p.x, y0: p.y, u: 1 };
        retiros.push(r);
        if (estPunto[puntoId]) estPunto[puntoId].luz = 0;
        return tw({ targets: r, u: 0, duration: 480, ease: "Cubic.easeIn" }).then(function () {
            retiros = retiros.filter(function (x) { return x !== r; });
            estadoTarjeta(id, "normal");
        });
    }

    function destello(puntoId) {
        var e = estPunto[puntoId];
        var p = puntoMundo(puntoId);
        if (!e || !p) return;
        e.luz = 1;
        tw({ targets: e, luz: 0.35, duration: 1200, ease: "Sine.easeOut" });
        e.k = 1.9;
        tw({ targets: e, k: 1, duration: 520, ease: "Back.easeOut" });
        estrellas(p.x, p.y, 16, [e.color, 0xffffff, 0xffe066], 0.7);
        // aro que se expande
        var aro = sc.add.circle(p.x, p.y, lay.rPunto * 1.2);
        aro.setStrokeStyle(5, e.color, 1);
        aro.setDepth(30);
        tw({ targets: aro, scale: 3.2, alpha: 0, duration: 650, ease: "Cubic.easeOut", onComplete: function () { aro.destroy(); } });
    }

    function rebotePunto(puntoId) {
        var e = estPunto[puntoId];
        if (!e) return Promise.resolve();
        sc.tweens.killTweensOf(e);
        e.k = 1;
        return tw({ targets: e, k: 1.45, duration: 120, yoyo: true, repeat: 1, ease: "Quad.easeOut", onComplete: function () { e.k = 1; } });
    }

    function brilloPunto(puntoId, on) {
        var e = estPunto[puntoId];
        if (e) e.brillo = !!on;
    }

    async function iluminarPuntos() {
        var ids = Object.keys(anclas);
        await Promise.all(ids.map(function (id, i) {
            return sleep(i * 70).then(function () {
                var e = estPunto[id];
                e.luz = 1;
                e.k = 1.5;
                return Promise.all([
                    tw({ targets: e, k: 1, duration: 420, ease: "Back.easeOut" }),
                    tw({ targets: e, luz: 0, duration: 900, delay: 300, ease: "Sine.easeIn" })
                ]);
            });
        }));
    }

    function limpiarConexiones() {
        Object.keys(conexiones).forEach(function (id) {
            delete conexiones[id];
            estadoTarjeta(id, "normal");
        });
        calif = {};
        retiros = [];
        Object.keys(estPunto).forEach(function (id) {
            estPunto[id].luz = 0;
            estPunto[id].k = 1;
            estPunto[id].brillo = false;
        });
        activa = null;
        candidato(null);
    }

    function celebrar(on) {
        fiesta.on = !!on;
        sc.tweens.killTweensOf(fiesta);
        if (on) {
            fiesta.k = 0;
            tw({ targets: fiesta, k: 1, duration: 500 });
            Object.keys(anclas).forEach(function (id, i) {
                setTimeout(function () {
                    var p = puntoMundo(id);
                    if (p) estrellas(p.x, p.y, 10, [estPunto[id].color, 0xffffff, 0xffe066], 0.6);
                    estPunto[id].luz = 1;
                }, i * 90);
            });
        } else {
            fiesta.k = 0;
        }
    }

    // ------------------------------------------------------------------ dibujo de cada cuadro

    var PUNTOS_CURVA = 20;
    var curva = [];
    for (var ci = 0; ci <= PUNTOS_CURVA; ci++) curva.push({ x: 0, y: 0 });

    /** Hilo mágico: curva suave con caída, brillo alrededor, extremos redondeados y una chispa que viaja. */
    function hilo(g, a, b, color, ancho, t, fase, brillo) {
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) return;
        var mx = (a.x + b.x) / 2;
        var my = (a.y + b.y) / 2 + Math.min(lay.H * 0.05, len * 0.1);
        for (var i = 0; i <= PUNTOS_CURVA; i++) {
            var u = i / PUNTOS_CURVA;
            var v = 1 - u;
            curva[i].x = v * v * a.x + 2 * v * u * mx + u * u * b.x;
            curva[i].y = v * v * a.y + 2 * v * u * my + u * u * b.y;
        }
        var b2 = brillo || 0;
        g.lineStyle(ancho * (2.6 + b2 * 1.4), color, 0.16 + b2 * 0.22);
        g.strokePoints(curva, false, false);
        g.lineStyle(ancho, color, 1);
        g.strokePoints(curva, false, false);
        g.lineStyle(Math.max(2, ancho * 0.28), 0xffffff, 0.55 + b2 * 0.3);
        g.strokePoints(curva, false, false);
        g.fillStyle(color, 1);
        g.fillCircle(a.x, a.y, ancho / 2);
        g.fillCircle(b.x, b.y, ancho / 2);
        if (t != null && !reducido) {
            var k = ((t / 1700) + (fase || 0)) % 1;
            var j = Math.min(PUNTOS_CURVA, Math.floor(k * PUNTOS_CURVA));
            g.fillStyle(0xffffff, 0.95);
            g.fillCircle(curva[j].x, curva[j].y, ancho * (0.42 + b2 * 0.3));
        }
    }

    function dibujar(time) {
        if (!gLineas || !gPuntos) return;
        var t = time || 0;
        gLineas.clear();
        gPuntos.clear();
        var ancho = lay.ancho;
        var b = fiesta.on ? fiesta.k * (0.6 + 0.4 * Math.sin(t / 180)) : 0;

        Object.keys(conexiones).forEach(function (id, i) {
            var c = tarjetas[id];
            var a = conectorMundo(id);
            var p = puntoMundo(conexiones[id]);
            if (c && a && p) hilo(gLineas, a, p, colorLinea(id), ancho, t, i * 0.13, b);
        });

        retiros.forEach(function (r) {
            var a1 = conectorMundo(r.id);
            if (!a1 || r.u <= 0.01) return;
            hilo(gLineas, a1, { x: a1.x + (r.x0 - a1.x) * r.u, y: a1.y + (r.y0 - a1.y) * r.u }, ROJO, ancho, null, 0, 0);
        });

        if (activa && tarjetas[activa.id]) {
            var c0 = tarjetas[activa.id];
            var a0 = conectorMundo(activa.id);
            var fin = activa;
            if (activa.retrayendo && activa.x0 != null && activa.u < 1) {
                fin = { x: a0.x + (activa.x0 - a0.x) * activa.u, y: a0.y + (activa.y0 - a0.y) * activa.u };
            }
            hilo(gLineas, a0, fin, c0.colorN, ancho * 1.1, null, 0, 0.35);
            gLineas.fillStyle(0xffffff, 1);
            gLineas.fillCircle(fin.x, fin.y, ancho * 0.9);
            gLineas.fillStyle(c0.colorN, 1);
            gLineas.fillCircle(fin.x, fin.y, ancho * 0.6);
        }

        var ocupados = {};
        Object.keys(conexiones).forEach(function (id) { ocupados[conexiones[id]] = id; });
        var pulso = reducido ? 0 : Math.sin(t / 360);
        Object.keys(anclas).forEach(function (pid) {
            var p = puntoMundo(pid);
            var e = estPunto[pid];
            var meta = pid === candidatoId ? 1.4 : 1;
            e.kc = e.kc == null ? 1 : e.kc + (meta - e.kc) * 0.35;
            if (Math.abs(meta - e.kc) < 0.01) e.kc = meta;
            var r = lay.rPunto * e.k * e.kc;
            var dueno = ocupados[pid];
            var h = halos[pid];
            var luz = Math.max(e.luz, e.brillo ? 0.55 + 0.35 * Math.sin(t / 220) : 0, dueno ? 0.3 + b * 0.6 : 0);
            h.setPosition(p.x, p.y);
            h.setTint(dueno ? colorLinea(dueno) : (e.brillo ? 0xffd43b : 0xffffff));
            h.setAlpha(luz);
            h.setScale((r * 5.2) / 128);
            if (dueno) {
                var col = colorLinea(dueno);
                gPuntos.fillStyle(0xffffff, 1);
                gPuntos.fillCircle(p.x, p.y, r + 3);
                gPuntos.fillStyle(col, 1);
                gPuntos.fillCircle(p.x, p.y, r);
                gPuntos.fillStyle(0xffffff, 0.95);
                gPuntos.fillCircle(p.x, p.y, r * 0.36);
            } else {
                var esCand = pid === candidatoId;
                var colActivo = esCand && activa && tarjetas[activa.id] ? tarjetas[activa.id].colorN : 0x3b4cca;
                gPuntos.lineStyle(3, esCand ? colActivo : 0xffffff, 0.75);
                gPuntos.strokeCircle(p.x, p.y, r * (1.32 + 0.12 * pulso));
                gPuntos.fillStyle(0xffffff, 0.96);
                gPuntos.fillCircle(p.x, p.y, r);
                gPuntos.lineStyle(Math.max(3, r * 0.26), colActivo, 1);
                gPuntos.strokeCircle(p.x, p.y, r);
                gPuntos.fillStyle(colActivo, 1);
                gPuntos.fillCircle(p.x, p.y, r * 0.34);
            }
        });
    }

    // ------------------------------------------------------------------ fondo de la escena (foco y tarima)

    function dibujarFondo() {
        var g = fondoG;
        g.clear();
        var cx = lay.W / 2;
        var piso = lay.piso;
        var alto = G.alto * lay.escala;
        // foco de luz detrás de Zeus
        for (var i = 6; i >= 1; i--) {
            g.fillStyle(0xffffff, 0.07);
            g.fillCircle(cx, piso - alto * 0.52, alto * (0.26 + i * 0.05));
        }
        // tarima redonda
        var tw2 = G.ancho * lay.escala * 1.25;
        g.fillStyle(0x5aa9e6, 0.35);
        g.fillEllipse(cx, piso + 10, tw2, tw2 * 0.2);
        g.fillStyle(0xd7ecff, 1);
        g.fillEllipse(cx, piso + 2, tw2 * 0.94, tw2 * 0.17);
        g.lineStyle(4, 0xffffff, 0.9);
        g.strokeEllipse(cx, piso + 2, tw2 * 0.94, tw2 * 0.17);
    }

    // ------------------------------------------------------------------ diseño

    function reacomodar() {
        if (!sc || !obj.zeus) return;
        var W = sc.scale.width;
        var H = sc.scale.height;
        if (W < 10 || H < 10) return;
        lay.W = W;
        lay.H = H;
        lay.m = Math.max(8, Math.round(W * 0.012));
        lay.cw = Math.round(clamp(W * 0.2, 140, 270));
        lay.modo = lay.cw < 186 ? "columna" : "fila";
        var filas = Math.max(filasPorLado("izq"), filasPorLado("der"));
        lay.gap = Math.max(8, Math.round(H * 0.022));
        var disponible = (H - 2 * lay.m - (filas - 1) * lay.gap) / filas;
        lay.ch = Math.round(Math.min(disponible, lay.cw * (lay.modo === "fila" ? 0.52 : 0.86)));
        lay.rc = Math.round(clamp(lay.ch * 0.14, 12, 19));

        var anchoZeus = W - 2 * (lay.m + lay.cw + lay.rc + Math.max(18, W * 0.035));
        var escala = Math.min((H * 0.93) / G.alto, anchoZeus / G.ancho);
        escala = Math.max(escala, 0.25);
        lay.escala = escala;
        lay.piso = H / 2 + (G.alto * escala) / 2 + Math.min(10, H * 0.015);
        lay.rPunto = Math.round(clamp(22 * escala, 11, 20));
        lay.ancho = Math.round(clamp(6 + escala * 5, 7, 12));

        obj.zeus.baseEscala = escala;
        obj.zeus.baseX = W / 2;
        obj.zeus.baseY = lay.piso;
        obj.zeus.setScale(escala);
        obj.zeus.setPosition(W / 2, lay.piso);
        dibujarFondo();

        Object.keys(tarjetas).forEach(function (id) {
            var c = tarjetas[id];
            pintarTarjeta(c);
            ubicarTarjeta(c);
        });
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

    /** Coordenadas de pantalla: id de tarjeta → su conector; id de punto ("p-nariz") → el punto en Zeus. */
    function puntoDe(id) {
        if (!sc) return null;
        if (anclas[id]) {
            var p = puntoMundo(id);
            return aPantalla(p.x, p.y);
        }
        if (tarjetas[id]) {
            var k = conectorMundo(id);
            return aPantalla(k.x, k.y);
        }
        return null;
    }

    function estrellas(x, y, n, colores, fuerza) {
        if (!sc || reducido) return;
        var e = sc.add.particles(x, y, n > 14 ? "fx-estrella" : "fx-chispa", {
            speed: { min: 110 * (fuerza || 1), max: 300 * (fuerza || 1) },
            angle: { min: 0, max: 360 },
            scale: { start: Math.max(0.4, lay.escala * 1.1), end: 0 },
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
        if (!Phaser || !P || !I || !R || !cfg) {
            console.warn("[EscenarioUne] falta Phaser, Personaje, IconosCuerpo, ReglasUne o config");
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
                        Object.keys(P.SVG).forEach(function (k) { cargas.push(cargarSvg("zeus-" + k, P.SVG[k])); });
                        Object.keys(I.SVG).forEach(function (k) {
                            // los íconos se rasterizan a 240 px (RES 2) para que se vean nítidos en tarjetas grandes
                            cargas.push(cargarSvg("ico-" + k, I.SVG[k]));
                        });
                        Promise.all(cargas).then(function () {
                            fondoG = sc.add.graphics();
                            fondoG.setDepth(0);
                            armarZeus();
                            crearAnclas();
                            gLineas = sc.add.graphics();
                            gLineas.setDepth(20);
                            gPuntos = sc.add.graphics();
                            gPuntos.setDepth(22);
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
            global.__escenarioUne = juego;
        });
        return listoPromesa;
    }

    global.EscenarioUne = {
        montar: montar,
        listo: function () { return !!(sc && obj.zeus); },
        reacomodar: reacomodar,
        escena: function () { return sc; },
        objetos: function () { return obj; },
        diseno: function () { return lay; },
        tarjetaEn: tarjetaEn,
        candidatoEn: candidatoEn,
        iniciarLinea: iniciarLinea,
        moverLinea: moverLinea,
        candidato: candidato,
        retraerLinea: retraerLinea,
        fijarLinea: fijarLinea,
        lineaActiva: function () { return activa ? activa.id : null; },
        estadoTarjeta: estadoTarjeta,
        menearTarjeta: menearTarjeta,
        rebotePunto: rebotePunto,
        brilloPunto: brilloPunto,
        destello: destello,
        mostrarTarjetas: mostrarTarjetas,
        iluminarPuntos: iluminarPuntos,
        limpiarConexiones: limpiarConexiones,
        calificarLinea: calificarLinea,
        soltarLinea: soltarLinea,
        conexiones: function () { return Object.assign({}, conexiones); },
        celebrar: celebrar,
        estrellas: estrellas,
        puntoDe: puntoDe,
        puntoMundo: puntoMundo,
        conectorMundo: conectorMundo,
        aPantalla: aPantalla,
        mundoDePantalla: mundoDePantalla,
        radioCaptura: radioCaptura,
        dibujar: dibujar
    };
})(window);
