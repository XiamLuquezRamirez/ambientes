/**
 * PedniaInvernadero — "El invernadero de aromas" (Conectando la flor — Olfato, 5-6 años).
 *
 * Un invernadero-laboratorio con estantes de plantas y una campana de vidrio donde vive la flor.
 *   1. La flor        (reto del documento): la flor silvestre suelta polen y aroma dentro de la campana de
 *                     vidrio; se arrastra el cable hasta el sentido correcto. Prueba del documento:
 *                     moléculas de aroma salen flotando y hay que atraparlas para la nariz (las notas y
 *                     los destellos que se cuelan van al oído y al ojo).
 *   2. Tubos de aroma un tablero de tubos: se tocan las piezas para girarlas hasta que el perfume viaje
 *                     desde la flor hasta la nariz (dos tableros, el segundo más grande).
 *   Cierre del documento: el Tablero de Control Humano.
 */
(function (global) {
    'use strict';

    var B = global.PedniaParejaBase;
    var U = B.util;
    var L = function () { return global.PedniaLab; };
    var A = function () { return global.PedniaArte; };

    // Aberturas de las piezas: 0 = arriba, 1 = derecha, 2 = abajo, 3 = izquierda.
    var BASE = { recto: [0, 2], codo: [0, 1] };

    function aberturas(p) {
        return BASE[p.tipo].map(function (d) { return (d + p.rot) % 4; });
    }

    var DX = [0, 1, 0, -1];
    var DY = [-1, 0, 1, 0];

    var escena = {
        create: function () {
            this.modo = '';
            this.cablesLab = [];
            this.particulas = [];
            var ops = (this.reto && this.reto.opciones) || ['lengua', 'oido', 'nariz', 'ojo', 'mano'];
            this.dibujarFondo();
            this.est = L().estaciones(this, ops, { depth: 20 });
            this.organos = this.est.organos;
            var scene = this;
            this.scale.on('resize', function () { scene.dibujarFondo(); scene.est.ubicar(); });
        },

        m: function () {
            var w = this.scale.width;
            var h = this.scale.height;
            return {
                w: w, h: h, cx: w * 0.5,
                piso: h * 0.62,
                // La campana de vidrio empieza por debajo del globo de diálogo.
                frasco: (function () {
                    var fw = Math.min(w * 0.22, 220, h * 0.3);
                    var fh = h * 0.34;
                    return { x: w * 0.5, y: Math.max(h * 0.32, 108 + fh * 0.2 + fw / 2), w: fw, h: fh };
                })(),
                obj: Phaser.Math.Clamp(Math.min(w, h) * 0.2, 90, 160)
            };
        },

        /* ── Escenario: invernadero ────────────────────────────── */

        dibujarFondo: function () {
            var m = this.m();
            var w = m.w;
            var h = m.h;
            U.cielo(this, 'iv:cielo', [[0, '#bfe6c9'], [1, '#eef9ec']]);
            if (!this.cielo) this.cielo = this.add.image(0, 0, 'iv:cielo').setOrigin(0).setDepth(-30);
            this.cielo.setDisplaySize(w, h);
            var g = this.fondoG || (this.fondoG = this.add.graphics().setDepth(-28));
            g.clear();
            // Estructura de cristal del invernadero.
            g.lineStyle(6, 0xffffff, 0.9);
            for (var x = 0; x <= w; x += w / 8) g.lineBetween(x, 0, x, m.piso);
            g.lineBetween(0, h * 0.2, w, h * 0.2);
            g.lineBetween(0, h * 0.42, w, h * 0.42);
            g.fillStyle(0xffffff, 0.18);
            for (var p = 0; p < 8; p++) g.fillTriangle(p * w / 8 + 8, 8, p * w / 8 + 40, 8, p * w / 8 + 8, h * 0.12);
            // Estantes con macetas a los lados.
            var scene = this;
            [[0.04, 0.3], [0.04, 0.5], [0.8, 0.3], [0.8, 0.5]].forEach(function (e, i) {
                var ex = w * e[0];
                var ey = h * e[1];
                var ew = w * 0.16;
                g.fillStyle(0x8a5a2b, 1);
                g.fillRect(ex, ey, ew, 8);
                g.fillStyle(0x6b3e1f, 1);
                g.fillRect(ex + 4, ey + 8, 4, 14);
                g.fillRect(ex + ew - 8, ey + 8, 4, 14);
                for (var k = 0; k < 3; k++) {
                    var px = ex + ew * (0.2 + k * 0.3);
                    g.fillStyle(0xd9773c, 1);
                    g.fillRect(px - 10, ey - 18, 20, 18);
                    g.fillStyle(0xe8894e, 1);
                    g.fillRect(px - 12, ey - 20, 24, 5);
                    g.fillStyle([0x2f9e44, 0x37b24d, 0x40c057][(i + k) % 3], 1);
                    g.fillCircle(px, ey - 30, 13);
                    g.fillCircle(px - 9, ey - 24, 9);
                    g.fillCircle(px + 9, ey - 24, 9);
                    if ((i + k) % 2) {
                        g.fillStyle([0xf06595, 0xfcc419, 0xcc5de8][(i + k) % 3], 1);
                        g.fillCircle(px + 4, ey - 36, 5);
                    }
                }
            });
            // Suelo de baldosas.
            g.fillStyle(0xc9b28f, 1);
            g.fillRect(0, m.piso, w, h - m.piso);
            g.lineStyle(2, 0xb39a74, 1);
            for (var yy = m.piso; yy < h; yy += 34) g.lineBetween(0, yy, w, yy);
            for (var xx = 0; xx < w; xx += 60) g.lineBetween(xx, m.piso, xx, h);
            // Tubos de laboratorio por la pared.
            g.lineStyle(10, 0xadb5bd, 1);
            g.lineBetween(0, h * 0.14, w, h * 0.14);
            g.lineStyle(4, 0xdee2e6, 1);
            g.lineBetween(0, h * 0.135, w, h * 0.135);
            this.dibujarFrasco();
            void scene;
        },

        dibujarFrasco: function () {
            var f = this.m().frasco;
            var g = this.frascoG || (this.frascoG = this.add.graphics().setDepth(-12));
            var v = this.vidrioG || (this.vidrioG = this.add.graphics().setDepth(14));
            g.clear();
            v.clear();
            // Base metálica con la toma del cable.
            g.fillStyle(0x495057, 1);
            g.fillRoundedRect(f.x - f.w * 0.6, f.y + f.h * 0.42, f.w * 1.2, f.h * 0.14, 10);
            g.fillStyle(0x868e96, 1);
            g.fillRoundedRect(f.x - f.w * 0.6, f.y + f.h * 0.42, f.w * 1.2, 8, 6);
            g.fillStyle(0x212529, 1);
            g.fillRoundedRect(f.x - 24, f.y + f.h * 0.53, 48, 22, 8);
            g.fillStyle(0xf783ac, 1);
            g.fillCircle(f.x, f.y + f.h * 0.53 + 11, 6);
            this.toma = { x: f.x, y: f.y + f.h * 0.53 + 11 };
            // Campana de vidrio.
            v.fillStyle(0xd0ebff, 0.18);
            v.lineStyle(3, 0xffffff, 0.85);
            v.beginPath();
            v.moveTo(f.x - f.w / 2, f.y + f.h * 0.42);
            v.lineTo(f.x - f.w / 2, f.y - f.h * 0.2);
            v.arc(f.x, f.y - f.h * 0.2, f.w / 2, Math.PI, 0);
            v.lineTo(f.x + f.w / 2, f.y + f.h * 0.42);
            v.closePath();
            v.fillPath();
            v.strokePath();
            v.fillStyle(0xffffff, 0.35);
            v.fillRoundedRect(f.x - f.w * 0.38, f.y - f.h * 0.3, 8, f.h * 0.5, 4);
            v.fillStyle(0xadb5bd, 1);
            v.fillCircle(f.x, f.y - f.h * 0.2 - f.w / 2 - 4, 8);
        },

        crearFlor: function () {
            var f = this.m().frasco;
            var tam = Math.min(f.h * 0.75, f.w * 0.95);
            var c = this.add.container(f.x, f.y + f.h * 0.42).setDepth(12);
            var flor = this.add.image(0, 0, A().textura(this, 'flor_morada', 256)).setOrigin(0.5, 0.97).setDisplaySize(tam, tam);
            c.add(flor);
            c.flor = flor;
            c.tam = tam;
            this.flor = c;
            return c;
        },

        cabeza: function () {
            var c = this.flor;
            return { x: c.x + Math.sin(c.flor.rotation) * c.tam * 0.55, y: c.y - c.tam * 0.68 };
        },

        /** Polen y aroma dentro del frasco. */
        emitir: function () {
            if (!this.flor) return;
            var h = this.cabeza();
            U.aroma(this, h.x, h.y, { n: 2, alto: 60, depth: 13 });
            var p = this.add.circle(h.x + U.rnd(-14, 14), h.y, 2.5, 0xfcc419).setDepth(13);
            this.tweens.add({ targets: p, y: h.y - U.rnd(30, 60), x: p.x + U.rnd(-30, 30), alpha: 0, duration: 1600, onComplete: function () { p.destroy(); } });
        },

        /* ── Ronda 1 ───────────────────────────────────────────── */

        rondaFlor: async function () {
            var scene = this;
            this.modo = 'flor';
            this.crearFlor();
            this.flor.alpha = 0;
            this.tweens.add({ targets: this.flor, alpha: 1, duration: 600 });
            this.emisor = this.time.addEvent({ delay: 500, loop: true, callback: function () { scene.emitir(); } });
            U.sfx('sshhBloom');
            await this.ctx.decir(this.reto.presentacion || { voz: 'zeus', texto: 'Conecta la flor con el sentido que nos permite percibir su aroma.' });
            var r = this.reto;
            var cb = await L().conectar(this, this.est, {
                desde: function () { return scene.toma; },
                correcto: 'nariz',
                alError: function (id) {
                    var linea = null;
                    (r.errores || []).forEach(function (e) { if (!linea && (e.objetos || []).indexOf(id) >= 0) linea = e; });
                    return scene.ctx.decir(linea || r.errorOtro || { voz: 'zoe', texto: 'Escucha u observa nuevamente. ¡Inténtalo otra vez!' });
                }
            });
            // El perfume viaja por el cable hasta la nariz.
            for (var i = 0; i < 5; i++) this.time.delayedCall(i * 150, function () { scene.porCable(cb, 0xf783ac); });
            U.sfx('sorber');
            await U.esperar(this, 800);
            await this.organos.nariz.reaccion('acierto');
            await this.moleculas();
            await this.ctx.decir(r.acierto || { voz: 'zeus', texto: '¡Muy bien!' }, { estado: 'acierto' });
        },

        porCable: function (cb, color) {
            var scene = this;
            var p = { t: 0 };
            var c = this.add.image(0, 0, A().textura(this, 'humo', 64)).setTint(color).setDisplaySize(22, 22).setDepth(30);
            this.tweens.add({
                targets: p, t: 1, duration: 800, ease: 'Sine.easeIn',
                onUpdate: function () { var q = cb.punto(p.t); c.setPosition(q.x, q.y); },
                onComplete: function () { c.destroy(); void scene; }
            });
        },

        /** Prueba del documento: atrapar moléculas de aroma. */
        moleculas: async function () {
            var scene = this;
            var m = this.m();
            var meta = 6;
            var atrapadas = 0;
            // Medidor de aroma junto al frasco.
            var mx = m.frasco.x + m.frasco.w * 0.85;
            var medidor = this.add.container(Math.min(m.w - 50, mx), m.frasco.y).setDepth(16);
            var mg = this.add.graphics();
            medidor.add(mg);
            var pintar = function () {
                mg.clear();
                mg.fillStyle(0x343a40, 1);
                mg.fillRoundedRect(-16, -m.frasco.h * 0.4, 32, m.frasco.h * 0.8, 14);
                var alto = (m.frasco.h * 0.8 - 8) * (atrapadas / meta);
                mg.fillStyle(0xf783ac, 1);
                if (alto > 0) mg.fillRoundedRect(-12, m.frasco.h * 0.4 - 4 - alto, 24, alto, 10);
            };
            pintar();
            await this.ctx.decir({ voz: 'zeus', texto: '¡Prueba de moléculas! Toca las moléculas de aroma rosadas para que lleguen a la nariz.' });
            await new Promise(function (resolver) {
                var nace = scene.time.addEvent({
                    delay: 1100, loop: true, callback: function () {
                        var r = Math.random();
                        scene.nacerParticula(r < 0.72 ? 'aroma' : (r < 0.86 ? 'nota' : 'luz'));
                    }
                });
                nace.callback();
                var pista = U.crearPista(scene, 8000, function (cancelado) {
                    var p = scene.particulas.find(function (pp) { return pp.tipo === 'aroma'; });
                    if (!p) return Promise.resolve();
                    return scene.ctx.mano({ punto: function () { return { x: p.img.x, y: p.img.y - 10 }; }, holdMs: 300, cancelado: cancelado });
                });
                pista.reiniciar();
                var toque = function (pt) {
                    var p = null;
                    scene.particulas.forEach(function (pp) { if (!p && Phaser.Math.Distance.Between(pt.x, pt.y, pp.img.x, pp.img.y) < 38) p = pp; });
                    if (!p) return;
                    pista.reiniciar();
                    scene.ctx.quitarMano();
                    scene.particulas = scene.particulas.filter(function (q) { return q !== p; });
                    var destino = p.tipo === 'aroma' ? 'nariz' : (p.tipo === 'nota' ? 'oido' : 'ojo');
                    var org = scene.organos[destino];
                    U.volarA(scene, p.img, org.cont.x, org.cont.y, 550, 0.4, null, 40).then(function () {
                        p.img.destroy();
                        org.reaccion('acierto');
                    });
                    if (p.tipo === 'aroma') {
                        U.sfx('sorber');
                        atrapadas += 1;
                        pintar();
                        scene.tweens.add({ targets: medidor, scale: { from: 1.15, to: 1 }, duration: 300 });
                        if (atrapadas >= meta) {
                            scene.input.off('pointerdown', toque);
                            nace.remove();
                            pista.parar();
                            scene.time.delayedCall(700, resolver);
                        }
                    } else if (!scene.dijo || scene.time.now - scene.dijo > 5000) {
                        scene.dijo = scene.time.now;
                        scene.ctx.decir({ voz: 'zoe', texto: p.tipo === 'nota' ? 'Esa es una nota: se escucha con el oído. ¡Busca el aroma!' : 'Ese destello es luz: lo ven los ojos. ¡Busca el aroma!' });
                    }
                };
                scene.input.on('pointerdown', toque);
            });
            this.particulas.forEach(function (p) { scene.tweens.add({ targets: p.img, alpha: 0, duration: 300, onComplete: function () { p.img.destroy(); } }); });
            this.particulas = [];
            U.sfx('magia');
            this.tweens.add({ targets: medidor, alpha: 0, duration: 500, delay: 600, onComplete: function () { medidor.destroy(); } });
        },

        nacerParticula: function (tipo) {
            var m = this.m();
            var f = m.frasco;
            var cab = this.flor ? this.cabeza() : { x: f.x, y: f.y };
            var c = this.add.container(cab.x + U.rnd(-12, 12), cab.y + U.rnd(-8, 8)).setDepth(17);
            if (tipo === 'aroma') {
                // Molécula: tres átomos unidos.
                var g = this.add.graphics();
                g.lineStyle(4, 0xc2255c, 1);
                g.lineBetween(-12, 6, 0, -8);
                g.lineBetween(0, -8, 12, 6);
                c.add(g);
                [[-12, 6, 0xf06595], [0, -8, 0xf783ac], [12, 6, 0xe64980]].forEach(function (a) {
                    var at = this.add.image(a[0], a[1], A().textura(this, 'humo', 64)).setTint(a[2]).setDisplaySize(26, 26);
                    var nucleo = this.add.circle(a[0], a[1], 7, a[2]);
                    var brillo = this.add.circle(a[0] - 2, a[1] - 2, 2.5, 0xffffff, 0.8);
                    c.add([at, nucleo, brillo]);
                }, this);
            } else if (tipo === 'nota') {
                c.add(this.add.image(0, 0, A().textura(this, 'nota', 64)).setDisplaySize(30, 30).setTint(0x1c7ed6));
            } else {
                c.add(this.add.image(0, 0, A().textura(this, 'chispa', 64)).setDisplaySize(34, 34).setTint(0xffd43b));
            }
            var lado = Math.random() < 0.5 ? -1 : 1;
            var p = { tipo: tipo, img: c, vx: lado * U.rnd(45, 85), vy: U.rnd(-18, 12), fase: Math.random() * 6, t0: this.time.now };
            this.particulas.push(p);
            c.alpha = 0;
            this.tweens.add({ targets: c, alpha: 1, duration: 300 });
        },

        moverParticulas: function (time, dt) {
            var m = this.m();
            var scene = this;
            this.particulas = this.particulas.filter(function (p) {
                p.img.x += p.vx * dt;
                p.img.y += (p.vy + Math.sin(time / 450 + p.fase) * 22) * dt;
                p.img.angle += dt * 30;
                // Flotan en la franja visible: ni bajo el globo de diálogo ni sobre las estaciones.
                p.img.y = Phaser.Math.Clamp(p.img.y, 120, m.piso - 20);
                if (p.img.x < -30 || p.img.x > m.w + 30 || time - p.t0 > 11000) {
                    scene.tweens.add({ targets: p.img, alpha: 0, duration: 300, onComplete: function () { p.img.destroy(); } });
                    return false;
                }
                return true;
            });
        },

        /* ── Ronda 2: tubos de aroma ───────────────────────────── */

        /** Crea un tablero filas×cols con camino garantizado desde la izquierda de (0,0) hasta abajo de (filas-1, salida). */
        generarTablero: function (filas, cols) {
            var salida = Math.floor(cols / 2);
            var camino = [{ f: 0, c: 0 }];
            var f = 0;
            var c = 0;
            while (f < filas - 1 || c !== salida) {
                var opciones = [];
                if (f < filas - 1) opciones.push('abajo');
                if (c < salida) opciones.push('derecha');
                if (c > salida && f === filas - 1) opciones.push('izquierda');
                if (c > salida && f < filas - 1) opciones.push('izquierda');
                var mov = opciones[Math.floor(Math.random() * opciones.length)];
                if (mov === 'abajo') f += 1;
                else if (mov === 'derecha') c += 1;
                else c -= 1;
                camino.push({ f: f, c: c });
            }
            var celdas = [];
            for (var i = 0; i < filas; i++) {
                celdas.push([]);
                for (var j = 0; j < cols; j++) celdas[i].push({ tipo: Math.random() < 0.5 ? 'recto' : 'codo', rot: 0, enCamino: false });
            }
            camino.forEach(function (p, k) {
                var entra = k === 0 ? 3 : (function () {
                    var a = camino[k - 1];
                    if (a.f < p.f) return 0;
                    if (a.c < p.c) return 3;
                    return 1;
                })();
                var sale = k === camino.length - 1 ? 2 : (function () {
                    var b = camino[k + 1];
                    if (b.f > p.f) return 2;
                    if (b.c > p.c) return 1;
                    return 3;
                })();
                var cel = celdas[p.f][p.c];
                cel.enCamino = true;
                cel.tipo = (Math.abs(entra - sale) === 2) ? 'recto' : 'codo';
                cel.sol = [entra, sale];
            });
            // Desordenar: cada pieza queda girada al azar (y al menos una del camino mal puesta).
            for (var a = 0; a < filas; a++) for (var b = 0; b < cols; b++) celdas[a][b].rot = Math.floor(Math.random() * 4);
            return { filas: filas, cols: cols, salida: salida, celdas: celdas };
        },

        /** Sigue el agua desde la entrada; devuelve las celdas que se llenan y si llega a la salida. */
        recorrer: function (t) {
            var llenas = [];
            var f = 0;
            var c = 0;
            var entra = 3;
            var vistos = {};
            while (f >= 0 && f < t.filas && c >= 0 && c < t.cols) {
                var cel = t.celdas[f][c];
                var ab = aberturas(cel);
                if (ab.indexOf(entra) < 0) break;
                var clave = f + ',' + c;
                if (vistos[clave]) break;
                vistos[clave] = true;
                llenas.push(cel);
                var sale = ab[0] === entra ? ab[1] : ab[0];
                if (f === t.filas - 1 && c === t.salida && sale === 2) return { llenas: llenas, llega: true };
                f += DY[sale];
                c += DX[sale];
                entra = (sale + 2) % 4;
            }
            return { llenas: llenas, llega: false };
        },

        rondaTubos: async function () {
            var scene = this;
            this.modo = 'tubos';
            // El cable del primer reto se recoge; la campana de vidrio se queda arriba como fuente.
            this.cablesLab.forEach(function (c) { c.destruir(); });
            this.cablesLab = [];
            this.est.orden.forEach(function (id) { scene.est.encender(id, false); });
            // La campana de vidrio se retira: el tablero de tubos ocupa el centro.
            this.emisor.remove();
            this.tweens.add({ targets: [this.frascoG, this.vidrioG, this.flor], alpha: 0, duration: 500 });
            await U.esperar(this, 500);
            this.flor.setVisible(false);
            await this.ctx.decir({ voz: 'zoe', texto: '¡Los tubos de aroma están desordenados! Toca las piezas para girarlas y lleva el perfume hasta la nariz.' });
            await this.jugarTablero(3, 3);
            await this.ctx.decir({ voz: 'zeus', texto: '¡Perfecto! Ahora un tablero más grande.' }, { estado: 'acierto' });
            await this.jugarTablero(3, 4);
        },

        jugarTablero: async function (filas, cols) {
            var scene = this;
            var m = this.m();
            var t = this.generarTablero(filas, cols);
            // Que nunca empiece ya resuelto: si el giro al azar dejó el camino armado, se gira la primera pieza.
            for (var g0 = 0; g0 < 4 && this.recorrer(t).llega; g0++) t.celdas[0][0].rot = (t.celdas[0][0].rot + 1) % 4;
            var nariz = this.est.enchufe('nariz');
            var arriba = m.h * 0.17;
            var abajo = nariz.y - 30;
            var lado = Math.min((abajo - arriba) / filas, (m.w * 0.5) / cols, 96);
            var ancho = lado * cols;
            // El tablero se centra para que la salida quede encima de la nariz.
            var x0 = nariz.x - (t.salida + 0.5) * lado;
            x0 = Phaser.Math.Clamp(x0, lado * 1.6, m.w - ancho - 20);
            var y0 = arriba + 4;
            this.tableroActual = { t: t, x0: x0, y0: y0, lado: lado };
            var cont = this.add.container(0, 0).setDepth(15);
            var marco = this.add.graphics();
            marco.fillStyle(0x343a40, 0.92);
            marco.fillRoundedRect(x0 - 10, y0 - 10, ancho + 20, lado * filas + 20, 14);
            cont.add(marco);
            var tubosG = this.add.graphics();
            cont.add(tubosG);
            var entrada = { x: x0 - 10, y: y0 + lado * 0.5 };
            // La flor que da el perfume, a la entrada del tablero.
            var fuente = this.add.image(x0 - lado * 1.05, entrada.y + lado * 0.45, A().textura(this, 'flor_morada', 200)).setOrigin(0.5, 0.95).setDisplaySize(lado * 1.3, lado * 1.3);
            var maceta = this.add.image(x0 - lado * 1.05, entrada.y + lado * 0.62, A().textura(this, 'maceta', 128)).setDisplaySize(lado * 0.7, lado * 0.7);
            cont.add([fuente, maceta]);
            var perfumeFuente = this.time.addEvent({ delay: 700, loop: true, callback: function () { U.aroma(scene, fuente.x, fuente.y - lado * 0.9, { n: 2, alto: 40, depth: 16 }); } });
            var salidaP = { x: x0 + (t.salida + 0.5) * lado, y: y0 + lado * filas + 10 };
            var llenado = [];
            var dibujar = function () {
                tubosG.clear();
                // Tubo de entrada desde la campana y tubo de salida a la nariz.
                var tubo = function (ax, ay, bx, by, lleno) {
                    tubosG.lineStyle(lado * 0.3, 0x868e96, 1);
                    tubosG.lineBetween(ax, ay, bx, by);
                    tubosG.lineStyle(lado * 0.18, lleno ? 0xf783ac : 0x212529, 1);
                    tubosG.lineBetween(ax, ay, bx, by);
                };
                tubo(x0 - lado * 0.75, entrada.y, x0, entrada.y, true);
                var llega = scene.recorrer(t).llega;
                tubo(salidaP.x, salidaP.y - 10, salidaP.x, nariz.y - 6, llega && llenado.length >= t.filas);
                for (var i = 0; i < filas; i++) {
                    for (var j = 0; j < cols; j++) {
                        var cel = t.celdas[i][j];
                        var cx = x0 + (j + 0.5) * lado;
                        var cy = y0 + (i + 0.5) * lado;
                        tubosG.fillStyle(0x495057, 1);
                        tubosG.fillRoundedRect(cx - lado / 2 + 3, cy - lado / 2 + 3, lado - 6, lado - 6, 8);
                        tubosG.fillStyle(0x5c636a, 1);
                        tubosG.fillRoundedRect(cx - lado / 2 + 3, cy - lado / 2 + 3, lado - 6, 6, 4);
                        var ang = (cel.giro || 0);
                        var lleno = llenado.indexOf(cel) >= 0;
                        aberturas({ tipo: cel.tipo, rot: 0 }).forEach(function (d) {
                            var a = (d * Math.PI / 2) - Math.PI / 2 + ang;
                            var ex = cx + Math.cos(a) * lado / 2;
                            var ey = cy + Math.sin(a) * lado / 2;
                            tubosG.lineStyle(lado * 0.3, 0xadb5bd, 1);
                            tubosG.lineBetween(cx, cy, ex, ey);
                        });
                        tubosG.fillStyle(0xadb5bd, 1);
                        tubosG.fillCircle(cx, cy, lado * 0.15);
                        aberturas({ tipo: cel.tipo, rot: 0 }).forEach(function (d) {
                            var a = (d * Math.PI / 2) - Math.PI / 2 + ang;
                            var ex = cx + Math.cos(a) * lado / 2;
                            var ey = cy + Math.sin(a) * lado / 2;
                            tubosG.lineStyle(lado * 0.16, lleno ? 0xf783ac : 0x212529, 1);
                            tubosG.lineBetween(cx, cy, ex, ey);
                        });
                        tubosG.fillStyle(lleno ? 0xf783ac : 0x212529, 1);
                        tubosG.fillCircle(cx, cy, lado * 0.08);
                    }
                }
            };
            // Ángulo visible de cada pieza (para animar el giro).
            t.celdas.forEach(function (fila) { fila.forEach(function (cel) { cel.giro = cel.rot * Math.PI / 2; }); });
            dibujar();
            cont.alpha = 0;
            await U.tween(this, { targets: cont, alpha: 1, duration: 400 });
            var resuelto = false;
            await new Promise(function (resolver) {
                var pista = U.crearPista(scene, 9000, function (cancelado) {
                    // La mano señala una pieza del camino que está mal girada.
                    for (var i = 0; i < filas; i++) for (var j = 0; j < cols; j++) {
                        var cel = t.celdas[i][j];
                        if (!cel.enCamino) continue;
                        var ab = aberturas(cel);
                        if (ab.indexOf(cel.sol[0]) < 0 || ab.indexOf(cel.sol[1]) < 0) {
                            return scene.ctx.mano({ punto: { x: x0 + (j + 0.5) * lado, y: y0 + (i + 0.5) * lado }, holdMs: 400, cancelado: cancelado });
                        }
                    }
                    return Promise.resolve();
                });
                pista.reiniciar();
                var girando = 0;
                var toque = function (p) {
                    if (resuelto) return;
                    var j = Math.floor((p.x - x0) / lado);
                    var i = Math.floor((p.y - y0) / lado);
                    if (i < 0 || j < 0 || i >= filas || j >= cols) return;
                    pista.reiniciar();
                    scene.ctx.quitarMano();
                    var cel = t.celdas[i][j];
                    cel.rot = (cel.rot + 1) % 4;
                    girando += 1;
                    U.sfx('pop');
                    var desde = cel.giro;
                    var k = { v: 0 };
                    scene.tweens.add({
                        targets: k, v: 1, duration: 160, ease: 'Back.easeOut',
                        onUpdate: function () { cel.giro = desde + (Math.PI / 2) * k.v; dibujar(); },
                        onComplete: function () {
                            cel.giro = cel.rot * Math.PI / 2;
                            girando -= 1;
                            dibujar();
                            if (girando === 0 && scene.recorrer(t).llega) {
                                resuelto = true;
                                scene.input.off('pointerdown', toque);
                                pista.parar();
                                resolver();
                            }
                        }
                    });
                };
                scene.input.on('pointerdown', toque);
            });
            // El perfume recorre los tubos pieza a pieza y llega a la nariz.
            var ruta = this.recorrer(t).llenas;
            for (var n = 0; n < ruta.length; n++) {
                llenado.push(ruta[n]);
                dibujar();
                U.sfx('pop');
                await U.esperar(this, 140);
            }
            dibujar();
            U.aroma(this, salidaP.x, salidaP.y, { n: 8, hacia: { x: nariz.x, y: nariz.y + 30 }, ms: 700, paso: 70, depth: 30 });
            U.sfx('sorber');
            this.est.encender('nariz', true);
            await U.esperar(this, 500);
            await this.organos.nariz.reaccion('acierto');
            U.estallido(this, nariz.x, nariz.y, { n: 12, tex: 'corazon', dist: 90, tam: 18 });
            await U.esperar(this, 600);
            perfumeFuente.remove();
            await U.tween(this, { targets: cont, alpha: 0, duration: 400 });
            cont.destroy();
            this.est.encender('nariz', false);
        },

        /* ── API ───────────────────────────────────────────────── */

        demo: async function () {
            var f = this.m().frasco;
            this.modo = 'demo';
            await L().demoCable(this, this.est, f.x, f.y + f.h * 0.15, Math.min(f.h * 0.55, this.m().obj), this.toma);
            this.modo = '';
        },

        jugar: async function () {
            await this.rondaFlor();
            if (!this.ctx.vivo()) return;
            await this.rondaTubos();
        },

        fiestaFinal: async function () {
            await L().tablero(this, [
                { id: 'campana', organo: 'oido' }, { id: 'flor', organo: 'nariz' },
                { id: 'helado', organo: 'lengua' }, { id: 'sol', organo: 'ojo' }
            ]);
        },

        update: function (time, delta) {
            var dt = Math.min(delta || 16, 50) / 1000;
            if (this.flor && !U.reducido()) this.flor.flor.rotation = Math.sin(time / 800) * 0.06;
            this.moverParticulas(time, dt);
            L().dibujarCables(this, time);
            var foco = this.particulas.length ? { x: this.particulas[0].img.x, y: this.particulas[0].img.y } : (this.flor ? this.cabeza() : null);
            this.est.actualizar(time, foco);
        },

        /** Para pruebas: qué celdas del camino están mal giradas y dónde tocarlas. */
        tubosPendientes: function () {
            var ta = this.tableroActual;
            if (!ta) return [];
            var out = [];
            ta.t.celdas.forEach(function (fila, i) {
                fila.forEach(function (cel, j) {
                    if (!cel.enCamino) return;
                    var ab = aberturas(cel);
                    if (ab.indexOf(cel.sol[0]) < 0 || ab.indexOf(cel.sol[1]) < 0) out.push({ x: ta.x0 + (j + 0.5) * ta.lado, y: ta.y0 + (i + 0.5) * ta.lado });
                });
            });
            return out;
        },

        estado: function () {
            var scene = this;
            return {
                modo: this.modo,
                toma: this.toma,
                particulas: this.particulas.map(function (p) { return { t: p.tipo, x: Math.round(p.img.x), y: Math.round(p.img.y) }; }),
                estaciones: this.est.orden.reduce(function (acc, id) { acc[id] = scene.est.enchufe(id); return acc; }, {})
            };
        }
    };

    global.PedniaInvernadero = B.crearMotor({ id: 'invernadero', fondo: '#bfe6c9', escena: escena });
})(typeof window !== 'undefined' ? window : this);
