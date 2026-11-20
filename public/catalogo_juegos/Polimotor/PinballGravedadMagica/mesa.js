/**
 * mesa.js — El Pinball de Gravedad Mágica
 *
 * Pinta la máquina de pinball en un <canvas> 2D. El lienzo contiene SOLO la máquina (fondo
 * transparente): la página lo inclina con `transform: rotateX()` y `perspective` de CSS, así que
 * la cabecera queda más lejos y estrecha y las palancas cerca, como en la imagen de referencia.
 *
 * Como el plano está inclinado, "hacia arriba de la mesa" en la pantalla es -Y en el lienzo:
 * los objetos con altura (bumpers, dianas, palancas, bola) se extruyen hacia -Y y proyectan su
 * sombra hacia +Y. Así se leen como volúmenes sobre el tablero sin ningún motor 3D.
 *
 * No decide nada: recibe el estado de reglas.js y lo dibuja.
 */
(function (global) {
    "use strict";

    var PI2 = Math.PI * 2;
    var MARGEN = 92;          // ancho del mueble alrededor del tablero (ahí van los tubos)
    var FUENTE = "'Fredoka', 'Arial Rounded MT Bold', Arial, sans-serif";

    // ------------------------------------------------------------------ color

    function rgb(hex) {
        var h = hex.replace("#", "");
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        var n = parseInt(h, 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    function alfa(hex, a) { var c = rgb(hex); return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }
    function mezcla(hex, hacia, t) {
        var c = rgb(hex), d = rgb(hacia);
        return "rgb(" + Math.round(c[0] + (d[0] - c[0]) * t) + "," + Math.round(c[1] + (d[1] - c[1]) * t) + "," + Math.round(c[2] + (d[2] - c[2]) * t) + ")";
    }
    /** ¿Se pueden usar sombras difuminadas? Son lo más caro del canvas: fuera en modo ligero. */
    function brillo(m) { return !m.menosEfectos && !m.ligero; }

    function claro(hex, t) { return mezcla(hex, "#ffffff", t); }
    function oscuro(hex, t) { return mezcla(hex, "#000000", t); }

    // ------------------------------------------------------------------ creación y tamaño

    function crear(canvas, cfg) {
        var j = cfg.juego || {};
        var m = {
            canvas: canvas,
            ctx: canvas.getContext("2d"),
            cfg: cfg,
            ancho: j.anchoMesa || 1000,
            alto: j.altoMesa || 1600,
            escala: 1,
            dpr: 1,
            tiempo: 0,
            particulas: [],
            flashMesa: 0,
            menosEfectos: false,
            etiquetas: false,        // rótulos de la presentación (palancas, esfera)
            aviso: null,             // { lado, ms } flecha de "¡viene por aquí!"
            lucesCarril: 0,          // ola de luces al pasar por una rampa
            celebrando: false
        };
        return m;
    }

    /** Tamaño lógico del lienzo: tablero + mueble alrededor (sin mueble abajo). */
    function tamLogico(m) {
        return { w: m.ancho + MARGEN * 2, h: m.alto + MARGEN };
    }

    /**
     * Ajusta el lienzo para que la mesa INCLINADA quepa en `contenedor`. Como la perspectiva la
     * estrecha y acorta, se mide el rectángulo ya transformado y se corrige la escala.
     */
    function redimensionar(m) {
        var cont = m.canvas.parentElement;
        if (!cont) return;
        var disponibleW = cont.clientWidth;
        var disponibleH = cont.clientHeight;
        if (!disponibleW || !disponibleH) return;
        var t = tamLogico(m);
        var dpr = m.ligero ? 1 : Math.min(global.devicePixelRatio || 1, 1.75);

        function aplicar(escala) {
            m.escala = escala;
            m.canvas.style.width = Math.round(t.w * escala) + "px";
            m.canvas.style.height = Math.round(t.h * escala) + "px";
        }

        // Primera estimación y dos correcciones con la caja ya proyectada.
        var escala = Math.min(disponibleW / t.w, (disponibleH * 1.08) / t.h);
        aplicar(escala);
        for (var i = 0; i < 2; i++) {
            var r = m.canvas.getBoundingClientRect();
            if (!r.height || !r.width) break;
            var f = Math.min(disponibleH / r.height, disponibleW / r.width);
            escala *= f * 0.995;
            aplicar(escala);
        }
        m.dpr = dpr;
        m.canvas.width = Math.round(t.w * escala * dpr);
        m.canvas.height = Math.round(t.h * escala * dpr);
    }

    // ------------------------------------------------------------------ geometría útil

    /** Pie de la pared: donde la recta del embudo cruza la pared (vértice del rebotador). */
    function pieDePared(estado, lado) {
        var cfg = estado;
        var f = estado.flippers[lado];
        var s = estado.rebotadores[lado === "izquierda" ? 0 : 1];
        var pend = (f.pivoteY - s.y2) / (f.pivoteX - s.x2);
        return { x: s.x1, y: s.y2 - (s.x2 - s.x1) * pend };
    }

    /** Contorno del tablero jugable (para rellenarlo y recortarlo). */
    function trazarTablero(ctx, estado) {
        var a = estado.arco;
        var x0 = estado.paredX, x1 = estado.ancho - x0;
        var fi = estado.flippers.izquierda, fd = estado.flippers.derecha;
        var pi = pieDePared(estado, "izquierda"), pd = pieDePared(estado, "derecha");
        ctx.beginPath();
        ctx.moveTo(x0, a.cy);
        ctx.ellipse(a.cx, a.cy, a.rx, a.ry, 0, Math.PI, PI2);
        ctx.lineTo(x1, pd.y);
        ctx.lineTo(fd.pivoteX, fd.pivoteY);
        ctx.lineTo(fd.pivoteX, estado.alto);
        ctx.lineTo(fi.pivoteX, estado.alto);
        ctx.lineTo(fi.pivoteX, fi.pivoteY);
        ctx.lineTo(x0, pi.y);
        ctx.closePath();
    }

    // ------------------------------------------------------------------ dibujo principal

    function dibujar(m, estado, dtMs) {
        var ctx = m.ctx;
        m.tiempo += dtMs;
        var k = m.escala * m.dpr;
        var clave = m.canvas.width + "x" + m.canvas.height + "|" + !!m.ligero + "|" + !!m.menosEfectos;
        if (!m.capa || m.capaClave !== clave) construirCapa(m, estado, k, clave);

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, m.canvas.width, m.canvas.height);
        ctx.drawImage(m.capa, 0, 0);
        ctx.setTransform(k, 0, 0, k, MARGEN * k, MARGEN * k);

        dibujarBrilloTablero(m, ctx, estado);
        dibujarDecoracion(m, ctx, estado);
        dibujarLucesCarril(m, ctx, estado, dtMs);
        dibujarAro(m, ctx, estado);
        dibujarRampas(m, ctx, estado);
        dibujarDrenaje(m, ctx, estado);
        dibujarRebotadores(m, ctx, estado);
        dibujarDianas(m, ctx, estado);
        dibujarBumpers(m, ctx, estado, dtMs);
        dibujarFlippers(m, ctx, estado);
        dibujarBola(m, ctx, estado);
        dibujarParticulas(m, ctx, dtMs);
        dibujarTubos(m, ctx, estado);
        dibujarAviso(m, ctx, estado, dtMs);
        if (m.etiquetas) dibujarEtiquetas(m, ctx, estado);

        if (m.flashMesa > 0) m.flashMesa = Math.max(0, m.flashMesa - dtMs / 500);
    }

    /**
     * Capa fija: lo que no se mueve (mueble, tablero, rótulo, rieles y el cristal de los tubos)
     * se pinta una sola vez y en cada cuadro solo se copia. Se rehace si cambia el tamaño o el
     * modo ligero.
     */
    function construirCapa(m, estado, k, clave) {
        var R = global.ReglasPinball;
        m.ptsTubo = {};
        ["izquierda", "derecha"].forEach(function (lado) {
            var pts = [];
            for (var i = 0; i <= 80; i++) pts.push(R.puntoTubo(estado, lado, i / 80));
            m.ptsTubo[lado] = pts;
        });
        var capa = m.capa || document.createElement("canvas");
        capa.width = m.canvas.width;
        capa.height = m.canvas.height;
        var c = capa.getContext("2d");
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, capa.width, capa.height);
        c.setTransform(k, 0, 0, k, MARGEN * k, MARGEN * k);
        dibujarMueble(m, c, estado);
        dibujarTablero(m, c, estado);
        dibujarRotulo(m, c, estado);
        dibujarRieles(m, c, estado);
        dibujarTubosFijos(m, c, estado);
        m.capa = capa;
        m.capaClave = clave;
    }

    /** El mueble: cuerpo violeta metálico con canto grueso, como una máquina arcade. */
    function dibujarMueble(m, ctx, estado) {
        var a = estado.arco;
        var x0 = estado.paredX;
        ctx.save();
        // Contorno exterior: la misma forma del tablero, ensanchada.
        ctx.beginPath();
        ctx.moveTo(x0 - MARGEN, a.cy);
        ctx.ellipse(a.cx, a.cy, a.rx + MARGEN, a.ry + MARGEN, 0, Math.PI, PI2);
        ctx.lineTo(estado.ancho - x0 + MARGEN, estado.alto);
        ctx.lineTo(x0 - MARGEN, estado.alto);
        ctx.closePath();
        var g = ctx.createLinearGradient(-MARGEN, 0, estado.ancho + MARGEN, 0);
        g.addColorStop(0, "#3b1a7a");
        g.addColorStop(0.08, "#7c4dff");
        g.addColorStop(0.15, "#4c2a99");
        g.addColorStop(0.85, "#4c2a99");
        g.addColorStop(0.92, "#7c4dff");
        g.addColorStop(1, "#3b1a7a");
        ctx.fillStyle = g;
        if (brillo(m)) { ctx.shadowColor = "rgba(150,110,255,0.6)"; ctx.shadowBlur = 40; }
        ctx.fill();
        ctx.shadowBlur = 0;
        // Brillo de canto.
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();
    }

    /** Superficie del tablero: azul noche y violeta, con brillo pulido. */
    function dibujarTablero(m, ctx, estado) {
        ctx.save();
        trazarTablero(ctx, estado);
        var g = ctx.createLinearGradient(0, 0, 0, estado.alto);
        g.addColorStop(0, "#2a1660");
        g.addColorStop(0.45, "#1d1450");
        g.addColorStop(1, "#120c38");
        ctx.fillStyle = g;
        ctx.fill();
        ctx.clip();

        // Resplandor central (iluminación ambiental de la máquina).
        var rg = ctx.createRadialGradient(estado.ancho / 2, estado.alto * 0.5, 40, estado.ancho / 2, estado.alto * 0.5, estado.alto * 0.6);
        rg.addColorStop(0, "rgba(124,77,255,0.28)");
        rg.addColorStop(1, "rgba(124,77,255,0)");
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, estado.ancho, estado.alto);

        // Reflejo pulido en diagonal.
        var br = ctx.createLinearGradient(0, 0, estado.ancho, estado.alto * 0.6);
        br.addColorStop(0, "rgba(255,255,255,0.12)");
        br.addColorStop(0.35, "rgba(255,255,255,0.02)");
        br.addColorStop(0.6, "rgba(255,255,255,0)");
        ctx.fillStyle = br;
        ctx.fillRect(0, 0, estado.ancho, estado.alto);

        ctx.restore();
    }

    /** Destello de la mesa al golpear bumpers y luces de fiesta: solo cuando hacen falta. */
    function dibujarBrilloTablero(m, ctx, estado) {
        if (m.flashMesa <= 0.01 && !m.celebrando) return;
        ctx.save();
        trazarTablero(ctx, estado);
        ctx.clip();
        if (m.flashMesa > 0.01) {
            ctx.fillStyle = "rgba(124,77,255," + (m.flashMesa * 0.22) + ")";
            ctx.fillRect(0, 0, estado.ancho, estado.alto);
        }
        if (m.celebrando) {
            var tt = m.tiempo / 300;
            ctx.fillStyle = "hsla(" + ((tt * 40) % 360) + ",90%,60%,0.12)";
            ctx.fillRect(0, 0, estado.ancho, estado.alto);
        }
        ctx.restore();
    }

    /** Rótulo PEDNIA en la cabecera (capa fija). */
    function dibujarRotulo(m, ctx, estado) {
        ctx.save();
        ctx.font = "700 34px " + FUENTE;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fillText("PEDNIA", estado.ancho / 2, 215);
        ctx.restore();
    }

    /** Circuitos de energía, estrellitas y el rótulo PEDNIA bajo la cabecera. */
    function dibujarDecoracion(m, ctx, estado) {
        var t = m.tiempo / 1000;
        var cx = estado.ancho / 2;
        ctx.save();

        if (!m.menosEfectos && !m.ligero) {
            // Circuitos que laten.
            ctx.strokeStyle = "rgba(59,201,219," + (0.18 + 0.12 * Math.sin(t * 2)) + ")";
            ctx.lineWidth = 3;
            ctx.setLineDash([14, 18]);
            ctx.lineDashOffset = -t * 50;
            [[cx - 260, 980, cx - 120, 1120], [cx + 260, 980, cx + 120, 1120], [cx, 1000, cx, 1280]].forEach(function (l) {
                ctx.beginPath(); ctx.moveTo(l[0], l[1]); ctx.lineTo(l[2], l[3]); ctx.stroke();
            });
            ctx.setLineDash([]);
        }

        // Flechas guía que suben hacia los bumpers (como las de la imagen de referencia).
        for (var i = 0; i < 3; i++) {
            var y = 1180 - i * 60;
            var fase = (t * 2 - i * 0.35) % 1;
            var on = fase > 0 && fase < 0.5;
            ctx.fillStyle = on ? "rgba(255,212,59,0.9)" : "rgba(255,212,59,0.22)";
            ctx.beginPath();
            ctx.moveTo(cx, y - 22);
            ctx.lineTo(cx + 26, y + 8);
            ctx.lineTo(cx + 12, y + 8);
            ctx.lineTo(cx, y - 6);
            ctx.lineTo(cx - 12, y + 8);
            ctx.lineTo(cx - 26, y + 8);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }

    /** Luces de colores a lo largo de los carriles laterales; corren al pasar por una rampa. */
    function dibujarLucesCarril(m, ctx, estado, dtMs) {
        var colores = ["#ff6b6b", "#ff922b", "#ffd43b", "#51cf66", "#3bc9db", "#4dabf7", "#b197fc"];
        var t = m.tiempo / 1000;
        m.lucesCarril = Math.max(0, m.lucesCarril - dtMs / 1400);
        [92, estado.ancho - 92].forEach(function (x, lado) {
            for (var i = 0; i < 7; i++) {
                var y = 470 + i * 72;
                var col = colores[lado ? 6 - i : i];
                var ola = m.lucesCarril > 0 ? Math.max(0, Math.sin((t * 9 - i * 0.8))) : 0;
                var base = m.menosEfectos ? 0.5 : 0.35 + 0.2 * Math.sin(t * 2 + i);
                var a = Math.min(1, base + ola * m.lucesCarril + (m.celebrando ? 0.5 : 0));
                ctx.fillStyle = alfa(col, a);
                if (brillo(m) && a > 0.6) { ctx.shadowColor = col; ctx.shadowBlur = 14; }
                redondo(ctx, x - 9, y - 22, 18, 44, 9);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        });
    }

    /** Aro (portal) de energía dorado, plano sobre la mesa: la perspectiva lo vuelve elipse. */
    function dibujarAro(m, ctx, estado) {
        var aro = estado.aro;
        if (!aro) return;
        var t = m.tiempo / 1000;
        var pulso = 1 + (m.menosEfectos ? 0 : Math.sin(t * 3) * 0.03) + aro.brillo * 0.12;
        var r = aro.radio * pulso;
        ctx.save();
        if (!m.menosEfectos) {
            var halo = ctx.createRadialGradient(aro.x, aro.y, r * 0.7, aro.x, aro.y, r * 1.45);
            halo.addColorStop(0, "rgba(255,212,59," + (0.35 + aro.brillo * 0.5) + ")");
            halo.addColorStop(1, "rgba(255,212,59,0)");
            ctx.fillStyle = halo;
            ctx.beginPath(); ctx.arc(aro.x, aro.y, r * 1.45, 0, PI2); ctx.fill();
        }
        ctx.lineWidth = 16;
        var g = ctx.createLinearGradient(aro.x - r, aro.y - r, aro.x + r, aro.y + r);
        g.addColorStop(0, "#fff3bf");
        g.addColorStop(0.5, "#ffd43b");
        g.addColorStop(1, "#f08c00");
        ctx.strokeStyle = g;
        if (brillo(m)) { ctx.shadowColor = "#ffd43b"; ctx.shadowBlur = 24 + aro.brillo * 30; }
        ctx.beginPath(); ctx.arc(aro.x, aro.y, r, 0, PI2); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(255,255,255,0.75)";
        ctx.beginPath(); ctx.arc(aro.x, aro.y, r - 4, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
        ctx.restore();
    }

    /** Rampas: tubos de neón violeta con relleno brillante. */
    function dibujarRampas(m, ctx, estado) {
        ctx.save();
        ctx.lineCap = "round";
        estado.rampas.forEach(function (r) {
            r.brillo = Math.max(0, (r.brillo || 0) - 0.03);
            ctx.strokeStyle = "rgba(0,0,0,0.45)";
            ctx.lineWidth = 26;
            ctx.beginPath(); ctx.moveTo(r.x1, r.y1 + 10); ctx.lineTo(r.x2, r.y2 + 10); ctx.stroke();
            ctx.strokeStyle = oscuro(r.color, 0.35);
            ctx.lineWidth = 22;
            ctx.beginPath(); ctx.moveTo(r.x1, r.y1); ctx.lineTo(r.x2, r.y2); ctx.stroke();
            ctx.strokeStyle = r.brillo > 0.05 ? "#ffffff" : claro(r.color, 0.35);
            if (brillo(m)) { ctx.shadowColor = r.color; ctx.shadowBlur = 14 + r.brillo * 26; }
            ctx.lineWidth = 9;
            ctx.beginPath(); ctx.moveTo(r.x1, r.y1 - 4); ctx.lineTo(r.x2, r.y2 - 4); ctx.stroke();
            ctx.shadowBlur = 0;
        });
        ctx.restore();
    }

    /** Zona de caída: un resplandor azul suave, nunca un pozo oscuro. */
    function dibujarDrenaje(m, ctx, estado) {
        var cx = estado.ancho / 2, cy = estado.alto - 20;
        var t = m.tiempo / 1000;
        var g = ctx.createRadialGradient(cx, cy, 6, cx, cy, 150);
        g.addColorStop(0, "rgba(116,192,252,0.55)");
        g.addColorStop(1, "rgba(116,192,252,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, 150, Math.PI, PI2); ctx.fill();
        if (m.menosEfectos) return;
        ctx.strokeStyle = "rgba(165,216,255," + (0.35 + 0.2 * Math.sin(t * 3)) + ")";
        ctx.lineWidth = 4;
        ctx.setLineDash([16, 12]);
        ctx.lineDashOffset = t * 30;
        ctx.beginPath(); ctx.arc(cx, cy, 90, Math.PI, PI2); ctx.stroke();
        ctx.setLineDash([]);
    }

    /** Rebotadores triangulares (cian a la izquierda, amarillo a la derecha). */
    function dibujarRebotadores(m, ctx, estado) {
        estado.rebotadores.forEach(function (s) {
            var pie = pieDePared(estado, s.lado);
            var alto = 16;
            // Cara lateral (espesor) y luego la tapa, desplazada hacia -Y.
            ctx.save();
            ctx.fillStyle = "rgba(0,0,0,0.45)";
            tri(ctx, s.x1, s.y1 + 8, s.x2, s.y2 + 8, pie.x, pie.y + 8); ctx.fill();
            ctx.fillStyle = oscuro(s.color, 0.45);
            tri(ctx, s.x1, s.y1, s.x2, s.y2, pie.x, pie.y); ctx.fill();
            var g = ctx.createLinearGradient(s.x1, s.y1 - alto, pie.x, pie.y - alto);
            g.addColorStop(0, claro(s.color, 0.45));
            g.addColorStop(1, s.color);
            ctx.fillStyle = s.brillo > 0.05 ? claro(s.color, 0.6) : g;
            if (brillo(m)) { ctx.shadowColor = s.color; ctx.shadowBlur = 16 + s.brillo * 34; }
            tri(ctx, s.x1, s.y1 - alto, s.x2, s.y2 - alto, pie.x, pie.y - alto); ctx.fill();
            ctx.shadowBlur = 0;
            // Goma blanca de la cara que golpea.
            ctx.strokeStyle = "rgba(255,255,255," + (0.75 + s.brillo * 0.25) + ")";
            ctx.lineWidth = 9;
            ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(s.x1, s.y1 - alto); ctx.lineTo(s.x2, s.y2 - alto); ctx.stroke();
            ctx.restore();
        });
    }

    /** Dianas: pastillas de luz de pie; se encienden al golpearlas. */
    function dibujarDianas(m, ctx, estado) {
        if (estado.dianasActivas === false) return;
        estado.dianas.forEach(function (d) {
            var on = d.encendida || d.brillo > 0.05;
            ctx.save();
            ctx.translate(d.x, d.y);
            ctx.rotate(d.angulo);
            var w = d.ancho, h = Math.max(18, d.alto);
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            redondo(ctx, -w / 2, -h / 2 + 8, w, h, h / 2); ctx.fill();
            var g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
            g.addColorStop(0, on ? "#ffffff" : claro(d.color, 0.3));
            g.addColorStop(1, on ? claro(d.color, 0.2) : oscuro(d.color, 0.25));
            ctx.fillStyle = g;
            if (on && brillo(m)) { ctx.shadowColor = d.color; ctx.shadowBlur = 24 + d.brillo * 30; }
            redondo(ctx, -w / 2, -h / 2 - 4, w, h, h / 2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = "rgba(255,255,255,0.8)";
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.restore();
            if (d.brillo > 0) d.brillo = Math.max(0, d.brillo - 0.02);
        });
    }

    /** Bumpers tipo hongo: base oscura, falda luminosa y tapa abombada que se eleva. */
    function dibujarBumpers(m, ctx, estado, dtMs) {
        var t = m.tiempo / 1000;
        estado.bumpers.forEach(function (b, i) {
            var r = estado.radioBumper * (1 + b.brillo * 0.12);
            var alto = 22 - b.brillo * 8;                 // al golpear, la tapa se hunde
            var col = b.color;
            // Sombra.
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.beginPath(); ctx.ellipse(b.x + 4, b.y + 12, r * 1.08, r * 0.95, 0, 0, PI2); ctx.fill();
            // Aro de luz en la base.
            if (!m.menosEfectos) {
                var halo = ctx.createRadialGradient(b.x, b.y, r * 0.6, b.x, b.y, r * (1.9 + b.brillo));
                halo.addColorStop(0, alfa(col, 0.55 + b.brillo * 0.4));
                halo.addColorStop(1, alfa(col, 0));
                ctx.fillStyle = halo;
                ctx.beginPath(); ctx.arc(b.x, b.y, r * (1.9 + b.brillo), 0, PI2); ctx.fill();
            }
            // Cuerpo cilíndrico.
            ctx.fillStyle = oscuro(col, 0.5);
            ctx.beginPath(); ctx.arc(b.x, b.y, r * 0.95, 0, PI2); ctx.fill();
            ctx.fillRect(b.x - r * 0.95, b.y - alto, r * 1.9, alto);
            // Falda metálica.
            ctx.strokeStyle = "rgba(220,225,240,0.9)";
            ctx.lineWidth = 6;
            ctx.beginPath(); ctx.arc(b.x, b.y - alto * 0.45, r * 0.98, 0, Math.PI); ctx.stroke();
            // Tapa.
            var tap = ctx.createRadialGradient(b.x - r * 0.35, b.y - alto - r * 0.4, r * 0.1, b.x, b.y - alto, r);
            tap.addColorStop(0, "#ffffff");
            tap.addColorStop(0.3, b.brillo > 0.05 ? "#ffffff" : claro(col, 0.35));
            tap.addColorStop(1, col);
            ctx.fillStyle = tap;
            if (brillo(m) && b.brillo > 0.05) { ctx.shadowColor = col; ctx.shadowBlur = 30; }
            ctx.beginPath(); ctx.arc(b.x, b.y - alto, r, 0, PI2); ctx.fill();
            ctx.shadowBlur = 0;
            // Anillo interior y destello.
            ctx.strokeStyle = "rgba(255,255,255,0.65)";
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(b.x, b.y - alto, r * 0.62, 0, PI2); ctx.stroke();
            ctx.fillStyle = "rgba(255,255,255,0.9)";
            ctx.beginPath(); ctx.ellipse(b.x - r * 0.35, b.y - alto - r * 0.42, r * 0.22, r * 0.13, -0.5, 0, PI2); ctx.fill();
            if (b.brillo > 0) b.brillo = Math.max(0, b.brillo - dtMs / 340);
            void i; void t;
        });
    }

    /** Palancas: barras gruesas que se afinan hacia la punta, con canto y franja de luz. */
    function dibujarFlippers(m, ctx, estado) {
        ["izquierda", "derecha"].forEach(function (lado) {
            var f = estado.flippers[lado];
            var col = lado === "izquierda" ? "#ff6b3d" : "#ffd43b";
            var p = { x: f.pivoteX + Math.cos(f.angulo) * f.largo, y: f.pivoteY + Math.sin(f.angulo) * f.largo };
            var r0 = 22, r1 = 11, alto = 14;
            ctx.save();
            // Sombra.
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            barra(ctx, f.pivoteX + 4, f.pivoteY + 12, p.x + 4, p.y + 12, r0, r1); ctx.fill();
            // Canto.
            ctx.fillStyle = oscuro(col, 0.45);
            barra(ctx, f.pivoteX, f.pivoteY, p.x, p.y, r0, r1); ctx.fill();
            // Cara superior elevada.
            var g = ctx.createLinearGradient(f.pivoteX, f.pivoteY - alto - r0, f.pivoteX, f.pivoteY - alto + r0);
            g.addColorStop(0, claro(col, 0.55));
            g.addColorStop(0.5, col);
            g.addColorStop(1, oscuro(col, 0.15));
            ctx.fillStyle = g;
            if (brillo(m) && f.brillo > 0.05) { ctx.shadowColor = col; ctx.shadowBlur = 20 + f.brillo * 40; }
            barra(ctx, f.pivoteX, f.pivoteY - alto, p.x, p.y - alto, r0, r1); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = "rgba(255,255,255," + (0.6 + f.brillo * 0.4) + ")";
            ctx.lineWidth = 3;
            ctx.stroke();
            // Perno.
            var pg = ctx.createRadialGradient(f.pivoteX - 4, f.pivoteY - alto - 5, 2, f.pivoteX, f.pivoteY - alto, 13);
            pg.addColorStop(0, "#ffffff");
            pg.addColorStop(1, "#7a849e");
            ctx.fillStyle = pg;
            ctx.beginPath(); ctx.arc(f.pivoteX, f.pivoteY - alto, 11, 0, PI2); ctx.fill();
            ctx.restore();
        });
    }

    /** Esfera de energía: metal rosado con brillo especular, halo y estela. */
    function dibujarBola(m, ctx, estado, dentroDelTubo) {
        var b = estado.bola;
        if (!b || !b.viva) return;
        if (!!b.enTubo !== !!dentroDelTubo) return;   // la del tubo se pinta entre el cristal
        var r = estado.radioBola;
        var elev = 6;
        if (!m.menosEfectos && b.estela.length > 2) {
            for (var i = 0; i < b.estela.length; i++) {
                var e = b.estela[i];
                var k = i / b.estela.length;
                ctx.fillStyle = "rgba(255,120,220," + (k * 0.35) + ")";
                ctx.beginPath(); ctx.arc(e.x, e.y - elev, r * (0.25 + k * 0.7), 0, PI2); ctx.fill();
            }
        }
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath(); ctx.ellipse(b.x + 5, b.y + 12, r * 0.95, r * 0.6, 0, 0, PI2); ctx.fill();
        if (!m.menosEfectos) {
            var halo = ctx.createRadialGradient(b.x, b.y - elev, r * 0.8, b.x, b.y - elev, r * 2.6);
            halo.addColorStop(0, "rgba(255,110,210,0.55)");
            halo.addColorStop(1, "rgba(255,110,210,0)");
            ctx.fillStyle = halo;
            ctx.beginPath(); ctx.arc(b.x, b.y - elev, r * 2.6, 0, PI2); ctx.fill();
        }
        var g = ctx.createRadialGradient(b.x - r * 0.4, b.y - elev - r * 0.45, r * 0.08, b.x, b.y - elev, r);
        g.addColorStop(0, "#ffffff");
        g.addColorStop(0.25, "#ffc9f0");
        g.addColorStop(0.6, "#f04fc6");
        g.addColorStop(0.9, "#8e1a8a");
        g.addColorStop(1, "#4a0a52");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(b.x, b.y - elev, r, 0, PI2); ctx.fill();
        // Banda que gira: sensación de rodar.
        ctx.save();
        ctx.beginPath(); ctx.arc(b.x, b.y - elev, r, 0, PI2); ctx.clip();
        ctx.translate(b.x, b.y - elev);
        ctx.rotate(b.giro);
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        ctx.beginPath(); ctx.ellipse(0, r * 0.3, r * 1.1, r * 0.2, 0, 0, PI2); ctx.fill();
        ctx.restore();
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.beginPath(); ctx.ellipse(b.x - r * 0.36, b.y - elev - r * 0.42, r * 0.22, r * 0.14, -0.6, 0, PI2); ctx.fill();
    }

    /**
     * Tubos laterales de energía (como el de la imagen de referencia): cristal translúcido con
     * anillos de neón, energía que sube por dentro y un lanzador con resorte al pie. La bola
     * se ve viajando dentro del tubo antes de caer a la mesa por la boca de la cabecera.
     */
    function trazarRuta(ctx, pts) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (var k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
    }

    /** Cristal de los dos tubos (capa fija): sombra, cuerpo translúcido y núcleo oscuro. */
    function dibujarTubosFijos(m, ctx, estado) {
        ["izquierda", "derecha"].forEach(function (lado) {
            var pts = m.ptsTubo[lado];
            var col = lado === "izquierda" ? "#3bc9db" : "#ff4fd8";
            ctx.save();
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.strokeStyle = "rgba(0,0,0,0.45)";
            ctx.lineWidth = 58;
            ctx.translate(4, 10); trazarRuta(ctx, pts); ctx.stroke(); ctx.translate(-4, -10);
            ctx.strokeStyle = alfa(col, 0.24);
            if (brillo(m)) { ctx.shadowColor = col; ctx.shadowBlur = 18; }
            ctx.lineWidth = 54;
            trazarRuta(ctx, pts); ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = "rgba(10,6,30,0.55)";
            ctx.lineWidth = 38;
            trazarRuta(ctx, pts); ctx.stroke();
            ctx.restore();
        });
    }

    function dibujarTubos(m, ctx, estado) {
        if (!m.ptsTubo) return;
        var t = m.tiempo / 1000;
        var bola = estado.bola;
        ["izquierda", "derecha"].forEach(function (lado) {
            var activo = bola && bola.viva && bola.enTubo && bola.enTubo.lado === lado;
            var col = lado === "izquierda" ? "#3bc9db" : "#ff4fd8";
            var pts = m.ptsTubo[lado];
            function trazar() { trazarRuta(ctx, pts); }
            ctx.save();
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            // El cristal se ilumina mientras la bola lo recorre.
            if (activo) {
                ctx.strokeStyle = alfa(col, 0.3);
                if (brillo(m)) { ctx.shadowColor = col; ctx.shadowBlur = 30; }
                ctx.lineWidth = 54;
                trazar(); ctx.stroke();
                ctx.shadowBlur = 0;
            }
            // Energía que corre hacia la boca.
            ctx.strokeStyle = activo ? "#ffffff" : alfa(col, 0.8);
            ctx.lineWidth = activo ? 8 : 5;
            ctx.setLineDash([22, 30]);
            ctx.lineDashOffset = -t * (activo ? 900 : 160);
            trazar(); ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();

            // La bola, dentro del cristal.
            if (activo) dibujarBola(m, ctx, estado, true);

            // Anillos de neón alrededor del tubo; se encienden en ola cuando pasa la bola.
            ctx.save();
            ctx.lineCap = "round";
            for (var j = 2; j < pts.length - 4; j += 5) {
                var p0 = pts[j - 1], p1 = pts[j + 1], p = pts[j];
                var ang = Math.atan2(p1.y - p0.y, p1.x - p0.x) + Math.PI / 2;
                var cerca = activo ? Math.max(0, 1 - Math.abs(j / 80 - bola.enTubo.u) * 8) : 0;
                var on = 0.45 + 0.25 * Math.sin(t * 4 - j * 0.4) + cerca * 0.6;
                ctx.strokeStyle = cerca > 0.2 ? "#ffffff" : alfa(col, Math.min(1, on));
                if (brillo(m) && (cerca > 0.2 || j % 10 === 2)) { ctx.shadowColor = col; ctx.shadowBlur = 12 + cerca * 20; }
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.moveTo(p.x + Math.cos(ang) * 30, p.y + Math.sin(ang) * 30);
                ctx.lineTo(p.x - Math.cos(ang) * 30, p.y - Math.sin(ang) * 30);
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
            // Brillo del cristal (reflejo).
            ctx.strokeStyle = "rgba(255,255,255,0.35)";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(pts[0].x - 14, pts[0].y);
            for (var q = 1; q < pts.length * 0.62; q++) ctx.lineTo(pts[q].x - 14, pts[q].y);
            ctx.stroke();
            ctx.restore();

            // Boca: aro luminoso donde el tubo atraviesa el riel.
            var boca = pts[pts.length - 1];
            ctx.save();
            ctx.fillStyle = alfa(col, activo ? 0.9 : 0.5);
            if (brillo(m)) { ctx.shadowColor = col; ctx.shadowBlur = activo ? 34 : 14; }
            ctx.beginPath(); ctx.arc(boca.x, boca.y, 26, 0, PI2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = "rgba(10,6,30,0.85)";
            ctx.beginPath(); ctx.arc(boca.x, boca.y, 17, 0, PI2); ctx.fill();
            ctx.restore();

            dibujarLanzador(m, ctx, pts[0], col, activo ? bola.enTubo.ms : null);
        });
    }

    /** Lanzador con resorte al pie de cada tubo: se comprime y destella al disparar. */
    function dibujarLanzador(m, ctx, p, col, msDisparo) {
        var disparo = msDisparo !== null && msDisparo < 260 ? 1 - msDisparo / 260 : 0;
        var x = p.x, y = p.y;
        ctx.save();
        // Caja metálica.
        var g = ctx.createLinearGradient(x - 34, 0, x + 34, 0);
        g.addColorStop(0, "#5a6480");
        g.addColorStop(0.5, "#dfe6f5");
        g.addColorStop(1, "#5a6480");
        ctx.fillStyle = g;
        redondo(ctx, x - 34, y + 14, 68, 62, 12);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.lineWidth = 3;
        ctx.stroke();
        // Resorte (se estira al disparar).
        var alto = 40 * (1 - disparo * 0.5);
        ctx.strokeStyle = "#ffd43b";
        ctx.lineWidth = 4;
        ctx.beginPath();
        for (var i = 0; i <= 8; i++) {
            var yy = y + 70 - (alto * i) / 8;
            ctx.lineTo(x + (i % 2 ? 14 : -14), yy);
        }
        ctx.stroke();
        // Botón de energía.
        ctx.fillStyle = disparo > 0 ? "#ffffff" : col;
        if (brillo(m)) { ctx.shadowColor = col; ctx.shadowBlur = 16 + disparo * 40; }
        ctx.beginPath(); ctx.arc(x, y + 70 - alto - 8, 12 + disparo * 6, 0, PI2); ctx.fill();
        ctx.restore();
    }

    /** Rieles de neón sobre las paredes: el borde elevado que encierra el juego. */
    function dibujarRieles(m, ctx, estado) {
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        var muros = estado.muros;
        // Sombra interior.
        ctx.strokeStyle = "rgba(10,6,30,0.8)";
        ctx.lineWidth = 18;
        trazarMuros(ctx, muros); ctx.stroke();
        ctx.strokeStyle = "#c5b3ff";
        ctx.lineWidth = 8;
        if (brillo(m)) { ctx.shadowColor = "rgba(160,120,255,0.9)"; ctx.shadowBlur = 18; }
        trazarMuros(ctx, muros); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 2;
        trazarMuros(ctx, muros); ctx.stroke();
        ctx.restore();
    }

    function trazarMuros(ctx, muros) {
        ctx.beginPath();
        muros.forEach(function (w) { ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); });
    }

    /** Flecha y resplandor sobre la palanca del lado por donde viene la bola. */
    function dibujarAviso(m, ctx, estado, dtMs) {
        if (!m.aviso) return;
        m.aviso.ms -= dtMs;
        if (m.aviso.ms <= 0) { m.aviso = null; return; }
        var f = estado.flippers[m.aviso.lado];
        var t = m.tiempo / 1000;
        var x = f.pivoteX + (m.aviso.lado === "izquierda" ? 60 : -60);
        var y = f.pivoteY - 150 + Math.sin(t * 10) * 10;
        ctx.save();
        ctx.fillStyle = "#ff4fd8";
        if (brillo(m)) { ctx.shadowColor = "#ff4fd8"; ctx.shadowBlur = 24; }
        ctx.beginPath();
        ctx.moveTo(x, y + 50);
        ctx.lineTo(x - 30, y + 10);
        ctx.lineTo(x - 12, y + 10);
        ctx.lineTo(x - 12, y - 30);
        ctx.lineTo(x + 12, y - 30);
        ctx.lineTo(x + 12, y + 10);
        ctx.lineTo(x + 30, y + 10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    /** Rótulos de la presentación, como en la imagen de referencia. */
    function dibujarEtiquetas(m, ctx, estado) {
        ctx.save();
        ctx.font = "700 34px " + FUENTE;
        ctx.textAlign = "center";
        ctx.lineJoin = "round";
        function rotulo(txt, x, y) {
            var lineas = txt.split("\n");
            lineas.forEach(function (l, i) {
                ctx.lineWidth = 8;
                ctx.strokeStyle = "rgba(20,10,50,0.95)";
                ctx.strokeText(l, x, y + i * 38);
                ctx.fillStyle = "#ffffff";
                ctx.fillText(l, x, y + i * 38);
            });
        }
        var fi = estado.flippers.izquierda, fd = estado.flippers.derecha;
        rotulo("Palanca\nIzquierda", fi.pivoteX + 40, fi.pivoteY - 230);
        rotulo("Palanca\nDerecha", fd.pivoteX - 40, fd.pivoteY - 230);
        // El rótulo de la esfera solo mientras está lejos de las palancas: abajo se encimaría.
        if (estado.bola && estado.bola.viva && !estado.bola.enTubo && estado.bola.y < fi.pivoteY - 420) {
            rotulo("Esfera Metálica\nde Energía", Math.max(220, Math.min(estado.ancho - 220, estado.bola.x)), estado.bola.y - 110);
        }
        ctx.restore();
    }

    // ------------------------------------------------------------------ partículas

    function chispas(m, x, y, color, cantidad) {
        if (m.menosEfectos) cantidad = Math.ceil(cantidad / 3);
        for (var i = 0; i < cantidad; i++) {
            var ang = Math.random() * PI2;
            var vel = 90 + Math.random() * 280;
            m.particulas.push({
                x: x, y: y, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel - 80,
                vida: 1, decae: 1.4 + Math.random(), r: 3 + Math.random() * 5, color: color || "#ffd43b"
            });
        }
        if (m.particulas.length > 420) m.particulas.splice(0, m.particulas.length - 420);
    }

    function estrellasCelebracion(m, cantidad) {
        var cols = ["#ffd43b", "#b197fc", "#4dabf7", "#f783ac", "#3bc9db", "#51cf66"];
        for (var i = 0; i < cantidad; i++) {
            m.particulas.push({
                x: Math.random() * m.ancho, y: -40 - Math.random() * 400,
                vx: (Math.random() - 0.5) * 100, vy: 120 + Math.random() * 240,
                vida: 1, decae: 0.28, r: 8 + Math.random() * 10, color: cols[i % cols.length], estrella: true
            });
        }
    }

    function dibujarParticulas(m, ctx, dtMs) {
        var dt = dtMs / 1000;
        for (var i = m.particulas.length - 1; i >= 0; i--) {
            var p = m.particulas[i];
            p.vida -= p.decae * dt;
            if (p.vida <= 0) { m.particulas.splice(i, 1); continue; }
            p.vy += (p.estrella ? 120 : 520) * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            ctx.globalAlpha = Math.max(0, Math.min(1, p.vida));
            ctx.fillStyle = p.color;
            if (p.estrella) { estrella(ctx, p.x, p.y, 5, p.r * 1.6, p.r * 0.7); ctx.fill(); }
            else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.vida, 0, PI2); ctx.fill(); }
        }
        ctx.globalAlpha = 1;
    }

    // ------------------------------------------------------------------ formas

    function redondo(ctx, x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function tri(ctx, ax, ay, bx, by, cx, cy) {
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx, cy); ctx.closePath();
    }

    /** Barra con extremos redondos de radios distintos (palanca que se afina). */
    function barra(ctx, x0, y0, x1, y1, r0, r1) {
        var ang = Math.atan2(y1 - y0, x1 - x0);
        var n = ang + Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(x0 + Math.cos(n) * r0, y0 + Math.sin(n) * r0);
        ctx.lineTo(x1 + Math.cos(n) * r1, y1 + Math.sin(n) * r1);
        ctx.arc(x1, y1, r1, n, n - Math.PI, true);
        ctx.lineTo(x0 - Math.cos(n) * r0, y0 - Math.sin(n) * r0);
        ctx.arc(x0, y0, r0, n - Math.PI, n, true);
        ctx.closePath();
    }

    function estrella(ctx, cx, cy, puntas, rExt, rInt) {
        var paso = Math.PI / puntas, ang = -Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * rExt, cy + Math.sin(ang) * rExt);
        for (var i = 0; i < puntas; i++) {
            ang += paso; ctx.lineTo(cx + Math.cos(ang) * rInt, cy + Math.sin(ang) * rInt);
            ang += paso; ctx.lineTo(cx + Math.cos(ang) * rExt, cy + Math.sin(ang) * rExt);
        }
        ctx.closePath();
    }

    global.MesaPinball = {
        crear: crear,
        redimensionar: redimensionar,
        dibujar: dibujar,
        chispas: chispas,
        estrellasCelebracion: estrellasCelebracion
    };

})(typeof window !== "undefined" ? window : globalThis);
