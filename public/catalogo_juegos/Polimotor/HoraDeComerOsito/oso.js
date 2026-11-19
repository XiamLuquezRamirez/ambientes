/**
 * OsoComer — el osito del picnic, armado por piezas en Phaser 4 (window.OsoComer).
 * Se mueve de lado a lado, abre y cierra la boca en ciclos, come, se frota la barriga,
 * se levanta y salta. Todo avanza con el delta time de la escena (update(dt)).
 *
 *   var oso = new OsoComer(scene, x, y, animador);
 *   oso.configurar(ronda, juego); oso.activo(true);
 *   oso.puntoBoca() → {x, y} en coordenadas del mundo; oso.apertura (0..1)
 *   oso.comer(), oso.celebrar(), oso.ponerseDePie(), oso.saltar(n), oso.abrirBoca(), oso.cerrarBoca()
 */
(function (global) {
    "use strict";

    var R = function () { return global.ReglasComer; };

    var BOCA_Y = 70;        // centro de la boca respecto al centro de la cabeza
    var CABEZA_Y = -318;    // centro de la cabeza respecto a los pies del osito
    var ALZADO = 96;        // cuánto sube el cuerpo al ponerse de pie

    function lerp(a, b, u) { return a + (b - a) * u; }

    function OsoComer(scene, x, y, anim) {
        this.scene = scene;
        this.anim = anim;
        this.x0 = x;
        this.y0 = y;
        this.centro = x;
        this.t = 0;
        this.fase = 0;
        this.tBoca = 0;
        this.estadoBoca = "cerrada";
        this.apertura = 0;
        this.aperturaDibujada = -1;
        this.moviendo = false;
        this.ciclo = false;
        this.ocupado = false;
        this.ojos = "normal";
        this.ojosDibujados = "";
        this.parpado = 0;
        this.proximoParpadeo = 2600;
        this.halo = false;
        this.haloFuerte = false;
        this.alzado = 0;
        this.saltoY = 0;
        this.brazoExtra = { i: 0, d: 0 };
        this.p = { velocidad: 0.5, rango: 100, variacion: 0, frenaAlAbrir: 1, cerradaMs: 2000, abiertaMs: 3000, abreMs: 320, cierraMs: 260 };
        this.alAbrir = null;
        this.alMasticar = null;
        this.velX = 0;

        var c = scene.add.container(x, y);
        this.c = c;
        this.sombra = scene.add.image(0, 2, "sombra").setDisplaySize(340, 64).setAlpha(0.5);
        this.piernaI = scene.add.image(-52, -150, "oso-pierna").setOrigin(0.5, 0).setScale(1, 0.01).setVisible(false);
        this.piernaD = scene.add.image(52, -150, "oso-pierna").setOrigin(0.5, 0).setScale(1, 0.01).setVisible(false).setFlipX(true);
        this.torso = scene.add.container(0, 0);
        this.cuerpo = scene.add.image(0, -160, "oso-cuerpo");
        this.pieI = scene.add.image(-70, -26, "oso-pie");
        this.pieD = scene.add.image(70, -26, "oso-pie").setFlipX(true);
        this.brazoI = scene.add.image(-80, -238, "oso-brazo").setOrigin(0.5, 0.12).setRotation(0.32);
        this.brazoD = scene.add.image(80, -238, "oso-brazo").setOrigin(0.5, 0.12).setRotation(-0.32).setFlipX(true);
        this.cabeza = scene.add.container(0, CABEZA_Y);
        this.cabezaImg = scene.add.image(0, 0, "oso-cabeza");
        this.gOjos = scene.add.graphics();
        this.gBoca = scene.add.graphics();
        this.gHalo = scene.add.graphics();
        this.cabeza.add([this.cabezaImg, this.gOjos, this.gBoca, this.gHalo]);
        this.torso.add([this.cuerpo, this.brazoI, this.brazoD, this.cabeza]);
        c.add([this.sombra, this.piernaI, this.piernaD, this.torso, this.pieI, this.pieD]);
        this.dibujarOjos();
        this.dibujarBoca();
    }

    OsoComer.prototype.configurar = function (ronda, juego) {
        var j = juego || {};
        var r = ronda || {};
        this.p = {
            velocidad: Number(r.velocidad) || 0.5,
            rango: Number(r.rango) || 100,
            variacion: Number(r.variacion) || 0,
            frenaAlAbrir: r.frenaAlAbrir != null ? Number(r.frenaAlAbrir) : 1,
            cerradaMs: Number(r.cerradaMs) || 2000,
            abiertaMs: Number(r.abiertaMs) || 3000,
            abreMs: Number(j.abreMs) || 320,
            cierraMs: Number(j.cierraMs) || 260
        };
        this.umbral = j.umbralApertura != null ? Number(j.umbralApertura) : 0.6;
    };

    /** Movimiento lateral y ciclo de la boca encendidos o apagados. */
    OsoComer.prototype.activo = function (on) {
        this.moviendo = !!on;
        this.ciclo = !!on;
        if (on) {
            this.tBoca = 0;
            this.estadoBoca = "cerrada";
        }
    };

    OsoComer.prototype.mover = function (on) { this.moviendo = !!on; };

    OsoComer.prototype.bocaLista = function () {
        return R().bocaLista(this.apertura, this.umbral);
    };

    OsoComer.prototype.puntoBoca = function () {
        var m = this.cabeza.getWorldTransformMatrix();
        // punto (0, BOCA_Y) de la cabeza llevado al mundo: x' = c·y + tx, y' = d·y + ty
        return { x: m.c * BOCA_Y + m.tx, y: m.d * BOCA_Y + m.ty };
    };

    OsoComer.prototype.update = function (dt) {
        var s = dt / 1000;
        this.t += dt;
        var tSeg = this.t / 1000;

        // ciclo de la boca (Reglas.cicloBoca)
        if (this.ciclo && !this.ocupado) {
            this.tBoca += dt;
            var est = R().cicloBoca(this.tBoca, this.p);
            if (est.estado === "abriendo" && this.estadoBoca === "cerrada" && this.alAbrir) this.alAbrir();
            this.estadoBoca = est.estado;
            this.apertura = est.apertura;
        }

        // vaivén lateral con delta time
        var xAntes = this.c.x;
        if (this.moviendo && !this.ocupado) {
            this.fase += R().velocidadVaiven(this.p, this.estadoBoca, tSeg) * s;
            this.c.x = R().posicionLateral(this.fase, this.centro, this.p.rango);
        }
        var vel = s > 0 ? (this.c.x - xAntes) / s : 0;
        this.velX += (vel - this.velX) * Math.min(1, s * 6);

        // respiración, balanceo al caminar sentado y alzado al ponerse de pie
        var respira = Math.sin(tSeg * 2.2);
        this.cuerpo.setScale(1 + respira * 0.008, 1 - respira * 0.012);
        var inclina = Math.max(-0.12, Math.min(0.12, this.velX / 2400));
        this.torso.rotation = inclina * 0.5;
        // el salto mueve al osito completo (cuerpo, pies y piernas juntos); solo la sombra se queda en el suelo
        this.c.y = this.y0 - this.saltoY;
        this.sombra.y = 2 + this.saltoY;
        this.torso.y = -this.alzado * ALZADO;
        this.cabeza.rotation = inclina * 0.6 + Math.sin(tSeg * 1.6) * 0.03 + (this.giroCabeza || 0);
        this.cabeza.y = CABEZA_Y + Math.sin(tSeg * 2.2 + 0.6) * 3;
        this.pieI.setAlpha(1 - this.alzado);
        this.pieD.setAlpha(1 - this.alzado);
        this.piernaI.setVisible(this.alzado > 0.02).setScale(1.08, Math.max(0.01, this.alzado * 1.1));
        this.piernaD.setVisible(this.alzado > 0.02).setScale(1.08, Math.max(0.01, this.alzado * 1.1));
        this.piernaI.y = this.piernaD.y = -150 * this.alzado;
        var sh = 1 - Math.min(0.5, this.saltoY / 260);
        this.sombra.setDisplaySize(340 * sh, 64 * sh);

        // brazos: reposo + extra (comer, celebrar)
        var vaivenBrazo = this.moviendo ? Math.sin(tSeg * 4) * 0.08 : 0;
        this.brazoI.rotation = 0.32 + vaivenBrazo + this.brazoExtra.i;
        this.brazoD.rotation = -0.32 - vaivenBrazo + this.brazoExtra.d;

        // parpadeo
        this.proximoParpadeo -= dt;
        if (this.proximoParpadeo <= 0) {
            this.parpado = 1;
            this.proximoParpadeo = 2400 + Math.random() * 2600;
        }
        if (this.parpado > 0) this.parpado = Math.max(0, this.parpado - dt / 140);
        var claveOjos = this.ojos + ":" + (this.parpado > 0.3 ? "p" : "a");
        if (claveOjos !== this.ojosDibujados) this.dibujarOjos();

        if (Math.abs(this.apertura - this.aperturaDibujada) > 0.01) this.dibujarBoca();
        this.dibujarHalo(tSeg);
    };

    OsoComer.prototype.dibujarOjos = function () {
        var g = this.gOjos;
        g.clear();
        var cerrado = this.parpado > 0.3;
        this.ojosDibujados = this.ojos + ":" + (cerrado ? "p" : "a");
        [-44, 44].forEach(function (x) {
            if (this.ojos === "feliz" || cerrado) {
                g.lineStyle(7, 0x2b1408, 1);
                g.beginPath();
                if (this.ojos === "feliz") g.arc(x, -2, 15, Math.PI * 1.15, Math.PI * 1.85, false);
                else g.arc(x, -14, 15, Math.PI * 0.2, Math.PI * 0.8, false);
                g.strokePath();
                return;
            }
            var grande = this.ojos === "alegre";
            var k = grande ? 1.25 : 1;
            // ojo con borde oscuro, iris café, pupila y dos brillos
            g.fillStyle(0x1a0d06, 1);
            g.fillEllipse(x, -8, 28 * k, 30 * k);
            g.fillStyle(0x6b3e1c, 1);
            g.fillEllipse(x, -8, 22 * k, 24 * k);
            g.fillStyle(0x9a5f2c, 1);
            g.fillEllipse(x + 2, -4, 12 * k, 12 * k);
            g.fillStyle(0x0d0704, 1);
            g.fillEllipse(x, -8, 12 * k, 14 * k);
            g.fillStyle(0xffffff, 0.95);
            g.fillCircle(x - 5 * k, -15 * k, 4.5 * k);
            g.fillStyle(0xffffff, 0.7);
            g.fillCircle(x + 5 * k, -2, 2.2 * k);
        }, this);
    };

    OsoComer.prototype.dibujarBoca = function () {
        var g = this.gBoca;
        var a = this.apertura;
        this.aperturaDibujada = a;
        g.clear();
        if (a < 0.08) {
            g.lineStyle(5, 0x4a2511, 1);
            g.beginPath();
            g.arc(-12, BOCA_Y - 14, 12, Math.PI * 0.15, Math.PI * 0.9, false);
            g.strokePath();
            g.beginPath();
            g.arc(12, BOCA_Y - 14, 12, Math.PI * 0.1, Math.PI * 0.85, false);
            g.strokePath();
            return;
        }
        var w = 44 + 26 * a, h = 8 + 50 * a;
        g.fillStyle(0x5a1712, 1);
        g.fillEllipse(0, BOCA_Y, w, h);
        g.fillStyle(0x3a0d0a, 1);
        g.fillEllipse(0, BOCA_Y - h * 0.12, w * 0.7, h * 0.5);
        g.fillStyle(0xff8fa3, 1);
        g.fillEllipse(0, BOCA_Y + h * 0.24, w * 0.6, h * 0.42);
        g.lineStyle(4, 0x4a2511, 1);
        g.strokeEllipse(0, BOCA_Y, w, h);
    };

    OsoComer.prototype.dibujarHalo = function (tSeg) {
        var g = this.gHalo;
        g.clear();
        if (!this.halo || this.apertura < 0.5) return;
        var pulso = 0.5 + 0.5 * Math.sin(tSeg * 7);
        var r = 58 + pulso * 8 + (this.haloFuerte ? 8 : 0);
        g.fillStyle(0xfff3bf, this.haloFuerte ? 0.22 : 0.12);
        g.fillCircle(0, BOCA_Y, r);
        g.lineStyle(this.haloFuerte ? 8 : 6, 0xffd43b, 0.45 + pulso * 0.4);
        g.strokeCircle(0, BOCA_Y, r);
    };

    OsoComer.prototype.mostrarHalo = function (on) { this.halo = !!on; };
    OsoComer.prototype.resaltarHalo = function (on) { this.haloFuerte = !!on; };

    /** Abre la boca a mano (presentación y demo). Promise. */
    OsoComer.prototype.abrirBoca = function () {
        var self = this;
        this.ciclo = false;
        var a0 = this.apertura;
        if (this.alAbrir) this.alAbrir();
        this.estadoBoca = "abriendo";
        return this.anim.agregar(this.p.abreMs || 320, function (u) { self.apertura = lerp(a0, 1, u); }).then(function () { self.estadoBoca = "abierta"; });
    };

    OsoComer.prototype.cerrarBoca = function () {
        var self = this;
        this.ciclo = false;
        var a0 = this.apertura;
        this.estadoBoca = "cerrando";
        return this.anim.agregar(this.p.cierraMs || 260, function (u) { self.apertura = lerp(a0, 0, u); }).then(function () { self.estadoBoca = "cerrada"; });
    };

    /**
     * Recibe la fruta: ojos alegres, cierra la boca, mastica tres veces, se frota la barriga.
     * Mientras tanto no se mueve ni abre la boca (ocupado). Promise.
     */
    OsoComer.prototype.comer = async function () {
        var self = this;
        var A = this.anim;
        this.ocupado = true;
        this.ojos = "alegre";
        var a0 = this.apertura;
        await A.agregar(180, function (u) { self.apertura = lerp(a0, 0, u); });
        for (var k = 0; k < 3; k++) {
            if (this.alMasticar) this.alMasticar(k);
            await A.agregar(240, function (u) { self.apertura = 0.32 * Math.sin(u * Math.PI); });
        }
        this.apertura = 0;
        this.ojos = "feliz";
        await A.agregar(1100, function (u) {
            var entra = Math.min(1, u * 4), sale = u > 0.85 ? (u - 0.85) / 0.15 : 0;
            var k2 = entra * (1 - sale);
            self.brazoExtra.d = k2 * (1.25 + Math.sin(u * Math.PI * 6) * 0.2);
            self.brazoExtra.i = -k2 * 0.25;
        });
        this.brazoExtra.d = 0;
        this.brazoExtra.i = 0;
        this.ojos = "normal";
        this.tBoca = 0;
        this.estadoBoca = "cerrada";
        this.ocupado = false;
    };

    /** Celebración corta de fin de ronda: brazos arriba y un saltito sentado. */
    /**
     * "Eso no se come": cierra la boca y niega con la cabeza de lado a lado, sin enojarse.
     * Mientras tanto no se mueve ni abre la boca. Promise.
     */
    OsoComer.prototype.negar = async function () {
        var self = this;
        this.ocupado = true;
        var a0 = this.apertura;
        await this.anim.agregar(160, function (u) { self.apertura = a0 * (1 - u); });
        await this.anim.agregar(900, function (u) {
            self.giroCabeza = Math.sin(u * Math.PI * 4) * 0.2 * (1 - u * 0.5);
            self.brazoExtra.d = Math.sin(u * Math.PI) * -0.25;
        });
        this.giroCabeza = 0;
        this.brazoExtra.d = 0;
        this.apertura = 0;
        this.tBoca = 0;
        this.estadoBoca = "cerrada";
        this.ocupado = false;
    };

    OsoComer.prototype.celebrar = async function () {
        var self = this;
        this.ocupado = true;
        this.ojos = "feliz";
        await this.anim.agregar(1000, function (u) {
            var arriba = Math.sin(Math.min(1, u * 1.2) * Math.PI);
            self.brazoExtra.i = -2.3 * arriba;
            self.brazoExtra.d = 2.3 * arriba;
            self.saltoY = 34 * Math.abs(Math.sin(u * Math.PI * 2));
        });
        this.saltoY = 0;
        this.brazoExtra.i = this.brazoExtra.d = 0;
        this.ojos = "normal";
        this.ocupado = false;
    };

    OsoComer.prototype.frotarBarriga = function (ms) {
        var self = this;
        this.ojos = "feliz";
        return this.anim.agregar(ms || 1400, function (u) {
            var k2 = Math.min(1, u * 5) * (u > 0.85 ? 1 - (u - 0.85) / 0.15 : 1);
            self.brazoExtra.d = k2 * (1.25 + Math.sin(u * Math.PI * 8) * 0.22);
            self.brazoExtra.i = -k2 * (1.0 + Math.sin(u * Math.PI * 8 + 1) * 0.2);
        }).then(function () { self.brazoExtra.d = self.brazoExtra.i = 0; });
    };

    OsoComer.prototype.ponerseDePie = function () {
        var self = this;
        this.ocupado = true;
        return this.anim.agregar(800, function (u) { self.alzado = u * u * (3 - 2 * u); });
    };

    /** n saltos de pie con los brazos arriba. Promise. */
    OsoComer.prototype.saltar = async function (n) {
        var self = this;
        this.ojos = "feliz";
        for (var i = 0; i < (n || 3); i++) {
            await this.anim.agregar(560, function (u) {
                self.saltoY = 120 * Math.sin(u * Math.PI);
                var arriba = Math.sin(u * Math.PI);
                self.brazoExtra.i = -(1.6 + arriba * 0.9);
                self.brazoExtra.d = 1.6 + arriba * 0.9;
                self.c.scaleY = self.c.scaleX * (u > 0.9 ? 1 - (1 - u) * 0.6 : 1);
            });
            this.saltoY = 0;
            await this.anim.agregar(140, function (u) {
                self.c.scaleY = self.c.scaleX * (1 - 0.07 * Math.sin(u * Math.PI));
            });
        }
        this.brazoExtra.i = this.brazoExtra.d = 0;
    };

    OsoComer.prototype.reiniciar = function () {
        this.c.x = this.centro;
        this.fase = 0;
        this.tBoca = 0;
        this.apertura = 0;
        this.estadoBoca = "cerrada";
        this.ocupado = false;
        this.ojos = "normal";
        this.halo = false;
        this.haloFuerte = false;
        this.brazoExtra.i = this.brazoExtra.d = 0;
        this.saltoY = 0;
        this.alzado = 0;
    };

    global.OsoComer = OsoComer;
})(window);
