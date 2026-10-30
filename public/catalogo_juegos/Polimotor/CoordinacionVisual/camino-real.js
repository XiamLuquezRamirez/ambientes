/* camino-real.js — dibujo "realista" del camino de Coordinación visual.
   Solo pinta: recibe la red ya convertida a píxeles del canvas y el mismo ancho
   que usa la lógica para la tolerancia, así lo que el niño ve coincide con lo
   que el juego valida. No consume Math.random (el juego lo usa para barajar
   rutas): la textura sale de un generador propio con semilla fija.

   Capas (cada una en un solo stroke para que los cruces no se dupliquen):
   sombra → costado (grosor) → bordillo → superficie → bisel → textura → guía central.
   Las capas fijas se guardan en un canvas aparte; en cada cuadro solo se copia
   y, si la pelota se está saliendo, se tiñe de rojo encima. */
(function () {
    "use strict";

    var cache = { clave: "", lienzo: null };
    var patron = null;

    function rng(semilla) {
        var s = semilla >>> 0;
        return function () {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 4294967296;
        };
    }

    /** Grano fino tipo piso de goma (determinista). */
    function crearPatron(ctx) {
        if (patron) return patron;
        var t = document.createElement("canvas");
        t.width = t.height = 96;
        var g = t.getContext("2d");
        var r = rng(20261028);
        for (var i = 0; i < 150; i++) {
            var oscuro = r() < 0.55;
            g.fillStyle = oscuro
                ? "rgba(100,116,139," + (0.05 + r() * 0.08).toFixed(3) + ")"
                : "rgba(255,255,255," + (0.30 + r() * 0.35).toFixed(3) + ")";
            var tam = 0.5 + r() * 1.2;
            g.beginPath();
            g.arc(r() * 96, r() * 96, tam, 0, Math.PI * 2);
            g.fill();
        }
        patron = ctx.createPattern(t, "repeat");
        return patron;
    }

    function trazarRed(ctx, red, dx, dy) {
        ctx.beginPath();
        red.forEach(function (pts) {
            if (!pts || pts.length < 2) return;
            ctx.moveTo(pts[0].x + dx, pts[0].y + dy);
            for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x + dx, pts[i].y + dy);
        });
    }

    function pincel(ctx, color, ancho, dx, dy, red) {
        ctx.strokeStyle = color;
        ctx.lineWidth = ancho;
        trazarRed(ctx, red, dx || 0, dy || 0);
        ctx.stroke();
    }

    function pintarBase(ctx, red, o) {
        var w = o.ancho;
        var wb = o.borde;
        var grosor = Math.max(2, w * 0.11);
        var bordeBase = (o.colores && o.colores.borde) || "#64748b";

        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Sombra suave sobre la cancha (el camino "flota" un poco).
        ctx.save();
        ctx.shadowColor = "rgba(15,23,42,0.45)";
        ctx.shadowBlur = w * 0.55;
        ctx.shadowOffsetY = w * 0.22;
        pincel(ctx, "#334155", wb, 0, grosor, red);
        ctx.restore();

        // Costado: da grosor, como una pista de goma elevada.
        pincel(ctx, "#334155", wb, 0, grosor, red);
        // Bordillo superior.
        pincel(ctx, bordeBase, wb, 0, 0, red);
        // Superficie con leve sombreado hacia el borde inferior…
        pincel(ctx, "#e8e4da", w, 0, 0, red);
        // …y bisel claro hacia arriba (luz cenital) + grano, recortados a la superficie.
        recortadoASuperficie(ctx, red, w, function (a) {
            pincel(a, "#fffdf7", w * 0.86, 0, -w * 0.07, red);
            a.globalAlpha = 0.9;
            pincel(a, crearPatron(a), w, 0, 0, red);
            a.globalAlpha = 1;
        });

        // Guía central discontinua (igual en todas las ramas: no delata la correcta).
        ctx.save();
        ctx.setLineDash([w * 0.42, w * 0.38]);
        pincel(ctx, "rgba(148,163,184,0.55)", Math.max(1.5, w * 0.07), 0, 0, red);
        ctx.restore();

        // Punto de salida pintado bajo la pelota.
        if (o.inicio) {
            var rr = w * 0.4;
            ctx.beginPath();
            ctx.arc(o.inicio.x, o.inicio.y, rr, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(249,115,22,0.16)";
            ctx.fill();
            ctx.lineWidth = Math.max(1.5, w * 0.075);
            ctx.strokeStyle = "rgba(234,88,12,0.85)";
            ctx.stroke();
        }
        ctx.restore();
    }

    /** Recorta al área de la superficie para que el bisel no pise el bordillo. */
    function recortadoASuperficie(ctx, red, w, fn) {
        // Canvas 2D no recorta con un stroke: se pinta en una capa auxiliar
        // y se recorta con "destination-in" antes de copiarla.
        var aux = document.createElement("canvas");
        aux.width = ctx.canvas.width;
        aux.height = ctx.canvas.height;
        var a = aux.getContext("2d");
        a.lineCap = "round";
        a.lineJoin = "round";
        fn(a);
        a.globalCompositeOperation = "destination-in";
        pincel(a, "#000", w, 0, 0, red);
        ctx.drawImage(aux, 0, 0);
    }

    function claveDe(red, o, c) {
        var partes = [c.width, c.height, o.ancho.toFixed(1), o.borde.toFixed(1),
            o.inicio ? (o.inicio.x.toFixed(1) + "," + o.inicio.y.toFixed(1)) : "-"];
        red.forEach(function (pts) {
            partes.push(pts.map(function (p) { return p.x.toFixed(1) + " " + p.y.toFixed(1); }).join(";"));
        });
        return partes.join("|");
    }

    /**
     * @param ctx  contexto 2D del canvas del juego
     * @param red  [[{x,y}…]…] en píxeles del canvas (principal + distractores)
     * @param o    { ancho, borde (px), inicio {x,y} px, alerta 0..1, colores (config) }
     */
    function dibujar(ctx, red, o) {
        if (!ctx || !red || !red.length) return;
        var c = ctx.canvas;
        var clave = claveDe(red, o, c);
        if (cache.clave !== clave || !cache.lienzo) {
            var lienzo = cache.lienzo || document.createElement("canvas");
            lienzo.width = c.width;
            lienzo.height = c.height;
            var lc = lienzo.getContext("2d");
            lc.clearRect(0, 0, lienzo.width, lienzo.height);
            pintarBase(lc, red, o);
            cache = { clave: clave, lienzo: lienzo };
        }
        ctx.drawImage(cache.lienzo, 0, 0);

        // Aviso de salida: el camino se tiñe de rojo igual que el original.
        var a = Math.max(0, Math.min(1, Number(o.alerta) || 0));
        if (a > 0.01) {
            var alerta = (o.colores && o.colores.alerta) || "#e53935";
            ctx.save();
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.globalAlpha = a * 0.85;
            pincel(ctx, "#7f1d1d", o.borde, 0, 0, red);
            ctx.globalAlpha = a * 0.8;
            pincel(ctx, alerta, o.ancho, 0, 0, red);
            ctx.restore();
        }
    }

    window.CaminoReal = { dibujar: dibujar };
})();
