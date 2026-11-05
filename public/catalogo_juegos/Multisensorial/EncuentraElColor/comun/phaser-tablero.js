/**
 * PedniaEncuentraColorPhaser — "Burbujas de color" en Phaser 4.2.1.
 *
 * Juego de acción continua a pantalla completa (ya no es un cuestionario):
 *  - Las burbujas suben sin parar, cada una con un objeto dentro.
 *  - Reventar una del color pedido: el objeto cae al prado, salpica pintura
 *    y el mundo descolorido recupera color. Los objetos quedan como colección.
 *  - Tocar otra: se sacude y se escapa más rápido (sin castigo).
 *  - Especiales: burbuja dorada (vale doble), gigante (dos toques) y nube
 *    traviesa (tapa burbujas hasta que la soplas).
 *  - Pinti, el bote de pintura, mira las burbujas correctas y reacciona.
 *  - Combos con notas que suben, "lluvia de color", ayuda si el niño se
 *    queda quieto, clímax con arcoíris y álbum de colección con estrellas.
 *
 * Sonido: Web Audio sintetizado (no requiere archivos).
 *
 * API (la consume script.js):
 *   montar, listo, prepararPartida, iniciar, demo, reventarDemo, limpiarDemo,
 *   anclaDemo, estado, destruir.
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
    var loadedKeys = Object.create(null);

    /** Ajustes por edad. gigantesEn / nubesEn: tras cuántos atrapados aparecen. */
    var DIFICULTAD = {
        '34': {
            radio: 0.1, radioMin: 52, radioMax: 88,
            vel: [48, 74], intervalo: [1700, 1100],
            proporcion: 0.5, maxEnPantalla: 7, ayudaMs: 7000,
            doradaProb: 0.12, gigantesEn: [2, 5], nubesEn: [3], nubeVel: 42
        },
        '56': {
            radio: 0.082, radioMin: 44, radioMax: 74,
            vel: [70, 118], intervalo: [1200, 680],
            proporcion: 0.34, maxEnPantalla: 10, ayudaMs: 11000,
            doradaProb: 0.09, gigantesEn: [3, 7, 10], nubesEn: [4, 8], nubeVel: 66
        }
    };

    var ARCOIRIS = [0xe03131, 0xfd7e14, 0xffd43b, 0x40c057, 0x1c7ed6, 0x9c36b5];
    var DORADO = 0xfab005;

    function metaObj(id) {
        return (gameConfig && gameConfig.objetos && gameConfig.objetos[id]) || {};
    }

    function metaColor(id) {
        return (gameConfig && gameConfig.colores && gameConfig.colores[id]) || { nombre: id, hex: '#888888' };
    }

    function texKey(id) {
        return 'obj:' + id;
    }

    function hexNum(hex) {
        if (typeof hex !== 'string') return 0x888888;
        var h = hex.replace('#', '');
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        var n = parseInt(h, 16);
        return isFinite(n) ? n : 0x888888;
    }

    function hexCss(num) {
        return '#' + ('000000' + num.toString(16)).slice(-6);
    }

    function movimientoReducido() {
        return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function vibrar(ms) {
        try {
            if (global.navigator && typeof global.navigator.vibrate === 'function') {
                global.navigator.vibrate(ms);
            }
        } catch (e) { /* noop */ }
    }

    function avisar(nombre) {
        var fn = callbacks && callbacks[nombre];
        if (typeof fn !== 'function') return;
        try {
            fn.apply(null, Array.prototype.slice.call(arguments, 1));
        } catch (e) { /* noop */ }
    }

    function puedeInteractuar() {
        if (typeof callbacks.puedeInteractuar === 'function') {
            return !!callbacks.puedeInteractuar();
        }
        return true;
    }

    function screenScale(scene) {
        var canvas = scene.game.canvas;
        var rect = canvas.getBoundingClientRect();
        var gw = scene.scale.width || 1;
        var gh = scene.scale.height || 1;
        return { rect: rect, sx: rect.width / gw, sy: rect.height / gh };
    }

    function esperarEscena() {
        if (sceneRef) return Promise.resolve(sceneRef);
        return readyPromise || Promise.reject(new Error('Phaser no montado'));
    }

    /* ── Sonido sintetizado ────────────────────────────────────────── */

    var Sonido = (function () {
        var ctx = null;
        var master = null;
        // Pentatónica de Do: los combos suben de nota sin desafinar nunca.
        var ESCALA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98];

        function asegurar() {
            if (ctx) {
                if (ctx.state === 'suspended') ctx.resume();
                return ctx;
            }
            var AC = global.AudioContext || global.webkitAudioContext;
            if (!AC) return null;
            try {
                ctx = new AC();
                master = ctx.createGain();
                master.gain.value = 0.32;
                master.connect(ctx.destination);
            } catch (e) {
                ctx = null;
            }
            return ctx;
        }

        function tono(freq, dur, tipo, vol, freqFin, retraso) {
            var c = asegurar();
            if (!c) return;
            var t0 = c.currentTime + (retraso || 0);
            var o = c.createOscillator();
            var g = c.createGain();
            o.type = tipo || 'sine';
            o.frequency.setValueAtTime(freq, t0);
            if (freqFin) o.frequency.exponentialRampToValueAtTime(freqFin, t0 + dur);
            g.gain.setValueAtTime(0.0001, t0);
            g.gain.exponentialRampToValueAtTime(vol || 0.4, t0 + 0.012);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
            o.connect(g);
            g.connect(master);
            o.start(t0);
            o.stop(t0 + dur + 0.03);
        }

        function ruido(dur, vol, frecFiltro, retraso) {
            var c = asegurar();
            if (!c) return;
            var t0 = c.currentTime + (retraso || 0);
            var largo = Math.max(1, Math.floor(c.sampleRate * dur));
            var buf = c.createBuffer(1, largo, c.sampleRate);
            var d = buf.getChannelData(0);
            for (var i = 0; i < largo; i++) d[i] = Math.random() * 2 - 1;
            var src = c.createBufferSource();
            src.buffer = buf;
            var f = c.createBiquadFilter();
            f.type = 'bandpass';
            f.frequency.value = frecFiltro || 2000;
            var g = c.createGain();
            g.gain.setValueAtTime(vol || 0.3, t0);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
            src.connect(f);
            f.connect(g);
            g.connect(master);
            src.start(t0);
            src.stop(t0 + dur + 0.02);
        }

        function nota(i) {
            return ESCALA[Math.max(0, Math.min(ESCALA.length - 1, i))];
        }

        return {
            desbloquear: asegurar,
            pop: function (combo) {
                ruido(0.05, 0.45, 2600);
                tono(950, 0.08, 'sine', 0.45, 260);
                tono(nota((combo || 1) - 1), 0.28, 'triangle', 0.28, null, 0.04);
            },
            aterriza: function () {
                tono(240, 0.12, 'sine', 0.3, 120);
                ruido(0.09, 0.18, 700);
            },
            fallo: function () {
                tono(340, 0.24, 'triangle', 0.26, 170);
                tono(300, 0.2, 'triangle', 0.16, 150, 0.09);
            },
            escapa: function () {
                tono(520, 0.4, 'sine', 0.07, 1100);
            },
            dorada: function () {
                [2, 4, 6, 8].forEach(function (n, i) { tono(nota(n), 0.3, 'triangle', 0.22, null, i * 0.07); });
            },
            grieta: function () {
                ruido(0.08, 0.5, 4200);
                tono(1500, 0.05, 'square', 0.08, 800);
            },
            risita: function () {
                tono(780, 0.08, 'sine', 0.14, 980);
                tono(820, 0.08, 'sine', 0.14, 1040, 0.11);
                tono(860, 0.08, 'sine', 0.14, 1100, 0.22);
            },
            soplido: function () {
                ruido(0.5, 0.35, 650);
                tono(300, 0.4, 'sine', 0.1, 140);
            },
            sticker: function (i) {
                tono(nota(i % ESCALA.length), 0.18, 'triangle', 0.22);
            },
            estrella: function (i) {
                tono(nota(3 + i * 2), 0.4, 'triangle', 0.3);
                tono(nota(3 + i * 2) * 2, 0.25, 'sine', 0.12, null, 0.03);
            },
            fanfarria: function () {
                [0, 2, 4, 7].forEach(function (n, i) { tono(nota(n), 0.35, 'triangle', 0.26, null, i * 0.12); });
                tono(nota(7) * 2, 0.6, 'sine', 0.14, null, 0.48);
            }
        };
    })();

    /** El canvas ocupa toda la pantalla; el HUD queda flotando encima. */
    function inyectarEstilo() {
        var doc = global.document;
        if (doc.getElementById('encuentra-color-arcade-css')) return;
        var css = doc.createElement('style');
        css.id = 'encuentra-color-arcade-css';
        css.textContent = [
            'body.modo-arcade{background:#dfe3e8 !important}',
            'body.modo-arcade #zona-objetos{position:static;padding:0;flex:1}',
            'body.modo-arcade #phaser-tablero{position:fixed !important;inset:0 !important;',
            'width:100vw !important;height:100vh !important;height:100dvh !important;',
            'z-index:0;min-height:0}',
            'body.modo-arcade .enunciado-wrap{padding-top:16px}',
            'body.modo-arcade .enunciado-wrap h1{background:rgba(255,255,255,.9);padding:6px 22px;',
            'border-radius:999px;box-shadow:0 4px 14px rgba(30,58,95,.16);',
            'font-size:clamp(18px,2.4vw,26px)}',
            // Con el álbum abierto el HUD no debe tapar la tarjeta.
            'body.modo-arcade .enunciado-wrap{transition:opacity .3s}',
            'body.album-abierto .enunciado-wrap{opacity:0}'
        ].join('');
        doc.head.appendChild(css);
    }

    var EscenaBurbujas = new Phaser.Class({
        Extends: Phaser.Scene,

        initialize: function EscenaBurbujas() {
            Phaser.Scene.call(this, { key: 'EscenaEncuentraColor' });
            this.nubes = [];
            this.arboles = [];
            this.pastos = [];
            this.sol = null;
            this.rayos = null;
            this.fracActual = 0;
            this.colorActual = 0x8fa3b8;

            this.burbujas = [];
            this.nubesTraviesas = [];
            this.trofeos = [];
            this.manchas = [];
            this.arcoiris = null;
            this.album = null;
            this.pinti = null;
            this.partida = null;
            this.jugando = false;
            this.siguienteId = 1;
            this.acumSpawn = 0;
            this.carriles = [];
            this.ultimoAcierto = 0;
            this.ultimoAviso = 0;
            this.ayudaActiva = false;
            this.combo = 0;
        },

        create: function () {
            this.construirMundo();
            this.crearPinti();
            sceneRef = this;
            if (readyResolve) {
                readyResolve(this);
                readyResolve = null;
            }
            this.scale.on('resize', this.onResize, this);
            this.input.on('pointerdown', this.alTocar, this);
        },

        onResize: function () {
            this.redibujarMundo();
            this.colocarPinti();
            this.recolocarTrofeos();
        },

        shutdown: function () {
            this.tweens.killAll();
            this.burbujas = [];
            this.nubesTraviesas = [];
            this.trofeos = [];
            this.manchas = [];
            if (sceneRef === this) sceneRef = null;
        },

        /* ── Bucle ─────────────────────────────────────────────────── */

        update: function (time, delta) {
            var dt = Math.min(delta, 50) / 1000;
            var w = this.scale.width;
            var i;

            for (i = 0; i < this.nubes.length; i++) {
                var n = this.nubes[i];
                n.x += n.vel * dt;
                if (n.x - n.anchoNube > w + 60) n.x = -n.anchoNube - 40;
            }
            if (this.rayos) this.rayos.rotation += 0.18 * dt;

            this.moverBurbujas(time, dt);
            this.moverNubesTraviesas(dt);
            this.animarPinti(time, dt);

            for (i = 0; i < this.trofeos.length; i++) {
                var t = this.trofeos[i];
                if (t.listo && !t.saltando) {
                    t.img.y = t.baseY + Math.sin(time / 420 + i * 0.9) * 3;
                }
            }

            if (!this.jugando || !this.partida) return;

            // Aparición continua, cada vez más rápida.
            var cfg = this.partida.cfg;
            var intervalo = Phaser.Math.Linear(cfg.intervalo[0], cfg.intervalo[1], this.progreso());
            this.acumSpawn += delta;
            if (this.acumSpawn >= intervalo) {
                this.acumSpawn = 0;
                this.soltarBurbuja();
            }

            // Ayuda si el niño lleva rato sin atrapar nada.
            if (time - this.ultimoAcierto > cfg.ayudaMs && time - this.ultimoAviso > cfg.ayudaMs) {
                this.ultimoAviso = time;
                this.ayudaActiva = true;
                this.reaccionPinti('pista');
                avisar('onInactivo');
            }
        },

        moverBurbujas: function (time, dt) {
            var vivas = [];
            for (var i = 0; i < this.burbujas.length; i++) {
                var b = this.burbujas[i];
                if (b.muerta) continue;
                if (b.reventando) { vivas.push(b); continue; }
                b.t += dt;
                if (b.quieta) {
                    b.y = b.baseY + Math.sin(b.t * 1.8 + b.fase) * 8;
                    b.x = b.baseX + Math.sin(b.t * 1.1 + b.fase) * 6;
                } else {
                    b.y -= b.vel * b.impulso * dt;
                    if (b.impulso > 1) b.impulso = Math.max(1, b.impulso - dt * 0.6);
                    b.x = b.baseX + Math.sin(b.t * b.frec + b.fase) * b.amp;
                }
                var sac = 0;
                if (b.sacudida > 0) {
                    b.sacudida = Math.max(0, b.sacudida - dt);
                    sac = Math.sin(b.t * 70) * 10 * (b.sacudida / 0.45);
                }
                b.cont.setPosition(b.x + sac, b.y);
                var ond = Math.sin(b.t * 3.2 + b.fase) * 0.035;
                b.piel.setScale(b.escalaPiel * (1 + ond), b.escalaPiel * (1 - ond));
                if (b.img) b.img.angle = Math.sin(b.t * 1.7 + b.fase) * 9;

                if (b.orbita) {
                    for (var k = 0; k < b.orbita.length; k++) {
                        var ang = b.t * 2.4 + k * (Math.PI * 2 / b.orbita.length);
                        b.orbita[k].setPosition(Math.cos(ang) * b.r * 1.08, Math.sin(ang) * b.r * 1.08);
                    }
                }

                if (b.tipo === 'dorada') {
                    b.glow.setAlpha(0.3 + 0.2 * Math.sin(time / 120));
                } else {
                    var brilla = b.esObjetivo && (this.ayudaActiva || b.quieta === 'demo');
                    b.glow.setAlpha(brilla ? 0.28 + 0.24 * Math.sin(time / 170) : 0);
                }

                if (b.y < -b.r * 1.4) {
                    b.muerta = true;
                    b.cont.destroy();
                    if (b.esObjetivo && this.jugando) {
                        Sonido.escapa();
                        this.reaccionPinti('oh');
                    }
                    continue;
                }
                vivas.push(b);
            }
            this.burbujas = vivas;
        },

        progreso: function () {
            if (!this.partida) return 0;
            return Phaser.Math.Clamp(this.partida.atrapados / this.partida.meta, 0, 1);
        },

        radio: function () {
            var cfg = this.partida ? this.partida.cfg : DIFICULTAD['34'];
            var base = Math.min(this.scale.width, this.scale.height);
            return Phaser.Math.Clamp(base * cfg.radio, cfg.radioMin, cfg.radioMax);
        },

        /* ── Burbujas ──────────────────────────────────────────────── */

        crearBurbuja: function (objId, x, y, vel, quieta, tipo) {
            tipo = tipo || 'normal';
            var r = this.radio() * (tipo === 'gigante' ? 1.55 : 1);
            var p = this.partida;
            var cont = this.add.container(x, y).setDepth(tipo === 'gigante' ? 9 : 10);

            var colorGlow = tipo === 'dorada' ? DORADO : (p ? p.colorNum : 0xffffff);
            var glow = this.add.circle(0, 0, r * 1.28, colorGlow, 0);
            var sombra = this.add.circle(0, 0, r, tipo === 'dorada' ? 0xffe066 : 0x9ec9e8,
                tipo === 'dorada' ? 0.38 : 0.2);
            var piel = this.add.circle(0, 0, r, 0xffffff, 0.24);
            piel.setStrokeStyle(tipo === 'normal' ? 3 : 5, tipo === 'dorada' ? DORADO : 0xffffff, 0.95);
            var img = null;
            var key = texKey(objId);
            if (this.textures.exists(key)) {
                img = this.add.image(0, 0, key).setOrigin(0.5);
                var lado = Math.max(img.width, img.height) || 1;
                img.setScale((r * 1.22) / lado);
            }
            var brillo = this.add.ellipse(-r * 0.4, -r * 0.44, r * 0.46, r * 0.22, 0xffffff, 0.8);
            brillo.setAngle(-38);
            var brillo2 = this.add.circle(r * 0.46, r * 0.36, r * 0.07, 0xffffff, 0.6);

            cont.add(glow);
            cont.add(sombra);
            cont.add(piel);
            if (img) cont.add(img);
            cont.add(brillo);
            cont.add(brillo2);

            // Gigante: grietas que aparecen con el primer toque.
            var grietas = null;
            if (tipo === 'gigante') {
                grietas = this.add.graphics();
                grietas.lineStyle(4, 0xffffff, 0.95);
                grietas.beginPath();
                grietas.moveTo(-r * 0.15, -r * 0.95);
                grietas.lineTo(r * 0.05, -r * 0.55);
                grietas.lineTo(-r * 0.12, -r * 0.3);
                grietas.lineTo(r * 0.12, -r * 0.05);
                grietas.moveTo(r * 0.05, -r * 0.55);
                grietas.lineTo(r * 0.35, -r * 0.5);
                grietas.moveTo(r * 0.9, r * 0.3);
                grietas.lineTo(r * 0.55, r * 0.22);
                grietas.lineTo(r * 0.5, r * 0.45);
                grietas.strokePath();
                grietas.setVisible(false);
                cont.add(grietas);
            }

            // Dorada: chispas que giran alrededor.
            var orbita = null;
            if (tipo === 'dorada') {
                orbita = [];
                for (var k = 0; k < 4; k++) {
                    var chispa = this.add.star(0, 0, 4, r * 0.05, r * 0.14, 0xfff3bf);
                    orbita.push(chispa);
                    cont.add(chispa);
                }
            }

            var b = {
                id: this.siguienteId++,
                objId: objId,
                tipo: tipo,
                esObjetivo: !!(p && metaObj(objId).color === p.color),
                cont: cont, glow: glow, piel: piel, img: img, grietas: grietas, orbita: orbita,
                r: r,
                x: x, y: y, baseX: x, baseY: y,
                vel: vel, impulso: 1,
                t: 0,
                fase: Phaser.Math.FloatBetween(0, Math.PI * 2),
                frec: Phaser.Math.FloatBetween(0.8, 1.4),
                amp: tipo === 'gigante' ? 8 : Phaser.Math.FloatBetween(10, 28),
                quieta: quieta || false,
                sacudida: 0,
                escalaPiel: 1,
                golpes: 0,
                reventando: false,
                muerta: false
            };

            if (!movimientoReducido()) {
                cont.setScale(0.3);
                this.tweens.add({ targets: cont, scale: 1, duration: 320, ease: 'Back.easeOut' });
            }
            this.burbujas.push(b);
            return b;
        },

        vivas: function () {
            return this.burbujas.filter(function (b) { return !b.reventando && !b.muerta; });
        },

        elegirCarril: function () {
            var w = this.scale.width;
            var n = w < 700 ? 4 : 6;
            var libres = [];
            for (var i = 0; i < n; i++) {
                if (this.carriles.indexOf(i) === -1) libres.push(i);
            }
            var c = libres.length ? Phaser.Utils.Array.GetRandom(libres) : Phaser.Math.Between(0, n - 1);
            this.carriles.push(c);
            if (this.carriles.length > 2) this.carriles.shift();
            var x = Phaser.Math.Linear(w * 0.08, w * 0.92, (c + 0.5) / n);
            return x + Phaser.Math.Between(-w * 0.03, w * 0.03);
        },

        elegirObjeto: function (objetivo) {
            var p = this.partida;
            var lista = objetivo ? p.poolObjetivo : p.poolOtros;
            if (!lista.length) lista = p.poolObjetivo.length ? p.poolObjetivo : p.poolOtros;
            var opciones = lista.filter(function (id) { return id !== p.ultimoObj; });
            var id = Phaser.Utils.Array.GetRandom(opciones.length ? opciones : lista);
            p.ultimoObj = id;
            return id;
        },

        velocidadActual: function () {
            var p = this.partida;
            var v = Phaser.Math.Linear(p.cfg.vel[0], p.cfg.vel[1], this.progreso()) *
                Phaser.Math.FloatBetween(0.85, 1.15);
            return movimientoReducido() ? v * 0.6 : v;
        },

        /** Suelta una burbuja desde abajo; garantiza siempre algún objetivo a la vista. */
        soltarBurbuja: function (forzar, ignorarTope) {
            var p = this.partida;
            if (!p) return null;
            var h = this.scale.height;
            var vivas = this.vivas();
            if (!ignorarTope && vivas.length >= p.cfg.maxEnPantalla) return null;
            var hayObjetivo = vivas.some(function (b) { return b.esObjetivo && b.y > h * 0.35; });
            var objetivo = forzar === true ||
                (forzar !== false && (!hayObjetivo || Math.random() < p.cfg.proporcion));
            var tipo = 'normal';
            var vel = this.velocidadActual();
            if (objetivo && this.progreso() > 0.12 && Math.random() < p.cfg.doradaProb) {
                tipo = 'dorada';
                vel *= 1.3; // la dorada es esquiva: hay que estar atento
            }
            var r = this.radio();
            return this.crearBurbuja(this.elegirObjeto(objetivo), this.elegirCarril(), h + r * 1.2, vel, false, tipo);
        },

        soltarGigante: function () {
            if (!this.jugando) return;
            var w = this.scale.width;
            var h = this.scale.height;
            var x = Phaser.Math.Linear(w * 0.25, w * 0.75, Math.random());
            var b = this.crearBurbuja(this.elegirObjeto(true), x, h + this.radio() * 2,
                this.velocidadActual() * 0.62, false, 'gigante');
            avisar('onEvento', 'gigante');
            return b;
        },

        alTocar: function (pointer) {
            Sonido.desbloquear();
            var px = pointer.worldX;
            var py = pointer.worldY;

            if (this.album) {
                this.tocarAlbum(px, py);
                return;
            }
            if (!this.partida || this.partida.terminada) return;
            if (!puedeInteractuar()) return;

            // La nube traviesa está por encima: se sopla antes que las burbujas.
            for (var i = 0; i < this.nubesTraviesas.length; i++) {
                var nt = this.nubesTraviesas[i];
                if (nt.viva && Phaser.Math.Distance.Between(px, py, nt.cont.x, nt.cont.y) < nt.r * 1.25) {
                    this.soplarNube(nt);
                    return;
                }
            }

            var mejor = null;
            var mejorD = Infinity;
            this.vivas().forEach(function (b) {
                var d = Phaser.Math.Distance.Between(px, py, b.x, b.y);
                // Zona generosa: los dedos pequeños no son precisos.
                if (d < b.r * 1.22 && d < mejorD) {
                    mejor = b;
                    mejorD = d;
                }
            });
            if (!mejor) {
                this.ondaToque(px, py);
                return;
            }
            if (mejor.esObjetivo) this.atrapar(mejor, false);
            else this.fallar(mejor);
        },

        ondaToque: function (x, y) {
            if (movimientoReducido()) return;
            var o = this.add.circle(x, y, 10, 0xffffff, 0).setDepth(40);
            o.setStrokeStyle(3, 0xffffff, 0.8);
            this.tweens.add({
                targets: o, scale: 3, alpha: 0, duration: 380, ease: 'Cubic.easeOut',
                onComplete: function () { o.destroy(); }
            });
        },

        /** Primer toque a la gigante: se agrieta y encoge. Hace falta otro. */
        agrietar: function (b) {
            b.golpes += 1;
            b.escalaPiel = 0.88;
            b.sacudida = 0.3;
            if (b.grietas) b.grietas.setVisible(true);
            Sonido.grieta();
            vibrar(20);
            this.chispas(b.x, b.y, 0xffffff, 8, b.r * 0.7);
            this.textoFlotante('¡Otra vez!', b.x, b.y - b.r, this.partida.colorNum);
            this.reaccionPinti('wow');
        },

        /** Revienta una burbuja correcta. En demo no cuenta ni colecciona. */
        atrapar: function (b, esDemo) {
            var scene = this;
            var p = this.partida;

            if (!esDemo && b.tipo === 'gigante' && b.golpes < 1) {
                this.agrietar(b);
                return Promise.resolve();
            }

            b.reventando = true;
            var color = p.colorNum;
            var x = b.x;
            var y = b.y;

            var ahora = this.time.now;
            this.combo = (!esDemo && ahora - this.ultimoAcierto < 2600) ? this.combo + 1 : 1;

            this.estallarBurbuja(b, b.tipo === 'dorada' ? DORADO : color);
            Sonido.pop(this.combo);
            vibrar(b.tipo === 'normal' ? 15 : 35);
            if (b.tipo === 'dorada') {
                Sonido.dorada();
                if (!movimientoReducido()) this.cameras.main.flash(220, 255, 224, 102);
            }
            if (b.tipo === 'gigante') {
                Sonido.grieta();
                this.chispas(x, y, color, 18, b.r);
                if (!movimientoReducido()) this.cameras.main.shake(260, 0.007);
            }

            // El objeto sale de la burbuja y vive por su cuenta.
            var clave = b.img ? b.img.texture.key : null;
            var escala = b.img ? b.img.scaleX : 1;
            var suelto = clave ? this.add.image(x, y, clave).setDepth(30).setScale(escala) : null;
            b.cont.destroy();
            b.muerta = true;

            if (esDemo) {
                this.reaccionPinti('feliz');
                return new Promise(function (resolve) {
                    if (!suelto) { resolve(); return; }
                    scene.tweens.add({
                        targets: suelto, y: y - 60, alpha: 0, angle: 30, duration: 700,
                        ease: 'Cubic.easeOut',
                        onComplete: function () { suelto.destroy(); resolve(); }
                    });
                });
            }

            this.ultimoAcierto = ahora;
            this.ultimoAviso = ahora;
            this.ayudaActiva = false;

            var antes = p.atrapados;
            var puntos = Math.min(b.tipo === 'dorada' ? 2 : 1, p.meta - p.atrapados);
            p.atrapados += puntos;
            p.coleccion[b.objId] = (p.coleccion[b.objId] || 0) + puntos;
            if (b.tipo !== 'normal') p.especiales += 1;
            var n = p.atrapados;
            var meta = p.meta;

            if (b.tipo === 'dorada') this.textoFlotante('¡x2!', x, y - b.r, DORADO);
            else if (this.combo >= 2) this.textoFlotante('¡x' + this.combo + '!', x, y - b.r, color);
            this.reaccionPinti('feliz');

            for (var k = 0; k < puntos; k++) {
                var img = suelto;
                if (k > 0 && clave) img = this.add.image(x, y, clave).setDepth(30).setScale(escala);
                var trofeo = { idx: antes + k, img: img, listo: false, saltando: false, baseY: 0 };
                this.trofeos.push(trofeo);
                (function (tr, retraso) {
                    if (retraso) scene.time.delayedCall(retraso, function () { scene.volarAlPrado(tr, color); });
                    else scene.volarAlPrado(tr, color);
                })(trofeo, k * 160);
            }

            // El mundo recupera color.
            var pt = { v: this.fracActual };
            this.tweens.add({
                targets: pt, v: n / meta, duration: 800, ease: 'Cubic.easeOut',
                onUpdate: function () { scene.teñirMundo(pt.v, color); }
            });

            avisar('onAtrapado', n, meta, this.combo, b.tipo);

            if (n >= meta) {
                this.jugando = false;
                p.terminada = true;
                this.time.delayedCall(900, function () { scene.climax(); });
                return Promise.resolve();
            }
            if (!p.lluviaHecha && n >= Math.floor(meta / 2)) {
                p.lluviaHecha = true;
                this.lluvia();
            }
            p.cfg.gigantesEn.forEach(function (umbral) {
                if (antes < umbral && n >= umbral) {
                    scene.time.delayedCall(1300, function () { scene.soltarGigante(); });
                }
            });
            p.cfg.nubesEn.forEach(function (umbral) {
                if (antes < umbral && n >= umbral) {
                    scene.time.delayedCall(700, function () { scene.crearNubeTraviesa(); });
                }
            });
            return Promise.resolve();
        },

        estallarBurbuja: function (b, color) {
            if (!movimientoReducido()) this.cameras.main.shake(140, 0.003);
            var anillo = this.add.circle(b.x, b.y, b.r, color, 0).setDepth(25);
            anillo.setStrokeStyle(5, 0xffffff, 1);
            this.tweens.add({
                targets: anillo, scale: 1.7, alpha: 0, duration: 320, ease: 'Cubic.easeOut',
                onComplete: function () { anillo.destroy(); }
            });
            this.chispas(b.x, b.y, color, 14, b.r);
            // Gotas de jabón blancas.
            this.chispas(b.x, b.y, 0xffffff, 8, b.r * 0.8);
        },

        posicionTrofeo: function (idx) {
            var w = this.scale.width;
            var h = this.scale.height;
            var meta = this.partida ? this.partida.meta : 8;
            var k = meta <= 1 ? 0.5 : idx / (meta - 1);
            // A la izquierda vive Pinti; a la derecha los botones flotantes.
            return { x: Phaser.Math.Linear(w * 0.19, w * 0.84, k), y: h * 0.885 };
        },

        tamTrofeo: function () {
            var w = this.scale.width;
            var h = this.scale.height;
            var meta = this.partida ? this.partida.meta : 8;
            return Math.min(h * 0.085, (w * 0.65 / meta) * 0.85);
        },

        volarAlPrado: function (trofeo, color) {
            var scene = this;
            var img = trofeo.img;
            var dest = this.posicionTrofeo(trofeo.idx);
            if (!img) {
                this.mancha(trofeo.idx, color);
                return;
            }
            var lado = Math.max(img.width, img.height) || 1;
            var escFinal = this.tamTrofeo() / lado;
            var ox = img.x;
            var oy = img.y;
            var altura = 90 + Math.abs(dest.x - ox) * 0.15;
            var escIni = img.scaleX;
            var prog = { t: 0 };
            var cuadro = 0;
            this.tweens.add({
                targets: prog, t: 1, duration: 720, ease: 'Sine.easeInOut',
                onUpdate: function () {
                    var k = prog.t;
                    img.x = Phaser.Math.Linear(ox, dest.x, k);
                    img.y = Phaser.Math.Linear(oy, dest.y, k) - Math.sin(k * Math.PI) * altura;
                    img.setScale(Phaser.Math.Linear(escIni, escFinal, k));
                    img.angle = k * 360;
                    // Estela de pintura durante el vuelo.
                    cuadro += 1;
                    if (cuadro % 3 === 0 && !movimientoReducido()) scene.gotaEstela(img.x, img.y, color);
                },
                onComplete: function () {
                    img.angle = 0;
                    img.setDepth(6);
                    trofeo.baseY = dest.y - scene.tamTrofeo() * 0.35;
                    img.y = trofeo.baseY;
                    scene.mancha(trofeo.idx, color);
                    scene.chispas(dest.x, dest.y, color, 9, 10);
                    Sonido.aterriza();
                    scene.tweens.add({
                        targets: img, scaleY: escFinal * 0.6, scaleX: escFinal * 1.25,
                        duration: 90, yoyo: true, ease: 'Sine.easeOut',
                        onComplete: function () {
                            img.setScale(escFinal);
                            trofeo.listo = true;
                        }
                    });
                }
            });
        },

        gotaEstela: function (x, y, color) {
            var g = this.add.circle(x, y, Phaser.Math.Between(4, 8), color, 0.85).setDepth(29);
            this.tweens.add({
                targets: g, alpha: 0, scale: 0.2, y: y + 14, duration: 420,
                onComplete: function () { g.destroy(); }
            });
        },

        /** Salpicadura de pintura que queda pintada en el prado. */
        mancha: function (idx, color) {
            var pos = this.posicionTrofeo(idx);
            var R = this.tamTrofeo() * 0.62;
            var g = this.add.graphics().setDepth(-22);
            g.fillStyle(color, 0.88);
            g.fillEllipse(0, 0, R * 2.6, R * 0.95);
            for (var i = 0; i < 7; i++) {
                var ang = (Math.PI * 2 / 7) * i + Phaser.Math.FloatBetween(-0.3, 0.3);
                var d = R * Phaser.Math.FloatBetween(1.25, 1.75);
                g.fillCircle(Math.cos(ang) * d, Math.sin(ang) * d * 0.38, R * Phaser.Math.FloatBetween(0.12, 0.26));
            }
            g.setPosition(pos.x, pos.y);
            this.manchas.push({ idx: idx, g: g });
            if (!movimientoReducido()) {
                g.setScale(0.2);
                this.tweens.add({ targets: g, scale: 1, duration: 260, ease: 'Back.easeOut' });
            }
        },

        recolocarTrofeos: function () {
            var scene = this;
            this.trofeos.forEach(function (t) {
                if (!t.img || !t.listo) return;
                var pos = scene.posicionTrofeo(t.idx);
                var lado = Math.max(t.img.width, t.img.height) || 1;
                t.img.setScale(scene.tamTrofeo() / lado);
                t.img.x = pos.x;
                t.baseY = pos.y - scene.tamTrofeo() * 0.35;
            });
            this.manchas.forEach(function (m) {
                var pos = scene.posicionTrofeo(m.idx);
                m.g.setPosition(pos.x, pos.y);
            });
        },

        /** Toque equivocado: la burbuja se sacude y se escapa. Nunca castiga. */
        fallar: function (b) {
            b.sacudida = 0.45;
            b.impulso = 2.4;
            b.piel.setStrokeStyle(4, 0xadb5bd, 1);
            var tipo = b.tipo;
            this.time.delayedCall(450, function () {
                if (!b.muerta) b.piel.setStrokeStyle(tipo === 'normal' ? 3 : 5, 0xffffff, 0.95);
            });
            this.chispas(b.x, b.y, 0xced4da, 6, b.r * 0.6);
            Sonido.fallo();
            vibrar(8);
            this.reaccionPinti('wow');
            if (this.partida) this.partida.fallos += 1;
            avisar('onFallo', b.objId);
        },

        /* ── Nube traviesa ─────────────────────────────────────────── */

        crearNubeTraviesa: function () {
            if (!this.jugando || !this.partida) return;
            var w = this.scale.width;
            var h = this.scale.height;
            var r = Math.min(w, h) * (this.partida.cfg === DIFICULTAD['34'] ? 0.14 : 0.12);
            var desdeIzq = Math.random() < 0.5;
            var cont = this.add.container(desdeIzq ? -r * 2 : w + r * 2, h * Phaser.Math.FloatBetween(0.42, 0.58));
            cont.setDepth(20);

            var gris = 0x7d8794;
            [[-0.75, 0.15, 0.6], [-0.3, -0.25, 0.72], [0.3, -0.3, 0.66], [0.78, 0.12, 0.56], [0, 0.22, 0.8]]
                .forEach(function (c) {
                    cont.add(this.add.circle(c[0] * r, c[1] * r, c[2] * r, gris, 0.94));
                }, this);
            // Cara pícara: ojos entrecerrados y sonrisa torcida.
            var cara = this.add.graphics();
            cara.fillStyle(0xffffff, 1);
            cara.fillEllipse(-r * 0.3, -r * 0.05, r * 0.26, r * 0.2);
            cara.fillEllipse(r * 0.3, -r * 0.05, r * 0.26, r * 0.2);
            cara.fillStyle(0x212529, 1);
            cara.fillCircle(-r * 0.26, -r * 0.03, r * 0.07);
            cara.fillCircle(r * 0.34, -r * 0.03, r * 0.07);
            cara.lineStyle(r * 0.06, 0x212529, 1);
            cara.beginPath();
            cara.arc(r * 0.04, r * 0.18, r * 0.2, 0.1 * Math.PI, 0.8 * Math.PI, false);
            cara.strokePath();
            cont.add(cara);

            this.nubesTraviesas.push({
                cont: cont, r: r, viva: true, t: 0,
                baseY: cont.y,
                vel: (desdeIzq ? 1 : -1) * this.partida.cfg.nubeVel * (movimientoReducido() ? 0.6 : 1)
            });
            Sonido.risita();
            avisar('onEvento', 'nube');
        },

        moverNubesTraviesas: function (dt) {
            var w = this.scale.width;
            var quedan = [];
            for (var i = 0; i < this.nubesTraviesas.length; i++) {
                var n = this.nubesTraviesas[i];
                if (!n.viva) continue;
                n.t += dt;
                n.cont.x += n.vel * dt;
                n.cont.y = n.baseY + Math.sin(n.t * 1.8) * 12;
                n.cont.setScale(1 + Math.sin(n.t * 2.6) * 0.03, 1 - Math.sin(n.t * 2.6) * 0.03);
                if ((n.vel > 0 && n.cont.x > w + n.r * 2.2) || (n.vel < 0 && n.cont.x < -n.r * 2.2)) {
                    n.viva = false;
                    n.cont.destroy();
                    continue;
                }
                quedan.push(n);
            }
            this.nubesTraviesas = quedan;
        },

        soplarNube: function (n) {
            var scene = this;
            n.viva = false;
            Sonido.soplido();
            vibrar(25);
            this.reaccionPinti('feliz');
            var x = n.cont.x;
            var y = n.cont.y;
            for (var i = 0; i < 10; i++) {
                var ang = (Math.PI * 2 / 10) * i;
                var bola = this.add.circle(x, y, n.r * 0.35, 0x9aa3ad, 0.8).setDepth(21);
                this.tweens.add({
                    targets: bola,
                    x: x + Math.cos(ang) * n.r * 2,
                    y: y + Math.sin(ang) * n.r * 1.3,
                    alpha: 0, scale: 0.3, duration: 520, ease: 'Cubic.easeOut',
                    onComplete: (function (o) { return function () { o.destroy(); }; })(bola)
                });
            }
            this.tweens.add({
                targets: n.cont, scale: 1.4, alpha: 0, duration: 300,
                onComplete: function () { n.cont.destroy(); }
            });
            this.textoFlotante('¡Fuera, nube!', x, y - n.r, 0x7d8794);
            if (this.partida) this.partida.nubesSopladas += 1;
            avisar('onEvento', 'nubeFuera');
            scene.ultimoAviso = scene.time.now;
        },

        /* ── Pinti, el bote de pintura ─────────────────────────────── */

        crearPinti: function () {
            var c = this.add.container(0, 0).setDepth(8);
            var sombra = this.add.ellipse(0, 0, 10, 4, 0x000000, 0.16);
            var cuerpo = this.add.graphics();
            var mejillas = [this.add.circle(0, 0, 4, 0xff8fab, 0.55), this.add.circle(0, 0, 4, 0xff8fab, 0.55)];
            var ojos = [];
            var pupilas = [];
            for (var i = 0; i < 2; i++) {
                var ojo = this.add.container(0, 0);
                var blanco = this.add.circle(0, 0, 4, 0xffffff, 1);
                blanco.setStrokeStyle(2, 0x343a40, 1);
                var pupila = this.add.circle(0, 0, 2, 0x212529, 1);
                var reflejo = this.add.circle(0, 0, 1, 0xffffff, 1);
                ojo.add([blanco, pupila, reflejo]);
                ojo.blanco = blanco;
                ojo.reflejo = reflejo;
                ojos.push(ojo);
                pupilas.push(pupila);
            }
            var boca = this.add.graphics();
            c.add([sombra, cuerpo, mejillas[0], mejillas[1], ojos[0], ojos[1], boca]);
            this.pinti = {
                cont: c, sombra: sombra, cuerpo: cuerpo, mejillas: mejillas,
                ojos: ojos, pupilas: pupilas, boca: boca,
                R: 40, baseX: 0, baseY: 0,
                salto: 0, escX: 1, escY: 1,
                expr: 'neutral', exprHasta: 0, parpadeo: 2500
            };
            this.colocarPinti();
        },

        colocarPinti: function () {
            var pin = this.pinti;
            if (!pin) return;
            var w = this.scale.width;
            var h = this.scale.height;
            var R = Phaser.Math.Clamp(Math.min(w, h) * 0.08, 36, 66);
            pin.R = R;
            pin.baseX = Math.max(R * 1.2, w * 0.08);
            pin.baseY = h * 0.885 - R * 0.75;
            pin.sombra.setPosition(0, R * 0.82);
            pin.sombra.setSize(R * 1.6, R * 0.3);
            pin.mejillas[0].setPosition(-R * 0.48, R * 0.18).setRadius(R * 0.1);
            pin.mejillas[1].setPosition(R * 0.48, R * 0.18).setRadius(R * 0.1);
            for (var i = 0; i < 2; i++) {
                var ojo = pin.ojos[i];
                ojo.setPosition((i === 0 ? -1 : 1) * R * 0.27, -R * 0.08);
                ojo.blanco.setRadius(R * 0.2);
                pin.pupilas[i].setRadius(R * 0.1);
                ojo.reflejo.setRadius(R * 0.035);
            }
            this.redibujarPinti();
            this.dibujarBoca(pin.expr);
        },

        redibujarPinti: function () {
            var pin = this.pinti;
            if (!pin) return;
            var R = pin.R;
            var g = pin.cuerpo;
            var color = this.partida ? this.partida.colorNum : 0xadb5bd;
            g.clear();
            // Asa.
            g.lineStyle(R * 0.09, 0x868e96, 1);
            g.beginPath();
            g.arc(0, -R * 0.55, R * 0.64, Math.PI * 1.06, Math.PI * 1.94, false);
            g.strokePath();
            // Cubo.
            g.fillStyle(0xf8f9fa, 1);
            g.lineStyle(R * 0.07, 0x495057, 1);
            g.beginPath();
            g.moveTo(-R * 0.78, -R * 0.55);
            g.lineTo(R * 0.78, -R * 0.55);
            g.lineTo(R * 0.6, R * 0.78);
            g.lineTo(-R * 0.6, R * 0.78);
            g.closePath();
            g.fillPath();
            g.strokePath();
            // Banda con el color del juego.
            g.fillStyle(color, 1);
            g.fillRect(-R * 0.63, R * 0.44, R * 1.26, R * 0.17);
            // Borde y pintura dentro.
            g.fillStyle(0x495057, 1);
            g.fillEllipse(0, -R * 0.55, R * 1.64, R * 0.36);
            g.fillStyle(color, 1);
            g.fillEllipse(0, -R * 0.53, R * 1.42, R * 0.26);
            // Chorreones: más pintura chorreando cuanto más color ha vuelto.
            var n = Math.round(this.fracActual * 5);
            for (var i = 0; i < n; i++) {
                var x = Phaser.Math.Linear(-R * 0.55, R * 0.55, (i + 0.5) / 5);
                var largo = R * (0.16 + 0.1 * ((i * 7) % 3));
                g.fillRoundedRect(x - R * 0.06, -R * 0.5, R * 0.12, largo, R * 0.05);
                g.fillCircle(x, -R * 0.5 + largo, R * 0.08);
            }
        },

        dibujarBoca: function (expr) {
            var pin = this.pinti;
            if (!pin) return;
            var R = pin.R;
            var b = pin.boca;
            b.clear();
            b.fillStyle(0x343a40, 1);
            b.lineStyle(R * 0.06, 0x343a40, 1);
            if (expr === 'feliz') {
                b.beginPath();
                b.arc(0, R * 0.14, R * 0.2, 0, Math.PI, false);
                b.closePath();
                b.fillPath();
                b.fillStyle(0xff6b81, 1);
                b.fillCircle(0, R * 0.27, R * 0.07);
            } else if (expr === 'wow') {
                b.fillEllipse(0, R * 0.25, R * 0.2, R * 0.26);
            } else if (expr === 'oh') {
                b.fillCircle(0, R * 0.24, R * 0.07);
            } else {
                b.beginPath();
                b.arc(0, R * 0.1, R * 0.15, 0.18 * Math.PI, 0.82 * Math.PI, false);
                b.strokePath();
            }
        },

        animarPinti: function (time, dt) {
            var pin = this.pinti;
            if (!pin) return;
            var R = pin.R;
            var resp = Math.sin(time / 450) * 0.025;
            pin.cont.setPosition(pin.baseX, pin.baseY - pin.salto + Math.sin(time / 520) * 2);
            pin.cont.setScale(pin.escX * (1 - resp), pin.escY * (1 + resp));

            if (pin.expr !== 'neutral' && time > pin.exprHasta) {
                pin.expr = 'neutral';
                this.dibujarBoca('neutral');
            }

            // Parpadeo.
            pin.parpadeo -= dt * 1000;
            var abierto = 1;
            if (pin.parpadeo < 0) {
                abierto = 0.12;
                if (pin.parpadeo < -110) pin.parpadeo = Phaser.Math.Between(2200, 4500);
            }

            // Los ojos siguen a la burbuja correcta más cercana: es una pista.
            var objetivo = null;
            var mejor = Infinity;
            var px = pin.baseX;
            var py = pin.baseY;
            this.burbujas.forEach(function (b) {
                if (!b.esObjetivo || b.reventando || b.muerta) return;
                var d = Phaser.Math.Distance.Between(px, py, b.x, b.y);
                if (d < mejor) { mejor = d; objetivo = b; }
            });
            var ang = objetivo
                ? Math.atan2(objetivo.y - py, objetivo.x - px)
                : (pin.expr === 'oh' ? -Math.PI / 2 : -Math.PI / 4);
            for (var i = 0; i < 2; i++) {
                pin.ojos[i].setScale(1, abierto);
                pin.pupilas[i].setPosition(Math.cos(ang) * R * 0.08, Math.sin(ang) * R * 0.08);
                pin.ojos[i].reflejo.setPosition(Math.cos(ang) * R * 0.08 + R * 0.04, Math.sin(ang) * R * 0.08 - R * 0.04);
            }
        },

        saltarPinti: function (veces, alto) {
            var pin = this.pinti;
            if (!pin || movimientoReducido()) return;
            this.tweens.killTweensOf(pin);
            pin.salto = 0;
            this.tweens.add({
                targets: pin, salto: alto || pin.R * 0.55, duration: 170, yoyo: true,
                repeat: (veces || 1) - 1, ease: 'Quad.easeOut',
                onComplete: function () { pin.salto = 0; }
            });
        },

        reaccionPinti: function (tipo) {
            var pin = this.pinti;
            if (!pin) return;
            var expr = { feliz: 'feliz', wow: 'wow', oh: 'oh', pista: 'feliz', baile: 'feliz' }[tipo] || 'neutral';
            pin.expr = expr;
            pin.exprHasta = this.time.now + (tipo === 'baile' ? 4500 : 900);
            this.dibujarBoca(expr);
            if (movimientoReducido()) return;
            if (tipo === 'feliz') this.saltarPinti(1);
            if (tipo === 'pista') {
                this.saltarPinti(2, pin.R * 0.4);
                var marca = this.add.text(pin.baseX, pin.baseY - pin.R * 1.5, '!', {
                    fontFamily: 'Fredoka, sans-serif', fontStyle: 'bold',
                    fontSize: Math.round(pin.R * 0.9) + 'px', color: '#ffffff',
                    stroke: hexCss(this.partida ? this.partida.colorNum : 0x495057), strokeThickness: 6
                }).setOrigin(0.5).setDepth(45);
                this.tweens.add({
                    targets: marca, y: marca.y - 20, alpha: 0, delay: 700, duration: 400,
                    onComplete: function () { marca.destroy(); }
                });
            }
            if (tipo === 'wow') {
                this.tweens.add({
                    targets: pin.cont, angle: { from: -9, to: 9 }, duration: 70, yoyo: true, repeat: 2,
                    onComplete: function () { pin.cont.angle = 0; }
                });
            }
            if (tipo === 'baile') {
                this.saltarPinti(6, pin.R * 0.5);
                this.tweens.add({
                    targets: pin.cont, angle: { from: -12, to: 12 }, duration: 170, yoyo: true, repeat: 5,
                    onComplete: function () { pin.cont.angle = 0; }
                });
            }
        },

        /* ── Efectos ───────────────────────────────────────────────── */

        chispas: function (x, y, color, cantidad, radioIni) {
            var scene = this;
            if (movimientoReducido()) return;
            var n = cantidad || 12;
            var r0 = radioIni || 0;
            for (var i = 0; i < n; i++) {
                var ang = (Math.PI * 2 / n) * i + Phaser.Math.FloatBetween(-0.25, 0.25);
                var dist = Phaser.Math.Between(50, 130);
                var sx = x + Math.cos(ang) * r0 * 0.6;
                var sy = y + Math.sin(ang) * r0 * 0.6;
                var ch = scene.add.circle(sx, sy, Phaser.Math.Between(4, 9), color, 1).setDepth(28);
                scene.tweens.add({
                    targets: ch,
                    x: sx + Math.cos(ang) * dist,
                    y: sy + Math.sin(ang) * dist + 20,
                    alpha: 0,
                    scale: 0.2,
                    duration: Phaser.Math.Between(420, 720),
                    ease: 'Cubic.easeOut',
                    onComplete: function () { ch.destroy(); }
                });
            }
        },

        textoFlotante: function (texto, x, y, color) {
            var t = this.add.text(x, y, texto, {
                fontFamily: 'Fredoka, sans-serif',
                fontSize: Math.round(Math.min(this.scale.width, this.scale.height) * 0.06) + 'px',
                fontStyle: 'bold',
                color: '#ffffff',
                stroke: hexCss(color),
                strokeThickness: 8
            }).setOrigin(0.5).setDepth(45);
            this.tweens.add({
                targets: t, y: y - 70, alpha: 0, scale: 1.3, duration: 900, ease: 'Cubic.easeOut',
                onComplete: function () { t.destroy(); }
            });
        },

        cartel: function (texto, color, ms) {
            var scene = this;
            var w = this.scale.width;
            var h = this.scale.height;
            var t = this.add.text(w / 2, h * 0.45, texto, {
                fontFamily: 'Fredoka, sans-serif',
                fontSize: Math.round(Math.min(w, h) * 0.1) + 'px',
                fontStyle: 'bold',
                color: '#ffffff',
                stroke: hexCss(color),
                strokeThickness: 12,
                align: 'center'
            }).setOrigin(0.5).setDepth(50);
            t.setShadow(0, 6, 'rgba(0,0,0,0.25)', 8);
            t.setScale(0);
            this.tweens.add({
                targets: t, scale: 1, duration: 420, ease: 'Back.easeOut',
                onComplete: function () {
                    scene.tweens.add({
                        targets: t, y: t.y - 50, alpha: 0, delay: ms || 1100, duration: 420,
                        onComplete: function () { t.destroy(); }
                    });
                }
            });
        },

        /** Momento cumbre a mitad de partida: una oleada de burbujas correctas. */
        lluvia: function () {
            var scene = this;
            var p = this.partida;
            var w = this.scale.width;
            var h = this.scale.height;
            this.cartel((p.textos && p.textos.lluvia) || '¡Lluvia de color!', p.colorNum, 1000);
            avisar('onEvento', 'lluvia');
            var total = w < 700 ? 5 : 7;
            for (var i = 0; i < total; i++) {
                (function (k) {
                    scene.time.delayedCall(500 + k * 230, function () {
                        if (!scene.jugando) return;
                        var objetivo = k % 3 !== 2;
                        var x = Phaser.Math.Linear(w * 0.1, w * 0.9, (k + 0.5) / total);
                        scene.crearBurbuja(scene.elegirObjeto(objetivo), x, h + scene.radio() * 1.2,
                            scene.velocidadActual() * 1.1);
                    });
                })(i);
            }
        },

        /** Final: revientan todas, aparece el arcoíris y el mundo queda vivo. */
        climax: function () {
            var scene = this;
            var p = this.partida;
            var w = this.scale.width;
            var h = this.scale.height;

            this.vivas().forEach(function (b, i) {
                b.reventando = true;
                scene.time.delayedCall(i * 110, function () {
                    scene.estallarBurbuja(b, b.esObjetivo ? p.colorNum : ARCOIRIS[i % ARCOIRIS.length]);
                    Sonido.pop(i + 1);
                    b.cont.destroy();
                    b.muerta = true;
                });
            });
            this.nubesTraviesas.forEach(function (n) { if (n.viva) scene.soplarNube(n); });

            this.teñirMundo(1, p.colorNum);
            Sonido.fanfarria();
            vibrar([30, 60, 30]);
            if (!movimientoReducido()) this.cameras.main.flash(350, 255, 255, 255);

            // Arcoíris que se dibuja de izquierda a derecha.
            var g = this.add.graphics().setDepth(-27);
            this.arcoiris = g;
            var cx = w / 2;
            var cy = h * 0.8;
            var R = Math.min(w * 0.46, h * 0.62);
            var banda = Math.max(10, R * 0.075);
            var prog = { k: 0 };
            this.tweens.add({
                targets: prog, k: 1, duration: movimientoReducido() ? 1 : 1300, ease: 'Sine.easeInOut',
                onUpdate: function () {
                    g.clear();
                    for (var i = 0; i < ARCOIRIS.length; i++) {
                        g.lineStyle(banda, ARCOIRIS[i], 0.85);
                        g.beginPath();
                        g.arc(cx, cy, R - i * banda, Math.PI, Math.PI + prog.k * Math.PI, false);
                        g.strokePath();
                    }
                }
            });

            this.cartel((p.textos && p.textos.final) || '¡Lo lograste!', p.colorNum, 1500);
            this.reaccionPinti('baile');

            // Los objetos coleccionados celebran en ola.
            this.trofeos.forEach(function (t, i) {
                if (!t.img) return;
                scene.time.delayedCall(600 + i * 90, function () {
                    t.saltando = true;
                    scene.tweens.add({
                        targets: t.img, y: t.baseY - 46, duration: 260, yoyo: true, repeat: 1,
                        ease: 'Sine.easeOut',
                        onComplete: function () { t.saltando = false; }
                    });
                });
            });

            this.time.delayedCall(3000, function () { scene.mostrarAlbum(); });
        },

        /* ── Álbum de colección ────────────────────────────────────── */

        estrellas: function () {
            var p = this.partida;
            if (!p) return 0;
            // Tono suave: nunca menos de una estrella, y equivocarse poco no quita nada.
            if (p.fallos <= 3) return 3;
            if (p.fallos <= 8) return 2;
            return 1;
        },

        mostrarAlbum: function () {
            var scene = this;
            var p = this.partida;
            var w = this.scale.width;
            var h = this.scale.height;
            var reducido = movimientoReducido();
            global.document.body.classList.add('album-abierto');

            var capa = this.add.rectangle(w / 2, h / 2, w, h, 0x0b1e33, 0).setDepth(60);
            this.tweens.add({ targets: capa, fillAlpha: 0.45, duration: 300 });

            var cw = Math.min(w * 0.86, 760);
            var ch = Math.min(h * 0.8, 520);
            var card = this.add.container(w / 2, h / 2).setDepth(61);
            var fondo = this.add.graphics();
            fondo.fillStyle(0xffffff, 1);
            fondo.fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 28);
            fondo.lineStyle(6, p.colorNum, 1);
            fondo.strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 28);
            card.add(fondo);

            var titulo = this.add.text(0, -ch / 2 + ch * 0.1, (p.textos && p.textos.album) || '¡Tu colección!', {
                fontFamily: 'Fredoka, sans-serif', fontStyle: 'bold',
                fontSize: Math.round(ch * 0.085) + 'px', color: '#343a40'
            }).setOrigin(0.5);
            card.add(titulo);

            // Stickers: un objeto distinto por casilla, con cuántos atrapó.
            var ids = Object.keys(p.coleccion);
            var cols = Math.min(Math.max(ids.length, 1), 4);
            var filas = Math.ceil(ids.length / cols) || 1;
            var celda = Math.min((cw * 0.84) / cols, (ch * 0.46) / filas);
            var y0 = -ch / 2 + ch * 0.22;
            var stickers = [];
            ids.forEach(function (id, i) {
                var col = i % cols;
                var fila = Math.floor(i / cols);
                var enFila = Math.min(cols, ids.length - fila * cols);
                var x = (col - (enFila - 1) / 2) * celda;
                var y = y0 + (fila + 0.5) * celda;
                var st = scene.add.container(x, y);
                var circ = scene.add.circle(0, 0, celda * 0.4, 0xf8f9fa, 1);
                circ.setStrokeStyle(4, p.colorNum, 1);
                st.add(circ);
                if (scene.textures.exists(texKey(id))) {
                    var im = scene.add.image(0, 0, texKey(id));
                    im.setScale((celda * 0.5) / (Math.max(im.width, im.height) || 1));
                    st.add(im);
                }
                var cant = p.coleccion[id];
                if (cant > 1) {
                    st.add(scene.add.circle(celda * 0.3, -celda * 0.3, celda * 0.13, p.colorNum, 1));
                    st.add(scene.add.text(celda * 0.3, -celda * 0.3, 'x' + cant, {
                        fontFamily: 'Fredoka, sans-serif', fontStyle: 'bold',
                        fontSize: Math.round(celda * 0.13) + 'px', color: '#ffffff'
                    }).setOrigin(0.5));
                }
                st.setAngle(Phaser.Math.Between(-8, 8));
                st.setScale(reducido ? 1 : 0);
                card.add(st);
                stickers.push(st);
            });

            // Estrellas.
            var nEst = this.estrellas();
            var estrellas = [];
            var yEst = ch / 2 - ch * 0.28;
            var rEst = ch * 0.07;
            for (var e = 0; e < 3; e++) {
                var est = this.add.star((e - 1) * rEst * 2.6, yEst, 5, rEst * 0.45, rEst, 0xe9ecef);
                est.setStrokeStyle(3, 0xced4da, 1);
                card.add(est);
                estrellas.push(est);
            }

            // Botón seguir.
            var bw = cw * 0.36;
            var bh = ch * 0.13;
            var by = ch / 2 - ch * 0.12;
            var boton = this.add.container(0, by);
            var bfondo = this.add.graphics();
            bfondo.fillStyle(0x37b24d, 1);
            bfondo.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
            bfondo.lineStyle(4, 0xffffff, 1);
            bfondo.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
            boton.add(bfondo);
            boton.add(this.add.text(0, 0, (p.textos && p.textos.seguir) || '¡Seguir!', {
                fontFamily: 'Fredoka, sans-serif', fontStyle: 'bold',
                fontSize: Math.round(bh * 0.5) + 'px', color: '#ffffff'
            }).setOrigin(0.5));
            boton.setAlpha(0);
            card.add(boton);

            this.album = {
                capa: capa, card: card, boton: boton, listo: false,
                botonRect: { x: w / 2 - bw / 2, y: h / 2 + by - bh / 2, w: bw, h: bh }
            };

            if (!reducido) {
                card.setScale(0.6);
                card.setAlpha(0);
                this.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 380, ease: 'Back.easeOut' });
            }

            var t = 450;
            stickers.forEach(function (st, i) {
                scene.time.delayedCall(t + i * 220, function () {
                    Sonido.sticker(i);
                    if (!reducido) scene.tweens.add({ targets: st, scale: 1, duration: 300, ease: 'Back.easeOut' });
                });
            });
            t += stickers.length * 220 + 250;
            estrellas.forEach(function (est, i) {
                if (i >= nEst) return;
                scene.time.delayedCall(t + i * 380, function () {
                    Sonido.estrella(i);
                    est.setFillStyle(0xffd43b, 1);
                    est.setStrokeStyle(3, DORADO, 1);
                    if (!reducido) {
                        est.setScale(1.6);
                        scene.tweens.add({ targets: est, scale: 1, duration: 280, ease: 'Back.easeOut' });
                        scene.chispas(w / 2 + est.x, h / 2 + est.y, 0xffd43b, 8, 6);
                    }
                });
            });
            t += 3 * 380 + 200;
            this.time.delayedCall(t, function () {
                if (!scene.album) return;
                scene.album.listo = true;
                scene.tweens.add({ targets: boton, alpha: 1, duration: 250 });
                if (!reducido) {
                    scene.tweens.add({
                        targets: boton, scale: 1.06, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
                    });
                }
            });
            // Si nadie toca, sigue solo.
            this.time.delayedCall(t + 9000, function () { scene.cerrarAlbum(); });
        },

        tocarAlbum: function (px, py) {
            var a = this.album;
            if (!a || !a.listo) return;
            var r = a.botonRect;
            if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) this.cerrarAlbum();
        },

        cerrarAlbum: function () {
            var a = this.album;
            if (!a) return;
            this.album = null;
            Sonido.sticker(4);
            this.tweens.killTweensOf(a.boton);
            this.tweens.add({
                targets: [a.card, a.capa], alpha: 0, duration: 300,
                onComplete: function () {
                    a.card.destroy();
                    a.capa.destroy();
                    global.document.body.classList.remove('album-abierto');
                    avisar('onCompleto');
                }
            });
        },

        limpiarTodo: function () {
            this.burbujas.forEach(function (b) { if (b.cont) b.cont.destroy(); });
            this.nubesTraviesas.forEach(function (n) { if (n.cont) n.cont.destroy(); });
            this.trofeos.forEach(function (t) { if (t.img) t.img.destroy(); });
            this.manchas.forEach(function (m) { m.g.destroy(); });
            if (this.arcoiris) this.arcoiris.destroy();
            this.burbujas = [];
            this.nubesTraviesas = [];
            this.trofeos = [];
            this.manchas = [];
            this.arcoiris = null;
            this.jugando = false;
            this.combo = 0;
            this.ayudaActiva = false;
            this.teñirMundo(0, this.colorActual);
        },

        /* ── Partida ───────────────────────────────────────────────── */

        prepararPartida: function (opts) {
            var color = opts.color;
            var pool = (opts.pool || []).slice();
            this.limpiarTodo();
            this.partida = {
                color: color,
                colorNum: hexNum(metaColor(color).hex),
                meta: Math.max(1, opts.meta | 0),
                cfg: DIFICULTAD[opts.dificultad] || DIFICULTAD['34'],
                poolObjetivo: pool.filter(function (id) { return metaObj(id).color === color; }),
                poolOtros: pool.filter(function (id) { return metaObj(id).color !== color; }),
                atrapados: 0,
                fallos: 0,
                especiales: 0,
                nubesSopladas: 0,
                coleccion: {},
                lluviaHecha: false,
                terminada: false,
                ultimoObj: null,
                textos: opts.textos || {}
            };
            this.colorActual = this.partida.colorNum;
            this.teñirMundo(0, this.colorActual);
            return this.ensureTextures(pool);
        },

        iniciar: function () {
            if (!this.partida) return;
            this.jugando = true;
            this.ultimoAcierto = this.time.now;
            this.ultimoAviso = this.time.now;
            this.acumSpawn = 0;
            this.soltarBurbuja(true);
            var scene = this;
            this.time.delayedCall(600, function () { if (scene.jugando) scene.soltarBurbuja(false); });
        },

        /** Tres burbujas quietas para el ejemplo guiado. Devuelve el id objetivo. */
        demo: function () {
            var p = this.partida;
            if (!p) return null;
            var w = this.scale.width;
            var h = this.scale.height;
            var posiciones = [0.26, 0.45, 0.64];
            var iObj = Phaser.Math.Between(0, 2);
            var objetivoId = null;
            // Dos distractores distintos entre sí para que el ejemplo se entienda.
            var otros = Phaser.Utils.Array.Shuffle(p.poolOtros.slice());
            var k = 0;
            for (var i = 0; i < 3; i++) {
                var esObj = i === iObj;
                var objId = (!esObj && otros.length) ? otros[k++ % otros.length] : this.elegirObjeto(esObj);
                var b = this.crearBurbuja(objId, w * posiciones[i], h * 0.56, 0, 'demo');
                if (esObj) objetivoId = b.id;
            }
            return objetivoId;
        },

        buscar: function (id) {
            for (var i = 0; i < this.burbujas.length; i++) {
                if (this.burbujas[i].id === id) return this.burbujas[i];
            }
            return null;
        },

        reventarDemo: function (id) {
            var b = this.buscar(id);
            if (!b || b.reventando) return Promise.resolve();
            return this.atrapar(b, true);
        },

        limpiarDemo: function () {
            var scene = this;
            this.burbujas.forEach(function (b) {
                if (b.quieta !== 'demo' || b.muerta) return;
                b.reventando = true;
                scene.tweens.add({
                    targets: b.cont, alpha: 0, scale: 0.4, duration: 300,
                    onComplete: function () { b.cont.destroy(); b.muerta = true; }
                });
            });
        },

        rectPantalla: function (id) {
            var b = this.buscar(id);
            if (!b) return null;
            var sc = screenScale(this);
            var size = b.r * 2;
            return {
                x: sc.rect.left + b.x * sc.sx,
                y: sc.rect.top + b.y * sc.sy,
                left: sc.rect.left + (b.x - b.r) * sc.sx,
                top: sc.rect.top + (b.y - b.r) * sc.sy,
                width: size * sc.sx,
                height: size * sc.sy
            };
        },

        ensureTextures: function (ids) {
            var scene = this;
            var missing = [];
            ids.forEach(function (id) {
                var key = texKey(id);
                if (scene.textures.exists(key) || loadedKeys[key]) return;
                var src = metaObj(id).img || '';
                if (!src) return;
                missing.push({ key: key, src: src });
            });
            if (!missing.length) return Promise.resolve();

            return new Promise(function (resolve) {
                // SVG sin width/height llegan negros con load.image en WebGL.
                missing.forEach(function (item) {
                    if (/\.svg(\?|$)/i.test(item.src)) {
                        scene.load.svg(item.key, item.src, { scale: 2 });
                    } else {
                        scene.load.image(item.key, item.src);
                    }
                });
                scene.load.once('complete', function () {
                    missing.forEach(function (item) { loadedKeys[item.key] = true; });
                    resolve();
                });
                scene.load.start();
            });
        },

        /* ── Mundo (descolorido → vivo) ────────────────────────────── */

        construirMundo: function () {
            var w = this.scale.width;
            var h = this.scale.height;

            this.cielo = this.add.graphics().setDepth(-30);

            var solR = Math.min(w, h) * 0.07;
            this.rayos = this.add.graphics().setDepth(-29);
            this.dibujarRayos(solR);
            this.sol = this.add.circle(0, 0, solR, 0xcfd6de, 1).setDepth(-28);

            this.nubes = [];
            var defsNube = [
                { x: 0.18, y: 0.3, e: 1.0, v: 10 },
                { x: 0.5, y: 0.22, e: 0.75, v: 14 },
                { x: 0.8, y: 0.34, e: 0.9, v: 7 }
            ];
            for (var i = 0; i < defsNube.length; i++) {
                var d = defsNube[i];
                var esc = Math.min(w, h) * 0.055 * d.e;
                var nube = this.add.container(w * d.x, h * d.y).setDepth(-29.5);
                nube.add(this.add.circle(-esc * 0.9, esc * 0.18, esc * 0.72, 0xffffff, 0.9));
                nube.add(this.add.circle(0, -esc * 0.12, esc, 0xffffff, 0.9));
                nube.add(this.add.circle(esc * 0.95, esc * 0.2, esc * 0.66, 0xffffff, 0.9));
                nube.vel = d.v;
                nube.anchoNube = esc * 2.2;
                this.nubes.push(nube);
            }

            this.terreno = this.add.graphics().setDepth(-26);

            this.arboles = [];
            this.pastos = [];
            var nArb = w < 700 ? 3 : 6;
            for (var a = 0; a < nArb; a++) {
                var cont = this.add.container(0, 0).setDepth(-25);
                var tronco = this.add.rectangle(0, 0, 10, 34, 0xa6adb6);
                var copa1 = this.add.circle(0, -30, 26, 0xc3cbd4);
                var copa2 = this.add.circle(-16, -16, 19, 0xcbd3db);
                var copa3 = this.add.circle(16, -16, 19, 0xcbd3db);
                cont.add([tronco, copa1, copa2, copa3]);
                cont.tronco = tronco;
                cont.copas = [copa1, copa2, copa3];
                this.arboles.push(cont);
            }
            var nPasto = w < 700 ? 14 : 26;
            for (var p = 0; p < nPasto; p++) {
                this.pastos.push(this.add.triangle(0, 0, 0, 0, 6, -20, 12, 0, 0xbfc7d0).setDepth(-24));
            }

            this.redibujarMundo();
        },

        dibujarRayos: function (r) {
            var g = this.rayos;
            g.clear();
            g.fillStyle(0xdbe1e8, 0.75);
            for (var i = 0; i < 12; i++) {
                var ang = (Math.PI * 2 / 12) * i;
                g.fillTriangle(
                    Math.cos(ang) * r * 1.25, Math.sin(ang) * r * 1.25,
                    Math.cos(ang + 0.1) * r * 1.9, Math.sin(ang + 0.1) * r * 1.9,
                    Math.cos(ang - 0.1) * r * 1.9, Math.sin(ang - 0.1) * r * 1.9
                );
            }
        },

        mezcla: function (grisHex, colorNum, frac) {
            var gris = Phaser.Display.Color.ValueToColor(grisHex);
            var col = Phaser.Display.Color.ValueToColor(colorNum);
            var m = Phaser.Display.Color.Interpolate.ColorWithColor(gris, col, 100, Math.round(frac * 100));
            return Phaser.Display.Color.GetColor(m.r, m.g, m.b);
        },

        redibujarMundo: function () {
            var w = this.scale.width;
            var h = this.scale.height;
            var frac = this.fracActual || 0;
            var color = this.colorActual || 0x8fa3b8;
            var scene = this;

            if (this.cielo) {
                var g = this.cielo;
                g.clear();
                var arriba = this.mezcla(0xdfe3e8, this.mezcla(0x6ec5f5, color, 0.1), frac);
                var abajo = this.mezcla(0xeef0f3, this.mezcla(0xe4f6ff, color, 0.08), frac);
                var bandas = 28;
                for (var b = 0; b < bandas; b++) {
                    var t = b / (bandas - 1);
                    var cc = Phaser.Display.Color.Interpolate.ColorWithColor(
                        Phaser.Display.Color.ValueToColor(arriba),
                        Phaser.Display.Color.ValueToColor(abajo),
                        100, Math.round(t * 100)
                    );
                    g.fillStyle(Phaser.Display.Color.GetColor(cc.r, cc.g, cc.b), 1);
                    g.fillRect(0, (h / bandas) * b - 1, w, h / bandas + 2);
                }
            }

            // Sol arriba a la izquierda: arriba a la derecha están los botones.
            var solR = Math.min(w, h) * 0.07;
            var solX = w * 0.09;
            var solY = h * 0.16;
            if (this.sol) {
                this.sol.setPosition(solX, solY);
                this.sol.setRadius(solR);
                this.sol.setFillStyle(this.mezcla(0xcfd6de, 0xffd43b, frac), 1);
            }
            if (this.rayos) {
                this.dibujarRayos(solR);
                this.rayos.setPosition(solX, solY);
                this.rayos.setAlpha(0.35 + 0.5 * frac);
            }

            this.nubes.forEach(function (n) { n.setAlpha(0.45 + 0.45 * frac); });

            if (this.terreno) {
                var t2 = this.terreno;
                t2.clear();
                var baseM = h * 0.72;
                t2.fillStyle(this.mezcla(0xc8cfd7, 0x7fb069, frac * 0.7), 1);
                t2.fillTriangle(-w * 0.04, baseM, w * 0.2, h * 0.42, w * 0.44, baseM);
                t2.fillTriangle(w * 0.32, baseM, w * 0.56, h * 0.47, w * 0.8, baseM);
                t2.fillTriangle(w * 0.62, baseM, w * 0.86, h * 0.4, w * 1.1, baseM);
                t2.fillStyle(this.mezcla(0xdde2e8, 0xffffff, frac), 0.85);
                t2.fillTriangle(w * 0.15, h * 0.505, w * 0.2, h * 0.42, w * 0.25, h * 0.505);
                t2.fillTriangle(w * 0.81, h * 0.485, w * 0.86, h * 0.4, w * 0.91, h * 0.485);
                t2.fillStyle(this.mezcla(0xd2d8df, 0x8ed081, frac), 1);
                t2.fillEllipse(w * 0.3, h * 0.84, w * 1.0, h * 0.36);
                t2.fillEllipse(w * 0.85, h * 0.86, w * 0.8, h * 0.32);
                t2.fillStyle(this.mezcla(0xdfe4ea, 0x6ab04c, frac), 1);
                t2.fillRoundedRect(-40, h * 0.81, w + 80, h * 0.4, 36);
            }

            this.arboles.forEach(function (arb, i) {
                var n = scene.arboles.length;
                var x = w * (0.06 + 0.88 * (i + 0.5) / n);
                var y = h * (i % 2 === 0 ? 0.805 : 0.785);
                var esc = Math.min(w, h) / 620;
                arb.setPosition(x, y);
                arb.setScale(esc * (i % 2 === 0 ? 1 : 0.82));
                arb.tronco.setFillStyle(scene.mezcla(0xa6adb6, 0x8d6e4e, frac));
                arb.copas[0].setFillStyle(scene.mezcla(0xc3cbd4, 0x4a9d3f, frac));
                arb.copas[1].setFillStyle(scene.mezcla(0xcbd3db, 0x5bb54e, frac));
                arb.copas[2].setFillStyle(scene.mezcla(0xcbd3db, 0x5bb54e, frac));
            });

            this.pastos.forEach(function (m, i) {
                var n = scene.pastos.length;
                m.setPosition(w * (0.02 + 0.96 * (i + 0.5) / n), h * (0.84 + (i % 3) * 0.05));
                m.setScale(Math.min(w, h) / 560);
                m.setFillStyle(scene.mezcla(0xbfc7d0, 0x4e9a3a, frac));
            });
        },

        teñirMundo: function (frac, colorNum) {
            this.fracActual = Phaser.Math.Clamp(frac, 0, 1);
            this.colorActual = colorNum;
            this.redibujarMundo();
            this.redibujarPinti();
        }
    });

    function montar(opts) {
        opts = opts || {};
        Host = global.PedniaPhaserHost;
        Phaser = global.Phaser;
        if (!Phaser) return Promise.reject(new Error('Phaser no cargado'));
        if (!Host) return Promise.reject(new Error('PedniaPhaserHost no cargado'));

        gameConfig = opts.gameConfig || opts.config || null;
        callbacks = opts.callbacks || {};
        loadedKeys = Object.create(null);
        readyPromise = new Promise(function (resolve) { readyResolve = resolve; });

        var parentId = opts.parent || 'phaser-tablero';
        var el = typeof parentId === 'string' ? global.document.getElementById(parentId) : parentId;
        if (!el) return Promise.reject(new Error('Falta #' + parentId));

        // Pantalla completa antes de medir el contenedor.
        inyectarEstilo();
        global.document.body.classList.add('modo-arcade');
        Sonido.desbloquear();

        var w = Math.max(320, el.clientWidth || global.innerWidth || 800);
        var h = Math.max(240, el.clientHeight || global.innerHeight || 450);

        Host.destruirIntro();

        game = Host.crear({
            type: Phaser.AUTO,
            parent: el,
            width: w,
            height: h,
            backgroundColor: '#dfe3e8',
            audio: { noAudio: true },
            scene: [EscenaBurbujas],
            scale: {
                mode: Phaser.Scale.RESIZE,
                autoCenter: Phaser.Scale.CENTER_BOTH
            }
        });

        if (!game) {
            global.document.body.classList.remove('modo-arcade');
            return Promise.reject(new Error('No se pudo crear Phaser.Game'));
        }
        return esperarEscena();
    }

    function prepararPartida(opts) {
        return esperarEscena().then(function (scene) { return scene.prepararPartida(opts || {}); });
    }

    function iniciar() {
        if (sceneRef) sceneRef.iniciar();
    }

    function demo() {
        return sceneRef ? sceneRef.demo() : null;
    }

    function reventarDemo(id) {
        return sceneRef ? sceneRef.reventarDemo(id) : Promise.resolve();
    }

    function limpiarDemo() {
        if (sceneRef) sceneRef.limpiarDemo();
    }

    function anclaDemo(id) {
        var rect = sceneRef ? sceneRef.rectPantalla(id) : null;
        var el = global.document.getElementById('phaser-mano-ancla');
        if (!el) {
            el = global.document.createElement('div');
            el.id = 'phaser-mano-ancla';
            el.setAttribute('aria-hidden', 'true');
            el.style.cssText = 'position:fixed;pointer-events:none;z-index:5;';
            global.document.body.appendChild(el);
        }
        if (!rect) {
            el.style.display = 'none';
            return el;
        }
        el.style.display = 'block';
        el.style.left = rect.left + 'px';
        el.style.top = rect.top + 'px';
        el.style.width = rect.width + 'px';
        el.style.height = rect.height + 'px';
        return el;
    }

    function estado() {
        if (!sceneRef || !sceneRef.partida) return null;
        var p = sceneRef.partida;
        return {
            atrapados: p.atrapados,
            meta: p.meta,
            fallos: p.fallos,
            especiales: p.especiales,
            nubesSopladas: p.nubesSopladas,
            coleccion: p.coleccion,
            estrellas: sceneRef.estrellas(),
            jugando: sceneRef.jugando,
            album: !!sceneRef.album,
            nubesTraviesas: sceneRef.nubesTraviesas.filter(function (n) { return n.viva; }).map(function (n) {
                return { x: n.cont.x, y: n.cont.y, r: n.r };
            }),
            burbujas: sceneRef.vivas().map(function (b) {
                return {
                    id: b.id, objId: b.objId, tipo: b.tipo, golpes: b.golpes,
                    objetivo: b.esObjetivo, x: b.x, y: b.y, r: b.r
                };
            })
        };
    }

    function listo() {
        return !!(game && sceneRef);
    }

    function destruir() {
        sceneRef = null;
        readyPromise = null;
        readyResolve = null;
        game = null;
        global.document.body.classList.remove('modo-arcade', 'album-abierto');
        var ancla = global.document.getElementById('phaser-mano-ancla');
        if (ancla && ancla.parentNode) ancla.parentNode.removeChild(ancla);
        if (Host) Host.destruirJuego();
        else if (global.PedniaPhaserHost) global.PedniaPhaserHost.destruirJuego();
    }

    global.PedniaEncuentraColorPhaser = {
        montar: montar,
        listo: listo,
        prepararPartida: prepararPartida,
        iniciar: iniciar,
        demo: demo,
        reventarDemo: reventarDemo,
        limpiarDemo: limpiarDemo,
        anclaDemo: anclaDemo,
        estado: estado,
        destruir: destruir
    };
})(typeof window !== 'undefined' ? window : this);
