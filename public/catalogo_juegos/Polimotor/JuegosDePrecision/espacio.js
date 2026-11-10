/**
 * espacio.js — Fondo vivo de "Juegos de precisión" (window.Espacio).
 *
 * SOLO VISUAL. Reemplaza la imagen estática Img/FONDO.png por un espacio en SVG que se
 * mueve solo (nebulosas, estrellas que titilan, galaxia, satélite, estrellas fugaces)
 * y reacciona al juego:
 *   - mover(fx, fy)      paralaje de las capas de estrellas según la posición del cohete.
 *   - estela(fx, fy, a)  humo/chispas detrás del cohete mientras se arrastra.
 *   - aro(color)         la nebulosa se tiñe del color del aro y las estrellas destellan.
 *   - error()            destello rojo y temblor de las estrellas.
 *   - llegada()          lluvia de estrellas fugaces.
 *   - nuevaRuta(i)       salto al hiperespacio corto entre recorridos.
 *   - final(cohete, o)   escena final en la misma pantalla: rizos, planeta, aterrizaje (Promise).
 *
 * No toca #escena-wrap ni las capas que mide la lógica: vive dentro de #capa-fondo y en
 * una capa propia (.esp-estela) con pointer-events:none.
 * Sin Math.random (el juego lo usa): las estrellas salen de un generador con semilla.
 */
(function (global) {
    'use strict';

    var doc = global.document;
    var NS = 'http://www.w3.org/2000/svg';
    var reducido = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);

    var COLORES = {
        azul: '#4fc3f7',
        amarillo: '#ffd54f',
        rosado: '#f48fb1',
        morado: '#ce93d8',
        verde: '#81c784',
        rojo: '#ef5350',
        naranja: '#ffa726'
    };

    var svg = null;
    var capaEstela = null;
    var ultimaEstela = null;
    var timers = [];

    // Generador con semilla: el cielo es siempre el mismo y no gasta Math.random.
    function semilla(s) {
        return function () {
            s = (s * 1664525 + 1013904223) % 4294967296;
            return s / 4294967296;
        };
    }

    function n(v) { return Math.round(v * 10) / 10; }

    function despues(fn, ms) {
        var id = setTimeout(fn, ms);
        timers.push(id);
        return id;
    }

    function estrellas(cuantas, rnd, rMin, rMax, conDestello) {
        var html = '';
        for (var i = 0; i < cuantas; i++) {
            var x = n(rnd() * 1600);
            var y = n(rnd() * 900);
            var r = n(rMin + rnd() * (rMax - rMin));
            var dur = n(1.6 + rnd() * 2.8);
            var ret = n(-rnd() * 4);
            if (conDestello && i % 4 === 0) {
                // Estrella de 4 puntas.
                var t = r * 3.2;
                html += '<path class="esp-titila" style="--d:' + dur + 's;--r:' + ret + 's" fill="#fff" d="M' + x + ' ' + n(y - t) +
                    ' Q' + x + ' ' + y + ' ' + n(x + t) + ' ' + y + ' Q' + x + ' ' + y + ' ' + x + ' ' + n(y + t) +
                    ' Q' + x + ' ' + y + ' ' + n(x - t) + ' ' + y + ' Q' + x + ' ' + y + ' ' + x + ' ' + n(y - t) + 'Z"/>';
            } else {
                html += '<circle class="esp-titila" style="--d:' + dur + 's;--r:' + ret + 's" cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#fff"/>';
            }
        }
        return html;
    }

    function rayosWarp(rnd) {
        var html = '';
        for (var i = 0; i < 70; i++) {
            var ang = rnd() * Math.PI * 2;
            var d1 = 60 + rnd() * 260;
            var d2 = d1 + 120 + rnd() * 380;
            var c = Math.cos(ang);
            var s = Math.sin(ang);
            var tono = i % 5 === 0 ? '#ffd54f' : (i % 3 === 0 ? '#80deea' : '#ffffff');
            html += '<line x1="' + n(800 + c * d1) + '" y1="' + n(450 + s * d1) + '" x2="' + n(800 + c * d2) + '" y2="' + n(450 + s * d2) +
                '" stroke="' + tono + '" stroke-width="' + n(1.5 + rnd() * 3) + '" stroke-linecap="round"/>';
        }
        return html;
    }

    function galaxia() {
        var brazos = '';
        for (var b = 0; b < 3; b++) {
            brazos += '<path d="M0 0 C40 -10 70 20 60 60 C50 95 0 110 -40 90" transform="rotate(' + (b * 120) + ')" fill="none" stroke="url(#esp-g-brazo)" stroke-width="14" stroke-linecap="round" opacity=".55"/>';
        }
        return '<g transform="translate(1180 330) scale(1 .55) rotate(-20)">' +
            '<g class="esp-galaxia">' + brazos +
            '<circle r="26" fill="url(#esp-g-nucleo)"/></g></g>';
    }

    function satelite() {
        return '<g class="esp-satelite-orbita">' +
            '<g class="esp-satelite">' +
            '<rect x="-34" y="-7" width="22" height="14" rx="2" fill="#5c9dff" stroke="#cfe3ff" stroke-width="2"/>' +
            '<rect x="12" y="-7" width="22" height="14" rx="2" fill="#5c9dff" stroke="#cfe3ff" stroke-width="2"/>' +
            '<rect x="-12" y="-11" width="24" height="22" rx="5" fill="#e0e0e0" stroke="#9e9e9e" stroke-width="2"/>' +
            '<line x1="0" y1="-11" x2="0" y2="-24" stroke="#bdbdbd" stroke-width="2"/>' +
            '<circle class="esp-led" cx="0" cy="-26" r="4" fill="#ff5252"/>' +
            '</g></g>';
    }

    function fugaces() {
        var html = '';
        var datos = [[300, 120, 0], [1100, 80, 4.5], [700, 200, 9]];
        datos.forEach(function (d, i) {
            html += '<g class="esp-fugaz" style="--r:' + d[2] + 's" transform="translate(' + d[0] + ' ' + d[1] + ') rotate(28)">' +
                '<line x1="-150" y1="0" x2="0" y2="0" stroke="url(#esp-g-fugaz)" stroke-width="4" stroke-linecap="round"/>' +
                '<circle r="4" fill="#fff"/></g>';
        });
        return html;
    }

    // Lluvia para la llegada (se dispara con la clase .lluvia).
    function lluvia(rnd) {
        var html = '';
        for (var i = 0; i < 10; i++) {
            html += '<g class="esp-lluvia" style="--r:' + n(i * 0.09) + 's" transform="translate(' + n(200 + rnd() * 1300) + ' ' + n(-40 + rnd() * 300) + ') rotate(32)">' +
                '<line x1="-120" y1="0" x2="0" y2="0" stroke="url(#esp-g-fugaz)" stroke-width="3.5" stroke-linecap="round"/>' +
                '<circle r="3.5" fill="#fff59d"/></g>';
        }
        return html;
    }

    function construir() {
        var rnd = semilla(20261110);
        return '<svg class="esp-svg" xmlns="' + NS + '" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
            '<defs>' +
            '<radialGradient id="esp-g-cielo" cx="50%" cy="45%" r="75%">' +
            '<stop offset="0" stop-color="#4a2391"/><stop offset=".55" stop-color="#2d1470"/><stop offset="1" stop-color="#150843"/></radialGradient>' +
            '<radialGradient id="esp-g-neb1"><stop offset="0" stop-color="#ff7ac6" stop-opacity=".55"/><stop offset="1" stop-color="#ff7ac6" stop-opacity="0"/></radialGradient>' +
            '<radialGradient id="esp-g-neb2"><stop offset="0" stop-color="#5ad1ff" stop-opacity=".45"/><stop offset="1" stop-color="#5ad1ff" stop-opacity="0"/></radialGradient>' +
            '<radialGradient id="esp-g-neb3"><stop offset="0" stop-color="#9b6bff" stop-opacity=".6"/><stop offset="1" stop-color="#9b6bff" stop-opacity="0"/></radialGradient>' +
            // El color del tinte va por CSS (var(--tinte)): los atributos SVG no leen variables.
            '<radialGradient id="esp-g-tinte"><stop class="esp-tinte-stop" offset="0" stop-opacity=".7"/><stop class="esp-tinte-stop" offset="1" stop-opacity="0"/></radialGradient>' +
            '<radialGradient id="esp-g-nucleo"><stop offset="0" stop-color="#fffde7"/><stop offset=".4" stop-color="#ffe082" stop-opacity=".9"/><stop offset="1" stop-color="#ffb74d" stop-opacity="0"/></radialGradient>' +
            '<linearGradient id="esp-g-brazo"><stop offset="0" stop-color="#fff3c4"/><stop offset="1" stop-color="#b39ddb" stop-opacity="0"/></linearGradient>' +
            '<linearGradient id="esp-g-fugaz"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>' +
            '</defs>' +
            '<rect width="1600" height="900" fill="url(#esp-g-cielo)"/>' +
            '<g class="esp-capa esp-capa-1">' +
            '<ellipse class="esp-nebula esp-nebula-a" cx="330" cy="640" rx="520" ry="300" fill="url(#esp-g-neb1)"/>' +
            '<ellipse class="esp-nebula esp-nebula-b" cx="1250" cy="200" rx="560" ry="280" fill="url(#esp-g-neb2)"/>' +
            '<ellipse class="esp-nebula esp-nebula-c" cx="900" cy="560" rx="600" ry="330" fill="url(#esp-g-neb3)"/>' +
            estrellas(90, rnd, 0.8, 1.6, false) +
            '</g>' +
            '<ellipse class="esp-tinte" cx="800" cy="450" rx="900" ry="560" fill="url(#esp-g-tinte)"/>' +
            '<g class="esp-capa esp-capa-2">' + galaxia() + estrellas(55, rnd, 1.4, 2.4, true) + '</g>' +
            '<g class="esp-capa esp-capa-3">' + estrellas(26, rnd, 2.2, 3.4, true) + satelite() + '</g>' +
            fugaces() +
            '<g class="esp-lluvias">' + lluvia(rnd) + '</g>' +
            '<g class="esp-warp">' + rayosWarp(rnd) + '</g>' +
            '<rect class="esp-alerta" width="1600" height="900" fill="#ff1744"/>' +
            '</svg>';
    }

    function reiniciarClase(el, clase) {
        if (!el) return;
        el.classList.remove(clase);
        // Forzar reflow para que la animación vuelva a empezar.
        void el.getBoundingClientRect();
        el.classList.add(clase);
    }

    /* ── Escena final: llegada al planeta ───────────────────── */

    function sonar(evento) {
        var A = global.PedniaAudio;
        if (A && A.activo && A.tieneTema()) A.evento(evento);
    }

    function fxp() {
        var F = global.PedniaFx;
        return (F && F.activo) ? F : null;
    }

    function planetaSvg() {
        return '<svg viewBox="-40 -40 280 280" aria-hidden="true">' +
            '<defs>' +
            '<radialGradient id="esp-g-planeta" cx="38%" cy="30%" r="75%">' +
            '<stop offset="0" stop-color="#9ff0c4"/><stop offset=".55" stop-color="#38c79a"/><stop offset="1" stop-color="#16795f"/></radialGradient>' +
            '<radialGradient id="esp-g-aura"><stop offset=".6" stop-color="#b9fbe0" stop-opacity=".5"/><stop offset="1" stop-color="#b9fbe0" stop-opacity="0"/></radialGradient>' +
            '</defs>' +
            '<circle cx="100" cy="100" r="135" fill="url(#esp-g-aura)"/>' +
            // Anillo de atrás.
            '<path d="M-30 112 A130 30 0 0 1 230 112" fill="none" stroke="#ffd54f" stroke-width="10" opacity=".75"/>' +
            '<circle cx="100" cy="100" r="96" fill="url(#esp-g-planeta)"/>' +
            '<ellipse cx="62" cy="70" rx="16" ry="11" fill="#2aa57f" opacity=".7"/>' +
            '<ellipse cx="128" cy="58" rx="10" ry="7" fill="#2aa57f" opacity=".7"/>' +
            '<ellipse cx="140" cy="120" rx="20" ry="13" fill="#2aa57f" opacity=".6"/>' +
            '<ellipse cx="78" cy="140" rx="12" ry="8" fill="#2aa57f" opacity=".6"/>' +
            // Anillo de adelante.
            '<path d="M230 112 A130 30 0 0 1 -30 112" fill="none" stroke="#ffb300" stroke-width="10"/>' +
            // Bandera (aparece al aterrizar), clavada en la superficie junto al cohete.
            '<g class="esp-bandera" transform="translate(138 15)">' +
            '<line x1="0" y1="0" x2="0" y2="-38" stroke="#eceff1" stroke-width="3" stroke-linecap="round"/>' +
            '<path class="esp-bandera-tela" d="M1 -38 L30 -31 L1 -23 Z" fill="#ff5c8a"/>' +
            '<text x="9" y="-27" font-size="9" fill="#fff">★</text>' +
            '</g>' +
            '</svg>';
    }

    // Vuelo final sin salir de la pantalla: arranca donde quedó el cohete y con su mismo
    // rumbo, da un rizo a la izquierda y otro a la derecha, y llega desde la derecha a
    // flotar sobre la cima del planeta. Devuelve el path y el rumbo final (grados).
    function rutaVuelo(W, H, inicio, rumbo, flotar) {
        var m = Math.min(W, H);
        var r = m * 0.12;
        var cy = H * 0.34;
        var cx1 = W * 0.3;
        var cx2 = W * 0.7;
        var rad = rumbo * Math.PI / 180;
        // 0° = la punta mira arriba → dirección (sen, -cos).
        var dx = Math.sin(rad);
        var dy = -Math.cos(rad);
        var tramo = m * 0.3;
        var c2 = { x: flotar.x + W * 0.2, y: flotar.y };
        var d = 'M' + n(inicio.x) + ' ' + n(inicio.y) +
            ' C' + n(inicio.x + dx * tramo) + ' ' + n(inicio.y + dy * tramo) + ' ' + n(cx1 - r * 1.4) + ' ' + n(cy + r) +
            ' ' + n(cx1) + ' ' + n(cy + r) +
            ' A' + n(r) + ' ' + n(r) + ' 0 0 0 ' + n(cx1) + ' ' + n(cy - r) +
            ' A' + n(r) + ' ' + n(r) + ' 0 0 0 ' + n(cx1) + ' ' + n(cy + r) +
            ' L' + n(cx2) + ' ' + n(cy + r) +
            ' A' + n(r) + ' ' + n(r) + ' 0 0 0 ' + n(cx2) + ' ' + n(cy - r) +
            ' A' + n(r) + ' ' + n(r) + ' 0 0 0 ' + n(cx2) + ' ' + n(cy + r) +
            ' C' + n(cx2 + r * 1.8) + ' ' + n(cy + r) + ' ' + n(c2.x) + ' ' + n(c2.y) +
            ' ' + n(flotar.x) + ' ' + n(flotar.y);
        // Rumbo del último tramo (de c2 a flotar), en el sistema de atan2 (0 = derecha).
        var fin = Math.atan2(flotar.y - c2.y, flotar.x - c2.x) * 180 / Math.PI;
        return { d: d, fin: fin };
    }

    function llegadaPlaneta(cohete, opts, resolve) {
        var W = global.innerWidth;
        var H = global.innerHeight;
        var m = Math.min(W, H);
        var R = m * 0.36;
        var centro = { x: W / 2, y: H + R * 0.45 };
        var cima = centro.y - R;
        var anchoCohete = cohete ? cohete.offsetWidth : 70;
        var altoCohete = cohete ? cohete.offsetHeight : anchoCohete * 1.36;

        var capa = doc.createElement('div');
        capa.className = 'esp-escena';
        capa.setAttribute('aria-hidden', 'true');
        doc.body.appendChild(capa);

        // 1. La nave toma el lugar exacto del cohete del juego (mismo sitio, tamaño y giro).
        var rc = cohete ? cohete.getBoundingClientRect() : null;
        var inicio = rc ? { x: rc.left + rc.width / 2, y: rc.top + rc.height / 2 } : { x: W * 0.15, y: H * 0.5 };
        var rumbo = cohete ? (Number(cohete.dataset.ang) || 90) : 90;
        var aterriza = { x: centro.x, y: cima - altoCohete * 0.36 };
        var flotar = { x: aterriza.x, y: aterriza.y - H * 0.16 };
        var nave = doc.createElement('div');
        nave.className = 'esp-nave';
        nave.style.width = n(anchoCohete) + 'px';
        nave.style.height = n(altoCohete) + 'px';
        nave.innerHTML = '<div class="esp-nave-cuerpo"><img src="' + (opts.imgVuelo || opts.imgCohete || '') + '" alt=""></div>';
        var conRuta = !!(global.CSS && CSS.supports && CSS.supports('offset-path', 'path("M0 0 L1 1")'));
        if (conRuta) {
            var ruta = rutaVuelo(W, H, inicio, rumbo, flotar);
            nave.style.offsetPath = 'path("' + ruta.d + '")';
            // offset-rotate gira la nave (rumbo + 90°): el cuerpo compensa para quedar de pie.
            var enderezar = -(ruta.fin + 90);
            enderezar = ((enderezar % 360) + 540) % 360 - 180;
            nave.style.setProperty('--enderezar', n(enderezar) + 'deg');
        } else {
            nave.classList.add('sin-ruta');
            nave.style.left = n(flotar.x) + 'px';
            nave.style.top = n(flotar.y) + 'px';
        }
        capa.appendChild(nave);
        if (cohete) cohete.style.visibility = 'hidden';

        despues(function () {
            nave.classList.add('vuela');
            sonar('regreso');
        }, 40);

        // 2. Mientras da vueltas, sube el planeta.
        var planeta = doc.createElement('div');
        planeta.className = 'esp-planeta';
        planeta.style.width = n(R * 2 * 1.4) + 'px';
        planeta.style.height = n(R * 2 * 1.4) + 'px';
        planeta.style.left = n(centro.x - R * 1.4) + 'px';
        planeta.style.top = n(centro.y - R * 1.4) + 'px';
        planeta.innerHTML = planetaSvg();
        despues(function () {
            capa.insertBefore(planeta, nave);
            sonar('aparece');
        }, 1600);

        // 3. Se endereza y baja despacio sobre la cima.
        despues(function () {
            nave.style.setProperty('--baja', n(aterriza.y - flotar.y) + 'px');
            nave.classList.add('aterriza');
        }, 4000);

        // 4. Toca el suelo: se apaga el motor (cohete sin llama), polvo, bandera y rebote.
        despues(function () {
            nave.classList.add('en-suelo');
            var img = nave.querySelector('img');
            if (img && opts.imgCohete) img.src = opts.imgCohete;
            planeta.classList.add('rebota', 'con-bandera');
            sonar('bote');
            polvo(capa, aterriza.x, cima);
        }, 5000);

        // 5. Constelación con las estrellas ganadas.
        var cuantas = Math.max(3, Math.min(8, Number(opts.estrellas) || 5));
        var puntos = [];
        for (var i = 0; i < cuantas; i++) {
            // Arco sobre el planeta, sin bajar hasta las esquinas (ahí están los botones).
            var ang = (-142 + (104 * i) / (cuantas - 1)) * Math.PI / 180;
            puntos.push({ x: centro.x + Math.cos(ang) * R * 1.75, y: centro.y + Math.sin(ang) * R * 1.75 });
        }
        var tamEstrella = Math.max(34, m * 0.075);
        var lineas = doc.createElementNS(NS, 'svg');
        lineas.setAttribute('class', 'esp-constelacion');
        lineas.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
        var poli = doc.createElementNS(NS, 'polyline');
        poli.setAttribute('points', puntos.map(function (p) { return n(p.x) + ',' + n(p.y); }).join(' '));
        var largo = 0;
        for (var k = 1; k < puntos.length; k++) {
            largo += Math.hypot(puntos[k].x - puntos[k - 1].x, puntos[k].y - puntos[k - 1].y);
        }
        poli.style.setProperty('--largo', n(largo));
        lineas.appendChild(poli);
        capa.appendChild(lineas);

        var inicioEstrellas = 5300;
        puntos.forEach(function (p, idx) {
            despues(function () {
                var e = doc.createElement('img');
                e.className = 'esp-estrella-final';
                e.src = opts.imgEstrella || '';
                e.alt = '';
                e.style.width = n(tamEstrella) + 'px';
                e.style.height = n(tamEstrella) + 'px';
                e.style.left = n(p.x) + 'px';
                e.style.top = n(p.y) + 'px';
                // Sale desde el cohete hasta su sitio.
                e.style.setProperty('--dx', n(aterriza.x - p.x) + 'px');
                e.style.setProperty('--dy', n(aterriza.y - p.y) + 'px');
                capa.appendChild(e);
                sonar('tic');
            }, inicioEstrellas + idx * 260);
        });
        despues(function () { lineas.classList.add('dibuja'); }, inicioEstrellas + 200);

        // 6. Letrero y fuegos artificiales.
        var finEstrellas = inicioEstrellas + cuantas * 260 + 250;
        despues(function () {
            var letrero = doc.createElement('div');
            letrero.className = 'esp-letrero';
            letrero.textContent = opts.texto || '¡Misión cumplida!';
            capa.appendChild(letrero);
            sonar('correcto');
            planeta.classList.add('fiesta');
            var colores = ['#ffd54f', '#f48fb1', '#4fc3f7', '#ce93d8', '#81c784'];
            [[0.2, 0.3], [0.8, 0.28], [0.5, 0.16], [0.3, 0.5], [0.72, 0.52]].forEach(function (f, j) {
                despues(function () {
                    if (fxp()) fxp().estallido(W * f[0], H * f[1], colores[j % colores.length], 22);
                }, j * 260);
            });
        }, finEstrellas);

        despues(function () {
            // La escena queda quieta debajo de la cortina de victoria (sin fundido a vacío).
            resolve();
            despues(function () { capa.remove(); }, 2500);
        }, finEstrellas + 2600);
    }

    function polvo(capa, x, y) {
        for (var i = 0; i < 8; i++) {
            var p = doc.createElement('span');
            p.className = 'esp-polvo';
            p.style.left = n(x) + 'px';
            p.style.top = n(y) + 'px';
            p.style.setProperty('--dx', n((i - 3.5) * 22) + 'px');
            p.style.setProperty('--dy', n(-10 - (i % 3) * 8) + 'px');
            capa.appendChild(p);
        }
    }

    var Espacio = {
        activo: true,

        // Pone el espacio dentro de #capa-fondo y crea la capa de la estela.
        montar: function (capaFondo) {
            if (!capaFondo) return;
            capaFondo.style.backgroundImage = 'none';
            if (!svg || !svg.isConnected) {
                capaFondo.innerHTML = construir();
                svg = capaFondo.querySelector('.esp-svg');
            }
            var wrap = capaFondo.parentNode;
            if (wrap && (!capaEstela || !capaEstela.isConnected)) {
                capaEstela = doc.createElement('div');
                capaEstela.className = 'esp-estela';
                capaEstela.setAttribute('aria-hidden', 'true');
                wrap.insertBefore(capaEstela, capaFondo.nextSibling);
            }
            doc.body.classList.add('esp-activo');
        },

        // Paralaje: las capas cercanas se mueven más, al revés del cohete.
        mover: function (fx, fy) {
            if (!svg || reducido) return;
            svg.style.setProperty('--px', n((0.5 - fx) * 2));
            svg.style.setProperty('--py', n((0.5 - fy) * 2));
        },

        // Humo detrás del cohete (ang en grados, 0 = la punta mira arriba).
        estela: function (fx, fy, ang, cohete) {
            if (!capaEstela || reducido) return;
            var w = capaEstela.clientWidth;
            var h = capaEstela.clientHeight;
            if (!w || !h) return;
            var x = fx * w;
            var y = fy * h;
            if (ultimaEstela) {
                var dx = x - ultimaEstela.x;
                var dy = y - ultimaEstela.y;
                if (dx * dx + dy * dy < 110) return;
            }
            ultimaEstela = { x: x, y: y };
            var largo = cohete ? cohete.offsetHeight * 0.5 : 40;
            var rad = (Number(ang) || 0) * Math.PI / 180;
            // Detrás de la cola: sentido contrario a la punta.
            x -= Math.sin(rad) * largo;
            y += Math.cos(rad) * largo;
            if (capaEstela.childElementCount > 40) capaEstela.firstChild.remove();
            var p = doc.createElement('span');
            var chispa = capaEstela.childElementCount % 3 === 0;
            p.className = chispa ? 'esp-chispa' : 'esp-humo';
            p.style.left = n(x) + 'px';
            p.style.top = n(y) + 'px';
            p.addEventListener('animationend', function () { p.remove(); });
            capaEstela.appendChild(p);
        },

        soltar: function () {
            ultimaEstela = null;
        },

        aro: function (color) {
            if (!svg) return;
            svg.style.setProperty('--tinte', COLORES[String(color || '').toLowerCase()] || '#ffd54f');
            reiniciarClase(svg, 'tinte');
            despues(function () { if (svg) svg.classList.remove('tinte'); }, 1200);
        },

        error: function () {
            if (!svg) return;
            reiniciarClase(svg, 'alerta');
            despues(function () { if (svg) svg.classList.remove('alerta'); }, 700);
        },

        llegada: function () {
            if (!svg) return;
            reiniciarClase(svg, 'lluvia');
            despues(function () { if (svg) svg.classList.remove('lluvia'); }, 1800);
        },

        // Salto corto al hiperespacio cuando empieza un recorrido nuevo (no el primero).
        nuevaRuta: function (indice) {
            if (!svg) return;
            if (capaEstela) capaEstela.innerHTML = '';
            ultimaEstela = null;
            svg.style.setProperty('--px', 0);
            svg.style.setProperty('--py', 0);
            if (!indice || reducido) return;
            reiniciarClase(svg, 'salto');
            despues(function () { if (svg) svg.classList.remove('salto'); }, 900);
        },

        /**
         * Escena final (antes de la cortina de victoria), sin cambiar de pantalla:
         *   1. El cohete sigue en pantalla y da dos rizos mientras se esconden los aros.
         *   2. Sube un planeta de fiesta y el cohete aterriza de pie en la cima (polvo, bandera).
         *   3. Las estrellas ganadas (una por recorrido) forman una constelación sobre el
         *      planeta, aparece el letrero y hay fuegos artificiales.
         * opts: { estrellas, imgVuelo, imgCohete, imgEstrella, texto }. Resuelve al terminar.
         */
        final: function (cohete, opts) {
            opts = opts || {};
            return new Promise(function (resolve) {
                if (!svg || reducido) { resolve(); return; }
                // Todo en la misma pantalla: se esconden aros y estrella mientras el cohete
                // da vueltas, sube el planeta y el cohete aterriza en él.
                doc.body.classList.add('esp-final');
                if (capaEstela) capaEstela.innerHTML = '';
                svg.style.setProperty('--px', 0);
                svg.style.setProperty('--py', 0);
                llegadaPlaneta(cohete, opts, resolve);
            });
        },

        limpiar: function () {
            timers.forEach(clearTimeout);
            timers = [];
        }
    };

    global.Espacio = Espacio;
})(window);
