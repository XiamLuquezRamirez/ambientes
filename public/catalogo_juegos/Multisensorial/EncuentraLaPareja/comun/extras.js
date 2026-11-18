/**
 * PedniaParejaExtras — estilo nuevo para los motores de Encuentra la pareja (opt-in con `extras: true` en crearMotor).
 *
 * Suma a una escena ya hecha (no cambia su mecánica):
 *   • marcador de 4 niveles con la estrella del diseño (se llena con scene.ganarNivel(i));
 *   • cartel de nivel (estrellas) entre rondas: scene.cartelNivel(n);
 *   • presentador 3D (Zoe en 3-4) que reacciona: saluda, celebra al acertar, dice «no» al equivocarse;
 *   • la estrella del diseño en todos los estallidos (textura 'pa:estrella@N').
 * Reutiliza AsociaPj3D (AsociaSonidoEImagen/comun/personajes3d.js, módulo) si está cargado.
 *
 * La escena llama:  await this.ganarNivel(i)   al terminar la ronda i (0-3).
 */
(function (global) {
    'use strict';

    var B = global.PedniaParejaBase;
    var Ut = B.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    // La estrella del diseño empieza a cargar al leer este archivo (mucho antes de montar la escena).
    var ESTRELLA = null;
    (function () {
        var d = global.document;
        var sc = d && (d.currentScript || Array.prototype.slice.call(d.getElementsByTagName('script')).filter(function (x) { return /comun\/extras\.js/.test(x.src); })[0]);
        if (!sc || !sc.src) return;
        var img = new global.Image();
        img.onload = function () { ESTRELLA = img; };
        img.src = sc.src.replace(/extras\.js.*$/, '../../AsociaSonidoEImagen/comun/estrella.svg');
    })();

    function estrellaDiseno(scene) {
        [64, 128, 256].forEach(function (t) {
            var clave = 'pa:estrella@' + t;
            if (scene.textures.exists(clave) || !ESTRELLA) return;
            var cv = scene.textures.createCanvas(clave, t, t);
            cv.getContext().drawImage(ESTRELLA, 0, 0, t, t);
            cv.refresh();
        });
    }

    function montar(scene, def) {
        var A = global.PedniaArte;
        var W = function () { return scene.scale.width; };
        var H = function () { return scene.scale.height; };
        var ex = scene.extras = { nivel: 0, estrellas: [], bar: null, pres: null, presTimer: null };
        var mayor = String(scene.nivel && scene.nivel.id) === '5';

        // Cuadro de diálogo más angosto para no chocar con el marcador de estrellas.
        var b = 'body.modo-' + def.id;
        var st = global.document.createElement('style');
        st.textContent = b + ' .dialogo{max-width:min(520px,calc(100vw - 440px)) !important}';
        global.document.head.appendChild(st);

        estrellaDiseno(scene);

        function tam() { return Math.max(28, Math.min(38, Math.round(H() * 0.05))); }

        ex.pintarHud = function () {
            ex.estrellas.forEach(function (e) { if (e && e.active) e.destroy(); });
            if (ex.bar && ex.bar.active) ex.bar.destroy();
            ex.estrellas = [];
            var t = tam();
            var ancho = 4 * t + 3 * 10;
            var x1 = W() - 184;                       // a la izquierda de los botones Reiniciar / Salir
            var x0 = x1 - ancho;
            ex.bar = scene.add.rectangle(x0 + ancho / 2, 14 + t / 2, ancho + 28, t + 18, 0x12263f, 0.6).setStrokeStyle(3, 0xffffff, 0.5).setDepth(79);
            for (var i = 0; i < 4; i++) {
                var e = scene.add.image(x0 + i * (t + 10) + t / 2, 14 + t / 2, A.textura(scene, 'estrella', 64)).setDisplaySize(t, t).setDepth(80);
                if (i >= ex.nivel) e.setTint(0x8a8f98).setAlpha(0.55);
                ex.estrellas.push(e);
            }
        };

        /* ── Presentador 3D ── */

        ex.ubicarPres = function () {
            if (!ex.pres || ex.pres.falso) return;
            var w = W(), h = H();
            if (w < 900) { ex.pres.visible(false); return; }
            var alto = Math.min(165, h * 0.28);
            ex.pres.visible(true);
            ex.pres.ubicar(w - 88, h - 70 - alto / 2);
        };

        ex.montarPres = function () {
            if (!global.AsociaPj3D || ex.pres) return;
            var alto = Math.min(165, H() * 0.28);
            ex.pres = global.AsociaPj3D.crear(mayor ? 'nino' : 'nina', { alto: alto, clip: 'Saludar', giro: 0.35 });
            ex.ubicarPres();
            ex.reaccion('Saludar', 2600);
        };

        ex.reaccion = function (clip, ms) {
            if (!ex.pres || ex.pres.falso) return;
            ex.pres.clip(clip);
            if (ex.presTimer) ex.presTimer.remove();
            ex.presTimer = scene.time.delayedCall(ms || 1800, function () { if (ex.pres) ex.pres.clip(ex.fin ? 'Bailar' : 'Quieto'); });
        };

        // La voz de Zeus/Zoe dispara la reacción del presentador: acierto celebra, «otra vez» dice no.
        var decirOriginal = scene.ctx.decir;
        scene.ctx = Object.assign({}, scene.ctx, {
            decir: function (linea, opts) {
                try {
                    if (opts && opts.estado === 'acierto') ex.reaccion('Celebrar', 2200);
                    else if (linea && /otra vez|Escucha u observa|Atenci/i.test(linea.texto || '')) ex.reaccion('Decir_no', 1500);
                } catch (e) { /* un adorno nunca rompe el juego */ }
                return decirOriginal(linea, opts);
            }
        });

        ex.ganarNivel = async function (i) {
            var e = ex.estrellas[i];
            ex.nivel = i + 1;
            if (e && e.active) {
                Ut.sfx('chispas');
                var v = scene.add.image(W() / 2, H() / 2, A.textura(scene, 'estrella', 128)).setDisplaySize(110, 110).setDepth(95);
                await tw(scene, { targets: v, x: e.x, y: e.y, displayWidth: e.displayWidth, displayHeight: e.displayHeight, duration: 650, ease: 'Cubic.easeIn' });
                v.destroy();
                e.clearTint().setAlpha(1);
                scene.tweens.add({ targets: e, scale: e.scale * 1.4, duration: 160, yoyo: true });
            }
            ex.reaccion('Celebrar', 2000);
            if (i < 3) await ex.cartel(i + 2);
        };

        ex.cartel = async function (n) {
            var c = scene.add.container(W() / 2, H() * 0.5).setDepth(95).setScale(0.3).setAlpha(0);
            var t = Math.min(90, W() / 7);
            for (var i = 0; i < n; i++) c.add(scene.add.image((i - (n - 1) / 2) * (t * 1.05), 0, A.textura(scene, 'estrella', 128)).setDisplaySize(t, t));
            Ut.sfx('magia');
            await tw(scene, { targets: c, scale: 1, alpha: 1, duration: 380, ease: 'Back.easeOut' });
            await esperar(scene, 700);
            await tw(scene, { targets: c, scale: 0.4, alpha: 0, duration: 260 });
            c.destroy();
        };

        // Insignia final (la del config) bajando girando, antes de la victoria compartida.
        ex.insignia = async function () {
            var ins = scene.nivel && scene.nivel.insignia && scene.nivel.insignia.img;
            if (!ins) return;
            await new Promise(function (ok) {
                if (scene.textures.exists('insignia_cfg')) { ok(); return; }
                scene.load.svg('insignia_cfg', ins, { width: 420, height: 420 });
                scene.load.once('complete', ok);
                scene.load.start();
            });
            if (!scene.textures.exists('insignia_cfg')) return;
            var tm = Math.min(W(), H()) * 0.42;
            var brillo = scene.add.circle(W() / 2, H() * 0.45, tm * 0.75, 0xfff3bf, 0).setDepth(96);
            var img = scene.add.image(W() / 2, -tm, 'insignia_cfg').setDisplaySize(tm, tm).setDepth(97);
            Ut.sfx('magia');
            await tw(scene, { targets: img, y: H() * 0.45, angle: 360, duration: 900, ease: 'Back.easeOut' });
            scene.tweens.add({ targets: brillo, fillAlpha: 0.55, scale: 1.2, duration: 500, yoyo: true, repeat: 1 });
            Ut.estallido(scene, W() / 2, H() * 0.45, { n: 20, tex: 'estrella', tam: 30, dist: tm, sinTinte: true, depth: 98 });
            await esperar(scene, 1600);
            img.destroy(); brillo.destroy();
        };

        // La fiesta final de la escena sigue igual; después baja la insignia y se apaga la capa 3D.
        var fiesta = scene.fiestaFinal;
        if (typeof fiesta === 'function') {
            scene.fiestaFinal = async function () {
                ex.fin = true;
                ex.reaccion('Celebrar', 60000);
                await fiesta.apply(scene, arguments);
                await ex.insignia();
                ex.reaccion('Bailar', 60000);
                await esperar(scene, 1200);
                if (global.AsociaPj3D && global.AsociaPj3D.capa) global.AsociaPj3D.capa(false);
            };
        }

        ex.pintarHud();
        ex.montarPres();
        scene.scale.on('resize', function () { ex.pintarHud(); ex.ubicarPres(); });
        scene.ganarNivel = ex.ganarNivel;
        scene.cartelNivel = ex.cartel;
    }

    global.PedniaParejaExtras = { montar: montar };
})(typeof window !== 'undefined' ? window : this);
