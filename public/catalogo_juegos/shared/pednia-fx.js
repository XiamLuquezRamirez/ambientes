/**
 * pednia-fx.js — Efectos de celebración compartidos por los juegos del catálogo.
 *
 *   Phaser 4 → capa transparente de partículas (estrellas, confeti). Sin input, no
 *              intercepta toques, y su bucle se duerme cuando no hay partículas.
 *   GSAP 3   → anillo expansivo y respaldo DOM de las estrellas si Phaser no arranca.
 *
 * SOLO VISUAL: no lee ni cambia el estado de ningún juego. Se crea al primer uso.
 * Con "reducir movimiento" del sistema, o sin GSAP, no hace nada (activo = false).
 *
 *   PedniaFx.preparar()                 arranca Phaser en segundo plano
 *   PedniaFx.estallido(x, y, color, n)  estrellas en coordenadas de pantalla
 *   PedniaFx.anillo(rect, color)        anillo sobre un DOMRect
 *   PedniaFx.celebracion(rect)          confeti + ráfagas (fin del juego)
 */
(function (global) {
    'use strict';

    var gsap = global.gsap || null;
    var doc = global.document;
    var reducido = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var activo = !!gsap && !reducido;
    var PALETA = ['#ffd54f', '#ff7043', '#4fc3f7', '#81c784', '#ba68c8', '#ffffff'];
    var Z = 1500; // encima del juego y del modal de feedback; debajo del fantasma de arrastre

    function centro(rect) {
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }

    // Estilos propios (el módulo no depende de ningún CSS del juego).
    if (activo && !doc.getElementById('pednia-fx-css')) {
        var css = doc.createElement('style');
        css.id = 'pednia-fx-css';
        css.textContent =
            '#pednia-fx{position:fixed;inset:0;z-index:' + Z + ';pointer-events:none}' +
            '#pednia-fx canvas{pointer-events:none}' +
            '.pednia-anillo{position:fixed;z-index:' + Z + ';box-sizing:border-box;border:6px solid #ffd54f;' +
            'border-radius:50%;pointer-events:none;' +
            'box-shadow:0 0 18px rgba(255,255,255,.75),inset 0 0 12px rgba(255,255,255,.6)}' +
            '.pednia-chispa{position:fixed;z-index:' + Z + ';width:16px;height:16px;pointer-events:none;' +
            'clip-path:polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)}';
        doc.head.appendChild(css);
    }

    // ---------------- Phaser 4: capa de partículas ----------------
    var Phaser = global.Phaser || null;
    var game = null;
    var escena = null;
    var promesa = null;
    var fallido = false;
    var emisores = {};
    var dormirTimer = null;

    function phaserDisponible() { return activo && !!Phaser && !fallido; }

    function dibujarEstrella(ctx, s, color) {
        var cx = s / 2, cy = s / 2, ext = s * 0.46, inn = s * 0.2;
        ctx.beginPath();
        for (var i = 0; i < 10; i++) {
            var r = i % 2 === 0 ? ext : inn;
            var a = -Math.PI / 2 + i * Math.PI / 5;
            ctx[i === 0 ? 'moveTo' : 'lineTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = s * 0.06;
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.stroke();
    }

    function textura(tipo, color) {
        var key = 'pednia-' + tipo + '-' + color.replace('#', '');
        if (escena.textures.exists(key)) return key;
        var s = 32;
        var c = doc.createElement('canvas');
        c.width = s;
        c.height = s;
        var ctx = c.getContext('2d');
        if (tipo === 'estrella') {
            dibujarEstrella(ctx, s, color);
        } else {
            ctx.fillStyle = color;
            ctx.fillRect(s * 0.2, s * 0.35, s * 0.6, s * 0.3);
        }
        escena.textures.addCanvas(key, c);
        return key;
    }

    function emisor(tipo, color) {
        var key = textura(tipo, color);
        if (emisores[key]) return emisores[key];
        var cfg = tipo === 'estrella'
            ? {
                speed: { min: 170, max: 430 }, angle: { min: 0, max: 360 },
                lifespan: { min: 600, max: 1050 }, scale: { start: 0.95, end: 0 },
                alpha: { start: 1, end: 0 }, rotate: { min: -180, max: 180 },
                gravityY: 620, emitting: false
            }
            : {
                speed: { min: 140, max: 360 }, angle: { min: 65, max: 115 },
                lifespan: { min: 1600, max: 2400 }, scale: { start: 1, end: 0.6 },
                alpha: { start: 1, end: 0 }, rotate: { min: -360, max: 360 },
                gravityY: 260, emitting: false
            };
        emisores[key] = escena.add.particles(0, 0, key, cfg);
        return emisores[key];
    }

    function particulasVivas() {
        return Object.keys(emisores).some(function (k) {
            try { return emisores[k].getAliveParticleCount() > 0; } catch (e) { return false; }
        });
    }

    // Sin partículas el bucle duerme (ahorra batería en tablets). Solo se duerme cuando ya no
    // queda ninguna viva y tras un cuadro más: si se dormía con partículas en pantalla, el
    // último cuadro quedaba pintado (estrellas "congeladas" en equipos lentos).
    function intentarDormir() {
        if (particulasVivas()) {
            dormirTimer = setTimeout(intentarDormir, 400);
            return;
        }
        dormirTimer = setTimeout(function () {
            try { if (game && game.loop && !particulasVivas()) game.loop.sleep(); } catch (e) { /* noop */ }
        }, 300);
    }

    function despertar() {
        if (dormirTimer) clearTimeout(dormirTimer);
        try { if (game && game.loop) game.loop.wake(); } catch (e) { /* noop */ }
        dormirTimer = setTimeout(intentarDormir, 2800);
    }

    function asegurar() {
        if (promesa) return promesa;
        if (!phaserDisponible()) return Promise.resolve(null);
        promesa = new Promise(function (resolve) {
            var cont = doc.createElement('div');
            cont.id = 'pednia-fx';
            cont.setAttribute('aria-hidden', 'true');
            doc.body.appendChild(cont);
            var resuelto = false;
            function fin(valor) {
                if (resuelto) return;
                resuelto = true;
                if (!valor) fallido = true;
                resolve(valor);
            }
            try {
                game = new Phaser.Game({
                    type: Phaser.AUTO,
                    parent: cont,
                    transparent: true,
                    width: global.innerWidth,
                    height: global.innerHeight,
                    banner: false,
                    audio: { noAudio: true },
                    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
                    scale: { mode: Phaser.Scale.RESIZE },
                    scene: {
                        create: function () {
                            escena = this;
                            if (game && game.canvas) game.canvas.style.pointerEvents = 'none';
                            try { game.loop.sleep(); } catch (e) { /* noop */ }
                            fin(escena);
                        }
                    }
                });
            } catch (e) {
                fin(null);
            }
            // Si la escena no arranca a tiempo se usa el respaldo DOM.
            setTimeout(function () { fin(escena); }, 4000);
        });
        return promesa;
    }

    // ---------------- Respaldo DOM (GSAP) ----------------
    function estallidoDom(x, y, color, cantidad) {
        if (!activo) return;
        var n = cantidad || 12;
        for (var i = 0; i < n; i++) {
            var s = doc.createElement('span');
            s.className = 'pednia-chispa';
            s.style.left = x + 'px';
            s.style.top = y + 'px';
            s.style.background = i % 3 === 0 ? '#ffffff' : color;
            doc.body.appendChild(s);
            var ang = Math.random() * Math.PI * 2;
            var dist = 60 + Math.random() * 90;
            gsap.fromTo(s, { xPercent: -50, yPercent: -50, scale: 1, opacity: 1 }, {
                x: Math.cos(ang) * dist,
                y: Math.sin(ang) * dist + 30,
                scale: 0,
                rotation: Math.random() * 360,
                opacity: 0,
                duration: 0.7 + Math.random() * 0.3,
                ease: 'power2.out',
                onComplete: (function (el) { return function () { el.remove(); }; })(s)
            });
        }
    }

    // ---------------- API ----------------
    var PedniaFx = {
        activo: activo,

        preparar: function () {
            if (phaserDisponible()) asegurar();
        },

        estallido: function (x, y, color, cantidad) {
            if (!activo) return;
            var tono = color || '#ffd54f';
            if (!phaserDisponible()) {
                estallidoDom(x, y, tono, cantidad);
                return;
            }
            asegurar().then(function (sc) {
                if (!sc) {
                    estallidoDom(x, y, tono, cantidad);
                    return;
                }
                despertar();
                var n = cantidad || 16;
                emisor('estrella', tono).explode(Math.ceil(n * 0.6), x, y);
                emisor('estrella', '#ffffff').explode(Math.floor(n * 0.4), x, y);
            });
        },

        anillo: function (rect, color) {
            if (!activo || !rect) return;
            var c = centro(rect);
            var d = Math.max(rect.width, rect.height) * 1.05;
            var a = doc.createElement('span');
            a.className = 'pednia-anillo';
            a.style.width = d + 'px';
            a.style.height = d + 'px';
            a.style.left = (c.x - d / 2) + 'px';
            a.style.top = (c.y - d / 2) + 'px';
            a.style.borderColor = color || '#ffd54f';
            doc.body.appendChild(a);
            gsap.fromTo(a, { scale: 0.35, opacity: 1 }, {
                scale: 1.5,
                opacity: 0,
                duration: 0.65,
                ease: 'power2.out',
                onComplete: function () { a.remove(); }
            });
        },

        celebracion: function (rect) {
            if (!activo) return;
            var fallback = function () {
                if (rect) {
                    var cc = centro(rect);
                    estallidoDom(cc.x, cc.y, '#ffd54f', 20);
                }
            };
            if (!phaserDisponible()) {
                fallback();
                return;
            }
            asegurar().then(function (sc) {
                if (!sc) {
                    fallback();
                    return;
                }
                despertar();
                var w = global.innerWidth;
                for (var i = 0; i < 12; i++) {
                    emisor('confeti', PALETA[i % PALETA.length]).explode(7, Math.random() * w, -12);
                }
                if (rect) {
                    var c = centro(rect);
                    [0, 180, 360].forEach(function (ms, i) {
                        setTimeout(function () {
                            despertar();
                            emisor('estrella', PALETA[i]).explode(14, c.x + (i - 1) * rect.width * 0.35, c.y - rect.height * 0.15);
                        }, ms);
                    });
                }
            });
        }
    };

    global.PedniaFx = PedniaFx;
})(window);
