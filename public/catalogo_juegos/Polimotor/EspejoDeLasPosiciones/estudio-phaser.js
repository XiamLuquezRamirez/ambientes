/**
 * EstudioPhaser — escena Phaser 4 del estudio (window.EstudioPhaser).
 *
 * Lienzo transparente a pantalla completa (#est-phaser, z 0, sin eventos) entre el SVG del estudio
 * y el juego. Dibuja motas de luz que flotan frente a los espejos y tres haces de luz suaves que
 * reaccionan: pulso(color) al acertar, fiesta(true) en el final, brillo(x, y) en un punto.
 * Si Phaser no está o el usuario pidió menos movimiento, todo queda en no-op.
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser || null;
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var juego = null;
    var escena = null;
    var haces = [];
    var motas = null;
    var chispas = null;
    var enFiesta = false;
    var pendientes = [];

    var COLORES_FIESTA = [0xff8787, 0xffe066, 0x8ce99a, 0x74c0fc, 0xe599f7];

    function texturaMota(sc) {
        if (sc.textures.exists("est-mota")) return;
        var s = 32;
        var c = document.createElement("canvas");
        c.width = s;
        c.height = s;
        var ctx = c.getContext("2d");
        var g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(0.35, "rgba(255,250,220,0.8)");
        g.addColorStop(1, "rgba(255,250,220,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, s, s);
        sc.textures.addCanvas("est-mota", c);
    }

    function texturaEstrella(sc) {
        if (sc.textures.exists("est-estrella")) return;
        var s = 32;
        var c = document.createElement("canvas");
        c.width = s;
        c.height = s;
        var ctx = c.getContext("2d");
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
        sc.textures.addCanvas("est-estrella", c);
    }

    function crearHaces(sc) {
        haces.forEach(function (h) { h.destroy(); });
        haces = [];
        var w = sc.scale.width;
        var h = sc.scale.height;
        [0.18, 0.5, 0.82].forEach(function (fx, i) {
            var g = sc.add.graphics({ x: w * fx, y: -10 });
            g.fillStyle(0xfff6d5, 1);
            g.fillTriangle(-18, 0, 18, 0, h * 0.28, h * 1.05);
            g.fillTriangle(-18, 0, -h * 0.28, h * 1.05, h * 0.28, h * 1.05);
            g.setAlpha(0.07);
            g.setBlendMode(Phaser.BlendModes.ADD);
            g.angle = (i - 1) * 6;
            sc.tweens.add({
                targets: g,
                angle: { from: g.angle - 7, to: g.angle + 7 },
                duration: 5200 + i * 900,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            });
            haces.push(g);
        });
    }

    function crearMotas(sc) {
        if (motas) motas.destroy();
        var w = sc.scale.width;
        var h = sc.scale.height;
        motas = sc.add.particles(0, 0, "est-mota", {
            x: { min: 0, max: w },
            y: { min: h * 0.2, max: h * 1.02 },
            lifespan: { min: 5000, max: 9000 },
            speedY: { min: -26, max: -8 },
            speedX: { min: -10, max: 10 },
            scale: { start: 0.35, end: 0.1 },
            alpha: { start: 0.55, end: 0 },
            frequency: 380,
            quantity: 1,
            blendMode: "ADD"
        });
        motas.setDepth(1);
    }

    function crearChispas(sc) {
        if (chispas) chispas.destroy();
        chispas = sc.add.particles(0, 0, "est-estrella", {
            speed: { min: 90, max: 260 },
            angle: { min: 0, max: 360 },
            lifespan: { min: 450, max: 900 },
            scale: { start: 0.7, end: 0 },
            alpha: { start: 1, end: 0 },
            rotate: { min: -180, max: 180 },
            emitting: false,
            blendMode: "ADD"
        });
        chispas.setDepth(3);
    }

    function crearEscena() {
        return {
            key: "EstudioEspejo",
            create: function () {
                escena = this;
                texturaMota(this);
                texturaEstrella(this);
                crearHaces(this);
                crearMotas(this);
                crearChispas(this);
                this.scale.on("resize", function () {
                    crearHaces(escena);
                    crearMotas(escena);
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
            global.__estudioPhaser = juego;
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

    function pulso(color) {
        cuandoListo(function () {
            haces.forEach(function (g) {
                escena.tweens.killTweensOf(g, ["alpha"]);
                g.setAlpha(0.22);
                if (g.setTint) g.setTint(color || 0xffffff);
                escena.tweens.add({ targets: g, alpha: enFiesta ? 0.16 : 0.07, duration: 900, ease: "Quad.easeOut" });
            });
        });
    }

    function fiesta(on) {
        enFiesta = !!on;
        cuandoListo(function () {
            haces.forEach(function (g, i) {
                g.setAlpha(enFiesta ? 0.16 : 0.07);
            });
            if (enFiesta) {
                var paso = 0;
                escena.time.addEvent({
                    delay: 420,
                    loop: true,
                    callback: function () {
                        if (!enFiesta) return;
                        paso++;
                        var w = escena.scale.width;
                        brillo((paso * 397) % w, 40 + (paso * 131) % Math.max(1, escena.scale.height * 0.5), COLORES_FIESTA[paso % COLORES_FIESTA.length], 8);
                    }
                });
            }
        });
    }

    function destruir() {
        if (juego) {
            try { juego.destroy(true); } catch (e) { /* noop */ }
        }
        juego = null;
        escena = null;
        haces = [];
        motas = null;
        chispas = null;
    }

    global.EstudioPhaser = {
        iniciar: iniciar,
        brillo: brillo,
        pulso: pulso,
        fiesta: fiesta,
        destruir: destruir,
        listo: function () { return !!escena; }
    };
})(window);
