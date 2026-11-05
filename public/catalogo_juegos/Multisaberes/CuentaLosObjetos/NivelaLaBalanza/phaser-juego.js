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
    var PIVOTE_X = 560;
    var PIVOTE_Y = 250;
    var BRAZO = 230;
    /* cuánto sube/baja un platillo por grado de inclinación */
    var PIXEL_POR_GRADO = 3.4;

    var DEPOSITO_Y = 606;
    var DEPOSITO_X = 560;
    var CRISTAL_ESCALA = 0.46;

    var COFRE_X = 1142;
    var COFRE_Y = 96;

    /* Indicador de equilibrio, a la izquierda y fuera del depósito. */
    var INDICADOR_X = 150;
    var INDICADOR_Y = 330;

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

    function texSoporte(scene) {
        var W = 180, H = 300;
        var g = scene.make.graphics({ x: 0, y: 0, add: false });
        /* base */
        g.fillStyle(0x1e293b, 1);
        g.fillEllipse(W / 2, H - 22, 170, 44);
        g.fillStyle(0x334155, 1);
        g.fillEllipse(W / 2, H - 30, 140, 36);
        /* columna */
        g.fillStyle(0x475569, 1);
        g.fillRoundedRect(W / 2 - 22, 60, 44, H - 90, 12);
        g.fillStyle(0x64748b, 1);
        g.fillRoundedRect(W / 2 - 22, 60, 18, H - 90, { tl: 12, bl: 12, tr: 0, br: 0 });
        /* luces de energía */
        g.fillStyle(0x22d3ee, 0.85);
        var i;
        for (i = 0; i < 4; i++) g.fillCircle(W / 2, 110 + i * 46, 5);
        g.generateTexture('soporte', W, H);
        g.destroy();
    }

    /** Cuadrante del indicador: carátula con marcas. */
    function texCuadrante(scene) {
        var W = 190, H = 110;
        var g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x0f172a, 0.95);
        g.fillRoundedRect(0, 0, W, H, 16);
        g.lineStyle(4, 0x94a3b8, 1);
        g.strokeRoundedRect(0, 0, W, H, 16);

        g.lineStyle(3, 0x64748b, 0.9);
        var cx = W / 2, cy = H - 14, r = 72;
        var k;
        for (k = -4; k <= 4; k++) {
            var a = (-90 + k * 18) * Math.PI / 180;
            var x1 = cx + Math.cos(a) * (r - 14);
            var y1 = cy + Math.sin(a) * (r - 14);
            var x2 = cx + Math.cos(a) * r;
            var y2 = cy + Math.sin(a) * r;
            g.lineBetween(x1, y1, x2, y2);
        }
        g.lineStyle(4, 0x4ade80, 0.95);
        g.lineBetween(cx, cy - r + 10, cx, cy - r);

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
        var W = 980, H = 132;
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
                scene.add.image(300, 180, 'nebulosa').setDepth(1).setAlpha(0.42).setScale(1.4).setTint(0x4c1d95),
                scene.add.image(1020, 470, 'nebulosa').setDepth(1).setAlpha(0.3).setScale(1.1).setTint(0x1e3a8a)
            ];
            if (!reducido()) {
                scene.tweens.add({ targets: nebulosas[0], alpha: 0.24, duration: 6000, yoyo: true, repeat: -1 });
                scene.tweens.add({ targets: nebulosas[1], alpha: 0.16, duration: 7400, yoyo: true, repeat: -1 });
            }

            estrellas = [];
            var i;
            for (i = 0; i < 110; i++) {
                var e = scene.add.image(
                    Phaser.Math.Between(0, ANCHO),
                    Phaser.Math.Between(0, ALTO - 180),
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

            crearBalanza(scene);
            crearDeposito(scene);
            crearCofre(scene);

            if (listoResolve) { listoResolve(); listoResolve = null; }
        }
    };

    function pintarFondo(scene) {
        var g = scene.add.graphics().setDepth(0);
        var cA = Phaser.Display.Color.IntegerToColor(0x1a1f5c);
        var cB = Phaser.Display.Color.IntegerToColor(0x05071f);
        var pasos = 48, i;
        for (i = 0; i < pasos; i++) {
            var t = i / (pasos - 1);
            var col = Phaser.Display.Color.Interpolate.ColorWithColor(cA, cB, 100, Math.round(t * 100));
            g.fillStyle(Phaser.Display.Color.GetColor(col.r, col.g, col.b), 1);
            g.fillRect(0, Math.floor(t * ALTO), ANCHO, Math.ceil(ALTO / pasos) + 1);
        }
    }

    function crearBalanza(scene) {
        var soporte = scene.add.image(PIVOTE_X, PIVOTE_Y + 150, 'soporte').setDepth(5);

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

        /* El indicador va a un lado: sobre el soporte chocaría con el depósito. */
        var cuadrante = scene.add.image(INDICADOR_X, INDICADOR_Y, 'cuadrante').setDepth(9);
        aguja = scene.add.image(INDICADOR_X, INDICADOR_Y + 42, 'aguja').setDepth(10);
        aguja.setOrigin(0.5, 1);
        aguja.setTint(0x4ade80);
        scene.add.text(INDICADOR_X, INDICADOR_Y - 72, 'EQUILIBRIO', {
            fontFamily: 'Arial, sans-serif', fontSize: '17px',
            fontStyle: 'bold', color: '#bae6fd'
        }).setOrigin(0.5).setDepth(9).setShadow(2, 2, '#000000cc', 4);

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
        scene.add.text(DEPOSITO_X, DEPOSITO_Y - 88, 'DEPÓSITO DE CRISTALES', {
            fontFamily: 'Arial, sans-serif', fontSize: '19px',
            fontStyle: 'bold', color: '#bae6fd'
        }).setOrigin(0.5).setDepth(9).setShadow(2, 2, '#000000cc', 4);
    }

    function crearCofre(scene) {
        cofre = scene.add.image(COFRE_X, COFRE_Y, 'cofre').setDepth(12).setScale(0.9);
        textoCofre = scene.add.text(COFRE_X + 4, COFRE_Y + 54, '0', {
            fontFamily: 'Arial, sans-serif', fontSize: '32px',
            fontStyle: 'bold', color: '#fde68a'
        }).setOrigin(0.5).setDepth(13).setShadow(2, 2, '#000000cc', 4);
    }

    /* ================= Ronda ================= */

    /** Reparte posiciones de depósito en filas, sin solapes y dentro de la bandeja. */
    function calcularSlots(total) {
        var anchoUtil = 880;
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
    function celebrarFinal() {
        if (!escena) return Promise.resolve();
        var scene = escena;
        bloqueado = true;

        return new Promise(function (resolve) {
            scene.tweens.add({
                targets: cofre,
                x: ANCHO / 2, y: ALTO / 2 - 20, scale: 2.4,
                duration: reducido() ? 0 : 760, ease: 'Back.easeOut',
                onComplete: function () {
                    cofre.setTexture('cofre-abierto');
                    avisar('onCofre');
                    var chispas = scene.add.particles(ANCHO / 2, ALTO / 2 - 40, 'chispa', {
                        speed: { min: 140, max: 420 },
                        angle: { min: 200, max: 340 },
                        scale: { start: 0.9, end: 0 },
                        lifespan: 1200, quantity: 30,
                        tint: [0xfde68a, 0xffffff, 0x60a5fa], blendMode: 'ADD',
                        emitting: false
                    }).setDepth(44);
                    chispas.explode(40);
                    tras(1400, function () { chispas.destroy(); });
                    tras(reducido() ? 60 : 1100, resolve);
                }
            });
            if (textoCofre) {
                scene.tweens.add({
                    targets: textoCofre,
                    x: ANCHO / 2, y: ALTO / 2 + 96,
                    scale: 2.2,
                    duration: reducido() ? 0 : 760, ease: 'Back.easeOut'
                });
            }
        });
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
