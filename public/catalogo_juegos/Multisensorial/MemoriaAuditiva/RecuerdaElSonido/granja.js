/**
 * «La granja de noche» — motor propio de Recuerda el sonido (3-4 años).
 *
 * De noche suena algo en el establo (ojos brillan bajo las puertas, no se ve quién).
 * Amanece: carteles sobre cada puerta. El niño ABRE LA PUERTA (arrastra la hoja o
 * mantén tocándola) del que escuchó. Sale a saludar; si no es, asoma, suena y la
 * puerta se cierra de un portazo.
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
            this.puertas = [];
            this.reunidos = [];
            this.noche = 1;
            this.gallinas = [];
            this.apuntada = null;
            this.abriendo = false;
        },

        filtrarPool: function (pool) {
            return pool.filter(function (id) { return K.ANIMALES.indexOf(id) >= 0; });
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            L.pres = null;
            L.der = W - 24;
            L.y0 = Math.round(H * 0.72);
            L.establo = {
                x: Math.round(W * 0.06),
                w: Math.round(W * 0.72),
                y: Math.round(H * 0.28),
                h: 0
            };
            L.establo.h = L.y0 - L.establo.y;
            L.tam = Math.max(72, Math.min(140, L.establo.w / 4.2, L.establo.h * 0.48));
            L.bocina = { x: L.establo.x + 40, y: L.establo.y + 36, r: 24 };
            L.patio = { x: L.establo.x + L.establo.w + 20, y: L.y0 };
            return L;
        },

        armar: function (reubicar) {
            var self = this;
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            var V = this.montarVida(keep);
            if (V) {
                V.parque({ horizonte: L.y0 - 6, arboles: [0.02, 0.96], solX: 0.9, nubes: 3 });
                V.estrellas({ x: 0, y: 0, w: L.W, h: L.establo.y - 16, depth: 1.6 }, 16);
                V.pajaros(2, 28, L.establo.y * 0.55);
            }
            this.montarSuelo(keep);
            this.montarEstablo(keep);
            this.montarPatio(keep);
            this.montarNoche(keep);
            this.montarGallinas(keep);
            keep(K.nino(this, Math.round(L.W * 0.18), L.y0 + (L.H - L.y0) * 0.62, 50, {
                ropa: 0x37b24d, pelo: 0x5c3317, esc: 2.15
            }));
            this.sembrarMotes(keep, 20, {
                x: 0, y: 10, w: L.W, h: Math.max(36, L.establo.y - 6), depth: 47
            }, 0xffe066);
            this.miraG = keep(this.add.graphics().setDepth(55));
            this.montarHud(keep);
            if (reubicar && this.nv) this.armarPuertas(this.nv.opciones, true);
        },

        montarSuelo: function (keep) {
            var L = this.L;
            K.textura(this, 'granja_suelo', L.W, L.H - L.y0, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#c49a6c');
                g.addColorStop(0.55, '#b07d4a');
                g.addColorStop(1, '#8d5a2b');
                x.fillStyle = g;
                x.fillRect(0, 0, w, h);
                K.grano(x, 0, 0, w, h, Math.round(w * h / 180), ['#8d6e63', '#d7b899', '#ffe066'], 1.8, 0.45);
                // Camino al patio.
                x.fillStyle = 'rgba(255,243,191,0.35)';
                x.beginPath();
                x.moveTo(w * 0.08, 0);
                x.quadraticCurveTo(w * 0.45, h * 0.4, w * 0.78, h);
                x.lineTo(w * 0.92, h);
                x.quadraticCurveTo(w * 0.55, h * 0.35, w * 0.22, 0);
                x.closePath();
                x.fill();
            });
            keep(this.add.image(0, L.y0, 'granja_suelo').setOrigin(0, 0).setDepth(4));
        },

        montarEstablo: function (keep) {
            var self = this;
            var L = this.L, E = L.establo;
            K.textura(this, 'granja_establo', E.w, E.h + E.h * 0.48, function (x, w, h) {
                var t = h - E.h;
                // Techo a dos aguas.
                var techo = x.createLinearGradient(0, 0, 0, t);
                techo.addColorStop(0, '#ff8787');
                techo.addColorStop(1, '#c92a2a');
                x.fillStyle = techo;
                x.beginPath();
                x.moveTo(-14, t + 12);
                x.lineTo(w / 2, 4);
                x.lineTo(w + 14, t + 12);
                x.closePath();
                x.fill();
                x.strokeStyle = 'rgba(255,255,255,0.28)';
                x.lineWidth = 2;
                for (var tx = 30; tx < w; tx += 36) {
                    x.beginPath();
                    x.moveTo(w / 2, 8);
                    x.lineTo(tx, t + 10);
                    x.stroke();
                }
                // Chimenea.
                x.fillStyle = '#495057';
                x.fillRect(w * 0.72, t * 0.18, 28, t * 0.7);
                x.fillStyle = '#868e96';
                x.fillRect(w * 0.7, t * 0.12, 36, 14);
                // Muro.
                var muro = x.createLinearGradient(0, t, 0, h);
                muro.addColorStop(0, '#ff8787');
                muro.addColorStop(0.4, '#fa5252');
                muro.addColorStop(1, '#e03131');
                x.fillStyle = muro;
                x.fillRect(0, t, w, E.h);
                x.strokeStyle = 'rgba(255,255,255,0.2)';
                x.lineWidth = 2;
                for (var xx = 18; xx < w; xx += 26) {
                    x.beginPath();
                    x.moveTo(xx, t + 14);
                    x.lineTo(xx, h - 28);
                    x.stroke();
                }
                // Viga superior.
                x.fillStyle = '#fff5f5';
                x.fillRect(0, t, w, 14);
                // Base de piedra.
                x.fillStyle = '#dee2e6';
                x.fillRect(0, h - 26, w, 26);
                x.strokeStyle = 'rgba(0,0,0,0.18)';
                for (var sx = 0; sx < w; sx += 44) {
                    x.beginPath();
                    x.moveTo(sx, h - 26);
                    x.lineTo(sx, h);
                    x.stroke();
                }
                // Ventanas del desván.
                [0.22, 0.5, 0.78].forEach(function (p) {
                    var wx = w * p, wy = t * 0.52, wr = Math.min(22, t * 0.22);
                    x.fillStyle = '#fff3bf';
                    x.beginPath();
                    x.arc(wx, wy, wr, 0, Math.PI * 2);
                    x.fill();
                    x.strokeStyle = '#fff';
                    x.lineWidth = 5;
                    x.stroke();
                    x.strokeStyle = '#8c5a2b';
                    x.lineWidth = 3;
                    x.beginPath();
                    x.moveTo(wx - wr + 2, wy);
                    x.lineTo(wx + wr - 2, wy);
                    x.moveTo(wx, wy - wr + 2);
                    x.lineTo(wx, wy + wr - 2);
                    x.stroke();
                });
                // Pilares entre puestos.
                x.fillStyle = '#fff5f5';
                for (var p = 0; p <= 4; p++) {
                    x.fillRect(w * (0.06 + p * 0.22), t + E.h * 0.3, 14, E.h * 0.62);
                }
            });
            this.establoImg = keep(this.add.image(E.x, E.y + E.h, 'granja_establo').setOrigin(0, 1).setDepth(5));
            // Humo de chimenea (círculos suaves).
            this.humo = [];
            var hx = E.x + E.w * 0.74, hy = E.y - E.h * 0.18;
            for (var i = 0; i < 5; i++) {
                this.humo.push(keep(this.add.circle(hx, hy - i * 14, 8 + i * 2, 0xffffff, 0.18).setDepth(50)));
            }
            // Veleta en el pico.
            var pico = { x: E.x + E.w / 2, y: E.y - E.h * 0.38 };
            this.veleta = keep(this.add.container(pico.x, pico.y).setDepth(51));
            var vg = this.add.graphics();
            vg.fillStyle(0x212529, 1);
            vg.fillRect(-3, 0, 6, 52);
            vg.fillTriangle(0, -16, 50, 10, 0, 10);
            vg.fillStyle(0xff6b6b, 1);
            vg.fillTriangle(0, -16, -42, 14, 0, 14);
            vg.fillStyle(0xffd43b, 1);
            vg.fillCircle(0, -18, 8);
            this.veleta.add(vg);
            // Faroles del frontón.
            this.farolesGranja = [E.x + 32, E.x + E.w - 32].map(function (lx) {
                keep(self.add.rectangle(lx, E.y + 10, 6, 18, 0x343a40).setDepth(52));
                return keep(self.add.circle(lx, E.y + 26, 12, 0xffe066, 0.95).setDepth(52));
            });
        },

        montarPatio: function (keep) {
            var L = this.L;
            var suelo = L.H - L.y0;
            var patio = keep(this.add.graphics().setDepth(6));
            patio.fillStyle(0xd4b48c, 1);
            patio.fillEllipse(L.W * 0.78, L.y0 + suelo * 0.45, L.W * 0.38, suelo * 0.7);
            // Bebedero.
            patio.fillStyle(0xf3d9a4, 1);
            patio.fillRoundedRect(L.der - 150, L.y0 + 18, 70, 44, 10);
            patio.fillRoundedRect(L.der - 128, L.y0 + 6, 70, 44, 10);
            patio.lineStyle(4, 0x8c5a2b, 1);
            patio.strokeRoundedRect(L.der - 128, L.y0 + 6, 70, 44, 10);
            patio.fillStyle(0x74c0fc, 0.75);
            patio.fillRoundedRect(L.der - 118, L.y0 + 14, 50, 22, 6);
            // Cerca.
            var fy = L.y0 + suelo * 0.82;
            patio.lineStyle(5, 0xf8f9fa, 1);
            patio.lineBetween(L.establo.x + L.establo.w + 8, fy, L.der - 16, fy);
            for (var fx = L.establo.x + L.establo.w + 20; fx < L.der - 10; fx += 40) {
                patio.lineBetween(fx, fy - 20, fx, fy + 14);
            }
            // Pacas de heno.
            [0.62, 0.7].forEach(function (px, i) {
                patio.fillStyle(0xffe066, 1);
                patio.fillRoundedRect(L.W * px, L.y0 + 8 + i * 10, 54, 36, 8);
                patio.lineStyle(2, 0xf59f00, 1);
                patio.strokeRoundedRect(L.W * px, L.y0 + 8 + i * 10, 54, 36, 8);
            });
        },

        montarNoche: function (keep) {
            var L = this.L;
            this.velo = keep(this.add.rectangle(0, 0, L.W, L.H, 0x0b1a3a, 0.45 * this.noche)
                .setOrigin(0, 0).setDepth(45));
            this.luna = keep(this.add.circle(
                L.W * 0.14, L.establo.y * 0.4,
                Math.min(38, L.establo.y * 0.26),
                0xfff9db, this.noche
            ).setDepth(46));
        },

        montarGallinas: function (keep) {
            var L = this.L;
            this.gallinas = [];
            for (var i = 0; i < 3; i++) {
                var g = keep(this.add.container(
                    L.W * (0.55 + i * 0.1),
                    L.y0 + (L.H - L.y0) * (0.35 + (i % 2) * 0.15)
                ).setDepth(48));
                var dib = this.add.graphics();
                dib.fillStyle(0xfff3bf, 1);
                dib.fillEllipse(0, 0, 22, 16);
                dib.fillStyle(0xfa5252, 1);
                dib.fillTriangle(-8, -4, 4, -4, -2, -12);
                dib.fillStyle(0xff922b, 1);
                dib.fillTriangle(10, -3, 20, 0, 10, 3);
                g.add(dib);
                g.fase = Math.random() * 6;
                g.vx = (i % 2 ? 1 : -1) * rnd(18, 32);
                g.x0 = g.x;
                this.gallinas.push(g);
            }
        },

        ponerNoche: function (n, ms) {
            this.noche = n;
            var soles = this.vidaAmb && this.vidaAmb.buscar ? this.vidaAmb.buscar('sol') : [];
            var self = this;
            soles.forEach(function (s) {
                self.tweens.add({ targets: s.c, alpha: 1 - n, duration: ms || 900 });
            });
            this.gallinas.forEach(function (g) {
                self.tweens.add({ targets: g, alpha: 1 - n * 0.85, duration: ms || 900 });
            });
            return Promise.all([
                tw(this, { targets: this.velo, fillAlpha: 0.48 * n, duration: ms || 900 }),
                tw(this, {
                    targets: this.luna,
                    alpha: n,
                    y: n ? this.L.establo.y * 0.4 : this.L.establo.y * 0.15,
                    duration: ms || 900
                })
            ]);
        },

        armarPuertas: function (ids, conCartel) {
            var self = this;
            var L = this.L, E = L.establo;
            this.puertas.forEach(function (p) {
                p.cont.destroy();
                p.hojaCont.destroy();
                if (p.ojos) p.ojos.destroy();
                if (p.animal) p.animal.destruir();
            });
            var n = ids.length;
            var pw = Math.min(E.w / n * 0.72, L.tam * 1.35);
            var ph = E.h * 0.66;
            this.puertas = ids.map(function (id, i) {
                var cx = E.x + E.w * (i + 0.5) / n;
                var base = E.y + E.h - 4;
                var c = self.add.container(cx, base).setDepth(46);
                var hueco = self.add.rectangle(0, -ph / 2, pw, ph, 0x1a0f08);
                // Luz bajo la puerta (noche).
                var luz = self.add.ellipse(0, -8, pw * 0.7, 14, 0xffe066, 0).setDepth(1);
                // Ojos brillantes detrás (noche).
                var ojos = self.add.container(cx, base - ph * 0.45).setDepth(47).setAlpha(0);
                ojos.add([
                    self.add.circle(-10, 0, 5, 0xffe066),
                    self.add.circle(10, 0, 5, 0xffe066),
                    self.add.circle(-10, 0, 2, 0x212529),
                    self.add.circle(10, 0, 2, 0x212529)
                ]);
                var animal = self.crearCosa(id, cx, base - ph * 0.42, Math.min(pw * 0.85, ph * 0.78), { depth: 21 });
                animal.cont.setVisible(false);
                var hoja = self.add.container(-pw / 2, -ph);
                var g = self.add.graphics();
                g.fillStyle(0x8c3b1a, 1);
                g.fillRoundedRect(0, 0, pw, ph, 4);
                g.lineStyle(5, 0xf8f9fa, 1);
                g.strokeRect(4, 4, pw - 8, ph - 8);
                g.lineBetween(6, 6, pw - 6, ph - 6);
                g.lineBetween(pw - 6, 6, 6, ph - 6);
                g.fillStyle(0xffd43b, 1);
                g.fillCircle(pw - 16, ph * 0.55, 8);
                g.fillStyle(0x5c3317, 1);
                g.fillCircle(8, ph * 0.18, 5);
                g.fillCircle(8, ph * 0.82, 5);
                hoja.add(g);
                var cartel = self.add.container(0, -ph - pw * 0.34);
                var tabla = self.add.rectangle(0, 0, pw * 0.78, pw * 0.58, 0xf1c27d)
                    .setStrokeStyle(4, 0x8c5a2b);
                var img = self.add.image(0, 0, 'el_' + id);
                img.setScale(pw * 0.5 / Math.max(img.width, img.height));
                cartel.add([tabla, img]);
                cartel.setScale(conCartel ? 1 : 0);
                c.add([hueco, luz, cartel]);
                var hc = self.add.container(cx, base).setDepth(49);
                hc.add(hoja);
                return {
                    id: id, cont: c, hojaCont: hc, hoja: hoja, cartel: cartel,
                    animal: animal, ojos: ojos, luz: luz,
                    x: cx, y: base - ph / 2, w: pw, h: ph, abierta: false
                };
            });
            this.mostrarOjosNoche(this.noche > 0.5);
        },

        mostrarOjosNoche: function (si) {
            this.puertas.forEach(function (p) {
                if (p.ojos) p.ojos.setAlpha(si ? 0.95 : 0);
                if (p.luz) p.luz.setFillStyle(0xffe066, si ? 0.35 : 0);
            });
        },

        abrir: function (p, si, ms) {
            p.abierta = si;
            K.ruido({ f: si ? 380 : 220, q: 0.7, dur: 0.28, vol: 0.1 });
            if (si) {
                Ut.estallido(this, p.x + p.w * 0.2, p.y, {
                    n: 6, tex: 'estrella', tam: 10, dist: 40, sinTinte: true, depth: 56
                });
            }
            return tw(this, {
                targets: p.hoja,
                scaleX: si ? 0.07 : 1,
                angle: si ? -10 : 0,
                duration: ms || 360,
                ease: si ? 'Cubic.easeOut' : 'Back.easeIn'
            });
        },

        prepararNivel: async function (i, nv) {
            var self = this;
            this.abriendo = false;
            this.apuntada = null;
            await Promise.all(this.puertas.map(function (p) {
                return p.abierta ? self.abrir(p, false) : null;
            }));
            await this.ponerNoche(1, 900);
            this.armarPuertas(nv.opciones, false);
        },

        alSonar: function () {
            var self = this;
            // El establo entero tiembla; ojos parpadean; faroles pulsan.
            this.puertas.forEach(function (p) {
                self.tweens.add({
                    targets: p.hoja, angle: { from: -2, to: 2 },
                    duration: 70, yoyo: true, repeat: 3
                });
                if (p.ojos) {
                    self.tweens.add({
                        targets: p.ojos, scale: 1.25, duration: 120, yoyo: true, repeat: 2
                    });
                }
                if (p.luz) {
                    self.tweens.add({
                        targets: p.luz, fillAlpha: 0.7, duration: 100, yoyo: true
                    });
                }
            });
            if (this.establoImg) {
                this.tweens.add({
                    targets: this.establoImg, x: this.establoImg.x + 3,
                    duration: 50, yoyo: true, repeat: 4
                });
            }
            this.cameras.main.shake(160, 0.004);
            K.ruido({ f: 90, q: 0.4, dur: 0.25, vol: 0.06 });
        },

        mostrarOpciones: async function () {
            var self = this;
            K.tono({ f: 520, f2: 880, dur: 0.5, vol: 0.04 });
            this.mostrarOjosNoche(false);
            await this.ponerNoche(0, 1100);
            for (var i = 0; i < this.puertas.length; i++) {
                K.ruido({ f: 1500, q: 1, dur: 0.06, vol: 0.05 });
                this.tweens.add({
                    targets: this.puertas[i].cartel, scale: 1,
                    duration: 320, ease: 'Back.easeOut'
                });
                await esperar(this, 130);
            }
        },

        puertaEn: function (x, y) {
            return this.puertas.filter(function (p) {
                return !p.abierta &&
                    Math.abs(x - p.x) < p.w * 0.65 &&
                    y > p.y - p.h * 0.95 &&
                    y < p.y + p.h * 0.55;
            })[0];
        },

        alTocar: function (p) {
            if (this.fase !== 'jugar' || this.abriendo) return;
            var q = this.puertaEn(p.x, p.y);
            if (!q) return;
            this.arrastrando = { q: q, x0: p.x, t: this.time.now };
            this.pista.reiniciar();
            K.tono({ f: 400, f2: 520, dur: 0.05, vol: 0.03 });
        },

        alMover: function (p) {
            if (this.fase === 'jugar' && !this.arrastrando && !this.abriendo) {
                this.apuntada = this.puertaEn(p.x, p.y);
            }
            var r = this.arrastrando;
            if (!r) return;
            var k = Math.max(0, Math.min(1, Math.abs(p.x - r.x0) / (r.q.w * 0.85)));
            // También abre si se arrastra hacia abajo (tirar de la hoja).
            var ky = Math.max(0, Math.min(1, (p.y - r.q.y) / (r.q.h * 0.6)));
            k = Math.max(k, ky * 0.7);
            r.q.hoja.scaleX = 1 - k * 0.93;
            r.q.hoja.angle = -k * 10;
            if (k > 0.15 && this.time.now - (this.zumbido || 0) > 70) {
                this.zumbido = this.time.now;
                K.ruido({ f: 900, q: 2, dur: 0.03, vol: 0.02 });
            }
        },

        alSoltar: async function () {
            var r = this.arrastrando;
            this.arrastrando = null;
            if (!r || this.fase !== 'jugar' || this.abriendo) return;
            var q = r.q;
            var abierta = q.hoja.scaleX < 0.55;
            var hold = this.time.now - r.t > 480 && Math.abs(q.hoja.scaleX - 1) < 0.08;
            if (!abierta && !hold) {
                await this.abrir(q, false, 160);
                return;
            }
            this.abriendo = true;
            await this.abrir(q, true);
            this.tocado = q;
            var ok = await this.elegir(q.id, { x: q.x, y: q.y });
            if (ok === false) {
                await esperar(this, 280);
                q.animal.cont.setVisible(false);
                await this.abrir(q, false, 220);
                this.cameras.main.shake(120, 0.006);
            }
            this.abriendo = false;
        },

        alAcertar: async function () {
            var q = this.tocado;
            var a = q.animal;
            var L = this.L;
            a.cont.setVisible(true).setDepth(53);
            await this.saltarA(
                a.cont,
                L.W * 0.78,
                L.y0 + (L.H - L.y0) * 0.4,
                { ms: 480, alto: 70 }
            );
            this.reunidos.push(q.id);
            await Promise.all([this.sonar(q.id, { bocina: false }), a.saltito(0.22, 3)]);
            Ut.estallido(this, a.cont.x, a.cont.y, {
                n: 10, tex: 'corazon', tam: 16, dist: 70, depth: 40
            });
        },

        alFallar: async function () {
            var q = this.tocado;
            q.animal.cont.setVisible(true).setDepth(51);
            await q.animal.sacudir();
            K.ruido({ f: 160, q: 1, dur: 0.2, vol: 0.08 });
        },

        alTerminarNivel: async function () {
            var q = this.tocado;
            this.apuntada = null;
            if (q && q.animal) {
                await this.saltarA(q.animal.cont, q.x, q.y + q.h * 0.08, { ms: 360, alto: 40 });
                q.animal.cont.setVisible(false);
                await this.abrir(q, false);
            }
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando || this.abriendo) return Promise.resolve();
            if (!this.ayuda) return this.pistaBocina();
            var q = this.puertas.filter(function (p) {
                return self.respuestas().indexOf(p.id) >= 0 && !p.abierta;
            })[0];
            if (!q) return Promise.resolve();
            return this.ctx.mano({
                punto: { x: q.x, y: q.y },
                holdMs: 420,
                arrastre: { dx: q.w * 0.7, dy: 0, durMs: 600 },
                cancelado: function () { return cancelada() || self.fase !== 'jugar'; }
            });
        },

        escenaFinal: async function () {
            var self = this;
            var L = this.L;
            var vistos = {};
            var ids = this.reunidos.filter(function (id) {
                if (vistos[id]) return false;
                vistos[id] = 1;
                return true;
            });
            this.armarPuertas(ids.length ? ids : ['gallo'], true);
            await this.ponerNoche(0, 280);
            await Promise.all(this.puertas.map(function (q, i) {
                return esperar(self, i * 140).then(function () { return self.abrir(q, true); });
            }));
            for (var i = 0; i < this.puertas.length; i++) {
                var q = this.puertas[i];
                q.animal.cont.setVisible(true).setDepth(53);
                await this.saltarA(
                    q.animal.cont,
                    L.W * (0.55 + i * 0.12),
                    L.y0 + (L.H - L.y0) * 0.4,
                    { ms: 380, alto: 55 }
                );
                this.sonar(q.id, { breve: true, bocina: false });
                q.animal.saltito(0.2, 2);
                await esperar(this, 380);
                if (!this.sigue()) return;
            }
            Ut.estallido(this, L.W * 0.7, L.establo.y, {
                n: 18, tex: 'corazon', tam: 26, dist: 180, jump: 60
            });
            await esperar(this, 1000);
        },

        demoPaso: function () {
            var self = this;
            var r = this.respuestas();
            var q = this.puertas.filter(function (p) { return r.indexOf(p.id) >= 0; })[0];
            if (!q) return null;
            return {
                desde: { x: q.x, y: q.y },
                hasta: { x: q.x + q.w * 0.75, y: q.y },
                hacer: async function () {
                    self.arrastrando = { q: q, x0: q.x, t: self.time.now };
                    q.hoja.scaleX = 0.2;
                    q.hoja.angle = -8;
                    await self.alSoltar();
                }
            };
        },

        dibujarMira: function () {
            var g = this.miraG;
            if (!g) return;
            g.clear();
            if (this.fase !== 'jugar' || this.abriendo || this.arrastrando) return;
            var q = this.apuntada;
            if (!q || q.abierta) return;
            g.lineStyle(4, 0xffe066, 0.9);
            g.strokeRoundedRect(q.x - q.w * 0.55, q.y - q.h * 0.55, q.w * 1.1, q.h * 1.1, 10);
            g.lineStyle(2, 0xffffff, 0.5);
            g.strokeCircle(q.x + q.w * 0.35, q.y, 10);
        },

        paso: function (time, delta) {
            var self = this;
            var dt = (delta || 16) / 1000;
            this.dibujarMira();
            if (this.veleta && !this.tweens.isTweening(this.veleta)) {
                this.veleta.angle = Math.sin(time / 480) * 18;
            }
            if (this.farolesGranja) {
                var pulso = this.sonando ? 1.5 : 1;
                var luz = 0.7 + Math.sin(time / 150) * 0.3;
                this.farolesGranja.forEach(function (f) {
                    f.setAlpha(this.noche > 0.4 ? luz : 0.35);
                    f.setScale(pulso);
                }, this);
            }
            if (this.humo) {
                this.humo.forEach(function (h, i) {
                    h.y -= 12 * dt;
                    h.x += Math.sin(time / 400 + i) * 8 * dt;
                    h.setAlpha(0.22 - i * 0.03);
                    if (h.y < self.L.establo.y - self.L.establo.h * 0.5) {
                        h.y = self.L.establo.y - self.L.establo.h * 0.12;
                        h.x = self.L.establo.x + self.L.establo.w * 0.74;
                    }
                });
            }
            // Gallinas picotean de día.
            if (this.noche < 0.5) {
                this.gallinas.forEach(function (g) {
                    g.fase += dt * 2.2;
                    g.x += g.vx * dt;
                    g.y += Math.sin(g.fase) * 10 * dt;
                    g.angle = Math.sin(g.fase * 2) * 8;
                    if (g.x < g.x0 - 40) g.vx = Math.abs(g.vx);
                    if (g.x > g.x0 + 50) g.vx = -Math.abs(g.vx);
                    g.scaleX = g.vx < 0 ? -1 : 1;
                });
            }
            // Ojos parpadean de noche.
            if (this.noche > 0.5 && this.puertas) {
                this.puertas.forEach(function (p, i) {
                    if (!p.ojos || p.abierta) return;
                    p.ojos.setAlpha(0.55 + Math.sin(time / 280 + i) * 0.4);
                });
            }
        },

        estadoExtra: function () {
            return {
                puertas: this.puertas.map(function (p) {
                    return { id: p.id, x: Math.round(p.x), y: Math.round(p.y), abierta: p.abierta };
                })
            };
        }
    };

    K.crear({ id: 'granja', fondo: '#a5d8ff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
