/**
 * AnimalesPicnic — los cuatro animales del picnic armados por piezas en Phaser 4 (window.AnimalesPicnic).
 * Están quietos y con la boca abierta esperando la comida; cada uno come a su manera:
 *   conejo  "mordisquea"  mordiscos rápidos y pequeños, las orejas se sacuden
 *   perro   "roe"         inclina la cabeza y roe de lado con la lengua afuera
 *   pajaro  "picotea"     picotazos hacia abajo y echa la cabeza atrás para tragar
 *   oso     "mastica"     masticadas lentas y grandes, luego se frota la barriga (el del juego hermano)
 *
 *   var a = AnimalesPicnic.crear("conejo", scene, x, y, animador, escala);
 *   a.puntoBoca() → {x, y} del mundo · a.comer() · a.negar() · a.celebrar() · a.terminarDeComer() · a.saltar(n)
 *   a.mostrarAro(on) · a.resaltarAro(on) · a.radioAro (px del mundo) · a.update(dt) · a.reiniciar()
 *
 * Todas las animaciones avanzan con el Animador de la escena (delta time con respaldo) y devuelven Promise.
 * Los ojos, la nariz y la boca se dibujan con Graphics sobre la cabeza (las texturas vienen sin cara).
 */
(function (global) {
    "use strict";

    var REPOSO = 0.6;       // apertura de la boca mientras espera la comida

    function lerp(a, b, u) { return a + (b - a) * u; }
    function suave(u) { return u * u * (3 - 2 * u); }

    /**
     * Medidas de cada animal respecto a sus pies (antes de escalar):
     *   cabezaY  centro de la cabeza · bocaY centro de la boca dentro de la cabeza
     *   ojoX/ojoY posición de los ojos dentro de la cabeza · ojoK tamaño relativo de los ojos
     *   base     escala para que los cuatro se vean de un tamaño parecido en la manta
     */
    var MEDIDAS = {
        conejo: { cabezaY: -298, bocaY: 42, ojoX: 36, ojoY: -18, ojoK: 0.9, base: 0.66, ancho: 260, sombra: 300 },
        perro: { cabezaY: -300, bocaY: 50, ojoX: 37, ojoY: -18, ojoK: 0.92, base: 0.66, ancho: 260, sombra: 300 },
        pajaro: { cabezaY: -340, bocaY: 40, ojoX: 24, ojoY: -10, ojoK: 0.7, base: 0.68, ancho: 240, sombra: 240 },
        oso: { cabezaY: -318, bocaY: 70, ojoX: 44, ojoY: -8, ojoK: 1, base: 0.64, ancho: 300, sombra: 340 }
    };

    // ------------------------------------------------------------------ base común

    function Animal(tipo, scene, x, y, anim, escala) {
        var m = MEDIDAS[tipo];
        this.tipo = tipo;
        this.m = m;
        this.scene = scene;
        this.anim = anim;
        this.x0 = x;
        this.y0 = y;
        this.esc = (escala || 1) * m.base;
        this.t = Math.random() * 3000;
        this.apertura = REPOSO;
        this.aperturaDibujada = -1;
        this.claveBoca = "";
        this.ocupado = false;
        this.ojos = "normal";
        this.ojosDibujados = "";
        this.parpado = 0;
        this.proximoParpadeo = 1200 + Math.random() * 2400;
        this.giroCabeza = 0;
        this.cabezaDY = 0;
        this.cabezaDX = 0;
        this.escCabeza = 1;
        this.bocaDX = 0;
        this.lengua = 0;
        this.saltoY = 0;
        this.giroCuerpo = 0;
        this.ahueca = 0;
        this.baile = 0;
        this.fase = Math.random() * 6.28;
        this.aro = false;
        this.aroFuerte = false;
        this.radioAro = 92;
        this.pulsoAroMs = 1200;
        this.alMasticar = null;

        var c = scene.add.container(x, y).setScale(this.esc);
        this.c = c;
        this.sombra = scene.add.image(0, 2, "sombra").setDisplaySize(m.sombra, 60).setAlpha(0.5);
        this.atras = scene.add.container(0, 0);      // cola, alas o piernas por detrás del cuerpo
        this.torso = scene.add.container(0, 0);
        this.cabeza = scene.add.container(0, m.cabezaY);
        this.gOjos = scene.add.graphics();
        this.gBoca = scene.add.graphics();
        this.delante = scene.add.container(0, 0);    // patas o pies por delante
        c.add([this.sombra, this.atras, this.torso, this.delante]);
        // aro dorado alrededor de la boca: va suelto en la escena para medir en px del mundo
        this.gAro = scene.add.graphics().setDepth(12);
    }

    Animal.prototype.setDepth = function (d) {
        this.c.setDepth(d);
        return this;
    };

    Animal.prototype.puntoBoca = function () {
        var mt = this.cabeza.getWorldTransformMatrix();
        var by = this.m.bocaY;
        return { x: mt.c * by + mt.tx, y: mt.d * by + mt.ty };
    };

    /** Punto encima de la cabeza (para corazones, estrellas y el alimento levantado en la fiesta). */
    Animal.prototype.puntoArriba = function () {
        var mt = this.cabeza.getWorldTransformMatrix();
        var y = -110;
        return { x: mt.c * y + mt.tx, y: mt.d * y + mt.ty };
    };

    Animal.prototype.update = function (dt) {
        this.t += dt;
        var ts = this.t / 1000;
        var m = this.m;
        var respira = Math.sin(ts * 2.2);
        this.c.y = this.y0 - this.saltoY;
        this.sombra.y = 2 + this.saltoY / this.esc;
        var sh = 1 - Math.min(0.5, this.saltoY / 260);
        this.sombra.setDisplaySize(m.sombra * sh, 60 * sh);
        this.c.rotation = this.giroCuerpo + (this.baile ? Math.sin(ts * 4 + this.fase) * 0.06 * this.baile : 0);
        this.torso.setScale(1 + respira * 0.008 + this.ahueca * 0.06, 1 - respira * 0.012 + this.ahueca * 0.05);
        this.cabeza.x = this.cabezaDX;
        this.cabeza.y = m.cabezaY + Math.sin(ts * 2.2 + 0.6) * 3 + this.cabezaDY;
        this.cabeza.rotation = Math.sin(ts * 1.6) * 0.03 + this.giroCabeza;
        this.cabeza.setScale(1, this.escCabeza);
        if (this.animar) this.animar(dt, ts);

        // parpadeo
        this.proximoParpadeo -= dt;
        if (this.proximoParpadeo <= 0) {
            this.parpado = 1;
            this.proximoParpadeo = 2400 + Math.random() * 2600;
        }
        if (this.parpado > 0) this.parpado = Math.max(0, this.parpado - dt / 140);
        var claveOjos = this.ojos + ":" + (this.parpado > 0.3 ? "p" : "a");
        if (claveOjos !== this.ojosDibujados) this.dibujarOjos();

        var clave = Math.round(this.apertura * 100) + ":" + Math.round(this.bocaDX) + ":" + Math.round(this.lengua * 20);
        if (clave !== this.claveBoca) {
            this.claveBoca = clave;
            this.dibujarBoca();
        }
        this.dibujarAro(ts);
    };

    /** Ojos con borde oscuro, iris, pupila y dos brillos; "feliz" y parpadeo son arcos. */
    Animal.prototype.dibujarOjos = function () {
        var g = this.gOjos;
        var m = this.m;
        g.clear();
        var cerrado = this.parpado > 0.3;
        this.ojosDibujados = this.ojos + ":" + (cerrado ? "p" : "a");
        var colores = this.coloresOjo || { borde: 0x1a0d06, iris: 0x6b3e1c, luz: 0x9a5f2c, pupila: 0x0d0704, linea: 0x2b1408 };
        var k0 = m.ojoK;
        [-m.ojoX, m.ojoX].forEach(function (x) {
            var y = m.ojoY;
            if (this.ojos === "feliz" || cerrado) {
                g.lineStyle(7 * k0, colores.linea, 1);
                g.beginPath();
                if (this.ojos === "feliz") g.arc(x, y + 6 * k0, 15 * k0, Math.PI * 1.15, Math.PI * 1.85, false);
                else g.arc(x, y - 6 * k0, 15 * k0, Math.PI * 0.2, Math.PI * 0.8, false);
                g.strokePath();
                return;
            }
            var k = k0 * (this.ojos === "alegre" ? 1.22 : 1);
            g.fillStyle(colores.borde, 1);
            g.fillEllipse(x, y, 28 * k, 30 * k);
            g.fillStyle(colores.iris, 1);
            g.fillEllipse(x, y, 22 * k, 24 * k);
            g.fillStyle(colores.luz, 1);
            g.fillEllipse(x + 2 * k, y + 4 * k, 12 * k, 12 * k);
            g.fillStyle(colores.pupila, 1);
            g.fillEllipse(x, y, 12 * k, 14 * k);
            g.fillStyle(0xffffff, 0.95);
            g.fillCircle(x - 5 * k, y - 7 * k, 4.5 * k);
            g.fillStyle(0xffffff, 0.7);
            g.fillCircle(x + 5 * k, y + 6 * k, 2.2 * k);
        }, this);
        if (this.dibujarNariz) this.dibujarNariz(g);
    };

    /** Boca de mamífero: sonrisa cerrada o elipse abierta con lengua; cada animal ajusta tamaño y colores. */
    Animal.prototype.dibujarBoca = function () {
        var g = this.gBoca;
        var a = this.apertura;
        var b = this.boca || {};
        var by = this.m.bocaY, bx = this.bocaDX;
        this.aperturaDibujada = a;
        g.clear();
        if (a < 0.08) {
            var r = b.arco || 12;
            g.lineStyle(b.grosor || 5, b.linea || 0x4a2511, 1);
            g.beginPath();
            g.arc(bx - r, by - r - 2, r, Math.PI * 0.15, Math.PI * 0.9, false);
            g.strokePath();
            g.beginPath();
            g.arc(bx + r, by - r - 2, r, Math.PI * 0.1, Math.PI * 0.85, false);
            g.strokePath();
        } else {
            var w = (b.ancho || 44) + (b.anchoAbre || 26) * a, h = (b.alto || 8) + (b.altoAbre || 50) * a;
            g.fillStyle(0x5a1712, 1);
            g.fillEllipse(bx, by, w, h);
            g.fillStyle(0x3a0d0a, 1);
            g.fillEllipse(bx, by - h * 0.12, w * 0.7, h * 0.5);
            g.fillStyle(0xff8fa3, 1);
            g.fillEllipse(bx, by + h * 0.24, w * 0.6, h * 0.42);
            if (b.dientes) {
                // dos dientes de conejo arriba
                g.fillStyle(0xffffff, 1);
                g.lineStyle(2, 0x8c7f72, 1);
                [-1, 1].forEach(function (s) {
                    g.fillRect(bx + s * 5 - 5, by - h / 2 - 1, 10, Math.min(14, 6 + h * 0.3));
                    g.strokeRect(bx + s * 5 - 5, by - h / 2 - 1, 10, Math.min(14, 6 + h * 0.3));
                });
            }
            g.lineStyle(b.grosor ? b.grosor - 1 : 4, b.linea || 0x4a2511, 1);
            g.strokeEllipse(bx, by, w, h);
        }
        if (this.lengua > 0.02) {
            // lengua que sale y se relame
            var lx = bx + (b.lenguaX || 0), ly = by + (a < 0.08 ? 2 : (8 + 40 * a) * 0.3);
            g.fillStyle(0xff7b93, 1);
            g.fillEllipse(lx, ly + 10 * this.lengua, 22, 12 + 20 * this.lengua);
            g.lineStyle(3, 0xc2255c, 1);
            g.strokeEllipse(lx, ly + 10 * this.lengua, 22, 12 + 20 * this.lengua);
            g.lineStyle(2, 0xc2255c, 0.8);
            g.lineBetween(lx, ly + 2, lx, ly + 8 + 16 * this.lengua);
        }
    };

    Animal.prototype.dibujarAro = function (ts) {
        var g = this.gAro;
        g.clear();
        if (!this.aro) return;
        var b = this.puntoBoca();
        var pulso = 0.5 + 0.5 * Math.sin((this.t / this.pulsoAroMs) * Math.PI * 2);
        var r = this.radioAro * 0.8 + pulso * 6 + (this.aroFuerte ? 8 : 0);
        g.fillStyle(0xfff3bf, this.aroFuerte ? 0.24 : 0.12);
        g.fillCircle(b.x, b.y, r);
        g.lineStyle(this.aroFuerte ? 10 : 7, 0xffd43b, 0.45 + 0.35 * Math.sin((this.t / this.pulsoAroMs) * Math.PI * 2) + 0.2);
        g.strokeCircle(b.x, b.y, r);
        g.lineStyle(3, 0xffffff, 0.35 + pulso * 0.35);
        g.strokeCircle(b.x, b.y, r - 10);
        void ts;
    };

    Animal.prototype.mostrarAro = function (on) {
        this.aro = !!on;
        if (!on) this.aroFuerte = false;
    };
    Animal.prototype.resaltarAro = function (on) { this.aroFuerte = !!on; };

    Animal.prototype.abrirBoca = function () {
        var self = this, a0 = this.apertura;
        return this.anim.agregar(220, function (u) { self.apertura = lerp(a0, REPOSO, suave(u)); });
    };

    Animal.prototype.cerrarBoca = function () {
        var self = this, a0 = this.apertura;
        return this.anim.agregar(180, function (u) { self.apertura = lerp(a0, 0, u); });
    };

    /** "Eso no es para mí": cierra la boca, sacude la cabeza sin enojarse y vuelve a abrirla. */
    Animal.prototype.negar = async function () {
        var self = this;
        this.ocupado = true;
        await this.cerrarBoca();
        await this.anim.agregar(900, function (u) {
            self.giroCabeza = Math.sin(u * Math.PI * 4) * 0.2 * (1 - u * 0.5);
            if (self.alNegar) self.alNegar(u);
        });
        this.giroCabeza = 0;
        if (this.alNegar) this.alNegar(1);
        await this.abrirBoca();
        this.ocupado = false;
    };

    /** Celebración corta de fin de ronda: saltito sentado con cara feliz. */
    Animal.prototype.celebrar = async function () {
        var self = this;
        this.ocupado = true;
        this.ojos = "feliz";
        await this.anim.agregar(1000, function (u) {
            self.saltoY = 34 * Math.abs(Math.sin(u * Math.PI * 2));
            if (self.alCelebrar) self.alCelebrar(Math.sin(Math.min(1, u * 1.2) * Math.PI));
        });
        this.saltoY = 0;
        if (this.alCelebrar) this.alCelebrar(0);
        this.ojos = "normal";
        this.ocupado = false;
    };

    /** n saltos grandes (fiesta). */
    Animal.prototype.saltar = async function (n) {
        var self = this;
        this.ojos = "feliz";
        for (var i = 0; i < (n || 1); i++) {
            await this.anim.agregar(560, function (u) {
                self.saltoY = 110 * Math.sin(u * Math.PI);
                if (self.alCelebrar) self.alCelebrar(Math.sin(u * Math.PI));
                self.c.scaleY = self.esc * (u > 0.9 ? 1 - (1 - u) * 0.6 : 1);
            });
            this.saltoY = 0;
            await this.anim.agregar(140, function (u) {
                self.c.scaleY = self.esc * (1 - 0.07 * Math.sin(u * Math.PI));
            });
        }
        this.c.scaleY = this.esc;
        if (this.alCelebrar) this.alCelebrar(0);
    };

    /** Ojos felices y un vaivén del cuerpo (los que no tienen brazos para frotarse la barriga). */
    Animal.prototype.frotarBarriga = function (ms) {
        var self = this;
        this.ojos = "feliz";
        return this.anim.agregar(ms || 1200, function (u) {
            self.giroCuerpo = Math.sin(u * Math.PI * 4) * 0.05 * Math.sin(u * Math.PI);
        }).then(function () { self.giroCuerpo = 0; });
    };

    Animal.prototype.terminarDeComer = function () { return this.frotarBarriga(1200); };

    /** Vuelve a su estado de espera: boca abierta, ojos normales, sin aro. */
    Animal.prototype.reiniciar = function () {
        this.apertura = REPOSO;
        this.ocupado = false;
        this.ojos = "normal";
        this.aro = false;
        this.aroFuerte = false;
        this.giroCabeza = 0;
        this.cabezaDY = 0;
        this.cabezaDX = 0;
        this.escCabeza = 1;
        this.bocaDX = 0;
        this.lengua = 0;
        this.saltoY = 0;
        this.giroCuerpo = 0;
        this.ahueca = 0;
        this.c.setScale(this.esc);
        if (this.alReiniciar) this.alReiniciar();
    };

    Animal.prototype.destruir = function () {
        this.gAro.destroy();
        this.c.destroy();
    };

    /** Entra saltando desde x0 hasta su lugar. Promise. */
    Animal.prototype.entrar = function (desdeX, ms) {
        var self = this;
        var x1 = this.x0;
        this.c.x = desdeX;
        var duracion = ms || 900;
        var brincos = Math.max(2, Math.round(duracion / 300));
        return this.anim.agregar(duracion, function (u) {
            self.c.x = lerp(desdeX, x1, suave(u));
            self.saltoY = Math.abs(Math.sin(u * Math.PI * brincos)) * 46 * (1 - u * 0.4);
        }).then(function () {
            self.c.x = x1;
            self.saltoY = 0;
        });
    };

    /** Sale saltando hasta x. Promise. */
    Animal.prototype.salir = function (haciaX, ms) {
        var self = this;
        var x0 = this.c.x;
        var duracion = ms || 800;
        this.aro = false;
        return this.anim.agregar(duracion, function (u) {
            self.c.x = lerp(x0, haciaX, suave(u));
            self.saltoY = Math.abs(Math.sin(u * Math.PI * 3)) * 40;
        });
    };

    function hereda(F) {
        F.prototype = Object.create(Animal.prototype);
        F.prototype.constructor = F;
        return F;
    }

    // ------------------------------------------------------------------ conejo: mordisquea

    var Conejo = hereda(function (scene, x, y, anim, escala) {
        Animal.call(this, "conejo", scene, x, y, anim, escala);
        var s = scene;
        this.coloresOjo = { borde: 0x1a0d10, iris: 0x7a3b48, luz: 0xb0607a, pupila: 0x0d0608, linea: 0x3a2228 };
        this.boca = { ancho: 26, anchoAbre: 24, alto: 6, altoAbre: 38, arco: 9, grosor: 4, linea: 0x4a3f38, dientes: true };
        this.cuerpo = s.add.image(0, -145, "conejo-cuerpo");
        this.orejaI = s.add.image(-44, -64, "conejo-oreja").setOrigin(0.5, 0.95).setRotation(-0.2);
        this.orejaD = s.add.image(44, -64, "conejo-oreja").setOrigin(0.5, 0.95).setRotation(0.2).setFlipX(true);
        this.cabezaImg = s.add.image(0, 0, "conejo-cabeza");
        this.cabeza.add([this.orejaI, this.orejaD, this.cabezaImg, this.gOjos, this.gBoca]);
        this.pataI = s.add.image(-34, -196, "conejo-pata").setOrigin(0.5, 0.08).setRotation(0.12);
        this.pataD = s.add.image(34, -196, "conejo-pata").setOrigin(0.5, 0.08).setRotation(-0.12).setFlipX(true);
        this.torso.add([this.cuerpo, this.cabeza]);
        this.delante.add([this.pataI, this.pataD]);
        this.orejaExtra = 0;
        this.orejasArriba = 0;
        this.dibujarOjos();
        this.dibujarBoca();
    });

    Conejo.prototype.dibujarNariz = function (g) {
        // naricita rosada en forma de corazón con un brillo
        g.fillStyle(0xe48a8c, 1);
        g.fillTriangle(-10, 6, 10, 6, 0, 18);
        g.fillCircle(-5, 7, 6);
        g.fillCircle(5, 7, 6);
        g.lineStyle(2.5, 0x9c4a4f, 1);
        g.lineBetween(0, 18, 0, 26);
        g.fillStyle(0xffffff, 0.8);
        g.fillCircle(-4, 6, 2.2);
    };

    Conejo.prototype.animar = function (dt, ts) {
        var tiembla = Math.sin(ts * 1.3) * 0.04;
        var arriba = this.orejasArriba * 0.18;
        this.orejaI.rotation = -0.2 + tiembla + arriba - this.orejaExtra;
        this.orejaD.rotation = 0.2 - tiembla * 0.8 - arriba + this.orejaExtra;
        this.pataI.rotation = 0.12 - this.orejasArriba * 0.8;
        this.pataD.rotation = -0.12 + this.orejasArriba * 0.8;
    };

    Conejo.prototype.alCelebrar = function (k) { this.orejasArriba = k; };
    Conejo.prototype.alNegar = function (u) { this.orejaExtra = Math.sin(u * Math.PI * 4) * 0.08 * (1 - u); };
    Conejo.prototype.alReiniciar = function () { this.orejaExtra = 0; this.orejasArriba = 0; };

    /** Seis mordiscos rápidos y pequeños mientras las orejas se sacuden. */
    Conejo.prototype.comer = async function () {
        var self = this, A = this.anim;
        this.ocupado = true;
        this.ojos = "alegre";
        await this.cerrarBoca();
        for (var k = 0; k < 6; k++) {
            if (this.alMasticar) this.alMasticar(k);
            await A.agregar(110, function (u) {
                self.apertura = 0.35 * Math.sin(u * Math.PI);
                self.orejaExtra = Math.sin((k + u) / 6 * Math.PI * 6) * 0.18;
                self.cabezaDY = Math.sin(u * Math.PI) * 4;
            });
        }
        this.orejaExtra = 0;
        this.cabezaDY = 0;
        this.apertura = 0;
        this.ojos = "feliz";
        await A.agregar(500, function (u) { self.escCabeza = 1 + Math.sin(u * Math.PI) * 0.04; });
        this.escCabeza = 1;
        this.ojos = "normal";
        await this.abrirBoca();
        this.ocupado = false;
    };

    /** Fiesta: se sacude y da dos saltitos. */
    Conejo.prototype.terminarDeComer = async function () {
        var self = this;
        this.ojos = "feliz";
        await this.anim.agregar(600, function (u) {
            self.giroCuerpo = Math.sin(u * Math.PI * 6) * 0.07 * (1 - u);
            self.orejaExtra = Math.sin(u * Math.PI * 8) * 0.2 * (1 - u);
        });
        this.giroCuerpo = 0;
        this.orejaExtra = 0;
        await this.anim.agregar(800, function (u) {
            self.saltoY = Math.abs(Math.sin(u * Math.PI * 2)) * 40;
            self.orejasArriba = Math.abs(Math.sin(u * Math.PI * 2));
        });
        this.saltoY = 0;
        this.orejasArriba = 0;
    };

    // ------------------------------------------------------------------ perro: roe de lado

    var Perro = hereda(function (scene, x, y, anim, escala) {
        Animal.call(this, "perro", scene, x, y, anim, escala);
        var s = scene;
        this.boca = { ancho: 38, anchoAbre: 26, alto: 8, altoAbre: 44, arco: 12, grosor: 5, linea: 0x3a2412 };
        this.cola = s.add.image(80, -60, "perro-cola").setOrigin(14 / 140, 108 / 130);
        this.atras.add(this.cola);
        this.cuerpo = s.add.image(0, -145, "perro-cuerpo");
        this.cabezaImg = s.add.image(0, 0, "perro-cabeza");
        this.orejaI = s.add.image(-88, -52, "perro-oreja").setOrigin(0.5, 0.06).setRotation(0.28);
        this.orejaD = s.add.image(88, -52, "perro-oreja").setOrigin(0.5, 0.06).setRotation(-0.28).setFlipX(true);
        this.cabeza.add([this.cabezaImg, this.orejaI, this.orejaD, this.gOjos, this.gBoca]);
        this.pataI = s.add.image(-34, -196, "perro-pata").setOrigin(0.5, 0.08).setRotation(0.1);
        this.pataD = s.add.image(34, -196, "perro-pata").setOrigin(0.5, 0.08).setRotation(-0.1).setFlipX(true);
        this.torso.add([this.cuerpo, this.cabeza]);
        this.delante.add([this.pataI, this.pataD]);
        this.colaVel = 1;
        this.colaAmp = 0.12;
        this.orejaExtra = 0;
        this.dibujarOjos();
        this.dibujarBoca();
    });

    Perro.prototype.dibujarNariz = function (g) {
        // nariz negra grande y brillante
        g.fillStyle(0x1f1410, 1);
        g.fillEllipse(0, 14, 30, 20);
        g.fillStyle(0x5a4038, 1);
        g.fillEllipse(-4, 10, 12, 6);
        g.fillStyle(0xffffff, 0.7);
        g.fillCircle(-6, 9, 2.6);
        g.lineStyle(3, 0x3a2412, 1);
        g.lineBetween(0, 23, 0, 30);
    };

    Perro.prototype.animar = function (dt, ts) {
        this.cola.rotation = -0.15 + Math.sin(ts * 3 * this.colaVel) * this.colaAmp;
        this.orejaI.rotation = 0.28 + Math.sin(ts * 1.7) * 0.03 + this.orejaExtra;
        this.orejaD.rotation = -0.28 - Math.sin(ts * 1.7) * 0.03 - this.orejaExtra;
    };

    Perro.prototype.alCelebrar = function (k) {
        this.colaVel = 1 + k * 3;
        this.colaAmp = 0.12 + k * 0.25;
        this.orejaExtra = -k * 0.3;
    };
    Perro.prototype.alReiniciar = function () { this.colaVel = 1; this.colaAmp = 0.12; this.orejaExtra = 0; };

    /** Inclina la cabeza y roe de lado cuatro veces, con la lengua afuera. */
    Perro.prototype.comer = async function () {
        var self = this, A = this.anim;
        this.ocupado = true;
        this.ojos = "alegre";
        await this.cerrarBoca();
        await A.agregar(160, function (u) { self.giroCabeza = -0.22 * suave(u); });
        for (var k = 0; k < 4; k++) {
            if (this.alMasticar) this.alMasticar(k);
            var lado = k % 2 ? 1 : -1;
            await A.agregar(180, function (u) {
                var s = Math.sin(u * Math.PI);
                self.apertura = 0.3 * s;
                self.bocaDX = lado * 8 * s;
                self.cabezaDX = lado * 5 * s;
                self.giroCabeza = -0.22 + lado * 0.05 * s;
            });
        }
        this.bocaDX = 0;
        this.cabezaDX = 0;
        this.apertura = 0;
        this.ojos = "feliz";
        await A.agregar(560, function (u) {
            self.giroCabeza = -0.22 * (1 - suave(u));
            self.lengua = Math.sin(u * Math.PI);
            self.colaVel = 1 + Math.sin(u * Math.PI) * 3;
        });
        this.giroCabeza = 0;
        this.lengua = 0;
        this.colaVel = 1;
        this.ojos = "normal";
        await this.abrirBoca();
        this.ocupado = false;
    };

    /** Fiesta: mueve la cola feliz y se relame. */
    Perro.prototype.terminarDeComer = async function () {
        var self = this;
        this.ojos = "feliz";
        this.apertura = 0;
        await this.anim.agregar(1200, function (u) {
            var k = Math.sin(u * Math.PI);
            self.colaVel = 1 + k * 4;
            self.colaAmp = 0.12 + k * 0.3;
            self.lengua = Math.max(0, Math.sin(u * Math.PI * 2));
            self.bocaDX = Math.sin(u * Math.PI * 4) * 6 * self.lengua;
        });
        this.colaVel = 1;
        this.colaAmp = 0.12;
        this.lengua = 0;
        this.bocaDX = 0;
    };

    // ------------------------------------------------------------------ pájaro: picotea

    var Pajaro = hereda(function (scene, x, y, anim, escala) {
        Animal.call(this, "pajaro", scene, x, y, anim, escala);
        var s = scene;
        this.coloresOjo = { borde: 0x0b1a2e, iris: 0x1d2b3a, luz: 0x3c5a78, pupila: 0x05080d, linea: 0x0b3a66 };
        this.patas = [s.add.image(-36, 0, "pajaro-pata").setOrigin(0.5, 0.9), s.add.image(36, 0, "pajaro-pata").setOrigin(0.5, 0.9)];
        this.atras.add(this.patas);
        this.cuerpo = s.add.image(0, -195, "pajaro-cuerpo");
        this.alaI = s.add.image(-98, -268, "pajaro-ala").setOrigin(0.5, 0.05).setRotation(0.18);
        this.alaD = s.add.image(98, -268, "pajaro-ala").setOrigin(0.5, 0.05).setRotation(-0.18).setFlipX(true);
        this.cabezaImg = s.add.image(0, 0, "pajaro-cabeza");
        // la mandíbula inferior va DELANTE de la cabeza, colgando del borde del pico superior (y = 24)
        this.cabeza.add([this.cabezaImg, this.gBoca, this.gOjos]);
        this.torso.add([this.cuerpo, this.alaI, this.alaD, this.cabeza]);
        this.alaExtra = 0;
        this.dibujarOjos();
        this.dibujarBoca();
    });

    /** Pico: la mandíbula superior está en la textura (borde en y = 24, de x = -28,5 a 28,5); aquí va la inferior. */
    Pajaro.prototype.dibujarBoca = function () {
        var g = this.gBoca;
        var a = this.apertura;
        this.aperturaDibujada = a;
        g.clear();
        var y0 = 23, baja = 6 + 30 * a;
        if (a > 0.05) {
            // interior de la boca (se ve entre las dos mitades)
            g.fillStyle(0x7a1f1a, 1);
            g.fillPoints([{ x: -25, y: y0 }, { x: 25, y: y0 }, { x: 18, y: y0 + baja * 0.6 }, { x: 0, y: y0 + baja * 0.75 }, { x: -18, y: y0 + baja * 0.6 }], true);
            g.fillStyle(0xff8fa3, 1);
            g.fillEllipse(0, y0 + baja * 0.45, 22, 6 + 6 * a);
        }
        // mandíbula inferior naranja: un triángulo redondeado que baja al abrir
        var top = y0 + 2 + baja * 0.55;
        var pts = [
            { x: -27, y: y0 + 1 + (a > 0.05 ? baja * 0.5 : 0) }, { x: -18, y: top + 8 }, { x: -8, y: top + 16 }, { x: 0, y: top + 18 },
            { x: 8, y: top + 16 }, { x: 18, y: top + 8 }, { x: 27, y: y0 + 1 + (a > 0.05 ? baja * 0.5 : 0) }
        ];
        if (a <= 0.05) pts = [{ x: -27, y: y0 }, { x: -16, y: y0 + 12 }, { x: 0, y: y0 + 17 }, { x: 16, y: y0 + 12 }, { x: 27, y: y0 }];
        g.fillStyle(0xffa94d, 1);
        g.fillPoints(pts, true);
        g.lineStyle(3, 0x8a3a07, 1);
        g.strokePoints(pts, true);
        g.fillStyle(0xe8590c, 0.55);
        g.fillEllipse(0, pts[Math.floor(pts.length / 2)].y - 5, 18, 5);
    };

    Pajaro.prototype.animar = function (dt, ts) {
        var aleteo = Math.sin(ts * 2.4) * 0.04;
        this.alaI.rotation = 0.18 + aleteo + this.alaExtra;
        this.alaD.rotation = -0.18 - aleteo - this.alaExtra;
    };

    Pajaro.prototype.alCelebrar = function (k) { this.alaExtra = k * 1.1 * (0.8 + 0.2 * Math.sin(this.t / 40)); };
    Pajaro.prototype.alNegar = function (u) { this.alaExtra = Math.sin(u * Math.PI) * 0.15; };
    Pajaro.prototype.alReiniciar = function () { this.alaExtra = 0; };

    /** Cinco picotazos hacia abajo y luego echa la cabeza atrás para tragar. */
    Pajaro.prototype.comer = async function () {
        var self = this, A = this.anim;
        this.ocupado = true;
        this.ojos = "alegre";
        for (var k = 0; k < 5; k++) {
            if (this.alMasticar) this.alMasticar(k);
            await A.agregar(90, function (u) {
                self.cabezaDY = 26 * u;
                self.giroCabeza = 0.06 * u;
                self.apertura = 0.5 * (1 - u);
            });
            await A.agregar(110, function (u) {
                self.cabezaDY = 26 * (1 - u);
                self.giroCabeza = 0.06 * (1 - u);
                self.apertura = 0.25 * u;
            });
        }
        // traga: la cabeza hacia atrás (sube y se achata un poco) con el pico al cielo
        await A.agregar(300, function (u) {
            var s = Math.sin(u * Math.PI);
            self.cabezaDY = -14 * s;
            self.escCabeza = 1 - 0.08 * s;
            self.apertura = 0.7 * s;
        });
        this.cabezaDY = 0;
        this.escCabeza = 1;
        this.giroCabeza = 0;
        this.apertura = 0;
        this.ojos = "feliz";
        await A.agregar(420, function (u) { self.alaExtra = Math.sin(u * Math.PI) * 0.5; });
        this.alaExtra = 0;
        this.ojos = "normal";
        await this.abrirBoca();
        this.ocupado = false;
    };

    /** Fiesta: ahueca las plumas y separa las alas. */
    Pajaro.prototype.terminarDeComer = async function () {
        var self = this;
        this.ojos = "feliz";
        this.apertura = 0;
        await this.anim.agregar(1200, function (u) {
            var k = Math.sin(u * Math.PI);
            self.ahueca = k;
            self.alaExtra = k * 0.7 + Math.sin(u * Math.PI * 8) * 0.1 * k;
        });
        this.ahueca = 0;
        this.alaExtra = 0;
    };

    // ------------------------------------------------------------------ oso: mastica (el del juego hermano)

    var Oso = hereda(function (scene, x, y, anim, escala) {
        Animal.call(this, "oso", scene, x, y, anim, escala);
        var s = scene;
        this.boca = { ancho: 44, anchoAbre: 26, alto: 8, altoAbre: 50, arco: 12, grosor: 5, linea: 0x4a2511 };
        this.piernaI = s.add.image(-52, -150, "oso-pierna").setOrigin(0.5, 0).setScale(1, 0.01).setVisible(false);
        this.piernaD = s.add.image(52, -150, "oso-pierna").setOrigin(0.5, 0).setScale(1, 0.01).setVisible(false).setFlipX(true);
        this.atras.add([this.piernaI, this.piernaD]);
        this.cuerpo = s.add.image(0, -160, "oso-cuerpo");
        this.brazoI = s.add.image(-80, -238, "oso-brazo").setOrigin(0.5, 0.12).setRotation(0.32);
        this.brazoD = s.add.image(80, -238, "oso-brazo").setOrigin(0.5, 0.12).setRotation(-0.32).setFlipX(true);
        this.cabezaImg = s.add.image(0, 0, "oso-cabeza");
        this.cabeza.add([this.cabezaImg, this.gOjos, this.gBoca]);
        this.pieI = s.add.image(-70, -26, "oso-pie");
        this.pieD = s.add.image(70, -26, "oso-pie").setFlipX(true);
        this.torso.add([this.cuerpo, this.brazoI, this.brazoD, this.cabeza]);
        this.delante.add([this.pieI, this.pieD]);
        this.brazoExtra = { i: 0, d: 0 };
        this.alzado = 0;
        this.dibujarOjos();
        this.dibujarBoca();
    });

    Oso.prototype.animar = function () {
        this.torso.y = -this.alzado * 96;
        this.pieI.setAlpha(1 - this.alzado);
        this.pieD.setAlpha(1 - this.alzado);
        var vis = this.alzado > 0.02;
        this.piernaI.setVisible(vis).setScale(1.08, Math.max(0.01, this.alzado * 1.1));
        this.piernaD.setVisible(vis).setScale(1.08, Math.max(0.01, this.alzado * 1.1));
        this.piernaI.y = this.piernaD.y = -150 * this.alzado;
        this.brazoI.rotation = 0.32 + this.brazoExtra.i;
        this.brazoD.rotation = -0.32 + this.brazoExtra.d;
    };

    Oso.prototype.alCelebrar = function (k) {
        this.brazoExtra.i = -2.3 * k;
        this.brazoExtra.d = 2.3 * k;
    };
    Oso.prototype.alNegar = function (u) { this.brazoExtra.d = Math.sin(u * Math.PI) * -0.25; };
    Oso.prototype.alReiniciar = function () {
        this.brazoExtra.i = this.brazoExtra.d = 0;
        this.alzado = 0;
    };

    /** Tres masticadas lentas y grandes con los ojos alegres, y se frota la barriga. */
    Oso.prototype.comer = async function () {
        var self = this, A = this.anim;
        this.ocupado = true;
        this.ojos = "alegre";
        await this.cerrarBoca();
        for (var k = 0; k < 3; k++) {
            if (this.alMasticar) this.alMasticar(k);
            await A.agregar(300, function (u) {
                self.apertura = 0.36 * Math.sin(u * Math.PI);
                self.escCabeza = 1 + 0.03 * Math.sin(u * Math.PI);
            });
        }
        this.escCabeza = 1;
        this.apertura = 0;
        await this.frotarBarriga(1100);
        this.ojos = "normal";
        await this.abrirBoca();
        this.ocupado = false;
    };

    Oso.prototype.frotarBarriga = function (ms) {
        var self = this;
        this.ojos = "feliz";
        return this.anim.agregar(ms || 1400, function (u) {
            var k2 = Math.min(1, u * 5) * (u > 0.85 ? 1 - (u - 0.85) / 0.15 : 1);
            self.brazoExtra.d = k2 * (1.25 + Math.sin(u * Math.PI * 8) * 0.22);
            self.brazoExtra.i = -k2 * (1.0 + Math.sin(u * Math.PI * 8 + 1) * 0.2);
        }).then(function () { self.brazoExtra.d = self.brazoExtra.i = 0; });
    };

    Oso.prototype.terminarDeComer = function () {
        this.apertura = 0;
        return this.frotarBarriga(1200);
    };

    Oso.prototype.ponerseDePie = function () {
        var self = this;
        return this.anim.agregar(800, function (u) { self.alzado = suave(u); });
    };

    /** Saludo con la mano (la fiesta lo usa al despedirse). */
    Oso.prototype.saludo = function (s) {
        this.brazoExtra.d = 2.4 + s * 0.35;
        this.brazoExtra.i = -0.2;
    };

    // ------------------------------------------------------------------ API

    var TIPOS = { conejo: Conejo, perro: Perro, pajaro: Pajaro, oso: Oso };

    global.AnimalesPicnic = {
        tipos: Object.keys(TIPOS),
        medidas: MEDIDAS,
        crear: function (tipo, scene, x, y, anim, escala) {
            var F = TIPOS[tipo];
            if (!F) throw new Error("[AnimalesPicnic] tipo desconocido: " + tipo);
            return new F(scene, x, y, anim, escala);
        }
    };
})(window);
