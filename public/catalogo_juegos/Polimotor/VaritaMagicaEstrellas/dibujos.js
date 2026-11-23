/**
 * DibujosVarita — dibujos propios de "La Varita Mágica y las Estrellas en el Cielo" (window.DibujosVarita).
 *
 * SVG: el cielo mágico (fondo 1600 × 900, claro y sin negro), colinas, nubes, luna dormida y luna feliz, planeta,
 * estrellas grandes con cara (cuerpo blanco que la escena tiñe + caras aparte), la varita, el cometa, el arcoíris
 * y las partículas. preparar() rasteriza cada SVG a <canvas> una vez; la escena los convierte en texturas.
 *
 * Canvas 2D: camino(camino, colores) dibuja el carril luminoso de cada nivel con uniones redondas y la guía de
 * puntitos por el centro.
 *
 * Las estrellas decorativas son puntitos y destellos pequeños sin cara; las que el niño enciende son grandes y
 * con cara: no se confunden.
 */
(function (global) {
    "use strict";

    var cache = {};
    var resoluciones = {};
    var listo = null;

    function svg(w, h, cuerpo) {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + " " + h + '" width="' + w + '" height="' + h + '">' + cuerpo + "</svg>";
    }

    function semilla(s) {
        return function () {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
    }

    /** Estrella de 5 puntas redondeada centrada en (cx, cy). */
    function rutaEstrella(cx, cy, r, ri, puntas) {
        var n = puntas || 5;
        var pts = [];
        for (var i = 0; i < n * 2; i++) {
            var ang = -Math.PI / 2 + i * Math.PI / n;
            var rr = i % 2 ? ri : r;
            pts.push([cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr]);
        }
        // esquinas suavizadas con curvas cuadráticas entre puntos medios
        var d = "";
        for (var k = 0; k < pts.length; k++) {
            var a = pts[k], b = pts[(k + 1) % pts.length];
            var m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
            if (k === 0) {
                var z = pts[pts.length - 1];
                d += "M" + ((z[0] + a[0]) / 2).toFixed(1) + " " + ((z[1] + a[1]) / 2).toFixed(1);
            }
            d += " Q" + a[0].toFixed(1) + " " + a[1].toFixed(1) + " " + m[0].toFixed(1) + " " + m[1].toFixed(1);
        }
        return d + " Z";
    }

    // ------------------------------------------------------------------ fondo: el cielo mágico

    function cielo() {
        var r = semilla(11);
        var puntos = "";
        for (var i = 0; i < 90; i++) {
            var x = r() * 1600, y = r() * 600;
            var rad = 0.9 + r() * 1.8;
            puntos += '<circle cx="' + x.toFixed(0) + '" cy="' + y.toFixed(0) + '" r="' + rad.toFixed(1) + '" fill="#ffffff" opacity="' + (0.25 + r() * 0.45).toFixed(2) + '"/>';
        }
        return svg(1600, 900,
            "<defs>" +
            '<linearGradient id="c" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#4f63d9"/><stop offset="0.38" stop-color="#7a7ff0"/>' +
            '<stop offset="0.7" stop-color="#b393f0"/><stop offset="1" stop-color="#f6b6d8"/></linearGradient>' +
            '<radialGradient id="n1" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ff9ee0" stop-opacity="0.45"/><stop offset="1" stop-color="#ff9ee0" stop-opacity="0"/></radialGradient>' +
            '<radialGradient id="n2" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#8ce9ff" stop-opacity="0.38"/><stop offset="1" stop-color="#8ce9ff" stop-opacity="0"/></radialGradient>' +
            '<radialGradient id="n3" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffe8a3" stop-opacity="0.35"/><stop offset="1" stop-color="#ffe8a3" stop-opacity="0"/></radialGradient>' +
            "</defs>" +
            '<rect width="1600" height="900" fill="url(#c)"/>' +
            '<ellipse cx="1180" cy="210" rx="420" ry="190" fill="url(#n1)"/>' +
            '<ellipse cx="420" cy="420" rx="380" ry="170" fill="url(#n2)"/>' +
            '<ellipse cx="900" cy="640" rx="520" ry="160" fill="url(#n1)"/>' +
            '<ellipse cx="300" cy="150" rx="260" ry="170" fill="url(#n3)"/>' +
            puntos);
    }

    /** Cielo multicolor de la escena final «El cielo de los pequeños magos». */
    function cieloFinal() {
        var r = semilla(23);
        var puntos = "";
        for (var i = 0; i < 70; i++) {
            puntos += '<circle cx="' + (r() * 1600).toFixed(0) + '" cy="' + (r() * 560).toFixed(0) + '" r="' + (1 + r() * 2).toFixed(1) + '" fill="#ffffff" opacity="' + (0.4 + r() * 0.5).toFixed(2) + '"/>';
        }
        return svg(1600, 900,
            '<defs><linearGradient id="c" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#6c8cff"/><stop offset="0.35" stop-color="#a98bff"/>' +
            '<stop offset="0.65" stop-color="#ff9fd2"/><stop offset="1" stop-color="#ffd59e"/></linearGradient>' +
            '<radialGradient id="s" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff6c9" stop-opacity="0.75"/><stop offset="1" stop-color="#fff6c9" stop-opacity="0"/></radialGradient></defs>' +
            '<rect width="1600" height="900" fill="url(#c)"/>' +
            '<ellipse cx="800" cy="470" rx="560" ry="360" fill="url(#s)"/>' +
            puntos);
    }

    function colinas(colorA, colorB, semillaN, alto) {
        var r = semilla(semillaN);
        var d = "M0 " + alto;
        var x = 0;
        while (x < 1700) {
            var ancho = 180 + r() * 220;
            var pico = 30 + r() * (alto - 60);
            d += " Q" + (x + ancho / 2).toFixed(0) + " " + (alto - pico * 2).toFixed(0) + " " + (x + ancho).toFixed(0) + " " + alto;
            x += ancho;
        }
        d += " L1700 " + (alto + 200) + " L0 " + (alto + 200) + " Z";
        return svg(1700, alto + 120,
            '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + colorA + '"/><stop offset="1" stop-color="' + colorB + '"/></linearGradient></defs>' +
            '<path d="' + d + '" fill="url(#g)"/>');
    }

    function nube() {
        return svg(300, 150,
            '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e6e4ff"/></linearGradient></defs>' +
            '<g fill="url(#g)">' +
            '<circle cx="95" cy="88" r="46"/><circle cx="150" cy="66" r="58"/><circle cx="210" cy="86" r="44"/>' +
            '<rect x="60" y="86" width="190" height="44" rx="22"/></g>' +
            '<path d="M70 120 Q150 138 240 120" stroke="#cfcaf5" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.6"/>');
    }

    function luna(feliz) {
        var ojos = feliz
            ? '<circle cx="70" cy="86" r="9" fill="#5b4a8a"/><circle cx="112" cy="86" r="9" fill="#5b4a8a"/>' +
              '<circle cx="73" cy="83" r="3" fill="#fff"/><circle cx="115" cy="83" r="3" fill="#fff"/>' +
              '<path d="M66 108 Q91 134 116 108" stroke="#5b4a8a" stroke-width="6" fill="#ff8fab" stroke-linecap="round"/>'
            : '<path d="M60 88 Q70 96 80 88" stroke="#7a6aa8" stroke-width="5" fill="none" stroke-linecap="round"/>' +
              '<path d="M102 88 Q112 96 122 88" stroke="#7a6aa8" stroke-width="5" fill="none" stroke-linecap="round"/>' +
              '<path d="M82 112 Q91 117 100 112" stroke="#7a6aa8" stroke-width="5" fill="none" stroke-linecap="round"/>';
        return svg(180, 180,
            '<defs><radialGradient id="g" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#fffbe6"/><stop offset="0.7" stop-color="#ffe9a8"/><stop offset="1" stop-color="#f7cf6b"/></radialGradient></defs>' +
            '<circle cx="90" cy="90" r="80" fill="url(#g)"/>' +
            '<circle cx="128" cy="52" r="12" fill="#f3d27e" opacity="0.7"/><circle cx="54" cy="130" r="9" fill="#f3d27e" opacity="0.7"/><circle cx="140" cy="122" r="7" fill="#f3d27e" opacity="0.7"/>' +
            '<circle cx="56" cy="104" r="11" fill="#ffadc6" opacity="0.7"/><circle cx="126" cy="104" r="11" fill="#ffadc6" opacity="0.7"/>' +
            ojos);
    }

    function planeta() {
        return svg(180, 120,
            '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc9e3"/><stop offset="1" stop-color="#c38bf0"/></linearGradient></defs>' +
            '<ellipse cx="90" cy="64" rx="84" ry="20" fill="none" stroke="#fff1a8" stroke-width="7" opacity="0.85"/>' +
            '<circle cx="90" cy="58" r="40" fill="url(#g)"/>' +
            '<path d="M58 50 Q90 40 122 52" stroke="#ffffff" stroke-width="5" fill="none" opacity="0.45" stroke-linecap="round"/>' +
            '<path d="M8 66 Q90 92 172 62" stroke="#fff1a8" stroke-width="7" fill="none" stroke-linecap="round"/>');
    }

    // ------------------------------------------------------------------ estrellas grandes (cuerpo blanco teñible + caras)

    function estrella() {
        return svg(140, 140,
            '<defs><radialGradient id="g" cx="0.45" cy="0.4" r="0.65"><stop offset="0" stop-color="#ffffff"/><stop offset="0.75" stop-color="#f1f1ff"/><stop offset="1" stop-color="#d9daf5"/></radialGradient></defs>' +
            '<path d="' + rutaEstrella(70, 74, 64, 30) + '" fill="url(#g)" stroke="#ffffff" stroke-width="5" stroke-linejoin="round"/>' +
            '<path d="M48 40 Q58 30 66 32" stroke="#ffffff" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.9"/>');
    }

    function caraDormida() {
        return svg(140, 140,
            '<path d="M52 78 Q58 84 64 78" stroke="#4a4a7a" stroke-width="4.5" fill="none" stroke-linecap="round"/>' +
            '<path d="M76 78 Q82 84 88 78" stroke="#4a4a7a" stroke-width="4.5" fill="none" stroke-linecap="round"/>' +
            '<path d="M64 94 Q70 97 76 94" stroke="#4a4a7a" stroke-width="4" fill="none" stroke-linecap="round"/>' +
            '<text x="94" y="56" font-family="Arial" font-weight="700" font-size="16" fill="#ffffff" opacity="0.9">z</text>');
    }

    function caraFeliz() {
        return svg(140, 140,
            '<circle cx="58" cy="78" r="6.5" fill="#3d2f6b"/><circle cx="82" cy="78" r="6.5" fill="#3d2f6b"/>' +
            '<circle cx="60" cy="76" r="2.3" fill="#fff"/><circle cx="84" cy="76" r="2.3" fill="#fff"/>' +
            '<circle cx="48" cy="90" r="6" fill="#ff8fb1" opacity="0.75"/><circle cx="92" cy="90" r="6" fill="#ff8fb1" opacity="0.75"/>' +
            '<path d="M60 92 Q70 104 80 92" stroke="#3d2f6b" stroke-width="4.5" fill="#ff7096" stroke-linecap="round" stroke-linejoin="round"/>');
    }

    // ------------------------------------------------------------------ la varita (punta en (34, 34) del lienzo)

    function varita() {
        return svg(170, 170,
            '<defs>' +
            '<linearGradient id="m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b57bff"/><stop offset="1" stop-color="#6a3fd1"/></linearGradient>' +
            '<radialGradient id="e" cx="0.45" cy="0.4" r="0.65"><stop offset="0" stop-color="#fffbe0"/><stop offset="0.6" stop-color="#ffe066"/><stop offset="1" stop-color="#ffb627"/></radialGradient>' +
            "</defs>" +
            // mango: de la estrella hacia abajo a la derecha, con bandas doradas
            '<path d="M52 52 L150 150" stroke="#3b1f7a" stroke-width="20" stroke-linecap="round"/>' +
            '<path d="M52 52 L150 150" stroke="url(#m)" stroke-width="14" stroke-linecap="round"/>' +
            '<path d="M60 56 L146 142" stroke="#e5d0ff" stroke-width="4" stroke-linecap="round" opacity="0.6"/>' +
            '<path d="M120 112 L112 128 M131 123 L123 139" stroke="#ffd43b" stroke-width="6" stroke-linecap="round"/>' +
            '<circle cx="150" cy="150" r="9" fill="#ffd43b" stroke="#b8860b" stroke-width="3"/>' +
            // estrella de la punta
            '<path d="' + rutaEstrella(34, 36, 32, 15) + '" fill="url(#e)" stroke="#fff7cc" stroke-width="3.5" stroke-linejoin="round"/>' +
            '<circle cx="27" cy="34" r="3.2" fill="#6b4b00"/><circle cx="41" cy="34" r="3.2" fill="#6b4b00"/>' +
            '<path d="M28 42 Q34 48 40 42" stroke="#6b4b00" stroke-width="2.6" fill="none" stroke-linecap="round"/>');
    }

    function cometa() {
        return svg(320, 130,
            '<defs><linearGradient id="c" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="0.4" stop-color="#8ce9ff" stop-opacity="0.7"/><stop offset="1" stop-color="#74c0fc" stop-opacity="0"/></linearGradient>' +
            '<radialGradient id="e" cx="0.45" cy="0.4" r="0.65"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#9be7ff"/></radialGradient></defs>' +
            '<path d="M250 40 Q130 30 10 64 Q130 98 250 90 Z" fill="url(#c)"/>' +
            '<path d="' + rutaEstrella(262, 65, 46, 21) + '" fill="url(#e)" stroke="#ffffff" stroke-width="4" stroke-linejoin="round"/>' +
            '<circle cx="254" cy="64" r="4.5" fill="#2b4f8a"/><circle cx="272" cy="64" r="4.5" fill="#2b4f8a"/>' +
            '<path d="M254 76 Q263 84 272 76" stroke="#2b4f8a" stroke-width="3.5" fill="none" stroke-linecap="round"/>');
    }

    function arcoiris() {
        var colores = ["#ff8787", "#ffc078", "#ffe066", "#8ce99a", "#74c0fc", "#b197fc"];
        var cuerpo = "";
        colores.forEach(function (c, i) {
            var r = 380 - i * 30;
            cuerpo += '<path d="M' + (400 - r) + " 400 A" + r + " " + r + " 0 0 1 " + (400 + r) + ' 400" stroke="' + c + '" stroke-width="30" fill="none"/>';
        });
        return svg(800, 420, '<g opacity="0.92">' + cuerpo + "</g>" +
            '<g fill="#ffffff"><circle cx="40" cy="392" r="34"/><circle cx="84" cy="400" r="28"/><circle cx="760" cy="392" r="34"/><circle cx="716" cy="400" r="28"/></g>');
    }

    function halo() {
        return svg(128, 128,
            '<defs><radialGradient id="g" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffffff" stop-opacity="1"/><stop offset="0.35" stop-color="#ffffff" stop-opacity="0.5"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs>' +
            '<circle cx="64" cy="64" r="64" fill="url(#g)"/>');
    }

    function aro() {
        return svg(128, 128, '<circle cx="64" cy="64" r="56" fill="none" stroke="#ffffff" stroke-width="8"/>');
    }

    function chispa() {
        return svg(64, 64,
            '<path d="M32 2 Q36 28 62 32 Q36 36 32 62 Q28 36 2 32 Q28 28 32 2 Z" fill="#ffffff"/>');
    }

    function punto() {
        return svg(32, 32,
            '<defs><radialGradient id="g" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffffff"/><stop offset="0.5" stop-color="#ffffff" stop-opacity="0.6"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs>' +
            '<circle cx="16" cy="16" r="16" fill="url(#g)"/>');
    }

    function estrellita() {
        return svg(48, 48, '<path d="' + rutaEstrella(24, 25, 22, 10) + '" fill="#ffffff"/>');
    }

    function flecha() {
        return svg(64, 64, '<path d="M18 12 L44 32 L18 52" stroke="#ffffff" stroke-width="11" fill="none" stroke-linecap="round" stroke-linejoin="round"/>');
    }

    function confeti() {
        return svg(24, 14, '<rect x="1" y="1" width="22" height="12" rx="4" fill="#ffffff"/>');
    }

    /** Ranura de la consola de niveles (cielo pendiente). */
    function ranura() {
        return svg(80, 80, '<circle cx="40" cy="40" r="34" fill="#ffffff" fill-opacity="0.18" stroke="#ffffff" stroke-opacity="0.65" stroke-width="4" stroke-dasharray="7 6"/>');
    }

    function lista() {
        return [
            ["cielo", cielo(), 1],
            ["cielo-final", cieloFinal(), 1],
            ["colinas-lejos", colinas("#a58be8", "#8a72d6", 5, 150), 1],
            ["colinas-cerca", colinas("#7d68cf", "#5d4bb0", 9, 120), 1],
            ["nube", nube(), 1.4],
            ["luna-dormida", luna(false), 1.6],
            ["luna-feliz", luna(true), 1.6],
            ["planeta", planeta(), 1.4],
            ["estrella", estrella(), 1.6],
            ["cara-dormida", caraDormida(), 1.6],
            ["cara-feliz", caraFeliz(), 1.6],
            ["varita", varita(), 1.6],
            ["cometa", cometa(), 1.4],
            ["arcoiris", arcoiris(), 1.2],
            ["halo", halo(), 1],
            ["aro", aro(), 1],
            ["chispa", chispa(), 1],
            ["punto", punto(), 1],
            ["estrellita", estrellita(), 1],
            ["flecha", flecha(), 1],
            ["confeti", confeti(), 1],
            ["ranura", ranura(), 1.4]
        ];
    }

    function rasterizar(clave, s, res) {
        return new Promise(function (resolve) {
            var m = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(s);
            var w = m ? Number(m[1]) : 100, h = m ? Number(m[2]) : 100;
            var k = res || 1;
            var img = new Image();
            var hecho = function (ok) {
                var c = document.createElement("canvas");
                c.width = Math.ceil(w * k);
                c.height = Math.ceil(h * k);
                if (ok) c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
                cache[clave] = c;
                resoluciones[clave] = k;
                resolve();
            };
            img.onload = function () { hecho(true); };
            img.onerror = function () {
                console.warn("[DibujosVarita] no se pudo dibujar", clave);
                hecho(false);
            };
            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
        });
    }

    function preparar() {
        if (!listo) listo = Promise.all(lista().map(function (p) { return rasterizar(p[0], p[1], p[2]); }));
        return listo;
    }

    // ------------------------------------------------------------------ el carril luminoso (Canvas 2D)

    function trazar(ctx, m) {
        ctx.beginPath();
        for (var i = 0; i < m.length; i += 2) {
            if (i === 0) ctx.moveTo(m[i].x, m[i].y);
            else ctx.lineTo(m[i].x, m[i].y);
        }
        var z = m[m.length - 1];
        ctx.lineTo(z.x, z.y);
    }

    function capa(ctx, m, ancho, color, alpha, sombra) {
        ctx.save();
        ctx.globalAlpha = alpha == null ? 1 : alpha;
        ctx.strokeStyle = color;
        ctx.lineWidth = ancho;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (sombra) {
            ctx.shadowColor = sombra.color;
            ctx.shadowBlur = sombra.blur;
        }
        trazar(ctx, m);
        ctx.stroke();
        ctx.restore();
    }

    /** Carril del nivel: halo del color del nivel, cuerpo claro translúcido, borde suave y puntitos guía. */
    function camino(c, colores, k) {
        k = k || 1;
        var lienzo = document.createElement("canvas");
        lienzo.width = Math.ceil(1600 * k);
        lienzo.height = Math.ceil(900 * k);
        var ctx = lienzo.getContext("2d");
        ctx.scale(k, k);
        var m = c.muestras, a = c.ancho;
        var col = (colores && colores[0]) || "#8ce9ff";
        capa(ctx, m, a + 26, col, 0.28, { color: col, blur: 30 });
        capa(ctx, m, a + 6, "#ffffff", 0.32);
        capa(ctx, m, a - 6, "#3d3a8c", 0.28);
        capa(ctx, m, a - 18, "#ffffff", 0.16);
        capa(ctx, m, a * 0.36, col, 0.22);
        // puntitos guía por el centro (marcan el camino y su dirección)
        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = col;
        ctx.shadowBlur = 10;
        ctx.globalAlpha = 0.85;
        for (var s = 60; s < c.largo - 40; s += 30) {
            var p = m[Math.min(m.length - 1, Math.round(s / c.paso))];
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        return lienzo;
    }

    global.DibujosVarita = {
        preparar: preparar,
        lienzo: function (clave) { return cache[clave] || null; },
        res: function (clave) { return resoluciones[clave] || 1; },
        claves: function () { return Object.keys(cache); },
        camino: camino,
        PUNTA: { x: 34, y: 36, w: 170, h: 170 },
        svgVarita: varita,
        svgEstrella: estrella,
        svgLuna: luna
    };
})(typeof window !== "undefined" ? window : global);
