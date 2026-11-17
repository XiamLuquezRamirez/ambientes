/**
 * «Apagón» — motor propio de Sonido y objeto (5-6 años).
 *
 * Se fue la luz en la casa. Suena algo (una puerta que rechina…). El niño mueve la LINTERNA con el
 * dedo por la sala a oscuras: lo que queda bajo la luz un momento se descubre (brilla) y entonces
 * puede tocarlo. Si es lo que sonó, el objeto hace su acción (la puerta se abre) y se enciende una
 * lámpara a su lado: la casa se va iluminando con cada acierto. Si no, el objeto deja oír su
 * propio sonido y la linterna parpadea.
 *
 * Niveles: 1 el reto · 2 otro sonido con más objetos · 3 relámpagos y la pila de la linterna se
 * gasta (la luz se achica; tocar la bocina la recarga) · 4 cada acierto trae un sonido nuevo.
 */
(function (global) {
    'use strict';

    var K = global.AsociaKit;
    var Ut = global.PedniaParejaBase.util;
    var Act = global.AsociaActores;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var rnd = Ut.rnd;
    var EXTRA = ['reloj', 'ventilador', 'aspiradora', 'licuadora'];
    var ALTOS = { ventana: 1, reloj: 1 };

    // Escenario del diseño (img/diseno/fondo.svg, lienzo 1280×720): sala con pared de rayas, zócalo,
    // piso de madera, alfombra roja y mesita con lámpara en el centro. Medidas tomadas por color.
    var DISENO = 'img/diseno/';
    var FONDO_W = 1280, FONDO_H = 720;
    var SALA = {
        piso: 527,                 // fin del zócalo (495-526): aquí empieza el piso
        anchoUtil: 1080,           // ancho del dibujo que siempre debe caber en pantalla
        tam: 135,                  // alto de cada objeto en unidades del dibujo (la mesita mide 230 de ancho)
        pared: { y: 330, xs: [250, 640, 1030] },
        suelo: { y: 615, xs: [150, 420, 860, 1130] },   // 420 y 860 sobre la alfombra, a los lados de la mesa
        lampara: { x: 633, y: 490, r: 30 },              // pantalla de la lámpara de la mesita
        mesa: { x: 700, y: 549 }                         // tablero de la mesita (donde duerme el gato)
    };

    var escena = {
        iniciar: function () { this.objs = []; this.luz = null; this.pila = 1; },

        preload: function () {
            if (!this.textures.exists('so_fondo')) this.load.svg('so_fondo', DISENO + 'fondo.svg', { width: 1920, height: 1080 });
        },

        /** Encaje del fondo: cubre la pantalla anclado abajo, pero sin recortar el ancho útil. */
        marcoFondo: function (W, H) {
            if (!this.textures.exists('so_fondo')) return null;
            var k = Math.min(Math.max(W / FONDO_W, H / FONDO_H), W / SALA.anchoUtil);
            var ox = (W - FONDO_W * k) / 2, oy = H - FONDO_H * k;
            return { k: k, ox: ox, oy: oy, sx: function (x) { return ox + x * k; }, sy: function (y) { return oy + y * k; } };
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var F = L.F = this.marcoFondo(W, H);
            L.y0 = F ? Math.round(F.sy(SALA.piso)) : Math.round(H * 0.66);
            var hueco = Math.max(60, H * 0.16);
            L.bocina = { x: W / 2, y: Math.max(60, Math.min(100, 56 + hueco * 0.2)), r: Math.max(28, Math.min(40, hueco * 0.3)) };
            L.pres = W >= 760 ? { x: W - 72, piso: H - 104, alto: Math.min(160, H * 0.28), modelo: 'nino' } : null;
            var der = L.pres ? W - 150 : W - 20;
            if (F) return this.calcularConFondo(L, F, der);
            L.tam = Math.max(80, Math.min(150, H * 0.22, (der - 20) / 5.2));
            L.radio = Math.max(90, Math.min(160, L.tam * 1.05));
            // Sitios: tres en la pared (altos) y tres en el piso, alternados.
            var n = 6, x0 = 20 + L.tam * 0.55, x1 = der - L.tam * 0.55;
            L.sitios = [];
            for (var i = 0; i < n; i++) {
                var x = x0 + (x1 - x0) * i / (n - 1);
                var alto = i % 2 === 1;
                L.sitios.push({ x: x, y: alto ? L.y0 - L.tam * 1.05 : L.y0 + (H - L.y0) * 0.42, alto: alto });
            }
            L.gato = { x: W * 0.5, y: L.y0 - L.tam * 0.25, t: 10 };
            return L;
        },

        /** Sitios sobre la sala del diseño: tres en la pared y cuatro en el piso. */
        calcularConFondo: function (L, F, der) {
            L.tam = Math.max(70, SALA.tam * F.k);
            L.radio = Math.max(90, Math.min(170, L.tam * 1.1));
            var x0 = 20 + L.tam * 0.55, x1 = der - L.tam * 0.55;
            L.sitios = [];
            // En pantallas altas sobra pared encima del dibujo: la fila de la pared sube hacia el medio.
            var techo = L.bocina.y + L.bocina.r + 40;
            var yPared = Math.min(F.sy(SALA.pared.y), L.y0 - Math.max(L.tam * 1.4, (L.y0 - techo) * 0.4));
            [[SALA.pared, true], [SALA.suelo, false]].forEach(function (fila) {
                var ult = -1e9;
                fila[0].xs.forEach(function (dx) {
                    var x = Math.max(x0, Math.min(x1, F.sx(dx)));
                    // Si al acotar quedó encima del anterior (pantalla angosta o presentador), se descarta.
                    if (x - ult < L.tam * 0.95) return;
                    ult = x;
                    L.sitios.push({ x: x, y: fila[1] ? yPared : F.sy(fila[0].y), alto: fila[1] });
                });
            });
            L.lampara = { x: F.sx(SALA.lampara.x), y: F.sy(SALA.lampara.y), r: SALA.lampara.r * F.k };
            var t = Math.max(7, Math.min(13, 10 * F.k));
            // El gato duerme sobre la mesita, a la derecha de la lámpara (cabeza = tablero - cuerpo).
            L.gato = { x: F.sx(SALA.mesa.x), y: F.sy(SALA.mesa.y) - t * 4.8, t: t };
            return L;
        },

        armar: function (reubicar) {
            var self = this;
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            if (L.F) {
                // Sala del diseño. Si sobra pantalla arriba, la pared sigue con la franja superior del
                // dibujo estirada hacia arriba (las rayas son verticales, así que empalman sin costura).
                var F = L.F, fw = FONDO_W * F.k, fh = FONDO_H * F.k;
                var tex = this.textures.get('so_fondo');
                if (F.oy > 0) {
                    var src = tex.getSourceImage();
                    if (!tex.has('franja')) tex.add('franja', 0, 0, 0, src.width, Math.max(2, Math.round(src.height / 120)));
                    keep(this.add.image(F.ox, F.oy + 1, 'so_fondo', 'franja').setOrigin(0, 1).setDisplaySize(fw, F.oy + 2).setDepth(0));
                }
                // '__BASE' explícito: al añadir 'franja', Phaser la vuelve el primer cuadro de la textura.
                keep(this.add.image(F.ox, F.oy, 'so_fondo', '__BASE').setOrigin(0, 0).setDisplaySize(fw, fh).setDepth(0));
            } else K.textura(this, 'casa_fondo', L.W, L.H, function (x, w, h) {
                K.pared(x, w, L.y0, { arriba: '#b6c4e0', abajo: '#94a6cc', raya: 'rgba(255,255,255,0.12)' });
                K.piso(x, w, h, L.y0, { lejos: '#8a6a4a', cerca: '#ad855c' });
                // Zócalo, enchufe, alfombra larga.
                x.fillStyle = '#6d4c2f'; K.rr(x, w * 0.12, h * 0.86, w * 0.6, h * 0.08, 20); x.fill();
                x.strokeStyle = '#e8c99a'; x.lineWidth = 3; x.setLineDash([10, 8]);
                K.rr(x, w * 0.13, h * 0.87, w * 0.58, h * 0.06, 16); x.stroke(); x.setLineDash([]);
            });
            if (!L.F) keep(this.add.image(0, 0, 'casa_fondo').setOrigin(0, 0).setDepth(0));
            // Oscuridad: capa FIJA del tamaño de la pantalla. Lo único que se mueve es el foco,
            // que se usa para borrar el agujero; así la capa nunca se desplaza ni asoma su borde.
            var fd = Math.ceil(L.radio * 2.2);
            K.textura(this, 'casa_foco', fd, fd, function (x, w, h) {
                var g = x.createRadialGradient(w / 2, h / 2, L.radio * 0.35, w / 2, h / 2, L.radio);
                g.addColorStop(0, 'rgba(255,255,255,1)');
                g.addColorStop(0.75, 'rgba(255,255,255,0.85)');
                g.addColorStop(1, 'rgba(255,255,255,0)');
                x.fillStyle = g;
                x.beginPath(); x.arc(w / 2, h / 2, L.radio, 0, Math.PI * 2); x.fill();
            });
            // Tinte cálido de la linterna (se mueve con el foco; es pequeño, no deja bordes).
            K.textura(this, 'casa_tinte', fd, fd, function (x, w, h) {
                var t = x.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, L.radio);
                t.addColorStop(0, 'rgba(255,240,180,0.18)');
                t.addColorStop(1, 'rgba(255,240,180,0)');
                x.fillStyle = t;
                x.beginPath(); x.arc(w / 2, h / 2, L.radio, 0, Math.PI * 2); x.fill();
            });
            if (!this.luz) this.luz = { x: L.W / 2, y: L.H * 0.55 };
            var fx = this.luz.x, fy = this.luz.y;
            // La oscuridad es una RenderTexture fija del tamaño exacto de la pantalla: cada frame se
            // vuelve a pintar entera y se le BORRA el foco donde está la linterna. Así nunca se
            // desplaza la capa y no puede asomar ningún borde.
            this.oscuro = keep(this.add.renderTexture(0, 0, L.W, L.H).setOrigin(0, 0).setDepth(50));
            // Modo por defecto ('render': solo muestra la textura). Cada frame pintarOscuridad() encola
            // clear/fill/erase y llama render() UNA vez, que los ejecuta y vacía el búfer.
            // OJO: no usar setRenderMode(..., true): preserve(true) conserva el búfer y cada frame
            // le suma comandos (llegó a 24 000 y 18 fps: la luz quedaba atrasada o pegada).
            // El foco y el tinte solo guardan posición y escala (fuera de la escena: add: false);
            // pintarOscuridad() los estampa por clave de textura dentro de la capa oscura.
            this.focoMask = keep(this.make.image({ x: fx, y: fy, key: 'casa_foco', add: false }));
            // El tinte cálido se dibuja DENTRO de la capa oscura (no como objeto aparte: encima
            // de la oscuridad se vería como un segundo foco fantasma).
            this.tinte = keep(this.make.image({ x: fx, y: fy, key: 'casa_tinte', add: false }));
            this.pintarOscuridad();
            this.relampago = keep(this.add.rectangle(0, 0, L.W, L.H, 0xe7f5ff, 0).setOrigin(0, 0).setDepth(52));
            this.lamparasG = keep(this.add.graphics().setDepth(49));
            var V = this.montarVida(keep);
            if (V) V.gato(L.gato.x, L.gato.y, { t: L.gato.t, depth: 56 });
            this.montarHud(keep);
            if (reubicar) {
                this.objs.forEach(function (o) {
                    var s = L.sitios[o.sitio];
                    o.actor.cont.setPosition(s.x, s.y).setScale(L.tam / o.actor.tam);
                    self.ponerRepisa(o);
                });
            }
        },

        /* ── Objetos en la casa ── */

        poner: function (ids) {
            var self = this;
            var L = this.L;
            this.objs.forEach(function (o) { o.actor.destruir(); if (o.repisa) o.repisa.destroy(); });
            this.objs = [];
            this.vivos = [];
            var altos = Ut.mezclar(L.sitios.map(function (s, i) { return s.alto ? i : -1; }).filter(function (i) { return i >= 0; }));
            var bajos = Ut.mezclar(L.sitios.map(function (s, i) { return !s.alto ? i : -1; }).filter(function (i) { return i >= 0; }));
            ids.forEach(function (id) {
                var lista = ALTOS[id] ? altos : bajos;
                var si = lista.length ? lista.shift() : (altos.length ? altos.shift() : bajos.shift());
                var s = L.sitios[si];
                var a = Act.crear(self, id, s.x, s.y, L.tam);
                if (a.animarIdle) a.animarIdle(false);
                a.sonido = self.sonidoDe(id);
                a.cont.setDepth(20);
                var o = { id: id, actor: a, sitio: si, visto: 0, revelado: false, encendido: false };
                self.objs.push(o);
                self.vivos.push(a);
                self.ponerRepisa(o);
            });
        },

        /** Un objeto de piso que cayó en un sitio de la pared (no cupo abajo) se apoya en una repisa. */
        ponerRepisa: function (o) {
            if (o.repisa) { o.repisa.destroy(); o.repisa = null; }
            var s = this.L.sitios[o.sitio];
            if (!s.alto || ALTOS[o.id]) return;
            var b = o.actor.cont.getBounds();
            // Las texturas traen margen transparente abajo: la tabla sube ~10 % para que el dibujo se apoye.
            var w = Math.max(b.width * 1.15, this.L.tam * 0.9), x = s.x - w / 2, y = b.bottom - b.height * 0.1, h = Math.max(8, this.L.tam * 0.08);
            var g = this.add.graphics().setDepth(19);
            g.fillStyle(0x000000, 0.18); g.fillRect(x + 4, y + h, w - 4, 6);
            g.fillStyle(0x8d5a2b, 1); g.fillRoundedRect(x, y, w, h, 3);
            g.fillStyle(0xb07a43, 1); g.fillRect(x + 2, y + 1, w - 4, h * 0.35);
            // Escuadras.
            g.fillStyle(0x6b4423, 1);
            [x + w * 0.18, x + w * 0.82].forEach(function (bx) { g.fillTriangle(bx - 3, y + h, bx + 3, y + h, bx - 3, y + h + h * 2.2); });
            o.repisa = g;
        },

        disponibles: function () { return this.objs.filter(function (o) { return !o.encendido; }).map(function (o) { return o.id; }); },

        objEn: function (x, y) {
            var L = this.L;
            var mejor = null, dmin = L.tam * 0.55;
            this.objs.forEach(function (o) {
                if (o.encendido) return;
                var d = Math.hypot(x - o.actor.cont.x, y - o.actor.cont.y);
                if (d < dmin) { dmin = d; mejor = o; }
            });
            return mejor;
        },

        /* ── Entrada: el dedo lleva la linterna; tocar algo ya alumbrado lo elige ── */

        // Un toque corto sobre algo ya alumbrado lo elige; arrastrar solo mueve la linterna.
        alTocar: function (p) {
            if (this.vidaAmb) this.vidaAmb.tocar(p);
            if (this.fase !== 'jugar') return;
            var o = this.objEn(p.x, p.y);
            this.toque = { x: p.x, y: p.y, t: this.time.now, obj: o && o.revelado ? o : null };
            this.moviendo = true;
            if (!this.toque.obj) this.moverLuz(p.x, p.y);
            this.pista.reiniciar();
        },

        alMover: function (p) {
            if (!this.moviendo || this.fase !== 'jugar') return;
            if (this.toque && Math.hypot(p.x - this.toque.x, p.y - this.toque.y) > 14) this.toque.obj = null;
            this.moverLuz(p.x, p.y);
        },

        alSoltar: function () {
            this.moviendo = false;
            var t = this.toque;
            this.toque = null;
            if (t && t.obj && this.time.now - t.t < 600 && this.fase === 'jugar') this.elegir(t.obj);
        },

        moverLuz: function (x, y) {
            this.luz = { x: x, y: y };
            if (this.time.now - (this.ultClic || 0) > 260) { this.ultClic = this.time.now; K.ruido({ f: 4000, q: 0.5, dur: 0.03, vol: 0.012 }); }
        },

        elegir: async function (o) {
            var a = o.actor;
            if (o.id === this.objetivo) {
                o.encendido = true;
                this.fase = 'premio';
                a.cont.setDepth(55);
                await this.celebrar(a);
                this.encenderLampara(o);
                this.coleccion.push(a);
                await this.seguir();
            } else {
                a.cont.setDepth(55);
                // La linterna parpadea.
                this.tweens.add({ targets: this.oscuro, alpha: 0.6, duration: 60, yoyo: true, repeat: 3 });
                await this.fallar(a);
                a.cont.setDepth(20);
                o.revelado = false;
                o.visto = 0;
            }
        },

        /** Lámpara de pie que se enciende junto al objeto encontrado: queda iluminado. */
        encenderLampara: function (o) {
            var L = this.L;
            var a = o.actor;
            o.lampara = { x: a.cont.x, y: a.cont.y };
            a.cont.setDepth(55);
            K.tono({ f: 1200, dur: 0.06, vol: 0.06, tipo: 'square' });
            this.brillo(a.cont.x, a.cont.y - L.tam * 0.3, 10);
        },

        dibujarLamparas: function (t) {
            var g = this.lamparasG;
            g.clear();
            if (this.luzVuelta) return;   // con la luz prendida no hacen falta halos
            var L = this.L;
            this.objs.forEach(function (o) {
                if (!o.encendido) return;
                var a = o.actor.cont;
                // Halo cálido detrás del objeto (por encima de la oscuridad gracias a su profundidad).
                for (var k = 4; k >= 1; k--) {
                    g.fillStyle(0xffe8a3, 0.07 * k);
                    g.fillCircle(a.x, a.y, L.tam * (0.35 + k * 0.12) * (1 + Math.sin(t / 500 + a.x) * 0.02));
                }
            });
            this.lamparasG.setDepth(51);
        },

        /* ── Niveles ── */

        planNiveles: function () {
            var plan = this.planBase({ extra: EXTRA, n: [4, 5, 5, 6] });
            plan[2].tormenta = true;
            plan[3].tormenta = true;
            return plan;
        },

        prepararNivel: async function (i, nv) {
            // Al cambiar de nivel se vuelve a cortar la luz.
            this.oscuro.setAlpha(0);
            this.poner(nv.ids);
            this.pila = 1;
            K.ruido({ f: 120, q: 0.5, dur: 0.4, vol: 0.1 });
            await tw(this, { targets: this.oscuro, alpha: 1, duration: 600 });
        },

        alEmpezarNivel: function (i, nv) {
            var self = this;
            if (this.eventoRayo) this.eventoRayo.remove();
            if (nv.tormenta) {
                this.eventoRayo = this.time.addEvent({ delay: 6500, loop: true, callback: function () { if (self.fase === 'jugar') self.rayo(); } });
            }
        },

        alTerminarNivel: function () {
            if (this.eventoRayo) { this.eventoRayo.remove(); this.eventoRayo = null; }
        },

        rayo: async function () {
            this.relampago.setFillStyle(0xe7f5ff, 0.85);
            this.oscuro.setAlpha(0.15);
            await esperar(this, 90);
            this.relampago.setFillStyle(0xe7f5ff, 0);
            this.oscuro.setAlpha(1);
            await esperar(this, 120);
            this.relampago.setFillStyle(0xe7f5ff, 0.6);
            this.oscuro.setAlpha(0.35);
            await esperar(this, 70);
            this.relampago.setFillStyle(0xe7f5ff, 0);
            this.oscuro.setAlpha(1);
            this.time.delayedCall(500, function () { K.ruido({ f: 90, q: 0.4, dur: 1.4, vol: 0.2, tipo: 'lowpass' }); });
        },

        repetir: function () {
            // Tocar la bocina también recarga la pila de la linterna.
            this.pila = 1;
            if (this.fase !== 'jugar' || this.sonando) return;
            K.efecto(this, 'clic');
            this.pista.reiniciar();
            this.anunciar();
        },

        /** Repinta la capa oscura entera, le borra el agujero de la linterna y tiñe la luz. */
        pintarOscuridad: function () {
            var o = this.oscuro, f = this.focoMask, t = this.tinte;
            if (!o || !f) return;
            o.clear();
            o.fill(0x050814, 0.93);
            // Por clave de textura (centrada en x, y) y con modo ERASE: así borra de verdad y respeta
            // la escala del foco. erase(objeto) y stamp({ erase: true }) no hacían agujero en Phaser 4.
            o.stamp('casa_foco', null, f.x, f.y, { scale: f.scaleX, blendMode: Phaser.BlendModes.ERASE });
            if (t) o.stamp('casa_tinte', null, t.x, t.y, { scale: t.scaleX });
            o.render();
        },

        paso: function (time, delta) {
            var L = this.L;
            if (!this.focoMask || !this.luz) return;
            // La luz sigue al dedo con un poco de inercia (se siente la linterna en la mano).
            // Se mueve SOLO el foco: la capa oscura queda fija cubriendo toda la pantalla.
            var o = this.focoMask;
            o.x += (this.luz.x - o.x) * Math.min(1, delta / 90);
            o.y += (this.luz.y - o.y) * Math.min(1, delta / 90);
            if (this.nv && this.nv.tormenta && this.fase === 'jugar') {
                this.pila = Math.max(0.55, this.pila - delta / 40000);
                o.setScale(this.pila + Math.sin(time / 90) * 0.01);
            } else o.setScale(1 + Math.sin(time / 300) * 0.01);
            // El tinte va pegado al foco; se pinta dentro de la capa oscura, así que no se desfasa.
            if (this.tinte) this.tinte.setPosition(o.x, o.y).setScale(o.scale);
            this.pintarOscuridad();
            var r = L.radio * o.scale * 0.55;
            var self = this;
            this.objs.forEach(function (q) {
                if (q.encendido) return;
                var c = q.actor.cont;
                var dentro = Math.hypot(c.x - o.x, c.y - o.y) < r;
                if (dentro) q.visto += delta; else q.visto = Math.max(0, q.visto - delta * 0.5);
                if (!q.revelado && q.visto > 450) {
                    q.revelado = true;
                    self.brillo(c.x, c.y - L.tam * 0.2, 5);
                    K.tono({ f: 1800, dur: 0.05, vol: 0.03 });
                }
                if (q.revelado && q.visto <= 0) q.revelado = false;
            });
            this.dibujarLamparas(time);
            if (this.ayuda && this.fase === 'jugar' && time - (this.ultBrillo || 0) > 2600) {
                this.ultBrillo = time;
                var obj = this.objs.filter(function (q) { return q.id === self.objetivo && !q.encendido; })[0];
                if (obj) this.brillo(obj.actor.cont.x, obj.actor.cont.y, 4);
            }
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            var o = this.objs.filter(function (q) { return q.id === self.objetivo && !q.encendido; })[0];
            if (!o) return Promise.resolve();
            var c = o.actor.cont;
            if (o.revelado) return this.ctx.mano({ punto: { x: c.x, y: c.y }, holdMs: 500, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
            return this.ctx.mano({
                punto: { x: this.focoMask.x, y: this.focoMask.y }, holdMs: 200,
                arrastre: { dx: c.x - this.focoMask.x, dy: c.y - this.focoMask.y, durMs: 1200 },
                cancelado: function () { return cancelada() || self.fase !== 'jugar'; }
            });
        },

        estadoExtra: function () {
            var o = this.focoMask;
            return { luz: o ? { x: Math.round(o.x), y: Math.round(o.y), pila: +this.pila.toFixed(2) } : null, objs: this.objs.map(function (q) { return { id: q.id, x: Math.round(q.actor.cont.x), y: Math.round(q.actor.cont.y), revelado: q.revelado, encendido: q.encendido }; }) };
        },

        antesDeFiesta: async function () {
            this.objs.forEach(function (q) { if (!q.encendido) q.actor.cont.setAlpha(0.35); });
        },

        /* ── Escena final: vuelve la luz, lámpara por lámpara. Cada objeto encontrado suena cuando
              lo alcanza la luz, aparece el gato y salta, y por la ventana sale el arcoíris. ── */

        escenaFinal: async function () {
            var self = this;
            var L = this.L, W = L.W;
            if (this.oscuro) this.tweens.killTweensOf(this.oscuro);
            this.oscuro.setAlpha(1);
            // La tormenta se aleja: un último trueno lejano.
            K.ruido({ f: 90, q: 0.7, dur: 1.4, vol: 0.08 });
            await esperar(this, 600);
            // Tres lámparas de techo (la del medio cuelga detrás de la bocina).
            var yl = L.bocina.y + L.bocina.r + 30;
            var xs = [W * 0.17, W * 0.5, W * 0.83];
            var lamparas = xs.map(function (x, n) {
                if (n === 1 && L.lampara) return self.lamparaMesa();
                var c = self.add.container(x, yl).setDepth(53);
                var cable = self.add.rectangle(0, -yl / 2, 2, yl, 0x343a40);
                var halo = self.add.circle(0, 10, L.tam * 0.9, 0xffe8a3, 0).setBlendMode(Phaser.BlendModes.ADD);
                var pantalla = self.add.graphics();
                pantalla.fillStyle(0x495057, 1); pantalla.fillTriangle(-20, 6, 20, 6, 0, -12);
                var foco = self.add.circle(0, 9, 7, 0x868e96);
                c.add([cable, halo, pantalla, foco]);
                c.halo = halo; c.foco = foco;
                return c;
            });
            var tercio = function (x) { return x < W / 3 ? 0 : (x < W * 2 / 3 ? 1 : 2); };
            for (var i = 0; i < 3; i++) {
                var lp = lamparas[i];
                K.ruido({ f: 3000, q: 4, dur: 0.04, vol: 0.08 });   // clic del interruptor
                // Parpadea y prende.
                for (var f = 0; f < 2; f++) {
                    lp.foco.setFillStyle(0xfff3bf); lp.halo.setAlpha(0.35);
                    await esperar(this, 70);
                    lp.foco.setFillStyle(0x868e96); lp.halo.setAlpha(0);
                    await esperar(this, 60);
                }
                lp.foco.setFillStyle(0xfff3bf);
                if (i === 2) this.luzVuelta = true;
                this.tweens.add({ targets: lp.halo, alpha: 0.28, duration: 200 });
                await tw(this, { targets: this.oscuro, alpha: Math.max(0, 1 - (i + 1) * 0.36), duration: 380 });
                // Los objetos encontrados de ese lado suenan al iluminarse.
                var deLado = this.objs.filter(function (o) { return o.encendido && tercio(o.actor.cont.x) === i; });
                for (var k = 0; k < deLado.length; k++) {
                    var a = deLado[k].actor;
                    Ut.estallido(this, a.cont.x, a.cont.y - L.tam * 0.3, { n: 8, tex: 'chispa', tam: 20, dist: 70, colores: [0xfff3bf, 0xffd43b], depth: 58 });
                    await Promise.race([this.lucirse(a, 900), esperar(this, 650)]);
                }
                if (!deLado.length) await esperar(this, 350);
                if (!this.sigue()) return;
            }
            this.oscuro.setAlpha(0);
            if (this.lamparasG) this.lamparasG.clear();
            // El gato: con la luz se ve entero (sus ojos eran los del ambiente) y salta contento.
            await this.saltaGato();
            // Por la ventana pasa la tormenta y sale el arcoíris.
            await this.arcoiris();
            await esperar(this, 400);
        },

        /** La lámpara de la mesita (dibujada en el fondo): solo se le pone la luz encima. */
        lamparaMesa: function () {
            var lp = this.L.lampara;
            var c = this.add.container(lp.x, lp.y).setDepth(53);
            var halo = this.add.circle(0, lp.r * 0.6, lp.r * 4.2, 0xffe8a3, 0).setBlendMode(Phaser.BlendModes.ADD);
            // La tulipa brilla: elipse cálida del tamaño de la pantalla del dibujo.
            var foco = this.add.ellipse(0, 0, lp.r * 1.7, lp.r * 1.35, 0xfff3bf, 0).setBlendMode(Phaser.BlendModes.ADD);
            c.add([halo, foco]);
            c.halo = halo;
            // Misma interfaz que el foco de las lámparas de techo (encendido = 0xfff3bf).
            c.foco = { setFillStyle: function (col) { foco.setFillStyle(0xfff3bf, col === 0xfff3bf ? 0.7 : 0); return foco; } };
            return c;
        },

        saltaGato: async function () {
            var L = this.L;
            var gx = L.gato.x, gy = L.gato.y, t0 = L.gato.t;
            var V = this.vidaAmb;
            var ojos = V && V.buscar ? V.buscar('gato') : [];
            ojos.forEach(function (m) { m.g.setVisible(false); });
            var c = this.add.container(gx, gy).setDepth(56);
            var g = this.add.graphics();
            var gris = 0x5c5f66, claro = 0x868e96;
            g.fillStyle(gris, 1);
            g.fillEllipse(t0 * 0.6, t0 * 3.1, t0 * 3.2, t0 * 3.4);                 // cuerpo sentado
            g.fillCircle(0, 0, t0 * 2.1);                                         // cabeza
            g.fillTriangle(-t0 * 2, -t0 * 0.6, -t0 * 1.2, -t0 * 2.9, -t0 * 0.3, -t0 * 1.6);
            g.fillTriangle(t0 * 2, -t0 * 0.6, t0 * 1.2, -t0 * 2.9, t0 * 0.3, -t0 * 1.6);
            g.fillStyle(0xffa8a8, 1); g.fillTriangle(-t0 * 1.6, -t0 * 1.1, -t0 * 1.2, -t0 * 2.2, -t0 * 0.7, -t0 * 1.5);
            g.fillTriangle(t0 * 1.6, -t0 * 1.1, t0 * 1.2, -t0 * 2.2, t0 * 0.7, -t0 * 1.5);
            g.fillStyle(claro, 1); g.fillEllipse(t0 * 0.4, t0 * 3.3, t0 * 1.6, t0 * 2);  // pancita
            // Ojos felices, nariz y bigotes.
            g.lineStyle(2.5, 0xc0eb75, 1);
            [-1, 1].forEach(function (s) { g.beginPath(); g.arc(s * t0, t0 * 0.15, t0 * 0.45, Math.PI * 1.15, Math.PI * 1.85); g.strokePath(); });
            g.fillStyle(0xff8787, 1); g.fillTriangle(-3, t0 * 0.7, 3, t0 * 0.7, 0, t0 * 1.05);
            g.lineStyle(1.5, 0xdee2e6, 0.9);
            [-1, 1].forEach(function (s) { g.lineBetween(s * t0 * 0.6, t0 * 0.9, s * t0 * 2.4, t0 * 0.7); g.lineBetween(s * t0 * 0.6, t0 * 1.05, s * t0 * 2.4, t0 * 1.25); });
            var cola = this.add.graphics();
            cola.lineStyle(t0 * 0.6, gris, 1);
            cola.beginPath(); cola.arc(t0 * 2.6, t0 * 2.6, t0 * 1.6, -Math.PI * 0.5, Math.PI * 0.4); cola.strokePath();
            c.add([cola, g]);
            c.setAlpha(0);
            await tw(this, { targets: c, alpha: 1, duration: 250 });
            if (V && V.sonido) V.sonido.miau();
            this.tweens.add({ targets: cola, angle: 18, duration: 260, yoyo: true, repeat: 3 });
            await tw(this, { targets: c, y: gy - L.tam * 0.7, duration: 280, ease: 'Quad.easeOut', yoyo: true });
            await tw(this, { targets: c, y: gy - L.tam * 0.35, duration: 200, ease: 'Quad.easeOut', yoyo: true });
        },

        arcoiris: async function () {
            var L = this.L;
            // Ventana en la parte alta de la pared, donde no haya objetos.
            var techo = L.bocina.y + L.bocina.r + 50;
            var altoLibre = L.y0 - L.tam * 1.6 - techo;
            var w = Math.min(L.tam * 1.3, L.W * 0.26), h = Math.max(60, Math.min(altoLibre, w * 0.8));
            var x = L.W * 0.17, y = techo + Math.max(0, (altoLibre - h) / 2) + h / 2;
            if (L.F) {
                // En la sala del diseño: un hueco de la pared sin objeto; si están todos ocupados,
                // en el mayor espacio entre dos objetos de la pared (sin taparlos).
                var ocupados = this.objs.map(function (o) { return o.sitio; });
                var pared = L.sitios.filter(function (s) { return s.alto; });
                var libre = L.sitios.filter(function (s, i) { return s.alto && ocupados.indexOf(i) < 0; })[0];
                w = Math.min(L.tam * 1.25, L.W * 0.26); h = w * 0.8;
                if (libre) { x = libre.x; y = libre.y; }
                else {
                    var bordes = [0].concat(pared.map(function (s) { return s.x; }), [L.W - (L.pres ? 150 : 0)]);
                    var mejor = { gap: 0, x: L.W * 0.5 };
                    for (var b = 1; b < bordes.length; b++) {
                        // En los extremos solo estorba medio objeto; entre dos, uno entero.
                        var gap = bordes[b] - bordes[b - 1] - L.tam * ((b === 1 || b === bordes.length - 1) ? 0.6 : 1.2);
                        if (gap > mejor.gap) mejor = { gap: gap, x: (bordes[b] + bordes[b - 1]) / 2 + (b === 1 ? L.tam * 0.3 : (b === bordes.length - 1 ? -L.tam * 0.3 : 0)) };
                    }
                    w = Math.max(50, Math.min(w, mejor.gap - 16)); h = w * 0.8;
                    x = mejor.x; y = pared.length ? pared[0].y : L.y0 - h * 1.2;
                }
            }
            var c = this.add.container(x, y).setDepth(3).setAlpha(0);
            var g = this.add.graphics();
            g.fillStyle(0xffffff, 1); g.fillRoundedRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12, 6);
            g.fillStyle(0x74c0fc, 1); g.fillRect(-w / 2, -h / 2, w, h);
            // Nubes grises que se van.
            var nubes = this.add.graphics();
            nubes.fillStyle(0x868e96, 0.9);
            [[-0.25, -0.25, 0.18], [-0.05, -0.3, 0.15], [0.2, -0.22, 0.16]].forEach(function (q) { nubes.fillCircle(q[0] * w, q[1] * h, q[2] * w); });
            // Arcoíris (enmascarado por el vidrio).
            var arco = this.add.graphics();
            [0xff6b6b, 0xff922b, 0xffd43b, 0x51cf66, 0x339af0, 0x845ef7].forEach(function (col, i) {
                arco.lineStyle(Math.max(3, w * 0.05), col, 1);
                arco.beginPath(); arco.arc(0, h * 0.55, w * (0.46 - i * 0.05), Math.PI, 0); arco.strokePath();
            });
            arco.setAlpha(0);
            var marco = this.add.graphics();
            marco.lineStyle(4, 0xffffff, 1); marco.lineBetween(0, -h / 2, 0, h / 2); marco.lineBetween(-w / 2, 0, w / 2, 0);
            c.add([g, nubes, arco, marco]);
            await tw(this, { targets: c, alpha: 1, duration: 300 });
            // Las nubes se corren y se deshacen sin salir del vidrio.
            this.tweens.add({ targets: nubes, x: w * 0.15, alpha: 0, duration: 1100, ease: 'Sine.easeIn' });
            await esperar(this, 500);
            K.tono({ f: 900, f2: 1500, dur: 0.5, vol: 0.04 });
            await tw(this, { targets: arco, alpha: 1, duration: 700 });
            Ut.estallido(this, x, y - h * 0.2, { n: 10, tex: 'chispa', tam: 18, dist: 70, colores: [0xffffff, 0xffe066], depth: 20 });
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
                self.objs.forEach(function (o) { o.actor.destruir(); });
                self.objs = [];
                self.vivos = [];
            };
            await ctx.decir({ voz: 'zeus', texto: t.demostracion || '¡Mira cómo se juega!' }, { minMs: 1600 });
            if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
            // Gallo y vaca en los dos primeros sitios del piso (a la izquierda).
            // Con la sala del diseño los primeros sitios son de pared: se usan dos del piso, bien separados.
            var piso = [];
            L.sitios.forEach(function (s, i) { if (!s.alto) piso.push(i); });
            var sitios = L.F ? [piso[0], piso[Math.min(2, piso.length - 1)]] : [0, 2];
            d.opciones.forEach(function (id, k) {
                var s = L.sitios[sitios[k]];
                var a = Act.crear(self, id, s.x, s.y, L.tam);
                a.cont.setDepth(20);
                a.sonido = id === d.correcto ? d.sonido : Act.sonidoDe(id);
                self.objs.push({ id: id, actor: a, sitio: sitios[k], visto: 0, revelado: false, encendido: false });
                self.vivos.push(a);
            });
            var b = L.bocina;
            var sonando = Promise.resolve();
            await ctx.mano({ punto: { x: b.x, y: b.y }, holdMs: 500, onPresionar: function () { sonando = self.escuchar(d.sonido); } });
            await sonando;
            var vaca = this.objs.filter(function (o) { return o.id === d.correcto; })[0];
            var gallo = this.objs.filter(function (o) { return o.id !== d.correcto; })[0];
            var ruta = [gallo, vaca];
            for (var k = 0; k < ruta.length; k++) {
                if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
                var c = ruta[k].actor.cont;
                var x0 = this.luz.x, y0 = this.luz.y;
                await ctx.mano({
                    punto: { x: x0, y: y0 }, holdMs: 150, arrastre: { dx: c.x - x0, dy: c.y - y0, durMs: 1000, soltarEnDestino: true },
                    onDuranteArrastre: (function (cx, cy) { return function () { var o = { x: x0, y: y0 }; self.tweens.add({ targets: o, x: cx, y: cy, duration: 1000, ease: 'Sine.easeInOut', onUpdate: function () { self.luz = { x: o.x, y: o.y }; } }); }; })(c.x, c.y)
                });
                await esperar(this, 900);
            }
            if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
            await ctx.mano({ punto: { x: vaca.actor.cont.x, y: vaca.actor.cont.y }, holdMs: 450 });
            vaca.encendido = true;
            vaca.actor.cont.setDepth(55);
            K.efecto(this, 'recompensa');
            Ut.estallido(this, vaca.actor.cont.x, vaca.actor.cont.y - L.tam * 0.2, { n: 14, tex: 'estrella', tam: 28, dist: 150, sinTinte: true, depth: 85 });
            await Promise.all([this.escuchar(d.sonido, { breve: true, bocina: false }), vaca.actor.acierto(1500)]);
            await ctx.decir({ voz: 'zoe', texto: t.demostracionAcierto || '¡Así se hace!' }, { estado: 'acierto', minMs: 1300 });
            await ctx.decir({ voz: 'zeus', texto: t.demostracionFin || '¡Ahora te toca a ti!' }, { minMs: 1000 });
            limpiar();
        }
    };

    K.crear({
        id: 'linterna',
        fondo: '#1b2440',
        pieles: ['aspiradora', 'cajon', 'gallo', 'licuadora', 'puerta', 'reloj', 'telefono', 'vaca', 'ventana', 'ventilador'],
        escena: escena
    });
})(typeof window !== 'undefined' ? window : this);
