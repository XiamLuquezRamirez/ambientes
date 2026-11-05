/**
 * ConstructoresEspacioPhaser — taller espacial y viaje entre mundos (Phaser 4.2.1).
 * Texturas generadas por código. Módulos internos: ambiente, cohete, bloques,
 * viaje y minimapa.
 */
(function (global) {
    'use strict';

    var Phaser = global.Phaser;

    var ANCHO = 1280;
    var ALTO = 720;
    var COHETE_X = 600;
    var COHETE_Y = 330;
    var COHETE_ESCALA = 0.82;
    /* centro del fuselaje en la textura del cohete (600 de alto) */
    var CENTRO_FUSELAJE_TEX = 327;
    /* distancia del centro del cohete a la tobera, donde sale la llama */
    var DESPLAZAMIENTO_LLAMA = 215;

    var game = null;
    var escena = null;
    var cbs = {};
    var opciones = {};
    var listoResolve = null;

    var bloquesVista = [];
    var slotsVista = [];
    var cohete = null;
    var llama = null;
    var halo = null;
    var capaAmbiente = null;
    var capaSuelo = null;
    var estrellas = [];
    var nebulosas = [];
    var minimapa = null;
    var tituloAlmacen = null;
    var etiquetaMotor = null;
    var plataforma = null;
    var cruceroId = null;
    var baseFinal = null;
    var bloqueado = false;

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
     * fases del viaje no llegarían nunca a ejecutarse.
     */
    function tras(ms, fn) {
        return global.setTimeout(fn, ms);
    }

    /** Centro vertical del fuselaje en pantalla: ahí va la columna del motor. */
    function centroColumna() {
        return COHETE_Y + (CENTRO_FUSELAJE_TEX - 300) * COHETE_ESCALA;
    }

    /**
     * Todo lo que viaja con el cohete, la llama incluida: así un solo tween los
     * mueve en bloque y el fuego nunca se descuelga de la tobera.
     */
    function piezasDelCohete() {
        var piezas = [cohete];
        if (llama) piezas.push(llama);
        slotsVista.forEach(function (s) {
            if (s.bloque) piezas.push(s.bloque.sprite, s.bloque.etiqueta);
            piezas.push(s.img, s.texto);
        });
        if (escena && escena.__columna) piezas.push(escena.__columna);
        return piezas;
    }

    function hex(valor, porDefecto) {
        if (typeof valor === 'number') return valor;
        if (typeof valor === 'string' && valor.charAt(0) === '#') {
            return parseInt(valor.slice(1), 16);
        }
        return porDefecto;
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

    function texParticula(scene) {
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

    function texBloque(scene, clave, colorHex) {
        var W = 108, H = 108;
        var base = Phaser.Display.Color.IntegerToColor(colorHex);
        var claro = base.clone().lighten(26).color;
        var oscuro = base.clone().darken(34).color;
        var medio = base.color;

        var g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x000000, 0.28);
        g.fillRoundedRect(10, 22, W - 16, H - 26, 16);
        g.fillStyle(medio, 1);
        g.fillRoundedRect(6, 12, W - 16, H - 26, 16);
        g.fillStyle(claro, 1);
        g.fillRoundedRect(6, 12, W - 16, 30, { tl: 16, tr: 16, bl: 0, br: 0 });
        g.fillStyle(oscuro, 1);
        g.fillRoundedRect(6, H - 30, W - 16, 16, { tl: 0, tr: 0, bl: 16, br: 16 });
        g.fillStyle(0xffffff, 0.22);
        g.fillTriangle(12, 18, 44, 18, 12, 50);
        g.lineStyle(3, 0xffffff, 0.55);
        g.strokeRoundedRect(6, 12, W - 16, H - 26, 16);
        g.fillStyle(0xffffff, 0.5);
        g.fillCircle(18, 26, 3);
        g.fillCircle(W - 22, 26, 3);
        g.fillCircle(18, H - 28, 3);
        g.fillCircle(W - 22, H - 28, 3);
        g.generateTexture(clave, W, H);
        g.destroy();
    }

    function texCohete(scene) {
        var W = 420, H = 600;
        var g = scene.make.graphics({ x: 0, y: 0, add: false });
        var cx = W / 2;
        var cuerpoW = 190;
        var cuerpoTop = 150;
        var cuerpoBot = H - 96;

        g.fillStyle(0x9d1458, 1);
        g.fillTriangle(cx - cuerpoW / 2, cuerpoBot - 130, cx - cuerpoW / 2 - 92, cuerpoBot + 10, cx - cuerpoW / 2, cuerpoBot);
        g.fillTriangle(cx + cuerpoW / 2, cuerpoBot - 130, cx + cuerpoW / 2 + 92, cuerpoBot + 10, cx + cuerpoW / 2, cuerpoBot);
        g.fillStyle(0xff3dd1, 1);
        g.fillTriangle(cx - cuerpoW / 2, cuerpoBot - 120, cx - cuerpoW / 2 - 76, cuerpoBot + 2, cx - cuerpoW / 2, cuerpoBot - 8);
        g.fillTriangle(cx + cuerpoW / 2, cuerpoBot - 120, cx + cuerpoW / 2 + 76, cuerpoBot + 2, cx + cuerpoW / 2, cuerpoBot - 8);
        g.fillStyle(0xffffff, 0.18);
        g.fillTriangle(cx - cuerpoW / 2, cuerpoBot - 112, cx - cuerpoW / 2 - 50, cuerpoBot - 20, cx - cuerpoW / 2, cuerpoBot - 40);

        g.fillStyle(0x7f8fc4, 1);
        g.fillRoundedRect(cx - cuerpoW / 2 - 6, cuerpoTop - 6, cuerpoW + 12, cuerpoBot - cuerpoTop + 12, 34);
        g.fillStyle(0xe8eeff, 1);
        g.fillRoundedRect(cx - cuerpoW / 2, cuerpoTop, cuerpoW, cuerpoBot - cuerpoTop, 30);
        g.fillStyle(0xb9c4e8, 1);
        g.fillRoundedRect(cx + cuerpoW / 2 - 44, cuerpoTop, 44, cuerpoBot - cuerpoTop, { tl: 0, tr: 30, bl: 0, br: 30 });
        g.fillStyle(0xffffff, 0.75);
        g.fillRoundedRect(cx - cuerpoW / 2 + 8, cuerpoTop + 10, 22, cuerpoBot - cuerpoTop - 20, 12);

        var puntaY = 14;
        var pasos = 22, i;
        for (i = 0; i < pasos; i++) {
            var t0 = i / pasos;
            var t1 = (i + 1) / pasos;
            var w0 = Math.sin(t0 * Math.PI / 2) * (cuerpoW / 2 + 4);
            var w1 = Math.sin(t1 * Math.PI / 2) * (cuerpoW / 2 + 4);
            var y0 = puntaY + t0 * (cuerpoTop - puntaY);
            var y1 = puntaY + t1 * (cuerpoTop - puntaY);
            g.fillStyle(0xd81e1e, 1);
            g.fillPoints([
                { x: cx - w0, y: y0 }, { x: cx + w0, y: y0 },
                { x: cx + w1, y: y1 }, { x: cx - w1, y: y1 }
            ], true);
            g.fillStyle(0xff8080, 1);
            g.fillPoints([
                { x: cx - w0 * 0.86, y: y0 }, { x: cx - w0 * 0.3, y: y0 },
                { x: cx - w1 * 0.3, y: y1 }, { x: cx - w1 * 0.86, y: y1 }
            ], true);
        }

        g.fillStyle(0x27348f, 1);
        g.fillRoundedRect(cx - cuerpoW / 2 - 8, cuerpoTop - 14, cuerpoW + 16, 26, 10);
        g.fillStyle(0x5b6fff, 1);
        g.fillRoundedRect(cx - cuerpoW / 2 - 8, cuerpoTop - 14, cuerpoW + 16, 11, { tl: 10, tr: 10, bl: 0, br: 0 });

        g.fillStyle(0x475569, 1);
        g.fillRoundedRect(cx - 74, cuerpoBot - 6, 148, 56, { tl: 12, tr: 12, bl: 34, br: 34 });
        g.fillStyle(0x94a3b8, 1);
        g.fillRoundedRect(cx - 64, cuerpoBot - 2, 128, 28, 12);
        g.fillStyle(0x1e293b, 1);
        g.fillRoundedRect(cx - 50, cuerpoBot + 28, 100, 18, 9);

        g.generateTexture('cohete', W, H);
        g.destroy();
    }

    function texColumna(scene, slots, alturaSlot, slotW) {
        var W = slotW + 20;
        var H = slots * alturaSlot + 22;
        var clave = 'columna-motor-' + slots;
        if (scene.textures.exists(clave)) return clave;
        var g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x020617, 0.62);
        g.fillRoundedRect(0, 0, W, H, 14);
        g.lineStyle(3, 0x00e5ff, 0.9);
        g.strokeRoundedRect(0, 0, W, H, 14);
        g.lineStyle(2, 0x38bdf8, 0.45);
        g.lineBetween(7, 14, 7, H - 14);
        g.lineBetween(W - 7, 14, W - 7, H - 14);
        g.generateTexture(clave, W, H);
        g.destroy();
        return clave;
    }

    function texSlotVacio(scene, w, h) {
        if (scene.textures.exists('slot-vacio')) return;
        var g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x0b1540, 0.75);
        g.fillRoundedRect(2, 2, w - 4, h - 4, 10);
        g.lineStyle(3, 0x38bdf8, 0.75);
        g.strokeRoundedRect(2, 2, w - 4, h - 4, 10);
        g.generateTexture('slot-vacio', w, h);
        g.destroy();
    }

    function texPlataforma(scene) {
        var W = 520, H = 120;
        var g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x1e293b, 1);
        g.fillEllipse(W / 2, H / 2 + 16, W - 20, 56);
        g.fillStyle(0x334155, 1);
        g.fillEllipse(W / 2, H / 2 + 4, W - 60, 48);
        g.fillStyle(0x475569, 1);
        g.fillEllipse(W / 2, H / 2 - 4, W - 120, 36);
        g.lineStyle(4, 0xffffff, 0.35);
        g.strokeEllipse(W / 2, H / 2 - 4, W - 120, 36);
        g.generateTexture('plataforma', W, H);
        g.destroy();
    }

    function texAlmacen(scene, w, h) {
        var g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x0b1540, 0.72);
        g.fillRoundedRect(0, 0, w, h, 22);
        g.lineStyle(4, 0xffffff, 0.5);
        g.strokeRoundedRect(0, 0, w, h, 22);
        g.lineStyle(3, 0xffffff, 0.22);
        var filas = 4, i;
        for (i = 1; i < filas; i++) {
            var y = (h / filas) * i;
            g.lineBetween(14, y, w - 14, y);
        }
        g.generateTexture('almacen-marco', w, h);
        g.destroy();
    }

    function texPlaneta(scene, clave, colorHex) {
        if (scene.textures.exists(clave)) return;
        var R = 44;
        var base = Phaser.Display.Color.IntegerToColor(colorHex);
        var g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(base.clone().darken(30).color, 1);
        g.fillCircle(R, R, R - 2);
        g.fillStyle(base.color, 1);
        g.fillCircle(R, R, R - 6);
        g.fillStyle(base.clone().lighten(28).color, 1);
        g.fillCircle(R - 12, R - 12, R / 2.4);
        g.fillStyle(0xffffff, 0.25);
        g.fillCircle(R - 16, R - 16, R / 5);
        g.generateTexture(clave, R * 2, R * 2);
        g.destroy();
    }

    /* ================= Ambiente por mundo ================= */

    function pintarAmbiente(scene, amb, instantaneo) {
        var cieloAlto = hex(amb.cieloAlto, 0x1a1f5c);
        var cieloBajo = hex(amb.cieloBajo, 0x06082a);
        var sueloCol = hex(amb.suelo, 0x0f172a);
        var sueloBorde = hex(amb.sueloBorde, 0x1e293b);
        var rejilla = hex(amb.rejilla, 0x00e5ff);

        var g = capaAmbiente;
        g.clear();
        var pasos = 48, i;
        var cA = Phaser.Display.Color.IntegerToColor(cieloAlto);
        var cB = Phaser.Display.Color.IntegerToColor(cieloBajo);
        for (i = 0; i < pasos; i++) {
            var t = i / (pasos - 1);
            var col = Phaser.Display.Color.Interpolate.ColorWithColor(cA, cB, 100, Math.round(t * 100));
            g.fillStyle(Phaser.Display.Color.GetColor(col.r, col.g, col.b), 1);
            g.fillRect(0, Math.floor(t * ALTO), ANCHO, Math.ceil(ALTO / pasos) + 1);
        }

        var s = capaSuelo;
        s.clear();
        s.fillStyle(sueloCol, 1);
        s.fillRect(0, ALTO - 110, ANCHO, 110);
        s.fillStyle(sueloBorde, 1);
        s.fillRect(0, ALTO - 110, ANCHO, 10);
        s.lineStyle(2, rejilla, 0.2);
        for (i = -6; i <= 6; i++) {
            s.lineBetween(ANCHO / 2 + i * 60, ALTO - 100, ANCHO / 2 + i * 240, ALTO);
        }
        for (i = 1; i <= 4; i++) {
            var yy = ALTO - 100 + i * 24;
            s.lineBetween(0, yy, ANCHO, yy);
        }

        nebulosas[0].setTint(hex(amb.nebulosaA, 0x4c1d95));
        nebulosas[1].setTint(hex(amb.nebulosaB, 0x1e3a8a));

        var acento = hex(amb.acento, 0x00e5ff);
        if (halo) halo.setTint(acento);
        if (etiquetaMotor) etiquetaMotor.flecha.setColor('#' + acento.toString(16).padStart(6, '0'));

        if (!instantaneo) {
            scene.cameras.main.flash(260, 255, 255, 255, true);
        }
    }

    /* ================= Escena ================= */

    var EscenaTaller = {
        key: 'taller',

        create: function () {
            escena = this;
            var scene = this;
            var total = opciones.total || 12;
            var colores = opciones.colores || [];
            var mundos = opciones.mundos || [];

            texEstrella(scene);
            texParticula(scene);
            texNebulosa(scene);
            texCohete(scene);
            texPlataforma(scene);

            var i;
            for (i = 0; i < total; i++) {
                texBloque(scene, 'bloque-' + i, colores[i % colores.length]);
            }
            for (i = 0; i < mundos.length; i++) {
                var pl = mundos[i].planeta || {};
                texPlaneta(scene, 'planeta-' + i, hex(pl.color, 0x38bdf8));
            }

            capaAmbiente = scene.add.graphics().setDepth(0);
            nebulosas = [
                scene.add.image(300, 180, 'nebulosa').setDepth(1).setAlpha(0.45).setScale(1.4),
                scene.add.image(1040, 520, 'nebulosa').setDepth(1).setAlpha(0.32).setScale(1.1)
            ];
            if (!reducido()) {
                scene.tweens.add({ targets: nebulosas[0], alpha: 0.26, duration: 6000, yoyo: true, repeat: -1 });
                scene.tweens.add({ targets: nebulosas[1], alpha: 0.18, duration: 7400, yoyo: true, repeat: -1 });
            }

            estrellas = [];
            for (i = 0; i < 110; i++) {
                var e = scene.add.image(
                    Phaser.Math.Between(0, ANCHO),
                    Phaser.Math.Between(0, ALTO - 120),
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

            capaSuelo = scene.add.graphics().setDepth(3);

            plataforma = scene.add.image(COHETE_X, ALTO - 104, 'plataforma').setDepth(4).setScale(0.92);
            halo = scene.add.image(COHETE_X, COHETE_Y + 40, 'nebulosa')
                .setDepth(4).setAlpha(0.22).setScale(0.9);
            cohete = scene.add.image(COHETE_X, COHETE_Y, 'cohete').setDepth(6).setScale(COHETE_ESCALA);

            llama = scene.add.particles(COHETE_X, COHETE_Y + DESPLAZAMIENTO_LLAMA, 'chispa', {
                speed: { min: 120, max: 320 },
                angle: { min: 80, max: 100 },
                scale: { start: 1.1, end: 0 },
                lifespan: { min: 260, max: 520 },
                quantity: 6,
                tint: [0xffffff, 0xffcf2d, 0xff8a1f, 0xff3d3d],
                blendMode: 'ADD',
                emitting: false
            }).setDepth(5);
            /* El emisor se mueve con el cohete metiéndolo en los mismos tweens
               (ver piezasConLlama). startFollow() no sirve aquí: depende del
               preUpdate de la escena, cuyo reloj puede estar parado. */

            var centro = COHETE_Y + (CENTRO_FUSELAJE_TEX - 300) * COHETE_ESCALA;
            etiquetaMotor = {
                texto: scene.add.text(COHETE_X + 128, centro, 'MOTOR', {
                    fontFamily: 'Arial, sans-serif', fontSize: '20px',
                    fontStyle: 'bold', color: '#ffffff'
                }).setOrigin(0, 0.5).setDepth(9).setShadow(2, 2, '#000000cc', 4),
                flecha: scene.add.text(COHETE_X + 108, centro, '◄', {
                    fontSize: '20px', color: '#00e5ff'
                }).setOrigin(0.5).setDepth(9)
            };

            tituloAlmacen = scene.add.text(1130, 180, 'ALMACÉN DE BLOQUES', {
                fontFamily: 'Arial, sans-serif', fontSize: '20px',
                fontStyle: 'bold', color: '#ffffff'
            }).setOrigin(0.5).setDepth(9).setShadow(2, 2, '#000000cc', 4);

            crearMinimapa(scene, mundos);

            if (!reducido()) {
                scene.tweens.add({
                    targets: cohete, y: cohete.y - 8, duration: 2400,
                    yoyo: true, repeat: -1, ease: 'Sine.inOut'
                });
            }

            if (listoResolve) { listoResolve(); listoResolve = null; }
        }
    };

    /* ================= Bloques y slots ================= */

    /**
     * Quita solo la columna del mundo anterior. Los bloques del almacén se
     * reutilizan entre mundos (recrearlos deja objetos de input zombis en
     * Phaser 4, que ignoran un setDraggable posterior).
     */
    function limpiarMundo() {
        if (!escena) return;
        /* Barrer por textura, no por slotsVista: durante un viaje el array puede
           haber sido reemplazado y los slots viejos quedarían huérfanos en la
           escena, robándole el destino al drop. */
        escena.children.list
            .filter(function (o) {
                return o.texture && o.texture.key === 'slot-vacio';
            })
            .forEach(function (o) {
                escena.tweens.killTweensOf(o);
                o.destroy();
            });
        escena.children.list
            .filter(function (o) {
                return o.getData && o.getData('esNumeroSlot');
            })
            .forEach(function (o) {
                escena.tweens.killTweensOf(o);
                o.destroy();
            });
        slotsVista = [];
        escena.children.list
            .filter(function (o) { return o.getData && o.getData('esColumna'); })
            .forEach(function (o) {
                escena.tweens.killTweensOf(o);
                o.destroy();
            });
        escena.__columna = null;
    }

    /** Devuelve todos los bloques al almacén, arrastrables otra vez. */
    function reiniciarBloques() {
        if (!escena) return;
        bloquesVista.forEach(function (v) {
            escena.tweens.killTweensOf([v.sprite, v.etiqueta]);
            escena.tweens.killTweensOf(v.sprite);
            escena.tweens.killTweensOf(v.etiqueta);
            v.usado = false;
            v.sprite.clearTint();
            v.sprite.setPosition(v.homeX, v.homeY).setScale(0.74).setDepth(12).setVisible(true);
            v.etiqueta.setPosition(v.homeX, v.homeY + 2).setScale(1).setDepth(13).setVisible(true);
            escena.input.setDraggable(v.sprite, true);
        });
    }

    /**
     * Prepara el mundo: ambiente, columna de `meta` slots y almacén de `total`.
     */
    function prepararMundo(cfg) {
        if (!escena) return;
        var scene = escena;
        var meta = cfg.meta;
        var total = cfg.total;

        limpiarMundo();
        pintarAmbiente(scene, cfg.ambiente || {}, !!cfg.instantaneo);

        var slotW = 84, slotH = 36;
        texSlotVacio(scene, slotW, slotH);
        var claveCol = texColumna(scene, meta, slotH + 3, slotW);

        var pasoSlot = slotH + 3;
        var colAlto = meta * pasoSlot + 22;
        var centro = COHETE_Y + (CENTRO_FUSELAJE_TEX - 300) * COHETE_ESCALA;
        var colTopY = centro - colAlto / 2;

        scene.__columna = scene.add.image(COHETE_X, centro, claveCol).setDepth(7).setAlpha(0.95);
        scene.__columna.setData('esColumna', true);

        var i;
        for (i = 0; i < meta; i++) {
            var fila = meta - 1 - i;
            var sy = colTopY + 11 + fila * pasoSlot + slotH / 2;
            var img = scene.add.image(COHETE_X, sy, 'slot-vacio').setDepth(8);
            /* La casilla lleva grabado el número de bloque que espera, no su
               posición: así el niño empareja número con número. */
            var pedido = (cfg.secuencia && cfg.secuencia[i] != null) ? cfg.secuencia[i] : (i + 1);
            var num = scene.add.text(COHETE_X, sy, String(pedido), {
                fontFamily: 'Arial, sans-serif', fontSize: '21px',
                fontStyle: 'bold', color: '#94a3b8'
            }).setOrigin(0.5).setDepth(9).setAlpha(0.85);
            num.setData('esNumeroSlot', true);
            slotsVista.push({ x: COHETE_X, y: sy, img: img, texto: num, bloque: null });
        }

        if (!bloquesVista.length) {
            crearAlmacen(scene, total);
        } else {
            reiniciarBloques();
        }
    }

    /** Crea el almacén y sus bloques una sola vez por partida. */
    function crearAlmacen(scene, total) {
        var cols = 3;
        var filas = Math.ceil(total / cols);
        var celda = 92;
        var almW = cols * celda + 28;
        var almH = filas * celda + 28;
        if (!scene.textures.exists('almacen-marco')) texAlmacen(scene, almW, almH);

        var almX = 1130, almY = 330;
        scene.__almacen = scene.add.image(almX, almY, 'almacen-marco').setDepth(4);
        tituloAlmacen.setPosition(almX, almY - almH / 2 - 26);

        var i;
        for (i = 0; i < total; i++) {
            var col = i % cols;
            var fil = Math.floor(i / cols);
            var bx = almX - almW / 2 + 14 + celda / 2 + col * celda;
            var by = almY - almH / 2 + 14 + celda / 2 + fil * celda;

            var sprite = scene.add.image(bx, by, 'bloque-' + i).setDepth(12).setScale(0.74);
            var etiqueta = scene.add.text(bx, by + 2, String(i + 1), {
                fontFamily: 'Arial, sans-serif', fontSize: '30px',
                fontStyle: 'bold', color: '#ffffff'
            }).setOrigin(0.5).setDepth(13);
            etiqueta.setShadow(2, 2, '#00000080', 3);

            var vista = {
                id: 'bloque-' + (i + 1),
                numero: i + 1,
                sprite: sprite, etiqueta: etiqueta,
                homeX: bx, homeY: by, usado: false
            };
            bloquesVista.push(vista);
            prepararDrag(scene, vista);
        }
    }

    function prepararDrag(scene, vista) {
        var sprite = vista.sprite;
        sprite.setInteractive({ draggable: true, useHandCursor: true });
        /* Phaser puede reutilizar un input deshabilitado por disableInteractive()
           de un mundo anterior: reactivarlo explícitamente. */
        if (sprite.input) sprite.input.enabled = true;
        scene.input.setDraggable(sprite, true);

        sprite.on('dragstart', function () {
            if (vista.usado || !puedeJugar()) return;
            sprite.setDepth(40);
            vista.etiqueta.setDepth(41);
            scene.tweens.add({ targets: [sprite], scale: 0.86, duration: 120 });
            resaltarDestino(true);
            avisar('onAgarrar', vista.numero);
        });

        sprite.on('drag', function (pointer, dragX, dragY) {
            if (vista.usado || !puedeJugar()) return;
            sprite.x = dragX; sprite.y = dragY;
            vista.etiqueta.x = dragX; vista.etiqueta.y = dragY + 2;
        });

        sprite.on('dragend', function () {
            /* un bloque ya encajado no debe moverse ni volver al almacén */
            if (vista.usado) return;
            resaltarDestino(false);
            if (!puedeJugar()) { regresar(vista); return; }
            var destino = slotDestino();
            var cerca = destino && Phaser.Math.Distance.Between(sprite.x, sprite.y, destino.x, destino.y) < 230;
            var sobreColumna = sprite.x > 460 && sprite.x < 760 && sprite.y > 150 && sprite.y < 640;
            if (destino && (cerca || sobreColumna)) {
                avisar('onSoltarEnCohete', vista.id);
            } else {
                regresar(vista);
                avisar('onSoltarFuera', vista.id);
            }
        });
    }

    function puedeJugar() {
        if (bloqueado) return false;
        if (typeof cbs.puedeInteractuar === 'function') return !!cbs.puedeInteractuar();
        return true;
    }

    function slotDestino() {
        var i;
        for (i = 0; i < slotsVista.length; i++) if (!slotsVista[i].bloque) return slotsVista[i];
        return null;
    }

    function resaltarDestino(activo) {
        var destino = slotDestino();
        if (!destino || !escena) return;
        escena.tweens.killTweensOf(destino.img);
        if (activo) {
            destino.img.setTint(0x7cff6b);
            escena.tweens.add({ targets: destino.img, scale: 1.08, duration: 240, yoyo: true, repeat: -1 });
        } else {
            destino.img.setScale(1);
            destino.img.clearTint();
        }
    }

    function buscarVista(id) {
        var i;
        for (i = 0; i < bloquesVista.length; i++) if (bloquesVista[i].id === id) return bloquesVista[i];
        return null;
    }

    function regresar(vista) {
        if (!escena) return;
        escena.tweens.add({
            targets: [vista.sprite], x: vista.homeX, y: vista.homeY, scale: 0.74,
            duration: reducido() ? 0 : 260, ease: 'Back.out'
        });
        escena.tweens.add({
            targets: [vista.etiqueta], x: vista.homeX, y: vista.homeY + 2,
            duration: reducido() ? 0 : 260, ease: 'Back.out'
        });
        vista.sprite.setDepth(12);
        vista.etiqueta.setDepth(13);
    }

    /* ================= API de juego ================= */

    function encajar(bloqueId, indiceSlot) {
        var vista = buscarVista(bloqueId);
        var slot = slotsVista[indiceSlot];
        if (!vista || !slot || !escena) return;

        vista.usado = true;
        slot.bloque = vista;
        escena.tweens.killTweensOf(slot.img);
        slot.img.setScale(1);
        slot.img.clearTint();
        slot.texto.setVisible(false);

        escena.tweens.add({
            targets: [vista.sprite], x: slot.x, y: slot.y, scale: 0.36,
            duration: reducido() ? 0 : 280, ease: 'Back.out',
            onComplete: function () { pulsoEncaje(slot); }
        });
        escena.tweens.add({
            targets: [vista.etiqueta], x: slot.x, y: slot.y, scale: 0.55,
            duration: reducido() ? 0 : 280, ease: 'Back.out'
        });
        vista.sprite.setDepth(14);
        vista.etiqueta.setDepth(15);
        /* No se toca el input: `vista.usado` ya bloquea dragstart/drag/dragend.
           Apagarlo aquí dejaba el bloque muerto al reutilizarlo en el mundo
           siguiente, porque el reinicio corre antes que este onComplete. */
    }

    /** Bloque equivocado: lo devuelve al almacén con sacudida roja. */
    function rechazar(bloqueId) {
        var vista = buscarVista(bloqueId);
        if (!vista || !escena) return;
        vista.sprite.setTint(0xff6b6b);
        escena.cameras.main.shake(180, 0.005);
        escena.tweens.add({
            targets: [vista.sprite, vista.etiqueta],
            x: '+=12', duration: 60, yoyo: true, repeat: 3,
            onComplete: function () {
                vista.sprite.clearTint();
                regresar(vista);
            }
        });
    }

    function pulsoEncaje(slot) {
        if (!escena) return;
        var flash = escena.add.image(slot.x, slot.y, 'chispa')
            .setDepth(20).setScale(0.4).setAlpha(0.95).setTint(0x7ff5ff).setBlendMode('ADD');
        escena.tweens.add({
            targets: flash, scale: 8, alpha: 0, duration: 420, ease: 'Cubic.out',
            onComplete: function () { flash.destroy(); }
        });
        var chispas = escena.add.particles(slot.x, slot.y, 'chispa', {
            speed: { min: 80, max: 220 }, scale: { start: 0.6, end: 0 },
            lifespan: 420, quantity: 12,
            tint: [0x7ff5ff, 0xffffff, 0x00e5ff], blendMode: 'ADD', emitting: false
        }).setDepth(21);
        chispas.explode(14);
        tras(700, function () { chispas.destroy(); });
        if (halo) escena.tweens.add({ targets: halo, alpha: 0.42, scale: 1.05, duration: 220, yoyo: true });
    }

    /** Cohete listo: resplandor verde sobre la columna. */
    function marcarListo() {
        if (!escena) return;
        slotsVista.forEach(function (s, idx) {
            tras(idx * 70, function () {
                if (!s.img.scene) return;
                s.img.setTint(0x7cff6b);
                escena.tweens.add({ targets: s.img, scale: 1.12, duration: 160, yoyo: true });
            });
        });
        if (halo) escena.tweens.add({ targets: halo, alpha: 0.5, scale: 1.2, duration: 500, yoyo: true, repeat: -1 });
    }

    function senalarFaltantes() {
        if (!escena) return;
        slotsVista.forEach(function (s) {
            if (s.bloque) return;
            escena.tweens.killTweensOf(s.img);
            s.img.setTint(0xff6b6b);
            escena.tweens.add({
                targets: s.img, scale: 1.12, duration: 220, yoyo: true, repeat: 3,
                onComplete: function () { s.img.setScale(1); s.img.clearTint(); }
            });
        });
        escena.cameras.main.shake(260, 0.006);
    }

    /* ================= Viaje entre mundos ================= */

    /**
     * La nave se queda en cuadro, el espacio corre y el planeta destino pasa.
     * Después baja a la plataforma del mundo nuevo. Sin velo blanco.
     * @param {object} cfg {ambiente, meta, total, secuencia, indiceDestino}
     * @param {function} onAterrizado
     */
    function viajar(cfg, onAterrizado) {
        if (!escena) { if (onAterrizado) onAterrizado(); return; }
        bloqueado = true;
        pararCrucero();
        var scene = escena;
        var terminado = false;
        cfg = cfg || {};

        function llegar() {
            if (terminado) return;
            terminado = true;
            pararCrucero();
            if (!scene.sys) {
                bloqueado = false;
                if (onAterrizado) onAterrizado();
                return;
            }
            restaurarEstrellas(scene);
            prepararMundo({
                meta: cfg.meta, total: cfg.total,
                secuencia: cfg.secuencia,
                ambiente: cfg.ambiente, instantaneo: true
            });
            mostrarTaller();
            ocultar(scene.__columna);
            slotsVista.forEach(function (s) {
                ocultar(s.img);
                ocultar(s.texto);
            });
            var escalaEntrada = COHETE_ESCALA * 0.7;
            scene.tweens.killTweensOf(cohete);
            scene.tweens.add({
                targets: cohete,
                x: COHETE_X,
                y: COHETE_Y - ALTURA_ENTRADA,
                scale: escalaEntrada,
                duration: reducido() ? 0 : 480,
                ease: 'Sine.inOut'
            });
            if (llama) {
                scene.tweens.killTweensOf(llama);
                llama.start();
                scene.tweens.add({
                    targets: llama,
                    x: COHETE_X,
                    y: COHETE_Y - ALTURA_ENTRADA + DESPLAZAMIENTO_LLAMA,
                    duration: reducido() ? 0 : 480,
                    ease: 'Sine.inOut'
                });
            }
            tras(reducido() ? 40 : 500, function () {
                colocarCoheteArriba();
                faseAterrizaje(onAterrizado);
            });
        }

        scene.tweens.killTweensOf(cohete);
        if (llama) {
            scene.tweens.killTweensOf(llama);
            llama.start();
        }
        ocultarTaller();
        scene.cameras.main.shake(420, 0.006);

        var destinoX = ANCHO * 0.46;
        var destinoY = ALTO * 0.42;
        var escala = COHETE_ESCALA * 0.72;
        scene.tweens.add({
            targets: cohete,
            x: destinoX, y: destinoY, scale: escala,
            duration: reducido() ? 0 : 700, ease: 'Sine.out'
        });
        if (llama) {
            scene.tweens.add({
                targets: llama,
                x: destinoX,
                y: destinoY + DESPLAZAMIENTO_LLAMA * (escala / COHETE_ESCALA),
                duration: reducido() ? 0 : 700, ease: 'Sine.out'
            });
        }

        estrellas.forEach(function (e) {
            scene.tweens.killTweensOf(e);
            e.setScale(e.scaleX, reducido() ? e.scaleX : 4.6);
            e.setAlpha(0.95);
            e.__vel = 14 + Math.random() * 18;
        });

        var llamaBase = destinoY + DESPLAZAMIENTO_LLAMA * (escala / COHETE_ESCALA);
        if (!reducido()) {
            tras(720, function () {
                if (terminado || !cohete || !cohete.scene) return;
                var t0 = Date.now();
                cruceroId = setInterval(function () {
                    if (!cohete || !cohete.scene) return;
                    var wobble = Math.sin((Date.now() - t0) / 240) * 6;
                    cohete.y = destinoY + wobble;
                    cohete.x = destinoX;
                    if (llama) {
                        llama.y = llamaBase + wobble;
                        llama.x = destinoX;
                    }
                    estrellas.forEach(function (e) {
                        if (!e.scene) return;
                        e.y += e.__vel || 16;
                        if (e.y > ALTO + 24) {
                            e.y = -24;
                            e.x = Phaser.Math.Between(0, ANCHO);
                        }
                    });
                }, 16);
            });
        }

        var indice = cfg.indiceDestino;
        if (!reducido() && indice != null) {
            tras(450, function () {
                if (terminado || !scene.sys || !scene.textures.exists('planeta-' + indice)) return;
                var planeta = scene.add.image(ANCHO * 0.74, -130, 'planeta-' + indice)
                    .setDepth(8).setScale(0.32);
                scene.tweens.add({
                    targets: planeta,
                    y: ALTO * 0.5,
                    x: ANCHO * 0.8,
                    scale: 1.65,
                    duration: 1500,
                    ease: 'Sine.in',
                    onComplete: function () {
                        if (!planeta.scene) return;
                        scene.tweens.add({
                            targets: planeta,
                            y: ALTO + 220,
                            x: ANCHO + 60,
                            scale: 2.3,
                            duration: 650,
                            ease: 'Sine.in',
                            onComplete: function () { if (planeta.scene) planeta.destroy(); }
                        });
                    }
                });
            });
        }

        moverMinimapa(indice);
        tras(reducido() ? 700 : 2700, llegar);
    }

    /** Altura de entrada: el conjunto baja ALTURA_ENTRADA hasta su sitio. */
    var ALTURA_ENTRADA = 760;

    function colocarCoheteArriba() {
        if (!cohete) return;
        cohete.setVisible(true);
        cohete.setScale(COHETE_ESCALA * 0.7);
        /* Posición absoluta, no delta: prepararMundo() ya dejó cada pieza en su
           sitio definitivo, así que subirlas en bloque es reversible exacto. */
        cohete.setPosition(COHETE_X, COHETE_Y - ALTURA_ENTRADA);
        if (llama) llama.setPosition(COHETE_X, cohete.y + DESPLAZAMIENTO_LLAMA);
        slotsVista.forEach(function (s) {
            s.img.y -= ALTURA_ENTRADA;
            s.texto.y -= ALTURA_ENTRADA;
        });
        if (escena.__columna) escena.__columna.y -= ALTURA_ENTRADA;
    }

    /** FASE 4: descenso y asentamiento. */
    function faseAterrizaje(onAterrizado) {
        var scene = escena;
        if (!scene) return;

        var piezas = piezasDelCohete();

        /* faseCrucero ocultó todo lo que viaja con el cohete, la llama incluida:
           hay que devolverle la visibilidad antes de encender los motores. */
        piezas.forEach(function (p) { if (p && p.setVisible) p.setVisible(true); });
        if (llama) llama.start();

        scene.tweens.add({
            targets: cohete, scale: COHETE_ESCALA, duration: 900, ease: 'Sine.out'
        });
        scene.tweens.add({
            targets: piezas, y: '+=' + ALTURA_ENTRADA, duration: 1200, ease: 'Cubic.out'
        });

        /* Igual que en el despegue: el cierre va por temporizador, no por
           onComplete de un tween de grupo. */
        tras(1250, function () {
            if (llama) llama.stop();
            /* Reasentar en coordenadas exactas: los deltas acumulan deriva si un
               tween se interrumpe, y el cohete acabaría fuera de cuadro. */
            scene.tweens.killTweensOf(cohete);
            cohete.setY(COHETE_Y).setScale(COHETE_ESCALA);
            if (llama) llama.setPosition(COHETE_X, COHETE_Y + DESPLAZAMIENTO_LLAMA);
            slotsVista.forEach(function (s) {
                s.img.setY(s.y);
                s.texto.setY(s.y);
            });
            if (scene.__columna) scene.__columna.setY(centroColumna());
            scene.cameras.main.shake(300, 0.01);
            polvoAterrizaje();
            if (halo) {
                scene.tweens.killTweensOf(halo);
                halo.setAlpha(0.22).setScale(0.9);
            }
            if (!reducido()) {
                scene.tweens.add({
                    targets: cohete, y: cohete.y - 8, duration: 2400,
                    yoyo: true, repeat: -1, ease: 'Sine.inOut'
                });
            }
            bloquesVista.forEach(function (v) {
                v.sprite.setVisible(true);
                v.etiqueta.setVisible(true);
            });
            bloqueado = false;
            if (onAterrizado) onAterrizado();
        });
    }

    function polvoAterrizaje() {
        if (!escena) return;
        var polvo = escena.add.particles(COHETE_X, ALTO - 120, 'chispa', {
            speed: { min: 120, max: 300 },
            angle: { min: 160, max: 380 },
            scale: { start: 0.9, end: 0 },
            lifespan: 700, quantity: 20,
            tint: [0xffffff, 0xcbd5e1], alpha: { start: 0.7, end: 0 },
            emitting: false
        }).setDepth(10);
        polvo.explode(28);
        tras(1100, function () { polvo.destroy(); });
    }

    function ocultar(obj) {
        if (obj && obj.setVisible) obj.setVisible(false);
    }

    /** Quita taller, bloques y ruta para que el crucero se vea solo. */
    function ocultarTaller() {
        ocultar(capaSuelo);
        ocultar(plataforma);
        ocultar(halo);
        ocultar(tituloAlmacen);
        if (escena && escena.__columna) ocultar(escena.__columna);
        if (escena && escena.__almacen) ocultar(escena.__almacen);
        if (etiquetaMotor) {
            ocultar(etiquetaMotor.texto);
            ocultar(etiquetaMotor.flecha);
        }
        slotsVista.forEach(function (s) {
            ocultar(s.img);
            ocultar(s.texto);
            if (s.bloque) {
                ocultar(s.bloque.sprite);
                ocultar(s.bloque.etiqueta);
            }
        });
        bloquesVista.forEach(function (v) {
            ocultar(v.sprite);
            ocultar(v.etiqueta);
        });
        if (minimapa) {
            ocultar(minimapa.fondo);
            ocultar(minimapa.titulo);
            ocultar(minimapa.ruta);
            ocultar(minimapa.nave);
            (minimapa.iconos || []).forEach(function (ic) {
                ocultar(ic.img);
                ocultar(ic.texto);
            });
        }
        nebulosas.forEach(ocultar);
    }

    function mostrar(obj) {
        if (obj && obj.setVisible) obj.setVisible(true);
    }

    /** Devuelve el taller después del crucero. Las casillas nuevas las crea prepararMundo. */
    function mostrarTaller() {
        mostrar(capaSuelo);
        mostrar(plataforma);
        mostrar(halo);
        mostrar(tituloAlmacen);
        if (escena && escena.__almacen) mostrar(escena.__almacen);
        if (etiquetaMotor) {
            mostrar(etiquetaMotor.texto);
            mostrar(etiquetaMotor.flecha);
        }
        nebulosas.forEach(mostrar);
        if (minimapa) {
            mostrar(minimapa.fondo);
            mostrar(minimapa.titulo);
            mostrar(minimapa.ruta);
            mostrar(minimapa.nave);
            (minimapa.iconos || []).forEach(function (ic) {
                mostrar(ic.img);
                mostrar(ic.texto);
            });
        }
    }

    function restaurarEstrellas(scene) {
        estrellas.forEach(function (e) {
            if (!e.scene) return;
            scene.tweens.killTweensOf(e);
            e.setScale(e.scaleX);
            e.setAlpha(Phaser.Math.FloatBetween(0.35, 1));
            if (!reducido()) {
                scene.tweens.add({
                    targets: e,
                    alpha: Phaser.Math.FloatBetween(0.15, 0.5),
                    duration: Phaser.Math.Between(1200, 3600),
                    yoyo: true, repeat: -1
                });
            }
        });
    }

    function pararCrucero() {
        if (cruceroId) {
            clearInterval(cruceroId);
            cruceroId = null;
        }
    }

    /**
     * Cierre de los cuatro mundos: la nave se queda en cuadro y el espacio
     * (estrellas y los planetas visitados) pasa de largo.
     */
    function viajeFinal(onFin) {
        if (!escena) { if (onFin) onFin(); return; }
        bloqueado = true;
        pararCrucero();
        var scene = escena;
        var avisado = false;
        function avisarFin() {
            if (avisado) return;
            avisado = true;
            if (onFin) onFin();
        }

        scene.tweens.killTweensOf(cohete);
        if (llama) {
            scene.tweens.killTweensOf(llama);
            llama.start();
        }
        ocultarTaller();
        pintarAmbiente(scene, {
            cieloAlto: '#020617',
            cieloBajo: '#000000',
            suelo: '#000000',
            sueloBorde: '#000000',
            rejilla: '#000000',
            nebulosaA: '#312e81',
            nebulosaB: '#1e1b4b',
            acento: '#00e5ff'
        }, true);
        ocultar(capaSuelo);

        var destinoX = ANCHO * 0.42;
        var destinoY = ALTO * 0.46;
        var escala = COHETE_ESCALA * 0.78;
        scene.cameras.main.shake(500, 0.006);
        scene.tweens.add({
            targets: cohete,
            x: destinoX, y: destinoY, scale: escala,
            duration: 700, ease: 'Sine.out'
        });
        if (llama) {
            scene.tweens.add({
                targets: llama,
                x: destinoX,
                y: destinoY + DESPLAZAMIENTO_LLAMA * (escala / COHETE_ESCALA),
                duration: 700, ease: 'Sine.out'
            });
        }

        estrellas.forEach(function (e) {
            scene.tweens.killTweensOf(e);
            e.setScale(e.scaleX, 4.2);
            e.setAlpha(0.95);
            e.__vel = 10 + Math.random() * 16;
        });

        var llamaBase = destinoY + DESPLAZAMIENTO_LLAMA * (escala / COHETE_ESCALA);
        tras(720, function () {
            var t0 = Date.now();
            cruceroId = setInterval(function () {
                if (!cohete || !cohete.scene) return;
                var wobble = Math.sin((Date.now() - t0) / 260) * 7;
                cohete.y = destinoY + wobble;
                cohete.x = destinoX;
                if (llama) {
                    llama.y = llamaBase + wobble;
                    llama.x = destinoX;
                }
                estrellas.forEach(function (e) {
                    if (!e.scene) return;
                    e.y += e.__vel || 12;
                    if (e.y > ALTO + 24) {
                        e.y = -24;
                        e.x = Phaser.Math.Between(0, ANCHO);
                    }
                });
            }, 16);
        });

        var n = (opciones.mundos && opciones.mundos.length) || 4;
        var i;
        for (i = 0; i < n; i++) {
            (function (indice) {
                tras(350 + indice * 1100, function () {
                    if (!scene.sys || !scene.textures.exists('planeta-' + indice)) return;
                    var izquierda = indice % 2 === 0;
                    var x0 = izquierda ? 210 : ANCHO - 210;
                    var planeta = scene.add.image(x0, -140, 'planeta-' + indice)
                        .setDepth(8).setScale(0.55);
                    scene.tweens.add({
                        targets: planeta,
                        y: ALTO + 180,
                        x: x0 + (izquierda ? 90 : -90),
                        scale: 2.6,
                        duration: 1400,
                        ease: 'Linear',
                        onComplete: function () { if (planeta.scene) planeta.destroy(); }
                    });
                });
            })(i);
        }

        /* Los cuatro mundos cruzan y después la nave aterriza en la base. */
        tras(reducido() ? 400 : 350 + n * 1100, llegarABase);

        function llegarABase() {
            if (avisado) return;
            pararCrucero();
            if (!scene.sys || !cohete) { avisarFin(); return; }
            restaurarEstrellas(scene);
            texBaseFinal(scene);
            if (baseFinal && baseFinal.scene) baseFinal.destroy();

            var baseY = 628;
            baseFinal = scene.add.image(ANCHO / 2, ALTO + 200, 'base-final')
                .setDepth(5);
            scene.tweens.add({
                targets: baseFinal, y: baseY,
                duration: reducido() ? 0 : 780, ease: 'Cubic.out'
            });

            var naveY = 424;
            var escalaAterrizaje = 0.6;
            scene.tweens.killTweensOf(cohete);
            scene.tweens.add({
                targets: cohete,
                x: ANCHO / 2, y: naveY, scale: escalaAterrizaje,
                duration: reducido() ? 0 : 900, ease: 'Cubic.out'
            });
            if (llama) {
                scene.tweens.killTweensOf(llama);
                scene.tweens.add({
                    targets: llama,
                    x: ANCHO / 2,
                    y: naveY + DESPLAZAMIENTO_LLAMA * (escalaAterrizaje / COHETE_ESCALA),
                    duration: reducido() ? 0 : 900, ease: 'Cubic.out'
                });
            }

            tras(reducido() ? 40 : 940, function () {
                if (!scene.sys) { avisarFin(); return; }
                if (llama) llama.stop();
                cohete.setPosition(ANCHO / 2, naveY).setScale(escalaAterrizaje);
                scene.cameras.main.shake(180, 0.004);
                var polvo = scene.add.particles(ANCHO / 2, 548, 'chispa', {
                    speed: { min: 40, max: 160 },
                    angle: { min: 200, max: 340 },
                    scale: { start: 0.7, end: 0 },
                    lifespan: 500, quantity: 8,
                    tint: [0xe2e8f0, 0x67e8f9],
                    alpha: { start: 0.7, end: 0 },
                    emitting: false
                }).setDepth(9);
                polvo.explode(16);
                tras(700, function () { if (polvo.scene) polvo.destroy(); });
                tras(reducido() ? 80 : 520, avisarFin);
            });
        }
    }

    function texBaseFinal(scene) {
        if (scene.textures.exists('base-final')) return;
        var W = 760, H = 280;
        var g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x1e293b, 1);
        g.fillRoundedRect(64, 48, 92, 190, 14);
        g.fillRoundedRect(W - 156, 48, 92, 190, 14);
        g.fillStyle(0x0f172a, 1);
        g.fillRoundedRect(78, 64, 64, 36, 6);
        g.fillRoundedRect(W - 142, 64, 64, 36, 6);
        g.fillStyle(0x22d3ee, 0.95);
        g.fillRoundedRect(86, 72, 48, 18, 4);
        g.fillRoundedRect(W - 134, 72, 48, 18, 4);
        g.fillStyle(0xfbbf24, 1);
        g.fillCircle(110, 132, 6);
        g.fillCircle(W - 110, 132, 6);
        g.fillStyle(0x0f172a, 1);
        g.fillEllipse(W / 2, 78, 540, 74);
        g.fillStyle(0x334155, 1);
        g.fillEllipse(W / 2, 70, 460, 54);
        g.lineStyle(5, 0x22d3ee, 0.95);
        g.strokeEllipse(W / 2, 66, 310, 36);
        g.lineStyle(2, 0xffffff, 0.4);
        g.strokeEllipse(W / 2, 66, 170, 18);
        g.fillStyle(0x475569, 1);
        g.fillRect(W / 2 - 22, 96, 16, 160);
        g.fillRect(W / 2 + 6, 96, 16, 160);
        g.generateTexture('base-final', W, H);
        g.destroy();
    }

    /** Despegue final (sin destino): el cohete sale y se llama onFin. */
    function despegar(onFin) {
        if (!escena) { if (onFin) onFin(); return; }
        bloqueado = true;
        var scene = escena;
        var piezas = piezasDelCohete();

        scene.tweens.killTweensOf(cohete);
        if (llama) llama.start();
        scene.cameras.main.shake(900, 0.009);

        scene.tweens.add({ targets: piezas, y: '-=60', duration: 700, ease: 'Sine.inOut' });
        tras(700, function () {
            scene.tweens.add({ targets: piezas, y: '-=1200', duration: 1400, ease: 'Cubic.in' });
        });
        tras(2100, function () {
            if (llama) llama.stop();
            if (onFin) onFin();
        });
        if (halo) scene.tweens.add({ targets: halo, alpha: 0.6, scale: 1.4, duration: 600 });
    }

    /* ================= Minimapa ================= */

    function crearMinimapa(scene, mundos) {
        var n = mundos.length;
        if (!n) return;
        var panelW = 300, panelH = 128;
        var x0 = ANCHO - panelW - 24;
        var y0 = ALTO - panelH - 24;

        var fondo = scene.add.graphics().setDepth(50);
        fondo.fillStyle(0x020617, 0.72);
        fondo.fillRoundedRect(x0, y0, panelW, panelH, 18);
        fondo.lineStyle(3, 0x00e5ff, 0.7);
        fondo.strokeRoundedRect(x0, y0, panelW, panelH, 18);

        var titulo = scene.add.text(x0 + panelW / 2, y0 + 16, 'RUTA ESPACIAL', {
            fontFamily: 'Arial, sans-serif', fontSize: '13px',
            fontStyle: 'bold', color: '#7dd3fc'
        }).setOrigin(0.5).setDepth(52);

        var ruta = scene.add.graphics().setDepth(51);
        var puntos = [];
        var margen = 42;
        var paso = (panelW - margen * 2) / Math.max(1, n - 1);
        var baseY = y0 + panelH / 2 + 14;

        var i;
        for (i = 0; i < n; i++) {
            puntos.push({ x: x0 + margen + paso * i, y: baseY + (i % 2 === 0 ? 0 : -16) });
        }

        ruta.lineStyle(3, 0x38bdf8, 0.4);
        for (i = 0; i < n - 1; i++) {
            ruta.lineBetween(puntos[i].x, puntos[i].y, puntos[i + 1].x, puntos[i + 1].y);
        }

        var iconos = [];
        for (i = 0; i < n; i++) {
            var pl = scene.add.image(puntos[i].x, puntos[i].y, 'planeta-' + i)
                .setDepth(52).setScale(0.32).setAlpha(0.4);
            var nom = scene.add.text(puntos[i].x, puntos[i].y + 20,
                (mundos[i].planeta && mundos[i].planeta.nombre) || String(i + 1), {
                    fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#cbd5e1'
                }).setOrigin(0.5).setDepth(52).setAlpha(0.6);
            iconos.push({ img: pl, texto: nom, x: puntos[i].x, y: puntos[i].y });
        }

        var nave = scene.add.text(puntos[0].x, puntos[0].y - 22, '🚀', { fontSize: '18px' })
            .setOrigin(0.5).setDepth(53);

        minimapa = {
            fondo: fondo, titulo: titulo, ruta: ruta,
            iconos: iconos, nave: nave, actual: 0, completados: []
        };
        marcarMinimapa(0);
    }

    function marcarMinimapa(indice) {
        if (!minimapa) return;
        minimapa.actual = indice;
        minimapa.iconos.forEach(function (ic, i) {
            var activo = i === indice;
            var hecho = minimapa.completados.indexOf(i) !== -1;
            ic.img.setAlpha(activo ? 1 : (hecho ? 0.85 : 0.35));
            ic.img.setScale(activo ? 0.46 : 0.32);
            ic.texto.setAlpha(activo ? 1 : (hecho ? 0.8 : 0.45));
            ic.texto.setColor(activo ? '#ffffff' : (hecho ? '#7cff6b' : '#cbd5e1'));
            if (escena) {
                escena.tweens.killTweensOf(ic.img);
                if (activo && !reducido()) {
                    escena.tweens.add({
                        targets: ic.img, scale: 0.52, duration: 900,
                        yoyo: true, repeat: -1, ease: 'Sine.inOut'
                    });
                }
            }
        });
    }

    function moverMinimapa(indiceDestino) {
        if (!minimapa || !escena) return;
        if (minimapa.completados.indexOf(minimapa.actual) === -1) {
            minimapa.completados.push(minimapa.actual);
        }
        var destino = minimapa.iconos[indiceDestino];
        if (!destino) return;
        escena.tweens.add({
            targets: minimapa.nave,
            x: destino.x, y: destino.y - 22,
            duration: 1600, ease: 'Sine.inOut'
        });
        tras(1650, function () {
            if (!minimapa) return;
            minimapa.nave.setPosition(destino.x, destino.y - 22);
            marcarMinimapa(indiceDestino);
        });
    }

    /* ================= Montaje ================= */

    function montar(config) {
        opciones = config || {};
        cbs = opciones.callbacks || {};
        bloqueado = false;
        var listoPromise = new Promise(function (res) { listoResolve = res; });

        var host = global.PedniaPhaserHost;
        var cfg = {
            type: Phaser.AUTO,
            parent: opciones.parent || 'phaser-juego',
            width: ANCHO, height: ALTO,
            backgroundColor: '#06082a',
            scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
            scene: [EscenaTaller]
        };
        game = host ? host.crear(cfg) : new Phaser.Game(cfg);
        return listoPromise;
    }

    function destruir() {
        var host = global.PedniaPhaserHost;
        if (host) host.destruirJuego();
        else if (game) { try { game.destroy(true); } catch (e) {} }
        game = null; escena = null;
        bloquesVista = []; slotsVista = []; minimapa = null;
    }

    global.ConstructoresEspacioPhaser = {
        montar: montar,
        destruir: destruir,
        prepararMundo: prepararMundo,
        encajar: encajar,
        rechazar: rechazar,
        marcarListo: marcarListo,
        senalarFaltantes: senalarFaltantes,
        viajar: viajar,
        despegar: despegar,
        viajeFinal: viajeFinal,
        marcarMinimapa: marcarMinimapa,
        ANCHO: ANCHO,
        ALTO: ALTO
    };
})(typeof window !== 'undefined' ? window : this);
