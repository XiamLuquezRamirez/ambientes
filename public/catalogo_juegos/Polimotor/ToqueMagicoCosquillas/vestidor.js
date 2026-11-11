/**
 * Vestidor — fondo vivo del vestidor mágico (window.Vestidor).
 *
 * SVG fijo detrás del juego (#vest-fondo, z 0, sin eventos), viewBox 1600×900 con recorte centrado:
 * pared con estrellitas, guirnalda de banderines, estantería con ropa doblada, sombreros y zapatos (izquierda),
 * perchero con vestidos que se mecen (derecha), lámpara de estrella, alfombra y estrellitas que titilan.
 * Las animaciones son CSS (style.css → .vf-*). Reacciones:
 *   acierto()  las estrellitas brillan más un momento.
 *   fiesta(on) estrellitas y banderines en modo celebración (final).
 */
(function (global) {
    "use strict";

    function estrellas() {
        var pos = [
            [120, 90], [420, 60], [610, 150], [990, 70], [1180, 150], [1480, 80], [300, 230], [1320, 260],
            [70, 420], [1540, 430], [540, 300], [1060, 300], [760, 60], [860, 210]
        ];
        return pos.map(function (p, i) {
            var r = i % 3 === 0 ? 13 : 8;
            var d = "M0," + (-r) + " Q0,0 " + r + ",0 Q0,0 0," + r + " Q0,0 " + (-r) + ",0 Q0,0 0," + (-r) + " Z";
            return '<g transform="translate(' + p[0] + "," + p[1] + ')"><path class="vf-titila" style="--i:' + i + '" d="' + d + '" fill="' + (i % 2 ? "#fff6c2" : "#ffffff") + '"/></g>';
        }).join("");
    }

    function banderines() {
        var colores = ["#ff8fc7", "#7cd3f7", "#ffe066", "#9df59a", "#c9a7ff"];
        var s = '<path d="M0,40 Q400,120 800,60 Q1200,0 1600,70" fill="none" stroke="#b78ad6" stroke-width="4"/>';
        for (var i = 0; i < 17; i++) {
            var t = (i + 0.5) / 17;
            var x = t * 1600;
            // altura de la cuerda (aprox. de las dos curvas)
            var y = t < 0.5 ? 40 + 200 * t * (1 - 2 * t) * 0.9 + 40 * t : 60 - 120 * (t - 0.5) * (1 - t) + 20 * (t - 0.5);
            s += '<g transform="translate(' + x.toFixed(0) + "," + y.toFixed(0) + ')"><path class="vf-banderin" style="--i:' + i + '" d="M-26,0 L26,0 L0,46 Z" fill="' + colores[i % colores.length] + '"/></g>';
        }
        return s;
    }

    function ropaDoblada(x, y, colores) {
        return colores.map(function (c, i) {
            var yy = y - (i + 1) * 20;
            return '<rect x="' + x + '" y="' + yy + '" width="96" height="20" rx="7" fill="' + c + '" stroke="rgba(0,0,0,.08)" stroke-width="2"/>' +
                '<path d="M' + (x + 10) + "," + (yy + 10) + " h76" + '" stroke="rgba(255,255,255,.55)" stroke-width="3" stroke-linecap="round"/>';
        }).join("");
    }

    function estanteria() {
        var s = '<g class="vf-estante">';
        s += '<rect x="40" y="250" width="340" height="470" rx="18" fill="#fff4fb" stroke="#e4b9dc" stroke-width="6"/>';
        s += '<rect x="58" y="268" width="304" height="434" rx="10" fill="#f7defa"/>';
        [400, 540, 680].forEach(function (y) {
            s += '<rect x="52" y="' + y + '" width="316" height="14" rx="6" fill="#e9c1e6"/>';
        });
        // Sombreros arriba
        s += '<g transform="translate(120,400)"><g class="vf-salta" style="--i:0"><ellipse cx="0" cy="-6" rx="48" ry="12" fill="#ffd166"/><path d="M-26,-6 Q-24,-48 0,-50 Q24,-48 26,-6 Z" fill="#ffd166"/><rect x="-26" y="-20" width="52" height="10" fill="#ff8fc7"/></g></g>';
        s += '<g transform="translate(250,400)"><g class="vf-salta" style="--i:1"><path d="M-40,0 Q0,-82 40,0 Z" fill="#7cd3f7"/><circle cx="0" cy="-60" r="10" fill="#fff"/><path d="M-40,0 Q0,10 40,0" stroke="#5fb0e0" stroke-width="5" fill="none"/></g></g>';
        s += '<g transform="translate(325,400)"><g class="vf-salta" style="--i:2"><path d="M-14,0 L0,-46 L14,0 Z" fill="#c9a7ff"/><circle cx="0" cy="-48" r="6" fill="#ffe066"/></g></g>';
        // Ropa doblada
        s += ropaDoblada(78, 540, ["#ff8fc7", "#7cd3f7", "#ffe066", "#9df59a"]);
        s += ropaDoblada(196, 540, ["#c9a7ff", "#ffb36b", "#95d3f0"]);
        s += '<g transform="translate(330,520)"><circle r="20" fill="#ff8fc7"/><circle r="9" fill="#ffd6ea"/></g>';
        // Zapatos abajo
        [[90, "#ff8fc7"], [170, "#7cd3f7"], [250, "#ffe066"]].forEach(function (z) {
            s += '<g transform="translate(' + z[0] + ',680)"><path d="M0,0 L0,-22 Q0,-34 14,-34 L30,-34 Q60,-30 60,-8 Q60,0 52,0 Z" fill="' + z[1] + '" stroke="rgba(0,0,0,.12)" stroke-width="3"/>' +
                '<path d="M8,-20 Q30,-28 54,-16" stroke="#fff" stroke-width="4" fill="none" opacity=".7"/></g>';
        });
        s += '<g transform="translate(320,680)"><path d="M-14,0 L-6,-40 L18,-40 L22,0 Z" fill="#ffb36b"/><ellipse cx="6" cy="-40" rx="12" ry="4" fill="#ffd9a8"/></g>';
        s += "</g>";
        return s;
    }

    function prenda(x, tipo, color, i) {
        // Capas: posición (atributo) → vuelo del desfile (CSS) → vaivén (CSS). Un transform CSS pisaría el atributo.
        var dx = 800 - x + (i - 1) * 150;
        var s = '<g transform="translate(' + x + ',260)"><g class="vf-prenda" style="--i:' + i + ';--dx:' + dx + 'px;--dy:330px"><g class="vf-colgado" style="--i:' + i + '">';
        s += '<path d="M0,-6 Q0,-22 12,-22 Q22,-22 22,-12" stroke="#9a7aa8" stroke-width="4" fill="none"/>';
        s += '<path d="M-38,22 L0,0 L38,22" stroke="#9a7aa8" stroke-width="5" fill="none" stroke-linecap="round"/>';
        if (tipo === "vestido") {
            s += '<path d="M-26,18 L26,18 L32,70 L70,220 Q0,240 -70,220 L-32,70 Z" fill="' + color + '"/>';
            s += '<path d="M-60,214 Q0,232 60,214" stroke="#fff" stroke-width="5" stroke-dasharray="9 8" fill="none" opacity=".7"/>';
            s += '<circle cx="0" cy="96" r="12" fill="#fff" opacity=".7"/>';
        } else if (tipo === "camisa") {
            s += '<path d="M-30,18 L30,18 L62,48 L46,70 L34,60 L34,160 L-34,160 L-34,60 L-46,70 L-62,48 Z" fill="' + color + '"/>';
            s += '<path d="M-12,18 Q0,32 12,18" stroke="#fff" stroke-width="5" fill="none"/>';
            s += '<path d="M-20,100 h40" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".6"/>';
        } else {
            s += '<path d="M-34,18 L34,18 L40,180 L6,180 L0,70 L-6,180 L-40,180 Z" fill="' + color + '"/>';
            s += '<path d="M-34,34 h68" stroke="#fff" stroke-width="5" opacity=".6"/>';
        }
        s += "</g></g></g>";
        return s;
    }

    function perchero() {
        var s = '<g class="vf-perchero">';
        s += '<rect x="1218" y="236" width="14" height="480" rx="6" fill="#c9a7ff"/><rect x="1548" y="236" width="14" height="480" rx="6" fill="#c9a7ff"/>';
        s += '<rect x="1206" y="230" width="368" height="16" rx="8" fill="#b78ad6"/>';
        s += '<ellipse cx="1225" cy="718" rx="34" ry="8" fill="#b78ad6"/><ellipse cx="1555" cy="718" rx="34" ry="8" fill="#b78ad6"/>';
        s += prenda(1280, "vestido", "#ff8fc7", 0);
        s += prenda(1380, "camisa", "#7cd3f7", 1);
        s += prenda(1480, "vestido", "#ffe066", 2);
        s += "</g>";
        // Planta y caja de juguetes
        s += '<g transform="translate(1110,700)"><path d="M-30,0 L-24,-60 L24,-60 L30,0 Z" fill="#ffb36b"/>' +
            '<path d="M0,-60 Q-40,-120 -44,-150 M0,-60 Q0,-130 6,-170 M0,-60 Q40,-110 50,-140" stroke="#5bbf6a" stroke-width="7" fill="none" stroke-linecap="round"/>' +
            '<ellipse cx="-44" cy="-150" rx="16" ry="9" fill="#7fd68a"/><ellipse cx="6" cy="-170" rx="16" ry="9" fill="#7fd68a"/><ellipse cx="50" cy="-140" rx="16" ry="9" fill="#7fd68a"/></g>';
        return s;
    }

    function pasarela() {
        var s = '<g class="vf-pasarela">';
        s += '<path d="M330,758 L1270,758 L1410,888 L190,888 Z" fill="#ff7fbf"/>';
        s += '<path d="M330,758 L1270,758 L1300,786 L300,786 Z" fill="#ffb3d9"/>';
        s += '<path d="M800,770 L800,880" stroke="#fff" stroke-width="10" stroke-dasharray="22 18" opacity=".8"/>';
        s += '<path d="M330,758 L190,888 M1270,758 L1410,888" stroke="#d94f99" stroke-width="8"/>';
        for (var i = 0; i < 14; i++) {
            var t = i / 13;
            s += '<circle class="vf-bombillo" style="--i:' + i + '" cx="' + (330 + 940 * t).toFixed(0) + '" cy="752" r="9" fill="#fff6a8"/>';
            s += '<circle class="vf-bombillo" style="--i:' + (13 - i) + '" cx="' + (190 + 1220 * t).toFixed(0) + '" cy="892" r="11" fill="#fff6a8"/>';
        }
        s += "</g>";
        [[520, "#fff3a6"], [1080, "#bfe8ff"]].forEach(function (h, k) {
            s += '<path class="vf-haz" style="--i:' + k + '" d="M' + h[0] + ',0 L' + (h[0] - 150) + ',860 L' + (h[0] + 150) + ',860 Z" fill="' + h[1] + '" opacity=".0"/>';
        });
        return s;
    }

    function svg() {
        return '<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">' +
            "<defs>" +
            '<linearGradient id="vf-pared" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6dcff"/><stop offset="1" stop-color="#ffe6f3"/></linearGradient>' +
            '<linearGradient id="vf-piso" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6d7b4"/><stop offset="1" stop-color="#e9bf93"/></linearGradient>' +
            '<radialGradient id="vf-foco" cx="0.5" cy="0.45" r="0.5"><stop offset="0" stop-color="#fffbe0" stop-opacity=".85"/><stop offset="1" stop-color="#fffbe0" stop-opacity="0"/></radialGradient>' +
            '<pattern id="vf-papel" width="80" height="80" patternUnits="userSpaceOnUse">' +
            '<circle cx="20" cy="20" r="4" fill="#ffffff" opacity=".6"/><circle cx="60" cy="60" r="3" fill="#e9b8ef" opacity=".7"/>' +
            '<path d="M60,14 l3,7 7,3 -7,3 -3,7 -3,-7 -7,-3 7,-3 Z" fill="#ffffff" opacity=".55"/></pattern>' +
            "</defs>" +
            '<rect width="1600" height="900" fill="url(#vf-pared)"/>' +
            '<rect width="1600" height="700" fill="url(#vf-papel)"/>' +
            '<rect y="560" width="1600" height="150" fill="#dff5ee"/>' +
            '<path d="M0,560 H1600" stroke="#bfe6da" stroke-width="10"/>' +
            Array.apply(null, Array(33)).map(function (_, i) { return '<path d="M' + (i * 50) + ',572 V700" stroke="#c9ece2" stroke-width="5"/>'; }).join("") +
            '<rect y="700" width="1600" height="200" fill="url(#vf-piso)"/>' +
            Array.apply(null, Array(6)).map(function (_, i) { return '<path d="M0,' + (730 + i * 30) + ' H1600" stroke="#dcae80" stroke-width="3" opacity=".6"/>'; }).join("") +
            '<ellipse cx="800" cy="420" rx="520" ry="440" fill="url(#vf-foco)"/>' +
            '<ellipse cx="800" cy="822" rx="430" ry="66" fill="#ffc2e0"/><ellipse cx="800" cy="822" rx="380" ry="50" fill="#ffd9ec"/>' +
            '<ellipse cx="800" cy="822" rx="430" ry="66" fill="none" stroke="#ff9fcf" stroke-width="6" stroke-dasharray="4 14" stroke-linecap="round"/>' +
            // Desfile (oculto hasta Vestidor.desfile): penumbra del cuarto, pasarela con focos y haces de luz.
            '<rect class="vf-penumbra" width="1600" height="900" fill="#2a1446"/>' +
            pasarela() +
            banderines() +
            estanteria() +
            perchero() +
            // Lámpara de estrella
            '<g transform="translate(1000,120)"><path d="M0,-120 V-30" stroke="#b78ad6" stroke-width="4"/>' +
            '<path class="vf-lampara" d="M0,-34 L10,-8 38,-8 16,8 24,34 0,18 -24,34 -16,8 -38,-8 -10,-8 Z" fill="#ffe066" stroke="#f6c95a" stroke-width="3"/></g>' +
            '<g transform="translate(560,110)"><path d="M0,-110 V-24" stroke="#b78ad6" stroke-width="4"/>' +
            '<path class="vf-lampara" style="--i:3" d="M0,-28 L8,-6 30,-6 12,6 18,28 0,14 -18,28 -12,6 -30,-6 -8,-6 Z" fill="#ffd6ea" stroke="#ff9fcf" stroke-width="3"/></g>' +
            estrellas() +
            "</svg>";
    }

    var raiz = null;
    var tAcierto = null;

    global.Vestidor = {
        montar: function () {
            raiz = document.getElementById("vest-fondo");
            if (raiz) raiz.innerHTML = svg();
        },
        acierto: function () {
            if (!raiz) return;
            raiz.classList.remove("vf-acierto");
            void raiz.offsetWidth;
            raiz.classList.add("vf-acierto");
            clearTimeout(tAcierto);
            tAcierto = setTimeout(function () { raiz.classList.remove("vf-acierto"); }, 1400);
        },
        fiesta: function (on) {
            if (raiz) raiz.classList.toggle("vf-fiesta", !!on);
        },
        /**
         * Final "Desfile en la alfombra": baja la luz, la alfombra se vuelve pasarela con focos, bajan dos
         * haces de luz, la ropa del perchero vuela a la pasarela, los sombreros saltan y hay flashes de cámara.
         * Solo CSS sobre el SVG + una capa de flashes; desfile(false) lo deja como estaba.
         */
        desfile: function (on) {
            if (!raiz) return;
            raiz.classList.toggle("vf-desfile", !!on);
            var capa = document.getElementById("vf-flashes");
            if (!on) {
                if (capa) capa.remove();
                return;
            }
            if (capa) return;
            capa = document.createElement("div");
            capa.id = "vf-flashes";
            capa.className = "vf-flashes";
            capa.setAttribute("aria-hidden", "true");
            [[8, 22], [88, 18], [18, 40], [80, 44], [6, 64], [93, 62], [30, 14], [70, 12]].forEach(function (p, i) {
                var f = document.createElement("span");
                f.className = "vf-flash";
                f.style.left = p[0] + "%";
                f.style.top = p[1] + "%";
                f.style.setProperty("--i", i);
                f.innerHTML = '<i class="fa-solid fa-camera"></i>';
                capa.appendChild(f);
            });
            document.body.appendChild(capa);
        }
    };
})(window);
