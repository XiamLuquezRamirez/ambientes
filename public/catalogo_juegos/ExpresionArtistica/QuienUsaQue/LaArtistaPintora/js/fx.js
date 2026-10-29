/**
 * Helpers de juice Phaser + GSAP HUD (DOM). No animar el mismo display object con ambos.
 */
(function (global) {
    'use strict';

    function motionOk() {
        return !(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function sfx(nombre, extra) {
        if (global.QuienUsaQueSfx && QuienUsaQueSfx.sonar) QuienUsaQueSfx.sonar(nombre, extra);
    }

    function pctToXY(scene, zona) {
        var w = scene.scale.width;
        var h = scene.scale.height;
        return {
            x: (zona.x / 100) * w,
            y: (zona.y / 100) * h,
            w: (zona.w / 100) * w,
            h: (zona.h / 100) * h
        };
    }

    function dentroZona(scene, zona, worldX, worldY) {
        var p = pctToXY(scene, zona);
        return worldX >= p.x - p.w / 2 && worldX <= p.x + p.w / 2 &&
            worldY >= p.y - p.h / 2 && worldY <= p.y + p.h / 2;
    }

    function worldToPct(scene, x, y) {
        return {
            x: (x / scene.scale.width) * 100,
            y: (y / scene.scale.height) * 100
        };
    }

    function fitImage(img, maxW, maxH) {
        if (!img || !img.width) return;
        var sx = maxW / img.width;
        var sy = maxH / img.height;
        var s = Math.min(sx, sy);
        img.setScale(s);
    }

    function zonaDash(scene, zona, color) {
        var p = pctToXY(scene, zona);
        var radio = Math.max(54, Math.max(p.w, p.h) * 0.42);
        var anillo = scene.add.circle(p.x, p.y, radio, color || 0xff6d00, 0.22);
        anillo.setStrokeStyle(7, 0xffffff, 0.95);
        scene.add.circle(p.x, p.y, radio * 0.28, 0xffffff, 0.55);
        var aviso = scene.add.text(p.x, p.y + radio + 8, '¡SUELTA AQUÍ!', {
            fontFamily: 'Fredoka, sans-serif',
            fontSize: '18px',
            color: '#fff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setStroke('#000', 4);
        if (motionOk()) {
            scene.tweens.add({
                targets: anillo,
                scale: 1.1,
                duration: 480,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
        anillo.setData('zona', zona);
        anillo.setData('aviso', aviso);
        return anillo;
    }

    function cameraPunch(scene, zoom) {
        if (!motionOk() || !scene || !scene.cameras || !scene.cameras.main) return;
        var cam = scene.cameras.main;
        scene.tweens.add({
            targets: cam,
            zoom: zoom || 1.06,
            duration: 160,
            yoyo: true,
            ease: 'Sine.easeOut'
        });
    }

    function shake(scene, targets, amp) {
        if (!targets) return;
        var list = Array.isArray(targets) ? targets : [targets];
        if (!motionOk()) return;
        scene.tweens.add({
            targets: list,
            x: '+=0',
            duration: 40,
            repeat: 4,
            yoyo: true,
            onStart: function () {
                list.forEach(function (t) {
                    if (t && t.x != null) t._shakeBaseX = t.x;
                });
            },
            onUpdate: function (tw, t) {
                if (!t || t._shakeBaseX == null) return;
                t.x = t._shakeBaseX + (Math.random() - 0.5) * (amp || 14);
            },
            onComplete: function () {
                list.forEach(function (t) {
                    if (t && t._shakeBaseX != null) {
                        t.x = t._shakeBaseX;
                        delete t._shakeBaseX;
                    }
                });
            }
        });
    }

    function burst(scene, x, y, color) {
        if (!motionOk()) return;
        var n = 10;
        for (var i = 0; i < n; i++) {
            var c = scene.add.circle(x, y, 6 + Math.random() * 6, color || 0xffeb3b, 0.9);
            var ang = (Math.PI * 2 * i) / n;
            var dist = 40 + Math.random() * 70;
            scene.tweens.add({
                targets: c,
                x: x + Math.cos(ang) * dist,
                y: y + Math.sin(ang) * dist,
                alpha: 0,
                scale: 0.2,
                duration: 420 + Math.random() * 200,
                onComplete: function (tw, target) { target.destroy(); }
            });
        }
    }

    function gsapDialogoIn() {
        if (!global.gsap || !motionOk()) return;
        var el = document.getElementById('dialogo');
        if (!el) return;
        gsap.fromTo(el, { y: -28, scale: 0.92, opacity: 0 }, {
            y: 0, scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(1.7)'
        });
    }

    function gsapEstrella(el) {
        if (!el) return;
        if (!global.gsap || !motionOk()) {
            el.classList.add('hecho');
            return;
        }
        el.classList.add('hecho');
        gsap.fromTo(el, { scale: 0.4 }, { scale: 1.15, duration: 0.28, yoyo: true, repeat: 1, ease: 'back.out(2)' });
    }

    function gsapWipe(onMid) {
        var el = document.getElementById('wipe-reto');
        if (!el) {
            if (onMid) onMid();
            return Promise.resolve();
        }
        if (!global.gsap || !motionOk()) {
            if (onMid) onMid();
            return Promise.resolve();
        }
        return new Promise(function (resolve) {
            gsap.timeline({
                onComplete: resolve
            })
                .set(el, { opacity: 1, scaleX: 0, transformOrigin: 'left center' })
                .to(el, { scaleX: 1, duration: 0.22, ease: 'power2.in' })
                .add(function () { if (onMid) onMid(); })
                .set(el, { transformOrigin: 'right center' })
                .to(el, { scaleX: 0, duration: 0.22, ease: 'power2.out' })
                .set(el, { opacity: 0 });
        });
    }

    function gsapConciertoItems() {
        if (!global.gsap || !motionOk()) return;
        var items = document.querySelectorAll('.concierto .marco-mini');
        if (!items.length) return;
        gsap.fromTo(items, { y: 28, opacity: 0 }, {
            y: 0, opacity: 1, duration: 0.45, stagger: 0.1, ease: 'back.out(1.4)'
        });
    }

    function gsapInsigniaPop(el) {
        if (!el) return;
        if (!global.gsap || !motionOk()) return;
        gsap.fromTo(el, { scale: 0.6, rotation: 0.5 }, { scale: 1, opacity: 1, duration: 0.55, ease: 'elastic.out(1, 0.5)' });
    }

    global.QuienUsaQueFx = {
        motionOk: motionOk,
        sfx: sfx,
        pctToXY: pctToXY,
        dentroZona: dentroZona,
        worldToPct: worldToPct,
        fitImage: fitImage,
        zonaDash: zonaDash,
        cameraPunch: cameraPunch,
        shake: shake,
        burst: burst,
        gsapDialogoIn: gsapDialogoIn,
        gsapEstrella: gsapEstrella,
        gsapWipe: gsapWipe,
        gsapConciertoItems: gsapConciertoItems,
        gsapInsigniaPop: gsapInsigniaPop
    };
})(typeof window !== 'undefined' ? window : this);
