/**
 * «La bóveda del archivo» — motor propio de El gran desafío de memoria (5-6 años).
 * La rueda de la bóveda gira un clic con cada sonido (no se ve qué suena). Tres cerraduras:
 *   1) el niño ARRASTRA al buzón de la bóveda todos los que escuchó;
 *   2) pone el que sonó PRIMERO en la placa de la bandera verde;
 *   3) pone el que sonó AL FINAL en la placa de la bandera a cuadros.
 * Con las tres luces verdes la bóveda se abre.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    var escena = {
        iniciar: function () { this.cosas = []; this.dentro = []; this.puestos = []; this.reunidos = []; this.giro = 0; },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.bocina = { x: W / 2, y: Math.max(60, Math.min(100, 56 + hueco * 0.2)), r: Math.max(28, Math.min(40, hueco * 0.3)) };
            L.pres = W >= 760 ? { x: W - 72, piso: H - 104, alto: Math.min(160, H * 0.28), modelo: 'nino' } : null;
            L.der = L.pres ? W - 150 : W - 16;
            L.mesa = Math.round(H * 0.68);
            var r = Math.min(L.der * 0.26, H * 0.15);
            L.puerta = { x: L.der / 2 + 8, y: L.bocina.y + L.bocina.r + r * 1.25 + 34, r: r };   // las luces de arriba no tocan la bocina
            L.buzon = { x: L.puerta.x, y: L.puerta.y + r + 30, w: r * 1.3, h: 22 };
            L.placaIni = { x: L.puerta.x - r * 1.55, y: L.puerta.y + r * 0.35, s: Math.min(r * 0.85, (L.der / 2 - r) * 0.9) };
            L.placaFin = { x: L.puerta.x + r * 1.55, y: L.puerta.y + r * 0.35, s: L.placaIni.s };
            L.tam = Math.max(54, Math.min(100, (L.der - 30) / 4.6, H * 0.12));
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            K.textura(this, 'boveda_sala', L.W, L.H, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, L.mesa);
                g.addColorStop(0, '#343a40'); g.addColorStop(1, '#212529');
                x.fillStyle = g; x.fillRect(0, 0, w, L.mesa);
                // Paredes de acero remachadas.
                x.strokeStyle = 'rgba(255,255,255,0.06)'; x.lineWidth = 2;
                for (var yy = 40; yy < L.mesa; yy += 60) { x.beginPath(); x.moveTo(0, yy); x.lineTo(w, yy); x.stroke(); }
                x.fillStyle = 'rgba(255,255,255,0.12)';
                for (var ry = 40; ry < L.mesa; ry += 60) for (var rx = 20; rx < w; rx += 60) { x.beginPath(); x.arc(rx, ry, 2.5, 0, Math.PI * 2); x.fill(); }
                K.madera(x, 0, L.mesa, w, h - L.mesa, { r: 0, claro: '#9c6b30', medio: '#7a4f22', oscuro: '#5c3613' });
            });
            keep(this.add.image(0, 0, 'boveda_sala').setOrigin(0, 0).setDepth(0));
            this.montarPuerta(keep);
            this.montarHud(keep);
            if (reubicar) this.ubicarCosas();
        },

        montarPuerta: function (keep) {
            var L = this.L, Pt = L.puerta, r = Pt.r;
            var marco = keep(this.add.graphics().setDepth(6));
            marco.fillStyle(0x495057, 1); marco.fillCircle(Pt.x, Pt.y, r * 1.18);
            marco.fillStyle(0x0b1a3a, 1); marco.fillCircle(Pt.x, Pt.y, r * 1.02);   // interior (se ve al abrir)
            this.interior = keep(this.add.circle(Pt.x, Pt.y, r, 0xffe066, 0).setDepth(6.5));
            var puerta = keep(this.add.container(Pt.x, Pt.y).setDepth(7));
            var pg = this.add.graphics();
            pg.fillStyle(0xadb5bd, 1); pg.fillCircle(0, 0, r);
            pg.lineStyle(6, 0x868e96, 1); pg.strokeCircle(0, 0, r * 0.82);
            for (var k = 0; k < 12; k++) { var a = k * Math.PI / 6; pg.fillStyle(0x868e96, 1); pg.fillCircle(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92, 4); }
            puerta.add(pg);
            var rueda = this.add.container(0, 0);
            var rg = this.add.graphics();
            rg.lineStyle(8, 0x495057, 1); rg.strokeCircle(0, 0, r * 0.42);
            for (var e = 0; e < 4; e++) { var b = e * Math.PI / 2; rg.lineBetween(0, 0, Math.cos(b) * r * 0.55, Math.sin(b) * r * 0.55); }
            rg.fillStyle(0xfab005, 1); rg.fillCircle(0, 0, r * 0.12);
            rueda.add(rg);
            puerta.add(rueda);
            this.puerta = puerta; this.rueda = rueda;
            // Tres luces de cerradura.
            this.luces = [0, 1, 2].map(function (i) {
                var a = -Math.PI / 2 + (i - 1) * 0.55;
                return keep(this.add.circle(Pt.x + Math.cos(a) * r * 1.12, Pt.y + Math.sin(a) * r * 1.12 - 6, 9, 0xe03131).setStrokeStyle(2, 0xffffff).setDepth(8));
            }, this);
            // Buzón y las dos placas (bandera verde = primero, a cuadros = último).
            var B = L.buzon;
            var bg = keep(this.add.graphics().setDepth(6));
            bg.fillStyle(0x212529, 1); bg.fillRoundedRect(B.x - B.w / 2, B.y - B.h / 2, B.w, B.h, 6);
            bg.lineStyle(3, 0xfab005, 1); bg.strokeRoundedRect(B.x - B.w / 2, B.y - B.h / 2, B.w, B.h, 6);
            this.placas = [L.placaIni, L.placaFin].map(function (Q, i) {
                var g = keep(this.add.graphics().setDepth(6));
                g.fillStyle(0x495057, 1); g.fillRoundedRect(Q.x - Q.s / 2, Q.y - Q.s / 2, Q.s, Q.s, 10);
                g.lineStyle(3, 0xfab005, 1); g.strokeRoundedRect(Q.x - Q.s / 2, Q.y - Q.s / 2, Q.s, Q.s, 10);
                // Banderita arriba de la placa.
                var fx = Q.x - Q.s * 0.3, fy = Q.y - Q.s / 2 - 6;
                g.lineStyle(3, 0xdee2e6, 1); g.lineBetween(fx, fy, fx, fy - Q.s * 0.45);
                if (i === 0) { g.fillStyle(0x40c057, 1); g.fillTriangle(fx, fy - Q.s * 0.45, fx + Q.s * 0.4, fy - Q.s * 0.35, fx, fy - Q.s * 0.25); }
                else {
                    var c = Q.s * 0.1;
                    for (var yy = 0; yy < 2; yy++) for (var xx = 0; xx < 4; xx++) { g.fillStyle((xx + yy) % 2 ? 0x212529 : 0xffffff, 1); g.fillRect(fx + xx * c, fy - Q.s * 0.45 + yy * c, c, c); }
                }
                var marcaActiva = keep(this.add.rectangle(Q.x, Q.y, Q.s + 8, Q.s + 8, 0xffe066, 0).setStrokeStyle(4, 0xffe066, 0).setDepth(5));
                return { x: Q.x, y: Q.y, s: Q.s, marca: marcaActiva };
            }, this);
        },

        luz: function (i, si) { this.luces[i].setFillStyle(si ? 0x40c057 : 0xe03131); if (si) this.tweens.add({ targets: this.luces[i], scale: 1.6, duration: 160, yoyo: true }); },

        /** La rueda gira un clic con cada sonido. */
        alSonar: function () {
            this.giro += 45;
            this.tweens.add({ targets: this.rueda, angle: this.giro, duration: 380, ease: 'Back.easeOut' });
            K.ruido({ f: 2600, q: 3, dur: 0.05, vol: 0.08 });
            this.tweens.add({ targets: this.interior, fillAlpha: 0.25, duration: 150, yoyo: true });
        },

        lugares: function (n) {
            var L = this.L;
            var porFila = n > 4 ? Math.ceil(n / 2) : n;
            var filas = Math.ceil(n / porFila);
            var out = [];
            for (var i = 0; i < n; i++) {
                var f = Math.floor(i / porFila), k = i % porFila;
                var enFila = f === filas - 1 ? n - f * porFila : porFila;
                out.push({ x: 16 + (L.der - 32) * (k + 0.5) / enFila, y: L.mesa + (L.H - L.mesa) * (filas === 1 ? 0.45 : 0.27 + f * 0.43) });
            }
            return out;
        },

        ubicarCosas: function () {
            var lug = this.lugares(this.cosas.length);
            this.cosas.forEach(function (a, i) { a.casa = lug[i]; if (!a.usada) a.cont.setPosition(lug[i].x, lug[i].y); });
        },

        tamDe: function (n) {
            var porFila = n > 4 ? Math.ceil(n / 2) : n;
            return Math.min(this.L.tam, (this.L.der - 32) / porFila * 0.82);
        },

        prepararNivel: async function () {
            var self = this;
            await this.retirar(this.cosas.concat(this.dentro, this.puestos));
            this.cosas = []; this.dentro = []; this.puestos = [];
            [0, 1, 2].forEach(function (i) { self.luz(i, false); });
            this.placas.forEach(function (p) { p.marca.setStrokeStyle(4, 0xffe066, 0); });
            this.interior.setFillStyle(0xffe066, 0);
            await tw(this, { targets: this.puerta, scaleX: 1, duration: 300 });
        },

        mostrarOpciones: async function (nv) {
            var n = nv.opciones.length;
            this.cosas = await this.filaDeCosas(nv.opciones, this.lugares(n), this.tamDe(n), { depth: 30 });
            this.marcarDestino();
        },

        /** Resalta dónde va lo que se arrastra en este paso. */
        marcarDestino: function () {
            var self = this;
            this.placas.forEach(function (p, i) {
                var activa = self.paso === i + 1;
                p.marca.setStrokeStyle(4, 0xffe066, activa ? 1 : 0);
                if (activa) self.tweens.add({ targets: p.marca, scale: 1.08, duration: 400, yoyo: true, repeat: 2 });
            });
        },

        destino: function () {
            var L = this.L;
            if (this.paso === 0) return { x: L.buzon.x, y: L.buzon.y, r: L.puerta.r * 1.1 };
            var p = this.placas[this.paso - 1];
            return { x: p.x, y: p.y, r: p.s * 0.9 };
        },

        alTocar: function (p) {
            if (this.fase !== 'jugar') return;
            if (!this.tomar(p, this.cosas)) {
                var b = this.cosaEn(this.cosas, p.x, p.y);
                if (b && !this.sonando) this.sonar(b.id, { breve: true, bocina: false });
            }
        },
        alMover: function (p) { this.llevar(p); },

        alSoltar: async function () {
            var a = this.soltar();
            if (!a) return;
            var d = this.destino();
            if (Math.hypot(a.cont.x - d.x, a.cont.y - d.y) > d.r || this.fase !== 'jugar') { this.aCasa(a); return; }
            this.tocado = a;
            if (this.paso === 0) {
                var r = await this.marcar(a.id, d);
                if (r === 'mal') this.aCasa(a, true);
                else if (r === 'repetido') this.aCasa(a);
                else if (r === 'bien') this.meter(a);
                return;
            }
            var ok = await this.elegir(a.id, d);
            if (ok === false) this.aCasa(a, true);
        },

        /** Entra por el buzón de la bóveda. */
        meter: async function (a) {
            var B = this.L.buzon;
            if (a.usada) return;
            a.usada = true;
            this.dentro.push(a);
            await tw(this, { targets: a.cont, x: B.x, y: B.y, scale: 0.15, alpha: 0.2, duration: 300, ease: 'Quad.easeIn' });
            a.cont.setVisible(false);
            K.ruido({ f: 700, q: 2, dur: 0.08, vol: 0.08 });
        },

        alAcertar: async function () {
            var a = this.tocado;
            var self = this;
            if (this.paso === 0) {
                if (a) await this.meter(a);
                this.luz(0, true);
                return;
            }
            var p = this.placas[this.paso - 1];
            a.usada = true;
            this.puestos.push(a);
            await tw(this, { targets: a.cont, x: p.x, y: p.y, scale: p.s * 0.82 / a.tam, duration: 260 });
            a.sombra.setVisible(false);
            this.luz(this.paso, true);
            await Promise.all([this.sonar(a.id, { breve: true, bocina: false }), a.saltito(0.15, 1)]);
            if (this.paso === 2) {
                // Tres luces verdes: la rueda gira y la bóveda se entreabre; suena la secuencia entera.
                this.giro += 360;
                await tw(this, { targets: this.rueda, angle: this.giro, duration: 700, ease: 'Sine.easeInOut' });
                this.tweens.add({ targets: this.interior, fillAlpha: 0.7, duration: 400 });
                await tw(this, { targets: this.puerta, scaleX: 0.25, duration: 500, ease: 'Back.easeOut' });
                var seq = this.nv.reproducciones[0];
                for (var k = 0; k < seq.length; k++) {
                    this.reunidos.push(seq[k]);
                    Ut.estallido(this, this.L.puerta.x, this.L.puerta.y, { n: 4, tex: 'estrella', tam: 18, dist: 60, sinTinte: true, depth: 9 });
                    await this.sonar(seq[k], { breve: true, bocina: false });
                }
                await tw(this, { targets: this.puerta, scaleX: 1, duration: 400 });
            }
        },

        /** Paso siguiente: vuelven a la mesa los que estaban en la bóveda (para elegir primero / último). */
        alPaso: async function (paso) {
            var self = this;
            if (paso === 1) {
                await this.retirar(this.cosas.filter(function (a) { return !a.usada; }));
                this.dentro.forEach(function (a) { a.destruir(); });
                this.dentro = [];
                var ids = Ut.mezclar(this.nv.correctas.slice());
                this.cosas = await this.filaDeCosas(ids, this.lugares(ids.length), this.tamDe(ids.length), { depth: 30 });
            }
            this.marcarDestino();
        },

        alFallar: async function () { if (this.tocado) await this.tocado.sacudir(); },

        alTerminarNivel: async function () {
            await this.retirar(this.cosas.filter(function (a) { return !a.usada; }).concat(this.puestos));
            this.cosas = []; this.puestos = [];
            this.placas.forEach(function (p) { p.marca.setStrokeStyle(4, 0xffe066, 0); });
        },

        mostrarPista: function (cancelada) {
            var d = this.destino();
            return this.pistaArrastre(cancelada, this.cosas, d);
        },

        /* ── Escena final: la bóveda se abre del todo ── */

        escenaFinal: async function () {
            var self = this;
            var L = this.L, Pt = L.puerta;
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; });
            [0, 1, 2].forEach(function (i) { self.luz(i, true); });
            this.giro += 720;
            await tw(this, { targets: this.rueda, angle: this.giro, duration: 1000, ease: 'Sine.easeInOut' });
            this.tweens.add({ targets: this.interior, fillAlpha: 0.9, duration: 500 });
            await tw(this, { targets: this.puerta, scaleX: 0.05, x: Pt.x - Pt.r * 0.95, duration: 700, ease: 'Sine.easeInOut' });
            // De la bóveda sale el tesoro: todos los sonidos que guardó, en abanico.
            var n = ids.length;
            for (var i = 0; i < n; i++) {
                var a = this.crearCosa(ids[i], Pt.x, Pt.y, Math.min(L.tam * 0.8, Pt.r * 0.9), { sinSombra: true, depth: 60 });
                a.cont.setScale(0.2);
                var ang = Math.PI + (i + 0.5) / n * Math.PI;
                var x = Pt.x + Math.cos(ang) * Pt.r * 2.1, y = Pt.y + Pt.r * 0.6 + Math.sin(ang) * -Pt.r * 0.2 + Pt.r * 1.2;
                this.saltarA(a.cont, x, Math.min(y, L.mesa + 30), { ms: 520, alto: Pt.r, esc: 1 });
                this.sonar(ids[i], { breve: true, bocina: false });
                await esperar(this, 380);
                if (!this.sigue()) return;
            }
            Ut.estallido(this, Pt.x, Pt.y, { n: 22, tex: 'estrella', tam: 28, dist: 200, sinTinte: true, depth: 61 });
            await esperar(this, 900);
        },

        /** Demo: la mano mete por el buzón de la bóveda lo que sonó. */
        demoPaso: function () {
            return this.pasoArrastre(this.correctaDe(this.cosas), this.destino());
        },

        estadoExtra: function () {
            var d = this.destino();
            return {
                destino: { x: Math.round(d.x), y: Math.round(d.y) },
                cosas: this.cosas.filter(function (a) { return !a.usada && a.cont.active && a.cont.visible; }).map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y) }; })
            };
        }
    };

    K.crear({ id: 'boveda', fondo: '#212529', escena: escena });
})(typeof window !== 'undefined' ? window : this);
