/**
 * EstadioPhaser — escena Phaser 4 del Estadio de Atletismo Mágico (window.EstadioPhaser).
 *
 * Lienzo transparente a pantalla completa (#est-phaser, z 0, sin eventos) entre el SVG del estadio
 * y el juego. Dibuja chispas de energía que suben desde la pista y reacciona:
 *   brillo(x, y, color, n)  estallido de estrellas en un punto de la pantalla.
 *   energia(x, y, color)    anillo de energía que se expande (al encajar una pieza).
 *   destello(color)         la pantalla parpadea suave (luces del estadio).
 *   confeti(rect)           lluvia de confeti sobre un rectángulo.
 *   fiesta(on)              fuegos de colores periódicos (final).
 * Si Phaser no está o el usuario pidió menos movimiento, todo queda en no-op.
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser || null;
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var juego = null;
    var escena = null;
    var motas = null;
    var chispas = null;
    var papelitos = null;
    var velo = null;
    var enFiesta = false;
    var evFiesta = null;
    var pendientes = [];

    var COLORES = [0x7cf3ff, 0xff6ec7, 0xffe066, 0x8ce99a, 0xb197fc, 0xffa94d];

    function textura(sc, clave, dibujar, s) {
        if (sc.textures.exists(clave)) return;
        var c = document.createElement("canvas");
        c.width = s;
        c.height = s;
        dibujar(c.getContext("2d"), s);
        sc.textures.addCanvas(clave, c);
    }

    function texturas(sc) {
        textura(sc, "est-mota", function (ctx, s) {
            var g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
            g.addColorStop(0, "rgba(255,255,255,1)");
            g.addColorStop(0.35, "rgba(200,250,255,0.8)");
            g.addColorStop(1, "rgba(200,250,255,0)");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, s, s);
        }, 32);
        textura(sc, "est-estrella", function (ctx, s) {
            ctx.translate(s / 2, s / 2);
            ctx.beginPath();
            for (var i = 0; i < 8; i++) {
                var r = i % 2 === 0 ? s * 0.48 : s * 0.12;
                var a = -Math.PI / 2 + i * Math.PI / 4;
                ctx[i === 0 ? "moveTo" : "lineTo"](Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fillStyle = "#ffffff";
            ctx.fill();
        }, 32);
        textura(sc, "est-papel", function (ctx, s) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(s * 0.2, s * 0.05, s * 0.6, s * 0.9);
        }, 16);
    }

    function crearMotas(sc) {
        if (motas) motas.destroy();
        var w = sc.scale.width;
        var h = sc.scale.height;
        motas = sc.add.particles(0, 0, "est-mota", {
            x: { min: 0, max: w },
            y: { min: h * 0.55, max: h * 1.02 },
            lifespan: { min: 4000, max: 8000 },
            speedY: { min: -40, max: -12 },
            speedX: { min: -12, max: 12 },
            scale: { start: 0.32, end: 0.06 },
            alpha: { start: 0.6, end: 0 },
            tint: [0x7cf3ff, 0xff6ec7, 0xffe066],
            frequency: 300,
            quantity: 1,
            blendMode: "ADD"
        });
        motas.setDepth(1);
    }

    function crearEmisores(sc) {
        if (chispas) chispas.destroy();
        chispas = sc.add.particles(0, 0, "est-estrella", {
            speed: { min: 110, max: 300 },
            angle: { min: 0, max: 360 },
            lifespan: { min: 450, max: 950 },
            scale: { start: 0.75, end: 0 },
            alpha: { start: 1, end: 0 },
            rotate: { min: -180, max: 180 },
            emitting: false,
            blendMode: "ADD"
        });
        chispas.setDepth(3);
        if (papelitos) papelitos.destroy();
        papelitos = sc.add.particles(0, 0, "est-papel", {
            speedY: { min: 120, max: 260 },
            speedX: { min: -80, max: 80 },
            lifespan: { min: 1800, max: 3200 },
            scale: { min: 0.6, max: 1.2 },
            rotate: { start: 0, end: 540 },
            gravityY: 60,
            tint: COLORES,
            emitting: false
        });
        papelitos.setDepth(4);
        if (velo) velo.destroy();
        velo = sc.add.rectangle(0, 0, sc.scale.width, sc.scale.height, 0xffffff, 1).setOrigin(0, 0);
        velo.setAlpha(0);
        velo.setBlendMode(Phaser.BlendModes.ADD);
        velo.setDepth(0);
    }

    function crearEscena() {
        return {
            key: "EstadioMagico",
            create: function () {
                escena = this;
                texturas(this);
                crearMotas(this);
                crearEmisores(this);
                this.scale.on("resize", function () {
                    crearMotas(escena);
                    if (velo) velo.setSize(escena.scale.width, escena.scale.height);
                });
                pendientes.splice(0).forEach(function (fn) { try { fn(); } catch (e) { /* noop */ } });
            }
        };
    }

    function iniciar() {
        if (juego || !Phaser || reducido) return;
        var cont = document.getElementById("est-phaser");
        if (!cont) return;
        try {
            juego = new Phaser.Game({
                type: Phaser.AUTO,
                parent: cont,
                transparent: true,
                width: global.innerWidth,
                height: global.innerHeight,
                banner: false,
                audio: { noAudio: true },
                input: { keyboard: false, mouse: false, touch: false, gamepad: false },
                fps: { target: 30, limit: 30 },
                scale: { mode: Phaser.Scale.RESIZE },
                scene: crearEscena()
            });
            global.__estadioPhaser = juego;
        } catch (e) {
            juego = null;
        }
    }

    function cuandoListo(fn) {
        if (escena) fn();
        else if (juego) pendientes.push(fn);
    }

    function brillo(x, y, color, n) {
        cuandoListo(function () {
            if (!chispas) return;
            chispas.setParticleTint(color || 0xffffff);
            chispas.explode(n || 14, x, y);
        });
    }

    function energia(x, y, color) {
        cuandoListo(function () {
            var aro = escena.add.circle(x, y, 12);
            aro.setStrokeStyle(6, color || 0x7cf3ff, 1);
            aro.setBlendMode(Phaser.BlendModes.ADD);
            aro.setDepth(2);
            escena.tweens.add({
                targets: aro,
                scale: 6,
                alpha: 0,
                duration: 650,
                ease: "Cubic.easeOut",
                onComplete: function () { aro.destroy(); }
            });
            brillo(x, y, color || 0x7cf3ff, 16);
        });
    }

    function destello(color, fuerza) {
        cuandoListo(function () {
            if (!velo) return;
            escena.tweens.killTweensOf(velo);
            velo.setFillStyle(color || 0xffffff, 1);
            velo.setAlpha(fuerza || 0.14);
            escena.tweens.add({ targets: velo, alpha: 0, duration: 700, ease: "Quad.easeOut" });
        });
    }

    function confeti(rect) {
        cuandoListo(function () {
            if (!papelitos) return;
            var r = rect || { left: 0, top: 0, width: escena.scale.width, height: escena.scale.height };
            for (var i = 0; i < 6; i++) {
                papelitos.explode(10, r.left + (r.width * (i + 0.5)) / 6, Math.max(0, r.top - 30));
            }
        });
    }

    function fiesta(on) {
        enFiesta = !!on;
        cuandoListo(function () {
            if (evFiesta) {
                evFiesta.remove(false);
                evFiesta = null;
            }
            if (!enFiesta) return;
            var paso = 0;
            evFiesta = escena.time.addEvent({
                delay: 380,
                loop: true,
                callback: function () {
                    if (!enFiesta) return;
                    paso++;
                    var w = escena.scale.width;
                    var h = escena.scale.height;
                    brillo((paso * 397) % w, 40 + (paso * 131) % Math.max(1, h * 0.45), COLORES[paso % COLORES.length], 10);
                }
            });
        });
    }

    function destruir() {
        if (juego) {
            try { juego.destroy(true); } catch (e) { /* noop */ }
        }
        juego = null;
        escena = null;
        motas = null;
        chispas = null;
        papelitos = null;
        velo = null;
    }

    global.EstadioPhaser = {
        iniciar: iniciar,
        brillo: brillo,
        energia: energia,
        destello: destello,
        confeti: confeti,
        fiesta: fiesta,
        destruir: destruir,
        listo: function () { return !!escena; }
    };
})(window);
