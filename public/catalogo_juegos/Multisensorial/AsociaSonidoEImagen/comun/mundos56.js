/**
 * Mundos de 5-6 años («El laboratorio de las asociaciones»): cada juego con su propia mecánica.
 * Se suman a AsociaMundos (mundos.js) y el motor los elige por reto (MUNDO56 en motor.js).
 *
 *   casa_noche  «Apagón en la casa» (Sonido y objeto): la casa está a oscuras; se alumbra con la
 *               linterna (arrastrando el dedo) para encontrar el objeto que suena. Hay relámpagos.
 *   fabrica     «La fábrica» (Sonido de una máquina): las máquinas pasan por cintas y caen al
 *               contenedor si nadie atrapa la que suena; desde el nivel 3 hay dos cintas.
 *   calle       «La calle» (Sonido de transporte): tráfico en dos carriles con sentidos opuestos y
 *               aviones en el cielo.
 *   patio       «El patio del recreo» (Sonido de una acción): Zeus y Zoe (3D) corren, saltan,
 *               aplauden o duermen la siesta en la banca.
 *   inundacion  «¡Se inunda la casa!» (Sonido del agua): una llave quedó abierta y el agua sube;
 *               hay que cerrar la que suena. En cada nivel cambian de lugar.
 *   feria       «La noria» (La gran asociación): un telón tapa la noria mientras suena; a los 2 s
 *               se abre y hay que atrapar la cabina correcta mientras gira.
 *
 * Los mundos `estatico` arman sus objetos en preparar(scene, nivel) y no los destruyen al acertar.
 */
(function (global) {
    'use strict';

    var A = global.PedniaArte;
    function Act() { return global.AsociaActores; }
    function Ut() { return global.PedniaParejaBase.util; }
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function mezclar(l) { return Ut().mezclar(l); }

    function crearActor(scene, id, x, y, tam) {
        var movil = id === 'telefono' && scene.reto.sonido === 'vibracion';
        var a = Act().crear(scene, id, x, y, tam, { variante: movil ? 'movil' : null });
        a.sonido = scene.sonidoDe ? scene.sonidoDe(id) : a.sonido;
        a.casa = { x: x, y: y };
        return a;
    }

    /** Borra los objetos fijos del nivel anterior. */
    function limpiar(scene) {
        (scene.pops || []).forEach(function (p) { if (p.actor && p.actor.cont.active) p.actor.destruir(); });
        scene.pops = [];
    }

    /** Lista de `n` objetos que incluye todos los que se pueden pedir en el nivel. */
    function repartoCon(scene, nv, n) {
        var ops = (scene.reto.opciones || []).slice();
        var deben = nv.rota ? nv.rota.slice() : [nv.objetivo];
        var lista = deben.slice(0, n);
        while (lista.length < n) lista.push(ops[Math.floor(Math.random() * ops.length)]);
        return mezclar(lista);
    }

    function nivel(scene) { return Math.max(0, Math.min(3, scene.nivelActual || 0)); }

    /* ── Móvil que cruza la pantalla (con o sin volteo) ───────── */

    function cruzar(scene, id, o) {
        var L = scene.L;
        var t = o.tam;
        var dir = o.dir;
        var x0 = dir > 0 ? -t * 0.7 : L.w + t * 0.7;
        var a = crearActor(scene, id, x0, o.y, t);
        a.cont.setDepth(o.depth || 25);
        if (dir < 0 && o.voltear) a.cont.scaleX = -1;
        var m = { actor: a, v: o.v, huyendo: false, fase: Math.random() * 6, y0: o.y };
        m.paso = function (dt, vel, time) {
            a.cont.x += dir * m.v * vel * dt / 1000 * (m.huyendo ? 3 : 1);
            if (o.ondula) a.cont.y = m.y0 + Math.sin(a.cont.x / 70) * t * 0.1;
            if (o.salta) { m.fase += dt * 0.006 * vel; a.cont.y = m.y0 - Math.abs(Math.sin(m.fase)) * t * 0.3; }
            if (o.alPaso) o.alPaso(m, dt, vel, time);
        };
        m.fuera = function () { return a.cont.x > L.w + t * 0.8 || a.cont.x < -t * 0.8 || a.cont.alpha <= 0.02; };
        m.huir = function () { m.huyendo = true; };
        m.quieto = function () { a.cont.angle = 0; };
        return m;
    }

    /* ══ Apagón en la casa ══ */

    function cuartos(L) {
        var izq = L.w * 0.04;
        var der = L.w - (L.w < 700 ? 16 : 120);
        var top = L.top + Math.max(96, L.marco * 1.25);
        var bajo = L.h - 14;
        var cols = 3, filas = 2;
        var cw = (der - izq) / cols, ch = (bajo - top) / filas;
        var out = [];
        for (var f = 0; f < filas; f++) for (var c = 0; c < cols; c++) out.push({ x: izq + c * cw, y: top + f * ch, w: cw, h: ch });
        return { izq: izq, der: der, top: top, bajo: bajo, lista: out };
    }

    var casa_noche = {
        nombre: 'Apagón en la casa',
        estatico: true,
        color: '#1b1f3b',
        fondo: function (scene, g) {
            var L = scene.L, w = L.w, h = L.h;
            g.fillGradientStyle(0x0b1026, 0x0b1026, 0x2b3a67, 0x2b3a67, 1);
            g.fillRect(0, 0, w, h);
            g.fillStyle(0xffffff, 0.8);
            for (var i = 0; i < 40; i++) g.fillCircle((i * 137) % w, (i * 53) % Math.max(60, h * 0.5), (i % 3) * 0.6 + 0.8);
            g.fillStyle(0xfff3bf, 1);
            g.fillCircle(w * 0.9, L.top + 40, 26);
            g.fillStyle(0x2b3a67, 1);
            g.fillCircle(w * 0.9 + 12, L.top + 32, 24);
            var C = cuartos(L);
            // Techo, paredes de cada cuarto (colores distintos) y pisos.
            g.fillStyle(0x7a3e1d, 1);
            g.fillTriangle(C.izq - 14, C.top + 2, C.der + 14, C.top + 2, (C.izq + C.der) / 2, C.top - 70);
            var paredes = [0xffe8cc, 0xd3f9d8, 0xd0ebff, 0xfff3bf, 0xffdeeb, 0xe5dbff];
            C.lista.forEach(function (r, k) {
                g.fillStyle(paredes[k % paredes.length], 1);
                g.fillRect(r.x, r.y, r.w, r.h);
                g.fillStyle(0xa0522d, 1);
                g.fillRect(r.x, r.y + r.h - 10, r.w, 10);
            });
            g.lineStyle(8, 0x5c3317, 1);
            g.strokeRect(C.izq, C.top, C.der - C.izq, C.bajo - C.top);
            g.lineStyle(6, 0x5c3317, 1);
            for (var c = 1; c < 3; c++) g.lineBetween(C.izq + c * (C.der - C.izq) / 3, C.top, C.izq + c * (C.der - C.izq) / 3, C.bajo);
            g.lineBetween(C.izq, (C.top + C.bajo) / 2, C.der, (C.top + C.bajo) / 2);
        },
        montar: function (scene) {
            var self = this;
            this.C = cuartos(scene.L);
            this.luz = { x: -999, y: -999 };
            this.rayo = 0;
            this.proxRayo = 0;
            this.sombras = this.C.lista.map(function (r) {
                return scene.add.rectangle(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h, 0x050814, 0.9).setDepth(30);
            });
            this.cono = scene.add.circle(-999, -999, 70, 0xfff3bf, 0.18).setDepth(31).setBlendMode(Phaser.BlendModes.ADD);
            this.lluvia = scene.add.graphics().setDepth(4);
            this.destello = scene.add.rectangle(0, 0, scene.L.w, scene.L.h, 0xe7f5ff, 0).setOrigin(0).setDepth(32);
            this.encendido = {};
            scene.input.on('pointermove', function (p) { self.luz = { x: p.x, y: p.y }; });
            scene.input.on('pointerdown', function (p) { self.luz = { x: p.x, y: p.y }; });
        },
        preparar: function (scene, nv) {
            limpiar(scene);
            var C = this.C;
            var tipos = repartoCon(scene, nv, C.lista.length);
            C.lista.forEach(function (r, k) {
                var t = Math.min(r.w, r.h) * 0.78;
                var a = crearActor(scene, tipos[k], r.x + r.w / 2, r.y + r.h / 2 - 4, t);
                a.cont.setDepth(25);
                scene.pops.push({ actor: a, estado: 'arriba', fijo: true, cuarto: k });
            });
        },
        actualizar: function (scene, time, dt) {
            var self = this;
            var juega = scene.fase === 'jugar' || scene.fase === 'llamando';
            var n = nivel(scene);
            var oscuro = juega ? [0.88, 0.92, 0.94, 0.96][n] : 0;
            // Relámpagos: iluminan toda la casa un instante.
            if (juega && time > this.proxRayo) {
                this.proxRayo = time + rnd(6500, 9500);
                this.rayo = time + 380;
                this.destello.fillAlpha = 0.55;
                scene.tweens.add({ targets: this.destello, fillAlpha: 0, duration: 420, ease: 'Quad.easeOut' });
                Ut().estallido(scene, rnd(40, scene.L.w - 40), scene.L.top + 20, { n: 4, tex: 'chispa', tam: 22, dist: 40, colores: [0xffffff, 0xd0ebff] });
            }
            var relampago = time < this.rayo;
            // Lluvia fuera de la casa (a los lados y sobre el techo).
            var L = scene.L, g = this.lluvia;
            g.clear();
            g.lineStyle(2, 0xa5d8ff, 0.55);
            for (var i = 0; i < 70; i++) {
                var x = (i * 97.3 + time * 0.05 * (1 + (i % 3) * 0.2)) % L.w;
                var y = (i * 53.7 + time * 0.6) % L.h;
                if (x > this.C.izq && x < this.C.der && y > this.C.top) continue;
                g.lineBetween(x, y, x - 4, y + 14);
            }
            this.cono.setPosition(this.luz.x, this.luz.y).setVisible(juega && this.luz.x > 0);
            this.sombras.forEach(function (s, k) {
                var r = self.C.lista[k];
                var dentro = self.luz.x > r.x && self.luz.x < r.x + r.w && self.luz.y > r.y && self.luz.y < r.y + r.h;
                var meta = relampago || dentro || self.encendido[k] > time ? 0.05 : oscuro;
                s.fillAlpha += (meta - s.fillAlpha) * Math.min(1, dt / 90);
            });
        },
        alAtrapar: function (scene, pop) {
            this.encendido[pop.cuarto] = scene.time.now + 6000;
            return Promise.resolve();
        },
        /** El cuarto queda con luz un rato y su objeto se cambia por otro. */
        trasAtrapar: async function (scene, pop) {
            var r = this.C.lista[pop.cuarto];
            var ops = (scene.reto.opciones || []);
            var nuevo = ops[Math.floor(Math.random() * ops.length)];
            await Ut().tween(scene, { targets: pop.actor.cont, alpha: 0, duration: 250 });
            pop.actor.destruir();
            scene.pops = scene.pops.filter(function (q) { return q !== pop; });
            var t = Math.min(r.w, r.h) * 0.78;
            var a = crearActor(scene, nuevo, r.x + r.w / 2, r.y + r.h / 2 - 4, t);
            a.cont.setDepth(25);
            scene.pops.push({ actor: a, estado: 'arriba', fijo: true, cuarto: pop.cuarto });
            // Siempre debe quedar al menos uno de cada cosa que se puede pedir.
            var nv = scene.nv;
            var deben = nv && nv.rota ? nv.rota : [];
            deben.forEach(function (id) {
                if (!scene.pops.some(function (q) { return q.actor.id === id; })) {
                    var q = scene.pops[Math.floor(Math.random() * scene.pops.length)];
                    var rr = this.C.lista[q.cuarto];
                    q.actor.destruir();
                    q.actor = crearActor(scene, id, rr.x + rr.w / 2, rr.y + rr.h / 2 - 4, Math.min(rr.w, rr.h) * 0.78);
                    q.actor.cont.setDepth(25);
                }
            }, this);
        },
        reubicar: function () {}
    };

    /* ══ La fábrica ══ */

    var fabrica = {
        nombre: 'La fábrica',
        color: '#c5d0dc',
        fondo: function (scene, g) {
            var L = scene.L, w = L.w, h = L.h;
            g.fillGradientStyle(0xdee2e6, 0xdee2e6, 0xadb5bd, 0xadb5bd, 1);
            g.fillRect(0, 0, w, h);
            g.fillStyle(0x868e96, 1);
            for (var x = 30; x < w; x += 160) g.fillRect(x, L.top + 10, 90, 50);
            g.fillStyle(0xa5d8ff, 1);
            for (var x2 = 36; x2 < w; x2 += 160) g.fillRect(x2, L.top + 16, 78, 38);
            g.lineStyle(10, 0xfab005, 1);
            g.lineBetween(0, L.top + 74, w, L.top + 74);
            g.fillStyle(0x495057, 1);
            g.fillRect(0, h - 26, w, 26);
            for (var y = 0; y < 6; y++) { g.fillStyle(y % 2 ? 0xfcc419 : 0x212529, 1); g.fillRect(y * 30, h - 26, 30, 26); }
        },
        montar: function (scene) {
            var L = scene.L;
            this.g = scene.add.graphics().setDepth(20);
            this.off = 0;
            this.b1 = { y: L.ys + L.tam * 0.47, dir: -1 };
            this.b2 = { y: L.ys - L.tam * 0.72, dir: 1 };
            this.engranes = [];
            for (var i = 0; i < 3; i++) {
                var e = scene.add.image(L.w * (0.2 + i * 0.3), L.top + 120, A.textura(scene, 'engranaje', 128)).setDisplaySize(64, 64).setDepth(2);
                this.engranes.push(e);
            }
            this.vapor = 0;
            this.baliza = scene.add.circle(L.w * 0.5, L.top + 84, 9, 0xff922b).setDepth(3);
            this.haz = scene.add.triangle(L.w * 0.5, L.top + 84, 0, 0, 90, -14, 90, 14, 0xffd8a8, 0.35).setOrigin(0, 0.5).setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
            this.brazo = scene.add.graphics().setDepth(34);
            this.garra = null;
            // Contenedores al final de cada cinta.
            this.bin1 = scene.add.image(40, this.b1.y + 6, A.textura(scene, 'caja_carton', 256)).setDisplaySize(L.tam * 0.8, L.tam * 0.55).setDepth(27);
            this.bin2 = scene.add.image(L.w - 40, this.b2.y + 6, A.textura(scene, 'caja_carton', 256)).setDisplaySize(L.tam * 0.7, L.tam * 0.48).setDepth(27);
        },
        cinta: function (b, x0, x1, activa) {
            var g = this.g;
            g.fillStyle(0x343a40, activa ? 1 : 0.35);
            g.fillRoundedRect(x0, b.y - 6, x1 - x0, 16, 8);
            g.fillStyle(0x868e96, activa ? 1 : 0.35);
            for (var x = x0 + ((this.off * b.dir) % 30 + 30) % 30; x < x1; x += 30) g.fillRect(x, b.y - 4, 12, 4);
            g.fillStyle(0x495057, activa ? 1 : 0.35);
            for (var r = x0 + 20; r < x1; r += 70) g.fillCircle(r, b.y + 14, 7);
        },
        actualizar: function (scene, time, dt, vel, anda) {
            var L = scene.L;
            if (anda) this.off += 60 * vel * dt / 1000;
            this.engranes.forEach(function (e, i) { if (anda) e.rotation += (i % 2 ? -1 : 1) * dt / 400; });
            this.g.clear();
            this.cinta(this.b1, 70, L.w - 10, true);
            this.cinta(this.b2, 10, L.w - 70, nivel(scene) >= 2);
            this.bin2.setAlpha(nivel(scene) >= 2 ? 1 : 0.3);
            this.haz.rotation = time / 300;
            this.baliza.alpha = 0.6 + Math.sin(time / 150) * 0.4;
            if (anda && time > this.vapor) {
                this.vapor = time + rnd(700, 1300);
                Act().efectos.humo(scene, rnd(40, L.w - 40), L.top + 70, { tam: 22, tinte: 0xf8f9fa, dx: rnd(-15, 15), dy: -40, crece: 2.4, ms: 1400, alpha: 0.75, depth: 3 });
            }
            // Brazo mecánico: cable desde el techo hasta la garra.
            var b = this.brazo;
            b.clear();
            if (this.garra) {
                var gx = this.garra.x, gy = this.garra.y;
                b.lineStyle(4, 0x495057, 1);
                b.lineBetween(gx, L.top + 74, gx, gy);
                b.fillStyle(0xfab005, 1);
                b.fillRect(gx - 16, gy - 8, 32, 10);
                b.lineStyle(5, 0x495057, 1);
                var ab = this.garra.abre;
                b.lineBetween(gx - 12, gy, gx - 12 - ab, gy + 22);
                b.lineBetween(gx + 12, gy, gx + 12 + ab, gy + 22);
            }
        },
        crear: function (scene, id) {
            var L = scene.L;
            var arriba = nivel(scene) >= 2 && Math.random() < 0.45;
            var b = arriba ? this.b2 : this.b1;
            var t = L.tam * (arriba ? 0.8 : 0.95);
            var fin = arriba ? L.w - 40 : 40;
            return cruzar(scene, id, {
                tam: t, dir: b.dir, y: b.y - t * 0.47, v: 75, depth: arriba ? 23 : 26,
                alPaso: function (m) {
                    // Al llegar al contenedor se cae dentro.
                    var a = m.actor.cont;
                    if ((b.dir < 0 && a.x < fin + 10) || (b.dir > 0 && a.x > fin - 10)) {
                        a.y += 4;
                        a.alpha -= 0.06;
                        a.setScale(Math.max(0.3, a.scaleY - 0.02));
                    }
                }
            });
        },
        /** La garra baja del techo, se cierra sobre la máquina y la levanta de la cinta. */
        alAtrapar: async function (scene, pop) {
            var a = pop.actor.cont;
            var t = pop.actor.tam;
            var self = this;
            this.garra = { x: a.x, y: scene.L.top + 80, abre: 10 };
            await Ut().tween(scene, { targets: this.garra, y: a.y - t * 0.5, duration: 320, ease: 'Quad.easeIn' });
            await Ut().tween(scene, { targets: this.garra, abre: -2, duration: 120 });
            var subir = t * 0.2;
            scene.tweens.add({ targets: this.garra, y: this.garra.y - subir, duration: 300 });
            await Ut().tween(scene, { targets: a, y: a.y - subir, duration: 300, ease: 'Sine.easeOut' });
            scene.time.delayedCall(2600, function () {
                if (!self.garra) return;
                scene.tweens.add({ targets: self.garra, y: scene.L.top + 70, abre: 10, duration: 400, onComplete: function () { self.garra = null; } });
            });
        },
        reubicar: function () {}
    };

    /* ══ La calle ══ */

    var calle = {
        nombre: 'La calle',
        color: '#a5d8ff',
        fondo: function (scene, g) {
            var L = scene.L, w = L.w, h = L.h;
            var carril2 = L.ys - L.tam * 0.55;
            var acera = carril2 - L.tam * 0.38;
            g.fillGradientStyle(0x74c0fc, 0x74c0fc, 0xd0ebff, 0xd0ebff, 1);
            g.fillRect(0, 0, w, acera);
            // Edificios con ventanas.
            var colores = [0xffa94d, 0x91a7ff, 0xffd43b, 0x63e6be, 0xf783ac, 0xadb5bd];
            for (var i = 0, x = 0; x < w; i++) {
                var bw = 70 + (i * 37) % 60, bh = 90 + (i * 53) % 110;
                g.fillStyle(colores[i % colores.length], 1);
                g.fillRect(x, acera - bh, bw - 6, bh);
                g.fillStyle(0xe7f5ff, 0.9);
                for (var yy = acera - bh + 12; yy < acera - 20; yy += 26) for (var xx = x + 10; xx < x + bw - 20; xx += 20) g.fillRect(xx, yy, 10, 14);
                x += bw;
            }
            g.fillStyle(0xced4da, 1);
            g.fillRect(0, acera, w, L.tam * 0.12);
            g.fillStyle(0x495057, 1);
            g.fillRect(0, acera + L.tam * 0.12, w, h - acera);
            // Carril de atrás: vía férrea sobre balasto (solo el tren va por ahí).
            var rv = carril2 + L.tam * 0.36;
            g.fillStyle(0x8d7b68, 1);
            g.fillRect(0, rv - 18, w, 34);
            g.fillStyle(0x6b4f35, 1);
            for (var xs = 0; xs < w; xs += 24) g.fillRect(xs, rv - 14, 12, 26);
            g.fillStyle(0xadb5bd, 1);
            g.fillRect(0, rv - 10, w, 4);
            g.fillRect(0, rv + 6, w, 4);
            g.fillStyle(0xffffff, 0.9);
            var medio = rv + 26;
            for (var x3 = 10; x3 < w; x3 += 70) g.fillRect(x3, medio, 38, 5);
            // Paso de cebra.
            for (var k = 0; k < 6; k++) g.fillRect(w * 0.45 + k * 18, rv + 34, 10, h - rv - 34);
        },
        montar: function (scene) {
            var L = scene.L;
            var x = L.w * 0.42;
            var acera = L.ys - L.tam * 0.55 - L.tam * 0.38;
            this.poste = scene.add.rectangle(x, acera - L.tam * 0.25, 8, L.tam * 0.6, 0x343a40).setDepth(3);
            this.caja = scene.add.rectangle(x, acera - L.tam * 0.6, 26, 66, 0x212529).setDepth(3);
            this.focos = [0xfa5252, 0xfcc419, 0x51cf66].map(function (c, i) {
                return scene.add.circle(x, acera - L.tam * 0.6 - 21 + i * 21, 8, c, 0.25).setDepth(3);
            });
            this.ciclo = 0;
        },
        crear: function (scene, id) {
            var L = scene.L;
            if (id === 'avion') {
                var dirA = Math.random() < 0.5 ? 1 : -1;
                return cruzar(scene, id, { tam: L.tam * 0.75, dir: dirA, voltear: true, y: Math.max(L.top + L.marco * 1.5, L.ys - L.tam * 1.35), v: 120, ondula: true, depth: 22 });
            }
            // El tren solo por la vía de atrás; los demás por la calle, en ambos sentidos.
            var lejos = id === 'tren';
            var sentido = lejos ? -1 : (Math.random() < 0.5 ? 1 : -1);
            return cruzar(scene, id, {
                tam: L.tam * (lejos ? 0.78 : 1), dir: sentido, voltear: true,
                y: lejos ? L.ys - L.tam * 0.55 : L.ys, v: lejos ? 95 : 110, depth: lejos ? 23 : 26,
                alPaso: function (m, dt, vel, time) {
                    // Humo del escape y un leve rebote de la suspensión.
                    var a = m.actor;
                    a.cont.y = m.y0 + Math.sin(time / 80 + m.fase) * 1.3;
                    if (time > (m.ultHumo || 0)) {
                        m.ultHumo = time + rnd(260, 420);
                        var d = sentido;
                        Act().efectos.humo(scene, a.cont.x - d * a.tam * 0.47, m.y0 + a.tam * 0.25, { tam: a.tam * 0.1, tinte: 0xadb5bd, dx: -d * 22, dy: -10, crece: 2, ms: 700, alpha: 0.6, depth: a.cont.depth - 1 });
                    }
                }
            });
        },
        actualizar: function (scene, time) {
            // Semáforo: verde, amarillo, rojo.
            var fase = Math.floor(time / 2200) % 3;
            var cual = [2, 1, 0][fase];
            this.focos.forEach(function (f, i) { f.fillAlpha = i === cual ? 1 : 0.22; });
        },
        alAtrapar: function () { return Promise.resolve(); },
        reubicar: function () {}
    };

    /* ══ El patio del recreo ══ */

    var patio = {
        nombre: 'El patio del recreo',
        // Zeus y Zoe ya juegan en el patio: no hace falta el presentador.
        sinPresentador: true,
        color: '#a5d8ff',
        fondo: function (scene, g) {
            var L = scene.L, w = L.w, h = L.h;
            var hz = L.ys - L.tam * 0.75;
            g.fillGradientStyle(0x74c0fc, 0x74c0fc, 0xd0ebff, 0xd0ebff, 1);
            g.fillRect(0, 0, w, hz);
            // Colegio al fondo.
            g.fillStyle(0xffc078, 1);
            g.fillRect(w * 0.08, hz - 120, w * 0.84, 120);
            g.fillStyle(0xe8590c, 1);
            g.fillTriangle(w * 0.05, hz - 118, w * 0.95, hz - 118, w * 0.5, hz - 175);
            g.fillStyle(0xd0ebff, 1);
            for (var x = w * 0.12; x < w * 0.88; x += 70) g.fillRect(x, hz - 95, 40, 34);
            g.fillGradientStyle(0x8ce99a, 0x8ce99a, 0x40c057, 0x40c057, 1);
            g.fillRect(0, hz, w, h - hz);
            g.fillStyle(0xe9c99a, 1);
            g.fillEllipse(w * 0.5, L.ys + L.tam * 0.45, w * 0.95, L.tam * 0.55);
        },
        montar: function (scene) {
            var L = scene.L;
            this.bancaX = Math.min(L.w * 0.78, L.w - 190);
            this.banca = scene.add.image(this.bancaX, L.ys - L.tam * 0.25, A.textura(scene, 'banca', 256)).setDisplaySize(L.tam * 1.2, L.tam * 0.85).setDepth(21);
            scene.add.image(L.w * 0.05, L.ys - L.tam * 0.85, A.textura(scene, 'arbol', 256)).setDisplaySize(L.tam * 1.3, L.tam * 1.3).setDepth(3);
            this.dormido = false;
            this.pelota = scene.add.container(L.w * 0.3, L.ys + L.tam * 0.3).setDepth(22);
            var bola = scene.add.circle(0, 0, L.tam * 0.09, 0xfa5252).setStrokeStyle(3, 0xffffff);
            var franja = scene.add.rectangle(0, 0, L.tam * 0.18, L.tam * 0.04, 0xffffff);
            this.pelota.add([bola, franja]);
            this.pelota.vx = 70;
            this.pelota.fase = 0;
            this.pelotaSombra = scene.add.ellipse(this.pelota.x, L.ys + L.tam * 0.39, L.tam * 0.16, L.tam * 0.04, 0x000000, 0.2).setDepth(21);
        },
        crear: function (scene, id) {
            var L = scene.L;
            var dir = Math.random() < 0.5 ? 1 : -1;
            if (id === 'durmiendo') {
                // Siesta en la banca: aparece, ronca un rato y se va.
                if (this.dormido) return null;
                this.dormido = true;
                var self = this;
                var a = crearActor(scene, id, this.bancaX, this.banca.y - L.tam * 0.12, L.tam * 0.95);
                // En el patio duerme sobre la banca: sin la cama del actor.
                if (a.cont.list[0]) a.cont.list[0].setVisible(false);
                a.cont.setDepth(24).setAlpha(0);
                scene.tweens.add({ targets: a.cont, alpha: 1, duration: 400 });
                var m = { actor: a, vida: 6500, huyendo: false };
                m.paso = function (dt, vel) {
                    m.vida -= dt * vel * (m.huyendo ? 4 : 1);
                    if (m.vida < 500) a.cont.alpha = Math.max(0, m.vida / 500);
                };
                m.fuera = function () { if (m.vida <= 0) self.dormido = false; return m.vida <= 0; };
                m.huir = function () { m.huyendo = true; };
                m.quieto = function () { m.vida = Math.max(m.vida, 3000); };
                var destruir = a.destruir;
                a.destruir = function () { self.dormido = false; destruir(); };
                return m;
            }
            var lejos = Math.random() < 0.4;
            var v = id === 'corriendo' ? 150 : (id === 'saltando' ? 70 : 50);
            return cruzar(scene, id, {
                tam: L.tam * (lejos ? 0.8 : 1), dir: dir, voltear: true,
                y: lejos ? L.ys - L.tam * 0.42 : L.ys, v: v, depth: lejos ? 23 : 26
            });
        },
        actualizar: function (scene, time, dt) {
            var L = scene.L, b = this.pelota;
            b.fase += dt / 1000 * 3.4;
            b.x += b.vx * dt / 1000;
            if (b.x > L.w - 170 || b.x < 40) b.vx *= -1;
            var alto = Math.abs(Math.sin(b.fase)) * L.tam * 0.45;
            b.y = L.ys + L.tam * 0.3 - alto;
            b.rotation += b.vx * dt / 4000;
            var suelo = alto < 4;
            b.scaleY = suelo ? 0.8 : 1;
            b.scaleX = suelo ? 1.15 : 1;
            this.pelotaSombra.x = b.x;
            this.pelotaSombra.setScale(1 - alto / (L.tam * 0.9));
        },
        alAtrapar: function () { return Promise.resolve(); },
        reubicar: function () {}
    };

    /* ══ ¡Se inunda la casa! ══ */

    var inundacion = {
        nombre: '¡Se inunda la casa!',
        estatico: true,
        color: '#e3fafc',
        fondo: function (scene, g) {
            var L = scene.L, w = L.w, h = L.h;
            g.fillGradientStyle(0xe3fafc, 0xe3fafc, 0xc5f6fa, 0xc5f6fa, 1);
            g.fillRect(0, 0, w, h);
            g.lineStyle(2, 0x15aabf, 0.15);
            for (var x = 0; x < w; x += 46) g.lineBetween(x, L.top + 60, x, h);
            for (var y = L.top + 60; y < h; y += 46) g.lineBetween(0, y, w, y);
            // A la derecha, el jardín (allí van la fuente y la regadera), separado por la pared.
            var jx = inundacion.borde(L);
            g.fillGradientStyle(0x74c0fc, 0x74c0fc, 0xd0ebff, 0xd0ebff, 1);
            g.fillRect(jx, L.top + 60, w - jx, h);
            g.fillStyle(0x8ce99a, 1);
            g.fillRect(jx, L.ys - L.tam * 0.25, w - jx, h);
            g.fillStyle(0xffffff, 1);
            for (var fx = jx + 10; fx < w; fx += 26) g.fillRect(fx, L.ys - L.tam * 0.55, 12, L.tam * 0.32);
            g.fillRect(jx, L.ys - L.tam * 0.47, w - jx, 8);
            g.fillStyle(0xd9a066, 1);
            g.fillRect(jx - 10, L.top + 60, 20, h);
            // Tanque de agua arriba a la izquierda, con su caño.
            g.fillStyle(0x339af0, 1);
            g.fillRoundedRect(16, L.top + 6, 70, 56, 10);
            g.fillStyle(0x868e96, 1);
            g.fillRect(46, L.top + 62, 10, 30);
            g.fillStyle(0xadb5bd, 1);
            g.fillRect(0, L.ys + L.tam * 0.47, w, h);
        },
        montar: function (scene) {
            this.agua = scene.add.graphics().setDepth(29);
            this.nivelAgua = 0;
            this.gotas = 0;
            var L = scene.L;
            // Cosas que flotan cuando sube el agua.
            this.flotan = [];
            var pato = scene.add.container(L.w * 0.25, L.h + 40).setDepth(30);
            pato.add([scene.add.ellipse(0, 0, 40, 26, 0xffd43b), scene.add.circle(14, -14, 11, 0xffd43b), scene.add.triangle(26, -14, 0, -4, 10, 0, 0, 4, 0xf76707), scene.add.circle(17, -17, 2.2, 0x212529)]);
            var bola = scene.add.container(L.w * 0.6, L.h + 40).setDepth(30);
            bola.add([scene.add.circle(0, 0, 14, 0x339af0).setStrokeStyle(3, 0xffffff), scene.add.rectangle(0, 0, 28, 5, 0xffffff)]);
            this.flotan.push(pato, bola);
            this.ondas = 0;
        },
        /** Donde empieza el jardín: entre el hueco del centro y el de atrás a la derecha. */
        borde: function (L) { return (L.spots[1].x + L.spots[4].x) / 2; },
        preparar: function (scene, nv) {
            limpiar(scene);
            var L = scene.L;
            var jx = this.borde(L);
            // Cada cosa en su sitio real: fuente y regadera en el jardín, el resto adentro.
            var jardin = ['fuente', 'regadera'];
            var ops = (scene.reto.opciones || []).slice();
            var afuera = mezclar(ops.filter(function (id) { return jardin.indexOf(id) >= 0; }));
            var adentro = mezclar(ops.filter(function (id) { return jardin.indexOf(id) < 0; }));
            var ids = L.spots.map(function (s) { return s.x > jx ? (afuera.shift() || adentro.shift()) : (adentro.shift() || afuera.shift()); });
            L.spots.forEach(function (s, k) {
                var id = ids[k];
                var a = crearActor(scene, id, s.x, s.y - L.tam * 0.12 * s.esc, L.tam * s.esc);
                a.cont.setDepth(s.esc < 1 ? 22 : 26);
                scene.pops.push({ actor: a, estado: 'arriba', fijo: true });
            });
            this.nivelAgua = 0;
            void nv;
        },
        alLlamar: function () { this.subiendo = true; },
        actualizar: function (scene, time, dt) {
            var L = scene.L;
            var g = this.agua;
            var n = nivel(scene);
            if (scene.fase === 'jugar' && this.subiendo) this.nivelAgua = Math.min(1, this.nivelAgua + dt / [26000, 21000, 17000, 14000][n]);
            g.clear();
            var alto0 = this.nivelAgua * L.tam * 0.75;
            this.flotan.forEach(function (f, i) {
                f.x += Math.sin(time / 1500 + i * 2) * 0.35;
                f.y = L.h - alto0 - L.tam * 0.05 - Math.sin(f.x / 40 + time / 300) * 5 - 4;
                f.angle = Math.sin(time / 400 + i) * 8;
                f.visible = alto0 > 14;
            });
            if (this.nivelAgua <= 0.01) return;
            var alto = alto0;
            var base = L.h;
            // Burbujas que suben dentro del agua.
            if (time > this.ondas) {
                this.ondas = time + 300;
                var bx = rnd(20, L.w - 20);
                var bu = scene.add.circle(bx, L.h - 6, rnd(2, 5), 0xffffff, 0.7).setDepth(30);
                scene.tweens.add({ targets: bu, y: L.h - alto - L.tam * 0.03, alpha: 0.2, duration: 900, onComplete: function () { bu.destroy(); } });
            }
            g.fillStyle(0x4dabf7, 0.5);
            g.beginPath();
            g.moveTo(0, base);
            for (var x = 0; x <= L.w; x += 20) g.lineTo(x, base - alto - L.tam * 0.05 - Math.sin(x / 40 + time / 300) * 5);
            g.lineTo(L.w, base);
            g.closePath();
            g.fillPath();
            // Gotitas que caen de todas las llaves (para despistar: no dicen cuál suena).
            if (scene.fase === 'jugar' && time > this.gotas) {
                this.gotas = time + 500;
                var p = scene.pops[Math.floor(Math.random() * scene.pops.length)];
                if (p) Act().efectos.gotas(scene, p.actor.cont.x + rnd(-20, 20), p.actor.cont.y, { n: 1, tam: 10, caida: 50, depth: 28 });
            }
        },
        alAtrapar: function () { return Promise.resolve(); },
        trasAtrapar: function (scene) {
            // Se cierra la llave: el agua baja.
            var self = this;
            this.subiendo = false;
            scene.tweens.add({ targets: this, nivelAgua: Math.max(0, this.nivelAgua - 0.6), duration: 900 });
            return Promise.resolve();
            void self;
        },
        reubicar: function () {}
    };

    /* ══ La noria de la feria ══ */

    var feria = {
        nombre: 'La noria',
        estatico: true,
        color: '#2b1b4f',
        geo: function (L) {
            var top = L.top + Math.max(96, L.marco * 1.25);
            var R = Math.max(90, Math.min((L.h - top - 40) / 2.25, L.w * 0.27));
            return { cx: Math.min(L.w * 0.47, L.w - 150 - R), cy: top + R + 18, R: R };
        },
        fondo: function (scene, g) {
            var L = scene.L, w = L.w, h = L.h;
            g.fillGradientStyle(0x1b0f3b, 0x1b0f3b, 0x5f3dc4, 0x5f3dc4, 1);
            g.fillRect(0, 0, w, h);
            g.fillStyle(0xffffff, 0.8);
            for (var i = 0; i < 50; i++) g.fillCircle((i * 131) % w, (i * 47) % Math.max(60, h * 0.6), (i % 3) * 0.6 + 0.7);
            g.fillStyle(0x2f9e44, 1);
            g.fillRect(0, h - 40, w, 40);
            // Carpas de la feria.
            [[0.08, 0xfa5252], [0.88, 0xfcc419]].forEach(function (c) {
                g.fillStyle(c[1], 1);
                g.fillTriangle(w * c[0] - 60, h - 40, w * c[0] + 60, h - 40, w * c[0], h - 170);
                g.fillStyle(0xffffff, 0.6);
                g.fillTriangle(w * c[0] - 20, h - 40, w * c[0] + 20, h - 40, w * c[0], h - 170);
            });
        },
        montar: function (scene) {
            this.g = scene.add.graphics().setDepth(20);
            this.angulo = 0;
            this.luces = 0;
            this.telon = scene.add.graphics().setDepth(40).setAlpha(0);
            this.proxFuego = 1500;
        },
        preparar: function (scene) {
            limpiar(scene);
            var L = scene.L;
            var G = this.geo(L);
            var ids = mezclar((scene.reto.opciones || []).slice());
            var self = this;
            ids.forEach(function (id, k) {
                var a = crearActor(scene, id, G.cx, G.cy, G.R * 0.55);
                a.cont.setDepth(25);
                var p = { actor: a, estado: 'arriba', base: k / ids.length * Math.PI * 2 };
                p.paso = function (dt, vel, time) {
                    var ang = self.angulo + p.base;
                    a.cont.setPosition(G.cx + Math.cos(ang) * G.R, G.cy + Math.sin(ang) * G.R + G.R * 0.12);
                    // La cabina se mece como si colgara.
                    a.cont.angle = Math.sin((time || 0) / 420 + p.base * 3) * 7;
                };
                p.fuera = function () { return false; };
                p.paso();
                scene.pops.push(p);
            });
        },
        actualizar: function (scene, time, dt, vel, anda) {
            var L = scene.L;
            var G = this.geo(L);
            var n = nivel(scene);
            if (anda && scene.fase === 'jugar') this.angulo += [0.22, 0.32, -0.42, 0.52][n] * dt / 1000;
            var g = this.g;
            g.clear();
            g.lineStyle(10, 0x868e96, 1);
            g.lineBetween(G.cx, G.cy, G.cx - G.R * 0.6, L.h - 40);
            g.lineBetween(G.cx, G.cy, G.cx + G.R * 0.6, L.h - 40);
            g.lineStyle(6, 0xdee2e6, 1);
            g.strokeCircle(G.cx, G.cy, G.R);
            for (var k = 0; k < 10; k++) {
                var a = this.angulo + k / 10 * Math.PI * 2;
                g.lineStyle(3, 0xced4da, 0.9);
                g.lineBetween(G.cx, G.cy, G.cx + Math.cos(a) * G.R, G.cy + Math.sin(a) * G.R);
                var on = (Math.floor(time / 250) + k) % 2;
                g.fillStyle(on ? 0xffe066 : 0xff8787, 1);
                g.fillCircle(G.cx + Math.cos(a) * G.R, G.cy + Math.sin(a) * G.R, 5);
            }
            g.fillStyle(0xfab005, 1);
            g.fillCircle(G.cx, G.cy, 12);
            // Fuegos artificiales en el cielo de la feria.
            if (time > this.proxFuego) {
                this.proxFuego = time + rnd(1800, 3200);
                var fx = rnd(L.w * 0.08, L.w * 0.92);
                if (Math.abs(fx - G.cx) < G.R * 1.2) fx = fx < G.cx ? G.cx - G.R * 1.3 : G.cx + G.R * 1.3;
                var fy = rnd(L.top + L.marco * 1.4, L.top + L.marco * 1.4 + 90);
                var cohete = scene.add.circle(fx, L.h - 40, 3, 0xffe066).setDepth(3);
                var cols = [[0xff6b6b, 0xffd43b], [0x74c0fc, 0xb197fc], [0x69db7c, 0xffffff]][Math.floor(Math.random() * 3)];
                scene.tweens.add({
                    targets: cohete, y: fy, duration: 700, ease: 'Quad.easeOut',
                    onComplete: function () {
                        cohete.destroy();
                        Ut().estallido(scene, fx, fy, { n: 18, tex: 'chispa', tam: 18, dist: 80, colores: cols, ms: 1100, depth: 3 });
                    }
                });
            }
            // Las cabinas cuelgan de la rueda: varilla y canasta de color debajo de cada objeto.
            var tonos = [0xff6b6b, 0x4dabf7, 0x51cf66, 0xfcc419, 0xcc5de8];
            (scene.pops || []).forEach(function (p, k) {
                if (p.base == null) return;
                var ang = feria.angulo + p.base;
                var x = G.cx + Math.cos(ang) * G.R, y = G.cy + Math.sin(ang) * G.R;
                var ax = p.actor.cont.x, ay = p.actor.cont.y;
                g.lineStyle(3, 0x495057, 1);
                g.lineBetween(x, y, ax, ay - G.R * 0.2);
                var cw = G.R * 0.52, ch = G.R * 0.2;
                g.fillStyle(tonos[k % tonos.length], 1);
                g.fillRoundedRect(ax - cw / 2, ay + G.R * 0.08, cw, ch, { tl: 2, tr: 2, bl: 10, br: 10 });
                g.fillStyle(0xffffff, 0.35);
                g.fillRect(ax - cw / 2 + 4, ay + G.R * 0.1, cw - 8, 4);
            });
        },
        /** Telón rojo que tapa la noria mientras suena (modo memoria). */
        velo: function (scene, tapar) {
            var L = scene.L;
            var G = this.geo(L);
            // Cortina de teatro con pliegues y fleco dorado.
            var g = this.telon, x0 = G.cx - G.R * 1.4, y0 = G.cy - G.R * 1.25, ancho = G.R * 2.8, alto = G.R * 2.6;
            g.clear();
            var n = 12;
            for (var k = 0; k < n; k++) {
                g.fillStyle(k % 2 ? 0xa61e1e : 0xe03131, 1);
                g.fillRect(x0 + k * ancho / n, y0, ancho / n + 1, alto);
            }
            g.fillStyle(0xfcc419, 1);
            g.fillRect(x0, y0, ancho, 14);
            g.fillRect(x0, y0 + alto - 10, ancho, 10);
            return Ut().tween(scene, { targets: g, alpha: tapar ? 1 : 0, duration: tapar ? 350 : 500 });
        },
        alAtrapar: function () { return Promise.resolve(); },
        reubicar: function () {}
    };

    var M = global.AsociaMundos = global.AsociaMundos || {};
    M.casa_noche = casa_noche;
    M.fabrica = fabrica;
    M.calle = calle;
    M.patio = patio;
    M.inundacion = inundacion;
    M.feria = feria;
})(typeof window !== 'undefined' ? window : this);
