/**
 * AsociaVida — el escenario vivo: elementos de ambiente animados que además responden al dedo.
 * No son parte de la mecánica (no suman ni restan): hacen que el mundo se sienta real.
 *
 *   var v = AsociaVida.montar(scene, keep)       // keep(o) registra objetos para borrarlos al rearmar
 *   v.parque({ horizonte, ancho })               // cielo, sol, montañas, colinas, árboles, nubes, pájaros
 *   v.sol(x, y, r)  v.nube(x, y, esc)  v.pajaros(n, y0, y1)  v.arbol(x, piso, alto)
 *   v.mariposas(n, zona)  v.globos(zona)  v.estrellas(rect, n)  v.pato(x, y, rango)
 *   v.gato(x, y, tam)  v.lluvia(rect)  v.noria(x, y, r)  v.pendulo(x, y, largo)
 *   v.palomas(n, piso, x0, x1)  v.burbujas(zona)  v.gotas(x, y)  v.ropa(x0, x1, y)
 *   v.actualizar(t, dt)   v.tocar(p) → true si algo del ambiente respondió
 */
(function (global) {
    'use strict';

    function rnd(a, b) { return a + Math.random() * (b - a); }

    /* ── Sonidos cortos del ambiente (sintetizados) ── */
    var ac = null;
    function ctx() {
        var C = global.AudioContext || global.webkitAudioContext;
        if (!C) return null;
        if (!ac) ac = new C();
        if (ac.state === 'suspended') ac.resume();
        return ac;
    }
    function nota(f, f2, dur, vol, tipo, retraso) {
        var c = ctx();
        if (!c) return;
        var t = c.currentTime + (retraso || 0);
        var o = c.createOscillator();
        o.type = tipo || 'sine';
        o.frequency.setValueAtTime(f, t);
        if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
        var g = c.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol || 0.05, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(c.destination);
        o.start(t); o.stop(t + dur + 0.02);
    }
    var SON = {
        pio: function () { nota(2600, 3600, 0.08, 0.05); nota(3000, 4200, 0.07, 0.04, 'sine', 0.11); },
        hojas: function () { var c = ctx(); if (!c) return; for (var i = 0; i < 6; i++) nota(1800 + Math.random() * 2000, 900, 0.05, 0.015, 'triangle', i * 0.04); },
        puf: function () { nota(400, 180, 0.25, 0.05, 'triangle'); },
        pop: function () { nota(900, 200, 0.08, 0.08, 'square'); },
        cuac: function () { nota(420, 300, 0.12, 0.06, 'sawtooth'); nota(400, 280, 0.14, 0.05, 'sawtooth', 0.16); },
        miau: function () { nota(700, 1100, 0.18, 0.04, 'sawtooth'); nota(1100, 600, 0.3, 0.04, 'sawtooth', 0.18); },
        brillo: function () { nota(1568, 2093, 0.25, 0.04); nota(2093, 2637, 0.25, 0.03, 'sine', 0.1); },
        aleteo: function () { for (var i = 0; i < 4; i++) nota(300 + Math.random() * 200, 150, 0.04, 0.02, 'triangle', i * 0.05); },
        tic: function () { nota(2000, 0, 0.03, 0.03, 'square'); },
        gota: function () { nota(1200, 600, 0.06, 0.05); },
        blup: function () { nota(500, 900, 0.1, 0.04); }
    };

    function montar(scene, keep) {
        keep = keep || function (o) { return o; };
        var items = [];
        var add = function (o) { return keep(scene.add.existing ? o : o); };

        function item(def) { items.push(def); return def; }

        /* ── Cielo y paisaje de parque (por capas) ── */

        function parque(o) {
            o = o || {};
            var W = scene.scale.width, hz = o.horizonte;
            var clave = 'vida_cielo_' + Math.round(W) + '_' + Math.round(hz);
            if (!scene.textures.exists(clave)) {
                var t = scene.textures.createCanvas(clave, Math.ceil(W), Math.ceil(hz + 40));
                var x = t.getContext();
                var g = x.createLinearGradient(0, 0, 0, hz);
                g.addColorStop(0, '#4dabf7'); g.addColorStop(0.6, '#a5d8ff'); g.addColorStop(1, '#e7f5ff');
                x.fillStyle = g; x.fillRect(0, 0, W, hz + 40);
                // Montañas lejanas azuladas.
                x.fillStyle = '#9fb9d8';
                x.beginPath(); x.moveTo(0, hz);
                for (var i = 0; i <= 10; i++) x.lineTo(W * i / 10, hz - (40 + ((i * 53) % 70)) * (hz / 300));
                x.lineTo(W, hz); x.fill();
                x.fillStyle = '#b5cbe4';
                x.beginPath(); x.moveTo(0, hz);
                for (var k = 0; k <= 14; k++) x.lineTo(W * k / 14, hz - (18 + ((k * 37) % 40)) * (hz / 300));
                x.lineTo(W, hz); x.fill();
                // Colinas verdes.
                x.fillStyle = '#8ce99a';
                x.beginPath(); x.moveTo(0, hz + 40);
                for (var m = 0; m <= 20; m++) x.lineTo(W * m / 20, hz + 6 - Math.sin(m * 0.7) * 14);
                x.lineTo(W, hz + 40); x.fill();
                x.fillStyle = '#69db7c';
                x.beginPath(); x.moveTo(0, hz + 40);
                for (var n = 0; n <= 20; n++) x.lineTo(W * n / 20, hz + 20 - Math.sin(n * 0.9 + 2) * 10);
                x.lineTo(W, hz + 40); x.fill();
                t.refresh();
            }
            keep(scene.add.image(0, 0, clave).setOrigin(0, 0).setDepth(0));
            sol(W * (o.solX || 0.1), Math.max(56, hz * 0.26), Math.min(46, hz * 0.14));
            for (var c = 0; c < (o.nubes || 4); c++) nube(rnd(0, W), rnd(hz * 0.12, hz * 0.55), rnd(0.7, 1.3));
            var arboles = o.arboles || [0.04, 0.2, 0.62, 0.8, 0.95];
            arboles.forEach(function (fx, i) { arbol(W * fx, hz + 22, Math.min(170, hz * (0.55 + (i % 2) * 0.15)), i); });
            pajaros(3, hz * 0.15, hz * 0.6);
        }

        /* ── Sol: rayos que giran; al tocarlo guiña y brilla ── */

        function sol(x, y, r) {
            var c = keep(scene.add.container(x, y).setDepth(1));
            var rayos = scene.add.graphics();
            rayos.fillStyle(0xffd43b, 0.6);
            for (var i = 0; i < 12; i++) {
                var a = i * Math.PI / 6;
                rayos.fillTriangle(Math.cos(a - 0.12) * r * 1.1, Math.sin(a - 0.12) * r * 1.1, Math.cos(a + 0.12) * r * 1.1, Math.sin(a + 0.12) * r * 1.1, Math.cos(a) * r * 1.7, Math.sin(a) * r * 1.7);
            }
            var halo = scene.add.circle(0, 0, r * 1.25, 0xfff3bf, 0.5);
            var disco = scene.add.circle(0, 0, r, 0xffd43b).setStrokeStyle(3, 0xfab005);
            var cara = scene.add.graphics();
            c.add([rayos, halo, disco, cara]);
            var s = item({ tipo: 'sol', c: c, r: r, guino: 0 });
            s.dibujar = function () {
                cara.clear();
                cara.fillStyle(0x7a4a00, 1);
                cara.lineStyle(3, 0x7a4a00, 1);
                if (s.guino > 0) { cara.beginPath(); cara.arc(-r * 0.3, -r * 0.15, r * 0.12, Math.PI, 0); cara.strokePath(); }
                else cara.fillCircle(-r * 0.3, -r * 0.15, r * 0.09);
                cara.fillCircle(r * 0.3, -r * 0.15, r * 0.09);
                cara.beginPath(); cara.arc(0, r * 0.05, r * 0.4, 0.3, Math.PI - 0.3); cara.strokePath();
                cara.fillStyle(0xff8787, 0.5); cara.fillCircle(-r * 0.5, r * 0.15, r * 0.12); cara.fillCircle(r * 0.5, r * 0.15, r * 0.12);
            };
            s.dibujar();
            s.paso = function (t, dt) {
                rayos.rotation += dt / 9000;
                halo.setScale(1 + Math.sin(t / 600) * 0.06);
                if (s.guino > 0) { s.guino -= dt; if (s.guino <= 0) s.dibujar(); }
            };
            s.toca = function (p) { return Math.hypot(p.x - c.x, p.y - c.y) < r * 1.4; };
            s.tocado = function () {
                s.guino = 900; s.dibujar(); SON.brillo();
                scene.tweens.add({ targets: c, scale: 1.2, duration: 200, yoyo: true, ease: 'Back.easeOut' });
            };
            return s;
        }

        /* ── Nube: avanza con el viento; al tocarla se deshace en bocanadas y se vuelve a juntar ── */

        function nube(x, y, esc) {
            var c = keep(scene.add.container(x, y).setDepth(1).setScale(esc || 1));
            var partes = [[0, 0, 26], [24, -10, 22], [46, 2, 20], [20, 8, 24], [-18, 6, 18]];
            partes.forEach(function (q) { c.add(scene.add.circle(q[0], q[1], q[2], 0xffffff, 0.95)); });
            c.add(scene.add.ellipse(16, 18, 80, 14, 0xdbe4ff, 0.6));
            var n = item({ tipo: 'nube', c: c, vx: rnd(6, 16) });
            n.paso = function (t, dt) {
                c.x += n.vx * dt / 1000;
                if (c.x > scene.scale.width + 100) c.x = -120;
                c.y += Math.sin(t / 2000 + c.x / 200) * 0.04;
            };
            n.toca = function (p) { return Math.abs(p.x - c.x - 14 * c.scale) < 55 * c.scale && Math.abs(p.y - c.y) < 30 * c.scale; };
            n.tocado = function () {
                SON.puf();
                c.list.forEach(function (b, i) {
                    var ox = b.x, oy = b.y;
                    scene.tweens.add({ targets: b, x: ox + rnd(-40, 40), y: oy + rnd(-30, 20), alpha: 0.4, duration: 350, yoyo: true, hold: 500, ease: 'Sine.easeOut', onComplete: function () { b.x = ox; b.y = oy; } });
                });
            };
            return n;
        }

        /* ── Bandada de pájaros que cruza; al tocarla aletea fuerte, pía y sube ── */

        function pajaros(n, y0, y1) {
            for (var i = 0; i < n; i++) {
                (function () {
                    var g = keep(scene.add.graphics().setDepth(2));
                    var p = item({ tipo: 'pajaro', g: g, x: rnd(-200, scene.scale.width), base: rnd(y0, y1), vx: rnd(35, 70), fase: Math.random() * 6, asustado: 0, y: 0 });
                    p.paso = function (t, dt) {
                        var vel = p.vx * (p.asustado > 0 ? 3 : 1);
                        p.x += vel * dt / 1000;
                        if (p.asustado > 0) { p.asustado -= dt; p.base -= dt * 0.08; }
                        if (p.x > scene.scale.width + 80) { p.x = -120; p.base = rnd(y0, y1); }
                        p.y = p.base + Math.sin(t / 900 + p.fase) * 8;
                        g.clear();
                        g.lineStyle(2.5, 0x343a40, 0.85);
                        [[0, 0], [-16, 9], [-14, -10]].forEach(function (q, j) {
                            var al = Math.sin(t / (p.asustado > 0 ? 45 : 110) + j + p.fase) * 5;
                            g.beginPath(); g.moveTo(p.x + q[0] - 7, p.y + q[1] - al); g.lineTo(p.x + q[0], p.y + q[1] + 2); g.lineTo(p.x + q[0] + 7, p.y + q[1] - al); g.strokePath();
                        });
                    };
                    p.toca = function (q) { return Math.abs(q.x - p.x + 6) < 34 && Math.abs(q.y - p.y) < 24; };
                    p.tocado = function () { p.asustado = 1600; SON.pio(); SON.aleteo(); };
                })();
            }
        }

        /* ── Árbol: se mece con el viento; al tocarlo se sacude y caen hojas ── */

        function arbol(x, piso, alto, variante) {
            var c = keep(scene.add.container(x, piso).setDepth(3));
            var k = alto / 150;
            c.add(scene.add.ellipse(0, 2, 70 * k, 14 * k, 0x000000, 0.15));
            c.add(scene.add.rectangle(0, -32 * k, 16 * k, 66 * k, 0x8c5a2b).setStrokeStyle(2, 0x6b4423));
            var copa = scene.add.container(0, -70 * k);
            var tonos = variante % 2 ? [0x2b8a3e, 0x37b24d, 0x51cf66] : [0x2f9e44, 0x40c057, 0x69db7c];
            [[0, -26, 46], [-30, -8, 34], [30, -8, 34], [-14, -48, 32], [16, -46, 30]].forEach(function (q, i) {
                copa.add(scene.add.circle(q[0] * k, q[1] * k, q[2] * k, tonos[i % 2]));
            });
            [[-12, -40, 12], [14, -24, 10], [-24, -14, 8]].forEach(function (q) { copa.add(scene.add.circle(q[0] * k, q[1] * k, q[2] * k, tonos[2], 0.8)); });
            if (variante % 3 === 0) [[-20, -20], [18, -36], [6, -8]].forEach(function (q) { copa.add(scene.add.circle(q[0] * k, q[1] * k, 4 * k, 0xff6b6b)); });
            c.add(copa);
            var a = item({ tipo: 'arbol', c: c, copa: copa, k: k, fase: Math.random() * 6, sacudida: 0 });
            a.paso = function (t, dt) {
                var s = a.sacudida > 0 ? Math.sin(t / 40) * 6 * (a.sacudida / 700) : 0;
                if (a.sacudida > 0) a.sacudida -= dt;
                copa.angle = Math.sin(t / 1400 + a.fase) * 2.5 + s;
                copa.x = Math.sin(t / 1400 + a.fase) * 2 * k;
            };
            a.toca = function (p) { return Math.hypot(p.x - c.x, p.y - (c.y - 90 * k)) < 55 * k; };
            a.tocado = function () {
                a.sacudida = 700;
                SON.hojas();
                for (var i = 0; i < 8; i++) hoja(c.x + rnd(-40, 40) * k, c.y - rnd(60, 110) * k, tonos[i % 3]);
            };
            return a;
        }

        function hoja(x, y, color) {
            var h = keep(scene.add.ellipse(x, y, 10, 6, color).setDepth(60));
            var piso = y + rnd(80, 160);
            scene.tweens.add({ targets: h, y: piso, duration: rnd(1400, 2200), ease: 'Sine.easeIn' });
            scene.tweens.add({ targets: h, x: x + rnd(-30, 30), angle: rnd(-200, 200), duration: 500, yoyo: true, repeat: 2 });
            scene.tweens.add({ targets: h, alpha: 0, delay: 1800, duration: 600, onComplete: function () { h.destroy(); } });
        }

        /* ── Mariposas: revolotean; al tocarlas escapan rápido ── */

        function mariposas(n, z) {
            var colores = [0xff922b, 0xcc5de8, 0x4dabf7, 0xfcc419];
            for (var i = 0; i < n; i++) {
                (function (col) {
                    var m = keep(scene.add.container(rnd(z.x, z.x + z.w), rnd(z.y, z.y + z.h)).setDepth(z.depth || 7));
                    var a1 = scene.add.ellipse(-6, 0, 12, 16, col).setOrigin(1, 0.5);
                    var a2 = scene.add.ellipse(6, 0, 12, 16, col).setOrigin(0, 0.5);
                    m.add([a1, a2, scene.add.ellipse(0, 0, 3, 12, 0x343a40)]);
                    var b = item({ tipo: 'mariposa', c: m, fase: Math.random() * 6, y0: m.y, prisa: 0 });
                    b.paso = function (t, dt) {
                        b.fase += dt / 1000 * (b.prisa > 0 ? 3 : 1);
                        if (b.prisa > 0) { b.prisa -= dt; b.y0 -= dt * 0.05; }
                        else b.y0 += (z.y + z.h / 2 - b.y0) * 0.002;
                        m.x += Math.sin(b.fase * 0.7) * 0.9 + (b.prisa > 0 ? 3 : 0.3);
                        m.y = b.y0 + Math.sin(b.fase * 1.6) * 14;
                        var ab = Math.abs(Math.sin(t / (b.prisa > 0 ? 35 : 70) + b.fase));
                        a1.scaleX = ab; a2.scaleX = ab;
                        if (m.x > z.x + z.w + 30) m.x = z.x - 30;
                    };
                    b.toca = function (p) { return Math.hypot(p.x - m.x, p.y - m.y) < 30; };
                    b.tocado = function () { b.prisa = 1500; SON.aleteo(); };
                })(colores[i % colores.length]);
            }
        }

        /* ── Globos que suben; al tocarlos revientan y sale otro ── */

        function globos(z) {
            var colores = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x51cf66, 0xcc5de8];
            for (var i = 0; i < (z.n || 4); i++) {
                (function (k) {
                    var c = keep(scene.add.container(rnd(z.x, z.x + z.w), z.y + z.h + rnd(0, z.h)).setDepth(z.depth || 2));
                    var col = colores[k % colores.length];
                    var hilo = scene.add.graphics();
                    hilo.lineStyle(1.5, 0x495057, 0.7); hilo.beginPath(); hilo.moveTo(0, 18); hilo.lineTo(-3, 34); hilo.lineTo(2, 48); hilo.strokePath();
                    c.add([hilo, scene.add.ellipse(0, 0, 30, 36, col), scene.add.triangle(0, 18, -4, 0, 4, 0, 0, 5, col), scene.add.ellipse(-6, -8, 7, 11, 0xffffff, 0.5)]);
                    var g = item({ tipo: 'globo', c: c, vy: rnd(18, 32), fase: Math.random() * 6 });
                    g.paso = function (t, dt) {
                        c.y -= g.vy * dt / 1000;
                        c.x += Math.sin(t / 900 + g.fase) * 0.3;
                        c.angle = Math.sin(t / 700 + g.fase) * 6;
                        if (c.y < z.y - 60) { c.y = z.y + z.h + 40; c.x = rnd(z.x, z.x + z.w); c.setAlpha(1).setScale(1); }
                    };
                    g.toca = function (p) { return Math.hypot(p.x - c.x, p.y - c.y) < 24; };
                    g.tocado = function () {
                        SON.pop();
                        for (var j = 0; j < 8; j++) {
                            var a = j * Math.PI / 4;
                            var tr = keep(scene.add.rectangle(c.x, c.y, 6, 3, col).setDepth(61));
                            scene.tweens.add({ targets: tr, x: c.x + Math.cos(a) * 40, y: c.y + Math.sin(a) * 40 + 20, angle: 180, alpha: 0, duration: 500, onComplete: function () { this.targets[0].destroy(); } });
                        }
                        c.y = z.y + z.h + 60;
                        c.x = rnd(z.x, z.x + z.w);
                    };
                })(i);
            }
        }

        /* ── Estrellas que titilan; al tocar el cielo cruza una estrella fugaz ── */

        function estrellas(r, n) {
            var g = keep(scene.add.graphics().setDepth(r.depth || 1));
            var lista = [];
            for (var i = 0; i < (n || 18); i++) lista.push({ x: rnd(r.x, r.x + r.w), y: rnd(r.y, r.y + r.h), f: Math.random() * 6, s: rnd(1, 2.6) });
            var e = item({ tipo: 'estrellas', g: g, fugaz: null });
            e.paso = function (t) {
                g.clear();
                lista.forEach(function (q) {
                    var luz = 0.4 + Math.abs(Math.sin(t / 500 + q.f)) * 0.6;
                    if (r.pegatina) {
                        // Pegatina fosforescente: estrella de cinco puntas con brillo.
                        var R = q.s * 5, pts = [];
                        for (var k = 0; k < 10; k++) { var a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? R * 0.45 : R; pts.push({ x: q.x + Math.cos(a) * rr, y: q.y + Math.sin(a) * rr }); }
                        g.fillStyle(0xe9fac8, 0.25 * luz); g.fillCircle(q.x, q.y, R * 1.5);
                        g.fillStyle(0xd8f5a2, 0.55 + luz * 0.45); g.fillPoints(pts, true);
                        g.lineStyle(1.5, 0x94d82d, 0.8); g.strokePoints(pts, true);
                    } else { g.fillStyle(0xfff9db, luz); g.fillCircle(q.x, q.y, q.s); }
                });
                var f = e.fugaz;
                if (f) {
                    f.k += 0.03;
                    var x = f.x + f.dx * f.k, y = f.y + f.dy * f.k;
                    g.lineStyle(3, 0xffffff, 1 - f.k); g.beginPath(); g.moveTo(x, y); g.lineTo(x - f.dx * 0.25, y - f.dy * 0.25); g.strokePath();
                    if (f.k >= 1) e.fugaz = null;
                }
            };
            e.toca = function (p) { return p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h; };
            e.tocado = function (p) { e.fugaz = { x: p.x, y: p.y, dx: rnd(80, 140), dy: rnd(30, 60), k: 0 }; SON.brillo(); };
            return e;
        }

        /* ── Pato que nada en el lago; al tocarlo dice cuac y deja ondas ── */

        function pato(x, y, rango, esc) {
            var k = esc || 1;
            var c = keep(scene.add.container(x, y).setDepth(4).setScale(k));
            c.add([
                scene.add.ellipse(0, 4, 34, 16, 0xffffff, 0.35),
                scene.add.ellipse(0, 0, 30, 18, 0xffd43b),
                scene.add.circle(12, -10, 8, 0xffd43b),
                scene.add.triangle(22, -10, 0, -3, 0, 3, 8, 0, 0xff922b),
                scene.add.circle(14, -12, 1.8, 0x212529)
            ]);
            var ondas = keep(scene.add.graphics().setDepth(3));
            var d = item({ tipo: 'pato', c: c, x0: x, fase: Math.random() * 6, onda: 0 });
            d.paso = function (t, dt) {
                var u = Math.sin(t / 4000 + d.fase);
                c.x = d.x0 + u * rango;
                c.scaleX = (Math.cos(t / 4000 + d.fase) >= 0 ? 1 : -1) * k;
                c.y = y + Math.sin(t / 400) * 1.2;
                ondas.clear();
                if (d.onda > 0) {
                    d.onda -= dt;
                    var f = 1 - d.onda / 900;
                    ondas.lineStyle(2, 0xffffff, 1 - f);
                    ondas.strokeEllipse(c.x, c.y + 6, 40 + f * 50, 10 + f * 12);
                }
            };
            d.toca = function (p) { return Math.hypot(p.x - c.x, p.y - c.y) < 26 * k; };
            d.tocado = function () { SON.cuac(); d.onda = 900; scene.tweens.add({ targets: c, y: c.y - 8, duration: 120, yoyo: true }); };
            return d;
        }

        /* ── Gato en la oscuridad: solo se le ven los ojos; parpadea y maúlla al tocarlo ── */

        function gato(x, y, tam) {
            var g = keep(scene.add.graphics().setDepth(tam && tam.depth || 55));
            var t0 = tam && tam.t || 14;
            var m = item({ tipo: 'gato', g: g, cierre: 0, prox: 0, feliz: 0, susto: 0 });
            m.paso = function (t, dt) {
                if (t > m.prox) { m.cierre = 160; m.prox = t + rnd(2500, 5000); }
                if (m.cierre > 0) m.cierre -= dt;
                if (m.feliz > 0) m.feliz -= dt;
                if (m.susto > 0) m.susto -= dt;
                g.clear();
                // Contento (ronronea): ojos en arco. Asustado: ojos grandes y redondos.
                if (m.feliz > 0) {
                    g.lineStyle(3, 0xc0eb75, 1);
                    [-1, 1].forEach(function (s) { g.beginPath(); g.arc(x + s * t0, y + t0 * 0.15, t0 * 0.4, Math.PI * 1.15, Math.PI * 1.85); g.strokePath(); });
                    return;
                }
                var h = m.cierre > 0 ? 1.5 : t0 * (m.susto > 0 ? 0.9 : 0.55);
                [-1, 1].forEach(function (s) {
                    g.fillStyle(0xc0eb75, 0.95); g.fillEllipse(x + s * t0, y, t0 * (m.susto > 0 ? 1.05 : 0.9), h);
                    if (m.cierre <= 0) { g.fillStyle(0x212529, 1); g.fillEllipse(x + s * t0, y, t0 * (m.susto > 0 ? 0.55 : 0.2), h * (m.susto > 0 ? 0.55 : 0.9)); }
                });
            };
            m.toca = function (p) { return Math.hypot(p.x - x, p.y - y) < t0 * 2.4; };
            m.tocado = function () { m.cierre = 300; SON.miau(); };
            return m;
        }

        /* ── Lluvia sobre una ventana ── */

        function lluvia(r) {
            var g = keep(scene.add.graphics().setDepth(r.depth || 2));
            var gotas = [];
            for (var i = 0; i < 26; i++) gotas.push({ x: rnd(r.x, r.x + r.w), y: rnd(r.y, r.y + r.h), v: rnd(220, 380) });
            var l = item({ tipo: 'lluvia', g: g });
            l.paso = function (t, dt) {
                g.clear();
                g.lineStyle(2, 0xa5d8ff, 0.7);
                gotas.forEach(function (q) {
                    q.y += q.v * dt / 1000; q.x -= q.v * dt / 6000;
                    if (q.y > r.y + r.h) { q.y = r.y; q.x = rnd(r.x, r.x + r.w); }
                    g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(q.x - 2, q.y + 10); g.strokePath();
                });
            };
            return l;
        }

        /* ── Noria de la feria: gira con sus cabinas; al tocarla acelera ── */

        function noria(x, y, r) {
            var c = keep(scene.add.container(x, y).setDepth(1));
            var rueda = scene.add.graphics();
            rueda.lineStyle(3, 0xffffff, 0.7);
            rueda.strokeCircle(0, 0, r); rueda.strokeCircle(0, 0, r * 0.25);
            for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4; rueda.beginPath(); rueda.moveTo(0, 0); rueda.lineTo(Math.cos(a) * r, Math.sin(a) * r); rueda.strokePath(); }
            var patas = scene.add.graphics();
            patas.lineStyle(4, 0xffffff, 0.6);
            patas.beginPath(); patas.moveTo(-r * 0.5, r * 1.15); patas.lineTo(0, 0); patas.lineTo(r * 0.5, r * 1.15); patas.strokePath();
            var cabinas = [];
            var colores = [0xff6b6b, 0xffd43b, 0x4dabf7, 0x69db7c];
            c.add([patas, rueda]);
            for (var k = 0; k < 8; k++) { var cb = scene.add.rectangle(0, 0, r * 0.22, r * 0.18, colores[k % 4]).setStrokeStyle(1, 0xffffff); cabinas.push(cb); c.add(cb); }
            var n = item({ tipo: 'noria', c: c, giro: 0, vel: 1 });
            n.paso = function (t, dt) {
                n.vel += (1 - n.vel) * 0.01;
                n.giro += dt / 6000 * n.vel;
                rueda.rotation = n.giro;
                cabinas.forEach(function (cb, j) { var a = n.giro + j * Math.PI / 4; cb.x = Math.cos(a) * r; cb.y = Math.sin(a) * r + r * 0.1; });
            };
            n.toca = function (p) { return Math.hypot(p.x - x, p.y - y) < r * 1.1; };
            n.tocado = function () { n.vel = 5; SON.brillo(); };
            return n;
        }

        /* ── Reloj de pared con péndulo; al tocarlo da campanadas ── */

        function pendulo(x, y, largo) {
            var c = keep(scene.add.container(x, y).setDepth(2));
            var caja = scene.add.rectangle(0, largo * 0.55, largo * 0.42, largo * 1.4, 0x8c5a2b).setStrokeStyle(3, 0x5c3a17);
            var vidrio = scene.add.rectangle(0, largo * 0.75, largo * 0.3, largo * 0.85, 0xfff4e6, 0.6);
            var esfera = scene.add.circle(0, 0, largo * 0.22, 0xffffff).setStrokeStyle(3, 0x5c3a17);
            var agujas = scene.add.graphics();
            var brazo = scene.add.container(0, largo * 0.3);
            brazo.add([scene.add.rectangle(0, largo * 0.3, 3, largo * 0.6, 0xc9a227), scene.add.circle(0, largo * 0.62, largo * 0.09, 0xfcc419).setStrokeStyle(2, 0xc9a227)]);
            c.add([caja, vidrio, brazo, esfera, agujas]);
            var p = item({ tipo: 'pendulo', c: c, ultTic: 0 });
            p.paso = function (t) {
                var a = Math.sin(t / 500) * 18;
                brazo.angle = a;
                agujas.clear();
                agujas.lineStyle(3, 0x212529, 1);
                var m = t / 60000 * Math.PI * 2, h = m / 12;
                agujas.beginPath(); agujas.moveTo(0, 0); agujas.lineTo(Math.cos(m - Math.PI / 2) * largo * 0.18, Math.sin(m - Math.PI / 2) * largo * 0.18); agujas.strokePath();
                agujas.beginPath(); agujas.moveTo(0, 0); agujas.lineTo(Math.cos(h - 1) * largo * 0.12, Math.sin(h - 1) * largo * 0.12); agujas.strokePath();
            };
            p.toca = function (q) { return Math.abs(q.x - x) < largo * 0.3 && q.y > y - largo * 0.25 && q.y < y + largo * 1.3; };
            p.tocado = function () { for (var i = 0; i < 3; i++) nota(880, 0, 0.6, 0.06, 'sine', i * 0.45); };
            return p;
        }

        /* ── Palomas que caminan y picotean; al tocarlas vuelan ── */

        function palomas(n, piso, x0, x1) {
            for (var i = 0; i < n; i++) {
                (function () {
                    var c = keep(scene.add.container(rnd(x0, x1), piso).setDepth(6));
                    var cuerpo = scene.add.ellipse(0, -8, 22, 13, 0xadb5bd);
                    var cabeza = scene.add.circle(10, -16, 6, 0x868e96);
                    var pico = scene.add.triangle(17, -16, 0, -2, 0, 2, 5, 0, 0xffa94d);
                    var ala = scene.add.ellipse(-2, -9, 14, 8, 0x868e96);
                    c.add([scene.add.ellipse(0, 0, 20, 4, 0x000000, 0.15), cuerpo, ala, cabeza, pico, scene.add.circle(12, -17, 1.4, 0x212529)]);
                    var d = item({ tipo: 'paloma', c: c, dir: Math.random() < 0.5 ? -1 : 1, vuela: 0, yb: piso, fase: Math.random() * 6 });
                    d.paso = function (t, dt) {
                        if (d.vuela > 0) {
                            d.vuela -= dt;
                            c.x += d.dir * 120 * dt / 1000; c.y -= 70 * dt / 1000;
                            ala.scaleY = Math.sin(t / 30) * 1.4;
                            if (d.vuela <= 0) { c.x = rnd(x0, x1); c.y = d.yb; ala.scaleY = 1; }
                            return;
                        }
                        var picoteo = Math.sin(t / 220 + d.fase) > 0.6;
                        cabeza.y = picoteo ? -10 : -16; pico.y = cabeza.y;
                        c.x += d.dir * 10 * dt / 1000;
                        if (c.x < x0 || c.x > x1) d.dir *= -1;
                        c.scaleX = d.dir;
                    };
                    d.toca = function (p) { return Math.hypot(p.x - c.x, p.y - (c.y - 10)) < 26; };
                    d.tocado = function () { d.vuela = 1600; SON.aleteo(); };
                })();
            }
        }

        /* ── Burbujas de jabón que flotan; al tocarlas revientan ── */

        function burbujas(z) {
            for (var i = 0; i < (z.n || 6); i++) {
                (function () {
                    var r = rnd(8, 16);
                    var c = keep(scene.add.container(rnd(z.x, z.x + z.w), rnd(z.y, z.y + z.h)).setDepth(z.depth || 9));
                    c.add([scene.add.circle(0, 0, r, 0xd0ebff, 0.25).setStrokeStyle(1.5, 0xffffff, 0.8), scene.add.ellipse(-r * 0.35, -r * 0.4, r * 0.5, r * 0.3, 0xffffff, 0.8)]);
                    var b = item({ tipo: 'burbuja', c: c, fase: Math.random() * 6, r: r });
                    b.paso = function (t, dt) {
                        c.y -= 14 * dt / 1000;
                        c.x += Math.sin(t / 800 + b.fase) * 0.4;
                        if (c.y < z.y - 20) { c.y = z.y + z.h; c.x = rnd(z.x, z.x + z.w); c.setScale(1).setAlpha(1); }
                    };
                    b.toca = function (p) { return Math.hypot(p.x - c.x, p.y - c.y) < r + 8; };
                    b.tocado = function () { SON.pop(); c.y = z.y + z.h + 10; };
                })();
            }
        }

        /* ── Gota que cae de una llave cada tanto ── */

        function gotas(x, y) {
            var g = item({ tipo: 'gota', prox: 0 });
            g.paso = function (t) {
                if (t < g.prox) return;
                g.prox = t + rnd(1800, 3500);
                var d = keep(scene.add.ellipse(x, y, 5, 7, 0x74c0fc).setDepth(30));
                scene.tweens.add({ targets: d, y: y + 40, duration: 450, ease: 'Quad.easeIn', onComplete: function () { d.destroy(); } });
            };
            return g;
        }

        /* ── Ropa colgada en un cordel que se mece; al tocarla se agita ── */

        function ropa(x0, x1, y) {
            var g = keep(scene.add.graphics().setDepth(2));
            var prendas = [];
            var colores = [0xff8787, 0x74c0fc, 0xffd43b, 0x8ce99a, 0xb197fc];
            var n = Math.max(3, Math.floor((x1 - x0) / 70));
            for (var i = 0; i < n; i++) prendas.push({ x: x0 + (x1 - x0) * (i + 0.5) / n, col: colores[i % 5], f: Math.random() * 6, tipo: i % 2 });
            var r = item({ tipo: 'ropa', g: g, viento: 0 });
            r.paso = function (t, dt) {
                if (r.viento > 0) r.viento -= dt;
                var v = 1 + (r.viento > 0 ? 3 : 0);
                g.clear();
                g.lineStyle(2, 0x868e96, 1); g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.strokePath();
                prendas.forEach(function (p) {
                    var s = Math.sin(t / 500 + p.f) * 4 * v;
                    g.fillStyle(p.col, 1);
                    if (p.tipo) { g.fillRect(p.x - 16 + s * 0.3, y, 32, 36); g.fillRect(p.x - 24 + s * 0.3, y, 10, 14); g.fillRect(p.x + 14 + s * 0.3, y, 10, 14); }
                    else { g.fillTriangle(p.x - 14, y, p.x + 14, y, p.x + s, y + 40); }
                    g.fillStyle(0xffffff, 1); g.fillRect(p.x - 10, y - 4, 4, 8); g.fillRect(p.x + 6, y - 4, 4, 8);
                });
            };
            r.toca = function (p) { return p.x > x0 && p.x < x1 && p.y > y - 10 && p.y < y + 50; };
            r.tocado = function () { r.viento = 1500; nota(300, 200, 0.4, 0.03, 'triangle'); };
            return r;
        }

        /* ── Móvil colgante (cuna/cama): gira; al tocarlo gira rápido y suena una cajita de música ── */

        function movil(x, y, ancho) {
            var c = keep(scene.add.container(x, y).setDepth(4));
            var hilo = scene.add.rectangle(0, -y / 2, 2, y, 0xadb5bd).setOrigin(0.5, 0.5);
            var barra = scene.add.rectangle(0, 0, ancho, 4, 0xd6a35c).setStrokeStyle(1, 0x8c5a2b);
            c.add([hilo, barra]);
            var piezas = [];
            var formas = ['luna', 'estrella', 'nube', 'estrella'];
            var colores = [0xffd43b, 0xf783ac, 0x74c0fc, 0x8ce99a];
            formas.forEach(function (f, i) {
                var p = scene.add.container((i - 1.5) * ancho / 3.2, 0);
                var largo = 30 + (i % 2) * 18;
                p.add(scene.add.rectangle(0, largo / 2, 1.5, largo, 0xced4da));
                var g = scene.add.graphics();
                g.fillStyle(colores[i], 1);
                if (f === 'luna') { g.fillCircle(0, largo + 12, 13); g.fillStyle(0xfff4e6, 1); g.fillCircle(6, largo + 8, 11); }
                else if (f === 'nube') { g.fillCircle(-8, largo + 12, 9); g.fillCircle(4, largo + 9, 11); g.fillCircle(13, largo + 13, 8); }
                else {
                    var pts = [];
                    for (var k = 0; k < 10; k++) { var a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? 6 : 14; pts.push({ x: Math.cos(a) * rr, y: largo + 12 + Math.sin(a) * rr }); }
                    g.fillPoints(pts, true);
                }
                p.add(g);
                c.add(p);
                piezas.push(p);
            });
            var m = item({ tipo: 'movil', c: c, vel: 1, giro: 0 });
            m.paso = function (t, dt) {
                m.vel += (1 - m.vel) * 0.01;
                m.giro += dt / 2200 * m.vel;
                // Giro en 3D simulado: la barra se acorta y las piezas se cruzan.
                var k = Math.cos(m.giro);
                barra.scaleX = Math.abs(k) * 0.9 + 0.1;
                piezas.forEach(function (p, i) {
                    p.x = (i - 1.5) * ancho / 3.2 * k;
                    p.angle = Math.sin(t / 600 + i) * 6 * m.vel;
                    p.setDepth && p.setDepth(0);
                });
            };
            m.toca = function (p) { return Math.abs(p.x - x) < ancho * 0.6 && p.y > y - 10 && p.y < y + 80; };
            m.tocado = function () {
                m.vel = 6;
                [1047, 1319, 1568, 1319, 1175, 1047].forEach(function (f, i) { nota(f, 0, 0.35, 0.04, 'sine', i * 0.18); });
            };
            return m;
        }

        /* ── El escenario reacciona al juego: festeja aciertos, se sorprende con errores (sin castigo) ── */

        function cerca(it, p) {
            var o = it.c || it;
            var x = o.x != null ? o.x : 0;
            return p ? Math.abs(x - p.x) : 0;
        }

        var ALEGRE = {
            sol: function (s) { s.guino = 1100; s.dibujar(); scene.tweens.add({ targets: s.c, scale: 1.25, duration: 220, yoyo: true, ease: 'Back.easeOut' }); },
            pajaro: function (p) { p.asustado = 1300; },
            mariposa: function (b) { b.prisa = 1300; },
            arbol: function (a, p, i) {
                if (cerca(a, p) > scene.scale.width * 0.3 && i % 2) return;
                a.sacudida = 500;
                for (var k = 0; k < 3; k++) hoja(a.c.x + rnd(-30, 30) * a.k, a.c.y - rnd(60, 110) * a.k, 0x69db7c);
            },
            estrellas: function (e) { e.fugaz = { x: rnd(40, scene.scale.width * 0.5), y: rnd(20, 80), dx: rnd(80, 140), dy: rnd(30, 60), k: 0 }; },
            pato: function (d) { d.onda = 900; scene.tweens.add({ targets: d.c, y: d.c.y - 10, duration: 140, yoyo: true, repeat: 1 }); },
            gato: function (m) { m.feliz = 1200; },
            noria: function (n) { n.vel = 4; },
            paloma: function (d, p, i) { if (i % 2 === 0) d.vuela = 1300; },
            movil: function (m) { m.vel = 4; },
            ropa: function (r) { r.viento = 900; },
            globo: function (g) { scene.tweens.add({ targets: g.c, y: g.c.y - 26, duration: 380, ease: 'Back.easeOut' }); }
        };

        var SUSTO = {
            sol: function (s) { scene.tweens.add({ targets: s.c, alpha: 0.55, duration: 260, yoyo: true, hold: 700 }); },
            nube: function (n, p, i) {
                if (i > 1) return;   // una o dos nubes se oscurecen un momento
                n.c.list.forEach(function (b) {
                    if (!b.setFillStyle) return;
                    var col = b.fillColor, al = b.fillAlpha;
                    b.setFillStyle(0xadb5bd, al);
                    scene.time.delayedCall(1100, function () { if (b.active) b.setFillStyle(col, al); });
                });
                scene.tweens.add({ targets: n.c, y: n.c.y + 6, duration: 300, yoyo: true, hold: 500 });
            },
            pajaro: function (p) { p.asustado = 700; },
            gato: function (m) { m.susto = 1000; },
            pato: function (d) { scene.tweens.add({ targets: d.c, angle: 8, duration: 70, yoyo: true, repeat: 3, onComplete: function () { d.c.angle = 0; } }); },
            mariposa: function (b) { b.prisa = 700; },
            paloma: function (d) { d.vuela = 900; }
        };

        function reaccionar(tipo, p) {
            var tabla = tipo === 'acierto' ? ALEGRE : SUSTO;
            var cuenta = {};
            items.forEach(function (it) {
                var f = tabla[it.tipo];
                if (!f) return;
                cuenta[it.tipo] = (cuenta[it.tipo] || 0) + 1;
                try { f(it, p, cuenta[it.tipo] - 1); } catch (e) { /* un adorno nunca debe romper el juego */ }
            });
        }

        var lento = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

        var api = {
            reaccionar: reaccionar,
            movil: movil,
            parque: parque, sol: sol, nube: nube, pajaros: pajaros, arbol: arbol, mariposas: mariposas, globos: globos,
            estrellas: estrellas, pato: pato, gato: gato, lluvia: lluvia, noria: noria, pendulo: pendulo, palomas: palomas,
            burbujas: burbujas, gotas: gotas, ropa: ropa, hoja: hoja, sonido: SON,
            // Movimiento reducido: el ambiente sigue vivo pero a un tercio de la velocidad.
            actualizar: function (t, dt) { if (lento) dt *= 0.33; items.forEach(function (it) { if (it.paso) it.paso(t, dt); }); },
            tocar: function (p) {
                for (var i = items.length - 1; i >= 0; i--) {
                    var it = items[i];
                    if (it.toca && it.toca(p)) { it.tocado(p); return true; }
                }
                return false;
            },
            elementos: function () { return items.map(function (it) { return it.tipo; }); },
            /** Los elementos de un tipo (p. ej. para que una escena final use el gato). */
            buscar: function (tipo) { return items.filter(function (it) { return it.tipo === tipo; }); }
        };
        return api;
    }

    global.AsociaVida = { montar: montar };
})(typeof window !== 'undefined' ? window : this);
