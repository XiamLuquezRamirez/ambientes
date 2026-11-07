/**
 * PedniaEstudio — "El estudio de sonido" (Conectando la campana — Audición, 5-6 años).
 *
 * Un estudio de grabación con paneles acústicos y consola. Abajo, las 5 estaciones de los sentidos.
 *   1. La campana     (reto del documento): la campana de bronce vibra en la cabina; se arrastra el cable de
 *                     fibra óptica hasta la estación correcta. Verificación del documento: aparece un
 *                     ecualizador y hay que afinar la nota (tocar la barra que suena igual que la campana).
 *   2. La centralita  cinco pantallas (tambor, flor, helado, sol, osito): cada una se conecta con un cable
 *                     al sentido que la percibe. Si se equivoca, chispazo y Zeus explica.
 *   3. Escucha sin mirar  la cortina de la cabina se cierra y suena algo escondido: se toca la tarjeta
 *                     del instrumento que suena; la cortina se abre y lo muestra.
 *   Cierre del documento: el Tablero de Control Humano y el título de Ingeniero.
 */
(function (global) {
    'use strict';

    var B = global.PedniaParejaBase;
    var U = B.util;
    var L = function () { return global.PedniaLab; };
    var A = function () { return global.PedniaArte; };
    var Sfx = function () { return global.EncuentraSonidoSfx; };

    var SENTIDO = { tambor: 'oido', flor: 'nariz', helado: 'lengua', sol: 'ojo', osito: 'mano' };
    var POR_QUE = {
        tambor: 'El tambor produce SONIDO: lo escuchamos con el oído.',
        flor: 'La flor suelta aroma: lo percibimos con la nariz.',
        helado: 'El helado tiene sabor: lo saboreamos con la lengua.',
        sol: 'El sol da luz: la captamos con los ojos.',
        osito: 'El osito es suave: lo sentimos al tocarlo con la mano.'
    };

    var ctxAudio = null;
    /** Tono de campanita (parciales de campana) para el ecualizador. */
    function campanita(f, vol) {
        var C = global.AudioContext || global.webkitAudioContext;
        if (!C) return;
        if (!ctxAudio) ctxAudio = new C();
        if (ctxAudio.state === 'suspended') ctxAudio.resume();
        var t = ctxAudio.currentTime + 0.02;
        [[1, 0.28], [2.01, 0.12], [2.76, 0.07], [4.07, 0.03]].forEach(function (p) {
            var o = ctxAudio.createOscillator();
            var g = ctxAudio.createGain();
            o.frequency.value = f * p[0];
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(p[1] * (vol || 1), t + 0.005);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
            o.connect(g).connect(ctxAudio.destination);
            o.start(t);
            o.stop(t + 1.5);
        });
    }

    var escena = {
        create: function () {
            this.modo = '';
            this.cablesLab = [];
            var ops = (this.reto && this.reto.opciones) || ['oido', 'ojo', 'nariz', 'lengua', 'mano'];
            this.dibujarFondo();
            this.est = L().estaciones(this, ops, { depth: 20 });
            this.organos = this.est.organos;
            this.ondas = this.add.graphics().setDepth(14);
            var scene = this;
            this.scale.on('resize', function () { scene.dibujarFondo(); scene.est.ubicar(); });
        },

        m: function () {
            var w = this.scale.width;
            var h = this.scale.height;
            return {
                w: w, h: h, cx: w * 0.5,
                mesa: h * 0.5,
                // La cabina queda entre el globo de diálogo (~105 px) y la consola.
                cabina: (function () {
                    var ch = Math.min(h * 0.34, h * 0.5 - 115);
                    return { x: w * 0.5, y: 105 + ch / 2, w: Math.min(w * 0.3, 330), h: ch };
                })(),
                obj: Phaser.Math.Clamp(Math.min(w, h) * 0.2, 90, 160)
            };
        },

        /* ── Escenario: estudio de grabación ───────────────────── */

        dibujarFondo: function () {
            var m = this.m();
            var w = m.w;
            var h = m.h;
            U.cielo(this, 'es:pared', [[0, '#1b2440'], [1, '#2c3a63']]);
            if (!this.pared) this.pared = this.add.image(0, 0, 'es:pared').setOrigin(0).setDepth(-30);
            this.pared.setDisplaySize(w, h);
            var g = this.fondoG || (this.fondoG = this.add.graphics().setDepth(-28));
            g.clear();
            // Paneles acústicos de espuma (pirámides).
            var t = 34;
            for (var y = 10; y < m.mesa - 30; y += t) {
                for (var x = 0; x < w; x += t) {
                    var par = ((x / t) + (y / t)) % 2;
                    g.fillStyle(par ? 0x37446e : 0x2f3b60, 1);
                    g.fillTriangle(x, y, x + t, y, x + t / 2, y + t / 2);
                    g.fillStyle(par ? 0x2a3557 : 0x324068, 1);
                    g.fillTriangle(x, y + t, x + t, y + t, x + t / 2, y + t / 2);
                    g.fillStyle(0x253052, 1);
                    g.fillTriangle(x, y, x, y + t, x + t / 2, y + t / 2);
                    g.fillStyle(0x3d4a76, 1);
                    g.fillTriangle(x + t, y, x + t, y + t, x + t / 2, y + t / 2);
                }
            }
            // Consola de mezclas.
            g.fillStyle(0x111827, 1);
            g.fillRect(0, m.mesa - 30, w, h - m.mesa + 30);
            g.fillStyle(0x3a4256, 1);
            g.fillRoundedRect(w * 0.04, m.mesa - 24, w * 0.92, h * 0.16, 12);
            g.fillStyle(0x4b5570, 1);
            g.fillRoundedRect(w * 0.04, m.mesa - 24, w * 0.92, 10, 6);
            this.faders = [];
            for (var i = 0; i < 16; i++) {
                var fx = w * 0.08 + i * (w * 0.84 / 15);
                if (Math.abs(fx - m.cx) < m.cabina.w * 0.55) continue;
                g.fillStyle(0x1f2433, 1);
                g.fillRect(fx - 3, m.mesa - 4, 6, h * 0.1);
                this.faders.push({ x: fx, y0: m.mesa - 4, alto: h * 0.1, fase: Math.random() * 6 });
            }
            if (!this.fadersG) this.fadersG = this.add.graphics().setDepth(-26);
            // Cartel "EN EL AIRE".
            if (!this.aire) {
                this.aire = this.add.container(0, 0).setDepth(-25);
                var caja = this.add.rectangle(0, 0, 150, 34, 0x5c0a0a).setStrokeStyle(3, 0x212529);
                var txt = this.add.text(0, 0, 'EN EL AIRE', { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '16px', color: '#ffc9c9' }).setOrigin(0.5);
                this.aire.add([caja, txt]);
                this.aire.caja = caja;
            }
            this.aire.setPosition(w * 0.85, h * 0.17);
            this.dibujarCabina();
        },

        dibujarCabina: function () {
            var c = this.m().cabina;
            var g = this.cabinaG || (this.cabinaG = this.add.graphics().setDepth(-20));
            g.clear();
            g.fillStyle(0x000000, 0.3);
            g.fillRoundedRect(c.x - c.w / 2 - 6, c.y - c.h / 2 + 6, c.w + 12, c.h + 12, 18);
            g.fillStyle(0x868e96, 1);
            g.fillRoundedRect(c.x - c.w / 2 - 8, c.y - c.h / 2 - 8, c.w + 16, c.h + 16, 18);
            g.fillStyle(0x0b1a2a, 1);
            g.fillRoundedRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h, 14);
            g.fillStyle(0x74c0fc, 0.08);
            g.fillRoundedRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h, 14);
            g.fillStyle(0xffffff, 0.12);
            g.fillTriangle(c.x - c.w / 2 + 10, c.y - c.h / 2 + 10, c.x - c.w / 2 + 60, c.y - c.h / 2 + 10, c.x - c.w / 2 + 10, c.y + c.h * 0.1);
            // Soporte de la campana.
            g.fillStyle(0xadb5bd, 1);
            g.fillRect(c.x - c.w * 0.3, c.y - c.h / 2 + 14, c.w * 0.6, 8);
            g.fillRect(c.x - 3, c.y - c.h / 2 + 14, 6, c.h * 0.12);
            // Toma del cable (abajo al centro).
            g.fillStyle(0x212529, 1);
            g.fillRoundedRect(c.x - 26, c.y + c.h / 2 - 4, 52, 26, 8);
            g.fillStyle(0x66d9e8, 1);
            g.fillCircle(c.x, c.y + c.h / 2 + 9, 6);
            this.toma = { x: c.x, y: c.y + c.h / 2 + 9 };
        },

        /* ── Campana de la cabina ──────────────────────────────── */

        crearCampana: function () {
            var m = this.m();
            var c = m.cabina;
            var tam = Math.min(c.h * 0.62, m.obj);
            var piv = this.add.container(c.x, c.y - c.h / 2 + 14 + c.h * 0.12).setDepth(12);
            var cuerpo = this.add.container(0, tam * 0.5);
            var badajo = this.add.image(0, tam * 0.05, A().textura(this, 'badajo', 128)).setOrigin(0.5, 0).setDisplaySize(tam * 0.32, tam * 0.32);
            var img = this.add.image(0, 0, A().textura(this, 'campana', 256)).setDisplaySize(tam, tam).setTint(0xf0c890);
            cuerpo.add([badajo, img]);
            piv.add(cuerpo);
            piv.badajo = badajo;
            piv.tam = tam;
            piv.fase = 0;
            this.campana = piv;
            return piv;
        },

        tanerCampana: function (fuerte) {
            if (!this.campana) return;
            this.campana.golpe = this.time.now;
            if (Sfx()) Sfx().acompanar('campana', { breve: !fuerte, vol: fuerte ? 0.9 : 0.6 });
            this.ondaDesde(this.campana.x, this.campana.y + this.campana.tam * 0.5, 0xffd43b);
        },

        /** Ondas de sonido que se expanden (se dibujan en update). */
        ondaDesde: function (x, y, color) {
            this.anillos = this.anillos || [];
            for (var i = 0; i < 3; i++) this.anillos.push({ x: x, y: y, color: color, t0: this.time.now + i * 220 });
        },

        /* ── Ronda 1: la campana del documento ─────────────────── */

        rondaCampana: async function () {
            var scene = this;
            this.modo = 'campana';
            this.crearCampana();
            this.tanerCampana(true);
            this.repique = this.time.addEvent({ delay: 2600, loop: true, callback: function () { scene.tanerCampana(false); } });
            await this.ctx.decir(this.reto.presentacion || { voz: 'zoe', texto: 'Conecta la campana con el sentido que nos permite escucharla.' });
            var r = this.reto;
            var cb = await L().conectar(this, this.est, {
                desde: function () { return scene.toma; },
                correcto: 'oido',
                alError: function (id) {
                    var linea = null;
                    (r.errores || []).forEach(function (e) { if (!linea && (e.objetos || []).indexOf(id) >= 0) linea = e; });
                    return scene.ctx.decir(linea || r.errorOtro || { voz: 'zeus', texto: 'Su función principal es producir SONIDO. ¿Con qué escuchamos el sonido?' });
                }
            });
            this.repique.remove();
            this.ctx.quitarMano();
            // La señal sonora viaja por el cable hasta el oído.
            this.tanerCampana(true);
            for (var i = 0; i < 4; i++) this.time.delayedCall(i * 160, function () { scene.chispaPorCable(cb, 0xffd43b); });
            await U.esperar(this, 700);
            await this.organos.oido.reaccion('acierto');
            await this.ecualizador();
            await this.ctx.decir(r.acierto || { voz: 'zoe', texto: '¡Muy bien!' }, { estado: 'acierto' });
            this.tweens.add({ targets: this.campana, alpha: 0, duration: 400 });
            await U.esperar(this, 400);
        },

        chispaPorCable: function (cb, color) {
            var scene = this;
            var p = { t: 0 };
            var c = this.add.circle(0, 0, 7, color).setDepth(30).setBlendMode(Phaser.BlendModes.ADD);
            this.tweens.add({
                targets: p, t: 1, duration: 650, ease: 'Sine.easeIn',
                onUpdate: function () { var q = cb.punto(p.t); c.setPosition(q.x, q.y); },
                onComplete: function () { c.destroy(); var fin = cb.punto(1); U.estallido(scene, fin.x, fin.y, { n: 5, dist: 30, tam: 12, colores: [color] }); }
            });
        },

        /** Verificación del documento: afinar la nota en un ecualizador. */
        ecualizador: async function () {
            var scene = this;
            var m = this.m();
            var c = m.cabina;
            var notas = [{ n: 'Grave', f: 262 }, { n: 'Media', f: 523 }, { n: 'Aguda', f: 1046 }];
            var correcta = Math.floor(Math.random() * 3);
            // El ecualizador aparece a la derecha de la cabina: la campana se sigue viendo.
            var pw = Math.min(m.w * 0.32, 340);
            var ph = Math.min(c.h * 0.95, 260);
            var panel = this.add.container(Math.min(m.w - pw / 2 - 16, c.x + c.w / 2 + pw / 2 + 24), c.y + 10).setDepth(40);
            // El cartel "EN EL AIRE" se aparta mientras está el ecualizador.
            if (this.aire) this.tweens.add({ targets: this.aire, alpha: 0, duration: 250 });
            var fondo = this.add.graphics();
            fondo.fillStyle(0x0b1a2a, 0.96);
            fondo.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, 16);
            fondo.lineStyle(3, 0x66d9e8, 1);
            fondo.strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, 16);
            panel.add(fondo);
            var tit = this.add.text(0, -ph / 2 + 22, 'Afina la nota', { fontFamily: 'Fredoka, Arial', fontStyle: 'bold', fontSize: '20px', color: '#66d9e8' }).setOrigin(0.5);
            panel.add(tit);
            var barras = notas.map(function (nt, i) {
                var x = (i - 1) * pw * 0.28;
                var alto = ph * (0.28 + i * 0.14);
                var g = scene.add.graphics();
                var b = { i: i, x: x, alto: alto, g: g, nota: nt, nivel: 0.4 };
                var t = scene.add.text(x, ph / 2 - 20, nt.n, { fontFamily: 'Fredoka, Arial', fontStyle: 'bold', fontSize: '16px', color: '#f8f9fa' }).setOrigin(0.5);
                panel.add([g, t]);
                return b;
            });
            panel.setScale(0.3);
            panel.alpha = 0;
            await U.tween(this, { targets: panel, scale: 1, alpha: 1, duration: 450, ease: 'Back.easeOut' });
            var dibujar = function () {
                barras.forEach(function (b) {
                    var g = b.g;
                    g.clear();
                    var n = 8;
                    var on = Math.round(n * b.nivel);
                    for (var k = 0; k < n; k++) {
                        var col = k < n * 0.5 ? 0x51cf66 : (k < n * 0.8 ? 0xfcc419 : 0xff6b6b);
                        g.fillStyle(k < on ? col : 0x343a40, 1);
                        g.fillRoundedRect(b.x - pw * 0.09, ph * 0.28 - k * ph * 0.075, pw * 0.18, ph * 0.06, 3);
                    }
                });
            };
            var ev = this.time.addEvent({ delay: 30, loop: true, callback: function () { barras.forEach(function (b) { b.nivel += (0.15 - b.nivel) * 0.06; }); dibujar(); } });
            var sonar = function (b) {
                campanita(b.nota.f);
                b.nivel = 1;
            };
            await this.ctx.decir({ voz: 'zoe', texto: 'Escucha la nota de la campana y toca la barra que suena igual.' });
            var referencia = function () { campanita(notas[correcta].f); scene.tweens.add({ targets: scene.campana, angle: { from: -10, to: 10 }, duration: 120, yoyo: true, repeat: 2 }); };
            referencia();
            var rep = this.time.addEvent({ delay: 4500, loop: true, callback: referencia });
            await new Promise(function (resolver) {
                var pista = U.crearPista(scene, 9000, function (cancelado) {
                    var b = barras[correcta];
                    return scene.ctx.mano({ punto: { x: panel.x + b.x, y: panel.y }, holdMs: 400, cancelado: cancelado });
                });
                pista.reiniciar();
                var ocupado = false;
                var toque = function (p) {
                    if (ocupado) return;
                    var b = barras.find(function (bb) { return Math.abs(p.x - (panel.x + bb.x)) < pw * 0.13 && Math.abs(p.y - panel.y) < ph * 0.45; });
                    if (!b) return;
                    pista.reiniciar();
                    scene.ctx.quitarMano();
                    sonar(b);
                    if (b.i === correcta) {
                        scene.input.off('pointerdown', toque);
                        pista.parar();
                        rep.remove();
                        U.sfx('dingDingYay');
                        barras.forEach(function (bb) { bb.nivel = 1; });
                        resolver();
                        return;
                    }
                    ocupado = true;
                    scene.tweens.add({ targets: b.g, x: { from: -6, to: 6 }, duration: 60, yoyo: true, repeat: 3, onComplete: function () { b.g.x = 0; } });
                    scene.ctx.decir({ voz: 'zeus', texto: 'Esa nota es ' + b.nota.n.toLowerCase() + '. Escucha otra vez la campana.' });
                    scene.time.delayedCall(1500, function () { referencia(); ocupado = false; });
                };
                scene.input.on('pointerdown', toque);
            });
            // ¡Ding-dongg-ding! Las barras bailan un momento.
            var baile = this.time.addEvent({ delay: 120, loop: true, callback: function () { barras.forEach(function (b) { b.nivel = 0.4 + Math.random() * 0.6; }); } });
            await U.esperar(this, 1600);
            baile.remove();
            ev.remove();
            await U.tween(this, { targets: panel, scale: 0.3, alpha: 0, duration: 300 });
            panel.destroy();
            if (this.aire) this.tweens.add({ targets: this.aire, alpha: 1, duration: 250 });
        },

        /* ── Ronda 2: la centralita ────────────────────────────── */

        rondaCentralita: async function () {
            var scene = this;
            var m = this.m();
            this.modo = 'centralita';
            // Se quita el cable de la campana.
            this.cablesLab.forEach(function (c) { c.destruir(); });
            this.cablesLab = [];
            this.est.orden.forEach(function (id) { scene.est.encender(id, false); });
            this.tweens.add({ targets: [this.cabinaG, this.aire], alpha: 0, duration: 400 });
            var items = U.mezclar(['tambor', 'flor', 'helado', 'sol', 'osito']);
            var ancho = Math.min(m.w * 0.15, 150);
            this.pantallas = items.map(function (id, i) {
                var x = m.cx + (i - 2) * ancho * 1.08;
                var y = Math.max(m.h * 0.3, 110 + ancho * 0.55);
                var c = scene.add.container(x, y).setDepth(12);
                var g = scene.add.graphics();
                g.fillStyle(0x868e96, 1);
                g.fillRoundedRect(-ancho / 2, -ancho * 0.55, ancho, ancho * 1.1, 12);
                g.fillStyle(0x0b1a2a, 1);
                g.fillRoundedRect(-ancho / 2 + 6, -ancho * 0.55 + 6, ancho - 12, ancho * 0.84, 8);
                g.fillStyle(0x212529, 1);
                g.fillRoundedRect(-18, ancho * 0.36, 36, 18, 6);
                g.fillStyle(0x66d9e8, 1);
                g.fillCircle(0, ancho * 0.45, 5);
                var img = id === 'tambor' ? B.tambor(scene, 0, -ancho * 0.12, ancho * 0.66) : null;
                c.add(g);
                if (img) { img.cont.setDepth(13); c.add(img.cont); }
                else {
                    if (id === 'sol') {
                        c.add(scene.add.image(0, -ancho * 0.12, A().textura(scene, 'sol_rayos', 160)).setDisplaySize(ancho * 0.72, ancho * 0.72));
                    }
                    c.add(scene.add.image(0, -ancho * 0.12, A().textura(scene, id, 160)).setDisplaySize(ancho * 0.66, ancho * 0.66));
                }
                c.alpha = 0;
                c.y -= 30;
                scene.tweens.add({ targets: c, alpha: 1, y: y, duration: 400, delay: i * 100, ease: 'Back.easeOut' });
                return { id: id, cont: c, tambor: img, toma: { x: x, y: y + ancho * 0.45 }, ancho: ancho };
            });
            await U.esperar(this, 700);
            await this.ctx.decir({ voz: 'zeus', texto: '¡La centralita sensorial! Arrastra un cable desde cada pantalla hasta el sentido que la percibe.' });
            this.senal = this.time.addEvent({ delay: 2200, loop: true, callback: function () { scene.senales(); } });
            this.senales();
            // Se conectan en el orden que el niño quiera: cada pantalla es una toma.
            var pendientes = this.pantallas.slice();
            while (pendientes.length) {
                var hecho = await this.conectarCualquiera(pendientes);
                pendientes = pendientes.filter(function (p) { return p !== hecho; });
                var frases = ['¡Conectado!', '¡Muy bien!', '¡Otra conexión!', '¡Excelente!', '¡La centralita está completa!'];
                this.ctx.decir({ voz: 'zoe', texto: frases[5 - pendientes.length - 1] + ' ' + POR_QUE[hecho.id] }, { estado: 'acierto' });
                await U.esperar(this, 900);
            }
            this.senal.remove();
            await U.esperar(this, 1600);
        },

        senales: function () {
            var scene = this;
            (this.pantallas || []).forEach(function (p) {
                var x = p.cont.x;
                var y = p.cont.y - p.ancho * 0.12;
                if (p.id === 'tambor') { p.tambor.sonar(); }
                else if (p.id === 'flor') U.aroma(scene, x, y - p.ancho * 0.1, { n: 3, alto: 50, depth: 14 });
                else if (p.id === 'helado') {
                    var d = scene.add.image(x + p.ancho * 0.12, y, A().textura(scene, 'gota', 64)).setDisplaySize(10, 14).setDepth(14);
                    scene.tweens.add({ targets: d, y: y + p.ancho * 0.3, alpha: 0, duration: 800, onComplete: function () { d.destroy(); } });
                } else if (p.id === 'sol') {
                    scene.tweens.add({ targets: p.cont.list[1], angle: '+=40', duration: 1200 });
                } else if (p.id === 'osito') {
                    scene.tweens.add({ targets: p.cont.list[1], scaleX: p.cont.list[1].scaleX * 1.08, scaleY: p.cont.list[1].scaleY * 0.94, duration: 300, yoyo: true });
                }
            });
        },

        /** Espera a que el niño conecte bien una de las pantallas pendientes. */
        conectarCualquiera: function (pendientes) {
            var scene = this;
            var est = this.est;
            return new Promise(function (resolver) {
                var cb = L().cable(scene, {});
                var actual = null;
                var ocupado = false;
                var ev = scene.time.addEvent({ delay: 16, loop: true, callback: function () { if (cb.a) cb.dibujar(scene.time.now); } });
                var pista = U.crearPista(scene, 10000, function (cancelado) {
                    var p = pendientes[0];
                    var h = est.enchufe(SENTIDO[p.id]);
                    return scene.ctx.mano({ punto: p.toma, holdMs: 300, cancelado: cancelado, arrastre: { dx: h.x - p.toma.x, dy: h.y - p.toma.y, durMs: 1000 } });
                });
                pista.reiniciar();
                function abajo(pt) {
                    if (ocupado) return;
                    pista.reiniciar();
                    scene.ctx.quitarMano();
                    actual = pendientes.find(function (p) {
                        return Math.abs(pt.x - p.cont.x) < p.ancho * 0.55 && pt.y > p.cont.y - p.ancho * 0.6 && pt.y < p.toma.y + 26;
                    }) || null;
                    if (!actual) return;
                    cb.color = L().COLOR[SENTIDO[actual.id]];
                    cb.poner(actual.toma, { x: pt.x, y: pt.y });
                    U.sfx('pop');
                }
                function mover(pt) {
                    if (!actual) return;
                    cb.poner(actual.toma, { x: pt.x, y: pt.y });
                    var sobre = est.en(pt.x, pt.y);
                    est.orden.forEach(function (k) { est.organos[k].cont.setScale(k === sobre ? 1.12 : 1); });
                }
                function arriba(pt) {
                    if (!actual) return;
                    var p = actual;
                    actual = null;
                    est.orden.forEach(function (k) { est.organos[k].cont.setScale(1); });
                    var id = est.en(pt.x, pt.y);
                    if (!id) { cb.borrar(); return; }
                    var h = est.enchufe(id);
                    cb.poner(p.toma, h);
                    if (id === SENTIDO[p.id]) {
                        scene.input.off('pointerdown', abajo);
                        scene.input.off('pointermove', mover);
                        scene.input.off('pointerup', arriba);
                        pista.parar();
                        ev.remove();
                        cb.fijo = true;
                        scene.cablesLab.push(cb);
                        est.encender(id, true);
                        U.sfx('recompensa');
                        scene.organos[id].reaccion('acierto');
                        scene.tweens.add({ targets: p.cont, scale: 1.08, duration: 200, yoyo: true });
                        resolver(p);
                        return;
                    }
                    ocupado = true;
                    L().chispazo(scene, h.x, h.y);
                    est.parpadeo(id);
                    scene.organos[id].reaccion('error');
                    scene.ctx.decir({ voz: 'zeus', texto: '¡Chispas! ' + POR_QUE[p.id] });
                    scene.time.delayedCall(500, function () { cb.borrar(); ocupado = false; });
                }
                scene.input.on('pointerdown', abajo);
                scene.input.on('pointermove', mover);
                scene.input.on('pointerup', arriba);
            });
        },

        /* ── Ronda 3: escucha sin mirar ────────────────────────── */

        rondaEscucha: async function () {
            var scene = this;
            var m = this.m();
            this.modo = 'escucha';
            // Fuera la centralita; vuelve la cabina con cortina.
            (this.pantallas || []).forEach(function (p) { scene.tweens.add({ targets: p.cont, alpha: 0, duration: 400, onComplete: function () { p.cont.destroy(); } }); });
            this.cablesLab.forEach(function (c) { c.destruir(); });
            this.cablesLab = [];
            this.est.orden.forEach(function (id) { scene.est.encender(id, false); });
            this.tweens.add({ targets: [this.cabinaG, this.aire], alpha: 1, duration: 400 });
            var c = m.cabina;
            var cortina = this.add.graphics().setDepth(16);
            var abrir = { k: 0 };
            var pintarCortina = function () {
                cortina.clear();
                var mitad = (c.w / 2) * (1 - abrir.k);
                for (var lado = -1; lado <= 1; lado += 2) {
                    for (var i = 0; i < 6; i++) {
                        var ancho = mitad / 6;
                        var x0 = lado < 0 ? c.x - c.w / 2 + i * ancho : c.x + c.w / 2 - (i + 1) * ancho;
                        cortina.fillStyle(i % 2 ? 0x9c1f1f : 0xc92a2a, 1);
                        cortina.fillRect(x0, c.y - c.h / 2, ancho + 1, c.h);
                    }
                }
            };
            pintarCortina();
            var opciones = ['campana', 'tambor', 'maracas', 'pandereta'];
            var sonido = { campana: 'campana', tambor: 'tambor', maracas: 'maracas', pandereta: 'pandereta' };
            var tex = { campana: 'campana', tambor: 'tambor', maracas: 'maraca', pandereta: 'pandereta' };
            var orden = U.mezclar(opciones).slice(0, 3);
            await this.ctx.decir({ voz: 'zoe', texto: 'Ahora escucha sin mirar. ¿Qué instrumento suena detrás de la cortina?' });
            for (var r = 0; r < 3; r++) {
                var objetivo = orden[r];
                var cartas = U.mezclar([objetivo].concat(U.mezclar(opciones.filter(function (o) { return o !== objetivo; })).slice(0, 2)));
                // Las tarjetas caben entre la cabina y las estaciones.
                var bajoCabina = c.y + c.h / 2 + 34;
                var sobreEstaciones = this.est.enchufe('oido').y - 14;
                var tam = Math.max(56, Math.min(m.w * 0.14, 120, sobreEstaciones - bajoCabina));
                var cont = cartas.map(function (id, i) {
                    var x = m.cx + (i - 1) * tam * 1.35;
                    var y = (bajoCabina + sobreEstaciones) / 2;
                    var k = scene.add.container(x, y).setDepth(18);
                    var g = scene.add.graphics();
                    g.fillStyle(0xf8f9fa, 1);
                    g.fillRoundedRect(-tam / 2, -tam / 2, tam, tam, 14);
                    g.lineStyle(4, 0x66d9e8, 1);
                    g.strokeRoundedRect(-tam / 2, -tam / 2, tam, tam, 14);
                    k.add([g, scene.add.image(0, 0, A().textura(scene, tex[id], 160)).setDisplaySize(tam * 0.78, tam * 0.78)]);
                    k.id = id;
                    k.tam = tam;
                    k.alpha = 0;
                    scene.tweens.add({ targets: k, alpha: 1, duration: 300, delay: i * 100 });
                    return k;
                });
                // Detrás de la cortina está el instrumento.
                var oculto = this.add.image(c.x, c.y + c.h * 0.08, A().textura(this, tex[objetivo], 200)).setDisplaySize(c.h * 0.6, c.h * 0.6).setDepth(15);
                var tocar = function () {
                    if (Sfx()) Sfx().reproducir(sonido[objetivo], { breve: false, vol: 0.9 });
                    scene.ondaDesde(c.x, c.y, 0x66d9e8);
                    scene.organos.oido.reaccion('toca');
                    scene.tweens.add({ targets: cortina, x: { from: -3, to: 3 }, duration: 70, yoyo: true, repeat: 3, onComplete: function () { cortina.x = 0; } });
                };
                await U.esperar(this, 500);
                tocar();
                var rep = this.time.addEvent({ delay: 4200, loop: true, callback: tocar });
                await new Promise(function (resolver) {
                    var ocupado = false;
                    var pista = U.crearPista(scene, 9000, function (cancelado) {
                        var k = cont.find(function (kk) { return kk.id === objetivo; });
                        return scene.ctx.mano({ punto: { x: k.x, y: k.y }, holdMs: 400, cancelado: cancelado });
                    });
                    pista.reiniciar();
                    var toque = function (p) {
                        if (ocupado) return;
                        var k = cont.find(function (kk) { return Math.abs(p.x - kk.x) < kk.tam / 2 && Math.abs(p.y - kk.y) < kk.tam / 2; });
                        if (!k) return;
                        pista.reiniciar();
                        scene.ctx.quitarMano();
                        if (k.id === objetivo) {
                            scene.input.off('pointerdown', toque);
                            pista.parar();
                            resolver();
                            return;
                        }
                        ocupado = true;
                        scene.tweens.add({ targets: k, angle: { from: -8, to: 8 }, duration: 80, yoyo: true, repeat: 2, onComplete: function () { k.angle = 0; } });
                        if (Sfx()) Sfx().reproducir(sonido[k.id], { breve: true, vol: 0.8 });
                        scene.ctx.decir({ voz: 'zeus', texto: { campana: 'Así suena la campana', tambor: 'Así suena el tambor', maracas: 'Así suenan las maracas', pandereta: 'Así suena la pandereta' }[k.id] + '. Escucha otra vez lo que hay detrás de la cortina.' });
                        scene.time.delayedCall(1800, function () { tocar(); ocupado = false; });
                    };
                    scene.input.on('pointerdown', toque);
                });
                rep.remove();
                // Se abre la cortina y aparece el instrumento.
                U.sfx('magia');
                await U.tween(this, { targets: abrir, k: 1, duration: 700, ease: 'Sine.easeOut', onUpdate: pintarCortina });
                if (Sfx()) Sfx().reproducir(sonido[objetivo], { breve: true });
                U.estallido(this, c.x, c.y, { n: 14, dist: 120 });
                await this.organos.oido.reaccion('acierto');
                var frases = ['¡Sí! El oído lo reconoció sin mirar.', '¡Muy bien! Escuchamos con el oído.', '¡Qué oído tan fino!'];
                await this.ctx.decir({ voz: 'zoe', texto: frases[r] }, { estado: 'acierto' });
                cont.forEach(function (k) { k.destroy(); });
                oculto.destroy();
                abrir.k = 0;
                pintarCortina();
            }
            this.tweens.add({ targets: cortina, alpha: 0, duration: 400, onComplete: function () { cortina.destroy(); } });
        },

        /* ── API ───────────────────────────────────────────────── */

        demo: async function () {
            var c = this.m().cabina;
            this.modo = 'demo';
            await L().demoCable(this, this.est, c.x, c.y + c.h * 0.08, Math.min(c.h * 0.55, this.m().obj), this.toma);
            this.modo = '';
        },

        jugar: async function () {
            await this.rondaCampana();
            if (!this.ctx.vivo()) return;
            await this.rondaCentralita();
            if (!this.ctx.vivo()) return;
            await this.rondaEscucha();
        },

        fiestaFinal: async function () {
            await L().tablero(this, [
                { id: 'campana', organo: 'oido' }, { id: 'flor', organo: 'nariz' },
                { id: 'helado', organo: 'lengua' }, { id: 'sol', organo: 'ojo' }
            ]);
        },

        update: function (time) {
            var scene = this;
            var m = this.m();
            // Medidores y faders que bailan con el sonido.
            var g = this.fadersG;
            g.clear();
            var energia = this.campana && this.campana.golpe ? Math.max(0, 1 - (time - this.campana.golpe) / 1500) : 0;
            (this.faders || []).forEach(function (f, i) {
                var k = 0.3 + 0.25 * Math.sin(time / 700 + f.fase) + energia * 0.4 * Math.abs(Math.sin(time / 90 + i));
                g.fillStyle(0xdee2e6, 1);
                g.fillRoundedRect(f.x - 10, f.y0 + f.alto * (1 - k) - 6, 20, 12, 3);
                g.fillStyle(k > 0.75 ? 0xff6b6b : 0x51cf66, 1);
                g.fillCircle(f.x, f.y0 - 12, 3);
            });
            if (this.aire) this.aire.caja.fillColor = (this.modo && Math.sin(time / 400) > 0) ? 0xe03131 : 0x5c0a0a;
            // La campana vibra: péndulo amortiguado tras cada golpe.
            if (this.campana && !U.reducido()) {
                var t = this.campana.golpe ? (time - this.campana.golpe) / 1000 : 9;
                var amp = Math.exp(-t * 1.6) * 0.35 + 0.03;
                this.campana.rotation = Math.sin(time / 260) * amp;
                this.campana.badajo.rotation = -Math.sin(time / 260 - 0.6) * amp * 1.4;
            }
            this.ondas.clear();
            this.anillos = (this.anillos || []).filter(function (a) {
                var k = (time - a.t0) / 900;
                if (k < 0) return true;
                if (k >= 1) return false;
                scene.ondas.lineStyle(4 * (1 - k), a.color, 1 - k);
                scene.ondas.strokeCircle(a.x, a.y, 30 + k * 90);
                return true;
            });
            L().dibujarCables(this, time);
            var foco = this.campana && this.campana.alpha > 0.5 ? { x: this.campana.x, y: this.campana.y + 40 } : null;
            this.est.actualizar(time, foco);
            void scene;
            void m;
        },

        estado: function () {
            var scene = this;
            return {
                modo: this.modo,
                toma: this.toma,
                cables: this.cablesLab.length,
                pantallas: (this.pantallas || []).map(function (p) { return { id: p.id, toma: p.toma }; }),
                estaciones: this.est.orden.reduce(function (acc, id) { acc[id] = scene.est.enchufe(id); return acc; }, {})
            };
        }
    };

    global.PedniaEstudio = B.crearMotor({ id: 'estudio', fondo: '#1b2440', escena: escena });
})(typeof window !== 'undefined' ? window : this);
