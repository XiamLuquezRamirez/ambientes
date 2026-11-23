/**
 * fondo.js — Cielo vivo del campamento (window.FondoPinball).
 *
 * Lienzo 2D a pantalla completa detrás de la máquina. Capas, de atrás hacia delante:
 *   cielo con degradado → nebulosas → vía láctea → tres capas de estrellas que titilan →
 *   aurora → luna → estrellas fugaces y ondas → fuegos artificiales → montañas, pinos, colinas
 *   y tiendas (pintados una vez en un lienzo aparte) → faroles, fogata, chispas, luciérnagas →
 *   guirnalda de bombillos → velo de oscuridad.
 *
 * Reacciona a la partida con FondoPinball.evento(tipo, datos):
 *   "bumper" {color}  la aurora toma ese color, los bombillos corren con él y titilan estrellas.
 *   "diana"  {color}  ráfaga de estrellas fugaces.
 *   "aro"             onda dorada que cruza el cielo y las estrellas brillan más.
 *   "golpe"  {lado}   una estrella fugaz sale desde ese lado.
 *   "racha"  {n}      la aurora se intensifica.
 *   "aviso"  {lado}   las luciérnagas se van hacia ese lado.
 *   "caida"           el cielo se oscurece un momento y la fogata baja.
 *   "ronda"           fuegos artificiales pequeños.
 *   "celebrar"        fuegos artificiales continuos y bombillos en arcoíris.
 * Es decorativo: no decide nada del juego.
 */
(function (global) {
    "use strict";

    var PI2 = Math.PI * 2;
    var lienzo = null, ctx = null;
    var W = 0, H = 0, dpr = 1;
    var estatico = null;          // montañas, pinos, colinas y tiendas
    var t = 0, ultimo = 0, rafId = null;
    var menos = false;
    var ligero = false;         // tabletas modestas: 30 cuadros, menos resolución, cielo horneado
    var cieloFijo = null;       // cielo + nebulosas + vía láctea + luna (solo en modo ligero)
    var acumulado = 0;

    var estrellas = [], via = [], nebulosas = [], fugaces = [], ondas = [], cohetes = [], chispasFx = [];
    var chispasFuego = [], luciernagas = [], bombillos = [];

    // Estado reactivo.
    var tinte = { r: 80, g: 220, b: 200 };     // color de la aurora
    var tinteObjetivo = { r: 80, g: 220, b: 200 };
    var aurora = 0.35, auroraObjetivo = 0.35;
    var brilloEstrellas = 0;
    var oscuridad = 0;
    var fuego = 1;
    var cazaBombillos = 0, colorCaza = "#ffd43b";
    var celebrando = false, proximoCohete = 0;
    var ladoLuciernagas = 0;
    var proximaFugaz = 3;

    function aleatorio(a, b) { return a + Math.random() * (b - a); }
    function rgb(hex) {
        var h = hex.replace("#", "");
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        var n = parseInt(h, 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    // ------------------------------------------------------------------ montaje

    function montar() {
        lienzo = document.getElementById("fondo-cielo");
        if (!lienzo) return;
        ctx = lienzo.getContext("2d");
        redimensionar();
        window.addEventListener("resize", redimensionar);
        ultimo = performance.now();
        rafId = requestAnimationFrame(cuadro);
        // Respaldo si el navegador deja de entregar cuadros.
        setInterval(function () { if (performance.now() - ultimo > 200) cuadro(performance.now(), true); }, 66);
    }

    function redimensionar() {
        dpr = ligero ? 0.75 : Math.min(global.devicePixelRatio || 1, 1.5);
        W = global.innerWidth;
        H = global.innerHeight;
        lienzo.width = Math.round(W * dpr);
        lienzo.height = Math.round(H * dpr);
        lienzo.style.width = W + "px";
        lienzo.style.height = H + "px";
        crearCielo();
        pintarEstatico();
        cieloFijo = null;
    }

    /** Modo ligero: el cielo de fondo (degradado, nebulosas, vía láctea, luna) se pinta una vez. */
    function hornearCielo() {
        cieloFijo = document.createElement("canvas");
        cieloFijo.width = lienzo.width;
        cieloFijo.height = lienzo.height;
        var original = ctx;
        ctx = cieloFijo.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        pintarCielo();
        pintarNebulosas();
        pintarVia();
        pintarLuna();
        ctx = original;
    }

    function crearCielo() {
        var n = menos ? 0.45 : (ligero ? 0.55 : 1);
        estrellas = [];
        [[160, 0.6, 1.2, 2], [90, 1, 2, 5], [34, 1.8, 3, 9]].forEach(function (capa, i) {
            for (var k = 0; k < capa[0] * n; k++) {
                estrellas.push({
                    x: Math.random() * W, y: Math.random() * H * 0.78,
                    r: aleatorio(capa[1], capa[2]), capa: i, vel: capa[3],
                    fase: Math.random() * PI2, ritmo: aleatorio(0.6, 2.4),
                    color: Math.random() < 0.15 ? (Math.random() < 0.5 ? "#ffe8a3" : "#a5d8ff") : "#ffffff",
                    destello: 0
                });
            }
        });
        // Vía láctea: banda diagonal de polvo de estrellas.
        via = [];
        for (var i = 0; i < 320 * n; i++) {
            var u = Math.random();
            var cx = u * W * 1.2 - W * 0.1;
            var cy = H * 0.62 - u * H * 0.55;
            var d = (Math.random() + Math.random() + Math.random() - 1.5) * H * 0.09;
            via.push({ x: cx + d * 0.5, y: cy + d, r: Math.random() * 1.1 + 0.2, a: Math.random() * 0.6 + 0.2 });
        }
        nebulosas = [
            { x: 0.18, y: 0.22, r: 0.32, c: "124,77,255", fase: 0 },
            { x: 0.82, y: 0.3, r: 0.3, c: "255,79,216", fase: 2 },
            { x: 0.5, y: 0.1, r: 0.36, c: "59,201,219", fase: 4 },
            { x: 0.35, y: 0.5, r: 0.22, c: "255,146,43", fase: 1 }
        ];
        luciernagas = [];
        for (var f = 0; f < 34 * n; f++) {
            luciernagas.push({ x: Math.random() * W, y: aleatorio(H * 0.62, H * 0.95), fase: Math.random() * PI2, vx: 0, vy: 0 });
        }
        bombillos = [];
        var colores = ["#ffd43b", "#ff6b6b", "#51cf66", "#4dabf7", "#f783ac", "#ff922b", "#b197fc"];
        for (var b = 0; b < 22; b++) {
            var u2 = b / 21;
            bombillos.push({ u: u2, color: colores[b % colores.length], luz: 0 });
        }
    }

    function yGuirnalda(u) {
        // Dos tramos colgantes a lo ancho de la pantalla.
        var tramo = u < 0.5 ? u * 2 : (u - 0.5) * 2;
        return H * 0.035 + Math.sin(tramo * Math.PI) * H * 0.07;
    }

    /** Montañas, pinos, colinas y tiendas: se pintan una sola vez por tamaño. */
    function pintarEstatico() {
        estatico = document.createElement("canvas");
        estatico.width = lienzo.width;
        estatico.height = lienzo.height;
        var c = estatico.getContext("2d");
        c.scale(dpr, dpr);

        function cordillera(base, alto, picos, color1, color2, semilla) {
            var g = c.createLinearGradient(0, base - alto, 0, H);
            g.addColorStop(0, color1);
            g.addColorStop(1, color2);
            c.fillStyle = g;
            c.beginPath();
            c.moveTo(0, H);
            c.lineTo(0, base);
            for (var i = 0; i <= picos; i++) {
                var x = (i / picos) * W;
                var y = base - alto * (0.45 + 0.55 * Math.abs(Math.sin(i * 1.7 + semilla)));
                c.lineTo(x - W / picos / 2, base - alto * 0.25 * Math.abs(Math.cos(i * 2.3 + semilla)));
                c.lineTo(x, y);
            }
            c.lineTo(W, H);
            c.closePath();
            c.fill();
        }
        cordillera(H * 0.66, H * 0.2, 7, "#3b2a7a", "#1a1040", 0.5);
        cordillera(H * 0.72, H * 0.15, 10, "#2a1d5c", "#120a30", 2.1);

        // Pinos lejanos.
        for (var p = 0; p < 26; p++) {
            var px = (p / 25) * W + Math.sin(p * 3.1) * 30;
            var ph = H * (0.07 + 0.05 * Math.abs(Math.sin(p * 1.3)));
            pino(c, px, H * 0.76, ph, "#0f2a2a");
        }
        // Colinas de pasto.
        var g2 = c.createLinearGradient(0, H * 0.74, 0, H);
        g2.addColorStop(0, "#1f6f4a");
        g2.addColorStop(1, "#0b3022");
        c.fillStyle = g2;
        c.beginPath();
        c.moveTo(0, H);
        c.lineTo(0, H * 0.8);
        c.quadraticCurveTo(W * 0.25, H * 0.72, W * 0.5, H * 0.79);
        c.quadraticCurveTo(W * 0.75, H * 0.86, W, H * 0.77);
        c.lineTo(W, H);
        c.closePath();
        c.fill();
        // Pinos cercanos a los lados.
        [0.02, 0.07, 0.94, 0.985].forEach(function (u, i) {
            pino(c, W * u, H * 0.86, H * (0.24 + (i % 2) * 0.06), "#0a2a1f");
        });
        // Tiendas.
        tienda(c, W * 0.13, H * 0.85, H * 0.2, "#e8590c", "#ff922b");
        tienda(c, W * 0.86, H * 0.84, H * 0.21, "#087f5b", "#20c997");
    }

    function pino(c, x, base, alto, color) {
        c.fillStyle = color;
        for (var i = 0; i < 3; i++) {
            var y0 = base - alto * (0.25 + i * 0.25);
            var ancho = alto * (0.42 - i * 0.1);
            c.beginPath();
            c.moveTo(x, y0 - alto * 0.32);
            c.lineTo(x + ancho, y0 + alto * 0.12);
            c.lineTo(x - ancho, y0 + alto * 0.12);
            c.closePath();
            c.fill();
        }
        c.fillRect(x - alto * 0.03, base - alto * 0.15, alto * 0.06, alto * 0.15);
    }

    function tienda(c, x, base, alto, oscuro, claro) {
        var ancho = alto * 1.25;
        var g = c.createLinearGradient(x - ancho / 2, 0, x + ancho / 2, 0);
        g.addColorStop(0, oscuro);
        g.addColorStop(0.5, claro);
        g.addColorStop(1, oscuro);
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(x - ancho / 2, base);
        c.lineTo(x, base - alto);
        c.lineTo(x + ancho / 2, base);
        c.closePath();
        c.fill();
        c.fillStyle = "rgba(0,0,0,0.45)";
        c.beginPath();
        c.moveTo(x, base - alto);
        c.lineTo(x - ancho * 0.13, base);
        c.lineTo(x + ancho * 0.13, base);
        c.closePath();
        c.fill();
        c.strokeStyle = "rgba(0,0,0,0.5)";
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(x, base - alto);
        c.lineTo(x, base - alto - alto * 0.1);
        c.stroke();
    }

    // ------------------------------------------------------------------ cuadro

    function cuadro(ahora, respaldo) {
        if (!respaldo) rafId = requestAnimationFrame(cuadro);
        var dt = Math.min(0.06, (ahora - ultimo) / 1000 || 0.016);
        ultimo = ahora;
        if (ligero) {
            acumulado += dt;
            if (acumulado < 1 / 30) return;
            dt = Math.min(0.1, acumulado);
            acumulado = 0;
        }
        t += dt;
        actualizarReacciones(dt);

        if (ligero) {
            if (!cieloFijo) hornearCielo();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.drawImage(cieloFijo, 0, 0);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            pintarAurora();
            pintarEstrellas(dt);
        } else {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            pintarCielo();
            pintarNebulosas();
            pintarVia();
            pintarAurora();
            pintarEstrellas(dt);
            pintarLuna();
        }
        pintarFugaces(dt);
        pintarOndas(dt);
        pintarFuegos(dt);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(estatico, 0, 0);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        pintarFaroles();
        pintarFogata(dt);
        pintarLuciernagas(dt);
        pintarGuirnalda(dt);
        if (oscuridad > 0.01) {
            ctx.fillStyle = "rgba(5,3,20," + (oscuridad * 0.55) + ")";
            ctx.fillRect(0, 0, W, H);
        }
    }

    function actualizarReacciones(dt) {
        var k = Math.min(1, dt * 1.5);
        tinte.r += (tinteObjetivo.r - tinte.r) * k;
        tinte.g += (tinteObjetivo.g - tinte.g) * k;
        tinte.b += (tinteObjetivo.b - tinte.b) * k;
        aurora += (auroraObjetivo - aurora) * Math.min(1, dt * 2);
        auroraObjetivo += (0.35 - auroraObjetivo) * Math.min(1, dt * 0.25);
        brilloEstrellas = Math.max(0, brilloEstrellas - dt * 0.8);
        oscuridad = Math.max(0, oscuridad - dt * 0.6);
        fuego += (1 - fuego) * Math.min(1, dt * 0.8);
        cazaBombillos = Math.max(0, cazaBombillos - dt * 0.7);
        ladoLuciernagas *= Math.pow(0.3, dt);

        proximaFugaz -= dt;
        if (proximaFugaz <= 0) { fugaz(); proximaFugaz = aleatorio(3, 7); }
        if (celebrando) {
            proximoCohete -= dt;
            if (proximoCohete <= 0) { cohete(); proximoCohete = aleatorio(0.25, 0.6); }
        }
    }

    function pintarCielo() {
        var g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#0a0626");
        g.addColorStop(0.45, "#1c0f52");
        g.addColorStop(0.75, "#3a2387");
        g.addColorStop(1, "#4b2f9c");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        // Resplandor del horizonte con el color de la aurora.
        var h = ctx.createLinearGradient(0, H * 0.45, 0, H * 0.8);
        h.addColorStop(0, "rgba(" + (tinte.r | 0) + "," + (tinte.g | 0) + "," + (tinte.b | 0) + ",0)");
        h.addColorStop(1, "rgba(" + (tinte.r | 0) + "," + (tinte.g | 0) + "," + (tinte.b | 0) + "," + (0.12 + aurora * 0.15) + ")");
        ctx.fillStyle = h;
        ctx.fillRect(0, H * 0.45, W, H * 0.35);
    }

    function pintarNebulosas() {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        nebulosas.forEach(function (n) {
            var x = (n.x + Math.sin(t * 0.03 + n.fase) * 0.04) * W;
            var y = (n.y + Math.cos(t * 0.025 + n.fase) * 0.03) * H;
            var r = n.r * Math.max(W, H) * (1 + Math.sin(t * 0.2 + n.fase) * 0.05);
            var g = ctx.createRadialGradient(x, y, 0, x, y, r);
            var a = 0.16 + brilloEstrellas * 0.08;
            g.addColorStop(0, "rgba(" + n.c + "," + a + ")");
            g.addColorStop(0.5, "rgba(" + n.c + "," + (a * 0.4) + ")");
            g.addColorStop(1, "rgba(" + n.c + ",0)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, PI2);
            ctx.fill();
        });
        ctx.restore();
    }

    function pintarVia() {
        ctx.save();
        ctx.translate(W * 0.5, H * 0.35);
        ctx.rotate(-0.42);
        var g = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.6);
        g.addColorStop(0, "rgba(200,190,255,0.12)");
        g.addColorStop(1, "rgba(200,190,255,0)");
        ctx.fillStyle = g;
        ctx.scale(1, 0.16);
        ctx.beginPath();
        ctx.arc(0, 0, W * 0.6, 0, PI2);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = "#ffffff";
        via.forEach(function (s) {
            ctx.globalAlpha = s.a * (0.7 + brilloEstrellas * 0.3);
            ctx.fillRect(s.x, s.y, s.r, s.r);
        });
        ctx.globalAlpha = 1;
    }

    function pintarAurora() {
        if (aurora < 0.02) return;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        var bandas = ligero ? 2 : 3;
        var pasoX = ligero ? 48 : 24;
        for (var banda = 0; banda < bandas; banda++) {
            var base = H * (0.12 + banda * 0.07);
            var alto = H * (0.16 - banda * 0.03);
            var c2 = banda === 1 ? { r: 177, g: 151, b: 252 } : tinte;
            ctx.beginPath();
            ctx.moveTo(0, base);
            for (var x = 0; x <= W; x += pasoX) {
                var y = base + Math.sin(x * 0.006 + t * (0.5 + banda * 0.2) + banda) * H * 0.04
                    + Math.sin(x * 0.017 - t * 0.7) * H * 0.012;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(W, base + alto);
            ctx.lineTo(0, base + alto);
            ctx.closePath();
            var g = ctx.createLinearGradient(0, base - H * 0.04, 0, base + alto);
            var a = aurora * (0.32 - banda * 0.07);
            g.addColorStop(0, "rgba(" + (c2.r | 0) + "," + (c2.g | 0) + "," + (c2.b | 0) + "," + a + ")");
            g.addColorStop(1, "rgba(" + (c2.r | 0) + "," + (c2.g | 0) + "," + (c2.b | 0) + ",0)");
            ctx.fillStyle = g;
            ctx.fill();
        }
        ctx.restore();
    }

    function pintarEstrellas(dt) {
        estrellas.forEach(function (s) {
            s.x -= s.vel * dt;                       // deriva lenta: parallax por capas
            if (s.x < -10) s.x = W + 10;
            s.destello = Math.max(0, s.destello - dt * 1.6);
            var tw = 0.45 + 0.55 * Math.abs(Math.sin(t * s.ritmo + s.fase));
            var a = Math.min(1, tw * (0.6 + s.capa * 0.2) + brilloEstrellas * 0.5 + s.destello);
            ctx.globalAlpha = a;
            ctx.fillStyle = s.destello > 0.1 ? (s.colorDestello || "#ffffff") : s.color;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r * (1 + s.destello * 0.8), 0, PI2);
            ctx.fill();
            // Las grandes llevan cruz de destello.
            if (s.capa === 2 && !menos) {
                var l = s.r * (3 + tw * 3 + s.destello * 6);
                ctx.strokeStyle = ctx.fillStyle;
                ctx.lineWidth = 1;
                ctx.globalAlpha = a * 0.7;
                ctx.beginPath();
                ctx.moveTo(s.x - l, s.y); ctx.lineTo(s.x + l, s.y);
                ctx.moveTo(s.x, s.y - l); ctx.lineTo(s.x, s.y + l);
                ctx.stroke();
            }
        });
        ctx.globalAlpha = 1;
    }

    function pintarLuna() {
        var x = W * 0.86, y = H * 0.17, r = Math.min(W, H) * 0.055;
        var g = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 4);
        g.addColorStop(0, "rgba(255,240,190," + (0.35 + brilloEstrellas * 0.2) + ")");
        g.addColorStop(1, "rgba(255,240,190,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r * 4, 0, PI2); ctx.fill();
        var c = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
        c.addColorStop(0, "#fffbe8");
        c.addColorStop(1, "#ffe08a");
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(x, y, r, 0, PI2); ctx.fill();
        ctx.fillStyle = "rgba(200,170,90,0.35)";
        [[0.3, -0.2, 0.18], [-0.35, 0.25, 0.14], [0.1, 0.4, 0.1]].forEach(function (k) {
            ctx.beginPath(); ctx.arc(x + k[0] * r, y + k[1] * r, k[2] * r, 0, PI2); ctx.fill();
        });
    }

    function fugaz(desdeX, desdeY, angulo, color) {
        fugaces.push({
            x: desdeX !== undefined ? desdeX : aleatorio(W * 0.1, W * 0.9),
            y: desdeY !== undefined ? desdeY : aleatorio(H * 0.03, H * 0.3),
            ang: angulo !== undefined ? angulo : aleatorio(2.4, 2.8),
            vel: aleatorio(650, 1000), vida: 1, color: color || "#ffffff"
        });
    }

    function pintarFugaces(dt) {
        for (var i = fugaces.length - 1; i >= 0; i--) {
            var f = fugaces[i];
            f.vida -= dt * 0.9;
            if (f.vida <= 0) { fugaces.splice(i, 1); continue; }
            f.x += Math.cos(f.ang) * f.vel * dt;
            f.y += Math.sin(f.ang) * f.vel * dt;
            var cola = 140;
            var g = ctx.createLinearGradient(f.x, f.y, f.x - Math.cos(f.ang) * cola, f.y - Math.sin(f.ang) * cola);
            var c = rgb(f.color);
            g.addColorStop(0, "rgba(" + c.r + "," + c.g + "," + c.b + "," + f.vida + ")");
            g.addColorStop(1, "rgba(" + c.r + "," + c.g + "," + c.b + ",0)");
            ctx.strokeStyle = g;
            ctx.lineWidth = 2.5;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(f.x, f.y);
            ctx.lineTo(f.x - Math.cos(f.ang) * cola, f.y - Math.sin(f.ang) * cola);
            ctx.stroke();
            ctx.fillStyle = "rgba(255,255,255," + f.vida + ")";
            ctx.beginPath(); ctx.arc(f.x, f.y, 2.5, 0, PI2); ctx.fill();
        }
    }

    function pintarOndas(dt) {
        for (var i = ondas.length - 1; i >= 0; i--) {
            var o = ondas[i];
            o.r += dt * Math.max(W, H) * 0.7;
            o.vida -= dt * 0.7;
            if (o.vida <= 0) { ondas.splice(i, 1); continue; }
            ctx.strokeStyle = "rgba(" + o.c + "," + (o.vida * 0.5) + ")";
            ctx.lineWidth = 10 * o.vida + 2;
            ctx.beginPath();
            ctx.arc(o.x, o.y, o.r, 0, PI2);
            ctx.stroke();
        }
    }

    function cohete() {
        cohetes.push({
            x: aleatorio(W * 0.05, W * 0.95), y: H * 0.8,
            vy: -aleatorio(H * 0.7, H * 1.0), objetivo: aleatorio(H * 0.1, H * 0.4),
            color: ["#ffd43b", "#ff6b6b", "#51cf66", "#4dabf7", "#f783ac", "#b197fc"][Math.floor(Math.random() * 6)]
        });
    }

    function pintarFuegos(dt) {
        for (var i = cohetes.length - 1; i >= 0; i--) {
            var c = cohetes[i];
            c.y += c.vy * dt;
            ctx.fillStyle = c.color;
            ctx.beginPath(); ctx.arc(c.x, c.y, 2.5, 0, PI2); ctx.fill();
            if (c.y <= c.objetivo) {
                var n = menos ? 20 : 46;
                for (var k = 0; k < n; k++) {
                    var a = (k / n) * PI2, v = aleatorio(80, 220);
                    chispasFx.push({ x: c.x, y: c.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 1, color: c.color });
                }
                cohetes.splice(i, 1);
            }
        }
        for (var j = chispasFx.length - 1; j >= 0; j--) {
            var p = chispasFx[j];
            p.vida -= dt * 0.7;
            if (p.vida <= 0) { chispasFx.splice(j, 1); continue; }
            p.vy += 60 * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            ctx.globalAlpha = p.vida;
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, PI2); ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    function pintarFaroles() {
        [[W * 0.13, H * 0.8], [W * 0.86, H * 0.79]].forEach(function (p, i) {
            var a = 0.35 + 0.1 * Math.sin(t * 3 + i) + cazaBombillos * 0.25;
            var g = ctx.createRadialGradient(p[0], p[1], 2, p[0], p[1], H * 0.12);
            g.addColorStop(0, "rgba(255,200,90," + a + ")");
            g.addColorStop(1, "rgba(255,200,90,0)");
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(p[0], p[1], H * 0.12, 0, PI2); ctx.fill();
        });
    }

    function pintarFogata(dt) {
        var x = W * 0.045, y = H * 0.93;
        var r = H * 0.09 * (0.6 + 0.4 * fuego);
        var g = ctx.createRadialGradient(x, y, 2, x, y, r * 2.2);
        g.addColorStop(0, "rgba(255,170,60," + (0.55 * fuego) + ")");
        g.addColorStop(1, "rgba(255,120,40,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, PI2); ctx.fill();
        for (var l = 0; l < 3; l++) {
            var alto = r * (0.8 + 0.25 * Math.sin(t * 9 + l * 2)) * fuego;
            ctx.fillStyle = ["#ff6b3d", "#ff922b", "#ffd43b"][l];
            ctx.beginPath();
            ctx.moveTo(x - r * (0.4 - l * 0.1), y);
            ctx.quadraticCurveTo(x + Math.sin(t * 7 + l) * r * 0.2, y - alto * 1.4, x + r * (0.4 - l * 0.1), y);
            ctx.closePath();
            ctx.fill();
        }
        if (Math.random() < dt * 14 * fuego) {
            chispasFuego.push({ x: x + aleatorio(-8, 8), y: y - r * 0.6, vx: aleatorio(-15, 15), vy: -aleatorio(40, 90), vida: 1 });
        }
        for (var i = chispasFuego.length - 1; i >= 0; i--) {
            var c = chispasFuego[i];
            c.vida -= dt * 0.6;
            if (c.vida <= 0) { chispasFuego.splice(i, 1); continue; }
            c.x += (c.vx + Math.sin(t * 3 + i) * 10) * dt;
            c.y += c.vy * dt;
            ctx.fillStyle = "rgba(255,200,90," + c.vida + ")";
            ctx.beginPath(); ctx.arc(c.x, c.y, 1.8, 0, PI2); ctx.fill();
        }
    }

    function pintarLuciernagas(dt) {
        luciernagas.forEach(function (f, i) {
            f.vx += (Math.sin(t * 0.7 + f.fase) * 14 + ladoLuciernagas * 60 - f.vx) * Math.min(1, dt * 2);
            f.vy = Math.cos(t * 0.9 + f.fase) * 10;
            f.x += f.vx * dt;
            f.y += f.vy * dt;
            if (f.x < -20) f.x = W + 20;
            if (f.x > W + 20) f.x = -20;
            var a = 0.35 + 0.65 * Math.max(0, Math.sin(t * 2.2 + f.fase));
            if (ligero) {
                ctx.fillStyle = "rgba(220,255,140," + (a * 0.85) + ")";
                ctx.beginPath(); ctx.arc(f.x, f.y, 3.5, 0, PI2); ctx.fill();
                return;
            }
            var g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 9);
            g.addColorStop(0, "rgba(220,255,140," + a + ")");
            g.addColorStop(1, "rgba(220,255,140,0)");
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(f.x, f.y, 9, 0, PI2); ctx.fill();
            void i;
        });
    }

    function pintarGuirnalda(dt) {
        ctx.strokeStyle = "rgba(30,20,60,0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (var x = 0; x <= W; x += 10) {
            var y = yGuirnalda(x / W);
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        var arcoiris = ["#ff6b6b", "#ff922b", "#ffd43b", "#51cf66", "#4dabf7", "#b197fc"];
        bombillos.forEach(function (b, i) {
            var bx = b.u * W, by = yGuirnalda(b.u) + 8;
            var ola = cazaBombillos > 0 ? Math.max(0, Math.sin(t * 14 - i * 0.7)) * cazaBombillos : 0;
            var color = celebrando ? arcoiris[(i + Math.floor(t * 6)) % arcoiris.length] : (ola > 0.3 ? colorCaza : b.color);
            var a = 0.55 + 0.25 * Math.sin(t * 2 + i) + ola * 0.45 + (celebrando ? 0.3 : 0);
            var c = rgb(color);
            if (ligero) {
                ctx.fillStyle = "rgba(" + c.r + "," + c.g + "," + c.b + "," + Math.min(1, a * 0.35) + ")";
                ctx.beginPath(); ctx.arc(bx, by, 12 + ola * 6, 0, PI2); ctx.fill();
                ctx.fillStyle = color;
                ctx.globalAlpha = Math.min(1, a + 0.2);
                ctx.beginPath(); ctx.ellipse(bx, by, 5, 7, 0, 0, PI2); ctx.fill();
                ctx.globalAlpha = 1;
                return;
            }
            var g = ctx.createRadialGradient(bx, by, 0, bx, by, 18 + ola * 10);
            g.addColorStop(0, "rgba(" + c.r + "," + c.g + "," + c.b + "," + Math.min(1, a * 0.6) + ")");
            g.addColorStop(1, "rgba(" + c.r + "," + c.g + "," + c.b + ",0)");
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(bx, by, 18 + ola * 10, 0, PI2); ctx.fill();
            ctx.fillStyle = color;
            ctx.globalAlpha = Math.min(1, a + 0.2);
            ctx.beginPath(); ctx.ellipse(bx, by, 5, 7, 0, 0, PI2); ctx.fill();
            ctx.globalAlpha = 1;
        });
    }

    // ------------------------------------------------------------------ API

    function evento(tipo, datos) {
        datos = datos || {};
        switch (tipo) {
            case "bumper":
                if (datos.color) { tinteObjetivo = rgb(datos.color); colorCaza = datos.color; }
                auroraObjetivo = Math.min(1, auroraObjetivo + 0.18);
                cazaBombillos = 1;
                for (var i = 0; i < 6; i++) {
                    var s = estrellas[Math.floor(Math.random() * estrellas.length)];
                    if (s) { s.destello = 1; s.colorDestello = datos.color || "#ffffff"; }
                }
                break;
            case "diana":
                for (var k = 0; k < 3; k++) fugaz(undefined, undefined, undefined, datos.color);
                brilloEstrellas = Math.min(1, brilloEstrellas + 0.4);
                break;
            case "aro":
                ondas.push({ x: W / 2, y: H * 0.42, r: 20, vida: 1, c: "255,212,59" });
                brilloEstrellas = 1;
                auroraObjetivo = Math.min(1, auroraObjetivo + 0.25);
                break;
            case "golpe":
                fugaz(datos.lado === "derecha" ? W * 0.92 : W * 0.08, H * 0.5,
                    datos.lado === "derecha" ? -2.2 : -0.94, datos.lado === "derecha" ? "#ffd43b" : "#ff8a65");
                break;
            case "racha":
                auroraObjetivo = Math.min(1, 0.4 + (datos.n || 0) * 0.08);
                break;
            case "aviso":
                ladoLuciernagas = datos.lado === "derecha" ? 1 : -1;
                break;
            case "caida":
                oscuridad = 1;
                fuego = 0.35;
                auroraObjetivo = 0.15;
                break;
            case "ronda":
                for (var r = 0; r < 4; r++) setTimeout(cohete, r * 250);
                cazaBombillos = 1;
                break;
            case "celebrar":
                celebrando = true;
                auroraObjetivo = 1;
                brilloEstrellas = 1;
                break;
        }
    }

    global.FondoPinball = {
        evento: evento,
        ligero: function (on) {
            if (ligero === !!on) return;
            ligero = !!on;
            if (lienzo) redimensionar();
        },
        menosEfectos: function (on) {
            var antes = menos;
            menos = !!on;
            if (antes !== menos && lienzo) crearCielo();
        }
    };

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar);
    else montar();

})(typeof window !== "undefined" ? window : globalThis);
