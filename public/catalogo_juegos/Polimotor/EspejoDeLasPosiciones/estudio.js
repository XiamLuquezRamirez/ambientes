/**
 * Estudio — ambientación viva del Espejo de las Posiciones (window.Estudio).
 *
 * Capas (patrón de docs/juegos-escenas-animadas.md):
 *   #est-fondo  fixed, z 0, sin eventos  → SVG del estudio de danza y gimnasia (1600 × 900, slice)
 *   #est-phaser fixed, z 0               → motas de luz y haces (estudio-phaser.js)
 *   #principal  z 1                      → el juego
 *   #est-capa   fixed, z 30, sin eventos → presentación, rótulos de nivel, bola de espejos del final
 *
 * Reacciones: presentar(), etapa(), seleccion(), acierto(x, y), orientada(), error(),
 * posturaLista(), final(opts) → Promise, limpiar().
 * Sin Math.random: las posiciones salen de un generador con semilla.
 */
(function (global) {
    "use strict";

    var fondo = null;
    var capa = null;
    var timers = [];
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);

    function sleep(ms) {
        return new Promise(function (r) { timers.push(setTimeout(r, reducido ? Math.min(ms, 250) : ms)); });
    }

    function semilla(s) {
        var x = s || 7;
        return function () {
            x = (x * 16807) % 2147483647;
            return (x - 1) / 2147483646;
        };
    }

    function fx() {
        return global.EstudioPhaser || null;
    }

    function pfx() {
        return global.PedniaFx || null;
    }

    // ------------------------------------------------------------------ SVG del estudio

    function defs() {
        return "<defs>" +
            '<linearGradient id="est-pared" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#ffe3ef"/><stop offset=".55" stop-color="#f6e4ff"/><stop offset="1" stop-color="#e6dcff"/></linearGradient>' +
            '<linearGradient id="est-vidrio" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0" stop-color="#e9f8ff"/><stop offset=".45" stop-color="#bfe3f7"/><stop offset=".7" stop-color="#d6efff"/><stop offset="1" stop-color="#a9d5ef"/></linearGradient>' +
            '<linearGradient id="est-marco" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#ffd27a"/><stop offset=".5" stop-color="#f2a93b"/><stop offset="1" stop-color="#d98a1c"/></linearGradient>' +
            '<linearGradient id="est-madera" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#e9b47a"/><stop offset=".5" stop-color="#c98447"/><stop offset="1" stop-color="#a5652f"/></linearGradient>' +
            '<linearGradient id="est-haz" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#fffbe6" stop-opacity=".75"/><stop offset="1" stop-color="#fffbe6" stop-opacity="0"/></linearGradient>' +
            '<linearGradient id="est-reflejo" x1="0" y1="0" x2="1" y2="0">' +
            '<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
            '<radialGradient id="est-luz-piso" cx="50%" cy="50%" r="50%">' +
            '<stop offset="0" stop-color="#fff7c2" stop-opacity=".85"/><stop offset="1" stop-color="#fff7c2" stop-opacity="0"/></radialGradient>' +
            '<radialGradient id="est-foco-brillo" cx="50%" cy="50%" r="50%">' +
            '<stop offset="0" stop-color="#fff9d6"/><stop offset=".55" stop-color="#ffe28a" stop-opacity=".9"/><stop offset="1" stop-color="#ffcf4d" stop-opacity="0"/></radialGradient>' +
            '<clipPath id="est-clip-izq"><rect x="318" y="148" width="456" height="396" rx="22"/></clipPath>' +
            '<clipPath id="est-clip-der"><rect x="826" y="148" width="456" height="396" rx="22"/></clipPath>' +
            "</defs>";
    }

    function pared() {
        var html = '<rect width="1600" height="640" fill="url(#est-pared)"/>';
        // Paneles suaves de la pared.
        for (var i = 0; i < 9; i++) {
            html += '<rect x="' + (i * 180 - 10) + '" y="0" width="170" height="640" fill="#ffffff" opacity="' + (i % 2 ? 0.08 : 0.16) + '"/>';
        }
        // Guirnalda de banderines.
        var colores = ["#ff6b6b", "#ffd43b", "#4dabf7", "#69db7c", "#b197fc", "#ff922b"];
        html += '<g class="est-banderines"><path d="M-20,40 Q400,120 800,52 Q1200,-12 1620,74" fill="none" stroke="#9b6b43" stroke-width="3"/>';
        for (var b = 0; b < 16; b++) {
            var t = b / 15;
            var x = -10 + t * 1620;
            var y = t < 0.5
                ? 40 + (Math.sin(t * 2 * Math.PI) * 38) + t * 24
                : 52 + Math.sin((t - 0.5) * 2 * Math.PI) * -34 + (t - 0.5) * 44;
            html += '<path class="est-banderin" style="--i:' + b + '" d="M' + (x - 22).toFixed(1) + "," + y.toFixed(1) + " L" + (x + 22).toFixed(1) + "," + (y + 2).toFixed(1) + " L" + x.toFixed(1) + "," + (y + 44).toFixed(1) + ' Z" fill="' + colores[b % colores.length] + '"/>';
        }
        html += "</g>";
        return html;
    }

    function focosTecho() {
        var xs = [250, 620, 980, 1350];
        var html = '<g class="est-haces">';
        xs.forEach(function (x, i) {
            html += '<g class="est-haz" style="--i:' + i + ";transform-origin:" + x + 'px 24px">' +
                '<polygon points="' + (x - 26) + ",36 " + (x + 26) + ",36 " + (x + 210) + ",800 " + (x - 210) + ',800" fill="url(#est-haz)"/></g>';
        });
        html += "</g><g class=\"est-focos\">";
        xs.forEach(function (x, i) {
            html += '<g class="est-foco-techo" style="--i:' + i + '">' +
                '<rect x="' + (x - 6) + '" y="0" width="12" height="16" fill="#555"/>' +
                '<path d="M' + (x - 30) + ",14 L" + (x + 30) + ",14 L" + (x + 24) + ",40 L" + (x - 24) + ',40 Z" fill="#3d3d55"/>' +
                '<ellipse cx="' + x + '" cy="40" rx="24" ry="7" fill="url(#est-foco-brillo)" class="est-foco-luz"/></g>';
        });
        html += "</g>";
        return html;
    }

    function espejo(x, clip, lado) {
        var html = '<g class="est-espejo est-espejo-' + lado + '">' +
            '<rect x="' + (x - 14) + '" y="134" width="484" height="424" rx="32" fill="url(#est-marco)"/>' +
            '<rect x="' + (x - 6) + '" y="142" width="468" height="408" rx="26" fill="#c47a1a" opacity=".35"/>' +
            '<rect x="' + x + '" y="148" width="456" height="396" rx="22" fill="url(#est-vidrio)"/>' +
            '<g clip-path="url(#' + clip + ')">' +
            // Reflejo del estudio: barra y piso al fondo del espejo.
            '<rect x="' + x + '" y="430" width="456" height="114" fill="#9fd3ec" opacity=".55"/>' +
            '<rect x="' + x + '" y="398" width="456" height="10" fill="#d9a46d" opacity=".55"/>' +
            '<rect class="est-destello-barra" x="' + (x - 220) + '" y="120" width="140" height="460" fill="url(#est-reflejo)" transform="skewX(-18)" opacity=".7"/>' +
            '<rect class="est-destello-barra est-destello-2" x="' + (x - 220) + '" y="120" width="60" height="460" fill="url(#est-reflejo)" transform="skewX(-18)" opacity=".55"/>' +
            "</g>";
        // Bombillos de camerino alrededor del marco.
        for (var i = 0; i < 9; i++) {
            var bx = x + 14 + i * 53.5;
            html += '<circle class="est-bombillo" style="--i:' + (i + (lado === "der" ? 9 : 0)) + '" cx="' + bx.toFixed(1) + '" cy="141" r="7.5"/>';
        }
        // Destellos que titilan sobre el vidrio.
        var rnd = semilla(lado === "der" ? 31 : 17);
        for (var d = 0; d < 5; d++) {
            var sx = x + 30 + rnd() * 396;
            var sy = 170 + rnd() * 240;
            var s = 7 + rnd() * 8;
            html += '<path class="est-chispa" style="--i:' + d + '" d="M' + sx.toFixed(1) + "," + (sy - s).toFixed(1) +
                " Q" + (sx + 1.5).toFixed(1) + "," + (sy - 1.5).toFixed(1) + " " + (sx + s).toFixed(1) + "," + sy.toFixed(1) +
                " Q" + (sx + 1.5).toFixed(1) + "," + (sy + 1.5).toFixed(1) + " " + sx.toFixed(1) + "," + (sy + s).toFixed(1) +
                " Q" + (sx - 1.5).toFixed(1) + "," + (sy + 1.5).toFixed(1) + " " + (sx - s).toFixed(1) + "," + sy.toFixed(1) +
                " Q" + (sx - 1.5).toFixed(1) + "," + (sy - 1.5).toFixed(1) + " " + sx.toFixed(1) + "," + (sy - s).toFixed(1) + ' Z" fill="#fff"/>';
        }
        html += "</g>";
        return html;
    }

    function barra() {
        return '<g class="est-barra">' +
            '<rect x="150" y="452" width="10" height="56" fill="#9a9aae"/>' +
            '<rect x="790" y="452" width="10" height="56" fill="#9a9aae"/>' +
            '<rect x="1440" y="452" width="10" height="56" fill="#9a9aae"/>' +
            '<rect x="110" y="444" width="1380" height="18" rx="9" fill="url(#est-madera)"/>' +
            '<rect x="118" y="447" width="1364" height="4" rx="2" fill="#fff" opacity=".35"/>' +
            "</g>";
    }

    function decoracion() {
        var html = "";
        // Argollas de gimnasia colgando (izquierda).
        html += '<g class="est-argollas">' +
            '<g class="est-argolla" style="--i:0;transform-origin:96px 0px">' +
            '<rect x="93" y="0" width="6" height="250" fill="#e4e4ef"/><circle cx="96" cy="276" r="26" fill="none" stroke="#c9822e" stroke-width="9"/></g>' +
            '<g class="est-argolla" style="--i:1;transform-origin:176px 0px">' +
            '<rect x="173" y="0" width="6" height="250" fill="#e4e4ef"/><circle cx="176" cy="276" r="26" fill="none" stroke="#c9822e" stroke-width="9"/></g>' +
            "</g>";
        // Aros de gimnasia apoyados (derecha).
        html += '<g class="est-aros">' +
            '<ellipse cx="1470" cy="560" rx="62" ry="70" fill="none" stroke="#ff6b9a" stroke-width="10"/>' +
            '<ellipse cx="1515" cy="566" rx="58" ry="64" fill="none" stroke="#4dabf7" stroke-width="10"/>' +
            "</g>";
        // Varita con cinta de gimnasia rítmica.
        html += '<g class="est-cinta">' +
            '<rect x="1388" y="300" width="7" height="300" rx="3" fill="#8a5a2b" transform="rotate(-8 1391 600)"/>' +
            '<path class="est-cinta-tela" d="M1352,302 C1300,330 1360,380 1300,410 C1250,436 1320,480 1268,512" fill="none" stroke="#ff6b6b" stroke-width="12" stroke-linecap="round"/>' +
            '<path class="est-cinta-tela est-cinta-2" d="M1352,302 C1320,340 1390,370 1350,420 C1318,460 1380,490 1340,540" fill="none" stroke="#ffd43b" stroke-width="8" stroke-linecap="round"/>' +
            "</g>";
        return html;
    }

    function piso() {
        var html = '<g class="est-piso">';
        html += '<rect x="0" y="600" width="1600" height="300" fill="#4fb3d9"/>';
        html += '<rect x="0" y="596" width="1600" height="16" fill="#f4f0fb"/>';
        // Colchonetas tipo rompecabezas con perspectiva.
        var colores = ["#5cc7ea", "#ffb547", "#7bd389", "#ff8fab"];
        var filas = [[612, 680], [680, 770], [770, 900]];
        filas.forEach(function (f, r) {
            var y1 = f[0];
            var y2 = f[1];
            var n = 8;
            for (var c = 0; c < n; c++) {
                var x1a = 800 + (c - n / 2) * (200 - r * 0) * (1 + r * 0.18);
                var x1b = 800 + (c + 1 - n / 2) * 200 * (1 + r * 0.18);
                var x2a = 800 + (c - n / 2) * 200 * (1 + (r + 1) * 0.18);
                var x2b = 800 + (c + 1 - n / 2) * 200 * (1 + (r + 1) * 0.18);
                html += '<path d="M' + x1a.toFixed(0) + "," + y1 + " L" + x1b.toFixed(0) + "," + y1 + " L" + x2b.toFixed(0) + "," + y2 + " L" + x2a.toFixed(0) + "," + y2 + ' Z" fill="' + colores[(c + r) % colores.length] + '" stroke="#ffffff" stroke-opacity=".55" stroke-width="3"/>';
            }
        });
        html += '<ellipse class="est-piso-luz" cx="800" cy="760" rx="520" ry="110" fill="url(#est-luz-piso)"/>';
        // Pelotas de ejercicio (izquierda, sobre el piso).
        html += '<g class="est-pelotas">' +
            '<g class="est-pelota" style="--i:0"><circle cx="90" cy="640" r="58" fill="#ff6b6b"/><path d="M40,622 Q90,600 140,622" fill="none" stroke="#fff" stroke-width="5" opacity=".6"/></g>' +
            '<g class="est-pelota" style="--i:1"><circle cx="196" cy="664" r="40" fill="#4dabf7"/><path d="M162,652 Q196,636 230,652" fill="none" stroke="#fff" stroke-width="4" opacity=".6"/></g>' +
            "</g>";
        // Conos (derecha).
        html += '<g class="est-conos">' +
            '<path d="M1530,700 L1556,620 L1582,700 Z" fill="#ff922b"/><rect x="1520" y="698" width="72" height="9" rx="4" fill="#e8590c"/>' +
            '<path d="M1546,640 L1566,640 L1570,652 L1542,652 Z" fill="#fff"/>' +
            "</g>";
        html += "</g>";
        return html;
    }

    function svgEstudio() {
        return '<svg class="est-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">' +
            defs() + pared() + espejo(318, "est-clip-izq", "izq") + espejo(826, "est-clip-der", "der") +
            barra() + decoracion() + piso() + focosTecho() + "</svg>";
    }

    // ------------------------------------------------------------------ Capa de efectos

    function montar() {
        fondo = document.getElementById("est-fondo");
        capa = document.getElementById("est-capa");
        if (fondo && !fondo.firstChild) fondo.innerHTML = svgEstudio();
        if (capa && !capa.querySelector(".est-rotulo")) {
            capa.innerHTML =
                '<div class="est-rotulo" hidden><span class="est-rotulo-kicker"></span><strong class="est-rotulo-titulo"></strong><span class="est-rotulo-sub"></span></div>' +
                '<div class="est-presenta" hidden>' +
                '<img class="est-pj est-pj-zeus" src="../../img/zeus_normal.gif" alt="">' +
                '<div class="est-cartel"><span class="est-cartel-luz"></span><small>Estudio de danza y gimnasia</small><strong>El Espejo de las Posiciones</strong><span>y Lateralidad</span></div>' +
                '<img class="est-pj est-pj-zoe" src="../../img/zoe_normal.gif" alt="">' +
                "</div>" +
                '<div class="est-bola" hidden><span class="est-bola-cuerda"></span><span class="est-bola-esfera"></span></div>' +
                '<div class="est-disco" hidden></div>';
        }
        document.body.classList.add("est-activo");
        if (fx()) fx().iniciar();
    }

    function pulso(clase, ms) {
        if (!fondo) return;
        fondo.classList.remove(clase);
        void fondo.getBoundingClientRect();
        fondo.classList.add(clase);
        timers.push(setTimeout(function () { fondo.classList.remove(clase); }, ms));
    }

    /** Escena de presentación: luces, cartel y Zeus y Zoe saludando. */
    function presentar(opts) {
        opts = opts || {};
        if (!capa) return Promise.resolve();
        var pres = capa.querySelector(".est-presenta");
        pres.hidden = false;
        pres.classList.remove("sale");
        void pres.offsetWidth;
        pres.classList.add("entra");
        pulso("est-encender", 2600);
        if (fx()) fx().fiesta(false);
        return sleep(opts.ms || 3600).then(function () {
            pres.classList.remove("entra");
            pres.classList.add("sale");
            return sleep(650);
        }).then(function () {
            pres.hidden = true;
            pres.classList.remove("sale");
        });
    }

    /** Rótulo grande de nivel ("Nivel 2 · Posiciones combinadas"). */
    function etapa(kicker, titulo, sub, ms) {
        if (!capa) return Promise.resolve();
        var r = capa.querySelector(".est-rotulo");
        r.querySelector(".est-rotulo-kicker").textContent = kicker || "";
        r.querySelector(".est-rotulo-titulo").textContent = titulo || "";
        r.querySelector(".est-rotulo-sub").textContent = sub || "";
        r.hidden = false;
        r.classList.remove("sale");
        void r.offsetWidth;
        r.classList.add("entra");
        pulso("est-encender", 1800);
        return sleep(ms || 2400).then(function () {
            r.classList.remove("entra");
            r.classList.add("sale");
            return sleep(500);
        }).then(function () {
            r.hidden = true;
            r.classList.remove("sale");
        });
    }

    function seleccion() {
        pulso("est-seleccion", 700);
    }

    function orientada(x, y) {
        pulso("est-orientada", 900);
        if (fx() && x != null) fx().brillo(x, y, 0x8ce99a, 10);
    }

    function acierto(x, y) {
        pulso("est-acierto", 1100);
        if (fx()) {
            fx().pulso(0xb2f2bb);
            if (x != null) fx().brillo(x, y, 0xffe066, 18);
        }
        if (pfx() && x != null) pfx().estallido(x, y, "#ffd54f", 14);
    }

    function error() {
        // Sin rojo ni castigo: un parpadeo ámbar suave de los bombillos.
        pulso("est-error", 900);
    }

    function posturaLista(rect) {
        pulso("est-postura", 2600);
        if (fx()) fx().pulso(0xffe066);
        if (pfx() && rect) pfx().celebracion(rect);
    }

    /** Final: baja la bola de espejos, luces de colores y confeti. Promise al terminar. */
    function final(opts) {
        opts = opts || {};
        if (!capa) return Promise.resolve();
        var bola = capa.querySelector(".est-bola");
        var disco = capa.querySelector(".est-disco");
        bola.hidden = false;
        disco.hidden = false;
        void bola.offsetWidth;
        bola.classList.add("baja");
        disco.classList.add("gira");
        document.body.classList.add("est-fiesta");
        if (fx()) fx().fiesta(true);
        var cuerpo = typeof opts.rectFigura === "function" ? opts.rectFigura() : null;
        var rafagas = [800, 2600, 4400];
        rafagas.forEach(function (ms) {
            timers.push(setTimeout(function () {
                if (pfx()) pfx().celebracion(cuerpo || { left: global.innerWidth * 0.3, top: global.innerHeight * 0.3, width: global.innerWidth * 0.4, height: global.innerHeight * 0.4 });
            }, reducido ? 0 : ms));
        });
        var rutina = typeof opts.rutina === "function" ? opts.rutina() : Promise.resolve();
        return Promise.all([rutina, sleep(opts.minMs || 5200)]);
    }

    function limpiar() {
        timers.forEach(clearTimeout);
        timers = [];
    }

    global.Estudio = {
        montar: montar,
        presentar: presentar,
        etapa: etapa,
        seleccion: seleccion,
        orientada: orientada,
        acierto: acierto,
        error: error,
        posturaLista: posturaLista,
        final: final,
        limpiar: limpiar
    };
})(window);
