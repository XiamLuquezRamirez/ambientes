/**
 * Encuentra el Sonido — portada propia de cada juego.
 *
 * La tarjeta de inicio (.inicio-parque) era igual en los 10 juegos: un parque con perro,
 * carro y pájaro. Aquí cada juego dibuja su propio escenario (el mismo de su juego) y
 * muestra sus propios elementos. El juego se elige con data-portada en .inicio-parque.
 * Las imágenes son las de la carpeta img/ de cada juego.
 */
(function () {
    'use strict';

    var CIELO = '<defs><linearGradient id="ptCielo" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#74c0fc"/><stop offset="1" stop-color="#d0ebff"/></linearGradient></defs>' +
        '<rect width="800" height="470" fill="url(#ptCielo)"/>';

    function nube(x, y, s, lenta) {
        return '<g class="pt-nube' + (lenta ? ' lenta' : '') + '" style="animation-delay:-' + (x / 60).toFixed(1) + 's">' +
            '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')" fill="#fff">' +
            '<circle cx="-26" cy="6" r="18"/><circle cx="0" cy="-6" r="26"/><circle cx="26" cy="6" r="17"/></g></g>';
    }

    function banderines(y, desfase) {
        var colores = ['#ff6b6b', '#fcc419', '#51cf66', '#339af0', '#cc5de8', '#ff922b'];
        var out = '<path d="M0 ' + y + ' Q200 ' + (y + 26) + ' 400 ' + y + ' T800 ' + y + '" stroke="#495057" stroke-width="2" fill="none"/>';
        for (var i = 0; i < 24; i++) {
            var x = i * 34 + (desfase || 0);
            var yy = y + Math.sin((x / 800) * Math.PI * 2) * 12 + 6;
            out += '<path class="pt-ondea" d="M' + x + ' ' + yy + ' l22 0 l-11 22z" fill="' + colores[(i + (desfase ? 2 : 0)) % 6] + '"/>';
        }
        return out;
    }

    function notas(x, y) {
        return '<g fill="#f59f00" font-family="Arial" font-size="34" font-weight="bold">' +
            '<text class="pt-nota" x="' + x + '" y="' + y + '">♪</text>' +
            '<text class="pt-nota" x="' + (x + 30) + '" y="' + (y + 10) + '" style="animation-delay:-0.9s">♫</text>' +
            '<text class="pt-nota" x="' + (x - 24) + '" y="' + (y + 18) + '" style="animation-delay:-1.7s">♪</text></g>';
    }

    var PORTADAS = {
        /* ¿Dónde está el perro? — la calle de las casitas ("Toc, toc"). */
        calle: {
            fondo: '#a5d8ff',
            svg: CIELO + nube(150, 70, 1) + nube(560, 50, 0.8, true) +
                '<ellipse cx="200" cy="330" rx="420" ry="90" fill="#8ce99a"/><ellipse cx="640" cy="330" rx="400" ry="80" fill="#b2f2bb"/>' +
                [[60, '#ffa8a8', '#c92a2a'], [300, '#ffd8a8', '#e8590c'], [540, '#a5d8ff', '#1971c2']].map(function (c) {
                    var x = c[0];
                    return '<rect x="' + x + '" y="190" width="200" height="170" fill="' + c[1] + '"/>' +
                        '<path d="M' + (x - 14) + ' 192 L' + (x + 100) + ' 110 L' + (x + 214) + ' 192z" fill="' + c[2] + '"/>' +
                        '<rect x="' + (x + 24) + '" y="250" width="70" height="110" rx="6" fill="#5c3d1e"/>' +
                        '<circle cx="' + (x + 84) + '" cy="305" r="5" fill="#fcc419"/>' +
                        '<rect x="' + (x + 118) + '" y="220" width="56" height="52" rx="4" fill="#fff9db" stroke="#fff" stroke-width="5"/>';
                }).join('') +
                '<rect y="358" width="800" height="22" fill="#dee2e6"/><rect y="380" width="800" height="90" fill="#495057"/>' +
                '<g fill="#fff">' + [20, 140, 260, 380, 500, 620, 740].map(function (x) { return '<rect x="' + x + '" y="420" width="70" height="8"/>'; }).join('') + '</g>',
            items: [
                { src: 'img/perro.png', x: 18.5, y: 24, w: 15, anim: 'pt-salta' },
                { src: 'img/carro.png', x: 50, y: 6, w: 22, anim: 'pt-pasa' },
                { src: 'img/pajaro.svg', x: 82, y: 30, w: 11, anim: 'pt-mece' }
            ]
        },

        /* ¿Dónde está el pájaro? — el árbol de los nidos. */
        arbol: {
            svg: CIELO + nube(120, 60, 0.9) + nube(620, 80, 1, true) +
                '<ellipse cx="200" cy="400" rx="460" ry="120" fill="#8ce99a"/><rect y="390" width="800" height="80" fill="#69db7c"/>' +
                '<rect x="370" y="210" width="60" height="200" rx="16" fill="#8d5524"/>' +
                '<path d="M400 290 L300 230 M400 270 L520 210" stroke="#8d5524" stroke-width="18" stroke-linecap="round"/>' +
                '<g fill="#40c057"><circle cx="400" cy="150" r="120"/><circle cx="270" cy="200" r="80"/><circle cx="530" cy="190" r="85"/></g>' +
                '<g fill="#51cf66"><circle cx="350" cy="120" r="60"/><circle cx="470" cy="140" r="55"/></g>' +
                '<g fill="#a9713c"><ellipse cx="300" cy="232" rx="34" ry="14"/><ellipse cx="518" cy="212" rx="34" ry="14"/></g>' +
                '<g fill="#ff8787"><circle cx="330" cy="170" r="8"/><circle cx="450" cy="100" r="8"/><circle cx="560" cy="160" r="8"/></g>',
            items: [
                { src: 'img/pajaro.svg', x: 65, y: 52, w: 12, anim: 'pt-mece' },
                { src: 'img/perro.png', x: 16, y: 6, w: 15, anim: 'pt-salta' },
                { src: 'img/bicicleta.svg', x: 84, y: 6, w: 17, anim: 'pt-flota' }
            ]
        },

        /* Encuentra la trompeta — el desfile en la plaza. */
        desfile: {
            svg: CIELO +
                [['#ffc9c9', 0, 150], ['#ffe8cc', 130, 120], ['#d3f9d8', 260, 160], ['#d0ebff', 390, 130], ['#e5dbff', 520, 170], ['#fff3bf', 650, 140]].map(function (c) {
                    var x = c[1];
                    var top = 300 - c[2];
                    var v = '';
                    for (var r = top + 25; r < 270; r += 50) v += '<rect x="' + (x + 25) + '" y="' + r + '" width="28" height="30" rx="4" fill="#74c0fc"/><rect x="' + (x + 78) + '" y="' + r + '" width="28" height="30" rx="4" fill="#74c0fc"/>';
                    return '<rect x="' + x + '" y="' + top + '" width="131" height="' + (c[2] + 10) + '" fill="' + c[0] + '"/><rect x="' + (x - 2) + '" y="' + (top - 10) + '" width="135" height="12" fill="#c0603a"/>' + v;
                }).join('') +
                banderines(40) + banderines(100, 17) +
                '<g fill="#e8590c">' + [20, 70, 120, 170, 220, 570, 620, 670, 720, 770].map(function (x, i) { return '<ellipse cx="' + x + '" cy="296" rx="14" ry="18" fill="' + ['#ff6b6b', '#fcc419', '#51cf66', '#339af0', '#cc5de8'][i % 5] + '"/><circle cx="' + x + '" cy="270" r="10" fill="#f1c27d"/>'; }).join('') + '</g>' +
                '<rect y="310" width="800" height="160" fill="#adb5bd"/><g fill="#fff">' + [10, 110, 210, 310, 410, 510, 610, 710].map(function (x) { return '<rect x="' + x + '" y="388" width="50" height="7"/>'; }).join('') + '</g>' +
                '<g><rect x="290" y="355" width="220" height="50" rx="10" fill="#e64980"/>' +
                '<g fill="#fff">' + [0, 1, 2, 3, 4, 5, 6, 7].map(function (k) { return '<path d="M' + (290 + k * 27.5) + ' 400 l27.5 0 l-13.75 18z" fill="' + (k % 2 ? '#ffd43b' : '#fff') + '"/>'; }).join('') + '</g>' +
                '<circle cx="335" cy="425" r="18" fill="#343a40"/><circle cx="465" cy="425" r="18" fill="#343a40"/>' +
                '<rect x="300" y="250" width="4" height="105" fill="#495057"/><path class="pt-ondea" d="M304 252 l40 12 l-40 12z" fill="#339af0"/></g>' +
                notas(470, 250),
            items: [
                { src: 'img/trompeta.svg', x: 50, y: 13, w: 20, anim: 'pt-salta' },
                { src: 'img/pelota.svg', x: 13, y: 8, w: 12, anim: 'pt-salta' },
                { src: 'img/gato.png', x: 86, y: 6, w: 13, anim: 'pt-mece' }
            ]
        },

        /* El sonido de la lluvia — ¿qué tiempo hace? */
        clima: {
            svg: CIELO +
                '<circle cx="110" cy="80" r="44" fill="#ffd43b"/>' +
                '<g fill="#868e96"><circle cx="560" cy="80" r="40"/><circle cx="610" cy="66" r="50"/><circle cx="665" cy="84" r="38"/></g>' +
                '<g stroke="#4dabf7" stroke-width="4" stroke-linecap="round">' + [540, 570, 600, 630, 660, 690].map(function (x, i) { return '<line class="pt-gota" style="animation-delay:-' + (i * 0.15).toFixed(2) + 's" x1="' + x + '" y1="130" x2="' + (x - 6) + '" y2="152"/>'; }).join('') + '</g>' +
                '<ellipse cx="200" cy="330" rx="430" ry="90" fill="#8ce99a"/><rect y="320" width="800" height="150" fill="#51cf66"/>' +
                '<path d="M360 320 L420 320 L520 470 L280 470z" fill="#e9d8a6"/>' +
                '<ellipse cx="680" cy="370" rx="110" ry="30" fill="#339af0"/><ellipse cx="660" cy="362" rx="60" ry="12" fill="#74c0fc"/>' +
                '<g><ellipse cx="660" cy="362" rx="20" ry="13" fill="#ffd43b"/><circle cx="674" cy="348" r="9" fill="#ffd43b"/><path d="M682 346 l10 3 l-10 4z" fill="#ff922b"/></g>',
            items: [
                { src: 'img/paraguas_abierto.svg', x: 22, y: 12, w: 20, anim: 'pt-mece' },
                { src: 'img/pelota.svg', x: 52, y: 6, w: 12, anim: 'pt-salta' },
                { src: 'img/arbol.svg', x: 80, y: 30, w: 15, anim: 'pt-mece' }
            ]
        },

        /* Encuentra el sonido — el tren de los sonidos. */
        tren: {
            svg: CIELO + nube(150, 60, 0.9) + nube(520, 50, 1, true) +
                '<ellipse cx="220" cy="300" rx="420" ry="90" fill="#8ce99a"/><ellipse cx="660" cy="300" rx="380" ry="70" fill="#69db7c"/>' +
                '<rect y="290" width="800" height="180" fill="#69db7c"/>' +
                '<rect y="300" width="800" height="10" fill="#868e96"/><g fill="#8d5524">' + Array.apply(null, { length: 24 }).map(function (_, i) { return '<rect x="' + (i * 36) + '" y="308" width="14" height="8"/>'; }).join('') + '</g>' +
                '<rect y="322" width="800" height="148" fill="#ced4da"/><rect y="322" width="800" height="6" fill="#fcc419"/>' +
                [['#f08c00', 60], ['#2f9e44', 210], ['#1c7ed6', 360]].map(function (c) {
                    var x = c[1];
                    return '<rect x="' + x + '" y="214" width="138" height="80" rx="10" fill="' + c[0] + '"/><rect x="' + (x + 20) + '" y="226" width="98" height="42" rx="6" fill="#a5d8ff"/>' +
                        '<circle cx="' + (x + 30) + '" cy="298" r="13" fill="#212529"/><circle cx="' + (x + 108) + '" cy="298" r="13" fill="#212529"/>';
                }).join('') +
                '<rect x="510" y="200" width="100" height="94" rx="10" fill="#343a40"/><rect x="600" y="230" width="90" height="64" fill="#e03131"/>' +
                '<rect x="630" y="170" width="24" height="60" fill="#343a40"/><circle cx="690" cy="262" r="10" fill="#fcc419"/>' +
                '<rect x="526" y="214" width="56" height="36" rx="5" fill="#a5d8ff"/>' +
                '<circle cx="540" cy="298" r="15" fill="#212529"/><circle cx="590" cy="298" r="15" fill="#212529"/><circle cx="650" cy="298" r="15" fill="#212529"/>' +
                '<g fill="#f1f3f5"><circle class="pt-humo" cx="642" cy="160" r="14"/><circle class="pt-humo" style="animation-delay:-0.8s" cx="642" cy="160" r="14"/><circle class="pt-humo" style="animation-delay:-1.6s" cx="642" cy="160" r="14"/></g>',
            items: [
                { src: 'img/gato.png', x: 24, y: 12, w: 14, anim: 'pt-salta' },
                { src: 'img/carro.png', x: 76, y: 10, w: 18, anim: 'pt-flota' },
                { src: 'img/trompeta.svg', x: 52, y: 44, w: 13, anim: 'pt-mece' }
            ]
        },

        /* Localiza el sonido — linterna en la noche. */
        linterna: {
            fondo: '#15224a',
            svg: '<rect width="800" height="470" fill="#15224a"/>' +
                '<g fill="#fff">' + [[60, 40], [180, 90], [300, 30], [420, 70], [520, 25], [640, 60], [740, 100], [250, 140], [690, 160]].map(function (p, i) { return '<circle class="pt-titila" style="animation-delay:-' + (i * 0.3).toFixed(1) + 's" cx="' + p[0] + '" cy="' + p[1] + '" r="2.5"/>'; }).join('') + '</g>' +
                '<circle cx="110" cy="80" r="40" fill="#fff3bf"/><circle cx="128" cy="70" r="36" fill="#15224a"/>' +
                '<g fill="#3d3420">' + Array.apply(null, { length: 18 }).map(function (_, i) { return '<path d="M' + (i * 46 + 4) + ' 270 l30 0 l0 -50 l-15 -16 l-15 16z"/>'; }).join('') + '</g>' +
                '<rect y="270" width="800" height="200" fill="#1b4332"/>' +
                '<path class="pt-haz" d="M120 420 L600 300 L600 460 z" fill="#fff3bf" opacity="0.35"/>' +
                '<rect x="80" y="400" width="70" height="34" rx="10" fill="#495057" transform="rotate(-14 115 417)"/>',
            items: [
                { src: 'img/pandereta.svg', x: 70, y: 18, w: 15, anim: 'pt-mece' },
                { src: 'img/perro.png', x: 40, y: 22, w: 12, anim: '', oscuro: true },
                { src: 'img/gato.png', x: 90, y: 30, w: 10, anim: '', oscuro: true }
            ]
        },

        /* Sonidos en diferentes lugares — el castillo de las 4 ventanas. */
        castillo: {
            svg: CIELO + nube(140, 60, 0.9) + nube(600, 50, 0.8, true) +
                '<rect y="400" width="800" height="70" fill="#51cf66"/><rect x="150" y="398" width="500" height="18" fill="#339af0"/>' +
                '<rect x="260" y="230" width="280" height="170" fill="#ced4da"/>' +
                '<g fill="#ced4da">' + [0, 1, 2, 3, 4, 5, 6].map(function (k) { return '<rect x="' + (262 + k * 40) + '" y="212" width="22" height="20"/>'; }).join('') + '</g>' +
                '<rect x="170" y="150" width="110" height="250" fill="#ced4da"/><rect x="520" y="150" width="110" height="250" fill="#ced4da"/>' +
                '<path d="M160 152 L225 70 L290 152z" fill="#e03131"/><path d="M510 152 L575 70 L640 152z" fill="#e03131"/>' +
                '<rect x="222" y="40" width="4" height="34" fill="#495057"/><path class="pt-ondea" d="M226 42 l30 9 l-30 9z" fill="#1c7ed6"/>' +
                '<rect x="572" y="40" width="4" height="34" fill="#495057"/><path class="pt-ondea" d="M576 42 l30 9 l-30 9z" fill="#f59f00"/>' +
                '<g fill="#343a40" stroke="#868e96" stroke-width="5">' +
                '<path d="M195 270 v-50 a30 30 0 0 1 60 0 v50z"/><path d="M545 270 v-50 a30 30 0 0 1 60 0 v50z"/>' +
                '<path d="M290 380 v-45 a28 28 0 0 1 56 0 v45z"/><path d="M454 380 v-45 a28 28 0 0 1 56 0 v45z"/></g>' +
                '<path d="M370 400 v-56 a30 30 0 0 1 60 0 v56z" fill="#8d5524"/>',
            items: [
                { src: 'img/campana.svg', x: 28, y: 43, w: 7, anim: 'pt-mece' },
                { src: 'img/tambor.svg', x: 72, y: 43, w: 7, anim: 'pt-flota' },
                { src: 'img/trompeta.svg', x: 39.5, y: 19.5, w: 7, anim: '' },
                { src: 'img/triangulo.svg', x: 60, y: 19.5, w: 6, anim: 'pt-mece' }
            ]
        },

        /* Entre distractores — la orquesta. */
        orquesta: {
            fondo: '#3b1726',
            svg: '<rect width="800" height="470" fill="#3b1726"/>' +
                '<g fill="#4a1d31">' + Array.apply(null, { length: 14 }).map(function (_, i) { return '<rect x="' + (i * 60) + '" y="0" width="30" height="330"/>'; }).join('') + '</g>' +
                '<ellipse cx="400" cy="400" rx="380" ry="40" fill="#fff3bf" opacity="0.18"/>' +
                '<rect y="400" width="800" height="70" fill="#b5651d"/><g fill="#9c5518">' + [415, 432, 449].map(function (y) { return '<rect y="' + y + '" width="800" height="3"/>'; }).join('') + '</g>' +
                '<rect width="800" height="34" fill="#c92a2a"/><g fill="#c92a2a">' + Array.apply(null, { length: 20 }).map(function (_, i) { return '<path d="M' + (i * 40) + ' 34 l40 0 l-20 16z"/>'; }).join('') + '</g>' +
                '<path d="M0 0 h90 q-20 230 30 470 h-120z" fill="#c92a2a"/><path d="M800 0 h-90 q20 230 -30 470 h120z" fill="#c92a2a"/>' +
                '<g fill="#212529">' + [190, 330, 470, 610].map(function (x) { return '<rect x="' + (x - 3) + '" y="340" width="6" height="70"/><rect x="' + (x - 40) + '" y="332" width="80" height="10"/>'; }).join('') + '</g>' +
                notas(660, 250) + notas(110, 260) +
                '<g fill="#2b1a2e">' + Array.apply(null, { length: 16 }).map(function (_, i) { return '<circle cx="' + (25 + i * 50) + '" cy="460" r="18"/>'; }).join('') + '</g>',
            items: [
                { src: 'img/maracas.svg', x: 23.75, y: 28.5, w: 12, anim: 'pt-mece' },
                { src: 'img/campana.svg', x: 41.25, y: 28.5, w: 11, anim: 'pt-flota' },
                { src: 'img/pandereta.svg', x: 58.75, y: 28.5, w: 12, anim: 'pt-mece' },
                { src: 'img/triangulo.svg', x: 76.25, y: 28.5, w: 11, anim: 'pt-flota' }
            ]
        },

        /* El sonido viajero — paseo por la granja. */
        granja: {
            svg: CIELO + nube(300, 60, 0.9) + nube(640, 80, 0.8, true) +
                '<circle cx="720" cy="70" r="38" fill="#ffd43b"/>' +
                '<ellipse cx="240" cy="260" rx="430" ry="80" fill="#94d82d"/><rect y="250" width="800" height="220" fill="#74b816"/>' +
                '<rect x="30" y="140" width="190" height="180" fill="#c92a2a"/><path d="M18 142 L125 60 L232 142z" fill="#c92a2a"/>' +
                '<rect x="18" y="136" width="214" height="8" fill="#fff"/>' +
                '<g fill="#343a40" stroke="#fff" stroke-width="3">' + [50, 95, 140, 185].map(function (x) { return '<rect x="' + x + '" y="160" width="26" height="26"/>'; }).join('') + '</g>' +
                '<rect x="80" y="230" width="90" height="90" fill="#e03131" stroke="#fff" stroke-width="4"/><path d="M80 230 L170 320 M170 230 L80 320" stroke="#fff" stroke-width="4"/>' +
                '<g stroke="#fff" stroke-width="5">' + [330, 380, 430, 480, 530, 580, 630, 680, 730].map(function (x) { return '<line x1="' + x + '" y1="270" x2="' + x + '" y2="300"/>'; }).join('') + '<line x1="320" y1="276" x2="740" y2="276"/><line x1="320" y1="292" x2="740" y2="292"/></g>' +
                '<g fill="#fab005"><rect x="600" y="360" width="90" height="56" rx="10"/></g><g stroke="#e67700" stroke-width="3"><line x1="606" y1="374" x2="684" y2="374"/><line x1="606" y1="388" x2="684" y2="388"/><line x1="606" y1="402" x2="684" y2="402"/></g>',
            items: [
                { src: 'img/gallo.svg', x: 44, y: 18, w: 12, anim: 'pt-salta' },
                { src: 'img/gato.png', x: 62, y: 30, w: 11, anim: 'pt-pasa' },
                { src: 'img/perro.png', x: 30, y: 8, w: 13, anim: 'pt-pasa' },
                { src: 'img/pajaro.svg', x: 85, y: 44, w: 9, anim: 'pt-mece' }
            ]
        },

        /* Misión final — la expedición. */
        expedicion: {
            svg: CIELO + nube(200, 60, 0.9) + nube(600, 50, 0.8, true) +
                '<rect y="190" width="270" height="280" fill="#40c057"/><rect x="270" y="190" width="270" height="280" fill="#ffe066"/><rect x="540" y="190" width="260" height="280" fill="#748ffc"/>' +
                '<g fill="#2b8a3e"><circle cx="60" cy="200" r="70"/><circle cx="190" cy="170" r="80"/></g><rect x="120" y="200" width="22" height="160" fill="#8d5524"/>' +
                '<path d="M300 380 L405 160 L510 380z" fill="#f59f00"/><path d="M405 160 L510 380 L440 380z" fill="#e67700"/>' +
                '<path d="M540 380 L670 120 L800 380z" fill="#4c6ef5"/><path d="M640 180 L670 120 L700 180z" fill="#fff"/>' +
                '<rect y="380" width="800" height="90" fill="#8d5524" opacity="0.25"/>' +
                '<path d="M70 420 C200 360 300 440 410 400 S620 360 730 410" stroke="#fff" stroke-width="6" stroke-dasharray="14 12" fill="none"/>' +
                '<g fill="#e03131" stroke="#fff" stroke-width="3">' + [[70, 420], [410, 400], [730, 410]].map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="12"/>'; }).join('') + '</g>' +
                '<g transform="translate(400 330)"><rect x="-50" y="-36" width="100" height="56" rx="8" fill="#8d5524"/><rect x="-50" y="-58" width="100" height="26" rx="10" fill="#a0522d"/><rect x="-50" y="-24" width="100" height="8" fill="#fcc419"/><rect x="-8" y="-34" width="16" height="20" fill="#fcc419"/></g>',
            items: [
                { src: 'img/perro.png', x: 15, y: 16, w: 13, anim: 'pt-salta' },
                { src: 'img/maracas.svg', x: 52, y: 40, w: 9, anim: 'pt-mece' },
                { src: 'img/pajaro.svg', x: 84, y: 36, w: 10, anim: 'pt-mece' },
                { src: 'img/carro.png', x: 66, y: 8, w: 14, anim: 'pt-pasa' }
            ]
        }
    };

    function armar() {
        var tarjeta = document.querySelector('.inicio-parque[data-portada]');
        if (!tarjeta) return;
        var p = PORTADAS[tarjeta.getAttribute('data-portada')];
        if (!p) { tarjeta.classList.add('portada-lista'); return; }
        var fondo = tarjeta.querySelector('.parque-fondo');
        if (fondo) {
            if (p.fondo) fondo.style.background = p.fondo;
            fondo.insertAdjacentHTML('beforeend',
                '<svg class="portada-svg" viewBox="0 0 800 470" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + p.svg + '</svg>');
        }
        // Los elementos de este juego en vez del perro, el carro y el pájaro de siempre.
        var nuevas = [];
        var viejos = tarjeta.querySelectorAll('.inicio-el');
        var ref = tarjeta.querySelector('.inicio-kicker');
        Array.prototype.forEach.call(viejos, function (el) { el.remove(); });
        p.items.forEach(function (it, i) {
            var img = document.createElement('img');
            img.className = 'inicio-el ie' + (i + 1) + (it.anim ? ' ' + it.anim : '');
            img.src = it.src;
            img.alt = '';
            img.draggable = false;
            img.style.left = (it.x - it.w / 2) + '%';
            img.style.bottom = it.y + '%';
            img.style.width = it.w + '%';
            img.style.top = 'auto';
            img.style.right = 'auto';
            img.style.animationDelay = (-i * 0.7) + 's';
            if (it.oscuro) img.style.filter = 'brightness(0.35) saturate(0.4)';
            tarjeta.insertBefore(img, ref);
            nuevas.push(img);
        });
        // Se muestra cuando las imágenes ya cargaron (con tope por si alguna tarda).
        var cargas = nuevas.map(function (img) {
            if (img.complete) return Promise.resolve();
            return new Promise(function (r) { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); });
        });
        var listo = false;
        function mostrar() {
            if (listo) return;
            listo = true;
            requestAnimationFrame(function () { tarjeta.classList.add('portada-lista'); });
        }
        Promise.all(cargas).then(mostrar);
        setTimeout(mostrar, 900);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', armar);
    else armar();
})();
