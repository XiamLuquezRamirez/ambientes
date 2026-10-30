/**
 * Lab Phaser 4.2.1 + GSAP (HUD DOM).
 * El vendor de Phaser es el mismo del catálogo (assets/vendor/phaser).
 */
(function () {
    'use strict';

    var GAME_KEY = '__pedniaPhaser4Lab';
    var logEl = document.getElementById('lab-log');
    var estadoEl = document.getElementById('lab-estado');
    var hudEl = document.getElementById('hud-gsap');
    var parentEl = document.getElementById('juego-phaser4');

    function log(msg) {
        if (!logEl) return;
        var p = document.createElement('p');
        p.textContent = '[' + new Date().toLocaleTimeString() + '] ' + msg;
        logEl.appendChild(p);
        logEl.scrollTop = logEl.scrollHeight;
    }

    function actualizarEstado() {
        var phaserOn = !!(window[GAME_KEY]);
        var gsapOn = typeof window.gsap !== 'undefined';
        if (estadoEl) {
            estadoEl.textContent =
                'Phaser: ' + (phaserOn ? 'ON' : 'off') +
                ' · GSAP: ' + (gsapOn ? 'OK' : 'faltante');
        }
    }

    function destruir() {
        var game = window[GAME_KEY];
        if (game) {
            try {
                game.destroy(true);
            } catch (e) { /* noop */ }
            window[GAME_KEY] = null;
        }
        if (hudEl && window.gsap) {
            window.gsap.killTweensOf(hudEl);
            window.gsap.set(hudEl, { y: '-120%', opacity: 0 });
        }
        log('Destruido.');
        actualizarEstado();
    }

    function crear() {
        if (typeof window.Phaser === 'undefined') {
            log('ERROR: Phaser no cargó (assets/vendor/phaser).');
            actualizarEstado();
            return;
        }

        destruir();

        var game = new window.Phaser.Game({
            type: window.Phaser.AUTO,
            parent: parentEl,
            width: parentEl.clientWidth || 800,
            height: 420,
            backgroundColor: '#f8faf9',
            scale: {
                mode: window.Phaser.Scale.FIT,
                autoCenter: window.Phaser.Scale.CENTER_BOTH
            },
            scene: {
                key: 'lab',
                create: function () {
                    var w = this.scale.width;
                    var h = this.scale.height;
                    this.add.rectangle(w / 2, h / 2, w, h, 0x0f766e, 0.12);
                    var ball = this.add.circle(w / 2, h / 2, 36, 0x14b8a6);
                    this.tweens.add({
                        targets: ball,
                        y: h / 2 - 80,
                        duration: 700,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                    this.add.text(16, h - 36, 'Phaser ' + (window.Phaser.VERSION || '4'), {
                        fontFamily: 'system-ui, sans-serif',
                        fontSize: '14px',
                        color: '#1e3a2f'
                    });
                }
            }
        });

        window[GAME_KEY] = game;
        log('Phaser Game creado (VERSION=' + (window.Phaser.VERSION || '?') + ').');
        actualizarEstado();
    }

    function animarHud() {
        if (typeof window.gsap === 'undefined') {
            log('ERROR: GSAP no cargó (assets/vendor/gsap).');
            actualizarEstado();
            return;
        }
        if (!hudEl) return;

        window.gsap.fromTo(
            hudEl,
            { y: '-120%', opacity: 0 },
            {
                y: '0%',
                opacity: 1,
                duration: 0.55,
                ease: 'power3.out',
                onComplete: function () {
                    window.gsap.to(hudEl, {
                        delay: 0.8,
                        y: '-120%',
                        opacity: 0,
                        duration: 0.4,
                        ease: 'power2.in'
                    });
                }
            }
        );
        log('HUD animado con GSAP ' + (window.gsap.version || '') + '.');
        actualizarEstado();
    }

    document.getElementById('btn-crear')?.addEventListener('click', crear);
    document.getElementById('btn-hud')?.addEventListener('click', animarHud);
    document.getElementById('btn-destruir')?.addEventListener('click', destruir);

    if (typeof window.Phaser === 'undefined') {
        log('Phaser no disponible al cargar.');
    } else {
        log('Phaser listo: ' + (window.Phaser.VERSION || 'sin VERSION'));
    }
    if (typeof window.gsap === 'undefined') {
        log('GSAP no disponible al cargar.');
    } else {
        log('GSAP listo: ' + (window.gsap.version || ''));
    }
    actualizarEstado();
})();
