/**
 * EscenarioPhaser — escena Phaser 4 del vestidor de "¿Dónde se pone?" (window.EscenarioPhaser).
 *
 * Dibuja en #escenario-phaser: la tarima, el baúl mágico (con tapa que se abre), a Zeus armado por partes
 * (personaje.js) y los accesorios flotantes (accesorios.js). Las zonas de destino (cabeza, ojos, cuello, pies)
 * son Phaser.GameObjects.Zone dentro del contenedor de su parte (personaje.js → GEOMETRIA.zonas), así siguen
 * a Zeus aunque se mueva o cambie la pantalla. El arrastre lo maneja arrastre.js con los objetos de items().
 *
 * API:
 *   montar(el, cfg)            → Promise   cfg = config.json (accesorios, lugares, juego.tolerancia)
 *   listo()                     true cuando hay texturas y escena
 *   escena(), objetos()         la Phaser.Scene y los contenedores de Zeus (para animaciones.js)
 *   items(), item(id)           accesorios en la bandeja (contenedores arrastrables)
 *   llenarBandeja(lugares, op)  saca del baúl los accesorios no puestos y los lleva a su lugar (Promise)
 *   volverALugar(id, rebote)    el accesorio regresa a su lugar flotando (Promise)
 *   zonaBajo(x, y)              { id, candidatos } zona de destino bajo un punto del mundo
 *   encajar(id)                 el accesorio vuela a su parte del cuerpo y se ajusta (Promise)
 *   quitarPuestos()             Zeus se quita lo puesto: vuelve al baúl (Promise)
 *   colocados(), piezas(id)     ids de los accesorios puestos; imágenes encajadas de uno
 *   destinos(on, sobre)         anillos suaves en las zonas libres mientras se arrastra; `sobre` resalta una
 *   brillo(zona, opts)          halo dorado (microayuda) sobre una zona; opts.on=false lo quita
 *   guiar(id)                   partículas del accesorio hacia su zona y meneíto (microayuda)
 *   estrellas(x, y, n, col, f)  estallido de estrellas en coords del mundo
 *   baul(estado)                "cerrado" | "entreabierto" | "abierto"
 *   puntoDe(zonaOId), aPantalla(x, y), mundoDePantalla(x, y)
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser || null;
    var P = global.Personaje;
    var A = global.Accesorios;
    var G = P ? P.GEOMETRIA : null;
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);

    var RES = 2; // resolución de las texturas SVG respecto a las unidades de diseño
    var COLORES = [0xffe066, 0xff8fc7, 0x7cf3ff, 0x9df59a, 0xffb36b, 0xc9a7ff];

    var cfg = null;
    var juego = null;
    var sc = null;
    var obj = {};
    var zonas = {};
    var halos = {};
    var anillos = {};
    var itemsMap = {};
    var puestos = {};       // id → [imágenes encajadas]
    var lugaresActuales = {};
    var tarima = null;
    var baulObj = null;
    var lay = { W: 0, H: 0, tam: 100, escala: 1, cx: 0, piso: 0 };
    var listoPromesa = null;

    function sleep(ms) {
        return new Promise(function (r) { setTimeout(r, reducido ? Math.min(ms, 80) : ms); });
    }

    var CLAVES_TWEEN = ["targets", "duration", "delay", "ease", "yoyo", "repeat", "repeatDelay", "hold", "onComplete", "onUpdate", "onStart"];

    /** Valores finales de un tween (para fijarlos si Phaser no avanzó: pestaña oculta). */
    function aplicarFinal(cfg) {
        if (cfg.yoyo) return;
        var objetivos = [].concat(cfg.targets || []);
        Object.keys(cfg).forEach(function (k) {
            if (CLAVES_TWEEN.indexOf(k) >= 0) return;
            var v = cfg[k];
            if (v && typeof v === "object" && typeof v.to === "number") v = v.to;
            if (typeof v !== "number") return;
            objetivos.forEach(function (o) {
                if (!o || !o.scene) return;
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

    function cargarSvg(clave, s) {
        return new Promise(function (resolve) {
            var o = P.origen(s);
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
                console.warn("[EscenarioPhaser] no se pudo dibujar", clave);
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
            g.addColorStop(0, "rgba(255,240,170,0.95)");
            g.addColorStop(0.45, "rgba(255,214,80,0.55)");
            g.addColorStop(1, "rgba(255,200,40,0)");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, s, s);
        });
        texturaCanvas("fx-burbuja", 128, function (ctx, s) {
            var g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
            g.addColorStop(0, "rgba(255,255,255,0.95)");
            g.addColorStop(0.62, "rgba(255,255,255,0.75)");
            g.addColorStop(0.8, "rgba(255,230,250,0.35)");
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
        var o = P.origen(svgTexto);
        var im = sc.add.image(x || 0, y || 0, clave);
        im.setOrigin(o.x, o.y);
        im.setScale(1 / RES);
        im.escalaBase = 1 / RES;
        return im;
    }

    function parte(clave, x, y) { return imagenDe("zeus-" + clave, P.SVG[clave], x, y); }
    function acc(clave, x, y) { return imagenDe("acc-" + clave, A.SVG[clave], x, y); }

    // ------------------------------------------------------------------ Zeus

    function armarZeus() {
        var zeus = sc.add.container(0, 0);
        obj.zeus = zeus;
        obj.sombra = sc.add.ellipse(0, 4, 380, 46, 0x6b3f8f, 0.18);
        obj.cuerpo = parte("cuerpo");
        zeus.add([obj.sombra, obj.cuerpo]);

        // Pies: contenedor con pivote en el talón; ahí se calza el tenis. El derecho es el izquierdo en espejo.
        function pie(k) {
            var c = sc.add.container(k * G.talon.x, G.talon.y);
            c.scaleX = k;
            c.add(parte("pie"));
            return c;
        }
        obj.pieIzq = pie(1);
        obj.pieDer = pie(-1);
        zeus.add([obj.pieIzq, obj.pieDer]);

        // Brazos: hombro → brazo; codo → antebrazo y mano (se doblan para ajustar el sombrero o ponerse en jarra).
        function brazo(lado) {
            var k = lado === "izq" ? 1 : -1;
            var b = sc.add.container(k * G.hombro.x, G.hombro.y);
            var sup = parte("brazo");
            var codo = sc.add.container(G.codo.x, G.codo.y);
            var ante = parte("antebrazo");
            var mano = parte("mano", G.mano.x, G.mano.y);
            if (k < 0) {
                sup.setFlipX(true);
                ante.setFlipX(true);
                mano.setFlipX(true);
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
        cab.add([obj.cara, obj.pelo, obj.ojoIzq, obj.ojoDer, obj.cejaIzq, obj.cejaDer, obj.nariz, obj.boca]);
        zeus.add(cab);
        crearZonas();
    }

    function contenedorDe(nombre) {
        if (nombre === "cabeza") return obj.cabeza;
        return obj.zeus;
    }

    function crearZonas() {
        Object.keys(G.zonas).forEach(function (id) {
            var z = G.zonas[id];
            var c = contenedorDe(z.contenedor);
            var zona = sc.add.zone(z.x, z.y, z.rx * 2, z.ry * 2);
            zona.zonaId = id;
            zona.def = z;
            c.add(zona);
            zonas[id] = zona;

            // Anillo de destino (se ve solo mientras se arrastra) y halo dorado de ayuda.
            var an = sc.add.ellipse(z.x, z.y, z.rx * 2, z.ry * 2);
            an.setStrokeStyle(10, 0xffffff, 0.95);
            an.setFillStyle(0xfff6c8, 0.18);
            an.setAlpha(0);
            c.add(an);
            anillos[id] = an;

            var h = sc.add.image(z.x, z.y, "fx-halo");
            h.setBlendMode(Phaser.BlendModes.ADD);
            h.setAlpha(0);
            h.setScale(z.rx * 2.6 / 128, z.ry * 2.6 / 128);
            h.baseX = h.scaleX;
            h.baseY = h.scaleY;
            c.add(h);
            halos[id] = h;
        });
    }

    /** Los anillos y halos van encima de los accesorios puestos. */
    function subirMarcas() {
        Object.keys(G.zonas).forEach(function (id) {
            var c = contenedorDe(G.zonas[id].contenedor);
            c.bringToTop(anillos[id]);
            c.bringToTop(halos[id]);
        });
    }

    // ------------------------------------------------------------------ tarima y baúl

    function armarTarima() {
        tarima = sc.add.graphics();
        tarima.setDepth(-2);
    }

    function dibujarTarima() {
        var w = G.ancho * 1.25 * lay.escala;
        var h = Math.max(26, 70 * lay.escala);
        var x = lay.cx;
        var y = lay.piso;
        tarima.clear();
        tarima.fillStyle(0x8e4fc4, 0.25);
        tarima.fillEllipse(x, y + h * 0.42, w * 1.04, h * 1.1);
        tarima.fillStyle(0xd7b5f5, 1);
        tarima.fillEllipse(x, y + h * 0.22, w, h);
        tarima.fillStyle(0xf3e3ff, 1);
        tarima.fillEllipse(x, y, w, h);
        tarima.lineStyle(Math.max(3, 6 * lay.escala), 0xffcf3f, 1);
        tarima.strokeEllipse(x, y, w * 0.86, h * 0.72);
    }

    /** Baúl en unidades locales: 300 de ancho, base en y = 0; la tapa gira desde la bisagra (y = -150). */
    function armarBaul() {
        var b = sc.add.container(0, 0);
        b.setDepth(-1);
        var luz = sc.add.image(0, -150, "fx-halo");
        luz.setScale(360 / 128, 260 / 128);
        luz.setBlendMode(Phaser.BlendModes.ADD);
        luz.setAlpha(0);
        var g = sc.add.graphics();
        // cuerpo
        g.fillStyle(0x5e2f8f, 0.25);
        g.fillEllipse(0, 4, 320, 30);
        g.fillStyle(0x9b5a2c, 1);
        g.fillRoundedRect(-150, -150, 300, 150, 18);
        g.fillStyle(0xb8733d, 1);
        g.fillRoundedRect(-140, -140, 280, 130, 12);
        g.fillStyle(0x9b5a2c, 1);
        for (var i = 0; i < 3; i++) g.fillRect(-140, -112 + i * 36, 280, 5);
        g.fillStyle(0xffcf3f, 1);
        g.fillRect(-150, -150, 300, 14);
        g.fillRect(-112, -150, 18, 150);
        g.fillRect(94, -150, 18, 150);
        g.fillStyle(0xffcf3f, 1);
        g.fillRoundedRect(-22, -128, 44, 50, 10);
        g.fillStyle(0x7a4316, 1);
        g.fillCircle(0, -108, 7);
        g.fillRect(-3, -108, 6, 16);
        // estrellas pintadas
        g.fillStyle(0xff8fc7, 1);
        g.fillCircle(-60, -60, 9);
        g.fillStyle(0x7cd3f7, 1);
        g.fillCircle(56, -50, 9);
        // tapa: contenedor en la bisagra
        var tapa = sc.add.container(0, -150);
        var gt = sc.add.graphics();
        gt.fillStyle(0x9b5a2c, 1);
        gt.fillRoundedRect(-156, -84, 312, 92, { tl: 60, tr: 60, bl: 8, br: 8 });
        gt.fillStyle(0xc5804a, 1);
        gt.fillRoundedRect(-144, -72, 288, 70, { tl: 50, tr: 50, bl: 6, br: 6 });
        gt.fillStyle(0xffcf3f, 1);
        gt.fillRect(-156, -6, 312, 14);
        gt.fillRect(-112, -76, 18, 82);
        gt.fillRect(94, -76, 18, 82);
        gt.fillStyle(0xffe066, 1);
        gt.fillCircle(0, -46, 16);
        tapa.add(gt);
        // interior (se ve al abrir)
        var interior = sc.add.graphics();
        interior.fillStyle(0x3a1d55, 1);
        interior.fillRoundedRect(-140, -158, 280, 16, 6);
        interior.setAlpha(0);
        b.add([luz, g, interior, tapa]);
        b.tapa = tapa;
        b.luz = luz;
        b.interior = interior;
        baulObj = b;
        // destellos que salen del baúl de vez en cuando
        if (!reducido) {
            sc.time.addEvent({
                delay: 1700, loop: true, callback: function () {
                    if (!baulObj || !lay.W) return;
                    var p = bocaBaul();
                    var e = sc.add.image(p.x + (Math.random() - 0.5) * 80 * baulObj.scaleX, p.y, "fx-chispa");
                    e.setTint(COLORES[Math.floor(Math.random() * COLORES.length)]);
                    e.setBlendMode(Phaser.BlendModes.ADD);
                    e.setScale(0.5 + Math.random() * 0.4);
                    e.setDepth(-1);
                    sc.tweens.add({ targets: e, y: p.y - 90 * baulObj.scaleX, alpha: 0, angle: 180, duration: 1400, onComplete: function () { e.destroy(); } });
                }
            });
        }
    }

    function bocaBaul() {
        return { x: baulObj.x, y: baulObj.y - 150 * baulObj.scaleY };
    }

    function baul(estado) {
        if (!baulObj) return Promise.resolve();
        var t = baulObj.tapa;
        sc.tweens.killTweensOf([t, baulObj.luz, baulObj.interior]);
        if (estado === "abierto" || estado === "entreabierto") {
            var abierto = estado === "abierto";
            return Promise.all([
                tw({ targets: t, scaleY: abierto ? -0.7 : -0.25, angle: abierto ? -8 : -3, duration: 420, ease: "Back.easeOut" }),
                tw({ targets: baulObj.luz, alpha: abierto ? 1 : 0.6, duration: 380 }),
                tw({ targets: baulObj.interior, alpha: 1, duration: 200 })
            ]);
        }
        return Promise.all([
            tw({ targets: t, scaleY: 1, angle: 0, duration: 360, ease: "Bounce.easeOut" }),
            tw({ targets: baulObj.luz, alpha: 0, duration: 300 }),
            tw({ targets: baulObj.interior, alpha: 0, duration: 200, delay: 150 })
        ]);
    }

    // ------------------------------------------------------------------ accesorios en la bandeja

    function defAcc(id) {
        return (cfg.accesorios || []).find(function (a) { return a.id === id; }) || null;
    }

    function posLugar(i) {
        var lista = (lay.retrato && cfg.lugaresRetrato) ? cfg.lugaresRetrato : cfg.lugares;
        var l = (lista || [])[i] || { x: 0.5, y: 0.5 };
        var x = l.x * lay.W;
        var y = l.y * lay.H;
        var lejos = lay.mitadZeus + lay.tam * 0.5 + 10;
        // en horizontal, los accesorios nunca tapan a Zeus; en vertical van arriba y a los lados de la cabeza
        if (!lay.retrato && Math.abs(x - lay.cx) < lejos) x = lay.cx + (x < lay.cx ? -lejos : lejos);
        x = Math.max(lay.tam * 0.5 + 4, Math.min(lay.W - lay.tam * 0.5 - 4, x));
        y = Math.max(lay.tam * 0.5 + 4, Math.min(lay.H - lay.tam * 0.5 - 4, y));
        return { x: x, y: y };
    }

    function crearItem(id) {
        var d = defAcc(id);
        if (!d) return null;
        var c = sc.add.container(0, 0);
        c.accId = id;
        c.estado = "bandeja";
        var flota = sc.add.container(0, 0);
        var burbuja = sc.add.image(0, 0, "fx-burbuja");
        var im = acc(d.imagen);
        // el dibujo se centra en la burbuja aunque su pivote no esté al centro
        var o = P.origen(A.SVG[d.imagen]);
        im.setOrigin(0.5, 0.5);
        im.ancho = o.w;
        im.alto = o.h;
        flota.add([burbuja, im]);
        c.add(flota);
        c.flota = flota;
        c.burbuja = burbuja;
        c.dibujo = im;
        c.setDepth(20);
        itemsMap[id] = c;
        medirItem(c);
        return c;
    }

    function medirItem(c) {
        var t = lay.tam;
        c.burbuja.setScale((t * 1.12) / 128);
        var k = (t * 0.92) / (Math.max(c.dibujo.ancho, c.dibujo.alto) * RES);
        c.dibujo.setScale(k);
        c.dibujo.escalaBase = k;
        c.setSize(t, t);
        if (!c.input) {
            c.setInteractive(new Phaser.Geom.Circle(t / 2, t / 2, t * 0.6), Phaser.Geom.Circle.Contains);
            if (c.input) c.input.cursor = "grab";
        } else if (c.input.hitArea) {
            c.input.hitArea.setTo(t / 2, t / 2, t * 0.6);
        }
    }

    function flotar(c, i) {
        sc.tweens.killTweensOf(c.flota);
        c.flota.y = 0;
        c.flota.angle = 0;
        if (reducido) return;
        sc.tweens.add({ targets: c.flota, y: -lay.tam * 0.07, duration: 1300 + (i % 4) * 190, yoyo: true, repeat: -1, ease: "Sine.easeInOut", delay: i * 230 });
        sc.tweens.add({ targets: c.flota, angle: i % 2 ? 5 : -5, duration: 1700 + (i % 3) * 210, yoyo: true, repeat: -1, ease: "Sine.easeInOut", delay: i * 170 });
    }

    /**
     * Saca del baúl los accesorios que no están puestos y los lleva a su lugar (lugares: { id: índice }).
     * opts.desdeBaul=false los pone directamente (sin animación).
     */
    async function llenarBandeja(lugares, opts) {
        opts = opts || {};
        if (lugares) lugaresActuales = Object.assign({}, lugares);
        var ids = (cfg.accesorios || []).map(function (a) { return a.id; }).filter(function (id) { return !puestos[id]; });
        var desde = opts.desdeBaul !== false;
        if (desde) await baul("abierto");
        var vuelos = ids.map(function (id, i) {
            var c = itemsMap[id] || crearItem(id);
            c.estado = "bandeja";
            c.setVisible(true);
            if (c.input) c.input.enabled = true;
            var dest = posLugar(lugaresActuales[id] != null ? lugaresActuales[id] : i);
            c.lugar = dest;
            if (!desde) {
                c.setPosition(dest.x, dest.y);
                c.setScale(1);
                c.setAlpha(1);
                flotar(c, i);
                return Promise.resolve();
            }
            var b = bocaBaul();
            c.setPosition(b.x, b.y);
            c.setScale(0.2);
            c.setAlpha(0);
            var dx = dest.x - b.x;
            return sleep(i * 260).then(function () {
                sonarSiHay("aparece");
                estrellas(b.x, b.y, 8, null, 0.6);
                return Promise.all([
                    tw({ targets: c, alpha: 1, scale: 1, duration: 520, ease: "Back.easeOut" }),
                    tw({ targets: c, x: dest.x, duration: 720, ease: "Sine.easeOut" }),
                    tw({ targets: c, y: Math.min(b.y, dest.y) - Math.abs(dx) * 0.18 - 40, duration: 360, ease: "Quad.easeOut" })
                        .then(function () { return tw({ targets: c, y: dest.y, duration: 360, ease: "Quad.easeIn" }); })
                ]);
            }).then(function () { flotar(c, i); });
        });
        await Promise.all(vuelos);
        if (desde) await baul("entreabierto");
    }

    function sonarSiHay(nombre) {
        if (typeof global.sonarEvento === "function") global.sonarEvento(nombre);
    }

    /** El accesorio vuelve a su lugar (con un rebotecito si fue un error). */
    function volverALugar(id, rebote) {
        var c = itemsMap[id];
        if (!c || !c.lugar) return Promise.resolve();
        c.estado = "volviendo";
        sc.tweens.killTweensOf(c);
        var i = Object.keys(itemsMap).indexOf(id);
        var vuelta;
        if (rebote) {
            // rebota hacia afuera de Zeus antes de volver
            var sx = c.x < lay.cx ? -1 : 1;
            vuelta = tw({ targets: c, x: c.x + sx * lay.tam * 0.35, y: c.y - lay.tam * 0.3, scale: 0.9, duration: 180, ease: "Quad.easeOut" })
                .then(function () { return tw({ targets: c, x: c.lugar.x, y: c.lugar.y, scale: 1, duration: 520, ease: "Back.easeOut" }); });
        } else {
            vuelta = tw({ targets: c, x: c.lugar.x, y: c.lugar.y, scale: 1, duration: 420, ease: "Sine.easeOut" });
        }
        return vuelta.then(function () {
            c.setScale(1);
            c.setDepth(20);
            c.estado = "bandeja";
            flotar(c, i);
        });
    }

    /** Demo: la mano "toma" el accesorio (se destaca y deja de flotar). */
    function tomarItem(id) {
        var c = itemsMap[id];
        if (!c) return;
        sc.tweens.killTweensOf([c, c.flota]);
        c.flota.y = 0;
        c.flota.angle = 0;
        c.estado = "arrastrando";
        c.setDepth(60);
        c.burbuja.setTint(0xffe58a);
        c.dibujo.setScale(c.dibujo.escalaBase * 1.15);
    }

    /** Demo: lleva el accesorio a un punto de la pantalla en `ms` (a la par de la mano). */
    function moverItem(id, pantalla, ms) {
        var c = itemsMap[id];
        if (!c || !pantalla) return sleep(ms || 0);
        var m = mundoDePantalla(pantalla.x, pantalla.y);
        var zona = zonaBajo(m.x, m.y).id;
        destinos(true, zona);
        return tw({ targets: c, x: m.x, y: m.y, duration: ms || 600, ease: "Cubic.easeInOut" }).then(function () {
            destinos(false);
            c.burbuja.clearTint();
            c.dibujo.setScale(c.dibujo.escalaBase);
        });
    }

    // ------------------------------------------------------------------ zonas de destino

    function localDe(objeto, x, y) {
        var m = objeto.getWorldTransformMatrix();
        var p = m.applyInverse(x, y);
        return { x: p.x, y: p.y };
    }

    function mundoDe(objeto, x, y) {
        var m = objeto.getWorldTransformMatrix();
        var p = m.transformPoint(x || 0, y || 0);
        return { x: p.x, y: p.y };
    }

    /** Zona de destino bajo un punto del mundo (el centro del accesorio). Se ignoran las zonas ya ocupadas. */
    function zonaBajo(x, y) {
        var candidatos = Object.keys(zonas).filter(function (id) { return !zonaOcupada(id); }).map(function (id) {
            var z = zonas[id];
            var p = localDe(z, x, y);
            return { id: id, d: global.Reglas.distanciaNormalizada(p.x, p.y, { x: 0, y: 0, rx: z.def.rx, ry: z.def.ry }) };
        });
        var tol = Number(cfg.juego && cfg.juego.tolerancia) || 1.25;
        return { id: global.Reglas.elegirZona(candidatos, tol), candidatos: candidatos };
    }

    function zonaOcupada(zonaId) {
        return Object.keys(puestos).some(function (id) { var d = defAcc(id); return d && d.zona === zonaId; });
    }

    /** Anillos de destino: on mientras se arrastra; `sobre` es la zona que el accesorio está tocando. */
    function destinos(on, sobre) {
        Object.keys(anillos).forEach(function (id) {
            var an = anillos[id];
            var ver = on && !zonaOcupada(id);
            var resaltado = ver && id === sobre;
            if (an.estadoVisible === ver && an.resaltado === resaltado) return;
            an.estadoVisible = ver;
            an.resaltado = resaltado;
            sc.tweens.killTweensOf(an);
            if (!ver) {
                sc.tweens.add({ targets: an, alpha: 0, scale: 1, duration: 200 });
                return;
            }
            if (resaltado) {
                an.setFillStyle(0xfff3a6, 0.4);
                sc.tweens.add({ targets: an, alpha: 1, scale: 1.12, duration: 160, ease: "Back.easeOut" });
            } else {
                an.setFillStyle(0xfff6c8, 0.18);
                an.setScale(1);
                an.setAlpha(0.45);
                if (!reducido) sc.tweens.add({ targets: an, alpha: 0.8, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
                else an.setAlpha(0.7);
            }
        });
    }

    // ------------------------------------------------------------------ encaje

    function piezaFinal(d) {
        var pf = d.posicionFinal || {};
        var k = Number(d.escalaFinal) || 1;
        var lista = [];
        if (pf.contenedor === "pies") {
            [obj.pieIzq, obj.pieDer].forEach(function (pie) {
                var t = acc("tenis", 0, 0);
                t.setScale(t.escalaBase * k);
                t.escalaBase = t.escalaBase * k;
                pie.add(t);
                lista.push(t);
            });
            return lista;
        }
        var c = contenedorDe(pf.contenedor);
        var clave = d.imagen === "bufanda_icono" ? "bufanda" : d.imagen;
        var im = acc(clave, pf.x || 0, pf.y || 0);
        im.setScale(im.escalaBase * k);
        im.escalaBase = im.escalaBase * k;
        if (clave === "bufanda") {
            // la bufanda va entre el cuerpo y la cabeza; su cola cuelga del nudo
            c.addAt(im, c.getIndex(obj.cabeza));
            var cola = acc("bufanda_cola", (pf.x || 0) + 52, (pf.y || 0) + 16);
            cola.setScale(cola.escalaBase * k);
            cola.escalaBase = cola.escalaBase * k;
            c.addAt(cola, c.getIndex(obj.cabeza));
            im.cola = cola;
            obj.bufandaCola = cola;
            lista.push(im, cola);
        } else {
            c.add(im);
            lista.push(im);
            // el sombrero siempre encima de las gafas
            if (puestos.sombrero && clave === "gafas") puestos.sombrero.forEach(function (s) { c.bringToTop(s); });
        }
        return lista;
    }

    /** Punto del mundo donde termina el accesorio (centro de su lugar en Zeus). */
    function destinoMundo(d) {
        var pf = d.posicionFinal || {};
        if (pf.contenedor === "pies") return mundoDe(obj.zeus, 0, -34);
        if (d.imagen === "bufanda_icono") return mundoDe(obj.zeus, (pf.x || 0) + 10, (pf.y || 0) + 30);
        return mundoDe(contenedorDe(pf.contenedor), pf.x || 0, pf.y || 0);
    }

    /** Escala del dibujo de la bandeja cuando llega a Zeus (mismo tamaño que tendrá encajado). */
    function escalaLlegada(c, d) {
        var ancho = (d.imagen === "tenis_par" ? 250 : c.dibujo.ancho) * (Number(d.escalaFinal) || 1) * obj.zeus.scaleX;
        return ancho / (c.dibujo.ancho * RES * c.dibujo.escalaBase);
    }

    async function encajar(id) {
        var c = itemsMap[id];
        var d = defAcc(id);
        if (!c || !d) return;
        c.estado = "encajando";
        if (c.input) c.input.enabled = false;
        sc.tweens.killTweensOf([c, c.flota]);
        c.flota.angle = 0;
        c.flota.y = 0;
        var dest = destinoMundo(d);
        // acercamiento: el accesorio vuela a su lugar, la burbuja se apaga y se ajusta la escala
        await Promise.all([
            tw({ targets: c, x: dest.x, y: dest.y, scale: escalaLlegada(c, d), duration: 320, ease: "Sine.easeInOut" }),
            tw({ targets: c.burbuja, alpha: 0, duration: 260 })
        ]);
        c.setVisible(false);
        c.estado = "colocado";
        var piezas = piezaFinal(d);
        puestos[id] = piezas;
        subirMarcas();
        await animarEncaje(d, piezas);
        estrellas(dest.x, dest.y, 18, null, 1);
    }

    function animarEncaje(d, piezas) {
        var tipo = d.encaje || "deslizar";
        if (tipo === "caer") {
            var s = piezas[0];
            var y0 = s.y;
            s.y = y0 - 70;
            return tw({ targets: s, y: y0, duration: 520, ease: "Bounce.easeOut" });
        }
        if (tipo === "envolver") {
            var v = piezas[0];
            var cola = piezas[1];
            var bx = v.escalaBase;
            v.scaleX = bx * 0.25;
            if (cola) cola.rotation = 0.9;
            return Promise.all([
                tw({ targets: v, scaleX: bx, duration: 520, ease: "Back.easeOut" }),
                cola ? tw({ targets: cola, rotation: 0, duration: 900, ease: "Elastic.easeOut" }) : Promise.resolve()
            ]).then(function () { ondearBufanda(true); });
        }
        if (tipo === "calzar") {
            return Promise.all(piezas.map(function (t, i) {
                var b = t.escalaBase;
                t.setScale(b * 1.35);
                t.setAlpha(0);
                return sleep(i * 160).then(function () {
                    return tw({ targets: t, scale: b, alpha: 1, duration: 300, ease: "Back.easeOut" });
                });
            }));
        }
        // deslizar (gafas): bajan un poquito y se ajustan con un rebote
        var g = piezas[0];
        var b0 = g.escalaBase;
        var gy = g.y;
        g.setScale(b0 * 1.18);
        g.y = gy - 22;
        return tw({ targets: g, scale: b0, y: gy, duration: 380, ease: "Back.easeOut" });
    }

    function ondearBufanda(on) {
        var cola = obj.bufandaCola;
        if (!cola || !cola.scene) return;
        sc.tweens.killTweensOf(cola);
        cola.rotation = 0;
        if (!on || reducido) return;
        sc.tweens.add({ targets: cola, rotation: { from: -0.06, to: 0.08 }, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }

    /** Zeus se quita lo puesto: cada accesorio salta de su lugar y vuelve al baúl. */
    async function quitarPuestos() {
        var ids = Object.keys(puestos);
        if (!ids.length) return;
        await baul("abierto");
        var b = bocaBaul();
        await Promise.all(ids.map(function (id, i) {
            var piezas = puestos[id];
            delete puestos[id];
            var c = itemsMap[id];
            var d = defAcc(id);
            return sleep(i * 180).then(function () {
                var desde = destinoMundo(d);
                piezas.forEach(function (p) { sc.tweens.killTweensOf(p); p.destroy(); });
                if (id === "bufanda") obj.bufandaCola = null;
                c.setVisible(true);
                c.burbuja.setAlpha(1);
                c.setPosition(desde.x, desde.y);
                c.setScale(escalaLlegada(c, d));
                c.estado = "guardando";
                estrellas(desde.x, desde.y, 6, null, 0.5);
                return Promise.all([
                    tw({ targets: c, x: b.x, duration: 620, ease: "Sine.easeIn" }),
                    tw({ targets: c, y: Math.min(desde.y, b.y) - 60, duration: 300, ease: "Quad.easeOut" })
                        .then(function () { return tw({ targets: c, y: b.y, scale: 0.2, alpha: 0, duration: 320, ease: "Quad.easeIn" }); })
                ]);
            });
        }));
        destinos(false);
    }

    // ------------------------------------------------------------------ efectos

    function brillo(zonaId, opts) {
        opts = opts || {};
        var h = halos[zonaId];
        if (!h) return;
        sc.tweens.killTweensOf(h);
        if (opts.on === false) {
            sc.tweens.add({ targets: h, alpha: 0, duration: 250 });
            return;
        }
        h.setScale(h.baseX, h.baseY);
        if (opts.fuerte) {
            h.setAlpha(1);
            sc.tweens.add({ targets: h, scaleX: h.baseX * 1.35, scaleY: h.baseY * 1.35, alpha: 0, duration: 900, ease: "Quad.easeOut" });
            return;
        }
        h.setAlpha(0.15);
        sc.tweens.add({ targets: h, alpha: 0.85, scaleX: h.baseX * 1.18, scaleY: h.baseY * 1.18, duration: 800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }

    /** Microayuda: el accesorio se menea y una fila de chispas viaja hasta su zona. */
    function guiar(id) {
        var c = itemsMap[id];
        var d = defAcc(id);
        if (!c || !d || c.estado !== "bandeja" || !zonas[d.zona]) return;
        sc.tweens.add({ targets: c.dibujo, angle: { from: -10, to: 10 }, duration: 120, yoyo: true, repeat: 3, onComplete: function () { c.dibujo.angle = 0; } });
        if (reducido) return;
        var z = mundoDe(zonas[d.zona]);
        for (var i = 0; i < 6; i++) {
            (function (k) {
                var e = sc.add.image(c.x, c.y, "fx-chispa");
                e.setTint(COLORES[k % COLORES.length]);
                e.setBlendMode(Phaser.BlendModes.ADD);
                e.setScale(0.9);
                e.setDepth(15);
                e.setAlpha(0);
                sc.tweens.add({
                    targets: e, x: z.x, y: z.y, alpha: { from: 1, to: 0.2 }, angle: 270, scale: 0.4,
                    delay: k * 140, duration: 900, ease: "Sine.easeInOut", onComplete: function () { e.destroy(); }
                });
            })(i);
        }
    }

    function estrellas(x, y, n, colores, fuerza) {
        if (!sc || reducido) return;
        var e = sc.add.particles(x, y, n > 14 ? "fx-estrella" : "fx-chispa", {
            speed: { min: 120 * (fuerza || 1), max: 320 * (fuerza || 1) },
            angle: { min: 0, max: 360 },
            scale: { start: Math.max(0.4, lay.escala * 1.1), end: 0 },
            lifespan: { min: 500, max: 1000 },
            rotate: { min: 0, max: 360 },
            gravityY: 260,
            tint: colores || [0xffe066, 0xff8fc7, 0x7cf3ff, 0xffffff],
            blendMode: "ADD",
            emitting: false
        });
        e.setDepth(40);
        e.explode(n || 12);
        sc.time.delayedCall(1300, function () { e.destroy(); });
    }

    // ------------------------------------------------------------------ diseño

    function reacomodar() {
        if (!sc || !obj.zeus) return;
        var W = sc.scale.width;
        var H = sc.scale.height;
        if (W < 10 || H < 10) return;
        lay.W = W;
        lay.H = H;
        // Vertical (celulares, tabletas de pie): Zeus abajo y grande, accesorios en la franja de arriba.
        lay.retrato = W / H < 0.75;
        var escala;
        if (lay.retrato) {
            lay.tam = Math.max(72, Math.min(120, W * 0.24));
            escala = Math.min((H * 0.66) / G.alto, (W * 0.9) / G.ancho);
            lay.piso = H * 0.97;
        } else {
            lay.tam = Math.max(78, Math.min(170, Math.min(W * 0.16, H * 0.22)));
            escala = (H * 0.84) / G.alto;
            escala = Math.min(escala, (W - 2 * (lay.tam + 24)) / G.ancho);
            escala = Math.max(escala, (W * 0.4) / G.ancho * 0.5);
            lay.piso = H * 0.95;
        }
        lay.escala = escala;
        lay.cx = W / 2;
        lay.mitadZeus = (G.ancho / 2) * escala;
        obj.zeus.baseEscala = escala;
        obj.zeus.baseX = lay.cx;
        obj.zeus.baseY = lay.piso;
        obj.zeus.setScale(escala);
        obj.zeus.setPosition(lay.cx, lay.piso);
        dibujarTarima();
        var bw = Math.max(70, Math.min(W * 0.2, H * 0.3, 260));
        baulObj.setScale(bw / 300);
        // abajo a la izquierda: a la derecha quedan los menús de accesibilidad y volumen
        baulObj.setPosition(bw / 2 + 10, H - 8);
        Object.keys(itemsMap).forEach(function (id, i) {
            var c = itemsMap[id];
            medirItem(c);
            var lugar = lugaresActuales[id] != null ? lugaresActuales[id] : i;
            c.lugar = posLugar(lugar);
            if (c.estado === "bandeja") {
                c.setPosition(c.lugar.x, c.lugar.y);
                flotar(c, i);
            }
        });
    }

    /**
     * Phaser guarda la posición del lienzo y solo la renueva si cambia de tamaño: si el lienzo se mueve sin
     * cambiar de tamaño (la cabecera se reacomoda), los toques se leerían corridos. Se renueva antes de cada
     * toque (fase de captura) y cuando cambia el diseño (misma trampa que el Toque Mágico).
     */
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

    /** Centro en pantalla de una zona ("ojos") o de un accesorio en la bandeja ("gafas"). */
    function puntoDe(id) {
        if (!sc) return null;
        if (zonas[id]) {
            var z = mundoDe(zonas[id]);
            return aPantalla(z.x, z.y);
        }
        var c = itemsMap[id];
        if (c && c.visible) return aPantalla(c.x, c.y);
        return null;
    }

    // ------------------------------------------------------------------ montaje

    function montar(el, config) {
        if (config) cfg = config;
        if (listoPromesa) return listoPromesa;
        if (!Phaser || !P || !A || !cfg) {
            console.warn("[EscenarioPhaser] falta Phaser, Personaje, Accesorios o config");
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
                        var cargas = [];
                        Object.keys(P.SVG).forEach(function (k) { cargas.push(cargarSvg("zeus-" + k, P.SVG[k])); });
                        Object.keys(A.SVG).forEach(function (k) { cargas.push(cargarSvg("acc-" + k, A.SVG[k])); });
                        Promise.all(cargas).then(function () {
                            armarTarima();
                            armarBaul();
                            armarZeus();
                            (cfg.accesorios || []).forEach(function (a) {
                                var c = crearItem(a.id);
                                c.setVisible(false);
                                c.estado = "guardado";
                            });
                            reacomodar();
                            sc.scale.on("resize", reacomodar);
                            vigilarPosicion(el);
                            resolve(true);
                        });
                    }
                }
            });
            global.__escenarioPhaser = juego;
        });
        return listoPromesa;
    }

    global.EscenarioPhaser = {
        montar: montar,
        listo: function () { return !!(sc && obj.zeus); },
        reacomodar: reacomodar,
        escena: function () { return sc; },
        objetos: function () { return obj; },
        items: function () { return itemsMap; },
        item: function (id) { return itemsMap[id] || null; },
        llenarBandeja: llenarBandeja,
        volverALugar: volverALugar,
        tomarItem: tomarItem,
        moverItem: moverItem,
        zonaBajo: zonaBajo,
        encajar: encajar,
        quitarPuestos: quitarPuestos,
        colocados: function () { return Object.keys(puestos); },
        piezas: function (id) { return puestos[id] || []; },
        destinos: destinos,
        brillo: brillo,
        guiar: guiar,
        estrellas: estrellas,
        ondearBufanda: ondearBufanda,
        baul: baul,
        bocaBaul: function () { return baulObj ? aPantalla(bocaBaul().x, bocaBaul().y) : null; },
        puntoDe: puntoDe,
        aPantalla: aPantalla,
        mundoDePantalla: mundoDePantalla,
        diseno: function () { return lay; },
        zonas: function () { return zonas; },
        RES: RES
    };
})(window);
