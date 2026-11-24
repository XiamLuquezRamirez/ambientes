/**
 * LaboratorioRobot — el laboratorio vivo alrededor del robot (window.LaboratorioRobot).
 *
 * Planos: paisaje con drones tras las ventanas, pared, lámparas del techo, tubos de energía con
 * partículas, paneles de luces, engranajes, prensa, brazos mecánicos de asistencia con pinza,
 * estación de ensamblaje con anillo de luces, cinta transportadora en primer plano y motas de luz.
 *
 * Tiene animación ambiental propia y, además, escucha EventosRobot: cada acción del niño produce una
 * reacción concreta (seleccionar, arrastrar, girar, acercarse, encajar, equivocarse, completar).
 * No toca la mecánica: solo lee los datos del evento.
 */
(function (global) {
    "use strict";

    var M = function () { return global.MotorRobot; };
    var D = function () { return global.DibujosRobot; };
    var E = function () { return global.EventosRobot; };

    var LAMPARAS = [120, 330, 560, 800, 1040, 1270, 1480];
    var TUBO_IZQ = 535, TUBO_DER = 1045;
    var ESTACION = { x: 800, y: 774 };
    var BRAZOS = [{ base: { x: 640, y: 64 }, reposo: { x: 600, y: 245 }, lado: -1 }, { base: { x: 960, y: 64 }, reposo: { x: 1000, y: 245 }, lado: 1 }];
    var L1 = 130, L2 = 120;
    var TUBO_DE = {
        "brazo-izq": "izq", "mano-izq": "izq", "pierna-izq": "izq",
        "brazo-der": "der", "mano-der": "der", "pierna-der": "der",
        "cabeza": "sup", "antena": "sup", "modulo": "sup",
        "pie-izq": "inf", "pie-der": "inf"
    };

    function LaboratorioRobot(scene, ctx) {
        this.scene = scene;
        this.robot = ctx.robot;
        this.anim = new (M().Animador)();
        this.luz = D().luzLab();
        this.energia = 0;
        this.energiaVis = 0;
        this.actividad = 0;
        this.seleccion = 0;
        this.foco = { x: 800, y: 450, a: 0, obj: 0 };
        this.tubos = { izq: { obj: 0, v: 0 }, der: { obj: 0, v: 0 }, sup: { obj: 0, v: 0 }, inf: { obj: 0, v: 0 } };
        this.porTubo = { izq: 0, der: 0, sup: 0, inf: 0 };
        this.puestasTubo = { izq: 0, der: 0, sup: 0, inf: 0 };
        this.nivel = 1;
        this.fiesta = 0;
        this.cadena = -1;
        this.alerta = 0;
        this.reconoce = null;
        this.prensa = { t: 0, golpes: 0 };
        this.energiaDisponible = false;
        this.retraer = 0;
        this.crear();
        this.escuchar();
    }

    LaboratorioRobot.prototype.crear = function () {
        var s = this.scene, self = this;
        var img = M().img, ADD = global.Phaser.BlendModes.ADD;
        // fondo: paisaje con drones (solo se ven por las ventanas) y pared
        img(s, 800, 165, "paisaje", 1).setDepth(0);
        this.drones = [0, 1].map(function (i) {
            return { img: img(s, 560 + i * 300, 170 + i * 70, "dron", 0.7).setDepth(0.5), v: i ? -34 : 26, fase: i * 2 };
        });
        img(s, 800, 450, "pared", 1).setDepth(1);
        // halo de color del laboratorio
        this.halo = img(s, 800, 430, "luz", 5).setDepth(1.2).setBlendMode(ADD).setTint(this.luz).setAlpha(0.12);
        // lámparas del techo
        this.lamparas = LAMPARAS.map(function (x, i) {
            var cuerpo = img(s, x, 82, "lampara", 1).setDepth(2);
            var brillo = img(s, x, 104, "luz", 0.9).setDepth(2.1).setBlendMode(ADD).setTint(0xfff3bf).setAlpha(0.3);
            return { cuerpo: cuerpo, brillo: brillo, fase: i * 0.9, chispazo: 0 };
        });
        // paneles de luces bajo las ventanas: se encienden con el avance del robot
        this.panelLeds = [];
        [[585, 336], [911, 336]].forEach(function (p) {
            var g = s.add.graphics().setDepth(1.5);
            g.fillStyle(0x14213d, 0.9);
            g.fillRoundedRect(p[0] - 10, p[1] - 14, 128, 28, 10);
            for (var k = 0; k < 5; k++) {
                var x = p[0] + 8 + k * 23;
                var base = s.add.circle(x, p[1], 7, 0x0b1830).setDepth(1.6);
                var l = img(s, x, p[1], "chispa", 0.55).setDepth(1.7).setBlendMode(ADD).setTint(self.luz).setAlpha(0);
                self.panelLeds.push({ luz: l, base: base });
            }
        });
        // tubos de energía (vertical izquierda y derecha, horizontal arriba)
        img(s, TUBO_IZQ, 418, "tubo-v", 1).setDepth(3.5);
        img(s, TUBO_DER, 418, "tubo-v", 1).setDepth(3.5);
        img(s, 790, 52, "tubo-h", 1).setDepth(3.5);
        this.brilloTubo = {
            izq: img(s, TUBO_IZQ, 418, "luz", 1).setDepth(3.4).setBlendMode(ADD).setTint(this.luz).setAlpha(0).setScale(0.5 / D().res("luz"), 6 / D().res("luz")),
            der: img(s, TUBO_DER, 418, "luz", 1).setDepth(3.4).setBlendMode(ADD).setTint(this.luz).setAlpha(0).setScale(0.5 / D().res("luz"), 6 / D().res("luz")),
            sup: img(s, 790, 52, "luz", 1).setDepth(3.4).setBlendMode(ADD).setTint(this.luz).setAlpha(0).setScale(4.4 / D().res("luz"), 0.4 / D().res("luz"))
        };
        this.burbujas = [];
        var agregar = function (tubo, n) {
            for (var i = 0; i < n; i++) {
                self.burbujas.push({ tubo: tubo, u: i / n, img: img(s, 0, 0, "chispa", 0.5).setDepth(3.6).setBlendMode(ADD).setTint(self.luz) });
            }
        };
        agregar("izq", 9);
        agregar("der", 9);
        agregar("sup", 8);
        agregar("inf", 10);
        // conductos del piso (de los tubos a la estación) y brazos mecánicos: se dibujan cada cuadro
        this.gPiso = s.add.graphics().setDepth(4.2);
        this.gBrazos = s.add.graphics().setDepth(4);
        this.brazos = BRAZOS.map(function (b) {
            return { base: b.base, reposo: b.reposo, lado: b.lado, punta: { x: b.reposo.x, y: b.reposo.y }, obj: { x: b.reposo.x, y: b.reposo.y }, hasta: 0, abre: 0.6, abreObj: 0.6, toque: 0 };
        });
        // engranajes (máquina del fondo) y prensa (pantallas anchas)
        this.engranajes = [
            { img: img(s, 470, 694, "engranaje", 1).setDepth(3), v: 0.5 },
            { img: img(s, 548, 640, "engranaje2", 1).setDepth(3.1), v: -0.85 },
            { img: img(s, 1500, 650, "engranaje2", 1).setDepth(3), v: 0.7 },
            { img: img(s, 1446, 690, "engranaje3", 1).setDepth(3.1), v: -1.1 }
        ];
        this.piston = img(s, 1498, 320, "piston", 1).setDepth(2.5);
        this.chispasPrensa = new (M().Particulas)(s, 16, 2.6);
        // estación de ensamblaje con anillo de luces y luz central
        img(s, ESTACION.x, ESTACION.y, "estacion", 1).setDepth(5);
        this.luzEstacion = img(s, ESTACION.x, ESTACION.y - 6, "luz", 2.2).setDepth(5.1).setBlendMode(ADD).setTint(this.luz).setAlpha(0.15).setScale(2.2 / D().res("luz"), 0.5 / D().res("luz"));
        this.anilloLuces = [];
        for (var k = 0; k < 12; k++) {
            var a = (k / 12) * Math.PI * 2;
            var l = img(s, ESTACION.x + Math.cos(a) * 205, ESTACION.y - 6 + Math.sin(a) * 34, "chispa", 0.6).setDepth(5.2).setBlendMode(ADD).setTint(this.luz);
            this.anilloLuces.push({ img: l, a: a });
        }
        this.nucleo = img(s, ESTACION.x, ESTACION.y - 6, "chispa", 1.6).setDepth(5.15).setBlendMode(ADD).setTint(0xfff3a0).setAlpha(0);
        // cinta transportadora (primer plano) con componentes que viajan
        img(s, 790, 862, "cinta", 1).setDepth(30);
        this.banda = s.add.tileSprite ? s.add.tileSprite(790, 838, 640, 12, "banda").setDepth(30.5) : null;
        var tiposCaja = ["caja-a", "caja-b", "caja-c", "engranaje3", "caja-a"];
        this.cajas = tiposCaja.map(function (t, i) {
            var c = img(s, 480 + i * 130, t === "engranaje3" ? 818 : 815, t, t === "engranaje3" ? 0.7 : 0.8).setDepth(31);
            return { img: c, x: 480 + i * 130, gira: t === "engranaje3" };
        });
        this.velCinta = 18;
        // luz de trabajo que sigue la pieza arrastrada
        this.focoImg = img(s, 800, 450, "luz", 2.2).setDepth(6).setBlendMode(ADD).setTint(0xfff9db).setAlpha(0);
        // motas de luz en primer plano
        this.motas = [];
        for (var m = 0; m < 22; m++) {
            var mt = img(s, Math.random() * 1600, Math.random() * 900, "chispa", 0.18 + Math.random() * 0.2).setDepth(40).setBlendMode(ADD).setTint(m % 3 ? this.luz : 0xffffff);
            this.motas.push({ img: mt, vy: -(6 + Math.random() * 12), vx: (Math.random() - 0.5) * 8, fase: Math.random() * 6 });
        }
        // marco de reconocimiento facial y chispas de soldadura (sobre el robot)
        this.gFrente = s.add.graphics().setDepth(44);
        this.chispas = new (M().Particulas)(s, 40, 46);
        this.fiestaParticulas = new (M().Particulas)(s, 50, 41);
    };

    // ------------------------------------------------------------------ eventos del niño → reacciones

    LaboratorioRobot.prototype.escuchar = function () {
        var self = this;
        var bus = E();
        if (!bus) return;
        var on = function (n, fn) { self.quitar.push(bus.on(n, fn.bind(self))); };
        this.quitar = [];
        on("nivel_iniciado", this.alNivel);
        on("pieza_seleccionada", this.alSeleccionar);
        on("pieza_arrastrada", this.alArrastrar);
        on("pieza_soltada", this.alSoltar);
        on("pieza_rotada", this.alGirar);
        on("pieza_cerca_de_ranura", this.alCerca);
        on("pieza_lejos", this.alLejos);
        on("pieza_ensamblada", this.alEnsamblar);
        on("conexion_incorrecta", this.alIncorrecta);
        on("extremidad_completada", this.alExtremidad);
        on("escaner", this.alEscaner);
    };

    LaboratorioRobot.prototype.destruir = function () {
        (this.quitar || []).forEach(function (f) { f(); });
        this.quitar = [];
        this.anim.limpiar();
    };

    LaboratorioRobot.prototype.alNivel = function (d) {
        var self = this;
        this.nivel = d.nivel || 1;
        this.energia = 0;
        this.fiesta = 0;
        this.cadena = -1;
        this.reconoce = null;
        this.retraer = 0;
        this.energiaDisponible = this.nivel >= 4;
        this.porTubo = { izq: 0, der: 0, sup: 0, inf: 0 };
        this.puestasTubo = { izq: 0, der: 0, sup: 0, inf: 0 };
        (d.ids || []).forEach(function (id) { var t = TUBO_DE[id]; if (t) self.porTubo[t] += 1; });
        Object.keys(this.tubos).forEach(function (k) { self.tubos[k].obj = 0; });
        this.velCinta = this.nivel === 1 ? 26 : 18;
        this.brazos.forEach(function (b) { b.hasta = 0; b.abreObj = 0.6; });
    };

    LaboratorioRobot.prototype.alSeleccionar = function (d) {
        this.seleccion = 1;
        this.actividad = Math.min(1, this.actividad + 0.35);
        // el brazo de asistencia del lado de la bandeja se estira hacia la pieza
        var b = this.brazos[1];
        b.obj = { x: Math.min(1080, (d.x || 1100) - 30), y: Math.min(300, (d.y || 300)) };
        b.hasta = 900;
        b.abreObj = 1;
        this.brazos[0].obj = { x: 560, y: 210 };
        this.brazos[0].hasta = 600;
        this.lamparas.forEach(function (l, i) { if (i === 3 || i === 4) l.chispazo = 1; });
        this.velCinta = Math.max(this.velCinta, 40);
    };

    LaboratorioRobot.prototype.alArrastrar = function (d) {
        this.foco.x = d.x;
        this.foco.y = d.y;
        this.foco.obj = 0.22;
        this.actividad = Math.min(1, this.actividad + 0.01);
    };

    LaboratorioRobot.prototype.alSoltar = function () {
        this.foco.obj = 0;
        this.brazos.forEach(function (b) { b.hasta = Math.min(b.hasta, 300); });
    };

    LaboratorioRobot.prototype.alGirar = function () {
        this.actividad = Math.min(1, this.actividad + 0.25);
        this.engranajes.forEach(function (g) { g.empuje = 1; });
    };

    LaboratorioRobot.prototype.alCerca = function (d) {
        var b = d.x < 800 ? this.brazos[0] : this.brazos[1];
        b.obj = { x: d.x + (d.x < 800 ? -80 : 80), y: Math.min(290, d.y - 60) };
        b.hasta = 500;
        b.abreObj = d.orientacionOk === false ? 0.2 : 1;
        this.foco.obj = 0.22 + 0.25 * (d.fuerza || 0);
    };

    LaboratorioRobot.prototype.alLejos = function () {
        this.brazos.forEach(function (b) { b.abreObj = 0.6; });
    };

    /** Encaje: los tubos de su lado se encienden, el brazo suelda, se activa un mecanismo y avanza la energía. */
    LaboratorioRobot.prototype.alEnsamblar = function (d) {
        var self = this;
        var t = TUBO_DE[d.id];
        if (t) {
            this.puestasTubo[t] += 1;
            this.tubos[t].obj = this.porTubo[t] ? this.puestasTubo[t] / this.porTubo[t] : 1;
            this.tubos[t].flash = 1;
        }
        this.energia = d.total ? d.colocadas / d.total : 0;
        this.actividad = 1;
        this.seleccion = 0.6;
        this.foco.obj = 0;
        var b = d.x < 800 ? this.brazos[0] : this.brazos[1];
        b.obj = { x: d.x + (d.x < 800 ? -60 : 60), y: Math.min(290, d.y - 40) };
        b.hasta = 900;
        b.abreObj = 0;
        b.toque = 1;
        var c = this.puntaBrazo(b);
        this.chispas.emitir(c.x, c.y, { n: 8, tipos: ["chispa", "destello"], vel: 220, grav: 300, vida: 600, escala: 0.35, sumar: true, tintes: [0x7ff3ff, 0xffffff, 0xffd43b] });
        this.chispas.emitir(d.x, d.y, { n: 14, tipos: ["destello", "chispa"], vel: 320, grav: 120, vida: 750, escala: 0.5, sumar: true, tintes: [0x74c0fc, 0x7ff3ff, 0xffffff] });
        this.engranajes.forEach(function (g) { g.empuje = 1.6; });
        this.prensa.golpes = Math.max(this.prensa.golpes, 1);
        this.lamparas.forEach(function (l, i) { setTimeout(function () { l.chispazo = 1; }, i * 70); });
        this.velCinta = 70;
        setTimeout(function () { self.velCinta = self.nivel === 1 ? 26 : 18; }, 1600);
    };

    LaboratorioRobot.prototype.alIncorrecta = function () {
        // señal amable: un pulso ámbar suave en la estación, sin alarma
        this.alerta = 1;
        this.seleccion = 0;
        this.foco.obj = 0;
        this.brazos.forEach(function (b) { b.hasta = 0; b.abreObj = 0.6; });
    };

    LaboratorioRobot.prototype.alExtremidad = function (d) {
        var self = this;
        var g = d.grupo || "";
        if (/^brazo/.test(g)) {
            // máquina de herramientas: la prensa golpea tres veces y el brazo suelda la muñeca
            this.prensa.golpes = 3;
            var p = this.robot.puntoJunta(g === "brazo-izq" ? "mano-izq" : "mano-der");
            this.chispas.emitir(p.x, p.y, { n: 16, tipos: ["chispa", "destello"], vel: 280, grav: 380, vida: 800, escala: 0.4, sumar: true, tintes: [0xffd43b, 0xff922b, 0xffffff] });
        } else if (/^pierna/.test(g)) {
            this.tubos.inf.flash = 1.4;
            this.tubos.inf.obj = Math.max(this.tubos.inf.obj, 0.5);
        } else if (g === "cabeza") {
            this.reconoce = { t: 0 };
        }
        setTimeout(function () { self.actividad = 1; }, 200);
    };

    LaboratorioRobot.prototype.alEscaner = function (d) {
        this.actividad = Math.min(1, this.actividad + 0.3);
        this.lamparas.forEach(function (l) { l.chispazo = 0.6; });
        if (d && d.x != null) {
            var b = d.x < 800 ? this.brazos[0] : this.brazos[1];
            b.obj = { x: d.x + (d.x < 800 ? -90 : 90), y: Math.min(290, d.y - 60) };
            b.hasta = 1400;
            b.abreObj = 1;
        }
    };

    // ------------------------------------------------------------------ momentos especiales (los pide la escena)

    /** Pequeña fiesta al completar un nivel: luces que recorren el techo, partículas y máquinas a tope. */
    LaboratorioRobot.prototype.celebrar = function (ms) {
        var self = this;
        this.fiesta = 1;
        this.actividad = 1;
        Object.keys(this.tubos).forEach(function (k) { self.tubos[k].obj = 1; self.tubos[k].flash = 1; });
        var dur = ms || 2600;
        var emitir = setInterval(function () {
            self.fiestaParticulas.emitir(560 + Math.random() * 480, 760, { n: 3, tipos: ["estrella", "chispa"], vel: 160, angulo: -Math.PI / 2, apertura: 0.8, grav: -40, vida: 1700, escala: 0.4, sumar: true, tintes: [self.luz, 0xffd43b, 0xffffff, 0xff8cc6] });
        }, 160);
        return this.anim.agregar(dur, function (u) {
            self.cadena = (u * LAMPARAS.length * 3) % LAMPARAS.length;
        }).then(function () {
            clearInterval(emitir);
            self.cadena = -1;
            self.fiesta = 0.4;
        });
    };

    /** Cinemática, secuencia de energía: todo se enciende, los brazos se retraen. */
    LaboratorioRobot.prototype.energizar = function () {
        var self = this;
        this.retraer = 1;
        this.brazos.forEach(function (b) { b.abreObj = 0; });
        Object.keys(this.tubos).forEach(function (k) { self.tubos[k].obj = 1; self.tubos[k].flash = 1.5; });
        this.energia = 1;
        this.actividad = 1;
        return this.anim.agregar(1600, function (u) {
            self.halo.setAlpha(0.12 + 0.25 * u);
            self.nucleo.setAlpha(u);
        });
    };

    LaboratorioRobot.prototype.fiestaFinal = function (on) {
        this.fiesta = on ? 1 : 0;
        if (on) this.cadena = 0;
        else this.cadena = -1;
    };

    LaboratorioRobot.prototype.emitirFiesta = function (x, y) {
        this.fiestaParticulas.emitir(x, y, { n: 14, tipos: ["confeti", "estrella"], vel: 380, grav: 360, vida: 1800, escala: 0.6, giro: 10, aleteo: true, tintes: [0xff6b6b, 0xffd43b, 0x69db7c, 0x4dabf7, 0xb197fc, 0xff922b] });
    };

    // ------------------------------------------------------------------ cuadro a cuadro

    LaboratorioRobot.prototype.puntaBrazo = function (b) { return b.punta; };

    LaboratorioRobot.prototype.update = function (dt, ts) {
        var self = this;
        var s = dt / 1000;
        this.anim.update(dt);
        this.actividad = Math.max(0, this.actividad - s * 0.45);
        this.seleccion = Math.max(0, this.seleccion - s * 0.5);
        this.alerta = Math.max(0, this.alerta - s * 1.4);
        this.energiaVis += (this.energia - this.energiaVis) * Math.min(1, s * 2);
        var ev = this.energiaVis;
        var ritmo = 1 + this.actividad * 2.2 + ev * 1.2 + this.fiesta * 2;

        // drones afuera
        this.drones.forEach(function (d) {
            d.img.x += d.v * s;
            if (d.img.x > 1090) d.img.x = 520;
            if (d.img.x < 510) d.img.x = 1080;
            d.img.y += Math.sin(ts * 1.6 + d.fase) * 0.25;
        });
        // halo y lámparas
        this.halo.setAlpha(Math.max(this.halo.alpha * (this.retraer ? 1 : 0), 0.1 + ev * 0.12 + this.fiesta * 0.1));
        this.lamparas.forEach(function (l, i) {
            l.chispazo = Math.max(0, l.chispazo - s * 2.2);
            var base = 0.22 + 0.06 * Math.sin(ts * 1.3 + l.fase) + ev * 0.25;
            var cad = self.cadena >= 0 ? Math.max(0, 1 - Math.abs(i - self.cadena) / 1.2) : 0;
            l.brillo.setAlpha(Math.min(1, base + l.chispazo * 0.6 + cad * 0.8));
            l.brillo.setTint(cad > 0.2 ? [0xff8cc6, 0xffd43b, 0x69db7c, 0x74c0fc][i % 4] : 0xfff3bf);
        });
        // paneles de luces: más encendidos cuanto más avanza el robot
        var nOn = Math.round(ev * this.panelLeds.length);
        this.panelLeds.forEach(function (p, i) {
            var on = i < nOn || self.fiesta > 0.5;
            var parp = on ? 0.7 + 0.3 * Math.sin(ts * 5 + i * 1.7) : 0.08 + 0.06 * Math.sin(ts * 2 + i);
            p.luz.setAlpha(parp);
        });
        // tubos: nivel de energía, destello al encajar y partículas que suben
        Object.keys(this.tubos).forEach(function (k) {
            var t = self.tubos[k];
            t.v += (t.obj - t.v) * Math.min(1, s * 2.5);
            t.flash = Math.max(0, (t.flash || 0) - s * 1.5);
            if (self.brilloTubo[k]) self.brilloTubo[k].setAlpha(Math.min(0.85, t.v * 0.35 + t.flash * 0.45));
        });
        this.burbujas.forEach(function (b) {
            var t = self.tubos[b.tubo];
            var vel = (0.05 + t.v * 0.25 + (t.flash || 0) * 0.3) * (1 + self.fiesta);
            b.u = (b.u + vel * s) % 1;
            var p = self.puntoTubo(b.tubo, b.u);
            b.img.setPosition(p.x, p.y).setAlpha(0.15 + t.v * 0.7 + (t.flash || 0) * 0.3).setScale(b.img.base * (0.7 + t.v * 0.6));
        });
        // conductos del piso
        var gp = this.gPiso;
        gp.clear();
        var inf = this.tubos.inf;
        var aP = 0.15 + inf.v * 0.6 + (inf.flash || 0) * 0.3;
        [[TUBO_IZQ, 775, 640, 800], [TUBO_DER, 775, 960, 800]].forEach(function (c) {
            gp.lineStyle(10, 0x14213d, 0.9);
            gp.lineBetween(c[0], c[1], c[2], c[3]);
            gp.lineStyle(5, self.luz, Math.min(1, aP));
            gp.lineBetween(c[0], c[1], c[2], c[3]);
        });
        // engranajes y prensa
        this.engranajes.forEach(function (g) {
            g.empuje = Math.max(0, (g.empuje || 0) - s * 1.2);
            g.img.rotation += g.v * s * (ritmo + g.empuje * 3);
        });
        this.actualizarPrensa(dt, ts, ritmo);
        // estación: luz de selección, anillo de luces según el avance y núcleo que parpadea en el nivel 4
        var colEst = this.alerta > 0 ? M().mezclar(this.luz, 0xffc078, this.alerta) : this.luz;
        this.luzEstacion.setTint(colEst).setAlpha(0.12 + this.seleccion * 0.35 + ev * 0.3 + this.alerta * 0.3 + this.fiesta * 0.2);
        var encendidas = Math.round(ev * this.anilloLuces.length);
        this.anilloLuces.forEach(function (l, i) {
            var giro = (ts * (0.6 + self.fiesta * 2)) % (Math.PI * 2);
            var a = l.a + giro;
            l.img.setPosition(ESTACION.x + Math.cos(a) * 205, ESTACION.y - 6 + Math.sin(a) * 34);
            l.img.setDepth(Math.sin(a) > 0 ? 5.3 : 5.05);
            var on = i < encendidas || self.fiesta > 0.5;
            var al = (on ? 0.75 : 0.15) + self.seleccion * 0.3 * Math.abs(Math.sin(ts * 8 + i));
            l.img.setAlpha(Math.min(1, al)).setTint(self.alerta > 0.1 ? 0xffc078 : (self.fiesta > 0.5 ? [0xff8cc6, 0xffd43b, 0x69db7c, 0x74c0fc][i % 4] : self.luz));
        });
        if (this.energiaDisponible && !this.retraer) this.nucleo.setAlpha(0.25 + 0.55 * Math.abs(Math.sin(ts * 3.2)));
        else if (!this.retraer) this.nucleo.setAlpha(Math.max(0, this.nucleo.alpha - s));
        // cinta transportadora
        if (this.banda) this.banda.tilePositionX -= this.velCinta * s;
        this.cajas.forEach(function (c) {
            c.x += self.velCinta * s;
            if (c.x > 1110) c.x = 470;
            c.img.x = c.x;
            if (c.gira) c.img.rotation += self.velCinta * s / 20;
        });
        // luz de trabajo
        this.foco.a += (this.foco.obj - this.foco.a) * Math.min(1, s * 6);
        this.focoImg.setPosition(this.foco.x, this.foco.y).setAlpha(this.foco.a);
        // motas
        this.motas.forEach(function (m) {
            m.img.y += m.vy * s * (1 + self.fiesta);
            m.img.x += (m.vx + Math.sin(ts + m.fase) * 6) * s;
            if (m.img.y < -10) { m.img.y = 910; m.img.x = Math.random() * 1600; }
            m.img.setAlpha(0.12 + 0.18 * Math.abs(Math.sin(ts * 0.8 + m.fase)) + self.fiesta * 0.2);
        });
        this.actualizarBrazos(dt, ts);
        this.actualizarReconocimiento(dt, ts);
        this.chispas.update(dt);
        this.chispasPrensa.update(dt);
        this.fiestaParticulas.update(dt);
    };

    LaboratorioRobot.prototype.puntoTubo = function (tubo, u) {
        if (tubo === "izq") return { x: TUBO_IZQ, y: 770 - u * 700 };
        if (tubo === "der") return { x: TUBO_DER, y: 770 - u * 700 };
        if (tubo === "sup") return u < 0.5 ? { x: 535 + u * 2 * 255, y: 52 } : { x: 1045 - (u - 0.5) * 2 * 255, y: 52 };
        // piso: de cada tubo hacia la estación
        return u < 0.5 ? { x: TUBO_IZQ + (640 - TUBO_IZQ) * u * 2, y: 775 + 25 * u * 2 } : { x: TUBO_DER - (TUBO_DER - 960) * (u - 0.5) * 2, y: 775 + 25 * (u - 0.5) * 2 };
    };

    LaboratorioRobot.prototype.actualizarPrensa = function (dt, ts, ritmo) {
        var p = this.prensa;
        var vel = p.golpes > 0 ? 3.5 : 0.35 * ritmo;
        var antes = p.t % 1;
        p.t += vel * dt / 1000;
        var u = p.t % 1;
        var baja = u < 0.5 ? M().entraSuave(u * 2) : 1 - M().suave((u - 0.5) * 2);
        this.piston.y = 300 + baja * 120;
        if (antes < 0.5 && u >= 0.5) {
            this.chispasPrensa.emitir(1498, 520, { n: p.golpes > 0 ? 10 : 3, tipos: ["chispa"], vel: 200, grav: 400, vida: 500, escala: 0.35, sumar: true, tintes: [0xffd43b, 0xff922b] });
            if (p.golpes > 0) p.golpes -= 1;
        }
    };

    /** Brazos mecánicos de asistencia: cinemática inversa de dos tramos con pinza al final. */
    LaboratorioRobot.prototype.actualizarBrazos = function (dt, ts) {
        var self = this;
        var g = this.gBrazos;
        g.clear();
        var k = Math.min(1, dt / 170);
        this.brazos.forEach(function (b, i) {
            b.hasta = Math.max(0, b.hasta - dt);
            var meta;
            if (self.retraer) meta = { x: b.base.x + b.lado * 30, y: b.base.y + 70 };
            else if (b.hasta > 0) meta = b.obj;
            else meta = { x: b.reposo.x + Math.sin(ts * 0.7 + i * 2) * 26, y: b.reposo.y + Math.cos(ts * 0.9 + i) * 14 };
            b.toque = Math.max(0, b.toque - dt / 500);
            var mx = meta.x, my = meta.y + Math.sin(b.toque * Math.PI) * 22;
            b.punta.x += (mx - b.punta.x) * k;
            b.punta.y += (my - b.punta.y) * k;
            b.abre += (b.abreObj - b.abre) * Math.min(1, dt / 120);
            // dos tramos
            var dx = b.punta.x - b.base.x, dy = b.punta.y - b.base.y;
            var d = Math.max(Math.abs(L1 - L2) + 1, Math.min(L1 + L2 - 1, Math.sqrt(dx * dx + dy * dy)));
            var a = Math.atan2(dy, dx);
            var cosA = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d);
            var alfa = Math.acos(Math.max(-1, Math.min(1, cosA)));
            var ang1 = a - b.lado * alfa;
            var codo = { x: b.base.x + Math.cos(ang1) * L1, y: b.base.y + Math.sin(ang1) * L1 };
            var punta = { x: b.base.x + Math.cos(a) * d, y: b.base.y + Math.sin(a) * d };
            b.punta.x = punta.x;
            b.punta.y = punta.y;
            g.lineStyle(22, 0x14213d, 1);
            g.lineBetween(b.base.x, b.base.y, codo.x, codo.y);
            g.lineBetween(codo.x, codo.y, punta.x, punta.y);
            g.lineStyle(14, 0x8da2c9, 1);
            g.lineBetween(b.base.x, b.base.y, codo.x, codo.y);
            g.lineStyle(12, 0xadb5bd, 1);
            g.lineBetween(codo.x, codo.y, punta.x, punta.y);
            g.lineStyle(4, self.luz, 0.5 + 0.5 * self.actividad);
            g.lineBetween(b.base.x, b.base.y, codo.x, codo.y);
            g.fillStyle(0x14213d, 1);
            g.fillCircle(b.base.x, b.base.y, 18);
            g.fillCircle(codo.x, codo.y, 14);
            g.fillStyle(0xffd43b, 1);
            g.fillCircle(b.base.x, b.base.y, 12);
            g.fillStyle(0xff922b, 1);
            g.fillCircle(codo.x, codo.y, 9);
            // pinza robótica: dos dedos que se abren y se cierran
            var dir = Math.atan2(punta.y - codo.y, punta.x - codo.x);
            var ab = 0.25 + b.abre * 0.55;
            [-1, 1].forEach(function (lado) {
                var a1 = dir + lado * ab;
                var x1 = punta.x + Math.cos(a1) * 26, y1 = punta.y + Math.sin(a1) * 26;
                var a2 = dir - lado * 0.5;
                var x2 = x1 + Math.cos(a2) * 16, y2 = y1 + Math.sin(a2) * 16;
                g.lineStyle(10, 0x14213d, 1);
                g.lineBetween(punta.x, punta.y, x1, y1);
                g.lineBetween(x1, y1, x2, y2);
                g.lineStyle(5, 0xffd43b, 1);
                g.lineBetween(punta.x, punta.y, x1, y1);
                g.lineBetween(x1, y1, x2, y2);
            });
            g.fillStyle(0x14213d, 1);
            g.fillCircle(punta.x, punta.y, 11);
            g.fillStyle(self.luz, 0.6 + 0.4 * Math.sin(ts * 6 + i));
            g.fillCircle(punta.x, punta.y, 6);
        });
    };

    /** Marco de reconocimiento facial alrededor de la cabeza recién conectada. */
    LaboratorioRobot.prototype.actualizarReconocimiento = function (dt) {
        var g = this.gFrente;
        g.clear();
        if (!this.reconoce) return;
        var r = this.reconoce;
        r.t += dt;
        var u = r.t / 1900;
        if (u >= 1) { this.reconoce = null; return; }
        var c = this.robot.puntoCabeza();
        var w = 120 - 18 * Math.min(1, u * 2), h = 100 - 14 * Math.min(1, u * 2);
        var al = u < 0.8 ? 1 : 1 - (u - 0.8) / 0.2;
        var col = u > 0.55 ? 0x69db7c : this.luz;
        g.lineStyle(6, col, al);
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (q) {
            var x = c.x + q[0] * w, y = c.y + q[1] * h;
            g.lineBetween(x, y, x - q[0] * 30, y);
            g.lineBetween(x, y, x, y - q[1] * 30);
        });
        if (u < 0.55) {
            var sy = c.y - h + (2 * h) * ((u / 0.55 * 2) % 1);
            g.lineStyle(4, col, 0.8 * al);
            g.lineBetween(c.x - w + 8, sy, c.x + w - 8, sy);
        } else {
            g.lineStyle(9, 0x69db7c, al);
            g.lineBetween(c.x + w - 4, c.y + h - 26, c.x + w + 10, c.y + h - 10);
            g.lineBetween(c.x + w + 10, c.y + h - 10, c.x + w + 36, c.y + h - 44);
        }
    };

    global.LaboratorioRobot = LaboratorioRobot;
})(typeof window !== "undefined" ? window : global);
