/**
 * «Safari fotográfico» — motor propio de Secuencia con Distractor (3-4 años).
 *
 * El niño es fotógrafo de safari. Un letrero muestra los animales INVITADOS del desfile (la canción:
 * por ejemplo elefante-león-elefante-león). Los animales pasan caminando en fila y cada uno llama al
 * entrar; de pronto se cuela un INTRUSO, un animal que no está en la lista. El niño maneja el visor de
 * una cámara con el dedo (el visor tiene lente de aumento de verdad), lo sostiene sobre el intruso
 * hasta que enfoca —o levanta el dedo para disparar— y la foto va al álbum con 1 a 3 estrellas según
 * lo bien encuadrada. Si fotografía a un invitado, la foto se descarta con un aviso amable.
 *
 * Niveles = cuatro lugares: sabana dorada, selva, laguna al atardecer y noche con luciérnagas.
 * Final: foto de grupo con cuenta atrás, flash y el álbum completo.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var C = Phaser.Display.Color;

    var ANIM = ['elefante', 'leon', 'vaca', 'caballo', 'burro', 'perro', 'gato', 'gallo', 'pato', 'pollito', 'rana'];

    var NIV = [
        { guests: 2, meta: 1, vel: 74, cada: 2900 },
        { guests: 2, meta: 2, vel: 84, cada: 2700 },
        { guests: 3, meta: 2, vel: 94, cada: 2600 },
        { guests: 3, meta: 3, vel: 102, cada: 2500 }
    ];

    var BIOMAS = [
        { nombre: 'sabana', cielo: [0x5fa8ef, 0xffd9a0], astro: 0xffcf66, astroY: 0.5, noche: 0, lejos: 0xd9a36a, medio: 0xb98a3c, suelo: 0xd9b15f, suelo2: 0xc99a45, hierba: 0xa9782e, arbol: 'acacia', nubes: 0xfff3dc },
        { nombre: 'selva', cielo: [0x4fc0a0, 0xf0ffd2], astro: 0xfff3bf, astroY: 0.22, noche: 0, lejos: 0x3f9a62, medio: 0x23743c, suelo: 0x63ad3c, suelo2: 0x4f9330, hierba: 0x1f8a32, arbol: 'palma', nubes: 0xffffff },
        { nombre: 'laguna', cielo: [0x5b7fd6, 0xffbcb8], astro: 0xff8a5c, astroY: 0.55, noche: 0, lejos: 0x8068b0, medio: 0x5a4a8f, suelo: 0xb5803f, suelo2: 0x9a6a30, hierba: 0x3f8f6a, arbol: 'juncos', nubes: 0xffd2c4 },
        { nombre: 'noche', cielo: [0x060b26, 0x2a3a78], astro: 0xf1f3f5, astroY: 0.22, noche: 1, lejos: 0x2a3566, medio: 0x1c274f, suelo: 0x3f4466, suelo2: 0x343958, hierba: 0x1f2a46, arbol: 'acacia', nubes: 0x46508a }
    ];

    // Fondos del diseño (1280x720): 0 desierto dorado, 1 selva, 2 sabana al atardecer, 3 noche con luna.
    var DIB = { w: 1280, h: 720, sol: [[639, 172], null, null, [600, 191]] };
    // Cartel de madera: el tablero va de x=52.5 a 738 y de y=168 a 439 (centro 395, 303) en un dibujo de 780x500.
    var CARTEL = { w: 780.53, h: 500, tabW: 685.5, cx: 395.3, cy: 303.5 };

    function mezcla(a, b, t) {
        var c = C.Interpolate.ColorWithColor(C.ValueToColor(a), C.ValueToColor(b), 100, Math.max(0, Math.min(1, t)) * 100);
        return C.GetColor(c.r, c.g, c.b);
    }
    function mezclaBioma(a, b, t) {
        var o = { arbol: b.arbol };
        ['astro', 'lejos', 'medio', 'suelo', 'suelo2', 'hierba', 'nubes'].forEach(function (k) { o[k] = mezcla(a[k], b[k], t); });
        o.cielo = [mezcla(a.cielo[0], b.cielo[0], t), mezcla(a.cielo[1], b.cielo[1], t)];
        ['astroY', 'noche'].forEach(function (k) { o[k] = a[k] + (b[k] - a[k]) * t; });
        return o;
    }
    function hash(i) { var x = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return x - Math.floor(x); }

    var escena = {
        precargar: function () {
            var self = this;
            [1, 2, 3, 4].forEach(function (i) { if (!self.textures.exists('sd_fondo' + i)) self.load.svg('sd_fondo' + i, 'img/diseno/fondo' + i + '.svg', { width: 1280, height: 720 }); });
            if (!this.textures.exists('sd_cartel')) this.load.svg('sd_cartel', 'img/diseno/cartel.svg', { width: 940, height: 602 });
        },

        prepararArte: function () {
            this.arteOk = [1, 2, 3, 4].every(function (i) { return this.textures.exists('sd_fondo' + i); }, this) && this.textures.exists('sd_cartel');
        },

        /** Los cuatro fondos del diseño, apilados: se mezclan al cambiar de lugar y se mecen despacio. */
        montarFondoArte: function (keep) {
            var L = this.L, self = this;
            this.dfondos = [1, 2, 3, 4].map(function (i) {
                var im = keep(self.add.image(0, 0, 'sd_fondo' + i).setOrigin(0, 0).setDisplaySize(L.W * 1.05, L.H).setDepth(0.5));
                return im;
            });
        },

        animarFondoArte: function (time, s, P, te) {
            var L = this.L, W = L.W, de = this.biomaDe, bi = this.bioma;
            var x = -0.025 * W + Math.sin(s * 0.12) * 0.02 * W;
            var pesos = [0, 0, 0, 0];
            pesos[de] += 1 - te; pesos[bi] += te;
            this.dfondos.forEach(function (im, i) {
                var a = i === bi ? te : (i === de ? 1 : 0);
                if (de === bi) a = i === bi ? 1 : 0;
                im.setPosition(x, 0).setAlpha(a).setVisible(a > 0.01).setDepth(i === bi ? 0.52 : 0.5);
            });
            var ag = this.astroG; ag.clear();
            // Brillo que late alrededor del sol y de la luna del diseño.
            [0, 3].forEach(function (i) {
                if (pesos[i] < 0.02) return;
                var p = DIB.sol[i]; if (!p) return;
                var cx = x + p[0] / DIB.w * W * 1.05, cy = p[1] / DIB.h * L.H;
                ag.fillStyle(i === 3 ? 0xdfe8ff : 0xfff3bf, pesos[i] * (0.1 + 0.05 * Math.sin(s * 1.8)));
                ag.fillCircle(cx, cy, 96 + 6 * Math.sin(s * 1.8));
                ag.fillStyle(i === 3 ? 0xdfe8ff : 0xfff3bf, pesos[i] * (0.07 + 0.04 * Math.sin(s * 1.8 + 1)));
                ag.fillCircle(cx, cy, 150);
            });
            // Estrellas que titilan en la noche.
            if (pesos[3] > 0.02) for (var e = 0; e < 40; e++) {
                ag.fillStyle(0xffffff, pesos[3] * (0.12 + 0.7 * Math.max(0, Math.sin(s * 1.7 + e * 2.3))));
                ag.fillCircle((e * 977 + 50) % W, 8 + (e * 613) % (L.horiz * 0.8), 1.3 + (e % 3) * 0.7);
            }
        },

        iniciar: function () {
            this.bioma = 0; this.biomaDe = 0; this.biomaT = 1;
            this.animales = [];
            this.reunidos = [];
            this.album = [];
            this.polaroids = [];
            this.mundo = 0;
            this.dedo = null;
            this.visor = null;
            this.foco = null;
            this.capturados = 0;
            this.spawnOn = false;
            this.ultSpawn = 0;
            this.idx = 0;
            this.sinIntruso = 0;
            this.gapObj = 3;
            this.intrusoVivo = false;
            this.ultimoReclamo = -99999;
            this.fiesta = false;
            this.lente = null;
            this.ultViento = 0;
            this.luciernagas = [];
            this.destellos = [];
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.k = Math.max(0.72, Math.min(1.15, H / 768));
            L.horiz = Math.round(H * 0.5);
            L.carriles = [Math.round(H * 0.66), Math.round(H * 0.745), Math.round(H * 0.83)];
            L.tamA = Math.round(Math.max(110, Math.min(170, H * 0.21)));
            L.visorW = Math.round(300 * L.k); L.visorH = Math.round(210 * L.k);
            L.zoom = 1.55;
            L.letrero = { x: Math.round(W * 0.5), y: Math.round(H * 0.17) };
            L.bocina = { x: 48, y: Math.round(H * 0.2), r: 30 };
            L.albumX = 40; L.albumY = H - 100;
            return L;
        },

        armar: function (reubicar) {
            this.prepararArte();
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            if (this.arteOk) this.montarFondoArte(keep);
            this.cieloG = keep(this.add.graphics().setDepth(1));
            this.astroG = keep(this.add.graphics().setDepth(1.5));
            this.lejosG = keep(this.add.graphics().setDepth(2));
            this.medioG = keep(this.add.graphics().setDepth(2.6));
            this.sueloG = keep(this.add.graphics().setDepth(3));
            this.sombraG = keep(this.add.graphics().setDepth(4));
            this.frenteG = keep(this.add.graphics().setDepth(36));
            this.luzG = keep(this.add.graphics().setDepth(38));
            this.ayudaG = keep(this.add.graphics().setDepth(34));
            this.visorG = keep(this.add.graphics().setDepth(70));
            this.albumG = keep(this.add.graphics().setDepth(66));
            this.letreroG = keep(this.add.graphics().setDepth(62));
            this.montarHud(keep);
            this.sembrarMotes(keep, 8, { x: 0, y: 40, w: L.W, h: L.horiz, depth: 5 }, 0xfff3bf);
            if (!this.visor) this.visor = { x: L.W * 0.5, y: L.carriles[1] - 60, vx: 0, vy: 0 };
            this.dibujarLetrero();
            this.montarLente();
            this.reubicarAlbum();
        },

        /** Lente de aumento: una segunda cámara de Phaser que muestra la escena ampliada dentro del visor. */
        montarLente: function () {
            var L = this.L, self = this;
            if (!this.lente) {
                this.lente = this.cameras.add(0, 0, L.visorW, L.visorH);
                this.lente.setZoom(L.zoom);
                this.lente.setName('lente');
            } else this.lente.setSize(L.visorW, L.visorH);
            this.ignorarEnLente((this.estaticos || []).filter(function (o) { return o && o.depth >= 58; }));
        },

        ignorarEnLente: function (objs) {
            if (!this.lente) return;
            var lista = (Array.isArray(objs) ? objs : [objs]).filter(function (o) { return o && o.active !== false; });
            if (lista.length) this.lente.ignore(lista);
        },

        /* ── Letrero con los invitados y marcador del álbum ── */

        dibujarLetrero: function () {
            var L = this.L, g = this.letreroG, self = this;
            g.clear();
            (this.letreroObjs || []).forEach(function (o) { if (o.active) o.destroy(); });
            this.letreroObjs = [];
            if (this.cartelImg && this.cartelImg.active && (!this.nv || !this.nv.guests)) { this.cartelImg.destroy(); this.cartelImg = null; }
            if (!this.nv || !this.nv.guests) return;
            var n = this.nv.guests.length, paso = 78, a = (n + 1) * paso + 50;
            var x0 = L.letrero.x - a / 2, y0 = L.letrero.y - 44;
            if (this.cartelImg && this.cartelImg.active) this.cartelImg.destroy();
            this.cartelImg = null;
            if (this.arteOk) {
                var kc = a / CARTEL.tabW;
                this.cartelImg = this.add.image(L.letrero.x, y0 + 46, 'sd_cartel').setOrigin(CARTEL.cx / CARTEL.w, CARTEL.cy / CARTEL.h).setDisplaySize(CARTEL.w * kc, CARTEL.h * kc).setDepth(61.9);
                this.cartelImg.kc = kc; this.cartelImg.sx0 = this.cartelImg.scaleX; this.cartelImg.sy0 = this.cartelImg.scaleY;
            } else {
                g.lineStyle(4, 0x5c3312, 1); g.lineBetween(x0 + 24, y0, x0 + 24, 0); g.lineBetween(x0 + a - 24, y0, x0 + a - 24, 0);
                g.fillStyle(0x000000, 0.25); g.fillRoundedRect(x0 + 3, y0 + 5, a, 92, 16);
                g.fillStyle(0x8b5524, 1); g.fillRoundedRect(x0, y0, a, 92, 16);
                g.fillStyle(0xa8642e, 1); g.fillRoundedRect(x0 + 6, y0 + 6, a - 12, 80, 12);
            }
            var t = this.add.text(L.letrero.x, y0 + 14, 'INVITADOS', { fontFamily: 'Arial Black, Arial', fontSize: '15px', color: this.arteOk ? '#6c3521' : '#fff3bf' }).setOrigin(0.5).setDepth(63);
            this.letreroObjs.push(t);
            for (var i = 0; i < n; i++) {
                var cx = x0 + 25 + paso * (i + 0.5) + 14, cy = y0 + 56;
                g.fillStyle(0xffffff, 1); g.fillCircle(cx, cy, 28);
                g.lineStyle(4, 0x2f9e44, 1); g.strokeCircle(cx, cy, 28);
                var im = this.add.image(cx, cy, 'el_' + this.nv.guests[i]).setDepth(63);
                im.setScale(46 / Math.max(im.width, im.height));
                this.letreroObjs.push(im);
                this.tweens.add({ targets: im, scale: im.scale * 1.0, duration: 1 });
            }
            var qx = x0 + 25 + paso * (n + 0.5) + 14, qy = y0 + 56;
            g.fillStyle(0xfff3bf, 1); g.fillCircle(qx, qy, 28);
            g.lineStyle(4, 0xe03131, 1); g.strokeCircle(qx, qy, 28);
            g.lineStyle(3, 0xe03131, 1); g.lineBetween(qx - 17, qy + 17, qx + 17, qy - 17);
            var q = this.add.text(qx, qy, '?', { fontFamily: 'Arial Black, Arial', fontSize: '34px', color: '#e03131' }).setOrigin(0.5).setDepth(63);
            this.tweens.add({ targets: q, scale: { from: 1, to: 1.25 }, duration: 520, yoyo: true, repeat: -1 });
            this.letreroObjs.push(q);
            var t2 = this.add.text(qx, y0 + 14, 'INTRUSO', { fontFamily: 'Arial Black, Arial', fontSize: '12px', color: this.arteOk ? '#b02a2a' : '#ffb3b3' }).setOrigin(0.5).setDepth(63);
            this.letreroObjs.push(t2);
            this.letreroPos = { x0: x0, paso: paso, y: y0 + 56, n: n };
            this.ignorarEnLente(this.cartelImg ? this.letreroObjs.concat([this.cartelImg]) : this.letreroObjs);
        },

        resaltaInvitado: function (k) {
            var P = this.letreroPos;
            if (!P) return;
            var o = this.letreroObjs[1 + k];
            if (o && o.active) this.tweens.add({ targets: o, scale: o.scale * 1.35, duration: 160, yoyo: true });
            this.efectos = this.efectos || [];
            this.efectos.push({ x: P.x0 + 25 + P.paso * (k + 0.5) + 14, y: P.y, t0: this.time.now });
        },

        /* ── Álbum de fotos (abajo a la izquierda) ── */

        reubicarAlbum: function () {
            var L = this.L, g = this.albumG, meta = this.nv ? this.nv.meta : 1;
            g.clear();
            (this.albumObjs || []).forEach(function (o) { if (o.active) o.destroy(); });
            this.albumObjs = [];
            this.slotsAlbum = [];
            for (var i = 0; i < meta; i++) {
                var x = L.albumX + 52 + i * 86, y = L.albumY;
                g.fillStyle(0x000000, 0.28); g.fillRoundedRect(x - 40 + 3, y - 52 + 4, 80, 100, 8);
                g.fillStyle(0xf8f9fa, 0.35); g.fillRoundedRect(x - 40, y - 52, 80, 100, 8);
                g.lineStyle(3, 0xffffff, 0.7); g.strokeRoundedRect(x - 40, y - 52, 80, 100, 8);
                g.fillStyle(0x000000, 0.25); g.fillRoundedRect(x - 32, y - 44, 64, 64, 4);
                var cam = this.add.text(x, y - 12, '📷', { fontSize: '30px' }).setOrigin(0.5).setAlpha(0.55).setDepth(67);
                this.albumObjs.push(cam);
                this.slotsAlbum.push({ x: x, y: y, lleno: false });
            }
            this.ignorarEnLente(this.albumObjs);
            // Las fotos ya tomadas se vuelven a poner en su lugar.
            var self = this;
            this.album.forEach(function (f, i) { if (f.cont.active && self.slotsAlbum[i]) f.cont.setPosition(self.slotsAlbum[i].x, self.slotsAlbum[i].y); });
        },

        /* ── Animales del desfile ── */

        crearAnimal: function (id, tipo, carril) {
            var L = this.L;
            var t = Math.round(L.tamA * (0.82 + carril * 0.13));
            var c = this.add.container(L.W + t, L.carriles[carril]).setDepth(20 + carril * 3);
            var sombra = this.add.ellipse(0, 0, t * 0.9, t * 0.16, 0x000000, 0.28);
            var cuerpo = this.add.container(0, 0);
            var img = this.add.image(0, 0, 'el_' + id).setOrigin(0.5, 1);
            img.setScale(t / Math.max(img.width, img.height));
            cuerpo.add(img);
            c.add([sombra, cuerpo]);
            var v = this.nv.d.vel * (0.85 + Math.random() * 0.3) * (1 - carril * 0.06);
            return { id: id, tipo: tipo, cont: c, cuerpo: cuerpo, img: img, sombra: sombra, t: t, carril: carril, v: v, fase: Math.random() * 6, llamo: false, vivo: true, huye: false, y0: L.carriles[carril] };
        },

        siguiente: function () {
            var nv = this.nv, g = nv.guests, tipo = 'invitado', id;
            if (this.sinIntruso >= this.gapObj && !this.intrusoVivo && this.capturados < nv.meta) {
                var libres = nv.intrusos.filter(function (q) { return (this.usados || []).indexOf(q) < 0; }, this);
                if (!libres.length) { this.usados = []; libres = nv.intrusos.slice(); }
                id = libres[(Math.random() * libres.length) | 0];
                (this.usados = this.usados || []).push(id);
                tipo = 'intruso';
                this.sinIntruso = 0;
                this.gapObj = 3 + ((Math.random() * 3) | 0);
                this.intrusoVivo = true;
            } else {
                id = g[this.idx % g.length];
                this.idx += 1;
                this.sinIntruso += 1;
            }
            return { id: id, tipo: tipo };
        },

        lanzar: function () {
            var s = this.siguiente();
            var carril = (Math.random() * 3) | 0;
            var a = this.crearAnimal(s.id, s.tipo, carril);
            this.animales.push(a);
            this.ultSpawn = this.time.now;
            return a;
        },

        /* ── Cámara: disparar, evaluar y guardar la foto ── */

        candidato: function () {
            var v = this.visor, mejor = null, dm = 1e9;
            this.animales.forEach(function (a) {
                if (!a.vivo || a.cont.x < 20 || a.cont.x > this.L.W - 20) return;
                var cy = a.cont.y - a.t * 0.5, d = Math.hypot(a.cont.x - v.x, cy - v.y);
                if (d < Math.max(a.t * 0.55, 60) && d < dm) { dm = d; mejor = a; }
            }, this);
            return mejor ? { a: mejor, d: dm } : null;
        },

        disparar: async function () {
            if (this.fase !== 'jugar' || this.disparando || this.completa) return;
            this.disparando = true;
            this.pista.reiniciar();
            var L = this.L, v = this.visor, self = this;
            var cand = this.candidato();
            this.cameras.main.flash(160, 255, 255, 255);
            K.ruido({ f: 2600, q: 0.6, dur: 0.05, vol: 0.12 });
            K.tono({ f: 1900, f2: 900, dur: 0.12, vol: 0.05 });
            this.destellos.push({ x: v.x, y: v.y, t0: this.time.now });
            this.foco = null;
            if (!cand) {
                this.avisoFlotante(v.x, v.y - 60, 'Aquí no hay nadie');
                await esperar(this, 450);
                this.disparando = false;
                return;
            }
            var a = cand.a;
            var tam = Math.max(a.t * 0.55, 60);
            var est = cand.d < tam * 0.3 ? 3 : cand.d < tam * 0.6 ? 2 : 1;
            var pol = this.crearPolaroid(a.id, est, a.tipo === 'intruso');
            pol.cont.setPosition(v.x, v.y).setScale(0.5).setAlpha(0);
            if (a.tipo === 'intruso') {
                a.vivo = true;
                a.huye = true;
                this.intrusoVivo = false;
                this.capturados += 1;
                this.reunidos.push(a.id);
                this.sonar(a.id, { breve: true, bocina: false });
                this.tweens.add({ targets: a.cuerpo, y: -a.t * 0.4, duration: 150, yoyo: true, repeat: 1 });
                Ut.estallido(this, a.cont.x, a.cont.y - a.t * 0.5, { n: 12, tex: 'estrella', tam: 26, dist: 130, depth: 71, sinTinte: true });
                var slot = this.slotsAlbum[this.capturados - 1];
                await tw(this, { targets: pol.cont, scale: 1.2, alpha: 1, duration: 260, ease: 'Back.easeOut' });
                await esperar(this, 450);
                if (slot) {
                    await tw(this, { targets: pol.cont, x: slot.x, y: slot.y, scale: 0.62, angle: (this.capturados % 2 ? -4 : 4), duration: 520, ease: 'Cubic.easeInOut' });
                    slot.lleno = true;
                    this.album.push(pol);
                }
                K.tono({ f: 660, f2: 1320, dur: 0.3, vol: 0.06 });
                this.pista.reiniciar();
                if (this.capturados >= this.nv.meta) {
                    this.completa = true;
                    this.spawnOn = false;
                    this.disparando = false;
                    if (!this.nv.demo) this.ctx.decir({ voz: 'zoe', texto: '¡Atrapaste a todos los intrusos!' }, { minMs: 600 });
                    this.llegar();
                    return;
                }
                if (!this.nv.demo) this.ctx.decir({ voz: 'zoe', texto: '¡Qué buena foto del intruso!' }, { minMs: 600 });
            } else {
                // Es un invitado: la foto no vale y el animal saluda.
                this.errores += 1; this.erroresNivel += 1;
                if (this.erroresNivel >= 4) this.ayuda = true;
                this.tweens.add({ targets: a.cuerpo, y: -a.t * 0.18, duration: 130, yoyo: true, repeat: 1 });
                await tw(this, { targets: pol.cont, scale: 1.1, alpha: 1, duration: 220 });
                this.sello(pol, 'INVITADO', 0x2f9e44);
                K.tono({ f: 330, f2: 220, dur: 0.18, vol: 0.04 });
                if (this.time.now - this.ultimoReclamo > 6000) {
                    this.ultimoReclamo = this.time.now;
                    this.reaccion('Decir_no', 1400);
                    this.ctx.decir({ voz: 'zeus', texto: '¡Ese es un invitado! Busca al intruso.' }, { minMs: 700 });
                }
                await esperar(this, 900);
                await tw(this, { targets: pol.cont, alpha: 0, y: pol.cont.y + 60, angle: 12, duration: 340 });
                pol.cont.destroy();
            }
            this.disparando = false;
        },

        avisoFlotante: function (x, y, txt) {
            var t = this.add.text(x, y, txt, { fontFamily: 'Arial Black, Arial', fontSize: '20px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5).setDepth(75);
            this.ignorarEnLente(t);
            this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 900, onComplete: function () { t.destroy(); } });
        },

        crearPolaroid: function (id, est, ok) {
            var c = this.add.container(0, 0).setDepth(72);
            var g = this.add.graphics();
            var P = this.pal || BIOMAS[this.bioma];
            g.fillStyle(0x000000, 0.28); g.fillRoundedRect(-62 + 4, -74 + 6, 124, 148, 8);
            g.fillStyle(ok ? 0xfff3bf : 0xffffff, 1); g.fillRoundedRect(-62, -74, 124, 148, 8);
            g.lineStyle(4, ok ? 0xfab005 : 0xced4da, 1); g.strokeRoundedRect(-62, -74, 124, 148, 8);
            g.fillStyle(mezcla(P.cielo[0], P.cielo[1], 0.5), 1); g.fillRect(-52, -64, 104, 96);
            g.fillStyle(P.suelo, 1); g.fillRect(-52, 0, 104, 32);
            c.add(g);
            var im = this.add.image(0, 12, 'el_' + id);
            im.setScale(84 / Math.max(im.width, im.height));
            c.add(im);
            var st = this.add.graphics();
            for (var i = 0; i < 3; i++) {
                var cx = -26 + i * 26, cy = 54, pts = [];
                for (var k = 0; k < 10; k++) { var a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 4.5 : 10; pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }); }
                st.fillStyle(i < est ? 0xfab005 : 0xced4da, 1); st.fillPoints(pts, true);
            }
            c.add(st);
            this.ignorarEnLente(c);
            return { cont: c, id: id, est: est };
        },

        sello: function (pol, txt, col) {
            var t = this.add.text(0, -6, txt, { fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#ffffff', backgroundColor: '#' + col.toString(16).padStart(6, '0'), padding: { x: 8, y: 3 } }).setOrigin(0.5).setAngle(-14);
            pol.cont.add(t);
            this.ignorarEnLente(t);
        },

        llegar: async function () {
            if (this.llegando) return;
            this.llegando = true;
            this.fase = 'premio';
            this.marcadas = [this.reunidos[this.reunidos.length - 1] || this.nv.guests[0]];
            await this.acertar(this.marcadas.slice(), { x: this.visor.x, y: this.visor.y });
            this.llegando = false;
        },

        alAcertar: async function () {
            var self = this;
            this.animales.forEach(function (a) { if (a.vivo) { a.huye = false; a.parado = true; self.tweens.add({ targets: a.cuerpo, y: -a.t * 0.3, duration: 200, yoyo: true, repeat: 2 }); } });
            Ut.confeti(this, 60);
            await esperar(this, 1200);
        },

        /* ── Niveles ── */

        generarNivel: function (i) {
            var self = this, d = NIV[Math.min(i, 3)];
            var pool = Ut.mezclar(ANIM.filter(function (id) { return self.textures.exists('el_' + id); }));
            var guests = pool.slice(0, d.guests);
            var intrusos = pool.slice(d.guests, d.guests + 4);
            return {
                tipo: 'elegir', reproducciones: [guests.concat(guests)], opciones: guests.concat(intrusos.slice(0, 1)), correctas: [intrusos[0]], meta: d.meta, preguntas: [],
                guests: guests, intrusos: intrusos, d: d, bioma: Math.min(i, 3)
            };
        },

        planNiveles: function () { var self = this; return [0, 1, 2, 3].map(function (i) { return self.generarNivel(i); }); },
        nivelDemo: function () { var nv = this.generarNivel(0); nv.demo = true; nv.meta = 1; return nv; },

        preguntar: function () {
            if (this.nv.demo || this.nivelActual > 0) return Promise.resolve();
            return this.ctx.decir({ voz: 'zeus', texto: '¡Fotografía al intruso! Es el animal que no está en la lista de invitados.' }, { minMs: 900 });
        },

        prepararNivel: async function (i, nv) {
            var self = this;
            this.nv = nv;
            this.animales.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.animales = [];
            this.album.forEach(function (f) { if (f.cont.active) tw(self, { targets: f.cont, alpha: 0, duration: 300 }).then(function () { f.cont.destroy(); }); });
            this.album = [];
            this.capturados = 0; this.completa = false; this.llegando = false; this.disparando = false;
            this.idx = 0; this.sinIntruso = 0; this.gapObj = 3; this.intrusoVivo = false; this.usados = [];
            this.erroresNivel = 0;
            if (this.bioma !== nv.bioma) { this.biomaDe = this.bioma; this.bioma = nv.bioma; this.biomaT = 0; }
            this.dibujarLetrero();
            this.reubicarAlbum();
            await esperar(this, 700);
        },

        /** Se oye la lista de invitados (cada animal llama) mientras el letrero lo resalta. */
        presentar: async function () {
            var nv = this.nv;
            this.fase = 'escuchando';
            this.pista.parar();
            await esperar(this, 250);
            for (var r = 0; r < 2; r++) {
                for (var k = 0; k < nv.guests.length; k++) {
                    if (!this.sigue()) return;
                    this.resaltaInvitado(k);
                    await this.sonar(nv.guests[k], { breve: true });
                    await esperar(this, 260);
                }
            }
            await esperar(this, 250);
        },

        mostrarOpciones: async function () {
            this.spawnOn = true;
            this.ultSpawn = this.time.now - 1500;
        },

        alTerminarNivel: async function () {
            this.spawnOn = false;
            await esperar(this, 500);
        },

        /* ── Dedo: mueve el visor; si lo sostienes sobre un animal, enfoca solo; al levantar, dispara ── */

        alTocar: function (p) {
            if (this.fase === 'intro' || this.fase === 'fin') return;
            this.dedo = { x: p.x, y: p.y };
            this.pista.reiniciar();
        },
        alMover: function (p) { if (this.dedo && p.isDown) this.dedo = { x: p.x, y: p.y }; },
        alSoltar: function () {
            if (!this.dedo) return;
            this.dedo = null;
            if (this.fase === 'jugar') this.disparar();
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.disparando) return Promise.resolve();
            var intr = this.animales.filter(function (a) { return a.vivo && a.tipo === 'intruso' && a.cont.x > 60 && a.cont.x < self.L.W - 60; })[0];
            if (!this.ayuda || !intr) { this.picar(); return esperar(this, 800); }
            var v = this.visor;
            return this.ctx.mano({ punto: { x: v.x, y: v.y + 70 }, holdMs: 200, arrastre: { dx: intr.cont.x - v.x, dy: intr.cont.y - intr.t * 0.5 - v.y, durMs: 1000 }, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
        },

        picar: function () {
            var o = this.letreroObjs && this.letreroObjs[this.letreroObjs.length - 2];
            if (o && o.active) this.tweens.add({ targets: o, scale: o.scale * 1.4, duration: 220, yoyo: true, repeat: 1 });
        },

        demoPaso: function () {
            var self = this;
            return [function () {
                var intr = self.animales.filter(function (a) { return a.vivo && a.tipo === 'intruso'; })[0];
                if (!intr) {
                    // La demo no espera al desfile: deja la escena limpia y pone al intruso a la vista.
                    self.spawnOn = false;
                    self.animales = self.animales.filter(function (a) { if (a.tipo === 'invitado') { a.cont.destroy(); return false; } return true; });
                    self.sinIntruso = self.gapObj; self.intrusoVivo = false;
                    intr = self.lanzar();
                    intr.cont.x = self.L.W * 0.7;
                }
                intr.lento = true;
                var v = self.visor;
                return {
                    desde: { x: v.x, y: v.y + 70 }, hasta: { x: intr.cont.x, y: intr.cont.y - intr.t * 0.5 },
                    hacer: async function () {
                        self.fase = 'jugar';
                        for (var t = 0; t < 60 && !self.completa; t++) {
                            var q = intr.cont;
                            self.dedo = { x: q.x, y: q.y - intr.t * 0.5 + 90 };
                            await esperar(self, 80);
                        }
                        self.dedo = null;
                        while (self.llegando && self.fase === 'premio') await esperar(self, 100);
                    }
                };
            }];
        },

        /* ── Final: foto de grupo ── */

        escenaFinal: async function () {
            var self = this, L = this.L;
            this.spawnOn = false; this.fiesta = true; this.dedo = null;
            if (this.lente) this.lente.setVisible(false);
            this.visorG.clear();
            this.animales.forEach(function (a) { if (a.cont.active) tw(self, { targets: a.cont, alpha: 0, duration: 300 }); });
            if (this.bioma !== 2) { this.biomaDe = this.bioma; this.bioma = 2; this.biomaT = 0; }
            await esperar(this, 900);
            var ids = this.nv && this.nv.guests ? this.nv.guests.slice() : ['elefante', 'leon'];
            this.reunidos.forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); });
            ids = ids.slice(0, 6);
            var grupo = [];
            ids.forEach(function (id, i) {
                var x = L.W * 0.5 + (i - (ids.length - 1) / 2) * (L.tamA * 0.95), t = Math.round(L.tamA * 1.05);
                var c = self.add.container(x, L.carriles[1] + 30).setDepth(25 + (i % 2));
                var im = self.add.image(0, 0, 'el_' + id).setOrigin(0.5, 1);
                im.setScale(t / Math.max(im.width, im.height));
                var sombra = self.add.ellipse(0, 0, t * 0.9, t * 0.16, 0x000000, 0.28);
                c.add([sombra, im]);
                c.setAlpha(0).setY(c.y + 40);
                self.tweens.add({ targets: c, alpha: 1, y: c.y - 40, duration: 450, delay: i * 130, ease: 'Back.easeOut' });
                grupo.push({ cont: c, img: im, id: id });
            });
            await esperar(this, 1600);
            // Cuenta atrás y flash.
            var txt = this.add.text(L.W / 2, L.H * 0.3, '', { fontFamily: 'Arial Black, Arial', fontSize: Math.round(120 * L.k) + 'px', color: '#fff3bf', stroke: '#5c3312', strokeThickness: 10 }).setOrigin(0.5).setDepth(80);
            this.ignorarEnLente(txt);
            for (var n = 3; n >= 1; n--) {
                txt.setText(String(n)).setScale(1.5).setAlpha(1);
                K.tono({ f: 520 + n * 60, dur: 0.12, vol: 0.06 });
                grupo.forEach(function (q) { self.tweens.add({ targets: q.img, scaleX: q.img.scaleX * 1.04, scaleY: q.img.scaleY * 1.04, duration: 200, yoyo: true }); });
                await tw(this, { targets: txt, scale: 1, alpha: 0.9, duration: 700 });
            }
            txt.destroy();
            this.cameras.main.flash(300, 255, 255, 255);
            K.ruido({ f: 2600, q: 0.6, dur: 0.06, vol: 0.14 });
            K.tono({ f: 1900, f2: 900, dur: 0.14, vol: 0.06 });
            await esperar(this, 500);
            // La foto de grupo se revela como una polaroid grande.
            var big = this.add.container(L.W / 2, L.H * 0.4).setDepth(85).setScale(0.3).setAlpha(0);
            var g = this.add.graphics();
            var ww = Math.min(520, L.der * 0.6), hh = ww * 0.7;
            g.fillStyle(0x000000, 0.3); g.fillRoundedRect(-ww / 2 + 6, -hh / 2 + 8, ww, hh + 70, 12);
            g.fillStyle(0xffffff, 1); g.fillRoundedRect(-ww / 2, -hh / 2, ww, hh + 70, 12);
            var P = this.pal || BIOMAS[2];
            for (var b = 0; b < 8; b++) { g.fillStyle(mezcla(P.cielo[0], P.cielo[1], b / 7), 1); g.fillRect(-ww / 2 + 16, -hh / 2 + 16 + (hh - 32) * 0.7 / 8 * b, ww - 32, (hh - 32) * 0.7 / 8 + 1); }
            g.fillStyle(P.suelo, 1); g.fillRect(-ww / 2 + 16, -hh / 2 + 16 + (hh - 32) * 0.7, ww - 32, (hh - 32) * 0.3);
            big.add(g);
            ids.forEach(function (id, i) {
                var im = self.add.image((i - (ids.length - 1) / 2) * (ww * 0.15), hh * 0.12, 'el_' + id).setOrigin(0.5, 1);
                im.setScale((ww * 0.22) / Math.max(im.width, im.height));
                big.add(im);
            });
            var tt = this.add.text(0, hh / 2 + 28, '¡Gran safari!', { fontFamily: 'Arial Black, Arial', fontSize: '30px', color: '#5c3312' }).setOrigin(0.5);
            big.add(tt);
            this.ignorarEnLente(big);
            await tw(this, { targets: big, scale: 1, alpha: 1, angle: -3, duration: 700, ease: 'Back.easeOut' });
            for (var f = 0; f < 4; f++) { this.fuego(L.W * (0.2 + 0.6 * Math.random()), L.H * (0.1 + 0.2 * Math.random()), f); await esperar(this, 260); }
            grupo.forEach(function (q, i) { self.tweens.add({ targets: q.cont, y: q.cont.y - 26, duration: 180, yoyo: true, repeat: 3, delay: i * 70 }); self.sonar(q.id, { breve: true, bocina: false }); });
            Ut.confeti(this, 100);
            await esperar(this, 2200);
            big.destroy();
        },

        fuego: function (x, y, k) {
            var cols = [0xff6b6b, 0xfab005, 0x69db7c, 0x4dabf7, 0xcc5de8];
            K.ruido({ f: 2400, q: 0.6, dur: 0.3, vol: 0.08 });
            Ut.estallido(this, x, y, { n: 22, tex: 'chispa', tam: 22, dist: 140, depth: 52, colores: [cols[k % 5], 0xffffff, cols[(k + 2) % 5]], ms: 1100, gravedad: 50 });
        },

        estadoExtra: function () {
            var v = this.visor;
            return {
                guests: this.nv && this.nv.guests, capturados: this.capturados, bioma: this.bioma, completa: !!this.completa,
                visor: v && { x: Math.round(v.x), y: Math.round(v.y) },
                animales: this.animales.filter(function (a) { return a.vivo; }).map(function (a) { return { id: a.id, t: a.tipo, x: Math.round(a.cont.x), y: Math.round(a.cont.y - a.t * 0.5) }; })
            };
        },

        /* ── Cada cuadro ── */

        paso: function (time, delta) {
            var L = this.L, s = time / 1000, dt = Math.min(0.05, (delta || 16) / 1000), self = this;
            if (!L || !this.cieloG || !this.cieloG.active || !this.visor) return;
            this.biomaT = Math.min(1, this.biomaT + dt / 2.6);
            var te = this.biomaT * this.biomaT * (3 - 2 * this.biomaT);
            var P = this.pal = mezclaBioma(BIOMAS[this.biomaDe], BIOMAS[this.bioma], te);
            var corre = this.fiesta ? 8 : (this.nv && this.nv.d ? 22 : 14);
            this.mundo += corre * dt;
            var W = L.W, H = L.H, M = this.mundo;

            // ── Cielo y astro ──
if (!this.arteOk) {
            var cg = this.cieloG; cg.clear();
            for (var b = 0; b < 16; b++) { cg.fillStyle(mezcla(P.cielo[0], P.cielo[1], b / 15), 1); cg.fillRect(0, (L.horiz / 16) * b, W, L.horiz / 16 + 1); }
            var ag = this.astroG; ag.clear();
            var ax = W * 0.78, ay = L.horiz * P.astroY * 1.5;
            if (P.noche > 0.02) for (var e = 0; e < 60; e++) { ag.fillStyle(0xffffff, P.noche * (0.3 + 0.6 * Math.abs(Math.sin(s * 1.2 + e * 2.3)))); ag.fillCircle((e * 977 + 50) % W, 8 + (e * 613) % (L.horiz * 0.85), 1 + (e % 3) * 0.6); }
            ag.fillStyle(P.astro, 0.2); ag.fillCircle(ax, ay, 90 - 20 * P.noche);
            if (P.noche < 0.5) for (var rr = 0; rr < 12; rr++) { var an = s * 0.12 + rr * Math.PI / 6; ag.fillStyle(P.astro, 0.18 * (1 - P.noche * 2)); ag.fillTriangle(ax + Math.cos(an - 0.08) * 52, ay + Math.sin(an - 0.08) * 52, ax + Math.cos(an + 0.08) * 52, ay + Math.sin(an + 0.08) * 52, ax + Math.cos(an) * 100, ay + Math.sin(an) * 100); }
            ag.fillStyle(P.astro, 1); ag.fillCircle(ax, ay, 44 - 5 * P.noche);
            if (P.noche > 0.5) { ag.fillStyle(0xced4da, 1); ag.fillCircle(ax - 11, ay - 8, 8); ag.fillCircle(ax + 10, ay + 11, 6); }
            for (var n = 0; n < 6; n++) {
                var par = 0.15 + (n % 3) * 0.1, nx = W + 200 - ((M * par + s * 3 + n * 330) % (W + 400)), ny = L.horiz * (0.1 + (n % 4) * 0.17);
                ag.fillStyle(P.nubes, 0.9 - 0.4 * P.noche);
                ag.fillEllipse(nx, ny, 150, 26); ag.fillCircle(nx - 26, ny - 8, 20); ag.fillCircle(nx + 4, ny - 15, 26); ag.fillCircle(nx + 34, ny - 6, 18);
            }
            // ── Capas lejanas ──
            var lg = this.lejosG; lg.clear();
            lg.fillStyle(P.lejos, 1); lg.beginPath(); lg.moveTo(0, L.horiz + 4);
            for (var x1 = 0; x1 <= W + 14; x1 += 14) { var xw = x1 + M * 0.04, hh = (Math.sin(xw / 260) * 0.5 + Math.sin(xw / 110 + 1) * 0.3 + Math.sin(xw / 47) * 0.2 + 1) * 0.5; lg.lineTo(x1, L.horiz - hh * 90); }
            lg.lineTo(W + 14, L.horiz + 4); lg.closePath(); lg.fillPath();
            var mg = this.medioG; mg.clear();
            mg.fillStyle(P.medio, 1); mg.beginPath(); mg.moveTo(0, L.horiz + 10);
            for (var x2 = 0; x2 <= W + 14; x2 += 14) { var xm = x2 + M * 0.1, hm = (Math.sin(xm / 150 + 2) * 0.5 + Math.sin(xm / 63) * 0.3 + 1) * 0.5; mg.lineTo(x2, L.horiz + 4 - hm * 36); }
            mg.lineTo(W + 14, L.horiz + 10); mg.closePath(); mg.fillPath();
            // Árboles según el lugar (parallax medio).
            var paso = 230, off = M * 0.3, i0 = Math.floor(off / paso) - 1;
            for (var i = i0; i <= i0 + Math.ceil(W / paso) + 2; i++) {
                var r = hash(i), x = i * paso - off + r * 80, yb = L.horiz + 8;
                if (P.arbol === 'acacia') {
                    var alt = 70 + r * 50;
                    mg.fillStyle(0x5c3b1e, 1); mg.fillPoints([{ x: x - 7, y: yb }, { x: x + 7, y: yb }, { x: x + 4, y: yb - alt }, { x: x - 4, y: yb - alt }], true);
                    mg.lineStyle(6, 0x5c3b1e, 1); mg.lineBetween(x, yb - alt * 0.6, x - 30, yb - alt - 8); mg.lineBetween(x, yb - alt * 0.6, x + 32, yb - alt - 10);
                    mg.fillStyle(P.noche > 0.5 ? 0x17302a : 0x4f8f3a, 1); mg.fillEllipse(x, yb - alt - 14, 110 + r * 40, 26); mg.fillEllipse(x + 22, yb - alt - 6, 70, 18);
                } else if (P.arbol === 'palma') {
                    var alp = 95 + r * 55, cxp = x + 10;
                    mg.lineStyle(10, 0x6b4a2a, 1); mg.beginPath(); mg.moveTo(x, yb); mg.lineTo(x + 14, yb - alp * 0.5); mg.lineTo(cxp, yb - alp); mg.strokePath();
                    mg.lineStyle(3, 0x4a321a, 0.6); for (var an2 = 1; an2 < 6; an2++) mg.lineBetween(x + 14 * (an2 / 6) - 6, yb - alp * 0.5 * (an2 / 3), x + 14 * (an2 / 6) + 6, yb - alp * 0.5 * (an2 / 3) + 2);
                    for (var hj = 0; hj < 8; hj++) {
                        var a2 = -Math.PI * 1.05 + hj * Math.PI * 1.1 / 7 + Math.sin(s * 0.9 + hj + i) * 0.05, lf = 58 + (hj % 2) * 12;
                        var tx2 = cxp + Math.cos(a2) * lf, ty2 = yb - alp + Math.sin(a2) * lf * 0.55 + 14 + (Math.abs(Math.cos(a2)) * 16);
                        mg.fillStyle(hj % 2 ? 0x2f9e44 : 0x1f7a34, 1);
                        mg.fillTriangle(cxp, yb - alp, tx2, ty2, cxp + Math.cos(a2 + 1.5) * 12, yb - alp + Math.sin(a2 + 1.5) * 10);
                        mg.fillTriangle(cxp, yb - alp, tx2, ty2, cxp + Math.cos(a2 - 1.5) * 12, yb - alp + Math.sin(a2 - 1.5) * 10);
                    }
                    mg.fillStyle(0x8b5a2b, 1); mg.fillCircle(cxp - 5, yb - alp + 6, 5); mg.fillCircle(cxp + 5, yb - alp + 8, 5);
                } else {
                    for (var jn = 0; jn < 5; jn++) { var jx = x + (jn - 2) * 12, jh = 50 + ((i + jn) % 3) * 20; mg.lineStyle(3, 0x4f7a3a, 1); mg.beginPath(); mg.moveTo(jx, yb); mg.lineTo(jx + Math.sin(s * 1.4 + jn + i) * 4, yb - jh); mg.strokePath(); mg.fillStyle(0x6d4c2a, 1); mg.fillRoundedRect(jx - 3, yb - jh - 14, 6, 16, 3); }
                }
            }
}

            if (this.arteOk) { this.cieloG.clear(); this.lejosG.clear(); this.medioG.clear(); this.sueloG.clear(); this.animarFondoArte(time, s, P, te); }
            // ── Suelo / pasarela y brillo del agua (laguna) ──
            var sg = this.sueloG; sg.clear();
if (!this.arteOk) {
            var altoS = H - L.horiz;
            for (var gb = 0; gb < 12; gb++) { sg.fillStyle(mezcla(mezcla(P.suelo, 0xffe9b0, 0.25), mezcla(P.suelo2, 0x000000, 0.35), gb / 11), 1); sg.fillRect(0, L.horiz + altoS / 12 * gb, W, altoS / 12 + 1); }
            // Camino de tierra por donde pasa el desfile, con huellas.
            sg.fillStyle(mezcla(P.suelo2, 0x000000, 0.22), 0.55);
            sg.fillPoints([{ x: 0, y: L.carriles[0] - 62 }, { x: W, y: L.carriles[0] - 62 }, { x: W, y: L.carriles[2] + 28 }, { x: 0, y: L.carriles[2] + 28 }], true);
            sg.fillStyle(0xffffff, 0.06); sg.fillRect(0, L.carriles[0] - 62, W, 4);
            sg.fillStyle(0x000000, 0.12);
            for (var hp = 0; hp < 22; hp++) { var hx = ((hp * 137 - M * 1.0) % (W + 140) + W + 140) % (W + 140) - 70, hy = L.carriles[hp % 3] + 12; sg.fillEllipse(hx, hy, 14, 6); sg.fillEllipse(hx + 16, hy - 2, 14, 6); }
            // Manada lejana en el horizonte, termiteros, rocas y arbustos (capas de profundidad).
            for (var mn = 0; mn < 9; mn++) { var mx = ((mn * 160 - M * 0.07) % (W + 200) + W + 200) % (W + 200) - 100; sg.fillStyle(0x000000, 0.28 - 0.12 * (1 - P.noche)); sg.fillEllipse(mx, L.horiz + 6, 14, 7); sg.fillRect(mx + 4, L.horiz + 1, 2, 4); sg.fillRect(mx - 5, L.horiz + 1, 2, 4); }
            for (var dc = -1; dc < Math.ceil(W / 330) + 2; dc++) {
                var dseed = Math.floor((M * 0.55) / 330) + dc, dr = hash(dseed + 40), dx = dc * 330 - ((M * 0.55) % 330) + dr * 120, dy = L.horiz + 30 + dr * 26;
                if (dseed % 3 === 0) { sg.fillStyle(mezcla(P.hierba, 0x000000, 0.1), 1); sg.fillCircle(dx, dy, 18); sg.fillCircle(dx + 16, dy + 4, 14); sg.fillCircle(dx - 15, dy + 5, 13); sg.fillStyle(0xffffff, 0.08); sg.fillCircle(dx - 4, dy - 6, 8); }
                else if (dseed % 3 === 1) { sg.fillStyle(mezcla(P.suelo2, 0x000000, 0.3), 1); sg.fillEllipse(dx, dy + 6, 54, 24); sg.fillStyle(mezcla(P.suelo2, 0xffffff, 0.15), 1); sg.fillEllipse(dx - 4, dy, 40, 18); }
                else { sg.fillStyle(mezcla(P.suelo2, 0x000000, 0.2), 1); sg.fillTriangle(dx - 18, dy + 12, dx + 18, dy + 12, dx + 4, dy - 30); sg.fillStyle(0xffffff, 0.08); sg.fillTriangle(dx - 8, dy + 12, dx + 2, dy - 24, dx + 6, dy + 12); }
            }
            if (this.bioma === 2 || (this.biomaDe === 2 && te < 1)) {
                var wa = this.bioma === 2 ? te : 1 - te;
                sg.fillStyle(mezcla(0x3f6fb0, 0xc77a9a, 0.5), wa);
                sg.fillRect(0, L.horiz, W, L.carriles[0] - 70 - L.horiz);
                sg.lineStyle(2, 0xffffff, 0.25 * wa);
                for (var rw = 0; rw < 6; rw++) { var ry = L.horiz + 10 + rw * 14; sg.beginPath(); for (var xx = 0; xx <= W; xx += 28) { var yy = ry + Math.sin(xx / 40 + s * 1.6 + rw) * 2.5; if (!xx) sg.moveTo(xx, yy); else sg.lineTo(xx, yy); } sg.strokePath(); }
            }
            sg.lineStyle(2, 0x000000, 0.08);
            for (var ln = 0; ln < 18; ln++) { var lx = ((ln * 120 - M * 1.0) % (W + 120) + W + 120) % (W + 120) - 60; sg.lineBetween(lx, L.carriles[0] - 40, lx - 50, H); }
}

            // Mechones de hierba del suelo (parallax cercano), por detrás y por delante de los animales.
            var sh = this.sombraG; sh.clear();
            for (var gt = 0; gt < (this.arteOk ? 0 : 26); gt++) {
                var gx = ((gt * 97 - M * 0.9) % (W + 100) + W + 100) % (W + 100) - 50, gy = L.carriles[gt % 3] + 6 + (hash(gt) * 12);
                sh.fillStyle(P.hierba, 0.8);
                sh.fillTriangle(gx - 8, gy, gx - 2, gy - 22 - (gt % 4) * 4, gx + 2, gy); sh.fillTriangle(gx - 2, gy, gx + 6, gy - 30, gx + 10, gy); sh.fillTriangle(gx + 4, gy, gx + 14, gy - 20, gx + 16, gy);
            }
            var fg = this.frenteG; fg.clear();
            for (var ft = 0; ft < (this.arteOk ? 0 : 10); ft++) {
                var fx = ((ft * 211 - M * 1.5) % (W + 200) + W + 200) % (W + 200) - 100, fy = H + 6;
                fg.fillStyle(P.hierba, 1);
                for (var bl = 0; bl < 6; bl++) fg.fillTriangle(fx - 22 + bl * 8, fy, fx - 18 + bl * 8, fy - 70 - ((ft + bl) % 4) * 14, fx - 12 + bl * 8, fy);
                fg.fillStyle(0x000000, 0.14); fg.fillTriangle(fx - 22, fy, fx - 18, fy - 70, fx - 12, fy);
            }
            // Lianas y hojas grandes de la selva (primer plano).
            var kj = this.bioma === 1 ? te : (this.biomaDe === 1 ? 1 - te : 0);
            if (kj > 0.02) {
                fg.lineStyle(3, 0x1f6f2a, 0.9 * kj);
                for (var li = 0; li < 7; li++) { var lx3 = ((li * 233 - M * 0.8) % (W + 200) + W + 200) % (W + 200) - 100, ll = 70 + (li % 3) * 40; fg.beginPath(); fg.moveTo(lx3, 0); fg.lineTo(lx3 + Math.sin(s * 0.8 + li) * 6, ll); fg.strokePath(); fg.fillStyle(0x2f9e44, kj); fg.fillEllipse(lx3 + Math.sin(s * 0.8 + li) * 6, ll, 14, 24); }
                for (var hb = 0; hb < 6; hb++) { var bx3 = ((hb * 281 - M * 1.7) % (W + 300) + W + 300) % (W + 300) - 150, by3 = H + 4; fg.fillStyle(0x1b6f2c, kj); fg.fillTriangle(bx3, by3, bx3 - 70 + Math.sin(s + hb) * 6, by3 - 150, bx3 - 10, by3 - 10); fg.fillTriangle(bx3, by3, bx3 + 70 + Math.sin(s + hb) * 6, by3 - 160, bx3 + 10, by3 - 10); fg.fillStyle(0x2f9e44, kj); fg.fillTriangle(bx3, by3, bx3 - 4, by3 - 190, bx3 + 8, by3 - 10); }
            }
            // Luciérnagas de noche.
            var lz = this.luzG; lz.clear();
            if (P.noche > 0.3) for (var fl = 0; fl < 22; fl++) { var lx2 = (fl * 173 + Math.sin(s * 0.6 + fl) * 40) % W, ly2 = L.horiz + 30 + ((fl * 61) % (H - L.horiz - 80)) + Math.cos(s * 0.8 + fl) * 20, br = 0.5 + 0.5 * Math.sin(s * 3 + fl * 2); lz.fillStyle(0xe9fb7a, 0.18 * br * P.noche); lz.fillCircle(lx2, ly2, 12); lz.fillStyle(0xf4ffa0, 0.9 * br * P.noche); lz.fillCircle(lx2, ly2, 2.6); }

            // ── Desfile de animales ──
            if (this.spawnOn && this.nv && this.nv.d && this.animales.filter(function (a) { return a.vivo; }).length < 4 && time - this.ultSpawn > this.nv.d.cada) this.lanzar();
            this.animales = this.animales.filter(function (a) { return a.vivo || a.cont.active; });
            this.animales.forEach(function (a) {
                if (!a.vivo) return;
                var v = (a.parado ? 0 : (a.huye ? a.v * 3.2 : (a.lento ? a.v * 0.5 : a.v)));
                a.cont.x -= v * dt;
                a.fase += dt * (a.huye ? 16 : 7);
                var salto = Math.abs(Math.sin(a.fase)) * (a.huye ? 16 : 7);
                if (!self.tweens.isTweening(a.cuerpo)) a.cuerpo.y = -salto;
                a.cuerpo.angle = Math.sin(a.fase) * 2.6;
                a.img.scaleY = (a.t / Math.max(a.img.width, a.img.height)) * (1 - 0.03 * Math.abs(Math.sin(a.fase)));
                a.sombra.scaleX = 1 - 0.1 * (salto / 8);
                // Llama al entrar en escena: el sonido de la secuencia.
                if (!a.llamo && a.cont.x < L.W * 0.88 && self.fase === 'jugar' && !self.completa) { a.llamo = true; self.sonar(a.id, { breve: true, bocina: false }); a.cuerpo.y = -12; }
                if (a.cont.x < -a.t) { if (a.tipo === 'intruso') self.intrusoVivo = false; a.vivo = false; a.cont.destroy(); }
            });

            // ── Visor: sigue al dedo con suavidad; enfoca solo si se queda quieto sobre un animal ──
            var V = this.visor;
            var tx = this.dedo ? this.dedo.x : V.x, ty = this.dedo ? this.dedo.y - 90 * L.k : V.y;
            tx = Math.max(L.visorW / 2 + 10, Math.min(L.W - L.visorW / 2 - 10, tx));
            ty = Math.max(L.visorH / 2 + 80, Math.min(L.H - L.visorH / 2 - 10, ty));
            var px = V.x, py = V.y;
            V.x += (tx - V.x) * Math.min(1, dt * 10); V.y += (ty - V.y) * Math.min(1, dt * 10);
            var vel = Math.hypot(V.x - px, V.y - py) / Math.max(dt, 0.001);
            if (this.fase === 'jugar' && this.dedo && !this.disparando && !this.completa) {
                var cand = this.candidato();
                if (cand && vel < 140) {
                    if (!this.foco || this.foco.a !== cand.a) this.foco = { a: cand.a, t: 0 };
                    this.foco.t += dt;
                    if (this.foco.t >= 0.95) { this.disparar(); }
                } else if (this.foco) { this.foco.t = Math.max(0, this.foco.t - dt * 2); if (this.foco.t <= 0) this.foco = null; }
            } else if (!this.dedo && this.foco) this.foco = null;
            if (this.fiesta) { this.visorG.clear(); this.dibujarEfectos(time); return; }
            if (this.lente && this.lente.scene) {
                this.lente.setViewport(V.x - L.visorW / 2, V.y - L.visorH / 2, L.visorW, L.visorH);
                this.lente.centerOn(V.x, V.y);
            }
            this.dibujarVisor(time, s);
            this.dibujarEfectos(time);

            // ── Ayuda: halo sobre el intruso ──
            var ay3 = this.ayudaG; ay3.clear();
            if (this.ayuda && this.fase === 'jugar' && !this.completa) this.animales.forEach(function (a) { if (a.vivo && a.tipo === 'intruso') { ay3.lineStyle(5, 0xffe066, 0.5 + 0.4 * Math.sin(s * 6)); ay3.strokeCircle(a.cont.x, a.cont.y - a.t * 0.5, a.t * 0.62); } });

            // ── Ambiente sonoro suave ──
            if ((this.fase === 'jugar' || this.fase === 'escuchando') && !(this.ctx.enDemo && this.ctx.enDemo()) && time - this.ultViento > 4300) { this.ultViento = time; K.ruido({ f: 600, q: 0.4, dur: 1.2, vol: 0.012, tipo: 'lowpass' }); }
        },

        dibujarVisor: function (time, s) {
            var L = this.L, g = this.visorG, V = this.visor, w = L.visorW, h = L.visorH;
            g.clear();
            var x0 = V.x - w / 2, y0 = V.y - h / 2;
            // Viñeta: oscurece todo fuera del visor.
            g.fillStyle(0x000000, 0.32);
            g.fillRect(0, 0, L.W, y0); g.fillRect(0, y0 + h, L.W, L.H - y0 - h); g.fillRect(0, y0, x0, h); g.fillRect(x0 + w, y0, L.W - x0 - w, h);
            // Marco con esquinas de cámara.
            g.lineStyle(3, 0xffffff, 0.9); g.strokeRoundedRect(x0, y0, w, h, 10);
            g.lineStyle(7, 0xffffff, 1);
            var c = 28;
            [[x0, y0, 1, 1], [x0 + w, y0, -1, 1], [x0, y0 + h, 1, -1], [x0 + w, y0 + h, -1, -1]].forEach(function (q) { g.lineBetween(q[0], q[1], q[0] + q[2] * c, q[1]); g.lineBetween(q[0], q[1], q[0], q[1] + q[3] * c); });
            // Retícula de tercios y cruz central.
            g.lineStyle(1, 0xffffff, 0.22);
            g.lineBetween(x0 + w / 3, y0, x0 + w / 3, y0 + h); g.lineBetween(x0 + 2 * w / 3, y0, x0 + 2 * w / 3, y0 + h);
            g.lineBetween(x0, y0 + h / 3, x0 + w, y0 + h / 3); g.lineBetween(x0, y0 + 2 * h / 3, x0 + w, y0 + 2 * h / 3);
            g.lineStyle(2, 0xffffff, 0.9); g.lineBetween(V.x - 12, V.y, V.x + 12, V.y); g.lineBetween(V.x, V.y - 12, V.x, V.y + 12);
            // Luz REC y etiqueta del zoom.
            g.fillStyle(0xff3b3b, 0.55 + 0.45 * Math.sin(s * 5)); g.fillCircle(x0 + 20, y0 + 22, 6);
            g.fillStyle(0xffffff, 0.9); g.fillRoundedRect(x0 + w - 62, y0 + 12, 52, 20, 6);
            g.fillStyle(0x212529, 1); g.fillRect(x0 + w - 56, y0 + 20, 10, 4); g.fillRect(x0 + w - 42, y0 + 18, 10, 8); g.fillRect(x0 + w - 28, y0 + 16, 10, 12);
            // Marco de enfoque que se cierra sobre el animal.
            var F = this.foco;
            if (F && F.a.vivo) {
                var p = Math.min(1, F.t / 0.95), ax = F.a.cont.x, ay = F.a.cont.y - F.a.t * 0.5, tam = F.a.t * (0.9 - 0.3 * p);
                var col = p > 0.95 ? 0x69db7c : 0xffe066;
                g.lineStyle(4, col, 1);
                var q2 = tam * 0.5, cc = tam * 0.28;
                [[ax - q2, ay - q2, 1, 1], [ax + q2, ay - q2, -1, 1], [ax - q2, ay + q2, 1, -1], [ax + q2, ay + q2, -1, -1]].forEach(function (q) { g.lineBetween(q[0], q[1], q[0] + q[2] * cc, q[1]); g.lineBetween(q[0], q[1], q[0], q[1] + q[3] * cc); });
                g.fillStyle(col, 1); g.fillRect(x0 + w / 2 - 38, y0 + h - 18, 76 * p, 6);
                g.lineStyle(2, 0xffffff, 0.8); g.strokeRect(x0 + w / 2 - 38, y0 + h - 18, 76, 6);
            }
        },

        dibujarEfectos: function (time) {
            // Destello de la cámara y anillos del letrero.
            var g = this.visorG, V = this.visor;
            this.destellos = this.destellos.filter(function (d) { return time - d.t0 < 400; });
            this.destellos.forEach(function (d) { var f = (time - d.t0) / 400; g.fillStyle(0xffffff, 0.7 * (1 - f)); g.fillCircle(d.x, d.y, 30 + f * 140); });
            this.efectos = (this.efectos || []).filter(function (e) { return time - e.t0 < 900; });
            this.efectos.forEach(function (e) { var f = (time - e.t0) / 900; g.lineStyle(4 * (1 - f) + 1, 0xfff3bf, 0.8 * (1 - f)); g.strokeCircle(e.x, e.y, 22 + f * 50); });
        }
    };

    K.crear({ id: 'safari', fondo: '#5fa8ef', escena: escena });
})(typeof window !== 'undefined' ? window : this);
