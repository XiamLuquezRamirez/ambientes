/**
 * «La máquina del centro comercial» — motor propio de ¿Qué escuchaste? (3-4 años).
 *
 * Máquina de peluches en el mall. Mientras suena, las luces y el letrero parpadean (sin delatar).
 * Luego salen los objetos en pedestales. El niño mueve el gancho (joystick, flechas mantenidas o
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
            L.salida = {
                x: L.cristal.x - L.cristal.w * 0.36,
                y: L.cristal.y + L.cristal.h * 0.3,
                w: L.cristal.w * 0.14,
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
            return L;
        },

        armar: function (reubicar) {
            var self = this;
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            this.montarMall(keep);
            this.montarMaquina(keep);
            this.sembrarDecor(keep);
            this.montarControles(keep);
            this.montarGancho(keep);
            this.sembrarMotes(keep, 22, { x: 0, y: 0, w: L.W, h: L.H * 0.35, depth: 2 }, 0xffe066);
            keep(K.nino(this, Math.min(L.W - 80, L.maq.x + L.maq.w * 0.5), L.maq.y + L.maq.h * 0.5, 50, {
                ropa: 0xff6b6b, pelo: 0x5c3317, esc: 2.2
            }));
            this.montarHud(keep);
            if (reubicar) {
                this.ubicarCosas();
                this.ponerGancho(this.ganchoX, false);
                this.ganados.forEach(function (a, k) { self.meterPremio(a, k, false); });
            }
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
            var L = this.L;
            var panel = keep(this.add.graphics().setDepth(16));
            panel.fillStyle(0x364fc7, 1);
            panel.fillRoundedRect(L.maq.x - L.maq.w * 0.36, L.panel.y - L.panel.h * 0.48, L.maq.w * 0.72, L.panel.h, 24);
            panel.fillStyle(0x4c6ef5, 1);
            panel.fillRoundedRect(L.maq.x - L.maq.w * 0.34, L.panel.y - L.panel.h * 0.36, L.maq.w * 0.68, L.panel.h * 0.72, 18);
            panel.fillStyle(0xffffff, 0.08);
            panel.fillRoundedRect(L.maq.x - L.maq.w * 0.33, L.panel.y - L.panel.h * 0.32, L.maq.w * 0.66, L.panel.h * 0.2, 12);

            this.btnIzq = this.dibujarFlecha(keep, L.flechaL, -1);
            this.btnDer = this.dibujarFlecha(keep, L.flechaR, 1);

            var J = L.joy;
            keep(this.add.circle(J.x, J.y, J.r * 1.35, 0x1b1f24, 1).setDepth(17).setStrokeStyle(6, 0x0b132b));
            keep(this.add.circle(J.x, J.y, J.r * 1.05, 0x495057, 1).setDepth(17));
            this.joyStick = keep(this.add.container(J.x, J.y).setDepth(18));
            var palo = this.add.rectangle(0, -J.r * 0.1, 16, J.r * 0.75, 0xced4da);
            var bola = this.add.circle(0, -J.r * 0.55, J.r * 0.58, 0xe03131).setStrokeStyle(5, 0xffffff);
            var cruz = this.add.graphics();
            cruz.lineStyle(4, 0xffffff, 1);
            cruz.lineBetween(0, -J.r * 0.9, 0, -J.r * 0.2);
            cruz.lineBetween(-J.r * 0.35, -J.r * 0.55, J.r * 0.35, -J.r * 0.55);
            this.joyStick.add([palo, bola, cruz]);
            this.joyBase = { x: J.x, y: J.y };

            var B = L.btn;
            this.btnHalo = keep(this.add.circle(B.x, B.y, B.r * 1.45, 0x69db7c, 0.35).setDepth(17));
            this.btnGrab = keep(this.add.container(B.x, B.y).setDepth(18));
            var aro = this.add.circle(0, 0, B.r * 1.18, 0x2b8a3e);
            var disco = this.add.circle(0, 0, B.r, 0x51cf66).setStrokeStyle(7, 0xffffff);
            var flecha = this.add.graphics();
            flecha.fillStyle(0xffffff, 1);
            flecha.fillTriangle(-B.r * 0.32, -B.r * 0.18, B.r * 0.32, -B.r * 0.18, 0, B.r * 0.4);
            flecha.fillRect(-B.r * 0.14, -B.r * 0.45, B.r * 0.28, B.r * 0.36);
            var txt = this.add.text(0, B.r * 1.4, 'ATRAPAR', {
                fontFamily: 'Nunito, Arial',
                fontSize: Math.round(Math.max(18, B.r * 0.4)) + 'px',
                fontStyle: 'bold',
                color: '#ffffff',
                stroke: '#1b5e20',
                strokeThickness: 5
            }).setOrigin(0.5);
            this.btnGrab.add([aro, disco, flecha, txt]);
            this.btnGrab.disco = disco;
        },

        dibujarFlecha: function (keep, Q, dir) {
            var c = keep(this.add.container(Q.x, Q.y).setDepth(17));
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

        /* ── Gancho ── */

        montarGancho: function (keep) {
            var L = this.L;
            var riel = keep(this.add.graphics().setDepth(19));
            riel.fillStyle(0x868e96, 1);
            riel.fillRoundedRect(L.cristal.x - L.cristal.w * 0.46, L.rielY - 10, L.cristal.w * 0.92, 20, 8);
            riel.fillStyle(0x343a40, 1);
            riel.fillRoundedRect(L.cristal.x - L.cristal.w * 0.46, L.rielY - 3, L.cristal.w * 0.92, 8, 4);

            this.miraG = keep(this.add.graphics().setDepth(10));
            this.cableG = keep(this.add.graphics().setDepth(20));
            this.gancho = keep(this.add.container(L.cristal.x, L.rielY + 52).setDepth(21));

            var carro = this.add.rectangle(0, -46, 58, 22, 0xffd43b).setStrokeStyle(4, 0xfab005);
            var cabeza = this.add.graphics();
            cabeza.fillStyle(0xadb5bd, 1);
            cabeza.fillRoundedRect(-18, -26, 36, 30, 8);
            cabeza.fillStyle(0xdee2e6, 1);
            cabeza.fillCircle(0, -10, 11);
            cabeza.fillStyle(0xe03131, 1);
            cabeza.fillCircle(0, -10, 6);

            this.pinzaL = this.add.graphics();
            this.pinzaR = this.add.graphics();
            this.pinzaC = this.add.graphics();
            this.dibujarPinzas(0);
            this.gancho.add([carro, cabeza, this.pinzaL, this.pinzaR, this.pinzaC]);
            this.pinzaApertura = 0;
            this.gancho.yBase = L.rielY + 56;
            this.ganchoX = 0.5;
            this.ponerGancho(0.5, false);
        },

        /** apertura 0 = abierta, 1 = cerrada. */
        dibujarPinzas: function (apertura) {
            var a = Math.max(0, Math.min(1, apertura));
            var spread = 28 - a * 16;
            var tipY = 50 - a * 8;
            function garra(g, sx, ex) {
                g.clear();
                g.lineStyle(9, 0xced4da, 1);
                g.beginPath();
                g.moveTo(sx * 0.35, 4);
                g.lineTo(ex, tipY);
                g.strokePath();
                g.fillStyle(0xf1f3f5, 1);
                g.fillTriangle(ex - 8, tipY - 4, ex + 8, tipY - 4, ex, tipY + 12);
            }
            if (this.pinzaL) garra(this.pinzaL, -1, -spread);
            if (this.pinzaR) garra(this.pinzaR, 1, spread);
            if (this.pinzaC) {
                this.pinzaC.clear();
                this.pinzaC.lineStyle(8, 0xadb5bd, 1);
                this.pinzaC.beginPath();
                this.pinzaC.moveTo(0, 6);
                this.pinzaC.lineTo(0, tipY + 4);
                this.pinzaC.strokePath();
                this.pinzaC.fillStyle(0xdee2e6, 1);
                this.pinzaC.fillTriangle(-7, tipY, 7, tipY, 0, tipY + 14);
            }
            this.pinzaApertura = a;
        },

        cerrarPinzas: function (cerrar) {
            var self = this;
            var desde = this.pinzaApertura || 0;
            var hasta = cerrar ? 1 : 0;
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
            g.lineBetween(h.x, L.rielY, h.x, h.y - 42);
            g.fillStyle(0xffd43b, 1);
            g.fillRoundedRect(h.x - 16, L.rielY - 12, 32, 16, 4);
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

        sembrarDecor: function (keep) {
            var L = this.L, C = L.cristal;
            var cols = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xcc5de8, 0xff922b, 0x20c997, 0xf783ac, 0x748ffc];
            this.decor = [];
            for (var i = 0; i < 9; i++) {
                var x = C.x - C.w * 0.3 + (i % 5) * C.w * 0.15;
                var y = L.pisoY - 10 - Math.floor(i / 5) * 42 - (i % 2) * 8;
                if (x < L.salida.x + L.salida.w * 0.7 && x > L.salida.x - L.salida.w * 0.7) continue;
                var c = keep(this.add.container(x, y).setDepth(9).setAlpha(0.55));
                var g = this.add.graphics();
                var col = cols[i % cols.length];
                var r = 18 + (i % 3) * 3;
                g.fillStyle(col, 1);
                g.fillCircle(0, 0, r);
                g.fillCircle(-r * 0.7, -r * 0.55, r * 0.35);
                g.fillCircle(r * 0.7, -r * 0.55, r * 0.35);
                g.fillStyle(0xffffff, 0.9);
                g.fillCircle(-r * 0.28, -r * 0.1, r * 0.22);
                g.fillCircle(r * 0.28, -r * 0.1, r * 0.22);
                g.fillStyle(0x212529, 1);
                g.fillCircle(-r * 0.28, -r * 0.1, r * 0.1);
                g.fillCircle(r * 0.28, -r * 0.1, r * 0.1);
                c.add(g);
                c.fase = Math.random() * 6;
                c.y0 = y;
                this.decor.push(c);
            }
        },

        lugares: function (n) {
            var L = this.L, out = [];
            var x0 = L.cristal.x - L.cristal.w * 0.28;
            var x1 = L.cristal.x + L.cristal.w * 0.34;
            var y = L.pisoY - L.tam * 0.22;
            for (var i = 0; i < n; i++) {
                var t = n === 1 ? 0.5 : i / (n - 1);
                out.push({ x: x0 + (x1 - x0) * t, y: y });
            }
            return out;
        },

        armarPedestales: function (lug) {
            var self = this;
            (this.pedestales || []).forEach(function (p) { p.destroy(); });
            this.pedestales = lug.map(function (q) {
                var g = self.add.graphics().setDepth(10);
                g.fillStyle(0xffd43b, 0.95);
                g.fillEllipse(q.x, q.y + self.L.tam * 0.42, self.L.tam * 0.55, 16);
                g.fillStyle(0xfab005, 1);
                g.fillEllipse(q.x, q.y + self.L.tam * 0.4, self.L.tam * 0.42, 10);
                return g;
            });
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

        prepararNivel: async function () {
            var self = this;
            this.bajando = false;
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
            K.ruido({ f: 900, q: 2, dur: 0.08, vol: 0.04 });
        },

        mostrarOpciones: async function (nv) {
            var self = this;
            var L = this.L;
            var lug = this.lugares(nv.opciones.length);
            this.armarPedestales(lug);
            var tam = Math.min(L.tam, L.cristal.w / Math.max(3, nv.opciones.length) * 0.7);
            this.cosas = nv.opciones.map(function (id, i) {
                var a = self.crearCosa(id, lug[i].x, lug[i].y + 50, tam, { depth: 12 });
                a.casa = lug[i];
                a.cont.setAlpha(0).setScale(0.35);
                a.fase = Math.random() * 6;
                return a;
            });
            K.tono({ f: 520, f2: 880, dur: 0.35, vol: 0.04 });
            await Promise.all(this.cosas.map(function (a, i) {
                return esperar(self, i * 120).then(function () {
                    K.ruido({ f: 700, q: 1.2, dur: 0.08, vol: 0.05 });
                    Ut.estallido(self, a.casa.x, a.casa.y + 20, {
                        n: 5, tex: 'estrella', tam: 12, dist: 40, sinTinte: true, depth: 30
                    });
                    return tw(self, {
                        targets: a.cont, alpha: 1, scale: 1, y: a.casa.y,
                        duration: 400, ease: 'Back.easeOut'
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
                this.pulsarBoton();
                this.atrapar();
                return;
            }
            if (this.hitCirculo(p, this.L.flechaL, this.L.flechaL.r * 1.25)) {
                this.arrastrando = { tipo: 'flecha', dir: -1 };
                this.joyDir = -1;
                this.iluminarFlecha(this.btnIzq, true);
                K.tono({ f: 640, f2: 700, dur: 0.04, vol: 0.03 });
                return;
            }
            if (this.hitCirculo(p, this.L.flechaR, this.L.flechaR.r * 1.25)) {
                this.arrastrando = { tipo: 'flecha', dir: 1 };
                this.joyDir = 1;
                this.iluminarFlecha(this.btnDer, true);
                K.tono({ f: 640, f2: 700, dur: 0.04, vol: 0.03 });
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
                if (this.joyStick) {
                    this.joyStick.setPosition(this.joyBase.x, this.joyBase.y);
                    this.joyStick.angle = 0;
                }
                this.iluminarFlecha(this.btnIzq, false);
                this.iluminarFlecha(this.btnDer, false);
            }
            this.arrastrando = null;
        },

        iluminarFlecha: function (btn, on) {
            if (!btn || !btn.fondo) return;
            btn.fondo.setFillStyle(on ? 0xffec99 : 0xffd43b);
            btn.setScale(on ? 1.12 : 1);
        },

        actualizarJoy: function (p) {
            var J = this.L.joy;
            var dx = Math.max(-J.r, Math.min(J.r, p.x - J.x));
            this.joyDir = dx / J.r;
            if (this.joyStick) {
                this.joyStick.setPosition(J.x + dx * 0.6, J.y - 4);
                this.joyStick.angle = dx * 0.22;
            }
            if (this.time.now - (this.zumbido || 0) > 70) {
                this.zumbido = this.time.now;
                K.ruido({ f: 1600, q: 3, dur: 0.02, vol: 0.012 });
            }
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
                    K.tono({ f: 880, f2: 980, dur: 0.04, vol: 0.025 });
                }
                this.apuntado = c;
            }
        },

        pulsarBoton: function () {
            if (!this.btnGrab) return;
            this.tweens.add({ targets: this.btnGrab, scale: 0.86, duration: 70, yoyo: true });
            if (this.btnHalo) this.tweens.add({ targets: this.btnHalo, scale: 1.25, alpha: 0.7, duration: 90, yoyo: true });
            K.tono({ f: 480, f2: 720, dur: 0.08, vol: 0.05 });
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
            var yDest = c ? c.cont.y - c.tam * 0.38 : L.pisoY - 16;
            K.ruido({ f: 380, q: 1, dur: 0.28, vol: 0.07 });
            await tw(this, { targets: this.gancho, y: yDest, duration: 440, ease: 'Quad.easeIn' });
            this.gancho.yAbajo = yDest;
            Ut.estallido(this, this.gancho.x, yDest + 30, {
                n: 6, tex: 'gota', tam: 10, dist: 36, angulo: -Math.PI / 2, abanico: 1.2, depth: 40,
                colores: [0xffe066, 0xffffff]
            });

            if (!c) {
                K.tono({ f: 220, f2: 140, dur: 0.2, vol: 0.05 });
                await this.cerrarPinzas(true);
                await esperar(this, 120);
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
                await this.subirGancho();
                this.bajando = false;
            }
        },

        subirGancho: function () {
            var self = this;
            this.gancho.yAbajo = null;
            return tw(this, {
                targets: this.gancho, y: this.gancho.yBase, duration: 380, ease: 'Sine.easeInOut'
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
            K.ruido({ f: 700, q: 0.8, dur: 0.3, vol: 0.07 });
            await tw(this, {
                targets: this.gancho, y: this.gancho.yBase + 8, duration: 520, ease: 'Sine.easeOut',
                onUpdate: function () {
                    c.cont.x = self.gancho.x;
                    c.cont.y = self.gancho.y + 46;
                }
            });

            var S = L.salida;
            await tw(this, {
                targets: this.gancho, x: S.x, duration: 420, ease: 'Sine.easeInOut',
                onUpdate: function () {
                    c.cont.x = self.gancho.x;
                    c.cont.y = self.gancho.y + 46;
                }
            });
            this.ganchoX = (S.x - (L.cristal.x - L.cristal.w * 0.42)) / (L.cristal.w * 0.84);

            await this.cerrarPinzas(false);
            K.tono({ f: 880, f2: 1200, dur: 0.18, vol: 0.05 });
            var k = this.ganados.length;
            var dest = this.meterPremio(c, k, true);
            await tw(this, {
                targets: c.cont, x: dest.x, y: dest.y, scale: dest.esc, angle: rnd(-20, 20),
                duration: 560, ease: 'Bounce.easeOut'
            });
            c.cont.setDepth(15 - k * 0.01);
            this.ganados.push(c);
            await this.subirGancho();
            await son;
            this.bajando = false;
            this.luces.forEach(function (l, i) {
                self.tweens.add({ targets: l, alpha: 0.2, duration: 90, yoyo: true, repeat: 2, delay: i * 15 });
            });
            Ut.estallido(this, dest.x, dest.y, { n: 12, tex: 'estrella', tam: 18, dist: 80, sinTinte: true, depth: 60 });
        },

        alFallar: async function () {
            var c = this.tocado;
            if (!c) return;
            await c.sacudir();
            K.ruido({ f: 200, q: 0.6, dur: 0.2, vol: 0.05 });
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

        escenaFinal: async function () {
            var self = this;
            var L = this.L;
            await this.alTerminarNivel();
            var lista = this.ganados.slice();
            var n = lista.length;
            for (var i = 0; i < n; i++) {
                (function (c, k) {
                    self.time.delayedCall(k * 520, async function () {
                        if (!c.cont.active) return;
                        var x1 = L.cristal.x - L.cristal.w * 0.28 + L.cristal.w * 0.56 * ((k + 0.5) / Math.max(1, n));
                        var y1 = L.pisoY - L.tam * 0.2;
                        await tw(self, {
                            targets: c.cont, x: x1, y: y1, scale: 1, angle: 0,
                            duration: 480, ease: 'Back.easeOut'
                        });
                        c.cont.setDepth(22);
                        self.sonar(c.id, { breve: true, bocina: false });
                        c.saltito(0.2, 2);
                        self.luces.forEach(function (l, j) {
                            self.tweens.add({ targets: l, alpha: 0.2, duration: 120, yoyo: true, repeat: 2, delay: j * 20 });
                        });
                    });
                })(lista[i], i);
            }
            await esperar(this, 900 + n * 520);
            Ut.estallido(this, L.maq.x, L.cristal.y, { n: 22, tex: 'estrella', tam: 26, dist: 210, sinTinte: true, depth: 75 });
            await esperar(this, 1000);
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
            this.dibujarCable();
            this.dibujarMira();

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

            (this.decor || []).forEach(function (d) {
                d.fase += 0.02;
                d.y = d.y0 + Math.sin(d.fase) * 2.5;
            });

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
