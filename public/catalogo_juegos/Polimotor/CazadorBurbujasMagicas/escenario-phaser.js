/**
 * EscenarioBurbujas — escena Phaser 4 de "El Cazador de Burbujas Mágicas" (window.EscenarioBurbujas).
 *
 * Dibuja en #escenario-phaser el parque mágico, la canasta de Zoe con los juguetes recogidos y las burbujas.
 * El cielo, el sol y las nubes son CSS (detrás del lienzo transparente). El parque colorido se pinta una
 * vez por tamaño en un canvas 2D (colinas verdes, árboles redondos rosados, lilas, verdes y durazno con
 * contorno, cerca de colores, letrero PEDNIA, banca, faroles, canteros de tulipanes, pasto con franjas de
 * podado y camino de baldosas) y se usa como textura; un segundo canvas pinta el pasto del primer plano, que
 * queda delante de la canasta y de la base de las burbujas. Motas de luz flotan en el aire.
 * La escena dibuja y anima; script.js decide (con ReglasBurbujas) cuándo sale cada burbuja y qué pasa al
 * tocarla.
 *
 * Juguetes: config.objetos[] con `icono` (SVG de IconosBurbujas) o `imagen` (archivo en img/: los juguetes
 * que ya existían en otros juegos de Polimotor). Todos quedan como textura "ico-<id>".
 *
 * Burbuja normal: un toque. Burbuja fuerte (op.toques 2-3): doble pared dorada y puntitos debajo con los
 * toques que faltan; cada toque la sacude como gelatina, hasta que el último la revienta.
 *
 * API:
 *   montar(el, cfg) → Promise · listo() · reacomodar() · escena() · diseno() · config()
 *   alTocar(fn(id)) · alEscapar(fn(id)) · alTocarVacio(fn(x, y))
 *   soltar(op) → id      op: { objeto, x, r, subidaMs, vaiven, altura, interactiva, demo, alfa, toques }
 *   golpe(id) → toques que faltan (0 = ya se puede reventar) · hayFuerte()
 *   cercanas(y, banda) · activas() · burbujas() → [{ id, objeto, x, y, r, estado, toques, restantes }]
 *   reventar(id) → Promise   estallido + el juguete vuela a la canasta (resuelve al caer)
 *   dejarIr() · destacar(id, on) · masVisible()
 *   puntoDe(id) · puntoCanasta() · zonaZoe() → coordenadas de pantalla
 *   vaciarCanasta() · celebrarCanasta() · enCanasta() · decorar(on)
 *   estrellas(x, y, n) · lluvia(ms) · iluminar(on) · flotante(x, y, texto) · aPantalla(x, y)
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser || null;
    var I = global.IconosBurbujas;
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);

    var RES = 2;
    var ICO = 240;             // lado de la textura de cada juguete
    var COLORES_FIESTA = [0xffe066, 0xff8fc7, 0x7cf3ff, 0x9df59a, 0xffb36b, 0xc9a7ff];
    var ICONO = 1.18;          // tamaño del juguete respecto del radio de la burbuja
    var ALCANCE = 1.2;         // radio táctil respecto del radio dibujado
    // Huecos de la canasta (unidades del dibujo: 200 de ancho, (0,0) abajo al centro).
    var HUECOS = [
        [-58, -64], [-20, -66], [18, -64], [56, -62],
        [-48, -80], [-12, -84], [24, -82], [56, -78],
        [-30, -96], [6, -100], [40, -96], [4, -114]
    ];

    var cfg = null;
    var juego = null;
    var sc = null;
    var listoPromesa = null;
    var fondoIm = null;
    var lejosIm = null;
    var arboles = [];
    var petalos = [];
    var mariposas = [];
    var frenteIm = null;
    var motas = null;
    var luz = null;
    var tamPintado = "";
    var canasta = { atras: null, frente: null, k: 1, items: [] };
    var lista = [];
    var sigId = 1;
    var cb = { toque: null, escape: null, vacio: null };
    var decorando = null;
    var lay = { W: 0, H: 0, rBase: 300, horizonte: 0, carrilMin: 0, carrilMax: 0, zoe: { x: 0, y: 0, w: 0, h: 0 }, canasta: { x: 0, y: 0, w: 0 } };

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

    /** Tween con respaldo por tiempo: con la pestaña oculta Phaser no avanza y la Promise igual se resuelve. */
    function tw(conf) {
        return new Promise(function (resolve) {
            var hecho = false;
            var fin = function () {
                if (hecho) return;
                hecho = true;
                resolve();
            };
            var dur = reducido ? Math.min(conf.duration || 0, 120) : (conf.duration || 0);
            var c = Object.assign({}, conf, { duration: dur });
            var oc = conf.onComplete;
            c.onComplete = function () {
                if (oc) oc();
                fin();
            };
            if (!sc) { fin(); return; }
            sc.tweens.add(c);
            setTimeout(fin, dur + (conf.delay || 0) + 300);
        });
    }

    // ------------------------------------------------------------------ texturas

    function origen(s) {
        var m = /viewBox="([^"]+)"/.exec(s || "");
        if (!m) return { x: 0.5, y: 0.5, w: 0, h: 0 };
        var v = m[1].split(/[\s,]+/).map(Number);
        return { x: -v[0] / v[2], y: -v[1] / v[3], w: v[2], h: v[3] };
    }

    function cargarSvg(clave, s, ancho, alto) {
        return new Promise(function (resolve) {
            var o = origen(s);
            var w = ancho || o.w;
            var h = alto || o.h;
            var img = new Image();
            img.onload = function () {
                var c = document.createElement("canvas");
                c.width = Math.ceil(w * RES);
                c.height = Math.ceil(h * RES);
                c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
                if (sc.textures.exists(clave)) sc.textures.remove(clave);
                sc.textures.addCanvas(clave, c);
                resolve();
            };
            img.onerror = function () {
                console.warn("[EscenarioBurbujas] no se pudo dibujar", clave);
                resolve();
            };
            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
        });
    }

    /** Dibuja una imagen centrada (sin deformarla) en un lienzo cuadrado de ICO px y la guarda como textura. */
    function texturaCuadrada(clave, img, w, h) {
        var c = document.createElement("canvas");
        c.width = ICO;
        c.height = ICO;
        var k = Math.min(ICO / w, ICO / h) * 0.96;
        c.getContext("2d").drawImage(img, (ICO - w * k) / 2, (ICO - h * k) / 2, w * k, h * k);
        if (sc.textures.exists(clave)) sc.textures.remove(clave);
        sc.textures.addCanvas(clave, c);
    }

    /** Juguete desde un archivo (SVG o PNG de img/): los SVG se leen como texto para conocer su viewBox. */
    function cargarImagen(clave, url) {
        return new Promise(function (resolve) {
            var fallo = function () {
                console.warn("[EscenarioBurbujas] no se pudo cargar", url);
                resolve();
            };
            var conImagen = function (src, w, h) {
                var img = new Image();
                img.onload = function () {
                    texturaCuadrada(clave, img, w || img.naturalWidth || ICO, h || img.naturalHeight || ICO);
                    resolve();
                };
                img.onerror = fallo;
                img.src = src;
            };
            if (/\.svg(\?|$)/i.test(url)) {
                fetch(url).then(function (r) { return r.text(); }).then(function (t) {
                    var o = origen(t);
                    var w = o.w || 200;
                    var h = o.h || 200;
                    // sin width/height el navegador no sabe su tamaño: se le pone el del viewBox
                    if (!/<svg[^>]*\swidth=/.test(t)) t = t.replace("<svg", '<svg width="' + w + '" height="' + h + '"');
                    conImagen("data:image/svg+xml;charset=utf-8," + encodeURIComponent(t), w, h);
                }).catch(fallo);
            } else {
                conImagen(url);
            }
        });
    }

    function texturaCanvas(clave, w, h, dibujar) {
        if (sc.textures.exists(clave)) return;
        var c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        dibujar(c.getContext("2d"), w, h);
        sc.textures.addCanvas(clave, c);
    }

    function anilloIris(ctx, cx, cy, alfa) {
        if (!ctx.createConicGradient) return "rgba(120,190,255," + alfa + ")";
        var g = ctx.createConicGradient(0, cx, cy);
        g.addColorStop(0, "rgba(255,120,200," + alfa + ")");
        g.addColorStop(0.2, "rgba(255,214,80," + alfa + ")");
        g.addColorStop(0.4, "rgba(90,230,180," + alfa + ")");
        g.addColorStop(0.6, "rgba(80,170,255," + alfa + ")");
        g.addColorStop(0.8, "rgba(180,120,255," + alfa + ")");
        g.addColorStop(1, "rgba(255,120,200," + alfa + ")");
        return g;
    }

    /** Cuerpo de burbuja: casi transparente al centro, borde azulado, anillo iridiscente, reflejo abajo. */
    function pintarBurbuja(ctx, s, fuerte) {
        var c = s / 2;
        var R = s / 2 - 4;
        var g = ctx.createRadialGradient(c * 0.82, c * 0.76, R * 0.1, c, c, R);
        g.addColorStop(0, fuerte ? "rgba(255,248,220,0.2)" : "rgba(255,255,255,0.14)");
        g.addColorStop(0.55, fuerte ? "rgba(255,230,170,0.26)" : "rgba(200,232,255,0.24)");
        g.addColorStop(0.84, fuerte ? "rgba(255,196,90,0.5)" : "rgba(130,196,255,0.5)");
        g.addColorStop(0.96, "rgba(255,255,255,0.92)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(c, c, R, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = anilloIris(ctx, c, c, 0.85);
        ctx.lineWidth = fuerte ? 16 : 10;
        ctx.beginPath();
        ctx.arc(c, c, R - (fuerte ? 10 : 8), 0, Math.PI * 2);
        ctx.stroke();
        if (fuerte) {
            // segunda pared: la burbuja fuerte se ve más gruesa y dorada
            ctx.strokeStyle = "rgba(255,212,59,0.9)";
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(c, c, R * 0.8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = "rgba(255,255,255,0.7)";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(c, c, R * 0.8 - 5, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.strokeStyle = "rgba(255,255,255,0.95)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(c, c, R - 2.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = fuerte ? "rgba(214,140,0,0.75)" : "rgba(40,120,210,0.55)";
        ctx.lineWidth = fuerte ? 3.5 : 2.5;
        ctx.beginPath();
        ctx.arc(c, c, R - 0.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 7;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(c, c, R * 0.74, Math.PI * 0.12, Math.PI * 0.5);
        ctx.stroke();
    }

    function texturas() {
        texturaCanvas("burbuja", 256, 256, function (ctx, s) { pintarBurbuja(ctx, s, false); });
        texturaCanvas("burbuja-fuerte", 256, 256, function (ctx, s) { pintarBurbuja(ctx, s, true); });
        // Brillo principal (arriba a la izquierda): capa aparte para que se mueva un poco con la burbuja.
        texturaCanvas("burbuja-brillo", 256, 256, function (ctx, s) {
            var c = s / 2;
            ctx.save();
            ctx.translate(c * 0.62, c * 0.48);
            ctx.rotate(-0.65);
            ctx.scale(1, 0.5);
            var g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.17);
            g.addColorStop(0, "rgba(255,255,255,0.95)");
            g.addColorStop(0.55, "rgba(255,255,255,0.55)");
            g.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.17, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            ctx.fillStyle = "rgba(255,255,255,0.9)";
            ctx.beginPath();
            ctx.arc(c * 0.4, c * 0.78, s * 0.025, 0, Math.PI * 2);
            ctx.fill();
        });
        texturaCanvas("fx-halo", 128, 128, function (ctx, s) {
            var g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
            g.addColorStop(0, "rgba(255,255,255,0.95)");
            g.addColorStop(0.4, "rgba(255,255,255,0.5)");
            g.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, s, s);
        });
        texturaCanvas("fx-estrella", 48, 48, function (ctx, s) {
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
        texturaCanvas("fx-chispa", 32, 32, function (ctx, s) {
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
        // Gotita de jabón: esfera clara con brillo (cae con gravedad tras el estallido).
        texturaCanvas("fx-gotita", 32, 32, function (ctx, s) {
            var g = ctx.createRadialGradient(s * 0.38, s * 0.35, 1, s / 2, s / 2, s / 2 - 2);
            g.addColorStop(0, "rgba(255,255,255,1)");
            g.addColorStop(0.45, "rgba(220,240,255,0.75)");
            g.addColorStop(1, "rgba(120,190,255,0.35)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "rgba(60,140,230,0.75)";
            ctx.lineWidth = 2;
            ctx.stroke();
        });
        // Trozo de la película de la burbuja: arco iridiscente que sale volando al estallar.
        texturaCanvas("fx-arco", 96, 40, function (ctx, w, h) {
            var g = ctx.createLinearGradient(0, 0, w, 0);
            g.addColorStop(0, "rgba(255,120,200,0)");
            g.addColorStop(0.2, "rgba(255,150,210,0.95)");
            g.addColorStop(0.45, "rgba(255,226,110,0.95)");
            g.addColorStop(0.7, "rgba(100,220,255,0.95)");
            g.addColorStop(1, "rgba(180,130,255,0)");
            ctx.lineCap = "round";
            ctx.strokeStyle = "rgba(40,120,210,0.45)";
            ctx.lineWidth = 11;
            ctx.beginPath();
            ctx.arc(w / 2, h * 2.6, h * 2.3, Math.PI * 1.37, Math.PI * 1.63);
            ctx.stroke();
            ctx.strokeStyle = g;
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.arc(w / 2, h * 2.6, h * 2.3, Math.PI * 1.36, Math.PI * 1.64);
            ctx.stroke();
            ctx.strokeStyle = "rgba(255,255,255,0.9)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(w / 2, h * 2.6, h * 2.3 - 3, Math.PI * 1.4, Math.PI * 1.6);
            ctx.stroke();
        });
        // Mota de luz que flota en el aire del parque.
        texturaCanvas("fx-mota", 32, 32, function (ctx, s) {
            var g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
            g.addColorStop(0, "rgba(255,255,230,0.95)");
            g.addColorStop(0.35, "rgba(255,250,200,0.45)");
            g.addColorStop(1, "rgba(255,250,200,0)");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, s, s);
        });
    }

    // Canasta de mimbre con volumen (degradados): la parte de atrás (asa y boca) va detrás de los juguetes;
    // el frente tejido, delante. (0,0) abajo al centro.
    var CANASTA = {
        atras: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 -140 200 142" width="200" height="142">' +
            '<defs><linearGradient id="asa" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a4116"/><stop offset=".5" stop-color="#d9a066"/><stop offset="1" stop-color="#7a4116"/></linearGradient>' +
            '<radialGradient id="boca" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="#3d1f08"/><stop offset="1" stop-color="#6b3a16"/></radialGradient></defs>' +
            '<path d="M-72,-62 Q-74,-136 0,-136 Q74,-136 72,-62" fill="none" stroke="#5e3410" stroke-width="15" stroke-linecap="round"/>' +
            '<path d="M-72,-62 Q-74,-136 0,-136 Q74,-136 72,-62" fill="none" stroke="url(#asa)" stroke-width="10" stroke-linecap="round"/>' +
            '<path d="M-60,-100 Q-40,-128 0,-130" fill="none" stroke="#f3cf9e" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>' +
            '<ellipse cx="0" cy="-62" rx="90" ry="20" fill="url(#boca)" stroke="#8a4b1f" stroke-width="5"/></svg>',
        frente: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 -140 200 142" width="200" height="142">' +
            '<defs><linearGradient id="cuerpo" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9a5a24"/><stop offset=".35" stop-color="#d79a58"/>' +
            '<stop offset=".7" stop-color="#c4813f"/><stop offset="1" stop-color="#7d4317"/></linearGradient>' +
            '<linearGradient id="sombra" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#2b1300" stop-opacity=".35"/></linearGradient>' +
            '<linearGradient id="borde" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b57434"/><stop offset=".4" stop-color="#f2c48a"/><stop offset="1" stop-color="#a0602a"/></linearGradient></defs>' +
            '<path d="M-90,-62 Q0,-38 90,-62 L72,-6 Q0,8 -72,-6 Z" fill="url(#cuerpo)" stroke="#6b3a12" stroke-width="4" stroke-linejoin="round"/>' +
            '<g stroke="#8a4f1e" stroke-width="3.5" fill="none" opacity=".85">' +
            '<path d="M-86,-48 Q0,-26 86,-48"/><path d="M-82,-34 Q0,-12 82,-34"/><path d="M-77,-20 Q0,2 77,-20"/></g>' +
            '<g stroke="#f0c48c" stroke-width="2" fill="none" opacity=".55">' +
            '<path d="M-86,-51 Q0,-29 86,-51"/><path d="M-82,-37 Q0,-15 82,-37"/><path d="M-77,-23 Q0,-1 77,-23"/></g>' +
            '<g stroke="#7a4116" stroke-width="3" opacity=".7"><path d="M-60,-52 L-54,-6 M-32,-46 L-29,-1 M0,-44 L0,1 M32,-46 L29,-1 M60,-52 L54,-6"/></g>' +
            '<path d="M-90,-62 Q0,-38 90,-62 L72,-6 Q0,8 -72,-6 Z" fill="url(#sombra)"/>' +
            '<path d="M-92,-62 Q0,-36 92,-62" fill="none" stroke="#6b3a12" stroke-width="13" stroke-linecap="round"/>' +
            '<path d="M-92,-62 Q0,-36 92,-62" fill="none" stroke="url(#borde)" stroke-width="9" stroke-linecap="round"/>' +
            '<g transform="translate(-60,-54)"><path d="M0,0 L-20,-12 L-20,12 Z M0,0 L20,-12 L20,12 Z" fill="#ff6fae" stroke="#c2255c" stroke-width="3" stroke-linejoin="round"/>' +
            '<circle r="6" fill="#ff8fc7" stroke="#c2255c" stroke-width="3"/></g></svg>'
    };

    function imagenDe(clave, svgTexto) {
        var o = origen(svgTexto);
        var im = sc.add.image(0, 0, clave);
        im.setOrigin(o.x, o.y);
        im.setScale(1 / RES);
        return im;
    }

    // ------------------------------------------------------------------ parque pintado (canvas 2D)

    var semilla = 7;
    function azar() {
        semilla = (semilla * 9301 + 49297) % 233280;
        return semilla / 233280;
    }

    function silueta(ctx, base, alto, ondas, fase, W, H) {
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (var i = 0; i <= 60; i++) {
            var x = (W * i) / 60;
            var u = i / 60;
            var y = base - alto * (0.55 + 0.3 * Math.sin(u * Math.PI * ondas + fase) + 0.15 * Math.sin(u * Math.PI * ondas * 2.7 + fase * 1.7));
            ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H);
        ctx.closePath();
    }

    // Paletas de copa (parque colorido como la imagen de referencia): rosada, lila, verde y durazno.
    var COPAS = {
        rosa: { luz: "#ffe0f0", medio: "#ff8cc6", sombra: "#e0559f", borde: "#a8236c", flor: "#ffffff" },
        lila: { luz: "#efe6ff", medio: "#b79cff", sombra: "#8662e6", borde: "#5536b0", flor: "#ffe066" },
        verde: { luz: "#d6fca8", medio: "#7fd955", sombra: "#43a83a", borde: "#2a7425", flor: "#ff8fc7" },
        durazno: { luz: "#fff1c9", medio: "#ffc35c", sombra: "#f59f00", borde: "#b86300", flor: "#ffffff" }
    };

    function sombraSuelo(ctx, x, y, rx, ry, al) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ry / rx);
        var g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        g.addColorStop(0, "rgba(30,90,30," + al + ")");
        g.addColorStop(1, "rgba(30,90,30,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, rx, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function arbusto(ctx, x, y, w, color) {
        var base = color || "verde";
        var p = COPAS[base];
        sombraSuelo(ctx, x, y, w * 0.6, w * 0.1, 0.3);
        var bolas = [];
        for (var i = 0; i < 7; i++) {
            bolas.push({ x: x + (i / 6 - 0.5) * w * 0.8, y: y - w * 0.16 - Math.sin((i / 6) * Math.PI) * w * 0.14 - azar() * w * 0.05, r: w * (0.17 + azar() * 0.07) });
        }
        ctx.fillStyle = p.borde;
        bolas.forEach(function (b) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 2.5, 0, Math.PI * 2); ctx.fill(); });
        bolas.forEach(function (b) {
            var g = ctx.createRadialGradient(b.x + b.r * 0.3, b.y - b.r * 0.4, b.r * 0.1, b.x, b.y, b.r);
            g.addColorStop(0, p.luz);
            g.addColorStop(0.5, p.medio);
            g.addColorStop(1, p.sombra);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
        });
        var cols = ["#ff6fae", "#ffd43b", "#b197fc", "#ffffff", "#ff922b", "#4dabf7"];
        for (var k = 0; k < 9; k++) {
            flor(ctx, x + (azar() - 0.5) * w * 0.75, y - w * 0.14 - azar() * w * 0.24, w * 0.035, cols[k % cols.length]);
        }
    }

    function brizna(ctx, x, y, alto, color, ancho) {
        var inc = (azar() - 0.5) * alto * 0.7;
        ctx.strokeStyle = color;
        ctx.lineWidth = ancho;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + inc * 0.3, y - alto * 0.6, x + inc, y - alto);
        ctx.stroke();
    }

    function flor(ctx, x, y, r, color) {
        ctx.fillStyle = color;
        for (var q = 0; q < 5; q++) {
            var a = (q / 5) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.85, r * 0.75, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = color === "#ffd43b" || color === "#ffe066" ? "#ff922b" : "#ffd43b";
        ctx.beginPath();
        ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
        ctx.fill();
    }

    function tulipan(ctx, x, y, h, color) {
        ctx.strokeStyle = "#2f9e44";
        ctx.lineWidth = Math.max(2, h * 0.08);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - h * 0.7);
        ctx.stroke();
        ctx.fillStyle = "#51cf66";
        ctx.beginPath();
        ctx.ellipse(x + h * 0.12, y - h * 0.3, h * 0.14, h * 0.05, -0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x - h * 0.17, y - h * 0.95);
        ctx.lineTo(x - h * 0.08, y - h * 0.8);
        ctx.lineTo(x, y - h * 0.97);
        ctx.lineTo(x + h * 0.08, y - h * 0.8);
        ctx.lineTo(x + h * 0.17, y - h * 0.95);
        ctx.quadraticCurveTo(x + h * 0.2, y - h * 0.62, x, y - h * 0.62);
        ctx.quadraticCurveTo(x - h * 0.2, y - h * 0.62, x - h * 0.17, y - h * 0.95);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.beginPath();
        ctx.ellipse(x - h * 0.06, y - h * 0.78, h * 0.03, h * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    /** Cantero de flores: tierra oscura con tulipanes y margaritas de colores. */
    function cantero(ctx, x, y, w) {
        sombraSuelo(ctx, x, y + w * 0.04, w * 0.55, w * 0.1, 0.3);
        ctx.fillStyle = "#c2773a";
        ctx.beginPath();
        ctx.ellipse(x, y, w * 0.5, w * 0.11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#7a4a26";
        ctx.beginPath();
        ctx.ellipse(x, y - w * 0.015, w * 0.46, w * 0.085, 0, 0, Math.PI * 2);
        ctx.fill();
        var cols = ["#ff4d8d", "#ffd43b", "#9775fa", "#ff922b", "#f783ac", "#4dabf7"];
        for (var i = 0; i < 9; i++) {
            var u = i / 8 - 0.5;
            tulipan(ctx, x + u * w * 0.8, y - w * 0.01 + Math.abs(u) * w * 0.04, w * (0.3 + azar() * 0.1), cols[i % cols.length]);
        }
    }

    /** Banca de parque de madera. */
    function banca(ctx, x, y, w) {
        sombraSuelo(ctx, x, y, w * 0.6, w * 0.08, 0.35);
        var h = w * 0.5;
        ctx.fillStyle = "#3d3d55";
        [-0.42, 0.42].forEach(function (k) {
            ctx.fillRect(x + k * w - w * 0.03, y - h * 0.55, w * 0.06, h * 0.55);
        });
        var tabla = function (ty, th, color) {
            ctx.fillStyle = "#7a3d12";
            ctx.fillRect(x - w * 0.52, ty - 1.5, w * 1.04, th + 3);
            ctx.fillStyle = color;
            ctx.fillRect(x - w * 0.5, ty, w, th);
        };
        tabla(y - h * 0.6, h * 0.1, "#e8954a");
        tabla(y - h * 1.05, h * 0.1, "#f2a65a");
        tabla(y - h * 0.88, h * 0.1, "#e8954a");
        ctx.fillStyle = "#3d3d55";
        [-0.42, 0.42].forEach(function (k) {
            ctx.fillRect(x + k * w - w * 0.025, y - h * 1.1, w * 0.05, h * 0.55);
        });
    }

    /** Tramo de cerca de colores (estacas blancas con puntas de color). */
    function cerca(ctx, x0, x1, y, h) {
        var n = Math.max(3, Math.round((x1 - x0) / (h * 0.45)));
        var cols = ["#ff8cc6", "#ffd43b", "#74c0fc", "#b197fc", "#8ce99a"];
        ctx.fillStyle = "#e9e3f5";
        ctx.fillRect(x0, y - h * 0.62, x1 - x0, h * 0.1);
        ctx.fillRect(x0, y - h * 0.3, x1 - x0, h * 0.1);
        for (var i = 0; i < n; i++) {
            var px = x0 + ((i + 0.5) / n) * (x1 - x0);
            var pw = h * 0.22;
            ctx.fillStyle = "#ffffff";
            ctx.strokeStyle = "#b9b0d0";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(px - pw / 2, y);
            ctx.lineTo(px - pw / 2, y - h * 0.8);
            ctx.lineTo(px, y - h);
            ctx.lineTo(px + pw / 2, y - h * 0.8);
            ctx.lineTo(px + pw / 2, y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = cols[i % cols.length];
            ctx.beginPath();
            ctx.moveTo(px - pw / 2, y - h * 0.8);
            ctx.lineTo(px, y - h);
            ctx.lineTo(px + pw / 2, y - h * 0.8);
            ctx.closePath();
            ctx.fill();
        }
    }

    /** Letrero de madera "PEDNIA" sobre dos postes, con flores. */
    function letrero(ctx, x, y, w) {
        var h = w * 0.75;
        sombraSuelo(ctx, x, y, w * 0.55, w * 0.07, 0.3);
        ctx.fillStyle = "#8a5226";
        ctx.fillRect(x - w * 0.42, y - h, w * 0.07, h);
        ctx.fillRect(x + w * 0.35, y - h, w * 0.07, h);
        var tx = x - w * 0.5;
        var ty = y - h * 0.98;
        ctx.fillStyle = "#6b3a14";
        ctx.beginPath();
        ctx.moveTo(tx - 3, ty + h * 0.12);
        ctx.quadraticCurveTo(x, ty - h * 0.14, tx + w + 3, ty + h * 0.12);
        ctx.lineTo(tx + w + 3, ty + h * 0.42);
        ctx.quadraticCurveTo(x, ty + h * 0.16, tx - 3, ty + h * 0.42);
        ctx.closePath();
        ctx.fill();
        var g = ctx.createLinearGradient(0, ty, 0, ty + h * 0.4);
        g.addColorStop(0, "#9b7bff");
        g.addColorStop(1, "#6a47d8");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(tx, ty + h * 0.13);
        ctx.quadraticCurveTo(x, ty - h * 0.1, tx + w, ty + h * 0.13);
        ctx.lineTo(tx + w, ty + h * 0.39);
        ctx.quadraticCurveTo(x, ty + h * 0.18, tx, ty + h * 0.39);
        ctx.closePath();
        ctx.fill();
        ctx.save();
        ctx.font = "700 " + Math.round(w * 0.17) + "px Fredoka, Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = Math.max(2, w * 0.025);
        ctx.strokeStyle = "#3b1f8a";
        ctx.strokeText("PEDNIA", x, ty + h * 0.2);
        ctx.fillStyle = "#ffffff";
        ctx.fillText("PEDNIA", x, ty + h * 0.2);
        ctx.restore();
        flor(ctx, x - w * 0.385, ty + h * 0.48, w * 0.04, "#ff6fae");
        flor(ctx, x + w * 0.385, ty + h * 0.48, w * 0.04, "#ffd43b");
    }

    /** Farol de parque. */
    function farol(ctx, x, y, h) {
        sombraSuelo(ctx, x, y, h * 0.12, h * 0.03, 0.3);
        ctx.fillStyle = "#3d3d55";
        ctx.fillRect(x - h * 0.02, y - h * 0.85, h * 0.04, h * 0.85);
        ctx.fillRect(x - h * 0.06, y - h * 0.04, h * 0.12, h * 0.04);
        var g = ctx.createRadialGradient(x, y - h * 0.92, 0, x, y - h * 0.92, h * 0.25);
        g.addColorStop(0, "rgba(255,240,170,0.65)");
        g.addColorStop(1, "rgba(255,240,170,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y - h * 0.92, h * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff3bf";
        ctx.strokeStyle = "#3d3d55";
        ctx.lineWidth = Math.max(2, h * 0.02);
        ctx.beginPath();
        ctx.moveTo(x - h * 0.07, y - h * 0.85);
        ctx.lineTo(x - h * 0.09, y - h * 1.0);
        ctx.lineTo(x + h * 0.09, y - h * 1.0);
        ctx.lineTo(x + h * 0.07, y - h * 0.85);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#ff6fae";
        ctx.beginPath();
        ctx.moveTo(x - h * 0.12, y - h * 1.0);
        ctx.lineTo(x, y - h * 1.1);
        ctx.lineTo(x + h * 0.12, y - h * 1.0);
        ctx.closePath();
        ctx.fill();
    }

    /** Cordillera de dibujo animado: picos redondeados unidos por valles; picos = [[x, alto]] en fracciones. */
    function cordillera(ctx, picos, base, W, H) {
        ctx.beginPath();
        ctx.moveTo(-10, H);
        ctx.lineTo(-10, base - picos[0][1] * H * 0.5);
        for (var i = 0; i < picos.length; i++) {
            var px = picos[i][0] * W;
            var py = base - picos[i][1] * H;
            var ant = i ? picos[i - 1] : [picos[0][0] - 0.12, picos[0][1] * 0.5];
            var vx = ((ant[0] + picos[i][0]) / 2) * W;
            var vy = base - Math.min(ant[1], picos[i][1]) * H * 0.42;
            ctx.quadraticCurveTo(vx - W * 0.02, vy, vx, vy);
            ctx.quadraticCurveTo(px - W * 0.035, py, px, py);
        }
        var ult = picos[picos.length - 1];
        ctx.quadraticCurveTo(ult[0] * W + W * 0.05, base - ult[1] * H * 0.5, W + 10, base - ult[1] * H * 0.45);
        ctx.lineTo(W + 10, H);
        ctx.closePath();
    }

    /** Nieve en las cumbres altas: una tapa ondulada recortada por la propia montaña. */
    function nieve(ctx, picos, base, W, H, minimo) {
        picos.forEach(function (p) {
            if (p[1] < minimo) return;
            var px = p[0] * W;
            var py = base - p[1] * H;
            var alto = p[1] * H * 0.28;
            var ancho = W * 0.06;
            ctx.beginPath();
            ctx.moveTo(px - ancho, py - 4);
            ctx.lineTo(px + ancho, py - 4);
            ctx.lineTo(px + ancho * 0.55, py + alto * 0.9);
            ctx.quadraticCurveTo(px + ancho * 0.3, py + alto * 0.55, px + ancho * 0.12, py + alto);
            ctx.quadraticCurveTo(px - ancho * 0.05, py + alto * 0.6, px - ancho * 0.22, py + alto * 0.95);
            ctx.quadraticCurveTo(px - ancho * 0.4, py + alto * 0.6, px - ancho * 0.6, py + alto * 0.8);
            ctx.closePath();
            ctx.fill();
        });
    }

    /**
     * Capa de atrás: dos cordilleras de colores (lila con nieve atrás, azul adelante) con bruma en la base y
     * dos filas de colinas verdes onduladas con un borde de luz. Los arbolitos lejanos son imágenes encima.
     */
    function pintarLejos(W, H) {
        var c = document.createElement("canvas");
        c.width = W;
        c.height = H;
        var x = c.getContext("2d");
        var hz = lay.horizonte;
        // cordillera de atrás (lila, con nieve)
        var atras = [[0.04, 0.2], [0.17, 0.31], [0.31, 0.23], [0.45, 0.35], [0.6, 0.27], [0.74, 0.33], [0.89, 0.24], [1.0, 0.3]];
        var baseA = hz - H * 0.02;
        cordillera(x, atras, baseA, W, H);
        var ga = x.createLinearGradient(0, baseA - H * 0.35, 0, baseA);
        ga.addColorStop(0, "#a993f0");
        ga.addColorStop(1, "#d9ceff");
        x.fillStyle = ga;
        x.fill();
        x.save();
        cordillera(x, atras, baseA, W, H);
        x.clip();
        // ladera en sombra (lado izquierdo de cada pico) para darles volumen
        atras.forEach(function (p) {
            x.fillStyle = "rgba(90,60,170,0.18)";
            x.beginPath();
            x.moveTo(p[0] * W, baseA - p[1] * H);
            x.lineTo(p[0] * W - W * 0.09, baseA);
            x.lineTo(p[0] * W - W * 0.01, baseA);
            x.closePath();
            x.fill();
        });
        x.fillStyle = "#ffffff";
        nieve(x, atras, baseA, W, H, 0.26);
        x.restore();
        // cordillera de adelante (azul, más baja)
        var frente = [[0.0, 0.14], [0.12, 0.2], [0.25, 0.13], [0.38, 0.19], [0.53, 0.12], [0.66, 0.2], [0.81, 0.14], [0.95, 0.19]];
        var baseF = hz + H * 0.01;
        cordillera(x, frente, baseF, W, H);
        var gf = x.createLinearGradient(0, baseF - H * 0.22, 0, baseF);
        gf.addColorStop(0, "#7fb2f5");
        gf.addColorStop(1, "#c4ddff");
        x.fillStyle = gf;
        x.fill();
        x.save();
        cordillera(x, frente, baseF, W, H);
        x.clip();
        frente.forEach(function (p) {
            x.fillStyle = "rgba(40,90,180,0.16)";
            x.beginPath();
            x.moveTo(p[0] * W, baseF - p[1] * H);
            x.lineTo(p[0] * W - W * 0.07, baseF);
            x.lineTo(p[0] * W, baseF);
            x.closePath();
            x.fill();
        });
        x.restore();
        // bruma al pie de las montañas
        var gb = x.createLinearGradient(0, baseF - H * 0.09, 0, baseF + H * 0.02);
        gb.addColorStop(0, "rgba(255,255,255,0)");
        gb.addColorStop(0.7, "rgba(255,255,255,0.55)");
        gb.addColorStop(1, "rgba(255,255,255,0)");
        x.fillStyle = gb;
        x.fillRect(0, baseF - H * 0.09, W, H * 0.11);
        // colinas onduladas
        var colina = function (base, alto, ondas, fase, color, borde) {
            silueta(x, base, alto, ondas, fase, W, H);
            x.fillStyle = color;
            x.fill();
            x.save();
            silueta(x, base, alto, ondas, fase, W, H);
            x.clip();
            x.strokeStyle = borde;
            x.lineWidth = 6;
            silueta(x, base, alto, ondas, fase, W, H);
            x.stroke();
            x.restore();
        };
        colina(hz + H * 0.045, H * 0.09, 2.6, 0.4, "#b4ec96", "#dcfbc4");
        colina(hz + H * 0.085, H * 0.07, 1.9, 2.3, "#8fdc6c", "#c3f5a2");
        return c;
    }

    /** Laguna con orilla de arena, reflejos, nenúfares y piedritas. */
    function laguna(ctx, x, y, rx, ry) {
        sombraSuelo(ctx, x, y + ry * 0.2, rx * 1.15, ry * 1.4, 0.25);
        ctx.fillStyle = "#f3d9a2";
        ctx.beginPath();
        ctx.ellipse(x, y, rx + 9, ry + 6, 0, 0, Math.PI * 2);
        ctx.fill();
        var g = ctx.createLinearGradient(0, y - ry, 0, y + ry);
        g.addColorStop(0, "#9be3ff");
        g.addColorStop(0.5, "#4fb3f6");
        g.addColorStop(1, "#2f8fe0");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.75)";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        [[-0.45, -0.3, 0.25], [0.05, -0.05, 0.35], [-0.2, 0.35, 0.2], [0.4, 0.25, 0.18]].forEach(function (l) {
            ctx.beginPath();
            ctx.moveTo(x + l[0] * rx, y + l[1] * ry);
            ctx.lineTo(x + (l[0] + l[2]) * rx, y + l[1] * ry);
            ctx.stroke();
        });
        [[0.55, -0.1], [-0.6, 0.2], [0.2, 0.5]].forEach(function (n, i) {
            var nx = x + n[0] * rx;
            var ny = y + n[1] * ry;
            ctx.fillStyle = "#51cf66";
            ctx.beginPath();
            ctx.ellipse(nx, ny, ry * 0.32, ry * 0.18, 0, 0.3, Math.PI * 2 - 0.3);
            ctx.lineTo(nx, ny);
            ctx.fill();
            if (i !== 1) flor(ctx, nx, ny - ry * 0.08, ry * 0.09, "#ff8cc6");
        });
        [[-0.95, 0.4], [-0.8, 0.75], [0.9, 0.55], [1.0, 0.15]].forEach(function (p) {
            ctx.fillStyle = "#a9a3b8";
            ctx.beginPath();
            ctx.ellipse(x + p[0] * rx, y + p[1] * ry, ry * 0.22, ry * 0.14, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,0.45)";
            ctx.beginPath();
            ctx.ellipse(x + p[0] * rx - ry * 0.05, y + p[1] * ry - ry * 0.05, ry * 0.09, ry * 0.05, 0, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    /**
     * Pinta el parque colorido (sin el cielo, las montañas ni los árboles): pasto con franjas de podado,
     * cercas, letrero PEDNIA, banca, farol, camino de baldosas en curva hacia las montañas, laguna, arbustos,
     * cantero, sombras.
     */
    function pintarParque(W, H) {
        var c = document.createElement("canvas");
        c.width = W;
        c.height = H;
        var x = c.getContext("2d");
        var hz = lay.horizonte;
        semilla = 11;
        x.lineCap = "round";
        x.lineJoin = "round";
        var top = hz + H * 0.085;
        // camino: centro y medio ancho según u (0 = al fondo, 1 = abajo); hace una S suave
        var centro = function (u) { return W * (0.5 + 0.09 * u + 0.055 * Math.sin(u * Math.PI * 1.6)); };
        var medio = function (u) { return W * (0.01 + 0.17 * Math.pow(u, 1.3)); };
        var yDe = function (u) { return top + (H - top) * u; };
        // pradera con franjas de podado que salen del fondo
        silueta(x, hz + H * 0.08, H * 0.02, 1.2, 0.3, W, H);
        var gp = x.createLinearGradient(0, hz + H * 0.06, 0, H);
        gp.addColorStop(0, "#9be86f");
        gp.addColorStop(0.5, "#6fd24a");
        gp.addColorStop(1, "#47b52f");
        x.fillStyle = gp;
        x.fill();
        x.save();
        silueta(x, hz + H * 0.08, H * 0.02, 1.2, 0.3, W, H);
        x.clip();
        var vx = centro(0);
        var vy = hz + H * 0.02;
        for (var s = -10; s < 10; s += 2) {
            x.fillStyle = "rgba(255,255,255,0.07)";
            x.beginPath();
            x.moveTo(vx, vy);
            x.lineTo(vx + s * W * 0.16, H);
            x.lineTo(vx + (s + 1) * W * 0.16, H);
            x.closePath();
            x.fill();
        }
        x.restore();
        // cercas por tramos, letrero a la entrada del camino, banca y farol
        var fy = hz + H * 0.105;
        cerca(x, W * 0.02, W * 0.2, fy, H * 0.04);
        cerca(x, W * 0.35, W * 0.46, fy, H * 0.04);
        cerca(x, W * 0.6, W * 0.75, fy, H * 0.04);
        banca(x, W * 0.31, hz + H * 0.16, H * 0.13);
        farol(x, W * 0.43, hz + H * 0.16, H * 0.17);
        // camino de baldosas
        x.beginPath();
        x.moveTo(centro(0) - medio(0), yDe(0));
        for (var k = 1; k <= 30; k++) x.lineTo(centro(k / 30) - medio(k / 30), yDe(k / 30));
        for (var k2 = 30; k2 >= 0; k2--) x.lineTo(centro(k2 / 30) + medio(k2 / 30), yDe(k2 / 30));
        x.closePath();
        var gt = x.createLinearGradient(0, top, 0, H);
        gt.addColorStop(0, "#ffeccb");
        gt.addColorStop(1, "#f6cf96");
        x.fillStyle = gt;
        x.fill();
        x.strokeStyle = "#e3a35f";
        x.lineWidth = 3;
        x.stroke();
        x.strokeStyle = "rgba(214,150,80,0.55)";
        x.lineWidth = 1.5;
        for (var f = 1; f < 16; f++) {
            var u = Math.pow(f / 16, 1.5);
            var u2 = Math.pow((f + 1) / 16, 1.5);
            x.beginPath();
            x.moveTo(centro(u) - medio(u), yDe(u));
            x.lineTo(centro(u) + medio(u), yDe(u));
            x.stroke();
            var lado = f % 2 ? 0.34 : -0.34;
            x.beginPath();
            x.moveTo(centro(u) + medio(u) * lado, yDe(u));
            x.lineTo(centro(u2) + medio(u2) * lado, yDe(u2));
            x.stroke();
        }
        letrero(x, centro(0.12) + medio(0.12) + H * 0.1, yDe(0.12), H * 0.15);
        // laguna a la derecha, arbustos y cantero
        laguna(x, W * 0.84, hz + H * 0.22, W * 0.08, H * 0.04);
        arbusto(x, W * 0.22, hz + H * 0.15, H * 0.13, "verde");
        arbusto(x, W * 0.47, hz + H * 0.12, H * 0.09, "verde");
        arbusto(x, W * 0.74, hz + H * 0.23, H * 0.12, "verde");
        cantero(x, W * 0.9, H * 0.9, H * 0.2);
        // sombra en el pasto de los árboles que no están al fondo (los árboles son imágenes encima)
        ARBOLES.forEach(function (a) {
            if (a.prof >= 1) sombraSuelo(x, W * a.u - H * a.alto * 0.05, hz + H * a.b, H * a.alto * 0.42, H * a.alto * 0.07, 0.35);
        });
        // pasto y flores en perspectiva
        var verdes = ["#4fb83a", "#62c94a", "#3fa22f", "#7ad85c"];
        var n = Math.round((W * (H - hz)) / 320);
        for (var b = 0; b < n; b++) {
            var v = Math.pow(azar(), 0.65);
            brizna(x, azar() * W, hz + H * 0.1 + (H - hz - H * 0.1) * v, 4 + v * 12, verdes[b % verdes.length], 1 + v * 1.5);
        }
        var cols = ["#ffffff", "#ffd43b", "#ff8cc6", "#b197fc", "#ff922b", "#74c0fc"];
        for (var fl = 0; fl < 80; fl++) {
            var fv = Math.pow(azar(), 0.7);
            flor(x, azar() * W, hz + H * 0.12 + (H - hz - H * 0.12) * fv, 2 + fv * 4.5, cols[fl % cols.length]);
        }
        // sombras de la canasta y de Zoe
        sombraSuelo(x, lay.canasta.x + lay.canasta.w * 0.05, lay.canasta.y - 2, lay.canasta.w * 0.62, lay.canasta.w * 0.12, 0.42);
        sombraSuelo(x, lay.zoe.x + lay.zoe.w * 0.5, lay.zoe.y + lay.zoe.h * 0.985, lay.zoe.w * 0.42, lay.zoe.w * 0.08, 0.35);
        return c;
    }

    /** Pasto del primer plano con florecitas: delante de la canasta y de la base de las burbujas. */
    function pintarFrente(W, H) {
        var c = document.createElement("canvas");
        c.width = W;
        c.height = H;
        var x = c.getContext("2d");
        x.lineCap = "round";
        semilla = 29;
        var verdes = ["#3fa22f", "#4fb83a", "#62c94a", "#2f8f27"];
        var n = Math.round(W / 3);
        for (var b = 0; b < n; b++) {
            brizna(x, azar() * W, H + 2, H * (0.02 + azar() * 0.035), verdes[b % verdes.length], 2 + azar() * 2);
        }
        var cols = ["#ff6fae", "#ffd43b", "#b197fc", "#ffffff", "#ff922b"];
        for (var f = 0; f < Math.round(W / 45); f++) {
            flor(x, azar() * W, H - H * (0.012 + azar() * 0.03), 3 + azar() * 3, cols[f % cols.length]);
        }
        return c;
    }

    function texturaDesdeCanvas(clave, canvas) {
        if (sc.textures.exists(clave)) sc.textures.remove(clave);
        sc.textures.addCanvas(clave, canvas);
    }

    function pintarFondo() {
        var W = Math.round(lay.W);
        var H = Math.round(lay.H);
        var tam = W + "x" + H;
        if (tam === tamPintado) return;
        tamPintado = tam;
        texturaDesdeCanvas("parque-lejos", pintarLejos(W, H));
        texturaDesdeCanvas("parque", pintarParque(W, H));
        lejosIm.setTexture("parque-lejos");
        lejosIm.setDisplaySize(W, H);
        texturaDesdeCanvas("parque-frente", pintarFrente(W, H));
        fondoIm.setTexture("parque");
        frenteIm.setTexture("parque-frente");
        fondoIm.setDisplaySize(W, H);
        frenteIm.setDisplaySize(W, H);
        if (motas) motas.destroy();
        motas = null;
        if (!reducido) {
            motas = sc.add.particles(0, 0, "fx-mota", {
                x: { min: 0, max: W },
                y: { min: H * 0.1, max: H * 0.95 },
                speedX: { min: -8, max: 8 },
                speedY: { min: -14, max: -4 },
                scale: { min: 0.25, max: 0.6 },
                // las motas aparecen y se apagan suavemente a lo largo de su vida
                alpha: {
                    onEmit: function () { return 0; },
                    onUpdate: function (p, k, t) { return Math.sin(t * Math.PI) * 0.7; }
                },
                lifespan: { min: 4000, max: 7000 },
                frequency: 380,
                blendMode: "ADD"
            });
            motas.setDepth(26);
        }
        ubicarArboles();
    }

    // ------------------------------------------------------------------ árboles, pétalos y mariposas

    /**
     * Árboles del parque (estilo de "La Ardilla y la Bellota Gigante": SVG sin contorno, tronco y copa aparte).
     * u: x en fracción del ancho; b: base bajo el horizonte (fracción del alto); alto: fracción del alto;
     * prof 0.5 = arbolitos lejanos en las colinas, 1 = grupos medianos detrás de la cerca, 3 = árboles grandes que enmarcan.
     */
    var ARBOLES = (function () {
        var l = [];
        // arbolitos lejanos sobre las colinas (pequeños, detrás de todo lo demás)
        [[0.23, 0.035, 0.09, "verde"], [0.29, 0.05, 0.11, "rosa"], [0.38, 0.03, 0.08, "durazno"], [0.45, 0.05, 0.1, "verde"],
            [0.55, 0.03, 0.085, "lila"], [0.64, 0.045, 0.1, "verde"], [0.71, 0.03, 0.08, "rosa"], [0.79, 0.05, 0.11, "durazno"]
        ].forEach(function (t) { l.push({ u: t[0], b: t[1], alto: t[2], copa: t[3], prof: 0.5, ancho: 0.8 }); });
        // grupos medianos a los lados del camino (detrás de la cerca)
        [[0.24, 0.1, 0.3, "verde"], [0.3, 0.085, 0.23, "durazno"], [0.72, 0.09, 0.27, "rosa"],
            [0.8, 0.1, 0.31, "verde"], [0.86, 0.085, 0.22, "durazno"]
        ].forEach(function (t) { l.push({ u: t[0], b: t[1], alto: t[2], copa: t[3], prof: 1, ancho: 0.85 }); });
        // árboles grandes que enmarcan la escena
        l.push({ u: 0.12, b: 0.2, alto: 0.6, copa: "rosa", prof: 3, ancho: 0.95, petalos: [0xffb3d9, 0xffffff, 0xff8cc6] });
        l.push({ u: 0.96, b: 0.16, alto: 0.54, copa: "lila", prof: 3, ancho: 0.95, petalos: [0xcdb8ff, 0xffffff, 0xb197fc] });
        return l;
    })();

    function crearArboles() {
        texturaCanvas("fx-petalo", 24, 24, function (ctx, s) {
            var g = ctx.createRadialGradient(s * 0.4, s * 0.35, 1, s / 2, s / 2, s / 2);
            g.addColorStop(0, "#ffffff");
            g.addColorStop(1, "rgba(255,255,255,0.75)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(s / 2, 2);
            ctx.quadraticCurveTo(s - 2, s * 0.35, s / 2, s - 2);
            ctx.quadraticCurveTo(2, s * 0.35, s / 2, 2);
            ctx.fill();
        });
        arboles = ARBOLES.map(function (a) {
            var tronco = sc.add.image(0, 0, "arb-tronco").setOrigin(0.5, 1).setDepth(a.prof);
            var copa = sc.add.image(0, 0, "arb-" + a.copa).setOrigin(0.5, 0.8).setDepth(a.prof + 0.1);
            return { a: a, tronco: tronco, copa: copa, f: Math.random() * 6.28, v: 0.6 + Math.random() * 0.6 };
        });
    }

    function ubicarArboles() {
        if (!arboles.length) return;
        var W = lay.W;
        var H = lay.H;
        var hz = lay.horizonte;
        petalos.forEach(function (e) { e.destroy(); });
        petalos = [];
        arboles.forEach(function (t) {
            var a = t.a;
            var x = W * a.u;
            var y = hz + H * a.b;
            var alto = H * a.alto;
            t.tronco.setPosition(x, y);
            t.tronco.setScale((alto * 0.62) / t.tronco.frame.realHeight);
            t.copa.setPosition(x, y - alto * 0.5);
            t.copa.setScale((alto * a.ancho) / t.copa.frame.realWidth);
            if (a.petalos && !reducido) {
                // pétalos que se desprenden de la copa y caen despacio, girando
                var e = sc.add.particles(x, y - alto * 0.72, "fx-petalo", {
                    x: { min: -alto * 0.32, max: alto * 0.32 },
                    y: { min: -alto * 0.12, max: alto * 0.12 },
                    speedY: { min: 18, max: 42 },
                    speedX: { min: -28, max: 12 },
                    rotate: { start: 0, end: 540 },
                    scale: { min: 0.45, max: 0.85 },
                    alpha: { onEmit: function () { return 0.95; }, onUpdate: function (p, k, u) { return u > 0.8 ? (1 - u) * 4.75 : 0.95; } },
                    lifespan: { min: (alto * 0.7 / 30) * 1000, max: (alto * 0.9 / 30) * 1000 },
                    tint: a.petalos,
                    frequency: 650
                });
                e.setDepth(24);
                petalos.push(e);
            }
        });
    }

    /** Mariposas de colores que revolotean sobre el pasto (detrás de las burbujas). */
    function crearMariposas() {
        texturaCanvas("fx-mariposa", 48, 40, function (ctx) {
            ctx.fillStyle = "#ffffff";
            [[-1, 1], [1, 1]].forEach(function (l) {
                ctx.beginPath();
                ctx.ellipse(24 + l[0] * 11, 13, 11, 12, l[0] * 0.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(24 + l[0] * 9, 28, 8, 9, -l[0] * 0.4, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.fillStyle = "rgba(255,255,255,0.6)";
            ctx.beginPath();
            ctx.arc(14, 12, 4, 0, Math.PI * 2);
            ctx.arc(34, 12, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#3d2a5c";
            ctx.beginPath();
            ctx.ellipse(24, 20, 2.6, 13, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#3d2a5c";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(23, 8);
            ctx.quadraticCurveTo(19, 2, 16, 2);
            ctx.moveTo(25, 8);
            ctx.quadraticCurveTo(29, 2, 32, 2);
            ctx.stroke();
        });
        mariposas = [
            { cx: 0.3, cy: 0.12, ax: 0.08, tinte: 0xff8cc6, f: 0, v: 1 },
            { cx: 0.68, cy: 0.08, ax: 0.1, tinte: 0xffd43b, f: 2.1, v: 0.8 },
            { cx: 0.5, cy: 0.2, ax: 0.12, tinte: 0x74c0fc, f: 4.2, v: 1.15 }
        ].map(function (m) {
            m.im = sc.add.image(0, 0, "fx-mariposa").setDepth(2.5).setTint(m.tinte);
            return m;
        });
    }

    /** Cada cuadro: las copas se mecen con el viento y las mariposas revolotean aleteando. */
    function animarParque(t) {
        for (var i = 0; i < arboles.length; i++) {
            var a = arboles[i];
            a.copa.rotation = reducido ? 0 : Math.sin(t * 0.0007 * a.v + a.f) * (a.a.prof === 3 ? 0.022 : 0.03);
        }
        var W = lay.W;
        var H = lay.H;
        for (var k = 0; k < mariposas.length; k++) {
            var m = mariposas[k];
            var base = (H * 0.06) / 48;
            var x = W * m.cx + Math.sin(t * 0.00035 * m.v + m.f) * W * m.ax;
            var y = lay.horizonte + H * m.cy + Math.sin(t * 0.0011 * m.v + m.f * 1.7) * H * 0.04;
            m.im.setPosition(x, y);
            m.im.setScale(base * (reducido ? 1 : 0.25 + 0.75 * Math.abs(Math.sin(t * 0.016 * m.v + m.f))), base);
            m.im.angle = Math.cos(t * 0.00035 * m.v + m.f) * 18;
        }
    }

    // ------------------------------------------------------------------ diseño

    function reacomodar() {
        if (!sc || !fondoIm) return;
        var W = sc.scale.width;
        var H = sc.scale.height;
        if (W < 10 || H < 10) return;
        lay.W = W;
        lay.H = H;
        lay.horizonte = H * 0.56;
        lay.rBase = Math.min(H, W * 0.6);
        // Zoe de pie a la izquierda (script.js pone ahí su caja 3D) y su canasta en el pasto, a su lado.
        var zh = clamp(H * 0.62, 260, 560);
        var zw = Math.min(W * 0.16, zh * 0.5);
        lay.zoe = { x: W * 0.012, y: H * 0.985 - zh, w: zw, h: zh };
        var cw = clamp(W * 0.13, 120, 230);
        lay.canasta = { x: lay.zoe.x + zw + cw * 0.42, y: H * 0.975, w: cw };
        canasta.k = cw / 200;
        // Las burbujas suben a la derecha de la canasta; a la derecha queda un margen para los botones.
        lay.carrilMin = lay.canasta.x + cw * 0.5 + 10;
        lay.carrilMax = W - 70;
        pintarFondo();
        ubicarCanasta();
        if (luz) luz.setSize(W, H);
    }

    function ubicarCanasta() {
        var k = canasta.k;
        var c = lay.canasta;
        [canasta.atras, canasta.frente].forEach(function (im) {
            im.setPosition(c.x, c.y);
            im.setScale(k / RES);
        });
        canasta.items.forEach(function (it, i) {
            var h = HUECOS[i % HUECOS.length];
            it.img.setPosition(c.x + h[0] * k, c.y + h[1] * k);
            it.img.setDisplaySize(52 * k * it.tam, 52 * k * it.tam);
        });
    }

    /** Phaser guarda la posición del lienzo; se renueva antes de cada toque. */
    function vigilarPosicion(el) {
        var renovar = function () { if (sc && sc.scale) sc.scale.updateBounds(); };
        ["pointerdown", "mousedown", "touchstart"].forEach(function (ev) {
            el.addEventListener(ev, renovar, { capture: true, passive: true });
        });
        if (typeof ResizeObserver === "function") {
            var ro = new ResizeObserver(function () {
                renovar();
                reacomodar();
            });
            ro.observe(document.body);
        }
        global.addEventListener("scroll", renovar, { passive: true });
    }

    function aPantalla(x, y) {
        var r = sc.game.canvas.getBoundingClientRect();
        return { x: r.left + x * (r.width / sc.scale.width), y: r.top + y * (r.height / sc.scale.height) };
    }

    // ------------------------------------------------------------------ burbujas

    function buscar(id) {
        for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i];
        return null;
    }

    function viva(b) {
        return b && (b.estado === "sube" || b.estado === "entra");
    }

    /** Puntitos debajo de la burbuja fuerte: uno por cada toque que falta. */
    function pintarPuntos(b) {
        var g = b.puntos;
        if (!g) return;
        g.clear();
        var n = b.toques;
        var rp = b.r * 0.12;
        var sep = rp * 2.8;
        var x0 = -((n - 1) * sep) / 2;
        for (var i = 0; i < n; i++) {
            var lleno = i < b.restantes;
            g.fillStyle(lleno ? 0xffd43b : 0xffffff, lleno ? 1 : 0.35);
            g.lineStyle(3, lleno ? 0xe67700 : 0xffffff, lleno ? 1 : 0.5);
            g.fillCircle(x0 + i * sep, b.r * 1.22, rp);
            g.strokeCircle(x0 + i * sep, b.r * 1.22, rp);
        }
    }

    /**
     * Suelta una burbuja. x en px del mundo; r en px; altura 1 = sale por debajo del borde, menos de 1 =
     * aparece (crece y se aclara) a esa fracción del alto. subidaMs = tiempo para cruzar toda la pantalla.
     */
    function soltar(op) {
        if (!sc) return null;
        var r = Math.max(24, op.r || lay.rBase * 0.11);
        var altura = op.altura == null ? 1 : op.altura;
        var y = altura >= 1 ? lay.H + r * 1.05 : lay.H * altura;
        var toques = Math.max(1, op.toques || 1);
        var b = {
            id: sigId++,
            objeto: op.objeto || null,
            r: r,
            x0: op.x,
            x: op.x,
            y: y,
            vy: (lay.H + r * 2.2) / ((op.subidaMs || 11000) / 1000),
            amp: op.vaiven || 0,
            frec: 0.7 + Math.random() * 0.35,
            fase: Math.random() * Math.PI * 2,
            t: 0,
            estado: altura >= 1 ? "sube" : "entra",
            interactiva: op.interactiva !== false,
            demo: !!op.demo,
            alfa: op.alfa == null ? 1 : op.alfa,
            ayuda: false,
            toques: toques,
            restantes: toques
        };
        var cont = sc.add.container(b.x, b.y);
        cont.setDepth(op.interactiva === false && !op.demo ? 28 : 30);
        var halo = sc.add.graphics();
        halo.lineStyle(10, 0xffd43b, 1);
        halo.strokeCircle(0, 0, r * 1.12);
        halo.setAlpha(0);
        var cuerpo = sc.add.image(0, 0, toques > 1 ? "burbuja-fuerte" : "burbuja");
        var icono = null;
        if (b.objeto && sc.textures.exists("ico-" + b.objeto)) {
            icono = sc.add.image(0, 0, "ico-" + b.objeto);
            icono.setDisplaySize(r * ICONO, r * ICONO);
        }
        var brillo = sc.add.image(0, 0, "burbuja-brillo");
        brillo.setDisplaySize(r * 2, r * 2);
        var hijos = icono ? [halo, icono, cuerpo, brillo] : [halo, cuerpo, brillo];
        if (toques > 1) {
            b.puntos = sc.add.graphics();
            hijos.push(b.puntos);
        }
        cont.add(hijos);
        b.cont = cont;
        b.halo = halo;
        b.cuerpo = cuerpo;
        b.icono = icono;
        b.brillo = brillo;
        if (b.puntos) pintarPuntos(b);
        if (b.estado === "entra") cont.setAlpha(0);
        else cont.setAlpha(b.alfa);
        moverBurbuja(b, 0);
        lista.push(b);
        return b.id;
    }

    function moverBurbuja(b, dt) {
        b.t += dt;
        b.y -= b.vy * dt;
        b.x = b.x0 + Math.sin(b.t * b.frec + b.fase) * b.amp;
        var ent = 1;
        if (b.estado === "entra") {
            ent = Math.min(1, b.t / 0.6);
            b.cont.setAlpha(ent * b.alfa);
            if (ent >= 1) b.estado = "sube";
        }
        // vaivén orgánico: la burbuja respira (se estira un poquito a lo ancho y a lo alto, alternando)
        var resp = reducido ? 0 : 0.035;
        var sx = 1 + resp * Math.sin(b.t * 3 + b.fase);
        var sy = 1 + resp * Math.sin(b.t * 3 + b.fase + Math.PI);
        var k = 0.7 + 0.3 * ent;
        b.cont.setPosition(b.x, b.y);
        b.cuerpo.setDisplaySize(b.r * 2 * sx * k, b.r * 2 * sy * k);
        b.brillo.setDisplaySize(b.r * 2 * sx * k, b.r * 2 * sy * k);
        b.brillo.setPosition(Math.sin(b.t * 0.9 + b.fase) * b.r * 0.05, Math.cos(b.t * 0.7) * b.r * 0.04);
        if (b.icono) {
            b.icono.setDisplaySize(b.r * ICONO * k, b.r * ICONO * k);
            b.icono.angle = reducido ? 0 : Math.sin(b.t * 1.6 + b.fase) * 7;
            b.icono.y = Math.sin(b.t * 2 + b.fase) * b.r * 0.04;
        }
        if (b.ayuda) b.halo.setAlpha(0.55 + 0.45 * Math.sin(b.t * 6));
    }

    function quitar(b) {
        b.estado = "fuera";
        if (b.cont) b.cont.destroy();
        var i = lista.indexOf(b);
        if (i >= 0) lista.splice(i, 1);
    }

    /** Llegó arriba sin que la tocaran: sube un poquito más y se desvanece (sin castigo). */
    function escapar(b, avisar) {
        if (!viva(b)) return;
        b.estado = "escapa";
        b.ayuda = false;
        b.halo.setAlpha(0);
        if (avisar && typeof cb.escape === "function") cb.escape(b.id);
        tw({ targets: b.cont, alpha: 0, y: b.y - b.r * 0.9, scale: 1.12, duration: avisar ? 750 : 520, ease: "Sine.easeOut" })
            .then(function () { quitar(b); });
    }

    function actualizar(tiempo, delta) {
        var dt = Math.min(0.1, (delta || 16) / 1000);
        animarParque(tiempo || 0);
        for (var i = lista.length - 1; i >= 0; i--) {
            var b = lista[i];
            if (!viva(b)) continue;
            moverBurbuja(b, dt);
            if (b.demo) continue;
            if (b.interactiva) {
                if (b.y < b.r * 0.6) escapar(b, true);
            } else if (b.y < -b.r * 1.2) {
                quitar(b);
            }
        }
    }

    /** Toque: gana la burbuja viva más cercana dentro del alcance. */
    function alPuntero(p) {
        var mejor = null;
        var dMejor = Infinity;
        lista.forEach(function (b) {
            if (!viva(b) || !b.interactiva) return;
            var d = Math.hypot(p.x - b.x, p.y - b.y) / b.r;
            if (d <= ALCANCE && d < dMejor) {
                dMejor = d;
                mejor = b;
            }
        });
        if (mejor) {
            if (typeof cb.toque === "function") cb.toque(mejor.id);
        } else if (typeof cb.vacio === "function") {
            cb.vacio(p.x, p.y);
        }
    }

    function cercanas(y, banda) {
        return lista.filter(function (b) {
            return (viva(b) || b.estado === "revienta") && Math.abs(b.y - y) < banda;
        }).map(function (b) { return { x: b.x0, r: b.r + b.amp }; });
    }

    function activas() {
        return lista.filter(function (b) { return viva(b) && b.interactiva; }).length;
    }

    function hayFuerte() {
        return lista.some(function (b) { return viva(b) && b.toques > 1; });
    }

    /**
     * Toque a una burbuja fuerte que todavía aguanta: se sacude como gelatina, suelta gotitas, una onda
     * recorre su pared, se encoge un poquito y se apaga un puntito. Devuelve los toques que faltan.
     */
    function golpe(id) {
        var b = buscar(id);
        if (!b || !viva(b)) return 0;
        if (b.restantes <= 1) return 0;
        b.restantes--;
        pintarPuntos(b);
        b.r *= 0.93;
        onda(b.x, b.y, b.r, 0xfff3bf, 1.35, 320);
        gotitas(b.x, b.y, b.r, 6);
        sc.tweens.killTweensOf(b.cont);
        b.cont.setScale(1);
        sc.tweens.add({ targets: b.cont, scaleX: 1.2, scaleY: 0.82, duration: 90, ease: "Quad.easeOut", onComplete: function () {
            sc.tweens.add({ targets: b.cont, scaleX: 0.92, scaleY: 1.1, duration: 120, ease: "Sine.easeInOut", onComplete: function () {
                sc.tweens.add({ targets: b.cont, scaleX: 1, scaleY: 1, duration: 260, ease: "Elastic.easeOut" });
            } });
        } });
        return b.restantes - 1;
    }

    // ------------------------------------------------------------------ estallido y canasta

    function huecoLibre() {
        return HUECOS[canasta.items.length % HUECOS.length];
    }

    function rebotaCanasta() {
        var base = canasta.k / RES;
        [canasta.atras, canasta.frente].forEach(function (im) {
            sc.tweens.killTweensOf(im);
            im.setScale(base);
            sc.tweens.add({ targets: im, scaleY: base * 0.9, scaleX: base * 1.06, duration: 110, yoyo: true, ease: "Quad.easeOut",
                onComplete: function () { im.setScale(base); } });
        });
    }

    /** Onda que se abre desde el borde de la burbuja. */
    function onda(x, y, r, color, hasta, ms) {
        if (!sc) return;
        var g = sc.add.graphics();
        g.setDepth(41);
        var p = { k: 0 };
        sc.tweens.add({ targets: p, k: 1, duration: ms || 380, ease: "Cubic.easeOut",
            onUpdate: function () {
                g.clear();
                g.lineStyle(Math.max(1, 7 * (1 - p.k)), color || 0xffffff, 1 - p.k);
                g.strokeCircle(x, y, r * (1 + (hasta || 1.8) * p.k - p.k * 0.2));
            },
            onComplete: function () { g.destroy(); } });
    }

    /** Gotitas de jabón que salen disparadas y caen con gravedad. */
    function gotitas(x, y, r, n) {
        if (reducido) return;
        var e = sc.add.particles(x, y, "fx-gotita", {
            speed: { min: r * 1.4, max: r * 3.4 },
            angle: { min: 180, max: 360 },
            scale: { min: clamp(r / 110, 0.35, 0.75), max: clamp(r / 60, 0.6, 1.3) },
            alpha: { start: 1, end: 0.2 },
            lifespan: { min: 650, max: 1050 },
            gravityY: 900,
            emitting: false
        });
        e.setDepth(40);
        e.explode(n || 16);
        sc.time.delayedCall(1300, function () { e.destroy(); });
    }

    /** Trozos de la película iridiscente que vuelan hacia afuera girando y caen. */
    function pelicula(x, y, r) {
        if (reducido) return;
        var n = 11;
        for (var i = 0; i < n; i++) {
            var a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
            var im = sc.add.image(x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95, "fx-arco");
            im.setDepth(41);
            im.rotation = a + Math.PI / 2;
            im.setDisplaySize(r * (0.75 + Math.random() * 0.35), r * 0.36);
            var d = r * (0.7 + Math.random() * 0.8);
            sc.tweens.add({
                targets: im,
                x: im.x + Math.cos(a) * d,
                y: im.y + Math.sin(a) * d + r * (0.35 + Math.random() * 0.4),
                angle: im.angle + (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * 90),
                scaleX: im.scaleX * 0.4,
                scaleY: im.scaleY * 0.4,
                alpha: 0,
                duration: 650 + Math.random() * 300,
                ease: "Cubic.easeOut",
                onComplete: function (t, objetivos) { objetivos[0].destroy(); }
            });
        }
    }

    /**
     * La burbuja se estira, se infla y estalla: destello, onda, trozos de película que vuelan, gotitas que
     * caen, neblina y chispas; el juguete salta y cae en curva hasta la canasta. La Promise se resuelve
     * cuando el juguete ya está en la canasta.
     */
    function reventar(id) {
        var b = buscar(id);
        if (!b || !viva(b)) return Promise.resolve(null);
        b.estado = "revienta";
        b.ayuda = false;
        b.halo.setAlpha(0);
        var r = b.r;
        var fuerte = b.toques > 1;
        sc.tweens.killTweensOf(b.cont);
        b.cont.setScale(1);
        // se estira de lado y luego se infla (la tensión antes del pop)
        return tw({ targets: b.cont, scaleX: 1.12, scaleY: 0.9, duration: 70, ease: "Quad.easeOut" })
            .then(function () { return tw({ targets: b.cont, scaleX: 1.2, scaleY: 1.2, duration: 70, ease: "Quad.easeIn" }); })
            .then(function () {
                var x = b.x;
                var y = b.y;
                var aro = sc.add.image(x, y, "fx-halo");
                aro.setBlendMode(Phaser.BlendModes.ADD);
                aro.setDepth(41);
                aro.setDisplaySize(r * 1.8, r * 1.8);
                aro.setTint(fuerte ? 0xffe066 : 0xfff3bf);
                sc.tweens.add({ targets: aro, displayWidth: r * 3.6, displayHeight: r * 3.6, alpha: 0, duration: 380, ease: "Cubic.easeOut", onComplete: function () { aro.destroy(); } });
                var niebla = sc.add.image(x, y, "fx-halo");
                niebla.setDepth(39);
                niebla.setAlpha(0.45);
                niebla.setTint(0xd0ebff);
                niebla.setDisplaySize(r * 2, r * 2);
                sc.tweens.add({ targets: niebla, displayWidth: r * 3, displayHeight: r * 3, alpha: 0, y: y - r * 0.3, duration: 800, ease: "Sine.easeOut", onComplete: function () { niebla.destroy(); } });
                onda(x, y, r, 0xffffff, 0.9, 360);
                pelicula(x, y, r);
                gotitas(x, y, r, fuerte ? 26 : 18);
                estrellas(x, y, fuerte ? 16 : 8, null, 0.8);
                flotante(x, y - r * 0.9, "¡Pop!", "#ffffff");
                var icono = b.icono;
                var obj = b.objeto;
                if (icono) {
                    // el juguete sale de la burbuja y queda suelto en la escena
                    b.cont.remove(icono);
                    icono.setPosition(x, y + icono.y);
                    icono.setDepth(36);
                }
                quitar(b);
                if (!icono) return null;
                return volarACanasta(icono, obj);
            });
    }

    function volarACanasta(icono, obj) {
        var k = canasta.k;
        var c = lay.canasta;
        var h = huecoLibre();
        var item = { img: icono, objeto: obj, tam: obj === "estrella" ? 1.05 : 1 };
        canasta.items.push(item);
        var x0 = icono.x;
        var y0 = icono.y;
        var w0 = icono.displayWidth;
        var x1 = c.x + h[0] * k;
        var y1 = c.y + h[1] * k;
        var w1 = 52 * k * item.tam;
        var cx = (x0 + x1) / 2;
        var cy = Math.min(y0, y1) - lay.H * 0.12;
        var p = { u: 0 };
        var ponerEn = function (u) {
            var a = 1 - u;
            icono.setPosition(a * a * x0 + 2 * a * u * cx + u * u * x1, a * a * y0 + 2 * a * u * cy + u * u * y1);
            var w = w0 + (w1 - w0) * u;
            icono.setDisplaySize(w, w);
            icono.angle = u * 360 * (x1 < x0 ? -1 : 1);
        };
        // saltito de alegría antes de volar
        return tw({ targets: icono, displayWidth: w0 * 1.25, displayHeight: w0 * 1.25, duration: 140, yoyo: true, ease: "Quad.easeOut" })
            .then(function () {
                icono.setDisplaySize(w0, w0);
                return tw({ targets: p, u: 1, duration: 950, ease: "Sine.easeInOut", onUpdate: function () { ponerEn(p.u); } });
            })
            .then(function () {
                ponerEn(1);
                icono.angle = 0;
                icono.setDepth(21);
                ubicarCanasta();
                rebotaCanasta();
                estrellas(x1, y1 - 10 * k, 8, [0xffe066, 0xffffff, 0xffb36b], 0.5);
                return obj;
            });
    }

    function vaciarCanasta() {
        canasta.items.forEach(function (it) { it.img.destroy(); });
        canasta.items = [];
    }

    /** La canasta llena salta y sus juguetes brillan (final). */
    function celebrarCanasta() {
        if (!sc) return Promise.resolve();
        var c = lay.canasta;
        rebotaCanasta();
        canasta.items.forEach(function (it, i) {
            sc.tweens.add({ targets: it.img, y: it.img.y - 14 * canasta.k, duration: 260, delay: i * 60, yoyo: true, repeat: 2, ease: "Sine.easeOut",
                onComplete: function () { ubicarCanasta(); } });
        });
        estrellas(c.x, c.y - c.w * 0.4, 18, null, 0.8);
        return new Promise(function (r) { setTimeout(r, 1300); });
    }

    // ------------------------------------------------------------------ ayuda y decoración

    function destacar(id, on) {
        var b = buscar(id);
        if (!b) return;
        b.ayuda = !!on && viva(b);
        if (!b.ayuda) b.halo.setAlpha(0);
    }

    /** La burbuja más fácil de alcanzar ahora: la que está más abajo entre las que ya se ven completas. */
    function masVisible() {
        var mejor = null;
        lista.forEach(function (b) {
            if (!viva(b) || !b.interactiva) return;
            if (b.y > lay.H - b.r * 0.8) return;
            if (!mejor || b.y > mejor.y) mejor = b;
        });
        return mejor ? mejor.id : null;
    }

    function dejarIr() {
        lista.slice().forEach(function (b) {
            if (viva(b) && b.interactiva) escapar(b, false);
        });
    }

    /** Burbujas vacías que flotan alrededor (presentación y final); no se pueden tocar. */
    function decorar(on) {
        clearInterval(decorando);
        decorando = null;
        if (!on || !sc) return;
        var una = function () {
            if (lista.filter(function (b) { return !b.interactiva && !b.demo && viva(b); }).length >= 7) return;
            var r = lay.rBase * (0.035 + Math.random() * 0.05);
            soltar({ x: r + Math.random() * (lay.W - 2 * r), r: r, subidaMs: 9000 + Math.random() * 5000,
                vaiven: r * 0.6, interactiva: false, alfa: 0.85 });
        };
        una();
        decorando = setInterval(una, 650);
    }

    // ------------------------------------------------------------------ efectos

    function estrellas(x, y, n, colores, fuerza) {
        if (!sc || reducido) return;
        var e = sc.add.particles(x, y, n > 14 ? "fx-estrella" : "fx-chispa", {
            speed: { min: 110 * (fuerza || 1), max: 300 * (fuerza || 1) },
            angle: { min: 0, max: 360 },
            scale: { start: 0.8, end: 0 },
            lifespan: { min: 450, max: 950 },
            rotate: { min: 0, max: 360 },
            gravityY: 240,
            tint: colores || COLORES_FIESTA,
            blendMode: "ADD",
            emitting: false
        });
        e.setDepth(42);
        e.explode(n || 12);
        sc.time.delayedCall(1300, function () { e.destroy(); });
    }

    function lluvia(ms) {
        if (!sc || reducido) return;
        var e = sc.add.particles(0, -20, "fx-estrella", {
            x: { min: 0, max: lay.W },
            speedY: { min: 140, max: 280 },
            speedX: { min: -40, max: 40 },
            lifespan: Math.max(1600, (lay.H / 170) * 1000),
            scale: { start: 0.7, end: 0.25 },
            rotate: { min: 0, max: 360 },
            tint: COLORES_FIESTA,
            blendMode: "ADD",
            frequency: 45,
            quantity: 2
        });
        e.setDepth(46);
        sc.time.delayedCall(ms || 3000, function () { e.stop(); });
        sc.time.delayedCall((ms || 3000) + 3500, function () { e.destroy(); });
    }

    function iluminar(on) {
        if (!luz) return;
        sc.tweens.killTweensOf(luz);
        if (!on) {
            sc.tweens.add({ targets: luz, alpha: 0, duration: 500 });
            return;
        }
        luz.setAlpha(0);
        sc.tweens.add({ targets: luz, alpha: 0.26, duration: 600, ease: "Sine.easeOut", onComplete: function () {
            if (!reducido) sc.tweens.add({ targets: luz, alpha: 0.12, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        } });
    }

    function flotante(x, y, texto, color) {
        if (!sc) return;
        var t = sc.add.text(x, y, texto, {
            fontFamily: "Fredoka, sans-serif",
            fontSize: Math.round(clamp(lay.rBase * 0.06, 26, 46)) + "px",
            fontStyle: "700",
            color: color || "#ffffff",
            stroke: "#7048e8",
            strokeThickness: 7
        });
        t.setOrigin(0.5);
        t.setDepth(50);
        t.setScale(0.4);
        sc.tweens.add({ targets: t, scale: 1, duration: 160, ease: "Back.easeOut" });
        sc.tweens.add({ targets: t, y: y - lay.rBase * 0.09, alpha: 0, duration: 900, delay: 120, ease: "Cubic.easeOut", onComplete: function () { t.destroy(); } });
    }

    // ------------------------------------------------------------------ montaje

    function fuenteLista() {
        if (!document.fonts || !document.fonts.load) return Promise.resolve();
        return Promise.race([
            document.fonts.load('700 24px "Fredoka"').catch(function () {}),
            new Promise(function (r) { setTimeout(r, 1500); })
        ]);
    }

    function cargarJuguetes() {
        return ((cfg && cfg.objetos) || []).map(function (o) {
            if (o.imagen) return cargarImagen("ico-" + o.id, o.imagen);
            var svg = I && I.SVG && I.SVG[o.icono || o.id];
            return svg ? cargarSvg("ico-" + o.id, svg, 120, 120) : Promise.resolve();
        });
    }

    function montar(el, config) {
        if (config) cfg = config;
        if (listoPromesa) return listoPromesa;
        if (!Phaser || !cfg) {
            console.warn("[EscenarioBurbujas] falta Phaser o config");
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
                input: { activePointers: 1 },
                scene: {
                    create: function () {
                        sc = this;
                        texturas();
                        var cargas = [fuenteLista()].concat(cargarJuguetes());
                        Object.keys((I && I.ARBOL) || {}).forEach(function (k) { cargas.push(cargarSvg("arb-" + k, I.ARBOL[k])); });
                        cargas.push(cargarSvg("canasta-atras", CANASTA.atras));
                        cargas.push(cargarSvg("canasta-frente", CANASTA.frente));
                        Promise.all(cargas).then(function () {
                            lejosIm = sc.add.image(0, 0, "fx-halo").setOrigin(0, 0).setDepth(0);
                            fondoIm = sc.add.image(0, 0, "fx-halo").setOrigin(0, 0).setDepth(2);
                            crearArboles();
                            crearMariposas();
                            frenteIm = sc.add.image(0, 0, "fx-halo").setOrigin(0, 0).setDepth(25);
                            canasta.atras = imagenDe("canasta-atras", CANASTA.atras).setDepth(20);
                            canasta.frente = imagenDe("canasta-frente", CANASTA.frente).setDepth(22);
                            luz = sc.add.rectangle(0, 0, 10, 10, 0xfff3bf, 1);
                            luz.setOrigin(0, 0);
                            luz.setBlendMode(Phaser.BlendModes.ADD);
                            luz.setDepth(45);
                            luz.setAlpha(0);
                            reacomodar();
                            sc.scale.on("resize", reacomodar);
                            sc.events.on("update", actualizar);
                            sc.input.on("pointerdown", alPuntero);
                            vigilarPosicion(el);
                            resolve(true);
                        });
                    }
                }
            });
            global.__escenarioBurbujas = juego;
        });
        return listoPromesa;
    }

    global.EscenarioBurbujas = {
        montar: montar,
        listo: function () { return !!(sc && fondoIm); },
        reacomodar: reacomodar,
        escena: function () { return sc; },
        diseno: function () { return lay; },
        config: function () { return cfg; },
        alTocar: function (fn) { cb.toque = fn; },
        alEscapar: function (fn) { cb.escape = fn; },
        alTocarVacio: function (fn) { cb.vacio = fn; },
        soltar: soltar,
        golpe: golpe,
        hayFuerte: hayFuerte,
        cercanas: cercanas,
        activas: activas,
        burbujas: function () {
            return lista.map(function (b) {
                return { id: b.id, objeto: b.objeto, x: b.x, y: b.y, r: b.r, estado: b.estado, interactiva: b.interactiva, toques: b.toques, restantes: b.restantes };
            });
        },
        reventar: reventar,
        dejarIr: dejarIr,
        destacar: destacar,
        masVisible: masVisible,
        puntoDe: function (id) {
            var b = buscar(id);
            return b && sc ? aPantalla(b.x, b.y) : null;
        },
        puntoCanasta: function () { return sc ? aPantalla(lay.canasta.x, lay.canasta.y - lay.canasta.w * 0.35) : null; },
        zonaZoe: function () {
            if (!sc) return null;
            var a = aPantalla(lay.zoe.x, lay.zoe.y);
            var b = aPantalla(lay.zoe.x + lay.zoe.w, lay.zoe.y + lay.zoe.h);
            return { left: a.x, top: a.y, width: b.x - a.x, height: b.y - a.y };
        },
        vaciarCanasta: vaciarCanasta,
        celebrarCanasta: celebrarCanasta,
        enCanasta: function () { return canasta.items.length; },
        decorar: decorar,
        estrellas: estrellas,
        lluvia: lluvia,
        iluminar: iluminar,
        flotante: flotante,
        aPantalla: aPantalla
    };
})(window);
