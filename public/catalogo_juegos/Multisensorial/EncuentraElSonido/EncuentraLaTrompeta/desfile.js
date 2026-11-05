/**
 * PedniaDesfile — "El desfile" (Encuentra la trompeta, 3-4 años) en Phaser 4.2.1.
 *
 * Una plaza en fiesta. Por la calle pasan carrozas; en cada una va un elemento. Las
 * carrozas no se detienen: el sonido sale de donde va la trompeta (izquierda/derecha)
 * y hay que tocarla mientras pasa.
 *   desfile → 3 carrozas a la vista, despacio (reto del documento).
 *   mas     → llegan más carrozas.
 *   sombras → las carrozas van tapadas con una sábana: solo se ve la silueta.
 *   filas   → dos desfiles: uno va y otro viene.
 * Premio propio de este juego: cada trompeta encontrada se sube a la tarima y la banda
 * crece. Al final toda la banda toca.
 *
 * Audio, voz y orden de rondas: script.js, mediante callbacks
 *   puedeTocar(), onAcierto(id), onError(id, {pan})
 *
 * API: montar, prepararRonda, jugar, pausar, celebrar, subirTarima, pista, resaltar,
 *      demo, limpiarDemo, rectDe, panDe, fiestaFinal, estado, destruir.
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

    var FIESTA = [0xff6b6b, 0xfcc419, 0x51cf66, 0x339af0, 0xcc5de8, 0xff922b];
    var CARROZA = [0xe64980, 0x7950f2, 0x1c7ed6, 0x0ca678, 0xf59f00, 0xe8590c];
    var FACHADAS = [0xffc9c9, 0xffe8cc, 0xd3f9d8, 0xd0ebff, 0xe5dbff, 0xfff3bf];
    var PIEL = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac];
    var SILUETA = 0x2b2140;

    function elemento(id) {
        return (gameConfig && gameConfig.elementos && gameConfig.elementos[id]) || {};
    }

    function tex(id) {
        return 'desfile:' + id;
    }

    function reducido() {
        return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function sfx(nombre) {
        if (global.EncuentraSonidoSfx) global.EncuentraSonidoSfx.sonar(nombre);
    }

    function avisar(nombre) {
        var fn = callbacks && callbacks[nombre];
        if (typeof fn !== 'function') return undefined;
        try {
            return fn.apply(null, Array.prototype.slice.call(arguments, 1));
        } catch (e) { return undefined; }
    }

    function puedeTocar() {
        var r = avisar('puedeTocar');
        return r === undefined ? true : !!r;
    }

    function rnd(a, b) {
        return a + Math.random() * (b - a);
    }

    function mezclar(lista) {
        var out = lista.slice();
        for (var i = out.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = out[i];
            out[i] = out[j];
            out[j] = t;
        }
        return out;
    }

    function esperar(scene, ms) {
        return new Promise(function (r) { scene.time.delayedCall(ms, r); });
    }

    function esperarEscena() {
        if (sceneRef) return Promise.resolve(sceneRef);
        return readyPromise || Promise.reject(new Error('Phaser no montado'));
    }

    function inyectarEstilo() {
        var doc = global.document;
        if (doc.getElementById('desfile-css')) return;
        var css = doc.createElement('style');
        css.id = 'desfile-css';
        css.textContent = [
            '#desfile-canvas{position:fixed;inset:0;z-index:0;touch-action:none}',
            '#desfile-canvas canvas{display:block;width:100% !important;height:100% !important}',
            'body.modo-desfile{background:#ffe8cc !important}',
            'body.modo-desfile #principal{position:relative;z-index:1;pointer-events:none;background:transparent}',
            'body.modo-desfile #principal button,body.modo-desfile .dialogo{pointer-events:auto}',
            'body.modo-desfile .escenario{grid-template-columns:minmax(0,1fr);grid-template-areas:"centro"}',
            'body.modo-desfile .escena{border:0 !important;box-shadow:none !important;background:transparent !important}',
            'body.modo-desfile .parque-fondo,body.modo-desfile #zonas,body.modo-desfile #elementos{display:none !important}',
            'body.modo-desfile .pj{position:fixed;bottom:0;z-index:2;pointer-events:none;--pj-alto:min(20vh,160px)}',
            'body.modo-desfile .pj-zoe{left:6px}',
            'body.modo-desfile .pj-zeus{right:6px}',
            'body.modo-desfile .cabecera{padding-top:8px}'
        ].join('');
        doc.head.appendChild(css);
    }

    var EscenaDesfile = new Phaser.Class({
        Extends: Phaser.Scene,

        initialize: function EscenaDesfile() {
            Phaser.Scene.call(this, { key: 'EscenaDesfile' });
            this.carrozas = [];
            this.carriles = [];
            this.publico = [];
            this.banda = [];
            this.modo = 'desfile';
            this.objetivo = null;
            this.jugando = false;
            this.ronda = 0;
            this.demoObj = null;
        },

        create: function () {
            this.cielo = this.add.graphics().setDepth(-30);
            this.fondo = this.add.graphics().setDepth(-25);
            this.banderines = this.add.graphics().setDepth(-20);
            this.via = this.add.graphics().setDepth(-10);
            this.tarima = this.add.graphics().setDepth(-6);
            this.crearPublico();
            this.dibujarFondo();
            var scene = this;
            this.scale.on('resize', function () { scene.dibujarFondo(); });
            sceneRef = this;
            if (readyResolve) {
                readyResolve(this);
                readyResolve = null;
            }
            this.input.on('pointerdown', this.alTocar, this);
        },

        shutdown: function () {
            this.tweens.killAll();
            if (sceneRef === this) sceneRef = null;
        },

        /** Suelo del carril cercano (0) y del lejano (1). */
        sueloCarril: function (i) {
            var h = this.scale.height;
            return i ? h * 0.66 : h * 0.88;
        },

        escalaCarril: function (i) {
            return i ? 0.72 : 1;
        },

        anchoCarroza: function () {
            return Math.min(this.scale.width * 0.19, this.scale.height * 0.3, 240);
        },

        /* ── Escenario: cielo, fachadas, banderines, calle y tarima ── */

        dibujarFondo: function () {
            var w = this.scale.width;
            var h = this.scale.height;
            var g = this.cielo;
            g.clear();
            for (var b = 0; b < 16; b++) {
                var c = Phaser.Display.Color.Interpolate.ColorWithColor(
                    Phaser.Display.Color.ValueToColor(0x4dabf7),
                    Phaser.Display.Color.ValueToColor(0xd0ebff), 100, Math.round(b / 15 * 100));
                g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
                g.fillRect(0, (h * 0.5 / 16) * b - 1, w, h * 0.5 / 16 + 2);
            }

            // Fachadas de la plaza: casas de colores con ventanas y balcones.
            var f = this.fondo;
            f.clear();
            var acera = h * 0.56;
            var n = Math.max(5, Math.round(w / 190));
            var aw = w / n;
            for (var i = 0; i < n; i++) {
                var alto = h * (0.3 + ((i * 37) % 11) / 60);
                var x = i * aw;
                f.fillStyle(FACHADAS[i % FACHADAS.length], 1);
                f.fillRect(x, acera - alto, aw + 1, alto);
                f.fillStyle(0x000000, 0.06);
                f.fillRect(x + aw - 6, acera - alto, 6, alto);
                // Tejado plano con borde.
                f.fillStyle(0xc0603a, 1);
                f.fillRect(x - 2, acera - alto - 10, aw + 4, 12);
                var filas = Math.max(1, Math.floor(alto / (h * 0.11)));
                for (var r = 0; r < filas; r++) {
                    for (var k = 0; k < 2; k++) {
                        var vx = x + aw * (0.22 + k * 0.38);
                        var vy = acera - alto + h * 0.04 + r * h * 0.1;
                        if (vy > acera - h * 0.08) continue;
                        f.fillStyle(0x74c0fc, 1);
                        f.fillRoundedRect(vx, vy, aw * 0.2, h * 0.055, 4);
                        f.fillStyle(0xffffff, 0.6);
                        f.fillRect(vx + 3, vy + 3, aw * 0.07, h * 0.02);
                        f.lineStyle(3, 0x495057, 1);
                        f.lineBetween(vx - 3, vy + h * 0.06, vx + aw * 0.2 + 3, vy + h * 0.06);
                    }
                }
            }
            // Acera donde mira el público.
            f.fillStyle(0xdee2e6, 1);
            f.fillRect(0, acera, w, h * 0.04);

            // Banderines de fiesta cruzando la plaza.
            var bd = this.banderines;
            bd.clear();
            [0.14, 0.26].forEach(function (yy, j) {
                var y0 = h * yy;
                bd.lineStyle(2, 0x495057, 0.8);
                var puntos = [];
                for (var px = 0; px <= w; px += 8) puntos.push({ x: px, y: y0 + Math.sin((px / w) * Math.PI * 3 + j) * h * 0.025 });
                bd.strokePoints(puntos);
                for (var q = 0; q * 34 < w; q++) {
                    var bx = q * 34 + 6 + j * 17;
                    var by = y0 + Math.sin((bx / w) * Math.PI * 3 + j) * h * 0.025;
                    bd.fillStyle(FIESTA[(q + j) % FIESTA.length], 1);
                    bd.fillTriangle(bx, by, bx + 22, by, bx + 11, by + 24);
                }
            });

            // Calle del desfile: dos carriles con línea punteada.
            var v = this.via;
            v.clear();
            v.fillStyle(0xadb5bd, 1);
            v.fillRect(0, h * 0.6, w, h * 0.4);
            v.fillStyle(0x868e96, 1);
            v.fillRect(0, h * 0.6, w, 6);
            v.fillStyle(0xffffff, 0.9);
            for (var d = 0; d < w; d += 70) v.fillRect(d, h * 0.765, 40, 6);

            this.dibujarTarima();
            this.ubicarPublico();
        },

        /** Tarima de la banda, arriba a la derecha (ahí suben las trompetas encontradas). */
        dibujarTarima: function () {
            var w = this.scale.width;
            var h = this.scale.height;
            var t = this.tarima;
            t.clear();
            var tw = Math.min(w * 0.24, 300);
            var x0 = w - tw - w * 0.02;
            var y0 = h * 0.5;
            this.tarimaRect = { x: x0, y: y0, w: tw };
            // Techo a rayas.
            t.fillStyle(0xffffff, 1);
            t.fillRect(x0 - 8, y0 - h * 0.26, tw + 16, h * 0.05);
            for (var i = 0; i < 8; i++) {
                t.fillStyle(i % 2 ? 0xffffff : 0xe03131, 1);
                t.fillTriangle(x0 - 8 + i * (tw + 16) / 8, y0 - h * 0.21, x0 - 8 + (i + 1) * (tw + 16) / 8, y0 - h * 0.21,
                    x0 - 8 + (i + 0.5) * (tw + 16) / 8, y0 - h * 0.185);
            }
            t.fillStyle(0xe03131, 1);
            t.fillRect(x0 - 8, y0 - h * 0.26, tw + 16, h * 0.012);
            // Postes.
            t.fillStyle(0x8d5524, 1);
            t.fillRect(x0, y0 - h * 0.21, 8, h * 0.21);
            t.fillRect(x0 + tw - 8, y0 - h * 0.21, 8, h * 0.21);
            // Plataforma.
            t.fillStyle(0xa0522d, 1);
            t.fillRect(x0 - 10, y0, tw + 20, h * 0.05);
            t.fillStyle(0x7f3f1d, 1);
            for (var k = 0; k < 6; k++) t.fillRect(x0 - 10 + k * (tw + 20) / 6, y0, 3, h * 0.05);
            // Las trompetas ya en la tarima se reacomodan.
            var scene = this;
            this.banda.forEach(function (m, j) {
                var p = scene.puestoBanda(j);
                m.setPosition(p.x, p.y);
                m.base = p.y;
            });
        },

        puestoBanda: function (i) {
            var r = this.tarimaRect;
            var cols = 4;
            var col = i % cols;
            var fila = Math.floor(i / cols);
            return { x: r.x + r.w * (0.14 + col * 0.24), y: r.y - fila * this.scale.height * 0.07 };
        },

        /** Público en la acera: se mece con la música y salta cuando se acierta. */
        crearPublico: function () {
            for (var i = 0; i < 26; i++) {
                var c = this.add.container(0, 0).setDepth(-15);
                var color = FIESTA[(i * 5) % FIESTA.length];
                var cuerpo = this.add.ellipse(0, -16, 26, 34, color);
                var cabeza = this.add.circle(0, -40, 11, PIEL[i % PIEL.length]);
                var brazo = this.add.rectangle(10, -26, 6, 20, PIEL[i % PIEL.length]).setOrigin(0.5, 1);
                c.add([brazo, cuerpo, cabeza]);
                c.brazo = brazo;
                c.fase = Math.random() * Math.PI * 2;
                c.escala = rnd(0.85, 1.15);
                this.publico.push(c);
            }
        },

        ubicarPublico: function () {
            var w = this.scale.width;
            var h = this.scale.height;
            var n = this.publico.length;
            var limite = this.tarimaRect ? this.tarimaRect.x - 20 : w;
            this.publico.forEach(function (c, i) {
                c.x = (limite / n) * (i + 0.5) + ((i * 13) % 9) - 4;
                c.y = h * 0.6 - ((i % 2) * 6);
                c.base = c.y;
                c.setScale(c.escala * Math.min(1.3, h / 640));
            });
        },

        /* ── Carrozas ──────────────────────────────────────────────── */

        crearCarroza: function (id, carril, color) {
            var W = this.anchoCarroza();
            var r = W * 0.11;
            var Hf = W * 0.3;
            var cont = this.add.container(0, this.sueloCarril(carril));
            // Bandera en un mástil.
            var mastil = this.add.rectangle(-W * 0.42, -r - Hf, 4, W * 0.5, 0x495057).setOrigin(0.5, 1);
            var bandera = this.add.triangle(-W * 0.42 + 2, -r - Hf - W * 0.5, 0, 0, W * 0.2, W * 0.07, 0, W * 0.14, FIESTA[(carril * 3 + Math.floor(Math.random() * 6)) % FIESTA.length]).setOrigin(0, 0);
            // Plataforma con faldón de flecos.
            var g = this.add.graphics();
            g.fillStyle(color, 1);
            g.fillRoundedRect(-W / 2, -r - Hf, W, Hf * 0.7, 10);
            g.fillStyle(0xffffff, 0.25);
            g.fillRect(-W / 2 + 8, -r - Hf + 6, W - 16, 6);
            var flecos = 9;
            for (var i = 0; i < flecos; i++) {
                g.fillStyle(i % 2 ? 0xffd43b : 0xffffff, 1);
                var fx = -W / 2 + (W / flecos) * i;
                g.fillTriangle(fx, -r - Hf * 0.32, fx + W / flecos, -r - Hf * 0.32, fx + W / flecos / 2, -r + 2);
            }
            // Estrellas pintadas en el costado.
            g.fillStyle(0xffffff, 0.9);
            g.fillCircle(-W * 0.2, -r - Hf * 0.66, 4);
            g.fillCircle(W * 0.2, -r - Hf * 0.66, 4);
            g.fillCircle(0, -r - Hf * 0.66, 5);
            var ruedas = [-W * 0.3, W * 0.3].map(function (x) {
                var rg = this.add.graphics({ x: x, y: -r });
                rg.fillStyle(0x343a40, 1);
                rg.fillCircle(0, 0, r);
                rg.fillStyle(0xced4da, 1);
                rg.fillCircle(0, 0, r * 0.5);
                rg.lineStyle(3, 0x868e96, 1);
                rg.lineBetween(-r * 0.5, 0, r * 0.5, 0);
                rg.lineBetween(0, -r * 0.5, 0, r * 0.5);
                return rg;
            }, this);
            var img = this.add.image(0, -r - Hf + 6, tex(id)).setOrigin(0.5, 1);
            var caja = W * 0.78;
            var esc = Math.min(caja / (img.width || 1), caja / (img.height || 1));
            img.setScale(esc);
            // Sábana (ronda "sombras"): domo claro sobre la silueta.
            var sabana = this.add.graphics();
            sabana.fillStyle(0xfff9db, 0.78);
            var sh = img.height * esc + 14;
            var rad = Math.max(6, Math.min(caja / 2, sh - 10));
            sabana.fillRoundedRect(-caja / 2 - 6, -r - Hf + 6 - sh, caja + 12, sh, { tl: rad, tr: rad, bl: 6, br: 6 });
            sabana.lineStyle(3, 0xffffff, 0.9);
            sabana.strokeRoundedRect(-caja / 2 - 6, -r - Hf + 6 - sh, caja + 12, sh, { tl: rad, tr: rad, bl: 6, br: 6 });
            sabana.setVisible(false);
            var brillo = this.add.ellipse(0, -r - Hf * 0.6, W * 1.2, Hf * 1.6, 0xffe066, 0).setVisible(true);
            cont.add([brillo, mastil, bandera, g, ruedas[0], ruedas[1], img, sabana]);
            var c = {
                id: id, cont: cont, img: img, sabana: sabana, bandera: bandera, brillo: brillo, ruedas: ruedas,
                carril: carril, W: W, r: r, Hf: Hf, escImg: esc, tapada: false, resaltada: false,
                altoImg: img.height * esc, salto: 0, fase: Math.random() * 6
            };
            cont.setScale(this.escalaCarril(carril));
            cont.setDepth(carril ? 2 : 4);
            return c;
        },

        destruirCarrozas: function () {
            this.carrozas.forEach(function (c) { c.cont.destroy(); });
            this.carrozas = [];
            this.carriles = [];
        },

        /**
         * Arma el desfile de la ronda. Las carrozas entran rápido desde un costado y frenan
         * a paso de desfile; la promesa se cumple cuando ya marchan.
         */
        prepararRonda: function (o) {
            var scene = this;
            this.jugando = false;
            this.modo = o.modo || 'desfile';
            this.ronda = o.ronda || 0;
            this.objetivo = o.objetivo;
            this.destruirCarrozas();
            var w = this.scale.width;
            var ids = mezclar(o.elementos);
            // Que el objetivo no encabece el desfile: así hay que esperarlo y escucharlo.
            if (ids[0] === o.objetivo && ids.length > 1) ids.push(ids.shift());
            var dosFilas = this.modo === 'filas';
            var porCarril = dosFilas ? [[], []] : [ids, []];
            if (dosFilas) ids.forEach(function (id, i) { porCarril[i % 2].push(id); });
            var lento = o.dificultad === '56' ? 1.25 : 1;
            var promesas = [];
            porCarril.forEach(function (lista, k) {
                if (!lista.length) return;
                var W = scene.anchoCarroza() * scene.escalaCarril(k);
                var sp = Math.max(W * 1.55, (w + W * 2) / Math.max(lista.length, 2));
                var largo = Math.max(lista.length * sp, w + W * 2);
                var dir = k ? -1 : 1;
                var carril = {
                    i: k, dir: dir, sp: sp, largo: largo, W: W,
                    base: (w / 13) * lento * (k ? 0.9 : 1) * (scene.modo === 'mas' ? 1.2 : 1),
                    vel: 0
                };
                carril.vel = carril.base * 5;
                scene.carriles[k] = carril;
                lista.forEach(function (id, n) {
                    var c = scene.crearCarroza(id, k, CARROZA[(n * 2 + k) % CARROZA.length]);
                    c.x = dir > 0 ? -W / 2 - n * sp : w + W / 2 + n * sp;
                    c.cont.x = c.x;
                    if (scene.modo === 'sombras') scene.tapar(c, true);
                    scene.carrozas.push(c);
                });
                promesas.push(new Promise(function (resolve) { carril.alMarchar = resolve; }));
            });
            if (reducido()) {
                // Sin movimiento: las carrozas quedan quietas y repartidas.
                this.carrozas.forEach(function (c, i, todas) {
                    var enCarril = todas.filter(function (o2) { return o2.carril === c.carril; });
                    var idx = enCarril.indexOf(c);
                    c.x = (w / (enCarril.length + 1)) * (idx + 1);
                    c.cont.x = c.x;
                });
                this.carriles.forEach(function (l) {
                    if (!l) return;
                    l.vel = 0;
                    l.base = 0;
                    var r = l.alMarchar;
                    l.alMarchar = null;
                    if (r) r();
                });
            }
            sfx('magia');
            return Promise.all(promesas);
        },

        tapar: function (c, si) {
            c.tapada = si;
            c.sabana.setVisible(si);
            if (si) c.img.setTint(SILUETA); else c.img.clearTint();
        },

        destapar: function (c) {
            if (!c.tapada) return;
            c.tapada = false;
            c.img.clearTint();
            var scene = this;
            sfx('zas');
            this.tweens.add({
                targets: c.sabana, y: -c.altoImg * 0.8, alpha: 0, angle: 25, duration: reducido() ? 1 : 420, ease: 'Quad.easeOut',
                onComplete: function () { c.sabana.setVisible(false); c.sabana.setAlpha(1); c.sabana.y = 0; c.sabana.angle = 0; if (!scene.carrozas.length) return; }
            });
        },

        jugar: function () {
            this.jugando = true;
        },

        pausar: function () {
            this.jugando = false;
        },

        update: function (time, delta) {
            var w = this.scale.width;
            var dt = Math.min(delta, 50) / 1000;
            var scene = this;
            var musica = time / 260;
            this.publico.forEach(function (p) {
                p.y = p.base - Math.abs(Math.sin(musica * 0.5 + p.fase)) * 3;
                p.brazo.angle = Math.sin(musica + p.fase) * 25;
            });
            this.banda.forEach(function (m, i) {
                m.y = m.base - Math.abs(Math.sin(musica + i)) * 6;
                m.angle = Math.sin(musica * 0.5 + i) * 8;
            });
            // Carriles: frenan de la entrada rápida al paso de desfile.
            this.carriles.forEach(function (l) {
                if (!l || l.parado) return;
                if (l.alMarchar) {
                    var guia = scene.carrozas.filter(function (c) { return c.carril === l.i; })
                        .reduce(function (m, c) { return Math.max(m, l.dir > 0 ? c.x : w - c.x); }, -Infinity);
                    if (guia > w * 0.72) {
                        l.vel += (l.base - l.vel) * Math.min(1, dt * 3);
                        if (Math.abs(l.vel - l.base) < l.base * 0.05) { l.vel = l.base; var r = l.alMarchar; l.alMarchar = null; r(); }
                    }
                } else if (l.salida) {
                    l.vel += l.base * 3 * dt;
                } else {
                    l.vel += (l.base - l.vel) * Math.min(1, dt * 2);
                }
            });
            this.carrozas.forEach(function (c) {
                var l = scene.carriles[c.carril];
                var paso = l && !l.parado ? l.vel * l.dir * dt : 0;
                c.x += paso;
                // Vuelta: la carroza que sale por un lado entra otra vez por el otro.
                if (l && !l.salida) {
                    if (l.dir > 0 && c.x > w + l.W / 2 + 4) c.x -= l.largo;
                    if (l.dir < 0 && c.x < -l.W / 2 - 4) c.x += l.largo;
                }
                c.cont.x = c.x;
                c.cont.y = scene.sueloCarril(c.carril);
                c.ruedas.forEach(function (rg) { rg.rotation += paso / c.r; });
                // Marcha: el elemento brinca al ritmo y la bandera ondea.
                var brinco = paso !== 0 && !reducido() ? Math.abs(Math.sin(musica + c.fase)) * 5 : 0;
                c.img.y = -c.r - c.Hf + 6 - brinco - c.salto;
                c.bandera.scaleX = 0.8 + 0.2 * Math.sin(time / (c.resaltada ? 60 : 160) + c.fase);
                c.brillo.fillAlpha = c.resaltada ? 0.25 + 0.2 * Math.sin(time / 140) : 0;
                if (c.tapada) c.sabana.y = -brinco - c.salto;
            });
        },

        carrozaDe: function (id) {
            for (var i = 0; i < this.carrozas.length; i++) if (this.carrozas[i].id === id) return this.carrozas[i];
            return null;
        },

        /** Pista: la sábana del objetivo se levanta un instante (o su carroza da un brinco). */
        pista: function (id) {
            var c = this.carrozaDe(id);
            if (!c || reducido()) return;
            if (c.tapada) {
                this.tweens.add({ targets: c.sabana, alpha: 0.15, duration: 200, yoyo: true, hold: 900 });
                c.img.clearTint();
                var scene = this;
                this.time.delayedCall(1300, function () { if (c.tapada && scene.carrozas.indexOf(c) !== -1) c.img.setTint(SILUETA); });
            }
            this.tweens.add({ targets: c, salto: c.altoImg * 0.25, duration: 160, yoyo: true, repeat: 1, ease: 'Quad.easeOut' });
        },

        resaltar: function (id, si) {
            var c = this.carrozaDe(id);
            if (c) c.resaltada = !!si;
        },

        /* ── Toques ───────────────────────────────────────────────── */

        alTocar: function (pointer) {
            if (!this.jugando || !puedeTocar()) return;
            var px = pointer.worldX;
            var py = pointer.worldY;
            // Primero el carril cercano (va delante).
            var orden = this.carrozas.slice().sort(function (a, b) { return a.carril - b.carril; });
            for (var i = 0; i < orden.length; i++) {
                var c = orden[i];
                var s = this.escalaCarril(c.carril);
                var suelo = this.sueloCarril(c.carril);
                var arriba = suelo - (c.r + c.Hf + c.altoImg) * s - 10;
                if (Math.abs(px - c.x) < (c.W / 2) * s + 8 && py > arriba && py < suelo + 6) {
                    this.responder(c);
                    return;
                }
            }
        },

        responder: function (c) {
            var scene = this;
            this.destapar(c);
            if (c.id === this.objetivo) {
                this.jugando = false;
                avisar('onAcierto', c.id);
                return;
            }
            // No era: brinca en su carroza, suena como es y el desfile sigue.
            if (!reducido()) this.tweens.add({ targets: c, salto: c.altoImg * 0.3, duration: 150, yoyo: true, repeat: 1, ease: 'Quad.easeOut' });
            avisar('onError', c.id, { pan: this.panDe(c.id) });
            if (this.modo === 'sombras') {
                this.time.delayedCall(1800, function () {
                    if (scene.carrozas.indexOf(c) !== -1 && scene.modo === 'sombras') {
                        c.sabana.setAlpha(0);
                        scene.tapar(c, true);
                        scene.tweens.add({ targets: c.sabana, alpha: 1, duration: 300 });
                    }
                });
            }
        },

        /* ── Premio: la banda en la tarima ───────────────────────── */

        /** El desfile se detiene y la trompeta crece y se encoge mientras suena. */
        celebrar: function (id) {
            var c = this.carrozaDe(id) || (this.demoObj && this.demoObj.id === id ? this.demoObj : null);
            if (!c) return Promise.resolve();
            var scene = this;
            this.carriles.forEach(function (l) { if (l) l.parado = true; });
            this.destapar(c);
            c.resaltada = false;
            var s = this.escalaCarril(c.carril);
            var cx = c.x;
            var cy = this.sueloCarril(c.carril) - (c.r + c.Hf + c.altoImg / 2) * s;
            this.estrellas(cx, cy, 18);
            this.notas(cx, cy, 6);
            if (!reducido()) {
                this.tweens.add({ targets: c.img, scale: c.escImg * 1.35, duration: 260, yoyo: true, repeat: 2, ease: 'Sine.easeInOut' });
                // El público salta.
                this.publico.forEach(function (p, i) {
                    scene.tweens.add({ targets: p, y: p.base - 14, duration: 180, yoyo: true, delay: (i % 6) * 40 });
                });
            }
            return esperar(scene, 1400);
        },

        /** La trompeta vuela a la tarima; el desfile se va y la calle queda lista para otro. */
        subirTarima: function (id) {
            var c = this.carrozaDe(id);
            var scene = this;
            if (!c) return Promise.resolve();
            var s = this.escalaCarril(c.carril);
            var desde = { x: c.x, y: this.sueloCarril(c.carril) - (c.r + c.Hf) * s };
            c.img.setVisible(false);
            var m = this.add.image(desde.x, desde.y, tex(id)).setOrigin(0.5, 1).setDepth(8);
            var alto = this.scale.height * 0.1;
            m.setScale(alto / (m.height || 1));
            var p = this.puestoBanda(this.banda.length);
            return new Promise(function (resolve) {
                sfx('zas');
                scene.tweens.add({
                    targets: m, x: p.x, duration: reducido() ? 1 : 900, ease: 'Sine.easeInOut'
                });
                scene.tweens.add({
                    targets: m, y: { from: desde.y, to: p.y }, duration: reducido() ? 1 : 900, ease: function (t) { return t + Math.sin(t * Math.PI) * 0.6; },
                    onComplete: function () {
                        // Ya en la tarima: se suma a la banda y se mece con la música.
                        m.base = p.y;
                        scene.banda.push(m);
                        m.setDepth(-5);
                        sfx('recompensa');
                        scene.estrellas(p.x, p.y - alto / 2, 10);
                        scene.notas(p.x, p.y - alto, 4);
                        resolve();
                    }
                });
            }).then(function () {
                // El desfile reanuda y sale de la calle.
                scene.carriles.forEach(function (l) { if (l) { l.parado = false; l.salida = true; l.vel = l.base; } });
                return new Promise(function (resolve) {
                    var w = scene.scale.width;
                    var revisar = scene.time.addEvent({
                        delay: 100, loop: true, callback: function () {
                            var quedan = scene.carrozas.some(function (k) { return k.x > -k.W && k.x < w + k.W; });
                            if (!quedan || reducido()) { revisar.remove(); scene.destruirCarrozas(); resolve(); }
                        }
                    });
                });
            });
        },

        fiestaFinal: function () {
            var scene = this;
            this.jugando = false;
            this.carriles.forEach(function (l) { if (l) l.parado = true; });
            var r = this.tarimaRect;
            this.banda.forEach(function (m, i) {
                if (!reducido()) scene.tweens.add({ targets: m, scale: m.scale * 1.25, duration: 220, yoyo: true, repeat: 5, delay: i * 90 });
            });
            if (r) {
                this.notas(r.x + r.w / 2, r.y - this.scale.height * 0.12, 12);
                this.time.delayedCall(700, function () { scene.notas(r.x + r.w / 2, r.y - scene.scale.height * 0.12, 10); });
            }
            this.publico.forEach(function (p, i) {
                if (!reducido()) scene.tweens.add({ targets: p, y: p.base - 18, duration: 200, yoyo: true, repeat: 4, delay: (i % 5) * 60 });
            });
            this.confeti();
            return esperar(this, 2600);
        },

        /* ── Efectos y utilidades ───────────────────────────────── */

        notas: function (x, y, n) {
            if (reducido()) return;
            for (var i = 0; i < n; i++) {
                var t = this.add.text(x + rnd(-30, 30), y, i % 2 ? '♪' : '♫', {
                    fontFamily: 'Arial', fontSize: Math.round(rnd(26, 40)) + 'px', color: '#' + FIESTA[i % FIESTA.length].toString(16).padStart(6, '0'),
                    stroke: '#ffffff', strokeThickness: 4
                }).setOrigin(0.5).setDepth(21);
                this.tweens.add({
                    targets: t, y: y - rnd(80, 160), x: t.x + rnd(-50, 50), alpha: 0, angle: rnd(-30, 30),
                    duration: rnd(900, 1400), delay: i * 90,
                    onComplete: (function (o) { return function () { o.destroy(); }; })(t)
                });
            }
        },

        estrellas: function (x, y, n) {
            if (reducido()) return;
            for (var i = 0; i < n; i++) {
                var a = (Math.PI * 2 / n) * i;
                var d = rnd(60, 150);
                var st = this.add.star(x, y, 5, 4, 10, FIESTA[i % FIESTA.length]).setDepth(20);
                this.tweens.add({
                    targets: st, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, angle: 180,
                    duration: rnd(600, 950), onComplete: (function (o) { return function () { o.destroy(); }; })(st)
                });
            }
        },

        confeti: function () {
            if (reducido()) return;
            var w = this.scale.width;
            var h = this.scale.height;
            for (var i = 0; i < 60; i++) {
                var c = this.add.rectangle(rnd(0, w), -20, rnd(8, 14), rnd(5, 9), FIESTA[i % FIESTA.length]).setDepth(20);
                this.tweens.add({
                    targets: c, y: h + 30, x: c.x + rnd(-80, 80), angle: rnd(180, 720), duration: rnd(1400, 2200), delay: rnd(0, 900),
                    onComplete: (function (o) { return function () { o.destroy(); }; })(c)
                });
            }
        },

        /** Ejemplo guiado: una sola carroza quieta en el centro. */
        demo: function (id) {
            this.destruirCarrozas();
            var c = this.crearCarroza(id, 0, CARROZA[0]);
            c.x = this.scale.width / 2;
            c.cont.x = c.x;
            this.carrozas.push(c);
            this.carriles[0] = { i: 0, dir: 1, vel: 0, base: 0, largo: 1e9, W: c.W, parado: true };
            this.demoObj = c;
        },

        limpiarDemo: function () {
            this.demoObj = null;
            this.destruirCarrozas();
            return Promise.resolve();
        },

        rectDe: function (id) {
            var c = this.carrozaDe(id);
            if (!c) return null;
            var r = this.game.canvas.getBoundingClientRect();
            var sx = r.width / this.scale.width;
            var sy = r.height / this.scale.height;
            var s = this.escalaCarril(c.carril);
            var suelo = this.sueloCarril(c.carril);
            var ancho = c.W * 0.8 * s;
            var alto = c.altoImg * s;
            var arriba = suelo - (c.r + c.Hf + c.altoImg) * s;
            return {
                x: r.left + c.x * sx,
                y: r.top + (arriba + alto / 2) * sy,
                left: r.left + (c.x - ancho / 2) * sx,
                top: r.top + arriba * sy,
                width: ancho * sx,
                height: alto * sy
            };
        },

        /** El sonido sale de donde va la carroza en este momento. */
        panDe: function (id) {
            var c = this.carrozaDe(id);
            if (!c) return 0;
            return Phaser.Math.Clamp((c.x / this.scale.width) * 2 - 1, -1, 1) * 0.85;
        },

        estado: function () {
            return {
                jugando: this.jugando,
                modo: this.modo,
                ronda: this.ronda,
                objetivo: this.objetivo,
                banda: this.banda.length,
                carriles: this.carriles.map(function (l) { return l ? { dir: l.dir, vel: Math.round(l.vel), parado: !!l.parado } : null; }),
                carrozas: this.carrozas.map(function (c) {
                    return { id: c.id, carril: c.carril, x: Math.round(c.x), tapada: c.tapada };
                })
            };
        }
    });

    function cargarTexturas(scene) {
        var elems = (gameConfig && gameConfig.elementos) || {};
        var lista = [];
        Object.keys(elems).forEach(function (id) {
            if (elems[id].img) lista.push({ key: tex(id), src: elems[id].img });
        });
        lista = lista.filter(function (t) { return !scene.textures.exists(t.key); });
        if (!lista.length) return Promise.resolve();
        return new Promise(function (resolve) {
            lista.forEach(function (t) {
                if (/\.svg(\?|$)/i.test(t.src)) scene.load.svg(t.key, t.src, { scale: 2 });
                else scene.load.image(t.key, t.src);
            });
            scene.load.once('complete', resolve);
            scene.load.start();
        });
    }

    function montar(opts) {
        opts = opts || {};
        Host = global.PedniaPhaserHost;
        Phaser = global.Phaser;
        if (!Phaser) return Promise.reject(new Error('Phaser no cargado'));
        if (!Host) return Promise.reject(new Error('PedniaPhaserHost no cargado'));
        gameConfig = opts.gameConfig || null;
        callbacks = opts.callbacks || {};
        readyPromise = new Promise(function (resolve) { readyResolve = resolve; });
        inyectarEstilo();
        var doc = global.document;
        var el = doc.getElementById('desfile-canvas');
        if (!el) {
            el = doc.createElement('div');
            el.id = 'desfile-canvas';
            doc.body.insertBefore(el, doc.body.firstChild);
        }
        doc.body.classList.add('modo-desfile');
        Host.destruirIntro();
        game = Host.crear({
            type: Phaser.AUTO,
            parent: el,
            width: global.innerWidth || 1024,
            height: global.innerHeight || 640,
            backgroundColor: '#d0ebff',
            audio: { noAudio: true },
            scene: [EscenaDesfile],
            scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }
        });
        if (!game) {
            doc.body.classList.remove('modo-desfile');
            return Promise.reject(new Error('No se pudo crear Phaser.Game'));
        }
        return esperarEscena().then(function (scene) {
            return cargarTexturas(scene).then(function () { return scene; });
        });
    }

    function conEscena(fn) {
        return function () {
            if (!sceneRef) return undefined;
            return fn.apply(null, [sceneRef].concat(Array.prototype.slice.call(arguments)));
        };
    }

    global.PedniaDesfile = {
        montar: montar,
        listo: function () { return !!(game && sceneRef); },
        prepararRonda: conEscena(function (s, o) { return s.prepararRonda(o); }),
        jugar: conEscena(function (s) { s.jugar(); }),
        pausar: conEscena(function (s) { s.pausar(); }),
        celebrar: conEscena(function (s, id) { return s.celebrar(id); }),
        subirTarima: conEscena(function (s, id) { return s.subirTarima(id); }),
        pista: conEscena(function (s, id) { s.pista(id); }),
        resaltar: conEscena(function (s, id, si) { s.resaltar(id, si); }),
        demo: conEscena(function (s, id) { s.demo(id); }),
        limpiarDemo: conEscena(function (s) { return s.limpiarDemo(); }),
        rectDe: conEscena(function (s, id) { return s.rectDe(id); }),
        panDe: conEscena(function (s, id) { return s.panDe(id); }),
        fiestaFinal: conEscena(function (s) { return s.fiestaFinal(); }),
        estado: conEscena(function (s) { return s.estado(); }),
        destruir: function () {
            sceneRef = null;
            game = null;
            global.document.body.classList.remove('modo-desfile');
            if (Host) Host.destruirJuego();
        }
    };
})(typeof window !== 'undefined' ? window : this);
