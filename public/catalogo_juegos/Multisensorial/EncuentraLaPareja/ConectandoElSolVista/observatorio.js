/**
 * PedniaObservatorio — "El observatorio de luz" (Conectando el sol — Vista, 5-6 años).
 *
 * Un observatorio con cúpula, telescopio y una esfera de cristal donde brilla un sol radiante.
 *   1. El sol         (reto del documento): se arrastra el cable desde la esfera hasta el sentido correcto.
 *                     Prueba del documento (filtro de luz y color): la luz pasa por un filtro de color y hay
 *                     que tocar el color que ve el ojo.
 *   2. Rayos de luz   un rayo de sol entra por la ventana: se tocan los espejos para girarlos y guiar el rayo
 *                     hasta la lente del ojo (dos tableros, el segundo con más espejos).
 *   Cierre del documento: el Tablero de Control Humano.
 */
(function (global) {
    'use strict';

    var B = global.PedniaParejaBase;
    var U = B.util;
    var L = function () { return global.PedniaLab; };
    var A = function () { return global.PedniaArte; };

    // Direcciones: 0 = derecha, 1 = abajo, 2 = izquierda, 3 = arriba.
    var DX = [1, 0, -1, 0];
    var DY = [0, 1, 0, -1];
    // Espejo '\' : derecha→abajo, abajo→derecha, izquierda→arriba, arriba→izquierda.
    // Espejo '/' : derecha→arriba, arriba→derecha, izquierda→abajo, abajo→izquierda.
    function reflejar(dir, tipo) {
        if (tipo === '\\') return [1, 0, 3, 2][dir];
        return [3, 2, 1, 0][dir];
    }

    var COLORES = [
        { n: 'rojo', c: 0xfa5252 }, { n: 'azul', c: 0x339af0 }, { n: 'verde', c: 0x51cf66 }, { n: 'amarillo', c: 0xfcc419 }
    ];

    var escena = {
        create: function () {
            this.modo = '';
            this.cablesLab = [];
            var ops = (this.reto && this.reto.opciones) || ['oido', 'lengua', 'ojo', 'nariz', 'mano'];
            this.dibujarFondo();
            this.est = L().estaciones(this, ops, { depth: 20 });
            this.organos = this.est.organos;
            this.rayo = this.add.graphics().setDepth(18).setBlendMode(Phaser.BlendModes.ADD);
            var scene = this;
            this.scale.on('resize', function () { scene.dibujarFondo(); scene.est.ubicar(); });
        },

        m: function () {
            var w = this.scale.width;
            var h = this.scale.height;
            return {
                w: w, h: h, cx: w * 0.5,
                // La esfera de cristal empieza por debajo del globo de diálogo.
                esfera: (function () {
                    var r = Math.min(w * 0.11, h * 0.15, 110);
                    return { x: w * 0.5, y: Math.max(h * 0.31, 110 + r), r: r };
                })(),
                piso: h * 0.6,
                obj: Phaser.Math.Clamp(Math.min(w, h) * 0.2, 90, 160)
            };
        },

        /* ── Escenario: observatorio ───────────────────────────── */

        dibujarFondo: function () {
            var m = this.m();
            var w = m.w;
            var h = m.h;
            U.cielo(this, 'ob:cupula', [[0, '#0b1533'], [0.7, '#1f2f5c'], [1, '#2b3d70']]);
            if (!this.cupula) this.cupula = this.add.image(0, 0, 'ob:cupula').setOrigin(0).setDepth(-30);
            this.cupula.setDisplaySize(w, h);
            var g = this.fondoG || (this.fondoG = this.add.graphics().setDepth(-28));
            g.clear();
            // Costillas de la cúpula.
            g.lineStyle(3, 0x3b4f87, 0.8);
            for (var i = -4; i <= 4; i++) {
                g.beginPath();
                g.moveTo(w / 2 + i * w * 0.02, -10);
                g.lineTo(w / 2 + i * w * 0.14, m.piso);
                g.strokePath();
            }
            for (var k = 1; k < 4; k++) {
                g.beginPath();
                g.arc(w / 2, -h * 0.6, h * (0.7 + k * 0.17), Math.PI * 0.15, Math.PI * 0.85);
                g.strokePath();
            }
            // Ranura abierta con estrellas.
            g.fillStyle(0x050a1a, 1);
            g.fillRect(w * 0.44, 0, w * 0.12, h * 0.16);
            for (var s = 0; s < 18; s++) {
                g.fillStyle(0xffffff, 0.5 + Math.random() * 0.5);
                g.fillCircle(w * 0.44 + Math.random() * w * 0.12, Math.random() * h * 0.15, Math.random() < 0.2 ? 2 : 1);
            }
            // Estrellas pintadas en la cúpula.
            for (var e = 0; e < 40; e++) {
                g.fillStyle(0xd0ebff, 0.25 + Math.random() * 0.4);
                g.fillCircle(Math.random() * w, Math.random() * m.piso * 0.9, 1.3);
            }
            // Telescopio a la izquierda.
            var tx = w * 0.14;
            var ty = m.piso;
            g.fillStyle(0x495057, 1);
            g.fillTriangle(tx - 40, ty, tx, ty - 80, tx + 40, ty);
            g.fillStyle(0x343a40, 1);
            g.fillTriangle(tx - 30, ty, tx, ty - 70, tx + 6, ty);
            g.fillStyle(0xdee2e6, 1);
            g.save();
            g.translateCanvas(tx, ty - 84);
            g.rotateCanvas(-0.7);
            g.fillRoundedRect(-24, -14, 110, 28, 10);
            g.fillStyle(0x4dabf7, 1);
            g.fillRoundedRect(80, -16, 16, 32, 6);
            g.restore();
            // Suelo de madera.
            g.fillStyle(0x6b4423, 1);
            g.fillRect(0, m.piso, w, h - m.piso);
            g.lineStyle(2, 0x5a381c, 1);
            for (var y = m.piso; y < h; y += 26) g.lineBetween(0, y, w, y);
            // Planetas colgantes.
            [[0.9, 0.24, 24, 0xff922b], [0.96, 0.4, 14, 0x74c0fc], [0.85, 0.42, 11, 0xb197fc]].forEach(function (p) {
                g.lineStyle(2, 0xadb5bd, 0.6);
                g.lineBetween(w * p[0], 0, w * p[0], h * p[1] - p[2]);
                g.fillStyle(p[3], 1);
                g.fillCircle(w * p[0], h * p[1], p[2]);
                g.fillStyle(0xffffff, 0.3);
                g.fillCircle(w * p[0] - p[2] * 0.3, h * p[1] - p[2] * 0.3, p[2] * 0.35);
            });
            this.dibujarEsfera();
        },

        dibujarEsfera: function () {
            var e = this.m().esfera;
            var g = this.esferaG || (this.esferaG = this.add.graphics().setDepth(-14));
            var v = this.vidrioG || (this.vidrioG = this.add.graphics().setDepth(14));
            g.clear();
            v.clear();
            // Pedestal y toma del cable.
            g.fillStyle(0x868e96, 1);
            g.fillRoundedRect(e.x - e.r * 0.7, e.y + e.r * 0.9, e.r * 1.4, e.r * 0.3, 10);
            g.fillStyle(0x495057, 1);
            g.fillRoundedRect(e.x - e.r * 0.9, e.y + e.r * 1.15, e.r * 1.8, e.r * 0.22, 10);
            g.fillStyle(0x212529, 1);
            g.fillRoundedRect(e.x - 24, e.y + e.r * 1.3, 48, 22, 8);
            g.fillStyle(0x4dabf7, 1);
            g.fillCircle(e.x, e.y + e.r * 1.3 + 11, 6);
            this.toma = { x: e.x, y: e.y + e.r * 1.3 + 11 };
            // Esfera de cristal.
            v.fillStyle(0xd0ebff, 0.12);
            v.fillCircle(e.x, e.y, e.r);
            v.lineStyle(3, 0xffffff, 0.7);
            v.strokeCircle(e.x, e.y, e.r);
            v.fillStyle(0xffffff, 0.35);
            v.fillEllipse(e.x - e.r * 0.4, e.y - e.r * 0.45, e.r * 0.4, e.r * 0.22);
        },

        crearSol: function () {
            var e = this.m().esfera;
            var c = this.add.container(e.x, e.y).setDepth(12);
            var halo = this.add.image(0, 0, A().textura(this, 'humo', 128)).setTint(0xffe066).setDisplaySize(e.r * 3, e.r * 3).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.7);
            var rayos = this.add.image(0, 0, A().textura(this, 'sol_rayos', 256)).setDisplaySize(e.r * 1.7, e.r * 1.7);
            var cara = this.add.image(0, 0, A().textura(this, 'sol', 256)).setDisplaySize(e.r * 1.7, e.r * 1.7);
            c.add([halo, rayos, cara]);
            c.rayos = rayos;
            c.halo = halo;
            this.sol = c;
            return c;
        },

        /* ── Ronda 1 ───────────────────────────────────────────── */

        rondaSol: async function () {
            var scene = this;
            this.modo = 'sol';
            var s = this.crearSol();
            s.setScale(0.2);
            this.tweens.add({ targets: s, scale: 1, duration: 800, ease: 'Back.easeOut' });
            U.sfx('shineGlimmer');
            await this.ctx.decir(this.reto.presentacion || { voz: 'zeus', texto: 'Conecta el sol con el sentido que nos permite captar la luz y los colores del día.' });
            var r = this.reto;
            var cb = await L().conectar(this, this.est, {
                desde: function () { return scene.toma; },
                correcto: 'ojo',
                alError: function (id) {
                    var linea = null;
                    (r.errores || []).forEach(function (e) { if (!linea && (e.objetos || []).indexOf(id) >= 0) linea = e; });
                    return scene.ctx.decir(linea || r.errorOtro || { voz: 'zeus', texto: 'Escucha u observa nuevamente. ¡Inténtalo otra vez!' });
                }
            });
            for (var i = 0; i < 4; i++) this.time.delayedCall(i * 160, function () { scene.luzPorCable(cb); });
            U.sfx('shineGlimmer');
            await U.esperar(this, 700);
            var ojo = this.organos.ojo;
            ojo.parpadear();
            await ojo.reaccion('acierto');
            await this.filtros();
            await this.ctx.decir(r.acierto || { voz: 'zeus', texto: '¡Muy bien!' }, { estado: 'acierto' });
        },

        luzPorCable: function (cb) {
            var p = { t: 0 };
            var c = this.add.circle(0, 0, 8, 0xffe066).setDepth(30).setBlendMode(Phaser.BlendModes.ADD);
            this.tweens.add({
                targets: p, t: 1, duration: 650, ease: 'Sine.easeIn',
                onUpdate: function () { var q = cb.punto(p.t); c.setPosition(q.x, q.y); },
                onComplete: function () { c.destroy(); }
            });
        },

        /** Prueba del documento: la luz pasa por un filtro de color; tocar el color que ve el ojo. */
        filtros: async function () {
            var scene = this;
            var m = this.m();
            var e = m.esfera;
            var ojo = this.organos.ojo;
            var tam = Math.min(m.w * 0.075, 64);
            var px = Math.min(m.w - tam * 1.2, e.x + e.r * 1.9);
            var muestras = COLORES.map(function (c, i) {
                var k = scene.add.container(px + (i % 2) * tam * 1.25, e.y - tam * 0.65 + Math.floor(i / 2) * tam * 1.3).setDepth(30);
                var g = scene.add.graphics();
                g.fillStyle(0xffffff, 1);
                g.fillRoundedRect(-tam / 2, -tam / 2, tam, tam, 12);
                g.fillStyle(c.c, 1);
                g.fillRoundedRect(-tam / 2 + 6, -tam / 2 + 6, tam - 12, tam - 12, 8);
                k.add(g);
                k.color = c;
                k.tam = tam;
                k.alpha = 0;
                scene.tweens.add({ targets: k, alpha: 1, duration: 300, delay: i * 80 });
                return k;
            });
            // Filtro de cristal que se pone delante del sol.
            var filtro = this.add.circle(e.x, e.y, e.r * 0.92, 0xffffff, 0.5).setDepth(15).setStrokeStyle(5, 0xdee2e6).setAlpha(0);
            await this.ctx.decir({ voz: 'zeus', texto: '¡Prueba de filtros de color! La luz pasa por el filtro: toca el color que ve el ojo.' });
            var orden = U.mezclar(COLORES.slice()).slice(0, 3);
            for (var r = 0; r < orden.length; r++) {
                var c = orden[r];
                filtro.fillColor = c.c;
                filtro.x = e.x - e.r * 2;
                await U.tween(this, { targets: filtro, x: e.x, alpha: 0.6, duration: 450, ease: 'Back.easeOut' });
                this.sol.halo.setTint(c.c);
                ojo.cont.list.forEach(function () {});
                ojo.mirar(e.x, e.y);
                await new Promise(function (resolver) {
                    var ocupado = false;
                    var pista = U.crearPista(scene, 8000, function (cancelado) {
                        var k = muestras.find(function (mm) { return mm.color === c; });
                        return scene.ctx.mano({ punto: { x: k.x, y: k.y }, holdMs: 400, cancelado: cancelado });
                    });
                    pista.reiniciar();
                    var toque = function (p) {
                        if (ocupado) return;
                        var k = muestras.find(function (mm) { return Math.abs(p.x - mm.x) < mm.tam / 2 && Math.abs(p.y - mm.y) < mm.tam / 2; });
                        if (!k) return;
                        pista.reiniciar();
                        scene.ctx.quitarMano();
                        if (k.color === c) {
                            scene.input.off('pointerdown', toque);
                            pista.parar();
                            U.sfx('chispas');
                            scene.tweens.add({ targets: k, scale: 1.25, duration: 200, yoyo: true });
                            U.estallido(scene, ojo.cont.x, ojo.cont.y - 40, { n: 10, dist: 70, colores: [c.c] });
                            ojo.parpadear();
                            scene.ctx.decir({ voz: 'zoe', texto: '¡Sí! El ojo ve el color ' + c.n + '.' }, { estado: 'acierto' });
                            scene.time.delayedCall(1200, resolver);
                            return;
                        }
                        ocupado = true;
                        scene.tweens.add({ targets: k, angle: { from: -10, to: 10 }, duration: 80, yoyo: true, repeat: 2, onComplete: function () { k.angle = 0; } });
                        scene.ctx.decir({ voz: 'zeus', texto: 'Ese es ' + k.color.n + '. Observa bien el color de la luz.' });
                        scene.time.delayedCall(1100, function () { ocupado = false; });
                    };
                    scene.input.on('pointerdown', toque);
                });
                await U.tween(this, { targets: filtro, x: e.x + e.r * 2, alpha: 0, duration: 350 });
            }
            this.sol.halo.setTint(0xffe066);
            filtro.destroy();
            muestras.forEach(function (k) { scene.tweens.add({ targets: k, alpha: 0, duration: 300, onComplete: function () { k.destroy(); } }); });
        },

        /* ── Ronda 2: espejos ──────────────────────────────────── */

        rondaEspejos: async function () {
            var scene = this;
            this.modo = 'espejos';
            this.cablesLab.forEach(function (c) { c.destruir(); });
            this.cablesLab = [];
            this.est.orden.forEach(function (id) { scene.est.encender(id, false); });
            // La esfera se aparta: el sol pasa a la ventana de la izquierda.
            this.tweens.add({ targets: [this.esferaG, this.vidrioG], alpha: 0, duration: 400 });
            this.tweens.add({ targets: this.sol, alpha: 0, duration: 400 });
            await this.ctx.decir({ voz: 'zoe', texto: '¡Un rayo de sol entra al observatorio! Toca los espejos para girarlos y lleva la luz hasta el ojo.' });
            await this.tableroEspejos(1);
            await this.ctx.decir({ voz: 'zeus', texto: '¡Excelente! Ahora con más espejos.' }, { estado: 'acierto' });
            await this.tableroEspejos(2);
        },

        tableroEspejos: async function (nivel) {
            var scene = this;
            var m = this.m();
            var ojoP = this.est.enchufe('ojo');
            var filas = 4;
            var cols = 5;
            var arriba = m.h * 0.15;
            var abajo = ojoP.y - 26;
            var lado = Math.min((abajo - arriba) / filas, (m.w * 0.62) / cols, 92);
            // La columna de salida queda justo encima de la estación del ojo.
            var cS = nivel === 1 ? 3 : 4;
            var x0 = ojoP.x - (cS + 0.5) * lado;
            if (x0 < lado * 1.5) { cS = Math.max(1, Math.floor((ojoP.x - lado * 1.5) / lado - 0.5)); x0 = ojoP.x - (cS + 0.5) * lado; }
            if (x0 + cols * lado > m.w - 10) { cS = cols - 1; x0 = ojoP.x - (cS + 0.5) * lado; }
            var y0 = abajo - filas * lado;
            var r0 = 0;
            // Camino solución.
            var espejos = [];
            if (nivel === 1) {
                espejos.push({ f: r0, c: cS, sol: '\\' });
            } else {
                var c1 = Math.max(1, cS - 2);
                var r1 = 2;
                espejos.push({ f: r0, c: c1, sol: '\\' });
                espejos.push({ f: r1, c: c1, sol: '\\' });
                espejos.push({ f: r1, c: cS, sol: '\\' });
            }
            // Celdas por donde pasa el rayo correcto (ahí no puede haber espejos de despiste).
            var camino = {};
            var marcar = function (f, c) { camino[f + ',' + c] = true; };
            if (nivel === 1) {
                for (var q = 0; q <= cS; q++) marcar(r0, q);
                for (var q2 = r0; q2 < filas; q2++) marcar(q2, cS);
            } else {
                var cc1 = espejos[0].c;
                var rr1 = espejos[1].f;
                for (var a1 = 0; a1 <= cc1; a1++) marcar(r0, a1);
                for (var a2 = r0; a2 <= rr1; a2++) marcar(a2, cc1);
                for (var a3 = cc1; a3 <= cS; a3++) marcar(rr1, a3);
                for (var a4 = rr1; a4 < filas; a4++) marcar(a4, cS);
            }
            // Espejos de despiste.
            var libres = [];
            for (var i = 0; i < filas; i++) for (var j = 0; j < cols; j++) {
                if (!camino[i + ',' + j]) libres.push({ f: i, c: j });
            }
            U.mezclar(libres).slice(0, nivel === 1 ? 2 : 3).forEach(function (l) { espejos.push({ f: l.f, c: l.c, sol: null }); });
            espejos.forEach(function (e) { e.tipo = Math.random() < 0.5 ? '/' : '\\'; });
            // Que al menos un espejo del camino empiece mal.
            var malo = espejos.find(function (e) { return e.sol; });
            malo.tipo = '/';
            var cont = this.add.container(0, 0).setDepth(16);
            var marco = this.add.graphics();
            marco.fillStyle(0x0b1533, 0.85);
            marco.fillRoundedRect(x0 - 8, y0 - 8, cols * lado + 16, filas * lado + 16, 14);
            marco.lineStyle(2, 0x3b5bdb, 0.7);
            for (var a = 0; a <= cols; a++) marco.lineBetween(x0 + a * lado, y0, x0 + a * lado, y0 + filas * lado);
            for (var b = 0; b <= filas; b++) marco.lineBetween(x0, y0 + b * lado, x0 + cols * lado, y0 + b * lado);
            cont.add(marco);
            // Ventana con el sol a la izquierda.
            var ventana = this.add.container(x0 - lado * 0.75, y0 + (r0 + 0.5) * lado);
            ventana.add(this.add.circle(0, 0, lado * 0.5, 0x1c2c5c).setStrokeStyle(4, 0xadb5bd));
            ventana.add(this.add.image(0, 0, A().textura(this, 'sol', 128)).setDisplaySize(lado * 0.8, lado * 0.8));
            cont.add(ventana);
            // Lente sobre el ojo.
            var lente = this.add.circle(x0 + (cS + 0.5) * lado, y0 + filas * lado + 10, 10, 0x74c0fc).setStrokeStyle(3, 0xffffff);
            cont.add(lente);
            var espG = this.add.graphics();
            cont.add(espG);
            espejos.forEach(function (e) { e.giro = e.tipo === '/' ? -45 : 45; });
            var dibujarEspejos = function () {
                espG.clear();
                espejos.forEach(function (e) {
                    var cx = x0 + (e.c + 0.5) * lado;
                    var cy = y0 + (e.f + 0.5) * lado;
                    espG.fillStyle(0x495057, 1);
                    espG.fillCircle(cx, cy, lado * 0.16);
                    var a = Phaser.Math.DegToRad(e.giro) - Math.PI / 2;
                    var lx = Math.cos(a) * lado * 0.42;
                    var ly = Math.sin(a) * lado * 0.42;
                    espG.lineStyle(10, 0x868e96, 1);
                    espG.lineBetween(cx - lx, cy - ly, cx + lx, cy + ly);
                    espG.lineStyle(5, 0xe7f5ff, 1);
                    espG.lineBetween(cx - lx, cy - ly, cx + lx, cy + ly);
                });
            };
            var trazar = function () {
                var pts = [{ x: ventana.x + lado * 0.3, y: ventana.y }];
                var f = r0;
                var c = 0;
                var dir = 0;
                var pasos = 0;
                pts.push({ x: x0, y: y0 + (f + 0.5) * lado });
                while (pasos++ < 40) {
                    if (f < 0 || f >= filas || c < 0 || c >= cols) break;
                    var e = espejos.find(function (ee) { return ee.f === f && ee.c === c; });
                    var cx = x0 + (c + 0.5) * lado;
                    var cy = y0 + (f + 0.5) * lado;
                    if (e) {
                        pts.push({ x: cx, y: cy });
                        dir = reflejar(dir, e.tipo);
                    }
                    f += DY[dir];
                    c += DX[dir];
                }
                // Punto final: borde del tablero.
                var fx = x0 + (Phaser.Math.Clamp(c, -0.5, cols - 0.5) + 0.5) * lado;
                var fy = y0 + (Phaser.Math.Clamp(f, -0.5, filas - 0.5) + 0.5) * lado;
                if (dir === 0) fx = x0 + cols * lado;
                if (dir === 2) fx = x0;
                if (dir === 1) fy = y0 + filas * lado;
                if (dir === 3) fy = y0;
                pts.push({ x: fx, y: fy });
                var llega = dir === 1 && c === cS && f >= filas;
                if (llega) pts.push({ x: lente.x, y: ojoP.y - 6 });
                return { pts: pts, llega: llega };
            };
            this.dibujarRayo = function (time) {
                var tr = trazar();
                var g = scene.rayo;
                g.clear();
                var brillo = 0.75 + 0.25 * Math.sin(time / 120);
                g.lineStyle(22, 0xffd43b, 0.22 * brillo);
                g.strokePoints(tr.pts, false);
                g.lineStyle(10, 0xffe066, 0.55);
                g.strokePoints(tr.pts, false);
                g.lineStyle(4, 0xffffff, 0.95);
                g.strokePoints(tr.pts, false);
                return tr;
            };
            dibujarEspejos();
            cont.alpha = 0;
            await U.tween(this, { targets: cont, alpha: 1, duration: 400 });
            this.tablero = { espejos: espejos, x0: x0, y0: y0, lado: lado };
            await new Promise(function (resolver) {
                var pista = U.crearPista(scene, 9000, function (cancelado) {
                    var e = espejos.find(function (ee) { return ee.sol && ee.tipo !== ee.sol; });
                    if (!e) return Promise.resolve();
                    return scene.ctx.mano({ punto: { x: x0 + (e.c + 0.5) * lado, y: y0 + (e.f + 0.5) * lado }, holdMs: 400, cancelado: cancelado });
                });
                pista.reiniciar();
                var girando = false;
                var toque = function (p) {
                    if (girando) return;
                    var j = Math.floor((p.x - x0) / lado);
                    var i = Math.floor((p.y - y0) / lado);
                    var e = espejos.find(function (ee) { return ee.f === i && ee.c === j; });
                    if (!e) return;
                    pista.reiniciar();
                    scene.ctx.quitarMano();
                    girando = true;
                    e.tipo = e.tipo === '/' ? '\\' : '/';
                    U.sfx('pop');
                    var desde = e.giro;
                    var hasta = e.tipo === '/' ? -45 : 45;
                    if (hasta < desde) hasta += 180;
                    var k = { v: 0 };
                    scene.tweens.add({
                        targets: k, v: 1, duration: 220, ease: 'Back.easeOut',
                        onUpdate: function () { e.giro = desde + (hasta - desde) * k.v; dibujarEspejos(); },
                        onComplete: function () {
                            e.giro = hasta % 180;
                            dibujarEspejos();
                            girando = false;
                            if (trazar().llega) {
                                scene.input.off('pointerdown', toque);
                                pista.parar();
                                resolver();
                            }
                        }
                    });
                };
                scene.input.on('pointerdown', toque);
            });
            // ¡La luz llega al ojo!
            var ojo = this.organos.ojo;
            U.sfx('shineGlimmer');
            this.est.encender('ojo', true);
            ojo.gafas(true);
            ojo.mirar(lente.x, lente.y);
            U.estallido(this, lente.x, lente.y, { n: 16, dist: 100, colores: [0xffe066, 0xffffff] });
            await ojo.reaccion('acierto');
            await U.esperar(this, 900);
            ojo.gafas(false);
            this.dibujarRayo = null;
            this.rayo.clear();
            await U.tween(this, { targets: cont, alpha: 0, duration: 400 });
            cont.destroy();
            this.est.encender('ojo', false);
        },

        /** Para pruebas: espejos del camino que están mal girados. */
        espejosPendientes: function () {
            var t = this.tablero;
            if (!t) return [];
            return t.espejos.filter(function (e) { return e.sol && e.tipo !== e.sol; })
                .map(function (e) { return { x: t.x0 + (e.c + 0.5) * t.lado, y: t.y0 + (e.f + 0.5) * t.lado }; });
        },

        /* ── API ───────────────────────────────────────────────── */

        demo: async function () {
            var e = this.m().esfera;
            this.modo = 'demo';
            await L().demoCable(this, this.est, e.x, e.y, Math.min(e.r * 1.4, this.m().obj), this.toma);
            this.modo = '';
        },

        jugar: async function () {
            await this.rondaSol();
            if (!this.ctx.vivo()) return;
            await this.rondaEspejos();
        },

        fiestaFinal: async function () {
            await L().tablero(this, [
                { id: 'campana', organo: 'oido' }, { id: 'flor', organo: 'nariz' },
                { id: 'helado', organo: 'lengua' }, { id: 'sol', organo: 'ojo' }
            ]);
        },

        update: function (time, delta) {
            var dt = Math.min(delta || 16, 50) / 1000;
            if (this.sol && !U.reducido()) {
                this.sol.rayos.rotation += dt * 0.3;
                this.sol.halo.alpha = 0.55 + 0.15 * Math.sin(time / 300);
            }
            if (this.dibujarRayo) this.dibujarRayo(time);
            L().dibujarCables(this, time);
            this.est.actualizar(time, this.sol && this.sol.alpha > 0.5 ? { x: this.sol.x, y: this.sol.y } : null);
        },

        estado: function () {
            var scene = this;
            return {
                modo: this.modo,
                toma: this.toma,
                estaciones: this.est.orden.reduce(function (acc, id) { acc[id] = scene.est.enchufe(id); return acc; }, {})
            };
        }
    };

    global.PedniaObservatorio = B.crearMotor({ id: 'observatorio', fondo: '#0b1533', escena: escena });
})(typeof window !== 'undefined' ? window : this);
