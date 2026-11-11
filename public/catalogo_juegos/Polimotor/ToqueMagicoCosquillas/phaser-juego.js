/**
 * EspejoPhaser — escena Phaser 4 del espejo mágico (window.EspejoPhaser).
 *
 * Dibuja en #espejo-phaser: el marco con bombillas, el vidrio con brillos y estrellitas, y a Zoe
 * armada por partes (personaje.js) dentro de contenedores: zoe → cuerpo, brazos (con su mano) y cabeza
 * (pelo, cara, ojos, cejas, nariz y boca). Las zonas táctiles son Phaser.GameObjects.Zone con área elíptica
 * dentro del mismo contenedor de la parte, así siguen al personaje cuando se mueve o cambia la pantalla.
 *
 * API:
 *   montar(el, opts)  → Promise   opts.onToque(zonaId, puntoPantalla)
 *   listo()                       true cuando hay texturas y escena
 *   puntoDe(zonaOParte)           centro en coordenadas de pantalla (para la mano de la demo y las pruebas)
 *   rectEspejo()                  DOMRect del espejo en pantalla
 *   objetos()                     contenedores y sprites, para animaciones.js
 *   escena()                      la Phaser.Scene
 *   habilitar(on)                 acepta o ignora toques
 *   brillo(zonaOParte, opts)      halo dorado (ayuda) sobre una zona; opts.on=false lo quita
 *   estrellas(x, y, n, colores)   estallido de estrellas en coords del mundo
 *   luces(modo)                   "calma" | "fiesta" | "acierto"
 *   destello(alpha)               el vidrio se ilumina
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser || null;
    var P = global.Personaje;
    var G = P ? P.GEOMETRIA : null;
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);

    var RES = 2; // resolución de las texturas SVG respecto a las unidades de diseño
    var COLORES_BOMBILLA = [0xffe066, 0xff8fc7, 0x7cf3ff, 0x9df59a, 0xffb36b, 0xc9a7ff];

    var juego = null;
    var sc = null;
    var cont = null;
    var obj = {};
    var zonas = {};
    var halos = {};
    var bombillas = [];
    var estrellasVidrio = [];
    var gMarco = null;
    var gVidrio = null;
    var brilloVidrio = null;
    var sombraPiso = null;
    var particulas = null;
    var rect = { x: 0, y: 0, w: 0, h: 0, vx: 0, vy: 0, vw: 0, vh: 0, escala: 1 };
    var habilitado = false;
    var onToque = null;
    var modoLuces = "calma";
    var listoPromesa = null;
    var ultimoToque = null; // para depurar y para las pruebas

    // ------------------------------------------------------------------ texturas

    function cargarSvg(clave, s) {
        return new Promise(function (resolve) {
            var o = P.origen(clave);
            var img = new Image();
            img.onload = function () {
                var c = document.createElement("canvas");
                c.width = Math.ceil(o.w * RES);
                c.height = Math.ceil(o.h * RES);
                c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
                if (sc.textures.exists("zoe-" + clave)) sc.textures.remove("zoe-" + clave);
                sc.textures.addCanvas("zoe-" + clave, c);
                resolve();
            };
            img.onerror = function () {
                console.warn("[EspejoPhaser] no se pudo dibujar", clave);
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
        texturaCanvas("fx-bombilla", 64, function (ctx, s) {
            var g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
            g.addColorStop(0, "rgba(255,255,255,1)");
            g.addColorStop(0.3, "rgba(255,255,255,0.95)");
            g.addColorStop(0.42, "rgba(255,255,255,0.45)");
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

    /** Lado derecho de Zoe = dibujo del izquierdo con escala -x (sirve aunque el pivote no esté al centro). */
    function espejoX(im) {
        im.scaleX = -im.escalaBase;
        im.espejo = true;
    }

    function imagen(clave, x, y) {
        var o = P.origen(clave);
        var im = sc.add.image(x || 0, y || 0, "zoe-" + clave);
        im.setOrigin(o.x, o.y);
        im.setScale(1 / RES);
        im.escalaBase = 1 / RES;
        return im;
    }

    // ------------------------------------------------------------------ Zoe

    function armarZoe() {
        var zoe = sc.add.container(0, 0);
        obj.zoe = zoe;

        sombraPiso = sc.add.ellipse(0, 4, 360, 46, 0x6b3f8f, 0.18);
        zoe.add(sombraPiso);

        obj.cuerpo = imagen("cuerpo");
        zoe.add(obj.cuerpo);

        // Zapatos: pivote en el talón para levantar la punta. El derecho es el izquierdo en espejo (escala -x).
        obj.pieIzq = imagen("zapato", G.talon.x, G.talon.y);
        obj.pieDer = imagen("zapato", -G.talon.x, G.talon.y);
        espejoX(obj.pieDer);
        zoe.add([obj.pieIzq, obj.pieDer]);

        // Cabeza: contenedor con pivote en el cuello.
        var cab = sc.add.container(G.cabeza.x, G.cabeza.y);
        obj.cabeza = cab;
        obj.peloAtras = imagen("pelo_atras");
        obj.coletaIzq = imagen("coleta", G.coleta.x, G.coleta.y);
        obj.coletaDer = imagen("coleta", -G.coleta.x, G.coleta.y);
        espejoX(obj.coletaDer);
        obj.orejaIzq = imagen("oreja", G.oreja.x, G.oreja.y);
        obj.orejaDer = imagen("oreja", -G.oreja.x, G.oreja.y);
        espejoX(obj.orejaDer);
        obj.cara = imagen("cara");
        obj.ojoIzq = imagen("ojo", G.ojo.x, G.ojo.y);
        obj.ojoDer = imagen("ojo", -G.ojo.x, G.ojo.y);
        obj.ojoDer.setFlipX(true);
        obj.cejaIzq = imagen("ceja", G.ceja.x, G.ceja.y);
        obj.cejaDer = imagen("ceja", -G.ceja.x, G.ceja.y);
        obj.cejaDer.setFlipX(true);
        obj.nariz = imagen("nariz", G.nariz.x, G.nariz.y);
        obj.boca = imagen("boca_sonrisa", G.boca.x, G.boca.y);
        obj.peloFrente = imagen("pelo_frente");
        cab.add([obj.peloAtras, obj.coletaIzq, obj.coletaDer, obj.orejaIzq, obj.orejaDer, obj.cara, obj.ojoIzq, obj.ojoDer, obj.cejaIzq, obj.cejaDer, obj.nariz, obj.boca, obj.peloFrente]);

        // Brazos: contenedor en el hombro, el brazo cuelga y la mano va al final (se mueven juntos).
        function brazo(lado) {
            var k = lado === "izq" ? 1 : -1;
            var b = sc.add.container(k * G.hombro.x, G.hombro.y);
            var im = imagen("brazo");
            var mano = imagen("mano", G.mano.x, G.mano.y);
            if (k < 0) {
                im.setFlipX(true);
                mano.setFlipX(true);
            }
            b.add([im, mano]);
            b.rotation = -k * G.brazoReposo;
            b.lado = lado;
            b.reposo = -k * G.brazoReposo;
            b.mano = mano;
            return b;
        }
        obj.brazoIzq = brazo("izq");
        obj.brazoDer = brazo("der");

        zoe.add([obj.brazoDer, obj.brazoIzq]);
        zoe.add(cab);
        // Los brazos van delante del cuerpo y la cabeza encima de todo.
        zoe.bringToTop(cab);

        crearZonas();
    }

    function contenedorDe(nombre) {
        if (nombre === "cabeza") return obj.cabeza;
        if (nombre === "brazo_izq") return obj.brazoIzq;
        if (nombre === "brazo_der") return obj.brazoDer;
        return obj.zoe;
    }

    function crearZonas() {
        Object.keys(G.zonas).forEach(function (id) {
            var z = G.zonas[id];
            var c = contenedorDe(z.contenedor);
            var zona = sc.add.zone(z.x, z.y, z.rx * 2, z.ry * 2);
            zona.setInteractive(new Phaser.Geom.Ellipse(z.rx, z.ry, z.rx * 2, z.ry * 2), Phaser.Geom.Ellipse.Contains);
            if (zona.input) zona.input.cursor = "pointer";
            zona.zonaId = id;
            zona.def = z;
            c.add(zona);
            if (id === "cuerpo") c.sendToBack(zona);
            zonas[id] = zona;

            if (id !== "cuerpo") {
                var h = sc.add.image(z.x, z.y, "fx-halo");
                h.setBlendMode(Phaser.BlendModes.ADD);
                h.setAlpha(0);
                h.setScale(z.rx * 2.6 / 128, z.ry * 2.6 / 128);
                h.baseX = h.scaleX;
                h.baseY = h.scaleY;
                c.add(h);
                halos[id] = h;
            }
        });
    }

    /** Punto de pantalla → coordenadas locales de la zona (centro de la elipse en (0,0)). */
    function localDeZona(zona, x, y) {
        var m = zona.getWorldTransformMatrix();
        var p = m.applyInverse(x, y);
        return { x: p.x, y: p.y };
    }

    function alTocar(pointer, sobre) {
        if (!habilitado || typeof onToque !== "function") return;
        var candidatos = (sobre || []).filter(function (o) { return o && o.zonaId; }).map(function (z) {
            // pointer.x/y llegan con el evento; worldX/worldY se actualizan en el siguiente cuadro y en el
            // primer toque pueden traer la posición anterior (la cámara no se mueve: son iguales).
            var p = localDeZona(z, pointer.x, pointer.y);
            // Phaser ya comprobó que cayó en el área táctil (quizá agrandada); la cercanía se mide con el dibujo.
            return { id: z.zonaId, dentro: true, d: global.Retos.distanciaNormalizada(p.x, p.y, { x: 0, y: 0, rx: z.def.rx, ry: z.def.ry }) };
        });
        var id = global.Retos.elegirZona(candidatos);
        ultimoToque = { x: pointer.x, y: pointer.y, candidatos: candidatos, elegida: id };
        if (!id) return;
        var r = sc.game.canvas.getBoundingClientRect();
        onToque(id, { x: r.left + pointer.x * (r.width / sc.scale.width), y: r.top + pointer.y * (r.height / sc.scale.height) });
    }

    // ------------------------------------------------------------------ espejo

    function armarEspejo() {
        // Orden: marco (debajo), vidrio y su destello (encima del marco), luego Zoe y las bombillas.
        gMarco = sc.add.graphics();
        gVidrio = sc.add.graphics();
        brilloVidrio = sc.add.graphics();
        brilloVidrio.setBlendMode(Phaser.BlendModes.ADD);
        brilloVidrio.setAlpha(0);
        for (var i = 0; i < 6; i++) {
            var e = sc.add.image(0, 0, "fx-estrella");
            e.setTint(i % 2 ? 0xffffff : 0xfff2a8);
            e.setAlpha(0);
            estrellasVidrio.push(e);
        }
    }

    function dibujarEspejo() {
        var x = rect.x, y = rect.y, w = rect.w, h = rect.h;
        var borde = Math.max(18, Math.round(w * 0.075));
        rect.vx = x + borde;
        rect.vy = y + borde;
        rect.vw = w - borde * 2;
        rect.vh = h - borde * 2;
        var radio = Math.round(w * 0.08);

        gMarco.clear();
        // sombra del marco
        gMarco.fillStyle(0x4a2a6a, 0.22);
        gMarco.fillRoundedRect(x + 6, y + 10, w, h, radio);
        // marco lila con borde dorado
        gMarco.fillStyle(0xf3d6ff, 1);
        gMarco.fillRoundedRect(x, y, w, h, radio);
        gMarco.fillStyle(0xe3b6f5, 1);
        gMarco.fillRoundedRect(x + borde * 0.18, y + borde * 0.18, w - borde * 0.36, h - borde * 0.36, radio * 0.9);
        gMarco.lineStyle(2, 0xffffff, 0.7);
        gMarco.strokeRoundedRect(x + 2, y + 2, w - 4, h - 4, radio);

        gVidrio.clear();
        gVidrio.fillGradientStyle(0xf2fbff, 0xf6f0ff, 0xd9f0fc, 0xece2ff, 1);
        gVidrio.fillRoundedRect(rect.vx, rect.vy, rect.vw, rect.vh, radio * 0.5);
        // reflejos diagonales
        gVidrio.fillStyle(0xffffff, 0.35);
        gVidrio.beginPath();
        gVidrio.moveTo(rect.vx + rect.vw * 0.08, rect.vy);
        gVidrio.lineTo(rect.vx + rect.vw * 0.24, rect.vy);
        gVidrio.lineTo(rect.vx, rect.vy + rect.vh * 0.32);
        gVidrio.lineTo(rect.vx, rect.vy + rect.vh * 0.12);
        gVidrio.closePath();
        gVidrio.fillPath();
        gVidrio.fillStyle(0xffffff, 0.22);
        gVidrio.beginPath();
        gVidrio.moveTo(rect.vx + rect.vw, rect.vy + rect.vh * 0.62);
        gVidrio.lineTo(rect.vx + rect.vw, rect.vy + rect.vh * 0.74);
        gVidrio.lineTo(rect.vx + rect.vw * 0.8, rect.vy + rect.vh);
        gVidrio.lineTo(rect.vx + rect.vw * 0.7, rect.vy + rect.vh);
        gVidrio.closePath();
        gVidrio.fillPath();
        // piso del reflejo
        gVidrio.fillStyle(0xd9c4f2, 0.55);
        gVidrio.fillEllipse(rect.vx + rect.vw / 2, rect.vy + rect.vh * 0.965, rect.vw * 0.95, rect.vh * 0.09);

        // borde dorado del vidrio
        gVidrio.lineStyle(Math.max(3, borde * 0.14), 0xf6c95a, 1);
        gVidrio.strokeRoundedRect(rect.vx, rect.vy, rect.vw, rect.vh, radio * 0.5);

        brilloVidrio.clear();
        brilloVidrio.fillStyle(0xfff6c8, 1);
        brilloVidrio.fillRoundedRect(rect.vx, rect.vy, rect.vw, rect.vh, radio * 0.5);

        // estrellitas del vidrio en lugares fijos (proporción del vidrio)
        var pos = [[0.12, 0.2], [0.86, 0.14], [0.9, 0.46], [0.1, 0.58], [0.82, 0.8], [0.18, 0.86]];
        estrellasVidrio.forEach(function (e, i) {
            e.setPosition(rect.vx + rect.vw * pos[i][0], rect.vy + rect.vh * pos[i][1]);
            e.escalaBase = (rect.vw * (i % 2 ? 0.05 : 0.07)) / 48;
            e.setScale(e.escalaBase);
        });

        dibujarBombillas(borde, radio);
    }

    function dibujarBombillas(borde, radio) {
        bombillas.forEach(function (b) { b.destroy(); });
        bombillas = [];
        var x = rect.x, y = rect.y, w = rect.w, h = rect.h;
        var m = borde / 2;
        var paso = Math.max(30, Math.min(56, w / 8));
        var puntos = [];
        var lados = [
            [x + m + radio * 0.4, y + m, x + w - m - radio * 0.4, y + m],
            [x + w - m, y + m + radio * 0.4, x + w - m, y + h - m - radio * 0.4],
            [x + w - m - radio * 0.4, y + h - m, x + m + radio * 0.4, y + h - m],
            [x + m, y + h - m - radio * 0.4, x + m, y + m + radio * 0.4]
        ];
        lados.forEach(function (l) {
            var largo = Math.hypot(l[2] - l[0], l[3] - l[1]);
            var n = Math.max(2, Math.round(largo / paso));
            for (var i = 0; i < n; i++) {
                var t = i / n;
                puntos.push([l[0] + (l[2] - l[0]) * t, l[1] + (l[3] - l[1]) * t]);
            }
        });
        var tam = Math.max(20, borde * 1.15);
        puntos.forEach(function (p, i) {
            var b = sc.add.image(p[0], p[1], "fx-bombilla");
            b.setTint(COLORES_BOMBILLA[i % COLORES_BOMBILLA.length]);
            b.setBlendMode(Phaser.BlendModes.ADD);
            b.escalaBase = tam / 64;
            b.setScale(b.escalaBase);
            b.indice = i;
            b.setDepth(2);
            bombillas.push(b);
        });
        luces(modoLuces);
    }

    /** Ritmo de las bombillas: calma (parpadeo suave), acierto (ola rápida), fiesta (persecución). */
    function luces(modo) {
        modoLuces = modo || "calma";
        bombillas.forEach(function (b) {
            sc.tweens.killTweensOf(b);
            b.setAlpha(1);
            b.setScale(b.escalaBase);
            if (reducido) return;
            var i = b.indice;
            if (modoLuces === "calma") {
                sc.tweens.add({
                    targets: b, alpha: 0.45, duration: 900 + (i % 5) * 170, delay: (i * 137) % 1300,
                    yoyo: true, repeat: -1, ease: "Sine.easeInOut"
                });
            } else if (modoLuces === "acierto") {
                sc.tweens.add({
                    targets: b, scale: b.escalaBase * 1.5, alpha: 1, duration: 160, delay: i * 22,
                    yoyo: true, repeat: 1, ease: "Quad.easeOut",
                    onComplete: function () { if (modoLuces === "acierto" && b.indice === bombillas.length - 1) luces("calma"); }
                });
            } else {
                sc.tweens.add({
                    targets: b, alpha: 0.25, scale: b.escalaBase * 1.35, duration: 220, delay: (i % 6) * 70,
                    yoyo: true, repeat: -1, ease: "Sine.easeInOut"
                });
            }
        });
    }

    function animarEstrellasVidrio() {
        if (reducido) return;
        estrellasVidrio.forEach(function (e, i) {
            sc.tweens.add({
                targets: e, alpha: { from: 0, to: 0.95 }, angle: 90,
                duration: 1100, delay: 600 + i * 900, hold: 300, yoyo: true,
                repeat: -1, repeatDelay: 2600 + (i % 3) * 700, ease: "Sine.easeInOut"
            });
        });
    }

    // ------------------------------------------------------------------ diseño

    function reacomodar() {
        if (!sc || !obj.zoe) return;
        var W = sc.scale.width;
        var H = sc.scale.height;
        if (W < 10 || H < 10) return;
        var aspecto = 0.74;
        var h = Math.min(H * 0.97, (W * 0.97) / aspecto);
        var w = h * aspecto;
        rect.w = w;
        rect.h = h;
        rect.x = (W - w) / 2;
        rect.y = (H - h) / 2;
        dibujarEspejo();
        // Zoe ocupa casi todo el alto del vidrio, con los pies sobre el piso del reflejo.
        var escala = (rect.vh * 0.9) / G.alto;
        escala = Math.min(escala, (rect.vw * 0.98) / 560);
        rect.escala = escala;
        obj.zoe.setScale(escala);
        obj.zoe.baseY = rect.vy + rect.vh * 0.965;
        obj.zoe.baseX = rect.vx + rect.vw / 2;
        if (!obj.zoe.enDesfile) obj.zoe.setPosition(obj.zoe.baseX, obj.zoe.baseY);
        obj.zoe.baseEscala = escala;
        ajustarZonas(escala);
        if (particulas) particulas.setDepth(10);
    }

    /**
     * En pantallas chicas el área táctil crece hasta un mínimo en píxeles (cara 26 px, manos 36 px de radio),
     * sin pasar de 1,7 veces el dibujo. Entre zonas que se pisan gana la más cercana (Retos.elegirZona).
     */
    function ajustarZonas(escala) {
        Object.keys(zonas).forEach(function (id) {
            if (id === "cuerpo") return;
            var z = zonas[id];
            var base = G.zonas[id];
            var minPx = id.indexOf("mano") === 0 ? 36 : 26;
            var k = Math.min(1.7, Math.max(1, minPx / (Math.min(base.rx, base.ry) * escala)));
            var rx = base.rx * k;
            var ry = base.ry * k;
            z.setSize(rx * 2, ry * 2);
            if (z.input && z.input.hitArea) z.input.hitArea.setTo(rx, ry, rx * 2, ry * 2);
            z.factorToque = k;
        });
    }

    // ------------------------------------------------------------------ efectos

    function zonaDe(id) {
        if (zonas[id]) return [zonas[id]];
        if (global.Retos) return global.Retos.zonasDeParte(id).map(function (z) { return zonas[z]; }).filter(Boolean);
        return [];
    }

    function mundoDe(zona) {
        var m = zona.getWorldTransformMatrix();
        return { x: m.tx, y: m.ty };
    }

    function puntoDe(id) {
        var lista = zonaDe(id);
        if (!lista.length || !sc) return null;
        // Para "ojos" o "manos", la primera zona (ojo/mano izquierda de Zoe = derecha de la pantalla).
        var p = mundoDe(lista[0]);
        var r = sc.game.canvas.getBoundingClientRect();
        return { x: r.left + p.x * (r.width / sc.scale.width), y: r.top + p.y * (r.height / sc.scale.height) };
    }

    function brillo(id, opts) {
        opts = opts || {};
        var on = opts.on !== false;
        var lista = global.Retos ? (zonas[id] ? [id] : global.Retos.zonasDeParte(id)) : [id];
        lista.forEach(function (zid) {
            var h = halos[zid];
            if (!h) return;
            sc.tweens.killTweensOf(h);
            if (!on) {
                sc.tweens.add({ targets: h, alpha: 0, duration: 250 });
                return;
            }
            h.setScale(h.baseX, h.baseY);
            if (opts.fuerte) {
                h.setAlpha(1);
                sc.tweens.add({ targets: h, scaleX: h.baseX * 1.35, scaleY: h.baseY * 1.35, alpha: 0, duration: 900, ease: "Quad.easeOut" });
            } else {
                h.setAlpha(0.15);
                sc.tweens.add({
                    targets: h, alpha: 0.75, scaleX: h.baseX * 1.18, scaleY: h.baseY * 1.18, duration: 800,
                    yoyo: true, repeat: -1, ease: "Sine.easeInOut"
                });
            }
        });
    }

    function estrellas(x, y, n, colores, fuerza) {
        if (!sc || reducido) return;
        var e = sc.add.particles(x, y, n > 14 ? "fx-estrella" : "fx-chispa", {
            speed: { min: 120 * (fuerza || 1), max: 320 * (fuerza || 1) },
            angle: { min: 0, max: 360 },
            scale: { start: Math.max(0.35, rect.escala * 0.9), end: 0 },
            lifespan: { min: 500, max: 1000 },
            rotate: { min: 0, max: 360 },
            gravityY: 260,
            tint: colores || [0xffe066, 0xff8fc7, 0x7cf3ff, 0xffffff],
            blendMode: "ADD",
            emitting: false
        });
        e.setDepth(10);
        e.explode(n || 12);
        sc.time.delayedCall(1300, function () { e.destroy(); });
    }

    function destello(alpha) {
        if (!brilloVidrio) return;
        sc.tweens.killTweensOf(brilloVidrio);
        brilloVidrio.setAlpha(alpha != null ? alpha : 0.6);
        sc.tweens.add({ targets: brilloVidrio, alpha: 0, duration: reducido ? 200 : 900, ease: "Quad.easeOut" });
    }

    /**
     * Final: el vidrio destella y el espejo (marco, vidrio, bombillas y estrellitas) se desvanece; Zoe queda
     * parada en el cuarto, lista para desfilar por la pasarela del fondo. Promise con respaldo por tiempo.
     */
    function salirDelEspejo() {
        if (!sc) return Promise.resolve();
        obj.zoe.enDesfile = true;
        destello(1);
        var piezas = [gMarco, gVidrio].concat(bombillas, estrellasVidrio);
        bombillas.forEach(function (b) { sc.tweens.killTweensOf(b); });
        estrellasVidrio.forEach(function (e) { sc.tweens.killTweensOf(e); });
        var r = rect;
        estrellas(r.vx + r.vw / 2, r.vy + r.vh * 0.5, 28, null, 1.6);
        return new Promise(function (resolve) {
            sc.tweens.add({ targets: piezas, alpha: 0, duration: reducido ? 150 : 900, delay: 250, ease: "Quad.easeIn", onComplete: resolve });
            setTimeout(resolve, 1500);
        });
    }

    /** Mundo → pantalla. */
    function aPantalla(x, y) {
        var r = sc.game.canvas.getBoundingClientRect();
        return { x: r.left + x * (r.width / sc.scale.width), y: r.top + y * (r.height / sc.scale.height) };
    }

    /**
     * Phaser guarda la posición del lienzo y solo la renueva al cambiar de tamaño. Si el lienzo se mueve sin
     * cambiar de tamaño (la cabecera se reacomoda al cargar la fuente, aparece el progreso…), los toques se
     * leían desplazados (hasta 42 px: un toque al ojo caía en la boca). Se renueva antes de cada toque, en la
     * fase de captura del contenedor (antes de que Phaser lo procese), y cuando cambia el diseño.
     */
    function vigilarPosicion(el) {
        var renovar = function () {
            if (sc && sc.scale) sc.scale.updateBounds();
        };
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

    // ------------------------------------------------------------------ montaje

    function montar(el, opts) {
        opts = opts || {};
        if (typeof opts.onToque === "function") onToque = opts.onToque;
        if (listoPromesa) return listoPromesa;
        if (!Phaser || !P) {
            console.warn("[EspejoPhaser] falta Phaser o Personaje");
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
                        sc.input.topOnly = false;
                        texturasFx();
                        armarEspejo();
                        var claves = Object.keys(P.SVG);
                        Promise.all(claves.map(function (k) { return cargarSvg(k, P.SVG[k]); })).then(function () {
                            armarZoe();
                            reacomodar();
                            animarEstrellasVidrio();
                            sc.input.on("pointerdown", alTocar);
                            sc.scale.on("resize", reacomodar);
                            vigilarPosicion(el);
                            resolve(true);
                        });
                    }
                }
            });
            global.__espejoPhaser = juego;
        });
        return listoPromesa;
    }

    global.EspejoPhaser = {
        montar: montar,
        listo: function () { return !!(sc && obj.zoe); },
        reacomodar: reacomodar,
        puntoDe: puntoDe,
        aPantalla: aPantalla,
        mundoDe: function (id) { var l = zonaDe(id); return l.length ? mundoDe(l[0]) : null; },
        rectEspejo: function () {
            if (!sc) return null;
            var a = aPantalla(rect.x, rect.y);
            var b = aPantalla(rect.x + rect.w, rect.y + rect.h);
            return { left: a.x, top: a.y, width: b.x - a.x, height: b.y - a.y, right: b.x, bottom: b.y };
        },
        rect: function () { return rect; },
        objetos: function () { return obj; },
        escena: function () { return sc; },
        habilitar: function (on) { habilitado = !!on; },
        habilitado: function () { return habilitado; },
        brillo: brillo,
        estrellas: estrellas,
        luces: luces,
        destello: destello,
        salirDelEspejo: salirDelEspejo,
        zonas: function () { return zonas; },
        ultimoToque: function () { return ultimoToque; },
        RES: RES
    };
})(window);
