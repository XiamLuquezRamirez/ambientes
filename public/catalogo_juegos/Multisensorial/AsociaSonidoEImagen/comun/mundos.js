/**
 * AsociaMundos — los juegos de 3-4 años («El álbum de los sonidos»), cada uno con su propia
 * mecánica de acción. El motor (motor.js) pone la bocina, los niveles, los aciertos/errores y el
 * álbum; cada mundo decide cómo se mueven los objetos en su escena:
 *
 *   parque      «Carrera en el parque»: un niño corre, el parque avanza y los objetos vienen
 *               por el sendero; hay que tocar el que suena antes de que pase.
 *   sala        «Juguetes traviesos»: el avión vuela, lo que tiene ruedas rueda y lo demás salta
 *               por la sala; se atrapa el que suena.
 *   dormitorio  «Despierta al osito»: los juguetes corretean por el cuarto; cada acierto
 *               despierta un poco al osito dormido.
 *   aeropuerto  «Torre de control»: los vehículos hacen fila ante la barrera; el que suena pasa
 *               (se levanta la barrera); los demás se cansan y se van por el desvío.
 *   estacion    «El andén»: por la vía pasan los que tienen ruedas y por el andén saltan los demás.
 *
 * Un móvil es { actor, estado, paso(dt, vel, time), fuera(), huir() }.
 */
(function (global) {
    'use strict';

    var A = global.PedniaArte;
    function Act() { return global.AsociaActores; }
    function Ut() { return global.PedniaParejaBase.util; }
    function rnd(a, b) { return a + Math.random() * (b - a); }

    var RUEDAS = ['bicicleta', 'tren', 'ambulancia', 'aspiradora', 'camion', 'motocicleta'];

    function crearActor(scene, id, x, y, tam) {
        var movil = id === 'telefono' && scene.reto.sonido === 'vibracion';
        var a = Act().crear(scene, id, x, y, tam, { variante: movil ? 'movil' : null });
        a.sonido = scene.sonidoDe ? scene.sonidoDe(id) : a.sonido;
        a.casa = { x: x, y: y };
        return a;
    }

    /**
     * Movimiento propio de cada cosa: el avión vuela ondulando, lo que tiene ruedas rueda por el
     * piso y lo demás avanza a saltos. `carriles` = alturas posibles del piso.
     */
    function moverNatural(scene, id, o) {
        var L = scene.L;
        var w = L.w;
        var vuela = id === 'avion';
        var rueda = RUEDAS.indexOf(id) >= 0;
        var carril = o.carriles[Math.floor(Math.random() * o.carriles.length)];
        var esc = carril.esc || 1;
        var t = L.tam * esc * (vuela ? 0.85 : 1);
        // Los vehículos miran a la derecha: entran por la izquierda. Los que saltan, por cualquier lado.
        var dir = vuela || rueda ? 1 : (Math.random() < 0.5 ? 1 : -1);
        var x0 = dir > 0 ? -t * 0.6 : w + t * 0.6;
        var y0 = vuela ? o.aire : carril.y;
        var a = crearActor(scene, id, x0, y0, t);
        a.cont.setDepth(carril.depth || 25);
        var m = { actor: a, dir: dir, v: rnd(70, 95) * (vuela ? 1.3 : (rueda ? 1.05 : 0.8)), fase: Math.random() * 6, y0: y0, huyendo: false, vuela: vuela, ultHumo: 0 };
        var efx = Act().efectos;
        m.paso = function (dt, vel, time) {
            var dx = m.dir * m.v * vel * dt / 1000 * (m.huyendo ? 3.2 : 1);
            a.cont.x += dx;
            if (vuela) {
                a.cont.y = m.y0 + Math.sin(a.cont.x / 70) * L.tam * 0.12;
                a.cont.angle = Math.cos(a.cont.x / 70) * -8;
                if (time > m.ultHumo) {
                    m.ultHumo = time + 90;
                    efx.humo(scene, a.cont.x - m.dir * t * 0.42, a.cont.y + t * 0.02, { tam: t * 0.12, dx: -m.dir * 14, dy: 2, crece: 1.8, ms: 800, alpha: 0.7, depth: a.cont.depth - 1 });
                }
            } else if (!rueda) {
                var antes = Math.sin(m.fase);
                m.fase += dt * 0.0062 * vel * (m.huyendo ? 2 : 1);
                var s1 = Math.sin(m.fase);
                a.cont.y = m.y0 - Math.abs(s1) * t * 0.32;
                a.cont.angle = Math.sin(m.fase * 2) * 6;
                // Aterriza: se aplasta un poco y levanta polvo.
                if ((antes > 0) !== (s1 > 0)) {
                    a.cont.scaleY = Math.abs(a.cont.scaleY) * 0.86;
                    scene.tweens.add({ targets: a.cont, scaleY: Math.abs(a.cont.scaleX), duration: 160, ease: 'Back.easeOut' });
                    efx.humo(scene, a.cont.x, m.y0 + t * 0.42, { tam: t * 0.14, tinte: 0xd9c2a3, dx: rnd(-20, 20), dy: -8, crece: 1.6, ms: 500, alpha: 0.7, depth: a.cont.depth - 1 });
                }
            } else {
                a.cont.y = m.y0 + Math.sin(time / 90 + m.fase) * 1.2;
                if (time > m.ultHumo) {
                    m.ultHumo = time + rnd(380, 600);
                    efx.humo(scene, a.cont.x - m.dir * t * 0.44, m.y0 + t * 0.34, { tam: t * 0.1, tinte: 0xced4da, dx: -m.dir * 18, dy: -6, crece: 1.8, ms: 600, alpha: 0.6, depth: a.cont.depth - 1 });
                }
            }
        };
        m.fuera = function () { return a.cont.x > w + t * 0.7 || a.cont.x < -t * 0.7; };
        m.huir = function () { m.huyendo = true; };
        m.quieto = function () { a.cont.angle = 0; if (!vuela) a.cont.y = m.y0; };
        return m;
    }

    /* ── Parque: carrera ──────────────────────────────────────── */

    var parque = {
        nombre: 'Carrera en el parque',
        velocidadBase: 95,
        montar: function (scene) {
            var L = scene.L;
            var self = this;
            this.deco = [];
            // Matas y flores del borde del sendero que pasan (se siente que se avanza).
            var texs = ['arbusto', 'flor_amarilla', 'flor_roja', 'flor_morada', 'arbusto', 'flor_azul'];
            for (var i = 0; i < 9; i++) {
                var tex = texs[i % texs.length];
                var tam = tex === 'arbusto' ? L.tam * 0.55 : L.tam * 0.3;
                var d = scene.add.image(i * (L.w / 8), L.ys + L.tam * 0.52, A.textura(scene, tex, 128)).setDisplaySize(tam, tex === 'arbusto' ? tam * 0.62 : tam).setDepth(28);
                this.deco.push(d);
            }
            // Árboles lejanos en el horizonte: pasan más despacio (paralaje).
            this.lejos = [];
            for (var j = 0; j < 6; j++) {
                var ar = scene.add.image(j * (L.w / 5) + rnd(-30, 30), L.horizonte - L.tam * 0.18, A.textura(scene, 'arbol', 128)).setDisplaySize(L.tam * 0.55, L.tam * 0.55).setDepth(2).setAlpha(0.9);
                this.lejos.push(ar);
            }
            this.corredor = Act().crear(scene, 'corriendo', Math.max(L.tam * 0.55, L.w * 0.11), L.ys, L.tam * 1.05);
            this.corredor.cont.setDepth(26);
            this.corredor.vel = 1.4;
            void self;
        },
        crear: function (scene, id) {
            var L = scene.L;
            var t = L.tam;
            var a = crearActor(scene, id, L.w + t * 0.6, L.ys, t);
            a.cont.setDepth(25);
            var mundo = this;
            var m = { actor: a, huyendo: false };
            m.paso = function (dt, vel) {
                // Si lo tocaron por error, se aleja rápido por el sendero dando saltitos.
                a.cont.x -= mundo.velocidadBase * vel * dt / 1000 * (m.huyendo ? 2.6 : 1);
                if (m.huyendo) { m.fase = (m.fase || 0) + dt * 0.012; a.cont.y = scene.L.ys - Math.abs(Math.sin(m.fase)) * t * 0.12; }
                // Si llega al corredor sin que lo atrapen, se pierde de vista (no lo atraviesa).
                var limite = mundo.corredor.cont.x + t * 0.75;
                if (a.cont.x < limite) a.cont.alpha = Math.max(0, a.cont.alpha - dt / 260);
            };
            m.fuera = function () { return a.cont.alpha <= 0.03 || a.cont.x < -t * 0.7 || a.cont.y < -t; };
            m.huir = function () { m.huyendo = true; };
            m.quieto = function () {};
            return m;
        },
        actualizar: function (scene, time, dt, vel, corre) {
            var L = scene.L;
            var v = corre ? this.velocidadBase * vel : 0;
            this.deco.forEach(function (d) {
                d.x -= v * dt / 1000;
                if (d.x < -60) d.x += L.w + 120;
            });
            this.lejos.forEach(function (d) {
                d.x -= v * 0.3 * dt / 1000;
                if (d.x < -60) d.x += L.w + 120;
            });
            this.corredor.vel = corre ? 1.2 + vel * 0.4 : 0.15;
            this.corredor.actualizar(time, dt);
        },
        alAtrapar: function (scene, m) {
            // El corredor celebra (clip Celebrar) y da un salto de alegría.
            var cor = this.corredor;
            cor.festejo = true;
            scene.time.delayedCall(2400, function () { cor.festejo = false; });
            var c = this.corredor.cont;
            var y0 = scene.L.ys;
            scene.tweens.add({ targets: c, y: y0 - scene.L.tam * 0.35, duration: 260, yoyo: true, ease: 'Quad.easeOut', onComplete: function () { c.y = y0; } });
            return Promise.resolve();
        },
        reubicar: function (scene) {
            var L = scene.L;
            this.deco.forEach(function (d, i) { d.y = L.ys + L.tam * 0.52; d.x = i * (L.w / 8); });
            this.lejos.forEach(function (d) { d.y = L.horizonte - L.tam * 0.18; });
            this.corredor.cont.setPosition(Math.max(L.tam * 0.55, L.w * 0.11), L.ys);
        }
    };

    /* ── Sala: juguetes traviesos ─────────────────────────────── */

    function carrilesPiso(L) {
        return [
            { y: L.ys, esc: 1, depth: 26 },
            { y: L.ys - L.tam * 0.42, esc: 0.78, depth: 24 }
        ];
    }
    function alturaAire(L) {
        var arriba = L.top + 2 * Math.min(46, L.tam * 0.3) + L.tam * 0.45;
        return Math.min(arriba, L.ys - L.tam * 0.95);
    }

    var sala = {
        nombre: 'Juguetes traviesos',
        montar: function (scene) {
            var L = scene.L;
            // Baúl donde se guardan los juguetes atrapados.
            this.baul = scene.add.image(L.w * 0.08 + L.tam * 0.2, L.ys + L.tam * 0.22, A.textura(scene, 'caja_juguetes', 256)).setDisplaySize(L.tam * 0.8, L.tam * 0.45).setDepth(27);
            // Tapa del baúl (gira desde atrás al abrirse).
            this.tapa = scene.add.rectangle(this.baul.x - L.tam * 0.38, this.baul.y - L.tam * 0.12, L.tam * 0.76, L.tam * 0.08, 0xe8590c).setOrigin(0, 1).setDepth(28).setStrokeStyle(2, 0xa63e00);
            this.motas = [];
            for (var i = 0; i < 10; i++) {
                var m = scene.add.circle(rnd(0, L.w * 0.22), rnd(L.top + 60, L.horizonte), rnd(1.5, 3), 0xfff3bf, 0.7).setDepth(3);
                m.v = rnd(4, 10);
                this.motas.push(m);
            }
        },
        crear: function (scene, id) {
            var L = scene.L;
            return moverNatural(scene, id, { carriles: carrilesPiso(L), aire: alturaAire(L) });
        },
        actualizar: function (scene, time, dt) {
            var L = scene.L;
            this.motas.forEach(function (m, i) {
                m.y -= m.v * dt / 1000;
                m.x += Math.sin(time / 900 + i) * 0.15;
                m.alpha = 0.35 + Math.sin(time / 500 + i) * 0.3;
                if (m.y < L.top + 40) m.y = L.horizonte;
            });
        },
        alAtrapar: function () { return Promise.resolve(); },
        alGuardar: function (scene) {
            var b = this.baul;
            var tapa = this.tapa;
            scene.tweens.add({ targets: tapa, angle: -70, duration: 260, yoyo: true, hold: 500, ease: 'Back.easeOut' });
            scene.tweens.add({ targets: b, scaleY: b.scaleY * 0.88, duration: 120, yoyo: true, delay: 380 });
            Ut().estallido(scene, b.x, b.y - 20, { n: 10, tex: 'estrella', tam: 22, dist: 80, angulo: -Math.PI / 2, abanico: 1.6, sinTinte: true });
        },
        reubicar: function (scene) {
            var L = scene.L;
            this.baul.setPosition(L.w * 0.08 + L.tam * 0.2, L.ys + L.tam * 0.22).setDisplaySize(L.tam * 0.8, L.tam * 0.45);
            this.tapa.setPosition(this.baul.x - L.tam * 0.38, this.baul.y - L.tam * 0.12);
        }
    };

    /* ── Dormitorio: despierta al osito ───────────────────────── */

    var dormitorio = {
        nombre: 'Despierta al osito',
        montar: function (scene) {
            var L = scene.L;
            var x = Math.max(L.tam * 0.6, L.w * 0.1);
            this.oso = scene.add.image(x, L.horizonte - L.tam * 0.15, A.textura(scene, 'osito', 256)).setDisplaySize(L.tam * 0.55, L.tam * 0.55).setDepth(3).setAngle(-70);
            // Penumbra de la mañana: se va aclarando a medida que el osito despierta.
            this.penumbra = scene.add.rectangle(0, 0, L.w, L.h, 0x1b1446, 0.38).setOrigin(0).setDepth(15);
            this.despierto = 0;
            this.ultZ = 0;
        },
        crear: function (scene, id) {
            var L = scene.L;
            return moverNatural(scene, id, { carriles: carrilesPiso(L), aire: alturaAire(L) });
        },
        actualizar: function (scene, time) {
            var o = this.oso;
            // Dormido: respira y suelta «z»; cuanto más despierto, más se endereza.
            var dormido = 1 - this.despierto;
            this.penumbra.fillAlpha += ((0.38 * dormido) - this.penumbra.fillAlpha) * 0.03;
            if (this.despierto >= 0.99) o.y = scene.L.horizonte - scene.L.tam * 0.15 - Math.abs(Math.sin(time / 260)) * 14;
            o.angle += ((-70 * dormido) - o.angle) * 0.05;
            o.scaleY = o.scaleX * (1 + Math.sin(time / 700) * 0.03 * dormido);
            if (dormido > 0.2 && time > this.ultZ) {
                this.ultZ = time + 1600;
                var z = scene.add.text(o.x + 10, o.y - 30, 'z', { fontFamily: 'Fredoka, sans-serif', fontSize: Math.round(18 + 10 * dormido) + 'px', color: '#5f3dc4', fontStyle: 'bold' }).setDepth(4);
                scene.tweens.add({ targets: z, x: z.x + 30, y: z.y - 50, alpha: 0, duration: 1800, onComplete: function () { z.destroy(); } });
            }
        },
        alAtrapar: function () { return Promise.resolve(); },
        alGuardar: function (scene) {
            this.despierto = Math.min(1, this.despierto + 0.12);
            var o = this.oso;
            scene.tweens.add({ targets: o, y: o.y - 18, duration: 180, yoyo: true });
            if (this.despierto >= 0.99) Ut().estallido(scene, o.x, o.y, { n: 12, tex: 'corazon', tam: 22, dist: 90 });
        },
        reubicar: function (scene) {
            var L = scene.L;
            this.oso.setPosition(Math.max(L.tam * 0.6, L.w * 0.1), L.horizonte - L.tam * 0.15);
        }
    };

    /* ── Aeropuerto: torre de control ─────────────────────────── */

    var aeropuerto = {
        nombre: 'Torre de control',
        montar: function (scene) {
            var L = scene.L;
            this.fila = [];
            this.stopX = Math.min(L.w * 0.66, L.w - 170);
            // Barrera a rayas que se levanta para dejar pasar.
            this.poste = scene.add.rectangle(this.stopX + L.tam * 0.55, L.ys + L.tam * 0.2, 12, L.tam * 0.7, 0x495057).setDepth(27);
            this.barra = scene.add.container(this.stopX + L.tam * 0.55, L.ys - L.tam * 0.12).setDepth(28);
            var largo = L.tam * 0.9;
            for (var i = 0; i < 6; i++) {
                this.barra.add(scene.add.rectangle(i * largo / 6 + largo / 12, 0, largo / 6, 12, i % 2 ? 0xffffff : 0xfa5252));
            }
            this.barra.add(scene.add.circle(0, 0, 9, 0xfcc419));
            this.luz = scene.add.circle(this.stopX + L.tam * 0.55, L.ys - L.tam * 0.2, 8, 0xfa5252).setDepth(28);
            this.lucesPista = scene.add.graphics().setDepth(3);
            this.despega = scene.add.image(-99, -99, A.textura(scene, 'avion', 128)).setDisplaySize(L.tam * 0.4, L.tam * 0.4).setDepth(2).setAlpha(0.85);
            this.proxDespegue = 3000;
        },
        crear: function (scene, id) {
            var L = scene.L;
            if (this.fila.length >= 3) return null;
            var t = L.tam * (id === 'avion' ? 0.95 : 1);
            var a = crearActor(scene, id, -t * 0.7, L.ys, t);
            a.cont.setDepth(25);
            var mundo = this;
            var m = { actor: a, huyendo: false, espera: 0, sale: false };
            this.fila.push(m);
            m.meta = function () {
                var i = mundo.fila.indexOf(m);
                return mundo.stopX - Math.max(0, i) * L.tam * 1.05;
            };
            m.paso = function (dt, vel, time) {
                if (m.sale) {
                    // Por el desvío: baja de la pista y se aleja.
                    a.cont.x += 70 * dt / 1000;
                    a.cont.y += 60 * dt / 1000;
                    a.cont.alpha = Math.max(0, a.cont.alpha - dt / 1400);
                    return;
                }
                var meta = m.meta();
                var dx = meta - a.cont.x;
                if (dx > 1) a.cont.x += Math.min(dx, 110 * vel * dt / 1000);
                else {
                    // Primero de la fila y nadie lo eligió: espera un rato y se va por el desvío.
                    if (mundo.fila[0] === m) {
                        m.espera += dt * vel;
                        var paciencia = a.id === scene.objetivo ? 6500 : 3600;
                        if (m.espera > paciencia) m.huir();
                    }
                }
            };
            m.fuera = function () { return a.cont.alpha <= 0.02 || a.cont.y > L.h + 40; };
            m.huir = function () {
                if (m.sale) return;
                m.sale = true;
                mundo.fila = mundo.fila.filter(function (q) { return q !== m; });
            };
            m.quieto = function () {};
            return m;
        },
        actualizar: function (scene, time) {
            var L = scene.L;
            this.luz.setFillStyle(this.abierta ? 0x51cf66 : 0xfa5252);
            this.luz.alpha = 0.6 + Math.sin(time / 200) * 0.4;
            // Luces de borde de pista encendiéndose en secuencia.
            var g = this.lucesPista;
            g.clear();
            var py = L.horizonte + (L.h - L.horizonte) * 0.25;
            for (var x = 20, k = 0; x < L.w; x += 60, k++) {
                var on = (Math.floor(time / 120) - k) % 12 === 0;
                g.fillStyle(on ? 0xffe066 : 0x74c0fc, on ? 1 : 0.6);
                g.fillCircle(x, py + 2, on ? 5 : 3);
            }
            // Un avión despega a lo lejos de vez en cuando.
            var d = this.despega;
            if (time > this.proxDespegue && d.x < -50) {
                d.setPosition(L.w * 0.15, L.horizonte - 10).setAngle(0);
                d.vx = 1;
            }
            if (d.vx) {
                d.x += 2.2;
                if (d.x > L.w * 0.35) { d.y -= 1.3; d.angle = -14; }
                if (d.x > L.w + 60) { d.vx = 0; d.x = -99; this.proxDespegue = time + rnd(7000, 11000); }
            }
        },
        /** El elegido sale de la fila: la barrera sube y luz verde. */
        alAtrapar: function (scene, m) {
            var self = this;
            this.fila = this.fila.filter(function (q) { return q !== m; });
            this.abierta = true;
            return new Promise(function (r) {
                scene.tweens.add({ targets: self.barra, angle: -80, duration: 380, ease: 'Back.easeOut', onComplete: r });
            });
        },
        alGuardar: function (scene) {
            var self = this;
            scene.tweens.add({ targets: this.barra, angle: 0, delay: 300, duration: 380, onComplete: function () { self.abierta = false; } });
        },
        quitar: function (m) { this.fila = this.fila.filter(function (q) { return q !== m; }); },
        reubicar: function (scene) {
            var L = scene.L;
            this.stopX = Math.min(L.w * 0.66, L.w - 170);
            this.poste.setPosition(this.stopX + L.tam * 0.55, L.ys + L.tam * 0.2);
            this.barra.setPosition(this.stopX + L.tam * 0.55, L.ys - L.tam * 0.12);
            this.luz.setPosition(this.stopX + L.tam * 0.55, L.ys - L.tam * 0.2);
        }
    };

    /* ── Estación: el andén ───────────────────────────────────── */

    var estacion = {
        nombre: 'El andén',
        montar: function (scene) {
            var L = scene.L;
            // Andén de baldosas detrás de la vía.
            this.anden = scene.add.rectangle(L.w / 2, L.ys - L.tam * 0.3, L.w, L.tam * 0.22, 0xd9c2a3).setDepth(2);
            this.borde = scene.add.rectangle(L.w / 2, L.ys - L.tam * 0.19, L.w, 6, 0xfcc419).setDepth(2);
            // El reloj del edificio (utilería: estación de 150 px en w*0.9) con agujas que avanzan.
            this.agujas = scene.add.graphics().setDepth(3);
            this.lejano = scene.add.image(-200, L.horizonte - L.tam * 0.12, A.textura(scene, 'locomotora', 128)).setDisplaySize(L.tam * 0.38, L.tam * 0.38).setDepth(1).setAlpha(0.8);
            // Vía lejana sobre la colina por donde pasa ese tren.
            this.viaLejos = scene.add.graphics().setDepth(1);
            var vy = L.horizonte - L.tam * 0.12 + L.tam * 0.14;
            this.viaLejos.lineStyle(3, 0x8d6e4f, 0.8);
            this.viaLejos.lineBetween(0, vy, L.w, vy);
            this.viaLejos.lineStyle(2, 0x6b4f35, 0.6);
            for (var x = 0; x < L.w; x += 14) this.viaLejos.lineBetween(x, vy - 2, x + 6, vy + 3);
            this.ultHumo = 0;
        },
        crear: function (scene, id) {
            var L = scene.L;
            // Los de ruedas van por la vía (adelante); los demás saltan por el andén (atrás).
            var rueda = RUEDAS.indexOf(id) >= 0 || id === 'avion';
            var carriles = rueda ? [{ y: L.ys, esc: 1, depth: 26 }] : [{ y: L.ys - L.tam * 0.42, esc: 0.85, depth: 24 }];
            return moverNatural(scene, id, { carriles: carriles, aire: alturaAire(L) });
        },
        actualizar: function (scene, time) {
            var L = scene.L;
            var cx = L.w * 0.9, cy = L.horizonte - 54 * 1 - 36;
            var g = this.agujas;
            g.clear();
            g.lineStyle(2, 0x212529, 1);
            var am = time / 1500, ah = time / 18000;
            g.lineBetween(cx, cy, cx + Math.sin(am) * 9, cy - Math.cos(am) * 9);
            g.lineStyle(3, 0x212529, 1);
            g.lineBetween(cx, cy, cx + Math.sin(ah) * 6, cy - Math.cos(ah) * 6);
            // Tren de carga a lo lejos echando humo.
            var t = this.lejano;
            t.x += 0.9;
            if (t.x > L.w + 120) t.x = -L.w * 0.6;
            if (t.x > -40 && t.x < L.w + 40 && time > this.ultHumo) {
                this.ultHumo = time + 300;
                Act().efectos.humo(scene, t.x + L.tam * 0.07, t.y - L.tam * 0.16, { tam: 14, dx: -10, dy: -24, crece: 2.2, ms: 1200, alpha: 0.6, depth: 1 });
            }
        },
        alAtrapar: function () { return Promise.resolve(); },
        reubicar: function (scene) {
            var L = scene.L;
            this.anden.setPosition(L.w / 2, L.ys - L.tam * 0.3).setSize(L.w, L.tam * 0.22);
            this.borde.setPosition(L.w / 2, L.ys - L.tam * 0.19).setSize(L.w, 6);
        }
    };

    global.AsociaMundos = { parque: parque, sala: sala, dormitorio: dormitorio, aeropuerto: aeropuerto, estacion: estacion, moverNatural: moverNatural };
})(typeof window !== 'undefined' ? window : this);
