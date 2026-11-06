/**
 * PedniaLab — piezas comunes de "La máquina de conexiones sensoriales" (5-6 años).
 *
 *   PedniaLab.estaciones(scene, ids)   las 5 estaciones de los sentidos (oído, nariz, lengua, ojo, mano)
 *                                      con su enchufe, su luz y su nombre; misma API que filaOrganos
 *                                      (organos, orden, pos, en, actualizar) + enchufe(id), encender(id).
 *   PedniaLab.cable(scene)             cable de fibra óptica brillante (curva con pulsos de luz).
 *   PedniaLab.tablero(scene, lista)    cierre del documento: silueta del cuerpo, las conexiones se
 *                                      encienden a la vez y las señales viajan al cerebro.
 *   PedniaLab.titulo(scene, texto)     cartel "Ingeniero de Conexiones Sensoriales".
 *   PedniaLab.demoCable(scene, est, x, y, tam)   demostración (tambor → oído) arrastrando el cable.
 */
(function (global) {
    'use strict';

    var B = function () { return global.PedniaParejaBase; };
    var U = function () { return global.PedniaParejaBase.util; };
    var A = function () { return global.PedniaArte; };
    var NOMBRES = { oido: 'Oído', nariz: 'Nariz', lengua: 'Lengua', ojo: 'Ojo', mano: 'Mano' };
    var COLOR = { oido: 0xffd43b, nariz: 0xf783ac, lengua: 0xff8787, ojo: 0x4dabf7, mano: 0x69db7c };

    function estaciones(scene, ids, opts) {
        opts = opts || {};
        var f = { organos: {}, orden: ids.slice(), placas: {}, luces: {} };
        f.radio = function () {
            return Math.max(30, Math.min(58, Math.min(scene.scale.width, scene.scale.height) * 0.068, scene.scale.width * 0.06));
        };
        f.pos = function (i) {
            var w = scene.scale.width;
            var h = scene.scale.height;
            var r = f.radio();
            var paso = Math.min(w * 0.15, r * 2.65);
            // Sin taparse con los botones de accesibilidad y volumen (esquina inferior derecha).
            var medio = (f.orden.length - 1) / 2 * paso + r * 1.2;
            var cx = Math.min(w * 0.5, w - 150 - medio);
            return { x: cx + (i - (f.orden.length - 1) / 2) * paso, y: h - r * 1.75 };
        };
        f.enchufe = function (id) {
            var o = f.organos[id];
            return { x: o.base.x, y: o.base.y - f.radio() * 1.32 };
        };
        function dibujarPlaca(id) {
            var g = f.placas[id];
            var r = f.radio();
            var o = f.organos[id];
            g.clear();
            g.setPosition(o.base.x, o.base.y);
            // Placa metálica con bisel.
            g.fillStyle(0x000000, 0.25);
            g.fillRoundedRect(-r * 1.15, -r * 1.2 + 4, r * 2.3, r * 2.7, 16);
            g.fillStyle(0x495057, 1);
            g.fillRoundedRect(-r * 1.15, -r * 1.2, r * 2.3, r * 2.7, 16);
            g.fillStyle(0x868e96, 1);
            g.fillRoundedRect(-r * 1.1, -r * 1.16, r * 2.2, r * 2.6, 14);
            g.fillStyle(0x343a40, 1);
            g.fillRoundedRect(-r * 1.04, -r * 1.1, r * 2.08, r * 2.48, 12);
            // Ventana de cristal oscuro donde vive el órgano.
            g.fillStyle(0x0b1a2a, 1);
            g.fillCircle(0, 0, r * 0.95);
            g.lineStyle(3, 0xadb5bd, 1);
            g.strokeCircle(0, 0, r * 0.95);
            // Tornillos.
            g.fillStyle(0xced4da, 1);
            [[-0.9, -0.95], [0.9, -0.95], [-0.9, 1.25], [0.9, 1.25]].forEach(function (p) { g.fillCircle(p[0] * r, p[1] * r, 3); });
            // Enchufe arriba.
            g.fillStyle(0x212529, 1);
            g.fillRoundedRect(-r * 0.32, -r * 1.48, r * 0.64, r * 0.4, 6);
            g.fillStyle(0x000000, 1);
            g.fillCircle(0, -r * 1.3, r * 0.12);
        }
        f.ubicar = function () {
            var r = f.radio();
            f.orden.forEach(function (id, i) {
                var o = f.organos[id];
                var p = f.pos(i);
                o.base.x = p.x;
                o.base.y = p.y;
                o.cont.setPosition(p.x, p.y);
                dibujarPlaca(id);
                f.luces[id].setPosition(p.x, p.y - r * 1.3).setRadius(r * 0.2);
                f.textos[id].setPosition(p.x, p.y + r * 1.08).setFontSize(Math.round(r * 0.36));
            });
        };
        f.en = function (x, y) {
            var hit = null;
            var r = f.radio();
            f.orden.forEach(function (id) {
                var o = f.organos[id];
                if (!hit && Math.abs(x - o.base.x) < r * 1.2 && y > o.base.y - r * 1.6 && y < o.base.y + r * 1.5) hit = id;
            });
            return hit;
        };
        f.encender = function (id, si) {
            var l = f.luces[id];
            scene.tweens.killTweensOf(l);
            if (si) {
                l.fillColor = COLOR[id] || 0x69db7c;
                l.alpha = 1;
                scene.tweens.add({ targets: l, scale: { from: 1.4, to: 1 }, duration: 400, ease: 'Back.easeOut' });
            } else {
                l.fillColor = 0x495057;
                l.alpha = 1;
            }
        };
        f.parpadeo = function (id) {
            var l = f.luces[id];
            l.fillColor = 0xff6b6b;
            scene.tweens.add({ targets: l, alpha: { from: 1, to: 0.2 }, duration: 120, yoyo: true, repeat: 3, onComplete: function () { l.fillColor = 0x495057; l.alpha = 1; } });
        };
        f.actualizar = function (time, foco) {
            f.orden.forEach(function (id) {
                var o = f.organos[id];
                if (foco) o.mirar(foco.x, foco.y);
                o.actualizar(time);
            });
        };
        f.textos = {};
        ids.forEach(function (id) {
            f.placas[id] = scene.add.graphics().setDepth((opts.depth || 20) - 1);
            var o = global.PedniaOrganos.crear(scene, id === 'oido' ? 'oreja' : id, 0, 0, f.radio() * 0.82, { id: id, burbuja: false, flotar: false });
            o.cont.setDepth(opts.depth || 20);
            f.organos[id] = o;
            f.luces[id] = scene.add.circle(0, 0, 8, 0x495057).setDepth((opts.depth || 20) + 1).setStrokeStyle(2, 0x212529);
            f.textos[id] = scene.add.text(0, 0, NOMBRES[id] || id, {
                fontFamily: 'Fredoka, Nunito, Arial, sans-serif', fontStyle: 'bold', fontSize: '18px', color: '#f8f9fa'
            }).setOrigin(0.5).setDepth((opts.depth || 20) + 1);
        });
        f.ubicar();
        return f;
    }

    /** Cable de fibra óptica: se dibuja entre dos puntos con caída y pulsos de luz que viajan. */
    function cable(scene, opts) {
        opts = opts || {};
        var g = scene.add.graphics().setDepth(opts.depth || 25);
        var brillo = scene.add.graphics().setDepth((opts.depth || 25) + 1).setBlendMode(Phaser.BlendModes.ADD);
        var c = { g: g, brillo: brillo, a: null, b: null, color: opts.color || 0x66d9e8, fijo: false };
        function punto(t) {
            // Si el cable ya no está tendido, devuelve su último punto conocido (nunca rompe el juego).
            if (!c.a || !c.b) return c.ultimo || { x: 0, y: 0 };
            var a = c.a;
            var b = c.b;
            var caida = Math.min(120, Math.abs(b.x - a.x) * 0.25 + 40);
            var c1 = { x: a.x, y: a.y + caida };
            var c2 = { x: b.x, y: b.y - caida * 0.6 };
            var u = 1 - t;
            return {
                x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x,
                y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y
            };
        }
        c.punto = punto;
        c.poner = function (a, b) { c.a = a; c.b = b; if (b) c.ultimo = { x: b.x, y: b.y }; };
        c.dibujar = function (time) {
            g.clear();
            brillo.clear();
            if (!c.a || !c.b) return;
            var pts = [];
            for (var i = 0; i <= 24; i++) pts.push(punto(i / 24));
            g.lineStyle(10, 0x1b2a3a, 1);
            g.strokePoints(pts, false);
            g.lineStyle(5, c.color, 1);
            g.strokePoints(pts, false);
            brillo.lineStyle(14, c.color, 0.18);
            brillo.strokePoints(pts, false);
            // Pulsos de luz que viajan por la fibra.
            var n = c.fijo ? 3 : 2;
            for (var k = 0; k < n; k++) {
                var t = ((time / 900) + k / n) % 1;
                var p = punto(t);
                brillo.fillStyle(0xffffff, 0.9);
                brillo.fillCircle(p.x, p.y, 4);
                brillo.fillStyle(c.color, 0.5);
                brillo.fillCircle(p.x, p.y, 9);
            }
            // Clavija en la punta.
            g.fillStyle(0xadb5bd, 1);
            g.fillCircle(c.b.x, c.b.y, 7);
            g.fillStyle(c.color, 1);
            g.fillCircle(c.b.x, c.b.y, 3.5);
        };
        c.borrar = function () {
            c.a = c.b = null;
            g.clear();
            brillo.clear();
        };
        c.destruir = function () {
            g.destroy();
            brillo.destroy();
        };
        return c;
    }

    /** Cartel de título que aparece con rebote. */
    function titulo(scene, texto, opts) {
        opts = opts || {};
        var w = scene.scale.width;
        var h = scene.scale.height;
        var cont = scene.add.container(opts.x != null ? opts.x : w / 2, opts.y || h * 0.2).setDepth(90);
        var ancho = Math.min(opts.ancho || w * 0.7, 620);
        var t = scene.add.text(0, 0, texto, {
            fontFamily: 'Fredoka, Nunito, Arial, sans-serif', fontStyle: 'bold',
            fontSize: Math.round(Math.min(w * 0.032, 30)) + 'px', color: '#ffffff', align: 'center',
            wordWrap: { width: ancho - 60 }
        }).setOrigin(0.5);
        var pw = t.width + 60;
        var ph = t.height + 30;
        var g = scene.add.graphics();
        g.fillStyle(0x000000, 0.25);
        g.fillRoundedRect(-pw / 2, -ph / 2 + 6, pw, ph, 20);
        g.fillStyle(opts.color || 0x7048e8, 1);
        g.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, 20);
        g.lineStyle(4, 0xffd43b, 1);
        g.strokeRoundedRect(-pw / 2 + 6, -ph / 2 + 6, pw - 12, ph - 12, 16);
        cont.add([g, t]);
        cont.setScale(0.2);
        cont.alpha = 0;
        scene.tweens.add({ targets: cont, scale: 1, alpha: 1, duration: 600, ease: 'Back.easeOut' });
        return cont;
    }

    /**
     * Cierre del documento: "El Tablero de Control Humano". lista = [{ id: 'campana', organo: 'oido' }, ...]
     */
    async function tablero(scene, lista, opts) {
        opts = opts || {};
        var u = U();
        var w = scene.scale.width;
        var h = scene.scale.height;
        var cont = scene.add.container(0, 0).setDepth(85);
        // Velo casi opaco: el tablero no se mezcla con el escenario de detrás.
        var velo = scene.add.rectangle(0, 0, w, h, 0x0b1a2a, 0.96).setOrigin(0);
        cont.add(velo);
        velo.alpha = 0;
        scene.tweens.add({ targets: velo, alpha: 1, duration: 500 });
        var top = 112;
        var s = Math.max(2.4, Math.min((h - top - 80) / 96, w * 0.0058));
        var cx = w * 0.56;
        var g = scene.add.graphics();
        cont.add(g);
        g.lineStyle(1, 0x1c7ed6, 0.25);
        for (var gx = 0; gx < w; gx += 30) g.lineBetween(gx, 0, gx, h);
        for (var gy = 0; gy < h; gy += 30) g.lineBetween(0, gy, w, gy);
        // Silueta humana con cabeza grande (los sentidos de la cara quedan separados).
        var cabeza = { x: cx, y: top + 17 * s, r: 17 * s };
        var piezas = function (fill) {
            if (fill) g.fillStyle(0x4dabf7, 0.2);
            else g.lineStyle(3, 0x74c0fc, 0.9);
            var f = fill ? 'fill' : 'stroke';
            g[f + 'Circle'](cabeza.x, cabeza.y, cabeza.r);
            // Orejas a los lados.
            g[f + 'Ellipse'](cx - 17.5 * s, cabeza.y + 1 * s, 4 * s, 7 * s);
            g[f + 'Ellipse'](cx + 17.5 * s, cabeza.y + 1 * s, 4 * s, 7 * s);
            g[f + 'RoundedRect'](cx - 4 * s, top + 33 * s, 8 * s, 4 * s, 2 * s);
            g.beginPath();
            g.moveTo(cx - 15 * s, top + 37 * s);
            g.lineTo(cx + 15 * s, top + 37 * s);
            g.lineTo(cx + 12 * s, top + 64 * s);
            g.lineTo(cx - 12 * s, top + 64 * s);
            g.closePath();
            if (fill) g.fillPath(); else g.strokePath();
            [-1, 1].forEach(function (k) {
                g.beginPath();
                g.moveTo(cx + k * 15 * s, top + 37 * s);
                g.lineTo(cx + k * 22 * s, top + 59 * s);
                g.lineTo(cx + k * 17 * s, top + 60 * s);
                g.lineTo(cx + k * 12 * s, top + 42 * s);
                g.closePath();
                if (fill) g.fillPath(); else g.strokePath();
                g[f + 'Circle'](cx + k * 20 * s, top + 63 * s, 3.5 * s);
                g[f + 'RoundedRect'](cx + k * 6.5 * s - 4 * s, top + 64 * s, 8 * s, 24 * s, 3 * s);
                g[f + 'Ellipse'](cx + k * 7.5 * s, top + 89 * s, 11 * s, 4 * s);
            });
        };
        piezas(true);
        piezas(false);
        // Rasgos de la cara (tenues) para que se entienda dónde está cada sentido.
        g.lineStyle(2, 0x74c0fc, 0.6);
        g.strokeCircle(cx - 6 * s, cabeza.y + 1 * s, 2.6 * s);
        g.strokeCircle(cx + 6 * s, cabeza.y + 1 * s, 2.6 * s);
        g.beginPath();
        g.arc(cx, cabeza.y + 10 * s, 4 * s, 0.15 * Math.PI, 0.85 * Math.PI);
        g.strokePath();
        // Cerebro en lo alto de la cabeza.
        var cerebro = scene.add.ellipse(cabeza.x, cabeza.y - 9 * s, 18 * s, 9 * s, 0xf783ac, 0.35).setStrokeStyle(2, 0xfaa2c1);
        cont.add(cerebro);
        // Los cables llegan por la izquierda: los nodos van del lado izquierdo de la cara.
        var nodos = {
            oido: { x: cx - 17.5 * s, y: cabeza.y + 1 * s },
            ojo: { x: cx - 6 * s, y: cabeza.y + 1 * s },
            nariz: { x: cx, y: cabeza.y + 5.5 * s },
            lengua: { x: cx, y: cabeza.y + 11 * s },
            mano: { x: cx - 20 * s, y: top + 63 * s }
        };
        var luces = {};
        Object.keys(nodos).forEach(function (id) {
            var n = nodos[id];
            luces[id] = scene.add.circle(n.x, n.y, Math.max(5, 2 * s), 0x495057).setStrokeStyle(2, 0xadb5bd);
            cont.add(luces[id]);
        });
        // Estímulos a la izquierda y sus cables.
        var cables = [];
        lista.forEach(function (it, i) {
            var y = top + 20 + i * Math.min(95, (h - top - 130) / 3);
            var x = w * 0.14;
            var marco = scene.add.circle(x, y, 34, 0x1b2a3a).setStrokeStyle(3, COLOR[it.organo]);
            var img;
            if (it.id === 'sol') {
                img = scene.add.image(x, y, A().textura(scene, 'sol', 128)).setDisplaySize(60, 60);
            } else {
                img = scene.add.image(x, y, A().textura(scene, it.id, 128)).setDisplaySize(56, 56);
            }
            cont.add([marco, img]);
            var cb = cable(scene, { color: COLOR[it.organo], depth: 86 });
            cb.poner({ x: x + 34, y: y }, nodos[it.organo]);
            cb.fijo = true;
            cables.push({ cb: cb, it: it, desde: { x: x, y: y } });
        });
        var vivo = true;
        var ev = scene.time.addEvent({ delay: 16, loop: true, callback: function () { if (vivo) cables.forEach(function (c) { if (c.on) c.cb.dibujar(scene.time.now); }); } });
        if (scene.ctx && scene.ctx.decir) scene.ctx.decir({ voz: 'zoe', texto: '¡El Tablero de Control Humano! Mira cómo las señales viajan desde los sentidos hasta el cerebro.' });
        await u.esperar(scene, 500);
        // Se encienden las 4 conexiones al mismo tiempo.
        u.sfx('magia');
        cables.forEach(function (c) {
            c.on = true;
            luces[c.it.organo].fillColor = COLOR[c.it.organo];
            scene.tweens.add({ targets: luces[c.it.organo], scale: { from: 2, to: 1 }, duration: 500, ease: 'Back.easeOut' });
        });
        await u.esperar(scene, 900);
        // Las señales viajan desde cada sentido hasta el cerebro.
        for (var v = 0; v < 3; v++) {
            Object.keys(nodos).forEach(function (id) {
                if (!lista.some(function (it) { return it.organo === id; })) return;
                var n = nodos[id];
                var chispa = scene.add.circle(n.x, n.y, Math.max(4, 1.6 * s), COLOR[id]).setDepth(87);
                scene.tweens.add({ targets: chispa, x: cerebro.x, y: cerebro.y, duration: 600, ease: 'Sine.easeIn', onComplete: function () { chispa.destroy(); } });
            });
            await u.esperar(scene, 650);
            cerebro.fillColor = 0xf783ac;
            scene.tweens.add({ targets: cerebro, alpha: { from: 1, to: 0.6 }, scale: { from: 1.25, to: 1 }, duration: 400 });
            u.sfx('chispas');
        }
        cerebro.setFillStyle(0xf783ac, 0.9);
        u.estallido(scene, cerebro.x, cerebro.y, { n: 18, dist: 120, depth: 88 });
        var tt = titulo(scene, opts.titulo || '¡Ingeniero de Conexiones Sensoriales!', { y: h - 46, x: (w - 140) / 2, ancho: w - 190 });
        u.sfx('celebracion');
        u.confeti(scene, 90);
        await u.esperar(scene, 2600);
        vivo = false;
        ev.remove();
        void tt;
        return { cont: cont, cables: cables };
    }

    /** Demostración (config.demo: tambor → oído): la mano toca el tambor y arrastra el cable al oído. */
    async function demoCable(scene, est, x, y, tam, toma) {
        var ctx = scene.ctx;
        var t = ctx.textos || {};
        var u = U();
        var d = B().tambor(scene, x, y, tam);
        d.cont.alpha = 0;
        scene.tweens.add({ targets: d.cont, alpha: 1, duration: 500 });
        var cb = cable(scene, { color: COLOR.oido });
        var vivo = true;
        var ev = scene.time.addEvent({ delay: 16, loop: true, callback: function () { if (vivo) cb.dibujar(scene.time.now); } });
        var limpiar = function () {
            vivo = false;
            ev.remove();
            cb.destruir();
            scene.tweens.add({ targets: d.cont, alpha: 0, duration: 350, onComplete: function () { d.cont.destroy(); } });
            est.encender('oido', false);
            ctx.quitarMano();
        };
        await ctx.decir({ voz: 'zoe', texto: t.demostracion || '¡Mira cómo se juega!' }, { minMs: 2200 });
        if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
        await ctx.mano({ punto: { x: d.cont.x, y: d.cont.y }, holdMs: 600, onPresionar: function () { d.sonar(); } });
        await u.esperar(scene, 300);
        if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
        var desde = toma || { x: d.cont.x, y: d.cont.y + tam * 0.35 };
        var hasta = est.enchufe('oido');
        await ctx.mano({
            punto: desde, holdMs: 300,
            arrastre: { dx: hasta.x - desde.x, dy: hasta.y - desde.y, durMs: 1000, soltarEnDestino: true },
            onDuranteArrastre: function () {
                var p = { k: 0 };
                scene.tweens.add({
                    targets: p, k: 1, duration: 1000, ease: 'Sine.easeInOut',
                    onUpdate: function () { cb.poner(desde, { x: desde.x + (hasta.x - desde.x) * p.k, y: desde.y + (hasta.y - desde.y) * p.k }); }
                });
            }
        });
        if (!ctx.vivo()) return limpiar();
        cb.fijo = true;
        est.encender('oido', true);
        u.sfx('recompensa');
        d.sonar();
        await est.organos.oido.reaccion('acierto');
        await ctx.decir({ voz: 'zoe', texto: t.demostracionAcierto || '¡Así se hace!' }, { estado: 'acierto', minMs: 1600 });
        await ctx.decir({ voz: 'zoe', texto: t.demostracionFin || '¡Ahora te toca a ti!' }, { minMs: 1200 });
        limpiar();
        await u.esperar(scene, 400);
    }

    /** Chispazo de cortocircuito (conexión equivocada). */
    function chispazo(scene, x, y) {
        var u = U();
        u.sfx('boing');
        u.estallido(scene, x, y, { n: 12, dist: 50, tam: 14, colores: [0xffd43b, 0xffffff, 0xff922b], ms: 400, depth: 60 });
    }

    /** Dibuja los cables fijos de la escena (llamar en update). */
    function dibujarCables(scene, time) {
        (scene.cablesLab || []).forEach(function (c) { c.dibujar(time); });
    }

    /**
     * El niño arrastra el cable desde `o.desde` hasta una estación. Resuelve con el cable fijo cuando
     * acierta `o.correcto`. o.alError(id) se llama en cada estación equivocada (voz de Zeus/Zoe).
     */
    function conectar(scene, est, o) {
        var u = U();
        return new Promise(function (resolver) {
            var cb = cable(scene, { color: o.color || COLOR[o.correcto] });
            var arrastrando = false;
            var activo = true;
            var ocupado = false;
            var desde = function () { return typeof o.desde === 'function' ? o.desde() : o.desde; };
            var ev = scene.time.addEvent({ delay: 16, loop: true, callback: function () { if (cb.a) cb.dibujar(scene.time.now); } });
            var pista = u.crearPista(scene, o.pistaMs || 9000, function (cancelado) {
                var d = desde();
                var h = est.enchufe(o.correcto);
                return scene.ctx.mano({
                    punto: d, holdMs: 300, cancelado: cancelado,
                    arrastre: { dx: h.x - d.x, dy: h.y - d.y, durMs: 1000 },
                    onDuranteArrastre: function () {
                        // La pista usa un cable fantasma propio: nunca toca el cable del niño.
                        var fantasma = cable(scene, { color: o.color || COLOR[o.correcto] });
                        fantasma.g.setAlpha(0.6);
                        fantasma.brillo.setAlpha(0.6);
                        var p = { k: 0 };
                        scene.tweens.add({
                            targets: p, k: 1, duration: 1000, ease: 'Sine.easeInOut',
                            onUpdate: function () { fantasma.poner(d, { x: d.x + (h.x - d.x) * p.k, y: d.y + (h.y - d.y) * p.k }); fantasma.dibujar(scene.time.now); },
                            onComplete: function () { scene.time.delayedCall(350, function () { fantasma.destruir(); }); }
                        });
                    }
                });
            });
            pista.reiniciar();
            function resaltar(id) {
                est.orden.forEach(function (k) { est.organos[k].cont.setScale(k === id ? 1.12 : 1); });
            }
            function abajo(p) {
                if (!activo || ocupado) return;
                pista.reiniciar();
                scene.ctx.quitarMano();
                var d = desde();
                var cerca = Phaser.Math.Distance.Between(p.x, p.y, d.x, d.y) < (o.radioToma || 70) ||
                    (o.zona && Phaser.Geom.Rectangle.Contains(o.zona(), p.x, p.y));
                if (cerca) {
                    arrastrando = true;
                    cb.poner(d, { x: p.x, y: p.y });
                    u.sfx('pop');
                    return;
                }
                var id = est.en(p.x, p.y);
                if (id && o.alTocarEstacion) o.alTocarEstacion(id);
            }
            function mover(p) {
                if (!arrastrando) return;
                cb.poner(desde(), { x: p.x, y: p.y });
                resaltar(est.en(p.x, p.y));
            }
            function arriba(p) {
                if (!arrastrando) return;
                arrastrando = false;
                resaltar(null);
                var id = est.en(p.x, p.y);
                if (!id) {
                    // El cable vuelve enrollándose a su toma.
                    var fin = { x: p.x, y: p.y };
                    var d = desde();
                    var k = { t: 0 };
                    scene.tweens.add({ targets: k, t: 1, duration: 300, ease: 'Quad.easeIn', onUpdate: function () { cb.poner(d, { x: fin.x + (d.x - fin.x) * k.t, y: fin.y + (d.y - fin.y) * k.t }); }, onComplete: function () { cb.borrar(); } });
                    return;
                }
                var h = est.enchufe(id);
                cb.poner(desde(), h);
                if (id === o.correcto) {
                    activo = false;
                    pista.parar();
                    scene.ctx.quitarMano();
                    scene.input.off('pointerdown', abajo);
                    scene.input.off('pointermove', mover);
                    scene.input.off('pointerup', arriba);
                    ev.remove();
                    cb.fijo = true;
                    scene.cablesLab = (scene.cablesLab || []).concat([cb]);
                    est.encender(id, true);
                    u.sfx('recompensa');
                    resolver(cb);
                    return;
                }
                ocupado = true;
                chispazo(scene, h.x, h.y);
                est.parpadeo(id);
                est.organos[id].reaccion('error');
                Promise.resolve(o.alError ? o.alError(id) : null).catch(function () {});
                scene.time.delayedCall(450, function () {
                    var d = desde();
                    var k = { t: 0 };
                    scene.tweens.add({ targets: k, t: 1, duration: 350, ease: 'Quad.easeIn', onUpdate: function () { cb.poner(d, { x: h.x + (d.x - h.x) * k.t, y: h.y + (d.y - h.y) * k.t }); }, onComplete: function () { cb.borrar(); ocupado = false; } });
                });
            }
            scene.input.on('pointerdown', abajo);
            scene.input.on('pointermove', mover);
            scene.input.on('pointerup', arriba);
        });
    }

    global.PedniaLab = {
        conectar: conectar,
        chispazo: chispazo,
        dibujarCables: dibujarCables,
        estaciones: estaciones,
        cable: cable,
        titulo: titulo,
        tablero: tablero,
        demoCable: demoCable,
        COLOR: COLOR,
        NOMBRES: NOMBRES
    };
})(typeof window !== 'undefined' ? window : this);
