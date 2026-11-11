/**
 * «El tren de los sonidos» — motor propio de ¿Qué sonido desapareció? (3-4 años).
 * Llega un tren con vagones tapados: cada vagón se sacude y se ilumina cuando suena su sonido (sin
 * mostrar qué lleva). El tren se va y vuelve con un vagón menos y un vagón vacío al final. En el andén
 * esperan todos; el niño ARRASTRA al que se perdió hasta el vagón vacío y el tren pita contento.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    var COLORES = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xcc5de8, 0xff922b];

    function agregarRuedas(scene, padre, ww, wh, acum) {
        [-0.3, 0.3].forEach(function (fx) {
            var rw = scene.add.container(fx * ww, wh * 0.14);
            var g = scene.add.graphics();
            var r = wh * 0.19;
            g.fillStyle(0x212529, 1);
            g.fillCircle(0, 0, r);
            g.lineStyle(2, 0x868e96, 1);
            for (var s = 0; s < 8; s++) {
                var ang = s * Math.PI / 4;
                g.lineBetween(Math.cos(ang) * r * 0.2, Math.sin(ang) * r * 0.2, Math.cos(ang) * r * 0.92, Math.sin(ang) * r * 0.92);
            }
            g.fillStyle(0xadb5bd, 1);
            g.fillCircle(0, 0, r * 0.38);
            g.fillStyle(0x495057, 1);
            g.fillCircle(0, 0, r * 0.14);
            rw.add(g);
            padre.add(rw);
            acum.push(rw);
        });
    }

    function pintarLocomotora(g, lw, lh) {
        g.fillStyle(0x212529, 1);
        g.fillRoundedRect(-lw * 0.08, lh * 0.05, lw * 0.92, lh * 0.22, lh * 0.1);
        g.fillStyle(0x1e6f3a, 1);
        g.fillRoundedRect(-lw * 0.52, -lh * 0.82, lw * 0.58, lh * 0.72, 8);
        g.fillStyle(0x157347, 1);
        g.fillRoundedRect(-lw * 0.48, -lh * 0.38, lw * 0.5, lh * 0.28, 6);
        g.fillStyle(0xe03131, 1);
        g.fillRoundedRect(-lw * 0.54, -lh * 1.22, lw * 0.46, lh * 0.48, 8);
        g.fillStyle(0xc92a2a, 1);
        g.fillTriangle(lw * 0.38, -lh * 0.05, lw * 0.38, lh * 0.12, lw * 0.58, lh * 0.12);
        g.fillStyle(0x343a40, 1);
        g.fillRect(lw * 0.08, -lh * 1.35, lw * 0.14, lh * 0.52);
        g.fillStyle(0x495057, 1);
        g.fillRect(lw * 0.09, -lh * 1.38, lw * 0.12, lh * 0.12);
        g.fillStyle(0xa5d8ff, 0.85);
        g.fillRoundedRect(-lw * 0.44, -lh * 1.12, lw * 0.28, lh * 0.26, 5);
        g.lineStyle(2, 0x495057, 1);
        g.strokeRoundedRect(-lw * 0.44, -lh * 1.12, lw * 0.28, lh * 0.26, 5);
        g.fillStyle(0xffd43b, 1);
        g.fillCircle(lw * 0.46, -lh * 0.42, lh * 0.09);
        g.fillStyle(0xfff3bf, 0.9);
        g.fillCircle(lw * 0.46, -lh * 0.42, lh * 0.05);
        g.lineStyle(3, 0x343a40, 1);
        g.lineBetween(-lw * 0.02, -lh * 0.05, lw * 0.36, -lh * 0.05);
    }

    var escena = {
        iniciar: function () {
            this.cosas = [];
            this.tren = null;
            this.reunidos = [];
            this.humo = 0;
            this.humoVel = 0;
            this.ruedasGirar = [];
            this.semaforos = [];
            this.arrastreCerca = false;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.pres = W >= 900 ? { x: W - 88, piso: H - 110, alto: Math.min(165, H * 0.28), modelo: 'nina', giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.via = Math.round(H * 0.48);
            L.tam = Math.max(60, Math.min(120, (L.der - 20) / 5.2, H * 0.16));
            L.anden = { y: L.via + L.tam * 0.55, h: H - (L.via + L.tam * 0.55) };
            L.fila = L.anden.y + L.anden.h * 0.46;
            L.bocina = { x: 48, y: L.via - L.tam * 0.22, r: Math.max(24, Math.min(32, hueco * 0.28)) };
            L.reloj = { x: L.der * 0.12, y: L.via - L.tam * 1.15 };
            L.semaforo = { x: L.der - 52, y: L.via - L.tam * 0.35 };
            return L;
        },

        montarEstacion: function (keep) {
            var self = this;
            var L = this.L;
            K.textura(this, 'tren_estacion', L.W, L.H, function (x, w, h) {
                var grad = x.createLinearGradient(0, 0, 0, h);
                grad.addColorStop(0, '#4c6ef5');
                grad.addColorStop(0.35, '#74c0fc');
                grad.addColorStop(0.55, '#dee2e6');
                grad.addColorStop(1, '#adb5bd');
                x.fillStyle = grad;
                x.fillRect(0, 0, w, h);

                var horizonte = L.via - L.tam * 0.55;
                var torres = ['#748ffc', '#9775fa', '#4dabf7', '#f783ac', '#ffa94d', '#63e6be', '#69db7c'];
                for (var b = 0; b < 11; b++) {
                    var bw = w / 11;
                    var bh = h * (0.1 + ((b * 5) % 6) * 0.028);
                    x.fillStyle = '#343a40';
                    K.rr(x, b * bw + 2, horizonte - bh - 6, bw - 4, bh + 10, 4);
                    x.fill();
                    x.fillStyle = torres[b % torres.length];
                    K.rr(x, b * bw + 5, horizonte - bh, bw - 10, bh, 5);
                    x.fill();
                    x.fillStyle = 'rgba(255,243,191,0.85)';
                    for (var wy = 0; wy < 3; wy++) {
                        for (var wx = 0; wx < 2; wx++) {
                            var py = horizonte - bh + 14 + wy * (bh / 3.8);
                            if (py < horizonte - 8) {
                                x.fillRect(b * bw + bw * (0.22 + wx * 0.38), py, bw * 0.18, bh * 0.11);
                            }
                        }
                    }
                }

                x.fillStyle = 'rgba(15,23,42,0.35)';
                x.fillRect(0, horizonte, w, h * 0.08);

                var techoY = L.via - L.tam * 1.02;
                x.fillStyle = '#e03131';
                x.fillRect(8, techoY, w - 16, 16);
                x.fillStyle = '#c92a2a';
                x.fillRect(8, techoY + 14, w - 16, 6);
                var pilares = [0.08, 0.22, 0.42, 0.62, 0.82, 0.94];
                pilares.forEach(function (px) {
                    x.fillStyle = '#495057';
                    x.fillRect(w * px - 5, techoY + 18, 10, L.anden.y - techoY - 10);
                });

                x.fillStyle = 'rgba(255,255,255,0.55)';
                K.rr(x, w * 0.68, techoY - h * 0.09, w * 0.24, h * 0.085, 6);
                x.fill();
                x.fillStyle = '#1864ab';
                x.font = 'bold 13px sans-serif';
                x.textAlign = 'center';
                x.fillText('ESTACIÓN', w * 0.8, techoY - h * 0.045);

                x.fillStyle = '#fcc419';
                x.fillRect(0, L.anden.y, w, 9);
                x.fillStyle = '#dee2e6';
                x.fillRect(0, L.anden.y + 9, w, h - L.anden.y - 9);
                x.strokeStyle = 'rgba(0,0,0,0.06)';
                x.lineWidth = 2;
                for (var bx = 0; bx < w; bx += 44) {
                    x.beginPath();
                    x.moveTo(bx, L.anden.y + 12);
                    x.lineTo(bx, h);
                    x.stroke();
                }
                [[0.76, 0.92], [0.86, 0.94]].forEach(function (p) {
                    var bx = w * p[0], by = L.anden.y + L.anden.h * 0.55;
                    x.fillStyle = '#8c5a2b';
                    K.rr(x, bx - 36, by - 10, 72, 14, 4);
                    x.fill();
                    x.fillStyle = '#495057';
                    x.fillRect(bx - 34, by - 28, 6, 22);
                    x.fillRect(bx + 28, by - 28, 6, 22);
                });

                var vy = L.tam * 0.55;
                x.fillStyle = '#6d4c41';
                x.fillRect(0, vy - 10, w, 30);
                for (var dx = 0; dx < w; dx += 20) x.fillRect(dx, vy - 12, 11, 28);
                x.fillStyle = '#868e96';
                x.fillRect(0, vy - 6, w, 5);
                x.fillRect(0, vy + 14, w, 5);
            });
            keep(this.add.image(0, 0, 'tren_estacion').setOrigin(0, 0).setDepth(1));

            var sem = keep(this.add.graphics().setDepth(12));
            var S = L.semaforo;
            sem.fillStyle(0x343a40, 1);
            sem.fillRect(S.x - 5, S.y - 52, 10, 70);
            sem.fillStyle(0x212529, 1);
            K.rr(sem, S.x - 18, S.y - 68, 36, 72, 8);
            sem.fill();
            var luces = [
                keep(this.add.circle(S.x, S.y - 48, 9, 0xe03131, 0.35).setDepth(13)),
                keep(this.add.circle(S.x, S.y - 22, 9, 0xffd43b, 0.9).setDepth(13)),
                keep(this.add.circle(S.x, S.y + 4, 9, 0x2f9e44, 0.35).setDepth(13))
            ];
            this.semaforos = luces;

            var reloj = keep(this.add.graphics().setDepth(11));
            var R = L.reloj;
            reloj.fillStyle(0x495057, 1);
            reloj.fillRect(R.x + 8, R.y, 6, L.via - R.y - L.tam * 0.35);
            reloj.fillStyle(0xffffff, 1);
            reloj.fillCircle(R.x, R.y, 20);
            reloj.fillStyle(0x212529, 1);
            reloj.fillCircle(R.x, R.y, 3);
            reloj.lineStyle(2, 0x212529, 1);
            reloj.lineBetween(R.x, R.y, R.x, R.y - 12);
            reloj.lineBetween(R.x, R.y, R.x + 9, R.y + 2);
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            this.ruedasGirar = [];
            this.semaforos = [];
            this.montarEstacion(keep);
            this.sembrarMotes(keep, 14, { x: 0, y: 0, w: L.W, h: L.via - L.tam * 0.2, depth: 5 }, 0xfff3bf);
            this.montarHud(keep);
            if (reubicar && this.tren) this.tren.cont.setY(L.via);
        },

        /* ── El tren ── */

        armarTren: function (n, vacio) {
            var self = this;
            var L = this.L;
            if (this.tren) this.tren.cont.destroy();
            this.ruedasGirar = [];
            var ww = Math.min(L.tam * 0.95, (L.der - 40) / (n + 2.4));
            var wh = ww * 0.7;
            var c = this.add.container(-L.W, L.via).setDepth(20);
            var vagones = [];
            var total = n + (vacio ? 1 : 0);

            for (var i = 0; i < total; i++) {
                var esVacio = vacio && i === total - 1;
                var v = this.add.container(-(i + 1) * (ww + 8), 0);
                var g = this.add.graphics();
                var col = COLORES[i % COLORES.length];
                agregarRuedas(this, v, ww, wh, this.ruedasGirar);

                if (esVacio) {
                    g.fillStyle(0x5c3d1e, 1);
                    g.fillRoundedRect(-ww / 2, -wh * 0.32, ww, wh * 0.22, 4);
                    g.lineStyle(3, 0xffd43b, 0.55);
                    g.strokeRoundedRect(-ww / 2, -wh * 0.98, ww, wh * 0.88, 8);
                    g.lineStyle(2, 0xffd43b, 0.35);
                    for (var dash = -ww * 0.4; dash < ww * 0.4; dash += 12) {
                        g.strokeRect(dash, -wh * 0.75, 8, wh * 0.5);
                    }
                    var brillo = this.add.ellipse(0, -wh * 0.52, ww * 1.05, wh * 1.1, 0xfff3bf, 0.12);
                    var marco = this.add.graphics();
                    marco.lineStyle(4, 0xffd43b, 0.4);
                    marco.strokeRoundedRect(-ww / 2 - 4, -wh - 4, ww + 8, wh * 0.9 + 8, 10);
                    v.add([brillo, marco, g]);
                    v.brillo = brillo;
                    v.marco = marco;
                } else {
                    g.fillStyle(col, 1);
                    g.fillRoundedRect(-ww / 2, -wh, ww, wh * 0.85, 8);
                    g.fillStyle(0xffffff, 0.22);
                    g.fillRect(-ww / 2 + 5, -wh + 5, ww - 10, wh * 0.07);
                    g.fillStyle(0xf1f3f5, 1);
                    g.fillRoundedRect(-ww * 0.44, -wh * 1.18, ww * 0.88, wh * 0.4, wh * 0.18);
                    g.lineStyle(2, 0xadb5bd, 1);
                    g.lineBetween(-ww * 0.3, -wh * 1.1, -ww * 0.3, -wh * 0.8);
                    g.lineBetween(ww * 0.3, -wh * 1.1, ww * 0.3, -wh * 0.8);
                    g.lineStyle(2, 0x868e96, 0.6);
                    g.strokeRoundedRect(-ww * 0.44, -wh * 1.18, ww * 0.88, wh * 0.4, wh * 0.18);
                }
                g.lineStyle(3, 0x495057, 1);
                g.lineBetween(ww / 2, -wh * 0.25, ww / 2 + 8, -wh * 0.25);

                var luz = this.add.ellipse(0, -wh * 0.62, ww * 1.25, wh * 1.35, 0xfff3bf, 0);
                var resplandorLona = this.add.ellipse(0, -wh * 0.95, ww * 0.75, wh * 0.35, 0xfff3bf, 0);
                v.add([luz, resplandorLona, g]);
                v.luz = luz;
                v.resplandor = resplandorLona;
                v.vacio = esVacio;
                v.g = g;
                vagones.push(v);
                c.add(v);
            }

            var lw = ww * 1.3, lh = wh * 1.22;
            var locoC = this.add.container(0, 0);
            var loco = this.add.graphics();
            pintarLocomotora(loco, lw, lh);
            agregarRuedas(this, locoC, lw * 0.55, lh * 0.95, this.ruedasGirar);
            agregarRuedas(this, locoC, lw * 0.2, lh * 0.95, this.ruedasGirar);
            locoC.add(loco);
            var maquinista = K.nino(this, -lw * 0.32, -lh * 0.92, 0, { ropa: 0x364fc7, gorra: 1, esc: 0.95 });
            locoC.add(maquinista);
            c.add(locoC);
            this.locoC = locoC;

            this.tren = { cont: c, vagones: vagones, ww: ww, wh: wh, largo: total * (ww + 8) + lw };
            this.chimenea = { dx: lw * 0.12, dy: -lh * 1.32 };
            return this.tren;
        },

        andar: function (x0, x1, ms) {
            var t = this.tren;
            t.cont.x = x0;
            this.humo = 1;
            this.humoVel = Math.max(0.6, 1400 / ms);
            var self = this;
            K.ruido({ f: 260, q: 0.9, dur: Math.min(1.2, ms / 1000), vol: 0.07 });
            return tw(this, { targets: t.cont, x: x1, duration: ms, ease: 'Sine.easeInOut' }).then(function () {
                self.humo = 0;
                self.humoVel = 0;
            });
        },

        silbato: function () { K.tono({ f: 880, f2: 1040, dur: 0.35, vol: 0.06, tipo: 'triangle' }); },

        centroTren: function () {
            var L = this.L;
            return L.der / 2 + this.tren.largo / 2 - this.tren.ww * 0.4;
        },

        marcarVacio: function (cerca) {
            if (!this.tren) return;
            var v = this.tren.vagones.filter(function (q) { return q.vacio; })[0];
            if (!v || !v.brillo) return;
            if (cerca === this.arrastreCerca) return;
            this.arrastreCerca = cerca;
            this.tweens.killTweensOf([v.brillo, v.marco]);
            if (cerca) {
                this.tweens.add({
                    targets: v.brillo, fillAlpha: 0.72, scaleX: 1.12, scaleY: 1.12,
                    duration: 160, ease: 'Sine.easeOut'
                });
                this.tweens.add({
                    targets: v.marco, alpha: 1,
                    duration: 160
                });
                this.tweens.add({
                    targets: v, y: -4, duration: 100, yoyo: true, repeat: 2
                });
            } else {
                this.tweens.add({
                    targets: v.brillo, fillAlpha: 0.12, scaleX: 1, scaleY: 1,
                    duration: 220, ease: 'Sine.easeOut'
                });
                this.tweens.add({
                    targets: v.marco, alpha: 0.38, duration: 220
                });
            }
        },

        prepararNivel: async function (i, nv) {
            await this.retirar(this.cosas);
            this.cosas = [];
            this.armarTren(nv.reproducciones[0].length, false);
            this.silbato();
            await this.andar(-this.L.W * 0.2, this.centroTren(), 1500);
        },

        alSonar: function (id, k) {
            var t = this.tren;
            var vs = t.vagones.filter(function (v) { return !v.vacio; });
            var v = vs[vs.length - 1 - k];
            if (!v) return;
            this.tweens.killTweensOf([v.luz, v.resplandor, v]);
            this.tweens.add({ targets: v.luz, fillAlpha: 0.75, duration: 140, yoyo: true, hold: 520 });
            this.tweens.add({ targets: v.resplandor, fillAlpha: 0.55, duration: 160, yoyo: true, hold: 480 });
            this.tweens.add({ targets: v, y: -10, angle: 2.5, duration: 95, yoyo: true, repeat: 3, ease: 'Sine.easeInOut' });
            if (v.g) {
                this.tweens.add({ targets: v.g, scaleX: 1.04, duration: 120, yoyo: true, repeat: 2 });
            }
        },

        alTerminarVuelta: async function (v) {
            if (v !== 0) return;
            this.silbato();
            await this.andar(this.tren.cont.x, this.L.W + this.tren.largo, 1300);
        },

        alSegundaVuelta: async function () {
            var nv = this.nv;
            this.armarTren(nv.reproducciones[1].length, true);
            await esperar(this, 300);
            await this.andar(-this.tren.largo, this.centroTren(), 1600);
        },

        lugares: function (n) {
            var L = this.L;
            var out = [];
            var margen = Math.max(56, L.tam * 0.45);
            for (var i = 0; i < n; i++) out.push({ x: margen + (L.der - margen * 2) * (i + 0.5) / n, y: L.fila });
            return out;
        },

        mostrarOpciones: async function (nv) {
            var tam = Math.min(this.L.tam, (this.L.der - 40) / nv.opciones.length * 0.85);
            this.cosas = await this.filaDeCosas(nv.opciones, this.lugares(nv.opciones.length), tam, { depth: 30 });
        },

        alReescuchar: function (empieza) {
            if (!empieza) return;
            this.armarTren(this.nv.reproducciones[0].length, false);
            this.tren.cont.x = this.centroTren();
        },

        vagonVacio: function () {
            var t = this.tren;
            var v = t.vagones.filter(function (q) { return q.vacio; })[0];
            return v ? { x: t.cont.x + v.x, y: t.cont.y + v.y - t.wh * 0.55, ww: t.ww } : null;
        },

        alTocar: function (p) {
            if (this.fase !== 'jugar') return;
            if (!this.tomar(p, this.cosas)) {
                var b = this.cosaEn(this.cosas, p.x, p.y);
                if (b && !this.sonando) this.sonar(b.id, { breve: true, bocina: false });
            }
        },

        alMover: function (p) {
            var a = this.llevar(p);
            if (!a) {
                this.marcarVacio(false);
                return;
            }
            var d = this.vagonVacio();
            var cerca = d && Math.hypot(a.cont.x - d.x, a.cont.y - d.y) < (d.ww || this.tren.ww) * 1.02;
            this.marcarVacio(!!cerca);
        },

        alSoltar: async function () {
            var a = this.soltar();
            this.marcarVacio(false);
            if (!a) return;
            var d = this.vagonVacio();
            var radio = d ? (d.ww || this.tren.ww) * 0.92 : 0;
            if (!d || Math.hypot(a.cont.x - d.x, a.cont.y - d.y) > radio || this.fase !== 'jugar') {
                this.aCasa(a, true);
                return;
            }
            this.tocado = a;
            var ok = await this.elegir(a.id, d);
            if (ok === false) this.aCasa(a, true);
        },

        alAcertar: async function () {
            var a = this.tocado;
            var d = this.vagonVacio();
            var t = this.tren;
            await this.saltarA(a.cont, d.x, d.y, { ms: 380, alto: 40, esc: t.ww * 0.95 / a.tam });
            t.cont.add(a.cont);
            a.cont.setPosition(a.cont.x - t.cont.x, a.cont.y - t.cont.y);
            a.usada = true;
            this.reunidos.push(a.id);
            K.ruido({ f: 1800, q: 3, dur: 0.06, vol: 0.1 });
            this.silbato();
            await Promise.all([this.sonar(a.id, { breve: true, bocina: false }), tw(this, { targets: t.cont, x: t.cont.x + 14, duration: 180, yoyo: true })]);
        },

        alFallar: async function () { if (this.tocado) await this.tocado.sacudir(); },

        alTerminarNivel: async function () {
            this.retirar(this.cosas.filter(function (a) { return !a.usada; }));
            this.cosas = [];
            this.silbato();
            await this.andar(this.tren.cont.x, this.L.W + this.tren.largo, 1400);
        },

        mostrarPista: function (cancelada) {
            var d = this.vagonVacio();
            return d ? this.pistaArrastre(cancelada, this.cosas, d) : Promise.resolve();
        },

        escenaFinal: async function () {
            var self = this;
            var L = this.L;
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; });
            var t = this.armarTren(ids.length, false);
            ids.forEach(function (id, i) {
                var v = t.vagones[ids.length - 1 - i];
                var a = self.crearCosa(id, v.x, -t.wh * 1.35, t.ww * 0.95, { sinSombra: true });
                t.cont.add(a.cont);
                a.cont.setPosition(v.x, -t.wh * 1.35);
            });
            this.silbato();
            await this.andar(-t.largo, this.centroTren(), 1800);
            for (var i = 0; i < ids.length; i++) {
                this.alSonar(ids[i], i);
                await this.sonar(ids[i], { breve: true, bocina: false });
                if (!this.sigue()) return;
            }
            this.silbato();
            await this.andar(t.cont.x, L.W + t.largo, 1800);
        },

        demoPaso: function () {
            return this.pasoArrastre(this.correctaDe(this.cosas), this.vagonVacio());
        },

        estadoExtra: function () {
            var d = this.tren ? this.vagonVacio() : null;
            return {
                vacio: d ? { x: Math.round(d.x), y: Math.round(d.y) } : null,
                cosas: this.cosas.filter(function (a) { return !a.usada && a.cont.active; }).map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y) }; })
            };
        },

        paso: function (time, delta) {
            var t = this.tren;
            if (t && t.cont) {
                if (this.humo) {
                    t.cont.angle = Math.sin(time / 52) * 0.52;
                    t.cont.y = this.L.via + Math.sin(time / 38) * 2.8;
                } else {
                    t.cont.angle = Math.sin(time / 520) * 0.06;
                    t.cont.y = this.L.via;
                }
            }
            if (this.ruedasGirar.length) {
                var vel = this.humo ? (this.humoVel || 1) * (delta || 16) * 0.028 : (delta || 16) * 0.004;
                this.ruedasGirar.forEach(function (r) { r.angle += vel; });
            }
            (this.semaforos || []).forEach(function (l, i) {
                if (!l || !l.scene) return;
                var base = i === 1 ? 0.85 : 0.32;
                l.setAlpha(base + Math.sin(time / (220 + i * 40)) * 0.18);
            });
            if (!this.humo || !this.tren || time - (this.ultHumo || 0) < Math.max(55, 180 - (this.humoVel || 1) * 70)) return;
            this.ultHumo = time;
            var humoX = t.cont.x + this.chimenea.dx;
            var humoY = t.cont.y + this.chimenea.dy;
            var n = Math.round(1 + (this.humoVel || 1) * 1.5);
            Ut.estallido(this, humoX, humoY, {
                n: n, tex: 'humo', tam: 20 + (this.humoVel || 1) * 8,
                dist: 32 + (this.humoVel || 1) * 22, angulo: -Math.PI / 2, abanico: 0.75, depth: 25
            });
        }
    };

    K.crear({ id: 'tren', fondo: '#a5d8ff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
