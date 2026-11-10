/**
 * Articulaciones — "taller de giro": muestra la pieza elegida con su pivote al centro,
 * flechas curvas alrededor del hombro/cadera (azul) y del codo/rodilla (naranja).
 *
 * Toques en las flechas (o mantener presionado) giran la articulación un paso, con un giro suave.
 * Los botones grandes a los lados controlan el hombro/cadera; la fila de abajo, el codo/rodilla.
 * Depende de Postura, Muneco y EspejoAnim.
 */
(function (global) {
    "use strict";

    var P = global.Postura;
    var M = global.Muneco;
    var A = global.EspejoAnim;

    var el = {};
    var estado = {
        id: null,
        ang: { a: 0, b: 0 },
        mostrado: { a: 0, b: 0 },
        flexion: false,
        bloqueado: false,
        orientada: false
    };
    var opciones = {};
    var tweenActual = null;
    var repetir = null;

    var R_P = 30; // radio de las flechas del hombro/cadera (unidades del taller)
    var R_D = 20; // radio de las flechas del codo/rodilla

    function arco(r, desde, hasta) {
        var a1 = desde * Math.PI / 180;
        var a2 = hasta * Math.PI / 180;
        var x1 = r * Math.cos(a1);
        var y1 = r * Math.sin(a1);
        var x2 = r * Math.cos(a2);
        var y2 = r * Math.sin(a2);
        var barrido = hasta > desde ? 1 : 0;
        var grande = Math.abs(hasta - desde) > 180 ? 1 : 0;
        return "M" + x1.toFixed(2) + "," + y1.toFixed(2) + " A" + r + "," + r + " 0 " + grande + " " + barrido + " " + x2.toFixed(2) + "," + y2.toFixed(2);
    }

    /** Dos flechas curvas (antihorario a la izquierda, horario a la derecha) alrededor de (0,0). */
    function flechas(r, junta) {
        var marcador = junta === "p" ? "url(#t-punta-p)" : "url(#t-punta-d)";
        return '<g class="t-flecha" data-junta="' + junta + '" data-dir="-1">' +
            '<path class="t-flecha-toque" d="' + arco(r, 205, 115) + '"/>' +
            '<path class="t-flecha-trazo" d="' + arco(r, 205, 125) + '" marker-end="' + marcador + '"/>' +
            "</g>" +
            '<g class="t-flecha" data-junta="' + junta + '" data-dir="1">' +
            '<path class="t-flecha-toque" d="' + arco(r, -25, 65) + '"/>' +
            '<path class="t-flecha-trazo" d="' + arco(r, -25, 55) + '" marker-end="' + marcador + '"/>' +
            "</g>";
    }

    function defs() {
        return "<defs>" +
            '<marker id="t-punta-p" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">' +
            '<path d="M0,0 L10,5 L0,10 Z" fill="#1c7ed6"/></marker>' +
            '<marker id="t-punta-d" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">' +
            '<path d="M0,0 L10,5 L0,10 Z" fill="#f76707"/></marker>' +
            '<radialGradient id="t-fondo" cx="50%" cy="50%" r="50%">' +
            '<stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e7f1ff"/></radialGradient>' +
            "</defs>";
    }

    function desplazamiento(id) {
        if (id === "cabeza") return 44;
        return 0;
    }

    function dibujar() {
        var id = estado.id;
        if (!el.svg) return;
        if (!id) {
            M.pintar(el.svg, defs() +
                '<circle class="t-guia" r="120"/>' +
                '<g class="t-vacio"><path d="M-14,-30 Q0,-44 14,-30 M0,-10 L0,30 M-18,10 L0,30 L18,10" /></g>');
            return;
        }
        var extremidad = P.esExtremidad(id);
        var html = defs() + '<circle class="t-guia" r="120"/>';
        html += '<g class="t-pieza" transform="translate(0,' + desplazamiento(id) + ')">' + M.parte(id, estado.mostrado) + "</g>";
        if (extremidad) {
            html += '<g class="t-arcos t-arcos-p">' + flechas(R_P, "p") + "</g>";
            if (estado.flexion) html += '<g class="t-arcos t-arcos-d">' + flechas(R_D, "d") + "</g>";
            html += '<circle class="t-pivote t-pivote-p" r="7.5"/>';
            if (estado.flexion) html += '<circle class="t-pivote t-pivote-d" r="5.5"/>';
        }
        M.pintar(el.svg, html);
        moverArcoDistal();
    }

    function moverArcoDistal() {
        if (!el.svg || !estado.id || !P.esExtremidad(estado.id)) return;
        var c = P.cinematica(estado.id, estado.mostrado).medio;
        var t = "translate(" + c.x.toFixed(2) + "," + c.y.toFixed(2) + ")";
        var g = el.svg.querySelector(".t-arcos-d");
        var p = el.svg.querySelector(".t-pivote-d");
        if (g) g.setAttribute("transform", t);
        if (p) p.setAttribute("transform", t);
    }

    function pintarAngulo(ang) {
        estado.mostrado = P.copiar(ang);
        var pieza = el.svg && el.svg.querySelector(".t-pieza");
        if (pieza) M.aplicar(pieza, estado.id, estado.mostrado);
        moverArcoDistal();
    }

    function rotulos(id) {
        var pz = P.PIEZAS[id] || {};
        var esBrazo = pz.tipo === "brazo";
        if (el.rotuloP) el.rotuloP.textContent = esBrazo ? "Hombro" : "Cadera";
        if (el.rotuloD) el.rotuloD.textContent = esBrazo ? "Codo" : "Rodilla";
    }

    function actualizarControles() {
        var extremidad = !!estado.id && P.esExtremidad(estado.id);
        if (el.raiz) {
            el.raiz.classList.toggle("taller-vacio", !estado.id);
            el.raiz.classList.toggle("taller-gira", extremidad);
            el.raiz.classList.toggle("taller-flexion", extremidad && estado.flexion);
            el.raiz.classList.toggle("taller-bloqueado", !!estado.bloqueado);
        }
        (el.botones || []).forEach(function (b) {
            var junta = b.getAttribute("data-junta");
            b.disabled = !extremidad || estado.bloqueado || (junta === "d" && !estado.flexion);
        });
    }

    function marcarOrientada(ok) {
        estado.orientada = !!ok;
        if (el.raiz) el.raiz.classList.toggle("taller-orientada", !!ok);
    }

    /** Un paso de giro. dir: +1 horario, -1 antihorario (visto en pantalla). */
    function girar(junta, dir) {
        if (!estado.id || !P.esExtremidad(estado.id) || estado.bloqueado) return Promise.resolve(false);
        if (junta === "d" && !estado.flexion) return Promise.resolve(false);
        var paso = Number(opciones.paso) > 0 ? Number(opciones.paso) : 30;
        var desde = P.copiar(estado.mostrado);
        estado.ang = P.girar(estado.id, estado.ang, junta, dir * paso);
        var hasta = P.copiar(estado.ang);
        if (tweenActual) tweenActual.cancelar();
        var id = estado.id;
        tweenActual = A.tween(190, function (t) {
            if (estado.id !== id) return;
            pintarAngulo(P.interpolar(desde, hasta, t));
        }, "salida");
        var marca = el.raiz && el.raiz.querySelector('.giro-btn[data-junta="' + junta + '"][data-dir="' + dir + '"]');
        if (marca) A.clase(marca, "giro-pulsado", 260);
        if (typeof opciones.onGiro === "function") opciones.onGiro(id, P.copiar(estado.ang), junta, dir);
        return tweenActual.promesa;
    }

    function pararRepeticion() {
        if (repetir) {
            clearTimeout(repetir.t1);
            clearInterval(repetir.t2);
            repetir = null;
        }
    }

    function enlazarBoton(b) {
        b.addEventListener("pointerdown", function (ev) {
            if (b.disabled) return;
            ev.preventDefault();
            var junta = b.getAttribute("data-junta");
            var dir = Number(b.getAttribute("data-dir")) || 1;
            pararRepeticion();
            girar(junta, dir);
            repetir = {
                t1: setTimeout(function () {
                    if (!repetir) return;
                    repetir.t2 = setInterval(function () { girar(junta, dir); }, 300);
                }, 480),
                t2: null
            };
        });
        ["pointerup", "pointerleave", "pointercancel"].forEach(function (tipo) {
            b.addEventListener(tipo, pararRepeticion);
        });
        // Teclado: Enter/Espacio dan un paso.
        b.addEventListener("keydown", function (ev) {
            if (ev.key !== "Enter" && ev.key !== " ") return;
            ev.preventDefault();
            girar(b.getAttribute("data-junta"), Number(b.getAttribute("data-dir")) || 1);
        });
    }

    function montar(refs, opts) {
        el = refs || {};
        opciones = opts || {};
        el.botones = Array.prototype.slice.call((el.raiz && el.raiz.querySelectorAll(".giro-btn")) || []);
        el.botones.forEach(enlazarBoton);
        global.addEventListener("pointerup", pararRepeticion);

        if (el.svg) {
            // Toques directos sobre las flechas dibujadas.
            el.svg.addEventListener("pointerdown", function (ev) {
                var flecha = ev.target.closest && ev.target.closest(".t-flecha");
                if (flecha) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    girar(flecha.getAttribute("data-junta"), Number(flecha.getAttribute("data-dir")) || 1);
                    return;
                }
                var pieza = ev.target.closest && ev.target.closest(".t-pieza");
                if (pieza && estado.id && !estado.bloqueado && typeof opciones.onArrastre === "function") {
                    opciones.onArrastre(ev, estado.id, P.copiar(estado.ang));
                }
            });
        }
        vaciar();
    }

    function cargar(id, ang, opts) {
        opts = opts || {};
        pararRepeticion();
        if (tweenActual) tweenActual.cancelar();
        estado.id = id;
        estado.ang = P.copiar(ang);
        estado.mostrado = P.copiar(ang);
        estado.flexion = !!opts.flexion && P.esExtremidad(id);
        estado.bloqueado = false;
        marcarOrientada(false);
        rotulos(id);
        dibujar();
        actualizarControles();
        if (el.raiz) A.clase(el.raiz, "taller-entra", 520);
        if (el.ayuda) el.ayuda.textContent = opts.ayuda || "";
    }

    function vaciar(ayuda) {
        pararRepeticion();
        if (tweenActual) tweenActual.cancelar();
        estado.id = null;
        estado.flexion = false;
        marcarOrientada(false);
        dibujar();
        actualizarControles();
        if (el.ayuda) el.ayuda.textContent = ayuda || "";
    }

    function bloquear(si) {
        estado.bloqueado = !!si;
        if (si) pararRepeticion();
        actualizarControles();
    }

    /** Oculta la pieza del taller mientras se arrastra (queda el aro y el pivote). */
    function ocultarPieza(si) {
        if (el.raiz) el.raiz.classList.toggle("taller-sin-pieza", !!si);
    }

    /** Pivote del taller en pantalla y px por unidad (para el arrastre y la demo). */
    function pivotePantalla() {
        if (!el.svg || !el.svg.getScreenCTM) return null;
        var ctm = el.svg.getScreenCTM();
        if (!ctm) return null;
        var pt = el.svg.createSVGPoint();
        pt.x = 0;
        pt.y = desplazamiento(estado.id);
        var r = pt.matrixTransform(ctm);
        return { x: r.x, y: r.y, k: ctm.a };
    }

    function boton(junta, dir) {
        return el.raiz ? el.raiz.querySelector('.giro-btn[data-junta="' + junta + '"][data-dir="' + dir + '"]') : null;
    }

    global.Articulaciones = {
        montar: montar,
        cargar: cargar,
        vaciar: vaciar,
        girar: girar,
        bloquear: bloquear,
        ocultarPieza: ocultarPieza,
        marcarOrientada: marcarOrientada,
        pivotePantalla: pivotePantalla,
        pivoteLocal: function () { return { x: 0, y: desplazamiento(estado.id) }; },
        svg: function () { return el.svg || null; },
        boton: boton,
        id: function () { return estado.id; },
        angulo: function () { return P.copiar(estado.ang); },
        flexion: function () { return estado.flexion; },
        fijarAngulo: function (ang) {
            estado.ang = P.copiar(ang);
            pintarAngulo(estado.ang);
        }
    };
})(window);
