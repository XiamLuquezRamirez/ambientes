/**
 * PedniaOrganos — los órganos de los sentidos como personajes vivos (Phaser 4).
 *
 *   var o = PedniaOrganos.crear(scene, 'ojo', x, y, radio, { burbuja: true });
 *   o.cont               Container (posición, escala, profundidad)
 *   o.mirar(x, y)        el ojo sigue un punto (los demás se inclinan un poco hacia él)
 *   o.reaccion(nombre)   'acierto' | 'error' | 'toca'   → Promise
 *   o.gafas(si)          (solo ojo) gafas de sol
 *   o.actualizar(time)   llamar desde update(): respiración, parpadeo, burbuja que flota
 *
 * Tipos: oreja, ojo, nariz, lengua (boca con lengua), mano. Las texturas vienen de PedniaArte.
 */
(function (global) {
    'use strict';

    var A = function () { return global.PedniaArte; };
    var NOMBRES = { oreja: 'Oído', oido: 'Oído', ojo: 'Ojo', nariz: 'Nariz', lengua: 'Lengua', mano: 'Mano' };

    function tween(scene, cfg) {
        return new Promise(function (r) {
            cfg.onComplete = r;
            scene.tweens.add(cfg);
        });
    }

    function esperar(scene, ms) {
        return new Promise(function (r) { scene.time.delayedCall(ms, r); });
    }

    function reducido() {
        return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function crear(scene, tipo, x, y, radio, opts) {
        opts = opts || {};
        if (tipo === 'oido') tipo = 'oreja';
        var r = radio;
        var cont = scene.add.container(x, y);
        var cuerpo = scene.add.container(0, 0);
        var o = {
            tipo: tipo,
            id: opts.id || (tipo === 'oreja' ? 'oido' : tipo),
            nombre: NOMBRES[tipo] || tipo,
            cont: cont,
            cuerpo: cuerpo,
            radio: r,
            base: { x: x, y: y },
            fase: Math.random() * 10,
            mira: { x: 0, y: 0 },
            parpado: 0,
            proxParpadeo: 0,
            ocupado: false,
            flotar: opts.flotar !== false
        };

        if (opts.burbuja !== false) {
            var halo = scene.add.circle(0, 0, r * 1.02, opts.color || 0xffffff, 0.22);
            o.halo = halo;
            cont.add(halo);
        }
        cont.add(cuerpo);

        var tam = Math.max(128, Math.round(r * 2.4));
        if (tipo === 'ojo') {
            o.blanco = scene.add.image(0, 0, A().textura(scene, 'ojo', tam)).setDisplaySize(r * 1.75, r * 1.75);
            o.iris = scene.add.image(0, 0, A().textura(scene, 'iris', tam)).setDisplaySize(r * 0.62, r * 0.62);
            o.parpG = scene.add.graphics();
            o.gafasG = scene.add.graphics().setVisible(false);
            cuerpo.add([o.blanco, o.iris, o.parpG, o.gafasG]);
        } else if (tipo === 'lengua') {
            o.lengua = scene.add.image(0, r * 0.02, A().textura(scene, 'lengua', tam)).setOrigin(0.5, 0.06)
                .setDisplaySize(r * 0.62, r * 0.78);
            o.lengua.scaleY = 0.001;
            o.lenguaSY = (r * 0.78) / o.lengua.height;
            o.boca = scene.add.image(0, -r * 0.08, A().textura(scene, 'boca', tam)).setDisplaySize(r * 1.6, r * 1.6);
            cuerpo.add([o.boca, o.lengua]);
        } else {
            var nombreTex = tipo === 'oreja' ? 'oreja' : tipo;
            o.img = scene.add.image(0, 0, A().textura(scene, nombreTex, tam)).setDisplaySize(r * 1.55, r * 1.55);
            cuerpo.add(o.img);
        }
        o.ondas = scene.add.graphics();
        cont.add(o.ondas);
        if (opts.burbuja !== false) {
            o.burbuja = scene.add.image(0, 0, A().textura(scene, 'burbuja', tam)).setDisplaySize(r * 2.1, r * 2.1);
            cont.add(o.burbuja);
        }

        o.mirar = function (px, py) {
            var dx = px - cont.x;
            var dy = py - cont.y;
            var d = Math.sqrt(dx * dx + dy * dy) || 1;
            o.mira.x = dx / d;
            o.mira.y = dy / d;
        };

        o.gafas = function (si) {
            if (!o.gafasG) return;
            o.gafasG.setVisible(!!si);
            if (!si) return;
            var g = o.gafasG;
            g.clear();
            g.fillStyle(0x212529, 0.92);
            g.fillRoundedRect(-r * 0.86, -r * 0.34, r * 0.8, r * 0.56, r * 0.22);
            g.fillRoundedRect(r * 0.06, -r * 0.34, r * 0.8, r * 0.56, r * 0.22);
            g.lineStyle(r * 0.08, 0x212529, 1);
            g.lineBetween(-r * 0.08, -r * 0.16, r * 0.08, -r * 0.16);
            g.lineBetween(-r * 0.86, -r * 0.2, -r * 1.02, -r * 0.3);
            g.lineBetween(r * 0.86, -r * 0.2, r * 1.02, -r * 0.3);
            g.fillStyle(0xffffff, 0.35);
            g.fillRoundedRect(-r * 0.74, -r * 0.26, r * 0.22, r * 0.12, r * 0.05);
            g.fillRoundedRect(r * 0.18, -r * 0.26, r * 0.22, r * 0.12, r * 0.05);
            o.gafasG.y = -r * 0.9;
            o.gafasG.alpha = 0;
            scene.tweens.add({ targets: o.gafasG, y: 0, alpha: 1, duration: 520, ease: 'Bounce.easeOut' });
        };

        function ondasSonido(color, n) {
            var t0 = scene.time.now;
            var dur = 1300;
            var ev = scene.time.addEvent({
                delay: 16, loop: true, callback: function () {
                    var k = (scene.time.now - t0) / dur;
                    o.ondas.clear();
                    if (k >= 1) { ev.remove(); return; }
                    for (var i = 0; i < (n || 3); i++) {
                        var kk = k * 1.4 - i * 0.18;
                        if (kk <= 0 || kk >= 1) continue;
                        o.ondas.lineStyle(r * 0.07 * (1 - kk), color, 1 - kk);
                        o.ondas.beginPath();
                        o.ondas.arc(-r * 0.15, 0, r * (0.7 + kk * 0.9), -0.9, 0.9);
                        o.ondas.strokePath();
                        o.ondas.beginPath();
                        o.ondas.arc(r * 0.15, 0, r * (0.7 + kk * 0.9), Math.PI - 0.9, Math.PI + 0.9);
                        o.ondas.strokePath();
                    }
                }
            });
        }

        function aire(haciaDentro, color, n, tex) {
            for (var i = 0; i < (n || 8); i++) {
                var a = Math.PI * 0.5 + (Math.random() - 0.5) * 2.2;
                var lejos = r * (1.3 + Math.random() * 0.6);
                var p = scene.add.image(0, 0, A().textura(scene, tex || 'humo', 64)).setTint(color || 0xffffff);
                p.setDisplaySize(r * 0.3, r * 0.3);
                cont.add(p);
                var desde = haciaDentro ? { x: Math.cos(a) * lejos, y: Math.sin(a) * lejos * -1 } : { x: 0, y: r * 0.3 };
                var hasta = haciaDentro ? { x: 0, y: r * 0.35 } : { x: Math.cos(a) * lejos, y: -Math.sin(a) * lejos };
                p.setPosition(desde.x, desde.y);
                p.alpha = 0;
                scene.tweens.add({
                    targets: p, x: hasta.x, y: hasta.y, alpha: { from: 0.9, to: 0 },
                    scale: haciaDentro ? p.scale * 0.3 : p.scale * 1.6,
                    delay: i * 70, duration: 700, ease: haciaDentro ? 'Quad.easeIn' : 'Quad.easeOut',
                    onComplete: function () { this.targets[0].destroy(); }
                });
            }
        }

        o.reaccion = function (nombre) {
            if (reducido()) return esperar(scene, 300);
            var sx = cuerpo.scaleX;
            // Mientras reacciona, la respiración de actualizar() no pisa la animación.
            if (nombre === 'toca') {
                o.ocupado = true;
                return tween(scene, { targets: cuerpo, scaleX: 0.88, scaleY: 0.88, duration: 90, yoyo: true, ease: 'Quad.easeOut' })
                    .then(function () { o.ocupado = false; });
            }
            if (nombre === 'error') {
                // No castiga: el órgano "prueba" a su manera y niega con la cabeza.
                o.ocupado = true;
                var prueba = Promise.resolve();
                if (tipo === 'nariz') { aire(true, 0xdee2e6, 5); prueba = tween(scene, { targets: cuerpo, scaleX: 1.12, scaleY: 0.92, duration: 160, yoyo: true, repeat: 1 }); }
                else if (tipo === 'lengua') prueba = o.lamer(0.6);
                else if (tipo === 'ojo') { o.parpadear(); prueba = esperar(scene, 260); }
                else if (tipo === 'oreja') { ondasSonido(0xadb5bd, 1); prueba = esperar(scene, 260); }
                else prueba = tween(scene, { targets: cuerpo, scaleX: 0.9, scaleY: 1.08, duration: 140, yoyo: true });
                return prueba.then(function () {
                    return tween(scene, { targets: cuerpo, angle: { from: -12, to: 12 }, duration: 110, yoyo: true, repeat: 2, ease: 'Sine.easeInOut' });
                }).then(function () { cuerpo.angle = 0; cuerpo.setScale(1); o.ocupado = false; });
            }
            // Acierto: cada órgano hace lo suyo.
            o.ocupado = true;
            var p;
            if (tipo === 'oreja') {
                ondasSonido(0xffd43b, 3);
                p = tween(scene, { targets: cuerpo, angle: { from: -10, to: 10 }, duration: 160, yoyo: true, repeat: 3, ease: 'Sine.easeInOut' });
            } else if (tipo === 'nariz') {
                aire(true, 0xffc9de, 10, 'humo');
                p = tween(scene, { targets: cuerpo, scaleX: sx * 1.18, scaleY: sx * 0.9, duration: 260, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' })
                    .then(function () { aire(false, 0xffffff, 6, 'corazon'); return esperar(scene, 500); });
            } else if (tipo === 'lengua') {
                p = o.lamer(1).then(function () { return o.lamer(1); });
            } else if (tipo === 'ojo') {
                o.parpadear();
                p = esperar(scene, 220).then(function () { o.parpadear(); return esperar(scene, 300); });
            } else {
                p = tween(scene, { targets: cuerpo, angle: { from: -14, to: 14 }, duration: 180, yoyo: true, repeat: 3 });
            }
            scene.tweens.add({ targets: cuerpo, y: -r * 0.12, duration: 200, yoyo: true, repeat: 1, ease: 'Quad.easeOut' });
            return p.then(function () { cuerpo.angle = 0; o.ocupado = false; });
        };

        o.lamer = function (k) {
            if (!o.lengua) return Promise.resolve();
            var ly = o.lenguaSY * (k || 1);
            return tween(scene, { targets: o.lengua, scaleY: ly, duration: 220, ease: 'Back.easeOut' })
                .then(function () { return tween(scene, { targets: o.lengua, angle: { from: -14, to: 14 }, duration: 140, yoyo: true, repeat: 1 }); })
                .then(function () { o.lengua.angle = 0; return tween(scene, { targets: o.lengua, scaleY: 0.001, duration: 180, ease: 'Quad.easeIn' }); });
        };

        o.parpadear = function () {
            if (tipo !== 'ojo' || o.parpadeando) return;
            o.parpadeando = true;
            scene.tweens.add({
                targets: o, parpado: 1, duration: 90, yoyo: true, ease: 'Quad.easeIn',
                onComplete: function () { o.parpadeando = false; }
            });
        };

        function dibujarParpado() {
            var g = o.parpG;
            g.clear();
            var k = Math.max(o.parpado, o.sueno || 0);
            if (k <= 0.01) return;
            var w = r * 0.84;
            var arriba = -r * 0.48;
            var borde = arriba + (r * 0.98) * k;
            g.fillStyle(0xf6c9a4, 1);
            g.beginPath();
            g.moveTo(-w - 2, -r * 0.05);
            g.lineTo(-w - 2, arriba - r * 0.1);
            g.lineTo(w + 2, arriba - r * 0.1);
            g.lineTo(w + 2, -r * 0.05);
            for (var i = 0; i <= 16; i++) {
                var t = i / 16;
                var xx = w - t * 2 * w;
                var curva = Math.sin(t * Math.PI);
                g.lineTo(xx, -r * 0.05 + (borde + r * 0.05) * curva);
            }
            g.closePath();
            g.fillPath();
            g.lineStyle(r * 0.05, 0x5c3a2e, 1);
            g.beginPath();
            for (var j = 0; j <= 16; j++) {
                var tt = j / 16;
                var x2 = w - tt * 2 * w;
                var y2 = -r * 0.05 + (borde + r * 0.05) * Math.sin(tt * Math.PI);
                if (j === 0) g.moveTo(x2, y2);
                else g.lineTo(x2, y2);
            }
            g.strokePath();
        }

        o.actualizar = function (time) {
            var t = time / 1000 + o.fase;
            if (o.flotar && !o.arrastrado && !reducido()) {
                cont.y = o.base.y + Math.sin(t * 1.3) * r * 0.06;
                cont.x = o.base.x + Math.cos(t * 0.9) * r * 0.03;
            }
            if (!o.ocupado && !reducido()) {
                var s = 1 + Math.sin(t * 2.1) * 0.015;
                cuerpo.scaleX = s;
                cuerpo.scaleY = 2 - s;
            }
            if (tipo === 'ojo') {
                var objX = o.mira.x * r * 0.32;
                var objY = o.mira.y * r * 0.16;
                o.iris.x += (objX - o.iris.x) * 0.15;
                o.iris.y += (objY - o.iris.y) * 0.15;
                if (time > o.proxParpadeo) {
                    o.proxParpadeo = time + 2200 + Math.random() * 2800;
                    if (o.proxParpadeo > 0 && time > 0) o.parpadear();
                }
                dibujarParpado();
            } else if (o.img && !o.ocupado) {
                cuerpo.angle = o.mira.x * 6;
            }
        };

        o.destello = function (si) {
            if (!o.halo) return;
            scene.tweens.killTweensOf(o.halo);
            if (si) {
                o.halo.fillColor = 0xfff3bf;
                scene.tweens.add({ targets: o.halo, alpha: { from: 0.25, to: 0.85 }, scale: { from: 1, to: 1.15 }, duration: 520, yoyo: true, repeat: -1 });
            } else {
                o.halo.fillColor = opts.color || 0xffffff;
                o.halo.alpha = 0.22;
                o.halo.scale = 1;
            }
        };

        o.contiene = function (px, py, extra) {
            var dx = px - cont.x;
            var dy = py - cont.y;
            var rr = r * cont.scale * (extra || 1.05);
            return dx * dx + dy * dy <= rr * rr;
        };

        return o;
    }

    global.PedniaOrganos = { crear: crear, NOMBRES: NOMBRES };
})(typeof window !== 'undefined' ? window : this);
