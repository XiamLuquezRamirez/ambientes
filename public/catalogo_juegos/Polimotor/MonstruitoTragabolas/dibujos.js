/**
 * DibujosMonstruo — dibujos propios de "Alimenta al Monstruito Tragabolas" (window.DibujosMonstruo).
 *
 * Todo es SVG propio rasterizado UNA vez a <canvas> por preparar(cfg); la escena los convierte en texturas.
 * Las piezas que cambian de color (bolas, flores, alas, banderines, globos, cojines, bandeja) se dibujan en blanco
 * con sombras grises suaves: Phaser las tiñe y conservan el volumen. Ojos, boca y mejillas del monstruito no son
 * imágenes: los redibuja monstruo.js en cada cuadro.
 */
(function (global) {
    "use strict";

    var cache = {};
    var resoluciones = {};
    var listo = null;

    var TINTA = "#1b5e5f";   // contorno del monstruito y de los objetos del jardín

    function svg(w, h, cuerpo) {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + " " + h + '" width="' + w + '" height="' + h + '">' + cuerpo + "</svg>";
    }

    function f1(n) { return (Math.round(n * 10) / 10).toString(); }

    function semilla(s) {
        return function () {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
    }

    // Degradados blancos: al teñir queda luz arriba a la izquierda y sombra abajo.
    var BLANCO_R = '<radialGradient id="br" cx="0.38" cy="0.32" r="0.75"><stop offset="0" stop-color="#ffffff"/><stop offset="0.55" stop-color="#f1f4fa"/><stop offset="1" stop-color="#c6cfe0"/></radialGradient>';
    var BLANCO_V = '<linearGradient id="bv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.6" stop-color="#f3f6fb"/><stop offset="1" stop-color="#cdd6e6"/></linearGradient>';

    /** Contorno peludo: círculo con mechones redondos. */
    function rutaPeluda(cx, cy, r, n, mechon) {
        var d = "";
        for (var i = 0; i <= n; i++) {
            var a = -Math.PI / 2 + i * Math.PI * 2 / n;
            var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
            if (i === 0) { d += "M" + f1(x) + " " + f1(y); continue; }
            var am = a - Math.PI / n;
            var cxm = cx + Math.cos(am) * (r + mechon), cym = cy + Math.sin(am) * (r + mechon);
            d += " Q" + f1(cxm) + " " + f1(cym) + " " + f1(x) + " " + f1(y);
        }
        return d + " Z";
    }

    function rutaEstrella(cx, cy, r, ri, n) {
        var d = "";
        for (var i = 0; i < n * 2; i++) {
            var a = -Math.PI / 2 + i * Math.PI / n;
            var rr = i % 2 ? ri : r;
            d += (i ? " L" : "M") + f1(cx + Math.cos(a) * rr) + " " + f1(cy + Math.sin(a) * rr);
        }
        return d + " Z";
    }

    // ------------------------------------------------------------------ el monstruito

    /** Cuerpo redondo y peludo con cuernitos, pies y manchas. Centro del cuerpo en (230, 250). */
    function monCuerpo() {
        var defs = '<defs>' +
            '<radialGradient id="piel" cx="0.36" cy="0.3" r="0.78"><stop offset="0" stop-color="#a8f5e6"/><stop offset="0.45" stop-color="#5fdcc9"/><stop offset="0.85" stop-color="#34bfae"/><stop offset="1" stop-color="#239c90"/></radialGradient>' +
            '<linearGradient id="cuerno" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4c2"/><stop offset="1" stop-color="#ffc46b"/></linearGradient>' +
            '<radialGradient id="pie" cx="0.4" cy="0.3" r="0.8"><stop offset="0" stop-color="#5fdcc9"/><stop offset="1" stop-color="#1f9488"/></radialGradient>' +
            '</defs>';
        var cuernos = "";
        [[1, 0], [-1, 460]].forEach(function (lado) {
            var s = lado[0], o = lado[1];
            var tr = s === 1 ? "" : ' transform="translate(460 0) scale(-1 1)"';
            cuernos += '<g' + tr + '>' +
                '<path d="M118 132 Q92 78 112 34 Q122 24 132 34 Q160 72 172 112 Z" fill="url(#cuerno)" stroke="' + TINTA + '" stroke-width="6" stroke-linejoin="round"/>' +
                '<path d="M108 84 Q126 80 146 70 M104 108 Q130 104 156 92" fill="none" stroke="#f59f00" stroke-width="5" stroke-linecap="round" opacity="0.55"/>' +
                '<ellipse cx="118" cy="52" rx="6" ry="9" fill="#ffffff" opacity="0.7"/>' +
                '</g>';
            void o;
        });
        var pies = "";
        [150, 310].forEach(function (x) {
            pies += '<ellipse cx="' + x + '" cy="424" rx="64" ry="36" fill="url(#pie)" stroke="' + TINTA + '" stroke-width="6"/>' +
                '<path d="M' + (x - 26) + ' 446 L' + (x - 22) + ' 432 M' + x + ' 452 L' + x + ' 436 M' + (x + 26) + ' 446 L' + (x + 22) + ' 432" stroke="' + TINTA + '" stroke-width="5" stroke-linecap="round" opacity="0.7"/>' +
                '<ellipse cx="' + (x - 18) + '" cy="410" rx="18" ry="8" fill="#ffffff" opacity="0.35"/>';
        });
        var cuerpo = '<path d="' + rutaPeluda(230, 250, 170, 30, 11) + '" fill="url(#piel)" stroke="' + TINTA + '" stroke-width="7" stroke-linejoin="round"/>';
        // mechón de la coronilla
        var mechon = '<path d="M206 92 Q214 58 236 64 Q222 74 232 90 Q246 60 266 74 Q248 80 252 96" fill="#5fdcc9" stroke="' + TINTA + '" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>';
        var manchas = [[100, 232, 15], [88, 282, 10], [112, 330, 8], [360, 224, 17], [374, 278, 11], [350, 330, 8], [176, 128, 11], [292, 124, 9], [318, 156, 6]]
            .map(function (m) { return '<circle cx="' + m[0] + '" cy="' + m[1] + '" r="' + m[2] + '" fill="#26ad9f" opacity="0.55"/>'; }).join("");
        // panza clarita (debajo de la boca) y brillo general
        var panza = '<path d="M150 372 Q230 420 310 372 Q300 404 230 412 Q160 404 150 372 Z" fill="#c9fbef" opacity="0.75"/>';
        var brillo = '<ellipse cx="160" cy="150" rx="46" ry="26" fill="#ffffff" opacity="0.35" transform="rotate(-28 160 150)"/>' +
            '<ellipse cx="130" cy="190" rx="10" ry="6" fill="#ffffff" opacity="0.4"/>';
        return svg(460, 480, defs + cuernos + pies + cuerpo + manchas + panza + mechon + brillo);
    }

    /** Brazo corto con manita abierta. El hombro está arriba al centro (60, 18). */
    function monBrazo() {
        var defs = '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7fe6d6"/><stop offset="1" stop-color="#2ab3a5"/></linearGradient></defs>';
        var brazo = '<path d="M42 14 Q30 60 38 96 L82 96 Q90 58 78 14 Z" fill="url(#g)" stroke="' + TINTA + '" stroke-width="6" stroke-linejoin="round"/>';
        var mano = '<path d="M30 100 Q24 124 34 136 Q38 150 48 140 Q52 154 62 146 Q70 156 78 142 Q90 146 90 128 Q96 108 84 96 Q60 88 36 96 Z" fill="url(#g)" stroke="' + TINTA + '" stroke-width="6" stroke-linejoin="round"/>' +
            '<path d="M48 126 L48 138 M62 128 L62 142 M76 124 L78 136" stroke="' + TINTA + '" stroke-width="4" stroke-linecap="round" opacity="0.55"/>' +
            '<ellipse cx="60" cy="116" rx="14" ry="9" fill="#ffc9de" opacity="0.8"/>';
        return svg(120, 164, defs + brazo + mano);
    }

    /** Gorrito de fiesta (nivel 4). */
    function gorro() {
        var defs = '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff8fab"/><stop offset="1" stop-color="#f06595"/></linearGradient></defs>';
        return svg(120, 150, defs +
            '<path d="M60 18 L104 128 Q60 146 16 128 Z" fill="url(#g)" stroke="' + TINTA + '" stroke-width="5" stroke-linejoin="round"/>' +
            '<path d="M44 58 L76 50 M34 86 L88 76 M24 114 L98 104" stroke="#ffe066" stroke-width="8" stroke-linecap="round"/>' +
            '<circle cx="60" cy="16" r="14" fill="#ffe066" stroke="' + TINTA + '" stroke-width="5"/>');
    }

    // ------------------------------------------------------------------ bolas, bandeja y cojín

    /** Bola blanda (blanca: la escena la tiñe). */
    function bola() {
        return svg(140, 140, '<defs>' + BLANCO_R + '</defs>' +
            '<circle cx="70" cy="70" r="62" fill="url(#br)" stroke="#9aa6bf" stroke-width="5"/>' +
            '<path d="M26 82 Q70 104 114 82" fill="none" stroke="#c3cbdc" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 10"/>' +
            '<path d="M40 40 Q70 22 100 40" fill="none" stroke="#dfe5ef" stroke-width="4" stroke-linecap="round" opacity="0.8"/>');
    }

    /** Brillo de la bola (no se tiñe). */
    function bolaBrillo() {
        return svg(140, 140,
            '<ellipse cx="48" cy="42" rx="20" ry="13" fill="#ffffff" opacity="0.85" transform="rotate(-30 48 42)"/>' +
            '<circle cx="78" cy="30" r="5" fill="#ffffff" opacity="0.8"/>' +
            '<ellipse cx="96" cy="104" rx="14" ry="7" fill="#ffffff" opacity="0.25" transform="rotate(-35 96 104)"/>');
    }

    function sombra() {
        return svg(200, 60, '<defs><radialGradient id="s" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#173b52" stop-opacity="0.45"/><stop offset="1" stop-color="#173b52" stop-opacity="0"/></radialGradient></defs>' +
            '<ellipse cx="100" cy="30" rx="98" ry="28" fill="url(#s)"/>');
    }

    /** Bandeja acolchada (blanca, se tiñe) para un ancho dado. */
    function bandeja(ancho) {
        var w = ancho, h = 170;
        var puntadas = "";
        for (var x = 70; x < w - 40; x += 70) {
            puntadas += '<circle cx="' + x + '" cy="128" r="5" fill="#b8c2d6"/>';
        }
        return svg(w, h, '<defs>' + BLANCO_V + '<linearGradient id="lado" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3e8f2"/><stop offset="1" stop-color="#aeb9cf"/></linearGradient></defs>' +
            '<rect x="10" y="62" width="' + (w - 20) + '" height="98" rx="49" fill="url(#lado)" stroke="#7d8aa6" stroke-width="5"/>' +
            '<rect x="10" y="20" width="' + (w - 20) + '" height="104" rx="52" fill="url(#bv)" stroke="#7d8aa6" stroke-width="5"/>' +
            '<rect x="34" y="36" width="' + (w - 68) + '" height="72" rx="36" fill="none" stroke="#c3cbdc" stroke-width="4" stroke-dasharray="10 9"/>' +
            '<ellipse cx="' + (w * 0.3) + '" cy="40" rx="' + (w * 0.18) + '" ry="9" fill="#ffffff" opacity="0.9"/>' +
            puntadas);
    }

    /** Hueco de la bandeja donde reposa cada bola. */
    function hueco() {
        return svg(170, 70, '<defs><radialGradient id="h" cx="0.5" cy="0.4" r="0.6"><stop offset="0" stop-color="#9aa6bf"/><stop offset="1" stop-color="#d9dfea"/></radialGradient></defs>' +
            '<ellipse cx="85" cy="35" rx="78" ry="28" fill="url(#h)" opacity="0.9"/>' +
            '<path d="M14 36 Q85 72 156 36" fill="none" stroke="#ffffff" stroke-width="4" opacity="0.8"/>');
    }

    /** Cojín redondo donde se sienta el monstruito (blanco, se tiñe). */
    function cojin() {
        var botones = [130, 230, 330, 430].map(function (x, i) {
            var y = i % 3 ? 70 : 78;
            return '<circle cx="' + x + '" cy="' + y + '" r="7" fill="#aeb9cf"/><circle cx="' + (x - 2) + '" cy="' + (y - 2) + '" r="3" fill="#ffffff"/>';
        }).join("");
        return svg(560, 190, '<defs>' + BLANCO_V + '<linearGradient id="l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dde3ee"/><stop offset="1" stop-color="#a7b3cb"/></linearGradient></defs>' +
            '<ellipse cx="280" cy="118" rx="268" ry="66" fill="url(#l)" stroke="#7d8aa6" stroke-width="5"/>' +
            '<ellipse cx="280" cy="82" rx="262" ry="66" fill="url(#bv)" stroke="#7d8aa6" stroke-width="5"/>' +
            '<ellipse cx="280" cy="82" rx="226" ry="46" fill="none" stroke="#c3cbdc" stroke-width="4" stroke-dasharray="11 9"/>' +
            botones +
            '<ellipse cx="170" cy="40" rx="80" ry="10" fill="#ffffff" opacity="0.9"/>');
    }

    // ------------------------------------------------------------------ jardín de fieltro (cielo y paisaje)
    // Todo el paisaje parece tela acolchada: retazos cosidos, costuras punteadas y trama de tela, como la bandeja
    // y el cojín del monstruito. Así el jardín no se parece al de otros juegos.

    var CIELOS = {
        manana: ["#9fdcff", "#d6f2ff", "#fff7e0"],
        mariposas: ["#8fd3ff", "#c9f1ff", "#e8fff2"],
        burbujas: ["#cdb8ff", "#ffd1e8", "#fff0e0"],
        festin: ["#7cc8ff", "#d0ebff", "#fff0f6"]
    };

    /** Trama de tela: diagonal muy suave y puntitos claros. */
    function trama(id, tam, alfa) {
        var t = tam || 8;
        return '<pattern id="' + id + '" width="' + t + '" height="' + t + '" patternUnits="userSpaceOnUse">' +
            '<path d="M0 ' + t + ' L' + t + ' 0" stroke="#000" stroke-opacity="' + (alfa || 0.05) + '" stroke-width="1.6"/>' +
            '<circle cx="' + (t / 4) + '" cy="' + (t / 4) + '" r="0.9" fill="#fff" fill-opacity="0.22"/></pattern>';
    }

    /** Curva de una colina muestreada cada `paso` px. */
    function curva(fn, paso) {
        var pts = [];
        for (var x = 0; x <= 1600; x += paso || 16) pts.push([x, fn(x)]);
        return pts;
    }
    function rutaCurva(pts, cierreY) {
        var d = "M" + pts.map(function (p) { return f1(p[0]) + " " + f1(p[1]); }).join(" L");
        return cierreY != null ? d + " L1600 " + cierreY + " L0 " + cierreY + " Z" : d;
    }
    function desplazar(pts, dy) { return pts.map(function (p) { return [p[0], p[1] + dy]; }); }

    function cielo(tema) {
        var c = CIELOS[tema] || CIELOS.manana;
        var rnd = semilla(tema.length * 31 + 7);
        var bokeh = "";
        for (var i = 0; i < 22; i++) {
            bokeh += '<circle cx="' + f1(rnd() * 1600) + '" cy="' + f1(rnd() * 520) + '" r="' + f1(14 + rnd() * 46) + '" fill="#ffffff" opacity="' + f1(0.06 + rnd() * 0.1) + '"/>';
        }
        var bandas = "";
        for (var k = 0; k < 5; k++) {
            var x = 120 + k * 330;
            bandas += '<path d="M' + x + ' -20 L' + (x + 120) + ' -20 L' + (x - 140) + ' 720 L' + (x - 260) + ' 720 Z" fill="#ffffff" opacity="0.07"/>';
        }
        return svg(1600, 900, '<defs><linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c[0] + '"/><stop offset="0.55" stop-color="' + c[1] + '"/><stop offset="1" stop-color="' + c[2] + '"/></linearGradient>' +
            trama("t", 10, 0.035) + '</defs>' +
            '<rect width="1600" height="900" fill="url(#c)"/>' + bandas + bokeh +
            '<rect width="1600" height="900" fill="url(#t)"/>');
    }

    /** Sol de fieltro: borde festoneado, costura y botón con cuatro agujeros (sin cara). */
    function sol() {
        return svg(240, 240, '<defs><radialGradient id="s" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#fff3bf"/><stop offset="1" stop-color="#fcc419"/></radialGradient>' + trama("t", 7, 0.06) + '</defs>' +
            '<path d="' + rutaPeluda(120, 120, 96, 16, 16) + '" fill="#ffd43b" stroke="#f08c00" stroke-width="5" stroke-linejoin="round"/>' +
            '<circle cx="120" cy="120" r="80" fill="url(#s)"/>' +
            '<circle cx="120" cy="120" r="70" fill="none" stroke="#f59f00" stroke-width="3.5" stroke-dasharray="9 7" stroke-linecap="round"/>' +
            '<circle cx="120" cy="120" r="34" fill="#fff9db" stroke="#f59f00" stroke-width="4"/>' +
            '<g fill="#e8590c" opacity="0.75"><circle cx="110" cy="110" r="5"/><circle cx="130" cy="110" r="5"/><circle cx="110" cy="130" r="5"/><circle cx="130" cy="130" r="5"/></g>' +
            '<path d="M110 110 L130 130 M130 110 L110 130" stroke="#e8590c" stroke-width="3" opacity="0.6"/>' +
            '<circle cx="120" cy="120" r="96" fill="url(#t)"/>' +
            '<ellipse cx="88" cy="74" rx="22" ry="10" fill="#ffffff" opacity="0.55" transform="rotate(-30 88 74)"/>');
    }

    /** Halo del sol: anillos punteados que giran despacio. */
    function rayos() {
        return svg(320, 320, '<g fill="none" stroke="#ffe066" stroke-linecap="round">' +
            '<circle cx="160" cy="160" r="128" stroke-width="6" stroke-dasharray="4 22" opacity="0.9"/>' +
            '<circle cx="160" cy="160" r="150" stroke-width="4" stroke-dasharray="2 30" opacity="0.6"/>' +
            '<circle cx="160" cy="160" r="112" stroke-width="10" opacity="0.25"/></g>');
    }

    /** Nube de fieltro con costura. */
    function nube() {
        var forma = '<circle cx="80" cy="92" r="46"/><circle cx="136" cy="64" r="56"/><circle cx="196" cy="86" r="44"/><circle cx="238" cy="108" r="28"/><circle cx="44" cy="112" r="28"/><rect x="30" y="94" width="222" height="44" rx="22"/>';
        return svg(280, 160, '<defs>' + BLANCO_V + trama("t", 7, 0.05) + '</defs>' +
            '<g fill="#dfe7f3" transform="translate(0 8)">' + forma + '</g>' +
            '<g fill="url(#bv)">' + forma + '</g>' +
            '<g fill="url(#t)">' + forma + '</g>' +
            '<g fill="none" stroke="#c3cfe2" stroke-width="3" stroke-dasharray="7 6" stroke-linecap="round" transform="translate(16 10) scale(0.885)">' + forma + '</g>' +
            '<ellipse cx="120" cy="48" rx="30" ry="9" fill="#ffffff"/>');
    }

    function arcoiris() {
        var cols = ["#ff8787", "#ffc078", "#ffe066", "#8ce99a", "#74c0fc", "#b197fc"];
        var s = "";
        cols.forEach(function (c, i) {
            var r = 430 - i * 26;
            var arco = 'M' + (450 - r) + ' 450 A' + r + " " + r + ' 0 0 1 ' + (450 + r) + ' 450';
            s += '<path d="' + arco + '" fill="none" stroke="' + c + '" stroke-width="26"/>';
            s += '<path d="' + arco + '" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-dasharray="6 8" opacity="0.7"/>';
        });
        return svg(900, 460, '<g opacity="0.85">' + s + "</g>");
    }

    /** Arbolito de topiario lejano (copa redonda con costura en espiral). */
    function arbolitoLejos(x, y, r, color) {
        var esp = "";
        for (var a = 0; a < 9; a += 0.5) esp += (a ? " L" : "M") + f1(x + Math.cos(a) * a * r / 10) + " " + f1(y - r * 0.15 + Math.sin(a) * a * r / 10);
        return '<rect x="' + f1(x - 4) + '" y="' + f1(y) + '" width="8" height="' + f1(r * 1.1) + '" rx="3" fill="#9c6b45"/>' +
            '<circle cx="' + f1(x) + '" cy="' + f1(y - r * 0.15) + '" r="' + f1(r) + '" fill="' + color + '" stroke="#5c940d" stroke-opacity="0.45" stroke-width="2.5"/>' +
            '<path d="' + esp + '" fill="none" stroke="#ffffff" stroke-opacity="0.65" stroke-width="2" stroke-dasharray="4 4"/>';
    }

    /** Casita hongo (la casa del monstruito, a lo lejos). */
    function casitaHongo(x, y) {
        return '<g transform="translate(' + f1(x) + " " + f1(y) + ')">' +
            '<rect x="-26" y="-36" width="52" height="42" rx="12" fill="#fff4e6" stroke="#d9a066" stroke-width="3"/>' +
            '<rect x="-8" y="-20" width="16" height="26" rx="8" fill="#9c6b45"/>' +
            '<circle cx="15" cy="-22" r="6" fill="#a5d8ff" stroke="#d9a066" stroke-width="2"/>' +
            '<path d="M-52 -34 Q-48 -84 0 -88 Q48 -84 52 -34 Q0 -22 -52 -34 Z" fill="#ff8787" stroke="#c92a2a" stroke-width="3" stroke-linejoin="round"/>' +
            '<path d="M-44 -38 Q0 -28 44 -38" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-dasharray="5 5"/>' +
            '<g fill="#ffffff"><circle cx="-24" cy="-62" r="7"/><circle cx="8" cy="-72" r="6"/><circle cx="28" cy="-52" r="5"/><circle cx="-6" cy="-50" r="4"/></g></g>';
    }

    /** Colinas lejanas: retazos de tela cosidos (patchwork), arbolitos de topiario y la casita hongo. */
    function colinasLejos() {
        var rnd = semilla(11);
        var top = function (x) { return 150 + 52 * Math.sin(x / 1600 * Math.PI * 2 * 1.3 + 1) + 16 * Math.sin(x / 170); };
        var pts = curva(top, 16);
        var cols = ["#b2f2bb", "#d8f5a2", "#c3fae8", "#a9e34b", "#d3f9d8", "#ffec99", "#8ce99a", "#e9fac8"];
        var parches = "", costuras = "";
        var cortes = [];
        for (var x = -40; x < 1680; x += 140 + rnd() * 90) cortes.push([x, (rnd() - 0.5) * 120]);
        var medio = function (xx) { return top(xx) + 70 + 18 * Math.sin(xx / 90); };
        for (var i = 0; i < cortes.length - 1; i++) {
            var a = cortes[i], b = cortes[i + 1];
            var arriba = "M" + f1(a[0]) + " 0 L" + f1(b[0]) + " 0 L" + f1(b[0] + b[1] * 0.4) + " " + f1(medio(b[0])) + " L" + f1(a[0] + a[1] * 0.4) + " " + f1(medio(a[0])) + " Z";
            var abajo = "M" + f1(a[0] + a[1] * 0.4) + " " + f1(medio(a[0])) + " L" + f1(b[0] + b[1] * 0.4) + " " + f1(medio(b[0])) + " L" + f1(b[0] + b[1]) + " 340 L" + f1(a[0] + a[1]) + " 340 Z";
            var c1 = cols[i % cols.length], c2 = cols[(i + 3) % cols.length];
            parches += '<path d="' + arriba + '" fill="' + c1 + '"/>' + '<path d="' + abajo + '" fill="' + c2 + '"/>';
            if (i % 3 === 0) parches += '<path d="' + abajo + '" fill="url(#rayas)"/>';
            if (i % 3 === 1) parches += '<path d="' + arriba + '" fill="url(#puntos)"/>';
            costuras += '<path d="M' + f1(a[0]) + " 0 L" + f1(a[0] + a[1] * 0.4) + " " + f1(medio(a[0])) + " L" + f1(a[0] + a[1]) + ' 340"/>';
        }
        costuras += '<path d="' + rutaCurva(curva(medio, 20)) + '"/>';
        var arboles = "";
        [140, 420, 610, 980, 1420, 1530].forEach(function (ax, k) {
            arboles += arbolitoLejos(ax, top(ax) - 2, 20 + (k % 3) * 6, ["#69db7c", "#94d82d", "#38d9a9"][k % 3]);
        });
        return svg(1600, 340, '<defs><clipPath id="h"><path d="' + rutaCurva(pts, 340) + '"/></clipPath>' + trama("t", 8, 0.06) +
            '<pattern id="rayas" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(-20)"><rect width="16" height="6" fill="#ffffff" opacity="0.28"/></pattern>' +
            '<pattern id="puntos" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="9" cy="9" r="3" fill="#ffffff" opacity="0.4"/></pattern></defs>' +
            arboles + casitaHongo(1190, top(1190) + 6) +
            '<g clip-path="url(#h)">' + parches +
            '<g fill="none" stroke="#2b8a3e" stroke-width="2" opacity="0.18" transform="translate(3 3)">' + costuras + '</g>' +
            '<g fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="8 7" stroke-linecap="round" opacity="0.9">' + costuras + '</g>' +
            '<rect width="1600" height="340" fill="url(#t)"/></g>' +
            '<path d="' + rutaCurva(pts) + '" fill="none" stroke="#5c940d" stroke-opacity="0.45" stroke-width="5" stroke-linejoin="round"/>' +
            '<path d="' + rutaCurva(desplazar(pts, 10)) + '" fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="9 7" stroke-linecap="round"/>');
    }

    /** Colina cercana: surcos de tela acolchada siguiendo la ladera, florecitas de fieltro y costura arriba. */
    function colinasCerca() {
        var rnd = semilla(5);
        var top = function (x) { return 108 - 42 * Math.sin(x / 1600 * Math.PI * 2 * 0.9 + 0.4) + 8 * Math.sin(x / 120); };
        var pts = curva(top, 16);
        var surcos = "";
        for (var k = 1; k < 9; k++) {
            var p = desplazar(pts, k * 24);
            surcos += '<path d="' + rutaCurva(p) + '" fill="none" stroke="' + (k % 2 ? "#40c057" : "#b2f2bb") + '" stroke-width="12" opacity="' + (k % 2 ? 0.28 : 0.35) + '"/>';
            surcos += '<path d="' + rutaCurva(desplazar(p, 7)) + '" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="6 9" opacity="0.5"/>';
        }
        var flores = "";
        var cols = ["#ffffff", "#ffd43b", "#ff8fab", "#b197fc", "#74c0fc"];
        for (var i = 0; i < 40; i++) {
            var fx = rnd() * 1600, fy = top(fx) + 26 + rnd() * 150, c = cols[i % cols.length], r = 3 + rnd() * 2.5;
            flores += '<g transform="translate(' + f1(fx) + " " + f1(fy) + ')" fill="' + c + '"><circle cx="' + f1(-r) + '" r="' + f1(r) + '"/><circle cx="' + f1(r) + '" r="' + f1(r) + '"/><circle cy="' + f1(-r) + '" r="' + f1(r) + '"/><circle cy="' + f1(r) + '" r="' + f1(r) + '"/><circle r="' + f1(r * 0.7) + '" fill="#f08c00"/></g>';
        }
        return svg(1600, 300, '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ce99a"/><stop offset="1" stop-color="#4cbb5f"/></linearGradient>' +
            '<clipPath id="h"><path d="' + rutaCurva(pts, 300) + '"/></clipPath>' + trama("t", 8, 0.07) + '</defs>' +
            '<path d="' + rutaCurva(pts, 300) + '" fill="url(#g)"/>' +
            '<g clip-path="url(#h)">' + surcos + flores + '<rect width="1600" height="300" fill="url(#t)"/></g>' +
            '<path d="' + rutaCurva(pts) + '" fill="none" stroke="#2f9e44" stroke-opacity="0.5" stroke-width="5"/>' +
            '<path d="' + rutaCurva(desplazar(pts, 10)) + '" fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="9 7" stroke-linecap="round" opacity="0.9"/>');
    }

    /** Césped del frente: briznas en tres capas, matitas, tréboles, margaritas, rocío y trama. */
    function cesped() {
        var rnd = semilla(3);
        var borde = function (x) { return 40 + 5 * Math.sin(x / 37) + 4 * Math.sin(x / 13 + 1); };
        var pts = curva(borde, 10);
        var brizna = function (x, base, h, color, ancho) {
            var inc = (rnd() - 0.5) * h * 0.7;
            return '<path d="M' + f1(x - ancho) + " " + f1(base) + " Q" + f1(x + inc * 0.3) + " " + f1(base - h * 0.6) + " " + f1(x + inc) + " " + f1(base - h) +
                " Q" + f1(x + inc * 0.3 + ancho * 0.4) + " " + f1(base - h * 0.5) + " " + f1(x + ancho) + " " + f1(base) + ' Z" fill="' + color + '"/>';
        };
        var capa1 = "", capa2 = "", capa3 = "", i, x;
        for (i = 0; i < 260; i++) { x = rnd() * 1600; capa1 += brizna(x, borde(x) + 8, 26 + rnd() * 26, rnd() < 0.5 ? "#2f9e44" : "#37b24d", 4 + rnd() * 2); }
        for (i = 0; i < 230; i++) { x = rnd() * 1600; capa2 += brizna(x, borde(x) + 12, 18 + rnd() * 20, rnd() < 0.5 ? "#51cf66" : "#69db7c", 3.5 + rnd() * 2); }
        for (i = 0; i < 160; i++) { x = rnd() * 1600; capa3 += brizna(x, borde(x) + 16, 10 + rnd() * 12, rnd() < 0.5 ? "#8ce99a" : "#b2f2bb", 3 + rnd()); }
        // matas de briznas repartidas por todo el césped (no solo en el borde)
        for (i = 0; i < 90; i++) {
            var mx0 = rnd() * 1600, my0 = 80 + rnd() * 150, tono = rnd() < 0.5 ? ["#2f9e44", "#51cf66"] : ["#37b24d", "#8ce99a"];
            for (var q = 0; q < 4; q++) capa2 += brizna(mx0 + (q - 1.5) * 4, my0, 8 + rnd() * 10, tono[q % 2], 2.2);
        }
        var detalles = "";
        for (i = 0; i < 34; i++) {
            var tx = rnd() * 1600, ty = 70 + rnd() * 150;
            if (i % 3 === 0) {
                detalles += '<g transform="translate(' + f1(tx) + " " + f1(ty) + ") rotate(" + f1(rnd() * 360) + ')" fill="#2f9e44" opacity="0.85"><circle cx="-5" cy="-3" r="6"/><circle cx="5" cy="-3" r="6"/><circle cx="0" cy="5" r="6"/><circle r="2" fill="#8ce99a"/></g>';
            } else if (i % 3 === 1) {
                detalles += '<g transform="translate(' + f1(tx) + " " + f1(ty) + ')"><g fill="#ffffff">' +
                    [0, 60, 120, 180, 240, 300].map(function (a) { return '<ellipse cx="0" cy="-6" rx="3" ry="6" transform="rotate(' + a + ')"/>'; }).join("") +
                    '</g><circle r="3.2" fill="#fcc419"/></g>';
            } else {
                for (var m = 0; m < 5; m++) {
                    var mx = tx + (m - 2) * 4;
                    detalles += '<path d="M' + f1(mx) + " " + f1(ty) + " Q" + f1(mx + (m - 2) * 2) + " " + f1(ty - 10) + " " + f1(mx + (m - 2) * 4) + " " + f1(ty - 16) + '" stroke="#2b8a3e" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
                }
            }
        }
        var rocio = "";
        for (i = 0; i < 40; i++) rocio += '<circle cx="' + f1(rnd() * 1600) + '" cy="' + f1(30 + rnd() * 180) + '" r="' + f1(1.5 + rnd() * 1.5) + '" fill="#ffffff" opacity="0.75"/>';
        return svg(1600, 230, '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#69d27a"/><stop offset="0.5" stop-color="#4cbb5f"/><stop offset="1" stop-color="#2f9e44"/></linearGradient>' +
            '<pattern id="pasto" width="22" height="16" patternUnits="userSpaceOnUse"><path d="M3 14 L5 6 M11 15 L10 7 M17 13 L19 5" stroke="#2b8a3e" stroke-width="2" stroke-linecap="round" opacity="0.35"/><path d="M7 10 L8 4" stroke="#b2f2bb" stroke-width="1.6" stroke-linecap="round" opacity="0.5"/></pattern>' +
            trama("t", 8, 0.06) + '</defs>' +
            capa1 +
            '<path d="' + rutaCurva(pts, 230) + '" fill="url(#g)"/>' +
            '<path d="' + rutaCurva(pts, 230) + '" fill="url(#pasto)"/>' +
            '<path d="' + rutaCurva(pts, 230) + '" fill="url(#t)"/>' +
            '<path d="' + rutaCurva(desplazar(pts, 14)) + '" fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="9 7" stroke-linecap="round" opacity="0.55"/>' +
            capa2 + detalles + capa3 + rocio);
    }

    /** Florecita de fieltro plana (5 pétalos redondos, centro con puntada en cruz). */
    function florFieltro(x, y, r, color) {
        var p = "";
        for (var i = 0; i < 5; i++) {
            var a = -Math.PI / 2 + i * Math.PI * 2 / 5;
            p += '<circle cx="' + f1(x + Math.cos(a) * r) + '" cy="' + f1(y + Math.sin(a) * r) + '" r="' + f1(r * 0.78) + '"/>';
        }
        return '<g fill="' + color + '" stroke="#ffffff" stroke-width="1.6" stroke-opacity="0.7">' + p + '</g>' +
            '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + f1(r * 0.62) + '" fill="#ffd43b" stroke="#f08c00" stroke-width="1.6"/>' +
            '<path d="M' + f1(x - r * 0.3) + " " + f1(y - r * 0.3) + " L" + f1(x + r * 0.3) + " " + f1(y + r * 0.3) + " M" + f1(x + r * 0.3) + " " + f1(y - r * 0.3) + " L" + f1(x - r * 0.3) + " " + f1(y + r * 0.3) + '" stroke="#e8590c" stroke-width="1.6" stroke-linecap="round"/>';
    }

    /** Botón de costura (dos agujeros). */
    function boton(x, y, r, color) {
        return '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + f1(r) + '" fill="' + color + '" stroke="#ffffff" stroke-width="1.8" stroke-opacity="0.7"/>' +
            '<circle cx="' + f1(x - r * 0.3) + '" cy="' + f1(y) + '" r="' + f1(r * 0.17) + '" fill="#1b4b5a" opacity="0.55"/>' +
            '<circle cx="' + f1(x + r * 0.3) + '" cy="' + f1(y) + '" r="' + f1(r * 0.17) + '" fill="#1b4b5a" opacity="0.55"/>';
    }

    /**
     * Arbusto de fieltro: lóbulos acolchados (como cojincitos) cosidos uno sobre otro, cada uno con su costura
     * punteada y trama de tela, adornados con florecitas de fieltro y botones. Mismo estilo que colinas y bandeja.
     */
    function arbusto() {
        var lobulos = [[70, 116, 46, "#2f9e44"], [190, 116, 44, "#2f9e44"], [128, 82, 60, "#37b24d"], [102, 128, 38, "#40c057"], [158, 130, 36, "#40c057"]];
        var cuerpo = "";
        lobulos.forEach(function (l, i) {
            cuerpo += '<circle cx="' + l[0] + '" cy="' + l[1] + '" r="' + l[2] + '" fill="' + l[3] + '" stroke="#1e6b30" stroke-width="4"/>' +
                '<circle cx="' + l[0] + '" cy="' + l[1] + '" r="' + l[2] + '" fill="url(#luz)"/>' +
                '<circle cx="' + l[0] + '" cy="' + l[1] + '" r="' + l[2] + '" fill="url(#t)"/>' +
                '<circle cx="' + l[0] + '" cy="' + l[1] + '" r="' + (l[2] - 9) + '" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-dasharray="7 6" stroke-linecap="round" opacity="0.8"/>';
            void i;
        });
        return svg(260, 190, '<defs><radialGradient id="luz" cx="0.35" cy="0.3" r="0.75"><stop offset="0" stop-color="#ffffff" stop-opacity="0.45"/><stop offset="0.6" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#1e6b30" stop-opacity="0.25"/></radialGradient>' + trama("t", 7, 0.07) + '</defs>' +
            '<ellipse cx="130" cy="172" rx="118" ry="13" fill="#1e4d2b" opacity="0.22"/>' +
            '<rect x="36" y="118" width="188" height="48" rx="24" fill="#2b8a3e" stroke="#1e6b30" stroke-width="4"/>' +
            '<path d="M48 150 L212 150" stroke="#ffffff" stroke-width="2.6" stroke-dasharray="7 6" stroke-linecap="round" opacity="0.7"/>' +
            cuerpo +
            florFieltro(110, 66, 9, "#ff8fab") + florFieltro(196, 104, 8, "#ffffff") + florFieltro(70, 108, 7, "#b197fc") +
            boton(150, 120, 7, "#ff6b6b") + boton(124, 46, 6, "#ffe066"));
    }

    /**
     * Árbol de fieltro: copa redonda hecha de retazos cosidos (como las colinas), borde festoneado, costuras
     * punteadas, manzanitas-botón; tronco de tela con costura.
     */
    function arbolito() {
        var cx = 90, cy = 92, r = 74;
        var cols = ["#37b24d", "#51cf66", "#2f9e44", "#74b816"];
        var cortes = [-100, -20, 50, 140, 220];
        var parches = "", costuras = "";
        for (var i = 0; i < cortes.length - 1; i++) {
            var a0 = cortes[i] * Math.PI / 180, a1 = cortes[i + 1] * Math.PI / 180;
            parches += '<path d="M' + cx + " " + cy + " L" + f1(cx + Math.cos(a0) * 120) + " " + f1(cy + Math.sin(a0) * 120) + " L" + f1(cx + Math.cos(a1) * 120) + " " + f1(cy + Math.sin(a1) * 120) + ' Z" fill="' + cols[i] + '"/>';
            costuras += '<path d="M' + cx + " " + cy + " L" + f1(cx + Math.cos(a0) * r) + " " + f1(cy + Math.sin(a0) * r) + '"/>';
        }
        var copa = rutaPeluda(cx, cy, r, 14, 9);
        return svg(180, 260, '<defs><clipPath id="c"><path d="' + copa + '"/></clipPath>' +
            '<radialGradient id="luz" cx="0.35" cy="0.3" r="0.75"><stop offset="0" stop-color="#ffffff" stop-opacity="0.4"/><stop offset="0.6" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#1e6b30" stop-opacity="0.28"/></radialGradient>' + trama("t", 7, 0.07) + '</defs>' +
            '<ellipse cx="90" cy="248" rx="50" ry="9" fill="#1e4d2b" opacity="0.22"/>' +
            '<path d="M76 246 Q78 190 80 140 L100 140 Q102 190 104 246 Z" fill="#c08457" stroke="#8a5a32" stroke-width="4" stroke-linejoin="round"/>' +
            '<path d="M84 236 L86 150 M96 236 L94 150" stroke="#ffffff" stroke-width="2.2" stroke-dasharray="6 5" opacity="0.7"/>' +
            '<g clip-path="url(#c)">' + parches +
            '<g fill="none" stroke="#ffffff" stroke-width="2.6" stroke-dasharray="7 6" stroke-linecap="round" opacity="0.85">' + costuras + '</g>' +
            '<rect width="180" height="260" fill="url(#luz)"/><rect width="180" height="260" fill="url(#t)"/></g>' +
            '<path d="' + copa + '" fill="none" stroke="#2b8a3e" stroke-width="4.5" stroke-linejoin="round"/>' +
            '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r - 12) + '" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-dasharray="7 6" stroke-linecap="round" opacity="0.8"/>' +
            boton(60, 70, 9, "#ff6b6b") + boton(118, 110, 9, "#ff6b6b") + boton(104, 58, 7, "#ffa94d") +
            florFieltro(66, 124, 8, "#ffffff"));
    }

    function tallo() {
        return svg(70, 170, '<path d="M35 168 Q30 110 36 20" fill="none" stroke="#37b24d" stroke-width="8" stroke-linecap="round"/>' +
            '<path d="M34 120 Q8 100 6 76 Q30 84 36 112 Z" fill="#51cf66" stroke="#2b8a3e" stroke-width="3"/>' +
            '<path d="M36 96 Q62 80 64 56 Q40 64 36 90 Z" fill="#51cf66" stroke="#2b8a3e" stroke-width="3"/>');
    }

    function petalos() {
        var p = "";
        for (var i = 0; i < 6; i++) {
            p += '<ellipse cx="60" cy="30" rx="20" ry="30" fill="url(#br)" stroke="#aab4c8" stroke-width="3" transform="rotate(' + (i * 60) + ' 60 60)"/>';
        }
        return svg(120, 120, '<defs>' + BLANCO_R + '</defs>' + p);
    }

    function centroFlor() {
        return svg(60, 60, '<circle cx="30" cy="30" r="20" fill="#ffd43b" stroke="#f08c00" stroke-width="4"/>' +
            '<path d="M22 30 Q30 38 38 30" fill="none" stroke="#a15c00" stroke-width="3" stroke-linecap="round"/>' +
            '<circle cx="23" cy="24" r="2.6" fill="#a15c00"/><circle cx="37" cy="24" r="2.6" fill="#a15c00"/>');
    }

    function alaMariposa() {
        return svg(90, 110, '<defs>' + BLANCO_R + '</defs>' +
            '<path d="M84 50 Q40 -8 10 20 Q-6 50 40 60 Q8 76 22 100 Q46 116 84 62 Z" fill="url(#br)" stroke="#8f9bb6" stroke-width="4" stroke-linejoin="round"/>' +
            '<circle cx="38" cy="34" r="9" fill="#ffffff" opacity="0.85"/><circle cx="40" cy="86" r="6" fill="#ffffff" opacity="0.7"/>');
    }

    function cuerpoMariposa() {
        return svg(30, 90, '<ellipse cx="15" cy="50" rx="8" ry="32" fill="#5c3d2e"/><circle cx="15" cy="16" r="9" fill="#5c3d2e"/>' +
            '<path d="M11 10 Q4 0 0 2 M19 10 Q26 0 30 2" fill="none" stroke="#5c3d2e" stroke-width="3" stroke-linecap="round"/>');
    }

    function hoja() {
        return svg(70, 44, '<defs>' + BLANCO_R + '</defs><path d="M4 22 Q30 -6 66 22 Q30 50 4 22 Z" fill="url(#br)" stroke="#9aa6bf" stroke-width="3"/>' +
            '<path d="M8 22 L60 22" stroke="#9aa6bf" stroke-width="2.5"/>');
    }

    function burbuja() {
        return svg(100, 100, '<defs><radialGradient id="b" cx="0.5" cy="0.5" r="0.5"><stop offset="0.7" stop-color="#ffffff" stop-opacity="0.05"/><stop offset="0.95" stop-color="#d0f4ff" stop-opacity="0.55"/><stop offset="1" stop-color="#ffffff" stop-opacity="0.8"/></radialGradient></defs>' +
            '<circle cx="50" cy="50" r="46" fill="url(#b)" stroke="#ffffff" stroke-width="3" stroke-opacity="0.8"/>' +
            '<ellipse cx="34" cy="30" rx="12" ry="7" fill="#ffffff" opacity="0.85" transform="rotate(-35 34 30)"/>' +
            '<path d="M70 74 Q78 64 80 54" fill="none" stroke="#ffd6f0" stroke-width="4" stroke-linecap="round" opacity="0.7"/>');
    }

    function estrellita() {
        return svg(64, 64, '<path d="' + rutaEstrella(32, 33, 29, 13, 5) + '" fill="#ffffff" stroke="#e6e9f0" stroke-width="3" stroke-linejoin="round"/>');
    }

    function chispa() {
        return svg(48, 48, '<defs><radialGradient id="c" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffffff"/><stop offset="0.35" stop-color="#ffffff" stop-opacity="0.85"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs>' +
            '<circle cx="24" cy="24" r="24" fill="url(#c)"/><path d="M24 4 L27 21 L44 24 L27 27 L24 44 L21 27 L4 24 L21 21 Z" fill="#ffffff"/>');
    }

    function confeti() { return svg(30, 18, '<rect x="1" y="1" width="28" height="16" rx="5" fill="#ffffff"/>'); }

    function corazon() {
        return svg(64, 58, '<path d="M32 54 Q4 34 6 18 Q8 4 22 4 Q30 4 32 14 Q34 4 42 4 Q56 4 58 18 Q60 34 32 54 Z" fill="#ffffff" stroke="#e6e9f0" stroke-width="3"/>');
    }

    function formaTri() { return svg(60, 56, '<path d="M30 6 Q34 6 54 44 Q56 50 50 50 L10 50 Q4 50 6 44 Q26 6 30 6 Z" fill="#ffffff"/>'); }
    function formaAro() { return svg(60, 60, '<circle cx="30" cy="30" r="22" fill="none" stroke="#ffffff" stroke-width="10"/>'); }
    function formaCuadro() { return svg(56, 56, '<rect x="6" y="6" width="44" height="44" rx="12" fill="#ffffff"/>'); }

    function banderin() {
        return svg(70, 86, '<defs>' + BLANCO_V + '</defs><path d="M4 4 L66 4 L35 82 Z" fill="url(#bv)" stroke="#9aa6bf" stroke-width="3" stroke-linejoin="round"/>' +
            '<circle cx="35" cy="28" r="7" fill="#ffffff" opacity="0.9"/>');
    }

    function globo() {
        return svg(110, 190, '<defs>' + BLANCO_R + '</defs>' +
            '<path d="M55 128 Q50 150 60 168 Q66 180 56 190" fill="none" stroke="#868e96" stroke-width="3"/>' +
            '<ellipse cx="55" cy="62" rx="48" ry="58" fill="url(#br)" stroke="#9aa6bf" stroke-width="4"/>' +
            '<path d="M48 118 L62 118 L58 128 L52 128 Z" fill="#c6cfe0"/>' +
            '<ellipse cx="36" cy="38" rx="11" ry="17" fill="#ffffff" opacity="0.8" transform="rotate(-20 36 38)"/>');
    }

    function flecha() {
        return svg(90, 90, '<path d="M45 10 L80 52 Q84 58 76 58 L60 58 L60 80 Q60 84 56 84 L34 84 Q30 84 30 80 L30 58 L14 58 Q6 58 10 52 Z" fill="#ffe066" stroke="#f08c00" stroke-width="5" stroke-linejoin="round"/>');
    }

    function puntoGuia() {
        return svg(48, 48, '<circle cx="24" cy="24" r="21" fill="#ffffff" opacity="0.55"/>' +
            '<circle cx="24" cy="24" r="14" fill="#ffe066" stroke="#12897c" stroke-width="4"/>' +
            '<circle cx="19" cy="19" r="4" fill="#ffffff" opacity="0.9"/>');
    }

    function guirnalda() {
        // estrellitas colgantes (nivel 3)
        return svg(60, 120, '<path d="M30 0 L30 70" stroke="#ffffff" stroke-width="2" opacity="0.8"/>' +
            '<path d="' + rutaEstrella(30, 88, 24, 11, 5) + '" fill="#ffe066" stroke="#f59f00" stroke-width="3" stroke-linejoin="round"/>');
    }

    // ------------------------------------------------------------------ lista y rasterizado

    function lista(cfg) {
        var l = [
            ["monCuerpo", monCuerpo(), 1.6],
            ["monBrazo", monBrazo(), 1.6],
            ["gorro", gorro(), 1.5],
            ["bola", bola(), 1.6],
            ["bolaBrillo", bolaBrillo(), 1.6],
            ["sombra", sombra(), 1],
            ["hueco", hueco(), 1.2],
            ["cojin", cojin(), 1.3],
            ["sol", sol(), 1.3],
            ["rayos", rayos(), 1],
            ["nube", nube(), 1.2],
            ["arcoiris", arcoiris(), 0.8],
            ["colinasLejos", colinasLejos(), 1],
            ["colinasCerca", colinasCerca(), 1],
            ["cesped", cesped(), 1],
            ["arbusto", arbusto(), 1.4],
            ["arbolito", arbolito(), 1.4],
            ["tallo", tallo(), 1.4],
            ["petalos", petalos(), 1.5],
            ["centroFlor", centroFlor(), 1.5],
            ["alaMariposa", alaMariposa(), 1.4],
            ["cuerpoMariposa", cuerpoMariposa(), 1.4],
            ["hoja", hoja(), 1.4],
            ["burbuja", burbuja(), 1.4],
            ["estrellita", estrellita(), 1.5],
            ["chispa", chispa(), 1.5],
            ["confeti", confeti(), 1.5],
            ["corazon", corazon(), 1.5],
            ["formaTri", formaTri(), 1.3],
            ["formaAro", formaAro(), 1.3],
            ["formaCuadro", formaCuadro(), 1.3],
            ["banderin", banderin(), 1.3],
            ["globo", globo(), 1.3],
            ["flecha", flecha(), 1.5],
            ["puntoGuia", puntoGuia(), 1.5],
            ["guirnalda", guirnalda(), 1.4]
        ];
        Object.keys(CIELOS).forEach(function (t) { l.push(["cielo-" + t, cielo(t), 0.5]); });
        // una bandeja por nivel, con el ancho de sus bolas
        ((cfg && cfg.rondas) || []).forEach(function (r) {
            var n = r.bolas | 0, sep = Number(r.separacion) || 170;
            l.push(["bandeja-" + r.id, bandeja(Math.round((n - 1) * sep + 2 * ((Number(r.radioBola) || 60) + 62))), 1.2]);
        });
        return l;
    }

    function rasterizar(clave, s, k) {
        return new Promise(function (resolve) {
            var img = new Image();
            var hecho = function (ok) {
                if (ok) {
                    var c = document.createElement("canvas");
                    c.width = Math.max(1, Math.round(img.width * k));
                    c.height = Math.max(1, Math.round(img.height * k));
                    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
                    cache[clave] = c;
                    resoluciones[clave] = k;
                }
                resolve(ok);
            };
            img.onload = function () { hecho(true); };
            img.onerror = function () {
                console.warn("[DibujosMonstruo] no se pudo dibujar", clave);
                hecho(false);
            };
            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
        });
    }

    function preparar(cfg) {
        if (!listo) listo = Promise.all(lista(cfg).map(function (p) { return rasterizar(p[0], p[1], p[2]); }));
        return listo;
    }

    global.DibujosMonstruo = {
        preparar: preparar,
        lienzo: function (clave) { return cache[clave] || null; },
        res: function (clave) { return resoluciones[clave] || 1; },
        claves: function () { return Object.keys(cache); },
        TINTA: TINTA,
        // para el ícono del catálogo
        svgCuerpo: monCuerpo,
        svgBrazo: monBrazo
    };
})(typeof window !== "undefined" ? window : global);
