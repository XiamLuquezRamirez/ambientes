/**
 * Sandbox PedNia — ciclo de vida Phaser 4.2.1 (mismo vendor que intro3d / catálogo).
 * Flujo: intro simulada → destroy → gameplay → destroy.
 */
(function () {
    'use strict';

    var logEl = document.getElementById('phaser-log');
    var estadoEl = document.getElementById('phaser-estado');
    var introParent = document.getElementById('intro-phaser');
    var juegoParent = document.getElementById('juego-phaser');
    var Host = window.PedniaPhaserHost;

    function log(msg) {
        if (!logEl) return;
        var p = document.createElement('p');
        p.textContent = '[' + new Date().toLocaleTimeString() + '] ' + msg;
        logEl.appendChild(p);
        logEl.scrollTop = logEl.scrollHeight;
    }

    function actualizarEstado() {
        var introOn = !!(window.__introPhaser);
        var gameOn = !!(window.__pedniaPhaserGame);
        if (estadoEl) {
            estadoEl.textContent =
                'Intro: ' + (introOn ? 'ON' : '—') +
                ' · Gameplay: ' + (gameOn ? 'ON' : '—');
        }
    }

    function crearIntro() {
        if (typeof window.Phaser === 'undefined') {
            log('ERROR: Phaser no cargó.');
            return;
        }
        if (!Host) {
            log('ERROR: PedniaPhaserHost no cargó.');
            return;
        }

        Host.destruirTodo();
        if (introParent) introParent.hidden = false;

        window.__introPhaser = new window.Phaser.Game({
            type: window.Phaser.AUTO,
            parent: introParent,
            width: juegoParent ? juegoParent.clientWidth || 800 : 800,
            height: 450,
            backgroundColor: '#1e3a5f',
            scene: {
                key: 'intro-lab',
                create: function () {
                    var w = this.scale.width;
                    var h = this.scale.height;
                    this.add.text(w / 2, h / 2, 'Intro simulada\n(tocar no hace falta)', {
                        fontFamily: 'system-ui, sans-serif',
                        fontSize: '22px',
                        color: '#e2e8f0',
                        align: 'center'
                    }).setOrigin(0.5);
                }
            }
        });

        log('Intro creada (Phaser ' + (window.Phaser.VERSION || '?') + ').');
        actualizarEstado();
    }

    function pasarAGameplay() {
        if (!Host) {
            log('ERROR: PedniaPhaserHost no cargó.');
            return;
        }
        if (introParent) introParent.hidden = true;

        var game = Host.crear({
            type: window.Phaser.AUTO,
            parent: juegoParent,
            width: juegoParent ? juegoParent.clientWidth || 800 : 800,
            height: 450,
            backgroundColor: '#e8eef5',
            scene: {
                key: 'gameplay-lab',
                create: function () {
                    var w = this.scale.width;
                    var h = this.scale.height;
                    var ball = this.add.circle(w / 2, h / 2, 40, 0x263b53);
                    ball.setInteractive({ useHandCursor: true });
                    this.tweens.add({
                        targets: ball,
                        y: h / 2 - 70,
                        duration: 650,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                    this.add.text(16, 16, 'Gameplay (tocá la bola)', {
                        fontFamily: 'system-ui, sans-serif',
                        fontSize: '16px',
                        color: '#263b53'
                    });
                    ball.on('pointerdown', function () {
                        log('Pointer en personaje de gameplay.');
                    });
                }
            }
        });

        if (!game) {
            log('ERROR: no se pudo crear gameplay.');
            return;
        }
        log('Gameplay activo; intro destruida.');
        actualizarEstado();
    }

    function destruirTodo() {
        if (Host) Host.destruirTodo();
        if (introParent) introParent.hidden = true;
        log('Todo destruido.');
        actualizarEstado();
    }

    document.getElementById('btn-crear-intro')?.addEventListener('click', crearIntro);
    document.getElementById('btn-gameplay')?.addEventListener('click', pasarAGameplay);
    document.getElementById('btn-destruir')?.addEventListener('click', destruirTodo);

    if (typeof window.Phaser === 'undefined') {
        log('Phaser no disponible.');
    } else {
        log('Phaser listo: ' + (window.Phaser.VERSION || 'sin VERSION'));
    }
    if (!Host) log('PedniaPhaserHost no disponible.');
    actualizarEstado();
})();
