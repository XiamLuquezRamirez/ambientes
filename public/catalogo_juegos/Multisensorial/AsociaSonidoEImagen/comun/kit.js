/**
 * AsociaKit — piezas compartidas por los motores propios de Asocia sonido e imagen.
 * NO es un motor: cada juego trae su escenario, su gesto y su mecánica en su carpeta
 * (arenero.js, sala.js, comoda.js, …). Aquí solo vive lo que no es mecánica:
 * bocina, estrellas de nivel, presentador 3D, voz/sonido, niveles, celebración, partículas,
 * pintores de escenarios (pared, piso, madera) y ruidos sintetizados.
 *
 *   AsociaKit.crear({ id, fondo, escena: { armar(reubicar), paso(t, dt), planNiveles(),
 *       prepararNivel(i, nv), alTocar(p), alMover(p), alSoltar(p), demo(), mostrarPista(c), … } })
 *
 * El juego llama this.celebrar(actor) en un acierto y this.fallar(actor) en un error; luego
 * this.seguir() avanza (fin de nivel o, en el nivel «cambia», nuevo sonido).
 */
(function (global) {
    'use strict';

    var B = global.PedniaParejaBase;
    var Ut = B.util;
    var A = global.PedniaArte;
    var Act = global.AsociaActores;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var mezclar = Ut.mezclar;
    var rnd = Ut.rnd;

    function efecto(scene, n) { if (scene.ctx && scene.ctx.efecto) scene.ctx.efecto(n); }

    /* ── Ruidos sintetizados (arena, roce, clic, motor…) ── */

    var audio = { ctx: null, ruido: null };
    function actx() {
        var C = global.AudioContext || global.webkitAudioContext;
        if (!C) return null;
        if (!audio.ctx) audio.ctx = new C();
        if (audio.ctx.state === 'suspended') audio.ctx.resume();
        if (!audio.ruido) {
            var n = Math.floor(audio.ctx.sampleRate * 1.2);
            audio.ruido = audio.ctx.createBuffer(1, n, audio.ctx.sampleRate);
            var d = audio.ruido.getChannelData(0);
            for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        }
        return audio.ctx;
    }
    /** ruido({ f, q, dur, vol, tipo }) — ráfaga de ruido filtrado. */
    function ruido(o) {
        o = o || {};
        var c = actx();
        if (!c) return;
        var t = c.currentTime;
        var dur = o.dur || 0.1;
        var s = c.createBufferSource();
        s.buffer = audio.ruido;
        var f = c.createBiquadFilter();
        f.type = o.tipo || 'bandpass';
        f.frequency.value = o.f || 1800;
        f.Q.value = o.q || 1.2;
        var g = c.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(o.vol || 0.08, t + Math.min(0.02, dur / 3));
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        s.connect(f).connect(g).connect(c.destination);
        s.start(t, Math.random() * 0.8, dur + 0.02);
    }
    /** tono({ f, f2, dur, vol, tipo }) — nota corta (clic, chirrido, motor). */
    function tono(o) {
        o = o || {};
        var c = actx();
        if (!c) return;
        var t = c.currentTime;
        var dur = o.dur || 0.1;
        var os = c.createOscillator();
        os.type = o.tipo || 'sine';
        os.frequency.setValueAtTime(o.f || 600, t);
        if (o.f2) os.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
        var g = c.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(o.vol || 0.08, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        os.connect(g).connect(c.destination);
        os.start(t);
        os.stop(t + dur + 0.02);
    }

    /* ── Pintores Canvas 2D ── */

    function textura(scene, clave, w, h, pintar) {
        if (scene.textures.exists(clave)) scene.textures.remove(clave);
        var t = scene.textures.createCanvas(clave, Math.max(2, Math.ceil(w)), Math.max(2, Math.ceil(h)));
        pintar(t.getContext(), t.width, t.height, t);
        t.refresh();
        return t;
    }

    function rr(x, px, py, pw, ph, r) {
        x.beginPath();
        if (x.roundRect) x.roundRect(px, py, pw, ph, r); else x.rect(px, py, pw, ph);
    }

    function grano(x, px, py, w, h, n, colores, rmax, alfa) {
        for (var i = 0; i < n; i++) {
            x.fillStyle = colores[(Math.random() * colores.length) | 0];
            x.globalAlpha = (alfa || 0.35) * (0.4 + Math.random() * 0.6);
            x.beginPath();
            x.arc(px + Math.random() * w, py + Math.random() * h, Math.random() * (rmax || 1.4) + 0.3, 0, Math.PI * 2);
            x.fill();
        }
        x.globalAlpha = 1;
    }

    /** Tabla de madera con veta (horizontal o vertical). */
    function madera(x, px, py, pw, ph, o) {
        o = o || {};
        var c0 = o.claro || '#d39a55', c1 = o.medio || '#b97c3a', c2 = o.oscuro || '#87521f';
        var g = o.vertical ? x.createLinearGradient(px, 0, px + pw, 0) : x.createLinearGradient(0, py, 0, py + ph);
        g.addColorStop(0, c0); g.addColorStop(0.5, c1); g.addColorStop(1, c2);
        x.fillStyle = g;
        rr(x, px, py, pw, ph, o.r != null ? o.r : 5);
        x.fill();
        x.save();
        rr(x, px, py, pw, ph, o.r != null ? o.r : 5);
        x.clip();
        x.strokeStyle = 'rgba(70,40,12,0.28)';
        x.lineWidth = 1.2;
        var n = Math.max(3, Math.round((o.vertical ? pw : ph) / 9));
        for (var i = 0; i < n; i++) {
            x.beginPath();
            if (o.vertical) {
                var vx = px + pw * (i + 0.5) / n;
                for (var yy = py; yy <= py + ph; yy += 18) x.lineTo(vx + Math.sin(yy / 37 + i * 1.7) * 2.2, yy);
            } else {
                var vy = py + ph * (i + 0.5) / n;
                for (var xx = px; xx <= px + pw; xx += 18) x.lineTo(xx, vy + Math.sin(xx / 41 + i * 1.3) * 2);
            }
            x.stroke();
        }
        // Nudos.
        for (var k = 0; k < Math.max(1, (pw * ph) / 40000); k++) {
            x.fillStyle = 'rgba(90,50,18,0.35)';
            x.beginPath();
            x.ellipse(px + Math.random() * pw, py + Math.random() * ph, 4 + Math.random() * 5, 2 + Math.random() * 2, o.vertical ? Math.PI / 2 : 0, 0, Math.PI * 2);
            x.fill();
        }
        x.restore();
        x.fillStyle = 'rgba(255,240,210,0.3)';
        if (o.vertical) x.fillRect(px + 2, py + 2, 2.5, ph - 4); else x.fillRect(px + 3, py + 2, pw - 6, 2.5);
    }

    /** Pared con papel tapiz de rayas suaves y zócalo. */
    function pared(x, w, h, o) {
        o = o || {};
        var g = x.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, o.arriba || '#fff3d9');
        g.addColorStop(1, o.abajo || '#f6dfb4');
        x.fillStyle = g;
        x.fillRect(0, 0, w, h);
        x.fillStyle = o.raya || 'rgba(230,180,120,0.18)';
        var paso = o.paso || 46;
        for (var i = 0; i < w; i += paso) x.fillRect(i, 0, paso * 0.45, h);
        if (o.motivo) {
            x.fillStyle = o.motivo;
            for (var yy = 30; yy < h; yy += 70) for (var xx = (yy / 70 % 2) * 35 + 18; xx < w; xx += 70) {
                x.beginPath(); x.arc(xx, yy, 4, 0, Math.PI * 2); x.fill();
            }
        }
        grano(x, 0, 0, w, h, Math.round(w * h / 900), ['#ffffff', '#e8c99a'], 1.1, 0.25);
    }

    /** Piso de tablas en perspectiva suave (y0 = línea donde empieza el piso). */
    function piso(x, w, h, y0, o) {
        o = o || {};
        var alto = h - y0;
        var g = x.createLinearGradient(0, y0, 0, h);
        g.addColorStop(0, o.lejos || '#b9814a');
        g.addColorStop(1, o.cerca || '#d9a066');
        x.fillStyle = g;
        x.fillRect(0, y0, w, alto);
        // Juntas: las tablas se abren hacia el frente.
        x.strokeStyle = 'rgba(80,45,15,0.35)';
        x.lineWidth = 1.5;
        var n = Math.round(w / 70);
        for (var i = -n; i <= n * 2; i++) {
            var xl = w / 2 + (i - n / 2) * (w / n) * 0.55;
            var xc = w / 2 + (i - n / 2) * (w / n) * 1.25;
            x.beginPath(); x.moveTo(xl, y0); x.lineTo(xc, h); x.stroke();
        }
        for (var f = 1; f < 6; f++) {
            var yy = y0 + alto * Math.pow(f / 6, 1.5);
            x.strokeStyle = 'rgba(80,45,15,0.18)';
            x.beginPath(); x.moveTo(0, yy); x.lineTo(w, yy); x.stroke();
        }
        grano(x, 0, y0, w, alto, Math.round(w * alto / 500), ['#7a4a1c', '#f0c58c'], 1.2, 0.3);
        // Sombra del zócalo sobre el piso.
        var s = x.createLinearGradient(0, y0, 0, y0 + 30);
        s.addColorStop(0, 'rgba(40,20,5,0.35)'); s.addColorStop(1, 'rgba(40,20,5,0)');
        x.fillStyle = s;
        x.fillRect(0, y0, w, 30);
        if (o.zocalo !== false) {
            x.fillStyle = o.zocaloColor || '#f8f0e3';
            x.fillRect(0, y0 - 14, w, 14);
            x.fillStyle = 'rgba(0,0,0,0.12)';
            x.fillRect(0, y0 - 2, w, 2);
        }
    }

    /** Ventana con cielo, nubes y marco blanco (de día o de noche). */
    function ventana(x, px, py, pw, ph, o) {
        o = o || {};
        x.fillStyle = 'rgba(0,0,0,0.15)';
        rr(x, px + 5, py + 7, pw, ph, 6); x.fill();
        var g = x.createLinearGradient(0, py, 0, py + ph);
        if (o.noche) { g.addColorStop(0, '#1b2440'); g.addColorStop(1, '#3b4a7a'); }
        else { g.addColorStop(0, '#74c0fc'); g.addColorStop(1, '#d0ebff'); }
        x.fillStyle = g;
        x.fillRect(px, py, pw, ph);
        if (o.noche) {
            x.fillStyle = '#fff9db';
            x.beginPath(); x.arc(px + pw * 0.72, py + ph * 0.3, Math.min(pw, ph) * 0.12, 0, Math.PI * 2); x.fill();
            grano(x, px, py, pw, ph * 0.7, 30, ['#ffffff'], 1.2, 0.9);
        } else {
            x.fillStyle = 'rgba(255,255,255,0.9)';
            [[0.3, 0.35, 0.11], [0.42, 0.3, 0.13], [0.55, 0.37, 0.1], [0.75, 0.62, 0.08], [0.84, 0.6, 0.1]].forEach(function (q) {
                x.beginPath(); x.arc(px + pw * q[0], py + ph * q[1], pw * q[2], 0, Math.PI * 2); x.fill();
            });
            x.fillStyle = '#8ce99a';
            x.beginPath(); x.ellipse(px + pw * 0.3, py + ph, pw * 0.5, ph * 0.18, 0, Math.PI, 0); x.fill();
            x.fillStyle = '#69db7c';
            x.beginPath(); x.ellipse(px + pw * 0.85, py + ph, pw * 0.45, ph * 0.22, 0, Math.PI, 0); x.fill();
        }
        var m = Math.max(6, pw * 0.05);
        x.strokeStyle = o.marco || '#ffffff';
        x.lineWidth = m;
        x.strokeRect(px, py, pw, ph);
        x.lineWidth = m * 0.6;
        x.beginPath(); x.moveTo(px + pw / 2, py); x.lineTo(px + pw / 2, py + ph); x.moveTo(px, py + ph / 2); x.lineTo(px + pw, py + ph / 2); x.stroke();
        x.fillStyle = o.marco || '#ffffff';
        x.fillRect(px - m, py + ph, pw + m * 2, m * 1.3);
        // Reflejo.
        x.fillStyle = 'rgba(255,255,255,0.18)';
        x.beginPath(); x.moveTo(px + pw * 0.1, py + ph * 0.05); x.lineTo(px + pw * 0.3, py + ph * 0.05); x.lineTo(px + pw * 0.12, py + ph * 0.45); x.lineTo(px + pw * 0.05, py + ph * 0.45); x.fill();
    }

    /** Sombra elíptica difusa (para apoyar objetos en el piso). */
    function sombra(x, cx, cy, rx, ry, a) {
        var g = x.createRadialGradient(cx, cy, 1, cx, cy, rx);
        g.addColorStop(0, 'rgba(0,0,0,' + (a || 0.3) + ')');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        x.save();
        x.translate(cx, cy); x.scale(1, ry / rx); x.translate(-cx, -cy);
        x.fillStyle = g;
        x.beginPath(); x.arc(cx, cy, rx, 0, Math.PI * 2); x.fill();
        x.restore();
    }

    /* ── Métodos comunes de escena ── */

    var BASE = {
        create: function () {
            var self = this;
            this.mayor = String(this.nivel.id) === '5';
            this.fase = 'intro';
            this.errores = 0;
            this.hechos = 0;
            this.atrapados = 0;
            this.nivelActual = 0;
            this.coleccion = [];
            this.vivos = [];
            this.ultimoSonido = -99999;
            if (this.iniciar) this.iniciar();
            this.armar(false);
            this.input.on('pointerdown', function (p) {
                actx();
                if (self.ctx.enDemo && self.ctx.enDemo()) return;
                if (self.fase === 'jugar' && self.tocaBocina(p)) { self.repetir(); return; }
                if (self.alTocar) self.alTocar(p);
                // El escenario también responde (sol, nubes, pájaros, árboles…), sin afectar el juego.
                if (self.vidaAmb && !self.ocupadoPorJuego()) self.vidaAmb.tocar(p);
            });
            this.input.on('pointermove', function (p) {
                if (self.ctx.enDemo && self.ctx.enDemo()) return;
                if (self.alMover) self.alMover(p);
            });
            var soltar = function (p) {
                if (self.ctx.enDemo && self.ctx.enDemo()) return;
                if (self.alSoltar) self.alSoltar(p);
            };
            this.input.on('pointerup', soltar);
            this.input.on('pointerupoutside', soltar);
            this.scale.on('resize', function () {
                if (self.timerResize) self.timerResize.remove();
                self.timerResize = self.time.delayedCall(220, function () { self.armar(true); });
            });
            this.pista = Ut.crearPista(this, 9000, function (cancelada) { return self.mostrarPista ? self.mostrarPista(cancelada) : self.pistaBocina(cancelada); });
        },

        /** Si el toque inició un arrastre del juego, el ambiente no lo toma. */
        ocupadoPorJuego: function () {
            return !!(this.agarrada || this.tirando || this.llevado || this.arr || this.girando || this.honda || this.tirandoCuerda || this.arrastrando || this.moviendo || this.cavando);
        },

        /** Monta el ambiente vivo del escenario (comun/vida.js), si está cargado. */
        montarVida: function (keep) {
            this.vidaAmb = global.AsociaVida ? global.AsociaVida.montar(this, keep) : null;
            return this.vidaAmb;
        },

        /** keep(o): guarda un objeto del escenario para borrarlo al rearmar. */
        limpiarEscenario: function () {
            var self = this;
            (this.estaticos || []).forEach(function (o) { if (o && o.destroy) o.destroy(); });
            this.estaticos = [];
            return function (o) { self.estaticos.push(o); return o; };
        },

        /* HUD: bocina + estrellas + presentador. L.bocina {x,y,r}; L.pres {x, piso, alto} o null. */
        montarHud: function (keep) {
            var L = this.L;
            var b = keep(this.add.container(L.bocina.x, L.bocina.y).setDepth(80));
            var halo = this.add.circle(0, 0, L.bocina.r * 1.25, 0xffffff, 0.35);
            var plato = this.add.circle(0, 0, L.bocina.r, 0xff922b).setStrokeStyle(5, 0xffffff);
            var luz = this.add.circle(-L.bocina.r * 0.3, -L.bocina.r * 0.35, L.bocina.r * 0.35, 0xffffff, 0.3);
            var icono = this.add.image(0, 0, A.textura(this, 'bocina', 128)).setDisplaySize(L.bocina.r * 1.35, L.bocina.r * 1.35);
            b.add([halo, plato, luz, icono]);
            b.halo = halo;
            this.bocina = b;
            this.ondasG = keep(this.add.graphics().setDepth(79));
            this.estrellas = [];
            var tam = Math.max(20, L.bocina.r * 0.6);
            for (var i = 0; i < 4; i++) {
                var e = keep(this.add.image(L.bocina.x + L.bocina.r + 24 + i * (tam + 6), L.bocina.y, A.textura(this, 'estrella', 64)).setDisplaySize(tam, tam).setDepth(80));
                if (i >= this.nivelActual) e.setTint(0x8a8f98).setAlpha(0.55);
                this.estrellas.push(e);
            }
            this.montarPresentador();
        },

        montarPresentador: function () {
            var P = this.L.pres;
            var falso = { clip: function () {}, visible: function () {}, ubicar: function () {}, falso: true };
            if (!global.AsociaPj3D || !P) {
                if (this.pres && !this.pres.falso) this.pres.visible(false);
                if (!this.pres) this.pres = falso;
                return;
            }
            if (!this.pres || this.pres.falso) {
                this.pres = global.AsociaPj3D.crear(P.modelo || (this.mayor ? 'nino' : 'nina'), { alto: P.alto, clip: 'Saludar', giro: P.giro != null ? P.giro : -0.5, mira: P.mira });
                this.reaccion('Saludar', 2600);
            }
            this.pres.visible(true);
            this.pres.ubicar(P.x, P.piso - P.alto / 2);
        },

        reaccion: function (clip, ms) {
            var self = this;
            if (!this.pres) return;
            this.pres.clip(clip);
            if (this.presTimer) this.presTimer.remove();
            this.presTimer = this.time.delayedCall(ms || 1800, function () {
                if (self.pres) self.pres.clip(self.fase === 'fin' ? 'Bailar' : (self.clipReposo || 'Quieto'));
            });
        },

        /* ── Sonido ── */

        sonidoDe: function (id) {
            if (id === this.reto.correcto && this.reto.sonido) return this.reto.sonido;
            return Act.sonidoDe(id);
        },

        escuchar: function (nombre, o) {
            var self = this;
            o = o || {};
            this.sonando = true;
            this.ultimoSonido = this.time.now;
            if (o.bocina !== false && this.bocina) {
                this.tweens.killTweensOf(this.bocina);
                this.bocina.setScale(1);
                this.tweens.add({ targets: this.bocina, scale: 1.12, duration: 160, yoyo: true, repeat: 3 });
                this.ondas = this.time.now;
            }
            var p = Promise.resolve(this.ctx.sonido ? this.ctx.sonido(nombre, o) : null);
            return p.then(function () { self.sonando = false; self.ondas = 0; });
        },

        /** Suena lo que hay que buscar (cada juego puede cambiarlo: memoria, sonido lejano…). */
        anunciar: function () { return this.escuchar(this.sonidoDe(this.objetivo)); },

        repetir: function () {
            if (this.fase !== 'jugar' || this.sonando) return;
            efecto(this, 'clic');
            this.pista.reiniciar();
            this.anunciar();
        },

        tocaBocina: function (p) {
            var b = this.L && this.L.bocina;
            return !!b && Math.hypot(p.x - b.x, p.y - b.y) < b.r * 1.3;
        },

        invitar: function () {
            var b = this.bocina;
            if (!b) return;
            this.tweens.killTweensOf(b);
            b.setScale(1);
            this.tweens.add({ targets: b, scale: 1.14, duration: 380, yoyo: true, repeat: 3, ease: 'Sine.easeInOut' });
        },

        pistaBocina: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            var b = this.L.bocina;
            return this.ctx.mano({ punto: { x: b.x, y: b.y }, holdMs: 500, cancelado: function () { return cancelada() || self.fase !== 'jugar'; }, onPresionar: function () { self.repetir(); } });
        },

        /* ── Partículas ── */

        granos: function (x, y, n, o) {
            o = o || {};
            var colores = o.colores || [0xe8c486, 0xd4a868, 0xf5dcaa, 0xbf9257];
            for (var i = 0; i < n; i++) {
                var g = this.add.circle(x + rnd(-8, 8), y + rnd(-6, 6), rnd(o.rmin || 1.6, o.rmax || 3.6), colores[i % colores.length]).setDepth(o.depth || 60);
                var ang = o.angulo != null ? o.angulo + rnd(-(o.abanico || 0.7), o.abanico || 0.7) : rnd(-Math.PI * 0.95, -Math.PI * 0.05);
                var d = rnd(18, o.dist || 55);
                this.tweens.add({
                    targets: g, x: g.x + Math.cos(ang) * d, y: g.y + Math.sin(ang) * d * 0.6 + (o.cae != null ? o.cae : 26),
                    alpha: 0, duration: rnd(380, o.ms || 700), ease: 'Quad.easeOut',
                    onComplete: function () { this.targets[0].destroy(); }
                });
            }
        },

        brillo: function (x, y, n) {
            Ut.estallido(this, x, y, { n: n || 6, tex: 'chispa', tam: 18, dist: 60, colores: [0xffffff, 0xffe066], depth: 75 });
        },

        /* ── Niveles ── */

        /** Plan por defecto: 1 el reto; 2 y 3 otro sonido con más objetos; 4 el sonido cambia. */
        planBase: function (o) {
            o = o || {};
            var r = this.reto;
            var ops = (r.opciones || []).slice();
            var correcto = r.correcto || ops[0];
            var otros = ops.filter(function (x) { return x !== correcto; });
            var extra = mezclar((o.extra || []).filter(function (e) { return ops.indexOf(e) < 0; }));
            var todos = ops.concat(extra);
            var t2 = otros[0] || extra[0];
            var t3 = otros[1] || extra[1];
            var n = o.n || [ops.length, ops.length + 1, ops.length + 1, ops.length + 2];
            var pool = function (obj, k, copias) {
                copias = copias || 1;
                var resto = mezclar(todos.filter(function (e) { return e !== obj; }));
                var ids = [];
                for (var c = 0; c < copias; c++) ids.push(obj);
                return mezclar(ids.concat(resto.slice(0, Math.max(1, k - copias))));
            };
            return [
                { objetivo: correcto, ids: mezclar(ops), meta: o.meta1 || 1 },
                // Nivel 2: si copias2, hay dos iguales y hay que encontrar los dos; si no, meta 1 con más objetos.
                { objetivo: t2, ids: pool(t2, n[1], o.copias2 ? 2 : 1), meta: o.copias2 ? 2 : 1 },
                { objetivo: t3, ids: pool(t3, n[2], o.copias3 ? 2 : 1), meta: o.copias3 ? 2 : 1, dificil: true },
                { objetivo: null, ids: mezclar([correcto].concat(pool(correcto, n[3]).filter(function (e) { return e !== correcto; }))), meta: 3, dificil: true, cambia: true }
            ];
        },

        jugar: async function () {
            var plan = this.planNiveles();
            this.nivelActual = 0;
            this.atrapados = 0;
            this.errores = 0;
            for (var i = 0; i < plan.length; i++) {
                if (!this.ctx.vivo()) return;
                await this.jugarNivel(i, plan[i]);
                if (!this.ctx.vivo()) return;
                this.nivelActual = i + 1;
                await this.ganarEstrella(i);
            }
            this.fase = 'listo';
        },

        jugarNivel: async function (i, nv) {
            var self = this;
            this.nv = nv;
            this.cuenta = 0;
            this.ayuda = false;
            this.fase = 'preparando';
            this.indiceNivel = i;
            if (i > 0) await this.cartel(i + 1);
            await this.prepararNivel(i, nv);
            if (!this.ctx.vivo()) return;
            this.objetivo = nv.objetivo || this.elegirObjetivo();
            await esperar(this, 250);
            this.fase = 'jugar';
            var hecho = new Promise(function (r) { self.resolverNivel = r; });
            if (this.alEmpezarNivel) this.alEmpezarNivel(i, nv);
            await this.anunciar();
            this.pista.reiniciar();
            await hecho;
            this.pista.parar();
            this.fase = 'entre';
            if (this.alTerminarNivel) await this.alTerminarNivel(i, nv);
        },

        /** Para el nivel «cambia»: elige otro de los que siguen en juego (el juego dice cuáles con disponibles()). */
        elegirObjetivo: function () {
            var self = this;
            var ids = this.disponibles ? this.disponibles() : (this.nv.ids || []);
            var otros = ids.filter(function (id) { return id !== self.objetivo; });
            var lista = otros.length ? otros : ids;
            return lista[(Math.random() * lista.length) | 0];
        },

        cartel: async function (n) {
            var L = this.L;
            var c = this.add.container(L.W / 2, L.H * 0.55).setDepth(95).setScale(0.3).setAlpha(0);
            var tam = Math.min(90, L.W / 7);
            for (var i = 0; i < n; i++) c.add(this.add.image((i - (n - 1) / 2) * (tam * 1.05), 0, A.textura(this, 'estrella', 128)).setDisplaySize(tam, tam));
            efecto(this, 'magia');
            await tw(this, { targets: c, scale: 1, alpha: 1, duration: 380, ease: 'Back.easeOut' });
            await esperar(this, 700);
            await tw(this, { targets: c, scale: 0.4, alpha: 0, duration: 260 });
            c.destroy();
        },

        ganarEstrella: async function (i) {
            var e = this.estrellas && this.estrellas[i];
            if (!e) return;
            var L = this.L;
            efecto(this, 'chispas');
            var v = this.add.image(L.W / 2, L.H / 2, A.textura(this, 'estrella', 128)).setDisplaySize(110, 110).setDepth(95);
            await tw(this, { targets: v, x: e.x, y: e.y, displayWidth: e.displayWidth, displayHeight: e.displayHeight, duration: 650, ease: 'Cubic.easeIn' });
            v.destroy();
            e.clearTint().setAlpha(1);
            this.tweens.add({ targets: e, scale: e.scale * 1.4, duration: 160, yoyo: true });
            Ut.estallido(this, e.x, e.y, { n: 8, tex: 'chispa', tam: 18, dist: 50, colores: [0xffe066, 0xffffff], depth: 90 });
        },

        /* ── Acierto y error ── */

        elogio: function (id) {
            var t = {
                bicicleta: '¡La bicicleta hace rin rin!', telefono: '¡El teléfono suena ring!', reloj: '¡El reloj despertador!', tren: '¡Chu chu, el tren!',
                avion: '¡El avión despega!', vaca: '¡La vaca dice muu!', gallo: '¡Kikirikí, el gallo!', ambulancia: '¡La ambulancia!', aspiradora: '¡La aspiradora!',
                puerta: '¡La puerta!', ventana: '¡La ventana!', cajon: '¡El cajón!', secador: '¡El secador!', licuadora: '¡La licuadora!', ventilador: '¡El ventilador!',
                camion: '¡El camión!', motocicleta: '¡La moto!', aplaudiendo: '¡Están aplaudiendo!', corriendo: '¡Está corriendo!', saltando: '¡Está saltando!',
                durmiendo: '¡Está durmiendo!', pluma: '¡La llave del agua!', ducha: '¡La ducha!', fuente: '¡La fuente!', lavadora: '¡La lavadora!', regadera: '¡La regadera!'
            };
            return { voz: this.mayor ? 'zeus' : 'zoe', texto: t[id] || '¡Muy bien!' };
        },

        /**
         * Celebra un acierto: el objeto hace su acción real con su sonido, estrellas y la frase.
         * o.antes(): animación propia del juego antes de la acción (ya la hizo el juego si no se pasa).
         */
        celebrar: async function (a, o) {
            o = o || {};
            var L = this.L;
            this.fase = 'premio';
            this.pista.parar();
            this.reaccion('Celebrar', 2600);
            this.cuenta += 1;
            this.atrapados += 1;
            this.hechos = this.atrapados;
            var principal = a.id === this.reto.correcto && !this.dijoReto;
            var ac = principal ? (this.reto.acierto || {}) : {};
            var sonido = this.escuchar(a.sonido, ac.repetir === 'completo' ? { bocina: false } : { breve: true, bocina: false });
            await Promise.all([sonido, a.acierto ? a.acierto(this.ctx.duracionSonido ? this.ctx.duracionSonido() : 1500) : null]);
            if (!this.ctx.vivo()) return;
            efecto(this, ac.efecto || 'recompensa');
            this.cameras.main.shake(140, 0.003);
            var p = o.punto || { x: a.cont.x, y: a.cont.y - a.tam * 0.2 };
            Ut.estallido(this, p.x, p.y, { n: ac.especial || ac.efecto === 'celebracion' ? 22 : 14, tex: 'estrella', tam: 30, dist: 170, sinTinte: true, depth: 85 });
            if (ac.especial) Ut.confeti(this, 50);
            if (ac.celebran && this.ctx.celebrar) { this.ctx.celebrar(true); Ut.confeti(this, 80); }
            var linea = principal && ac.texto ? { voz: ac.voz || 'zoe', texto: ac.texto } : (this.cuenta === 1 ? this.elogio(a.id) : null);
            if (principal) this.dijoReto = true;
            this.vozPendiente = linea ? this.ctx.decir(linea, { estado: 'acierto', minMs: 1000 }) : esperar(this, 300);
            if (ac.celebran && this.ctx.celebrar) this.time.delayedCall(2500, function () { this.ctx.celebrar(false); }, null, this);
        },

        /** Después de celebrar (y de guardar el objeto donde corresponda): fin de nivel o nuevo sonido. */
        seguir: async function () {
            await this.vozPendiente;
            if (!this.ctx.vivo()) return;
            if (this.cuenta >= this.nv.meta) { this.resolverNivel(); return; }
            if (this.nv.cambia) this.objetivo = this.elegirObjetivo();
            this.fase = 'jugar';
            if (this.alSeguir) await this.alSeguir();
            await esperar(this, 250);
            if (this.fase === 'jugar') await this.anunciar();
            this.pista.reiniciar();
        },

        /** Error sin castigo: el objeto deja oír su propio sonido y Zeus/Zoe invita a escuchar otra vez. */
        fallar: async function (a) {
            this.errores += 1;
            this.reaccion('Decir_no', 1500);
            efecto(this, 'suave');
            this.escuchar(a.sonido, { breve: true, vol: 0.7, bocina: false });
            var sac = a.sacudir ? a.sacudir() : null;
            if (this.time.now - (this.ultimoReclamo || -99999) > 7000) {
                this.ultimoReclamo = this.time.now;
                var e = this.reto.error || {};
                this.ctx.decir({ voz: e.voz || 'zeus', texto: e.texto || '¡Escucha otra vez!' }, { minMs: 900 });
            }
            this.invitar();
            if (this.errores >= 3) this.ayuda = true;
            await sac;
        },

        /* ── Fiesta final por defecto: lo reunido sale al centro y hace su acción ── */

        fiestaFinal: async function () {
            var self = this;
            var L = this.L;
            this.fase = 'fin';
            this.pista.parar();
            if (this.antesDeFiesta) await this.antesDeFiesta();
            efecto(this, 'victoria');
            Ut.confeti(this, 110);
            this.reaccion('Bailar', 60000);
            var lista = this.coleccion.filter(function (a) { return a.cont && a.cont.active; });
            var n = lista.length;
            var zona = this.zonaFiesta ? this.zonaFiesta() : { x: L.W * 0.08, y: L.H * 0.62, w: L.W * 0.84 };
            lista.forEach(function (a, i) {
                var x = zona.x + zona.w * (i + 0.5) / n;
                self.time.delayedCall(i * 140, function () {
                    if (!a.cont.active) return;
                    a.cont.setDepth(70);
                    var esc = Math.min(1, (zona.w / n) / a.tam * 0.92);
                    self.tweens.add({ targets: a.cont, x: x, y: zona.y, scale: esc, angle: 0, alpha: 1, duration: 650, ease: 'Back.easeOut', onComplete: function () { if (a.acierto) a.acierto(1600); } });
                });
            });
            await esperar(this, 3200);
            if (global.AsociaPj3D && global.AsociaPj3D.capa) global.AsociaPj3D.capa(false);
        },

        estado: function () {
            var e = {
                fase: this.fase, nivel: this.nivelActual, objetivo: this.objetivo, cuenta: this.cuenta,
                meta: this.nv ? this.nv.meta : 0, atrapados: this.atrapados || 0, hechos: this.hechos,
                errores: this.errores, sonando: !!this.sonando, coleccion: this.coleccion.length
            };
            if (this.estadoExtra) e.extra = this.estadoExtra();
            return e;
        },

        /* ── Vida de fondo ── */

        montarNubes: function (keep, n, y0, y1) {
            var self = this;
            this.nubes = [];
            for (var i = 0; i < (n || 3); i++) {
                var c = keep(this.add.container(rnd(0, this.L.W), rnd(y0, y1)).setDepth(1).setAlpha(0.92));
                var t = rnd(0.6, 1.1);
                [[0, 0, 26], [24, -10, 22], [46, 2, 20], [20, 8, 24]].forEach(function (q) { c.add(self.add.circle(q[0] * t, q[1] * t, q[2] * t, 0xffffff)); });
                c.vx = rnd(6, 14);
                this.nubes.push(c);
            }
        },

        update: function (time, delta) {
            var self = this;
            var L = this.L;
            if (!L) return;
            (this.vivos || []).forEach(function (a) { if (a.cont && a.cont.active && a.actualizar) a.actualizar(time, delta); });
            var g = this.ondasG;
            if (g) {
                g.clear();
                if (this.ondas && L.bocina) {
                    var b = L.bocina;
                    for (var k = 0; k < 3; k++) {
                        var f = ((time - this.ondas) / 900 + k / 3) % 1;
                        g.lineStyle(4, 0xffffff, 0.75 * (1 - f));
                        g.strokeCircle(b.x, b.y, b.r * (1.1 + f * 0.9));
                    }
                }
            }
            if (this.bocina && this.bocina.halo) this.bocina.halo.setScale(1 + Math.sin(time / 380) * 0.06);
            if (this.fase === 'jugar' && this.autoRepetir !== false && !this.sonando && time - this.ultimoSonido > (this.repetirCada || 7500)) this.anunciar();
            (this.nubes || []).forEach(function (c) { if (c.active) { c.x += c.vx * delta / 1000; if (c.x > L.W + 80) c.x = -120; } });
            if (this.vidaAmb) this.vidaAmb.actualizar(time, delta);
            if (this.paso) this.paso(time, delta);
        }
    };

    function crear(def) {
        var esc = {};
        Object.keys(BASE).forEach(function (k) { esc[k] = BASE[k]; });
        Object.keys(def.escena).forEach(function (k) {
            if (k === 'create' || k === 'update') return;
            esc[k] = def.escena[k];
        });
        if (def.escena.preload) esc.preload = def.escena.preload;
        return B.crearMotor({ id: def.id, fondo: def.fondo || '#a5d8ff', escena: esc });
    }

    global.AsociaKit = {
        crear: crear,
        ruido: ruido, tono: tono, actx: actx,
        textura: textura, rr: rr, grano: grano, madera: madera, pared: pared, piso: piso, ventana: ventana, sombra: sombra,
        efecto: efecto
    };
})(typeof window !== 'undefined' ? window : this);
