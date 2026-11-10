/**
 * Estadio — ambientación del Estadio de Atletismo Mágico (window.Estadio).
 *
 * Capas (patrón de los juegos Polimotor, ver docs/juegos-escenas-animadas.md):
 *   #est-fondo   SVG 1600×900 (slice): cielo nocturno, torres de luz con haces, gradas con público,
 *                gran pantalla LED, tubos de neón con energía que corre, pista de atletismo con
 *                carriles, vallas, conos y meta a cuadros.
 *   #est-phaser  EstadioPhaser (chispas, anillos de energía, confeti).
 *   #est-capa    presentación (Zoe salta y se vuelve sombra), rótulo de nivel y avisos.
 *
 * Reacciones: presentar · etapa · pantalla · progreso · seleccion · orientada · acierto · error ·
 * posturaLista · final · limpiar. Sin Math.random (el público sale de un generador con semilla).
 */
(function (global) {
    "use strict";

    var P = global.Posturas;
    var PZ = global.Piezas;
    var A = global.SiluetaAnim;
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var fondo = null;
    var capa = null;
    var timers = [];

    function sleep(ms) {
        return new Promise(function (r) { timers.push(setTimeout(r, reducido ? Math.min(ms, 120) : ms)); });
    }

    function semilla(s) {
        return function () {
            s = (s * 16807) % 2147483647;
            return (s - 1) / 2147483646;
        };
    }

    function fx() {
        return global.EstadioPhaser || null;
    }

    function pfx() {
        return global.PedniaFx || null;
    }

    // ------------------------------------------------------------------ SVG del estadio

    function defs() {
        return "<defs>" +
            '<linearGradient id="est-cielo" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#0b0f33"/><stop offset=".45" stop-color="#25175e"/><stop offset="1" stop-color="#4b2386"/></linearGradient>' +
            '<linearGradient id="est-pista" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#d9480f"/><stop offset="1" stop-color="#a63a12"/></linearGradient>' +
            '<linearGradient id="est-cesped" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#2b8a3e"/><stop offset="1" stop-color="#1f6b30"/></linearGradient>' +
            '<linearGradient id="est-haz" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#fffbe6" stop-opacity=".55"/><stop offset="1" stop-color="#fffbe6" stop-opacity="0"/></linearGradient>' +
            '<linearGradient id="est-grada" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#3b2a7a"/><stop offset="1" stop-color="#2a1d5c"/></linearGradient>' +
            '<filter id="est-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/>' +
            '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
            '<pattern id="est-led-puntos" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.1" fill="#ffffff" opacity=".12"/></pattern>' +
            '<pattern id="est-cuadros" width="20" height="20" patternUnits="userSpaceOnUse">' +
            '<rect width="10" height="10" fill="#fff"/><rect x="10" y="10" width="10" height="10" fill="#fff"/>' +
            '<rect x="10" width="10" height="10" fill="#222"/><rect y="10" width="10" height="10" fill="#222"/></pattern>' +
            "</defs>";
    }

    function cielo() {
        var r = semilla(19);
        var html = '<rect width="1600" height="900" fill="url(#est-cielo)"/>';
        html += '<g class="est-estrellas">';
        for (var i = 0; i < 46; i++) {
            html += '<circle style="--i:' + i + '" cx="' + Math.round(r() * 1600) + '" cy="' + Math.round(r() * 260) + '" r="' + (1 + r() * 1.8).toFixed(1) + '" fill="#fff"/>';
        }
        html += "</g>";
        return html;
    }

    function torre(x, lado) {
        var html = '<g class="est-torre" transform="translate(' + x + ',0)">';
        html += '<path d="M-10,560 L-4,150 L4,150 L10,560 Z" fill="#1b1446"/>';
        html += '<path d="M-6,520 L6,470 M-6,440 L6,390 M-6,360 L6,310 M-6,280 L6,230" stroke="#3b2a7a" stroke-width="3"/>';
        html += '<rect x="-56" y="86" width="112" height="70" rx="10" fill="#2a1d5c" stroke="#7048e8" stroke-width="3"/>';
        for (var f = 0; f < 2; f++) {
            for (var c = 0; c < 4; c++) {
                html += '<circle class="est-foco" style="--i:' + (f * 4 + c) + '" cx="' + (-39 + c * 26) + '" cy="' + (106 + f * 30) + '" r="10" fill="#fff9db"/>';
            }
        }
        html += '<polygon class="est-haz est-haz-' + lado + '" points="-50,150 50,150 ' + (lado === "izq" ? "720,900 260,900" : "-260,900 -720,900") + '" fill="url(#est-haz)"/>';
        html += "</g>";
        return html;
    }

    function pantallaLed() {
        return '<g class="est-led">' +
            '<rect x="540" y="44" width="520" height="230" rx="18" fill="#120c2e" stroke="#4dabf7" stroke-width="6"/>' +
            '<rect class="est-led-marco" x="532" y="36" width="536" height="246" rx="24" fill="none" stroke="#7cf3ff" stroke-width="3" filter="url(#est-glow)"/>' +
            '<rect x="556" y="60" width="488" height="198" rx="10" fill="#1a1147"/>' +
            '<g class="est-led-ondas"><path d="M556,200 Q700,150 820,190 T1044,170 L1044,258 L556,258 Z" fill="#5f3dc4" opacity=".55"/>' +
            '<path d="M556,220 Q690,190 820,222 T1044,206 L1044,258 L556,258 Z" fill="#e64980" opacity=".45"/></g>' +
            '<text class="est-led-kicker" x="800" y="104" text-anchor="middle">PEDNIA · POLIMOTOR</text>' +
            '<text class="est-led-texto" x="800" y="166" text-anchor="middle">ESTADIO MÁGICO</text>' +
            '<text class="est-led-sub" x="800" y="214" text-anchor="middle">¡Arma la pose del atleta!</text>' +
            '<rect x="556" y="60" width="488" height="198" rx="10" fill="url(#est-led-puntos)"/>' +
            '<path d="M640,274 L620,330 M960,274 L980,330" stroke="#1b1446" stroke-width="10"/>' +
            "</g>";
    }

    function gradas() {
        var r = semilla(7);
        var colores = ["#ff6b6b", "#ffd43b", "#4dabf7", "#69db7c", "#f783ac", "#b197fc", "#ffa94d", "#3bc9db"];
        var pieles = ["#f3c6b6", "#e8b48f", "#c68863", "#8d5a3c", "#f5d0b5"];
        var html = '<g class="est-gradas">';
        html += '<path d="M0,330 L1600,330 L1600,580 L0,580 Z" fill="url(#est-grada)"/>';
        for (var f = 0; f < 5; f++) {
            var y = 352 + f * 46;
            html += '<rect x="0" y="' + (y + 22) + '" width="1600" height="8" fill="#1b1446" opacity=".7"/>';
            html += '<g class="est-fila" style="--f:' + f + '">';
            for (var x = 14 + (f % 2) * 16; x < 1600; x += 32) {
                if (x > 520 && x < 1080 && f < 1) continue;
                var i = Math.floor(r() * 1000);
                var col = colores[i % colores.length];
                var piel = pieles[(i >> 3) % pieles.length];
                html += '<g class="est-fan" style="--i:' + (i % 13) + '" transform="translate(' + x + "," + y + ')">' +
                    '<g class="est-fan-cuerpo"><rect x="-11" y="2" width="22" height="20" rx="8" fill="' + col + '"/>' +
                    '<circle cx="0" cy="-6" r="9" fill="' + piel + '"/>' +
                    (i % 5 === 0 ? '<path class="est-fan-bandera" d="M10,-4 L10,-30 L28,-24 L10,-18" fill="' + colores[(i + 3) % colores.length] + '" stroke="#fff" stroke-width="1.5"/>' : "") +
                    "</g></g>";
            }
            html += "</g>";
        }
        // Banderines de colores sobre las gradas
        html += '<path d="M0,334 Q200,358 400,334 Q600,358 800,334 Q1000,358 1200,334 Q1400,358 1600,334" fill="none" stroke="#fff" stroke-width="2" opacity=".6"/>';
        for (var b = 0; b < 32; b++) {
            var bx = 25 + b * 50;
            var by = 334 + Math.sin((bx % 400) / 400 * Math.PI) * 22;
            html += '<path class="est-banderin" style="--i:' + b + '" d="M' + (bx - 10) + "," + by.toFixed(1) + " L" + (bx + 10) + "," + by.toFixed(1) + " L" + bx + "," + (by + 22).toFixed(1) + ' Z" fill="' + colores[b % colores.length] + '"/>';
        }
        html += "</g>";
        return html;
    }

    function neon() {
        return '<g class="est-neon" filter="url(#est-glow)">' +
            '<path class="est-tubo est-tubo-a" d="M0,586 L1600,586"/>' +
            '<path class="est-tubo est-tubo-b" d="M0,598 L1600,598"/>' +
            '<path class="est-energia" d="M0,586 L1600,586"/>' +
            '<path class="est-energia est-energia-2" d="M1600,598 L0,598"/>' +
            "</g>";
    }

    function pista() {
        var html = '<g class="est-pista">';
        html += '<path d="M0,604 L1600,604 L1600,900 L0,900 Z" fill="url(#est-pista)"/>';
        html += '<path d="M260,900 Q800,700 1340,900 Z" fill="url(#est-cesped)"/>';
        for (var i = 0; i < 6; i++) {
            var y = 630 + i * 46;
            var k = i * 60;
            html += '<path d="M0,' + y + " Q800," + (y - 30 + i * 6) + " 1600," + y + '" fill="none" stroke="#fff" stroke-width="4" opacity=".85"/>';
            if (i < 5) {
                html += '<text x="' + (90 + k * 0.15) + '" y="' + (y + 32) + '" class="est-carril">' + (i + 1) + "</text>";
            }
        }
        html += '<rect x="1390" y="604" width="44" height="296" fill="url(#est-cuadros)" opacity=".9" transform="skewX(-12) translate(140,0)"/>';
        html += "</g>";
        return html;
    }

    function decoracion() {
        var html = '<g class="est-deco">';
        // Vallas a los lados
        [[150, 700, 1], [1420, 690, 1], [330, 812, 1.2]].forEach(function (v, i) {
            html += '<g class="est-valla" style="--i:' + i + '" transform="translate(' + v[0] + "," + v[1] + ") scale(" + v[2] + ')">' +
                '<rect x="-44" y="-50" width="88" height="16" rx="4" fill="#fff"/><rect x="-44" y="-50" width="22" height="16" fill="#e03131"/>' +
                '<rect x="0" y="-50" width="22" height="16" fill="#e03131"/>' +
                '<rect x="-40" y="-34" width="7" height="44" fill="#ced4da"/><rect x="33" y="-34" width="7" height="44" fill="#ced4da"/>' +
                '<rect x="-48" y="8" width="20" height="6" rx="3" fill="#868e96"/><rect x="28" y="8" width="20" height="6" rx="3" fill="#868e96"/></g>';
        });
        // Conos
        [[60, 860], [1540, 850], [1250, 880]].forEach(function (c) {
            html += '<g transform="translate(' + c[0] + "," + c[1] + ')"><path d="M-18,0 L-5,-46 L5,-46 L18,0 Z" fill="#ff922b"/>' +
                '<rect x="-12" y="-26" width="24" height="7" fill="#fff"/><rect x="-24" y="-2" width="48" height="8" rx="3" fill="#e8590c"/></g>';
        });
        // Podio con estrella
        html += '<g class="est-podio" transform="translate(1500,600)">' +
            '<rect x="-60" y="-40" width="40" height="40" fill="#adb5bd"/><rect x="-20" y="-62" width="40" height="62" fill="#ffd43b"/>' +
            '<rect x="20" y="-28" width="40" height="28" fill="#e8590c"/>' +
            '<text x="0" y="-36" text-anchor="middle" class="est-podio-num">1</text>' +
            '<path class="est-podio-estrella" d="M0,-102 L7,-88 L22,-86 L11,-75 L14,-60 L0,-68 L-14,-60 L-11,-75 L-22,-86 L-7,-88 Z" fill="#ffe066" stroke="#f59f00" stroke-width="2"/></g>';
        // Balón y medalla gigante decorativa a la izquierda
        html += '<g class="est-medalla" transform="translate(110,560)"><path d="M-14,-90 L0,-50 L14,-90" fill="none" stroke="#4dabf7" stroke-width="10"/>' +
            '<circle cy="-34" r="22" fill="#ffd43b" stroke="#f59f00" stroke-width="4"/><path d="M0,-46 L4,-37 L14,-36 L7,-29 L9,-20 L0,-25 L-9,-20 L-7,-29 L-14,-36 L-4,-37 Z" fill="#fff3bf"/></g>';
        html += "</g>";
        return html;
    }

    function svgEstadio() {
        return '<svg class="est-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">' +
            defs() + cielo() + torre(90, "izq") + torre(1510, "der") + gradas() + pantallaLed() + neon() + pista() + decoracion() +
            "</svg>";
    }

    // ------------------------------------------------------------------ capa de efectos

    function montar() {
        fondo = document.getElementById("est-fondo");
        capa = document.getElementById("est-capa");
        if (fondo && !fondo.firstChild) fondo.innerHTML = svgEstadio();
        if (capa && !capa.querySelector(".est-rotulo")) {
            capa.innerHTML =
                '<div class="est-rotulo" hidden><span class="est-rotulo-kicker"></span><strong class="est-rotulo-titulo"></strong><span class="est-rotulo-sub"></span></div>' +
                '<div class="est-presenta" hidden>' +
                '<div class="est-cartel"><span class="est-cartel-luz"></span><small>PedNia · Polimotor</small><strong>Estadio de Atletismo Mágico</strong><span>El Puzle de Siluetas en Acción</span></div>' +
                '<svg class="est-zoe" viewBox="-200 -260 400 420" aria-hidden="true"></svg>' +
                "</div>" +
                '<div class="est-aviso" hidden></div>';
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

    function pantalla(texto, sub, kicker) {
        if (!fondo) return;
        var t = fondo.querySelector(".est-led-texto");
        var s = fondo.querySelector(".est-led-sub");
        var k = fondo.querySelector(".est-led-kicker");
        if (t && texto != null) t.textContent = String(texto).toUpperCase();
        if (s && sub != null) s.textContent = sub;
        if (k && kicker != null) k.textContent = kicker;
        pulso("est-led-cambia", 700);
    }

    /** Dibuja una figura completa (a color) dentro de un <svg> y devuelve una función para posarla. */
    function figuraEn(svg, posturaCruda) {
        var postura = P.normalizarPostura(posturaCruda);
        var html = '<g class="est-fig">';
        postura.piezas.forEach(function (p) {
            html += '<g class="pieza encajada viva lado-' + (p.lado || "c") + '" data-slot="' + p.id + '" transform="' +
                PZ.transformar({ x: p.pivote.x, y: p.pivote.y, angulo: p.angulo }, 1) + '"><g class="pz-cuerpo">' +
                PZ.capasPieza(postura.personaje, p) + "</g></g>";
        });
        html += "</g>";
        svg.innerHTML = html;
        return {
            postura: postura,
            posar: function (poseMap) {
                Object.keys(poseMap).forEach(function (id) {
                    var n = svg.querySelector('[data-slot="' + id + '"]');
                    if (n) n.setAttribute("transform", PZ.transformar({ x: poseMap[id].x, y: poseMap[id].y, angulo: poseMap[id].angulo }, 1));
                });
            }
        };
    }

    /**
     * Presentación: luces, cartel y Zoe dando un súper salto a color. Al final Zoe se vuelve sombra:
     * esa es la silueta que el niño va a armar. opts = { postura (cruda), ms }.
     */
    async function presentar(opts) {
        opts = opts || {};
        if (!capa) return;
        var pres = capa.querySelector(".est-presenta");
        var svg = pres.querySelector(".est-zoe");
        var fig = opts.postura ? figuraEn(svg, opts.postura) : null;
        pres.hidden = false;
        pres.classList.remove("sale", "sombra");
        void pres.offsetWidth;
        pres.classList.add("entra");
        pulso("est-encender", 2600);
        pantalla("ESTADIO MÁGICO", "¡Bienvenidos, atletas!", "PEDNIA · POLIMOTOR");
        if (fx()) fx().destello(0xfff3bf, 0.12);
        await sleep(900);
        if (fig) {
            await A.actuar({ cuerpo: fig.postura.cuerpo, aplicar: fig.posar, tipo: "salto" });
            if (fx()) {
                var r = svg.getBoundingClientRect();
                fx().brillo(r.left + r.width / 2, r.top + r.height * 0.4, 0xffe066, 18);
            }
            await sleep(300);
            pres.classList.add("sombra");
            pantalla("¿QUÉ POSE ES?", "Mira la sombra y arma el cuerpo");
            await sleep(1500);
        } else {
            await sleep(opts.ms || 2600);
        }
        pres.classList.remove("entra");
        pres.classList.add("sale");
        await sleep(600);
        pres.hidden = true;
        pres.classList.remove("sale", "sombra");
    }

    /** Rótulo grande de nivel y pantalla LED. */
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
        pantalla(titulo || "", sub || "", kicker || "");
        if (fx()) fx().destello(0xb197fc, 0.1);
        return sleep(ms || 2400).then(function () {
            r.classList.remove("entra");
            r.classList.add("sale");
            return sleep(500);
        }).then(function () {
            r.hidden = true;
            r.classList.remove("sale");
        });
    }

    function progreso(n, total, nombre) {
        if (!fondo) return;
        var s = fondo.querySelector(".est-led-sub");
        if (s) s.textContent = (nombre ? nombre + " · " : "") + "Piezas " + n + " / " + total;
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
        if (fx() && x != null) fx().energia(x, y, 0x7cf3ff);
        if (pfx() && x != null) pfx().estallido(x, y, "#7cf3ff", 12);
    }

    function error() {
        // Sin rojo ni castigo: un parpadeo ámbar suave de los focos.
        pulso("est-error", 900);
    }

    function aviso(texto, ms) {
        if (!capa) return;
        var a = capa.querySelector(".est-aviso");
        a.textContent = texto;
        a.hidden = false;
        a.classList.remove("entra");
        void a.offsetWidth;
        a.classList.add("entra");
        timers.push(setTimeout(function () { a.hidden = true; a.classList.remove("entra"); }, ms || 1600));
    }

    /** Luces del estadio encendidas y confeti sobre la figura. */
    function posturaLista(rect, nombre) {
        document.body.classList.add("est-luces");
        pulso("est-postura", 3200);
        pantalla("¡GENIAL!", nombre || "¡Pose completa!");
        if (fx()) {
            fx().destello(0xffffff, 0.22);
            if (rect) fx().confeti(rect);
        }
        if (pfx() && rect) pfx().celebracion(rect);
        timers.push(setTimeout(function () { document.body.classList.remove("est-luces"); }, 3600));
    }

    /** Final: luces de colores, fuegos y confeti. Promise al terminar. */
    function final(opts) {
        opts = opts || {};
        document.body.classList.add("est-fiesta", "est-luces");
        pantalla("¡ESPECTACULAR!", "¡Atletas profesionales!", "PEDNIA · CAMPEONES");
        if (fx()) fx().fiesta(true);
        var cuerpo = typeof opts.rectFigura === "function" ? opts.rectFigura() : null;
        [300, 1800, 3400].forEach(function (ms) {
            timers.push(setTimeout(function () {
                var r = cuerpo || { left: global.innerWidth * 0.3, top: global.innerHeight * 0.3, width: global.innerWidth * 0.4, height: global.innerHeight * 0.4 };
                if (fx()) fx().confeti(r);
                if (pfx()) pfx().celebracion(r);
            }, reducido ? 0 : ms));
        });
        var rutina = typeof opts.rutina === "function" ? opts.rutina() : Promise.resolve();
        return Promise.all([rutina, sleep(opts.minMs || 4800)]);
    }

    function limpiar() {
        timers.forEach(clearTimeout);
        timers = [];
        if (fx()) fx().fiesta(false);
    }

    global.Estadio = {
        montar: montar,
        presentar: presentar,
        etapa: etapa,
        pantalla: pantalla,
        progreso: progreso,
        seleccion: seleccion,
        orientada: orientada,
        acierto: acierto,
        error: error,
        aviso: aviso,
        posturaLista: posturaLista,
        final: final,
        limpiar: limpiar
    };
})(window);
