/**
 * EscenarioMapa — escena Phaser 4 de "El Mapa Estelar y las Llaves Mágicas" (window.EscenarioMapa).
 *
 * Un solo lienzo a pantalla completa detrás de la interfaz. El laberinto es una plataforma de roca flotante vista en
 * perspectiva isométrica (no un plano de líneas): cada celda de roca es un bloque con tapa y dos caras, ordenado por
 * profundidad, y la nave, las llaves y el portal se ordenan con los bloques según su posición (un muro que está
 * delante tapa lo que está detrás). Capas, de atrás hacia adelante:
 *   - el espacio: degradado azul profundo, nebulosas, estrellas que titilan, planetas con anillos, rocas espaciales
 *     que flotan, polvo luminoso y estrellas fugaces;
 *   - la plataforma: losa con caras rocosas, estalactitas y cristales; el piso de los caminos con bordes de neón
 *     (todos los caminos con el mismo diseño) y pulsos de energía que corren por ellos;
 *   - los muros de roca (bloques isométricos con neón en los bordes que dan al camino);
 *   - las llaves estelares (giran en 3D sobre un pedestal; dormidas dentro de una burbuja), las barreras espaciales
 *     de los caminos sin salida (aparecen al llegar), el portal galáctico con sus tres candados;
 *   - la nave de Zeus (modelo 3D prerrenderizado en 32 rumbos por nave-3d.js; nave 2D de respaldo), su sombra, la
 *     llama del motor con partículas, la estela y las llaves que orbitan a su alrededor;
 *   - el final: un planeta nuevo con una base espacial y su plataforma de aterrizaje.
 *
 * Coordenadas: el laberinto va en celdas (x = columna, y = fila; el centro de la celda i es i + 0,5). iso(x, y, z)
 * las lleva al mundo de Phaser. El movimiento y las zonas los decide ReglasMapa. Eventos para script.js:
 *   on({ mueve, pared, zona, sale })
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser || null;
    var R = global.ReglasMapa;
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);

    var ADD = "ADD";
    var CIAN = 0x22d3ee, ROSA = 0xf472b6, VIOLETA = 0xa78bfa, ORO = 0xfacc15, ROJO = 0xff5a7a;
    var NEON = [0x22d3ee, 0xa78bfa, 0xf472b6, 0xfacc15, 0x4ade80, 0x60a5fa, 0xffffff];
    var HOVER = 0.62;

    var juego = null;
    var sc = null;
    var cfgJ = {};
    var listoPromesa = null;
    var W = 1600, H = 1000;
    var area = { left: 0, top: 0, width: 800, height: 600 };
    var ev = {};
    var RES = 1;
    var camara = { z: 1, fx: null, fy: null };

    var lab = null;             // laberinto actual (ReglasMapa.construir)
    var geo = { A: 60, B: 34, Z: 70, ox: 800, oy: 120 };
    var objLab = [];            // objetos del laberinto (se destruyen al cambiar)
    var paredes = [];           // graphics por diagonal
    var llaves = {};            // id → objetos y estado
    var orbita = [];            // llaves que giran alrededor de la nave
    var portal = null;
    var barreras = {};
    var pulsos = [];
    var fondo = null;
    var nave = null;
    var fin = null;
    var marco = null;
    var visLab = 1;
    var conteoTablero = 0;

    var pil = {
        x: 0, y: 0, ox: 0, oy: 0, objetivo: null, arrastrando: false, bloqueado: true, visible: false, auto: false,
        ang: 0.6, angObj: 0.6, empuje: 0, temblor: 0, tAlerta: 0, tMov: 0, zona: null, zonaClave: "", escala: 1,
        rastro: []
    };

    function sleep(ms) {
        return new Promise(function (r) { setTimeout(r, reducido ? Math.min(ms, 80) : ms); });
    }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function suave(u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; }
    function salida(u) { return 1 - Math.pow(1 - u, 3); }
    function difAng(a, b) {
        var d = (b - a) % (Math.PI * 2);
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        return d;
    }

    function azar(semilla) {
        var s = semilla >>> 0;
        return function () {
            s = (s + 0x6D2B79F5) >>> 0;
            var t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function emitir(nombre) {
        var f = ev[nombre];
        if (typeof f === "function") {
            try { f.apply(null, [].slice.call(arguments, 1)); } catch (e) { console.warn("[EscenarioMapa]", nombre, e); }
        }
    }

    /** Anima de 0 a 1 llamando a paso(e, u); avanza con setTimeout aunque Phaser no pinte (pestaña oculta). */
    function animar(ms, paso, curva) {
        return new Promise(function (resolve) {
            var t0 = performance.now();
            var dur = reducido ? Math.min(ms, 150) : ms;
            var tick = function () {
                var u = Math.min(1, (performance.now() - t0) / dur);
                var e = curva ? curva(u) : u;
                try { paso(e, u); } catch (er) { console.warn(er); }
                if (u >= 1) { resolve(); return; }
                setTimeout(tick, 16);
            };
            tick();
        });
    }

    function destruirLuego(o, ms) {
        setTimeout(function () { if (o && o.active) o.destroy(); }, ms);
    }

    // ------------------------------------------------------------------ proyección isométrica

    function iso(x, y, z) {
        return { x: geo.ox + (x - y) * geo.A, y: geo.oy + (x + y) * geo.B - (z || 0) * geo.Z };
    }

    /** Del mundo de Phaser al plano del laberinto, a la altura z. */
    function deIso(X, Y, z) {
        var a = (X - geo.ox) / geo.A;
        var b = (Y - geo.oy + (z || 0) * geo.Z) / geo.B;
        return { x: (a + b) / 2, y: (b - a) / 2 };
    }

    function prof(s) { return 10 + s * 10; }

    /**
     * Lo que flota más alto que los muros (nave, llaves, portal) no puede quedar tapado por un muro: el rayo hacia la
     * cámara sube y los muros son bajos. Se pinta sobre todos los muros, ordenado entre sí por su posición.
     */
    function profAlto(s) { return 400 + s; }

    /**
     * Caminos más anchos que una celda: cada camino se ensancha EX celdas hacia la roca de cada lado (y los muros se
     * adelgazan lo mismo). El choque usa el mismo ancho (ReglasMapa: margen = anchoCamino / 2 - radioNave).
     */
    function ensanche() { return Math.max(0, ((Number(cfgJ.anchoCamino) || 1) - 1) / 2); }

    /** Bordes de una celda de camino (ensanchada hacia la roca) o de un bloque de roca (adelgazado hacia el camino). */
    function bordesCelda(l, i, j, roca) {
        var EX = ensanche();
        var es = function (a, b) { return R.esCamino(l, a, b); };
        var k = roca ? -1 : 1;
        var lado = function (a, b) { return roca ? (es(a, b) ? EX : 0) : (es(a, b) ? 0 : EX); };
        return {
            u0: i - k * lado(i - 1, j), u1: i + 1 + k * lado(i + 1, j),
            v0: j - k * lado(i, j - 1), v1: j + 1 + k * lado(i, j + 1)
        };
    }

    function geometria(l) {
        var n = l.cols + l.filas;
        var A = Math.min((W - 170) / (n + 1.4), (H - 50) / (n * 0.5625 + 2.6));
        var B = A * 0.5625, Z = A * 1.17;
        var arriba = -1.25 * Z, abajo = n * B + 0.95 * Z;
        return {
            A: A, B: B, Z: Z,
            ox: W / 2 - (l.cols - l.filas) / 2 * A,
            oy: H / 2 - (arriba + abajo) / 2
        };
    }

    // ------------------------------------------------------------------ texturas

    function texturaCanvas(clave, w, h, dibujar) {
        if (sc.textures.exists(clave)) return;
        var c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        dibujar(c.getContext("2d"), w, h);
        sc.textures.addCanvas(clave, c);
    }

    function reemplazarCanvas(clave, c) {
        if (sc.textures.exists(clave)) sc.textures.remove(clave);
        sc.textures.addCanvas(clave, c);
    }

    function radial(ctx, s, stops) {
        var g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        stops.forEach(function (st) { g.addColorStop(st[0], st[1]); });
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, s, s);
    }

    function estrella5(x, cx, cy, r1, r2, puntas) {
        x.beginPath();
        for (var i = 0; i < puntas * 2; i++) {
            var a = -Math.PI / 2 + i * Math.PI / puntas;
            var r = i % 2 === 0 ? r1 : r2;
            x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        x.closePath();
    }

    function hexARgb(hex) {
        var n = typeof hex === "number" ? hex : parseInt(String(hex).replace("#", ""), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, n: n };
    }

    function rgba(c, a) { return "rgba(" + c.r + "," + c.g + "," + c.b + "," + a + ")"; }

    function aclarar(c, k) {
        return { r: Math.round(c.r + (255 - c.r) * k), g: Math.round(c.g + (255 - c.g) * k), b: Math.round(c.b + (255 - c.b) * k) };
    }

    function texturasFx() {
        texturaCanvas("fx-halo", 128, 128, function (ctx, s) {
            radial(ctx, s, [[0, "rgba(255,255,255,1)"], [0.35, "rgba(255,255,255,0.45)"], [1, "rgba(255,255,255,0)"]]);
        });
        texturaCanvas("fx-punto", 16, 16, function (ctx, s) {
            radial(ctx, s, [[0, "rgba(255,255,255,1)"], [0.5, "rgba(255,255,255,0.6)"], [1, "rgba(255,255,255,0)"]]);
        });
        texturaCanvas("fx-chispa", 32, 32, function (ctx) {
            ctx.fillStyle = "#fff";
            estrella5(ctx, 16, 16, 15, 4, 4);
            ctx.fill();
        });
        texturaCanvas("fx-onda", 128, 128, function (ctx) {
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 7;
            ctx.beginPath();
            ctx.arc(64, 64, 58, 0, Math.PI * 2);
            ctx.stroke();
        });
        texturaCanvas("fx-blanco", 8, 8, function (ctx, w, h) {
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, w, h);
        });
        texturaCanvas("fx-haz", 64, 256, function (ctx, w, h) {
            var g = ctx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, "rgba(255,255,255,0)");
            g.addColorStop(0.6, "rgba(255,255,255,0.55)");
            g.addColorStop(1, "rgba(255,255,255,0.9)");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            var g2 = ctx.createLinearGradient(0, 0, w, 0);
            g2.addColorStop(0, "rgba(0,0,0,1)");
            g2.addColorStop(0.5, "rgba(0,0,0,0)");
            g2.addColorStop(1, "rgba(0,0,0,1)");
            ctx.globalCompositeOperation = "destination-out";
            ctx.fillStyle = g2;
            ctx.fillRect(0, 0, w, h);
        });
        texturaCanvas("fx-anillo", 128, 64, function (ctx) {
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.ellipse(64, 32, 58, 26, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 0.25;
            ctx.fillStyle = "#fff";
            ctx.fill();
        });
        texturaCanvas("fx-burbuja", 128, 128, function (ctx) {
            var g = ctx.createRadialGradient(64, 64, 30, 64, 64, 62);
            g.addColorStop(0, "rgba(255,255,255,0.04)");
            g.addColorStop(0.8, "rgba(200,230,255,0.25)");
            g.addColorStop(1, "rgba(255,255,255,0.7)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(64, 64, 62, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,0.8)";
            ctx.beginPath();
            ctx.ellipse(44, 36, 14, 7, -0.7, 0, Math.PI * 2);
            ctx.fill();
        });
        texturaCanvas("fx-estela", 64, 16, function (ctx, w, h) {
            var g = ctx.createLinearGradient(0, 0, w, 0);
            g.addColorStop(0, "rgba(255,255,255,0)");
            g.addColorStop(1, "rgba(255,255,255,1)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(0, h / 2);
            ctx.lineTo(w, 0);
            ctx.lineTo(w, h);
            ctx.closePath();
            ctx.fill();
        });
        texturasLlaves();
        texturasPortal();
        texturasEspacio();
        texturaNave2d();
    }

    /** Llave estelar: aro en estrella con hueco, vástago y dientes; metal neón del color de la llave. */
    function dibujarLlave(x, color, w, h) {
        var c = hexARgb(color);
        var cl = aclarar(c, 0.55);
        x.save();
        x.translate(w / 2, 0);
        x.shadowColor = rgba(c, 0.95);
        x.shadowBlur = 18;
        var g = x.createLinearGradient(-40, 0, 40, 0);
        g.addColorStop(0, rgba(c, 1));
        g.addColorStop(0.45, rgba(cl, 1));
        g.addColorStop(1, rgba(c, 1));
        x.fillStyle = g;
        x.strokeStyle = "#ffffff";
        x.lineWidth = 4;
        // vástago
        x.beginPath();
        x.moveTo(-9, 74);
        x.lineTo(9, 74);
        x.lineTo(9, h - 14);
        x.quadraticCurveTo(0, h - 4, -9, h - 14);
        x.closePath();
        x.fill();
        x.stroke();
        // dientes
        [[h - 44, 22], [h - 26, 15]].forEach(function (d) {
            x.beginPath();
            x.rect(8, d[0], d[1], 11);
            x.fill();
            x.stroke();
        });
        // aro en estrella
        estrella5(x, 0, 44, 42, 22, 5);
        x.fill();
        x.stroke();
        x.shadowBlur = 0;
        x.globalCompositeOperation = "destination-out";
        x.beginPath();
        x.arc(0, 45, 10, 0, Math.PI * 2);
        x.fill();
        x.globalCompositeOperation = "source-over";
        x.strokeStyle = "rgba(255,255,255,0.9)";
        x.lineWidth = 3;
        x.beginPath();
        x.arc(0, 45, 10, 0, Math.PI * 2);
        x.stroke();
        // destello
        x.fillStyle = "rgba(255,255,255,0.85)";
        x.beginPath();
        x.ellipse(-14, 28, 8, 4, -0.7, 0, Math.PI * 2);
        x.fill();
        x.restore();
    }

    var COLORES_LLAVE = { roja: "#ff3b5c", verde: "#3ddc84", azul: "#38a8ff" };

    function texturasLlaves() {
        Object.keys(COLORES_LLAVE).forEach(function (id) {
            texturaCanvas("llave-" + id, 120, 190, function (x, w, h) { dibujarLlave(x, COLORES_LLAVE[id], w, h); });
            texturaCanvas("candado-" + id, 96, 110, function (x) { dibujarCandado(x, COLORES_LLAVE[id], false); });
            texturaCanvas("candado-" + id + "-abierto", 96, 110, function (x) { dibujarCandado(x, COLORES_LLAVE[id], true); });
        });
    }

    function dibujarCandado(x, color, abierto) {
        var c = hexARgb(color);
        x.save();
        x.lineWidth = 10;
        x.strokeStyle = "#cbd5e1";
        x.lineCap = "round";
        x.beginPath();
        if (abierto) {
            x.moveTo(26, 34);
            x.lineTo(26, 18);
            x.arc(48, 18, 22, Math.PI, Math.PI * 1.85);
        } else {
            x.moveTo(26, 52);
            x.lineTo(26, 32);
            x.arc(48, 32, 22, Math.PI, 0);
            x.lineTo(70, 52);
        }
        x.stroke();
        x.shadowColor = rgba(c, 0.9);
        x.shadowBlur = 12;
        var g = x.createLinearGradient(0, 48, 0, 104);
        g.addColorStop(0, rgba(aclarar(c, 0.45), 1));
        g.addColorStop(1, rgba(c, 1));
        x.fillStyle = g;
        x.strokeStyle = "#ffffff";
        x.lineWidth = 4;
        x.beginPath();
        x.moveTo(18, 50);
        x.lineTo(78, 50);
        x.quadraticCurveTo(86, 50, 86, 60);
        x.lineTo(86, 94);
        x.quadraticCurveTo(86, 104, 76, 104);
        x.lineTo(20, 104);
        x.quadraticCurveTo(10, 104, 10, 94);
        x.lineTo(10, 60);
        x.quadraticCurveTo(10, 50, 18, 50);
        x.closePath();
        x.fill();
        x.stroke();
        x.shadowBlur = 0;
        x.fillStyle = "rgba(15,23,42,0.85)";
        x.beginPath();
        x.arc(48, 72, 8, 0, Math.PI * 2);
        x.fill();
        x.fillRect(45, 74, 6, 16);
        x.restore();
    }

    function texturasPortal() {
        texturaCanvas("portal-remolino", 256, 256, function (x) {
            x.translate(128, 128);
            for (var brazo = 0; brazo < 4; brazo++) {
                for (var k = 0; k < 90; k++) {
                    var t = k / 90;
                    var a = brazo * Math.PI / 2 + t * Math.PI * 2.4;
                    var r = 8 + t * 112;
                    x.fillStyle = "hsla(" + (280 - t * 120) + ",100%," + (75 - t * 25) + "%," + (0.5 * (1 - t) + 0.08) + ")";
                    x.beginPath();
                    x.arc(Math.cos(a) * r, Math.sin(a) * r, 4 + t * 14, 0, Math.PI * 2);
                    x.fill();
                }
            }
        });
        texturaCanvas("portal-nucleo", 256, 256, function (x, s) {
            radial(x, s, [[0, "rgba(255,255,255,1)"], [0.18, "rgba(236,210,255,0.95)"], [0.45, "rgba(124,58,237,0.75)"], [0.8, "rgba(30,27,75,0.6)"], [1, "rgba(30,27,75,0)"]]);
        });
        texturaCanvas("portal-aro", 256, 256, function (x) {
            x.translate(128, 128);
            x.shadowColor = "#c084fc";
            x.shadowBlur = 18;
            x.lineWidth = 16;
            var g = x.createLinearGradient(-120, -120, 120, 120);
            g.addColorStop(0, "#67e8f9");
            g.addColorStop(0.5, "#c084fc");
            g.addColorStop(1, "#f472b6");
            x.strokeStyle = g;
            x.beginPath();
            x.arc(0, 0, 112, 0, Math.PI * 2);
            x.stroke();
            x.shadowBlur = 0;
            x.lineWidth = 4;
            x.strokeStyle = "rgba(255,255,255,0.9)";
            for (var i = 0; i < 12; i++) {
                var a = i / 12 * Math.PI * 2;
                x.beginPath();
                x.arc(0, 0, 112, a, a + 0.25);
                x.stroke();
            }
            x.fillStyle = "#e0f2fe";
            for (var j = 0; j < 8; j++) {
                var b = j / 8 * Math.PI * 2 + 0.2;
                x.beginPath();
                x.arc(Math.cos(b) * 112, Math.sin(b) * 112, 5, 0, Math.PI * 2);
                x.fill();
            }
        });
        texturaCanvas("portal-campo", 256, 256, function (x) {
            x.save();
            x.beginPath();
            x.arc(128, 128, 104, 0, Math.PI * 2);
            x.clip();
            x.fillStyle = "rgba(148,163,184,0.18)";
            x.fillRect(0, 0, 256, 256);
            x.strokeStyle = "rgba(186,230,253,0.65)";
            x.lineWidth = 2;
            var r = 16, hgt = Math.sqrt(3) * r;
            for (var row = -1; row < 12; row++) {
                for (var col = -1; col < 12; col++) {
                    var cx = col * r * 1.5, cy = row * hgt + (col % 2 ? hgt / 2 : 0);
                    x.beginPath();
                    for (var k = 0; k < 6; k++) {
                        var a = k * Math.PI / 3;
                        x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
                    }
                    x.closePath();
                    x.stroke();
                }
            }
            x.restore();
        });
    }

    function dibujarPlaneta(x, s, c1, c2, c3, anillo, bandas) {
        var r = s * (anillo ? 0.3 : 0.46);
        var cx = s / 2, cy = s / 2;
        if (anillo) {
            x.save();
            x.translate(cx, cy);
            x.rotate(-0.35);
            x.strokeStyle = anillo;
            x.lineWidth = s * 0.035;
            x.beginPath();
            x.ellipse(0, 0, r * 1.75, r * 0.42, 0, Math.PI, Math.PI * 2);
            x.stroke();
            x.restore();
        }
        var g = x.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
        g.addColorStop(0, c1);
        g.addColorStop(0.6, c2);
        g.addColorStop(1, c3);
        x.fillStyle = g;
        x.beginPath();
        x.arc(cx, cy, r, 0, Math.PI * 2);
        x.fill();
        if (bandas) {
            x.save();
            x.beginPath();
            x.arc(cx, cy, r, 0, Math.PI * 2);
            x.clip();
            x.globalAlpha = 0.28;
            x.fillStyle = bandas;
            for (var i = -3; i <= 3; i++) {
                x.beginPath();
                x.ellipse(cx, cy + i * r * 0.28, r * 1.2, r * 0.07, -0.2, 0, Math.PI * 2);
                x.fill();
            }
            x.restore();
        }
        var sombra = x.createRadialGradient(cx - r * 0.5, cy - r * 0.5, r * 0.6, cx, cy, r * 1.05);
        sombra.addColorStop(0, "rgba(0,0,0,0)");
        sombra.addColorStop(1, "rgba(5,8,38,0.65)");
        x.fillStyle = sombra;
        x.beginPath();
        x.arc(cx, cy, r, 0, Math.PI * 2);
        x.fill();
        if (anillo) {
            x.save();
            x.translate(cx, cy);
            x.rotate(-0.35);
            x.strokeStyle = anillo;
            x.lineWidth = s * 0.035;
            x.beginPath();
            x.ellipse(0, 0, r * 1.75, r * 0.42, 0, 0, Math.PI);
            x.stroke();
            x.restore();
        }
    }

    function dibujarRoca(x, s, semilla, base) {
        var rnd = azar(semilla);
        var pts = [];
        var n = 9;
        for (var i = 0; i < n; i++) {
            var a = i / n * Math.PI * 2;
            var r = s * (0.3 + rnd() * 0.16);
            pts.push([s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r * 0.85]);
        }
        var g = x.createLinearGradient(0, 0, s, s);
        g.addColorStop(0, base || "#6b6699");
        g.addColorStop(1, "#1e1b3a");
        x.fillStyle = g;
        x.strokeStyle = "rgba(167,139,250,0.55)";
        x.lineWidth = 2;
        x.beginPath();
        pts.forEach(function (p) { x.lineTo(p[0], p[1]); });
        x.closePath();
        x.fill();
        x.stroke();
        x.fillStyle = "rgba(15,12,40,0.45)";
        for (var k = 0; k < 4; k++) {
            x.beginPath();
            x.ellipse(s * (0.35 + rnd() * 0.3), s * (0.35 + rnd() * 0.3), s * 0.05, s * 0.035, 0, 0, Math.PI * 2);
            x.fill();
        }
    }

    function texturasEspacio() {
        texturaCanvas("planeta-1", 256, 256, function (x, s) { dibujarPlaneta(x, s, "#f5d0fe", "#c026d3", "#4a044e", "rgba(251,207,232,0.85)", "#fdf4ff"); });
        texturaCanvas("planeta-2", 256, 256, function (x, s) { dibujarPlaneta(x, s, "#a7f3d0", "#0d9488", "#042f2e", "rgba(153,246,228,0.8)", "#ecfeff"); });
        texturaCanvas("planeta-3", 128, 128, function (x, s) { dibujarPlaneta(x, s, "#fed7aa", "#ea580c", "#431407", null, "#fff7ed"); });
        texturaCanvas("planeta-4", 128, 128, function (x, s) { dibujarPlaneta(x, s, "#c7d2fe", "#4f46e5", "#1e1b4b", null, null); });
        for (var i = 0; i < 4; i++) {
            (function (k) {
                texturaCanvas("roca-" + k, 96, 96, function (x, s) { dibujarRoca(x, s, 77 + k * 13, ["#6b6699", "#5b5a8a", "#7c6fa8", "#4f4a7a"][k]); });
            })(i);
        }
    }

    /** Nave de respaldo (sin WebGL): cohete naranja visto de lado, apunta a la derecha. */
    function texturaNave2d() {
        texturaCanvas("nave-2d", 200, 120, function (x) {
            x.fillStyle = "#fb923c";
            x.beginPath();
            x.moveTo(70, 60);
            x.lineTo(40, 104);
            x.lineTo(78, 92);
            x.closePath();
            x.fill();
            x.beginPath();
            x.moveTo(70, 60);
            x.lineTo(40, 16);
            x.lineTo(78, 28);
            x.closePath();
            x.fill();
            var g = x.createLinearGradient(0, 30, 0, 90);
            g.addColorStop(0, "#ffffff");
            g.addColorStop(1, "#cbd5e1");
            x.fillStyle = g;
            x.beginPath();
            x.moveTo(30, 42);
            x.quadraticCurveTo(120, 22, 186, 60);
            x.quadraticCurveTo(120, 98, 30, 78);
            x.closePath();
            x.fill();
            x.fillStyle = "#f97316";
            x.beginPath();
            x.moveTo(160, 46);
            x.quadraticCurveTo(178, 52, 186, 60);
            x.quadraticCurveTo(178, 68, 160, 74);
            x.closePath();
            x.fill();
            x.fillStyle = "#7dd3fc";
            x.beginPath();
            x.arc(118, 52, 15, 0, Math.PI * 2);
            x.fill();
            x.strokeStyle = "#1d4ed8";
            x.lineWidth = 4;
            x.stroke();
        });
    }

    /** Las 32 vistas de la nave 3D como cuadros de una textura. */
    function cargarNave3d() {
        var S = global.NaveSprites;
        if (!S || !sc || sc.textures.exists("nave-3d")) return false;
        var tex = sc.textures.addCanvas("nave-3d", S.canvas);
        for (var k = 0; k < S.cuadros; k++) {
            tex.add(k, 0, (k % S.columnas) * S.tam, Math.floor(k / S.columnas) * S.tam, S.tam, S.tam);
        }
        if (nave) {
            nave.spr.setTexture("nave-3d", 0).setRotation(0);
            nave.es3d = true;
            escalaNave();
        }
        if (fin && fin.nave) fin.nave.setTexture("nave-3d", 0);
        return true;
    }

    function cuadroNave(ang) {
        var S = global.NaveSprites;
        var n = S ? S.cuadros : 32;
        var a = ((ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        return Math.round(a / (Math.PI * 2) * n) % n;
    }

    // ------------------------------------------------------------------ cámara y coordenadas

    function medirArea() {
        var vw = global.innerWidth, vh = global.innerHeight;
        // la cabecera ya no tiene título: solo botones en las esquinas, así que el mapa (que es un rombo con la punta
        // arriba al centro) puede subir casi hasta el borde sin tocarlos
        var cab = document.querySelector(".hud-top");
        var arriba = cab ? Math.max(16, cab.getBoundingClientRect().bottom * 0.3) : 24;
        var abajo = 10;
        area = { left: 8, top: arriba, width: Math.max(200, vw - 16), height: Math.max(200, vh - arriba - abajo) };
        return area;
    }

    function zoomAjuste() {
        return Math.min(area.width / W, area.height / H);
    }

    function reacomodar() {
        if (!sc) return;
        sc.scale.updateBounds();
        medirArea();
        var cam = sc.cameras.main;
        var z = zoomAjuste() * camara.z;
        var cx = area.left + area.width / 2;
        var cy = area.top + area.height / 2;
        var fx = camara.fx == null ? W / 2 : camara.fx;
        var fy = camara.fy == null ? H / 2 : camara.fy;
        cam.setZoom(z);
        cam.centerOn(fx + (sc.scale.width / 2 - cx) / z, fy + (sc.scale.height / 2 - cy) / z);
        ajustarMarco();
    }

    /** Mueve la cámara suavemente a un zoom (1 = todo el mundo) y un foco del mundo (null = centro). */
    function moverCamara(z, fx, fy, ms) {
        var z0 = camara.z;
        var fx0 = camara.fx == null ? W / 2 : camara.fx, fy0 = camara.fy == null ? H / 2 : camara.fy;
        var fx1 = fx == null ? W / 2 : fx, fy1 = fy == null ? H / 2 : fy;
        return animar(ms || 1200, function (e) {
            camara.z = lerp(z0, z, e);
            camara.fx = lerp(fx0, fx1, e);
            camara.fy = lerp(fy0, fy1, e);
            reacomodar();
        }, suave).then(function () {
            if (fx == null && z === 1) {
                camara.fx = null;
                camara.fy = null;
                reacomodar();
            }
        });
    }

    function vista() {
        var cam = sc.cameras.main;
        var z = cam.zoom;
        return {
            z: z,
            x0: cam.scrollX + cam.width * (1 - 1 / z) / 2,
            y0: cam.scrollY + cam.height * (1 - 1 / z) / 2,
            w: cam.width / z,
            h: cam.height / z
        };
    }

    function aPantalla(x, y) {
        if (!sc) return { x: x, y: y };
        var v = vista();
        var r = sc.game.canvas.getBoundingClientRect();
        var kx = r.width / sc.scale.width, ky = r.height / sc.scale.height;
        return { x: r.left + (x - v.x0) * v.z * kx, y: r.top + (y - v.y0) * v.z * ky };
    }

    function mundoDeJuego(x, y) {
        var v = vista();
        return { x: v.x0 + x / v.z, y: v.y0 + y / v.z };
    }

    function ajustarMarco() {
        if (!sc) return;
        var v = vista();
        if (marco) {
            marco.setPosition(v.x0 + v.w / 2, v.y0 + v.h / 2);
            marco.setDisplaySize(v.w + 8, v.h + 8);
        }
        if (fondo && fondo.img) {
            // el cielo cubre siempre toda la vista (tabletas 4:3 y pantallas anchas)
            var k = Math.max((v.w + 40) / W, (v.h + 40) / H, 1);
            fondo.img.setPosition(v.x0 + v.w / 2, v.y0 + v.h / 2).setScale(k / RES);
        }
        if (fin && fin.cielo) {
            fin.cielo.setPosition(v.x0 + v.w / 2, v.y0 + v.h / 2).setDisplaySize(v.w + 8, v.h + 8);
        }
    }

    // ------------------------------------------------------------------ el espacio (fondo)

    function lienzoEspacio() {
        var c = document.createElement("canvas");
        c.width = Math.round(W * RES);
        c.height = Math.round(H * RES);
        var x = c.getContext("2d");
        x.scale(RES, RES);
        var g = x.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#050826");
        g.addColorStop(0.5, "#0b1446");
        g.addColorStop(1, "#160d3a");
        x.fillStyle = g;
        x.fillRect(0, 0, W, H);
        var rnd = azar(2026);
        x.globalCompositeOperation = "lighter";
        [[0.18, 0.3, 420, "rgba(192,38,211,0.20)"], [0.82, 0.22, 380, "rgba(34,211,238,0.14)"], [0.6, 0.8, 520, "rgba(124,58,237,0.20)"],
            [0.1, 0.85, 340, "rgba(56,189,248,0.12)"], [0.45, 0.15, 300, "rgba(244,114,182,0.12)"]].forEach(function (n) {
            var rg = x.createRadialGradient(n[0] * W, n[1] * H, 0, n[0] * W, n[1] * H, n[2]);
            rg.addColorStop(0, n[3]);
            rg.addColorStop(1, "rgba(0,0,0,0)");
            x.fillStyle = rg;
            x.fillRect(0, 0, W, H);
        });
        // vetas de nebulosa
        for (var k = 0; k < 26; k++) {
            var nx = rnd() * W, ny = rnd() * H, nr = 60 + rnd() * 140;
            var rg2 = x.createRadialGradient(nx, ny, 0, nx, ny, nr);
            rg2.addColorStop(0, ["rgba(244,114,182,0.07)", "rgba(96,165,250,0.07)", "rgba(167,139,250,0.08)"][k % 3]);
            rg2.addColorStop(1, "rgba(0,0,0,0)");
            x.fillStyle = rg2;
            x.fillRect(nx - nr, ny - nr, nr * 2, nr * 2);
        }
        x.globalCompositeOperation = "source-over";
        for (var i = 0; i < 520; i++) {
            var a = 0.25 + rnd() * 0.7;
            x.fillStyle = "rgba(255,255,255," + a.toFixed(2) + ")";
            var r = rnd() < 0.92 ? 0.6 + rnd() * 0.9 : 1.6 + rnd();
            x.beginPath();
            x.arc(rnd() * W, rnd() * H, r, 0, Math.PI * 2);
            x.fill();
        }
        return c;
    }

    function crearFondo() {
        reemplazarCanvas("espacio", lienzoEspacio());
        fondo = { img: sc.add.image(W / 2, H / 2, "espacio").setDepth(0).setScale(1 / RES), titilan: [], planetas: [], rocas: [], polvo: [], tFugaz: 0 };
        var rnd = azar(11);
        for (var i = 0; i < 70; i++) {
            var st = sc.add.image(rnd() * W, rnd() * H, i % 4 === 0 ? "fx-chispa" : "fx-punto").setDepth(0.5).setBlendMode(ADD)
                .setTint(NEON[i % NEON.length]).setScale(i % 4 === 0 ? 0.25 + rnd() * 0.3 : 0.5 + rnd() * 0.9);
            fondo.titilan.push({ o: st, f: 0.6 + rnd() * 2, fase: rnd() * 6 });
        }
        [["planeta-1", 0.08, 0.2, 0.9, 0.08], ["planeta-2", 0.93, 0.3, 0.75, -0.05], ["planeta-3", 0.9, 0.86, 0.7, 0], ["planeta-4", 0.2, 0.9, 0.55, 0], ["planeta-3", 0.66, 0.06, 0.35, 0]].forEach(function (p, k) {
            var o = sc.add.image(p[1] * W, p[2] * H, p[0]).setDepth(0.6).setScale(p[3]);
            fondo.planetas.push({ o: o, y: p[2] * H, f: 0.3 + k * 0.07, giro: p[4] });
        });
        for (var j = 0; j < 7; j++) {
            var ro = sc.add.image(rnd() * W, rnd() * H, "roca-" + (j % 4)).setDepth(0.7).setScale(0.35 + rnd() * 0.5).setAlpha(0.95);
            fondo.rocas.push({ o: ro, vx: (rnd() - 0.5) * 10, vy: (rnd() - 0.5) * 6, vr: (rnd() - 0.5) * 0.4 });
        }
        for (var k = 0; k < 34; k++) {
            var po = sc.add.image(rnd() * W, rnd() * H, "fx-punto").setDepth(0.8).setBlendMode(ADD).setTint(k % 2 ? CIAN : VIOLETA).setScale(0.35 + rnd() * 0.5).setAlpha(0.6);
            fondo.polvo.push({ o: po, vy: -4 - rnd() * 8, vx: (rnd() - 0.5) * 6, fase: rnd() * 6 });
        }
    }

    function actualizarFondo(t, dt) {
        if (!fondo) return;
        var s = t / 1000;
        fondo.titilan.forEach(function (st) { st.o.setAlpha(0.25 + 0.75 * Math.abs(Math.sin(s * st.f + st.fase))); });
        fondo.planetas.forEach(function (p) {
            p.o.y = p.y + Math.sin(s * p.f) * 6;
            p.o.rotation = Math.sin(s * 0.2) * p.giro;
        });
        var k = dt / 1000;
        fondo.rocas.forEach(function (r) {
            r.o.x += r.vx * k;
            r.o.y += r.vy * k;
            r.o.rotation += r.vr * k;
            if (r.o.x < -120) r.o.x = W + 100;
            if (r.o.x > W + 120) r.o.x = -100;
            if (r.o.y < -120) r.o.y = H + 100;
            if (r.o.y > H + 120) r.o.y = -100;
        });
        fondo.polvo.forEach(function (p) {
            p.o.y += p.vy * k;
            p.o.x += p.vx * k + Math.sin(s + p.fase) * 0.1;
            if (p.o.y < -20) { p.o.y = H + 10; p.o.x = Math.random() * W; }
        });
        if (t > fondo.tFugaz && !reducido) {
            fondo.tFugaz = t + 5000 + Math.random() * 6000;
            fugaz();
        }
    }

    function fugaz() {
        var x0 = W * (0.1 + Math.random() * 0.6), y0 = H * (0.03 + Math.random() * 0.25);
        var o = sc.add.image(x0, y0, "fx-estela").setDepth(0.9).setBlendMode(ADD).setTint(0xe0f2fe).setScale(2.4, 0.6).setRotation(0.45);
        sc.tweens.add({ targets: o, x: x0 + 300, y: y0 + 150, alpha: 0, duration: 900, ease: "Quad.easeIn" });
        destruirLuego(o, 1000);
    }

    // ------------------------------------------------------------------ el tablero (plataforma, piso, muros)

    function poli(x, pts) {
        x.beginPath();
        pts.forEach(function (p, i) { if (i) x.lineTo(p.x, p.y); else x.moveTo(p.x, p.y); });
        x.closePath();
    }

    /** Plataforma flotante + piso de los caminos con neón (lienzo estático del tamaño del mundo). */
    function lienzoTablero(l) {
        var c = document.createElement("canvas");
        c.width = Math.round(W * RES);
        c.height = Math.round(H * RES);
        var x = c.getContext("2d");
        x.scale(RES, RES);
        var rnd = azar(31 + l.cols * 7);
        var e = 0.42, T = 0.5;
        var u0 = -e, u1 = l.cols + e, v0 = -e, v1 = l.filas + e;

        // caras inferiores de la losa: bordes dentados y estalactitas
        var cara = function (desde, hasta, fijo, porU, color1, color2) {
            var arriba = [], abajo = [];
            var n = Math.max(2, Math.round(Math.abs(hasta - desde) * 3));
            for (var k = 0; k <= n; k++) {
                var t = desde + (hasta - desde) * k / n;
                var p = porU ? [t, fijo] : [fijo, t];
                arriba.push(iso(p[0], p[1], 0));
                var prof2 = T + rnd() * 0.25 + (k % 3 === 1 ? rnd() * 0.9 : 0);
                abajo.push(iso(p[0], p[1], -prof2));
            }
            var pts = arriba.concat(abajo.reverse());
            var a = arriba[0], b = arriba[arriba.length - 1];
            var g = x.createLinearGradient(0, Math.min(a.y, b.y), 0, Math.max(a.y, b.y) + geo.Z * 1.3);
            g.addColorStop(0, color1);
            g.addColorStop(1, color2);
            x.fillStyle = g;
            poli(x, pts);
            x.fill();
            x.strokeStyle = "rgba(167,139,250,0.35)";
            x.lineWidth = 1.5;
            x.stroke();
            // grietas y cristales
            for (var q = 0; q < n; q++) {
                var t2 = desde + (hasta - desde) * rnd();
                var pp = porU ? [t2, fijo] : [fijo, t2];
                var s0 = iso(pp[0], pp[1], -0.08 - rnd() * 0.2);
                x.strokeStyle = "rgba(20,16,48,0.6)";
                x.lineWidth = 1.5;
                x.beginPath();
                x.moveTo(s0.x, s0.y);
                x.lineTo(s0.x + (rnd() - 0.5) * 14, s0.y + 10 + rnd() * 14);
                x.lineTo(s0.x + (rnd() - 0.5) * 14, s0.y + 22 + rnd() * 10);
                x.stroke();
                if (rnd() < 0.35) {
                    x.fillStyle = rnd() < 0.5 ? "rgba(103,232,249,0.85)" : "rgba(244,114,182,0.85)";
                    x.shadowColor = x.fillStyle;
                    x.shadowBlur = 10;
                    x.beginPath();
                    x.moveTo(s0.x, s0.y + 4);
                    x.lineTo(s0.x + 4, s0.y + 14);
                    x.lineTo(s0.x, s0.y + 22);
                    x.lineTo(s0.x - 4, s0.y + 14);
                    x.closePath();
                    x.fill();
                    x.shadowBlur = 0;
                }
            }
        };
        cara(u0, u1, v1, true, "#3f3a72", "#120e2c");
        cara(v1, v0, u1, false, "#2e2a5c", "#0d0a24");

        // tapa de la losa
        var tapa = [iso(u0, v0, 0), iso(u1, v0, 0), iso(u1, v1, 0), iso(u0, v1, 0)];
        var gt = x.createLinearGradient(tapa[0].x, tapa[0].y, tapa[2].x, tapa[2].y);
        gt.addColorStop(0, "#2c2858");
        gt.addColorStop(1, "#211d47");
        x.fillStyle = gt;
        poli(x, tapa);
        x.fill();
        x.strokeStyle = "rgba(196,181,253,0.55)";
        x.lineWidth = 2;
        x.stroke();
        for (var m = 0; m < 160; m++) {
            var sp = iso(u0 + rnd() * (u1 - u0), v0 + rnd() * (v1 - v0), 0);
            x.fillStyle = rnd() < 0.5 ? "rgba(15,12,40,0.35)" : "rgba(167,139,250,0.12)";
            x.beginPath();
            x.ellipse(sp.x, sp.y, 2 + rnd() * 5, 1 + rnd() * 2.5, 0, 0, Math.PI * 2);
            x.fill();
        }

        // piso de los caminos
        l.listaCeldas.forEach(function (cel) {
            var r = bordesCelda(l, cel.i, cel.j, false);
            var pts = [iso(r.u0, r.v0, 0), iso(r.u1, r.v0, 0), iso(r.u1, r.v1, 0), iso(r.u0, r.v1, 0)];
            x.fillStyle = "#0a1038";
            poli(x, pts);
            x.fill();
        });
        // resplandor del centro de los caminos
        x.lineCap = "round";
        x.lineJoin = "round";
        [[geo.A * 0.75, "rgba(56,189,248,0.10)"], [geo.A * 0.4, "rgba(56,189,248,0.12)"]].forEach(function (capa) {
            x.strokeStyle = capa[1];
            x.lineWidth = capa[0];
            l.tramos.forEach(function (t) {
                var a = l.nodos[t.a], b = l.nodos[t.b];
                var pa = iso(a.x, a.y, 0), pb = iso(b.x, b.y, 0);
                x.beginPath();
                x.moveTo(pa.x, pa.y);
                x.lineTo(pb.x, pb.y);
                x.stroke();
            });
        });
        // línea central punteada
        x.setLineDash([geo.A * 0.12, geo.A * 0.22]);
        x.strokeStyle = "rgba(244,114,182,0.55)";
        x.lineWidth = 2.5;
        l.tramos.forEach(function (t) {
            var a = l.nodos[t.a], b = l.nodos[t.b];
            var pa = iso(a.x, a.y, 0), pb = iso(b.x, b.y, 0);
            x.beginPath();
            x.moveTo(pa.x, pa.y);
            x.lineTo(pb.x, pb.y);
            x.stroke();
        });
        x.setLineDash([]);
        // bordes de neón: cian en un sentido, rosa en el otro (iguales en todos los caminos)
        var esC = function (i, j) { return R.esCamino(l, i, j); };
        var bordePortal = ladoPortal(l);
        l.listaCeldas.forEach(function (cel) {
            var i = cel.i, j = cel.j, k = 0.05;
            var r = bordesCelda(l, i, j, false);
            var lados = [
                { n: [i, j - 1], a: [r.u0 + k, r.v0 + k], b: [r.u1 - k, r.v0 + k], color: "#22d3ee" },
                { n: [i, j + 1], a: [r.u0 + k, r.v1 - k], b: [r.u1 - k, r.v1 - k], color: "#22d3ee" },
                { n: [i - 1, j], a: [r.u0 + k, r.v0 + k], b: [r.u0 + k, r.v1 - k], color: "#f472b6" },
                { n: [i + 1, j], a: [r.u1 - k, r.v0 + k], b: [r.u1 - k, r.v1 - k], color: "#f472b6" }
            ];
            lados.forEach(function (ld) {
                if (esC(ld.n[0], ld.n[1])) return;
                if (bordePortal && bordePortal.i === ld.n[0] && bordePortal.j === ld.n[1]) return;
                var pa = iso(ld.a[0], ld.a[1], 0), pb = iso(ld.b[0], ld.b[1], 0);
                x.shadowColor = ld.color;
                x.shadowBlur = 12;
                x.strokeStyle = ld.color;
                x.lineWidth = 3;
                x.beginPath();
                x.moveTo(pa.x, pa.y);
                x.lineTo(pb.x, pb.y);
                x.stroke();
                x.shadowBlur = 0;
                x.strokeStyle = "rgba(255,255,255,0.75)";
                x.lineWidth = 1;
                x.stroke();
            });
        });
        return c;
    }

    /** La celda (fuera del pasillo) hacia donde se abre el portal. */
    function ladoPortal(l) {
        var P = l.nodos[l.portal];
        if (!P || !P.vecinos.length) return null;
        var V = l.nodos[P.vecinos[0]];
        var di = Math.sign(P.i - V.i), dj = Math.sign(P.j - V.j);
        return { i: P.i + di, j: P.j + dj, di: di, dj: dj };
    }

    /** Muros: un bloque de roca por cada celda que no es camino, agrupados por diagonal (orden de profundidad). */
    function crearParedes(l) {
        paredes = [];
        var rnd = azar(97 + l.filas * 3);
        var porDiag = {};
        for (var j = 0; j < l.filas; j++) {
            for (var i = 0; i < l.cols; i++) {
                if (R.esCamino(l, i, j)) continue;
                var k = i + j;
                (porDiag[k] = porDiag[k] || []).push({ i: i, j: j, h: 0.36 + rnd() * 0.16, r: rnd });
            }
        }
        Object.keys(porDiag).map(Number).sort(function (a, b) { return a - b; }).forEach(function (k) {
            var g = sc.add.graphics().setDepth(prof(k + 1));
            porDiag[k].forEach(function (b) { dibujarBloque(g, l, b, rnd); });
            g.diag = k;
            paredes.push(g);
            objLab.push(g);
        });
    }

    function dibujarBloque(g, l, b, rnd) {
        var i = b.i, j = b.j, h = b.h;
        var r = bordesCelda(l, i, j, true);
        // el bloque se dibuja en coordenadas 0..1 de su celda, adelgazado hacia los caminos
        var P = function (u, v, z) { return iso(r.u0 + (u - i) * (r.u1 - r.u0), r.v0 + (v - j) * (r.v1 - r.v0), z); };
        // cara +v (abajo a la izquierda) y cara +u (abajo a la derecha)
        g.fillStyle(0x3f3a78, 1);
        g.fillPoints([P(i, j + 1, 0), P(i + 1, j + 1, 0), P(i + 1, j + 1, h), P(i, j + 1, h)], true);
        g.fillStyle(0x2a2556, 1);
        g.fillPoints([P(i + 1, j, 0), P(i + 1, j + 1, 0), P(i + 1, j + 1, h), P(i + 1, j, h)], true);
        // vetas en las caras
        g.lineStyle(1.5, 0x1b1740, 0.55);
        var a = P(i + 0.25 + rnd() * 0.5, j + 1, h * (0.3 + rnd() * 0.5));
        g.lineBetween(a.x, a.y, a.x + 6, a.y + 9);
        // tapa con borde biselado
        var tapa = [P(i, j, h), P(i + 1, j, h), P(i + 1, j + 1, h), P(i, j + 1, h)];
        g.fillStyle(0x5b5596, 1);
        g.fillPoints(tapa, true);
        g.fillStyle(0x6b65a8, 1);
        g.fillPoints([P(i + 0.12, j + 0.12, h), P(i + 0.88, j + 0.12, h), P(i + 0.88, j + 0.88, h), P(i + 0.12, j + 0.88, h)], true);
        // cráteres
        for (var q = 0; q < 2; q++) {
            var c = P(i + 0.25 + rnd() * 0.5, j + 0.25 + rnd() * 0.5, h);
            g.fillStyle(0x433d7c, 0.9);
            g.fillEllipse(c.x, c.y, geo.A * (0.14 + rnd() * 0.12), geo.B * (0.14 + rnd() * 0.1));
        }
        g.lineStyle(1.5, 0x8b85c8, 0.6);
        g.strokePoints(tapa, true);
        // neón en el borde de la tapa que da a un camino
        var bordes = [
            { n: [i, j - 1], a: [i, j], b: [i + 1, j], c: CIAN },
            { n: [i, j + 1], a: [i, j + 1], b: [i + 1, j + 1], c: CIAN },
            { n: [i - 1, j], a: [i, j], b: [i, j + 1], c: ROSA },
            { n: [i + 1, j], a: [i + 1, j], b: [i + 1, j + 1], c: ROSA }
        ];
        bordes.forEach(function (bd) {
            if (!R.esCamino(l, bd.n[0], bd.n[1])) return;
            var p1 = P(bd.a[0], bd.a[1], h), p2 = P(bd.b[0], bd.b[1], h);
            g.lineStyle(7, bd.c, 0.22);
            g.lineBetween(p1.x, p1.y, p2.x, p2.y);
            g.lineStyle(2.5, bd.c, 0.95);
            g.lineBetween(p1.x, p1.y, p2.x, p2.y);
        });
    }

    // ------------------------------------------------------------------ llaves, barreras y portal

    function crearLlaves(l) {
        llaves = {};
        l.llaves.forEach(function (L) {
            var n = l.nodos[L.nodo];
            var col = hexARgb(L.color).n;
            var base = iso(n.x, n.y, 0);
            var o = {
                L: L, x: n.x, y: n.y, color: col, estado: "dormida", fase: Math.random() * 6, extra: 0,
                pedestal: sc.add.image(base.x, base.y, "fx-anillo").setDepth(prof(n.x + n.y) - 0.6).setBlendMode(ADD).setTint(col).setAlpha(0.5),
                haz: sc.add.image(base.x, base.y, "fx-haz").setOrigin(0.5, 1).setDepth(profAlto(n.x + n.y) - 0.3).setBlendMode(ADD).setTint(col).setAlpha(0),
                brillo: sc.add.image(base.x, base.y, "fx-halo").setDepth(profAlto(n.x + n.y) - 0.2).setBlendMode(ADD).setTint(col).setAlpha(0.5),
                img: sc.add.image(base.x, base.y, "llave-" + L.id).setDepth(profAlto(n.x + n.y)),
                burbuja: sc.add.image(base.x, base.y, "fx-burbuja").setDepth(profAlto(n.x + n.y) + 0.1).setAlpha(0.85),
                z: 0.95, escala: 1.05 * geo.Z / 190
            };
            o.pedestal.setDisplaySize(geo.A * 1.1, geo.B * 1.1);
            o.haz.setDisplaySize(geo.A * 0.9, geo.Z * 3.2);
            objLab.push(o.pedestal, o.haz, o.brillo, o.img, o.burbuja);
            llaves[L.id] = o;
        });
    }

    function actualizarLlaves(t) {
        var s = t / 1000;
        Object.keys(llaves).forEach(function (id) {
            var o = llaves[id];
            if (o.estado === "orbita" || o.estado === "candado" || o.estado === "volando") return;
            var p = iso(o.x, o.y, o.z + Math.sin(s * 2 + o.fase) * 0.06);
            var activa = o.estado === "activa";
            var giro = Math.cos(s * (activa ? 2.2 : 1.1) + o.fase);
            o.img.setPosition(p.x, p.y).setScale(o.escala * Math.max(0.16, Math.abs(giro)) * (1 + o.extra * 0.25), o.escala * (1 + o.extra * 0.25));
            o.img.setFlipX(giro < 0);
            o.img.setAlpha(visLab * (o.estado === "dormida" ? 0.72 : 1));
            o.brillo.setPosition(p.x, p.y).setScale((activa ? 1.15 : 0.7) * geo.A / 64 * (1 + 0.15 * Math.sin(s * 3) + o.extra))
                .setAlpha(visLab * (activa ? 0.8 : 0.35));
            o.burbuja.setPosition(p.x, p.y).setDisplaySize(geo.A * 1.45, geo.A * 1.45).setAlpha(visLab * (o.estado === "dormida" ? 0.8 : 0));
            o.haz.setAlpha(visLab * (activa ? 0.3 + 0.18 * Math.sin(s * 2.4) + o.extra * 0.4 : 0));
            o.pedestal.setAlpha(visLab * (activa ? 0.85 : 0.4));
            o.extra = Math.max(0, o.extra - 0.02);
        });
    }

    function puntoPortal(l) {
        var P = l.nodos[l.portal];
        var lp = ladoPortal(l) || { di: 1, dj: 0 };
        return { x: P.x + lp.di * 1.05, y: P.y + lp.dj * 1.05, z: 1.0, nodo: P };
    }

    function crearPortal(l) {
        var pp = puntoPortal(l);
        var c = iso(pp.x, pp.y, pp.z);
        var d = profAlto(pp.nodo.x + pp.nodo.y) + 0.8;
        var r = geo.A * 0.95;
        var base = iso(pp.x, pp.y, 0);
        portal = {
            x: pp.x, y: pp.y, z: pp.z, cx: c.x, cy: c.y, r: r, actividad: 0, objetivo: 0.15, abierto: false, giro: 0,
            roca: sc.add.image(base.x, base.y + geo.Z * 0.2, "roca-2").setDepth(d - 0.3).setDisplaySize(r * 2.1, r * 1.3),
            fondo: sc.add.image(c.x, c.y, "fx-halo").setDepth(d).setBlendMode(ADD).setTint(VIOLETA).setDisplaySize(r * 4, r * 4).setAlpha(0.5),
            nucleo: sc.add.image(c.x, c.y, "portal-nucleo").setDepth(d + 0.01).setDisplaySize(r * 2, r * 2.15).setAlpha(0.5),
            remolino: sc.add.image(c.x, c.y, "portal-remolino").setDepth(d + 0.02).setBlendMode(ADD).setDisplaySize(r * 2, r * 2.15).setAlpha(0.35),
            campo: sc.add.image(c.x, c.y, "portal-campo").setDepth(d + 0.03).setDisplaySize(r * 2, r * 2.15).setAlpha(0.9),
            aro: sc.add.image(c.x, c.y, "portal-aro").setDepth(d + 0.04).setDisplaySize(r * 2.25, r * 2.4),
            candados: [],
            particulas: []
        };
        objLab.push(portal.roca, portal.fondo, portal.nucleo, portal.remolino, portal.campo, portal.aro);
        l.llaves.forEach(function (L, k) {
            var cx = c.x + (k - 1) * r * 0.95, cy = c.y - r * 1.25 - (k === 1 ? r * 0.18 : 0);
            var brillo = sc.add.image(cx, cy, "fx-halo").setDepth(d + 0.05).setBlendMode(ADD).setTint(hexARgb(L.color).n).setScale(r / 90).setAlpha(0);
            var img = sc.add.image(cx, cy, "candado-" + L.id).setDepth(d + 0.06).setDisplaySize(r * 0.62, r * 0.71).setTint(0x8f8fb0).setAlpha(0.85);
            portal.candados.push({ id: L.id, x: cx, y: cy, img: img, brillo: brillo, estado: "apagado" });
            objLab.push(brillo, img);
        });
    }

    function actualizarPortal(t, dt) {
        if (!portal) return;
        var s = t / 1000;
        portal.actividad += (portal.objetivo - portal.actividad) * Math.min(1, dt / 600);
        var a = portal.actividad;
        portal.giro += dt / 1000 * (0.4 + a * 3.2);
        portal.remolino.setRotation(portal.giro).setAlpha(visLab * (0.3 + a * 0.6));
        portal.nucleo.setAlpha(visLab * (0.45 + a * 0.5)).setScale(portal.nucleo.scaleX, portal.nucleo.scaleY);
        portal.fondo.setAlpha(visLab * (0.35 + a * 0.5 + 0.08 * Math.sin(s * 2)));
        portal.aro.setRotation(-portal.giro * 0.25).setAlpha(visLab);
        portal.roca.setAlpha(visLab);
        portal.campo.setAlpha(visLab * (portal.abierto ? 0 : 0.75 + 0.15 * Math.sin(s * 3)));
        portal.candados.forEach(function (cd, k) {
            if (cd.estado === "abierto") return;
            var bob = Math.sin(s * 1.6 + k) * 3;
            cd.img.setPosition(cd.x, cd.y + bob).setAlpha(visLab * (cd.estado === "apagado" ? 0.8 : 1));
            cd.brillo.setPosition(cd.x, cd.y + bob).setAlpha(visLab * (cd.estado === "encendido" ? 0.6 + 0.25 * Math.sin(s * 3 + k) : 0));
        });
        // partículas que el remolino absorbe (más con más actividad)
        if (visLab > 0.5 && Math.random() < 0.08 + a * 0.4) {
            var ang = Math.random() * Math.PI * 2;
            var p = sc.add.image(portal.cx + Math.cos(ang) * portal.r * 1.4, portal.cy + Math.sin(ang) * portal.r * 1.4, "fx-punto")
                .setDepth(portal.aro.depth + 0.01).setBlendMode(ADD).setTint(NEON[Math.floor(Math.random() * 3)]).setScale(0.8);
            sc.tweens.add({ targets: p, x: portal.cx, y: portal.cy, scale: 0.1, alpha: 0.2, duration: 900, ease: "Quad.easeIn" });
            destruirLuego(p, 950);
        }
    }

    function encenderCandado(id) {
        if (!portal) return;
        portal.candados.forEach(function (cd) {
            if (cd.id !== id || cd.estado !== "apagado") return;
            cd.estado = "encendido";
            cd.img.clearTint();
            onda(cd.x, cd.y, hexARgb(COLORES_LLAVE[id] || "#ffffff").n, 0.6);
            sc.tweens.add({ targets: cd.img, scaleX: cd.img.scaleX * 1.3, scaleY: cd.img.scaleY * 1.3, duration: 220, yoyo: true, ease: "Quad.easeOut" });
        });
        portal.objetivo = Math.min(0.75, 0.15 + portal.candados.filter(function (c) { return c.estado !== "apagado"; }).length * 0.18);
    }

    /** Barrera espacial suave al final de un camino sin salida (aparece al llegar y queda tenue después). */
    function barrera(id) {
        if (!lab || !lab.nodos[id]) return;
        var b = barreras[id];
        if (!b) {
            var n = lab.nodos[id];
            var v = lab.nodos[n.vecinos[0]];
            var dx = Math.sign(n.x - v.x), dy = Math.sign(n.y - v.y);
            var fondo2 = 0.47 + ensanche();
            var qx = n.x + dx * fondo2, qy = n.y + dy * fondo2;
            var px = -dy * 0.5, py = dx * 0.5;
            var g = sc.add.graphics().setDepth(prof(qx + qy) + 0.3).setBlendMode(ADD);
            var hz = 0.95;
            var esq = [iso(qx - px, qy - py, 0), iso(qx + px, qy + py, 0), iso(qx + px, qy + py, hz), iso(qx - px, qy - py, hz)];
            g.fillStyle(0x38bdf8, 0.25);
            g.fillPoints(esq, true);
            for (var k = 1; k < 6; k++) {
                var a1 = iso(qx - px, qy - py, hz * k / 6), a2 = iso(qx + px, qy + py, hz * k / 6);
                g.lineStyle(2, k % 2 ? 0x67e8f9 : 0xc084fc, 0.7);
                g.lineBetween(a1.x, a1.y, a2.x, a2.y);
            }
            for (var m = 1; m < 4; m++) {
                var b1 = iso(qx - px + px * 2 * m / 4, qy - py + py * 2 * m / 4, 0), b2 = iso(qx - px + px * 2 * m / 4, qy - py + py * 2 * m / 4, hz);
                g.lineStyle(1.5, 0x67e8f9, 0.5);
                g.lineBetween(b1.x, b1.y, b2.x, b2.y);
            }
            g.lineStyle(4, 0xe0f2fe, 0.9);
            g.strokePoints(esq, true);
            g.setAlpha(0);
            b = barreras[id] = { g: g, x: qx, y: qy, base: 0 };
            objLab.push(g);
        }
        b.base = 0.35;
        b.g.setAlpha(1);
        var c = iso(b.x, b.y, 0.45);
        onda(c.x, c.y, 0x67e8f9, 0.7);
        for (var i = 0; i < 6; i++) chispa(c.x, c.y, i % 2 ? 0x67e8f9 : 0xc084fc, 0.7);
        sc.tweens.add({ targets: b.g, alpha: b.base, duration: 1400, delay: 500, ease: "Quad.easeOut" });
    }

    // ------------------------------------------------------------------ pulsos de energía por los caminos

    function crearPulsos(l) {
        pulsos = [];
        l.tramos.forEach(function (t, k) {
            var img = sc.add.image(0, 0, "fx-punto").setBlendMode(ADD).setTint(k % 2 ? CIAN : ROSA).setScale(1.1).setDepth(3);
            pulsos.push({ t: t, img: img, u: Math.random(), v: (0.25 + Math.random() * 0.25) / Math.max(1, t.largo) * (Math.random() < 0.5 ? 1 : -1) });
            objLab.push(img);
        });
    }

    function actualizarPulsos(dt) {
        pulsos.forEach(function (p) {
            p.u += p.v * dt / 1000;
            if (p.u > 1 || p.u < 0) { p.v = -p.v; p.u = clamp(p.u, 0, 1); }
            var a = lab.nodos[p.t.a], b = lab.nodos[p.t.b];
            var q = iso(lerp(a.x, b.x, p.u), lerp(a.y, b.y, p.u), 0.02);
            p.img.setPosition(q.x, q.y).setAlpha(visLab * 0.5).setDepth(prof(lerp(a.x, b.x, p.u) + lerp(a.y, b.y, p.u)) - 0.7);
        });
    }

    // ------------------------------------------------------------------ cargar / quitar un laberinto

    function descargar() {
        objLab.forEach(function (o) { if (o && o.active) o.destroy(); });
        objLab = [];
        paredes = [];
        llaves = {};
        barreras = {};
        pulsos = [];
        portal = null;
        orbita.forEach(function (o) { if (o.img && o.img.active) o.img.destroy(); if (o.brillo && o.brillo.active) o.brillo.destroy(); });
        orbita = [];
    }

    function cargarLaberinto(l, opciones) {
        opciones = opciones || {};
        descargar();
        lab = l;
        geo = geometria(l);
        conteoTablero++;
        var clave = "tablero-" + (conteoTablero % 2);
        reemplazarCanvas(clave, lienzoTablero(l));
        var piso = sc.add.image(W / 2, H / 2, clave).setDepth(2).setScale(1 / RES);
        objLab.push(piso);
        crearPulsos(l);
        crearParedes(l);
        crearLlaves(l);
        crearPortal(l);
        var S = l.nodos[l.inicio];
        var ps = iso(S.x, S.y, 1.25);
        var etiqueta = sc.add.text(ps.x, ps.y - geo.Z * 0.2, global.EscenarioMapa.textoInicio || "¡Inicia aquí!", {
            fontFamily: "Fredoka, sans-serif", fontSize: Math.round(geo.A * 0.42) + "px", fontStyle: "bold", color: "#fef08a", stroke: "#0b1024", strokeThickness: 6
        }).setOrigin(0.5, 1).setDepth(900);
        var pp = puntoPortal(l);
        var ptxt = iso(pp.x, pp.y, 0);
        var etiquetaPortal = sc.add.text(ptxt.x + geo.A * 0.2, ptxt.y + geo.Z * 0.35, global.EscenarioMapa.textoPortal || "¡Portal!", {
            fontFamily: "Fredoka, sans-serif", fontSize: Math.round(geo.A * 0.4) + "px", fontStyle: "bold", color: "#f5d0fe", stroke: "#0b1024", strokeThickness: 6
        }).setOrigin(0.5, 0).setDepth(900);
        objLab.push(etiqueta, etiquetaPortal);
        pil.visible = false;
        pil.zona = null;
        pil.zonaClave = "";
        pil.rastro = [];
        ponerNave(l.inicio);
        if (nave) nave.objs.forEach(function (o) { o.setVisible(false); });
        escalaNave();
        if (!opciones.animar) {
            visLab = 1;
            return Promise.resolve();
        }
        // aparece: el piso se enciende y los muros brotan diagonal por diagonal
        visLab = 0;
        piso.setAlpha(0);
        paredes.forEach(function (g) { g.setAlpha(0); });
        etiqueta.setAlpha(0);
        etiquetaPortal.setAlpha(0);
        return animar(reducido ? 100 : 1500, function (e) {
            piso.setAlpha(Math.min(1, e * 2));
            var n = paredes.length;
            paredes.forEach(function (g, k) { g.setAlpha(clamp(e * 1.6 * n / Math.max(1, n) - k / n * 0.6, 0, 1)); });
            visLab = clamp((e - 0.5) * 2, 0, 1);
            etiqueta.setAlpha(visLab);
            etiquetaPortal.setAlpha(visLab);
        }).then(function () {
            paredes.forEach(function (g) { g.setAlpha(1); });
            visLab = 1;
        });
    }

    function ocultarLaberinto() {
        if (!lab) return Promise.resolve();
        var objs = objLab.slice();
        if (nave) nave.objs.forEach(function (o) { o.setVisible(false); });
        pil.visible = false;
        return animar(500, function (e) {
            visLab = 1 - e;
            // lo que se repinta cada cuadro (llaves, portal, pulsos) sigue a visLab; lo demás se desvanece aquí
            objs.forEach(function (o) { if (o && o.active && o.setAlpha) o.setAlpha(1 - e); });
        });
    }

    // ------------------------------------------------------------------ la nave

    function crearNave() {
        var tieneSprites = cargarNave3d();
        nave = {
            es3d: tieneSprites,
            sombra: sc.add.image(0, 0, "fx-halo").setTint(0x000000).setAlpha(0.45),
            halo: sc.add.image(0, 0, "fx-halo").setBlendMode(ADD).setTint(0x67e8f9).setAlpha(0.35),
            llama: sc.add.image(0, 0, "fx-halo").setBlendMode(ADD).setTint(0xff9a3c),
            llama2: sc.add.image(0, 0, "fx-punto").setBlendMode(ADD).setTint(0xfff3c4),
            spr: tieneSprites ? sc.add.image(0, 0, "nave-3d", 0) : sc.add.image(0, 0, "nave-2d"),
            rastro: sc.add.graphics().setBlendMode(ADD),
            tParticula: 0
        };
        nave.objs = [nave.sombra, nave.halo, nave.llama, nave.llama2, nave.spr, nave.rastro];
        nave.objs.forEach(function (o) { o.setVisible(false); });
        if (!tieneSprites) {
            global.addEventListener("nave-sprites-listos", function () { cargarNave3d(); });
        }
    }

    function escalaNave() {
        if (!nave) return;
        var S = global.NaveSprites;
        if (nave.es3d && S) {
            nave.escalaBase = S.celdasPorUnidad * Math.SQRT2 * geo.A / S.pxPorUnidad;
        } else {
            nave.escalaBase = geo.A * 1.25 / 200;
        }
    }

    function ponerNave(id) {
        var n = lab && lab.nodos[id];
        if (!n) return;
        pil.x = n.x;
        pil.y = n.y;
        pil.objetivo = null;
        pil.arrastrando = false;
        var V = n.vecinos[0] && lab.nodos[n.vecinos[0]];
        if (V) pil.ang = pil.angObj = Math.atan2(V.y - n.y, V.x - n.x);
    }

    function actualizarNave(t, dt) {
        if (!nave) return;
        var vis = pil.visible;
        nave.objs.forEach(function (o) { o.setVisible(vis); });
        if (!vis) return;
        var s = t / 1000;
        pil.ang += difAng(pil.ang, pil.angObj) * Math.min(1, dt / 1000 * 9);
        pil.temblor = Math.max(0, pil.temblor - dt / 400);
        var tx = pil.temblor ? Math.sin(t / 25) * pil.temblor * 0.05 : 0;
        var z = HOVER + Math.sin(s * 2.2) * 0.05 * (1 - pil.empuje * 0.6);
        var p = iso(pil.x + tx, pil.y - tx, z);
        var d = profAlto(pil.x + pil.y) + 0.5;
        var esc = nave.escalaBase * pil.escala;
        if (nave.es3d) {
            nave.spr.setFrame(cuadroNave(pil.ang));
            nave.spr.setPosition(p.x, p.y).setScale(esc).setRotation(0);
        } else {
            var q = iso(pil.x + Math.cos(pil.ang), pil.y + Math.sin(pil.ang), z);
            var ra = Math.atan2(q.y - p.y, q.x - p.x);
            nave.spr.setPosition(p.x, p.y).setScale(esc).setRotation(ra);
        }
        nave.spr.setDepth(d);
        var suelo = iso(pil.x, pil.y, 0);
        nave.sombra.setPosition(suelo.x, suelo.y).setDisplaySize(geo.A * 1.1 * pil.escala, geo.B * 1.0 * pil.escala).setDepth(prof(pil.x + pil.y) - 0.3).setAlpha(0.45 * pil.escala);
        nave.halo.setPosition(suelo.x, suelo.y).setDisplaySize(geo.A * 1.4 * pil.escala, geo.B * 1.3 * pil.escala).setDepth(prof(pil.x + pil.y) - 0.25)
            .setAlpha((0.25 + 0.1 * Math.sin(s * 3)) * pil.escala);
        // llama del motor detrás de la nave
        var rx = pil.x - Math.cos(pil.ang) * 0.5 * pil.escala, ry = pil.y - Math.sin(pil.ang) * 0.5 * pil.escala;
        var rp = iso(rx, ry, z - 0.02);
        var fuerza = 0.35 + pil.empuje * 0.9 + Math.sin(t / 40) * 0.06;
        var dl = profAlto(rx + ry) + 0.45;
        nave.llama.setPosition(rp.x, rp.y).setScale(geo.A / 128 * fuerza * 0.9 * pil.escala).setAlpha(0.85).setDepth(dl);
        nave.llama2.setPosition(rp.x, rp.y).setScale(geo.A / 16 * fuerza * 0.28 * pil.escala).setAlpha(0.95).setDepth(dl + 0.01);
        // partículas de los propulsores
        if (pil.empuje > 0.08 && t > nave.tParticula) {
            nave.tParticula = t + 45;
            var part = sc.add.image(rp.x, rp.y, "fx-punto").setBlendMode(ADD).setTint(Math.random() < 0.5 ? 0xffb347 : 0x67e8f9).setScale(0.9 + Math.random()).setDepth(dl - 0.02);
            var back = iso(rx - Math.cos(pil.ang) * 0.5, ry - Math.sin(pil.ang) * 0.5, z - 0.05);
            sc.tweens.add({ targets: part, x: back.x + (Math.random() - 0.5) * 10, y: back.y + (Math.random() - 0.5) * 10, alpha: 0, scale: 0.2, duration: 420, ease: "Quad.easeOut" });
            destruirLuego(part, 480);
        }
        // estela luminosa
        var ult = pil.rastro[pil.rastro.length - 1];
        if (!ult || Math.hypot(ult.x - pil.x, ult.y - pil.y) > 0.06) pil.rastro.push({ x: pil.x, y: pil.y, t: t });
        while (pil.rastro.length && (t - pil.rastro[0].t > 650 || pil.rastro.length > 40)) pil.rastro.shift();
        var g = nave.rastro;
        g.clear();
        g.setDepth(d - 0.6);
        for (var i = 1; i < pil.rastro.length; i++) {
            var a = pil.rastro[i - 1], b = pil.rastro[i];
            var k = i / pil.rastro.length;
            var pa = iso(a.x, a.y, z - 0.05), pb = iso(b.x, b.y, z - 0.05);
            g.lineStyle(geo.A * 0.22 * k, 0x67e8f9, 0.35 * k);
            g.lineBetween(pa.x, pa.y, pb.x, pb.y);
            g.lineStyle(geo.A * 0.07 * k, 0xffffff, 0.6 * k);
            g.lineBetween(pa.x, pa.y, pb.x, pb.y);
        }
        // llaves en órbita
        orbita.forEach(function (o, k) {
            var ang = s * 1.7 + k * Math.PI * 2 / 3;
            var ox = pil.x + Math.cos(ang) * 0.62 * pil.escala, oy = pil.y + Math.sin(ang) * 0.62 * pil.escala;
            var oz = z + 0.18 + Math.sin(s * 3 + k) * 0.05;
            var op = iso(ox, oy, oz);
            var dd = profAlto(ox + oy) + 0.5;
            if (o.libre) return;
            o.img.setPosition(op.x, op.y).setDepth(dd).setScale(o.escala * pil.escala * Math.max(0.3, Math.abs(Math.cos(s * 3 + k))), o.escala * pil.escala).setRotation(Math.sin(s * 2 + k) * 0.25);
            o.brillo.setPosition(op.x, op.y).setDepth(dd - 0.01).setScale(geo.A / 128 * 0.9 * pil.escala).setAlpha(0.55 + 0.25 * Math.sin(s * 4 + k));
            o.wx = op.x;
            o.wy = op.y;
        });
    }

    function aparecerNave() {
        if (!lab) return Promise.resolve();
        ponerNave(lab.inicio);
        pil.visible = true;
        pil.escala = 0.01;
        var c = iso(pil.x, pil.y, HOVER);
        onda(c.x, c.y, CIAN, 1);
        chispasFiesta(c.x, c.y, 14, 0.9);
        return animar(700, function (e) { pil.escala = Math.max(0.01, e); }, function (u) {
            var c1 = 1.70158, c3 = c1 + 1;
            return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
        }).then(function () { pil.escala = 1; });
    }

    // ------------------------------------------------------------------ movimiento (arrastre y demo)

    function actualizarPiloto(ahora, dt) {
        if (!lab || !pil.visible || pil.bloqueado || !pil.objetivo) {
            pil.empuje += (0 - pil.empuje) * 0.15;
            return;
        }
        var factor = pil.zona && pil.zona.tipo === "cruce" ? (Number(cfgJ.frenoCruce) || 0.62) : 1;
        if (pil.auto) factor *= Number(cfgJ.velocidadDemo) || 0.55;
        var velMax = Number(cfgJ.velocidadMax) || 8;
        // la nave sigue al dedo por los caminos (dobla las esquinas sola); la demo usa el mismo movimiento
        var res = R.guiar(lab, pil, pil.objetivo, dt, { velMax: velMax, factor: factor });
        var dx = res.x - pil.x, dy = res.y - pil.y;
        pil.x = res.x;
        pil.y = res.y;
        var v = dt > 0 ? res.avance / dt * 1000 / velMax : 0;
        pil.empuje += (clamp(v * 1.4, 0, 1) - pil.empuje) * 0.3;
        if (res.avance > 0.004) {
            pil.angObj = Math.atan2(dy, dx);
            pil.tMov = ahora;
            emitir("mueve", pil.x, pil.y);
        }
        // aviso del muro solo si el dedo se salió de verdad del camino (o cruzó una pared hacia otro pasillo)
        var salido = res.fuera > (Number(cfgJ.distanciaAlerta) || 0.6) || res.desvio;
        if (salido && res.avance < 0.01) {
            var fx = pil.objetivo.x - pil.x, fy = pil.objetivo.y - pil.y;
            if (ahora - pil.tAlerta > 900 && !pil.auto) {
                pil.tAlerta = ahora;
                pil.temblor = 1;
                alertaBorde(fx, fy);
                emitir("pared", pil.x, pil.y);
            }
        }
        var z = R.zona(lab, pil.x, pil.y);
        var k = z ? z.tipo + ":" + z.nodo : "";
        if (k !== pil.zonaClave) {
            var prev = pil.zona;
            pil.zona = z;
            pil.zonaClave = k;
            if (prev) emitir("sale", prev);
            if (z) emitir("zona", z);
        }
    }

    /** Aviso luminoso en el borde que la nave empuja: el muro de esa cara se enciende en rojo coral y se apaga. */
    function alertaBorde(fx, fy) {
        var i = Math.floor(pil.x), j = Math.floor(pil.y);
        var EXa = ensanche();
        var porX = Math.abs(fx) >= Math.abs(fy);
        var pruebas = porX ? ["x", "y"] : ["y", "x"];
        var lado = null;
        for (var q = 0; q < 2 && !lado; q++) {
            if (pruebas[q] === "x" && Math.abs(fx) > 0.05) {
                var di = fx > 0 ? 1 : -1;
                if (!R.esCamino(lab, i + di, j)) { var ux = fx > 0 ? i + 1 + EXa : i - EXa; lado = { a: [ux, j - EXa], b: [ux, j + 1 + EXa] }; }
            } else if (pruebas[q] === "y" && Math.abs(fy) > 0.05) {
                var dj = fy > 0 ? 1 : -1;
                if (!R.esCamino(lab, i, j + dj)) { var vy = fy > 0 ? j + 1 + EXa : j - EXa; lado = { a: [i - EXa, vy], b: [i + 1 + EXa, vy] }; }
            }
        }
        var c = iso(pil.x, pil.y, HOVER);
        onda(c.x, c.y, ROJO, 0.45);
        if (!lado) return;
        var g = sc.add.graphics().setBlendMode(ADD);
        var hz = 0.48;
        var pts = [iso(lado.a[0], lado.a[1], 0), iso(lado.b[0], lado.b[1], 0), iso(lado.b[0], lado.b[1], hz), iso(lado.a[0], lado.a[1], hz)];
        g.fillStyle(ROJO, 0.35);
        g.fillPoints(pts, true);
        g.lineStyle(6, ROJO, 0.5);
        g.strokePoints(pts, true);
        g.lineStyle(2.5, 0xfff1f2, 1);
        g.lineBetween(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
        g.lineBetween(pts[3].x, pts[3].y, pts[2].x, pts[2].y);
        g.setDepth(prof((lado.a[0] + lado.b[0]) / 2 + (lado.a[1] + lado.b[1]) / 2) + 0.7);
        sc.tweens.add({ targets: g, alpha: 0, duration: 700, delay: 180, ease: "Quad.easeIn" });
        destruirLuego(g, 1000);
    }

    function puntoNavePantalla() {
        var p = iso(pil.x, pil.y, HOVER);
        return aPantalla(p.x, p.y);
    }

    function tocaNave(wx, wy) {
        if (!pil.visible) return false;
        var p = iso(pil.x, pil.y, HOVER);
        return Math.hypot(wx - p.x, wy - p.y) < geo.A * 1.35;
    }

    function empezarArrastre(wx, wy) {
        // sin desfase: la nave va a quedar bajo el dedo (se toma con un área generosa alrededor)
        pil.ox = 0;
        pil.oy = 0;
        pil.arrastrando = true;
        pil.auto = false;
        var q = deIso(wx, wy, HOVER);
        pil.objetivo = { x: q.x, y: q.y };
    }

    function moverObjetivo(wx, wy) {
        if (!pil.arrastrando) return;
        var q = deIso(wx, wy, HOVER);
        pil.objetivo = { x: q.x + pil.ox, y: q.y + pil.oy };
    }

    function soltar() {
        pil.arrastrando = false;
        pil.objetivo = null;
    }

    /** La demo lleva la nave hacia un punto del plano (celdas) con el mismo movimiento del juego. */
    function guiarA(x, y) {
        pil.auto = true;
        pil.arrastrando = true;
        pil.objetivo = { x: x, y: y };
    }

    // ------------------------------------------------------------------ efectos

    function chispa(x, y, color, fuerza, prof2) {
        if (!sc) return;
        var a = Math.random() * Math.PI * 2;
        var d = (20 + Math.random() * 50) * (fuerza || 1);
        var img = sc.add.image(x, y, "fx-chispa").setBlendMode(ADD).setDepth(prof2 || 800).setTint(color || 0xffffff)
            .setScale(0.4 + Math.random() * 0.5).setRotation(Math.random() * 3);
        sc.tweens.add({ targets: img, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, scale: 0.1, angle: 180, duration: 380 + Math.random() * 260, ease: "Quad.easeOut" });
        destruirLuego(img, 900);
    }

    function onda(x, y, color, escala) {
        if (!sc) return;
        var o = sc.add.image(x, y, "fx-onda").setBlendMode(ADD).setDepth(800).setTint(color || CIAN).setScale(0.2).setAlpha(0.9);
        sc.tweens.add({ targets: o, scale: geo.A * 2 * (escala || 1) / 128, alpha: 0, duration: 620, ease: "Quad.easeOut" });
        destruirLuego(o, 1000);
    }

    function chispasFiesta(x, y, n, fuerza) {
        for (var i = 0; i < (n || 12); i++) chispa(x, y, NEON[i % NEON.length], (fuerza || 1) * 1.6);
        var h = sc.add.image(x, y, "fx-halo").setBlendMode(ADD).setDepth(800).setTint(0xffffff).setScale(0.3).setAlpha(0.9);
        sc.tweens.add({ targets: h, scale: 1.6 * (fuerza || 1), alpha: 0, duration: 600 });
        destruirLuego(h, 900);
    }

    /** Destellos sutiles hacia TODAS las salidas de un cruce (no señala cuál es la correcta). */
    function destellosCruce(id) {
        var n = lab && lab.nodos[id];
        if (!n) return;
        n.vecinos.forEach(function (vid, k) {
            var v = lab.nodos[vid];
            var dx = Math.sign(v.x - n.x), dy = Math.sign(v.y - n.y);
            for (var q = 0; q < 3; q++) {
                (function (qq) {
                    setTimeout(function () {
                        if (!sc || !lab) return;
                        var x0 = n.x + dx * 0.45, y0 = n.y + dy * 0.45;
                        var x1 = n.x + dx * 1.5, y1 = n.y + dy * 1.5;
                        var a = iso(x0, y0, 0.12), b = iso(x1, y1, 0.12);
                        var img = sc.add.image(a.x, a.y, qq % 2 ? "fx-chispa" : "fx-punto").setBlendMode(ADD).setTint(qq % 2 ? 0xffffff : CIAN)
                            .setScale(qq % 2 ? 0.5 : 1.6).setDepth(prof(x1 + y1) + 0.5).setAlpha(0.95);
                        sc.tweens.add({ targets: img, x: b.x, y: b.y, alpha: 0, duration: 700, ease: "Quad.easeOut" });
                        destruirLuego(img, 760);
                    }, k * 60 + qq * 170);
                })(q);
            }
        });
        var c = iso(n.x, n.y, 0.02);
        var anillo = sc.add.image(c.x, c.y, "fx-anillo").setBlendMode(ADD).setTint(0xe0f2fe).setDepth(prof(n.x + n.y) - 0.5).setDisplaySize(geo.A * 0.6, geo.B * 0.6);
        sc.tweens.add({ targets: anillo, displayWidth: geo.A * 1.9, displayHeight: geo.B * 1.9, alpha: 0, duration: 800, ease: "Quad.easeOut" });
        destruirLuego(anillo, 900);
    }

    function activarLlave(id) {
        var o = llaves[id];
        if (!o || o.estado === "orbita") return;
        o.estado = "activa";
        o.extra = 1;
        var c = iso(o.x, o.y, o.z);
        sc.tweens.add({ targets: o.burbuja, scale: o.burbuja.scale * 1.4, duration: 260 });
        onda(c.x, c.y, o.color, 0.9);
        for (var i = 0; i < 8; i++) chispa(c.x, c.y, i % 2 ? o.color : 0xffffff, 0.9);
    }

    function resaltarLlave(id) {
        var o = llaves[id];
        if (!o || o.estado !== "activa") return;
        o.extra = 1;
        var c = iso(o.x, o.y, o.z);
        onda(c.x, c.y, o.color, 1.3);
        setTimeout(function () { onda(c.x, c.y, o.color, 1.3); }, 380);
    }

    function rebotarLlave(id) {
        var o = llaves[id];
        if (!o) return;
        var c = iso(o.x, o.y, o.z);
        onda(c.x, c.y, 0xe0f2fe, 0.7);
        o.extra = 0.6;
    }

    /**
     * La nave toca la llave: gira rápido, se eleva con un destello de su color, se acerca a la nave y entra a la
     * órbita. El candado de su color se ilumina en el portal.
     */
    function recogerLlave(id) {
        var o = llaves[id];
        if (!o || o.estado === "orbita") return Promise.resolve();
        o.estado = "volando";
        o.burbuja.setAlpha(0);
        o.haz.setAlpha(0);
        o.pedestal.setAlpha(0.3);
        var c0 = iso(o.x, o.y, o.z);
        var flash = sc.add.image(c0.x, c0.y, "fx-halo").setBlendMode(ADD).setTint(o.color).setDepth(850).setScale(0.3).setAlpha(1);
        sc.tweens.add({ targets: flash, scale: geo.A / 30, alpha: 0, duration: 700, ease: "Quad.easeOut" });
        destruirLuego(flash, 760);
        onda(c0.x, c0.y, o.color, 1.4);
        for (var i = 0; i < 14; i++) chispa(c0.x, c0.y, i % 2 ? o.color : 0xffffff, 1.4);
        var slot = { id: id, img: o.img, brillo: o.brillo, escala: o.escala * 0.5, libre: true, wx: c0.x, wy: c0.y };
        orbita.push(slot);
        var d0 = o.img.depth;
        return animar(650, function (e) {
            // gira y se eleva
            var p = iso(o.x, o.y, o.z + e * 0.9);
            var giro = Math.cos(e * 14);
            o.img.setPosition(p.x, p.y).setDepth(850).setScale(o.escala * (1 + e * 0.3) * Math.max(0.15, Math.abs(giro)), o.escala * (1 + e * 0.3)).setFlipX(giro < 0);
            o.brillo.setPosition(p.x, p.y).setDepth(849).setScale(geo.A / 64 * (1 + e)).setAlpha(0.9);
        }, salida).then(function () {
            var a = { x: o.img.x, y: o.img.y };
            return animar(600, function (e) {
                var p = iso(pil.x, pil.y, HOVER + 0.2);
                var x = lerp(a.x, p.x, e), y = lerp(a.y, p.y, e) - Math.sin(e * Math.PI) * 30;
                var esc = lerp(o.escala * 1.3, slot.escala, e);
                o.img.setPosition(x, y).setScale(esc).setFlipX(false);
                o.brillo.setPosition(x, y).setScale(geo.A / 128 * (2 - e));
            }, suave);
        }).then(function () {
            o.estado = "orbita";
            slot.libre = false;
            o.img.setDepth(d0);
            encenderCandado(id);
            var p = iso(pil.x, pil.y, HOVER);
            chispasFiesta(p.x, p.y, 10, 0.8);
        });
    }

    /** Las tres llaves brillan juntas y el portal empieza a activarse. */
    function brillarLlaves() {
        orbita.forEach(function (o, k) {
            setTimeout(function () {
                if (!o.img.active) return;
                onda(o.wx || 0, o.wy || 0, llaves[o.id] ? llaves[o.id].color : 0xffffff, 0.6);
            }, k * 160);
        });
        if (portal) {
            portal.objetivo = 0.9;
            onda(portal.cx, portal.cy, VIOLETA, 1.6);
        }
    }

    function portalRechazo() {
        if (!portal) return;
        onda(portal.cx, portal.cy, 0xe0f2fe, 1.2);
        sc.tweens.add({ targets: portal.campo, alpha: 1, duration: 140, yoyo: true, repeat: 1 });
        portal.candados.forEach(function (cd, k) {
            if (cd.estado !== "apagado") return;
            setTimeout(function () {
                sc.tweens.add({ targets: cd.img, angle: { from: -12, to: 12 }, duration: 90, yoyo: true, repeat: 2, onComplete: function () { cd.img.setAngle(0); } });
            }, k * 90);
        });
    }

    /**
     * Abrir el portal: las llaves dejan la órbita, cada una vuela a su candado, los candados se abren en secuencia,
     * el campo de fuerza se disuelve, el portal gira cada vez más rápido y se forma el vórtice.
     *   cb("candado", i) · cb("vortice")
     */
    function abrirPortal(cb) {
        if (!portal) return Promise.resolve();
        var avisar = function () { if (typeof cb === "function") cb.apply(null, arguments); };
        var cadena = Promise.resolve();
        portal.objetivo = 1;
        orbita.forEach(function (o) { o.libre = true; });
        portal.candados.forEach(function (cd, k) {
            cadena = cadena.then(function () {
                var slot = orbita.filter(function (o) { return o.id === cd.id; })[0];
                if (!slot) return null;
                var a = { x: slot.img.x, y: slot.img.y };
                slot.img.setDepth(950);
                slot.brillo.setDepth(949);
                return animar(620, function (e) {
                    var x = lerp(a.x, cd.x, e), y = lerp(a.y, cd.y + 10, e) - Math.sin(e * Math.PI) * 50;
                    slot.img.setPosition(x, y).setRotation(e * Math.PI * 2).setScale(slot.escala * (1 + e * 0.4));
                    slot.brillo.setPosition(x, y);
                }, suave).then(function () {
                    avisar("candado", k);
                    cd.estado = "abierto";
                    cd.img.setTexture("candado-" + cd.id + "-abierto");
                    chispasFiesta(cd.x, cd.y, 12, 0.8);
                    onda(cd.x, cd.y, llaves[cd.id] ? llaves[cd.id].color : 0xffffff, 0.8);
                    slot.img.setVisible(false);
                    slot.brillo.setVisible(false);
                    sc.tweens.add({ targets: [cd.img, cd.brillo], y: cd.y - 40, alpha: 0, duration: 900, delay: 250, ease: "Quad.easeIn" });
                    return sleep(380);
                });
            });
        });
        return cadena.then(function () {
            avisar("vortice");
            portal.abierto = true;
            sc.tweens.add({ targets: portal.campo, alpha: 0, duration: 400 });
            var f = sc.add.image(portal.cx, portal.cy, "fx-halo").setBlendMode(ADD).setDepth(960).setTint(0xf5d0fe).setScale(0.4);
            sc.tweens.add({ targets: f, scale: geo.A / 14, alpha: 0, duration: 900, ease: "Quad.easeOut" });
            destruirLuego(f, 950);
            for (var i = 0; i < 4; i++) setTimeout(function () { if (portal) onda(portal.cx, portal.cy, NEON[Math.floor(Math.random() * 3)], 1.6); }, i * 180);
            var r0 = portal.remolino.displayWidth;
            return animar(1300, function (e) {
                portal.remolino.setDisplaySize(r0 * (1 + e * 0.35), r0 * 1.075 * (1 + e * 0.35));
                portal.nucleo.setDisplaySize(r0 * (1 + e * 0.3), r0 * 1.075 * (1 + e * 0.3));
            }, salida);
        });
    }

    /** La nave va hasta el portal y lo atraviesa (se encoge girando en el vórtice). */
    function cruzarPortal() {
        if (!portal || !lab) return Promise.resolve();
        pil.bloqueado = true;
        pil.arrastrando = false;
        pil.objetivo = null;
        var x0 = pil.x, y0 = pil.y;
        var P = lab.nodos[lab.portal];
        return animar(500, function (e) {
            pil.x = lerp(x0, P.x, e);
            pil.y = lerp(y0, P.y, e);
            pil.empuje = 0.8;
            pil.angObj = Math.atan2(portal.y - P.y, portal.x - P.x);
        }, suave).then(function () {
            var x1 = pil.x, y1 = pil.y;
            return animar(1100, function (e) {
                pil.x = lerp(x1, portal.x, e);
                pil.y = lerp(y1, portal.y, e);
                pil.escala = 1 - e * 0.9;
                pil.angObj += 0.25;
                pil.empuje = 1;
            }, function (u) { return u * u; });
        }).then(function () {
            pil.visible = false;
            pil.escala = 1;
            var f = sc.add.image(portal.cx, portal.cy, "fx-halo").setBlendMode(ADD).setDepth(990).setTint(0xffffff).setScale(0.5);
            sc.tweens.add({ targets: f, scale: geo.A / 8, alpha: 0, duration: 800, ease: "Quad.easeOut" });
            destruirLuego(f, 850);
        });
    }

    /** Recorrido de cámara de la presentación: la salida, las tres llaves, el portal y el mapa completo. */
    function recorrido(cb) {
        if (!lab) return Promise.resolve();
        var avisar = function () { if (typeof cb === "function") cb.apply(null, arguments); };
        var S = lab.nodos[lab.inicio];
        var ps = iso(S.x, S.y, 0.5);
        camara.z = 1.7;
        camara.fx = ps.x;
        camara.fy = ps.y;
        reacomodar();
        var cadena = sleep(900);
        lab.llaves.forEach(function (L) {
            cadena = cadena.then(function () {
                var n = lab.nodos[L.nodo];
                var p = iso(n.x, n.y, 0.6);
                return moverCamara(1.55, p.x, p.y, 1300).then(function () {
                    avisar("llave", L.id);
                    resaltarLlave(L.id);
                    var o = llaves[L.id];
                    if (o) o.extra = 1;
                    return sleep(600);
                });
            });
        });
        return cadena.then(function () {
            return moverCamara(1.5, portal.cx, portal.cy + geo.Z * 0.4, 1300);
        }).then(function () {
            avisar("portal");
            portalRechazo();
            return sleep(700);
        }).then(function () {
            return moverCamara(1, null, null, 1500);
        });
    }

    function transicion(ms) {
        if (!sc) return Promise.resolve();
        var v = vista();
        var cx = v.x0 + v.w / 2, cy = v.y0 + v.h / 2;
        var velo = sc.add.image(cx, cy, "fx-blanco").setTint(0x050826).setDepth(1990).setDisplaySize(v.w + 20, v.h + 20).setAlpha(0);
        var lineas = [];
        for (var i = 0; i < 46; i++) {
            var a = Math.random() * Math.PI * 2;
            var l = sc.add.image(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30, "fx-estela").setBlendMode(ADD).setDepth(1995)
                .setTint(NEON[i % NEON.length]).setRotation(a).setScale(0.2, 0.3).setAlpha(0);
            lineas.push({ o: l, a: a, d: 0.4 + Math.random() * 0.6 });
        }
        var dur = ms || 1100;
        return animar(dur, function (e) {
            var k = Math.sin(e * Math.PI);
            velo.setAlpha(k * 0.92);
            lineas.forEach(function (l) {
                var r = (60 + e * Math.max(v.w, v.h) * 0.7) * l.d;
                l.o.setPosition(cx + Math.cos(l.a) * r, cy + Math.sin(l.a) * r).setScale(0.6 + e * 6 * l.d, 0.4).setAlpha(k);
            });
        }).then(function () {
            velo.destroy();
            lineas.forEach(function (l) { l.o.destroy(); });
        });
    }

    // ------------------------------------------------------------------ final: el planeta y la base espacial

    function lienzoBase() {
        var cw = Math.round(W * 1.9), ch = Math.round(H * 0.62);
        var c = document.createElement("canvas");
        c.width = cw;
        c.height = ch;
        var x = c.getContext("2d");
        var cx = cw / 2;
        var rnd = azar(404);
        // suelo del planeta (horizonte curvo)
        var g = x.createLinearGradient(0, 0, 0, ch);
        g.addColorStop(0, "#2dd4bf");
        g.addColorStop(0.12, "#0f766e");
        g.addColorStop(0.6, "#134e4a");
        g.addColorStop(1, "#042f2e");
        x.fillStyle = g;
        x.beginPath();
        x.moveTo(0, ch * 0.2);
        x.quadraticCurveTo(cx, -ch * 0.12, cw, ch * 0.2);
        x.lineTo(cw, ch);
        x.lineTo(0, ch);
        x.closePath();
        x.fill();
        for (var k = 0; k < 40; k++) {
            var px = rnd() * cw, py = ch * (0.25 + rnd() * 0.7), pr = 10 + rnd() * 40;
            x.fillStyle = "rgba(4,47,46,0.45)";
            x.beginPath();
            x.ellipse(px, py, pr, pr * 0.3, 0, 0, Math.PI * 2);
            x.fill();
            x.strokeStyle = "rgba(94,234,212,0.25)";
            x.lineWidth = 2;
            x.beginPath();
            x.ellipse(px, py - 2, pr, pr * 0.3, 0, Math.PI, Math.PI * 2);
            x.stroke();
        }
        var py0 = ch * 0.62;
        // plataforma de aterrizaje
        x.fillStyle = "#1e293b";
        x.beginPath();
        x.ellipse(cx, py0 + 18, 250, 74, 0, 0, Math.PI * 2);
        x.fill();
        var gp = x.createLinearGradient(0, py0 - 60, 0, py0 + 60);
        gp.addColorStop(0, "#94a3b8");
        gp.addColorStop(1, "#475569");
        x.fillStyle = gp;
        x.beginPath();
        x.ellipse(cx, py0, 250, 70, 0, 0, Math.PI * 2);
        x.fill();
        x.strokeStyle = "#e2e8f0";
        x.lineWidth = 4;
        x.stroke();
        x.strokeStyle = "rgba(250,204,21,0.9)";
        x.lineWidth = 6;
        x.beginPath();
        x.ellipse(cx, py0, 150, 40, 0, 0, Math.PI * 2);
        x.stroke();
        x.fillStyle = "rgba(250,204,21,0.9)";
        x.font = "bold 46px Fredoka, sans-serif";
        x.textAlign = "center";
        x.textBaseline = "middle";
        x.save();
        x.translate(cx, py0);
        x.scale(1, 0.32);
        x.fillText("H", 0, 0);
        x.restore();
        // cúpula grande (izquierda)
        var domo = function (dx, dy, r) {
            x.fillStyle = "#334155";
            x.fillRect(dx - r - 6, dy - 8, r * 2 + 12, 22);
            var gd = x.createRadialGradient(dx - r * 0.35, dy - r * 0.6, r * 0.1, dx, dy, r);
            gd.addColorStop(0, "rgba(224,242,254,0.95)");
            gd.addColorStop(0.5, "rgba(56,189,248,0.6)");
            gd.addColorStop(1, "rgba(30,64,175,0.75)");
            x.fillStyle = gd;
            x.beginPath();
            x.arc(dx, dy, r, Math.PI, 0);
            x.closePath();
            x.fill();
            x.strokeStyle = "rgba(255,255,255,0.7)";
            x.lineWidth = 2;
            for (var q = 1; q < 4; q++) {
                x.beginPath();
                x.ellipse(dx, dy, r * q / 4, r, 0, Math.PI, Math.PI * 2);
                x.stroke();
            }
            x.beginPath();
            x.arc(dx, dy, r, Math.PI, 0);
            x.stroke();
        };
        domo(cx - 430, py0 - 30, 150);
        domo(cx - 640, py0 + 20, 80);
        domo(cx + 650, py0 + 30, 90);
        // torres (derecha)
        [[cx + 360, 300, 60], [cx + 470, 220, 46], [cx + 260, 180, 40]].forEach(function (t) {
            var gt = x.createLinearGradient(t[0] - t[2] / 2, 0, t[0] + t[2] / 2, 0);
            gt.addColorStop(0, "#475569");
            gt.addColorStop(0.5, "#e2e8f0");
            gt.addColorStop(1, "#334155");
            x.fillStyle = gt;
            x.fillRect(t[0] - t[2] / 2, py0 - t[1], t[2], t[1] + 10);
            x.fillStyle = "#f97316";
            x.fillRect(t[0] - t[2] / 2 - 6, py0 - t[1] - 12, t[2] + 12, 16);
            x.strokeStyle = "#cbd5e1";
            x.lineWidth = 3;
            x.beginPath();
            x.moveTo(t[0], py0 - t[1] - 12);
            x.lineTo(t[0], py0 - t[1] - 60);
            x.stroke();
            x.fillStyle = "rgba(15,23,42,0.85)";
            for (var w = 0; w < Math.floor(t[1] / 40); w++) x.fillRect(t[0] - 9, py0 - t[1] + 20 + w * 40, 18, 18);
        });
        // tubos que unen la base
        x.strokeStyle = "#64748b";
        x.lineWidth = 14;
        x.beginPath();
        x.moveTo(cx - 285, py0 - 6);
        x.lineTo(cx - 250, py0 - 6);
        x.moveTo(cx + 250, py0 - 6);
        x.lineTo(cx + 330, py0 - 6);
        x.stroke();
        return { canvas: c, w: cw, h: ch, pista: py0 };
    }

    function lienzoCielo() {
        var c = document.createElement("canvas");
        c.width = 512;
        c.height = 512;
        var x = c.getContext("2d");
        var g = x.createLinearGradient(0, 0, 0, 512);
        g.addColorStop(0, "#0b0a2e");
        g.addColorStop(0.45, "#3b1d77");
        g.addColorStop(0.75, "#9d3a9a");
        g.addColorStop(1, "#f9a8d4");
        x.fillStyle = g;
        x.fillRect(0, 0, 512, 512);
        var rnd = azar(9);
        for (var i = 0; i < 160; i++) {
            x.fillStyle = "rgba(255,255,255," + (0.3 + rnd() * 0.6).toFixed(2) + ")";
            x.fillRect(rnd() * 512, rnd() * 320, 1.2, 1.2);
        }
        return c;
    }

    /** Las luces de la base: posiciones relativas a la imagen de la base (centro de la plataforma = 0, 0). */
    function lucesBase(b) {
        var l = [];
        for (var i = 0; i < 14; i++) {
            var a = i / 14 * Math.PI * 2;
            l.push({ x: Math.cos(a) * 236, y: Math.sin(a) * 64, c: i % 2 ? 0xfacc15 : 0x67e8f9, s: 1.1 });
        }
        [[-430, -110, 0x67e8f9, 6], [-640, -20, 0xa78bfa, 3.5], [650, -10, 0xf472b6, 3.8]].forEach(function (d) { l.push({ x: d[0], y: d[1], c: d[2], s: d[3], domo: true }); });
        [[360, -372, 0xff5a7a], [470, -292, 0x4ade80], [260, -252, 0xfacc15]].forEach(function (t) { l.push({ x: t[0], y: t[1], c: t[2], s: 2.2 }); });
        return l;
    }

    function crearFinal() {
        if (fin) return;
        reemplazarCanvas("final-cielo", lienzoCielo());
        var b = lienzoBase();
        reemplazarCanvas("final-base", b.canvas);
        var D = 2000;
        var baseY = H - b.h / 2 + 40;
        fin = {
            objs: [],
            cielo: sc.add.image(W / 2, H / 2, "final-cielo").setDepth(D),
            planeta: sc.add.image(W * 0.2, H * 0.2, "planeta-1").setDepth(D + 1).setScale(1.5),
            luna: sc.add.image(W * 0.82, H * 0.16, "planeta-4").setDepth(D + 1).setScale(0.8),
            vortice: sc.add.image(W * 0.78, H * 0.14, "portal-remolino").setDepth(D + 2).setBlendMode(ADD).setScale(0.6).setAlpha(0),
            base: sc.add.image(W / 2, baseY, "final-base").setDepth(D + 3),
            pista: { x: W / 2, y: baseY - b.h / 2 + b.pista },
            luces: [],
            nave: sc.add.image(0, 0, global.NaveSprites && sc.textures.exists("nave-3d") ? "nave-3d" : "nave-2d", 0).setDepth(D + 6),
            sombra: sc.add.image(0, 0, "fx-halo").setTint(0x000000).setDepth(D + 4).setAlpha(0),
            llama: sc.add.image(0, 0, "fx-halo").setBlendMode(ADD).setTint(0xff9a3c).setDepth(D + 5),
            velo: sc.add.image(W / 2, H / 2, "fx-blanco").setDepth(D + 4).setTint(0x020617).setAlpha(0.55)
        };
        lucesBase(b).forEach(function (l) {
            var o = sc.add.image(fin.pista.x + l.x, fin.pista.y + l.y, "fx-halo").setBlendMode(ADD).setTint(l.c).setDepth(D + 5).setScale(l.s * 0.3).setAlpha(0);
            fin.luces.push({ o: o, s: l.s });
        });
        fin.objs = [fin.cielo, fin.planeta, fin.luna, fin.vortice, fin.base, fin.nave, fin.sombra, fin.llama, fin.velo].concat(fin.luces.map(function (l) { return l.o; }));
        fin.velo.setDisplaySize(W * 3, H * 3);
        fin.objs.forEach(function (o) { o.setVisible(false); });
        ajustarMarco();
    }

    /**
     * Final: destello del portal → un planeta nuevo; la nave sale de un vórtice en el cielo, la cámara la acompaña,
     * aterriza suave en la plataforma, se encienden las luces de la base una a una y estallan fuegos espaciales.
     *   cb("aterriza") · cb("luz", i)
     */
    function finalCinematica(cb) {
        var avisar = function () { if (typeof cb === "function") cb.apply(null, arguments); };
        crearFinal();
        var v = vista();
        var flash = sc.add.image(v.x0 + v.w / 2, v.y0 + v.h / 2, "fx-blanco").setDepth(2990).setDisplaySize(v.w + 20, v.h + 20).setAlpha(0);
        return animar(450, function (e) { flash.setAlpha(e); }).then(function () {
            fin.objs.forEach(function (o) { o.setVisible(true); });
            fin.luces.forEach(function (l) { l.o.setAlpha(0); });
            fin.velo.setAlpha(0.55);
            fin.vortice.setAlpha(0.9);
            fin.sombra.setAlpha(0);
            camara.z = 1.25;
            camara.fx = W * 0.66;
            camara.fy = H * 0.32;
            reacomodar();
            return animar(500, function (e) { flash.setAlpha(1 - e); });
        }).then(function () {
            flash.destroy();
            var S = global.NaveSprites;
            var es3d = fin.nave.texture.key === "nave-3d";
            var escala = es3d ? S.celdasPorUnidad * Math.SQRT2 * 120 / S.pxPorUnidad : 0.9;
            var x0 = fin.vortice.x, y0 = fin.vortice.y;
            var x1 = fin.pista.x, y1 = fin.pista.y - 70;
            if (es3d) fin.nave.setFrame(cuadroNave(Math.PI * 0.62));
            moverCamara(1.05, W / 2, H * 0.55, 3000);
            return animar(3000, function (e) {
                var u = suave(e);
                var x = lerp(x0, x1, u) + Math.sin(u * Math.PI) * -260;
                var y = lerp(y0, y1, u) - Math.sin(u * Math.PI) * 40;
                var esc = escala * lerp(0.2, 1, u);
                fin.nave.setPosition(x, y + Math.sin(e * 20) * 2).setScale(esc);
                if (!es3d) fin.nave.setRotation(Math.atan2(y1 - y0, x1 - x0));
                fin.llama.setPosition(x + 40 * esc, y - 30 * esc).setScale(esc * 1.2).setAlpha(0.8);
                fin.sombra.setPosition(x, fin.pista.y + 6).setDisplaySize(260 * esc, 70 * esc).setAlpha(0.45 * u);
                fin.vortice.setRotation(e * 8).setAlpha(0.9 * (1 - e));
            });
        }).then(function () {
            avisar("aterriza");
            var y = fin.nave.y;
            for (var i = 0; i < 16; i++) chispa(fin.pista.x + (Math.random() - 0.5) * 200, fin.pista.y, i % 2 ? 0xe2e8f0 : 0x94a3b8, 1.2, 2990);
            return animar(700, function (e) {
                fin.nave.y = y + 26 * Math.sin(e * Math.PI) * (1 - e) + 22 * e;
                fin.llama.setAlpha(0.8 * (1 - e));
            });
        }).then(function () {
            var cadena = animar(900, function (e) { fin.velo.setAlpha(0.55 * (1 - e)); });
            fin.luces.forEach(function (l, i) {
                setTimeout(function () {
                    avisar("luz", i);
                    sc.tweens.add({ targets: l.o, alpha: 0.95, scale: l.s * 0.55, duration: 260, yoyo: false });
                }, 120 + i * 110);
            });
            return cadena.then(function () { return sleep(fin.luces.length * 110 + 300); });
        }).then(function () {
            fin.luces.forEach(function (l, i) {
                sc.tweens.add({ targets: l.o, alpha: { from: 0.95, to: 0.55 }, duration: 700 + (i % 4) * 150, yoyo: true, repeat: -1 });
            });
        });
    }

    function ocultarFinal() {
        if (!fin) return;
        fin.objs.forEach(function (o) {
            sc.tweens.killTweensOf(o);
            o.setVisible(false);
        });
        camara.z = 1;
        camara.fx = null;
        camara.fy = null;
        reacomodar();
    }

    /** Fuegos artificiales espaciales en el cielo visible. */
    function fuegos(n) {
        if (!sc) return;
        var v = vista();
        for (var i = 0; i < (n || 4); i++) {
            (function (k) {
                setTimeout(function () {
                    if (!sc) return;
                    var x = v.x0 + v.w * (0.15 + Math.random() * 0.7), y = v.y0 + v.h * (0.12 + Math.random() * 0.3);
                    var color = NEON[(k + Math.floor(Math.random() * 7)) % NEON.length];
                    var sube = sc.add.image(x, v.y0 + v.h * 0.9, "fx-punto").setBlendMode(ADD).setDepth(2980).setTint(color).setScale(2.2);
                    sc.tweens.add({ targets: sube, y: y, duration: 520, ease: "Quad.easeOut" });
                    destruirLuego(sube, 560);
                    setTimeout(function () {
                        if (!sc) return;
                        var o = sc.add.image(x, y, "fx-onda").setBlendMode(ADD).setDepth(2980).setTint(color).setScale(0.1);
                        sc.tweens.add({ targets: o, scale: 2.4, alpha: 0, duration: 800, ease: "Quad.easeOut" });
                        destruirLuego(o, 1000);
                        for (var j = 0; j < 18; j++) {
                            var a = j / 18 * Math.PI * 2;
                            var p = sc.add.image(x, y, j % 2 ? "fx-chispa" : "fx-punto").setBlendMode(ADD).setDepth(2980).setTint(j % 3 ? color : 0xffffff).setScale(j % 2 ? 0.6 : 1.6);
                            sc.tweens.add({ targets: p, x: x + Math.cos(a) * 150, y: y + Math.sin(a) * 150 + 40, alpha: 0, duration: 1000, ease: "Cubic.easeOut" });
                            destruirLuego(p, 1200);
                        }
                    }, 540);
                }, k * 360);
            })(i);
        }
    }

    // ------------------------------------------------------------------ consultas

    function zonaGuia(derecha) {
        if (!sc) return null;
        var a = aPantalla(derecha ? W * 0.84 : 0, H * 0.42);
        var b = aPantalla(derecha ? W : W * 0.16, H);
        var izq = Math.max(0, Math.min(a.x, b.x));
        var der = Math.min(global.innerWidth, Math.max(a.x, b.x));
        return { left: izq, top: a.y, width: Math.max(150, der - izq), height: Math.max(220, b.y - a.y), bottom: Math.min(global.innerHeight - 8, b.y) };
    }

    function aPantallaCelda(x, y, z) {
        var p = iso(x, y, z == null ? HOVER : z);
        return aPantalla(p.x, p.y);
    }

    // ------------------------------------------------------------------ montaje

    function vigilarPosicion(el) {
        var renovar = function () { if (sc && sc.scale) sc.scale.updateBounds(); };
        ["pointerdown", "mousedown", "touchstart"].forEach(function (n) {
            el.addEventListener(n, renovar, { capture: true, passive: true });
        });
        global.addEventListener("resize", function () { setTimeout(reacomodar, 40); });
    }

    function montar(el, config) {
        if (listoPromesa) return listoPromesa;
        cfgJ = (config && config.juego) || {};
        W = Number(cfgJ.anchoMundo) || 1600;
        H = Number(cfgJ.altoMundo) || 1000;
        if (!Phaser || !R) {
            console.warn("[EscenarioMapa] falta Phaser o ReglasMapa");
            listoPromesa = Promise.resolve(false);
            return listoPromesa;
        }
        RES = clamp((global.devicePixelRatio || 1) * Math.min(1.2, global.innerWidth / 1500), 1, 1.5);
        listoPromesa = new Promise(function (resolve) {
            juego = new Phaser.Game({
                type: Phaser.AUTO,
                parent: el,
                backgroundColor: "#050826",
                banner: false,
                scale: { mode: Phaser.Scale.RESIZE, width: global.innerWidth, height: global.innerHeight },
                input: { activePointers: 2 },
                fps: { target: 60 },
                scene: {
                    create: function () {
                        sc = this;
                        texturasFx();
                        marco = sc.add.image(0, 0, "fx-blanco").setTint(0x050826).setDepth(-1);
                        crearFondo();
                        crearNave();
                        reacomodar();
                        sc.scale.on("resize", reacomodar);
                        // el movimiento corre con su propio reloj (setTimeout): no depende de que el navegador pinte
                        var tPrev = performance.now();
                        var paso = function () {
                            var ahora = performance.now();
                            actualizarPiloto(ahora, Math.min(ahora - tPrev, 50));
                            tPrev = ahora;
                            setTimeout(paso, 16);
                        };
                        paso();
                        sc.events.on("update", function (t, dt) {
                            var d = Math.min(dt, 50);
                            var ahora = performance.now();
                            actualizarFondo(ahora, d);
                            if (lab) {
                                actualizarPulsos(d);
                                actualizarLlaves(ahora);
                                actualizarPortal(ahora, d);
                            }
                            actualizarNave(ahora, d);
                        });
                        vigilarPosicion(el);
                        resolve(true);
                    }
                }
            });
            global.__pedniaPhaserGame = juego;
        });
        return listoPromesa;
    }

    global.EscenarioMapa = {
        textoInicio: "¡Inicia aquí!",
        textoPortal: "¡Portal!",
        montar: montar,
        listo: function () { return !!(sc && nave && fondo); },
        escena: function () { return sc; },
        on: function (mapa) { Object.keys(mapa || {}).forEach(function (k) { ev[k] = mapa[k]; }); },
        reacomodar: reacomodar,
        laberinto: function () { return lab; },
        piloto: function () { return pil; },
        cargarLaberinto: cargarLaberinto,
        ocultarLaberinto: ocultarLaberinto,
        aparecerNave: aparecerNave,
        ponerNave: ponerNave,
        tocaNave: tocaNave,
        empezarArrastre: empezarArrastre,
        moverObjetivo: moverObjetivo,
        soltar: soltar,
        guiarA: guiarA,
        bloquear: function (on) { pil.bloqueado = !!on; if (on) { pil.arrastrando = false; pil.objetivo = null; } },
        activarLlave: activarLlave,
        resaltarLlave: resaltarLlave,
        rebotarLlave: rebotarLlave,
        recogerLlave: recogerLlave,
        brillarLlaves: brillarLlaves,
        estadoLlave: function (id) { return llaves[id] ? llaves[id].estado : null; },
        barrera: barrera,
        destellosCruce: destellosCruce,
        portalRechazo: portalRechazo,
        portalActividad: function () { return portal ? portal.actividad : 0; },
        abrirPortal: abrirPortal,
        cruzarPortal: cruzarPortal,
        recorrido: recorrido,
        moverCamara: moverCamara,
        transicion: transicion,
        finalCinematica: finalCinematica,
        ocultarFinal: ocultarFinal,
        fuegos: fuegos,
        onda: onda,
        chispas: chispasFiesta,
        puntoNavePantalla: puntoNavePantalla,
        aPantalla: aPantalla,
        aPantallaCelda: aPantallaCelda,
        mundoDeJuego: mundoDeJuego,
        iso: function (x, y, z) { return iso(x, y, z); },
        zonaZoe: function () { return zonaGuia(false); },
        zonaZeus: function () { return zonaGuia(true); }
    };
})(window);
