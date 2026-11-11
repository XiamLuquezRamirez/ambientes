/**
 * «Pesca en el estanque» — motor propio de ¿Qué escuchaste? (3-4 años).
 *
 * En el muelle hay una caña de pescar. Mientras suena el sonido, el corcho se hunde y sube con
 * cada repique (no delata qué es). Después los objetos salen a flotar en el agua y el niño LANZA
 * el anzuelo: lo ARRASTRA hasta el que escuchó y lo suelta encima. Si es, la caña tira, el objeto
 * sale del agua con un chapuzón, suena y cae en el balde del muelle. Si no, el objeto suena con su
 * propio sonido, se sacude y el anzuelo vuelve a su sitio (sin castigo).
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var rnd = Ut.rnd;

    var escena = {
        iniciar: function () { this.cosas = []; this.anzuelo = null; this.reunidos = []; this.enBalde = []; },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.bocina = { x: W / 2, y: Math.max(60, Math.min(100, 56 + hueco * 0.2)), r: Math.max(28, Math.min(40, hueco * 0.3)) };
            L.pres = null;
            L.der = W - 16;
            L.y0 = Math.round(H * 0.42);                          // orilla: empieza el agua
            // Muelle abajo a la izquierda, con la caña y el balde.
            L.muelle = { x: 0, y: H - Math.max(70, H * 0.14), w: Math.max(150, W * 0.2) };
            L.tam = Math.max(64, Math.min(130, (L.der - L.muelle.w) / 4.2, H * 0.17));
            L.base = { x: L.muelle.w * 0.55, y: L.muelle.y - 4 };          // mango de la caña
            L.punta = { x: L.muelle.w + Math.max(40, W * 0.07), y: L.y0 - Math.max(40, H * 0.08) };
            L.casa = { x: L.punta.x + 10, y: L.y0 + Math.max(30, H * 0.06) };   // donde descansa el anzuelo
            L.balde = { x: L.muelle.w * 0.28, y: L.muelle.y - 6, w: Math.max(54, L.tam * 0.62) };
            // Fila donde flotan los objetos (a la derecha del muelle).
            L.fila = L.y0 + (H - L.y0) * 0.42;
            L.izq = L.muelle.w + L.tam * 0.55;
            L.tam = Math.max(96, Math.min(168, (L.der - L.izq) / 3.4, H * 0.22));
            // La bocina es una campana del muelle, no un botón en el cielo.
            L.bocina = { x: 52, y: L.muelle.y - 64, r: 26 };
            return L;
        },

        armar: function (reubicar) {
            var self = this;
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            var V = this.montarVida(keep);
            var orilla = Math.max(18, L.H * 0.045);
            if (V) {
                V.parque({ horizonte: L.y0 - orilla, arboles: [0.06, 0.24, 0.74, 0.93], solX: 0.85 });
                V.mariposas(2, { x: 0, y: L.y0 - orilla - 60, w: L.W, h: 40, depth: 8 });
            }
            // Orilla de pasto entre los árboles y el agua.
            var pasto = keep(this.add.graphics().setDepth(1.5));
            pasto.fillStyle(0x8ce99a, 1); pasto.fillRect(0, L.y0 - orilla - 4, L.W, orilla + 8);
            pasto.fillStyle(0x69db7c, 1); pasto.fillRect(0, L.y0 - 6, L.W, 6);
            // Agua del estanque: más clara lejos, con reflejos, juncos y nenúfares.
            K.textura(this, 'pesca_agua', L.W, L.H - L.y0 + 8, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#74c0fc'); g.addColorStop(0.5, '#4dabf7'); g.addColorStop(1, '#228be6');
                x.fillStyle = g; x.fillRect(0, 0, w, h);
                x.fillStyle = '#69db7c'; x.fillRect(0, 0, w, 7);                      // borde de pasto
                x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = 2;
                for (var i = 0; i < 26; i++) {
                    var rx = Math.random() * w, ry = 14 + Math.random() * (h - 20), rl = 14 + Math.random() * 30;
                    x.beginPath(); x.moveTo(rx, ry); x.quadraticCurveTo(rx + rl / 2, ry - 3, rx + rl, ry); x.stroke();
                }
                // Juncos en las orillas.
                [[w * 0.985, 0], [w * 0.015, 0]].forEach(function (q) {
                    for (var k = 0; k < 6; k++) {
                        var jx = q[0] + (k - 3) * 6, alto = 40 + (k % 3) * 16;
                        x.strokeStyle = '#2b8a3e'; x.lineWidth = 3;
                        x.beginPath(); x.moveTo(jx, 26); x.quadraticCurveTo(jx + 4, 26 - alto * 0.5, jx + 2, 26 - alto); x.stroke();
                    }
                });
            });
            keep(this.add.image(0, L.y0 - 4, 'pesca_agua').setOrigin(0, 0).setDepth(2));
            // Nenúfares fijos (no tapan la fila de objetos).
            [[0.62, 0.12], [0.86, 0.2], [0.42, 0.9], [0.95, 0.85]].forEach(function (q) {
                var nx = L.izq + (L.der - L.izq) * q[0], ny = L.y0 + (L.H - L.y0) * q[1];
                var n = keep(self.add.graphics().setDepth(3));
                n.fillStyle(0x51cf66, 1); n.slice(nx, ny, 22, 0.4, Math.PI * 2 - 0.1, false); n.fillPath();
                n.fillStyle(0x40c057, 1); n.fillCircle(nx + 4, ny + 2, 3);
                if (q[0] > 0.8) { n.fillStyle(0xffa8cc, 1); n.fillCircle(nx - 6, ny - 4, 6); n.fillStyle(0xfff3bf, 1); n.fillCircle(nx - 6, ny - 4, 2.5); }
            });
            if (V) V.pato(L.izq + (L.der - L.izq) * 0.7, L.y0 + 22, (L.der - L.izq) * 0.35, 0.9);
            this.sembrarMotes(keep, 16, { x: 0, y: L.y0 - 90, w: L.W, h: 80, depth: 8 }, 0xfff3bf);
            this.sembrarPeces(keep);
            this.montarMuelle(keep);
            this.ondasG = keep(this.add.graphics().setDepth(29));
            this.hilo = keep(this.add.graphics().setDepth(55));
            this.montarHud(keep);
            if (reubicar) {
                this.ubicarCosas();
                if (this.anzuelo) this.anzuelo.setPosition(L.casa.x, L.casa.y);
                this.enBalde.forEach(function (a, k) { self.meterEnBalde(a, k, false); });
            }
        },

        /** Muelle de madera con la caña clavada y el balde. */
        montarMuelle: function (keep) {
            var L = this.L, m = L.muelle;
            K.textura(this, 'pesca_muelle', m.w + 30, L.H - m.y + 10, function (x, w, h) {
                // Postes en el agua.
                x.fillStyle = '#7a4a1c';
                [w * 0.12, w * 0.55, w * 0.9].forEach(function (px) { x.fillRect(px - 7, 16, 14, h); });
                // Tablas.
                for (var i = 0; i < 4; i++) {
                    var g = x.createLinearGradient(0, i * 10, 0, i * 10 + 12);
                    g.addColorStop(0, '#e0a25a'); g.addColorStop(1, '#b97a35');
                    x.fillStyle = g; K.rr(x, 0, i * 9, w - 8 - i * 3, 12, 3); x.fill();
                    x.strokeStyle = 'rgba(80,45,15,0.35)'; x.lineWidth = 1; x.stroke();
                }
            });
            keep(this.add.image(0, m.y, 'pesca_muelle').setOrigin(0, 0).setDepth(20));
            this.cana = keep(this.add.graphics().setDepth(21));
            this.montarPescador(keep);
            // Poste de la campana (la bocina se sienta encima).
            var poste = keep(this.add.graphics().setDepth(21));
            poste.fillStyle(0x6d4c41, 1);
            poste.fillRect(L.bocina.x - 5, L.bocina.y + L.bocina.r - 4, 10, L.muelle.y - L.bocina.y);
            // Carrete (no se borra cuando la caña se dobla).
            var rx = L.base.x + (L.punta.x - L.base.x) * 0.15, ry = L.base.y + (L.punta.y - L.base.y) * 0.15;
            var carrete = keep(this.add.graphics().setDepth(21));
            carrete.fillStyle(0x495057, 1); carrete.fillCircle(rx, ry + 8, 9);
            carrete.fillStyle(0xadb5bd, 1); carrete.fillCircle(rx, ry + 8, 4);
            this.carrete = { x: rx, y: ry + 8 };
            // Balde (los pescados entran por arriba; el frente va delante).
            var b = L.balde;
            var fondo = keep(this.add.graphics().setDepth(22));
            fondo.fillStyle(0x1864ab, 1); fondo.fillEllipse(b.x, b.y - b.w * 0.62, b.w * 0.9, b.w * 0.22);
            var frente = keep(this.add.graphics().setDepth(26));
            frente.fillStyle(0x339af0, 1);
            frente.fillPoints([{ x: b.x - b.w * 0.45, y: b.y - b.w * 0.62 }, { x: b.x + b.w * 0.45, y: b.y - b.w * 0.62 },
                { x: b.x + b.w * 0.36, y: b.y }, { x: b.x - b.w * 0.36, y: b.y }], true);
            frente.fillStyle(0xffffff, 0.25); frente.fillRect(b.x - b.w * 0.34, b.y - b.w * 0.5, b.w * 0.1, b.w * 0.42);
            frente.lineStyle(3, 0x495057, 1); frente.beginPath(); frente.arc(b.x, b.y - b.w * 0.62, b.w * 0.46, Math.PI, 0); frente.strokePath();
        },

        /** Peces de fondo: no son las respuestas, solo vida en el agua. */
        sembrarPeces: function (keep) {
            var L = this.L;
            this.peces = [];
            for (var i = 0; i < 6; i++) {
                this.peces.push({
                    x: Math.random() * L.W,
                    y: L.y0 + 50 + Math.random() * Math.max(40, L.H - L.y0 - 90),
                    v: 26 + Math.random() * 36,
                    dir: Math.random() < 0.5 ? 1 : -1,
                    s: 0.7 + Math.random() * 0.7,
                    fase: Math.random() * 6
                });
            }
            this.aguaG = keep(this.add.graphics().setDepth(2.6));
        },

        /** Niño sentado en el muelle; el brazo sigue la caña. */
        montarPescador: function (keep) {
            var L = this.L, s = 1.75;
            var c = keep(this.add.container(L.base.x - 6, L.base.y + 2).setDepth(20.5));
            var g = this.add.graphics();
            g.fillStyle(0x1c7ed6, 1);
            g.fillRoundedRect(-22 * s, -8 * s, 30 * s, 16 * s, 6 * s);
            g.fillStyle(0xffc078, 1);
            g.fillCircle(-4 * s, -28 * s, 13 * s);
            g.fillStyle(0x8d5524, 1);
            g.fillEllipse(-4 * s, -38 * s, 26 * s, 14 * s);
            g.fillStyle(0x2b2b2b, 1);
            g.fillCircle(-9 * s, -28 * s, 2 * s);
            g.fillCircle(1 * s, -28 * s, 2 * s);
            g.fillStyle(0xe8590c, 1);
            g.fillRoundedRect(-16 * s, -46 * s, 24 * s, 9 * s, 3 * s);
            c.add(g);
            this.hombro = { x: L.base.x - 16 * s, y: L.base.y - 20 * s };
            this.brazo = keep(this.add.graphics().setDepth(22));
            this.pescador = c;
        },

        meterEnBalde: function (a, k, animar) {
            var b = this.L.balde;
            var esc = (b.w * 0.75) / a.tam;
            var x = b.x + ((k % 3) - 1) * b.w * 0.22, y = b.y - b.w * 0.68 - Math.floor(k / 3) * b.w * 0.12;
            a.cont.setDepth(24 - k * 0.01);
            if (!animar) { a.cont.setPosition(x, y).setScale(esc).setAngle(rnd(-15, 15)); return null; }
            return { x: x, y: y, esc: esc };
        },

        /* ── Anzuelo con corcho ── */

        crearAnzuelo: function () {
            var L = this.L;
            if (this.anzuelo) this.anzuelo.destroy();
            var a = this.add.container(L.casa.x, L.casa.y).setDepth(56);
            var k = Math.max(0.8, Math.min(1.3, L.tam / 100));
            var corcho = this.add.container(0, -26 * k);
            corcho.add([
                this.add.ellipse(0, 4 * k, 22 * k, 14 * k, 0xffffff).setStrokeStyle(2, 0x495057),
                this.add.ellipse(0, -3 * k, 22 * k, 14 * k, 0xfa5252).setStrokeStyle(2, 0x495057),
                this.add.rectangle(0, -12 * k, 3, 8 * k, 0x495057)
            ]);
            var gancho = this.add.graphics();
            gancho.lineStyle(3, 0x868e96, 1);
            gancho.beginPath(); gancho.moveTo(0, -18 * k); gancho.lineTo(0, 4 * k); gancho.arc(-6 * k, 4 * k, 6 * k, 0, Math.PI, false); gancho.strokePath();
            gancho.fillStyle(0x868e96, 1); gancho.fillTriangle(-12 * k, 4 * k, -14 * k, -2 * k, -9 * k, 0);
            // Zona invisible más grande para agarrarlo con el dedo.
            var zona = this.add.circle(0, -10 * k, 34 * k, 0xffffff, 0.001);
            a.add([zona, corcho, gancho]);
            a.corcho = corcho;
            a.k = k;
            a.libre = false;
            this.anzuelo = a;
            return a;
        },

        alSonar: function () {
            var a = this.anzuelo;
            if (!a) return;
            // Cada repique: el corcho se hunde y sube, y deja ondas.
            this.tweens.add({ targets: a.corcho, y: a.corcho.y + 10 * a.k, duration: 160, yoyo: true, ease: 'Quad.easeOut' });
            this.ondaEn = { x: a.x, y: a.y, t: this.time.now };
            var L = this.L;
            this.salpicar(L.izq + Math.random() * (L.der - L.izq), L.y0 + 30 + Math.random() * (L.H - L.y0) * 0.45, 5);
            K.ruido({ f: 500, q: 0.8, dur: 0.25, vol: 0.03 });
        },

        /* ── Objetos que flotan en el agua ── */

        lugares: function (n) {
            var L = this.L, out = [];
            var x0 = L.punta.x + L.tam * 0.35;
            var x1 = Math.min(L.der - L.tam * 0.45, x0 + L.tam * n * 1.15);
            if (x1 - x0 < L.tam * n * 0.8) x0 = Math.max(L.izq, x1 - L.tam * n * 1.05);
            for (var i = 0; i < n; i++) {
                var t = n === 1 ? 0.5 : i / (n - 1);
                out.push({ x: x0 + (x1 - x0) * t, y: L.fila + Math.sin(t * Math.PI) * -((L.H - L.y0) * 0.06) });
            }
            return out;
        },

        ubicarCosas: function () {
            var lug = this.lugares(this.cosas.length);
            this.cosas.forEach(function (a, i) { a.cont.setPosition(lug[i].x, lug[i].y); a.casa = lug[i]; });
        },

        prepararNivel: async function () {
            var self = this;
            await Promise.all(this.cosas.map(function (a) { return tw(self, { targets: a.cont, alpha: 0, y: a.cont.y + 30, duration: 250 }).then(function () { a.destruir(); }); }));
            this.cosas = [];
            this.crearAnzuelo();
        },

        mostrarOpciones: async function (nv) {
            var self = this;
            var L = this.L;
            var lug = this.lugares(nv.opciones.length);
            var tam = Math.min(L.tam, (L.der - L.izq) / nv.opciones.length * 0.85);
            this.cosas = nv.opciones.map(function (id, i) {
                var a = self.crearCosa(id, lug[i].x, lug[i].y + 50, tam, { depth: 30 });
                a.casa = lug[i];
                a.cont.setAlpha(0);
                a.fase = Math.random() * 6;
                return a;
            });
            // Suben del fondo del estanque con un borbotón.
            await Promise.all(this.cosas.map(function (a, i) {
                return esperar(self, i * 140).then(function () {
                    K.ruido({ f: 700, q: 1.2, dur: 0.12, vol: 0.05 });
                    self.salpicar(a.casa.x, a.casa.y + a.tam * 0.3, 6);
                    return tw(self, { targets: a.cont, alpha: 1, y: a.casa.y, duration: 420, ease: 'Back.easeOut' });
                });
            }));
            if (this.anzuelo) this.anzuelo.libre = true;
        },

        cosaBajo: function (x, y) {
            var mejor = null, dmin = this.L.tam * 0.7;
            this.cosas.forEach(function (a) {
                var d = Math.hypot(x - a.cont.x, y - a.cont.y);
                if (d < dmin) { dmin = d; mejor = a; }
            });
            return mejor;
        },

        salpicar: function (x, y, n) {
            Ut.estallido(this, x, y, { n: n || 8, tex: 'gota', tam: 14, dist: 60, angulo: -Math.PI / 2, abanico: Math.PI * 0.9, gravedad: 30, colores: [0xd0ebff, 0xffffff, 0xa5d8ff], depth: 58 });
        },

        /* ── Gesto: lanzar el anzuelo arrastrándolo hasta el objeto ── */

        alTocar: function (p) {
            var a = this.anzuelo;
            if (this.fase !== 'jugar' || !a || !a.libre) return;
            if (Math.hypot(p.x - a.x, p.y - (a.y - 10 * a.k)) < 44 * a.k) {
                this.arrastrando = { dx: a.x - p.x, dy: a.y - p.y };
                a.libre = false;
                this.tweens.killTweensOf(a);
                K.tono({ f: 700, f2: 900, dur: 0.06, vol: 0.04 });
                this.zumbido = this.time.now;
                this.pista.reiniciar();
                return;
            }
            // Tocar un objeto que flota lo hace sonar (para comparar), sin contar como error.
            var c = this.cosaBajo(p.x, p.y);
            if (c && !this.sonando) { this.sonar(c.id, { breve: true, bocina: false }); c.saltito(0.08, 1); }
        },

        alMover: function (p) {
            var r = this.arrastrando, a = this.anzuelo;
            if (!r || !a) return;
            a.setPosition(p.x + r.dx, Math.max(this.L.y0 - 30, p.y + r.dy));
            // Carrete que suena mientras se suelta hilo.
            if (this.time.now - (this.zumbido || 0) > 90) { this.zumbido = this.time.now; K.ruido({ f: 3200, q: 4, dur: 0.03, vol: 0.015 }); }
            var c = this.cosaBajo(a.x, a.y);
            if (c !== this.apuntado) {
                if (this.apuntado) this.tweens.add({ targets: this.apuntado.cont, scale: 1, duration: 120 });
                if (c) this.tweens.add({ targets: c.cont, scale: 1.12, duration: 120 });
                this.apuntado = c;
            }
        },

        alSoltar: async function () {
            if (!this.arrastrando) return;
            this.arrastrando = null;
            var a = this.anzuelo;
            if (this.apuntado) this.tweens.add({ targets: this.apuntado.cont, scale: 1, duration: 120 });
            var c = this.apuntado;
            this.apuntado = null;
            if (!a) return;
            if (!c || this.fase !== 'jugar') { this.volverAnzuelo(); return; }
            // El anzuelo cae en el agua junto al objeto y lo engancha.
            K.tono({ f: 500, f2: 260, dur: 0.1, vol: 0.05 });
            this.salpicar(a.x, a.y, 5);
            this.tocado = c;
            var ok = await this.elegir(c.id, { x: c.cont.x, y: c.cont.y - c.tam * 0.4 });
            if (ok === false) this.volverAnzuelo(true);
        },

        volverAnzuelo: function (soltado) {
            var a = this.anzuelo, L = this.L;
            if (!a) return;
            if (soltado) K.tono({ f: 300, f2: 180, dur: 0.18, vol: 0.06 });
            // Se recoge el hilo: el anzuelo vuelve a su sitio frente a la caña.
            tw(this, { targets: a, x: L.casa.x, y: L.casa.y, duration: soltado ? 700 : 450, ease: 'Sine.easeInOut' }).then(function () { a.libre = true; });
        },

        /* ── Respuestas ── */

        alAcertar: async function (ids) {
            var self = this;
            var c = this.tocado || this.cosas.filter(function (q) { return q.id === ids[0]; })[0];
            var a = this.anzuelo, L = this.L;
            this.reunidos.push(c.id);
            if (a) {
                // ¡Picó! La caña tira: el objeto sale del agua con un chapuzón y vuela al balde.
                a.libre = false;
                a.setPosition(c.cont.x, c.cont.y - c.tam * 0.35);
                this.tweens.add({ targets: c.cont, angle: { from: -10, to: 10 }, duration: 90, yoyo: true, repeat: 3 });
                await esperar(this, 360);
                K.ruido({ f: 600, q: 0.7, dur: 0.35, vol: 0.08 });
                this.salpicar(c.cont.x, c.cont.y + c.tam * 0.2, 14);
                this.cosas = this.cosas.filter(function (q) { return q !== c; });
                var son = this.sonar(c.id, { bocina: false });
                var x0 = c.cont.x, y0 = c.cont.y;
                var k = this.enBalde.length;
                var dest = this.meterEnBalde(c, k, true);
                var cima = Math.min(y0, dest.y) - L.tam * 1.2;
                var o = { t: 0 };
                var esc0 = c.cont.scale;
                await tw(this, {
                    targets: o, t: 1, duration: 900, ease: 'Sine.easeInOut',
                    onUpdate: function () {
                        var t = o.t, u = 1 - t;
                        var x = u * u * x0 + 2 * u * t * ((x0 + dest.x) / 2) + t * t * dest.x;
                        var y = u * u * y0 + 2 * u * t * cima + t * t * dest.y;
                        c.cont.setPosition(x, y).setScale(esc0 + (dest.esc - esc0) * t).setAngle(t * 360);
                        if (self.anzuelo) self.anzuelo.setPosition(x, y - c.tam * 0.35 * c.cont.scale / esc0);
                    }
                });
                c.cont.setAngle(rnd(-15, 15)).setDepth(24 - k * 0.01);
                this.enBalde.push(c);
                K.ruido({ f: 900, q: 1.4, dur: 0.12, vol: 0.06 });
                await son;
                if (this.anzuelo) {
                    this.anzuelo.libre = false;
                    tw(this, { targets: this.anzuelo, x: L.casa.x, y: L.casa.y, duration: 480, ease: 'Sine.easeInOut' });
                }
            } else {
                await this.sonar(c.id, { bocina: false });
            }
        },

        alFallar: async function () {
            var c = this.tocado;
            if (!c) return;
            // No pica: el objeto se sacude y se hunde un poquito.
            await c.sacudir();
            this.salpicar(c.cont.x, c.cont.y + c.tam * 0.2, 4);
        },

        alTerminarNivel: async function () {
            var self = this;
            await Promise.all(this.cosas.map(function (a, i) {
                return esperar(self, i * 80).then(function () { return tw(self, { targets: a.cont, alpha: 0, y: a.cont.y + 30, duration: 260 }); });
            }));
        },

        mostrarPista: function (cancelada) {
            var self = this;
            var a = this.anzuelo;
            if (!a || !a.libre || this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            var no = function () { return cancelada() || self.fase !== 'jugar' || !!self.arrastrando; };
            if (this.ayuda) {
                var ok = this.cosas.filter(function (c) { return self.respuestas().indexOf(c.id) >= 0; })[0];
                if (ok) return this.ctx.mano({ punto: { x: a.x, y: a.y }, holdMs: 200, arrastre: { dx: ok.cont.x - a.x, dy: ok.cont.y - a.y, durMs: 900 }, cancelado: no });
            }
            this.tweens.add({ targets: a.corcho, y: a.corcho.y - 8, duration: 200, yoyo: true, repeat: 2 });
            return this.ctx.mano({ punto: { x: a.x, y: a.y }, holdMs: 500, cancelado: no });
        },

        /* ── Escena final: lo que pescó salta del balde como peces, uno a uno, y suena ── */

        escenaFinal: async function () {
            var self = this;
            var L = this.L;
            await this.alTerminarNivel();
            if (this.anzuelo) { this.anzuelo.destroy(); this.anzuelo = null; }
            var lista = this.enBalde.slice();
            var n = lista.length;
            var ancho = L.der - L.izq;
            for (var i = 0; i < n; i++) {
                (function (c, k) {
                    self.time.delayedCall(k * 650, async function () {
                        if (!c.cont.active) return;
                        // Salta del balde, cae al agua con chapuzón y vuelve a saltar alto sonando.
                        var x1 = L.izq + ancho * (k + 0.5) / n;
                        var y1 = L.fila;
                        var x0 = c.cont.x, y0 = c.cont.y, cima = L.y0 - L.tam * 0.6, o = { t: 0 };
                        var esc0 = c.cont.scale, esc1 = Math.min(L.tam, ancho / n * 0.8) / c.tam;
                        await tw(self, {
                            targets: o, t: 1, duration: 900, ease: 'Sine.easeInOut',
                            onUpdate: function () {
                                var t = o.t, u = 1 - t;
                                c.cont.setPosition(u * u * x0 + 2 * u * t * ((x0 + x1) / 2) + t * t * x1, u * u * y0 + 2 * u * t * cima + t * t * y1)
                                    .setScale(esc0 + (esc1 - esc0) * t).setAngle(-t * 360);
                            }
                        });
                        c.cont.setDepth(30).setAngle(0);
                        self.salpicar(x1, y1 + c.tam * esc1 * 0.25, 12);
                        K.ruido({ f: 600, q: 0.7, dur: 0.3, vol: 0.07 });
                        self.sonar(c.id, { breve: true, bocina: false });
                        self.tweens.add({ targets: c.cont, y: y1 - L.tam * 0.5, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeOut', delay: 300 });
                    });
                })(lista[i], i);
            }
            await esperar(this, 1400 + n * 650);
            Ut.estallido(this, L.W / 2, L.y0, { n: 18, tex: 'estrella', tam: 26, dist: 180, sinTinte: true, depth: 75 });
            await esperar(this, 1200);
        },

        /** Demo: la mano lleva el anzuelo hasta el que sonó. */
        demoPaso: function () {
            var self = this;
            var c = this.correctaDe(this.cosas), a = this.anzuelo;
            if (!c || !a) return null;
            return {
                desde: { x: a.x, y: a.y }, hasta: { x: c.cont.x, y: c.cont.y },
                hacer: async function () {
                    a.libre = false;
                    self.arrastrando = { dx: 0, dy: 0 };
                    await tw(self, { targets: a, x: c.cont.x, y: c.cont.y, duration: 400 });
                    self.apuntado = c;
                    await self.alSoltar();
                }
            };
        },

        /** Igual que el del kit, y además lo pescado en el ejemplo no queda en el balde. */
        salirDemo: function () {
            if (this.ctx.quitarMano) this.ctx.quitarMano();
            this.fase = 'intro';
            this.nv = null;
            this.marcadas = [];
            this.paso = 0;
            this.errores = 0;
            this.arrastrando = null;
            this.pista.parar();
            this.reunidos = [];
            (this.enBalde || []).forEach(function (c) { c.destruir(); });
            this.enBalde = [];
        },

        estadoExtra: function () {
            var a = this.anzuelo;
            return {
                anzuelo: a ? { x: Math.round(a.x), y: Math.round(a.y), libre: !!a.libre } : null,
                cosas: this.cosas.map(function (c) { return { id: c.id, x: Math.round(c.cont.x), y: Math.round(c.cont.y) }; }),
                balde: this.enBalde.length
            };
        },

        paso: function (time) {
            var L = this.L, a = this.anzuelo;
            this.dibujarAgua(time);
            this.dibujarCana(a);
            // Los objetos flotan meciéndose.
            this.cosas.forEach(function (c) {
                if (!c.casa || c === (this.tocado && this.fase !== 'jugar' ? this.tocado : null)) return;
                if (this.tweens.isTweening(c.cont)) return;
                c.fase += 0.02;
                c.cont.y = c.casa.y + Math.sin(c.fase) * 4;
                c.cont.angle = Math.sin(c.fase * 0.8) * 4;
            }, this);
            // Anzuelo quieto: el corcho cabecea en el agua.
            if (a && a.libre && !this.arrastrando) a.y = L.casa.y + Math.sin(time / 500) * 3;
            // Hilo: de la punta de la caña al anzuelo, con una pequeña panza.
            var g = this.hilo;
            if (g) {
                g.clear();
                if (a) {
                    var hx = a.x, hy = a.y - 26 * a.k - 10 * a.k;
                    var punta = this.puntaViva || L.punta;
                    var mx = (punta.x + hx) / 2, my = Math.max(punta.y, hy) + 18;
                    g.lineStyle(1.6, 0xf8f9fa, 0.9);
                    g.beginPath(); g.moveTo(punta.x, punta.y);
                    for (var i = 1; i <= 16; i++) {
                        var t = i / 16, u = 1 - t;
                        g.lineTo(u * u * punta.x + 2 * u * t * mx + t * t * hx, u * u * punta.y + 2 * u * t * my + t * t * hy);
                    }
                    g.strokePath();
                }
            }
            // Ondas donde cabecea el corcho.
            var o = this.ondasG;
            if (o) {
                o.clear();
                if (a && !this.arrastrando) {
                    var base = this.ondaEn && time - this.ondaEn.t < 1200 ? 1 : 0.4;
                    for (var k = 0; k < 2; k++) {
                        var f = ((time / 1100) + k / 2) % 1;
                        o.lineStyle(2, 0xffffff, base * 0.7 * (1 - f));
                        o.strokeEllipse(a.x, a.y + 2, 20 + f * 46, 6 + f * 12);
                    }
                }
            }
        },

        dibujarCana: function (a) {
            var g = this.cana, L = this.L, br = this.brazo;
            if (!g) return;
            g.clear();
            var x0 = L.base.x, y0 = L.base.y - 6;
            var x2 = L.punta.x, y2 = L.punta.y;
            if (a) {
                var tiron = Math.min(36, Math.max(0, a.x - L.punta.x) * 0.04 + Math.max(0, a.y - L.y0) * 0.02);
                x2 = L.punta.x + (a.x - L.punta.x) * 0.06;
                y2 = L.punta.y + tiron;
            }
            this.puntaViva = { x: x2, y: y2 };
            var mx = (x0 + x2) / 2 - 10, my = (y0 + y2) / 2 - 16;
            g.lineStyle(7, 0x8b5a2b, 1);
            g.beginPath();
            g.moveTo(x0, y0);
            for (var i = 1; i <= 10; i++) {
                var t = i / 10, u = 1 - t;
                g.lineTo(u * u * x0 + 2 * u * t * mx + t * t * x2, u * u * y0 + 2 * u * t * my + t * t * y2);
            }
            g.strokePath();
            if (!br) return;
            br.clear();
            br.lineStyle(7, 0xffc078, 1);
            br.beginPath();
            var h = this.hombro || { x: L.base.x - 14, y: L.base.y - 22 };
            br.moveTo(h.x, h.y);
            br.lineTo(x0 + 6, y0 + 2);
            br.strokePath();
        },

        dibujarAgua: function (time) {
            var g = this.aguaG, L = this.L;
            if (!g) return;
            g.clear();
            var h = L.H - L.y0;
            for (var w = 0; w < 4; w++) {
                var y = L.y0 + 18 + w * (h / 5);
                g.lineStyle(2, 0xffffff, 0.18 - w * 0.03);
                g.beginPath();
                g.moveTo(0, y);
                for (var x = 0; x <= L.W; x += 16) {
                    g.lineTo(x, y + Math.sin(x / 48 + time / (700 + w * 180)) * (4 + w));
                }
                g.strokePath();
            }
            (this.peces || []).forEach(function (p) {
                p.fase += 0.05;
                p.x += p.dir * p.v * 0.016;
                if (p.x < -30) p.x = L.W + 20;
                if (p.x > L.W + 30) p.x = -20;
                var s = p.s;
                g.fillStyle(0x1864ab, 0.45);
                g.fillEllipse(p.x, p.y + Math.sin(p.fase) * 3, 28 * s, 12 * s);
                g.fillTriangle(
                    p.x - p.dir * 14 * s, p.y,
                    p.x - p.dir * 26 * s, p.y - 7 * s,
                    p.x - p.dir * 26 * s, p.y + 7 * s
                );
            });
        }
    };

    K.crear({ id: 'pesca', fondo: '#a5d8ff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
