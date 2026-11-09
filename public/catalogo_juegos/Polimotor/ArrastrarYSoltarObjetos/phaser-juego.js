/**
 * PedniaArrastrePhaser — "La fábrica": los objetos salen de una máquina, viajan por
 * una cinta transportadora y el niño los agarra y los lanza a su caja.
 * Phaser 4.2.1 (vendor), sin GSAP (tweens nativos).
 *
 * Contrato con script.js (no cambia): montar, cargarRonda, setInteractivo,
 * cancelarDrag, demoLlevar, rectPantalla, destruir y los callbacks onDrop,
 * puedeInteractuar, onAgarrar, onMover y onSoltar.
 */
(function (global) {
    'use strict';

    var Phaser = global.Phaser;
    var Host = null;

    var gameConfig = null;
    var callbacks = {};
    var game = null;
    var sceneRef = null;
    var readyPromise = null;
    var readyResolve = null;
    var assetsLoaded = false;
    var busyDrop = false;

    /* Profundidades de dibujo. */
    var Z = { fondo: 0, cinta: 2, objeto: 4, maquina: 6, caja: 8, vuelo: 20 };
    var COLORES_CAJA = [0xff922b, 0x4dabf7, 0x51cf66, 0xcc5de8, 0xf03e3e];

    function metaObj(id) {
        return (gameConfig && gameConfig.objetos && gameConfig.objetos[id]) || {};
    }

    function metaDest(id) {
        return (gameConfig && gameConfig.destinos && gameConfig.destinos[id]) || {};
    }

    function destinoCorrecto(objetoId) {
        return (gameConfig && gameConfig.pares && gameConfig.pares[objetoId]) || null;
    }

    function texKey(tipo, id) {
        return tipo + ':' + id;
    }

    /** Avisos solo de sonido/animación; un fallo en ellos no interrumpe el juego. */
    function avisar(nombre) {
        var fn = callbacks && callbacks[nombre];
        if (typeof fn !== 'function') return;
        try {
            fn.apply(null, Array.prototype.slice.call(arguments, 1));
        } catch (e) { /* noop */ }
    }

    function puedeInteractuar() {
        if (busyDrop) return false;
        if (typeof callbacks.puedeInteractuar === 'function') {
            return !!callbacks.puedeInteractuar();
        }
        return true;
    }

    function movimientoReducido() {
        return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function limitar(v, a, b) {
        return Math.max(a, Math.min(b, v));
    }

    function boundsToScreen(scene, go) {
        if (!scene || !go) return null;
        var b = go.getBounds();
        var rect = scene.game.canvas.getBoundingClientRect();
        var sx = rect.width / (scene.scale.width || 1);
        var sy = rect.height / (scene.scale.height || 1);
        return {
            x: rect.left + b.centerX * sx,
            y: rect.top + b.centerY * sy,
            left: rect.left + b.x * sx,
            top: rect.top + b.y * sy,
            width: b.width * sx,
            height: b.height * sy
        };
    }

    /** Rueda dentada como polígono. */
    function puntosEngranaje(r, dientes) {
        var pts = [];
        var n = dientes * 2;
        for (var i = 0; i < n; i++) {
            var a0 = (i / n) * Math.PI * 2;
            var a1 = ((i + 1) / n) * Math.PI * 2;
            var rr = i % 2 === 0 ? r : r * 0.8;
            pts.push(new Phaser.Math.Vector2(Math.cos(a0) * rr, Math.sin(a0) * rr));
            pts.push(new Phaser.Math.Vector2(Math.cos(a1) * rr, Math.sin(a1) * rr));
        }
        return pts;
    }

    var EscenaArrastre = new Phaser.Class({
        Extends: Phaser.Scene,

        initialize: function EscenaArrastre() {
            Phaser.Scene.call(this, { key: 'EscenaArrastre' });
            this.destinos = Object.create(null);
            this.objetos = Object.create(null);
            this.dragGo = null;
            this.L = null;
            this.pausaCinta = 0;
            this.segundosCinta = 9;
            this.engranajes = [];
            this.rodillos = [];
        },

        preload: function () {
            if (assetsLoaded || !gameConfig) return;
            var self = this;
            var objs = gameConfig.objetos || {};
            var dests = gameConfig.destinos || {};
            // Los SVG solo traen viewBox: con load.image WebGL los subía NEGROS.
            // load.svg los rasteriza a tamaño fijo (escala 2 → nítidos).
            function cargar(key, url) {
                if (/\.svg(\?|$)/i.test(url)) self.load.svg(key, url, { scale: 2 });
                else self.load.image(key, url);
            }
            Object.keys(objs).forEach(function (id) {
                if (objs[id] && objs[id].img) cargar(texKey('obj', id), objs[id].img);
            });
            Object.keys(dests).forEach(function (id) {
                if (dests[id] && dests[id].img) cargar(texKey('dest', id), dests[id].img);
            });
        },

        create: function () {
            sceneRef = this;
            assetsLoaded = true;
            this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

            this.gFondo = this.add.graphics().setDepth(Z.fondo);
            this.gCinta = this.add.graphics().setDepth(Z.cinta);
            this.gMaquina = this.add.graphics().setDepth(Z.maquina);
            this.lampara = this.add.circle(0, 0, 10, 0x40c057).setDepth(Z.maquina + 1);

            this.input.on('dragstart', this.onDragStart, this);
            this.input.on('drag', this.onDrag, this);
            this.input.on('dragend', this.onDragEnd, this);
            this.scale.on('resize', this.onResize, this);
            this.events.once('shutdown', this.onShutdown, this);
            this.events.once('destroy', this.onShutdown, this);

            this.dibujarEscenario();

            // Si el enunciado cambia de alto (otro texto), la fábrica se reacomoda.
            var nube = document.querySelector('.enunciado-wrap');
            if (nube && global.ResizeObserver) {
                var self = this;
                var altoPrevio = 0;
                this.obsNube = new global.ResizeObserver(function () {
                    var alto = Math.round(nube.getBoundingClientRect().height);
                    if (Math.abs(alto - altoPrevio) < 4) return;
                    altoPrevio = alto;
                    if (sceneRef === self) self.onResize();
                });
                this.obsNube.observe(nube);
            }

            if (readyResolve) {
                readyResolve();
                readyResolve = null;
            }
        },

        onShutdown: function () {
            if (sceneRef === this) sceneRef = null;
            if (this.obsNube) this.obsNube.disconnect();
            this.input.off('dragstart', this.onDragStart, this);
            this.input.off('drag', this.onDrag, this);
            this.input.off('dragend', this.onDragEnd, this);
            this.scale.off('resize', this.onResize, this);
        },

        /* ── Medidas ─────────────────────────────────────────── */

        medidas: function () {
            var w = this.scale.width;
            var h = this.scale.height;
            var objSize = limitar(Math.min(w * 0.11, h * 0.15), 64, 128);
            var cintaH = limitar(h * 0.065, 30, 54);
            // Los objetos viajan por debajo de la nube del enunciado, sin que los tape.
            var techo = this.bordeEnunciado();
            var cintaY = Math.max(h * 0.42, techo + 14 + objSize * 0.95 + cintaH / 2);
            var x0 = Math.max(70, w * 0.12);
            var x1 = w - Math.max(56, w * 0.07);
            var suelo = cintaY + cintaH / 2 + limitar(h * 0.06, 26, 56);
            return {
                w: w,
                h: h,
                objSize: objSize,
                cintaH: cintaH,
                cintaY: cintaY,
                objY: cintaY - cintaH / 2 - objSize * 0.42,
                x0: x0,
                x1: x1,
                largo: x1 - x0,
                suelo: suelo
            };
        },

        /** Borde inferior de la nube del enunciado, en coordenadas del lienzo. */
        bordeEnunciado: function () {
            var nube = document.querySelector('.enunciado-wrap');
            var canvas = this.game.canvas;
            if (!nube || !canvas) return this.scale.height * 0.22;
            var rn = nube.getBoundingClientRect();
            var rc = canvas.getBoundingClientRect();
            if (!rn.height || !rc.height) return this.scale.height * 0.22;
            return (rn.bottom - rc.top) * (this.scale.height / rc.height);
        },

        /* ── Fábrica de fondo, cinta y máquina ───────────────── */

        dibujarEscenario: function () {
            var L = this.medidas();
            var anterior = this.L;
            this.L = L;
            var g = this.gFondo;
            g.clear();

            // Pared de la fábrica.
            g.fillStyle(0xd6e6f5, 1);
            g.fillRect(0, 0, L.w, L.suelo);
            g.lineStyle(3, 0xbfd3e8, 1);
            for (var y = 60; y < L.suelo; y += 70) {
                g.lineBetween(0, y, L.w, y);
            }
            // Ventanales.
            var nV = Math.max(2, Math.round(L.w / 260));
            for (var i = 0; i < nV; i++) {
                var vx = (i + 0.5) * (L.w / nV) - 70;
                var vy = Math.max(18, L.cintaY - L.objSize * 2.6 - 110);
                g.fillStyle(0x9ec5ea, 1);
                g.fillRoundedRect(vx, vy, 140, 96, 8);
                g.fillStyle(0xc7e1f7, 1);
                g.fillTriangle(vx + 10, vy + 86, vx + 60, vy + 10, vx + 90, vy + 86);
                g.lineStyle(6, 0x8aa4bf, 1);
                g.strokeRoundedRect(vx, vy, 140, 96, 8);
                g.lineBetween(vx + 70, vy, vx + 70, vy + 96);
                g.lineBetween(vx, vy + 48, vx + 140, vy + 48);
            }
            // Tubería que recorre la pared.
            var ty = L.cintaY - L.objSize * 1.25;
            g.fillStyle(0x94a3b8, 1);
            g.fillRect(0, ty - 9, L.w, 18);
            g.fillStyle(0x64748b, 1);
            for (var tx = 80; tx < L.w; tx += 220) {
                g.fillRect(tx - 6, ty - 13, 12, 26);
            }
            // Piso con franja de seguridad.
            g.fillStyle(0xa3b1c2, 1);
            g.fillRect(0, L.suelo, L.w, L.h - L.suelo);
            g.lineStyle(2, 0x93a2b5, 1);
            for (var px = 0; px < L.w; px += 90) {
                g.lineBetween(px, L.suelo, px - 60, L.h);
            }
            for (var sx = -20; sx < L.w; sx += 40) {
                g.fillStyle(0xffd43b, 1);
                g.fillTriangle(sx, L.suelo, sx + 20, L.suelo, sx + 10, L.suelo + 14);
                g.fillStyle(0x343a40, 1);
                g.fillTriangle(sx + 20, L.suelo, sx + 40, L.suelo, sx + 30, L.suelo + 14);
            }

            this.dibujarEngranajes(L);
            this.dibujarCinta(L);
            this.dibujarMaquina(L);

            // Al cambiar el tamaño, los objetos siguen en la misma parte del recorrido.
            if (anterior && anterior.largo > 0) {
                var k = L.largo / anterior.largo;
                var self = this;
                Object.keys(this.objetos).forEach(function (id) {
                    var o = self.objetos[id];
                    o.s *= k;
                    if (o.estado === 'cinta' && o.sprite) o.sprite.setDisplaySize(L.objSize, L.objSize);
                    o.size = L.objSize;
                });
            }
        },

        dibujarEngranajes: function (L) {
            this.engranajes.forEach(function (e) { e.destroy(); });
            this.engranajes = [];
            var defs = [
                { x: L.w * 0.06, y: L.cintaY - L.objSize * 2.1, r: 46, c: 0xa5b4c8, v: 0.5 },
                { x: L.w * 0.06 + 64, y: L.cintaY - L.objSize * 2.1 + 42, r: 30, c: 0x94a3b8, v: -0.75 },
                { x: L.w * 0.95, y: L.cintaY - L.objSize * 2.3, r: 54, c: 0xa5b4c8, v: -0.4 }
            ];
            var self = this;
            defs.forEach(function (d) {
                var gr = self.add.graphics().setDepth(Z.fondo + 1);
                gr.fillStyle(d.c, 1);
                gr.fillPoints(puntosEngranaje(d.r, 10), true);
                gr.fillStyle(0xd6e6f5, 1);
                gr.fillCircle(0, 0, d.r * 0.32);
                gr.setPosition(d.x, d.y);
                gr.setData('vel', d.v);
                self.engranajes.push(gr);
            });
        },

        dibujarCinta: function (L) {
            var g = this.gCinta;
            g.clear();
            // Patas sobre el piso.
            g.fillStyle(0x495057, 1);
            for (var px = L.x0 + 30; px < L.x1; px += Math.max(140, L.largo / 5)) {
                g.fillRect(px - 7, L.cintaY, 14, L.suelo - L.cintaY + 6);
            }
            // Marco de la cinta.
            g.fillStyle(0x343a40, 1);
            g.fillRoundedRect(L.x0 - 14, L.cintaY - L.cintaH / 2 - 7, L.largo + 28, L.cintaH + 14, (L.cintaH + 14) / 2);

            // Banda con estrías que avanzan (textura generada al tamaño de la cinta).
            if (this.textures.exists('cinta-banda')) this.textures.remove('cinta-banda');
            var t = this.make.graphics({ x: 0, y: 0 }, false);
            var paso = 36;
            t.fillStyle(0x2b2f36, 1);
            t.fillRect(0, 0, paso, L.cintaH);
            t.fillStyle(0x4b5563, 1);
            t.fillRect(paso * 0.15, 0, paso * 0.32, L.cintaH);
            t.fillStyle(0xffffff, 0.08);
            t.fillRect(0, 2, paso, 4);
            t.generateTexture('cinta-banda', paso, Math.ceil(L.cintaH));
            t.destroy();
            if (this.banda) this.banda.destroy();
            this.banda = this.add.tileSprite(L.x0 + L.largo / 2, L.cintaY, L.largo, L.cintaH, 'cinta-banda')
                .setDepth(Z.cinta);

            // Rodillos de los extremos.
            this.rodillos.forEach(function (r) { r.destroy(); });
            this.rodillos = [];
            var self = this;
            [L.x0, L.x1].forEach(function (x) {
                var r = self.add.graphics().setDepth(Z.cinta + 1);
                var rad = L.cintaH / 2 + 4;
                r.fillStyle(0xadb5bd, 1);
                r.fillCircle(0, 0, rad);
                r.lineStyle(4, 0x495057, 1);
                r.strokeCircle(0, 0, rad);
                r.lineBetween(-rad, 0, rad, 0);
                r.lineBetween(0, -rad, 0, rad);
                r.setPosition(x, L.cintaY);
                self.rodillos.push(r);
            });
        },

        dibujarMaquina: function (L) {
            var g = this.gMaquina;
            g.clear();
            var alto = L.objSize * 1.45 + L.cintaH;
            var top = L.cintaY + L.cintaH / 2 - alto;
            var ancho = L.x0 + 10;
            // Máquina que fabrica los objetos (izquierda).
            g.fillStyle(0xf76707, 1);
            g.fillRoundedRect(-20, top, ancho + 20, alto + 24, 18);
            g.fillStyle(0xfd7e14, 1);
            g.fillRoundedRect(-20, top + 10, ancho + 6, alto - 6, 14);
            // Boca por donde salen los objetos: la tapa de arriba los cubre al salir.
            g.fillStyle(0x212529, 1);
            g.fillRoundedRect(ancho - 26, L.objY - L.objSize * 0.62, 30, L.objSize * 1.12 + L.cintaH * 0.3, 10);
            // Remaches y panel.
            g.fillStyle(0xffd8a8, 1);
            g.fillCircle(ancho * 0.3, top + 26, 5);
            g.fillCircle(ancho * 0.7, top + 26, 5);
            g.fillStyle(0xffe8cc, 1);
            g.fillRoundedRect(ancho * 0.15, top + alto * 0.45, ancho * 0.5, 18, 6);
            // Chimenea.
            g.fillStyle(0x495057, 1);
            g.fillRect(ancho * 0.35, top - 34, 22, 36);
            this.lampara.setPosition(ancho * 0.65, top - 4);
            this.chimenea = { x: ancho * 0.35 + 11, y: top - 34 };

            // Tolva de reciclaje (derecha): lo que no se agarra vuelve a la máquina.
            g.fillStyle(0x495057, 1);
            g.fillTriangle(L.x1 - 6, L.cintaY - 4, L.w + 30, L.cintaY - 4, L.w + 30, L.suelo + 8);
            g.fillStyle(0x6c757d, 1);
            g.fillRect(L.x1 + 6, L.cintaY - 6, L.w - L.x1, 12);
        },

        onResize: function () {
            this.dibujarEscenario();
            if (this._lastRound) this.ubicarCajas(this._lastRound.destinos);
            this.ubicarObjetos();
        },

        /* ── Ronda ───────────────────────────────────────────── */

        clearBoard: function () {
            var self = this;
            Object.keys(this.objetos).forEach(function (id) {
                var o = self.objetos[id];
                if (o && o.sprite) {
                    self.tweens.killTweensOf(o.sprite);
                    o.sprite.destroy();
                }
            });
            Object.keys(this.destinos).forEach(function (id) {
                var d = self.destinos[id];
                if (d && d.root) d.root.destroy();
            });
            this.objetos = Object.create(null);
            this.destinos = Object.create(null);
            this.dragGo = null;
            this.pausaCinta = 0;
        },

        cargarRonda: function (objetosIds, destinosIds, opciones) {
            var self = this;
            this.clearBoard();
            this._lastRound = { objetos: objetosIds.slice(), destinos: destinosIds.slice() };
            var seg = Number(opciones && opciones.segundosCinta);
            this.segundosCinta = isFinite(seg) && seg > 0 ? seg : 9;

            destinosIds.forEach(function (id, i) {
                self.crearCaja(id, i);
            });
            this.ubicarCajas(destinosIds);

            var L = this.L;
            var n = objetosIds.length;
            // Separación entre objetos sobre la cinta; el ciclo deja un respiro tras el último.
            this.separacion = L.largo / Math.max(n, 1) * 0.8;
            this.ciclo = Math.max(n * this.separacion, L.largo + this.separacion);
            objetosIds.forEach(function (id, i) {
                var spr = self.add.image(0, 0, texKey('obj', id)).setOrigin(0.5).setDepth(Z.objeto);
                spr.setInteractive({ useHandCursor: true, draggable: true });
                spr.setData('objetoId', id);
                self.input.setDraggable(spr);
                spr.setDisplaySize(L.objSize, L.objSize);
                self.objetos[id] = {
                    id: id,
                    sprite: spr,
                    placed: false,
                    estado: 'cinta',
                    // Sin movimiento: quedan repartidos y quietos sobre la cinta.
                    s: movimientoReducido() ? L.largo * (i + 0.5) / n : -i * self.separacion,
                    size: L.objSize,
                    homeX: 0,
                    homeY: L.objY
                };
            });
            this.ubicarObjetos();

            if (!movimientoReducido()) {
                destinosIds.forEach(function (id, i) {
                    var root = self.destinos[id].root;
                    var yFinal = root.y;
                    root.y = L.h + 160;
                    self.tweens.add({
                        targets: root,
                        y: yFinal,
                        duration: 520,
                        delay: i * 90,
                        ease: 'Back.easeOut'
                    });
                });
            }
        },

        crearCaja: function (id, i) {
            var m = metaDest(id);
            var root = this.add.container(0, 0).setDepth(Z.caja);
            var sombra = this.add.ellipse(0, 0, 10, 10, 0x000000, 0.18);
            var dentro = this.add.container(0, 0);
            var img = this.add.image(0, 0, texKey('dest', id)).setOrigin(0.5);
            var placa = this.add.graphics();
            var color = COLORES_CAJA[i % COLORES_CAJA.length];
            var label = this.add.text(0, 0, m.nombre || id, {
                fontFamily: 'Fredoka, Nunito, sans-serif',
                fontStyle: 'bold',
                fontSize: '16px',
                color: '#ffffff',
                align: 'center',
                wordWrap: { width: 160 }
            }).setOrigin(0.5);
            var marca = this.add.container(0, 0);
            var marcaFondo = this.add.circle(0, 0, 18, 0x2f9e44).setStrokeStyle(4, 0xffffff);
            var marcaTxt = this.add.text(0, 0, '✓', {
                fontFamily: 'Fredoka, Nunito, sans-serif', fontStyle: 'bold', fontSize: '22px', color: '#ffffff'
            }).setOrigin(0.5);
            marca.add([marcaFondo, marcaTxt]);
            marca.setVisible(false);
            root.add([sombra, dentro, img, placa, label, marca]);
            this.destinos[id] = {
                id: id,
                root: root,
                sombra: sombra,
                dentro: dentro,
                img: img,
                placa: placa,
                label: label,
                marca: marca,
                color: color,
                lleno: false,
                hitW: 120,
                hitH: 130,
                size: 120
            };
        },

        ubicarCajas: function (destinosIds) {
            var L = this.L;
            var self = this;
            var n = destinosIds.length;
            var izq = L.w * 0.04;
            var der = L.w - Math.max(90, L.w * 0.1);
            var ancho = der - izq;
            var size = limitar(Math.min(ancho / Math.max(n, 1) - 18, (L.h - L.suelo) * 0.62), 84, 190);
            var placaH = limitar(size * 0.24, 30, 44);
            var y = Math.min(L.h - placaH - size * 0.5 - 18, L.suelo + size * 0.5 + 10);
            destinosIds.forEach(function (id, i) {
                var d = self.destinos[id];
                if (!d) return;
                var x = izq + ancho * (i + 0.5) / n;
                d.root.setPosition(x, y);
                d.size = size;
                d.hitW = size * 1.05;
                d.hitH = size * 1.15;
                d.img.setDisplaySize(size, size);
                d.sombra.setPosition(0, size * 0.46).setSize(size * 0.86, size * 0.16);
                d.placa.clear();
                d.placa.fillStyle(d.color, 1);
                d.placa.fillRoundedRect(-size * 0.5, size * 0.5 - 4, size, placaH, placaH / 2);
                d.placa.lineStyle(3, 0xffffff, 1);
                d.placa.strokeRoundedRect(-size * 0.5, size * 0.5 - 4, size, placaH, placaH / 2);
                d.label.setPosition(0, size * 0.5 - 4 + placaH / 2);
                d.label.setStyle({ fontSize: Math.round(limitar(size * 0.105, 12, 19)) + 'px' });
                d.label.setWordWrapWidth(size * 0.92);
                d.marca.setPosition(size * 0.42, -size * 0.32);
                d.dentro.list.forEach(function (o) {
                    o.setDisplaySize(L.objSize * 0.62, L.objSize * 0.62);
                    o.setPosition(0, -size * 0.2);
                });
            });
        },

        /** Coloca cada objeto según su avance por la cinta. */
        ubicarObjetos: function () {
            var L = this.L;
            if (!L) return;
            var self = this;
            var caida = Math.min(60, L.largo * 0.08);
            Object.keys(this.objetos).forEach(function (id) {
                var o = self.objetos[id];
                if (o.estado !== 'cinta' || !o.sprite) return;
                var spr = o.sprite;
                if (o.s < 0) {
                    // Todavía dentro de la máquina.
                    spr.setVisible(false);
                    return;
                }
                spr.setVisible(true);
                var x = L.x0 + o.s;
                var y = L.objY;
                var alfa = 1;
                if (o.s > L.largo - caida) {
                    // Cae a la tolva del final.
                    var t = (o.s - (L.largo - caida)) / caida;
                    y += t * t * L.objSize * 1.4;
                    alfa = 1 - t;
                }
                spr.setPosition(x, y);
                spr.setAlpha(alfa);
                o.homeX = x;
                o.homeY = L.objY;
            });
        },

        update: function (time, delta) {
            var L = this.L;
            if (!L) return;
            var dt = Math.min(delta, 60) / 1000;
            var self = this;

            this.engranajes.forEach(function (e) {
                e.rotation += e.getData('vel') * dt;
            });
            this.lampara.setFillStyle(Math.floor(time / 450) % 2 ? 0x40c057 : 0xffd43b);

            var quieta = movimientoReducido() || this.pausaCinta > 0 || this.dragGo || !this._lastRound;
            var v = quieta ? 0 : L.largo / this.segundosCinta;
            if (v > 0) {
                this.banda.tilePositionX -= v * dt;
                this.rodillos.forEach(function (r) { r.rotation += (v / (L.cintaH / 2 + 4)) * dt; });
                Object.keys(this.objetos).forEach(function (id) {
                    var o = self.objetos[id];
                    if (o.estado !== 'cinta') return;
                    o.s += v * dt;
                    // Al pasar la tolva vuelve a salir de la máquina más tarde.
                    if (o.s > L.largo) o.s -= self.ciclo;
                });
                this.humear(time);
            }
            this.ubicarObjetos();
        },

        humear: function (time) {
            if (!this.chimenea || time - (this._ultHumo || 0) < 700) return;
            this._ultHumo = time;
            var bola = this.add.circle(this.chimenea.x, this.chimenea.y, 9, 0xffffff, 0.85).setDepth(Z.maquina);
            this.tweens.add({
                targets: bola,
                y: this.chimenea.y - 70,
                x: this.chimenea.x + 26,
                scale: 2.4,
                alpha: 0,
                duration: 1600,
                ease: 'Sine.easeOut',
                onComplete: function () { bola.destroy(); }
            });
        },

        /* ── Arrastrar ───────────────────────────────────────── */

        onDragStart: function (pointer, go) {
            var id = go.getData('objetoId');
            var slot = this.objetos[id];
            var fuera = slot && (slot.s < 0 || go.alpha < 0.6);
            if (!slot || slot.placed || slot.estado !== 'cinta' || fuera || !puedeInteractuar()) {
                this._dragBloqueado = go;
                return;
            }
            this._dragBloqueado = null;
            this.dragGo = go;
            slot.estado = 'mano';
            this.tweens.killTweensOf(go);
            go.setAlpha(1).setDepth(Z.vuelo);
            var base = slot.size / go.width;
            this.tweens.add({ targets: go, scaleX: base * 1.15, scaleY: base * 1.15, duration: 120, ease: 'Back.easeOut' });
            avisar('onAgarrar', id, go);
        },

        onDrag: function (pointer, go, dragX, dragY) {
            if (this._dragBloqueado === go) return;
            if (this.dragGo !== go) return;
            go.x = dragX;
            go.y = dragY;
            this.highlightDestinoAt(pointer.x, pointer.y);
            avisar('onMover', go.getData('objetoId'), go, dragX);
        },

        onDragEnd: function (pointer, go) {
            if (this._dragBloqueado === go) {
                this._dragBloqueado = null;
                return;
            }
            if (this.dragGo !== go) return;
            this.dragGo = null;
            this.clearDestinoHighlight();
            var id = go.getData('objetoId');
            var slot = this.objetos[id];
            if (!slot || slot.placed) return;

            var dest = this.destinoEnPunto(pointer.x, pointer.y);
            avisar('onSoltar', id, go, !!dest);
            if (!dest) {
                this.volverALaCinta(slot);
                return;
            }
            this.resolverDrop(slot, dest);
        },

        highlightDestinoAt: function (x, y) {
            var self = this;
            Object.keys(this.destinos).forEach(function (id) {
                var d = self.destinos[id];
                var hit = !d.lleno && self.puntoEnDestino(d, x, y);
                if (hit === !!d.encima) return;
                d.encima = hit;
                // La caja "abre la boca": crece y se ilumina.
                self.tweens.killTweensOf(d.root);
                self.tweens.add({ targets: d.root, scaleX: hit ? 1.12 : 1, scaleY: hit ? 1.12 : 1, duration: 140, ease: 'Back.easeOut' });
                if (hit) d.img.setTint(0xfff3c4);
                else d.img.clearTint();
            });
        },

        clearDestinoHighlight: function () {
            var self = this;
            Object.keys(this.destinos).forEach(function (id) {
                var d = self.destinos[id];
                if (!d.encima) return;
                d.encima = false;
                self.tweens.add({ targets: d.root, scaleX: 1, scaleY: 1, duration: 120 });
                d.img.clearTint();
            });
        },

        puntoEnDestino: function (d, x, y) {
            var hw = d.hitW / 2;
            var hh = d.hitH / 2;
            return x >= d.root.x - hw && x <= d.root.x + hw && y >= d.root.y - hh && y <= d.root.y + hh;
        },

        destinoEnPunto: function (x, y) {
            var ids = Object.keys(this.destinos);
            for (var i = 0; i < ids.length; i++) {
                var d = this.destinos[ids[i]];
                if (!d.lleno && this.puntoEnDestino(d, x, y)) return d;
            }
            return null;
        },

        /** El objeto cae de vuelta a la cinta justo debajo de donde se soltó. */
        volverALaCinta: function (slot) {
            var self = this;
            var L = this.L;
            return new Promise(function (resolve) {
                if (!slot || !slot.sprite) { resolve(); return; }
                var spr = slot.sprite;
                var x = limitar(spr.x, L.x0 + L.objSize * 0.5, L.x1 - L.objSize * 1.2);
                var base = slot.size / spr.width;
                var listo = function () {
                    slot.s = x - L.x0;
                    slot.estado = 'cinta';
                    spr.setDepth(Z.objeto).setScale(base);
                    resolve();
                };
                if (movimientoReducido()) {
                    spr.setPosition(x, L.objY);
                    listo();
                    return;
                }
                slot.estado = 'volando';
                self.tweens.add({
                    targets: spr,
                    x: x,
                    y: L.objY,
                    scaleX: base,
                    scaleY: base,
                    duration: 520,
                    ease: 'Bounce.easeOut',
                    onComplete: listo
                });
            });
        },

        /** Rebote de la caja equivocada: se sacude y escupe el objeto hacia arriba. */
        rechazar: function (slot, dest) {
            var self = this;
            if (dest && dest.root && !movimientoReducido()) {
                var x0 = dest.root.x;
                this.tweens.add({
                    targets: dest.root, x: x0 + 9, duration: 55, yoyo: true, repeat: 3, ease: 'Sine.easeInOut',
                    onComplete: function () { dest.root.x = x0; }
                });
            }
            if (!slot || !slot.sprite) return Promise.resolve();
            if (movimientoReducido()) return this.volverALaCinta(slot);
            slot.estado = 'volando';
            return new Promise(function (resolve) {
                self.tweens.add({
                    targets: slot.sprite,
                    y: slot.sprite.y - 90,
                    angle: 25,
                    duration: 220,
                    ease: 'Quad.easeOut',
                    onComplete: function () {
                        slot.sprite.angle = 0;
                        self.volverALaCinta(slot).then(resolve);
                    }
                });
            });
        },

        /** Lanzamiento en arco hasta dentro de la caja. */
        lanzarACaja: function (slot, dest) {
            var self = this;
            return new Promise(function (resolve) {
                var spr = slot.sprite;
                var x0 = spr.x;
                var y0 = spr.y;
                var x1 = dest.root.x;
                var y1 = dest.root.y - dest.size * 0.2;
                var alto = Math.max(70, (y0 - y1) * 0.4 + 70);
                var base = slot.size / spr.width;
                if (movimientoReducido()) { resolve(); return; }
                slot.estado = 'volando';
                var p = { t: 0 };
                self.tweens.add({
                    targets: p,
                    t: 1,
                    duration: 480,
                    ease: 'Sine.easeIn',
                    onUpdate: function () {
                        var t = p.t;
                        spr.x = x0 + (x1 - x0) * t;
                        spr.y = y0 + (y1 - y0) * t - Math.sin(Math.PI * t) * alto;
                        spr.angle = 360 * t;
                        var s = base * (1.15 - 0.55 * t);
                        spr.setScale(s);
                    },
                    onComplete: function () { resolve(); }
                });
            });
        },

        colocarEnDestino: function (slot, dest) {
            var L = this.L;
            slot.placed = true;
            slot.estado = 'colocado';
            dest.lleno = true;
            slot.sprite.disableInteractive();
            slot.sprite.setVisible(false);

            // El objeto asoma por la boca de la caja.
            var img = this.add.image(0, -dest.size * 0.2, texKey('obj', slot.id)).setOrigin(0.5);
            img.setDisplaySize(L.objSize * 0.62, L.objSize * 0.62);
            dest.dentro.add(img);
            dest.marca.setVisible(true);

            if (!movimientoReducido()) {
                var sx = img.scaleX;
                var sy = img.scaleY;
                img.setScale(sx * 0.3, sy * 0.3);
                this.tweens.add({ targets: img, scaleX: sx, scaleY: sy, duration: 360, ease: 'Back.easeOut' });
                // La caja se aplasta y rebota al recibirlo.
                this.tweens.add({
                    targets: dest.root,
                    scaleX: 1.16,
                    scaleY: 0.86,
                    duration: 110,
                    yoyo: true,
                    ease: 'Quad.easeOut',
                    onComplete: function () { dest.root.setScale(1); }
                });
                dest.marca.setScale(0);
                this.tweens.add({ targets: dest.marca, scale: 1, duration: 380, delay: 120, ease: 'Back.easeOut' });
            }
        },

        resolverDrop: function (slot, dest) {
            var self = this;
            if (busyDrop) {
                this.volverALaCinta(slot);
                return;
            }
            busyDrop = true;
            this.pausaCinta += 1;
            var correcto = destinoCorrecto(slot.id) === dest.id;
            var handler = callbacks.onDrop;

            var terminar = function () {
                busyDrop = false;
                self.pausaCinta = Math.max(0, self.pausaCinta - 1);
            };
            var finish = function (ok) {
                if (ok) {
                    self.lanzarACaja(slot, dest).then(function () {
                        self.colocarEnDestino(slot, dest);
                        terminar();
                    });
                } else {
                    self.rechazar(slot, dest).then(terminar);
                }
            };

            if (typeof handler !== 'function') {
                finish(correcto);
                return;
            }
            // Si es la caja correcta, el lanzamiento arranca ya (no espera al sonido).
            if (correcto) {
                this.lanzarACaja(slot, dest).then(function () {
                    Promise.resolve(handler(slot.id, dest.id, correcto)).then(function (res) {
                        if (res && res.ok === false) {
                            self.volverALaCinta(slot).then(terminar);
                            return;
                        }
                        self.colocarEnDestino(slot, dest);
                        terminar();
                    }, function () {
                        self.volverALaCinta(slot).then(terminar);
                    });
                });
                return;
            }
            // Caja equivocada: la escupe ya, mientras se muestra el aviso.
            var aviso = Promise.resolve(handler(slot.id, dest.id, correcto)).catch(function () {});
            Promise.all([this.rechazar(slot, dest), aviso]).then(terminar);
        },

        /** Demostración: espera a que el objeto avance, lo toma y lo lanza a su caja. */
        demoLlevar: function (objetoId, destinoId) {
            var self = this;
            var L = this.L;
            return new Promise(function (resolve) {
                var slot = self.objetos[objetoId];
                var dest = self.destinos[destinoId];
                if (!slot || !slot.sprite || !dest || !dest.root) { resolve(); return; }
                var tomar = function () {
                    self.pausaCinta += 1;
                    slot.estado = 'mano';
                    var spr = slot.sprite;
                    spr.setAlpha(1).setDepth(Z.vuelo).setVisible(true);
                    var base = slot.size / spr.width;
                    dest.img.setTint(0xfff3c4);
                    self.tweens.add({
                        targets: spr,
                        x: dest.root.x,
                        y: dest.root.y - dest.size * 0.75,
                        scaleX: base * 1.15,
                        scaleY: base * 1.15,
                        duration: movimientoReducido() ? 200 : 1000,
                        ease: 'Cubic.easeInOut',
                        onComplete: function () {
                            self.lanzarACaja(slot, dest).then(function () {
                                dest.img.clearTint();
                                self.colocarEnDestino(slot, dest);
                                self.pausaCinta = Math.max(0, self.pausaCinta - 1);
                                resolve();
                            });
                        }
                    });
                };
                var esperar = function () {
                    if (!self.objetos[objetoId]) { resolve(); return; }
                    if (movimientoReducido() || slot.s > L.largo * 0.3) tomar();
                    else self.time.delayedCall(120, esperar);
                };
                esperar();
            });
        },

        /* ── Fin de ronda y fin del juego ────────────────────── */

        /** Promesa de un tween (o inmediata si no hay movimiento). */
        tween: function (cfg) {
            var self = this;
            return new Promise(function (resolve) {
                if (movimientoReducido()) {
                    Object.keys(cfg).forEach(function (k) {
                        if (typeof cfg[k] === 'string') return;
                        if (['targets', 'duration', 'delay', 'ease', 'yoyo', 'repeat', 'onUpdate'].indexOf(k) < 0) {
                            [].concat(cfg.targets).forEach(function (t) { t[k] = cfg[k]; });
                        }
                    });
                    resolve();
                    return;
                }
                cfg.onComplete = resolve;
                self.tweens.add(cfg);
            });
        },

        /** Cierra una caja: baja las solapas y pega la cinta. */
        cerrarCaja: function (d, retraso) {
            var s = d.size;
            var cerrada = this.add.container(0, 0);
            var cuerpo = this.add.graphics();
            cuerpo.fillStyle(0xc98f55, 1);
            cuerpo.fillRect(-s * 0.42, -s * 0.02, s * 0.84, s * 0.47);
            cuerpo.fillStyle(0xa86f3b, 1);
            cuerpo.fillRect(-s * 0.42, -s * 0.02, s * 0.2, s * 0.47);
            cuerpo.fillStyle(d.color, 1);
            cuerpo.fillRoundedRect(-s * 0.1, s * 0.2, s * 0.32, s * 0.14, 4);
            var solapaI = this.add.rectangle(-s * 0.42, -s * 0.02, s * 0.42, s * 0.1, 0xd9a066).setOrigin(0, 1);
            var solapaD = this.add.rectangle(s * 0.42, -s * 0.02, s * 0.42, s * 0.1, 0xd9a066).setOrigin(1, 1);
            var cinta = this.add.rectangle(0, s * 0.03, s * 0.84, s * 0.07, 0xe9c46a).setOrigin(0.5);
            cinta.scaleX = 0;
            solapaI.angle = 100;
            solapaD.angle = -100;
            cerrada.add([cuerpo, solapaI, solapaD, cinta]);
            cerrada.alpha = 0;
            d.root.add(cerrada);
            d.marca.setVisible(false);
            var self = this;
            var r = retraso || 0;
            return this.tween({ targets: cerrada, alpha: 1, duration: 200, delay: r })
                .then(function () {
                    d.img.setVisible(false);
                    d.dentro.setVisible(false);
                    return Promise.all([
                        self.tween({ targets: solapaI, angle: 0, duration: 260, ease: 'Back.easeOut' }),
                        self.tween({ targets: solapaD, angle: 0, duration: 260, delay: 90, ease: 'Back.easeOut' })
                    ]);
                })
                .then(function () { return self.tween({ targets: cinta, scaleX: 1, duration: 220, ease: 'Quad.easeOut' }); })
                .then(function () {
                    avisar('onCaja', d.id);
                    return self.tween({ targets: d.root, scaleY: 0.9, scaleX: 1.08, duration: 90, yoyo: true });
                })
                .then(function () { d.root.setScale(1); });
        },

        dibujarCamion: function (L) {
            var ancho = limitar(L.w * 0.42, 260, 460);
            var alto = ancho * 0.46;
            var c = this.add.container(0, 0).setDepth(Z.caja + 2);
            var g = this.add.graphics();
            // Carga (atrás, abierta arriba para recibir las cajas).
            g.fillStyle(0x1c7ed6, 1);
            g.fillRoundedRect(-ancho * 0.12, -alto * 0.9, ancho * 0.62, alto * 0.72, 10);
            g.fillStyle(0x1864ab, 1);
            g.fillRect(-ancho * 0.12, -alto * 0.9, ancho * 0.62, alto * 0.08);
            g.fillStyle(0xffffff, 1);
            g.fillRoundedRect(ancho * 0.02, -alto * 0.66, ancho * 0.34, alto * 0.22, 8);
            // Cabina (adelante, a la izquierda: avanza hacia allá).
            g.fillStyle(0xf03e3e, 1);
            g.fillRoundedRect(-ancho * 0.5, -alto * 0.62, ancho * 0.36, alto * 0.44, { tl: 30, tr: 8, bl: 6, br: 6 });
            g.fillStyle(0xd0ebff, 1);
            g.fillRoundedRect(-ancho * 0.44, -alto * 0.56, ancho * 0.16, alto * 0.16, 8);
            g.fillStyle(0xffd43b, 1);
            g.fillCircle(-ancho * 0.49, -alto * 0.28, 7);
            // Chasis.
            g.fillStyle(0x343a40, 1);
            g.fillRect(-ancho * 0.5, -alto * 0.2, ancho, alto * 0.08);
            c.add(g);
            var texto = this.add.text(ancho * 0.19, -alto * 0.55, 'PEDNIA', {
                fontFamily: 'Fredoka, Nunito, sans-serif', fontStyle: 'bold', fontSize: Math.round(ancho * 0.06) + 'px', color: '#1c7ed6'
            }).setOrigin(0.5);
            c.add(texto);
            var ruedas = [];
            var self = this;
            [-ancho * 0.34, ancho * 0.08, ancho * 0.36].forEach(function (x) {
                var r = self.add.graphics();
                var rad = alto * 0.13;
                r.fillStyle(0x212529, 1);
                r.fillCircle(0, 0, rad);
                r.fillStyle(0xadb5bd, 1);
                r.fillCircle(0, 0, rad * 0.45);
                r.fillStyle(0x212529, 1);
                r.fillRect(-rad * 0.08, -rad * 0.45, rad * 0.16, rad * 0.9);
                r.setPosition(x, -alto * 0.1);
                c.add(r);
                ruedas.push(r);
            });
            c.setData('ancho', ancho);
            c.setData('alto', alto);
            c.setData('ruedas', ruedas);
            c.setData('carga', { x: ancho * 0.19, y: -alto * 0.95 });
            return c;
        },

        moverCamion: function (camion, x, ms, ease) {
            var self = this;
            var ruedas = camion.getData('ruedas');
            var giro = (camion.x - x) / (camion.getData('alto') * 0.13);
            var humo = this.time.addEvent({
                delay: 160,
                loop: true,
                callback: function () {
                    var b = self.add.circle(camion.x + camion.getData('ancho') * 0.52, camion.y - 18, 8, 0xced4da, 0.8)
                        .setDepth(Z.caja + 1);
                    self.tweens.add({ targets: b, y: b.y - 40, scale: 2.2, alpha: 0, duration: 800, onComplete: function () { b.destroy(); } });
                }
            });
            return Promise.all([
                this.tween({ targets: camion, x: x, duration: ms, ease: ease }),
                this.tween({ targets: ruedas, angle: '-=' + Math.round(giro * 57), duration: ms, ease: ease })
            ]).then(function () { humo.remove(); });
        },

        /**
         * Despacha el pedido: cierra las cajas llenas y, si es el final, llega un
         * camión que se las lleva. Si no, las cajas salen por abajo.
         */
        cerrarPedido: function (final) {
            var self = this;
            var L = this.L;
            this.pausaCinta += 1;
            this.finalizando = true;
            this.lampara.setFillStyle(0x40c057);
            var cajas = Object.keys(this.destinos).map(function (id) { return self.destinos[id]; });
            var llenas = cajas.filter(function (d) { return d.lleno; });
            var vacias = cajas.filter(function (d) { return !d.lleno; });

            // Las cajas que no se usaron se retiran primero.
            vacias.forEach(function (d) {
                self.tween({ targets: d.root, y: L.h + d.size, alpha: 0, duration: 380, ease: 'Back.easeIn' });
            });

            var cierre = Promise.all(llenas.map(function (d, i) { return self.cerrarCaja(d, i * 220); }));

            if (!final) {
                return cierre.then(function () {
                    return Promise.all(llenas.map(function (d, i) {
                        return self.tween({ targets: d.root, y: L.h + d.size * 1.4, duration: 420, delay: 120 + i * 90, ease: 'Back.easeIn' });
                    }));
                }).then(function () {
                    self.pausaCinta = Math.max(0, self.pausaCinta - 1);
                    self.finalizando = false;
                });
            }

            var camion = this.dibujarCamion(L);
            var ancho = camion.getData('ancho');
            camion.setPosition(L.w + ancho, L.h - 14);
            var paradaX = L.w * 0.5;
            return cierre
                .then(function () { return self.moverCamion(camion, paradaX, movimientoReducido() ? 0 : 1300, 'Cubic.easeOut'); })
                .then(function () {
                    var carga = camion.getData('carga');
                    var destX = paradaX + carga.x;
                    var destY = camion.y + carga.y;
                    // Cada caja salta a la carga del camión.
                    return llenas.reduce(function (p, d, i) {
                        return p.then(function () {
                            var x0 = d.root.x;
                            var y0 = d.root.y;
                            var alto = Math.max(90, y0 - destY + 90);
                            var t = { v: 0 };
                            d.root.setDepth(Z.vuelo);
                            avisar('onCaja', d.id);
                            return self.tween({
                                targets: t,
                                v: 1,
                                duration: 520,
                                ease: 'Sine.easeInOut',
                                onUpdate: function () {
                                    d.root.x = x0 + (destX - x0) * t.v;
                                    d.root.y = y0 + (destY - y0) * t.v - Math.sin(Math.PI * t.v) * alto;
                                    d.root.setScale(1 - 0.55 * t.v);
                                }
                            }).then(function () {
                                d.root.setVisible(false);
                                var mini = self.add.rectangle(carga.x - ancho * 0.18 + (i % 3) * ancho * 0.14, carga.y + 6 - Math.floor(i / 3) * 16,
                                    ancho * 0.12, ancho * 0.08, 0xc98f55).setStrokeStyle(2, 0xa86f3b);
                                camion.add(mini);
                                return self.tween({ targets: camion, y: camion.y + 6, duration: 90, yoyo: true });
                            });
                        });
                    }, Promise.resolve());
                })
                .then(function () { return self.tween({ targets: { v: 0 }, v: 1, duration: 350 }); })
                .then(function () { return self.moverCamion(camion, -ancho, movimientoReducido() ? 0 : 1500, 'Cubic.easeIn'); })
                .then(function () {
                    camion.destroy();
                    self.pausaCinta = Math.max(0, self.pausaCinta - 1);
                });
        },

        cancelarDrag: function () {
            if (!this.dragGo) return;
            var go = this.dragGo;
            this.dragGo = null;
            this.clearDestinoHighlight();
            var slot = this.objetos[go.getData('objetoId')];
            if (slot) this.volverALaCinta(slot);
        },

        rectPantalla: function (tipo, id) {
            if (tipo === 'objeto') {
                var o = this.objetos[id];
                return o && o.sprite ? boundsToScreen(this, o.sprite) : null;
            }
            if (tipo === 'destino') {
                var d = this.destinos[id];
                return d && d.img ? boundsToScreen(this, d.img) : null;
            }
            return null;
        }
    });

    function esperarEscena() {
        if (sceneRef) return Promise.resolve(sceneRef);
        if (!readyPromise) {
            readyPromise = new Promise(function (resolve) {
                readyResolve = resolve;
            });
        }
        return readyPromise.then(function () { return sceneRef; });
    }

    function montar(opts) {
        opts = opts || {};
        Host = global.PedniaPhaserHost;
        Phaser = global.Phaser;
        if (!Phaser) return Promise.reject(new Error('Phaser no cargado'));
        if (!Host) return Promise.reject(new Error('PedniaPhaserHost no cargado'));

        gameConfig = opts.gameConfig || opts.config || null;
        callbacks = opts.callbacks || {};
        assetsLoaded = false;
        busyDrop = false;
        readyPromise = new Promise(function (resolve) {
            readyResolve = resolve;
        });

        var parentId = opts.parent || 'phaser-juego';
        var el = typeof parentId === 'string' ? document.getElementById(parentId) : parentId;
        if (!el) return Promise.reject(new Error('Falta #' + parentId));

        var w = Math.max(320, el.clientWidth || 800);
        var h = Math.max(240, el.clientHeight || 450);

        Host.destruirIntro();

        game = Host.crear({
            type: Phaser.AUTO,
            parent: el,
            width: w,
            height: h,
            backgroundColor: '#00000000',
            transparent: true,
            audio: { noAudio: true },
            scene: [EscenaArrastre],
            scale: {
                mode: Phaser.Scale.RESIZE,
                autoCenter: Phaser.Scale.CENTER_BOTH
            }
        });

        if (!game) return Promise.reject(new Error('No se pudo crear Phaser.Game'));
        return esperarEscena();
    }

    function listo() {
        return !!(game && sceneRef);
    }

    function cargarRonda(objetosIds, destinosIds, opciones) {
        return esperarEscena().then(function (scene) {
            scene.cargarRonda(objetosIds || [], destinosIds || [], opciones || {});
        });
    }

    function setInteractivo(on) {
        if (!sceneRef) return;
        Object.keys(sceneRef.objetos).forEach(function (id) {
            var slot = sceneRef.objetos[id];
            if (!slot || !slot.sprite || slot.placed) return;
            if (on) {
                slot.sprite.setInteractive({ useHandCursor: true, draggable: true });
                sceneRef.input.setDraggable(slot.sprite);
            } else {
                slot.sprite.disableInteractive();
            }
        });
    }

    function cancelarDrag() {
        if (sceneRef) sceneRef.cancelarDrag();
    }

    function demoLlevar(objetoId, destinoId) {
        return esperarEscena().then(function (scene) {
            return scene.demoLlevar(objetoId, destinoId);
        });
    }

    function rectPantalla(tipo, id) {
        if (!sceneRef) return null;
        return sceneRef.rectPantalla(tipo, id);
    }

    /** Cierra las cajas; con final=true llega el camión y se las lleva. */
    function cerrarPedido(final) {
        return esperarEscena().then(function (scene) {
            return scene.cerrarPedido(!!final);
        });
    }

    function destruir() {
        busyDrop = false;
        sceneRef = null;
        readyPromise = null;
        readyResolve = null;
        assetsLoaded = false;
        game = null;
        if (Host) Host.destruirJuego();
        else if (global.PedniaPhaserHost) global.PedniaPhaserHost.destruirJuego();
    }

    global.PedniaArrastrePhaser = {
        montar: montar,
        listo: listo,
        cargarRonda: cargarRonda,
        setInteractivo: setInteractivo,
        cancelarDrag: cancelarDrag,
        demoLlevar: demoLlevar,
        rectPantalla: rectPantalla,
        cerrarPedido: cerrarPedido,
        destruir: destruir
    };
})(typeof window !== 'undefined' ? window : this);
