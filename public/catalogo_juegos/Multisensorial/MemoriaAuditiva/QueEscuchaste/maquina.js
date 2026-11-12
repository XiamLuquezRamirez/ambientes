/**
 * «La máquina del centro comercial» — motor propio de ¿Qué escuchaste? (3-4 años).
 *
 * Máquina de peluches en el mall. Mientras suena, las luces y el letrero parpadean (sin delatar).
 * Luego caen los objetos (de peluche) sobre la montaña de peluches de relleno. El niño mueve el gancho (joystick, flechas mantenidas o
 * tocando el cristal) y pulsa ATRAPAR, o toca el objeto para que el gancho vaya y baje solo.
 * Si acierta, el gancho cierra, sube el premio y lo suelta en el cajón. Si no, abre y suelta.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var rnd = Ut.rnd;

    /**
     * Efecto del tema de audio "maquina" (PedniaAudio + Howler, sin pitidos; lo engancha script.js).
     * Si el tema no está disponible suena el respaldo original (si lo hay).
     */
    function ruidoMaq(nombre, respaldo, opts) {
        if (global.QueEscuchasteSfx && global.QueEscuchasteSfx(nombre, opts)) return;
        if (respaldo) respaldo();
    }

    /**
     * Vibración corta en la tablet (si el equipo y la app lo permiten; en PC no hace nada).
     * No vibra en la demostración ni antes de que el niño haya tocado la pantalla (Chrome lo bloquea).
     */
    function vibrar(scene, patron) {
        if (Ut.reducido()) return;
        if (scene && scene.ctx && scene.ctx.enDemo && scene.ctx.enDemo()) return;
        var nav = global.navigator;
        if (nav && nav.userActivation && !nav.userActivation.hasBeenActive) return;
        try {
            if (global.navigator && typeof global.navigator.vibrate === 'function') global.navigator.vibrate(patron);
        } catch (e) { /* noop */ }
    }

    /** Distancia del pivote de las pinzas (centro del carrito, donde termina el cable) al origen del gancho. */
    var PIVOTE = 46;

    var escena = {
        iniciar: function () {
            this.cosas = [];
            this.ganados = [];
            this.reunidos = [];
            this.ganchoX = 0.5;
            this.bajando = false;
            this.joyDir = 0;
            this.luces = [];
            this.marquee = [];
            this.pedestales = [];
            this.bolas = [];
            this.huecos = [];
            this.colgado = null;
            this.swing = { a: 0, v: 0, xPrev: null, vx: 0 };
            this.nivelSuave = 0;
            this.ultMotor = 0;
            this.ultNota = 0;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            L.pres = null;
            L.der = W - 16;
            // Tablet / PC landscape: gabinete ancho y dominante (no se optimiza para móvil).
            var mw = Math.min(W * 0.72, 1100);
            var mh = Math.min(H * 0.88, 920);
            L.maq = { x: W / 2, y: H * 0.5, w: mw, h: mh };
            var M = L.maq;
            L.cristal = {
                x: M.x,
                y: M.y - M.h * 0.08,
                w: M.w * 0.72,
                h: M.h * 0.48
            };
            L.panel = { y: M.y + M.h * 0.32, h: M.h * 0.18 };
            // La salida va pegada a la pared izquierda del cristal: así los objetos de la derecha
            // ya no la tapan (antes el primero, p. ej. el elefante, quedaba encima de la rampa).
            L.salida = {
                x: L.cristal.x - L.cristal.w * 0.4,
                y: L.cristal.y + L.cristal.h * 0.3,
                w: L.cristal.w * 0.12,
                h: L.cristal.h * 0.32
            };
            L.premio = {
                x: M.x - M.w * 0.26,
                y: M.y + M.h * 0.45,
                w: M.w * 0.26,
                h: M.h * 0.1
            };
            var pr = Math.min(58, M.w * 0.06);
            L.joy = { x: M.x - M.w * 0.16, y: L.panel.y + 6, r: pr };
            L.btn = { x: M.x + M.w * 0.2, y: L.panel.y + 6, r: Math.min(64, M.w * 0.07) };
            L.flechaL = { x: L.joy.x - L.joy.r * 1.95, y: L.joy.y, r: L.joy.r * 0.58 };
            L.flechaR = { x: L.joy.x + L.joy.r * 1.95, y: L.joy.y, r: L.joy.r * 0.58 };
            L.rielY = L.cristal.y - L.cristal.h * 0.44;
            L.pisoY = L.cristal.y + L.cristal.h * 0.36;
            L.tam = Math.max(96, Math.min(168, L.cristal.w / 3.4, L.cristal.h * 0.4));
            L.bocina = { x: M.x - M.w * 0.4, y: M.y - M.h * 0.38, r: 28 };
            // Altavoz de la máquina (esquina opuesta a la oreja): late al ritmo real del sonido.
            L.altavoz = { x: M.x + M.w * 0.4, y: M.y - M.h * 0.38, r: 30 };
            // Vitrina de premios en la pared del mall, a la izquierda de la máquina (4 repisas).
            var libre = M.x - M.w / 2 - 12;
            var vy0 = Math.max(H * 0.17, 96);
            var vy1 = Math.min(H * 0.86, M.y + M.h * 0.42);
            var vs = Math.min(libre * 0.78, (vy1 - vy0) / 4 * 0.82);
            // (El mueble suma 8 px de marco a cada lado: no debe tocar la máquina ni salirse de la pantalla.)
            L.vitrina = vs >= 56 ? { x: libre / 2 + 2, y0: vy0, y1: vy1, s: vs, n: 4, w: Math.min(libre - 28, vs * 1.3) } : null;
            return L;
        },

        /** Tamaño de las opciones para que quepan entre la salida y la pared derecha del cristal. */
        tamOpciones: function (n) {
            var L = this.L;
            var ancho = (L.cristal.x + L.cristal.w * 0.42) - (L.salida.x + L.salida.w / 2 + 6);
            return Math.min(L.tam, ancho / Math.max(3, n) * 0.95);
        },

        armar: function (reubicar) {
            var self = this;
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            // La cámara vuelve a su sitio (por si cambió el tamaño en pleno acercamiento).
            var cam = this.cameras.main;
            cam.setBounds(0, 0, L.W, L.H);
            cam.setZoom(1);
            cam.centerOn(L.W / 2, L.H / 2);
            this.montarMall(keep);
            this.montarVitrina(keep);
            this.montarMaquina(keep);
            this.sembrarBolas(keep);
            this.sembrarRellenos(keep);
            this.montarControles(keep);
            this.montarGancho(keep);
            this.sembrarMotes(keep, 22, { x: 0, y: 0, w: L.W, h: L.H * 0.35, depth: 2 }, 0xffe066);
            // (Sin el niño plano junto a la máquina: tapaba los botones de accesibilidad.)
            this.montarHud(keep);
            this.bajarEstrellas();
            this.montarAltavoz(keep);
            if (reubicar) {
                this.ubicarCosas();
                this.ponerGancho(this.ganchoX, false);
                this.ganados.forEach(function (a, k) { self.aVitrina(a, k, false); });
            }
        },

        /**
         * Las 4 estrellas de nivel del kit van en la esquina superior derecha, donde quedan tapadas por
         * los botones de reiniciar y salir (HTML encima del lienzo): se bajan justo debajo de ellos.
         */
        bajarEstrellas: function () {
            var est = this.estrellas || [];
            if (!est.length) return;
            var L = this.L;
            var bajo = 84;
            try {
                var nav = global.document.querySelector('.hud-nav');
                var lienzo = this.game.canvas.getBoundingClientRect();
                if (nav && lienzo.height) {
                    var r = nav.getBoundingClientRect();
                    if (r.height) bajo = (r.bottom - lienzo.top) * (L.H / lienzo.height);
                }
            } catch (e) { /* noop */ }
            var y0 = est[0].y;
            var dy = Math.max(0, bajo + 12 + est[0].displayHeight / 2 - y0);
            if (!dy) return;
            est.forEach(function (e) { e.y += dy; });
            // El fondo oscuro de las estrellas (lo crea el kit sin guardarlo): el rectángulo de esa fila.
            (this.estaticos || []).forEach(function (o) {
                if (o && o.type === 'Rectangle' && o.depth === 79 && Math.abs(o.y - y0) < 2) o.y += dy;
            });
        },

        /* ── Vitrina de premios (pared del mall) ── */

        slotVitrina: function (k) {
            var V = this.L.vitrina;
            var i = k % V.n;
            return { x: V.x, y: V.y0 + (i + 0.5) * (V.y1 - V.y0) / V.n };
        },

        montarVitrina: function (keep) {
            var V = this.L.vitrina;
            this.huecos = [];
            if (!V) return;
            var self = this;
            var x0 = V.x - V.w / 2, top = V.y0 - 30, alto = V.y1 - V.y0 + 44;
            var g = keep(this.add.graphics().setDepth(3));
            // Mueble de madera con fondo oscuro de exhibición.
            g.fillStyle(0x000000, 0.22);
            g.fillRoundedRect(x0 - 4, top + 8, V.w + 16, alto, 16);
            g.fillStyle(0x8c5a2b, 1);
            g.fillRoundedRect(x0 - 8, top, V.w + 16, alto, 16);
            g.fillStyle(0x2b2f52, 1);
            g.fillRoundedRect(x0, top + 22, V.w, alto - 30, 10);
            g.fillStyle(0x4c6ef5, 0.16);
            g.fillRoundedRect(x0, top + 22, V.w, (alto - 30) * 0.4, { tl: 10, tr: 10, bl: 0, br: 0 });
            // Letrero con tres estrellas.
            g.fillStyle(0xffd43b, 1);
            g.fillRoundedRect(x0 + V.w * 0.12, top + 3, V.w * 0.76, 16, 6);
            for (var e = 0; e < 3; e++) {
                g.fillStyle(0xe03131, 1);
                g.fillPoints(this.puntosEstrella(x0 + V.w * (0.3 + e * 0.2), top + 11, 6, 2.6), true);
            }
            // Repisas.
            for (var i = 0; i < V.n; i++) {
                var s = this.slotVitrina(i);
                var yr = s.y + V.s * 0.44;
                g.fillStyle(0xd9a066, 1);
                g.fillRect(x0 - 2, yr, V.w + 4, 9);
                g.fillStyle(0x8c5a2b, 1);
                g.fillRect(x0 - 2, yr + 9, V.w + 4, 3);
                // Luz suave detrás de cada premio.
                g.fillStyle(0xfff3bf, 0.07);
                g.fillCircle(s.x, s.y, V.s * 0.5);
                g.fillStyle(0xfff3bf, 0.06);
                g.fillCircle(s.x, s.y, V.s * 0.34);
            }
            // Reflejo del vidrio.
            g.fillStyle(0xffffff, 0.07);
            g.fillRect(x0 + V.w * 0.08, top + 26, V.w * 0.14, alto - 40);
            // Huecos vacíos: círculo punteado que se apaga cuando llega el premio.
            for (var k = 0; k < V.n; k++) {
                var q = this.slotVitrina(k);
                var h = keep(this.add.graphics().setDepth(3.2));
                var r = V.s * 0.36;
                for (var a = 0; a < 12; a++) {
                    var a0 = a / 12 * Math.PI * 2;
                    h.lineStyle(3, 0xffffff, 0.3);
                    h.beginPath();
                    h.arc(q.x, q.y, r, a0, a0 + Math.PI / 12);
                    h.strokePath();
                }
                h.fillStyle(0xffffff, 0.14);
                h.fillPoints(this.puntosEstrella(q.x, q.y, r * 0.42, r * 0.18), true);
                this.huecos.push(h);
            }
            this.ganados.forEach(function (a, n) {
                var hk = self.huecos[n % V.n];
                if (hk) hk.setVisible(false);
            });
        },

        puntosEstrella: function (cx, cy, R, r) {
            var pts = [];
            for (var i = 0; i < 10; i++) {
                var ang = -Math.PI / 2 + i * Math.PI / 5;
                var rr = i % 2 ? r : R;
                pts.push({ x: cx + Math.cos(ang) * rr, y: cy + Math.sin(ang) * rr });
            }
            return pts;
        },

        /**
         * Lleva un premio a su repisa. animar: vuelo en arco desde donde esté (el cajón).
         * Sin espacio para la vitrina (pantalla angosta) el premio se queda en el cajón, como antes.
         */
        aVitrina: async function (c, k, animar) {
            var V = this.L.vitrina;
            if (!V) {
                var d = this.meterPremio(c, k, animar);
                if (d) await tw(this, { targets: c.cont, x: d.x, y: d.y, scale: d.esc, duration: 300, ease: 'Sine.easeOut' });
                return;
            }
            var s = this.slotVitrina(k);
            var esc = (V.s * 0.8) / c.tam;
            var hueco = this.huecos[k % V.n];
            if (!animar) {
                c.cont.setPosition(s.x, s.y).setScale(esc).setAngle(0).setDepth(3.5);
                if (hueco) hueco.setVisible(false);
                return;
            }
            c.cont.setDepth(60);
            ruidoMaq('vuelo');
            await Ut.volarA(this, c.cont, s.x, s.y, 680, esc, null, 150);
            if (!c.cont.active) return;
            c.cont.setDepth(3.5);
            if (hueco) hueco.setVisible(false);
            ruidoMaq('vitrina');
            Ut.estallido(this, s.x, s.y, { n: 8, tex: 'estrella', tam: 16, dist: V.s * 0.75, sinTinte: true, depth: 61 });
            await tw(this, { targets: c.cont, scale: esc * 1.18, duration: 140, yoyo: true, ease: 'Quad.easeOut' });
        },

        /* ── Mall ── */

        montarMall: function (keep) {
            var L = this.L;
            K.textura(this, 'maq_mall', L.W, L.H, function (x, w, h) {
                var cielo = x.createLinearGradient(0, 0, 0, h);
                cielo.addColorStop(0, '#1b3a5f');
                cielo.addColorStop(0.45, '#3d5a80');
                cielo.addColorStop(0.62, '#e9ecef');
                cielo.addColorStop(1, '#ced4da');
                x.fillStyle = cielo;
                x.fillRect(0, 0, w, h);

                // Techo del mall con luces.
                x.fillStyle = '#0b1a3a';
                x.fillRect(0, 0, w, h * 0.14);
                for (var i = 0; i < 14; i++) {
                    var lx = 40 + i * (w / 13);
                    x.fillStyle = 'rgba(255,224,102,0.15)';
                    x.beginPath();
                    x.moveTo(lx, h * 0.1);
                    x.lineTo(lx - 50, h * 0.55);
                    x.lineTo(lx + 50, h * 0.55);
                    x.closePath();
                    x.fill();
                    x.fillStyle = '#ffe066';
                    x.beginPath();
                    x.arc(lx, h * 0.1, 6, 0, Math.PI * 2);
                    x.fill();
                }

                // Tiendas con letreros y gente.
                var colores = ['#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c', '#b197fc', '#ff922b', '#20c997'];
                for (var t = 0; t < 7; t++) {
                    var tx = w * (t * 0.14 + 0.02), tw = w * 0.13, th = h * (0.2 + (t % 3) * 0.035);
                    var ty = h * 0.58 - th;
                    x.fillStyle = '#212529';
                    K.rr(x, tx - 4, ty - 8, tw + 8, th + 12, 6); x.fill();
                    x.fillStyle = colores[t];
                    K.rr(x, tx, ty, tw, th, 6); x.fill();
                    x.fillStyle = 'rgba(255,255,255,0.65)';
                    K.rr(x, tx + 8, ty + 16, tw - 16, th * 0.38, 5); x.fill();
                    x.fillStyle = '#ffe066';
                    K.rr(x, tx + tw * 0.15, ty - 22, tw * 0.7, 18, 4); x.fill();
                    x.fillStyle = '#343a40';
                    x.fillRect(tx + tw * 0.38, ty + th * 0.62, tw * 0.24, th * 0.38);
                    // Siluetas.
                    x.fillStyle = 'rgba(20,20,40,0.55)';
                    x.beginPath();
                    x.ellipse(tx + tw * 0.25, h * 0.58 - 18, 8, 18, 0, 0, Math.PI * 2);
                    x.fill();
                    x.beginPath();
                    x.ellipse(tx + tw * 0.75, h * 0.58 - 14, 7, 14, 0, 0, Math.PI * 2);
                    x.fill();
                }

                // Piso brillante con reflejo.
                var piso = x.createLinearGradient(0, h * 0.58, 0, h);
                piso.addColorStop(0, '#dee2e6');
                piso.addColorStop(0.15, '#f1f3f5');
                piso.addColorStop(1, '#adb5bd');
                x.fillStyle = piso;
                x.fillRect(0, h * 0.58, w, h * 0.42);
                x.fillStyle = 'rgba(255,255,255,0.45)';
                x.fillRect(0, h * 0.58, w, 8);
                x.strokeStyle = 'rgba(255,255,255,0.25)';
                x.lineWidth = 2;
                for (var yy = h * 0.62; yy < h; yy += 36) {
                    x.beginPath();
                    x.moveTo(0, yy);
                    x.lineTo(w, yy);
                    x.stroke();
                }

                // Palmeras en macetas.
                [[0.06, 0.58], [0.94, 0.58]].forEach(function (p) {
                    var px = w * p[0], py = h * p[1];
                    x.fillStyle = '#e8590c';
                    K.rr(x, px - 22, py - 4, 44, 28, 6); x.fill();
                    x.fillStyle = '#8c5a2b';
                    x.fillRect(px - 7, py - 70, 14, 70);
                    x.fillStyle = '#2f9e44';
                    for (var k = 0; k < 6; k++) {
                        var a = -Math.PI / 2 + (k - 2.5) * 0.4;
                        x.beginPath();
                        x.moveTo(px, py - 70);
                        x.quadraticCurveTo(px + Math.cos(a) * 50, py - 95 + Math.sin(a) * 20, px + Math.cos(a) * 85, py - 70 + Math.sin(a) * 25);
                        x.lineTo(px, py - 70);
                        x.fill();
                    }
                });
            });
            keep(this.add.image(0, 0, 'maq_mall').setOrigin(0, 0).setDepth(0));
            // Sombra de la máquina.
            var sombra = keep(this.add.ellipse(L.maq.x, L.maq.y + L.maq.h * 0.48, L.maq.w * 0.85, 48, 0x000000, 0.28).setDepth(1));
            this.sombraMaq = sombra;
        },

        /* ── Gabinete ── */

        montarMaquina: function (keep) {
            var self = this;
            var L = this.L, M = L.maq, C = L.cristal;

            K.textura(this, 'maq_cuerpo', Math.ceil(M.w + 60), Math.ceil(M.h + 60), function (x, w, h) {
                // Sombra interna / volumen.
                x.fillStyle = 'rgba(0,0,0,0.25)';
                K.rr(x, 28, 28, M.w, M.h, 40); x.fill();

                var g = x.createLinearGradient(0, 20, M.w, h);
                g.addColorStop(0, '#9775fa');
                g.addColorStop(0.35, '#7950f2');
                g.addColorStop(0.7, '#6741d9');
                g.addColorStop(1, '#5f3dc4');
                x.fillStyle = g;
                K.rr(x, 20, 20, M.w, M.h, 38); x.fill();

                // Marco cromado amarillo.
                x.strokeStyle = '#ffe066';
                x.lineWidth = 22;
                K.rr(x, 30, 30, M.w - 20, M.h - 20, 30); x.stroke();
                x.strokeStyle = '#fab005';
                x.lineWidth = 8;
                K.rr(x, 42, 42, M.w - 44, M.h - 44, 24); x.stroke();

                // Brillo lateral.
                var brillo = x.createLinearGradient(20, 0, 80, 0);
                brillo.addColorStop(0, 'rgba(255,255,255,0.28)');
                brillo.addColorStop(1, 'rgba(255,255,255,0)');
                x.fillStyle = brillo;
                K.rr(x, 26, 40, 50, M.h - 50, 20); x.fill();

                // Letrero marquee.
                x.fillStyle = '#212529';
                K.rr(x, M.w * 0.14, 26, M.w * 0.72, M.h * 0.11, 18); x.fill();
                x.fillStyle = '#ffd43b';
                K.rr(x, M.w * 0.16, 32, M.w * 0.68, M.h * 0.095, 14); x.fill();
                x.fillStyle = '#e03131';
                x.font = 'bold ' + Math.round(M.h * 0.05) + 'px Nunito, Arial';
                x.textAlign = 'center';
                x.textBaseline = 'middle';
                x.fillText('¡ATRÁPALO!', w / 2, 32 + M.h * 0.048);

                // Patas.
                x.fillStyle = '#343a40';
                x.fillRect(M.w * 0.12, M.h + 8, 36, 28);
                x.fillRect(M.w * 0.82, M.h + 8, 36, 28);
            });
            keep(this.add.image(M.x, M.y, 'maq_cuerpo').setDepth(5));

            // Interior oscuro del cristal.
            var fondoCristal = keep(this.add.graphics().setDepth(6));
            fondoCristal.fillStyle(0x1c2541, 1);
            fondoCristal.fillRoundedRect(C.x - C.w / 2, C.y - C.h / 2, C.w, C.h, 16);
            // Gradiente de luz superior.
            fondoCristal.fillStyle(0x4c6ef5, 0.18);
            fondoCristal.fillRoundedRect(C.x - C.w / 2, C.y - C.h / 2, C.w, C.h * 0.35, { tl: 16, tr: 16, bl: 0, br: 0 });

            // Marco del cristal.
            var marco = keep(this.add.graphics().setDepth(7));
            marco.lineStyle(10, 0xffffff, 0.85);
            marco.strokeRoundedRect(C.x - C.w / 2, C.y - C.h / 2, C.w, C.h, 16);
            marco.lineStyle(4, 0xadb5bd, 0.9);
            marco.strokeRoundedRect(C.x - C.w / 2 + 6, C.y - C.h / 2 + 6, C.w - 12, C.h - 12, 12);

            // Piso de pelotas.
            K.textura(this, 'maq_piso', Math.ceil(C.w), Math.ceil(C.h * 0.32), function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#343a40');
                g.addColorStop(1, '#212529');
                x.fillStyle = g;
                x.fillRect(0, 0, w, h);
                var cols = ['#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c', '#cc5de8', '#ff922b', '#20c997', '#f783ac'];
                for (var i = 0; i < 70; i++) {
                    var bx = (i * 53 + 11) % (w - 12) + 6;
                    var by = 10 + ((i * 29) % (h - 16));
                    var r = 8 + (i % 5);
                    x.fillStyle = cols[i % cols.length];
                    x.beginPath(); x.arc(bx, by, r, 0, Math.PI * 2); x.fill();
                    x.fillStyle = 'rgba(255,255,255,0.5)';
                    x.beginPath(); x.arc(bx - r * 0.3, by - r * 0.3, r * 0.3, 0, Math.PI * 2); x.fill();
                }
            });
            keep(this.add.image(C.x, L.pisoY, 'maq_piso').setOrigin(0.5, 0).setDepth(8));

            // Puerta de salida (agujero bajo, no una barra vertical).
            var S = L.salida;
            var chute = keep(this.add.graphics().setDepth(9));
            chute.fillStyle(0x868e96, 1);
            chute.fillRoundedRect(S.x - S.w / 2 - 6, S.y - S.h / 2 - 6, S.w + 12, S.h + 12, 12);
            chute.fillStyle(0x0b132b, 1);
            chute.fillRoundedRect(S.x - S.w / 2, S.y - S.h / 2, S.w, S.h, 10);
            chute.lineStyle(3, 0xffd43b, 1);
            chute.strokeRoundedRect(S.x - S.w / 2 - 6, S.y - S.h / 2 - 6, S.w + 12, S.h + 12, 12);
            chute.fillStyle(0xffe066, 0.9);
            chute.fillTriangle(S.x - 8, S.y - 6, S.x + 8, S.y - 6, S.x, S.y + 8);

            // Cajón de premios.
            var P = L.premio;
            var caja = keep(this.add.graphics().setDepth(14));
            caja.fillStyle(0xffd43b, 1);
            caja.fillRoundedRect(P.x - P.w / 2, P.y - P.h / 2, P.w, P.h, 14);
            caja.fillStyle(0x1b1f24, 1);
            caja.fillRoundedRect(P.x - P.w * 0.42, P.y - P.h * 0.32, P.w * 0.84, P.h * 0.64, 10);
            caja.lineStyle(5, 0xfab005, 1);
            caja.strokeRoundedRect(P.x - P.w / 2, P.y - P.h / 2, P.w, P.h, 14);
            keep(this.add.text(P.x, P.y + P.h * 0.72, 'PREMIOS', {
                fontFamily: 'Nunito, Arial', fontSize: '16px', fontStyle: 'bold', color: '#5f3dc4'
            }).setOrigin(0.5).setDepth(14));

            // Luces laterales + marquee.
            this.luces = [];
            this.marquee = [];
            [-1, 1].forEach(function (lado) {
                for (var i = 0; i < 8; i++) {
                    var lx = M.x + lado * M.w * 0.43;
                    var ly = M.y - M.h * 0.3 + i * (M.h * 0.065);
                    var halo = keep(self.add.circle(lx, ly, 14, 0xffe066, 0.35).setDepth(15));
                    var bulb = keep(self.add.circle(lx, ly, 8, 0xfff9db, 1).setDepth(15));
                    self.luces.push(bulb);
                    self.luces.push(halo);
                }
            });
            for (var s = 0; s < 12; s++) {
                var sx = M.x - M.w * 0.3 + s * M.w * 0.055;
                var sy = M.y - M.h * 0.455;
                var st = keep(this.add.star(sx, sy, 5, 3, 8, 0xffe066).setDepth(15));
                this.marquee.push(st);
            }

            // Reflejo del cristal (encima de casi todo el interior).
            this.cristalShine = keep(this.add.graphics().setDepth(23));
            this.cristalShine.fillStyle(0xffffff, 0.1);
            this.cristalShine.fillRoundedRect(C.x - C.w * 0.46, C.y - C.h * 0.44, C.w * 0.18, C.h * 0.78, 12);
            this.cristalShine.fillStyle(0xffffff, 0.06);
            this.cristalShine.fillRoundedRect(C.x + C.w * 0.22, C.y - C.h * 0.4, C.w * 0.12, C.h * 0.5, 10);
        },

        montarControles: function (keep) {
            var L = this.L, M = L.maq;
            var px = M.x - M.w * 0.36, pw = M.w * 0.72, py = L.panel.y - L.panel.h * 0.48, ph = L.panel.h;
            var panel = keep(this.add.graphics().setDepth(16));
            // Consola: borde oscuro, cara azul con brillo de metal y filo cromado.
            panel.fillStyle(0x000000, 0.25);
            panel.fillRoundedRect(px + 4, py + 8, pw, ph, 24);
            panel.fillStyle(0x1e2a78, 1);
            panel.fillRoundedRect(px, py, pw, ph, 24);
            panel.fillStyle(0x364fc7, 1);
            panel.fillRoundedRect(px + 8, py + 6, pw - 16, ph * 0.78, 18);
            panel.fillStyle(0x4c6ef5, 1);
            panel.fillRoundedRect(px + 12, py + 10, pw - 24, ph * 0.5, 14);
            panel.fillStyle(0xffffff, 0.12);
            panel.fillRoundedRect(px + 16, py + 12, pw - 32, ph * 0.14, 8);
            panel.lineStyle(3, 0xdee2e6, 0.55);
            panel.strokeRoundedRect(px + 3, py + 3, pw - 6, ph - 6, 22);
            // Flechas pintadas a los lados de la palanca (pista: se mueve a izquierda y derecha).
            var J = L.joy;
            panel.fillStyle(0xffffff, 0.22);
            [-1, 1].forEach(function (s) {
                var cx = J.x + s * J.r * 1.42;
                panel.fillTriangle(cx + s * J.r * 0.16, J.y - J.r * 0.5, cx - s * J.r * 0.06, J.y - J.r * 0.66, cx - s * J.r * 0.06, J.y - J.r * 0.34);
            });
            // Fila de luces de la consola (corren solas en paso()).
            this.ledsPanel = [];
            var nl = 14;
            for (var i = 0; i < nl; i++) {
                var lx = px + 26 + i * (pw - 52) / (nl - 1);
                this.ledsPanel.push(keep(this.add.circle(lx, py + ph - 9, 3.2, 0xffe066, 0.4).setDepth(16.5)));
            }

            this.btnIzq = this.dibujarFlecha(keep, L.flechaL, -1);
            this.btnDer = this.dibujarFlecha(keep, L.flechaR, 1);

            // Palanca de arcade: placa con tornillos, hueco con fuelle de goma y bola roja que se inclina.
            var base = keep(this.add.graphics().setDepth(17));
            var lado = J.r * 2.4;
            base.fillStyle(0x000000, 0.3);
            base.fillRoundedRect(J.x - lado / 2 + 3, J.y - lado / 2 + 5, lado, lado * 0.8, 14);
            base.fillStyle(0x212529, 1);
            base.fillRoundedRect(J.x - lado / 2, J.y - lado / 2, lado, lado * 0.8, 14);
            base.fillStyle(0x343a40, 1);
            base.fillRoundedRect(J.x - lado / 2 + 5, J.y - lado / 2 + 5, lado - 10, lado * 0.8 - 10, 10);
            base.fillStyle(0xadb5bd, 1);
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) {
                base.fillCircle(J.x + q[0] * (lado / 2 - 11), J.y - lado * 0.1 + q[1] * (lado * 0.4 - 11), 3.5);
            });
            base.fillStyle(0x0b0d10, 1);
            base.fillEllipse(J.x, J.y, J.r * 1.1, J.r * 0.5);
            this.joyG = keep(this.add.graphics().setDepth(18));
            this.joyVis = 0;
            this.joyObjetivo = 0;
            this.dibujarJoy(0);

            // Botón ATRAPAR: bisel cromado y tapa verde que se hunde al pulsar.
            var B = L.btn;
            this.btnHalo = keep(this.add.circle(B.x, B.y, B.r * 1.5, 0x69db7c, 0.35).setDepth(17));
            var bisel = keep(this.add.graphics().setDepth(17));
            bisel.fillStyle(0x000000, 0.3);
            bisel.fillCircle(B.x + 3, B.y + 7, B.r * 1.28);
            bisel.fillStyle(0x212529, 1);
            bisel.fillCircle(B.x, B.y, B.r * 1.28);
            bisel.fillStyle(0xced4da, 1);
            bisel.fillCircle(B.x, B.y, B.r * 1.19);
            bisel.fillStyle(0x868e96, 1);
            bisel.fillCircle(B.x, B.y + 2, B.r * 1.1);
            bisel.fillStyle(0x1b5e20, 1);
            bisel.fillCircle(B.x, B.y + 3, B.r * 1.04);
            this.btnGrab = keep(this.add.container(B.x, B.y).setDepth(18));
            var tapa = this.add.container(0, 0);
            var falda = this.add.circle(0, B.r * 0.16, B.r, 0x2b8a3e);
            var cara = this.add.circle(0, 0, B.r * 0.95, 0x51cf66);
            var aroCara = this.add.circle(0, 0, B.r * 0.78, 0x69db7c);
            var brillo = this.add.ellipse(-B.r * 0.28, -B.r * 0.42, B.r * 0.7, B.r * 0.32, 0xffffff, 0.35).setAngle(-18);
            var flecha = this.add.graphics();
            flecha.fillStyle(0x1b5e20, 0.35);
            flecha.fillTriangle(-B.r * 0.32, -B.r * 0.1, B.r * 0.32, -B.r * 0.1, 0, B.r * 0.48);
            flecha.fillRect(-B.r * 0.13, -B.r * 0.4, B.r * 0.26, B.r * 0.32);
            flecha.fillStyle(0xffffff, 1);
            flecha.fillTriangle(-B.r * 0.32, -B.r * 0.16, B.r * 0.32, -B.r * 0.16, 0, B.r * 0.42);
            flecha.fillRect(-B.r * 0.13, -B.r * 0.46, B.r * 0.26, B.r * 0.32);
            tapa.add([falda, cara, aroCara, brillo, flecha]);
            var placa = this.add.graphics();
            placa.fillStyle(0x1b5e20, 1);
            placa.fillRoundedRect(-B.r * 0.95, B.r * 1.32, B.r * 1.9, B.r * 0.5, 10);
            var txt = this.add.text(0, B.r * 1.57, 'ATRAPAR', {
                fontFamily: 'Nunito, Arial',
                fontSize: Math.round(Math.max(16, B.r * 0.34)) + 'px',
                fontStyle: 'bold',
                color: '#ffffff'
            }).setOrigin(0.5);
            this.btnGrab.add([tapa, placa, txt]);
            this.btnGrab.tapa = tapa;
            this.btnGrab.cara = cara;
            this.btnGrab.disco = cara;
        },

        /** Palanca inclinada t (-1 izquierda … 1 derecha). */
        dibujarJoy: function (t) {
            var g = this.joyG, J = this.L.joy;
            if (!g) return;
            var r = J.r;
            var bx = J.x + t * r * 0.78;
            var by = J.y - r * 1.02 + Math.abs(t) * r * 0.2;
            g.clear();
            // Sombra de la bola sobre la placa.
            g.fillStyle(0x000000, 0.28);
            g.fillEllipse(bx + r * 0.15, J.y + r * 0.1, r * 0.95, r * 0.32);
            // Fuelle de goma.
            g.fillStyle(0x111315, 1);
            g.fillEllipse(J.x + t * r * 0.1, J.y - r * 0.06, r * 0.62, r * 0.32);
            // Vástago cromado.
            g.lineStyle(r * 0.24, 0x868e96, 1);
            g.lineBetween(J.x + t * r * 0.08, J.y - r * 0.08, bx, by);
            g.lineStyle(r * 0.08, 0xf1f3f5, 0.9);
            g.lineBetween(J.x + t * r * 0.08 - r * 0.05, J.y - r * 0.1, bx - r * 0.05, by);
            // Bola roja con volumen y brillo.
            g.fillStyle(0xa61e1e, 1);
            g.fillCircle(bx, by, r * 0.58);
            g.fillStyle(0xe03131, 1);
            g.fillCircle(bx - r * 0.05, by - r * 0.06, r * 0.5);
            g.fillStyle(0xff6b6b, 1);
            g.fillCircle(bx - r * 0.14, by - r * 0.16, r * 0.26);
            g.fillStyle(0xffffff, 0.75);
            g.fillEllipse(bx - r * 0.22, by - r * 0.27, r * 0.24, r * 0.13);
        },

        dibujarFlecha: function (keep, Q, dir) {
            var c = keep(this.add.container(Q.x, Q.y).setDepth(17));
            var sombra = this.add.circle(2, 5, Q.r * 1.2, 0x000000, 0.3);
            var bisel = this.add.circle(0, 0, Q.r * 1.2, 0x212529);
            var cromo = this.add.circle(0, 0, Q.r * 1.1, 0xadb5bd);
            var hueco = this.add.circle(0, 2, Q.r * 1.02, 0x7a5200);
            var tapa = this.add.container(0, 0);
            var falda = this.add.circle(0, Q.r * 0.14, Q.r, 0xf08c00);
            var top = this.add.circle(0, 0, Q.r * 0.92, 0xffd43b);
            var brillo = this.add.ellipse(-Q.r * 0.25, -Q.r * 0.38, Q.r * 0.7, Q.r * 0.32, 0xffffff, 0.4).setAngle(-15);
            var g = this.add.graphics();
            g.fillStyle(0x9c1c1c, 1);
            g.fillTriangle(dir * Q.r * 0.5, Q.r * 0.05, -dir * Q.r * 0.26, -Q.r * 0.36, -dir * Q.r * 0.26, Q.r * 0.46);
            g.fillStyle(0xe03131, 1);
            g.fillTriangle(dir * Q.r * 0.48, 0, -dir * Q.r * 0.28, -Q.r * 0.42, -dir * Q.r * 0.28, Q.r * 0.42);
            tapa.add([falda, top, brillo, g]);
            c.add([sombra, bisel, cromo, hueco, tapa]);
            c.dir = dir;
            c.r = Q.r;
            c.tapa = tapa;
            c.top = top;
            c.fondo = top;
            return c;
        },

        /* ── Gancho ── */

        montarGancho: function (keep) {
            var L = this.L;
            var C = L.cristal;
            // Riel cromado con tornillos.
            var riel = keep(this.add.graphics().setDepth(19));
            riel.fillStyle(0x495057, 1);
            riel.fillRoundedRect(C.x - C.w * 0.46, L.rielY - 11, C.w * 0.92, 22, 8);
            riel.fillStyle(0xadb5bd, 1);
            riel.fillRoundedRect(C.x - C.w * 0.46, L.rielY - 11, C.w * 0.92, 8, { tl: 8, tr: 8, bl: 0, br: 0 });
            riel.fillStyle(0xf1f3f5, 0.7);
            riel.fillRect(C.x - C.w * 0.44, L.rielY - 9, C.w * 0.88, 2);
            riel.fillStyle(0x212529, 1);
            riel.fillRoundedRect(C.x - C.w * 0.46, L.rielY - 1, C.w * 0.92, 6, 3);
            for (var t = 0; t <= 6; t++) {
                riel.fillStyle(0xdee2e6, 1);
                riel.fillCircle(C.x - C.w * 0.44 + t * C.w * 0.88 / 6, L.rielY + 7, 2.5);
            }

            this.miraG = keep(this.add.graphics().setDepth(10));
            this.cableG = keep(this.add.graphics().setDepth(20));
            this.gancho = keep(this.add.container(C.x, L.rielY + 52).setDepth(21));
            // Las pinzas crecen con los peluches (en tablets grandes los objetos son más grandes).
            this.escG = Math.max(0.85, Math.min(1.4, L.tam / 110));
            var e = this.escG;

            var polea = this.add.graphics();
            polea.fillStyle(0x495057, 1);
            polea.fillCircle(0, 0, 7);
            polea.fillStyle(0xadb5bd, 1);
            polea.fillCircle(0, 0, 3);
            var cabeza = this.add.graphics();
            // Abrazadera del cable, motor cilíndrico con franja amarilla y cubo de las pinzas.
            cabeza.fillStyle(0x868e96, 1);
            cabeza.fillRect(-5, -PIVOTE + 4, 10, PIVOTE - 34);
            cabeza.fillStyle(0xadb5bd, 1);
            cabeza.fillRoundedRect(-17 * e, -32, 34 * e, 26, 7);
            cabeza.fillStyle(0xf1f3f5, 0.85);
            cabeza.fillRect(-12 * e, -30, 4 * e, 22);
            cabeza.fillStyle(0xffd43b, 1);
            cabeza.fillRect(-17 * e, -25, 34 * e, 5);
            cabeza.fillStyle(0x495057, 1);
            cabeza.fillRect(-17 * e, -11, 34 * e, 5);
            cabeza.fillStyle(0x868e96, 1);
            cabeza.fillPoints([{ x: -12 * e, y: -6 }, { x: 12 * e, y: -6 }, { x: 8 * e, y: 5 }, { x: -8 * e, y: 5 }], true);
            this.ledGancho = this.add.circle(9 * e, -16, 3.2, 0x51cf66);

            this.pinzaL = this.add.graphics();
            this.pinzaR = this.add.graphics();
            this.pinzaC = this.add.graphics();
            this.dibujarPinzas(0);
            // Las pinzas cuelgan del cable (pivote) y se mecen como un péndulo al mover el gancho.
            // El contenedor del gancho no gira: su x es la que usa la lógica para apuntar.
            this.colg = this.add.container(0, -PIVOTE);
            [cabeza, this.ledGancho, this.pinzaL, this.pinzaR, this.pinzaC].forEach(function (o) { o.y += PIVOTE; });
            this.colg.add([polea, this.pinzaL, this.pinzaR, cabeza, this.ledGancho, this.pinzaC]);
            this.gancho.add(this.colg);
            this.swing = { a: 0, v: 0, xPrev: null, vx: 0 };
            this.pinzaApertura = 0;
            this.gancho.yBase = L.rielY + 56;
            this.ganchoX = 0.5;
            this.ponerGancho(0.5, false);
        },

        /**
         * Tres pinzas articuladas. apertura 0 = abierta, 1 = cerrada: el brazo de arriba se recoge y
         * el dedo de abajo se curva hacia adentro (la punta de goma abraza el peluche).
         */
        dibujarPinzas: function (apertura) {
            var a = Math.max(0, Math.min(1, apertura));
            var e = this.escG || 1;
            function garra(g, s) {
                g.clear();
                var sx = s * 9 * e, sy = 4;
                var tu = 0.62 + (0.2 - 0.62) * a;
                var jx = sx + s * Math.sin(tu) * 22 * e, jy = sy + Math.cos(tu) * 22 * e;
                var tl = -0.05 + (-0.8 + 0.05) * a;
                var tx = jx + s * Math.sin(tl) * 22 * e, ty = jy + Math.cos(tl) * 22 * e;
                var kx = tx - s * (5 + 2 * a) * e, ky = ty + 4 * e;
                g.lineStyle(7 * e, 0x868e96, 1);
                g.lineBetween(sx, sy, jx, jy);
                g.lineStyle(2.4 * e, 0xf1f3f5, 0.9);
                g.lineBetween(sx - s * 1.6 * e, sy + 1, jx - s * 1.6 * e, jy);
                g.lineStyle(6 * e, 0xadb5bd, 1);
                g.lineBetween(jx, jy, tx, ty);
                g.lineStyle(5 * e, 0xe03131, 1);
                g.lineBetween(tx, ty, kx, ky);
                g.fillStyle(0xe03131, 1);
                g.fillCircle(kx, ky, 2.6 * e);
                g.fillStyle(0x495057, 1);
                g.fillCircle(jx, jy, 4.6 * e);
                g.fillStyle(0xdee2e6, 1);
                g.fillCircle(jx, jy, 2 * e);
            }
            if (this.pinzaL) garra(this.pinzaL, -1);
            if (this.pinzaR) garra(this.pinzaR, 1);
            if (this.pinzaC) {
                var g = this.pinzaC;
                var largo = (40 - 5 * a) * e;
                g.clear();
                g.lineStyle(6.5 * e, 0xadb5bd, 1);
                g.lineBetween(0, 5, 0, 5 + largo);
                g.lineStyle(2.2 * e, 0xffffff, 0.9);
                g.lineBetween(-1.6 * e, 6, -1.6 * e, 4 + largo);
                g.fillStyle(0x495057, 1);
                g.fillCircle(0, 5 + largo * 0.5, 4.2 * e);
                g.fillStyle(0xe03131, 1);
                g.fillCircle(0, 7 + largo, 4.2 * e);
            }
            this.pinzaApertura = a;
        },

        cerrarPinzas: function (cerrar) {
            var self = this;
            var desde = this.pinzaApertura || 0;
            var hasta = cerrar ? 1 : 0;
            if (Math.abs(desde - hasta) > 0.05) {
                if (cerrar) {
                    ruidoMaq('clac');
                    vibrar(this, 25);
                } else {
                    ruidoMaq('abrir');
                }
            }
            var o = { t: desde };
            return tw(this, {
                targets: o, t: hasta, duration: 180, ease: 'Sine.easeInOut',
                onUpdate: function () { self.dibujarPinzas(o.t); }
            });
        },

        ponerGancho: function (t, anim) {
            var L = this.L;
            t = Math.max(0.08, Math.min(0.92, t));
            this.ganchoX = t;
            var x = L.cristal.x - L.cristal.w * 0.42 + L.cristal.w * 0.84 * t;
            var y = this.gancho.yAbajo != null ? this.gancho.yAbajo : this.gancho.yBase;
            if (anim) return tw(this, { targets: this.gancho, x: x, duration: 240, ease: 'Sine.easeOut' });
            this.gancho.setPosition(x, y);
            return Promise.resolve();
        },

        dibujarCable: function () {
            var g = this.cableG, L = this.L, h = this.gancho;
            if (!g || !h) return;
            g.clear();
            g.lineStyle(4, 0x343a40, 1);
            g.lineBetween(h.x, L.rielY, h.x, h.y - PIVOTE);
            // Carrito del riel con dos ruedas que giran al moverse.
            g.fillStyle(0xffd43b, 1);
            g.fillRoundedRect(h.x - 16, L.rielY - 12, 32, 16, 4);
            var giro = h.x / 7;
            [-9, 9].forEach(function (dx) {
                g.fillStyle(0x343a40, 1);
                g.fillCircle(h.x + dx, L.rielY - 12, 5);
                g.lineStyle(2, 0xadb5bd, 1);
                g.lineBetween(h.x + dx, L.rielY - 12, h.x + dx + Math.cos(giro) * 4, L.rielY - 12 + Math.sin(giro) * 4);
            });
        },

        /**
         * Péndulo de las pinzas: el carrito acelera y las pinzas se quedan atrás un poco y se mecen
         * (resorte amortiguado en el marco que acelera). Además ubica el premio colgado.
         */
        columpio: function (delta) {
            var g = this.gancho, s = this.swing;
            if (!g || !this.colg || !s) return;
            if (Ut.reducido()) {
                s.a = 0;
                this.colg.rotation = 0;
            } else {
                var dt = Math.min(0.05, Math.max(0.001, delta / 1000));
                if (s.xPrev == null) s.xPrev = g.x;
                var vx = (g.x - s.xPrev) / dt;
                var ax = Math.max(-20000, Math.min(20000, (vx - s.vx) / dt));
                s.xPrev = g.x;
                s.vx = vx;
                var w = 2 * Math.PI * 1.15;
                var acc = -w * w * s.a - 2 * 0.14 * w * s.v - ax * 0.0011;
                s.v += acc * dt;
                // Con un premio colgado el vaivén es menor (si no, el premio se sale del cristal).
                var tope = this.colgado ? 0.2 : 0.42;
                s.a = Math.max(-tope, Math.min(tope, s.a + s.v * dt));
                this.colg.rotation = s.a;
                // El motor suena mientras el carrito corre por el riel.
                if (Math.abs(vx) > 90 && this.time.now - this.ultMotor > 380) {
                    this.ultMotor = this.time.now;
                    ruidoMaq('motor', null, { vol: 0.8 });
                }
            }
            var c = this.colgado;
            if (c && c.cont && c.cont.active) {
                var d = this.colgadoD;
                c.cont.x = g.x - Math.sin(s.a) * d;
                c.cont.y = g.y - PIVOTE + Math.cos(s.a) * d;
                c.cont.rotation = s.a;
            }
        },

        /** Engancha un objeto a las pinzas (a la distancia a la que está ahora del pivote). */
        colgar: function (c) {
            this.colgado = c;
            this.colgadoD = c ? Math.max(40, c.cont.y - (this.gancho.y - PIVOTE)) : 0;
        },

        dibujarMira: function () {
            var g = this.miraG, L = this.L, h = this.gancho;
            if (!g || !h) return;
            g.clear();
            if (this.fase !== 'jugar' || this.bajando) return;
            var y0 = h.y + 58, y1 = L.pisoY + 8;
            g.lineStyle(2, 0xffe066, 0.45);
            for (var y = y0; y < y1; y += 14) {
                g.lineBetween(h.x, y, h.x, Math.min(y + 8, y1));
            }
            var c = this.apuntado;
            if (c && c.cont && c.cont.active) {
                g.lineStyle(3, 0x69db7c, 0.85);
                g.strokeCircle(c.cont.x, c.cont.y, c.tam * 0.62);
                g.fillStyle(0x69db7c, 0.12);
                g.fillCircle(c.cont.x, c.cont.y, c.tam * 0.62);
            } else {
                g.fillStyle(0xffe066, 0.2);
                g.fillEllipse(h.x, L.pisoY + 4, 36, 12);
            }
        },

        /* ── Decor / opciones ── */

        /* ── Bolitas del pozo (se agitan cuando algo cae o el gancho baja) ── */

        sembrarBolas: function (keep) {
            var L = this.L, C = L.cristal, S = L.salida;
            var cols = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xcc5de8, 0xff922b, 0x20c997, 0xf783ac];
            this.bolas = [];
            var n = Math.round(C.w / 24);
            for (var i = 0; i < n; i++) {
                var x = C.x - C.w * 0.46 + (i + 0.5) * (C.w * 0.92 / n) + ((i * 37) % 9 - 4);
                if (Math.abs(x - S.x) < S.w * 0.75) continue;   // no tapar la salida
                var y = L.pisoY + 5 + (i % 3) * 5;
                var r = 9 + (i % 4);
                var b = keep(this.add.container(x, y).setDepth(9.5));
                b.add([this.add.circle(0, 0, r, cols[i % cols.length]), this.add.circle(-r * 0.3, -r * 0.35, r * 0.32, 0xffffff, 0.55)]);
                b.x0 = x;
                b.y0 = y;
                this.bolas.push(b);
            }
        },

        /**
         * La máquina llena de peluches de relleno (osito, conejo, pulpo, estrella, corazón, pompón) en
         * tres filas: atrás (en sombra), al medio y adelante (tapan un poco la base de las opciones).
         * Ninguno es un elemento del juego. Si el gancho agarra uno, se resbala (no cuenta como error).
         */
        sembrarRellenos: function (keep) {
            var self = this, PM = global.PelucheMaq;
            this.rellenos = [];
            if (!PM) return;
            var L = this.L, C = L.cristal, S = L.salida;
            var cols = [0xffa8a8, 0x91a7ff, 0xffd8a8, 0xb2f2bb, 0xd0bfff, 0x99e9f2, 0xfcc2d7, 0xffe066];
            var claves = [];
            PM.TIPOS.forEach(function (t, i) {
                [0, 1].forEach(function (v) {
                    var key = 'relleno_' + t + '_' + v;
                    if (!self.textures.exists(key)) self.textures.addCanvas(key, PM.relleno(t, cols[(i * 2 + v * 3) % cols.length], 168, i * 13 + v + 5));
                    claves.push(key);
                });
            });
            var rnd = PM.generador(20261112);
            var tamR = L.tam * 0.6;
            var x0 = S.x + S.w / 2 + tamR * 0.2, x1 = C.x + C.w * 0.47 - tamR * 0.2;
            var filas = [
                { y: L.pisoY - L.tam * 0.12, prof: 10.4, esc: 0.86, paso: 0.52, sombra: true },
                { y: L.pisoY + L.tam * 0.07, prof: 10.8, esc: 0.95, paso: 0.58 },
                { y: L.pisoY + L.tam * 0.28, prof: 12.6, esc: 1.0, paso: 0.66 }
            ];
            filas.forEach(function (f, fi) {
                var paso = tamR * f.paso;
                for (var x = x0 + (fi % 2) * paso * 0.5; x <= x1; x += paso * (0.85 + rnd() * 0.3)) {
                    var t = tamR * f.esc * (0.85 + rnd() * 0.3);
                    var img = keep(self.add.image(x, f.y + (rnd() - 0.5) * 10, claves[Math.floor(rnd() * claves.length)]));
                    img.setDisplaySize(t, t).setAngle((rnd() - 0.5) * 50).setDepth(f.prof + rnd() * 0.1);
                    if (f.sombra) img.setTint(0xcfcfe0);
                    self.rellenos.push({ cont: img, tam: t, x0: img.x, y0: img.y, a0: img.angle, prof: img.depth, relleno: true });
                }
            });
        },

        /** El relleno que está bajo el gancho (el de más adelante si hay varios). */
        rellenoBajo: function (x) {
            var mejor = null;
            (this.rellenos || []).forEach(function (r) {
                if (!r.cont.active || Math.abs(r.cont.x - x) > r.tam * 0.38) return;
                if (!mejor || r.prof > mejor.prof) mejor = r;
            });
            return mejor;
        },

        /** El gancho levanta un peluche de relleno, pero se le resbala y cae otra vez a la montaña. */
        levantarRelleno: async function (r) {
            r.cont.setDepth(22);
            this.colgar(r);
            ruidoMaq('subir', null, { vol: 0.5 });
            await tw(this, { targets: this.gancho, y: this.gancho.y - r.tam * 0.55, duration: 380, ease: 'Sine.easeOut' });
            this.swing.v += rnd(-1.2, 1.2);
            await esperar(this, 260);
            this.colgar(null);
            this.cerrarPinzas(false);
            await tw(this, { targets: r.cont, x: r.x0, y: r.y0, angle: r.a0, duration: Ut.reducido() ? 150 : 460, ease: 'Bounce.easeOut' });
            r.cont.setDepth(r.prof);
            this.agitarBolas(r.x0, 12);
            ruidoMaq('cae', null, { vol: 0.35 });
        },

        /**
         * Los dibujos del nivel pasan a ser peluches (PelucheMaq): se reemplaza la textura el_<id> antes
         * de crear el objeto, una sola vez por elemento.
         */
        peluchar: function (ids) {
            var self = this, PM = global.PelucheMaq;
            if (!PM) return;
            var hechos = this.textures.__peluche || (this.textures.__peluche = {});
            (ids || []).forEach(function (id) {
                var key = 'el_' + id;
                if (hechos[id] || !self.textures.exists(key)) return;
                hechos[id] = true;
                try {
                    var src = self.textures.get(key).getSourceImage();
                    var semilla = 1000 + id.length * 97 + id.charCodeAt(0) * 13;
                    var cv = PM.texturaPeluche(src, { lado: 360, semilla: semilla });
                    self.textures.remove(key);
                    self.textures.addCanvas(key, cv);
                } catch (e) {
                    console.warn('[QueEscuchaste] sin peluche para', id, e);
                }
            });
        },

        /** Las bolitas cercanas a x saltan y se abren (fuerza en px). */
        agitarBolas: function (x, fuerza, radio) {
            var self = this;
            if (Ut.reducido()) return;
            radio = radio || this.L.tam * 0.9;
            (this.rellenos || []).forEach(function (r) {
                if (!r.cont.active || self.colgado === r) return;
                var d = Math.abs(r.x0 - x);
                if (d > radio * 1.1) return;
                var k = 1 - d / (radio * 1.1);
                self.tweens.killTweensOf(r.cont);
                r.cont.setPosition(r.x0, r.y0).setAngle(r.a0);
                self.tweens.add({
                    targets: r.cont, y: r.y0 - fuerza * 0.6 * k, angle: r.a0 + rnd(-10, 10) * k,
                    duration: rnd(160, 230), ease: 'Quad.easeOut', yoyo: true,
                    onComplete: function () { r.cont.setPosition(r.x0, r.y0).setAngle(r.a0); }
                });
            });
            (this.bolas || []).forEach(function (b) {
                if (!b.active) return;
                var d = Math.abs(b.x0 - x);
                if (d > radio) return;
                var k = 1 - d / radio;
                self.tweens.killTweensOf(b);
                b.setPosition(b.x0, b.y0);
                var lado = b.x0 < x ? -1 : 1;
                self.tweens.add({
                    targets: b, y: b.y0 - fuerza * k * rnd(0.6, 1.15), x: b.x0 + lado * fuerza * 0.35 * k,
                    duration: rnd(150, 220), ease: 'Quad.easeOut', yoyo: true,
                    onComplete: function () { b.setPosition(b.x0, b.y0); }
                });
            });
        },

        /* ── Altavoz que vibra con el sonido real (medido en vivo, sin delatar cuál es) ── */

        montarAltavoz: function (keep) {
            var A = this.L.altavoz;
            var c = keep(this.add.container(A.x, A.y).setDepth(80));
            var aro = this.add.circle(0, 0, A.r, 0x212529).setStrokeStyle(5, 0xffe066);
            var cono = this.add.circle(0, 0, A.r * 0.74, 0x495057);
            var cono2 = this.add.circle(0, 0, A.r * 0.5, 0x343a40);
            var tapa = this.add.circle(0, 0, A.r * 0.24, 0x868e96);
            var brillo = this.add.circle(-A.r * 0.28, -A.r * 0.3, A.r * 0.15, 0xffffff, 0.35);
            var tornillos = this.add.graphics();
            tornillos.fillStyle(0xadb5bd, 1);
            for (var i = 0; i < 4; i++) {
                var ang = Math.PI / 4 + i * Math.PI / 2;
                tornillos.fillCircle(Math.cos(ang) * A.r * 0.87, Math.sin(ang) * A.r * 0.87, 2.4);
            }
            c.add([aro, cono, cono2, tapa, brillo, tornillos]);
            c.cono = cono2;
            c.tapa = tapa;
            this.altavoz = c;
            this.altavozG = keep(this.add.graphics().setDepth(79));
        },

        /** Cada cuadro: el altavoz, las luces y el letrero siguen el volumen del sonido. */
        vibrarAltavoz: function (time) {
            var sfx = global.MemoriaAuditivaSfx;
            var medido = sfx && sfx.nivel ? sfx.nivel() : 0;
            // Grabaciones (sin medidor): un latido suave mientras suena.
            if (this.sonando && medido === 0) medido = 0.3 + Math.sin(time / 85) * 0.15;
            if (!this.sonando) medido = 0;
            this.nivelSuave += (medido - this.nivelSuave) * (medido > this.nivelSuave ? 0.5 : 0.18);
            var n = this.nivelSuave;
            var A = this.L.altavoz, c = this.altavoz, g = this.altavozG;
            if (!c || !g) return;
            var temblor = Ut.reducido() ? 0 : n;
            c.setScale(1 + temblor * 0.16);
            c.cono.setScale(1 + temblor * 0.38 + (temblor > 0.05 ? Math.sin(time / 22) * 0.05 : 0));
            c.tapa.setScale(1 + temblor * 0.5);
            g.clear();
            if (n > 0.04) {
                for (var k = 0; k < 3; k++) {
                    var f = ((time / 700) + k / 3) % 1;
                    g.lineStyle(4, 0xffe066, Math.min(0.9, n * 1.6) * (1 - f));
                    g.strokeCircle(A.x, A.y, A.r * (1.15 + f * (0.8 + n * 1.2)));
                }
                if (n > 0.22 && time - this.ultNota > 300 && !Ut.reducido()) {
                    this.ultNota = time;
                    Ut.notas(this, A.x, A.y - A.r * 0.6, 1);
                }
            }
            // Luces laterales y estrellas del letrero al ritmo del sonido.
            if (!this.sonando && this.marqueeAlRitmo) {
                this.marqueeAlRitmo = false;
                (this.marquee || []).forEach(function (s) { if (!s.scene.tweens.isTweening(s)) s.setScale(1); });
            }
            if (this.sonando && this.luces) {
                this.marqueeAlRitmo = true;
                this.luces.forEach(function (l, i) {
                    if (i % 2 === 1) l.setAlpha(0.15 + n * 0.75);
                    else l.setAlpha(0.35 + n * 0.65 * (0.6 + 0.4 * Math.sin(time / 60 + i)));
                });
                (this.marquee || []).forEach(function (s, i) {
                    s.setScale(1 + n * 0.5 * (0.5 + 0.5 * Math.sin(time / 70 + i)));
                });
            }
        },

        /* ── Cámara: se acerca al gancho en el momento clave y vuelve ── */

        camaraA: function (x, y, zoom, ms) {
            if (Ut.reducido() || (this.ctx.enDemo && this.ctx.enDemo())) return Promise.resolve();
            var cam = this.cameras.main;
            cam.pan(x, y, ms, 'Sine.easeInOut', true);
            cam.zoomTo(zoom, ms, 'Sine.easeInOut', true);
            return esperar(this, ms);
        },

        camaraNormal: function (ms) {
            var cam = this.cameras.main, L = this.L;
            if (cam.zoom === 1 && Math.abs(cam.midPoint.x - L.W / 2) < 1 && Math.abs(cam.midPoint.y - L.H / 2) < 1) return Promise.resolve();
            cam.pan(L.W / 2, L.H / 2, ms || 450, 'Sine.easeInOut', true);
            cam.zoomTo(1, ms || 450, 'Sine.easeInOut', true);
            return esperar(this, (ms || 450) + 20).then(function () {
                cam.setZoom(1);
                cam.centerOn(L.W / 2, L.H / 2);
            });
        },

        /* ── Fiesta de luces y cajón que destella ── */

        fiestaLuces: function () {
            var self = this;
            var arcoiris = [0xff6b6b, 0xffa94d, 0xffe066, 0x69db7c, 0x4dabf7, 0xb197fc];
            (this.marquee || []).forEach(function (s, i) {
                self.time.delayedCall(i * 45, function () {
                    if (!s.active) return;
                    s.setFillStyle(arcoiris[i % arcoiris.length]);
                    self.tweens.add({ targets: s, scale: 1.7, duration: 150, yoyo: true, repeat: 1 });
                    self.time.delayedCall(900, function () { if (s.active) s.setFillStyle(0xffe066); });
                });
            });
            this.luces.forEach(function (l, i) {
                self.tweens.add({ targets: l, alpha: 0.2, duration: 90, yoyo: true, repeat: 3, delay: i * 15 });
            });
        },

        destelloCajon: function () {
            var P = this.L.premio;
            var g = this.add.graphics().setDepth(14.5).setAlpha(0);
            g.fillStyle(0xfff3bf, 1);
            g.fillRoundedRect(P.x - P.w / 2 - 6, P.y - P.h / 2 - 6, P.w + 12, P.h + 12, 16);
            this.tweens.add({ targets: g, alpha: 0.55, duration: 120, yoyo: true, repeat: 2, onComplete: function () { g.destroy(); } });
        },

        lugares: function (n) {
            var L = this.L, out = [];
            var tam = this.tamOpciones(n);
            var x0 = L.salida.x + L.salida.w / 2 + 6 + tam * 0.5;
            var x1 = L.cristal.x + L.cristal.w * 0.42 - tam * 0.5;
            var y = L.pisoY - L.tam * 0.22;
            for (var i = 0; i < n; i++) {
                var t = n === 1 ? 0.5 : i / (n - 1);
                out.push({ x: x0 + (x1 - x0) * t, y: y });
            }
            return out;
        },

        /** (Sin pedestales: los peluches quedan sobre la montaña de relleno, como en una máquina real.) */
        armarPedestales: function () {
            (this.pedestales || []).forEach(function (p) { p.destroy(); });
            this.pedestales = [];
        },

        ubicarCosas: function () {
            var lug = this.lugares(this.cosas.length);
            this.armarPedestales(lug);
            this.cosas.forEach(function (a, i) {
                if (!lug[i]) return;
                a.cont.setPosition(lug[i].x, lug[i].y);
                a.casa = lug[i];
            });
        },

        meterPremio: function (a, k, animar) {
            var P = this.L.premio;
            var esc = Math.min(0.6, (P.w * 0.42) / a.tam);
            var x = P.x + ((k % 3) - 1) * P.w * 0.24;
            var y = P.y - 2 - Math.floor(k / 3) * 16;
            a.cont.setDepth(15 - k * 0.01);
            if (!animar) {
                a.cont.setPosition(x, y).setScale(esc).setAngle(rnd(-12, 12));
                return null;
            }
            return { x: x, y: y, esc: esc };
        },

        prepararNivel: async function (i, nv) {
            var self = this;
            if (nv) this.peluchar(nv.opciones);
            this.bajando = false;
            this.colgar(null);
            this.camaraNormal(200);
            this.gancho.yAbajo = null;
            this.dibujarPinzas(0);
            (this.pedestales || []).forEach(function (p) { p.destroy(); });
            this.pedestales = [];
            await Promise.all(this.cosas.map(function (a) {
                return tw(self, { targets: a.cont, alpha: 0, scale: 0.4, duration: 220 }).then(function () { a.destruir(); });
            }));
            this.cosas = [];
            this.ponerGancho(0.5, false);
            this.gancho.y = this.gancho.yBase;
        },

        alSonar: function () {
            var self = this;
            this.luces.forEach(function (l, i) {
                self.tweens.add({
                    targets: l, alpha: { from: 1, to: 0.2 }, scale: { from: 1.35, to: 0.8 },
                    duration: 120, yoyo: true, delay: i * 25
                });
            });
            (this.marquee || []).forEach(function (s, i) {
                self.tweens.add({
                    targets: s, scale: { from: 1.4, to: 0.7 }, alpha: { from: 1, to: 0.3 },
                    duration: 140, yoyo: true, delay: i * 40
                });
            });
            if (this.gancho && !this.bajando) {
                this.tweens.add({
                    targets: this.gancho, y: this.gancho.yBase + 8, angle: { from: -5, to: 5 },
                    duration: 150, yoyo: true, ease: 'Sine.easeInOut'
                });
            }
            // (Sin clic propio: nada debe sonar encima del sonido que hay que recordar.)
            if (this.altavoz && !Ut.reducido()) Ut.notas(this, this.L.altavoz.x, this.L.altavoz.y - this.L.altavoz.r, 2);
        },

        mostrarOpciones: async function (nv) {
            var self = this;
            var L = this.L;
            var lug = this.lugares(nv.opciones.length);
            this.armarPedestales(lug);
            var tam = this.tamOpciones(nv.opciones.length);
            this.peluchar(nv.opciones);
            var techo = L.cristal.y - L.cristal.h * 0.36;
            this.cosas = nv.opciones.map(function (id, i) {
                var a = self.crearCosa(id, lug[i].x, techo, tam, { depth: 12 });
                a.casa = lug[i];
                a.cont.setAlpha(0).setScale(0.8);
                a.fase = Math.random() * 6;
                return a;
            });
            // Cada objeto cae del techo de la máquina sobre su pedestal: rebota y salpica bolitas.
            await Promise.all(this.cosas.map(function (a, i) {
                return esperar(self, i * 160).then(function () {
                    ruidoMaq('aparece', function () { K.ruido({ f: 700, q: 1.2, dur: 0.08, vol: 0.05 }); });
                    self.tweens.add({ targets: a.cont, alpha: 1, duration: 120 });
                    return tw(self, {
                        targets: a.cont, y: a.casa.y, scale: 1,
                        duration: Ut.reducido() ? 200 : 560, ease: 'Bounce.easeOut'
                    }).then(function () {
                        self.agitarBolas(a.casa.x, 14);
                        Ut.estallido(self, a.casa.x, a.casa.y + tam * 0.4, {
                            n: 4, tex: 'estrella', tam: 11, dist: 34, sinTinte: true, depth: 30
                        });
                    });
                });
            }));
            this.ponerGancho(0.5, true);
        },

        cosaBajo: function (x) {
            var mejor = null, dmin = this.L.tam * 0.62;
            this.cosas.forEach(function (a) {
                if (!a.cont.active) return;
                var d = Math.abs(x - a.cont.x);
                if (d < dmin) { dmin = d; mejor = a; }
            });
            return mejor;
        },

        cosaEn: function (x, y) {
            var mejor = null, dmin = this.L.tam * 0.58;
            this.cosas.forEach(function (a) {
                if (!a.cont.active) return;
                var d = Math.hypot(x - a.cont.x, y - a.cont.y);
                if (d < dmin) { dmin = d; mejor = a; }
            });
            return mejor;
        },

        hitCirculo: function (p, c, r) {
            return Math.hypot(p.x - c.x, p.y - c.y) <= r;
        },

        /* ── Controles ── */

        alTocar: function (p) {
            if (this.fase !== 'jugar' || this.bajando || this.sonando) return;
            this.pista.reiniciar();

            if (this.hitCirculo(p, this.L.btn, this.L.btn.r * 1.25)) {
                this.atrapar();   // atrapar() ya hunde el botón y suena
                return;
            }
            if (this.hitCirculo(p, this.L.flechaL, this.L.flechaL.r * 1.25)) {
                this.arrastrando = { tipo: 'flecha', dir: -1 };
                this.joyDir = -1;
                this.iluminarFlecha(this.btnIzq, true);
                ruidoMaq('tic');
                return;
            }
            if (this.hitCirculo(p, this.L.flechaR, this.L.flechaR.r * 1.25)) {
                this.arrastrando = { tipo: 'flecha', dir: 1 };
                this.joyDir = 1;
                this.iluminarFlecha(this.btnDer, true);
                ruidoMaq('tic');
                return;
            }
            if (this.hitCirculo(p, this.L.joy, this.L.joy.r * 1.45)) {
                this.arrastrando = { tipo: 'joy' };
                this.actualizarJoy(p);
                return;
            }
            if (Math.abs(p.y - this.L.rielY) < 55 && Math.abs(p.x - this.gancho.x) < 70) {
                this.arrastrando = { tipo: 'gancho' };
                this.apuntarConX(p.x);
                return;
            }
            var c = this.cosaEn(p.x, p.y);
            if (c) {
                this.irYAtrapar(c);
                return;
            }
            var C = this.L.cristal;
            if (p.x > C.x - C.w / 2 && p.x < C.x + C.w / 2 && p.y > C.y - C.h / 2 && p.y < C.y + C.h / 2) {
                this.apuntarConX(p.x);
            }
        },

        alMover: function (p) {
            if (!this.arrastrando || this.bajando) return;
            if (this.arrastrando.tipo === 'joy') {
                this.actualizarJoy(p);
                return;
            }
            if (this.arrastrando.tipo === 'gancho') this.apuntarConX(p.x);
        },

        alSoltar: function () {
            if (!this.arrastrando) return;
            if (this.arrastrando.tipo === 'joy' || this.arrastrando.tipo === 'flecha') {
                this.joyDir = 0;
                this.joyObjetivo = 0;
                this.iluminarFlecha(this.btnIzq, false);
                this.iluminarFlecha(this.btnDer, false);
            }
            this.arrastrando = null;
        },

        /** Botón de flecha hundido (on) o arriba; mientras está hundido la palanca se inclina igual. */
        iluminarFlecha: function (btn, on) {
            if (!btn || !btn.tapa) return;
            btn.tapa.y = on ? btn.r * 0.12 : 0;
            btn.top.setFillStyle(on ? 0xffe066 : 0xffd43b);
            if (on) this.joyObjetivo = btn.dir * 0.85;
        },

        actualizarJoy: function (p) {
            var J = this.L.joy;
            var dx = Math.max(-J.r, Math.min(J.r, p.x - J.x));
            this.joyDir = dx / J.r;
            this.joyObjetivo = this.joyDir;
            // (El motor suena solo cuando el carrito se mueve: ver columpio.)
        },

        apuntarConX: function (x) {
            var L = this.L;
            var t = (x - (L.cristal.x - L.cristal.w * 0.42)) / (L.cristal.w * 0.84);
            this.ponerGancho(t, false);
            this.actualizarApuntado();
        },

        actualizarApuntado: function () {
            var c = this.cosaBajo(this.gancho.x);
            if (c !== this.apuntado) {
                if (this.apuntado && this.apuntado.cont && this.apuntado.cont.active) {
                    this.tweens.add({ targets: this.apuntado.cont, scale: 1, duration: 100 });
                }
                if (c) {
                    this.tweens.add({ targets: c.cont, scale: 1.14, duration: 100 });
                    ruidoMaq('tic', null, { vol: 0.7 });
                }
                this.apuntado = c;
            }
        },

        pulsarBoton: function () {
            if (!this.btnGrab) return;
            var t = this.btnGrab.tapa, r = this.L.btn.r;
            if (t) {
                this.tweens.killTweensOf(t);
                t.y = 0;
                this.tweens.add({ targets: t, y: r * 0.14, duration: 70, yoyo: true, hold: 90, ease: 'Quad.easeOut' });
            }
            if (this.btnHalo) this.tweens.add({ targets: this.btnHalo, scale: 1.25, alpha: 0.7, duration: 90, yoyo: true });
            ruidoMaq('boton', function () { K.ruido({ f: 1200, q: 1, dur: 0.05, vol: 0.05 }); });
        },

        irYAtrapar: async function (c) {
            if (this.bajando) return;
            var L = this.L;
            var t = (c.cont.x - (L.cristal.x - L.cristal.w * 0.42)) / (L.cristal.w * 0.84);
            await this.ponerGancho(t, true);
            this.apuntado = c;
            await this.atrapar();
        },

        atrapar: async function () {
            if (this.fase !== 'jugar' || this.bajando) return;
            this.bajando = true;
            this.arrastrando = null;
            this.joyDir = 0;
            this.pulsarBoton();
            var L = this.L;
            var c = this.apuntado || this.cosaBajo(this.gancho.x);
            var rel = c ? null : this.rellenoBajo(this.gancho.x);
            var yDest = c ? c.cont.y - c.tam * 0.38 : (rel ? rel.cont.y - rel.tam * 0.42 : L.pisoY - 16);
            ruidoMaq('bajar', function () { K.ruido({ f: 380, q: 1, dur: 0.28, vol: 0.07 }); });
            // La cámara se acerca al gancho mientras baja hacia el objeto.
            if (c) this.camaraA(c.cont.x, (L.rielY + yDest) / 2 + L.tam * 0.35, 1.22, 460);
            await tw(this, { targets: this.gancho, y: yDest, duration: 460, ease: 'Quad.easeIn' });
            this.gancho.yAbajo = yDest;
            this.swing.v += rnd(-0.5, 0.5);
            this.agitarBolas(this.gancho.x, c ? 10 : 18);
            Ut.estallido(this, this.gancho.x, yDest + 30, {
                n: 6, tex: 'gota', tam: 10, dist: 36, angulo: -Math.PI / 2, abanico: 1.2, depth: 40,
                colores: [0xffe066, 0xffffff]
            });

            if (!c) {
                await this.cerrarPinzas(true);
                if (rel) await this.levantarRelleno(rel);
                else await esperar(this, 120);
                await this.cerrarPinzas(false);
                await this.subirGancho();
                this.bajando = false;
                return;
            }

            this.tocado = c;
            await this.cerrarPinzas(true);
            var ok = await this.elegir(c.id, { x: c.cont.x, y: c.cont.y - c.tam * 0.4 });
            if (ok === false) {
                await esperar(this, 180);
                await this.cerrarPinzas(false);
                this.camaraNormal(420);
                await this.subirGancho();
                this.bajando = false;
            }
        },

        subirGancho: function () {
            var self = this;
            this.gancho.yAbajo = null;
            ruidoMaq('subir', null, { vol: 0.7 });
            return tw(this, {
                targets: this.gancho, y: this.gancho.yBase, duration: 420, ease: 'Sine.easeInOut'
            }).then(function () {
                self.gancho.angle = 0;
                self.dibujarPinzas(0);
            });
        },

        /* ── Respuestas ── */

        alAcertar: async function (ids) {
            var self = this;
            var c = this.tocado || this.cosas.filter(function (q) { return q.id === ids[0]; })[0];
            var L = this.L;
            if (!c) { this.bajando = false; return; }
            this.reunidos.push(c.id);
            this.cosas = this.cosas.filter(function (q) { return q !== c; });
            if (this.apuntado === c) this.apuntado = null;

            c.cont.setDepth(22);
            var son = this.sonar(c.id, { bocina: false });
            // 1. ¡Lo atrapó! El premio se acomoda en las pinzas y sube colgado (se mece con el gancho).
            this.colgar(c);
            this.tweens.add({ targets: c.img, angle: { from: -8, to: 8 }, duration: 90, yoyo: true, repeat: 2, onComplete: function () { c.img.angle = 0; } });
            ruidoMaq('subir', function () { K.ruido({ f: 700, q: 0.8, dur: 0.3, vol: 0.07 }); });
            await tw(this, { targets: this.gancho, y: this.gancho.yBase + 8, duration: 600, ease: 'Sine.easeInOut' });
            this.swing.v += 0.8;

            // 2. Viaja hasta la salida (la cámara vuelve a mostrar toda la máquina).
            var S = L.salida;
            this.camaraNormal(480);
            await tw(this, { targets: this.gancho, x: S.x, duration: 520, ease: 'Sine.easeInOut' });
            this.ganchoX = (S.x - (L.cristal.x - L.cristal.w * 0.42)) / (L.cristal.w * 0.84);
            await esperar(this, 220);   // se mece un instante sobre la rampa

            // 3. Abre las pinzas y el premio cae por la rampa.
            await this.cerrarPinzas(false);
            this.colgar(null);
            var esc0 = c.cont.scale;
            await tw(this, {
                targets: c.cont, y: S.y + S.h * 0.1, x: S.x, scale: esc0 * 0.75, rotation: 0,
                duration: 320, ease: 'Quad.easeIn'
            });
            c.cont.setVisible(false);
            ruidoMaq('cae', function () { K.ruido({ f: 260, q: 0.7, dur: 0.22, vol: 0.07 }); });
            var vuelta = this.subirGancho();
            await esperar(this, 240);

            // 4. Sale en el cajón de premios con rebote y el cajón destella.
            var P = L.premio;
            var escC = Math.min(0.6, (P.w * 0.42) / c.tam);
            c.cont.setVisible(true).setPosition(P.x, P.y - P.h * 1.1).setScale(escC * 0.6).setAngle(0).setDepth(15);
            vibrar(this, [30, 50, 30]);
            this.destelloCajon();
            await tw(this, { targets: c.cont, y: P.y - 2, scale: escC, duration: 480, ease: 'Bounce.easeOut' });
            Ut.estallido(this, P.x, P.y, { n: 10, tex: 'estrella', tam: 16, dist: 70, sinTinte: true, depth: 60 });
            this.fiestaLuces();

            // 5. Vuela a su repisa en la vitrina del mall.
            var k = this.ganados.length;
            this.ganados.push(c);
            await esperar(this, 260);
            await this.aVitrina(c, k, true);
            await vuelta;
            await son;
            this.bajando = false;
        },

        /** Error: las pinzas levantan el objeto, pero se resbala y cae de nuevo en su pedestal. */
        alFallar: async function () {
            var self = this;
            var c = this.tocado;
            if (!c) return;
            c.cont.setDepth(22);
            this.colgar(c);
            await tw(this, { targets: this.gancho, y: this.gancho.y - c.tam * 0.35, duration: 320, ease: 'Sine.easeOut' });
            await c.sacudir();
            this.colgar(null);
            this.cerrarPinzas(false);
            await tw(this, {
                targets: c.cont, x: c.casa.x, y: c.casa.y, rotation: 0,
                duration: Ut.reducido() ? 150 : 460, ease: 'Bounce.easeOut'
            });
            c.cont.setDepth(12);
            this.agitarBolas(c.casa.x, 12);
            ruidoMaq('cae', function () { K.ruido({ f: 200, q: 0.6, dur: 0.2, vol: 0.05 }); }, { vol: 0.45 });
            this.tweens.add({ targets: c.cont, scale: 1, duration: 120 });
            if (self.apuntado === c) self.apuntado = null;
        },

        alTerminarNivel: async function () {
            var self = this;
            await Promise.all(this.cosas.map(function (a, i) {
                return esperar(self, i * 70).then(function () {
                    return tw(self, { targets: a.cont, alpha: 0, scale: 0.3, duration: 220 });
                });
            }));
            (this.pedestales || []).forEach(function (p) { p.destroy(); });
            this.pedestales = [];
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando || this.bajando) return Promise.resolve();
            var no = function () { return cancelada() || self.fase !== 'jugar' || self.bajando; };
            if (this.ayuda) {
                var ok = this.cosas.filter(function (c) { return self.respuestas().indexOf(c.id) >= 0; })[0];
                if (ok) {
                    return this.ctx.mano({ punto: { x: ok.cont.x, y: ok.cont.y }, holdMs: 450, cancelado: no });
                }
            }
            return this.ctx.mano({ punto: { x: this.L.btn.x, y: this.L.btn.y }, holdMs: 500, cancelado: no });
        },

        /** Desfile final: los premios bajan de la vitrina a la máquina uno por uno y bailan juntos. */
        escenaFinal: async function () {
            var self = this;
            var L = this.L;
            await this.alTerminarNivel();
            await this.camaraNormal(300);
            this.desfile = true;
            var lista = this.ganados.slice();
            var n = lista.length;
            var paso = 620;
            var filas = this.lugares(Math.max(1, n));
            for (var i = 0; i < n; i++) {
                (function (c, k) {
                    self.time.delayedCall(k * paso, async function () {
                        if (!c.cont.active) return;
                        var x1 = filas[k].x;
                        var y1 = filas[k].y;
                        var escD = Math.min(1, self.tamOpciones(n) / c.tam);
                        c.cont.setDepth(60);
                        ruidoMaq('vuelo');
                        await Ut.volarA(self, c.cont, x1, y1, 560, escD, null, 120);
                        if (!c.cont.active) return;
                        c.cont.setDepth(22);
                        var hueco = self.huecos[k % Math.max(1, self.huecos.length)];
                        if (hueco) hueco.setVisible(true);
                        self.agitarBolas(x1, 14);
                        self.sonar(c.id, { breve: true, bocina: false });
                        c.saltito(0.2, 2);
                        self.luces.forEach(function (l, j) {
                            self.tweens.add({ targets: l, alpha: 0.2, duration: 120, yoyo: true, repeat: 2, delay: j * 20 });
                        });
                    });
                })(lista[i], i);
            }
            await esperar(this, 900 + n * paso);
            // Todos bailan juntos: ola de saltitos, luces de colores, aplausos y confeti.
            lista.forEach(function (c, k) {
                self.time.delayedCall(k * 110, function () { if (c.cont.active) c.saltito(0.28, 3); });
            });
            this.fiestaLuces();
            ruidoMaq('aplausos');
            Ut.confeti(this, 60);
            Ut.estallido(this, L.maq.x, L.cristal.y, { n: 22, tex: 'estrella', tam: 26, dist: 210, sinTinte: true, depth: 75 });
            await esperar(this, 1400);
        },

        demoPaso: function () {
            var self = this;
            var c = this.correctaDe(this.cosas);
            if (!c) return null;
            return {
                desde: { x: this.L.btn.x, y: this.L.btn.y },
                mantener: 350,
                hacer: function () { return self.irYAtrapar(c); }
            };
        },

        salirDemo: function () {
            if (this.ctx.quitarMano) this.ctx.quitarMano();
            this.fase = 'intro';
            this.nv = null;
            this.marcadas = [];
            this.paso = 0;
            this.errores = 0;
            this.arrastrando = null;
            this.bajando = false;
            this.joyDir = 0;
            this.pista.parar();
            this.reunidos = [];
            (this.ganados || []).forEach(function (c) { c.destruir(); });
            this.ganados = [];
            // La vitrina vuelve a quedar vacía después del ejemplo.
            (this.huecos || []).forEach(function (h) { h.setVisible(true); });
            this.colgar(null);
            this.desfile = false;
            this.camaraNormal(200);
        },

        estadoExtra: function () {
            return {
                gancho: { x: Math.round(this.gancho.x), y: Math.round(this.gancho.y), t: Math.round(this.ganchoX * 100) },
                cosas: this.cosas.map(function (c) {
                    return { id: c.id, x: Math.round(c.cont.x), y: Math.round(c.cont.y) };
                }),
                premios: this.ganados.length
            };
        },

        paso: function (time, delta) {
            this.columpio(delta);
            if (this.joyG) {
                var obj = this.joyObjetivo || 0;
                var antes = this.joyVis;
                this.joyVis += (obj - this.joyVis) * Math.min(1, delta / 60);
                if (Math.abs(this.joyVis - antes) > 0.002 || Math.abs(obj - this.joyVis) > 0.002) this.dibujarJoy(this.joyVis);
            }
            if (this.ledGancho) {
                var moviendo = this.bajando || Math.abs(this.swing.vx) > 60;
                this.ledGancho.setFillStyle(moviendo ? 0xff6b6b : 0x51cf66);
                this.ledGancho.setAlpha(moviendo ? 0.55 + 0.45 * Math.sin(time / 70) : 0.85);
            }
            if (this.ledsPanel) {
                var nL = this.ledsPanel.length;
                var cabezaLuz = (time / (this.fase === 'jugar' ? 90 : 160)) % nL;
                this.ledsPanel.forEach(function (l, i) {
                    var d = Math.min(Math.abs(i - cabezaLuz), nL - Math.abs(i - cabezaLuz));
                    l.setAlpha(d < 1.5 ? 1 : 0.28);
                });
            }
            this.dibujarCable();
            this.dibujarMira();
            this.vibrarAltavoz(time);

            if (this.fase === 'jugar' && !this.bajando && this.joyDir && Math.abs(this.joyDir) > 0.15) {
                var vel = this.joyDir * (delta / 1000) * 0.62;
                this.ponerGancho(this.ganchoX + vel, false);
                this.actualizarApuntado();
            }

            // Halo del botón late cuando se puede atrapar.
            if (this.btnHalo) {
                if (this.fase === 'jugar' && !this.bajando && !this.sonando) {
                    var pulso = 1 + Math.sin(time / 220) * 0.12;
                    this.btnHalo.setScale(pulso);
                    this.btnHalo.setAlpha(0.28 + Math.sin(time / 220) * 0.22);
                } else {
                    this.btnHalo.setAlpha(0.12);
                    this.btnHalo.setScale(1);
                }
            }

            this.cosas.forEach(function (a) {
                if (!a.casa || (this.bajando && a === this.tocado)) return;
                if (this.tweens.isTweening(a.cont)) return;
                a.fase = (a.fase || 0) + 0.03;
                a.cont.y = a.casa.y + Math.sin(a.fase) * 3;
                if (a !== this.apuntado) a.cont.angle = Math.sin(a.fase * 0.7) * 3;
            }, this);

            if (!this.desfile) {
                (this.ganados || []).forEach(function (c, k) {
                    if (!c.cont.active || c.cont.depth > 4 || this.tweens.isTweening(c.cont)) return;
                    c.cont.angle = Math.sin(time / 650 + k * 1.7) * 4;
                }, this);
            }

            if (!this.sonando && this.luces) {
                this.luces.forEach(function (l, i) {
                    if (i % 2 === 1) return; // halos aparte
                    l.setAlpha(0.7 + Math.sin(time / 260 + i) * 0.3);
                });
            }
            (this.marquee || []).forEach(function (s, i) {
                s.setAlpha(0.55 + Math.sin(time / 200 + i * 0.5) * 0.45);
                s.angle = Math.sin(time / 400 + i) * 12;
            });
        }
    };

    K.crear({ id: 'maquina', fondo: '#1b3a5f', escena: escena });
})(typeof window !== 'undefined' ? window : this);
