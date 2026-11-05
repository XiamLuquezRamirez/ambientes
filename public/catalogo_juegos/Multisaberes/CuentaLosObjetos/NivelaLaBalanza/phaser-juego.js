/**
 * NivelaBalanzaPhaser — laboratorio espacial con balanza de carga (Phaser 4.2.1).
 * Texturas generadas por código. Módulos internos: ambiente, balanza, aguja,
 * cristales, depósito y cofre.
 */
(function (global) {
    'use strict';

    var Phaser = global.Phaser;
    var L = global.NivelaBalanzaLogica;

    var ANCHO = 1280;
    var ALTO = 720;

    /* Balanza: pivote central, brazos y platillos */
    var PIVOTE_X = 640;
    var PIVOTE_Y = 248;
    var BRAZO = 232;
    /* cuánto sube/baja un platillo por grado de inclinación */
    var PIXEL_POR_GRADO = 3.4;

    var DEPOSITO_Y = 600;
    var DEPOSITO_X = 640;
    var CRISTAL_ESCALA = 0.46;

    /* Dentro del ventanal: sobre la mampara derecha quedaría tapado. */
    var COFRE_X = 1050;
    var COFRE_Y = 148;

    /* El medidor va empotrado en la base de la balanza, no suelto a un lado. */
    var INDICADOR_X = PIVOTE_X;
    var INDICADOR_Y = PIVOTE_Y + 196;

    var game = null;
    var escena = null;
    var cbs = {};
    var opciones = {};
    var listoResolve = null;

    var balanza = null;
    var aguja = null;
    var cristales = [];
    var slotsDeposito = [];
    var estrellas = [];
    var nebulosas = [];
    var cofre = null;
    var textoCofre = null;
    var totalCofreVal = 0;
    var marcaIzq = null;
    var marcaDer = null;
    var bloqueado = false;
    var inclinacionActual = 0;

    function avisar(nombre) {
        var fn = cbs && cbs[nombre];
        if (typeof fn !== 'function') return;
        try { fn.apply(null, Array.prototype.slice.call(arguments, 1)); } catch (e) {}
    }

    function reducido() {
        return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    /**
     * Temporizador de secuencia. No usa scene.time.delayedCall: cuando el canvas
     * convive con la intro 3D el reloj de la escena puede quedarse parado y las
     * fases de la caída no llegarían nunca a ejecutarse.
     */
    function tras(ms, fn) {
        return global.setTimeout(fn, ms);
    }

    function puedeJugar() {
        if (bloqueado) return false;
        if (typeof cbs.puedeInteractuar === 'function') return !!cbs.puedeInteractuar();
        return true;
    }

    /* ================= Texturas ================= */

    function texEstrella(scene) {
        var g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xffffff, 1);
        g.fillCircle(8, 8, 3);
        g.fillStyle(0xffffff, 0.35);
        g.fillCircle(8, 8, 7);
        g.generateTexture('estrella', 16, 16);
        g.destroy();
    }

    function texChispa(scene) {
        var g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xffffff, 1);
        g.fillCircle(6, 6, 6);
        g.generateTexture('chispa', 12, 12);
        g.destroy();
    }

    function texNebulosa(scene) {
        var g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xffffff, 0.22);
        var k;
        for (k = 0; k < 16; k++) {
            var ang = (k / 16) * Math.PI * 2;
            g.fillCircle(
                256 + Math.cos(ang) * (70 + (k % 4) * 22),
                256 + Math.sin(ang) * (50 + (k % 3) * 20),
                120 * (0.5 + 0.5 * Math.sin(k))
            );
        }
        g.generateTexture('nebulosa', 512, 512);
        g.destroy();
    }

    /** Cristal azul facetado, con brillo y borde luminoso. */
    function texCristal(scene) {
        var W = 108, H = 118;
        var g = scene.make.graphics({ x: 0, y: 0, add: false });
        var cx = W / 2;

        g.fillStyle(0x000000, 0.25);
        g.fillEllipse(cx, H - 10, 72, 16);

        /* cuerpo: rombo alargado con facetas */
        g.fillStyle(0x1d4ed8, 1);
        g.fillPoints([
            { x: cx, y: 6 }, { x: W - 10, y: 44 },
            { x: cx, y: H - 14 }, { x: 10, y: 44 }
        ], true);

        g.fillStyle(0x3b82f6, 1);
        g.fillPoints([
            { x: cx, y: 6 }, { x: W - 10, y: 44 },
            { x: cx, y: 70 }
        ], true);

        g.fillStyle(0x60a5fa, 1);
        g.fillPoints([
            { x: cx, y: 6 }, { x: cx, y: 70 }, { x: 10, y: 44 }
        ], true);

        g.fillStyle(0x93c5fd, 1);
        g.fillPoints([
            { x: 10, y: 44 }, { x: cx, y: 70 }, { x: cx, y: H - 14 }
        ], true);

        g.fillStyle(0xbfdbfe, 0.9);
        g.fillPoints([
            { x: cx - 16, y: 20 }, { x: cx - 4, y: 18 },
            { x: cx - 10, y: 52 }, { x: cx - 22, y: 46 }
        ], true);

        g.lineStyle(3, 0xdbeafe, 0.85);
        g.strokePoints([
            { x: cx, y: 6 }, { x: W - 10, y: 44 },
            { x: cx, y: H - 14 }, { x: 10, y: 44 }
        ], true, true);

        g.fillStyle(0xffffff, 0.95);
        g.fillCircle(cx - 18, 30, 4);

        g.generateTexture('cristal', W, H);
        g.destroy();
    }

    function texPlatillo(scene) {
        var W = 230, H = 56;
        var g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x334155, 1);
        g.fillEllipse(W / 2, 30, W - 8, 34);
        g.fillStyle(0x94a3b8, 1);
        g.fillEllipse(W / 2, 24, W - 14, 30);
        g.fillStyle(0xcbd5e1, 1);
        g.fillEllipse(W / 2, 20, W - 40, 20);
        g.lineStyle(3, 0x67e8f9, 0.7);
        g.strokeEllipse(W / 2, 22, W - 18, 28);
        g.generateTexture('platillo', W, H);
        g.destroy();
    }

    function texBarra(scene) {
        var W = BRAZO * 2 + 40, H = 26;
        var g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x475569, 1);
        g.fillRoundedRect(0, 6, W, 16, 8);
        g.fillStyle(0x94a3b8, 1);
        g.fillRoundedRect(0, 6, W, 8, { tl: 8, tr: 8, bl: 0, br: 0 });
        g.fillStyle(0x22d3ee, 0.9);
        g.fillCircle(14, 14, 5);
        g.fillCircle(W - 14, 14, 5);
        g.lineStyle(2, 0x67e8f9, 0.5);
        g.strokeRoundedRect(0, 6, W, 16, 8);
        g.generateTexture('barra', W, H);
        g.destroy();
    }

    /**
     * Columna + consola de instrumentos: el medidor se empotra en esta pieza,
     * así la aguja forma parte de la balanza y no es un panel suelto.
     */
    function texSoporte(scene) {
        var W = 260, H = 300;
        var cx = W / 2;
        var g = scene.make.graphics({ x: 0, y: 0, add: false });

        /* columna */
        g.fillStyle(0x475569, 1);
        g.fillRoundedRect(cx - 24, 0, 48, 150, 10);
        g.fillStyle(0x64748b, 1);
        g.fillRoundedRect(cx - 24, 0, 18, 150, { tl: 10, bl: 10, tr: 0, br: 0 });

        /* consola que aloja el medidor */
        g.fillStyle(0x1e293b, 1);
        g.fillRoundedRect(cx - 108, 116, 216, 104, 20);
        g.fillStyle(0x334155, 1);
        g.fillRoundedRect(cx - 100, 122, 200, 92, 16);
        g.lineStyle(4, 0x67e8f9, 0.75);
        g.strokeRoundedRect(cx - 108, 116, 216, 104, 20);

        /* luces laterales de la consola */
        g.fillStyle(0x22d3ee, 0.9);
        var i;
        for (i = 0; i < 3; i++) {
            g.fillCircle(cx - 92, 142 + i * 28, 5);
            g.fillCircle(cx + 92, 142 + i * 28, 5);
        }

        /* base */
        g.fillStyle(0x0f172a, 1);
        g.fillEllipse(cx, H - 34, 230, 56);
        g.fillStyle(0x334155, 1);
        g.fillEllipse(cx, H - 44, 196, 46);
        g.fillStyle(0x475569, 1);
        g.fillEllipse(cx, H - 52, 150, 32);
        g.lineStyle(3, 0x67e8f9, 0.45);
        g.strokeEllipse(cx, H - 48, 190, 42);

        g.generateTexture('soporte', W, H);
        g.destroy();
    }

    /** Carátula del medidor, empotrada en la consola de la balanza. */
    function texCuadrante(scene) {
        var W = 170, H = 78;
        var g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x020617, 1);
        g.fillRoundedRect(0, 0, W, H, 12);
        g.lineStyle(3, 0x94a3b8, 1);
        g.strokeRoundedRect(0, 0, W, H, 12);

        var cx = W / 2, cy = H - 12, r = 54;
        var k;
        for (k = -4; k <= 4; k++) {
            var a = (-90 + k * 19) * Math.PI / 180;
            var largo = k === 0 ? 16 : 10;
            g.lineStyle(k === 0 ? 4 : 3, k === 0 ? 0x4ade80 : 0x64748b, 0.95);
            g.lineBetween(
                cx + Math.cos(a) * (r - largo), cy + Math.sin(a) * (r - largo),
                cx + Math.cos(a) * r, cy + Math.sin(a) * r
            );
        }

        g.generateTexture('cuadrante', W, H);
        g.destroy();
    }

    function texAguja(scene) {
        var W = 16, H = 78;
        var g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xffffff, 1);
        g.fillTriangle(W / 2, 0, W - 2, H - 12, 2, H - 12);
        g.fillCircle(W / 2, H - 10, 7);
        g.generateTexture('aguja', W, H);
        g.destroy();
    }

    function texBandeja(scene) {
        var W = 900, H = 126;
        var g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x0b1540, 0.78);
        g.fillRoundedRect(0, 0, W, H, 26);
        g.lineStyle(4, 0x38bdf8, 0.65);
        g.strokeRoundedRect(0, 0, W, H, 26);
        g.lineStyle(3, 0x67e8f9, 0.25);
        g.lineBetween(20, 16, W - 20, 16);
        g.generateTexture('bandeja', W, H);
        g.destroy();
    }

    function texCofre(scene, clave, abierto) {
        var W = 120, H = 104;
        var g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x000000, 0.25);
        g.fillEllipse(W / 2, H - 8, 92, 16);
        /* cuerpo */
        g.fillStyle(0x92400e, 1);
        g.fillRoundedRect(14, 44, W - 28, H - 56, 8);
        g.fillStyle(0xb45309, 1);
        g.fillRoundedRect(14, 44, W - 28, 16, { tl: 8, tr: 8, bl: 0, br: 0 });
        /* tapa */
        if (abierto) {
            g.fillStyle(0x78350f, 1);
            g.fillRoundedRect(10, 10, W - 20, 26, 10);
            g.fillStyle(0xfde68a, 0.9);
            g.fillEllipse(W / 2, 46, 78, 22);
        } else {
            g.fillStyle(0x78350f, 1);
            g.fillRoundedRect(10, 26, W - 20, 26, { tl: 12, tr: 12, bl: 0, br: 0 });
        }
        g.fillStyle(0xfbbf24, 1);
        g.fillRect(W / 2 - 7, abierto ? 44 : 34, 14, 18);
        g.lineStyle(3, 0xfbbf24, 0.9);
        g.strokeRoundedRect(14, 44, W - 28, H - 56, 8);
        g.generateTexture(clave, W, H);
        g.destroy();
    }

    /* ================= Escena ================= */

    var EscenaBalanza = {
        key: 'balanza',

        create: function () {
            escena = this;
            var scene = this;

            texEstrella(scene);
            texChispa(scene);
            texNebulosa(scene);
            texCristal(scene);
            texPlatillo(scene);
            texBarra(scene);
            texSoporte(scene);
            texCuadrante(scene);
            texAguja(scene);
            texBandeja(scene);
            texCofre(scene, 'cofre', false);
            texCofre(scene, 'cofre-abierto', true);

            pintarFondo(scene);

            nebulosas = [
                scene.add.image(400, 200, 'nebulosa').setDepth(1).setAlpha(0.42).setScale(1.2).setTint(0x7c3aed),
                scene.add.image(920, 420, 'nebulosa').setDepth(1).setAlpha(0.3).setScale(1.0).setTint(0x1e3a8a)
            ];
            if (!reducido()) {
                scene.tweens.add({ targets: nebulosas[0], alpha: 0.24, duration: 6000, yoyo: true, repeat: -1 });
                scene.tweens.add({ targets: nebulosas[1], alpha: 0.16, duration: 7400, yoyo: true, repeat: -1 });
            }

            estrellas = [];
            var i;
            for (i = 0; i < 110; i++) {
                var e = scene.add.image(
                    Phaser.Math.Between(160, ANCHO - 160),
                    Phaser.Math.Between(90, ALTO - 170),
                    'estrella'
                ).setDepth(2).setScale(Phaser.Math.FloatBetween(0.25, 0.85));
                e.setAlpha(Phaser.Math.FloatBetween(0.3, 1));
                estrellas.push(e);
                if (!reducido()) {
                    scene.tweens.add({
                        targets: e,
                        alpha: Phaser.Math.FloatBetween(0.15, 0.5),
                        duration: Phaser.Math.Between(1200, 3600),
                        yoyo: true, repeat: -1,
                        delay: Phaser.Math.Between(0, 2000)
                    });
                }
            }

            pintarCabina(scene);

            crearBalanza(scene);
            crearDeposito(scene);
            crearCofre(scene);

            if (listoResolve) { listoResolve(); listoResolve = null; }
        }
    };

    /** Espacio visto a través del ventanal: queda detrás del casco de la cabina. */
    function pintarFondo(scene) {
        var g = scene.add.graphics().setDepth(0);
        var cA = Phaser.Display.Color.IntegerToColor(0x2a1b6b);
        var cB = Phaser.Display.Color.IntegerToColor(0x05071f);
        var pasos = 48, i;
        for (i = 0; i < pasos; i++) {
            var t = i / (pasos - 1);
            var col = Phaser.Display.Color.Interpolate.ColorWithColor(cA, cB, 100, Math.round(t * 100));
            g.fillStyle(Phaser.Display.Color.GetColor(col.r, col.g, col.b), 1);
            g.fillRect(0, Math.floor(t * ALTO), ANCHO, Math.ceil(ALTO / pasos) + 1);
        }
    }

    /**
     * Interior de la cabina: marco del ventanal, mamparas laterales con paneles
     * y consola inferior. Va por encima del espacio y por debajo del juego.
     */
    function pintarCabina(scene) {
        var g = scene.add.graphics().setDepth(3);
        var ladoW = 150;
        var techoH = 78;
        var sueloY = ALTO - 150;

        /* mamparas laterales */
        [0, ANCHO - ladoW].forEach(function (x) {
            g.fillStyle(0x1b2a5e, 1);
            g.fillRect(x, 0, ladoW, ALTO);
            g.fillStyle(0x24376f, 1);
            g.fillRect(x + (x === 0 ? ladoW - 26 : 0), 0, 26, ALTO);
        });

        /* techo */
        g.fillStyle(0x1b2a5e, 1);
        g.fillRect(0, 0, ANCHO, techoH);
        g.fillStyle(0x24376f, 1);
        g.fillRect(0, techoH - 18, ANCHO, 18);

        /* suelo / consola inferior */
        g.fillStyle(0x16255a, 1);
        g.fillRect(0, sueloY, ANCHO, ALTO - sueloY);
        g.fillStyle(0x1f3470, 1);
        g.fillRect(0, sueloY, ANCHO, 16);

        /* curva del ventanal */
        g.fillStyle(0x1b2a5e, 1);
        var r = 92, k;
        for (k = 0; k <= 24; k++) {
            var t = k / 24;
            var ang = t * Math.PI / 2;
            var cxI = ladoW + r, cyI = techoH + r;
            g.fillTriangle(
                ladoW, techoH,
                cxI - Math.cos(ang) * r, cyI - Math.sin(ang) * r,
                cxI - Math.cos((k + 1) / 24 * Math.PI / 2) * r,
                cyI - Math.sin((k + 1) / 24 * Math.PI / 2) * r
            );
            var cxD = ANCHO - ladoW - r;
            g.fillTriangle(
                ANCHO - ladoW, techoH,
                cxD + Math.cos(ang) * r, cyI - Math.sin(ang) * r,
                cxD + Math.cos((k + 1) / 24 * Math.PI / 2) * r,
                cyI - Math.sin((k + 1) / 24 * Math.PI / 2) * r
            );
        }

        /* borde luminoso del ventanal */
        g.lineStyle(5, 0x38bdf8, 0.7);
        g.beginPath();
        g.moveTo(ladoW, ALTO);
        g.lineTo(ladoW, techoH + r);
        g.arc(ladoW + r, techoH + r, r, Math.PI, Math.PI * 1.5);
        g.lineTo(ANCHO - ladoW - r, techoH);
        g.arc(ANCHO - ladoW - r, techoH + r, r, Math.PI * 1.5, 0);
        g.lineTo(ANCHO - ladoW, ALTO);
        g.strokePath();

        /* paneles de instrumentos en las mamparas */
        var panel = function (x, y) {
            g.fillStyle(0x0f1d4a, 1);
            g.fillRoundedRect(x, y, 104, 58, 10);
            g.lineStyle(2, 0x38bdf8, 0.5);
            g.strokeRoundedRect(x, y, 104, 58, 10);
            var j;
            for (j = 0; j < 3; j++) {
                g.fillStyle([0x22d3ee, 0x4ade80, 0xfbbf24][j], 0.85);
                g.fillCircle(x + 22 + j * 30, y + 18, 6);
            }
            g.fillStyle(0x38bdf8, 0.35);
            g.fillRoundedRect(x + 14, y + 36, 76, 8, 4);
        };
        panel(22, 150);
        panel(22, 250);
        panel(ANCHO - 126, 150);
        panel(ANCHO - 126, 250);
    }

    function crearBalanza(scene) {
        var soporte = scene.add.image(PIVOTE_X, PIVOTE_Y + 150, 'soporte').setDepth(5);
        soporte.setOrigin(0.5, 0.5);

        var barra = scene.add.image(PIVOTE_X, PIVOTE_Y, 'barra').setDepth(7);

        var platilloIzq = scene.add.image(PIVOTE_X - BRAZO, PIVOTE_Y + 62, 'platillo').setDepth(8);
        var platilloDer = scene.add.image(PIVOTE_X + BRAZO, PIVOTE_Y + 62, 'platillo').setDepth(8);

        var cadenaIzq = scene.add.graphics().setDepth(6);
        var cadenaDer = scene.add.graphics().setDepth(6);

        /* contadores bajo cada platillo */
        var estiloNum = {
            fontFamily: 'Arial, sans-serif', fontSize: '34px',
            fontStyle: 'bold', color: '#ffffff'
        };
        /* El contador va bajo el platillo: encima lo taparían los cristales. */
        marcaIzq = scene.add.text(PIVOTE_X - BRAZO, PIVOTE_Y + 104, '0', estiloNum)
            .setOrigin(0.5).setDepth(16).setShadow(2, 2, '#000000cc', 4);
        marcaDer = scene.add.text(PIVOTE_X + BRAZO, PIVOTE_Y + 104, '0', estiloNum)
            .setOrigin(0.5).setDepth(16).setShadow(2, 2, '#000000cc', 4);

        /* Medidor empotrado en la consola del soporte: es parte de la balanza. */
        var cuadrante = scene.add.image(INDICADOR_X, INDICADOR_Y, 'cuadrante').setDepth(9);
        aguja = scene.add.image(INDICADOR_X, INDICADOR_Y + 27, 'aguja').setDepth(10);
        aguja.setOrigin(0.5, 1).setScale(0.78);
        aguja.setTint(0x4ade80);

        balanza = {
            soporte: soporte, barra: barra,
            platilloIzq: platilloIzq, platilloDer: platilloDer,
            cadenaIzq: cadenaIzq, cadenaDer: cadenaDer,
            cuadrante: cuadrante
        };

        dibujarCadenas();
    }

    /** Las cadenas se redibujan en cada cambio: unen el extremo del brazo al platillo. */
    function dibujarCadenas() {
        if (!balanza) return;
        var rad = inclinacionActual * Math.PI / 180;
        var dx = Math.cos(rad) * BRAZO;
        var dy = Math.sin(rad) * BRAZO;

        var izqX = PIVOTE_X - dx, izqY = PIVOTE_Y - dy;
        var derX = PIVOTE_X + dx, derY = PIVOTE_Y + dy;

        [[balanza.cadenaIzq, izqX, izqY, balanza.platilloIzq],
         [balanza.cadenaDer, derX, derY, balanza.platilloDer]].forEach(function (par) {
            var g = par[0], x = par[1], y = par[2], pl = par[3];
            g.clear();
            g.lineStyle(3, 0x94a3b8, 0.95);
            g.lineBetween(x - 46, y, pl.x - 46, pl.y - 12);
            g.lineBetween(x + 46, y, pl.x + 46, pl.y - 12);
            g.lineBetween(x, y, pl.x, pl.y - 16);
        });
    }

    function crearDeposito(scene) {
        scene.add.image(DEPOSITO_X, DEPOSITO_Y, 'bandeja').setDepth(4);
        /* A la izquierda de la bandeja: centrado chocaría con la base de la balanza. */
        scene.add.text(DEPOSITO_X - 330, DEPOSITO_Y - 78, 'DEPÓSITO', {
            fontFamily: 'Arial, sans-serif', fontSize: '18px',
            fontStyle: 'bold', color: '#bae6fd'
        }).setOrigin(0, 0.5).setDepth(9).setShadow(2, 2, '#000000cc', 4);
    }

    function crearCofre(scene) {
        cofre = scene.add.image(COFRE_X, COFRE_Y, 'cofre').setDepth(18).setScale(0.86);
        textoCofre = scene.add.text(COFRE_X + 4, COFRE_Y + 54, '0', {
            fontFamily: 'Arial, sans-serif', fontSize: '32px',
            fontStyle: 'bold', color: '#fde68a'
        }).setOrigin(0.5).setDepth(19).setShadow(2, 2, '#000000cc', 4);
    }

    /* ================= Ronda ================= */

    /** Reparte posiciones de depósito en filas, sin solapes y dentro de la bandeja. */
    function calcularSlots(total) {
        var anchoUtil = 810;
        var porFila = Math.min(total, Math.max(6, Math.ceil(total / 2)));
        var filas = Math.ceil(total / porFila);
        var paso = Math.min(96, anchoUtil / porFila);
        var slots = [];
        var i;
        for (i = 0; i < total; i++) {
            var fila = Math.floor(i / porFila);
            var col = i % porFila;
            var enFila = Math.min(porFila, total - fila * porFila);
            var x = DEPOSITO_X - (enFila - 1) * paso / 2 + col * paso;
            var y = DEPOSITO_Y - (filas - 1) * 26 + fila * 52 + 6;
            slots.push({ x: x, y: y });
        }
        return slots;
    }

    /**
     * Posiciones de aterrizaje dentro de un platillo, en rejilla compacta.
     * El paso se encoge con la cantidad para que nada desborde el platillo.
     */
    function posicionesPlatillo(cantidad) {
        var porFila = Math.min(cantidad, 5);
        var filas = Math.ceil(cantidad / porFila);
        var pasoX = Math.min(42, 182 / Math.max(1, porFila - 1 || 1));
        var pasoY = 26;
        var out = [];
        var i;
        for (i = 0; i < cantidad; i++) {
            var fila = Math.floor(i / porFila);
            var col = i % porFila;
            var enFila = Math.min(porFila, cantidad - fila * porFila);
            out.push({
                dx: -(enFila - 1) * pasoX / 2 + col * pasoX,
                dy: -22 - (filas - 1 - fila) * pasoY
            });
        }
        return out;
    }

    function limpiarRonda() {
        if (!escena) return;
        cristales.forEach(function (c) {
            escena.tweens.killTweensOf(c.sprite);
            c.sprite.destroy();
        });
        cristales = [];
        slotsDeposito = [];
        inclinacionActual = 0;
        if (balanza && balanza.fijos) {
            balanza.fijos.forEach(function (f) {
                escena.tweens.killTweensOf(f.sprite);
                f.sprite.destroy();
            });
            balanza.fijos = null;
        }
        if (balanza) {
            escena.tweens.killTweensOf(balanza.barra);
            escena.tweens.killTweensOf(balanza.platilloIzq);
            escena.tweens.killTweensOf(balanza.platilloDer);
            balanza.barra.setAngle(0);
            balanza.platilloIzq.setY(PIVOTE_Y + 62);
            balanza.platilloDer.setY(PIVOTE_Y + 62);
            moverCristalesPlatillo();
            dibujarCadenas();
        }
        if (aguja) {
            escena.tweens.killTweensOf(aguja);
            aguja.setAngle(0).setTint(0x4ade80);
        }
    }

    /**
     * Prepara la ronda: los cristales del platillo izquierdo caen desde arriba
     * uno a uno con rebote; el depósito se reparte abajo.
     */
    function prepararRonda(cfg) {
        if (!escena) return Promise.resolve();
        var scene = escena;
        var objetivo = cfg.objetivo;
        var ids = cfg.idsDeposito || [];

        limpiarRonda();
        bloqueado = true;

        /* --- depósito --- */
        slotsDeposito = calcularSlots(ids.length);
        ids.forEach(function (id, i) {
            var p = slotsDeposito[i];
            var sprite = scene.add.image(p.x, p.y, 'cristal')
                .setDepth(14).setScale(CRISTAL_ESCALA);
            var vista = {
                id: id, sprite: sprite,
                homeX: p.x, homeY: p.y,
                slot: i, enPlatillo: false, animando: false
            };
            cristales.push(vista);
            prepararDrag(scene, vista);
        });

        /* --- caída del platillo izquierdo --- */
        var destinos = posicionesPlatillo(objetivo);
        var fijos = [];
        var i;
        for (i = 0; i < objetivo; i++) {
            var d = destinos[i];
            var s = scene.add.image(
                PIVOTE_X - BRAZO + d.dx,
                -90 - i * 40,
                'cristal'
            ).setDepth(9).setScale(CRISTAL_ESCALA * 0.86);
            fijos.push({ sprite: s, dx: d.dx, dy: d.dy });
        }
        balanza.fijos = fijos;

        actualizarMarcas(0, 0);

        return new Promise(function (resolve) {
            var caidos = 0;
            if (!objetivo) { bloqueado = false; resolve(); return; }

            fijos.forEach(function (f, idx) {
                tras(idx * (reducido() ? 0 : 170), function () {
                    if (!f.sprite.scene) return;
                    scene.tweens.add({
                        targets: f.sprite,
                        y: balanza.platilloIzq.y + f.dy,
                        duration: reducido() ? 0 : 560,
                        ease: 'Bounce.easeOut',
                        onComplete: function () {
                            impactoCristal(f.sprite.x, f.sprite.y);
                            avisar('onImpacto');
                            caidos += 1;
                            actualizarMarcas(caidos, 0);
                            hundirPlatillo();
                            if (caidos >= objetivo) {
                                tras(260, function () {
                                    bloqueado = false;
                                    actualizarBalanza(objetivo, 0);
                                    resolve();
                                });
                            }
                        }
                    });
                });
            });
        });
    }

    /** Sacudida breve del platillo izquierdo al recibir un cristal. */
    function hundirPlatillo() {
        if (!escena || !balanza || reducido()) return;
        escena.tweens.add({
            targets: balanza.platilloIzq,
            y: balanza.platilloIzq.y + 7,
            duration: 110, yoyo: true, ease: 'Sine.inOut',
            onUpdate: dibujarCadenas
        });
    }

    function impactoCristal(x, y) {
        if (!escena) return;
        var chispas = escena.add.particles(x, y, 'chispa', {
            speed: { min: 60, max: 180 }, scale: { start: 0.5, end: 0 },
            lifespan: 380, quantity: 8,
            tint: [0x7ff5ff, 0xffffff, 0x60a5fa], blendMode: 'ADD', emitting: false
        }).setDepth(20);
        chispas.explode(10);
        tras(620, function () { chispas.destroy(); });
    }

    /* ================= Arrastre ================= */

    function prepararDrag(scene, vista) {
        var sprite = vista.sprite;
        sprite.setInteractive({ draggable: true, useHandCursor: true });
        if (sprite.input) sprite.input.enabled = true;
        scene.input.setDraggable(sprite, true);

        sprite.on('dragstart', function () {
            if (vista.animando || !puedeJugar()) return;
            sprite.setDepth(40);
            scene.tweens.add({ targets: sprite, scale: CRISTAL_ESCALA * 1.18, duration: 120 });
            resaltarPlatillo(true);
            avisar('onAgarrar', vista.id);
        });

        sprite.on('drag', function (pointer, dragX, dragY) {
            if (vista.animando || !puedeJugar()) return;
            sprite.x = dragX;
            sprite.y = dragY;
        });

        sprite.on('dragend', function () {
            if (vista.animando) return;
            resaltarPlatillo(false);
            if (!puedeJugar()) { regresar(vista); return; }

            var sobrePlatillo = enZonaPlatilloDerecho(sprite.x, sprite.y);

            if (!vista.enPlatillo && sobrePlatillo) {
                avisar('onColocar', vista.id);
            } else if (vista.enPlatillo && !sobrePlatillo) {
                avisar('onRetirar', vista.id);
            } else if (vista.enPlatillo) {
                acomodarEnPlatillo();
            } else {
                regresar(vista);
                avisar('onSoltarFuera', vista.id);
            }
        });
    }

    function enZonaPlatilloDerecho(x, y) {
        if (!balanza) return false;
        var px = balanza.platilloDer.x;
        var py = balanza.platilloDer.y;
        return x > px - 150 && x < px + 150 && y > py - 190 && y < py + 80;
    }

    function resaltarPlatillo(activo) {
        if (!escena || !balanza) return;
        var pl = balanza.platilloDer;
        escena.tweens.killTweensOf(pl);
        if (activo) {
            pl.setTint(0x7cff6b);
        } else {
            pl.clearTint();
        }
    }

    function buscarVista(id) {
        var i;
        for (i = 0; i < cristales.length; i++) if (cristales[i].id === id) return cristales[i];
        return null;
    }

    function regresar(vista) {
        if (!escena) return;
        vista.enPlatillo = false;
        escena.tweens.add({
            targets: vista.sprite,
            x: vista.homeX, y: vista.homeY, scale: CRISTAL_ESCALA,
            duration: reducido() ? 0 : 260, ease: 'Back.out'
        });
        vista.sprite.setDepth(14);
    }

    /** Recoloca los cristales ya puestos en rejilla, sin solapes. */
    function acomodarEnPlatillo() {
        if (!escena || !balanza) return;
        var puestos = cristales.filter(function (c) { return c.enPlatillo; });
        var destinos = posicionesPlatillo(puestos.length);
        puestos.forEach(function (c, i) {
            var d = destinos[i];
            c.destinoDx = d.dx;
            c.destinoDy = d.dy;
            escena.tweens.add({
                targets: c.sprite,
                x: balanza.platilloDer.x + d.dx,
                y: balanza.platilloDer.y + d.dy,
                scale: CRISTAL_ESCALA * 0.86,
                duration: reducido() ? 0 : 220, ease: 'Back.out'
            });
            c.sprite.setDepth(9);
        });
    }

    /* ================= API de juego ================= */

    /** Coloca el cristal en el platillo derecho, con caída corta y rebote. */
    function colocarCristal(id) {
        var vista = buscarVista(id);
        if (!vista || !escena || vista.enPlatillo) return;
        vista.enPlatillo = true;
        vista.animando = true;

        acomodarEnPlatillo();

        var dx = vista.destinoDx || 0;
        var dy = vista.destinoDy || -24;
        escena.tweens.add({
            targets: vista.sprite,
            x: balanza.platilloDer.x + dx,
            y: balanza.platilloDer.y + dy,
            scale: CRISTAL_ESCALA * 0.86,
            duration: reducido() ? 0 : 280,
            ease: 'Bounce.easeOut',
            onComplete: function () {
                vista.animando = false;
                impactoCristal(vista.sprite.x, vista.sprite.y);
            }
        });
        vista.sprite.setDepth(9);
    }

    /** Devuelve el cristal al depósito. */
    function retirarCristal(id) {
        var vista = buscarVista(id);
        if (!vista || !escena || !vista.enPlatillo) return;
        vista.enPlatillo = false;
        vista.animando = true;
        escena.tweens.add({
            targets: vista.sprite,
            x: vista.homeX, y: vista.homeY, scale: CRISTAL_ESCALA,
            duration: reducido() ? 0 : 280, ease: 'Back.out',
            onComplete: function () { vista.animando = false; }
        });
        vista.sprite.setDepth(14);
        acomodarEnPlatillo();
    }

    function actualizarMarcas(izq, der) {
        if (marcaIzq) marcaIzq.setText(String(izq));
        if (marcaDer) marcaDer.setText(String(der));
    }

    /**
     * Inclina la balanza y mueve la aguja según la diferencia.
     * Física visual: tweens, sin motor físico.
     */
    function actualizarBalanza(izquierda, derecha) {
        if (!escena || !balanza) return;
        var est = L.estadoBalanza(izquierda, derecha);
        inclinacionActual = est.inclinacionGrados;

        actualizarMarcas(izquierda, derecha);

        var scene = escena;
        scene.tweens.killTweensOf(balanza.barra);
        scene.tweens.killTweensOf(balanza.platilloIzq);
        scene.tweens.killTweensOf(balanza.platilloDer);

        var dur = reducido() ? 0 : 520;

        scene.tweens.add({
            targets: balanza.barra,
            angle: est.inclinacionGrados,
            duration: dur, ease: 'Back.easeOut',
            onUpdate: function (tw, target) {
                inclinacionActual = target.angle;
                dibujarCadenas();
            }
        });

        var baseY = PIVOTE_Y + 62;
        var desplaz = est.inclinacionGrados * PIXEL_POR_GRADO;

        scene.tweens.add({
            targets: balanza.platilloIzq,
            y: baseY + desplaz,
            duration: dur, ease: 'Back.easeOut',
            onUpdate: function () {
                moverCristalesPlatillo();
                dibujarCadenas();
            }
        });
        scene.tweens.add({
            targets: balanza.platilloDer,
            y: baseY - desplaz,
            duration: dur, ease: 'Back.easeOut',
            onUpdate: moverCristalesPlatillo
        });

        /* aguja: mismo signo que la inclinación, con tope de ±45° */
        var anguloAguja = Math.max(-45, Math.min(45, est.diferencia * 11));
        var color = est.estado === 'verde' ? 0x4ade80
            : (est.estado === 'amarillo' ? 0xfacc15 : 0xf87171);
        scene.tweens.killTweensOf(aguja);
        scene.tweens.add({
            targets: aguja,
            angle: anguloAguja,
            duration: dur, ease: 'Back.easeOut'
        });
        aguja.setTint(color);

        if (est.estado === 'verde' && !reducido()) {
            scene.tweens.add({
                targets: aguja, scale: 1.18, duration: 180, yoyo: true, repeat: 1
            });
        }
    }

    /** Los cristales fijos y colocados siguen a su platillo mientras se inclina. */
    function moverCristalesPlatillo() {
        if (!balanza) return;
        if (marcaIzq) marcaIzq.y = balanza.platilloIzq.y + 42;
        if (marcaDer) marcaDer.y = balanza.platilloDer.y + 42;
        if (balanza.fijos) {
            balanza.fijos.forEach(function (f) {
                if (f.sprite.scene) f.sprite.y = balanza.platilloIzq.y + f.dy;
            });
        }
        cristales.forEach(function (c) {
            if (c.enPlatillo && !c.animando && c.sprite.scene) {
                c.sprite.y = balanza.platilloDer.y + (c.destinoDy || -24);
            }
        });
    }

    function habilitarArrastre(activo) {
        bloqueado = !activo;
        if (!escena) return;
        cristales.forEach(function (c) {
            if (c.sprite.input) c.sprite.input.enabled = !!activo;
        });
    }

    function cantidadColocada() {
        return cristales.filter(function (c) { return c.enPlatillo; }).length;
    }

    /** Celebración de ronda: los cristales vuelan al cofre y suben el contador. */
    function celebrarRonda(ganados) {
        if (!escena) return Promise.resolve();
        var scene = escena;
        bloqueado = true;

        var puestos = cristales.filter(function (c) { return c.enPlatillo; });
        var fijos = (balanza && balanza.fijos) || [];

        fijos.concat(puestos.map(function (c) { return { sprite: c.sprite }; }))
            .forEach(function (f) {
                if (!f.sprite.scene) return;
                scene.tweens.add({
                    targets: f.sprite, scale: f.sprite.scale * 1.16,
                    duration: 240, yoyo: true, repeat: 1
                });
            });

        destelloEquilibrio();

        return new Promise(function (resolve) {
            var n = Math.max(0, Number(ganados) || 0);
            if (!n) { bloqueado = false; resolve(); return; }

            var volados = 0;
            var i;
            for (i = 0; i < n; i++) {
                (function (idx) {
                    tras(360 + idx * 110, function () {
                        if (!scene.sys) return;
                        var origen = puestos[idx] && puestos[idx].sprite;
                        var x = origen && origen.scene ? origen.x : balanza.platilloDer.x;
                        var y = origen && origen.scene ? origen.y : balanza.platilloDer.y;

                        var gema = scene.add.image(x, y, 'cristal')
                            .setDepth(42).setScale(CRISTAL_ESCALA * 0.8);
                        scene.tweens.add({
                            targets: gema,
                            x: COFRE_X, y: COFRE_Y + 10,
                            scale: 0.16,
                            duration: reducido() ? 0 : 620,
                            ease: 'Cubic.easeIn',
                            onComplete: function () {
                                gema.destroy();
                                totalCofreVal += 1;
                                if (textoCofre) textoCofre.setText(String(totalCofreVal));
                                avisar('onGema');
                                if (cofre && !reducido()) {
                                    scene.tweens.add({
                                        targets: cofre, scale: 1.04, duration: 130, yoyo: true
                                    });
                                }
                                volados += 1;
                                if (volados >= n) {
                                    tras(320, function () { bloqueado = false; resolve(); });
                                }
                            }
                        });
                    });
                })(i);
            }
        });
    }

    function destelloEquilibrio() {
        if (!escena || !balanza) return;
        var flash = escena.add.image(PIVOTE_X, PIVOTE_Y, 'chispa')
            .setDepth(30).setScale(0.6).setAlpha(0.95).setTint(0x7cff6b).setBlendMode('ADD');
        escena.tweens.add({
            targets: flash, scale: 26, alpha: 0, duration: 620, ease: 'Cubic.out',
            onComplete: function () { flash.destroy(); }
        });
        var chispas = escena.add.particles(PIVOTE_X, PIVOTE_Y + 40, 'chispa', {
            speed: { min: 120, max: 320 }, scale: { start: 0.7, end: 0 },
            lifespan: 700, quantity: 20,
            tint: [0x7cff6b, 0xffffff, 0x67e8f9], blendMode: 'ADD', emitting: false
        }).setDepth(31);
        chispas.explode(26);
        tras(1000, function () { chispas.destroy(); });
    }

    /** Pantalla final: el cofre se abre con todas las gemas. */
    /**
     * Cierre de la misión: velo, rayos, cofre al centro que se abre y suelta
     * una lluvia de gemas, con el total en grande.
     */
    function celebrarFinal() {
        if (!escena) return Promise.resolve();
        var scene = escena;
        bloqueado = true;
        var cx = ANCHO / 2, cy = ALTO / 2 - 30;
        var rapido = reducido();

        return new Promise(function (resolve) {
            var velo = scene.add.rectangle(cx, ALTO / 2, ANCHO, ALTO, 0x020617)
                .setDepth(40).setAlpha(0);
            scene.tweens.add({ targets: velo, alpha: 0.82, duration: rapido ? 0 : 420 });

            /* Dibujado alrededor del origen para que `angle` lo gire sobre el cofre. */
            var rayos = scene.add.graphics({ x: cx, y: cy }).setDepth(41).setAlpha(0);
            rayos.fillStyle(0xfde68a, 0.16);
            var k;
            for (k = 0; k < 12; k++) {
                var a = (k / 12) * Math.PI * 2;
                var a2 = a + 0.13;
                rayos.fillTriangle(
                    0, 0,
                    Math.cos(a) * 900, Math.sin(a) * 900,
                    Math.cos(a2) * 900, Math.sin(a2) * 900
                );
            }
            scene.tweens.add({ targets: rayos, alpha: 1, duration: rapido ? 0 : 600 });
            if (!rapido) {
                scene.tweens.add({
                    targets: rayos, angle: 360, duration: 26000,
                    repeat: -1, ease: 'Linear'
                });
            }

            cofre.setDepth(44);
            if (textoCofre) textoCofre.setDepth(45);

            scene.tweens.add({
                targets: cofre,
                x: cx, y: cy, scale: 2.6,
                duration: rapido ? 0 : 820, ease: 'Back.easeOut',
                onComplete: function () {
                    cofre.setTexture('cofre-abierto');
                    avisar('onCofre');
                    if (!rapido) scene.cameras.main.flash(260, 255, 240, 200);

                    var chorro = scene.add.particles(cx, cy - 30, 'chispa', {
                        speed: { min: 160, max: 460 },
                        angle: { min: 200, max: 340 },
                        scale: { start: 1, end: 0 },
                        lifespan: 1400, quantity: 34,
                        tint: [0xfde68a, 0xffffff, 0x60a5fa, 0x7cff6b],
                        blendMode: 'ADD', emitting: false
                    }).setDepth(46);
                    chorro.explode(46);
                    tras(1600, function () { chorro.destroy(); });

                    lluviaDeGemas(scene, cx, cy);

                    if (!rapido) {
                        scene.tweens.add({
                            targets: cofre, scale: 2.75, duration: 900,
                            yoyo: true, repeat: -1, ease: 'Sine.inOut'
                        });
                    }
                    tras(rapido ? 60 : 1500, resolve);
                }
            });

            if (textoCofre) {
                scene.tweens.add({
                    targets: textoCofre,
                    x: cx, y: cy + 118, scale: 2.6,
                    duration: rapido ? 0 : 820, ease: 'Back.easeOut'
                });
            }
        });
    }

    /** Gemas que caen desde arriba girando, como premio de la misión. */
    function lluviaDeGemas(scene, cx, cy) {
        if (reducido()) return;
        var n = 22, i;
        for (i = 0; i < n; i++) {
            (function (idx) {
                tras(idx * 90, function () {
                    if (!scene.sys) return;
                    var x = Phaser.Math.Between(220, ANCHO - 220);
                    var gema = scene.add.image(x, -60, 'cristal')
                        .setDepth(43).setScale(Phaser.Math.FloatBetween(0.3, 0.5))
                        .setAlpha(0.95);
                    scene.tweens.add({
                        targets: gema,
                        y: ALTO + 80,
                        angle: Phaser.Math.Between(-220, 220),
                        duration: Phaser.Math.Between(1800, 2900),
                        ease: 'Sine.easeIn',
                        onComplete: function () { if (gema.scene) gema.destroy(); }
                    });
                });
            })(i);
        }
    }

    function totalCofre() { return totalCofreVal; }

    /* ================= Montaje ================= */

    function montar(config) {
        opciones = config || {};
        cbs = opciones.callbacks || {};
        bloqueado = false;
        totalCofreVal = 0;
        var listoPromise = new Promise(function (res) { listoResolve = res; });

        var host = global.PedniaPhaserHost;
        var cfg = {
            type: Phaser.AUTO,
            parent: opciones.parent || 'phaser-juego',
            width: ANCHO, height: ALTO,
            backgroundColor: '#05071f',
            scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
            scene: [EscenaBalanza]
        };
        game = host ? host.crear(cfg) : new Phaser.Game(cfg);
        return listoPromise;
    }

    function destruir() {
        var host = global.PedniaPhaserHost;
        if (host) host.destruirJuego();
        else if (game) { try { game.destroy(true); } catch (e) {} }
        game = null; escena = null;
        cristales = []; slotsDeposito = []; balanza = null; aguja = null;
    }

    global.NivelaBalanzaPhaser = {
        montar: montar,
        destruir: destruir,
        prepararRonda: prepararRonda,
        habilitarArrastre: habilitarArrastre,
        colocarCristal: colocarCristal,
        retirarCristal: retirarCristal,
        actualizarBalanza: actualizarBalanza,
        cantidadColocada: cantidadColocada,
        celebrarRonda: celebrarRonda,
        celebrarFinal: celebrarFinal,
        totalCofre: totalCofre,
        ANCHO: ANCHO,
        ALTO: ALTO
    };
})(typeof window !== 'undefined' ? window : this);
