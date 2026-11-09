/**
 * «Objetos perdidos de la estación» — motor propio de ¿Qué escuchaste? (3-4 años).
 *
 * En la estación de tren, una cinta transportadora trae sin parar los objetos perdidos: entran
 * por una cortina de tiras a la izquierda, pasan frente a la VENTANILLA y salen por la derecha
 * (y vuelven a dar la vuelta). Suena uno. Cuando ese objeto está en la ventanilla, el niño BAJA
 * LA PALANCA: la cinta frena con un chirrido y el objeto sube al mostrador, hace su acción y va a
 * la repisa de «entregados». Si frena con otro, ese suena con su sonido y la cinta sigue. Tocar un
 * objeto que pasa lo hace sonar (para comparar) sin frenar.
 *
 * Niveles: 1 el reto, cinta lenta · 2 otro sonido y dos iguales · 3 cinta más rápida ·
 * 4 cada entrega trae un sonido nuevo.
 */
(function (global) {
    'use strict';

    var K = global.AsociaKit;
    var Ut = global.PedniaParejaBase.util;
    var Act = global.AsociaActores;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var rnd = Ut.rnd;
    var EXTRA = ['bicicleta', 'avion', 'vaca', 'gallo', 'ambulancia'];

    var escena = {
        iniciar: function () { this.objs = []; this.vel = 0; this.velMeta = 0; this.mov = 0; },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.18);
            L.bocina = { x: W / 2, y: Math.max(60, Math.min(108, 58 + hueco * 0.22)), r: Math.max(28, Math.min(40, hueco * 0.3)) };
            L.pres = W >= 760 ? { x: W - 70, piso: H - 104, alto: Math.min(160, H * 0.28) } : null;
            L.tam = Math.max(64, Math.min(120, H * 0.17, W / 8));
            L.cinta = { y: H * 0.66, alto: Math.max(26, L.tam * 0.28), x0: W * 0.04, x1: W * 0.96 };
            L.vent = { x: W * 0.46, w: L.tam * 1.5 };                    // ventanilla sobre la cinta
            var der = L.pres ? W - 150 : W - 20;
            // Palanca delante de la cinta, en su poste (no tapa lo que pasa).
            L.palanca = { x: Math.min(der - 40, L.vent.x + L.vent.w / 2 + L.tam * 0.9), y: Math.min(H - 70, L.cinta.y + L.cinta.alto + L.tam * 0.75), largo: Math.min(L.tam * 0.9, H * 0.13) };
            L.repisa = { x: W * 0.05, y: Math.max(L.bocina.y + L.bocina.r + L.tam * 0.75, H * 0.36), w: Math.min(W * 0.3, L.vent.x - L.vent.w * 0.7 - W * 0.07) };
            L.mostrador = L.cinta.y - L.tam * 1.15;
            return L;
        },

        armar: function () {
            var self = this;
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            K.textura(this, 'estacion_fondo', L.W, L.H, function (x, w, h) { self.pintarEstacion(x, w, h); });
            keep(this.add.image(0, 0, 'estacion_fondo').setOrigin(0, 0).setDepth(0));
            this.cintaG = keep(this.add.graphics().setDepth(10));
            // Cortinas de tiras en las bocas de la cinta (los objetos pasan por detrás).
            this.tiras = [];
            [L.cinta.x0, L.cinta.x1].forEach(function (bx, k) {
                var g = keep(self.add.graphics().setDepth(30));
                g.bx = bx; g.lado = k;
                self.tiras.push(g);
            });
            var V = this.montarVida(keep);
            if (V) V.palomas(3, Math.min(L.H - 30, L.cinta.y + L.cinta.alto + L.tam * 0.55 + 40), L.W * 0.05, Math.max(L.W * 0.1, L.palanca.x - 80));
            this.montarPalanca(keep);
            this.montarHud(keep);
            this.coleccion.forEach(function (a, k) { var p = self.sitioRepisa(k); a.cont.setPosition(p.x, p.y).setScale(p.esc); });
            this.objs.forEach(function (o) { o.actor.cont.y = self.yObj(); o.actor.cont.setScale(L.tam / o.actor.tam); });
        },

        yObj: function () { return this.L.cinta.y - this.L.tam * 0.42; },

        pintarEstacion: function (x, w, h) {
            var L = this.L;
            var yp = L.cinta.y + L.cinta.alto + L.tam * 0.5;
            // Pared de azulejos.
            x.fillStyle = '#e6f4ea'; x.fillRect(0, 0, w, yp);
            var az = 34;
            for (var yy = 0; yy < yp; yy += az) for (var xx = (yy / az % 2) * az / 2 - az; xx < w; xx += az) {
                x.fillStyle = (Math.floor(xx / az) + Math.floor(yy / az)) % 5 === 0 ? '#c3fae8' : '#f1fbf6';
                x.fillRect(xx + 1, yy + 1, az - 2, az - 2);
            }
            // Franja de color y zócalo.
            x.fillStyle = '#20c997'; x.fillRect(0, yp - L.tam * 0.9, w, 10);
            x.fillStyle = '#087f5b'; x.fillRect(0, yp - 16, w, 16);
            // Piso de baldosas grises.
            var g = x.createLinearGradient(0, yp, 0, h);
            g.addColorStop(0, '#adb5bd'); g.addColorStop(1, '#ced4da');
            x.fillStyle = g; x.fillRect(0, yp, w, h - yp);
            x.strokeStyle = 'rgba(0,0,0,0.12)'; x.lineWidth = 1.5;
            for (var i = -10; i < 20; i++) { x.beginPath(); x.moveTo(w / 2 + i * 50, yp); x.lineTo(w / 2 + i * 120, h); x.stroke(); }
            for (var f = 1; f < 4; f++) { var y2 = yp + (h - yp) * f / 4; x.beginPath(); x.moveTo(0, y2); x.lineTo(w, y2); x.stroke(); }
            // Reloj grande de estación.
            var rx = w * 0.78, ry = Math.max(L.bocina.y + 10, h * 0.2), rr = Math.min(52, h * 0.08);
            if (!L.pres || rx < w - 200) {
                x.fillStyle = '#343a40'; x.fillRect(rx - 3, ry - rr - 30, 6, 30);
                x.fillStyle = '#212529'; x.beginPath(); x.arc(rx, ry, rr + 6, 0, Math.PI * 2); x.fill();
                x.fillStyle = '#ffffff'; x.beginPath(); x.arc(rx, ry, rr, 0, Math.PI * 2); x.fill();
                x.strokeStyle = '#212529'; x.lineWidth = 3;
                for (var m = 0; m < 12; m++) { var a = m * Math.PI / 6; x.beginPath(); x.moveTo(rx + Math.cos(a) * rr * 0.8, ry + Math.sin(a) * rr * 0.8); x.lineTo(rx + Math.cos(a) * rr * 0.92, ry + Math.sin(a) * rr * 0.92); x.stroke(); }
                x.lineWidth = 4; x.beginPath(); x.moveTo(rx, ry); x.lineTo(rx + rr * 0.45, ry - rr * 0.3); x.stroke();
                x.lineWidth = 3; x.beginPath(); x.moveTo(rx, ry); x.lineTo(rx - rr * 0.1, ry - rr * 0.7); x.stroke();
            }
            // Ventanilla de objetos perdidos: arco con vidrio y marco.
            var v = L.vent, vy0 = L.mostrador - L.tam * 0.9, vy1 = L.cinta.y + 4;
            var ym = L.mostrador;   // el mostrador es el alféizar: vidrio arriba, boca abierta abajo
            x.fillStyle = '#495057'; K.rr(x, v.x - v.w / 2 - 14, vy0 - 14, v.w + 28, vy1 - vy0 + 14, 18); x.fill();
            // Vidrio iluminado de la ventanilla (solo hasta el mostrador).
            x.fillStyle = '#fff3bf'; K.rr(x, v.x - v.w / 2, vy0, v.w, ym - vy0 + 4, 12); x.fill();
            var luz = x.createRadialGradient(v.x, vy0 + 20, 4, v.x, vy0 + 20, v.w);
            luz.addColorStop(0, 'rgba(255,255,255,0.8)'); luz.addColorStop(1, 'rgba(255,255,255,0)');
            x.fillStyle = luz; x.fillRect(v.x - v.w / 2, vy0, v.w, ym - vy0);
            // Reflejo en diagonal sobre el vidrio.
            x.fillStyle = 'rgba(255,255,255,0.35)';
            x.beginPath(); x.moveTo(v.x - v.w * 0.3, vy0 + 6); x.lineTo(v.x - v.w * 0.12, vy0 + 6); x.lineTo(v.x - v.w * 0.42, ym - 6); x.lineTo(v.x - v.w * 0.5 + 4, ym - 6); x.closePath(); x.fill();
            // Boca del puesto bajo el mostrador: hueco en sombra por donde pasa la cinta.
            var bocaY = ym + 12;
            var g2 = x.createLinearGradient(0, bocaY, 0, vy1);
            g2.addColorStop(0, '#2b3035'); g2.addColorStop(1, '#495057');
            x.fillStyle = g2; x.fillRect(v.x - v.w / 2, bocaY, v.w, vy1 - bocaY);
            // Franjas de aviso en los costados de la boca.
            for (var fr = bocaY; fr < vy1 - 6; fr += 16) {
                x.fillStyle = '#fcc419'; x.fillRect(v.x - v.w / 2, fr, 6, 8); x.fillRect(v.x + v.w / 2 - 6, fr, 6, 8);
            }
            // Cartel con lupa y objetos (sin texto para el niño).
            x.fillStyle = '#1971c2'; K.rr(x, v.x - v.w * 0.45, vy0 - 52, v.w * 0.9, 34, 8); x.fill();
            x.strokeStyle = '#ffffff'; x.lineWidth = 4;
            x.beginPath(); x.arc(v.x - 6, vy0 - 37, 9, 0, Math.PI * 2); x.stroke();
            x.beginPath(); x.moveTo(v.x + 1, vy0 - 30); x.lineTo(v.x + 10, vy0 - 22); x.stroke();
            // Mostrador.
            K.madera(x, v.x - v.w / 2 - 20, L.mostrador, v.w + 40, 12, { r: 3 });
            // Repisa de entregados.
            var r = L.repisa;
            if (r.w > 60) {
                x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(r.x + 4, r.y + 6, r.w, 10);
                K.madera(x, r.x, r.y, r.w, 12, { r: 3 });
                x.fillStyle = '#51cf66'; x.beginPath(); x.arc(r.x + 16, r.y - 18, 10, 0, Math.PI * 2); x.fill();
                x.strokeStyle = '#ffffff'; x.lineWidth = 3; x.beginPath(); x.moveTo(r.x + 11, r.y - 18); x.lineTo(r.x + 15, r.y - 13); x.lineTo(r.x + 22, r.y - 23); x.stroke();
            }
            // Bocas de la cinta en la pared.
            [L.cinta.x0, L.cinta.x1].forEach(function (bx) {
                x.fillStyle = '#343a40'; K.rr(x, bx - L.tam * 0.55, L.cinta.y - L.tam * 1.05, L.tam * 1.1, L.tam * 1.1, 10); x.fill();
                x.fillStyle = '#1b1e21'; x.fillRect(bx - L.tam * 0.45, L.cinta.y - L.tam * 0.95, L.tam * 0.9, L.tam * 0.95);
            });
            // Patas de la cinta.
            x.fillStyle = '#868e96';
            for (var p = L.cinta.x0 + 40; p < L.cinta.x1; p += 160) x.fillRect(p, L.cinta.y + L.cinta.alto, 8, yp - L.cinta.y - L.cinta.alto + 10);
        },

        /* ── Palanca ── */

        montarPalanca: function (keep) {
            var P = this.L.palanca;
            var c = keep(this.add.container(P.x, P.y).setDepth(40));
            var poste = this.add.rectangle(0, P.largo * 1.2, P.largo * 0.22, P.largo * 1.1, 0x868e96).setStrokeStyle(2, 0x495057);
            var base = this.add.rectangle(0, P.largo * 0.55, P.largo * 0.6, P.largo * 0.34, 0xfcc419).setStrokeStyle(3, 0xe67700);
            c.add(poste);
            var brazo = this.add.container(0, P.largo * 0.5);
            var barra = this.add.rectangle(0, -P.largo * 0.45, 10, P.largo * 0.9, 0xadb5bd).setStrokeStyle(2, 0x868e96);
            var bola = this.add.circle(0, -P.largo * 0.9, P.largo * 0.2, 0xe03131).setStrokeStyle(3, 0xffffff);
            var brillo = this.add.circle(-P.largo * 0.06, -P.largo * 0.96, P.largo * 0.06, 0xffffff, 0.7);
            brazo.add([barra, bola, brillo]);
            c.add([base, brazo]);
            c.brazo = brazo;
            brazo.angle = -25;
            this.palanca = c;
        },

        tocaPalanca: function (p) {
            var P = this.L.palanca;
            return Math.abs(p.x - P.x) < P.largo * 0.6 && p.y > P.y - P.largo * 0.7 && p.y < P.y + P.largo * 0.8;
        },

        bajarPalanca: function () {
            var self = this;
            var b = this.palanca.brazo;
            this.tweens.killTweensOf(b);
            K.ruido({ f: 900, q: 2, dur: 0.12, vol: 0.1 });
            return tw(this, { targets: b, angle: 25, duration: 140, ease: 'Quad.easeIn' });
        },

        subirPalanca: function () {
            this.tweens.add({ targets: this.palanca.brazo, angle: -25, duration: 320, ease: 'Back.easeOut' });
        },

        /* ── Cinta y objetos ── */

        cargar: function (ids) {
            var self = this;
            var L = this.L;
            this.objs.forEach(function (o) { o.actor.destruir(); });
            this.objs = [];
            this.vivos = this.coleccion.slice();
            var paso = Math.max(L.tam * 1.6, (L.cinta.x1 - L.cinta.x0 + L.tam * 2) / ids.length);
            ids.forEach(function (id, k) {
                var a = Act.crear(self, id, L.cinta.x0 - L.tam - k * paso, self.yObj(), L.tam);
                if (a.animarIdle) a.animarIdle(false);
                a.sonido = self.sonidoDe(id);
                a.cont.setDepth(20);
                self.objs.push({ id: id, actor: a, estado: 'cinta' });
                self.vivos.push(a);
            });
            this.espaciado = paso;
        },

        disponibles: function () { return this.objs.filter(function (o) { return o.estado === 'cinta'; }).map(function (o) { return o.id; }); },

        enVentanilla: function () {
            var v = this.L.vent;
            var mejor = null, dmin = v.w * 0.55;
            this.objs.forEach(function (o) {
                if (o.estado !== 'cinta') return;
                var d = Math.abs(o.actor.cont.x - v.x);
                if (d < dmin) { dmin = d; mejor = o; }
            });
            return mejor;
        },

        /* ── Entrada ── */

        alTocar: function (p) {
            if (this.fase !== 'jugar') return;
            if (this.tocaPalanca(p)) { this.tirando = { y: p.y, t: this.time.now }; this.pista.reiniciar(); return; }
            // Tocar un objeto que pasa: suena (para comparar).
            var self = this;
            var o = this.objs.filter(function (q) { return q.estado === 'cinta' && Math.hypot(p.x - q.actor.cont.x, p.y - q.actor.cont.y) < self.L.tam * 0.55; })[0];
            if (o && !this.sonando) { this.escuchar(o.actor.sonido, { breve: true, vol: 0.75, bocina: false }); o.actor.saltito(0.1, 1); }
        },

        alMover: function (p) {
            var t = this.tirando;
            if (!t) return;
            var dy = p.y - t.y;
            this.palanca.brazo.angle = Math.max(-25, Math.min(25, -25 + dy * 1.2));
            if (dy > this.L.palanca.largo * 0.35) { this.tirando = null; this.frenar(); }
        },

        alSoltar: function () {
            var t = this.tirando;
            this.tirando = null;
            if (!t) return;
            if (this.time.now - t.t < 450) this.frenar(); else this.subirPalanca();
        },

        frenar: async function () {
            if (this.fase !== 'jugar' || this.frenando) return;
            this.frenando = true;
            await this.bajarPalanca();
            // Chirrido de freno y la cinta se detiene.
            K.tono({ f: 1400, f2: 700, dur: 0.35, vol: 0.05, tipo: 'sawtooth' });
            this.velMeta = 0;
            await esperar(this, 320);
            var o = this.enVentanilla();
            if (!o) {
                K.tono({ f: 200, dur: 0.25, vol: 0.06, tipo: 'square' });
                await esperar(this, 400);
            } else if (o.id === this.objetivo) {
                await this.entregar(o);
                this.frenando = false;
                this.subirPalanca();
                return;
            } else {
                await this.fallar(o.actor);
            }
            this.subirPalanca();
            this.velMeta = this.nv ? this.nv.vel : 60;
            this.frenando = false;
        },

        entregar: async function (o) {
            var self = this;
            var L = this.L;
            var a = o.actor;
            o.estado = 'entregado';
            this.fase = 'premio';
            a.cont.setDepth(45);
            K.efecto(this, 'whoosh');
            await tw(this, { targets: a.cont, x: L.vent.x, y: L.mostrador - L.tam * 0.42, scale: (L.tam / a.tam) * 1.1, duration: 420, ease: 'Back.easeOut' });
            K.ruido({ f: 500, q: 1, dur: 0.1, vol: 0.12 });
            await this.celebrar(a);
            // A la repisa de entregados.
            var p = this.sitioRepisa(this.coleccion.length);
            this.coleccion.push(a);
            var x0 = a.cont.x, y0 = a.cont.y, e0 = a.cont.scale, t = { k: 0 };
            var cima = Math.min(y0, p.y) - L.tam * 0.6;
            await tw(this, {
                targets: t, k: 1, duration: 700, ease: 'Sine.easeInOut',
                onUpdate: function () {
                    var k = t.k;
                    a.cont.x = x0 + (p.x - x0) * k;
                    a.cont.y = (1 - k) * (1 - k) * y0 + 2 * (1 - k) * k * cima + k * k * p.y;
                    a.cont.setScale(e0 + (p.esc - e0) * k);
                }
            });
            this.objs = this.objs.filter(function (q) { return q !== o; });
            this.velMeta = this.nv.vel;
            await this.seguir();
        },

        sitioRepisa: function (k) {
            var r = this.L.repisa;
            var n = 5;
            var esc = Math.min(0.62, (Math.max(r.w, 100) / n) / this.L.tam * 1.3);
            return { x: r.x + Math.max(r.w, 100) * ((k % n) + 0.5) / n, y: r.y - this.L.tam * esc * 0.42 - Math.floor(k / n) * this.L.tam * esc * 0.7, esc: esc };
        },

        /* ── Niveles ── */

        planNiveles: function () {
            var plan = this.planBase({ extra: EXTRA, n: [3, 4, 5, 5], copias2: true });
            var base = Math.max(55, this.L.W * 0.07);
            plan[0].vel = base; plan[1].vel = base * 1.25; plan[2].vel = base * 1.6; plan[3].vel = base * 1.5;
            return plan;
        },

        prepararNivel: async function (i, nv) {
            this.velMeta = 0;
            this.cargar(nv.ids);
            this.velMeta = nv.vel;
            // Que el primero llegue rápido a la vista.
            await esperar(this, 600);
        },

        paso: function (time, delta) {
            var L = this.L;
            var dt = delta / 1000;
            this.vel += (this.velMeta - this.vel) * Math.min(1, dt * 4);
            var dx = this.vel * dt;
            this.mov = (this.mov + dx) % 24;
            var self = this;
            // Los objetos avanzan; el que sale por la derecha vuelve a entrar por la izquierda.
            var vuelta = (L.cinta.x1 - L.cinta.x0) + L.tam * 2;
            var n = this.objs.length;
            this.objs.forEach(function (o) {
                if (o.estado !== 'cinta') return;
                var c = o.actor.cont;
                c.x += dx;
                if (c.x > L.cinta.x1 + L.tam * 0.7) {
                    // Se coloca detrás del último de la fila.
                    var minX = Math.min.apply(null, self.objs.filter(function (q) { return q.estado === 'cinta'; }).map(function (q) { return q.actor.cont.x; }));
                    c.x = Math.min(L.cinta.x0 - L.tam * 0.7, minX - self.espaciado);
                }
                // Traqueteo sobre los rodillos.
                c.y = self.yObj() + (self.vel > 5 ? Math.sin(time / 60 + c.x / 30) * 1.5 : 0);
                c.setVisible(c.x > L.cinta.x0 - L.tam * 0.6 && c.x < L.cinta.x1 + L.tam * 0.6);
            });
            // Cinta: banda con listones que corren y rodillos.
            var g = this.cintaG;
            if (!g) return;
            g.clear();
            var y = L.cinta.y, h = L.cinta.alto;
            g.fillStyle(0x343a40, 1); g.fillRoundedRect(L.cinta.x0 - 10, y - 4, L.cinta.x1 - L.cinta.x0 + 20, h + 8, 10);
            g.fillStyle(0x212529, 1); g.fillRect(L.cinta.x0, y, L.cinta.x1 - L.cinta.x0, h * 0.55);
            g.fillStyle(0x495057, 1);
            for (var x = L.cinta.x0 + this.mov; x < L.cinta.x1; x += 24) g.fillRect(x, y + 1, 10, h * 0.5);
            for (var r = L.cinta.x0 + 10; r < L.cinta.x1; r += 36) {
                g.fillStyle(0xadb5bd, 1); g.fillCircle(r, y + h * 0.8, h * 0.2);
                g.fillStyle(0x495057, 1); g.fillCircle(r + Math.cos(this.mov / 4) * h * 0.1, y + h * 0.8 + Math.sin(this.mov / 4) * h * 0.1, h * 0.05);
            }
            // Marco de la ventanilla sobre la cinta (zona donde hay que frenar).
            var v = L.vent;
            var dentro = this.enVentanilla();
            var pulso = 0.5 + Math.sin(time / 220) * 0.2;
            g.fillStyle(0xffd43b, dentro ? 0.28 : 0.14);
            g.fillRect(v.x - v.w / 2, y, v.w, h * 0.55);
            g.lineStyle(5, 0xffd43b, dentro ? 1 : pulso);
            g.strokeRoundedRect(v.x - v.w / 2, y - L.tam * 0.98, v.w, L.tam * 0.98 + h * 0.55, 10);
            // Flechas que señalan la ventanilla.
            g.fillStyle(0xffd43b, dentro ? 1 : pulso + 0.2);
            [-0.25, 0.25].forEach(function (k) {
                var fx = v.x + v.w * k, fy = y + h + 8 + Math.sin(time / 200) * 3;
                g.fillTriangle(fx - 10, fy + 14, fx + 10, fy + 14, fx, fy);
            });
            // Cortinas de tiras que se mueven cuando pasa algo.
            this.tiras.forEach(function (t) {
                t.clear();
                var cerca = self.objs.some(function (o) { return o.estado === 'cinta' && Math.abs(o.actor.cont.x - t.bx) < L.tam * 0.6; });
                for (var k = 0; k < 6; k++) {
                    var tx = t.bx - L.tam * 0.42 + k * L.tam * 0.17;
                    var sw = cerca ? Math.sin(time / 90 + k) * 10 : 0;
                    t.fillStyle(0x99e9f2, 0.55);
                    t.beginPath();
                    t.moveTo(tx, y - L.tam * 0.95);
                    t.lineTo(tx + L.tam * 0.14, y - L.tam * 0.95);
                    t.lineTo(tx + L.tam * 0.14 + sw, y - 2);
                    t.lineTo(tx + sw, y - 2);
                    t.closePath(); t.fillPath();
                }
            });
            if (this.vel > 5 && time - (this.ultTraq || 0) > 220) { this.ultTraq = time; K.ruido({ f: 160, q: 2, dur: 0.06, vol: 0.025 }); }
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            var o = this.enVentanilla();
            var P = this.L.palanca;
            if (o && o.id === this.objetivo) {
                return this.ctx.mano({ punto: { x: P.x, y: P.y - P.largo * 0.4 }, holdMs: 200, arrastre: { dx: 0, dy: P.largo * 0.5, durMs: 300 }, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
            }
            // Si el que suena no está en la ventanilla, se señala la ventanilla y se espera.
            if (this.ayuda) {
                var obj = this.objs.filter(function (q) { return q.id === self.objetivo && q.estado === 'cinta'; })[0];
                if (obj) this.brillo(obj.actor.cont.x, obj.actor.cont.y, 6);
            }
            return this.pistaBocina(cancelada);
        },

        estadoExtra: function () {
            var v = this.enVentanilla();
            return { vel: Math.round(this.vel), ventanilla: v ? v.id : null, objs: this.objs.map(function (o) { return o.id + '@' + Math.round(o.actor.cont.x); }) };
        },

        zonaFiesta: function () { var L = this.L; return { x: L.W * 0.08, y: L.cinta.y - L.tam * 0.42, w: L.W * 0.7 }; },

        antesDeFiesta: async function () {
            this.velMeta = 0;
            this.objs.forEach(function (o) { o.actor.cont.setAlpha(0.3); });
        },

        /* ── Escena final: Zeus y Zoe vienen a la ventanilla con un carrito cada uno; los objetos
              entregados saltan a los carritos (cada uno con su sonido) y se van felices. ── */

        escenaFinal: async function () {
            var self = this;
            var L = this.L, V = L.vent;
            var vistos = {};
            var lista = this.coleccion.filter(function (a) { if (!a.cont || !a.cont.active || vistos[a.id]) return false; vistos[a.id] = 1; return true; });
            this.coleccion.forEach(function (a) { if (lista.indexOf(a) < 0 && a.cont) a.cont.setVisible(false); });
            this.objs.forEach(function (o) { self.tweens.add({ targets: o.actor.cont, alpha: 0, duration: 300 }); });
            if (this.palanca) this.tweens.add({ targets: this.palanca, alpha: 0, duration: 300 });
            var P3 = global.AsociaPj3D;
            var alto = Math.max(110, Math.min(L.tam * 2.3, L.H * 0.32));
            var piso = L.H - 14;
            var yc = piso - alto / 2;
            var sep = Math.min(L.W * 0.22, alto * 0.9);
            var metas = [V.x - sep, V.x + sep * 0.55];
            if (this.pres && this.pres.visible) this.pres.visible(false);
            // Cada uno con su carrito (va detrás, del lado de donde vienen).
            var carros = metas.map(function () {
                var c = self.add.container(-alto, piso - alto * 0.12).setDepth(46);
                var w = alto * 0.5, h = alto * 0.2;
                var g = self.add.graphics();
                g.fillStyle(0x000000, 0.15); g.fillEllipse(0, h * 0.75, w * 1.1, h * 0.35);
                g.fillStyle(0xd9480f, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
                g.fillStyle(0xff922b, 1); g.fillRect(-w / 2 + 4, -h / 2 + 3, w - 8, 5);
                g.lineStyle(4, 0x495057, 1); g.lineBetween(w / 2, -h * 0.1, w / 2 + alto * 0.18, -h * 0.9);
                g.fillStyle(0x343a40, 1); g.fillCircle(-w * 0.3, h * 0.55, h * 0.3); g.fillCircle(w * 0.3, h * 0.55, h * 0.3);
                g.fillStyle(0xadb5bd, 1); g.fillCircle(-w * 0.3, h * 0.55, h * 0.12); g.fillCircle(w * 0.3, h * 0.55, h * 0.12);
                c.add(g);
                c.w = w; c.h = h; c.carga = [];
                return c;
            });
            var pjs = P3 ? [P3.crear('nino', { alto: alto, clip: 'Correr', mira: 'derecha' }), P3.crear('nina', { alto: alto, clip: 'Correr', mira: 'derecha' })] : [];
            var ubicar = function (k, x) {
                carros[k].x = x - alto * 0.42;
                carros[k].carga.forEach(function (a, i) { a.cont.x = carros[k].x + (i - (carros[k].carga.length - 1) / 2) * carros[k].w * 0.3; });
                if (pjs[k]) pjs[k].ubicar(x, yc);
            };
            // 1) Llegan corriendo desde la izquierda.
            var o = { t: 0 };
            var x0 = [-alto * 0.6, -alto * 1.6];
            K.ruido({ f: 300, q: 1, dur: 0.6, vol: 0.04 });
            await tw(this, { targets: o, t: 1, duration: 1700, ease: 'Sine.easeOut', onUpdate: function () { metas.forEach(function (m, k) { ubicar(k, x0[k] + (m - x0[k]) * o.t); }); } });
            pjs.forEach(function (p) { p.clip('Saludar'); p.mirar('frente'); });
            if (!this.sigue()) return;
            await esperar(this, 500);
            // 2) Cada objeto pasa por el mostrador y salta a un carrito.
            for (var i = 0; i < lista.length; i++) {
                var a = lista[i], k = i % 2, car = carros[k];
                a.cont.setVisible(true).setAlpha(1).setAngle(0).setDepth(47);
                var esc = Math.min(car.w * 0.42, L.tam * 0.6) / a.tam;
                await this.saltarA(a.cont, V.x, L.mostrador - L.tam * 0.4, { ms: 380, alto: L.tam * 0.5 });
                this.escuchar(a.sonido, { breve: true, bocina: false, vol: 0.75 });
                if (a.saltito) a.saltito(0.1, 1);
                car.carga.push(a);
                var n = car.carga.length;
                var dx = (n - 1 - (n - 1) / 2) * car.w * 0.3;
                await this.saltarA(a.cont, car.x + dx, car.y - car.h * 0.55 - (n > 2 ? 6 : 0), { ms: 520, alto: L.tam * 0.6, esc: esc });
                car.carga.forEach(function (b, j) { b.cont.x = car.x + (j - (n - 1) / 2) * car.w * 0.3; });
                K.tono({ f: 650, dur: 0.06, vol: 0.04 });
                Ut.estallido(this, car.x, car.y - car.h, { n: 5, tex: 'corazon', tam: 20, dist: 60, depth: 50 });
                if (pjs[k]) { pjs[k].clip('Aplaudir'); }
            }
            if (!this.sigue()) return;
            // 3) Celebran, saludan y se van corriendo con sus carritos.
            pjs.forEach(function (p) { p.clip('Celebrar'); });
            await esperar(this, 1300);
            pjs.forEach(function (p) { p.mirar('derecha'); p.clip('Correr'); });
            var ini = metas.slice();
            var o2 = { t: 0 };
            await tw(this, { targets: o2, t: 1, duration: 1800, ease: 'Sine.easeIn', onUpdate: function () { ini.forEach(function (m, k) { ubicar(k, m + (L.W + alto * 1.5 - m) * o2.t); }); } });
            pjs.forEach(function (p) { p.destruir(); });
            if (this.pres && this.pres.visible && L.pres) this.pres.visible(true);
        },

        demo: async function () {
            var self = this;
            var ctx = this.ctx;
            var t = ctx.textos || {};
            var d = this.config.demo || { sonido: 'mugido', correcto: 'vaca', opciones: ['gallo', 'vaca'] };
            var L = this.L;
            this.fase = 'demo';
            var limpiar = function () {
                ctx.quitarMano();
                self.velMeta = 0;
                self.objs.forEach(function (o) { o.actor.destruir(); });
                self.objs = [];
                self.vivos = [];
                self.subirPalanca();
            };
            await ctx.decir({ voz: 'zoe', texto: t.demostracion || '¡Mira cómo se juega!' }, { minMs: 1600 });
            if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
            this.nv = { vel: Math.max(60, L.W * 0.08) };
            this.cargar(d.opciones);
            this.objs.forEach(function (o) { o.actor.sonido = o.id === d.correcto ? d.sonido : Act.sonidoDe(o.id); });
            this.velMeta = this.nv.vel;
            var b = L.bocina;
            var sonando = Promise.resolve();
            await ctx.mano({ punto: { x: b.x, y: b.y }, holdMs: 500, onPresionar: function () { sonando = self.escuchar(d.sonido); } });
            await sonando;
            // Espera a que la vaca llegue a la ventanilla.
            var vaca = this.objs.filter(function (o) { return o.id === d.correcto; })[0];
            var t0 = this.time.now;
            while (ctx.vivo() && ctx.enDemo() && Math.abs(vaca.actor.cont.x - (L.vent.x - this.vel * 0.5)) > 14 && this.time.now - t0 < 20000) await esperar(this, 30);
            if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
            var P = L.palanca;
            await ctx.mano({ punto: { x: P.x, y: P.y - P.largo * 0.4 }, holdMs: 150, arrastre: { dx: 0, dy: P.largo * 0.5, durMs: 260, soltarEnDestino: true }, onDuranteArrastre: function () { self.bajarPalanca(); self.velMeta = 0; } });
            var a = vaca.actor;
            vaca.estado = 'entregado';
            a.cont.setDepth(45);
            await tw(this, { targets: a.cont, x: L.vent.x, y: L.mostrador - L.tam * 0.42, duration: 420, ease: 'Back.easeOut' });
            K.efecto(this, 'recompensa');
            Ut.estallido(this, a.cont.x, a.cont.y - L.tam * 0.2, { n: 14, tex: 'estrella', tam: 28, dist: 150, sinTinte: true, depth: 85 });
            await Promise.all([this.escuchar(d.sonido, { breve: true, bocina: false }), a.acierto(1500)]);
            await ctx.decir({ voz: 'zoe', texto: t.demostracionAcierto || '¡Así se hace!' }, { estado: 'acierto', minMs: 1300 });
            await ctx.decir({ voz: 'zoe', texto: t.demostracionFin || '¡Ahora te toca a ti!' }, { minMs: 1000 });
            limpiar();
        }
    };

    K.crear({ id: 'cinta', fondo: '#e6f4ea', escena: escena });
})(typeof window !== 'undefined' ? window : this);
