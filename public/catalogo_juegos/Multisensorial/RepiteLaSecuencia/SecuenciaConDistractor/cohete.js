/**
 * «El cohete de los sonidos» — motor propio de Secuencia con Distractor (3-4 años).
 *
 * En la base de lanzamiento hay un cohete con compartimientos vacíos, uno por sonido. Mientras
 * suenan los sonidos, las luces de la torre parpadean (no delatan cuáles son). Después flotan
 * cápsulas con TODAS las opciones (también un distractor que no sonó) y el niño ARRASTRA al cohete
 * solo las que escuchó, en el mismo orden: cada una ocupa el siguiente compartimiento. Si sube una
 * cápsula equivocada o fuera de orden, el cohete no la acepta, las cápsulas salen y la secuencia
 * suena otra vez. Al completar, cuenta regresiva y despegue.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    var estrellasFijas = [];
    for (var s = 0; s < 70; s++) estrellasFijas.push([((s * 137) % 1000) / 1000, ((s * 59) % 1000) / 1000, 1 + (s % 3)]);

    var escena = {
        iniciar: function () {
            this.cosas = [];
            this.cohete = null;
            this.reunidos = [];
            this.llama = 0;
            this.luces = [];
            this.lucesOn = 0;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), modelo: 'nina', giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.suelo = Math.round(H * 0.84);
            L.tam = Math.max(80, Math.min(120, (L.der - W * 0.45) / 3.3, H * 0.17));
            L.cx = Math.round(W * 0.27);
            L.bocina = { x: 48, y: Math.round(H * 0.2), r: Math.max(24, Math.min(32, hueco * 0.28)) };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            K.textura(this, 'cohete_fondo', L.W, L.H, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#1c2b6b'); g.addColorStop(0.55, '#4c4ca8'); g.addColorStop(1, '#a77bd6');
                x.fillStyle = g; x.fillRect(0, 0, w, h);
                estrellasFijas.forEach(function (e) {
                    x.fillStyle = 'rgba(255,255,255,' + (0.5 + e[2] * 0.15) + ')';
                    x.beginPath(); x.arc(e[0] * w, e[1] * (h * 0.78), e[2] * 0.9, 0, Math.PI * 2); x.fill();
                });
                // Planeta con anillo.
                var px = w * 0.8, py = h * 0.2, pr = Math.min(w, h) * 0.07;
                x.fillStyle = '#ffa94d'; x.beginPath(); x.arc(px, py, pr, 0, Math.PI * 2); x.fill();
                x.fillStyle = 'rgba(255,255,255,0.25)'; x.beginPath(); x.arc(px - pr * 0.3, py - pr * 0.3, pr * 0.55, 0, Math.PI * 2); x.fill();
                x.strokeStyle = '#ffe8cc'; x.lineWidth = 6;
                x.beginPath(); x.ellipse(px, py, pr * 1.7, pr * 0.4, -0.35, 0, Math.PI * 2); x.stroke();
                // Luna.
                x.fillStyle = '#f1f3f5'; x.beginPath(); x.arc(w * 0.62, h * 0.13, pr * 0.6, 0, Math.PI * 2); x.fill();
                x.fillStyle = '#ced4da'; x.beginPath(); x.arc(w * 0.62 + 8, h * 0.13 - 6, pr * 0.14, 0, Math.PI * 2); x.arc(w * 0.62 - 12, h * 0.13 + 12, pr * 0.1, 0, Math.PI * 2); x.fill();
                // Suelo lunar.
                var sy = L.suelo;
                x.fillStyle = '#868e96'; x.fillRect(0, sy, w, h - sy);
                x.fillStyle = '#adb5bd'; x.beginPath(); x.moveTo(0, sy + 6);
                for (var i = 0; i <= w; i += 40) x.lineTo(i, sy - 8 + Math.sin(i / 90) * 8);
                x.lineTo(w, sy + 30); x.lineTo(0, sy + 30); x.fill();
                x.fillStyle = '#6c757d';
                for (var c = 0; c < 9; c++) { x.beginPath(); x.ellipse(w * (c + 0.5) / 9, sy + 22 + (c % 3) * 14, 28, 7, 0, 0, Math.PI * 2); x.fill(); }
            });
            keep(this.add.image(0, 0, 'cohete_fondo').setOrigin(0, 0).setDepth(1));
            this.torre(keep);
            this.llamasG = keep(this.add.graphics().setDepth(18));
            this.montarHud(keep);
            this.sembrarMotes(keep, 12, { x: 0, y: 0, w: L.W, h: L.suelo, depth: 6 }, 0xfff3bf);
            if (this.cohete) { this.cohete.cont.destroy(); this.cohete = null; }
            if (reubicar && this.nv) this.armarCohete(this.nv.reproducciones[0].length, false);
            if (reubicar) this.ubicarCosas();
        },

        /** Torre de lanzamiento con tres luces (la bocina es su faro). */
        torre: function (keep) {
            var L = this.L;
            var tx = L.cx + L.tam * 1.25;
            var g = keep(this.add.graphics().setDepth(5));
            g.fillStyle(0x495057, 1); g.fillRect(tx - 12, L.suelo - L.tam * 3.3, 24, L.tam * 3.3);
            g.lineStyle(4, 0x868e96, 1);
            for (var i = 0; i < 7; i++) { g.lineBetween(tx - 12, L.suelo - i * L.tam * 0.47, tx + 12, L.suelo - (i + 1) * L.tam * 0.47); }
            g.fillStyle(0x343a40, 1); g.fillRoundedRect(tx - 30, L.suelo - L.tam * 3.5, 60, 34, 8);
            this.luces = [];
            for (var k = 0; k < 3; k++) {
                this.luces.push(keep(this.add.circle(tx - 18 + k * 18, L.suelo - L.tam * 3.5 + 17, 7, 0xff6b6b, 0.3).setDepth(6)));
            }
            this.lucesXY = { x: tx, y: L.suelo - L.tam * 3.5 };
        },

        encenderLuces: function (n, color) {
            this.luces.forEach(function (l, i) { if (l && l.active) l.setFillStyle(i < n ? (color || 0x51cf66) : 0xff6b6b, i < n ? 1 : 0.3); });
        },

        /* ── El cohete ── */

        armarCohete: function (n, entra) {
            var L = this.L;
            if (this.cohete) this.cohete.cont.destroy();
            var paso = L.tam * 0.86;
            var cuerpoH = n * paso + L.tam * 0.3;
            var w = L.tam * 1.25;
            var baseY = L.suelo - L.tam * 0.12;
            var c = this.add.container(L.cx, baseY).setDepth(15);
            var g = this.add.graphics();
            // aletas
            g.fillStyle(0xe03131, 1);
            g.fillTriangle(-w / 2, -L.tam * 0.1, -w / 2 - L.tam * 0.38, 0, -w / 2, -L.tam * 0.9);
            g.fillTriangle(w / 2, -L.tam * 0.1, w / 2 + L.tam * 0.38, 0, w / 2, -L.tam * 0.9);
            // cuerpo
            g.fillStyle(0xf8f9fa, 1); g.fillRoundedRect(-w / 2, -cuerpoH, w, cuerpoH, 18);
            g.fillStyle(0xdee2e6, 1); g.fillRoundedRect(w * 0.18, -cuerpoH + 6, w * 0.28, cuerpoH - 12, 12);
            g.fillStyle(0xe03131, 1); g.fillRect(-w / 2, -L.tam * 0.34, w, L.tam * 0.1);
            // nariz
            g.fillStyle(0xe03131, 1); g.fillTriangle(-w / 2, -cuerpoH + 2, w / 2, -cuerpoH + 2, 0, -cuerpoH - L.tam * 0.95);
            g.fillStyle(0xff8787, 0.5); g.fillTriangle(-w / 2, -cuerpoH + 2, -w * 0.1, -cuerpoH + 2, -w * 0.05, -cuerpoH - L.tam * 0.8);
            // toberas
            g.fillStyle(0x495057, 1); g.fillRoundedRect(-w * 0.3, 0, w * 0.6, L.tam * 0.14, 4);
            c.add(g);
            var slots = [];
            for (var i = 0; i < n; i++) {
                var y = -L.tam * 0.6 - i * paso - paso * 0.1;
                var v = this.add.graphics();
                v.fillStyle(0x1864ab, 1); v.fillCircle(0, y, L.tam * 0.37);
                v.fillStyle(0x0b3d6b, 1); v.fillCircle(0, y, L.tam * 0.31);
                v.lineStyle(5, 0xadb5bd, 1); v.strokeCircle(0, y, L.tam * 0.37);
                var luz = this.add.circle(0, y, L.tam * 0.42, 0x69db7c, 0).setStrokeStyle(0, 0x69db7c);
                c.add([v, luz]);
                slots.push({ x: 0, y: y, luz: luz, ocupado: null });
            }
            this.cohete = { cont: c, slots: slots, n: n, w: w, h: cuerpoH + L.tam * 0.95, baseY: baseY, lleno: 0 };
            if (entra) { c.y = -cuerpoH - L.tam * 1.5; }
            return this.cohete;
        },

        slotXY: function (k) {
            var c = this.cohete;
            return { x: c.cont.x + c.slots[k].x, y: c.cont.y + c.slots[k].y };
        },

        sobreCohete: function (a) {
            var c = this.cohete, L = this.L;
            if (!c) return false;
            return Math.abs(a.cont.x - c.cont.x) < c.w * 0.9 + L.tam * 0.3 && a.cont.y > c.cont.y - c.h - L.tam * 0.2 && a.cont.y < c.cont.y + L.tam * 0.3;
        },

        /* ── Cápsulas ── */

        lugares: function (n) {
            var L = this.L;
            var x0 = L.cx + L.tam * 2.6;
            var disp = L.der - x0 - L.tam * 0.4;
            var porFila = n > 4 ? 3 : Math.min(n, 3);
            var filas = Math.ceil(n / porFila);
            var out = [];
            for (var i = 0; i < n; i++) {
                var f = Math.floor(i / porFila), cI = i % porFila;
                var enFila = f === filas - 1 ? n - porFila * (filas - 1) : porFila;
                var paso = Math.min(L.tam * 1.35, disp / Math.max(porFila, 1));
                var ini = x0 + (disp - paso * (enFila - 1)) / 2;
                out.push({ x: ini + cI * paso, y: L.suelo - L.tam * (0.9 + (filas - 1 - f) * 1.45) });
            }
            return out;
        },

        ubicarCosas: function () {
            var lug = this.lugares(this.cosas.length);
            var self = this;
            this.cosas.forEach(function (a, i) {
                if (!a.cont.active || a.usada) return;
                a.casa = { x: lug[i].x, y: lug[i].y };
                if (!self.arrastrando || self.arrastrando.a !== a) a.cont.setPosition(lug[i].x, lug[i].y);
            });
        },

        mostrarOpciones: async function (nv) {
            var self = this;
            var n = nv.opciones.length;
            var lug = this.lugares(n);
            var tam = Math.min(this.L.tam * 0.95, 120);
            this.cosas = nv.opciones.map(function (id, i) {
                var a = self.crearCosa(id, lug[i].x, lug[i].y + 50, tam * 0.78, { depth: 30, sinSombra: true });
                var burbuja = self.add.graphics();
                burbuja.fillStyle(0xffffff, 0.2); burbuja.fillCircle(0, 0, tam * 0.58);
                burbuja.lineStyle(4, 0xffffff, 0.85); burbuja.strokeCircle(0, 0, tam * 0.58);
                burbuja.fillStyle(0xffffff, 0.5); burbuja.fillEllipse(-tam * 0.24, -tam * 0.3, tam * 0.2, tam * 0.11);
                a.cont.addAt(burbuja, 0);
                a.tam = tam * 1.1; a.casa = { x: lug[i].x, y: lug[i].y }; a.prof = 30;
                a.cont.setAlpha(0);
                a.flota = { fase: Math.random() * 6 };
                return a;
            });
            K.ruido({ f: 1300, q: 1, dur: 0.07, vol: 0.05 });
            await Promise.all(this.cosas.map(function (a, i) {
                return esperar(self, i * 110).then(function () { return tw(self, { targets: a.cont, alpha: 1, y: a.casa.y, duration: 340, ease: 'Back.easeOut' }); });
            }));
        },

        prepararNivel: async function (i, nv) {
            await this.retirar(this.cosas);
            this.cosas = [];
            this.encenderLuces(0);
            var c = this.armarCohete(nv.reproducciones[0].length, true);
            this.llama = 0.6;
            K.ruido({ f: 220, q: 0.9, dur: 0.9, vol: 0.06 });
            await tw(this, { targets: c.cont, y: c.baseY, duration: 1100, ease: 'Sine.easeOut' });
            this.llama = 0;
        },

        alSonar: function (id, k) {
            this.encenderLuces((k % 3) + 1, 0xffd43b);
            var c = this.cohete;
            if (c) this.tweens.add({ targets: c.cont, y: c.baseY - 5, duration: 120, yoyo: true, repeat: 1 });
            var lx = this.lucesXY;
            Ut.estallido(this, lx.x, lx.y, { n: 3, tex: 'nota', tam: 22, dist: 70, depth: 70 });
        },

        alTerminarVuelta: function () { this.encenderLuces(0); },

        /* ── Arrastrar cápsulas ── */

        alTocar: function (p) {
            if (this.fase !== 'jugar') return;
            if (!this.tomar(p, this.cosas)) {
                var b = this.cosaEn(this.cosas, p.x, p.y);
                if (b && !this.sonando) this.sonar(b.id, { breve: true, bocina: false });
            }
        },

        alMover: function (p) {
            var a = this.llevar(p);
            var c = this.cohete;
            if (!c) return;
            var cerca = a && this.sobreCohete(a);
            var k = c.lleno;
            if (c.slots[k] && c.slots[k].luz) {
                c.slots[k].luz.setStrokeStyle(cerca ? 6 : 0, 0x69db7c);
                c.slots[k].luz.setFillStyle(0x69db7c, cerca ? 0.25 : 0);
            }
        },

        alSoltar: async function () {
            var a = this.soltar();
            var c = this.cohete;
            if (c && c.slots[c.lleno]) { c.slots[c.lleno].luz.setStrokeStyle(0, 0x69db7c); c.slots[c.lleno].luz.setFillStyle(0x69db7c, 0); }
            if (!a) return;
            if (!c || this.fase !== 'jugar' || !this.sobreCohete(a)) { this.aCasa(a, true); return; }
            this.tocado = a;
            var r = await this.tocarOrden(a, { x: a.cont.x, y: a.cont.y });
            if (r === 'mal') this.aCasa(a, true);
        },

        alMarcar: async function (id, k) {
            var a = this.tocado, c = this.cohete;
            var d = this.slotXY(k);
            a.usada = true;
            a.cont.setDepth(17);
            await this.saltarA(a.cont, d.x, d.y, { ms: 360, alto: 30, esc: (this.L.tam * 0.64) / a.tam });
            c.lleno = k + 1;
            c.slots[k].ocupado = a;
            c.slots[k].luz.setStrokeStyle(5, 0x69db7c); c.slots[k].luz.setFillStyle(0x69db7c, 0.2);
            this.encenderLuces(k + 1);
            K.ruido({ f: 1700, q: 3, dur: 0.07, vol: 0.09 });
            this.tweens.add({ targets: c.cont, y: c.baseY - 6, duration: 90, yoyo: true });
            Ut.estallido(this, d.x, d.y, { n: 6, tex: 'estrella', tam: 20, dist: 80, depth: 70, sinTinte: true });
        },

        alFallar: async function () {
            var a = this.tocado, c = this.cohete;
            this.encenderLuces(0);
            this.luces.forEach(function (l) { l.setFillStyle(0xff6b6b, 1); });
            this.cameras.main.shake(160, 0.004);
            K.tono({ f: 300, f2: 180, dur: 0.22, vol: 0.05 });
            if (a) await a.sacudir();
            this.encenderLuces(c ? c.lleno : 0);
        },

        alReiniciar: async function () {
            var c = this.cohete;
            if (!c) return;
            // Las cápsulas ya subidas salen y vuelven a flotar.
            var salidas = [];
            for (var k = c.lleno - 1; k >= 0; k--) {
                var a = c.slots[k].ocupado;
                if (a && a.cont.active) {
                    a.usada = false;
                    a.cont.setDepth(30);
                    salidas.push(this.saltarA(a.cont, a.casa.x, a.casa.y, { ms: 480, alto: 60, esc: 1 }));
                }
                c.slots[k].ocupado = null;
                c.slots[k].luz.setStrokeStyle(0, 0x69db7c); c.slots[k].luz.setFillStyle(0x69db7c, 0);
            }
            c.lleno = 0;
            this.encenderLuces(0);
            await Promise.all(salidas);
        },

        /** Acierto: las luces se encienden con cada sonido y luego cuenta regresiva y despegue. */
        alAcertar: async function () {
            var c = this.cohete;
            var nv = this.nv;
            for (var k = 0; k < c.n; k++) {
                if (!this.sigue()) return;
                var a = c.slots[k].ocupado;
                this.reunidos.push(nv.correctas[k]);
                this.tweens.add({ targets: c.slots[k].luz, fillAlpha: 0.7, duration: 150, yoyo: true });
                if (a) a.latir();
                await this.sonar(nv.correctas[k], { breve: true, bocina: false });
                await esperar(this, 100);
            }
            // Cuenta regresiva: tres luces y ¡despegue!
            for (var t = 1; t <= 3; t++) { this.encenderLuces(t, 0xffd43b); K.tono({ f: 520 + t * 90, dur: 0.1, vol: 0.05 }); await esperar(this, 320); }
            this.encenderLuces(3, 0x51cf66);
            this.llama = 1;
            this.vel = 0;
            this.tweens.add({ targets: this, vel: 1, duration: 900 });
            K.ruido({ f: 180, q: 0.8, dur: 1.4, vol: 0.09 });
            var objetivos = [c.cont].concat(c.slots.map(function (s) { return s.ocupado && s.ocupado.cont; }).filter(Boolean));
            var dy = -(c.baseY + c.h + 40);
            this.cameras.main.shake(900, 0.003);
            await tw(this, { targets: objetivos, y: '+=' + dy, duration: 1300, ease: 'Cubic.easeIn' });
            this.llama = 0;
            this.vel = 0;
            Ut.estallido(this, this.L.cx, 60, { n: 16, tex: 'estrella', tam: 26, dist: 200, depth: 70, sinTinte: true });
        },

        alTerminarNivel: async function () {
            await this.retirar(this.cosas.filter(function (a) { return !a.usada; }));
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.cosas = [];
            this.encenderLuces(0);
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            var sig = this.siguienteDe(this.cosas.filter(function (a) { return !a.usada; }));
            if (!sig || !this.ayuda) {
                if (this.bocina) this.tweens.add({ targets: this.bocina, scale: 1.18, duration: 220, yoyo: true, repeat: 2 });
                return esperar(this, 900);
            }
            var d = this.slotXY(this.cohete.lleno);
            return this.ctx.mano({ punto: { x: sig.cont.x, y: sig.cont.y }, holdMs: 200, arrastre: { dx: d.x - sig.cont.x, dy: d.y - sig.cont.y, durMs: 900 }, cancelado: function () { return cancelada() || self.fase !== 'jugar' || !!self.arrastrando; } });
        },

        demoPaso: function () {
            var self = this;
            return this.nv.correctas.map(function (id) {
                return function () {
                    var a = self.cosas.filter(function (q) { return q.id === id && !q.usada; })[0];
                    if (!a) return null;
                    var d = self.slotXY(self.cohete.lleno);
                    return {
                        desde: { x: a.cont.x, y: a.cont.y }, hasta: d,
                        hacer: async function () {
                            self.arrastrando = { a: a, dx: 0, dy: 0 };
                            a.cont.setDepth(70);
                            await tw(self, { targets: a.cont, x: d.x, y: d.y, duration: 350 });
                            await self.alSoltar();
                        }
                    };
                };
            });
        },

        /** Final: el cohete llega a la luna y todos los sonidos de la partida salen a bailar. */
        escenaFinal: async function () {
            var self = this;
            var L = this.L;
            await this.retirar(this.cosas);
            this.cosas = [];
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; }).slice(0, 6);
            if (!ids.length) ids = ['perro', 'gato'];
            var c = this.armarCohete(1, true);
            this.cohete.cont.setPosition(L.cx, -c.h * 2);
            this.llama = 0.8;
            await tw(this, { targets: c.cont, y: c.baseY, duration: 1500, ease: 'Sine.easeOut' });
            this.llama = 0;
            var tam = Math.min(L.tam * 0.95, (L.der - L.cx - L.tam * 2) / ids.length);
            for (var i = 0; i < ids.length; i++) {
                if (!this.sigue()) return;
                var x = L.cx + L.tam * 1.8 + (L.der - L.cx - L.tam * 2.2) * (i + 0.5) / ids.length;
                var a = this.crearCosa(ids[i], c.cont.x, c.cont.y - L.tam, tam * 0.9, { depth: 30 });
                a.cont.setScale(0.3);
                await this.saltarA(a.cont, x, L.suelo - tam * 0.45, { ms: 520, alto: 120, esc: 1 });
                a.saltito(0.25, 2);
                Ut.estallido(this, x, L.suelo - tam, { n: 8, tex: 'estrella', tam: 24, dist: 120, depth: 70, sinTinte: true });
                await this.sonar(ids[i], { breve: true, bocina: false });
            }
            Ut.confeti(this, 80);
            await esperar(this, 1000);
        },

        estadoExtra: function () {
            var c = this.cohete;
            return {
                cohete: c ? { x: Math.round(c.cont.x), y: Math.round(c.cont.y), lleno: c.lleno, slot: c.slots[c.lleno] ? this.slotXY(c.lleno) : null } : null,
                cosas: this.cosas.filter(function (a) { return a.cont.active && !a.usada; }).map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y) }; })
            };
        },

        paso: function (time) {
            var self = this;
            this.cosas.forEach(function (a) {
                if (!a.cont.active || a.usada || !a.flota || (self.arrastrando && self.arrastrando.a === a) || !a.casa || self.tweens.isTweening(a.cont)) return;
                var vv = 1 + (self.nivelActual || 0) * 0.45;
                a.cont.x = a.casa.x + Math.cos(time / 1300 * vv + a.flota.fase) * (10 + (self.nivelActual || 0) * 7);
                a.cont.y = a.casa.y + Math.sin(time / 700 * vv + a.flota.fase) * (7 + (self.nivelActual || 0) * 5);
            });
            var g = this.llamasG;
            if (!g || !g.active) return;
            g.clear();
            if (this.vel > 0.02) {
                // Al despegar las estrellas pasan hacia abajo como rayas: se siente la velocidad.
                var Lw = this.L;
                for (var q = 0; q < 26; q++) {
                    var sx = (q * 137) % Lw.W, sy = ((time * (0.5 + (q % 4) * 0.35) * this.vel) + q * 61) % Lw.suelo;
                    g.lineStyle(2, 0xffffff, 0.7 * this.vel);
                    g.lineBetween(sx, sy, sx, sy + 12 + 40 * this.vel);
                }
            }
            var c = this.cohete;
            if (c && this.llama > 0) {
                var L = this.L;
                var x = c.cont.x, y = c.cont.y + L.tam * 0.14;
                var largo = L.tam * (0.7 + 1.1 * this.llama) * (0.85 + Math.random() * 0.3);
                g.fillStyle(0xff922b, 0.9); g.fillTriangle(x - L.tam * 0.28, y, x + L.tam * 0.28, y, x, y + largo);
                g.fillStyle(0xffd43b, 0.95); g.fillTriangle(x - L.tam * 0.16, y, x + L.tam * 0.16, y, x, y + largo * 0.65);
                g.fillStyle(0xffffff, 0.9); g.fillTriangle(x - L.tam * 0.07, y, x + L.tam * 0.07, y, x, y + largo * 0.35);
            }
        }
    };

    K.crear({ id: 'cohete', fondo: '#1c2b6b', escena: escena });
})(typeof window !== 'undefined' ? window : this);
