/**
 * PedniaAmanecer — "Despertar al Ojo" (¿Con qué sentido sentimos el sol?, 3-4 años).
 *
 * Un lago entre montañas al amanecer. La luz de toda la escena cambia con el juego: el ojo ve
 * cuando hay luz y se duerme cuando no la hay.
 *   1. El sol           (reto del documento): el sol sale guiñando un ojo e ilumina el lago; se toca la
 *                       burbuja del ojo o se arrastra el sol. El ojo parpadea feliz y se pone gafas de sol.
 *   2. Nubes traviesas  las nubes tapan el sol, todo se oscurece y el ojo se adormece: hay que apartar las
 *                       nubes (tocarlas o empujarlas). Cada vez que el sol vuelve, crece un arcoíris.
 *   3. La noche         sin luz el ojo no ve: hay que encender lo que da luz (farol, estrella, luciérnagas).
 *                       La campana suena y la flor huele, pero no alumbran.
 *   Final: vuelve a salir el sol con el arcoíris completo.
 */
(function (global) {
    'use strict';

    var B = global.PedniaParejaBase;
    var U = B.util;
    var A = function () { return global.PedniaArte; };

    var escena = {
        create: function () {
            this.luz = 0.35;
            this.luzObjetivo = 0.35;
            this.nubes = [];
            this.arco = 0;
            this.modo = '';
            this.arr = B.arrastrador(this);
            var ops = ((this.reto && this.reto.opciones) || ['oido', 'lengua', 'ojo', 'nariz']).filter(function (o) { return o !== 'mano'; });
            this.dibujarFondo();
            this.velo = this.add.rectangle(0, 0, 10, 10, 0x0b1a3a, 1).setOrigin(0).setDepth(8);
            this.fila = B.filaOrganos(this, ops, { depth: 20 });
            this.organos = this.fila.organos;
            this.organos.ojo.sueno = 0.45;
            this.haz = this.add.graphics().setDepth(19).setBlendMode(Phaser.BlendModes.ADD);
            this.input.on('pointerdown', this.alTocar, this);
            this.input.on('pointermove', this.alMover, this);
            this.input.on('pointerup', this.alSoltar, this);
            var scene = this;
            this.scale.on('resize', function () { scene.dibujarFondo(); scene.fila.ubicar(); });
        },

        m: function () {
            var w = this.scale.width;
            var h = this.scale.height;
            return {
                w: w, h: h,
                horizonte: h * 0.5,
                orilla: h * 0.64,
                cx: w * 0.5,
                obj: Phaser.Math.Clamp(Math.min(w, h) * 0.2, 90, 170),
                r: this.fila ? this.fila.radio() : 60,
                cielo: { x: w * 0.36, y: Math.max(h * 0.2, 150) }
            };
        },

        /* ── Escenario: lago de montaña ─────────────────────────── */

        dibujarFondo: function () {
            var m = this.m();
            var w = m.w;
            var h = m.h;
            U.cielo(this, 'am:cielo', [[0, '#3b8fe0'], [0.6, '#9fd0f7'], [1, '#ffe3c2']]);
            if (!this.cielo) this.cielo = this.add.image(0, 0, 'am:cielo').setOrigin(0).setDepth(-30);
            this.cielo.setDisplaySize(w, m.horizonte + 4);
            // Estrellas del cielo nocturno (se ven cuando falta la luz).
            if (!this.estrellasCielo) {
                this.estrellasCielo = this.add.graphics().setDepth(9);
                for (var s = 0; s < 40; s++) {
                    this.estrellasCielo.fillStyle(0xffffff, 0.6 + Math.random() * 0.4);
                    this.estrellasCielo.fillCircle(Math.random() * w, Math.random() * m.horizonte * 0.85, Math.random() < 0.2 ? 2 : 1.2);
                }
            }
            var f = this.fondoG || (this.fondoG = this.add.graphics().setDepth(-26));
            f.clear();
            // Montañas lejanas y cercanas con nieve.
            var montes = [[0.12, 0.26, 0.3, 0x7c93b5], [0.38, 0.18, 0.34, 0x6b84aa], [0.66, 0.24, 0.3, 0x7c93b5], [0.9, 0.2, 0.3, 0x6b84aa]];
            montes.forEach(function (mt) {
                var x = w * mt[0];
                var y = h * mt[1];
                var ancho = w * mt[2];
                f.fillStyle(mt[3], 1);
                f.fillTriangle(x - ancho / 2, m.horizonte, x, y, x + ancho / 2, m.horizonte);
                f.fillStyle(0x5a7299, 1);
                f.fillTriangle(x, y, x + ancho / 2, m.horizonte, x + ancho * 0.12, m.horizonte);
                f.fillStyle(0xffffff, 1);
                f.fillTriangle(x - ancho * 0.11, y + (m.horizonte - y) * 0.22, x, y, x + ancho * 0.11, y + (m.horizonte - y) * 0.22);
                f.fillTriangle(x - ancho * 0.11, y + (m.horizonte - y) * 0.22, x - ancho * 0.04, y + (m.horizonte - y) * 0.3, x + ancho * 0.02, y + (m.horizonte - y) * 0.2);
            });
            // Pinos en la orilla de enfrente.
            for (var i = 0; i < 26; i++) {
                var px = (i / 25) * w + ((i * 37) % 13);
                var ph = h * (0.07 + ((i * 53) % 5) / 100);
                f.fillStyle(i % 2 ? 0x2b6b45 : 0x24603d, 1);
                f.fillTriangle(px - ph * 0.32, m.horizonte + 4, px, m.horizonte - ph, px + ph * 0.32, m.horizonte + 4);
            }
            // Lago con reflejo.
            f.fillStyle(0x4a90c8, 1);
            f.fillRect(0, m.horizonte, w, m.orilla - m.horizonte);
            f.fillStyle(0x6aaedb, 1);
            f.fillRect(0, m.horizonte + (m.orilla - m.horizonte) * 0.4, w, (m.orilla - m.horizonte) * 0.6);
            montes.forEach(function (mt) {
                var x = w * mt[0];
                var ancho = w * mt[2];
                f.fillStyle(0x8fb6dc, 0.55);
                f.fillTriangle(x - ancho / 2 * 0.9, m.horizonte + 2, x, m.horizonte + (m.horizonte - h * mt[1]) * 0.4, x + ancho / 2 * 0.9, m.horizonte + 2);
            });
            // Orilla con pradera.
            f.fillStyle(0x82c96b, 1);
            f.fillRect(0, m.orilla, w, h - m.orilla);
            f.fillStyle(0x6fbb58, 1);
            f.fillEllipse(w * 0.5, m.orilla + 4, w * 1.2, 22);
            for (var k = 0; k < 30; k++) {
                var gx = (k * 89) % w;
                var gy = m.orilla + 14 + ((k * 41) % 100) / 100 * (h - m.orilla - 20);
                f.fillStyle(0x5fa84a, 1);
                f.fillTriangle(gx, gy, gx + 4, gy - 9, gx + 8, gy);
            }
            // Muelle de madera.
            f.fillStyle(0x8a5a2b, 1);
            f.fillRect(w * 0.08, m.orilla - 8, w * 0.16, 10);
            f.fillStyle(0x6b3e1f, 1);
            for (var d = 0; d < 4; d++) f.fillRect(w * 0.09 + d * w * 0.045, m.orilla - 2, 6, 18);
            // Cabaña.
            var cx = w * 0.86;
            var cy = m.orilla + 6;
            f.fillStyle(0x000000, 0.15);
            f.fillEllipse(cx, cy + 4, 150, 16);
            f.fillStyle(0x9c5a2b, 1);
            f.fillRect(cx - 60, cy - 70, 120, 70);
            f.fillStyle(0x7a4520, 1);
            for (var tb = 0; tb < 6; tb++) f.fillRect(cx - 60, cy - 70 + tb * 12, 120, 2);
            f.fillStyle(0xa61e1e, 1);
            f.fillTriangle(cx - 72, cy - 68, cx, cy - 118, cx + 72, cy - 68);
            f.fillStyle(0x5c3a1e, 1);
            f.fillRect(cx - 12, cy - 40, 24, 40);
            this.ventana = { x: cx + 34, y: cy - 44 };
            f.fillStyle(0x495057, 1);
            f.fillRect(cx + 22, cy - 56, 26, 24);
            if (!this.ventanaLuz) this.ventanaLuz = this.add.rectangle(cx + 35, cy - 44, 22, 20, 0xffd43b).setDepth(10).setAlpha(0);
            this.ventanaLuz.setPosition(cx + 35, cy - 44);
            if (!this.brillosLago) this.brillosLago = this.add.graphics().setDepth(-25);
            if (!this.arcoG) this.arcoG = this.add.graphics().setDepth(-27);
            this.pintarArco();
        },

        pintarArco: function () {
            var g = this.arcoG;
            var m = this.m();
            g.clear();
            if (this.arco <= 0.02) return;
            var colores = [0xff6b6b, 0xff922b, 0xfcc419, 0x51cf66, 0x339af0, 0x845ef7];
            // Que el arcoíris quepa bajo el globo de diálogo también en pantallas bajas.
            var r = Math.min(m.w * 0.36, m.horizonte - 110);
            var cx = m.w * 0.55;
            var cy = m.horizonte + 6;
            var fin = Math.PI + Math.PI * Math.min(1, this.arco);
            colores.forEach(function (c, i) {
                g.lineStyle(12, c, 0.75);
                g.beginPath();
                g.arc(cx, cy, r - i * 11, Math.PI, fin);
                g.strokePath();
            });
        },

        ponerLuz: function (v, ms) {
            this.tweens.killTweensOf(this);
            if (!ms) { this.luz = v; return Promise.resolve(); }
            return U.tween(this, { targets: this, luz: v, duration: ms, ease: 'Sine.easeInOut' });
        },

        /* ── Sol ────────────────────────────────────────────────── */

        crearSol: function (x, y) {
            var m = this.m();
            var tam = m.obj * 1.05;
            var c = this.add.container(x, y).setDepth(12);
            var halo = this.add.image(0, 0, A().textura(this, 'chispa', 128)).setTint(0xffe066).setDisplaySize(tam * 2.2, tam * 2.2).setAlpha(0.55).setBlendMode(Phaser.BlendModes.ADD);
            var rayos = this.add.image(0, 0, A().textura(this, 'sol_rayos', 256)).setDisplaySize(tam * 1.15, tam * 1.15);
            var cara = this.add.image(0, 0, A().textura(this, 'sol', 256)).setDisplaySize(tam * 1.15, tam * 1.15);
            c.add([halo, rayos, cara]);
            c.rayos = rayos;
            c.halo = halo;
            c.tam = tam;
            this.sol = c;
            return c;
        },

        /** Rayos dorados que barren la escena desde el sol. */
        dibujarRayos: function (time) {
            var g = this.haz;
            g.clear();
            if (!this.sol || !this.sol.visible || this.solTapado) return;
            var s = this.sol;
            var luz = Math.max(0, Math.min(1, this.luz));
            for (var i = 0; i < 6; i++) {
                var a = Math.PI * 0.25 + i * Math.PI * 0.1 + Math.sin(time / 1800 + i) * 0.05;
                var largo = this.scale.height * 0.9;
                g.fillStyle(0xfff3bf, 0.05 * luz);
                g.fillTriangle(s.x, s.y, s.x + Math.cos(a - 0.04) * largo, s.y + Math.sin(a - 0.04) * largo, s.x + Math.cos(a + 0.04) * largo, s.y + Math.sin(a + 0.04) * largo);
            }
            // Haz hacia el ojo cuando lo está iluminando.
            if (this.hazOjo) {
                var o = this.organos.ojo.cont;
                var ang = Math.atan2(o.y - s.y, o.x - s.x);
                var ab = 0.08;
                g.fillStyle(0xffe066, 0.22 + 0.08 * Math.sin(time / 120));
                g.fillTriangle(s.x, s.y, o.x + Math.cos(ang + Math.PI / 2) * 60, o.y + Math.sin(ang + Math.PI / 2) * 60, o.x - Math.cos(ang + Math.PI / 2) * 60, o.y - Math.sin(ang + Math.PI / 2) * 60);
                void ab;
            }
        },

        /** El sol ilumina al ojo: se despierta, parpadea feliz y (opcional) se pone gafas. */
        iluminarOjo: async function (gafas) {
            var ojo = this.organos.ojo;
            this.hazOjo = true;
            U.sfx('shineGlimmer');
            this.tweens.add({ targets: ojo, sueno: 0, duration: 500 });
            await U.esperar(this, 450);
            ojo.parpadear();
            await U.esperar(this, 260);
            ojo.parpadear();
            if (gafas) ojo.gafas(true);
            await ojo.reaccion('acierto');
            U.estallido(this, ojo.cont.x, ojo.cont.y - ojo.radio, { n: 14, dist: 120, colores: [0xffe066, 0xffd43b, 0xfff3bf] });
            this.hazOjo = false;
        },

        /* ── Entrada ───────────────────────────────────────────── */

        alTocar: function (p) {
            if (this.pista) this.pista.reiniciar();
            this.ctx.quitarMano();
            if (this.modo === 'sol' && this.esperando && !this.ocupado) {
                if (this.sol && Phaser.Math.Distance.Between(p.x, p.y, this.sol.x, this.sol.y) < this.sol.tam * 0.55) {
                    this.arr.empezar(this.sol, p);
                    return;
                }
                var id = this.fila.en(p.x, p.y);
                if (id) this.elegir(id);
                return;
            }
            if (this.modo === 'nubes') {
                var n = this.nubeEn(p.x, p.y);
                if (n) {
                    n.toque = { x: p.x, y: p.y, t: this.time.now };
                    this.empujarNube(n, n.img.x - p.x, n.img.y - p.y, 1);
                }
                return;
            }
            if (this.modo === 'noche' && this.esperando && !this.ocupado) {
                var c = (this.cosasNoche || []).find(function (k) { return !k.encendida && Phaser.Math.Distance.Between(p.x, p.y, k.cont.x, k.cont.y) < k.tam * 0.6; });
                if (c) this.tocarNoche(c);
            }
        },

        alMover: function (p) {
            if (this.arr.cont && p.isDown) {
                this.arr.mover(p);
                var sobre = this.fila.en(p.x, p.y);
                var scene = this;
                this.fila.orden.forEach(function (id) { scene.organos[id].cont.setScale(id === sobre ? 1.12 : 1); });
            }
            // Empujar una nube arrastrando el dedo sobre ella.
            if (this.modo === 'nubes' && p.isDown) {
                var n = this.nubeEn(p.x, p.y);
                if (n) this.empujarNube(n, p.x - p.prevPosition.x, p.y - p.prevPosition.y, 0.35);
            }
        },

        alSoltar: function (p) {
            var r = this.arr.soltar(p);
            if (!r) return;
            var scene = this;
            this.fila.orden.forEach(function (id) { scene.organos[id].cont.setScale(1); });
            var sobre = this.fila.en(p.x, p.y);
            if (r.movido && sobre && this.esperando && !this.ocupado) this.elegir(sobre);
            else this.arr.devolver(r.cont, this.casaSol);
        },

        elegir: function (id) {
            if (!this.esperando || this.ocupado) return;
            if (id === 'ojo') {
                this.esperando = false;
                if (this.resolver) this.resolver(id);
                return;
            }
            this.ocupado = true;
            var scene = this;
            U.sfx('boing');
            this.organos[id].reaccion('error');
            if (this.sol) {
                this.tweens.killTweensOf(this.sol);
                this.tweens.add({ targets: this.sol, x: this.casaSol.x, y: this.casaSol.y, angle: 0, duration: 420, ease: 'Back.easeOut' });
                this.tweens.add({ targets: this.sol, scaleY: { from: 0.86, to: 1 }, duration: 420, ease: 'Bounce.easeOut' });
            }
            var r = this.reto || {};
            var linea = null;
            (r.errores || []).forEach(function (e) { if (!linea && (e.objetos || []).indexOf(id) >= 0) linea = e; });
            this.ctx.decir(linea || r.errorOtro || { voz: 'zoe', texto: '¡El sol nos da luz para mirar!' });
            this.time.delayedCall(800, function () { scene.ocupado = false; });
        },

        /* ── Ronda 1: el sol del documento ────────────────────── */

        rondaSol: async function () {
            var scene = this;
            var m = this.m();
            this.modo = 'sol';
            this.casaSol = { x: m.cx, y: m.h * 0.36 };
            var s = this.crearSol(m.cx, m.horizonte + 40);
            s.setDepth(-27);
            this.ponerLuz(0.75, 2200);
            await U.tween(this, { targets: s, y: this.casaSol.y, duration: 2000, ease: 'Sine.easeOut' });
            s.setDepth(12);
            U.sfx('shineGlimmer');
            await this.ctx.decir(this.reto.presentacion || { voz: 'zeus', texto: '¿Con qué parte de nuestro cuerpo podemos ver su brillante luz?' });
            this.pista = U.crearPista(this, 9000, function (cancelado) {
                var o = scene.organos.ojo.cont;
                return scene.ctx.mano({ punto: { x: o.x, y: o.y }, holdMs: 500, cancelado: cancelado, onPresionar: function () { scene.organos.ojo.reaccion('toca'); } });
            });
            this.pista.reiniciar();
            this.esperando = true;
            this.ocupado = false;
            await new Promise(function (r) { scene.resolver = r; });
            this.pista.parar();
            this.ctx.quitarMano();
            this.arr.cont = null;
            var ojo = this.organos.ojo;
            await U.volarA(this, s, ojo.cont.x - ojo.radio * 1.4, ojo.cont.y - ojo.radio * 1.3, 700, 0.6);
            await this.iluminarOjo(true);
            this.ponerLuz(1, 1200);
            await this.ctx.decir(this.reto.acierto || { voz: 'zeus', texto: '¡Muy bien!' }, { estado: 'acierto' });
            // El sol sube a su sitio en el cielo.
            await U.volarA(this, s, m.cielo.x, m.cielo.y, 900, 0.75, null, 40);
            this.time.delayedCall(800, function () { ojo.gafas(false); });
        },

        /* ── Ronda 2: nubes traviesas ─────────────────────────── */

        nubeEn: function (x, y) {
            for (var i = this.nubes.length - 1; i >= 0; i--) {
                var n = this.nubes[i];
                if (Math.abs(x - n.img.x) < n.ancho * 0.48 && Math.abs(y - n.img.y) < n.ancho * 0.3) return n;
            }
            return null;
        },

        empujarNube: function (n, dx, dy, fuerza) {
            var d = Math.sqrt(dx * dx + dy * dy) || 1;
            n.vx += (dx / d) * 520 * fuerza;
            n.vy += (dy / d) * 160 * fuerza;
            if (!n.libre) {
                // Deja de llegar: desde ahora la mueve el empujón.
                this.tweens.killTweensOf(n.img);
                n.img.setDisplaySize(n.ancho, n.ancho);
                n.escala = n.img.scaleX;
            }
            n.libre = true;
            var e = n.escala || n.img.scaleX;
            if (!n.aplastando) {
                n.aplastando = true;
                this.tweens.add({ targets: n.img, scaleX: e * 1.12, scaleY: e * 0.88, duration: 120, yoyo: true, onComplete: function () { n.aplastando = false; n.img.setScale(e); } });
            }
            if (fuerza >= 1) U.sfx('zas');
        },

        traerNubes: function (cuantas) {
            var scene = this;
            var m = this.m();
            var s = this.sol;
            for (var i = 0; i < cuantas; i++) {
                var ancho = m.obj * U.rnd(1.6, 2.1);
                var desde = i % 2 ? m.w + ancho : -ancho;
                var img = this.add.image(desde, s.y + U.rnd(-30, 30), A().textura(this, 'nube', 256)).setDisplaySize(ancho, ancho).setDepth(13);
                var n = { img: img, ancho: ancho, vx: 0, vy: 0, libre: false, destino: { x: s.x + (i - (cuantas - 1) / 2) * ancho * 0.32, y: s.y + U.rnd(-12, 18) } };
                this.nubes.push(n);
                this.tweens.add({ targets: img, x: n.destino.x, y: n.destino.y, duration: 1400 + i * 200, ease: 'Sine.easeOut', onComplete: function () { void scene; } });
            }
        },

        moverNubes: function (dt) {
            var m = this.m();
            var scene = this;
            // Las nubes se ven grises cuando hay poca luz.
            var gris = Math.round(150 + 105 * Math.max(0, Math.min(1, this.luz)));
            var tinte = (gris << 16) | (gris << 8) | Math.min(255, gris + 10);
            this.nubes = this.nubes.filter(function (n) {
                n.img.setTint(tinte);
                if (n.libre) {
                    // Una nube empujada que casi se detiene sigue flotando despacio hacia su lado.
                    if (!n.sale && Math.abs(n.vx) < 30) n.vx = (n.vx >= 0 ? 30 : -30);
                    n.img.x += n.vx * dt;
                    n.img.y += n.vy * dt;
                    if (!n.sale) n.vx *= Math.pow(0.4, dt);
                    n.vy *= Math.pow(0.2, dt);
                    n.img.angle = Phaser.Math.Clamp(n.vx * 0.01, -8, 8);
                    if (n.img.x < -n.ancho || n.img.x > m.w + n.ancho || n.img.y < -n.ancho * 0.6) {
                        n.img.destroy();
                        return false;
                    }
                }
                return true;
            });
            // ¿El sol está tapado?
            var s = this.sol;
            if (!s) return;
            var tapado = this.nubes.some(function (n) { return Math.abs(n.img.x - s.x) < n.ancho * 0.42 && Math.abs(n.img.y - s.y) < n.ancho * 0.28; });
            this.solTapado = tapado;
            if (this.modo === 'nubes') {
                this.luzObjetivo = tapado ? 0.4 : 1;
                this.luz += (this.luzObjetivo - this.luz) * Math.min(1, dt * 2.5);
                this.organos.ojo.sueno = tapado ? Math.min(0.6, (this.organos.ojo.sueno || 0) + dt * 0.5) : Math.max(0, (this.organos.ojo.sueno || 0) - dt);
                void scene;
            }
        },

        rondaNubes: async function () {
            var scene = this;
            var m = this.m();
            this.modo = 'nubes';
            var yb = Math.max(m.h * 0.22, 160);
            var lugares = [{ x: m.w * 0.5, y: yb }, { x: m.w * 0.68, y: yb + m.h * 0.04 }, { x: m.w * 0.3, y: yb + m.h * 0.02 }];
            for (var vez = 0; vez < 3; vez++) {
                await U.tween(this, { targets: this.sol, x: lugares[vez].x, y: lugares[vez].y, duration: 900, ease: 'Sine.easeInOut' });
                this.traerNubes(2 + vez);
                await U.esperar(this, 1600);
                if (vez === 0) await this.ctx.decir({ voz: 'zoe', texto: '¡Las nubes taparon el sol y el ojo tiene sueño! Toca las nubes para apartarlas.' });
                this.pista = U.crearPista(this, 7000, function (cancelado) {
                    var n = scene.nubes.find(function (nn) { return Math.abs(nn.img.x - scene.sol.x) < nn.ancho * 0.42; });
                    if (!n) return Promise.resolve();
                    return scene.ctx.mano({ punto: { x: n.img.x, y: n.img.y }, holdMs: 300, cancelado: cancelado, onPresionar: function () { scene.empujarNube(n, n.img.x - scene.sol.x || 1, -10, 1); } });
                });
                this.pista.reiniciar();
                // Espera a que el sol quede libre de nubes un momento.
                await new Promise(function (r) {
                    var libreDesde = 0;
                    var ev = scene.time.addEvent({
                        delay: 100, loop: true, callback: function () {
                            if (!scene.solTapado) {
                                libreDesde = libreDesde || scene.time.now;
                                if (scene.time.now - libreDesde > 500) { ev.remove(); r(); }
                            } else libreDesde = 0;
                        }
                    });
                });
                this.pista.parar();
                this.ctx.quitarMano();
                await this.iluminarOjo(false);
                this.arco = (vez + 1) / 3;
                this.tweens.addCounter({ from: vez / 3, to: (vez + 1) / 3, duration: 900, onUpdate: function (tw) { scene.arco = tw.getValue(); scene.pintarArco(); } });
                var frases = ['¡El sol volvió! El ojo ve su luz.', '¡Muy bien! Con la luz del sol, el ojo ve los colores.', '¡Mira el arcoíris! Los ojos ven todos sus colores.'];
                await this.ctx.decir({ voz: vez === 1 ? 'zeus' : 'zoe', texto: frases[vez] }, { estado: 'acierto' });
                // Las nubes que quedan se van.
                this.nubes.forEach(function (n) { n.libre = true; n.sale = true; n.vx = n.img.x < scene.sol.x ? -420 : 420; });
            }
            this.modo = '';
        },

        /* ── Ronda 3: la noche ─────────────────────────────────── */

        crearCosaNoche: function (id, x, y, tam) {
            var c = this.add.container(x, y).setDepth(7);
            var img = this.add.image(0, 0, A().textura(this, id, 200)).setDisplaySize(tam, tam);
            c.add(img);
            var k = { id: id, cont: c, img: img, tam: tam, da: { farol: true, estrella: true, luciernagas: true }[id] || false };
            if (k.da) {
                k.glow = this.add.image(x, y, A().textura(this, 'humo', 128)).setTint(0xffd43b).setDisplaySize(tam * 2.8, tam * 2.8)
                    .setBlendMode(Phaser.BlendModes.ADD).setDepth(9).setAlpha(0);
            }
            if (id === 'luciernagas') {
                k.bichos = [];
                for (var i = 0; i < 5; i++) {
                    var b = this.add.circle(x, y, 3, 0xfff3a0).setDepth(10).setAlpha(0);
                    b.fase = Math.random() * 10;
                    k.bichos.push(b);
                }
            }
            return k;
        },

        rondaNoche: async function () {
            var scene = this;
            var m = this.m();
            this.modo = 'noche';
            this.nubes.forEach(function (n) { n.libre = true; n.sale = true; n.vx = n.img.x < m.w / 2 ? -420 : 420; });
            // Atardece: el sol se esconde detrás de las montañas.
            this.tweens.add({ targets: this.sol, y: m.horizonte + 60, duration: 2200, ease: 'Sine.easeIn' });
            this.tweens.add({ targets: this.organos.ojo, sueno: 0.7, duration: 2200 });
            this.tweens.addCounter({ from: this.arco, to: 0, duration: 1500, onUpdate: function (tw) { scene.arco = tw.getValue(); scene.pintarArco(); } });
            await this.ponerLuz(0.08, 2400);
            this.sol.setVisible(false);
            this.ventanaLuz.setAlpha(0.9);
            var tam = m.obj * 0.62;
            var lista = [
                ['farol', m.w * 0.16, m.orilla - tam * 0.55],
                ['estrella', m.w * 0.44, Math.max(m.h * 0.2, 140)],
                ['luciernagas', m.w * 0.64, m.orilla + tam * 0.15],
                ['campana', m.w * 0.36, m.orilla + tam * 0.1],
                ['flor', m.w * 0.52, m.orilla + tam * 0.35]
            ];
            this.cosasNoche = lista.map(function (l) { return scene.crearCosaNoche(l[0], l[1], l[2], l[0] === 'estrella' ? tam * 0.9 : tam); });
            this.encendidas = 0;
            await this.ctx.decir({ voz: 'zeus', texto: '¡Llegó la noche! Sin luz el ojo no puede ver. Toca las cosas que dan luz.' });
            this.pista = U.crearPista(this, 8000, function (cancelado) {
                var k = scene.cosasNoche.find(function (c) { return c.da && !c.encendida; });
                if (!k) return Promise.resolve();
                return scene.ctx.mano({ punto: { x: k.cont.x, y: k.cont.y }, holdMs: 400, cancelado: cancelado });
            });
            this.pista.reiniciar();
            this.esperando = true;
            this.ocupado = false;
            await new Promise(function (r) { scene.finNoche = r; });
            this.pista.parar();
            this.modo = '';
        },

        tocarNoche: async function (k) {
            var scene = this;
            this.ocupado = true;
            if (k.da) {
                k.encendida = true;
                U.sfx('magia');
                k.cont.setDepth(11);
                this.tweens.add({ targets: k.glow, alpha: 0.9, duration: 500 });
                this.tweens.add({ targets: k.cont, scale: 1.15, duration: 250, yoyo: true });
                if (k.bichos) k.bichos.forEach(function (b) { scene.tweens.add({ targets: b, alpha: 1, duration: 400 }); });
                this.encendidas += 1;
                var ojo = this.organos.ojo;
                this.tweens.add({ targets: ojo, sueno: Math.max(0, 0.7 - this.encendidas * 0.25), duration: 500 });
                ojo.parpadear();
                ojo.mirar(k.cont.x, k.cont.y);
                this.ponerLuz(0.08 + this.encendidas * 0.12, 600);
                var frases = { farol: '¡El farol da luz! Ahora el ojo ve un poquito.', estrella: '¡La estrella brilla en el cielo!', luciernagas: '¡Las luciérnagas encienden su lucecita!' };
                this.ctx.decir({ voz: 'zoe', texto: frases[k.id] }, { estado: 'acierto' });
                await U.esperar(this, 900);
                this.ocupado = false;
                if (this.encendidas >= 3 && this.finNoche) {
                    var fin = this.finNoche;
                    this.finNoche = null;
                    await ojo.reaccion('acierto');
                    await this.ctx.decir({ voz: 'zeus', texto: '¡Con luz, el ojo puede ver! Vemos con los ojos.' }, { estado: 'acierto' });
                    fin();
                }
                return;
            }
            // No da luz: suena o huele, y Zeus lo explica.
            if (k.id === 'campana') {
                var S = global.EncuentraSonidoSfx;
                if (S) S.reproducir('campana', { breve: true });
                this.tweens.add({ targets: k.cont, angle: { from: -18, to: 18 }, duration: 140, yoyo: true, repeat: 2, onComplete: function () { k.cont.angle = 0; } });
                U.notas(this, k.cont.x, k.cont.y - 20, 3, { x: this.organos.oido.cont.x, y: this.organos.oido.cont.y });
                this.organos.oido.reaccion('acierto');
                this.ctx.decir({ voz: 'zeus', texto: 'La campana suena: la escucha el oído. Pero no da luz. ¡Busca lo que brilla!' });
            } else {
                U.sfx('sorber');
                U.aroma(this, k.cont.x, k.cont.y - 20, { n: 6, hacia: { x: this.organos.nariz.cont.x, y: this.organos.nariz.cont.y } });
                this.organos.nariz.reaccion('acierto');
                this.ctx.decir({ voz: 'zeus', texto: 'La flor huele rico con la nariz, pero no da luz. ¡Busca lo que brilla!' });
            }
            await U.esperar(this, 1200);
            this.ocupado = false;
        },

        /* ── API ───────────────────────────────────────────────── */

        demo: async function () {
            var m = this.m();
            this.modo = 'demo';
            this.ponerLuz(0.7, 800);
            await B.demoTambor(this, this.fila, m.cx, m.orilla + m.obj * 0.05, m.obj * 0.8);
            this.ponerLuz(0.35, 800);
            this.modo = '';
        },

        jugar: async function () {
            await this.rondaSol();
            if (!this.ctx.vivo()) return;
            await this.rondaNubes();
            if (!this.ctx.vivo()) return;
            await this.rondaNoche();
        },

        fiestaFinal: async function () {
            var scene = this;
            var m = this.m();
            // Amanece otra vez: el sol sale con el arcoíris completo.
            (this.cosasNoche || []).forEach(function (k) {
                scene.tweens.add({ targets: [k.cont, k.glow].filter(Boolean), alpha: 0, duration: 800 });
                (k.bichos || []).forEach(function (b) { scene.tweens.add({ targets: b, alpha: 0, duration: 800 }); });
            });
            this.ventanaLuz.setAlpha(0);
            this.sol.setVisible(true).setPosition(m.cielo.x, m.horizonte + 60).setDepth(-27);
            this.tweens.add({ targets: this.sol, y: m.cielo.y, duration: 1800, ease: 'Sine.easeOut', onComplete: function () { scene.sol.setDepth(12); } });
            this.ponerLuz(1, 1800);
            this.tweens.add({ targets: this.organos.ojo, sueno: 0, duration: 800 });
            this.tweens.addCounter({ from: 0, to: 1, duration: 1800, onUpdate: function (tw) { scene.arco = tw.getValue(); scene.pintarArco(); } });
            await U.esperar(this, 1500);
            this.organos.ojo.gafas(true);
            U.sfx('celebracion');
            this.fila.orden.forEach(function (id, i) { scene.time.delayedCall(i * 120, function () { scene.organos[id].reaccion('acierto'); }); });
            U.confeti(this, 80);
            U.estallido(this, m.cielo.x, m.cielo.y, { n: 24, dist: 220, colores: [0xffe066, 0xffd43b, 0xff922b] });
            await U.esperar(this, 2000);
        },

        update: function (time, delta) {
            var dt = Math.min(delta || 16, 50) / 1000;
            var m = this.m();
            var scene = this;
            var quieto = U.reducido();
            this.velo.setSize(m.w, m.h);
            this.velo.alpha = (1 - Math.max(0, Math.min(1, this.luz))) * 0.72;
            this.estrellasCielo.alpha = Math.max(0, 1 - this.luz * 1.6);
            if (this.sol && !quieto) {
                this.sol.rayos.rotation += dt * 0.25;
                this.sol.halo.alpha = 0.45 + 0.1 * Math.sin(time / 400);
            }
            this.moverNubes(dt);
            this.dibujarRayos(time);
            // Brillos del agua.
            var b = this.brillosLago;
            b.clear();
            for (var i = 0; i < 14; i++) {
                var x = ((i * 137 + time * 0.02 * (i % 3 + 1)) % (m.w + 40)) - 20;
                var y = m.horizonte + 10 + ((i * 53) % 100) / 100 * (m.orilla - m.horizonte - 20);
                b.lineStyle(2, 0xffffff, (0.25 + 0.25 * Math.sin(time / 300 + i)) * this.luz);
                b.lineBetween(x, y, x + 18, y);
            }
            // Luciérnagas encendidas que revolotean junto al frasco.
            (this.cosasNoche || []).forEach(function (k) {
                if (!k.bichos) return;
                k.bichos.forEach(function (bb, j) {
                    var t = time / 1000 + bb.fase;
                    bb.setPosition(k.cont.x + Math.sin(t * 1.7 + j) * k.tam * 0.5, k.cont.y - k.tam * 0.2 + Math.cos(t * 1.3 + j) * k.tam * 0.4);
                    if (k.encendida) bb.alpha = 0.6 + 0.4 * Math.sin(t * 6);
                });
                if (k.encendida && k.glow) k.glow.alpha = 0.75 + 0.15 * Math.sin(time / 200);
            });
            if (this.estrellaG) void 0;
            var foco = this.sol && this.sol.visible ? { x: this.sol.x, y: this.sol.y } : null;
            if (this.arr.cont) foco = { x: this.arr.cont.x, y: this.arr.cont.y };
            this.fila.actualizar(time, foco);
            void scene;
        },

        estado: function () {
            var scene = this;
            return {
                modo: this.modo,
                luz: Math.round(this.luz * 100) / 100,
                esperando: !!this.esperando,
                ocupado: !!this.ocupado,
                tapado: !!this.solTapado,
                arco: this.arco,
                sol: this.sol ? { x: Math.round(this.sol.x), y: Math.round(this.sol.y) } : null,
                nubes: this.nubes.map(function (n) { return { x: Math.round(n.img.x), y: Math.round(n.img.y) }; }),
                noche: (this.cosasNoche || []).map(function (k) { return { id: k.id, x: Math.round(k.cont.x), y: Math.round(k.cont.y), on: !!k.encendida }; }),
                organos: this.fila.orden.reduce(function (acc, id) { acc[id] = { x: Math.round(scene.organos[id].cont.x), y: Math.round(scene.organos[id].cont.y) }; return acc; }, {})
            };
        }
    };

    global.PedniaAmanecer = B.crearMotor({ id: 'amanecer', fondo: '#3b8fe0', escena: escena });
})(typeof window !== 'undefined' ? window : this);
