/**
 * Texturas generadas por código con Phaser.Graphics.
 *
 * Todo se dibuja en runtime en vez de cargar PNG: el paquete no trae assets
 * binarios, cada nivel puede recolorear su cielo sin un archivo nuevo, y no
 * hay esperas de carga ni rutas que se rompan.
 */
(function (global) {
    "use strict";

    var ANCHO = 1280;
    var ALTO = 720;

    function aHex(c) {
        return typeof c === "string" ? parseInt(c.replace("#", ""), 16) : c;
    }

    /** Mezcla dos colores en proporción t (0..1). */
    function mezclar(a, b, t) {
        var ca = aHex(a), cb = aHex(b);
        var ra = (ca >> 16) & 255, ga = (ca >> 8) & 255, ba = ca & 255;
        var rb = (cb >> 16) & 255, gb = (cb >> 8) & 255, bb = cb & 255;
        return (Math.round(ra + (rb - ra) * t) << 16) |
               (Math.round(ga + (gb - ga) * t) << 8) |
               Math.round(ba + (bb - ba) * t);
    }

    /**
     * Cielo en degradado por bandas horizontales.
     * Recibe el tamaño porque el lienzo cambia de forma según la pantalla.
     */
    function cielo(scene, clave, colorAlto, colorBajo, ancho, alto) {
        /* Nunca se regenera una textura existente: Phaser liberaría su
           textura de GPU aunque haya sprites o emisores usándola, dejándolos
           con glTexture null y rompiendo el render. Si la clave ya existe se
           reutiliza; para una variante distinta, pásale otra clave. */
        if (scene.textures.exists(clave)) return;
        var w = ancho || ANCHO;
        var hh = alto || ALTO;
        var g = scene.make.graphics({ x: 0, y: 0, add: false });
        var bandas = 72;
        var h = Math.ceil(hh / bandas);
        var i;
        for (i = 0; i < bandas; i++) {
            g.fillStyle(mezclar(colorAlto, colorBajo, i / (bandas - 1)), 1);
            g.fillRect(0, i * h, w, h + 1);
        }
        g.generateTexture(clave, w, hh);
        g.destroy();
    }

    /** Nebulosa: manchas suaves por círculos concéntricos translúcidos. */
    function nebulosa(scene, clave, color) {
        /* Nunca se regenera una textura existente: Phaser liberaría su
           textura de GPU aunque haya sprites o emisores usándola, dejándolos
           con glTexture null y rompiendo el render. Si la clave ya existe se
           reutiliza; para una variante distinta, pásale otra clave. */
        if (scene.textures.exists(clave)) return;
        var r = 260;
        var g = scene.make.graphics({ x: 0, y: 0, add: false });
        var pasos = 34;
        var i, t;
        for (i = pasos; i > 0; i--) {
            t = i / pasos;
            g.fillStyle(aHex(color), 0.055 * (1 - t) + 0.012);
            g.fillCircle(r, r, r * t);
        }
        g.generateTexture(clave, r * 2, r * 2);
        g.destroy();
    }

    /** Punto de estrella de fondo (decorativa, no interactiva). */
    function polvo(scene, clave) {
        /* Nunca se regenera una textura existente: Phaser liberaría su
           textura de GPU aunque haya sprites o emisores usándola, dejándolos
           con glTexture null y rompiendo el render. Si la clave ya existe se
           reutiliza; para una variante distinta, pásale otra clave. */
        if (scene.textures.exists(clave)) return;
        var g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xffffff, 1);
        g.fillCircle(4, 4, 1.6);
        g.fillStyle(0xffffff, 0.3);
        g.fillCircle(4, 4, 3.4);
        g.generateTexture(clave, 8, 8);
        g.destroy();
    }

    /** Partícula genérica de brillo. */
    function chispa(scene, clave) {
        /* Nunca se regenera una textura existente: Phaser liberaría su
           textura de GPU aunque haya sprites o emisores usándola, dejándolos
           con glTexture null y rompiendo el render. Si la clave ya existe se
           reutiliza; para una variante distinta, pásale otra clave. */
        if (scene.textures.exists(clave)) return;
        var g = scene.make.graphics({ x: 0, y: 0, add: false });
        var pasos = 12, i, t;
        for (i = pasos; i > 0; i--) {
            t = i / pasos;
            g.fillStyle(0xffffff, 0.11);
            g.fillCircle(16, 16, 16 * t);
        }
        g.generateTexture(clave, 32, 32);
        g.destroy();
    }

    /**
     * Estrella de 5 puntas.
     * @param {boolean} encendida apagada = por conectar; encendida = ya unida
     */
    function estrella(scene, clave, encendida) {
        /* Nunca se regenera una textura existente: Phaser liberaría su
           textura de GPU aunque haya sprites o emisores usándola, dejándolos
           con glTexture null y rompiendo el render. Si la clave ya existe se
           reutiliza; para una variante distinta, pásale otra clave. */
        if (scene.textures.exists(clave)) return;
        var lado = 104;
        var c = lado / 2;
        var rExt = 40, rInt = 17;
        var g = scene.make.graphics({ x: 0, y: 0, add: false });

        var halo = encendida ? 0x7dd3fc : 0x334155;
        var pasos = 16, i, t;
        for (i = pasos; i > 0; i--) {
            t = i / pasos;
            g.fillStyle(halo, encendida ? 0.10 : 0.05);
            g.fillCircle(c, c, (rExt + 12) * t);
        }

        function puntas(radioExt, radioInt) {
            var pts = [];
            var k, ang, r;
            for (k = 0; k < 10; k++) {
                ang = -Math.PI / 2 + k * Math.PI / 5;
                r = (k % 2 === 0) ? radioExt : radioInt;
                pts.push({ x: c + Math.cos(ang) * r, y: c + Math.sin(ang) * r });
            }
            return pts;
        }

        /* Borde primero y cuerpo encima: da un contorno nítido sin strokePath,
           que en Phaser 4 no cierra bien los picos agudos. */
        g.fillStyle(encendida ? 0xbae6fd : 0x1e293b, 1);
        g.fillPoints(puntas(rExt, rInt), true);
        g.fillStyle(encendida ? 0xfef9c3 : 0x334155, 1);
        g.fillPoints(puntas(rExt - 5, rInt - 2), true);
        if (encendida) {
            g.fillStyle(0xffffff, 0.92);
            g.fillPoints(puntas(rExt - 15, rInt - 6), true);
        }
        g.generateTexture(clave, lado, lado);
        g.destroy();
    }

    /** Anillo del radar que rodea a la estrella que toca ahora. */
    function anillo(scene, clave) {
        /* Nunca se regenera una textura existente: Phaser liberaría su
           textura de GPU aunque haya sprites o emisores usándola, dejándolos
           con glTexture null y rompiendo el render. Si la clave ya existe se
           reutiliza; para una variante distinta, pásale otra clave. */
        if (scene.textures.exists(clave)) return;
        var lado = 150, c = lado / 2;
        var g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.lineStyle(5, 0x22d3ee, 0.95);
        g.strokeCircle(c, c, 54);
        g.lineStyle(2, 0xa5f3fc, 0.55);
        g.strokeCircle(c, c, 64);
        g.generateTexture(clave, lado, lado);
        g.destroy();
    }

    /** Planeta del mapa: disco con terminador y brillo. */
    function planeta(scene, clave, color, radio) {
        /* Nunca se regenera una textura existente: Phaser liberaría su
           textura de GPU aunque haya sprites o emisores usándola, dejándolos
           con glTexture null y rompiendo el render. Si la clave ya existe se
           reutiliza; para una variante distinta, pásale otra clave. */
        if (scene.textures.exists(clave)) return;
        var r = radio || 54;
        var lado = r * 2 + 24;
        var c = lado / 2;
        var g = scene.make.graphics({ x: 0, y: 0, add: false });

        var pasos = 14, i, t;
        for (i = pasos; i > 0; i--) {
            t = i / pasos;
            g.fillStyle(aHex(color), 0.07);
            g.fillCircle(c, c, (r + 11) * t);
        }
        g.fillStyle(aHex(color), 1);
        g.fillCircle(c, c, r);
        /* Lado oscuro: un disco desplazado más oscuro da volumen sin gradientes. */
        g.fillStyle(mezclar(color, "#000000", 0.45), 0.55);
        g.fillCircle(c + r * 0.3, c + r * 0.22, r * 0.92);
        g.fillStyle(mezclar(color, "#ffffff", 0.55), 0.5);
        g.fillCircle(c - r * 0.3, c - r * 0.32, r * 0.3);
        g.generateTexture(clave, lado, lado);
        g.destroy();
    }

    /** Candado de los mundos bloqueados. */
    function candado(scene, clave) {
        /* Nunca se regenera una textura existente: Phaser liberaría su
           textura de GPU aunque haya sprites o emisores usándola, dejándolos
           con glTexture null y rompiendo el render. Si la clave ya existe se
           reutiliza; para una variante distinta, pásale otra clave. */
        if (scene.textures.exists(clave)) return;
        var g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x0f172a, 0.82);
        g.fillCircle(32, 32, 30);
        g.lineStyle(6, 0x94a3b8, 1);
        g.strokeCircle(32, 26, 11);
        g.fillStyle(0xcbd5e1, 1);
        g.fillRoundedRect(18, 30, 28, 22, 5);
        g.generateTexture(clave, 64, 64);
        g.destroy();
    }

    /** Perfil de la ojiva: devuelve el semiancho del casco a la altura t (0..1). */
    function semiCasco(t) {
        return Math.sin(t * Math.PI / 2) * 43;
    }

    /** Dibuja el casco de la nave en `g`, opcionalmente plano (silueta). */
    function dibujarCasco(g, cx, yPunta, yBase, plano) {
        var pasos = 26, i, t, prox;
        for (i = 0; i < pasos; i++) {
            t = i / pasos;
            prox = (i + 1) / pasos;
            if (!plano) g.fillStyle(mezclar("#e2e8f0", "#94a3b8", t * 0.75), 1);
            g.fillPoints([
                { x: cx - semiCasco(t), y: yPunta + (yBase - yPunta) * t },
                { x: cx + semiCasco(t), y: yPunta + (yBase - yPunta) * t },
                { x: cx + semiCasco(prox), y: yPunta + (yBase - yPunta) * prox },
                { x: cx - semiCasco(prox), y: yPunta + (yBase - yPunta) * prox }
            ], true);
        }
    }

    function dibujarAletas(g, cx, yBase) {
        g.fillPoints([{ x: cx - 42, y: yBase - 46 }, { x: cx - 74, y: yBase + 22 },
                      { x: cx - 40, y: yBase + 6 }], true);
        g.fillPoints([{ x: cx + 42, y: yBase - 46 }, { x: cx + 74, y: yBase + 22 },
                      { x: cx + 40, y: yBase + 6 }], true);
    }

    /**
     * Nave espacial vista de frente. Los paneles solares van aparte para
     * poder desplegarlos con un tween.
     */
    function naveCuerpo(scene, clave) {
        /* Nunca se regenera una textura existente: Phaser liberaría su
           textura de GPU aunque haya sprites o emisores usándola, dejándolos
           con glTexture null y rompiendo el render. Si la clave ya existe se
           reutiliza; para una variante distinta, pásale otra clave. */
        if (scene.textures.exists(clave)) return;
        var W = 150, H = 260;
        var cx = W / 2, yPunta = 14, yBase = H - 54;
        var g = scene.make.graphics({ x: 0, y: 0, add: false });

        dibujarCasco(g, cx, yPunta, yBase, false);

        g.fillStyle(0x0ea5e9, 1);
        dibujarAletas(g, cx, yBase);

        // Tobera
        g.fillStyle(0x475569, 1);
        g.fillPoints([{ x: cx - 30, y: yBase }, { x: cx + 30, y: yBase },
                      { x: cx + 22, y: yBase + 32 }, { x: cx - 22, y: yBase + 32 }], true);

        // Ventana
        g.fillStyle(0x0c4a6e, 1);
        g.fillCircle(cx, 92, 23);
        g.fillStyle(0x38bdf8, 1);
        g.fillCircle(cx, 92, 18);
        g.fillStyle(0xe0f2fe, 0.75);
        g.fillCircle(cx - 6, 85, 7);

        // Franja
        g.fillStyle(0xef4444, 1);
        g.fillRect(cx - 34, 150, 68, 13);

        g.generateTexture(clave, W, H);
        g.destroy();
    }

    /** Panel solar: se despliega con un tween de escala. */
    function panelSolar(scene, clave) {
        /* Nunca se regenera una textura existente: Phaser liberaría su
           textura de GPU aunque haya sprites o emisores usándola, dejándolos
           con glTexture null y rompiendo el render. Si la clave ya existe se
           reutiliza; para una variante distinta, pásale otra clave. */
        if (scene.textures.exists(clave)) return;
        var W = 92, H = 56;
        var g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x1e3a8a, 1);
        g.fillRoundedRect(0, 0, W, H, 4);
        g.fillStyle(0x3b82f6, 1);
        var cx, cy;
        for (cx = 0; cx < 3; cx++) {
            for (cy = 0; cy < 2; cy++) {
                g.fillRect(6 + cx * 28, 6 + cy * 24, 23, 19);
            }
        }
        g.lineStyle(2, 0x93c5fd, 0.9);
        g.strokeRoundedRect(1, 1, W - 2, H - 2, 4);
        g.generateTexture(clave, W, H);
        g.destroy();
    }

    /** Silueta de la nave, para el revelado previo a su aparición. */
    function naveSilueta(scene, clave) {
        /* Nunca se regenera una textura existente: Phaser liberaría su
           textura de GPU aunque haya sprites o emisores usándola, dejándolos
           con glTexture null y rompiendo el render. Si la clave ya existe se
           reutiliza; para una variante distinta, pásale otra clave. */
        if (scene.textures.exists(clave)) return;
        var W = 150, H = 260;
        var cx = W / 2, yPunta = 14, yBase = H - 54;
        var g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x7dd3fc, 0.5);
        dibujarCasco(g, cx, yPunta, yBase, true);
        dibujarAletas(g, cx, yBase);
        g.generateTexture(clave, W, H);
        g.destroy();
    }

    /** Panel redondeado para carteles y botones. */
    function panel(scene, clave, ancho, alto, color, alfa) {
        /* Nunca se regenera una textura existente: Phaser liberaría su
           textura de GPU aunque haya sprites o emisores usándola, dejándolos
           con glTexture null y rompiendo el render. Si la clave ya existe se
           reutiliza; para una variante distinta, pásale otra clave. */
        if (scene.textures.exists(clave)) return;
        var g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(aHex(color), alfa == null ? 0.88 : alfa);
        g.fillRoundedRect(0, 0, ancho, alto, 22);
        g.lineStyle(3, 0x7dd3fc, 0.55);
        g.strokeRoundedRect(1.5, 1.5, ancho - 3, alto - 3, 21);
        g.generateTexture(clave, ancho, alto);
        g.destroy();
    }

    global.ConstelacionTexturas = {
        ANCHO: ANCHO,
        ALTO: ALTO,
        aHex: aHex,
        mezclar: mezclar,
        cielo: cielo,
        nebulosa: nebulosa,
        polvo: polvo,
        chispa: chispa,
        estrella: estrella,
        anillo: anillo,
        planeta: planeta,
        candado: candado,
        naveCuerpo: naveCuerpo,
        panelSolar: panelSolar,
        naveSilueta: naveSilueta,
        panel: panel
    };
})(typeof window !== "undefined" ? window : globalThis);
