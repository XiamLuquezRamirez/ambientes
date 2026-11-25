/**
 * MaquinasMaquina — la máquina secundaria de cada nivel (window.MaquinasMaquina).
 *
 * Cada una va montada en el eje de una polea y toma de ella su ángulo (TableroMaquina.angulo):
 * si la polea no gira, la máquina no trabaja; si gira, trabaja a su ritmo. Así la cadena es
 * real: rueda grande → … → polea → correa → polea → máquina.
 *   ventilador (nivel 1)  aspas en el eje de la polea grande; sopla serpentinas.
 *   cinta      (nivel 2)  cinta transportadora cuyo rodillo es la polea; lleva cajas a una prensa.
 *   noria      (nivel 3)  noria de canastas con bolas de colores en el eje de la polea grande.
 *   fabrica    (nivel 4)  cinta movida por la polea pequeña y dos brazos robóticos que empacan.
 */
(function (global) {
    "use strict";

    var M = function () { return global.MotorMaquina; };
    var D = function () { return global.DibujosMaquina; };
    var Phaser = global.Phaser;
    var DOS_PI = Math.PI * 2;

    function Maquinas(scene, tablero) {
        this.scene = scene;
        this.tablero = tablero;
        this.objs = [];
        this.tipo = null;
        this.particulas = new (M().Particulas)(scene, 24, 126);
    }

    Maquinas.prototype.guardar = function (o) { this.objs.push(o); return o; };

    Maquinas.prototype.limpiar = function () {
        this.objs.forEach(function (o) { if (o && o.destroy) o.destroy(); });
        this.objs = [];
        if (this.horno) { this.horno.destruir(); this.horno = null; }
        this.tipo = null;
        // nada del nivel anterior queda vivo (sus objetos ya se destruyeron)
        this.aspas = this.serp = this.cinta = this.banda = this.cajasCinta = this.rodilloFin = null;
        this.prensa = this.piston = this.mazo = this.luzPrensa = null;
        this.noria = this.rueda = this.brazos = null;
        this.particulas.apagar();
    };

    /** nivel: la máquina del catálogo (maquina, maquinaEje, cintaHasta); las medidas son las de ReglasMaquina.huellaMaquina. */
    Maquinas.prototype.configurar = function (nivel, geo) {
        var R = global.ReglasMaquina;
        this.limpiar();
        var tipo = nivel && nivel.maquina;
        this.tipo = tipo;
        this.geo = geo;
        this.trabajo = 0;
        var id = R.ejeMaquina(nivel);
        this.eje = id;
        var d = id ? geo.ejes[id] : null;
        if (!d) { this.tipo = null; return; }
        this.d = d;
        if (tipo === "ventilador") this.crearVentilador(d);
        else if (tipo === "cinta") this.crearCinta(d, R.finCinta(nivel, d), 18, 4);
        else if (tipo === "noria") this.crearNoria(d);
        else if (tipo === "fabrica") { this.crearCinta(d, R.finCinta(nivel, d), 15, 6); this.crearBrazos(d); }
    };

    // ------------------------------------------------------------------ ventilador

    Maquinas.prototype.crearVentilador = function (d) {
        var s = this.scene;
        var R = d.r + 40;
        var keyAsp = D().hornear(s, "aspas-" + Math.round(R), R * 2 + 8, R * 2 + 8, function (g) {
            for (var i = 0; i < 4; i++) {
                var a = i * Math.PI / 2;
                var pts = [];
                for (var k = 0; k <= 10; k++) {
                    var u = k / 10;
                    var w = 0.5 * Math.sin(u * Math.PI) + 0.08;
                    pts.push({ x: Math.cos(a - w * 0.9) * (14 + u * (R - 18)), y: Math.sin(a - w * 0.9) * (14 + u * (R - 18)) });
                }
                for (var j = 10; j >= 0; j--) {
                    var v = j / 10;
                    pts.push({ x: Math.cos(a + 0.18) * (14 + v * (R - 18)), y: Math.sin(a + 0.18) * (14 + v * (R - 18)) });
                }
                g.fillStyle(i % 2 ? 0x74c0fc : 0x4dabf7, 1);
                g.fillPoints(pts, true, true);
                g.lineStyle(3, 0x1c7ed6, 1);
                g.strokePoints(pts, true, true);
            }
        });
        var keyCaja = D().hornear(s, "ventilador-caja-" + Math.round(R), R * 2 + 40, R * 2 + 70, function (g) {
            g.fillStyle(0x0b1d3a, 0.25); g.fillEllipse(6, R + 22, R * 1.6, 22);
            g.fillStyle(0x495057, 1); g.fillRoundedRect(-14, R - 6, 28, 30, 6);
            g.fillStyle(0x343a40, 1); g.fillRoundedRect(-R * 0.6, R + 18, R * 1.2, 14, 7);
            g.fillStyle(0xe9ecef, 1); g.fillCircle(0, 0, R + 10);
            g.fillStyle(0xd0ebff, 1); g.fillCircle(0, 0, R + 2);
        });
        var keyRejilla = D().hornear(s, "ventilador-rejilla-" + Math.round(R), R * 2 + 24, R * 2 + 24, function (g) {
            g.lineStyle(4, 0xadb5bd, 0.9);
            g.strokeCircle(0, 0, R + 6);
            g.lineStyle(2, 0xadb5bd, 0.5);
            g.strokeCircle(0, 0, R * 0.7);
            g.strokeCircle(0, 0, R * 0.4);
            for (var i = 0; i < 8; i++) {
                var a = i * Math.PI / 4;
                g.lineBetween(Math.cos(a) * R * 0.25, Math.sin(a) * R * 0.25, Math.cos(a) * (R + 6), Math.sin(a) * (R + 6));
            }
        });
        this.guardar(s.add.image(d.x, d.y, keyCaja).setDepth(116).setOrigin(0.5, (R + 35) / (R * 2 + 70)));
        this.aspas = this.guardar(s.add.image(d.x, d.y, keyAsp).setDepth(117));
        this.guardar(s.add.image(d.x, d.y, keyRejilla).setDepth(118).setAlpha(0.8));
        // serpentinas que ondean con el viento
        var T = this.geo.tablero;
        this.ladoViento = d.x < (T.x0 + T.x1) / 2 ? 1 : -1;
        this.serp = [];
        for (var i = 0; i < 3; i++) {
            this.serp.push(this.guardar(s.add.rectangle(d.x + this.ladoViento * (R + 14), d.y - 40 + i * 40, 46, 9, [0xff6b6b, 0xffd43b, 0x69db7c][i]).setOrigin(this.ladoViento > 0 ? 0 : 1, 0.5).setDepth(118).setAlpha(0.9)));
        }
    };

    // ------------------------------------------------------------------ cinta transportadora

    Maquinas.prototype.crearCinta = function (d, x1, rr, nCajas) {
        var s = this.scene;
        var x0 = d.x;
        var izq = Math.min(x0, x1), der = Math.max(x0, x1);
        this.cinta = { x0: izq, x1: der, y: d.y, rr: rr, desdeDerecha: x1 < x0 };
        this.horno = new (M().Horno)(s, izq - rr - 10, d.y - rr - 10, der - izq + rr * 2 + 20, rr * 2 + 50, { mundo: true, prof: 114 });
        this.horno.pintar(function (g) {
            g.fillStyle(0x0b1d3a, 0.25); g.fillRoundedRect(izq - rr + 6, d.y - rr + 10, der - izq + rr * 2, rr * 2, rr);
            g.fillStyle(0x495057, 1); g.fillRoundedRect(izq - rr, d.y - rr, der - izq + rr * 2, rr * 2, rr);
            for (var x = izq + 60; x < der - 20; x += 110) {
                g.fillStyle(0x343a40, 1); g.fillRect(x, d.y + rr - 2, 10, 26);
            }
            g.fillStyle(0xadb5bd, 1); g.fillCircle(x1, d.y, rr - 3);
            g.fillStyle(0x495057, 1); g.fillCircle(x1, d.y, 5);
        });
        this.banda = this.guardar(s.add.tileSprite((izq + der) / 2, d.y - rr + 6, der - izq, 12, "cinta-banda").setDepth(115).setTileScale(0.5, 0.4));
        this.cajasCinta = [];
        for (var i = 0; i < nCajas; i++) {
            this.cajasCinta.push({ img: this.guardar(s.add.image(0, d.y - rr - 16, "caja-" + ((i * 2 + 1) % 6)).setDepth(115.5).setScale(0.82)), u: i / nCajas });
        }
        this.rodilloFin = this.guardar(s.add.image(x1, d.y, "bola").setDepth(114.5).setTint(0x495057).setScale(rr / 14));
        if (this.tipo === "cinta") {
            // prensa al final de la cinta: estampa las cajas al ritmo de la cinta
            var px = global.ReglasMaquina.xPrensa(d, x1);
            this.prensa = { x: px, y: d.y - rr - 8 };
            this.guardar(s.add.rectangle(px - 46, d.y - 70, 12, 120, 0x343a40).setDepth(116));
            this.guardar(s.add.rectangle(px + 46, d.y - 70, 12, 120, 0x343a40).setDepth(116));
            this.guardar(s.add.rectangle(px, d.y - 128, 104, 22, 0x1c7ed6).setDepth(116).setStrokeStyle(3, 0x0b4f91));
            this.piston = this.guardar(s.add.rectangle(px, d.y - 110, 16, 30, 0xadb5bd).setOrigin(0.5, 0).setDepth(115.8));
            this.mazo = this.guardar(s.add.rectangle(px, d.y - 80, 62, 16, 0xffa94d).setDepth(116).setStrokeStyle(3, 0xd9480f));
            this.luzPrensa = this.guardar(s.add.image(px, d.y - 128, "p-chispa").setDepth(116.5).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd43b).setScale(0.6).setAlpha(0.3));
        }
    };

    // ------------------------------------------------------------------ noria

    Maquinas.prototype.crearNoria = function (d) {
        var s = this.scene;
        var R = d.r + 52;
        this.noria = { R: R, cabinas: [] };
        var keyRueda = D().hornear(s, "noria-" + Math.round(R), R * 2 + 30, R * 2 + 30, function (g) {
            g.lineStyle(9, 0xf06595, 1); g.strokeCircle(0, 0, R);
            g.lineStyle(5, 0xffd43b, 1); g.strokeCircle(0, 0, R - 14);
            for (var i = 0; i < 12; i++) {
                var a = i * Math.PI / 6;
                g.lineStyle(4, 0xf783ac, 1);
                g.lineBetween(Math.cos(a) * (d.r + 4), Math.sin(a) * (d.r + 4), Math.cos(a) * R, Math.sin(a) * R);
                g.fillStyle(0xffffff, 1);
                g.fillCircle(Math.cos(a) * R, Math.sin(a) * R, 5);
            }
        });
        var keyPata = D().hornear(s, "noria-pata-" + Math.round(R), R * 2 + 60, R + 80, function (g) {
            g.lineStyle(12, 0x495057, 1);
            g.lineBetween(0, -R / 2 - 30, -R * 0.75, R / 2 + 30);
            g.lineBetween(0, -R / 2 - 30, R * 0.75, R / 2 + 30);
            g.fillStyle(0x343a40, 1); g.fillRoundedRect(-R * 0.95, R / 2 + 22, R * 1.9, 14, 7);
        });
        this.guardar(s.add.image(d.x, d.y + R / 2 + 30, keyPata).setDepth(112));
        this.rueda = this.guardar(s.add.image(d.x, d.y, keyRueda).setDepth(113));
        var colores = [0xff6b6b, 0x4dabf7, 0x69db7c, 0xffd43b, 0xb197fc, 0xffa94d];
        for (var i = 0; i < 6; i++) {
            var cab = this.guardar(s.add.container(0, 0).setDepth(126));
            var gr = s.add.graphics();
            gr.fillStyle(0x495057, 1); gr.fillRect(-2, -14, 4, 14);
            gr.fillStyle(colores[i], 1); gr.fillRoundedRect(-17, 0, 34, 22, { tl: 3, tr: 3, bl: 10, br: 10 });
            gr.fillStyle(0xffffff, 0.35); gr.fillRect(-14, 3, 28, 4);
            var bola = s.add.image(0, -2, "bola").setTint(colores[(i + 2) % 6]).setScale(0.6);
            cab.add([gr, bola]);
            this.noria.cabinas.push({ c: cab, a0: i * DOS_PI / 6 });
        }
    };

    // ------------------------------------------------------------------ brazos de la fábrica

    Maquinas.prototype.crearBrazos = function (d) {
        var s = this.scene;
        var c = this.cinta;
        this.brazos = [];
        var self = this;
        [c.x0 + (c.x1 - c.x0) * 0.32, c.x0 + (c.x1 - c.x0) * 0.68].forEach(function (x, i) {
            var base = self.guardar(s.add.container(x, c.y - 112).setDepth(127));
            var col = s.add.circle(0, 0, 16, 0x343a40);
            var riel = s.add.rectangle(0, -10, 70, 12, 0x495057);
            var seg = s.add.container(0, 0);
            var img = s.add.image(0, 36, "brazo-seg").setRotation(Math.PI / 2).setScale(0.6, 0.8);
            var pinza = s.add.image(0, 70, "brazo-pinza").setScale(0.9);
            var luz = s.add.image(0, 70, "p-chispa").setBlendMode(Phaser.BlendModes.ADD).setTint(i ? 0x69db7c : 0x4dd4f0).setScale(0.5);
            seg.add([img, pinza, luz]);
            base.add([riel, col, seg]);
            self.brazos.push({ seg: seg, luz: luz, fase: i * Math.PI });
        });
    };

    // ------------------------------------------------------------------ cuadro a cuadro

    Maquinas.prototype.update = function (dt, ts) {
        if (!this.tipo || !this.d) return;
        var tb = this.tablero;
        var ang = tb.angulo(this.eje);
        var vel = Math.abs(tb.velocidad(this.eje));
        var visible = tb.visible(this.eje);
        this.trabajo += ((vel > 0.05 ? 1 : 0) - this.trabajo) * Math.min(1, dt / 500);
        var self = this;
        var d = this.d;
        if (this.tipo === "ventilador") {
            this.aspas.setRotation(ang);
            this.serp.forEach(function (sp, i) {
                var on = self.trabajo;
                sp.setScale(1 + on * 0.9, 1).setRotation((Math.sin(ts * (6 + i * 2) + i) * (0.1 + on * 0.35) - on * 0.15) * self.ladoViento);
            });
            if (this.trabajo > 0.5 && Math.random() < dt / 120) {
                this.particulas.emitir(d.x + this.ladoViento * (d.r + 40), d.y + (Math.random() - 0.5) * 80, { n: 1, tipos: ["p-polvo"], vel: 260, grav: 0, vida: 700, escala: 0.4, angulo: this.ladoViento > 0 ? 0 : Math.PI, apertura: 0.3, tintes: [0xe7f5ff], alfa: 0.7, dispersion: 4 });
            }
        }
        if (this.cinta) {
            var c = this.cinta;
            // la superficie de arriba avanza con el borde del rodillo (ω·r)
            var avance = ang * c.rr * (c.desdeDerecha ? 1 : 1);
            this.banda.tilePositionX = -avance / 0.5;
            this.rodilloFin.setRotation(ang);
            var L = c.x1 - c.x0;
            this.cajasCinta.forEach(function (k) {
                var u = ((k.u + avance / L) % 1 + 1) % 1;
                var x = c.x0 + 20 + u * (L - 40);
                k.img.setPosition(x, c.y - c.rr - 16).setAlpha(u < 0.06 ? u / 0.06 : (u > 0.94 ? (1 - u) / 0.06 : 1));
            });
            if (this.prensa) {
                var golpe = Math.max(0, Math.sin(avance / 30));
                var bajada = Math.pow(golpe, 6) * 22;
                this.piston.setSize(16, 30 + bajada);
                this.mazo.setY(c.y - 80 + bajada);
                this.luzPrensa.setAlpha(0.3 + 0.7 * Math.pow(golpe, 6) * this.trabajo);
                if (golpe > 0.995 && this.trabajo > 0.4 && !this.golpeo) {
                    this.golpeo = true;
                    this.particulas.emitir(this.prensa.x, c.y - c.rr - 30, { n: 5, tipos: ["p-estrella", "p-chispa"], vel: 150, grav: 200, vida: 500, escala: 0.3, sumar: true, tintes: [0xffd43b, 0xffffff] });
                }
                if (golpe < 0.9) this.golpeo = false;
            }
        }
        if (this.noria) {
            this.rueda.setRotation(ang);
            var R = this.noria.R;
            this.noria.cabinas.forEach(function (k) {
                var a = k.a0 + ang;
                k.c.setPosition(d.x + Math.cos(a) * R, d.y + Math.sin(a) * R + 4);
                k.c.setRotation(Math.sin(ts * 3 + k.a0) * 0.12 * self.trabajo);
            });
        }
        if (this.brazos) {
            this.brazos.forEach(function (b) {
                b.fase += dt / 1000 * (0.3 + self.trabajo * 2.2);
                b.seg.setRotation(Math.sin(b.fase) * (0.15 + self.trabajo * 0.45));
                b.seg.setScale(1, 1 + Math.max(0, Math.sin(b.fase * 2)) * 0.15 * self.trabajo);
                b.luz.setAlpha(0.3 + 0.7 * self.trabajo * Math.max(0, Math.sin(b.fase * 2)));
            });
        }
        this.visible = visible;
        this.particulas.update(dt);
    };

    Maquinas.prototype.salida = function () {
        var objs = this.objs.slice();
        var h = this.horno ? this.horno.img : null;
        return this.scene.anim.agregar(800, function (u) {
            var a = 1 - M().suave(u);
            objs.forEach(function (o) { if (o.setAlpha) o.setAlpha(a); });
            if (h) h.setAlpha(a);
        });
    };

    global.MaquinasMaquina = Maquinas;
})(typeof window !== "undefined" ? window : global);
