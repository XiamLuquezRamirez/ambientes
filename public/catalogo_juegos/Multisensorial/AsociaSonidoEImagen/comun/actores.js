/**
 * AsociaActores — cada objeto del juego armado por piezas (ruedas, manecillas, aspas, hojas,
 * brazos…) para que su animación de acierto sea la acción real del objeto.
 *
 *   var a = AsociaActores.crear(scene, 'bicicleta', x, y, tam, { variante })
 *   a.cont (Container), a.sonido (estímulo de sfx.js), a.actualizar(time, dt),
 *   a.acierto(ms) → Promise (la acción completa), a.sacudir() → Promise, a.contiene(x, y),
 *   a.animarIdle(si) (movimiento de reposo), a.destruir()
 */
(function (global) {
    'use strict';
    var A = global.PedniaArte;

    var SONIDO = {
        bicicleta: 'timbre', telefono: 'telefono', reloj: 'despertador', avion: 'avion', tren: 'tren',
        ambulancia: 'sirena', aspiradora: 'aspiradora', puerta: 'puerta', aplaudiendo: 'aplausos',
        pluma: 'grifo', vaca: 'mugido', gallo: 'gallo'
    };

    function U() { return global.PedniaParejaBase.util; }
    function esperar(scene, ms) { return new Promise(function (r) { scene.time.delayedCall(ms, r); }); }
    function tw(scene, cfg) {
        return new Promise(function (r) {
            var fin = cfg.onComplete;
            cfg.onComplete = function () { if (fin) fin.apply(this, arguments); r(); };
            scene.tweens.add(cfg);
        });
    }
    function resol(px) { return px > 220 ? 512 : (px > 90 ? 256 : 128); }

    /* ── Efectos sueltos ──────────────────────────────────────── */

    /** Anillos que se expanden (sonido saliendo de un punto). */
    function anillos(scene, x, y, o) {
        o = o || {};
        var n = o.n || 3;
        for (var i = 0; i < n; i++) {
            var c = scene.add.circle(x, y, o.r || 16).setStrokeStyle(o.grosor || 4, o.color || 0xffffff, 0.9).setDepth(o.depth || 45);
            c.isFilled = false;
            scene.tweens.add({
                targets: c, scale: o.escala || 3.4, alpha: 0, delay: i * (o.paso || 220), duration: o.ms || 900, ease: 'Sine.easeOut',
                onComplete: function () { this.targets[0].destroy(); }
            });
        }
    }

    /** Arcos de "ring" a los lados de un objeto que suena. */
    function vibraciones(scene, cont, ux, uy, k, color) {
        [-1, 1].forEach(function (lado) {
            for (var i = 0; i < 2; i++) {
                var g = scene.add.graphics().setDepth(cont.depth + 1);
                g.lineStyle(Math.max(3, k * 2.2), color || 0xfab005, 1);
                g.beginPath();
                g.arc(0, 0, (14 + i * 8) * k, lado > 0 ? -0.6 : Math.PI - 0.6, lado > 0 ? 0.6 : Math.PI + 0.6);
                g.strokePath();
                g.setPosition(cont.x + (ux - 50) * k * cont.scale, cont.y + (uy - 50) * k * cont.scale);
                g.alpha = 0;
                scene.tweens.add({
                    targets: g, alpha: { from: 1, to: 0 }, scale: { from: 0.7, to: 1.3 }, delay: i * 120, duration: 520, repeat: 3,
                    onComplete: function () { this.targets[0].destroy(); }
                });
            }
        });
    }

    function humo(scene, x, y, o) {
        o = o || {};
        var p = scene.add.image(x, y, A.textura(scene, 'humo', 64)).setDepth(o.depth || 30).setTint(o.tinte || 0xf1f3f5);
        var t = (o.tam || 30) * (0.8 + Math.random() * 0.4);
        p.setDisplaySize(t, t).setAlpha(o.alpha || 0.9);
        scene.tweens.add({
            targets: p, x: x + (o.dx != null ? o.dx : -20 + Math.random() * 10), y: y + (o.dy != null ? o.dy : -50),
            scale: p.scale * (o.crece || 2.4), alpha: 0, duration: o.ms || 1100, ease: 'Sine.easeOut',
            onComplete: function () { p.destroy(); }
        });
    }

    function gotas(scene, x, y, o) {
        o = o || {};
        for (var i = 0; i < (o.n || 3); i++) {
            var t = (o.tam || 10) * (0.7 + Math.random() * 0.6);
            var d = scene.add.image(x + (Math.random() - 0.5) * (o.ancho || 8), y, A.textura(scene, 'gota', 64)).setDisplaySize(t * 0.75, t).setDepth(o.depth || 40);
            scene.tweens.add({
                targets: d, y: y + (o.caida || 60) * (0.8 + Math.random() * 0.4), x: d.x + (o.dx || 0) * Math.random(),
                alpha: { from: 1, to: o.alphaFin != null ? o.alphaFin : 0.2 }, duration: (o.ms || 420) * (0.8 + Math.random() * 0.4), ease: 'Quad.easeIn',
                onComplete: function () { this.targets[0].destroy(); }
            });
        }
    }

    /* ── Armazón de un actor ──────────────────────────────────── */

    function base(scene, id, x, y, tam) {
        var k = tam / 100;
        var a = {
            id: id, scene: scene, tam: tam, k: k,
            cont: scene.add.container(x, y),
            sonido: SONIDO[id] || id,
            ruedas: [],
            ultX: x,
            idle: true,
            ocupado: false
        };
        a.u = function (v) { return (v - 50) * k; };
        /** Imagen en coordenadas del lienzo de 100 u: centro (ux, uy), tamaño us (y alto usy opcional). */
        a.img = function (tex, ux, uy, us, o) {
            o = o || {};
            var w = us * k;
            var h = (o.alto || us) * k;
            var im = scene.add.image(a.u(ux), a.u(uy), A.textura(scene, tex, resol(Math.max(w, h)))).setDisplaySize(w, h);
            if (o.ox != null) im.setOrigin(o.ox, o.oy != null ? o.oy : 0.5);
            if (o.tinte) im.setTint(o.tinte);
            a.cont.add(im);
            return im;
        };
        a.rueda = function (tex, ux, uy, us) {
            var r = a.img(tex, ux, uy, us);
            r.radio = us * k * 0.47;
            a.ruedas.push(r);
            return r;
        };
        a.mundo = function (ux, uy) {
            return { x: a.cont.x + a.u(ux) * a.cont.scaleX, y: a.cont.y + a.u(uy) * a.cont.scaleY };
        };
        a.contiene = function (px, py) {
            var s = Math.abs(a.cont.scaleY);
            return a.cont.visible && a.cont.alpha > 0.4 && Math.abs(px - a.cont.x) < tam * 0.48 * s && Math.abs(py - a.cont.y) < tam * 0.48 * s;
        };
        a.alActualizar = null;
        a.actualizar = function (time, dt) {
            var dx = a.cont.x - a.ultX;
            a.ultX = a.cont.x;
            a.ruedas.forEach(function (r) { r.rotation += dx / Math.max(4, r.radio * a.cont.scaleX); });
            if (a.alActualizar) a.alActualizar(time, dt || 16);
        };
        a.sacudir = function () {
            var x0 = a.cont.x;
            scene.tweens.killTweensOf(a.cont);
            a.cont.x = x0;
            return tw(scene, { targets: a.cont, x: x0 + tam * 0.06, angle: 4, duration: 70, yoyo: true, repeat: 3, ease: 'Sine.easeInOut' })
                .then(function () { a.cont.x = x0; a.cont.angle = 0; });
        };
        /** Salto genérico de alegría. */
        a.saltito = function (alto, veces) {
            var y0 = a.cont.y;
            return tw(scene, { targets: a.cont, y: y0 - tam * (alto || 0.12), duration: 200, yoyo: true, repeat: (veces || 1) - 1, ease: 'Quad.easeOut' })
                .then(function () { a.cont.y = y0; });
        };
        /** Sale de su sitio, recorre y vuelve (para vehículos): dx en px, ms total. */
        a.paseo = function (dx, ms, dy) {
            var x0 = a.cont.x;
            var y0 = a.cont.y;
            return tw(scene, { targets: a.cont, x: x0 + dx, y: y0 + (dy || 0), duration: ms / 2, ease: 'Sine.easeInOut' })
                .then(function () { return tw(scene, { targets: a.cont, x: x0, y: y0, duration: ms / 2, ease: 'Sine.easeInOut' }); });
        };
        a.destruir = function () { a.cont.destroy(); };
        a.acierto = function () { return a.saltito(0.14, 2); };
        return a;
    }

    /* ── Cada objeto ──────────────────────────────────────────── */

    var FABRICAS = {
        bicicleta: function (a, scene) {
            a.rueda('rueda_rayos', 24, 66, 40);
            a.rueda('rueda_rayos', 76, 66, 40);
            a.img('bicicleta', 50, 50, 100);
            a.acierto = async function (ms) {
                var t = a.tam;
                vibraciones(scene, a.cont, 58, 20, a.k, 0xfab005);
                // Caballito y paseo: sale andando hacia adelante y regresa.
                await tw(scene, { targets: a.cont, angle: -12, duration: 260, ease: 'Quad.easeOut' });
                await tw(scene, { targets: a.cont, x: a.cont.x + t * 0.55, duration: 520, ease: 'Sine.easeIn' });
                a.cont.angle = 0;
                vibraciones(scene, a.cont, 58, 20, a.k, 0xfab005);
                await tw(scene, { targets: a.cont, scaleX: -a.cont.scaleX, duration: 160 });
                await tw(scene, { targets: a.cont, x: a.cont.x - t * 0.55, duration: 640, ease: 'Sine.easeInOut' });
                await tw(scene, { targets: a.cont, scaleX: Math.abs(a.cont.scaleX), duration: 160 });
                await esperar(scene, Math.max(0, (ms || 0) - 1740));
            };
        },
        telefono: function (a, scene, o) {
            if (o.variante === 'movil') {
                a.cuerpo = a.img('movil', 50, 50, 92);
                a.acierto = async function (ms) {
                    var fin = scene.time.now + Math.max(1600, ms || 0);
                    while (scene.time.now < fin) {
                        anillos(scene, a.cont.x, a.cont.y, { r: a.tam * 0.2, color: 0x9775fa, n: 1, escala: 2.6, ms: 600 });
                        await tw(scene, { targets: a.cuerpo, x: a.u(50) + a.k * 3, angle: 4, duration: 40, yoyo: true, repeat: 5 });
                        a.cuerpo.x = a.u(50);
                        a.cuerpo.angle = 0;
                        await esperar(scene, 140);
                    }
                };
                return;
            }
            a.base = a.img('telefono_base', 50, 52, 100);
            a.auricular = a.img('telefono_auricular', 50, 30, 74);
            a.luz = scene.add.circle(a.u(76), a.u(80), 6 * a.k, 0xfff3bf, 0).setBlendMode(Phaser.BlendModes.ADD);
            a.cont.add(a.luz);
            a.acierto = async function (ms) {
                var fin = scene.time.now + Math.max(1800, ms || 0);
                var y0 = a.auricular.y;
                while (scene.time.now < fin) {
                    vibraciones(scene, a.cont, 50, 30, a.k, 0xfa5252);
                    a.luz.setFillStyle(0xfff3bf, 0.95);
                    await tw(scene, { targets: a.auricular, y: y0 - 10 * a.k, angle: { from: -7, to: 7 }, duration: 55, yoyo: true, repeat: 6 });
                    a.auricular.y = y0;
                    a.auricular.angle = 0;
                    a.luz.setFillStyle(0xfff3bf, 0);
                    await esperar(scene, 260);
                }
            };
        },
        reloj: function (a, scene) {
            a.martillo = a.img('martillo', 50, 40, 52, { ox: 0.5, oy: 0.7 });
            a.img('reloj_cuerpo', 50, 50, 100);
            a.hora = a.img('manecilla_h', 50, 54, 100, { ox: 0.5, oy: 0.52 });
            a.min = a.img('manecilla_m', 50, 54, 100, { ox: 0.5, oy: 0.52 });
            a.hora.angle = 300;
            a.min.angle = 60;
            a.acierto = async function (ms) {
                var dur = Math.max(1800, ms || 0);
                // Las manecillas corren, el martillo golpea las campanas y el reloj brinca.
                scene.tweens.add({ targets: a.min, angle: a.min.angle + 720, duration: dur, ease: 'Sine.easeInOut' });
                scene.tweens.add({ targets: a.hora, angle: a.hora.angle + 60, duration: dur, ease: 'Sine.easeInOut' });
                scene.tweens.add({ targets: a.martillo, angle: { from: -24, to: 24 }, duration: 45, yoyo: true, repeat: Math.round(dur / 90) });
                var fin = scene.time.now + dur;
                var y0 = a.cont.y;
                while (scene.time.now < fin) {
                    vibraciones(scene, a.cont, 50, 20, a.k, 0xfcc419);
                    await tw(scene, { targets: a.cont, y: y0 - a.tam * 0.05, angle: { from: -5, to: 5 }, duration: 60, yoyo: true, repeat: 3 });
                    a.cont.y = y0;
                    a.cont.angle = 0;
                }
                a.martillo.angle = 0;
            };
        },
        avion: function (a, scene) {
            a.cuerpo = a.img('avion', 50, 50, 100);
            a.alActualizar = function () {
                if (a.estela && scene.time.now > (a.ultHumo || 0)) {
                    a.ultHumo = scene.time.now + 50;
                    var p = a.mundo(8, 52);
                    humo(scene, p.x, p.y, { tam: a.tam * 0.16, dx: -a.tam * 0.1, dy: 4, crece: 2, ms: 900, depth: a.cont.depth - 1 });
                }
            };
            a.acierto = async function (ms) {
                var x0 = a.cont.x;
                var y0 = a.cont.y;
                var w = scene.scale.width;
                // Carretea, despega en diagonal y sale de la pantalla; luego aterriza en su sitio.
                await tw(scene, { targets: a.cont, x: x0 + a.tam * 0.25, duration: 500, ease: 'Quad.easeIn' });
                a.estela = true;
                await tw(scene, { targets: a.cont, angle: -16, duration: 220 });
                await tw(scene, { targets: a.cont, x: w + a.tam, y: y0 - a.tam * 1.6, scale: a.cont.scale * 0.6, duration: 1100, ease: 'Quad.easeIn' });
                a.estela = false;
                a.cont.setPosition(-a.tam, y0 - a.tam * 1.2);
                a.cont.angle = 10;
                await tw(scene, { targets: a.cont, x: x0, y: y0, scale: a.cont.scale / 0.6, angle: 0, duration: 1100, ease: 'Sine.easeOut' });
                a.cont.setPosition(x0, y0);
                await esperar(scene, Math.max(0, (ms || 0) - 2900));
            };
        },
        tren: function (a, scene) {
            a.vagon = a.img('vagon', -42, 56, 86);
            a.vagon.visible = false;
            a.rv1 = a.rueda('rueda_tren', -70, 76, 18);
            a.rv2 = a.rueda('rueda_tren', -14, 76, 18);
            a.rv1.visible = a.rv2.visible = false;
            a.rueda('rueda_tren', 22, 74, 24);
            a.rueda('rueda_tren', 50, 76, 19);
            a.rueda('rueda_tren', 72, 76, 19);
            a.img('locomotora', 50, 50, 100);
            a.alActualizar = function () {
                if (a.echaHumo && scene.time.now > (a.ultHumo || 0)) {
                    a.ultHumo = scene.time.now + 160;
                    var p = a.mundo(67, 16);
                    humo(scene, p.x, p.y, { tam: a.tam * 0.18, dx: -a.tam * 0.25, dy: -a.tam * 0.35, depth: a.cont.depth + 1 });
                }
            };
            a.acierto = async function (ms) {
                var x0 = a.cont.x;
                var w = scene.scale.width;
                a.echaHumo = true;
                a.vagon.visible = a.rv1.visible = a.rv2.visible = true;
                // Avanza por toda la pantalla con su vagón y vuelve a entrar por la izquierda.
                await tw(scene, { targets: a.cont, x: w + a.tam * 1.2, duration: 1500, ease: 'Sine.easeIn' });
                a.cont.x = -a.tam * 0.6;
                await tw(scene, { targets: a.cont, x: x0, duration: 1300, ease: 'Sine.easeOut' });
                a.vagon.visible = a.rv1.visible = a.rv2.visible = false;
                a.echaHumo = false;
                await esperar(scene, Math.max(0, (ms || 0) - 2800));
            };
            a.animarIdle = function () {};
        },
        ambulancia: function (a, scene) {
            a.rueda('rueda', 24, 72, 22);
            a.rueda('rueda', 80, 72, 22);
            a.img('ambulancia', 50, 50, 100);
            a.roja = a.img('baliza_roja', 33, 19, 11);
            a.azul = a.img('baliza_azul', 45, 19, 11);
            a.halo1 = scene.add.circle(a.u(33), a.u(19), 16 * a.k, 0xff4d4d, 0).setBlendMode(Phaser.BlendModes.ADD);
            a.halo2 = scene.add.circle(a.u(45), a.u(19), 16 * a.k, 0x339af0, 0).setBlendMode(Phaser.BlendModes.ADD);
            a.cont.add([a.halo1, a.halo2]);
            a.roja.setAlpha(0.6);
            a.azul.setAlpha(0.6);
            a.acierto = async function (ms) {
                var dur = Math.max(2000, ms || 0);
                // Luces de emergencia girando y avance corto con frenada.
                var ev = scene.time.addEvent({
                    delay: 130, loop: true, callback: function () {
                        var on = (scene.time.now / 130 | 0) % 2;
                        a.halo1.setFillStyle(0xff4d4d, on ? 0.75 : 0);
                        a.halo2.setFillStyle(0x339af0, on ? 0 : 0.75);
                        a.roja.setAlpha(on ? 1 : 0.5);
                        a.azul.setAlpha(on ? 0.5 : 1);
                        a.halo1.setScale(on ? 1.4 : 1);
                        a.halo2.setScale(on ? 1 : 1.4);
                    }
                });
                await a.paseo(a.tam * 0.35, Math.min(dur, 1800));
                await esperar(scene, Math.max(0, dur - 1800));
                ev.remove();
                a.halo1.setFillStyle(0xff4d4d, 0);
                a.halo2.setFillStyle(0x339af0, 0);
                a.roja.setAlpha(0.6);
                a.azul.setAlpha(0.6);
            };
        },
        camion: function (a, scene) {
            a.rueda('rueda', 20, 72, 22);
            a.rueda('rueda', 56, 72, 22);
            a.rueda('rueda', 84, 72, 22);
            a.img('camion', 50, 50, 100);
            a.acierto = async function (ms) {
                vibraciones(scene, a.cont, 96, 52, a.k, 0x868e96);
                var ev = scene.time.addEvent({ delay: 140, loop: true, callback: function () { var p = a.mundo(4, 66); humo(scene, p.x, p.y, { tam: a.tam * 0.12, tinte: 0x868e96, dx: -a.tam * 0.15, dy: -10, depth: a.cont.depth - 1 }); } });
                await a.paseo(a.tam * 0.4, Math.max(1800, ms || 0));
                ev.remove();
            };
        },
        motocicleta: function (a, scene) {
            a.rueda('rueda_rayos', 22, 68, 38);
            a.rueda('rueda_rayos', 78, 68, 38);
            a.img('motocicleta', 50, 50, 100);
            a.acierto = async function (ms) {
                var ev = scene.time.addEvent({ delay: 90, loop: true, callback: function () { var p = a.mundo(10, 58); humo(scene, p.x, p.y, { tam: a.tam * 0.1, tinte: 0xadb5bd, dx: -a.tam * 0.2, dy: -6, ms: 700, depth: a.cont.depth - 1 }); } });
                // Acelera, levanta la rueda delantera (caballito) y regresa.
                await tw(scene, { targets: a.cont, angle: -18, x: a.cont.x + a.tam * 0.3, duration: 600, ease: 'Quad.easeOut' });
                await tw(scene, { targets: a.cont, angle: 0, x: a.cont.x + a.tam * 0.1, duration: 300, ease: 'Bounce.easeOut' });
                await tw(scene, { targets: a.cont, x: a.cont.x - a.tam * 0.4, duration: 800, ease: 'Sine.easeInOut' });
                ev.remove();
                await esperar(scene, Math.max(0, (ms || 0) - 1700));
            };
        },
        aspiradora: function (a, scene) {
            a.rueda('rueda', 32, 83, 9);
            a.rueda('rueda', 72, 83, 9);
            a.img('aspiradora', 50, 50, 100);
            a.acierto = async function (ms) {
                var dur = Math.max(2200, ms || 0);
                var suelo = a.mundo(50, 88).y;
                // Bolitas de polvo en el piso que la aspiradora se traga al pasar.
                var polvos = [];
                for (var i = 0; i < 7; i++) {
                    var px = a.cont.x + (i - 3) * a.tam * 0.22;
                    var d = scene.add.circle(px, suelo - 4, a.tam * (0.025 + Math.random() * 0.02), 0x8d8d8d, 0.85).setDepth(a.cont.depth - 1);
                    polvos.push(d);
                }
                var x0 = a.cont.x;
                var ev = scene.time.addEvent({
                    delay: 30, loop: true, callback: function () {
                        polvos.forEach(function (d) {
                            if (!d.active) return;
                            if (Math.abs(d.x - a.cont.x) < a.tam * 0.25) {
                                var boca = a.mundo(50, 76);
                                scene.tweens.add({ targets: d, x: boca.x, y: boca.y, scale: 0.1, duration: 160, onComplete: function () { d.destroy(); } });
                                U().estallido(scene, d.x, d.y, { n: 3, tex: 'burbuja', tam: 16, dist: 50, ms: 700, sinTinte: true });
                            }
                        });
                    }
                });
                await tw(scene, { targets: a.cont, x: x0 - a.tam * 0.7, angle: -6, duration: dur * 0.3, ease: 'Sine.easeInOut' });
                await tw(scene, { targets: a.cont, x: x0 + a.tam * 0.7, angle: 6, duration: dur * 0.45, ease: 'Sine.easeInOut' });
                await tw(scene, { targets: a.cont, x: x0, angle: 0, duration: dur * 0.25, ease: 'Sine.easeInOut' });
                ev.remove();
                polvos.forEach(function (d) { if (d.active) d.destroy(); });
                // Piso brillante: destellos de limpieza.
                U().estallido(scene, a.cont.x, suelo - a.tam * 0.05, { n: 10, tex: 'chispa', tam: 22, dist: a.tam * 0.6, angulo: -Math.PI / 2, abanico: Math.PI, colores: [0xffffff, 0xe3fafc, 0x99e9f2] });
            };
        },
        secador: function (a, scene) {
            a.cuerpo = a.img('secador', 50, 50, 100);
            a.acierto = async function (ms) {
                var dur = Math.max(1800, ms || 0);
                var ev = scene.time.addEvent({
                    delay: 40, loop: true, callback: function () {
                        // Chorro de aire caliente: rayas que salen de la boquilla y se abren.
                        var p = a.mundo(92, 46);
                        var dy = (Math.random() - 0.5) * a.tam * 0.16;
                        var col = Math.random() < 0.5 ? 0xffc9c9 : 0xd0ebff;
                        var l = scene.add.rectangle(p.x, p.y + dy, a.tam * 0.2, Math.max(3, a.k * 2.4), col, 0.95).setOrigin(0, 0.5).setDepth(a.cont.depth + 1);
                        scene.tweens.add({ targets: l, x: p.x + a.tam * 0.7, y: p.y + dy * 2.2, scaleX: 1.8, alpha: 0, duration: 460, onComplete: function () { l.destroy(); } });
                    }
                });
                await tw(scene, { targets: a.cuerpo, x: a.u(50) + a.k * 1.5, duration: 35, yoyo: true, repeat: Math.round(dur / 70) });
                ev.remove();
                a.cuerpo.x = a.u(50);
            };
        },
        licuadora: function (a, scene) {
            a.vaso = a.img('licuadora_vaso', 50, 54, 64);
            a.img('licuadora_base', 50, 50, 100);
            a.remolino = scene.add.graphics();
            a.cont.add(a.remolino);
            a.alActualizar = function (time) {
                a.remolino.clear();
                if (!a.moliendo) return;
                var cx = a.vaso.x;
                var cy = a.vaso.y + a.k * 2;
                for (var i = 0; i < 3; i++) {
                    a.remolino.lineStyle(a.k * 1.8, 0xffffff, 0.7);
                    a.remolino.beginPath();
                    var r = (6 + i * 4) * a.k;
                    var a0 = time / 90 + i * 2;
                    a.remolino.arc(cx, cy, r, a0, a0 + 2.2);
                    a.remolino.strokePath();
                }
            };
            a.acierto = async function (ms) {
                var dur = Math.max(1800, ms || 0);
                a.moliendo = true;
                await tw(scene, { targets: a.vaso, x: a.vaso.x + a.k * 1.6, angle: 2, duration: 40, yoyo: true, repeat: Math.round(dur / 80) });
                a.vaso.x = a.u(50);
                a.vaso.angle = 0;
                a.moliendo = false;
            };
        },
        ventilador: function (a, scene) {
            a.img('ventilador_base', 50, 50, 100);
            a.aspas = a.img('aspas', 50, 42, 70);
            a.img('ventilador_rejilla', 50, 42, 76);
            a.vel = 0.4;
            a.alActualizar = function (t, dt) { a.aspas.rotation += a.vel * dt / 1000 * Math.PI * 2; };
            a.acierto = async function (ms) {
                var dur = Math.max(1800, ms || 0);
                scene.tweens.add({ targets: a, vel: 5, duration: 500 });
                var ev = scene.time.addEvent({
                    delay: 90, loop: true, callback: function () {
                        var p = a.mundo(50 + (Math.random() - 0.5) * 50, 42 + (Math.random() - 0.5) * 50);
                        var l = scene.add.rectangle(p.x, p.y, a.tam * 0.14, 3, 0xd0ebff, 0.9).setDepth(a.cont.depth + 1);
                        scene.tweens.add({ targets: l, x: p.x + a.tam * 0.55, alpha: 0, scaleX: 2, duration: 500, onComplete: function () { l.destroy(); } });
                    }
                });
                await esperar(scene, dur);
                ev.remove();
                scene.tweens.add({ targets: a, vel: 0.4, duration: 900 });
            };
        },
        puerta: function (a, scene) {
            a.img('puerta_marco', 50, 50, 100);
            a.luz = scene.add.rectangle(a.u(50), a.u(50), 56 * a.k, 88 * a.k, 0xfff3bf, 0).setBlendMode(Phaser.BlendModes.ADD);
            a.cont.add(a.luz);
            a.hoja = a.img('puerta_hoja', 22, 50, 100, { ox: 0.22 });
            a.acierto = async function (ms) {
                var sx = a.hoja.scaleX;
                // Se abre girando en la bisagra y entra luz; luego se cierra despacio.
                scene.tweens.add({ targets: a.luz, fillAlpha: 0.45, duration: 700 });
                await tw(scene, { targets: a.hoja, scaleX: sx * 0.16, duration: 900, ease: 'Sine.easeInOut' });
                U().estallido(scene, a.cont.x, a.cont.y, { n: 8, tex: 'chispa', tam: 20, dist: a.tam * 0.5, colores: [0xfff3bf, 0xffe066] });
                await esperar(scene, Math.max(700, (ms || 0) - 1800));
                scene.tweens.add({ targets: a.luz, fillAlpha: 0, duration: 700 });
                await tw(scene, { targets: a.hoja, scaleX: sx, duration: 800, ease: 'Sine.easeInOut' });
            };
        },
        ventana: function (a, scene) {
            a.img('ventana_marco', 50, 50, 100);
            a.h1 = a.img('ventana_hoja', 31, 46, 38, { alto: 66 });
            a.h2 = a.img('ventana_hoja', 69, 46, 38, { alto: 66 });
            a.acierto = async function (ms) {
                var x0 = a.h2.x;
                await tw(scene, { targets: a.h2, x: a.u(35), duration: 900, ease: 'Sine.easeInOut' });
                // Entra la brisa: hojitas que pasan.
                for (var i = 0; i < 4; i++) {
                    var p = a.mundo(70, 30 + i * 10);
                    var h = scene.add.image(p.x, p.y, A.textura(scene, 'chispa', 64)).setTint(0x69db7c).setDisplaySize(a.tam * 0.08, a.tam * 0.08).setDepth(a.cont.depth + 1);
                    scene.tweens.add({ targets: h, x: p.x - a.tam * 0.6, y: p.y + 20, angle: 300, alpha: 0, delay: i * 120, duration: 900, onComplete: function () { this.targets[0].destroy(); } });
                }
                await esperar(scene, Math.max(500, (ms || 0) - 1700));
                await tw(scene, { targets: a.h2, x: x0, duration: 800, ease: 'Sine.easeInOut' });
            };
        },
        cajon: function (a, scene) {
            a.img('comoda', 50, 50, 100);
            a.interior = a.img('cajon_interior', 50, 38, 68, { alto: 40 });
            a.interior.visible = false;
            a.frente = a.img('cajon', 50, 40, 70, { alto: 44 });
            a.acierto = async function (ms) {
                var y0 = a.frente.y;
                var s0 = a.frente.scaleX;
                a.interior.visible = true;
                a.interior.y = a.u(38);
                // El cajón sale hacia el niño (crece y baja) y deja ver lo que guarda.
                scene.tweens.add({ targets: a.interior, y: a.u(30), duration: 600, ease: 'Back.easeOut' });
                await tw(scene, { targets: a.frente, y: y0 + a.k * 14, scaleX: s0 * 1.14, scaleY: a.frente.scaleY * 1.14, duration: 600, ease: 'Back.easeOut' });
                await esperar(scene, Math.max(700, (ms || 0) - 1300));
                scene.tweens.add({ targets: a.interior, y: a.u(38), duration: 500 });
                await tw(scene, { targets: a.frente, y: y0, scaleX: s0, scaleY: a.frente.scaleY / 1.14, duration: 500, ease: 'Quad.easeIn' });
                a.interior.visible = false;
            };
        },
        pluma: function (a, scene) {
            a.img('lavamanos', 50, 50, 100);
            a.manija = a.img('manija', 50, 32, 22);
            a.agua = scene.add.graphics();
            a.cont.add(a.agua);
            a.nivel = 0;
            a.alActualizar = function (time) {
                a.agua.clear();
                if (a.nivel > 0) {
                    a.agua.fillStyle(0x74c0fc, 0.7);
                    a.agua.fillEllipse(a.u(50), a.u(66), 60 * a.k * a.nivel, 8 * a.k * a.nivel);
                }
                if (!a.abierta) return;
                // Chorro que ondula al caer.
                var x = a.u(73);
                var y0 = a.u(50);
                var y1 = a.u(64);
                a.agua.fillStyle(0x4dabf7, 0.85);
                for (var y = y0; y < y1; y += 2) {
                    var ancho = a.k * (5 + Math.sin(time / 40 + y) * 0.8);
                    a.agua.fillRect(x - ancho / 2, y, ancho, 2.2);
                }
                a.agua.fillStyle(0xffffff, 0.6);
                a.agua.fillRect(x - a.k * 0.6, y0, a.k * 0.9, y1 - y0);
            };
            a.acierto = async function (ms) {
                var dur = Math.max(2200, ms || 0);
                await tw(scene, { targets: a.manija, angle: 90, duration: 400, ease: 'Back.easeOut' });
                a.abierta = true;
                scene.tweens.add({ targets: a, nivel: 1, duration: dur });
                var ev = scene.time.addEvent({ delay: 110, loop: true, callback: function () { var p = a.mundo(73, 64); gotas(scene, p.x, p.y, { n: 2, tam: a.tam * 0.05, caida: -a.tam * 0.06, dx: a.tam * 0.1, ms: 300, depth: a.cont.depth + 1 }); } });
                await esperar(scene, dur);
                ev.remove();
                a.abierta = false;
                await tw(scene, { targets: a.manija, angle: 0, duration: 400 });
                scene.tweens.add({ targets: a, nivel: 0, duration: 900 });
            };
        },
        ducha: function (a, scene) {
            a.img('ducha', 50, 50, 100);
            a.lluvia = scene.add.graphics();
            a.cont.add(a.lluvia);
            a.caudal = 0;
            a.alActualizar = function (time) {
                var g = a.lluvia;
                g.clear();
                if (a.caudal <= 0.01) return;
                // Cortina de gotas que sale en cono de la regadera y cae al plato.
                var n = Math.round(64 * a.caudal);
                for (var i = 0; i < n; i++) {
                    var fase = ((time / 520) + i * 0.137) % 1;
                    var abre = (i % 9 - 4) / 4;
                    var x = a.u(47 + abre * (4 + fase * 16));
                    var y = a.u(30 + fase * 56);
                    g.lineStyle(a.k * 1.8, 0x339af0, 0.9 * a.caudal);
                    g.lineBetween(x, y, x - abre * a.k, y + a.k * 4);
                }
                g.fillStyle(0xa5d8ff, 0.5 * a.caudal);
                g.fillEllipse(a.u(46), a.u(88), 34 * a.k, 4 * a.k * (1 + Math.sin(time / 90) * 0.2));
            };
            a.acierto = async function (ms) {
                var dur = Math.max(1800, ms || 0);
                await tw(scene, { targets: a, caudal: 1, duration: 300 });
                var pato = a.mundo(22, 82);
                var ev = scene.time.addEvent({ delay: 260, loop: true, callback: function () { U().estallido(scene, pato.x + (Math.random() - 0.5) * a.tam * 0.3, a.mundo(0, 86).y, { n: 2, tex: 'gota', tam: a.tam * 0.04, dist: a.tam * 0.06, sinTinte: true, ms: 400 }); } });
                await esperar(scene, dur - 300);
                ev.remove();
                await tw(scene, { targets: a, caudal: 0, duration: 400 });
            };
        },
        fuente: function (a, scene) {
            a.img('fuente_piedra', 50, 50, 100);
            a.chorros = scene.add.graphics();
            a.cont.add(a.chorros);
            a.fuerza = 0.25;
            a.alActualizar = function (time) {
                var g = a.chorros;
                g.clear();
                var f = a.fuerza;
                var cx = a.u(50);
                var top = a.u(26);
                // Chorro central y dos arcos que caen a la pileta.
                g.fillStyle(0x74c0fc, 0.85);
                var alto = (8 + 18 * f) * a.k * (1 + Math.sin(time / 120) * 0.08);
                g.fillEllipse(cx, top - alto / 2, 4 * a.k, alto);
                [-1, 1].forEach(function (s) {
                    for (var i = 0; i <= 12; i++) {
                        var t = i / 12;
                        var x = cx + s * t * 34 * a.k * (0.6 + f * 0.4);
                        var y = top - alto * 0.8 + (t * t * 1.6 - t * 0.7) * 40 * a.k;
                        g.fillCircle(x, y, a.k * (1.6 + f));
                    }
                });
            };
            a.acierto = async function (ms) {
                var dur = Math.max(1800, ms || 0);
                await tw(scene, { targets: a, fuerza: 1, duration: 500 });
                var ev = scene.time.addEvent({ delay: 90, loop: true, callback: function () { var s = Math.random() < 0.5 ? -1 : 1; var p = a.mundo(50 + s * 34, 76); U().estallido(scene, p.x, p.y, { n: 2, tex: 'gota', tam: a.tam * 0.05, dist: a.tam * 0.1, sinTinte: true, ms: 500 }); } });
                await esperar(scene, dur - 500);
                ev.remove();
                scene.tweens.add({ targets: a, fuerza: 0.25, duration: 700 });
            };
        },
        lavadora: function (a, scene) {
            a.img('lavadora', 50, 50, 100);
            // Ropa girando dentro del ojo de buey, con el reflejo del vidrio encima.
            a.ropa = a.img('ropa_girando', 50, 58, 42);
            var vidrio = scene.add.ellipse(a.u(43), a.u(51), 14 * a.k, 7 * a.k, 0xffffff, 0.35).setAngle(-40);
            a.cont.add(vidrio);
            a.vel = 0.15;
            a.alActualizar = function (t, dt) { a.ropa.rotation += a.vel * dt / 1000 * Math.PI * 2; };
            a.acierto = async function (ms) {
                var dur = Math.max(2000, ms || 0);
                scene.tweens.add({ targets: a, vel: 2.4, duration: 600 });
                var x0 = a.cont.x;
                var ev = scene.time.addEvent({ delay: 160, loop: true, callback: function () { var p = a.mundo(50 + (Math.random() - 0.5) * 30, 58); U().estallido(scene, p.x, p.y, { n: 2, tex: 'burbuja', tam: a.tam * 0.08, dist: a.tam * 0.3, angulo: -Math.PI / 2, abanico: 1.4, sinTinte: true, ms: 900 }); } });
                await tw(scene, { targets: a.cont, x: x0 + a.k * 1.6, duration: 50, yoyo: true, repeat: Math.round(dur / 100) });
                a.cont.x = x0;
                ev.remove();
                scene.tweens.add({ targets: a, vel: 0.15, duration: 900 });
            };
        },
        regadera: function (a, scene) {
            a.flor = a.img('flor', 84, 78, 30);
            a.rega = a.img('regadera', 40, 52, 78);
            a.acierto = async function (ms) {
                var dur = Math.max(1800, ms || 0);
                await tw(scene, { targets: a.rega, angle: 28, duration: 400, ease: 'Sine.easeOut' });
                var ev = scene.time.addEvent({
                    delay: 50, loop: true, callback: function () {
                        var p = a.mundo(77, 54);
                        gotas(scene, p.x, p.y, { n: 2, tam: a.tam * 0.04, caida: a.tam * 0.2, ancho: a.tam * 0.08, dx: a.tam * 0.04, ms: 380, depth: a.cont.depth + 1 });
                    }
                });
                // La flor crece contenta con el agua.
                scene.tweens.add({ targets: a.flor, scaleX: a.flor.scaleX * 1.25, scaleY: a.flor.scaleY * 1.25, angle: { from: -6, to: 6 }, duration: 400, yoyo: true, repeat: Math.round(dur / 800) });
                await esperar(scene, dur);
                ev.remove();
                await tw(scene, { targets: a.rega, angle: 0, duration: 400 });
            };
        },
        vaca: function (a, scene) {
            a.img('vaca', 50, 52, 96);
            a.acierto = function () { return a.saltito(0.12, 2); };
        },
        gallo: function (a, scene) {
            a.img('gallo', 50, 50, 92);
            a.acierto = function () { return a.saltito(0.14, 2); };
        }
    };

    /* ── Personas ─────────────────────────────────────────────── */

    function nino(a, scene, cx, cy, esc, ropa, cabeza) {
        var p = {};
        var s = esc;
        var cont = scene.add.container(a.u(cx), a.u(cy));
        a.cont.add(cont);
        var add = function (tex, ux, uy, us, ox, oy) {
            var w = us * a.k * s;
            var im = scene.add.image(ux * a.k * s, uy * a.k * s, A.textura(scene, tex, resol(w))).setDisplaySize(w, w);
            if (ox != null) im.setOrigin(ox, oy);
            cont.add(im);
            return im;
        };
        p.pi = add('pierna', -7, 16, 30, 0.5, 0.04);
        p.pd = add('pierna', 7, 16, 30, 0.5, 0.04);
        p.bi = add('brazo_' + ropa, -15, -12, 30, 0.5, 0.06);
        p.torso = add('torso_' + ropa, 0, 0, 36);
        p.bd = add('brazo_' + ropa, 15, -12, 30, 0.5, 0.06);
        p.cabeza = add(cabeza, 0, -26, 40);
        p.ojos = add('ojos', 0, -26, 40);
        p.cont = cont;
        p.y0 = cont.y;
        cont.sendToBack(p.bi);
        cont.sendToBack(p.pi);
        cont.sendToBack(p.pd);
        p.parpadear = function () {
            scene.tweens.add({ targets: p.ojos, scaleY: p.ojos.scaleY * 0.1, duration: 70, yoyo: true });
        };
        return p;
    }

    /* ── Personas con los modelos 3D del proyecto (personajes3d.js) ── */

    function hay3D() {
        return !!(global.AsociaPj3D || global.document.querySelector('script[src*="personajes3d"]'));
    }

    /**
     * Personaje 3D que sigue al contenedor del actor: (ux, uy) es el centro de su caja en el
     * lienzo de 100 u y `alto` su estatura en u. Se crea cuando la capa 3D termina de cargar.
     */
    function pj3d(a, modelo, ux, uy, alto, o) {
        var r = { modelo: modelo, ux: ux, uy: uy, alto: alto, o: o || {}, inst: null, clipActual: (o && o.clip) || 'Quieto', vel: 1 };
        r.clip = function (nombre, vel) {
            r.clipActual = nombre;
            r.vel = vel || 1;
            if (r.inst) r.inst.clip(nombre, { vel: r.vel });
        };
        a.pjs = a.pjs || [];
        a.pjs.push(r);
        return r;
    }

    function seguirPjs(a) {
        if (!a.pjs) return;
        var c = a.cont;
        var vivo = c.active && c.visible && c.alpha > 0.35 && Math.abs(c.scaleY) > 0.2;
        var padre = c.parentContainer;
        a.pjs.forEach(function (r) {
            if (!r.inst && global.AsociaPj3D) {
                r.inst = global.AsociaPj3D.crear(r.modelo, { alto: r.alto * a.k, clip: r.clipActual, mira: r.o.mira, tumbado: r.o.tumbado });
                r.inst.clip(r.clipActual, { vel: r.vel });
            }
            if (!r.inst) return;
            var sx = c.scaleX, sy = c.scaleY;
            var x = c.x + a.u(r.ux) * sx;
            var y = c.y + a.u(r.uy) * sy;
            if (padre) { x += padre.x; y += padre.y; }
            r.inst.ubicar(x, y);
            r.inst.escala(Math.abs(sy) * (r.pulso || 1));
            if (r.o.mira) r.inst.mirar(sx < 0 ? (r.o.mira === 'derecha' ? 'izquierda' : 'derecha') : r.o.mira);
            r.inst.vel = r.vel;
            r.inst.visible(vivo);
        });
    }

    function destruirPjs(a) {
        (a.pjs || []).forEach(function (r) { if (r.inst) r.inst.destruir(); });
        a.pjs = [];
    }

    var PERSONAS3D = {
        aplaudiendo: function (a, scene) {
            // Zeus y Zoe aplaudiendo (clip Aplaudir del GLB).
            a.duo = [pj3d(a, 'nino', 31, 50, 92, { clip: 'Aplaudir' }), pj3d(a, 'nina', 69, 50, 92, { clip: 'Aplaudir' })];
            a.acierto = async function (ms) {
                var dur = Math.max(1800, ms || 0);
                a.duo.forEach(function (r) { r.clip('Aplaudir', 1.7); });
                var ev = scene.time.addEvent({
                    delay: 260, loop: true, callback: function () {
                        [31, 69].forEach(function (ux) {
                            var p = a.mundo(ux, 36);
                            U().estallido(scene, p.x, p.y, { n: 3, tex: 'chispa', tam: a.tam * 0.07, dist: a.tam * 0.14, ms: 420, colores: [0xfff3bf, 0xffd43b] });
                        });
                    }
                });
                await esperar(scene, dur);
                ev.remove();
                a.duo.forEach(function (r) { r.clip('Aplaudir', 1); });
            };
        },
        corriendo: function (a, scene) {
            // Zeus corriendo de lado con líneas de velocidad detrás.
            a.lineas = scene.add.graphics();
            a.cont.add(a.lineas);
            a.pj = pj3d(a, 'nino', 54, 50, 96, { clip: 'Correr', mira: 'derecha' });
            a.vel = 1;
            a.alActualizar = function (t) {
                if (a.festejo) {
                    if (a.pj.clipActual !== 'Celebrar') a.pj.clip('Celebrar', 1);
                    a.lineas.clear();
                    return;
                }
                var corre = a.vel > 0.3;
                if (corre && a.pj.clipActual !== 'Correr') a.pj.clip('Correr', 1);
                if (!corre && a.pj.clipActual !== 'Quieto') a.pj.clip('Quieto', 1);
                if (corre) a.pj.vel = Math.min(1.8, 0.8 + a.vel * 0.4);
                var g = a.lineas;
                g.clear();
                if (!corre) return;
                [[-26, 26, 0], [-8, 20, 1.3], [12, 24, 2.6]].forEach(function (l) {
                    var d = ((t / (a.vel > 1 ? 4 : 9) + l[2] * 40) % 40) * a.k * 0.2;
                    g.lineStyle(a.k * 2, 0x868e96, 0.55);
                    g.lineBetween(a.u(14) - d, a.u(50 + l[0]), a.u(14 + l[1]) - d, a.u(50 + l[0]));
                });
            };
            a.acierto = async function (ms) {
                var dur = Math.max(1800, ms || 0);
                a.vel = 2;
                var x0 = a.cont.x;
                var ev = scene.time.addEvent({ delay: 160, loop: true, callback: function () { var p = a.mundo(40, 94); humo(scene, p.x, p.y, { tam: a.tam * 0.1, tinte: 0xd9b48f, dx: -a.tam * 0.12, dy: -6, ms: 600, depth: a.cont.depth - 1 }); } });
                await tw(scene, { targets: a.cont, x: x0 + a.tam * 0.45, duration: dur * 0.4, ease: 'Sine.easeInOut' });
                a.cont.scaleX *= -1;
                await tw(scene, { targets: a.cont, x: x0, duration: dur * 0.4, ease: 'Sine.easeInOut' });
                a.cont.scaleX *= -1;
                await esperar(scene, dur * 0.2);
                ev.remove();
                a.vel = 1;
            };
        },
        saltando: function (a, scene) {
            // Zoe saltando (clip Saltar), con su sombra en el piso.
            a.sombra = scene.add.ellipse(a.u(50), a.u(96), 36 * a.k, 7 * a.k, 0x000000, 0.18);
            a.cont.add(a.sombra);
            a.pj = pj3d(a, 'nina', 50, 50, 96, { clip: 'Saltar' });
            a.alActualizar = function (t) { a.sombra.setScale(0.8 + Math.sin(t / 260) * 0.15); };
            a.acierto = async function (ms) {
                a.pj.clip('Saltar', 1.6);
                await esperar(scene, Math.max(1840, ms || 0));
                a.pj.clip('Saltar', 1);
            };
        },
        durmiendo: function (a, scene) {
            // Zeus acostado en la cama, roncando.
            a.img('cama', 50, 56, 100);
            a.pj = pj3d(a, 'nino', 44, 47, 62, { clip: 'Quieto', tumbado: true });
            a.zzz = [];
            a.fuerte = false;
            a.alActualizar = function (t) {
                a.pj.pulso = 1 + Math.sin(t / (a.fuerte ? 260 : 700)) * 0.02;
                if (t > (a.ultZ || 0) && a.cont.visible && a.cont.alpha > 0.5 && a.cont.scale > 0.5) {
                    a.ultZ = t + (a.fuerte ? 380 : 1500);
                    var p = a.mundo(22, 30);
                    var z = scene.add.text(p.x, p.y, 'z', { fontFamily: 'Fredoka, sans-serif', fontSize: Math.round(a.tam * (a.fuerte ? 0.16 : 0.1)) + 'px', color: '#5f3dc4', fontStyle: 'bold' }).setDepth(a.cont.depth + 1);
                    scene.tweens.add({ targets: z, x: p.x + a.tam * 0.18, y: p.y - a.tam * 0.35, alpha: 0, angle: 20, scale: 1.6, duration: a.fuerte ? 1100 : 1800, onComplete: function () { z.destroy(); } });
                    a.zzz.push(z);
                }
            };
            a.acierto = async function (ms) {
                a.fuerte = true;
                await esperar(scene, Math.max(1800, ms || 0));
                a.fuerte = false;
            };
            a.destruirExtra = function () { a.zzz.forEach(function (z) { if (z.active) z.destroy(); }); };
        }
    };

    /* Respaldo dibujado (solo si la página no carga la capa 3D). */
    var PERSONAS = {
        aplaudiendo: function (a, scene) {
            a.ninos = [nino(a, scene, 32, 52, 1.08, 'rojo', 'cabeza_nina'), nino(a, scene, 68, 52, 1.08, 'verde', 'cabeza_nino')];
            // Postura: manos juntas delante del pecho.
            a.ninos.forEach(function (n) { n.bi.angle = -42; n.bd.angle = 42; });
            a.alActualizar = function (t) {
                var rapido = a.aplaudiendo;
                a.ninos.forEach(function (n, i) {
                    // 0 = manos juntas delante del pecho, 1 = abiertas (se ve el aplauso).
                    var f = rapido ? (Math.sin(t / 55 + i) + 1) / 2 : (Math.sin(t / 300 + i) + 1) / 2 * 0.6;
                    n.bi.angle = -42 + f * 30;
                    n.bd.angle = 42 - f * 30;
                    if (rapido) n.cont.y = n.y0 - Math.abs(Math.sin(t / 160 + i)) * a.k * 5;
                    if (Math.random() < 0.004) n.parpadear();
                });
            };
            a.acierto = async function (ms) {
                var dur = Math.max(1800, ms || 0);
                a.aplaudiendo = true;
                var ev = scene.time.addEvent({
                    delay: 220, loop: true, callback: function () {
                        a.ninos.forEach(function (n) {
                            var p = a.mundo(n.cont.x / a.k + 50, 40);
                            U().estallido(scene, p.x, p.y, { n: 3, tex: 'chispa', tam: a.tam * 0.07, dist: a.tam * 0.12, ms: 400, colores: [0xfff3bf, 0xffd43b] });
                        });
                    }
                });
                await esperar(scene, dur);
                ev.remove();
                a.aplaudiendo = false;
                a.ninos.forEach(function (n) { n.cont.y = n.y0; });
            };
        },
        corriendo: function (a, scene) {
            // Líneas de velocidad detrás: se lee que va corriendo aunque esté de frente.
            a.lineas = scene.add.graphics();
            a.cont.add(a.lineas);
            a.n = nino(a, scene, 52, 50, 1.4, 'amarillo', 'cabeza_nino2');
            a.n.cont.angle = 10;
            a.vel = 0.35;
            a.fase = 0;
            a.alActualizar = function (t, dt) {
                a.fase += dt * a.vel * 0.02;
                var f = Math.sin(a.fase);
                a.n.pi.angle = f * 34;
                a.n.pd.angle = -f * 34;
                a.n.bi.angle = -f * 40;
                a.n.bd.angle = f * 40;
                a.n.cont.y = a.n.y0 - Math.abs(Math.cos(a.fase)) * a.k * 3 * (a.vel > 1 ? 2 : 1);
                var g = a.lineas;
                g.clear();
                [[-30, 30, 0], [-12, 22, 1.3], [8, 26, 2.6]].forEach(function (l) {
                    var d = ((t / (a.vel > 1 ? 4 : 9) + l[2] * 40) % 40) * a.k * 0.2;
                    g.lineStyle(a.k * 2, 0x868e96, 0.55);
                    g.lineBetween(a.u(12) - d, a.u(50 + l[0]), a.u(12 + l[1]) - d, a.u(50 + l[0]));
                });
                if (Math.random() < 0.004) a.n.parpadear();
            };
            a.acierto = async function (ms) {
                var dur = Math.max(1800, ms || 0);
                a.vel = 1.6;
                var x0 = a.cont.x;
                var ev = scene.time.addEvent({ delay: 160, loop: true, callback: function () { var p = a.mundo(40, 92); humo(scene, p.x, p.y, { tam: a.tam * 0.1, tinte: 0xd9b48f, dx: -a.tam * 0.12, dy: -6, ms: 600, depth: a.cont.depth - 1 }); } });
                await tw(scene, { targets: a.cont, x: x0 + a.tam * 0.45, duration: dur * 0.4, ease: 'Sine.easeInOut' });
                a.cont.scaleX *= -1;
                await tw(scene, { targets: a.cont, x: x0, duration: dur * 0.4, ease: 'Sine.easeInOut' });
                a.cont.scaleX *= -1;
                await esperar(scene, dur * 0.2);
                ev.remove();
                a.vel = 0.35;
            };
        },
        saltando: function (a, scene) {
            a.sombra = scene.add.ellipse(a.u(50), a.u(94), 40 * a.k, 7 * a.k, 0x000000, 0.18);
            a.cont.add(a.sombra);
            a.n = nino(a, scene, 50, 46, 1.4, 'morado', 'cabeza_nina2');
            a.n.bi.angle = 150;
            a.n.bd.angle = -150;
            a.salto = 0;
            a.alActualizar = function (t) {
                var alto = a.saltando ? Math.abs(Math.sin(t / 230)) * 26 : Math.abs(Math.sin(t / 420)) * 3;
                a.n.cont.y = a.n.y0 - alto * a.k;
                var aire = alto / 26;
                a.n.pi.angle = a.saltando ? -aire * 30 : 0;
                a.n.pd.angle = a.saltando ? aire * 30 : 0;
                a.n.bi.angle = 150 + Math.sin(t / 230) * 14;
                a.n.bd.angle = -150 - Math.sin(t / 230) * 14;
                a.sombra.setScale(1 - aire * 0.4);
                if (Math.random() < 0.004) a.n.parpadear();
            };
            a.acierto = async function (ms) {
                a.saltando = true;
                await esperar(scene, Math.max(1840, ms || 0));
                a.saltando = false;
            };
        },
        durmiendo: function (a, scene) {
            a.img('cama', 50, 56, 100);
            a.cabeza = a.img('cabeza_nino', 26, 46, 30);
            a.cabeza.angle = -70;
            a.cobija = a.img('cobija', 56, 58, 84, { ox: 0.5, oy: 0.7 });
            a.zzz = [];
            a.fuerte = false;
            a.alActualizar = function (t) {
                var r = a.fuerte ? 280 : 700;
                a.cobija.scaleY = a.cobija.scaleX * (1 + Math.sin(t / r) * (a.fuerte ? 0.09 : 0.04));
                if (t > (a.ultZ || 0) && a.cont.visible && a.cont.alpha > 0.5 && a.cont.scale > 0.5) {
                    a.ultZ = t + (a.fuerte ? 380 : 1500);
                    var p = a.mundo(32, 32);
                    var z = scene.add.text(p.x, p.y, 'z', { fontFamily: 'Fredoka, sans-serif', fontSize: Math.round(a.tam * (a.fuerte ? 0.16 : 0.1)) + 'px', color: '#5f3dc4', fontStyle: 'bold' }).setDepth(a.cont.depth + 1);
                    scene.tweens.add({ targets: z, x: p.x + a.tam * 0.18, y: p.y - a.tam * 0.35, alpha: 0, angle: 20, scale: 1.6, duration: a.fuerte ? 1100 : 1800, onComplete: function () { z.destroy(); } });
                    a.zzz.push(z);
                }
            };
            a.acierto = async function (ms) {
                a.fuerte = true;
                await esperar(scene, Math.max(1800, ms || 0));
                a.fuerte = false;
            };
            a.destruir = function () { a.zzz.forEach(function (z) { if (z.active) z.destroy(); }); a.cont.destroy(); };
        }
    };

    function crear(scene, id, x, y, tam, o) {
        o = o || {};
        var a = base(scene, id, x, y, tam);
        if (id === 'telefono' && o.variante === 'movil') a.sonido = 'vibracion';
        var f = FABRICAS[id] || ((hay3D() ? PERSONAS3D : PERSONAS)[id]);
        if (f) f(a, scene, o);
        else a.img(id, 50, 50, 100);
        // Los personajes 3D siguen al actor cuadro a cuadro y se borran con él.
        var actualizar = a.actualizar;
        a.actualizar = function (time, dt) { actualizar(time, dt); seguirPjs(a); };
        var destruir = a.destruir;
        a.destruir = function () { if (a.destruirExtra) a.destruirExtra(); destruirPjs(a); destruir(); };
        if (a.pjs) a.cont.once('destroy', function () { destruirPjs(a); });
        return a;
    }

    global.AsociaActores = {
        crear: crear,
        sonidoDe: function (id) { return SONIDO[id] || id; },
        efectos: { anillos: anillos, vibraciones: vibraciones, humo: humo, gotas: gotas }
    };
})(typeof window !== 'undefined' ? window : this);
