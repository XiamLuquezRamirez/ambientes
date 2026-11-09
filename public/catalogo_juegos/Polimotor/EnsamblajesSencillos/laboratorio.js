/**
 * laboratorio.js — Laboratorio de robots animado detrás de "Ensamblajes sencillos".
 * Solo visual: script.js lo avisa (progreso, arrastre, acierto, error, final).
 *   - Fondo SVG: pantallas con código, luces, engranajes, techo con compuerta.
 *   - Capa encima del juego: batería de energía, brazo que suelda, escáner láser.
 *   - Final: palanca, carga de energía, encendido, saludo y despegue por el techo.
 */
(function (global) {
    'use strict';

    var doc = global.document;
    var fondo = null;
    var capa = null;
    var svg = null;
    var bateria = null;
    var brazo = null;
    var escaner = null;
    var total = 0;
    var colocadas = 0;
    var temporizador = null;

    function reducido() {
        return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function esperar(ms) {
        return new Promise(function (r) { setTimeout(r, reducido() ? Math.min(ms, 120) : ms); });
    }

    function sonar(nombre, opts) {
        if (typeof global.sonarEvento === 'function') {
            try { global.sonarEvento(nombre, opts); } catch (e) { /* noop */ }
        }
    }

    function destino(id) {
        return typeof global.destinoEl === 'function' ? global.destinoEl(id) : null;
    }

    function lienzo() {
        return doc.getElementById('lienzo');
    }

    function parte(id) {
        return doc.querySelector('#figura-svg .svg-parte[data-id="' + id + '"]');
    }

    function unirRects(els) {
        var l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
        Array.prototype.forEach.call(els, function (el) {
            var x = el.getBoundingClientRect();
            if (x.width < 1 || x.height < 1) return;
            l = Math.min(l, x.left);
            t = Math.min(t, x.top);
            r = Math.max(r, x.right);
            b = Math.max(b, x.bottom);
        });
        if (l === Infinity) return null;
        return { left: l, top: t, right: r, bottom: b, width: r - l, height: b - t };
    }

    var FORMAS = 'path, circle, ellipse, rect, polygon, polyline, line, image';

    /** Lo pintado de una pieza: la caja de su <svg> interno es mucho mayor que el dibujo. */
    function rectDe(el) {
        if (!el) return null;
        return unirRects(el.querySelectorAll(FORMAS)) || el.getBoundingClientRect();
    }

    /** Contorno real del robot: sus piezas se salen de la caja de #lienzo. */
    function rectRobot() {
        var r = unirRects(doc.querySelectorAll('#figura-svg .svg-parte :is(' + FORMAS + ')'));
        if (r) return r;
        var lz = lienzo();
        return lz ? lz.getBoundingClientRect() : null;
    }

    /* ── Fondo SVG ──────────────────────────────────────────── */

    function leds(x, y, filas, cols, paso) {
        var colores = ['#ffd43b', '#ff6b6b', '#38d9a9', '#4dabf7'];
        var out = '';
        for (var f = 0; f < filas; f++) {
            for (var c = 0; c < cols; c++) {
                var i = f * cols + c;
                out += '<circle class="lab-led" style="--i:' + i + '" cx="' + (x + c * paso) + '" cy="' + (y + f * paso) +
                    '" r="7" fill="' + colores[f % colores.length] + '"/>';
            }
        }
        return out;
    }

    function lineasCodigo() {
        var out = '';
        var anchos = [120, 80, 150, 60, 110, 140, 70, 100, 130, 90, 150, 60];
        for (var i = 0; i < 24; i++) {
            var w = anchos[i % anchos.length];
            var sangria = (i % 3) * 16;
            out += '<rect x="' + (64 + sangria) + '" y="' + (176 + i * 16) + '" width="' + w + '" height="7" rx="3" fill="' +
                (i % 4 === 0 ? '#ffd43b' : i % 3 === 0 ? '#ff8787' : '#69db7c') + '"/>';
        }
        return out;
    }

    function engranaje(cx, cy, r, dientes, color, clase) {
        var pts = [];
        var n = dientes * 2;
        for (var i = 0; i < n; i++) {
            var a0 = (i / n) * Math.PI * 2;
            var a1 = ((i + 1) / n) * Math.PI * 2;
            var rr = i % 2 === 0 ? r : r * 0.8;
            pts.push((Math.cos(a0) * rr).toFixed(1) + ',' + (Math.sin(a0) * rr).toFixed(1));
            pts.push((Math.cos(a1) * rr).toFixed(1) + ',' + (Math.sin(a1) * rr).toFixed(1));
        }
        return '<g transform="translate(' + cx + ' ' + cy + ')"><g class="' + clase + '">' +
            '<polygon points="' + pts.join(' ') + '" fill="' + color + '"/>' +
            '<circle r="' + (r * 0.32) + '" fill="#c5c9f8"/></g></g>';
    }

    function estrellas() {
        var out = '';
        for (var i = 0; i < 26; i++) {
            var x = 520 + ((i * 97) % 560);
            var y = 6 + ((i * 53) % 96);
            out += '<circle class="lab-estrella" style="--i:' + i + '" cx="' + x + '" cy="' + y + '" r="' + (i % 3 === 0 ? 3 : 2) + '" fill="#fff"/>';
        }
        return out;
    }

    function construirFondo() {
        fondo.innerHTML =
            '<svg class="lab-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMinYMin slice" aria-hidden="true">' +
            '<defs>' +
            '<linearGradient id="lab-pared" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#b7bdf6"/><stop offset="1" stop-color="#9aa3ee"/></linearGradient>' +
            '<linearGradient id="lab-cielo" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#0b1440"/><stop offset="1" stop-color="#2b3b8f"/></linearGradient>' +
            '<linearGradient id="lab-rayo" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#fff6cf" stop-opacity="0.8"/><stop offset="1" stop-color="#fff6cf" stop-opacity="0"/></linearGradient>' +
            '<clipPath id="lab-pantalla"><rect x="52" y="160" width="260" height="150" rx="8"/></clipPath>' +
            '</defs>' +
            '<rect width="1600" height="900" fill="url(#lab-pared)"/>' +
            // Paneles de la pared.
            '<g fill="none" stroke="#8e97e6" stroke-width="3">' +
            '<rect x="40" y="130" width="300" height="660" rx="6"/><rect x="380" y="130" width="300" height="660" rx="6"/>' +
            '<rect x="720" y="130" width="300" height="660" rx="6"/><rect x="1060" y="130" width="300" height="660" rx="6"/>' +
            '<rect x="1400" y="130" width="300" height="660" rx="6"/></g>' +
            // Cielo detrás de la compuerta del techo.
            '<g class="lab-cielo"><rect x="500" y="0" width="600" height="112" fill="url(#lab-cielo)"/>' + estrellas() + '</g>' +
            '<polygon class="lab-rayo" points="560,112 1040,112 1180,900 420,900" fill="url(#lab-rayo)"/>' +
            // Techo y compuerta.
            '<rect x="0" y="0" width="500" height="112" fill="#2b2260"/><rect x="1100" y="0" width="500" height="112" fill="#2b2260"/>' +
            '<g class="lab-puerta izq"><rect x="500" y="0" width="300" height="112" fill="#3b2f7a"/>' +
            '<path d="M520 20 L780 92 M520 92 L780 20" stroke="#ffd43b" stroke-width="10" opacity=".55"/></g>' +
            '<g class="lab-puerta der"><rect x="800" y="0" width="300" height="112" fill="#3b2f7a"/>' +
            '<path d="M820 20 L1080 92 M820 92 L1080 20" stroke="#ffd43b" stroke-width="10" opacity=".55"/></g>' +
            '<rect x="0" y="108" width="1600" height="14" fill="#1e1748"/>' +
            '<g class="lab-focos">' +
            '<circle cx="140" cy="122" r="9" fill="#ffd43b"/><circle cx="440" cy="122" r="9" fill="#ffd43b"/>' +
            '<circle cx="1160" cy="122" r="9" fill="#ffd43b"/><circle cx="1460" cy="122" r="9" fill="#ffd43b"/></g>' +
            // Pantalla con código que corre y su mensaje.
            '<g transform="translate(0 -14)">' +
            '<rect x="40" y="148" width="284" height="174" rx="14" fill="#2b2260"/>' +
            '<rect x="52" y="160" width="260" height="150" rx="8" fill="#0b1d3a"/>' +
            '<g clip-path="url(#lab-pantalla)"><g class="lab-codigo">' + lineasCodigo() + '</g>' +
            '<rect class="lab-msj-fondo" x="52" y="200" width="260" height="70" fill="#0b1d3a" opacity="0"/>' +
            '<text class="lab-msj" x="182" y="250" text-anchor="middle" font-family="Fredoka, sans-serif" font-size="46" font-weight="700" fill="#69db7c" opacity="0">OK</text></g>' +
            '</g>' +
            // Tablero de luces.
            '<rect x="40" y="370" width="200" height="150" rx="14" fill="#7c86e0"/>' +
            '<g class="lab-tablero">' + leds(68, 400, 3, 7, 24) + '</g>' +
            // Engranajes.
            engranaje(1500, 220, 62, 10, '#7c86e0', 'lab-engranaje g1') +
            engranaje(1424, 300, 40, 8, '#6b74d6', 'lab-engranaje g2') +
            // Piso con franja de luces.
            '<rect x="0" y="780" width="1600" height="120" fill="#8e97e6"/>' +
            '<g class="lab-franja">' + (function () {
                var o = '';
                for (var i = 0; i < 40; i++) o += '<rect class="lab-led" style="--i:' + i + '" x="' + (i * 40 + 8) + '" y="776" width="24" height="8" rx="4" fill="#38d9a9"/>';
                return o;
            })() + '</g>' +
            '<rect class="lab-sombra" width="1600" height="900" fill="#120a35"/>' +
            '<rect class="lab-destello" width="1600" height="900" fill="#69db7c"/>' +
            '</svg>';
        svg = fondo.querySelector('svg');
    }

    /* ── Capa sobre el juego ────────────────────────────────── */

    function construirCapa() {
        capa.innerHTML =
            '<div class="lab-bateria" aria-hidden="true"><span class="lab-bateria-tapa"></span>' +
            '<div class="lab-bateria-cuerpo"></div><span class="lab-bateria-rayo">⚡</span></div>' +
            '<div class="lab-brazo" aria-hidden="true"><span class="lab-brazo-riel"></span><span class="lab-brazo-tubo"></span>' +
            '<span class="lab-brazo-cabeza"><span class="lab-brazo-punta"></span></span></div>' +
            '<div class="lab-escaner" aria-hidden="true"><span class="lab-escaner-linea"></span></div>';
        bateria = capa.querySelector('.lab-bateria');
        brazo = capa.querySelector('.lab-brazo');
        escaner = capa.querySelector('.lab-escaner');
    }

    function pintarBateria() {
        if (!bateria) return;
        var cuerpo = bateria.querySelector('.lab-bateria-cuerpo');
        if (cuerpo.children.length !== total) {
            cuerpo.innerHTML = '';
            for (var i = 0; i < total; i++) {
                var s = doc.createElement('span');
                s.className = 'lab-celda';
                cuerpo.appendChild(s);
            }
        }
        Array.prototype.forEach.call(cuerpo.children, function (c, i) {
            // Se llena de izquierda a derecha.
            var lleno = i < colocadas;
            if (lleno && !c.classList.contains('llena')) {
                c.classList.add('llena', 'recien');
                setTimeout(function () { c.classList.remove('recien'); }, 700);
            } else if (!lleno) {
                c.classList.remove('llena');
            }
        });
        bateria.classList.toggle('completa', total > 0 && colocadas >= total);
    }

    /** La batería va acostada sobre la cabeza del robot, sin tapar la bandeja. */
    function ubicarBateria() {
        var r = rectRobot();
        if (!bateria || !r || !r.width) return;
        var ancho = Math.max(150, Math.min(280, r.width * 0.8));
        var alto = Math.max(30, Math.min(46, ancho * 0.16));
        // Por encima de la antena, con aire: nunca sobre la cabeza.
        var y = Math.max(8, r.top - alto - 18);
        bateria.style.left = Math.round(r.left + (r.width - ancho) / 2) + 'px';
        bateria.style.top = Math.round(y) + 'px';
        bateria.style.width = Math.round(ancho) + 'px';
        bateria.style.height = Math.round(alto) + 'px';
    }

    function estadoFondo(clase, ms) {
        if (!svg) return;
        svg.classList.remove('ok', 'error');
        void svg.getBoundingClientRect();
        svg.classList.add(clase);
        var msj = svg.querySelector('.lab-msj');
        if (msj) {
            msj.textContent = clase === 'ok' ? '¡BIEN!' : '¡UPS!';
            msj.setAttribute('fill', clase === 'ok' ? '#69db7c' : '#ff6b6b');
        }
        svg.querySelector('.lab-destello').setAttribute('fill', clase === 'ok' ? '#69db7c' : '#ff6b6b');
        clearTimeout(temporizador);
        temporizador = setTimeout(function () { svg.classList.remove(clase); }, ms);
    }

    function chispas(x, y, cantidad) {
        if (reducido()) return;
        for (var i = 0; i < cantidad; i++) {
            var c = doc.createElement('span');
            c.className = 'lab-chispa';
            var ang = Math.random() * Math.PI * 2;
            var dist = 30 + Math.random() * 70;
            c.style.left = x + 'px';
            c.style.top = y + 'px';
            c.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
            c.style.setProperty('--dy', Math.round(Math.sin(ang) * dist - 20) + 'px');
            c.style.animationDelay = (Math.random() * 0.15).toFixed(2) + 's';
            capa.appendChild(c);
            setTimeout(function (el) { return function () { el.remove(); }; }(c), 900);
        }
    }

    /** El brazo del techo baja hasta la pieza recién puesta y la suelda. */
    function soldar(el) {
        if (!brazo || !el) return Promise.resolve();
        var r = el.getBoundingClientRect();
        if (!r.width) return Promise.resolve();
        var x = r.left + r.width / 2;
        var y = r.top + Math.min(r.height * 0.35, 60);
        brazo.style.left = Math.round(x) + 'px';
        brazo.style.setProperty('--largo', Math.max(40, Math.round(y)) + 'px');
        brazo.classList.remove('suelda');
        void brazo.offsetWidth;
        brazo.classList.add('baja');
        return esperar(420).then(function () {
            brazo.classList.add('suelda');
            sonar('tic');
            chispas(x, y, 16);
            setTimeout(function () { chispas(x, y, 10); sonar('tic'); }, 220);
            return esperar(620);
        }).then(function () {
            brazo.classList.remove('baja', 'suelda');
        });
    }

    /**
     * Saludo: el brazo y su mano giran juntos alrededor del hombro, como una sola
     * pieza. Cada parte tiene su propio translate(%), así que el pivote se pasa a las
     * coordenadas de cada una. Devuelve false si el robot no tiene brazo suelto.
     */
    function saludarConBrazo() {
        var fig = doc.getElementById('figura-svg');
        var brazo = parte('brazo_2') || parte('brazo_1');
        if (!fig || !brazo) return false;
        var mano = parte(brazo.dataset.id === 'brazo_2' ? 'mano_2' : 'mano_1');
        var ctm = fig.getScreenCTM();
        var vb = fig.viewBox && fig.viewBox.baseVal;
        if (!ctm || !vb) return false;
        var rb = rectDe(brazo);
        var cuerpo = parte('cuerpo');
        var rc = cuerpo ? rectDe(cuerpo) : rectRobot();
        var derecha = (rb.left + rb.width / 2) > (rc.left + rc.width / 2);
        // El hombro es la punta del brazo pegada al cuerpo.
        var pt = fig.createSVGPoint();
        pt.x = derecha ? rb.left + rb.width * 0.15 : rb.right - rb.width * 0.15;
        pt.y = rb.top + rb.height * 0.15;
        var hombro = pt.matrixTransform(ctm.inverse());
        [brazo, mano].forEach(function (g) {
            if (!g) return;
            var m = /translate\(\s*([-\d.]+)%\s*,\s*([-\d.]+)%\s*\)/.exec(g.style.transform || '');
            var px = m ? parseFloat(m[1]) : 0;
            var py = m ? parseFloat(m[2]) : 0;
            var ox = hombro.x - (px / 100) * vb.width;
            var oy = hombro.y - (py / 100) * vb.height;
            g.style.setProperty('--tx', px + '%');
            g.style.setProperty('--ty', py + '%');
            g.style.setProperty('--giro', derecha ? '1' : '-1');
            g.style.transformOrigin = ox.toFixed(1) + 'px ' + oy.toFixed(1) + 'px';
            g.classList.add('lab-saluda');
        });
        return true;
    }

    function terminarSaludo() {
        doc.querySelectorAll('#figura-svg .lab-saluda').forEach(function (g) {
            g.classList.remove('lab-saluda');
            g.style.transformOrigin = '';
        });
    }

    /** Una llama bajo cada pie (o dos bajo unas piernas de una sola pieza). */
    function encenderPropulsores(lz) {
        var rl = lz.getBoundingClientRect();
        var piernas = Array.prototype.filter.call(doc.querySelectorAll('#figura-svg .svg-parte'), function (g) {
            return /^pierna|^pie/.test(g.dataset.id || '');
        });
        var puntos = [];
        if (piernas.length >= 2) {
            piernas.forEach(function (g) {
                var r = rectDe(g);
                puntos.push({ x: r.left + r.width / 2, y: r.bottom });
            });
        } else {
            var r = piernas.length ? rectDe(piernas[0]) : rectRobot();
            puntos.push({ x: r.left + r.width * 0.28, y: r.bottom });
            puntos.push({ x: r.left + r.width * 0.72, y: r.bottom });
        }
        puntos.forEach(function (p) {
            var f = doc.createElement('span');
            f.className = 'lab-fuego';
            f.style.left = Math.round(p.x - rl.left) + 'px';
            f.style.top = Math.round(p.y - rl.top - 4) + 'px';
            lz.appendChild(f);
        });
    }

    var Laboratorio = {
        iniciar: function () {
            fondo = doc.getElementById('lab-fondo');
            capa = doc.getElementById('lab-capa');
            if (!fondo || !capa) return;
            construirFondo();
            construirCapa();
            global.addEventListener('resize', function () { ubicarBateria(); });
        },

        /** Piezas colocadas de un total: llena la batería. */
        progreso: function (n, de) {
            colocadas = n;
            total = de;
            ubicarBateria();
            pintarBateria();
            if (bateria) bateria.hidden = !de;
        },

        /** Mientras se arrastra: la sala se atenúa y el láser escanea. */
        arrastre: function (activo, idCorrecto, resaltar) {
            if (svg) svg.classList.toggle('arrastrando', !!activo);
            if (!escaner) return;
            if (!activo) {
                escaner.classList.remove('activo');
                return;
            }
            // Sin "resaltar destino" se escanea todo el robot: no delata la respuesta.
            var hueco = resaltar && destino(idCorrecto);
            var r = hueco ? rectDe(hueco) : rectRobot();
            if (!r) return;
            escaner.style.left = Math.round(r.left - 6) + 'px';
            escaner.style.top = Math.round(r.top - 6) + 'px';
            escaner.style.width = Math.round(r.width + 12) + 'px';
            escaner.style.height = Math.round(r.height + 12) + 'px';
            escaner.classList.add('activo');
        },

        acierto: function (piezaId) {
            estadoFondo('ok', 1100);
            return soldar(destino(piezaId));
        },

        error: function () {
            estadoFondo('error', 900);
        },

        /**
         * Gran final: el niño baja la palanca (o se baja sola), la batería se carga,
         * el robot se enciende, saluda y despega por el techo hacia el cielo.
         */
        final: function (opts) {
            opts = opts || {};
            var lz = lienzo();
            var self = this;
            colocadas = total;
            pintarBateria();
            doc.body.classList.add('lab-final');

            var panel = doc.createElement('div');
            panel.className = 'lab-palanca';
            panel.innerHTML =
                '<p class="lab-palanca-texto">' + (opts.textoPalanca || '¡Enciende tu robot!') + '</p>' +
                '<button type="button" class="lab-palanca-boton" aria-label="Bajar la palanca para encender el robot">' +
                '<span class="lab-palanca-base"></span><span class="lab-palanca-brazo"><span class="lab-palanca-bola"></span></span></button>';
            capa.appendChild(panel);
            var boton = panel.querySelector('button');

            var bajarPalanca = new Promise(function (resolve) {
                var hecho = false;
                var bajar = function () {
                    if (hecho) return;
                    hecho = true;
                    panel.classList.add('abajo');
                    sonar('soltar');
                    resolve();
                };
                boton.addEventListener('click', bajar);
                // Si nadie la toca, se baja sola para no trabar el juego.
                setTimeout(bajar, opts.esperaPalancaMs || 6000);
            });

            setTimeout(function () { panel.classList.add('visible'); }, 30);
            if (opts.hablar) opts.hablar(opts.textoPalanca || '¡Enciende tu robot!');

            return bajarPalanca
                .then(function () { return esperar(450); })
                .then(function () {
                    // Carga de energía: la batería parpadea y el laboratorio zumba.
                    if (bateria) bateria.classList.add('cargando');
                    if (svg) svg.classList.add('cargando');
                    sonar('aparece');
                    setTimeout(function () { sonar('tic'); }, 500);
                    setTimeout(function () { sonar('tic'); }, 900);
                    setTimeout(function () { sonar('tic'); }, 1250);
                    return esperar(1600);
                })
                .then(function () {
                    panel.classList.remove('visible');
                    if (bateria) bateria.classList.remove('cargando');
                    if (svg) svg.classList.remove('cargando');
                    // Encendido del robot.
                    if (lz) lz.classList.add('robot-encendido');
                    estadoFondo('ok', 1600);
                    sonar('encaje');
                    return esperar(900);
                })
                .then(function () {
                    if (lz) lz.classList.add('robot-saluda');
                    saludarConBrazo();
                    var burbuja = doc.createElement('div');
                    burbuja.className = 'lab-burbuja';
                    burbuja.textContent = opts.saludo || '¡Hola! ¡Gracias por armarme!';
                    capa.appendChild(burbuja);
                    var r = rectRobot();
                    if (r) {
                        // A la derecha de la cabeza, donde estaba la bandeja.
                        burbuja.style.left = Math.round(r.right - r.width * 0.08) + 'px';
                        burbuja.style.top = Math.round(Math.max(20, r.top + r.height * 0.04)) + 'px';
                    }
                    setTimeout(function () { burbuja.classList.add('visible'); }, 30);
                    var voz = opts.hablar ? opts.hablar(opts.saludo || '¡Hola! ¡Gracias por armarme!') : null;
                    return Promise.race([Promise.resolve(voz), esperar(3200)]).then(function () {
                        return esperar(600);
                    }).then(function () {
                        burbuja.classList.remove('visible');
                        setTimeout(function () { burbuja.remove(); }, 400);
                    });
                })
                .then(function () {
                    // Se abre el techo y prenden los propulsores.
                    if (svg) svg.classList.add('techo-abierto');
                    terminarSaludo();
                    if (lz) {
                        lz.classList.remove('robot-saluda');
                        encenderPropulsores(lz);
                        lz.classList.add('robot-propulsores');
                    }
                    if (bateria) bateria.hidden = true;
                    doc.body.classList.add('lab-temblor');
                    sonar('enRed');
                    return esperar(1300);
                })
                .then(function () {
                    if (lz) lz.classList.add('robot-despega');
                    var humo = setInterval(function () {
                        if (!lz) return;
                        var r = lz.getBoundingClientRect();
                        for (var k = 0; k < 2; k++) {
                            var h = doc.createElement('span');
                            h.className = 'lab-humo';
                            h.style.left = Math.round(r.left + r.width * (0.3 + Math.random() * 0.4)) + 'px';
                            h.style.top = Math.round(Math.min(global.innerHeight - 40, r.bottom)) + 'px';
                            capa.appendChild(h);
                            setTimeout(function (el) { return function () { el.remove(); }; }(h), 1400);
                        }
                    }, 120);
                    sonar('acierto');
                    return esperar(1900).then(function () { clearInterval(humo); });
                })
                .then(function () {
                    doc.body.classList.remove('lab-temblor');
                    self.fuegosArtificiales();
                    return esperar(1800);
                });
        },

        fuegosArtificiales: function () {
            if (reducido()) return;
            var colores = ['#ffd43b', '#ff6b6b', '#4dabf7', '#69db7c', '#e599f7', '#ffa94d'];
            for (var k = 0; k < 6; k++) {
                (function (k) {
                    setTimeout(function () {
                        var cx = global.innerWidth * (0.2 + Math.random() * 0.6);
                        var cy = global.innerHeight * (0.12 + Math.random() * 0.3);
                        var color = colores[k % colores.length];
                        for (var i = 0; i < 18; i++) {
                            var p = doc.createElement('span');
                            p.className = 'lab-fuego-artificial';
                            var ang = (i / 18) * Math.PI * 2;
                            p.style.left = cx + 'px';
                            p.style.top = cy + 'px';
                            p.style.background = color;
                            p.style.boxShadow = '0 0 10px ' + color;
                            p.style.setProperty('--dx', Math.round(Math.cos(ang) * 110) + 'px');
                            p.style.setProperty('--dy', Math.round(Math.sin(ang) * 110) + 'px');
                            capa.appendChild(p);
                            setTimeout(function (el) { return function () { el.remove(); }; }(p), 1300);
                        }
                        sonar('bote', { vol: 0.5 });
                    }, k * 260);
                })(k);
            }
        }
    };

    global.Laboratorio = Laboratorio;
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { Laboratorio.iniciar(); });
    else Laboratorio.iniciar();
})(window);
