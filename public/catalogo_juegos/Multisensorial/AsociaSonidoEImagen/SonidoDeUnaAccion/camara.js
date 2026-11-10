/**
 * «El fotógrafo del parque» — motor propio de Sonido de una acción (5-6 años).
 *
 * En el parque, Zeus y Zoe (personajes 3D) hacen cosas: aplauden, corren, saltan, duermen la
 * siesta. Suena una acción (aplausos, pasos, saltos, ronquidos). El niño ARRASTRA EL VISOR de la
 * cámara hasta quien la está haciendo y lo MANTIENE QUIETO: el anillo de enfoque se llena y la
 * cámara dispara (flash y clic). Si la foto es la correcta, la persona repite su acción con su
 * sonido y la foto vuela al álbum. Si no, esa persona hace su propio sonido y la foto se arruga.
 *
 * Niveles: 1 el reto · 2 otra acción · 3 la gente cambia de lugar y el visor es más chico ·
 * 4 cada foto trae una acción nueva.
 */
(function (global) {
    'use strict';

    var K = global.AsociaKit;
    var Ut = global.PedniaParejaBase.util;
    var Act = global.AsociaActores;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var rnd = Ut.rnd;
    var ENFOQUE_MS = 800;

    var escena = {
        iniciar: function () { this.gente = []; this.visor = null; this.fotos = []; },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.bocina = { x: W / 2, y: Math.max(60, Math.min(96, 54 + hueco * 0.2)), r: Math.max(28, Math.min(38, hueco * 0.3)) };
            L.pres = null;                                  // aquí los protagonistas 3D ya son Zeus y Zoe
            L.suelo = H * 0.58;
            L.tam = Math.max(90, Math.min(170, H * 0.27, W / 5));
            var n = 4, x0 = W * 0.1 + L.tam * 0.3, x1 = W * 0.84 - L.tam * 0.3;
            L.sitios = [];
            for (var i = 0; i < n; i++) L.sitios.push({ x: x0 + (x1 - x0) * i / (n - 1), y: L.suelo + (H - L.suelo) * (i % 2 ? 0.3 : 0.5) });
            L.album = { x: 18, y: L.bocina.y + L.bocina.r + 18 };
            return L;
        },

        armar: function (reubicar) {
            var self = this;
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            // Parque vivo por capas (comun/vida.js): se mueve y responde al dedo.
            var V = this.montarVida(keep);
            if (V) V.parque({ horizonte: L.suelo - 30, arboles: [0.05, 0.27, 0.5, 0.74, 0.95], solX: 0.85 });
            K.textura(this, 'parque_pasto', L.W, L.H - L.suelo + 40, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#69b84a'); g.addColorStop(1, '#4f9a36');
                x.fillStyle = g; x.fillRect(0, 0, w, h);
                K.grano(x, 0, 0, w, h, Math.round(w * h / 250), ['#8fd16a', '#3d7f29', '#a9e08a'], 1.6, 0.45);
                // Sendero.
                x.fillStyle = '#e2c290';
                x.beginPath(); x.moveTo(0, h * 0.62); x.bezierCurveTo(w * 0.3, h * 0.42, w * 0.6, h * 0.82, w, h * 0.55); x.lineTo(w, h * 0.72); x.bezierCurveTo(w * 0.6, h * 0.98, w * 0.3, h * 0.58, 0, h * 0.78); x.fill();
                K.grano(x, 0, h * 0.4, w, h * 0.6, Math.round(w * h / 900), ['#c9a56d', '#f3dcb0'], 1.4, 0.4);
            });
            keep(this.add.image(0, L.suelo - 40, 'parque_pasto').setOrigin(0, 0).setDepth(1));
            if (V) V.mariposas(3, { x: 0, y: L.suelo - 20, w: L.W, h: 40, depth: 8 });
            this.visorG = keep(this.add.graphics().setDepth(70));
            this.flash = keep(this.add.rectangle(0, 0, L.W, L.H, 0xffffff, 0).setOrigin(0, 0).setDepth(90));
            if (!this.visor) this.visor = { x: L.W / 2, y: L.suelo - L.tam * 0.6, carga: 0, movido: false };
            this.montarHud(keep);
            this.gente.forEach(function (g) { var s = L.sitios[g.sitio]; g.actor.cont.setPosition(s.x, s.y).setScale(L.tam / g.actor.tam); });
            this.fotos.forEach(function (f, k) { var p = self.lugarAlbum(k); f.setPosition(p.x, p.y); });
        },

        /* ── Gente ── */

        poner: function (ids) {
            var self = this;
            var L = this.L;
            this.gente.forEach(function (g) { g.actor.destruir(); });
            this.gente = [];
            this.vivos = [];
            var sitios = Ut.mezclar([0, 1, 2, 3]);
            ids.forEach(function (id, k) {
                var s = L.sitios[sitios[k]];
                var a = Act.crear(self, id, s.x, s.y, L.tam);
                a.sonido = self.sonidoDe(id);
                a.cont.setDepth(20 + s.y / 1000).setAlpha(0);
                self.tweens.add({ targets: a.cont, alpha: 1, duration: 500, delay: k * 120 });
                self.gente.push({ id: id, actor: a, sitio: sitios[k], hecho: false });
                self.vivos.push(a);
            });
        },

        disponibles: function () { return this.gente.filter(function (g) { return !g.hecho; }).map(function (g) { return g.id; }); },

        /** Nivel 3: dos personas se cambian de lugar caminando. */
        mezclarLugares: async function () {
            var L = this.L;
            var libres = this.gente.filter(function (g) { return !g.hecho; });
            if (libres.length < 2 || this.fase !== 'jugar') return;
            var a = libres[(Math.random() * libres.length) | 0];
            var b = libres.filter(function (g) { return g !== a; })[(Math.random() * (libres.length - 1)) | 0];
            var sa = a.sitio, sb = b.sitio;
            a.sitio = sb; b.sitio = sa;
            // Se desvanecen un momento (los 3D no se superponen raro) y aparecen en el otro lugar.
            await Promise.all([a, b].map(function (g) { return tw(this, { targets: g.actor.cont, alpha: 0.36, duration: 250 }); }, this));
            [a, b].forEach(function (g) { var s = L.sitios[g.sitio]; g.actor.cont.setPosition(s.x, s.y).setDepth(20 + s.y / 1000); });
            await Promise.all([a, b].map(function (g) { return tw(this, { targets: g.actor.cont, alpha: 1, duration: 250 }); }, this));
        },

        /* ── Visor de la cámara ── */

        /** El visor arranca arriba, en el cielo, lejos de la gente (si no, dispararía solo). */
        visorAlCielo: function () {
            var L = this.L;
            if (!this.visor) this.visor = {};
            this.visor.x = L.W / 2; this.visor.y = L.suelo - L.tam * 0.6;
            this.visor.carga = 0; this.visor.movido = false;
        },

        radioVisor: function () { return this.L.tam * (this.nv && this.nv.dificil ? 0.42 : 0.55); },

        personaEnVisor: function () {
            var v = this.visor;
            var r = this.radioVisor();
            var mejor = null, dmin = r;
            this.gente.forEach(function (g) {
                if (g.hecho) return;
                var c = g.actor.cont;
                var d = Math.hypot(c.x - v.x, c.y - v.y);
                if (d < dmin) { dmin = d; mejor = g; }
            });
            return mejor;
        },

        dibujarVisor: function (t) {
            var g = this.visorG;
            g.clear();
            var v = this.visor;
            if (!v || this.fase === 'fin') return;
            var r = this.radioVisor();
            var w = r * 2.1, h = r * 1.7;
            var x = v.x - w / 2, y = v.y - h / 2, e = r * 0.35;
            // Esquinas del visor.
            g.lineStyle(5, 0xffffff, 0.95);
            [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach(function (q) {
                g.beginPath(); g.moveTo(q[0] + e * q[2], q[1]); g.lineTo(q[0], q[1]); g.lineTo(q[0], q[1] + e * q[3]); g.strokePath();
            });
            // Cruz central y anillo de enfoque que se llena.
            g.lineStyle(2, 0xffffff, 0.7);
            g.beginPath(); g.moveTo(v.x - 10, v.y); g.lineTo(v.x + 10, v.y); g.moveTo(v.x, v.y - 10); g.lineTo(v.x, v.y + 10); g.strokePath();
            if (v.carga > 0) {
                g.lineStyle(6, 0x51cf66, 0.95);
                g.beginPath(); g.arc(v.x, v.y, r * 0.42, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * v.carga); g.strokePath();
            }
            // Punto rojo de "grabando" que parpadea.
            if (Math.sin(t / 250) > 0) { g.fillStyle(0xff3b3b, 1); g.fillCircle(x + w - 14, y + 14, 6); }
        },

        alTocar: function (p) {
            if (this.fase !== 'jugar') return;
            var v = this.visor;
            this.arrastrando = { dx: v.x - p.x, dy: v.y - p.y };
            // Si toca lejos del visor, el visor salta hasta el dedo.
            if (Math.hypot(p.x - v.x, p.y - v.y) > this.radioVisor() * 1.4) this.arrastrando = { dx: 0, dy: 0 };
            this.moverVisor(p);
            this.pista.reiniciar();
        },

        alMover: function (p) { if (this.arrastrando && this.fase === 'jugar') this.moverVisor(p); },

        alSoltar: function () { this.arrastrando = null; },

        moverVisor: function (p) {
            var v = this.visor;
            var nx = p.x + this.arrastrando.dx, ny = p.y + this.arrastrando.dy;
            if (Math.hypot(nx - v.x, ny - v.y) > 4) { v.quieto = this.time.now; v.movido = true; }
            v.x = nx; v.y = ny;
        },

        disparar: async function (g) {
            var self = this;
            var L = this.L;
            var a = g.actor;
            this.fase = 'disparo';
            this.visor.carga = 0;
            // Flash y clic de cámara.
            K.efecto(this, 'camara');
            K.ruido({ f: 3000, q: 0.8, dur: 0.06, vol: 0.12 });
            this.flash.setFillStyle(0xffffff, 0.85);
            this.tweens.add({ targets: this.flash, fillAlpha: 0, duration: 380 });
            var foto = this.crearFoto(g.id, a.cont.x, a.cont.y);
            if (g.id === this.objetivo) {
                g.hecho = true;
                this.fase = 'jugar';
                await this.celebrar(a);
                var p = this.lugarAlbum(this.fotos.length);
                this.fotos.push(foto);
                this.coleccion.push(a);
                await tw(this, { targets: foto, x: p.x, y: p.y, scale: 0.55, angle: rnd(-8, 8), duration: 700, ease: 'Sine.easeInOut' });
                // Estrellita sobre la persona fotografiada.
                var e = this.add.image(a.cont.x, a.cont.y - L.tam * 0.6, global.PedniaArte.textura(this, 'estrella', 64)).setDisplaySize(30, 30).setDepth(60);
                g.estrella = e;
                await this.seguir();
            } else {
                this.yaFotografiado = g;
                this.fase = 'jugar';
                await this.fallar(a);
                // La foto se arruga y se va.
                await tw(this, { targets: foto, scaleX: 0.15, scaleY: 0.12, angle: 200, duration: 380, ease: 'Quad.easeIn' });
                await tw(this, { targets: foto, y: L.H + 60, alpha: 0, duration: 420, ease: 'Quad.easeIn' });
                foto.destroy();
            }
        },

        /** Foto instantánea: marco blanco con el fondo del parque y una silueta de la acción. */
        crearFoto: function (id, x, y) {
            var L = this.L;
            var w = L.tam * 0.9, h = L.tam * 1.05;
            var c = this.add.container(x, y).setDepth(85).setScale(0.2);
            c.idFoto = id;
            c.add(this.add.rectangle(4, 6, w, h, 0x000000, 0.25));
            c.add(this.add.rectangle(0, 0, w, h, 0xffffff).setStrokeStyle(1, 0xdee2e6));
            c.add(this.add.rectangle(0, -h * 0.08, w * 0.86, h * 0.68, 0x8ce99a));
            c.add(this.add.rectangle(0, -h * 0.3, w * 0.86, h * 0.24, 0xa5d8ff));
            // Pictograma de la acción.
            var col = 0x343a40;
            var g = this.add.graphics();
            var s = w * 0.2;
            g.fillStyle(col, 1);
            if (id === 'durmiendo') {
                g.fillRoundedRect(-s * 1.4, -s * 0.1, s * 2.8, s * 0.7, 6);
                g.fillCircle(-s * 1.1, -s * 0.35, s * 0.35);
                g.fillStyle(0x5f3dc4, 1); g.fillTriangle(s * 0.6, -s * 1.2, s * 1.1, -s * 1.2, s * 0.6, -s * 0.8);
            } else {
                g.fillCircle(0, -s * 1.1, s * 0.4);
                g.fillRoundedRect(-s * 0.3, -s * 0.7, s * 0.6, s * 1.1, 6);
                g.lineStyle(s * 0.22, col, 1);
                if (id === 'aplaudiendo') { g.beginPath(); g.moveTo(-s * 0.2, -s * 0.5); g.lineTo(-s * 0.05, -s * 0.95); g.moveTo(s * 0.2, -s * 0.5); g.lineTo(s * 0.05, -s * 0.95); g.strokePath(); }
                if (id === 'corriendo') { g.beginPath(); g.moveTo(0, s * 0.4); g.lineTo(-s * 0.6, s * 0.9); g.moveTo(0, s * 0.4); g.lineTo(s * 0.6, s * 0.8); g.strokePath(); }
                if (id === 'saltando') { g.beginPath(); g.moveTo(-s * 0.1, s * 0.4); g.lineTo(-s * 0.4, s * 0.7); g.moveTo(s * 0.1, s * 0.4); g.lineTo(s * 0.4, s * 0.7); g.moveTo(-s * 0.2, -s * 0.6); g.lineTo(-s * 0.6, -s * 1.1); g.moveTo(s * 0.2, -s * 0.6); g.lineTo(s * 0.6, -s * 1.1); g.strokePath(); }
            }
            g.y = -h * 0.05;
            c.add(g);
            this.tweens.add({ targets: c, scale: 1, y: y - L.tam * 0.2, duration: 300, ease: 'Back.easeOut' });
            return c;
        },

        lugarAlbum: function (k) {
            var L = this.L;
            var paso = L.tam * 0.55;
            var max = Math.max(1, Math.floor((L.bocina.x - L.bocina.r - 30 - L.album.x) / paso));
            return { x: L.album.x + paso * 0.6 + (k % max) * paso, y: L.album.y + paso * 0.6 + Math.floor(k / max) * paso * 1.1 };
        },

        /* ── Niveles ── */

        planNiveles: function () {
            var plan = this.planBase({ extra: [], n: [4, 4, 4, 4] });
            plan[2].mezcla = true;
            plan[3].mezcla = true;
            return plan;
        },

        prepararNivel: async function (i, nv) {
            this.gente.forEach(function (g) { if (g.estrella) g.estrella.destroy(); });
            this.visorAlCielo();
            this.poner(nv.ids);
            await esperar(this, 700);
        },

        alEmpezarNivel: function (i, nv) {
            var self = this;
            if (this.eventoMezcla) this.eventoMezcla.remove();
            if (nv.mezcla) this.eventoMezcla = this.time.addEvent({ delay: 7000, loop: true, callback: function () { self.mezclarLugares(); } });
        },

        alTerminarNivel: function () { if (this.eventoMezcla) { this.eventoMezcla.remove(); this.eventoMezcla = null; } },

        paso: function (time, delta) {
            var v = this.visor;
            if (!v) return;
            this.dibujarVisor(time);
            if (this.fase !== 'jugar') { v.carga = 0; return; }
            // Visor quieto sobre alguien: el enfoque se llena y dispara.
            var g = this.personaEnVisor();
            // Después de una foto equivocada hay que mover el visor a otra persona para volver a disparar.
            if (g !== this.yaFotografiado) this.yaFotografiado = null;
            if (g && g === this.yaFotografiado) g = null;
            var quieto = time - (v.quieto || 0) > 120;
            // Solo dispara si el niño movió el visor (no porque alguien quedó debajo al empezar).
            if (g && quieto && v.movido) {
                v.carga = Math.min(1, v.carga + delta / ENFOQUE_MS);
                if (time - (this.ultBip || 0) > 260) { this.ultBip = time; K.tono({ f: 1500 + v.carga * 800, dur: 0.04, vol: 0.03 }); }
                if (v.carga >= 1) this.disparar(g);
            } else v.carga = Math.max(0, v.carga - delta / 400);
            this.gente.forEach(function (q) { if (q.estrella) q.estrella.setPosition(q.actor.cont.x, q.actor.cont.y - q.actor.tam * 0.6); });
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            var g = this.gente.filter(function (q) { return q.id === self.objetivo && !q.hecho; })[0];
            if (!g) return Promise.resolve();
            var c = g.actor.cont;
            return this.ctx.mano({
                punto: { x: this.visor.x, y: this.visor.y }, holdMs: 200,
                arrastre: { dx: c.x - this.visor.x, dy: c.y - this.visor.y, durMs: 1100 },
                cancelado: function () { return cancelada() || self.fase !== 'jugar' || !!self.arrastrando; }
            });
        },

        estadoExtra: function () {
            var v = this.visor;
            return { visor: v ? { x: Math.round(v.x), y: Math.round(v.y), carga: +v.carga.toFixed(2) } : null, gente: this.gente.map(function (g) { return { id: g.id, x: Math.round(g.actor.cont.x), y: Math.round(g.actor.cont.y), hecho: g.hecho }; }) };
        },

        zonaFiesta: function () { var L = this.L; return { x: L.W * 0.08, y: L.suelo + (L.H - L.suelo) * 0.42, w: L.W * 0.84 }; },

        /* ── Escena final: álbum de fotos. Se abre un álbum grande; cada foto vuela a su página y se
              pega con cinta mientras la persona repite su sonido; el álbum se cierra con una estrella. ── */

        escenaFinal: async function () {
            var self = this;
            var L = this.L;
            var fotos = this.fotos.filter(function (f) { return f && f.active; }).slice(0, 8);
            if (!fotos.length) return;
            if (this.visor && this.visor.setVisible) this.visor.setVisible(false);
            // Las personas son 3D (capa encima del lienzo): se ocultan mientras el álbum está abierto.
            if (global.AsociaPj3D && global.AsociaPj3D.capa) global.AsociaPj3D.capa(false);
            var cintas = [];
            var velo = this.add.rectangle(0, 0, L.W, L.H, 0x1b2a3a, 0).setOrigin(0, 0).setDepth(86);
            this.tweens.add({ targets: velo, fillAlpha: 0.35, duration: 400 });
            var w = Math.min(L.W * 0.9, 760), h = Math.min(L.H * 0.5, w * 0.62);
            var cx = L.W / 2, cy = L.H * 0.52;
            var libro = this.add.container(cx, cy).setDepth(87).setScale(0.3).setAlpha(0);
            var g = this.add.graphics();
            g.fillStyle(0x000000, 0.25); g.fillRoundedRect(-w / 2 + 6, -h / 2 + 8, w, h, 12);
            g.fillStyle(0x7048e8, 1); g.fillRoundedRect(-w / 2 - 8, -h / 2 - 8, w + 16, h + 16, 14);   // tapas
            g.fillStyle(0xfff9db, 1); g.fillRoundedRect(-w / 2, -h / 2, w / 2 - 2, h, 8);           // hoja izquierda
            g.fillRoundedRect(2, -h / 2, w / 2 - 2, h, 8);                                         // hoja derecha
            g.fillStyle(0xe9d8a6, 1); g.fillRect(-3, -h / 2, 6, h);                                // lomo
            g.lineStyle(1, 0xe9d8a6, 1);
            for (var r = 1; r < 8; r++) { g.lineBetween(-w / 2 + 10, -h / 2 + h * r / 8, -10, -h / 2 + h * r / 8); g.lineBetween(10, -h / 2 + h * r / 8, w / 2 - 10, -h / 2 + h * r / 8); }
            libro.add(g);
            // Tapa (cubre la hoja derecha; se abre girando sobre el lomo).
            var tapa = this.add.container(0, 0);
            var tg = this.add.graphics();
            tg.fillStyle(0x845ef7, 1); tg.fillRoundedRect(0, -h / 2 - 8, w / 2 + 8, h + 16, 14);
            tg.lineStyle(4, 0xffd43b, 1); tg.strokeRoundedRect(14, -h / 2 + 6, w / 2 - 20, h - 12, 10);
            var marcoT = this.add.rectangle(w / 4 + 4, 0, w * 0.2, w * 0.2, 0xfff9db).setStrokeStyle(3, 0xffd43b);
            tapa.add([tg, marcoT]);
            libro.add(tapa);
            K.efecto(this, 'magia');
            await tw(this, { targets: libro, scale: 1, alpha: 1, duration: 450, ease: 'Back.easeOut' });
            K.ruido({ f: 1800, q: 0.7, dur: 0.3, vol: 0.06 });   // hoja que se abre
            await tw(this, { targets: tapa, scaleX: 0, duration: 380, ease: 'Sine.easeIn' });
            tapa.setVisible(false);
            if (!this.sigue()) return;
            // Huecos: 2×2 por hoja.
            var huecos = [];
            [-1, 1].forEach(function (lado) {
                for (var f = 0; f < 2; f++) for (var c = 0; c < 2; c++) {
                    huecos.push({ x: cx + lado * w / 4 + (c - 0.5) * w * 0.22, y: cy + (f - 0.5) * h * 0.48 });
                }
            });
            var escF = Math.min(w * 0.19, h * 0.4) / (L.tam * 1.05);
            for (var i = 0; i < fotos.length; i++) {
                var fo = fotos[i], hq = huecos[i];
                fo.setDepth(88);
                K.ruido({ f: 1500, q: 0.8, dur: 0.18, vol: 0.05 });
                await tw(this, { targets: fo, x: hq.x, y: hq.y, scale: escF, angle: (i % 2 ? 4 : -4), duration: 420, ease: 'Sine.easeInOut' });
                // Cinta en dos esquinas.
                var fw = L.tam * 0.9 * escF, fh = L.tam * 1.05 * escF;
                [-1, 1].forEach(function (s) {
                    cintas.push(self.add.rectangle(hq.x + s * fw * 0.42, hq.y - fh * 0.48, fw * 0.32, fh * 0.12, 0xfff3bf, 0.85).setAngle(s * 35).setDepth(89));
                });
                K.ruido({ f: 3500, q: 1, dur: 0.06, vol: 0.06 });
                // La persona de esa foto repite su sonido.
                var gp = this.gente.filter(function (q) { return q.id === fo.idFoto; })[0];
                if (gp) this.escuchar(gp.actor.sonido, { breve: true, bocina: false, vol: 0.7 });
                await esperar(this, 420);
                if (!this.sigue()) return;
            }
            await esperar(this, 500);
            // Se cierra con una estrella en la tapa.
            tapa.setVisible(true).setDepth(1);
            libro.bringToTop(tapa);
            await tw(this, { targets: tapa, scaleX: 1, duration: 380, ease: 'Sine.easeOut' });
            fotos.forEach(function (fo) { fo.setVisible(false); });
            cintas.forEach(function (o) { o.destroy(); });
            // Libro cerrado: queda solo la tapa, centrada.
            this.tweens.add({ targets: g, alpha: 0, duration: 250 });
            await tw(this, { targets: libro, x: cx - w / 4 - 4, duration: 320, ease: 'Sine.easeInOut' });
            var est = this.add.image(w / 4 + 4, 0, global.PedniaArte.textura(this, 'estrella', 128)).setDisplaySize(10, 10);
            libro.add(est);
            K.efecto(this, 'recompensa');
            await tw(this, { targets: est, displayWidth: w * 0.16, displayHeight: w * 0.16, duration: 420, ease: 'Back.easeOut' });
            Ut.estallido(this, cx, cy, { n: 14, tex: 'estrella', tam: 24, dist: 140, sinTinte: true, depth: 91 });
            await esperar(this, 700);
        },

        antesDeFiesta: async function () {
            this.gente.forEach(function (g) { if (g.estrella) g.estrella.destroy(); if (!g.hecho) g.actor.cont.setAlpha(0.36); });
            // Solo cuatro personas distintas en la fiesta (las fotos repetidas no se duplican).
            var vistos = {};
            this.coleccion = this.coleccion.filter(function (a) { if (!a.cont.active || vistos[a.id]) return false; vistos[a.id] = 1; return true; });
        },

        demo: async function () {
            var self = this;
            var ctx = this.ctx;
            var t = ctx.textos || {};
            var L = this.L;
            this.fase = 'demo';
            var limpiar = function () {
                ctx.quitarMano();
                self.gente.forEach(function (g) { g.actor.destruir(); });
                self.gente = [];
                self.vivos = [];
                self.visorAlCielo();
            };
            await ctx.decir({ voz: 'zeus', texto: t.demostracion || '¡Mira cómo se juega!' }, { minMs: 1600 });
            if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
            // Demo con los dos de la izquierda: alguien saltando y alguien durmiendo.
            ['saltando', 'durmiendo'].forEach(function (id, k) {
                var s = L.sitios[k];
                var a = Act.crear(self, id, s.x, s.y, L.tam);
                a.sonido = Act.sonidoDe(id);
                a.cont.setDepth(20);
                self.gente.push({ id: id, actor: a, sitio: k, hecho: false });
                self.vivos.push(a);
            });
            await esperar(this, 600);
            var b = L.bocina;
            var sonando = Promise.resolve();
            await ctx.mano({ punto: { x: b.x, y: b.y }, holdMs: 500, onPresionar: function () { sonando = self.escuchar('durmiendo'); } });
            await sonando;
            var g = this.gente[1];
            if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
            var c = g.actor.cont, v = this.visor;
            var x0 = v.x, y0 = v.y;
            await ctx.mano({
                punto: { x: x0, y: y0 }, holdMs: 200, arrastre: { dx: c.x - x0, dy: c.y - y0, durMs: 1100, soltarEnDestino: true },
                onDuranteArrastre: function () { var o = { x: x0, y: y0 }; self.tweens.add({ targets: o, x: c.x, y: c.y, duration: 1100, ease: 'Sine.easeInOut', onUpdate: function () { v.x = o.x; v.y = o.y; } }); }
            });
            // El enfoque se llena solo.
            var o2 = { k: 0 };
            await tw(this, { targets: o2, k: 1, duration: ENFOQUE_MS, onUpdate: function () { v.carga = o2.k; } });
            v.carga = 0;
            if (!ctx.vivo()) return limpiar();
            K.efecto(this, 'camara');
            this.flash.setFillStyle(0xffffff, 0.85);
            this.tweens.add({ targets: this.flash, fillAlpha: 0, duration: 380 });
            var foto = this.crearFoto('durmiendo', c.x, c.y);
            K.efecto(this, 'recompensa');
            await Promise.all([this.escuchar('durmiendo', { breve: true, bocina: false }), g.actor.acierto(1500)]);
            await ctx.decir({ voz: 'zoe', texto: t.demostracionAcierto || '¡Así se hace!' }, { estado: 'acierto', minMs: 1300 });
            await ctx.decir({ voz: 'zeus', texto: t.demostracionFin || '¡Ahora te toca a ti!' }, { minMs: 1000 });
            foto.destroy();
            limpiar();
        }
    };

    K.crear({ id: 'camara', fondo: '#a5d8ff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
