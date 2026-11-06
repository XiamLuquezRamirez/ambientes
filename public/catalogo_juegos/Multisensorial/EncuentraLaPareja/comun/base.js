/**
 * PedniaParejaBase — armazón común de los motores Phaser de Encuentra la Pareja.
 *
 * Cada juego define su escena (create/update + demo/jugar/fiestaFinal que devuelven Promise) y
 * llama a crearMotor. script.js usa window.PedniaJuego:
 *   montar({ gameConfig, nivel, ctx })  → Promise
 *   demo()  jugar()  fiestaFinal()       → Promise
 *   detener()  destruir()
 *
 * ctx (lo da script.js): decir(linea, opts), callar(), mano(opts), quitarMano(), efecto(nombre),
 *   vivo(), textos, reto, nivel, elemento(id).
 */
(function (global) {
    'use strict';

    function reducido() {
        return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function esperar(scene, ms) {
        return new Promise(function (r) { scene.time.delayedCall(ms, r); });
    }

    function tween(scene, cfg) {
        return new Promise(function (r) {
            var fin = cfg.onComplete;
            cfg.onComplete = function () {
                if (fin) fin.apply(this, arguments);
                r();
            };
            scene.tweens.add(cfg);
        });
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

    function rnd(a, b) { return a + Math.random() * (b - a); }

    /** Lluvia de chispas, notas, corazones… desde (x, y). */
    function estallido(scene, x, y, o) {
        o = o || {};
        var A = global.PedniaArte;
        var n = o.n || 14;
        var colores = o.colores || [0xff6b6b, 0xfcc419, 0x51cf66, 0x339af0, 0xcc5de8, 0xff922b];
        for (var i = 0; i < n; i++) {
            var a = (o.angulo != null ? o.angulo : -Math.PI / 2) + (Math.random() - 0.5) * (o.abanico || Math.PI * 2);
            var d = (o.dist || 140) * (0.5 + Math.random() * 0.6);
            var tam = (o.tam || 26) * (0.6 + Math.random() * 0.7);
            var p = scene.add.image(x, y, A.textura(scene, o.tex || 'chispa', 64)).setDisplaySize(tam, tam).setDepth(o.depth || 60);
            if (o.tex !== 'corazon' && o.tex !== 'humo') p.setTint(colores[i % colores.length]);
            if (o.sinTinte) p.clearTint();
            scene.tweens.add({
                targets: p,
                x: x + Math.cos(a) * d,
                y: y + Math.sin(a) * d + (o.gravedad || 0),
                angle: rnd(-120, 120),
                alpha: { from: 1, to: 0 },
                scale: p.scale * 0.4,
                duration: (o.ms || 900) * (0.7 + Math.random() * 0.5),
                ease: 'Quad.easeOut',
                onComplete: function () { this.targets[0].destroy(); }
            });
        }
    }

    /** Confeti que cae por toda la pantalla. */
    function confeti(scene, n) {
        var w = scene.scale.width;
        var h = scene.scale.height;
        var colores = [0xff6b6b, 0xfcc419, 0x51cf66, 0x339af0, 0xcc5de8, 0xff922b];
        for (var i = 0; i < (n || 70); i++) {
            var p = scene.add.rectangle(rnd(0, w), rnd(-h * 0.4, -10), rnd(7, 12), rnd(10, 18), colores[i % 6]).setDepth(80);
            scene.tweens.add({
                targets: p, y: h + 30, x: p.x + rnd(-80, 80), angle: rnd(-360, 360),
                duration: rnd(1800, 3200), delay: rnd(0, 900), ease: 'Sine.easeIn',
                onComplete: function () { this.targets[0].destroy(); }
            });
        }
    }

    /** Hilo de pista: si el niño no hace nada en `ms`, llama a fn (que suele mover la mano). */
    function crearPista(scene, ms, fn) {
        var p = { timer: null, gen: 0 };
        p.reiniciar = function (espera) {
            p.gen += 1;
            if (p.timer) p.timer.remove();
            var g = p.gen;
            p.timer = scene.time.delayedCall(espera || ms, function () {
                if (g !== p.gen) return;
                Promise.resolve(fn(function () { return g !== p.gen; })).then(function () {
                    if (g === p.gen) p.reiniciar(Math.max(ms, 9000) + 2000);
                });
            });
        };
        p.parar = function () {
            p.gen += 1;
            if (p.timer) p.timer.remove();
            p.timer = null;
        };
        return p;
    }

    function sfx(nombre) {
        if (global.EncuentraParejaSfx) global.EncuentraParejaSfx.sonar(nombre);
    }

    /** Vuelo en arco (curva de Bézier) de un contenedor hasta (x, y). */
    function volarA(scene, cont, x, y, ms, escala, alMover, alto) {
        var x0 = cont.x;
        var y0 = cont.y;
        var cima = Math.min(y0, y) - (alto != null ? alto : 120);
        var s0 = cont.scale;
        var prog = { k: 0 };
        sfx('vuela');
        return tween(scene, {
            targets: prog, k: 1, duration: ms || 700, ease: 'Sine.easeInOut',
            onUpdate: function () {
                var k = prog.k;
                var a = (1 - k) * (1 - k);
                var b = 2 * (1 - k) * k;
                var c = k * k;
                cont.x = a * x0 + b * ((x0 + x) / 2) + c * x;
                cont.y = a * y0 + b * cima + c * y;
                cont.scale = s0 + ((escala != null ? escala : s0) - s0) * k;
                cont.angle = Math.sin(k * Math.PI) * 14 * (x > x0 ? 1 : -1);
                if (alMover) alMover(cont.x, cont.y);
            }
        }).then(function () { cont.angle = 0; });
    }

    /** Notas musicales que salen de (x, y); con `hacia` vuelan a ese punto. */
    function notas(scene, x, y, n, hacia) {
        var A = global.PedniaArte;
        for (var i = 0; i < (n || 3); i++) {
            var nota = scene.add.image(x + rnd(-20, 20), y, A.textura(scene, 'nota', 64))
                .setDisplaySize(30, 30).setDepth(40).setTint([0xe64980, 0x1c7ed6, 0xf59f00, 0x2f9e44][i % 4]);
            scene.tweens.add({
                targets: nota,
                x: hacia ? hacia.x : x + rnd(-90, 90),
                y: hacia ? hacia.y : y - rnd(80, 150),
                angle: rnd(-30, 30), alpha: { from: 1, to: hacia ? 0.2 : 0 },
                scale: hacia ? nota.scale * 0.5 : nota.scale * 1.2,
                delay: i * 140, duration: hacia ? 650 : 1100, ease: hacia ? 'Quad.easeIn' : 'Sine.easeOut',
                onComplete: function () { this.targets[0].destroy(); }
            });
        }
    }

    /** Volutas de aroma que suben en espiral desde (x, y); con `hacia` entran en ese punto. */
    function aroma(scene, x, y, o) {
        o = o || {};
        var A = global.PedniaArte;
        var n = o.n || 5;
        var color = o.color || 0xe64980;
        for (var i = 0; i < n; i++) {
            var p = scene.add.image(x, y, A.textura(scene, 'humo', 64)).setTint(color).setDepth(o.depth || 35);
            var tam = (o.tam || 30) * rnd(0.7, 1.2);
            p.setDisplaySize(tam, tam);
            p.alpha = 0;
            var fase = Math.random() * Math.PI * 2;
            var prog = { k: 0 };
            var hacia = o.hacia;
            var alto = o.alto || 110;
            (function (p, fase, prog) {
                scene.tweens.add({
                    targets: prog, k: 1, delay: i * (o.paso || 160), duration: o.ms || 1400, ease: hacia ? 'Sine.easeIn' : 'Sine.easeOut',
                    onUpdate: function () {
                        var k = prog.k;
                        var gx = x + Math.sin(k * Math.PI * 3 + fase) * 18 * (1 - k * 0.5);
                        var gy = y - k * alto;
                        if (hacia) {
                            var hx = typeof hacia === 'function' ? hacia() : hacia;
                            gx = gx + (hx.x - gx) * k * k;
                            gy = gy + (hx.y - gy) * k * k;
                        }
                        p.setPosition(gx, gy);
                        p.alpha = Math.sin(Math.min(1, k * 1.2) * Math.PI) * 0.85;
                        p.setScale(p.scaleX * (hacia ? 0.995 : 1.006));
                    },
                    onComplete: function () { p.destroy(); }
                });
            })(p, fase, prog);
        }
    }

    /** Cielo con degradado vertical como imagen estirada. */
    function cielo(scene, clave, stops) {
        if (!scene.textures.exists(clave)) {
            var t = scene.textures.createCanvas(clave, 4, 256);
            var c = t.getContext();
            var g = c.createLinearGradient(0, 0, 0, 256);
            stops.forEach(function (s) { g.addColorStop(s[0], s[1]); });
            c.fillStyle = g;
            c.fillRect(0, 0, 4, 256);
            t.refresh();
        }
        return clave;
    }

    /**
     * Fila de burbujas del mural (3-4 años): oído, ojo, nariz, lengua abajo al centro.
     *   var fila = filaOrganos(scene, ['oido','ojo','nariz','lengua'], { depth: 20 })
     *   fila.organos[id], fila.orden, fila.pos(i), fila.ubicar(), fila.en(x, y), fila.actualizar(time, foco)
     */
    function filaOrganos(scene, ids, opts) {
        opts = opts || {};
        var f = { organos: {}, orden: ids.slice() };
        f.radio = function () {
            // Limitado también por el ancho: en tableta vertical las burbujas no se tocan.
            return Math.max(36, Math.min(72, Math.min(scene.scale.width, scene.scale.height) * 0.085, scene.scale.width * 0.068));
        };
        f.pos = function (i) {
            var w = scene.scale.width;
            var h = scene.scale.height;
            var r = f.radio();
            var paso = Math.min(w * 0.17, r * 2.9);
            // Los botones de accesibilidad y volumen ocupan la esquina inferior derecha (~150 px).
            var medio = (f.orden.length - 1) / 2 * paso + r * 1.1;
            var cx = Math.min(w * 0.5, w - 150 - medio);
            return { x: cx + (i - (f.orden.length - 1) / 2) * paso, y: h - r * 1.45 };
        };
        f.ubicar = function () {
            f.orden.forEach(function (id, i) {
                var o = f.organos[id];
                var p = f.pos(i);
                if (o.libre) return;
                o.base.x = p.x;
                o.base.y = p.y;
                if (!o.moviendo) o.cont.setPosition(p.x, p.y);
            });
        };
        f.en = function (x, y) {
            var hit = null;
            f.orden.forEach(function (id) {
                var o = f.organos[id];
                if (!hit && o.cont.visible && o.cont.alpha > 0.3 && o.contiene(x, y, 1.15)) hit = id;
            });
            return hit;
        };
        f.actualizar = function (time, foco) {
            f.orden.forEach(function (id) {
                var o = f.organos[id];
                if (foco) o.mirar(foco.x, foco.y);
                o.actualizar(time);
            });
        };
        ids.forEach(function (id) {
            f.organos[id] = global.PedniaOrganos.crear(scene, id === 'oido' ? 'oreja' : id, 0, 0, f.radio(), { id: id });
            f.organos[id].cont.setDepth(opts.depth || 20);
        });
        f.ubicar();
        return f;
    }

    /** Tambor con baquetas que golpean el parche. */
    function tambor(scene, x, y, tam) {
        var A = global.PedniaArte;
        var cont = scene.add.container(x, y).setDepth(15);
        var cuerpo = scene.add.image(0, 0, A.textura(scene, 'tambor', 256)).setDisplaySize(tam, tam);
        // Baquetas apoyadas en el parche: el mango arriba y afuera (gira desde la mano), la bola sobre el parche.
        var b1 = scene.add.image(-tam * 0.355, -tam * 0.53, A.textura(scene, 'baqueta', 128)).setDisplaySize(tam * 0.55, tam * 0.55).setOrigin(0.5, 0.95).setAngle(150);
        var b2 = scene.add.image(tam * 0.355, -tam * 0.53, A.textura(scene, 'baqueta', 128)).setDisplaySize(tam * 0.55, tam * 0.55).setOrigin(0.5, 0.95).setAngle(-150);
        cont.add([cuerpo, b1, b2]);
        return {
            cont: cont,
            tam: tam,
            sonar: function () {
                var S = global.EncuentraSonidoSfx;
                if (S) S.reproducir('tambor', { breve: false, vol: 0.9 });
                [b1, b2].forEach(function (b, i) {
                    scene.tweens.add({ targets: b, angle: (i ? -150 : 150) + (i ? 14 : -14), duration: 110, yoyo: true, repeat: 2, delay: i * 140, ease: 'Quad.easeOut' });
                });
                scene.tweens.add({ targets: cuerpo, scaleY: cuerpo.scaleY * 0.94, duration: 90, yoyo: true, repeat: 3, delay: 80 });
                notas(scene, cont.x, cont.y - tam * 0.3, 3);
            }
        };
    }

    /**
     * Demostración común de los juegos de 3-4 años (config.demo: tambor → oído): el tambor
     * aparece en (x, y), la mano lo toca, lo arrastra hasta la burbuja del oído y la oreja escucha.
     */
    async function demoTambor(scene, fila, x, y, tam) {
        var ctx = scene.ctx;
        var t = ctx.textos || {};
        var d = tambor(scene, x, y, tam);
        d.cont.alpha = 0;
        d.cont.y -= 40;
        scene.tweens.add({ targets: d.cont, alpha: 1, y: y, duration: 600, ease: 'Back.easeOut' });
        var limpiar = function () {
            scene.tweens.add({ targets: d.cont, alpha: 0, duration: 350, onComplete: function () { d.cont.destroy(); } });
            ctx.quitarMano();
        };
        await ctx.decir({ voz: 'zoe', texto: t.demostracion || '¡Mira cómo se juega!' }, { minMs: 2200 });
        if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
        await ctx.mano({ punto: { x: d.cont.x, y: d.cont.y }, holdMs: 600, onPresionar: function () { d.sonar(); } });
        await esperar(scene, 400);
        if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
        var ear = fila.organos.oido;
        var dx = ear.cont.x - d.cont.x;
        var dy = ear.cont.y - d.cont.y;
        await ctx.mano({
            punto: { x: d.cont.x, y: d.cont.y }, holdMs: 300,
            arrastre: { dx: dx, dy: dy, durMs: 900, soltarEnDestino: true },
            onDuranteArrastre: function () {
                scene.tweens.add({ targets: d.cont, x: d.cont.x + dx, y: d.cont.y + dy - ear.radio * 0.6, scale: 0.7, duration: 900, ease: 'Sine.easeInOut' });
            }
        });
        if (!ctx.vivo()) return limpiar();
        d.sonar();
        notas(scene, d.cont.x, d.cont.y, 4, { x: ear.cont.x, y: ear.cont.y });
        await ear.reaccion('acierto');
        await ctx.decir({ voz: 'zoe', texto: t.demostracionAcierto || '¡Así se hace!' }, { estado: 'acierto', minMs: 1600 });
        await ctx.decir({ voz: 'zoe', texto: t.demostracionFin || '¡Ahora te toca a ti!' }, { minMs: 1200 });
        limpiar();
        await esperar(scene, 400);
    }

    /**
     * Arrastre simple de un contenedor: devuelve un controlador para pointerdown/move/up.
     *   arr.empezar(cont, p) → true si lo tomó; arr.mover(p); arr.soltar(p) → {cont, movido}
     */
    function arrastrador(scene) {
        var a = { cont: null };
        a.empezar = function (cont, p) {
            a.cont = cont;
            a.dx = p.x - cont.x;
            a.dy = p.y - cont.y;
            a.x0 = p.x;
            a.y0 = p.y;
            a.ultX = cont.x;
            a.casa = { x: cont.x, y: cont.y };
            scene.tweens.killTweensOf(cont);
            return true;
        };
        a.mover = function (p) {
            if (!a.cont) return;
            var nx = p.x - a.dx;
            var ny = p.y - a.dy;
            a.cont.x += (nx - a.cont.x) * 0.6;
            a.cont.y += (ny - a.cont.y) * 0.6;
            // Se inclina según la velocidad (se siente que pesa).
            var v = a.cont.x - a.ultX;
            a.ultX = a.cont.x;
            a.cont.angle += (Math.max(-18, Math.min(18, v * 1.5)) - a.cont.angle) * 0.3;
        };
        a.soltar = function (p) {
            var c = a.cont;
            a.cont = null;
            if (!c) return null;
            return { cont: c, movido: Math.abs(p.x - a.x0) + Math.abs(p.y - a.y0) > 18, casa: a.casa };
        };
        a.devolver = function (c, casa) {
            scene.tweens.add({ targets: c, x: casa.x, y: casa.y, angle: 0, duration: 520, ease: 'Back.easeOut' });
        };
        return a;
    }

    function inyectarEstilo(id, fondo, extra) {
        var doc = global.document;
        if (doc.getElementById(id + '-css')) return;
        var css = doc.createElement('style');
        css.id = id + '-css';
        var b = 'body.modo-' + id;
        css.textContent = [
            '#' + id + '-canvas{position:fixed;inset:0;z-index:0;touch-action:none}',
            '#' + id + '-canvas canvas{display:block;width:100% !important;height:100% !important}',
            b + '{background:' + fondo + ' !important}',
            b + ' #principal{position:relative;z-index:1;pointer-events:none;background:transparent}',
            b + ' #principal button,' + b + ' .dialogo{pointer-events:auto}',
            b + ' .escenario{display:block}',
            b + ' .centro,' + b + ' #progreso,' + b + ' #area-organos,' + b + ' #zona-estimulo{display:none !important}',
            b + ' .pj{position:fixed;bottom:0;z-index:2;pointer-events:none;--pj-alto:min(18vh,150px)}',
            b + ' .pj-zoe{left:6px}',
            b + ' .pj-zeus{right:6px}',
            b + ' .cabecera{padding-top:8px}',
            b + ' #tablero-sensorial{display:none !important}',
            // Sin velo oscuro durante la demostración: el escenario se ve como en el juego.
            b + '.demo-activa::before{display:none !important}'
        ].join('') + (extra || '');
        doc.head.appendChild(css);
    }

    /**
     * def: { id, fondo, css, escena: { create, update, demo, jugar, fiestaFinal, ... } }
     */
    function crearMotor(def) {
        var Phaser = global.Phaser;
        var game = null;
        var sceneRef = null;
        var readyResolve = null;
        var readyPromise = null;

        function montar(opts) {
            opts = opts || {};
            Phaser = global.Phaser;
            var Host = global.PedniaPhaserHost;
            if (!Phaser) return Promise.reject(new Error('Phaser no cargado'));
            if (!Host) return Promise.reject(new Error('PedniaPhaserHost no cargado'));
            if (!global.PedniaArte) return Promise.reject(new Error('PedniaArte no cargado'));
            readyPromise = new Promise(function (r) { readyResolve = r; });
            inyectarEstilo(def.id, def.fondo || '#a5d8ff', def.css);
            var doc = global.document;
            var el = doc.getElementById(def.id + '-canvas');
            if (!el) {
                el = doc.createElement('div');
                el.id = def.id + '-canvas';
                doc.body.insertBefore(el, doc.body.firstChild);
            }
            doc.body.classList.add('modo-' + def.id);
            var proto = {
                init: function () {
                    sceneRef = this;
                    this.ctx = opts.ctx || {};
                    this.config = opts.gameConfig || {};
                    this.nivel = opts.nivel || {};
                    this.reto = (this.nivel.retos || [])[0] || {};
                    this.cinco = String(this.nivel.id) === '5';
                }
            };
            Object.keys(def.escena).forEach(function (k) {
                if (k === 'create') {
                    proto.create = function () {
                        def.escena.create.apply(this, arguments);
                        if (readyResolve) readyResolve(this);
                    };
                } else if (k === 'update') {
                    // Un error en un cuadro no debe congelar el juego entero: se registra y se sigue.
                    proto.update = function () {
                        try { def.escena.update.apply(this, arguments); } catch (e) {
                            if (!this._errorAvisado) { this._errorAvisado = true; console.error('[EncuentraLaPareja] update:', e); }
                        }
                    };
                } else {
                    proto[k] = def.escena[k];
                }
            });
            proto.Extends = Phaser.Scene;
            proto.initialize = function Escena() { Phaser.Scene.call(this, { key: def.id }); };
            var Escena = new Phaser.Class(proto);
            Host.destruirIntro();
            game = Host.crear({
                type: Phaser.AUTO,
                parent: el,
                width: global.innerWidth || 1024,
                height: global.innerHeight || 640,
                backgroundColor: def.fondo || '#a5d8ff',
                audio: { noAudio: true },
                scene: [Escena],
                scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }
            });
            if (!game) {
                doc.body.classList.remove('modo-' + def.id);
                return Promise.reject(new Error('No se pudo crear Phaser.Game'));
            }
            return readyPromise;
        }

        function llamar(nombre) {
            return function () {
                if (!sceneRef || typeof sceneRef[nombre] !== 'function') return Promise.resolve();
                return Promise.resolve(sceneRef[nombre].apply(sceneRef, arguments));
            };
        }

        /**
         * Frases fijas que dice el juego ({ voz: 'zoe', texto: '…' } escritas en el código): se encolan al
         * montar para que la voz ya esté lista cuando haga falta (las del config.json ya se encolaban).
         */
        function frases() {
            var fuentes = Object.keys(def.escena).map(function (k) { return typeof def.escena[k] === 'function' ? String(def.escena[k]) : ''; });
            if (global.PedniaLab) Object.keys(global.PedniaLab).forEach(function (k) { if (typeof global.PedniaLab[k] === 'function') fuentes.push(String(global.PedniaLab[k])); });
            fuentes.push(String(demoTambor));
            var vistas = {};
            var out = [];
            var re = /voz:\s*'(zoe|zeus)',\s*texto:\s*'([^'\\]+)'/g;
            fuentes.forEach(function (src) {
                var m;
                while ((m = re.exec(src))) {
                    if (vistas[m[2]]) continue;
                    vistas[m[2]] = true;
                    out.push({ texto: m[2], personaje: m[1] });
                }
            });
            return out;
        }

        var api = {
            montar: montar,
            frases: frases,
            listo: function () { return !!(game && sceneRef); },
            demo: llamar('demo'),
            jugar: llamar('jugar'),
            fiestaFinal: llamar('fiestaFinal'),
            estado: function () { return sceneRef && sceneRef.estado ? sceneRef.estado() : null; },
            escena: function () { return sceneRef; },
            detener: function () { if (sceneRef) sceneRef.detenido = true; },
            destruir: function () {
                sceneRef = null;
                game = null;
                global.document.body.classList.remove('modo-' + def.id);
                if (global.PedniaPhaserHost) global.PedniaPhaserHost.destruirJuego();
            }
        };
        global.PedniaJuego = api;
        return api;
    }

    global.PedniaParejaBase = {
        crearMotor: crearMotor,
        util: {
            reducido: reducido, esperar: esperar, tween: tween, mezclar: mezclar, rnd: rnd,
            estallido: estallido, confeti: confeti, crearPista: crearPista,
            volarA: volarA, notas: notas, aroma: aroma, cielo: cielo, sfx: sfx
        },
        filaOrganos: filaOrganos,
        tambor: tambor,
        demoTambor: demoTambor,
        arrastrador: arrastrador
    };
})(typeof window !== 'undefined' ? window : this);
