/**
 * PelucheMaq — convierte los dibujos de ¿Qué escuchaste? en peluches para la máquina del mall.
 *
 *   texturaPeluche(imagen, opts) → <canvas> con el mismo dibujo "de felpa":
 *       borde peludo (pelitos hacia afuera), pelo corto por dentro siguiendo una dirección,
 *       luz suave arriba y sombra abajo, costura punteada por dentro del borde y etiqueta cosida.
 *   relleno(tipo, color, lado) → <canvas> con un peluche de relleno (osito, conejo, pulpo, estrella,
 *       corazón, pompón) ya con la misma felpa y su carita.
 *   TIPOS: los tipos de relleno. Ninguno es un elemento del juego (no confunden la memoria).
 *
 * Sin Math.random (el juego lo usa para barajar): generador propio con semilla.
 */
(function (global) {
    'use strict';

    function generador(semilla) {
        var s = (semilla >>> 0) || 1;
        return function () {
            s ^= s << 13; s >>>= 0;
            s ^= s >>> 17;
            s ^= s << 5; s >>>= 0;
            return s / 4294967296;
        };
    }

    function lienzo(w, h) {
        var c = global.document.createElement('canvas');
        c.width = Math.max(2, Math.round(w));
        c.height = Math.max(2, Math.round(h));
        return c;
    }

    function rgb(r, g, b, a) {
        return 'rgba(' + Math.round(Math.max(0, Math.min(255, r))) + ',' + Math.round(Math.max(0, Math.min(255, g))) + ',' +
            Math.round(Math.max(0, Math.min(255, b))) + ',' + (a == null ? 1 : a) + ')';
    }

    /**
     * Felpa sobre un dibujo. opts: { lado (px máx., 360), semilla, margen (0..0.2, 0.05), etiqueta (true) }.
     * Devuelve un canvas del tamaño (escalado) de la imagen: el dibujo queda un poco más chico para que
     * quepan los pelitos del borde.
     */
    function texturaPeluche(img, opts) {
        opts = opts || {};
        var w0 = img.width || img.naturalWidth, h0 = img.height || img.naturalHeight;
        var k = Math.min(1, (opts.lado || 360) / Math.max(w0, h0));
        var W = Math.round(w0 * k), H = Math.round(h0 * k);
        var u = Math.max(W, H) / 320;                       // unidad: 1 en un dibujo de 320 px
        var m = Math.round(Math.max(W, H) * (opts.margen != null ? opts.margen : 0.05));
        var rnd = generador(opts.semilla || 7);
        var cv = lienzo(W, H);
        var x = cv.getContext('2d');

        // 1. El dibujo, apenas suavizado (el vector duro pasa a parecer tela).
        try { x.filter = 'blur(' + (0.7 * u).toFixed(2) + 'px)'; } catch (e) { /* noop */ }
        var s = 1 - 2 * m / Math.max(W, H);
        x.drawImage(img, W * (1 - s) / 2, H * (1 - s) / 2, W * s, H * s);
        try { x.filter = 'none'; } catch (e) { /* noop */ }

        var datos = x.getImageData(0, 0, W, H).data;
        function a(px, py) {
            px = px | 0; py = py | 0;
            if (px < 0 || py < 0 || px >= W || py >= H) return 0;
            return datos[(py * W + px) * 4 + 3];
        }
        function color(px, py) {
            var i = ((py | 0) * W + (px | 0)) * 4;
            return [datos[i], datos[i + 1], datos[i + 2]];
        }

        // 2. Contorno: puntos del borde con su normal hacia afuera.
        var bordes = [];
        var d = Math.max(2, Math.round(3 * u));
        var paso = Math.max(1, Math.round(1.5 * u));
        for (var py = d; py < H - d; py += paso) {
            for (var px = d; px < W - d; px += paso) {
                if (a(px, py) < 150) continue;
                var nx = a(px - d, py) - a(px + d, py);
                var ny = a(px, py - d) - a(px, py + d);
                var n = Math.hypot(nx, ny);
                if (n < 120) continue;
                bordes.push({ x: px, y: py, nx: nx / n, ny: ny / n });
            }
        }

        // 3. Pelitos del borde, hacia afuera, del color del lugar (un poco más oscuro).
        x.lineCap = 'round';
        bordes.forEach(function (p) {
            var c = color(p.x, p.y);
            var veces = 1 + (rnd() < 0.5 ? 1 : 0);
            for (var v = 0; v < veces; v++) {
                var ang = Math.atan2(p.ny, p.nx) + (rnd() - 0.5) * 1.1;
                var largo = (2.2 + rnd() * 4.2) * u;
                var f = 0.82 + rnd() * 0.12;
                x.strokeStyle = rgb(c[0] * f, c[1] * f, c[2] * f, 0.9);
                x.lineWidth = (1 + rnd() * 0.7) * u;
                x.beginPath();
                x.moveTo(p.x - p.nx * u, p.y - p.ny * u);
                x.lineTo(p.x + Math.cos(ang) * largo, p.y + Math.sin(ang) * largo);
                x.stroke();
            }
        });

        // 4. Pelo corto por dentro (solo sobre el peluche), peinado hacia abajo con ondas.
        x.globalCompositeOperation = 'source-atop';
        var hebras = Math.round(W * H / (16 * u * u));
        for (var i = 0; i < hebras; i++) {
            var hx = rnd() * W, hy = rnd() * H;
            if (a(hx, hy) < 200) continue;
            var c2 = color(hx, hy);
            var luz = 0.8 + rnd() * 0.38;
            var ang2 = Math.PI / 2 + Math.sin(hx * 0.045 / u + hy * 0.02 / u) * 0.7 + (rnd() - 0.5) * 0.9;
            var l2 = (1.8 + rnd() * 2.8) * u;
            x.strokeStyle = rgb(c2[0] * luz, c2[1] * luz, c2[2] * luz, 0.42);
            x.lineWidth = (0.9 + rnd() * 0.6) * u;
            x.beginPath();
            x.moveTo(hx, hy);
            x.lineTo(hx + Math.cos(ang2) * l2, hy + Math.sin(ang2) * l2);
            x.stroke();
        }

        // 5. Volumen de cojín: luz arriba a la izquierda, sombra abajo a la derecha.
        var g = x.createRadialGradient(W * 0.36, H * 0.3, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.62);
        g.addColorStop(0, 'rgba(255,255,255,0.2)');
        g.addColorStop(0.55, 'rgba(255,255,255,0)');
        g.addColorStop(1, 'rgba(40,20,40,0.24)');
        x.fillStyle = g;
        x.fillRect(0, 0, W, H);

        // 6. Costura punteada por dentro del borde (puntadas a lo largo del contorno).
        var puestas = [];
        var orden = bordes.slice();
        for (var j = orden.length - 1; j > 0; j--) {
            var r = Math.floor(rnd() * (j + 1));
            var t = orden[j]; orden[j] = orden[r]; orden[r] = t;
        }
        var minD = 9 * u, hechas = 0;
        for (var q = 0; q < orden.length && hechas < 160; q++) {
            var b = orden[q];
            var sx = b.x - b.nx * 6 * u, sy = b.y - b.ny * 6 * u;
            if (a(sx, sy) < 230) continue;
            var lejos = true;
            for (var z = 0; z < puestas.length; z++) {
                if (Math.abs(puestas[z][0] - sx) < minD && Math.abs(puestas[z][1] - sy) < minD) { lejos = false; break; }
            }
            if (!lejos) continue;
            puestas.push([sx, sy]);
            hechas++;
            var c3 = color(sx, sy);
            x.strokeStyle = rgb(c3[0] * 0.55, c3[1] * 0.55, c3[2] * 0.55, 0.55);
            x.lineWidth = 1.5 * u;
            x.beginPath();
            x.moveTo(sx + b.ny * 2.2 * u, sy - b.nx * 2.2 * u);
            x.lineTo(sx - b.ny * 2.2 * u, sy + b.nx * 2.2 * u);
            x.stroke();
        }
        x.globalCompositeOperation = 'source-over';

        // 7. Etiqueta de tela cosida abajo a la derecha (lo que distingue a un peluche).
        if (opts.etiqueta !== false && bordes.length) {
            var mejor = bordes[0];
            bordes.forEach(function (p) { if (p.x + p.y * 0.8 > mejor.x + mejor.y * 0.8 && p.nx > 0.2) mejor = p; });
            x.save();
            x.translate(mejor.x - 2 * u, mejor.y - 6 * u);
            x.rotate(-0.35);
            x.fillStyle = '#ffffff';
            x.fillRect(0, 0, 10 * u, 15 * u);
            x.fillStyle = '#ff6b6b';
            x.fillRect(0, 9 * u, 10 * u, 2.5 * u);
            x.strokeStyle = 'rgba(0,0,0,0.18)';
            x.lineWidth = 1 * u;
            x.strokeRect(0, 0, 10 * u, 15 * u);
            x.restore();
        }
        return cv;
    }

    /* ── Peluches de relleno (no son elementos del juego) ── */

    var TIPOS = ['osito', 'conejo', 'pulpo', 'estrella', 'corazon', 'pompon'];

    function aclarar(hex, f) {
        var r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
        return rgb(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f);
    }
    function css(hex) { return '#' + ('000000' + hex.toString(16)).slice(-6); }

    function circulo(x, cx, cy, r) { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); }
    function elipse(x, cx, cy, rx, ry, rot) { x.beginPath(); x.ellipse(cx, cy, rx, ry, rot || 0, 0, Math.PI * 2); x.fill(); }

    /** Silueta plana de un relleno (luego se le pone la felpa). Devuelve dónde va la cara. */
    function forma(x, tipo, col, L) {
        var c = L / 2;
        x.fillStyle = css(col);
        var cara = { x: c, y: c, r: L * 0.2 };
        if (tipo === 'osito') {
            circulo(x, c - L * 0.22, L * 0.26, L * 0.1);
            circulo(x, c + L * 0.22, L * 0.26, L * 0.1);
            elipse(x, c, L * 0.68, L * 0.28, L * 0.24);
            circulo(x, c, L * 0.4, L * 0.24);
            x.fillStyle = aclarar(col, 0.55);
            elipse(x, c, L * 0.47, L * 0.1, L * 0.075);
            elipse(x, c, L * 0.74, L * 0.15, L * 0.13);
            cara = { x: c, y: L * 0.39, r: L * 0.24, hocico: true };
        } else if (tipo === 'conejo') {
            elipse(x, c - L * 0.11, L * 0.2, L * 0.07, L * 0.18, -0.15);
            elipse(x, c + L * 0.11, L * 0.2, L * 0.07, L * 0.18, 0.15);
            elipse(x, c, L * 0.7, L * 0.26, L * 0.22);
            circulo(x, c, L * 0.45, L * 0.21);
            x.fillStyle = '#ffc9de';
            elipse(x, c - L * 0.11, L * 0.21, L * 0.03, L * 0.12, -0.15);
            elipse(x, c + L * 0.11, L * 0.21, L * 0.03, L * 0.12, 0.15);
            cara = { x: c, y: L * 0.45, r: L * 0.21 };
        } else if (tipo === 'pulpo') {
            for (var i = 0; i < 5; i++) elipse(x, c + (i - 2) * L * 0.12, L * 0.72, L * 0.065, L * 0.16, (i - 2) * 0.2);
            elipse(x, c, L * 0.45, L * 0.3, L * 0.28);
            cara = { x: c, y: L * 0.47, r: L * 0.26 };
        } else if (tipo === 'estrella') {
            x.beginPath();
            for (var p = 0; p < 10; p++) {
                var an = -Math.PI / 2 + p * Math.PI / 5;
                var rr = p % 2 ? L * 0.21 : L * 0.45;
                x[p ? 'lineTo' : 'moveTo'](c + Math.cos(an) * rr, L * 0.53 + Math.sin(an) * rr);
            }
            x.closePath();
            x.lineJoin = 'round';
            x.lineWidth = L * 0.08;
            x.strokeStyle = css(col);
            x.fill();
            x.stroke();
            cara = { x: c, y: L * 0.55, r: L * 0.17 };
        } else if (tipo === 'corazon') {
            x.beginPath();
            x.moveTo(c, L * 0.85);
            x.bezierCurveTo(L * 0.05, L * 0.55, L * 0.1, L * 0.15, c, L * 0.32);
            x.bezierCurveTo(L * 0.9, L * 0.15, L * 0.95, L * 0.55, c, L * 0.85);
            x.fill();
            cara = { x: c, y: L * 0.48, r: L * 0.2 };
        } else {
            circulo(x, c, c, L * 0.38);
            cara = { x: c, y: L * 0.5, r: L * 0.3 };
        }
        return cara;
    }

    /** Ojitos brillantes, mejillas y sonrisa (encima de la felpa, para que no se borren). */
    function carita(x, f, L) {
        var r = f.r;
        if (f.hocico) {
            x.fillStyle = '#5c3a21';
            elipse(x, f.x, f.y + r * 0.32, r * 0.13, r * 0.09);
        }
        x.fillStyle = '#2b1d14';
        circulo(x, f.x - r * 0.38, f.y - r * 0.05, r * 0.13);
        circulo(x, f.x + r * 0.38, f.y - r * 0.05, r * 0.13);
        x.fillStyle = '#ffffff';
        circulo(x, f.x - r * 0.33, f.y - r * 0.1, r * 0.05);
        circulo(x, f.x + r * 0.43, f.y - r * 0.1, r * 0.05);
        x.fillStyle = 'rgba(255,120,150,0.45)';
        elipse(x, f.x - r * 0.62, f.y + r * 0.22, r * 0.14, r * 0.08);
        elipse(x, f.x + r * 0.62, f.y + r * 0.22, r * 0.14, r * 0.08);
        x.strokeStyle = '#5c2a2a';
        x.lineWidth = Math.max(1.5, L * 0.012);
        x.lineCap = 'round';
        x.beginPath();
        x.arc(f.x, f.y + r * (f.hocico ? 0.38 : 0.15), r * 0.2, 0.15 * Math.PI, 0.85 * Math.PI);
        x.stroke();
    }

    /** Peluche de relleno: tipo de TIPOS, color 0xRRGGBB, lado en px. */
    function relleno(tipo, col, lado, semilla) {
        var L = lado || 192;
        var plano = lienzo(L, L);
        var cara = forma(plano.getContext('2d'), tipo, col, L);
        var cv = texturaPeluche(plano, { lado: L, semilla: semilla || 3, margen: 0.04, etiqueta: false });
        var x = cv.getContext('2d');
        // La forma se dibujó al 92 % (margen de la felpa): la cara se ajusta igual.
        var k = (L - 2 * Math.round(L * 0.04)) / L;
        var o = Math.round(L * 0.04);
        carita(x, { x: o + cara.x * k, y: o + cara.y * k, r: cara.r * k, hocico: cara.hocico }, L);
        return cv;
    }

    global.PelucheMaq = { texturaPeluche: texturaPeluche, relleno: relleno, TIPOS: TIPOS, generador: generador };
})(typeof window !== 'undefined' ? window : this);
