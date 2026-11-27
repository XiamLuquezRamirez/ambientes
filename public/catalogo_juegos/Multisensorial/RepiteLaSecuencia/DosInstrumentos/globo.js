/**
 * «El globo de la orquesta» — motor propio de Dos Instrumentos (3-4 años).
 *
 * El niño pilota un globo aerostático: con el dedo sube y baja (y se mueve un poco hacia los lados)
 * mientras el paisaje pasa por debajo. Flotan globos-regalo con instrumentos; la orquesta del
 * escenario toca una canción que se repite (tambor-campana-tambor…) y hay que atrapar el instrumento
 * que sigue: cada acierto suma un músico a la orquesta, que toca la melodía cada vez más completa.
 * Un instrumento que no sigue la canción rebota y suena (se explora libremente). Con la canción
 * completa aparece una pista de aterrizaje: hay que bajar el globo y posarlo suavemente.
 * Nada castiga: las tormentas solo empujan el globo y las aves lo hacen cabecear.
 *
 * Niveles = cuatro paisajes: amanecer en la aldea, montañas nevadas, cañón al atardecer y noche con aurora.
 * Final: fiesta nocturna, fuegos artificiales y la orquesta tocando junta.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var C = Phaser.Display.Color;

    var INSTR = ['tambor', 'campana', 'maracas', 'trompeta'];
    var ANIM = ['gallo', 'pato', 'perro', 'gato', 'pollito', 'vaca', 'rana', 'burro'];
    var COL_INS = { tambor: 0xff6b6b, campana: 0xffd43b, maracas: 0x69db7c, trompeta: 0x4dabf7 };

    var NIV = [
        { ciclo: [0, 1], dados: 2, meta: 3, vel: 52, tormentas: 0, aves: 1, distr: false },
        { ciclo: [0, 1], dados: 3, meta: 3, vel: 60, tormentas: 1, aves: 1, distr: false },
        { ciclo: [0, 0, 1], dados: 3, meta: 4, vel: 68, tormentas: 1, aves: 2, distr: true },
        { ciclo: [0, 1, 2], dados: 3, meta: 4, vel: 76, tormentas: 2, aves: 2, distr: true }
    ];

    // Cuatro paisajes. cielo [arriba, abajo]; lejos/medio/cerca/suelo = colores de las capas.
    var BIOMAS = [
        { cielo: [0x6fa8ff, 0xffd9b0], astro: 0xfff1b8, astroY: 0.52, noche: 0, lejos: 0xa3b3e8, medio: 0x86d494, cerca: 0x55b36f, suelo: 0x4aa564, nieve: 0, ampL: 110, ampM: 46, tipo: 'aldea', nube: 0xffffff },
        { cielo: [0x3d93ee, 0xd5ecff], astro: 0xfff8cc, astroY: 0.2, noche: 0, lejos: 0xa8b9d0, medio: 0x6f8fb0, cerca: 0x2f7d52, suelo: 0x2b6e47, nieve: 1, ampL: 130, ampM: 60, tipo: 'pinos', nube: 0xffffff },
        { cielo: [0x5b2f8f, 0xff9a5c], astro: 0xff6d3a, astroY: 0.55, noche: 0, lejos: 0xb5527a, medio: 0xd47a45, cerca: 0x9c4a2e, suelo: 0x8a3f26, nieve: 0, ampL: 90, ampM: 80, tipo: 'mesas', nube: 0xffc9a0 },
        { cielo: [0x070d2b, 0x2d3d82], astro: 0xf1f3f5, astroY: 0.22, noche: 1, lejos: 0x2c3b72, medio: 0x1f2d5e, cerca: 0x17234f, suelo: 0x121c42, nieve: 0, ampL: 80, ampM: 52, tipo: 'aldea', nube: 0x4a5590 }
    ];

    // Fondos del diseño: bioma 0 aldea (FONDO 2), 1 montañas nevadas (FONDO 1), 2 cañón al atardecer (FONDO 3), 3 noche (FONDO 4).
    var FONDO_DE = [1, 0, 2, 3];
    var ESCENA_Y = 575, DIB_H = 720;      // el tablado de la orquesta empieza en y=575 del dibujo
    var GLOBO_DE = { tambor: 'globo3', campana: 'globo4', maracas: 'globo2', trompeta: 'globo1' };
    var GLOBO_CY = { globo1: 171, globo2: 144.7, globo3: 157.7, globo4: 144, globo5: 157.7 };   // centro del cuerpo del globo-regalo en el dibujo

    function mezcla(a, b, t) {
        var c = C.Interpolate.ColorWithColor(C.ValueToColor(a), C.ValueToColor(b), 100, Math.max(0, Math.min(1, t)) * 100);
        return C.GetColor(c.r, c.g, c.b);
    }
    function mezclaBioma(a, b, t) {
        var o = {};
        ['astro', 'lejos', 'medio', 'cerca', 'suelo', 'nube'].forEach(function (k) { o[k] = mezcla(a[k], b[k], t); });
        o.cielo = [mezcla(a.cielo[0], b.cielo[0], t), mezcla(a.cielo[1], b.cielo[1], t)];
        ['astroY', 'noche', 'nieve', 'ampL', 'ampM'].forEach(function (k) { o[k] = a[k] + (b[k] - a[k]) * t; });
        return o;
    }
    function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
    function hash(i) { var x = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return x - Math.floor(x); }

    /* ── Instrumentos sintetizados (con panorama según el lugar del músico en el escenario) ── */

    var ruidoBuf = null;
    function ctxAudio() { return K.actx ? K.actx() : null; }
    function bufRuido(c) {
        if (ruidoBuf && ruidoBuf.sampleRate === c.sampleRate) return ruidoBuf;
        ruidoBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
        var d = ruidoBuf.getChannelData(0);
        for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        return ruidoBuf;
    }
    function salida(c, pan, vol) {
        var g = c.createGain();
        g.gain.value = vol == null ? 1 : vol;
        if (c.createStereoPanner) { var p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); p.connect(c.destination); } else g.connect(c.destination);
        return g;
    }
    function osc(c, out, tipo, f, f2, t, dur, vol) {
        var o = c.createOscillator(), g = c.createGain();
        o.type = tipo; o.frequency.setValueAtTime(f, t);
        if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
    }
    function ruido(c, out, filtro, f, q, t, dur, vol) {
        var s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
        s.buffer = bufRuido(c); fl.type = filtro; fl.frequency.value = f; fl.Q.value = q;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        s.connect(fl); fl.connect(g); g.connect(out); s.start(t); s.stop(t + dur + 0.05);
    }
    function tocar(inst, pan, vol) {
        var c = ctxAudio();
        if (!c) return 0.6;
        var t = c.currentTime + 0.03, out = salida(c, pan, vol);
        if (inst === 'tambor') { [0, 0.26].forEach(function (d) { osc(c, out, 'sine', 170, 55, t + d, 0.3, 0.9); ruido(c, out, 'lowpass', 500, 0.8, t + d, 0.09, 0.45); }); return 0.6; }
        if (inst === 'campana') { osc(c, out, 'triangle', 784, 0, t, 1.1, 0.4); osc(c, out, 'sine', 1176, 0, t, 0.9, 0.22); osc(c, out, 'sine', 1568, 0, t, 0.6, 0.1); return 1.05; }
        if (inst === 'maracas') { for (var i = 0; i < 5; i++) ruido(c, out, 'bandpass', 5200, 1.1, t + i * 0.085, 0.07, 0.55); return 0.6; }
        [[392, 0], [523, 0.28]].forEach(function (n) {
            var o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
            o.type = 'sawtooth'; o.frequency.value = n[0]; f.type = 'lowpass'; f.frequency.value = 1500;
            g.gain.setValueAtTime(0.0001, t + n[1]); g.gain.exponentialRampToValueAtTime(0.35, t + n[1] + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + n[1] + 0.42);
            o.connect(f); f.connect(g); g.connect(out); o.start(t + n[1]); o.stop(t + n[1] + 0.5);
        });
        return 0.8;
    }

    var escena = {
        precargar: function () {
            var self = this;
            [1, 2, 3, 4].forEach(function (i) { if (!self.textures.exists('di_fondo' + i)) self.load.svg('di_fondo' + i, 'img/diseno/fondo' + i + '.svg', { width: 1280, height: 720 }); });
            if (!this.textures.exists('di_arte')) this.load.svg('di_arte', 'img/diseno/arte.svg', { width: 1500, height: 706 });
        },

        /** Registra los marcos de la hoja de arte (una vez) y avisa si el diseño está disponible. */
        prepararArte: function () {
            var A = global.DosInstrumentosArte;
            var tex = this.textures.exists('di_arte') ? this.textures.get('di_arte') : null;
            this.arteOk = !!(A && tex && this.textures.exists('di_fondo1') && this.textures.exists('di_fondo2') && this.textures.exists('di_fondo3') && this.textures.exists('di_fondo4'));
            if (!this.arteOk || tex.__diMarcos) return;
            Object.keys(A.frames).forEach(function (n) { var m = A.frames[n]; tex.add(n, 0, m.x, m.y, m.w, m.h); });
            tex.__diMarcos = true;
        },

        /** Imagen de un marco anclada en el punto (px, py) del dibujo; kd = px por unidad del dibujo. */
        dd: function (nom, x, y, kd, px, py) {
            var m = global.DosInstrumentosArte.frames[nom], wu = m.w / m.k, hu = m.h / m.k;
            var im = this.add.image(x, y, 'di_arte', nom);
            im.setOrigin(px == null ? 0.5 : (px - m.ox) / wu, py == null ? 0.5 : (py - m.oy) / hu);
            im.setDisplaySize(wu * kd, hu * kd);
            im.sx0 = im.scaleX; im.sy0 = im.scaleY;
            return im;
        },

        /** Fondos del diseño (se mezclan al cambiar de paisaje), nubes que pasan y brillos de estrellas. */
        montarFondoArte: function (keep) {
            var L = this.L, self = this;
            this.dfondos = [1, 2, 3, 4].map(function (i) { return keep(self.add.image(0, 0, 'di_fondo' + i).setOrigin(0, 0).setDisplaySize(L.W, L.H).setDepth(0.5)); });
            this.dnubes = [];
            for (var n = 0; n < 7; n++) this.dnubes.push(keep(this.dd(n % 2 ? 'nube2' : 'nube1', 0, 0, n % 2 ? 0.27 : 0.33, null, null).setDepth(4)));
            this.dnubes2 = [0, 1].map(function (q) { return keep(self.dd('nube2', 0, 0, 0.6, null, null).setDepth(36)); });
        },

        /** Cada cuadro: mezcla los fondos, mueve las nubes y hace titilar estrellas de noche. */
        animarFondoArte: function (time, s, P, te, M) {
            var L = this.L, W = L.W, de = FONDO_DE[this.biomaDe], bi = FONDO_DE[this.bioma];
            this.dfondos.forEach(function (im, i) {
                var a = i === bi ? te : (i === de ? 1 : 0);
                if (de === bi) a = i === bi ? 1 : 0;
                im.setAlpha(a).setVisible(a > 0.01).setDepth(i === bi ? 0.52 : 0.5);
            });
            this.dnubes.forEach(function (im, n) {
                var par = 0.35 + (n % 4) * 0.18, nx = W + 200 - ((M * par + s * 4 + n * 290) % (W + 400)), ny = L.suelo * (0.08 + (n % 5) * 0.14);
                im.setPosition(nx, ny).setTint(mezcla(0xffffff, P.nube, 0.6)).setAlpha(0.9 - 0.3 * P.noche);
            });
            this.dnubes2.forEach(function (im, q) {
                var qx = W + 300 - ((M * 1.25 + q * 760 + s * 8) % (W + 700)), qy = L.suelo * (0.28 + q * 0.32);
                im.setPosition(qx, qy).setTint(mezcla(0xffffff, P.nube, 0.6)).setAlpha(0.5 - 0.25 * P.noche);
            });
            var ag = this.astroG; ag.clear();
            if (P.noche > 0.02) for (var e = 0; e < 28; e++) {
                ag.fillStyle(0xffffff, P.noche * (0.15 + 0.7 * Math.abs(Math.sin(s * 1.6 + e * 2.3))));
                ag.fillCircle((e * 977 + 50) % W, 8 + (e * 613) % (L.suelo * 0.6), 1.2 + (e % 3) * 0.7);
            }
        },

        iniciar: function () {
            this.bioma = 0; this.biomaDe = 0; this.biomaT = 1;
            this.items = [];
            this.slots = [];
            this.serie = [];
            this.reunidos = [];
            this.recogidas = 0;
            this.mundo = 0;
            this.dedo = null;
            this.vx = 0; this.vy = 0;
            this.spawnOn = false;
            this.ultimo = { item: 0, tormenta: 0, ave: 0 };
            this.ultimoReclamo = -99999;
            this.efectos = [];
            this.lluvia = [];
            this.pad = null;
            this.panes = {};
            this.ultCoro = 0; this.ultSonido = 0; this.ultQuema = 0; this.ultViento = 0; this.ultAve = 0;
            this.lingotes = [];
            this.fiesta = false;
            this.linternas = [];
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.escH = this.arteOk ? Math.round(H * (DIB_H - ESCENA_Y) / DIB_H) : Math.round(Math.max(96, H * 0.15));
            L.suelo = H - L.escH;
            L.tamG = Math.round(Math.max(108, Math.min(158, H * 0.19)));
            L.xIni = Math.round(W * 0.3);
            L.xMin = Math.round(W * 0.15); L.xMax = Math.round(W * 0.5);
            L.yMin = Math.round(H * 0.3); L.yMax = L.suelo - Math.round(L.tamG * 1.05);
            L.tamI = Math.round(Math.max(74, Math.min(104, H * 0.135)));
            L.bocina = { x: 48, y: Math.round(H * 0.2), r: 30 };
            return L;
        },

        armar: function (reubicar) {
            this.prepararArte();
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            this.cieloG = keep(this.add.graphics().setDepth(1));
            this.astroG = keep(this.add.graphics().setDepth(1.5));
            this.lejosG = keep(this.add.graphics().setDepth(2));
            this.medioG = keep(this.add.graphics().setDepth(2.5));
            this.cercaG = keep(this.add.graphics().setDepth(3));
            this.nubesG = keep(this.add.graphics().setDepth(4));
            this.avesG = keep(this.add.graphics().setDepth(25));
            this.nubes2G = keep(this.add.graphics().setDepth(36));
            this.efectosG = keep(this.add.graphics().setDepth(48));
            this.fuegosG = keep(this.add.graphics().setDepth(52));
            this.escenarioG = keep(this.add.graphics().setDepth(40));
            this.escenarioFrente = keep(this.add.graphics().setDepth(46));
            this.ayudaG = keep(this.add.graphics().setDepth(19));
            if (this.arteOk) this.montarFondoArte(keep);
            this.montarHud(keep);
            this.pintarEscenario();
            this.sembrarMotes(keep, 8, { x: 0, y: 60, w: L.W, h: L.suelo - 80, depth: 5 }, 0xffffff);
            if (!this.globo || !this.globo.cont.active) this.crearGlobo();
            else this.reubicarGlobo();
            this.reubicarSlots();
        },

        /* ── Escenario de la orquesta (abajo): tablado, cortinas y luces de proscenio ── */

        pintarEscenario: function () {
            var L = this.L, g = this.escenarioG, f = this.escenarioFrente;
            g.clear(); f.clear();
            if (this.arteOk) return;   // el tablado ya viene en el fondo del diseño
            var y0 = L.suelo;
            g.fillStyle(0x000000, 0.35); g.fillRect(0, y0 - 6, L.W, 8);
            g.fillStyle(0x7a4419, 1); g.fillRect(0, y0, L.W, L.escH);
            for (var x = 0; x < L.W; x += 54) { g.fillStyle(x % 108 ? 0x8d5a2b : 0x84521f, 1); g.fillRect(x, y0 + 12, 54, L.escH); }
            g.fillStyle(0xa9713a, 1); g.fillRect(0, y0, L.W, 12);
            g.fillStyle(0xfff3bf, 0.35); g.fillRect(0, y0, L.W, 3);
            g.lineStyle(2, 0x5c3312, 0.6); for (var l = y0 + 12; l < y0 + L.escH; l += 22) g.lineBetween(0, l, L.W, l);
            // Cortinas a los lados, con cenefa dorada.
            [[0, 1], [L.W, -1]].forEach(function (cc) {
                for (var k = 0; k < 4; k++) { f.fillStyle(k % 2 ? 0xa61e1e : 0xd93636, 1); f.fillRect(cc[0] + cc[1] * k * 22 - (cc[1] < 0 ? 22 : 0), y0 - 70, 22, L.escH + 70); }
            });
            f.fillStyle(0x7d1212, 1); f.fillRect(0, y0 - 70, 90, 16); f.fillRect(L.W - 90, y0 - 70, 90, 16);
            for (var b = 0; b < 4; b++) { f.fillStyle(0xffd43b, 1); f.fillCircle(11 + b * 22, y0 - 54, 5); f.fillCircle(L.W - 11 - b * 22, y0 - 54, 5); }
        },

        posSlot: function (k, n) {
            var L = this.L, paso = Math.min(104, (L.der - 280) / Math.max(1, n));
            return { x: Math.round(L.der / 2 + 20 - ((n - 1) * paso) / 2 + k * paso), y: L.suelo + Math.round(L.escH * 0.5) };
        },

        crearMusico: function (id, animal, x, y) {
            var L = this.L, t = Math.round(Math.min(L.escH * 0.9, L.H * 0.15));
            var c = this.add.container(x, y).setDepth(42);
            var sombra = this.add.ellipse(0, t * 0.46, t * 0.8, t * 0.18, 0x000000, 0.25);
            var cuerpo = this.add.container(0, 0);
            var an = this.add.image(0, 0, 'el_' + animal);
            an.setScale((t * 0.82) / Math.max(an.width, an.height));
            var ins = this.add.image(t * 0.3, t * 0.22, 'el_' + id);
            ins.setScale((t * 0.5) / Math.max(ins.width, ins.height));
            cuerpo.add([an, ins]);
            c.add([sombra, cuerpo]);
            return { cont: c, cuerpo: cuerpo, an: an, ins: ins, t: t, id: id, animal: animal, x: x, y: y };
        },

        /** Marcadores de la canción: un atril con '?' para el siguiente músico. */
        crearAtril: function (x, y) {
            var L = this.L, t = Math.round(Math.min(L.escH * 0.9, L.H * 0.15));
            if (this.arteOk) {
                var ca = this.add.container(x, y).setDepth(41);
                var sombra = this.add.ellipse(0, t * 0.46, t * 0.6, t * 0.14, 0x000000, 0.22);
                var aviso = this.dd('aviso', 0, t * 0.46, t * 1.25 / 462, 144, 478);
                ca.add([sombra, aviso]);
                this.tweens.add({ targets: aviso, scaleX: aviso.sx0 * 1.05, scaleY: aviso.sy0 * 1.05, duration: 480, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
                return { cont: ca };
            }
            var c = this.add.container(x, y).setDepth(41);
            var g = this.add.graphics();
            g.fillStyle(0x000000, 0.22); g.fillEllipse(0, t * 0.46, t * 0.8, t * 0.18);
            g.fillStyle(0x495057, 1); g.fillRect(-3, 0, 6, t * 0.45);
            g.fillStyle(0xfff9db, 1); g.fillRoundedRect(-t * 0.36, -t * 0.4, t * 0.72, t * 0.52, 8);
            g.lineStyle(4, 0xfab005, 1); g.strokeRoundedRect(-t * 0.36, -t * 0.4, t * 0.72, t * 0.52, 8);
            var q = this.add.text(0, -t * 0.14, '?', { fontFamily: 'Arial Black, Arial', fontSize: Math.round(t * 0.5) + 'px', color: '#f08c00' }).setOrigin(0.5);
            c.add([g, q]);
            this.tweens.add({ targets: q, scale: { from: 1, to: 1.25 }, duration: 480, yoyo: true, repeat: -1 });
            return { cont: c };
        },

        reubicarSlots: function () {
            var self = this, n = this.slots.length + (this.atril ? 1 : 0);
            this.slots.forEach(function (m, k) { var p = self.posSlot(k, n); m.x = p.x; m.y = p.y; if (m.cont.active) m.cont.setPosition(p.x, p.y); });
            if (this.atril && this.atril.cont.active) { var p2 = this.posSlot(this.slots.length, n); this.atril.cont.setPosition(p2.x, p2.y); }
        },

        /** Coloca el atril '?' después del último músico y reparte los lugares. */
        ponerAtril: function () {
            if (this.atril && this.atril.cont.active) this.atril.cont.destroy();
            this.atril = null;
            var total = this.slots.length + 1;
            var self = this;
            this.slots.forEach(function (m, k) { var p = self.posSlot(k, total); tw(self, { targets: m.cont, x: p.x, y: p.y, duration: 260, ease: 'Sine.easeOut' }); m.x = p.x; m.y = p.y; });
            var pa = this.posSlot(this.slots.length, total);
            this.atril = this.crearAtril(pa.x, pa.y);
            this.atril.cont.setAlpha(0);
            this.tweens.add({ targets: this.atril.cont, alpha: 1, duration: 300 });
        },

        sentar: function (id, animal, desde) {
            var self = this;
            var total = this.slots.length + 1 + (this.atril ? 1 : 0);
            var m = this.crearMusico(id, animal, 0, 0);
            this.slots.push(m);
            var n = this.slots.length + (this.atril ? 1 : 0);
            this.slots.forEach(function (q, k) { var p = self.posSlot(k, n); q.x = p.x; q.y = p.y; if (q !== m) tw(self, { targets: q.cont, x: p.x, y: p.y, duration: 260 }); });
            m.cont.setPosition(m.x, m.y);
            m.cont.setAlpha(0).setScale(0.3);
            if (this.atril && this.atril.cont.active) { var pa = this.posSlot(this.slots.length, n); this.atril.cont.setPosition(pa.x, pa.y); }
            tw(this, { targets: m.cont, alpha: 1, scale: 1, duration: 320, ease: 'Back.easeOut' });
            return m;
        },

        /** El músico toca su nota: salta, el instrumento cabecea y salen notas. */
        tocaMusico: function (m, vol) {
            var self = this;
            if (!m || !m.cont.active) return Promise.resolve();
            this.tweens.add({ targets: m.cuerpo, y: -m.t * 0.26, scaleX: 1.08, scaleY: 0.94, duration: 130, yoyo: true, ease: 'Quad.easeOut' });
            this.tweens.add({ targets: m.ins, angle: { from: -18, to: 18 }, duration: 110, yoyo: true, repeat: 2, onComplete: function () { m.ins.angle = 0; } });
            Ut.estallido(this, m.x, m.y - m.t * 0.5, { n: 3, tex: 'nota', tam: 22, dist: 80, depth: 70, colores: [COL_INS[m.id] || 0xffffff], sinTinte: false });
            this.efectos.push({ x: m.x, y: m.y - m.t * 0.3, t0: this.time.now, col: COL_INS[m.id] || 0xffffff });
            return this.sonar(m.id, { bocina: false, vol: vol, pan: (m.x / this.L.W - 0.5) * 1.3 });
        },

        /** Suena un instrumento (sintetizado, con panorama según el lugar del músico). */
        sonar: function (id, o) {
            var self = this;
            o = o || {};
            if (INSTR.indexOf(id) < 0) return Promise.resolve(this.ctx.sonido ? this.ctx.sonido(id, o) : null);
            this.sonando = true;
            if (o.bocina !== false && this.bocina) {
                this.tweens.killTweensOf(this.bocina);
                this.bocina.setScale(1);
                this.tweens.add({ targets: this.bocina, scale: 1.12, duration: 160, yoyo: true, repeat: 3 });
                this.ondas = this.time.now;
            }
            this.ultSonido = this.time.now;
            var dur = tocar(id, o.pan != null ? o.pan : (this.panes[id] || 0), o.vol == null ? 1 : o.vol);
            return esperar(this, Math.max(350, dur * 1000)).then(function () { self.sonando = false; self.ondas = 0; });
        },

        /* ── Globo aerostático ── */

        crearGlobo: function () {
            var L = this.L;
            var c = this.add.container(L.xIni, (L.yMin + L.yMax) / 2).setDepth(30);
            var cuerpo = this.add.container(0, 0);
            c.add(cuerpo);
            this.globo = { cont: c, cuerpo: cuerpo, s: L.tamG / 130, angulo: 0, llama: 0 };
            this.pintarGlobo();
        },

        reubicarGlobo: function () {
            this.pintarGlobo();
        },

        pintarGlobo: function () {
            if (this.arteOk) { this.pintarGloboArte(); return; }
            this.pintarGloboViejo();
        },

        /** Globo aerostático del diseño: el pollito asoma sobre la cesta y la llama sale de la boca del globo. */
        pintarGloboArte: function () {
            var G = this.globo, s = this.L.tamG / 130, kd = 0.6;
            G.cuerpo.removeAll(true);
            G.s = s;
            G.pil = null;
            if (this.textures.exists('el_pollito')) {
                var pil = this.add.image(0, (404 - 190) * kd, 'el_pollito');
                pil.setScale(34 / Math.max(pil.width, pil.height));
                G.pil = pil; G.py = pil.y; G.cuerpo.add(pil);
            }
            G.aero = this.dd('aero', 0, 0, kd, 250, 190);
            G.cuerpo.add(G.aero);
            G.llamaG = this.add.graphics(); G.cuerpo.add(G.llamaG);
            G.fy = (356 - 190) * kd;
            G.cesta = (470 - 190) * kd;
            G.cuerpo.setScale(s);
            G.r = 62 * s;
            G.cy = 0;
        },

        pintarGloboViejo: function () {
            var G = this.globo, s = this.L.tamG / 130;
            G.cuerpo.removeAll(true);
            G.s = s;
            var g = this.add.graphics();
            var gajos = [0xe03131, 0xfab005, 0x1c7ed6, 0xe03131, 0xfab005, 0x1c7ed6];
            // Sombra interior y gajos de colores (cada gajo es una franja curva del globo).
            var N = gajos.length;
            for (var i = 0; i < N; i++) {
                var a0 = Math.PI + (i / N) * Math.PI, a1 = Math.PI + ((i + 1) / N) * Math.PI;
                g.fillStyle(gajos[i], 1);
                g.beginPath(); g.moveTo(0, 62);
                for (var a = a0; a <= a1 + 0.001; a += 0.06) g.lineTo(Math.cos(a) * 58, -2 + Math.sin(a) * 68 + 0);
                g.lineTo(0, 62); g.closePath(); g.fillPath();
            }
            // Parte baja que se estrecha hacia la boca del globo.
            for (var j = 0; j < N; j++) {
                var x0 = -58 + (j / N) * 116, x1 = -58 + ((j + 1) / N) * 116;
                g.fillStyle(gajos[j], 1);
                g.fillPoints([{ x: x0, y: -2 }, { x: x1, y: -2 }, { x: x1 * 0.28, y: 70 }, { x: x0 * 0.28, y: 70 }], true);
            }
            g.lineStyle(2, 0x000000, 0.14);
            for (var k = 1; k < N; k++) { var xx = -58 + (k / N) * 116; g.beginPath(); g.moveTo(xx * 0.28, 70); g.lineTo(xx, -2); g.arc(0, -2, 0, 0, 0); g.strokePath(); }
            g.fillStyle(0xffffff, 0.28); g.fillEllipse(-24, -26, 22, 52);
            g.fillStyle(0x000000, 0.12); g.fillEllipse(30, 10, 30, 80);
            g.lineStyle(3, 0x7a1f1f, 0.55); g.strokeEllipse(0, -2, 116, 136);
            g.fillStyle(0xf2c94c, 1); g.fillRoundedRect(-16, 66, 32, 8, 3);
            // Cuerdas y cesta de mimbre.
            g.lineStyle(2, 0x5c3312, 1);
            g.lineBetween(-14, 74, -20, 98); g.lineBetween(14, 74, 20, 98); g.lineBetween(-4, 74, -8, 98); g.lineBetween(4, 74, 8, 98);
            G.cuerpo.add(g);
            // Piloto (pollito) asomado a la cesta.
            if (this.textures.exists('el_pollito')) {
                var pil = this.add.image(0, 90, 'el_pollito');
                pil.setScale(36 / Math.max(pil.width, pil.height));
                G.pil = pil; G.cuerpo.add(pil);
            }
            var cesta = this.add.graphics();
            cesta.fillStyle(0xb5803f, 1); cesta.fillRoundedRect(-24, 98, 48, 26, { tl: 3, tr: 3, bl: 10, br: 10 });
            cesta.lineStyle(2, 0x7a5224, 0.9);
            for (var h = 106; h < 124; h += 7) cesta.lineBetween(-23, h, 23, h);
            for (var v = -18; v <= 18; v += 12) cesta.lineBetween(v, 98, v, 123);
            cesta.fillStyle(0x8b5524, 1); cesta.fillRect(-26, 96, 52, 5);
            G.cuerpo.add(cesta);
            G.llamaG = this.add.graphics(); G.cuerpo.add(G.llamaG);
            G.cuerpo.setScale(s);
            G.r = 62 * s;
            G.cy = 0;     // el contenedor se ancla al centro del globo
        },

        /* ── Cosas del cielo ── */

        yLibre: function () {
            var L = this.L;
            return L.yMin + 10 + Math.random() * (L.yMax - L.yMin - 10);
        },

        crearItem: function (id) {
            if (!this.arteOk) return this.crearItemViejo(id);
            var L = this.L, t = L.tamI;
            var c = this.add.container(L.W + t, this.yLibre()).setDepth(20);
            var nom = GLOBO_DE[id] || 'globo5';
            var body = this.dd(nom, 0, 0, t * 1.0 / 185, 250, GLOBO_CY[nom]);
            var disco = this.add.graphics();
            disco.fillStyle(0xffffff, 1); disco.fillCircle(0, 0, t * 0.3);
            disco.lineStyle(3, 0xffffff, 0.9); disco.strokeCircle(0, 0, t * 0.34);
            var im = this.add.image(0, 0, 'el_' + id);
            im.setScale((t * 0.44) / Math.max(im.width, im.height));
            c.add([body, disco, im]);
            return { tipo: 'item', id: id, cont: c, r: t * 0.5, fase: Math.random() * 6, vx: 0, vy: 0, vivo: true, y0: c.y };
        },

        crearItemViejo: function (id) {
            var L = this.L, t = L.tamI;
            var c = this.add.container(L.W + t, this.yLibre()).setDepth(20);
            var col = COL_INS[id] || 0xff6b6b;
            var g = this.add.graphics();
            g.lineStyle(2, 0x6c757d, 0.8); g.beginPath(); g.moveTo(0, t * 0.5); g.lineTo(-4, t * 0.78); g.lineTo(5, t * 1.0); g.lineTo(-3, t * 1.2); g.strokePath();
            g.fillStyle(0x000000, 0.14); g.fillEllipse(4, t * 0.06, t * 0.98, t * 1.04);
            g.fillStyle(col, 1); g.fillEllipse(0, 0, t * 0.98, t * 1.04);
            g.fillStyle(0xffffff, 0.3); g.fillEllipse(-t * 0.2, -t * 0.22, t * 0.28, t * 0.4);
            g.fillTriangle(-6, t * 0.5, 6, t * 0.5, 0, t * 0.58);
            g.fillStyle(0xffffff, 1); g.fillCircle(0, 0, t * 0.34);
            g.lineStyle(3, 0xffffff, 0.9); g.strokeCircle(0, 0, t * 0.4);
            var im = this.add.image(0, 0, 'el_' + id);
            im.setScale((t * 0.46) / Math.max(im.width, im.height));
            c.add([g, im]);
            return { tipo: 'item', id: id, cont: c, r: t * 0.5, fase: Math.random() * 6, vx: 0, vy: 0, vivo: true, y0: c.y };
        },

        crearTormenta: function () {
            if (this.arteOk) {
                var La = this.L;
                var ca = this.add.container(La.W + 160, La.yMin + 10 + Math.random() * (La.yMax - La.yMin - 100)).setDepth(21);
                var cual = Math.random() < 0.5 ? 'trueno1' : 'trueno2';
                var nube = this.dd(cual, 0, 0, 0.4, 338, 170);
                var rayoA = this.add.graphics();
                ca.add([nube, rayoA]);
                return { tipo: 'tormenta', cont: ca, rayo: rayoA, img: nube, r: 78, fase: Math.random() * 6, vivo: true, vx: 0, vy: 0, arte: true };
            }
            var L = this.L;
            var c = this.add.container(L.W + 160, L.yMin + 10 + Math.random() * (L.yMax - L.yMin - 100)).setDepth(21);
            var g = this.add.graphics();
            g.fillStyle(0x495057, 1); g.fillEllipse(0, 0, 190, 54); g.fillCircle(-52, -16, 36); g.fillCircle(-4, -30, 46); g.fillCircle(50, -14, 34);
            g.fillStyle(0x6c757d, 1); g.fillCircle(-8, -34, 28); g.fillCircle(-52, -20, 22); g.fillCircle(46, -18, 20);
            g.fillStyle(0x343a40, 0.6); g.fillEllipse(0, 14, 170, 24);
            var rayo = this.add.graphics();
            c.add([g, rayo]);
            return { tipo: 'tormenta', cont: c, rayo: rayo, r: 78, fase: Math.random() * 6, vivo: true, vx: 0, vy: 0 };
        },

        agregar: function (o) { this.items.push(o); return o; },

        quitar: function (o, efecto) {
            if (!o.vivo) return;
            o.vivo = false;
            if (!efecto) { if (o.cont.active) o.cont.destroy(); return; }
            tw(this, { targets: o.cont, alpha: 0, scale: 0.4, duration: 260 }).then(function () { if (o.cont.active) o.cont.destroy(); });
        },

        esperado: function () {
            var nv = this.nv;
            return nv.ids[nv.ciclo[this.serie.length % nv.ciclo.length]];
        },

        generar: function (time) {
            var L = this.L, nv = this.nv, d = nv.d;
            var vivos = this.items.filter(function (o) { return o.vivo; });
            var regalos = vivos.filter(function (o) { return o.tipo === 'item'; });
            var esp = this.esperado();
            var hayEsp = regalos.some(function (o) { return o.id === esp && o.cont.x > L.W * 0.4; });
            if (!this.completa && regalos.length < 5 && (time - this.ultimo.item > 1900 || (!hayEsp && time - this.ultimo.item > 700))) {
                var otros = nv.ids.filter(function (q) { return q !== esp; });
                var id = !hayEsp || Math.random() < 0.4 || !otros.length ? esp : otros[(Math.random() * otros.length) | 0];
                this.agregar(this.crearItem(id));
                this.ultimo.item = time;
            }
            if (d.tormentas && time - this.ultimo.tormenta > 9000 / d.tormentas) { this.agregar(this.crearTormenta()); this.ultimo.tormenta = time; }
            if (d.aves && time - this.ultimo.ave > 6500 / d.aves) { this.bandada(); this.ultimo.ave = time; }
        },

        bandada: function () {
            var L = this.L, y = L.yMin + Math.random() * (L.yMax - L.yMin - 40);
            var n = 5 + ((Math.random() * 3) | 0);
            var b = { x: L.W + 60, y: y, vx: -(150 + Math.random() * 60), aves: [] };
            for (var i = 0; i < n; i++) b.aves.push({ dx: Math.floor(i / 2 + 1) * 34 * (i % 2 ? 1 : -1) * 0 + Math.floor(i / 2) * 36, dy: (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 18, f: Math.random() * 6 });
            this.bandadas = this.bandadas || [];
            this.bandadas.push(b);
            K.tono({ f: 2100, f2: 1500, dur: 0.1, vol: 0.012 });
        },

        /* ── Choques ── */

        chocar: function (o) {
            var G = this.globo, self = this;
            if (o.tipo === 'tormenta') {
                this.vy += 260 * 0.016;
                this.vx -= 90 * 0.016;
                if (this.time.now - (o.ultimo || 0) > 450) {
                    o.ultimo = this.time.now;
                    this.cameras.main.shake(110, 0.0035);
                    K.ruido({ f: 220, q: 0.6, dur: 0.3, vol: 0.06, tipo: 'lowpass' });
                    o.rayoT = this.time.now;
                    this.tweens.add({ targets: G.cuerpo, angle: { from: -9, to: 9 }, duration: 80, yoyo: true, repeat: 3, onComplete: function () { G.cuerpo.angle = 0; } });
                }
                return;
            }
            // Globo-regalo.
            if (this.time.now - (o.ultimo || 0) < 600) return;
            o.ultimo = this.time.now;
            if (this.fase === 'jugar' && !this.completa && o.id === this.esperado()) { this.recoger(o); return; }
            var a2 = Math.atan2(o.cont.y - G.cont.y, o.cont.x - G.cont.x);
            o.vx = Math.cos(a2) * 280; o.vy = Math.sin(a2) * 280;
            this.vx -= Math.cos(a2) * 80; this.vy -= Math.sin(a2) * 80;
            this.tweens.add({ targets: o.cont, angle: { from: -22, to: 22 }, duration: 90, yoyo: true, repeat: 2, onComplete: function () { o.cont.angle = 0; } });
            this.sonar(o.id, { bocina: false, pan: 0 });
            this.efectos.push({ x: o.cont.x, y: o.cont.y, t0: this.time.now, col: 0xffffff });
            this.tweens.add({ targets: G.cuerpo, y: 8, duration: 90, yoyo: true });
            var at = this.atril; if (at && at.cont.active) this.tweens.add({ targets: at.cont, angle: { from: -8, to: 8 }, duration: 80, yoyo: true, repeat: 2, onComplete: function () { if (at.cont.active) at.cont.angle = 0; } });
            if (this.fase === 'jugar' && !this.completa) {
                this.errores += 1; this.erroresNivel += 1;
                if (this.erroresNivel >= 4) this.ayuda = true;
                if (this.time.now - this.ultimoReclamo > 6000) {
                    this.ultimoReclamo = this.time.now;
                    this.reaccion('Decir_no', 1400);
                    this.ctx.decir({ voz: 'zeus', texto: '¡Ese instrumento no sigue la canción!' }, { minMs: 700 });
                }
            }
        },

        recoger: function (o) {
            var self = this, L = this.L;
            o.vivo = false;
            this.items = this.items.filter(function (q) { return q !== o; });
            var x = o.cont.x, y = o.cont.y, id = o.id, col = COL_INS[id] || 0xffffff;
            o.cont.destroy();
            this.serie.push(id);
            this.reunidos.push(id);
            this.recogidas += 1;
            this.pista.reiniciar();
            // El globo estalla en confeti y el instrumento vuela hasta el escenario.
            Ut.estallido(this, x, y, { n: 14, tex: 'chispa', tam: 22, dist: 120, depth: 70, colores: [col, 0xffffff, 0xffd43b], gravedad: 60 });
            Ut.estallido(this, x, y, { n: 6, tex: 'estrella', tam: 24, dist: 100, depth: 71, sinTinte: true });
            K.ruido({ f: 1500, q: 0.7, dur: 0.12, vol: 0.12 });
            var im = this.add.image(x, y, 'el_' + id).setDepth(72);
            im.setScale((L.tamI * 0.55) / Math.max(im.width, im.height));
            var animal = this.animalDe(this.serie.length - 1);
            var total = this.slots.length + 1 + 1;
            var dest = this.posSlot(this.slots.length, total);
            var fin = this.saltarA(im, dest.x, dest.y - 20, { alto: 140, ms: 700 });
            this.aterrizaFin = false;
            fin.then(function () {
                im.destroy();
                if (!self.sigue()) return;
                var m = self.sentar(id, animal);
                self.tocaMusico(m, 1);
                if (self.recogidas < self.nv.meta) self.ponerAtril();
                else if (self.atril) { self.atril.cont.destroy(); self.atril = null; }
            });
            this.dedoSuelta = false;
            if (this.recogidas >= this.nv.meta) {
                this.completa = true;
                if (this.nv.demo) { fin.then(function () { self.llegar(); }); return; }
                this.ctx.decir({ voz: 'zoe', texto: '¡La orquesta está completa! ¡Baja a la pista para aterrizar!' }, { minMs: 600 });
                this.traerPista();
            }
        },

        animalDe: function (k) {
            var an = this.animales || [];
            return an[k % Math.max(1, an.length)] || 'pollito';
        },

        /* ── Pista de aterrizaje ── */

        traerPista: function () {
            var L = this.L;
            var c = this.add.container(L.W + 260, L.suelo - 16).setDepth(11);
            var g = this.add.graphics();
            g.fillStyle(0x000000, 0.18); g.fillEllipse(0, 12, 300, 30);
            g.fillStyle(0x2f9e44, 1); g.fillRoundedRect(-140, -12, 280, 28, 14);
            g.fillStyle(0x51cf66, 1); g.fillRoundedRect(-140, -12, 280, 10, { tl: 14, tr: 14, bl: 0, br: 0 });
            g.fillStyle(0xf8f9fa, 1); g.fillRoundedRect(-92, -6, 184, 12, 6);
            g.fillStyle(0xe03131, 1); g.fillCircle(0, 0, 12);
            [-70, -40, 40, 70].forEach(function (x) { g.fillStyle(0xfab005, 1); g.fillRect(x - 3, -4, 6, 8); });
            g.lineStyle(3, 0x495057, 1); g.lineBetween(126, -12, 126, -64);
            g.fillStyle(0xfab005, 1); g.fillTriangle(126, -64, 160, -54, 126, -44);
            c.add(g);
            this.pad = { cont: c, w: 280 };
            this.tweens.add({ targets: c, x: L.xIni + 60, duration: 3200, ease: 'Sine.easeOut' });
        },

        llegar: async function () {
            if (this.llegando) return;
            this.llegando = true;
            this.spawnOn = false;
            this.fase = 'premio';
            this.marcadas = this.serie.slice();
            await this.acertar([this.serie[this.serie.length - 1]], { x: this.globo.cont.x, y: this.globo.cont.y });
            this.llegando = false;
        },

        /* ── Niveles ── */

        generarNivel: function (i) {
            var self = this, d = NIV[Math.min(i, 3)];
            var hay = function (id) { return self.textures.exists('el_' + id); };
            var ins = Ut.mezclar(INSTR.filter(hay));
            var usados = d.ciclo.reduce(function (m, q) { return Math.max(m, q); }, 0) + 1;
            var ids = ins.slice(0, usados);
            if (d.distr) ids.push(ins[usados]);
            var dados = [];
            for (var k = 0; k < d.dados; k++) dados.push(ids[d.ciclo[k % d.ciclo.length]]);
            return {
                tipo: 'elegir', reproducciones: [dados], opciones: ids.slice(), correctas: [ids[d.ciclo[d.dados % d.ciclo.length]]], meta: d.meta, preguntas: [],
                ids: ids, ciclo: d.ciclo, dados: dados, d: d, bioma: Math.min(i, 3)
            };
        },

        planNiveles: function () { var self = this; return [0, 1, 2, 3].map(function (i) { return self.generarNivel(i); }); },
        nivelDemo: function () { var nv = this.generarNivel(0); nv.demo = true; nv.meta = 1; return nv; },

        preguntar: function () {
            if (this.nv.demo || this.nivelActual > 0) return Promise.resolve();
            return this.ctx.decir({ voz: 'zeus', texto: '¡Sube y baja el globo con tu dedo! Atrapa el instrumento que sigue la canción.' }, { minMs: 900 });
        },

        prepararNivel: async function (i, nv) {
            var self = this;
            this.nv = nv;
            this.items.forEach(function (o) { self.quitar(o, true); });
            this.items = [];
            this.bandadas = [];
            this.slots.forEach(function (m) { if (m.cont.active) tw(self, { targets: m.cont, alpha: 0, y: m.cont.y + 30, duration: 300 }).then(function () { m.cont.destroy(); }); });
            this.slots = [];
            if (this.atril && this.atril.cont.active) this.atril.cont.destroy();
            this.atril = null;
            if (this.pad) { var pc = this.pad.cont; tw(this, { targets: pc, x: -400, duration: 900 }).then(function () { pc.destroy(); }); this.pad = null; }
            var an = Ut.mezclar(ANIM.filter(function (id) { return self.textures.exists('el_' + id); }));
            this.animales = an;
            this.panes = {};
            this.serie = [];
            this.recogidas = 0;
            this.completa = false;
            this.llegando = false;
            this.erroresNivel = 0;
            this.aterrizando = false;
            if (this.bioma !== nv.bioma) { this.biomaDe = this.bioma; this.bioma = nv.bioma; this.biomaT = 0; }
            // La orquesta del escenario trae los músicos de la canción de ejemplo.
            for (var k = 0; k < nv.dados.length; k++) {
                this.serie.push(nv.dados[k]);
                var m = this.sentar(nv.dados[k], this.animalDe(k));
                m.cont.setAlpha(0);
            }
            this.ponerAtril();
            this.slots.forEach(function (m, k) { tw(self, { targets: m.cont, alpha: 1, scale: { from: 0.4, to: 1 }, duration: 320, delay: k * 140, ease: 'Back.easeOut' }); });
            await esperar(this, 700);
        },

        /** La orquesta toca la canción: cada músico salta con su instrumento. */
        presentar: async function () {
            this.fase = 'escuchando';
            this.pista.parar();
            await esperar(this, 250);
            for (var k = 0; k < this.slots.length; k++) {
                if (!this.sigue()) return;
                await this.tocaMusico(this.slots[k], 1);
                await esperar(this, 240);
            }
            if (this.atril && this.atril.cont.active) this.tweens.add({ targets: this.atril.cont, scale: { from: 1.3, to: 1 }, duration: 380 });
            await esperar(this, 250);
        },

        mostrarOpciones: async function () {
            this.spawnOn = true;
            var L = this.L, esp = this.esperado();
            var it = this.crearItem(esp);
            it.cont.x = L.W * 0.66; it.cont.y = (L.yMin + L.yMax) / 2 + 30; it.y0 = it.cont.y;
            this.agregar(it);
            this.ultimo.item = this.time.now;
        },

        alTerminarNivel: async function () {
            this.spawnOn = false;
            await esperar(this, 400);
        },

        /* ── Dedo: el globo sube y baja siguiéndolo ── */

        alTocar: function (p) {
            if (this.fase === 'intro' || this.fase === 'fin') return;
            this.dedo = { x: p.x, y: p.y };
            this.pista.reiniciar();
        },
        alMover: function (p) { if (this.dedo && p.isDown) this.dedo = { x: p.x, y: p.y }; },
        alSoltar: function () { this.dedo = null; },

        alAcertar: async function () {
            for (var k = 0; k < this.slots.length; k++) {
                if (!this.sigue()) return;
                await this.tocaMusico(this.slots[k], 1);
                await esperar(this, 100);
            }
            Ut.confeti(this, 50);
            await esperar(this, 400);
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar') return Promise.resolve();
            var G = this.globo.cont;
            var obj = null;
            if (this.completa && this.pad) obj = { x: this.pad.cont.x, y: this.L.suelo - 40 };
            else {
                var esp = this.esperado();
                var b = this.items.filter(function (o) { return o.vivo && o.tipo === 'item' && o.id === esp && o.cont.x > self.L.xMin + 60 && o.cont.x < self.L.W; })[0];
                if (b) obj = { x: Math.min(b.cont.x, self.L.xMax), y: b.cont.y };
            }
            if (!this.ayuda && !this.completa) { this.picar(); return esperar(this, 800); }
            if (!obj) return esperar(this, 500);
            return this.ctx.mano({ punto: { x: G.x, y: G.y + 60 }, holdMs: 200, arrastre: { dx: obj.x - G.x, dy: obj.y - G.y, durMs: 1100 }, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
        },

        picar: function () {
            if (this.atril && this.atril.cont.active) this.tweens.add({ targets: this.atril.cont, scale: { from: 1.25, to: 1 }, duration: 300 });
        },

        demoPaso: function () {
            var self = this;
            return [function () {
                var esp = self.esperado();
                var b = self.items.filter(function (o) { return o.vivo && o.tipo === 'item' && o.id === esp; })[0];
                if (!b) return null;
                b.quieto = true;
                var G = self.globo.cont;
                return {
                    desde: { x: G.x, y: G.y + 60 }, hasta: { x: b.cont.x, y: b.cont.y },
                    hacer: async function () {
                        self.fase = 'jugar';
                        self.dedo = { x: b.cont.x, y: b.cont.y };
                        for (var t = 0; t < 70 && !self.completa; t++) await esperar(self, 80);
                        self.dedo = null;
                        while (self.llegando && self.fase === 'premio') await esperar(self, 100);
                    }
                };
            }];
        },

        /* ── Final: fiesta nocturna ── */

        escenaFinal: async function () {
            var self = this, L = this.L;
            this.spawnOn = false;
            this.items.forEach(function (o) { self.quitar(o, true); });
            this.bandadas = [];
            if (this.pad) { var pc = this.pad.cont; tw(this, { targets: pc, x: -400, duration: 700 }).then(function () { pc.destroy(); }); this.pad = null; }
            if (this.bioma !== 3) { this.biomaDe = this.bioma; this.bioma = 3; this.biomaT = 0; }
            if (this.atril && this.atril.cont.active) this.atril.cont.destroy();
            this.atril = null;
            this.fiesta = true;
            this.dedo = null;
            this.globoDestino = { x: L.W * 0.5, y: L.H * 0.36 };
            await esperar(this, 1800);
            // La orquesta completa con todos los instrumentos, un coro de varias vueltas.
            var hay = this.slots.length;
            for (var v = 0; v < 2; v++) {
                for (var k = 0; k < this.slots.length; k++) {
                    if (!this.sigue()) return;
                    var m = this.slots[k];
                    this.fuego(L.W * (0.18 + 0.64 * (k / Math.max(1, hay - 1 || 1))), L.H * (0.12 + Math.random() * 0.22), k);
                    await this.tocaMusico(m, 1);
                }
            }
            Ut.confeti(this, 100);
            await esperar(this, 1200);
        },

        fuego: function (x, y, k) {
            var cols = [0xff6b6b, 0xfab005, 0x69db7c, 0x4dabf7, 0xcc5de8];
            K.ruido({ f: 2400, q: 0.6, dur: 0.3, vol: 0.08 });
            Ut.estallido(this, x, y, { n: 24, tex: 'chispa', tam: 22, dist: 150, depth: 52, colores: [cols[k % 5], 0xffffff, cols[(k + 2) % 5]], ms: 1100, gravedad: 50 });
            Ut.estallido(this, x, y, { n: 6, tex: 'estrella', tam: 22, dist: 90, depth: 53, sinTinte: true });
        },

        estadoExtra: function () {
            var G = this.globo && this.globo.cont;
            return {
                serie: this.serie.slice(), esperado: this.nv && this.nv.ids ? this.esperado() : null, recogidas: this.recogidas, completa: !!this.completa, bioma: this.bioma,
                globo: G && { x: Math.round(G.x), y: Math.round(G.y) }, pad: this.pad && { x: Math.round(this.pad.cont.x), y: Math.round(this.pad.cont.y) },
                musicos: this.slots.length,
                items: this.items.filter(function (o) { return o.vivo; }).map(function (o) { return { t: o.tipo, id: o.id, x: Math.round(o.cont.x), y: Math.round(o.cont.y) }; })
            };
        },

        /* ── Cada cuadro ── */

        paso: function (time, delta) {
            var L = this.L, s = time / 1000, dt = Math.min(0.05, (delta || 16) / 1000), self = this;
            if (!L || !this.cieloG || !this.cieloG.active || !this.globo) return;
            this.biomaT = Math.min(1, this.biomaT + dt / 2.6);
            var te = this.biomaT * this.biomaT * (3 - 2 * this.biomaT);
            var P = this.pal = mezclaBioma(BIOMAS[this.biomaDe], BIOMAS[this.bioma], te);
            var vel = this.nv && this.nv.d && (this.fase === 'jugar' || this.fase === 'escuchando') ? this.nv.d.vel : (this.fase === 'fin' ? 12 : 26);
            if (this.nv && this.nv.demo) vel = 26;
            var corre = this.completa && this.pad ? vel * 0.7 : vel;
            if (this.fiesta) corre = 14;
            this.mundo += corre * dt;
            var W = L.W, H = L.H, M = this.mundo;

            // ── Cielo, astro y estrellas ──
            if (!this.arteOk) {
            var cg = this.cieloG; cg.clear();
            for (var b = 0; b < 20; b++) { cg.fillStyle(mezcla(P.cielo[0], P.cielo[1], b / 19), 1); cg.fillRect(0, (L.suelo / 20) * b, W, L.suelo / 20 + 1); }
            var ag = this.astroG; ag.clear();
            var ax = W * 0.8, ay = L.suelo * P.astroY;
            if (P.noche > 0.02) {
                for (var e = 0; e < 70; e++) { ag.fillStyle(0xffffff, P.noche * (0.3 + 0.6 * Math.abs(Math.sin(s * 1.2 + e * 2.3)))); ag.fillCircle((e * 977 + 50) % W, 8 + (e * 613) % (L.suelo * 0.7), 1 + (e % 3) * 0.6); }
                // Aurora boreal que ondula.
                for (var au = 0; au < 3; au++) {
                    ag.fillStyle([0x38f2a6, 0x5fd4ff, 0xb869f0][au], (0.17 - au * 0.03) * P.noche);
                    ag.beginPath(); ag.moveTo(0, L.suelo * 0.3);
                    for (var xx = 0; xx <= W; xx += 30) ag.lineTo(xx, L.suelo * (0.2 + au * 0.07) + Math.sin(xx / 140 + s * (0.5 + au * 0.2) + au) * 30);
                    for (var xy = W; xy >= 0; xy -= 30) ag.lineTo(xy, L.suelo * (0.4 + au * 0.08) + Math.sin(xy / 110 - s * 0.6 + au * 2) * 36);
                    ag.closePath(); ag.fillPath();
                }
            }
            ag.fillStyle(P.astro, 0.2); ag.fillCircle(ax, ay, 84 - 20 * P.noche);
            if (P.noche < 0.5) for (var rr = 0; rr < 12; rr++) { var an = s * 0.15 + rr * Math.PI / 6; ag.fillStyle(P.astro, 0.2 * (1 - P.noche * 2)); ag.fillTriangle(ax + Math.cos(an - 0.08) * 50, ay + Math.sin(an - 0.08) * 50, ax + Math.cos(an + 0.08) * 50, ay + Math.sin(an + 0.08) * 50, ax + Math.cos(an) * 96, ay + Math.sin(an) * 96); }
            ag.fillStyle(P.astro, 1); ag.fillCircle(ax, ay, 40 - 4 * P.noche);
            if (P.noche > 0.5) { ag.fillStyle(0xced4da, 1); ag.fillCircle(ax - 10, ay - 7, 7); ag.fillCircle(ax + 9, ay + 10, 5); }

            // ── Montañas lejanas (con nieve), colinas medias y capa cercana ──
            var lg = this.lejosG; lg.clear();
            var baseL = L.suelo * 0.78, baseM = L.suelo * 0.88;
            var offL = M * 0.05, offM = M * 0.12, offC = M * 0.3;
            var picos = [];
            lg.fillStyle(P.lejos, 1); lg.beginPath(); lg.moveTo(0, L.suelo);
            for (var x1 = 0; x1 <= W + 14; x1 += 14) {
                var xw = x1 + offL, hh = (Math.sin(xw / 230) * 0.5 + Math.sin(xw / 97 + 1.3) * 0.3 + Math.sin(xw / 41 + 0.4) * 0.2 + 1) * 0.5;
                var yy = baseL - hh * P.ampL; lg.lineTo(x1, yy);
                if (P.nieve > 0.02 && hh > 0.78) picos.push({ x: x1, y: yy });
            }
            lg.lineTo(W + 14, L.suelo); lg.closePath(); lg.fillPath();
            if (P.nieve > 0.02) { lg.fillStyle(0xffffff, 0.9 * P.nieve); picos.forEach(function (p) { lg.fillTriangle(p.x - 17, p.y + 15, p.x + 17, p.y + 15, p.x, p.y - 1); }); }
            var mg = this.medioG; mg.clear();
            mg.fillStyle(P.medio, 1); mg.beginPath(); mg.moveTo(0, L.suelo);
            for (var x2 = 0; x2 <= W + 14; x2 += 14) { var xm = x2 + offM, hm = (Math.sin(xm / 170 + 2) * 0.55 + Math.sin(xm / 71) * 0.3 + Math.sin(xm / 33 + 1) * 0.15 + 1) * 0.5; mg.lineTo(x2, baseM - hm * P.ampM); }
            mg.lineTo(W + 14, L.suelo); mg.closePath(); mg.fillPath();
            var cc = this.cercaG; cc.clear();
            cc.fillStyle(P.suelo, 1); cc.fillRect(0, L.suelo * 0.94, W, L.escH + 12);
            var dibujaCerca = function (tipo, al) {
                var paso = 250, i0 = Math.floor(offC / paso) - 1;
                for (var i = i0; i <= i0 + Math.ceil(W / paso) + 2; i++) {
                    var r = hash(i), x = i * paso - offC + r * 70, yb = L.suelo * 0.95;
                    if (tipo === 'aldea') {
                        var nocheCasa = P.noche > 0.5;
                        var cw = 54 + r * 26, ch = 40 + r * 18;
                        cc.fillStyle(nocheCasa ? 0x1a2552 : [0xffe3b0, 0xffc9c9, 0xd0ebff, 0xe9fac8][i & 3], al); cc.fillRect(x - cw / 2, yb - ch, cw, ch);
                        cc.fillStyle(nocheCasa ? 0x0e1530 : [0xc92a2a, 0x364fc7, 0xe67700, 0x2b8a3e][(i >> 1) & 3], al); cc.fillTriangle(x - cw / 2 - 8, yb - ch, x + cw / 2 + 8, yb - ch, x, yb - ch - 34);
                        cc.fillStyle(nocheCasa ? 0xffe066 : 0x74c0fc, al); cc.fillRect(x - 10, yb - ch * 0.7, 12, 14); cc.fillRect(x + 8, yb - ch * 0.7, 12, 14);
                        cc.fillStyle(0x7a4419, al); cc.fillRect(x - 5, yb - 22, 11, 22);
                        cc.fillStyle(nocheCasa ? 0x151d40 : 0x8d5a2b, al); cc.fillRect(x + cw * 0.22, yb - ch - 32, 9, 22);
                        for (var h = 0; h < 3; h++) { cc.fillStyle(0xffffff, al * (0.5 - h * 0.14)); cc.fillCircle(x + cw * 0.27 + Math.sin(s * 1.5 + h + i) * 6 + h * 4, yb - ch - 42 - h * 14 - ((s * 14 + h * 5) % 16), 6 + h * 2.5); }
                        if (i % 5 === 0) {   // molino de viento
                            var mx = x + 120;
                            cc.fillStyle(nocheCasa ? 0x1d2a58 : 0xf8f9fa, al); cc.fillTriangle(mx - 20, yb, mx + 20, yb, mx, yb - 96);
                            cc.lineStyle(5, nocheCasa ? 0x2b3a72 : 0xc92a2a, al);
                            for (var bl = 0; bl < 4; bl++) { var ang = s * 1.1 + bl * Math.PI / 2; cc.lineBetween(mx, yb - 90, mx + Math.cos(ang) * 46, yb - 90 + Math.sin(ang) * 46); }
                        }
                        if (nocheCasa) { cc.fillStyle(0xffd43b, 0.16); cc.fillCircle(x, yb - ch * 0.6, 34); }
                    } else if (tipo === 'pinos') {
                        for (var t = 0; t < 3; t++) { var px = x + (t - 1) * 34 + r * 20, ph = 70 + ((i + t) % 3) * 22; cc.fillStyle(0x7a4419, al); cc.fillRect(px - 4, yb - 12, 8, 14); cc.fillStyle(t % 2 ? 0x2b8a3e : 0x1f6f3a, al); for (var tr = 0; tr < 3; tr++) cc.fillTriangle(px - 28 + tr * 5, yb - 12 - tr * ph * 0.26, px + 28 - tr * 5, yb - 12 - tr * ph * 0.26, px, yb - 12 - ph * 0.5 - tr * ph * 0.26); cc.fillStyle(0xffffff, al * 0.85); cc.fillTriangle(px - 9, yb - 12 - ph * 0.5 - 2 * ph * 0.26 + 18, px + 9, yb - 12 - ph * 0.5 - 2 * ph * 0.26 + 18, px, yb - 12 - ph * 0.5 - 2 * ph * 0.26); }
                    } else {
                        var mw = 90 + r * 70, mh = 60 + r * 50;
                        cc.fillStyle(0xb5532c, al); cc.fillRoundedRect(x - mw / 2, yb - mh, mw, mh, { tl: 14, tr: 14, bl: 0, br: 0 });
                        cc.fillStyle(0xd9703a, al); cc.fillRoundedRect(x - mw / 2, yb - mh, mw, mh * 0.3, { tl: 14, tr: 14, bl: 0, br: 0 });
                        cc.fillStyle(0x7a2f17, al * 0.6); for (var bnd = 1; bnd < 4; bnd++) cc.fillRect(x - mw / 2, yb - mh + bnd * mh * 0.22, mw, 4);
                        var cx = x + mw * 0.7; cc.fillStyle(0x2f9e44, al); cc.fillRoundedRect(cx - 6, yb - 52, 12, 52, 6); cc.fillRoundedRect(cx - 24, yb - 40, 8, 24, 4); cc.fillRect(cx - 24, yb - 24, 20, 7); cc.fillRoundedRect(cx + 14, yb - 46, 8, 22, 4); cc.fillRect(cx + 4, yb - 30, 18, 7);
                    }
                }
            };
            var tipoA = BIOMAS[this.biomaDe].tipo, tipoB = BIOMAS[this.bioma].tipo;
            if (te < 1 && tipoA !== tipoB) { dibujaCerca(tipoA, 1 - te); dibujaCerca(tipoB, te); } else dibujaCerca(tipoB, 1);

            }

            if (this.arteOk) { this.cieloG.clear(); this.lejosG.clear(); this.medioG.clear(); this.cercaG.clear(); this.nubesG.clear(); this.nubes2G.clear(); this.animarFondoArte(time, s, P, te, M); }
            // ── Nubes ──
            var ng = this.nubesG; ng.clear();
            if (!this.arteOk) {
            for (var n = 0; n < 7; n++) {
                var par = 0.35 + (n % 4) * 0.18, nx = W + 200 - ((M * par + s * 4 + n * 290) % (W + 400)), ny = L.suelo * (0.08 + (n % 5) * 0.14);
                ng.fillStyle(P.nube, 0.9 - 0.3 * P.noche);
                ng.fillEllipse(nx, ny, 150, 28); ng.fillCircle(nx - 26, ny - 8, 20); ng.fillCircle(nx + 4, ny - 15, 26); ng.fillCircle(nx + 34, ny - 6, 18);
            }

            // Nubes de primer plano que pasan por delante del globo (dan sensación de altura y velocidad).
            var n2 = this.nubes2G; n2.clear();
            for (var q = 0; q < 2; q++) {
                var qx = W + 300 - ((M * 1.25 + q * 760 + s * 8) % (W + 700)), qy = L.suelo * (0.28 + q * 0.32);
                n2.fillStyle(P.nube, 0.5 - 0.25 * P.noche);
                n2.fillEllipse(qx, qy, 330, 58); n2.fillCircle(qx - 90, qy - 14, 42); n2.fillCircle(qx, qy - 30, 56); n2.fillCircle(qx + 92, qy - 12, 40);
            }

            }

            // ── Globo: sube hacia el dedo, baja despacio si no hay dedo, y se mueve un poco de lado ──
            var G = this.globo, gc = G.cont, sG = G.s;
            if (this.fiesta && this.globoDestino) {
                gc.x += (this.globoDestino.x - gc.x) * Math.min(1, dt * 1.6); gc.y += (this.globoDestino.y - gc.y) * Math.min(1, dt * 1.6) + Math.sin(s * 1.4) * 0.4;
                this.vx = 0; this.vy = 0;
            } else {
                var objY, objX, quema = false;
                if (this.dedo && this.fase !== 'fin' && !this.aterrizando) {
                    objY = this.dedo.y - 70 * sG; objX = Math.max(L.xMin, Math.min(L.xMax, this.dedo.x));
                    quema = objY < gc.y - 6;
                } else { objY = gc.y + 60; objX = L.xIni; }
                objY = Math.max(L.yMin, Math.min(L.yMax, objY));
                this.vy += ((objY - gc.y) * 6.5 - this.vy * 3.1) * dt;
                this.vx += ((objX - gc.x) * 3.2 - this.vx * 2.6) * dt;
                this.vy = Math.max(-280, Math.min(280, this.vy));
                if (!this.aterrizando) { gc.x += this.vx * dt; gc.y += this.vy * dt; }
                gc.x = Math.max(L.xMin - 20, Math.min(L.xMax + 20, gc.x));
                if (gc.y < L.yMin) { gc.y = L.yMin; this.vy = Math.max(0, this.vy); }
                if (gc.y > L.yMax) { gc.y = L.yMax; this.vy = Math.min(0, this.vy) * -0.2; }
                G.llama = quema ? Math.min(1, G.llama + dt * 6) : Math.max(0, G.llama - dt * 4);
                if (quema && time - this.ultQuema > 1100) { this.ultQuema = time; K.ruido({ f: 2600, q: 0.5, dur: 0.5, vol: 0.02, tipo: 'highpass' }); }
            }
            if (!this.aterrizando) {
                var objA = Math.max(-9, Math.min(9, this.vx * 0.03)) + Math.sin(s * 1.3) * 1.6;
                G.angulo += (objA - G.angulo) * Math.min(1, dt * 5);
                G.cuerpo.angle = G.angulo;
                G.cuerpo.y = Math.sin(s * 1.7) * 3 - Math.max(0, -this.vy) * 0.02;
                G.cuerpo.scaleX = sG * (1 + Math.max(0, -this.vy) * 0.0002); G.cuerpo.scaleY = sG * (1 + Math.min(0, -this.vy) * 0.0001 + Math.max(0, -this.vy) * 0.00028);
            }
            gc.setDepth(30);
            var fl = G.llamaG;
            if (fl && fl.active) {
                fl.clear();
                if (G.llama > 0.03) {
                    var fh = (14 + 12 * Math.sin(s * 30) + 7 * Math.sin(s * 53)) * G.llama, fy = G.fy || 76;
                    fl.fillStyle(0xff922b, 0.9 * G.llama); fl.fillTriangle(-9, fy, 9, fy, 0, fy + fh * 1.5);
                    fl.fillStyle(0xffe066, 0.95 * G.llama); fl.fillTriangle(-5, fy, 5, fy, 0, fy + fh);
                    fl.fillStyle(0xffffff, 0.9 * G.llama); fl.fillTriangle(-2, fy, 2, fy, 0, fy + fh * 0.5);
                    fl.fillStyle(0xffd43b, 0.18 * G.llama); fl.fillCircle(0, fy - 28, 62);
                }
            }
            if (G.pil && G.pil.active) G.pil.y = (G.py || 90) + Math.sin(s * 2.4) * 1.5 - G.llama * 2;
            if (G.aero && G.aero.active) G.aero.scaleY = G.aero.sy0 * (1 + Math.sin(s * 2.2) * 0.01 + G.llama * 0.012);
            // (Sin sombra del globo sobre el paisaje: se quitó a pedido.)
            var sg = this.efectosG; sg.clear();
            // Anillos y chispas de sonido.
            this.efectos = this.efectos.filter(function (a) { return time - a.t0 < 1200; });
            this.efectos.forEach(function (a) { var fr = (time - a.t0) / 1000; if (fr > 1) return; sg.lineStyle(4 * (1 - fr) + 1, a.col, 0.8 * (1 - fr)); sg.strokeCircle(a.x, a.y, 14 + fr * 90); });

            // ── Cosas del cielo: globos-regalo que se mecen, tormentas, aves ──
            if (this.spawnOn && this.nv && this.nv.d && !this.completa) this.generar(time);
            this.items = this.items.filter(function (o) { return o.vivo || (o.cont && o.cont.active); });
            this.items.forEach(function (o) {
                if (!o.vivo) return;
                if (!o.quieto) o.cont.x -= (corre + (o.tipo === 'tormenta' ? 6 : 0)) * dt;
                if (o.vx || o.vy) { o.cont.x += o.vx * dt; o.cont.y += o.vy * dt; o.vx *= Math.pow(0.2, dt); o.vy *= Math.pow(0.2, dt); if (Math.abs(o.vx) < 2) o.vx = 0; if (Math.abs(o.vy) < 2) o.vy = 0; o.y0 = o.cont.y; }
                if (o.tipo === 'item') {
                    o.cont.y = Math.max(L.yMin - 20, Math.min(L.yMax + 10, o.y0 + Math.sin(s * 1.6 + o.fase) * 9));
                    o.cont.angle = Math.sin(s * 1.3 + o.fase) * 6;
                    o.y0 = Math.max(L.yMin - 20, Math.min(L.yMax + 10, o.y0));
                } else {
                    var ry = o.rayo; ry.clear();
                    if (o.arte) { var fla = o.rayoT && time - o.rayoT < 260 && Math.floor(time / 60) % 2 === 0; if (fla) o.img.setTint(0xfff3bf); else o.img.clearTint(); o.img.scaleY = o.img.sy0 * (1 + Math.sin(s * 2 + o.fase) * 0.02); }
                    if (!o.arte && o.rayoT && time - o.rayoT < 260 && Math.floor(time / 60) % 2 === 0) { ry.fillStyle(0xfff3bf, 1); ry.fillPoints([{ x: 0, y: 14 }, { x: -16, y: 52 }, { x: -2, y: 50 }, { x: -14, y: 90 }, { x: 18, y: 38 }, { x: 4, y: 40 }, { x: 12, y: 14 }], true); }
                    else if (Math.sin(s * 0.7 + o.fase) > 0.985) o.rayoT = time;
                    for (var d2 = 0; d2 < 3; d2++) { var rx = -60 + d2 * 60 + ((s * 90 + d2 * 17) % 30), rya = 24 + ((s * 220 + d2 * 41) % 70); ry.lineStyle(2, 0x74c0fc, 0.7); ry.lineBetween(rx, rya, rx - 5, rya + 14); }
                }
                if (o.cont.x < -240) { self.quitar(o, false); return; }
                if (self.fase !== 'fin' && self.fase !== 'premio' && !self.aterrizando && dist(o.cont, gc) < o.r + G.r) self.chocar(o);
            });

            // ── Bandadas de aves: cruzan el cielo y hacen cabecear el globo ──
            var bg = this.avesG; bg.clear();
            this.bandadas = (this.bandadas || []).filter(function (bd) { return bd.x > -200; });
            this.bandadas.forEach(function (bd) {
                bd.x += (bd.vx - corre) * dt; bd.y += Math.sin(s * 1.2 + bd.x * 0.01) * 0.3;
                bd.aves.forEach(function (a) {
                    var ax2 = bd.x + a.dx, ay2 = bd.y + a.dy, fl2 = Math.sin(s * 11 + a.f) * 8;
                    bg.lineStyle(3, P.noche > 0.5 ? 0xc5cdf0 : 0x343a40, 0.9); bg.beginPath(); bg.moveTo(ax2 - 12, ay2 - fl2); bg.lineTo(ax2, ay2 + 2); bg.lineTo(ax2 + 12, ay2 - fl2); bg.strokePath();
                    if (!bd.tocada && self.fase === 'jugar' && Math.hypot(ax2 - gc.x, ay2 - gc.y) < G.r + 10) { bd.tocada = true; self.vy += (ay2 > gc.y ? -1 : 1) * 40; self.tweens.add({ targets: G.cuerpo, angle: { from: -6, to: 6 }, duration: 90, yoyo: true, repeat: 2, onComplete: function () { G.cuerpo.angle = 0; } }); K.tono({ f: 2200, f2: 1600, dur: 0.12, vol: 0.02 }); K.tono({ f: 1900, f2: 1400, dur: 0.12, vol: 0.018 }); }
                });
            });

            // ── Pista de aterrizaje: bajar y posar el globo ──
            if (this.pad && this.completa && this.fase === 'jugar' && !this.llegando && !this.aterrizando) {
                var pd = this.pad.cont, cestaY = gc.y + (G.cesta || 124) * sG;
                var dxp = Math.abs(gc.x - pd.x), sobre = dxp < this.pad.w * 0.42, baja = cestaY > pd.y - 26;
                if (sobre && baja && Math.abs(this.vy) < 120) { this.aterrizar(); }
            }
            var ay3 = this.ayudaG; ay3.clear();
            if (this.ayuda && this.fase === 'jugar' && this.nv && this.nv.ids && !this.completa) {
                var esp = this.esperado();
                this.items.forEach(function (o) { if (o.vivo && o.tipo === 'item' && o.id === esp) { ay3.fillStyle(0xffe066, 0.25 + 0.15 * Math.sin(s * 6)); ay3.fillCircle(o.cont.x, o.cont.y, L.tamI * 0.8); } });
            }
            if (this.completa && this.pad && this.fase === 'jugar') { var pp = this.pad.cont; ay3.fillStyle(0xffe066, 0.25 + 0.15 * Math.sin(s * 6)); ay3.fillEllipse(pp.x, pp.y - 8, 220, 40); }

            // ── Músicos de la orquesta: respiran y la orquesta recuerda la melodía de vez en cuando ──
            this.slots.forEach(function (m, k) { if (m.cont.active && !self.tweens.isTweening(m.cuerpo)) m.cuerpo.y = Math.sin(s * 2.2 + k) * 2; });
            if (this.fase === 'jugar' && !this.coro && this.slots.length >= 3 && !(this.ctx.enDemo && this.ctx.enDemo()) && time - this.ultCoro > 9000 && time - this.ultSonido > 3000) {
                this.coro = true; this.ultCoro = time;
                (async function () { for (var q = 0; q < self.slots.length && self.sigue() && self.fase === 'jugar'; q++) { await self.tocaMusico(self.slots[q], 0.55); await esperar(self, 160); } self.coro = false; })();
            }

            // ── Ambiente: viento suave y alguna ave lejana ──
            if ((this.fase === 'jugar' || this.fase === 'escuchando') && !(this.ctx.enDemo && this.ctx.enDemo())) {
                if (time - this.ultViento > 4200) { this.ultViento = time; K.ruido({ f: 700, q: 0.4, dur: 1.2, vol: 0.012, tipo: 'lowpass' }); }
                if (P.noche < 0.5 && time - this.ultAve > 14000 + Math.random() * 5000) { this.ultAve = time; K.tono({ f: 2000, f2: 1500, dur: 0.12, vol: 0.011 }); }
            }
        },

        /** Aterrizaje suave: el globo se posa, se desinfla un poco y el público (animales) lo recibe. */
        aterrizar: async function () {
            if (this.aterrizando) return;
            this.aterrizando = true;
            var G = this.globo, gc = G.cont, L = this.L, pd = this.pad.cont, sG = G.s, self = this;
            this.vx = 0; this.vy = 0;
            K.tono({ f: 300, f2: 180, dur: 0.25, vol: 0.05 });
            await tw(this, { targets: gc, x: pd.x, y: pd.y - (G.cesta || 124) * sG + 18, duration: 600, ease: 'Sine.easeOut' });
            await tw(this, { targets: G.cuerpo, scaleY: sG * 0.9, scaleX: sG * 1.05, duration: 220, yoyo: true });
            Ut.estallido(this, pd.x, pd.y - 10, { n: 10, tex: 'chispa', tam: 20, dist: 110, depth: 60, colores: [0xe9d8a6, 0xffffff], angulo: -Math.PI / 2, abanico: 2.4, gravedad: 70 });
            if (G.pil && G.pil.active) this.tweens.add({ targets: G.pil, y: 78, duration: 160, yoyo: true, repeat: 2 });
            await esperar(this, 700);
            await this.llegar();
            this.aterrizando = false;
        }
    };

    K.crear({ id: 'globo', fondo: '#6fa8ff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
