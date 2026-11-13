/**
 * «La cabina de radio» — motor propio de Recuerda dos sonidos (3-4 años).
 *
 * Estudio juguete: mientras suena, luces / ON AIR / VU / parlante late (sin delatar).
 * Luego caen 3 discos de vinilo al cristal. El niño TOCA un disco y vuela en arco a una
 * bandeja-grabadora libre. Correcto encaja; incorrecto se eyecta al rack. Orden libre.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Log = global.CabinaLogica;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var rnd = Ut.rnd;

    function ruidoCabina(nombre, respaldo, opts) {
        if (global.RecuerdaDosSfx && global.RecuerdaDosSfx(nombre, opts)) return;
        if (global.RecuerdaDosCabinaSfx && global.RecuerdaDosCabinaSfx(nombre, opts)) return;
        if (respaldo) respaldo();
    }

    function vibrar(scene, patron) {
        if (Ut.reducido()) return;
        if (scene && scene.ctx && scene.ctx.enDemo && scene.ctx.enDemo()) return;
        var nav = global.navigator;
        if (nav && nav.userActivation && !nav.userActivation.hasBeenActive) return;
        try {
            if (nav && typeof nav.vibrate === 'function') nav.vibrate(patron);
        } catch (e) { /* noop */ }
    }

    var escena = {
        iniciar: function () {
            this.cosas = [];
            this.reunidos = [];
            this.paresEstante = [];
            this.enviando = false;
            this.estado = Log.crear(2);
            this.luces = [];
            this.marquee = [];
            this.vuBarras = [];
            this.bandejaViz = [];
            this.huecosEstante = [];
            this.onAirLit = false;
            this.nivelSuave = 0;
        },

        /**
         * Layout anclado al gabinete y a su «cristal» (como la máquina ancla al cristal).
         * Los discos NO usan un rack fijo de 3: lugares(n)/tamOpciones(n) calculan huecos sin solapar.
         */
        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            L.pres = null;

            var mw = Math.min(W * 0.72, 1100);
            var mh = Math.min(H * 0.88, 920);
            L.maq = { x: W / 2, y: H * 0.5, w: mw, h: mh };
            var M = L.maq;

            L.cristal = {
                x: M.x,
                y: M.y - M.h * 0.06,
                w: M.w * 0.7,
                h: M.h * 0.4
            };
            var C = L.cristal;

            // Línea del estante interno (los discos apoyan aquí).
            L.estanteY = C.y + C.h * 0.3;
            L.panel = { y: M.y + M.h * 0.34, h: M.h * 0.18 };
            // Tamaño base; tamOpciones(n) lo reduce si no caben.
            L.tam = Math.max(88, Math.min(132, C.w / 4.4, C.h * 0.4));

            // Bandejas juntas bajo el cristal (no abiertas a todo el gabinete).
            var bw = Math.min(L.tam * 1.15, C.w * 0.26);
            var bh = Math.min(L.tam * 0.52, L.panel.h * 0.78);
            var gap = Math.max(22, bw * 0.22);
            var by = L.panel.y + 2;
            L.bandejas = [
                { x: C.x - bw / 2 - gap / 2, y: by, w: bw, h: bh },
                { x: C.x + bw / 2 + gap / 2, y: by, w: bw, h: bh }
            ];

            // Parlante en el lateral del gabinete (fuera del cristal).
            L.parlante = {
                x: C.x - C.w * 0.5 - Math.min(48, M.w * 0.055),
                y: C.y - C.h * 0.05,
                r: Math.min(36, M.w * 0.042)
            };
            L.onair = {
                x: C.x + C.w * 0.5 + Math.min(56, M.w * 0.06),
                y: C.y - C.h * 0.22,
                w: Math.min(100, M.w * 0.11),
                h: 30
            };
            L.vu = { x: C.x, y: C.y - C.h * 0.48, w: Math.min(C.w * 0.36, M.w * 0.22), h: 18 };

            // Bocina del kit: esquina inferior izquierda de la pantalla (no compite con el marquee).
            L.bocina = { x: 58, y: H - 58, r: 28 };

            var libre = M.x - M.w / 2 - 12;
            var vy0 = Math.max(H * 0.17, 96);
            var vy1 = Math.min(H * 0.78, M.y + M.h * 0.3);
            var vs = Math.min(libre * 0.78, (vy1 - vy0) / 4 * 0.82);
            L.estante = vs >= 56
                ? { x: libre / 2 + 2, y0: vy0, y1: vy1, s: vs, n: 4, w: Math.min(libre - 28, vs * 1.3) }
                : null;

            return L;
        },

        /** Diámetro visual del disco ≈ 0.92·tam; el hueco deja aire entre vecinos. */
        tamOpciones: function (n) {
            n = Math.max(1, n || 3);
            var L = this.L, C = L.cristal;
            var ancho = C.w * 0.78;
            var tam = Math.min(L.tam, (ancho / n) * 0.78);
            return Math.max(70, Math.floor(tam));
        },

        /** Centros de los discos sobre el estante, sin solaparse. */
        lugares: function (n) {
            n = Math.max(1, n || 3);
            var L = this.L, C = L.cristal;
            var tam = this.tamOpciones(n);
            var radio = tam * 0.46;
            var pad = radio + 10;
            var x0 = C.x - C.w * 0.39 + pad * 0.15;
            var x1 = C.x + C.w * 0.39 - pad * 0.15;
            // Con 2 opciones, el grupo queda centrado (no pegado a la izquierda).
            if (n === 2) {
                var span = Math.min(x1 - x0, tam * 2.55);
                x0 = C.x - span / 2;
                x1 = C.x + span / 2;
            }
            var y = L.estanteY - radio * 0.05;
            var out = [];
            for (var i = 0; i < n; i++) {
                var t = n === 1 ? 0.5 : i / (n - 1);
                out.push({ x: x0 + (x1 - x0) * t, y: y });
            }
            return out;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            var cam = this.cameras.main;
            cam.setBounds(0, 0, L.W, L.H);
            cam.setZoom(1);
            cam.centerOn(L.W / 2, L.H / 2);

            this.luces = [];
            this.marquee = [];
            this.vuBarras = [];
            this.bandejaViz = [];

            this.montarEstudio(keep);
            this.montarEstante(keep);
            this.montarGabinete(keep);
            this.montarLuces(keep);
            this.montarParlante(keep);
            this.montarOnAir(keep);
            this.montarVu(keep);
            this.montarBandejas(keep);
            this.sembrarMotes(keep, 20, { x: 0, y: 0, w: L.W, h: L.H * 0.4, depth: 2 }, 0xffe066);
            this.montarHud(keep);

            if (reubicar) this.ubicarCosas();
        },

        /* ── Estudio (fondo vivo) ── */

        montarEstudio: function (keep) {
            var L = this.L;
            K.textura(this, 'cabina_estudio', L.W, L.H, function (x, w, h) {
                var cielo = x.createLinearGradient(0, 0, 0, h);
                cielo.addColorStop(0, '#12081f');
                cielo.addColorStop(0.4, '#2a1548');
                cielo.addColorStop(0.62, '#3d2a55');
                cielo.addColorStop(1, '#2b1a14');
                x.fillStyle = cielo;
                x.fillRect(0, 0, w, h);

                // Techo con focos.
                x.fillStyle = '#0a0614';
                x.fillRect(0, 0, w, h * 0.12);
                for (var i = 0; i < 12; i++) {
                    var lx = 50 + i * (w / 11);
                    x.fillStyle = 'rgba(255, 196, 90, 0.12)';
                    x.beginPath();
                    x.moveTo(lx, h * 0.09);
                    x.lineTo(lx - 55, h * 0.5);
                    x.lineTo(lx + 55, h * 0.5);
                    x.closePath();
                    x.fill();
                    x.fillStyle = '#ffe066';
                    x.beginPath();
                    x.arc(lx, h * 0.09, 5, 0, Math.PI * 2);
                    x.fill();
                }

                // Paneles acústicos de pared.
                for (var p = 0; p < 8; p++) {
                    var px = w * (0.04 + p * 0.12);
                    var py = h * 0.22;
                    x.fillStyle = p % 2 ? '#4a2f6b' : '#3b2458';
                    K.rr(x, px, py, w * 0.09, h * 0.28, 8); x.fill();
                    x.strokeStyle = 'rgba(255,200,120,0.15)';
                    x.lineWidth = 2;
                    K.rr(x, px, py, w * 0.09, h * 0.28, 8); x.stroke();
                }

                // Piso de estudio.
                var piso = x.createLinearGradient(0, h * 0.58, 0, h);
                piso.addColorStop(0, '#3d2918');
                piso.addColorStop(0.2, '#5c4030');
                piso.addColorStop(1, '#2a1a10');
                x.fillStyle = piso;
                x.fillRect(0, h * 0.58, w, h * 0.42);
                x.fillStyle = 'rgba(255,220,150,0.2)';
                x.fillRect(0, h * 0.58, w, 6);
                x.strokeStyle = 'rgba(0,0,0,0.2)';
                x.lineWidth = 2;
                for (var yy = h * 0.64; yy < h; yy += 34) {
                    x.beginPath(); x.moveTo(0, yy); x.lineTo(w, yy); x.stroke();
                }

                K.grano(x, 0, 0, w, h, Math.round(w * h / 500), ['#5c3d7a', '#6b4423', '#2b1d4e'], 1.3, 0.22);
            });
            keep(this.add.image(0, 0, 'cabina_estudio').setOrigin(0, 0).setDepth(0));
            keep(this.add.ellipse(L.maq.x, L.maq.y + L.maq.h * 0.48, L.maq.w * 0.85, 48, 0x000000, 0.32).setDepth(1));
        },

        /* ── Gabinete (textura rica) ── */

        montarGabinete: function (keep) {
            var L = this.L, M = L.maq, C = L.cristal;

            K.textura(this, 'cabina_cuerpo', Math.ceil(M.w + 60), Math.ceil(M.h + 60), function (x, w, h) {
                x.fillStyle = 'rgba(0,0,0,0.28)';
                K.rr(x, 28, 28, M.w, M.h, 40); x.fill();

                var g = x.createLinearGradient(0, 20, M.w, h);
                g.addColorStop(0, '#8d6e4c');
                g.addColorStop(0.35, '#6b4423');
                g.addColorStop(0.7, '#5c3a1e');
                g.addColorStop(1, '#3d2412');
                x.fillStyle = g;
                K.rr(x, 20, 20, M.w, M.h, 38); x.fill();

                // Marco ámbar.
                x.strokeStyle = '#ffe066';
                x.lineWidth = 20;
                K.rr(x, 30, 30, M.w - 20, M.h - 20, 30); x.stroke();
                x.strokeStyle = '#fab005';
                x.lineWidth = 7;
                K.rr(x, 42, 42, M.w - 44, M.h - 44, 24); x.stroke();

                // Brillo lateral.
                var brillo = x.createLinearGradient(20, 0, 90, 0);
                brillo.addColorStop(0, 'rgba(255,255,255,0.3)');
                brillo.addColorStop(1, 'rgba(255,255,255,0)');
                x.fillStyle = brillo;
                K.rr(x, 26, 40, 55, M.h - 50, 20); x.fill();

                // Marquee.
                x.fillStyle = '#1a1028';
                K.rr(x, M.w * 0.14, 26, M.w * 0.72, M.h * 0.1, 16); x.fill();
                x.fillStyle = '#ff922b';
                K.rr(x, M.w * 0.16, 32, M.w * 0.68, M.h * 0.085, 12); x.fill();
                x.fillStyle = '#fff3bf';
                x.font = 'bold ' + Math.round(M.h * 0.045) + 'px Nunito, Arial';
                x.textAlign = 'center';
                x.textBaseline = 'middle';
                x.fillText('¡GRABA LOS SONIDOS!', w / 2, 32 + M.h * 0.045);

                // Patas.
                x.fillStyle = '#212529';
                x.fillRect(M.w * 0.12, M.h + 8, 36, 28);
                x.fillRect(M.w * 0.82, M.h + 8, 36, 28);
            });
            keep(this.add.image(M.x, M.y, 'cabina_cuerpo').setDepth(5));

            // Interior del cristal.
            var fondo = keep(this.add.graphics().setDepth(6));
            fondo.fillStyle(0x140c22, 1);
            fondo.fillRoundedRect(C.x - C.w / 2, C.y - C.h / 2, C.w, C.h, 16);
            fondo.fillStyle(0x845ef7, 0.16);
            fondo.fillRoundedRect(C.x - C.w / 2, C.y - C.h / 2, C.w, C.h * 0.38, { tl: 16, tr: 16, bl: 0, br: 0 });

            var marco = keep(this.add.graphics().setDepth(7));
            marco.lineStyle(10, 0xffffff, 0.85);
            marco.strokeRoundedRect(C.x - C.w / 2, C.y - C.h / 2, C.w, C.h, 16);
            marco.lineStyle(4, 0xffc078, 0.9);
            marco.strokeRoundedRect(C.x - C.w / 2 + 6, C.y - C.h / 2 + 6, C.w - 12, C.h - 12, 12);

            // Estante interno: alineado con L.estanteY (donde apoyan los discos).
            var rackW = Math.ceil(C.w * 0.86);
            K.textura(this, 'cabina_rack', rackW, 32, function (x, w, h) {
                var g2 = x.createLinearGradient(0, 0, 0, h);
                g2.addColorStop(0, '#d09a5c');
                g2.addColorStop(0.45, '#a06830');
                g2.addColorStop(1, '#6b3f18');
                x.fillStyle = g2;
                K.rr(x, 0, 2, w, h - 4, 8); x.fill();
                x.fillStyle = 'rgba(255,255,255,0.28)';
                x.fillRect(10, 6, w - 20, 5);
                x.fillStyle = 'rgba(0,0,0,0.25)';
                x.fillRect(8, h - 8, w - 16, 4);
            });
            keep(this.add.image(C.x, L.estanteY + 14, 'cabina_rack').setDepth(8));

            // Panel inferior solo del ancho del cristal (bandejas centradas, sin hueco absurdo).
            var panel = keep(this.add.graphics().setDepth(8));
            var pw = C.w * 0.92;
            var ph = L.panel.h * 1.2;
            panel.fillStyle(0x2b1a10, 1);
            panel.fillRoundedRect(C.x - pw / 2, L.panel.y - ph * 0.42, pw, ph, 16);
            panel.lineStyle(4, 0xffe066, 0.55);
            panel.strokeRoundedRect(C.x - pw / 2, L.panel.y - ph * 0.42, pw, ph, 16);

            // Lámpara REC entre las dos bandejas (llena el centro a propósito).
            var rec = keep(this.add.container(C.x, L.panel.y).setDepth(13));
            var recFondo = this.add.circle(0, 0, 22, 0x1a1028).setStrokeStyle(3, 0xffe066);
            var recLed = this.add.circle(0, 0, 10, 0xff6b6b, 0.85);
            rec.add([recFondo, recLed]);
            this.recLed = recLed;
        },

        montarLuces: function (keep) {
            var L = this.L, M = L.maq;
            var y = M.y - M.h * 0.42;
            var n = 14;
            for (var i = 0; i < n; i++) {
                var t = i / (n - 1);
                var x = M.x - M.w * 0.34 + M.w * 0.68 * t;
                var halo = keep(this.add.circle(x, y, 10, 0xffe066, 0.2).setDepth(9));
                var led = keep(this.add.circle(x, y, 5, 0xffd43b, 0.85).setDepth(10));
                this.luces.push(led, halo);
            }
            // Estrellitas del marquee.
            for (var j = 0; j < 7; j++) {
                var sx = M.x - M.w * 0.28 + M.w * 0.56 * (j / 6);
                var sy = M.y - M.h * 0.455;
                var s = keep(this.add.star(sx, sy, 5, 3, 7, 0xffffff, 0.7).setDepth(11));
                this.marquee.push(s);
            }
        },

        montarParlante: function (keep) {
            var P = this.L.parlante;
            var c = keep(this.add.container(P.x, P.y).setDepth(12));
            var aroExt = this.add.circle(0, 0, P.r * 1.45, 0x1a1028).setStrokeStyle(6, 0xffe066);
            var aro = this.add.circle(0, 0, P.r * 1.15, 0x343a40);
            var cono = this.add.circle(0, 0, P.r * 0.85, 0x212529);
            var anillos = this.add.graphics();
            anillos.lineStyle(3, 0x868e96, 0.7);
            for (var r = P.r * 0.35; r < P.r * 0.8; r += P.r * 0.18) {
                anillos.strokeCircle(0, 0, r);
            }
            var centro = this.add.circle(0, 0, P.r * 0.28, 0xff922b);
            var brillo = this.add.circle(-P.r * 0.25, -P.r * 0.25, P.r * 0.18, 0xffffff, 0.35);
            c.add([aroExt, aro, cono, anillos, centro, brillo]);
            this.parlante = c;
            this.parlanteCentro = centro;
        },

        montarOnAir: function (keep) {
            var O = this.L.onair;
            var c = keep(this.add.container(O.x, O.y).setDepth(12));
            var fondo = this.add.rectangle(0, 0, O.w, O.h, 0x1a1028).setStrokeStyle(4, 0xffffff);
            var led = this.add.circle(-O.w * 0.34, 0, 8, 0xff6b6b, 0.35);
            var txt = this.add.text(8, 0, 'ON AIR', {
                fontFamily: 'Nunito, Arial',
                fontSize: Math.round(O.h * 0.48) + 'px',
                fontStyle: 'bold',
                color: '#ffc9c9'
            }).setOrigin(0.5);
            c.add([fondo, led, txt]);
            this.onAir = c;
            this.onAirLed = led;
            this.onAirTxt = txt;
            // Halo que late al escuchar.
            this.onAirHalo = keep(this.add.rectangle(O.x, O.y, O.w + 16, O.h + 14, 0xff6b6b, 0).setDepth(11));
        },

        montarVu: function (keep) {
            var V = this.L.vu;
            var c = keep(this.add.container(V.x, V.y).setDepth(12));
            var fondo = this.add.rectangle(0, 0, V.w, V.h, 0x12081f).setStrokeStyle(3, 0xffc078);
            c.add(fondo);
            this.vuBarras = [];
            var n = 10;
            for (var i = 0; i < n; i++) {
                var bw = V.w / n - 3;
                var col = i > 7 ? 0xff6b6b : (i > 5 ? 0xffe066 : 0x51cf66);
                var b = this.add.rectangle((-V.w / 2) + (i + 0.5) * (V.w / n), 2, bw, V.h * 0.55, col, 0.3);
                c.add(b);
                this.vuBarras.push(b);
            }
            this.vuBox = c;
        },

        montarBandejas: function (keep) {
            var self = this;
            this.bandejaViz = this.L.bandejas.map(function (B, idx) {
                var c = keep(self.add.container(B.x, B.y).setDepth(14));
                // Plato de tocadiscos.
                var plato = self.add.circle(0, 0, Math.min(B.w, B.h) * 0.55, 0x1a1028).setStrokeStyle(5, 0xffe066);
                var aro = self.add.circle(0, 0, Math.min(B.w, B.h) * 0.38, 0x343a40);
                var eje = self.add.circle(0, 0, 10, 0xff922b);
                var luz = self.add.circle(0, 0, Math.min(B.w, B.h) * 0.62, 0x69db7c, 0);
                var num = self.add.text(0, B.h * 0.55, String(idx + 1), {
                    fontFamily: 'Nunito, Arial',
                    fontSize: '18px',
                    fontStyle: 'bold',
                    color: '#ffe066',
                    stroke: '#1a1028',
                    strokeThickness: 4
                }).setOrigin(0.5);
                c.add([luz, plato, aro, eje, num]);
                c.luz = luz;
                c.plato = plato;
                c.aro = aro;
                c.idx = idx;
                // Brazo de aguja (decorativo).
                var brazo = self.add.graphics();
                brazo.lineStyle(5, 0xadb5bd, 1);
                brazo.beginPath();
                brazo.moveTo(B.w * 0.28, -B.h * 0.05);
                brazo.lineTo(B.w * 0.05, -B.h * 0.35);
                brazo.strokePath();
                brazo.fillStyle(0xff6b6b, 1);
                brazo.fillCircle(B.w * 0.05, -B.h * 0.35, 5);
                c.add(brazo);
                c.brazo = brazo;
                return c;
            });
        },

        montarEstante: function (keep) {
            var E = this.L.estante;
            this.huecosEstante = [];
            if (!E) return;
            var g = keep(this.add.graphics().setDepth(3));
            g.fillStyle(0x000000, 0.25);
            g.fillRoundedRect(E.x - E.w / 2 + 6, E.y0 - 6, E.w, E.y1 - E.y0 + 28, 12);
            g.fillStyle(0x5c3a1e, 1);
            g.fillRoundedRect(E.x - E.w / 2, E.y0 - 14, E.w, E.y1 - E.y0 + 28, 12);
            g.fillStyle(0x140c22, 1);
            g.fillRoundedRect(E.x - E.w / 2 + 8, E.y0 - 4, E.w - 16, E.y1 - E.y0 + 8, 8);
            g.lineStyle(3, 0xffe066, 0.5);
            g.strokeRoundedRect(E.x - E.w / 2, E.y0 - 14, E.w, E.y1 - E.y0 + 28, 12);
            for (var i = 0; i < E.n; i++) {
                var t = E.n === 1 ? 0.5 : i / (E.n - 1);
                var y = E.y0 + (E.y1 - E.y0) * t;
                g.fillStyle(0x8d6e4c, 1);
                g.fillRect(E.x - E.w / 2 + 10, y + E.s * 0.38, E.w - 20, 6);
                this.huecosEstante.push({ x: E.x, y: y, libre: true });
            }
        },

        /* ── Discos (vinilo + imagen del elemento) ── */

        crearDisco: function (id, x, y, tam, o) {
            o = o || {};
            var c = this.add.container(x, y).setDepth(o.depth || 20);
            // Radio 0.46·tam → diámetro 0.92·tam (cabe en lugares() con aire).
            var r = tam * 0.46;
            var vinilo = this.add.circle(0, 0, r, 0x212529).setStrokeStyle(4, 0x495057);
            var surcos = this.add.graphics();
            surcos.lineStyle(1.5, 0x495057, 0.55);
            for (var k = 0.3; k < 0.92; k += 0.14) surcos.strokeCircle(0, 0, r * k);
            var centro = this.add.circle(0, 0, r * 0.4, 0xff922b);
            var img = this.add.image(0, 0, 'el_' + id);
            var kImg = (tam * 0.48) / Math.max(img.width, img.height);
            img.setScale(kImg);
            var sombra = this.add.ellipse(0, r * 0.95, tam * 0.62, tam * 0.12, 0x000000, 0.22);
            c.add([sombra, vinilo, surcos, centro, img]);
            var a = { id: id, cont: c, img: img, vinilo: vinilo, sombra: sombra, tam: tam, radio: r, giro: 0 };
            var self = this;
            a.saltito = function (alto, veces) {
                return tw(self, {
                    targets: c, y: c.y - tam * (alto || 0.12),
                    duration: 160, yoyo: true, repeat: (veces || 1) - 1, ease: 'Quad.easeOut'
                });
            };
            a.sacudir = function () {
                return tw(self, {
                    targets: c, angle: { from: -10, to: 10 },
                    duration: 70, yoyo: true, repeat: 3,
                    onComplete: function () { c.angle = 0; }
                });
            };
            a.latir = function () {
                return tw(self, { targets: c, scale: 1.06, duration: 150, yoyo: true, ease: 'Quad.easeOut' });
            };
            a.destruir = function () { c.destroy(); };
            return a;
        },

        ubicarCosas: function () {
            var lug = this.lugares(this.cosas.filter(function (a) { return !a.usada && !a.enBandeja; }).length || this.cosas.length);
            var i = 0;
            this.cosas.forEach(function (a) {
                if (a.usada || a.enBandeja) return;
                if (!lug[i]) return;
                a.casa = { x: lug[i].x, y: lug[i].y };
                a.slot = i;
                a.cont.setPosition(lug[i].x, lug[i].y);
                i += 1;
            });
        },

        setOnAir: function (on) {
            this.onAirLit = !!on;
            if (!this.onAirLed) return;
            this.onAirLed.setFillStyle(0xff6b6b, on ? 1 : 0.3);
            if (this.onAirTxt) this.onAirTxt.setColor(on ? '#ffffff' : '#ffc9c9');
            if (this.onAirHalo) this.onAirHalo.setFillStyle(0xff6b6b, on ? 0.22 : 0);
        },

        pulsarVu: function (nivel) {
            var n = Math.max(0, Math.min(1, nivel == null ? 0.7 : nivel));
            (this.vuBarras || []).forEach(function (b, i) {
                var enc = (i + 0.5) / this.vuBarras.length <= n;
                b.setAlpha(enc ? 1 : 0.25);
                b.setScale(1, enc ? 0.85 + n * 0.55 : 0.55);
            }, this);
        },

        fiestaLuces: function () {
            var self = this;
            (this.luces || []).forEach(function (l, i) {
                self.tweens.add({
                    targets: l,
                    alpha: { from: 1, to: 0.15 },
                    scale: { from: 1.4, to: 0.7 },
                    duration: 120,
                    yoyo: true,
                    repeat: 4,
                    delay: i * 18
                });
            });
        },

        /* ── Contrato MemoriaKit ── */

        prepararNivel: async function () {
            var self = this;
            this.enviando = false;
            this.estado = Log.crear(2);
            this.setOnAir(false);
            this.pulsarVu(0.12);
            (this.bandejaViz || []).forEach(function (b) {
                b.luz.setFillStyle(0x69db7c, 0);
                b.plato.setStrokeStyle(5, 0xffe066);
            });
            await Promise.all(this.cosas.map(function (a) {
                return tw(self, { targets: a.cont, alpha: 0, scale: 0.35, duration: 180 }).then(function () {
                    a.destruir();
                });
            }));
            this.cosas = [];
        },

        alSonar: function () {
            var self = this;
            this.setOnAir(true);
            this.pulsarVu(0.6 + Math.random() * 0.35);
            ruidoCabina('onair', function () { K.tono({ f: 880, dur: 0.08, vol: 0.05 }); });

            this.luces.forEach(function (l, i) {
                self.tweens.add({
                    targets: l,
                    alpha: { from: 1, to: 0.2 },
                    scale: { from: 1.35, to: 0.75 },
                    duration: 110,
                    yoyo: true,
                    delay: i * 22
                });
            });
            (this.marquee || []).forEach(function (s, i) {
                self.tweens.add({
                    targets: s,
                    scale: { from: 1.5, to: 0.6 },
                    alpha: { from: 1, to: 0.25 },
                    duration: 130,
                    yoyo: true,
                    delay: i * 35
                });
            });
            if (this.parlante) {
                this.tweens.add({
                    targets: this.parlante,
                    scale: { from: 1, to: 1.16 },
                    duration: 110,
                    yoyo: true,
                    repeat: 3
                });
            }
            if (this.onAir) {
                this.tweens.add({
                    targets: this.onAir,
                    scale: { from: 1, to: 1.1 },
                    duration: 130,
                    yoyo: true
                });
            }
            // Platos de bandeja giran un poco mientras suena (sin delatar opciones).
            (this.bandejaViz || []).forEach(function (b, i) {
                self.tweens.add({
                    targets: b.aro,
                    angle: 360,
                    duration: 900,
                    ease: 'Linear',
                    delay: i * 40
                });
            });
            if (this.parlante && !Ut.reducido()) {
                Ut.notas(this, this.L.parlante.x, this.L.parlante.y - this.L.parlante.r, 2);
            }
            vibrar(this, 8);
        },

        mostrarOpciones: async function (nv) {
            var self = this;
            var L = this.L;
            this.setOnAir(false);
            this.pulsarVu(0.18);

            var ids = (nv.opciones || []).slice();
            var lug = this.lugares(ids.length);
            var tam = this.tamOpciones(ids.length);
            var techo = L.cristal.y - L.cristal.h * 0.42;

            this.cosas = ids.map(function (id, i) {
                var slot = lug[i] || lug[0];
                var a = self.crearDisco(id, slot.x, techo, tam, { depth: 20 + i * 0.01 });
                a.slot = i;
                a.casa = { x: slot.x, y: slot.y };
                a.enBandeja = false;
                a.cont.setAlpha(0).setScale(0.5).setAngle(rnd(-18, 18));
                a.fase = Math.random() * 6;
                return a;
            });

            await Promise.all(this.cosas.map(function (a, i) {
                return esperar(self, i * 140).then(function () {
                    ruidoCabina('aparece', function () { K.ruido({ f: 700, q: 1.2, dur: 0.08, vol: 0.05 }); });
                    self.tweens.add({ targets: a.cont, alpha: 1, duration: 100 });
                    return tw(self, {
                        targets: a.cont,
                        y: a.casa.y,
                        scale: 1,
                        angle: 0,
                        duration: Ut.reducido() ? 200 : 560,
                        ease: 'Bounce.easeOut'
                    }).then(function () {
                        Ut.estallido(self, a.casa.x, a.casa.y + a.radio * 0.9, {
                            n: 4, tex: 'estrella', tam: 11, dist: 30, sinTinte: true, depth: 30
                        });
                        a.latir();
                    });
                });
            }));
        },

        discoEn: function (x, y) {
            return this.cosaEn(
                this.cosas.filter(function (a) { return !a.usada && !a.enBandeja; }),
                x, y, null
            );
        },

        alTocar: function (p) {
            if (this.fase !== 'jugar' || this.enviando || this.sonando) return;
            this.pista.reiniciar();
            var a = this.discoEn(p.x, p.y);
            if (a) this.enviar(a);
        },

        enviar: async function (a) {
            if (!a || this.enviando || a.usada || a.enBandeja) return;
            if (this.fase !== 'jugar') return;
            if (Log.contiene(this.estado, a.id)) return;

            var occ = Log.ocupar(this.estado, a.id);
            if (!occ.ok) return;

            this.enviando = true;
            var B = this.L.bandejas[occ.indice];
            var dest = { x: B.x, y: B.y - 4 };
            var rackCasa = { x: a.casa.x, y: a.casa.y };

            ruidoCabina('vuela', function () { K.tono({ f: 480, dur: 0.1, vol: 0.05 }); });
            a.cont.setDepth(55);
            vibrar(this, 14);

            // Destacar bandeja destino.
            if (this.bandejaViz[occ.indice]) {
                this.tweens.add({
                    targets: this.bandejaViz[occ.indice].luz,
                    fillAlpha: 0.35,
                    duration: 160
                });
            }

            // Vuelo en arco + giro de vinilo.
            this.tweens.add({
                targets: a.cont,
                angle: a.cont.angle + 360,
                duration: Ut.reducido() ? 220 : 480,
                ease: 'Linear'
            });
            await this.saltarA(a.cont, dest.x, dest.y, {
                ms: Ut.reducido() ? 220 : 500,
                alto: this.L.tam * 0.85,
                esc: 0.9
            });
            if (!this.sigue()) { this.enviando = false; return; }

            var r = await this.marcar(a.id, dest);
            if (r === 'mal') {
                a.casa = rackCasa;
                await this.eyectar(a, occ.indice);
                this.enviando = false;
                return;
            }

            a.enBandeja = true;
            a.usada = true;
            a.bandeja = occ.indice;
            a.casa = dest;
            a.cont.setDepth(22).setAngle(0).setScale(0.9);
            ruidoCabina('encaja', function () { K.tono({ f: 720, dur: 0.07, vol: 0.05 }); });
            if (this.bandejaViz[occ.indice]) {
                this.bandejaViz[occ.indice].luz.setFillStyle(0x69db7c, 0.55);
                this.bandejaViz[occ.indice].plato.setStrokeStyle(6, 0x69db7c);
                this.cameras.main.shake(80, 0.002);
            }
            if (this.reunidos.indexOf(a.id) < 0) this.reunidos.push(a.id);
            Ut.estallido(this, dest.x, dest.y, {
                n: 8, tex: 'estrella', tam: 14, dist: 50, sinTinte: true, depth: 40
            });
            await a.saltito(0.2, 2);
            this.enviando = false;
        },

        eyectar: async function (a, indice) {
            Log.liberar(this.estado, a.id);
            if (this.bandejaViz[indice]) {
                this.bandejaViz[indice].luz.setFillStyle(0xff6b6b, 0.55);
                this.bandejaViz[indice].plato.setStrokeStyle(5, 0xff6b6b);
                var luz = this.bandejaViz[indice].luz;
                var plato = this.bandejaViz[indice].plato;
                this.tweens.add({
                    targets: luz, fillAlpha: 0, duration: 400,
                    onComplete: function () { plato.setStrokeStyle(5, 0xffe066); }
                });
            }
            ruidoCabina('eyecta', function () { K.ruido({ f: 200, q: 1, dur: 0.14, vol: 0.09 }); });
            vibrar(this, [25, 40, 25]);
            a.sacudir();
            var casa = a.casa || this.lugares(Math.max(1, this.cosas.length))[a.slot | 0] || this.lugares(1)[0];
            this.tweens.add({
                targets: a.cont,
                angle: a.cont.angle - 280,
                duration: Ut.reducido() ? 240 : 520,
                ease: 'Quad.easeOut'
            });
            await this.saltarA(a.cont, casa.x, casa.y, {
                ms: Ut.reducido() ? 240 : 520,
                alto: this.L.tam * 0.55,
                esc: 1
            });
            a.cont.setDepth(20).setAngle(0);
            a.enBandeja = false;
            a.usada = false;
            a.casa = { x: casa.x, y: casa.y };
        },

        alAcertar: async function () {
            ruidoCabina('celebrar', function () { K.tono({ f: 660, dur: 0.14, vol: 0.06 }); });
            this.fiestaLuces();
            this.setOnAir(true);
            this.pulsarVu(1);
            (this.bandejaViz || []).forEach(function (b) {
                b.luz.setFillStyle(0xffe066, 0.7);
                b.plato.setStrokeStyle(6, 0xffe066);
            });
            var self = this;
            this.cosas.filter(function (c) { return c.enBandeja; }).forEach(function (c, i) {
                self.time.delayedCall(i * 100, function () {
                    if (c.cont.active) {
                        c.saltito(0.28, 3);
                        self.tweens.add({ targets: c.cont, angle: 720, duration: 700, ease: 'Cubic.easeOut' });
                    }
                });
            });
            Ut.estallido(this, this.L.cristal.x, this.L.cristal.y, {
                n: 18, tex: 'estrella', tam: 24, dist: 170, sinTinte: true, depth: 70
            });
            Ut.confeti(this, 28);
            await esperar(this, 650);
        },

        alFallar: async function () {
            if (this.parlante) {
                var p = this.parlante;
                this.tweens.add({
                    targets: p,
                    angle: { from: -10, to: 10 },
                    duration: 55,
                    yoyo: true,
                    repeat: 4,
                    onComplete: function () { p.angle = 0; }
                });
            }
            this.cameras.main.shake(100, 0.004);
        },

        alTerminarNivel: async function () {
            var self = this;
            var enBandeja = this.cosas.filter(function (a) { return a.enBandeja; });
            var resto = this.cosas.filter(function (a) { return !a.enBandeja; });
            await this.retirar(resto);

            if (this.L.estante && enBandeja.length) {
                var hueco = this.huecosEstante.filter(function (h) { return h.libre; })[0];
                if (hueco) {
                    hueco.libre = false;
                    var tam = this.L.estante.s;
                    for (var i = 0; i < enBandeja.length; i++) {
                        var a = enBandeja[i];
                        var x = hueco.x + (i - (enBandeja.length - 1) / 2) * tam * 0.55;
                        await this.saltarA(a.cont, x, hueco.y, {
                            ms: 420, alto: this.L.tam * 0.5, esc: tam / a.tam
                        });
                        a.cont.setDepth(5);
                        this.paresEstante.push(a);
                    }
                    this.cosas = this.cosas.filter(function (c) {
                        return self.paresEstante.indexOf(c) < 0;
                    });
                } else {
                    await this.retirar(enBandeja);
                }
            } else {
                await this.retirar(enBandeja);
            }

            this.cosas = [];
            this.estado = Log.crear(2);
            (this.bandejaViz || []).forEach(function (b) {
                b.luz.setFillStyle(0x69db7c, 0);
                b.plato.setStrokeStyle(5, 0xffe066);
            });
            this.setOnAir(false);
            this.enviando = false;
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando || this.enviando) return Promise.resolve();
            var ok = this.cosas.filter(function (c) {
                return !c.usada && !c.enBandeja && self.respuestas().indexOf(c.id) >= 0;
            })[0];
            if (!ok) return Promise.resolve();
            var idx = Log.indiceLibre(this.estado);
            var B = this.L.bandejas[idx >= 0 ? idx : 0];
            return this.ctx.mano({
                punto: { x: ok.cont.x, y: ok.cont.y },
                holdMs: 240,
                arrastre: { dx: B.x - ok.cont.x, dy: B.y - ok.cont.y, durMs: 700 },
                cancelado: function () { return cancelada() || self.fase !== 'jugar'; }
            });
        },

        demoPaso: function () {
            var self = this;
            var ok = this.correctaDe(this.cosas.filter(function (c) { return !c.enBandeja; }));
            if (!ok) return null;
            return {
                desde: { x: ok.cont.x, y: ok.cont.y },
                mantener: 300,
                hacer: function () { return self.enviar(ok); }
            };
        },

        salirDemo: function () {
            if (this.ctx.quitarMano) this.ctx.quitarMano();
            this.fase = 'intro';
            this.nv = null;
            this.marcadas = [];
            this.paso = 0;
            this.errores = 0;
            this.enviando = false;
            this.pista.parar();
            this.reunidos = [];
            this.estado = Log.crear(2);
            this.cosas.forEach(function (a) { a.destruir(); });
            this.cosas = [];
            this.paresEstante.forEach(function (a) { a.destruir(); });
            this.paresEstante = [];
            (this.huecosEstante || []).forEach(function (h) { h.libre = true; });
            (this.bandejaViz || []).forEach(function (b) {
                b.luz.setFillStyle(0x69db7c, 0);
                b.plato.setStrokeStyle(5, 0xffe066);
            });
            this.setOnAir(false);
        },

        escenaFinal: async function () {
            var L = this.L;
            var vistos = {};
            var ids = this.reunidos.filter(function (id) {
                if (vistos[id]) return false;
                vistos[id] = 1;
                return true;
            });
            var n = ids.length;
            var tam = Math.min(L.tam * 0.95, L.W / Math.max(4, n) * 0.65);
            for (var i = 0; i < n; i++) {
                var x = L.cristal.x - L.cristal.w * 0.3 + L.cristal.w * 0.6 * ((i + 0.5) / Math.max(1, n));
                var y = L.cristal.y;
                var a = this.crearDisco(ids[i], L.maq.x, L.panel.y, tam, { depth: 60 });
                a.cont.setScale(0.35);
                await this.saltarA(a.cont, x, y, { ms: 420, alto: L.tam * 0.7, esc: 1 });
                this.sonar(ids[i], { breve: true, bocina: false });
                this.tweens.add({ targets: a.cont, angle: 360, duration: 500 });
                a.saltito(0.22, 2);
                await esperar(this, 280);
                if (!this.sigue()) return;
            }
            this.setOnAir(true);
            this.pulsarVu(1);
            this.fiestaLuces();
            ruidoCabina('celebrar');
            Ut.confeti(this, 70);
            Ut.estallido(this, L.cristal.x, L.cristal.y, {
                n: 22, tex: 'estrella', tam: 26, dist: 210, sinTinte: true, depth: 75
            });
            await esperar(this, 1200);
        },

        estadoExtra: function () {
            return {
                bandejas: Log.ids(this.estado),
                cosas: this.cosas.filter(function (a) { return !a.usada; }).map(function (a) {
                    return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y) };
                })
            };
        },

        paso: function (time) {
            // Cadena de LEDs.
            if (this.luces && this.luces.length) {
                var nL = this.luces.length;
                var cabeza = (time / (this.fase === 'jugar' || this.sonando ? 85 : 160)) % nL;
                this.luces.forEach(function (l, i) {
                    if (i % 2 === 1) {
                        l.setAlpha(0.08 + 0.12 * Math.sin(time / 300 + i));
                        return;
                    }
                    var d = Math.min(Math.abs(i - cabeza), nL - Math.abs(i - cabeza));
                    l.setAlpha(d < 2 ? 1 : 0.28);
                });
            }
            (this.marquee || []).forEach(function (s, i) {
                s.setAlpha(0.45 + Math.sin(time / 180 + i * 0.6) * 0.5);
                s.angle = Math.sin(time / 350 + i) * 14;
            });

            if (this.recLed) {
                this.recLed.setAlpha(0.45 + 0.5 * Math.sin(time / 220));
                this.recLed.setScale(0.9 + 0.15 * Math.sin(time / 220));
            }

            if (this.sonando || this.onAirLit) {
                this.pulsarVu(0.4 + 0.55 * (0.5 + 0.5 * Math.sin(time / 80)));
                if (this.parlante) {
                    var s = 1 + Math.sin(time / 65) * 0.055;
                    this.parlante.setScale(s);
                }
                if (this.onAirLed) this.onAirLed.setAlpha(0.5 + 0.5 * Math.sin(time / 110));
                if (this.onAirHalo) this.onAirHalo.setAlpha(0.12 + 0.18 * Math.sin(time / 110));
            } else if (this.parlante) {
                this.parlante.setScale(1 + Math.sin(time / 600) * 0.015);
            }

            // Idle suave: no desplazar X; Y mínimo para no “bailar” fuera del estante.
            this.cosas.forEach(function (a) {
                if (!a.casa || a.enBandeja || a.usada) return;
                if (this.tweens.isTweening(a.cont)) return;
                a.fase = (a.fase || 0) + 0.028;
                a.cont.x = a.casa.x;
                a.cont.y = a.casa.y + Math.sin(a.fase) * 2;
                a.cont.angle = Math.sin(a.fase * 0.5) * 3;
            }, this);

            if (this.fase === 'jugar') {
                (this.bandejaViz || []).forEach(function (b, i) {
                    if (Log.ids(this.estado).length > i) return;
                    b.setScale(1 + Math.sin(time / 280 + i) * 0.025);
                }, this);
            }
        }
    };

    K.crear({ id: 'cabina', fondo: '#2b1d4e', escena: escena });
})(typeof window !== 'undefined' ? window : this);
