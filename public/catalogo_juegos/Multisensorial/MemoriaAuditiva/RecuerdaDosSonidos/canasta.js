/**
 * «Atrapa en la canasta» — motor propio de Recuerda dos sonidos (3-4 años).
 *
 * No es arrastrar fichas: los sonidos caen a la canasta a ciegas mientras suenan. Después los
 * objetos REBOTAN y FLOTAN por el parque y el niño MUEVE LA CANASTA (arrastra o flechas) para
 * ATRAPARLOS por debajo. Solo entran los que escuchó; si atrapa uno equivocado, rebota y sigue
 * volando. Hay que atrapar todos los correctos.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var rnd = Ut.rnd;

    var escena = {
        iniciar: function () {
            this.cosas = [];
            this.dentro = [];
            this.reunidos = [];
            this.moviendo = null;
            this.dir = 0;
            this.atrapando = false;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            L.pres = null;
            L.der = W - 24;
            L.izq = 24;
            L.y0 = Math.round(H * 0.36);
            L.tam = Math.max(90, Math.min(150, (L.der - L.izq) / 5.5, H * 0.18));
            var cw = Math.min(280, L.der * 0.28, H * 0.28);
            L.suelo = Math.round(H * 0.82);
            L.canasta = {
                x: W / 2,
                y: L.suelo - 8,
                w: cw,
                h: cw * 0.58,
                xMin: L.izq + cw * 0.55,
                xMax: L.der - cw * 0.55
            };
            // y1 llega a la boca: si no, el niño mueve la canasta y nunca atrapa nada.
            L.vuelo = {
                y0: L.y0 + L.tam * 0.45,
                y1: L.canasta.y - L.canasta.h * 0.35
            };
            L.bocina = { x: 56, y: L.y0 + 36, r: 26 };
            L.flechaL = { x: 70, y: L.suelo + 28, r: 36 };
            L.flechaR = { x: W - 70, y: L.suelo + 28, r: 36 };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            this.montarParque(keep);
            this.montarCanasta(keep);
            this.montarControles(keep);
            this.miraG = keep(this.add.graphics().setDepth(25));
            keep(K.nino(this, 90, L.suelo + 4, 14, { ropa: 0xfa5252, pelo: 0x5c3317, esc: 1.85 }));
            this.sembrarMotes(keep, 14, { x: 0, y: 10, w: L.W, h: L.y0, depth: 5 }, 0xfff3bf);
            this.montarHud(keep);
            if (reubicar) {
                this.ponerCanasta(this.L.canasta.x, false);
                this.ubicarCosas();
            }
        },

        montarParque: function (keep) {
            var L = this.L;
            var V = this.montarVida(keep);
            if (V) {
                V.parque({ horizonte: L.y0, arboles: [0.06, 0.2, 0.8, 0.94], solX: 0.85, nubes: 3 });
                V.mariposas(3, { x: 0, y: L.y0 - 50, w: L.W, h: 60, depth: 7 });
            }
            K.textura(this, 'canasta_pasto', L.W, L.H - L.y0 + 8, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#8ce99a');
                g.addColorStop(0.5, '#51cf66');
                g.addColorStop(1, '#2f9e44');
                x.fillStyle = g;
                x.fillRect(0, 0, w, h);
                K.grano(x, 0, 0, w, h, Math.round(w * h / 280), ['#69db7c', '#b2f2bb', '#37b24d'], 1.7, 0.4);
                // Pista donde corre la canasta.
                x.fillStyle = 'rgba(166,124,82,0.45)';
                x.fillRect(0, h * 0.72, w, h * 0.18);
                x.fillStyle = 'rgba(255,255,255,0.25)';
                x.fillRect(0, h * 0.78, w, 6);
            });
            keep(this.add.image(0, L.y0 - 4, 'canasta_pasto').setOrigin(0, 0).setDepth(2));

            // Mantel decorativo al fondo (no es la zona de juego).
            var mantel = keep(this.add.graphics().setDepth(3));
            mantel.fillStyle(0xfff5f5, 1);
            mantel.fillRoundedRect(L.W * 0.08, L.y0 + 16, L.W * 0.28, 70, 12);
            mantel.fillStyle(0xfa5252, 0.45);
            for (var i = 0; i < 5; i += 2) mantel.fillRect(L.W * 0.08 + i * 28, L.y0 + 16, 28, 70);
        },

        montarCanasta: function (keep) {
            var L = this.L, C = L.canasta;
            var w = C.w, h = C.h;
            K.textura(this, 'canasta_cuerpo', Math.ceil(w + 24), Math.ceil(h + 24), function (x) {
                var g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#f3d19c');
                g.addColorStop(0.55, '#e8a35c');
                g.addColorStop(1, '#a8682a');
                x.fillStyle = g;
                x.beginPath();
                x.moveTo(12, 14);
                x.lineTo(w + 12, 14);
                x.lineTo(w - w * 0.08 + 12, h + 12);
                x.lineTo(w * 0.08 + 12, h + 12);
                x.closePath();
                x.fill();
                x.strokeStyle = 'rgba(110,60,20,0.55)';
                x.lineWidth = 3;
                for (var yy = 22; yy < h; yy += 12) {
                    x.beginPath(); x.moveTo(16, yy); x.lineTo(w + 8, yy); x.stroke();
                }
                x.strokeStyle = '#8c5a2b';
                x.lineWidth = 4;
                x.stroke();
            });

            var c = keep(this.add.container(C.x, C.y).setDepth(40));
            var sombra = this.add.ellipse(0, h * 0.42, w * 0.95, 24, 0x000000, 0.2);
            var asa = this.add.graphics();
            asa.lineStyle(12, 0x8c5a2b, 1);
            asa.beginPath(); asa.arc(0, -h * 0.15, w * 0.42, Math.PI, 0); asa.strokePath();
            asa.lineStyle(5, 0xd08c47, 1);
            asa.beginPath(); asa.arc(0, -h * 0.15, w * 0.42, Math.PI, 0); asa.strokePath();
            var cuerpo = this.add.image(0, 0, 'canasta_cuerpo').setOrigin(0.5, 0.5);
            var tapa = this.add.container(-w / 2, -h / 2 + 2);
            var tg = this.add.graphics();
            tg.fillStyle(0xd08c47, 1);
            tg.fillRoundedRect(0, -16, w, 26, 10);
            tg.fillStyle(0xe8a35c, 1);
            tg.fillRoundedRect(5, -11, w - 10, 14, 6);
            tg.lineStyle(3, 0x8c5a2b, 1);
            tg.strokeRoundedRect(0, -16, w, 26, 10);
            tapa.add(tg);
            var boca = this.add.ellipse(0, -h * 0.42, w * 0.78, 18, 0xffe066, 0);
            c.add([sombra, asa, cuerpo, tapa, boca]);
            this.canasta = c;
            this.tapa = tapa;
            this.bocaLuz = boca;
            this.halo = keep(this.add.ellipse(C.x, C.y - h * 0.2, w * 1.35, h * 1.1, 0xffe066, 0).setDepth(35));
        },

        montarControles: function (keep) {
            var L = this.L;
            this.btnIzq = this.dibujarFlecha(keep, L.flechaL, -1);
            this.btnDer = this.dibujarFlecha(keep, L.flechaR, 1);
            keep(this.add.text(L.W / 2, L.suelo + 30, 'Mueve la canasta y atrapa lo que escuchaste', {
                fontFamily: 'Nunito, Arial',
                fontSize: '20px',
                fontStyle: 'bold',
                color: '#ffffff',
                stroke: '#2f9e44',
                strokeThickness: 5
            }).setOrigin(0.5).setDepth(45));
        },

        dibujarFlecha: function (keep, Q, dir) {
            var c = keep(this.add.container(Q.x, Q.y).setDepth(46));
            var fondo = this.add.circle(0, 0, Q.r, 0xffd43b).setStrokeStyle(5, 0xffffff);
            var g = this.add.graphics();
            g.fillStyle(0xe03131, 1);
            g.fillTriangle(dir * Q.r * 0.48, 0, -dir * Q.r * 0.28, -Q.r * 0.42, -dir * Q.r * 0.28, Q.r * 0.42);
            c.add([fondo, g]);
            c.dir = dir;
            c.r = Q.r;
            c.fondo = fondo;
            return c;
        },

        abrirTapa: function (ang, ms) {
            return tw(this, { targets: this.tapa, angle: ang, duration: ms || 220, ease: 'Quad.easeOut' });
        },

        ponerCanasta: function (x, anim) {
            var C = this.L.canasta;
            x = Math.max(C.xMin, Math.min(C.xMax, x));
            C.x = x;
            if (!this.canasta) return Promise.resolve();
            if (anim) {
                return tw(this, { targets: this.canasta, x: x, duration: 160, ease: 'Sine.easeOut' });
            }
            this.canasta.x = x;
            if (this.halo) this.halo.x = x;
            return Promise.resolve();
        },

        alSonar: function () {
            var self = this;
            var C = this.L.canasta;
            var ch = this.add.circle(C.x + rnd(-40, 40), C.y - C.h * 2.2, 12, 0xffe066).setDepth(39);
            this.abrirTapa(-60, 160);
            this.tweens.add({ targets: this.canasta, scaleX: 1.05, scaleY: 0.94, duration: 90, yoyo: true });
            this.tweens.add({
                targets: ch,
                x: C.x + rnd(-20, 20),
                y: C.y - C.h * 0.3,
                alpha: 0.2,
                duration: 420,
                ease: 'Quad.easeIn',
                onComplete: function () {
                    ch.destroy();
                    self.abrirTapa(0, 150);
                    K.ruido({ f: 280, q: 1, dur: 0.12, vol: 0.1 });
                }
            });
        },

        lugares: function (n) {
            var L = this.L, out = [];
            for (var i = 0; i < n; i++) {
                var t = n === 1 ? 0.5 : i / (n - 1);
                out.push({
                    x: L.izq + L.tam * 0.7 + (L.der - L.izq - L.tam * 1.4) * t,
                    y: L.vuelo.y0 + (i % 2) * L.tam * 0.25
                });
            }
            return out;
        },

        ubicarCosas: function () {
            var lug = this.lugares(this.cosas.length);
            this.cosas.forEach(function (a, i) {
                if (!lug[i] || a.usada) return;
                a.casa = lug[i];
                a.cont.setPosition(lug[i].x, lug[i].y);
            });
        },

        prepararNivel: async function () {
            this.atrapando = false;
            this.dir = 0;
            this.moviendo = null;
            await this.retirar(this.cosas.concat(this.dentro));
            this.cosas = [];
            this.dentro = [];
            await this.abrirTapa(0, 140);
            this.ponerCanasta(this.L.W / 2, false);
            if (this.bocaLuz) this.bocaLuz.setFillStyle(0xffe066, 0);
            if (this.halo) this.halo.setFillStyle(0xffe066, 0);
        },

        mostrarOpciones: async function (nv) {
            var self = this;
            var L = this.L;
            var lug = this.lugares(nv.opciones.length);
            var tam = Math.min(L.tam, (L.der - L.izq) / Math.max(3, nv.opciones.length) * 0.7);
            this.cosas = nv.opciones.map(function (id, i) {
                var a = self.crearCosa(id, lug[i].x, lug[i].y - 40, tam, { depth: 30 });
                a.casa = { x: lug[i].x, y: lug[i].y };
                a.fase = Math.random() * Math.PI * 2;
                a.vx = (Math.random() < 0.5 ? -1 : 1) * rnd(90, 150);
                a.amp = rnd(0.88, 1); // debe rozar la boca o no hay captura
                a.freq = rnd(1.15, 1.75);
                a.usada = false;
                a.enfriamiento = 0;
                a.cont.setAlpha(0).setScale(0.35);
                return a;
            });
            K.tono({ f: 480, f2: 820, dur: 0.3, vol: 0.04 });
            await Promise.all(this.cosas.map(function (a, i) {
                return esperar(self, i * 110).then(function () {
                    return tw(self, {
                        targets: a.cont, alpha: 1, scale: 1, y: a.casa.y,
                        duration: 380, ease: 'Back.easeOut'
                    });
                });
            }));
            this.abrirTapa(-25, 200);
        },

        hitCirculo: function (p, c, r) {
            return Math.hypot(p.x - c.x, p.y - c.y) <= r;
        },

        /* ── Controles: mover la canasta ── */

        alTocar: function (p) {
            if (this.fase !== 'jugar' || this.atrapando) return;
            this.pista.reiniciar();
            if (this.hitCirculo(p, this.L.flechaL, this.L.flechaL.r * 1.2)) {
                this.dir = -1;
                this.moviendo = { tipo: 'flecha' };
                this.iluminarFlecha(this.btnIzq, true);
                return;
            }
            if (this.hitCirculo(p, this.L.flechaR, this.L.flechaR.r * 1.2)) {
                this.dir = 1;
                this.moviendo = { tipo: 'flecha' };
                this.iluminarFlecha(this.btnDer, true);
                return;
            }
            // Arrastrar: canasta o cualquier toque en la mitad baja (pista de carrera).
            var C = this.L.canasta;
            if (p.y > this.L.y0 + 40 || Math.abs(p.x - this.canasta.x) < C.w * 1.2) {
                this.moviendo = { tipo: 'drag', dx: this.canasta.x - p.x };
                this.ponerCanasta(p.x + (this.canasta.x - p.x), false);
                K.tono({ f: 520, f2: 640, dur: 0.04, vol: 0.03 });
            }
        },

        alMover: function (p) {
            if (!this.moviendo || this.atrapando || this.fase !== 'jugar') return;
            if (this.moviendo.tipo === 'drag') {
                this.ponerCanasta(p.x + this.moviendo.dx, false);
                if (this.time.now - (this.zumbido || 0) > 80) {
                    this.zumbido = this.time.now;
                    K.ruido({ f: 1400, q: 3, dur: 0.02, vol: 0.012 });
                }
            }
        },

        alSoltar: function () {
            if (!this.moviendo) return;
            this.dir = 0;
            this.iluminarFlecha(this.btnIzq, false);
            this.iluminarFlecha(this.btnDer, false);
            this.moviendo = null;
        },

        iluminarFlecha: function (btn, on) {
            if (!btn || !btn.fondo) return;
            btn.fondo.setFillStyle(on ? 0xffec99 : 0xffd43b);
            btn.setScale(on ? 1.12 : 1);
        },

        /** ¿La canasta está debajo del objeto? */
        puedeAtrapar: function (a) {
            if (!a || a.usada || this.atrapando) return false;
            if (a.enfriamiento && this.time.now < a.enfriamiento) return false;
            var C = this.L.canasta;
            var bocaY = this.canasta.y - C.h * 0.55;
            var cercaX = Math.abs(a.cont.x - this.canasta.x) < C.w * 0.48;
            var cercaY = a.cont.y > bocaY - a.tam * 0.15 && a.cont.y < bocaY + a.tam * 0.85;
            return cercaX && cercaY;
        },

        intentarAtrapar: async function (a) {
            if (!this.puedeAtrapar(a)) return;
            this.atrapando = true;
            a.enfriamiento = this.time.now + 900;
            this.tocado = a;
            var C = this.L.canasta;
            this.tweens.add({ targets: this.canasta, scaleY: 0.9, scaleX: 1.08, duration: 80, yoyo: true });
            K.ruido({ f: 360, q: 1, dur: 0.1, vol: 0.08 });
            var r = await this.marcar(a.id, { x: this.canasta.x, y: C.y - C.h * 0.5 });
            if (r === 'mal' || r === 'repetido') {
                await this.rechazar(a);
                this.atrapando = false;
                return;
            }
            await this.meter(a);
            // 'bien' o 'listo': meter ya corrió; si listo, alAcertar sigue.
            this.atrapando = false;
        },

        rechazar: async function (a) {
            var L = this.L;
            this.tweens.add({
                targets: this.canasta, angle: { from: -6, to: 6 }, duration: 50, yoyo: true, repeat: 3
            });
            await tw(this, {
                targets: a.cont,
                y: L.vuelo.y0 + rnd(0, 40),
                x: a.cont.x + rnd(-80, 80),
                duration: 420,
                ease: 'Back.easeOut'
            });
            a.casa = { x: a.cont.x, y: a.cont.y };
            a.fase = Math.PI * 1.5; // sale hacia arriba tras el rechazo
            a.vx = (a.cont.x < L.W / 2 ? 1 : -1) * rnd(100, 160);
            a.amp = rnd(0.9, 1);
            a.freq = rnd(1.2, 1.8);
            await a.sacudir();
        },

        meter: async function (a) {
            var C = this.L.canasta;
            a.usada = true;
            a.pasea = false;
            this.dentro.push(a);
            this.cosas = this.cosas.filter(function (q) { return q !== a; });
            this.abrirTapa(-70, 140);
            a.cont.setDepth(38);
            await this.saltarA(
                a.cont,
                this.canasta.x + (this.dentro.length - 1.5) * C.w * 0.2,
                this.canasta.y - C.h * 0.2,
                { ms: 320, alto: 40, esc: 0.5 }
            );
            K.ruido({ f: 260, q: 1, dur: 0.12, vol: 0.1 });
            Ut.estallido(this, this.canasta.x, this.canasta.y - C.h * 0.5, {
                n: 8, tex: 'estrella', tam: 14, dist: 55, sinTinte: true, depth: 55
            });
            if (this.fase !== 'premio') this.abrirTapa(-20, 160);
        },

        alAcertar: async function () {
            var self = this;
            var C = this.L.canasta;
            if (this.tocado && this.dentro.indexOf(this.tocado) < 0 && !this.tocado.usada) {
                await this.meter(this.tocado);
            }
            await this.abrirTapa(-110, 280);
            var luz = this.add.circle(this.canasta.x, this.canasta.y - C.h * 0.4, C.w * 0.7, 0xfff3bf, 0).setDepth(37);
            this.tweens.add({
                targets: luz, fillAlpha: 0.7, duration: 280, yoyo: true, hold: 800,
                onComplete: function () { luz.destroy(); }
            });
            var n = this.dentro.length;
            this.dentro.forEach(function (a, i) {
                a.cont.setDepth(41);
                self.tweens.add({
                    targets: a.cont,
                    y: self.canasta.y - C.h * 0.85,
                    x: self.canasta.x + (i - (n - 1) / 2) * C.w * 0.4,
                    scale: 0.85,
                    duration: 380,
                    ease: 'Back.easeOut'
                });
                self.reunidos.push(a.id);
            });
            await esperar(this, 400);
            for (var i = 0; i < n; i++) {
                this.dentro[i].saltito(0.15, 1);
                await this.sonar(this.dentro[i].id, { breve: true, bocina: false });
            }
        },

        alFallar: async function () {
            // El rebote lo hace rechazar(); aquí solo feedback de canasta.
            if (this.halo) {
                this.halo.setFillStyle(0xff6b6b, 0.35);
                this.tweens.add({ targets: this.halo, fillAlpha: 0, duration: 350 });
            }
        },

        alTerminarNivel: async function () {
            this.dir = 0;
            this.moviendo = null;
            await this.retirar(this.cosas.filter(function (a) { return !a.usada; }).concat(this.dentro));
            this.cosas = [];
            this.dentro = [];
            await this.abrirTapa(0, 200);
            if (this.bocaLuz) this.bocaLuz.setFillStyle(0xffe066, 0);
            if (this.halo) this.halo.setFillStyle(0xffe066, 0);
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando || this.atrapando) return Promise.resolve();
            var no = function () { return cancelada() || self.fase !== 'jugar'; };
            var ok = this.cosas.filter(function (c) {
                return !c.usada && self.respuestas().indexOf(c.id) >= 0;
            })[0];
            if (!ok) return Promise.resolve();
            return this.ctx.mano({
                punto: { x: this.canasta.x, y: this.canasta.y },
                holdMs: 200,
                arrastre: { dx: ok.cont.x - this.canasta.x, dy: 0, durMs: 700 },
                cancelado: no
            });
        },

        escenaFinal: async function () {
            var self = this;
            var L = this.L, C = L.canasta;
            var vistos = {};
            var ids = this.reunidos.filter(function (id) {
                if (vistos[id]) return false;
                vistos[id] = 1;
                return true;
            });
            await this.abrirTapa(-110, 280);
            this.ponerCanasta(L.W / 2, true);
            var n = ids.length;
            var tam = Math.min(L.tam * 0.9, L.W / Math.max(4, n) * 0.7);
            for (var i = 0; i < n; i++) {
                var a = this.crearCosa(ids[i], this.canasta.x, this.canasta.y - C.h * 0.2, tam, { depth: 42 });
                a.cont.setScale(0.4);
                var x = L.W * (0.25 + 0.5 * (i + 0.5) / Math.max(1, n));
                var y = L.vuelo.y0 + 40;
                await this.saltarA(a.cont, x, y, { ms: 420, alto: L.tam * 0.7, esc: 1 });
                this.sonar(ids[i], { breve: true, bocina: false });
                a.saltito(0.2, 2);
                await esperar(this, 280);
                if (!this.sigue()) return;
            }
            Ut.estallido(this, L.W / 2, L.y0 + 40, {
                n: 18, tex: 'corazon', tam: 26, dist: 180, depth: 60
            });
            await esperar(this, 1100);
        },

        demoPaso: function () {
            var self = this;
            var ok = this.correctaDe(this.cosas);
            if (!ok || !this.canasta) return null;
            return {
                desde: { x: this.canasta.x, y: this.canasta.y },
                hasta: { x: ok.cont.x, y: this.canasta.y },
                hacer: async function () {
                    await self.ponerCanasta(ok.cont.x, true);
                    await esperar(self, 120);
                    // Baja un poco el objeto para que entre en zona de boca.
                    ok.cont.y = self.canasta.y - self.L.canasta.h * 0.35;
                    await self.intentarAtrapar(ok);
                }
            };
        },

        estadoExtra: function () {
            return {
                canasta: { x: Math.round(this.canasta.x), y: Math.round(this.canasta.y) },
                cosas: this.cosas.filter(function (a) { return !a.usada; }).map(function (a) {
                    return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y) };
                })
            };
        },

        dibujarMira: function () {
            var g = this.miraG, C = this.L.canasta;
            if (!g || !this.canasta) return;
            g.clear();
            if (this.fase !== 'jugar' || this.atrapando) return;
            var bajo = null;
            for (var i = 0; i < this.cosas.length; i++) {
                if (this.puedeAtrapar(this.cosas[i])) { bajo = this.cosas[i]; break; }
            }
            if (bajo) {
                g.lineStyle(3, 0x69db7c, 0.85);
                g.strokeCircle(bajo.cont.x, bajo.cont.y, bajo.tam * 0.55);
                if (this.bocaLuz) this.bocaLuz.setFillStyle(0x69db7c, 0.55);
                if (this.halo) this.halo.setFillStyle(0x69db7c, 0.22);
            } else {
                if (this.bocaLuz) this.bocaLuz.setFillStyle(0xffe066, 0.2);
                if (this.halo) this.halo.setFillStyle(0xffe066, 0.08);
            }
            if (this.halo) {
                this.halo.x = this.canasta.x;
                this.halo.y = this.canasta.y - C.h * 0.2;
            }
        },

        paso: function (time, delta) {
            var L = this.L;
            var dt = (delta || 16) / 1000;
            this.dibujarMira();

            // Mover canasta con flechas sostenidas.
            if (this.fase === 'jugar' && !this.atrapando && this.dir) {
                this.ponerCanasta(this.L.canasta.x + this.dir * 420 * dt, false);
            }
            if (this.canasta && !this.tweens.isTweening(this.canasta) && !this.moviendo) {
                this.canasta.y = L.canasta.y + Math.sin(time / 500) * 2;
            }
            if (this.halo && this.canasta) this.halo.x = this.canasta.x;

            // Objetos cruzan el parque en arcos: suben y BAJAN hasta la boca.
            if (this.fase === 'jugar' && !this.atrapando) {
                var self = this;
                var y0 = L.vuelo.y0, y1 = L.vuelo.y1;
                var mid = (y0 + y1) / 2, ampMax = (y1 - y0) / 2;
                this.cosas.forEach(function (a) {
                    if (a.usada || !a.cont.active) return;
                    if (self.tweens.isTweening(a.cont)) return;
                    a.fase = (a.fase || 0) + dt * (a.freq || 1.4);
                    a.cont.x += a.vx * dt;
                    // sin ∈ [-1,1]: +1 = abajo (cerca de la canasta).
                    var s = Math.sin(a.fase);
                    a.cont.y = mid + s * ampMax * (a.amp || 0.8);
                    if (a.cont.x < L.izq + a.tam * 0.5) { a.cont.x = L.izq + a.tam * 0.5; a.vx = Math.abs(a.vx); }
                    if (a.cont.x > L.der - a.tam * 0.5) { a.cont.x = L.der - a.tam * 0.5; a.vx = -Math.abs(a.vx); }
                    a.cont.angle = Math.sin(a.fase * 1.4) * 14;
                    a.cont.scale = 1 + Math.max(0, s) * 0.06;
                    a.casa = { x: a.cont.x, y: a.cont.y };
                    if (self.puedeAtrapar(a)) self.intentarAtrapar(a);
                });
            }
        }
    };

    K.crear({ id: 'canasta', fondo: '#a5d8ff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
