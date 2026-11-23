/**
 * DibujosEstacion — dibujos SVG propios de "¡La Estación de Clasificación!" (window.DibujosEstacion).
 *
 * La estación (fondo), los contenedores (uno por color de cuerpo), la compuerta, la placa de la
 * etiqueta, los íconos de atributos (color, tamaño, forma), los objetos clasificables (5 formas ×
 * 6 colores) y las partículas de las celebraciones. preparar() rasteriza cada SVG a <canvas> una
 * sola vez y la escena los convierte en texturas de Phaser.
 */
(function (global) {
    "use strict";

    var cache = {};
    var resoluciones = {};
    var listo = null;

    /** Lienzo de los objetos: 180 × 180 con la figura centrada. */
    var OBJ = 180;
    /** Contenedor: 260 × 300; su centro de diseño es el centro del lienzo. */
    var BIN = { w: 260, h: 300 };

    var PALETA = {
        azul: { luz: "#9fd6ff", medio: "#3498ff", sombra: "#1a5bc4", linea: "#0b2d66", tinte: 0x3498ff },
        amarillo: { luz: "#fff6b8", medio: "#ffcf32", sombra: "#e09a00", linea: "#6b4300", tinte: 0xffcf32 },
        rojo: { luz: "#ffb3b3", medio: "#f03e3e", sombra: "#b01e1e", linea: "#4a0808", tinte: 0xf03e3e },
        verde: { luz: "#c3f7b4", medio: "#40c057", sombra: "#2b8a3e", linea: "#0b3015", tinte: 0x40c057 },
        naranja: { luz: "#ffd8a8", medio: "#ff922b", sombra: "#d9480f", linea: "#4a1a03", tinte: 0xff922b },
        morado: { luz: "#e5c9ff", medio: "#9b5de5", sombra: "#6a2fb5", linea: "#2a0d4f", tinte: 0x9b5de5 },
        turquesa: { luz: "#b2f2e0", medio: "#20c997", sombra: "#0f8a66", linea: "#063d2e", tinte: 0x20c997 },
        // nivel 2: todo gris, para que solo cuente el tamaño
        gris: { luz: "#eef1f5", medio: "#9aa5b4", sombra: "#5f6b7c", linea: "#232a36", tinte: 0x9aa5b4 }
    };
    var FORMAS = ["cuadrado", "circulo", "estrella", "triangulo", "rectangulo"];
    /** Cuerpos de contenedor que usa config.json (se pueden añadir más). */
    var CUERPOS = ["#3498ff", "#ffcf32", "#9b5de5", "#20c997", "#12b886", "#f76707", "#7048e8", "#1098ad", "#39bfe3", "#f5de76", "#8f9bab"];

    function svg(w, h, cuerpo) {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + " " + h + '" width="' + w + '" height="' + h + '">' + cuerpo + "</svg>";
    }

    // ------------------------------------------------------------------ color

    function rgb(hex) {
        var h = hex.replace("#", "");
        return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
    }
    function hexDe(c) {
        return "#" + c.map(function (v) { var s = Math.max(0, Math.min(255, Math.round(v))).toString(16); return s.length < 2 ? "0" + s : s; }).join("");
    }
    function mezcla(a, b, t) {
        var x = rgb(a), y = rgb(b);
        return hexDe([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
    }
    function claveCuerpo(hex) { return hex.replace("#", "").toLowerCase(); }

    // ------------------------------------------------------------------ figuras (centro 90,90)

    function estrellaPts(cx, cy, re, ri, n) {
        var p = [];
        for (var i = 0; i < n * 2; i++) {
            var r = i % 2 ? ri : re;
            var a = -Math.PI / 2 + i * Math.PI / n;
            p.push((cx + Math.cos(a) * r).toFixed(1) + "," + (cy + Math.sin(a) * r).toFixed(1));
        }
        return p.join(" ");
    }

    /** Silueta de cada forma: la misma geometría para el objeto, su contorno y los íconos. */
    function silueta(forma, attrs) {
        var a = attrs || "";
        switch (forma) {
            case "cuadrado": return '<rect x="22" y="22" width="136" height="136" rx="18" ' + a + "/>";
            case "circulo": return '<circle cx="90" cy="90" r="70" ' + a + "/>";
            case "estrella": return '<polygon points="' + estrellaPts(90, 94, 82, 37, 5) + '" stroke-linejoin="round" ' + a + "/>";
            case "triangulo": return '<path d="M90 16 Q 96 16 99 22 L 165 144 Q 168 152 160 154 L 20 154 Q 12 152 15 144 L 81 22 Q 84 16 90 16 Z" ' + a + "/>";
            case "rectangulo": return '<rect x="10" y="52" width="160" height="78" rx="14" ' + a + "/>";
        }
        return "";
    }

    function objeto(forma, color) {
        var c = PALETA[color] || PALETA.azul;
        var defs = '<defs>' +
            '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c.luz + '"/><stop offset="0.45" stop-color="' + c.medio + '"/><stop offset="1" stop-color="' + c.sombra + '"/></linearGradient>' +
            '<radialGradient id="r" cx="0.36" cy="0.32" r="0.75"><stop offset="0" stop-color="' + c.luz + '"/><stop offset="0.5" stop-color="' + c.medio + '"/><stop offset="1" stop-color="' + c.sombra + '"/></radialGradient>' +
            '<radialGradient id="b" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff" stop-opacity="0.85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
            "</defs>";
        var trazo = 'stroke="' + c.linea + '" stroke-width="6"';
        var cuerpo = "";
        if (forma === "cuadrado") {
            // caja: cara frontal con biselado, cinta y solapas marcadas
            cuerpo = silueta("cuadrado", 'fill="url(#g)" ' + trazo) +
                '<rect x="34" y="34" width="112" height="112" rx="10" fill="none" stroke="' + c.luz + '" stroke-opacity="0.55" stroke-width="5"/>' +
                '<rect x="76" y="25" width="28" height="130" fill="' + c.luz + '" fill-opacity="0.55"/>' +
                '<line x1="25" y1="62" x2="155" y2="62" stroke="' + c.linea + '" stroke-opacity="0.35" stroke-width="4"/>' +
                '<path d="M30 150 L 150 150 L 150 30" fill="none" stroke="' + c.sombra + '" stroke-width="7" stroke-linecap="round" stroke-opacity="0.7"/>' +
                '<ellipse cx="54" cy="44" rx="18" ry="8" fill="url(#b)"/>';
        } else if (forma === "circulo") {
            // pelota: volumen, brillo y costuras
            cuerpo = silueta("circulo", 'fill="url(#r)" ' + trazo) +
                '<path d="M24 82 Q 90 112 156 82" fill="none" stroke="' + c.luz + '" stroke-opacity="0.75" stroke-width="5"/>' +
                '<path d="M82 22 Q 112 90 82 158" fill="none" stroke="' + c.luz + '" stroke-opacity="0.75" stroke-width="5"/>' +
                '<path d="M48 38 Q 66 90 48 142" fill="none" stroke="' + c.sombra + '" stroke-opacity="0.5" stroke-width="4"/>' +
                '<ellipse cx="62" cy="56" rx="22" ry="14" fill="url(#b)" transform="rotate(-30 62 56)"/>';
        } else if (forma === "estrella") {
            cuerpo = silueta("estrella", 'fill="url(#g)" ' + trazo) +
                '<polygon points="' + estrellaPts(90, 94, 56, 25, 5) + '" fill="' + c.luz + '" fill-opacity="0.5" stroke-linejoin="round"/>' +
                '<ellipse cx="76" cy="64" rx="12" ry="7" fill="url(#b)"/>';
        } else if (forma === "triangulo") {
            cuerpo = silueta("triangulo", 'fill="url(#g)" ' + trazo) +
                '<path d="M90 46 L 138 136 L 42 136 Z" fill="' + c.luz + '" fill-opacity="0.45" stroke-linejoin="round"/>' +
                '<path d="M24 148 L 156 148" stroke="' + c.sombra + '" stroke-width="7" stroke-linecap="round" stroke-opacity="0.7"/>' +
                '<ellipse cx="82" cy="52" rx="10" ry="6" fill="url(#b)"/>';
        } else {
            // placa rectangular con tornillos
            cuerpo = silueta("rectangulo", 'fill="url(#g)" ' + trazo) +
                '<rect x="22" y="64" width="136" height="54" rx="8" fill="none" stroke="' + c.luz + '" stroke-opacity="0.55" stroke-width="5"/>' +
                ["28,68", "152,68", "28,114", "152,114"].map(function (p) {
                    var xy = p.split(",");
                    return '<circle cx="' + xy[0] + '" cy="' + xy[1] + '" r="6" fill="' + c.luz + '" stroke="' + c.linea + '" stroke-width="2.5"/>';
                }).join("") +
                '<path d="M16 126 L 164 126" stroke="' + c.sombra + '" stroke-width="6" stroke-linecap="round" stroke-opacity="0.7"/>' +
                '<ellipse cx="54" cy="62" rx="22" ry="6" fill="url(#b)"/>';
        }
        return svg(OBJ, OBJ, defs + cuerpo);
    }

    /** Silueta blanca y gruesa: contorno brillante del objeto tomado (se tiñe en la escena). */
    function contorno(forma) {
        return svg(OBJ, OBJ, silueta(forma, 'fill="#fff" stroke="#fff" stroke-width="16" stroke-linejoin="round"'));
    }

    // ------------------------------------------------------------------ contenedor

    function contenedor(hex) {
        var luz = mezcla(hex, "#ffffff", 0.45), medio = hex, oscuro = mezcla(hex, "#0b1636", 0.42), muy = mezcla(hex, "#0b1636", 0.65);
        var defs = '<defs>' +
            '<linearGradient id="c" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="' + oscuro + '"/><stop offset="0.22" stop-color="' + medio + '"/><stop offset="0.4" stop-color="' + luz + '"/><stop offset="0.62" stop-color="' + medio + '"/><stop offset="1" stop-color="' + muy + '"/></linearGradient>' +
            '<linearGradient id="m" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7d8fb0"/><stop offset="0.4" stop-color="#eef3fb"/><stop offset="1" stop-color="#6c7d9c"/></linearGradient>' +
            '<radialGradient id="boca" cx="0.5" cy="0.4" r="0.6"><stop offset="0" stop-color="#03081c"/><stop offset="1" stop-color="#14244d"/></radialGradient>' +
            '<radialGradient id="s" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#000814" stop-opacity="0.55"/><stop offset="1" stop-color="#000814" stop-opacity="0"/></radialGradient>' +
            "</defs>";
        var c = "";
        c += '<ellipse cx="130" cy="286" rx="122" ry="14" fill="url(#s)"/>';
        // cuerpo (cilindro algo más ancho arriba)
        c += '<path d="M18 74 L 242 74 L 228 270 Q 228 282 214 282 L 46 282 Q 32 282 32 270 Z" fill="url(#c)" stroke="#0b1636" stroke-width="5" stroke-linejoin="round"/>';
        // reflejo vertical
        c += '<path d="M78 84 L 96 84 L 92 272 L 80 272 Z" fill="#fff" fill-opacity="0.18"/>';
        // bandas metálicas
        c += '<path d="M21 104 L 239 104 L 237 120 L 23 120 Z" fill="url(#m)" stroke="#0b1636" stroke-width="3"/>';
        c += '<path d="M30 246 L 230 246 L 229 262 L 31 262 Z" fill="url(#m)" stroke="#0b1636" stroke-width="3"/>';
        [40, 90, 170, 220].forEach(function (x) { c += '<circle cx="' + x + '" cy="112" r="3.5" fill="#4c5b78"/>'; });
        // ventana de la etiqueta (pantalla donde la escena pone los íconos)
        c += '<rect x="48" y="130" width="164" height="106" rx="16" fill="#0b1a3d" stroke="#eef3fb" stroke-width="5"/>';
        c += '<rect x="56" y="138" width="148" height="90" rx="11" fill="#13306b"/>';
        c += '<path d="M60 142 L 200 142 L 200 160 Q 130 150 60 166 Z" fill="#fff" fill-opacity="0.08"/>';
        // borde superior y boca
        c += '<ellipse cx="130" cy="74" rx="120" ry="28" fill="url(#m)" stroke="#0b1636" stroke-width="5"/>';
        c += '<ellipse cx="130" cy="74" rx="102" ry="19" fill="url(#boca)"/>';
        c += '<path d="M30 74 A 100 19 0 0 1 230 74" fill="none" stroke="' + luz + '" stroke-opacity="0.35" stroke-width="3"/>';
        return svg(BIN.w, BIN.h, defs + c);
    }

    /** Compuerta: tapa metálica que cubre la boca; la escena la levanta para recibir el objeto. */
    function tapa() {
        var defs = '<defs><linearGradient id="t" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8296b8"/><stop offset="0.42" stop-color="#f4f8ff"/><stop offset="1" stop-color="#71839f"/></linearGradient>' +
            '<linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.6"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient></defs>';
        var c = '<ellipse cx="120" cy="46" rx="110" ry="24" fill="#3b4a66"/>' +
            '<ellipse cx="120" cy="40" rx="110" ry="24" fill="url(#t)" stroke="#0b1636" stroke-width="5"/>' +
            '<ellipse cx="120" cy="40" rx="74" ry="14" fill="none" stroke="#5d6f90" stroke-width="4"/>' +
            '<path d="M14 36 L 226 36" stroke="#0b1636" stroke-opacity="0.35" stroke-width="3"/>' +
            '<rect x="96" y="20" width="48" height="14" rx="7" fill="#dfe6f2" stroke="#0b1636" stroke-width="4"/>' +
            '<ellipse cx="88" cy="32" rx="40" ry="7" fill="url(#v)"/>';
        return svg(240, 74, defs + c);
    }

    function placa() {
        var defs = '<defs><linearGradient id="p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dfeaf8"/></linearGradient></defs>';
        return svg(250, 66, defs +
            '<rect x="4" y="8" width="242" height="54" rx="16" fill="#0b1636" fill-opacity="0.35"/>' +
            '<rect x="4" y="4" width="242" height="54" rx="16" fill="url(#p)" stroke="#0b1636" stroke-width="5"/>' +
            '<circle cx="18" cy="31" r="4" fill="#9aa9c4"/><circle cx="232" cy="31" r="4" fill="#9aa9c4"/>');
    }

    // ------------------------------------------------------------------ íconos de atributos

    function icoColor(color) {
        var c = PALETA[color] || PALETA.azul;
        var defs = '<defs><radialGradient id="r" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="' + c.luz + '"/><stop offset="0.55" stop-color="' + c.medio + '"/><stop offset="1" stop-color="' + c.sombra + '"/></radialGradient></defs>';
        // gota de pintura sobre un aro blanco: el color se ve puro sobre la pantalla oscura
        return svg(100, 100, defs +
            '<circle cx="50" cy="52" r="42" fill="#fff"/>' +
            '<path d="M50 14 C 66 34, 82 46, 82 62 A 32 32 0 0 1 18 62 C 18 46, 34 34, 50 14 Z" fill="url(#r)" stroke="' + c.linea + '" stroke-width="4"/>' +
            '<ellipse cx="38" cy="54" rx="8" ry="12" fill="#fff" fill-opacity="0.55" transform="rotate(20 38 54)"/>');
    }

    /** Grande: la figura llena y una pequeña de referencia; pequeño: al revés (comparación visible). */
    function icoTamano(cual) {
        var g = cual === "grande";
        var lleno = 'fill="#e3fafc" stroke="#fff" stroke-width="3"';
        var fantasma = 'fill="none" stroke="#7fa6d9" stroke-width="3" stroke-dasharray="6 5"';
        var grande = '<rect x="6" y="14" width="74" height="74" rx="12" ' + (g ? lleno : fantasma) + "/>";
        var chico = '<rect x="88" y="58" width="30" height="30" rx="6" ' + (g ? fantasma : lleno) + "/>";
        // la figura que cuenta lleva una estrellita encima
        var marca = g
            ? '<polygon points="' + estrellaPts(43, 51, 16, 7, 5) + '" fill="#ffd43b"/>'
            : '<polygon points="' + estrellaPts(103, 73, 9, 4, 5) + '" fill="#ffd43b"/>';
        return svg(124, 100, grande + chico + marca);
    }

    function icoForma(forma) {
        return svg(OBJ, OBJ, silueta(forma, 'fill="#e3fafc" stroke="#ffffff" stroke-width="8" stroke-linejoin="round"'));
    }

    function marcaOk() {
        return svg(64, 64, '<circle cx="32" cy="32" r="28" fill="#2fbf5b" stroke="#fff" stroke-width="5"/><path d="M18 33 L 28 43 L 46 22" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>');
    }

    /** No coincide: un ojo que invita a mirar de nuevo (naranja suave, nada de cruces rojas). */
    function marcaMira() {
        return svg(64, 64, '<circle cx="32" cy="32" r="28" fill="#ff9f43" stroke="#fff" stroke-width="5"/>' +
            '<path d="M12 32 Q 32 14 52 32 Q 32 50 12 32 Z" fill="#fff"/><circle cx="32" cy="32" r="8" fill="#7a3a00"/><circle cx="35" cy="29" r="2.5" fill="#fff"/>');
    }

    // ------------------------------------------------------------------ estación (fondo)

    function estacion() {
        var defs = '<defs>' +
            '<linearGradient id="pared" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#173a78"/><stop offset="0.5" stop-color="#1f5d9e"/><stop offset="1" stop-color="#184a83"/></linearGradient>' +
            '<linearGradient id="piso" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a7a8c"/><stop offset="1" stop-color="#0f3f5c"/></linearGradient>' +
            '<linearGradient id="tubo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8f0fb"/><stop offset="0.5" stop-color="#9fb2cf"/><stop offset="1" stop-color="#5e7090"/></linearGradient>' +
            '<linearGradient id="tuboA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe58a"/><stop offset="0.5" stop-color="#f5b70a"/><stop offset="1" stop-color="#a86b00"/></linearGradient>' +
            '<linearGradient id="tuboV" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5e7090"/><stop offset="0.5" stop-color="#e8f0fb"/><stop offset="1" stop-color="#5e7090"/></linearGradient>' +
            '<linearGradient id="estante" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d7e2f2"/><stop offset="1" stop-color="#7486a6"/></linearGradient>' +
            '<linearGradient id="cinta" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4258"/><stop offset="1" stop-color="#1d2335"/></linearGradient>' +
            '<linearGradient id="mesa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9b5de5"/><stop offset="1" stop-color="#5b2a9e"/></linearGradient>' +
            '<radialGradient id="foco" cx="0.5" cy="0.35" r="0.6"><stop offset="0" stop-color="#7ff3ff" stop-opacity="0.22"/><stop offset="1" stop-color="#7ff3ff" stop-opacity="0"/></radialGradient>' +
            "</defs>";
        var c = '<rect width="1600" height="900" fill="url(#pared)"/>';
        // paneles de la pared
        for (var i = 0; i < 9; i++) {
            var x = 20 + i * 176;
            c += '<rect x="' + x + '" y="96" width="160" height="350" rx="18" fill="#2a6db3" fill-opacity="0.35" stroke="#7fc8ff" stroke-opacity="0.18" stroke-width="3"/>';
            c += '<rect x="' + (x + 18) + '" y="120" width="124" height="10" rx="5" fill="#7fc8ff" fill-opacity="0.16"/>';
        }
        c += '<rect width="1600" height="900" fill="url(#foco)"/>';
        // tuberías del techo
        c += '<rect x="0" y="22" width="1600" height="34" fill="url(#tubo)"/>';
        c += '<rect x="0" y="64" width="1600" height="16" fill="url(#tuboA)"/>';
        for (var j = 0; j < 11; j++) {
            var xx = 60 + j * 150;
            c += '<rect x="' + xx + '" y="16" width="22" height="46" rx="5" fill="#c7d3e6" stroke="#2c3b58" stroke-width="3"/>';
        }
        // tuberías verticales a los lados (con codos)
        [[118, 0x0], [1482, 0x1]].forEach(function (t) {
            c += '<rect x="' + (t[0] - 15) + '" y="56" width="30" height="430" fill="url(#tuboV)"/>';
            c += '<rect x="' + (t[0] - 21) + '" y="180" width="42" height="18" rx="5" fill="#c7d3e6" stroke="#2c3b58" stroke-width="3"/>';
            c += '<rect x="' + (t[0] - 21) + '" y="360" width="42" height="18" rx="5" fill="#c7d3e6" stroke="#2c3b58" stroke-width="3"/>';
        });
        // pantallas laterales con gráficas
        [[24, 220], [1476, 220]].forEach(function (p) {
            c += '<rect x="' + p[0] + '" y="' + p[1] + '" width="100" height="120" rx="12" fill="#0b1a3d" stroke="#d7e2f2" stroke-width="5"/>';
            c += '<path d="M' + (p[0] + 12) + " " + (p[1] + 96) + " L " + (p[0] + 32) + " " + (p[1] + 70) + " L " + (p[0] + 50) + " " + (p[1] + 82) + " L " + (p[0] + 70) + " " + (p[1] + 44) + " L " + (p[0] + 88) + " " + (p[1] + 58) + '" fill="none" stroke="#69db7c" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>';
            c += '<rect x="' + (p[0] + 14) + '" y="' + (p[1] + 16) + '" width="40" height="8" rx="4" fill="#3bdcff"/>';
        });
        // estante donde se apoyan los contenedores
        c += '<rect x="170" y="458" width="1260" height="22" rx="8" fill="url(#estante)" stroke="#2c3b58" stroke-width="4"/>';
        c += '<rect x="170" y="478" width="1260" height="16" fill="#0b1636" fill-opacity="0.3"/>';
        // piso
        c += '<path d="M0 494 L 1600 494 L 1600 900 L 0 900 Z" fill="url(#piso)"/>';
        for (var k = 0; k < 14; k++) {
            c += '<path d="M' + (800 + (k - 7) * 60) + ' 494 L ' + (800 + (k - 7) * 250) + ' 900" stroke="#7ff3ff" stroke-opacity="0.08" stroke-width="3"/>';
        }
        c += '<path d="M0 560 L 1600 560 M 0 640 L 1600 640" stroke="#7ff3ff" stroke-opacity="0.06" stroke-width="3"/>';
        // consolas en las esquinas de abajo
        [[0, 1], [1600, -1]].forEach(function (s) {
            var x0 = s[0], d = s[1];
            c += '<path d="M' + x0 + " 560 L " + (x0 + d * 190) + " 600 L " + (x0 + d * 190) + " 900 L " + x0 + ' 900 Z" fill="#2c4f86" stroke="#0b1636" stroke-width="5"/>';
            c += '<path d="M' + x0 + " 560 L " + (x0 + d * 190) + " 600 L " + (x0 + d * 170) + " 640 L " + x0 + ' 610 Z" fill="#7fa6d9"/>';
            c += '<rect x="' + (d > 0 ? x0 + 30 : x0 - 160) + '" y="660" width="130" height="80" rx="10" fill="#0b1a3d" stroke="#d7e2f2" stroke-width="4"/>';
        });
        // mesa de la cinta transportadora (morada, como el tapete del original pero propia)
        c += '<path d="M206 640 L 1394 640 L 1420 760 L 180 760 Z" fill="url(#mesa)" stroke="#0b1636" stroke-width="5" stroke-linejoin="round"/>';
        c += '<rect x="230" y="652" width="1140" height="84" rx="16" fill="url(#cinta)" stroke="#0b1636" stroke-width="4"/>';
        c += '<rect x="230" y="652" width="1140" height="10" rx="5" fill="#ffffff" fill-opacity="0.12"/>';
        for (var r = 0; r < 20; r++) {
            c += '<circle cx="' + (252 + r * 58) + '" cy="748" r="9" fill="#c7d3e6" stroke="#0b1636" stroke-width="3"/>';
        }
        c += '<rect x="180" y="760" width="1240" height="20" fill="#3a1f6e"/>';
        // patas
        [240, 560, 1040, 1360].forEach(function (x) { c += '<rect x="' + (x - 12) + '" y="778" width="24" height="90" fill="#5e7090" stroke="#0b1636" stroke-width="3"/>'; });
        // franja de seguridad delante
        for (var f = 0; f < 32; f++) {
            c += '<path d="M' + (180 + f * 40) + " 780 L " + (200 + f * 40) + " 780 L " + (186 + f * 40) + " 792 L " + (166 + f * 40) + ' 792 Z" fill="#ffd43b" fill-opacity="0.75"/>';
        }
        return svg(1600, 900, defs + c);
    }

    // ------------------------------------------------------------------ partículas

    function chispa() {
        return svg(48, 48, '<defs><radialGradient id="g"><stop offset="0" stop-color="#fff"/><stop offset="0.45" stop-color="#fff" stop-opacity="0.7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><circle cx="24" cy="24" r="24" fill="url(#g)"/>');
    }
    function luz() {
        return svg(128, 128, '<defs><radialGradient id="g"><stop offset="0" stop-color="#fff" stop-opacity="0.95"/><stop offset="0.4" stop-color="#fff" stop-opacity="0.4"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><circle cx="64" cy="64" r="64" fill="url(#g)"/>');
    }
    function anillo() {
        return svg(176, 176, '<circle cx="88" cy="88" r="78" fill="none" stroke="#fff" stroke-width="10"/>');
    }
    function destello() {
        return svg(64, 64, '<path d="M32 0 Q 36 28 64 32 Q 36 36 32 64 Q 28 36 0 32 Q 28 28 32 0 Z" fill="#fff"/>');
    }
    function estrellaP() {
        return svg(48, 48, '<polygon points="' + estrellaPts(24, 25, 23, 10, 5).replace(/,/g, ",") + '" fill="#fff"/>');
    }
    function confeti() { return svg(20, 30, '<rect x="2" y="2" width="16" height="26" rx="3" fill="#fff"/>'); }
    function burbuja() {
        return svg(64, 64, '<circle cx="32" cy="32" r="28" fill="#fff" fill-opacity="0.15" stroke="#fff" stroke-width="4"/><ellipse cx="22" cy="20" rx="8" ry="5" fill="#fff" transform="rotate(-35 22 20)"/>');
    }
    /** Papel reciclado: trozo irregular con un pliegue (se tiñe en tonos papel y de colores). */
    function papel() {
        return svg(40, 40, '<path d="M4 8 L 30 3 L 37 16 L 33 36 L 9 33 L 3 20 Z" fill="#fff"/><path d="M8 10 L 31 30" stroke="#000" stroke-opacity="0.18" stroke-width="3"/>');
    }
    function geo(forma) {
        var f = {
            circulo: '<circle cx="20" cy="20" r="17" fill="#fff"/>',
            cuadrado: '<rect x="4" y="4" width="32" height="32" rx="5" fill="#fff"/>',
            triangulo: '<path d="M20 3 L 38 36 L 2 36 Z" fill="#fff"/>',
            rectangulo: '<rect x="1" y="11" width="38" height="18" rx="4" fill="#fff"/>'
        };
        return svg(40, 40, f[forma]);
    }
    function sombra() {
        return svg(160, 40, '<defs><radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#000814" stop-opacity="0.6"/><stop offset="1" stop-color="#000814" stop-opacity="0"/></radialGradient></defs><ellipse cx="80" cy="20" rx="80" ry="20" fill="url(#g)"/>');
    }
    function barrido() {
        return svg(200, 24, '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><rect width="200" height="24" fill="url(#g)"/>');
    }

    // ------------------------------------------------------------------ rasterizado (una vez)

    function lista() {
        var l = [
            ["estacion", estacion(), 1],
            ["tapa", tapa(), 1.4],
            ["placa", placa(), 1.6],
            ["ico-grande", icoTamano("grande"), 1.6],
            ["ico-pequeno", icoTamano("pequeno"), 1.6],
            ["marca-ok", marcaOk(), 1.5],
            ["marca-mira", marcaMira(), 1.5],
            ["chispa", chispa(), 1.5],
            ["luz", luz(), 1.2],
            ["anillo", anillo(), 1.2],
            ["destello", destello(), 1.5],
            ["estrella", estrellaP(), 1.5],
            ["confeti", confeti(), 1.5],
            ["burbuja", burbuja(), 1.5],
            ["papel", papel(), 1.5],
            ["sombra", sombra(), 1.2],
            ["barrido", barrido(), 1]
        ];
        ["circulo", "cuadrado", "triangulo", "rectangulo"].forEach(function (f) { l.push(["geo-" + f, geo(f), 1.5]); });
        CUERPOS.forEach(function (hex) { l.push(["bin-" + claveCuerpo(hex), contenedor(hex), 1.3]); });
        Object.keys(PALETA).forEach(function (col) {
            l.push(["ico-color-" + col, icoColor(col), 1.6]);
            FORMAS.forEach(function (f) { l.push(["obj-" + f + "-" + col, objeto(f, col), 2]); });
        });
        FORMAS.forEach(function (f) {
            l.push(["contorno-" + f, contorno(f), 1.2]);
            l.push(["ico-" + f, icoForma(f), 1.2]);
        });
        return l;
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
                console.warn("[DibujosEstacion] no se pudo dibujar", clave);
                hecho(false);
            };
            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
        });
    }

    function preparar() {
        if (!listo) listo = Promise.all(lista().map(function (p) { return rasterizar(p[0], p[1], p[2]); }));
        return listo;
    }

    global.DibujosEstacion = {
        preparar: preparar,
        lienzo: function (clave) { return cache[clave] || null; },
        res: function (clave) { return resoluciones[clave] || 1; },
        claves: function () { return Object.keys(cache); },
        OBJ: OBJ,
        BIN: BIN,
        PALETA: PALETA,
        FORMAS: FORMAS,
        tinte: function (color) { return PALETA[color] ? PALETA[color].tinte : 0xffffff; },
        claveBin: function (hex) {
            var k = "bin-" + claveCuerpo(hex || "#3498ff");
            return cache[k] ? k : "bin-3498ff";
        },
        claveObjeto: function (forma, color) { return "obj-" + forma + "-" + color; },
        svgObjeto: objeto,
        svgContenedor: contenedor,
        svgEstacion: estacion
    };
})(typeof window !== "undefined" ? window : global);
